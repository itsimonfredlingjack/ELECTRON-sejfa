import type { GateState, LoopEvent, TaskObjective } from '../../shared/types';
import type { EventSeverity, EventUI, GateId, GateUI } from '../models/ui';

function nowIso() {
  return new Date().toISOString();
}

function isRecord(x: unknown): x is Record<string, unknown> {
  return typeof x === 'object' && x !== null;
}

function getString(x: unknown): string | undefined {
  return typeof x === 'string' ? x : undefined;
}

function gateIdLabel(id: GateId) {
  switch (id) {
    case 'local':
      return 'Jira';
    case 'ci':
      return 'Agent';
    case 'review':
      return 'Actions';
    case 'deploy':
      return 'Deploy';
    case 'verify':
      return 'Verify';
  }
}

const PIPELINE: readonly GateId[] = ['local', 'ci', 'review', 'deploy', 'verify'] as const;

const CANDIDATES: Record<GateId, readonly string[]> = {
  local: ['local', 'tests'],
  ci: ['ci', 'actions'],
  review: ['review', 'pr'],
  deploy: ['deploy'],
  verify: ['verify', 'rollback'],
};

function matchGateId(nodeId: string): GateId | null {
  const n = nodeId.toLowerCase();
  for (const id of PIPELINE) {
    if (CANDIDATES[id].some((c) => c === n)) return id;
  }
  return null;
}

function toGateStatusUI(status: GateState['status']): GateUI['status'] {
  switch (status) {
    case 'running':
      return 'running';
    case 'passed':
      return 'passed';
    case 'failed':
      return 'failed';
    default:
      return 'pending';
  }
}

export function deriveObjectiveText(
  objective: TaskObjective | null,
  events: LoopEvent[],
): { text: string; prUrl?: string; runUrl?: string } {
  if (objective) return { text: objective.summary };

  for (let i = events.length - 1; i >= 0; i -= 1) {
    const e = events[i];
    if (!e) continue;
    if (e.type !== 'backend/task_started') continue;
    if (!isRecord(e.payload)) continue;
    const obj = isRecord(e.payload.objective) ? e.payload.objective : null;
    if (!obj) continue;
    const key = getString(obj.jiraKey);
    const summary = getString(obj.summary);
    const prUrl = getString(obj.prUrl);
    const runUrl = getString(obj.runUrl);
    if (summary) {
      const out: { text: string; prUrl?: string; runUrl?: string } = {
        text: key ? `${key} — ${summary}` : summary,
      };
      if (prUrl) out.prUrl = prUrl;
      if (runUrl) out.runUrl = runUrl;
      return out;
    }
  }

  return { text: 'Idle' };
}

export function deriveGates(
  gates: GateState[],
  currentNode: string | null,
): { gates: GateUI[]; activeGateId: GateId | null } {
  const byId = new Map<GateId, GateState>();
  for (const g of gates) {
    const gid = matchGateId(g.nodeId);
    if (!gid) continue;
    byId.set(gid, g);
  }

  const uiGates: GateUI[] = PIPELINE.map((id) => {
    const g = byId.get(id);
    return {
      id,
      label: gateIdLabel(id),
      status: g ? toGateStatusUI(g.status) : 'pending',
      updatedAt: g?.updatedAt ?? nowIso(),
      evidence: g?.message ?? 'No evidence available.',
    };
  });

  let activeGateId: GateId | null = null;
  if (currentNode) activeGateId = matchGateId(currentNode);
  if (!activeGateId) activeGateId = uiGates.find((g) => g.status === 'running')?.id ?? null;
  if (!activeGateId) activeGateId = uiGates.find((g) => g.status === 'failed')?.id ?? null;
  if (!activeGateId) {
    const lastPassed = [...uiGates].reverse().find((g) => g.status === 'passed');
    activeGateId = lastPassed?.id ?? null;
  }

  return { gates: uiGates, activeGateId };
}

function severityFromLogLevel(
  level: 'debug' | 'info' | 'warn' | 'error' | 'success',
): EventSeverity {
  if (level === 'warn') return 'warning';
  if (level === 'error') return 'error';
  if (level === 'success') return 'success';
  return 'info';
}

export function deriveTimelineEvents(events: LoopEvent[]): EventUI[] {
  const out: EventUI[] = [];
  for (let i = 0; i < events.length; i += 1) {
    const e = events[i];
    if (!e) continue;

    let severity: EventSeverity = 'info';
    let node: GateId | 'system' = 'system';
    let message = '';
    const at = e.at ?? nowIso();

    switch (e.type) {
      case 'log':
        severity = severityFromLogLevel(e.level);
        message = e.message;
        break;
      case 'socket/status':
        severity = e.status.connected ? 'success' : e.status.lastError ? 'error' : 'warning';
        message = e.status.connected
          ? 'Monitor connected'
          : `Monitor disconnected${e.status.lastError ? `: ${e.status.lastError}` : ''}`;
        break;
      case 'process/status':
        severity = e.status.state === 'error' ? 'error' : 'info';
        message = `process ${e.status.id}: ${e.status.state}${e.status.lastError ? ` (${e.status.lastError})` : ''}`;
        break;
      case 'node/state': {
        const gid = matchGateId(e.gate.nodeId);
        node = gid ?? 'system';
        severity =
          e.gate.status === 'passed'
            ? 'success'
            : e.gate.status === 'failed'
              ? 'error'
              : e.gate.status === 'running'
                ? 'info'
                : 'info';
        message = `gate ${e.gate.nodeId}: ${e.gate.status}${e.gate.message ? ` — ${e.gate.message}` : ''}`;
        break;
      }
      case 'backend/task_started':
        message = 'Task started';
        break;
      case 'backend/task_completed':
        message = 'Task completed';
        break;
      case 'backend/health':
        message = 'Health update';
        break;
      case 'backend/gate_change':
        message = 'Gate change';
        break;
      case 'backend/loop_update':
        message = 'Loop update';
        break;
      case 'backend/agent_event':
        message = 'Agent event';
        break;
      case 'backend/unknown':
        message = `Backend event: ${e.eventName}`;
        severity = 'warning';
        break;
      case 'loop/started':
        message = `Loop started: ${e.objective.summary}`;
        severity = 'info';
        break;
    }

    out.push({
      id: `evt-${i}-${e.type}`,
      at,
      node,
      severity,
      message,
    });
  }

  return out;
}
