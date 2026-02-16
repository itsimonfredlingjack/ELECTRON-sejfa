import { motion } from 'framer-motion';
import { CheckCircle2, Code2, FlaskConical, Rocket, ShieldCheck } from 'lucide-react';
import React from 'react';

import type { GateStatusUI, GateUI } from '../models/ui';

/* ── Sentinel definitions ─────────────────────────────────── */

type SentinelDef = {
    label: string;
    icon: React.ElementType;
    gateIndex: number;
};

const SENTINELS: SentinelDef[] = [
    { label: 'Tests', icon: FlaskConical, gateIndex: 0 },
    { label: 'Lint', icon: Code2, gateIndex: 1 },
    { label: 'Review', icon: ShieldCheck, gateIndex: 2 },
    { label: 'CI/CD', icon: Rocket, gateIndex: 3 },
];

/* ── Status helpers ───────────────────────────────────────── */

function statusColor(status: GateStatusUI): string {
    switch (status) {
        case 'running': return 'var(--primary)';
        case 'passed': return 'var(--success)';
        case 'failed': return 'var(--danger)';
        default: return 'var(--text-muted)';
    }
}

function statusBg(status: GateStatusUI): string {
    switch (status) {
        case 'running': return 'bg-primary/[0.06]';
        case 'passed': return 'bg-success/[0.06]';
        case 'failed': return 'bg-danger/[0.06]';
        default: return 'bg-bg-panel/30';
    }
}

function statusBorder(status: GateStatusUI): string {
    switch (status) {
        case 'running': return 'border-primary/30';
        case 'passed': return 'border-success/30';
        case 'failed': return 'border-danger/30';
        default: return 'border-border-subtle/50 border-dashed';
    }
}

/* ── Sentinel Card ────────────────────────────────────────── */

function SentinelCard({
    def,
    status,
}: {
    def: SentinelDef;
    status: GateStatusUI;
}) {
    const Icon = def.icon;
    const color = statusColor(status);
    const isRunning = status === 'running';
    const isPassed = status === 'passed';
    const isFailed = status === 'failed';

    return (
        <motion.div
            className={`relative flex flex-col items-center gap-2 px-4 py-3 rounded-xl border overflow-hidden transition-all duration-300 shine-sweep ${statusBg(status)} ${statusBorder(status)}`}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: def.gateIndex * 0.08 }}
        >
            {/* Scanning laser for running state */}
            {isRunning && (
                <div
                    className="absolute top-0 bottom-0 w-8 pointer-events-none"
                    style={{
                        background: `linear-gradient(90deg, transparent, rgb(var(--primary-rgb) / 0.15), transparent)`,
                        animation: 'sentinel-scan 2s ease-in-out infinite',
                    }}
                />
            )}

            {/* Flash effect on pass */}
            {isPassed && (
                <motion.div
                    className="absolute inset-0 rounded-xl bg-success/10 pointer-events-none"
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: [0, 0.4, 0], scale: [0.95, 1.02, 1.05] }}
                    transition={{ duration: 0.8, ease: 'easeOut' }}
                />
            )}

            {/* Shield icon */}
            <div
                className={`relative flex h-10 w-10 items-center justify-center rounded-lg transition-all duration-300 ${isPassed ? 'bg-success/10' : isFailed ? 'bg-danger/10' : isRunning ? 'bg-primary/10' : 'bg-bg-deep/50'
                    }`}
            >
                <Icon
                    className="h-5 w-5 transition-colors duration-300"
                    style={{ color }}
                />

                {/* Status badge overlay */}
                {isPassed && (
                    <motion.div
                        className="absolute -top-1 -right-1"
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ type: 'spring', stiffness: 500, damping: 25 }}
                    >
                        <CheckCircle2 className="h-3.5 w-3.5 text-success" />
                    </motion.div>
                )}
            </div>

            {/* Label */}
            <span
                className="text-[10px] font-bold uppercase tracking-[0.15em] transition-colors duration-300"
                style={{
                    color,
                    ...(isPassed && {
                        filter: `drop-shadow(0 0 6px ${color})`,
                    }),
                }}
            >
                {def.label}
            </span>

            {/* Failed shake */}
            {isFailed && (
                <motion.div
                    className="absolute inset-0 rounded-xl pointer-events-none"
                    animate={{ x: [0, -2, 2, -1, 1, 0] }}
                    transition={{ duration: 0.4, ease: 'easeInOut' }}
                />
            )}
        </motion.div>
    );
}

/* ── Main Component ───────────────────────────────────────── */

export function QualityGates({ gates }: { gates: GateUI[] }) {
    return (
        <div className="flex items-center gap-3">
            {SENTINELS.map((def) => {
                const gate = gates[def.gateIndex];
                const status: GateStatusUI = gate?.status ?? 'pending';
                return (
                    <SentinelCard
                        key={def.label}
                        def={def}
                        status={status}
                    />
                );
            })}
        </div>
    );
}
