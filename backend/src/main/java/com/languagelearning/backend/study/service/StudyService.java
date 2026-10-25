package com.languagelearning.backend.study.service;

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
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.Optional;

@Service
public class StudyService {

    private static final Logger log = LoggerFactory.getLogger(StudyService.class);

    private final StudySessionRepository studySessionRepository;
    private final StudyAnswerRepository studyAnswerRepository;
    private final StudyProgressRepository studyProgressRepository;
    private final VocabularySetRepository vocabularySetRepository;
    private final VocabularySetItemRepository vocabularySetItemRepository;
    private final StudyPlanService studyPlanService;

    public StudyService(StudySessionRepository studySessionRepository,
                        StudyAnswerRepository studyAnswerRepository,
                        StudyProgressRepository studyProgressRepository,
                        VocabularySetRepository vocabularySetRepository,
                        VocabularySetItemRepository vocabularySetItemRepository,
                        StudyPlanService studyPlanService) {
        this.studySessionRepository = studySessionRepository;
        this.studyAnswerRepository = studyAnswerRepository;
        this.studyProgressRepository = studyProgressRepository;
        this.vocabularySetRepository = vocabularySetRepository;
        this.vocabularySetItemRepository = vocabularySetItemRepository;
        this.studyPlanService = studyPlanService;
    }

    @Transactional
    public StudySessionResponse createSession(Long userId, CreateSessionRequest request) {
        Long deckId = null;
        if (request.getDeckId() != null) {
            // Check hard gate constraint if active plan enforces it
            StudyPlanResponse activePlan = studyPlanService.getCurrentPlan(userId);
            if (activePlan != null && activePlan.hardGateEnabled() && activePlan.todayStats() != null && activePlan.todayStats().totalCount() > 0) {
                throw new ValidationException("HARD_GATE_ACTIVE", "Bạn đang bật tính năng Khóa tập trung. Vui lòng hoàn thành bài học hôm nay trước khi học các bộ từ khác.");
            }

            VocabularySet deck = vocabularySetRepository.findByIdAndUserId(request.getDeckId(), userId)
                    .orElseThrow(() -> new ResourceNotFoundException("DECK_NOT_FOUND", "Không tìm thấy bộ từ vựng"));

            long cardCount = vocabularySetItemRepository.countByIdVocabularySetId(deck.getId());
            if (cardCount == 0) {
                throw new ValidationException("DECK_EMPTY", "Bộ từ vựng chưa có thẻ nào");
            }
            deckId = deck.getId();
        }

        StudySession session = new StudySession(userId, deckId, request.getDirection());
        StudySession saved = studySessionRepository.save(session);

        return toResponse(saved);
    }

    @Transactional
    public StudySessionResponse recordAnswers(Long userId, Long sessionId, AnswerBatchRequest request) {
        StudySession session = studySessionRepository.findByIdAndUserId(sessionId, userId)
                .orElseThrow(() -> new ResourceNotFoundException("SESSION_NOT_FOUND", "Không tìm thấy phiên học"));

        Long deckId = session.getVocabularySetId();
        Instant now = Instant.now();

        int correctDelta = 0;
        int wrongDelta = 0;
        int totalDelta = 0;

        for (AnswerItemDto item : request.getAnswers()) {
            if (deckId != null) {
                boolean belongs = vocabularySetItemRepository.existsByIdVocabularySetIdAndIdVocabularyId(deckId, item.getVocabularyId());
                if (!belongs) {
                    throw new ResourceNotFoundException("VOCABULARY_NOT_FOUND",
                            "Từ vựng " + item.getVocabularyId() + " không thuộc bộ từ này");
                }
            }

            boolean isCorrect = "CORRECT".equalsIgnoreCase(item.getResult()) || item.isOverride();
            String trimmedAnswer = item.getUserAnswer() != null ? item.getUserAnswer().trim() : null;
            if (trimmedAnswer != null && trimmedAnswer.length() > 500) {
                trimmedAnswer = trimmedAnswer.substring(0, 500);
            }

            String clientAnswerId = item.getClientAnswerId() != null && !item.getClientAnswerId().isBlank()
                    ? item.getClientAnswerId().trim()
                    : null;

            if (clientAnswerId != null) {
                Optional<StudyAnswer> existingOpt = studyAnswerRepository.findBySessionIdAndClientAnswerId(sessionId, clientAnswerId);
                if (existingOpt.isPresent()) {
                    StudyAnswer existing = existingOpt.get();
                    if (item.isOverride() && !existing.isOverride()) {
                        existing.setOverride(true);
                        existing.setCorrect(true);
                        studyAnswerRepository.save(existing);
                        correctDelta++;
                        wrongDelta--;
                        studyProgressRepository.upsertProgress(userId, item.getVocabularyId(), 1, -1, true, now);
                    }
                    continue; // Skip duplicate without double counting
                }
            }

            StudyAnswer answer = new StudyAnswer(
                    sessionId,
                    item.getVocabularyId(),
                    item.getDirection(),
                    trimmedAnswer,
                    isCorrect,
                    clientAnswerId,
                    item.isOverride(),
                    item.getAttemptNo() > 0 ? item.getAttemptNo() : 1
            );
            studyAnswerRepository.save(answer);

            totalDelta++;
            int correctInc = isCorrect ? 1 : 0;
            int wrongInc = isCorrect ? 0 : 1;
            if (isCorrect) {
                correctDelta++;
            } else {
                wrongDelta++;
            }

            studyProgressRepository.upsertProgress(userId, item.getVocabularyId(), correctInc, wrongInc, isCorrect, now);
            try {
                studyPlanService.recordSm2Answer(userId, item.getVocabularyId(), isCorrect, item.getRating());
            } catch (Exception ex) {
                log.warn("Failed to update SM-2 progress for user {} and vocabulary {}: {}",
                        userId, item.getVocabularyId(), ex.getMessage(), ex);
            }
        }

        session.setTotalQuestions(session.getTotalQuestions() + totalDelta);
        session.setCorrectAnswers(session.getCorrectAnswers() + correctDelta);
        session.setWrongAnswers(session.getWrongAnswers() + wrongDelta);
        StudySession saved = studySessionRepository.save(session);

        return toResponse(saved);
    }

    @Transactional
    public StudySessionResponse finishSession(Long userId, Long sessionId, FinishSessionRequest request) {
        StudySession session = studySessionRepository.findByIdAndUserId(sessionId, userId)
                .orElseThrow(() -> new ResourceNotFoundException("SESSION_NOT_FOUND", "Không tìm thấy phiên học"));

        if (session.getCompletedAt() == null) {
            session.setCompletedAt(Instant.now());
        }

        if (request != null) {
            if (request.getTotalQuestions() != null) {
                session.setTotalQuestions(request.getTotalQuestions());
            }
            if (request.getCorrectAnswers() != null) {
                session.setCorrectAnswers(request.getCorrectAnswers());
            }
            if (request.getWrongAnswers() != null) {
                session.setWrongAnswers(request.getWrongAnswers());
            }
        }

        StudySession saved = studySessionRepository.save(session);
        return toResponse(saved);
    }

    private StudySessionResponse toResponse(StudySession s) {
        return new StudySessionResponse(
                s.getId(),
                s.getVocabularySetId(),
                s.getStudyMode(),
                s.getStartedAt(),
                s.getCompletedAt(),
                s.getTotalQuestions(),
                s.getCorrectAnswers(),
                s.getWrongAnswers()
        );
    }
}
