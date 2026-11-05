package com.languagelearning.backend.study.repository;

/**
 * Single source of truth for SM-2 thresholds and reusable SQL predicates.
 */
public final class Sm2SqlConstants {

    public static final double MASTERED_MIN_ACCURACY = 80.0;
    public static final int MASTERED_MIN_REPETITIONS = 2;
    public static final double WEAK_MAX_ACCURACY = 70.0;

    public static final String SQL_IS_STUDIED =
            "(COALESCE(sp.correct_count, 0) > 0 OR COALESCE(sp.wrong_count, 0) > 0)";

    public static final String SQL_IS_MASTERED =
            "(" + SQL_IS_STUDIED
            + " AND COALESCE(sp.accuracy, 0) >= " + MASTERED_MIN_ACCURACY
            + " AND COALESCE(sp.repetitions, 0) >= " + MASTERED_MIN_REPETITIONS + ")";

    public static final String SQL_IS_WEAK =
            "(COALESCE(sp.wrong_count, 0) > 0 AND COALESCE(sp.accuracy, 0) < " + WEAK_MAX_ACCURACY + ")";

    private Sm2SqlConstants() {
    }
}
