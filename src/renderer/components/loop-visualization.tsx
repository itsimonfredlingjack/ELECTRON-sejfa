import { motion } from 'framer-motion';
import { AlertCircle, CheckCircle2, Circle, Disc, PlayCircle, XCircle } from 'lucide-react';
import React from 'react';

import type { GateId, GateStatusUI, GateUI } from '../models/ui';

export type LoopVisualizationProps = {
  gates: GateUI[];
  activeGateId: GateId | null;
  onSelectGate: (id: GateId) => void;
};

// Layout constants
const VIEWBOX_SIZE = 400;
const CENTER = VIEWBOX_SIZE / 2;
const RADIUS = 140;
const NODE_RADIUS = 28;
const TICK_RING_RADIUS = RADIUS + 22;

function getCoordinates(index: number, total: number) {
  const angle = (index / total) * 360 - 90;
  const rad = (angle * Math.PI) / 180;
  return {
    x: CENTER + RADIUS * Math.cos(rad),
    y: CENTER + RADIUS * Math.sin(rad),
  };
}

function describeArc(cx: number, cy: number, r: number, startAngle: number, endAngle: number) {
  const startRad = (startAngle * Math.PI) / 180;
  const endRad = (endAngle * Math.PI) / 180;
  const x1 = cx + r * Math.cos(startRad);
  const y1 = cy + r * Math.sin(startRad);
  const x2 = cx + r * Math.cos(endRad);
  const y2 = cy + r * Math.sin(endRad);
  const largeArc = endAngle - startAngle > 180 ? 1 : 0;
  return `M ${x1} ${y1} A ${r} ${r} 0 ${largeArc} 1 ${x2} ${y2}`;
}

function getSegmentStyle(status: GateStatusUI) {
  switch (status) {
    case 'passed':
      return { stroke: 'var(--success)', opacity: 1, dasharray: 'none', animate: false };
    case 'running':
      return { stroke: 'var(--primary)', opacity: 1, dasharray: '14 14', animate: true };
    case 'failed':
      return { stroke: 'var(--danger)', opacity: 1, dasharray: 'none', animate: false };
    default:
      return { stroke: 'var(--border-subtle)', opacity: 0.3, dasharray: 'none', animate: false };
  }
}

function getArrowMidpoint(cx: number, cy: number, r: number, startAngle: number, endAngle: number) {
  const midAngle = ((startAngle + endAngle) / 2) * (Math.PI / 180);
  return {
    x: cx + r * Math.cos(midAngle),
    y: cy + r * Math.sin(midAngle),
    angle: (startAngle + endAngle) / 2,
  };
}

function StatusIcon({ status, isActive }: { status: GateUI['status']; isActive: boolean }) {
  if (status === 'running')
    return (
      <PlayCircle
        className={`h-6 w-6 ${isActive ? 'text-primary' : 'text-primary/70'} animate-pulse`}
      />
    );
  if (status === 'passed')
    return (
      <CheckCircle2 className="h-6 w-6 text-success drop-shadow-[0_0_10px_rgb(var(--success-rgb)_/_0.24)]" />
    );
  if (status === 'failed')
    return (
      <XCircle className="h-6 w-6 text-danger drop-shadow-[0_0_12px_rgb(var(--danger-rgb)_/_0.26)]" />
    );
  if (status === 'pending' && isActive) return <Disc className="h-6 w-6 text-primary" />;
  return <Circle className="h-6 w-6 text-text-muted/30" />;
}

function StatusSquare({ status }: { status: GateStatusUI }) {
  let color = 'bg-border-subtle/30';
  if (status === 'passed') color = 'bg-success';
  else if (status === 'running') color = 'bg-primary';
  else if (status === 'failed') color = 'bg-danger';
  return <div className={`h-2 w-2 rounded-[2px] ${color}`} />;
}

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

