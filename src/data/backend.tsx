/**
 * Selects the active Backend implementation. Swap providers here.
 */
import { createContext, ReactNode, useContext } from 'react';
import { demoBackend } from './providers/demo/demo-backend';
import type { Backend } from './repositories/types';

const BackendContext = createContext<Backend>(demoBackend);

export function BackendProvider({ backend = demoBackend, children }: { backend?: Backend; children: ReactNode }) {
  return <BackendContext.Provider value={backend}>{children}</BackendContext.Provider>;
}

export function useBackend(): Backend {
  return useContext(BackendContext);
}
