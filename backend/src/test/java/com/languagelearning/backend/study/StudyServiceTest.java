package com.languagelearning.backend.study;

import com.languagelearning.backend.common.exception.ResourceNotFoundException;
import com.languagelearning.backend.common.exception.ValidationException;
import com.languagelearning.backend.deck.entity.VocabularySet;
import com.languagelearning.backend.deck.repository.VocabularySetItemRepository;
import com.languagelearning.backend.deck.repository.VocabularySetRepository;
import com.languagelearning.backend.study.dto.*;
import com.languagelearning.backend.study.entity.StudyAnswer;
import com.languagelearning.backend.study.entity.StudySession;
import com.languagelearning.backend.study.repository.StudyAnswerRepository;
import com.languagelearning.backend.study.repository.StudyProgressRepository;
import com.languagelearning.backend.study.repository.StudySessionRepository;
import com.languagelearning.backend.study.service.StudyPlanService;
import com.languagelearning.backend.study.service.StudyService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.Instant;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class StudyServiceTest {

    @Mock
    private StudySessionRepository studySessionRepository;

    @Mock
    private StudyAnswerRepository studyAnswerRepository;

    @Mock
    private StudyProgressRepository studyProgressRepository;

    @Mock
    private VocabularySetRepository vocabularySetRepository;

    @Mock
    private VocabularySetItemRepository vocabularySetItemRepository;

    @Mock
    private StudyPlanService studyPlanService;

    @InjectMocks
    private StudyService studyService;

    private Long userId;
    private Long deckId;
    private VocabularySet deck;

    @BeforeEach
    void setUp() {
        userId = 1L;
        deckId = 10L;
        deck = new VocabularySet(userId, null, "Test Deck", "Description");
        deck.setId(deckId);
    }

    @Test
    @DisplayName("createSession: Success when deck exists and has cards")
    void createSession_Success() {
        when(vocabularySetRepository.findByIdAndUserId(deckId, userId)).thenReturn(Optional.of(deck));
        when(vocabularySetItemRepository.countByIdVocabularySetId(deckId)).thenReturn(5L);
        when(studySessionRepository.save(any(StudySession.class))).thenAnswer(inv -> {
            StudySession s = inv.getArgument(0);
            s.setId(100L);
            return s;
        });

        CreateSessionRequest req = new CreateSessionRequest(deckId, "VI_TO_EN", 5, "RANDOM");
        StudySessionResponse res = studyService.createSession(userId, req);

        assertNotNull(res);
        assertEquals(100L, res.getId());
        assertEquals(deckId, res.getDeckId());
        assertEquals("VI_TO_EN", res.getDirection());
        verify(studySessionRepository).save(any(StudySession.class));
    }

    @Test
    @DisplayName("createSession: Fails with 404 when deck does not belong to user")
    void createSession_DeckNotFound_ThrowsResourceNotFoundException() {
        when(vocabularySetRepository.findByIdAndUserId(deckId, userId)).thenReturn(Optional.empty());

        CreateSessionRequest req = new CreateSessionRequest(deckId, "VI_TO_EN", 5, "RANDOM");
        assertThrows(ResourceNotFoundException.class, () -> studyService.createSession(userId, req));
        verify(studySessionRepository, never()).save(any());
    }

    @Test
    @DisplayName("createSession: Fails when deck has 0 cards")
    void createSession_EmptyDeck_ThrowsValidationException() {
        when(vocabularySetRepository.findByIdAndUserId(deckId, userId)).thenReturn(Optional.of(deck));
        when(vocabularySetItemRepository.countByIdVocabularySetId(deckId)).thenReturn(0L);

        CreateSessionRequest req = new CreateSessionRequest(deckId, "VI_TO_EN", 5, "RANDOM");
        assertThrows(ValidationException.class, () -> studyService.createSession(userId, req));
        verify(studySessionRepository, never()).save(any());
    }

    @Test
    @DisplayName("recordAnswers: Success records batch answers and upserts progress")
    void recordAnswers_Success() {
        Long sessionId = 100L;
        StudySession session = new StudySession(userId, deckId, "VI_TO_EN");
        session.setId(sessionId);

        when(studySessionRepository.findByIdAndUserId(sessionId, userId)).thenReturn(Optional.of(session));
        when(vocabularySetItemRepository.existsByIdVocabularySetIdAndIdVocabularyId(deckId, 50L)).thenReturn(true);
        when(vocabularySetItemRepository.existsByIdVocabularySetIdAndIdVocabularyId(deckId, 51L)).thenReturn(true);
        when(studyAnswerRepository.findBySessionIdAndClientAnswerId(anyLong(), anyString())).thenReturn(Optional.empty());
        when(studySessionRepository.save(any(StudySession.class))).thenAnswer(inv -> inv.getArgument(0));

        AnswerItemDto a1 = new AnswerItemDto("uuid-1", 50L, "VI_TO_EN", "CORRECT", false, "hello", 1);
        AnswerItemDto a2 = new AnswerItemDto("uuid-2", 51L, "VI_TO_EN", "WRONG", false, "wrng", 1);
        AnswerBatchRequest req = new AnswerBatchRequest(List.of(a1, a2));

        StudySessionResponse res = studyService.recordAnswers(userId, sessionId, req);

        assertEquals(2, res.getTotalQuestions());
        assertEquals(1, res.getCorrectAnswers());
        assertEquals(1, res.getWrongAnswers());
        verify(studyAnswerRepository, times(2)).save(any(StudyAnswer.class));
        verify(studyProgressRepository).upsertProgress(eq(userId), eq(50L), eq(1), eq(0), eq(true), any(Instant.class));
        verify(studyProgressRepository).upsertProgress(eq(userId), eq(51L), eq(0), eq(1), eq(false), any(Instant.class));
    }

    @Test
    @DisplayName("recordAnswers: Foreign vocabularyId not belonging to deck returns 404")
    void recordAnswers_ForeignVocabulary_ThrowsResourceNotFoundException() {
        Long sessionId = 100L;
        StudySession session = new StudySession(userId, deckId, "VI_TO_EN");
        session.setId(sessionId);

        when(studySessionRepository.findByIdAndUserId(sessionId, userId)).thenReturn(Optional.of(session));
        when(vocabularySetItemRepository.existsByIdVocabularySetIdAndIdVocabularyId(deckId, 999L)).thenReturn(false);

        AnswerItemDto a1 = new AnswerItemDto("uuid-foreign", 999L, "VI_TO_EN", "CORRECT", false, "test", 1);
        AnswerBatchRequest req = new AnswerBatchRequest(List.of(a1));

        assertThrows(ResourceNotFoundException.class, () -> studyService.recordAnswers(userId, sessionId, req));
        verify(studyAnswerRepository, never()).save(any());
    }

    @Test
    @DisplayName("recordAnswers: Duplicate clientAnswerId is idempotent and does not double count")
    void recordAnswers_IdempotentRetry_SkipsDuplicate() {
        Long sessionId = 100L;
        StudySession session = new StudySession(userId, deckId, "VI_TO_EN");
        session.setId(sessionId);
        session.setTotalQuestions(1);
        session.setCorrectAnswers(1);

        StudyAnswer existing = new StudyAnswer(sessionId, 50L, "VI_TO_EN", "hello", true, "uuid-dup", false, 1);

        when(studySessionRepository.findByIdAndUserId(sessionId, userId)).thenReturn(Optional.of(session));
        when(vocabularySetItemRepository.existsByIdVocabularySetIdAndIdVocabularyId(deckId, 50L)).thenReturn(true);
        when(studyAnswerRepository.findBySessionIdAndClientAnswerId(sessionId, "uuid-dup")).thenReturn(Optional.of(existing));
        when(studySessionRepository.save(any(StudySession.class))).thenAnswer(inv -> inv.getArgument(0));

        AnswerItemDto a1 = new AnswerItemDto("uuid-dup", 50L, "VI_TO_EN", "CORRECT", false, "hello", 1);
        AnswerBatchRequest req = new AnswerBatchRequest(List.of(a1));

        StudySessionResponse res = studyService.recordAnswers(userId, sessionId, req);

        // Counts unchanged
        assertEquals(1, res.getTotalQuestions());
        assertEquals(1, res.getCorrectAnswers());
        verify(studyAnswerRepository, never()).save(any(StudyAnswer.class));
        verify(studyProgressRepository, never()).upsertProgress(anyLong(), anyLong(), anyInt(), anyInt(), anyBoolean(), any());
    }

    @Test
    @DisplayName("recordAnswers: Override changes previous wrong answer to correct and adjusts counts")
    void recordAnswers_Override_UpdatesPreviousAnswerAndProgress() {
        Long sessionId = 100L;
        StudySession session = new StudySession(userId, deckId, "VI_TO_EN");
        session.setId(sessionId);
        session.setTotalQuestions(1);
        session.setWrongAnswers(1);

        StudyAnswer existing = new StudyAnswer(sessionId, 50L, "VI_TO_EN", "helo", false, "uuid-override", false, 1);

        when(studySessionRepository.findByIdAndUserId(sessionId, userId)).thenReturn(Optional.of(session));
        when(vocabularySetItemRepository.existsByIdVocabularySetIdAndIdVocabularyId(deckId, 50L)).thenReturn(true);
        when(studyAnswerRepository.findBySessionIdAndClientAnswerId(sessionId, "uuid-override")).thenReturn(Optional.of(existing));
        when(studySessionRepository.save(any(StudySession.class))).thenAnswer(inv -> inv.getArgument(0));

        AnswerItemDto overrideDto = new AnswerItemDto("uuid-override", 50L, "VI_TO_EN", "WRONG", true, "helo", 1);
        AnswerBatchRequest req = new AnswerBatchRequest(List.of(overrideDto));

        StudySessionResponse res = studyService.recordAnswers(userId, sessionId, req);

        assertTrue(existing.isOverride());
        assertTrue(existing.isCorrect());
        assertEquals(1, res.getCorrectAnswers());
        assertEquals(0, res.getWrongAnswers());
        verify(studyProgressRepository).upsertProgress(eq(userId), eq(50L), eq(1), eq(-1), eq(true), any(Instant.class));
    }

    @Test
    @DisplayName("finishSession: Idempotent finish call stores totals and sets completedAt")
    void finishSession_Idempotent() {
        Long sessionId = 100L;
        StudySession session = new StudySession(userId, deckId, "VI_TO_EN");
        session.setId(sessionId);

        when(studySessionRepository.findByIdAndUserId(sessionId, userId)).thenReturn(Optional.of(session));
        when(studySessionRepository.save(any(StudySession.class))).thenAnswer(inv -> inv.getArgument(0));

        FinishSessionRequest req = new FinishSessionRequest(10, 8, 2);
        StudySessionResponse res1 = studyService.finishSession(userId, sessionId, req);

        assertNotNull(res1.getCompletedAt());
        assertEquals(10, res1.getTotalQuestions());
        assertEquals(8, res1.getCorrectAnswers());
        assertEquals(2, res1.getWrongAnswers());

        // Second finish call
        StudySessionResponse res2 = studyService.finishSession(userId, sessionId, req);
        assertEquals(res1.getCompletedAt(), res2.getCompletedAt());
    }
}
