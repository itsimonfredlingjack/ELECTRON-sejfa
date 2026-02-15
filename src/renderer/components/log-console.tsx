import { Filter, PauseCircle, Terminal } from 'lucide-react';
import React from 'react';
import { Virtuoso, type VirtuosoHandle } from 'react-virtuoso';

import type { EventNode, EventSeverity, EventUI } from '../models/ui';

function fmtTime(iso: string) {
  try {
    const d = new Date(iso);
    const h = d.getHours().toString().padStart(2, '0');
    const m = d.getMinutes().toString().padStart(2, '0');
    const s = d.getSeconds().toString().padStart(2, '0');
    const ms = d.getMilliseconds().toString().padStart(3, '0');
    return `${h}:${m}:${s}.${ms}`;
  } catch {
    return iso;
  }
}

function getMinute(iso: string) {
  try {
    const d = new Date(iso);
    return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
  } catch {
    return '';
  }
}

function getLogColor(sev: EventSeverity) {
  switch (sev) {
    case 'error':
      return 'text-danger';
    case 'success':
      return 'text-success';
    case 'warning':
      return 'text-warning';
    default:
      return 'text-text-primary';
  }
}

function getSeverityBorder(sev: EventSeverity) {
  switch (sev) {
    case 'error':
      return 'border-l-2 border-danger bg-danger/5';
    case 'warning':
      return 'border-l-2 border-warning bg-warning/[0.03]';
    case 'success':
      return 'border-l-2 border-success/50';
    default:
      return '';
  }
}

type BadgeKind = 'GATE' | 'TASK' | 'CONN' | null;

function inferBadge(event: EventUI): BadgeKind {
  if (
    event.message.toLowerCase().includes('connect') ||
    event.message.toLowerCase().includes('disconnect')
  ) {
    return 'CONN';
  }
  if (event.message.startsWith('Task ')) {
    return 'TASK';
  }
  if (event.node !== 'system') {
    return 'GATE';
  }
  return null;
}

function EventBadge({ kind }: { kind: BadgeKind }) {
  if (!kind) return null;

  const styles: Record<string, string> = {
    GATE: 'bg-primary/10 text-primary',
    TASK: 'bg-success/10 text-success',
    CONN: 'bg-warning/10 text-warning',
  };

  return (
    <span
      className={`text-[10px] font-bold uppercase tracking-wider rounded px-1.5 py-0.5 mr-2 shrink-0 ${styles[kind]}`}
    >
      {kind}
    </span>
  );
}

function TimeSeparator({ time }: { time: string }) {
  return (
    <div className="flex items-center gap-3 py-1.5 px-4">
      <div className="flex-1 h-px bg-border-subtle/30" />
      <span className="text-[10px] font-mono text-text-muted/40 tracking-wider">{time}</span>
      <div className="flex-1 h-px bg-border-subtle/30" />
    </div>
  );
}

const LogRow = React.memo(function LogRow({ event, index }: { event: EventUI; index: number }) {
  const isSystem = event.node === 'system';
  const badge = inferBadge(event);

  return (
    <div
      className={`flex items-start gap-3 py-0.5 px-4 font-mono text-[13px] leading-5 hover:bg-white/5 transition-colors ${getSeverityBorder(event.severity)}`}
    >
      <span className="w-8 shrink-0 text-[10px] text-text-muted/25 select-none text-right tabular-nums">
        {index + 1}
      </span>
      <span className="w-24 shrink-0 text-[11px] text-text-muted select-none font-light">
        {fmtTime(event.at)}
      </span>

      <span
        className={`w-24 shrink-0 text-[11px] font-bold uppercase tracking-wider text-right select-none ${
          isSystem ? 'text-text-secondary' : 'text-primary'
        }`}
      >
        {event.node}
      </span>

      <div
        className={`flex-1 flex items-start break-words whitespace-pre-wrap font-medium ${getLogColor(event.severity)}`}
      >
        <EventBadge kind={badge} />
        <span>{event.message}</span>
      </div>
    </div>
  );
});

