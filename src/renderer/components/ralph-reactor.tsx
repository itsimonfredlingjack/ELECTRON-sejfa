import { motion } from 'framer-motion';
import React from 'react';

/* ── Types ────────────────────────────────────────────────── */

export type ReactorState = 'idle' | 'active' | 'critical' | 'offline';

export interface RalphReactorProps {
    state: ReactorState;
    currentNode: string | null;
}

/* ── Color Maps ───────────────────────────────────────────── */

const GRADIENT: Record<ReactorState, string> = {
    idle: 'from-blue-500/20 to-cyan-500/20',
    active: 'from-emerald-500/40 to-teal-500/40',
    critical: 'from-red-600/40 to-orange-600/40',
    offline: 'from-gray-700/20 to-gray-800/20',
};

const GLOW: Record<ReactorState, string> = {
    idle: 'shadow-[0_0_80px_rgb(6_182_212/0.25)]',
    active: 'shadow-[0_0_80px_rgb(16_185_129/0.3)]',
    critical: 'shadow-[0_0_80px_rgb(220_38_38/0.3)]',
    offline: 'shadow-[0_0_40px_rgb(30_30_40/0.2)]',
};

const RING_BORDER: Record<ReactorState, string> = {
    idle: 'border-t-cyan-400/40 border-l-transparent border-r-white/5 border-b-white/5',
    active: 'border-t-emerald-400/50 border-l-transparent border-r-white/5 border-b-white/5',
    critical: 'border-t-red-500/50 border-l-transparent border-r-white/5 border-b-white/5',
    offline: 'border-t-gray-500/20 border-l-transparent border-r-white/3 border-b-white/3',
};

/* ── Component ────────────────────────────────────────────── */

export function RalphReactor({ state, currentNode }: RalphReactorProps) {
    const label = state === 'offline' ? 'OFF' : (currentNode ?? 'IDLE').toUpperCase();
    const sublabel = state === 'active' ? 'PROCESSING' : state === 'critical' ? 'ALERT' : 'SYSTEM READY';

    const outerSpeed = state === 'active' ? 4 : 20;
    const innerSpeed = state === 'active' ? 6 : 15;
    const pulseSpeed = state === 'active' ? 1 : state === 'critical' ? 0.8 : 4;

    return (
        <div className="relative flex h-64 w-64 items-center justify-center">
            {/* Ring 1: Outer (spinning) */}
            <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: outerSpeed, repeat: Number.POSITIVE_INFINITY, ease: 'linear' }}
                className={`absolute inset-0 rounded-full border ${RING_BORDER[state]}`}
            />

            {/* Ring 2: Inner (counter-spinning, dashed) */}
            <motion.div
                animate={{ rotate: -360 }}
                transition={{ duration: innerSpeed, repeat: Number.POSITIVE_INFINITY, ease: 'linear' }}
                className="absolute inset-4 rounded-full border border-dashed border-white/10"
            />

            {/* Ring 3: Third ring (slow spin, dotted) */}
            <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 30, repeat: Number.POSITIVE_INFINITY, ease: 'linear' }}
                className="absolute inset-8 rounded-full border border-dotted border-white/[0.06]"
            />

            {/* The Core (pulsing) */}
            <motion.div
                animate={{ scale: [1, 1.05, 1], opacity: [0.8, 1, 0.8] }}
                transition={{ duration: pulseSpeed, repeat: Number.POSITIVE_INFINITY }}
                className={`flex h-40 w-40 items-center justify-center rounded-full bg-gradient-to-br ${GRADIENT[state]} backdrop-blur-md ${GLOW[state]}`}
            >
                <div className="text-center">
                    <h1 className="font-mono text-4xl font-bold tracking-tighter text-white">
                        {label}
                    </h1>
                    <p className="mt-1 font-mono text-xs text-white/50">
                        {sublabel}
                    </p>
                </div>
            </motion.div>
        </div>
    );
}
