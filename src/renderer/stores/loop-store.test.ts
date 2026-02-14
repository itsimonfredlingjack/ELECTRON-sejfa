import { describe, expect, it } from 'vitest';

import type { GateState, LoopEvent, TaskObjective } from '../../shared/types';
import { loopActions, useLoopStore } from './loop-store';

describe('loop-store', () => {
  it('setObjective sets and clears objective', () => {
    loopActions.reset();
    const obj: TaskObjective = {
      id: 't1',
      summary: 'Test objective',
      source: 'manual',
      priority: 'normal',
      createdAt: new Date().toISOString(),
    };

    loopActions.setObjective(obj);
    expect(useLoopStore.getState().objective?.id).toBe('t1');

    loopActions.setObjective(null);
    expect(useLoopStore.getState().objective).toBe(null);
  });

  it('upsertGate upserts by nodeId', () => {
    loopActions.reset();
    const g1: GateState = { nodeId: 'ci', status: 'running', updatedAt: new Date().toISOString() };
    const g2: GateState = { nodeId: 'ci', status: 'passed', updatedAt: new Date().toISOString() };

    loopActions.upsertGate(g1);
    expect(useLoopStore.getState().gates).toHaveLength(1);
    expect(useLoopStore.getState().gates[0]?.status).toBe('running');

    loopActions.upsertGate(g2);
    expect(useLoopStore.getState().gates).toHaveLength(1);
    expect(useLoopStore.getState().gates[0]?.status).toBe('passed');
  });

  it('addEvent appends and caps events', () => {
    loopActions.reset();
    for (let i = 0; i < 600; i += 1) {
      const e: LoopEvent = {
        type: 'log',
        at: new Date().toISOString(),
        runId: 'r',
        level: 'info',
        message: `m${i}`,
      };
      loopActions.addEvent(e);
    }

    expect(useLoopStore.getState().events.length).toBeLessThanOrEqual(500);
    expect(useLoopStore.getState().events.at(-1)?.type).toBe('log');
  });
});
