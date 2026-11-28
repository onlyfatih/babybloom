/**
 * Selects the active Backend implementation from the validated configuration
 * (R2). Production never selects the demo provider: app-config.ts rejects
 * such a configuration and ConfigurationGate stops the app before this runs.
 */
import { createContext, ReactNode, useContext } from 'react';
import type { AppConfig } from '@/infrastructure/configuration/app-config';
import { demoBackend } from './providers/demo/demo-backend';
import { createDemoSessionBackend } from './providers/demo/demo-session-backend';
import { createAppSupabaseClient } from './providers/supabase/client';
import { createSupabaseBackend } from './providers/supabase/supabase-backend';
import { createSupabaseSessionBackend } from './providers/supabase/session-backend';
import type { Backend } from './repositories/types';
import type { SessionBackend } from './session/contracts';

export interface AppBackends {
  kind: AppConfig['backend'];
  backend: Backend;
  session: SessionBackend;
}

export function createAppBackends(config: AppConfig): AppBackends {
  if (config.backend === 'supabase') {
    if (!config.supabase) throw new Error('supabase backend without configuration');
    const client = createAppSupabaseClient(config.supabase);
    return { kind: 'supabase', backend: createSupabaseBackend(client), session: createSupabaseSessionBackend(client) };
  }
  return { kind: 'demo', backend: demoBackend, session: createDemoSessionBackend(demoBackend) };
}

const BackendContext = createContext<Backend>(demoBackend);

export function BackendProvider({ backend = demoBackend, children }: { backend?: Backend; children: ReactNode }) {
  return <BackendContext.Provider value={backend}>{children}</BackendContext.Provider>;
}

export function useBackend(): Backend {
  return useContext(BackendContext);
}
