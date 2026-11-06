package com.languagelearning.backend.study;

import com.languagelearning.backend.account.User;
import com.languagelearning.backend.account.UserRepository;
import com.languagelearning.backend.common.security.SecurityTestUtils;
import com.languagelearning.backend.deck.entity.VocabularySet;
import com.languagelearning.backend.deck.entity.VocabularySetItem;
import com.languagelearning.backend.deck.repository.VocabularySetItemRepository;
import com.languagelearning.backend.deck.repository.VocabularySetRepository;
import com.languagelearning.backend.study.dto.AnswerBatchRequest;
import com.languagelearning.backend.study.dto.AnswerItemDto;
import com.languagelearning.backend.study.dto.CreateSessionRequest;
import com.languagelearning.backend.study.dto.StudySessionResponse;
import com.languagelearning.backend.study.entity.StudyAnswer;
import com.languagelearning.backend.study.entity.StudyProgress;
import com.languagelearning.backend.study.repository.StudyAnswerRepository;
import com.languagelearning.backend.study.repository.StudyProgressRepository;
import com.languagelearning.backend.study.repository.StudySessionRepository;
import com.languagelearning.backend.study.service.StudyService;
import com.languagelearning.backend.term.entity.Vocabulary;
import com.languagelearning.backend.term.repository.VocabularyRepository;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.ActiveProfiles;

import java.util.List;
import java.util.UUID;
import java.util.concurrent.*;
import java.util.concurrent.atomic.AtomicReference;

import static org.junit.jupiter.api.Assertions.*;

/**
 * Concurrency test for recordAnswersBatch (no class-level @Transactional to allow multiple concurrent DB transactions).
 */
@SpringBootTest
@ActiveProfiles("test")
public class StudyRecordAnswersConcurrencyIntegrationTest {

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
    private JdbcTemplate jdbcTemplate;

    private User testUser;
    private VocabularySet testDeck;
    private Vocabulary testVocab;

    @BeforeEach
    void setUp() {
        testUser = userRepository.findByEmailIgnoreCase("concurrent_test_user@test.com").orElseGet(() -> {
            User u = new User();
            u.setEmail("concurrent_test_user@test.com");
            u.setUsername("concurrent_test_user");
            u.setPasswordHash("hashed");
            return userRepository.save(u);
        });

        testVocab = new Vocabulary();
        testVocab.setWord("concurrent_word_" + UUID.randomUUID());
        testVocab.setMeaning("concurrent meaning");
        testVocab = vocabularyRepository.save(testVocab);

        testDeck = new VocabularySet(testUser.getId(), null, "Concurrent Deck", "Desc");
        testDeck = vocabularySetRepository.save(testDeck);
        vocabularySetItemRepository.save(new VocabularySetItem(testDeck.getId(), testVocab.getId()));

        jdbcTemplate.update("DELETE FROM study_progress WHERE user_id = ? AND vocabulary_id = ?", testUser.getId(), testVocab.getId());
        jdbcTemplate.update("DELETE FROM xp_events WHERE user_id = ?", testUser.getId());
        jdbcTemplate.update("INSERT INTO user_xp (user_id, total_xp, updated_at) VALUES (?, 0, NOW()) ON CONFLICT (user_id) DO UPDATE SET total_xp = 0, updated_at = NOW()", testUser.getId());
    }

    @AfterEach
    void tearDown() {
        if (testDeck != null) {
            jdbcTemplate.update("DELETE FROM study_answers WHERE vocabulary_id = ?", testVocab.getId());
            jdbcTemplate.update("DELETE FROM study_sessions WHERE vocabulary_set_id = ?", testDeck.getId());
            jdbcTemplate.update("DELETE FROM vocabulary_set_items WHERE vocabulary_set_id = ?", testDeck.getId());
            vocabularySetRepository.deleteById(testDeck.getId());
        }
        if (testVocab != null) {
            jdbcTemplate.update("DELETE FROM study_progress WHERE vocabulary_id = ?", testVocab.getId());
            vocabularyRepository.deleteById(testVocab.getId());
        }
    }

