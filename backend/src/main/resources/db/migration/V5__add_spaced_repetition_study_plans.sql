-- ============================================================
-- Language Learning
-- V5 - Spaced Repetition Study Plans
-- ============================================================

-- 1. Bảng Lộ trình ôn tập (Study Plans)
CREATE TABLE IF NOT EXISTS study_plans (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL,
    name VARCHAR(255) NOT NULL,
    target_date DATE NOT NULL,
    max_new_words_per_day INT NOT NULL DEFAULT 50,
    min_words_per_day INT NOT NULL DEFAULT 5,
    timezone VARCHAR(50) NOT NULL DEFAULT 'Asia/Ho_Chi_Minh',
    hard_gate_enabled BOOLEAN NOT NULL DEFAULT FALSE,
    status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE', -- ACTIVE, PAUSED, COMPLETED
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_study_plans_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_study_plans_user_status ON study_plans(user_id, status);

-- 2. Bảng liên kết Bộ từ trong lộ trình (Study Plan Decks)
CREATE TABLE IF NOT EXISTS study_plan_decks (
    id BIGSERIAL PRIMARY KEY,
    study_plan_id BIGINT NOT NULL,
    deck_id BIGINT NOT NULL,
    added_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_spd_plan FOREIGN KEY (study_plan_id) REFERENCES study_plans(id) ON DELETE CASCADE,
    CONSTRAINT fk_spd_deck FOREIGN KEY (deck_id) REFERENCES vocabulary_sets(id) ON DELETE CASCADE,
    CONSTRAINT uq_study_plan_deck UNIQUE (study_plan_id, deck_id)
);

CREATE INDEX IF NOT EXISTS idx_study_plan_decks_plan_id ON study_plan_decks(study_plan_id);
CREATE INDEX IF NOT EXISTS idx_study_plan_decks_deck_id ON study_plan_decks(deck_id);

-- 3. Bổ sung các cột SM-2 vào bảng study_progress hiện có
ALTER TABLE study_progress
    ADD COLUMN IF NOT EXISTS interval_days INT NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS ease_factor DECIMAL(4,2) NOT NULL DEFAULT 2.50,
    ADD COLUMN IF NOT EXISTS repetitions INT NOT NULL DEFAULT 0;
