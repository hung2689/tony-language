-- ============================================================
-- V6: USER XP LEDGER, EVENTS, AND INITIAL BACKFILL
-- ============================================================

CREATE TABLE IF NOT EXISTS user_xp (
    user_id     BIGINT PRIMARY KEY,
    total_xp    BIGINT NOT NULL DEFAULT 0 CHECK (total_xp >= 0),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_user_xp_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS xp_events (
    id          BIGSERIAL PRIMARY KEY,
    user_id     BIGINT NOT NULL,
    source_type VARCHAR(50) NOT NULL,
    source_key  VARCHAR(100) NOT NULL,
    xp          INT NOT NULL CHECK (xp >= 0),
    created_at  TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_xp_events_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT uq_xp_events_user_source UNIQUE (user_id, source_type, source_key)
);

CREATE INDEX IF NOT EXISTS idx_xp_events_user_created ON xp_events(user_id, created_at);

-- Idempotent initial backfill for existing users in users table
INSERT INTO user_xp (user_id, total_xp, updated_at)
SELECT id, 0, CURRENT_TIMESTAMP
FROM users
ON CONFLICT (user_id) DO NOTHING;

-- Backfill XP from past correct answers (first attempt = 5 XP, subsequent attempts = 2 XP; overrides = 0 XP)
-- Guarded by ON CONFLICT on uq_xp_events_user_source
INSERT INTO xp_events (user_id, source_type, source_key, xp, created_at)
SELECT
    ss.user_id,
    'STUDY_ANSWER',
    'sa_' || sa.id,
    CASE
        WHEN sa.override = true THEN 0
        WHEN sa.attempt_no <= 1 THEN 5
        ELSE 2
    END AS xp,
    sa.answered_at
FROM study_answers sa
JOIN study_sessions ss ON sa.session_id = ss.id
WHERE sa.is_correct = true
  AND sa.override = false
ON CONFLICT (user_id, source_type, source_key) DO NOTHING;

-- Update user_xp total_xp from backfilled events
UPDATE user_xp ux
SET total_xp = COALESCE(evt.sum_xp, 0),
    updated_at = CURRENT_TIMESTAMP
FROM (
    SELECT user_id, SUM(xp) AS sum_xp
    FROM xp_events
    GROUP BY user_id
) evt
WHERE ux.user_id = evt.user_id;
