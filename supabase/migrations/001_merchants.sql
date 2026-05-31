-- ============================================================
-- Migration 001: core_merchants table + PostGIS geospatial index
-- Invisible Map — UMKM merchant registry
-- ============================================================

-- Enable PostGIS extension (run once per Supabase project)
CREATE EXTENSION IF NOT EXISTS postgis;

-- ── Merchants table ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS merchants (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- National Merchant ID (Bank Indonesia) — anchor identifier
  nmid            VARCHAR(32) UNIQUE NOT NULL,

  name            TEXT NOT NULL,

  -- Business category (Gemini-classified or keyword-matched)
  category        TEXT,

  -- From QRIS tag 60 / geocoding
  city            TEXT,
  postal_code     VARCHAR(10),

  -- PostGIS geography point (WGS84)
  location        GEOGRAPHY(POINT, 4326),

  -- Visibility status
  -- PENDING | INVISIBLE | VERIFIED_INVISIBLE | UNVERIFIED | ALREADY_MAPPED | DUPLICATE | MERCHANT_RELOCATED
  status          TEXT NOT NULL DEFAULT 'PENDING',

  -- 0–100 confidence score
  confidence      INTEGER NOT NULL DEFAULT 0 CHECK (confidence BETWEEN 0 AND 100),

  -- Total scan event count (all users)
  scan_count      INTEGER NOT NULL DEFAULT 0,

  -- Number of unique users who scanned this merchant
  unique_scanner_count INTEGER NOT NULL DEFAULT 0,

  -- Data source pipeline
  source          TEXT NOT NULL DEFAULT 'pipeline_1',

  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── Indexes ──────────────────────────────────────────────────
-- Geospatial index for radius queries (ST_DWithin)
CREATE INDEX IF NOT EXISTS idx_merchants_location
  ON merchants USING GIST(location);

-- NMID lookup
CREATE INDEX IF NOT EXISTS idx_merchants_nmid
  ON merchants(nmid);

-- Status filter (common in map queries)
CREATE INDEX IF NOT EXISTS idx_merchants_status
  ON merchants(status);

-- ── Auto-update updated_at trigger ───────────────────────────
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER merchants_updated_at
  BEFORE UPDATE ON merchants
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ── Radius search RPC ─────────────────────────────────────────
-- Usage: SELECT * FROM get_merchants_in_radius(-6.2088, 106.8456, 1000, ARRAY['INVISIBLE','VERIFIED_INVISIBLE'])
CREATE OR REPLACE FUNCTION get_merchants_in_radius(
  center_lat   DOUBLE PRECISION,
  center_lng   DOUBLE PRECISION,
  radius_m     INTEGER,
  statuses     TEXT[] DEFAULT ARRAY['INVISIBLE','VERIFIED_INVISIBLE']
)
RETURNS TABLE (
  id              UUID,
  nmid            VARCHAR,
  name            TEXT,
  category        TEXT,
  city            TEXT,
  postal_code     VARCHAR,
  status          TEXT,
  confidence      INTEGER,
  scan_count      INTEGER,
  source          TEXT,
  distance_meters DOUBLE PRECISION,
  created_at      TIMESTAMPTZ,
  updated_at      TIMESTAMPTZ
)
LANGUAGE sql STABLE AS $$
  SELECT
    m.id,
    m.nmid,
    m.name,
    m.category,
    m.city,
    m.postal_code,
    m.status,
    m.confidence,
    m.scan_count,
    m.source,
    ST_Distance(
      m.location,
      ST_Point(center_lng, center_lat)::geography
    ) AS distance_meters,
    m.created_at,
    m.updated_at
  FROM merchants m
  WHERE
    m.status = ANY(statuses)
    AND ST_DWithin(
      m.location,
      ST_Point(center_lng, center_lat)::geography,
      radius_m
    )
  ORDER BY distance_meters ASC;
$$;

-- ── Example usage (for reference) ────────────────────────────
-- Find INVISIBLE merchants within 1km of Jakarta center:
-- SELECT name, category, confidence, distance_meters
-- FROM get_merchants_in_radius(-6.2088, 106.8456, 1000);
