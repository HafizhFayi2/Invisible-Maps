/**
 * services/supabase.ts
 * Supabase client + PostGIS query helpers.
 * DB client + PostGIS queries untuk merchant data.
 */

import { createClient, type SupabaseClient } from '@supabase/supabase-js';

let _client: SupabaseClient | null = null;

export function getSupabaseClient(): SupabaseClient {
  if (_client) return _client;

  let url = '';
  let key = '';

  if (typeof process !== 'undefined' && process.env) {
    url = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '';
    key = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || '';
  } else if (typeof import.meta !== 'undefined' && import.meta.env) {
    url = import.meta.env.VITE_SUPABASE_URL ?? '';
    key = import.meta.env.VITE_SUPABASE_ANON_KEY ?? '';
  }

  if (!url || !key) {
    console.warn('Supabase URL and ANON KEY are missing in environment variables. Falling back to offline placeholder client.');
    url = 'https://placeholder-offline-db.supabase.co';
    key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.dummy-anon-key-offline';
  }

  _client = createClient(url, key);
  return _client;
}

export interface MerchantRow {
  id: string;
  nmid: string;
  name: string;
  category: string | null;
  city: string | null;
  postal_code: string | null;
  lat: number;
  lng: number;
  image_urls: string[] | string | null;
  images?: string[] | null;     // alias used in some queries
  status: string;
  confidence: number;
  scan_count: number;
  source: string;
  created_at: string;
  updated_at: string;
}

/**
 * Fetch all merchants that have valid geocoordinates (for radar map markers).
 */
export async function getAllMerchants(): Promise<MerchantRow[]> {
  const client = getSupabaseClient();
  const { data, error } = await client
    .from('core_merchants')
    .select('*')
    .not('lat', 'is', null)
    .not('lng', 'is', null)
    .limit(200);

  if (error) {
    console.error('[supabase] getAllMerchants error:', error.message);
    return [];
  }
  // Inject default values for columns not in the core_merchants table schema
  return (data ?? []).map(row => ({
    ...row,
    category: 'Retail',
    image_urls: null,
  })) as MerchantRow[];
}

/**
 * Get total count of merchants in the database.
 */
export async function getMerchantCount(): Promise<number> {
  const client = getSupabaseClient();
  const { count, error } = await client
    .from('core_merchants')
    .select('*', { count: 'exact', head: true });

  if (error) return 0;
  return count ?? 0;
}

/**
 * Fetch the most recently added merchants.
 */
export async function getRecentMerchants(limit = 3): Promise<MerchantRow[]> {
  const client = getSupabaseClient();
  const { data, error } = await client
    .from('core_merchants')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) return [];
  // Inject default values for columns not in core_merchants table schema
  return (data ?? []).map(row => ({
    ...row,
    category: 'Retail',
    image_urls: null,
  })) as MerchantRow[];
}

/**
 * Insert a new merchant record.
 */
export async function insertMerchant(
  data: Omit<MerchantRow, 'id' | 'created_at' | 'updated_at'>,
): Promise<MerchantRow | null> {
  const client = getSupabaseClient();
  const { data: row, error } = await client
    .from('core_merchants')
    .insert(data)
    .select()
    .single();

  if (error) {
    console.error('[supabase] insertMerchant error:', error.message);
    return null;
  }
  return row as MerchantRow;
}

/**
 * Find merchant by NMID.
 */
export async function findMerchantByNMID(nmid: string): Promise<MerchantRow | null> {
  const client = getSupabaseClient();
  const { data, error } = await client
    .from('core_merchants')
    .select('*')
    .eq('nmid', nmid)
    .maybeSingle();

  if (error) return null;
  return data as MerchantRow | null;
}

/**
 * Find merchant by UUID (primary key).
 */
export async function getMerchantById(id: string): Promise<MerchantRow | null> {
  const client = getSupabaseClient();
  const { data, error } = await client
    .from('core_merchants')
    .select('*')
    .eq('id', id)
    .maybeSingle();

  if (error) return null;
  return data as MerchantRow | null;
}

/**
 * Radius query using PostGIS RPC function.
 * Returns merchants within `radiusMeters` of (lat, lng).
 */
