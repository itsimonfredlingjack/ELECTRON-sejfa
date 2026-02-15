import {
  AlertTriangle,
  ExternalLink,
  Eye,
  Gamepad2,
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

export function Toolbar(props: ToolbarProps) {
  const killArmed = Boolean(props.killArmedUntil);

  return (
    <div className="flex flex-col gap-4 w-full max-w-7xl mx-auto">
      {/* Top Row: Status Bar */}
      <div className="flex items-center justify-between gap-4">
        {/* Connection Status */}
        <div
          className={`flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs font-medium transition-colors ${
            props.connected
              ? 'border-success/20 bg-success/5 text-success'
              : 'border-danger/20 bg-danger/5 text-danger'
          }`}
        >
          {props.connected ? <Wifi className="h-3.5 w-3.5" /> : <WifiOff className="h-3.5 w-3.5" />}
          <span className="uppercase tracking-wide">{props.connected ? 'Online' : 'Offline'}</span>
        </div>

        {/* Objective - Center Stage */}
        <div className="flex-1 text-center">
          <h1
            className="text-lg font-bold text-text-primary tracking-tight truncate px-4 font-heading"
            title={props.objectiveText}
          >
            {props.objectiveText || 'No Active Objective'}
          </h1>
        </div>

        {/* Right Side: Mode & Alerts */}
        <div className="flex items-center gap-3">
          {/* Alerts Badge */}
          {props.alertsCount > 0 && (
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-warning/10 border border-warning/20 text-warning text-xs font-bold animate-pulse-slow">
              <AlertTriangle className="h-3.5 w-3.5" />
              <span>{props.alertsCount}</span>
            </div>
          )}

          {/* Mode Switcher */}
          <div className="flex items-center p-1 rounded-lg bg-bg-deep border border-border-subtle">
            <button
              type="button"
              onClick={() => props.onModeChange('observe')}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-semibold transition-all ${
                props.mode === 'observe'
                  ? 'bg-bg-panel shadow-sm text-primary'
                  : 'text-text-muted hover:text-text-secondary'
              }`}
            >
              <Eye className="h-3.5 w-3.5" />
              Observe
            </button>
            <button
              type="button"
              onClick={() => props.onModeChange('control')}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-semibold transition-all ${
                props.mode === 'control'
                  ? 'bg-bg-panel shadow-sm text-primary'
                  : 'text-text-muted hover:text-text-secondary'
              }`}
            >
              <Gamepad2 className="h-3.5 w-3.5" />
              Control
            </button>
          </div>
        </div>
      </div>

      {/* Bottom Row: Action Bar */}
      <div className="flex items-center justify-between gap-4 p-2 rounded-xl bg-bg-deep/50 border border-border-subtle/50">
        {/* Primary Controls */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            disabled={props.startDisabled}
            onClick={props.onStart}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold border transition-all ${
              props.startDisabled
                ? 'border-border-subtle text-text-muted/50 cursor-not-allowed'
                : 'border-success/30 bg-success/5 text-success hover:bg-success/10 hover:shadow-glow-success'
            }`}
          >
            <Play className="h-4 w-4 fill-current" />
            Start Agent
          </button>
          <button
            type="button"
            disabled={props.pauseDisabled}
            onClick={props.onPause}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold border transition-all ${
              props.pauseDisabled
                ? 'border-border-subtle text-text-muted/50 cursor-not-allowed'
                : 'border-warning/30 bg-warning/5 text-warning hover:bg-warning/10'
            }`}
          >
            <Pause className="h-4 w-4 fill-current" />
            Pause
          </button>
        </div>

        {/* Navigation Links */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            disabled={props.openPrDisabled}
            onClick={props.onOpenPr}
            className="flex items-center gap-2 px-3 py-2 text-xs font-medium text-text-secondary hover:text-primary transition-colors disabled:opacity-30 disabled:hover:text-text-secondary"
          >
            Open PR <ExternalLink className="h-3 w-3" />
          </button>
          <div className="h-4 w-px bg-border-subtle" />
          <button
            type="button"
            disabled={props.openRunDisabled}
            onClick={props.onOpenRun}
            className="flex items-center gap-2 px-3 py-2 text-xs font-medium text-text-secondary hover:text-primary transition-colors disabled:opacity-30 disabled:hover:text-text-secondary"
          >
            Open Run <ExternalLink className="h-3 w-3" />
          </button>
        </div>

        {/* Kill Switch Area */}
        <div className="relative group">
          {!killArmed ? (
            <button
              type="button"
              disabled={props.killDisabled}
              onClick={props.onArmKill}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold border transition-all ${
                props.killDisabled
                  ? 'border-border-subtle text-text-muted/30 cursor-not-allowed bg-transparent'
                  : 'border-danger/30 text-danger bg-danger/5 hover:bg-danger/10 group-hover:shadow-glow-danger'
              }`}
            >
              <Power className="h-4 w-4" />
              ARM KILL
            </button>
          ) : (
            <div className="flex items-center gap-2 animate-in fade-in zoom-in duration-200">
              <span className="text-[10px] font-mono text-danger animate-pulse mr-2">
                ARMED: {props.killArmedUntil?.split('T')[1]?.split('.')[0] || '...'}
              </span>
              <button
                type="button"
                onClick={props.onConfirmKill}
                className="flex items-center gap-2 px-6 py-2 rounded-lg text-sm font-black tracking-widest border-2 border-danger bg-danger text-white shadow-glow-danger hover:scale-105 transition-transform animate-pulse"
              >
                CONFIRM KILL
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
