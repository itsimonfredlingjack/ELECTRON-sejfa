import { EventEmitter } from 'node:events';

import { type Socket, io } from 'socket.io-client';

import type { SocketStatus } from '../shared/types';

export type SocketBridgeEvents = {
  status: [status: SocketStatus];
  backendEvent: [eventName: string, payload: unknown];
};

function nowIso() {
  return new Date().toISOString();
}

function safeJsonSize(input: unknown) {
  try {
    return JSON.stringify(input).length;
  } catch {
    return Number.POSITIVE_INFINITY;
  }
}

export class SocketBridge extends EventEmitter {
  private socket: Socket | null = null;
  private status: SocketStatus = { connected: false, updatedAt: nowIso() };

  constructor(private readonly url: string) {
    super();
  }

  getStatus() {
    return this.status;
  }

  connect() {
    if (this.socket) return { ok: true as const };

    const socket = io(this.url, {
      transports: ['websocket'],
      reconnection: true,
      reconnectionAttempts: Number.POSITIVE_INFINITY,
      reconnectionDelay: 500,
      reconnectionDelayMax: 8000,
      timeout: 5000,
      autoConnect: true,
    });

    this.socket = socket;

    const emitStatus = (next: SocketStatus) => {
      this.status = next;
      this.emit('status', this.status);
    };

    socket.on('connect', () => emitStatus({ connected: true, updatedAt: nowIso() }));
    socket.on('disconnect', (reason) =>
      emitStatus({ connected: false, updatedAt: nowIso(), lastError: reason }),
    );
    socket.on('connect_error', (err) =>
      emitStatus({
        connected: false,
        updatedAt: nowIso(),
        lastError: err instanceof Error ? err.message : String(err),
      }),
    );

    const forward = (eventName: string) => {
      socket.on(eventName, (payload: unknown) => {
        const size = safeJsonSize(payload);
        if (size > 200_000) {
          emitStatus({
            connected: this.status.connected,
            updatedAt: nowIso(),
            lastError: `Dropped oversized ${eventName} payload (${size} bytes)`,
          });
          return;
        }
        this.emit('backendEvent', eventName, payload);
      });
    };

    forward('loop_update');
    forward('gate_change');
    forward('agent_event');
    forward('health');
    forward('task_started');
    forward('task_completed');

    return { ok: true as const };
  }

  disconnect() {
    if (!this.socket) return { ok: true as const };
    this.socket.disconnect();
    this.socket.removeAllListeners();
    this.socket = null;
    this.status = { connected: false, updatedAt: nowIso() };
    this.emit('status', this.status);
    return { ok: true as const };
  }
}
