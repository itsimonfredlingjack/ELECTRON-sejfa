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
        className="absolute inset-0 bg-black/60 backdrop-blur-[2px]"
        onClick={props.onClose}
      />

      <div className="absolute inset-x-0 bottom-0 mx-auto w-full max-w-5xl px-4 pb-4">
        <div className="hud-panel animate-[drawerIn_180ms_ease-out] rounded-2xl p-5">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <div className="text-xs uppercase tracking-[0.25em] text-[var(--muted)]">
                Evidence
              </div>
              <div className="mt-1 truncate font-[var(--font-heading)] text-lg font-semibold text-[var(--text)]">
                {title}
              </div>
              <div className="mt-1 text-xs text-[var(--muted)]">
                Updated:{' '}
                <span className="font-[var(--font-mono)]">{fmtTime(props.gate?.updatedAt)}</span>
              </div>
            </div>

            <div className="flex shrink-0 items-center gap-2">
              <button
                ref={closeRef}
                type="button"
                onClick={props.onClose}
                className="rounded-xl border border-[color-mix(in_oklab,var(--border)_85%,transparent)] bg-[color-mix(in_oklab,var(--panel-2)_80%,transparent)] px-3 py-2 text-sm font-semibold text-[var(--text)] outline-none transition hover:bg-[color-mix(in_oklab,var(--panel-2)_92%,transparent)] focus-visible:ring-2 focus-visible:ring-[var(--cyan)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg)]"
              >
                Close
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
                className="rounded-xl border border-[color-mix(in_oklab,var(--border)_85%,transparent)] bg-[color-mix(in_oklab,var(--cyan)_14%,transparent)] px-3 py-2 text-sm font-semibold text-[var(--text)] outline-none transition hover:bg-[color-mix(in_oklab,var(--cyan)_22%,transparent)] focus-visible:ring-2 focus-visible:ring-[var(--cyan)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg)]"
              >
                Copy
              </button>
            </div>
          </div>

          <div className="mt-4 max-h-[50vh] overflow-auto rounded-xl border border-[color-mix(in_oklab,var(--border)_85%,transparent)] bg-[color-mix(in_oklab,var(--panel-2)_78%,transparent)] p-4">
            <pre className="whitespace-pre-wrap break-words font-[var(--font-mono)] text-xs leading-relaxed text-[color-mix(in_oklab,var(--text)_88%,white)]">
              {evidence}
            </pre>
          </div>
        </div>
      </div>
    </div>
  );
}
