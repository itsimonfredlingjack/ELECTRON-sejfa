export enum Channel {
  AppGetVersion = 'sejfa:app/getVersion',
  LoopPing = 'sejfa:loop/ping',

  ProcessesStart = 'sejfa:processes/start',
  ProcessesStop = 'sejfa:processes/stop',
  ProcessesRestart = 'sejfa:processes/restart',
  ProcessesGetStatus = 'sejfa:processes/getStatus',

  KillArm = 'sejfa:kill/arm',
  KillConfirm = 'sejfa:kill/confirm',

  SocketGetStatus = 'sejfa:socket/getStatus',
  SocketConnect = 'sejfa:socket/connect',
  SocketDisconnect = 'sejfa:socket/disconnect',

  FileTailStart = 'sejfa:fileTail/start',
  FileTailStop = 'sejfa:fileTail/stop',
  FileTailGetStatus = 'sejfa:fileTail/getStatus',

  ShellOpenExternal = 'sejfa:shell/openExternal',

  MonitorConnect = 'sejfa:monitor/connect',
  MonitorDisconnect = 'sejfa:monitor/disconnect',
  MonitorGetStatus = 'sejfa:monitor/getStatus',

  LoopEventPush = 'sejfa:loop/event',
  MonitorEventPush = 'sejfa:monitor/event',
}

// Backwards compatibility with Phase 1 naming.
export { Channel as IpcChannel };

export const IPC_INVOKE_CHANNELS = [
  Channel.AppGetVersion,
  Channel.LoopPing,
  Channel.ProcessesStart,
  Channel.ProcessesStop,
  Channel.ProcessesRestart,
  Channel.ProcessesGetStatus,
  Channel.KillArm,
  Channel.KillConfirm,
  Channel.SocketGetStatus,
  Channel.SocketConnect,
  Channel.SocketDisconnect,
  Channel.FileTailStart,
  Channel.FileTailStop,
  Channel.FileTailGetStatus,
  Channel.ShellOpenExternal,
  Channel.MonitorConnect,
  Channel.MonitorDisconnect,
  Channel.MonitorGetStatus,
] as const;
export type IpcInvokeChannel = (typeof IPC_INVOKE_CHANNELS)[number];

export const IPC_EVENT_CHANNELS = [Channel.LoopEventPush, Channel.MonitorEventPush] as const;
export type IpcEventChannel = (typeof IPC_EVENT_CHANNELS)[number];
