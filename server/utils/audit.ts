import { mkdir, appendFile } from 'node:fs/promises';
import { dirname } from 'node:path';

export interface AuditLogEntry {
  route: string;
  method: string;
  ip: string;
  status: number;
  success: boolean;
  actor: 'public' | 'admin';
  event: string;
  details?: Record<string, unknown>;
}

export async function writeAuditLog(filePath: string, entry: AuditLogEntry): Promise<void> {
  const payload = {
    timestamp: new Date().toISOString(),
    ...entry,
  };

  await mkdir(dirname(filePath), { recursive: true });
  await appendFile(filePath, `${JSON.stringify(payload)}\n`, 'utf8');
}
