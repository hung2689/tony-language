package com.languagelearning.backend.study.service;

import com.languagelearning.backend.common.exception.ResourceNotFoundException;
import com.languagelearning.backend.common.exception.ValidationException;
import com.languagelearning.backend.deck.entity.VocabularySet;
import com.languagelearning.backend.deck.repository.VocabularySetRepository;
import com.languagelearning.backend.study.dto.*;
import com.languagelearning.backend.study.entity.StudyPlan;
import com.languagelearning.backend.study.entity.StudyPlanDeck;
import com.languagelearning.backend.study.entity.StudyProgress;
import com.languagelearning.backend.study.repository.StudyPlanDeckRepository;
import com.languagelearning.backend.study.repository.StudyPlanRepository;
import com.languagelearning.backend.study.repository.StudyProgressRepository;
import com.languagelearning.backend.term.dto.TermCardDto;
import com.languagelearning.backend.term.entity.Vocabulary;
import com.languagelearning.backend.term.entity.VocabularySynonym;
import com.languagelearning.backend.term.repository.VocabularyRepository;
import com.languagelearning.backend.term.repository.VocabularySynonymRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.text.Normalizer;
import java.time.*;
import java.time.temporal.ChronoUnit;
import java.util.*;
import java.util.stream.Collectors;

@Service
public class StudyPlanService {

    private final StudyPlanRepository studyPlanRepository;
    private final StudyPlanDeckRepository studyPlanDeckRepository;
    private final VocabularySetRepository vocabularySetRepository;
    private final VocabularyRepository vocabularyRepository;
    private final VocabularySynonymRepository vocabularySynonymRepository;
    private final StudyProgressRepository studyProgressRepository;
    private final Sm2Service sm2Service;

    public StudyPlanService(
            StudyPlanRepository studyPlanRepository,
            StudyPlanDeckRepository studyPlanDeckRepository,
            VocabularySetRepository vocabularySetRepository,
            VocabularyRepository vocabularyRepository,
            VocabularySynonymRepository vocabularySynonymRepository,
            StudyProgressRepository studyProgressRepository,
            Sm2Service sm2Service
    ) {
        this.studyPlanRepository = studyPlanRepository;
        this.studyPlanDeckRepository = studyPlanDeckRepository;
        this.vocabularySetRepository = vocabularySetRepository;
        this.vocabularyRepository = vocabularyRepository;
        this.vocabularySynonymRepository = vocabularySynonymRepository;
        this.studyProgressRepository = studyProgressRepository;
        this.sm2Service = sm2Service;
    }

    /**
     * Get the user's currently active study plan, or null if none.
     */
    @Transactional(readOnly = true)
    public StudyPlanResponse getCurrentPlan(Long userId) {
        Optional<StudyPlan> activePlanOpt = studyPlanRepository.findByUserIdAndStatus(userId, StudyPlan.Status.ACTIVE);
        if (activePlanOpt.isEmpty()) {
            return null;
        }
        return buildPlanResponse(userId, activePlanOpt.get());
    }

    /**
     * Create a new study plan. Only one plan can be ACTIVE at a time.
     */
    @Transactional
    public StudyPlanResponse createPlan(Long userId, CreateStudyPlanRequest request) {
        if (request.deckIds() == null || request.deckIds().isEmpty()) {
            throw new ValidationException("Vui lòng chọn ít nhất một bộ từ vựng để tạo lộ trình.");
        }

        // Deactivate previous active plans if any
        studyPlanRepository.findByUserIdAndStatus(userId, StudyPlan.Status.ACTIVE).ifPresent(oldPlan -> {
            oldPlan.setStatus(StudyPlan.Status.PAUSED);
            studyPlanRepository.save(oldPlan);
        });

        String planName = (request.name() != null && !request.name().trim().isEmpty())
                ? request.name().trim()
                : "Lộ trình ôn tập";

        int maxPerDay = (request.maxNewWordsPerDay() != null && request.maxNewWordsPerDay() >= 5)
                ? request.maxNewWordsPerDay()
                : 50;
        int minPerDay = (request.minWordsPerDay() != null && request.minWordsPerDay() >= 1)
                ? request.minWordsPerDay()
                : 5;
        String tz = (request.timezone() != null && !request.timezone().isBlank())
                ? request.timezone()
                : "Asia/Ho_Chi_Minh";

        StudyPlan plan = new StudyPlan(
                userId,
                planName,
                request.targetDate(),
                maxPerDay,
                minPerDay,
                tz
        );
        if (Boolean.TRUE.equals(request.hardGateEnabled())) {
            plan.setHardGateEnabled(true);
        }

        StudyPlan savedPlan = studyPlanRepository.save(plan);

        // Associate selected decks (verifying ownership)
        for (Long deckId : request.deckIds()) {
            boolean ownsDeck = vocabularySetRepository.findByIdAndUserId(deckId, userId).isPresent();
            if (ownsDeck) {
                studyPlanDeckRepository.save(new StudyPlanDeck(savedPlan.getId(), deckId));
            }
        }

        return buildPlanResponse(userId, savedPlan);
    }

