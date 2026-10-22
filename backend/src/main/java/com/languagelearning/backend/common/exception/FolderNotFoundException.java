package com.languagelearning.backend.common.exception;

public class FolderNotFoundException extends ResourceNotFoundException {
    public FolderNotFoundException(Long folderId) {
        super("FOLDER_NOT_FOUND", "Không tìm thấy thư mục với id: " + folderId);
    }
}
