package com.languagelearning.backend.study.sentence.gemini;

import com.languagelearning.backend.common.dto.ApiResponse;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/ai")
public class AiKeyController {

    private final GeminiSentenceService geminiSentenceService;

    public AiKeyController(GeminiSentenceService geminiSentenceService) {
        this.geminiSentenceService = geminiSentenceService;
    }

    /**
     * Endpoint to validate a user's personal Gemini API key.
     */
    @PostMapping("/test-key")
    public ResponseEntity<ApiResponse<Map<String, Object>>> testApiKey(
            @RequestBody(required = false) Map<String, String> body,
            @RequestHeader(value = "X-Gemini-Api-Key", required = false) String headerApiKey
    ) {
        String keyToTest = (body != null && body.containsKey("apiKey")) ? body.get("apiKey") : headerApiKey;

        if (keyToTest == null || keyToTest.trim().isEmpty()) {
            return ResponseEntity.badRequest().body(ApiResponse.error("Vui lòng cung cấp Gemini API Key để kiểm tra"));
        }

        GeminiSentenceService.TestKeyResult result = geminiSentenceService.testApiKeyDetails(keyToTest.trim());

        if (result.valid()) {
            return ResponseEntity.ok(ApiResponse.success(
                    result.message(),
                    Map.of("valid", true, "model", geminiSentenceService.getModel())
            ));
        } else {
            return ResponseEntity.badRequest().body(ApiResponse.error(result.message()));
        }
    }
}
