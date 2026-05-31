import type { NextFunction, Request, Response } from 'express';

interface Bucket {
  resetAt: number;
  count: number;
}

export type ApiRole = 'user' | 'verifier' | 'admin';

interface RoleConfig {
  enforceAdminAuth: boolean;
  adminToken?: string;
  verifierTokens: string[];
}

export function createRateLimitMiddleware(windowMs: number, maxRequests: number) {
  const buckets = new Map<string, Bucket>();

  return (req: Request, res: Response, next: NextFunction) => {
    const key = req.ip || 'unknown';
    const now = Date.now();
    const existing = buckets.get(key);

    if (!existing || existing.resetAt <= now) {
      buckets.set(key, { resetAt: now + windowMs, count: 1 });
      next();
      return;
    }

    existing.count += 1;

    if (existing.count > maxRequests) {
      res.status(429).json({
        error: 'Rate limit exceeded',
        retryAfterMs: Math.max(0, existing.resetAt - now),
      });
      return;
    }

    next();
  };
}

function resolveRole(req: Request, config: RoleConfig): ApiRole {
  const adminHeader = req.header('x-admin-token');
  const verifierHeader = req.header('x-verifier-token');

  if (config.adminToken && adminHeader && adminHeader === config.adminToken) {
    return 'admin';
  }

  if (verifierHeader && config.verifierTokens.includes(verifierHeader)) {
    return 'verifier';
  }

  return 'user';
}

function rolePriority(role: ApiRole): number {
  if (role === 'admin') return 3;
  if (role === 'verifier') return 2;
  return 1;
}

export function authorizeRoles(allowed: ApiRole[], config: RoleConfig) {
  const minAllowed = Math.min(...allowed.map(rolePriority));

  return (req: Request, res: Response, next: NextFunction) => {
    const role = resolveRole(req, config);

    if (config.enforceAdminAuth && allowed.includes('admin') && role === 'user' && !config.verifierTokens.length) {
      res.status(401).json({ error: 'Unauthorized admin access' });
      return;
    }

    if (rolePriority(role) < minAllowed) {
      res.status(403).json({ error: 'Forbidden role access' });
      return;
    }

    (req as Request & { apiRole?: ApiRole }).apiRole = role;
    next();
  };
}

export function getRequestRole(req: Request): ApiRole {
  return ((req as Request & { apiRole?: ApiRole }).apiRole ?? 'user') as ApiRole;
}
