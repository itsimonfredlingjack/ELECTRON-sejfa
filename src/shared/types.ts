export type IsoTimestamp = string;

export type ManagedProcessId = 'monitor' | 'agent' | 'logTail';
export type ManagedProcessState =
  | 'stopped'
  | 'starting'
  | 'running'
  | 'stopping'
  | 'backing_off'
  | 'error';

export interface ManagedProcessStatus {
  id: ManagedProcessId;
  state: ManagedProcessState;
  pid?: number;
  restarts: number;
  lastExitCode?: number | null;
  lastSignal?: NodeJS.Signals | null;
  lastError?: string;
  updatedAt: IsoTimestamp;
}

export interface SocketStatus {
  connected: boolean;
  updatedAt: IsoTimestamp;
  lastError?: string;
}

export interface ProcessStatusSnapshot {
  updatedAt: IsoTimestamp;
  processes: Record<ManagedProcessId, ManagedProcessStatus>;
}

export type LoopNodeKind =
  | 'jira'
  | 'agent'
  | 'tests'
  | 'pr'
  | 'ci'
  | 'deploy'
  | 'verify'
  | 'rollback';

export interface LoopNode {
  id: string;
  kind: LoopNodeKind;
  label: string;
  description?: string;
}

export type GateStatus = 'blocked' | 'ready' | 'running' | 'passed' | 'failed' | 'skipped';

export interface GateState {
  nodeId: string;
  status: GateStatus;
  updatedAt: IsoTimestamp;
  message?: string;
}

export type TaskSource = 'jira' | 'manual';
export type TaskPriority = 'low' | 'normal' | 'high' | 'urgent';

export interface TaskObjective {
  id: string;
  summary: string;
  details?: string;
  source: TaskSource;
  priority: TaskPriority;
  createdAt: IsoTimestamp;
}

export type LoopEvent =
  | {
      type: 'loop/started';
      at: IsoTimestamp;
      runId: string;
      objective: TaskObjective;
    }
  | {
      type: 'process/status';
      at: IsoTimestamp;
      status: ManagedProcessStatus;
    }
  | {
      type: 'socket/status';
      at: IsoTimestamp;
      status: SocketStatus;
    }
  | {
      type: 'backend/loop_update';
      at: IsoTimestamp;
      payload: unknown;
    }
  | {
      type: 'backend/gate_change';
      at: IsoTimestamp;
      payload: unknown;
    }
  | {
      type: 'backend/agent_event';
      at: IsoTimestamp;
      payload: unknown;
    }
  | {
      type: 'backend/health';
      at: IsoTimestamp;
      payload: unknown;
    }
  | {
      type: 'backend/task_started';
      at: IsoTimestamp;
      payload: unknown;
    }
  | {
      type: 'backend/task_completed';
      at: IsoTimestamp;
      payload: unknown;
    }
  | {
      type: 'backend/unknown';
      at: IsoTimestamp;
      eventName: string;
      payload: unknown;
    }
  | {
      type: 'node/state';
      at: IsoTimestamp;
      runId: string;
      gate: GateState;
    }
  | {
      type: 'log';
      at: IsoTimestamp;
      runId: string;
      level: 'debug' | 'info' | 'warn' | 'error';
      message: string;
    };
