import React from 'react';
import type { ReactorState } from '../components/ralph-reactor';

/* ═══════════════════════════════════════════════════════════
   Web Audio Synthesizer — SEJFA Command Center Sound Design
   ═══════════════════════════════════════════════════════════
   All sounds are generated programmatically. No audio files.
   Uses OscillatorNode + GainNode chains with envelopes.
   ═══════════════════════════════════════════════════════════ */

/* ── Shared AudioContext (lazy) ─────────────────────────── */

let _ctx: AudioContext | null = null;

function getCtx(): AudioContext {
    if (!_ctx) _ctx = new AudioContext();
    // Resume if suspended (browsers require user gesture)
    if (_ctx.state === 'suspended') void _ctx.resume();
    return _ctx;
}

/* ── Master Volume ──────────────────────────────────────── */

const MASTER_VOLUME = 0.12; // Keep it subtle — these are UI sounds

/* ── Sound Primitives ───────────────────────────────────── */

/** Play a tone with an ADSR-ish envelope. Returns stop function. */
function tone(opts: {
    frequency: number;
    type?: OscillatorType;
    duration?: number; // seconds, 0 = infinite (must stop manually)
    attack?: number;
    decay?: number;
    sustain?: number;
    release?: number;
    volume?: number;
    detune?: number;
}): { stop: () => void } {
    const ctx = getCtx();
    const now = ctx.currentTime;

    const {
        frequency,
        type = 'sine',
        duration = 0.3,
        attack = 0.01,
        decay = 0.05,
        sustain = 0.6,
        release = 0.1,
        volume = MASTER_VOLUME,
        detune = 0,
    } = opts;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = type;
    osc.frequency.value = frequency;
    osc.detune.value = detune;

    // ADSR envelope
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(volume, now + attack);
    gain.gain.linearRampToValueAtTime(volume * sustain, now + attack + decay);

    if (duration > 0) {
        const releaseStart = now + duration - release;
        gain.gain.setValueAtTime(volume * sustain, releaseStart);
        gain.gain.linearRampToValueAtTime(0, now + duration);
        osc.stop(now + duration + 0.05);
    }

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);

    return {
        stop: () => {
            try {
                const t = ctx.currentTime;
                gain.gain.cancelScheduledValues(t);
                gain.gain.setValueAtTime(gain.gain.value, t);
                gain.gain.linearRampToValueAtTime(0, t + 0.08);
                osc.stop(t + 0.1);
            } catch {
                /* already stopped */
            }
        },
    };
}

/** Frequency sweep (rising or falling). Great for sci-fi effects. */
function sweep(opts: {
    from: number;
    to: number;
    duration?: number;
    type?: OscillatorType;
    volume?: number;
}): void {
    const ctx = getCtx();
    const now = ctx.currentTime;
    const { from, to, duration = 0.3, type = 'sine', volume = MASTER_VOLUME } = opts;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = type;
    osc.frequency.setValueAtTime(from, now);
    osc.frequency.exponentialRampToValueAtTime(Math.max(to, 1), now + duration);

    gain.gain.setValueAtTime(volume, now);
    gain.gain.linearRampToValueAtTime(0, now + duration);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + duration + 0.05);
}

/* ── Sound Effects ──────────────────────────────────────── */

/** Low ambient hum — reactor idle. Returns stop function. */
function playIdleHum(): { stop: () => void } {
    const ctx = getCtx();
    const now = ctx.currentTime;

    // Two detuned sawtooths for thickness
    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const gain = ctx.createGain();
    const filter = ctx.createBiquadFilter();

    osc1.type = 'sawtooth';
    osc1.frequency.value = 55; // A1
    osc2.type = 'sawtooth';
    osc2.frequency.value = 55.3; // Slight detune for warmth

    filter.type = 'lowpass';
    filter.frequency.value = 200;
    filter.Q.value = 2;

    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(MASTER_VOLUME * 0.3, now + 1.5); // Slow fade in

    osc1.connect(filter);
    osc2.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);

    osc1.start(now);
    osc2.start(now);

    return {
        stop: () => {
            try {
                const t = ctx.currentTime;
                gain.gain.cancelScheduledValues(t);
                gain.gain.setValueAtTime(gain.gain.value, t);
                gain.gain.linearRampToValueAtTime(0, t + 0.5);
                osc1.stop(t + 0.6);
                osc2.stop(t + 0.6);
            } catch {
                /* already stopped */
            }
        },
    };
}

