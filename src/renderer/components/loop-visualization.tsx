import React from 'react';

import type { GateId, GateUI } from '../models/ui';
import { IconCheck, IconX } from './icons';

function nodeAccent(status: GateUI['status']) {
  switch (status) {
    case 'passed':
      return 'text-[var(--neon-green)]';
    case 'failed':
      return 'text-[var(--neon-red)]';
    case 'running':
      return 'text-[var(--neon-cyan)]';
    default:
      return 'text-[var(--text-secondary)]';
  }
}

export type LoopVisualizationProps = {
  gates: GateUI[];
  activeGateId: GateId | null;
  onSelectGate: (id: GateId) => void;
};

export function LoopVisualization(props: LoopVisualizationProps) {
  return (
    <section className="glass-panel rounded-xl p-5 shadow-[0_0_20px_rgba(34,211,238,0.1)] border border-[rgba(34,211,238,0.2)]">
      <div className="flex items-center justify-between">
        <div className="hud-label">Loop Visualization</div>
        <div className="hud-meta">Active: {props.activeGateId ?? 'none'}</div>
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
                      'relative flex min-h-24 flex-1 flex-col items-center justify-center rounded-xl border px-3 py-4',
                      'border-[var(--border-subtle)] bg-[rgba(15,23,42,0.50)]',
                      'outline-none transition-colors transition-shadow duration-250',
                      'focus-visible:ring-2 focus-visible:ring-[var(--neon-cyan)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg-deep)]',
                      status === 'pending' ? 'opacity-50' : '',
                      active
                        ? 'border-[var(--neon-cyan)] shadow-[var(--glow-cyan)] animate-[node-breathe_2.6s_ease-in-out_infinite]'
                        : '',
                      status === 'passed'
                        ? 'border-[rgba(0,255,65,0.30)] shadow-[var(--glow-green)]'
                        : '',
                      status === 'failed'
                        ? 'border-[rgba(255,45,85,0.34)] shadow-[var(--glow-red)] animate-[glitch_2.8s_ease-in-out_infinite]'
                        : '',
                    ].join(' ')}
                    aria-label={`${gate.label} gate`}
                  >
                    <div
                      className={[
                        'font-[var(--font-heading)] text-[13px] font-semibold',
                        nodeAccent(status),
                      ].join(' ')}
                    >
                      {gate.label}
                    </div>
                    <div
                      className={[
                        'mt-1 font-[var(--font-mono)] text-[11px] uppercase tracking-widest',
                        status === 'running'
                          ? 'text-[var(--neon-cyan)]'
                          : status === 'passed'
                            ? 'text-[var(--neon-green)]'
                            : status === 'failed'
                              ? 'text-[var(--neon-red)]'
                              : 'text-[var(--text-secondary)]',
                      ].join(' ')}
                    >
                      {status}
                    </div>

                    {status === 'passed' ? (
                      <IconCheck className="absolute right-2 top-2 h-5 w-5 text-[var(--neon-green)] drop-shadow-[0_0_14px_rgba(0,255,65,0.35)]" />
                    ) : null}
                    {status === 'failed' ? (
                      <IconX className="absolute right-2 top-2 h-5 w-5 text-[var(--neon-red)] drop-shadow-[0_0_16px_rgba(255,45,85,0.45)]" />
                    ) : null}
                  </button>

                  {i < props.gates.length - 1 ? (
                    <div
                      aria-hidden="true"
                      className="hidden w-10 items-center justify-center sm:flex"
                    >
                      <div
                        className={[
                          'h-0.5 w-8 rounded-full bg-[var(--border-glow)]',
                          props.gates[i + 1]?.status === 'running' ? 'connector-active' : '',
                        ].join(' ')}
                      />
                      <div className="-ml-1 h-2 w-2 rotate-45 border-r border-t border-[var(--border-glow)]" />
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
