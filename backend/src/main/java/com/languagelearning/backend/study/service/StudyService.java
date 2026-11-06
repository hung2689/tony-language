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
import com.languagelearning.backend.level.dto.LevelInfoDto;
import com.languagelearning.backend.level.service.XpService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.sql.Timestamp;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneOffset;
import java.util.*;
import java.util.stream.Collectors;

@Service
public class StudyService {

    private static final Logger log = LoggerFactory.getLogger(StudyService.class);

    private final StudySessionRepository studySessionRepository;
    private final StudyAnswerRepository studyAnswerRepository;
    private final StudyProgressRepository studyProgressRepository;
    private final VocabularySetRepository vocabularySetRepository;
    private final VocabularySetItemRepository vocabularySetItemRepository;
    private final StudyPlanService studyPlanService;
    private final XpService xpService;

    @Autowired(required = false)
    private JdbcTemplate jdbcTemplate;

    @Autowired(required = false)
    private Sm2Service sm2Service;

    @PersistenceContext
    private EntityManager entityManager;

    @Autowired
    public StudyService(StudySessionRepository studySessionRepository,
                        StudyAnswerRepository studyAnswerRepository,
                        StudyProgressRepository studyProgressRepository,
                        VocabularySetRepository vocabularySetRepository,
                        VocabularySetItemRepository vocabularySetItemRepository,
                        StudyPlanService studyPlanService,
                        XpService xpService,
                        @Autowired(required = false) JdbcTemplate jdbcTemplate,
                        @Autowired(required = false) Sm2Service sm2Service) {
        this.studySessionRepository = studySessionRepository;
        this.studyAnswerRepository = studyAnswerRepository;
        this.studyProgressRepository = studyProgressRepository;
        this.vocabularySetRepository = vocabularySetRepository;
        this.vocabularySetItemRepository = vocabularySetItemRepository;
        this.studyPlanService = studyPlanService;
        this.xpService = xpService;
        this.jdbcTemplate = jdbcTemplate;
        this.sm2Service = sm2Service;
    }

    public StudyService(StudySessionRepository studySessionRepository,
                        StudyAnswerRepository studyAnswerRepository,
                        StudyProgressRepository studyProgressRepository,
                        VocabularySetRepository vocabularySetRepository,
                        VocabularySetItemRepository vocabularySetItemRepository,
                        StudyPlanService studyPlanService,
                        XpService xpService) {
        this(studySessionRepository, studyAnswerRepository, studyProgressRepository,
                vocabularySetRepository, vocabularySetItemRepository, studyPlanService, xpService, null, null);
    }

