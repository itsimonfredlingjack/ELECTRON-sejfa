# SEJFA Command Center — Codex Build Plan

> **Target model**: GPT-5.3-Codex
> **Reasoning effort**: high
> **Sandbox**: workspace-write
> **Approval policy**: suggest (use `never` for non-destructive steps)

---

## AGENTS.md (place in repo root)

```markdown
# AGENTS.md

## Project Identity
SEJFA Command Center — an Electron desktop app for monitoring and controlling an autonomous DevOps agent loop. The loop runs: Jira ticket → Claude Code agent → local tests/lint → PR → GitHub Actions CI → Azure Container Apps deploy → post-deploy health verify → rollback if needed.

## Tech Stack
- Runtime: Electron 33+ (main + renderer process)
- Language: TypeScript (strict mode, ES2022 target)
- UI framework: React 19 + Tailwind CSS 4
- State: Zustand (lightweight, no boilerplate)
- Realtime: Socket.IO client (connects to existing Flask/SocketIO monitor backend)
- IPC: Electron contextBridge + ipcMain.handle/ipcRenderer.invoke
- Build tooling: Vite for renderer, tsup for main process
- Packaging: Electron Forge with @electron-forge/maker-dmg + maker-deb
- Testing: Vitest (unit) + Playwright Electron (E2E)
- Linting: Biome (not ESLint)

## Architecture Rules
- NEVER enable nodeIntegration in BrowserWindow. Always use contextIsolation: true + sandbox: true.
- ALL Node/OS operations run in main process only. Renderer is pure React.
- Preload script exposes a minimal typed API via contextBridge. Max 15 methods.
- Child processes (Flask server, Claude CLI, scripts) managed via main process spawn/kill lifecycle.
- All IPC channels whitelisted in a single channels.ts enum file.
- No direct `require('electron')` in renderer code, ever.
- Use CSS variables for theming. Dark theme is default and primary.

## Code Conventions
- TypeScript strict mode. No `any`. No `as` casts unless absolutely necessary.
- Functional components only. No class components.
- Named exports. No default exports except for React pages.
- File naming: kebab-case for files, PascalCase for components.
- Minimal comments. Code should be self-documenting.
- Max 200 lines per file. Split if larger.
- All async functions must handle errors (try/catch or .catch).

## File Structure Convention
```
sejfa-command-center/
├── AGENTS.md
├── package.json
├── forge.config.ts
├── vite.main.config.ts
├── vite.renderer.config.ts
├── tsconfig.json
├── src/
│   ├── main/              # Electron main process
│   │   ├── index.ts       # Entry point, window creation
│   │   ├── ipc-handlers.ts
│   │   ├── child-processes.ts
│   │   ├── tray.ts
│   │   └── channels.ts    # IPC channel enum (shared)
│   ├── preload/
│   │   └── index.ts       # contextBridge API
│   ├── renderer/          # React app
│   │   ├── index.html
│   │   ├── main.tsx
│   │   ├── app.tsx
│   │   ├── stores/        # Zustand stores
│   │   ├── components/    # Reusable UI
│   │   ├── views/         # Page-level layouts
│   │   ├── hooks/         # Custom React hooks
│   │   └── styles/        # Tailwind + CSS variables
│   └── shared/            # Types shared between main/renderer
│       └── types.ts
├── resources/             # Icons, tray assets
└── tests/
    ├── unit/
    └── e2e/
```

## Testing
- Run `npm test` after every change.
- Run `npm run lint` before commits.
- E2E tests use Playwright's Electron integration.

## Security Checklist (enforce at all times)
- contextIsolation: true
- nodeIntegration: false
- sandbox: true
- webSecurity: true
- No shell: true in child_process.spawn
- Validate all IPC channel names against whitelist
- No eval(), no new Function()
- CSP header set in index.html
```

---

## Phase 1: Project Scaffold + Secure Electron Shell

### Task
Initialize the Electron + React + TypeScript project with Electron Forge, Vite, and security-hardened BrowserWindow.

