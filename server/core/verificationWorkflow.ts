import type { ApiRole } from '../utils/security';
import {
  getByMerchantId,
  listRecords,
  listVerificationTasks,
  upsert,
  upsertVerificationTask,
} from './store';

export interface QueueItem {
  id: string;
  merchantName: string;
  area: string;
  nmid: string;
  reason: string;
  status: 'pending' | 'flagged';
  category: 'Street Food' | 'Warung/Groceries' | 'Retail' | 'Services';
}

export interface VerificationDashboard {
  pending: number;
  flagged: number;
  approved: number;
  rejected: number;
  totalTasks: number;
  verifiedInvisible: number;
}

function toQueueStatus(merchantStatus: string): 'pending' | 'flagged' {
  return merchantStatus === 'ALREADY_MAPPED' ? 'flagged' : 'pending';
}

function nowIso(): string {
  return new Date().toISOString();
}

export async function getVerificationQueue(): Promise<QueueItem[]> {
  const [merchants, tasks] = await Promise.all([listRecords(), listVerificationTasks()]);
  const taskMap = new Map(tasks.map((task) => [task.merchantId, task]));

  const queue: QueueItem[] = [];

  for (const merchant of merchants) {
    const existingTask = taskMap.get(merchant.id);

    if (existingTask?.queueStatus === 'approved' || existingTask?.queueStatus === 'rejected') {
      continue;
    }

    if (!existingTask) {
      await upsertVerificationTask({
        merchantId: merchant.id,
        merchantNmid: merchant.nmid,
        queueStatus: toQueueStatus(merchant.status),
        createdAt: nowIso(),
        updatedAt: nowIso(),
      });
    }

    queue.push({
      id: merchant.id,
      merchantName: merchant.name,
      area: `${merchant.city} (${merchant.location.lat.toFixed(4)}, ${merchant.location.lng.toFixed(4)})`,
      nmid: merchant.nmid,
      reason: `Status ${merchant.status} with confidence ${merchant.confidence}%`,
      status: existingTask?.queueStatus === 'flagged' ? 'flagged' : toQueueStatus(merchant.status),
      category: 'Street Food',
    });
  }

  return queue;
}

export async function getVerificationDashboard(): Promise<VerificationDashboard> {
  const [tasks, merchants] = await Promise.all([listVerificationTasks(), listRecords()]);

  const pending = tasks.filter((task) => task.queueStatus === 'pending').length;
  const flagged = tasks.filter((task) => task.queueStatus === 'flagged').length;
  const approved = tasks.filter((task) => task.queueStatus === 'approved').length;
  const rejected = tasks.filter((task) => task.queueStatus === 'rejected').length;
  const verifiedInvisible = merchants.filter((merchant) => merchant.status === 'VERIFIED_INVISIBLE').length;

  return {
    pending,
    flagged,
    approved,
    rejected,
    totalTasks: tasks.length,
    verifiedInvisible,
  };
}

export async function decideVerificationTask(input: {
  merchantId: string;
  decision: 'approve' | 'reject';
  reviewerId: string;
  reviewerRole: ApiRole;
  reason?: string;
}): Promise<{ merchantId: string; queueStatus: 'approved' | 'rejected'; merchantStatus: string }> {
  const merchant = await getByMerchantId(input.merchantId);
  if (!merchant) {
    throw new Error('Merchant not found');
  }

  const now = nowIso();
  const queueStatus = input.decision === 'approve' ? 'approved' : 'rejected';

  const updatedMerchant = {
    ...merchant,
    status:
      input.decision === 'approve'
        ? ('VERIFIED_INVISIBLE' as const)
        : ('ALREADY_MAPPED' as const),
    confidence: input.decision === 'approve' ? Math.max(merchant.confidence, 95) : merchant.confidence,
    updatedAt: now,
  };

  await upsert(updatedMerchant);

  await upsertVerificationTask({
    merchantId: merchant.id,
    merchantNmid: merchant.nmid,
    queueStatus,
    decisionReason: input.reason,
    reviewedBy: input.reviewerId,
    reviewedRole: input.reviewerRole,
    createdAt: now,
    updatedAt: now,
  });

  return {
    merchantId: merchant.id,
    queueStatus,
    merchantStatus: updatedMerchant.status,
  };
}
