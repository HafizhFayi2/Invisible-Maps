import express from 'express';
import path from 'path';
import { z } from 'zod';
import type { ProcessScanInput } from '../src/core/types/core';
import { processScan } from './core/pipeline';
import { queryMerchants } from './core/query';
import {
  decideVerificationTask,
  getVerificationDashboard,
  getVerificationQueue,
} from './core/verificationWorkflow';
import { getMetricsSnapshot, observabilityMiddleware } from './observability';
import { getDiscoveryPicks } from './providers/geminiProvider';
import { getNearbyPlaces } from './providers/mapsProvider';
import {
  aiDiscoveryBodySchema,
  mapsNearbyQuerySchema,
  merchantsQuerySchema,
  scanProcessBodySchema,
  verificationDecisionBodySchema,
} from './schemas';
import { writeAuditLog } from './utils/audit';
import {
  getAdminApiToken,
  getAuditLogFilePath,
  getRateLimitMaxRequests,
  getRateLimitWindowMs,
  getVerifierApiTokens,
  isAdminAuthEnforced,
} from './utils/env';
import {
  authorizeRoles,
  createRateLimitMiddleware,
  getRequestRole,
} from './utils/security';

export function createApp(): express.Express {
  const app = express();

  app.use(express.json({ limit: '1mb' }));
  app.use(observabilityMiddleware);
  app.use('/api', createRateLimitMiddleware(getRateLimitWindowMs(), getRateLimitMaxRequests()));

  const adminToken = getAdminApiToken();
  const verifierTokens = getVerifierApiTokens();
  const enforceAdminAuth = isAdminAuthEnforced();
  const verifierGuard = authorizeRoles(['verifier', 'admin'], {
    enforceAdminAuth,
    adminToken,
    verifierTokens,
  });
  const auditLogPath = getAuditLogFilePath();

  async function auditSafe(entry: Parameters<typeof writeAuditLog>[1]): Promise<void> {
    try {
      await writeAuditLog(auditLogPath, entry);
    } catch {
      // Logging failure must not break API response flow.
    }
  }

  function validationError(res: express.Response, error: z.ZodError): void {
    res.status(400).json({
      error: 'Invalid request payload',
      details: error.issues.map((issue) => ({
        path: issue.path.join('.'),
        message: issue.message,
      })),
    });
  }

  app.get('/health', (_req, res) => {
    res.json({ ok: true, service: 'invisible-map-api' });
  });

  app.get('/api/maps/nearby', async (req, res) => {
    const parsed = mapsNearbyQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      validationError(res, parsed.error);
      return;
    }

    try {
      const result = await getNearbyPlaces(parsed.data.keyword, {
        lat: parsed.data.lat,
        lng: parsed.data.lng,
        radius: parsed.data.radius,
      });
      res.json({ data: result.data, provider: result.provider });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown maps error';
      res.status(502).json({ error: message });
    }
  });

  app.post('/api/ai/discovery', async (req, res) => {
    const parsed = aiDiscoveryBodySchema.safeParse(req.body ?? {});
    if (!parsed.success) {
      validationError(res, parsed.error);
      return;
    }

    const userLocation = parsed.data.userLocation ?? 'Jakarta';

    try {
      const result = await getDiscoveryPicks(userLocation);
      res.json({ data: result.data, provider: result.provider });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown AI error';
      res.status(502).json({ error: message });
    }
  });

  app.post('/api/scan/process', async (req, res) => {
    const parsed = scanProcessBodySchema.safeParse(req.body);
    if (!parsed.success) {
      await auditSafe({
        route: '/api/scan/process',
        method: 'POST',
        ip: req.ip,
        status: 400,
        success: false,
        actor: 'public',
        event: 'scan_validation_failed',
        details: { issues: parsed.error.issues.length },
      });
      validationError(res, parsed.error);
      return;
    }

    const payload: ProcessScanInput = {
      rawQris: parsed.data.rawQris,
      coords: parsed.data.coords,
      source: parsed.data.source,
      preferredPaymentApp: parsed.data.preferredPaymentApp,
      idempotencyKey: parsed.data.idempotencyKey,
      sourceUserId: parsed.data.sourceUserId,
    };

    try {
      const result = await processScan(payload);

      await auditSafe({
        route: '/api/scan/process',
        method: 'POST',
        ip: req.ip,
        status: 200,
        success: true,
        actor: 'public',
        event: 'scan_processed',
        details: {
          nmid: result.merchant.nmid,
          status: result.merchant.status,
          source: result.merchant.source,
        },
      });

      res.json({ data: result });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown scan processing error';

      await auditSafe({
        route: '/api/scan/process',
        method: 'POST',
        ip: req.ip,
        status: 422,
        success: false,
        actor: 'public',
        event: 'scan_processing_failed',
        details: { message },
      });

      res.status(422).json({ error: message });
    }
  });

  app.get('/api/merchants', async (req, res) => {
    const parsed = merchantsQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      validationError(res, parsed.error);
      return;
    }

    const data = await queryMerchants(parsed.data);
    res.json({ data, count: data.length });
  });

  app.get('/api/verification/queue', verifierGuard, async (req, res) => {
    const data = await getVerificationQueue();

    await auditSafe({
      route: '/api/verification/queue',
      method: 'GET',
      ip: req.ip,
      status: 200,
      success: true,
      actor: 'admin',
      event: 'verification_queue_read',
      details: { count: data.length, role: getRequestRole(req) },
    });

    res.json({ data, count: data.length });
  });

  app.get('/api/verification/dashboard', verifierGuard, async (_req, res) => {
    const data = await getVerificationDashboard();
    res.json({ data });
  });

  app.post('/api/verification/tasks/:merchantId/approve', verifierGuard, async (req, res) => {
    const bodyParsed = verificationDecisionBodySchema.safeParse(req.body ?? {});
    if (!bodyParsed.success) {
      validationError(res, bodyParsed.error);
      return;
    }

    try {
      const decision = await decideVerificationTask({
        merchantId: req.params.merchantId,
        decision: 'approve',
        reviewerId: req.ip,
        reviewerRole: getRequestRole(req),
        reason: bodyParsed.data.reason,
      });

      await auditSafe({
        route: '/api/verification/tasks/:merchantId/approve',
        method: 'POST',
        ip: req.ip,
        status: 200,
        success: true,
        actor: 'admin',
        event: 'verification_approved',
        details: decision,
      });

      res.json({ data: decision });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to approve task';
      res.status(404).json({ error: message });
    }
  });

  app.post('/api/verification/tasks/:merchantId/reject', verifierGuard, async (req, res) => {
    const bodyParsed = verificationDecisionBodySchema.safeParse(req.body ?? {});
    if (!bodyParsed.success) {
      validationError(res, bodyParsed.error);
      return;
    }

    try {
      const decision = await decideVerificationTask({
        merchantId: req.params.merchantId,
        decision: 'reject',
        reviewerId: req.ip,
        reviewerRole: getRequestRole(req),
        reason: bodyParsed.data.reason,
      });

      await auditSafe({
        route: '/api/verification/tasks/:merchantId/reject',
        method: 'POST',
        ip: req.ip,
        status: 200,
        success: true,
        actor: 'admin',
        event: 'verification_rejected',
        details: decision,
      });

      res.json({ data: decision });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to reject task';
      res.status(404).json({ error: message });
    }
  });

  app.get('/api/ops/metrics', verifierGuard, (_req, res) => {
    res.json({ data: getMetricsSnapshot() });
  });

  if (enforceAdminAuth && !adminToken && verifierTokens.length === 0) {
    console.warn(
      'Role auth enforced but no ADMIN_API_TOKEN/VERIFIER_API_TOKENS configured. Protected routes will deny requests.'
    );
  }

  // --- Static File Serving for Production (Cloud Run) ---
  app.use(express.static(path.join(process.cwd(), 'dist')));

  // Catch-all route to serve the React SPA index.html for non-API routes
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api')) {
      return next();
    }
    res.sendFile(path.join(process.cwd(), 'dist', 'index.html'));
  });

  return app;
}
