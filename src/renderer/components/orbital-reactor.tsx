import { motion } from 'framer-motion';
import { Bot, GitPullRequest, Rocket, ShieldCheck, Ticket } from 'lucide-react';
import React from 'react';

import type { GateUI } from '../models/ui';
import type { ReactorState } from './ralph-reactor';

/* ── Types ────────────────────────────────────────────────── */

export type TDDPhase = 'red' | 'green' | 'refactor' | 'verify' | 'idle' | 'offline';

export interface OrbitalReactorProps {
  state: ReactorState;
  tddPhase?: TDDPhase;
  currentNode: string | null;
  gates: GateUI[];
}

/* ── Constants ────────────────────────────────────────────── */

const ORBIT_RADIUS = 155;
const NODE_RADIUS = 28;
const CORE_RADIUS = 58;
const VIEWPORT = 460;
const CENTER = VIEWPORT / 2;

const PIPELINE_NODES = [
  { gateId: 'local', label: 'Jira', Icon: Ticket },
  { gateId: 'ci', label: 'Agent', Icon: Bot },
  { gateId: 'review', label: 'Actions', Icon: GitPullRequest },
  { gateId: 'deploy', label: 'Deploy', Icon: Rocket },
  { gateId: 'verify', label: 'Verify', Icon: ShieldCheck },
] as const;

function nodePos(index: number): { x: number; y: number } {
  const angle = (index * 72 - 90) * (Math.PI / 180);
  return {
    x: CENTER + ORBIT_RADIUS * Math.cos(angle),
    y: CENTER + ORBIT_RADIUS * Math.sin(angle),
  };
}

/* ── Color helpers ────────────────────────────────────────── */

/** Insert opacity into an rgb() color: rgb(r g b) → rgb(r g b / α) */
function withAlpha(rgbColor: string, alpha: number): string {
  return rgbColor.replace(')', ` / ${alpha})`);
}

/* ── Visual Config per Phase ──────────────────────────────── */

const PHASE_CONFIG: Record<
  TDDPhase,
  {
    color: string;
    glow: string;
    bg: string;
    pulseSpeed: number;
    label: string;
    sublabel: string;
  }
> = {
  red: {
    color: 'rgb(239 68 68)',
    glow: '0 0 50px rgb(239 68 68 / 0.4), 0 0 100px rgb(239 68 68 / 0.15)',
    bg: 'radial-gradient(circle, rgb(239 68 68 / 0.25) 0%, rgb(15 23 42 / 0.85) 100%)',
    pulseSpeed: 0.6,
    label: 'FAIL',
    sublabel: 'ANALYZING ERROR',
  },
  green: {
    color: 'rgb(16 185 129)',
    glow: '0 0 50px rgb(16 185 129 / 0.35), 0 0 100px rgb(16 185 129 / 0.12)',
    bg: 'radial-gradient(circle, rgb(16 185 129 / 0.2) 0%, rgb(15 23 42 / 0.85) 100%)',
    pulseSpeed: 3,
    label: 'PASS',
    sublabel: 'TESTS GREEN',
  },
  refactor: {
    color: 'rgb(6 182 212)',
    glow: '0 0 60px rgb(6 182 212 / 0.4), 0 0 120px rgb(6 182 212 / 0.1)',
    bg: 'radial-gradient(circle, rgb(6 182 212 / 0.25) 0%, rgb(15 23 42 / 0.85) 100%)',
    pulseSpeed: 1,
    label: 'REFACTOR',
    sublabel: 'OPTIMIZING CODE',
  },
  verify: {
    color: 'rgb(139 92 246)',
    glow: '0 0 50px rgb(139 92 246 / 0.3), 0 0 90px rgb(139 92 246 / 0.1)',
    bg: 'radial-gradient(circle, rgb(139 92 246 / 0.2) 0%, rgb(15 23 42 / 0.85) 100%)',
    pulseSpeed: 4,
    label: 'VERIFY',
    sublabel: 'FINAL CHECKS',
  },
  idle: {
    color: 'rgb(99 102 241)',
    glow: '0 0 40px rgb(99 102 241 / 0.25), 0 0 80px rgb(99 102 241 / 0.08)',
    bg: 'radial-gradient(circle, rgb(99 102 241 / 0.15) 0%, rgb(15 23 42 / 0.85) 100%)',
    pulseSpeed: 6,
    label: 'IDLE',
    sublabel: 'AWAITING MISSION',
  },
  offline: {
    color: 'rgb(248 113 113)',
    glow: '0 0 40px rgb(239 68 68 / 0.25), 0 0 80px rgb(239 68 68 / 0.08)',
    bg: 'radial-gradient(circle, rgb(239 68 68 / 0.18) 0%, rgb(30 27 75 / 0.9) 100%)',
    pulseSpeed: 2,
    label: 'OFFLINE',
    sublabel: 'DISCONNECTED',
  },
};

/* ── OrbitalCore ──────────────────────────────────────────── */