### Deliverables
Create ALL of these files:

1. **package.json** — Electron 33+, React 19, Tailwind 4, Zustand, Socket.IO client, Vitest, Playwright, Biome, Electron Forge, Vite plugins
2. **tsconfig.json** — strict mode, ES2022, path aliases (`@main/*`, `@renderer/*`, `@shared/*`)
3. **forge.config.ts** — Vite plugin for main + renderer, DMG + DEB makers
4. **vite.main.config.ts** — main process bundling via tsup/vite
5. **vite.renderer.config.ts** — React + Tailwind + path aliases
6. **src/shared/types.ts** — Core domain types:

```typescript
export type LoopNode = 'jira' | 'claude' | 'github' | 'actions' | 'deploy' | 'verify'
export type GateStatus = 'pending' | 'running' | 'passed' | 'failed' | 'skipped'
export type AppMode = 'observe' | 'control'

export interface GateState {
  node: LoopNode
  status: GateStatus
  timestamp: number
  evidence?: string
}

export interface LoopEvent {
  id: string
  node: LoopNode
  type: 'info' | 'warning' | 'error' | 'success'
  message: string
  timestamp: number
  details?: Record<string, unknown>
}

export interface TaskObjective {
  jiraKey: string
  summary: string
  branch: string
  prUrl?: string
  currentNode: LoopNode
  gates: GateState[]
}

export interface SystemHealth {
  monitorConnected: boolean
  agentRunning: boolean
  lastHeartbeat: number
}
```

7. **src/main/channels.ts** — IPC channel whitelist enum:

```typescript
export enum Channel {
  AGENT_START = 'agent:start-task',
  AGENT_STOP = 'agent:kill',
  AGENT_PAUSE = 'agent:pause',
  LOOP_STATE = 'loop:state',
  LOOP_EVENTS = 'loop:events',
  GATE_STATUS = 'gate:status',
  SYSTEM_HEALTH = 'system:health',
  TRAY_ACTION = 'tray:action',
  OPEN_EXTERNAL = 'shell:open-external',
  CHILD_SPAWN = 'child:spawn',
  CHILD_KILL = 'child:kill',
}
```

8. **src/main/index.ts** — Main process entry:
   - Create BrowserWindow with security baseline (contextIsolation, sandbox, no nodeIntegration)
   - Load preload script
   - Set CSP via session.defaultSession.webRequest
   - Block navigation to external URLs
   - Block new window creation
   - Register all IPC handlers
   - Initialize tray

9. **src/preload/index.ts** — Typed contextBridge API:
   - Expose only methods matching Channel enum
   - Use `ipcRenderer.invoke` for request/response
   - Use `ipcRenderer.on` for push events (loop state, events)
   - Type the exposed API and export it as `ElectronAPI`

10. **src/renderer/index.html** — CSP meta tag, root div, Vite entry
11. **src/renderer/main.tsx** — React entry
12. **src/renderer/app.tsx** — Root component shell with dark theme

### Constraints
- Do NOT install Electron Builder. Use Electron Forge only.
- Do NOT use `require` anywhere in renderer code.
- Do NOT skip the CSP header.
- The app must start and show a dark window with "SEJFA Command Center" text. Verify by running `npm start`.

---

## Phase 2: Main Process — Child Process Manager + IPC Handlers

### Task
Build the control layer that manages external processes (Flask monitor, Claude CLI agent) and exposes IPC handlers for the renderer.

### Deliverables

1. **src/main/child-processes.ts**

```typescript
// Manages lifecycle of child processes
// Each process has: id, command, args, cwd, status, restartPolicy
// Methods: spawn, kill, restart, getStatus, streamLogs
// Events emitted to renderer via IPC push
// CRITICAL: Never use shell: true. Always pass args array.
// Implement health check ping (configurable interval)
// Auto-restart with exponential backoff (max 3 retries)
```

Supported processes to manage:
- `monitor-server` — `python app.py` (Flask/SocketIO backend)
- `agent-session` — `claude` CLI or custom agent start script
- `log-tail` — tail -f on agent log files

