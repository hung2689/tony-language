package com.languagelearning.backend.wallpaper.dto;

import java.time.Instant;

public class WallpaperResponse {
    private Long id;
    private String name;
    private String imageUrl;
    private String thumbnailUrl;
    private boolean isActive;
    private Instant createdAt;

    public WallpaperResponse() {
    }

    public WallpaperResponse(Long id, String name, String imageUrl, String thumbnailUrl, boolean isActive, Instant createdAt) {
        this.id = id;
        this.name = name;
        this.imageUrl = imageUrl;
        this.thumbnailUrl = thumbnailUrl;
        this.isActive = isActive;
        this.createdAt = createdAt;
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

    public String getImageUrl() {
        return imageUrl;
    }

    public void setImageUrl(String imageUrl) {
        this.imageUrl = imageUrl;
    }

    public String getThumbnailUrl() {
        return thumbnailUrl;
    }

    public void setThumbnailUrl(String thumbnailUrl) {
        this.thumbnailUrl = thumbnailUrl;
    }

    public boolean isActive() {
        return isActive;
    }

    public void setActive(boolean active) {
        isActive = active;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(Instant createdAt) {
        this.createdAt = createdAt;
    }
}
