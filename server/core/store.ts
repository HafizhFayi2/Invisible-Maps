import type { CoreMerchantRecord } from '../../src/core/types/core';
import { getSupabaseClient } from '../data/supabase';

export interface StoredScanEvent {
  idempotencyKey: string;
  nmid: string;
  source: string;
  rawQris: string;
  coords: { lat: number; lng: number };
  sourceUserId: string;
  filterReason: string;
  paymentDeeplink: string;
  merchantStatus: string;
  createdAt: string;
}

export type VerificationTaskStatus = 'pending' | 'flagged' | 'approved' | 'rejected';

export interface StoredVerificationTask {
  merchantId: string;
  merchantNmid: string;
  queueStatus: VerificationTaskStatus;
  decisionReason?: string;
  reviewedBy?: string;
  reviewedRole?: string;
  createdAt: string;
  updatedAt: string;
}

interface CoreMerchantRow {
  id: string;
  nmid: string;
  name: string;
  city: string | null;
  postal_code: string | null;
  lat: number;
  lng: number;
  source: CoreMerchantRecord['source'];
  confidence: number;
  status: CoreMerchantRecord['status'];
  scan_count: number;
  created_at: string;
  updated_at: string;
}

interface ScanEventRow {
  idempotency_key: string;
  nmid: string;
  source: string;
  raw_qris: string;
  coords: { lat: number; lng: number };
  source_user_id: string;
  filter_reason: string;
  payment_deeplink: string;
  merchant_status: string;
  created_at: string;
}

interface VerificationTaskRow {
  merchant_id: string;
  merchant_nmid: string;
  queue_status: VerificationTaskStatus;
  decision_reason: string | null;
  reviewed_by: string | null;
  reviewed_role: string | null;
  created_at: string;
  updated_at: string;
}

const recordCache = new Map<string, CoreMerchantRecord>();
const eventCache = new Map<string, StoredScanEvent>();
const verificationTaskCache = new Map<string, StoredVerificationTask>();