export async function getMerchantsInRadius(
  lat: number,
  lng: number,
  radiusMeters: number,
  statusFilter: string[] = ['INVISIBLE', 'VERIFIED_INVISIBLE'],
): Promise<MerchantRow[]> {
  const client = getSupabaseClient();
  // Migration 003 has signature: get_merchants_in_radius(center_lat, center_lng, radius_m)
  const { data, error } = await client.rpc('get_merchants_in_radius', {
    center_lat: lat,
    center_lng: lng,
    radius_m: radiusMeters,
  });

  if (error) {
    console.error('[supabase] getMerchantsInRadius error:', error.message);
    return [];
  }

  const rows = (data ?? []) as any[];
  // Filter by status client-side and inject fallback fields for UI compatibility
  return rows
    .filter(row => statusFilter.includes(row.status))
    .map(row => ({
      ...row,
      category: 'Retail',
      image_urls: null,
    })) as MerchantRow[];
}

/**
 * Update merchant status and confidence.
 */
export async function updateMerchantStatus(
  id: string,
  status: string,
  confidence: number,
): Promise<void> {
  const client = getSupabaseClient();
  await client
    .from('core_merchants')
    .update({ status, confidence, updated_at: new Date().toISOString() })
    .eq('id', id);
}

/**
 * Write a scan event to the scan_events table (history log),
 * then upsert the merchant into core_merchants (map marker).
 *
 * Schema discovered from Supabase:
 *   scan_events: id, nmid, idempotency_key, source_user_id, lat, lng, qris_raw, source, result_status, result_confidence
 *   core_merchants: upserted by nmid, image_urls stored as base64 array (no Storage bucket)
 */
export async function upsertQrisScan(payload: {
  nmid: string;
  name: string;
  category: string;
  city: string;
  postal_code: string;
  lat: number;
  lng: number;
  qrisRaw?: string;          // raw QRIS string for audit
  imageBase64?: string;      // photo stored as base64 in image_urls
  sourceUserId?: string;
}): Promise<MerchantRow | null> {
  const client = getSupabaseClient();

  // ── Step 1: Upsert core_merchants (map pin) first ─────────────────────────
  const { data: existing } = await client
    .from('core_merchants')
    .select('*')
    .eq('nmid', payload.nmid)
    .maybeSingle();

  let merchantResult: MerchantRow | null = null;

  if (existing) {
    const { data, error } = await client
      .from('core_merchants')
      .update({
        lat: payload.lat,
        lng: payload.lng,
        city: payload.city || existing.city,
        postal_code: payload.postal_code || existing.postal_code,
        scan_count: (existing.scan_count ?? 0) + 1,
        updated_at: new Date().toISOString(),
      })
      .eq('id', existing.id)
      .select()
      .single();

    if (error) {
      console.error('[supabase] upsertQrisScan update error:', error.message);
      return null;
    }
    merchantResult = {
      ...data,
      category: 'Retail',
      image_urls: null,
    } as MerchantRow;
  } else {
    const { data, error } = await client
      .from('core_merchants')
      .insert({
        nmid: payload.nmid,
        name: payload.name,
        city: payload.city,
        postal_code: payload.postal_code,
        lat: payload.lat,
        lng: payload.lng,
        status: 'INVISIBLE',
        confidence: 80,
        scan_count: 1,
        source: 'qris_scan',
      })
      .select()
      .single();

    if (error) {
      console.error('[supabase] upsertQrisScan insert error:', error.message);
      return null;
    }
    merchantResult = {
      ...data,
      category: 'Retail',
      image_urls: null,
    } as MerchantRow;
  }

  // ── Step 2: Log to scan_events (history, always insert) ──────────────────
  if (merchantResult) {
    const idempotencyKey = `${payload.nmid}-${Date.now()}`;
    const { error: seError } = await client.from('scan_events').insert({
      idempotency_key: idempotencyKey,
      nmid: payload.nmid,
      source: 'qris_scan_ui',
      raw_qris: payload.qrisRaw ?? '',
      coords: { lat: payload.lat, lng: payload.lng },
      filter_reason: 'none',
      payment_deeplink: '',
      merchant_status: merchantResult.status,
    });

    if (seError) {
      console.error('[supabase] upsertQrisScan scan_events insert error:', seError.message);
    }
  }

  return merchantResult;
}

