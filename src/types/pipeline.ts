/**
 * types/pipeline.ts
 * Pipeline status enums and workflow types for the Invisible Map processing pipeline.
 */

/** Pipeline processing stage */
export enum PipelineStage {
  /** Raw input received — not yet decoded */
  RECEIVED = 'RECEIVED',
  /** QRIS decoded, NMID extracted */
  DECODED = 'DECODED',
  /** Invisible Filter running */
  FILTERING = 'FILTERING',
  /** Filter complete, merchant record created/updated */
  PROCESSED = 'PROCESSED',
  /** Processing failed */
  FAILED = 'FAILED',
}

/** Result of a single pipeline run */
export interface PipelineRunResult {
  stage: PipelineStage;
  merchantId?: string;
  nmid?: string;
  status?: string;
  confidence?: number;
  error?: string;
  durationMs: number;
  processedAt: string;
}

/** Verification task status */
export enum VerificationStatus {
  PENDING = 'pending',
  FLAGGED = 'flagged',
  APPROVED = 'approved',
  REJECTED = 'rejected',
}

/** A verification task assigned to a human reviewer */
export interface VerificationTask {
  id: string;
  merchantId: string;
  merchantName: string;
  city: string;
  nmid: string;
  reason: string;
  status: VerificationStatus;
  assignedTo?: string;
  createdAt: string;
  resolvedAt?: string;
}

/** Confidence level thresholds */
export const CONFIDENCE = {
  /** Single scan, unconfirmed */
  PENDING: 40,
  /** Second unique-user scan */
  UNVERIFIED: 70,
  /** 3+ unique-user scans — promoted to verified */
  VERIFIED: 95,
} as const;

/** Pipeline 2 job types */
export type Pipeline2JobType =
  | 'google_images'
  | 'maps_reviews'
  | 'instagram'
  | 'tiktok';

/** Scraper job descriptor */
export interface ScraperJobDescriptor {
  type: Pipeline2JobType;
  region: string;
  maxResults: number;
  scheduledAt: string;
}

/** Audit log event types */
export type AuditEventType =
  | 'scan_received'
  | 'scan_validation_failed'
  | 'scan_processed'
  | 'scan_processing_failed'
  | 'verification_queue_read'
  | 'verification_approved'
  | 'verification_rejected'
  | 'pipeline2_job_started'
  | 'pipeline2_job_completed';
