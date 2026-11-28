/**
 * The app's Supabase client (R2). Follows the Supabase React Native
 * quickstart: AsyncStorage session storage, URL polyfill, no session
 * detection from URLs (sign-in uses a typed code, not a link).
 *
 * Only the publishable key is ever used here; app-config.ts refuses
 * privileged keys before this runs.
 */
import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { Database } from './database.types';

export function createAppSupabaseClient(config: { url: string; publishableKey: string }): SupabaseClient<Database> {
  return createClient<Database>(config.url, config.publishableKey, {
    auth: {
      storage: AsyncStorage,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
    },
  });
}
