package com.languagelearning.backend.deck.service;

import com.languagelearning.backend.common.exception.DeckNotFoundException;
import com.languagelearning.backend.common.exception.DuplicateTermException;
import com.languagelearning.backend.common.exception.FolderNotFoundException;
import com.languagelearning.backend.common.exception.ValidationException;
import com.languagelearning.backend.common.security.CurrentUserProvider;
import com.languagelearning.backend.deck.dto.DeckCreateRequest;
import com.languagelearning.backend.deck.dto.DeckDetailResponse;
import com.languagelearning.backend.deck.dto.DeckResponse;
import com.languagelearning.backend.deck.dto.DeckUpdateRequest;
import com.languagelearning.backend.deck.entity.VocabularySet;
import com.languagelearning.backend.deck.entity.VocabularySetItem;
import com.languagelearning.backend.deck.entity.VocabularySetItemId;
import com.languagelearning.backend.deck.repository.VocabularySetItemRepository;
import com.languagelearning.backend.deck.repository.VocabularySetRepository;
import com.languagelearning.backend.folder.entity.Folder;
import com.languagelearning.backend.folder.repository.FolderRepository;
import com.languagelearning.backend.term.dto.TermCardDto;
import com.languagelearning.backend.term.entity.Vocabulary;
import com.languagelearning.backend.term.entity.VocabularySynonym;
import com.languagelearning.backend.term.repository.VocabularyRepository;
import com.languagelearning.backend.term.repository.VocabularySynonymRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.*;
import java.util.stream.Collectors;

@Service
public class DeckService {

    private final VocabularySetRepository vocabularySetRepository;
    private final VocabularySetItemRepository vocabularySetItemRepository;
    private final VocabularyRepository vocabularyRepository;
    private final VocabularySynonymRepository vocabularySynonymRepository;
    private final FolderRepository folderRepository;
    private final CurrentUserProvider currentUserProvider;

    public DeckService(VocabularySetRepository vocabularySetRepository,
                       VocabularySetItemRepository vocabularySetItemRepository,
                       VocabularyRepository vocabularyRepository,
                       VocabularySynonymRepository vocabularySynonymRepository,
                       FolderRepository folderRepository,
                       CurrentUserProvider currentUserProvider) {
        this.vocabularySetRepository = vocabularySetRepository;
        this.vocabularySetItemRepository = vocabularySetItemRepository;
        this.vocabularyRepository = vocabularyRepository;
        this.vocabularySynonymRepository = vocabularySynonymRepository;
        this.folderRepository = folderRepository;
        this.currentUserProvider = currentUserProvider;
    }

    @Transactional
    public DeckDetailResponse createDeck(DeckCreateRequest request) {
        validateDeckName(request.getName());
        if (request.getCards() == null || request.getCards().isEmpty()) {
            throw new ValidationException("Bộ từ vựng cần có ít nhất 1 thẻ từ");
        }
        if (request.getCards().size() > 1000) {
            throw new ValidationException("Một bộ từ vựng không được vượt quá 1000 thẻ");
        }

        Long userId = currentUserProvider.getCurrentUserId();

        // Check folder ownership if folderId is provided
        if (request.getFolderId() != null) {
            folderRepository.findByIdAndUserId(request.getFolderId(), userId)
                    .orElseThrow(() -> new FolderNotFoundException(request.getFolderId()));
        }

        // Check duplicate terms within this deck
        checkDuplicateTermsInList(request.getCards());

        // Create deck
        VocabularySet deck = new VocabularySet(
                userId,
                request.getFolderId(),
                request.getName().trim(),
                request.getDescription() != null ? request.getDescription().trim() : null
        );
        VocabularySet savedDeck = vocabularySetRepository.save(deck);

        // Create vocabulary cards and synonyms
        List<TermCardDto> savedCardDtos = new ArrayList<>();
        for (TermCardDto cardDto : request.getCards()) {
            TermCardDto saved = createCardForDeck(savedDeck.getId(), cardDto);
            savedCardDtos.add(saved);
        }

        String folderName = getFolderName(savedDeck.getFolderId(), userId);
        return new DeckDetailResponse(
                savedDeck.getId(),
                savedDeck.getName(),
                savedDeck.getDescription(),
                savedDeck.getFolderId(),
                folderName,
                savedCardDtos,
                savedDeck.getCreatedAt(),
                savedDeck.getUpdatedAt()
        );
    }

