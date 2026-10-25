package com.languagelearning.backend.analytics.controller;

import com.languagelearning.backend.analytics.dto.*;
import com.languagelearning.backend.analytics.service.AnalyticsService;
import com.languagelearning.backend.common.dto.ApiResponse;
import com.languagelearning.backend.common.security.CurrentUserProvider;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.time.ZoneId;
import java.util.List;

@RestController
@RequestMapping("/api/analytics")
public class AnalyticsController {

    private final AnalyticsService analyticsService;
    private final CurrentUserProvider currentUserProvider;

    public AnalyticsController(AnalyticsService analyticsService, CurrentUserProvider currentUserProvider) {
        this.analyticsService = analyticsService;
        this.currentUserProvider = currentUserProvider;
    }

    private ZoneId resolveZone(String timezone) {
        if (timezone != null && !timezone.isBlank()) {
            try {
                return ZoneId.of(timezone);
            } catch (Exception ignored) {}
        }
        return ZoneId.of("Asia/Ho_Chi_Minh");
    }

    @GetMapping("/overview")
    public ResponseEntity<ApiResponse<AnalyticsOverviewResponse>> getOverview(
            @RequestParam(required = false) String timezone) {
        Long userId = currentUserProvider.getCurrentUserId();
        ZoneId zone = resolveZone(timezone);
        AnalyticsOverviewResponse response = analyticsService.getOverview(userId, zone);
        return ResponseEntity.ok(ApiResponse.success("Lấy thông tin tổng quan thành công", response));
    }

    @GetMapping("/heatmap")
    public ResponseEntity<ApiResponse<HeatmapResponse>> getHeatmap(
            @RequestParam(required = false) Integer year,
            @RequestParam(required = false) String timezone) {
        Long userId = currentUserProvider.getCurrentUserId();
        ZoneId zone = resolveZone(timezone);
        int targetYear = year != null ? year : LocalDate.now(zone).getYear();
        HeatmapResponse response = analyticsService.getHeatmap(userId, targetYear, zone);
        return ResponseEntity.ok(ApiResponse.success("Lấy biểu đồ nhiệt thành công", response));
    }

    @GetMapping("/retention")
    public ResponseEntity<ApiResponse<RetentionDistributionResponse>> getRetention() {
        Long userId = currentUserProvider.getCurrentUserId();
        RetentionDistributionResponse response = analyticsService.getRetentionDistribution(userId);
        return ResponseEntity.ok(ApiResponse.success("Lấy phân bổ ghi nhớ thành công", response));
    }

    @GetMapping("/weak-words")
    public ResponseEntity<ApiResponse<List<WeakWordDto>>> getWeakWords(
            @RequestParam(required = false, defaultValue = "10") int limit) {
        Long userId = currentUserProvider.getCurrentUserId();
        List<WeakWordDto> response = analyticsService.getWeakWords(userId, limit);
        return ResponseEntity.ok(ApiResponse.success("Lấy danh sách từ yếu thành công", response));
    }
}
