package com.languagelearning.backend.common.exception;

public class ResourceNotFoundException extends AppException {
    public ResourceNotFoundException(String message) {
        super("RESOURCE_NOT_FOUND", message);
    }

    public ResourceNotFoundException(String errorCode, String message) {
        super(errorCode, message);
    }
}
