import React from 'react';

import type { GateUI } from '../models/ui';

export type EvidenceDrawerProps = {
  open: boolean;
  gate: GateUI | null;
  onClose: () => void;
};

function fmtTime(iso: string | undefined) {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return iso;
  }
}

export function EvidenceDrawer(props: EvidenceDrawerProps) {
  const closeRef = React.useRef<HTMLButtonElement | null>(null);

  React.useEffect(() => {
    if (!props.open) return;
    closeRef.current?.focus();
  }, [props.open]);

  if (!props.open) return null;

  const title = props.gate ? `${props.gate.label} evidence` : 'Evidence';
  const evidence = props.gate?.evidence ?? 'No evidence available.';

  return (
    <div className="fixed inset-0 z-50">
      <button
        type="button"
        aria-label="Close evidence drawer"
        tabIndex={-1}
        className="absolute inset-0 hud-backdrop"
        onClick={props.onClose}
      />

      <div className="absolute inset-x-0 bottom-0 mx-auto w-full max-w-5xl px-4 pb-4">
        <div className="glass-panel glass-panel-heavy relative animate-[drawerIn_220ms_ease-out] rounded-t-2xl p-6 border-t border-[var(--neon-cyan)] shadow-[0_-5px_30px_rgba(34,211,238,0.15)]">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <div className="hud-label">Evidence</div>
              <div className="hud-title mt-1 truncate text-lg">{title}</div>
              <div className="hud-meta mt-1">
                Updated:{' '}
                <span className="font-semibold text-[var(--text-primary)]">
                  {fmtTime(props.gate?.updatedAt)}
                </span>
              </div>
            </div>

            <div className="flex shrink-0 items-center gap-2">
              <button
                ref={closeRef}
                type="button"
                onClick={props.onClose}
                aria-label="Close"
                className="grid h-9 w-9 place-items-center rounded-full border border-[var(--border-subtle)] bg-transparent font-[var(--font-heading)] text-lg text-[var(--text-secondary)] outline-none transition-colors hover:bg-[rgba(255,255,255,0.02)] hover:text-[var(--text-primary)] focus-visible:ring-2 focus-visible:ring-[var(--neon-cyan)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg-deep)]"
              >
                ✕
              </button>
              <button
                type="button"
                onClick={async () => {
                  try {
                    await navigator.clipboard.writeText(evidence);
                  } catch {
                    // Clipboard access may be blocked; fail silently in Phase 4.
                  }
                }}
                className="rounded-xl border border-[var(--border-subtle)] bg-transparent px-3 py-2 font-[var(--font-heading)] text-sm font-semibold text-[var(--text-secondary)] outline-none transition-colors hover:bg-[var(--bg-panel-hover)] hover:text-[var(--text-primary)] focus-visible:ring-2 focus-visible:ring-[var(--neon-cyan)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg-deep)]"
              >
                Copy
              </button>
            </div>
          </div>

          <div className="mt-4 max-h-[50vh] overflow-auto rounded-xl border border-[var(--border-subtle)] bg-[rgba(0,0,0,0.30)] p-4">
            <pre className="whitespace-pre-wrap break-words font-[var(--font-mono)] text-[13px] leading-relaxed text-[var(--text-primary)]">
              {evidence}
            </pre>
          </div>
        </div>
      </div>
    </div>
  );
}
