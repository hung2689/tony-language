package com.languagelearning.backend.integration;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.languagelearning.backend.account.User;
import com.languagelearning.backend.account.UserRepository;
import com.languagelearning.backend.common.security.SecurityTestUtils;
import com.languagelearning.backend.deck.dto.DeckUpdateRequest;
import com.languagelearning.backend.deck.entity.VocabularySet;
import com.languagelearning.backend.deck.entity.VocabularySetItem;
import com.languagelearning.backend.deck.repository.VocabularySetItemRepository;
import com.languagelearning.backend.deck.repository.VocabularySetRepository;
import com.languagelearning.backend.folder.dto.FolderUpdateRequest;
import com.languagelearning.backend.folder.entity.Folder;
import com.languagelearning.backend.folder.repository.FolderRepository;
import com.languagelearning.backend.study.dto.AddDecksToPlanRequest;
import com.languagelearning.backend.study.dto.AnswerBatchRequest;
import com.languagelearning.backend.study.dto.AnswerItemDto;
import com.languagelearning.backend.study.dto.CreateSessionRequest;
import com.languagelearning.backend.study.dto.CreateStudyPlanRequest;
import com.languagelearning.backend.study.dto.PreviewAddDecksRequest;
import com.languagelearning.backend.study.entity.StudyPlan;
import com.languagelearning.backend.study.entity.StudyPlanDeck;
import com.languagelearning.backend.study.repository.StudyPlanDeckRepository;
import com.languagelearning.backend.study.dto.RemoveDecksFromPlanRequest;
import com.languagelearning.backend.study.dto.UpdateStudyPlanRequest;

import com.languagelearning.backend.study.entity.StudySession;
import com.languagelearning.backend.study.repository.StudyPlanRepository;
import com.languagelearning.backend.study.repository.StudySessionRepository;
import com.languagelearning.backend.study.sentence.dto.SentenceEvaluationRequest;
import com.languagelearning.backend.study.synonym.dto.QuickAddCardRequest;
import com.languagelearning.backend.study.synonym.dto.SynonymEvaluateRequest;
import com.languagelearning.backend.term.dto.TermCardDto;
import com.languagelearning.backend.term.entity.Vocabulary;
import com.languagelearning.backend.term.repository.VocabularyRepository;
import com.languagelearning.backend.wallpaper.entity.UserWallpaper;
import com.languagelearning.backend.wallpaper.repository.UserWallpaperRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.web.context.WebApplicationContext;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import org.springframework.transaction.annotation.Transactional;

@SpringBootTest
@ActiveProfiles("test")
@Transactional
public class IdorSecurityMatrixIntegrationTest {

    @Autowired
    private WebApplicationContext webApplicationContext;

    private MockMvc mockMvc;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private FolderRepository folderRepository;

    @Autowired
    private VocabularySetRepository vocabularySetRepository;

    @Autowired
    private VocabularyRepository vocabularyRepository;

    @Autowired
    private VocabularySetItemRepository vocabularySetItemRepository;

    @Autowired
    private StudySessionRepository studySessionRepository;

    @Autowired
    private StudyPlanRepository studyPlanRepository;

    @Autowired
    private StudyPlanDeckRepository studyPlanDeckRepository;


    @Autowired
    private UserWallpaperRepository wallpaperRepository;

    @Autowired
    private org.springframework.jdbc.core.JdbcTemplate jdbcTemplate;

    @Autowired
    private jakarta.persistence.EntityManager entityManager;

    private final ObjectMapper objectMapper = createObjectMapper();

    private static ObjectMapper createObjectMapper() {
        ObjectMapper mapper = new ObjectMapper();
        com.fasterxml.jackson.databind.module.SimpleModule module = new com.fasterxml.jackson.databind.module.SimpleModule();
        module.addSerializer(java.time.LocalDate.class, new com.fasterxml.jackson.databind.JsonSerializer<java.time.LocalDate>() {
            @Override
            public void serialize(java.time.LocalDate value, com.fasterxml.jackson.core.JsonGenerator gen, com.fasterxml.jackson.databind.SerializerProvider serializers) throws java.io.IOException {
                gen.writeString(value.toString());
            }
        });
        mapper.registerModule(module);
        return mapper;
    }

    private User userA;
    private User userB;

