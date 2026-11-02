package com.languagelearning.backend.study.synonym.dto;

import java.util.ArrayList;
import java.util.List;

public class SynonymEvaluateResponse {

    private String evaluationMode; // "AI_GEMINI" or "LOCAL_FALLBACK"
    private List<EvaluatedWordDto> evaluatedWords = new ArrayList<>();
    private List<MissedSynonymDto> missedSynonyms = new ArrayList<>();
    private int totalSubmitted;
    private int validCount;
    private int invalidCount;
    private int newDiscoveredCount;
    private String warningMessage;

    public SynonymEvaluateResponse() {
    }

    public SynonymEvaluateResponse(String evaluationMode, List<EvaluatedWordDto> evaluatedWords,
                                   List<MissedSynonymDto> missedSynonyms, int totalSubmitted,
                                   int validCount, int invalidCount, int newDiscoveredCount,
                                   String warningMessage) {
        this.evaluationMode = evaluationMode;
        this.evaluatedWords = evaluatedWords != null ? evaluatedWords : new ArrayList<>();
        this.missedSynonyms = missedSynonyms != null ? missedSynonyms : new ArrayList<>();
        this.totalSubmitted = totalSubmitted;
        this.validCount = validCount;
        this.invalidCount = invalidCount;
        this.newDiscoveredCount = newDiscoveredCount;
        this.warningMessage = warningMessage;
    }

    public String getEvaluationMode() {
        return evaluationMode;
    }

    public void setEvaluationMode(String evaluationMode) {
        this.evaluationMode = evaluationMode;
    }

    public List<EvaluatedWordDto> getEvaluatedWords() {
        return evaluatedWords;
    }

    public void setEvaluatedWords(List<EvaluatedWordDto> evaluatedWords) {
        this.evaluatedWords = evaluatedWords;
    }

    public List<MissedSynonymDto> getMissedSynonyms() {
        return missedSynonyms;
    }

    public void setMissedSynonyms(List<MissedSynonymDto> missedSynonyms) {
        this.missedSynonyms = missedSynonyms;
    }

    public int getTotalSubmitted() {
        return totalSubmitted;
    }

    public void setTotalSubmitted(int totalSubmitted) {
        this.totalSubmitted = totalSubmitted;
    }

    public int getValidCount() {
        return validCount;
    }

    public void setValidCount(int validCount) {
        this.validCount = validCount;
    }

    public int getInvalidCount() {
        return invalidCount;
    }

    public void setInvalidCount(int invalidCount) {
        this.invalidCount = invalidCount;
    }

    public int getNewDiscoveredCount() {
        return newDiscoveredCount;
    }

    public void setNewDiscoveredCount(int newDiscoveredCount) {
        this.newDiscoveredCount = newDiscoveredCount;
    }

    public String getWarningMessage() {
        return warningMessage;
    }

    public void setWarningMessage(String warningMessage) {
        this.warningMessage = warningMessage;
    }
}
