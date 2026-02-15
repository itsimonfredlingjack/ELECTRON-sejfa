import { type ChildProcessWithoutNullStreams, spawn } from 'node:child_process';
import { EventEmitter } from 'node:events';
import fs from 'node:fs/promises';
import path from 'node:path';
import readline from 'node:readline';

import { app } from 'electron';
import treeKill from 'tree-kill';

import type {
  ManagedProcessId,
  ManagedProcessState,
  ManagedProcessStatus,
  ProcessStatusSnapshot,
} from '../shared/types';

export type ChildProcessManagerEvents = {
  status: [snapshot: ProcessStatusSnapshot];
  log: [entry: { id: ManagedProcessId; stream: 'stdout' | 'stderr'; line: string; at: string }];
};

type ProcessConfig = {
  command: string;
  args: string[];
  cwd?: string;
  env?: NodeJS.ProcessEnv;
  autoRestart: boolean;
};

type TailState = {
  filePath: string;
  pos: number;
  partial: string;
  timer: NodeJS.Timeout | null;
};

type RecordState = {
  id: ManagedProcessId;
  config: ProcessConfig;
  proc: ChildProcessWithoutNullStreams | null;
  tail: TailState | null;
  state: ManagedProcessState;
  restarts: number;
  stopRequested: boolean;
  lastExitCode: number | null;
  lastSignal: NodeJS.Signals | null;
  lastError: string | undefined;
  updatedAt: string;
  lastStartMs: number | null;
};

function nowIso() {
  return new Date().toISOString();
}

function parseArgsEnv(value: string | undefined, fallback: string[]) {
  if (!value) return fallback;
  const trimmed = value.trim();
  if (trimmed.length === 0) return fallback;
  if (trimmed.startsWith('[')) {
    try {
      const parsed = JSON.parse(trimmed);
      if (Array.isArray(parsed) && parsed.every((x) => typeof x === 'string')) return parsed;
    } catch {
      // Fall through to whitespace split.
    }
  }
  return trimmed.split(/\s+/).filter(Boolean);
}

function computeBackoffMs(attempt: number) {
  const base = 1000;
  const ms = base * 2 ** attempt;
  return Math.min(ms, 8000);
}

export class ChildProcessManager extends EventEmitter {
  private readonly processes: Record<ManagedProcessId, RecordState>;
  private readonly maxRestarts = 3;
  private readonly tailPollMs = 250;
  private readonly maxTailBytesPerTick = 256 * 1024;
  private tailTicking = false;

  constructor() {
    super();

    const userData = app.getPath('userData');
    const logPath = process.env.SEJFA_AGENT_LOG_PATH ?? path.join(userData, 'sejfa-agent.log');

    const monitorCwd = process.env.SEJFA_MONITOR_CWD ?? process.cwd();
    const agentCwd = process.env.SEJFA_AGENT_CWD ?? process.cwd();

    const configs: Record<ManagedProcessId, ProcessConfig> = {
      monitor: {
        command: process.env.SEJFA_MONITOR_CMD ?? 'python3',
        args: parseArgsEnv(process.env.SEJFA_MONITOR_ARGS, ['app.py']),
        cwd: monitorCwd,
        autoRestart: true,
      },
      agent: {
        command: process.env.SEJFA_AGENT_CMD ?? 'claude',
        args: parseArgsEnv(process.env.SEJFA_AGENT_ARGS, []),
        cwd: agentCwd,
        autoRestart: true,
      },
      logTail: {
        // Virtual process: implemented in-process (no child spawn) to avoid relying on
        // Electron runtime supporting Node CLI flags in production builds.
        command: 'virtual:tail',
        args: [],
        autoRestart: false,
      },
    };

    this.processes = {
      monitor: this.makeInitial('monitor', configs.monitor),
      agent: this.makeInitial('agent', configs.agent),
      logTail: this.makeInitial('logTail', configs.logTail),
    };

    // Initialize tail state for the virtual log tailer.
    this.processes.logTail.tail = {
      filePath: logPath,
      pos: 0,
      partial: '',
      timer: null,
    };
  }

  private makeInitial(id: ManagedProcessId, config: ProcessConfig): RecordState {
    return {
      id,
      config,
      proc: null,
      tail: null,
      state: 'stopped',
      restarts: 0,
      stopRequested: false,
      lastExitCode: null,
      lastSignal: null,
      lastError: undefined,
      updatedAt: nowIso(),
      lastStartMs: null,
    };
  }

