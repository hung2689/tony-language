package com.languagelearning.backend.study;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.languagelearning.backend.account.User;
import com.languagelearning.backend.account.UserRepository;
import com.languagelearning.backend.common.security.SecurityTestUtils;
import com.languagelearning.backend.deck.entity.VocabularySet;
import com.languagelearning.backend.deck.entity.VocabularySetItem;
import com.languagelearning.backend.deck.repository.VocabularySetItemRepository;
import com.languagelearning.backend.deck.repository.VocabularySetRepository;
import com.languagelearning.backend.study.entity.StudyPlan;
import com.languagelearning.backend.study.entity.StudyPlanDeck;
import com.languagelearning.backend.study.entity.StudyProgress;
import com.languagelearning.backend.study.repository.StudyPlanDeckRepository;
import com.languagelearning.backend.study.repository.StudyPlanRepository;
import com.languagelearning.backend.study.repository.StudyProgressRepository;
import com.languagelearning.backend.term.entity.Vocabulary;
import com.languagelearning.backend.term.repository.VocabularyRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.security.test.web.servlet.setup.SecurityMockMvcConfigurers;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.context.WebApplicationContext;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@ActiveProfiles("test")
@Transactional
public class TodaySummaryControllerIntegrationTest {

    @Autowired
    private WebApplicationContext webApplicationContext;

    private MockMvc mockMvc;

    private final ObjectMapper objectMapper = new ObjectMapper().findAndRegisterModules();

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private VocabularyRepository vocabularyRepository;

    @Autowired
    private VocabularySetRepository vocabularySetRepository;

    @Autowired
    private VocabularySetItemRepository vocabularySetItemRepository;

    @Autowired
    private StudyPlanRepository studyPlanRepository;

    @Autowired
    private StudyPlanDeckRepository studyPlanDeckRepository;

    @Autowired
    private StudyProgressRepository studyProgressRepository;

    private User testUser;

    @BeforeEach
    void setUp() {
        this.mockMvc = MockMvcBuilders
                .webAppContextSetup(webApplicationContext)
                .apply(SecurityMockMvcConfigurers.springSecurity())
                .build();

        testUser = userRepository.findByEmailIgnoreCase("summary_ctrl_user@languagelearning.com")
                .orElseGet(() -> {
                    User u = new User();
                    u.setEmail("summary_ctrl_user@languagelearning.com");
                    u.setUsername("summary_ctrl_user");
                    u.setPasswordHash("$2a$10$dummyHash");
                    return userRepository.save(u);
                });
        SecurityTestUtils.setAuthenticatedUser(testUser.getId(), testUser.getEmail(), testUser.getUsername(), List.of("USER"));
    }

    @Test
    @DisplayName("GET /api/study-plans/current/today/summary returns 200 with matching count fields under 300 bytes")
    void testGetTodaySummary_MatchesTodayQueueCounts_Under300Bytes() throws Exception {
        VocabularySet deck = new VocabularySet();
        deck.setName("Summary Deck");
        deck.setUserId(testUser.getId());
        vocabularySetRepository.save(deck);

        // 3 due, 2 weak, 5 new
        for (int i = 1; i <= 10; i++) {
            Vocabulary v = new Vocabulary();
            v.setWord("word_sum_" + i);
            v.setMeaning("Nghĩa " + i);
            vocabularyRepository.save(v);
            vocabularySetItemRepository.save(new VocabularySetItem(deck.getId(), v.getId()));

            if (i <= 3) {
                StudyProgress sp = new StudyProgress(testUser.getId(), v.getId());
                sp.setCorrectCount(2);
                sp.setWrongCount(0);
                sp.setAccuracy(new BigDecimal("100.00"));
                sp.setNextReviewAt(Instant.now().minus(1, ChronoUnit.DAYS)); // Due
                studyProgressRepository.save(sp);
            } else if (i <= 5) {
                StudyProgress sp = new StudyProgress(testUser.getId(), v.getId());
                sp.setCorrectCount(1);
                sp.setWrongCount(2);
                sp.setAccuracy(new BigDecimal("33.33"));
                sp.setNextReviewAt(Instant.now().plus(5, ChronoUnit.DAYS)); // Weak
                studyProgressRepository.save(sp);
            }
        }

        StudyPlan plan = new StudyPlan();
        plan.setUserId(testUser.getId());
        plan.setName("Summary Test Plan");
        plan.setTimezone("Asia/Ho_Chi_Minh");
        plan.setStatus(StudyPlan.Status.ACTIVE);
        plan.setMaxNewWordsPerDay(3);
        plan.setMinWordsPerDay(0);
        plan.setTargetDate(LocalDate.now().plusDays(20));
        studyPlanRepository.save(plan);
        studyPlanDeckRepository.save(new StudyPlanDeck(plan.getId(), deck.getId(), 1));

        // Call /current/today/summary
        MvcResult summaryResult = mockMvc.perform(get("/api/study-plans/current/today/summary"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.dueWords").value(3))
                .andExpect(jsonPath("$.data.weakWords").value(2))
                .andExpect(jsonPath("$.data.newWords").value(3))
                .andExpect(jsonPath("$.data.totalWords").value(8))
                .andExpect(jsonPath("$.data.dueCount").value(3))
                .andExpect(jsonPath("$.data.weakCount").value(2))
                .andExpect(jsonPath("$.data.newCount").value(3))
                .andExpect(jsonPath("$.data.totalCount").value(8))
                .andReturn();

        byte[] summaryBytes = summaryResult.getResponse().getContentAsByteArray();
        assertTrue(summaryBytes.length < 350, "Summary payload must be ultra lightweight (< 350 bytes), was " + summaryBytes.length);

        // Call /current/today to compare counts
        MvcResult queueResult = mockMvc.perform(get("/api/study-plans/current/today"))
                .andExpect(status().isOk())
                .andReturn();

        Map<?, ?> sumMap = (Map<?, ?>) objectMapper.readValue(summaryBytes, Map.class).get("data");
        Map<?, ?> queueMap = (Map<?, ?>) objectMapper.readValue(queueResult.getResponse().getContentAsByteArray(), Map.class).get("data");

        assertEquals(queueMap.get("dueCount"), sumMap.get("dueCount"));
        assertEquals(queueMap.get("weakCount"), sumMap.get("weakCount"));
        assertEquals(queueMap.get("newCount"), sumMap.get("newCount"));
        assertEquals(queueMap.get("totalCount"), sumMap.get("totalCount"));
    }
}
