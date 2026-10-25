package com.languagelearning.backend.analytics.service;

import com.languagelearning.backend.analytics.dto.*;
import com.languagelearning.backend.deck.entity.VocabularySet;
import com.languagelearning.backend.deck.repository.VocabularySetRepository;
import com.languagelearning.backend.study.entity.StudyProgress;
import com.languagelearning.backend.study.entity.StudySession;
import com.languagelearning.backend.study.repository.StudyProgressRepository;
import com.languagelearning.backend.study.repository.StudySessionRepository;
import com.languagelearning.backend.term.entity.Vocabulary;
import com.languagelearning.backend.term.repository.VocabularyRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.*;
import java.util.*;
import java.util.stream.Collectors;

@Service
public class AnalyticsService {

    private final StudySessionRepository studySessionRepository;
    private final StudyProgressRepository studyProgressRepository;
    private final VocabularySetRepository vocabularySetRepository;
    private final VocabularyRepository vocabularyRepository;

    public AnalyticsService(StudySessionRepository studySessionRepository,
                            StudyProgressRepository studyProgressRepository,
                            VocabularySetRepository vocabularySetRepository,
                            VocabularyRepository vocabularyRepository) {
        this.studySessionRepository = studySessionRepository;
        this.studyProgressRepository = studyProgressRepository;
        this.vocabularySetRepository = vocabularySetRepository;
        this.vocabularyRepository = vocabularyRepository;
    }

    @Transactional(readOnly = true)
    public AnalyticsOverviewResponse getOverview(Long userId, ZoneId zoneId) {
        List<StudySession> sessions = studySessionRepository.findByUserIdOrderByStartedAtAsc(userId);
        List<StudyProgress> progressList = studyProgressRepository.findByUserId(userId);

        int totalQuestions = 0;
        int correctQuestions = 0;
        int wrongQuestions = 0;

        TreeSet<LocalDate> activeDates = new TreeSet<>();

        for (StudySession s : sessions) {
            totalQuestions += s.getTotalQuestions();
            correctQuestions += s.getCorrectAnswers();
            wrongQuestions += s.getWrongAnswers();

            if (s.getStartedAt() != null && s.getTotalQuestions() > 0) {
                LocalDate date = s.getStartedAt().atZone(zoneId).toLocalDate();
                activeDates.add(date);
            }
        }

        double overallAccuracy = totalQuestions > 0
                ? BigDecimal.valueOf((correctQuestions * 100.0) / totalQuestions)
                    .setScale(1, RoundingMode.HALF_UP).doubleValue()
                : 0.0;

        int currentStreak = calculateCurrentStreak(activeDates, LocalDate.now(zoneId));
        int longestStreak = calculateLongestStreak(activeDates);

        int totalLearnedCards = (int) progressList.stream()
                .filter(p -> p.getCorrectCount() > 0 || p.getWrongCount() > 0)
                .count();

        return new AnalyticsOverviewResponse(
                currentStreak,
                longestStreak,
                totalQuestions,
                correctQuestions,
                wrongQuestions,
                overallAccuracy,
                activeDates.size(),
                totalLearnedCards
        );
    }

    @Transactional(readOnly = true)
    public HeatmapResponse getHeatmap(Long userId, int year, ZoneId zoneId) {
        LocalDate startOfYear = LocalDate.of(year, 1, 1);

        Instant startInstant = startOfYear.atStartOfDay(zoneId).toInstant();
        Instant endInstant = startOfYear.plusYears(1).atStartOfDay(zoneId).toInstant();

        List<StudySession> sessions = studySessionRepository
                .findByUserIdAndStartedAtBetweenOrderByStartedAtAsc(userId, startInstant, endInstant);

        // Group by LocalDate
        Map<LocalDate, List<StudySession>> byDate = new HashMap<>();
        for (StudySession s : sessions) {
            if (s.getStartedAt() != null && s.getTotalQuestions() > 0) {
                LocalDate date = s.getStartedAt().atZone(zoneId).toLocalDate();
                byDate.computeIfAbsent(date, k -> new ArrayList<>()).add(s);
            }
        }

        List<DailyActivityDto> days = new ArrayList<>();
        int totalQuestionsYear = 0;
        int totalCorrectYear = 0;

        for (Map.Entry<LocalDate, List<StudySession>> entry : byDate.entrySet()) {
            LocalDate d = entry.getKey();
            int totalQ = 0;
            int correctQ = 0;
            int wrongQ = 0;

            for (StudySession s : entry.getValue()) {
                totalQ += s.getTotalQuestions();
                correctQ += s.getCorrectAnswers();
                wrongQ += s.getWrongAnswers();
            }

            totalQuestionsYear += totalQ;
            totalCorrectYear += correctQ;

            double acc = totalQ > 0
                    ? BigDecimal.valueOf((correctQ * 100.0) / totalQ).setScale(1, RoundingMode.HALF_UP).doubleValue()
                    : 0.0;

            int level;
            if (totalQ == 0) level = 0;
            else if (totalQ < 10) level = 1;
            else if (totalQ < 25) level = 2;
            else if (totalQ < 50) level = 3;
            else level = 4;

            days.add(new DailyActivityDto(
                    d.toString(),
                    totalQ,
                    correctQ,
                    wrongQ,
                    acc,
                    level
            ));
        }

        days.sort(Comparator.comparing(DailyActivityDto::date));

        double avgAccuracy = totalQuestionsYear > 0
                ? BigDecimal.valueOf((totalCorrectYear * 100.0) / totalQuestionsYear)
                    .setScale(1, RoundingMode.HALF_UP).doubleValue()
                : 0.0;

        return new HeatmapResponse(
                year,
                byDate.size(),
                totalQuestionsYear,
                avgAccuracy,
                days
        );
    }

