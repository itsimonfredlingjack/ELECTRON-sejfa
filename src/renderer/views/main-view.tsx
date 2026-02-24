import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import {
  ChevronDown,
  ChevronUp,
  Cloud,
  LayoutGrid,
  Volume2,
  VolumeX,
  Wifi,
  WifiOff,
  X,
} from 'lucide-react';
import React from 'react';

import type { Result } from '../../shared/api';
import { deriveGates, deriveObjectiveText, deriveTimelineEvents } from '../adapters/loop-adapters';
import { ActivityPanel, parseActivity } from '../components/activity-panel';
import { CompletionPanel } from '../components/completion-panel';
import { CostCounter } from '../components/cost-counter';
import { EvidenceDrawer } from '../components/evidence-drawer';
import { FileMonitorToggle } from '../components/file-monitor-toggle';
import { KeyboardHelp } from '../components/keyboard-help';
import { MissionHeader } from '../components/mission-header';
import { OrbitalReactor, type TDDPhase } from '../components/orbital-reactor';
import { PowerUpSequence } from '../components/power-up-sequence';
import { QualityGates } from '../components/quality-gates';
import type { ReactorState } from '../components/ralph-reactor';
import { StuckAlert } from '../components/stuck-alert';
import { ThoughtStream } from '../components/thought-stream';
import { ActionBar, type ToolbarMode } from '../components/toolbar';
import { useElectronApi } from '../hooks/use-electron-api';
import { useKeyboardShortcuts } from '../hooks/use-keyboard-shortcuts';
import { useSoundEffects } from '../hooks/use-sound-effects';
import type { GateId } from '../models/ui';
import { runSimulation } from '../simulation';
import {
  loopActions,
  useAppMode,
  useCurrentNode,
  useEvents,
  useFileTailActive,
  useFileTailConnected,
  useFileTailIterations,
  useGates,
  useObjective,
} from '../stores/loop-store';
import {
  systemActions,
  useProcesses,
  useSocketConnected,
  useSocketLastError,
  useMonitorConnected,
  useSoundMuted,
} from '../stores/system-store';

/* ── Helpers ──────────────────────────────────────────────── */

function nowIso() {
  return new Date().toISOString();
}
function msUntil(iso: string) {
  const ms = Date.parse(iso);
  if (Number.isNaN(ms)) return 0;
  return Math.max(0, ms - Date.now());
}
function isOk(res: Result): res is { ok: true } {
  return res.ok;
}

/* ── Satellite Component ──────────────────────────────────── */

function Satellite({
  icon: Icon,
  label,
  active,
  side,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  active: boolean;
  side: 'left' | 'right';
}) {
  return (
    <div
      className={`absolute top-1/2 -translate-y-1/2 ${side === 'left' ? '-left-24' : '-right-24'} flex flex-col items-center gap-2 transition-opacity duration-500 ${active ? 'opacity-100' : 'opacity-50'}`}
    >
      <div
        className={`relative flex h-12 w-12 items-center justify-center rounded-xl bg-black/50 border backdrop-blur-md ${active ? 'shadow-[0_0_20px_rgb(6_182_212/0.15)] border-cyan-500/30' : 'border-white/15'}`}
      >
        <Icon className={`h-6 w-6 ${active ? 'text-cyan-400' : 'text-white/35'}`} />
        {active && (
          <span className="absolute -top-1 -right-1 block h-2.5 w-2.5 rounded-full bg-cyan-400 shadow-[0_0_10px_rgb(6_182_212)] animate-pulse" />
        )}
      </div>
      <span className="text-[9px] font-mono font-bold tracking-widest text-white/50 uppercase">
        {label}
      </span>

      {/* Data Beam */}
      {active && (
        <div
          className={`absolute top-1/2 -translate-y-1/2 h-0.5 w-24 bg-linear-to-r ${side === 'left' ? 'from-transparent to-cyan-500/40 -right-24' : 'from-cyan-500/40 to-transparent -left-24'}`}
        />
      )}
    </div>
  );
}