    @Transactional
    public DeckDetailResponse updateDeck(Long deckId, DeckUpdateRequest request) {
        validateDeckName(request.getName());
        if (request.getCards() == null || request.getCards().isEmpty()) {
            throw new ValidationException("Bộ từ vựng cần có ít nhất 1 thẻ từ");
        }

        Long userId = currentUserProvider.getCurrentUserId();
        VocabularySet deck = vocabularySetRepository.findByIdAndUserId(deckId, userId)
                .orElseThrow(() -> new DeckNotFoundException(deckId));

        if (request.getFolderId() != null) {
            folderRepository.findByIdAndUserId(request.getFolderId(), userId)
                    .orElseThrow(() -> new FolderNotFoundException(request.getFolderId()));
        }

        // Check duplicate terms in updated list
        if (request.getCards() == null || request.getCards().isEmpty()) {
            throw new ValidationException("Bộ từ vựng cần có ít nhất 1 thẻ từ");
        }
        if (request.getCards().size() > 1000) {
            throw new ValidationException("Một bộ từ vựng không được vượt quá 1000 thẻ");
        }
        checkDuplicateTermsInList(request.getCards());

        deck.setName(request.getName().trim());
        deck.setDescription(request.getDescription() != null ? request.getDescription().trim() : null);
        deck.setFolderId(request.getFolderId());
        VocabularySet savedDeck = vocabularySetRepository.save(deck);

        // Existing items in this deck
        List<VocabularySetItem> currentItems = vocabularySetItemRepository.findByIdVocabularySetId(deckId);
        Set<Long> existingVocabIdsInDeck = currentItems.stream()
                .map(item -> item.getId().getVocabularyId())
                .collect(Collectors.toSet());

        Set<Long> retainedVocabIds = new HashSet<>();
        List<TermCardDto> updatedCardDtos = new ArrayList<>();

        for (TermCardDto cardDto : request.getCards()) {
            if (cardDto.getId() != null && existingVocabIdsInDeck.contains(cardDto.getId())) {
                // In-place update existing vocabulary row
                Vocabulary vocab = vocabularyRepository.findById(cardDto.getId())
                        .orElseThrow(() -> new ValidationException("Không tìm thấy thẻ từ với id: " + cardDto.getId()));

                vocab.setWord(cardDto.getTerm().trim());
                vocab.setMeaning(cardDto.getDefinition().trim());
                vocab.setWordType(cardDto.getPartOfSpeech() != null ? cardDto.getPartOfSpeech().trim() : null);
                vocab.setPronunciation(cardDto.getPronunciation() != null ? cardDto.getPronunciation().trim() : null);
                vocab.setExampleSentence(cardDto.getExample() != null ? cardDto.getExample().trim() : null);
                vocabularyRepository.save(vocab);

                // Update synonyms: remove existing and re-insert
                vocabularySynonymRepository.deleteByVocabularyId(vocab.getId());
                List<String> savedSynonyms = saveSynonyms(vocab.getId(), cardDto.getSynonyms());

                retainedVocabIds.add(vocab.getId());
                updatedCardDtos.add(new TermCardDto(
                        vocab.getId(),
                        vocab.getWord(),
                        vocab.getMeaning(),
                        vocab.getPronunciation(),
                        vocab.getWordType(),
                        vocab.getExampleSentence(),
                        savedSynonyms
                ));
            } else {
                // New card added during edit
                TermCardDto created = createCardForDeck(deckId, cardDto);
                retainedVocabIds.add(created.getId());
                updatedCardDtos.add(created);
            }
        }

        // Delete removed cards from deck and db
        for (Long vocabId : existingVocabIdsInDeck) {
            if (!retainedVocabIds.contains(vocabId)) {
                vocabularySetItemRepository.deleteById(new VocabularySetItemId(deckId, vocabId));
                vocabularySynonymRepository.deleteByVocabularyId(vocabId);
                vocabularyRepository.deleteById(vocabId);
            }
        }

        String folderName = getFolderName(savedDeck.getFolderId(), userId);
        return new DeckDetailResponse(
                savedDeck.getId(),
                savedDeck.getName(),
                savedDeck.getDescription(),
                savedDeck.getFolderId(),
                folderName,
                updatedCardDtos,
                savedDeck.getCreatedAt(),
                savedDeck.getUpdatedAt()
        );
    }

