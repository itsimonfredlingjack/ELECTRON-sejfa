import { Wifi, WifiOff } from 'lucide-react';
import React from 'react';

export type MissionHeaderProps = {
  objectiveText: string;
  connected: boolean;
};

export function MissionHeader({ objectiveText, connected }: MissionHeaderProps) {
  const isIdle = objectiveText === 'Idle';

  // Extract Jira key from "SEJFA-123 — summary" format
  const jiraMatch = objectiveText.match(/^([A-Z]+-\d+)\s*[—–-]\s*(.+)$/);
  const ticketId = jiraMatch?.[1] ?? 'IDLE';
  const summary = jiraMatch?.[2] ?? (isIdle ? 'No active objective' : objectiveText);

  return (
    <div className="flex items-center gap-4 px-6 py-3">
      {/* Connection indicator */}
      <div
        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full transition-all duration-300 ${
          connected ? 'bg-success/10 ring-1 ring-success/20' : 'bg-danger/10 ring-1 ring-danger/20'
        }`}
        role="status"
        aria-label={connected ? 'Connected to backend' : 'Disconnected from backend'}
      >
        {connected ? (
          <Wifi className="h-4 w-4 text-success" />
        ) : (
          <WifiOff className="h-4 w-4 text-danger" />
        )}
      </div>

      {/* Ticket badge */}
      <span
        className={`shrink-0 font-mono text-sm font-bold tracking-tight px-2.5 py-0.5 rounded border transition-all duration-300 ${
          connected
            ? 'text-primary bg-primary/10 border-primary/20'
            : 'text-danger bg-danger/10 border-danger/20 text-glitch'
        }`}
        data-text={ticketId}
      >
        {ticketId}
      </span>

      {/* Divider */}
      <div className="h-4 w-px bg-white/10" />

      {/* Objective */}
      <p
        className="flex-1 truncate font-heading text-sm font-medium text-white/70"
        title={objectiveText}
      >
        {summary}
      </p>
    </div>
  );
}
