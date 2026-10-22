-- ============================================================
-- Language Learning
-- V1 - Initial Database Schema
-- PostgreSQL
-- ============================================================

-- ============================================================
-- 1. USERS
-- ============================================================

CREATE TABLE users (
                       id              BIGSERIAL PRIMARY KEY,
                       email           VARCHAR(255) NOT NULL,
                       password_hash   VARCHAR(255) NOT NULL,
                       username        VARCHAR(100) NOT NULL,
                       status          VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',

                       created_at      TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
                       updated_at      TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

                       CONSTRAINT chk_users_status
                           CHECK (status IN ('ACTIVE', 'LOCKED', 'DELETED'))
);

-- Email không phân biệt hoa thường
CREATE UNIQUE INDEX uq_users_email_lower
    ON users (LOWER(email));

-- Username không phân biệt hoa thường
CREATE UNIQUE INDEX uq_users_username_lower
    ON users (LOWER(username));


-- ============================================================
-- 2. USER PROFILES
-- ============================================================

CREATE TABLE user_profiles (
                               id              BIGSERIAL PRIMARY KEY,
                               user_id         BIGINT NOT NULL UNIQUE,

                               display_name    VARCHAR(150),
                               avatar_url      TEXT,
                               bio             TEXT,

                               created_at      TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
                               updated_at      TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

                               CONSTRAINT fk_user_profiles_user
                                   FOREIGN KEY (user_id)
                                       REFERENCES users(id)
                                       ON DELETE CASCADE
);


-- ============================================================
-- 3. ROLES
-- ============================================================

CREATE TABLE roles (
                       id              BIGSERIAL PRIMARY KEY,
                       name            VARCHAR(50) NOT NULL UNIQUE
);


-- ============================================================
-- 4. USER ROLES
-- ============================================================

CREATE TABLE user_roles (
                            user_id         BIGINT NOT NULL,
                            role_id         BIGINT NOT NULL,

                            PRIMARY KEY (user_id, role_id),

                            CONSTRAINT fk_user_roles_user
                                FOREIGN KEY (user_id)
                                    REFERENCES users(id)
                                    ON DELETE CASCADE,

                            CONSTRAINT fk_user_roles_role
                                FOREIGN KEY (role_id)
                                    REFERENCES roles(id)
                                    ON DELETE CASCADE
);


-- ============================================================
-- 5. REFRESH TOKENS
-- ============================================================
-- Dùng cho JWT authentication.
-- Access token hết hạn -> dùng refresh token.
-- Logout -> revoke refresh token.

CREATE TABLE refresh_tokens (
                                id              BIGSERIAL PRIMARY KEY,
                                user_id         BIGINT NOT NULL,

                                token_hash      VARCHAR(255) NOT NULL UNIQUE,

                                expires_at      TIMESTAMPTZ NOT NULL,
                                revoked_at      TIMESTAMPTZ,

                                created_at      TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

                                CONSTRAINT fk_refresh_tokens_user
                                    FOREIGN KEY (user_id)
                                        REFERENCES users(id)
                                        ON DELETE CASCADE,

                                CONSTRAINT chk_refresh_tokens_expiry
                                    CHECK (expires_at > created_at)
);

CREATE INDEX idx_refresh_tokens_user_id
    ON refresh_tokens(user_id);

CREATE INDEX idx_refresh_tokens_expires_at
    ON refresh_tokens(expires_at);


-- ============================================================
-- 6. VOCABULARIES
-- ============================================================

