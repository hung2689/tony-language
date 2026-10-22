package com.languagelearning.backend.common.exception;

public class DuplicateEmailException extends DuplicateResourceException {
    public DuplicateEmailException(String email) {
        super("DUPLICATE_EMAIL", "Email '" + email + "' đã được sử dụng");
    }
}
