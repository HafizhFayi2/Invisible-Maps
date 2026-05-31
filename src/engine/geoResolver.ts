/**
 * engine/geoResolver.ts
 * Multi-level coordinate resolution for Pipeline 2 (social media / image sources).
 *
 * Level 1: Explicit geotag from post          → precise coordinates
 * Level 2: Caption/hashtag NLP (Gemini)       → kota/kecamatan centroid
 * Level 3: Visual context (Gemini Vision)     → area estimate ~60%
 * Level 4: Fallback                           → UNVERIFIED status
 */

import { extractLocationFromCaption } from './gemini';

export interface ResolvedCoords {
  lat: number;
  lng: number;
  accuracy: 'precise' | 'kecamatan' | 'area_estimate' | 'unknown';
  level: 1 | 2 | 3 | 4;
}

// Simple lookup for major Indonesian cities/areas → centroid coords
// In production this would be backed by a geocoding service
const KNOWN_AREAS: Record<string, { lat: number; lng: number }> = {
  'jakarta': { lat: -6.2088, lng: 106.8456 },
  'jakarta selatan': { lat: -6.2615, lng: 106.8106 },
  'jakarta utara': { lat: -6.1481, lng: 106.8998 },
  'jakarta timur': { lat: -6.2250, lng: 106.9004 },
  'jakarta barat': { lat: -6.1675, lng: 106.7632 },
  'jakarta pusat': { lat: -6.1862, lng: 106.8349 },
  'bandung': { lat: -6.9175, lng: 107.6191 },
  'surabaya': { lat: -7.2575, lng: 112.7521 },
  'yogyakarta': { lat: -7.7956, lng: 110.3695 },
  'medan': { lat: 3.5952, lng: 98.6722 },
  'semarang': { lat: -6.9932, lng: 110.4203 },
  'makassar': { lat: -5.1477, lng: 119.4327 },
  'tangerang': { lat: -6.1702, lng: 106.6400 },
  'bekasi': { lat: -6.2349, lng: 106.9896 },
  'depok': { lat: -6.4025, lng: 106.7942 },
  'bogor': { lat: -6.5971, lng: 106.8060 },
};

function lookupAreaCoords(locationName: string): { lat: number; lng: number } | null {
  const lower = locationName.toLowerCase();
  for (const [key, coords] of Object.entries(KNOWN_AREAS)) {
    if (lower.includes(key)) return coords;
  }
  return null;
}

/**
 * Level 1: Use explicit geotag from post metadata.
 */
export function resolveFromGeotag(
  lat?: number,
  lng?: number,
): ResolvedCoords | null {
  if (lat === undefined || lng === undefined) return null;
  if (lat === 0 && lng === 0) return null;
  return { lat, lng, accuracy: 'precise', level: 1 };
}

/**
 * Level 2: Extract location text from caption/hashtags via Gemini NLP,
 * then look up centroid coordinates.
 */
export async function resolveFromCaption(
  caption: string,
  hashtags: string[],
  geminiApiKey: string,
): Promise<ResolvedCoords | null> {
  try {
    const locationText = await extractLocationFromCaption(caption, hashtags, geminiApiKey);
    if (!locationText) return null;

    const coords = lookupAreaCoords(locationText);
    if (!coords) return null;

    return { ...coords, accuracy: 'kecamatan', level: 2 };
  } catch {
    return null;
  }
}

/**
 * Level 3: Estimate area from visual context using Gemini Vision.
 * (Stub implementation — full vision call requires image URL + Gemini Vision API)
 */
export async function resolveFromVisualContext(
  _imageUrl: string,
  _geminiApiKey: string,
): Promise<ResolvedCoords | null> {
  // TODO: Call Gemini Vision API with image, parse area from response
  // For now returns null to fall through to Level 4
  return null;
}

/**
 * Level 4: Fallback — unresolved coordinates.
 */
export function resolveUnknown(): ResolvedCoords {
  return { lat: 0, lng: 0, accuracy: 'unknown', level: 4 };
}

/**
 * Orchestrate all levels in order. Returns first successful result.
 */
export async function resolveCoordinates(params: {
  explicitLat?: number;
  explicitLng?: number;
  caption?: string;
  hashtags?: string[];
  imageUrl?: string;
  geminiApiKey?: string;
}): Promise<ResolvedCoords> {
  // Level 1
  const l1 = resolveFromGeotag(params.explicitLat, params.explicitLng);
  if (l1) return l1;

  // Level 2
  if (params.caption && params.geminiApiKey) {
    const l2 = await resolveFromCaption(
      params.caption,
      params.hashtags ?? [],
      params.geminiApiKey,
    );
    if (l2) return l2;
  }

  // Level 3
  if (params.imageUrl && params.geminiApiKey) {
    const l3 = await resolveFromVisualContext(params.imageUrl, params.geminiApiKey);
    if (l3) return l3;
  }

  // Level 4
  return resolveUnknown();
}
