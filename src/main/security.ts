import { type WebContents, app, session } from 'electron';

function buildCsp(isDev: boolean) {
  // Keep dev permissive enough for Vite HMR; prod is much tighter.
  const scriptSrc = isDev
    ? "script-src 'self' 'unsafe-eval' 'unsafe-inline';"
    : "script-src 'self';";
  const connectSrc = isDev
    ? "connect-src 'self' ws://localhost:* http://localhost:*;"
    : "connect-src 'self';";

  return [
    "default-src 'self';",
    "base-uri 'self';",
    "form-action 'self';",
    "frame-ancestors 'none';",
    "object-src 'none';",
    "img-src 'self' data:;",
    "font-src 'self' data: https://fonts.gstatic.com;",
    // In dev, Vite injects styles; in prod, CSS is still local but allowing inline keeps us flexible.
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com;",
    scriptSrc,
    connectSrc,
  ].join(' ');
}

function isAllowedNavigation(url: string, isDev: boolean) {
  try {
    const parsed = new URL(url);
    if (parsed.protocol === 'file:') return true;
    if (isDev && (parsed.protocol === 'http:' || parsed.protocol === 'https:')) {
      return parsed.hostname === 'localhost' || parsed.hostname === '127.0.0.1';
    }
    return false;
  } catch {
    return false;
  }
}

export function registerAppSecurityHandlers({ isDev }: { isDev: boolean }) {
  // CSP headers applied to all renderer responses (dev server + file://).
  const csp = buildCsp(isDev);
  session.defaultSession.webRequest.onHeadersReceived((details, cb) => {
    const responseHeaders = details.responseHeaders ?? {};
    responseHeaders['Content-Security-Policy'] = [csp];
    responseHeaders['X-Content-Type-Options'] = ['nosniff'];
    responseHeaders['Referrer-Policy'] = ['no-referrer'];
    cb({ responseHeaders });
  });

  // Deny permissions by default; allow later on a per-permission basis when needed.
  session.defaultSession.setPermissionRequestHandler((_wc, _permission, callback) => {
    callback(false);
  });
  session.defaultSession.setPermissionCheckHandler(() => false);

  app.on('web-contents-created', (_event, contents: WebContents) => {
    // Block new windows/popups (prevents opener-based attacks).
    contents.setWindowOpenHandler(() => ({ action: 'deny' }));

    // Block unexpected navigations.
    contents.on('will-navigate', (event, url) => {
      if (!isAllowedNavigation(url, isDev)) event.preventDefault();
    });

    // Prevent <webview> usage (adds a lot of attack surface).
    contents.on('will-attach-webview', (event) => {
      event.preventDefault();
    });
  });
}
