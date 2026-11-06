package com.languagelearning.backend.study;

import com.languagelearning.backend.account.User;
import com.languagelearning.backend.account.UserRepository;
import com.languagelearning.backend.common.exception.ValidationException;
import com.languagelearning.backend.common.security.SecurityTestUtils;
import com.languagelearning.backend.deck.entity.VocabularySet;
import com.languagelearning.backend.deck.entity.VocabularySetItem;
import com.languagelearning.backend.deck.repository.VocabularySetItemRepository;
import com.languagelearning.backend.deck.repository.VocabularySetRepository;
import com.languagelearning.backend.study.dto.CreateSessionRequest;
import com.languagelearning.backend.study.dto.StudySessionResponse;
import com.languagelearning.backend.study.entity.StudyPlan;
import com.languagelearning.backend.study.entity.StudyPlanDeck;
import com.languagelearning.backend.study.entity.StudyProgress;
import com.languagelearning.backend.study.repository.StudyPlanDeckRepository;
import com.languagelearning.backend.study.repository.StudyPlanRepository;
import com.languagelearning.backend.study.repository.StudyProgressRepository;
import com.languagelearning.backend.study.service.StudyPlanService;
import com.languagelearning.backend.study.service.StudyService;
import com.languagelearning.backend.term.entity.Vocabulary;
import com.languagelearning.backend.term.repository.VocabularyRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest
@ActiveProfiles("test")
@Transactional
public class StudyPlanHardGateIntegrationTest {

    @Autowired
    private StudyPlanService studyPlanService;

    @Autowired
    private StudyService studyService;

    @Autowired
    private StudyPlanRepository studyPlanRepository;

    @Autowired
    private StudyPlanDeckRepository studyPlanDeckRepository;

    @Autowired
    private VocabularySetRepository vocabularySetRepository;

    @Autowired
    private VocabularySetItemRepository vocabularySetItemRepository;

    @Autowired
    private VocabularyRepository vocabularyRepository;

    @Autowired
    private StudyProgressRepository studyProgressRepository;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private JdbcTemplate jdbcTemplate;

    private User testUser;
    private VocabularySet planDeck;
    private VocabularySet otherDeck;
    private Vocabulary v1;

    @BeforeEach
    void setUp() {
        testUser = userRepository.findAll().stream().findFirst().orElseGet(() -> {
            User u = new User();
            u.setEmail("gate_user@test.com");
            u.setUsername("gate_user");
            u.setPasswordHash("hashed");
            return userRepository.save(u);
        });
        SecurityTestUtils.setAuthenticatedUser(testUser.getId(), testUser.getEmail(), testUser.getUsername(), List.of("USER"));

        v1 = new Vocabulary();
        v1.setWord("gate_word_1");
        v1.setMeaning("gate word 1");
        v1.setWordType("noun");
        v1 = vocabularyRepository.save(v1);

        planDeck = vocabularySetRepository.save(new VocabularySet(testUser.getId(), null, "Plan Deck", "Desc"));
        vocabularySetItemRepository.save(new VocabularySetItem(planDeck.getId(), v1.getId()));

        otherDeck = vocabularySetRepository.save(new VocabularySet(testUser.getId(), null, "Other Deck", "Desc"));
        vocabularySetItemRepository.save(new VocabularySetItem(otherDeck.getId(), v1.getId()));
    }

    @Test
    @DisplayName("1. User không có active plan -> isHardGateBlocking trả về false")
    void testNoActivePlanNotBlocking() {
        assertFalse(studyPlanService.isHardGateBlocking(testUser.getId()));

        // createSession for other deck should succeed
        StudySessionResponse res = studyService.createSession(testUser.getId(), new CreateSessionRequest(otherDeck.getId(), "VI_TO_EN", 10, "RANDOM"));
        assertNotNull(res);
    }

    @Test
    @DisplayName("2. User có active plan nhưng hardGateEnabled = false -> isHardGateBlocking trả về false")
    void testActivePlanWithoutHardGateNotBlocking() {
        StudyPlan plan = new StudyPlan(testUser.getId(), "Open Plan", LocalDate.now().plusMonths(1), 20, 5, "Asia/Ho_Chi_Minh");
        plan.setHardGateEnabled(false);
        plan.setStatus(StudyPlan.Status.ACTIVE);
        plan = studyPlanRepository.save(plan);
        studyPlanDeckRepository.save(new StudyPlanDeck(plan.getId(), planDeck.getId(), 1));

        assertFalse(studyPlanService.isHardGateBlocking(testUser.getId()));

        StudySessionResponse res = studyService.createSession(testUser.getId(), new CreateSessionRequest(otherDeck.getId(), "VI_TO_EN", 10, "RANDOM"));
        assertNotNull(res);
    }

    @Test
    @DisplayName("3. User có active plan hardGateEnabled = true và còn từ mới -> isHardGateBlocking trả về true, chặn createSession")
    void testActivePlanWithHardGateAndNewCardsBlocks() {
        StudyPlan plan = new StudyPlan(testUser.getId(), "Gated Plan", LocalDate.now().plusMonths(1), 20, 5, "Asia/Ho_Chi_Minh");
        plan.setHardGateEnabled(true);
        plan.setStatus(StudyPlan.Status.ACTIVE);
        plan = studyPlanRepository.save(plan);
        studyPlanDeckRepository.save(new StudyPlanDeck(plan.getId(), planDeck.getId(), 1));

        assertTrue(studyPlanService.isHardGateBlocking(testUser.getId()));

        ValidationException ex = assertThrows(ValidationException.class, () ->
                studyService.createSession(testUser.getId(), new CreateSessionRequest(otherDeck.getId(), "VI_TO_EN", 10, "RANDOM"))
        );
        assertEquals("HARD_GATE_ACTIVE", ex.getErrorCode());
    }

    @Test
    @DisplayName("4. User có active plan hardGateEnabled = true nhưng đã hoàn thành từ hôm nay -> isHardGateBlocking trả về false")
    void testActivePlanWithHardGateCompletedTodayUnblocks() {
        StudyPlan plan = new StudyPlan(testUser.getId(), "Gated Plan 2", LocalDate.now().plusMonths(1), 20, 5, "Asia/Ho_Chi_Minh");
        plan.setHardGateEnabled(true);
        plan.setStatus(StudyPlan.Status.ACTIVE);
        plan = studyPlanRepository.save(plan);
        studyPlanDeckRepository.save(new StudyPlanDeck(plan.getId(), planDeck.getId(), 1));

        // Mark v1 as studied and scheduled far in future (not due, not weak)
        StudyProgress sp = new StudyProgress(testUser.getId(), v1.getId());
        sp.setCorrectCount(5);
        sp.setWrongCount(0);
        sp.setNextReviewAt(Instant.now().plus(10, ChronoUnit.DAYS));
        sp.setMemoryLevel(2);
        sp.setIntervalDays(10);
        studyProgressRepository.save(sp);

        assertFalse(studyPlanService.isHardGateBlocking(testUser.getId()));

        StudySessionResponse res = studyService.createSession(testUser.getId(), new CreateSessionRequest(otherDeck.getId(), "VI_TO_EN", 10, "RANDOM"));
        assertNotNull(res);
    }
}
