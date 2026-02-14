import type { SejfaApi } from '../../shared/api';

export function useElectronApi(): SejfaApi {
  const api = window.electronAPI ?? window.sejfa;
  if (!api) {
    throw new Error('Preload API missing (expected window.electronAPI or window.sejfa)');
  }
  return api;
}
