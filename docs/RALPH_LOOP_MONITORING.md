# Ralph Loop Monitoring

## Overview

The SEJFA Electron app now includes **local file-based monitoring** for Ralph Loop (grupp-ett-github project). This allows you to see real-time updates from Claude Code's Ralph loop directly in the Electron app's monitor **without modifying the loop project**.

## How It Works

The FileTail service watches `ralph-state.json` from your loop project and emits events when the loop state changes. These events are displayed in the Electron app's log console.

### Architecture

```
Ralph Loop (grupp-ett-github)
  └─ .claude/ralph-state.json  (written by loop)
       ↓ (file watching via chokidar)
FileTailService (Electron main process)
       ↓ (IPC events)
MainView (Electron renderer)
  └─ LogConsole (displays loop activity)
```

### What Gets Monitored

- **Loop start/stop** - When a Ralph loop begins or completes
- **Iteration count** - How many iterations have been executed
- **Loop status** - Whether the loop is currently active or idle
- **Timestamps** - When the loop started and last checked

## Configuration

### Default Path

By default, the app looks for the loop project at:
```
~/Desktop/DEV-PROJECTS/grupp-ett-github
```

### Custom Path (Environment Variable)

To monitor a loop project at a different location, set the environment variable:

```bash
export SEJFA_LOOP_PROJECT_PATH="/path/to/your/loop-project"
```

Then start the Electron app:

```bash
npm start
```

### Custom Path (Code)

You can also modify `src/main/file-tail-service.ts`:

```typescript
// BEFORE (default)
this.loopProjectPath = loopProjectPath ?? join(homedir(), 'Desktop', 'DEV-PROJECTS', 'grupp-ett-github');

// AFTER (custom)
this.loopProjectPath = loopProjectPath ?? '/your/custom/path';
```

## UI Controls

### File Monitor Toggle

Located in the top-left corner of the main view:

- **Green "Monitoring"** - File watching is active
- **Gray "Stopped"** - File watching is inactive
- **Status indicator** - Shows if loop is active and iteration count

### Toggle Actions

- **Click to start** - Begin watching ralph-state.json
- **Click to stop** - Stop watching

The monitor starts automatically when the app launches.

## Events Displayed

### Loop Started
```
Ralph loop active - iteration 1
```

### Loop Progress
```
Ralph loop active - iteration 5
```

### Loop Completed
```
Ralph loop completed after 12 iterations
```

### File Monitor Control
```
Ralph loop file monitoring started
Ralph loop file monitoring stopped
```

## Technical Details

### Race Condition Handling

The FileTail service handles race conditions when reading `ralph-state.json` while it's being written:

```typescript
try {
  const data = JSON.parse(content);
} catch (err) {
  if (err instanceof SyntaxError) {
    // File is being written - wait for next event
    return;
  }
  throw err;
}
```

### File Watching

Uses **chokidar** for push-based file watching (faster than polling):

```typescript
this.watcher = chokidar.watch(this.ralphStatePath, {
  persistent: true,
  ignoreInitial: false,
  awaitWriteFinish: {
    stabilityThreshold: 100,
    pollInterval: 50,
  },
});
```

### State Structure

The `ralph-state.json` file contains:

```json
{
  "started_at": "2026-02-16T06:19:25.821143",
  "loop_active": false,
  "last_seen_transcript_path": "/path/to/transcript.jsonl",
  "iterations": 1,
  "last_check": "2026-02-16T06:19:25.821718",
  "completed_at": "2026-02-16T06:19:29.152132"
}
```

## Advantages

✅ **No code changes in loop project** - Works with existing Ralph loop implementation
✅ **Simple** - Just file I/O, no network complexity
✅ **No Flask backend required** - Works when loop runs locally
✅ **Offline-friendly** - No external service dependencies
✅ **Low latency** - Push-based file watching (instant updates)
✅ **Robust** - Handles partial file reads and missing files gracefully

## Future Enhancements

### Optional: CURRENT_TASK.md Parsing

Monitor the current task progress by reading:
```
~/Desktop/DEV-PROJECTS/grupp-ett-github/CURRENT_TASK.md
```

### Optional: Transcript Tailing

View full agent reasoning by tailing:
```
~/.claude/projects/.../[transcript-uuid].jsonl
```

## Troubleshooting

### "File not found" errors

- Verify the loop project path is correct
- Check that `.claude/ralph-state.json` exists in your loop project
- Make sure you've run `/start-task` at least once in the loop project

### No updates showing

- Check that the FileMonitor toggle shows "Monitoring"
- Verify that the Ralph loop is actually running
- Look for FileTail errors in the console logs

### Permission errors (macOS Sandboxing)

If you build a production `.app` and encounter file access errors:

- This works fine in `npm run dev`
- For production builds, you may need to:
  - Add entitlements for file access
  - Use an "Open Folder" dialog to get user permission
  - This is documented in the plan but deferred for production use

## Related Files

| File | Purpose |
|------|---------|
| `src/main/file-tail-service.ts` | Core file watching service |
| `src/main/ipc-handlers.ts` | IPC handlers for start/stop/status |
| `src/shared/ipc.ts` | Channel definitions |
| `src/shared/api.ts` | FileTail API types |
| `src/preload.ts` | IPC bridge to renderer |
| `src/renderer/components/file-monitor-toggle.tsx` | UI toggle component |
| `src/renderer/views/main-view.tsx` | Main view integration |

## Credits

Implemented following the plan from `/Users/coffeedev/.claude/projects/-Users-coffeedev/c2b7bbf8-f6a8-4513-87d9-c122351ac43f.jsonl`

**KRITISKA GOTCHAS addressed:**
1. ✅ Race condition handling with try/catch for JSON.parse
2. ✅ Used `os.homedir()` instead of hardcoded paths
3. ✅ Used chokidar for push-based file watching
4. ✅ Noted macOS sandboxing for future production builds
