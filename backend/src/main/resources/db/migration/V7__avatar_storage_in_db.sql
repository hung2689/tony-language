-- ============================================================
-- V7: Avatar storage in database (Neon-safe, no ephemeral disk)
-- ============================================================

-- Add avatar_data column to user_profiles to store image bytes
ALTER TABLE user_profiles
    ADD COLUMN IF NOT EXISTS avatar_data   BYTEA,
    ADD COLUMN IF NOT EXISTS avatar_mime   VARCHAR(20);

-- Index for quick lookup (optional - only on user_id which is PK already)
COMMENT ON COLUMN user_profiles.avatar_data IS 'Raw avatar image bytes (PNG, max 2MB). Stored in DB to avoid ephemeral disk on Render.';
COMMENT ON COLUMN user_profiles.avatar_mime IS 'MIME type of the stored avatar (image/png, image/jpeg, image/webp).';
