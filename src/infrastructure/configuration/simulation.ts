/**
 * Prototype-only network simulation switches, observable by the UI.
 * In P3 `offline` is replaced by real connectivity (expo-network / NetInfo).
 */
import { useSyncExternalStore } from 'react';
import { keyValueStore } from '../storage/key-value-store';

const KEY = 'minik-atlas/simulation/v1';

export interface SimulationSettings {
  offline: boolean;
  slowNetwork: boolean;
  uploadFailure: boolean;
}

let state: SimulationSettings = { offline: false, slowNetwork: false, uploadFailure: false };
const listeners = new Set<() => void>();

export const simulationStore = {
  get: () => state,
  set(patch: Partial<SimulationSettings>) {
    state = { ...state, ...patch };
    listeners.forEach((l) => l());
    keyValueStore.set(KEY, JSON.stringify(state)).catch(() => undefined);
  },
  /** Restores switches after an app reload so failure paths can be tested end to end. */
  async restore() {
    try {
      const raw = await keyValueStore.get(KEY);
      if (raw) {
        state = { ...state, ...(JSON.parse(raw) as Partial<SimulationSettings>) };
        listeners.forEach((l) => l());
      }
    } catch {
      // ignore
    }
  },
  subscribe(listener: () => void) {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },
};

export function useSimulation(): SimulationSettings {
  return useSyncExternalStore(simulationStore.subscribe, simulationStore.get, simulationStore.get);
}
