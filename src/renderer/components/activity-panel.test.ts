import {
  Bot,
  CircleCheck,
  GitPullRequest,
  MessageSquare,
  Play,
  RefreshCw,
  Rocket,
  Server,
  ShieldCheck,
  Ticket,
  Wifi,
  WifiOff,
} from 'lucide-react';
import { describe, expect, it } from 'vitest';

import type { EventUI } from '../models/ui';
import { parseActivity } from './activity-panel';

function mkEvent(overrides: Partial<EventUI> = {}): EventUI {
  return {
    id: 'e1',
    at: '2026-02-17T12:05:11.000Z',
    node: 'system',
    severity: 'info',
    message: '',
    ...overrides,
  };
}

describe('parseActivity', () => {
  describe('gate events', () => {
    it('parses gate running without detail', () => {
      const result = parseActivity(mkEvent({ message: 'gate local: running', severity: 'info' }));
      expect(result.icon).toBe(Ticket);
      expect(result.title).toBe('Jira gate running');
      expect(result.detail).toBeNull();
      expect(result.color).toBe('info');
    });

    it('parses gate passed with detail', () => {
      const result = parseActivity(
        mkEvent({ message: 'gate ci: passed — All checks pass', severity: 'success' }),
      );
      expect(result.icon).toBe(Bot);
      expect(result.title).toBe('Agent gate passed');
      expect(result.detail).toBe('All checks pass');
      expect(result.color).toBe('success');
    });

    it('parses gate failed', () => {
      const result = parseActivity(
        mkEvent({ message: 'gate review: failed — 2 reviewers rejected', severity: 'error' }),
      );
      expect(result.icon).toBe(GitPullRequest);
      expect(result.title).toBe('Actions gate failed');
      expect(result.detail).toBe('2 reviewers rejected');
      expect(result.color).toBe('error');
    });

    it('maps deploy gate to Rocket icon', () => {
      const result = parseActivity(mkEvent({ message: 'gate deploy: running' }));
      expect(result.icon).toBe(Rocket);
      expect(result.title).toBe('Deploy gate running');
    });

    it('maps verify gate to ShieldCheck icon', () => {
      const result = parseActivity(mkEvent({ message: 'gate verify: passed' }));
      expect(result.icon).toBe(ShieldCheck);
      expect(result.title).toBe('Verify gate passed');
    });

    it('falls back to MessageSquare for unknown gate id', () => {
      const result = parseActivity(mkEvent({ message: 'gate unknown: running' }));
      expect(result.icon).toBe(MessageSquare);
      expect(result.title).toBe('unknown gate running');
    });
  });

  describe('connection events', () => {
    it('parses Monitor connected', () => {
      const result = parseActivity(mkEvent({ message: 'Monitor connected' }));
      expect(result.icon).toBe(Wifi);
      expect(result.title).toBe('Backend Connected');
      expect(result.detail).toBeNull();
      expect(result.color).toBe('success');
    });

    it('parses Monitor disconnected without error', () => {
      const result = parseActivity(mkEvent({ message: 'Monitor disconnected' }));
      expect(result.icon).toBe(WifiOff);
      expect(result.title).toBe('Backend Disconnected');
      expect(result.detail).toBeNull();
      expect(result.color).toBe('error');
    });

    it('parses Monitor disconnected with error message', () => {
      const result = parseActivity(mkEvent({ message: 'Monitor disconnected: ECONNREFUSED' }));
      expect(result.icon).toBe(WifiOff);
      expect(result.title).toBe('Backend Disconnected');
      expect(result.detail).toBe('ECONNREFUSED');
      expect(result.color).toBe('error');
    });
  });

  describe('process events', () => {
    it('parses process state change', () => {
      const result = parseActivity(mkEvent({ message: 'process agent: running' }));
      expect(result.icon).toBe(Server);
      expect(result.title).toBe('Agent Process \u00b7 Running');
      expect(result.detail).toBeNull();
    });

    it('parses process error with detail', () => {
      const result = parseActivity(
        mkEvent({ message: 'process monitor: error (exit code 1)', severity: 'error' }),
      );
      expect(result.icon).toBe(Server);
      expect(result.title).toBe('Monitor Process \u00b7 Error');
      expect(result.detail).toBe('exit code 1');
      expect(result.color).toBe('error');
    });
  });

  describe('task events', () => {
    it('parses Task started', () => {
      const result = parseActivity(mkEvent({ message: 'Task started' }));
      expect(result.icon).toBe(Play);
      expect(result.title).toBe('Task Started');
      expect(result.color).toBe('success');
    });

    it('parses Task completed', () => {
      const result = parseActivity(mkEvent({ message: 'Task completed' }));
      expect(result.icon).toBe(CircleCheck);
      expect(result.title).toBe('Task Completed');
      expect(result.color).toBe('success');
    });
  });

  describe('loop events', () => {
    it('parses Loop started with objective', () => {
      const result = parseActivity(mkEvent({ message: 'Loop started: SEJFA-42: Add user auth' }));
      expect(result.icon).toBe(RefreshCw);
      expect(result.title).toBe('Loop Started');
      expect(result.detail).toBe('SEJFA-42: Add user auth');
      expect(result.color).toBe('info');
    });
  });

  describe('fallback', () => {
    it('returns message as title for unrecognized events', () => {
      const result = parseActivity(
        mkEvent({ message: 'Something unexpected happened', severity: 'warning' }),
      );
      expect(result.icon).toBe(MessageSquare);
      expect(result.title).toBe('Something unexpected happened');
      expect(result.detail).toBeNull();
      expect(result.color).toBe('warning');
    });
  });
});
