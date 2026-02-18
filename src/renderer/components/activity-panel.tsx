import {
  Bot,
  ChevronDown,
  CircleCheck,
  GitPullRequest,
  MessageSquare,
  Play,
  RefreshCw,
  Rocket,
  Server,
  ShieldCheck,
  Ticket,
  Wifi,
  WifiOff,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import React from 'react';
import { Virtuoso, type VirtuosoHandle } from 'react-virtuoso';

import type { EventSeverity, EventUI, GateId } from '../models/ui';
import { LogConsole } from './log-console';

/* ── Types ──────────────────────────────────────────────────── */

type ActivityColor = 'info' | 'success' | 'warning' | 'error';

interface ParsedActivity {
  icon: LucideIcon;
  title: string;
  detail: string | null;
  color: ActivityColor;
}

type TabId = 'activity' | 'diagnostics';

/* ── Gate Metadata ──────────────────────────────────────────── */

const GATE_ICONS: Record<GateId, LucideIcon> = {
  local: Ticket,
  ci: Bot,
  review: GitPullRequest,
  deploy: Rocket,
  verify: ShieldCheck,
};

const GATE_LABELS: Record<GateId, string> = {
  local: 'Jira',
  ci: 'Agent',
  review: 'Actions',
  deploy: 'Deploy',
  verify: 'Verify',
};

/* ── Parse EventUI → Activity Card Data ─────────────────────── */

const GATE_RE = /^gate (\w+): (\w+)(?:\s*—\s*(.+))?$/;
const PROCESS_RE = /^process (\w+): (\w+)(?:\s*\((.+)\))?$/;
const LOOP_RE = /^Loop started: (.+)$/;
const DISCONNECT_RE = /^Monitor disconnected(?::\s*(.+))?$/;

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function severityToColor(sev: EventSeverity): ActivityColor {
  return sev;
}

export function parseActivity(event: EventUI): ParsedActivity {
  const msg = event.message;

  // Gate events: "gate local: running — All checks pass"
  const gateMatch = GATE_RE.exec(msg);
  if (gateMatch) {
    const gateId = gateMatch[1] as GateId;
    const status = gateMatch[2] ?? '';
    const detail = gateMatch[3] ?? null;
    const label = GATE_LABELS[gateId] ?? gateId;
    const Icon = GATE_ICONS[gateId] ?? MessageSquare;
    return {
      icon: Icon,
      title: `${label} gate ${status}`,
      detail,
      color: severityToColor(event.severity),
    };
  }

  // Monitor connected
  if (msg === 'Monitor connected') {
    return { icon: Wifi, title: 'Backend Connected', detail: null, color: 'success' };
  }

  // Monitor disconnected
  const disconnectMatch = DISCONNECT_RE.exec(msg);
  if (disconnectMatch) {
    const rawDetail = disconnectMatch[1] ?? null;
    const detail = rawDetail?.replace(/\bwebsockkt\b/gi, 'websocket') ?? null;
    return {
      icon: WifiOff,
      title: 'Backend Disconnected',
      detail,
      color: 'error',
    };
  }

  // Process events: "process agent: running (error msg)"
  const processMatch = PROCESS_RE.exec(msg);
  if (processMatch) {
    const procId = processMatch[1] ?? '';
    const state = processMatch[2] ?? '';
    const errorDetail = processMatch[3] ?? null;
    return {
      icon: Server,
      title: `${capitalize(procId)} Process \u00b7 ${capitalize(state)}`,
      detail: errorDetail,
      color: severityToColor(event.severity),
    };
  }

  // Task started
  if (msg === 'Task started') {
    return { icon: Play, title: 'Task Started', detail: null, color: 'success' };
  }

  // Task completed
  if (msg === 'Task completed') {
    return { icon: CircleCheck, title: 'Task Completed', detail: null, color: 'success' };
  }

  // Loop started: "Loop started: SEJFA-42: Add user auth"
  const loopMatch = LOOP_RE.exec(msg);
  if (loopMatch) {
    return {
      icon: RefreshCw,
      title: 'Loop Started',
      detail: loopMatch[1] ?? null,
      color: 'info',
    };
  }

  // Fallback: show message as-is
  return {
    icon: MessageSquare,
    title: msg,
    detail: null,
    color: severityToColor(event.severity),
  };
}

/* ── Color Utilities ────────────────────────────────────────── */

function borderColorClass(color: ActivityColor): string {
  switch (color) {
    case 'error':
      return 'border-l-danger';
    case 'success':
      return 'border-l-success';
    case 'warning':
      return 'border-l-warning';
    default:
      return 'border-l-primary';
  }
}

function iconBgClass(color: ActivityColor): string {
  switch (color) {
    case 'error':
      return 'bg-danger/10 text-danger';
    case 'success':
      return 'bg-success/10 text-success';
    case 'warning':
      return 'bg-warning/10 text-warning';
    default:
      return 'bg-primary/10 text-primary';
  }
}

function cardBgClass(color: ActivityColor): string {
  switch (color) {
    case 'error':
      return 'bg-danger/10 ring-1 ring-danger/30';
    case 'warning':
      return 'bg-warning/5';
    default:
      return 'bg-bg-panel/30';
  }
}

/* ── ActivityCard ───────────────────────────────────────────── */

function fmtTime(iso: string): string {
  if (iso.length >= 19 && iso[10] === 'T') {
    return iso.substring(11, 19);
  }
  try {
    const d = new Date(iso);
    const h = d.getHours().toString().padStart(2, '0');
    const m = d.getMinutes().toString().padStart(2, '0');
    const s = d.getSeconds().toString().padStart(2, '0');
    return `${h}:${m}:${s}`;
  } catch {
    return iso;
  }
}

const ActivityCard = React.memo(function ActivityCard({
  event,
  isNew,
}: { event: EventUI; isNew: boolean }) {
  const { icon: Icon, title, detail, color } = parseActivity(event);

  const isError = color === 'error';

  return (
    <div
      className={`flex items-start gap-3 mx-3 my-1.5 rounded-lg border px-3 py-2.5 border-l-4 ${borderColorClass(color)} ${cardBgClass(color)} ${isError ? 'border-danger/30' : 'border-border-subtle/30'}`}
      style={
        isNew && isError
          ? {
              animation: 'activity-card-enter 0.25s ease-out both',
              boxShadow: '0 0 16px rgb(239 68 68 / 0.12)',
            }
          : isNew
            ? { animation: 'activity-card-enter 0.25s ease-out both' }
            : undefined
      }
    >
      {/* Icon */}
      <div
        className={`flex shrink-0 items-center justify-center rounded-full h-7 w-7 ${iconBgClass(color)}`}
      >
        <Icon className="h-4 w-4" />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <p
          className={`font-heading leading-tight ${isError ? 'text-sm font-bold text-danger' : 'text-sm font-medium text-text-primary'}`}
        >
          {title}
        </p>
        {detail && (
          <p
            className={`text-xs mt-0.5 truncate ${isError ? 'text-danger/80' : 'text-text-muted'}`}
          >
            {detail}
          </p>
        )}
      </div>

      {/* Timestamp */}
      <span className="shrink-0 font-mono text-[11px] text-text-muted/50 pt-0.5">
        {fmtTime(event.at)}
      </span>
    </div>
  );
});

/* ── ActivityFeed ───────────────────────────────────────────── */

function ActivityFeed({ events }: { events: EventUI[] }) {
  const virtuosoRef = React.useRef<VirtuosoHandle>(null);
  const seenIds = React.useRef(new Set<string>());

  // Track which event IDs existed before this render so only new ones animate
  const newIds = React.useMemo(() => {
    const fresh = new Set<string>();
    for (const e of events) {
      if (!seenIds.current.has(e.id)) fresh.add(e.id);
    }
    // Mark all current events as seen after computing the diff
    for (const e of events) seenIds.current.add(e.id);
    return fresh;
  }, [events]);

  if (events.length === 0) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 text-text-muted/50">
        <div
          className="h-2 w-2 rounded-full bg-primary/40"
          style={{ animation: 'breathe 3s ease-in-out infinite' }}
        />
        <span className="text-sm font-medium font-heading">Monitoring pipeline&hellip;</span>
      </div>
    );
  }

  return (
    <Virtuoso
      ref={virtuosoRef}
      data={events}
      followOutput="auto"
      itemContent={(_index, event) => <ActivityCard event={event} isNew={newIds.has(event.id)} />}
      className="scrollbar-thin scrollbar-track-transparent scrollbar-thumb-primary/20 hover:scrollbar-thumb-primary/40"
    />
  );
}

