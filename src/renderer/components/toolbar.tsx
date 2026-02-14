import type React from 'react';

import { IconDot, IconExternal, IconPause, IconPlay } from './icons';

export type ToolbarMode = 'observe' | 'control';

export type ToolbarProps = {
  objectiveText: string;
  mode: ToolbarMode;
  onModeChange: (mode: ToolbarMode) => void;
  alertsCount: number;
  connected: boolean;

  startDisabled?: boolean;
  pauseDisabled?: boolean;
  killDisabled?: boolean;
  openPrDisabled?: boolean;
  openRunDisabled?: boolean;

  killArmedUntil: string | null;
  onArmKill: () => void;
  onConfirmKill: () => void;

  onStart: () => void;
  onPause: () => void;
  onOpenPr: () => void;
  onOpenRun: () => void;
};

function ModeButton(props: {
  value: ToolbarMode;
  active: boolean;
  onSelect: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-pressed={props.active}
      onClick={props.onSelect}
      className={[
        'px-3 py-1.5 text-xs font-medium tracking-wide outline-none transition',
        'focus-visible:ring-2 focus-visible:ring-[var(--cyan)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg)]',
        props.active
          ? 'bg-[color-mix(in_oklab,var(--cyan)_16%,transparent)] text-[var(--text)]'
          : 'text-[var(--muted)] hover:text-[var(--text)]',
      ].join(' ')}
    >
      {props.children}
    </button>
  );
}

