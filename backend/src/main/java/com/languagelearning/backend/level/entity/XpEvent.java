package com.languagelearning.backend.level.entity;

import jakarta.persistence.*;
import java.time.Instant;

@Entity
@Table(name = "xp_events", uniqueConstraints = {
        @UniqueConstraint(name = "uq_xp_events_user_source", columnNames = {"user_id", "source_type", "source_key"})
})
public class XpEvent {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "user_id", nullable = false)
    private Long userId;

    @Column(name = "source_type", length = 50, nullable = false)
    private String sourceType;

    @Column(name = "source_key", length = 100, nullable = false)
    private String sourceKey;

    @Column(name = "xp", nullable = false)
    private Integer xp;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    public XpEvent() {}

    public XpEvent(Long userId, String sourceType, String sourceKey, Integer xp) {
        this.userId = userId;
        this.sourceType = sourceType;
        this.sourceKey = sourceKey;
        this.xp = xp;
        this.createdAt = Instant.now();
    }

    @PrePersist
    public void prePersist() {
        if (this.createdAt == null) {
            this.createdAt = Instant.now();
        }
    }

    public Long getId() {
        return id;
    }

    public Long getUserId() {
        return userId;
    }

    public void setUserId(Long userId) {
        this.userId = userId;
    }

    public String getSourceType() {
        return sourceType;
    }

    public void setSourceType(String sourceType) {
        this.sourceType = sourceType;
    }

    public String getSourceKey() {
        return sourceKey;
    }

    public void setSourceKey(String sourceKey) {
        this.sourceKey = sourceKey;
    }

    public Integer getXp() {
        return xp;
    }

    public void setXp(Integer xp) {
        this.xp = xp;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }
}
