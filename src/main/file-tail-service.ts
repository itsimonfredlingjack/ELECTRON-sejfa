import type { FSWatcher } from 'chokidar';
import chokidar from 'chokidar';
import { EventEmitter } from 'node:events';
import { promises as fs } from 'node:fs';
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
 * Uses chokidar for push-based file watching (faster than polling).
 *
 * CRITICAL: Handles race conditions when file is being written.
 */
export class FileTailService extends EventEmitter {
  private watcher: FSWatcher | null = null;
  private lastState: RalphState | null = null;
  private loopProjectPath: string;
  private ralphStatePath: string;
  private watching = false;

  constructor(loopProjectPath?: string) {
    super();
    // CRITICAL: Use os.homedir() NOT hardcoded paths!
    this.loopProjectPath =
      loopProjectPath ?? join(homedir(), 'Desktop', 'DEV-PROJECTS', 'grupp-ett-github');
    this.ralphStatePath = join(this.loopProjectPath, '.claude', 'ralph-state.json');
  }

  /**
   * Start watching the ralph-state.json file.
   * Uses chokidar for instant push-based notifications.
   */
  start(): void {
    if (this.watching) {
      console.warn('[FileTail] Already watching');
      return;
    }

    console.log('[FileTail] Starting file watch:', this.ralphStatePath);

    this.watcher = chokidar.watch(this.ralphStatePath, {
      persistent: true,
      ignoreInitial: false, // Trigger immediately on start
      awaitWriteFinish: {
        stabilityThreshold: 100, // Wait 100ms for file writes to finish
        pollInterval: 50,
      },
    });

    this.watcher.on('add', () => void this.handleFileChange());
    this.watcher.on('change', () => void this.handleFileChange());
    this.watcher.on('error', (err: unknown) => {
      const error = err instanceof Error ? err : new Error(String(err));
      this.handleError(error);
    });

    this.watching = true;
  }

  /**
   * Stop watching the file.
   */
  stop(): void {
    if (this.watcher) {
      void this.watcher.close();
      this.watcher = null;
    }
    this.watching = false;
    this.lastState = null;
    console.log('[FileTail] Stopped watching');
  }

  /**
   * Get current watching status.
   */
  isWatching(): boolean {
    return this.watching;
  }

  /**
   * Get the last known state.
   */
  getLastState(): RalphState | null {
    return this.lastState;
  }

  /**
   * Handle file change event.
   * CRITICAL: Race condition handling with try/catch for JSON.parse!
   */
  private async handleFileChange(): Promise<void> {
    try {
      const content = await fs.readFile(this.ralphStatePath, 'utf-8');

      // CRITICAL: Race condition protection!
      // File might be read while being written → partial JSON → SyntaxError
      let state: RalphState;
      try {
        state = JSON.parse(content) as RalphState;
      } catch (err) {
        if (err instanceof SyntaxError) {
          // This is expected! File is being written right now.
          // Next change event will come soon with complete data.
          console.debug('[FileTail] Partial read detected, waiting for next write...');
          return;
        }
        // Other errors are real problems
        throw err;
      }

      // Emit change only if state actually changed
      if (JSON.stringify(state) !== JSON.stringify(this.lastState)) {
        this.lastState = state;
        this.emit('change', state);
      }
    } catch (err) {
      // File doesn't exist yet, or other FS errors
      if ((err as NodeJS.ErrnoException).code === 'ENOENT') {
        console.debug('[FileTail] File not found (loop not started yet)');
      } else {
        this.handleError(err as Error);
      }
    }
  }

  /**
   * Handle errors.
   */
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
