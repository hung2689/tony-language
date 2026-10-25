package com.languagelearning.backend.study.story;

import com.languagelearning.backend.common.exception.ValidationException;
import com.languagelearning.backend.deck.dto.DeckDetailResponse;
import com.languagelearning.backend.deck.service.DeckService;
import com.languagelearning.backend.term.dto.TermCardDto;
import org.springframework.stereotype.Service;

import java.util.*;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Service
public class ContextStoryService {

    private final DeckService deckService;

    private static final List<StoryTemplate> VERB_TEMPLATES = List.of(
            new StoryTemplate(
                    "During our daily journey, we decided to %s with great focus and dedication.",
                    "Trong hành trình mỗi ngày, chúng tôi quyết định (%s) với sự tập trung và nhiệt huyết."
            ),
            new StoryTemplate(
                    "To overcome the upcoming challenge, everyone worked together to %s effectively.",
                    "Để vượt qua thử thách sắp tới, mọi người đã cùng nhau (%s) một cách hiệu quả."
            ),
            new StoryTemplate(
                    "Our mentor encouraged us to %s whenever new opportunities arise.",
                    "Người hướng dẫn khuyến khích chúng tôi (%s) bất cứ khi nào cơ hội mới xuất hiện."
            ),
            new StoryTemplate(
                    "Step by step, the team learned how to %s to achieve higher performance.",
                    "Từng bước một, toàn đội đã học cách (%s) để đạt hiệu suất cao hơn."
            )
    );

    private static final List<StoryTemplate> ADJ_TEMPLATES = List.of(
            new StoryTemplate(
                    "Everyone in the team was impressed by such a %s approach to solving the challenge.",
                    "Mọi người trong đội đều ấn tượng bởi cách tiếp cận (%s) để giải quyết thử thách."
            ),
            new StoryTemplate(
                    "We discovered that cultivating a %s mindset opened up many unexpected possibilities.",
                    "Chúng tôi phát hiện ra rằng việc nuôi dưỡng tư duy (%s) đã mở ra nhiều cơ hội bất ngờ."
            ),
            new StoryTemplate(
                    "It was truly a %s experience that strengthened our confidence in the path ahead.",
                    "Đó thực sự là một trải nghiệm (%s) giúp củng cố niềm tin vào con đường phía trước."
            ),
            new StoryTemplate(
                    "The atmosphere became remarkably %s as positive results began to show.",
                    "Bầu không khí trở nên vô cùng (%s) khi những kết quả khả quan bắt đầu xuất hiện."
            )
    );

    private static final List<StoryTemplate> ADV_TEMPLATES = List.of(
            new StoryTemplate(
                    "The speaker expressed the core vision %s, inspiring everyone in the room.",
                    "Diễn giả đã truyền đạt tầm nhìn cốt lõi (%s), truyền cảm hứng cho mọi người trong phòng."
            ),
            new StoryTemplate(
                    "With persistence and passion, they worked %s to reach their long-term milestones.",
                    "Với sự kiên trì và đam mê, họ đã làm việc (%s) để đạt được các cột mốc dài hạn."
            ),
            new StoryTemplate(
                    "The instructions were delivered %s, making the complex concepts crystal clear.",
                    "Các hướng dẫn được trình bày (%s), giúp các khái niệm phức tạp trở nên sáng rõ."
            ),
            new StoryTemplate(
                    "Everything progressed %s once the core principles were understood.",
                    "Mọi thứ tiến triển (%s) một khi các nguyên tắc cốt lõi đã được thấu hiểu."
            )
    );

    private static final List<StoryTemplate> GENERAL_TEMPLATES = List.of(
            new StoryTemplate(
                    "We realized that this %s plays a vital role in our ongoing mission.",
                    "Chúng tôi nhận ra rằng (%s) này đóng vai trò thiết yếu trong sứ mệnh của mình."
            ),
            new StoryTemplate(
                    "Through consistent practice, understanding the %s became second nature to us.",
                    "Thông qua luyện tập đều đặn, việc hiểu rõ (%s) đã trở thành phản xạ tự nhiên của chúng tôi."
            ),
            new StoryTemplate(
                    "The team held an in-depth session exploring how the %s impacts real-world success.",
                    "Cả nhóm đã có một buổi thảo luận chuyên sâu về việc (%s) tác động ra sao đến thành công thực tế."
            ),
            new StoryTemplate(
                    "Gaining deep mastery over this %s laid the solid groundwork for all future achievements.",
                    "Làm chủ được (%s) này đã đặt nền móng vững chắc cho mọi thành tựu trong tương lai."
            )
    );

    public ContextStoryService(DeckService deckService) {
        this.deckService = deckService;
    }