2. **src/main/ipc-handlers.ts**

Register handlers for every Channel:
- `agent:start-task` — validate jiraKey input, spawn agent with ticket, return success/error
- `agent:kill` — requires "armed" state (two-step: arm → confirm within 5s → kill). Log who/what killed.
- `agent:pause` — send SIGSTOP/SIGCONT or custom signal to agent process
- `shell:open-external` — whitelist allowed URL patterns (github.com, jira, azure portal)
- `child:spawn` / `child:kill` — manage child processes
- `system:health` — aggregate health from all managed processes

3. **src/main/tray.ts**

System tray with:
- Custom icon (use a simple SVG gear/eye icon, generate it)
- Context menu: Start Agent | Stop Agent | separator | Show Window | Quit
- Tray tooltip shows: "[objective] | [current gate status]"
- Click tray icon → show/focus main window
- Update tray icon color: green (all good), yellow (running), red (error)

4. **src/main/socket-bridge.ts**

Connect to existing Flask/SocketIO backend (default `http://localhost:5000`):
- Listen for events: `loop_update`, `gate_change`, `agent_event`, `health`
- Forward all events to renderer via IPC push
- Auto-reconnect with backoff
- Expose connection status

### Constraints
- All handlers must validate input. Reject unknown channels.
- Kill switch MUST be two-step (arm + confirm within timeout).
- Never expose raw child_process to renderer.

---

## Phase 3: Renderer — Zustand Stores + Socket Bridge Hook

### Task
Build the state management layer and real-time data hooks for the React UI.

### Deliverables

1. **src/renderer/stores/loop-store.ts**

```typescript
// Zustand store for loop state
// State: objective, gates[], events[], currentNode, appMode
// Actions: setObjective, updateGate, addEvent, clearEvents, setMode
// Subscriptions: listen to IPC push events and auto-update
```

2. **src/renderer/stores/system-store.ts**

```typescript
// Zustand store for system health
// State: processes map, socketConnected, lastHeartbeat
// Actions: updateProcessStatus, setConnectionState
```

3. **src/renderer/hooks/use-electron-api.ts**

```typescript
// Hook that wraps window.electronAPI with proper typing
// Returns typed methods for all IPC operations
// Handles errors gracefully (shows toast on IPC failure)
```

4. **src/renderer/hooks/use-loop-events.ts**

```typescript
// Hook that subscribes to IPC push events on mount
// Dispatches to Zustand stores
// Cleans up listeners on unmount
```

### Constraints
- Stores must be independent (no circular imports between stores).
- All store state must be serializable (no functions, no DOM refs in state).
- Export store hooks, not raw stores.

---

## Phase 4: Renderer — Command Center UI

### Task
Build the full cockpit interface. This is the core visual experience. The design should feel like a **mission control HUD** — dark, information-dense but organized, with clear visual hierarchy.

### Design Direction
- **Theme**: Dark industrial HUD. Think spacecraft mission control meets terminal aesthetic.
- **Colors**: Background `#0a0e17`. Panels `#111827` with subtle `#1e293b` borders. Accent `#22d3ee` (cyan) for active states, `#ef4444` (red) for errors, `#22c55e` (green) for passed, `#f59e0b` (amber) for warnings. Text `#e2e8f0` primary, `#94a3b8` secondary.
- **Typography**: `JetBrains Mono` for data/monospace. `Space Grotesk` or `Outfit` for headings. Load from Google Fonts.
- **Motion**: Subtle pulse animation on active node. Smooth gate bar transitions. Event list auto-scrolls with fade-in.
- **Layout**: Single-page, no routing. Dense but breathable with clear sections.

### Deliverables

1. **src/renderer/styles/theme.css** — CSS variables, Tailwind config, font imports, global dark styles

