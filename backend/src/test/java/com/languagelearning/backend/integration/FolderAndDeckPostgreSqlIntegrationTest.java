package com.languagelearning.backend.integration;

import com.languagelearning.backend.common.security.CurrentUserProvider;
import com.languagelearning.backend.common.security.DevDataSeeder;
import com.languagelearning.backend.deck.dto.DeckCreateRequest;
import com.languagelearning.backend.deck.dto.DeckDetailResponse;
import com.languagelearning.backend.deck.dto.DeckResponse;
import com.languagelearning.backend.deck.entity.VocabularySet;
import com.languagelearning.backend.deck.repository.VocabularySetItemRepository;
import com.languagelearning.backend.deck.repository.VocabularySetRepository;
import com.languagelearning.backend.deck.service.DeckService;
import com.languagelearning.backend.folder.dto.FolderCreateRequest;
import com.languagelearning.backend.folder.dto.FolderResponse;
import com.languagelearning.backend.folder.entity.Folder;
import com.languagelearning.backend.folder.repository.FolderRepository;
import com.languagelearning.backend.folder.service.FolderService;
import com.languagelearning.backend.term.dto.TermCardDto;
import com.languagelearning.backend.term.repository.VocabularyRepository;
import com.languagelearning.backend.term.repository.VocabularySynonymRepository;
import com.languagelearning.backend.account.User;
import com.languagelearning.backend.account.UserRepository;
import com.languagelearning.backend.common.security.SecurityTestUtils;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest
@ActiveProfiles("dev")
@Transactional
public class FolderAndDeckPostgreSqlIntegrationTest {

    @Autowired
    private FolderService folderService;

    @Autowired
    private DeckService deckService;

    @Autowired
    private FolderRepository folderRepository;

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
    private CurrentUserProvider currentUserProvider;

    private Long userId;

    @BeforeEach
    void setUp() {
        User devUser = userRepository.findByEmailIgnoreCase(DevDataSeeder.DEV_USER_EMAIL)
                .orElseGet(() -> userRepository.save(new User(DevDataSeeder.DEV_USER_EMAIL, "hash", DevDataSeeder.DEV_USERNAME, User.STATUS_ACTIVE)));
        userId = devUser.getId();
        SecurityTestUtils.setAuthenticatedUser(userId, devUser.getEmail(), devUser.getUsername(), List.of("USER"));
    }

    @AfterEach
    void tearDown() {
        SecurityTestUtils.clearAuthentication();
    }

    @Test
    @DisplayName("Cơ sở dữ liệu PostgreSQL thực tế thực thi Unique Index (user_id, LOWER(TRIM(name)))")
    void caseInsensitiveUniqueFolderNameIndex_EnforcedByRealPostgres() {
        Folder folder1 = new Folder(userId, "IELTS Advanced");
        folderRepository.saveAndFlush(folder1);

        Folder folder2 = new Folder(userId, "  ielts advanced  ");
        assertThrows(DataIntegrityViolationException.class, () -> {
            folderRepository.saveAndFlush(folder2);
        });
    }

    @Test
    @DisplayName("Xóa thư mục chế độ setNull trên PostgreSQL thực tế: Giữ nguyên các Deck và chuyển folder_id về null")
    void deleteFolder_ModeSetNull_LeavesDecksInUncategorized_RealDatabase() {
        FolderResponse folder = folderService.createFolder(new FolderCreateRequest("TOEIC Vocabulary"));
        assertNotNull(folder.getId());

        List<TermCardDto> cards = List.of(
                new TermCardDto(null, "Negotiate", "Đàm phán", "/nəˈɡoʊ.ʃi.eɪt/", "verb", "They negotiated a contract.", List.of("bargain"))
        );
        DeckDetailResponse deck = deckService.createDeck(new DeckCreateRequest("Business 1", "Mô tả", folder.getId(), cards));

        folderService.deleteFolder(folder.getId(), "setNull");

        assertFalse(folderRepository.findById(folder.getId()).isPresent(), "Folder must be deleted");
        VocabularySet updatedDeck = vocabularySetRepository.findById(deck.getId()).orElseThrow();
        assertNull(updatedDeck.getFolderId(), "Deck must now have folder_id = null (Uncategorized)");
    }

