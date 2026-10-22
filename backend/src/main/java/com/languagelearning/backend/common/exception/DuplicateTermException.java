package com.languagelearning.backend.common.exception;

public class DuplicateTermException extends DuplicateResourceException {
    public DuplicateTermException(String term) {
        super("DUPLICATE_TERM", "Từ vựng '" + term + "' đã tồn tại trong bộ từ này");
    }
}
