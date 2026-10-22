package com.languagelearning.backend.deck.dto;

import com.languagelearning.backend.term.dto.TermCardDto;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;

public class DeckDetailResponse {
    private Long id;
    private String name;
    private String description;
    private Long folderId;
    private String folderName;
    private List<TermCardDto> cards = new ArrayList<>();
    private Instant createdAt;
    private Instant updatedAt;

    public DeckDetailResponse() {
    }

    public DeckDetailResponse(Long id, String name, String description, Long folderId, String folderName, List<TermCardDto> cards, Instant createdAt, Instant updatedAt) {
        this.id = id;
        this.name = name;
        this.description = description;
        this.folderId = folderId;
        this.folderName = folderName;
        this.cards = cards != null ? cards : new ArrayList<>();
        this.createdAt = createdAt;
        this.updatedAt = updatedAt;
    }

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
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

    public String getFolderName() {
        return folderName;
    }

    public void setFolderName(String folderName) {
        this.folderName = folderName;
    }

    public List<TermCardDto> getCards() {
        return cards;
    }

    public void setCards(List<TermCardDto> cards) {
        this.cards = cards != null ? cards : new ArrayList<>();
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(Instant createdAt) {
        this.createdAt = createdAt;
    }

    public Instant getUpdatedAt() {
        return updatedAt;
    }

    public void setUpdatedAt(Instant updatedAt) {
        this.updatedAt = updatedAt;
    }
}
