package com.languagelearning.backend.deck;

import com.languagelearning.backend.account.User;
import com.languagelearning.backend.account.UserRepository;
import com.languagelearning.backend.common.exception.ValidationException;
import com.languagelearning.backend.common.security.SecurityTestUtils;
import com.languagelearning.backend.deck.dto.DeckCreateRequest;
import com.languagelearning.backend.deck.dto.DeckDetailResponse;
import com.languagelearning.backend.deck.dto.DeckUpdateRequest;
import com.languagelearning.backend.deck.entity.VocabularySet;
import com.languagelearning.backend.deck.entity.VocabularySetItem;
import com.languagelearning.backend.deck.repository.VocabularySetItemRepository;
import com.languagelearning.backend.deck.repository.VocabularySetRepository;
import com.languagelearning.backend.deck.service.DeckService;
import com.languagelearning.backend.term.dto.TermCardDto;
import com.languagelearning.backend.term.entity.Vocabulary;
import com.languagelearning.backend.term.entity.VocabularySynonym;
import com.languagelearning.backend.term.repository.VocabularyRepository;
import com.languagelearning.backend.term.repository.VocabularySynonymRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.*;

import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest
@ActiveProfiles("test")
@Transactional
public class DeckUpdateCharacterizationIntegrationTest {

    @Autowired
    private DeckService deckService;

    @Autowired
    private VocabularySetRepository vocabularySetRepository;

    @Autowired
    private VocabularySetItemRepository vocabularySetItemRepository;

    @Autowired
    private VocabularyRepository vocabularyRepository;

    @Autowired
    private VocabularySynonymRepository vocabularySynonymRepository;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private JdbcTemplate jdbcTemplate;

    private User testUser;

    @BeforeEach
    void setUp() {
        testUser = userRepository.findAll().stream().findFirst().orElseGet(() -> {
            User u = new User();
            u.setEmail("test_char_user@test.com");
            u.setUsername("test_char_user");
            u.setPasswordHash("hashed");
            return userRepository.save(u);
        });
        SecurityTestUtils.setAuthenticatedUser(testUser.getId(), testUser.getEmail(), testUser.getUsername(), List.of("USER"));
    }

    private DeckDetailResponse createSampleDeck(String name, int cardCount) {
        List<TermCardDto> cards = new ArrayList<>();
        for (int i = 1; i <= cardCount; i++) {
            TermCardDto c = new TermCardDto(
                    null,
                    "term_" + i,
                    "meaning_" + i,
                    "/pron_" + i + "/",
                    "noun",
                    "example_" + i,
                    List.of("syn_" + i + "_1", "syn_" + i + "_2")
            );
            cards.add(c);
        }
        DeckCreateRequest req = new DeckCreateRequest(name, "Original Description", null, cards);
        return deckService.createDeck(req);
    }

    @Test
    @DisplayName("1. Đổi tên và mô tả deck giữ nguyên thẻ")
    void testRenameAndChangeDescription() {
        DeckDetailResponse created = createSampleDeck("Original Deck", 2);
        Long deckId = created.getId();

        List<TermCardDto> cards = created.getCards();
        DeckUpdateRequest updateReq = new DeckUpdateRequest("Renamed Deck", "Updated Description", null, cards);

        DeckDetailResponse updated = deckService.updateDeck(deckId, updateReq);

        assertEquals("Renamed Deck", updated.getName());
        assertEquals("Updated Description", updated.getDescription());
        assertEquals(2, updated.getCards().size());

        VocabularySet setInDb = vocabularySetRepository.findById(deckId).orElseThrow();
        assertEquals("Renamed Deck", setInDb.getName());
        assertEquals("Updated Description", setInDb.getDescription());
    }

