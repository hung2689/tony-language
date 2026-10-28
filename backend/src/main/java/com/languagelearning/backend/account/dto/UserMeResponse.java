package com.languagelearning.backend.account.dto;

import java.util.List;

public class UserMeResponse {

    private Long id;
    private String email;
    private String username;
    private String displayName;
    private String avatarUrl;
    private Integer level;
    private Integer tierId;
    private String tierName;
    private List<String> roles;

    public UserMeResponse() {
    }

    public UserMeResponse(Long id, String email, String username, String displayName, List<String> roles) {
        this(id, email, username, displayName, null, 1, 1, "Tập sự", roles);
    }

    public UserMeResponse(Long id, String email, String username, String displayName,
                          String avatarUrl, Integer level, Integer tierId, String tierName,
                          List<String> roles) {
        this.id = id;
        this.email = email;
        this.username = username;
        this.displayName = displayName;
        this.avatarUrl = avatarUrl;
        this.level = level;
        this.tierId = tierId;
        this.tierName = tierName;
        this.roles = roles;
    }

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public String getEmail() {
        return email;
    }

    public void setEmail(String email) {
        this.email = email;
    }

    public String getUsername() {
        return username;
    }

    public void setUsername(String username) {
        this.username = username;
    }

    public String getDisplayName() {
        return displayName;
    }

    public void setDisplayName(String displayName) {
        this.displayName = displayName;
    }

    public String getAvatarUrl() {
        return avatarUrl;
    }

    public void setAvatarUrl(String avatarUrl) {
        this.avatarUrl = avatarUrl;
    }

    public Integer getLevel() {
        return level;
    }

    public void setLevel(Integer level) {
        this.level = level;
    }

    public Integer getTierId() {
        return tierId;
    }

    public void setTierId(Integer tierId) {
        this.tierId = tierId;
    }

    public String getTierName() {
        return tierName;
    }

    public void setTierName(String tierName) {
        this.tierName = tierName;
    }

    public List<String> getRoles() {
        return roles;
    }

    public void setRoles(List<String> roles) {
        this.roles = roles;
    }
}
