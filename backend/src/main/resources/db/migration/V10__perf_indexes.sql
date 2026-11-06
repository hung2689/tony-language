-- V10__perf_indexes.sql
-- Quick wins performance indexes and stored generated normalized word column

-- 1. Accelerates list decks sorted by creation time
CREATE INDEX IF NOT EXISTS idx_vocabulary_sets_user_created 
    ON vocabulary_sets(user_id, created_at DESC);

-- 2. Accelerates study session analytics and history filtering by user and date
CREATE INDEX IF NOT EXISTS idx_study_sessions_user_started 
    ON study_sessions(user_id, started_at);

-- 3. Accelerates GET /api/analytics/weak-words filtering weak words with wrong_count > 0
CREATE INDEX IF NOT EXISTS idx_study_progress_user_weak 
    ON study_progress(user_id, wrong_count DESC, accuracy) 
    WHERE wrong_count > 0;

-- 4. Drop redundant single-column index on study_progress(user_id)
-- user_id is already the leading column in both uq_study_progress_user_vocabulary(user_id, vocabulary_id)
-- and idx_study_progress_next_review(user_id, next_review_at)
DROP INDEX IF EXISTS idx_study_progress_user_id;

-- 5. Stored generated column word_norm on vocabularies matching StudyPlanSql and StudyPlanService normalization
ALTER TABLE vocabularies 
    ADD COLUMN IF NOT EXISTS word_norm text 
    GENERATED ALWAYS AS (lower(btrim(word, E' \t\n\r'))) STORED;

CREATE INDEX IF NOT EXISTS idx_vocabularies_word_norm 
    ON vocabularies(word_norm);
