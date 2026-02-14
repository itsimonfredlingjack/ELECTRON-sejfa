import React from 'react';

import type { GateId, GateUI } from '../models/ui';

function statusClasses(status: GateUI['status']) {
  switch (status) {
    case 'passed':
      return 'border-[rgba(0,255,65,0.25)] bg-[rgba(15,23,42,0.80)] text-[var(--text-primary)]';
    case 'failed':
      return 'border-[rgba(255,45,85,0.28)] bg-[rgba(15,23,42,0.80)] text-[var(--text-primary)]';
    case 'running':
      return 'border-[rgba(34,211,238,0.30)] bg-[rgba(15,23,42,0.80)] text-[var(--text-primary)] shadow-[var(--glow-cyan)]';
    default:
      return 'border-[var(--border-subtle)] bg-[rgba(15,23,42,0.80)] text-[var(--text-secondary)]';
  }
}

function statusDot(status: GateUI['status']) {
  if (status === 'passed')
    return (
      <span
        className="inline-flex h-1.5 w-1.5 rounded-full bg-[var(--neon-green)] shadow-[0_0_18px_rgba(0,255,65,0.15)]"
        aria-label="Passed"
      />
    );
  if (status === 'failed')
    return (
      <span
        className="inline-flex h-1.5 w-1.5 rounded-full bg-[var(--neon-red)] shadow-[0_0_18px_rgba(255,45,85,0.22)]"
        aria-label="Failed"
      />
    );
  if (status === 'running')
    return (
      <span
        className="inline-flex h-1.5 w-1.5 rounded-full bg-[var(--neon-cyan)] shadow-[var(--glow-cyan)] animate-[dot-pulse_1.5s_ease-in-out_infinite]"
        aria-label="Running"
      />
    );
  return (
    <span
      className="inline-flex h-1.5 w-1.5 rounded-full bg-[var(--text-secondary)] opacity-70"
      aria-label="Pending"
    />
  );
}

export type GateBarProps = {
  gates: GateUI[];
  selectedGateId: GateId | null;
  onSelectGate: (id: GateId) => void;
};

export function GateBar(props: GateBarProps) {
  const ids = props.gates.map((g) => g.id);
  const btnRefs = React.useRef(new Map<GateId, HTMLButtonElement | null>());

  return (
    <section className="hud-panel hud-ambient rounded-2xl px-4 py-3 shadow-[0_0_0_1px_var(--border-glow)_inset]">
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between gap-4">
          <div className="hud-label">Pipeline</div>
          <div className="hud-meta">Use arrows to move, Enter to open evidence</div>
        </div>

        <nav className="flex flex-wrap items-center gap-2" aria-label="Gate pipeline">
          {props.gates.map((gate, i) => {
            const selected = gate.id === props.selectedGateId;
            return (
              <React.Fragment key={gate.id}>
                <button
                  type="button"
                  aria-pressed={selected}
                  onClick={() => props.onSelectGate(gate.id)}
                  ref={(el) => {
                    btnRefs.current.set(gate.id, el);
                  }}
                  onKeyDown={(e) => {
                    if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight' && e.key !== 'Enter')
                      return;
                    e.preventDefault();
                    const idx = ids.indexOf(gate.id);
                    if (idx === -1) return;
                    if (e.key === 'Enter') {
                      props.onSelectGate(gate.id);
                      return;
                    }
                    const nextIdx =
                      e.key === 'ArrowLeft'
                        ? Math.max(0, idx - 1)
                        : Math.min(ids.length - 1, idx + 1);
                    const nextId = ids[nextIdx];
                    if (!nextId) return;
                    props.onSelectGate(nextId);
                    btnRefs.current.get(nextId)?.focus();
                  }}
                  className={[
                    'relative inline-flex items-center gap-3 rounded-lg border px-5 py-2 outline-none',
                    'transition-colors transition-shadow transition-transform duration-250',
                    'focus-visible:ring-2 focus-visible:ring-[var(--neon-cyan)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg-deep)]',
                    statusClasses(gate.status),
                    gate.status === 'running' ? 'gate-running' : '',
                    selected
                      ? "translate-y-[-2px] border-[rgba(34,211,238,0.45)] shadow-[var(--glow-cyan)] after:absolute after:bottom-[-6px] after:left-1/2 after:h-3 after:w-3 after:-translate-x-1/2 after:rotate-45 after:bg-[rgba(15,23,42,0.82)] after:border after:border-[rgba(34,211,238,0.35)] after:shadow-[0_0_22px_rgba(34,211,238,0.12)] after:content-['']"
                      : 'hover:border-[rgba(34,211,238,0.22)] hover:bg-[rgba(15,25,50,0.55)]',
                  ].join(' ')}
                >
                  <span className="inline-flex items-center">{statusDot(gate.status)}</span>
                  <span className="font-[var(--font-mono)] text-[13px] font-semibold">
                    {gate.label}
                  </span>
                </button>

                {i < props.gates.length - 1 ? (
                  <div
                    aria-hidden="true"
                    className={[
                      'hidden h-0.5 w-7 rounded-full bg-[var(--border-glow)] sm:block',
                      props.gates[i + 1]?.status === 'running' ? 'connector-active' : '',
                    ].join(' ')}
                  />
                ) : null}
              </React.Fragment>
            );
          })}
        </nav>
      </div>
    </section>
  );
}
