/**
 * parser/nmid.ts
 * NMID (National Merchant ID) extraction and validation.
 * NMID adalah identifier unik dari Bank Indonesia per merchant QRIS.
 */

/** Minimal NMID length (per BI spec) */
const NMID_MIN_LENGTH = 8;
/** Maximal NMID length */
const NMID_MAX_LENGTH = 25;

const NMID_REGEX = /ID\.?\w{2,10}\.?\d{8,20}/i;

/**
 * Extract NMID from raw QRIS EMVCo string.
 * Tries nested tag '62.08', '62.01', then regex fallback.
 */
export function extractNMID(raw: string, tag62Value?: string): string {
  // Try structured tag62 sub-tags first
  if (tag62Value) {
    const nested = parseTLVFlat(tag62Value);
    const candidate = nested.get('08') ?? nested.get('01') ?? '';
    if (isValidNMID(candidate)) return candidate.toUpperCase();
  }

  // Regex fallback from raw QRIS string
  const match = raw.match(NMID_REGEX)?.[0] ?? '';
  const cleaned = match.replace(/\./g, '');
  if (isValidNMID(cleaned)) return cleaned.toUpperCase();

  return '';
}

/**
 * Validate that a string is a structurally valid NMID.
 */
export function isValidNMID(value: string): boolean {
  if (!value) return false;
  const cleaned = value.replace(/\./g, '').toUpperCase();
  return (
    cleaned.startsWith('ID') &&
    cleaned.length >= NMID_MIN_LENGTH &&
    cleaned.length <= NMID_MAX_LENGTH &&
    /^ID[A-Z0-9]+$/.test(cleaned)
  );
}

/**
 * Format NMID to canonical uppercase form without dots.
 */
export function canonicalNMID(nmid: string): string {
  return nmid.replace(/\./g, '').toUpperCase();
}

// ---- Internal helper ----

function parseTLVFlat(payload: string): Map<string, string> {
  const map = new Map<string, string>();
  let cursor = 0;
  while (cursor < payload.length) {
    const tag = payload.slice(cursor, cursor + 2);
    const len = Number.parseInt(payload.slice(cursor + 2, cursor + 4), 10);
    if (!tag || Number.isNaN(len)) break;
    const val = payload.slice(cursor + 4, cursor + 4 + len);
    map.set(tag, val);
    cursor += 4 + len;
  }
  return map;
}
