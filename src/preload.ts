import { contextBridge, ipcRenderer } from 'electron';

import type { FileTailStatus, Result, SejfaApi } from './shared/api';
import { Channel, IPC_EVENT_CHANNELS, IPC_INVOKE_CHANNELS } from './shared/ipc';
import type {
  LoopEvent,
  ManagedProcessId,
  ProcessStatusSnapshot,
  SocketStatus,
} from './shared/types';

function assertInvokeChannel(
  channel: Channel,
): asserts channel is (typeof IPC_INVOKE_CHANNELS)[number] {
  if (!IPC_INVOKE_CHANNELS.includes(channel as (typeof IPC_INVOKE_CHANNELS)[number])) {
    throw new Error(`Blocked IPC invoke channel: ${String(channel)}`);
  }
}

function assertEventChannel(
  channel: Channel,
): asserts channel is (typeof IPC_EVENT_CHANNELS)[number] {
  if (!IPC_EVENT_CHANNELS.includes(channel as (typeof IPC_EVENT_CHANNELS)[number])) {
    throw new Error(`Blocked IPC event channel: ${String(channel)}`);
  }
}

const api: SejfaApi = {
  app: {
    getVersion: async () => {
      const channel = Channel.AppGetVersion;
      assertInvokeChannel(channel);
      return ipcRenderer.invoke(channel) as Promise<string>;
    },
  },
  loop: {
    ping: async (message) => {
      const channel = Channel.LoopPing;
      assertInvokeChannel(channel);
      return ipcRenderer.invoke(channel, message) as Promise<{ ok: true; echo: string }>;
    },
    onEvent: (cb) => {
      const channel = Channel.LoopEventPush;
      assertEventChannel(channel);

      const listener = (_event: Electron.IpcRendererEvent, payload: LoopEvent) => {
        cb(payload);
      };

      ipcRenderer.on(channel, listener);
      return () => {
        ipcRenderer.off(channel, listener);
      };
    },
  },
  processes: {
    start: async (id) => {
      const channel = Channel.ProcessesStart;
      assertInvokeChannel(channel);
      return ipcRenderer.invoke(channel, { id }) as Promise<Result>;
    },
    stop: async (id) => {
      const channel = Channel.ProcessesStop;
      assertInvokeChannel(channel);
      return ipcRenderer.invoke(channel, { id }) as Promise<Result>;
    },
    restart: async (id) => {
      const channel = Channel.ProcessesRestart;
      assertInvokeChannel(channel);
      return ipcRenderer.invoke(channel, { id }) as Promise<Result>;
    },
    getStatus: async () => {
      const channel = Channel.ProcessesGetStatus;
      assertInvokeChannel(channel);
      return ipcRenderer.invoke(channel) as Promise<ProcessStatusSnapshot>;
    },
  },
  killSwitch: {
    arm: async () => {
      const channel = Channel.KillArm;
      assertInvokeChannel(channel);
      return ipcRenderer.invoke(channel) as Promise<{ token: string; expiresAt: string }>;
    },
    confirm: async (token) => {
      const channel = Channel.KillConfirm;
      assertInvokeChannel(channel);
      return ipcRenderer.invoke(channel, { token }) as Promise<Result>;
    },
  },
  socket: {
    getStatus: async () => {
      const channel = Channel.SocketGetStatus;
      assertInvokeChannel(channel);
      return ipcRenderer.invoke(channel) as Promise<SocketStatus>;
    },
    connect: async () => {
      const channel = Channel.SocketConnect;
      assertInvokeChannel(channel);
      return ipcRenderer.invoke(channel) as Promise<Result>;
    },
    disconnect: async () => {
      const channel = Channel.SocketDisconnect;
      assertInvokeChannel(channel);
      return ipcRenderer.invoke(channel) as Promise<Result>;
    },
  },
  fileTail: {
    start: async () => {
      const channel = Channel.FileTailStart;
      assertInvokeChannel(channel);
      return ipcRenderer.invoke(channel) as Promise<Result>;
    },
    stop: async () => {
      const channel = Channel.FileTailStop;
      assertInvokeChannel(channel);
      return ipcRenderer.invoke(channel) as Promise<Result>;
    },
    getStatus: async () => {
      const channel = Channel.FileTailGetStatus;
      assertInvokeChannel(channel);
      return ipcRenderer.invoke(channel) as Promise<FileTailStatus>;
    },
  },
  shell: {
    openExternal: async (url) => {
      const channel = Channel.ShellOpenExternal;
      assertInvokeChannel(channel);
      return ipcRenderer.invoke(channel, { url }) as Promise<Result>;
    },
  },
};

contextBridge.exposeInMainWorld('sejfa', api);
// Alias to match common Electron examples and the build plan wording.
contextBridge.exposeInMainWorld('electronAPI', api);
