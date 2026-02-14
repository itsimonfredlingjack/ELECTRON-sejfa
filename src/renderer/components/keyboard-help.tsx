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
        className="absolute inset-0 hud-backdrop"
        onClick={props.onClose}
      />

      <div className="absolute inset-0 flex items-center justify-center p-4">
        <div className="hud-panel w-full max-w-2xl animate-[drawerIn_220ms_ease-out] rounded-2xl p-6 shadow-[0_0_0_1px_var(--border-glow)_inset]">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="hud-label">Keyboard</div>
              <div className="hud-title mt-1 text-xl">Shortcuts</div>
            </div>
            <button
              ref={closeRef}
              type="button"
              onClick={props.onClose}
              className="rounded-xl border border-[var(--border-subtle)] bg-transparent px-3 py-2 font-[var(--font-heading)] text-sm font-semibold text-[var(--text-secondary)] outline-none transition-colors hover:bg-[var(--bg-panel-hover)] hover:text-[var(--text-primary)] focus-visible:ring-2 focus-visible:ring-[var(--neon-cyan)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg-deep)]"
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
                className="rounded-xl border border-[var(--border-subtle)] bg-[rgba(15,23,42,0.45)] p-4"
              >
                <kbd className="hud-kbd">{k}</kbd>
                <div className="mt-2 text-sm text-[var(--text-primary)]">{d}</div>
              </div>
            ))}
          </div>

          <div className="hud-meta mt-5">
            Tips: Arrow keys also work inside the pipeline. Evidence drawer closes on backdrop
            click.
          </div>
        </div>
      </div>
    </div>
  );
}
