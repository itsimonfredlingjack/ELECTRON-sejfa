import path from 'node:path';
import { BrowserWindow } from 'electron';

export function createMainWindow({ isDev }: { isDev: boolean }) {
  const win = new BrowserWindow({
    width: 1200,
    height: 820,
    minWidth: 1024,
    minHeight: 768,
    backgroundColor: '#0b0f17',
    show: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      // Security baseline:
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      webSecurity: true,
      allowRunningInsecureContent: false,
      spellcheck: false,
      devTools: isDev,
    },
  });

  // Reduce surface area for unexpected shortcuts/menus.
  win.removeMenu();

  win.once('ready-to-show', () => win.show());

  if (MAIN_WINDOW_VITE_DEV_SERVER_URL) {
    win.loadURL(MAIN_WINDOW_VITE_DEV_SERVER_URL);
  } else {
    win.loadFile(path.join(__dirname, `../renderer/${MAIN_WINDOW_VITE_NAME}/index.html`));
  }

  return win;
}
