package com.languagelearning.backend.folder.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public class FolderUpdateRequest {

    @NotBlank(message = "Tên thư mục không được để trống")
    @Size(max = 100, message = "Tên thư mục tối đa 100 ký tự")
    private String name;

    public FolderUpdateRequest() {
    }

    public FolderUpdateRequest(String name) {
        this.name = name;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }
}
