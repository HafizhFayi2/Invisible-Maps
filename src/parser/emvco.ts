import { extractNMID } from './nmid';
import { QrisMetadata } from '../core/types/core';

function readTagValue(payload: string, start: number): { tag: string; length: number; value: string; next: number } {
  const tag = payload.slice(start, start + 2);
  const length = Number.parseInt(payload.slice(start + 2, start + 4), 10);
  const valueStart = start + 4;
  const valueEnd = valueStart + length;

  if (!tag || Number.isNaN(length) || valueEnd > payload.length) {
    throw new Error('Invalid EMVCo TLV structure');
  }

  return {
    tag,
    length,
    value: payload.slice(valueStart, valueEnd),
    next: valueEnd,
  };
}

function parseTLV(payload: string): Map<string, string> {
  const map = new Map<string, string>();
  let cursor = 0;

  while (cursor < payload.length) {
    const { tag, value, next } = readTagValue(payload, cursor);
    map.set(tag, value);
    cursor = next;
  }

  return map;
}

export function parseQris(raw: string): QrisMetadata {
  if (!raw.startsWith('000201') || !raw.includes('ID')) {
    throw new Error('Invalid QRIS payload');
  }

  const tags = parseTLV(raw);
  const merchantName = tags.get('59')?.trim() ?? 'Unknown Merchant';
  const city = tags.get('60')?.trim() ?? 'Unknown City';
  const postalCode = tags.get('61')?.trim() ?? '';
  const additionalData = tags.get('62');

  const nmid = extractNMID(raw, additionalData);

  if (!nmid) {
    throw new Error('NMID not found in QRIS payload');
  }

  return {
    merchantName,
    city,
    postalCode,
    nmid,
    raw,
  };
}