    /**
     * Preview adding decks to plan or calculating initial volume.
     */
    @Transactional(readOnly = true)
    public PreviewAddDecksResponse previewAddDecks(Long userId, PreviewAddDecksRequest request) {
        StudyPlan activePlan = studyPlanRepository.findByUserIdAndStatus(userId, StudyPlan.Status.ACTIVE).orElse(null);

        LocalDate targetDate = request.targetDate();
        if (targetDate == null && activePlan != null) {
            targetDate = activePlan.getTargetDate();
        }
        if (targetDate == null) {
            targetDate = LocalDate.now().plusWeeks(2);
        }

        int maxPerDay = (request.maxNewWordsPerDay() != null && request.maxNewWordsPerDay() > 0)
                ? request.maxNewWordsPerDay()
                : (activePlan != null ? activePlan.getMaxNewWordsPerDay() : 50);

        // 1. Existing cards in current active plan
        Set<String> currentUniqueWords = new HashSet<>();
        if (activePlan != null) {
            List<Long> currentDeckIds = studyPlanDeckRepository.findByStudyPlanId(activePlan.getId())
                    .stream()
                    .map(StudyPlanDeck::getDeckId)
                    .toList();
            if (!currentDeckIds.isEmpty()) {
                vocabularyRepository.findByDeckIdIn(currentDeckIds).forEach(v -> {
                    if (v.getWord() != null) currentUniqueWords.add(normalizeWord(v.getWord()));
                });
            }
        }

        // 2. Additional cards from requested decks
        Set<String> requestedUniqueWords = new HashSet<>();
        if (request.deckIds() != null && !request.deckIds().isEmpty()) {
            vocabularyRepository.findByDeckIdIn(request.deckIds()).forEach(v -> {
                if (v.getWord() != null) requestedUniqueWords.add(normalizeWord(v.getWord()));
            });
        }

        // Words newly added (not in current plan)
        Set<String> newlyAddedWords = new HashSet<>(requestedUniqueWords);
        newlyAddedWords.removeAll(currentUniqueWords);

        int currentCount = currentUniqueWords.size();
        int addedCount = newlyAddedWords.size();
        int newTotalCount = currentCount + addedCount;

        LocalDate today = LocalDate.now();
        long daysRemaining = Math.max(1, ChronoUnit.DAYS.between(today, targetDate) + 1);

        double currentAvg = Math.round(((double) currentCount / daysRemaining) * 10.0) / 10.0;
        double newAvg = Math.round(((double) newTotalCount / daysRemaining) * 10.0) / 10.0;

        boolean isOverloaded = newAvg > maxPerDay;

        LocalDate suggestedDate = isOverloaded
                ? today.plusDays(Math.max(daysRemaining + 3, (long) Math.ceil((double) newTotalCount / maxPerDay)))
                : targetDate;
        int suggestedMax = isOverloaded ? (int) Math.ceil(newAvg) : maxPerDay;

        return new PreviewAddDecksResponse(
                currentCount,
                addedCount,
                newTotalCount,
                daysRemaining,
                currentAvg,
                newAvg,
                maxPerDay,
                isOverloaded,
                suggestedDate,
                suggestedMax
        );
    }