    @Transactional
    public void deleteDeck(Long deckId) {
        Long userId = currentUserProvider.getCurrentUserId();
        VocabularySet deck = vocabularySetRepository.findByIdAndUserId(deckId, userId)
                .orElseThrow(() -> new DeckNotFoundException(deckId));

        List<VocabularySetItem> items = vocabularySetItemRepository.findByIdVocabularySetId(deckId);
        for (VocabularySetItem item : items) {
            Long vocabId = item.getId().getVocabularyId();
            vocabularySynonymRepository.deleteByVocabularyId(vocabId);
            vocabularySetItemRepository.delete(item);
            vocabularyRepository.deleteById(vocabId);
        }
        vocabularySetRepository.delete(deck);
    }

    @Transactional
    public void moveDeck(Long deckId, Long targetFolderId) {
        Long userId = currentUserProvider.getCurrentUserId();
        VocabularySet deck = vocabularySetRepository.findByIdAndUserId(deckId, userId)
                .orElseThrow(() -> new DeckNotFoundException(deckId));

        if (targetFolderId != null) {
            folderRepository.findByIdAndUserId(targetFolderId, userId)
                    .orElseThrow(() -> new FolderNotFoundException(targetFolderId));
        }

        deck.setFolderId(targetFolderId);
        vocabularySetRepository.save(deck);
    }

    @Transactional(readOnly = true)
    public DeckDetailResponse getDeck(Long deckId) {
        Long userId = currentUserProvider.getCurrentUserId();
        VocabularySet deck = vocabularySetRepository.findByIdAndUserId(deckId, userId)
                .orElseThrow(() -> new DeckNotFoundException(deckId));

        List<Vocabulary> vocabularies = vocabularyRepository.findByDeckId(deckId);
        List<TermCardDto> cards = new ArrayList<>();
        for (Vocabulary vocab : vocabularies) {
            List<String> synonyms = vocabularySynonymRepository.findByVocabularyId(vocab.getId())
                    .stream()
                    .map(VocabularySynonym::getSynonym)
                    .collect(Collectors.toList());

            cards.add(new TermCardDto(
                    vocab.getId(),
                    vocab.getWord(),
                    vocab.getMeaning(),
                    vocab.getPronunciation(),
                    vocab.getWordType(),
                    vocab.getExampleSentence(),
                    synonyms
            ));
        }

        String folderName = getFolderName(deck.getFolderId(), userId);
        return new DeckDetailResponse(
                deck.getId(),
                deck.getName(),
                deck.getDescription(),
                deck.getFolderId(),
                folderName,
                cards,
                deck.getCreatedAt(),
                deck.getUpdatedAt()
        );
    }

