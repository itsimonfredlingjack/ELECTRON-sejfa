import { randomUUID } from 'node:crypto';

export interface KillArmResponse {
  token: string;
  expiresAt: string;
}

export function createKillSwitch(opts?: {
  windowMs?: number;
  now?: () => number;
  uuid?: () => string;
}) {
  const windowMs = opts?.windowMs ?? 5000;
  const now = opts?.now ?? (() => Date.now());
  const uuid = opts?.uuid ?? (() => randomUUID());

  let armedToken: string | null = null;
  let armedUntilMs: number | null = null;

  function disarm() {
    armedToken = null;
    armedUntilMs = null;
  }

  return {
    arm(): KillArmResponse {
      const token = uuid();
      const until = now() + windowMs;
      armedToken = token;
      armedUntilMs = until;
      return { token, expiresAt: new Date(until).toISOString() };
    },

    confirm(token: string): { ok: true } | { ok: false; reason: string } {
      try {
        if (!armedToken || !armedUntilMs) return { ok: false, reason: 'not armed' };
        if (now() > armedUntilMs) return { ok: false, reason: 'expired' };
        if (token !== armedToken) return { ok: false, reason: 'invalid token' };
        return { ok: true };
      } finally {
        // Always disarm after a confirm attempt.
        disarm();
      }
    },

    peek(): { armed: boolean; expiresAt?: string } {
      if (!armedToken || !armedUntilMs) return { armed: false };
      return { armed: true, expiresAt: new Date(armedUntilMs).toISOString() };
    },
  };
}
