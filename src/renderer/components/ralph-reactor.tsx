import { motion } from 'framer-motion';
import { Activity, Code2, Eye, Zap } from 'lucide-react';
import React from 'react';

import type { GateUI } from '../models/ui';

/* ── Phase derivation ────────────────────────────────────── */

export type ReactorPhase = 'idle' | 'red' | 'green' | 'refactor' | 'verify';

export function deriveReactorPhase(gates: GateUI[]): ReactorPhase {
    if (gates.length === 0 || gates.every((g) => g.status === 'pending')) return 'idle';

    // If any gate is running, determine phase from which gate
    const running = gates.find((g) => g.status === 'running');
    if (running) {
        // local/tests = red (writing tests) or green (implementing)
        if (running.id === 'local') return 'red';
        if (running.id === 'ci') return 'green';
        if (running.id === 'review') return 'refactor';
        return 'verify'; // deploy, verify
    }

    // If any gate failed, show red
    if (gates.some((g) => g.status === 'failed')) return 'red';

    // All passed = green
    if (gates.every((g) => g.status === 'passed')) return 'green';

    // Mixed states — find the furthest active
    const lastPassed = [...gates].reverse().find((g) => g.status === 'passed');
    if (lastPassed) {
        const idx = gates.indexOf(lastPassed);
        if (idx >= 2) return 'refactor';
        return 'green';
    }

    return 'idle';
}

/* ── Phase config ─────────────────────────────────────────── */

type PhaseConfig = {
    label: string;
    sublabel: string;
    colorVar: string;
    rgbVar: string;
    animClass: string;
    duration: number;
    icon: React.ElementType;
};

const PHASE_CONFIG: Record<ReactorPhase, PhaseConfig> = {
    idle: {
        label: 'STANDBY',
        sublabel: 'Awaiting Task',
        colorVar: 'var(--text-muted)',
        rgbVar: '100 100 118',
        animClass: '',
        duration: 0,
        icon: Eye,
    },
    red: {
        label: 'RED',
        sublabel: 'Writing Failing Test...',
        colorVar: 'var(--danger)',
        rgbVar: 'var(--danger-rgb)',
        animClass: 'reactor-pulse-red',
        duration: 1.2,
        icon: Zap,
    },
    green: {
        label: 'GREEN',
        sublabel: 'Implementation Passing...',
        colorVar: 'var(--success)',
        rgbVar: 'var(--success-rgb)',
        animClass: 'reactor-pulse-green',
        duration: 3,
        icon: Activity,
    },
    refactor: {
        label: 'REFACTOR',
        sublabel: 'Optimizing Code...',
        colorVar: 'var(--primary)',
        rgbVar: 'var(--primary-rgb)',
        animClass: 'reactor-pulse-blue',
        duration: 2,
        icon: Code2,
    },
    verify: {
        label: 'VERIFY',
        sublabel: 'Verifying Quality...',
        colorVar: 'var(--secondary)',
        rgbVar: 'var(--secondary-rgb)',
        animClass: 'reactor-pulse-violet',
        duration: 2.5,
        icon: Eye,
    },
};

/* ── Reactor SVG ──────────────────────────────────────────── */

function ReactorRing({
    radius,
    color,
    phase,
    delay,
    dashArray,
}: {
    radius: number;
    color: string;
    phase: ReactorPhase;
    delay: number;
    dashArray: string;
}) {
    const isActive = phase !== 'idle';
    return (
        <motion.circle
            cx="120"
            cy="120"
            r={radius}
            fill="none"
            stroke={color}
            strokeWidth={isActive ? 1.5 : 0.8}
            strokeDasharray={dashArray}
            strokeLinecap="round"
            opacity={isActive ? 0.5 : 0.15}
            style={{
                transformOrigin: '120px 120px',
                animation: isActive
                    ? `reactor-ring-spin ${12 + delay * 4}s linear infinite ${delay > 0 ? 'reverse' : 'normal'}`
                    : 'none',
            }}
        />
    );
}

/* ── Main Component ───────────────────────────────────────── */

export function RalphReactor({ gates }: { gates: GateUI[] }) {
    const phase = deriveReactorPhase(gates);
    const config = PHASE_CONFIG[phase];
    const Icon = config.icon;
    const isActive = phase !== 'idle';

    return (
        <div className="flex flex-col items-center justify-center gap-4 select-none">
            {/* Reactor Core */}
            <div className="relative">
                {/* Outer glow */}
                {isActive && (
                    <motion.div
                        className="absolute -inset-6 rounded-full"
                        style={{
                            animation: `${config.animClass} ${config.duration}s ease-in-out infinite`,
                        }}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ duration: 0.5 }}
                    />
                )}

                {/* SVG Rings */}
                <svg
                    width="240"
                    height="240"
                    viewBox="0 0 240 240"
                    className="relative z-10"
                >
                    {/* Background circle */}
                    <circle
                        cx="120"
                        cy="120"
                        r="100"
                        fill="none"
                        stroke={isActive ? config.colorVar : 'rgb(255 255 255 / 0.04)'}
                        strokeWidth="0.5"
                        opacity={isActive ? 0.15 : 1}
                    />

                    {/* Concentric dashed rings */}
                    <ReactorRing radius={95} color={config.colorVar} phase={phase} delay={0} dashArray="6 10" />
                    <ReactorRing radius={82} color={config.colorVar} phase={phase} delay={1} dashArray="3 8" />
                    <ReactorRing radius={68} color={config.colorVar} phase={phase} delay={2} dashArray="8 14" />

                    {/* Inner core gradient */}
                    <defs>
                        <radialGradient id="reactor-core" cx="50%" cy="50%" r="50%">
                            <stop offset="0%" stopColor={config.colorVar} stopOpacity={isActive ? 0.25 : 0.05} />
                            <stop offset="70%" stopColor={config.colorVar} stopOpacity={isActive ? 0.08 : 0.02} />
                            <stop offset="100%" stopColor={config.colorVar} stopOpacity="0" />
                        </radialGradient>
                    </defs>
                    <circle cx="120" cy="120" r="55" fill="url(#reactor-core)" />
                </svg>

                {/* Center icon + label */}
                <div className="absolute inset-0 z-20 flex flex-col items-center justify-center">
                    <motion.div
                        key={phase}
                        initial={{ scale: 0.8, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                    >
                        <Icon
                            className="h-8 w-8 mb-2"
                            style={{ color: config.colorVar }}
                        />
                    </motion.div>
                    <motion.span
                        key={`label-${phase}`}
                        className="text-[11px] font-bold tracking-[0.2em] uppercase"
                        style={{ color: config.colorVar }}
                        initial={{ opacity: 0, y: 4 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1 }}
                    >
                        {config.label}
                    </motion.span>
                </div>
            </div>

            {/* Phase description */}
            <motion.p
                key={`sub-${phase}`}
                className="text-sm font-medium text-text-secondary text-center"
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15 }}
            >
                {config.sublabel}
            </motion.p>
        </div>
    );
}
