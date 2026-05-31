import { CoreMerchantRecord } from '../core/types/core';

const STORAGE_KEY = 'invisible_map_core_merchants_v1';
const cache = new Map<string, CoreMerchantRecord>();
let initialized = false;

function isBrowser(): boolean {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
}

function normalizeRecord(record: Partial<CoreMerchantRecord>): CoreMerchantRecord | null {
  if (!record.nmid || !record.name || !record.location || !record.updatedAt || !record.createdAt) {
    return null;
  }

  return {
    id: record.id ?? `m_${Math.random().toString(36).slice(2, 10)}`,
    nmid: record.nmid,
    name: record.name,
    city: record.city ?? 'Unknown City',
    postalCode: record.postalCode ?? '',
    location: record.location,
    source: record.source ?? 'pipeline_1',
    confidence: record.confidence ?? 40,
    status: record.status ?? 'PENDING',
    scanCount: record.scanCount ?? 1,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
  };
}

function readLocalStorage(): CoreMerchantRecord[] {
  if (!isBrowser()) return [];

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as Partial<CoreMerchantRecord>[];
    return parsed
      .map((item) => normalizeRecord(item))
      .filter((item): item is CoreMerchantRecord => item !== null);
  } catch {
    return [];
  }
}

function writeLocalStorage(records: CoreMerchantRecord[]): void {
  if (!isBrowser()) return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
}

function mergeRecords(records: CoreMerchantRecord[]): void {
  for (const record of records) {
    const existing = cache.get(record.nmid);
    if (!existing || existing.updatedAt < record.updatedAt) {
      cache.set(record.nmid, record);
    }
  }
}

async function fetchSupabaseRecords(): Promise<CoreMerchantRecord[]> {
  const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
  const key = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

  if (!url || !key) return [];

  const response = await fetch(`${url}/rest/v1/core_merchants?select=*&order=updated_at.desc`, {
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
    },
  });

  if (!response.ok) {
    throw new Error(`Supabase fetch failed: ${response.status}`);
  }

  const rows = (await response.json()) as Array<Record<string, unknown>>;
  return rows
    .map((row) =>
      normalizeRecord({
        id: row.id as string,
        nmid: row.nmid as string,
        name: row.name as string,
        city: row.city as string,
        postalCode: row.postal_code as string,
        location: row.location as { lat: number; lng: number },
        source: row.source as CoreMerchantRecord['source'],
        confidence: Number(row.confidence ?? 40),
        status: row.status as CoreMerchantRecord['status'],
        scanCount: Number(row.scan_count ?? 1),
        imageUrl: (row.image_url as string) ?? undefined,
        description: (row.description as string) ?? undefined,
        createdAt: row.created_at as string,
        updatedAt: row.updated_at as string,
      })
    )
    .filter((item): item is CoreMerchantRecord => item !== null);
}

async function upsertSupabaseRecord(record: CoreMerchantRecord): Promise<void> {
  const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
  const key = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

  if (!url || !key) return;

  await fetch(`${url}/rest/v1/core_merchants?on_conflict=nmid`, {
    method: 'POST',
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json',
      Prefer: 'resolution=merge-duplicates',
    },
    body: JSON.stringify({
      id: record.id,
      nmid: record.nmid,
      name: record.name,
      city: record.city,
      postal_code: record.postalCode,
      location: record.location,
      source: record.source,
      confidence: record.confidence,
      status: record.status,
      scan_count: record.scanCount,
      created_at: record.createdAt,
      updated_at: record.updatedAt,
    }),
  });
}

async function ensureInitialized(): Promise<void> {
  if (initialized) return;

  mergeRecords(readLocalStorage());

  try {
    const remote = await fetchSupabaseRecords();
    mergeRecords(remote);
  } catch {
    // Keep local data as fallback.
  }

  writeLocalStorage([...cache.values()]);
  initialized = true;
}

export async function getByNmid(nmid: string): Promise<CoreMerchantRecord | undefined> {
  await ensureInitialized();
  return cache.get(nmid);
}

export async function upsert(record: CoreMerchantRecord): Promise<CoreMerchantRecord> {
  await ensureInitialized();

  const existing = cache.get(record.nmid);
  if (!existing || existing.updatedAt <= record.updatedAt) {
    cache.set(record.nmid, record);
  }

  const records = [...cache.values()].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  writeLocalStorage(records);

  try {
    await upsertSupabaseRecord(record);
  } catch {
    // Remote upsert failure should not block main flow.
  }

  return record;
}

export async function listCoreMerchants(): Promise<CoreMerchantRecord[]> {
  await ensureInitialized();
  return [...cache.values()].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}
