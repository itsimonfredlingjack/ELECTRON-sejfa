import { motion } from 'framer-motion';
import { WifiOff, X } from 'lucide-react';
import React from 'react';

import type { Result } from '../../shared/api';
import { deriveGates, deriveObjectiveText, deriveTimelineEvents } from '../adapters/loop-adapters';
import { EvidenceDrawer } from '../components/evidence-drawer';
import { KeyboardHelp } from '../components/keyboard-help';
import { LogConsole } from '../components/log-console';
import { LoopVisualization } from '../components/loop-visualization';
import { MissionHeader } from '../components/mission-header';
import { QualityGates } from '../components/quality-gates';
import { RalphReactor } from '../components/ralph-reactor';
import { ActionBar, StatusBar, type ToolbarMode } from '../components/toolbar';
import { useElectronApi } from '../hooks/use-electron-api';
import { useKeyboardShortcuts } from '../hooks/use-keyboard-shortcuts';
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

  const derivedObjective = React.useMemo(() => {
    return deriveObjectiveText(objective, eventsRaw);
  }, [objective, eventsRaw]);

  const derivedGates = React.useMemo(() => {
    return deriveGates(gateStates, currentNode);
  }, [gateStates, currentNode]);

  const timelineEvents = React.useMemo(() => {
    return deriveTimelineEvents(eventsRaw);
  }, [eventsRaw]);

  const selectedGate = React.useMemo(() => {
    return derivedGates.gates.find((g) => g.id === selectedGateId) ?? null;
  }, [derivedGates.gates, selectedGateId]);

  const controlsEnabled = appMode === 'control';
  const anyStartingOrRunning = Object.values(processes).some(
    (p) =>
      p?.state === 'starting' ||
      p?.state === 'running' ||
      p?.state === 'stopping' ||
      p?.state === 'backing_off',
  );

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

  const openExternal = React.useCallback(async (url: string) => {
    try { await api.shell.openExternal(url); } catch { /* handled */ }
  }, [api]);

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

  const alertsCount = timelineEvents.filter(
    (e) => e.severity === 'warning' || e.severity === 'error',
  ).length;

  return (
    <div className="hud-ambient flex h-screen w-full flex-col overflow-hidden bg-bg-deep text-text-primary">

      {/* ─── 1. TOP: Status Deck (Information Only) ─────────────── */}
      <div className="z-10 shrink-0 border-b border-white/5 bg-bg-panel/50 backdrop-blur-md">
        <StatusBar
          connected={socketConnected}
          alertsCount={alertsCount}
          mode={appMode}
          onModeChange={(m) => setMode(m as ToolbarMode)}
        />
      </div>

      {/* ─── 2. MIDDLE: Command Stage (The Hero) ───────────────── */}
      <div className="relative z-0 flex flex-1 flex-col items-center justify-center overflow-y-auto p-6">
        <motion.div
          className="w-full max-w-5xl"
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
        >
          {/* Single cohesive hero panel */}
          <div className="glass-panel relative overflow-hidden rounded-2xl">

            {/* Mission Header — objective + Jira badge */}
            <MissionHeader
              objectiveText={derivedObjective.text}
              prUrl={derivedObjective.prUrl}
              runUrl={derivedObjective.runUrl}
              onOpenPr={() => derivedObjective.prUrl && void openExternal(derivedObjective.prUrl)}
              onOpenRun={() => derivedObjective.runUrl && void openExternal(derivedObjective.runUrl)}
              openPrDisabled={!derivedObjective.prUrl}
              openRunDisabled={!derivedObjective.runUrl}
            />

            {/* Pipeline Track — visual flow */}
            <div className="border-t border-white/5 bg-black/20 px-4 py-2">
              <LoopVisualization
                gates={derivedGates.gates}
                activeGateId={derivedGates.activeGateId}
                onSelectGate={(id) => {
                  setSelectedGateId(id);
                  openDrawer();
                }}
              />
            </div>

            {/* Reactor + Quality Gates — side by side */}
            <div className="flex border-t border-white/5">
              {/* Ralph Reactor */}
              <div className="flex flex-1 items-center justify-center py-6 px-4">
                <RalphReactor gates={derivedGates.gates} />
              </div>

              {/* Divider */}
              <div className="w-px bg-white/5" />

              {/* Quality Gate Sentinels */}
              <div className="flex items-center justify-center px-6 py-6">
                <div className="grid grid-cols-2 gap-3">
                  <QualityGates gates={derivedGates.gates} />
                </div>
              </div>
            </div>

            {/* Action Bar — sole control surface */}
            <div className="border-t border-white/5 bg-white/[0.03] backdrop-blur-xl">
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
          </div>
        </motion.div>
      </div>

      {/* ─── 3. BOTTOM: Console Drawer (Anchored) ──────────────── */}
      <motion.div
        className="z-10 shrink-0 h-52 border-t border-white/10 bg-bg-deep/90 backdrop-blur-xl"
        initial={{ y: 100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.4, ease: 'easeOut', delay: 0.15 }}
      >
        <LogConsole events={timelineEvents} />
      </motion.div>

      {/* ─── 4. OVERLAYS (Outside everything, full-screen) ──────── */}
      {!socketConnected && !overlayDismissed && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="absolute inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm"
        >
          <button
            type="button"
            onClick={() => setOverlayDismissed(true)}
            className="absolute top-4 right-4 p-1.5 rounded-lg text-text-muted hover:text-text-primary hover:bg-white/5 transition-colors"
            aria-label="Dismiss overlay"
          >
            <X className="h-5 w-5" />
          </button>
          <div className="flex flex-col items-center gap-4 text-center max-w-md">
            <div className="h-16 w-16 rounded-full bg-danger/10 flex items-center justify-center">
              <WifiOff className="h-8 w-8 text-danger animate-pulse" />
            </div>
            <h2 className="font-heading text-xl font-semibold text-text-primary tracking-tight">Backend Unreachable</h2>
            <p className="text-sm text-text-secondary">
              Cannot connect to the SEJFA monitor backend.
              {socketLastError && (
                <span className="block mt-1 font-mono text-xs text-danger">
                  {socketLastError}
                </span>
              )}
            </p>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={retryConnect}
                className="px-4 py-2 rounded-lg border border-primary/30 text-primary text-sm font-semibold hover:bg-primary/10 transition-colors"
              >
                Retry Connection
              </button>
              <button
                type="button"
                onClick={() => setOverlayDismissed(true)}
                className="px-4 py-2 rounded-lg border border-border-subtle text-text-secondary text-sm font-medium hover:bg-white/5 transition-colors"
              >
                Dismiss
              </button>
            </div>
          </div>
        </motion.div>
      )}

      <EvidenceDrawer open={drawerOpen} gate={selectedGate} onClose={closeDrawer} />
      <KeyboardHelp open={helpOpen} onClose={() => setHelpOpen(false)} />
    </div>
  );
}
