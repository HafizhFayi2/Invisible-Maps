import type { NextFunction, Request, Response } from 'express';

interface RouteMetric {
  count: number;
  errorCount: number;
  totalDurationMs: number;
}

const startedAt = Date.now();
const routeMetrics = new Map<string, RouteMetric>();

function ensureMetric(key: string): RouteMetric {
  const current = routeMetrics.get(key);
  if (current) return current;

  const created: RouteMetric = {
    count: 0,
    errorCount: 0,
    totalDurationMs: 0,
  };

  routeMetrics.set(key, created);
  return created;
}

export function observabilityMiddleware(req: Request, res: Response, next: NextFunction): void {
  const started = Date.now();
  const requestId =
    typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
      ? crypto.randomUUID()
      : `${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;

  res.setHeader('x-request-id', requestId);

  res.on('finish', () => {
    const key = `${req.method} ${req.route?.path ?? req.path}`;
    const metric = ensureMetric(key);
    metric.count += 1;
    metric.totalDurationMs += Date.now() - started;

    if (res.statusCode >= 400) {
      metric.errorCount += 1;
    }
  });

  next();
}

export function getMetricsSnapshot(): {
  uptimeSec: number;
  routes: Array<{
    route: string;
    count: number;
    errorCount: number;
    avgDurationMs: number;
  }>;
} {
  const routes = [...routeMetrics.entries()].map(([route, metric]) => ({
    route,
    count: metric.count,
    errorCount: metric.errorCount,
    avgDurationMs: metric.count === 0 ? 0 : Number((metric.totalDurationMs / metric.count).toFixed(2)),
  }));

  routes.sort((a, b) => b.count - a.count);

  return {
    uptimeSec: Math.floor((Date.now() - startedAt) / 1000),
    routes,
  };
}
