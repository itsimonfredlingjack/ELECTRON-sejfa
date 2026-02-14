import React from 'react';

import type { EventNode, EventSeverity, EventUI, GateId } from '../models/ui';

const ROW_H = 56;
const OVERSCAN = 10;

function fmtTime(iso: string) {
  try {
    return new Date(iso).toLocaleTimeString([], { hour12: false });
  } catch {
    return iso;
  }
}

function severityStyles(sev: EventSeverity) {
  switch (sev) {
    case 'success':
      return 'border-l-[var(--neon-green)]';
    case 'warning':
      return 'border-l-[var(--neon-amber)]';
    case 'error':
      return 'border-l-[var(--neon-red)]';
    default:
      return 'border-l-[var(--neon-cyan)]';
  }
}

function severityAccent(sev: EventSeverity) {
  switch (sev) {
    case 'success':
      return 'text-[var(--neon-green)]';
    case 'warning':
      return 'text-[var(--neon-amber)]';
    case 'error':
      return 'text-[var(--neon-red)]';
    default:
      return 'text-[var(--neon-cyan)]';
  }
}

function filterOnStyles(sev: EventSeverity) {
  switch (sev) {
    case 'success':
      return 'border-l-[var(--neon-green)] text-[var(--neon-green)] bg-[rgba(0,255,65,0.06)]';
    case 'warning':
      return 'border-l-[var(--neon-amber)] text-[var(--neon-amber)] bg-[rgba(255,184,0,0.08)]';
    case 'error':
      return 'border-l-[var(--neon-red)] text-[var(--neon-red)] bg-[rgba(255,45,85,0.08)]';
    default:
      return 'border-l-[var(--neon-cyan)] text-[var(--neon-cyan)] bg-[rgba(34,211,238,0.07)]';
  }
}

function filterDotBg(sev: EventSeverity) {
  switch (sev) {
    case 'success':
      return 'bg-[var(--neon-green)]';
    case 'warning':
      return 'bg-[var(--neon-amber)]';
    case 'error':
      return 'bg-[var(--neon-red)]';
    default:
      return 'bg-[var(--neon-cyan)]';
  }
}

const TimelineRow = React.memo(function TimelineRow(props: {
  event: EventUI;
  animate: boolean;
}) {
  const e = props.event;
  return (
    <div
      className={[
        'flex h-14 items-center gap-3 rounded-xl border border-[var(--border-subtle)] bg-transparent px-3 transition-colors',
        'hover:bg-[rgba(255,255,255,0.02)]',
        'border-l-[3px]',
        severityStyles(e.severity),
        props.animate ? 'animate-[event-enter_160ms_ease-out]' : '',
      ].join(' ')}
    >
      <div className="w-20 shrink-0 font-[var(--font-mono)] text-xs text-[var(--text-secondary)]">
        {fmtTime(e.at)}
      </div>
      <div className="w-20 shrink-0">
        <span
          title={String(e.node)}
          className="rounded-full border border-[var(--border-subtle)] bg-[rgba(0,0,0,0.22)] px-2 py-1 font-[var(--font-mono)] text-[11px] text-[var(--text-secondary)]"
        >
          {e.node}
        </span>
      </div>
      <div
        title={e.message}
        className="min-w-0 flex-1 truncate font-[var(--font-mono)] text-[13px] text-[var(--text-primary)]"
      >
        {e.message}
      </div>
      <div
        title={e.severity.toUpperCase()}
        className={[
          'shrink-0 font-[var(--font-mono)] text-[10px] font-semibold uppercase tracking-widest',
          severityAccent(e.severity),
        ].join(' ')}
      >
        {e.severity}
      </div>
    </div>
  );
});

export type EventTimelineProps = {
  events: EventUI[];
};

