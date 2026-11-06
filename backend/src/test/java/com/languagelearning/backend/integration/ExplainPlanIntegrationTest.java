package com.languagelearning.backend.integration;

import com.languagelearning.backend.account.User;
import com.languagelearning.backend.account.UserRepository;
import com.languagelearning.backend.common.security.PerfDataSeeder;
import com.languagelearning.backend.study.repository.Sm2SqlConstants;
import com.languagelearning.backend.study.repository.StudyPlanSql;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.ActiveProfiles;

import java.sql.Timestamp;
import java.time.Instant;
import java.util.List;

@SpringBootTest
@ActiveProfiles("test")
public class ExplainPlanIntegrationTest {

    @Autowired
    private JdbcTemplate jdbcTemplate;

    @Autowired
    private UserRepository userRepository;

    @Test
    @DisplayName("Run EXPLAIN (ANALYZE, BUFFERS) on DECK_STATS, PLAN_AGGREGATE, and LIST_DECKS")
    void runExplainOnKeyQueries() {
        User perfUser = userRepository.findByEmailIgnoreCase(PerfDataSeeder.PERF_USER_EMAIL)
                .orElseThrow(() -> new IllegalStateException("Perf user not found"));
        Long userId = perfUser.getId();

        Long planId = jdbcTemplate.queryForObject(
                "SELECT id FROM study_plans WHERE user_id = ? AND status = 'ACTIVE' LIMIT 1",
                Long.class,
                userId
        );

        System.out.println("=========================================================================");
        System.out.println("EXPLAIN (ANALYZE, BUFFERS) - TARGET PLAN ID: " + planId + ", USER ID: " + userId);
        System.out.println("=========================================================================");

        // 1. LIST_DECKS
        String listDecksSql = "EXPLAIN (ANALYZE, BUFFERS) " +
                "SELECT id, name, user_id, folder_id, created_at, updated_at " +
                "FROM vocabulary_sets " +
                "WHERE user_id = ? " +
                "ORDER BY created_at DESC";
        runAndPrintExplain("1. LIST_DECKS", listDecksSql, userId);

        // 2. DECK_STATS
        String deckStatsSql = "EXPLAIN (ANALYZE, BUFFERS) " +
                "SELECT vs.id AS \"deckId\", vs.name AS \"name\", spd.sort_order AS \"sortOrder\", " +
                "COUNT(vsi.vocabulary_id)::int AS \"cardCount\", " +
                "COUNT(vsi.vocabulary_id) FILTER (WHERE " + Sm2SqlConstants.SQL_IS_MASTERED + ")::int AS \"masteredCount\" " +
                "FROM study_plan_decks spd " +
                "JOIN vocabulary_sets vs ON vs.id = spd.deck_id " +
                "LEFT JOIN vocabulary_set_items vsi ON vsi.vocabulary_set_id = vs.id " +
                "LEFT JOIN study_progress sp ON sp.vocabulary_id = vsi.vocabulary_id AND sp.user_id = ? " +
                "WHERE spd.study_plan_id = ? " +
                "GROUP BY vs.id, vs.name, spd.id, spd.sort_order " +
                "ORDER BY spd.sort_order ASC, spd.id ASC";
        runAndPrintExplain("2. DECK_STATS", deckStatsSql, userId, planId);

        // 3. PLAN_AGGREGATE
        String planAggregateSql = "EXPLAIN (ANALYZE, BUFFERS) " +
                "WITH plan_words AS ( " +
                "  SELECT MIN(v.id) AS vocabulary_id " +
                "  FROM study_plan_decks spd " +
                "  JOIN vocabulary_set_items vsi ON vsi.vocabulary_set_id = spd.deck_id " +
                "  JOIN vocabularies v ON v.id = vsi.vocabulary_id " +
                "  WHERE spd.study_plan_id = ? " +
                "  GROUP BY LOWER(BTRIM(v.word, E' \\t\\n\\r')) " +
                "), " +
                "word_states AS ( " +
                "  SELECT pw.vocabulary_id, " +
                "         (NOT " + Sm2SqlConstants.SQL_IS_STUDIED + ") AS is_new, " +
                "         " + Sm2SqlConstants.SQL_IS_MASTERED + " AS is_mastered, " +
                "         (sp.next_review_at IS NOT NULL AND sp.next_review_at < ?) AS is_due, " +
                "         " + Sm2SqlConstants.SQL_IS_WEAK + " AS is_weak " +
                "  FROM plan_words pw " +
                "  LEFT JOIN study_progress sp ON sp.vocabulary_id = pw.vocabulary_id AND sp.user_id = ? " +
                ") " +
                "SELECT COUNT(*)::int AS \"totalWords\", " +
                "       COUNT(*) FILTER (WHERE is_mastered)::int AS \"masteredWords\", " +
                "       COUNT(*) FILTER (WHERE NOT is_new AND NOT is_mastered)::int AS \"learningWords\", " +
                "       COUNT(*) FILTER (WHERE is_new)::int AS \"unstudiedNewWords\", " +
                "       COUNT(*) FILTER (WHERE NOT is_new AND is_due)::int AS \"dueCount\", " +
                "       COUNT(*) FILTER (WHERE NOT is_new AND NOT is_due AND is_weak)::int AS \"weakCount\" " +
                "FROM word_states";
        runAndPrintExplain("3. PLAN_AGGREGATE", planAggregateSql, planId, Timestamp.from(Instant.now()), userId);
    }

    private void runAndPrintExplain(String label, String sql, Object... params) {
        System.out.println("\n-------------------------------------------------------------------------");
        System.out.println("QUERY: " + label);
        System.out.println("-------------------------------------------------------------------------");
        List<String> lines = jdbcTemplate.query(sql, (rs, rowNum) -> rs.getString(1), params);
        for (String line : lines) {
            System.out.println(line);
        }
    }
}
