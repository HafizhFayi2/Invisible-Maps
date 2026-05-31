/**
 * types/merchant.ts
 * Merchant entity types — core domain model for Invisible Map.
 */

import type { QrisSource } from './qris';

/** Merchant visibility/identity resolution status */
export type MerchantVisibilityStatus =
  | 'PENDING'              // Baru masuk, belum diverifikasi
  | 'INVISIBLE'            // Tidak ada di Google Maps ✅
  | 'VERIFIED_INVISIBLE'   // Konfirmasi dari 3+ scan unik ✅✅
  | 'UNVERIFIED'           // Belum cukup scan untuk konfirmasi
  | 'ALREADY_MAPPED'       // Sudah ada di Google Maps — hidden
  | 'DUPLICATE'            // NMID duplikat dalam radius < 50m
  | 'MERCHANT_RELOCATED'   // NMID sama, lokasi bergeser > 200m

/** Merchant business category */
export type MerchantCategory =
  | 'Makanan & Minuman'
  | 'Warung Sembako'
  | 'Retail'
  | 'Jasa'
  | 'Lainnya';

/** Geographic coordinates */
export interface Coords {
  lat: number;
  lng: number;
}

/** Core merchant record stored in the database */
export interface MerchantRecord {
  /** UUID primary key */
  id: string;
  /** National Merchant ID — Bank Indonesia unique identifier */
  nmid: string;
  /** Merchant name from QRIS tag 59 */
  name: string;
  /** Business category (Gemini-classified or keyword-matched) */
  category: MerchantCategory | null;
  /** City from QRIS tag 60 */
  city: string | null;
  /** Postal code from QRIS tag 61 */
  postalCode: string | null;
  /** GPS coordinates */
  location: Coords;
  /** Visibility resolution status */
  status: MerchantVisibilityStatus;
  /** Confidence score 0–100 */
  confidence: number;
  /** Number of distinct scan events */
  scanCount: number;
  /** Number of unique user IDs that scanned */
  uniqueScannerCount: number;
  /** Data source pipeline */
  source: QrisSource;
  /** ISO 8601 */
  createdAt: string;
  updatedAt: string;
}

/** Lightweight merchant summary for map rendering */
export interface MerchantMapPin {
  id: string;
  name: string;
  category: MerchantCategory | null;
  location: Coords;
  status: MerchantVisibilityStatus;
  confidence: number;
}

/** Merchant detail with enriched data for detail view */
export interface MerchantDetail extends MerchantRecord {
  /** Formatted address from reverse geocoding */
  formattedAddress?: string;
  /** Nearby Google Maps places (for transparency) */
  nearbyPlaces?: Array<{ name: string; placeId: string; distance: number }>;
}
