import React from 'react';

export type KeyboardHelpProps = {
  open: boolean;
  onClose: () => void;
};

export function KeyboardHelp(props: KeyboardHelpProps) {
  const closeRef = React.useRef<HTMLButtonElement | null>(null);

  React.useEffect(() => {
    if (!props.open) return;
    closeRef.current?.focus();
  }, [props.open]);

  if (!props.open) return null;

  return (
    <div className="fixed inset-0 z-50">
      <button
        type="button"
        tabIndex={-1}
        aria-label="Close keyboard help"
        className="absolute inset-0 bg-black/60 backdrop-blur-[2px]"
        onClick={props.onClose}
      />

      <div className="absolute inset-0 flex items-center justify-center p-4">
        <div className="hud-panel w-full max-w-2xl animate-[drawerIn_180ms_ease-out] rounded-2xl p-6">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="text-xs uppercase tracking-[0.25em] text-[var(--muted)]">
                Keyboard
              </div>
              <div className="mt-1 font-[var(--font-heading)] text-xl font-semibold text-[var(--text)]">
                Shortcuts
              </div>
            </div>
            <button
              ref={closeRef}
              type="button"
              onClick={props.onClose}
              className="rounded-xl border border-[color-mix(in_oklab,var(--border)_85%,transparent)] bg-[color-mix(in_oklab,var(--panel-2)_80%,transparent)] px-3 py-2 text-sm font-semibold text-[var(--text)] outline-none transition hover:bg-[color-mix(in_oklab,var(--panel-2)_92%,transparent)] focus-visible:ring-2 focus-visible:ring-[var(--cyan)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg)]"
            >
              Close
            </button>
          </div>

          <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
            {[
              ['?', 'Toggle this help'],
              ['Esc', 'Close drawer / disarm kill / close help'],
              ['1-6', 'Select gate'],
              ['O', 'Observe mode'],
              ['C', 'Control mode'],
              ['Space', 'Pause agent (Control mode)'],
              ['Cmd+Shift+S', 'Toggle show/hide window (global)'],
            ].map(([k, d]) => (
              <div
                key={k}
                className="rounded-2xl border border-[color-mix(in_oklab,var(--border)_85%,transparent)] bg-[color-mix(in_oklab,var(--panel-2)_75%,transparent)] p-4"
              >
                <div className="font-[var(--font-mono)] text-xs text-[var(--muted)]">{k}</div>
                <div className="mt-1 text-sm text-[var(--text)]">{d}</div>
              </div>
            ))}
          </div>

          <div className="mt-5 text-xs text-[var(--muted)]">
            Tips: Arrow keys also work inside the pipeline. Evidence drawer closes on backdrop
            click.
          </div>
        </div>
      </div>
    </div>
  );
}
