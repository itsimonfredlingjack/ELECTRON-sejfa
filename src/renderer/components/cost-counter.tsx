import React from 'react';

import { useCost } from '../stores/loop-store';

function formatUsd(usd: number): string {
  if (usd === 0) return '$0.00';
  if (usd < 0.01) return `$${usd.toFixed(4)}`;
  return `$${usd.toFixed(2)}`;
}

function costColor(usd: number): string {
  if (usd < 1) return 'text-emerald-400';
  if (usd < 5) return 'text-amber-400';
  return 'text-red-400';
}

export function CostCounter() {
  const cost = useCost();
  const [showBreakdown, setShowBreakdown] = React.useState(false);

  if (!cost) return null;

  return (
    <div
      className="relative flex items-center gap-1.5"
      onMouseEnter={() => setShowBreakdown(true)}
      onMouseLeave={() => setShowBreakdown(false)}
    >
      <span className="text-[9px] font-mono font-bold uppercase tracking-widest text-text-muted">
        COST
      </span>
      <span className={`font-mono text-sm font-bold tabular-nums ${costColor(cost.total_usd)}`}>
        {formatUsd(cost.total_usd)}
      </span>

      {showBreakdown && cost.breakdown && (
        <div className="absolute top-full right-0 z-50 mt-1 rounded-lg border border-border-subtle bg-bg-panel/95 p-3 shadow-lg backdrop-blur-md">
          <div className="flex flex-col gap-1 font-mono text-[10px]">
            <div className="flex justify-between gap-4">
              <span className="text-text-muted">Input</span>
              <span className="text-text-secondary">{formatUsd(cost.breakdown.input_usd)}</span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-text-muted">Output</span>
              <span className="text-text-secondary">{formatUsd(cost.breakdown.output_usd)}</span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-text-muted">Cache</span>
              <span className="text-text-secondary">{formatUsd(cost.breakdown.cache_usd)}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