/* ── ActivityPanel (exported) ───────────────────────────────── */

export function ActivityPanel({
  events,
  onCollapse,
}: { events: EventUI[]; onCollapse?: () => void }) {
  const [activeTab, setActiveTab] = React.useState<TabId>('activity');

  return (
    <section className="flex h-full w-full flex-col overflow-hidden bg-bg-deep/50">
      {/* Tab Header */}
      <div className="relative flex shrink-0 items-center justify-between border-b border-border-subtle bg-bg-panel px-4 py-0">
        <div className="flex items-center gap-0">
          {(['activity', 'diagnostics'] as const).map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setActiveTab(tab)}
              className={`relative px-4 py-2.5 text-[11px] font-bold uppercase tracking-wider transition-all duration-200 ${
                activeTab === tab
                  ? 'text-primary'
                  : 'text-text-muted hover:text-text-primary hover:bg-white/5'
              }`}
            >
              {tab === 'activity' ? 'Activity' : 'Diagnostics'}
              {activeTab === tab && (
                <span className="absolute bottom-0 left-2 right-2 h-0.5 rounded-full bg-primary transition-opacity duration-200" />
              )}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <span className="text-[11px] font-medium text-text-secondary tabular-nums">
            {events.length} events
          </span>
          {onCollapse && (
            <button
              type="button"
              onClick={onCollapse}
              className="flex items-center gap-1 rounded px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-text-muted hover:bg-white/5 hover:text-text-primary transition-colors"
              aria-label="Collapse console"
            >
              <ChevronDown className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        <div className="absolute bottom-0 left-0 right-0 h-px bg-linear-to-r from-primary via-secondary to-transparent" />
      </div>

      {/* Tab Content */}
      <div className="relative min-h-0 flex-1">
        {activeTab === 'activity' ? (
          <ActivityFeed events={events} />
        ) : (
          <LogConsole events={events} />
        )}
      </div>
    </section>
  );
}
