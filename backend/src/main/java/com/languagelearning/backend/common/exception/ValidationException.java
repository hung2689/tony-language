package com.languagelearning.backend.common.exception;

import java.util.Map;

public class ValidationException extends AppException {
    private final Map<String, Object> details;

    public ValidationException(String message) {
        super("VALIDATION_ERROR", message);
        this.details = null;
    }

    public ValidationException(String errorCode, String message) {
        super(errorCode, message);
        this.details = null;
    }

    public ValidationException(String message, Map<String, Object> details) {
        super("VALIDATION_ERROR", message);
        this.details = details;
    }

    public Map<String, Object> getDetails() {
        return details;
    }
}
