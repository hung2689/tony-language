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
import org.hibernate.SessionFactory;
import org.hibernate.stat.Statistics;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.TestInstance;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.DefaultApplicationArguments;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.test.web.servlet.setup.SecurityMockMvcConfigurers;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.web.context.WebApplicationContext;

import java.util.*;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@ActiveProfiles("test")
@TestInstance(TestInstance.Lifecycle.PER_CLASS)
@Tag("perf")
public class PerfBaselineRunnerIntegrationTest {

    private static final Logger log = LoggerFactory.getLogger(PerfBaselineRunnerIntegrationTest.class);

    @Autowired
    private WebApplicationContext webApplicationContext;

    private MockMvc mockMvc;

    private final ObjectMapper objectMapper = new ObjectMapper();

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private SessionFactory sessionFactory;

    @Autowired
    private JdbcTemplate jdbcTemplate;

    @Autowired
    private org.springframework.security.crypto.password.PasswordEncoder passwordEncoder;

    @Autowired
    private jakarta.persistence.EntityManager entityManager;

    private User perfUser;
    private Long targetDeckId;
    private List<Long> deckVocabularyIds = new ArrayList<>();

    public record RunMetric(int queries, long durationMs) {}

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

        SessionFactory sf = entityManager.getEntityManagerFactory().unwrap(SessionFactory.class);
        sf.getStatistics().setStatisticsEnabled(true);

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
    }

    private void setAuth() {
        SecurityTestUtils.setAuthenticatedUser(
                perfUser.getId(),
                perfUser.getEmail(),
                perfUser.getUsername(),
                List.of("USER")
        );
    }

    private RunMetric measure(ThrowingRunnable runnable) throws Exception {
        SessionFactory sf = entityManager.getEntityManagerFactory().unwrap(SessionFactory.class);
        Statistics stats = sf.getStatistics();
        stats.setStatisticsEnabled(true);
        stats.clear();
        long startQueries = stats.getPrepareStatementCount();
        long startTime = System.nanoTime();

        runnable.run();

        long endTime = System.nanoTime();
        long endQueries = stats.getPrepareStatementCount();

        int queries = (int) (endQueries - startQueries);
        long durationMs = (endTime - startTime) / 1_000_000;
        return new RunMetric(queries, durationMs);
    }

    private String calculateMedianSummary(String apiName, List<RunMetric> metrics) {
        List<Integer> queryCounts = metrics.stream().map(RunMetric::queries).sorted().toList();
        List<Long> durations = metrics.stream().map(RunMetric::durationMs).sorted().toList();

        int medianQueries = queryCounts.get(queryCounts.size() / 2);
        long medianDurationMs = durations.get(durations.size() / 2);

        String result = String.format("API: %-40s | Median Queries: %3d | Median Latency: %4d ms (Runs: %s ms)",
                apiName, medianQueries, medianDurationMs,
                metrics.stream().map(m -> m.durationMs() + "ms(" + m.queries() + "q)").toList());
        log.info(result);
        System.out.println(">>> [BENCHMARK] " + result);
        return result;
    }

    @FunctionalInterface
    interface ThrowingRunnable {
        void run() throws Exception;
    }

    @Test
    @DisplayName("Run 5-iteration benchmark across all 6 core API groups and output median metrics")
    void runBenchmarkAcrossAllApis() throws Exception {
        int runs = 5;

        // 1. POST create session then POST /sessions/{id}/answers with batch of 20 answers
        List<RunMetric> sessionMetrics = new ArrayList<>();
        for (int r = 0; r < runs; r++) {
            setAuth();
            RunMetric m = measure(() -> {
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
                    AnswerItemDto item = new AnswerItemDto(
                            UUID.randomUUID().toString(),
                            vId,
                            "EN_TO_VI",
                            "CORRECT",
                            false,
                            "test",
                            1
                    );
                    answers.add(item);
                }
                AnswerBatchRequest batchReq = new AnswerBatchRequest(answers);

                mockMvc.perform(post("/api/study/sessions/" + sessionId + "/answers")
                                .contentType(MediaType.APPLICATION_JSON)
                                .content(objectMapper.writeValueAsString(batchReq)))
                        .andExpect(status().isOk());
            });
            sessionMetrics.add(m);
        }
        calculateMedianSummary("POST /sessions + POST /sessions/{id}/answers (20)", sessionMetrics);

        // 2. GET today-queue (/api/study-plans/current/today)
        List<RunMetric> todayQueueMetrics = new ArrayList<>();
        for (int r = 0; r < runs; r++) {
            setAuth();
            RunMetric m = measure(() -> {
                mockMvc.perform(get("/api/study-plans/current/today"))
                        .andExpect(status().isOk());
            });
            todayQueueMetrics.add(m);
        }
        calculateMedianSummary("GET /api/study-plans/current/today", todayQueueMetrics);

        // 3. GET current plan (/api/study-plans/current)
        List<RunMetric> currentPlanMetrics = new ArrayList<>();
        for (int r = 0; r < runs; r++) {
            setAuth();
            RunMetric m = measure(() -> {
                mockMvc.perform(get("/api/study-plans/current"))
                        .andExpect(status().isOk());
            });
            currentPlanMetrics.add(m);
        }
        calculateMedianSummary("GET /api/study-plans/current", currentPlanMetrics);

        // 4. Analytics endpoints: overview, weak-words, retention, heatmap
        List<RunMetric> overviewMetrics = new ArrayList<>();
        for (int r = 0; r < runs; r++) {
            setAuth();
            RunMetric m = measure(() -> {
                mockMvc.perform(get("/api/analytics/overview"))
                        .andExpect(status().isOk());
            });
            overviewMetrics.add(m);
        }
        calculateMedianSummary("GET /api/analytics/overview", overviewMetrics);

        List<RunMetric> weakWordsMetrics = new ArrayList<>();
        for (int r = 0; r < runs; r++) {
            setAuth();
            RunMetric m = measure(() -> {
                mockMvc.perform(get("/api/analytics/weak-words?limit=10"))
                        .andExpect(status().isOk());
            });
            weakWordsMetrics.add(m);
        }
        calculateMedianSummary("GET /api/analytics/weak-words", weakWordsMetrics);

        List<RunMetric> retentionMetrics = new ArrayList<>();
        for (int r = 0; r < runs; r++) {
            setAuth();
            RunMetric m = measure(() -> {
                mockMvc.perform(get("/api/analytics/retention"))
                        .andExpect(status().isOk());
            });
            retentionMetrics.add(m);
        }
        calculateMedianSummary("GET /api/analytics/retention", retentionMetrics);

        List<RunMetric> heatmapMetrics = new ArrayList<>();
        for (int r = 0; r < runs; r++) {
            setAuth();
            RunMetric m = measure(() -> {
                mockMvc.perform(get("/api/analytics/heatmap"))
                        .andExpect(status().isOk());
            });
            heatmapMetrics.add(m);
        }
        calculateMedianSummary("GET /api/analytics/heatmap", heatmapMetrics);

        // Combined analytics suite metric
        List<RunMetric> analyticsSuiteMetrics = new ArrayList<>();
        for (int r = 0; r < runs; r++) {
            setAuth();
            RunMetric m = measure(() -> {
                mockMvc.perform(get("/api/analytics/overview")).andExpect(status().isOk());
                mockMvc.perform(get("/api/analytics/weak-words")).andExpect(status().isOk());
                mockMvc.perform(get("/api/analytics/retention")).andExpect(status().isOk());
                mockMvc.perform(get("/api/analytics/heatmap")).andExpect(status().isOk());
            });
            analyticsSuiteMetrics.add(m);
        }
        calculateMedianSummary("GET Analytics Suite (overview+weak+retention+heatmap)", analyticsSuiteMetrics);

        // 5. PUT cập nhật deck 500 thẻ (/api/decks/{id})
        // Prepare 500 cards
        List<TermCardDto> cards500 = new ArrayList<>(500);
        for (int i = 1; i <= 500; i++) {
            cards500.add(new TermCardDto(
                    null,
                    "benchmark_term_" + i,
                    "Nghĩa tiếng Việt cho từ benchmark " + i,
                    "/term_" + i + "/",
                    i % 2 == 0 ? "noun" : "verb",
                    "Ví dụ câu " + i,
                    List.of("synonym_" + i)
            ));
        }
        DeckUpdateRequest deckUpdateRequest = new DeckUpdateRequest("Updated Perf Deck 500", "Updated description", null, cards500);
        String updatePayload = objectMapper.writeValueAsString(deckUpdateRequest);

        List<RunMetric> updateDeckMetrics = new ArrayList<>();
        for (int r = 0; r < runs; r++) {
            setAuth();
            RunMetric m = measure(() -> {
                mockMvc.perform(put("/api/decks/" + targetDeckId)
                                .contentType(MediaType.APPLICATION_JSON)
                                .content(updatePayload))
                        .andExpect(status().isOk());
            });
            updateDeckMetrics.add(m);
        }
        calculateMedianSummary("PUT /api/decks/{id} (500 cards)", updateDeckMetrics);

        // 6. GET list decks (/api/decks)
        List<RunMetric> listDecksMetrics = new ArrayList<>();
        for (int r = 0; r < runs; r++) {
            setAuth();
            RunMetric m = measure(() -> {
                mockMvc.perform(get("/api/decks"))
                        .andExpect(status().isOk());
            });
            listDecksMetrics.add(m);
        }
        calculateMedianSummary("GET /api/decks", listDecksMetrics);
    }
}
