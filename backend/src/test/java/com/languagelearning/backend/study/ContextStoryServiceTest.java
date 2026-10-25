package com.languagelearning.backend.study;

import com.languagelearning.backend.common.exception.ValidationException;
import com.languagelearning.backend.deck.dto.DeckDetailResponse;
import com.languagelearning.backend.deck.service.DeckService;
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
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class ContextStoryServiceTest {

    @Mock
    private DeckService deckService;

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
    @DisplayName("Tạo đoạn văn ngữ cảnh thành công với các thẻ từ có ví dụ (xử lý đúng dạng chia thì và không để lại ký tự dư thừa)")
    void shouldGenerateStoryWithCardsHavingExamples() {
        List<TermCardDto> cards = List.of(
                new TermCardDto(101L, "serendipity", "sự may mắn bất ngờ", "/ˌser.ənˈdɪp.ə.ti/", "noun",
                        "Finding this rare book was pure serendipity.", new ArrayList<>(List.of("fluke", "good fortune"))),
                new TermCardDto(102L, "resilient", "kiên cường, có khả năng phục hồi nhanh", "/rɪˈzɪl.jənt/", "adjective",
                        "She is a very resilient person in tough times.", new ArrayList<>(List.of("tough", "strong"))),
                new TermCardDto(103L, "illuminate", "chiếu sáng, làm sáng tỏ", "/ɪˈluː.mə.neɪt/", "verb",
                        "A sudden flash of light illuminated the dark room.", new ArrayList<>(List.of("light up", "brighten")))
        );

        DeckDetailResponse deck = new DeckDetailResponse();
        deck.setId(99L);
        deck.setName("Từ vựng nâng cao");
        deck.setCards(cards);

        when(deckService.getDeck(99L)).thenReturn(deck);

        ContextStoryDto story = contextStoryService.generateStory(99L);

        assertNotNull(story);
        assertEquals(99L, story.getDeckId());
        assertEquals("Câu chuyện ngữ cảnh: Từ vựng nâng cao", story.getTitle());
        assertEquals(3, story.getTotalBlanks());
        assertFalse(story.getParagraphs().isEmpty());

        // Check blanks placeholders
        String firstParagraphText = story.getParagraphs().get(0).getText();
        assertTrue(firstParagraphText.contains("{{0}}"));
        assertTrue(firstParagraphText.contains("{{1}}"));
        assertTrue(firstParagraphText.contains("{{2}}"));

        // Verify NO dangling suffix (e.g. {{2}}d was a bug previously)
        assertFalse(firstParagraphText.contains("{{2}}d"), "Phải thay thế toàn bộ từ 'illuminated' bằng placeholder, không để lại chữ 'd'");
        assertTrue(firstParagraphText.contains("A sudden flash of light {{2}} the dark room."));

        // Check blank details
        assertEquals("serendipity", story.getParagraphs().get(0).getBlanks().get(0).getTerm());
        assertEquals("resilient", story.getParagraphs().get(0).getBlanks().get(1).getTerm());
        assertEquals("illuminate", story.getParagraphs().get(0).getBlanks().get(2).getTerm());

        // Verify inflected word "illuminated" is registered as an accepted synonym
        assertTrue(story.getParagraphs().get(0).getBlanks().get(2).getSynonyms().contains("illuminated"));
    }

    @Test
    @DisplayName("Không bị cắt nhầm chuỗi con khi từ vựng nằm trong từ khác (Substring Collision Prevention)")
    void shouldNotMatchSubstringWithoutWordBoundary() {
        List<TermCardDto> cards = List.of(
                new TermCardDto(301L, "cat", "con mèo", "/kæt/", "noun",
                        "The application crashed unexpectedly.", new ArrayList<>()),
                new TermCardDto(302L, "car", "ô tô", "/kɑːr/", "noun",
                        "Be careful when carrying that fragile glass.", new ArrayList<>())
        );

        DeckDetailResponse deck = new DeckDetailResponse();
        deck.setId(101L);
        deck.setName("Từ ngắn");
        deck.setCards(cards);

        when(deckService.getDeck(101L)).thenReturn(deck);

        ContextStoryDto story = contextStoryService.generateStory(101L);

        assertNotNull(story);
        String paragraphText = story.getParagraphs().get(0).getText();

        // Must NOT replace inside "application" or "careful"
        assertFalse(paragraphText.contains("appli{{0}}ion"), "Không được cắt nhầm từ bên trong 'application'");
        assertFalse(paragraphText.contains("{{1}}eful"), "Không được cắt nhầm từ bên trong 'careful'");

        // Instead, it correctly fell back to natural templates
        assertTrue(paragraphText.contains("{{0}}"));
        assertTrue(paragraphText.contains("{{1}}"));
    }

    @Test
    @DisplayName("Tạo đoạn văn ngữ cảnh tự động theo mẫu phong phú không bị lặp câu (Template rotation)")
    void shouldGenerateStoryUsingTemplatesWhenNoExample() {
        List<TermCardDto> cards = List.of(
                new TermCardDto(201L, "explore", "khám phá", "/ɪkˈsplɔːr/", "verb", "", new ArrayList<>(List.of("discover"))),
                new TermCardDto(202L, "curious", "tò mò, hiếu kỳ", "/ˈkjʊə.ri.əs/", "adjective", null, new ArrayList<>(List.of("inquisitive"))),
                new TermCardDto(203L, "inspire", "truyền cảm hứng", "/ɪnˈspaɪər/", "verb", "", new ArrayList<>())
        );

        DeckDetailResponse deck = new DeckDetailResponse();
        deck.setId(100L);
        deck.setName("Khám phá");
        deck.setCards(cards);

        when(deckService.getDeck(100L)).thenReturn(deck);

        ContextStoryDto story = contextStoryService.generateStory(100L);

        assertNotNull(story);
        assertEquals(3, story.getTotalBlanks());
        String paragraphText = story.getParagraphs().get(0).getText();
        assertTrue(paragraphText.contains("{{0}}"));
        assertTrue(paragraphText.contains("{{1}}"));
        assertTrue(paragraphText.contains("{{2}}"));

        // Two verbs at index 0 and index 2 should use rotating different templates, not duplicate identical sentences
        assertFalse(paragraphText.contains("During our daily journey, we decided to {{2}}"),
                "Hai động từ khác nhau không nên lặp lại cùng một mẫu câu.");
        assertNotNull(story.getParagraphs().get(0).getTranslation());
    }

    @Test
    @DisplayName("Hỗ trợ tiền tố 'to ' khi tìm dạng biến thể thì (inflections) và lưu matchedWord")
    void shouldMatchInflectionsWithToPrefixAndSetMatchedWord() {
        List<TermCardDto> cards = List.of(
                new TermCardDto(401L, "to explore", "khám phá", "/tə ɪkˈsplɔːr/", "verb",
                        "They explored the deepest parts of the cave.", new ArrayList<>(List.of("investigate")))
        );

        DeckDetailResponse deck = new DeckDetailResponse();
        deck.setId(102L);
        deck.setName("Khám phá hang động");
        deck.setCards(cards);

        when(deckService.getDeck(102L)).thenReturn(deck);

        ContextStoryDto story = contextStoryService.generateStory(102L);

        assertNotNull(story);
        String paragraphText = story.getParagraphs().get(0).getText();
        assertTrue(paragraphText.contains("They {{0}} the deepest parts of the cave."));

        var blank = story.getParagraphs().get(0).getBlanks().get(0);
        assertEquals("explored", blank.getMatchedWord(), "matchedWord phải là 'explored'");
        assertTrue(blank.getSynonyms().contains("explored"), "Synonyms phải chứa 'explored'");
        assertTrue(blank.getSynonyms().contains("explore"), "Synonyms phải chứa từ gốc 'explore'");
    }
}
