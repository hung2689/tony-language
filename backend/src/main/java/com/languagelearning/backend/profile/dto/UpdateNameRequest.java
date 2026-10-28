package com.languagelearning.backend.profile.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public class UpdateNameRequest {

    @NotBlank(message = "Họ và tên không được để trống")
    @Size(min = 1, max = 50, message = "Họ và tên phải từ 1 đến 50 ký tự")
    private String displayName;

    public UpdateNameRequest() {}

    public UpdateNameRequest(String displayName) {
        this.displayName = displayName;
    }

    public String getDisplayName() {
        return displayName;
    }

    public void setDisplayName(String displayName) {
        this.displayName = displayName;
    }
}
