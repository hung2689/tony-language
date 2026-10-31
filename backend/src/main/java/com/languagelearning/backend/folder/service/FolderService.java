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
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.Collections;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
public class FolderService {

    private final FolderRepository folderRepository;
    private final VocabularySetRepository vocabularySetRepository;
    private final VocabularySetItemRepository vocabularySetItemRepository;
    private final VocabularyRepository vocabularyRepository;
    private final VocabularySynonymRepository vocabularySynonymRepository;
    private final CurrentUserProvider currentUserProvider;

    @Autowired(required = false)
    private JdbcTemplate jdbcTemplate;

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
        if (folders.isEmpty()) {
            return Collections.emptyList();
        }

        Map<Long, Long> deckCountMap = new HashMap<>();
        List<Object[]> countRows = vocabularySetRepository.countByUserIdGroupByFolderId(userId);
        if (countRows != null) {
            for (Object[] row : countRows) {
                if (row != null && row.length >= 2 && row[0] != null && row[1] != null) {
                    deckCountMap.put(((Number) row[0]).longValue(), ((Number) row[1]).longValue());
                }
            }
        }

        List<FolderResponse> responses = new ArrayList<>(folders.size());
        for (Folder folder : folders) {
            long deckCount = deckCountMap.getOrDefault(folder.getId(), 0L);
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

        if (jdbcTemplate != null) {
            if ("deleteDecks".equalsIgnoreCase(mode)) {
                jdbcTemplate.update(
                        "DELETE FROM vocabularies v " +
                        "USING vocabulary_set_items vsi, vocabulary_sets vs " +
                        "WHERE v.id = vsi.vocabulary_id " +
                        "  AND vsi.vocabulary_set_id = vs.id " +
                        "  AND vs.user_id = ? AND vs.folder_id = ? " +
                        "  AND NOT EXISTS (" +
                        "      SELECT 1 FROM vocabulary_set_items vsi2 " +
                        "      JOIN vocabulary_sets vs2 ON vsi2.vocabulary_set_id = vs2.id " +
                        "      WHERE vsi2.vocabulary_id = v.id " +
                        "        AND (vs2.folder_id IS NULL OR vs2.folder_id <> ?)" +
                        "  )",
                        userId, folderId, folderId
                );
                jdbcTemplate.update(
                        "DELETE FROM vocabulary_sets WHERE user_id = ? AND folder_id = ?",
                        userId, folderId
                );
            } else {
                jdbcTemplate.update(
                        "UPDATE vocabulary_sets SET folder_id = NULL, updated_at = CURRENT_TIMESTAMP WHERE user_id = ? AND folder_id = ?",
                        userId, folderId
                );
            }
            folderRepository.delete(folder);
            return;
        }

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
