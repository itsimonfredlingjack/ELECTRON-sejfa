# AGENTS.md

## Project Identity
SEJFA Command Center is an Electron desktop app for monitoring and controlling an autonomous DevOps agent loop:
Jira ticket -> Claude agent -> local tests -> PR -> CI -> deploy -> verify/rollback.

## Tech Stack
- Runtime: Electron 33+
- Language: TypeScript (strict)
- UI: React 19 + Tailwind CSS 4
- State: Zustand
- Realtime: Socket.IO client (connects to Flask/SocketIO backend)
- IPC: contextBridge + ipcMain.handle/ipcRenderer.invoke + IPC push events
- Build: Electron Forge + Vite
- Lint/Format: Biome
- Tests: Vitest (unit) + Playwright (E2E)

## Architecture Rules
- NEVER enable `nodeIntegration` in BrowserWindow. Always `contextIsolation: true` and `sandbox: true`.
- Renderer is untrusted UI only. All OS/process access in main process only.
- Preload exposes a minimal typed API via `contextBridge.exposeInMainWorld`.
- All IPC channels must be allowlisted in `src/shared/ipc.ts`.
- Child processes MUST be spawned with `shell: false`.
- Validate all IPC inputs (type, length, enum membership).

## File Structure (current)
- Main: `src/main.ts` and `src/main/*`
- Preload: `src/preload.ts`
- Renderer: `src/renderer.tsx`, `src/renderer/*`
- Shared: `src/shared/*`

## Testing
- `npm run lint`
- `npm test`
- `npm start`

