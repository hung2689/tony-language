package com.languagelearning.backend.integration;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.languagelearning.backend.account.User;
import com.languagelearning.backend.account.UserRepository;
import com.languagelearning.backend.common.security.PerfDataSeeder;
import com.languagelearning.backend.common.security.SecurityTestUtils;
import com.languagelearning.backend.deck.dto.DeckUpdateRequest;
import com.languagelearning.backend.study.dto.AnswerBatchRequest;
import com.languagelearning.backend.study.dto.AnswerItemDto;
import com.languagelearning.backend.study.dto.CreateSessionRequest;
import com.languagelearning.backend.term.dto.TermCardDto;
import net.ttddyy.dsproxy.ExecutionInfo;
import net.ttddyy.dsproxy.QueryInfo;
import net.ttddyy.dsproxy.listener.MethodExecutionContext;
import net.ttddyy.dsproxy.listener.MethodExecutionListener;
import net.ttddyy.dsproxy.listener.QueryExecutionListener;
import net.ttddyy.dsproxy.support.ProxyDataSource;
import net.ttddyy.dsproxy.support.ProxyDataSourceBuilder;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.TestInstance;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.BeansException;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.config.BeanPostProcessor;
import org.springframework.boot.DefaultApplicationArguments;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.test.web.servlet.setup.SecurityMockMvcConfigurers;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.web.context.WebApplicationContext;

import javax.sql.DataSource;
import java.sql.ResultSet;
import java.util.*;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.concurrent.atomic.AtomicLong;
import java.util.stream.Collectors;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@ActiveProfiles("test")
@TestInstance(TestInstance.Lifecycle.PER_CLASS)
@Tag("perf")
@Import(PerfBaselineRunnerIntegrationTest.ProxyDataSourceTestConfig.class)
public class PerfBaselineRunnerIntegrationTest {

    private static final Logger log = LoggerFactory.getLogger(PerfBaselineRunnerIntegrationTest.class);

    public static class JdbcMetricsCollector implements QueryExecutionListener, MethodExecutionListener {
        private final AtomicInteger queryCount = new AtomicInteger();
        private final AtomicInteger batchCount = new AtomicInteger();
        private final AtomicInteger batchRows = new AtomicInteger();
        private final AtomicLong rowsRead = new AtomicLong();

        public void reset() {
            queryCount.set(0);
            batchCount.set(0);
            batchRows.set(0);
            rowsRead.set(0);
        }

        @Override
        public void beforeQuery(ExecutionInfo execInfo, List<QueryInfo> queryInfoList) {}

        @Override
        public void afterQuery(ExecutionInfo execInfo, List<QueryInfo> queryInfoList) {
            queryCount.incrementAndGet();
            if (execInfo.isBatch()) {
                batchCount.incrementAndGet();
                batchRows.addAndGet(execInfo.getBatchSize());
            }
        }

        @Override
        public void beforeMethod(MethodExecutionContext executionContext) {}

        @Override
        public void afterMethod(MethodExecutionContext executionContext) {
            if ("next".equals(executionContext.getMethod().getName())
                    && executionContext.getTarget() instanceof ResultSet
                    && Boolean.TRUE.equals(executionContext.getResult())) {
                rowsRead.incrementAndGet();
            }
        }

        public int getQueryCount() { return queryCount.get(); }
        public int getBatchCount() { return batchCount.get(); }
        public int getBatchRows() { return batchRows.get(); }
        public long getRowsRead() { return rowsRead.get(); }
    }

    public static final JdbcMetricsCollector METRICS_COLLECTOR = new JdbcMetricsCollector();

    @TestConfiguration
    public static class ProxyDataSourceTestConfig implements BeanPostProcessor {
        @Override
        public Object postProcessAfterInitialization(Object bean, String beanName) throws BeansException {
            if (bean instanceof DataSource ds && !(bean instanceof ProxyDataSource)) {
                log.info("Wrapping DataSource with ProxyDataSource for JDBC metrics tracking...");
                return ProxyDataSourceBuilder.create(ds)
                        .name("PerfProxyDS")
                        .listener(METRICS_COLLECTOR)
                        .methodListener(METRICS_COLLECTOR)
                        .proxyResultSet()
                        .build();
            }
            return bean;
        }
    }

