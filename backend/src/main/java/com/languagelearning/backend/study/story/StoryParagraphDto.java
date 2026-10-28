package com.languagelearning.backend.study.story;

import java.util.ArrayList;
import java.util.List;

public class StoryParagraphDto {
    private int paragraphIndex;
    private String title;
    private String topic;
    private String text;
    private String translation;
    private List<StoryBlankDto> blanks = new ArrayList<>();
    private List<String> usedWords = new ArrayList<>();

    public StoryParagraphDto() {
    }

    public StoryParagraphDto(int paragraphIndex, String text, String translation, List<StoryBlankDto> blanks) {
        this(paragraphIndex, null, null, text, translation, blanks, new ArrayList<>());
    }

    public StoryParagraphDto(int paragraphIndex, String title, String topic, String text, String translation, List<StoryBlankDto> blanks, List<String> usedWords) {
        this.paragraphIndex = paragraphIndex;
        this.title = title;
        this.topic = topic;
        this.text = text;
        this.translation = translation;
        this.blanks = blanks != null ? blanks : new ArrayList<>();
        this.usedWords = usedWords != null ? usedWords : new ArrayList<>();
    }

    public int getParagraphIndex() {
        return paragraphIndex;
    }

    public void setParagraphIndex(int paragraphIndex) {
        this.paragraphIndex = paragraphIndex;
    }

    public String getTitle() {
        return title;
    }

    public void setTitle(String title) {
        this.title = title;
    }

    public String getTopic() {
        return topic;
    }

    public void setTopic(String topic) {
        this.topic = topic;
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

    public List<String> getUsedWords() {
        return usedWords;
    }

    public void setUsedWords(List<String> usedWords) {
        this.usedWords = usedWords != null ? usedWords : new ArrayList<>();
    }
}
