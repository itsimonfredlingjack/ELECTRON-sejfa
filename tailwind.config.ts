import type { Config } from 'tailwindcss';

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        'neon-green': 'var(--neon-green)',
        'neon-red': 'var(--neon-red)',
        'cyber-black': 'var(--cyber-black)',
        'glass-panel': 'var(--glass-panel)',
      },
      boxShadow: {
        'glow-green': 'var(--glow-green)',
        'glow-red': 'var(--glow-red)',
        'glow-cyan': 'var(--glow-cyan)',
      },
      fontFamily: {
        mono: ['"JetBrains Mono"', '"Fira Code"', 'monospace'],
        heading: ['"JetBrains Mono"', '"Fira Code"', 'monospace'],
      },
    },
  },
} satisfies Config;