function OrbitalCore({
  phase,
  labelOverride,
}: { phase: TDDPhase; labelOverride: string | undefined }) {
  const config = PHASE_CONFIG[phase];
  const isAnimating = config.pulseSpeed > 0;
  const pulseAnim =
    phase === 'red'
      ? { scale: [1, 1.08, 0.98, 1.02, 1], opacity: [0.8, 1, 0.9, 1, 0.8] }
      : phase === 'offline'
        ? { scale: [1, 1.02, 1], opacity: [0.75, 0.95, 0.75] }
        : { scale: [1, 1.04, 1], opacity: [0.85, 1, 0.85] };

  return (
    <motion.div
      animate={isAnimating ? pulseAnim : false}
      transition={
        isAnimating
          ? {
              duration: config.pulseSpeed,
              repeat: Number.POSITIVE_INFINITY,
              ease: 'easeInOut' as const,
            }
          : { duration: 0 }
      }
      className="absolute flex items-center justify-center rounded-full backdrop-blur-md"
      style={{
        width: CORE_RADIUS * 2,
        height: CORE_RADIUS * 2,
        left: CENTER - CORE_RADIUS,
        top: CENTER - CORE_RADIUS,
        background: config.bg,
        boxShadow: config.glow,
        border: `1.5px solid ${withAlpha(config.color, phase === 'offline' ? 0.45 : 0.4)}`,
      }}
    >
      <div className="text-center">
        <h1
          className="font-heading text-2xl font-bold tracking-tighter"
          style={{
            textShadow:
              phase === 'offline' ? '0 0 16px rgb(239 68 68 / 0.4)' : `0 0 20px ${config.color}`,
            color: phase === 'red' ? '#fecaca' : phase === 'offline' ? '#fca5a5' : '#ffffff',
          }}
        >
          {labelOverride || config.label}
        </h1>
        <p
          className="mt-0.5 font-heading text-[9px] font-semibold uppercase tracking-[0.2em]"
          style={{
            color: phase === 'offline' ? 'rgb(252 165 165 / 0.8)' : 'rgb(255 255 255 / 0.55)',
          }}
        >
          {config.sublabel}
        </p>
      </div>

      {/* Spinner Ring for Refactor Phase */}
      {phase === 'refactor' && (
        <motion.div
          className="absolute inset-0 rounded-full border-t-2 border-cyan-400/50"
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Number.POSITIVE_INFINITY, ease: 'linear' }}
          style={{ width: '115%', height: '115%', left: '-7.5%', top: '-7.5%' }}
        />
      )}
    </motion.div>
  );
}

/* ── OrbitalNode ──────────────────────────────────────────── */

function OrbitalNode({
  index,
  label,
  Icon,
  gate,
  phase,
  isActive,
}: {
  index: number;
  label: string;
  Icon: React.ComponentType<{ className?: string }>;
  gate: GateUI | undefined;
  phase: TDDPhase;
  isActive: boolean;
}) {
  const pos = nodePos(index);
  const status = gate?.status ?? 'pending';
  const config = PHASE_CONFIG[phase];

  // ── Much higher base visibility ──
  let nodeOpacity = 0.75;
  let borderColor = 'rgb(255 255 255 / 0.2)';
  let iconColor = 'text-white/60';
  let bgFill = 'rgb(15 15 22 / 0.85)';
  let glowFilter: string | undefined;

  if (phase === 'offline') {
    nodeOpacity = 0.75;
    borderColor = 'rgb(239 68 68 / 0.3)';
    iconColor = 'text-red-300/70';
  } else if (status === 'passed') {
    nodeOpacity = 1;
    borderColor = 'rgb(16 185 129 / 0.5)';
    iconColor = 'text-emerald-400';
    bgFill = 'rgb(16 185 129 / 0.08)';
    glowFilter = 'drop-shadow(0 0 8px rgb(16 185 129 / 0.25))';
  } else if (status === 'failed') {
    nodeOpacity = 1;
    borderColor = 'rgb(239 68 68 / 0.6)';
    iconColor = 'text-red-400';
    bgFill = 'rgb(239 68 68 / 0.08)';
    glowFilter = 'drop-shadow(0 0 12px rgb(239 68 68 / 0.3))';
  } else if (status === 'running') {
    nodeOpacity = 1;
    borderColor = withAlpha(config.color, 0.6);
    iconColor = 'text-white';
    bgFill = withAlpha(config.color, 0.08);
    glowFilter = `drop-shadow(0 0 12px ${withAlpha(config.color, 0.3)})`;
  } else if (isActive) {
    nodeOpacity = 0.95;
    borderColor = 'rgb(255 255 255 / 0.35)';
    iconColor = 'text-white/90';
  }

  return (
    <g opacity={nodeOpacity} style={glowFilter ? { filter: glowFilter } : undefined}>
      {/* Node background circle */}
      <circle
        cx={pos.x}
        cy={pos.y}
        r={NODE_RADIUS}
        fill={bgFill}
        stroke={borderColor}
        strokeWidth={1.5}
      />
      {/* Icon */}
      <foreignObject
        x={pos.x - NODE_RADIUS}
        y={pos.y - NODE_RADIUS}
        width={NODE_RADIUS * 2}
        height={NODE_RADIUS * 2}
      >
        <div className="flex h-full w-full items-center justify-center bg-transparent">
          <Icon className={`h-5 w-5 ${iconColor}`} />
        </div>
      </foreignObject>
      {/* Label */}
      <text
        x={pos.x}
        y={pos.y + NODE_RADIUS + 15}
        textAnchor="middle"
        className="font-mono uppercase tracking-wider"
        style={{
          fontSize: 9,
          fill: phase === 'offline' ? 'rgb(252 165 165 / 0.5)' : 'rgb(255 255 255 / 0.5)',
          fontWeight: 600,
        }}
      >
        {label}
      </text>

      {/* Active Runner Ring */}
      {isActive && phase !== 'offline' && (
        <circle
          cx={pos.x}
          cy={pos.y}
          r={NODE_RADIUS + 5}
          fill="none"
          stroke={withAlpha(config.color, 0.45)}
          strokeWidth={1.5}
          strokeDasharray="4 8"
          style={{
            animation: `reactor-ring-spin ${phase === 'red' ? '0.5s' : '4s'} linear infinite`,
            transformOrigin: `${pos.x}px ${pos.y}px`,
          }}
        />
      )}
    </g>
  );
}

