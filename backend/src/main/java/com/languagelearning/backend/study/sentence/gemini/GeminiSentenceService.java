package com.languagelearning.backend.study.sentence.gemini;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.languagelearning.backend.study.sentence.dto.SentenceChallengeItemDto;
import com.languagelearning.backend.study.sentence.dto.SentenceEvaluationRequest;
import com.languagelearning.backend.study.sentence.dto.SentenceEvaluationResponse;
import com.languagelearning.backend.term.entity.Vocabulary;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.util.*;

@Service
public class GeminiSentenceService {

    private static final Logger log = LoggerFactory.getLogger(GeminiSentenceService.class);

    private final String apiKey;
    private final String model;
    private final String baseUrl;
    private final ObjectMapper objectMapper;
    private final HttpClient httpClient;

    public GeminiSentenceService(
            @Value("${gemini.api.key:}") String apiKey,
            @Value("${gemini.api.model:gemini-flash-latest}") String model,
            @Value("${gemini.api.url:https://generativelanguage.googleapis.com/v1beta/models}") String baseUrl
    ) {
        this.apiKey = apiKey != null ? apiKey.trim() : "";
        this.model = (model != null && !model.isBlank()) ? model.trim() : "gemini-flash-lite-latest";
        this.baseUrl = (baseUrl != null && !baseUrl.isBlank()) ? baseUrl.trim() : "https://generativelanguage.googleapis.com/v1beta/models";
        this.objectMapper = new ObjectMapper();
        this.httpClient = HttpClient.newBuilder()
                .connectTimeout(Duration.ofSeconds(15))
                .build();
    }

    /**
     * Checks whether server-level Gemini API Key is configured.
     */
    public boolean isConfigured() {
        return !apiKey.isEmpty() && !apiKey.equalsIgnoreCase("none");
    }

    /**
     * Resolves effective API Key: priority is given to customApiKey (BYOK from user request),
     * with fallback to server-configured apiKey.
     */
    public String resolveApiKey(String customApiKey) {
        if (customApiKey != null && !customApiKey.trim().isEmpty() && !customApiKey.equalsIgnoreCase("none")) {
            return customApiKey.trim();
        }
        if (isConfigured()) {
            return this.apiKey;
        }
        return null;
    }

    public boolean isAvailable(String customApiKey) {
        return resolveApiKey(customApiKey) != null;
    }

    public String getModel() {
        return model;
    }

    public record TestKeyResult(boolean valid, int statusCode, String message) {}

    /**
     * Validates a provided user Gemini API key with detailed diagnostic feedback.
     */
    public TestKeyResult testApiKeyDetails(String testKey) {
        if (testKey == null || testKey.isBlank()) {
            return new TestKeyResult(false, 400, "Vui lòng nhập API Key để kiểm tra.");
        }

        List<String> modelsToTry = new ArrayList<>();
        if (!modelsToTry.contains("gemini-3.5-flash")) modelsToTry.add("gemini-3.5-flash");
        if (!modelsToTry.contains("gemini-3.5-flash-lite")) modelsToTry.add("gemini-3.5-flash-lite");
        if (!modelsToTry.contains(this.model)) modelsToTry.add(this.model);
        if (!modelsToTry.contains("gemini-flash-latest")) modelsToTry.add("gemini-flash-latest");
        if (!modelsToTry.contains("gemini-flash-lite-latest")) modelsToTry.add("gemini-flash-lite-latest");

        int lastCode = 0;
        String lastBody = "";

        for (String m : modelsToTry) {
            try {
                String endpoint = String.format("%s/%s:generateContent?key=%s", baseUrl, m, testKey.trim());
                Map<String, Object> textPart = Map.of("text", "Return JSON: {\"status\":\"OK\"}");
                Map<String, Object> content = Map.of("parts", List.of(textPart));
                Map<String, Object> requestPayload = Map.of("contents", List.of(content));
                String requestBody = objectMapper.writeValueAsString(requestPayload);

                HttpRequest request = HttpRequest.newBuilder()
                        .uri(URI.create(endpoint))
                        .header("Content-Type", "application/json; charset=utf-8")
                        .header("x-goog-api-key", testKey.trim())
                        .timeout(Duration.ofSeconds(12))
                        .POST(HttpRequest.BodyPublishers.ofString(requestBody))
                        .build();

                HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
                int code = response.statusCode();
                lastCode = code;
                lastBody = response.body() != null ? response.body() : "";

                if (code == 200) {
                    return new TestKeyResult(true, 200, "Kết nối thành công với Google Gemini (" + m + ")!");
                }

                // If 404, 503, or 429 quota on this model, try next supported model
                if (code == 404 || code == 503 || code == 429) {
                    log.info("Gemini testApiKey with model {} returned {}, trying next candidate...", m, code);
                    continue;
                }

                // If auth error, return immediately
                break;
            } catch (Exception e) {
                log.warn("Gemini testApiKey with model {} exception: {}", m, e.getMessage());
            }
        }

        log.warn("Gemini testApiKey failed with HTTP {}: {}", lastCode, lastBody);

        if (lastCode == 401) {
            if (lastBody.contains("ACCESS_TOKEN_TYPE_UNSUPPORTED")) {
                return new TestKeyResult(false, 401,
                        "Google từ chối Key (401 - ACCESS_TOKEN_TYPE_UNSUPPORTED): Key này chưa được kích hoạt quyền Generative Language API hoặc bị giới hạn trong Google Cloud Console. Hãy vào Google AI Studio, chọn 'Create API key in new project' để được cấp quyền tự động.");
            }
            return new TestKeyResult(false, 401,
                    "Google báo API Key không hợp lệ (401). Vui lòng kiểm tra lại key đã copy hoặc tạo key mới tại Google AI Studio.");
        } else if (lastCode == 403) {
            return new TestKeyResult(false, 403,
                    "Google từ chối truy cập (403): Dự án Google Cloud của bạn chưa bật Generative Language API hoặc bị giới hạn IP/Domain.");
        } else if (lastCode == 429) {
            return new TestKeyResult(false, 429,
                    "Hạn mức gọi Google Gemini bị tạm khóa do vượt quá quota (429 Too Many Requests). Vui lòng thử lại sau giây lát.");
        } else {
            return new TestKeyResult(false, lastCode != 0 ? lastCode : 500,
                    "Google Gemini trả về mã lỗi HTTP " + lastCode + ". Vui lòng kiểm tra lại key.");
        }
    }