    /**
     * Add decks to the currently active study plan with optional overload strategy.
     */
    @Transactional
    public StudyPlanResponse addDecksToActivePlan(Long userId, AddDecksToPlanRequest request) {
        StudyPlan activePlan = studyPlanRepository.findByUserIdAndStatus(userId, StudyPlan.Status.ACTIVE)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy lộ trình ôn tập đang hoạt động."));

        if (request.deckIds() == null || request.deckIds().isEmpty()) {
            throw new ValidationException("Vui lòng chọn ít nhất một bộ từ vựng.");
        }

        // Apply overload resolution strategy if requested
        if ("EXTEND_DEADLINE".equalsIgnoreCase(request.overloadStrategy()) && request.newTargetDate() != null) {
            activePlan.setTargetDate(request.newTargetDate());
        } else if ("INCREASE_CAP".equalsIgnoreCase(request.overloadStrategy()) && request.newMaxNewWordsPerDay() != null) {
            activePlan.setMaxNewWordsPerDay(request.newMaxNewWordsPerDay());
        }
        studyPlanRepository.save(activePlan);

        // Add decks
        for (Long deckId : request.deckIds()) {
            boolean ownsDeck = vocabularySetRepository.findByIdAndUserId(deckId, userId).isPresent();
            if (ownsDeck && !studyPlanDeckRepository.existsByStudyPlanIdAndDeckId(activePlan.getId(), deckId)) {
                studyPlanDeckRepository.save(new StudyPlanDeck(activePlan.getId(), deckId));
            }
        }

        return buildPlanResponse(userId, activePlan);
    }

    /**
     * Remove a deck from the currently active plan.
     */
    @Transactional
    public StudyPlanResponse removeDeckFromPlan(Long userId, Long deckId) {
        StudyPlan activePlan = studyPlanRepository.findByUserIdAndStatus(userId, StudyPlan.Status.ACTIVE)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy lộ trình ôn tập đang hoạt động."));

        studyPlanDeckRepository.deleteByStudyPlanIdAndDeckId(activePlan.getId(), deckId);
        return buildPlanResponse(userId, activePlan);
    }

    /**
     * Update plan settings (deadline, cap, hard gate, status).
     */
    @Transactional
    public StudyPlanResponse updatePlan(Long userId, UpdateStudyPlanRequest request) {
        StudyPlan activePlan = studyPlanRepository.findByUserIdAndStatus(userId, StudyPlan.Status.ACTIVE)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy lộ trình ôn tập đang hoạt động."));

        if (request.name() != null && !request.name().trim().isEmpty()) {
            activePlan.setName(request.name().trim());
        }
        if (request.targetDate() != null) {
            if (request.targetDate().isBefore(LocalDate.now())) {
                throw new ValidationException("Ngày cần hoàn thành phải từ hôm nay trở đi.");
            }
            activePlan.setTargetDate(request.targetDate());
        }
        if (request.maxNewWordsPerDay() != null && request.maxNewWordsPerDay() >= 5) {
            activePlan.setMaxNewWordsPerDay(request.maxNewWordsPerDay());
        }
        if (request.minWordsPerDay() != null && request.minWordsPerDay() >= 1) {
            activePlan.setMinWordsPerDay(request.minWordsPerDay());
        }
        if (request.hardGateEnabled() != null) {
            activePlan.setHardGateEnabled(request.hardGateEnabled());
        }
        if (request.status() != null) {
            activePlan.setStatus(request.status());
        }

        StudyPlan saved = studyPlanRepository.save(activePlan);
        return buildPlanResponse(userId, saved);
    }

    /**
     * Delete the active plan.
     */
    @Transactional
    public void deleteActivePlan(Long userId) {
        studyPlanRepository.findByUserIdAndStatus(userId, StudyPlan.Status.ACTIVE).ifPresent(plan -> {
            studyPlanDeckRepository.deleteByStudyPlanId(plan.getId());
            studyPlanRepository.delete(plan);
        });
    }

