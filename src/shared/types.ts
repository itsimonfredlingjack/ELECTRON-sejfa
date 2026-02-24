export type IsoTimestamp = string;

/* ── Monitor API Types ──────────────────────────────────── */

export interface MonitorToolEvent {
  event_id: string;
  session_id: string;
  ticket_id: string | null;
  timestamp: string;
  event_type: 'pre_tool_use' | 'post_tool_use' | 'stop';
  tool_name: string;
  tool_args_hash: string;
  tool_args_summary: string;
  success: boolean | null;
  duration_ms: number | null;
  tokens: { input: number; output: number; cache_read: number } | null;
  cost_usd: number | null;
  error: string | null;
}

export interface StuckAlert {
  pattern: string;
  repeat_count: number;
  tokens_burned: number;
  since: string;
}

export interface CostUpdate {
  session_id: string;
  total_usd: number;
  breakdown: { input_usd: number; output_usd: number; cache_usd: number };
}

export interface MonitorSessionInfo {
  session_id: string;
  ticket_id: string | null;
  started_at: string;
}

export interface CompletionInfo {
  session_id: string;
  ticket_id: string | null;
  outcome: 'done' | 'failed' | 'blocked' | 'unknown';
  pytest_summary: string | null;
  ruff_summary: string | null;
  git_diff_summary: string | null;
  pr_url: string | null;
}

/* ── Process Types ──────────────────────────────────────── */

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
      level: 'debug' | 'info' | 'warn' | 'error' | 'success';
      message: string;
    }
  | {
      type: 'filetail/state';
      at: IsoTimestamp;
      loopActive: boolean;
      iterations: number;
      completedAt?: string;
    }
  | {
      type: 'filetail/stopped';
      at: IsoTimestamp;
    }
  | {
      type: 'filetail/started';
      at: IsoTimestamp;
      loopActive: boolean;
      iterations: number;
    }
  | {
      type: 'monitor/status';
      at: IsoTimestamp;
      connected: boolean;
    }
  | {
      type: 'monitor/tool_event';
      at: IsoTimestamp;
      event: MonitorToolEvent;
    }
  | {
      type: 'monitor/stuck_alert';
      at: IsoTimestamp;
      alert: StuckAlert;
    }
  | {
      type: 'monitor/cost_update';
      at: IsoTimestamp;
      cost: CostUpdate;
    }
  | {
      type: 'monitor/session_start';
      at: IsoTimestamp;
      session: MonitorSessionInfo;
    }
  | {
      type: 'monitor/session_complete';
      at: IsoTimestamp;
      completion: CompletionInfo;
    }
  | {
      type: 'monitor/pipeline_stage';
      at: IsoTimestamp;
      stage: string;
      active: boolean;
    };
