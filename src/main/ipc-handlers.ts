import { app, ipcMain, shell } from 'electron';

import type { Result } from '../shared/api';
import { Channel } from '../shared/ipc';
import type { LoopEvent, ProcessStatusSnapshot, SocketStatus } from '../shared/types';

import type { ChildProcessManager } from './child-processes';
import { createKillSwitch } from './kill-switch';
import type { SocketBridge } from './socket-bridge';
import type { TrayController } from './tray';
import {
  assertManagedProcessId,
  assertObject,
  assertString,
  assertToken,
  assertUrlAllowed,
} from './validate';

function ok(): Result {
  return { ok: true };
}

function fail(code: string, message: string): Result {
  return { ok: false, error: { code, message } };
}

function nowIso() {
  return new Date().toISOString();
}

export type IpcContext = {
  processes: ChildProcessManager;
  socket: SocketBridge;
  tray: TrayController;
  broadcast: (event: LoopEvent) => void;
};

export function registerIpcHandlers(ctx: IpcContext) {
  const killSwitch = createKillSwitch({ windowMs: 5000 });

  ipcMain.handle(Channel.AppGetVersion, async () => {
    return app.getVersion();
  });

  ipcMain.handle(Channel.LoopPing, async (_event, message: unknown) => {
    try {
      assertString(message, { name: 'message', maxLen: 2048 });
      return { ok: true as const, echo: message };
    } catch (err) {
      return {
        ok: true as const,
        echo: `invalid: ${err instanceof Error ? err.message : String(err)}`,
      };
    }
  });

  ipcMain.handle(Channel.ProcessesStart, async (_event, payload: unknown): Promise<Result> => {
    try {
      assertObject(payload, { name: 'payload' });
      const id = (payload as { id?: unknown }).id;
      assertManagedProcessId(id);
      const res = await ctx.processes.start(id);
      ctx.tray.setState({ running: true });
      return res.ok ? ok() : (res as Result);
    } catch (err) {
      return fail('BAD_INPUT', err instanceof Error ? err.message : String(err));
    }
  });

  ipcMain.handle(Channel.ProcessesStop, async (_event, payload: unknown): Promise<Result> => {
    try {
      assertObject(payload, { name: 'payload' });
      const id = (payload as { id?: unknown }).id;
      assertManagedProcessId(id);
      const res = await ctx.processes.stop(id);
      const snap = ctx.processes.getSnapshot();
      const anyRunning = Object.values(snap.processes).some(
        (p) => p.state === 'running' || p.state === 'starting',
      );
      ctx.tray.setState({ running: anyRunning });
      return res.ok ? ok() : (res as Result);
    } catch (err) {
      return fail('BAD_INPUT', err instanceof Error ? err.message : String(err));
    }
  });

  ipcMain.handle(Channel.ProcessesRestart, async (_event, payload: unknown): Promise<Result> => {
    try {
      assertObject(payload, { name: 'payload' });
      const id = (payload as { id?: unknown }).id;
      assertManagedProcessId(id);
      const res = await ctx.processes.restart(id);
      ctx.tray.setState({ running: true });
      return res.ok ? ok() : (res as Result);
    } catch (err) {
      return fail('BAD_INPUT', err instanceof Error ? err.message : String(err));
    }
  });

  ipcMain.handle(Channel.ProcessesGetStatus, async (): Promise<ProcessStatusSnapshot> => {
    return ctx.processes.getSnapshot();
  });

  ipcMain.handle(Channel.KillArm, async () => {
    return killSwitch.arm();
  });

  ipcMain.handle(Channel.KillConfirm, async (_event, payload: unknown): Promise<Result> => {
    try {
      assertObject(payload, { name: 'payload' });
      const token = (payload as { token?: unknown }).token;
      assertToken(token);
      const res = killSwitch.confirm(token);
      if (!res.ok) return fail('KILL_NOT_ARMED', res.reason);

      const stopped = await ctx.processes.stopAll({ force: true });
      ctx.socket.disconnect();
      ctx.tray.setState({ level: 'red', running: false });

      ctx.broadcast({
        type: 'log',
        at: nowIso(),
        runId: 'system',
        level: 'error',
        message: 'Kill switch executed (forced stop + socket disconnect)',
      });

      return stopped.ok ? ok() : (stopped as Result);
    } catch (err) {
      return fail('BAD_INPUT', err instanceof Error ? err.message : String(err));
    }
  });

  ipcMain.handle(Channel.SocketGetStatus, async (): Promise<SocketStatus> => {
    return ctx.socket.getStatus();
  });

  ipcMain.handle(Channel.SocketConnect, async (): Promise<Result> => {
    try {
      ctx.socket.connect();
      return ok();
    } catch (err) {
      return fail('SOCKET_CONNECT_FAILED', err instanceof Error ? err.message : String(err));
    }
  });

  ipcMain.handle(Channel.SocketDisconnect, async (): Promise<Result> => {
    try {
      ctx.socket.disconnect();
      return ok();
    } catch (err) {
      return fail('SOCKET_DISCONNECT_FAILED', err instanceof Error ? err.message : String(err));
    }
  });

  ipcMain.handle(Channel.ShellOpenExternal, async (_event, payload: unknown): Promise<Result> => {
    try {
      assertObject(payload, { name: 'payload' });
      const url = (payload as { url?: unknown }).url;
      assertUrlAllowed(url);
      await shell.openExternal(url);
      return ok();
    } catch (err) {
      return fail('BAD_INPUT', err instanceof Error ? err.message : String(err));
    }
  });
}