    /**
     * Validates a provided user Gemini API key with a fast ping.
     */
    public boolean testApiKey(String testKey) {
        return testApiKeyDetails(testKey).valid();
    }

    public List<SentenceChallengeItemDto> generateChallenges(List<Vocabulary> vocabularies) {
        return generateChallenges(vocabularies, null);
    }

    /**
     * Generates active sentence translation challenges via Gemini LLM using user or server API key.
     * Returns null on any failure to signal fallback to local NLP engine.
     */
    public List<SentenceChallengeItemDto> generateChallenges(List<Vocabulary> vocabularies, String customApiKey) {
        String activeKey = resolveApiKey(customApiKey);
        if (activeKey == null || vocabularies == null || vocabularies.isEmpty()) {
            return null;
        }

        try {
            StringBuilder vocabListBuilder = new StringBuilder();
            for (Vocabulary v : vocabularies) {
                vocabListBuilder.append(String.format(
                        "- Term ID: %d, Word: '%s', Part of speech: '%s', Meaning: '%s', Example: '%s'%n",
                        v.getId(),
                        v.getWord(),
                        v.getWordType() != null ? v.getWordType() : "",
                        v.getMeaning() != null ? v.getMeaning() : "",
                        v.getExampleSentence() != null ? v.getExampleSentence() : ""
                ));
            }

            String prompt = """
                    You are an expert bilingual English-Vietnamese language coach who specializes in natural, everyday spoken English.
                    Generate practical, natural, and conversational sentence translation challenges for an English learner based on these vocabulary items:
                    
                    %s
                    
                    CRITICAL GUIDELINES FOR THE SENTENCES:
                    1. PRACTICAL, RELATABLE & USUAL (Đời thường, thông dụng, dễ áp dụng ngoài đời):
                       - ABSOLUTELY DO NOT create stiff, robotic, textbook-like, or overly academic sentences (e.g. NEVER make sentences like 'Chúng ta cần chạy kỹ năng này để đạt được thành công').
                       - Sentences must reflect real life situations: daily routines, casual chatting with friends/colleagues, family, dining, shopping, travel, casual feelings, or everyday tasks.
                       - Use the target word in its most common, natural collocations.
                         * For example with 'run': use everyday contexts like running in the morning ("Tôi thường chạy bộ 20 phút mỗi sáng"), running late ("Xin lỗi tôi đến trễ vì kẹt xe"), running a small shop/business ("Anh ấy mở và quản lý một quán cà phê nhỏ"), running out of something ("Chúng ta sắp hết sữa rồi"), etc.
                         * For example with 'book': "Tôi cần đặt một bàn cho hai người vào tối nay."
                       - Keep sentences concise, clear, and easy to relate to.
                    2. NATURAL BILINGUAL TRANSLATION:
                       - "vietnamesePrompt": Must sound like natural, fluent Vietnamese that an ordinary Vietnamese person speaks in real life.
                       - "referenceEnglish": Natural native English sentence translating the prompt, correctly and idiomatically applying the target word.
                       - "hint": A friendly, helpful tip in Vietnamese on how the word is commonly used in this context.
                    
                    Return a JSON array where each object has:
                    - "termId": (number, matching the input Term ID)
                    - "targetWord": (string, the target word)
                    - "vietnamesePrompt": (string, natural conversational Vietnamese sentence to be translated)
                    - "hint": (string, helpful brief hint in Vietnamese about word usage or context)
                    - "referenceEnglish": (string, authentic native English sentence translating the prompt and correctly using targetWord)
                    - "targetKeywords": (array of strings, including base form and inflections of targetWord)
                    """.formatted(vocabListBuilder.toString());

            String rawJson = callGeminiApi(prompt, activeKey);
            if (rawJson == null || rawJson.isBlank()) {
                return null;
            }

            JsonNode rootNode = objectMapper.readTree(rawJson);
            if (!rootNode.isArray()) {
                if (rootNode.has("challenges") && rootNode.get("challenges").isArray()) {
                    rootNode = rootNode.get("challenges");
                } else {
                    log.warn("Gemini output is not a JSON array: {}", rawJson);
                    return null;
                }
            }

            List<SentenceChallengeItemDto> items = new ArrayList<>();
            long seq = 1;
            for (JsonNode node : rootNode) {
                Long termId = node.has("termId") ? node.get("termId").asLong() : null;
                String targetWord = node.has("targetWord") ? node.get("targetWord").asText() : "";
                String promptVi = node.has("vietnamesePrompt") ? node.get("vietnamesePrompt").asText() : "";
                String hint = node.has("hint") ? node.get("hint").asText() : "";
                String referenceEn = node.has("referenceEnglish") ? node.get("referenceEnglish").asText() : "";

                List<String> keywords = new ArrayList<>();
                if (node.has("targetKeywords") && node.get("targetKeywords").isArray()) {
                    for (JsonNode kw : node.get("targetKeywords")) {
                        keywords.add(kw.asText().toLowerCase());
                    }
                }
                if (!keywords.contains(targetWord.toLowerCase())) {
                    keywords.add(targetWord.toLowerCase());
                }

                Vocabulary matchedVocab = vocabularies.stream()
                        .filter(v -> (termId != null && Objects.equals(v.getId(), termId)) || v.getWord().equalsIgnoreCase(targetWord))
                        .findFirst()
                        .orElse(null);

                String pos = matchedVocab != null ? matchedVocab.getWordType() : "";
                String ipa = matchedVocab != null ? matchedVocab.getPronunciation() : "";
                Long finalTermId = matchedVocab != null ? matchedVocab.getId() : termId;

                items.add(new SentenceChallengeItemDto(
                        seq++,
                        finalTermId,
                        targetWord,
                        pos,
                        ipa,
                        promptVi,
                        hint,
                        referenceEn,
                        keywords
                ));
            }

            log.info("Gemini successfully generated {} active sentence challenges", items.size());
            return items;

        } catch (Exception e) {
            log.warn("Gemini generateChallenges encountered an error, fallback to local NLP: {}", e.getMessage());
            return null;
        }
    }

