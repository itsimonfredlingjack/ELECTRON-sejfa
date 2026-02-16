import { AnimatePresence, motion } from 'framer-motion';
import React from 'react';

/* ── Types ────────────────────────────────────────────────── */

export interface PowerUpSequenceProps {
  /** Called when the sequence completes and should be dismissed */
  onComplete: () => void;
}

/* ── Component ────────────────────────────────────────────── */

export function PowerUpSequence({ onComplete }: PowerUpSequenceProps) {
  const [status, setStatus] = React.useState('INITIALIZING...');
  const [visible, setVisible] = React.useState(true);

  // Play power-up sound on mount
  React.useEffect(() => {
    playPowerUpSound();
  }, []);

  // Status progression and auto-dismiss
  React.useEffect(() => {
    const timer1 = setTimeout(() => setStatus('SYSTEMS ONLINE'), 800);
    const timer2 = setTimeout(() => setVisible(false), 1500);
    const timer3 = setTimeout(() => onComplete(), 1700); // Allow fade-out to complete

    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
      clearTimeout(timer3);
    };
  }, [onComplete]);

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.5 }}
          className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-black"
        >
          {/* Reactor Core Visual */}
          <div className="relative flex h-64 w-64 items-center justify-center">
            {/* Ring 1: Outer (spinning clockwise) */}
            <motion.div
              initial={{ rotate: 0, scale: 0 }}
              animate={{ rotate: 360, scale: 1 }}
              transition={{ duration: 1.2, ease: 'easeOut' }}
              className="absolute inset-0 rounded-full border border-t-cyan-400/40 border-l-transparent border-r-white/5 border-b-white/5"
            />

            {/* Ring 2: Middle (counter-clockwise, dashed) */}
            <motion.div
              initial={{ rotate: 0, scale: 0 }}
              animate={{ rotate: -360, scale: 1 }}
              transition={{ duration: 1.0, ease: 'easeOut', delay: 0.1 }}
              className="absolute inset-4 rounded-full border border-dashed border-white/10"
            />

            {/* Ring 3: Inner (clockwise, dotted) */}
            <motion.div
              initial={{ rotate: 0, scale: 0 }}
              animate={{ rotate: 360, scale: 1 }}
              transition={{ duration: 0.8, ease: 'easeOut', delay: 0.2 }}
              className="absolute inset-8 rounded-full border border-dotted border-white/[0.06]"
            />

            {/* Core (pulsing) */}
            <motion.div
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.6, ease: 'easeOut' }}
              className="flex h-40 w-40 items-center justify-center rounded-full bg-gradient-to-br from-blue-500/20 to-cyan-500/20 backdrop-blur-md shadow-[0_0_80px_rgb(6_182_212/0.25),_0_0_120px_rgb(99_102_241/0.1)]"
            >
              {/* Inner glow pulse */}
              <motion.div
                animate={{ scale: [1, 1.1, 1], opacity: [0.6, 1, 0.6] }}
                transition={{ duration: 2, repeat: Number.POSITIVE_INFINITY }}
                className="absolute inset-0 rounded-full bg-gradient-to-br from-cyan-400/20 to-blue-500/20"
              />
            </motion.div>
          </div>

          {/* Branding Text */}
          <motion.h1
            className="mt-8 font-heading text-3xl font-bold tracking-wider text-cyan-400"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.3 }}
            style={{
              textShadow: '0 0 20px rgb(6 182 212 / 0.5), 0 0 40px rgb(6 182 212 / 0.2)',
            }}
          >
            SEJFA COMMAND CENTER
          </motion.h1>

          {/* Status Text */}
          <motion.p
            className="mt-2 font-mono text-sm text-white/50"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3, delay: 0.6 }}
          >
            {status}
          </motion.p>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/* ── Power-Up Sound Effect ────────────────────────────────── */

function playPowerUpSound(): void {
  try {
    const ctx = new AudioContext();
    if (ctx.state === 'suspended') void ctx.resume();

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(200, now);
    osc.frequency.exponentialRampToValueAtTime(600, now + 0.3);

    gain.gain.setValueAtTime(0.08, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.3);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.35);
  } catch {
    // Audio context not available — silent fail
  }
}
