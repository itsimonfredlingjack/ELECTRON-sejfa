import { motion } from 'framer-motion';
import { CheckCircle2, Circle, Loader2, XCircle } from 'lucide-react';
import React from 'react';

import type { GateId, GateStatusUI, GateUI } from '../models/ui';

export type LoopVisualizationProps = {
  gates: GateUI[];
  activeGateId: GateId | null;
  onSelectGate: (id: GateId) => void;
};

/* ── Helpers ───────────────────────────────────────────────── */

function useElapsed(updatedAt: string | undefined, active: boolean) {
  const [elapsed, setElapsed] = React.useState('0:00');
  React.useEffect(() => {
    if (!active || !updatedAt) {
      setElapsed('0:00');
      return;
    }
    const update = () => {
      const diff = Math.max(0, Math.floor((Date.now() - Date.parse(updatedAt)) / 1000));
      const m = Math.floor(diff / 60);
      const s = diff % 60;
      setElapsed(`${m}:${s.toString().padStart(2, '0')}`);
    };
    update();
    const id = window.setInterval(update, 1000);
    return () => window.clearInterval(id);
  }, [updatedAt, active]);
  return elapsed;
}

function getConnectorColor(fromStatus: GateStatusUI): string {
  if (fromStatus === 'passed') return 'bg-success/60';
  if (fromStatus === 'failed') return 'bg-danger/40';
  return 'bg-border-subtle/40';
}

function getConnectorGlow(fromStatus: GateStatusUI): string {
  if (fromStatus === 'passed') return 'shadow-[0_0_8px_rgb(var(--success-rgb)/0.15)]';
  return '';
}

/* ── Node Icon ────────────────────────────────────────────── */

function NodeIcon({ status, isActive }: { status: GateStatusUI; isActive: boolean }) {
  const size = 'h-5 w-5';

  if (status === 'running') {
    return (
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ duration: 1.5, repeat: Number.POSITIVE_INFINITY, ease: 'linear' }}
      >
        <Loader2 className={`${size} text-primary`} />
      </motion.div>
    );
  }
  if (status === 'passed') {
    return <CheckCircle2 className={`${size} text-success`} />;
  }
  if (status === 'failed') {
    return <XCircle className={`${size} text-danger`} />;
  }
  // pending
  return (
    <Circle
      className={`${size} ${isActive ? 'text-text-secondary' : 'text-text-muted/30'}`}
    />
  );
}

/* ── Pipeline Node ────────────────────────────────────────── */