    public record RunMetric(
            int queries,
            int batchCount,
            int batchRows,
            long rowsRead,
            long durationMs,
            long responseBytes
    ) {}

    public record BenchmarkResult(
            String apiName,
            RunMetric cold,
            RunMetric warmMedian,
            List<RunMetric> allRuns
    ) {}

    @Autowired
    private WebApplicationContext webApplicationContext;

    private MockMvc mockMvc;
    private final ObjectMapper objectMapper = new ObjectMapper();

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private JdbcTemplate jdbcTemplate;

    @Autowired
    private org.springframework.security.crypto.password.PasswordEncoder passwordEncoder;

    private User perfUser;
    private Long targetDeckId;
    private List<Long> deckVocabularyIds = new ArrayList<>();

    // Dedicated decks for PUT scenarios
    private Long updateDeckId;
    private List<Long> updateDeckVocabIds = new ArrayList<>();
    private Long addDeckId;
    private Long deleteDeckId;
    private Long deleteDeckKeptVocabId;

    @BeforeAll
    void setupBenchmarkData() {
        this.mockMvc = MockMvcBuilders
                .webAppContextSetup(webApplicationContext)
                .apply(SecurityMockMvcConfigurers.springSecurity())
                .build();

        log.info("Ensuring PerfDataSeeder runs on test database...");
        PerfDataSeeder seeder = new PerfDataSeeder(jdbcTemplate, passwordEncoder);
        seeder.run(new DefaultApplicationArguments());

        perfUser = userRepository.findByEmailIgnoreCase(PerfDataSeeder.PERF_USER_EMAIL)
                .orElseThrow(() -> new IllegalStateException("Perf user not found"));

        setAuth();

        // Fetch a target deck and 20 vocabularies for testing answers
        List<Long> deckIds = jdbcTemplate.query(
                "SELECT id FROM vocabulary_sets WHERE user_id = ? ORDER BY id ASC LIMIT 1",
                (rs, rowNum) -> rs.getLong("id"),
                perfUser.getId()
        );
        targetDeckId = deckIds.get(0);

        deckVocabularyIds = jdbcTemplate.query(
                "SELECT vocabulary_id FROM vocabulary_set_items WHERE vocabulary_set_id = ? LIMIT 20",
                (rs, rowNum) -> rs.getLong("vocabulary_id"),
                targetDeckId
        );

        // Setup dedicated decks for PUT benchmark scenarios
        setupPutScenarioDecks();
    }

    private void setupPutScenarioDecks() {
        // Deck A: For updating 500 existing cards
        updateDeckId = getOrCreateDeck("Perf Deck 500 - Update Existing");
        cleanupDeckCards(updateDeckId);
        updateDeckVocabIds = insertCardsIntoDeck(updateDeckId, 500, "bench_upd_");

        // Deck B: For adding 500 new cards
        addDeckId = getOrCreateDeck("Perf Deck 500 - Add New");
        cleanupDeckCards(addDeckId);

        // Deck C: For deleting 500 cards
        deleteDeckId = getOrCreateDeck("Perf Deck 500 - Delete");
        cleanupDeckCards(deleteDeckId);
        List<Long> keptList = insertCardsIntoDeck(deleteDeckId, 1, "bench_del_kept_");
        deleteDeckKeptVocabId = keptList.get(0);
    }

    private Long getOrCreateDeck(String name) {
        List<Long> ids = jdbcTemplate.query(
                "SELECT id FROM vocabulary_sets WHERE user_id = ? AND name = ?",
                (rs, rowNum) -> rs.getLong("id"),
                perfUser.getId(), name
        );
        if (!ids.isEmpty()) {
            return ids.get(0);
        }
        return jdbcTemplate.queryForObject(
                "INSERT INTO vocabulary_sets (name, description, user_id, created_at, updated_at) " +
                        "VALUES (?, 'Dedicated benchmark deck', ?, NOW(), NOW()) RETURNING id",
                Long.class, name, perfUser.getId()
        );
    }

