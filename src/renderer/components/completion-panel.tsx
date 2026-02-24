import { AnimatePresence, motion } from 'framer-motion';
import { CheckCircle2, ExternalLink, X, XCircle } from 'lucide-react';

import { useElectronApi } from '../hooks/use-electron-api';
import { loopActions, useCompletionInfo } from '../stores/loop-store';

function isLegit(info: { pytest_summary: string | null; ruff_summary: string | null }): boolean {
  const pytestOk = !info.pytest_summary || info.pytest_summary.toLowerCase().includes('passed');
  const ruffOk =
    !info.ruff_summary ||
    info.ruff_summary.toLowerCase().includes('clean') ||
    info.ruff_summary.toLowerCase().includes('0 errors');
  return pytestOk && ruffOk;
}

export function CompletionPanel() {
  const info = useCompletionInfo();
  const api = useElectronApi();

  if (!info) return null;

  const legit = isLegit(info);

  return (
    <AnimatePresence>
      {info && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          transition={{ duration: 0.2 }}
          className="absolute inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm"
        >
          <div className="relative w-full max-w-md rounded-xl border border-border-subtle bg-bg-panel/95 p-6 shadow-2xl backdrop-blur-md">
            {/* Close button */}
            <button
              type="button"
              onClick={() => loopActions.clearCompletion()}
              className="absolute top-3 right-3 rounded p-1 text-text-muted transition-colors hover:bg-white/5 hover:text-text-secondary"
              aria-label="Close completion panel"
            >
              <X className="h-4 w-4" />
            </button>

            {/* Verdict */}
            <div className="mb-4 flex items-center gap-3">
              {legit ? (
                <CheckCircle2 className="h-8 w-8 text-emerald-400" />
              ) : (
                <XCircle className="h-8 w-8 text-amber-400" />
              )}
              <div>
                <h2 className="font-heading text-lg font-semibold text-white">Session Complete</h2>
                <span
                  className={`inline-block rounded px-2 py-0.5 font-mono text-xs font-bold ${
                    legit ? 'bg-emerald-500/15 text-emerald-400' : 'bg-amber-500/15 text-amber-400'
                  }`}
                >
                  {legit ? 'LEGIT' : 'SUSPICIOUS'}
                </span>
              </div>
            </div>

            {/* Details */}
            <div className="flex flex-col gap-3">
              {info.ticket_id && <DetailRow label="Ticket" value={info.ticket_id} />}
              <DetailRow label="Outcome" value={info.outcome} />
              {info.pytest_summary && <DetailRow label="Pytest" value={info.pytest_summary} />}
              {info.ruff_summary && <DetailRow label="Ruff" value={info.ruff_summary} />}
              {info.git_diff_summary && (
                <DetailRow label="Git Diff" value={info.git_diff_summary} />
              )}
              {info.pr_url && (
                <div className="flex items-center justify-between rounded-lg border border-border-subtle bg-black/20 px-3 py-2">
                  <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-text-muted">
                    PR
                  </span>
                  <button
                    type="button"
                    onClick={() => void api.shell.openExternal(info.pr_url ?? '')}
                    className="flex items-center gap-1 text-xs text-primary transition-colors hover:text-primary/80"
                  >
                    {info.pr_url}
                    <ExternalLink className="h-3 w-3" />
                  </button>
                </div>
              )}
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-4 rounded-lg border border-border-subtle bg-black/20 px-3 py-2">
      <span className="shrink-0 font-mono text-[10px] font-bold uppercase tracking-wider text-text-muted">
        {label}
      </span>
      <span className="text-right font-mono text-xs text-text-secondary">{value}</span>
    </div>
  );
}
