export type PipelineSource = 'pipeline_1' | 'pipeline_2' | 'pipeline_3';

export type MerchantVisibilityStatus =
  | 'PENDING'
  | 'UNVERIFIED'
  | 'INVISIBLE'
  | 'VERIFIED_INVISIBLE'
  | 'ALREADY_MAPPED'
  | 'DUPLICATE'
  | 'MERCHANT_RELOCATED';

export interface Coordinates {
  lat: number;
  lng: number;
}

export interface QrisMetadata {
  merchantName: string;
  city: string;
  postalCode: string;
  nmid: string;
  raw: string;
}

export interface CoreMerchantRecord {
  id: string;
  nmid: string;
  name: string;
  category?: string;
  city: string;
  postalCode: string;
  location: Coordinates;
  source: PipelineSource;
  confidence: number;
  status: MerchantVisibilityStatus;
  scanCount: number;
  imageUrl?: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
}

export interface NearbyPlace {
  id: string;
  name: string;
  address: string;
  category: string;
  location: Coordinates;
}

export interface ProcessScanInput {
  rawQris: string;
  coords: Coordinates;
  source: PipelineSource;
  preferredPaymentApp?: string;
  idempotencyKey?: string;
  sourceUserId?: string;
}

export interface ProcessScanResult {
  merchant: CoreMerchantRecord;
  paymentDeeplink: string;
  filterReason: string;
}
