import type { SejfaApi } from '../shared/api';

declare global {
  interface Window {
    sejfa?: SejfaApi;
    electronAPI?: SejfaApi;
  }
}
