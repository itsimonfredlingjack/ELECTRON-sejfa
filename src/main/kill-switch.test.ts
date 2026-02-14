import { describe, expect, it } from 'vitest';

import { createKillSwitch } from './kill-switch';

describe('kill switch', () => {
  it('arms and confirms within window', () => {
    let t = 1000;
    const ks = createKillSwitch({
      windowMs: 5000,
      now: () => t,
      uuid: () => 'token-1',
    });

    const armed = ks.arm();
    expect(armed.token).toBe('token-1');

    t = 4000;
    expect(ks.confirm('token-1')).toEqual({ ok: true });
  });

  it('expires after window', () => {
    let t = 1000;
    const ks = createKillSwitch({
      windowMs: 10,
      now: () => t,
      uuid: () => 'token-2',
    });

    ks.arm();
    t = 2000;
    expect(ks.confirm('token-2')).toEqual({ ok: false, reason: 'expired' });
  });

  it('disarms after confirm attempt', () => {
    const ks = createKillSwitch({ uuid: () => 'token-3' });
    ks.arm();
    expect(ks.confirm('wrong')).toEqual({ ok: false, reason: 'invalid token' });
    expect(ks.confirm('token-3')).toEqual({ ok: false, reason: 'not armed' });
  });
});
