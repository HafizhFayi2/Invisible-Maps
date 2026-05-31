import { ProcessScanInput, ProcessScanResult, CoreMerchantRecord } from '../core/types/core';
import { runInvisibleFilter, calculateConfidence } from '../engine/invisibleFilter';
import { parseQris } from '../parser/emvco';
import { getPaymentDeeplink } from '../services/deeplink';
import { getByNmid, upsert } from '../services/merchantStore';

function createId(): string {
  return `m_${Math.random().toString(36).slice(2, 10)}`;
}

function computeStatus(filterStatus: CoreMerchantRecord['status'], confidence: number): CoreMerchantRecord['status'] {
  if (filterStatus === 'INVISIBLE' && confidence >= 95) {
    return 'VERIFIED_INVISIBLE';
  }

  if (filterStatus === 'INVISIBLE' && confidence >= 40) {
    return 'UNVERIFIED';
  }

  return filterStatus;
}

export async function processScan(input: ProcessScanInput): Promise<ProcessScanResult> {
  const metadata = parseQris(input.rawQris);
  const previous = await getByNmid(metadata.nmid);
  const filter = await runInvisibleFilter(metadata, input.coords);
  const confidence = calculateConfidence(previous);
  const now = new Date().toISOString();

  const merchant: CoreMerchantRecord = {
    id: previous?.id ?? createId(),
    nmid: metadata.nmid,
    name: metadata.merchantName,
    city: metadata.city,
    postalCode: metadata.postalCode,
    location: input.coords,
    source: input.source,
    confidence,
    status: computeStatus(filter.status, confidence),
    scanCount: (previous?.scanCount ?? 0) + 1,
    createdAt: previous?.createdAt ?? now,
    updatedAt: now,
  };

  await upsert(merchant);

  return {
    merchant,
    paymentDeeplink: getPaymentDeeplink(input.rawQris, input.preferredPaymentApp),
    filterReason: filter.reason,
  };
}
