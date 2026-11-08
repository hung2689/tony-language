package com.languagelearning.backend.study.controller;

import com.languagelearning.backend.common.dto.ApiResponse;
import com.languagelearning.backend.common.security.CurrentUserProvider;
import com.languagelearning.backend.study.dto.AddDecksToPlanRequest;
import com.languagelearning.backend.study.dto.CreateStudyPlanRequest;
import com.languagelearning.backend.study.dto.PreviewAddDecksRequest;
import com.languagelearning.backend.study.dto.PreviewAddDecksResponse;
import com.languagelearning.backend.study.dto.RemoveDecksFromPlanRequest;
import com.languagelearning.backend.study.dto.SrsForecastResponse;
import com.languagelearning.backend.study.dto.StudyPlanResponse;
import com.languagelearning.backend.study.dto.TodayStudyQueueResponse;
import com.languagelearning.backend.study.dto.TodaySummaryResponse;
import com.languagelearning.backend.study.dto.UpdateStudyPlanRequest;
import com.languagelearning.backend.study.service.StudyPlanService;
import jakarta.validation.Valid;
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
        if (response == null) {
            return ResponseEntity.ok(ApiResponse.success("Chưa có lộ trình ôn tập nào", null));
        }
        return ResponseEntity.ok(ApiResponse.success(response));
    }

    @PostMapping
    public ResponseEntity<ApiResponse<StudyPlanResponse>> createPlan(
            @Valid @RequestBody CreateStudyPlanRequest request) {
        Long userId = currentUserProvider.getCurrentUserId();
        StudyPlanResponse response = studyPlanService.createPlan(userId, request);
        return ResponseEntity.ok(ApiResponse.success("Tạo lộ trình ôn tập thành công", response));
    }

    @PostMapping("/preview")
    public ResponseEntity<ApiResponse<PreviewAddDecksResponse>> previewAddDecks(
            @Valid @RequestBody PreviewAddDecksRequest request) {
        Long userId = currentUserProvider.getCurrentUserId();
        PreviewAddDecksResponse response = studyPlanService.previewAddDecks(userId, request);
        return ResponseEntity.ok(ApiResponse.success(response));
    }

    @PostMapping("/current/decks")
    public ResponseEntity<ApiResponse<StudyPlanResponse>> addDecksToActivePlan(
            @Valid @RequestBody AddDecksToPlanRequest request) {
        Long userId = currentUserProvider.getCurrentUserId();
        StudyPlanResponse response = studyPlanService.addDecksToActivePlan(userId, request);
        return ResponseEntity.ok(ApiResponse.success("Thêm bộ từ vào lộ trình thành công", response));
    }

    @PostMapping("/current/decks/remove")
    public ResponseEntity<ApiResponse<StudyPlanResponse>> removeDecksFromPlan(
            @Valid @RequestBody RemoveDecksFromPlanRequest request) {
        Long userId = currentUserProvider.getCurrentUserId();
        StudyPlanResponse response = studyPlanService.removeDecksFromPlan(userId, request.deckIds());
        return ResponseEntity.ok(ApiResponse.success("Xóa bộ từ khỏi lộ trình thành công", response));
    }

    @Deprecated(forRemoval = true)
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

    @GetMapping("/current/today/summary")
    public ResponseEntity<ApiResponse<TodaySummaryResponse>> getTodaySummary() {
        Long userId = currentUserProvider.getCurrentUserId();
        TodaySummaryResponse response = studyPlanService.getTodaySummary(userId);
        return ResponseEntity.ok(ApiResponse.success("Lấy tóm tắt từ cần học hôm nay thành công", response));
    }

    @GetMapping("/current/forecast")
    public ResponseEntity<ApiResponse<SrsForecastResponse>> getActivePlanForecast() {
        Long userId = currentUserProvider.getCurrentUserId();
        SrsForecastResponse response = studyPlanService.getActivePlanForecast(userId);
        return ResponseEntity.ok(ApiResponse.success("Lấy dự báo ôn tập thành công", response));
    }
}
