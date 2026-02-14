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
      return 'border-l-[var(--green)] text-[color-mix(in_oklab,var(--text)_92%,white)]';
    case 'warning':
      return 'border-l-[var(--amber)] text-[color-mix(in_oklab,var(--text)_92%,white)]';
    case 'error':
      return 'border-l-[var(--red)] text-[color-mix(in_oklab,var(--text)_92%,white)]';
    default:
      return 'border-l-[color-mix(in_oklab,var(--muted)_65%,transparent)] text-[color-mix(in_oklab,var(--text)_88%,white)]';
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
        'flex h-14 items-center gap-3 rounded-xl border border-[color-mix(in_oklab,var(--border)_80%,transparent)] bg-[color-mix(in_oklab,var(--panel-2)_76%,transparent)] px-3',
        'border-l-4',
        severityStyles(e.severity),
        props.animate ? 'animate-[eventIn_160ms_ease-out]' : '',
      ].join(' ')}
    >
      <div className="w-20 shrink-0 font-[var(--font-mono)] text-[11px] text-[var(--muted)]">
        {fmtTime(e.at)}
      </div>
      <div className="w-20 shrink-0">
        <span className="rounded-lg border border-[color-mix(in_oklab,var(--border)_75%,transparent)] bg-[color-mix(in_oklab,var(--panel)_65%,transparent)] px-2 py-1 font-[var(--font-mono)] text-[11px] text-[var(--muted)]">
          {e.node}
        </span>
      </div>
      <div className="min-w-0 flex-1 truncate text-sm">{e.message}</div>
      <div className="shrink-0 font-[var(--font-mono)] text-[11px] text-[var(--muted)]">
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
    <section className="hud-panel flex min-h-0 flex-col rounded-2xl p-5">
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between gap-3">
          <div className="text-xs uppercase tracking-[0.25em] text-[var(--muted)]">Events</div>

          <button
            type="button"
            aria-pressed={pinned}
            onClick={() => setPinned((v) => !v)}
            className={[
              'rounded-xl border px-3 py-1.5 text-xs font-semibold outline-none transition',
              'border-[color-mix(in_oklab,var(--border)_80%,transparent)] bg-[color-mix(in_oklab,var(--panel-2)_80%,transparent)] text-[var(--text)]',
              'hover:bg-[color-mix(in_oklab,var(--panel-2)_92%,transparent)]',
              'focus-visible:ring-2 focus-visible:ring-[var(--cyan)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg)]',
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
                    'rounded-xl border px-3 py-1.5 text-xs font-semibold outline-none transition',
                    'focus-visible:ring-2 focus-visible:ring-[var(--cyan)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg)]',
                    on
                      ? 'border-[color-mix(in_oklab,var(--cyan)_25%,var(--border))] bg-[color-mix(in_oklab,var(--cyan)_10%,transparent)] text-[var(--text)]'
                      : 'border-[color-mix(in_oklab,var(--border)_80%,transparent)] bg-[color-mix(in_oklab,var(--panel-2)_80%,transparent)] text-[var(--muted)] hover:text-[var(--text)]',
                  ].join(' ')}
                >
                  {sev}
                </button>
              );
            })}
          </div>

          <div className="flex items-center gap-2">
            <div className="text-xs uppercase tracking-[0.2em] text-[var(--muted)]">Node</div>
            <select
              value={nodeFilter}
              onChange={(e) => setNodeFilter(e.target.value as GateId | 'all')}
              className="rounded-xl border border-[color-mix(in_oklab,var(--border)_80%,transparent)] bg-[color-mix(in_oklab,var(--panel-2)_80%,transparent)] px-3 py-2 text-sm text-[var(--text)] outline-none focus-visible:ring-2 focus-visible:ring-[var(--cyan)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg)]"
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

            <div className="ml-2 font-[var(--font-mono)] text-[11px] text-[var(--muted)]">
              {filtered.length} items
            </div>
          </div>
        </div>
      </div>

      <div
        ref={scrollerRef}
        className="mt-4 min-h-0 flex-1 overflow-auto rounded-2xl border border-[color-mix(in_oklab,var(--border)_80%,transparent)] bg-[color-mix(in_oklab,var(--panel-2)_72%,transparent)] p-3"
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
