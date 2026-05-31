-- ============================================================
-- Migration 005: Add category column to core_merchants
-- Fixes mismatch between application code and database schema
-- ============================================================

-- Add category column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'core_merchants' AND column_name = 'category'
  ) THEN
    ALTER TABLE core_merchants ADD COLUMN category TEXT;
  END IF;
END $$;

-- Also ensure the column exists on the original merchants table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'merchants' AND column_name = 'category'
  ) THEN
    ALTER TABLE merchants ADD COLUMN category TEXT;
  END IF;
END $$;

-- Add image_url column for merchant photos
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'core_merchants' AND column_name = 'image_url'
  ) THEN
    ALTER TABLE core_merchants ADD COLUMN image_url TEXT;
  END IF;
END $$;

-- Add description column
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'core_merchants' AND column_name = 'description'
  ) THEN
    ALTER TABLE core_merchants ADD COLUMN description TEXT;
  END IF;
END $$;

-- Update the radius search RPC to include new columns
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
  image_url       TEXT,
  description     TEXT,
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
    m.image_url,
    m.description,
    ST_Distance(
      m.location,
      ST_Point(center_lng, center_lat)::geography
    ) AS distance_meters,
    m.created_at,
    m.updated_at
  FROM core_merchants m
  WHERE
    m.status = ANY(statuses)
    AND ST_DWithin(
      m.location,
      ST_Point(center_lng, center_lat)::geography,
      radius_m
    )
  ORDER BY distance_meters ASC;
$$;
