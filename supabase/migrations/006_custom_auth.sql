-- ============================================================
-- Migration 006: Custom app_users table for bypass Supabase Auth
-- ============================================================

CREATE TABLE IF NOT EXISTS app_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL, -- Plain text for dev/testing as requested
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable RLS but allow public access for now since this is a custom auth bypass
ALTER TABLE app_users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public insert for registration" ON app_users
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow public select for login verification" ON app_users
  FOR SELECT USING (true);

-- Trigger for updated_at
CREATE TRIGGER app_users_updated_at
  BEFORE UPDATE ON app_users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
