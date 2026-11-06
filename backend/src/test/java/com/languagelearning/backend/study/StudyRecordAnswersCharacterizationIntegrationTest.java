package com.languagelearning.backend.study;

import com.languagelearning.backend.account.User;
import com.languagelearning.backend.account.UserRepository;
import com.languagelearning.backend.common.exception.ResourceNotFoundException;
import com.languagelearning.backend.common.security.SecurityTestUtils;
import com.languagelearning.backend.deck.entity.VocabularySet;
import com.languagelearning.backend.deck.entity.VocabularySetItem;
import com.languagelearning.backend.deck.repository.VocabularySetItemRepository;
import com.languagelearning.backend.deck.repository.VocabularySetRepository;
import com.languagelearning.backend.level.XpConfig;
import com.languagelearning.backend.level.entity.UserXp;
import com.languagelearning.backend.level.entity.XpEvent;
import com.languagelearning.backend.level.repository.UserXpRepository;
import com.languagelearning.backend.level.repository.XpEventRepository;
import com.languagelearning.backend.study.dto.AnswerBatchRequest;
import com.languagelearning.backend.study.dto.AnswerItemDto;
import com.languagelearning.backend.study.dto.CreateSessionRequest;
import com.languagelearning.backend.study.dto.StudySessionResponse;
import com.languagelearning.backend.study.entity.StudyAnswer;
import com.languagelearning.backend.study.entity.StudyProgress;
import com.languagelearning.backend.study.entity.StudySession;
import com.languagelearning.backend.study.repository.StudyAnswerRepository;
import com.languagelearning.backend.study.repository.StudyProgressRepository;
import com.languagelearning.backend.study.repository.StudySessionRepository;
import com.languagelearning.backend.study.service.Sm2Service;
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

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneOffset;
import java.util.List;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest
@ActiveProfiles("test")
@Transactional
public class StudyRecordAnswersCharacterizationIntegrationTest {

    @Autowired
    private StudyService studyService;

    @Autowired
    private StudySessionRepository studySessionRepository;

    @Autowired
    private StudyAnswerRepository studyAnswerRepository;

    @Autowired
    private StudyProgressRepository studyProgressRepository;

    @Autowired
    private VocabularySetRepository vocabularySetRepository;

    @Autowired
    private VocabularySetItemRepository vocabularySetItemRepository;

    @Autowired
    private VocabularyRepository vocabularyRepository;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private UserXpRepository userXpRepository;

    @Autowired
    private XpEventRepository xpEventRepository;

    @Autowired
    private JdbcTemplate jdbcTemplate;

    private User testUser;
    private VocabularySet testDeck;
    private Vocabulary v1;
    private Vocabulary v2;
    private Vocabulary v3;
    private Vocabulary vForeign;

    @BeforeEach
    void setUp() {
        testUser = userRepository.findAll().stream().findFirst().orElseGet(() -> {
            User u = new User();
            u.setEmail("study_char_user@test.com");
            u.setUsername("study_char_user");
            u.setPasswordHash("hashed");
            return userRepository.save(u);
        });
        SecurityTestUtils.setAuthenticatedUser(testUser.getId(), testUser.getEmail(), testUser.getUsername(), List.of("USER"));

        // Create vocabularies
        v1 = createVocab("char_word_1", "meaning 1");
        v2 = createVocab("char_word_2", "meaning 2");
        v3 = createVocab("char_word_3", "meaning 3");
        vForeign = createVocab("char_word_foreign", "foreign");

        // Create deck with v1, v2, v3
        testDeck = new VocabularySet(testUser.getId(), null, "Char Study Deck", "Desc");
        testDeck = vocabularySetRepository.save(testDeck);
        vocabularySetItemRepository.save(new VocabularySetItem(testDeck.getId(), v1.getId()));
        vocabularySetItemRepository.save(new VocabularySetItem(testDeck.getId(), v2.getId()));
        vocabularySetItemRepository.save(new VocabularySetItem(testDeck.getId(), v3.getId()));

        // Clean user XP & events for testUser
        jdbcTemplate.update("DELETE FROM xp_events WHERE user_id = ?", testUser.getId());
        jdbcTemplate.update("INSERT INTO user_xp (user_id, total_xp, updated_at) VALUES (?, 0, NOW()) ON CONFLICT (user_id) DO UPDATE SET total_xp = 0, updated_at = NOW()", testUser.getId());
    }

