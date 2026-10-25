package com.languagelearning.backend.study.sentence;

import com.languagelearning.backend.common.dto.ApiResponse;
import com.languagelearning.backend.common.security.CurrentUserProvider;
import com.languagelearning.backend.study.sentence.dto.SentenceChallengeItemDto;
import com.languagelearning.backend.study.sentence.dto.SentenceEvaluationRequest;
import com.languagelearning.backend.study.sentence.dto.SentenceEvaluationResponse;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/decks/{deckId}/sentence-challenges")
public class SentenceChallengeController {

    private final SentenceChallengeService sentenceChallengeService;
    private final CurrentUserProvider currentUserProvider;

    public SentenceChallengeController(
            SentenceChallengeService sentenceChallengeService,
            CurrentUserProvider currentUserProvider
    ) {
        this.sentenceChallengeService = sentenceChallengeService;
        this.currentUserProvider = currentUserProvider;
    }

    @GetMapping
    public ResponseEntity<ApiResponse<List<SentenceChallengeItemDto>>> getChallenges(
            @PathVariable Long deckId,
            @RequestParam(defaultValue = "5") int limit
    ) {
        Long userId = currentUserProvider.getCurrentUserId();
        List<SentenceChallengeItemDto> challenges = sentenceChallengeService.generateChallenges(userId, deckId, limit);
        return ResponseEntity.ok(ApiResponse.success("Lấy danh sách thử thách đặt câu thành công", challenges));
    }

    @PostMapping("/generate")
    public ResponseEntity<ApiResponse<List<SentenceChallengeItemDto>>> generateChallenges(
            @PathVariable Long deckId,
            @RequestParam(defaultValue = "5") int limit
    ) {
        Long userId = currentUserProvider.getCurrentUserId();
        List<SentenceChallengeItemDto> challenges = sentenceChallengeService.generateChallenges(userId, deckId, limit);
        return ResponseEntity.ok(ApiResponse.success("Khởi tạo thử thách đặt câu AI thành công", challenges));
    }

    @PostMapping("/evaluate")
    public ResponseEntity<ApiResponse<SentenceEvaluationResponse>> evaluateSentence(
            @PathVariable Long deckId,
            @Valid @RequestBody SentenceEvaluationRequest request
    ) {
        SentenceEvaluationResponse response = sentenceChallengeService.evaluateSentence(request);
        return ResponseEntity.ok(ApiResponse.success("AI chấm điểm câu dịch thành công", response));
    }
}
