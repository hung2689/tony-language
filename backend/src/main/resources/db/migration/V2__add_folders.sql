-- ============================================================
-- Language Learning
-- V2 - Add Folders
-- ============================================================

CREATE TABLE folders (
    id          BIGSERIAL PRIMARY KEY,
    user_id     BIGINT NOT NULL,
    name        VARCHAR(100) NOT NULL,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_folders_user
        FOREIGN KEY (user_id)
            REFERENCES users(id)
            ON DELETE CASCADE,

    CONSTRAINT chk_folders_name
        CHECK (LENGTH(TRIM(name)) > 0)
);

CREATE UNIQUE INDEX uq_folders_user_name_lower
    ON folders (user_id, LOWER(TRIM(name)));

CREATE INDEX idx_folders_user_id
    ON folders(user_id);

ALTER TABLE vocabulary_sets
    ADD COLUMN folder_id BIGINT;

ALTER TABLE vocabulary_sets
    ADD CONSTRAINT fk_vocabulary_sets_folder
        FOREIGN KEY (folder_id)
            REFERENCES folders(id)
            ON DELETE SET NULL;

CREATE INDEX idx_vocabulary_sets_folder_id
    ON vocabulary_sets(folder_id);
