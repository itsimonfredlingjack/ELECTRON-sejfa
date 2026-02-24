import { AnimatePresence, motion } from 'framer-motion';
import { AlertTriangle, X } from 'lucide-react';

import { loopActions, useStuckAlert } from '../stores/loop-store';

export function StuckAlert() {
  const alert = useStuckAlert();

  return (
    <AnimatePresence>
      {alert && (
        <motion.div
          initial={{ y: -60, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -60, opacity: 0 }}
          transition={{ type: 'spring', damping: 20, stiffness: 300 }}
          className="absolute inset-x-0 top-0 z-50 flex items-center justify-between border-b-2 border-red-500/50 bg-red-950/90 px-4 py-2 backdrop-blur-md"
        >
          <div className="flex items-center gap-3">
            <AlertTriangle className="h-5 w-5 shrink-0 animate-pulse text-red-400" />
            <div className="flex flex-col">
              <span className="font-mono text-xs font-bold text-red-300">STUCK LOOP DETECTED</span>
              <span className="font-mono text-[11px] text-red-400/80">
                {alert.pattern} — repeated {alert.repeat_count}x
                {alert.tokens_burned > 0 &&
                  ` · ~${alert.tokens_burned.toLocaleString()} tokens burned`}
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={() => loopActions.setStuckAlert(null)}
            className="rounded p-1 text-red-400/60 transition-colors hover:bg-red-900/50 hover:text-red-300"
            aria-label="Dismiss stuck alert"
          >
            <X className="h-4 w-4" />
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
