package com.languagelearning.backend.common.exception;

public class DuplicateResourceException extends AppException {
    public DuplicateResourceException(String message) {
        super("DUPLICATE_RESOURCE", message);
    }

    public DuplicateResourceException(String errorCode, String message) {
        super(errorCode, message);
    }
}