    public ContextStoryDto generateStory(Long deckId) {
        DeckDetailResponse deck = deckService.getDeck(deckId);
        List<TermCardDto> cards = deck.getCards();
        if (cards == null || cards.isEmpty()) {
            throw new ValidationException("Bộ từ vựng cần có ít nhất 1 thẻ để tạo đoạn văn ngữ cảnh.");
        }
        return generateStoryFromCards(deckId, deck.getName(), cards);
    }

    public ContextStoryDto generateStoryFromCards(Long deckId, String deckTitle, List<TermCardDto> cards) {
        if (cards == null || cards.isEmpty()) {
            throw new ValidationException("Danh sách từ vựng trống.");
        }

        // Limit to 10 cards per story session for optimal cognitive load, or use all if <= 10
        List<TermCardDto> selectedCards = new ArrayList<>(cards);
        if (selectedCards.size() > 10) {
            Collections.shuffle(selectedCards, new Random());
            selectedCards = selectedCards.subList(0, 10);
        }

        List<StoryParagraphDto> paragraphs = new ArrayList<>();
        List<StoryBlankDto> allBlanks = new ArrayList<>();

        // Group into paragraphs of 2 - 4 cards each
        int chunkSize = selectedCards.size() <= 4 ? selectedCards.size() : Math.min(4, (int) Math.ceil(selectedCards.size() / 2.0));
        int blankIndex = 0;
        int paragraphNum = 0;

        for (int i = 0; i < selectedCards.size(); i += chunkSize) {
            int end = Math.min(i + chunkSize, selectedCards.size());
            List<TermCardDto> chunk = selectedCards.subList(i, end);

            StringBuilder enText = new StringBuilder();
            StringBuilder viText = new StringBuilder();
            List<StoryBlankDto> paragraphBlanks = new ArrayList<>();

            for (int j = 0; j < chunk.size(); j++) {
                TermCardDto card = chunk.get(j);
                StoryBlankDto blank = new StoryBlankDto(
                        blankIndex,
                        card.getId(),
                        card.getTerm(),
                        card.getDefinition(),
                        card.getPartOfSpeech(),
                        card.getExample(),
                        card.getSynonyms() != null ? new ArrayList<>(card.getSynonyms()) : new ArrayList<>()
                );

                // Build natural contextual sentence
                String termPlaceholder = "{{" + blankIndex + "}}";
                String sentenceEn;
                String sentenceVi;

                MatchResultInfo matchResult = findAndReplaceTerm(card.getExample(), card.getTerm(), termPlaceholder);

                if (matchResult.found) {
                    sentenceEn = matchResult.replacedText;
                    sentenceVi = "Ví dụ: " + card.getExample() + " (Nghĩa: " + card.getDefinition() + ")";
                    blank.setMatchedWord(matchResult.matchedWord != null ? matchResult.matchedWord : card.getTerm());

                    // If an inflected form was matched in the example, add it as an accepted synonym
                    if (matchResult.matchedWord != null && !matchResult.matchedWord.equalsIgnoreCase(card.getTerm())) {
                        String matchedLower = matchResult.matchedWord.toLowerCase();
                        if (!blank.getSynonyms().contains(matchedLower)) {
                            blank.getSynonyms().add(matchedLower);
                        }
                    }
                } else {
                    // Compose contextual storytelling patterns from template pool
                    StoryTemplate template = selectStoryTemplate(card, blankIndex);
                    sentenceEn = template.enText;
                    sentenceVi = template.viText;
                    blank.setMatchedWord(card.getTerm());
                }

                // If term starts with "to ", also register core verb as accepted synonym
                String cleanTerm = card.getTerm() != null ? card.getTerm().trim() : "";
                if (cleanTerm.toLowerCase().startsWith("to ") && cleanTerm.length() > 3) {
                    String core = cleanTerm.substring(3).trim().toLowerCase();
                    if (!blank.getSynonyms().contains(core)) {
                        blank.getSynonyms().add(core);
                    }
                }

                paragraphBlanks.add(blank);
                allBlanks.add(blank);

                if (enText.length() > 0) {
                    enText.append(" ");
                }
                enText.append(sentenceEn);

                if (viText.length() > 0) {
                    viText.append(" ");
                }
                viText.append(sentenceVi);

                blankIndex++;
            }

            paragraphs.add(new StoryParagraphDto(paragraphNum++, enText.toString(), viText.toString(), paragraphBlanks));
        }

        String storyTitle = (deckTitle != null && !deckTitle.trim().isEmpty())
                ? "Câu chuyện ngữ cảnh: " + deckTitle
                : "Hành trình khám phá từ vựng";

        String storyId = "story-" + (deckId != null ? deckId : "custom") + "-" + System.currentTimeMillis();

        return new ContextStoryDto(storyId, deckId, storyTitle, paragraphs, allBlanks.size());
    }

    public static class MatchResultInfo {
        public final boolean found;
        public final String replacedText;
        public final String matchedWord;

        public MatchResultInfo(boolean found, String replacedText, String matchedWord) {
            this.found = found;
            this.replacedText = replacedText;
            this.matchedWord = matchedWord;
        }
    }

