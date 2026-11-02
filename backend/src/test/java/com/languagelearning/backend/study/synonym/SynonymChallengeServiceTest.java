package com.languagelearning.backend.study.synonym;

import com.languagelearning.backend.deck.entity.VocabularySet;
import com.languagelearning.backend.deck.entity.VocabularySetItem;
import com.languagelearning.backend.deck.repository.VocabularySetItemRepository;
import com.languagelearning.backend.deck.repository.VocabularySetRepository;
import com.languagelearning.backend.study.entity.StudyProgress;
import com.languagelearning.backend.study.repository.StudyProgressRepository;
import com.languagelearning.backend.study.sentence.gemini.GeminiSentenceService;
import com.languagelearning.backend.study.synonym.dto.*;
import com.languagelearning.backend.study.synonym.entity.SynonymChallengeHistory;
import com.languagelearning.backend.study.synonym.repository.SynonymChallengeHistoryRepository;
import com.languagelearning.backend.term.entity.Vocabulary;
import com.languagelearning.backend.term.entity.VocabularySynonym;
import com.languagelearning.backend.term.repository.VocabularyRepository;
import com.languagelearning.backend.term.repository.VocabularySynonymRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.*;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class SynonymChallengeServiceTest {

    @Mock
    private VocabularyRepository vocabularyRepository;
    @Mock
    private VocabularySetRepository vocabularySetRepository;
    @Mock
    private VocabularySetItemRepository vocabularySetItemRepository;
    @Mock
    private VocabularySynonymRepository vocabularySynonymRepository;
    @Mock
    private StudyProgressRepository studyProgressRepository;
    @Mock
    private SynonymChallengeHistoryRepository historyRepository;
    @Mock
    private GeminiSentenceService geminiSentenceService;

    private SynonymChallengeService service;

    @BeforeEach
    void setUp() {
        service = new SynonymChallengeService(
                vocabularyRepository,
                vocabularySetRepository,
                vocabularySetItemRepository,
                vocabularySynonymRepository,
                studyProgressRepository,
                historyRepository,
                geminiSentenceService
        );
    }

    @Test
    void getDeckSynonymQueue_PrioritizesWeakWordsAndDbSynonyms() {
        Long userId = 1L;
        Long deckId = 10L;

        VocabularySet deck = new VocabularySet();
        deck.setId(deckId);
        deck.setUserId(userId);
        when(vocabularySetRepository.findByIdAndUserId(deckId, userId)).thenReturn(Optional.of(deck));

        Vocabulary v1 = new Vocabulary("masteredWord", "đã thuộc", "noun", null, null);
        v1.setId(101L);
        Vocabulary v2 = new Vocabulary("weakWord", "từ yếu", "verb", null, null);
        v2.setId(102L);
        Vocabulary v3 = new Vocabulary("unreviewedWord", "chưa học", "adj", null, null);
        v3.setId(103L);

        when(vocabularyRepository.findByDeckId(deckId)).thenReturn(List.of(v1, v2, v3));

        StudyProgress spMastered = new StudyProgress(userId, 101L);
        spMastered.setMemoryLevel(5);
        spMastered.setCorrectCount(10);
        spMastered.setWrongCount(1);

        StudyProgress spWeak = new StudyProgress(userId, 102L);
        spWeak.setMemoryLevel(1);
        spWeak.setCorrectCount(2);
        spWeak.setWrongCount(6); // Weak

        when(studyProgressRepository.findByUserIdAndVocabularyIdIn(eq(userId), anyCollection()))
                .thenReturn(List.of(spMastered, spWeak));

        when(vocabularySynonymRepository.findByVocabularyIdIn(anyList()))
                .thenReturn(List.of(new VocabularySynonym(102L, "feeble")));

        List<SynonymChallengeItemDto> queue = service.getDeckSynonymQueue(userId, deckId, 5);

        assertNotNull(queue);
        assertEquals(3, queue.size());
        // Weak word should be #1
        assertEquals("weakWord", queue.get(0).getTerm());
        // Unreviewed word should be #2
        assertEquals("unreviewedWord", queue.get(1).getTerm());
        // Mastered word should be last
        assertEquals("masteredWord", queue.get(2).getTerm());
    }

    @Test
    void evaluateChallenge_AiFallback_WhenGeminiUnavailable() {
        Long userId = 1L;
        Long deckId = 10L;
        Long vocabId = 101L;

        Vocabulary vocab = new Vocabulary("fast", "nhanh", "adjective", "/fæst/", "He is fast.");
        vocab.setId(vocabId);
        when(vocabularyRepository.findById(vocabId)).thenReturn(Optional.of(vocab));
        when(geminiSentenceService.isAvailable(any())).thenReturn(false);

        when(vocabularySynonymRepository.findByVocabularyId(vocabId)).thenReturn(List.of(
                new VocabularySynonym(vocabId, "quick"),
                new VocabularySynonym(vocabId, "rapid")
        ));
        when(vocabularyRepository.findByDeckId(deckId)).thenReturn(List.of(vocab));

        SynonymEvaluateRequest req = new SynonymEvaluateRequest(deckId, vocabId, "fast", List.of("quick", "slow"), null);
        SynonymEvaluateResponse resp = service.evaluateChallenge(userId, req, null);

        assertNotNull(resp);
        assertEquals("LOCAL_FALLBACK", resp.getEvaluationMode());
        assertNotNull(resp.getWarningMessage());
        assertEquals(2, resp.getTotalSubmitted());
        assertEquals(1, resp.getValidCount());
        assertEquals(1, resp.getInvalidCount());

        // "quick" matches DB
        EvaluatedWordDto qWord = resp.getEvaluatedWords().stream().filter(w -> w.getWord().equalsIgnoreCase("quick")).findFirst().orElse(null);
        assertNotNull(qWord);
        assertTrue(qWord.isValid());
        assertEquals("DATABASE", qWord.getSource());

        // "slow" is invalid in fallback
        EvaluatedWordDto sWord = resp.getEvaluatedWords().stream().filter(w -> w.getWord().equalsIgnoreCase("slow")).findFirst().orElse(null);
        assertNotNull(sWord);
        assertFalse(sWord.isValid());
        assertEquals("FALLBACK", sWord.getSource());

        // "rapid" was missed
        assertEquals(1, resp.getMissedSynonyms().size());
        assertEquals("rapid", resp.getMissedSynonyms().get(0).getWord());

        verify(historyRepository, times(1)).save(any(SynonymChallengeHistory.class));
    }

    @Test
    void evaluateChallenge_DualLayer_OverridesAiFalseIfDbMatches() {
        Long userId = 1L;
        Long deckId = 10L;
        Long vocabId = 101L;

        Vocabulary vocab = new Vocabulary("huge", "khổng lồ", "adjective", "/hjuːdʒ/", null);
        vocab.setId(vocabId);
        when(vocabularyRepository.findById(vocabId)).thenReturn(Optional.of(vocab));
        when(geminiSentenceService.isAvailable(any())).thenReturn(true);

        when(vocabularySynonymRepository.findByVocabularyId(vocabId)).thenReturn(List.of(
                new VocabularySynonym(vocabId, "enormous")
        ));
        when(vocabularyRepository.findByDeckId(deckId)).thenReturn(List.of(vocab));

        // Mock Gemini returning JSON where enormous was mistakenly marked false
        String mockGeminiJson = """
        {
          "evaluatedWords": [
            { "word": "enormous", "isValid": false, "meaning": "to lớn", "explanation": "test" },
            { "word": "gigantic", "isValid": true, "meaning": "khổng lồ", "explanation": "hợp lệ" }
          ],
          "missedSynonyms": [
            { "word": "colossal", "ipa": "/kəˈlɒs.əl/", "pos": "adj", "meaning": "vĩ đại", "example": "A colossal statue.", "exampleVi": "Bức tượng vĩ đại." }
          ]
        }
        """;
        when(geminiSentenceService.generateContent(anyString(), any())).thenReturn(mockGeminiJson);

        SynonymEvaluateRequest req = new SynonymEvaluateRequest(deckId, vocabId, "huge", List.of("enormous", "gigantic"), null);
        SynonymEvaluateResponse resp = service.evaluateChallenge(userId, req, null);

        assertNotNull(resp);
        assertEquals("AI_GEMINI", resp.getEvaluationMode());
        assertNull(resp.getWarningMessage());

        // DB synonym "enormous" must be true even if AI marked it false!
        EvaluatedWordDto eWord = resp.getEvaluatedWords().stream().filter(w -> w.getWord().equalsIgnoreCase("enormous")).findFirst().orElse(null);
        assertNotNull(eWord);
        assertTrue(eWord.isValid());
        assertEquals("DATABASE", eWord.getSource());

        // AI synonym "gigantic"
        EvaluatedWordDto gWord = resp.getEvaluatedWords().stream().filter(w -> w.getWord().equalsIgnoreCase("gigantic")).findFirst().orElse(null);
        assertNotNull(gWord);
        assertTrue(gWord.isValid());
        assertEquals("AI", gWord.getSource());

        assertEquals(2, resp.getValidCount());
        assertEquals(0, resp.getInvalidCount());
    }

    @Test
    void quickAddCardToDeck_SuccessAndPreventsDuplicates() {
        Long userId = 1L;
        Long deckId = 10L;

        VocabularySet deck = new VocabularySet();
        deck.setId(deckId);
        deck.setUserId(userId);
        when(vocabularySetRepository.findByIdAndUserId(deckId, userId)).thenReturn(Optional.of(deck));

        Vocabulary existing = new Vocabulary("existingWord", "đã có", "noun", null, null);
        when(vocabularyRepository.findByDeckId(deckId)).thenReturn(List.of(existing));

        // 1. Try duplicate
        QuickAddCardRequest dupReq = new QuickAddCardRequest(deckId, "existingWord", "đã có", null, null, null);
        Map<String, Object> dupRes = service.quickAddCardToDeck(userId, dupReq);
        assertEquals("DUPLICATE", dupRes.get("status"));
        verify(vocabularyRepository, never()).save(any(Vocabulary.class));

        // 2. Add new
        QuickAddCardRequest newReq = new QuickAddCardRequest(deckId, "brandNewWord", "nghĩa mới", "/.../", "verb", "Example");
        Vocabulary saved = new Vocabulary("brandNewWord", "nghĩa mới", "verb", "/.../", "Example");
        saved.setId(999L);
        when(vocabularyRepository.save(any(Vocabulary.class))).thenReturn(saved);

        Map<String, Object> addRes = service.quickAddCardToDeck(userId, newReq);
        assertEquals("ADDED", addRes.get("status"));
        assertEquals(999L, addRes.get("vocabularyId"));
        verify(vocabularySetItemRepository, times(1)).save(any(VocabularySetItem.class));
    }

    @Test
    void getSynonymStats_CalculatesAccurately() {
        Long userId = 1L;
        Long deckId = 10L;

        SynonymChallengeHistory h1 = new SynonymChallengeHistory(userId, deckId, 1L, "big", "AI_GEMINI", 4, 3, 1, "[]", "[]");
        SynonymChallengeHistory h2 = new SynonymChallengeHistory(userId, deckId, 2L, "smart", "AI_GEMINI", 6, 5, 1, "[]", "[]");

        when(historyRepository.findByUserIdAndDeckIdOrderByCreatedAtDesc(userId, deckId))
                .thenReturn(List.of(h1, h2));

        SynonymStatsDto stats = service.getSynonymStats(userId, deckId);
        assertNotNull(stats);
        assertEquals(2, stats.getTotalChallenges());
        assertEquals(10, stats.getTotalSubmitted());
        assertEquals(8, stats.getTotalValid());
        assertEquals(2, stats.getTotalInvalid());
        assertEquals(80.0, stats.getAccuracyRate());
    }
}