    @Test
    @DisplayName("Xóa thư mục chế độ deleteDecks trên PostgreSQL thực tế: Xóa sạch Folder, Deck, Thẻ từ và Từ đồng nghĩa")
    void deleteFolder_ModeDeleteDecks_DeletesDecksAndCards_RealDatabase() {
        FolderResponse folder = folderService.createFolder(new FolderCreateRequest("Temporary Folder"));

        List<TermCardDto> cards = List.of(
                new TermCardDto(null, "Abandon", "Từ bỏ", "/əˈbæn.dən/", "verb", "Never abandon hope.", List.of("discard", "relinquish"))
        );
        DeckDetailResponse deck = deckService.createDeck(new DeckCreateRequest("Temp Deck", "Mô tả", folder.getId(), cards));
        Long vocabId = deck.getCards().get(0).getId();

        folderService.deleteFolder(folder.getId(), "deleteDecks");

        assertFalse(folderRepository.findById(folder.getId()).isPresent(), "Folder must be deleted");
        assertFalse(vocabularySetRepository.findById(deck.getId()).isPresent(), "Deck must be deleted");
        assertEquals(0, vocabularySetItemRepository.findByIdVocabularySetId(deck.getId()).size(), "Set items must be deleted");
        assertFalse(vocabularyRepository.findById(vocabId).isPresent(), "Vocabulary row must be deleted");
        assertEquals(0, vocabularySynonymRepository.findByVocabularyId(vocabId).size(), "Synonyms must be deleted");
    }

    @Test
    @DisplayName("Kiểm tra bảo toàn UTF-8 & Ký hiệu phiên âm quốc tế IPA đi qua toàn bộ API -> Real PostgreSQL -> API")
    void utf8AndIpaSymbolsRoundTrip_EndToEndRealPostgres() {
        String deckName = "Bộ từ vựng tiếng Việt nâng cao & IPA";
        String deckDesc = "Kiểm tra ký tự tiếng Việt có dấu: ẵ, ặ, ẳ, ấ, ơ, ư, đ và ký hiệu ngữ âm /.../";

        List<TermCardDto> cards = List.of(
                new TermCardDto(
                        null,
                        "Xin chào",
                        "Lời chào hỏi thân thiện bằng tiếng Việt",
                        "/siŋ caːw˨˩/",
                        "interjection",
                        "Xin chào các bạn, chúc một ngày tốt lành!",
                        List.of("chào", "chào bạn")
                ),
                new TermCardDto(
                        null,
                        "Revenue",
                        "Doanh thu tài chính của doanh nghiệp",
                        "/ˈrev.ə.nuː/",
                        "noun",
                        "Doanh thu thuần năm 2026 tăng trưởng vượt bậc.",
                        List.of("thu nhập", "lợi nhuận gộp")
                )
        );

        DeckDetailResponse created = deckService.createDeck(new DeckCreateRequest(deckName, deckDesc, null, cards));
        assertNotNull(created.getId());

        // Read back from database
        DeckDetailResponse retrieved = deckService.getDeck(created.getId());
        assertEquals(deckName, retrieved.getName());
        assertEquals(deckDesc, retrieved.getDescription());
        assertEquals(2, retrieved.getCards().size());

        TermCardDto card1 = retrieved.getCards().stream().filter(c -> c.getTerm().equals("Xin chào")).findFirst().orElseThrow();
        assertEquals("Lời chào hỏi thân thiện bằng tiếng Việt", card1.getDefinition());
        assertEquals("/siŋ caːw˨˩/", card1.getPronunciation());
        assertEquals("Xin chào các bạn, chúc một ngày tốt lành!", card1.getExample());
        assertTrue(card1.getSynonyms().contains("chào"));

        TermCardDto card2 = retrieved.getCards().stream().filter(c -> c.getTerm().equals("Revenue")).findFirst().orElseThrow();
        assertEquals("Doanh thu tài chính của doanh nghiệp", card2.getDefinition());
        assertEquals("/ˈrev.ə.nuː/", card2.getPronunciation());
        assertEquals("Doanh thu thuần năm 2026 tăng trưởng vượt bậc.", card2.getExample());
        assertTrue(card2.getSynonyms().contains("thu nhập"));
    }
}
