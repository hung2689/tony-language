package com.languagelearning.backend.study.story;

import java.util.ArrayList;
import java.util.List;

public class StoryParagraphDto {
    private int paragraphIndex;
    private String text;
    private String translation;
    private List<StoryBlankDto> blanks = new ArrayList<>();

    public StoryParagraphDto() {
    }

    public StoryParagraphDto(int paragraphIndex, String text, String translation, List<StoryBlankDto> blanks) {
        this.paragraphIndex = paragraphIndex;
        this.text = text;
        this.translation = translation;
        this.blanks = blanks != null ? blanks : new ArrayList<>();
    }

    public int getParagraphIndex() {
        return paragraphIndex;
    }

    public void setParagraphIndex(int paragraphIndex) {
        this.paragraphIndex = paragraphIndex;
    }

    public String getText() {
        return text;
    }

    public void setText(String text) {
        this.text = text;
    }

    public String getTranslation() {
        return translation;
    }

    public void setTranslation(String translation) {
        this.translation = translation;
    }

    public List<StoryBlankDto> getBlanks() {
        return blanks;
    }

    public void setBlanks(List<StoryBlankDto> blanks) {
        this.blanks = blanks != null ? blanks : new ArrayList<>();
    }
}
