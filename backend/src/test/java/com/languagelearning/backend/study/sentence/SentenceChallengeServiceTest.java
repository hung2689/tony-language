package com.languagelearning.backend.study.sentence;

import com.languagelearning.backend.deck.entity.VocabularySet;
import com.languagelearning.backend.deck.repository.VocabularySetRepository;
import com.languagelearning.backend.study.sentence.dto.SentenceChallengeItemDto;
import com.languagelearning.backend.study.sentence.dto.SentenceEvaluationRequest;
import com.languagelearning.backend.study.sentence.dto.SentenceEvaluationResponse;
import com.languagelearning.backend.term.entity.Vocabulary;
import com.languagelearning.backend.term.repository.VocabularyRepository;
import com.languagelearning.backend.study.sentence.gemini.GeminiSentenceService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
public class SentenceChallengeServiceTest {

    @Mock
    private VocabularySetRepository vocabularySetRepository;

    @Mock
    private VocabularyRepository vocabularyRepository;

    @Mock
    private GeminiSentenceService geminiSentenceService;

    @InjectMocks
    private SentenceChallengeService sentenceChallengeService;

    private VocabularySet testDeck;
    private Vocabulary vocab1;
    private Vocabulary vocab2;

    @BeforeEach
    void setUp() {
        testDeck = new VocabularySet(1L, null, "IELTS Advanced", "Desc");
        testDeck.setId(10L);

        vocab1 = new Vocabulary("exhausted", "kiệt sức", "tính từ", "/ɪɡˈzɔː.stɪd/", "I was exhausted.");
        vocab1.setId(101L);

        vocab2 = new Vocabulary("improve", "cải thiện", "động từ", "/ɪmˈpruːv/", "We must improve our skills.");
        vocab2.setId(102L);
    }

    @Test
    void generateChallenges_Success() {
        when(vocabularySetRepository.findByIdAndUserId(10L, 1L)).thenReturn(Optional.of(testDeck));
        when(vocabularyRepository.findByDeckId(10L)).thenReturn(List.of(vocab1, vocab2));

        List<SentenceChallengeItemDto> challenges = sentenceChallengeService.generateChallenges(1L, 10L, 5);

        assertNotNull(challenges);
        assertEquals(2, challenges.size());
        assertTrue(challenges.stream().anyMatch(c -> c.getTargetWord().equals("exhausted")));
        assertTrue(challenges.stream().anyMatch(c -> c.getTargetWord().equals("improve")));
    }

    @Test
    void evaluateSentence_TargetWordPresentAndMatchesReference() {
        SentenceEvaluationRequest request = new SentenceEvaluationRequest(
                101L,
                "exhausted",
                "Hôm nay tôi cảm thấy rất kiệt sức sau một ngày dài làm việc.",
                "Today I feel very exhausted after a long day of work.",
                "Today I feel very exhausted after a long day of work."
        );

        SentenceEvaluationResponse response = sentenceChallengeService.evaluateSentence(request);

        assertNotNull(response);
        assertTrue(response.isTargetWordUsed());
        assertTrue(response.isPassed());
        assertTrue(response.getScore() >= 90);
        assertEquals("EXCELLENT", response.getRating());
        assertNotNull(response.getFeedback());
    }

    @Test
    void evaluateSentence_MissingTargetWord_Penalized() {
        SentenceEvaluationRequest request = new SentenceEvaluationRequest(
                101L,
                "exhausted",
                "Hôm nay tôi cảm thấy rất kiệt sức.",
                "Today I feel very tired after work.",
                "Today I feel very exhausted after a long day of work."
        );

        SentenceEvaluationResponse response = sentenceChallengeService.evaluateSentence(request);

        assertNotNull(response);
        assertFalse(response.isTargetWordUsed());
        assertTrue(response.getGrammarNotes().stream().anyMatch(note -> note.contains("chưa sử dụng từ vựng mục tiêu")));
    }

    @Test
    void evaluateSentence_EmptyInput() {
        SentenceEvaluationRequest request = new SentenceEvaluationRequest(
                101L,
                "exhausted",
                "Kiệt sức",
                "",
                "I am exhausted."
        );

        SentenceEvaluationResponse response = sentenceChallengeService.evaluateSentence(request);

        assertNotNull(response);
        assertEquals(0, response.getScore());
        assertFalse(response.isPassed());
        assertEquals("INCORRECT", response.getRating());
    }

    @Test
    void evaluateSentence_UsesGeminiWhenConfigured() {
        when(geminiSentenceService.isConfigured()).thenReturn(true);
        SentenceEvaluationRequest request = new SentenceEvaluationRequest(
                101L,
                "exhausted",
                "Hôm nay tôi mệt.",
                "Today I was exhausted.",
                "Today I was exhausted."
        );
        SentenceEvaluationResponse mockGeminiResp = new SentenceEvaluationResponse(
                95,
                true,
                true,
                "EXCELLENT",
                "Gemini: Câu viết rất chuẩn và tự nhiên!",
                "Today I was exhausted.",
                "Today I was exhausted.",
                List.of()
        );
        when(geminiSentenceService.evaluateSentence(request)).thenReturn(mockGeminiResp);

        SentenceEvaluationResponse response = sentenceChallengeService.evaluateSentence(request);

        assertNotNull(response);
        assertEquals(95, response.getScore());
        assertEquals("EXCELLENT", response.getRating());
        assertEquals("Gemini: Câu viết rất chuẩn và tự nhiên!", response.getFeedback());
    }
}