2. **src/renderer/components/toolbar.tsx**
```
[Objective: GE-123 — Fix auth bug]  [Mode: Observe ▾]  [⚠ 2]  [●]
[Start Task] [Pause] [Arm Kill ⚡] [Open PR ↗] [Open Run ↗]
```
- Objective shows jiraKey + summary (truncated)
- Mode toggle: Observe (read-only) / Control (actions enabled)
- Alert badge with count
- Connection indicator dot (green/red)
- Action buttons disabled in Observe mode
- Kill button requires arming (click "Arm Kill" → button turns red → "KILL" appears for 5s → auto-disarms)

3. **src/renderer/components/gate-bar.tsx**
```
Local ✓ → CI ⟳ → Review ✓ → Deploy ✓ → Verify ✗
```
- Horizontal pipeline visualization
- Each gate is a clickable pill/badge
- Status colors: pending=gray, running=cyan+pulse, passed=green, failed=red
- Connector lines between gates with directional arrow
- Click a gate → opens evidence drawer below

4. **src/renderer/components/loop-visualization.tsx**
- Node graph showing: JIRA → CLAUDE → GITHUB → ACTIONS → DEPLOY → VERIFY
- Active node glows with cyan pulse animation
- Completed nodes have checkmark overlay
- Failed nodes have red X overlay
- Nodes are arranged in a horizontal flow or circular layout
- Each node shows small status text below

5. **src/renderer/components/event-timeline.tsx**
- Chronological event list (newest first option)
- Each event: timestamp | node icon | severity color bar | message
- Severity: info=slate, warning=amber, error=red, success=green
- Auto-scroll to latest event (toggleable pin)
- Max 200 events in view, virtualized list for performance
- Filter by node and severity

6. **src/renderer/components/evidence-drawer.tsx**
- Slides up from bottom when a gate is clicked
- Shows: gate name, status, timestamp, evidence text
- Evidence text in monospace (command output, URLs, revision IDs)
- "Open in browser" button for relevant links
- Close button or click outside to dismiss

7. **src/renderer/components/mini-widget.tsx**
- Compact always-on-top capable view (optional, toggled from tray)
- Shows only: Objective | Current Gate | Last Event
- Minimal chrome, semi-transparent background
- Can be dragged

8. **src/renderer/views/main-view.tsx**
- Assembles all components into the cockpit layout:

```
┌─────────────────────────────────────────────────┐
│ Toolbar                                          │
├─────────────────────────────────────────────────┤
│ Gate Bar                                         │
├────────────────────────┬────────────────────────┤
│ Loop Visualization     │ Event Timeline          │
│ (flex: 2)              │ (flex: 3)               │
├────────────────────────┴────────────────────────┤
│ Evidence Drawer (expandable)                     │
└─────────────────────────────────────────────────┘
```

### Constraints
- All components must work with mock data first (create `src/renderer/mocks/mock-data.ts` with realistic sample data).
- No inline styles. All styling through Tailwind utility classes + CSS variables.
- Every interactive element must have keyboard support.
- Components must be responsive within the Electron window (min 1024x768).
- Use `React.memo` on event timeline items (performance).
- Animations via CSS only (no JS animation libraries for this phase).

---

## Phase 5: Integration — Connect Real Data

### Task
Wire the mock UI to real IPC data from main process. Connect to Socket.IO backend.

### Deliverables

1. **Update `src/renderer/hooks/use-loop-events.ts`** — subscribe to real IPC events instead of mocks
2. **Update all components** — read from Zustand stores instead of mock data
3. **Toolbar actions** — wire Start/Pause/Kill buttons to real IPC handlers
4. **Gate bar** — populate from real gate state events
5. **Event timeline** — stream real events from Socket.IO bridge
6. **Evidence drawer** — fetch evidence from main process on demand

### Integration test
Create `tests/e2e/smoke.spec.ts`:
- Launch Electron app with Playwright
- Verify window opens with correct title
- Verify toolbar renders
- Verify gate bar shows all 6 gates
- Verify connection indicator is visible
- Verify clicking a gate opens evidence drawer
- Verify mode toggle works

### Constraints
- App must still work (show UI) even when Flask backend is not running (show disconnected state).
- All real data must flow through Zustand stores. Components never call IPC directly.
- Evidence drawer should show "No evidence available" when data is missing.