    @Test
    @DisplayName("2. Sửa từng trường của thẻ (term, definition, pronunciation, partOfSpeech, example)")
    void testUpdateIndividualFieldsOfCard() {
        DeckDetailResponse created = createSampleDeck("Fields Deck", 1);
        Long deckId = created.getId();
        TermCardDto card = created.getCards().get(0);
        Long cardId = card.getId();

        TermCardDto modifiedCard = new TermCardDto(
                cardId,
                "  new_term  ",
                "  new_meaning  ",
                "  /new_pron/  ",
                "  verb  ",
                "  new_example  ",
                List.of("syn1", "syn2")
        );

        DeckUpdateRequest updateReq = new DeckUpdateRequest("Fields Deck", "Desc", null, List.of(modifiedCard));
        DeckDetailResponse updated = deckService.updateDeck(deckId, updateReq);

        TermCardDto resCard = updated.getCards().get(0);
        assertEquals("new_term", resCard.getTerm());
        assertEquals("new_meaning", resCard.getDefinition());
        assertEquals("/new_pron/", resCard.getPronunciation());
        assertEquals("verb", resCard.getPartOfSpeech());
        assertEquals("new_example", resCard.getExample());

        Vocabulary inDb = vocabularyRepository.findById(cardId).orElseThrow();
        assertEquals("new_term", inDb.getWord());
        assertEquals("new_meaning", inDb.getMeaning());
        assertEquals("/new_pron/", inDb.getPronunciation());
        assertEquals("verb", inDb.getWordType());
        assertEquals("new_example", inDb.getExampleSentence());
    }

    @Test
    @DisplayName("3. Sửa synonym (thêm, bớt, trùng lặp, hoa thường, rỗng, đổi thứ tự)")
    void testUpdateSynonyms() {
        DeckDetailResponse created = createSampleDeck("Synonym Deck", 1);
        Long deckId = created.getId();
        TermCardDto card = created.getCards().get(0);

        // Input có: synonym mới, synonym cũ, trùng lặp khác hoa thường, chuỗi rỗng/khoảng trắng
        List<String> rawSynonyms = List.of("  SYN_1_1  ", "syn_new", "syn_1_1", "   ", "SYN_NEW");
        TermCardDto modifiedCard = new TermCardDto(
                card.getId(),
                card.getTerm(),
                card.getDefinition(),
                card.getPronunciation(),
                card.getPartOfSpeech(),
                card.getExample(),
                rawSynonyms
        );

        DeckUpdateRequest updateReq = new DeckUpdateRequest("Synonym Deck", "Desc", null, List.of(modifiedCard));
        DeckDetailResponse updated = deckService.updateDeck(deckId, updateReq);

        List<String> updatedSyns = updated.getCards().get(0).getSynonyms();
        // Phải được chuẩn hóa: loại bỏ rỗng, deduplicate không phân biệt hoa thường, trim
        assertEquals(2, updatedSyns.size());
        assertTrue(updatedSyns.contains("SYN_1_1"));
        assertTrue(updatedSyns.contains("syn_new"));

        List<VocabularySynonym> inDb = vocabularySynonymRepository.findByVocabularyId(card.getId());
        assertEquals(2, inDb.size());
    }

    @Test
    @DisplayName("4. Request trộn lẫn thẻ sửa + thẻ mới + thẻ bị xóa")
    void testMixedRequest() {
        DeckDetailResponse created = createSampleDeck("Mixed Deck", 3);
        Long deckId = created.getId();
        List<TermCardDto> origCards = created.getCards();
        Long card1Id = origCards.get(0).getId();
        Long card2Id = origCards.get(1).getId();
        Long card3Id = origCards.get(2).getId();

        // Giữ & sửa card1, XÓA card2 (không truyền trong request), thêm cardMoi
        TermCardDto modCard1 = new TermCardDto(card1Id, "card1_mod", "def1_mod", null, null, null, null);
        TermCardDto modCard3 = new TermCardDto(card3Id, "card3_mod", "def3_mod", null, null, null, null);
        TermCardDto newCard = new TermCardDto(null, "card_brand_new", "def_brand_new", null, null, null, null);

        DeckUpdateRequest updateReq = new DeckUpdateRequest("Mixed Deck", "Desc", null, List.of(modCard1, newCard, modCard3));
        DeckDetailResponse updated = deckService.updateDeck(deckId, updateReq);

        assertEquals(3, updated.getCards().size());
        assertEquals("card1_mod", updated.getCards().get(0).getTerm());
        assertEquals("card_brand_new", updated.getCards().get(1).getTerm());
        assertNotNull(updated.getCards().get(1).getId());
        assertEquals("card3_mod", updated.getCards().get(2).getTerm());

        // card2 phải bị xóa khỏi set_items
        assertFalse(vocabularySetItemRepository.existsByIdVocabularySetIdAndIdVocabularyId(deckId, card2Id));
        // card2 không dùng chung thì bị xóa khỏi vocabularies
        assertFalse(vocabularyRepository.existsById(card2Id));
    }

