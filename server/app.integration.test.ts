import request from 'supertest';
import { beforeAll, describe, expect, it } from 'vitest';
import { createApp } from './app';

describe('API integration', () => {
  const verifierToken = 'verifier-test-token';
  const samplePayload = '0002010102115904TEST6007JAKARTA61051234562140810ID123456786304ABCD';

  let app: ReturnType<typeof createApp>;

  beforeAll(() => {
    process.env.ENFORCE_ADMIN_AUTH = 'true';
    process.env.VERIFIER_API_TOKENS = verifierToken;
    process.env.RATE_LIMIT_MAX_REQUESTS = '500';
    process.env.RATE_LIMIT_WINDOW_MS = '60000';
    process.env.ENABLE_SUPABASE_PERSISTENCE = 'false';
    app = createApp();
  });

  it('serves health endpoint', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
  });

  it('runs critical flow scan -> queue -> approve -> dashboard', async () => {
    const bodyBase = {
      rawQris: samplePayload,
      coords: { lat: -6.2088, lng: 106.8456 },
      source: 'pipeline_1',
    } as const;

    const scan1 = await request(app)
      .post('/api/scan/process')
      .send({ ...bodyBase, idempotencyKey: 'it_scan_1', sourceUserId: 'user1' });
    const scan2 = await request(app)
      .post('/api/scan/process')
      .send({ ...bodyBase, idempotencyKey: 'it_scan_2', sourceUserId: 'user2' });
    const scan3 = await request(app)
      .post('/api/scan/process')
      .send({ ...bodyBase, idempotencyKey: 'it_scan_3', sourceUserId: 'user3' });

    expect(scan1.status).toBe(200);
    expect(scan2.status).toBe(200);
    expect(scan3.status).toBe(200);
    expect(scan1.body.data.merchant.confidence).toBe(40);
    expect(scan2.body.data.merchant.confidence).toBe(70);
    expect(scan3.body.data.merchant.confidence).toBe(95);

    const queue = await request(app)
      .get('/api/verification/queue')
      .set('x-verifier-token', verifierToken);
    expect(queue.status).toBe(200);
    expect(queue.body.count).toBeGreaterThan(0);

    const merchantId = queue.body.data[0].id as string;
    const approve = await request(app)
      .post(`/api/verification/tasks/${merchantId}/approve`)
      .set('x-verifier-token', verifierToken)
      .send({ reason: 'integration-test' });

    expect(approve.status).toBe(200);
    expect(approve.body.data.queueStatus).toBe('approved');

    const dashboard = await request(app)
      .get('/api/verification/dashboard')
      .set('x-verifier-token', verifierToken);
    expect(dashboard.status).toBe(200);
    expect(dashboard.body.data.approved).toBeGreaterThanOrEqual(1);
  });

  it('exposes observability metrics endpoint', async () => {
    const res = await request(app)
      .get('/api/ops/metrics')
      .set('x-verifier-token', verifierToken);

    expect(res.status).toBe(200);
    expect(res.body.data.uptimeSec).toBeGreaterThanOrEqual(0);
    expect(Array.isArray(res.body.data.routes)).toBe(true);
  });
});
