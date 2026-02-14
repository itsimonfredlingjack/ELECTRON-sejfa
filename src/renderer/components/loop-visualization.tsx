import React from 'react';

import type { GateId, GateUI } from '../models/ui';
import { IconCheck, IconX } from './icons';

function nodeRing(status: GateUI['status']) {
  switch (status) {
    case 'passed':
      return 'ring-[color-mix(in_oklab,var(--green)_50%,transparent)]';
    case 'failed':
      return 'ring-[color-mix(in_oklab,var(--red)_55%,transparent)]';
    case 'running':
      return 'ring-[color-mix(in_oklab,var(--cyan)_55%,transparent)]';
    default:
      return 'ring-[color-mix(in_oklab,var(--border)_55%,transparent)]';
  }
}

function nodeAccent(status: GateUI['status']) {
  switch (status) {
    case 'passed':
      return 'text-[var(--green)]';
    case 'failed':
      return 'text-[var(--red)]';
    case 'running':
      return 'text-[var(--cyan)]';
    default:
      return 'text-[var(--muted)]';
  }
}

export type LoopVisualizationProps = {
  gates: GateUI[];
  activeGateId: GateId | null;
  onSelectGate: (id: GateId) => void;
};

export function LoopVisualization(props: LoopVisualizationProps) {
  return (
    <section className="hud-panel rounded-2xl p-5">
      <div className="flex items-center justify-between">
        <div className="text-xs uppercase tracking-[0.25em] text-[var(--muted)]">
          Loop Visualization
        </div>
        <div className="text-xs text-[var(--muted)] font-[var(--font-mono)]">
          Active: {props.activeGateId ?? 'none'}
        </div>
      </div>

      <div className="mt-5">
        <div className="flex flex-col gap-3">
          <div className="flex flex-wrap items-stretch justify-between gap-3">
            {props.gates.map((gate, i) => {
              const active = gate.id === props.activeGateId;
              const status = gate.status;

              return (
                <React.Fragment key={gate.id}>
                  <button
                    type="button"
                    onClick={() => props.onSelectGate(gate.id)}
                    className={[
                      'relative flex min-h-24 flex-1 flex-col items-center justify-center rounded-2xl border px-3 py-4',
                      'border-[color-mix(in_oklab,var(--border)_85%,transparent)] bg-[color-mix(in_oklab,var(--panel-2)_75%,transparent)]',
                      'outline-none transition-colors transition-shadow duration-300',
                      'focus-visible:ring-2 focus-visible:ring-[var(--cyan)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg)]',
                      active ? 'animate-[hudPulse_2.2s_ease-in-out_infinite]' : '',
                      `ring-1 ${nodeRing(status)}`,
                    ].join(' ')}
                    aria-label={`${gate.label} gate`}
                  >
                    <div
                      className={[
                        'font-[var(--font-heading)] text-sm font-semibold',
                        nodeAccent(status),
                      ].join(' ')}
                    >
                      {gate.label}
                    </div>
                    <div className="mt-1 text-xs text-[var(--muted)]">{status.toUpperCase()}</div>

                    {status === 'passed' ? (
                      <IconCheck className="absolute right-2 top-2 h-5 w-5 text-[var(--green)]" />
                    ) : null}
                    {status === 'failed' ? (
                      <IconX className="absolute right-2 top-2 h-5 w-5 text-[var(--red)]" />
                    ) : null}
                    {status === 'running' ? (
                      <div
                        className="absolute right-2 top-2 h-2.5 w-2.5 rounded-full bg-[var(--cyan)] animate-[hudRunning_1.1s_ease-in-out_infinite]"
                        aria-hidden="true"
                      />
                    ) : null}
                  </button>

                  {i < props.gates.length - 1 ? (
                    <div
                      aria-hidden="true"
                      className="hidden w-10 items-center justify-center sm:flex"
                    >
                      <div className="h-px w-8 bg-[color-mix(in_oklab,var(--border)_70%,transparent)]" />
                      <div className="-ml-1 h-2 w-2 rotate-45 border-r border-t border-[color-mix(in_oklab,var(--border)_70%,transparent)]" />
                    </div>
                  ) : null}
                </React.Fragment>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