    public SentenceEvaluationResponse evaluateSentence(SentenceEvaluationRequest request) {
        return evaluateSentence(request, null);
    }

    /**
     * Evaluates learner's English sentence with Gemini LLM using user or server API key.
     * Returns null on any failure to signal fallback to local NLP engine.
     */
    public SentenceEvaluationResponse evaluateSentence(SentenceEvaluationRequest request, String customApiKey) {
        String activeKey = resolveApiKey(customApiKey);
        if (activeKey == null || request == null) {
            return null;
        }

        try {
            String prompt = """
                    You are a friendly, highly skilled bilingual English-Vietnamese language coach.
                    Your mission: Evaluate the learner's English sentence, fix their mistakes so the sentence is accurate and natural, and guide them on everyday native usage.
                    
                    - Target Word: "%s"
                    - Vietnamese Prompt to translate: "%s"
                    - Learner's English Sentence: "%s"
                    - Reference English: "%s"
                    
                    CRITICAL EVALUATION REQUIREMENTS:
                    1. SỬA LỖI TRỰC TIẾP (Corrected Sentence):
                       - Carefully fix all spelling mistakes (e.g. 'achive' -> 'achieve', 'successsfull' -> 'successful' or 'success'), grammatical errors, tense, prepositions, articles, capitalization, and punctuation.
                       - Keep the learner's sentence structure and intent, but rewrite it into 100%% grammatically correct English.
                       - Put this improved version in "correctedSentence".
                    2. GỢI Ý CÁCH NÓI TỰ NHIÊN, ĐỜI THƯỜNG (Native & Usual Alternative):
                       - In "nativeAlternative", provide the most natural, idiomatic way a native speaker would express this idea in daily life (conversational, usual, practical, NOT overly formal or stiff).
                    3. PHÂN TÍCH NGỮ PHÁP, CHÍNH TẢ & NGỮ CẢNH (Grammar Notes):
                       - In "grammarNotes" (array of strings in Vietnamese), clearly point out:
                         * Lỗi chính tả (Spelling): Chỉ rõ từ viết sai ➔ từ viết đúng (ví dụ: 'achive' ➔ 'achieve', 'successsfull' ➔ 'successful' hoặc 'success').
                         * Lỗi ngữ pháp / từ loại: (ví dụ: sau động từ 'achieve' cần danh từ 'success', không dùng tính từ 'successful').
                         * Lỗi ngữ cảnh & kết hợp từ (Collocation): Giải thích rõ ràng nếu kết hợp từ chưa tự nhiên (ví dụ: người bản xứ không dùng 'run a skill', mà dùng 'master/develop a skill'; từ 'run' thường dùng với 'run a business', 'run every morning', 'run a project'...).
                    4. NHẬN XÉT TỔNG QUAN (Feedback):
                       - In "feedback", write 1-2 friendly, encouraging sentences in Vietnamese summarizing their effort and the key takeaway.
                    5. MẸO SỬ DỤNG ĐỜI THƯỜNG (Context Tip):
                       - In "contextTip", give 1 practical tip in Vietnamese about how to use the target word naturally in everyday conversations.
                    6. ĐIỂM SỐ (Score 0-100):
                       - 90-100: Tự nhiên, đúng ngữ pháp và từ vựng hoàn hảo.
                       - 75-89: Hiểu đúng ý, đúng từ mục tiêu, chỉ có lỗi nhỏ về phong cách hoặc ngữ pháp nhẹ.
                       - 50-74: Đúng ý nhưng sai chính tả, sai từ loại hoặc dùng kết hợp từ chưa tự nhiên.
                       - <50: Sai hoàn toàn cấu trúc hoặc không dùng từ mục tiêu.
                    
                    Return a JSON object with:
                    - "score": integer (0-100)
                    - "passed": boolean (score >= 70)
                    - "targetWordUsed": boolean
                    - "rating": string ("EXCELLENT", "GOOD", "NEEDS_IMPROVEMENT", "INCORRECT")
                    - "feedback": string in Vietnamese
                    - "correctedSentence": string (Learner's sentence with all typos & grammar fixed)
                    - "nativeAlternative": string (Natural conversational English sentence)
                    - "grammarNotes": array of strings in Vietnamese
                    - "contextTip": string in Vietnamese (Practical tip for daily life usage)
                    """.formatted(
                    request.getTargetWord() != null ? request.getTargetWord() : "",
                    request.getVietnamesePrompt() != null ? request.getVietnamesePrompt() : "",
                    request.getUserSentence() != null ? request.getUserSentence() : "",
                    request.getReferenceEnglish() != null ? request.getReferenceEnglish() : ""
            );

            String rawJson = callGeminiApi(prompt, activeKey);
            if (rawJson == null || rawJson.isBlank()) {
                return null;
            }

            JsonNode root = objectMapper.readTree(rawJson);

            int score = root.has("score") ? root.get("score").asInt() : 70;
            boolean passed = root.has("passed") ? root.get("passed").asBoolean() : (score >= 70);
            boolean targetWordUsed = root.has("targetWordUsed") ? root.get("targetWordUsed").asBoolean() : true;
            String rating = root.has("rating") ? root.get("rating").asText() : (score >= 80 ? "EXCELLENT" : "GOOD");
            String feedback = root.has("feedback") ? root.get("feedback").asText() : "Đã hoàn thành đánh giá câu.";
            String corrected = root.has("correctedSentence") ? root.get("correctedSentence").asText() : request.getUserSentence();
            String nativeAlt = root.has("nativeAlternative") ? root.get("nativeAlternative").asText() : request.getReferenceEnglish();
            String contextTip = root.has("contextTip") ? root.get("contextTip").asText() : null;

            List<String> grammarNotes = new ArrayList<>();
            if (root.has("grammarNotes") && root.get("grammarNotes").isArray()) {
                for (JsonNode note : root.get("grammarNotes")) {
                    grammarNotes.add(note.asText());
                }
            }

            SentenceEvaluationResponse response = new SentenceEvaluationResponse(
                    score,
                    passed,
                    targetWordUsed,
                    rating,
                    feedback,
                    corrected,
                    nativeAlt,
                    grammarNotes,
                    contextTip
            );

            log.info("Gemini successfully evaluated sentence with score: {}", score);
            return response;

        } catch (Exception e) {
            log.warn("Gemini evaluateSentence encountered an error, fallback to local NLP: {}", e.getMessage());
            return null;
        }
    }

