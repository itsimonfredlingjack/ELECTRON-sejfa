import { create } from 'zustand';

import type { GateState, LoopEvent, TaskObjective } from '../../shared/types';

export type AppMode = 'observe' | 'control';

export type LoopState = {
  objective: TaskObjective | null;
  gates: GateState[];
  events: LoopEvent[];
  currentNode: string | null;
  appMode: AppMode;
  fileTailConnected: boolean;
  fileTailActive: boolean;
  fileTailIterations: number;
};

const MAX_EVENTS = 1000;

const INITIAL_LOOP_STATE: LoopState = {
  objective: null,
  gates: [],
  events: [],
  currentNode: null,
  appMode: 'observe',
  fileTailConnected: false,
  fileTailActive: false,
  fileTailIterations: 0,
};

export const useLoopStore = create<LoopState>(() => INITIAL_LOOP_STATE);

function safeEvent(event: LoopEvent): LoopEvent {
  // Fast heuristic: check known large properties instead of serialising the whole object.
  const msg = 'message' in event && typeof event.message === 'string' ? event.message : '';
  const payload =
    'payload' in event && typeof event.payload === 'object' && event.payload !== null
      ? event.payload
      : null;

  const estimatedSize =
    msg.length +
    (payload &&
    'details' in payload &&
    typeof (payload as Record<string, unknown>).details === 'string'
      ? ((payload as Record<string, unknown>).details as string).length
      : 0);

  if (estimatedSize > 200_000) {
    return {
      type: 'log',
      at: new Date().toISOString(),
      runId: 'renderer',
      level: 'warn',
      message: `Dropped oversized event (~${Math.round(estimatedSize / 1024)}KB)`,
    };
  }
  return event;
}

export const loopActions = {
  reset: () => {
    useLoopStore.setState(INITIAL_LOOP_STATE);
  },

  setObjective: (objective: TaskObjective | null) => {
    useLoopStore.setState({ objective });
  },

  setGates: (gates: GateState[]) => {
    useLoopStore.setState({ gates });
  },

  upsertGate: (gate: GateState) => {
    useLoopStore.setState((prev) => {
      const idx = prev.gates.findIndex((g) => g.nodeId === gate.nodeId);
      if (idx === -1) return { gates: [...prev.gates, gate] };
      const next = prev.gates.slice();
      next[idx] = gate;
      return { gates: next };
    });
  },

  addEvent: (event: LoopEvent) => {
    const e = safeEvent(event);
    useLoopStore.setState((prev) => {
      const next = [...prev.events, e];
      return { events: next.length > MAX_EVENTS ? next.slice(-MAX_EVENTS) : next };
    });
  },

  clearEvents: () => {
    useLoopStore.setState({ events: [] });
  },

  setCurrentNode: (currentNode: string | null) => {
    useLoopStore.setState({ currentNode });
  },

  setAppMode: (appMode: AppMode) => {
    useLoopStore.setState({ appMode });
  },

  setFileTailState: (active: boolean, iterations: number) => {
    useLoopStore.setState({
      fileTailConnected: true,
      fileTailActive: active,
      fileTailIterations: iterations,
    });
  },

  setFileTailDisconnected: () => {
    useLoopStore.setState({
      fileTailConnected: false,
      fileTailActive: false,
      fileTailIterations: 0,
    });
  },
};

export function useLoopActions() {
  return loopActions;
}

export function useObjective() {
  return useLoopStore((s) => s.objective);
}

export function useGates() {
  return useLoopStore((s) => s.gates);
}

export function useEvents() {
  return useLoopStore((s) => s.events);
}

export function useCurrentNode() {
  return useLoopStore((s) => s.currentNode);
}

export function useAppMode() {
  return useLoopStore((s) => s.appMode);
}

export function useFileTailConnected() {
  return useLoopStore((s) => s.fileTailConnected);
}

export function useFileTailActive() {
  return useLoopStore((s) => s.fileTailActive);
}

export function useFileTailIterations() {
  return useLoopStore((s) => s.fileTailIterations);
}
