package com.languagelearning.backend.study;

import com.languagelearning.backend.account.User;
import com.languagelearning.backend.account.UserRepository;
import com.languagelearning.backend.common.security.SecurityTestUtils;
import com.languagelearning.backend.deck.dto.DeckDetailResponse;
import com.languagelearning.backend.deck.dto.DeckUpdateRequest;
import com.languagelearning.backend.deck.entity.VocabularySet;
import com.languagelearning.backend.deck.entity.VocabularySetItem;
import com.languagelearning.backend.deck.repository.VocabularySetItemRepository;
import com.languagelearning.backend.deck.repository.VocabularySetRepository;
import com.languagelearning.backend.deck.service.DeckService;
import com.languagelearning.backend.study.dto.AnswerBatchRequest;
import com.languagelearning.backend.study.dto.AnswerItemDto;
import com.languagelearning.backend.study.dto.CreateSessionRequest;
import com.languagelearning.backend.study.dto.StudySessionResponse;
import com.languagelearning.backend.study.service.StudyService;
import com.languagelearning.backend.term.dto.TermCardDto;
import com.languagelearning.backend.term.entity.Vocabulary;
import com.languagelearning.backend.term.repository.VocabularyRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.sql.Timestamp;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest
@ActiveProfiles("test")
@Transactional
public class PersistenceContextConsistencyIntegrationTest {

    @Autowired
    private DeckService deckService;

    @Autowired
    private StudyService studyService;

    @Autowired
    private VocabularySetRepository vocabularySetRepository;

    @Autowired
    private VocabularySetItemRepository vocabularySetItemRepository;

    @Autowired
    private VocabularyRepository vocabularyRepository;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private JdbcTemplate jdbcTemplate;

    private User testUser;
    private VocabularySet testDeck;
    private Vocabulary v1;

    @BeforeEach
    void setUp() {
        testUser = userRepository.findAll().stream().findFirst().orElseThrow();
        SecurityTestUtils.setAuthenticatedUser(testUser.getId(), testUser.getEmail(), testUser.getUsername(), List.of("USER"));

        v1 = new Vocabulary();
        v1.setWord("original_term");
        v1.setMeaning("original def");
        v1.setPronunciation("/orig/");
        v1.setWordType("noun");
        v1.setExampleSentence("original example");
        v1 = vocabularyRepository.save(v1);

        jdbcTemplate.update("INSERT INTO vocabulary_synonyms (vocabulary_id, synonym) VALUES (?, ?)", v1.getId(), "old_syn1");
        jdbcTemplate.update("INSERT INTO vocabulary_synonyms (vocabulary_id, synonym) VALUES (?, ?)", v1.getId(), "old_syn2");

        testDeck = new VocabularySet(testUser.getId(), null, "Test Persistence Deck", "Desc");
        testDeck = vocabularySetRepository.save(testDeck);
        vocabularySetItemRepository.save(new VocabularySetItem(testDeck.getId(), v1.getId()));
    }

