package com.languagelearning.backend.common.exception;

public class TooManyRequestsException extends AppException {
    public TooManyRequestsException(String message) {
        super("TOO_MANY_REQUESTS", message);
    }
}
