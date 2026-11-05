package com.languagelearning.backend.study.repository;

public interface DeckStatProjection {
    Long getDeckId();
    String getName();
    Integer getSortOrder();
    Integer getCardCount();
    Integer getMasteredCount();
}