    /**
     * Safely locates the target term or its inflections inside the example sentence
     * using word boundaries (\b) to prevent substring collisions (e.g. 'cat' in 'application').
     * Completely replaces the entire inflected word so no trailing letters (e.g. 'd', 'ing') remain.
     */
    public MatchResultInfo findAndReplaceTerm(String example, String term, String placeholder) {
        if (example == null || term == null || term.trim().isEmpty()) {
            return new MatchResultInfo(false, example, null);
        }

        String cleanTerm = term.trim();
        List<String> patterns = new ArrayList<>();

        // 1. Exact whole word match
        patterns.add("(?i)\\b" + Pattern.quote(cleanTerm) + "\\b");

        // 2. Extract core term if particle prefix is present (e.g. "to explore", "a novel")
        String coreTerm = cleanTerm;
        String lowerTerm = cleanTerm.toLowerCase();
        if (lowerTerm.startsWith("to ") && cleanTerm.length() > 3) {
            coreTerm = cleanTerm.substring(3).trim();
            patterns.add("(?i)\\b" + Pattern.quote(coreTerm) + "\\b");
        } else if (lowerTerm.startsWith("a ") && cleanTerm.length() > 2) {
            coreTerm = cleanTerm.substring(2).trim();
            patterns.add("(?i)\\b" + Pattern.quote(coreTerm) + "\\b");
        } else if (lowerTerm.startsWith("an ") && cleanTerm.length() > 3) {
            coreTerm = cleanTerm.substring(3).trim();
            patterns.add("(?i)\\b" + Pattern.quote(coreTerm) + "\\b");
        } else if (lowerTerm.startsWith("the ") && cleanTerm.length() > 4) {
            coreTerm = cleanTerm.substring(4).trim();
            patterns.add("(?i)\\b" + Pattern.quote(coreTerm) + "\\b");
        }

        // 3. Morphological inflections (using coreTerm)
        if (!coreTerm.contains(" ") && coreTerm.length() >= 3) {
            int len = coreTerm.length();
            char lastChar = Character.toLowerCase(coreTerm.charAt(len - 1));

            if (lastChar == 'e') {
                String root = coreTerm.substring(0, len - 1);
                // e.g. illuminate -> illuminated, illuminating, illuminates
                patterns.add("(?i)\\b" + Pattern.quote(root) + "(ing|ed|es|e)\\b");
                patterns.add("(?i)\\b" + Pattern.quote(coreTerm) + "(s|d)?\\b");
            } else if (lastChar == 'y') {
                String root = coreTerm.substring(0, len - 1);
                // e.g. study -> studied, studies, studying
                patterns.add("(?i)\\b" + Pattern.quote(root) + "(ied|ies)\\b");
                patterns.add("(?i)\\b" + Pattern.quote(coreTerm) + "(ing)?\\b");
            } else {
                // Double consonant (e.g. run -> running, stop -> stopped)
                patterns.add("(?i)\\b" + Pattern.quote(coreTerm) + lastChar + "(ing|ed)\\b");
                // Standard suffixes (e.g. resilient -> resiliently, card -> cards)
                patterns.add("(?i)\\b" + Pattern.quote(coreTerm) + "(s|es|ed|ing|ly)?\\b");
            }
        }

        for (String regex : patterns) {
            Pattern pattern = Pattern.compile(regex);
            Matcher matcher = pattern.matcher(example);
            if (matcher.find()) {
                String matchedWord = matcher.group();
                String replaced = matcher.replaceFirst(Matcher.quoteReplacement(placeholder));
                return new MatchResultInfo(true, replaced, matchedWord);
            }
        }

        return new MatchResultInfo(false, example, null);
    }

    private static class StoryTemplate {
        String enText;
        String viText;

        StoryTemplate(String enText, String viText) {
            this.enText = enText;
            this.viText = viText;
        }
    }

    private StoryTemplate selectStoryTemplate(TermCardDto card, int blankIndex) {
        String placeholder = "{{" + blankIndex + "}}";
        String pos = card.getPartOfSpeech() != null ? card.getPartOfSpeech().toLowerCase() : "";
        String def = card.getDefinition() != null ? card.getDefinition() : "";

        List<StoryTemplate> pool;
        if (pos.contains("verb") || pos.contains("động từ") || pos.equals("v")) {
            pool = VERB_TEMPLATES;
        } else if (pos.contains("adj") || pos.contains("tính từ")) {
            pool = ADJ_TEMPLATES;
        } else if (pos.contains("adv") || pos.contains("trạng từ")) {
            pool = ADV_TEMPLATES;
        } else {
            pool = GENERAL_TEMPLATES;
        }

        StoryTemplate tmpl = pool.get(blankIndex % pool.size());
        return new StoryTemplate(
                String.format(tmpl.enText, placeholder),
                String.format(tmpl.viText, def)
        );
    }
}
