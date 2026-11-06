package com.languagelearning.backend.common.security;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.context.annotation.Profile;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

import java.sql.PreparedStatement;
import java.sql.Timestamp;
import java.time.Instant;
import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.List;

@Component
@Profile("perf")
public class PerfDataSeeder implements ApplicationRunner {

    private static final Logger log = LoggerFactory.getLogger(PerfDataSeeder.class);

    public static final String PERF_USER_EMAIL = "perf@languagelearning.com";
    public static final String PERF_USERNAME = "perf_user";
    public static final String PERF_PASSWORD = "PerfPassword123!";

    private final JdbcTemplate jdbcTemplate;
    private final PasswordEncoder passwordEncoder;

    public PerfDataSeeder(JdbcTemplate jdbcTemplate, PasswordEncoder passwordEncoder) {
        this.jdbcTemplate = jdbcTemplate;
        this.passwordEncoder = passwordEncoder;
    }

    @Override
    public void run(ApplicationArguments args) {
        log.info("=== Starting PerfDataSeeder ===");
        long startTime = System.currentTimeMillis();

        // 1. Ensure USER role exists
        Long roleId;
        List<Long> roleIds = jdbcTemplate.query(
                "SELECT id FROM roles WHERE name = 'USER'",
                (rs, rowNum) -> rs.getLong("id")
        );
        if (roleIds.isEmpty()) {
            roleId = jdbcTemplate.queryForObject(
                    "INSERT INTO roles (name) VALUES ('USER') RETURNING id",
                    Long.class
            );
        } else {
            roleId = roleIds.get(0);
        }

        // 2. Ensure Perf User exists
        Long userId;
        List<Long> userIds = jdbcTemplate.query(
                "SELECT id FROM users WHERE LOWER(email) = LOWER(?)",
                (rs, rowNum) -> rs.getLong("id"),
                PERF_USER_EMAIL
        );

        if (userIds.isEmpty()) {
            userId = jdbcTemplate.queryForObject(
                    "INSERT INTO users (email, password_hash, username, status, created_at, updated_at) " +
                            "VALUES (?, ?, ?, 'ACTIVE', NOW(), NOW()) RETURNING id",
                    Long.class,
                    PERF_USER_EMAIL,
                    passwordEncoder.encode(PERF_PASSWORD),
                    PERF_USERNAME
            );
            jdbcTemplate.update(
                    "INSERT INTO user_roles (user_id, role_id) VALUES (?, ?) ON CONFLICT DO NOTHING",
                    userId, roleId
            );
            jdbcTemplate.update(
                    "INSERT INTO user_profiles (user_id, display_name, created_at, updated_at) " +
                            "VALUES (?, 'Performance Benchmark User', NOW(), NOW()) ON CONFLICT (user_id) DO NOTHING",
                    userId
            );
            log.info("Created perf user with id: {}", userId);
        } else {
            userId = userIds.get(0);
            log.info("Perf user already exists with id: {}", userId);
        }

        // Check if data is already seeded (idempotency check)
        Integer existingDeckCount = jdbcTemplate.queryForObject(
                "SELECT COUNT(*)::int FROM vocabulary_sets WHERE user_id = ?",
                Integer.class,
                userId
        );

        if (existingDeckCount != null && existingDeckCount >= 20) {
            log.info("Perf user already has {} decks. Seeder data is already present. Ensuring active study plan exists...", existingDeckCount);
            ensureActiveStudyPlan(userId);
            return;
        }

        // 3. Create 20 decks for perf user
        List<Long> deckIds = new ArrayList<>();
        for (int i = 1; i <= 20; i++) {
            Long deckId = jdbcTemplate.queryForObject(
                    "INSERT INTO vocabulary_sets (user_id, name, description, created_at, updated_at) " +
                            "VALUES (?, ?, ?, NOW(), NOW()) RETURNING id",
                    Long.class,
                    userId,
                    "Perf Benchmark Deck " + i,
                    "Benchmark dataset deck " + i + " for LanguageLearning baseline profiling"
            );
            deckIds.add(deckId);
        }
        log.info("Created 20 benchmark decks");

        // 4. Batch insert 5,000 vocabularies (250 per deck)
        // Also prepare items and synonyms
        int totalVocabs = 5000;
        int vocabsPerDeck = 250;
        List<Long> vocabIds = new ArrayList<>(totalVocabs);

        // We insert vocabularies in batches of 1000
        int batchSize = 1000;
        for (int b = 0; b < totalVocabs; b += batchSize) {
            int end = Math.min(b + batchSize, totalVocabs);
            int count = end - b;

            List<Object[]> vocabBatch = new ArrayList<>(count);
            for (int i = b + 1; i <= end; i++) {
                vocabBatch.add(new Object[]{
                        "perf_word_" + i,
                        "Meaning for performance benchmark vocabulary " + i,
                        i % 2 == 0 ? "noun" : "verb",
                        "/pɜːf_wɜːd_" + i + "/",
                        "This is an example sentence for perf_word_" + i + ".",
                        "Paragraph context demonstrating perf_word_" + i + " in a real sentence."
                });
            }

            jdbcTemplate.batchUpdate(
                    "INSERT INTO vocabularies (word, meaning, word_type, pronunciation, example_sentence, example_paragraph, created_at, updated_at) " +
                            "VALUES (?, ?, ?, ?, ?, ?, NOW(), NOW())",
                    vocabBatch
            );
        }

        // Fetch inserted vocabulary IDs for perf_word_%
        vocabIds = jdbcTemplate.query(
                "SELECT id FROM vocabularies WHERE word LIKE 'perf_word_%' ORDER BY id ASC",
                (rs, rowNum) -> rs.getLong("id")
        );
        log.info("Inserted and retrieved {} vocabularies", vocabIds.size());

        // 5. Batch insert vocabulary_set_items (250 per deck)
        List<Object[]> setItemBatch = new ArrayList<>(vocabIds.size());
        for (int i = 0; i < vocabIds.size(); i++) {
            int deckIndex = Math.min(i / vocabsPerDeck, deckIds.size() - 1);
            Long dId = deckIds.get(deckIndex);
            Long vId = vocabIds.get(i);
            setItemBatch.add(new Object[]{dId, vId});
        }
        jdbcTemplate.batchUpdate(
                "INSERT INTO vocabulary_set_items (vocabulary_set_id, vocabulary_id) VALUES (?, ?) ON CONFLICT DO NOTHING",
                setItemBatch
        );
        log.info("Mapped vocabularies to 20 decks in vocabulary_set_items");

        // 6. Batch insert vocabulary_synonyms (~5,000 synonyms, 1-2 per word)
        List<Object[]> synonymBatch = new ArrayList<>(vocabIds.size());
        for (int i = 0; i < vocabIds.size(); i++) {
            Long vId = vocabIds.get(i);
            synonymBatch.add(new Object[]{vId, "syn_perf_" + (i + 1)});
        }
        jdbcTemplate.batchUpdate(
                "INSERT INTO vocabulary_synonyms (vocabulary_id, synonym) VALUES (?, ?) ON CONFLICT DO NOTHING",
                synonymBatch
        );
        log.info("Inserted synonyms for vocabularies");

        // 7. Batch insert study_progress: exactly 5,000 for perf user + 5,000 for a secondary dummy user to test multi-user scale (~10,000 total)
        // Ensure a second user exists for progress isolation
        Long secondUserId;
        List<Long> secondUserIds = jdbcTemplate.query(
                "SELECT id FROM users WHERE LOWER(email) = 'perf_noise@languagelearning.com'",
                (rs, rowNum) -> rs.getLong("id")
        );
        if (secondUserIds.isEmpty()) {
            secondUserId = jdbcTemplate.queryForObject(
                    "INSERT INTO users (email, password_hash, username, status) VALUES ('perf_noise@languagelearning.com', 'dummy', 'perf_noise', 'ACTIVE') RETURNING id",
                    Long.class
            );
        } else {
            secondUserId = secondUserIds.get(0);
        }

        Instant now = Instant.now();
        List<Object[]> progressBatch = new ArrayList<>(10000);

        // 5,000 for perf user
        for (int i = 0; i < vocabIds.size(); i++) {
            Long vId = vocabIds.get(i);
            int correct = (i % 5) + 1;
            int wrong = (i % 3);
            double accuracy = ((double) correct / (correct + wrong)) * 100.0;
            int reps = (i % 4);
            int interval = (i % 10) * 2 + 1;
            Instant nextReview = (i % 2 == 0)
                    ? now.minus(i % 5 + 1, ChronoUnit.DAYS)  // due
                    : now.plus(i % 10 + 1, ChronoUnit.DAYS); // future

            progressBatch.add(new Object[]{
                    userId, vId, correct, wrong, accuracy, 2, 50, 1,
                    interval, 2.50, reps, Timestamp.from(now), Timestamp.from(nextReview)
            });
        }

        // 5,000 for noise user
        for (int i = 0; i < vocabIds.size(); i++) {
            Long vId = vocabIds.get(i);
            progressBatch.add(new Object[]{
                    secondUserId, vId, 2, 1, 66.6, 1, 50, 1,
                    1, 2.50, 1, Timestamp.from(now), Timestamp.from(now.plus(3, ChronoUnit.DAYS))
            });
        }

        jdbcTemplate.batchUpdate(
                "INSERT INTO study_progress (user_id, vocabulary_id, correct_count, wrong_count, accuracy, current_streak, difficulty, memory_level, interval_days, ease_factor, repetitions, last_reviewed_at, next_review_at, created_at, updated_at) " +
                        "VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW()) ON CONFLICT (user_id, vocabulary_id) DO NOTHING",
                progressBatch
        );
        log.info("Inserted 10,000 study_progress records");

        // 8. Batch insert 2,000 study_sessions and study_answers for analytics baseline
        List<Object[]> sessionBatch = new ArrayList<>(2000);
        for (int s = 1; s <= 2000; s++) {
            Long deckId = deckIds.get(s % deckIds.size());
            Instant sStart = now.minus(s % 60 + 1, ChronoUnit.DAYS);
            Instant sEnd = sStart.plus(10, ChronoUnit.MINUTES);
            sessionBatch.add(new Object[]{
                    userId, deckId, "EN_TO_VI", Timestamp.from(sStart), Timestamp.from(sEnd), 10, 8, 2
            });
        }

        jdbcTemplate.batchUpdate(
                "INSERT INTO study_sessions (user_id, vocabulary_set_id, study_mode, started_at, completed_at, total_questions, correct_answers, wrong_answers) " +
                        "VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
                sessionBatch
        );

        List<Long> sessionIds = jdbcTemplate.query(
                "SELECT id FROM study_sessions WHERE user_id = ? ORDER BY id ASC LIMIT 2000",
                (rs, rowNum) -> rs.getLong("id"),
                userId
        );
        log.info("Inserted {} study_sessions", sessionIds.size());

        // Batch insert answers for each session (e.g. 5 answers per session = 10,000 answers)
        List<Object[]> answerBatch = new ArrayList<>(sessionIds.size() * 5);
        for (int i = 0; i < sessionIds.size(); i++) {
            Long sId = sessionIds.get(i);
            for (int a = 0; a < 5; a++) {
                Long vId = vocabIds.get((i * 5 + a) % vocabIds.size());
                boolean isCorrect = (a != 2);
                answerBatch.add(new Object[]{
                        sId, vId, "EN_TO_VI", "user_ans", isCorrect, Timestamp.from(now.minus(i % 60 + 1, ChronoUnit.DAYS))
                });
            }
        }
        jdbcTemplate.batchUpdate(
                "INSERT INTO study_answers (session_id, vocabulary_id, question_type, user_answer, is_correct, answered_at) " +
                        "VALUES (?, ?, ?, ?, ?, ?)",
                answerBatch
        );
        log.info("Inserted {} study_answers across sessions", answerBatch.size());

        // 9. Create 1 ACTIVE Study Plan containing 10 decks (sort_order 1..10)
        ensureActiveStudyPlan(userId);

        long elapsed = System.currentTimeMillis() - startTime;
        log.info("=== PerfDataSeeder completed in {} ms ===", elapsed);
    }

