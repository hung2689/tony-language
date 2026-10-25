package com.languagelearning.backend.study.story;

import com.languagelearning.backend.common.dto.ApiResponse;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/decks/{deckId}/context-story")
public class ContextStoryController {

    private final ContextStoryService contextStoryService;

    public ContextStoryController(ContextStoryService contextStoryService) {
        this.contextStoryService = contextStoryService;
    }

    @PostMapping
    public ResponseEntity<ApiResponse<ContextStoryDto>> generateStory(@PathVariable Long deckId) {
        ContextStoryDto story = contextStoryService.generateStory(deckId);
        return ResponseEntity.ok(ApiResponse.success("Tạo đoạn văn ngữ cảnh thành công", story));
    }

    @GetMapping
    public ResponseEntity<ApiResponse<ContextStoryDto>> getStory(@PathVariable Long deckId) {
        ContextStoryDto story = contextStoryService.generateStory(deckId);
        return ResponseEntity.ok(ApiResponse.success(story));
    }
}
