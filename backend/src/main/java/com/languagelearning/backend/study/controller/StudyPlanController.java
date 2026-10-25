package com.languagelearning.backend.study.controller;

import com.languagelearning.backend.common.dto.ApiResponse;
import com.languagelearning.backend.common.security.CurrentUserProvider;
import com.languagelearning.backend.study.dto.*;
import com.languagelearning.backend.study.service.StudyPlanService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/study-plans")
public class StudyPlanController {

    private final StudyPlanService studyPlanService;
    private final CurrentUserProvider currentUserProvider;

    public StudyPlanController(StudyPlanService studyPlanService, CurrentUserProvider currentUserProvider) {
        this.studyPlanService = studyPlanService;
        this.currentUserProvider = currentUserProvider;
    }

    @GetMapping("/current")
    public ResponseEntity<ApiResponse<StudyPlanResponse>> getCurrentPlan() {
        Long userId = currentUserProvider.getCurrentUserId();
        StudyPlanResponse response = studyPlanService.getCurrentPlan(userId);
        return ResponseEntity.ok(ApiResponse.success(
                response != null ? "Lấy thông tin lộ trình thành công" : "Chưa có lộ trình ôn tập nào",
                response
        ));
    }

    @PostMapping
    public ResponseEntity<ApiResponse<StudyPlanResponse>> createPlan(@Valid @RequestBody CreateStudyPlanRequest request) {
        Long userId = currentUserProvider.getCurrentUserId();
        StudyPlanResponse response = studyPlanService.createPlan(userId, request);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success("Tạo lộ trình ôn tập thành công", response));
    }

    @PostMapping("/preview")
    public ResponseEntity<ApiResponse<PreviewAddDecksResponse>> previewAddDecks(
            @Valid @RequestBody PreviewAddDecksRequest request) {
        Long userId = currentUserProvider.getCurrentUserId();
        PreviewAddDecksResponse response = studyPlanService.previewAddDecks(userId, request);
        return ResponseEntity.ok(ApiResponse.success("Tính toán khối lượng thành công", response));
    }

    @PostMapping("/current/decks")
    public ResponseEntity<ApiResponse<StudyPlanResponse>> addDecksToActivePlan(
            @Valid @RequestBody AddDecksToPlanRequest request) {
        Long userId = currentUserProvider.getCurrentUserId();
        StudyPlanResponse response = studyPlanService.addDecksToActivePlan(userId, request);
        return ResponseEntity.ok(ApiResponse.success("Thêm bộ từ vào lộ trình thành công", response));
    }

    @DeleteMapping("/current/decks/{deckId}")
    public ResponseEntity<ApiResponse<StudyPlanResponse>> removeDeckFromPlan(@PathVariable Long deckId) {
        Long userId = currentUserProvider.getCurrentUserId();
        StudyPlanResponse response = studyPlanService.removeDeckFromPlan(userId, deckId);
        return ResponseEntity.ok(ApiResponse.success("Xóa bộ từ khỏi lộ trình thành công", response));
    }

    @PatchMapping("/current")
    public ResponseEntity<ApiResponse<StudyPlanResponse>> updatePlan(@Valid @RequestBody UpdateStudyPlanRequest request) {
        Long userId = currentUserProvider.getCurrentUserId();
        StudyPlanResponse response = studyPlanService.updatePlan(userId, request);
        return ResponseEntity.ok(ApiResponse.success("Cập nhật lộ trình thành công", response));
    }

    @DeleteMapping("/current")
    public ResponseEntity<ApiResponse<Void>> deleteActivePlan() {
        Long userId = currentUserProvider.getCurrentUserId();
        studyPlanService.deleteActivePlan(userId);
        return ResponseEntity.ok(ApiResponse.success("Đã xóa lộ trình ôn tập", null));
    }

    @GetMapping("/current/today")
    public ResponseEntity<ApiResponse<TodayStudyQueueResponse>> getTodayQueue() {
        Long userId = currentUserProvider.getCurrentUserId();
        TodayStudyQueueResponse response = studyPlanService.getTodayQueue(userId);
        return ResponseEntity.ok(ApiResponse.success("Lấy danh sách từ cần học hôm nay thành công", response));
    }

    @GetMapping("/current/forecast")
    public ResponseEntity<ApiResponse<SrsForecastResponse>> getActivePlanForecast() {
        Long userId = currentUserProvider.getCurrentUserId();
        SrsForecastResponse response = studyPlanService.getActivePlanForecast(userId);
        return ResponseEntity.ok(ApiResponse.success("Lấy dự báo ôn tập thành công", response));
    }
}
