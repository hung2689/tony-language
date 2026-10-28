package com.languagelearning.backend.study.story;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.languagelearning.backend.common.exception.ValidationException;
import com.languagelearning.backend.deck.dto.DeckDetailResponse;
import com.languagelearning.backend.deck.service.DeckService;
import com.languagelearning.backend.study.sentence.gemini.GeminiSentenceService;
import com.languagelearning.backend.term.dto.TermCardDto;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.*;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Service
public class ContextStoryService {

    private static final Logger log = LoggerFactory.getLogger(ContextStoryService.class);

    private final DeckService deckService;
    private final GeminiSentenceService geminiSentenceService;
    private final ObjectMapper objectMapper = new ObjectMapper();

    @Autowired
    public ContextStoryService(DeckService deckService, GeminiSentenceService geminiSentenceService) {
        this.deckService = deckService;
        this.geminiSentenceService = geminiSentenceService;
    }

    public ContextStoryService(DeckService deckService) {
        this(deckService, null);
    }

    public ContextStoryDto generateStory(Long deckId) {
        return generateStory(deckId, null);
    }

    public ContextStoryDto generateStory(Long deckId, String customApiKey) {
        DeckDetailResponse deck = deckService.getDeck(deckId);
        List<TermCardDto> cards = deck.getCards();
        if (cards == null || cards.isEmpty()) {
            throw new ValidationException("Bộ từ vựng cần có ít nhất 1 thẻ để tạo đoạn văn ngữ cảnh.");
        }
        return generateStoryFromCards(deckId, deck.getName(), cards, customApiKey);
    }

    public ContextStoryDto generateStoryFromCards(Long deckId, String deckTitle, List<TermCardDto> cards) {
        return generateStoryFromCards(deckId, deckTitle, cards, null);
    }

    public ContextStoryDto generateStoryFromCards(Long deckId, String deckTitle, List<TermCardDto> cards, String customApiKey) {
        if (cards == null || cards.isEmpty()) {
            throw new ValidationException("Danh sách từ vựng trống.");
        }

        if (geminiSentenceService == null || !geminiSentenceService.isAvailable(customApiKey)) {
            throw new ValidationException("Dịch vụ AI Gemini hiện chưa khả dụng hoặc chưa có API Key. Vui lòng thiết lập Gemini API Key để tạo đoạn văn ngữ cảnh.");
        }

        ContextStoryDto aiStory = generateStoryWithAi(deckId, deckTitle, cards, customApiKey);
        if (aiStory != null && aiStory.getParagraphs() != null && !aiStory.getParagraphs().isEmpty()) {
            return aiStory;
        }

        throw new ValidationException("Không thể tạo đoạn văn bằng AI Gemini lúc này (Timeout hoặc phản hồi không hợp lệ). Vui lòng nhấn 'Tạo đoạn mới' để thử lại.");
    }