    /**
     * Retrieves today's vocabulary queue following SM-2 and priority rules:
     * Due reviews -> Weak words -> New words (capped at maxNewWordsPerDay, at least minWordsPerDay).
     */
    @Transactional(readOnly = true)
    public TodayStudyQueueResponse getTodayQueue(Long userId) {
        StudyPlan activePlan = studyPlanRepository.findByUserIdAndStatus(userId, StudyPlan.Status.ACTIVE)
                .orElseThrow(() -> new ResourceNotFoundException("Chưa có lộ trình ôn tập nào đang hoạt động."));

        ZoneId zoneId = parseZoneId(activePlan.getTimezone());
        LocalDate currentStudyDate = getStudyDay(zoneId);
        Instant endOfStudyDay = currentStudyDate.plusDays(1).atTime(3, 59, 59).atZone(zoneId).toInstant();

        // 1. Collect all deck IDs in plan
        List<Long> deckIds = studyPlanDeckRepository.findByStudyPlanId(activePlan.getId())
                .stream()
                .map(StudyPlanDeck::getDeckId)
                .toList();

        if (deckIds.isEmpty()) {
            return new TodayStudyQueueResponse(
                    activePlan.getId(),
                    activePlan.getName(),
                    currentStudyDate,
                    Collections.emptyList(),
                    0, 0, 0, 0
            );
        }

        // 2. Fetch all vocabularies from these decks and deduplicate by normalized term
        List<Vocabulary> allVocabs = vocabularyRepository.findByDeckIdIn(deckIds);
        Map<String, Vocabulary> dedupedMap = new LinkedHashMap<>();
        for (Vocabulary v : allVocabs) {
            if (v.getWord() != null) {
                String key = normalizeWord(v.getWord());
                dedupedMap.putIfAbsent(key, v);
            }
        }
        List<Vocabulary> uniqueVocabs = new ArrayList<>(dedupedMap.values());

        // 3. Fetch study progress for these vocabularies
        List<Long> vocabIds = uniqueVocabs.stream().map(Vocabulary::getId).toList();
        Map<Long, StudyProgress> progressMap = studyProgressRepository.findByUserIdAndVocabularyIdIn(userId, vocabIds)
                .stream()
                .collect(Collectors.toMap(StudyProgress::getVocabularyId, p -> p));

        // 4. Categorize vocabularies
        List<Vocabulary> dueList = new ArrayList<>();
        List<Vocabulary> weakList = new ArrayList<>();
        List<Vocabulary> newList = new ArrayList<>();
        List<Vocabulary> otherList = new ArrayList<>();

        for (Vocabulary v : uniqueVocabs) {
            StudyProgress sp = progressMap.get(v.getId());
            if (sp == null || (sp.getCorrectCount() == 0 && sp.getWrongCount() == 0)) {
                newList.add(v);
            } else if (sp.getNextReviewAt() != null && sp.getNextReviewAt().isBefore(endOfStudyDay)) {
                dueList.add(v);
            } else if (sp.getWrongCount() > 0 && (sp.getAccuracy() == null || sp.getAccuracy().doubleValue() < 70.0)) {
                weakList.add(v);
            } else {
                otherList.add(v);
            }
        }

        // Sort Due by oldest nextReviewAt first
        dueList.sort(Comparator.comparing(v -> {
            StudyProgress sp = progressMap.get(v.getId());
            return sp != null && sp.getNextReviewAt() != null ? sp.getNextReviewAt() : Instant.EPOCH;
        }));

        // Sort Weak by lowest accuracy first
        weakList.sort(Comparator.comparingDouble(v -> {
            StudyProgress sp = progressMap.get(v.getId());
            return sp != null && sp.getAccuracy() != null ? sp.getAccuracy().doubleValue() : 0.0;
        }));

        // 5. Select cards according to quotas
        int maxNew = activePlan.getMaxNewWordsPerDay();
        int minWords = activePlan.getMinWordsPerDay();

        List<Vocabulary> selected = new ArrayList<>();

        // Group 1: All due cards
        selected.addAll(dueList);

        // Group 2: Weak cards
        selected.addAll(weakList);

        // Group 3: New cards up to maxNewWordsPerDay
        int newAdded = 0;
        for (Vocabulary v : newList) {
            if (newAdded < maxNew) {
                selected.add(v);
                newAdded++;
            }
        }

        // Group 4: Backfill with other cards if below minWordsPerDay
        if (selected.size() < minWords) {
            for (Vocabulary v : otherList) {
                if (selected.size() >= minWords) break;
                if (!selected.contains(v)) {
                    selected.add(v);
                }
            }
        }

        // Map to TermCardDto
        List<TermCardDto> cardDtos = selected.stream().map(v -> {
            List<String> syns = vocabularySynonymRepository.findByVocabularyId(v.getId())
                    .stream()
                    .map(VocabularySynonym::getSynonym)
                    .collect(Collectors.toList());
            return new TermCardDto(
                    v.getId(),
                    v.getWord(),
                    v.getMeaning(),
                    v.getPronunciation(),
                    v.getWordType(),
                    v.getExampleSentence(),
                    syns
            );
        }).toList();

        return new TodayStudyQueueResponse(
                activePlan.getId(),
                activePlan.getName(),
                currentStudyDate,
                cardDtos,
                dueList.size(),
                weakList.size(),
                newAdded,
                cardDtos.size()
        );
    }

