import { EventEmitter } from 'node:events';
import { promises as fs, unwatchFile, watchFile } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';

/* ── Types ────────────────────────────────────────────────── */

export interface RalphState {
  started_at: string;
  loop_active: boolean;
  last_seen_transcript_path?: string;
  iterations: number;
  last_check: string;
  completed_at?: string;
}

export interface FileTailEvents {
  change: (state: RalphState) => void;
  error: (error: Error) => void;
}

/* ── FileTailService ──────────────────────────────────────── */

/**
 * Watches ralph-state.json from the loop project and emits changes.
 * Uses Node.js built-in fs.watchFile (no native dependencies to break Vite).
 *
 * CRITICAL: Handles race conditions when file is being written.
 */
export class FileTailService extends EventEmitter {
  private lastState: RalphState | null = null;
  private loopProjectPath: string;
  private ralphStatePath: string;
  private watching = false;

  constructor(loopProjectPath?: string) {
    super();
    this.loopProjectPath =
      loopProjectPath ?? join(homedir(), 'Desktop', 'DEV-PROJECTS', 'grupp-ett-github');
    this.ralphStatePath = join(this.loopProjectPath, '.claude', 'ralph-state.json');
  }

  start(): void {
    if (this.watching) {
      console.warn('[FileTail] Already watching');
      return;
    }

    console.log('[FileTail] Starting file watch:', this.ralphStatePath);

    // fs.watchFile is polling-based (no native deps) — 1.5s interval is fine for this
    watchFile(this.ralphStatePath, { interval: 1500 }, () => {
      void this.handleFileChange();
    });

    this.watching = true;

    // Read the file once immediately so the UI gets initial state
    void this.handleFileChange();
  }

  stop(): void {
    if (this.watching) {
      unwatchFile(this.ralphStatePath);
    }
    this.watching = false;
    this.lastState = null;
    console.log('[FileTail] Stopped watching');
  }

  isWatching(): boolean {
    return this.watching;
  }

  getLastState(): RalphState | null {
    return this.lastState;
  }

  /**
   * CRITICAL: Race condition handling — file may be half-written when we read it.
   */
  private async handleFileChange(): Promise<void> {
    try {
      const content = await fs.readFile(this.ralphStatePath, 'utf-8');

      let state: RalphState;
      try {
        state = JSON.parse(content) as RalphState;
      } catch (err) {
        if (err instanceof SyntaxError) {
          // File is being written right now — ignore, next poll will catch it
          console.debug('[FileTail] Partial read, waiting for next poll...');
          return;
        }
        throw err;
      }

      // Only emit if state actually changed
      if (JSON.stringify(state) !== JSON.stringify(this.lastState)) {
        console.log(
          '[FileTail] State changed:',
          state.loop_active ? 'ACTIVE' : 'idle',
          'iter:',
          state.iterations,
        );
        this.lastState = state;
        this.emit('change', state);
      }
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code === 'ENOENT') {
        console.debug('[FileTail] File not found (loop not started yet)');
      } else {
        this.handleError(err as Error);
      }
    }
  }

  private handleError(error: Error): void {
    console.error('[FileTail] Error:', error);
    this.emit('error', error);
  }

  /* ── TypeScript EventEmitter typing ────────────────────── */

  override on<K extends keyof FileTailEvents>(event: K, listener: FileTailEvents[K]): this {
    return super.on(event, listener);
  }

  override emit<K extends keyof FileTailEvents>(
    event: K,
    ...args: Parameters<FileTailEvents[K]>
  ): boolean {
    return super.emit(event, ...args);
  }
}