    private void cleanupDeckCards(Long deckId) {
        List<Long> vIds = jdbcTemplate.query(
                "SELECT vocabulary_id FROM vocabulary_set_items WHERE vocabulary_set_id = ?",
                (rs, rowNum) -> rs.getLong("vocabulary_id"),
                deckId
        );
        if (!vIds.isEmpty()) {
            jdbcTemplate.update("DELETE FROM vocabulary_set_items WHERE vocabulary_set_id = ?", deckId);
            String placeholders = vIds.stream().map(id -> "?").collect(Collectors.joining(", "));
            jdbcTemplate.update(
                    "DELETE FROM vocabularies WHERE id IN (" + placeholders + ") " +
                            "AND NOT EXISTS (SELECT 1 FROM vocabulary_set_items WHERE vocabulary_id = vocabularies.id)",
                    vIds.toArray()
            );
        }
    }

    private List<Long> insertCardsIntoDeck(Long deckId, int count, String prefix) {
        StringBuilder vocabSql = new StringBuilder(
                "INSERT INTO vocabularies (word, meaning, word_type, pronunciation, example_sentence, created_at, updated_at) VALUES "
        );
        List<Object> params = new ArrayList<>();
        for (int i = 1; i <= count; i++) {
            if (i > 1) vocabSql.append(", ");
            vocabSql.append("(?, ?, 'noun', '/p/', 'example', NOW(), NOW())");
            params.add(prefix + i);
            params.add("Nghia cua tu " + prefix + i);
        }
        vocabSql.append(" RETURNING id");

        List<Long> vocabIds = jdbcTemplate.query(
                vocabSql.toString(),
                (rs, rowNum) -> rs.getLong("id"),
                params.toArray()
        );

        StringBuilder itemSql = new StringBuilder("INSERT INTO vocabulary_set_items (vocabulary_set_id, vocabulary_id) VALUES ");
        List<Object> itemParams = new ArrayList<>();
        for (int i = 0; i < vocabIds.size(); i++) {
            if (i > 0) itemSql.append(", ");
            itemSql.append("(?, ?)");
            itemParams.add(deckId);
            itemParams.add(vocabIds.get(i));
        }
        jdbcTemplate.update(itemSql.toString(), itemParams.toArray());

        StringBuilder synSql = new StringBuilder("INSERT INTO vocabulary_synonyms (vocabulary_id, synonym) VALUES ");
        List<Object> synParams = new ArrayList<>();
        for (int i = 0; i < vocabIds.size(); i++) {
            if (i > 0) synSql.append(", ");
            synSql.append("(?, ?)");
            synParams.add(vocabIds.get(i));
            synParams.add("syn_" + prefix + (i + 1));
        }
        jdbcTemplate.update(synSql.toString(), synParams.toArray());

        return vocabIds;
    }

    private void setAuth() {
        SecurityTestUtils.setAuthenticatedUser(
                perfUser.getId(),
                perfUser.getEmail(),
                perfUser.getUsername(),
                List.of("USER")
        );
    }

    @FunctionalInterface
    interface MeasuredAction {
        long execute() throws Exception;
    }

    private RunMetric measure(MeasuredAction action) throws Exception {
        setAuth();
        METRICS_COLLECTOR.reset();
        long startTime = System.nanoTime();

        long responseBytes = action.execute();

        long endTime = System.nanoTime();
        long durationMs = (endTime - startTime) / 1_000_000;
        int queries = METRICS_COLLECTOR.getQueryCount();
        int batchCount = METRICS_COLLECTOR.getBatchCount();
        int batchRows = METRICS_COLLECTOR.getBatchRows();
        long rowsRead = METRICS_COLLECTOR.getRowsRead();

        return new RunMetric(queries, batchCount, batchRows, rowsRead, durationMs, responseBytes);
    }

