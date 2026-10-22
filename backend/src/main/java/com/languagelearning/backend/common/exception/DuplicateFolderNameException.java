package com.languagelearning.backend.common.exception;

public class DuplicateFolderNameException extends DuplicateResourceException {
    public DuplicateFolderNameException(String folderName) {
        super("DUPLICATE_FOLDER_NAME", "Thư mục '" + folderName + "' đã tồn tại");
    }
}