function toCoreRecord(row: CoreMerchantRow): CoreMerchantRecord {
  return {
    id: row.id,
    nmid: row.nmid,
    name: row.name,
    city: row.city ?? 'Unknown City',
    postalCode: row.postal_code ?? '',
    location: { lat: row.lat, lng: row.lng },
    source: row.source,
    confidence: row.confidence,
    status: row.status,
    scanCount: row.scan_count,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function toRow(record: CoreMerchantRecord): Omit<CoreMerchantRow, 'id'> & { id?: string } {
  return {
    id: record.id,
    nmid: record.nmid,
    name: record.name,
    city: record.city,
    postal_code: record.postalCode,
    lat: record.location.lat,
    lng: record.location.lng,
    source: record.source,
    confidence: record.confidence,
    status: record.status,
    scan_count: record.scanCount,
    created_at: record.createdAt,
    updated_at: record.updatedAt,
  };
}

function toStoredEvent(row: ScanEventRow): StoredScanEvent {
  return {
    idempotencyKey: row.idempotency_key,
    nmid: row.nmid,
    source: row.source,
    rawQris: row.raw_qris,
    coords: row.coords,
    sourceUserId: row.source_user_id,
    filterReason: row.filter_reason,
    paymentDeeplink: row.payment_deeplink,
    merchantStatus: row.merchant_status,
    createdAt: row.created_at,
  };
}

function toEventRow(event: StoredScanEvent): ScanEventRow {
  return {
    idempotency_key: event.idempotencyKey,
    nmid: event.nmid,
    source: event.source,
    raw_qris: event.rawQris,
    coords: event.coords,
    source_user_id: event.sourceUserId,
    filter_reason: event.filterReason,
    payment_deeplink: event.paymentDeeplink,
    merchant_status: event.merchantStatus,
    created_at: event.createdAt,
  };
}

function toStoredVerificationTask(row: VerificationTaskRow): StoredVerificationTask {
  return {
    merchantId: row.merchant_id,
    merchantNmid: row.merchant_nmid,
    queueStatus: row.queue_status,
    decisionReason: row.decision_reason ?? undefined,
    reviewedBy: row.reviewed_by ?? undefined,
    reviewedRole: row.reviewed_role ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function toVerificationTaskRow(task: StoredVerificationTask): VerificationTaskRow {
  return {
    merchant_id: task.merchantId,
    merchant_nmid: task.merchantNmid,
    queue_status: task.queueStatus,
    decision_reason: task.decisionReason ?? null,
    reviewed_by: task.reviewedBy ?? null,
    reviewed_role: task.reviewedRole ?? null,
    created_at: task.createdAt,
    updated_at: task.updatedAt,
  };
}

export async function getByNmid(nmid: string): Promise<CoreMerchantRecord | undefined> {
  const cached = recordCache.get(nmid);
  if (cached) return cached;

  const supabase = getSupabaseClient();
  if (!supabase) return undefined;

  try {
    const { data, error } = await supabase
      .from('core_merchants')
      .select('*')
      .eq('nmid', nmid)
      .maybeSingle<CoreMerchantRow>();

    if (error || !data) return undefined;

    const record = toCoreRecord(data);
    recordCache.set(record.nmid, record);
    return record;
  } catch (err) {
    console.warn('[store] getByNmid Supabase error, falling back to cache:', err);
    return undefined;
  }
}

export async function getByMerchantId(merchantId: string): Promise<CoreMerchantRecord | undefined> {
  const cached = [...recordCache.values()].find((record) => record.id === merchantId);
  if (cached) return cached;

  const supabase = getSupabaseClient();
  if (!supabase) return undefined;

  try {
    const { data, error } = await supabase
      .from('core_merchants')
      .select('*')
      .eq('id', merchantId)
      .maybeSingle<CoreMerchantRow>();

    if (error || !data) return undefined;

    const record = toCoreRecord(data);
    recordCache.set(record.nmid, record);
    return record;
  } catch (err) {
    console.warn('[store] getByMerchantId Supabase error, falling back to cache:', err);
    return undefined;
  }
}

export async function upsert(record: CoreMerchantRecord): Promise<CoreMerchantRecord> {
  const supabase = getSupabaseClient();

  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('core_merchants')
        .upsert(toRow(record), { onConflict: 'nmid' })
        .select('*')
        .single<CoreMerchantRow>();

      if (!error && data) {
        const persisted = toCoreRecord(data);
        recordCache.set(persisted.nmid, persisted);
        return persisted;
      }
      if (error) {
        console.warn('[store] upsert Supabase query error:', error.message);
      }
    } catch (err) {
      console.warn('[store] upsert Supabase connection error:', err);
    }
  }

  const existing = recordCache.get(record.nmid);
  if (!existing || existing.updatedAt <= record.updatedAt) {
    recordCache.set(record.nmid, record);
  }

  return record;
}

export async function listRecords(): Promise<CoreMerchantRecord[]> {
  const supabase = getSupabaseClient();

  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('core_merchants')
        .select('*')
        .order('updated_at', { ascending: false })
        .returns<CoreMerchantRow[]>();

      if (!error && data) {
        const records = data.map(toCoreRecord);
        recordCache.clear();
        for (const record of records) {
          recordCache.set(record.nmid, record);
        }
        return records;
      }
      if (error) {
        console.warn('[store] listRecords Supabase query error:', error.message);
      }
    } catch (err) {
      console.warn('[store] listRecords Supabase connection error:', err);
    }
  }

  return [...recordCache.values()].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export async function listRecordsInRadius(
  lat: number,
  lng: number,
  radius: number
): Promise<CoreMerchantRecord[] | null> {
  const supabase = getSupabaseClient();
  if (!supabase) return null;

  try {
    const { data, error } = await supabase.rpc('get_merchants_in_radius', {
      center_lat: lat,
      center_lng: lng,
      radius_m: radius,
    });

    if (error || !data) return null;

    const rows = data as CoreMerchantRow[];
    const records = rows.map(toCoreRecord);
    for (const record of records) {
      recordCache.set(record.nmid, record);
    }

    return records;
  } catch (err) {
    console.warn('[store] listRecordsInRadius Supabase error:', err);
    return null;
  }
}

export async function findScanEventByIdempotencyKey(
  idempotencyKey: string
): Promise<StoredScanEvent | undefined> {
  const cached = eventCache.get(idempotencyKey);
  if (cached) return cached;

  const supabase = getSupabaseClient();
  if (!supabase) return undefined;

  try {
    const { data, error } = await supabase
      .from('scan_events')
      .select('*')
      .eq('idempotency_key', idempotencyKey)
      .maybeSingle<ScanEventRow>();

    if (error || !data) return undefined;

    const event = toStoredEvent(data);
    eventCache.set(idempotencyKey, event);
    return event;
  } catch (err) {
    console.warn('[store] findScanEventByIdempotencyKey Supabase error:', err);
    return undefined;
  }
}

export async function hasUserScannedMerchant(
  nmid: string,
  sourceUserId: string
): Promise<boolean> {
  for (const event of eventCache.values()) {
    if (event.nmid === nmid && event.sourceUserId === sourceUserId) {
      return true;
    }
  }

  const supabase = getSupabaseClient();
  if (!supabase) return false;

  try {
    const { data, error } = await supabase
      .from('scan_events')
      .select('idempotency_key')
      .eq('nmid', nmid)
      .eq('source_user_id', sourceUserId)
      .limit(1)
      .maybeSingle();

    if (error) return false;
    return Boolean(data);
  } catch (err) {
    console.warn('[store] hasUserScannedMerchant Supabase error:', err);
    return false;
  }
}

export async function countUniqueScanUsers(nmid: string): Promise<number> {
  const userIds = new Set<string>();

  for (const event of eventCache.values()) {
    if (event.nmid === nmid) {
      userIds.add(event.sourceUserId);
    }
  }

  const supabase = getSupabaseClient();
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('scan_events')
        .select('source_user_id')
        .eq('nmid', nmid);

      if (!error && data) {
        for (const row of data as Array<{ source_user_id: string }>) {
          userIds.add(row.source_user_id);
        }
      }
      if (error) {
        console.warn('[store] countUniqueScanUsers Supabase query error:', error.message);
      }
    } catch (err) {
      console.warn('[store] countUniqueScanUsers Supabase error:', err);
    }
  }

  return userIds.size;
}

