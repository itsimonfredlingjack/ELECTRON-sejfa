import React from 'react';

import type { GateId, GateUI } from '../models/ui';

function statusClasses(status: GateUI['status']) {
  switch (status) {
    case 'passed':
      return 'border-[rgba(0,255,65,0.25)] bg-[rgba(5,10,15,0.6)] text-[var(--text-primary)] shadow-[var(--glow-green)]';
    case 'failed':
      return 'border-[rgba(255,0,60,0.3)] bg-[rgba(5,10,15,0.6)] text-[var(--text-primary)] shadow-[var(--glow-red)]';
    case 'running':
      return 'border-[rgba(34,211,238,0.30)] bg-[rgba(5,10,15,0.6)] text-[var(--text-primary)] shadow-[var(--glow-cyan)]';
    default:
      return 'border-[var(--border-subtle)] bg-[rgba(5,10,15,0.4)] text-[var(--text-secondary)]';
  }
}

function statusDot(status: GateUI['status']) {
  if (status === 'passed')
    return (
      <span
        className="inline-flex h-2 w-2 rounded-full bg-[var(--neon-green)] shadow-[var(--glow-green)]"
        aria-label="Passed"
      />
    );
  if (status === 'failed')
    return (
      <span
        className="inline-flex h-2 w-2 rounded-full bg-[var(--neon-red)] shadow-[var(--glow-red)] animate-pulse"
        aria-label="Failed"
      />
    );
  if (status === 'running')
    return (
      <span
        className="inline-flex h-2 w-2 rounded-full bg-[var(--neon-cyan)] shadow-[var(--glow-cyan)] animate-[dot-pulse_1.5s_ease-in-out_infinite]"
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
    <section className="glass-panel rounded-xl px-4 py-3 relative overflow-hidden">
      {/* Subtle grid background for this panel */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.1)_50%),linear-gradient(90deg,rgba(255,0,0,0.03),rgba(0,255,0,0.01),rgba(0,0,255,0.03))] bg-[length:100%_2px,3px_100%] pointer-events-none opacity-20 z-0" />

      <div className="relative z-10 flex flex-col gap-2">
        <div className="flex items-center justify-between gap-4">
          <div className="text-xs font-bold uppercase tracking-[0.2em] text-[var(--neon-cyan)] drop-shadow-[0_0_5px_rgba(34,211,238,0.5)]">
            Pipeline Status
          </div>
          <div className="text-[10px] text-[var(--text-secondary)] font-mono opacity-70">
            Use arrows to move, Enter to open evidence
          </div>
        </div>

        <nav className="flex flex-wrap items-center gap-3 mt-1" aria-label="Gate pipeline">
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
                    'relative inline-flex items-center gap-3 rounded border px-4 py-1.5 outline-none',
                    'transition-all duration-200 group',
                    'focus-visible:ring-1 focus-visible:ring-[var(--neon-cyan)] focus-visible:ring-offset-1 focus-visible:ring-offset-[var(--bg-deep)]',
                    statusClasses(gate.status),
                    selected
                      ? 'border-[rgba(34,211,238,0.6)] shadow-[var(--glow-cyan)] scale-105'
                      : 'hover:border-[rgba(34,211,238,0.3)] hover:bg-[rgba(15,25,50,0.8)]',
                  ].join(' ')}
                >
                  <span className="inline-flex items-center">{statusDot(gate.status)}</span>
                  <span className="font-[var(--font-mono)] text-[12px] font-bold tracking-wide uppercase">
                    {gate.label}
                  </span>
                  {selected && (
                    <span className="absolute -bottom-1 left-1/2 w-1 h-1 bg-[var(--neon-cyan)] rounded-full -translate-x-1/2 shadow-[0_0_5px_var(--neon-cyan)]" />
                  )}
                </button>

                {i < props.gates.length - 1 ? (
                  <div
                    aria-hidden="true"
                    className={[
                      'hidden h-px w-6 bg-[var(--border-subtle)] sm:block opacity-30',
                      props.gates[i + 1]?.status === 'running'
                        ? 'bg-[var(--neon-cyan)] opacity-100 shadow-[0_0_5px_var(--neon-cyan)]'
                        : '',
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