    /**
     * Generic structured JSON generation helper using Gemini with candidate model fallbacks.
     */
    public String generateContent(String promptText, String customApiKey) {
        String activeKey = resolveApiKey(customApiKey);
        if (activeKey == null || promptText == null || promptText.isBlank()) {
            return null;
        }
        try {
            return callGeminiApi(promptText, activeKey);
        } catch (Exception e) {
            log.warn("Gemini generateContent error: {}", e.getMessage());
            return null;
        }
    }

    /**
     * Executes REST call to Gemini Flash endpoint with structured JSON output configuration.
     * Automatically falls back to supported models if primary model is 404 or 503.
     */
    public String callGeminiApi(String promptText, String effectiveApiKey) throws Exception {
        List<String> modelsToTry = new ArrayList<>();
        if (!modelsToTry.contains("gemini-flash-lite-latest")) modelsToTry.add("gemini-flash-lite-latest");
        if (!modelsToTry.contains("gemini-3.5-flash-lite")) modelsToTry.add("gemini-3.5-flash-lite");
        if (!modelsToTry.contains("gemini-flash-latest")) modelsToTry.add("gemini-flash-latest");
        if (!modelsToTry.contains(this.model)) modelsToTry.add(this.model);
        if (!modelsToTry.contains("gemini-3.5-flash")) modelsToTry.add("gemini-3.5-flash");

        Map<String, Object> textPart = Map.of("text", promptText);
        Map<String, Object> content = Map.of("parts", List.of(textPart));
        Map<String, Object> generationConfig = Map.of(
                "temperature", 0.7,
                "responseMimeType", "application/json"
        );

        Map<String, Object> requestPayload = Map.of(
                "contents", List.of(content),
                "generationConfig", generationConfig
        );

        String requestBody = objectMapper.writeValueAsString(requestPayload);

        for (String m : modelsToTry) {
            try {
                String endpoint = String.format("%s/%s:generateContent?key=%s", baseUrl, m, effectiveApiKey);

                HttpRequest request = HttpRequest.newBuilder()
                        .uri(URI.create(endpoint))
                        .header("Content-Type", "application/json; charset=utf-8")
                        .header("x-goog-api-key", effectiveApiKey)
                        .timeout(Duration.ofSeconds(30))
                        .POST(HttpRequest.BodyPublishers.ofString(requestBody))
                        .build();

                HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());

                if (response.statusCode() != 200) {
                    log.warn("Gemini API ({}) returned status {}: {}", m, response.statusCode(), response.body());
                    continue; // Try next model candidate
                }

                JsonNode responseNode = objectMapper.readTree(response.body());
                JsonNode candidates = responseNode.get("candidates");
                if (candidates == null || !candidates.isArray() || candidates.isEmpty()) {
                    log.warn("Gemini API ({}) returned empty candidates: {}", m, response.body());
                    continue;
                }

                JsonNode firstCandidate = candidates.get(0);
                JsonNode contentNode = firstCandidate.get("content");
                if (contentNode == null || !contentNode.has("parts")) {
                    continue;
                }

                JsonNode parts = contentNode.get("parts");
                if (!parts.isArray() || parts.isEmpty()) {
                    continue;
                }

                String rawText = parts.get(0).get("text").asText();
                return cleanJsonOutput(rawText);
            } catch (Exception modelErr) {
                log.warn("Gemini candidate {} attempt failed: {}. Trying next candidate...", m, modelErr.getMessage());
            }
        }

        return null;
    }

    private String cleanJsonOutput(String rawText) {
        if (rawText == null) return null;
        String trimmed = rawText.trim();
        if (trimmed.startsWith("```json")) {
            trimmed = trimmed.substring(7);
        } else if (trimmed.startsWith("```")) {
            trimmed = trimmed.substring(3);
        }
        if (trimmed.endsWith("```")) {
            trimmed = trimmed.substring(0, trimmed.length() - 3);
        }
        return trimmed.trim();
    }
}