export function LogConsole(props: { events: EventUI[] }) {
  const virtuosoRef = React.useRef<VirtuosoHandle>(null);
  const [autoScroll, setAutoScroll] = React.useState(true);

  // Filter state
  const [nodeFilter, setNodeFilter] = React.useState<string>('all');
  const [sevFilters, setSevFilters] = React.useState<Set<EventSeverity>>(
    () => new Set<EventSeverity>(['info', 'success', 'warning', 'error']),
  );

  const allNodes = React.useMemo(() => {
    const s = new Set<string>();
    for (const e of props.events) s.add(e.node);
    const out = Array.from(s);
    out.sort((a, b) => String(a).localeCompare(String(b)));
    return out;
  }, [props.events]);

  const filteredEvents = React.useMemo(() => {
    return props.events.filter((e) => {
      if (!sevFilters.has(e.severity)) return false;
      if (nodeFilter !== 'all' && e.node !== nodeFilter) return false;
      return true;
    });
  }, [props.events, nodeFilter, sevFilters]);

  const toggleSeverity = (sev: EventSeverity) => {
    setSevFilters((prev) => {
      const next = new Set(prev);
      if (next.has(sev)) next.delete(sev);
      else next.add(sev);
      return next;
    });
  };

  return (
    <section className="flex h-full w-full flex-col overflow-hidden bg-bg-deep/50">
      {/* Header / Controls */}
      <div className="relative flex shrink-0 flex-wrap items-center justify-between gap-x-4 gap-y-2 border-b border-border-subtle bg-bg-panel px-4 py-3">
        <div className="flex min-w-0 items-center gap-6">
          <div className="flex items-center gap-2 text-sm font-semibold text-text-primary font-heading">
            <Terminal className="h-4 w-4 text-primary" />
            <span className="text-gradient-primary">Console</span>
          </div>

          <div className="h-4 w-px bg-border-subtle" />

          {/* Severity Filters */}
          <div className="flex items-center gap-1">
            {(['info', 'success', 'warning', 'error'] as const).map((sev) => {
              const active = sevFilters.has(sev);
              let colorClass = 'text-text-muted hover:text-text-primary opacity-60';
              if (active) {
                if (sev === 'error')
                  colorClass = 'text-danger bg-danger/10 border-danger/20 opacity-100';
                else if (sev === 'success')
                  colorClass = 'text-success bg-success/10 border-success/20 opacity-100';
                else if (sev === 'warning')
                  colorClass = 'text-warning bg-warning/10 border-warning/20 opacity-100';
                else colorClass = 'text-primary bg-primary/10 border-primary/20 opacity-100';
              }

              return (
                <button
                  key={sev}
                  type="button"
                  onClick={() => toggleSeverity(sev)}
                  className={`h-7 px-2.5 rounded text-[11px] leading-none font-bold uppercase tracking-wider border border-transparent transition-all ${colorClass}`}
                >
                  {sev}
                </button>
              );
            })}
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-end gap-x-3 gap-y-2">
          {/* Node Filter */}
          <div className="relative flex items-center">
            <Filter className="absolute left-2 h-3 w-3 text-text-muted pointer-events-none" />
            <select
              aria-label="Filter nodes"
              value={nodeFilter}
              onChange={(e) => setNodeFilter(e.target.value)}
              className="h-7 w-36 appearance-none rounded bg-bg-deep pl-7 pr-2 text-[11px] leading-none font-bold uppercase text-text-secondary border border-border-subtle focus:border-primary focus:text-primary outline-none cursor-pointer transition-colors"
            >
              <option value="all">All Nodes</option>
              {allNodes.map((n) => (
                <option key={n} value={n}>
                  {n.toUpperCase()}
                </option>
              ))}
            </select>
          </div>

          <div
            data-testid="events-count"
            className="text-[11px] font-medium text-text-secondary whitespace-nowrap tabular-nums"
          >
            {filteredEvents.length} events
          </div>

          <button
            type="button"
            onClick={() => setAutoScroll(!autoScroll)}
            aria-label="Toggle live tail"
            className={`flex items-center gap-1.5 text-[11px] leading-none font-bold uppercase tracking-wider transition-all px-2.5 py-1.5 rounded border whitespace-nowrap ${
              autoScroll
                ? 'text-success border-success/30 bg-success/10'
                : 'text-text-muted border-border-subtle hover:text-text-primary'
            }`}
          >
            {autoScroll ? (
              <span className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-success opacity-75" />
                <span className="relative inline-flex rounded-full h-3 w-3 bg-success" />
              </span>
            ) : (
              <PauseCircle className="h-3 w-3" />
            )}
            {autoScroll ? 'Live' : 'Paused'}
          </button>
        </div>
        <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-primary via-secondary to-transparent" />
      </div>

      {/* Log Area */}
      <div className="relative min-h-0 flex-1 bg-bg-deep/80 backdrop-blur-sm">
        {filteredEvents.length === 0 && props.events.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center text-text-muted/50 gap-3">
            <span className="font-mono text-sm">
              <span className="text-primary/60">$</span> <span>Awaiting pipeline activity</span>
              <span
                className="inline-block w-2 h-4 ml-0.5 bg-primary/60 align-middle"
                style={{ animation: 'type-cursor 1s step-end infinite' }}
              />
            </span>
          </div>
        ) : filteredEvents.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center text-text-muted/50 gap-3">
            <Terminal className="h-10 w-10" />
            <span className="text-sm font-medium">No events to display</span>
            <span className="text-xs">Try adjusting filters</span>
          </div>
        ) : (
          <Virtuoso
            ref={virtuosoRef}
            data={filteredEvents}
            followOutput={autoScroll ? 'auto' : false}
            itemContent={(index, event) => {
              const prevEvent = index > 0 ? filteredEvents[index - 1] : undefined;
              const currentMin = getMinute(event.at);
              const prevMin = prevEvent ? getMinute(prevEvent.at) : currentMin;
              const showSeparator = index > 0 && currentMin !== prevMin;

              return (
                <>
                  {showSeparator && <TimeSeparator time={currentMin} />}
                  <LogRow event={event} index={index} />
                </>
              );
            }}
            className="scrollbar-thin scrollbar-track-transparent scrollbar-thumb-primary/20 hover:scrollbar-thumb-primary/40"
          />
        )}
      </div>
    </section>
  );
}
