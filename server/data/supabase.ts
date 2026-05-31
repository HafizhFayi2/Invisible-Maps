import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import {
  getSupabaseServiceRoleKey,
  getSupabaseUrl,
  isSupabasePersistenceEnabled,
} from '../utils/env';

let client: SupabaseClient | null = null;

export function getSupabaseClient(): SupabaseClient | null {
  if (!isSupabasePersistenceEnabled()) {
    return null;
  }

  if (client) {
    return client;
  }

  const url = getSupabaseUrl();
  const serviceKey = getSupabaseServiceRoleKey();

  if (!url || !serviceKey) {
    return null;
  }

  client = createClient(url, serviceKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });

  return client;
}
