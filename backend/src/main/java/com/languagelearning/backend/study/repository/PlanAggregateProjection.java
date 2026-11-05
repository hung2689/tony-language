package com.languagelearning.backend.study.repository;

public interface PlanAggregateProjection {
    Integer getTotalWords();
    Integer getMasteredWords();
    Integer getLearningWords();
    Integer getUnstudiedNewWords();
    Integer getDueCount();
    Integer getWeakCount();
}
