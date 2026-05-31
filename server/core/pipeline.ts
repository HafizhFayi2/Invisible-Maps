import { randomUUID } from 'node:crypto';
import type {
  CoreMerchantRecord,
  MerchantVisibilityStatus,
  ProcessScanInput,
  ProcessScanResult,
} from '../../src/core/types/core';
import { parseQris } from '../../src/parser/emvco';
import { getPaymentDeeplink } from '../../src/services/deeplink';
import { getNearbyPlaces } from '../providers/mapsProvider';
import { fuzzyMatchScore, haversineMeters } from './matching';
import { categorizeMerchant } from '../../src/engine/categorizer';
import {
  countUniqueScanUsers,
  findScanEventByIdempotencyKey,
  getByNmid,
  hasUserScannedMerchant,
  saveScanEvent,
  upsert,
  upsertVerificationTask,
} from './store';

function createId(): string {
  return `m_${Math.random().toString(36).slice(2, 10)}`;
}

function createIdempotencyKey(): string {
  return `scan_${randomUUID()}`;
}

function normalizeSourceUserId(value: string | undefined): string {
  const normalized = value?.trim();
  return normalized || 'anonymous';
}

function computeStatus(
  filterStatus: CoreMerchantRecord['status'],
  confidence: number
): CoreMerchantRecord['status'] {
  if (filterStatus === 'INVISIBLE' && confidence >= 95) {
    return 'VERIFIED_INVISIBLE';
  }

  if (filterStatus === 'INVISIBLE' && confidence >= 40) {
    return 'UNVERIFIED';
  }

  return filterStatus;
}

function calculateConfidence(uniqueUserCount: number): number {
  if (uniqueUserCount <= 1) return 40;
  if (uniqueUserCount === 2) return 70;
  return 95;
}

async function resolveFilter(
  metadata: ReturnType<typeof parseQris>,
  coords: { lat: number; lng: number }
): Promise<{ status: MerchantVisibilityStatus; reason: string }> {
  const existing = await getByNmid(metadata.nmid);

  if (existing) {
    const distance = haversineMeters(existing.location, coords);
    if (distance < 50) {
      return { status: 'DUPLICATE', reason: 'NMID already exists in radius < 50m' };
    }
    if (distance > 200) {
      return { status: 'MERCHANT_RELOCATED', reason: 'NMID found but appears relocated' };
    }
  }

  const nearbyResult = await getNearbyPlaces(metadata.merchantName, {
    lat: coords.lat,
    lng: coords.lng,
    radius: 1000,
    limit: 8,
  });
  const nearbyPlaces = nearbyResult.data;

  if (!nearbyPlaces.length) {
    return { status: 'INVISIBLE', reason: 'No nearby place match found' };
  }

  for (const place of nearbyPlaces) {
    const score = fuzzyMatchScore(metadata.merchantName, place.name);
    if (score > 0.75) {
      return {
        status: 'ALREADY_MAPPED',
        reason: `Name match score ${score.toFixed(2)} with nearby indexed merchant`,
      };
    }
  }

  return { status: 'INVISIBLE', reason: 'Nearby places found but name mismatch' };
}

export async function processScan(input: ProcessScanInput): Promise<ProcessScanResult> {
  const idempotencyKey = input.idempotencyKey ?? createIdempotencyKey();
  const sourceUserId = normalizeSourceUserId(input.sourceUserId);

  const existingEvent = await findScanEventByIdempotencyKey(idempotencyKey);
  if (existingEvent) {
    const existingMerchant = await getByNmid(existingEvent.nmid);
    if (existingMerchant) {
      return {
        merchant: existingMerchant,
        paymentDeeplink: existingEvent.paymentDeeplink,
        filterReason: existingEvent.filterReason,
      };
    }
  }

  const metadata = parseQris(input.rawQris);
  const previous = await getByNmid(metadata.nmid);
  const filter = await resolveFilter(metadata, input.coords);

  const scannedByCurrentUser = await hasUserScannedMerchant(metadata.nmid, sourceUserId);
  const existingUniqueUserCount = await countUniqueScanUsers(metadata.nmid);
  const projectedUniqueUserCount = scannedByCurrentUser
    ? existingUniqueUserCount
    : existingUniqueUserCount + 1;

  const confidence = calculateConfidence(projectedUniqueUserCount);
  const now = new Date().toISOString();

  let category: string | undefined = previous?.category;
  if (!category && !previous) {
    category = await categorizeMerchant(
      metadata.merchantName,
      metadata.city,
      process.env.GEMINI_API_KEY
    );
  }

  const merchant: CoreMerchantRecord = {
    id: previous?.id ?? createId(),
    nmid: metadata.nmid,
    name: metadata.merchantName,
    category,
    city: metadata.city,
    postalCode: metadata.postalCode,
    location: input.coords,
    source: input.source,
    confidence,
    status: computeStatus(filter.status, confidence),
    scanCount: (previous?.scanCount ?? 0) + (scannedByCurrentUser ? 0 : 1),
    createdAt: previous?.createdAt ?? now,
    updatedAt: now,
  };

  const persistedMerchant = await upsert(merchant);
  const paymentDeeplink = getPaymentDeeplink(input.rawQris, input.preferredPaymentApp);

  await saveScanEvent({
    idempotencyKey,
    nmid: persistedMerchant.nmid,
    source: persistedMerchant.source,
    rawQris: input.rawQris,
    coords: input.coords,
    sourceUserId,
    filterReason: filter.reason,
    paymentDeeplink,
    merchantStatus: persistedMerchant.status,
    createdAt: now,
  });

  await upsertVerificationTask({
    merchantId: persistedMerchant.id,
    merchantNmid: persistedMerchant.nmid,
    queueStatus: persistedMerchant.status === 'ALREADY_MAPPED' ? 'flagged' : 'pending',
    createdAt: now,
    updatedAt: now,
  });

  return {
    merchant: persistedMerchant,
    paymentDeeplink,
    filterReason: filter.reason,
  };
}
