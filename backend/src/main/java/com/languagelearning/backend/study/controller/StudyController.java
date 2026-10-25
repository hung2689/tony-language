package com.languagelearning.backend.study.controller;

import com.languagelearning.backend.common.dto.ApiResponse;
import com.languagelearning.backend.common.security.CurrentUserProvider;
import com.languagelearning.backend.study.dto.*;
import com.languagelearning.backend.study.service.StudyService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/study")
public class StudyController {

    private final StudyService studyService;
    private final CurrentUserProvider currentUserProvider;

    public StudyController(StudyService studyService, CurrentUserProvider currentUserProvider) {
        this.studyService = studyService;
        this.currentUserProvider = currentUserProvider;
    }

    @PostMapping("/sessions")
    public ResponseEntity<ApiResponse<StudySessionResponse>> createSession(@Valid @RequestBody CreateSessionRequest request) {
        Long userId = currentUserProvider.getCurrentUserId();
        StudySessionResponse response = studyService.createSession(userId, request);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success("Bắt đầu phiên học thành công", response));
    }

    @PostMapping("/sessions/{id}/answers")
    public ResponseEntity<ApiResponse<StudySessionResponse>> recordAnswers(
            @PathVariable Long id,
            @Valid @RequestBody AnswerBatchRequest request) {
        Long userId = currentUserProvider.getCurrentUserId();
        StudySessionResponse response = studyService.recordAnswers(userId, id, request);
        return ResponseEntity.ok(ApiResponse.success("Ghi nhận câu trả lời thành công", response));
    }

    @PostMapping("/sessions/{id}/finish")
    public ResponseEntity<ApiResponse<StudySessionResponse>> finishSession(
            @PathVariable Long id,
            @RequestBody(required = false) FinishSessionRequest request) {
        Long userId = currentUserProvider.getCurrentUserId();
        StudySessionResponse response = studyService.finishSession(userId, id, request);
        return ResponseEntity.ok(ApiResponse.success("Hoàn thành phiên học", response));
    }
}