    @Test
    @DisplayName("2.1. updateDeck: Response khớp với GET /api/decks/{id} và truy vấn SQL trực tiếp")
    void testUpdateDeckConsistencyAcrossPersistenceContext() {
        // Sửa term, definition, pronunciation, partOfSpeech, example; bỏ old_syn2, thêm new_syn1
        TermCardDto updatedCard = new TermCardDto(
                v1.getId(),
                "modified_term",
                "modified def",
                "/mod/",
                "verb",
                "modified example",
                List.of("old_syn1", "new_syn1")
        );

        DeckUpdateRequest updateReq = new DeckUpdateRequest("Updated Deck Name", "Updated Desc", null, List.of(updatedCard));

        // 1. Execute updateDeck
        DeckDetailResponse updateRes = deckService.updateDeck(testDeck.getId(), updateReq);

        assertEquals("Updated Deck Name", updateRes.getName());
        assertEquals(1, updateRes.getCards().size());
        TermCardDto resCard = updateRes.getCards().get(0);
        assertEquals("modified_term", resCard.getTerm());
        assertEquals("modified def", resCard.getDefinition());
        assertEquals("/mod/", resCard.getPronunciation());
        assertEquals("verb", resCard.getPartOfSpeech());
        assertEquals("modified example", resCard.getExample());
        assertEquals(List.of("old_syn1", "new_syn1"), resCard.getSynonyms());

        // 2. Immediate GET via deckService.getDeck()
        DeckDetailResponse getRes = deckService.getDeck(testDeck.getId());
        assertEquals(updateRes.getName(), getRes.getName());
        assertEquals(1, getRes.getCards().size());
        TermCardDto getCard = getRes.getCards().get(0);
        assertEquals(resCard.getTerm(), getCard.getTerm());
        assertEquals(resCard.getDefinition(), getCard.getDefinition());
        assertEquals(resCard.getPronunciation(), getCard.getPronunciation());
        assertEquals(resCard.getPartOfSpeech(), getCard.getPartOfSpeech());
        assertEquals(resCard.getExample(), getCard.getExample());
        assertTrue(getCard.getSynonyms().containsAll(List.of("old_syn1", "new_syn1")));
        assertEquals(2, getCard.getSynonyms().size());

        // 3. Direct SQL query verification
        Map<String, Object> dbRow = jdbcTemplate.queryForMap(
                "SELECT word, meaning, pronunciation, word_type, example_sentence FROM vocabularies WHERE id = ?",
                v1.getId()
        );
        assertEquals("modified_term", dbRow.get("word"));
        assertEquals("modified def", dbRow.get("meaning"));
        assertEquals("/mod/", dbRow.get("pronunciation"));
        assertEquals("verb", dbRow.get("word_type"));
        assertEquals("modified example", dbRow.get("example_sentence"));

        List<String> dbSynonyms = jdbcTemplate.query(
                "SELECT synonym FROM vocabulary_synonyms WHERE vocabulary_id = ? ORDER BY synonym ASC",
                (rs, rowNum) -> rs.getString("synonym"),
                v1.getId()
        );
        assertEquals(List.of("new_syn1", "old_syn1"), dbSynonyms);
    }

    @Test
    @DisplayName("2.2. recordAnswers: Response và study_progress trong DB khớp toàn bộ các cột SM-2")
    void testRecordAnswersConsistencyAcrossPersistenceContext() {
        StudySessionResponse sessionRes = studyService.createSession(testUser.getId(), new CreateSessionRequest(testDeck.getId(), "VI_TO_EN", 10, "RANDOM"));
        Long sessionId = sessionRes.getId();

        String clientAnswerId = "persist-ans-" + UUID.randomUUID();
        AnswerItemDto item = new AnswerItemDto(clientAnswerId, v1.getId(), "VI_TO_EN", "CORRECT", false, "user answer", 1);
        item.setRating("GOOD");

        // 1. Execute recordAnswers
        StudySessionResponse res = studyService.recordAnswers(testUser.getId(), sessionId, new AnswerBatchRequest(List.of(item)));
        assertEquals(1, res.getTotalQuestions());
        assertEquals(1, res.getCorrectAnswers());
        assertEquals(0, res.getWrongAnswers());

        // 2. Direct SQL query verification for all SM-2 columns in study_progress
        Map<String, Object> progressRow = jdbcTemplate.queryForMap(
                "SELECT correct_count, wrong_count, accuracy, current_streak, memory_level, " +
                "interval_days, ease_factor, repetitions, next_review_at, last_reviewed_at " +
                "FROM study_progress WHERE user_id = ? AND vocabulary_id = ?",
                testUser.getId(), v1.getId()
        );

        assertEquals(1, ((Number) progressRow.get("correct_count")).intValue());
        assertEquals(0, ((Number) progressRow.get("wrong_count")).intValue());
        assertEquals(new BigDecimal("100.00"), progressRow.get("accuracy"));
        assertEquals(1, ((Number) progressRow.get("current_streak")).intValue());
        assertEquals(1, ((Number) progressRow.get("repetitions")).intValue());
        assertEquals(1, ((Number) progressRow.get("interval_days")).intValue());
        assertEquals(new BigDecimal("2.60"), progressRow.get("ease_factor"));
        assertNotNull(progressRow.get("next_review_at"));
        assertNotNull(progressRow.get("last_reviewed_at"));

        // 3. Direct SQL query on study_answers
        Map<String, Object> answerRow = jdbcTemplate.queryForMap(
                "SELECT question_type, user_answer, is_correct, client_answer_id, override, attempt_no " +
                "FROM study_answers WHERE session_id = ? AND client_answer_id = ?",
                sessionId, clientAnswerId
        );
        assertEquals("VI_TO_EN", answerRow.get("question_type"));
        assertEquals("user answer", answerRow.get("user_answer"));
        assertTrue((Boolean) answerRow.get("is_correct"));
        assertFalse((Boolean) answerRow.get("override"));
        assertEquals(1, ((Number) answerRow.get("attempt_no")).intValue());
    }
}
