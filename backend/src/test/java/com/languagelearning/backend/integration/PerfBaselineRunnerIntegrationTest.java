package com.languagelearning.backend.integration;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.languagelearning.backend.account.User;
import com.languagelearning.backend.account.UserRepository;
import com.languagelearning.backend.analytics.service.AnalyticsService;
import com.languagelearning.backend.common.dto.ApiResponse;
import com.languagelearning.backend.common.security.PerfDataSeeder;
import com.languagelearning.backend.common.security.SecurityTestUtils;
import com.languagelearning.backend.deck.dto.DeckUpdateRequest;
import com.languagelearning.backend.study.dto.AnswerBatchRequest;
import com.languagelearning.backend.study.dto.AnswerItemDto;
import com.languagelearning.backend.study.dto.CreateSessionRequest;
import com.languagelearning.backend.study.dto.TodayStudyQueueResponse;
import com.languagelearning.backend.study.service.StudyPlanService;
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
            long responseBytes,
            long gzipBytes
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
    private final ObjectMapper objectMapper = createObjectMapper();

    private static ObjectMapper createObjectMapper() {
        ObjectMapper mapper = new ObjectMapper();
        com.fasterxml.jackson.databind.module.SimpleModule module = new com.fasterxml.jackson.databind.module.SimpleModule();
        module.addSerializer(java.time.LocalDate.class, new com.fasterxml.jackson.databind.JsonSerializer<java.time.LocalDate>() {
            @Override
            public void serialize(java.time.LocalDate value, com.fasterxml.jackson.core.JsonGenerator gen, com.fasterxml.jackson.databind.SerializerProvider serializers) throws java.io.IOException {
                gen.writeString(value.toString());
            }
        });
        module.addSerializer(java.time.Instant.class, new com.fasterxml.jackson.databind.JsonSerializer<java.time.Instant>() {
            @Override
            public void serialize(java.time.Instant value, com.fasterxml.jackson.core.JsonGenerator gen, com.fasterxml.jackson.databind.SerializerProvider serializers) throws java.io.IOException {
                gen.writeString(value.toString());
            }
        });
        mapper.registerModule(module);
        return mapper;
    }

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private JdbcTemplate jdbcTemplate;

    @Autowired
    private org.springframework.security.crypto.password.PasswordEncoder passwordEncoder;

    @Autowired
    private StudyPlanService studyPlanService;

    @Autowired
    private AnalyticsService analyticsService;

    private User perfUser;
    private Long targetDeckId;
    private List<Long> deckVocabularyIds = new ArrayList<>();
    private List<Long> deckVocabularyIds100 = new ArrayList<>();

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
    }

    private void printDatabaseRowCounts() {
        long vocabs = jdbcTemplate.queryForObject("SELECT count(*) FROM vocabularies", Long.class);
        long sets = jdbcTemplate.queryForObject("SELECT count(*) FROM vocabulary_sets", Long.class);
        long progress = jdbcTemplate.queryForObject("SELECT count(*) FROM study_progress", Long.class);
        long sessions = jdbcTemplate.queryForObject("SELECT count(*) FROM study_sessions", Long.class);
        long answers = jdbcTemplate.queryForObject("SELECT count(*) FROM study_answers", Long.class);

        System.out.println("=========================================================================");
        System.out.println("BENCHMARK BASELINE - INITIAL DATABASE ROW COUNTS (VERIFICATION):");
        System.out.printf("  1. vocabularies       : %,d rows (5,000 seeder baseline + 501 dedicated PUT benchmark cards)%n", vocabs);
        System.out.printf("  2. vocabulary_sets    : %,d rows (20 seeder baseline + 3 dedicated PUT benchmark decks)%n", sets);
        System.out.printf("  3. study_progress     : %,d rows%n", progress);
        System.out.printf("  4. study_sessions     : %,d rows%n", sessions);
        System.out.printf("  5. study_answers      : %,d rows%n", answers);
        System.out.println("=========================================================================");
    }

    private void resetDatabase() {
        jdbcTemplate.execute(
                "TRUNCATE TABLE study_answers, study_sessions, study_progress, " +
                "study_plan_decks, study_plans, vocabulary_synonyms, vocabulary_set_items, " +
                "vocabularies, vocabulary_sets, folders, xp_events, user_xp, " +
                "synonym_challenge_history, user_wallpapers CASCADE"
        );
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

        deckVocabularyIds100 = jdbcTemplate.query(
                "SELECT vocabulary_id FROM vocabulary_set_items WHERE vocabulary_set_id = ? LIMIT 100",
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
                "INSERT INTO vocabulary_sets (user_id, name, description, created_at, updated_at) VALUES (?, ?, ?, NOW(), NOW()) RETURNING id",
                Long.class,
                perfUser.getId(), name, "Dedicated benchmark deck"
        );
    }

    private void cleanupDeckCards(Long deckId) {
        List<Long> oldVocabIds = jdbcTemplate.query(
                "SELECT vocabulary_id FROM vocabulary_set_items WHERE vocabulary_set_id = ?",
                (rs, rowNum) -> rs.getLong("vocabulary_id"),
                deckId
        );
        if (!oldVocabIds.isEmpty()) {
            jdbcTemplate.update("DELETE FROM vocabulary_set_items WHERE vocabulary_set_id = ?", deckId);
            String placeholders = oldVocabIds.stream().map(id -> "?").collect(Collectors.joining(", "));
            jdbcTemplate.update("DELETE FROM vocabularies WHERE id IN (" + placeholders + ")", oldVocabIds.toArray());
        }
    }

    private List<Long> insertCardsIntoDeck(Long deckId, int count, String prefix) {
        StringBuilder sql = new StringBuilder("INSERT INTO vocabularies (word, meaning, word_type, pronunciation, example_sentence, created_at, updated_at) VALUES ");
        List<Object> params = new ArrayList<>();
        for (int i = 1; i <= count; i++) {
            if (i > 1) sql.append(", ");
            sql.append("(?, ?, 'noun', '/p/', 'example', NOW(), NOW())");
            params.add(prefix + i);
            params.add("Nghia cua tu " + prefix + i);
        }
        sql.append(" RETURNING id");

        List<Long> vocabIds = jdbcTemplate.query(
                sql.toString(),
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

    public record ActionResponse(long rawBytes, long gzipBytes) {
        public static ActionResponse of(byte[] raw) {
            long rawLen = raw != null ? raw.length : 0;
            long gzipLen = computeGzipSize(raw);
            return new ActionResponse(rawLen, gzipLen);
        }
        public static ActionResponse ofBytes(long rawBytes) {
            return new ActionResponse(rawBytes, 0);
        }
    }

    public static long computeGzipSize(byte[] rawBytes) {
        if (rawBytes == null || rawBytes.length == 0) return 0;
        try {
            java.io.ByteArrayOutputStream baos = new java.io.ByteArrayOutputStream();
            try (java.util.zip.GZIPOutputStream gzos = new java.util.zip.GZIPOutputStream(baos)) {
                gzos.write(rawBytes);
            }
            return baos.toByteArray().length;
        } catch (Exception e) {
            return rawBytes.length;
        }
    }

    @FunctionalInterface
    interface MeasuredAction {
        ActionResponse execute() throws Exception;
    }

    private RunMetric measure(MeasuredAction action) throws Exception {
        setAuth();
        METRICS_COLLECTOR.reset();
        long startTime = System.nanoTime();

        ActionResponse response = action.execute();

        long endTime = System.nanoTime();
        long durationMs = (endTime - startTime) / 1_000_000;
        int queries = METRICS_COLLECTOR.getQueryCount();
        int batchCount = METRICS_COLLECTOR.getBatchCount();
        int batchRows = METRICS_COLLECTOR.getBatchRows();
        long rowsRead = METRICS_COLLECTOR.getRowsRead();

        return new RunMetric(queries, batchCount, batchRows, rowsRead, durationMs, response.rawBytes(), response.gzipBytes());
    }

    @FunctionalInterface
    interface IterationMeasuredAction {
        ActionResponse execute(int runIndex) throws Exception;
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
        List<Long> gzipBytesList = list.stream().map(RunMetric::gzipBytes).sorted().toList();

        int mid = list.size() / 2;
        return new RunMetric(
                queries.get(mid),
                batchCounts.get(mid),
                batchRowsList.get(mid),
                rowsReadList.get(mid),
                durations.get(mid),
                responseBytesList.get(mid),
                gzipBytesList.get(mid)
        );
    }

    private void printBenchmarkResult(BenchmarkResult res) {
        System.out.println("=========================================================================================");
        System.out.printf("API: %s%n", res.apiName());
        System.out.printf("  COLD (Run 1)   : %4d ms | %3d queries | Batch: %2d (%4d rows) | Rows read: %5d | Bytes: %6d (gzip: %6d)%n",
                res.cold().durationMs(), res.cold().queries(), res.cold().batchCount(), res.cold().batchRows(),
                res.cold().rowsRead(), res.cold().responseBytes(), res.cold().gzipBytes());
        System.out.printf("  WARM (Median 5): %4d ms | %3d queries | Batch: %2d (%4d rows) | Rows read: %5d | Bytes: %6d (gzip: %6d)%n",
                res.warmMedian().durationMs(), res.warmMedian().queries(), res.warmMedian().batchCount(), res.warmMedian().batchRows(),
                res.warmMedian().rowsRead(), res.warmMedian().responseBytes(), res.warmMedian().gzipBytes());
        System.out.println("  Runs: " + res.allRuns().stream()
                .map(m -> m.durationMs() + "ms(" + m.queries() + "q," + m.rowsRead() + "r)")
                .collect(Collectors.joining(", ")));
        System.out.println("=========================================================================================");
    }

    @Test
    @DisplayName("Run comprehensive benchmark across all APIs with proxy metrics (Cold + 5 Warm runs)")
    void runBenchmarkAcrossAllApis() throws Exception {
        resetDatabase();
        printDatabaseRowCounts();

        int totalRuns = 6; // 1 Cold + 5 Warm
        List<BenchmarkResult> results = new ArrayList<>();

        // 1a. POST /api/study/sessions + POST /api/study/sessions/{id}/answers (Batch 20 answers) [Chưa chạm cap XP]
        results.add(executeBenchmark(
                "POST /api/study/sessions + POST /answers (20) [Chưa chạm cap XP]",
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

                    return ActionResponse.ofBytes(createRes.getResponse().getContentAsByteArray().length + answerRes.getResponse().getContentAsByteArray().length);
                },
                (runIndex) -> {
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
                    jdbcTemplate.update("DELETE FROM xp_events WHERE user_id = ?", perfUser.getId());
                    jdbcTemplate.update("UPDATE user_xp SET total_xp = 0 WHERE user_id = ?", perfUser.getId());
                }
        ));

        // 1b. POST /api/study/sessions + POST /api/study/sessions/{id}/answers (Batch 20 answers) [Đã chạm cap XP]
        results.add(executeBenchmark(
                "POST /api/study/sessions + POST /answers (20) [Đã chạm cap XP]",
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

                    return ActionResponse.ofBytes(createRes.getResponse().getContentAsByteArray().length + answerRes.getResponse().getContentAsByteArray().length);
                },
                (runIndex) -> {
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
                    jdbcTemplate.update("DELETE FROM xp_events WHERE user_id = ?", perfUser.getId());
                    jdbcTemplate.update("UPDATE user_xp SET total_xp = 500 WHERE user_id = ?", perfUser.getId());
                    jdbcTemplate.update(
                            "INSERT INTO xp_events (user_id, source_type, source_key, xp, created_at) " +
                                    "VALUES (?, 'DAILY_CAP_FIXTURE', 'cap_preseed_' || ?, 500, NOW()) " +
                                    "ON CONFLICT DO NOTHING",
                            perfUser.getId(), runIndex
                    );
                }
        ));

        // 1c. POST /api/study/sessions + POST /api/study/sessions/{id}/answers (Batch 100 answers) [Chưa chạm cap XP]
        results.add(executeBenchmark(
                "POST /api/study/sessions + POST /answers (100) [Chưa chạm cap XP]",
                totalRuns,
                (runIndex) -> {
                    CreateSessionRequest createReq = new CreateSessionRequest(targetDeckId, "EN_TO_VI", 100, "SEQUENTIAL");
                    MvcResult createRes = mockMvc.perform(post("/api/study/sessions")
                                    .contentType(MediaType.APPLICATION_JSON)
                                    .content(objectMapper.writeValueAsString(createReq)))
                            .andExpect(status().isCreated())
                            .andReturn();

                    Map<?, ?> resMap = objectMapper.readValue(createRes.getResponse().getContentAsString(), Map.class);
                    Map<?, ?> dataMap = (Map<?, ?>) resMap.get("data");
                    Long sessionId = ((Number) dataMap.get("id")).longValue();

                    List<AnswerItemDto> answers = new ArrayList<>();
                    for (Long vId : deckVocabularyIds100) {
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

                    return ActionResponse.ofBytes(createRes.getResponse().getContentAsByteArray().length + answerRes.getResponse().getContentAsByteArray().length);
                },
                (runIndex) -> {
                    String placeholders = deckVocabularyIds100.stream().map(id -> "?").collect(Collectors.joining(", "));
                    List<Object> params = new ArrayList<>();
                    params.add(perfUser.getId());
                    params.addAll(deckVocabularyIds100);
                    jdbcTemplate.update(
                            "UPDATE study_progress SET repetitions = 1, interval_days = 1, ease_factor = 2.50, " +
                                    "next_review_at = NOW(), last_reviewed_at = NOW(), updated_at = NOW() " +
                                    "WHERE user_id = ? AND vocabulary_id IN (" + placeholders + ")",
                            params.toArray()
                    );
                    jdbcTemplate.update("DELETE FROM xp_events WHERE user_id = ?", perfUser.getId());
                    jdbcTemplate.update("UPDATE user_xp SET total_xp = 0 WHERE user_id = ?", perfUser.getId());
                }
        ));

        // 1d. POST /api/study/sessions + POST /api/study/sessions/{id}/answers (Batch 100 answers) [Đã chạm cap XP]
        results.add(executeBenchmark(
                "POST /api/study/sessions + POST /answers (100) [Đã chạm cap XP]",
                totalRuns,
                (runIndex) -> {
                    CreateSessionRequest createReq = new CreateSessionRequest(targetDeckId, "EN_TO_VI", 100, "SEQUENTIAL");
                    MvcResult createRes = mockMvc.perform(post("/api/study/sessions")
                                    .contentType(MediaType.APPLICATION_JSON)
                                    .content(objectMapper.writeValueAsString(createReq)))
                            .andExpect(status().isCreated())
                            .andReturn();

                    Map<?, ?> resMap = objectMapper.readValue(createRes.getResponse().getContentAsString(), Map.class);
                    Map<?, ?> dataMap = (Map<?, ?>) resMap.get("data");
                    Long sessionId = ((Number) dataMap.get("id")).longValue();

                    List<AnswerItemDto> answers = new ArrayList<>();
                    for (Long vId : deckVocabularyIds100) {
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

                    return ActionResponse.ofBytes(createRes.getResponse().getContentAsByteArray().length + answerRes.getResponse().getContentAsByteArray().length);
                },
                (runIndex) -> {
                    String placeholders = deckVocabularyIds100.stream().map(id -> "?").collect(Collectors.joining(", "));
                    List<Object> params = new ArrayList<>();
                    params.add(perfUser.getId());
                    params.addAll(deckVocabularyIds100);
                    jdbcTemplate.update(
                            "UPDATE study_progress SET repetitions = 1, interval_days = 1, ease_factor = 2.50, " +
                                    "next_review_at = NOW(), last_reviewed_at = NOW(), updated_at = NOW() " +
                                    "WHERE user_id = ? AND vocabulary_id IN (" + placeholders + ")",
                            params.toArray()
                    );
                    jdbcTemplate.update("DELETE FROM xp_events WHERE user_id = ?", perfUser.getId());
                    jdbcTemplate.update("UPDATE user_xp SET total_xp = 500 WHERE user_id = ?", perfUser.getId());
                    jdbcTemplate.update(
                            "INSERT INTO xp_events (user_id, source_type, source_key, xp, created_at) " +
                                    "VALUES (?, 'DAILY_CAP_FIXTURE', 'cap_preseed_100_' || ?, 500, NOW()) " +
                                    "ON CONFLICT DO NOTHING",
                            perfUser.getId(), runIndex
                    );
                }
        ));

        // 1e. POST /api/study/sessions (Đo độc lập createSession: Không plan / không hard gate)
        results.add(executeBenchmark(
                "POST /api/study/sessions (Khởi tạo session, không hard gate)",
                totalRuns,
                (runIndex) -> {
                    CreateSessionRequest createReq = new CreateSessionRequest(targetDeckId, "EN_TO_VI", 20, "SEQUENTIAL");
                    MvcResult res = mockMvc.perform(post("/api/study/sessions")
                                    .contentType(MediaType.APPLICATION_JSON)
                                    .content(objectMapper.writeValueAsString(createReq)))
                            .andExpect(status().isCreated())
                            .andReturn();
                    return ActionResponse.of(res.getResponse().getContentAsByteArray());
                },
                (runIndex) -> {
                    jdbcTemplate.update("UPDATE study_plans SET hard_gate_enabled = FALSE WHERE user_id = ?", perfUser.getId());
                }
        ));

        // 1f. POST /api/study/sessions (Đo độc lập createSession: Có plan bật hard gate còn thẻ cần học)
        results.add(executeBenchmark(
                "POST /api/study/sessions (Bật hard gate, còn thẻ cần học -> chặn)",
                totalRuns,
                (runIndex) -> {
                    CreateSessionRequest createReq = new CreateSessionRequest(targetDeckId, "EN_TO_VI", 20, "SEQUENTIAL");
                    MvcResult res = mockMvc.perform(post("/api/study/sessions")
                                    .contentType(MediaType.APPLICATION_JSON)
                                    .content(objectMapper.writeValueAsString(createReq)))
                            .andExpect(status().isBadRequest())
                            .andReturn();
                    return ActionResponse.of(res.getResponse().getContentAsByteArray());
                },
                (runIndex) -> {
                    jdbcTemplate.update("UPDATE study_plans SET hard_gate_enabled = TRUE, status = 'ACTIVE' WHERE user_id = ?", perfUser.getId());
                }
        ));

        // 1g. Đo riêng lẻ: POST /answers (20) [Chưa chạm cap XP]
        final AtomicLong answerOnlySessionId20 = new AtomicLong();
        results.add(executeBenchmark(
                "POST /answers (20) [Đo riêng lẻ recordAnswers, Chưa chạm cap XP]",
                totalRuns,
                (runIndex) -> {
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
                    MvcResult answerRes = mockMvc.perform(post("/api/study/sessions/" + answerOnlySessionId20.get() + "/answers")
                                    .contentType(MediaType.APPLICATION_JSON)
                                    .content(objectMapper.writeValueAsString(batchReq)))
                            .andExpect(status().isOk())
                            .andReturn();
                    return ActionResponse.of(answerRes.getResponse().getContentAsByteArray());
                },
                (runIndex) -> {
                    jdbcTemplate.update("UPDATE study_plans SET hard_gate_enabled = FALSE WHERE user_id = ?", perfUser.getId());
                    CreateSessionRequest createReq = new CreateSessionRequest(targetDeckId, "EN_TO_VI", 20, "SEQUENTIAL");
                    try {
                        MvcResult createRes = mockMvc.perform(post("/api/study/sessions")
                                        .contentType(MediaType.APPLICATION_JSON)
                                        .content(objectMapper.writeValueAsString(createReq)))
                                .andExpect(status().isCreated())
                                .andReturn();
                        Map<?, ?> resMap = objectMapper.readValue(createRes.getResponse().getContentAsString(), Map.class);
                        Map<?, ?> dataMap = (Map<?, ?>) resMap.get("data");
                        answerOnlySessionId20.set(((Number) dataMap.get("id")).longValue());
                    } catch (Exception e) {
                        throw new RuntimeException(e);
                    }

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
                    jdbcTemplate.update("DELETE FROM xp_events WHERE user_id = ?", perfUser.getId());
                    jdbcTemplate.update("UPDATE user_xp SET total_xp = 0 WHERE user_id = ?", perfUser.getId());
                }
        ));

        // 1h. Đo riêng lẻ: POST /answers (20) [Đã chạm cap XP]
        results.add(executeBenchmark(
                "POST /answers (20) [Đo riêng lẻ recordAnswers, Đã chạm cap XP]",
                totalRuns,
                (runIndex) -> {
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
                    MvcResult answerRes = mockMvc.perform(post("/api/study/sessions/" + answerOnlySessionId20.get() + "/answers")
                                    .contentType(MediaType.APPLICATION_JSON)
                                    .content(objectMapper.writeValueAsString(batchReq)))
                            .andExpect(status().isOk())
                            .andReturn();
                    return ActionResponse.of(answerRes.getResponse().getContentAsByteArray());
                },
                (runIndex) -> {
                    jdbcTemplate.update("UPDATE study_plans SET hard_gate_enabled = FALSE WHERE user_id = ?", perfUser.getId());
                    CreateSessionRequest createReq = new CreateSessionRequest(targetDeckId, "EN_TO_VI", 20, "SEQUENTIAL");
                    try {
                        MvcResult createRes = mockMvc.perform(post("/api/study/sessions")
                                        .contentType(MediaType.APPLICATION_JSON)
                                        .content(objectMapper.writeValueAsString(createReq)))
                                .andExpect(status().isCreated())
                                .andReturn();
                        Map<?, ?> resMap = objectMapper.readValue(createRes.getResponse().getContentAsString(), Map.class);
                        Map<?, ?> dataMap = (Map<?, ?>) resMap.get("data");
                        answerOnlySessionId20.set(((Number) dataMap.get("id")).longValue());
                    } catch (Exception e) {
                        throw new RuntimeException(e);
                    }

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
                    jdbcTemplate.update("DELETE FROM xp_events WHERE user_id = ?", perfUser.getId());
                    jdbcTemplate.update("UPDATE user_xp SET total_xp = 500 WHERE user_id = ?", perfUser.getId());
                    jdbcTemplate.update(
                            "INSERT INTO xp_events (user_id, source_type, source_key, xp, created_at) " +
                                    "VALUES (?, 'DAILY_CAP_FIXTURE', 'cap_preseed_sep_' || ?, 500, NOW()) " +
                                    "ON CONFLICT DO NOTHING",
                            perfUser.getId(), runIndex
                    );
                }
        ));

        // 1i. Đo riêng lẻ: POST /answers (100) [Chưa chạm cap XP]
        final AtomicLong answerOnlySessionId100 = new AtomicLong();
        results.add(executeBenchmark(
                "POST /answers (100) [Đo riêng lẻ recordAnswers, Chưa chạm cap XP]",
                totalRuns,
                (runIndex) -> {
                    List<AnswerItemDto> answers = new ArrayList<>();
                    for (Long vId : deckVocabularyIds100) {
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
                    MvcResult answerRes = mockMvc.perform(post("/api/study/sessions/" + answerOnlySessionId100.get() + "/answers")
                                    .contentType(MediaType.APPLICATION_JSON)
                                    .content(objectMapper.writeValueAsString(batchReq)))
                            .andExpect(status().isOk())
                            .andReturn();
                    return ActionResponse.of(answerRes.getResponse().getContentAsByteArray());
                },
                (runIndex) -> {
                    jdbcTemplate.update("UPDATE study_plans SET hard_gate_enabled = FALSE WHERE user_id = ?", perfUser.getId());
                    CreateSessionRequest createReq = new CreateSessionRequest(targetDeckId, "EN_TO_VI", 100, "SEQUENTIAL");
                    try {
                        MvcResult createRes = mockMvc.perform(post("/api/study/sessions")
                                        .contentType(MediaType.APPLICATION_JSON)
                                        .content(objectMapper.writeValueAsString(createReq)))
                                .andExpect(status().isCreated())
                                .andReturn();
                        Map<?, ?> resMap = objectMapper.readValue(createRes.getResponse().getContentAsString(), Map.class);
                        Map<?, ?> dataMap = (Map<?, ?>) resMap.get("data");
                        answerOnlySessionId100.set(((Number) dataMap.get("id")).longValue());
                    } catch (Exception e) {
                        throw new RuntimeException(e);
                    }

                    String placeholders = deckVocabularyIds100.stream().map(id -> "?").collect(Collectors.joining(", "));
                    List<Object> params = new ArrayList<>();
                    params.add(perfUser.getId());
                    params.addAll(deckVocabularyIds100);
                    jdbcTemplate.update(
                            "UPDATE study_progress SET repetitions = 1, interval_days = 1, ease_factor = 2.50, " +
                                    "next_review_at = NOW(), last_reviewed_at = NOW(), updated_at = NOW() " +
                                    "WHERE user_id = ? AND vocabulary_id IN (" + placeholders + ")",
                            params.toArray()
                    );
                    jdbcTemplate.update("DELETE FROM xp_events WHERE user_id = ?", perfUser.getId());
                    jdbcTemplate.update("UPDATE user_xp SET total_xp = 0 WHERE user_id = ?", perfUser.getId());
                }
        ));

        // 1j. Đo riêng lẻ: POST /answers (100) [Đã chạm cap XP]
        results.add(executeBenchmark(
                "POST /answers (100) [Đo riêng lẻ recordAnswers, Đã chạm cap XP]",
                totalRuns,
                (runIndex) -> {
                    List<AnswerItemDto> answers = new ArrayList<>();
                    for (Long vId : deckVocabularyIds100) {
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
                    MvcResult answerRes = mockMvc.perform(post("/api/study/sessions/" + answerOnlySessionId100.get() + "/answers")
                                    .contentType(MediaType.APPLICATION_JSON)
                                    .content(objectMapper.writeValueAsString(batchReq)))
                            .andExpect(status().isOk())
                            .andReturn();
                    return ActionResponse.of(answerRes.getResponse().getContentAsByteArray());
                },
                (runIndex) -> {
                    jdbcTemplate.update("UPDATE study_plans SET hard_gate_enabled = FALSE WHERE user_id = ?", perfUser.getId());
                    CreateSessionRequest createReq = new CreateSessionRequest(targetDeckId, "EN_TO_VI", 100, "SEQUENTIAL");
                    try {
                        MvcResult createRes = mockMvc.perform(post("/api/study/sessions")
                                        .contentType(MediaType.APPLICATION_JSON)
                                        .content(objectMapper.writeValueAsString(createReq)))
                                .andExpect(status().isCreated())
                                .andReturn();
                        Map<?, ?> resMap = objectMapper.readValue(createRes.getResponse().getContentAsString(), Map.class);
                        Map<?, ?> dataMap = (Map<?, ?>) resMap.get("data");
                        answerOnlySessionId100.set(((Number) dataMap.get("id")).longValue());
                    } catch (Exception e) {
                        throw new RuntimeException(e);
                    }

                    String placeholders = deckVocabularyIds100.stream().map(id -> "?").collect(Collectors.joining(", "));
                    List<Object> params = new ArrayList<>();
                    params.add(perfUser.getId());
                    params.addAll(deckVocabularyIds100);
                    jdbcTemplate.update(
                            "UPDATE study_progress SET repetitions = 1, interval_days = 1, ease_factor = 2.50, " +
                                    "next_review_at = NOW(), last_reviewed_at = NOW(), updated_at = NOW() " +
                                    "WHERE user_id = ? AND vocabulary_id IN (" + placeholders + ")",
                            params.toArray()
                    );
                    jdbcTemplate.update("DELETE FROM xp_events WHERE user_id = ?", perfUser.getId());
                    jdbcTemplate.update("UPDATE user_xp SET total_xp = 500 WHERE user_id = ?", perfUser.getId());
                    jdbcTemplate.update(
                            "INSERT INTO xp_events (user_id, source_type, source_key, xp, created_at) " +
                                    "VALUES (?, 'DAILY_CAP_FIXTURE', 'cap_preseed_100_sep_' || ?, 500, NOW()) " +
                                    "ON CONFLICT DO NOTHING",
                            perfUser.getId(), runIndex
                    );
                }
        ));

        // Reset before read-only study plan & analytics endpoints to prevent contamination from session answers
        resetDatabase();

        // 2a. GET today-queue (MỚI: CTE SQL)
        results.add(executeBenchmark(
                "GET /api/study-plans/current/today (MỚI: CTE SQL)",
                totalRuns,
                (runIndex) -> {
                    MvcResult res = mockMvc.perform(get("/api/study-plans/current/today?cte=true"))
                            .andExpect(status().isOk())
                            .andReturn();
                    byte[] rawBytes = res.getResponse().getContentAsByteArray();
                    return ActionResponse.of(rawBytes);
                },
                null
        ));

        // 2b. GET today-queue (LEGACY: In-Memory)
        results.add(executeBenchmark(
                "GET /api/study-plans/current/today (LEGACY: In-Memory)",
                totalRuns,
                (runIndex) -> {
                    MvcResult res = mockMvc.perform(get("/api/study-plans/current/today?legacy=true"))
                            .andExpect(status().isOk())
                            .andReturn();
                    byte[] rawBytes = res.getResponse().getContentAsByteArray();
                    return ActionResponse.of(rawBytes);
                },
                null
        ));

        // 2c. GET today-summary (MỚI: CTE Summary)
        results.add(executeBenchmark(
                "GET /api/study-plans/current/today/summary (MỚI: CTE Summary)",
                totalRuns,
                (runIndex) -> {
                    MvcResult res = mockMvc.perform(get("/api/study-plans/current/today/summary"))
                            .andExpect(status().isOk())
                            .andReturn();
                    byte[] rawBytes = res.getResponse().getContentAsByteArray();
                    return ActionResponse.of(rawBytes);
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
                    return ActionResponse.of(res.getResponse().getContentAsByteArray());
                },
                null
        ));

        // 4a. GET /api/analytics/overview (MỚI: SQL Aggregate)
        results.add(executeBenchmark(
                "GET /api/analytics/overview (MỚI: SQL Aggregate)",
                totalRuns,
                (runIndex) -> {
                    MvcResult res = mockMvc.perform(get("/api/analytics/overview"))
                            .andExpect(status().isOk())
                            .andReturn();
                    return ActionResponse.of(res.getResponse().getContentAsByteArray());
                },
                null
        ));

        // 4b. GET /api/analytics/overview (LEGACY: In-Memory)
        results.add(executeBenchmark(
                "GET /api/analytics/overview (LEGACY: In-Memory)",
                totalRuns,
                (runIndex) -> {
                    MvcResult res = mockMvc.perform(get("/api/analytics/overview?legacy=true"))
                            .andExpect(status().isOk())
                            .andReturn();
                    return ActionResponse.of(res.getResponse().getContentAsByteArray());
                },
                null
        ));

        // 5a. GET /api/analytics/weak-words?limit=10 (MỚI: Index Scan + LIMIT)
        results.add(executeBenchmark(
                "GET /api/analytics/weak-words?limit=10 (MỚI: Index Scan + LIMIT)",
                totalRuns,
                (runIndex) -> {
                    MvcResult res = mockMvc.perform(get("/api/analytics/weak-words?limit=10"))
                            .andExpect(status().isOk())
                            .andReturn();
                    return ActionResponse.of(res.getResponse().getContentAsByteArray());
                },
                null
        ));

        // 5b. GET /api/analytics/weak-words?limit=10 (LEGACY: In-Memory)
        results.add(executeBenchmark(
                "GET /api/analytics/weak-words?limit=10 (LEGACY: In-Memory)",
                totalRuns,
                (runIndex) -> {
                    MvcResult res = mockMvc.perform(get("/api/analytics/weak-words?limit=10&legacy=true"))
                            .andExpect(status().isOk())
                            .andReturn();
                    return ActionResponse.of(res.getResponse().getContentAsByteArray());
                },
                null
        ));

        // 6a. GET /api/analytics/retention (MỚI: FILTER Aggregate)
        results.add(executeBenchmark(
                "GET /api/analytics/retention (MỚI: FILTER Aggregate)",
                totalRuns,
                (runIndex) -> {
                    MvcResult res = mockMvc.perform(get("/api/analytics/retention"))
                            .andExpect(status().isOk())
                            .andReturn();
                    return ActionResponse.of(res.getResponse().getContentAsByteArray());
                },
                null
        ));

        // 6b. GET /api/analytics/retention (LEGACY: In-Memory)
        results.add(executeBenchmark(
                "GET /api/analytics/retention (LEGACY: In-Memory)",
                totalRuns,
                (runIndex) -> {
                    MvcResult res = mockMvc.perform(get("/api/analytics/retention?legacy=true"))
                            .andExpect(status().isOk())
                            .andReturn();
                    return ActionResponse.of(res.getResponse().getContentAsByteArray());
                },
                null
        ));

        // 7a. GET /api/analytics/heatmap (MỚI: GROUP BY Day)
        results.add(executeBenchmark(
                "GET /api/analytics/heatmap (MỚI: GROUP BY Day)",
                totalRuns,
                (runIndex) -> {
                    MvcResult res = mockMvc.perform(get("/api/analytics/heatmap"))
                            .andExpect(status().isOk())
                            .andReturn();
                    return ActionResponse.of(res.getResponse().getContentAsByteArray());
                },
                null
        ));

        // 7b. GET /api/analytics/heatmap (LEGACY: In-Memory)
        results.add(executeBenchmark(
                "GET /api/analytics/heatmap (LEGACY: In-Memory)",
                totalRuns,
                (runIndex) -> {
                    MvcResult res = mockMvc.perform(get("/api/analytics/heatmap?legacy=true"))
                            .andExpect(status().isOk())
                            .andReturn();
                    return ActionResponse.of(res.getResponse().getContentAsByteArray());
                },
                null
        ));

        // 8a. GET Analytics Suite (MỚI: 4 endpoints)
        results.add(executeBenchmark(
                "GET Analytics Suite (MỚI: 4 endpoints)",
                totalRuns,
                (runIndex) -> {
                    long raw = 0;
                    long gz = 0;
                    MvcResult r1 = mockMvc.perform(get("/api/analytics/overview")).andExpect(status().isOk()).andReturn();
                    MvcResult r2 = mockMvc.perform(get("/api/analytics/weak-words?limit=10")).andExpect(status().isOk()).andReturn();
                    MvcResult r3 = mockMvc.perform(get("/api/analytics/retention")).andExpect(status().isOk()).andReturn();
                    MvcResult r4 = mockMvc.perform(get("/api/analytics/heatmap")).andExpect(status().isOk()).andReturn();
                    raw += r1.getResponse().getContentAsByteArray().length;
                    raw += r2.getResponse().getContentAsByteArray().length;
                    raw += r3.getResponse().getContentAsByteArray().length;
                    raw += r4.getResponse().getContentAsByteArray().length;
                    gz += computeGzipSize(r1.getResponse().getContentAsByteArray());
                    gz += computeGzipSize(r2.getResponse().getContentAsByteArray());
                    gz += computeGzipSize(r3.getResponse().getContentAsByteArray());
                    gz += computeGzipSize(r4.getResponse().getContentAsByteArray());
                    return new ActionResponse(raw, gz);
                },
                null
        ));

        // 8b. GET Analytics Suite (LEGACY: 4 endpoints)
        results.add(executeBenchmark(
                "GET Analytics Suite (LEGACY: 4 endpoints)",
                totalRuns,
                (runIndex) -> {
                    long raw = 0;
                    long gz = 0;
                    MvcResult r1 = mockMvc.perform(get("/api/analytics/overview?legacy=true")).andExpect(status().isOk()).andReturn();
                    MvcResult r2 = mockMvc.perform(get("/api/analytics/weak-words?limit=10&legacy=true")).andExpect(status().isOk()).andReturn();
                    MvcResult r3 = mockMvc.perform(get("/api/analytics/retention?legacy=true")).andExpect(status().isOk()).andReturn();
                    MvcResult r4 = mockMvc.perform(get("/api/analytics/heatmap?legacy=true")).andExpect(status().isOk()).andReturn();
                    raw += r1.getResponse().getContentAsByteArray().length;
                    raw += r2.getResponse().getContentAsByteArray().length;
                    raw += r3.getResponse().getContentAsByteArray().length;
                    raw += r4.getResponse().getContentAsByteArray().length;
                    gz += computeGzipSize(r1.getResponse().getContentAsByteArray());
                    gz += computeGzipSize(r2.getResponse().getContentAsByteArray());
                    gz += computeGzipSize(r3.getResponse().getContentAsByteArray());
                    gz += computeGzipSize(r4.getResponse().getContentAsByteArray());
                    return new ActionResponse(raw, gz);
                },
                null
        ));

        // Reset before PUT Scenario A to ensure updateDeck is fresh
        resetDatabase();

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
                    return ActionResponse.of(res.getResponse().getContentAsByteArray());
                },
                null
        ));

        // Reset before PUT Scenario A' to ensure updateDeck has original data
        resetDatabase();

        // 9b. PUT /api/decks/{id} Scenario A': Sửa 500 thẻ nhưng KHÔNG đổi nội dung
        results.add(executeBenchmark(
                "PUT /api/decks/{id} (a': Sửa 500 thẻ không đổi)",
                totalRuns,
                (runIndex) -> {
                    List<TermCardDto> unchangedCards = new ArrayList<>(500);
                    for (int i = 0; i < updateDeckVocabIds.size(); i++) {
                        Long vId = updateDeckVocabIds.get(i);
                        unchangedCards.add(new TermCardDto(
                                vId,
                                "bench_upd_" + (i + 1),
                                "Nghia cua tu bench_upd_" + (i + 1),
                                "/p/",
                                "noun",
                                "example",
                                List.of("syn_bench_upd_" + (i + 1))
                        ));
                    }
                    DeckUpdateRequest unchangedDeckRequest = new DeckUpdateRequest("Perf Deck 500 - Update Existing", "Dedicated benchmark deck", null, unchangedCards);
                    String unchangedPayload = objectMapper.writeValueAsString(unchangedDeckRequest);

                    MvcResult res = mockMvc.perform(put("/api/decks/" + updateDeckId)
                                    .contentType(MediaType.APPLICATION_JSON)
                                    .content(unchangedPayload))
                            .andExpect(status().isOk())
                            .andReturn();
                    return ActionResponse.of(res.getResponse().getContentAsByteArray());
                },
                null
        ));

        // Reset before PUT Scenario B to ensure addDeck is fresh
        resetDatabase();

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
                    return ActionResponse.of(res.getResponse().getContentAsByteArray());
                },
                (runIndex) -> cleanupDeckCards(addDeckId)
        ));

        // Reset before PUT Scenario C to ensure deleteDeck is fresh
        resetDatabase();

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
                    return ActionResponse.of(res.getResponse().getContentAsByteArray());
                },
                (runIndex) -> {
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
                                        "AND NOT EXISTS (SELECT 1 FROM vocabulary_set_items WHERE vocabulary_set_id = vocabularies.id)",
                                tempIds.toArray()
                        );
                    }
                    insertCardsIntoDeck(deleteDeckId, 500, "bench_temp_del_r" + runIndex + "_");
                }
        ));

        // Reset before GET /api/decks to ensure clean deck list
        resetDatabase();

        // 12. GET /api/decks (List decks)
        results.add(executeBenchmark(
                "GET /api/decks",
                totalRuns,
                (runIndex) -> {
                    MvcResult res = mockMvc.perform(get("/api/decks"))
                            .andExpect(status().isOk())
                            .andReturn();
                    return ActionResponse.of(res.getResponse().getContentAsByteArray());
                },
                null
        ));

        // Print final markdown summary
        System.out.println("\n\n========================= FULL BENCHMARK SUMMARY =========================");
        System.out.println("| API Endpoint | COLD (ms/q/batch/rows/raw/gzip) | WARM Median (ms/q/batch/rows/raw/gzip) |");
        System.out.println("| :--- | :---: | :---: |");
        for (BenchmarkResult r : results) {
            System.out.printf("| %s | %d ms / %d q / b:%d(%d) / r:%d / %d B (gz:%d B) | %d ms / %d q / b:%d(%d) / r:%d / %d B (gz:%d B) |%n",
                    r.apiName(),
                    r.cold().durationMs(), r.cold().queries(), r.cold().batchCount(), r.cold().batchRows(), r.cold().rowsRead(), r.cold().responseBytes(), r.cold().gzipBytes(),
                    r.warmMedian().durationMs(), r.warmMedian().queries(), r.warmMedian().batchCount(), r.warmMedian().batchRows(), r.warmMedian().rowsRead(), r.warmMedian().responseBytes(), r.warmMedian().gzipBytes()
            );
        }
        System.out.println("==========================================================================\n");

        // Measure detailed sub-step timing breakdown
        measureTodayQueueBreakdown();
    }

    private void measureTodayQueueBreakdown() throws Exception {
        System.out.println("=========================================================================");
        System.out.println("DETAILED BREAKDOWN BENCHMARK: GET /today (MỚI vs LEGACY, 5 Warm runs median)");

        // Warmup runs
        for (int i = 0; i < 2; i++) {
            studyPlanService.getTodayQueueCte(perfUser.getId());
            studyPlanService.getTodayQueue(perfUser.getId());
        }

        // Measure MỚI sub-steps
        List<Long> moiDtoTimes = new ArrayList<>();
        List<Long> moiJsonTimes = new ArrayList<>();
        for (int i = 0; i < 5; i++) {
            long t0 = System.nanoTime();
            TodayStudyQueueResponse resp = studyPlanService.getTodayQueueCte(perfUser.getId());
            long t1 = System.nanoTime();
            byte[] json = objectMapper.writeValueAsBytes(ApiResponse.success("OK", resp));
            long t2 = System.nanoTime();
            moiDtoTimes.add((t1 - t0) / 1_000_000);
            moiJsonTimes.add((t2 - t1) / 1_000_000);
        }

        // Measure LEGACY sub-steps
        List<Long> legDtoTimes = new ArrayList<>();
        List<Long> legJsonTimes = new ArrayList<>();
        for (int i = 0; i < 5; i++) {
            long t0 = System.nanoTime();
            TodayStudyQueueResponse resp = studyPlanService.getTodayQueueLegacyForParity(perfUser.getId());
            long t1 = System.nanoTime();
            byte[] json = objectMapper.writeValueAsBytes(ApiResponse.success("OK", resp));
            long t2 = System.nanoTime();
            legDtoTimes.add((t1 - t0) / 1_000_000);
            legJsonTimes.add((t2 - t1) / 1_000_000);
        }

        Collections.sort(moiDtoTimes);
        Collections.sort(moiJsonTimes);
        Collections.sort(legDtoTimes);
        Collections.sort(legJsonTimes);

        long moiService = moiDtoTimes.get(2);
        long moiJson = moiJsonTimes.get(2);
        long legService = legDtoTimes.get(2);
        long legJson = legJsonTimes.get(2);

        System.out.printf("  [MỚI CTE SQL]    : Service (SQL + DTO Mapping) = %4d ms | Jackson JSON Serialization = %4d ms | Total = %4d ms%n",
                moiService, moiJson, moiService + moiJson);
        System.out.printf("  [LEGACY In-RAM]  : Service (Queries + In-RAM)  = %4d ms | Jackson JSON Serialization = %4d ms | Total = %4d ms%n",
                legService, legJson, legService + legJson);
        System.out.println("=========================================================================");
    }
}
