package com.languagelearning.backend.common.exception;

import com.languagelearning.backend.common.dto.ErrorResponse;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.FieldError;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import java.util.HashMap;
import java.util.Map;

@RestControllerAdvice
public class GlobalExceptionHandler {

    private static final Logger log = LoggerFactory.getLogger(GlobalExceptionHandler.class);

    @ExceptionHandler(ResourceNotFoundException.class)
    public ResponseEntity<ErrorResponse> handleResourceNotFound(ResourceNotFoundException ex) {
        log.warn("Resource not found: {}", ex.getMessage());
        return ResponseEntity.status(HttpStatus.NOT_FOUND)
                .body(new ErrorResponse(ex.getErrorCode(), ex.getMessage()));
    }

    @ExceptionHandler(DuplicateResourceException.class)
    public ResponseEntity<ErrorResponse> handleDuplicateResource(DuplicateResourceException ex) {
        log.warn("Duplicate resource: {}", ex.getMessage());
        return ResponseEntity.status(HttpStatus.CONFLICT)
                .body(new ErrorResponse(ex.getErrorCode(), ex.getMessage()));
    }

    @ExceptionHandler(ValidationException.class)
    public ResponseEntity<ErrorResponse> handleValidationException(ValidationException ex) {
        log.warn("Validation error: {}", ex.getMessage());
        return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                .body(new ErrorResponse(ex.getErrorCode(), ex.getMessage(), ex.getDetails()));
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ErrorResponse> handleMethodArgumentNotValid(MethodArgumentNotValidException ex) {
        Map<String, Object> details = new HashMap<>();
        for (FieldError error : ex.getBindingResult().getFieldErrors()) {
            details.put(error.getField(), error.getDefaultMessage());
        }
        log.warn("Method argument validation failed: {}", details);
        return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                .body(new ErrorResponse("VALIDATION_ERROR", "Dữ liệu nhập vào không hợp lệ", details));
    }

    @ExceptionHandler(InvalidCredentialsException.class)
    public ResponseEntity<ErrorResponse> handleInvalidCredentials(InvalidCredentialsException ex) {
        log.warn("Invalid credentials: {}", ex.getMessage());
        return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                .body(new ErrorResponse(ex.getErrorCode(), ex.getMessage()));
    }

    @ExceptionHandler(InvalidRefreshTokenException.class)
    public ResponseEntity<ErrorResponse> handleInvalidRefreshToken(InvalidRefreshTokenException ex) {
        log.warn("Invalid refresh token: {}", ex.getMessage());
        return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                .body(new ErrorResponse(ex.getErrorCode(), ex.getMessage()));
    }

    @ExceptionHandler(AccountLockedException.class)
    public ResponseEntity<ErrorResponse> handleAccountLocked(AccountLockedException ex) {
        log.warn("Account locked: {}", ex.getMessage());
        return ResponseEntity.status(HttpStatus.FORBIDDEN)
                .body(new ErrorResponse(ex.getErrorCode(), ex.getMessage()));
    }

    @ExceptionHandler(CsrfMissingHeaderException.class)
    public ResponseEntity<ErrorResponse> handleCsrfMissingHeader(CsrfMissingHeaderException ex) {
        log.warn("CSRF header missing: {}", ex.getMessage());
        return ResponseEntity.status(HttpStatus.FORBIDDEN)
                .body(new ErrorResponse(ex.getErrorCode(), ex.getMessage()));
    }

    @ExceptionHandler(TooManyRequestsException.class)
    public ResponseEntity<ErrorResponse> handleTooManyRequests(TooManyRequestsException ex) {
        log.warn("Too many requests: {}", ex.getMessage());
        return ResponseEntity.status(HttpStatus.TOO_MANY_REQUESTS)
                .body(new ErrorResponse(ex.getErrorCode(), ex.getMessage()));
    }

    @ExceptionHandler(IllegalArgumentException.class)
    public ResponseEntity<ErrorResponse> handleIllegalArgument(IllegalArgumentException ex) {
        log.warn("Illegal argument: {}", ex.getMessage());
        return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                .body(new ErrorResponse("BAD_REQUEST", ex.getMessage()));
    }

    @ExceptionHandler(org.springframework.web.servlet.resource.NoResourceFoundException.class)
    public ResponseEntity<ErrorResponse> handleNoResourceFound(org.springframework.web.servlet.resource.NoResourceFoundException ex) {
        return ResponseEntity.status(HttpStatus.NOT_FOUND)
                .body(new ErrorResponse("NOT_FOUND", ex.getMessage()));
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<ErrorResponse> handleGenericException(Exception ex) {
        log.error("Unhandled internal server error", ex);
        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(new ErrorResponse("INTERNAL_SERVER_ERROR", "Đã xảy ra lỗi hệ thống, vui lòng thử lại sau"));
    }
}
