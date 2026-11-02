package com.languagelearning.backend.study.synonym;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.languagelearning.backend.common.exception.ResourceNotFoundException;
import com.languagelearning.backend.common.exception.ValidationException;
import com.languagelearning.backend.deck.entity.VocabularySet;
import com.languagelearning.backend.deck.entity.VocabularySetItem;
import com.languagelearning.backend.deck.repository.VocabularySetItemRepository;
import com.languagelearning.backend.deck.repository.VocabularySetRepository;
import com.languagelearning.backend.study.entity.StudyProgress;
import com.languagelearning.backend.study.repository.StudyProgressRepository;
import com.languagelearning.backend.study.sentence.gemini.GeminiSentenceService;
import com.languagelearning.backend.study.synonym.dto.*;
import com.languagelearning.backend.study.synonym.entity.SynonymChallengeHistory;
import com.languagelearning.backend.study.synonym.repository.SynonymChallengeHistoryRepository;
import com.languagelearning.backend.term.entity.Vocabulary;
import com.languagelearning.backend.term.entity.VocabularySynonym;
import com.languagelearning.backend.term.repository.VocabularyRepository;
import com.languagelearning.backend.term.repository.VocabularySynonymRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.*;
import java.util.stream.Collectors;

@Service
public class SynonymChallengeService {

    private static final Logger log = LoggerFactory.getLogger(SynonymChallengeService.class);

    private final VocabularyRepository vocabularyRepository;
    private final VocabularySetRepository vocabularySetRepository;
    private final VocabularySetItemRepository vocabularySetItemRepository;
    private final VocabularySynonymRepository vocabularySynonymRepository;
    private final StudyProgressRepository studyProgressRepository;
    private final SynonymChallengeHistoryRepository historyRepository;
    private final GeminiSentenceService geminiSentenceService;
    private final ObjectMapper objectMapper;

    public SynonymChallengeService(
            VocabularyRepository vocabularyRepository,
            VocabularySetRepository vocabularySetRepository,
            VocabularySetItemRepository vocabularySetItemRepository,
            VocabularySynonymRepository vocabularySynonymRepository,
            StudyProgressRepository studyProgressRepository,
            SynonymChallengeHistoryRepository historyRepository,
            GeminiSentenceService geminiSentenceService
    ) {
        this.vocabularyRepository = vocabularyRepository;
        this.vocabularySetRepository = vocabularySetRepository;
        this.vocabularySetItemRepository = vocabularySetItemRepository;
        this.vocabularySynonymRepository = vocabularySynonymRepository;
        this.studyProgressRepository = studyProgressRepository;
        this.historyRepository = historyRepository;
        this.geminiSentenceService = geminiSentenceService;
        this.objectMapper = new ObjectMapper();
    }