    @Test
    @DisplayName("(a) Hai request gần như cùng lúc khác clientAnswerId: review_count và correct_count phải bằng tổng 2 request")
    void testConcurrentRequestsDifferentClientAnswerIds_SumAccurate() throws Exception {
        SecurityTestUtils.setAuthenticatedUser(testUser.getId(), testUser.getEmail(), testUser.getUsername(), List.of("USER"));
        StudySessionResponse s1 = studyService.createSession(testUser.getId(), new CreateSessionRequest(testDeck.getId(), "VI_TO_EN", 10, "RANDOM"));
        StudySessionResponse s2 = studyService.createSession(testUser.getId(), new CreateSessionRequest(testDeck.getId(), "VI_TO_EN", 10, "RANDOM"));

        int threadCount = 2;
        ExecutorService executor = Executors.newFixedThreadPool(threadCount);
        CountDownLatch readyLatch = new CountDownLatch(threadCount);
        CountDownLatch startLatch = new CountDownLatch(1);

        String clientAns1 = "client-concurrent-a1-" + UUID.randomUUID();
        String clientAns2 = "client-concurrent-a2-" + UUID.randomUUID();

        Future<?> f1 = executor.submit(() -> {
            SecurityTestUtils.setAuthenticatedUser(testUser.getId(), testUser.getEmail(), testUser.getUsername(), List.of("USER"));
            readyLatch.countDown();
            try {
                startLatch.await();
                AnswerItemDto a1 = new AnswerItemDto(clientAns1, testVocab.getId(), "VI_TO_EN", "CORRECT", false, "ans", 1);
                studyService.recordAnswers(testUser.getId(), s1.getId(), new AnswerBatchRequest(List.of(a1)));
            } catch (Exception e) {
                throw new RuntimeException(e);
            }
        });

        Future<?> f2 = executor.submit(() -> {
            SecurityTestUtils.setAuthenticatedUser(testUser.getId(), testUser.getEmail(), testUser.getUsername(), List.of("USER"));
            readyLatch.countDown();
            try {
                startLatch.await();
                AnswerItemDto a2 = new AnswerItemDto(clientAns2, testVocab.getId(), "VI_TO_EN", "CORRECT", false, "ans", 1);
                studyService.recordAnswers(testUser.getId(), s2.getId(), new AnswerBatchRequest(List.of(a2)));
            } catch (Exception e) {
                throw new RuntimeException(e);
            }
        });

        readyLatch.await(5, TimeUnit.SECONDS);
        startLatch.countDown(); // Fire both requests at the exact same instant

        f1.get(10, TimeUnit.SECONDS);
        f2.get(10, TimeUnit.SECONDS);
        executor.shutdown();

        // Check study_progress in DB
        StudyProgress progress = studyProgressRepository.findByUserIdAndVocabularyId(testUser.getId(), testVocab.getId())
                .orElseThrow(() -> new AssertionError("StudyProgress must exist"));

        assertEquals(2, progress.getCorrectCount(), "Both concurrent answers must be summed into correct_count");
        assertEquals(0, progress.getWrongCount());
        assertEquals(2, progress.getCorrectCount() + progress.getWrongCount());

        List<StudyAnswer> answers = studyAnswerRepository.findAll().stream()
                .filter(a -> a.getVocabularyId().equals(testVocab.getId()))
                .toList();
        assertEquals(2, answers.size(), "Both answers must be recorded in study_answers");
    }

    @Test
    @DisplayName("(b) Hai request gần như cùng lúc cùng clientAnswerId (retry): chỉ được tính một lần")
    void testConcurrentRequestsSameClientAnswerId_IdempotentCountedOnce() throws Exception {
        SecurityTestUtils.setAuthenticatedUser(testUser.getId(), testUser.getEmail(), testUser.getUsername(), List.of("USER"));
        StudySessionResponse sessionRes = studyService.createSession(testUser.getId(), new CreateSessionRequest(testDeck.getId(), "VI_TO_EN", 10, "RANDOM"));
        Long sessionId = sessionRes.getId();

        int threadCount = 2;
        ExecutorService executor = Executors.newFixedThreadPool(threadCount);
        CountDownLatch readyLatch = new CountDownLatch(threadCount);
        CountDownLatch startLatch = new CountDownLatch(1);

        String sameClientAnswerId = "retry-same-client-id-" + UUID.randomUUID();

        AtomicReference<Exception> errorRef1 = new AtomicReference<>();
        AtomicReference<Exception> errorRef2 = new AtomicReference<>();

        Future<?> f1 = executor.submit(() -> {
            SecurityTestUtils.setAuthenticatedUser(testUser.getId(), testUser.getEmail(), testUser.getUsername(), List.of("USER"));
            readyLatch.countDown();
            try {
                startLatch.await();
                AnswerItemDto a = new AnswerItemDto(sameClientAnswerId, testVocab.getId(), "VI_TO_EN", "CORRECT", false, "ans", 1);
                studyService.recordAnswers(testUser.getId(), sessionId, new AnswerBatchRequest(List.of(a)));
            } catch (Exception e) {
                errorRef1.set(e);
            }
        });

        Future<?> f2 = executor.submit(() -> {
            SecurityTestUtils.setAuthenticatedUser(testUser.getId(), testUser.getEmail(), testUser.getUsername(), List.of("USER"));
            readyLatch.countDown();
            try {
                startLatch.await();
                AnswerItemDto a = new AnswerItemDto(sameClientAnswerId, testVocab.getId(), "VI_TO_EN", "CORRECT", false, "ans", 1);
                studyService.recordAnswers(testUser.getId(), sessionId, new AnswerBatchRequest(List.of(a)));
            } catch (Exception e) {
                errorRef2.set(e);
            }
        });

        readyLatch.await(5, TimeUnit.SECONDS);
        startLatch.countDown(); // Fire both requests at the exact same instant

        f1.get(10, TimeUnit.SECONDS);
        f2.get(10, TimeUnit.SECONDS);
        executor.shutdown();

        assertNull(errorRef1.get(), "Thread 1 should complete without error: " + errorRef1.get());
        assertNull(errorRef2.get(), "Thread 2 should complete without error: " + errorRef2.get());

        // Check study_progress in DB: MUST BE EXACTLY 1!
        StudyProgress progress = studyProgressRepository.findByUserIdAndVocabularyId(testUser.getId(), testVocab.getId())
                .orElseThrow(() -> new AssertionError("StudyProgress must exist"));

        assertEquals(1, progress.getCorrectCount(), "Retry with same clientAnswerId must ONLY be counted once!");
        assertEquals(0, progress.getWrongCount());

        List<StudyAnswer> answers = studyAnswerRepository.findBySessionId(sessionId);
        assertEquals(1, answers.size(), "Only 1 answer must be inserted into study_answers for the same clientAnswerId");
    }
}
