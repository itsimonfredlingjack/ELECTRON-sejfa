import { create } from 'zustand';

import type {
  IsoTimestamp,
  ManagedProcessId,
  ManagedProcessStatus,
  ProcessStatusSnapshot,
  SocketStatus,
} from '../../shared/types';

export type SystemState = {
  processes: Partial<Record<ManagedProcessId, ManagedProcessStatus>>;
  socket: { connected: boolean; lastError?: string };
  lastHeartbeat: IsoTimestamp | null;
};

const INITIAL_SYSTEM_STATE: SystemState = {
  processes: {},
  socket: { connected: false },
  lastHeartbeat: null,
};

export const useSystemStore = create<SystemState>(() => INITIAL_SYSTEM_STATE);

function nowIso() {
  return new Date().toISOString();
}

export const systemActions = {
  reset: () => {
    useSystemStore.setState(INITIAL_SYSTEM_STATE);
  },

  setProcessStatus: (status: ManagedProcessStatus) => {
    useSystemStore.setState((prev) => ({
      processes: { ...prev.processes, [status.id]: status },
    }));
  },

  setProcesses: (snapshot: ProcessStatusSnapshot) => {
    useSystemStore.setState({ processes: snapshot.processes });
  },

  setSocketStatus: (status: SocketStatus) => {
    useSystemStore.setState({
      socket: {
        connected: status.connected,
        ...(status.lastError ? { lastError: status.lastError } : {}),
      },
    });
  },

  touchHeartbeat: (at?: IsoTimestamp) => {
    useSystemStore.setState({ lastHeartbeat: at ?? nowIso() });
  },
};

export function useSystemActions() {
  return systemActions;
}

export function useProcesses() {
  return useSystemStore((s) => s.processes);
}

export function useSocketConnected() {
  return useSystemStore((s) => s.socket.connected);
}

export function useSocketLastError() {
  return useSystemStore((s) => s.socket.lastError ?? null);
}

export function useLastHeartbeat() {
  return useSystemStore((s) => s.lastHeartbeat);
}
