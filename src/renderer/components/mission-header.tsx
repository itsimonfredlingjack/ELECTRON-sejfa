import React from 'react';

export type MissionHeaderProps = {
    objectiveText: string;
    prUrl?: string | undefined;
    runUrl?: string | undefined;
    onOpenPr?: () => void;
    onOpenRun?: () => void;
    openPrDisabled?: boolean;
    openRunDisabled?: boolean;
};

export function MissionHeader({
    objectiveText,
    onOpenPr,
    onOpenRun,
    openPrDisabled,
    openRunDisabled,
}: MissionHeaderProps) {
    const isIdle = objectiveText === 'Idle';

    // Extract Jira key from "SEJFA-123 — summary" format
    const jiraMatch = objectiveText.match(/^([A-Z]+-\d+)\s*[—–-]\s*(.+)$/);
    const jiraKey = jiraMatch?.[1];
    const summary = jiraMatch?.[2] ?? objectiveText;

    return (
        <div className="relative flex items-center gap-6 px-6 py-4">
            {/* Jira Ticket Badge */}
            {jiraKey ? (
                <div className="shrink-0 flex flex-col items-center gap-1">
                    <span className="font-heading text-lg font-bold tracking-tight text-primary bg-primary/10 px-3 py-1 rounded-lg border border-primary/20">
                        {jiraKey}
                    </span>
                    <span className="text-[9px] font-bold uppercase tracking-[0.15em] text-text-muted">
                        TICKET
                    </span>
                </div>
            ) : (
                <div className="shrink-0 flex h-10 w-10 items-center justify-center rounded-lg bg-bg-panel border border-border-subtle">
                    <span className="text-text-muted text-xs font-mono">&mdash;</span>
                </div>
            )}

            {/* Divider */}
            <div className="h-8 w-px bg-border-subtle shrink-0" />

            {/* Objective Text */}
            <div className="flex-1 min-w-0">
                <p
                    className={`font-heading text-lg truncate ${isIdle
                            ? 'text-text-muted font-medium'
                            : 'text-text-primary font-semibold tracking-tight'
                        }`}
                    title={objectiveText}
                >
                    {isIdle ? 'No active objective' : summary}
                </p>
                {!isIdle && (
                    <p className="text-[11px] text-text-muted font-medium uppercase tracking-wider mt-0.5">
                        Active Mission
                    </p>
                )}
            </div>

            {/* Navigation Links */}
            <div className="flex items-center gap-2 shrink-0">
                <button
                    type="button"
                    disabled={openPrDisabled}
                    onClick={onOpenPr}
                    className="flex items-center gap-1.5 rounded-lg border border-border-subtle bg-bg-deep/30 px-3 py-1.5 text-[11px] font-semibold text-text-primary/80 transition-colors hover:bg-bg-panel-hover hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 disabled:cursor-not-allowed disabled:opacity-40"
                >
                    PR
                    <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                    </svg>
                </button>
                <button
                    type="button"
                    disabled={openRunDisabled}
                    onClick={onOpenRun}
                    className="flex items-center gap-1.5 rounded-lg border border-border-subtle bg-bg-deep/30 px-3 py-1.5 text-[11px] font-semibold text-text-primary/80 transition-colors hover:bg-bg-panel-hover hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 disabled:cursor-not-allowed disabled:opacity-40"
                >
                    Run
                    <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                    </svg>
                </button>
            </div>

            {/* Animated bottom border when active */}
            {!isIdle && (
                <div
                    className="absolute bottom-0 left-0 right-0 h-0.5"
                    style={{
                        background: 'linear-gradient(90deg, var(--primary), var(--secondary), var(--primary))',
                        backgroundSize: '200% 100%',
                        animation: 'border-flow 3s linear infinite',
                    }}
                />
            )}
        </div>
    );
}
