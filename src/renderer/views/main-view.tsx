import { AnimatePresence, motion } from 'framer-motion';
import { WifiOff, X } from 'lucide-react';
import React from 'react';

import type { Result } from '../../shared/api';
import { deriveGates, deriveObjectiveText, deriveTimelineEvents } from '../adapters/loop-adapters';
import { EvidenceDrawer } from '../components/evidence-drawer';
import { KeyboardHelp } from '../components/keyboard-help';
import { LogConsole } from '../components/log-console';
import { MissionHeader } from '../components/mission-header';
import { QualityGates } from '../components/quality-gates';
import { RalphReactor, type ReactorState } from '../components/ralph-reactor';
import { ActionBar, type ToolbarMode } from '../components/toolbar';
import { useElectronApi } from '../hooks/use-electron-api';
import { useKeyboardShortcuts } from '../hooks/use-keyboard-shortcuts';
import { useSoundEffects } from '../hooks/use-sound-effects';
import type { GateId } from '../models/ui';
import {
  loopActions,
  useAppMode,
  useCurrentNode,
  useEvents,
  useGates,
  useObjective,
} from '../stores/loop-store';
import { useProcesses, useSocketConnected, useSocketLastError } from '../stores/system-store';

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

  const [selectedGateId, setSelectedGateId] = React.useState<GateId>('local');
  const [drawerOpen, setDrawerOpen] = React.useState(false);
  const [helpOpen, setHelpOpen] = React.useState(false);
  const [overlayDismissed, setOverlayDismissed] = React.useState(false);

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
  const timelineEvents = React.useMemo(
    () => deriveTimelineEvents(eventsRaw),
    [eventsRaw],
  );
  const selectedGate = React.useMemo(
    () => derivedGates.gates.find((g) => g.id === selectedGateId) ?? null,
    [derivedGates.gates, selectedGateId],
  );

  // Reactor state: derived from connection + process + gate status
  const derivedReactorState: ReactorState = React.useMemo(() => {
    if (!socketConnected) return 'offline';
    if (derivedGates.gates.some((g) => g.status === 'failed')) return 'critical';
    if (Object.values(processes).some((p) => p?.state === 'running')) return 'active';
    return 'idle';
  }, [socketConnected, processes, derivedGates.gates]);

  // DEV: Shift+D cycles through reactor states for testing sounds/visuals
  const DEBUG_STATES: ReactorState[] = ['idle', 'active', 'critical', 'offline'];
  const [debugOverride, setDebugOverride] = React.useState<ReactorState | null>(null);

  React.useEffect(() => {
    function handleDebugKey(e: KeyboardEvent) {
      if (e.shiftKey && e.key === 'D') {
        setDebugOverride((prev) => {
          if (prev === null) return DEBUG_STATES[0]!;
          const idx = DEBUG_STATES.indexOf(prev);
          const next = idx + 1;
          return next >= DEBUG_STATES.length ? null : DEBUG_STATES[next]!;
        });
      }
    }
    window.addEventListener('keydown', handleDebugKey);
    return () => window.removeEventListener('keydown', handleDebugKey);
  }, []);

  const reactorState = debugOverride ?? derivedReactorState;

  // Sound effects — reacts to state transitions
  useSoundEffects(reactorState, killArmedUntil !== null);

  const controlsEnabled = appMode === 'control';
  const anyStartingOrRunning = Object.values(processes).some(
    (p) =>
      p?.state === 'starting' ||
      p?.state === 'running' ||
      p?.state === 'stopping' ||
      p?.state === 'backing_off',
  );

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
        type: 'log', at: nowIso(), runId: 'ui', level: 'error',
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
          type: 'log', at: nowIso(), runId: 'ui', level: 'error',
          message: `Kill rejected: ${res.error.message}`,
        });
      }
    } catch (err) {
      loopActions.addEvent({
        type: 'log', at: nowIso(), runId: 'ui', level: 'error',
        message: `Kill failed: ${err instanceof Error ? err.message : String(err)}`,
      });
    } finally {
      disarmKill();
    }
  }, [api, controlsEnabled, disarmKill, killToken]);

  const pauseAgent = React.useCallback(async () => {
    try {
      await api.processes.stop('agent');
    } catch (err) {
      loopActions.addEvent({
        type: 'log', at: nowIso(), runId: 'ui', level: 'error',
        message: `Pause failed: ${err instanceof Error ? err.message : String(err)}`,
      });
    }
  }, [api]);

  const startAll = React.useCallback(async () => {
    try {
      await api.socket.connect();
      await api.processes.start('monitor');
      await api.processes.start('agent');
      await api.processes.start('logTail');
    } catch (err) {
      loopActions.addEvent({
        type: 'log', at: nowIso(), runId: 'ui', level: 'error',
        message: `Start failed: ${err instanceof Error ? err.message : String(err)}`,
      });
    }
  }, [api]);

  const retryConnect = React.useCallback(async () => {
    try {
      await api.socket.connect();
    } catch (err) {
      loopActions.addEvent({
        type: 'log', at: nowIso(), runId: 'ui', level: 'error',
        message: `Retry failed: ${err instanceof Error ? err.message : String(err)}`,
      });
    }
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

  return (
    <div className="relative h-screen w-screen overflow-hidden bg-bg-deep text-white select-none">

      {/* ── BACKGROUND LAYERS (atmosphere) ──────────────── */}
      <div className="pointer-events-none absolute inset-0 z-0">
        <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-black/60" />
        <div className="scanline" />
      </div>

      {/* ── LAYOUT GRID: Header / Stage / Footer ───────── */}
      <div className="relative z-10 grid h-full grid-rows-[auto_1fr_auto]">

        {/* ROW 1: MISSION HEADER */}
        <header className="border-b border-white/5 bg-black/20 backdrop-blur-sm">
          <MissionHeader
            objectiveText={derivedObjective.text}
            connected={socketConnected}
          />
        </header>

        {/* ROW 2: THE REACTOR (Center Stage) */}
        <main className="relative flex items-center justify-center">

          {/* The Arc Reactor */}
          <motion.div
            className="relative z-20"
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.6, ease: 'easeOut' }}
          >
            <RalphReactor state={reactorState} currentNode={currentNode} />
          </motion.div>

          {/* Anchored bottom bar: Quality Gates (left) + Controls (right) */}
          <div className="absolute bottom-6 left-6 right-6 z-30 flex items-end justify-between">
            {/* Quality Gate Sentinels */}
            <motion.div
              className="glass-panel rounded-xl px-3 py-2"
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ duration: 0.4, delay: 0.2 }}
            >
              <QualityGates gates={derivedGates.gates} />
            </motion.div>

            {/* Action Controls */}
            <motion.div
              className="glass-panel rounded-xl px-3 py-2"
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ duration: 0.4, delay: 0.3 }}
            >
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
            </motion.div>
          </div>
        </main>

        {/* ROW 3: CONSOLE DRAWER (Anchored Footer) */}
        <footer className="h-48 border-t border-white/10 bg-black/40 backdrop-blur-md">
          <LogConsole events={timelineEvents} />
        </footer>
      </div>

      {/* ── OVERLAYS (absolute over everything) ────────── */}
      <AnimatePresence>
        {!socketConnected && !overlayDismissed && (
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
              aria-label="Dismiss overlay"
            >
              <X className="h-5 w-5" />
            </button>
            <div className="flex flex-col items-center gap-4 text-center max-w-md">
              <div className="h-16 w-16 rounded-full bg-red-500/10 flex items-center justify-center">
                <WifiOff className="h-8 w-8 text-red-400 animate-pulse" />
              </div>
              <h2 className="font-heading text-xl font-semibold text-white tracking-tight">
                Backend Unreachable
              </h2>
              <p className="text-sm text-white/50">
                Cannot connect to the SEJFA monitor backend.
                {socketLastError && (
                  <span className="block mt-1 font-mono text-xs text-red-400">
                    {socketLastError}
                  </span>
                )}
              </p>
              <div className="flex items-center gap-3">
                <button type="button" onClick={retryConnect}
                  className="px-4 py-2 rounded-lg border border-cyan-500/30 text-cyan-400 text-sm font-semibold hover:bg-cyan-500/10 transition-colors">
                  Retry Connection
                </button>
                <button type="button" onClick={() => setOverlayDismissed(true)}
                  className="px-4 py-2 rounded-lg border border-white/10 text-white/50 text-sm font-medium hover:bg-white/5 transition-colors">
                  Dismiss
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <EvidenceDrawer open={drawerOpen} gate={selectedGate} onClose={closeDrawer} />
      <KeyboardHelp open={helpOpen} onClose={() => setHelpOpen(false)} />
    </div>
  );
}
