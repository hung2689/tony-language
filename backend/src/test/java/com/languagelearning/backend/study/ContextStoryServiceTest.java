package com.languagelearning.backend.study;

import com.languagelearning.backend.common.exception.ValidationException;
import com.languagelearning.backend.deck.dto.DeckDetailResponse;
import com.languagelearning.backend.deck.service.DeckService;
import com.languagelearning.backend.study.sentence.gemini.GeminiSentenceService;
import com.languagelearning.backend.study.story.ContextStoryDto;
import com.languagelearning.backend.study.story.ContextStoryService;
import com.languagelearning.backend.term.dto.TermCardDto;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.ArrayList;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.nullable;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class ContextStoryServiceTest {

    @Mock
    private DeckService deckService;

    @Mock
    private GeminiSentenceService geminiSentenceService;

    @InjectMocks
    private ContextStoryService contextStoryService;

    @Test
    @DisplayName("Ném lỗi khi bộ từ trống không có thẻ nào")
    void shouldThrowExceptionWhenDeckIsEmpty() {
        DeckDetailResponse emptyDeck = new DeckDetailResponse();
        emptyDeck.setId(1L);
        emptyDeck.setName("Bộ từ trống");
        emptyDeck.setCards(new ArrayList<>());

        when(deckService.getDeck(1L)).thenReturn(emptyDeck);

        assertThrows(ValidationException.class, () -> contextStoryService.generateStory(1L));
    }

    @Test
    @DisplayName("Ném lỗi khi Gemini AI không khả dụng hoặc chưa có API Key")
    void shouldThrowExceptionWhenGeminiUnavailable() {
        List<TermCardDto> cards = List.of(
                new TermCardDto(1L, "student", "sinh viên", null, "noun", null, null)
        );

        DeckDetailResponse deck = new DeckDetailResponse();
        deck.setId(2L);
        deck.setName("Bộ từ 1 thẻ");
        deck.setCards(cards);

        when(deckService.getDeck(2L)).thenReturn(deck);
        when(geminiSentenceService.isAvailable(null)).thenReturn(false);

        ValidationException ex = assertThrows(ValidationException.class, () -> contextStoryService.generateStory(2L));
        assertTrue(ex.getMessage().contains("Gemini"));
    }

    @Test
    @DisplayName("Ném lỗi khi AI trả về kết quả rỗng (không dùng heuristic fallback)")
    void shouldThrowExceptionWhenAiFailsOrTimesOut() {
        List<TermCardDto> cards = List.of(
                new TermCardDto(1L, "friend", "bạn bè", null, "noun", "She is my best friend.", null)
        );

        DeckDetailResponse deck = new DeckDetailResponse();
        deck.setId(600L);
        deck.setName("Bạn bè");
        deck.setCards(cards);

        when(deckService.getDeck(600L)).thenReturn(deck);
        when(geminiSentenceService.isAvailable(null)).thenReturn(true);
        when(geminiSentenceService.generateContent(anyString(), nullable(String.class))).thenReturn(null);

        ValidationException ex = assertThrows(ValidationException.class, () -> contextStoryService.generateStory(600L));
        assertTrue(ex.getMessage().contains("Không thể tạo đoạn văn bằng AI"));
    }

    @Test
    @DisplayName("Tạo nhiều đoạn văn tự nhiên theo chủ đề với AI và theo dõi từ chưa dùng")
    void shouldGenerateAiStoryWithMultipleParagraphsAndTrackUnusedWords() {
        List<TermCardDto> cards = List.of(
                new TermCardDto(1L, "student", "sinh viên", null, "noun", null, null),
                new TermCardDto(2L, "class", "lớp học", null, "noun", null, null),
                new TermCardDto(3L, "colleague", "đồng nghiệp", null, "noun", null, null),
                new TermCardDto(4L, "meeting", "cuộc họp", null, "noun", null, null),
                new TermCardDto(5L, "hypervisor", "bộ giám sát ảo (từ kỹ thuật)", null, "noun", null, null)
        );

        DeckDetailResponse deck = new DeckDetailResponse();
        deck.setId(500L);
        deck.setName("Từ vựng tổng hợp");
        deck.setCards(cards);

        when(deckService.getDeck(500L)).thenReturn(deck);
        when(geminiSentenceService.isAvailable(null)).thenReturn(true);

        String fakeAiJson = """
                {
                  "title": "Câu chuyện ngữ cảnh: Cuộc sống & Công sở",
                  "paragraphs": [
                    {
                      "title": "A Day at University",
                      "topic": "Học tập & Sinh viên",
                      "text": "Every morning, the {{0}} walks into the {{1}} with enthusiasm.",
                      "translation": "Mỗi buổi sáng, bạn sinh viên bước vào lớp học với sự hào hứng.",
                      "blanks": [
                        { "cardId": 1, "term": "student", "matchedWord": "student" },
                        { "cardId": 2, "term": "class", "matchedWord": "class" }
                      ]
                    },
                    {
                      "title": "At the Office",
                      "topic": "Công sở & Đồng nghiệp",
                      "text": "In the afternoon, John talked with his {{2}} before joining the team {{3}}.",
                      "translation": "Vào buổi chiều, John trò chuyện cùng đồng nghiệp trước khi tham gia cuộc họp nhóm.",
                      "blanks": [
                        { "cardId": 3, "term": "colleague", "matchedWord": "colleague" },
                        { "cardId": 4, "term": "meeting", "matchedWord": "meeting" }
                      ]
                    }
                  ],
                  "usedWords": ["student", "class", "colleague", "meeting"],
                  "unusedWords": ["hypervisor"]
                }
                """;

        when(geminiSentenceService.generateContent(anyString(), nullable(String.class)))
                .thenReturn(fakeAiJson);

        ContextStoryDto story = contextStoryService.generateStory(500L);

        assertNotNull(story);
        assertEquals(2, story.getParagraphs().size());
        assertEquals("Câu chuyện ngữ cảnh: Cuộc sống & Công sở", story.getTitle());
        assertEquals(4, story.getTotalBlanks());

        // Paragraph 1 checks
        var p1 = story.getParagraphs().get(0);
        assertEquals("A Day at University", p1.getTitle());
        assertEquals("Học tập & Sinh viên", p1.getTopic());
        assertTrue(p1.getText().contains("{{0}}"));
        assertTrue(p1.getText().contains("{{1}}"));

        // Paragraph 2 checks
        var p2 = story.getParagraphs().get(1);
        assertEquals("At the Office", p2.getTitle());
        assertEquals("Công sở & Đồng nghiệp", p2.getTopic());
        assertTrue(p2.getText().contains("{{2}}"));
        assertTrue(p2.getText().contains("{{3}}"));

        // Track used and unused words
        assertTrue(story.getUsedWords().contains("student"));
        assertTrue(story.getUsedWords().contains("colleague"));
        assertTrue(story.getUnusedWords().contains("hypervisor"), "Từ kỹ thuật không phù hợp 'hypervisor' phải nằm trong unusedWords");
    }
}
