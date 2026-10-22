package com.languagelearning.backend.common.exception;

public class DuplicateUsernameException extends DuplicateResourceException {
    public DuplicateUsernameException(String username) {
        super("DUPLICATE_USERNAME", "Tên đăng nhập '" + username + "' đã được sử dụng");
    }
}
