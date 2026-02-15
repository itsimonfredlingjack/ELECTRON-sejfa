/**
 * GOD MODE — Simulate a full Red→Green→Refactor→Deploy loop.
 * Drives the Zustand stores directly so the entire HUD lights up
 * with animations and sound effects, no backend required.
 */

import type { GateStatus } from '../shared/types';
import { loopActions } from './stores/loop-store';
import { systemActions } from './stores/system-store';

/* ── Timing ───────────────────────────────────────────────── */

const STEP_MS = 900;

/* ── Scenario Steps ───────────────────────────────────────── */

type SimStep =
    | { do: 'log'; level?: 'info' | 'warn' | 'error'; message: string }
    | { do: 'node'; node: string }
    | { do: 'gate'; nodeId: string; status: GateStatus; message?: string }
    | { do: 'objective'; id: string; summary: string }
    | { do: 'process'; state: 'running' | 'idle' }
    | { do: 'pause'; ms: number };

const SCENARIO: SimStep[] = [
    // ── Boot ──────────────────────────────────────────
    { do: 'log', message: '⚡ GOD MODE: Simulation started' },
    { do: 'objective', id: 'SEJFA-128', summary: 'SEJFA-128 — Implement Rate Limiting Middleware' },
    { do: 'process', state: 'running' },

    // ── 1. Jira ───────────────────────────────────────
    { do: 'node', node: 'jira' },
    { do: 'gate', nodeId: 'jira', status: 'running', message: 'Fetching ticket...' },
    { do: 'log', message: '🎫 Fetching Jira ticket SEJFA-128...' },
    { do: 'log', message: '📋 Objective: Implement Rate Limiting Middleware' },
    { do: 'gate', nodeId: 'jira', status: 'passed', message: 'Ticket loaded' },

    // ── 2. Claude (Plan) ──────────────────────────────
    { do: 'node', node: 'claude' },
    { do: 'gate', nodeId: 'claude', status: 'running', message: 'Planning...' },
    { do: 'log', message: '🧠 Analyzing codebase structure...' },
    { do: 'log', message: '📝 Plan: 1. Add middleware  2. Update config  3. Write tests' },
    { do: 'gate', nodeId: 'claude', status: 'passed', message: 'Plan ready' },

    // ── 3. Local — RED (tests fail) ───────────────────
    { do: 'node', node: 'local' },
    { do: 'gate', nodeId: 'local', status: 'running', message: 'Running pytest...' },
    { do: 'log', message: '🧪 Running pytest tests/test_rate_limit.py...' },
    { do: 'pause', ms: 400 },
    { do: 'log', level: 'error', message: '❌ FAIL: test_limit_exceeded (AssertionError)' },
    { do: 'log', level: 'error', message: '❌ FAIL: test_rate_headers  (KeyError: X-RateLimit)' },
    { do: 'gate', nodeId: 'local', status: 'failed', message: '2 tests failed' },

    // ── 3b. Local — GREEN (implementation + retest) ───
    { do: 'log', message: '🔧 Implementing fix in src/middleware.py...' },
    { do: 'pause', ms: 300 },
    { do: 'gate', nodeId: 'local', status: 'running', message: 'Re-running tests...' },
    { do: 'log', message: '🧪 Re-running pytest...' },
    { do: 'log', message: '✅ PASS: test_limit_exceeded' },
    { do: 'log', message: '✅ PASS: test_rate_headers' },
    { do: 'log', message: '✅ PASS: test_normal_request' },
    { do: 'log', message: '✅ PASS: test_limit_reset' },
    { do: 'gate', nodeId: 'local', status: 'passed', message: '4/4 tests passed' },

    // ── 4. CI/CD ──────────────────────────────────────
    { do: 'node', node: 'ci' },
    { do: 'gate', nodeId: 'ci', status: 'running', message: 'GitHub Actions...' },
    { do: 'log', message: '🚀 Pushing branch feat/rate-limit to GitHub...' },
    { do: 'log', message: '⚙️ GitHub Actions: Build #402 STARTED' },
    { do: 'pause', ms: 500 },
    { do: 'log', message: '⚙️ GitHub Actions: Lint ✅  Type Check ✅  Tests ✅' },
    { do: 'gate', nodeId: 'ci', status: 'passed', message: 'Build #402 passed' },

    // ── 5. Deploy ─────────────────────────────────────
    { do: 'node', node: 'deploy' },
    { do: 'gate', nodeId: 'deploy', status: 'running', message: 'Deploying...' },
    { do: 'log', message: '☁️ Deploying to Azure Container Apps...' },
    { do: 'pause', ms: 400 },
    { do: 'log', message: '🎉 DEPLOYMENT COMPLETE — v2.4.1 live' },
    { do: 'gate', nodeId: 'deploy', status: 'passed', message: 'Deployed v2.4.1' },

    // ── Done ──────────────────────────────────────────
    { do: 'process', state: 'idle' },
    { do: 'log', message: '🏁 Loop complete. All gates passed.' },
];

/* ── Execution Engine ─────────────────────────────────────── */

let _running = false;

function nowIso() {
    return new Date().toISOString();
}

async function sleep(ms: number) {
    return new Promise<void>((r) => setTimeout(r, ms));
}

function executeStep(step: SimStep) {
    switch (step.do) {
        case 'log':
            loopActions.addEvent({
                type: 'log',
                at: nowIso(),
                runId: 'sim-1',
                level: step.level ?? 'info',
                message: step.message,
            });
            break;

        case 'node':
            loopActions.setCurrentNode(step.node);
            break;

        case 'gate': {
            const gate: { nodeId: string; status: GateStatus; updatedAt: string; message?: string } = {
                nodeId: step.nodeId,
                status: step.status,
                updatedAt: nowIso(),
            };
            if (step.message) gate.message = step.message;
            loopActions.upsertGate(gate);
            break;
        }

        case 'objective':
            loopActions.setObjective({
                id: step.id,
                summary: step.summary,
                source: 'jira',
                priority: 'normal',
                createdAt: nowIso(),
            });
            break;

        case 'process':
            if (step.state === 'running') {
                systemActions.setProcessStatus({
                    id: 'agent',
                    state: 'running',
                    restarts: 0,
                    updatedAt: nowIso(),
                });
            } else {
                systemActions.setProcessStatus({
                    id: 'agent',
                    state: 'stopped',
                    restarts: 0,
                    updatedAt: nowIso(),
                });
            }
            break;

        case 'pause':
            // handled by the runner
            break;
    }
}

export async function runSimulation() {
    if (_running) return; // prevent double-run
    _running = true;

    // Reset stores & fake "connected" state
    loopActions.reset();
    systemActions.setSocketStatus({ connected: true, updatedAt: nowIso() });
    loopActions.setAppMode('control');

    for (const step of SCENARIO) {
        if (!_running) break;

        if (step.do === 'pause') {
            await sleep(step.ms);
            continue;
        }

        executeStep(step);
        await sleep(STEP_MS);
    }

    _running = false;
}

export function stopSimulation() {
    _running = false;
}