    @Transactional
    public StudySessionResponse createSession(Long userId, CreateSessionRequest request) {
        Long deckId = null;
        if (request.getDeckId() != null) {
            // Check hard gate constraint if active plan enforces it
            if (studyPlanService.isHardGateBlocking(userId)) {
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
        if (jdbcTemplate != null && sm2Service != null) {
            return recordAnswersBatch(userId, sessionId, request);
        }
        return recordAnswersLegacy(userId, sessionId, request);
    }

    private record ExistingAnswerInfo(boolean override, boolean isCorrect) {}

    static class ProgressState {
        final Long userId;
        final Long vocabularyId;
        int correctCount = 0;
        int wrongCount = 0;
        BigDecimal accuracy = BigDecimal.ZERO;
        int currentStreak = 0;
        int memoryLevel = 0;
        Instant lastReviewedAt;
        Instant nextReviewAt;
        int intervalDays = 0;
        BigDecimal easeFactor = Sm2Service.DEFAULT_EASE_FACTOR;
        int repetitions = 0;
        Instant createdAt;
        boolean dirty = false;

        ProgressState(Long userId, Long vocabularyId) {
            this.userId = userId;
            this.vocabularyId = vocabularyId;
        }
    }

    private StudySessionResponse recordAnswersBatch(Long userId, Long sessionId, AnswerBatchRequest request) {
        StudySession session = studySessionRepository.findByIdAndUserIdForUpdate(sessionId, userId)
                .orElseGet(() -> studySessionRepository.findByIdAndUserId(sessionId, userId)
                        .orElseThrow(() -> new ResourceNotFoundException("SESSION_NOT_FOUND", "Không tìm thấy phiên học")));

        if (request == null || request.getAnswers() == null || request.getAnswers().isEmpty()) {
            return toResponse(session);
        }

        Long deckId = session.getVocabularySetId();

        // 1. Upfront deck vocabulary validation
        // Parameter note: PostgreSQL limit is 32,767. Batches here are <= 1,000 items.
        if (deckId != null) {
            Set<Long> vocabIds = request.getAnswers().stream()
                    .map(AnswerItemDto::getVocabularyId)
                    .filter(Objects::nonNull)
                    .collect(Collectors.toSet());

            if (!vocabIds.isEmpty()) {
                String placeholders = vocabIds.stream().map(id -> "?").collect(Collectors.joining(", "));
                List<Object> checkParams = new ArrayList<>(vocabIds.size() + 1);
                checkParams.add(deckId);
                checkParams.addAll(vocabIds);

                List<Long> foundIds = jdbcTemplate.query(
                        "SELECT vocabulary_id FROM vocabulary_set_items WHERE vocabulary_set_id = ? AND vocabulary_id IN (" + placeholders + ")",
                        (rs, rowNum) -> rs.getLong("vocabulary_id"),
                        checkParams.toArray()
                );
                Set<Long> validIds = new HashSet<>(foundIds);

                for (AnswerItemDto item : request.getAnswers()) {
                    if (item.getVocabularyId() == null || !validIds.contains(item.getVocabularyId())) {
                        throw new ResourceNotFoundException("VOCABULARY_NOT_FOUND",
                                "Từ vựng " + item.getVocabularyId() + " không thuộc bộ từ này");
                    }
                }
            }
        }

        // 2. Pre-fetch existing answers for clientAnswerIds in this session
        Set<String> clientIds = request.getAnswers().stream()
                .map(AnswerItemDto::getClientAnswerId)
                .filter(id -> id != null && !id.isBlank())
                .map(String::trim)
                .collect(Collectors.toSet());

        Map<String, ExistingAnswerInfo> existingAnswers = new HashMap<>();
        if (!clientIds.isEmpty()) {
            String placeholders = clientIds.stream().map(id -> "?").collect(Collectors.joining(", "));
            List<Object> aParams = new ArrayList<>(clientIds.size() + 1);
            aParams.add(sessionId);
            aParams.addAll(clientIds);

            jdbcTemplate.query(
                    "SELECT client_answer_id, override, is_correct FROM study_answers WHERE session_id = ? AND client_answer_id IN (" + placeholders + ")",
                    rs -> {
                        existingAnswers.put(rs.getString("client_answer_id"),
                                new ExistingAnswerInfo(rs.getBoolean("override"), rs.getBoolean("is_correct")));
                    },
                    aParams.toArray()
            );
        }

        Instant now = Instant.now();
        Timestamp nowTimestamp = Timestamp.from(now);

        // 3. Separate candidate items into new inserts vs overrides (deduplicating in-batch)
        Set<String> seenClientIdsInBatch = new HashSet<>();
        List<Object[]> answersToInsert = new ArrayList<>();
        List<AnswerItemDto> candidateInsertItems = new ArrayList<>();
        List<String> overrideClientIds = new ArrayList<>();
        List<AnswerItemDto> candidateOverrideItems = new ArrayList<>();

        for (AnswerItemDto item : request.getAnswers()) {
            String clientAnswerId = item.getClientAnswerId() != null && !item.getClientAnswerId().isBlank()
                    ? item.getClientAnswerId().trim()
                    : null;

            if (clientAnswerId != null) {
                if (seenClientIdsInBatch.contains(clientAnswerId)) {
                    continue; // Skip duplicate within current batch
                }
                seenClientIdsInBatch.add(clientAnswerId);

                ExistingAnswerInfo existing = existingAnswers.get(clientAnswerId);
                if (existing != null) {
                    if (item.isOverride() && !existing.override()) {
                        overrideClientIds.add(clientAnswerId);
                        candidateOverrideItems.add(item);
                    }
                    continue; // Handled override candidate or sequential duplicate
                }
            }

            boolean isCorrect = "CORRECT".equalsIgnoreCase(item.getResult()) || item.isOverride();
            String trimmedAnswer = item.getUserAnswer() != null ? item.getUserAnswer().trim() : null;
            if (trimmedAnswer != null && trimmedAnswer.length() > 500) {
                trimmedAnswer = trimmedAnswer.substring(0, 500);
            }

            int attemptNo = item.getAttemptNo() > 0 ? item.getAttemptNo() : 1;
            answersToInsert.add(new Object[]{
                    sessionId,
                    item.getVocabularyId(),
                    item.getDirection(),
                    trimmedAnswer,
                    isCorrect,
                    clientAnswerId,
                    item.isOverride(),
                    attemptNo,
                    nowTimestamp
            });
            candidateInsertItems.add(item);
        }

        // 4. Execute atomic inserts and overrides with ON CONFLICT DO NOTHING to prevent race conditions
        Set<String> newlyInsertedClientIds = new HashSet<>();
        if (!answersToInsert.isEmpty()) {
            StringBuilder sql = new StringBuilder("INSERT INTO study_answers (" +
                    "session_id, vocabulary_id, question_type, user_answer, is_correct, " +
                    "client_answer_id, override, attempt_no, answered_at) VALUES ");
            List<Object> insertParams = new ArrayList<>(answersToInsert.size() * 9);
            for (int i = 0; i < answersToInsert.size(); i++) {
                if (i > 0) sql.append(", ");
                sql.append("(?, ?, ?, ?, ?, ?, ?, ?, ?)");
                for (Object param : answersToInsert.get(i)) {
                    insertParams.add(param);
                }
            }
            sql.append(" ON CONFLICT (session_id, client_answer_id) WHERE client_answer_id IS NOT NULL DO NOTHING RETURNING client_answer_id");

            List<String> returnedClientIds = jdbcTemplate.query(
                    sql.toString(),
                    (rs, rowNum) -> rs.getString("client_answer_id"),
                    insertParams.toArray()
            );
            for (String rId : returnedClientIds) {
                if (rId != null) {
                    newlyInsertedClientIds.add(rId);
                }
            }
        }

        Set<String> successfulOverrideClientIds = new HashSet<>();
        for (String ovId : overrideClientIds) {
            List<String> ovReturned = jdbcTemplate.query(
                    "UPDATE study_answers SET override = TRUE, is_correct = TRUE " +
                    "WHERE session_id = ? AND client_answer_id = ? AND override = FALSE RETURNING client_answer_id",
                    (rs, rowNum) -> rs.getString("client_answer_id"),
                    sessionId, ovId
            );
            if (!ovReturned.isEmpty()) {
                successfulOverrideClientIds.add(ovId);
            }
        }

        // Filter effective items that were actually inserted or overridden
        List<AnswerItemDto> effectiveOverrides = new ArrayList<>();
        for (AnswerItemDto item : candidateOverrideItems) {
            String cId = item.getClientAnswerId() != null ? item.getClientAnswerId().trim() : null;
            if (cId != null && successfulOverrideClientIds.contains(cId)) {
                effectiveOverrides.add(item);
            }
        }

        List<AnswerItemDto> effectiveNewAnswers = new ArrayList<>();
        for (AnswerItemDto item : candidateInsertItems) {
            String cId = item.getClientAnswerId() != null ? item.getClientAnswerId().trim() : null;
            if (cId == null || newlyInsertedClientIds.contains(cId)) {
                effectiveNewAnswers.add(item);
            }
        }

        if (effectiveOverrides.isEmpty() && effectiveNewAnswers.isEmpty()) {
            return toResponse(session);
        }

        // 5. Pre-fetch and lock study_progress for involved vocabularies in ascending vocabulary_id order (deadlock prevention)
        Set<Long> involvedVocabIds = new HashSet<>();
        effectiveOverrides.forEach(i -> involvedVocabIds.add(i.getVocabularyId()));
        effectiveNewAnswers.forEach(i -> involvedVocabIds.add(i.getVocabularyId()));

        List<Long> sortedVocabIds = involvedVocabIds.stream().filter(Objects::nonNull).distinct().sorted().toList();
        Map<Long, ProgressState> progressMap = new HashMap<>();

        if (!sortedVocabIds.isEmpty()) {
            String pPlaceholders = sortedVocabIds.stream().map(id -> "?").collect(Collectors.joining(", "));
            List<Object> pParams = new ArrayList<>(sortedVocabIds.size() + 1);
            pParams.add(userId);
            pParams.addAll(sortedVocabIds);

            jdbcTemplate.query(
                    "SELECT * FROM study_progress WHERE user_id = ? AND vocabulary_id IN (" + pPlaceholders + ") ORDER BY vocabulary_id FOR UPDATE",
                    rs -> {
                        Long vId = rs.getLong("vocabulary_id");
                        ProgressState s = new ProgressState(rs.getLong("user_id"), vId);
                        s.correctCount = rs.getInt("correct_count");
                        s.wrongCount = rs.getInt("wrong_count");
                        s.accuracy = rs.getBigDecimal("accuracy");
                        s.currentStreak = rs.getInt("current_streak");
                        s.memoryLevel = rs.getInt("memory_level");
                        Timestamp lastRev = rs.getTimestamp("last_reviewed_at");
                        if (lastRev != null) s.lastReviewedAt = lastRev.toInstant();
                        Timestamp nextRev = rs.getTimestamp("next_review_at");
                        if (nextRev != null) s.nextReviewAt = nextRev.toInstant();
                        s.intervalDays = rs.getInt("interval_days");
                        s.easeFactor = rs.getBigDecimal("ease_factor");
                        s.repetitions = rs.getInt("repetitions");
                        Timestamp created = rs.getTimestamp("created_at");
                        if (created != null) s.createdAt = created.toInstant();
                        progressMap.put(vId, s);
                    },
                    pParams.toArray()
            );

            // If any vocabulary does not have a study_progress row yet, insert initial placeholder row and lock it
            if (progressMap.size() < sortedVocabIds.size()) {
                List<Long> missingIds = sortedVocabIds.stream()
                        .filter(id -> !progressMap.containsKey(id))
                        .toList();

                List<Object[]> missingInsertArgs = new ArrayList<>(missingIds.size());
                for (Long mId : missingIds) {
                    missingInsertArgs.add(new Object[]{userId, mId, nowTimestamp, nowTimestamp, nowTimestamp});
                }
                jdbcTemplate.batchUpdate(
                        "INSERT INTO study_progress (user_id, vocabulary_id, correct_count, wrong_count, accuracy, current_streak, difficulty, memory_level, last_reviewed_at, next_review_at, interval_days, ease_factor, repetitions, created_at, updated_at) " +
                        "VALUES (?, ?, 0, 0, 0.00, 0, 0.00, 0, ?, NULL, 0, 2.50, 0, ?, ?) " +
                        "ON CONFLICT (user_id, vocabulary_id) DO NOTHING",
                        missingInsertArgs
                );

                String mPlaceholders = missingIds.stream().map(id -> "?").collect(Collectors.joining(", "));
                List<Object> mParams = new ArrayList<>(missingIds.size() + 1);
                mParams.add(userId);
                mParams.addAll(missingIds);

                jdbcTemplate.query(
                        "SELECT * FROM study_progress WHERE user_id = ? AND vocabulary_id IN (" + mPlaceholders + ") ORDER BY vocabulary_id FOR UPDATE",
                        rs -> {
                            Long vId = rs.getLong("vocabulary_id");
                            if (!progressMap.containsKey(vId)) {
                                ProgressState s = new ProgressState(rs.getLong("user_id"), vId);
                                s.correctCount = rs.getInt("correct_count");
                                s.wrongCount = rs.getInt("wrong_count");
                                s.accuracy = rs.getBigDecimal("accuracy");
                                s.currentStreak = rs.getInt("current_streak");
                                s.memoryLevel = rs.getInt("memory_level");
                                Timestamp lastRev = rs.getTimestamp("last_reviewed_at");
                                if (lastRev != null) s.lastReviewedAt = lastRev.toInstant();
                                Timestamp nextRev = rs.getTimestamp("next_review_at");
                                if (nextRev != null) s.nextReviewAt = nextRev.toInstant();
                                s.intervalDays = rs.getInt("interval_days");
                                s.easeFactor = rs.getBigDecimal("ease_factor");
                                s.repetitions = rs.getInt("repetitions");
                                Timestamp created = rs.getTimestamp("created_at");
                                if (created != null) s.createdAt = created.toInstant();
                                progressMap.put(vId, s);
                            }
                        },
                        mParams.toArray()
                );
            }
        }

        // 6. In-memory computation loop for effective answers
        int correctDelta = 0;
        int wrongDelta = 0;
        int totalDelta = 0;
        List<XpService.AnswerXpItem> xpItems = new ArrayList<>();

        for (AnswerItemDto item : effectiveOverrides) {
            correctDelta++;
            wrongDelta--;

            ProgressState state = progressMap.computeIfAbsent(item.getVocabularyId(), id -> new ProgressState(userId, id));
            state.correctCount++;
            state.wrongCount = Math.max(0, state.wrongCount - 1);
            int total = state.correctCount + state.wrongCount;
            state.accuracy = total > 0
                    ? BigDecimal.valueOf(state.correctCount * 100.0 / total).setScale(2, RoundingMode.HALF_UP)
                    : BigDecimal.ZERO;
            state.currentStreak++;
            state.lastReviewedAt = now;
            state.dirty = true;
        }

        for (AnswerItemDto item : effectiveNewAnswers) {
            boolean isCorrect = "CORRECT".equalsIgnoreCase(item.getResult()) || item.isOverride();
            int attemptNo = item.getAttemptNo() > 0 ? item.getAttemptNo() : 1;
            totalDelta++;
            if (isCorrect) {
                correctDelta++;
            } else {
                wrongDelta++;
            }

            String clientAnswerId = item.getClientAnswerId() != null && !item.getClientAnswerId().isBlank()
                    ? item.getClientAnswerId().trim()
                    : null;
            String xpKey = clientAnswerId != null ? clientAnswerId : UUID.randomUUID().toString();
            xpItems.add(new XpService.AnswerXpItem(xpKey, isCorrect, attemptNo, item.isOverride()));

            // Sequential in-memory study progress & SM-2 update
            ProgressState state = progressMap.computeIfAbsent(item.getVocabularyId(), id -> new ProgressState(userId, id));
            state.correctCount += isCorrect ? 1 : 0;
            state.wrongCount += isCorrect ? 0 : 1;
            int total = state.correctCount + state.wrongCount;
            state.accuracy = total > 0
                    ? BigDecimal.valueOf(state.correctCount * 100.0 / total).setScale(2, RoundingMode.HALF_UP)
                    : BigDecimal.ZERO;
            state.currentStreak = isCorrect ? (state.currentStreak + 1) : 0;

            Sm2Service.SrsRating rating = (item.getRating() != null && !item.getRating().isBlank())
                    ? Sm2Service.SrsRating.fromString(item.getRating())
                    : (isCorrect ? Sm2Service.SrsRating.GOOD : Sm2Service.SrsRating.AGAIN);

            Sm2Service.Sm2Result sm2Result = sm2Service.calculateWithRating(
                    state.intervalDays,
                    state.easeFactor,
                    state.repetitions,
                    rating,
                    now
            );

            state.intervalDays = sm2Result.intervalDays();
            state.easeFactor = sm2Result.easeFactor();
            state.repetitions = sm2Result.repetitions();
            state.nextReviewAt = sm2Result.nextReviewAt();

            int memoryLevel = 1;
            if (state.intervalDays > 21) {
                memoryLevel = 3;
            } else if (state.intervalDays >= 7) {
                memoryLevel = 2;
            }
            state.memoryLevel = memoryLevel;
            state.lastReviewedAt = now;
            state.dirty = true;
        }

        // 7. Bulk UPSERT study_progress
        List<Object[]> progressToUpsert = new ArrayList<>();
        for (ProgressState s : progressMap.values()) {
            if (!s.dirty) continue;
            Timestamp lastRev = s.lastReviewedAt != null ? Timestamp.from(s.lastReviewedAt) : nowTimestamp;
            Timestamp nextRev = s.nextReviewAt != null ? Timestamp.from(s.nextReviewAt) : null;
            Timestamp created = s.createdAt != null ? Timestamp.from(s.createdAt) : nowTimestamp;

            progressToUpsert.add(new Object[]{
                    s.userId,
                    s.vocabularyId,
                    s.correctCount,
                    s.wrongCount,
                    s.accuracy,
                    s.currentStreak,
                    s.memoryLevel,
                    lastRev,
                    nextRev,
                    s.intervalDays,
                    s.easeFactor,
                    s.repetitions,
                    created,
                    nowTimestamp
            });
        }

        if (!progressToUpsert.isEmpty()) {
            jdbcTemplate.batchUpdate(
                    "INSERT INTO study_progress (" +
                            "user_id, vocabulary_id, correct_count, wrong_count, accuracy, " +
                            "current_streak, difficulty, memory_level, last_reviewed_at, next_review_at, " +
                            "interval_days, ease_factor, repetitions, created_at, updated_at" +
                            ") VALUES (?, ?, ?, ?, ?, ?, 0.00, ?, ?, ?, ?, ?, ?, ?, ?) " +
                            "ON CONFLICT (user_id, vocabulary_id) DO UPDATE SET " +
                            "correct_count = EXCLUDED.correct_count, " +
                            "wrong_count = EXCLUDED.wrong_count, " +
                            "accuracy = EXCLUDED.accuracy, " +
                            "current_streak = EXCLUDED.current_streak, " +
                            "memory_level = EXCLUDED.memory_level, " +
                            "last_reviewed_at = EXCLUDED.last_reviewed_at, " +
                            "next_review_at = EXCLUDED.next_review_at, " +
                            "interval_days = EXCLUDED.interval_days, " +
                            "ease_factor = EXCLUDED.ease_factor, " +
                            "repetitions = EXCLUDED.repetitions, " +
                            "updated_at = EXCLUDED.updated_at",
                    progressToUpsert
            );
        }

        // 8. Consolidated XP award
        if (!xpItems.isEmpty()) {
            xpService.awardAnswersBatchXp(userId, xpItems, now);
        }

        // 9. Update session counters
        session.setTotalQuestions(session.getTotalQuestions() + totalDelta);
        session.setCorrectAnswers(session.getCorrectAnswers() + correctDelta);
        session.setWrongAnswers(session.getWrongAnswers() + wrongDelta);
        StudySession saved = studySessionRepository.save(session);

        // 10. Flush and clear persistence context to detach stale entities
        if (entityManager != null) {
            entityManager.flush();
            entityManager.clear();
        }

        return toResponse(saved);
    }

    private StudySessionResponse recordAnswersLegacy(Long userId, Long sessionId, AnswerBatchRequest request) {
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

            // Award answer XP idempotently
            String xpKey = clientAnswerId != null ? clientAnswerId : ("sa_" + answer.getId());
            xpService.awardAnswerXp(userId, xpKey, isCorrect, item.getAttemptNo(), item.isOverride());

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

        LevelInfoDto beforeLevel = xpService.getLevelInfo(userId);
        long beforeXp = beforeLevel.totalXp();

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

        // 1. Award session completion bonus if threshold reached
        xpService.awardSessionCompletionBonus(userId, sessionId, saved.getTotalQuestions());

        // 2. Award daily streak bonus if active (once per day)
        LocalDate today = LocalDate.now(ZoneOffset.UTC);
        xpService.awardDailyStreakBonus(userId, today);

        LevelInfoDto afterLevel = xpService.getLevelInfo(userId);

        StudySessionResponse response = toResponse(saved);
        int gained = (int) (afterLevel.totalXp() - beforeXp);
        response.setXpGained(gained);
        response.setTotalXp(afterLevel.totalXp());
        response.setLevel(afterLevel.level());
        response.setTier(afterLevel.tierName());
        response.setLeveledUp(afterLevel.level() > beforeLevel.level());

        return response;
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
