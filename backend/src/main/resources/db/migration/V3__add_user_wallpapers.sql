-- ============================================================
-- Language Learning
-- V3 - User Wallpapers Management
-- PostgreSQL
-- ============================================================

CREATE TABLE user_wallpapers (
    id              BIGSERIAL PRIMARY KEY,
    user_id         BIGINT NOT NULL,
    name            VARCHAR(255) NOT NULL,
    image_url       TEXT NOT NULL,
    thumbnail_url   TEXT,
    is_active       BOOLEAN NOT NULL DEFAULT FALSE,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_user_wallpapers_user
        FOREIGN KEY (user_id)
        REFERENCES users (id)
        ON DELETE CASCADE
);

CREATE INDEX idx_user_wallpapers_user_id
    ON user_wallpapers (user_id);
