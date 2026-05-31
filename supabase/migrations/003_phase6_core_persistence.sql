-- Phase 6: Production persistence + idempotency + geospatial query support
CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS postgis;

CREATE TABLE IF NOT EXISTS core_merchants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nmid VARCHAR(32) UNIQUE NOT NULL,
  name TEXT NOT NULL,
  city TEXT,
  postal_code VARCHAR(10),
  lat DOUBLE PRECISION NOT NULL,
  lng DOUBLE PRECISION NOT NULL,
  location GEOGRAPHY(POINT, 4326) GENERATED ALWAYS AS (ST_SetSRID(ST_MakePoint(lng, lat), 4326)::geography) STORED,
  source TEXT NOT NULL,
  confidence INTEGER NOT NULL,
  status TEXT NOT NULL,
  scan_count INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_core_merchants_location ON core_merchants USING GIST(location);
CREATE INDEX IF NOT EXISTS idx_core_merchants_status ON core_merchants(status);

CREATE TABLE IF NOT EXISTS scan_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  idempotency_key TEXT UNIQUE NOT NULL,
  nmid VARCHAR(32) NOT NULL,
  source TEXT NOT NULL,
  raw_qris TEXT NOT NULL,
  coords JSONB NOT NULL,
  filter_reason TEXT NOT NULL,
  payment_deeplink TEXT NOT NULL,
  merchant_status TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  FOREIGN KEY (nmid) REFERENCES core_merchants(nmid)
);

CREATE INDEX IF NOT EXISTS idx_scan_events_nmid ON scan_events(nmid);

CREATE OR REPLACE FUNCTION get_merchants_in_radius(center_lat DOUBLE PRECISION, center_lng DOUBLE PRECISION, radius_m DOUBLE PRECISION)
RETURNS SETOF core_merchants
LANGUAGE sql
STABLE
AS $$
  SELECT *
  FROM core_merchants
  WHERE ST_DWithin(
    location,
    ST_SetSRID(ST_MakePoint(center_lng, center_lat), 4326)::geography,
    radius_m
  )
  ORDER BY updated_at DESC;
$$;
