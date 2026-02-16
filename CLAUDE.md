# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

SEJFA Command Center is an Electron 33 desktop app that monitors and controls an autonomous DevOps agent loop: Jira ticket -> Claude agent -> local tests -> PR -> CI -> deploy -> verify/rollback. It connects to a Flask/SocketIO backend via Socket.IO for real-time loop events.

**NEW:** The app now includes **Ralph Loop file monitoring** - it can monitor local Claude Code Ralph loops by watching `ralph-state.json` without any code changes to the loop project. See `docs/RALPH_LOOP_MONITORING.md` for details.

## Commands

```bash
npm start                  # Launch dev (electron-forge + Vite HMR)
npm run lint               # Biome check (lint + format)
npm run format             # Biome auto-format
npm run typecheck          # tsc --noEmit
npm test                   # Vitest unit tests (jsdom)
npm run test:e2e           # Playwright E2E tests
npm run verify             # Full pipeline: lint + typecheck + unit + e2e
npm run build              # Package distributable (electron-forge make)
npm run icons:generate     # Regenerate app icons from resources/
```

Run a single unit test file:
```bash
npx vitest run src/renderer/stores/loop-store.test.ts
```

## Architecture

### Process Model (3 layers)

```
Main Process (src/main.ts + src/main/*)
  ├── ChildProcessManager — spawns/supervises monitor, agent, logTail
  ├── SocketBridge — Socket.IO client to Flask backend
  ├── IPC handlers — validates + routes renderer requests
  ├── TrayController — system tray with status indicators
  └── Security — CSP headers, navigation blocking, permission denial

Preload (src/preload.ts)
  └── contextBridge.exposeInMainWorld('sejfa', api)

Renderer (src/renderer.tsx + src/renderer/*)
  ├── Zustand stores — loop-store (events, gates, objective), system-store (processes, socket)
  ├── Components — toolbar, log-console, loop-visualization, evidence-drawer, keyboard-help
  └── Hooks — use-loop-events (event routing), use-electron-api, use-keyboard-shortcuts
```

### IPC Contract

All IPC channels are allowlisted in `src/shared/ipc.ts` (the `Channel` enum). The preload asserts channel membership before every `invoke` or `on` call. The main process validates all inputs in `src/main/validate.ts`.

The typed API surface is defined in `src/shared/api.ts` (`SejfaApi` interface). Both `window.sejfa` and `window.electronAPI` point to the same object.

### Managed Processes

`ChildProcessManager` supervises three processes configured via env vars:
- **monitor** — `SEJFA_MONITOR_CMD` (default: `python3 app.py`)
- **agent** — `SEJFA_AGENT_CMD` (default: `claude`)
- **logTail** — virtual in-process file tailer (no child spawn), reads `SEJFA_AGENT_LOG_PATH`

Processes auto-restart with exponential backoff (max 3 restarts, reset after 30s healthy).

### Ralph Loop Monitoring (FileTailService)

`FileTailService` watches `ralph-state.json` from a local Ralph loop project (default: `~/Desktop/DEV-PROJECTS/grupp-ett-github`). Configured via `SEJFA_LOOP_PROJECT_PATH` env var. Uses chokidar for push-based file watching with race condition handling. See `docs/RALPH_LOOP_MONITORING.md`.

### State Management

Two Zustand stores, both using the actions-outside-store pattern (exported `loopActions` / `systemActions` objects, not methods inside the store):
- `loop-store` — objective, gates, events (capped at 1000), currentNode, appMode (observe/control)
- `system-store` — process statuses, socket connection state, heartbeat

### Event Flow

Backend Socket.IO events (`loop_update`, `gate_change`, `agent_event`, `health`, `task_started`, `task_completed`) -> `SocketBridge` in main -> broadcast to all renderer windows via `Channel.LoopEventPush` -> `use-loop-events` hook dispatches to stores.

### Kill Switch

Two-phase arm/confirm pattern with a 5-second expiry window. Confirm triggers forced stop of all processes + socket disconnect.

## Security Rules

- `nodeIntegration: false`, `contextIsolation: true`, `sandbox: true` — always.
- All child processes spawned with `shell: false`.
- `shell.openExternal` only allows HTTPS to an allowlist of hosts (see `src/main/validate.ts`).
- Electron Fuses disable `RunAsNode`, `NodeOptions`, CLI inspect, and enforce ASAR-only loading.

## Tech Stack

- **Build**: Electron Forge + Vite (3 configs: main, preload, renderer)
- **UI**: React 19, Tailwind CSS 4 (via `@tailwindcss/vite`), Framer Motion, Lucide icons
- **State**: Zustand 5
- **Lint/Format**: Biome (single quotes, semicolons, 2-space indent, 100 line width)
- **Tests**: Vitest (jsdom), Playwright (E2E, `./e2e/`)
- **TypeScript**: strict mode with `noUncheckedIndexedAccess` and `exactOptionalPropertyTypes`

## Tailwind Theme

Custom colors and shadows are defined via CSS custom properties in `tailwind.config.ts` — use semantic tokens like `bg-deep`, `bg-panel`, `text-primary`, `border-subtle`, `glow-primary` etc. rather than hardcoded values.

## Environment Variables

| Variable | Purpose |
|---|---|
| `SEJFA_MONITOR_URL` | Socket.IO backend URL (default: `http://localhost:5000`) |
| `SEJFA_MONITOR_CMD` | Monitor process command (default: `python3`) |
| `SEJFA_MONITOR_ARGS` | Monitor args, JSON array or space-separated (default: `app.py`) |
| `SEJFA_MONITOR_CWD` | Monitor working directory |
| `SEJFA_AGENT_CMD` | Agent process command (default: `claude`) |
| `SEJFA_AGENT_ARGS` | Agent args |
| `SEJFA_AGENT_CWD` | Agent working directory |
| `SEJFA_AGENT_LOG_PATH` | Log file for virtual tail (default: `<userData>/sejfa-agent.log`) |
| `SEJFA_LOOP_PROJECT_PATH` | Ralph loop project path (default: `~/Desktop/DEV-PROJECTS/grupp-ett-github`) |
