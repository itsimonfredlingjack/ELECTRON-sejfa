import type { LoopEvent, ManagedProcessId, ProcessStatusSnapshot, SocketStatus } from './types';

export interface FileTailStatus {
  watching: boolean;
  lastState: {
    started_at: string;
    loop_active: boolean;
    last_seen_transcript_path?: string;
    iterations: number;
    last_check: string;
    completed_at?: string;
  } | null;
}

export type Unsubscribe = () => void;

export type Result =
  | { ok: true }
  | {
      ok: false;
      error: {
        code: string;
        message: string;
      };
    };

export interface SejfaApi {
  app: {
    getVersion: () => Promise<string>;
  };
  loop: {
    ping: (message: string) => Promise<{ ok: true; echo: string }>;
    onEvent: (cb: (event: LoopEvent) => void) => Unsubscribe;
  };
  processes: {
    start: (id: ManagedProcessId) => Promise<Result>;
    stop: (id: ManagedProcessId) => Promise<Result>;
    restart: (id: ManagedProcessId) => Promise<Result>;
    getStatus: () => Promise<ProcessStatusSnapshot>;
  };
  killSwitch: {
    arm: () => Promise<{ token: string; expiresAt: string }>;
    confirm: (token: string) => Promise<Result>;
  };
  socket: {
    getStatus: () => Promise<SocketStatus>;
    connect: () => Promise<Result>;
    disconnect: () => Promise<Result>;
  };
  fileTail: {
    start: () => Promise<Result>;
    stop: () => Promise<Result>;
    getStatus: () => Promise<FileTailStatus>;
  };
  shell: {
    openExternal: (url: string) => Promise<Result>;
  };
  monitor: {
    connect: () => Promise<Result>;
    disconnect: () => Promise<Result>;
    getStatus: () => Promise<{ connected: boolean }>;
    onEvent: (cb: (event: LoopEvent) => void) => Unsubscribe;
  };
}