    /**
     * Retrieves prioritized vocabulary queue for Synonym Challenge in a deck.
     * Prioritizes weak/unmastered words, words with synonyms, and unreviewed words.
     */
    @Transactional(readOnly = true)
    public List<SynonymChallengeItemDto> getDeckSynonymQueue(Long userId, Long deckId, int limit) {
        VocabularySet deck = vocabularySetRepository.findByIdAndUserId(deckId, userId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy bộ từ với id: " + deckId));

        List<Vocabulary> vocabularies = vocabularyRepository.findByDeckId(deckId);
        if (vocabularies.isEmpty()) {
            return Collections.emptyList();
        }

        List<Long> vocabIds = vocabularies.stream().map(Vocabulary::getId).toList();

        // 1. Fetch study progress
        Map<Long, StudyProgress> progressMap = studyProgressRepository.findByUserIdAndVocabularyIdIn(userId, vocabIds)
                .stream().collect(Collectors.toMap(StudyProgress::getVocabularyId, p -> p, (a, b) -> a));

        // 2. Fetch DB synonyms count
        List<VocabularySynonym> allSynonyms = vocabularySynonymRepository.findByVocabularyIdIn(vocabIds);
        Map<Long, Integer> synonymCountMap = new HashMap<>();
        for (VocabularySynonym s : allSynonyms) {
            synonymCountMap.put(s.getVocabularyId(), synonymCountMap.getOrDefault(s.getVocabularyId(), 0) + 1);
        }

        // 3. Sort/Prioritize
        // Priority weight calculation:
        // - High priority: weak words (incorrectCount > correctCount)
        // - Medium priority: unreviewed words (no progress record)
        // - Bonus weight: has synonyms in DB (already rich learning material)
        // - Low priority: mastered words
        List<Vocabulary> sorted = new ArrayList<>(vocabularies);
        sorted.sort((v1, v2) -> {
            int score1 = calculatePriorityScore(v1.getId(), progressMap.get(v1.getId()), synonymCountMap.getOrDefault(v1.getId(), 0));
            int score2 = calculatePriorityScore(v2.getId(), progressMap.get(v2.getId()), synonymCountMap.getOrDefault(v2.getId(), 0));
            return Integer.compare(score2, score1); // Higher score first
        });

        int takeCount = Math.min(limit > 0 ? limit : 20, sorted.size());
        List<Vocabulary> selected = sorted.subList(0, takeCount);

        return selected.stream().map(v -> new SynonymChallengeItemDto(
                v.getId(),
                v.getWord(),
                v.getMeaning(),
                v.getPronunciation(),
                v.getWordType(),
                v.getExampleSentence(),
                synonymCountMap.getOrDefault(v.getId(), 0)
        )).toList();
    }

    private int calculatePriorityScore(Long vocabId, StudyProgress sp, int synCount) {
        int score = 0;
        if (sp == null) {
            score += 50; // Unreviewed
        } else {
            if (sp.getWrongCount() > sp.getCorrectCount()) {
                score += 100; // Weak word
            } else if (sp.getMemoryLevel() <= 1) {
                score += 70;
            } else if (sp.getMemoryLevel() <= 3) {
                score += 40;
            } else {
                score += 10;
            }
        }
        // Boost words that already have synonym entries
        score += Math.min(synCount * 5, 25);
        return score;
    }

    /**
     * Evaluates learner's submitted synonyms using Dual-layer check (DB + Gemini AI).
     * Fallbacks safely to DB lookup if Gemini AI is unavailable or times out.
     */
    @Transactional
    public SynonymEvaluateResponse evaluateChallenge(Long userId, SynonymEvaluateRequest request, String customApiKey) {
        if (request.getVocabularyId() == null) {
            throw new ValidationException("vocabularyId không được để trống");
        }
        Vocabulary vocab = vocabularyRepository.findById(request.getVocabularyId())
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy từ vựng với id: " + request.getVocabularyId()));

        String rootWord = (request.getRootWord() != null && !request.getRootWord().isBlank())
                ? request.getRootWord().trim()
                : vocab.getWord();

        // Normalize user answers (preserve distinct lowercase)
        List<String> rawAnswers = request.getUserAnswers() != null ? request.getUserAnswers() : Collections.emptyList();
        Set<String> seenAnswers = new LinkedHashSet<>();
        for (String ans : rawAnswers) {
            if (ans != null && !ans.trim().isEmpty()) {
                seenAnswers.add(ans.trim());
            }
        }
        List<String> uniqueUserAnswers = new ArrayList<>(seenAnswers);

        // Fetch DB synonyms for this vocab
        List<VocabularySynonym> dbSynonymEntities = vocabularySynonymRepository.findByVocabularyId(vocab.getId());
        Set<String> dbSynonymSet = dbSynonymEntities.stream()
                .map(s -> s.getSynonym().trim().toLowerCase())
                .collect(Collectors.toSet());

        // Check cards in current deck to know if missed synonyms are already in deck
        Set<String> deckWordsLower = new HashSet<>();
        if (request.getDeckId() != null) {
            List<Vocabulary> deckVocabs = vocabularyRepository.findByDeckId(request.getDeckId());
            for (Vocabulary v : deckVocabs) {
                if (v.getWord() != null) {
                    deckWordsLower.add(v.getWord().trim().toLowerCase());
                }
            }
        }

        SynonymEvaluateResponse response = null;
        boolean geminiSucceeded = false;

        // Try AI Evaluation if Gemini is available
        if (geminiSentenceService.isAvailable(customApiKey)) {
            try {
                response = callGeminiEvaluation(rootWord, vocab, uniqueUserAnswers, dbSynonymSet, deckWordsLower, customApiKey);
                if (response != null && response.getEvaluatedWords() != null) {
                    geminiSucceeded = true;
                }
            } catch (Exception e) {
                log.warn("Gemini synonym evaluation failed or timed out: {}", e.getMessage());
            }
        }

        // Fallback if Gemini not available or call failed
        if (!geminiSucceeded || response == null) {
            response = buildFallbackResponse(rootWord, vocab, uniqueUserAnswers, dbSynonymEntities, dbSynonymSet, deckWordsLower);
        }

        // Calculate summary counts
        int totalSubmitted = response.getEvaluatedWords().size();
        int validCount = (int) response.getEvaluatedWords().stream().filter(EvaluatedWordDto::isValid).count();
        int invalidCount = totalSubmitted - validCount;

        response.setTotalSubmitted(totalSubmitted);
        response.setValidCount(validCount);
        response.setInvalidCount(invalidCount);

        // Calculate new discovered count (valid answers that weren't originally in deck)
        int newDiscovered = 0;
        for (EvaluatedWordDto ew : response.getEvaluatedWords()) {
            if (ew.isValid() && !deckWordsLower.contains(ew.getWord().toLowerCase())) {
                newDiscovered++;
            }
        }
        response.setNewDiscoveredCount(newDiscovered);

        // Save history record
        try {
            String evaluatedJson = objectMapper.writeValueAsString(response.getEvaluatedWords());
            String missedJson = objectMapper.writeValueAsString(response.getMissedSynonyms());
            SynonymChallengeHistory history = new SynonymChallengeHistory(
                    userId,
                    request.getDeckId() != null ? request.getDeckId() : 0L,
                    vocab.getId(),
                    rootWord,
                    response.getEvaluationMode(),
                    totalSubmitted,
                    validCount,
                    invalidCount,
                    evaluatedJson,
                    missedJson
            );
            historyRepository.save(history);
        } catch (Exception e) {
            log.warn("Failed to persist SynonymChallengeHistory: {}", e.getMessage());
        }

        // Update StudyProgress if study records exist
        updateProgressOnChallenge(userId, vocab.getId(), validCount, invalidCount);

        return response;
    }

    private SynonymEvaluateResponse callGeminiEvaluation(
            String rootWord,
            Vocabulary vocab,
            List<String> userAnswers,
            Set<String> dbSynonymSet,
            Set<String> deckWordsLower,
            String customApiKey
    ) throws Exception {
        String prompt = buildGeminiPrompt(rootWord, vocab, userAnswers, dbSynonymSet);
        String rawJson = geminiSentenceService.generateContent(prompt, customApiKey);

        if (rawJson == null || rawJson.isBlank()) {
            return null;
        }

        JsonNode rootNode = objectMapper.readTree(rawJson);
        JsonNode evalNode = rootNode.get("evaluatedWords");
        JsonNode missedNode = rootNode.get("missedSynonyms");

        List<EvaluatedWordDto> evaluatedList = new ArrayList<>();
        if (evalNode != null && evalNode.isArray()) {
            for (JsonNode n : evalNode) {
                String word = n.path("word").asText("");
                boolean isValid = n.path("isValid").asBoolean(false);
                String meaning = n.path("meaning").asText("");
                String explanation = n.path("explanation").asText("");

                // Layer 1 Override: If user answer exists in DB synonyms, always mark valid!
                String source = "AI";
                if (dbSynonymSet.contains(word.trim().toLowerCase())) {
                    isValid = true;
                    source = "DATABASE";
                }

                evaluatedList.add(new EvaluatedWordDto(word, isValid, source, meaning, explanation));
            }
        }

        // Ensure all user answers are included in evaluated list even if AI missed one
        Set<String> answeredWordsLower = evaluatedList.stream().map(e -> e.getWord().toLowerCase()).collect(Collectors.toSet());
        for (String ans : userAnswers) {
            if (!answeredWordsLower.contains(ans.toLowerCase())) {
                boolean inDb = dbSynonymSet.contains(ans.toLowerCase());
                evaluatedList.add(new EvaluatedWordDto(
                        ans,
                        inDb,
                        inDb ? "DATABASE" : "AI",
                        inDb ? "(Từ đồng nghĩa có sẵn)" : "",
                        inDb ? "Khớp với dữ liệu từ đồng nghĩa đã lưu." : "AI chưa phân tích được từ này."
                ));
            }
        }

        List<MissedSynonymDto> missedList = new ArrayList<>();
        Set<String> seenMissedLower = new HashSet<>();

        if (missedNode != null && missedNode.isArray()) {
            for (JsonNode m : missedNode) {
                String word = m.path("word").asText("").trim();
                if (word.isEmpty() || seenMissedLower.contains(word.toLowerCase())) {
                    continue;
                }
                seenMissedLower.add(word.toLowerCase());
                String ipa = m.path("ipa").asText("");
                String pos = m.path("pos").asText("");
                String meaning = m.path("meaning").asText("");
                String example = m.path("example").asText("");
                String exampleVi = m.path("exampleVi").asText("");
                boolean alreadyInDeck = deckWordsLower.contains(word.toLowerCase());

                missedList.add(new MissedSynonymDto(word, ipa, pos, meaning, example, exampleVi, alreadyInDeck));
            }
        }

        // Also add any DB synonyms that user didn't submit and AI didn't list
        Set<String> userAnswersLower = userAnswers.stream().map(String::toLowerCase).collect(Collectors.toSet());
        for (String dbSyn : dbSynonymSet) {
            if (!userAnswersLower.contains(dbSyn) && !seenMissedLower.contains(dbSyn)) {
                seenMissedLower.add(dbSyn);
                missedList.add(new MissedSynonymDto(
                        dbSyn,
                        "",
                        vocab.getWordType() != null ? vocab.getWordType() : "",
                        "(Từ đồng nghĩa trong bộ từ)",
                        "",
                        "",
                        deckWordsLower.contains(dbSyn)
                ));
            }
        }

        return new SynonymEvaluateResponse(
                "AI_GEMINI",
                evaluatedList,
                missedList,
                evaluatedList.size(),
                0, // Will be computed by caller
                0,
                0,
                null
        );
    }

    private SynonymEvaluateResponse buildFallbackResponse(
            String rootWord,
            Vocabulary vocab,
            List<String> userAnswers,
            List<VocabularySynonym> dbSynonyms,
            Set<String> dbSynonymSet,
            Set<String> deckWordsLower
    ) {
        List<EvaluatedWordDto> evaluatedList = new ArrayList<>();
        Set<String> userSubmittedLower = new HashSet<>();

        for (String ans : userAnswers) {
            String lower = ans.toLowerCase();
            userSubmittedLower.add(lower);
            boolean inDb = dbSynonymSet.contains(lower);
            evaluatedList.add(new EvaluatedWordDto(
                    ans,
                    inDb,
                    inDb ? "DATABASE" : "FALLBACK",
                    inDb ? "(Từ đồng nghĩa có sẵn)" : "",
                    inDb ? "Khớp chính xác với danh sách từ đồng nghĩa lưu trong hệ thống."
                         : "Không tìm thấy trong cơ sở dữ liệu có sẵn. (Gemini AI hiện không khả dụng để phân tích)"
            ));
        }

        List<MissedSynonymDto> missedList = new ArrayList<>();
        for (VocabularySynonym s : dbSynonyms) {
            String word = s.getSynonym().trim();
            if (!userSubmittedLower.contains(word.toLowerCase())) {
                missedList.add(new MissedSynonymDto(
                        word,
                        "",
                        vocab.getWordType() != null ? vocab.getWordType() : "",
                        "(Từ đồng nghĩa đã lưu)",
                        "",
                        "",
                        deckWordsLower.contains(word.toLowerCase())
                ));
            }
        }

        String warning = "Gemini AI hiện không khả dụng. Hệ thống đang đối chiếu với kho từ đồng nghĩa có sẵn trong cơ sở dữ liệu, chưa thể phân tích ngữ nghĩa chuyên sâu.";

        return new SynonymEvaluateResponse(
                "LOCAL_FALLBACK",
                evaluatedList,
                missedList,
                evaluatedList.size(),
                0,
                0,
                0,
                warning
        );
    }

    private String buildGeminiPrompt(
            String rootWord,
            Vocabulary vocab,
            List<String> userAnswers,
            Set<String> dbSynonymSet
    ) {
        String pos = vocab.getWordType() != null ? vocab.getWordType() : "Unknown";
        String meaning = vocab.getMeaning() != null ? vocab.getMeaning() : "";

        return """
        You are an expert English linguist and lexicographer.
        Analyze the learner's submitted synonyms for the given root word.
        
        Root Word: "%s"
        Part of Speech: "%s"
        Vietnamese Meaning: "%s"
        Pre-existing Synonyms in DB: %s
        Learner Submitted Answers: %s
        
        CRITICAL EVALUATION RULES:
        1. Evaluate each item in "Learner Submitted Answers":
           - Set "isValid": true ONLY IF the word is a genuine synonym that shares the same part of speech and can replace the root word in context. Close near-synonyms with overlapping semantics are acceptable.
           - Set "isValid": false if the word is merely topically associated (e.g. root "doctor" -> "hospital", "medicine", "nurse" are NOT synonyms and MUST be rejected; root "car" -> "road", "engine" MUST be rejected).
           - Set "isValid": false if part of speech fundamentally clashes.
           - In "meaning": provide the Vietnamese meaning of the submitted word.
           - In "explanation": provide a brief Vietnamese explanation (1-2 sentences). If rejected, state clearly why it is not a true synonym.
        
        2. Supply "missedSynonyms":
           - Provide 3 to 6 common, high-yield synonyms (useful for TOEIC 500-900 / CEFR A2-C1, practical everyday English) that the learner DID NOT provide.
           - DO NOT supply rare, archaic, or obscure terms.
           - For each missed synonym include:
             * "word": the English synonym
             * "ipa": IPA pronunciation (e.g. /.../)
             * "pos": part of speech (noun, verb, adjective, adverb)
             * "meaning": Vietnamese meaning
             * "example": an English sentence illustrating usage
             * "exampleVi": Vietnamese translation of the example sentence
        
        OUTPUT ONLY JSON in this exact structure:
        {
          "evaluatedWords": [
            {
              "word": "string",
              "isValid": true,
              "meaning": "string",
              "explanation": "string"
            }
          ],
          "missedSynonyms": [
            {
              "word": "string",
              "ipa": "string",
              "pos": "string",
              "meaning": "string",
              "example": "string",
              "exampleVi": "string"
            }
          ]
        }
        """.formatted(
                rootWord,
                pos,
                meaning,
                dbSynonymSet.toString(),
                userAnswers.toString()
        );
    }

    private void updateProgressOnChallenge(Long userId, Long vocabId, int validCount, int invalidCount) {
        try {
            Optional<StudyProgress> opt = studyProgressRepository.findByUserIdAndVocabularyId(userId, vocabId);
            StudyProgress sp = opt.orElseGet(() -> new StudyProgress(userId, vocabId));

            if (validCount > 0) {
                sp.setCorrectCount(sp.getCorrectCount() + 1);
                sp.setCurrentStreak(sp.getCurrentStreak() + 1);
            } else if (invalidCount > 0) {
                sp.setWrongCount(sp.getWrongCount() + 1);
                sp.setCurrentStreak(0);
            }
            sp.setLastReviewedAt(Instant.now());
            studyProgressRepository.save(sp);
        } catch (Exception e) {
            log.warn("Failed to update StudyProgress: {}", e.getMessage());
        }
    }

    /**
     * Quick-adds a missed synonym as a new card into the current deck.
     * Prevents duplicate terms in the same deck (case-insensitive).
     */
    @Transactional
    public Map<String, Object> quickAddCardToDeck(Long userId, QuickAddCardRequest request) {
        VocabularySet deck = vocabularySetRepository.findByIdAndUserId(request.getDeckId(), userId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy bộ từ với id: " + request.getDeckId()));

        String term = request.getTerm().trim();
        List<Vocabulary> existingVocabs = vocabularyRepository.findByDeckId(request.getDeckId());

        boolean isDuplicate = existingVocabs.stream()
                .anyMatch(v -> v.getWord() != null && v.getWord().trim().equalsIgnoreCase(term));

        if (isDuplicate) {
            return Map.of(
                    "status", "DUPLICATE",
                    "message", "Từ \"" + term + "\" đã có trong bộ từ này.",
                    "term", term
            );
        }

        Vocabulary newVocab = new Vocabulary(
                term,
                request.getMeaning().trim(),
                request.getPartOfSpeech() != null ? request.getPartOfSpeech().trim() : null,
                request.getPronunciation() != null ? request.getPronunciation().trim() : null,
                request.getExampleSentence() != null ? request.getExampleSentence().trim() : null
        );
        Vocabulary saved = vocabularyRepository.save(newVocab);
        vocabularySetItemRepository.save(new VocabularySetItem(deck.getId(), saved.getId()));

        return Map.of(
                "status", "ADDED",
                "message", "Đã thêm \"" + term + "\" vào bộ từ thành công!",
                "vocabularyId", saved.getId(),
                "term", saved.getWord()
        );
    }

    /**
     * Retrieves aggregated stats for user's synonym challenges.
     */
    @Transactional(readOnly = true)
    public SynonymStatsDto getSynonymStats(Long userId, Long deckId) {
        List<SynonymChallengeHistory> histories;
        if (deckId != null && deckId > 0) {
            histories = historyRepository.findByUserIdAndDeckIdOrderByCreatedAtDesc(userId, deckId);
        } else {
            histories = historyRepository.findByUserIdOrderByCreatedAtDesc(userId);
        }

        int totalChallenges = histories.size();
        int totalSubmitted = 0;
        int totalValid = 0;
        int totalInvalid = 0;

        for (SynonymChallengeHistory h : histories) {
            totalSubmitted += h.getSubmittedCount();
            totalValid += h.getValidCount();
            totalInvalid += h.getInvalidCount();
        }

        double accuracyRate = totalSubmitted > 0 ? ((double) totalValid / totalSubmitted) * 100.0 : 0.0;
        accuracyRate = Math.round(accuracyRate * 10.0) / 10.0;

        return new SynonymStatsDto(totalChallenges, totalSubmitted, totalValid, totalInvalid, accuracyRate);
    }
}
