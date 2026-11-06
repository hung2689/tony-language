package com.languagelearning.backend.integration;

import com.languagelearning.backend.account.User;
import com.languagelearning.backend.account.UserRepository;
import com.languagelearning.backend.common.security.PerfDataSeeder;
import com.languagelearning.backend.study.repository.Sm2SqlConstants;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.ActiveProfiles;

import java.sql.Timestamp;
import java.time.Instant;
import java.util.*;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@SpringBootTest
@ActiveProfiles("test")
public class ExplainPlanIntegrationTest {

    @Autowired
    private JdbcTemplate jdbcTemplate;

    @Autowired
    private UserRepository userRepository;

    public static class QueryMetric {
        public double planningTimeMs;
        public double executionTimeMs;
        public long sharedHit;
        public long sharedRead;
        public String planSummary;

        @Override
        public String toString() {
            return String.format("Exec: %.3f ms, Plan: %.3f ms, Buffers(hit=%d, read=%d)",
                    executionTimeMs, planningTimeMs, sharedHit, sharedRead);
        }
    }

    private QueryMetric parseExplainBuffers(List<String> lines) {
        QueryMetric m = new QueryMetric();
        Pattern planPattern = Pattern.compile("Planning Time:\\s+([0-9.]+)\\s+ms");
        Pattern execPattern = Pattern.compile("Execution Time:\\s+([0-9.]+)\\s+ms");
        Pattern hitPattern = Pattern.compile("shared hit=([0-9]+)");
        Pattern readPattern = Pattern.compile("read=([0-9]+)");

        long totalHit = 0;
        long totalRead = 0;
        StringBuilder planSb = new StringBuilder();

        for (String line : lines) {
            planSb.append(line).append("\n");
            Matcher mPlan = planPattern.matcher(line);
            if (mPlan.find()) {
                m.planningTimeMs = Double.parseDouble(mPlan.group(1));
            }
            Matcher mExec = execPattern.matcher(line);
            if (mExec.find()) {
                m.executionTimeMs = Double.parseDouble(mExec.group(1));
            }
            Matcher mHit = hitPattern.matcher(line);
            while (mHit.find()) {
                totalHit += Long.parseLong(mHit.group(1));
            }
            Matcher mRead = readPattern.matcher(line);
            while (mRead.find()) {
                totalRead += Long.parseLong(mRead.group(1));
            }
        }
        m.sharedHit = totalHit;
        m.sharedRead = totalRead;
        m.planSummary = planSb.toString();
        return m;
    }

    private QueryMetric benchmarkExplain(String name, String explainSql, Object... params) {
        // 1 warmup run
        List<String> warmupLines = jdbcTemplate.query(explainSql, (rs, rowNum) -> rs.getString(1), params);
        parseExplainBuffers(warmupLines);

        // 5 benchmark runs
        List<QueryMetric> runs = new ArrayList<>();
        for (int i = 0; i < 5; i++) {
            List<String> lines = jdbcTemplate.query(explainSql, (rs, rowNum) -> rs.getString(1), params);
            runs.add(parseExplainBuffers(lines));
        }

        // Compute medians
        runs.sort(Comparator.comparingDouble(r -> r.executionTimeMs));
        QueryMetric median = runs.get(2); // index 2 of 5 is median

        List<Double> planTimes = runs.stream().map(r -> r.planningTimeMs).sorted().toList();
        median.planningTimeMs = planTimes.get(2);

        List<Long> hits = runs.stream().map(r -> r.sharedHit).sorted().toList();
        median.sharedHit = hits.get(2);

        List<Long> reads = runs.stream().map(r -> r.sharedRead).sorted().toList();
        median.sharedRead = reads.get(2);

        System.out.printf(">>> [%s] MEDIAN (5 runs): Exec = %.3f ms | Plan = %.3f ms | Buffers: shared hit=%d, read=%d%n",
                name, median.executionTimeMs, median.planningTimeMs, median.sharedHit, median.sharedRead);
        for (int i = 0; i < 5; i++) {
            System.out.printf("    Run %d: exec=%.3f ms, plan=%.3f ms, hit=%d%n",
                    i + 1, runs.get(i).executionTimeMs, runs.get(i).planningTimeMs, runs.get(i).sharedHit);
        }
        return median;
    }

