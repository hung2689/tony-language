package com.languagelearning.backend.auth.dto;

import java.util.List;

public class UserSummaryDto {

    private Long id;
    private String email;
    private String username;
    private String displayName;
    private List<String> roles;

    public UserSummaryDto() {
    }

    public UserSummaryDto(Long id, String email, String username, String displayName, List<String> roles) {
        this.id = id;
        this.email = email;
        this.username = username;
        this.displayName = displayName;
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

    public List<String> getRoles() {
        return roles;
    }

    public void setRoles(List<String> roles) {
        this.roles = roles;
    }
}
