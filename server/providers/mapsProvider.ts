import type { NearbyPlace } from '../../src/core/types/core';
import { listRecords, listRecordsInRadius } from '../core/store';

interface NearbyOptions {
  lat?: number;
  lng?: number;
  radius?: number;
  limit?: number;
}

const DEFAULT_RADIUS_METERS = 2000;
const DEFAULT_LIMIT = 20;

function inferCategory(value: string | undefined): string {
  if (!value) return 'Unknown';
  const lowered = value.toLowerCase();
  if (lowered.includes('food') || lowered.includes('makan') || lowered.includes('kuliner')) return 'Street Food';
  if (lowered.includes('warung') || lowered.includes('retail') || lowered.includes('grocery')) return 'Warung/Groceries';
  if (lowered.includes('service') || lowered.includes('jasa')) return 'Services';
  return value;
}

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .split(/[^a-z0-9]+/i)
    .map((token) => token.trim())
    .filter(Boolean);
}

function keywordScore(keyword: string, haystack: string): number {
  const key = keyword.trim().toLowerCase();
  if (!key) return 0;
  if (haystack.includes(key)) return 100;

  const keyTokens = tokenize(key);
  const hayTokens = new Set(tokenize(haystack));
  if (!keyTokens.length) return 0;

  let hits = 0;
  for (const token of keyTokens) {
    if (hayTokens.has(token)) hits += 1;
  }

  return Math.round((hits / keyTokens.length) * 80);
}

function normalizeLimit(value: number | undefined): number {
  if (!value || Number.isNaN(value)) return DEFAULT_LIMIT;
  return Math.max(1, Math.min(50, Math.floor(value)));
}

export async function getNearbyPlaces(
  keyword: string,
  options: NearbyOptions = {},
): Promise<{ data: NearbyPlace[]; provider: string }> {
  const radius = options.radius ?? DEFAULT_RADIUS_METERS;
  const limit = normalizeLimit(options.limit);

  const records =
    options.lat != null && options.lng != null
      ? (await listRecordsInRadius(options.lat, options.lng, radius)) ?? []
      : await listRecords();

  const ranked = records
    .map((record) => {
      const searchable = `${record.name} ${record.category ?? ''} ${record.city}`.toLowerCase();
      return {
        record,
        score: keywordScore(keyword, searchable),
      };
    })
    .filter((entry) => entry.score > 0)
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      if (b.record.scanCount !== a.record.scanCount) return b.record.scanCount - a.record.scanCount;
      return b.record.confidence - a.record.confidence;
    })
    .slice(0, limit);

  const places: NearbyPlace[] = ranked.map(({ record }) => ({
    id: record.id,
    name: record.name,
    address: `${record.city} ${record.postalCode}`.trim() || 'Unknown address',
    category: inferCategory(record.category),
    location: record.location,
  }));

  return {
    data: places,
    provider: 'supabase-local-registry',
  };
}