/* ── MainView ─────────────────────────────────────────────── */

export function MainView() {
  const api = useElectronApi();

  const objective = useObjective();
  const gateStates = useGates();
  const eventsRaw = useEvents();
  const currentNode = useCurrentNode();
  const appMode = useAppMode();

  const socketConnected = useSocketConnected();
  const socketLastError = useSocketLastError();
  const processes = useProcesses();

  const fileTailConnected = useFileTailConnected();
  const fileTailActive = useFileTailActive();
  const fileTailIterations = useFileTailIterations();

  const [selectedGateId, setSelectedGateId] = React.useState<GateId>('local');
  const [drawerOpen, setDrawerOpen] = React.useState(false);
  const [helpOpen, setHelpOpen] = React.useState(false);
  const [overlayDismissed, setOverlayDismissed] = React.useState(false);
  const [showPowerUp, setShowPowerUp] = React.useState(true);
  const [consoleExpanded, setConsoleExpanded] = React.useState(false);
  const [actionFeedback, setActionFeedback] = React.useState<{
    message: string;
    type: 'success' | 'pending' | 'error';
  } | null>(null);

  React.useEffect(() => {
    if (socketConnected) setOverlayDismissed(false);
  }, [socketConnected]);

  const [killArmedUntil, setKillArmedUntil] = React.useState<string | null>(null);
  const [killToken, setKillToken] = React.useState<string | null>(null);
  const killTimerRef = React.useRef<number | null>(null);

  /* ── Derived State ─────────────────────────────────────── */

  const derivedObjective = React.useMemo(
    () => deriveObjectiveText(objective, eventsRaw),
    [objective, eventsRaw],
  );
  const derivedGates = React.useMemo(
    () => deriveGates(gateStates, currentNode),
    [gateStates, currentNode],
  );
  const timelineEvents = React.useMemo(() => deriveTimelineEvents(eventsRaw), [eventsRaw]);
  const selectedGate = React.useMemo(
    () => derivedGates.gates.find((g) => g.id === selectedGateId) ?? null,
    [derivedGates.gates, selectedGateId],
  );

  // Reactor state calculation (LEGACY) — also check Monitor API connection
  const monitorConnected = useMonitorConnected();
  const legacyReactorState: ReactorState = React.useMemo(() => {
    if (socketConnected || monitorConnected) {
      if (derivedGates.gates.some((g) => g.status === 'failed')) return 'critical';
      if (Object.values(processes).some((p) => p?.state === 'running')) return 'active';
      if (monitorConnected && derivedGates.gates.some((g) => g.status === 'running')) return 'active';
      return 'idle';
    }
    if (fileTailConnected) {
      if (fileTailActive) return 'active';
      return 'idle';
    }
    return 'offline';
  }, [socketConnected, monitorConnected, processes, derivedGates.gates, fileTailConnected, fileTailActive]);

  // DEV: Shift+D cycles through TDD phases
  const DEBUG_PHASES: TDDPhase[] = ['idle', 'red', 'refactor', 'green', 'verify', 'offline'];
  const [debugPhase, setDebugPhase] = React.useState<TDDPhase | null>(null);

  React.useEffect(() => {
    function handleDebugKey(e: KeyboardEvent) {
      if (e.shiftKey && e.key === 'D') {
        setDebugPhase((prev) => {
          if (prev === null) {
            const first = DEBUG_PHASES[1];
            return first ?? DEBUG_PHASES[0] ?? 'idle';
          }
          const idx = DEBUG_PHASES.indexOf(prev);
          const next = idx + 1;
          const nextPhase = next >= DEBUG_PHASES.length ? DEBUG_PHASES[0] : DEBUG_PHASES[next];
          return nextPhase ?? 'idle';
        });
      }
    }
    window.addEventListener('keydown', handleDebugKey);
    return () => window.removeEventListener('keydown', handleDebugKey);
  }, []);

  // TDD Phase Calculation
  const tddPhase: TDDPhase = React.useMemo(() => {
    if (debugPhase) return debugPhase;
    if (legacyReactorState === 'offline') return 'offline';
    if (legacyReactorState === 'idle') return 'idle';

    const gates = derivedGates.gates;
    const hasFailures = gates.some((g) => g.status === 'failed');
    const allPassed = gates.every((g) => g.status === 'passed');
    const isRunning = gates.some((g) => g.status === 'running');

    if (hasFailures) return 'red';
    if (allPassed) return 'verify';
    if (isRunning) {
      // If we are running but haven't failed yet, and aren't all passed -> REFACTOR/BUILD
      // Or if we are 'Green' (passed tests) but deploying?
      // For simplicity: Running = Refactor (Working)
      return 'refactor';
    }
    // If we have some passed but stopped?
    if (gates.some((g) => g.status === 'passed')) return 'green';

    return 'idle';
  }, [debugPhase, legacyReactorState, derivedGates.gates]);

  // Sound effects — reacts to state transitions
  const soundMuted = useSoundMuted();
  useSoundEffects(legacyReactorState, killArmedUntil !== null, soundMuted);

  const controlsEnabled = appMode === 'control';
  const anyStartingOrRunning = Object.values(processes).some(
    (p) =>
      p?.state === 'starting' ||
      p?.state === 'running' ||
      p?.state === 'stopping' ||
      p?.state === 'backing_off',
  );

  // Thought Stream Logic
  // Extract the latest meaningful "thought" from logs
  const latestThought = React.useMemo(() => {
    for (const e of timelineEvents) {
      const parsed = parseActivity(e);
      if (parsed.title === 'Task Started' || parsed.title === 'Task Completed') continue;

      return parsed.title + (parsed.detail ? `: ${parsed.detail}` : '');
    }
    return null;
  }, [timelineEvents]);

  const isThinking = tddPhase === 'refactor' || tddPhase === 'red';
  const reduceMotion = useReducedMotion() ?? false;

  /* ── Callbacks ─────────────────────────────────────────── */

  React.useEffect(() => {
    return () => {
      if (killTimerRef.current) window.clearTimeout(killTimerRef.current);
    };
  }, []);

  const disarmKill = React.useCallback(() => {
    setKillArmedUntil(null);
    setKillToken(null);
    if (killTimerRef.current) window.clearTimeout(killTimerRef.current);
    killTimerRef.current = null;
  }, []);

  const openDrawer = React.useCallback(() => setDrawerOpen(true), []);
  const closeDrawer = React.useCallback(() => setDrawerOpen(false), []);

  const armKill = React.useCallback(async () => {
    if (!controlsEnabled) return;
    try {
      const armed = await api.killSwitch.arm();
      setKillToken(armed.token);
      setKillArmedUntil(armed.expiresAt);
      if (killTimerRef.current) window.clearTimeout(killTimerRef.current);
      killTimerRef.current = window.setTimeout(() => disarmKill(), msUntil(armed.expiresAt));
    } catch (err) {
      loopActions.addEvent({
        type: 'log',
        at: nowIso(),
        runId: 'ui',
        level: 'error',
        message: `Failed to arm kill: ${err instanceof Error ? err.message : String(err)}`,
      });
    }
  }, [api, controlsEnabled, disarmKill]);

  const confirmKill = React.useCallback(async () => {
    if (!controlsEnabled || !killToken) return;
    try {
      const res = await api.killSwitch.confirm(killToken);
      if (!isOk(res)) {
        loopActions.addEvent({
          type: 'log',
          at: nowIso(),
          runId: 'ui',
          level: 'error',
          message: `Kill rejected: ${res.error.message}`,
        });
      }
    } catch (err) {
      loopActions.addEvent({
        type: 'log',
        at: nowIso(),
        runId: 'ui',
        level: 'error',
        message: `Kill failed: ${err instanceof Error ? err.message : String(err)}`,
      });
    } finally {
      disarmKill();
    }
  }, [api, controlsEnabled, disarmKill, killToken]);

  const pauseAgent = React.useCallback(async () => {
    setActionFeedback({ message: 'Pausing agent…', type: 'pending' });
    try {
      await api.processes.stop('agent');
      setActionFeedback({ message: 'Agent paused', type: 'success' });
    } catch (err) {
      setActionFeedback({ message: 'Pause failed', type: 'error' });
      loopActions.addEvent({
        type: 'log',
        at: nowIso(),
        runId: 'ui',
        level: 'error',
        message: `Pause failed: ${err instanceof Error ? err.message : String(err)}`,
      });
    }
    setTimeout(() => setActionFeedback(null), 2500);
  }, [api]);

  const startAll = React.useCallback(async () => {
    setActionFeedback({ message: 'Starting pipeline…', type: 'pending' });
    try {
      await api.socket.connect();
      await api.processes.start('monitor');
      await api.processes.start('agent');
      await api.processes.start('logTail');
      setActionFeedback({ message: 'Pipeline started', type: 'success' });
    } catch (err) {
      setActionFeedback({ message: 'Start failed', type: 'error' });
      loopActions.addEvent({
        type: 'log',
        at: nowIso(),
        runId: 'ui',
        level: 'error',
        message: `Start failed: ${err instanceof Error ? err.message : String(err)}`,
      });
    }
    setTimeout(() => setActionFeedback(null), 2500);
  }, [api]);

  const retryConnect = React.useCallback(async () => {
    setActionFeedback({ message: 'Retrying connection…', type: 'pending' });
    try {
      await api.socket.connect();
      setActionFeedback({ message: 'Connected', type: 'success' });
    } catch (err) {
      setActionFeedback({ message: 'Retry failed', type: 'error' });
      loopActions.addEvent({
        type: 'log',
        at: nowIso(),
        runId: 'ui',
        level: 'error',
        message: `Retry failed: ${err instanceof Error ? err.message : String(err)}`,
      });
    }
    setTimeout(() => setActionFeedback(null), 2500);
  }, [api]);

  const setMode = React.useCallback((m: ToolbarMode) => {
    loopActions.setAppMode(m);
  }, []);

  const gateIds = React.useMemo(() => derivedGates.gates.map((g) => g.id), [derivedGates.gates]);

  useKeyboardShortcuts({
    gates: gateIds,
    drawerOpen,
    helpOpen,
    controlsEnabled,
    onSelectGate: (id) => setSelectedGateId(id),
    onOpenDrawer: openDrawer,
    onCloseDrawer: closeDrawer,
    onSetMode: setMode,
    onPause: () => void pauseAgent(),
    onToggleHelp: () => setHelpOpen((v) => !v),
    onDisarmKill: disarmKill,
  });

  /* ── Render ────────────────────────────────────────────── */

  // Calculate dynamic noise opacity based on chaos level (Red/Refactor = chaotic)
  const chaosLevel = React.useMemo(() => {
    if (tddPhase === 'red') return 1;
    if (tddPhase === 'refactor') return 0.6;
    if (tddPhase === 'idle') return 0.2;
    return 0; // Green/Verify = Clarity
  }, [tddPhase]);

  return (
    <div
      className="relative h-screen w-screen overflow-hidden bg-bg-deep text-white select-none hud-ambient"
      data-reactor={legacyReactorState}
      style={
        {
          '--noise-opacity': `${0.02 + chaosLevel * 0.05}`, // Dynamic noise — stronger base for depth
          '--scanline-opacity': `${0.035 + chaosLevel * 0.04}`,
        } as React.CSSProperties
      }
    >
      {/* ── BACKGROUND LAYERS (atmosphere) ──────────────── */}
      <div className="pointer-events-none absolute inset-0 z-0">
        <div className="absolute inset-0 bg-linear-to-b from-black/20 via-transparent to-black/30" />
        <div className="hud-grid" />
        <div className="hud-center-well" />
        <div className="scanline" style={{ opacity: 'var(--scanline-opacity)' }} />
        <div className="noise-overlay" style={{ opacity: 'var(--noise-opacity)' }} />

        {/* Critical-state red pulse overlay */}
        {tddPhase === 'red' && (
          <div
            className="absolute inset-0"
            style={{
              background:
                'radial-gradient(ellipse at center, rgb(239 68 68 / 0.15), transparent 70%)',
              animation: 'ambient-pulse 0.5s ease-in-out infinite',
            }}
          />
        )}

        {/* Offline-state red tint (disconnected) */}
        {legacyReactorState === 'offline' && (
          <div
            className="absolute inset-0 transition-opacity duration-500"
            style={{
              background:
                'radial-gradient(ellipse at 50% 50%, rgb(239 68 68 / 0.06), transparent 60%), linear-gradient(180deg, transparent 0%, rgb(239 68 68 / 0.04) 100%)',
              animation: 'ambient-pulse 3s ease-in-out infinite',
            }}
          />
        )}
      </div>

      {/* Cinematic vignette frame */}
      <div className="vignette" />

      {/* Stuck alert banner */}
      <StuckAlert />

      {/* ── LAYOUT GRID: Header / Stage / Footer ───────── */}
      <div className="relative z-10 grid h-full grid-rows-[auto_1fr_auto]">
        <header className="flex items-center justify-between border-b border-white/5 bg-black/20 backdrop-blur-sm">
          <MissionHeader objectiveText={derivedObjective.text} connected={socketConnected} />
          <CostCounter />
          <div className="flex shrink-0 items-center gap-2 pr-4">
            <button
              type="button"
              onClick={() => systemActions.toggleSoundMuted()}
              className={`rounded p-1.5 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 ${
                soundMuted
                  ? 'text-text-muted hover:text-text-secondary'
                  : 'text-text-secondary hover:text-primary'
              }`}
              aria-label={soundMuted ? 'Unmute sounds' : 'Mute sounds'}
              title={soundMuted ? 'Sound on' : 'Sound off'}
            >
              {soundMuted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
            </button>
            <button
              type="button"
              onClick={() => setHelpOpen((v) => !v)}
              className="text-[11px] font-medium text-text-muted hover:text-text-secondary transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 rounded px-2 py-1"
              aria-label="Show keyboard shortcuts"
              title="Press ? for shortcuts"
            >
              ? Shortcuts
            </button>
            <FileMonitorToggle />
          </div>
        </header>

        {/* ROW 2: THE REACTOR (Center Stage) */}
        <main className="relative flex items-center justify-center">
          {/* GOD MODE — simulation trigger (dev only) */}
          {import.meta.env.DEV && (
            <button
              type="button"
              onClick={() => void runSimulation()}
              className="absolute top-4 right-4 z-50 rounded-full border border-cyan-500/30 bg-cyan-950/40 px-4 py-1.5 font-mono text-xs font-bold text-cyan-400 backdrop-blur-md transition-all hover:border-cyan-400/60 hover:bg-cyan-900/30 hover:shadow-[0_0_20px_rgb(6_182_212/0.15)] active:scale-95"
            >
              ⚡ RUN SIMULATION
            </button>
          )}

          {/* The Arc Reactor */}
          <motion.div
            className="relative z-20 flex items-center justify-center"
            initial={reduceMotion ? { scale: 1, opacity: 1 } : { scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={reduceMotion ? { duration: 0 } : { duration: 0.6, ease: 'easeOut' }}
          >
            {/* Satellites */}
            <Satellite
              side="left"
              label="JIRA"
              icon={LayoutGrid}
              active={legacyReactorState !== 'offline' && legacyReactorState !== 'idle'}
            />

            <OrbitalReactor
              state={legacyReactorState}
              tddPhase={tddPhase}
              currentNode={currentNode ?? (fileTailActive ? `ITER ${fileTailIterations}` : null)}
              gates={derivedGates.gates}
            />

            <Satellite
              side="right"
              label="AZURE"
              icon={Cloud}
              active={legacyReactorState !== 'offline' && legacyReactorState !== 'idle'}
            />
          </motion.div>

          {/* Thought Stream (top-left under IDLE, with spacing) */}
          <div className="absolute top-6 left-6 z-40 max-w-sm">
            <AnimatePresence>
              {(latestThought || isThinking) && (
                <ThoughtStream thought={latestThought} isThinking={isThinking} />
              )}
            </AnimatePresence>
          </div>

          {/* Anchored bottom bar: Quality Gates (left) + Controls (right) — docked to grid */}
          <div className="absolute bottom-6 left-6 right-6 z-30 flex items-end justify-between gap-6">
            {/* Quality Gate Sentinels */}
            <motion.div
              className="tech-panel shine-sweep rounded-xl px-3 py-2"
              initial={reduceMotion ? { y: 0, opacity: 1 } : { y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={reduceMotion ? { duration: 0 } : { duration: 0.4, delay: 0.2 }}
            >
              <span
                className="corner-bl absolute -bottom-px -left-px block h-[10px] w-[10px] border-b-2 border-l-2 rounded-bl"
                style={{ borderColor: 'rgb(var(--ambient-primary-rgb))' }}
              />
              <span
                className="corner-br absolute -bottom-px -right-px block h-[10px] w-[10px] border-b-2 border-r-2 rounded-br"
                style={{ borderColor: 'rgb(var(--ambient-primary-rgb))' }}
              />
              <div className="flex flex-col gap-2">
                <QualityGates gates={derivedGates.gates} />
                <p className="text-[10px] font-medium text-text-muted/80 text-center">
                  Pipeline: Jira → Agent → Actions → Deploy → Verify · Press 1–5 for evidence
                </p>
              </div>
            </motion.div>

            {/* Action Controls — primary pilot controls, first-class panel */}
            <motion.div
              className="action-panel tech-panel shine-sweep rounded-xl px-4 py-2.5"
              initial={reduceMotion ? { y: 0, opacity: 1 } : { y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={reduceMotion ? { duration: 0 } : { duration: 0.4, delay: 0.3 }}
            >
              <span
                className="corner-bl absolute -bottom-px -left-px block h-[10px] w-[10px] border-b-2 border-l-2 rounded-bl"
                style={{ borderColor: 'rgb(var(--primary-rgb))' }}
              />
              <span
                className="corner-br absolute -bottom-px -right-px block h-[10px] w-[10px] border-b-2 border-r-2 rounded-br"
                style={{ borderColor: 'rgb(var(--primary-rgb))' }}
              />
              <div className="flex flex-col items-end gap-2">
                {actionFeedback && (
                  <span
                    className={`text-[11px] font-semibold px-2 py-1 rounded transition-opacity ${
                      actionFeedback.type === 'success'
                        ? 'text-success bg-success/10'
                        : actionFeedback.type === 'error'
                          ? 'text-danger bg-danger/10'
                          : 'text-primary bg-primary/10'
                    }`}
                    role="status"
                    aria-live="polite"
                  >
                    {actionFeedback.message}
                  </span>
                )}
                <ActionBar
                  mode={appMode}
                  startDisabled={!controlsEnabled || anyStartingOrRunning}
                  pauseDisabled={!controlsEnabled}
                  killDisabled={!controlsEnabled}
                  killArmedUntil={killArmedUntil}
                  onStart={startAll}
                  onPause={pauseAgent}
                  onArmKill={armKill}
                  onConfirmKill={confirmKill}
                />
              </div>
            </motion.div>
          </div>
        </main>

        {/* ROW 3: CONSOLE DRAWER (Collapsible — stängd som standard) */}
        <footer
          className={`flex flex-col overflow-hidden border-t border-white/5 bg-black/40 backdrop-blur-md transition-[height] duration-300 ease-out ${
            consoleExpanded ? 'min-h-32 max-h-[40vh] h-48 resize-y' : 'h-9 shrink-0'
          }`}
        >
          {consoleExpanded ? (
            <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
              <ActivityPanel events={timelineEvents} onCollapse={() => setConsoleExpanded(false)} />
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setConsoleExpanded(true)}
              className="flex h-full w-full items-center justify-between px-4 py-0 transition-colors hover:bg-white/5"
              aria-label="Expand console"
            >
              <span className="font-mono text-[11px] font-bold uppercase tracking-wider text-text-muted">
                Activity · {timelineEvents.length} events
              </span>
              <ChevronUp className="h-4 w-4 text-text-muted" />
            </button>
          )}
        </footer>
      </div>

      {/* ── OVERLAYS (absolute over everything) ────────── */}
      <AnimatePresence>
        {/* POWER-UP SEQUENCE - shows on first load */}
        {showPowerUp && <PowerUpSequence onComplete={() => setShowPowerUp(false)} />}

        {/* NO CONNECTION OVERLAY - only shows if WebSocket disconnected and power-up complete */}
        {!socketConnected && !monitorConnected && !overlayDismissed && !showPowerUp && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm"
          >
            <button
              type="button"
              onClick={() => setOverlayDismissed(true)}
              className="absolute top-4 right-4 p-1.5 rounded-lg text-white/40 hover:text-white hover:bg-white/5 transition-colors"
              aria-label="Dismiss and continue in offline mode"
            >
              <X className="h-5 w-5" />
            </button>
            <div className="flex flex-col items-center gap-5 text-center max-w-md px-6">
              <div className="h-16 w-16 rounded-full bg-danger/10 flex items-center justify-center">
                <WifiOff className="h-8 w-8 text-danger animate-pulse" />
              </div>
              <h2 className="font-heading text-xl font-semibold text-white tracking-tight">
                Disconnected from Backend
              </h2>
              <div className="flex flex-col gap-3 text-sm text-text-secondary text-left">
                <p>
                  Live pipeline control and updates are unavailable until the connection is
                  restored.
                </p>
                <div className="rounded-lg border border-border-subtle bg-bg-panel/50 p-4 space-y-2">
                  <p className="font-semibold text-text-primary">Still available:</p>
                  <ul className="list-disc list-inside space-y-1 text-text-secondary">
                    <li>View activity log and evidence</li>
                    <li>Browse gate details (press 1–5)</li>
                    <li>Switch between Observe and Control</li>
                  </ul>
                </div>
                <div className="rounded-lg border border-border-subtle bg-bg-panel/50 p-4 space-y-2">
                  <p className="font-semibold text-text-primary">What you can do:</p>
                  <ul className="list-disc list-inside space-y-1 text-text-secondary">
                    <li>Retry connection below</li>
                    <li>Dismiss to continue in offline view</li>
                  </ul>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={retryConnect}
                  className="btn-interactive px-4 py-2 rounded-lg border border-primary/30 bg-primary/10 text-primary text-sm font-semibold hover:bg-primary/20 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
                  aria-label="Retry connection to backend"
                >
                  Retry Connection
                </button>
                <button
                  type="button"
                  onClick={() => setOverlayDismissed(true)}
                  className="btn-interactive px-4 py-2 rounded-lg border border-border-subtle text-text-secondary text-sm font-medium hover:bg-bg-panel-hover transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
                  aria-label="Dismiss and continue in offline mode"
                >
                  Continue Offline
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <EvidenceDrawer open={drawerOpen} gate={selectedGate} onClose={closeDrawer} />
      <CompletionPanel />
      <KeyboardHelp open={helpOpen} onClose={() => setHelpOpen(false)} />
    </div>
  );
}