    /**
     * Updates SM-2 review schedules when answers are recorded in a study session.
     */
    @Transactional
    public void recordSm2Answer(Long userId, Long vocabularyId, boolean isCorrect) {
        recordSm2Answer(userId, vocabularyId, isCorrect, null);
    }

    /**
     * Updates SM-2 review schedules with explicit rating (AGAIN, HARD, GOOD, EASY).
     */
    @Transactional
    public void recordSm2Answer(Long userId, Long vocabularyId, boolean isCorrect, String ratingStr) {
        StudyProgress sp = studyProgressRepository.findByUserIdAndVocabularyId(userId, vocabularyId)
                .orElse(null);

        int currentInterval = sp != null ? sp.getIntervalDays() : 0;
        BigDecimal currentEf = sp != null ? sp.getEaseFactor() : Sm2Service.DEFAULT_EASE_FACTOR;
        int currentReps = sp != null ? sp.getRepetitions() : 0;

        Instant now = Instant.now();
        Sm2Service.SrsRating rating = (ratingStr != null && !ratingStr.isBlank())
                ? Sm2Service.SrsRating.fromString(ratingStr)
                : (isCorrect ? Sm2Service.SrsRating.GOOD : Sm2Service.SrsRating.AGAIN);

        Sm2Service.Sm2Result sm2Result = sm2Service.calculateWithRating(
                currentInterval,
                currentEf,
                currentReps,
                rating,
                now
        );

        int memoryLevel = 1;
        if (sm2Result.intervalDays() > 21) {
            memoryLevel = 3;
        } else if (sm2Result.intervalDays() >= 7) {
            memoryLevel = 2;
        }

        int updated = studyProgressRepository.updateSm2Progress(
                userId,
                vocabularyId,
                sm2Result.intervalDays(),
                sm2Result.easeFactor(),
                sm2Result.repetitions(),
                sm2Result.nextReviewAt(),
                memoryLevel,
                now
        );

        if (updated == 0) {
            StudyProgress newSp = new StudyProgress(userId, vocabularyId);
            newSp.setIntervalDays(sm2Result.intervalDays());
            newSp.setEaseFactor(sm2Result.easeFactor());
            newSp.setRepetitions(sm2Result.repetitions());
            newSp.setNextReviewAt(sm2Result.nextReviewAt());
            newSp.setMemoryLevel(memoryLevel);
            newSp.setLastReviewedAt(now);
            if (isCorrect) {
                newSp.setCorrectCount(1);
                newSp.setCurrentStreak(1);
                newSp.setAccuracy(new BigDecimal("100.00"));
            } else {
                newSp.setWrongCount(1);
                newSp.setCurrentStreak(0);
                newSp.setAccuracy(BigDecimal.ZERO);
            }
            studyProgressRepository.save(newSp);
        }
    }

    /**
     * 7-day Spaced Repetition forecast for a specific deck.
     */
    @Transactional(readOnly = true)
    public SrsForecastResponse getDeckForecast(Long userId, Long deckId) {
        VocabularySet deck = vocabularySetRepository.findById(deckId)
                .orElseThrow(() -> new ResourceNotFoundException("DECK_NOT_FOUND", "Không tìm thấy bộ từ vựng"));
        List<Vocabulary> vocabs = vocabularyRepository.findByDeckId(deckId);
        return computeForecast(userId, deckId, deck.getName(), vocabs);
    }

    /**
     * 7-day Spaced Repetition forecast for current active study plan.
     */
    @Transactional(readOnly = true)
    public SrsForecastResponse getActivePlanForecast(Long userId) {
        StudyPlan plan = studyPlanRepository.findByUserIdAndStatus(userId, StudyPlan.Status.ACTIVE)
                .orElse(null);
        if (plan == null) {
            ZoneId zoneId = ZoneId.of("Asia/Ho_Chi_Minh");
            LocalDate today = getStudyDay(zoneId);
            List<SrsForecastResponse.DayForecast> emptyDays = new ArrayList<>();
            for (int i = 0; i < 7; i++) {
                LocalDate d = today.plusDays(i);
                emptyDays.add(new SrsForecastResponse.DayForecast(
                        toDayLabel(d.getDayOfWeek()),
                        d.toString(),
                        0,
                        i == 0
                ));
            }
            return new SrsForecastResponse(null, "Chưa có lộ trình ôn tập", 0, 0, 0, emptyDays);
        }

        List<Long> deckIds = studyPlanDeckRepository.findByStudyPlanId(plan.getId())
                .stream()
                .map(StudyPlanDeck::getDeckId)
                .toList();

        List<Vocabulary> allVocabs = deckIds.isEmpty() ? Collections.emptyList() : vocabularyRepository.findByDeckIdIn(deckIds);
        Map<String, Vocabulary> dedupedMap = new LinkedHashMap<>();
        for (Vocabulary v : allVocabs) {
            if (v.getWord() != null) {
                dedupedMap.putIfAbsent(normalizeWord(v.getWord()), v);
            }
        }
        return computeForecast(userId, null, plan.getName(), new ArrayList<>(dedupedMap.values()));
    }

