import React from 'react';

import type { Result } from '../../shared/api';
import { deriveGates, deriveObjectiveText, deriveTimelineEvents } from '../adapters/loop-adapters';
import { EventTimeline } from '../components/event-timeline';
import { EvidenceDrawer } from '../components/evidence-drawer';
import { GateBar } from '../components/gate-bar';
import { KeyboardHelp } from '../components/keyboard-help';
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
    <div className="min-h-full bg-[var(--bg)] text-[var(--text)]">
      <div className="mx-auto flex min-h-full max-w-[1400px] flex-col gap-4 px-4 py-5 lg:px-6">
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

        {!socketConnected ? (
          <div className="hud-panel rounded-2xl px-4 py-3 text-sm text-[color-mix(in_oklab,var(--amber)_90%,white)]">
            <span className="font-[var(--font-heading)] font-semibold">OFFLINE</span>
            <span className="ml-2 text-[var(--muted)]">
              Monitor backend not reachable{socketLastError ? `: ${socketLastError}` : '.'}
            </span>
          </div>
        ) : null}

        <GateBar
          gates={derivedGates.gates}
          selectedGateId={selectedGateId}
          onSelectGate={(id) => {
            setSelectedGateId(id);
            openDrawer();
          }}
        />

        <div className="grid min-h-0 flex-1 grid-cols-1 gap-4 lg:grid-cols-5">
          <div className="min-h-0 lg:col-span-2">
            <LoopVisualization
              gates={derivedGates.gates}
              activeGateId={derivedGates.activeGateId}
              onSelectGate={(id) => {
                setSelectedGateId(id);
                openDrawer();
              }}
            />
          </div>
          <div className="min-h-0 lg:col-span-3">
            <EventTimeline events={timelineEvents} />
          </div>
        </div>
      </div>

      <EvidenceDrawer open={drawerOpen} gate={selectedGate} onClose={closeDrawer} />
      <KeyboardHelp open={helpOpen} onClose={() => setHelpOpen(false)} />
    </div>
  );
}
