# Operations Runbook

## Service Endpoints
- Health: `GET /health`
- Metrics (verifier/admin): `GET /api/ops/metrics`

## Common Alerts and Actions

### 1) Increased 5xx on `/api/scan/process`
Checks:
- Inspect `AUDIT_LOG_FILE` for `scan_processing_failed`
- Verify maps/ai provider availability
- Verify Supabase connectivity (`SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`)

Action:
- If DB outage, temporarily set `ENABLE_SUPABASE_PERSISTENCE=false` and restart API
- Keep collecting scans in memory until DB restored

### 2) Users blocked on verification routes
Checks:
- Confirm `ENFORCE_ADMIN_AUTH` value
- Validate `x-admin-token` or `x-verifier-token`
- Verify `VERIFIER_API_TOKENS` not empty

Action:
- Rotate tokens and redeploy
- Update frontend env (`VITE_ADMIN_API_TOKEN` or `VITE_VERIFIER_API_TOKEN`) for staff dashboard

### 3) High request spikes / rate limiting
Checks:
- Review `/api/ops/metrics` route volume
- Check `429` responses from API

Action:
- Increase `RATE_LIMIT_MAX_REQUESTS` cautiously
- Add upstream WAF/CDN throttling if needed

## Incident Triage Order
1. `/health` availability
2. `/api/ops/metrics` for route latency/error patterns
3. Audit log events
4. DB connectivity and provider failover status

## Recovery Validation
After mitigation, run:
- `npm run lint`
- `npm run test`
- Smoke flow: scan -> queue -> approve -> dashboard
