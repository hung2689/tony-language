-- V11__word_norm_nfc.sql
-- Upgrade word_norm column to canonical Unicode NFC normalization via PostgreSQL normalize()
-- NOTE: Requires PostgreSQL 13 or newer (which introduced built-in Unicode normalization).
--
-- Recreating the generated stored column rewrites the table 'vocabularies'.
-- On production, execute during low-traffic window or migration deployment.

-- 1. Drop existing index on word_norm
DROP INDEX IF EXISTS idx_vocabularies_word_norm;

-- 2. Drop existing generated column
ALTER TABLE vocabularies
    DROP COLUMN IF EXISTS word_norm;

-- 3. Re-add column with normalize(..., NFC)
ALTER TABLE vocabularies
    ADD COLUMN word_norm text
    GENERATED ALWAYS AS (normalize(lower(btrim(word, E' \t\n\r')), NFC)) STORED;

-- 4. Re-create index on normalized column
CREATE INDEX idx_vocabularies_word_norm
    ON vocabularies(word_norm);
