import { motion } from 'framer-motion';
import { Eye, EyeOff, Loader2 } from 'lucide-react';
import React from 'react';

import type { FileTailStatus } from '../../shared/api';
import { useElectronApi } from '../hooks/use-electron-api';

export function FileMonitorToggle() {
  const api = useElectronApi();
  const [status, setStatus] = React.useState<FileTailStatus | null>(null);
  const [loading, setLoading] = React.useState(false);

  // Poll status every 2 seconds
  React.useEffect(() => {
    let mounted = true;

    const updateStatus = async () => {
      try {
        const s = await api.fileTail.getStatus();
        if (mounted) setStatus(s);
      } catch (err) {
        console.error('[FileMonitorToggle] Failed to get status:', err);
      }
    };

    void updateStatus();
    const interval = setInterval(() => void updateStatus(), 2000);

    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, [api]);

  const handleToggle = async () => {
    if (loading || !status) return;

    setLoading(true);
    try {
      if (status.watching) {
        await api.fileTail.stop();
      } else {
        await api.fileTail.start();
      }
      // Refresh status immediately
      const newStatus = await api.fileTail.getStatus();
      setStatus(newStatus);
    } catch (err) {
      console.error('[FileMonitorToggle] Toggle failed:', err);
    } finally {
      setLoading(false);
    }
  };

  if (!status) {
    return null; // Loading initial status
  }

  const watching = status.watching;
  const lastState = status.lastState;

  return (
    <motion.div
      className="flex items-center gap-3 rounded-lg border border-white/10 bg-black/20 px-3 py-2 backdrop-blur-sm"
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      {/* Toggle button */}
      <button
        type="button"
        onClick={handleToggle}
        disabled={loading}
        className={`
          flex items-center gap-2 rounded-md px-3 py-1.5 font-mono text-xs font-semibold transition-all
          ${watching ? 'bg-green-500/20 text-green-400 hover:bg-green-500/30' : 'bg-gray-500/20 text-gray-400 hover:bg-gray-500/30'}
          ${loading ? 'opacity-50 cursor-wait' : 'cursor-pointer'}
        `}
        aria-label={watching ? 'Stop file monitoring' : 'Start file monitoring'}
      >
        {loading ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
        ) : watching ? (
          <Eye className="h-3.5 w-3.5" />
        ) : (
          <EyeOff className="h-3.5 w-3.5" />
        )}
        <span>{watching ? 'Monitoring' : 'Stopped'}</span>
      </button>

      {/* Status indicator */}
      {watching && lastState && (
        <div className="flex items-center gap-2 text-xs">
          <div className="flex items-center gap-1.5">
            <div
              className={`h-1.5 w-1.5 rounded-full ${lastState.loop_active ? 'bg-green-400 animate-pulse' : 'bg-gray-400'}`}
            />
            <span className="text-white/50">
              {lastState.loop_active ? 'Loop active' : 'Loop idle'}
            </span>
          </div>

          {lastState.iterations > 0 && (
            <div className="text-white/50">
              <span className="text-white/70 font-medium">{lastState.iterations}</span> iteration
              {lastState.iterations !== 1 ? 's' : ''}
            </div>
          )}
        </div>
      )}
    </motion.div>
  );
}
