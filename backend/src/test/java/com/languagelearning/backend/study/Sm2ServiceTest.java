package com.languagelearning.backend.study;

import com.languagelearning.backend.study.service.Sm2Service;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.time.Duration;
import java.time.Instant;

import static org.junit.jupiter.api.Assertions.*;

class Sm2ServiceTest {

    private Sm2Service sm2Service;
    private Instant now;

    @BeforeEach
    void setUp() {
        sm2Service = new Sm2Service();
        now = Instant.now();
    }

    @Test
    @DisplayName("First correct answer: interval 1 day, repetition 1")
    void firstCorrectAnswer() {
        Sm2Service.Sm2Result result = sm2Service.calculateNextReview(
                0,
                Sm2Service.DEFAULT_EASE_FACTOR,
                0,
                true,
                now
        );

        assertEquals(1, result.intervalDays());
        assertEquals(1, result.repetitions());
        assertEquals(new BigDecimal("2.60"), result.easeFactor());
        long diffHours = Duration.between(now, result.nextReviewAt()).toHours();
        assertTrue(diffHours >= 23 && diffHours <= 25);
    }

    @Test
    @DisplayName("Second consecutive correct answer: interval 6 days, repetition 2")
    void secondCorrectAnswer() {
        Sm2Service.Sm2Result result = sm2Service.calculateNextReview(
                1,
                new BigDecimal("2.60"),
                1,
                true,
                now
        );

        assertEquals(6, result.intervalDays());
        assertEquals(2, result.repetitions());
        assertEquals(new BigDecimal("2.70"), result.easeFactor());
    }

    @Test
    @DisplayName("Third correct answer: interval multiplied by EF (6 * 2.7 = 16)")
    void thirdCorrectAnswer() {
        Sm2Service.Sm2Result result = sm2Service.calculateNextReview(
                6,
                new BigDecimal("2.70"),
                2,
                true,
                now
        );

        assertEquals(16, result.intervalDays());
        assertEquals(3, result.repetitions());
        assertEquals(new BigDecimal("2.80"), result.easeFactor());
    }

    @Test
    @DisplayName("Wrong answer: resets interval to 1, repetition to 0, EF drops by 0.20")
    void wrongAnswer() {
        Sm2Service.Sm2Result result = sm2Service.calculateNextReview(
                16,
                new BigDecimal("2.50"),
                3,
                false,
                now
        );

        assertEquals(1, result.intervalDays());
        assertEquals(0, result.repetitions());
        assertEquals(new BigDecimal("2.30"), result.easeFactor());
    }

    @Test
    @DisplayName("EF never drops below MIN_EASE_FACTOR (1.30)")
    void easeFactorFloor() {
        Sm2Service.Sm2Result result = sm2Service.calculateNextReview(
                1,
                new BigDecimal("1.35"),
                1,
                false,
                now
        );

        assertEquals(1, result.intervalDays());
        assertEquals(0, result.repetitions());
        assertEquals(new BigDecimal("1.30"), result.easeFactor());
    }

    @Test
    @DisplayName("Monotonic interval: interval strictly increases when EF is low and computed interval <= current")
    void intervalStrictlyIncreasesEvenWithLowEf() {
        Sm2Service.Sm2Result result = sm2Service.calculateNextReview(
                1,
                new BigDecimal("1.30"),
                2,
                true,
                now
        );
        assertEquals(2, result.intervalDays());
        assertEquals(3, result.repetitions());
    }
}
