-- Phase 7: verification workflow + role-ready persistence
ALTER TABLE scan_events
  ADD COLUMN IF NOT EXISTS source_user_id TEXT DEFAULT 'anonymous';

CREATE INDEX IF NOT EXISTS idx_scan_events_nmid_user ON scan_events(nmid, source_user_id);

CREATE TABLE IF NOT EXISTS verification_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  merchant_id TEXT UNIQUE NOT NULL,
  merchant_nmid VARCHAR(32) NOT NULL,
  queue_status TEXT NOT NULL DEFAULT 'pending', -- pending | flagged | approved | rejected
  decision_reason TEXT,
  reviewed_by TEXT,
  reviewed_role TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_verification_tasks_status ON verification_tasks(queue_status);
CREATE INDEX IF NOT EXISTS idx_verification_tasks_nmid ON verification_tasks(merchant_nmid);