export function LoopVisualization({ gates, activeGateId, onSelectGate }: LoopVisualizationProps) {
  const total = gates.length;
  const passedCount = gates.filter((g) => g.status === 'passed').length;
  const runningGate = gates.find((g) => g.status === 'running');
  const allPending = gates.every((g) => g.status === 'pending') && !runningGate;
  const allPassed = passedCount === total && total > 0;
  const elapsed = useElapsed(runningGate?.updatedAt, Boolean(runningGate));

  // Compute arc angles for each gate-to-gate segment
  const segmentAngle = 360 / total;
  const gapDeg = 8; // Small gap around each node

  return (
    <div className="relative flex h-full w-full flex-col items-center justify-center p-4">
      {/* Background Ambient Glows */}
      <div className="absolute inset-0 flex items-center justify-center opacity-10 pointer-events-none">
        <div className="h-[300px] w-[300px] rounded-full border border-primary/20" />
        <div className="absolute h-[400px] w-[400px] rounded-full border border-primary/10" />
      </div>

      <svg
        viewBox={`0 0 ${VIEWBOX_SIZE} ${VIEWBOX_SIZE}`}
        className="h-full w-full max-w-full aspect-square overflow-visible"
        style={{ minHeight: '260px' }}
        role="img"
        aria-label="Orbital loop visualization showing pipeline stages"
      >
        <defs>
          <filter id="glow-primary" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="4" result="coloredBlur" />
            <feMerge>
              <feMergeNode in="coloredBlur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <linearGradient id="radar-sweep-grad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--primary)" stopOpacity="0.4" />
            <stop offset="100%" stopColor="var(--primary)" stopOpacity="0" />
          </linearGradient>
        </defs>

        {/* Outer decorative tick ring */}
        <g>
          {Array.from({ length: 72 }, (_, i) => {
            const angleDeg = i * 5;
            const angleRad = ((angleDeg - 90) * Math.PI) / 180;
            const isMajor = i % 6 === 0;
            const length = isMajor ? 6 : 3;
            const x1 = CENTER + (TICK_RING_RADIUS - length) * Math.cos(angleRad);
            const y1 = CENTER + (TICK_RING_RADIUS - length) * Math.sin(angleRad);
            const x2 = CENTER + TICK_RING_RADIUS * Math.cos(angleRad);
            const y2 = CENTER + TICK_RING_RADIUS * Math.sin(angleRad);
            return (
              <line
                key={`tick-${angleDeg}`}
                x1={x1}
                y1={y1}
                x2={x2}
                y2={y2}
                stroke="var(--border-subtle)"
                strokeWidth={isMajor ? 1 : 0.5}
                opacity={isMajor ? 0.3 : 0.15}
              />
            );
          })}
        </g>

        {/* Radar scan sweep */}
        {runningGate && (
          <g
            style={{
              animation: 'scan-sweep 6s linear infinite',
              transformOrigin: `${CENTER}px ${CENTER}px`,
            }}
          >
            <line
              x1={CENTER}
              y1={CENTER}
              x2={CENTER}
              y2={CENTER - RADIUS - 10}
              stroke="url(#radar-sweep-grad)"
              strokeWidth="1.5"
            />
          </g>
        )}

        {/* Center hub ambient dashed ring (when pipeline is active) */}
        {runningGate && (
          <>
            <circle
              cx={CENTER}
              cy={CENTER}
              r={55}
              fill="none"
              stroke="var(--primary)"
              strokeWidth="0.5"
              strokeDasharray="4 8"
              opacity="0.2"
            />
            <g
              style={{
                animation: 'scan-sweep 8s linear infinite',
                transformOrigin: `${CENTER}px ${CENTER}px`,
              }}
            >
              <circle cx={CENTER} cy={CENTER - 30} r="18" fill="var(--primary)" opacity="0.04" />
            </g>
          </>
        )}

        {/* Segmented Progress Track */}
        {gates.map((gate, i) => {
          const startAngle = i * segmentAngle - 90 + gapDeg / 2;
          const endAngle = (i + 1) * segmentAngle - 90 - gapDeg / 2;
          const style = getSegmentStyle(gate.status);
          const d = describeArc(CENTER, CENTER, RADIUS, startAngle, endAngle);

          return (
            <g key={`seg-${gate.id}`}>
              <path
                d={d}
                fill="none"
                stroke={style.stroke}
                strokeWidth="2.5"
                strokeLinecap="round"
                opacity={style.opacity}
                strokeDasharray={style.dasharray === 'none' ? undefined : style.dasharray}
                style={
                  style.animate ? { animation: 'segment-flow 1.5s linear infinite' } : undefined
                }
              />
            </g>
          );
        })}

        {/* Data packet dots on running segments */}
        {gates.map((gate, i) => {
          if (gate.status !== 'running') return null;
          const startAngle = i * segmentAngle - 90 + gapDeg / 2;
          const endAngle = (i + 1) * segmentAngle - 90 - gapDeg / 2;
          const d = describeArc(CENTER, CENTER, RADIUS, startAngle, endAngle);
          const pathId = `packet-path-${gate.id}`;
          return (
            <g key={`packets-${gate.id}`}>
              <path id={pathId} d={d} fill="none" stroke="none" />
              <circle r="2.5" fill="var(--primary)" opacity="0.7">
                <animateMotion dur="2s" repeatCount="indefinite">
                  <mpath href={`#${pathId}`} />
                </animateMotion>
              </circle>
              <circle r="2.5" fill="var(--primary)" opacity="0.4">
                <animateMotion dur="2s" begin="1s" repeatCount="indefinite">
                  <mpath href={`#${pathId}`} />
                </animateMotion>
              </circle>
            </g>
          );
        })}

        {/* Directional Arrows at midpoints */}
        {gates.map((gate, i) => {
          const startAngle = i * segmentAngle - 90 + gapDeg / 2;
          const endAngle = (i + 1) * segmentAngle - 90 - gapDeg / 2;
          const mid = getArrowMidpoint(CENTER, CENTER, RADIUS, startAngle, endAngle);
          const rotAngle = mid.angle + 90; // Clockwise tangent
          const size = 4;

          return (
            <polygon
              key={`arrow-${gate.id}`}
              points={`0,${-size} ${size * 0.7},${size * 0.5} ${-size * 0.7},${size * 0.5}`}
              fill="var(--border-subtle)"
              opacity="0.4"
              transform={`translate(${mid.x}, ${mid.y}) rotate(${rotAngle})`}
            />
          );
        })}

        {/* Gate Nodes */}
        {gates.map((gate, i) => {
          const coords = getCoordinates(i, total);
          const isSelected = gate.id === activeGateId;
          const status = gate.status;
          const isFailed = status === 'failed';
          const isRunning = status === 'running';

          return (
            <g
              key={gate.id}
              onClick={() => onSelectGate(gate.id)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  onSelectGate(gate.id);
                }
              }}
              // biome-ignore lint/a11y/useSemanticElements: SVG interaction element
              role="button"
              tabIndex={0}
              className={`cursor-pointer group outline-none focus-visible:opacity-80 ${
                isFailed ? 'animate-[glitch_4s_ease-in-out_infinite]' : ''
              }`}
              style={{ transformBox: 'fill-box', transformOrigin: 'center' }}
              aria-label={`Select ${gate.label} gate`}
              aria-pressed={isSelected}
            >
              {/* Click target */}
              <circle cx={coords.x} cy={coords.y} r={44} fill="transparent" />

              {/* Running progress ring */}
              {isRunning && (
                <motion.circle
                  cx={coords.x}
                  cy={coords.y}
                  r={NODE_RADIUS + 4}
                  fill="none"
                  stroke="var(--primary)"
                  strokeWidth="2"
                  strokeDasharray="20 80"
                  strokeLinecap="round"
                  animate={{ rotate: 360 }}
                  transition={{ duration: 2, repeat: Number.POSITIVE_INFINITY, ease: 'linear' }}
                  className="opacity-60"
                  style={{ transformOrigin: `${coords.x}px ${coords.y}px` }}
                />
              )}

              {/* Double rotating ring (counter-clockwise) for running nodes */}
              {isRunning && (
                <motion.circle
                  cx={coords.x}
                  cy={coords.y}
                  r={NODE_RADIUS + 6}
                  fill="none"
                  stroke="var(--primary)"
                  strokeWidth="1.5"
                  strokeDasharray="8 40"
                  opacity="0.3"
                  animate={{ rotate: -360 }}
                  transition={{ duration: 3, repeat: Number.POSITIVE_INFINITY, ease: 'linear' }}
                  style={{ transformOrigin: `${coords.x}px ${coords.y}px` }}
                />
              )}

              {/* Selection Ring */}
              {isSelected && (
                <motion.circle
                  cx={coords.x}
                  cy={coords.y}
                  r={NODE_RADIUS + 4}
                  fill="none"
                  stroke="var(--primary)"
                  strokeWidth="1.5"
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1.1, opacity: 1 }}
                  transition={{
                    duration: 1.5,
                    repeat: Number.POSITIVE_INFINITY,
                    repeatType: 'reverse',
                  }}
                />
              )}

              {/* Node outer depth ring */}
              <circle
                cx={coords.x}
                cy={coords.y}
                r={NODE_RADIUS + 1}
                fill="none"
                stroke="var(--border-subtle)"
                strokeWidth="0.5"
                opacity="0.3"
              />

              {/* Node Background */}
              <circle
                cx={coords.x}
                cy={coords.y}
                r={NODE_RADIUS}
                className={`transition-all duration-300 ${
                  isSelected
                    ? 'fill-bg-panel stroke-primary'
                    : 'fill-bg-deep stroke-border-subtle group-hover:stroke-primary/50'
                }`}
                strokeWidth="2"
                strokeDasharray={allPending ? '4 4' : undefined}
              />

              {/* Icon */}
              <foreignObject
                x={coords.x - 12}
                y={coords.y - 12}
                width={24}
                height={24}
                className="overflow-visible pointer-events-none"
              >
                <div className="flex h-full w-full items-center justify-center">
                  <StatusIcon status={status} isActive={isSelected} />
                </div>
              </foreignObject>

              {/* Label */}
              <foreignObject
                x={coords.x - 60}
                y={coords.y + 34}
                width={120}
                height={40}
                className="overflow-visible pointer-events-none"
              >
                <div className="flex flex-col items-center justify-center text-center">
                  <span
                    className={`text-xs font-semibold tracking-wide transition-colors ${
                      isSelected ? 'text-primary' : 'text-text-muted group-hover:text-text-primary'
                    }`}
                  >
                    {gate.label}
                  </span>
                  {isFailed && (
                    <span className="text-[9px] text-danger font-mono mt-0.5">FAILED</span>
                  )}
                </div>
              </foreignObject>
            </g>
          );
        })}

        {/* Central Hub Display */}
        <foreignObject
          x={CENTER - 80}
          y={CENTER - 60}
          width={160}
          height={120}
          className="pointer-events-none"
        >
          <div className="flex h-full w-full flex-col items-center justify-center text-center gap-1.5">
            {allPassed ? (
              <>
                <span
                  className="text-[10px] font-bold uppercase tracking-wider text-success text-gradient-primary"
                  style={{ animation: 'gate-pass-flash 0.8s ease-out' }}
                >
                  ALL CLEAR
                </span>
                <span className="text-sm font-semibold text-success/80">Pipeline complete</span>
              </>
            ) : allPending ? (
              <>
                <span className="text-[10px] font-bold uppercase tracking-wider text-text-muted text-glow animate-[breathe_3s_ease-in-out_infinite]">
                  READY
                </span>
                <span className="text-sm font-medium text-text-muted/60">Awaiting task</span>
              </>
            ) : (
              <>
                {/* Passed count */}
                <span className="text-[10px] font-bold uppercase tracking-wider text-text-secondary">
                  {passedCount}/{total} PASSED
                </span>

                {/* Status squares */}
                <div className="flex items-center gap-1">
                  {gates.map((g) => (
                    <StatusSquare key={g.id} status={g.status} />
                  ))}
                </div>

                {/* Active gate + elapsed */}
                {runningGate && (
                  <span className="mt-0.5 flex items-center gap-1.5 text-[10px] text-primary font-mono uppercase">
                    <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
                    {runningGate.label} {elapsed}
                  </span>
                )}
              </>
            )}
          </div>
        </foreignObject>

        {/* All-passed glow ring */}
        {allPassed && (
          <circle
            cx={CENTER}
            cy={CENTER}
            r={RADIUS}
            fill="none"
            stroke="var(--success)"
            strokeWidth="3"
            opacity="0.4"
            style={{ animation: 'gate-pass-flash 0.8s ease-out' }}
          />
        )}
      </svg>
    </div>
  );
}