export async function saveScanEvent(event: StoredScanEvent): Promise<void> {
  eventCache.set(event.idempotencyKey, event);

  const supabase = getSupabaseClient();
  if (!supabase) return;

  try {
    const { error } = await supabase.from('scan_events').upsert(toEventRow(event), {
      onConflict: 'idempotency_key',
    });
    if (error) {
      console.warn('[store] saveScanEvent Supabase query error:', error.message);
    }
  } catch (err) {
    console.warn('[store] saveScanEvent Supabase error:', err);
  }
}

export async function getVerificationTaskByMerchantId(
  merchantId: string
): Promise<StoredVerificationTask | undefined> {
  const cached = verificationTaskCache.get(merchantId);
  if (cached) return cached;

  const supabase = getSupabaseClient();
  if (!supabase) return undefined;

  try {
    const { data, error } = await supabase
      .from('verification_tasks')
      .select('*')
      .eq('merchant_id', merchantId)
      .maybeSingle<VerificationTaskRow>();

    if (error || !data) return undefined;

    const task = toStoredVerificationTask(data);
    verificationTaskCache.set(merchantId, task);
    return task;
  } catch (err) {
    console.warn('[store] getVerificationTaskByMerchantId Supabase error:', err);
    return undefined;
  }
}

export async function upsertVerificationTask(task: StoredVerificationTask): Promise<StoredVerificationTask> {
  verificationTaskCache.set(task.merchantId, task);

  const supabase = getSupabaseClient();
  if (!supabase) return task;

  try {
    const { data, error } = await supabase
      .from('verification_tasks')
      .upsert(toVerificationTaskRow(task), { onConflict: 'merchant_id' })
      .select('*')
      .single<VerificationTaskRow>();

    if (!error && data) {
      const persisted = toStoredVerificationTask(data);
      verificationTaskCache.set(task.merchantId, persisted);
      return persisted;
    }
    if (error) {
      console.warn('[store] upsertVerificationTask Supabase query error:', error.message);
    }
  } catch (err) {
    console.warn('[store] upsertVerificationTask Supabase error:', err);
  }

  return task;
}

export async function listVerificationTasks(): Promise<StoredVerificationTask[]> {
  const supabase = getSupabaseClient();

  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('verification_tasks')
        .select('*')
        .order('updated_at', { ascending: false })
        .returns<VerificationTaskRow[]>();

      if (!error && data) {
        const tasks = data.map(toStoredVerificationTask);
        verificationTaskCache.clear();
        for (const task of tasks) {
          verificationTaskCache.set(task.merchantId, task);
        }
        return tasks;
      }
      if (error) {
        console.warn('[store] listVerificationTasks Supabase query error:', error.message);
      }
    } catch (err) {
      console.warn('[store] listVerificationTasks Supabase error:', err);
    }
  }

  return [...verificationTaskCache.values()].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}
