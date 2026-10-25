package com.languagelearning.backend.deck;

import com.languagelearning.backend.common.exception.DuplicateTermException;
import com.languagelearning.backend.common.exception.FolderNotFoundException;
import com.languagelearning.backend.common.security.CurrentUserProvider;
import com.languagelearning.backend.deck.dto.DeckCreateRequest;
import com.languagelearning.backend.deck.dto.DeckDetailResponse;
import com.languagelearning.backend.deck.dto.DeckUpdateRequest;
import com.languagelearning.backend.deck.entity.VocabularySet;
import com.languagelearning.backend.deck.entity.VocabularySetItem;
import com.languagelearning.backend.deck.repository.VocabularySetItemRepository;
import com.languagelearning.backend.deck.repository.VocabularySetRepository;
import com.languagelearning.backend.folder.entity.Folder;
import com.languagelearning.backend.folder.repository.FolderRepository;
import com.languagelearning.backend.deck.service.DeckService;
import com.languagelearning.backend.study.repository.StudyPlanDeckRepository;
import com.languagelearning.backend.term.dto.TermCardDto;
import com.languagelearning.backend.term.entity.Vocabulary;
import com.languagelearning.backend.term.entity.VocabularySynonym;
import com.languagelearning.backend.term.repository.VocabularyRepository;
import com.languagelearning.backend.term.repository.VocabularySynonymRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class DeckServiceTest {

    @Mock
    private VocabularySetRepository vocabularySetRepository;

    @Mock
    private VocabularySetItemRepository vocabularySetItemRepository;

    @Mock
    private VocabularyRepository vocabularyRepository;

    @Mock
    private VocabularySynonymRepository vocabularySynonymRepository;

    @Mock
    private FolderRepository folderRepository;

    @Mock
    private StudyPlanDeckRepository studyPlanDeckRepository;

    @Mock
    private CurrentUserProvider currentUserProvider;

    @InjectMocks
    private DeckService deckService;

    private final Long USER_ID = 1L;

    @BeforeEach
    void setUp() {
        lenient().when(currentUserProvider.getCurrentUserId()).thenReturn(USER_ID);
    }

    @Test
    @DisplayName("Tạo bộ từ vựng gắn vào thư mục thành công")
    void createDeck_WithFolder_Success() {
        Long folderId = 5L;
        Folder folder = new Folder(USER_ID, "Business");
        folder.setId(folderId);
        when(folderRepository.findByIdAndUserId(folderId, USER_ID)).thenReturn(Optional.of(folder));

        List<TermCardDto> cards = List.of(
                new TermCardDto(null, "Revenue", "Doanh thu", "/ˈrev.ə.nuː/", "noun", "Annual revenue increased.", List.of("income", "earnings"))
        );
        DeckCreateRequest request = new DeckCreateRequest("Financial Terms", "Key vocabulary", folderId, cards);

        VocabularySet savedDeck = new VocabularySet(USER_ID, folderId, "Financial Terms", "Key vocabulary");
        savedDeck.setId(100L);
        savedDeck.setCreatedAt(Instant.now());
        savedDeck.setUpdatedAt(Instant.now());
        when(vocabularySetRepository.save(any(VocabularySet.class))).thenReturn(savedDeck);

        Vocabulary savedVocab = new Vocabulary("Revenue", "Doanh thu", "noun", "/ˈrev.ə.nuː/", "Annual revenue increased.");
        savedVocab.setId(200L);
        when(vocabularyRepository.save(any(Vocabulary.class))).thenReturn(savedVocab);

        DeckDetailResponse response = deckService.createDeck(request);

        assertNotNull(response);
        assertEquals(100L, response.getId());
        assertEquals("Financial Terms", response.getName());
        assertEquals(folderId, response.getFolderId());
        assertEquals("Business", response.getFolderName());
        assertEquals(1, response.getCards().size());
        assertEquals("Revenue", response.getCards().get(0).getTerm());
        assertEquals(2, response.getCards().get(0).getSynonyms().size());

        verify(vocabularySetItemRepository).save(any(VocabularySetItem.class));
        verify(vocabularySynonymRepository, times(2)).save(any(VocabularySynonym.class));
    }

    @Test
    @DisplayName("Ném DuplicateTermException khi trùng từ trong cùng một Deck (khác hoa thường và thừa khoảng trắng)")
    void createDeck_DuplicateTermInSameDeck_ThrowsException() {
        List<TermCardDto> cards = List.of(
                new TermCardDto(null, "Apple", "Quả táo", null, "noun", null, null),
                new TermCardDto(null, "  apple  ", "Trái táo", null, "noun", null, null)
        );
        DeckCreateRequest request = new DeckCreateRequest("Fruits", null, null, cards);

        assertThrows(DuplicateTermException.class, () -> deckService.createDeck(request));
        verify(vocabularySetRepository, never()).save(any());
    }

    @Test
    @DisplayName("Cho phép tạo từ cùng tên ở 2 Deck khác nhau của cùng một user")
    void createDeck_SameTermInDifferentDeck_Allowed() {
        List<TermCardDto> cards1 = List.of(
                new TermCardDto(null, "Run", "Chạy", null, "verb", null, null)
        );
        DeckCreateRequest request1 = new DeckCreateRequest("Verbs Deck 1", null, null, cards1);

        VocabularySet savedDeck1 = new VocabularySet(USER_ID, null, "Verbs Deck 1", null);
        savedDeck1.setId(1L);
        when(vocabularySetRepository.save(any())).thenReturn(savedDeck1);
        when(vocabularyRepository.save(any())).thenReturn(new Vocabulary("Run", "Chạy", "verb", null, null));

        DeckDetailResponse response1 = deckService.createDeck(request1);
        assertNotNull(response1);

        // Deck 2 also has "Run"
        List<TermCardDto> cards2 = List.of(
                new TermCardDto(null, "Run", "Chạy", null, "verb", null, null)
        );
        DeckCreateRequest request2 = new DeckCreateRequest("Verbs Deck 2", null, null, cards2);
        VocabularySet savedDeck2 = new VocabularySet(USER_ID, null, "Verbs Deck 2", null);
        savedDeck2.setId(2L);
        when(vocabularySetRepository.save(any())).thenReturn(savedDeck2);

        DeckDetailResponse response2 = deckService.createDeck(request2);
        assertNotNull(response2);
    }

    @Test
    @DisplayName("Ném FolderNotFoundException khi gán Deck vào thư mục của người dùng khác")
    void createDeck_OtherUserFolder_ThrowsException() {
        Long otherFolderId = 999L;
        when(folderRepository.findByIdAndUserId(otherFolderId, USER_ID)).thenReturn(Optional.empty());

        List<TermCardDto> cards = List.of(
                new TermCardDto(null, "Book", "Sách", null, "noun", null, null)
        );
        DeckCreateRequest request = new DeckCreateRequest("My Deck", null, otherFolderId, cards);

        assertThrows(FolderNotFoundException.class, () -> deckService.createDeck(request));
        verify(vocabularySetRepository, never()).save(any());
    }

    @Test
    @DisplayName("Xóa Deck thành công: Xóa liên kết, xóa thẻ từ và từ đồng nghĩa")
    void deleteDeck_CascadesToCardsAndSynonyms() {
        Long deckId = 50L;
        VocabularySet deck = new VocabularySet(USER_ID, null, "Deck to delete", null);
        deck.setId(deckId);
        when(vocabularySetRepository.findByIdAndUserId(deckId, USER_ID)).thenReturn(Optional.of(deck));

        VocabularySetItem item = new VocabularySetItem(deckId, 301L);
        when(vocabularySetItemRepository.findByIdVocabularySetId(deckId)).thenReturn(List.of(item));

        deckService.deleteDeck(deckId);

        verify(vocabularySynonymRepository).deleteByVocabularyId(301L);
        verify(vocabularySetItemRepository).delete(item);
        verify(vocabularyRepository).deleteById(301L);
        verify(vocabularySetRepository).delete(deck);
    }

    @Test
    @DisplayName("Xóa Deck: Không xóa từ nếu từ đó vẫn được sử dụng bởi bộ từ khác")
    void deleteDeck_DoesNotDeleteCardIfSharedWithAnotherDeck() {
        Long deckId = 50L;
        VocabularySet deck = new VocabularySet(USER_ID, null, "Deck to delete", null);
        deck.setId(deckId);
        when(vocabularySetRepository.findByIdAndUserId(deckId, USER_ID)).thenReturn(Optional.of(deck));

        VocabularySetItem item = new VocabularySetItem(deckId, 301L);
        when(vocabularySetItemRepository.findByIdVocabularySetId(deckId)).thenReturn(List.of(item));
        when(vocabularySetItemRepository.existsByIdVocabularyId(301L)).thenReturn(true);

        deckService.deleteDeck(deckId);

        verify(vocabularySetItemRepository).delete(item);
        verify(vocabularySynonymRepository, never()).deleteByVocabularyId(301L);
        verify(vocabularyRepository, never()).deleteById(301L);
        verify(vocabularySetRepository).delete(deck);
    }
}