  getSnapshot(): ProcessStatusSnapshot {
    const processes = Object.fromEntries(
      Object.values(this.processes).map((p) => [
        p.id,
        (() => {
          const base: ManagedProcessStatus = {
            id: p.id,
            state: p.state,
            restarts: p.restarts,
            lastExitCode: p.lastExitCode,
            lastSignal: p.lastSignal,
            updatedAt: p.updatedAt,
          };
          const pid = p.proc?.pid;
          const lastError = p.lastError;
          return {
            ...base,
            ...(typeof pid === 'number' ? { pid } : {}),
            ...(typeof lastError === 'string' ? { lastError } : {}),
          };
        })(),
      ]),
    ) as Record<ManagedProcessId, ManagedProcessStatus>;

    return { updatedAt: nowIso(), processes };
  }

  private emitStatus() {
    this.emit('status', this.getSnapshot());
  }

  private attachLogs(id: ManagedProcessId, proc: ChildProcessWithoutNullStreams) {
    const pipe = (stream: 'stdout' | 'stderr') => {
      const rl = readline.createInterface({ input: proc[stream] });
      rl.on('line', (line) => this.emit('log', { id, stream, line, at: nowIso() }));
      proc.once('exit', () => rl.close());
    };
    pipe('stdout');
    pipe('stderr');
  }

  private async tailTick(rec: RecordState) {
    if (this.tailTicking) return; // Skip if previous tick is still running
    this.tailTicking = true;
    try {
      await this.tailTickInner(rec);
    } finally {
      this.tailTicking = false;
    }
  }

  private async tailTickInner(rec: RecordState) {
    const tail = rec.tail;
    if (!tail) return;
    if (rec.stopRequested) return;

    let st: { size: number };
    try {
      st = await fs.stat(tail.filePath);
    } catch {
      // File may not exist yet.
      return;
    }

    // Handle truncation/rotation.
    if (st.size < tail.pos) {
      tail.pos = 0;
      tail.partial = '';
    }
    if (st.size === tail.pos) return;

    const start = tail.pos;
    const remaining = st.size - start;
    const toRead = Math.min(remaining, this.maxTailBytesPerTick);

    let fh: fs.FileHandle | null = null;
    try {
      fh = await fs.open(tail.filePath, 'r');
      const buf = Buffer.allocUnsafe(toRead);
      const { bytesRead } = await fh.read(buf, 0, toRead, start);
      if (bytesRead <= 0) return;

      tail.pos = start + bytesRead;
      const chunk = tail.partial + buf.subarray(0, bytesRead).toString('utf8');
      const lines = chunk.split(/\r?\n/);
      tail.partial = lines.pop() ?? '';
      for (const line of lines) {
        if (line.length === 0) continue;
        this.emit('log', { id: rec.id, stream: 'stdout', line, at: nowIso() });
      }
    } catch (err) {
      rec.lastError = err instanceof Error ? err.message : String(err);
      rec.updatedAt = nowIso();
      this.emitStatus();
    } finally {
      await fh?.close().catch(() => undefined);
    }
  }

  private startVirtualTail(rec: RecordState) {
    const tail = rec.tail;
    if (!tail)
      return {
        ok: false as const,
        error: { code: 'TAIL_MISCONFIG', message: 'tail missing' },
      };
    if (tail.timer) return { ok: true as const };

    rec.stopRequested = false;
    rec.lastError = undefined;
    rec.state = 'running';
    rec.updatedAt = nowIso();
    rec.lastStartMs = Date.now();
    this.emitStatus();

    tail.timer = setInterval(() => {
      void this.tailTick(rec);
    }, this.tailPollMs);

    return { ok: true as const };
  }

  private stopVirtualTail(rec: RecordState) {
    rec.stopRequested = true;
    if (rec.tail?.timer) {
      clearInterval(rec.tail.timer);
      rec.tail.timer = null;
    }
    rec.state = 'stopped';
    rec.updatedAt = nowIso();
    this.emitStatus();
    return { ok: true as const };
  }

  private waitForExit(proc: ChildProcessWithoutNullStreams, timeoutMs: number) {
    return new Promise<'exited' | 'timeout'>((resolve) => {
      if (proc.exitCode !== null) return resolve('exited');
      const t = setTimeout(() => resolve('timeout'), timeoutMs);
      proc.once('exit', () => {
        clearTimeout(t);
        resolve('exited');
      });
    });
  }