    @Test
    @DisplayName("Chạy benchmark EXPLAIN (ANALYZE, BUFFERS) 1 warmup + 5 lần đo cho Trước V10 vs Sau V10")
    void runBenchmarkExplainBeforeAndAfterV10() {
        User perfUser = userRepository.findByEmailIgnoreCase(PerfDataSeeder.PERF_USER_EMAIL)
                .orElseThrow(() -> new IllegalStateException("Perf user not found"));
        Long userId = perfUser.getId();

        Long planId = jdbcTemplate.queryForObject(
                "SELECT id FROM study_plans WHERE user_id = ? AND status = 'ACTIVE' LIMIT 1",
                Long.class,
                userId
        );

        System.out.println("=========================================================================");
        System.out.println("BENCHMARK EXPLAIN (ANALYZE, BUFFERS): TARGET PLAN ID " + planId + ", USER ID " + userId);
        System.out.println("=========================================================================");

        // ── 1. LIST_DECKS ─────────────────────────────────────────────────────────
        String listDecksSql = "EXPLAIN (ANALYZE, BUFFERS) " +
                "SELECT id, name, user_id, folder_id, created_at, updated_at " +
                "FROM vocabulary_sets " +
                "WHERE user_id = ? " +
                "ORDER BY created_at DESC";

        // Trước V10: Không có index idx_vocabulary_sets_user_created
        jdbcTemplate.execute("DROP INDEX IF EXISTS idx_vocabulary_sets_user_created");
        QueryMetric listDecksBefore = benchmarkExplain("LIST_DECKS (TRƯỚC V10 - Không index created_at DESC)", listDecksSql, userId);

        // Sau V10: Có index idx_vocabulary_sets_user_created
        jdbcTemplate.execute("CREATE INDEX IF NOT EXISTS idx_vocabulary_sets_user_created ON vocabulary_sets(user_id, created_at DESC)");
        QueryMetric listDecksAfter = benchmarkExplain("LIST_DECKS (SAU V10 - Có index idx_vocabulary_sets_user_created)", listDecksSql, userId);

        // ── 2. DECK_STATS ─────────────────────────────────────────────────────────
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

        // DECK_STATS không phụ thuộc vào index V10 nào (các index đã có từ V9 hoặc trước)
        QueryMetric deckStatsBefore = benchmarkExplain("DECK_STATS (TRƯỚC V10 / V9)", deckStatsSql, userId, planId);
        QueryMetric deckStatsAfter = benchmarkExplain("DECK_STATS (SAU V10)", deckStatsSql, userId, planId);

        // ── 3. PLAN_AGGREGATE ─────────────────────────────────────────────────────
        String planAggregateBeforeSql = "EXPLAIN (ANALYZE, BUFFERS) " +
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

        String planAggregateAfterSql = "EXPLAIN (ANALYZE, BUFFERS) " +
                "WITH plan_words AS ( " +
                "  SELECT MIN(v.id) AS vocabulary_id " +
                "  FROM study_plan_decks spd " +
                "  JOIN vocabulary_set_items vsi ON vsi.vocabulary_set_id = spd.deck_id " +
                "  JOIN vocabularies v ON v.id = vsi.vocabulary_id " +
                "  WHERE spd.study_plan_id = ? " +
                "  GROUP BY v.word_norm " +
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

        QueryMetric planAggBefore = benchmarkExplain("PLAN_AGGREGATE (TRƯỚC V10 - Biểu thức LOWER(BTRIM))", planAggregateBeforeSql, planId, Timestamp.from(Instant.now()), userId);
        QueryMetric planAggAfter = benchmarkExplain("PLAN_AGGREGATE (SAU V10 - Cột sinh v.word_norm)", planAggregateAfterSql, planId, Timestamp.from(Instant.now()), userId);

        System.out.println("\n=========================================================================");
        System.out.println("TỔNG HỢP KẾT QUẢ SO SÁNH TRUNG VỊ (5 LẦN CHẠY) TRƯỚC V10 VS SAU V10");
        System.out.println("=========================================================================");
        System.out.printf("| Query | Giai đoạn | Planning Time (ms) | Execution Time (ms) | Buffers Hit | Buffers Read |%n");
        System.out.printf("| LIST_DECKS | Trước V10 | %.3f | %.3f | %d | %d |%n", listDecksBefore.planningTimeMs, listDecksBefore.executionTimeMs, listDecksBefore.sharedHit, listDecksBefore.sharedRead);
        System.out.printf("| LIST_DECKS | Sau V10   | %.3f | %.3f | %d | %d |%n", listDecksAfter.planningTimeMs, listDecksAfter.executionTimeMs, listDecksAfter.sharedHit, listDecksAfter.sharedRead);
        System.out.printf("| DECK_STATS | Trước V10 | %.3f | %.3f | %d | %d |%n", deckStatsBefore.planningTimeMs, deckStatsBefore.executionTimeMs, deckStatsBefore.sharedHit, deckStatsBefore.sharedRead);
        System.out.printf("| DECK_STATS | Sau V10   | %.3f | %.3f | %d | %d |%n", deckStatsAfter.planningTimeMs, deckStatsAfter.executionTimeMs, deckStatsAfter.sharedHit, deckStatsAfter.sharedRead);
        System.out.printf("| PLAN_AGGREGATE | Trước V10 | %.3f | %.3f | %d | %d |%n", planAggBefore.planningTimeMs, planAggBefore.executionTimeMs, planAggBefore.sharedHit, planAggBefore.sharedRead);
        System.out.printf("| PLAN_AGGREGATE | Sau V10   | %.3f | %.3f | %d | %d |%n", planAggAfter.planningTimeMs, planAggAfter.executionTimeMs, planAggAfter.sharedHit, planAggAfter.sharedRead);
        System.out.println("=========================================================================");
    }
}
