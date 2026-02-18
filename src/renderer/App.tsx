import React from 'react';

import { useLoopEvents } from './hooks/use-loop-events';
import { MainView } from './views/main-view';

class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { error: Error | null; showDetails: boolean }
> {
  override state: { error: Error | null; showDetails: boolean } = {
    error: null,
    showDetails: false,
  };

  static getDerivedStateFromError(error: Error) {
    return { error, showDetails: false };
  }

  override componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('[ErrorBoundary] Caught:', error.message, error.stack, info.componentStack);
  }

  override render() {
    const err = this.state.error;
    if (!err) return this.props.children;

    const showDetails = this.state.showDetails;
    return (
      <div
        className="flex min-h-screen flex-col items-center justify-center bg-bg-deep px-8 py-12"
        role="alert"
      >
        <div className="text-danger mb-4 text-6xl" aria-hidden>
          ⚠
        </div>
        <h1 className="font-heading text-2xl font-bold text-text-primary">Something went wrong</h1>
        <p className="mt-2 max-w-md text-center text-text-secondary">
          The app encountered an unexpected error. You can reload to try again.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="rounded-lg border border-primary/30 bg-primary/10 px-4 py-2 font-semibold text-primary hover:bg-primary/20 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
            aria-label="Reload the application"
          >
            Reload App
          </button>
          <button
            type="button"
            onClick={() => this.setState({ showDetails: !showDetails })}
            className="rounded-lg border border-border-subtle px-4 py-2 text-sm font-medium text-text-secondary hover:bg-bg-panel transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
            aria-expanded={showDetails}
            aria-controls="error-details"
          >
            {showDetails ? 'Hide' : 'Show'} technical details
          </button>
        </div>
        {showDetails && (
          <pre
            id="error-details"
            className="mt-6 max-h-64 w-full max-w-2xl overflow-auto rounded-lg border border-border-subtle bg-black/40 p-4 font-mono text-xs text-text-muted"
          >
            {err.message}
            {'\n\n'}
            {err.stack}
          </pre>
        )}
      </div>
    );
  }
}

export function App() {
  useLoopEvents();

  return (
    <ErrorBoundary>
      <MainView />
    </ErrorBoundary>
  );
}
