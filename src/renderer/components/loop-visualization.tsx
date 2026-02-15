import { motion } from 'framer-motion';
import { AlertCircle, CheckCircle2, Circle, Disc, PlayCircle, XCircle } from 'lucide-react';
import React from 'react';

import type { GateId, GateUI } from '../models/ui';

export type LoopVisualizationProps = {
  gates: GateUI[];
  activeGateId: GateId | null;
  onSelectGate: (id: GateId) => void;
};

// Layout constants
const VIEWBOX_SIZE = 400;
const CENTER = VIEWBOX_SIZE / 2;
const RADIUS = 140;

function getCoordinates(index: number, total: number) {
  // Start from top (-90 degrees) and go clockwise
  const angle = (index / total) * 360 - 90;
  const rad = (angle * Math.PI) / 180;
  return {
    x: CENTER + RADIUS * Math.cos(rad),
    y: CENTER + RADIUS * Math.sin(rad),
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

export function LoopVisualization({ gates, activeGateId, onSelectGate }: LoopVisualizationProps) {
  return (
    <div className="relative flex h-full w-full flex-col items-center justify-center p-4">
      {/* Background Ambient Glows */}
      <div className="absolute inset-0 flex items-center justify-center opacity-10 pointer-events-none">
        <div className="h-[300px] w-[300px] rounded-full border border-primary/20" />
        <div className="absolute h-[400px] w-[400px] rounded-full border border-primary/10" />
      </div>

      <svg
        viewBox={`0 0 ${VIEWBOX_SIZE} ${VIEWBOX_SIZE}`}
        className="h-full w-full max-h-[600px] max-w-[600px] overflow-visible"
        style={{ minHeight: '300px' }}
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
        </defs>

        {/* Base Loop Track */}
        <circle
          cx={CENTER}
          cy={CENTER}
          r={RADIUS}
          fill="none"
          stroke="var(--border-subtle)"
          strokeWidth="2"
        />

        {/* Animated Pulse (Orbiting Data Packet) */}
        {gates.some((g) => g.status === 'running') && (
          <motion.circle
            cx={CENTER}
            cy={CENTER}
            r={RADIUS}
            fill="none"
            stroke="var(--primary)"
            strokeWidth="3"
            strokeLinecap="round"
            strokeDasharray="100 800" // Length of the arc segment
            animate={{ rotate: 360 }}
            transition={{ duration: 4, repeat: Number.POSITIVE_INFINITY, ease: 'linear' }}
            className="opacity-60 drop-shadow-[0_0_14px_rgb(var(--primary-rgb)_/_0.28)]"
          />
        )}

        {/* Nodes */}
        {gates.map((gate, i) => {
          const coords = getCoordinates(i, gates.length);
          const isSelected = gate.id === activeGateId;
          const status = gate.status;

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
              className="cursor-pointer group outline-none focus-visible:opacity-80"
              style={{ transformBox: 'fill-box', transformOrigin: 'center' }}
              aria-label={`Select ${gate.label} gate`}
              aria-pressed={isSelected}
            >
              {/* Click target (invisible but larger) */}
              <circle cx={coords.x} cy={coords.y} r={40} fill="transparent" />

              {/* Animated Selection Ring */}
              {isSelected && (
                <motion.circle
                  cx={coords.x}
                  cy={coords.y}
                  r={28}
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

              {/* Node Background */}
              <circle
                cx={coords.x}
                cy={coords.y}
                r={24}
                className={`transition-all duration-300 ${
                  isSelected
                    ? 'fill-bg-panel stroke-primary'
                    : 'fill-bg-deep stroke-border-subtle group-hover:stroke-primary/50'
                }`}
                strokeWidth="2"
              />

              {/* Foreign Object for React Icon */}
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
                y={coords.y + 30}
                width={120}
                height={40}
                className="overflow-visible pointer-events-none"
              >
                <div className="flex flex-col items-center justify-center text-center">
                  <span
                    className={`text-[11px] font-semibold tracking-wide transition-colors ${
                      isSelected ? 'text-primary' : 'text-text-muted group-hover:text-text-primary'
                    }`}
                  >
                    {gate.label}
                  </span>
                  {status === 'failed' && (
                    <span className="text-[9px] text-danger font-mono mt-0.5">FAILED</span>
                  )}
                </div>
              </foreignObject>
            </g>
          );
        })}

        {/* Central Hub Display (Inside the Loop) */}
        <foreignObject
          x={CENTER - 80}
          y={CENTER - 60}
          width={160}
          height={120}
          className="pointer-events-none"
        >
          <div className="flex h-full w-full flex-col items-center justify-center text-center">
            <span className="text-[11px] font-medium tracking-wide text-text-muted mb-1 opacity-70">
              Selected Gate
            </span>
            <span className="text-2xl font-bold text-text-primary tracking-tight font-heading">
              {activeGateId ? activeGateId.toUpperCase() : 'IDLE'}
            </span>

            {gates.find((g) => g.id === activeGateId)?.status === 'running' && (
              <span className="mt-2 flex items-center gap-2 text-[10px] text-primary font-mono uppercase animate-pulse">
                <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                Processing
              </span>
            )}
          </div>
        </foreignObject>
      </svg>
    </div>
  );
}
