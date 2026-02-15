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
        'rounded-full px-3 py-1.5 font-[var(--font-heading)] text-[11px] font-semibold tracking-wide outline-none transition-colors duration-200',
        'focus-visible:ring-2 focus-visible:ring-[var(--neon-cyan)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg-deep)]',
        props.active
          ? 'bg-[rgba(34,211,238,0.10)] text-[var(--text-primary)] shadow-[0_0_0_1px_rgba(34,211,238,0.25)_inset]'
          : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]',
      ].join(' ')}
    >
      {props.children}
    </button>
  );
}

export function Toolbar(props: ToolbarProps) {
  const killArmed = Boolean(props.killArmedUntil);

  return (
    <header className="glass-panel rounded-xl px-5 py-4 shadow-[0_0_20px_rgba(0,0,0,0.4)] border border-[rgba(255,255,255,0.05)]">
      <div className="flex flex-col gap-3">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="hud-label">Objective</div>
            <div className="mt-1 truncate font-[var(--font-heading)] text-lg font-semibold text-[var(--text-primary)]">
              {props.objectiveText}
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-3">
            <div className="flex items-center gap-2 rounded-full border border-[var(--border-subtle)] bg-[rgba(10,18,36,0.35)] px-3 py-1.5">
              <IconDot
                className={[
                  'h-3 w-3',
                  props.connected
                    ? 'text-[var(--neon-green)]'
                    : 'animate-[dot-pulse_2s_ease-in-out_infinite] text-[var(--neon-red)]',
                ].join(' ')}
                title={props.connected ? 'Connected' : 'Disconnected'}
              />
              <div
                className={['hud-meta', props.connected ? '' : 'text-[var(--neon-red)]'].join(' ')}
              >
                {props.connected ? 'Connected' : 'Disconnected'}
              </div>
            </div>

            <div className="flex items-center gap-2 rounded-full border border-[var(--border-subtle)] bg-[rgba(10,18,36,0.35)] px-3 py-1.5">
              <div className="hud-label">Alerts</div>
              <div className="rounded-full bg-[rgba(255,184,0,0.14)] px-2 py-0.5 font-[var(--font-mono)] text-[11px] font-semibold text-[var(--neon-amber)] shadow-[var(--glow-amber)]">
                {props.alertsCount}
              </div>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-2">
            <div className="hud-label">Mode</div>
            <div
              aria-label="App mode"
              className="inline-flex items-center gap-1 rounded-full border border-[var(--border-subtle)] bg-[rgba(10,18,36,0.35)] p-1"
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
                'inline-flex items-center gap-2 rounded-xl border border-[var(--border-subtle)] px-3 py-2 font-[var(--font-heading)] text-sm font-semibold',
                'border-l-2 border-l-transparent bg-transparent transition-colors duration-200',
                'focus-visible:ring-2 focus-visible:ring-[var(--neon-cyan)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg-deep)]',
                props.startDisabled
                  ? 'cursor-not-allowed opacity-40'
                  : 'text-[var(--text-secondary)] hover:border-l-[var(--neon-green)] hover:bg-[var(--bg-panel-hover)] hover:text-[var(--text-primary)] hover:shadow-[var(--glow-green)]',
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
                'inline-flex items-center gap-2 rounded-xl border border-[var(--border-subtle)] px-3 py-2 font-[var(--font-heading)] text-sm font-semibold',
                'border-l-2 border-l-transparent bg-transparent transition-colors duration-200',
                'focus-visible:ring-2 focus-visible:ring-[var(--neon-cyan)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg-deep)]',
                props.pauseDisabled
                  ? 'cursor-not-allowed opacity-40'
                  : 'text-[var(--text-secondary)] hover:border-l-[var(--neon-amber)] hover:bg-[var(--bg-panel-hover)] hover:text-[var(--text-primary)] hover:shadow-[var(--glow-amber)]',
              ].join(' ')}
            >
              <IconPause className="h-4 w-4" />
              Pause
            </button>

            <div className={['kill-zone', killArmed ? 'kill-zone--armed' : ''].join(' ')}>
              <button
                type="button"
                disabled={props.killDisabled || killArmed}
                onClick={props.onArmKill}
                className={[
                  'inline-flex items-center gap-2 rounded-xl border border-[var(--border-subtle)] px-3 py-2 font-[var(--font-heading)] text-sm font-semibold',
                  'bg-transparent transition-colors duration-200',
                  'focus-visible:ring-2 focus-visible:ring-[var(--neon-red)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg-deep)]',
                  props.killDisabled || killArmed
                    ? 'cursor-not-allowed opacity-40'
                    : 'text-[var(--text-secondary)] hover:bg-[var(--bg-panel-hover)] hover:text-[var(--text-primary)]',
                  killArmed ? 'pointer-events-none opacity-0' : '',
                ].join(' ')}
              >
                Arm Kill
              </button>

              <button
                type="button"
                disabled={props.killDisabled || !killArmed}
                onClick={props.onConfirmKill}
                className={[
                  'inline-flex items-center gap-2 rounded-xl border px-4 py-2 font-[var(--font-heading)] text-sm font-bold uppercase tracking-widest',
                  'transition-colors duration-200',
                  'focus-visible:ring-2 focus-visible:ring-[var(--neon-red)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg-deep)]',
                  props.killDisabled || !killArmed
                    ? 'cursor-not-allowed border-[rgba(255,45,85,0.25)] bg-[rgba(10,18,36,0.55)] text-[rgba(255,45,85,0.75)]'
                    : 'border-2 border-[var(--neon-red)] bg-[rgba(255,45,85,0.16)] text-[var(--neon-red)] shadow-[var(--glow-red)] hover:bg-[rgba(255,45,85,0.22)] animate-[kill-armed_1.35s_ease-in-out_infinite]',
                  killArmed ? 'animate-[event-enter_160ms_ease-out]' : '',
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
                'inline-flex items-center gap-2 rounded-xl border border-[var(--border-subtle)] px-3 py-2 font-[var(--font-heading)] text-sm font-semibold',
                'bg-transparent transition-colors duration-200',
                'focus-visible:ring-2 focus-visible:ring-[var(--neon-cyan)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg-deep)]',
                props.openPrDisabled
                  ? 'cursor-not-allowed opacity-40'
                  : 'text-[var(--text-secondary)] hover:bg-[var(--bg-panel-hover)] hover:text-[var(--text-primary)]',
              ].join(' ')}
            >
              Open PR
              <IconExternal className="h-4 w-4 text-[var(--text-secondary)]" />
            </button>

            <button
              type="button"
              disabled={props.openRunDisabled}
              onClick={props.onOpenRun}
              className={[
                'inline-flex items-center gap-2 rounded-xl border border-[var(--border-subtle)] px-3 py-2 font-[var(--font-heading)] text-sm font-semibold',
                'bg-transparent transition-colors duration-200',
                'focus-visible:ring-2 focus-visible:ring-[var(--neon-cyan)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg-deep)]',
                props.openRunDisabled
                  ? 'cursor-not-allowed opacity-40'
                  : 'text-[var(--text-secondary)] hover:bg-[var(--bg-panel-hover)] hover:text-[var(--text-primary)]',
              ].join(' ')}
            >
              Open Run
              <IconExternal className="h-4 w-4 text-[var(--text-secondary)]" />
            </button>
          </div>
        </div>

        {killArmed ? (
          <div className="font-[var(--font-mono)] text-[11px] text-[var(--neon-red)]">
            Kill armed until <span className="font-semibold">{props.killArmedUntil}</span>
          </div>
        ) : null}
      </div>
    </header>
  );
}