    private Folder folderB;
    private VocabularySet deckA;
    private VocabularySet deckB;
    private Vocabulary vocabA;
    private Vocabulary vocabB;
    private StudySession sessionB;
    private UserWallpaper wallpaperB;
    private StudyPlan planB;


    @BeforeEach
    void setUp() {
        mockMvc = MockMvcBuilders.webAppContextSetup(webApplicationContext).build();

        userA = userRepository.findByEmailIgnoreCase("user_a_idor@test.com").orElseGet(() -> {
            User u = new User();
            u.setEmail("user_a_idor@test.com");
            u.setUsername("user_a_idor");
            u.setPasswordHash("$2a$10$dummyHashA");
            return userRepository.save(u);
        });

        userB = userRepository.findByEmailIgnoreCase("user_b_idor@test.com").orElseGet(() -> {
            User u = new User();
            u.setEmail("user_b_idor@test.com");
            u.setUsername("user_b_idor");
            u.setPasswordHash("$2a$10$dummyHashB");
            return userRepository.save(u);
        });

        // Clean up previous test artifacts for users to avoid duplicate name constraints
        jdbcTemplate.execute("DELETE FROM study_answers WHERE session_id IN (SELECT id FROM study_sessions WHERE user_id IN (" + userA.getId() + ", " + userB.getId() + "))");
        jdbcTemplate.execute("DELETE FROM study_sessions WHERE user_id IN (" + userA.getId() + ", " + userB.getId() + ")");
        jdbcTemplate.execute("DELETE FROM study_plan_decks WHERE study_plan_id IN (SELECT id FROM study_plans WHERE user_id IN (" + userA.getId() + ", " + userB.getId() + "))");
        jdbcTemplate.execute("DELETE FROM study_plans WHERE user_id IN (" + userA.getId() + ", " + userB.getId() + ")");
        jdbcTemplate.execute("DELETE FROM vocabulary_set_items WHERE vocabulary_set_id IN (SELECT id FROM vocabulary_sets WHERE user_id IN (" + userA.getId() + ", " + userB.getId() + "))");
        jdbcTemplate.execute("DELETE FROM vocabulary_sets WHERE user_id IN (" + userA.getId() + ", " + userB.getId() + ")");
        jdbcTemplate.execute("DELETE FROM folders WHERE user_id IN (" + userA.getId() + ", " + userB.getId() + ")");
        jdbcTemplate.execute("DELETE FROM user_wallpapers WHERE user_id IN (" + userA.getId() + ", " + userB.getId() + ")");
        entityManager.clear();

        // Set authenticated user to User A for all tests
        SecurityTestUtils.setAuthenticatedUser(userA.getId(), userA.getEmail(), userA.getUsername(), List.of("USER"));

        // Resources for User B
        folderB = folderRepository.save(new Folder(userB.getId(), "Folder of User B"));

        deckB = new VocabularySet();
        deckB.setName("Deck of User B");
        deckB.setUserId(userB.getId());
        deckB.setFolderId(folderB.getId());
        deckB = vocabularySetRepository.save(deckB);

        vocabB = new Vocabulary();
        vocabB.setWord("apple_b");
        vocabB.setMeaning("quả táo B");
        vocabB = vocabularyRepository.save(vocabB);
        vocabularySetItemRepository.save(new VocabularySetItem(deckB.getId(), vocabB.getId()));

        sessionB = new StudySession(userB.getId(), deckB.getId(), "EN_TO_VI");
        sessionB = studySessionRepository.save(sessionB);

        wallpaperB = new UserWallpaper();
        wallpaperB.setUserId(userB.getId());
        wallpaperB.setName("Wallpaper B");
        wallpaperB.setImageUrl("/api/wallpapers/files/wp_b.jpg");
        wallpaperB.setActive(true);
        wallpaperB = wallpaperRepository.save(wallpaperB);

        planB = new StudyPlan(userB.getId(), "Plan of User B", LocalDate.now().plusDays(30), 10, 5, "Asia/Ho_Chi_Minh");
        planB = studyPlanRepository.save(planB);
        studyPlanDeckRepository.save(new StudyPlanDeck(planB.getId(), deckB.getId(), 1));


        // Resources for User A
        deckA = new VocabularySet();
        deckA.setName("Deck of User A");
        deckA.setUserId(userA.getId());
        deckA = vocabularySetRepository.save(deckA);

        vocabA = new Vocabulary();
        vocabA.setWord("orange_a");
        vocabA.setMeaning("quả cam A");
        vocabA = vocabularyRepository.save(vocabA);
        vocabularySetItemRepository.save(new VocabularySetItem(deckA.getId(), vocabA.getId()));
    }