  async start(id: ManagedProcessId) {
    const rec = this.processes[id];
    if (id === 'logTail') return this.startVirtualTail(rec);
    if (rec.proc && rec.state === 'running') return { ok: true as const };
    if (rec.state === 'starting') return { ok: true as const };

    rec.stopRequested = false;
    rec.lastError = undefined;
    rec.state = 'starting';
    rec.updatedAt = nowIso();
    this.emitStatus();

    try {
      const proc = spawn(rec.config.command, rec.config.args, {
        shell: false,
        cwd: rec.config.cwd,
        env: { ...process.env, ...rec.config.env },
        stdio: ['pipe', 'pipe', 'pipe'],
        windowsHide: true,
      });

      rec.proc = proc;
      rec.state = 'running';
      rec.updatedAt = nowIso();
      rec.lastStartMs = Date.now();
      this.attachLogs(id, proc);
      this.emitStatus();

      proc.once('exit', (code, signal) => {
        rec.lastExitCode = code;
        rec.lastSignal = signal;
        rec.proc = null;

        if (rec.stopRequested) {
          rec.state = 'stopped';
          rec.updatedAt = nowIso();
          this.emitStatus();
          return;
        }

        if (!rec.config.autoRestart) {
          rec.state = 'error';
          rec.lastError = `Exited (code=${code ?? 'null'}, signal=${signal ?? 'null'})`;
          rec.updatedAt = nowIso();
          this.emitStatus();
          return;
        }

        // If the process ran "healthily" for a while, don't keep old restart history.
        const startedAt = rec.lastStartMs;
        if (startedAt && Date.now() - startedAt > 30_000) {
          rec.restarts = 0;
        }

        if (rec.restarts >= this.maxRestarts) {
          rec.state = 'error';
          rec.lastError = `Exited too many times (max ${this.maxRestarts})`;
          rec.updatedAt = nowIso();
          this.emitStatus();
          return;
        }

        const delay = computeBackoffMs(rec.restarts);
        rec.state = 'backing_off';
        rec.restarts += 1;
        rec.updatedAt = nowIso();
        this.emitStatus();

        setTimeout(() => {
          // If a stop was requested while backing off, don't restart.
          if (rec.stopRequested) return;
          void this.start(id);
        }, delay);
      });

      proc.once('error', (err) => {
        rec.lastError = err instanceof Error ? err.message : String(err);
        rec.state = 'error';
        rec.updatedAt = nowIso();
        this.emitStatus();
      });

      return { ok: true as const };
    } catch (err) {
      rec.lastError = err instanceof Error ? err.message : String(err);
      rec.state = 'error';
      rec.updatedAt = nowIso();
      this.emitStatus();
      return { ok: false as const, error: { code: 'SPAWN_FAILED', message: rec.lastError } };
    }
  }

  async stop(id: ManagedProcessId, opts?: { force?: boolean }) {
    const rec = this.processes[id];
    if (id === 'logTail') return this.stopVirtualTail(rec);
    rec.stopRequested = true;

    const proc = rec.proc;
    if (!proc || typeof proc.pid !== 'number') {
      rec.state = 'stopped';
      rec.updatedAt = nowIso();
      this.emitStatus();
      return { ok: true as const };
    }

    rec.state = 'stopping';
    rec.updatedAt = nowIso();
    this.emitStatus();

    try {
      const force = Boolean(opts?.force);
      const pid = proc.pid;

      // Wrap tree-kill in a promise
      const killTree = (signal: string) =>
        new Promise<void>((resolve, reject) => {
          treeKill(pid, signal, (err) => {
            // Ignore error if process is already dead (ESRCH)
            if (err && !err.message.includes('ESRCH')) reject(err);
            else resolve();
          });
        });

      await killTree(force ? 'SIGKILL' : 'SIGTERM');

      if (!force) {
        const res = await this.waitForExit(proc, 3500);
        if (res === 'timeout') {
          // If it didn't exit after SIGTERM, force kill the tree.
          await killTree('SIGKILL');
          await this.waitForExit(proc, 2000);
        }
      } else {
        await this.waitForExit(proc, 2000);
      }

      return { ok: true as const };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      rec.lastError = msg;
      rec.updatedAt = nowIso();
      this.emitStatus();
      return { ok: false as const, error: { code: 'KILL_FAILED', message: msg } };
    }
  }

  async restart(id: ManagedProcessId) {
    await this.stop(id);
    this.processes[id].restarts = 0;
    return this.start(id);
  }

  async startAll() {
    const results = await Promise.all([
      this.start('monitor'),
      this.start('agent'),
      this.start('logTail'),
    ]);
    const failed = results.find((r) => !r.ok);
    return failed ?? { ok: true as const };
  }

  async stopAll(opts?: { force?: boolean }) {
    const results = await Promise.all([
      this.stop('logTail', opts),
      this.stop('agent', opts),
      this.stop('monitor', opts),
    ]);
    const failed = results.find((r) => !r.ok);
    return failed ?? { ok: true as const };
  }
}
