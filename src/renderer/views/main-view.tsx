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
import { ActionBar, Toolbar, type ToolbarMode } from '../components/toolbar';
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

  // Reset dismiss when connection comes back (so overlay reappears on next disconnect)
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
        type: 'log',
        at: nowIso(),
        runId: 'ui',
        level: 'error',
        message: `Failed to arm kill: ${err instanceof Error ? err.message : String(err)}`,
      });
    }
  }, [api, controlsEnabled, disarmKill]);

  const confirmKill = React.useCallback(async () => {
    if (!controlsEnabled) return;
    if (!killToken) return;
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
    try {
      await api.processes.stop('agent');
    } catch (err) {
      loopActions.addEvent({
        type: 'log',
        at: nowIso(),
        runId: 'ui',
        level: 'error',
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
        type: 'log',
        at: nowIso(),
        runId: 'ui',
        level: 'error',
        message: `Start failed: ${err instanceof Error ? err.message : String(err)}`,
      });
    }
  }, [api]);

  const retryConnect = React.useCallback(async () => {
    try {
      await api.socket.connect();
    } catch (err) {
      loopActions.addEvent({
        type: 'log',
        at: nowIso(),
        runId: 'ui',
        level: 'error',
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

  return (
    <div className="hud-ambient flex h-screen w-full flex-col overflow-hidden bg-bg-deep text-text-primary">
      {/* ── Top: StatusBar (connection, mode, alerts) ──────────── */}
      <div className="shrink-0">
        <Toolbar
          objectiveText={derivedObjective.text}
          mode={appMode}
          onModeChange={(m) => setMode(m as ToolbarMode)}
          alertsCount={
            timelineEvents.filter((e) => e.severity === 'warning' || e.severity === 'error').length
          }
          connected={socketConnected}
          startDisabled={!controlsEnabled || anyStartingOrRunning}
          pauseDisabled={!controlsEnabled}
          killDisabled={!controlsEnabled}
          openPrDisabled={!controlsEnabled || !derivedObjective.prUrl}
          openRunDisabled={!controlsEnabled || !derivedObjective.runUrl}
          killArmedUntil={killArmedUntil}
          onArmKill={armKill}
          onConfirmKill={confirmKill}
          onStart={startAll}
          onPause={pauseAgent}
          onOpenPr={async () => {
            if (!derivedObjective.prUrl) return;
            try {
              await api.shell.openExternal(derivedObjective.prUrl);
            } catch (err) {
              loopActions.addEvent({
                type: 'log',
                at: nowIso(),
                runId: 'ui',
                level: 'error',
                message: `Open PR failed: ${err instanceof Error ? err.message : String(err)}`,
              });
            }
          }}
          onOpenRun={async () => {
            if (!derivedObjective.runUrl) return;
            try {
              await api.shell.openExternal(derivedObjective.runUrl);
            } catch (err) {
              loopActions.addEvent({
                type: 'log',
                at: nowIso(),
                runId: 'ui',
                level: 'error',
                message: `Open run failed: ${err instanceof Error ? err.message : String(err)}`,
              });
            }
          }}
        />
      </div>

      {/* ── Main Content ──────────────────────────────────────── */}
      <div className="relative flex min-h-0 flex-1 flex-col gap-0">

        {/* Pipeline Track — full-width subway map */}
        <motion.div
          className="shrink-0 glass-panel mx-4 mt-4 mb-2 overflow-hidden"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: 'easeOut' }}
        >
          <div className="px-4 py-1">
            <LoopVisualization
              gates={derivedGates.gates}
              activeGateId={derivedGates.activeGateId}
              onSelectGate={(id) => {
                setSelectedGateId(id);
                openDrawer();
              }}
            />
          </div>
        </motion.div>

        {/* Mission Header — Jira ticket + objective */}
        <motion.div
          className="shrink-0 glass-panel mx-4 mb-2 overflow-hidden"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: 'easeOut', delay: 0.05 }}
        >
          <MissionHeader
            objectiveText={derivedObjective.text}
            prUrl={derivedObjective.prUrl}
            runUrl={derivedObjective.runUrl}
            onOpenPr={async () => {
              if (!derivedObjective.prUrl) return;
              try { await api.shell.openExternal(derivedObjective.prUrl); } catch { /* handled */ }
            }}
            onOpenRun={async () => {
              if (!derivedObjective.runUrl) return;
              try { await api.shell.openExternal(derivedObjective.runUrl); } catch { /* handled */ }
            }}
            openPrDisabled={!controlsEnabled || !derivedObjective.prUrl}
            openRunDisabled={!controlsEnabled || !derivedObjective.runUrl}
          />
        </motion.div>

        {/* Center: Reactor + Log Console side by side */}
        <div className="flex min-h-0 flex-1 gap-3 px-4 mb-2">
          {/* Ralph Reactor */}
          <motion.div
            className="glass-panel flex w-[320px] shrink-0 items-center justify-center overflow-hidden"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, ease: 'easeOut', delay: 0.1 }}
          >
            <RalphReactor gates={derivedGates.gates} />
          </motion.div>

          {/* Log Console */}
          <motion.div
            className="glass-panel flex min-h-0 flex-1 flex-col overflow-hidden"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, ease: 'easeOut', delay: 0.1 }}
          >
            <LogConsole events={timelineEvents} />
          </motion.div>
        </div>

        {/* Bottom: Quality Gates + Action Bar */}
        <motion.div
          className="shrink-0 glass-panel mx-4 mb-4 overflow-hidden"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: 'easeOut', delay: 0.15 }}
        >
          <div className="flex items-center gap-4 px-4 py-3">
            {/* Quality Gate Sentinels */}
            <QualityGates gates={derivedGates.gates} />

            {/* Spacer */}
            <div className="flex-1" />

            {/* Action Bar */}
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

        {/* Disconnected Overlay */}
        {!socketConnected && !overlayDismissed && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="absolute inset-0 z-40 flex items-center justify-center bg-bg-deep/85 backdrop-blur-md rounded-xl"
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
      </div>

      <EvidenceDrawer open={drawerOpen} gate={selectedGate} onClose={closeDrawer} />
      <KeyboardHelp open={helpOpen} onClose={() => setHelpOpen(false)} />
    </div>
  );
}