---

## Phase 6: Keyboard Shortcuts + Polish

### Task
Add global and local keyboard shortcuts. Polish animations and transitions.

### Deliverables

1. **Global shortcuts** (Electron globalShortcut):
   - `Cmd+Shift+S` — Toggle show/hide main window
   - `Cmd+Shift+K` — Emergency kill (still requires arming)

2. **Local shortcuts** (React key handlers):
   - `Escape` — Close evidence drawer, cancel armed kill
   - `1-6` — Select gate 1-6
   - `O` — Switch to Observe mode
   - `C` — Switch to Control mode
   - `Space` — Pause/Resume agent

3. **Animations polish**:
   - Gate bar: smooth transitions between states (300ms ease)
   - Event timeline: new events fade in from top
   - Active node: subtle breathing pulse (opacity 0.7→1.0, 2s cycle)
   - Evidence drawer: slide up with spring easing
   - Kill button armed state: pulsing red glow

4. **src/renderer/components/keyboard-help.tsx** — `?` key shows shortcut cheat sheet overlay

---

## Phase 7: Build + Package

### Task
Configure Electron Forge for production builds. Test packaging on current OS.

### Deliverables

1. **Update forge.config.ts**:
   - DMG maker for macOS
   - DEB maker for Linux
   - App icon (create a simple `resources/icon.png` — dark background, cyan eye/radar icon, 1024x1024)
   - App name: "SEJFA Command Center"
   - Bundle ID: `dev.fredlingautomation.sejfa`

2. **package.json scripts**:
```json
{
  "start": "electron-forge start",
  "build": "electron-forge make",
  "test": "vitest run",
  "test:e2e": "playwright test",
  "lint": "biome check src/",
  "lint:fix": "biome check --fix src/"
}
```

3. **Verify**: Run `npm run build` and confirm it produces a working packaged app.

---

## Execution Order for Codex

Run these as sequential tasks. Each phase depends on the previous.

```
Phase 1 → Phase 2 → Phase 3 → Phase 4 → Phase 5 → Phase 6 → Phase 7
```

After each phase:
1. Run `npm run lint` — fix all issues
2. Run `npm test` — ensure no regressions
3. Run `npm start` — verify the app launches and renders correctly

---

## Reference: Existing Backend API (Socket.IO events)

The Command Center connects to an existing Flask/SocketIO backend. These are the events to listen for:

```
Server → Client:
  'loop_update'     → { node: LoopNode, status: string, timestamp: number }
  'gate_change'     → { gate: GateState }
  'agent_event'     → { event: LoopEvent }
  'health'          → { status: 'ok' | 'error', details: Record<string, unknown> }
  'task_started'    → { objective: TaskObjective }
  'task_completed'  → { jiraKey: string, result: 'success' | 'rollback' }

Client → Server:
  'request_state'   → {} (request full current state)
```

---

## Reference: Security Non-Negotiables

These MUST be true in the final build. Verify in E2E tests:

```typescript
// In BrowserWindow creation:
webPreferences: {
  contextIsolation: true,     // REQUIRED
  nodeIntegration: false,     // REQUIRED
  sandbox: true,              // REQUIRED
  webSecurity: true,          // REQUIRED
  allowRunningInsecureContent: false,
  preload: path.join(__dirname, 'preload.js')
}

// In index.html:
<meta http-equiv="Content-Security-Policy"
  content="default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; connect-src 'self' ws://localhost:* http://localhost:*;">
```

---

## Anti-Patterns to Avoid

- Do NOT create a monolithic index.ts with all logic. Split by responsibility.
- Do NOT use `remote` module (deprecated and insecure).
- Do NOT poll for state. Use event-driven IPC push.
- Do NOT store secrets or API keys in the Electron app.
- Do NOT use `shell.openExternal` without URL validation.
- Do NOT skip error boundaries in React components.
- Do NOT use `dangerouslySetInnerHTML` for event messages.
