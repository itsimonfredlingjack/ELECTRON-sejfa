import React from 'react';

import type { Result } from '../../shared/api';
import { deriveGates, deriveObjectiveText, deriveTimelineEvents } from '../adapters/loop-adapters';
import { EvidenceDrawer } from '../components/evidence-drawer';
import { KeyboardHelp } from '../components/keyboard-help';
import { LogConsole } from '../components/log-console';
import { LoopVisualization } from '../components/loop-visualization';
import { Toolbar, type ToolbarMode } from '../components/toolbar';
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
    <div className="hud-ambient flex h-screen w-full flex-col overflow-hidden bg-[var(--bg-deep)] text-[var(--text-primary)]">
      {/* Top Toolbar Area */}
      <div className="shrink-0 border-b border-[var(--border-subtle)] bg-[var(--bg-panel)] px-6 py-3">
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
          onStart={async () => {
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
          }}
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

      {/* Main Content Area: Split View */}
      <div className="grid min-h-0 flex-1 grid-cols-12 gap-6 p-6">
        {/* Left Column: Loop Visualization (40%) */}
        <div className="col-span-5 flex min-h-0 flex-col">
          <div className="glass-panel flex flex-1 flex-col overflow-hidden p-6 relative">
            {!socketConnected && (
              <div className="absolute top-4 left-4 right-4 z-50 flex items-center justify-between rounded bg-danger/10 px-3 py-2 border border-danger/30 text-danger text-sm">
                <span className="font-bold">OFFLINE</span>
                <span className="opacity-80">
                  Monitor backend unreachable{socketLastError ? `: ${socketLastError}` : ''}
                </span>
              </div>
            )}
            <LoopVisualization
              gates={derivedGates.gates}
              activeGateId={derivedGates.activeGateId}
              onSelectGate={(id) => {
                setSelectedGateId(id);
                openDrawer();
              }}
            />
          </div>
        </div>

        {/* Right Column: Log Console (60%) */}
        <div className="col-span-7 flex min-h-0 flex-col">
          <div className="glass-panel flex flex-1 flex-col overflow-hidden">
            <LogConsole events={timelineEvents} />
          </div>
        </div>
      </div>

      <EvidenceDrawer open={drawerOpen} gate={selectedGate} onClose={closeDrawer} />
      <KeyboardHelp open={helpOpen} onClose={() => setHelpOpen(false)} />
    </div>
  );
}
