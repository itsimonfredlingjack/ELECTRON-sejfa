import { AnimatePresence, motion } from 'framer-motion';
import { Check, Copy, FileText, X } from 'lucide-react';
import React from 'react';

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

export function EvidenceDrawer({ open, gate, onClose }: EvidenceDrawerProps) {
  const [copied, setCopied] = React.useState(false);

  React.useEffect(() => {
    if (open) {
      setCopied(false);
    }
  }, [open]);

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
        <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
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
            initial={{ y: '100%', opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: '100%', opacity: 0 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="relative z-10 flex max-h-[85vh] w-full max-w-4xl flex-col overflow-hidden rounded-t-2xl border border-border-subtle bg-bg-panel shadow-2xl sm:rounded-2xl"
          >
            {/* Header */}
            <div className="relative flex shrink-0 items-center justify-between border-b border-border-subtle px-6 py-4 bg-bg-deep/50">
              <div className="flex items-center gap-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <FileText className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-text-primary font-heading">
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
                  className="flex items-center gap-2 rounded-lg border border-border-subtle px-3 py-1.5 text-xs font-medium text-text-secondary hover:bg-bg-panel-hover hover:text-text-primary transition-colors"
                >
                  {copied ? (
                    <Check className="h-4 w-4 text-success" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                  {copied ? 'Copied' : 'Copy'}
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="flex h-8 w-8 items-center justify-center rounded-full text-text-secondary hover:bg-bg-panel-hover hover:text-text-primary transition-colors"
                >
                  <X className="h-5 w-5" />
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
                      key={i}
                      className={`flex gap-3 px-4 py-0.5 ${i % 2 === 0 ? '' : 'bg-white/2'} hover:bg-white/5 transition-colors`}
                    >
                      <span className="select-none shrink-0 w-8 text-right text-text-muted/50 tabular-nums text-[10px] leading-relaxed">
                        {i + 1}
                      </span>
                      <span className="whitespace-pre-wrap wrap-break-word">
                        {line || '\u00A0'}
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