    @FunctionalInterface
    interface IterationMeasuredAction {
        long execute(int runIndex) throws Exception;
    }

    private BenchmarkResult executeBenchmark(String apiName, int totalRuns, IterationMeasuredAction action, java.util.function.IntConsumer beforeIteration) throws Exception {
        List<RunMetric> metrics = new ArrayList<>(totalRuns);

        for (int r = 0; r < totalRuns; r++) {
            if (beforeIteration != null) {
                beforeIteration.accept(r);
            }
            final int runIndex = r;
            metrics.add(measure(() -> action.execute(runIndex)));
        }

        RunMetric cold = metrics.get(0);
        List<RunMetric> warmRuns = metrics.subList(1, metrics.size());
        RunMetric warmMedian = calculateMedian(warmRuns);

        BenchmarkResult result = new BenchmarkResult(apiName, cold, warmMedian, metrics);
        printBenchmarkResult(result);
        return result;
    }

    private static RunMetric calculateMedian(List<RunMetric> list) {
        List<Integer> queries = list.stream().map(RunMetric::queries).sorted().toList();
        List<Integer> batchCounts = list.stream().map(RunMetric::batchCount).sorted().toList();
        List<Integer> batchRowsList = list.stream().map(RunMetric::batchRows).sorted().toList();
        List<Long> rowsReadList = list.stream().map(RunMetric::rowsRead).sorted().toList();
        List<Long> durations = list.stream().map(RunMetric::durationMs).sorted().toList();
        List<Long> responseBytesList = list.stream().map(RunMetric::responseBytes).sorted().toList();

        int mid = list.size() / 2;
        return new RunMetric(
                queries.get(mid),
                batchCounts.get(mid),
                batchRowsList.get(mid),
                rowsReadList.get(mid),
                durations.get(mid),
                responseBytesList.get(mid)
        );
    }

    private void printBenchmarkResult(BenchmarkResult res) {
        System.out.println("=========================================================================================");
        System.out.printf("API: %s%n", res.apiName());
        System.out.printf("  COLD (Run 1)   : %4d ms | %3d queries | Batch: %2d (%4d rows) | Rows read: %5d | Bytes: %6d%n",
                res.cold().durationMs(), res.cold().queries(), res.cold().batchCount(), res.cold().batchRows(),
                res.cold().rowsRead(), res.cold().responseBytes());
        System.out.printf("  WARM (Median 5): %4d ms | %3d queries | Batch: %2d (%4d rows) | Rows read: %5d | Bytes: %6d%n",
                res.warmMedian().durationMs(), res.warmMedian().queries(), res.warmMedian().batchCount(), res.warmMedian().batchRows(),
                res.warmMedian().rowsRead(), res.warmMedian().responseBytes());
        System.out.println("  Runs: " + res.allRuns().stream()
                .map(m -> m.durationMs() + "ms(" + m.queries() + "q," + m.rowsRead() + "r)")
                .collect(Collectors.joining(", ")));
        System.out.println("=========================================================================================");
    }

