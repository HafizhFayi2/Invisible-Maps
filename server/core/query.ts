import type { CoreMerchantRecord } from '../../src/core/types/core';
import { haversineMeters } from './matching';
import { listRecords } from './store';
import { getMerchantsInRadius } from '../../src/services/supabase';

export interface MerchantQuery {
  lat?: number;
  lng?: number;
  radius?: number;
}

const PUBLIC_VISIBLE_STATUSES = new Set([
  'UNVERIFIED',
  'INVISIBLE',
  'VERIFIED_INVISIBLE',
]);

export async function queryMerchants(params: MerchantQuery): Promise<CoreMerchantRecord[]> {
  let records: CoreMerchantRecord[];

  if (params.lat != null && params.lng != null && params.radius != null) {
    const dbRecords = await getMerchantsInRadius(params.lat, params.lng, params.radius);
    if (dbRecords && dbRecords.length > 0) {
      records = dbRecords.map(row => ({
        id: row.id,
        nmid: row.nmid,
        name: row.name,
        category: row.category || undefined,
        city: row.city || '',
        postalCode: row.postal_code || '',
        location: { lat: row.lat, lng: row.lng },
        source: row.source as any,
        confidence: row.confidence,
        status: row.status as any,
        scanCount: row.scan_count,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      }));
    } else {
      const all = await listRecords();
      records = all.filter((record) => {
        const distance = haversineMeters(record.location, {
          lat: params.lat!,
          lng: params.lng!,
        });
        return distance <= params.radius!;
      });
    }
  } else {
    records = await listRecords();
  }

  return records.filter((record) => PUBLIC_VISIBLE_STATUSES.has(record.status));
}
