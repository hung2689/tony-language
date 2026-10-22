package com.languagelearning.backend.folder.service;

import com.languagelearning.backend.common.exception.DuplicateFolderNameException;
import com.languagelearning.backend.common.exception.FolderNotFoundException;
import com.languagelearning.backend.common.exception.ValidationException;
import com.languagelearning.backend.common.security.CurrentUserProvider;
import com.languagelearning.backend.deck.entity.VocabularySet;
import com.languagelearning.backend.deck.entity.VocabularySetItem;
import com.languagelearning.backend.deck.repository.VocabularySetItemRepository;
import com.languagelearning.backend.deck.repository.VocabularySetRepository;
import com.languagelearning.backend.folder.dto.FolderCreateRequest;
import com.languagelearning.backend.folder.dto.FolderResponse;
import com.languagelearning.backend.folder.dto.FolderUpdateRequest;
import com.languagelearning.backend.folder.entity.Folder;
import com.languagelearning.backend.folder.repository.FolderRepository;
import com.languagelearning.backend.term.repository.VocabularyRepository;
import com.languagelearning.backend.term.repository.VocabularySynonymRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.List;

@Service
public class FolderService {

    private final FolderRepository folderRepository;
    private final VocabularySetRepository vocabularySetRepository;
    private final VocabularySetItemRepository vocabularySetItemRepository;
    private final VocabularyRepository vocabularyRepository;
    private final VocabularySynonymRepository vocabularySynonymRepository;
    private final CurrentUserProvider currentUserProvider;

    public FolderService(FolderRepository folderRepository,
                         VocabularySetRepository vocabularySetRepository,
                         VocabularySetItemRepository vocabularySetItemRepository,
                         VocabularyRepository vocabularyRepository,
                         VocabularySynonymRepository vocabularySynonymRepository,
                         CurrentUserProvider currentUserProvider) {
        this.folderRepository = folderRepository;
        this.vocabularySetRepository = vocabularySetRepository;
        this.vocabularySetItemRepository = vocabularySetItemRepository;
        this.vocabularyRepository = vocabularyRepository;
        this.vocabularySynonymRepository = vocabularySynonymRepository;
        this.currentUserProvider = currentUserProvider;
    }

    @Transactional
    public FolderResponse createFolder(FolderCreateRequest request) {
        if (request == null || request.getName() == null || request.getName().trim().isEmpty()) {
            throw new ValidationException("Tên thư mục không được để trống");
        }
        String trimmedName = request.getName().trim();
        if (trimmedName.length() > 100) {
            throw new ValidationException("Tên thư mục không được vượt quá 100 ký tự");
        }

        Long userId = currentUserProvider.getCurrentUserId();
        if (folderRepository.existsByUserIdAndNameIgnoreCase(userId, trimmedName)) {
            throw new DuplicateFolderNameException(trimmedName);
        }

        Folder folder = new Folder(userId, trimmedName);
        Folder saved = folderRepository.save(folder);
        return new FolderResponse(saved.getId(), saved.getName(), 0, saved.getCreatedAt(), saved.getUpdatedAt());
    }

    @Transactional(readOnly = true)
    public List<FolderResponse> getFolders() {
        Long userId = currentUserProvider.getCurrentUserId();
        List<Folder> folders = folderRepository.findByUserIdOrderByCreatedAtDesc(userId);
        List<FolderResponse> responses = new ArrayList<>();
        for (Folder folder : folders) {
            long deckCount = vocabularySetRepository.countByFolderId(folder.getId());
            responses.add(new FolderResponse(
                    folder.getId(),
                    folder.getName(),
                    deckCount,
                    folder.getCreatedAt(),
                    folder.getUpdatedAt()
            ));
        }
        return responses;
    }

    @Transactional(readOnly = true)
    public FolderResponse getFolder(Long folderId) {
        Long userId = currentUserProvider.getCurrentUserId();
        Folder folder = folderRepository.findByIdAndUserId(folderId, userId)
                .orElseThrow(() -> new FolderNotFoundException(folderId));
        long deckCount = vocabularySetRepository.countByFolderId(folder.getId());
        return new FolderResponse(folder.getId(), folder.getName(), deckCount, folder.getCreatedAt(), folder.getUpdatedAt());
    }

    @Transactional
    public FolderResponse renameFolder(Long folderId, FolderUpdateRequest request) {
        if (request == null || request.getName() == null || request.getName().trim().isEmpty()) {
            throw new ValidationException("Tên thư mục không được để trống");
        }
        String trimmedName = request.getName().trim();
        if (trimmedName.length() > 100) {
            throw new ValidationException("Tên thư mục không được vượt quá 100 ký tự");
        }

        Long userId = currentUserProvider.getCurrentUserId();
        Folder folder = folderRepository.findByIdAndUserId(folderId, userId)
                .orElseThrow(() -> new FolderNotFoundException(folderId));

        if (!folder.getName().equalsIgnoreCase(trimmedName)) {
            if (folderRepository.existsByUserIdAndNameIgnoreCase(userId, trimmedName)) {
                throw new DuplicateFolderNameException(trimmedName);
            }
        }

        folder.setName(trimmedName);
        Folder saved = folderRepository.save(folder);
        long deckCount = vocabularySetRepository.countByFolderId(saved.getId());
        return new FolderResponse(saved.getId(), saved.getName(), deckCount, saved.getCreatedAt(), saved.getUpdatedAt());
    }

    @Transactional
    public void deleteFolder(Long folderId, String mode) {
        Long userId = currentUserProvider.getCurrentUserId();
        Folder folder = folderRepository.findByIdAndUserId(folderId, userId)
                .orElseThrow(() -> new FolderNotFoundException(folderId));

        List<VocabularySet> decksInFolder = vocabularySetRepository.findByUserIdAndFolderIdOrderByCreatedAtDesc(userId, folderId);

        if ("deleteDecks".equalsIgnoreCase(mode)) {
            // Delete all decks inside this folder and all their terms
            for (VocabularySet deck : decksInFolder) {
                deleteDeckAndItsTerms(deck.getId());
            }
        } else {
            // Default "setNull": move decks to Uncategorized
            for (VocabularySet deck : decksInFolder) {
                deck.setFolderId(null);
                vocabularySetRepository.save(deck);
            }
        }

        folderRepository.delete(folder);
    }

    private void deleteDeckAndItsTerms(Long deckId) {
        List<VocabularySetItem> items = vocabularySetItemRepository.findByIdVocabularySetId(deckId);
        for (VocabularySetItem item : items) {
            Long vocabId = item.getId().getVocabularyId();
            vocabularySynonymRepository.deleteByVocabularyId(vocabId);
            vocabularySetItemRepository.delete(item);
            vocabularyRepository.deleteById(vocabId);
        }
        vocabularySetRepository.deleteById(deckId);
    }
}
