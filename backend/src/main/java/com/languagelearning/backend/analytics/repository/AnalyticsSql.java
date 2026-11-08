package com.languagelearning.backend.analytics.repository;

public final class AnalyticsSql {

    private AnalyticsSql() {}

    public static final String OVERVIEW_TOTALS = """
        SELECT
            (SELECT COALESCE(SUM(total_questions), 0) FROM study_sessions WHERE user_id = ?) AS total_questions,
            (SELECT COALESCE(SUM(correct_answers), 0) FROM study_sessions WHERE user_id = ?) AS correct_answers,
            (SELECT COALESCE(SUM(wrong_answers), 0) FROM study_sessions WHERE user_id = ?) AS wrong_answers,
            (SELECT COUNT(*) FROM study_progress WHERE user_id = ? AND (correct_count > 0 OR wrong_count > 0)) AS total_learned_cards
        """;

    public static final String OVERVIEW_ACTIVE_DATES = """
        SELECT DISTINCT (started_at AT TIME ZONE ?)::date AS study_date
        FROM study_sessions
        WHERE user_id = ? AND started_at IS NOT NULL AND total_questions > 0
        ORDER BY study_date ASC
        """;

    public static final String HEATMAP_DAILY = """
        SELECT
            (started_at AT TIME ZONE ?)::date AS study_date,
            SUM(total_questions) AS total_q,
            SUM(correct_answers) AS correct_q,
            SUM(wrong_answers) AS wrong_q
        FROM study_sessions
        WHERE user_id = ?
          AND started_at >= ?
          AND started_at < ?
          AND total_questions > 0
        GROUP BY 1
        ORDER BY 1 ASC
        """;

    public static final String RETENTION_DISTRIBUTION = """
        SELECT
            (
                SELECT COUNT(DISTINCT vsi.vocabulary_id)
                FROM vocabulary_set_items vsi
                JOIN vocabulary_sets vs ON vsi.vocabulary_set_id = vs.id
                WHERE vs.user_id = ?
            ) AS total_cards,
            COUNT(*) FILTER (WHERE interval_days > 21) AS mastered,
            COUNT(*) FILTER (WHERE interval_days >= 7 AND interval_days <= 21) AS reviewing,
            COUNT(*) FILTER (WHERE interval_days < 7 AND (correct_count > 0 OR wrong_count > 0)) AS learning
        FROM study_progress
        WHERE user_id = ?
        """;

    public static final String WEAK_WORDS = """
        SELECT
            v.id AS vocab_id,
            v.word AS word,
            v.meaning AS meaning,
            sp.wrong_count AS wrong_count,
            sp.correct_count AS correct_count,
            COALESCE(sp.accuracy, 0.0) AS accuracy,
            sp.last_reviewed_at AS last_reviewed_at
        FROM study_progress sp
        JOIN vocabularies v ON sp.vocabulary_id = v.id
        WHERE sp.user_id = ?
          AND sp.wrong_count > 0
        ORDER BY sp.wrong_count DESC, sp.accuracy ASC, sp.vocabulary_id ASC
        LIMIT ?
        """;
}