    /**
     * Generates cohesive, multi-topic, natural everyday paragraphs using Gemini LLM.
     */
    private ContextStoryDto generateStoryWithAi(Long deckId, String deckTitle, List<TermCardDto> cards, String customApiKey) {
        try {
            StringBuilder vocabListBuilder = new StringBuilder();
            Map<Long, TermCardDto> cardById = new HashMap<>();
            Map<String, TermCardDto> cardByLowerTerm = new HashMap<>();

            for (TermCardDto c : cards) {
                if (c.getId() != null) cardById.put(c.getId(), c);
                if (c.getTerm() != null) cardByLowerTerm.put(c.getTerm().trim().toLowerCase(), c);

                vocabListBuilder.append(String.format(
                        "- Card ID: %d, Word: '%s', Part of speech: '%s', Meaning: '%s'%s%n",
                        c.getId() != null ? c.getId() : 0,
                        c.getTerm(),
                        c.getPartOfSpeech() != null ? c.getPartOfSpeech() : "",
                        c.getDefinition() != null ? c.getDefinition() : "",
                        (c.getExample() != null && !c.getExample().isBlank()) ? ", Example hint: '" + c.getExample().trim() + "'" : ""
                ));
            }

            String prompt = """
                    You are an expert bilingual English-Vietnamese language educator and narrative writer specializing in natural, conversational English (CEFR A2-B1 level).
                    
                    You are given vocabulary cards from a learner's study deck:
                    Deck Name: "%s"
                    Vocabulary List:
                    %s
                    
                    TASK:
                    Create 1 to 3 natural, engaging, and meaningful English paragraphs that help learners understand and practice these words in authentic everyday contexts.
                    
                    CRITICAL SELECTION & WRITING PRINCIPLES:
                    1. DO NOT FORCE ALL WORDS INTO A SINGLE PARAGRAPH:
                       - Carefully evaluate the semantic relationships between words.
                       - Group words by coherent everyday topics (e.g. Student life & studying, Office work & colleagues, Daily routines & home, Travel & transportation, Food & dining, Hobbies & sports).
                       - If the words naturally span MULTIPLE distinct topics, generate MULTIPLE independent paragraphs (e.g., Paragraph 1 about school life, Paragraph 2 about work).
                       - If the deck only has 3-5 related words, generate ONE concise, cohesive paragraph.
                       - If a word does NOT fit naturally into any paragraph without making the story awkward, bizarre, or forced, DO NOT USE IT. Leave it out and list it in "unusedWords".
                       - PRIORITIZE QUALITY OVER QUANTITY: Never sacrifice natural English just to achieve 100%% word coverage.
                    
                    2. AUTHENTIC, EVERYDAY NARRATIVE (A2-B1 LEVEL):
                       - Each paragraph must communicate a coherent story, clear experience, or realistic everyday situation.
                       - Clear topic, consistent setting, and logical progression from beginning to end.
                       - Write clear, fluent sentences of moderate length. Avoid stiff, robotic, or overly academic prose.
                    
                    3. VOCABULARY INSERTION & BLANKS:
                       - Use target words accurately in their natural collocations.
                       - Target words can be grammatically inflected when needed in the sentence (e.g. "run" -> "running", "study" -> "studied", "resilient" -> "resilient").
                       - In each paragraph's "text", wherever a target word appears, insert a placeholder "{{0}}", "{{1}}", "{{2}}", etc.
                       - The numbering of blanks MUST be strictly sequential (0, 1, 2, 3...) across ALL paragraphs from first to last!
                       - For each blank, provide:
                         * "cardId": (number, matching Card ID)
                         * "term": (string, original base word)
                         * "matchedWord": (string, the exact inflected word that was used in the sentence before replacement)
                         * "contextNote": (string, brief tip in Vietnamese explaining how the word was used)
                    
                    OUTPUT FORMAT:
                    Return a JSON object with this exact structure:
                    {
                      "title": "Overall story or collection title in Vietnamese (e.g. 'Câu chuyện ngữ cảnh: Cuộc sống thường ngày')",
                      "paragraphs": [
                        {
                          "title": "Short English title for this paragraph (e.g. 'A Busy Morning at the Office')",
                          "topic": "Topic in Vietnamese (e.g. 'Công việc văn phòng & Đồng nghiệp')",
                          "text": "English paragraph text with {{index}} placeholders (e.g. 'Yesterday, Sarah had an important {{0}} with her {{1}}.')",
                          "translation": "Natural, fluent Vietnamese translation of the paragraph",
                          "blanks": [
                            {
                              "cardId": 101,
                              "term": "meeting",
                              "matchedWord": "meeting",
                              "contextNote": "Cuộc họp quan trọng tại nơi làm việc"
                            }
                          ]
                        }
                      ],
                      "usedWords": ["meeting", "colleague"],
                      "unusedWords": ["airport"]
                    }
                    """.formatted(
                    deckTitle != null ? deckTitle : "Học từ vựng",
                    vocabListBuilder.toString()
            );

            String rawJson = geminiSentenceService.generateContent(prompt, customApiKey);
            if (rawJson == null || rawJson.isBlank()) {
                return null;
            }

            JsonNode rootNode = objectMapper.readTree(rawJson);
            if (!rootNode.has("paragraphs") || !rootNode.get("paragraphs").isArray() || rootNode.get("paragraphs").isEmpty()) {
                log.warn("Gemini story generation output missing paragraphs array: {}", rawJson);
                return null;
            }

            String overallTitle = rootNode.has("title") && !rootNode.get("title").asText().isBlank()
                    ? rootNode.get("title").asText()
                    : "Câu chuyện ngữ cảnh: " + (deckTitle != null ? deckTitle : "Từ vựng");

            List<StoryParagraphDto> paragraphs = new ArrayList<>();
            List<StoryBlankDto> allBlanks = new ArrayList<>();
            Set<String> usedWordsSet = new LinkedHashSet<>();

            int globalBlankIndex = 0;
            int paragraphNum = 0;

            for (JsonNode pNode : rootNode.get("paragraphs")) {
                String pTitle = pNode.has("title") ? pNode.get("title").asText() : "Đoạn " + (paragraphNum + 1);
                String pTopic = pNode.has("topic") ? pNode.get("topic").asText() : null;
                String rawText = pNode.has("text") ? pNode.get("text").asText() : "";
                String translation = pNode.has("translation") ? pNode.get("translation").asText() : "";

                List<StoryBlankDto> paragraphBlanks = new ArrayList<>();
                List<String> paraUsedWords = new ArrayList<>();

                // Map of local blank index (or match order) to global index
                Map<Integer, Integer> localToGlobalIndex = new HashMap<>();

                if (pNode.has("blanks") && pNode.get("blanks").isArray()) {
                    int localIdx = 0;
                    for (JsonNode bNode : pNode.get("blanks")) {
                        Long cardId = bNode.has("cardId") ? bNode.get("cardId").asLong() : null;
                        String term = bNode.has("term") ? bNode.get("term").asText().trim() : "";
                        String matchedWord = bNode.has("matchedWord") ? bNode.get("matchedWord").asText().trim() : term;
                        String contextNote = bNode.has("contextNote") ? bNode.get("contextNote").asText() : null;

                        TermCardDto card = null;
                        if (cardId != null && cardById.containsKey(cardId)) {
                            card = cardById.get(cardId);
                        } else if (!term.isEmpty() && cardByLowerTerm.containsKey(term.toLowerCase())) {
                            card = cardByLowerTerm.get(term.toLowerCase());
                        } else {
                            // Find closest by word name
                            for (TermCardDto c : cards) {
                                if (c.getTerm() != null && c.getTerm().equalsIgnoreCase(term)) {
                                    card = c;
                                    break;
                                }
                            }
                        }

                        Long finalCardId = card != null ? card.getId() : cardId;
                        String finalTerm = card != null ? card.getTerm() : term;
                        String finalDef = card != null ? card.getDefinition() : "";
                        String finalPos = card != null ? card.getPartOfSpeech() : "";
                        String finalEx = card != null ? card.getExample() : "";

                        List<String> synonyms = new ArrayList<>();
                        if (card != null && card.getSynonyms() != null) {
                            synonyms.addAll(card.getSynonyms());
                        }

                        // Ensure base term and inflected word are included in synonyms
                        String termLower = finalTerm.toLowerCase();
                        String matchedLower = matchedWord.toLowerCase();
                        if (!synonyms.contains(termLower)) synonyms.add(termLower);
                        if (!synonyms.contains(matchedLower)) synonyms.add(matchedLower);

                        if (termLower.startsWith("to ") && termLower.length() > 3) {
                            String core = termLower.substring(3).trim();
                            if (!synonyms.contains(core)) synonyms.add(core);
                        }

                        StoryBlankDto blank = new StoryBlankDto(
                                globalBlankIndex,
                                finalCardId,
                                finalTerm,
                                finalDef,
                                finalPos,
                                finalEx,
                                synonyms,
                                matchedWord,
                                contextNote
                        );

                        paragraphBlanks.add(blank);
                        allBlanks.add(blank);
                        paraUsedWords.add(finalTerm);
                        usedWordsSet.add(finalTerm);

                        localToGlobalIndex.put(localIdx++, globalBlankIndex);
                        globalBlankIndex++;
                    }
                }

                // Normalize placeholders in rawText:
                // If rawText already has {{k}}, check if they need re-indexing to match globalBlankIndex
                String normalizedText = normalizePlaceholders(rawText, localToGlobalIndex, paragraphBlanks);

                StoryParagraphDto paragraphDto = new StoryParagraphDto(
                        paragraphNum++,
                        pTitle,
                        pTopic,
                        normalizedText,
                        translation,
                        paragraphBlanks,
                        paraUsedWords
                );
                paragraphs.add(paragraphDto);
            }

            // Compute unused words
            List<String> unusedWords = new ArrayList<>();
            for (TermCardDto c : cards) {
                if (c.getTerm() != null && !usedWordsSet.contains(c.getTerm())) {
                    unusedWords.add(c.getTerm());
                }
            }

            String storyId = "ai-story-" + (deckId != null ? deckId : "custom") + "-" + System.currentTimeMillis();
            log.info("Gemini successfully generated context story with {} paragraphs and {} blanks",
                    paragraphs.size(), allBlanks.size());

            return new ContextStoryDto(
                    storyId,
                    deckId,
                    overallTitle,
                    paragraphs,
                    allBlanks.size(),
                    new ArrayList<>(usedWordsSet),
                    unusedWords
            );

        } catch (Exception e) {
            log.warn("Gemini generateStoryWithAi failed, fallback to procedural synthesis: {}", e.getMessage());
            return null;
        }
    }

    /**
     * Ensures placeholders in the paragraph text match global blank indices.
     */
    private String normalizePlaceholders(String text, Map<Integer, Integer> localToGlobalIndex, List<StoryBlankDto> paragraphBlanks) {
        if (text == null || text.isBlank()) return "";
        if (paragraphBlanks.isEmpty()) return text;

        // If placeholders already exist, check if they are local (0, 1, 2...) or global
        Matcher matcher = Pattern.compile("\\{\\{(\\d+)\\}\\}").matcher(text);
        StringBuffer sb = new StringBuffer();
        int foundCount = 0;

        while (matcher.find()) {
            int originalIndex = Integer.parseInt(matcher.group(1));
            // If localToGlobalIndex has a mapping for this position
            int targetIndex;
            if (localToGlobalIndex.containsKey(foundCount)) {
                targetIndex = localToGlobalIndex.get(foundCount);
            } else if (localToGlobalIndex.containsKey(originalIndex)) {
                targetIndex = localToGlobalIndex.get(originalIndex);
            } else {
                targetIndex = originalIndex;
            }
            matcher.appendReplacement(sb, "{{" + targetIndex + "}}");
            foundCount++;
        }
        matcher.appendTail(sb);
        return sb.toString();
    }
}
