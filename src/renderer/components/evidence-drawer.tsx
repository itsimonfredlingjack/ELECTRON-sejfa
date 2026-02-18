import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { Check, Copy, FileText, X } from 'lucide-react';
import React from 'react';

import { useFocusTrap } from '../hooks/use-focus-trap';
import type { GateUI } from '../models/ui';

export type EvidenceDrawerProps = {
  open: boolean;
  gate: GateUI | null;
  onClose: () => void;
};

function fmtTime(iso: string | undefined) {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return iso;
  }
}

/* ── Log-level keyword highlighting ──────────────────────── */

const HIGHLIGHT_RULES: { pattern: RegExp; className: string }[] = [
  { pattern: /\b(ERROR|FATAL|FAIL(?:ED)?|BROKEN)\b/gi, className: 'text-danger font-bold' },
  { pattern: /\b(WARN(?:ING)?|CAUTION)\b/gi, className: 'text-warning' },
  { pattern: /\b(INFO|PASS(?:ED)?|SUCCESS|OK)\b/gi, className: 'text-success' },
  { pattern: /\b(DEBUG|TRACE|VERBOSE)\b/gi, className: 'text-secondary' },
  {
    pattern: /(?:^|\s)((?:\/[\w.-]+)+(?:\.\w+)?(?::\d+(?::\d+)?)?)/g,
    className: 'text-primary/70',
  },
];

function highlightLine(line: string): React.ReactNode {
  if (!line) return '\u00A0';

  type Segment = { start: number; end: number; className: string };
  const segments: Segment[] = [];

  for (const rule of HIGHLIGHT_RULES) {
    // Reset lastIndex for global regexes
    rule.pattern.lastIndex = 0;
    let match = rule.pattern.exec(line);
    while (match !== null) {
      // Use capturing group if present, otherwise full match
      const text = match[1] ?? match[0];
      const offset = match[0].indexOf(text);
      const start = match.index + offset;
      const end = start + text.length;

      // Skip if overlapping with an existing segment
      const overlaps = segments.some((s) => start < s.end && end > s.start);
      if (!overlaps) {
        segments.push({ start, end, className: rule.className });
      }
      match = rule.pattern.exec(line);
    }
  }

  if (segments.length === 0) return line;

  segments.sort((a, b) => a.start - b.start);

  const parts: React.ReactNode[] = [];
  let cursor = 0;

  for (const seg of segments) {
    if (seg.start > cursor) {
      parts.push(line.slice(cursor, seg.start));
    }
    parts.push(
      <span key={seg.start} className={seg.className}>
        {line.slice(seg.start, seg.end)}
      </span>,
    );
    cursor = seg.end;
  }
  if (cursor < line.length) {
    parts.push(line.slice(cursor));
  }

  return parts;
}

export function EvidenceDrawer({ open, gate, onClose }: EvidenceDrawerProps) {
  const [copied, setCopied] = React.useState(false);
  const panelRef = React.useRef<HTMLDivElement>(null);
  const reduceMotion = useReducedMotion() ?? false;

  React.useEffect(() => {
    if (open) {
      setCopied(false);
    }
  }, [open]);

  useFocusTrap(open, panelRef);

  const handleCopy = async () => {
    if (!gate?.evidence) return;
    try {
      await navigator.clipboard.writeText(gate.evidence);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Ignore
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center sm:items-center"
          aria-modal="true"
          role="dialog"
          aria-labelledby="evidence-drawer-title"
        >
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          />

          {/* Drawer Panel */}
          <motion.div
            ref={panelRef}
            initial={reduceMotion ? { opacity: 0 } : { y: '100%', opacity: 0 }}
            animate={reduceMotion ? { opacity: 1 } : { y: 0, opacity: 1 }}
            exit={reduceMotion ? { opacity: 0 } : { y: '100%', opacity: 0 }}
            transition={
              reduceMotion
                ? { duration: 0.15 }
                : { type: 'spring' as const, damping: 25, stiffness: 300 }
            }
            className="relative z-10 flex max-h-[85vh] w-full max-w-4xl flex-col overflow-hidden rounded-t-2xl border border-border-subtle bg-bg-panel shadow-2xl sm:rounded-2xl"
          >
            {/* Header */}
            <div className="relative flex shrink-0 items-center justify-between border-b border-border-subtle px-6 py-4 bg-bg-deep/50">
              <div className="flex items-center gap-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <FileText className="h-5 w-5" />
                </div>
                <div>
                  <h2
                    id="evidence-drawer-title"
                    className="text-lg font-bold text-text-primary font-heading"
                  >
                    {gate?.label} Evidence
                  </h2>
                  <div className="text-xs text-text-secondary font-mono">
                    Last Updated: {fmtTime(gate?.updatedAt)}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleCopy}
                  className="btn-interactive flex items-center gap-2 rounded-lg border border-border-subtle px-3 py-1.5 text-xs font-medium text-text-secondary hover:bg-bg-panel-hover hover:text-text-primary hover:border-border-subtle"
                  aria-label={copied ? 'Copied to clipboard' : 'Copy evidence to clipboard'}
                  aria-pressed={copied}
                >
                  {copied ? (
                    <Check className="h-4 w-4 text-success" aria-hidden />
                  ) : (
                    <Copy className="h-4 w-4" aria-hidden />
                  )}
                  {copied ? 'Copied' : 'Copy'}
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="btn-interactive flex h-8 w-8 items-center justify-center rounded-full text-text-secondary hover:bg-bg-panel-hover hover:text-text-primary"
                  aria-label="Close evidence drawer"
                >
                  <X className="h-5 w-5" aria-hidden />
                </button>
              </div>
              <div className="absolute bottom-0 left-0 right-0 h-px bg-linear-to-r from-primary via-secondary to-transparent" />
            </div>

            {/* Content */}
            <div className="flex-1 overflow-auto bg-bg-deep p-6">
              {gate?.evidence ? (
                <div className="font-mono text-xs leading-relaxed text-text-primary rounded-lg bg-black/20 border border-border-subtle overflow-auto">
                  {gate.evidence.split('\n').map((line, i) => (
                    <div
                      key={`${i}-${line.slice(0, 20)}`}
                      className={`flex gap-3 px-4 py-0.5 ${i % 2 === 0 ? '' : 'bg-white/2'} hover:bg-white/5 transition-colors`}
                    >
                      <span className="select-none shrink-0 w-8 text-right text-text-muted/50 tabular-nums text-[10px] leading-relaxed">
                        {i + 1}
                      </span>
                      <span className="whitespace-pre-wrap wrap-break-word">
                        {highlightLine(line)}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex h-32 flex-col items-center justify-center text-text-muted opacity-50">
                  <FileText className="h-8 w-8 mb-2" />
                  <span className="text-sm">No evidence collected yet</span>
                </div>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
