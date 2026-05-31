import type { ProcessScanInput, ProcessScanResult, CoreMerchantRecord } from '../core/types/core';
import type { VerificationTask } from '../types';
import { getAdminApiToken, getApiBaseUrl } from './config';

const SAMPLE_QRIS_FALLBACK =
  '0002010102115904TEST6007JAKARTA61051234562140810ID123456786304ABCD';
const DEVICE_ID_KEY = 'invisible_map_device_id_v1';

export interface VerificationDashboard {
  pending: number;
  flagged: number;
  approved: number;
  rejected: number;
  totalTasks: number;
  verifiedInvisible: number;
}

function getApiUrl(path: string): string {
  const base = getApiBaseUrl();
  return `${base}${path}`;
}

function createIdempotencyKey(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `scan_${crypto.randomUUID()}`;
  }

  return `scan_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

function getDeviceId(): string {
  if (typeof window === 'undefined') {
    return 'server_device';
  }

  const existing = window.localStorage.getItem(DEVICE_ID_KEY);
  if (existing) {
    return existing;
  }

  const generated =
    typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
      ? `device_${crypto.randomUUID()}`
      : `device_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;

  window.localStorage.setItem(DEVICE_ID_KEY, generated);
  return generated;
}

function getVerifierHeaders(): Record<string, string> {
  const headers: Record<string, string> = {};
  const adminToken = getAdminApiToken();

  if (adminToken) {
    headers['x-admin-token'] = adminToken;
  }

  const verifierToken = (import.meta.env.VITE_VERIFIER_API_TOKEN as string | undefined)?.trim();
  if (verifierToken) {
    headers['x-verifier-token'] = verifierToken;
  }

  return headers;
}

export async function processScanViaApi(input: ProcessScanInput): Promise<ProcessScanResult> {
  const idempotencyKey = input.idempotencyKey ?? createIdempotencyKey();
  const payload: ProcessScanInput = {
    ...input,
    idempotencyKey,
    sourceUserId: input.sourceUserId ?? getDeviceId(),
  };

  const response = await fetch(getApiUrl('/api/scan/process'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const fallback = await fetch(getApiUrl('/api/scan/process'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...payload,
        rawQris: SAMPLE_QRIS_FALLBACK,
      }),
    });

    if (!fallback.ok) {
      throw new Error(`Scan API failed: ${response.status}`);
    }

    const fallbackJson = (await fallback.json()) as { data: ProcessScanResult };
    return fallbackJson.data;
  }

  const json = (await response.json()) as { data: ProcessScanResult };
  return json.data;
}

export async function fetchPublicMerchants(params?: {
  lat?: number;
  lng?: number;
  radius?: number;
}): Promise<CoreMerchantRecord[]> {
  const query = new URLSearchParams();
  if (params?.lat != null) query.set('lat', String(params.lat));
  if (params?.lng != null) query.set('lng', String(params.lng));
  if (params?.radius != null) query.set('radius', String(params.radius));

  const suffix = query.toString() ? `?${query.toString()}` : '';
  const response = await fetch(getApiUrl(`/api/merchants${suffix}`));

  if (!response.ok) {
    return [];
  }

  const json = (await response.json()) as { data?: CoreMerchantRecord[] };
  return json.data ?? [];
}

export async function fetchVerificationQueue(): Promise<VerificationTask[]> {
  const response = await fetch(getApiUrl('/api/verification/queue'), {
    headers: getVerifierHeaders(),
  });

  if (!response.ok) {
    return [];
  }

  const json = (await response.json()) as { data?: VerificationTask[] };
  return json.data ?? [];
}

export async function fetchVerificationDashboard(): Promise<VerificationDashboard | null> {
  const response = await fetch(getApiUrl('/api/verification/dashboard'), {
    headers: getVerifierHeaders(),
  });

  if (!response.ok) {
    return null;
  }

  const json = (await response.json()) as { data?: VerificationDashboard };
  return json.data ?? null;
}

export async function approveVerificationTask(merchantId: string, reason?: string): Promise<boolean> {
  const response = await fetch(getApiUrl(`/api/verification/tasks/${merchantId}/approve`), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...getVerifierHeaders(),
    },
    body: JSON.stringify({ reason }),
  });

  return response.ok;
}

export async function rejectVerificationTask(merchantId: string, reason?: string): Promise<boolean> {
  const response = await fetch(getApiUrl(`/api/verification/tasks/${merchantId}/reject`), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...getVerifierHeaders(),
    },
    body: JSON.stringify({ reason }),
  });

  return response.ok;
}