/**
 * Count merchants with a valid NMID (scanned via QRIS at least once).
 */
export async function getQrisMerchantCount(): Promise<number> {
  const client = getSupabaseClient();
  const { count, error } = await client
    .from('core_merchants')
    .select('*', { count: 'exact', head: true })
    .not('nmid', 'is', null)
    .neq('nmid', '');
  if (error) return 0;
  return count ?? 0;
}

export interface ScanActivityRow {
  id: string;
  nmid: string;
  scanned_at: string;
  lat: number;
  lng: number;
  result_status: string | null;
  result_confidence: number | null;
  qris_raw: string | null;
  merchant_name: string | null;
  merchant_city: string | null;
  merchant_postal_code: string | null;
  merchant_category: string | null;
}

/**
 * Fetch scan events and join with their respective core_merchants info.
 * Merges Supabase data with localStorage fallback (for offline/empty scenarios).
 */
export async function getRecentActivities(limit = 5): Promise<ScanActivityRow[]> {
  const client = getSupabaseClient();

  // ── Read localStorage activities (always available) ────────────────────────
  let localActivities: ScanActivityRow[] = [];
  try {
    const raw = localStorage.getItem('local_scan_activities');
    if (raw) {
      localActivities = JSON.parse(raw) as ScanActivityRow[];
    }
  } catch {
    localActivities = [];
  }

  // ── Try to fetch from Supabase ────────────────────────────────────────────
  try {
    const { data: scanEvents, error: scanError } = await client
      .from('scan_events')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (scanError) {
      console.error('[supabase] getRecentActivities scanEvents error:', scanError.message);
      // Fall back to localStorage
      return localActivities.slice(0, limit);
    }

    if (!scanEvents || scanEvents.length === 0) {
      return localActivities.slice(0, limit);
    }

    // Get unique NMIDs
    const nmids = Array.from(new Set(scanEvents.map(e => e.nmid).filter(Boolean)));

    // Fetch corresponding merchants
    let merchantMap = new Map<string, any>();
    if (nmids.length > 0) {
      const { data: merchants, error: merchantError } = await client
        .from('core_merchants')
        .select('nmid, name, city, postal_code, confidence')
        .in('nmid', nmids);

      if (merchantError) {
        console.error('[supabase] getRecentActivities merchants error:', merchantError.message);
      }

      if (merchants) {
        merchants.forEach(m => {
          merchantMap.set(m.nmid, m);
        });
      }
    }

    const supabaseActivities: ScanActivityRow[] = scanEvents.map(event => {
      const merchant = merchantMap.get(event.nmid);

      // Parse coords safely from JSONB coords column
      const coords = typeof event.coords === 'string'
        ? (() => { try { return JSON.parse(event.coords); } catch { return { lat: 0, lng: 0 }; } })()
        : (event.coords || { lat: 0, lng: 0 });

      return {
        id: event.id,
        nmid: event.nmid,
        scanned_at: event.created_at,
        lat: coords.lat ?? 0,
        lng: coords.lng ?? 0,
        result_status: event.merchant_status || 'SCANNED',
        result_confidence: merchant?.confidence || 80,
        qris_raw: event.raw_qris,
        merchant_name: merchant?.name || event.merchant_name || 'Unknown Merchant',
        merchant_city: merchant?.city || event.merchant_city || 'Unknown City',
        merchant_postal_code: merchant?.postal_code || '',
        merchant_category: 'Retail',
      };
    });

    // Merge: supabase first, then local (deduplicated by nmid+scanned_at)
    const supabaseIds = new Set(supabaseActivities.map(a => a.id));
    const mergedLocal = localActivities.filter(a => !supabaseIds.has(a.id));
    const merged = [...supabaseActivities, ...mergedLocal];
    
    // Sort by scanned_at descending and limit
    merged.sort((a, b) => new Date(b.scanned_at).getTime() - new Date(a.scanned_at).getTime());
    return merged.slice(0, limit);
  } catch (err) {
    console.error('[supabase] getRecentActivities unexpected error:', err);
    return localActivities.slice(0, limit);
  }
}
