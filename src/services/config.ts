function parseCsv(value: string | undefined): string[] {
  if (!value) return [];
  return value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

export function getApiBaseUrl(): string {
  return ((import.meta.env.VITE_API_BASE_URL as string | undefined) ?? '').replace(/\/$/, '');
}

export function getAdminApiToken(): string | undefined {
  const token = import.meta.env.VITE_ADMIN_API_TOKEN as string | undefined;
  if (!token) return undefined;
  const normalized = token.trim();
  return normalized || undefined;
}

export function getGeminiApiKeys(): string[] {
  const primary = import.meta.env.VITE_GEMINI_API_KEY as string | undefined;
  const backups = parseCsv(import.meta.env.VITE_GEMINI_BACKUP_KEYS as string | undefined);
  return [primary, ...backups].filter(Boolean) as string[];
}

export function getMapsApiKeys(): string[] {
  const primary = import.meta.env.VITE_GOOGLE_MAPS_API_KEY as string | undefined;
  const backups = parseCsv(import.meta.env.VITE_GOOGLE_MAPS_BACKUP_KEYS as string | undefined);
  return [primary, ...backups].filter(Boolean) as string[];
}

export function getMapsProxyUrls(): string[] {
  return parseCsv(import.meta.env.VITE_MAPS_PROXY_URLS as string | undefined);
}

export function getFuzzyMatchThreshold(): number {
  const raw = import.meta.env.VITE_FUZZY_MATCH_THRESHOLD as string | undefined;
  const parsed = Number.parseFloat(raw ?? '0.75');
  return Number.isFinite(parsed) ? parsed : 0.75;
}

export function getSociavaultApiKey(): string | undefined {
  return import.meta.env.VITE_SOCIAVAULT_API_KEY as string | undefined;
}
