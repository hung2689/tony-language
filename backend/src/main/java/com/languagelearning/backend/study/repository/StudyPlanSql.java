package com.languagelearning.backend.study.repository;

/**
 * Compile-time SQL constants for StudyPlan aggregate and deck queries.
 */
public final class StudyPlanSql {

    public static final String DECK_STATS =
            "SELECT vs.id AS \"deckId\", "
            + "vs.name AS \"name\", "
            + "spd.sort_order AS \"sortOrder\", "
            + "COUNT(vsi.vocabulary_id)::int AS \"cardCount\", "
            + "COUNT(vsi.vocabulary_id) FILTER (WHERE " + Sm2SqlConstants.SQL_IS_MASTERED + ")::int AS \"masteredCount\" "
            + "FROM study_plan_decks spd "
            + "JOIN vocabulary_sets vs ON vs.id = spd.deck_id "
            + "LEFT JOIN vocabulary_set_items vsi ON vsi.vocabulary_set_id = vs.id "
            + "LEFT JOIN study_progress sp ON sp.vocabulary_id = vsi.vocabulary_id AND sp.user_id = :userId "
            + "WHERE spd.study_plan_id = :planId "
            + "GROUP BY vs.id, vs.name, spd.id, spd.sort_order "
            + "ORDER BY spd.sort_order ASC, spd.id ASC";

    public static final String PLAN_AGGREGATE =
            "WITH plan_words AS ( "
            + "  SELECT MIN(v.id) AS vocabulary_id "
            + "  FROM study_plan_decks spd "
            + "  JOIN vocabulary_set_items vsi ON vsi.vocabulary_set_id = spd.deck_id "
            + "  JOIN vocabularies v ON v.id = vsi.vocabulary_id "
            + "  WHERE spd.study_plan_id = :planId "
            + "  GROUP BY LOWER(BTRIM(v.word, E' \\t\\n\\r')) "
            + "), "
            + "word_states AS ( "
            + "  SELECT pw.vocabulary_id, "
            + "         (NOT " + Sm2SqlConstants.SQL_IS_STUDIED + ") AS is_new, "
            + "         " + Sm2SqlConstants.SQL_IS_MASTERED + " AS is_mastered, "
            + "         (sp.next_review_at IS NOT NULL AND sp.next_review_at < :endOfStudyDay) AS is_due, "
            + "         " + Sm2SqlConstants.SQL_IS_WEAK + " AS is_weak "
            + "  FROM plan_words pw "
            + "  LEFT JOIN study_progress sp ON sp.vocabulary_id = pw.vocabulary_id AND sp.user_id = :userId "
            + ") "
            + "SELECT COUNT(*)::int AS \"totalWords\", "
            + "       COUNT(*) FILTER (WHERE is_mastered)::int AS \"masteredWords\", "
            + "       COUNT(*) FILTER (WHERE NOT is_new AND NOT is_mastered)::int AS \"learningWords\", "
            + "       COUNT(*) FILTER (WHERE is_new)::int AS \"unstudiedNewWords\", "
            + "       COUNT(*) FILTER (WHERE NOT is_new AND is_due)::int AS \"dueCount\", "
            + "       COUNT(*) FILTER (WHERE NOT is_new AND NOT is_due AND is_weak)::int AS \"weakCount\" "
            + "FROM word_states";

    public static final String NORMALIZE_SORT_ORDER =
            "WITH ranked AS ( "
            + "  SELECT id, "
            + "         ROW_NUMBER() OVER (PARTITION BY study_plan_id ORDER BY sort_order ASC, id ASC)::int AS rn "
            + "  FROM study_plan_decks "
            + "  WHERE study_plan_id = :planId "
            + ") "
            + "UPDATE study_plan_decks spd "
            + "SET sort_order = ranked.rn "
            + "FROM ranked "
            + "WHERE spd.id = ranked.id AND spd.sort_order <> ranked.rn";




    public static final String TODAY_QUEUE_SUMMARY =
            "WITH plan_words AS ( "
            + "  SELECT MIN(v.id) AS vocabulary_id "
            + "  FROM study_plan_decks spd "
            + "  JOIN vocabulary_set_items vsi ON vsi.vocabulary_set_id = spd.deck_id "
            + "  JOIN vocabularies v ON v.id = vsi.vocabulary_id "
            + "  WHERE spd.study_plan_id = ? "
            + "    AND v.word IS NOT NULL "
            + "  GROUP BY v.word_norm "
            + "), "
            + "word_states AS ( "
            + "  SELECT "
            + "    pw.vocabulary_id, "
            + "    CASE "
            + "      WHEN sp.id IS NULL OR (COALESCE(sp.correct_count, 0) = 0 AND COALESCE(sp.wrong_count, 0) = 0) THEN 3 "
            + "      WHEN sp.next_review_at IS NOT NULL AND sp.next_review_at < ? THEN 1 "
            + "      WHEN COALESCE(sp.wrong_count, 0) > 0 AND (sp.accuracy IS NULL OR sp.accuracy < " + Sm2SqlConstants.WEAK_MAX_ACCURACY + ") THEN 2 "
            + "      ELSE 4 "
            + "    END AS category "
            + "  FROM plan_words pw "
            + "  LEFT JOIN study_progress sp ON sp.vocabulary_id = pw.vocabulary_id AND sp.user_id = ? "
            + "), "
            + "counts AS ( "
            + "  SELECT "
            + "    COUNT(*) FILTER (WHERE category = 1)::int AS due_count, "
            + "    COUNT(*) FILTER (WHERE category = 2)::int AS weak_count, "
            + "    COUNT(*) FILTER (WHERE category = 3)::int AS new_count, "
            + "    COUNT(*) FILTER (WHERE category = 4)::int AS other_count "
            + "  FROM word_states "
            + "), "
            + "computed AS ( "
            + "  SELECT "
            + "    due_count, "
            + "    weak_count, "
            + "    LEAST(?::int, new_count)::int AS new_count, "
            + "    other_count "
            + "  FROM counts "
            + ") "
            + "SELECT "
            + "  due_count, "
            + "  weak_count, "
            + "  new_count, "
            + "  (due_count + weak_count + new_count + LEAST(other_count, GREATEST(0, ?::int - (due_count + weak_count + new_count))))::int AS total_count "
            + "FROM computed";

    private StudyPlanSql() {
    }
}
