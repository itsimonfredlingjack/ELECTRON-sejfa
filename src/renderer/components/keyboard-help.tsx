import React from 'react';

import { useFocusTrap } from '../hooks/use-focus-trap';

export type KeyboardHelpProps = {
  open: boolean;
  onClose: () => void;
};

export function KeyboardHelp(props: KeyboardHelpProps) {
  const closeRef = React.useRef<HTMLButtonElement | null>(null);
  const panelRef = React.useRef<HTMLDivElement | null>(null);

  useFocusTrap(props.open, panelRef);

  React.useEffect(() => {
    if (!props.open) return;
    closeRef.current?.focus();
  }, [props.open]);

  if (!props.open) return null;

  return (
    <div
      className="fixed inset-0 z-50"
      role="dialog"
      aria-modal="true"
      aria-labelledby="keyboard-help-title"
    >
      <button
        type="button"
        tabIndex={-1}
        aria-label="Close keyboard help"
        className="absolute inset-0 hud-backdrop"
        onClick={props.onClose}
      />

      <div className="absolute inset-0 flex items-center justify-center p-4">
        <div
          ref={panelRef}
          className="tech-panel w-full max-w-2xl animate-[drawerIn_220ms_ease-out] rounded-2xl p-6 shadow-[0_0_0_1px_var(--border-glow)_inset]"
        >
          <div className="flex items-start justify-between gap-3">
            <div>
              <div id="keyboard-help-title" className="hud-label text-gradient-primary">
                Keyboard
              </div>
              <div className="hud-title mt-1 text-xl text-gradient-primary">Shortcuts</div>
            </div>
            <button
              ref={closeRef}
              type="button"
              onClick={props.onClose}
              className="rounded-xl border border-border-subtle bg-transparent px-3 py-2 font-heading text-sm font-semibold text-text-secondary outline-none transition-colors hover:bg-bg-panel-hover hover:text-text-primary focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-bg-deep"
            >
              Close
            </button>
          </div>

          <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
            {[
              ['?', 'Toggle this help'],
              ['Esc', 'Close drawer / disarm kill / close help'],
              ['1-5', 'Select gate (Jira, Agent, Actions, Deploy, Verify)'],
              ['O', 'Observe mode'],
              ['C', 'Control mode'],
              ['Space', 'Pause agent (Control mode)'],
              ['Cmd+Shift+S', 'Toggle show/hide window (global)'],
            ].map(([k, d]) => (
              <div key={k} className="rounded-xl border border-border-subtle bg-bg-deep/45 p-4">
                <kbd className="hud-kbd">{k}</kbd>
                <div className="mt-2 text-sm text-text-primary">{d}</div>
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