    private Vocabulary createVocab(String word, String meaning) {
        Vocabulary v = new Vocabulary();
        v.setWord(word);
        v.setMeaning(meaning);
        v.setWordType("noun");
        v.setPronunciation("/p/");
        v.setExampleSentence("ex");
        return vocabularyRepository.save(v);
    }

    @Test
    @DisplayName("1. Gửi batch bình thường (cả đúng lẫn sai, cập nhật session và study_progress)")
    void testNormalBatchMixedResults() {
        StudySessionResponse sessionRes = studyService.createSession(testUser.getId(), new CreateSessionRequest(testDeck.getId(), "VI_TO_EN", 10, "RANDOM"));
        Long sessionId = sessionRes.getId();

        String c1 = UUID.randomUUID().toString();
        String c2 = UUID.randomUUID().toString();
        AnswerItemDto a1 = new AnswerItemDto(c1, v1.getId(), "VI_TO_EN", "CORRECT", false, "answer 1", 1);
        AnswerItemDto a2 = new AnswerItemDto(c2, v2.getId(), "VI_TO_EN", "WRONG", false, "wrong ans", 1);
        AnswerBatchRequest req = new AnswerBatchRequest(List.of(a1, a2));

        StudySessionResponse res = studyService.recordAnswers(testUser.getId(), sessionId, req);

        assertEquals(2, res.getTotalQuestions());
        assertEquals(1, res.getCorrectAnswers());
        assertEquals(1, res.getWrongAnswers());

        List<StudyAnswer> answers = studyAnswerRepository.findBySessionId(sessionId);
        assertEquals(2, answers.size());

        // Check study_progress
        StudyProgress p1 = studyProgressRepository.findByUserIdAndVocabularyId(testUser.getId(), v1.getId()).orElseThrow();
        assertEquals(1, p1.getCorrectCount());
        assertEquals(0, p1.getWrongCount());
        assertEquals(1, p1.getCurrentStreak());
        assertEquals(new BigDecimal("100.00"), p1.getAccuracy());
        assertTrue(p1.getIntervalDays() >= 1);

        StudyProgress p2 = studyProgressRepository.findByUserIdAndVocabularyId(testUser.getId(), v2.getId()).orElseThrow();
        assertEquals(0, p2.getCorrectCount());
        assertEquals(1, p2.getWrongCount());
        assertEquals(0, p2.getCurrentStreak());
        assertEquals(new BigDecimal("0.00"), p2.getAccuracy());
    }

    @Test
    @DisplayName("2. Trùng clientAnswerId trong cùng batch: chỉ 1 bản ghi được lưu")
    void testDuplicateClientAnswerIdInSameBatch() {
        StudySessionResponse sessionRes = studyService.createSession(testUser.getId(), new CreateSessionRequest(testDeck.getId(), "VI_TO_EN", 10, "RANDOM"));
        Long sessionId = sessionRes.getId();

        String dupClientId = "dup-client-" + UUID.randomUUID();
        AnswerItemDto a1 = new AnswerItemDto(dupClientId, v1.getId(), "VI_TO_EN", "CORRECT", false, "ans 1", 1);
        AnswerItemDto a2 = new AnswerItemDto(dupClientId, v1.getId(), "VI_TO_EN", "CORRECT", false, "ans 1", 1);
        AnswerBatchRequest req = new AnswerBatchRequest(List.of(a1, a2));

        StudySessionResponse res = studyService.recordAnswers(testUser.getId(), sessionId, req);

        assertEquals(1, res.getTotalQuestions());
        assertEquals(1, res.getCorrectAnswers());
        assertEquals(0, res.getWrongAnswers());

        List<StudyAnswer> answers = studyAnswerRepository.findBySessionId(sessionId);
        assertEquals(1, answers.size());
    }

