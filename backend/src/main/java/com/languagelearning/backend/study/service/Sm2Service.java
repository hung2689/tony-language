package com.languagelearning.backend.study.service;

import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Instant;
import java.time.temporal.ChronoUnit;

@Service
public class Sm2Service {

    public static final BigDecimal MIN_EASE_FACTOR = new BigDecimal("1.30");
    public static final BigDecimal DEFAULT_EASE_FACTOR = new BigDecimal("2.50");
    public static final BigDecimal MAX_EASE_FACTOR = new BigDecimal("3.00");

    public enum SrsRating {
        AGAIN(1),
        HARD(2),
        GOOD(3),
        EASY(4);

        private final int value;

        SrsRating(int value) {
            this.value = value;
        }

        public int getValue() {
            return value;
        }

        public static SrsRating fromString(String val) {
            if (val == null || val.isBlank()) return GOOD;
            for (SrsRating r : values()) {
                if (r.name().equalsIgnoreCase(val) || String.valueOf(r.value).equals(val)) {
                    return r;
                }
            }
            return GOOD;
        }
    }

    public record Sm2Result(
            int intervalDays,
            BigDecimal easeFactor,
            int repetitions,
            Instant nextReviewAt
    ) {}

    /**
     * Pure calculation of next interval, repetitions, and ease factor using SM-2 (binary correct/incorrect).
     */
    public Sm2Result calculateNextReview(
            int currentInterval,
            BigDecimal currentEf,
            int currentReps,
            boolean isCorrect,
            Instant now
    ) {
        return calculateWithRating(
                currentInterval,
                currentEf,
                currentReps,
                isCorrect ? SrsRating.GOOD : SrsRating.AGAIN,
                now
        );
    }

    /**
     * Multi-level rating calculation (4-level SuperMemo/Anki standard: Again, Hard, Good, Easy).
     */
    public Sm2Result calculateWithRating(
            int currentInterval,
            BigDecimal currentEf,
            int currentReps,
            SrsRating rating,
            Instant now
    ) {
        BigDecimal ef = (currentEf != null) ? currentEf : DEFAULT_EASE_FACTOR;
        if (now == null) {
            now = Instant.now();
        }
        if (rating == null) {
            rating = SrsRating.GOOD;
        }

        int nextReps;
        int nextInterval;
        BigDecimal nextEf;

        switch (rating) {
            case AGAIN -> {
                nextReps = 0;
                nextInterval = 1;
                nextEf = ef.subtract(new BigDecimal("0.20"));
            }
            case HARD -> {
                nextReps = currentReps + 1;
                if (currentInterval <= 1) {
                    nextInterval = 1;
                } else {
                    nextInterval = Math.max(1, (int) Math.round(currentInterval * 1.2));
                }
                nextEf = ef.subtract(new BigDecimal("0.15"));
            }
            case EASY -> {
                nextReps = currentReps + 1;
                if (nextReps == 1) {
                    nextInterval = 4;
                } else if (nextReps == 2) {
                    nextInterval = 10;
                } else {
                    double computed = currentInterval * ef.doubleValue() * 1.3;
                    nextInterval = Math.max(currentInterval + 2, (int) Math.round(computed));
                }
                nextEf = ef.add(new BigDecimal("0.15"));
            }
            case GOOD -> {
                nextReps = currentReps + 1;
                if (nextReps == 1) {
                    nextInterval = 1;
                } else if (nextReps == 2) {
                    nextInterval = 6;
                } else {
                    double computed = currentInterval * ef.doubleValue();
                    nextInterval = Math.max(1, (int) Math.round(computed));
                    if (nextInterval <= currentInterval) {
                        nextInterval = currentInterval + 1;
                    }
                }
                nextEf = ef.add(new BigDecimal("0.10"));
            }
            default -> {
                nextReps = currentReps + 1;
                nextInterval = Math.max(1, currentInterval + 1);
                nextEf = ef;
            }
        }

        // Clamp ease factor between [1.30, 3.00]
        if (nextEf.compareTo(MIN_EASE_FACTOR) < 0) {
            nextEf = MIN_EASE_FACTOR;
        } else if (nextEf.compareTo(MAX_EASE_FACTOR) > 0) {
            nextEf = MAX_EASE_FACTOR;
        }
        nextEf = nextEf.setScale(2, RoundingMode.HALF_UP);

        Instant nextReviewAt = now.plus(nextInterval, ChronoUnit.DAYS);

        return new Sm2Result(nextInterval, nextEf, nextReps, nextReviewAt);
    }
}
