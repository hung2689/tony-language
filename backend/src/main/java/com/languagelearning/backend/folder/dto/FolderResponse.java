package com.languagelearning.backend.folder.dto;

import java.time.Instant;

public class FolderResponse {
    private Long id;
    private String name;
    private long deckCount;
    private Instant createdAt;
    private Instant updatedAt;

    public FolderResponse() {
    }

    public FolderResponse(Long id, String name, long deckCount, Instant createdAt, Instant updatedAt) {
        this.id = id;
        this.name = name;
        this.deckCount = deckCount;
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

    public long getDeckCount() {
        return deckCount;
    }

    public void setDeckCount(long deckCount) {
        this.deckCount = deckCount;
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