    @Transactional(readOnly = true)
    public List<DeckResponse> listDecks(Long folderId, Boolean uncategorized, String search) {
        Long userId = currentUserProvider.getCurrentUserId();
        boolean isUncategorized = Boolean.TRUE.equals(uncategorized);
        String searchTrimmed = (search != null && !search.trim().isEmpty()) ? search.trim() : null;

        List<VocabularySet> decks = vocabularySetRepository.findByFolderFilter(
                userId,
                isUncategorized ? null : folderId,
                isUncategorized
        );

        if (searchTrimmed != null) {
            String lowerSearch = searchTrimmed.toLowerCase();
            decks = decks.stream()
                    .filter(d -> (d.getName() != null && d.getName().toLowerCase().contains(lowerSearch)) ||
                            (d.getDescription() != null && d.getDescription().toLowerCase().contains(lowerSearch)))
                    .collect(Collectors.toList());
        }

        Map<Long, String> folderNames = folderRepository.findByUserIdOrderByCreatedAtDesc(userId)
                .stream()
                .collect(Collectors.toMap(Folder::getId, Folder::getName));

        List<DeckResponse> responses = new ArrayList<>();
        for (VocabularySet deck : decks) {
            long cardCount = vocabularySetItemRepository.countByIdVocabularySetId(deck.getId());
            String folderName = deck.getFolderId() != null ? folderNames.get(deck.getFolderId()) : null;
            responses.add(new DeckResponse(
                    deck.getId(),
                    deck.getName(),
                    deck.getDescription(),
                    deck.getFolderId(),
                    folderName,
                    cardCount,
                    deck.getCreatedAt(),
                    deck.getUpdatedAt()
            ));
        }
        return responses;
    }

    private TermCardDto createCardForDeck(Long deckId, TermCardDto cardDto) {
        if (cardDto.getTerm() == null || cardDto.getTerm().trim().isEmpty()) {
            throw new ValidationException("Thuật ngữ không được để trống");
        }
        if (cardDto.getDefinition() == null || cardDto.getDefinition().trim().isEmpty()) {
            throw new ValidationException("Định nghĩa không được để trống");
        }

        Vocabulary vocab = new Vocabulary(
                cardDto.getTerm().trim(),
                cardDto.getDefinition().trim(),
                cardDto.getPartOfSpeech() != null ? cardDto.getPartOfSpeech().trim() : null,
                cardDto.getPronunciation() != null ? cardDto.getPronunciation().trim() : null,
                cardDto.getExample() != null ? cardDto.getExample().trim() : null
        );
        Vocabulary savedVocab = vocabularyRepository.save(vocab);

        vocabularySetItemRepository.save(new VocabularySetItem(deckId, savedVocab.getId()));
        List<String> savedSynonyms = saveSynonyms(savedVocab.getId(), cardDto.getSynonyms());

        return new TermCardDto(
                savedVocab.getId(),
                savedVocab.getWord(),
                savedVocab.getMeaning(),
                savedVocab.getPronunciation(),
                savedVocab.getWordType(),
                savedVocab.getExampleSentence(),
                savedSynonyms
        );
    }

    private List<String> saveSynonyms(Long vocabularyId, List<String> synonyms) {
        if (synonyms == null || synonyms.isEmpty()) {
            return Collections.emptyList();
        }
        Set<String> distinctLowerSynonyms = new HashSet<>();
        List<String> savedList = new ArrayList<>();
        for (String syn : synonyms) {
            if (syn != null && !syn.trim().isEmpty()) {
                String trimmed = syn.trim();
                String lower = trimmed.toLowerCase();
                if (!distinctLowerSynonyms.contains(lower)) {
                    distinctLowerSynonyms.add(lower);
                    vocabularySynonymRepository.save(new VocabularySynonym(vocabularyId, trimmed));
                    savedList.add(trimmed);
                }
            }
        }
        return savedList;
    }

    private void checkDuplicateTermsInList(List<TermCardDto> cards) {
        Set<String> seen = new HashSet<>();
        for (TermCardDto card : cards) {
            if (card.getTerm() != null) {
                String normalized = card.getTerm().trim().toLowerCase();
                if (!normalized.isEmpty()) {
                    if (seen.contains(normalized)) {
                        throw new DuplicateTermException(card.getTerm().trim());
                    }
                    seen.add(normalized);
                }
            }
        }
    }

    private void validateDeckName(String name) {
        if (name == null || name.trim().isEmpty()) {
            throw new ValidationException("Tên bộ từ vựng không được để trống");
        }
        if (name.trim().length() > 150) {
            throw new ValidationException("Tên bộ từ vựng tối đa 150 ký tự");
        }
    }

    private String getFolderName(Long folderId, Long userId) {
        if (folderId == null) {
            return null;
        }
        return folderRepository.findByIdAndUserId(folderId, userId)
                .map(Folder::getName)
                .orElse(null);
    }
}
