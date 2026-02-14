import React from 'react';
import { Virtuoso, type VirtuosoHandle } from 'react-virtuoso';

import type { EventNode, EventSeverity, EventUI, GateId } from '../models/ui';

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
      return 'text-[var(--neon-red)] drop-shadow-[0_0_8px_rgba(255,0,60,0.6)]';
    case 'success':
      return 'text-[var(--neon-green)] drop-shadow-[0_0_8px_rgba(0,255,65,0.6)]';
    case 'warning':
      return 'text-[var(--neon-amber)]';
    default:
      return 'text-[var(--text-secondary)] opacity-80';
  }
}

const LogRow = React.memo(function LogRow({ event, index }: { event: EventUI; index: number }) {
  const isSystem = event.node === 'system';

  return (
    <div
      className={[
        'flex items-start gap-3 py-0.5 px-2 font-mono text-[13px] leading-tight hover:bg-[rgba(255,255,255,0.03)] transition-colors',
        'border-l-2 border-transparent hover:border-[var(--neon-cyan)]',
      ].join(' ')}
    >
      <span className="w-24 shrink-0 text-[11px] text-[var(--text-label)] opacity-50 select-none font-light">
        {fmtTime(event.at)}
      </span>

      <span
        className={[
          'w-20 shrink-0 text-[11px] font-bold uppercase tracking-wider text-right select-none',
          isSystem ? 'text-[var(--neon-blue)]' : 'text-[var(--neon-cyan)]',
        ].join(' ')}
      >
        {event.node}
      </span>

      <div
        className={[
          'flex-1 break-words whitespace-pre-wrap font-medium',
          getLogColor(event.severity),
        ].join(' ')}
      >
        {!isSystem && (
          <span className="mr-2 text-[var(--text-secondary)] opacity-40 select-none pointer-events-none">
            &gt;
          </span>
        )}
        {event.message}
      </div>
    </div>
  );
});

export function LogConsole(props: { events: EventUI[] }) {
  const virtuosoRef = React.useRef<VirtuosoHandle>(null);
  const [autoScroll, setAutoScroll] = React.useState(true);

  // Filter state
  const [nodeFilter, setNodeFilter] = React.useState<GateId | 'all'>('all');
  const [sevFilters, setSevFilters] = React.useState<Set<EventSeverity>>(
    () => new Set<EventSeverity>(['info', 'success', 'warning', 'error']),
  );

  const allNodes = React.useMemo(() => {
    const s = new Set<EventNode>();
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
    <section className="glass-panel flex h-full min-h-0 flex-col rounded-xl overflow-hidden shadow-[0_0_20px_rgba(0,0,0,0.5)] border border-[rgba(0,255,65,0.1)] relative">
      {/* Header / Controls */}
      <div className="flex shrink-0 items-center justify-between border-b border-[rgba(0,255,65,0.1)] bg-[rgba(5,10,15,0.95)] px-3 py-2 z-10">
        <div className="flex items-center gap-4">
          <h2 className="text-[11px] font-bold uppercase tracking-[0.15em] text-[var(--neon-green)] drop-shadow-[0_0_5px_rgba(0,255,65,0.5)] flex items-center gap-2">
            <span className="inline-block w-2 h-2 bg-[var(--neon-green)] animate-pulse rounded-full shadow-[0_0_8px_var(--neon-green)]" />
            CONSOLE_OUTPUT
          </h2>

          <div className="h-4 w-px bg-[var(--border-subtle)] mx-2" />

          <div className="flex items-center gap-1">
            {(['info', 'success', 'warning', 'error'] as const).map((sev) => {
              const active = sevFilters.has(sev);
              let colorClass =
                'text-[var(--text-secondary)] border-transparent bg-transparent opacity-50';
              if (active) {
                if (sev === 'error')
                  colorClass =
                    'text-[var(--neon-red)] border-[var(--neon-red)] bg-[rgba(255,0,60,0.1)] opacity-100 shadow-[0_0_8px_rgba(255,0,60,0.2)]';
                else if (sev === 'success')
                  colorClass =
                    'text-[var(--neon-green)] border-[var(--neon-green)] bg-[rgba(0,255,65,0.1)] opacity-100 shadow-[0_0_8px_rgba(0,255,65,0.2)]';
                else if (sev === 'warning')
                  colorClass =
                    'text-[var(--neon-amber)] border-[var(--neon-amber)] bg-[rgba(255,184,0,0.1)] opacity-100 shadow-[0_0_8px_rgba(255,184,0,0.2)]';
                else
                  colorClass =
                    'text-[var(--neon-cyan)] border-[var(--neon-cyan)] bg-[rgba(34,211,238,0.1)] opacity-100 shadow-[0_0_8px_rgba(34,211,238,0.2)]';
              }

              return (
                <button
                  key={sev}
                  type="button"
                  onClick={() => toggleSeverity(sev)}
                  className={`h-5 px-2 rounded-sm border text-[9px] font-bold uppercase tracking-wider transition-all hover:opacity-100 ${colorClass}`}
                  title={`Toggle ${sev}`}
                >
                  {sev}
                </button>
              );
            })}
          </div>

          <div className="h-4 w-px bg-[var(--border-subtle)] mx-2" />

          <select
            value={nodeFilter}
            onChange={(e) => setNodeFilter(e.target.value as GateId | 'all')}
            className="h-5 rounded bg-[rgba(0,0,0,0.3)] px-2 text-[10px] text-[var(--neon-cyan)] border border-[rgba(34,211,238,0.3)] outline-none focus:border-[var(--neon-cyan)] uppercase font-mono cursor-pointer hover:bg-[rgba(34,211,238,0.1)] transition-colors"
          >
            <option value="all">ALL NODES</option>
            {allNodes
              .filter((n) => n !== 'system')
              .map((n) => (
                <option key={n} value={n}>
                  {n.toUpperCase()}
                </option>
              ))}
            {allNodes.includes('system') && <option value="system">SYSTEM</option>}
          </select>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setAutoScroll(!autoScroll)}
            className={[
              'flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider transition-all px-2 py-1 rounded border',
              autoScroll
                ? 'text-[var(--neon-green)] border-[var(--neon-green)] bg-[rgba(0,255,65,0.1)] shadow-[0_0_10px_rgba(0,255,65,0.2)]'
                : 'text-[var(--text-secondary)] border-[var(--border-subtle)] hover:text-[var(--text-primary)]',
            ].join(' ')}
          >
            <span
              className={`inline-block w-1.5 h-1.5 rounded-full ${autoScroll ? 'bg-[var(--neon-green)] animate-pulse' : 'bg-[var(--text-secondary)]'}`}
            />
            {autoScroll ? 'LIVE TAIL' : 'PAUSED'}
          </button>

          <div className="text-[10px] font-mono text-[var(--text-secondary)] opacity-70 bg-[rgba(255,255,255,0.05)] px-2 py-0.5 rounded">
            {filteredEvents.length} LINES
          </div>
        </div>
      </div>

      {/* Log Area */}
      <div className="scanlines-heavy relative min-h-0 flex-1 bg-[rgba(5,8,12,0.95)]">
        <Virtuoso
          ref={virtuosoRef}
          data={filteredEvents}
          followOutput={autoScroll ? 'auto' : false}
          itemContent={(index, event) => <LogRow index={index} event={event} />}
          className="scrollbar-thin scrollbar-track-transparent scrollbar-thumb-[var(--neon-green)]/20 hover:scrollbar-thumb-[var(--neon-green)]/40"
        />
      </div>
    </section>
  );
}