CREATE TABLE vocabularies (
                              id                  BIGSERIAL PRIMARY KEY,

                              word                VARCHAR(255) NOT NULL,
                              meaning             TEXT NOT NULL,
                              word_type           VARCHAR(50),
                              pronunciation       VARCHAR(255),

                              example_sentence    TEXT,
                              example_paragraph   TEXT,

                              created_at          TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
                              updated_at          TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_vocabularies_word
    ON vocabularies(word);


-- ============================================================
-- 7. VOCABULARY SETS
-- ============================================================

CREATE TABLE vocabulary_sets (
                                 id              BIGSERIAL PRIMARY KEY,

                                 user_id         BIGINT NOT NULL,

                                 name            VARCHAR(150) NOT NULL,
                                 description     TEXT,

                                 created_at      TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
                                 updated_at      TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

                                 CONSTRAINT fk_vocabulary_sets_user
                                     FOREIGN KEY (user_id)
                                         REFERENCES users(id)
                                         ON DELETE CASCADE,

                                 CONSTRAINT chk_vocabulary_sets_name
                                     CHECK (LENGTH(TRIM(name)) > 0)
);

CREATE INDEX idx_vocabulary_sets_user_id
    ON vocabulary_sets(user_id);


-- ============================================================
-- 8. VOCABULARY SET ITEMS
-- ============================================================
-- Một vocabulary có thể nằm trong nhiều vocabulary set.

CREATE TABLE vocabulary_set_items (
                                      vocabulary_set_id    BIGINT NOT NULL,
                                      vocabulary_id       BIGINT NOT NULL,

                                      PRIMARY KEY (vocabulary_set_id, vocabulary_id),

                                      CONSTRAINT fk_vocabulary_set_items_set
                                          FOREIGN KEY (vocabulary_set_id)
                                              REFERENCES vocabulary_sets(id)
                                              ON DELETE CASCADE,

                                      CONSTRAINT fk_vocabulary_set_items_vocabulary
                                          FOREIGN KEY (vocabulary_id)
                                              REFERENCES vocabularies(id)
                                              ON DELETE CASCADE
);

CREATE INDEX idx_vocabulary_set_items_vocabulary_id
    ON vocabulary_set_items(vocabulary_id);


-- ============================================================
-- 9. VOCABULARY SYNONYMS
-- ============================================================

CREATE TABLE vocabulary_synonyms (
                                     id              BIGSERIAL PRIMARY KEY,

                                     vocabulary_id   BIGINT NOT NULL,
                                     synonym         VARCHAR(255) NOT NULL,

                                     CONSTRAINT fk_vocabulary_synonyms_vocabulary
                                         FOREIGN KEY (vocabulary_id)
                                             REFERENCES vocabularies(id)
                                             ON DELETE CASCADE,

                                     CONSTRAINT chk_vocabulary_synonyms_value
                                         CHECK (LENGTH(TRIM(synonym)) > 0)
);

-- Không cho cùng một synonym xuất hiện 2 lần
-- cho cùng một vocabulary.
CREATE UNIQUE INDEX uq_vocabulary_synonyms
    ON vocabulary_synonyms (
                            vocabulary_id,
                            LOWER(synonym)
        );

CREATE INDEX idx_vocabulary_synonyms_vocabulary_id
    ON vocabulary_synonyms(vocabulary_id);


-- ============================================================
-- 10. VOCABULARY AUDIO
-- ============================================================

CREATE TABLE vocabulary_audio (
                                  id              BIGSERIAL PRIMARY KEY,

                                  vocabulary_id   BIGINT NOT NULL,

                                  audio_url       TEXT NOT NULL,
                                  transcript      TEXT NOT NULL,

                                  created_at      TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

                                  CONSTRAINT fk_vocabulary_audio_vocabulary
                                      FOREIGN KEY (vocabulary_id)
                                          REFERENCES vocabularies(id)
                                          ON DELETE CASCADE,

                                  CONSTRAINT chk_vocabulary_audio_url
                                      CHECK (LENGTH(TRIM(audio_url)) > 0),

                                  CONSTRAINT chk_vocabulary_audio_transcript
                                      CHECK (LENGTH(TRIM(transcript)) > 0)
);

CREATE INDEX idx_vocabulary_audio_vocabulary_id
    ON vocabulary_audio(vocabulary_id);


-- ============================================================
-- 11. STUDY PROGRESS
-- ============================================================
-- Mỗi user có một progress riêng cho mỗi vocabulary.

CREATE TABLE study_progress (
                                id                  BIGSERIAL PRIMARY KEY,

                                user_id             BIGINT NOT NULL,
                                vocabulary_id       BIGINT NOT NULL,

                                correct_count       INT NOT NULL DEFAULT 0,
                                wrong_count         INT NOT NULL DEFAULT 0,

                                accuracy            DECIMAL(5,2) NOT NULL DEFAULT 0.00,

                                current_streak      INT NOT NULL DEFAULT 0,
                                difficulty          DECIMAL(5,2) NOT NULL DEFAULT 0.00,
                                memory_level        INT NOT NULL DEFAULT 0,

                                last_reviewed_at    TIMESTAMPTZ,
                                next_review_at      TIMESTAMPTZ,

                                created_at          TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
                                updated_at          TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

                                CONSTRAINT uq_study_progress_user_vocabulary
                                    UNIQUE (user_id, vocabulary_id),

                                CONSTRAINT fk_study_progress_user
                                    FOREIGN KEY (user_id)
                                        REFERENCES users(id)
                                        ON DELETE CASCADE,

                                CONSTRAINT fk_study_progress_vocabulary
                                    FOREIGN KEY (vocabulary_id)
                                        REFERENCES vocabularies(id)
                                        ON DELETE CASCADE,

                                CONSTRAINT chk_study_progress_correct_count
                                    CHECK (correct_count >= 0),

                                CONSTRAINT chk_study_progress_wrong_count
                                    CHECK (wrong_count >= 0),

                                CONSTRAINT chk_study_progress_accuracy
                                    CHECK (accuracy >= 0 AND accuracy <= 100),

                                CONSTRAINT chk_study_progress_current_streak
                                    CHECK (current_streak >= 0),

                                CONSTRAINT chk_study_progress_difficulty
                                    CHECK (difficulty >= 0 AND difficulty <= 100),

                                CONSTRAINT chk_study_progress_memory_level
                                    CHECK (memory_level >= 0)
);

CREATE INDEX idx_study_progress_user_id
    ON study_progress(user_id);

CREATE INDEX idx_study_progress_next_review
    ON study_progress(user_id, next_review_at);


-- ============================================================
-- 12. STUDY SESSIONS
-- ============================================================

CREATE TABLE study_sessions (
                                id                  BIGSERIAL PRIMARY KEY,

                                user_id             BIGINT NOT NULL,
                                vocabulary_set_id   BIGINT,

                                study_mode          VARCHAR(50) NOT NULL,

                                started_at          TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
                                completed_at        TIMESTAMPTZ,

                                total_questions     INT NOT NULL DEFAULT 0,
                                correct_answers     INT NOT NULL DEFAULT 0,
                                wrong_answers       INT NOT NULL DEFAULT 0,

                                CONSTRAINT fk_study_sessions_user
                                    FOREIGN KEY (user_id)
                                        REFERENCES users(id)
                                        ON DELETE CASCADE,

                                CONSTRAINT fk_study_sessions_vocabulary_set
                                    FOREIGN KEY (vocabulary_set_id)
                                        REFERENCES vocabulary_sets(id)
                                        ON DELETE SET NULL,

                                CONSTRAINT chk_study_sessions_mode
                                    CHECK (
                                        study_mode IN (
                                                       'VI_TO_EN',
                                                       'EN_TO_VI',
                                                       'SENTENCE',
                                                       'PARAGRAPH',
                                                       'LISTENING',
                                                       'RANDOM'
                                            )
                                        ),

                                CONSTRAINT chk_study_sessions_total_questions
                                    CHECK (total_questions >= 0),

                                CONSTRAINT chk_study_sessions_correct_answers
                                    CHECK (correct_answers >= 0),

                                CONSTRAINT chk_study_sessions_wrong_answers
                                    CHECK (wrong_answers >= 0),

                                CONSTRAINT chk_study_sessions_completed_at
                                    CHECK (
                                        completed_at IS NULL
                                            OR completed_at >= started_at
                                        )
);

CREATE INDEX idx_study_sessions_user_id
    ON study_sessions(user_id);

CREATE INDEX idx_study_sessions_vocabulary_set_id
    ON study_sessions(vocabulary_set_id);

CREATE INDEX idx_study_sessions_started_at
    ON study_sessions(started_at);


-- ============================================================
-- 13. STUDY ANSWERS
-- ============================================================

CREATE TABLE study_answers (
                               id              BIGSERIAL PRIMARY KEY,

                               session_id      BIGINT NOT NULL,
                               vocabulary_id   BIGINT NOT NULL,

                               question_type   VARCHAR(50) NOT NULL,
                               user_answer     TEXT,

                               is_correct      BOOLEAN NOT NULL,

                               answered_at     TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

                               CONSTRAINT fk_study_answers_session
                                   FOREIGN KEY (session_id)
                                       REFERENCES study_sessions(id)
                                       ON DELETE CASCADE,

                               CONSTRAINT fk_study_answers_vocabulary
                                   FOREIGN KEY (vocabulary_id)
                                       REFERENCES vocabularies(id)
                                       ON DELETE CASCADE,

                               CONSTRAINT chk_study_answers_question_type
                                   CHECK (
                                       question_type IN (
                                                         'VI_TO_EN',
                                                         'EN_TO_VI',
                                                         'SENTENCE',
                                                         'PARAGRAPH',
                                                         'LISTENING',
                                                         'RANDOM'
                                           )
                                       )
);

CREATE INDEX idx_study_answers_session_id
    ON study_answers(session_id);

CREATE INDEX idx_study_answers_vocabulary_id
    ON study_answers(vocabulary_id);

CREATE INDEX idx_study_answers_answered_at
    ON study_answers(answered_at);


-- ============================================================
-- 14. FEATURES
-- ============================================================
-- Những chức năng mà hệ thống có thể khóa/mở theo plan.

CREATE TABLE features (
                          id              BIGSERIAL PRIMARY KEY,

                          code            VARCHAR(100) NOT NULL UNIQUE,
                          name            VARCHAR(150) NOT NULL,
                          description     TEXT,

                          is_active       BOOLEAN NOT NULL DEFAULT TRUE,

                          created_at      TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);


-- ============================================================
-- 15. SUBSCRIPTION PLANS
-- ============================================================

CREATE TABLE subscription_plans (
                                    id              BIGSERIAL PRIMARY KEY,

                                    code            VARCHAR(100) NOT NULL UNIQUE,
                                    name            VARCHAR(150) NOT NULL,
                                    description     TEXT,

                                    price           BIGINT NOT NULL,
                                    currency        VARCHAR(10) NOT NULL DEFAULT 'VND',

                                    duration_days   INT,

                                    is_active       BOOLEAN NOT NULL DEFAULT TRUE,

                                    created_at      TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
                                    updated_at      TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

                                    CONSTRAINT chk_subscription_plans_price
                                        CHECK (price >= 0),

                                    CONSTRAINT chk_subscription_plans_duration
                                        CHECK (
                                            duration_days IS NULL
                                                OR duration_days > 0
                                            )
);


-- ============================================================
-- 16. PLAN FEATURES
-- ============================================================

CREATE TABLE plan_features (
                               plan_id         BIGINT NOT NULL,
                               feature_id      BIGINT NOT NULL,

                               PRIMARY KEY (plan_id, feature_id),

                               CONSTRAINT fk_plan_features_plan
                                   FOREIGN KEY (plan_id)
                                       REFERENCES subscription_plans(id)
                                       ON DELETE CASCADE,

                               CONSTRAINT fk_plan_features_feature
                                   FOREIGN KEY (feature_id)
                                       REFERENCES features(id)
                                       ON DELETE CASCADE
);

CREATE INDEX idx_plan_features_feature_id
    ON plan_features(feature_id);


-- ============================================================
-- 17. SUBSCRIPTIONS
-- ============================================================

CREATE TABLE subscriptions (
                               id              BIGSERIAL PRIMARY KEY,

                               user_id         BIGINT NOT NULL,
                               plan_id         BIGINT NOT NULL,

                               status          VARCHAR(30) NOT NULL,

                               started_at      TIMESTAMPTZ NOT NULL,
                               expires_at      TIMESTAMPTZ NOT NULL,

                               auto_renew      BOOLEAN NOT NULL DEFAULT FALSE,

                               created_at      TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
                               updated_at      TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

                               CONSTRAINT fk_subscriptions_user
                                   FOREIGN KEY (user_id)
                                       REFERENCES users(id)
                                       ON DELETE CASCADE,

                               CONSTRAINT fk_subscriptions_plan
                                   FOREIGN KEY (plan_id)
                                       REFERENCES subscription_plans(id),

                               CONSTRAINT chk_subscriptions_status
                                   CHECK (
                                       status IN (
                                                  'PENDING',
                                                  'ACTIVE',
                                                  'EXPIRED',
                                                  'CANCELLED'
                                           )
                                       ),

                               CONSTRAINT chk_subscriptions_dates
                                   CHECK (expires_at > started_at)
);

CREATE INDEX idx_subscriptions_user_id
    ON subscriptions(user_id);

CREATE INDEX idx_subscriptions_plan_id
    ON subscriptions(plan_id);

CREATE INDEX idx_subscriptions_status
    ON subscriptions(status);

CREATE INDEX idx_subscriptions_expires_at
    ON subscriptions(expires_at);

-- Một user chỉ được có 1 subscription ACTIVE.
CREATE UNIQUE INDEX uq_subscriptions_one_active_per_user
    ON subscriptions(user_id)
    WHERE status = 'ACTIVE';


-- ============================================================
-- 18. PAYMENTS
-- ============================================================

CREATE TABLE payments (
                          id                  BIGSERIAL PRIMARY KEY,

                          user_id             BIGINT NOT NULL,
                          subscription_id     BIGINT,

    -- Giá gốc tại thời điểm thanh toán
                          subtotal_amount     BIGINT NOT NULL,

    -- Số tiền được giảm bởi promotion
                          discount_amount     BIGINT NOT NULL DEFAULT 0,

    -- Số tiền thực tế thanh toán
                          amount              BIGINT NOT NULL,

                          currency            VARCHAR(10) NOT NULL DEFAULT 'VND',

                          payment_method      VARCHAR(50),
                          payment_gateway     VARCHAR(50),

                          transaction_id      VARCHAR(255),

                          status              VARCHAR(30) NOT NULL,

                          paid_at             TIMESTAMPTZ,
                          created_at          TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

                          CONSTRAINT fk_payments_user
                              FOREIGN KEY (user_id)
                                  REFERENCES users(id)
                                  ON DELETE CASCADE,

                          CONSTRAINT fk_payments_subscription
                              FOREIGN KEY (subscription_id)
                                  REFERENCES subscriptions(id)
                                  ON DELETE SET NULL,

                          CONSTRAINT chk_payments_subtotal
                              CHECK (subtotal_amount >= 0),

                          CONSTRAINT chk_payments_discount
                              CHECK (
                                  discount_amount >= 0
                                      AND discount_amount <= subtotal_amount
                                  ),

                          CONSTRAINT chk_payments_amount
                              CHECK (
                                  amount >= 0
                                      AND amount = subtotal_amount - discount_amount
                                  ),

                          CONSTRAINT chk_payments_status
                              CHECK (
                                  status IN (
                                             'PENDING',
                                             'SUCCESS',
                                             'FAILED',
                                             'CANCELLED',
                                             'REFUNDED'
                                      )
                                  )
);

CREATE INDEX idx_payments_user_id
    ON payments(user_id);

CREATE INDEX idx_payments_subscription_id
    ON payments(subscription_id);

CREATE INDEX idx_payments_status
    ON payments(status);

CREATE INDEX idx_payments_created_at
    ON payments(created_at);

-- Transaction ID phải duy nhất nếu payment gateway cung cấp.
CREATE UNIQUE INDEX uq_payments_transaction_id
    ON payments(transaction_id)
    WHERE transaction_id IS NOT NULL;


-- ============================================================
-- 19. PROMOTIONS
-- ============================================================

CREATE TABLE promotions (
                            id                  BIGSERIAL PRIMARY KEY,

                            code                VARCHAR(50) NOT NULL UNIQUE,
                            name                VARCHAR(150) NOT NULL,
                            description         TEXT,

                            discount_type       VARCHAR(30) NOT NULL,
                            discount_value      BIGINT NOT NULL,

                            max_discount_amount BIGINT,

                            starts_at           TIMESTAMPTZ NOT NULL,
                            ends_at             TIMESTAMPTZ NOT NULL,

                            usage_limit         INT,
                            used_count          INT NOT NULL DEFAULT 0,

                            is_active           BOOLEAN NOT NULL DEFAULT TRUE,

                            created_at          TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
                            updated_at          TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

                            CONSTRAINT chk_promotions_discount_type
                                CHECK (
                                    discount_type IN (
                                                      'PERCENTAGE',
                                                      'FIXED'
                                        )
                                    ),

                            CONSTRAINT chk_promotions_discount_value
                                CHECK (
                                    (
                                        discount_type = 'PERCENTAGE'
                                            AND discount_value BETWEEN 1 AND 100
                                        )
                                        OR
                                    (
                                        discount_type = 'FIXED'
                                            AND discount_value > 0
                                        )
                                    ),

                            CONSTRAINT chk_promotions_max_discount
                                CHECK (
                                    max_discount_amount IS NULL
                                        OR max_discount_amount >= 0
                                    ),

                            CONSTRAINT chk_promotions_dates
                                CHECK (ends_at > starts_at),

                            CONSTRAINT chk_promotions_usage_limit
                                CHECK (
                                    usage_limit IS NULL
                                        OR usage_limit > 0
                                    ),

                            CONSTRAINT chk_promotions_used_count
                                CHECK (used_count >= 0),

                            CONSTRAINT chk_promotions_usage_not_exceed_limit
                                CHECK (
                                    usage_limit IS NULL
                                        OR used_count <= usage_limit
                                    )
);

CREATE INDEX idx_promotions_code
    ON promotions(code);

CREATE INDEX idx_promotions_active_dates
    ON promotions(is_active, starts_at, ends_at);


-- ============================================================
-- 20. PROMOTION PLANS
-- ============================================================
-- Promotion nào áp dụng cho plan nào.

CREATE TABLE promotion_plans (
                                 promotion_id    BIGINT NOT NULL,
                                 plan_id         BIGINT NOT NULL,

                                 PRIMARY KEY (promotion_id, plan_id),

                                 CONSTRAINT fk_promotion_plans_promotion
                                     FOREIGN KEY (promotion_id)
                                         REFERENCES promotions(id)
                                         ON DELETE CASCADE,

                                 CONSTRAINT fk_promotion_plans_plan
                                     FOREIGN KEY (plan_id)
                                         REFERENCES subscription_plans(id)
                                         ON DELETE CASCADE
);

CREATE INDEX idx_promotion_plans_plan_id
    ON promotion_plans(plan_id);


-- ============================================================
-- 21. PROMOTION USAGES
-- ============================================================

CREATE TABLE promotion_usages (
                                  id              BIGSERIAL PRIMARY KEY,

                                  promotion_id    BIGINT NOT NULL,
                                  user_id         BIGINT NOT NULL,
                                  payment_id      BIGINT,

                                  discount_amount BIGINT NOT NULL,

                                  used_at         TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

                                  CONSTRAINT fk_promotion_usages_promotion
                                      FOREIGN KEY (promotion_id)
                                          REFERENCES promotions(id)
                                          ON DELETE CASCADE,

                                  CONSTRAINT fk_promotion_usages_user
                                      FOREIGN KEY (user_id)
                                          REFERENCES users(id)
                                          ON DELETE CASCADE,

                                  CONSTRAINT fk_promotion_usages_payment
                                      FOREIGN KEY (payment_id)
                                          REFERENCES payments(id)
                                          ON DELETE SET NULL,

                                  CONSTRAINT chk_promotion_usages_discount
                                      CHECK (discount_amount >= 0)
);

CREATE INDEX idx_promotion_usages_promotion_id
    ON promotion_usages(promotion_id);

CREATE INDEX idx_promotion_usages_user_id
    ON promotion_usages(user_id);

CREATE INDEX idx_promotion_usages_payment_id
    ON promotion_usages(payment_id);


-- ============================================================
-- 22. SEED ROLES
-- ============================================================

INSERT INTO roles (name)
VALUES
    ('USER'),
    ('ADMIN')
    ON CONFLICT (name) DO NOTHING;


-- ============================================================
-- 23. SEED FEATURES
-- ============================================================

INSERT INTO features (code, name, description)
VALUES
    (
        'FLASHCARD',
        'Flashcard Learning',
        'Basic vocabulary flashcard learning'
    ),
    (
        'VI_TO_EN',
        'Vietnamese to English',
        'Practice Vietnamese to English vocabulary'
    ),
    (
        'EN_TO_VI',
        'English to Vietnamese',
        'Practice English to Vietnamese vocabulary'
    ),
    (
        'RANDOM',
        'Random Mode',
        'Random vocabulary practice'
    ),
    (
        'SENTENCE',
        'Sentence Practice',
        'Practice vocabulary by creating sentences'
    ),
    (
        'PARAGRAPH',
        'Paragraph Practice',
        'Practice vocabulary in paragraph context'
    ),
    (
        'LISTENING',
        'Listening Practice',
        'Listen to sentences and type what you hear'
    ),
    (
        'AI_EVALUATION',
        'AI Evaluation',
        'AI-powered answer evaluation'
    ),
    (
        'ADVANCED_STATISTICS',
        'Advanced Statistics',
        'Advanced learning statistics and analytics'
    )
    ON CONFLICT (code) DO NOTHING;


-- ============================================================
-- 24. SEED SUBSCRIPTION PLANS
-- ============================================================
-- Giá bên dưới là GIÁ MẪU ban đầu.
-- Có thể thay đổi bằng Admin sau này.
--
-- FREE            : 0 VND
-- PREMIUM_MONTHLY : 99,000 VND / 30 ngày
-- PREMIUM_YEARLY  : 799,000 VND / 365 ngày

INSERT INTO subscription_plans (
    code,
    name,
    description,
    price,
    currency,
    duration_days,
    is_active
)
VALUES
    (
        'FREE',
        'Free',
        'Free plan for basic vocabulary learning',
        0,
        'VND',
        NULL,
        TRUE
    ),
    (
        'PREMIUM_MONTHLY',
        'Premium Monthly',
        'Premium subscription billed monthly',
        99000,
        'VND',
        30,
        TRUE
    ),
    (
        'PREMIUM_YEARLY',
        'Premium Yearly',
        'Premium subscription billed yearly',
        799000,
        'VND',
        365,
        TRUE
    )
    ON CONFLICT (code) DO NOTHING;


-- ============================================================
-- 25. FREE PLAN FEATURES
-- ============================================================

INSERT INTO plan_features (plan_id, feature_id)
SELECT
    p.id,
    f.id
FROM subscription_plans p
         CROSS JOIN features f
WHERE p.code = 'FREE'
  AND f.code IN (
                 'FLASHCARD',
                 'VI_TO_EN',
                 'EN_TO_VI',
                 'RANDOM'
    )
    ON CONFLICT DO NOTHING;


-- ============================================================
-- 26. PREMIUM MONTHLY FEATURES
-- ============================================================

INSERT INTO plan_features (plan_id, feature_id)
SELECT
    p.id,
    f.id
FROM subscription_plans p
         CROSS JOIN features f
WHERE p.code = 'PREMIUM_MONTHLY'
  AND f.code IN (
                 'FLASHCARD',
                 'VI_TO_EN',
                 'EN_TO_VI',
                 'RANDOM',
                 'SENTENCE',
                 'PARAGRAPH',
                 'LISTENING',
                 'AI_EVALUATION',
                 'ADVANCED_STATISTICS'
    )
    ON CONFLICT DO NOTHING;


-- ============================================================
-- 27. PREMIUM YEARLY FEATURES
-- ============================================================

INSERT INTO plan_features (plan_id, feature_id)
SELECT
    p.id,
    f.id
FROM subscription_plans p
         CROSS JOIN features f
WHERE p.code = 'PREMIUM_YEARLY'
  AND f.code IN (
                 'FLASHCARD',
                 'VI_TO_EN',
                 'EN_TO_VI',
                 'RANDOM',
                 'SENTENCE',
                 'PARAGRAPH',
                 'LISTENING',
                 'AI_EVALUATION',
                 'ADVANCED_STATISTICS'
    )
    ON CONFLICT DO NOTHING;


-- ============================================================
-- END OF V1
-- ============================================================