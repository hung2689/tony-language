package com.languagelearning.backend.level;

/**
 * Single centralized configuration class for all Student Level and XP rules.
 * All constants are tunable and unit tested.
 */
public final class XpConfig {

    private XpConfig() {}

    /** XP awarded for answering correctly on the first attempt */
    public static final int FIRST_ATTEMPT_CORRECT_XP = 5;

    /** XP awarded for answering correctly after a previous miss (attempt > 1) */
    public static final int RETRY_CORRECT_XP = 2;

    /** XP awarded for wrong or skipped answers */
    public static final int WRONG_OR_SKIPPED_XP = 0;

    /** XP awarded for 'Tôi đã đúng' override (0 XP to prevent abuse) */
    public static final int OVERRIDE_XP = 0;

    /** XP bonus awarded when finishing a study session with >= 5 answers */
    public static final int SESSION_FINISHED_XP = 10;

    /** Minimum answers required in a finished session to earn the session completion bonus */
    public static final int SESSION_MIN_ANSWERS_FOR_BONUS = 5;

    /** Daily goal / streak bonus XP awarded once per day */
    public static final int DAILY_STREAK_BONUS_XP = 20;

    /** Maximum XP a user can earn per calendar day (UTC/Local) */
    public static final int DAILY_CAP_XP = 500;

    /** Maximum achievable student level */
    public static final int MAX_LEVEL = 100;

    /** Base coefficient in the cumulative level formula: 40 * L * (L - 1) */
    public static final int LEVEL_CURVE_COEFFICIENT = 40;
}
