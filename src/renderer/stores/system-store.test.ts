import { describe, expect, it } from 'vitest';

import type { ManagedProcessStatus, SocketStatus } from '../../shared/types';
import { systemActions, useSystemStore } from './system-store';

describe('system-store', () => {
  it('setProcessStatus upserts by id', () => {
    systemActions.reset();
    const st1: ManagedProcessStatus = {
      id: 'monitor',
      state: 'running',
      restarts: 0,
      updatedAt: new Date().toISOString(),
    };
    const st2: ManagedProcessStatus = {
      id: 'monitor',
      state: 'error',
      restarts: 1,
      updatedAt: new Date().toISOString(),
      lastError: 'boom',
    };

    systemActions.setProcessStatus(st1);
    expect(useSystemStore.getState().processes.monitor?.state).toBe('running');

    systemActions.setProcessStatus(st2);
    expect(useSystemStore.getState().processes.monitor?.state).toBe('error');
    expect(useSystemStore.getState().processes.monitor?.lastError).toBe('boom');
  });

  it('setSocketStatus updates connected and lastError', () => {
    systemActions.reset();
    const s1: SocketStatus = { connected: true, updatedAt: new Date().toISOString() };
    const s2: SocketStatus = {
      connected: false,
      updatedAt: new Date().toISOString(),
      lastError: 'nope',
    };

    systemActions.setSocketStatus(s1);
    expect(useSystemStore.getState().socket.connected).toBe(true);
    expect(useSystemStore.getState().socket.lastError).toBeUndefined();

    systemActions.setSocketStatus(s2);
    expect(useSystemStore.getState().socket.connected).toBe(false);
    expect(useSystemStore.getState().socket.lastError).toBe('nope');
  });

  it('touchHeartbeat updates lastHeartbeat', () => {
    systemActions.reset();
    expect(useSystemStore.getState().lastHeartbeat).toBe(null);
    systemActions.touchHeartbeat('2020-01-01T00:00:00.000Z');
    expect(useSystemStore.getState().lastHeartbeat).toBe('2020-01-01T00:00:00.000Z');
  });
});