    @Test
    @DisplayName("3. Trùng clientAnswerId từ batch trước: idempotent không ghi đúp")
    void testDuplicateClientAnswerIdAcrossBatches() {
        StudySessionResponse sessionRes = studyService.createSession(testUser.getId(), new CreateSessionRequest(testDeck.getId(), "VI_TO_EN", 10, "RANDOM"));
        Long sessionId = sessionRes.getId();

        String dupClientId = "dup-batch-" + UUID.randomUUID();
        AnswerItemDto a1 = new AnswerItemDto(dupClientId, v1.getId(), "VI_TO_EN", "CORRECT", false, "ans 1", 1);
        studyService.recordAnswers(testUser.getId(), sessionId, new AnswerBatchRequest(List.of(a1)));

        // Resend same clientAnswerId
        AnswerItemDto a1Retry = new AnswerItemDto(dupClientId, v1.getId(), "VI_TO_EN", "CORRECT", false, "ans 1", 1);
        StudySessionResponse res = studyService.recordAnswers(testUser.getId(), sessionId, new AnswerBatchRequest(List.of(a1Retry)));

        assertEquals(1, res.getTotalQuestions());
        assertEquals(1, res.getCorrectAnswers());
        assertEquals(1, studyAnswerRepository.findBySessionId(sessionId).size());
    }

    @Test
    @DisplayName("4. Override sửa sai: câu trước sai, câu sau override=true -> chuyển thành đúng và sửa progress")
    void testOverrideWrongAnswerToCorrect() {
        StudySessionResponse sessionRes = studyService.createSession(testUser.getId(), new CreateSessionRequest(testDeck.getId(), "VI_TO_EN", 10, "RANDOM"));
        Long sessionId = sessionRes.getId();

        String overrideClientId = "override-" + UUID.randomUUID();
        AnswerItemDto wrongAns = new AnswerItemDto(overrideClientId, v1.getId(), "VI_TO_EN", "WRONG", false, "bad answer", 1);
        studyService.recordAnswers(testUser.getId(), sessionId, new AnswerBatchRequest(List.of(wrongAns)));

        StudySession sAfterWrong = studySessionRepository.findById(sessionId).orElseThrow();
        assertEquals(1, sAfterWrong.getTotalQuestions());
        assertEquals(0, sAfterWrong.getCorrectAnswers());
        assertEquals(1, sAfterWrong.getWrongAnswers());

        // Now client sends override for the same clientAnswerId
        AnswerItemDto overrideAns = new AnswerItemDto(overrideClientId, v1.getId(), "VI_TO_EN", "WRONG", true, "bad answer", 1);
        StudySessionResponse res = studyService.recordAnswers(testUser.getId(), sessionId, new AnswerBatchRequest(List.of(overrideAns)));

        assertEquals(1, res.getTotalQuestions());
        assertEquals(1, res.getCorrectAnswers());
        assertEquals(0, res.getWrongAnswers());

        StudyAnswer stored = studyAnswerRepository.findBySessionIdAndClientAnswerId(sessionId, overrideClientId).orElseThrow();
        assertTrue(stored.isCorrect());
        assertTrue(stored.isOverride());

        StudyProgress p = studyProgressRepository.findByUserIdAndVocabularyId(testUser.getId(), v1.getId()).orElseThrow();
        assertEquals(1, p.getCorrectCount());
        assertEquals(0, p.getWrongCount());
        assertEquals(new BigDecimal("100.00"), p.getAccuracy());
    }

    @Test
    @DisplayName("5. Vocabulary không thuộc deck ném ResourceNotFoundException và rollback")
    void testForeignVocabularyRollback() {
        StudySessionResponse sessionRes = studyService.createSession(testUser.getId(), new CreateSessionRequest(testDeck.getId(), "VI_TO_EN", 10, "RANDOM"));
        Long sessionId = sessionRes.getId();

        AnswerItemDto validAns = new AnswerItemDto("valid-" + UUID.randomUUID(), v1.getId(), "VI_TO_EN", "CORRECT", false, "ans", 1);
        AnswerItemDto foreignAns = new AnswerItemDto("foreign-" + UUID.randomUUID(), vForeign.getId(), "VI_TO_EN", "CORRECT", false, "ans", 1);

        assertThrows(ResourceNotFoundException.class, () ->
                studyService.recordAnswers(testUser.getId(), sessionId, new AnswerBatchRequest(List.of(validAns, foreignAns)))
        );

        // Verify rollback: no answer saved
        assertEquals(0, studyAnswerRepository.findBySessionId(sessionId).size());
    }

