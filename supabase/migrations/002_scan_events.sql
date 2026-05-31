-- ============================================================
-- Migration 002: scan_events — QRIS scan event log
-- Invisible Map — audit trail for all Pipeline 1 & 2 scans
-- ============================================================

-- ── Scan Events table ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS scan_events (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Links to merchants.nmid (not FK so inserts can happen before merchant upsert)
  nmid                VARCHAR(32) NOT NULL,

  -- Idempotency key prevents duplicate processing
  -- Format: {nmid}:{user_id}:{YYYY-MM-DD-HH}
  idempotency_key     VARCHAR(128) UNIQUE NOT NULL,

  -- Anonymous user identifier (from session / device fingerprint)
  source_user_id      TEXT,

  -- GPS coordinates at time of scan
  lat                 DOUBLE PRECISION NOT NULL,
  lng                 DOUBLE PRECISION NOT NULL,

  -- Raw QRIS string (truncated to 512 chars for storage efficiency)
  qris_raw            TEXT,

  -- Source pipeline
  source              TEXT NOT NULL DEFAULT 'pipeline_1',

  -- Processing result
  result_status       TEXT,   -- mirrors merchants.status at time of processing
  result_confidence   INTEGER,

  -- Error if processing failed
  error_message       TEXT,

  -- Processing duration in ms
  duration_ms         INTEGER,

  scanned_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  processed_at        TIMESTAMPTZ
);

-- ── Indexes ──────────────────────────────────────────────────
-- Fast lookup by NMID (join with merchants)
CREATE INDEX IF NOT EXISTS idx_scan_events_nmid
  ON scan_events(nmid);

-- Idempotency check
CREATE UNIQUE INDEX IF NOT EXISTS idx_scan_events_idempotency
  ON scan_events(idempotency_key);

-- Filter by user (for contribution stats)
CREATE INDEX IF NOT EXISTS idx_scan_events_user
  ON scan_events(source_user_id)
  WHERE source_user_id IS NOT NULL;

-- Timeline queries
CREATE INDEX IF NOT EXISTS idx_scan_events_scanned_at
  ON scan_events(scanned_at DESC);

-- Source pipeline filter
CREATE INDEX IF NOT EXISTS idx_scan_events_source
  ON scan_events(source);

-- ── Helper view: scan summary per merchant ────────────────────
CREATE OR REPLACE VIEW merchant_scan_summary AS
SELECT
  nmid,
  COUNT(*)                                    AS total_scans,
  COUNT(DISTINCT source_user_id)              AS unique_scanners,
  MAX(scanned_at)                             AS last_scan_at,
  MIN(scanned_at)                             AS first_scan_at,
  ROUND(AVG(duration_ms))::INTEGER            AS avg_duration_ms
FROM scan_events
GROUP BY nmid;

-- ── Helper: get unique scanner count for confidence progression ──
-- 1 unique scanner  → confidence 40  (PENDING)
-- 2 unique scanners → confidence 70  (UNVERIFIED)
-- 3+ unique scanners → confidence 95 (VERIFIED_INVISIBLE)
CREATE OR REPLACE FUNCTION get_scan_confidence(p_nmid VARCHAR)
RETURNS INTEGER
LANGUAGE sql STABLE AS $$
  SELECT
    CASE
      WHEN COUNT(DISTINCT source_user_id) >= 3 THEN 95
      WHEN COUNT(DISTINCT source_user_id) = 2  THEN 70
      ELSE 40
    END
  FROM scan_events
  WHERE nmid = p_nmid;
$$;
