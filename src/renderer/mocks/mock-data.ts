import type { EventNode, EventSeverity, EventUI, GateId, GateUI } from '../models/ui';

export type MockObjective = {
  key: string;
  summary: string;
  branch: string;
  prUrl?: string;
  runUrl?: string;
};

function iso(msAgo: number) {
  return new Date(Date.now() - msAgo).toISOString();
}

export const mockObjective: MockObjective = {
  key: 'SEJFA-142',
  summary: 'Tighten kill-switch gating and harden IPC validation for child process control',
  branch: 'sejfa/SEJFA-142-kill-guardrails',
  prUrl: 'https://github.com/example/repo/pull/142',
  runUrl: 'https://github.com/example/repo/actions/runs/1234567890',
};

export const mockEvidenceByGateId: Record<GateId, string> = {
  local: [
    '$ npm run lint',
    'Checked 38 files in 7ms. No fixes applied.',
    '',
    '$ npm test',
    'Test Files  4 passed (4)',
    '',
    '$ npm run typecheck',
    'tsc -p tsconfig.json --noEmit',
  ].join('\n'),
  ci: [
    'GitHub Actions',
    '  - build: passed (2m 14s)',
    '  - unit: passed (0m 41s)',
    '  - e2e: running...',
    '',
    'Artifacts:',
    '  - playwright-report.zip',
  ].join('\n'),
  review: [
    'PR Review',
    '  - 1 approved',
    '  - 0 requested changes',
    '',
    'Notes:',
    '  - Ensure tray state updates on socket disconnect.',
  ].join('\n'),
  deploy: [
    'Azure Container Apps deploy',
    '  - revision: sejfa-142-rc.3',
    '  - traffic: 10% -> 100%',
    '',
    'Rollout checks:',
    '  - health endpoint: ok',
  ].join('\n'),
  verify: [
    'Post-deploy verify',
    '  - smoke: failed',
    '  - rollback: triggered',
    '',
    'Error:',
    '  - 502 from /healthz for 3 consecutive checks',
  ].join('\n'),
};

export const mockGates: GateUI[] = [
  {
    id: 'local',
    label: 'Local',
    status: 'passed',
    updatedAt: iso(9 * 60_000),
    evidence: mockEvidenceByGateId.local,
  },
  {
    id: 'ci',
    label: 'CI',
    status: 'running',
    updatedAt: iso(6 * 60_000),
    evidence: mockEvidenceByGateId.ci,
  },
  {
    id: 'review',
    label: 'Review',
    status: 'pending',
    updatedAt: iso(12 * 60_000),
    evidence: mockEvidenceByGateId.review,
  },
  {
    id: 'deploy',
    label: 'Deploy',
    status: 'pending',
    updatedAt: iso(16 * 60_000),
    evidence: mockEvidenceByGateId.deploy,
  },
  {
    id: 'verify',
    label: 'Verify',
    status: 'failed',
    updatedAt: iso(2 * 60_000),
    evidence: mockEvidenceByGateId.verify,
  },
];

function pick<T>(arr: readonly T[], n: number) {
  return arr[n % arr.length] as T;
}

export function makeMockEvents(count = 240): EventUI[] {
  const nodes: readonly EventNode[] = ['system', 'local', 'ci', 'review', 'deploy', 'verify'];
  const severities: readonly EventSeverity[] = ['info', 'success', 'warning', 'error'];
  const msgBySeverity: Record<EventSeverity, readonly string[]> = {
    info: [
      'Queue heartbeat received',
      'State reconciled',
      'Agent planning step complete',
      'Log stream attached',
    ],
    success: ['Gate passed', 'PR updated', 'Deployment completed', 'Checks green'],
    warning: ['Retrying connection', 'Slow response from backend', 'Flaky test detected'],
    error: ['Command failed', 'CI step failed', 'Deploy health check failed', 'Rollback executed'],
  };

  const out: EventUI[] = [];
  for (let i = 0; i < count; i += 1) {
    const severity = pick(severities, i);
    const node = pick(nodes, i * 7);
    const msg = pick(msgBySeverity[severity], i * 3);
    out.push({
      id: `evt-${i}`,
      at: iso((count - i) * 15_000),
      node,
      severity,
      message: `${msg}${node !== 'system' ? ` (${node})` : ''}`,
    });
  }

  return out;
}

export const mockEvents = makeMockEvents();

export const mockAlertsCount = mockEvents.filter(
  (e) => e.severity === 'warning' || e.severity === 'error',
).length;

export const mockConnected = true;
