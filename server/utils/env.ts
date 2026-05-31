function parseCsv(value: string | undefined): string[] {
  if (!value) return [];

  return value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

function parseBoolean(value: string | undefined, fallback: boolean): boolean {
  if (value == null) return fallback;
  const normalized = value.trim().toLowerCase();
  if (['1', 'true', 'yes', 'on'].includes(normalized)) return true;
  if (['0', 'false', 'no', 'off'].includes(normalized)) return false;
  return fallback;
}

function parseNumber(value: string | undefined, fallback: number): number {
  if (value == null) return fallback;
  const parsed = Number.parseInt(value, 10);
  return Number.isNaN(parsed) ? fallback : parsed;
}

export function getGeminiApiKeys(): string[] {
  return [process.env.GEMINI_API_KEY, ...parseCsv(process.env.GEMINI_BACKUP_KEYS)].filter(
    Boolean
  ) as string[];
}

export function getMapsApiKeys(): string[] {
  return [process.env.GOOGLE_MAPS_API_KEY, ...parseCsv(process.env.GOOGLE_MAPS_BACKUP_KEYS)].filter(
    Boolean
  ) as string[];
}

export function getMapsProxyUrls(): string[] {
  return parseCsv(process.env.MAPS_PROXY_URLS);
}

export function getServerPort(): number {
  // Cloud Run injects PORT env var — always prefer it over API_SERVER_PORT
  return parseNumber(process.env.PORT ?? process.env.API_SERVER_PORT, 8080);
}

export function getAdminApiToken(): string | undefined {
  const token = process.env.ADMIN_API_TOKEN?.trim();
  return token ? token : undefined;
}

export function getVerifierApiTokens(): string[] {
  return parseCsv(process.env.VERIFIER_API_TOKENS);
}

export function isAdminAuthEnforced(): boolean {
  return parseBoolean(process.env.ENFORCE_ADMIN_AUTH, true);
}

export function getRateLimitWindowMs(): number {
  return parseNumber(process.env.RATE_LIMIT_WINDOW_MS, 60000);
}

export function getRateLimitMaxRequests(): number {
  return parseNumber(process.env.RATE_LIMIT_MAX_REQUESTS, 120);
}

export function getAuditLogFilePath(): string {
  return process.env.AUDIT_LOG_FILE?.trim() || 'server/logs/audit.log';
}

export function getSupabaseUrl(): string | undefined {
  const value = process.env.SUPABASE_URL?.trim();
  return value || undefined;
}

export function getSupabaseServiceRoleKey(): string | undefined {
  const value = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  return value || undefined;
}

export function isSupabasePersistenceEnabled(): boolean {
  return parseBoolean(process.env.ENABLE_SUPABASE_PERSISTENCE, true);
}