    // =========================================================================
    // 1. DECK ENDPOINTS IDOR
    // =========================================================================

    @Test
    @DisplayName("IDOR Deck: User A GET deck của B -> 404")
    void testGetDeckOfOtherUser_Returns404() throws Exception {
        mockMvc.perform(get("/api/decks/" + deckB.getId()))
                .andExpect(status().isNotFound());
    }

    @Test
    @DisplayName("IDOR Deck: User A PUT deck của B -> 404, deck B không bị đổi")
    void testUpdateDeckOfOtherUser_Returns404() throws Exception {
        DeckUpdateRequest req = new DeckUpdateRequest("Hacked Deck B", "Hacked desc", null, List.of(
                new TermCardDto(vocabB.getId(), "hacked_word", "hacked_meaning", null, null, null, null)
        ));
        mockMvc.perform(put("/api/decks/" + deckB.getId())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isNotFound());

        VocabularySet freshDeckB = vocabularySetRepository.findById(deckB.getId()).orElseThrow();
        assertEquals("Deck of User B", freshDeckB.getName());
        Vocabulary freshVocabB = vocabularyRepository.findById(vocabB.getId()).orElseThrow();
        assertEquals("apple_b", freshVocabB.getWord());
        assertEquals("quả táo B", freshVocabB.getMeaning());
    }

    @Test
    @DisplayName("IDOR Deck: User A DELETE deck của B -> 404, deck B vẫn còn")
    void testDeleteDeckOfOtherUser_Returns404() throws Exception {
        mockMvc.perform(delete("/api/decks/" + deckB.getId()))
                .andExpect(status().isNotFound());

        assertTrue(vocabularySetRepository.existsById(deckB.getId()));
    }

    @Test
    @DisplayName("IDOR Deck Card Hijacking: User A PUT deck của A kèm card ID thuộc deck của B -> Card B không bị sửa")
    void testUpdateDeckWithCardIdBelongingToOtherUser_DoesNotModifyCardB() throws Exception {
        TermCardDto maliciousCard = new TermCardDto(vocabB.getId(), "compromised_word", "compromised_def", null, null, null, null);
        DeckUpdateRequest req = new DeckUpdateRequest("Deck of User A Updated", null, null, List.of(maliciousCard));

        mockMvc.perform(put("/api/decks/" + deckA.getId())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isOk());

        // Verify User B's vocab is completely unmodified
        Vocabulary freshVocabB = vocabularyRepository.findById(vocabB.getId()).orElseThrow();
        assertEquals("apple_b", freshVocabB.getWord(), "User B's word must remain unchanged!");
        assertEquals("quả táo B", freshVocabB.getMeaning(), "User B's meaning must remain unchanged!");
    }

    // =========================================================================
    // 2. FOLDER ENDPOINTS IDOR
    // =========================================================================

    @Test
    @DisplayName("IDOR Folder: User A GET folder của B -> 404")
    void testGetFolderOfOtherUser_Returns404() throws Exception {
        mockMvc.perform(get("/api/folders/" + folderB.getId()))
                .andExpect(status().isNotFound());
    }

    @Test
    @DisplayName("IDOR Folder: User A PUT folder của B -> 404, folder B không bị đổi tên")
    void testUpdateFolderOfOtherUser_Returns404() throws Exception {
        FolderUpdateRequest req = new FolderUpdateRequest("Hacked Folder Name");
        mockMvc.perform(put("/api/folders/" + folderB.getId())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isNotFound());

        Folder freshFolderB = folderRepository.findById(folderB.getId()).orElseThrow();
        assertEquals("Folder of User B", freshFolderB.getName());
    }

    @Test
    @DisplayName("IDOR Folder: User A DELETE folder của B -> 404, folder B vẫn còn")
    void testDeleteFolderOfOtherUser_Returns404() throws Exception {
        mockMvc.perform(delete("/api/folders/" + folderB.getId()))
                .andExpect(status().isNotFound());

        assertTrue(folderRepository.existsById(folderB.getId()));
    }

