import { app, globalShortcut } from 'electron';

export function registerGlobalShortcuts(opts: { toggleWindow: () => void }) {
  const ok = globalShortcut.register('CommandOrControl+Shift+S', () => {
    opts.toggleWindow();
  });

  if (!ok) {
    // Avoid throwing: keyboard shortcut registration can fail due to OS policy.
    // The app remains functional via tray/menu.
  }

  app.on('will-quit', () => {
    globalShortcut.unregisterAll();
  });
}
