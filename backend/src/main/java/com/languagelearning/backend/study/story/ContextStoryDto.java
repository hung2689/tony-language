package com.languagelearning.backend.study.story;

import java.util.ArrayList;
import java.util.List;

public class ContextStoryDto {
    private String id;
    private Long deckId;
    private String title;
    private List<StoryParagraphDto> paragraphs = new ArrayList<>();
    private int totalBlanks;

    public ContextStoryDto() {
    }

    public ContextStoryDto(String id, Long deckId, String title, List<StoryParagraphDto> paragraphs, int totalBlanks) {
        this.id = id;
        this.deckId = deckId;
        this.title = title;
        this.paragraphs = paragraphs != null ? paragraphs : new ArrayList<>();
        this.totalBlanks = totalBlanks;
    }

    public String getId() {
        return id;
    }

    public void setId(String id) {
        this.id = id;
    }

    public Long getDeckId() {
        return deckId;
    }

    public void setDeckId(Long deckId) {
        this.deckId = deckId;
    }

    public String getTitle() {
        return title;
    }

    public void setTitle(String title) {
        this.title = title;
    }

    public List<StoryParagraphDto> getParagraphs() {
        return paragraphs;
    }

    public void setParagraphs(List<StoryParagraphDto> paragraphs) {
        this.paragraphs = paragraphs != null ? paragraphs : new ArrayList<>();
    }

    public int getTotalBlanks() {
        return totalBlanks;
    }

    public void setTotalBlanks(int totalBlanks) {
        this.totalBlanks = totalBlanks;
    }
}
