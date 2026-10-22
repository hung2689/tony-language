package com.languagelearning.backend.folder;

import com.languagelearning.backend.common.exception.DuplicateFolderNameException;
import com.languagelearning.backend.common.exception.FolderNotFoundException;
import com.languagelearning.backend.common.security.CurrentUserProvider;
import com.languagelearning.backend.deck.entity.VocabularySet;
import com.languagelearning.backend.deck.repository.VocabularySetItemRepository;
import com.languagelearning.backend.deck.repository.VocabularySetRepository;
import com.languagelearning.backend.folder.dto.FolderCreateRequest;
import com.languagelearning.backend.folder.dto.FolderResponse;
import com.languagelearning.backend.folder.dto.FolderUpdateRequest;
import com.languagelearning.backend.folder.entity.Folder;
import com.languagelearning.backend.folder.repository.FolderRepository;
import com.languagelearning.backend.folder.service.FolderService;
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
import java.util.Collections;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class FolderServiceTest {

    @Mock
    private FolderRepository folderRepository;

    @Mock
    private VocabularySetRepository vocabularySetRepository;

    @Mock
    private VocabularySetItemRepository vocabularySetItemRepository;

    @Mock
    private VocabularyRepository vocabularyRepository;

    @Mock
    private VocabularySynonymRepository vocabularySynonymRepository;

    @Mock
    private CurrentUserProvider currentUserProvider;

    @InjectMocks
    private FolderService folderService;

    private final Long USER_ID = 1L;

    @BeforeEach
    void setUp() {
        lenient().when(currentUserProvider.getCurrentUserId()).thenReturn(USER_ID);
    }

    @Test
    @DisplayName("Tạo thư mục thành công với tên hợp lệ")
    void createFolder_Success() {
        FolderCreateRequest request = new FolderCreateRequest("TOEIC 2026");
        when(folderRepository.existsByUserIdAndNameIgnoreCase(USER_ID, "TOEIC 2026")).thenReturn(false);

        Folder saved = new Folder(USER_ID, "TOEIC 2026");
        saved.setId(10L);
        saved.setCreatedAt(Instant.now());
        saved.setUpdatedAt(Instant.now());
        when(folderRepository.save(any(Folder.class))).thenReturn(saved);

        FolderResponse response = folderService.createFolder(request);

        assertNotNull(response);
        assertEquals(10L, response.getId());
        assertEquals("TOEIC 2026", response.getName());
        assertEquals(0, response.getDeckCount());
        verify(folderRepository).save(any(Folder.class));
    }

    @Test
    @DisplayName("Ném DuplicateFolderNameException khi trùng tên thư mục (không phân biệt hoa thường và khoảng trắng)")
    void createFolder_DuplicateName_ThrowsException() {
        FolderCreateRequest request = new FolderCreateRequest("  toeic 2026  ");
        when(folderRepository.existsByUserIdAndNameIgnoreCase(USER_ID, "toeic 2026")).thenReturn(true);

        assertThrows(DuplicateFolderNameException.class, () -> folderService.createFolder(request));
        verify(folderRepository, never()).save(any(Folder.class));
    }

    @Test
    @DisplayName("Xóa thư mục chế độ setNull: chuyển các deck bên trong về Uncategorized (folderId = null)")
    void deleteFolder_ModeSetNull_MovesDecksToUncategorized() {
        Long folderId = 10L;
        Folder folder = new Folder(USER_ID, "IELTS");
        folder.setId(folderId);

        when(folderRepository.findByIdAndUserId(folderId, USER_ID)).thenReturn(Optional.of(folder));

        VocabularySet deck1 = new VocabularySet(USER_ID, folderId, "Deck 1", null);
        deck1.setId(101L);
        when(vocabularySetRepository.findByUserIdAndFolderIdOrderByCreatedAtDesc(USER_ID, folderId))
                .thenReturn(List.of(deck1));

        folderService.deleteFolder(folderId, "setNull");

        assertNull(deck1.getFolderId());
        verify(vocabularySetRepository).save(deck1);
        verify(folderRepository).delete(folder);
        verify(vocabularySetRepository, never()).delete(any());
    }

    @Test
    @DisplayName("Xóa thư mục chế độ deleteDecks: xóa toàn bộ deck bên trong và các thẻ từ liên quan")
    void deleteFolder_ModeDeleteDecks_DeletesDecksAndTerms() {
        Long folderId = 10L;
        Folder folder = new Folder(USER_ID, "IELTS");
        folder.setId(folderId);

        when(folderRepository.findByIdAndUserId(folderId, USER_ID)).thenReturn(Optional.of(folder));

        VocabularySet deck1 = new VocabularySet(USER_ID, folderId, "Deck 1", null);
        deck1.setId(101L);
        when(vocabularySetRepository.findByUserIdAndFolderIdOrderByCreatedAtDesc(USER_ID, folderId))
                .thenReturn(List.of(deck1));
        when(vocabularySetItemRepository.findByIdVocabularySetId(101L)).thenReturn(Collections.emptyList());

        folderService.deleteFolder(folderId, "deleteDecks");

        verify(vocabularySetRepository).deleteById(101L);
        verify(folderRepository).delete(folder);
    }

    @Test
    @DisplayName("Kiểm tra quyền sở hữu: Ném FolderNotFoundException khi truy cập thư mục của user khác")
    void ownershipCheck_CannotAccessOtherUserFolder() {
        Long otherFolderId = 999L;
        when(folderRepository.findByIdAndUserId(otherFolderId, USER_ID)).thenReturn(Optional.empty());

        assertThrows(FolderNotFoundException.class, () -> folderService.getFolder(otherFolderId));
        assertThrows(FolderNotFoundException.class, () -> folderService.renameFolder(otherFolderId, new FolderUpdateRequest("New Name")));
        assertThrows(FolderNotFoundException.class, () -> folderService.deleteFolder(otherFolderId, "setNull"));
    }
}
