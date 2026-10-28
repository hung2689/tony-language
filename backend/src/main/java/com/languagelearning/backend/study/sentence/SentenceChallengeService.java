package com.languagelearning.backend.study.sentence;

import com.languagelearning.backend.common.exception.DeckNotFoundException;
import com.languagelearning.backend.common.exception.ValidationException;
import com.languagelearning.backend.deck.entity.VocabularySet;
import com.languagelearning.backend.deck.repository.VocabularySetRepository;
import com.languagelearning.backend.study.sentence.dto.SentenceChallengeItemDto;
import com.languagelearning.backend.study.sentence.dto.SentenceEvaluationRequest;
import com.languagelearning.backend.study.sentence.dto.SentenceEvaluationResponse;
import com.languagelearning.backend.study.sentence.gemini.GeminiSentenceService;
import com.languagelearning.backend.term.entity.Vocabulary;
import com.languagelearning.backend.term.repository.VocabularyRepository;
import org.springframework.stereotype.Service;

import java.util.*;
import java.util.regex.Pattern;

@Service
public class SentenceChallengeService {

    private final VocabularySetRepository vocabularySetRepository;
    private final VocabularyRepository vocabularyRepository;
    private final GeminiSentenceService geminiSentenceService;

    public SentenceChallengeService(
            VocabularySetRepository vocabularySetRepository,
            VocabularyRepository vocabularyRepository,
            GeminiSentenceService geminiSentenceService
    ) {
        this.vocabularySetRepository = vocabularySetRepository;
        this.vocabularyRepository = vocabularyRepository;
        this.geminiSentenceService = geminiSentenceService;
    }

    /**
     * Generates active sentence translation challenges for the given deck.
     */
    public List<SentenceChallengeItemDto> generateChallenges(Long userId, Long deckId, int limit) {
        return generateChallenges(userId, deckId, limit, null);
    }

    public List<SentenceChallengeItemDto> generateChallenges(Long userId, Long deckId, int limit, String customApiKey) {
        VocabularySet deck = vocabularySetRepository.findByIdAndUserId(deckId, userId)
                .orElseThrow(() -> new DeckNotFoundException(deckId));

        List<Vocabulary> vocabularies = vocabularyRepository.findByDeckId(deckId);
        if (vocabularies.isEmpty()) {
            throw new ValidationException("Bộ từ vựng chưa có từ nào để luyện đặt câu.");
        }

        // Shuffle and pick up to `limit` words (default 5)
        List<Vocabulary> pool = new ArrayList<>(vocabularies);
        Collections.shuffle(pool);
        int takeCount = Math.min(pool.size(), Math.max(1, limit > 0 ? limit : 5));
        List<Vocabulary> selected = pool.subList(0, takeCount);

        // Try generating with Gemini LLM if configured or custom key provided
        if (geminiSentenceService != null && geminiSentenceService.isAvailable(customApiKey)) {
            List<SentenceChallengeItemDto> geminiItems = geminiSentenceService.generateChallenges(selected, customApiKey);
            if (geminiItems != null && !geminiItems.isEmpty()) {
                return geminiItems;
            }
        }

        List<SentenceChallengeItemDto> challenges = new ArrayList<>();
        long challengeIdSeq = 1;

        for (Vocabulary vocab : selected) {
            String term = vocab.getWord();
            String pos = vocab.getWordType() != null ? vocab.getWordType().toLowerCase() : "";
            String def = vocab.getMeaning() != null ? vocab.getMeaning().trim() : "";
            String example = vocab.getExampleSentence() != null ? vocab.getExampleSentence().trim() : "";

            SentenceTemplate template = buildSentenceTemplate(term, pos, def, example);

            List<String> keywords = new ArrayList<>();
            keywords.add(term.toLowerCase());
            // Add plural or basic inflections
            if (term.endsWith("y")) {
                keywords.add(term.substring(0, term.length() - 1) + "ies");
                keywords.add(term.substring(0, term.length() - 1) + "ied");
            } else if (term.endsWith("e")) {
                keywords.add(term + "d");
                keywords.add(term.substring(0, term.length() - 1) + "ing");
            } else {
                keywords.add(term + "s");
                keywords.add(term + "ed");
                keywords.add(term + "ing");
            }

            SentenceChallengeItemDto item = new SentenceChallengeItemDto(
                    challengeIdSeq++,
                    vocab.getId(),
                    term,
                    vocab.getWordType(),
                    vocab.getPronunciation(),
                    template.vietnamesePrompt,
                    "Từ mục tiêu: " + term + (!pos.isEmpty() ? " (" + pos + ")" : ""),
                    template.referenceEnglish,
                    keywords
            );

            challenges.add(item);
        }

        return challenges;
    }

