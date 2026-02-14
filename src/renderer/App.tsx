import React from 'react';

import { useLoopEvents } from './hooks/use-loop-events';
import { MainView } from './views/main-view';

export function App() {
  useLoopEvents();

  return <MainView />;
}