    @Test
    @DisplayName("6. Session không gắn deck (deckId = null) cho phép học bất kỳ từ nào")
    void testSessionWithoutDeckAllowsAnyVocabulary() {
        StudySession session = studySessionRepository.save(new StudySession(testUser.getId(), null, "RANDOM"));
        Long sessionId = session.getId();

        AnswerItemDto a1 = new AnswerItemDto("no-deck-" + UUID.randomUUID(), vForeign.getId(), "RANDOM", "CORRECT", false, "ans", 1);
        StudySessionResponse res = studyService.recordAnswers(testUser.getId(), sessionId, new AnswerBatchRequest(List.of(a1)));

        assertEquals(1, res.getTotalQuestions());
        assertEquals(1, res.getCorrectAnswers());
    }

    @Test
    @DisplayName("7. SM-2 ratings (AGAIN, HARD, GOOD, EASY) cập nhật study_progress")
    void testSm2Ratings() {
        StudySessionResponse sessionRes = studyService.createSession(testUser.getId(), new CreateSessionRequest(testDeck.getId(), "VI_TO_EN", 10, "RANDOM"));
        Long sessionId = sessionRes.getId();

        AnswerItemDto aEasy = new AnswerItemDto("easy-" + UUID.randomUUID(), v1.getId(), "VI_TO_EN", "CORRECT", false, "easy", 1);
        aEasy.setRating("EASY");
        AnswerItemDto aAgain = new AnswerItemDto("again-" + UUID.randomUUID(), v2.getId(), "VI_TO_EN", "WRONG", false, "again", 1);
        aAgain.setRating("AGAIN");

        studyService.recordAnswers(testUser.getId(), sessionId, new AnswerBatchRequest(List.of(aEasy, aAgain)));

        StudyProgress pEasy = studyProgressRepository.findByUserIdAndVocabularyId(testUser.getId(), v1.getId()).orElseThrow();
        assertEquals(4, pEasy.getIntervalDays()); // First repetition EASY interval = 4
        assertEquals(new BigDecimal("2.65"), pEasy.getEaseFactor()); // 2.50 + 0.15 = 2.65
        assertEquals(1, pEasy.getRepetitions());

        StudyProgress pAgain = studyProgressRepository.findByUserIdAndVocabularyId(testUser.getId(), v2.getId()).orElseThrow();
        assertEquals(1, pAgain.getIntervalDays());
        assertEquals(new BigDecimal("2.30"), pAgain.getEaseFactor()); // 2.50 - 0.20 = 2.30
        assertEquals(0, pAgain.getRepetitions());
    }

    @Test
    @DisplayName("8. Gửi 2 câu cùng 1 vocabularyId trong batch: SM-2 tính nối tiếp")
    void testMultipleAnswersForSameVocabularySequentialSm2() {
        StudySessionResponse sessionRes = studyService.createSession(testUser.getId(), new CreateSessionRequest(testDeck.getId(), "VI_TO_EN", 10, "RANDOM"));
        Long sessionId = sessionRes.getId();

        // 1st answer: AGAIN (wrong)
        AnswerItemDto a1 = new AnswerItemDto("seq1-" + UUID.randomUUID(), v1.getId(), "VI_TO_EN", "WRONG", false, "bad", 1);
        a1.setRating("AGAIN");
        // 2nd answer: GOOD (correct retry)
        AnswerItemDto a2 = new AnswerItemDto("seq2-" + UUID.randomUUID(), v1.getId(), "VI_TO_EN", "CORRECT", false, "good", 2);
        a2.setRating("GOOD");

        studyService.recordAnswers(testUser.getId(), sessionId, new AnswerBatchRequest(List.of(a1, a2)));

        StudyProgress p = studyProgressRepository.findByUserIdAndVocabularyId(testUser.getId(), v1.getId()).orElseThrow();
        assertEquals(1, p.getCorrectCount());
        assertEquals(1, p.getWrongCount());
        assertEquals(1, p.getCurrentStreak()); // streak reset on wrong, incremented on correct -> 1
        assertEquals(1, p.getRepetitions()); // rep reset to 0 on AGAIN, incremented to 1 on GOOD
        assertEquals(1, p.getIntervalDays());
        // EF: started 2.50 -> AGAIN (-0.20 = 2.30) -> GOOD (+0.10 = 2.40)
        assertEquals(new BigDecimal("2.40"), p.getEaseFactor());
    }

