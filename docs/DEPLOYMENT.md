# Deployment Guide

## Prerequisites
- Node.js 22+
- npm 10+
- Supabase project with PostGIS enabled

## Environment Setup
1. Copy `.env.example` to `.env`.
2. Fill server secrets:
- `ADMIN_API_TOKEN`
- `VERIFIER_API_TOKENS`
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
3. Set `ENABLE_SUPABASE_PERSISTENCE=true` for production.

## Database Migration
Apply SQL migrations in order:
1. `supabase/migrations/003_phase6_core_persistence.sql`
2. `supabase/migrations/004_phase7_verification_workflow.sql`

## Local Verification
Run quality gates:
- `npm run lint`
- `npm run test`
- `npm run build`

Run services:
- API: `npm run dev:api`
- Web: `npm run dev:web`

## Production Release Checklist
- `ENFORCE_ADMIN_AUTH=true`
- Strong `ADMIN_API_TOKEN` and `VERIFIER_API_TOKENS`
- Audit log path writable (`AUDIT_LOG_FILE`)
- CI pipeline green (`lint`, `test`, `build`)
- Verify `/health` and `/api/ops/metrics` response
