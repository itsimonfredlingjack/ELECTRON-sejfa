import { Filter, PauseCircle, PlayCircle, Search, Terminal } from 'lucide-react';
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

const LogRow = React.memo(function LogRow({ event }: { event: EventUI }) {
  const isSystem = event.node === 'system';

  return (
    <div className="flex items-start gap-3 py-0.5 px-4 font-mono text-[13px] leading-5 hover:bg-white/5 transition-colors border-l-2 border-transparent hover:border-primary/50">
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
        className={`flex-1 break-words whitespace-pre-wrap font-medium ${getLogColor(event.severity)}`}
      >
        {event.message}
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
      <div className="flex shrink-0 items-center justify-between border-b border-border-subtle bg-bg-panel px-4 py-3">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2 text-sm font-semibold text-text-primary font-heading">
            <Terminal className="h-4 w-4 text-primary" />
            <span>Console</span>
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
                  className={`h-6 px-2.5 rounded text-[10px] font-bold uppercase tracking-wider border border-transparent transition-all ${colorClass}`}
                >
                  {sev}
                </button>
              );
            })}
          </div>

          {/* Node Filter */}
          <div className="relative flex items-center">
            <Filter className="absolute left-2 h-3 w-3 text-text-muted pointer-events-none" />
            <select
              value={nodeFilter}
              onChange={(e) => setNodeFilter(e.target.value)}
              className="h-6 w-32 appearance-none rounded bg-bg-deep pl-7 pr-2 text-[10px] font-bold uppercase text-text-secondary border border-border-subtle focus:border-primary focus:text-primary outline-none cursor-pointer transition-colors"
            >
              <option value="all">All Nodes</option>
              {allNodes.map((n) => (
                <option key={n} value={n}>
                  {n.toUpperCase()}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="text-[10px] font-mono text-text-muted">
            {filteredEvents.length} events
          </div>

          <button
            type="button"
            onClick={() => setAutoScroll(!autoScroll)}
            className={`flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider transition-all px-2.5 py-1 rounded border ${
              autoScroll
                ? 'text-success border-success/30 bg-success/10'
                : 'text-text-muted border-border-subtle hover:text-text-primary'
            }`}
          >
            {autoScroll ? <PlayCircle className="h-3 w-3" /> : <PauseCircle className="h-3 w-3" />}
            {autoScroll ? 'Live' : 'Paused'}
          </button>
        </div>
      </div>

      {/* Log Area */}
      <div className="relative min-h-0 flex-1 bg-bg-deep/80 backdrop-blur-sm">
        <Virtuoso
          ref={virtuosoRef}
          data={filteredEvents}
          followOutput={autoScroll ? 'auto' : false}
          itemContent={(index, event) => <LogRow event={event} />}
          className="scrollbar-thin scrollbar-track-transparent scrollbar-thumb-primary/20 hover:scrollbar-thumb-primary/40"
        />
      </div>
    </section>
  );
}