    @Transactional(readOnly = true)
    public RetentionDistributionResponse getRetentionDistribution(Long userId) {
        List<Long> deckIds = vocabularySetRepository.findByUserIdOrderByCreatedAtDesc(userId)
                .stream()
                .map(VocabularySet::getId)
                .toList();

        int totalCards = 0;
        if (!deckIds.isEmpty()) {
            List<Vocabulary> allCards = vocabularyRepository.findByDeckIdIn(deckIds);
            totalCards = allCards.size();
        }

        List<StudyProgress> progressList = studyProgressRepository.findByUserId(userId);

        int mastered = 0;
        int reviewing = 0;
        int learning = 0;

        for (StudyProgress p : progressList) {
            int interval = p.getIntervalDays();
            boolean hasPracticed = p.getCorrectCount() > 0 || p.getWrongCount() > 0;

            if (interval > 21) {
                mastered++;
            } else if (interval >= 7) {
                reviewing++;
            } else if (hasPracticed) {
                learning++;
            }
        }

        int activeCount = mastered + reviewing + learning;
        int unseen = Math.max(0, totalCards - activeCount);

        return new RetentionDistributionResponse(
                unseen,
                learning,
                reviewing,
                mastered,
                Math.max(totalCards, activeCount)
        );
    }

    @Transactional(readOnly = true)
    public List<WeakWordDto> getWeakWords(Long userId, int limit) {
        List<StudyProgress> progressList = studyProgressRepository.findByUserId(userId);

        List<StudyProgress> weakProgress = progressList.stream()
                .filter(p -> p.getWrongCount() > 0)
                .sorted((a, b) -> {
                    // Sort descending by wrongCount, then ascending by accuracy
                    int cmp = Integer.compare(b.getWrongCount(), a.getWrongCount());
                    if (cmp != 0) return cmp;
                    return Double.compare(
                            a.getAccuracy() != null ? a.getAccuracy().doubleValue() : 0.0,
                            b.getAccuracy() != null ? b.getAccuracy().doubleValue() : 0.0
                    );
                })
                .limit(limit > 0 ? limit : 10)
                .toList();

        if (weakProgress.isEmpty()) {
            return Collections.emptyList();
        }

        List<Long> vocabIds = weakProgress.stream().map(StudyProgress::getVocabularyId).toList();
        Map<Long, Vocabulary> vocabMap = vocabularyRepository.findAllById(vocabIds)
                .stream()
                .collect(Collectors.toMap(Vocabulary::getId, v -> v));

        List<WeakWordDto> result = new ArrayList<>();
        for (StudyProgress sp : weakProgress) {
            Vocabulary v = vocabMap.get(sp.getVocabularyId());
            if (v != null) {
                double acc = sp.getAccuracy() != null ? sp.getAccuracy().doubleValue() : 0.0;
                result.add(new WeakWordDto(
                        v.getId(),
                        v.getWord(),
                        v.getMeaning(),
                        sp.getWrongCount(),
                        sp.getCorrectCount(),
                        acc,
                        sp.getLastReviewedAt()
                ));
            }
        }

        return result;
    }

    private int calculateCurrentStreak(NavigableSet<LocalDate> dates, LocalDate today) {
        if (dates.isEmpty()) return 0;

        LocalDate checkDate = today;
        if (!dates.contains(checkDate)) {
            checkDate = today.minusDays(1);
            if (!dates.contains(checkDate)) {
                return 0;
            }
        }

        int streak = 0;
        while (dates.contains(checkDate)) {
            streak++;
            checkDate = checkDate.minusDays(1);
        }

        return streak;
    }

    private int calculateLongestStreak(NavigableSet<LocalDate> dates) {
        if (dates.isEmpty()) return 0;

        int maxStreak = 0;
        int currentStreak = 0;
        LocalDate prevDate = null;

        for (LocalDate d : dates) {
            if (prevDate == null || d.minusDays(1).isEqual(prevDate)) {
                currentStreak++;
            } else {
                currentStreak = 1;
            }
            if (currentStreak > maxStreak) {
                maxStreak = currentStreak;
            }
            prevDate = d;
        }

        return maxStreak;
    }
}
