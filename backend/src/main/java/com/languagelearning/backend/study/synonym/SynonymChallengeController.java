package com.languagelearning.backend.study.synonym;

import com.languagelearning.backend.common.dto.ApiResponse;
import com.languagelearning.backend.common.security.CurrentUserProvider;
import com.languagelearning.backend.study.synonym.dto.*;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/decks/{deckId}/synonym-challenges")
public class SynonymChallengeController {

    private final SynonymChallengeService synonymChallengeService;
    private final CurrentUserProvider currentUserProvider;

    public SynonymChallengeController(
            SynonymChallengeService synonymChallengeService,
            CurrentUserProvider currentUserProvider
    ) {
        this.synonymChallengeService = synonymChallengeService;
        this.currentUserProvider = currentUserProvider;
    }

    @GetMapping
    public ResponseEntity<ApiResponse<List<SynonymChallengeItemDto>>> getChallenges(
            @PathVariable Long deckId,
            @RequestParam(defaultValue = "20") int limit
    ) {
        Long userId = currentUserProvider.getCurrentUserId();
        List<SynonymChallengeItemDto> challenges = synonymChallengeService.getDeckSynonymQueue(userId, deckId, limit);
        return ResponseEntity.ok(ApiResponse.success("Lấy danh sách thử thách từ đồng nghĩa thành công", challenges));
    }

    @PostMapping("/evaluate")
    public ResponseEntity<ApiResponse<SynonymEvaluateResponse>> evaluateChallenge(
            @PathVariable Long deckId,
            @Valid @RequestBody SynonymEvaluateRequest request,
            @RequestHeader(value = "X-Gemini-Api-Key", required = false) String customApiKey
    ) {
        Long userId = currentUserProvider.getCurrentUserId();
        if (request.getDeckId() == null) {
            request.setDeckId(deckId);
        }
        SynonymEvaluateResponse response = synonymChallengeService.evaluateChallenge(userId, request, customApiKey);
        return ResponseEntity.ok(ApiResponse.success("Đánh giá từ đồng nghĩa thành công", response));
    }

    @PostMapping("/quick-add")
    public ResponseEntity<ApiResponse<Map<String, Object>>> quickAddCard(
            @PathVariable Long deckId,
            @Valid @RequestBody QuickAddCardRequest request
    ) {
        Long userId = currentUserProvider.getCurrentUserId();
        if (request.getDeckId() == null) {
            request.setDeckId(deckId);
        }
        Map<String, Object> result = synonymChallengeService.quickAddCardToDeck(userId, request);
        return ResponseEntity.ok(ApiResponse.success("Thao tác thêm thẻ từ hoàn tất", result));
    }

    @GetMapping("/stats")
    public ResponseEntity<ApiResponse<SynonymStatsDto>> getStats(
            @PathVariable Long deckId
    ) {
        Long userId = currentUserProvider.getCurrentUserId();
        SynonymStatsDto stats = synonymChallengeService.getSynonymStats(userId, deckId);
        return ResponseEntity.ok(ApiResponse.success("Lấy thống kê thử thách từ đồng nghĩa thành công", stats));
    }
}
