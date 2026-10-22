package com.languagelearning.backend.deck.dto;

import java.time.Instant;

public class DeckResponse {
    private Long id;
    private String name;
    private String description;
    private Long folderId;
    private String folderName;
    private long cardCount;
    private Instant createdAt;
    private Instant updatedAt;

    public DeckResponse() {
    }

    public DeckResponse(Long id, String name, String description, Long folderId, String folderName, long cardCount, Instant createdAt, Instant updatedAt) {
        this.id = id;
        this.name = name;
        this.description = description;
        this.folderId = folderId;
        this.folderName = folderName;
        this.cardCount = cardCount;
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

    public long getCardCount() {
        return cardCount;
    }

    public void setCardCount(long cardCount) {
        this.cardCount = cardCount;
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