    @Test
    @DisplayName("Run comprehensive benchmark across all APIs with proxy metrics (Cold + 5 Warm runs)")
    void runBenchmarkAcrossAllApis() throws Exception {
        int totalRuns = 6; // 1 Cold + 5 Warm
        List<BenchmarkResult> results = new ArrayList<>();

        // 1. POST /api/study/sessions + POST /api/study/sessions/{id}/answers (Batch 20 answers)
        results.add(executeBenchmark(
                "POST /api/study/sessions + POST /answers (20)",
                totalRuns,
                (runIndex) -> {
                    CreateSessionRequest createReq = new CreateSessionRequest(targetDeckId, "EN_TO_VI", 20, "SEQUENTIAL");
                    MvcResult createRes = mockMvc.perform(post("/api/study/sessions")
                                    .contentType(MediaType.APPLICATION_JSON)
                                    .content(objectMapper.writeValueAsString(createReq)))
                            .andExpect(status().isCreated())
                            .andReturn();

                    Map<?, ?> resMap = objectMapper.readValue(createRes.getResponse().getContentAsString(), Map.class);
                    Map<?, ?> dataMap = (Map<?, ?>) resMap.get("data");
                    Long sessionId = ((Number) dataMap.get("id")).longValue();

                    List<AnswerItemDto> answers = new ArrayList<>();
                    for (Long vId : deckVocabularyIds) {
                        answers.add(new AnswerItemDto(
                                UUID.randomUUID().toString(),
                                vId,
                                "EN_TO_VI",
                                "CORRECT",
                                false,
                                "test",
                                1
                        ));
                    }
                    AnswerBatchRequest batchReq = new AnswerBatchRequest(answers);

                    MvcResult answerRes = mockMvc.perform(post("/api/study/sessions/" + sessionId + "/answers")
                                    .contentType(MediaType.APPLICATION_JSON)
                                    .content(objectMapper.writeValueAsString(batchReq)))
                            .andExpect(status().isOk())
                            .andReturn();

                    return createRes.getResponse().getContentAsByteArray().length + answerRes.getResponse().getContentAsByteArray().length;
                },
                (runIndex) -> {
                    // Reset study progress of test vocabularies before each run to prevent exponential SM-2 interval overflow
                    String placeholders = deckVocabularyIds.stream().map(id -> "?").collect(Collectors.joining(", "));
                    List<Object> params = new ArrayList<>();
                    params.add(perfUser.getId());
                    params.addAll(deckVocabularyIds);
                    jdbcTemplate.update(
                            "UPDATE study_progress SET repetitions = 1, interval_days = 1, ease_factor = 2.50, " +
                                    "next_review_at = NOW(), last_reviewed_at = NOW(), updated_at = NOW() " +
                                    "WHERE user_id = ? AND vocabulary_id IN (" + placeholders + ")",
                            params.toArray()
                    );
                }
        ));

        // 2. GET today-queue (/api/study-plans/current/today)
        results.add(executeBenchmark(
                "GET /api/study-plans/current/today",
                totalRuns,
                (runIndex) -> {
                    MvcResult res = mockMvc.perform(get("/api/study-plans/current/today"))
                            .andExpect(status().isOk())
                            .andReturn();
                    return res.getResponse().getContentAsByteArray().length;
                },
                null
        ));

        // 3. GET current plan (/api/study-plans/current)
        results.add(executeBenchmark(
                "GET /api/study-plans/current",
                totalRuns,
                (runIndex) -> {
                    MvcResult res = mockMvc.perform(get("/api/study-plans/current"))
                            .andExpect(status().isOk())
                            .andReturn();
                    return res.getResponse().getContentAsByteArray().length;
                },
                null
        ));

        // 4. GET /api/analytics/overview
        results.add(executeBenchmark(
                "GET /api/analytics/overview",
                totalRuns,
                (runIndex) -> {
                    MvcResult res = mockMvc.perform(get("/api/analytics/overview"))
                            .andExpect(status().isOk())
                            .andReturn();
                    return res.getResponse().getContentAsByteArray().length;
                },
                null
        ));

        // 5. GET /api/analytics/weak-words?limit=10
        results.add(executeBenchmark(
                "GET /api/analytics/weak-words?limit=10",
                totalRuns,
                (runIndex) -> {
                    MvcResult res = mockMvc.perform(get("/api/analytics/weak-words?limit=10"))
                            .andExpect(status().isOk())
                            .andReturn();
                    return res.getResponse().getContentAsByteArray().length;
                },
                null
        ));

        // 6. GET /api/analytics/retention
        results.add(executeBenchmark(
                "GET /api/analytics/retention",
                totalRuns,
                (runIndex) -> {
                    MvcResult res = mockMvc.perform(get("/api/analytics/retention"))
                            .andExpect(status().isOk())
                            .andReturn();
                    return res.getResponse().getContentAsByteArray().length;
                },
                null
        ));

        // 7. GET /api/analytics/heatmap
        results.add(executeBenchmark(
                "GET /api/analytics/heatmap",
                totalRuns,
                (runIndex) -> {
                    MvcResult res = mockMvc.perform(get("/api/analytics/heatmap"))
                            .andExpect(status().isOk())
                            .andReturn();
                    return res.getResponse().getContentAsByteArray().length;
                },
                null
        ));

        // 8. GET Analytics Suite (overview + weak-words + retention + heatmap)
        results.add(executeBenchmark(
                "GET Analytics Suite (overview+weak+retention+heatmap)",
                totalRuns,
                (runIndex) -> {
                    long bytes = 0;
                    bytes += mockMvc.perform(get("/api/analytics/overview")).andExpect(status().isOk()).andReturn().getResponse().getContentAsByteArray().length;
                    bytes += mockMvc.perform(get("/api/analytics/weak-words?limit=10")).andExpect(status().isOk()).andReturn().getResponse().getContentAsByteArray().length;
                    bytes += mockMvc.perform(get("/api/analytics/retention")).andExpect(status().isOk()).andReturn().getResponse().getContentAsByteArray().length;
                    bytes += mockMvc.perform(get("/api/analytics/heatmap")).andExpect(status().isOk()).andReturn().getResponse().getContentAsByteArray().length;
                    return bytes;
                },
                null
        ));

        // 9. PUT /api/decks/{id} Scenario A: Sửa 500 thẻ có sẵn (cards kèm ID của thẻ hiện có)
        results.add(executeBenchmark(
                "PUT /api/decks/{id} (a: Sửa 500 thẻ có sẵn)",
                totalRuns,
                (runIndex) -> {
                    List<TermCardDto> updateCards = new ArrayList<>(500);
                    for (int i = 0; i < updateDeckVocabIds.size(); i++) {
                        Long vId = updateDeckVocabIds.get(i);
                        updateCards.add(new TermCardDto(
                                vId,
                                "bench_upd_" + (i + 1),
                                "Nghĩa đã sửa r" + runIndex + " cho từ benchmark " + (i + 1),
                                "/p/",
                                "noun",
                                "Ví dụ câu sửa " + (i + 1),
                                List.of("syn_upd_" + (i + 1) + "_r" + runIndex)
                        ));
                    }
                    DeckUpdateRequest updateDeckRequest = new DeckUpdateRequest("Updated Perf Deck 500 (A)", "Updated description", null, updateCards);
                    String updatePayload = objectMapper.writeValueAsString(updateDeckRequest);

                    MvcResult res = mockMvc.perform(put("/api/decks/" + updateDeckId)
                                    .contentType(MediaType.APPLICATION_JSON)
                                    .content(updatePayload))
                            .andExpect(status().isOk())
                            .andReturn();
                    return res.getResponse().getContentAsByteArray().length;
                },
                null
        ));

        // 10. PUT /api/decks/{id} Scenario B: Thêm 500 thẻ mới (id = null)
        results.add(executeBenchmark(
                "PUT /api/decks/{id} (b: Thêm 500 thẻ mới)",
                totalRuns,
                (runIndex) -> {
                    List<TermCardDto> addCards = new ArrayList<>(500);
                    for (int i = 1; i <= 500; i++) {
                        addCards.add(new TermCardDto(
                                null,
                                "bench_new_" + i,
                                "Nghĩa từ mới benchmark " + i,
                                "/p/",
                                "noun",
                                "Ví dụ câu mới " + i,
                                List.of("syn_new_" + i)
                        ));
                    }
                    DeckUpdateRequest addDeckRequest = new DeckUpdateRequest("Updated Perf Deck 500 (B)", "Added description", null, addCards);
                    String addPayload = objectMapper.writeValueAsString(addDeckRequest);

                    MvcResult res = mockMvc.perform(put("/api/decks/" + addDeckId)
                                    .contentType(MediaType.APPLICATION_JSON)
                                    .content(addPayload))
                            .andExpect(status().isOk())
                            .andReturn();
                    return res.getResponse().getContentAsByteArray().length;
                },
                (runIndex) -> cleanupDeckCards(addDeckId) // Reset to 0 cards before each iteration
        ));

        // 11. PUT /api/decks/{id} Scenario C: Xóa 500 thẻ (gửi 1 thẻ giữ lại, 500 thẻ bị xóa)
        results.add(executeBenchmark(
                "PUT /api/decks/{id} (c: Xóa 500 thẻ)",
                totalRuns,
                (runIndex) -> {
                    List<TermCardDto> keptOnlyCard = List.of(new TermCardDto(
                            deleteDeckKeptVocabId,
                            "bench_del_kept_1",
                            "Nghĩa của từ giữ lại r" + runIndex,
                            "/p/",
                            "noun",
                            "Ví dụ giữ lại",
                            List.of("syn_kept_r" + runIndex)
                    ));
                    DeckUpdateRequest deleteDeckRequest = new DeckUpdateRequest("Updated Perf Deck 500 (C)", "Deleted description", null, keptOnlyCard);
                    String deletePayload = objectMapper.writeValueAsString(deleteDeckRequest);

                    MvcResult res = mockMvc.perform(put("/api/decks/" + deleteDeckId)
                                    .contentType(MediaType.APPLICATION_JSON)
                                    .content(deletePayload))
                            .andExpect(status().isOk())
                            .andReturn();
                    return res.getResponse().getContentAsByteArray().length;
                },
                (runIndex) -> {
                    // Before each iteration, remove any leftover temp cards and insert 500 fresh temp cards
                    List<Long> tempIds = jdbcTemplate.query(
                            "SELECT vocabulary_id FROM vocabulary_set_items WHERE vocabulary_set_id = ? AND vocabulary_id <> ?",
                            (rs, rowNum) -> rs.getLong("vocabulary_id"),
                            deleteDeckId, deleteDeckKeptVocabId
                    );
                    if (!tempIds.isEmpty()) {
                        jdbcTemplate.update(
                                "DELETE FROM vocabulary_set_items WHERE vocabulary_set_id = ? AND vocabulary_id <> ?",
                                deleteDeckId, deleteDeckKeptVocabId
                        );
                        String placeholders = tempIds.stream().map(id -> "?").collect(Collectors.joining(", "));
                        jdbcTemplate.update(
                                "DELETE FROM vocabularies WHERE id IN (" + placeholders + ") " +
                                        "AND NOT EXISTS (SELECT 1 FROM vocabulary_set_items WHERE vocabulary_id = vocabularies.id)",
                                tempIds.toArray()
                        );
                    }
                    // Add 500 temp cards
                    insertCardsIntoDeck(deleteDeckId, 500, "bench_temp_del_r" + runIndex + "_");
                }
        ));

        // 12. GET /api/decks (List decks)
        results.add(executeBenchmark(
                "GET /api/decks",
                totalRuns,
                (runIndex) -> {
                    MvcResult res = mockMvc.perform(get("/api/decks"))
                            .andExpect(status().isOk())
                            .andReturn();
                    return res.getResponse().getContentAsByteArray().length;
                },
                null
        ));

        // Print final markdown summary
        System.out.println("\n\n========================= FULL BENCHMARK SUMMARY =========================");
        System.out.println("| API Endpoint | COLD (ms/q/batch/rows/bytes) | WARM Median (ms/q/batch/rows/bytes) |");
        System.out.println("| :--- | :---: | :---: |");
        for (BenchmarkResult r : results) {
            System.out.printf("| %s | %d ms / %d q / b:%d(%d) / r:%d / %d B | %d ms / %d q / b:%d(%d) / r:%d / %d B |%n",
                    r.apiName(),
                    r.cold().durationMs(), r.cold().queries(), r.cold().batchCount(), r.cold().batchRows(), r.cold().rowsRead(), r.cold().responseBytes(),
                    r.warmMedian().durationMs(), r.warmMedian().queries(), r.warmMedian().batchCount(), r.warmMedian().batchRows(), r.warmMedian().rowsRead(), r.warmMedian().responseBytes()
            );
        }
        System.out.println("==========================================================================\n");
    }
}