    @Test
    @DisplayName("9. attemptNo và answeredAt được lưu chính xác")
    void testAttemptNoAndTimestamps() {
        StudySessionResponse sessionRes = studyService.createSession(testUser.getId(), new CreateSessionRequest(testDeck.getId(), "VI_TO_EN", 10, "RANDOM"));
        Long sessionId = sessionRes.getId();

        AnswerItemDto a = new AnswerItemDto("attempt-" + UUID.randomUUID(), v1.getId(), "VI_TO_EN", "CORRECT", false, "ans", 3);
        studyService.recordAnswers(testUser.getId(), sessionId, new AnswerBatchRequest(List.of(a)));

        StudyAnswer stored = studyAnswerRepository.findBySessionId(sessionId).get(0);
        assertEquals(3, stored.getAttemptNo());
        assertNotNull(stored.getAnsweredAt());
    }

    @Test
    @DisplayName("10. XP handling: chưa chạm cap, chạm cap giữa chừng, và đã chạm cap")
    void testXpScenarios() {
        StudySessionResponse sessionRes = studyService.createSession(testUser.getId(), new CreateSessionRequest(testDeck.getId(), "VI_TO_EN", 10, "RANDOM"));
        Long sessionId = sessionRes.getId();

        // Scenario 1: User has 0 XP, answers 1st attempt correct -> +5 XP
        AnswerItemDto a1 = new AnswerItemDto("xp1-" + UUID.randomUUID(), v1.getId(), "VI_TO_EN", "CORRECT", false, "ans", 1);
        studyService.recordAnswers(testUser.getId(), sessionId, new AnswerBatchRequest(List.of(a1)));

        long totalXp1 = jdbcTemplate.queryForObject("SELECT total_xp FROM user_xp WHERE user_id = ?", Long.class, testUser.getId());
        assertEquals(5L, totalXp1);

        // Scenario 2: Set user XP events to 497 (quota remaining = 3). Next correct answer requested 5 XP -> only 3 XP awarded
        Instant now = Instant.now();
        ZoneOffset offset = ZoneOffset.UTC;
        LocalDate today = now.atOffset(offset).toLocalDate();
        Instant todayStart = today.atStartOfDay().toInstant(offset);

        jdbcTemplate.update("DELETE FROM xp_events WHERE user_id = ?", testUser.getId());
        jdbcTemplate.update("INSERT INTO xp_events (user_id, source_type, source_key, xp, created_at) VALUES (?, 'TEST', 'pre_cap', 497, ?)", testUser.getId(), java.sql.Timestamp.from(todayStart.plusSeconds(10)));
        jdbcTemplate.update("UPDATE user_xp SET total_xp = 497 WHERE user_id = ?", testUser.getId());

        AnswerItemDto a2 = new AnswerItemDto("xp2-" + UUID.randomUUID(), v2.getId(), "VI_TO_EN", "CORRECT", false, "ans", 1);
        studyService.recordAnswers(testUser.getId(), sessionId, new AnswerBatchRequest(List.of(a2)));

        long totalXp2 = jdbcTemplate.queryForObject("SELECT total_xp FROM user_xp WHERE user_id = ?", Long.class, testUser.getId());
        assertEquals(500L, totalXp2); // 497 + 3 = 500

        // Scenario 3: User already at daily cap (500). Next correct answer -> 0 XP awarded
        AnswerItemDto a3 = new AnswerItemDto("xp3-" + UUID.randomUUID(), v3.getId(), "VI_TO_EN", "CORRECT", false, "ans", 1);
        studyService.recordAnswers(testUser.getId(), sessionId, new AnswerBatchRequest(List.of(a3)));

        long totalXp3 = jdbcTemplate.queryForObject("SELECT total_xp FROM user_xp WHERE user_id = ?", Long.class, testUser.getId());
        assertEquals(500L, totalXp3); // Cap maintained at 500
    }
}
