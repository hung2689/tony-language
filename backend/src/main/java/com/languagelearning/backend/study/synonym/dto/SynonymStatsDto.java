package com.languagelearning.backend.study.synonym.dto;

public class SynonymStatsDto {
    private int totalChallenges;
    private int totalSubmitted;
    private int totalValid;
    private int totalInvalid;
    private double accuracyRate;

    public SynonymStatsDto() {
    }

    public SynonymStatsDto(int totalChallenges, int totalSubmitted, int totalValid, int totalInvalid, double accuracyRate) {
        this.totalChallenges = totalChallenges;
        this.totalSubmitted = totalSubmitted;
        this.totalValid = totalValid;
        this.totalInvalid = totalInvalid;
        this.accuracyRate = accuracyRate;
    }

    public int getTotalChallenges() {
        return totalChallenges;
    }

    public void setTotalChallenges(int totalChallenges) {
        this.totalChallenges = totalChallenges;
    }

    public int getTotalSubmitted() {
        return totalSubmitted;
    }

    public void setTotalSubmitted(int totalSubmitted) {
        this.totalSubmitted = totalSubmitted;
    }

    public int getTotalValid() {
        return totalValid;
    }

    public void setTotalValid(int totalValid) {
        this.totalValid = totalValid;
    }

    public int getTotalInvalid() {
        return invalidCount();
    }

    private int invalidCount() {
        return totalInvalid;
    }

    public void setTotalInvalid(int totalInvalid) {
        this.totalInvalid = totalInvalid;
    }

    public double getAccuracyRate() {
        return accuracyRate;
    }

    public void setAccuracyRate(double accuracyRate) {
        this.accuracyRate = accuracyRate;
    }
}