    @Test
    @DisplayName("5. Thẻ dùng chung với deck khác: xóa khỏi deck này không được xóa khỏi DB")
    void testSharedCardWithAnotherDeck() {
        DeckDetailResponse deck1 = createSampleDeck("Deck 1", 1);
        DeckDetailResponse deck2 = createSampleDeck("Deck 2", 1);

        Long sharedVocabId = deck1.getCards().get(0).getId();

        // Gắn card của deck 1 vào deck 2
        vocabularySetItemRepository.save(new VocabularySetItem(deck2.getId(), sharedVocabId));

        // Bây giờ update deck1 xóa thẻ sharedVocabId (thay bằng thẻ mới)
        TermCardDto newCard = new TermCardDto(null, "new_card_deck1", "def", null, null, null, null);
        DeckUpdateRequest updateReq = new DeckUpdateRequest("Deck 1", "Desc", null, List.of(newCard));
        deckService.updateDeck(deck1.getId(), updateReq);

        // Thẻ sharedVocabId đã bị gỡ khỏi deck 1
        assertFalse(vocabularySetItemRepository.existsByIdVocabularySetIdAndIdVocabularyId(deck1.getId(), sharedVocabId));

        // NHƯNG thẻ vẫn còn trong DB và vẫn còn trong deck 2!
        assertTrue(vocabularyRepository.existsById(sharedVocabId));
        assertTrue(vocabularySetItemRepository.existsByIdVocabularySetIdAndIdVocabularyId(deck2.getId(), sharedVocabId));
    }

    @Test
    @DisplayName("6. Thứ tự thẻ trong request được bảo toàn nguyên vẹn trong response")
    void testCardOrderPreservedInResponse() {
        DeckDetailResponse created = createSampleDeck("Order Deck", 3);
        Long deckId = created.getId();
        List<TermCardDto> origCards = created.getCards();

        // Đảo thứ tự: Card 3 -> New Card -> Card 1 -> Card 2
        TermCardDto c1 = origCards.get(0);
        TermCardDto c2 = origCards.get(1);
        TermCardDto c3 = origCards.get(2);
        TermCardDto newCard = new TermCardDto(null, "interleaved_new", "def", null, null, null, null);

        DeckUpdateRequest updateReq = new DeckUpdateRequest("Order Deck", "Desc", null, List.of(c3, newCard, c1, c2));
        DeckDetailResponse updated = deckService.updateDeck(deckId, updateReq);

        assertEquals(4, updated.getCards().size());
        assertEquals(c3.getId(), updated.getCards().get(0).getId());
        assertEquals("interleaved_new", updated.getCards().get(1).getTerm());
        assertEquals(c1.getId(), updated.getCards().get(2).getId());
        assertEquals(c2.getId(), updated.getCards().get(3).getId());
    }

    @Test
    @DisplayName("7. Id không thuộc deck hiện tại: được xử lý như thẻ mới tạo mới")
    void testCardIdNotBelongingToDeck() {
        DeckDetailResponse deckA = createSampleDeck("Deck A", 1);
        DeckDetailResponse deckB = createSampleDeck("Deck B", 1);

        Long cardFromDeckB = deckB.getCards().get(0).getId();

        // Gửi update Deck A với 1 card có id của Deck B
        TermCardDto strangeCard = new TermCardDto(cardFromDeckB, "copied_term", "copied_def", null, null, null, null);
        DeckUpdateRequest updateReq = new DeckUpdateRequest("Deck A", "Desc", null, List.of(strangeCard));

        DeckDetailResponse updated = deckService.updateDeck(deckA.getId(), updateReq);

        assertEquals(1, updated.getCards().size());
        TermCardDto resCard = updated.getCards().get(0);
        assertEquals("copied_term", resCard.getTerm());
        // Code cũ xem id không thuộc deck là thẻ mới và sinh ID mới, không ghi đè card của Deck B!
        assertNotEquals(cardFromDeckB, resCard.getId());
    }

