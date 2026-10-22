package com.languagelearning.backend.common.dto;

import java.time.Instant;
import java.util.Map;

public class ErrorResponse {
    private String errorCode;
    private String message;
    private Map<String, Object> details;
    private Instant timestamp;

    public ErrorResponse() {
        this.timestamp = Instant.now();
    }

    public ErrorResponse(String errorCode, String message) {
        this.errorCode = errorCode;
        this.message = message;
        this.timestamp = Instant.now();
    }

    public ErrorResponse(String errorCode, String message, Map<String, Object> details) {
        this.errorCode = errorCode;
        this.message = message;
        this.details = details;
        this.timestamp = Instant.now();
    }

    public String getErrorCode() {
        return errorCode;
    }

    public void setErrorCode(String errorCode) {
        this.errorCode = errorCode;
    }

    public String getMessage() {
        return message;
    }

    public void setMessage(String message) {
        this.message = message;
    }

    public Map<String, Object> getDetails() {
        return details;
    }

    public void setDetails(Map<String, Object> details) {
        this.details = details;
    }

    public Instant getTimestamp() {
        return timestamp;
    }

    public void setTimestamp(Instant timestamp) {
        this.timestamp = timestamp;
    }
}
