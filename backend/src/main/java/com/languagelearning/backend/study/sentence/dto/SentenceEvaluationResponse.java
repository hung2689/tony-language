package com.languagelearning.backend.study.sentence.dto;

import java.util.List;

public class SentenceEvaluationResponse {
    private int score; // 0 - 100
    private boolean passed; // score >= 70
    private boolean targetWordUsed;
    private String rating; // EXCELLENT, GOOD, NEEDS_IMPROVEMENT, INCORRECT
    private String feedback;
    private String correctedSentence;
    private String nativeAlternative;
    private List<String> grammarNotes;
    private String contextTip; // Practical, usual real-world context tip

    public SentenceEvaluationResponse() {}

    public SentenceEvaluationResponse(
            int score,
            boolean passed,
            boolean targetWordUsed,
            String rating,
            String feedback,
            String correctedSentence,
            String nativeAlternative,
            List<String> grammarNotes
    ) {
        this(score, passed, targetWordUsed, rating, feedback, correctedSentence, nativeAlternative, grammarNotes, null);
    }

    public SentenceEvaluationResponse(
            int score,
            boolean passed,
            boolean targetWordUsed,
            String rating,
            String feedback,
            String correctedSentence,
            String nativeAlternative,
            List<String> grammarNotes,
            String contextTip
    ) {
        this.score = score;
        this.passed = passed;
        this.targetWordUsed = targetWordUsed;
        this.rating = rating;
        this.feedback = feedback;
        this.correctedSentence = correctedSentence;
        this.nativeAlternative = nativeAlternative;
        this.grammarNotes = grammarNotes;
        this.contextTip = contextTip;
    }

    public int getScore() {
        return score;
    }

    public void setScore(int score) {
        this.score = score;
    }

    public boolean isPassed() {
        return passed;
    }

    public void setPassed(boolean passed) {
        this.passed = passed;
    }

    public boolean isTargetWordUsed() {
        return targetWordUsed;
    }

    public void setTargetWordUsed(boolean targetWordUsed) {
        this.targetWordUsed = targetWordUsed;
    }

    public String getRating() {
        return rating;
    }

    public void setRating(String rating) {
        this.rating = rating;
    }

    public String getFeedback() {
        return feedback;
    }

    public void setFeedback(String feedback) {
        this.feedback = feedback;
    }

    public String getCorrectedSentence() {
        return correctedSentence;
    }

    public void setCorrectedSentence(String correctedSentence) {
        this.correctedSentence = correctedSentence;
    }

    public String getNativeAlternative() {
        return nativeAlternative;
    }

    public void setNativeAlternative(String nativeAlternative) {
        this.nativeAlternative = nativeAlternative;
    }

    public List<String> getGrammarNotes() {
        return grammarNotes;
    }

    public void setGrammarNotes(List<String> grammarNotes) {
        this.grammarNotes = grammarNotes;
    }

    public String getContextTip() {
        return contextTip;
    }

    public void setContextTip(String contextTip) {
        this.contextTip = contextTip;
    }
}