    /**
     * Evaluates user's translated sentence with smart AI checking heuristics or Gemini.
     */
    public SentenceEvaluationResponse evaluateSentence(SentenceEvaluationRequest request) {
        return evaluateSentence(request, null);
    }

    public SentenceEvaluationResponse evaluateSentence(SentenceEvaluationRequest request, String customApiKey) {
        String userSentence = request.getUserSentence() != null ? request.getUserSentence().trim() : "";
        String targetWord = request.getTargetWord() != null ? request.getTargetWord().trim() : "";
        String reference = request.getReferenceEnglish() != null ? request.getReferenceEnglish().trim() : "";

        if (userSentence.isEmpty()) {
            return new SentenceEvaluationResponse(
                    0,
                    false,
                    false,
                    "INCORRECT",
                    "Vui lòng nhập câu dịch của bạn trước khi kiểm tra.",
                    reference,
                    reference,
                    List.of("Câu trả lời hiện đang để trống.")
            );
        }

        // Try evaluating with Gemini LLM if configured or custom key provided
        if (geminiSentenceService != null && geminiSentenceService.isAvailable(customApiKey)) {
            SentenceEvaluationResponse geminiResponse = geminiSentenceService.evaluateSentence(request, customApiKey);
            if (geminiResponse != null) {
                return geminiResponse;
            }
        }

        throw new ValidationException("Dịch vụ chấm câu bằng AI Gemini hiện không khả dụng (Timeout hoặc chưa cấu hình API Key). Vui lòng thử lại sau vài giây hoặc kiểm tra khóa API Gemini.");
    }

    private SentenceTemplate buildSentenceTemplate(String term, String pos, String def, String example) {
        // If an authentic example is already provided in vocabulary card, use it!
        if (example != null && !example.isBlank() && example.toLowerCase().contains(term.toLowerCase())) {
            String cleanEx = example.trim();
            String prompt = "Dịch câu sau sang tiếng Anh: \"" + (def != null && !def.isBlank() ? "Hãy dịch câu nói có từ '" + term + "' (" + def.trim() + ")" : "Hãy đặt câu tự nhiên với từ '" + term + "'") + ".\"";
            return new SentenceTemplate(prompt, cleanEx);
        }

        // Natural, practical, everyday life templates (usual & conversational)
        String p = pos != null ? pos.toLowerCase() : "";
        String meaning = (def != null && !def.isBlank()) ? def.trim() : term;
        String lowerTerm = term.toLowerCase();

        // Special common word natural presets
        if (lowerTerm.equals("run")) {
            return new SentenceTemplate(
                    "Dịch câu sau sang tiếng Anh: \"Tôi thường chạy bộ quanh công viên vào mỗi sáng sớm.\"",
                    "I usually run around the park early in the morning."
            );
        } else if (lowerTerm.equals("book")) {
            return new SentenceTemplate(
                    "Dịch câu sau sang tiếng Anh: \"Tôi cần đặt một bàn cho hai người vào tối nay.\"",
                    "I need to book a table for two tonight."
            );
        }

        if (p.contains("adj") || p.contains("tính")) {
            return new SentenceTemplate(
                    "Dịch câu sau sang tiếng Anh: \"Thời tiết hôm nay rất " + meaning + ", thật tuyệt để đi dạo ngoài trời.\"",
                    "The weather today is very " + term + ", perfect for going outside."
            );
        } else if (p.contains("verb") || p.contains("động")) {
            return new SentenceTemplate(
                    "Dịch câu sau sang tiếng Anh: \"Tôi cố gắng " + meaning + " mỗi ngày để tạo thói quen tốt.\"",
                    "I try to " + term + " every day to build a good habit."
            );
        } else if (p.contains("adv") || p.contains("trạng")) {
            return new SentenceTemplate(
                    "Dịch câu sau sang tiếng Anh: \"Cô ấy hoàn thành công việc một cách " + meaning + " và nhanh chóng.\"",
                    "She completed the task " + term + " and quickly."
            );
        } else {
            // Default noun or general vocabulary
            return new SentenceTemplate(
                    "Dịch câu sau sang tiếng Anh: \"Tôi luôn mang theo " + meaning + " khi đi ra ngoài.\"",
                    "I always bring my " + term + " whenever I go outside."
            );
        }
    }

    private static class SentenceTemplate {
        final String vietnamesePrompt;
        final String referenceEnglish;

        SentenceTemplate(String vietnamesePrompt, String referenceEnglish) {
            this.vietnamesePrompt = vietnamesePrompt;
            this.referenceEnglish = referenceEnglish;
        }
    }
}
