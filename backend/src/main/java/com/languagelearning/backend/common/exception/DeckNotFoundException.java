package com.languagelearning.backend.common.exception;

public class DeckNotFoundException extends ResourceNotFoundException {
    public DeckNotFoundException(Long deckId) {
        super("DECK_NOT_FOUND", "Không tìm thấy bộ từ vựng với id: " + deckId);
    }
}
