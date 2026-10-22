package com.languagelearning.backend.common.exception;

public class InvalidCredentialsException extends AppException {
    public InvalidCredentialsException() {
        super("INVALID_CREDENTIALS", "Email hoặc mật khẩu không đúng");
    }

    public InvalidCredentialsException(String message) {
        super("INVALID_CREDENTIALS", message);
    }
}