    /**
     * Study queue of words due for a specific deck.
     */
    @Transactional(readOnly = true)
    public TodayStudyQueueResponse getDeckStudyQueue(Long userId, Long deckId) {
        VocabularySet deck = vocabularySetRepository.findById(deckId)
                .orElseThrow(() -> new ResourceNotFoundException("DECK_NOT_FOUND", "Không tìm thấy bộ từ vựng"));

        List<Vocabulary> vocabs = vocabularyRepository.findByDeckId(deckId);
        ZoneId zoneId = ZoneId.of("Asia/Ho_Chi_Minh");
        LocalDate today = getStudyDay(zoneId);
        Instant endOfStudyDay = today.plusDays(1).atTime(3, 59, 59).atZone(zoneId).toInstant();

        if (vocabs.isEmpty()) {
            return new TodayStudyQueueResponse(
                    deckId,
                    deck.getName(),
                    today,
                    Collections.emptyList(),
                    0, 0, 0, 0
            );
        }

        List<Long> vocabIds = vocabs.stream().map(Vocabulary::getId).toList();
        Map<Long, StudyProgress> progressMap = studyProgressRepository.findByUserIdAndVocabularyIdIn(userId, vocabIds)
                .stream()
                .collect(Collectors.toMap(StudyProgress::getVocabularyId, p -> p));

        List<Vocabulary> dueList = new ArrayList<>();
        List<Vocabulary> weakList = new ArrayList<>();
        List<Vocabulary> newList = new ArrayList<>();

        for (Vocabulary v : vocabs) {
            StudyProgress sp = progressMap.get(v.getId());
            if (sp == null || (sp.getCorrectCount() == 0 && sp.getWrongCount() == 0)) {
                newList.add(v);
            } else if (sp.getNextReviewAt() != null && sp.getNextReviewAt().isBefore(endOfStudyDay)) {
                dueList.add(v);
            } else if (sp.getWrongCount() > 0 && (sp.getAccuracy() == null || sp.getAccuracy().doubleValue() < 70.0)) {
                weakList.add(v);
            }
        }

        List<Vocabulary> selected = new ArrayList<>();
        selected.addAll(dueList);
        selected.addAll(weakList);
        int newAdded = 0;
        for (Vocabulary v : newList) {
            if (selected.size() >= 30) break;
            selected.add(v);
            newAdded++;
        }

        if (selected.isEmpty()) {
            selected.addAll(vocabs);
        }

        List<TermCardDto> cardDtos = selected.stream().map(v -> {
            List<String> syns = vocabularySynonymRepository.findByVocabularyId(v.getId())
                    .stream()
                    .map(VocabularySynonym::getSynonym)
                    .collect(Collectors.toList());
            StudyProgress sp = progressMap.get(v.getId());
            TermCardDto dto = new TermCardDto(
                    v.getId(),
                    v.getWord(),
                    v.getMeaning(),
                    v.getPronunciation(),
                    v.getWordType(),
                    v.getExampleSentence(),
                    syns
            );
            if (sp != null) {
                dto.setLastReviewedAt(sp.getLastReviewedAt());
                dto.setIntervalDays(sp.getIntervalDays());
                dto.setRepetitions(sp.getRepetitions());
            }
            return dto;
        }).toList();

        return new TodayStudyQueueResponse(
                deckId,
                deck.getName(),
                today,
                cardDtos,
                dueList.size(),
                weakList.size(),
                newAdded,
                cardDtos.size()
        );
    }