function PipelineNode({
  gate,
  isActive,
  isSelected,
  onSelect,
}: {
  gate: GateUI;
  isActive: boolean;
  isSelected: boolean;
  onSelect: () => void;
}) {
  const isRunning = gate.status === 'running';
  const isPassed = gate.status === 'passed';
  const isFailed = gate.status === 'failed';
  const isPending = gate.status === 'pending';

  const elapsed = useElapsed(gate.updatedAt, isRunning);

  // Ring color
  let ringClass = 'border-border-subtle/50';
  if (isRunning) ringClass = 'border-primary/60';
  else if (isPassed) ringClass = 'border-success/40';
  else if (isFailed) ringClass = 'border-danger/40';
  else if (isSelected) ringClass = 'border-primary/40';

  // Background
  let bgClass = 'bg-bg-deep';
  if (isRunning) bgClass = 'bg-primary/[0.08]';
  else if (isPassed) bgClass = 'bg-success/[0.05]';
  else if (isFailed) bgClass = 'bg-danger/[0.05]';

  return (
    <motion.button
      type="button"
      onClick={onSelect}
      className="group relative flex flex-col items-center gap-2 outline-none focus-visible:ring-2 focus-visible:ring-primary/30 rounded-xl"
      whileHover={{ scale: 1.04 }}
      whileTap={{ scale: 0.97 }}
      transition={{ type: 'spring', stiffness: 400, damping: 25 }}
      aria-label={`Select ${gate.label} gate`}
      aria-pressed={isSelected}
    >
      {/* Drone avatar — diamond indicator above active node */}
      {isActive && (
        <motion.div
          className="absolute -top-5 left-1/2"
          layoutId="pipeline-drone"
          initial={false}
          transition={{ type: 'spring', stiffness: 300, damping: 28 }}
        >
          <div
            className="h-2.5 w-2.5 -translate-x-1/2 rotate-45 rounded-[2px]"
            style={{
              backgroundColor: isRunning ? 'var(--primary)' : isPassed ? 'var(--success)' : isFailed ? 'var(--danger)' : 'var(--text-secondary)',
              boxShadow: isRunning ? '0 0 8px rgb(var(--primary-rgb) / 0.4)' : 'none',
              animation: isRunning ? 'drone-bob 1.5s ease-in-out infinite' : 'none',
            }}
          />
        </motion.div>
      )}

      {/* Node circle */}
      <div className="relative">
        {/* Outer glow ring for running state */}
        {isRunning && (
          <>
            <motion.div
              className="absolute -inset-1.5 rounded-full border border-primary/30"
              animate={{ scale: [1, 1.15, 1], opacity: [0.5, 0, 0.5] }}
              transition={{ duration: 2, repeat: Number.POSITIVE_INFINITY, ease: 'easeInOut' }}
            />
            <motion.div
              className="absolute -inset-3 rounded-full border border-primary/15"
              animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0, 0.3] }}
              transition={{ duration: 2.5, repeat: Number.POSITIVE_INFINITY, ease: 'easeInOut', delay: 0.5 }}
            />
          </>
        )}

        <div
          className={`relative flex h-11 w-11 items-center justify-center rounded-full border-2 transition-all duration-300 ${ringClass} ${bgClass} ${isSelected && !isRunning ? 'shadow-glow-primary' : ''
            }`}
        >
          <NodeIcon status={gate.status} isActive={isActive} />
        </div>
      </div>

      {/* Label */}
      <div className="flex flex-col items-center gap-0.5">
        <span
          className={`text-[11px] font-semibold tracking-wide uppercase transition-colors ${isRunning
            ? 'text-primary'
            : isPassed
              ? 'text-success/80'
              : isFailed
                ? 'text-danger/80'
                : isSelected
                  ? 'text-text-primary'
                  : 'text-text-muted group-hover:text-text-secondary'
            }`}
        >
          {gate.label}
        </span>

        {/* Elapsed timer for running gate */}
        {isRunning && (
          <motion.span
            className="text-[10px] font-mono text-primary/70 tabular-nums"
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
          >
            {elapsed}
          </motion.span>
        )}

        {/* Failed label */}
        {isFailed && (
          <span className="text-[9px] font-mono font-bold text-danger/70 uppercase">
            Failed
          </span>
        )}
      </div>
    </motion.button>
  );
}

/* ── Connector Line ───────────────────────────────────────── */

function PipelineConnector({ fromStatus }: { fromStatus: GateStatusUI }) {
  const colorClass = getConnectorColor(fromStatus);
  const glowClass = getConnectorGlow(fromStatus);
  const isRunning = fromStatus === 'running';

  return (
    <div className="relative flex items-center flex-1 min-w-[24px] self-start mt-[22px]">
      {/* Track */}
      <div className={`h-[2px] w-full rounded-full ${colorClass} ${glowClass} transition-colors duration-500`} />

      {/* Animated data pulses for running connectors */}
      {isRunning && (
        <>
          <motion.div
            className="absolute top-1/2 -translate-y-1/2 h-1.5 w-6 rounded-full bg-primary/60"
            style={{ filter: 'blur(1.5px)', boxShadow: '0 0 8px rgb(var(--primary-rgb) / 0.4)' }}
            animate={{ left: ['-10%', '110%'] }}
            transition={{ duration: 1, repeat: Number.POSITIVE_INFINITY, ease: 'easeInOut' }}
          />
          <motion.div
            className="absolute top-1/2 -translate-y-1/2 h-1 w-3 rounded-full bg-primary/30"
            style={{ filter: 'blur(1px)' }}
            animate={{ left: ['-10%', '110%'] }}
            transition={{ duration: 1, repeat: Number.POSITIVE_INFINITY, ease: 'easeInOut', delay: 0.4 }}
          />
        </>
      )}

      {/* Chevron arrow */}
      <svg
        className="absolute right-0 top-1/2 -translate-y-1/2 -translate-x-0.5"
        width="6"
        height="8"
        viewBox="0 0 6 8"
        fill="none"
      >
        <path
          d="M1 1L4.5 4L1 7"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          className={fromStatus === 'passed' ? 'text-success/40' : 'text-border-subtle/60'}
        />
      </svg>
    </div>
  );
}

