package com.languagelearning.backend.common.exception;

public class CsrfMissingHeaderException extends AppException {
    public CsrfMissingHeaderException(String message) {
        super("CSRF_HEADER_MISSING", message);
    }
}
