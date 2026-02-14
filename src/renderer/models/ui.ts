export type GateId = 'local' | 'ci' | 'review' | 'deploy' | 'verify';
export type GateStatusUI = 'pending' | 'running' | 'passed' | 'failed';

export type GateUI = {
  id: GateId;
  label: string;
  status: GateStatusUI;
  updatedAt: string;
  evidence?: string;
};

export type EventSeverity = 'info' | 'warning' | 'error' | 'success';
export type EventNode = GateId | 'system';

export type EventUI = {
  id: string;
  at: string;
  node: EventNode;
  severity: EventSeverity;
  message: string;
};