export function Toolbar(props: ToolbarProps) {
  const killArmed = Boolean(props.killArmedUntil);

  return (
    <header className="hud-panel rounded-2xl px-5 py-4">
      <div className="flex flex-col gap-3">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="text-xs uppercase tracking-[0.28em] text-[var(--muted)]">Objective</div>
            <div className="mt-1 truncate font-[var(--font-heading)] text-lg font-semibold text-[var(--text)]">
              {props.objectiveText}
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-3">
            <div className="flex items-center gap-2 rounded-full border border-[color-mix(in_oklab,var(--border)_80%,transparent)] bg-[color-mix(in_oklab,var(--panel-2)_88%,transparent)] px-3 py-1.5">
              <IconDot
                className={[
                  'h-3 w-3',
                  props.connected ? 'text-[var(--green)]' : 'text-[var(--red)]',
                ].join(' ')}
                title={props.connected ? 'Connected' : 'Disconnected'}
              />
              <div className="text-xs text-[var(--muted)]">
                {props.connected ? 'Connected' : 'Disconnected'}
              </div>
            </div>

            <div className="flex items-center gap-2 rounded-full border border-[color-mix(in_oklab,var(--border)_80%,transparent)] bg-[color-mix(in_oklab,var(--panel-2)_88%,transparent)] px-3 py-1.5">
              <div className="text-xs text-[var(--muted)]">Alerts</div>
              <div className="rounded-full bg-[color-mix(in_oklab,var(--amber)_22%,transparent)] px-2 py-0.5 text-xs font-semibold text-[color-mix(in_oklab,var(--amber)_95%,white)]">
                {props.alertsCount}
              </div>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-2">
            <div className="text-xs uppercase tracking-[0.2em] text-[var(--muted)]">Mode</div>
            <div
              aria-label="App mode"
              className="inline-flex overflow-hidden rounded-xl border border-[color-mix(in_oklab,var(--border)_80%,transparent)] bg-[color-mix(in_oklab,var(--panel-2)_88%,transparent)]"
              onKeyDown={(e) => {
                if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
                e.preventDefault();
                props.onModeChange(props.mode === 'observe' ? 'control' : 'observe');
              }}
            >
              <ModeButton
                value="observe"
                active={props.mode === 'observe'}
                onSelect={() => props.onModeChange('observe')}
              >
                Observe
              </ModeButton>
              <ModeButton
                value="control"
                active={props.mode === 'control'}
                onSelect={() => props.onModeChange('control')}
              >
                Control
              </ModeButton>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              disabled={props.startDisabled}
              onClick={props.onStart}
              className={[
                'inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold',
                'transition focus-visible:ring-2 focus-visible:ring-[var(--cyan)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg)]',
                props.startDisabled
                  ? 'cursor-not-allowed bg-[color-mix(in_oklab,var(--panel-2)_85%,transparent)] text-[color-mix(in_oklab,var(--muted)_80%,transparent)]'
                  : 'bg-[color-mix(in_oklab,var(--cyan)_18%,transparent)] text-[var(--text)] hover:bg-[color-mix(in_oklab,var(--cyan)_26%,transparent)]',
              ].join(' ')}
            >
              <IconPlay className="h-4 w-4" />
              Start
            </button>

            <button
              type="button"
              disabled={props.pauseDisabled}
              onClick={props.onPause}
              className={[
                'inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold',
                'transition focus-visible:ring-2 focus-visible:ring-[var(--cyan)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg)]',
                props.pauseDisabled
                  ? 'cursor-not-allowed bg-[color-mix(in_oklab,var(--panel-2)_85%,transparent)] text-[color-mix(in_oklab,var(--muted)_80%,transparent)]'
                  : 'bg-[color-mix(in_oklab,var(--panel-2)_80%,transparent)] text-[var(--text)] hover:bg-[color-mix(in_oklab,var(--panel-2)_92%,transparent)]',
              ].join(' ')}
            >
              <IconPause className="h-4 w-4" />
              Pause
            </button>

            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={props.killDisabled || killArmed}
                onClick={props.onArmKill}
                className={[
                  'inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold',
                  'transition focus-visible:ring-2 focus-visible:ring-[var(--red)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg)]',
                  props.killDisabled || killArmed
                    ? 'cursor-not-allowed bg-[color-mix(in_oklab,var(--panel-2)_85%,transparent)] text-[color-mix(in_oklab,var(--muted)_80%,transparent)]'
                    : 'bg-[color-mix(in_oklab,var(--red)_14%,transparent)] text-[color-mix(in_oklab,var(--red)_90%,white)] hover:bg-[color-mix(in_oklab,var(--red)_22%,transparent)]',
                ].join(' ')}
              >
                Arm Kill
              </button>

              <button
                type="button"
                disabled={props.killDisabled || !killArmed}
                onClick={props.onConfirmKill}
                className={[
                  'inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold',
                  'transition focus-visible:ring-2 focus-visible:ring-[var(--red)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg)]',
                  props.killDisabled || !killArmed
                    ? 'cursor-not-allowed bg-[color-mix(in_oklab,var(--panel-2)_85%,transparent)] text-[color-mix(in_oklab,var(--muted)_80%,transparent)]'
                    : 'animate-[killGlow_1.05s_ease-in-out_infinite] bg-[color-mix(in_oklab,var(--red)_22%,transparent)] text-[color-mix(in_oklab,var(--red)_95%,white)] hover:bg-[color-mix(in_oklab,var(--red)_30%,transparent)]',
                ].join(' ')}
                aria-live="polite"
              >
                KILL
              </button>
            </div>

            <button
              type="button"
              disabled={props.openPrDisabled}
              onClick={props.onOpenPr}
              className={[
                'inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold',
                'transition focus-visible:ring-2 focus-visible:ring-[var(--cyan)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg)]',
                props.openPrDisabled
                  ? 'cursor-not-allowed bg-[color-mix(in_oklab,var(--panel-2)_85%,transparent)] text-[color-mix(in_oklab,var(--muted)_80%,transparent)]'
                  : 'bg-[color-mix(in_oklab,var(--panel-2)_80%,transparent)] text-[var(--text)] hover:bg-[color-mix(in_oklab,var(--panel-2)_92%,transparent)]',
              ].join(' ')}
            >
              Open PR
              <IconExternal className="h-4 w-4 text-[var(--muted)]" />
            </button>

            <button
              type="button"
              disabled={props.openRunDisabled}
              onClick={props.onOpenRun}
              className={[
                'inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold',
                'transition focus-visible:ring-2 focus-visible:ring-[var(--cyan)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg)]',
                props.openRunDisabled
                  ? 'cursor-not-allowed bg-[color-mix(in_oklab,var(--panel-2)_85%,transparent)] text-[color-mix(in_oklab,var(--muted)_80%,transparent)]'
                  : 'bg-[color-mix(in_oklab,var(--panel-2)_80%,transparent)] text-[var(--text)] hover:bg-[color-mix(in_oklab,var(--panel-2)_92%,transparent)]',
              ].join(' ')}
            >
              Open Run
              <IconExternal className="h-4 w-4 text-[var(--muted)]" />
            </button>
          </div>
        </div>

        {killArmed ? (
          <div className="text-xs text-[color-mix(in_oklab,var(--red)_92%,white)]">
            Kill armed until <span className="font-[var(--font-mono)]">{props.killArmedUntil}</span>
          </div>
        ) : null}
      </div>
    </header>
  );
}
