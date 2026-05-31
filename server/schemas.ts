import { z } from 'zod';

export const mapsNearbyQuerySchema = z.object({
  keyword: z.string().trim().min(1).max(150),
  lat: z.preprocess((v) => (v == null || v === '' ? undefined : Number(v)), z.number().finite().min(-90).max(90).optional()),
  lng: z.preprocess((v) => (v == null || v === '' ? undefined : Number(v)), z.number().finite().min(-180).max(180).optional()),
  radius: z.preprocess((v) => (v == null || v === '' ? undefined : Number(v)), z.number().finite().min(10).max(50000).optional()),
});

export const aiDiscoveryBodySchema = z.object({
  userLocation: z.string().trim().min(1).max(150).optional(),
});

export const scanProcessBodySchema = z.object({
  rawQris: z.string().min(8),
  coords: z.object({
    lat: z.number().finite().min(-90).max(90),
    lng: z.number().finite().min(-180).max(180),
  }),
  source: z.enum(['pipeline_1', 'pipeline_2', 'pipeline_3']).default('pipeline_1'),
  preferredPaymentApp: z.string().trim().min(1).max(30).optional(),
  idempotencyKey: z.string().trim().min(8).max(128).optional(),
  sourceUserId: z.string().trim().min(3).max(128).optional(),
});

export const merchantsQuerySchema = z.object({
  lat: z.preprocess((v) => (v == null || v === '' ? undefined : Number(v)), z.number().finite().min(-90).max(90).optional()),
  lng: z.preprocess((v) => (v == null || v === '' ? undefined : Number(v)), z.number().finite().min(-180).max(180).optional()),
  radius: z.preprocess((v) => (v == null || v === '' ? undefined : Number(v)), z.number().finite().min(1).max(50000).optional()),
});

export const verificationDecisionBodySchema = z.object({
  reason: z.string().trim().min(2).max(300).optional(),
});
