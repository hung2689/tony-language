package com.languagelearning.backend.deck.controller;

import com.languagelearning.backend.common.dto.ApiResponse;
import com.languagelearning.backend.deck.dto.DeckCreateRequest;
import com.languagelearning.backend.deck.dto.DeckDetailResponse;
import com.languagelearning.backend.deck.dto.DeckResponse;
import com.languagelearning.backend.deck.dto.DeckUpdateRequest;
import com.languagelearning.backend.deck.service.DeckService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/decks")
public class DeckController {

    private final DeckService deckService;

    public DeckController(DeckService deckService) {
        this.deckService = deckService;
    }

    @PostMapping
    public ResponseEntity<ApiResponse<DeckDetailResponse>> createDeck(@Valid @RequestBody DeckCreateRequest request) {
        DeckDetailResponse response = deckService.createDeck(request);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success("Tạo bộ từ vựng thành công", response));
    }

    @GetMapping
    public ResponseEntity<ApiResponse<List<DeckResponse>>> listDecks(
            @RequestParam(required = false) Long folderId,
            @RequestParam(required = false) Boolean uncategorized,
            @RequestParam(required = false) String search) {
        List<DeckResponse> response = deckService.listDecks(folderId, uncategorized, search);
        return ResponseEntity.ok(ApiResponse.success(response));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<DeckDetailResponse>> getDeck(@PathVariable Long id) {
        DeckDetailResponse response = deckService.getDeck(id);
        return ResponseEntity.ok(ApiResponse.success(response));
    }

    @PutMapping("/{id}")
    public ResponseEntity<ApiResponse<DeckDetailResponse>> updateDeck(
            @PathVariable Long id,
            @Valid @RequestBody DeckUpdateRequest request) {
        DeckDetailResponse response = deckService.updateDeck(id, request);
        return ResponseEntity.ok(ApiResponse.success("Cập nhật bộ từ vựng thành công", response));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<ApiResponse<Void>> deleteDeck(@PathVariable Long id) {
        deckService.deleteDeck(id);
        return ResponseEntity.ok(ApiResponse.success("Xóa bộ từ vựng thành công", null));
    }

    @PatchMapping("/{id}/folder")
    public ResponseEntity<ApiResponse<Void>> moveDeck(
            @PathVariable Long id,
            @RequestBody Map<String, Long> payload) {
        Long targetFolderId = payload.get("folderId");
        deckService.moveDeck(id, targetFolderId);
        return ResponseEntity.ok(ApiResponse.success("Chuyển thư mục thành công", null));
    }
}