/* ── Summary Bar ──────────────────────────────────────────── */

function PipelineSummary({
  gates,
  allPassed,
  allPending,
  runningGate,
  elapsed,
}: {
  gates: GateUI[];
  allPassed: boolean;
  allPending: boolean;
  runningGate: GateUI | undefined;
  elapsed: string;
}) {
  const passedCount = gates.filter((g) => g.status === 'passed').length;
  const total = gates.length;

  if (allPassed) {
    return (
      <motion.div
        className="flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-success/[0.06] border border-success/15"
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <CheckCircle2 className="h-4 w-4 text-success" />
        <span className="text-sm font-semibold text-success/90">Pipeline Complete</span>
      </motion.div>
    );
  }

  if (allPending) {
    return (
      <div className="flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-bg-panel/50 border border-border-subtle/50">
        <Circle className="h-3.5 w-3.5 text-text-muted/40" />
        <span className="text-sm font-medium text-text-muted/60">Awaiting task</span>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center gap-4 px-4 py-2 rounded-lg bg-bg-panel/50 border border-border-subtle/50">
      {/* Progress */}
      <div className="flex items-center gap-2">
        <span className="text-[11px] font-bold uppercase tracking-wider text-text-secondary">
          {passedCount}/{total}
        </span>
        <div className="flex items-center gap-0.5">
          {gates.map((g) => {
            let dotColor = 'bg-border-subtle/30';
            if (g.status === 'passed') dotColor = 'bg-success';
            else if (g.status === 'running') dotColor = 'bg-primary';
            else if (g.status === 'failed') dotColor = 'bg-danger';
            return (
              <div
                key={g.id}
                className={`h-1.5 w-1.5 rounded-full ${dotColor} transition-colors duration-300`}
              />
            );
          })}
        </div>
      </div>

      {/* Active gate */}
      {runningGate && (
        <div className="flex items-center gap-1.5 text-[11px] text-primary font-mono uppercase">
          <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
          {runningGate.label} {elapsed}
        </div>
      )}
    </div>
  );
}

/* ── Main Component ───────────────────────────────────────── */

export function LoopVisualization({ gates, activeGateId, onSelectGate }: LoopVisualizationProps) {
  const passedCount = gates.filter((g) => g.status === 'passed').length;
  const total = gates.length;
  const runningGate = gates.find((g) => g.status === 'running');
  const allPending = gates.every((g) => g.status === 'pending') && !runningGate;
  const allPassed = passedCount === total && total > 0;
  const elapsed = useElapsed(runningGate?.updatedAt, Boolean(runningGate));

  return (
    <div className="flex h-full w-full flex-col justify-center gap-6 px-4 py-6">
      {/* Pipeline track */}
      <motion.div
        className="flex items-start justify-center gap-0 w-full px-2"
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
      >
        {gates.map((gate, i) => {
          const isActive = gate.id === activeGateId;
          return (
            <React.Fragment key={gate.id}>
              <PipelineNode
                gate={gate}
                isActive={isActive}
                isSelected={isActive}
                onSelect={() => onSelectGate(gate.id)}
              />
              {i < gates.length - 1 && (
                <PipelineConnector fromStatus={gate.status} />
              )}
            </React.Fragment>
          );
        })}
      </motion.div>

      {/* Summary */}
      <PipelineSummary
        gates={gates}
        allPassed={allPassed}
        allPending={allPending}
        runningGate={runningGate}
        elapsed={elapsed}
      />
    </div>
  );
}