    @Test
    @DisplayName("8. Validation: Thuật ngữ hoặc định nghĩa rỗng ném ValidationException")
    void testValidationEmptyTermOrDefinition() {
        DeckDetailResponse created = createSampleDeck("Val Deck", 1);
        Long deckId = created.getId();

        TermCardDto emptyTermCard = new TermCardDto(created.getCards().get(0).getId(), "  ", "meaning", null, null, null, null);
        DeckUpdateRequest req1 = new DeckUpdateRequest("Val Deck", "Desc", null, List.of(emptyTermCard));
        assertThrows(ValidationException.class, () -> deckService.updateDeck(deckId, req1));

        TermCardDto emptyDefCard = new TermCardDto(created.getCards().get(0).getId(), "term", "  ", null, null, null, null);
        DeckUpdateRequest req2 = new DeckUpdateRequest("Val Deck", "Desc", null, List.of(emptyDefCard));
        assertThrows(ValidationException.class, () -> deckService.updateDeck(deckId, req2));
    }

    @Test
    @DisplayName("9. updated_at: Thẻ có thay đổi nội dung thì updated_at thay đổi; thẻ không đổi giữ nguyên")
    void testUpdatedAtBehavior() throws Exception {
        DeckDetailResponse created = createSampleDeck("Timestamp Deck", 2);
        Long deckId = created.getId();
        TermCardDto card1 = created.getCards().get(0);
        TermCardDto card2 = created.getCards().get(1);

        Vocabulary v1Before = vocabularyRepository.findById(card1.getId()).orElseThrow();
        Vocabulary v2Before = vocabularyRepository.findById(card2.getId()).orElseThrow();
        Instant v1UpdatedBefore = v1Before.getUpdatedAt();
        Instant v2UpdatedBefore = v2Before.getUpdatedAt();

        Thread.sleep(50); // đảm bảo thời gian nhích lên

        // Card 1 giữ nguyên 100% nội dung
        TermCardDto card1Unchanged = new TermCardDto(
                card1.getId(),
                card1.getTerm(),
                card1.getDefinition(),
                card1.getPronunciation(),
                card1.getPartOfSpeech(),
                card1.getExample(),
                card1.getSynonyms()
        );

        // Card 2 sửa nghĩa
        TermCardDto card2Modified = new TermCardDto(
                card2.getId(),
                card2.getTerm(),
                "modified meaning 2",
                card2.getPronunciation(),
                card2.getPartOfSpeech(),
                card2.getExample(),
                card2.getSynonyms()
        );

        DeckUpdateRequest updateReq = new DeckUpdateRequest("Timestamp Deck", "Desc", null, List.of(card1Unchanged, card2Modified));
        deckService.updateDeck(deckId, updateReq);

        // Query database directly to bypass Hibernate L1 cache
        Instant v1UpdatedAfter = jdbcTemplate.queryForObject("SELECT updated_at FROM vocabularies WHERE id = ?", Instant.class, card1.getId());
        Instant v2UpdatedAfter = jdbcTemplate.queryForObject("SELECT updated_at FROM vocabularies WHERE id = ?", Instant.class, card2.getId());

        assertEquals(v1UpdatedBefore, v1UpdatedAfter, "Thẻ không thay đổi nội dung thì updated_at KHÔNG được đổi");
        assertTrue(v2UpdatedAfter.isAfter(v2UpdatedBefore), "Thẻ có thay đổi nội dung phải có updated_at mới hơn");
    }
}