    private SrsForecastResponse computeForecast(Long userId, Long deckId, String deckName, List<Vocabulary> vocabularies) {
        ZoneId zoneId = ZoneId.of("Asia/Ho_Chi_Minh");
        LocalDate today = getStudyDay(zoneId);
        Instant endOfToday = today.plusDays(1).atTime(3, 59, 59).atZone(zoneId).toInstant();

        int totalCount = vocabularies.size();
        if (totalCount == 0) {
            List<SrsForecastResponse.DayForecast> emptyDays = new ArrayList<>();
            for (int i = 0; i < 7; i++) {
                LocalDate d = today.plusDays(i);
                emptyDays.add(new SrsForecastResponse.DayForecast(
                        toDayLabel(d.getDayOfWeek()),
                        d.toString(),
                        0,
                        i == 0
                ));
            }
            return new SrsForecastResponse(deckId, deckName, 0, 0, 0, emptyDays);
        }

        List<Long> vocabIds = vocabularies.stream().map(Vocabulary::getId).toList();
        Map<Long, StudyProgress> progressMap = studyProgressRepository.findByUserIdAndVocabularyIdIn(userId, vocabIds)
                .stream()
                .collect(Collectors.toMap(StudyProgress::getVocabularyId, p -> p));

        int masteredCount = 0;
        int dueCount = 0;
        int[] dayCounts = new int[7];

        for (Vocabulary v : vocabularies) {
            StudyProgress sp = progressMap.get(v.getId());
            if (sp == null || (sp.getCorrectCount() == 0 && sp.getWrongCount() == 0)) {
                dueCount++;
                dayCounts[0]++;
            } else {
                if (sp.getIntervalDays() > 21 || sp.getMemoryLevel() == 3) {
                    masteredCount++;
                }

                Instant nextReview = sp.getNextReviewAt();
                if (nextReview == null || !nextReview.isAfter(endOfToday)) {
                    dueCount++;
                    dayCounts[0]++;
                } else {
                    LocalDate reviewDate = nextReview.atZone(zoneId).toLocalDate();
                    long daysDiff = ChronoUnit.DAYS.between(today, reviewDate);
                    if (daysDiff >= 1 && daysDiff < 7) {
                        dayCounts[(int) daysDiff]++;
                    }
                }
            }
        }

        List<SrsForecastResponse.DayForecast> forecastDays = new ArrayList<>();
        for (int i = 0; i < 7; i++) {
            LocalDate d = today.plusDays(i);
            forecastDays.add(new SrsForecastResponse.DayForecast(
                    toDayLabel(d.getDayOfWeek()),
                    d.toString(),
                    dayCounts[i],
                    i == 0
            ));
        }

        return new SrsForecastResponse(deckId, deckName, dueCount, masteredCount, totalCount, forecastDays);
    }

    private String toDayLabel(DayOfWeek dayOfWeek) {
        return switch (dayOfWeek) {
            case MONDAY -> "Th2";
            case TUESDAY -> "Th3";
            case WEDNESDAY -> "Th4";
            case THURSDAY -> "Th5";
            case FRIDAY -> "Th6";
            case SATURDAY -> "Th7";
            case SUNDAY -> "CN";
        };
    }

    // ─────────────────────────────────────────────────────────────
    // Internal Helper Methods
    // ─────────────────────────────────────────────────────────────

