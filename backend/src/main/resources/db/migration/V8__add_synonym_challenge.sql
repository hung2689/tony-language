-- ============================================================
-- Language Learning
-- V8 - Synonym Challenge Learning Mode
-- ============================================================

-- 1. Update check constraints on study_sessions to allow 'SYNONYM'
ALTER TABLE study_sessions
    DROP CONSTRAINT IF EXISTS chk_study_sessions_mode;

ALTER TABLE study_sessions
    ADD CONSTRAINT chk_study_sessions_mode
        CHECK (
            study_mode IN (
                'VI_TO_EN',
                'EN_TO_VI',
                'SENTENCE',
                'PARAGRAPH',
                'LISTENING',
                'RANDOM',
                'SYNONYM'
            )
        );

-- 2. Update check constraints on study_answers to allow 'SYNONYM'
ALTER TABLE study_answers
    DROP CONSTRAINT IF EXISTS chk_study_answers_question_type;

ALTER TABLE study_answers
    ADD CONSTRAINT chk_study_answers_question_type
        CHECK (
            question_type IN (
                'VI_TO_EN',
                'EN_TO_VI',
                'SENTENCE',
                'PARAGRAPH',
                'LISTENING',
                'RANDOM',
                'SYNONYM'
            )
        );

-- 3. Create table for tracking Synonym Challenge History
CREATE TABLE IF NOT EXISTS synonym_challenge_history (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL,
    deck_id BIGINT NOT NULL,
    vocabulary_id BIGINT NOT NULL,
    root_word VARCHAR(255) NOT NULL,
    evaluation_mode VARCHAR(50) NOT NULL DEFAULT 'AI_GEMINI', -- AI_GEMINI or LOCAL_FALLBACK
    submitted_count INT NOT NULL DEFAULT 0,
    valid_count INT NOT NULL DEFAULT 0,
    invalid_count INT NOT NULL DEFAULT 0,
    evaluated_words_json TEXT, -- JSON serialization of submitted answers & evaluation
    missed_synonyms_json TEXT,  -- JSON serialization of missed TOEIC synonyms
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_sch_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_sch_deck FOREIGN KEY (deck_id) REFERENCES vocabulary_sets(id) ON DELETE CASCADE,
    CONSTRAINT fk_sch_vocab FOREIGN KEY (vocabulary_id) REFERENCES vocabularies(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_sch_user_deck ON synonym_challenge_history(user_id, deck_id);
CREATE INDEX IF NOT EXISTS idx_sch_vocab ON synonym_challenge_history(vocabulary_id);
CREATE INDEX IF NOT EXISTS idx_sch_created_at ON synonym_challenge_history(created_at);
