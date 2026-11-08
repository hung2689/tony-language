package com.languagelearning.backend.study.synonym;

import com.fasterxml.jackson.databind.ObjectMapper;
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

        VocabularySet defaultDeck = new VocabularySet();
        defaultDeck.setId(10L);
        defaultDeck.setUserId(1L);
        lenient().when(vocabularySetRepository.findByIdAndUserId(anyLong(), anyLong()))
                .thenReturn(Optional.of(defaultDeck));
        lenient().when(vocabularySetItemRepository.existsByIdVocabularySetIdAndIdVocabularyId(anyLong(), anyLong()))
                .thenReturn(true);
    }

    @Test
    void getDeckSynonymQueue_PrioritizesWeakWordsAndDbSynonyms() {
        Long userId = 1L;
        Long deckId = 10L;

        VocabularySet deck = new VocabularySet();
        deck.setId(deckId);
        deck.setUserId(userId);
        when(vocabularySetRepository.findByIdAndUserId(deckId, userId)).thenReturn(Optional.of(deck));

        Vocabulary v1 = new Vocabulary("weakWord", "yếu", "adj", null, null);
        v1.setId(101L);
        Vocabulary v2 = new Vocabulary("masteredWord", "thành thạo", "adj", null, null);
        v2.setId(102L);
        Vocabulary v3 = new Vocabulary("unreviewedWord", "chưa học", "adj", null, null);
        v3.setId(103L);

        when(vocabularyRepository.findByDeckId(deckId)).thenReturn(List.of(v1, v2, v3));

        StudyProgress sp1 = new StudyProgress(userId, 101L);
        sp1.setWrongCount(5);
        sp1.setCorrectCount(1); // Weak

        StudyProgress sp2 = new StudyProgress(userId, 102L);
        sp2.setWrongCount(0);
        sp2.setCorrectCount(8);
        sp2.setMemoryLevel(5); // Mastered

        when(studyProgressRepository.findByUserIdAndVocabularyIdIn(eq(userId), anyList()))
                .thenReturn(List.of(sp1, sp2));

        when(vocabularySynonymRepository.findByVocabularyIdIn(anyList()))
                .thenReturn(List.of(new VocabularySynonym(102L, "feeble")));

        List<SynonymChallengeItemDto> queue = service.getDeckSynonymQueue(userId, deckId, 5);

        assertNotNull(queue);
        assertEquals(3, queue.size());
        assertEquals("weakWord", queue.get(0).getTerm());
        assertEquals("unreviewedWord", queue.get(1).getTerm());
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

        // "quick" matches DB -> EXACT_SYNONYM
        EvaluatedWordDto qWord = resp.getEvaluatedWords().stream().filter(w -> w.getWord().equalsIgnoreCase("quick")).findFirst().orElse(null);
        assertNotNull(qWord);
        assertTrue(qWord.isValid());
        assertEquals("EXACT_SYNONYM", qWord.getStatus());
        assertEquals("DATABASE", qWord.getSource());

        // "slow" is invalid in fallback -> NOT_SYNONYM
        EvaluatedWordDto sWord = resp.getEvaluatedWords().stream().filter(w -> w.getWord().equalsIgnoreCase("slow")).findFirst().orElse(null);
        assertNotNull(sWord);
        assertFalse(sWord.isValid());
        assertEquals("NOT_SYNONYM", sWord.getStatus());
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

        String mockGeminiJson = """
        {
          "evaluatedWords": [
            { "word": "enormous", "status": "NOT_SYNONYM", "isValid": false, "meaning": "to lớn", "explanation": "test" },
            { "word": "gigantic", "status": "EXACT_SYNONYM", "isValid": true, "meaning": "khổng lồ", "explanation": "hợp lệ" }
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
        assertEquals("EXACT_SYNONYM", eWord.getStatus());
        assertEquals("DATABASE", eWord.getSource());

        // AI synonym "gigantic"
        EvaluatedWordDto gWord = resp.getEvaluatedWords().stream().filter(w -> w.getWord().equalsIgnoreCase("gigantic")).findFirst().orElse(null);
        assertNotNull(gWord);
        assertTrue(gWord.isValid());
        assertEquals("EXACT_SYNONYM", gWord.getStatus());
        assertEquals("AI", gWord.getSource());

        assertEquals(2, resp.getValidCount());
        assertEquals(0, resp.getInvalidCount());
    }

    @Test
    void evaluateChallenge_Task4_MandatoryTestCases() {
        Long userId = 1L;
        Long deckId = 10L;

        // 1. Test ITEM -> Product (EXACT), Object (CONTEXTUAL), Employee (INVALID)
        Long itemVocabId = 201L;
        Vocabulary itemVocab = new Vocabulary("ITEM", "mặt hàng, món đồ", "noun", "/ˈaɪ.təm/", null);
        itemVocab.setId(itemVocabId);
        when(vocabularyRepository.findById(itemVocabId)).thenReturn(Optional.of(itemVocab));
        when(geminiSentenceService.isAvailable(any())).thenReturn(true);
        when(vocabularySynonymRepository.findByVocabularyId(itemVocabId)).thenReturn(Collections.emptyList());
        when(vocabularyRepository.findByDeckId(deckId)).thenReturn(List.of(itemVocab));

        String itemGeminiJson = """
        {
          "evaluatedWords": [
            { "word": "Product", "status": "EXACT_SYNONYM", "isValid": true, "meaning": "sản phẩm", "explanation": "Đồng nghĩa chính xác trong ngữ cảnh thương mại." },
            { "word": "Object", "status": "CONTEXTUAL_SYNONYM", "isValid": true, "meaning": "đồ vật", "explanation": "Phù hợp khi nói về vật thể vật lý, nhưng không thay thế được trong ngữ cảnh thương phẩm/hàng hóa." },
            { "word": "Employee", "status": "NOT_SYNONYM", "isValid": false, "meaning": "nhân viên", "explanation": "Employee là người lao động, không đồng nghĩa với item." }
          ],
          "missedSynonyms": [
            { "word": "article", "ipa": "/ˈɑː.tɪ.kəl/", "pos": "noun", "meaning": "vật phẩm", "example": "Toilet articles.", "exampleVi": "Đồ dùng vệ sinh." }
          ]
        }
        """;
        when(geminiSentenceService.generateContent(anyString(), any())).thenReturn(itemGeminiJson);

        SynonymEvaluateRequest itemReq = new SynonymEvaluateRequest(deckId, itemVocabId, "ITEM", List.of("Product", "Object", "Employee"), null);
        SynonymEvaluateResponse itemResp = service.evaluateChallenge(userId, itemReq, null);

        assertNotNull(itemResp);
        assertEquals(3, itemResp.getTotalSubmitted());
        assertEquals(2, itemResp.getValidCount()); // Product (EXACT) + Object (CONTEXTUAL)
        assertEquals(1, itemResp.getInvalidCount()); // Employee (NOT_SYNONYM)

        EvaluatedWordDto prod = itemResp.getEvaluatedWords().stream().filter(w -> w.getWord().equalsIgnoreCase("Product")).findFirst().orElseThrow();
        assertEquals("EXACT_SYNONYM", prod.getStatus());
        assertTrue(prod.isValid());

        EvaluatedWordDto obj = itemResp.getEvaluatedWords().stream().filter(w -> w.getWord().equalsIgnoreCase("Object")).findFirst().orElseThrow();
        assertEquals("CONTEXTUAL_SYNONYM", obj.getStatus());
        assertTrue(obj.isValid());
        assertTrue(obj.getExplanation().contains("ngữ cảnh"));

        EvaluatedWordDto emp = itemResp.getEvaluatedWords().stream().filter(w -> w.getWord().equalsIgnoreCase("Employee")).findFirst().orElseThrow();
        assertEquals("NOT_SYNONYM", emp.getStatus());
        assertFalse(emp.isValid());

        // 2. Test CUSTOMER -> Client (EXACT), Consumer (CONTEXTUAL), Employee (INVALID)
        Long custVocabId = 202L;
        Vocabulary custVocab = new Vocabulary("CUSTOMER", "khách hàng", "noun", "/ˈkʌs.tə.mər/", null);
        custVocab.setId(custVocabId);
        when(vocabularyRepository.findById(custVocabId)).thenReturn(Optional.of(custVocab));
        when(vocabularySynonymRepository.findByVocabularyId(custVocabId)).thenReturn(Collections.emptyList());

        String custGeminiJson = """
        {
          "evaluatedWords": [
            { "word": "Client", "status": "EXACT_SYNONYM", "isValid": true, "meaning": "khách hàng, thân chủ", "explanation": "Đồng nghĩa chính xác, thường dùng cho dịch vụ chuyên nghiệp." },
            { "word": "Consumer", "status": "CONTEXTUAL_SYNONYM", "isValid": true, "meaning": "người tiêu dùng", "explanation": "Phù hợp trong ngữ cảnh kinh tế học/tiêu dùng, nhưng consumer nhấn mạnh người sử dụng cuối cùng." },
            { "word": "Employee", "status": "NOT_SYNONYM", "isValid": false, "meaning": "nhân viên", "explanation": "Employee là người làm thuê, vai trò ngược lại với khách hàng." }
          ],
          "missedSynonyms": []
        }
        """;
        when(geminiSentenceService.generateContent(anyString(), any())).thenReturn(custGeminiJson);

        SynonymEvaluateRequest custReq = new SynonymEvaluateRequest(deckId, custVocabId, "CUSTOMER", List.of("Client", "Consumer", "Employee"), null);
        SynonymEvaluateResponse custResp = service.evaluateChallenge(userId, custReq, null);

        assertEquals(2, custResp.getValidCount());
        assertEquals(1, custResp.getInvalidCount());

        // 3. Test IMPORTANT -> Significant (EXACT), Crucial (EXACT)
        Long impVocabId = 203L;
        Vocabulary impVocab = new Vocabulary("IMPORTANT", "quan trọng", "adjective", "/ɪmˈpɔː.tənt/", null);
        impVocab.setId(impVocabId);
        when(vocabularyRepository.findById(impVocabId)).thenReturn(Optional.of(impVocab));
        when(vocabularySynonymRepository.findByVocabularyId(impVocabId)).thenReturn(Collections.emptyList());

        String impGeminiJson = """
        {
          "evaluatedWords": [
            { "word": "Significant", "status": "EXACT_SYNONYM", "isValid": true, "meaning": "đáng kể, quan trọng", "explanation": "Đồng nghĩa chính xác và trang trọng." },
            { "word": "Crucial", "status": "EXACT_SYNONYM", "isValid": true, "meaning": "cốt yếu, quyết định", "explanation": "Đồng nghĩa chính xác với mức độ nhấn mạnh cao." }
          ],
          "missedSynonyms": []
        }
        """;
        when(geminiSentenceService.generateContent(anyString(), any())).thenReturn(impGeminiJson);

        SynonymEvaluateRequest impReq = new SynonymEvaluateRequest(deckId, impVocabId, "IMPORTANT", List.of("Significant", "Crucial"), null);
        SynonymEvaluateResponse impResp = service.evaluateChallenge(userId, impReq, null);

        assertEquals(2, impResp.getValidCount());
        assertEquals(0, impResp.getInvalidCount());
    }

    @Test
    void evaluatedWordDto_JacksonSerialization_ContainsBothValidAndIsValidAndStatus() throws Exception {
        ObjectMapper mapper = new ObjectMapper();

        EvaluatedWordDto dto = new EvaluatedWordDto("product", "EXACT_SYNONYM", true, "AI", "sản phẩm", "Đồng nghĩa chính xác");
        String json = mapper.writeValueAsString(dto);

        // Verify JSON contains all required keys for frontend
        assertTrue(json.contains("\"isValid\":true"), "JSON must contain isValid:true");
        assertTrue(json.contains("\"valid\":true"), "JSON must contain valid:true");
        assertTrue(json.contains("\"status\":\"EXACT_SYNONYM\""), "JSON must contain status");

        // Verify deserialization back to object
        EvaluatedWordDto parsed = mapper.readValue(json, EvaluatedWordDto.class);
        assertTrue(parsed.isValid());
        assertTrue(parsed.getValid());
        assertEquals("EXACT_SYNONYM", parsed.getStatus());
        assertEquals("product", parsed.getWord());
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
    }
}
