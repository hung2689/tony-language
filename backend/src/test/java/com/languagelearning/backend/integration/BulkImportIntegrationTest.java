package com.languagelearning.backend.integration;

import com.languagelearning.backend.account.User;
import com.languagelearning.backend.account.UserRepository;
import com.languagelearning.backend.common.exception.ValidationException;
import com.languagelearning.backend.common.security.CurrentUserProvider;
import com.languagelearning.backend.common.security.DevDataSeeder;
import com.languagelearning.backend.common.security.SecurityTestUtils;
import com.languagelearning.backend.deck.dto.DeckCreateRequest;
import com.languagelearning.backend.deck.dto.DeckDetailResponse;
import com.languagelearning.backend.deck.service.DeckService;
import com.languagelearning.backend.term.dto.TermCardDto;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest
@ActiveProfiles("test")
@Transactional
public class BulkImportIntegrationTest {

    @Autowired
    private DeckService deckService;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private CurrentUserProvider currentUserProvider;

    private Long userId;

    @BeforeEach
    void setUp() {
        User devUser = userRepository.findByEmailIgnoreCase(DevDataSeeder.DEV_USER_EMAIL)
                .orElseGet(() -> userRepository.save(new User(
                        DevDataSeeder.DEV_USER_EMAIL,
                        "hash",
                        DevDataSeeder.DEV_USERNAME,
                        User.STATUS_ACTIVE
                )));
        userId = devUser.getId();
        SecurityTestUtils.setAuthenticatedUser(userId, devUser.getEmail(), devUser.getUsername(), List.of("USER"));
    }

    @AfterEach
    void tearDown() {
        SecurityTestUtils.clearAuthentication();
    }

    @Test
    @DisplayName("Saves a deck with 105 cards containing Vietnamese text, IPA symbols and synonyms, then reads it back and verifies every field")
    void shouldSaveAndRetrieveLargeDeckWithVietnameseAndIpa() {
        List<TermCardDto> cards = new ArrayList<>();
        int cardCount = 105;

        for (int i = 1; i <= cardCount; i++) {
            String term = "từ_vựng_" + i;
            String definition = "Định nghĩa tiếng Việt đầy đủ cho thẻ số " + i + " với dấu câu: ắ, ằ, ẳ, ẵ, ặ, ế, ề, ể, ễ, ệ, ố, ồ, ổ, ỗ, ộ, ứ, ừ, ử, ữ, ự.";
            String ipa = "/ˌvjɛt.nɑːmˈiːz_aɪ.piː.eɪ_" + i + "_/θðʃʒŋ/";
            String pos = (i % 2 == 0) ? "noun" : "adjective";
            String example = "Ví dụ câu minh họa cho thuật ngữ số " + i + " trong ngữ cảnh thực tế.";
            List<String> synonyms = List.of("đồng_nghĩa_A_" + i, "đồng_nghĩa_B_" + i);

            cards.add(new TermCardDto(null, term, definition, ipa, pos, example, synonyms));
        }

        DeckCreateRequest request = new DeckCreateRequest(
                "Bộ thẻ 105 từ vựng mẫu kiểm thử tích hợp",
                "Kiểm thử lưu trữ hàng loạt hơn 100 thẻ với tiếng Việt có dấu, ký tự phiên âm IPA và danh sách từ đồng nghĩa.",
                null,
                cards
        );

        // 1. Create deck
        DeckDetailResponse created = deckService.createDeck(request);
        assertNotNull(created.getId());
        assertEquals("Bộ thẻ 105 từ vựng mẫu kiểm thử tích hợp", created.getName());
        assertEquals(cardCount, created.getCards().size());

        // 2. Read it back via getDeck(id)
        DeckDetailResponse fetched = deckService.getDeck(created.getId());
        assertNotNull(fetched);
        assertEquals(created.getId(), fetched.getId());
        assertEquals(cardCount, fetched.getCards().size());

        // 3. Verify every field of all 105 cards
        Map<String, TermCardDto> fetchedCardsMap = fetched.getCards().stream()
                .collect(Collectors.toMap(TermCardDto::getTerm, c -> c));

        for (int i = 1; i <= cardCount; i++) {
            String expectedTerm = "từ_vựng_" + i;
            TermCardDto card = fetchedCardsMap.get(expectedTerm);
            assertNotNull(card, "Thẻ với thuật ngữ '" + expectedTerm + "' phải tồn tại");

            assertNotNull(card.getId(), "Card id không được null sau khi lưu");
            assertEquals("Định nghĩa tiếng Việt đầy đủ cho thẻ số " + i + " với dấu câu: ắ, ằ, ẳ, ẵ, ặ, ế, ề, ể, ễ, ệ, ố, ồ, ổ, ỗ, ộ, ứ, ừ, ử, ữ, ự.", card.getDefinition());
            assertEquals("/ˌvjɛt.nɑːmˈiːz_aɪ.piː.eɪ_" + i + "_/θðʃʒŋ/", card.getPronunciation());
            assertEquals((i % 2 == 0) ? "noun" : "adjective", card.getPartOfSpeech());
            assertEquals("Ví dụ câu minh họa cho thuật ngữ số " + i + " trong ngữ cảnh thực tế.", card.getExample());
            assertEquals(2, card.getSynonyms().size());
            assertTrue(card.getSynonyms().contains("đồng_nghĩa_A_" + i));
            assertTrue(card.getSynonyms().contains("đồng_nghĩa_B_" + i));
        }
    }

    @Test
    @DisplayName("Rejects deck creation with more than 1000 cards")
    void shouldRejectDeckWithOver1000Cards() {
        List<TermCardDto> cards = new ArrayList<>();
        for (int i = 1; i <= 1001; i++) {
            cards.add(new TermCardDto(null, "term_" + i, "definition_" + i, null, null, null, null));
        }

        DeckCreateRequest request = new DeckCreateRequest(
                "Bộ thẻ quá giới hạn",
                "Mô tả",
                null,
                cards
        );

        ValidationException ex = assertThrows(ValidationException.class, () -> deckService.createDeck(request));
        assertTrue(ex.getMessage().contains("không được vượt quá 1000 thẻ"));
    }
}
