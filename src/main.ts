import { BrowserWindow, app } from 'electron';
import started from 'electron-squirrel-startup';

import type { LoopEvent, ManagedProcessStatus, SocketStatus } from './shared/types';

import { ChildProcessManager } from './main/child-processes';
import { FileTailService } from './main/file-tail-service';
import { registerIpcHandlers } from './main/ipc-handlers';
import { setApplicationMenu } from './main/menu';
import { registerAppSecurityHandlers } from './main/security';
import { registerGlobalShortcuts } from './main/shortcuts';
import { SocketBridge } from './main/socket-bridge';
import { TrayController } from './main/tray';
import { createMainWindow } from './main/window';
import { Channel } from './shared/ipc';

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (started) {
  app.quit();
}

const isDev = Boolean(MAIN_WINDOW_VITE_DEV_SERVER_URL);

let tray: TrayController | null = null;
let processes: ChildProcessManager | null = null;
let socket: SocketBridge | null = null;
let fileTail: FileTailService | null = null;

let lastObjective: string | undefined;
let lastGate: string | undefined;

function showOrCreateWindow() {
  const existing = BrowserWindow.getAllWindows()[0];
  if (existing) {
    if (existing.isMinimized()) existing.restore();
    existing.show();
    existing.focus();
    return existing;
  }
  return createMainWindow({ isDev });
}

function toggleWindowVisibility() {
  const win = BrowserWindow.getAllWindows()[0];
  if (!win) {
    showOrCreateWindow();
    return;
  }
  if (win.isMinimized()) win.restore();
  if (win.isVisible()) win.hide();
  else {
    win.show();
    win.focus();
  }
}

function broadcast(event: LoopEvent) {
  for (const win of BrowserWindow.getAllWindows()) {
    if (win.isDestroyed()) continue;
    win.webContents.send(Channel.LoopEventPush, event);
  }
}

function computeTrayLevel(statuses: ManagedProcessStatus[], socketStatus: SocketStatus) {
  if (statuses.some((p) => p.state === 'error')) return 'red' as const;
  if (!socketStatus.connected) return 'yellow' as const;
  return 'green' as const;
}

function updateTray() {
  if (!tray || !processes || !socket) return;
  const snap = processes.getSnapshot();
  const statuses = Object.values(snap.processes);
  const sock = socket.getStatus();
  const running = statuses.some(
    (p) =>
      p.state === 'running' ||
      p.state === 'starting' ||
      p.state === 'stopping' ||
      p.state === 'backing_off',
  );
  const next: Parameters<TrayController['setState']>[0] = {
    level: computeTrayLevel(statuses, sock),
    running,
  };
  if (lastObjective) next.objective = lastObjective;
  if (lastGate) next.gateStatus = lastGate;
  tray.setState(next);
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.whenReady().then(() => {
  registerAppSecurityHandlers({ isDev });
  setApplicationMenu();

  processes = new ChildProcessManager();
  socket = new SocketBridge(process.env.SEJFA_MONITOR_URL ?? 'http://localhost:5000');
  fileTail = new FileTailService(process.env.SEJFA_LOOP_PROJECT_PATH);

  const win = showOrCreateWindow();
  registerGlobalShortcuts({ toggleWindow: toggleWindowVisibility });
  tray = new TrayController({
    onStart: () => {
      void processes?.startAll();
      socket?.connect();
      updateTray();
    },
    onStop: () => {
      void processes?.stopAll();
      socket?.disconnect();
      updateTray();
    },
    onShow: () => {
      showOrCreateWindow();
    },
    onQuit: () => {
      app.quit();
    },
  });

  registerIpcHandlers({
    processes,
    socket,
    fileTail,
    tray,
    broadcast,
  });

  processes.on('status', () => {
    if (!processes) return;
    const snap = processes.getSnapshot();
    for (const st of Object.values(snap.processes)) {
      broadcast({ type: 'process/status', at: new Date().toISOString(), status: st });
    }
    updateTray();
  });

  processes.on('log', (entry) => {
    broadcast({
      type: 'log',
      at: entry.at,
      runId: `proc:${entry.id}`,
      level: entry.stream === 'stderr' ? 'warn' : 'info',
      message: entry.line,
    });
  });

  socket.on('status', (st) => {
    broadcast({ type: 'socket/status', at: new Date().toISOString(), status: st });
    updateTray();
  });

  socket.on('backendEvent', (name, payload) => {
    const at = new Date().toISOString();
    const isRecord = (x: unknown): x is Record<string, unknown> =>
      typeof x === 'object' && x !== null;
    const getString = (x: unknown): string | undefined => (typeof x === 'string' ? x : undefined);

    if (name === 'task_started' && isRecord(payload) && isRecord(payload.objective)) {
      const key = getString(payload.objective.jiraKey);
      const summary = getString(payload.objective.summary);
      if (summary) lastObjective = key ? `${key} — ${summary}` : summary;
    }
    if (name === 'gate_change' && isRecord(payload) && isRecord(payload.gate)) {
      const status = getString(payload.gate.status);
      const node = getString(payload.gate.nodeId) ?? getString(payload.gate.node);
      if (status) lastGate = node ? `${node}: ${status}` : status;
    }

    let type: LoopEvent['type'];
    switch (name) {
      case 'loop_update':
        type = 'backend/loop_update';
        break;
      case 'gate_change':
        type = 'backend/gate_change';
        break;
      case 'agent_event':
        type = 'backend/agent_event';
        break;
      case 'health':
        type = 'backend/health';
        break;
      case 'task_started':
        type = 'backend/task_started';
        break;
      case 'task_completed':
        type = 'backend/task_completed';
        break;
      default:
        type = 'backend/unknown';
        break;
    }

    if (type === 'backend/unknown') {
      broadcast({ type, at, eventName: name, payload });
    } else {
      broadcast({ type, at, payload });
    }
    updateTray();
  });

  // FileTail events - Ralph loop monitoring
  fileTail.on('change', (state) => {
    const at = new Date().toISOString();

    // Broadcast structured state so the reactor can respond
    broadcast({
      type: 'filetail/state',
      at,
      loopActive: state.loop_active,
      iterations: state.iterations,
      ...(state.completed_at ? { completedAt: state.completed_at } : {}),
    });

    // Also emit log events for the console
    if (state.loop_active) {
      broadcast({
        type: 'log',
        at,
        runId: 'ralph-loop',
        level: 'info',
        message: `Ralph loop active - iteration ${state.iterations}`,
      });
    } else if (state.completed_at) {
      broadcast({
        type: 'log',
        at,
        runId: 'ralph-loop',
        level: 'success',
        message: `Ralph loop completed after ${state.iterations} iteration${state.iterations !== 1 ? 's' : ''}`,
      });
    }
  });

  fileTail.on('error', (error) => {
    broadcast({
      type: 'log',
      at: new Date().toISOString(),
      runId: 'ralph-loop',
      level: 'error',
      message: `FileTail error: ${error.message}`,
    });
  });

  // Default behavior: try connecting immediately, but tolerate backend absence.
  socket.connect();

  // Start FileTail monitoring (always enabled)
  fileTail.start();

  // Seed a first event so the renderer bridge can be validated immediately.
  broadcast({
    type: 'log',
    at: new Date().toISOString(),
    runId: 'bootstrap',
    level: 'info',
    message: 'SEJFA Command Center ready',
  });

  win.on('closed', () => {
    // Keep tray alive even if the window is closed.
  });

  updateTray();
});

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  // On OS X it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (BrowserWindow.getAllWindows().length === 0) {
    showOrCreateWindow();
  }
});

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and import them here.
