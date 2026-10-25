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

        // Try generating with Gemini LLM if configured
        if (geminiSentenceService != null && geminiSentenceService.isConfigured()) {
            List<SentenceChallengeItemDto> geminiItems = geminiSentenceService.generateChallenges(selected);
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
     * Evaluates user's translated sentence with smart AI checking heuristics.
     */
    public SentenceEvaluationResponse evaluateSentence(SentenceEvaluationRequest request) {
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

        // Try evaluating with Gemini LLM if configured
        if (geminiSentenceService != null && geminiSentenceService.isConfigured()) {
            SentenceEvaluationResponse geminiResponse = geminiSentenceService.evaluateSentence(request);
            if (geminiResponse != null) {
                return geminiResponse;
            }
        }

        List<String> grammarNotes = new ArrayList<>();
        boolean targetWordUsed = checkTargetWordUsed(userSentence, targetWord);

        if (!targetWordUsed) {
            grammarNotes.add("Bạn chưa sử dụng từ vựng mục tiêu: '" + targetWord + "' trong câu.");
        }

        // Check capitalization
        boolean startsWithUpper = Character.isUpperCase(userSentence.charAt(0));
        if (!startsWithUpper) {
            grammarNotes.add("Chữ cái đầu câu nên được viết hoa.");
        }

        // Check ending punctuation
        char lastChar = userSentence.charAt(userSentence.length() - 1);
        boolean hasEndingPunctuation = (lastChar == '.' || lastChar == '!' || lastChar == '?');
        if (!hasEndingPunctuation) {
            grammarNotes.add("Nên kết thúc câu bằng dấu chấm câu (.).");
        }

        // Word overlap & semantic similarity with reference
        double similarityScore = calculateSimilarity(userSentence, reference);

        // Score computation (0 - 100)
        int score = 0;
        if (targetWordUsed) {
            score += 40; // 40 points for correctly applying target word
        }
        score += (int) (similarityScore * 50); // up to 50 points for matching reference intent

        if (startsWithUpper && hasEndingPunctuation) {
            score += 10; // 10 points for good sentence mechanics
        } else if (startsWithUpper || hasEndingPunctuation) {
            score += 5;
        }

        score = Math.min(100, Math.max(10, score));
        boolean passed = score >= 70;

        String rating;
        String feedback;
        if (score >= 90) {
            rating = "EXCELLENT";
            feedback = "Xuất sắc! Câu dịch của bạn rất tự nhiên, chuẩn xác cả ngữ pháp và từ vựng.";
        } else if (score >= 75) {
            rating = "GOOD";
            feedback = "Tốt lắm! Câu dịch diễn đạt đúng ý và sử dụng từ mục tiêu chuẩn xác.";
        } else if (score >= 55) {
            rating = "NEEDS_IMPROVEMENT";
            feedback = "Khá tốt! Bạn đã nắm được ý chính nhưng câu văn có thể hoàn thiện tự nhiên hơn.";
        } else {
            rating = "INCORRECT";
            feedback = "Cần cải thiện. Hãy chú ý cấu trúc câu và từ vựng mục tiêu được gợi ý.";
        }

        // Build corrected sentence
        String corrected = cleanPunctuationAndCapitalize(userSentence);

        return new SentenceEvaluationResponse(
                score,
                passed,
                targetWordUsed,
                rating,
                feedback,
                corrected,
                reference,
                grammarNotes
        );
    }

    private boolean checkTargetWordUsed(String sentence, String targetWord) {
        if (sentence == null || targetWord == null || targetWord.isEmpty()) {
            return false;
        }
        String lowerSentence = sentence.toLowerCase();
        String lowerTarget = targetWord.toLowerCase();

        // Exact word boundary regex
        Pattern pattern = Pattern.compile("\\b" + Pattern.quote(lowerTarget) + "\\b");
        if (pattern.matcher(lowerSentence).find()) {
            return true;
        }

        // Check common base/stem without suffix (e.g., -ed, -ing, -s, -es)
        if (lowerTarget.length() >= 4) {
            String stem = lowerTarget.replaceAll("(ing|ed|es|s|ly)$", "");
            if (stem.length() >= 3) {
                Pattern stemPattern = Pattern.compile("\\b" + Pattern.quote(stem) + "[a-z]*\\b");
                if (stemPattern.matcher(lowerSentence).find()) {
                    return true;
                }
            }
        }

        return false;
    }

    private double calculateSimilarity(String s1, String s2) {
        if (s1 == null || s2 == null) return 0.0;
        Set<String> words1 = extractWords(s1);
        Set<String> words2 = extractWords(s2);

        if (words2.isEmpty()) return 0.5;

        int commonCount = 0;
        for (String w : words1) {
            if (words2.contains(w)) {
                commonCount++;
            }
        }

        // Jaccard similarity index
        double intersection = commonCount;
        double union = words1.size() + words2.size() - commonCount;
        return union > 0 ? (intersection / union) : 0.0;
    }

    private Set<String> extractWords(String text) {
        Set<String> words = new HashSet<>();
        String[] tokens = text.toLowerCase().replaceAll("[^a-z0-9\\s]", " ").split("\\s+");
        for (String token : tokens) {
            if (!token.isEmpty()) {
                words.add(token);
            }
        }
        return words;
    }

    private String cleanPunctuationAndCapitalize(String sentence) {
        if (sentence == null || sentence.isEmpty()) return "";
        String result = sentence.trim();
        result = Character.toUpperCase(result.charAt(0)) + result.substring(1);
        char last = result.charAt(result.length() - 1);
        if (last != '.' && last != '!' && last != '?') {
            result += ".";
        }
        return result;
    }

    private SentenceTemplate buildSentenceTemplate(String term, String pos, String def, String example) {
        // If an example sentence is provided in the vocabulary, utilize it
        if (example != null && !example.trim().isEmpty() && example.contains(term)) {
            String viPrompt = "Dịch câu sau sang tiếng Anh: [Hãy dùng từ: '" + term + "']";
            if (def != null && !def.isEmpty()) {
                viPrompt = "Hãy diễn đạt câu này sang tiếng Anh (nghĩa: " + def + "):";
            }
            return new SentenceTemplate(viPrompt, example.trim());
        }

        // Natural contextual templates based on Part of Speech
        String p = pos != null ? pos.toLowerCase() : "";
        String meaning = (def != null && !def.isEmpty()) ? def : term;

        if (p.contains("adj") || p.contains("tính")) {
            return new SentenceTemplate(
                    "Hôm nay tôi cảm thấy rất " + meaning + " sau một ngày dài làm việc.",
                    "Today I feel very " + term + " after a long day of work."
            );
        } else if (p.contains("verb") || p.contains("động")) {
            return new SentenceTemplate(
                    "Chúng ta cần " + meaning + " kế hoạch này để đạt được kết quả tốt nhất.",
                    "We need to " + term + " this plan to achieve the best results."
            );
        } else if (p.contains("adv") || p.contains("trạng")) {
            return new SentenceTemplate(
                    "Cô ấy đã hoàn thành toàn bộ bài kiểm tra một cách " + meaning + ".",
                    "She completed the entire test " + term + "."
            );
        } else {
            // Default noun or general vocabulary
            return new SentenceTemplate(
                    "Việc hiểu rõ " + meaning + " là chìa khóa để giải quyết vấn đề này.",
                    "Understanding " + term + " clearly is the key to solving this problem."
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
