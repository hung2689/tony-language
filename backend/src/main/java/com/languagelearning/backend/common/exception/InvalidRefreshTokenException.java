package com.languagelearning.backend.common.exception;

public class InvalidRefreshTokenException extends AppException {
    public InvalidRefreshTokenException(String message) {
        super("INVALID_REFRESH_TOKEN", message);
    }
}
