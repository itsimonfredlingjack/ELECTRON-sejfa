import React from 'react';

import type { GateId, GateUI } from '../models/ui';
import { IconCheck, IconX } from './icons';

function statusClasses(status: GateUI['status']) {
  switch (status) {
    case 'passed':
      return 'border-[color-mix(in_oklab,var(--green)_45%,var(--border))] bg-[color-mix(in_oklab,var(--green)_12%,transparent)] text-[color-mix(in_oklab,var(--green)_85%,white)]';
    case 'failed':
      return 'border-[color-mix(in_oklab,var(--red)_45%,var(--border))] bg-[color-mix(in_oklab,var(--red)_12%,transparent)] text-[color-mix(in_oklab,var(--red)_90%,white)]';
    case 'running':
      return 'border-[color-mix(in_oklab,var(--cyan)_45%,var(--border))] bg-[color-mix(in_oklab,var(--cyan)_10%,transparent)] text-[color-mix(in_oklab,var(--cyan)_90%,white)]';
    default:
      return 'border-[color-mix(in_oklab,var(--border)_85%,transparent)] bg-[color-mix(in_oklab,var(--panel-2)_85%,transparent)] text-[var(--muted)]';
  }
}

function statusIcon(status: GateUI['status']) {
  if (status === 'passed') return <IconCheck className="h-4 w-4" title="Passed" />;
  if (status === 'failed') return <IconX className="h-4 w-4" title="Failed" />;
  if (status === 'running')
    return (
      <span
        className="inline-flex h-2 w-2 rounded-full bg-[var(--cyan)] animate-[hudRunning_1.2s_ease-in-out_infinite]"
        aria-label="Running"
      />
    );
  return (
    <span
      className="inline-flex h-2 w-2 rounded-full bg-[color-mix(in_oklab,var(--muted)_45%,transparent)]"
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
    <section className="hud-panel rounded-2xl px-4 py-3">
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between gap-4">
          <div className="text-xs uppercase tracking-[0.25em] text-[var(--muted)]">Pipeline</div>
          <div className="text-xs text-[var(--muted)]">
            Use arrows to move, Enter to open evidence
          </div>
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
                    'inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-sm font-semibold outline-none transition',
                    'transition-colors transition-shadow duration-300',
                    'focus-visible:ring-2 focus-visible:ring-[var(--cyan)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg)]',
                    statusClasses(gate.status),
                    selected
                      ? 'ring-1 ring-[color-mix(in_oklab,var(--cyan)_55%,transparent)]'
                      : 'hover:border-[color-mix(in_oklab,var(--cyan)_25%,var(--border))]',
                    gate.status === 'running'
                      ? 'animate-[hudRunning_1.8s_ease-in-out_infinite]'
                      : '',
                  ].join(' ')}
                >
                  <span className="inline-flex items-center">{statusIcon(gate.status)}</span>
                  <span className="font-[var(--font-heading)]">{gate.label}</span>
                </button>

                {i < props.gates.length - 1 ? (
                  <div
                    aria-hidden="true"
                    className="hidden h-px w-6 bg-[color-mix(in_oklab,var(--border)_70%,transparent)] sm:block"
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
