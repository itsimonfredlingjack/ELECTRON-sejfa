import { useEffect } from 'react';

import type { LoopEvent } from '../../shared/types';
import { useLoopActions } from '../stores/loop-store';
import { useSystemActions } from '../stores/system-store';
import { useElectronApi } from './use-electron-api';

function nowIso() {
  return new Date().toISOString();
}

function isRecord(x: unknown): x is Record<string, unknown> {
  return typeof x === 'object' && x !== null;
}

function toIso(input: unknown): string {
  if (typeof input === 'number' && Number.isFinite(input)) return new Date(input).toISOString();
  if (typeof input === 'string') {
    const ms = Date.parse(input);
    if (!Number.isNaN(ms)) return new Date(ms).toISOString();
  }
  return nowIso();
}

export function useLoopEvents() {
  const api = useElectronApi();
  const loop = useLoopActions();
  const system = useSystemActions();

  useEffect(() => {
    let cancelled = false;

    const unsub = api.loop.onEvent((event: LoopEvent) => {
      // Heartbeat: any event means the app is alive; backend events mean the monitor is alive.
      system.touchHeartbeat(event.at ?? nowIso());
      loop.addEvent(event);

      // Mark monitor as connected when any monitor event arrives
      if (event.type.startsWith('monitor/')) {
        system.setMonitorConnected(true);
      }

      switch (event.type) {
        case 'loop/started':
          loop.setObjective(event.objective);
          break;
        case 'node/state':
          loop.upsertGate(event.gate);
          loop.setCurrentNode(event.gate.nodeId);
          break;
        case 'process/status':
          system.setProcessStatus(event.status);
          break;
        case 'socket/status':
          system.setSocketStatus(event.status);
          break;
        case 'backend/task_started': {
          if (!isRecord(event.payload)) break;
          const obj = isRecord(event.payload.objective) ? event.payload.objective : null;
          if (!obj) break;
          const jiraKey = typeof obj.jiraKey === 'string' ? obj.jiraKey : undefined;
          const summary = typeof obj.summary === 'string' ? obj.summary : undefined;
          if (!summary) break;
          const details = typeof obj.details === 'string' ? obj.details : undefined;
          loop.setObjective({
            id: jiraKey ?? 'jira',
            summary: jiraKey ? `${jiraKey} — ${summary}` : summary,
            ...(details ? { details } : {}),
            source: 'jira',
            priority: 'normal',
            createdAt: nowIso(),
          });
          break;
        }
        case 'backend/gate_change': {
          if (!isRecord(event.payload)) break;
          const gate = isRecord(event.payload.gate) ? event.payload.gate : null;
          if (!gate) break;
          const nodeId =
            typeof gate.nodeId === 'string'
              ? gate.nodeId
              : typeof gate.node === 'string'
                ? gate.node
                : undefined;
          if (!nodeId) break;
          const status = gate.status;
          if (
            status !== 'blocked' &&
            status !== 'ready' &&
            status !== 'running' &&
            status !== 'passed' &&
            status !== 'failed' &&
            status !== 'skipped'
          ) {
            break;
          }
          loop.upsertGate({
            nodeId,
            status,
            updatedAt: toIso(gate.updatedAt ?? gate.timestamp),
            ...(() => {
              const msg =
                typeof gate.evidence === 'string'
                  ? gate.evidence
                  : typeof gate.message === 'string'
                    ? gate.message
                    : undefined;
              return msg ? { message: msg } : {};
            })(),
          });
          loop.setCurrentNode(nodeId);
          break;
        }
        case 'backend/loop_update': {
          if (!isRecord(event.payload)) break;
          const node = typeof event.payload.node === 'string' ? event.payload.node : undefined;
          const status = event.payload.status;
          if (!node) break;
          if (
            status !== 'blocked' &&
            status !== 'ready' &&
            status !== 'running' &&
            status !== 'passed' &&
            status !== 'failed' &&
            status !== 'skipped'
          ) {
            break;
          }
          loop.upsertGate({
            nodeId: node,
            status,
            updatedAt: toIso(event.payload.timestamp),
          });
          loop.setCurrentNode(node);
          break;
        }
        case 'filetail/state':
          loop.setFileTailState(event.loopActive, event.iterations);
          break;
        case 'filetail/started':
          loop.setFileTailState(event.loopActive, event.iterations);
          break;
        case 'filetail/stopped':
          loop.setFileTailDisconnected();
          break;
        case 'monitor/status':
          system.setMonitorConnected(event.connected);
          break;
        case 'monitor/tool_event':
          break;
        case 'monitor/stuck_alert':
          loop.setStuckAlert(event.alert);
          break;
        case 'monitor/cost_update':
          loop.setCost(event.cost);
          break;
        case 'monitor/session_start':
          if (event.session.ticket_id) {
            loop.setObjective({
              id: event.session.session_id,
              summary: event.session.ticket_id,
              source: 'jira',
              priority: 'normal',
              createdAt: event.at,
            });
          }
          break;
        case 'monitor/session_complete':
          loop.setCompletion(event.completion);
          break;
        case 'monitor/pipeline_stage':
          loop.setActiveStage(event.active ? event.stage : null);
          loop.upsertGate({
            nodeId: event.stage,
            status: event.active ? 'running' : 'passed',
            updatedAt: event.at,
          });
          loop.setCurrentNode(event.stage);
          break;
        default:
          break;
      }
    });

    (async () => {
      try {
        const [procSnap, sock] = await Promise.all([
          api.processes.getStatus(),
          api.socket.getStatus(),
        ]);
        if (cancelled) return;
        system.setProcesses(procSnap);
        system.setSocketStatus(sock);
        system.touchHeartbeat(nowIso());
      } catch (err) {
        if (cancelled) return;
        loop.addEvent({
          type: 'log',
          at: nowIso(),
          runId: 'renderer',
          level: 'warn',
          message: `Failed to seed system state: ${err instanceof Error ? err.message : String(err)}`,
        });
      }
    })();

    return () => {
      cancelled = true;
      unsub();
    };
  }, [api, loop, system]);
}
