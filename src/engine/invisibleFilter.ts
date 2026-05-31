import { CoreMerchantRecord, MerchantVisibilityStatus, QrisMetadata } from '../core/types/core';
import { nearbySearch } from '../services/mapsApi';
import { getByNmid } from '../services/merchantStore';
import { getFuzzyMatchThreshold } from '../services/config';
import { fuzzyMatchScore, haversineMeters } from './matching';

interface FilterResult {
  status: MerchantVisibilityStatus;
  reason: string;
}

export async function runInvisibleFilter(metadata: QrisMetadata, coords: { lat: number; lng: number }): Promise<FilterResult> {
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

  const nearbyPlaces = await nearbySearch(metadata.merchantName, {
    lat: coords.lat,
    lng: coords.lng,
    radius: 1000,
  });
  if (!nearbyPlaces.length) {
    return { status: 'INVISIBLE', reason: 'No nearby place match found' };
  }

  const threshold = getFuzzyMatchThreshold();

  for (const place of nearbyPlaces) {
    const score = fuzzyMatchScore(metadata.merchantName, place.name);
    if (score > threshold) {
      return { status: 'ALREADY_MAPPED', reason: `Name match score ${score.toFixed(2)} with nearby indexed merchant` };
    }
  }

  return { status: 'INVISIBLE', reason: 'Nearby places found but name mismatch' };
}

export function calculateConfidence(previous: CoreMerchantRecord | undefined): number {
  if (!previous) return 40;
  if (previous.scanCount >= 2) return 95;
  return 70;
}
