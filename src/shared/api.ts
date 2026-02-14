import type { LoopEvent, ManagedProcessId, ProcessStatusSnapshot, SocketStatus } from './types';

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
  shell: {
    openExternal: (url: string) => Promise<Result>;
  };
}
