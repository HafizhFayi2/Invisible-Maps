/**
 * types/qris.ts
 * QRIS metadata interfaces — data structures from EMVCo decoded QRIS payload.
 */

/** Raw decoded QRIS metadata from EMVCo tag parsing */
export interface QrisMetadata {
  /** Tag 59 — Merchant name */
  merchantName: string;
  /** Tag 60 — City */
  city: string;
  /** Tag 61 — Postal code */
  postalCode: string;
  /** Extracted NMID from tag 62 sub-tags or regex */
  nmid: string;
  /** Raw QRIS string */
  raw: string;
}

/** Source of the QRIS data */
export type QrisSource = 'pipeline_1' | 'pipeline_2_google_maps' | 'pipeline_2_instagram' | 'pipeline_2_tiktok' | 'pipeline_2_google_images';

/** Scan event — one user scanning one QRIS at one location */
export interface QrisScanEvent {
  /** Unique idempotency key: `${nmid}:${userId}:${dateHour}` */
  idempotencyKey: string;
  /** QRIS metadata decoded from payload */
  metadata: QrisMetadata;
  /** GPS coordinates at time of scan */
  coords: { lat: number; lng: number };
  /** Source pipeline that produced this scan */
  source: QrisSource;
  /** Anonymous user identifier */
  userId?: string;
  /** ISO 8601 timestamp */
  scannedAt: string;
}

/** QRIS payment provider (PJP) information extracted from QRIS */
export interface QrisPjpInfo {
  /** Payment provider name (e.g., GoPay, OVO, DANA) */
  name: string;
  /** PJP code from QRIS tag 26/27/28... */
  code: string;
  /** QRIS type: static or dynamic */
  type: 'static' | 'dynamic';
}

/** Full QRIS decode result including PJP info */
export interface QrisDecodeResult extends QrisMetadata {
  pjp?: QrisPjpInfo;
  isValid: boolean;
  decodeError?: string;
}