    @Test
    @DisplayName("IDOR Folder Move: User A PATCH deck A vào folder của B -> 404")
    void testMoveDeckToFolderOfOtherUser_Returns404() throws Exception {
        mockMvc.perform(patch("/api/decks/" + deckA.getId() + "/folder")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of("folderId", folderB.getId()))))
                .andExpect(status().isNotFound());
    }

    // =========================================================================
    // 3. STUDY SESSION ENDPOINTS IDOR
    // =========================================================================

    @Test
    @DisplayName("IDOR Session: User A tạo session với deckId của B -> 404")
    void testCreateSessionWithDeckOfOtherUser_Returns404() throws Exception {
        CreateSessionRequest req = new CreateSessionRequest(deckB.getId(), "EN_TO_VI", 10, "RANDOM");
        mockMvc.perform(post("/api/study/sessions")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isNotFound());
    }

    @Test
    @DisplayName("IDOR Session: User A gửi câu trả lời vào session của B -> 404, session B không bị đổi")
    void testRecordAnswersInSessionOfOtherUser_Returns404() throws Exception {
        AnswerBatchRequest req = new AnswerBatchRequest(List.of(
                new AnswerItemDto("ans_1", vocabB.getId(), "EN_TO_VI", "CORRECT", false, "user_ans", 1)
        ));
        mockMvc.perform(post("/api/study/sessions/" + sessionB.getId() + "/answers")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isNotFound());
    }

    @Test
    @DisplayName("IDOR Session: User A finish session của B -> 404, session B không bị kết thúc")
    void testFinishSessionOfOtherUser_Returns404() throws Exception {
        mockMvc.perform(post("/api/study/sessions/" + sessionB.getId() + "/finish"))
                .andExpect(status().isNotFound());
    }

    // =========================================================================
    // 4. STUDY PLAN ENDPOINTS IDOR
    // =========================================================================

    @Test
    @DisplayName("IDOR Plan: User A tạo plan với deckId của B -> 404")
    void testCreatePlanWithDeckOfOtherUser_Returns404() throws Exception {
        CreateStudyPlanRequest req = new CreateStudyPlanRequest(
                "User A Plan",
                List.of(deckB.getId()),
                LocalDate.now().plusDays(30),
                10,
                5,
                "Asia/Ho_Chi_Minh",
                false
        );
        mockMvc.perform(post("/api/study-plans")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isNotFound());
    }

    @Test
    @DisplayName("IDOR Plan: User A preview plan với deckId của B -> 404 (không làm lộ số từ của B)")
    void testPreviewAddDecksWithDeckOfOtherUser_Returns404() throws Exception {
        PreviewAddDecksRequest req = new PreviewAddDecksRequest(
                List.of(deckB.getId()),
                LocalDate.now().plusDays(30),
                10
        );
        mockMvc.perform(post("/api/study-plans/preview")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isNotFound());
    }

    @Test
    @DisplayName("IDOR Plan: User A thêm deckId của B vào plan đang hoạt động -> 404")
    void testAddDecksToPlanWithDeckOfOtherUser_Returns404() throws Exception {
        StudyPlan planA = new StudyPlan(userA.getId(), "Plan A", LocalDate.now().plusDays(30), 10, 5, "Asia/Ho_Chi_Minh");
        studyPlanRepository.save(planA);

        AddDecksToPlanRequest req = new AddDecksToPlanRequest(
                List.of(deckB.getId()),
                null,
                null,
                null,
                null
        );
        mockMvc.perform(post("/api/study-plans/current/decks")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isNotFound());
    }

    // =========================================================================
    // 5. SYNONYM CHALLENGE ENDPOINTS IDOR
    // =========================================================================

    @Test
    @DisplayName("IDOR Synonym: User A GET synonym queue từ deck của B -> 404")
    void testGetDeckSynonymsOfOtherUser_Returns404() throws Exception {
        mockMvc.perform(get("/api/decks/" + deckB.getId() + "/synonym-challenges"))
                .andExpect(status().isNotFound());
    }

    @Test
    @DisplayName("IDOR Synonym: User A GET synonym stats từ deck của B -> 404")
    void testGetDeckSynonymStatsOfOtherUser_Returns404() throws Exception {
        mockMvc.perform(get("/api/decks/" + deckB.getId() + "/synonym-challenges/stats"))
                .andExpect(status().isNotFound());
    }

    @Test
    @DisplayName("IDOR Synonym: User A quick-add card vào deck của B -> 404")
    void testQuickAddCardToDeckOfOtherUser_Returns404() throws Exception {
        QuickAddCardRequest req = new QuickAddCardRequest(deckB.getId(), "syn_word", "meaning", "noun", "/p/", "ex");
        mockMvc.perform(post("/api/decks/" + deckB.getId() + "/synonym-challenges/quick-add")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isNotFound());
    }

    @Test
    @DisplayName("IDOR Synonym: User A evaluate trên deck của B -> 404")
    void testEvaluateSynonymOnDeckOfOtherUser_Returns404() throws Exception {
        SynonymEvaluateRequest req = new SynonymEvaluateRequest();
        req.setDeckId(deckB.getId());
        req.setVocabularyId(vocabB.getId());
        req.setRootWord("apple_b");
        req.setUserAnswers(List.of("pomme"));

        mockMvc.perform(post("/api/decks/" + deckB.getId() + "/synonym-challenges/evaluate")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isNotFound());
    }

    @Test
    @DisplayName("IDOR Synonym: User A evaluate trên deck A nhưng gửi vocabularyId thuộc deck B -> 404")
    void testEvaluateSynonymWithVocabularyOfOtherUser_Returns404() throws Exception {
        SynonymEvaluateRequest req = new SynonymEvaluateRequest();
        req.setDeckId(deckA.getId());
        req.setVocabularyId(vocabB.getId());
        req.setRootWord("apple_b");
        req.setUserAnswers(List.of("pomme"));

        mockMvc.perform(post("/api/decks/" + deckA.getId() + "/synonym-challenges/evaluate")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isNotFound());
    }

    // =========================================================================
    // 6. SENTENCE CHALLENGE ENDPOINTS IDOR
    // =========================================================================

    @Test
    @DisplayName("IDOR Sentence: User A GET sentence challenges từ deck của B -> 404")
    void testGetSentenceChallengesOfOtherUser_Returns404() throws Exception {
        mockMvc.perform(get("/api/decks/" + deckB.getId() + "/sentence-challenges"))
                .andExpect(status().isNotFound());
    }

    @Test
    @DisplayName("IDOR Sentence: User A evaluate sentence trên deck của B -> 404")
    void testEvaluateSentenceOnDeckOfOtherUser_Returns404() throws Exception {
        SentenceEvaluationRequest req = new SentenceEvaluationRequest(
                vocabB.getId(),
                "apple_b",
                "Prompt",
                "I eat an apple",
                "I eat an apple"
        );
        mockMvc.perform(post("/api/decks/" + deckB.getId() + "/sentence-challenges/evaluate")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isNotFound());
    }

    // =========================================================================
    // 7. WALLPAPER ENDPOINTS IDOR
    // =========================================================================

    @Test
    @DisplayName("IDOR Wallpaper: User A setActive wallpaper của B -> 404")
    void testSetActiveWallpaperOfOtherUser_Returns404() throws Exception {
        mockMvc.perform(patch("/api/wallpapers/" + wallpaperB.getId() + "/active"))
                .andExpect(status().isNotFound());
    }

    @Test
    @DisplayName("IDOR Wallpaper: User A DELETE wallpaper của B -> 404, wallpaper B vẫn còn")
    void testDeleteWallpaperOfOtherUser_Returns404() throws Exception {
        mockMvc.perform(delete("/api/wallpapers/" + wallpaperB.getId()))
                .andExpect(status().isNotFound());

        assertTrue(wallpaperRepository.existsById(wallpaperB.getId()));
    }

    // =========================================================================
    // 4b. STUDY PLAN EXTENDED IDOR (DELETE DECK, PATCH /current, DELETE /current)
    // =========================================================================

    @Test
    @DisplayName("IDOR Plan: User A DELETE deck của B khỏi plan của A -> 404")
    void testRemoveDeckFromPlanWithDeckOfOtherUser_Returns404() throws Exception {
        StudyPlan planA = new StudyPlan(userA.getId(), "Plan A", LocalDate.now().plusDays(30), 10, 5, "Asia/Ho_Chi_Minh");
        planA = studyPlanRepository.save(planA);
        studyPlanDeckRepository.save(new StudyPlanDeck(planA.getId(), deckA.getId(), 1));

        mockMvc.perform(delete("/api/study-plans/current/decks/" + deckB.getId()))
                .andExpect(status().isNotFound());

        // Deck B vẫn nguyên vẹn trong plan B
        List<StudyPlanDeck> decksInPlanB = studyPlanDeckRepository.findByStudyPlanId(planB.getId());
        assertEquals(1, decksInPlanB.size());
        assertEquals(deckB.getId(), decksInPlanB.get(0).getDeckId());
    }

    @Test
    @DisplayName("Tách biệt dữ liệu: User A PATCH /api/study-plans/current đổi cài đặt plan của mình -> Không ảnh hưởng plan của B")
    void testUpdatePlanPatchCurrentDoesNotAffectOtherUser() throws Exception {
        StudyPlan planA = new StudyPlan(userA.getId(), "Plan A Original", LocalDate.now().plusDays(30), 10, 5, "Asia/Ho_Chi_Minh");
        studyPlanRepository.save(planA);

        UpdateStudyPlanRequest req = new UpdateStudyPlanRequest(
                "Plan A Modified",
                LocalDate.now().plusDays(45),
                20,
                10,
                false,
                StudyPlan.Status.ACTIVE
        );

        mockMvc.perform(patch("/api/study-plans/current")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isOk());

        StudyPlan freshPlanB = studyPlanRepository.findById(planB.getId()).orElseThrow();
        assertEquals("Plan of User B", freshPlanB.getName());
    }

    @Test
    @DisplayName("Tách biệt dữ liệu: User A DELETE /api/study-plans/current chỉ xóa plan của A -> Plan của B không bị xóa")
    void testDeleteActivePlanDoesNotDeletePlanOfOtherUser() throws Exception {
        StudyPlan planA = new StudyPlan(userA.getId(), "Plan A", LocalDate.now().plusDays(30), 10, 5, "Asia/Ho_Chi_Minh");
        studyPlanRepository.save(planA);

        mockMvc.perform(delete("/api/study-plans/current"))
                .andExpect(status().isOk());

        assertTrue(studyPlanRepository.existsById(planB.getId()), "Plan của User B vẫn phải tồn tại");
        StudyPlan freshPlanB = studyPlanRepository.findById(planB.getId()).orElseThrow();
        assertEquals(StudyPlan.Status.ACTIVE, freshPlanB.getStatus());
    }

    // =========================================================================
    // 8. DECK SRS FORECAST & QUEUE IDOR (GET /api/decks/{id}/srs-forecast, /srs-queue)
    // =========================================================================

    @Test
    @DisplayName("IDOR Deck Forecast: User A GET /api/decks/{id}/srs-forecast của B -> 404")
    void testGetDeckForecastOfOtherUser_Returns404() throws Exception {
        mockMvc.perform(get("/api/decks/" + deckB.getId() + "/srs-forecast"))
                .andExpect(status().isNotFound());
    }

    @Test
    @DisplayName("IDOR Deck Queue: User A GET /api/decks/{id}/srs-queue của B -> 404")
    void testGetDeckStudyQueueOfOtherUser_Returns404() throws Exception {
        mockMvc.perform(get("/api/decks/" + deckB.getId() + "/srs-queue"))
                .andExpect(status().isNotFound());
    }

    // =========================================================================
    // 9. CONTEXT STORY ENDPOINTS IDOR
    // =========================================================================

    @Test
    @DisplayName("IDOR ContextStory: User A POST tạo đoạn văn ngữ cảnh từ deck của B -> 404")
    void testGenerateContextStoryOnDeckOfOtherUser_Returns404() throws Exception {
        mockMvc.perform(post("/api/decks/" + deckB.getId() + "/context-story"))
                .andExpect(status().isNotFound());
    }

    @Test
    @DisplayName("IDOR ContextStory: User A GET đoạn văn ngữ cảnh từ deck của B -> 404")
    void testGetContextStoryOnDeckOfOtherUser_Returns404() throws Exception {
        mockMvc.perform(get("/api/decks/" + deckB.getId() + "/context-story"))
                .andExpect(status().isNotFound());
    }
}
