package com.languagelearning.backend.common.exception;

public class AccountLockedException extends AppException {
    public AccountLockedException() {
        super("ACCOUNT_LOCKED", "Tài khoản của bạn đã bị khóa hoặc không hoạt động");
    }

    public AccountLockedException(String message) {
        super("ACCOUNT_LOCKED", message);
    }
}
