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
import com.languagelearning.backend.study.repository.StudyPlanDeckRepository;
import com.languagelearning.backend.term.dto.TermCardDto;
import com.languagelearning.backend.term.entity.Vocabulary;
import com.languagelearning.backend.term.entity.VocabularySynonym;
import com.languagelearning.backend.term.repository.VocabularyRepository;
import com.languagelearning.backend.term.repository.VocabularySynonymRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.jdbc.core.JdbcTemplate;
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
    private final StudyPlanDeckRepository studyPlanDeckRepository;

    @Autowired(required = false)
    private JdbcTemplate jdbcTemplate;

    public DeckService(VocabularySetRepository vocabularySetRepository,
                       VocabularySetItemRepository vocabularySetItemRepository,
                       VocabularyRepository vocabularyRepository,
                       VocabularySynonymRepository vocabularySynonymRepository,
                       FolderRepository folderRepository,
                       CurrentUserProvider currentUserProvider,
                       StudyPlanDeckRepository studyPlanDeckRepository) {
        this.vocabularySetRepository = vocabularySetRepository;
        this.vocabularySetItemRepository = vocabularySetItemRepository;
        this.vocabularyRepository = vocabularyRepository;
        this.vocabularySynonymRepository = vocabularySynonymRepository;
        this.folderRepository = folderRepository;
        this.currentUserProvider = currentUserProvider;
        this.studyPlanDeckRepository = studyPlanDeckRepository;
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

        // Check folder ownership if folderId is provided and reuse folderName
        String folderName = null;
        if (request.getFolderId() != null) {
            Folder folder = folderRepository.findByIdAndUserId(request.getFolderId(), userId)
                    .orElseThrow(() -> new FolderNotFoundException(request.getFolderId()));
            folderName = folder.getName();
        }

        // Check duplicate terms and validate card fields upfront
        checkDuplicateTermsInList(request.getCards());
        validateCardsNotEmpty(request.getCards());

        // Create deck
        VocabularySet deck = new VocabularySet(
                userId,
                request.getFolderId(),
                request.getName().trim(),
                request.getDescription() != null ? request.getDescription().trim() : null
        );
        VocabularySet savedDeck = vocabularySetRepository.save(deck);

        // Batch create vocabulary cards, set items, and synonyms
        List<TermCardDto> savedCardDtos = createCardsForDeckBatch(savedDeck.getId(), request.getCards());

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
        if (request.getCards().size() > 1000) {
            throw new ValidationException("Một bộ từ vựng không được vượt quá 1000 thẻ");
        }

        Long userId = currentUserProvider.getCurrentUserId();
        VocabularySet deck = vocabularySetRepository.findByIdAndUserId(deckId, userId)
                .orElseThrow(() -> new DeckNotFoundException(deckId));

        String folderName = null;
        if (request.getFolderId() != null) {
            Folder folder = folderRepository.findByIdAndUserId(request.getFolderId(), userId)
                    .orElseThrow(() -> new FolderNotFoundException(request.getFolderId()));
            folderName = folder.getName();
        }

        checkDuplicateTermsInList(request.getCards());
        validateCardsNotEmpty(request.getCards());

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
        List<TermCardDto> updatedCardDtos = new ArrayList<>(request.getCards().size());
        List<Integer> newCardIndices = new ArrayList<>();
        List<TermCardDto> newCardsToInsert = new ArrayList<>();

        for (int i = 0; i < request.getCards().size(); i++) {
            TermCardDto cardDto = request.getCards().get(i);
            if (cardDto.getId() != null && existingVocabIdsInDeck.contains(cardDto.getId())) {
                Vocabulary vocab = vocabularyRepository.findById(cardDto.getId())
                        .orElseThrow(() -> new ValidationException("Không tìm thấy thẻ từ với id: " + cardDto.getId()));

                vocab.setWord(cardDto.getTerm().trim());
                vocab.setMeaning(cardDto.getDefinition().trim());
                vocab.setWordType(cardDto.getPartOfSpeech() != null ? cardDto.getPartOfSpeech().trim() : null);
                vocab.setPronunciation(cardDto.getPronunciation() != null ? cardDto.getPronunciation().trim() : null);
                vocab.setExampleSentence(cardDto.getExample() != null ? cardDto.getExample().trim() : null);
                vocabularyRepository.save(vocab);

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
                updatedCardDtos.add(null);
                newCardIndices.add(i);
                newCardsToInsert.add(cardDto);
            }
        }

        if (!newCardsToInsert.isEmpty()) {
            List<TermCardDto> createdBatch = createCardsForDeckBatch(deckId, newCardsToInsert);
            for (int idx = 0; idx < createdBatch.size(); idx++) {
                TermCardDto created = createdBatch.get(idx);
                retainedVocabIds.add(created.getId());
                updatedCardDtos.set(newCardIndices.get(idx), created);
            }
        }

        // Delete removed cards from deck and db (preserving cards shared with other decks)
        List<Long> removedVocabIds = existingVocabIdsInDeck.stream()
                .filter(id -> !retainedVocabIds.contains(id))
                .collect(Collectors.toList());

        if (!removedVocabIds.isEmpty()) {
            deleteCardsFromDeckBatch(deckId, removedVocabIds);
        }

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

        if (jdbcTemplate != null) {
            // 1. Bulk-delete all vocabularies in this deck that are not shared with any other deck.
            // PostgreSQL ON DELETE CASCADE automatically deletes vocabulary_synonyms, vocabulary_set_items,
            // study_progress, and study_answers in the same round-trip.
            jdbcTemplate.update(
                    "DELETE FROM vocabularies v " +
                    "USING vocabulary_set_items vsi " +
                    "WHERE v.id = vsi.vocabulary_id " +
                    "  AND vsi.vocabulary_set_id = ? " +
                    "  AND NOT EXISTS (" +
                    "      SELECT 1 FROM vocabulary_set_items vsi2 " +
                    "      WHERE vsi2.vocabulary_id = v.id " +
                    "        AND vsi2.vocabulary_set_id <> ?" +
                    "  )",
                    deckId, deckId
            );
            // 2. Clean up any remaining set items (for shared vocabularies) and study plan associations
            jdbcTemplate.update("DELETE FROM vocabulary_set_items WHERE vocabulary_set_id = ?", deckId);
            jdbcTemplate.update("DELETE FROM study_plan_decks WHERE deck_id = ?", deckId);
            vocabularySetRepository.delete(deck);
            return;
        }

        List<VocabularySetItem> items = vocabularySetItemRepository.findByIdVocabularySetId(deckId);
        for (VocabularySetItem item : items) {
            Long vocabId = item.getId().getVocabularyId();
            vocabularySetItemRepository.delete(item);

            // Only delete vocabulary and synonyms if not shared by any other deck
            boolean stillUsedInOtherDeck = vocabularySetItemRepository.existsByIdVocabularyId(vocabId);
            if (!stillUsedInOtherDeck) {
                vocabularySynonymRepository.deleteByVocabularyId(vocabId);
                vocabularyRepository.deleteById(vocabId);
            }
        }
        // Clean up associations in study plans
        studyPlanDeckRepository.deleteByDeckId(deckId);

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
        Map<Long, List<String>> synonymsByVocabId = new HashMap<>();

        if (!vocabularies.isEmpty()) {
            List<Long> vocabIds = vocabularies.stream()
                    .map(Vocabulary::getId)
                    .collect(Collectors.toList());
            List<VocabularySynonym> allSynonyms = vocabularySynonymRepository.findByVocabularyIdIn(vocabIds);
            if (allSynonyms != null) {
                for (VocabularySynonym syn : allSynonyms) {
                    synonymsByVocabId
                            .computeIfAbsent(syn.getVocabularyId(), k -> new ArrayList<>())
                            .add(syn.getSynonym());
                }
            }
        }

        List<TermCardDto> cards = new ArrayList<>(vocabularies.size());
        for (Vocabulary vocab : vocabularies) {
            List<String> synonyms = synonymsByVocabId.getOrDefault(vocab.getId(), Collections.emptyList());
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

        if (decks.isEmpty()) {
            return Collections.emptyList();
        }

        Map<Long, String> folderNames = folderRepository.findByUserIdOrderByCreatedAtDesc(userId)
                .stream()
                .collect(Collectors.toMap(Folder::getId, Folder::getName));

        List<Long> deckIds = decks.stream().map(VocabularySet::getId).collect(Collectors.toList());
        Map<Long, Long> cardCountMap = new HashMap<>();
        List<Object[]> countRows = vocabularySetItemRepository.countByVocabularySetIds(deckIds);
        if (countRows != null) {
            for (Object[] row : countRows) {
                if (row != null && row.length >= 2 && row[0] != null && row[1] != null) {
                    cardCountMap.put(((Number) row[0]).longValue(), ((Number) row[1]).longValue());
                }
            }
        }

        List<DeckResponse> responses = new ArrayList<>(decks.size());
        for (VocabularySet deck : decks) {
            long cardCount = cardCountMap.getOrDefault(deck.getId(), 0L);
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

    private void validateCardsNotEmpty(List<TermCardDto> cards) {
        for (TermCardDto cardDto : cards) {
            if (cardDto.getTerm() == null || cardDto.getTerm().trim().isEmpty()) {
                throw new ValidationException("Thuật ngữ không được để trống");
            }
            if (cardDto.getDefinition() == null || cardDto.getDefinition().trim().isEmpty()) {
                throw new ValidationException("Định nghĩa không được để trống");
            }
        }
    }

    private List<TermCardDto> createCardsForDeckBatch(Long deckId, List<TermCardDto> cards) {
        if (cards == null || cards.isEmpty()) {
            return Collections.emptyList();
        }

        if (jdbcTemplate != null) {
            // 1. Single multi-row INSERT into vocabularies with RETURNING id
            StringBuilder vocabSql = new StringBuilder(
                    "INSERT INTO vocabularies (word, meaning, word_type, pronunciation, example_sentence, created_at, updated_at) VALUES "
            );
            List<Object> vocabParams = new ArrayList<>(cards.size() * 5);
            for (int i = 0; i < cards.size(); i++) {
                if (i > 0) vocabSql.append(", ");
                vocabSql.append("(?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)");
                TermCardDto c = cards.get(i);
                vocabParams.add(c.getTerm().trim());
                vocabParams.add(c.getDefinition().trim());
                vocabParams.add(c.getPartOfSpeech() != null ? c.getPartOfSpeech().trim() : null);
                vocabParams.add(c.getPronunciation() != null ? c.getPronunciation().trim() : null);
                vocabParams.add(c.getExample() != null ? c.getExample().trim() : null);
            }
            vocabSql.append(" RETURNING id");

            List<Long> insertedVocabIds = jdbcTemplate.query(
                    vocabSql.toString(),
                    (rs, rowNum) -> rs.getLong(1),
                    vocabParams.toArray()
            );

            // 2. Single multi-row INSERT into vocabulary_set_items
            StringBuilder itemSql = new StringBuilder(
                    "INSERT INTO vocabulary_set_items (vocabulary_set_id, vocabulary_id) VALUES "
            );
            List<Object> itemParams = new ArrayList<>(insertedVocabIds.size() * 2);
            for (int i = 0; i < insertedVocabIds.size(); i++) {
                if (i > 0) itemSql.append(", ");
                itemSql.append("(?, ?)");
                itemParams.add(deckId);
                itemParams.add(insertedVocabIds.get(i));
            }
            itemSql.append(" ON CONFLICT DO NOTHING");
            jdbcTemplate.update(itemSql.toString(), itemParams.toArray());

            // 3. Single multi-row INSERT into vocabulary_synonyms (if any)
            StringBuilder synSql = new StringBuilder(
                    "INSERT INTO vocabulary_synonyms (vocabulary_id, synonym) VALUES "
            );
            List<Object> synParams = new ArrayList<>();
            List<List<String>> cardSavedSynonyms = new ArrayList<>(cards.size());
            int synCount = 0;

            for (int i = 0; i < cards.size(); i++) {
                Long vocabId = insertedVocabIds.get(i);
                List<String> deduplicated = normalizeSynonyms(cards.get(i).getSynonyms());
                cardSavedSynonyms.add(deduplicated);
                for (String syn : deduplicated) {
                    if (synCount > 0) synSql.append(", ");
                    synSql.append("(?, ?)");
                    synParams.add(vocabId);
                    synParams.add(syn);
                    synCount++;
                }
            }
            if (synCount > 0) {
                synSql.append(" ON CONFLICT DO NOTHING");
                jdbcTemplate.update(synSql.toString(), synParams.toArray());
            }

            List<TermCardDto> results = new ArrayList<>(cards.size());
            for (int i = 0; i < cards.size(); i++) {
                TermCardDto c = cards.get(i);
                results.add(new TermCardDto(
                        insertedVocabIds.get(i),
                        c.getTerm().trim(),
                        c.getDefinition().trim(),
                        c.getPronunciation() != null ? c.getPronunciation().trim() : null,
                        c.getPartOfSpeech() != null ? c.getPartOfSpeech().trim() : null,
                        c.getExample() != null ? c.getExample().trim() : null,
                        cardSavedSynonyms.get(i)
                ));
            }
            return results;
        }

        // Fallback for unit tests without JdbcTemplate
        List<TermCardDto> savedCardDtos = new ArrayList<>(cards.size());
        for (TermCardDto cardDto : cards) {
            savedCardDtos.add(createCardForDeck(deckId, cardDto));
        }
        return savedCardDtos;
    }

    private void deleteCardsFromDeckBatch(Long deckId, List<Long> removedVocabIds) {
        if (removedVocabIds == null || removedVocabIds.isEmpty()) {
            return;
        }
        if (jdbcTemplate != null) {
            String placeholders = removedVocabIds.stream().map(id -> "?").collect(Collectors.joining(", "));

            // 1. Delete links from this deck
            List<Object> deleteItemParams = new ArrayList<>(removedVocabIds.size() + 1);
            deleteItemParams.add(deckId);
            deleteItemParams.addAll(removedVocabIds);
            jdbcTemplate.update(
                    "DELETE FROM vocabulary_set_items WHERE vocabulary_set_id = ? AND vocabulary_id IN (" + placeholders + ")",
                    deleteItemParams.toArray()
            );

            // 2. Delete vocabularies not used in any other deck (cascades to synonyms)
            jdbcTemplate.update(
                    "DELETE FROM vocabularies v " +
                    "WHERE v.id IN (" + placeholders + ") " +
                    "  AND NOT EXISTS (" +
                    "      SELECT 1 FROM vocabulary_set_items vsi WHERE vsi.vocabulary_id = v.id" +
                    "  )",
                    removedVocabIds.toArray()
            );
            return;
        }

        for (Long vocabId : removedVocabIds) {
            vocabularySetItemRepository.deleteById(new VocabularySetItemId(deckId, vocabId));
            boolean stillUsedInOtherDeck = vocabularySetItemRepository.existsByIdVocabularyId(vocabId);
            if (!stillUsedInOtherDeck) {
                vocabularySynonymRepository.deleteByVocabularyId(vocabId);
                vocabularyRepository.deleteById(vocabId);
            }
        }
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

    private List<String> normalizeSynonyms(List<String> synonyms) {
        if (synonyms == null || synonyms.isEmpty()) {
            return Collections.emptyList();
        }
        Set<String> distinctLowerSynonyms = new HashSet<>();
        List<String> normalized = new ArrayList<>();
        for (String syn : synonyms) {
            if (syn != null && !syn.trim().isEmpty()) {
                String trimmed = syn.trim();
                String lower = trimmed.toLowerCase();
                if (!distinctLowerSynonyms.contains(lower)) {
                    distinctLowerSynonyms.add(lower);
                    normalized.add(trimmed);
                }
            }
        }
        return normalized;
    }

    private List<String> saveSynonyms(Long vocabularyId, List<String> synonyms) {
        List<String> normalized = normalizeSynonyms(synonyms);
        for (String syn : normalized) {
            vocabularySynonymRepository.save(new VocabularySynonym(vocabularyId, syn));
        }
        return normalized;
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