/* ── OrbitalConnectors ────────────────────────────────────── */

function OrbitalConnectors({ phase, gates }: { phase: TDDPhase; gates: GateUI[] }) {
  const config = PHASE_CONFIG[phase];
  const paths: React.ReactNode[] = [];

  for (let i = 0; i < 5; i++) {
    const from = nodePos(i);
    const to = nodePos((i + 1) % 5);
    const gate = gates[i];

    const isFlowing = gate?.status === 'passed' || gate?.status === 'running';

    const mx = (from.x + to.x) / 2;
    const my = (from.y + to.y) / 2;
    const dx = mx - CENTER;
    const dy = my - CENTER;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const bulge = 30;
    const cx = mx + (dx / dist) * bulge;
    const cy = my + (dy / dist) * bulge;

    const pathD = `M ${from.x} ${from.y} Q ${cx} ${cy} ${to.x} ${to.y}`;

    // ── MUCH higher connector visibility ──
    const strokeColor = isFlowing
      ? withAlpha(config.color, 0.5)
      : phase === 'offline'
        ? withAlpha(config.color, 0.12)
        : 'rgb(255 255 255 / 0.15)';
    const strokeW = isFlowing ? 2 : 1;
    const dash = isFlowing ? undefined : '6 6';

    paths.push(
      <React.Fragment key={`conn-${i}`}>
        <path
          d={pathD}
          fill="none"
          stroke={strokeColor}
          strokeWidth={strokeW}
          strokeDasharray={dash}
          strokeLinecap="round"
        />
        {isFlowing && phase !== 'offline' && (
          <circle r={2.5} fill={config.color}>
            <animateMotion
              dur={phase === 'red' ? '0.5s' : '1.5s'}
              repeatCount="indefinite"
              path={pathD}
              calcMode="linear"
            />
          </circle>
        )}
      </React.Fragment>,
    );
  }
  return <>{paths}</>;
}

/* ── Main Component ───────────────────────────────────────── */

export function OrbitalReactor({ state, tddPhase, currentNode, gates }: OrbitalReactorProps) {
  const phase: TDDPhase =
    tddPhase ??
    (state === 'active'
      ? 'refactor'
      : state === 'critical'
        ? 'red'
        : state === 'offline'
          ? 'offline'
          : 'idle');

  return (
    <div className="relative" style={{ width: VIEWPORT, height: VIEWPORT }}>
      <svg
        viewBox={`0 0 ${VIEWPORT} ${VIEWPORT}`}
        width={VIEWPORT}
        height={VIEWPORT}
        className="absolute inset-0"
        role="img"
        aria-label="Pipeline orbital reactor visualization"
      >
        {/* Outer Orbit Rings — visible enough to show the structure */}
        <circle
          cx={CENTER}
          cy={CENTER}
          r={ORBIT_RADIUS}
          fill="none"
          stroke={phase === 'offline' ? 'rgb(239 68 68 / 0.12)' : 'rgb(255 255 255 / 0.1)'}
          strokeWidth={1}
        />
        <circle
          cx={CENTER}
          cy={CENTER}
          r={ORBIT_RADIUS + 28}
          fill="none"
          stroke={phase === 'offline' ? 'rgb(239 68 68 / 0.08)' : 'rgb(255 255 255 / 0.06)'}
          strokeDasharray="4 12"
          strokeWidth={0.5}
        />

        <OrbitalConnectors phase={phase} gates={gates} />

        {PIPELINE_NODES.map((node, i) => (
          <OrbitalNode
            key={node.gateId}
            index={i}
            label={node.label}
            Icon={node.Icon}
            gate={gates.find((g) => g.id === node.gateId)}
            phase={phase}
            isActive={currentNode === node.gateId}
          />
        ))}
      </svg>

      <OrbitalCore phase={phase} labelOverride={currentNode?.toUpperCase() ?? undefined} />
    </div>
  );
}
