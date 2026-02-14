import { Menu, Tray, nativeImage } from 'electron';

export type TrayLevel = 'green' | 'yellow' | 'red';

export type TrayState = {
  level: TrayLevel;
  objective?: string;
  gateStatus?: string;
  running?: boolean;
};

function toDataUrl(svg: string) {
  return `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`;
}

function buildStatusIcon(level: TrayLevel) {
  const color = level === 'green' ? '#22c55e' : level === 'yellow' ? '#f59e0b' : '#ef4444';
  const svg = [
    `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16">`,
    `<circle cx="8" cy="8" r="6" fill="${color}" />`,
    `<circle cx="8" cy="8" r="6" fill="none" stroke="#0b0f17" stroke-width="1" />`,
    '</svg>',
  ].join('');
  return nativeImage.createFromDataURL(toDataUrl(svg));
}

function formatTooltip(state: TrayState) {
  const lines = ['SEJFA Command Center'];
  if (state.objective) lines.push(`Objective: ${state.objective}`);
  if (state.gateStatus) lines.push(`Gate: ${state.gateStatus}`);
  return lines.join('\n');
}

export class TrayController {
  private readonly tray: Tray;
  private state: TrayState = { level: 'yellow', running: false };
  private readonly onStart: () => void;
  private readonly onStop: () => void;
  private readonly onShow: () => void;
  private readonly onQuit: () => void;

  constructor(opts: {
    onStart: () => void;
    onStop: () => void;
    onShow: () => void;
    onQuit: () => void;
  }) {
    this.onStart = opts.onStart;
    this.onStop = opts.onStop;
    this.onShow = opts.onShow;
    this.onQuit = opts.onQuit;

    this.tray = new Tray(buildStatusIcon(this.state.level));
    this.tray.setToolTip(formatTooltip(this.state));
    this.tray.setContextMenu(this.buildMenu());
    this.tray.on('click', () => this.onShow());
  }

  setState(next: Partial<TrayState>) {
    this.state = { ...this.state, ...next };
    this.tray.setImage(buildStatusIcon(this.state.level));
    this.tray.setToolTip(formatTooltip(this.state));
    this.tray.setContextMenu(this.buildMenu());
  }

  private buildMenu() {
    const running = Boolean(this.state.running);
    return Menu.buildFromTemplate([
      {
        label: running ? 'Start (Running)' : 'Start',
        enabled: !running,
        click: () => this.onStart(),
      },
      {
        label: running ? 'Stop' : 'Stop (Stopped)',
        enabled: running,
        click: () => this.onStop(),
      },
      { type: 'separator' },
      { label: 'Show', click: () => this.onShow() },
      { label: 'Quit', click: () => this.onQuit() },
    ]);
  }

  destroy() {
    this.tray.destroy();
  }
}
