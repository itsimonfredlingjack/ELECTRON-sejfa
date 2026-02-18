import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
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
  const reduceMotion = useReducedMotion() ?? false;

  // Play power-up sound on mount
  React.useEffect(() => {
    playPowerUpSound();
  }, []);

  // Status progression and auto-dismiss
  React.useEffect(() => {
    const timer1 = setTimeout(() => setStatus('SYSTEMS ONLINE'), 800);
    const timer2 = setTimeout(() => setVisible(false), 1500);
    const timer3 = setTimeout(() => onComplete(), 1700);

    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
      clearTimeout(timer3);
    };
  }, [onComplete]);

  const ringTransition = reduceMotion ? { duration: 0 } : { duration: 1, ease: 'easeOut' as const };
  const ringInitial = reduceMotion ? { rotate: 0, scale: 1 } : { rotate: 0, scale: 0 };
  const ringAnimate = reduceMotion ? { rotate: 0, scale: 1 } : { rotate: 360, scale: 1 };
  const ring2Animate = reduceMotion ? { rotate: 0, scale: 1 } : { rotate: -360, scale: 1 };
  const coreTransition = reduceMotion
    ? { duration: 0 }
    : { duration: 0.6, ease: 'easeOut' as const };
  const exitTransition = reduceMotion ? { duration: 0.1 } : { duration: 0.5 };
  const textTransition = reduceMotion ? { duration: 0 } : { duration: 0.4, delay: 0.3 };

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={exitTransition}
          className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-black"
        >
          {/* Reactor Core Visual */}
          <div className="relative flex h-64 w-64 items-center justify-center">
            {/* Ring 1: Outer (spinning clockwise) */}
            <motion.div
              initial={ringInitial}
              animate={ringAnimate}
              transition={ringTransition}
              className="absolute inset-0 rounded-full border border-t-primary/40 border-l-transparent border-r-white/5 border-b-white/5"
            />

            {/* Ring 2: Middle (counter-clockwise, dashed) */}
            <motion.div
              initial={ringInitial}
              animate={ring2Animate}
              transition={{ ...ringTransition, delay: reduceMotion ? 0 : 0.1 }}
              className="absolute inset-4 rounded-full border border-dashed border-white/10"
            />

            {/* Ring 3: Inner (clockwise, dotted) */}
            <motion.div
              initial={ringInitial}
              animate={ringAnimate}
              transition={{ ...ringTransition, delay: reduceMotion ? 0 : 0.2 }}
              className="absolute inset-8 rounded-full border border-dotted border-white/6"
            />

            {/* Core */}
            <motion.div
              initial={reduceMotion ? { scale: 1, opacity: 1 } : { scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={coreTransition}
              className="flex h-40 w-40 items-center justify-center rounded-full bg-linear-to-br from-primary/20 to-secondary/20 backdrop-blur-md shadow-[0_0_80px_rgb(var(--primary-rgb)/0.25),0_0_120px_rgb(var(--secondary-rgb)/0.1)]"
            >
              {!reduceMotion && (
                <motion.div
                  animate={{ scale: [1, 1.1, 1], opacity: [0.6, 1, 0.6] }}
                  transition={{ duration: 2, repeat: Number.POSITIVE_INFINITY }}
                  className="absolute inset-0 rounded-full bg-linear-to-br from-primary/20 to-secondary/20"
                />
              )}
            </motion.div>
          </div>

          {/* Branding Text */}
          <motion.h1
            className="mt-8 font-heading text-3xl font-bold tracking-wider text-primary"
            initial={reduceMotion ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={textTransition}
            style={{
              textShadow:
                '0 0 20px rgb(var(--primary-rgb) / 0.5), 0 0 40px rgb(var(--primary-rgb) / 0.2)',
            }}
          >
            AGENTIC DEVOPS CENTER
          </motion.h1>

          {/* Status Text */}
          <motion.p
            className="mt-2 font-mono text-sm text-white/50"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={reduceMotion ? { duration: 0 } : { duration: 0.3, delay: 0.6 }}
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
