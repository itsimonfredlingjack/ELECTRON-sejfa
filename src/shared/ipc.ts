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

  ShellOpenExternal = 'sejfa:shell/openExternal',

  LoopEventPush = 'sejfa:loop/event',
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
  Channel.ShellOpenExternal,
] as const;
export type IpcInvokeChannel = (typeof IPC_INVOKE_CHANNELS)[number];

export const IPC_EVENT_CHANNELS = [Channel.LoopEventPush] as const;
export type IpcEventChannel = (typeof IPC_EVENT_CHANNELS)[number];
