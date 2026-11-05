-- ============================================================
-- Language Learning
-- V9 - Add revision to study_plans and sort_order to study_plan_decks
-- ============================================================

ALTER TABLE study_plans
    ADD COLUMN IF NOT EXISTS revision BIGINT NOT NULL DEFAULT 0;

ALTER TABLE study_plan_decks
    ADD COLUMN IF NOT EXISTS sort_order INT NOT NULL DEFAULT 0;

-- Backfill sort_order sequentially (1..N) per study_plan_id ordered by id ASC
WITH ranked AS (
    SELECT id,
           ROW_NUMBER() OVER (PARTITION BY study_plan_id ORDER BY id ASC)::int AS rn
    FROM study_plan_decks
)
UPDATE study_plan_decks spd
SET sort_order = ranked.rn
FROM ranked
WHERE spd.id = ranked.id;

CREATE INDEX IF NOT EXISTS idx_study_plan_decks_plan_sort
    ON study_plan_decks(study_plan_id, sort_order, id);
