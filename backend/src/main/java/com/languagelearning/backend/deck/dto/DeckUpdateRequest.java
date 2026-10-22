package com.languagelearning.backend.deck.dto;

import com.languagelearning.backend.term.dto.TermCardDto;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.Size;

import java.util.ArrayList;
import java.util.List;

public class DeckUpdateRequest {

    @NotBlank(message = "Tên bộ từ vựng không được để trống")
    @Size(max = 150, message = "Tên bộ từ vựng tối đa 150 ký tự")
    private String name;

    private String description;

    private Long folderId;

    @NotEmpty(message = "Bộ từ vựng cần có ít nhất 1 thẻ từ")
    @Size(max = 1000, message = "Một bộ từ vựng không được vượt quá 1000 thẻ")
    @Valid
    private List<TermCardDto> cards = new ArrayList<>();

    public DeckUpdateRequest() {
    }

    public DeckUpdateRequest(String name, String description, Long folderId, List<TermCardDto> cards) {
        this.name = name;
        this.description = description;
        this.folderId = folderId;
        this.cards = cards != null ? cards : new ArrayList<>();
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public String getDescription() {
        return description;
    }

    public void setDescription(String description) {
        this.description = description;
    }

    public Long getFolderId() {
        return folderId;
    }

    public void setFolderId(Long folderId) {
        this.folderId = folderId;
    }

    public List<TermCardDto> getCards() {
        return cards;
    }

    public void setCards(List<TermCardDto> cards) {
        this.cards = cards != null ? cards : new ArrayList<>();
    }
}
