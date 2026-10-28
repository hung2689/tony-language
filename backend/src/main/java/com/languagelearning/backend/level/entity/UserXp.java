package com.languagelearning.backend.level.entity;

import jakarta.persistence.*;
import java.time.Instant;

@Entity
@Table(name = "user_xp")
public class UserXp {

    @Id
    @Column(name = "user_id")
    private Long userId;

    @Column(name = "total_xp", nullable = false)
    private Long totalXp = 0L;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    public UserXp() {}

    public UserXp(Long userId, Long totalXp) {
        this.userId = userId;
        this.totalXp = totalXp != null ? totalXp : 0L;
        this.updatedAt = Instant.now();
    }

    @PrePersist
    @PreUpdate
    public void onUpdate() {
        this.updatedAt = Instant.now();
    }

    public Long getUserId() {
        return userId;
    }

    public void setUserId(Long userId) {
        this.userId = userId;
    }

    public Long getTotalXp() {
        return totalXp != null ? totalXp : 0L;
    }

    public void setTotalXp(Long totalXp) {
        this.totalXp = totalXp;
    }

    public Instant getUpdatedAt() {
        return updatedAt;
    }

    public void setUpdatedAt(Instant updatedAt) {
        this.updatedAt = updatedAt;
    }
}