    private StudyPlanResponse buildPlanResponse(Long userId, StudyPlan plan) {
        List<StudyPlanDeck> planDecks = studyPlanDeckRepository.findByStudyPlanId(plan.getId());
        List<Long> deckIds = planDecks.stream().map(StudyPlanDeck::getDeckId).toList();

        List<StudyPlanResponse.DeckInfo> deckInfos = new ArrayList<>();
        Set<String> uniqueWords = new HashSet<>();

        if (!deckIds.isEmpty()) {
            Map<Long, String> deckNames = vocabularySetRepository.findAllById(deckIds).stream()
                    .collect(Collectors.toMap(VocabularySet::getId, VocabularySet::getName));

            for (Long deckId : deckIds) {
                List<Vocabulary> vocabs = vocabularyRepository.findByDeckId(deckId);
                deckInfos.add(new StudyPlanResponse.DeckInfo(
                        deckId,
                        deckNames.getOrDefault(deckId, "Bộ thẻ #" + deckId),
                        vocabs.size()
                ));
                vocabs.forEach(v -> {
                    if (v.getWord() != null) uniqueWords.add(normalizeWord(v.getWord()));
                });
            }
        }

        List<Vocabulary> allPlanVocabs = deckIds.isEmpty() ? Collections.emptyList() : vocabularyRepository.findByDeckIdIn(deckIds);
        Map<String, Vocabulary> dedupedPlanMap = new LinkedHashMap<>();
        for (Vocabulary v : allPlanVocabs) {
            if (v.getWord() != null) {
                dedupedPlanMap.putIfAbsent(normalizeWord(v.getWord()), v);
            }
        }
        List<Vocabulary> uniquePlanVocabs = new ArrayList<>(dedupedPlanMap.values());
        List<Long> vocabIds = uniquePlanVocabs.stream().map(Vocabulary::getId).toList();
        Map<Long, StudyProgress> progressMap = vocabIds.isEmpty() ? Collections.emptyMap() :
                studyProgressRepository.findByUserIdAndVocabularyIdIn(userId, vocabIds)
                        .stream().collect(Collectors.toMap(StudyProgress::getVocabularyId, p -> p));

        ZoneId zoneId = parseZoneId(plan.getTimezone());
        LocalDate currentStudyDate = getStudyDay(zoneId);
        Instant endOfStudyDay = currentStudyDate.plusDays(1).atTime(3, 59, 59).atZone(zoneId).toInstant();

        int masteredWords = 0;
        int dueCount = 0;
        int weakCount = 0;
        int unstudiedNewWords = 0;

        for (Vocabulary v : uniquePlanVocabs) {
            StudyProgress sp = progressMap.get(v.getId());
            if (sp == null || (sp.getCorrectCount() == 0 && sp.getWrongCount() == 0)) {
                unstudiedNewWords++;
            } else {
                if (sp.getAccuracy() != null && sp.getAccuracy().doubleValue() >= 80.0 && sp.getRepetitions() >= 2) {
                    masteredWords++;
                }
                if (sp.getNextReviewAt() != null && sp.getNextReviewAt().isBefore(endOfStudyDay)) {
                    dueCount++;
                } else if (sp.getWrongCount() > 0 && (sp.getAccuracy() == null || sp.getAccuracy().doubleValue() < 70.0)) {
                    weakCount++;
                }
            }
        }

        int totalWords = uniquePlanVocabs.size();
        int remainingWords = Math.max(0, totalWords - masteredWords);

        LocalDate today = LocalDate.now();
        long daysRemaining = Math.max(1, ChronoUnit.DAYS.between(today, plan.getTargetDate()) + 1);
        double avgWordsPerDay = Math.round(((double) remainingWords / daysRemaining) * 10.0) / 10.0;
        boolean isOverloaded = avgWordsPerDay > plan.getMaxNewWordsPerDay();

        int newCount = Math.min(plan.getMaxNewWordsPerDay(), unstudiedNewWords);
        int totalToday = dueCount + weakCount + newCount;
        boolean completedToday = totalToday == 0;

        StudyPlanResponse.TodayStats todayStats = new StudyPlanResponse.TodayStats(
                dueCount,
                weakCount,
                newCount,
                totalToday,
                completedToday
        );

        return new StudyPlanResponse(
                plan.getId(),
                plan.getName(),
                plan.getTargetDate(),
                plan.getMaxNewWordsPerDay(),
                plan.getMinWordsPerDay(),
                plan.getTimezone(),
                plan.isHardGateEnabled(),
                plan.getStatus(),
                deckInfos,
                totalWords,
                masteredWords,
                remainingWords,
                daysRemaining,
                avgWordsPerDay,
                isOverloaded,
                todayStats,
                plan.getCreatedAt(),
                plan.getUpdatedAt()
        );
    }

    private ZoneId parseZoneId(String tz) {
        try {
            return (tz != null && !tz.isBlank()) ? ZoneId.of(tz) : ZoneId.of("Asia/Ho_Chi_Minh");
        } catch (Exception e) {
            return ZoneId.of("Asia/Ho_Chi_Minh");
        }
    }

    /**
     * 4:00 AM cutoff rule:
     * If before 4 AM, it's considered part of the previous day's study session.
     */
    private LocalDate getStudyDay(ZoneId zoneId) {
        ZonedDateTime nowZoned = ZonedDateTime.now(zoneId);
        if (nowZoned.getHour() < 4) {
            return nowZoned.toLocalDate().minusDays(1);
        }
        return nowZoned.toLocalDate();
    }

    private String normalizeWord(String word) {
        if (word == null) return "";
        return Normalizer.normalize(word.trim().toLowerCase(), Normalizer.Form.NFC);
    }
}