/** Active processing — deeper resonant pulse */
function playActiveHum(): { stop: () => void } {
    const ctx = getCtx();
    const now = ctx.currentTime;

    const osc = ctx.createOscillator();
    const lfo = ctx.createOscillator(); // Pulse modulation
    const lfoGain = ctx.createGain();
    const masterGain = ctx.createGain();
    const filter = ctx.createBiquadFilter();

    osc.type = 'sawtooth';
    osc.frequency.value = 80;

    lfo.type = 'sine';
    lfo.frequency.value = 2; // 2Hz pulse
    lfoGain.gain.value = MASTER_VOLUME * 0.15;

    filter.type = 'lowpass';
    filter.frequency.value = 300;
    filter.Q.value = 4;

    masterGain.gain.setValueAtTime(0, now);
    masterGain.gain.linearRampToValueAtTime(MASTER_VOLUME * 0.4, now + 0.8);

    // LFO → master gain (amplitude modulation)
    lfo.connect(lfoGain);
    lfoGain.connect(masterGain.gain);

    osc.connect(filter);
    filter.connect(masterGain);
    masterGain.connect(ctx.destination);

    osc.start(now);
    lfo.start(now);

    return {
        stop: () => {
            try {
                const t = ctx.currentTime;
                masterGain.gain.cancelScheduledValues(t);
                masterGain.gain.setValueAtTime(masterGain.gain.value, t);
                masterGain.gain.linearRampToValueAtTime(0, t + 0.3);
                osc.stop(t + 0.4);
                lfo.stop(t + 0.4);
            } catch {
                /* already stopped */
            }
        },
    };
}

/** Critical alert — two-note descending warning */
function playCriticalAlert(): void {
    // G5 → E5 descending minor third — classic warning interval
    tone({ frequency: 784, type: 'square', duration: 0.15, volume: MASTER_VOLUME * 0.7 });
    setTimeout(() => {
        tone({ frequency: 659, type: 'square', duration: 0.2, volume: MASTER_VOLUME * 0.6 });
    }, 180);
}

/** Success chirp — quick rising sweep + bright tone */
function playSuccessChirp(): void {
    sweep({ from: 600, to: 1400, duration: 0.08, type: 'sine', volume: MASTER_VOLUME * 0.5 });
    setTimeout(() => {
        tone({ frequency: 1047, type: 'sine', duration: 0.12, attack: 0.005, volume: MASTER_VOLUME * 0.6 }); // C6
        tone({ frequency: 1319, type: 'sine', duration: 0.15, attack: 0.01, volume: MASTER_VOLUME * 0.4 }); // E6 (major chord)
    }, 60);
}

/** Kill switch armed — rising capacitor charge */
function playKillArmed(): void {
    sweep({ from: 200, to: 2000, duration: 0.6, type: 'sawtooth', volume: MASTER_VOLUME * 0.5 });
    // Secondary harmonic for richness
    setTimeout(() => {
        sweep({ from: 400, to: 3000, duration: 0.5, type: 'sine', volume: MASTER_VOLUME * 0.2 });
    }, 100);
}

/** Offline — descending power-down whine */
function playOffline(): void {
    sweep({ from: 800, to: 60, duration: 0.8, type: 'sine', volume: MASTER_VOLUME * 0.4 });
}

/* ── React Hook ─────────────────────────────────────────── */

export function useSoundEffects(
    reactorState: ReactorState,
    killArmed: boolean,
) {
    const prevState = React.useRef<ReactorState>(reactorState);
    const humRef = React.useRef<{ stop: () => void } | null>(null);

    // Manage looping hums based on reactor state
    React.useEffect(() => {
        // Stop any existing hum before starting a new one
        humRef.current?.stop();
        humRef.current = null;

        if (reactorState === 'idle') {
            humRef.current = playIdleHum();
        } else if (reactorState === 'active') {
            humRef.current = playActiveHum();
        }

        return () => {
            humRef.current?.stop();
            humRef.current = null;
        };
    }, [reactorState]);

    // One-shot sounds on state transitions
    React.useEffect(() => {
        const prev = prevState.current;
        prevState.current = reactorState;

        // Don't fire on initial mount
        if (prev === reactorState) return;

        if (reactorState === 'critical') {
            playCriticalAlert();
        } else if (reactorState === 'offline') {
            playOffline();
        } else if (prev === 'critical') {
            // Recovered from critical — play success
            playSuccessChirp();
        } else if (prev === 'active' && reactorState === 'idle') {
            // Work completed — play success
            playSuccessChirp();
        }
    }, [reactorState]);

    // Kill switch armed sound
    const prevKillArmed = React.useRef(false);
    React.useEffect(() => {
        if (killArmed && !prevKillArmed.current) {
            playKillArmed();
        }
        prevKillArmed.current = killArmed;
    }, [killArmed]);
}
