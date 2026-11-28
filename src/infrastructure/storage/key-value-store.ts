/**
 * Thin wrapper over AsyncStorage so the storage engine can change in one place.
 * Not for secrets (use expo-secure-store for tokens in P3).
 */
import AsyncStorage from '@react-native-async-storage/async-storage';

export const keyValueStore = {
  get: (key: string) => AsyncStorage.getItem(key),
  set: (key: string, value: string) => AsyncStorage.setItem(key, value),
  remove: (key: string) => AsyncStorage.removeItem(key),
  keys: () => AsyncStorage.getAllKeys(),
};
