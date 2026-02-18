import {
  AlertTriangle,
  ExternalLink,
  Eye,
  Gamepad2,
  Lock,
  Pause,
  Play,
  Power,
  Wifi,
  WifiOff,
} from 'lucide-react';
import React from 'react';

export type ToolbarMode = 'observe' | 'control';

export type ToolbarProps = {
  objectiveText: string;
  mode: ToolbarMode;
  onModeChange: (mode: ToolbarMode) => void;
  alertsCount: number;
  connected: boolean;
  startDisabled: boolean;
  pauseDisabled: boolean;
  killDisabled: boolean;
  openPrDisabled: boolean;
  openRunDisabled: boolean;
  killArmedUntil: string | null;
  onArmKill: () => void;
  onConfirmKill: () => void;
  onStart: () => void;
  onPause: () => void;
  onOpenPr: () => void;
  onOpenRun: () => void;
};

/* ── StatusBar (exported for standalone use) ─────────────────────── */

export type StatusBarProps = Pick<
  ToolbarProps,
  'connected' | 'alertsCount' | 'mode' | 'onModeChange'
>;

export function StatusBar({ connected, alertsCount, mode, onModeChange }: StatusBarProps) {
  return (
    <div className="toolbar-scanline flex items-center justify-between gap-4 px-6 py-2 border-b border-[var(--border-subtle)] bg-[var(--bg-panel)]">
      {/* Connection Badge */}
      <div
        className={`relative flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[11px] font-medium transition-all duration-200 ${
          connected
            ? 'border-success/20 bg-success/5 text-success hover:border-success/30 hover:bg-success/10'
            : 'border-danger/20 bg-danger/5 text-danger hover:border-danger/30 hover:bg-danger/10'
        }`}
        role="status"
        aria-label={connected ? 'Connection: Online' : 'Connection: Offline'}
      >
        {connected && (
          <>
            <span className="absolute inset-0 rounded-full border border-success/40 animate-[signal-wave_2s_ease-out_infinite]" />
            <span
              className="absolute inset-0 rounded-full border border-success/40 animate-[signal-wave_2s_ease-out_infinite]"
              style={{ animationDelay: '0.6s' }}
            />
          </>
        )}
        {connected ? <Wifi className="h-3 w-3" /> : <WifiOff className="h-3 w-3" />}
        <span className="uppercase tracking-wide">{connected ? 'Online' : 'Offline'}</span>
      </div>

      {/* Right Side: Alerts + Mode Switcher */}
      <div className="flex items-center gap-3">
        {alertsCount > 0 && (
          <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-warning/10 border border-warning/20 text-warning text-[11px] font-bold animate-pulse-slow">
            <AlertTriangle className="h-3 w-3" />
            <span>{alertsCount}</span>
          </div>
        )}

        <div className="relative flex items-center p-0.5 rounded-lg bg-bg-deep border border-border-subtle">
          <div
            className="absolute top-0.5 bottom-0.5 rounded-md bg-bg-panel shadow-sm"
            style={{
              width: 'calc(50% - 0.125rem)',
              left: mode === 'observe' ? '0.125rem' : 'calc(50%)',
              transition: 'left 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)',
            }}
          />
          <button
            type="button"
            onClick={() => onModeChange('observe')}
            aria-pressed={mode === 'observe'}
            aria-label="Observe mode — view pipeline without controlling"
            className={`relative flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-semibold transition-all duration-200 bg-transparent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 ${
              mode === 'observe'
                ? 'text-primary'
                : 'text-text-muted hover:text-text-secondary hover:opacity-90'
            }`}
          >
            <Eye className="h-3 w-3" aria-hidden />
            Observe
          </button>
          <button
            type="button"
            onClick={() => onModeChange('control')}
            aria-pressed={mode === 'control'}
            aria-label="Control mode — start, pause, and control pipeline"
            className={`relative flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-semibold transition-all duration-200 bg-transparent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 ${
              mode === 'control'
                ? 'text-primary'
                : 'text-text-muted hover:text-text-secondary hover:opacity-90'
            }`}
          >
            <Gamepad2 className="h-3 w-3" aria-hidden />
            Control
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── ObjectiveBanner ──────────────────────────────────────────────── */

function ObjectiveBanner({
  objectiveText,
  openPrDisabled,
  openRunDisabled,
  onOpenPr,
  onOpenRun,
}: Pick<
  ToolbarProps,
  'objectiveText' | 'openPrDisabled' | 'openRunDisabled' | 'onOpenPr' | 'onOpenRun'
>) {
  const isIdle = objectiveText === 'Idle';

  // Try to extract a Jira key (e.g. "SEJFA-123 — summary")
  const jiraMatch = objectiveText.match(/^([A-Z]+-\d+)\s*[—–-]\s*(.+)$/);
  const jiraKey = jiraMatch?.[1];
  const summary = jiraMatch?.[2] ?? objectiveText;

  return (
    <div className="relative flex items-center justify-between gap-4 px-6 py-3 border-b border-[var(--border-subtle)] bg-[var(--bg-panel)]/40">
      {/* Objective */}
      <div className="flex items-center gap-2 min-w-0 flex-1">
        {jiraKey && (
          <span className="shrink-0 font-mono text-xs bg-primary/10 text-primary px-2 py-0.5 rounded">
            {jiraKey}
          </span>
        )}
        <span
          className={`text-[15px] truncate ${
            isIdle
              ? 'text-text-muted font-medium'
              : 'text-text-primary font-semibold tracking-tight'
          }`}
          title={objectiveText}
        >
          {isIdle ? 'No active objective' : summary}
        </span>
      </div>

      {/* Navigation Links */}
      <div className="flex items-center gap-2 shrink-0">
        <button
          type="button"
          disabled={openPrDisabled}
          onClick={onOpenPr}
          aria-label={openPrDisabled ? 'Open PR (unavailable)' : 'Open pull request'}
          className="btn-interactive flex items-center gap-1.5 rounded-lg border border-border-subtle bg-bg-deep/30 px-2.5 py-1.5 text-[11px] font-semibold text-text-primary/80 hover:bg-bg-panel-hover hover:text-primary hover:border-primary/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:bg-bg-deep/30 disabled:hover:text-text-primary/80"
        >
          Open PR <ExternalLink className="h-3 w-3" aria-hidden />
        </button>
        <button
          type="button"
          disabled={openRunDisabled}
          onClick={onOpenRun}
          aria-label={openRunDisabled ? 'Open run (unavailable)' : 'Open CI run'}
          className="btn-interactive flex items-center gap-1.5 rounded-lg border border-border-subtle bg-bg-deep/30 px-2.5 py-1.5 text-[11px] font-semibold text-text-primary/80 hover:bg-bg-panel-hover hover:text-primary hover:border-primary/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:bg-bg-deep/30 disabled:hover:text-text-primary/80"
        >
          Open Run <ExternalLink className="h-3 w-3" aria-hidden />
        </button>
      </div>

      {!isIdle && (
        <div
          className="absolute bottom-0 left-0 right-0 h-0.5"
          style={{
            background: 'linear-gradient(90deg, var(--primary), var(--secondary), var(--primary))',
            backgroundSize: '200% 100%',
            animation: 'border-flow 3s linear infinite',
          }}
        />
      )}
    </div>
  );
}

/* ── ActionBar (rendered inside loop panel, not toolbar) ──────────── */

export type ActionBarProps = {
  mode: ToolbarMode;
  startDisabled: boolean;
  pauseDisabled: boolean;
  killDisabled: boolean;
  killArmedUntil: string | null;
  onStart: () => void;
  onPause: () => void;
  onArmKill: () => void;
  onConfirmKill: () => void;
};

export function ActionBar({
  mode,
  startDisabled,
  pauseDisabled,
  killDisabled,
  killArmedUntil,
  onStart,
  onPause,
  onArmKill,
  onConfirmKill,
}: ActionBarProps) {
  const killArmed = Boolean(killArmedUntil);
  const isObserve = mode === 'observe';

  return (
    <div
      className={`flex items-center gap-3 px-4 py-2.5 transition-opacity ${
        isObserve ? 'opacity-40 pointer-events-none' : ''
      }`}
    >
      {isObserve && <Lock className="h-3.5 w-3.5 text-text-muted shrink-0" />}

      {/* Start / Pause */}
      <div className="flex items-center gap-2">
        <button
          type="button"
          disabled={startDisabled}
          onClick={onStart}
          aria-label={
            startDisabled
              ? 'Start task (unavailable in Observe mode or while starting)'
              : 'Start task'
          }
          className={`btn-power-ripple btn-interactive flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 ${
            startDisabled
              ? 'border-border-subtle text-text-muted/50 cursor-not-allowed'
              : 'border-success/30 bg-success/5 text-success hover:bg-success/10 hover:border-success/40 hover:shadow-glow-success active:shadow-glow-success'
          }`}
        >
          <Play className="h-3.5 w-3.5 fill-current" />
          Start Task
        </button>
        <button
          type="button"
          disabled={pauseDisabled}
          onClick={onPause}
          aria-label={pauseDisabled ? 'Pause agent (unavailable in Observe mode)' : 'Pause agent'}
          className={`btn-interactive flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 ${
            pauseDisabled
              ? 'border-border-subtle text-text-muted/50 cursor-not-allowed'
              : 'border-warning/30 bg-warning/5 text-warning hover:bg-warning/10 hover:border-warning/40'
          }`}
        >
          <Pause className="h-3.5 w-3.5 fill-current" />
          Pause
        </button>
      </div>

      {/* Spacer + Divider */}
      <div className="flex-1" />
      <div className="h-5 w-px bg-border-subtle" />

      {/* Kill Switch */}
      <div className="relative kill-zone" data-armed={killArmed}>
        {killArmed && (
          <>
            <span
              className="absolute inset-0 rounded-lg border border-danger/40"
              style={{ animation: 'kill-ring-pulse 2s ease-out infinite 0s' }}
            />
            <span
              className="absolute inset-0 rounded-lg border border-danger/40"
              style={{ animation: 'kill-ring-pulse 2s ease-out infinite 0.5s' }}
            />
            <span
              className="absolute inset-0 rounded-lg border border-danger/40"
              style={{ animation: 'kill-ring-pulse 2s ease-out infinite 1s' }}
            />
          </>
        )}
        {!killArmed ? (
          <button
            type="button"
            disabled={killDisabled}
            onClick={onArmKill}
            aria-label={
              killDisabled
                ? 'Arm kill switch (unavailable in Observe mode)'
                : 'Arm kill switch — stops all processes'
            }
            className={`btn-interactive flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-danger/30 ${
              killDisabled
                ? 'border-transparent text-text-muted/30 cursor-not-allowed bg-transparent'
                : 'border-danger/30 text-danger bg-danger/5 hover:bg-danger/10 hover:border-danger/40'
            }`}
          >
            <Power className="h-3.5 w-3.5" />
            ARM KILL
          </button>
        ) : (
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-mono text-danger animate-[breathe_2s_ease-in-out_infinite]">
              ARMED: {killArmedUntil?.split('T')[1]?.split('.')[0] || '...'}
            </span>
            <button
              type="button"
              onClick={onConfirmKill}
              aria-label="Confirm kill — stop all processes immediately"
              className="btn-interactive flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-black tracking-widest border-2 border-danger bg-danger text-white shadow-glow-danger hover:shadow-glow-danger animate-pulse"
            >
              CONFIRM KILL
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

/* ── Toolbar (composed) ───────────────────────────────────────────── */

export function Toolbar(props: ToolbarProps) {
  return (
    <div className="flex flex-col w-full">
      <StatusBar
        connected={props.connected}
        alertsCount={props.alertsCount}
        mode={props.mode}
        onModeChange={props.onModeChange}
      />
      <ObjectiveBanner
        objectiveText={props.objectiveText}
        openPrDisabled={props.openPrDisabled}
        openRunDisabled={props.openRunDisabled}
        onOpenPr={props.onOpenPr}
        onOpenRun={props.onOpenRun}
      />
    </div>
  );
}
