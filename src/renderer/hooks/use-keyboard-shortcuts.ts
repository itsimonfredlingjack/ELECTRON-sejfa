import { useEffect } from 'react';

import type { ToolbarMode } from '../components/toolbar';
import type { GateId } from '../models/ui';

function isTextInputTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName.toLowerCase();
  if (tag === 'input' || tag === 'textarea' || tag === 'select') return true;
  return Boolean(target.closest('input,textarea,select,[contenteditable="true"]'));
}

export type KeyboardShortcutsOpts = {
  gates: GateId[];
  drawerOpen: boolean;
  helpOpen: boolean;
  controlsEnabled: boolean;

  onSelectGate: (id: GateId) => void;
  onOpenDrawer: () => void;
  onCloseDrawer: () => void;
  onSetMode: (mode: ToolbarMode) => void;
  onPause: () => void;
  onToggleHelp: () => void;
  onDisarmKill: () => void;
};

export function useKeyboardShortcuts(opts: KeyboardShortcutsOpts) {
  const {
    gates,
    drawerOpen,
    helpOpen,
    controlsEnabled,
    onSelectGate,
    onOpenDrawer,
    onCloseDrawer,
    onSetMode,
    onPause,
    onToggleHelp,
    onDisarmKill,
  } = opts;

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const inTextInput = isTextInputTarget(e.target);

      if (e.key === 'Escape') {
        e.preventDefault();
        if (drawerOpen) onCloseDrawer();
        if (helpOpen) onToggleHelp();
        onDisarmKill();
        return;
      }

      if (inTextInput) return;

      if (e.key === '?') {
        e.preventDefault();
        onToggleHelp();
        return;
      }

      if (e.key === 'o' || e.key === 'O') {
        e.preventDefault();
        onSetMode('observe');
        return;
      }
      if (e.key === 'c' || e.key === 'C') {
        e.preventDefault();
        onSetMode('control');
        return;
      }

      if (e.key === ' ') {
        if (!controlsEnabled) return;
        e.preventDefault();
        onPause();
        return;
      }

      if (/^[1-5]$/.test(e.key)) {
        e.preventDefault();
        const idx = Number(e.key) - 1;
        const id = gates[idx];
        if (!id) return;
        onSelectGate(id);
        onOpenDrawer();
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [
    gates,
    drawerOpen,
    helpOpen,
    controlsEnabled,
    onSelectGate,
    onOpenDrawer,
    onCloseDrawer,
    onSetMode,
    onPause,
    onToggleHelp,
    onDisarmKill,
  ]);
}
