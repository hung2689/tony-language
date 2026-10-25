-- ============================================================
-- Language Learning
-- V4 - Learn Mode Support
-- ============================================================

ALTER TABLE study_answers
    ADD COLUMN IF NOT EXISTS client_answer_id VARCHAR(64),
    ADD COLUMN IF NOT EXISTS override BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS attempt_no INT NOT NULL DEFAULT 1;

CREATE UNIQUE INDEX IF NOT EXISTS uq_study_answers_session_client_id
    ON study_answers (session_id, client_answer_id)
    WHERE client_answer_id IS NOT NULL;
