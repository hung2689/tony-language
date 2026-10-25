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
            @Value("${gemini.api.model:gemini-1.5-flash}") String model,
            @Value("${gemini.api.url:https://generativelanguage.googleapis.com/v1beta/models}") String baseUrl
    ) {
        this.apiKey = apiKey != null ? apiKey.trim() : "";
        this.model = (model != null && !model.isBlank()) ? model.trim() : "gemini-1.5-flash";
        this.baseUrl = (baseUrl != null && !baseUrl.isBlank()) ? baseUrl.trim() : "https://generativelanguage.googleapis.com/v1beta/models";
        this.objectMapper = new ObjectMapper();
        this.httpClient = HttpClient.newBuilder()
                .connectTimeout(Duration.ofSeconds(12))
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

    /**
     * Validates a provided user Gemini API key with a fast ping.
     */
    public boolean testApiKey(String testKey) {
        if (testKey == null || testKey.isBlank()) return false;
        try {
            String testPrompt = "Return a JSON object with key 'status' set to 'OK'.";
            String res = callGeminiApi(testPrompt, testKey.trim());
            return res != null && !res.isBlank();
        } catch (Exception e) {
            log.warn("Gemini testApiKey failed: {}", e.getMessage());
            return false;
        }
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
                    You are an expert bilingual English-Vietnamese language teacher.
                    Generate creative, natural, and varied sentence translation challenges for an English learner based on these vocabulary items:
                    
                    %s
                    
                    Create an engaging Vietnamese sentence for each vocabulary word that requires the user to translate it to English using the target word.
                    
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
                    You are a strict yet encouraging bilingual native English and Vietnamese language instructor.
                    Evaluate the English translation written by a learner:
                    
                    - Target Word to practice: "%s"
                    - Vietnamese Prompt: "%s"
                    - Learner's English Sentence: "%s"
                    - Reference Native Translation: "%s"
                    
                    Evaluate accurately and output a JSON object with:
                    - "score": integer 0-100 (90-100: native-like & perfect grammar; 75-89: minor stylistic issues; 50-74: noticeable grammar or vocabulary mistakes; <50: severe errors or missing target word)
                    - "passed": boolean (true if score >= 70, false otherwise)
                    - "targetWordUsed": boolean (true if user correctly and appropriately applied the target word or its inflections)
                    - "rating": string (one of: "EXCELLENT", "GOOD", "NEEDS_IMPROVEMENT", "INCORRECT")
                    - "feedback": string in Vietnamese (clear, encouraging, 1-2 concise sentences explaining what was good and what should be improved)
                    - "correctedSentence": string (the learner's sentence with grammar/typos fixed)
                    - "nativeAlternative": string (the most natural phrasing an educated native speaker would say)
                    - "grammarNotes": array of strings in Vietnamese (bullet points pointing out specific grammar/preposition/tense/spelling rules)
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
                    grammarNotes
            );

            log.info("Gemini successfully evaluated sentence with score: {}", score);
            return response;

        } catch (Exception e) {
            log.warn("Gemini evaluateSentence encountered an error, fallback to local NLP: {}", e.getMessage());
            return null;
        }
    }

    /**
     * Executes REST call to Gemini 1.5 Flash endpoint with structured JSON output configuration.
     */
    private String callGeminiApi(String promptText, String effectiveApiKey) throws Exception {
        String endpoint = String.format("%s/%s:generateContent?key=%s", baseUrl, model, effectiveApiKey);

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

        HttpRequest request = HttpRequest.newBuilder()
                .uri(URI.create(endpoint))
                .header("Content-Type", "application/json; charset=utf-8")
                .timeout(Duration.ofSeconds(15))
                .POST(HttpRequest.BodyPublishers.ofString(requestBody))
                .build();

        HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());

        if (response.statusCode() != 200) {
            log.warn("Gemini API returned status {}: {}", response.statusCode(), response.body());
            return null;
        }

        JsonNode responseNode = objectMapper.readTree(response.body());
        JsonNode candidates = responseNode.get("candidates");
        if (candidates == null || !candidates.isArray() || candidates.isEmpty()) {
            log.warn("Gemini API returned empty candidates: {}", response.body());
            return null;
        }

        JsonNode firstCandidate = candidates.get(0);
        JsonNode contentNode = firstCandidate.get("content");
        if (contentNode == null || !contentNode.has("parts")) {
            return null;
        }

        JsonNode parts = contentNode.get("parts");
        if (!parts.isArray() || parts.isEmpty()) {
            return null;
        }

        String rawText = parts.get(0).get("text").asText();
        return cleanJsonOutput(rawText);
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
