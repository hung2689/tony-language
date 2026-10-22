package com.languagelearning.backend.folder.controller;

import com.languagelearning.backend.common.dto.ApiResponse;
import com.languagelearning.backend.folder.dto.FolderCreateRequest;
import com.languagelearning.backend.folder.dto.FolderResponse;
import com.languagelearning.backend.folder.dto.FolderUpdateRequest;
import com.languagelearning.backend.folder.service.FolderService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/folders")
public class FolderController {

    private final FolderService folderService;

    public FolderController(FolderService folderService) {
        this.folderService = folderService;
    }

    @PostMapping
    public ResponseEntity<ApiResponse<FolderResponse>> createFolder(@Valid @RequestBody FolderCreateRequest request) {
        FolderResponse response = folderService.createFolder(request);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success("Tạo thư mục thành công", response));
    }

    @GetMapping
    public ResponseEntity<ApiResponse<List<FolderResponse>>> getFolders() {
        List<FolderResponse> response = folderService.getFolders();
        return ResponseEntity.ok(ApiResponse.success(response));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<FolderResponse>> getFolder(@PathVariable Long id) {
        FolderResponse response = folderService.getFolder(id);
        return ResponseEntity.ok(ApiResponse.success(response));
    }

    @PutMapping("/{id}")
    public ResponseEntity<ApiResponse<FolderResponse>> renameFolder(
            @PathVariable Long id,
            @Valid @RequestBody FolderUpdateRequest request) {
        FolderResponse response = folderService.renameFolder(id, request);
        return ResponseEntity.ok(ApiResponse.success("Đổi tên thư mục thành công", response));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<ApiResponse<Void>> deleteFolder(
            @PathVariable Long id,
            @RequestParam(defaultValue = "setNull") String mode) {
        folderService.deleteFolder(id, mode);
        return ResponseEntity.ok(ApiResponse.success("Xóa thư mục thành công", null));
    }
}
