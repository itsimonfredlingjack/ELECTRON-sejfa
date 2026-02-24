import { EventEmitter } from 'node:events';

import { type Socket, io } from 'socket.io-client';

import type {
  CompletionInfo,
  CostUpdate,
  IsoTimestamp,
  LoopEvent,
  MonitorSessionInfo,
  MonitorToolEvent,
  StuckAlert,
} from '../shared/types';

export type MonitorBridgeEvents = {
  status: [status: { connected: boolean; updatedAt: string }];
  monitorEvent: [event: LoopEvent];
};

function nowIso(): IsoTimestamp {
  return new Date().toISOString();
}

export class MonitorBridge extends EventEmitter {
  private socket: Socket | null = null;
  private connected = false;

  constructor(private readonly url: string) {
    super();
  }

  getStatus() {
    return { connected: this.connected };
  }

  connect() {
    if (this.socket) return { ok: true as const };

    const socket = io(this.url + '/monitor', {
      path: '/socket.io',
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: Number.POSITIVE_INFINITY,
      reconnectionDelay: 500,
      reconnectionDelayMax: 8000,
      timeout: 5000,
      autoConnect: true,
    });

    this.socket = socket;

    socket.on('connect', () => {
      this.connected = true;
      this.emit('status', { connected: true, updatedAt: nowIso() });
    });

    socket.on('disconnect', () => {
      this.connected = false;
      this.emit('status', { connected: false, updatedAt: nowIso() });
    });

    socket.on('connect_error', () => {
      this.connected = false;
      this.emit('status', { connected: false, updatedAt: nowIso() });
    });

    // Forward Monitor API events as LoopEvents
    socket.on('tool_event', (payload: MonitorToolEvent) => {
      this.emit('monitorEvent', {
        type: 'monitor/tool_event',
        at: nowIso(),
        event: payload,
      } satisfies LoopEvent);
    });

    socket.on('stuck_alert', (payload: StuckAlert) => {
      this.emit('monitorEvent', {
        type: 'monitor/stuck_alert',
        at: nowIso(),
        alert: payload,
      } satisfies LoopEvent);
    });

    socket.on('cost_update', (payload: CostUpdate) => {
      this.emit('monitorEvent', {
        type: 'monitor/cost_update',
        at: nowIso(),
        cost: payload,
      } satisfies LoopEvent);
    });

    socket.on('session_start', (payload: MonitorSessionInfo) => {
      this.emit('monitorEvent', {
        type: 'monitor/session_start',
        at: nowIso(),
        session: payload,
      } satisfies LoopEvent);
    });

    socket.on('session_complete', (payload: CompletionInfo) => {
      this.emit('monitorEvent', {
        type: 'monitor/session_complete',
        at: nowIso(),
        completion: payload,
      } satisfies LoopEvent);
    });

    socket.on('pipeline_stage', (payload: { stage: string; active: boolean }) => {
      this.emit('monitorEvent', {
        type: 'monitor/pipeline_stage',
        at: nowIso(),
        stage: payload.stage,
        active: payload.active,
      } satisfies LoopEvent);
    });

    return { ok: true as const };
  }

  disconnect() {
    if (!this.socket) return { ok: true as const };
    this.socket.disconnect();
    this.socket.removeAllListeners();
    this.socket = null;
    this.connected = false;
    this.emit('status', { connected: false, updatedAt: nowIso() });
    return { ok: true as const };
  }
}