    private void ensureActiveStudyPlan(Long userId) {
        List<Long> planIds = jdbcTemplate.query(
                "SELECT id FROM study_plans WHERE user_id = ? AND status = 'ACTIVE'",
                (rs, rowNum) -> rs.getLong("id"),
                userId
        );

        if (planIds.isEmpty()) {
            LocalDate targetDate = LocalDate.now().plusDays(60);
            Long planId = jdbcTemplate.queryForObject(
                    "INSERT INTO study_plans (user_id, name, target_date, max_new_words_per_day, min_words_per_day, timezone, hard_gate_enabled, status, revision, created_at, updated_at) " +
                            "VALUES (?, 'Active Perf Study Plan', ?, 50, 5, 'Asia/Ho_Chi_Minh', false, 'ACTIVE', 1, NOW(), NOW()) RETURNING id",
                    Long.class,
                    userId,
                    targetDate
            );

            // Fetch deck IDs for user
            List<Long> userDeckIds = jdbcTemplate.query(
                    "SELECT id FROM vocabulary_sets WHERE user_id = ? ORDER BY id ASC LIMIT 10",
                    (rs, rowNum) -> rs.getLong("id"),
                    userId
            );

            // Add first 10 decks
            List<Object[]> planDeckBatch = new ArrayList<>(10);
            for (int d = 0; d < userDeckIds.size(); d++) {
                planDeckBatch.add(new Object[]{planId, userDeckIds.get(d), d + 1});
            }
            jdbcTemplate.batchUpdate(
                    "INSERT INTO study_plan_decks (study_plan_id, deck_id, sort_order, added_at) VALUES (?, ?, ?, NOW()) ON CONFLICT DO NOTHING",
                    planDeckBatch
            );
            log.info("Created ACTIVE study plan (id: {}) with 10 enrolled decks", planId);
        } else {
            log.info("ACTIVE study plan already exists with id: {}", planIds.get(0));
        }
    }
}