export function EventTimeline(props: EventTimelineProps) {
  const scrollerRef = React.useRef<HTMLDivElement | null>(null);
  const listRef = React.useRef<HTMLDivElement | null>(null);
  const resizeRef = React.useRef<ResizeObserver | null>(null);

  const [scrollTop, setScrollTop] = React.useState(0);
  const [viewportH, setViewportH] = React.useState(320);

  const [pinned, setPinned] = React.useState(true);
  const [nodeFilter, setNodeFilter] = React.useState<GateId | 'all'>('all');
  const [sevFilter, setSevFilter] = React.useState<Set<EventSeverity>>(
    () => new Set<EventSeverity>(['info', 'success', 'warning', 'error']),
  );

  const allNodes = React.useMemo(() => {
    const s = new Set<EventNode>();
    for (const e of props.events) s.add(e.node);
    const out = Array.from(s);
    out.sort((a, b) => String(a).localeCompare(String(b)));
    return out;
  }, [props.events]);

  const filtered = React.useMemo(() => {
    return props.events.filter((e) => {
      if (!sevFilter.has(e.severity)) return false;
      if (nodeFilter === 'all') return true;
      return e.node === nodeFilter;
    });
  }, [props.events, nodeFilter, sevFilter]);

  React.useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;

    const onScroll = () => {
      const st = el.scrollTop;
      setScrollTop(st);

      const distanceFromBottom = el.scrollHeight - (el.scrollTop + el.clientHeight);
      if (distanceFromBottom > 72) setPinned(false);
    };

    el.addEventListener('scroll', onScroll, { passive: true });
    return () => el.removeEventListener('scroll', onScroll);
  }, []);

  React.useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;

    if (!resizeRef.current) {
      resizeRef.current = new ResizeObserver(() => {
        setViewportH(el.clientHeight);
      });
    }
    resizeRef.current.observe(el);
    setViewportH(el.clientHeight);
    return () => resizeRef.current?.disconnect();
  }, []);

  // Auto-follow when pinned.
  React.useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;
    if (!pinned) return;
    if (filtered.length === 0) return;
    el.scrollTop = el.scrollHeight;
  }, [pinned, filtered.length]);

  const total = filtered.length;
  const visibleCount = Math.max(1, Math.ceil(viewportH / ROW_H));
  const start = Math.max(0, Math.floor(scrollTop / ROW_H) - OVERSCAN);
  const end = Math.min(total, start + visibleCount + OVERSCAN * 2);

  const padTop = start * ROW_H;
  const padBottom = Math.max(0, (total - end) * ROW_H);

  React.useEffect(() => {
    const list = listRef.current;
    if (!list) return;
    list.style.setProperty('--pad-top', `${padTop}px`);
    list.style.setProperty('--pad-bottom', `${padBottom}px`);
  }, [padTop, padBottom]);

  const toggleSeverity = React.useCallback((sev: EventSeverity) => {
    setSevFilter((prev) => {
      const next = new Set(prev);
      if (next.has(sev)) next.delete(sev);
      else next.add(sev);
      return next;
    });
  }, []);

  return (
    <section className="hud-panel flex min-h-0 flex-col rounded-2xl p-5 shadow-[0_0_0_1px_var(--border-glow)_inset]">
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between gap-3">
          <div className="hud-label">Events</div>

          <button
            type="button"
            aria-pressed={pinned}
            onClick={() => setPinned((v) => !v)}
            className={[
              'rounded-full border border-[var(--border-subtle)] bg-[rgba(10,18,36,0.35)] px-3 py-1.5',
              'font-[var(--font-heading)] text-[11px] font-semibold text-[var(--text-secondary)]',
              'outline-none transition-colors hover:bg-[var(--bg-panel-hover)] hover:text-[var(--text-primary)]',
              'focus-visible:ring-2 focus-visible:ring-[var(--neon-cyan)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg-deep)]',
            ].join(' ')}
          >
            {pinned ? 'Pinned (Following)' : 'Unpinned'}
          </button>
        </div>

        <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap items-center gap-2">
            {(['info', 'success', 'warning', 'error'] as const).map((sev) => {
              const on = sevFilter.has(sev);
              return (
                <button
                  key={sev}
                  type="button"
                  aria-pressed={on}
                  onClick={() => toggleSeverity(sev)}
                  className={[
                    'h-6 rounded-full border border-[var(--border-subtle)] bg-transparent px-3',
                    'border-l-2 border-l-transparent font-[var(--font-heading)] text-[11px] font-semibold outline-none transition-colors',
                    'focus-visible:ring-2 focus-visible:ring-[var(--neon-cyan)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg-deep)]',
                    on
                      ? filterOnStyles(sev)
                      : 'text-[var(--text-secondary)] hover:bg-[rgba(255,255,255,0.02)] hover:text-[var(--text-primary)]',
                  ].join(' ')}
                >
                  <span
                    aria-hidden="true"
                    className={['inline-flex h-1.5 w-1.5 rounded-full', filterDotBg(sev)].join(' ')}
                  />
                  <span className="ml-2">{sev}</span>
                </button>
              );
            })}
          </div>

          <div className="flex items-center gap-2">
            <div className="hud-label">Node</div>
            <select
              value={nodeFilter}
              onChange={(e) => setNodeFilter(e.target.value as GateId | 'all')}
              className="h-8 rounded-xl border border-[var(--border-subtle)] bg-[rgba(10,18,36,0.35)] px-3 font-[var(--font-mono)] text-[12px] text-[var(--text-primary)] outline-none focus-visible:ring-2 focus-visible:ring-[var(--neon-cyan)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg-deep)]"
            >
              <option value="all">all</option>
              {allNodes
                .filter((n) => n !== 'system')
                .map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              {allNodes.includes('system') ? <option value="system">system</option> : null}
            </select>

            <div className="hud-meta ml-2">{filtered.length} items</div>
          </div>
        </div>
      </div>

      <div
        ref={scrollerRef}
        className="mt-4 min-h-0 flex-1 overflow-auto rounded-2xl border border-[var(--border-subtle)] bg-[rgba(0,0,0,0.18)] p-3"
      >
        <div ref={listRef} className="pt-[var(--pad-top)] pb-[var(--pad-bottom)]">
          <div className="flex flex-col gap-2">
            {filtered.slice(start, end).map((e, i) => {
              const absoluteIndex = start + i;
              const animate = pinned && absoluteIndex >= Math.max(0, total - 8);
              return <TimelineRow key={e.id} event={e} animate={animate} />;
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
