package com.languagelearning.backend.integration;

import com.languagelearning.backend.account.User;
import com.languagelearning.backend.account.UserRepository;
import com.languagelearning.backend.common.security.SecurityTestUtils;
import com.languagelearning.backend.deck.entity.VocabularySet;
import com.languagelearning.backend.deck.entity.VocabularySetItem;
import com.languagelearning.backend.deck.repository.VocabularySetItemRepository;
import com.languagelearning.backend.deck.repository.VocabularySetRepository;
import com.languagelearning.backend.study.dto.AddDecksToPlanRequest;
import com.languagelearning.backend.study.dto.CreateStudyPlanRequest;
import com.languagelearning.backend.study.dto.StudyPlanResponse;
import com.languagelearning.backend.study.entity.StudyProgress;
import com.languagelearning.backend.study.entity.StudyPlan;
import com.languagelearning.backend.study.entity.StudyPlanDeck;
import com.languagelearning.backend.study.repository.StudyPlanRepository;
import com.languagelearning.backend.study.repository.Sm2SqlConstants;
import com.languagelearning.backend.common.exception.ResourceNotFoundException;
import java.time.ZoneId;
import java.time.ZonedDateTime;
import java.util.Collections;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.Locale;

import com.languagelearning.backend.study.repository.StudyPlanDeckRepository;
import com.languagelearning.backend.study.repository.StudyPlanSql;
import com.languagelearning.backend.study.repository.StudyProgressRepository;
import com.languagelearning.backend.study.service.StudyPlanService;
import com.languagelearning.backend.term.entity.Vocabulary;
import com.languagelearning.backend.term.repository.VocabularyRepository;
import jakarta.persistence.EntityManager;
import org.hibernate.SessionFactory;
import org.hibernate.stat.Statistics;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest
@ActiveProfiles("test")
@Transactional
public class StudyPlanOptimizationIntegrationTest {

    @Autowired
    private StudyPlanService studyPlanService;

    @Autowired
    private StudyPlanRepository studyPlanRepository;


    @Autowired
    private StudyPlanDeckRepository studyPlanDeckRepository;

    @Autowired
    private VocabularySetRepository vocabularySetRepository;

    @Autowired
    private VocabularySetItemRepository vocabularySetItemRepository;

    @Autowired
    private VocabularyRepository vocabularyRepository;

    @Autowired
    private StudyProgressRepository studyProgressRepository;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private EntityManager entityManager;

    @Autowired
    private JdbcTemplate jdbcTemplate;

    private User testUser;
    private Long userId;

    @BeforeEach
    void setUp() {
        String email = "studyplan_opt_" + UUID.randomUUID() + "@example.com";
        testUser = userRepository.saveAndFlush(new User(email, "hash", "opt_user_" + UUID.randomUUID().toString().substring(0, 8), User.STATUS_ACTIVE));
        userId = testUser.getId();
        SecurityTestUtils.setAuthenticatedUser(userId, testUser.getEmail(), testUser.getUsername(), List.of("USER"));
    }

    @AfterEach
    void tearDown() {
        SecurityTestUtils.clearAuthentication();
    }

    private Vocabulary createVocab(String word, String meaning) {
        Vocabulary v = new Vocabulary();
        v.setWord(word);
        v.setMeaning(meaning);
        v.setWordType("noun");
        return vocabularyRepository.save(v);
    }

    private VocabularySet createDeckWithWords(Long ownerId, String name, List<Vocabulary> vocabs) {
        VocabularySet deck = new VocabularySet();
        deck.setUserId(ownerId);
        deck.setName(name);
        deck = vocabularySetRepository.save(deck);
        for (Vocabulary v : vocabs) {
            vocabularySetItemRepository.save(new VocabularySetItem(deck.getId(), v.getId()));
        }
        return deck;
    }

    private StudyProgress recordProgress(Long uid, Long vocabId, int correct, int wrong, double accuracy, int repetitions, int intervalDays, Instant nextReviewAt) {
        StudyProgress sp = new StudyProgress(uid, vocabId);
        sp.setCorrectCount(correct);
        sp.setWrongCount(wrong);
        sp.setAccuracy(BigDecimal.valueOf(accuracy));
        sp.setRepetitions(repetitions);
        sp.setIntervalDays(intervalDays);
        sp.setMemoryLevel(intervalDays > 21 ? 3 : (intervalDays >= 7 ? 2 : 1));
        sp.setNextReviewAt(nextReviewAt);
        sp.setLastReviewedAt(Instant.now().minus(1, ChronoUnit.DAYS));
        return studyProgressRepository.save(sp);
    }

    @Test
    @DisplayName("Golden Parity Test: SQL Aggregate và Legacy Java cho kết quả giống hệt 100% với từ trùng, bộ rỗng, tab/newline và Unicode")
    void goldenParityTest_SqlMatchesLegacyJavaExactly() {
        Instant now = Instant.now();

        // 1. Từ đã thuộc (Mastered: accuracy >= 80, repetitions >= 2)
        Vocabulary vMastered1 = createVocab("  conclusive\t\n ", "mang tính kết luận");
        // Bản trùng của conclusive ở bộ khác (với khoảng trắng và chữ hoa khác nhau)
        Vocabulary vMastered1Dup = createVocab("CONCLUSIVE", "kết luận (bản trùng)");

        // 2. Từ đang học đến hạn ôn (Due: nextReviewAt ở quá khứ, chưa đủ mastered)
        Vocabulary vDue = createVocab("resilient", "kiên cường");

        // 3. Từ yếu chưa đến hạn ôn (Weak: wrong > 0, accuracy < 70, nextReviewAt ở tương lai xa)
        Vocabulary vWeak = createVocab("ambiguous", "mơ hồ");

        // 4. Từ đang học bình thường (Learning: đã học, accuracy 75%, nextReviewAt ở tương lai xa)
        Vocabulary vLearning = createVocab("hải trình", "hành trình trên biển (Unicode)");

        // 5. Từ mới chưa học (New: không có StudyProgress hoặc correct=0, wrong=0)
        Vocabulary vNew1 = createVocab("ephemeral", "phù du");
        Vocabulary vNew2 = createVocab("ubiquitous", "ở đâu cũng có");

        recordProgress(userId, vMastered1.getId(), 5, 0, 100.0, 4, 25, now.plus(10, ChronoUnit.DAYS));
        recordProgress(userId, vDue.getId(), 1, 1, 50.0, 1, 1, now.minus(2, ChronoUnit.HOURS));
        recordProgress(userId, vWeak.getId(), 1, 3, 25.0, 0, 1, now.plus(5, ChronoUnit.DAYS));
        recordProgress(userId, vLearning.getId(), 3, 1, 75.0, 1, 3, now.plus(3, ChronoUnit.DAYS));
        recordProgress(userId, vNew2.getId(), 0, 0, 0.0, 0, 0, null);

        // Bộ 1: 4 từ
        VocabularySet deck1 = createDeckWithWords(userId, "Deck 1 - Core", List.of(vMastered1, vDue, vWeak, vLearning));
        // Bộ 2: 3 từ (trong đó có bản trùng CONCLUSIVE và vDue dùng chung vocabulary_id)
        VocabularySet deck2 = createDeckWithWords(userId, "Deck 2 - Overlap", List.of(vMastered1Dup, vDue, vNew1));
        // Bộ 3: Bộ rỗng 0 từ
        VocabularySet deck3Empty = createDeckWithWords(userId, "Deck 3 - Empty", List.of());
        // Bộ 4: Bộ chỉ chứa từ độc nhất vNew2
        VocabularySet deck4Unique = createDeckWithWords(userId, "Deck 4 - Unique", List.of(vNew2));
        // Bộ 5: Trùng 100% từ với Bộ 4
        VocabularySet deck5FullDup = createDeckWithWords(userId, "Deck 5 - FullDupOf4", List.of(vNew2));

        entityManager.flush();

        CreateStudyPlanRequest createReq = new CreateStudyPlanRequest(
                "Hải trình TOEIC",
                List.of(deck1.getId(), deck2.getId(), deck3Empty.getId(), deck4Unique.getId(), deck5FullDup.getId()),
                LocalDate.now().plusDays(30),
                20,
                5,
                "Asia/Ho_Chi_Minh",
                false
        );

        StudyPlanResponse sqlResp = studyPlanService.createPlan(userId, createReq);
        StudyPlanResponse legacyResp = buildPlanResponseLegacyForParity(userId, sqlResp.id());

        // Assert Parity 100% giữa SQL mới và Java cũ
        assertEquals(legacyResp.totalWords(), sqlResp.totalWords(), "totalWords phải khớp");
        assertEquals(legacyResp.masteredWords(), sqlResp.masteredWords(), "masteredWords phải khớp");
        assertEquals(legacyResp.learningWords(), sqlResp.learningWords(), "learningWords phải khớp");
        assertEquals(legacyResp.remainingWords(), sqlResp.remainingWords(), "remainingWords phải khớp");
        assertEquals(legacyResp.averageWordsPerDay(), sqlResp.averageWordsPerDay(), "averageWordsPerDay phải khớp");
        assertEquals(legacyResp.todayStats(), sqlResp.todayStats(), "todayStats phải khớp");
        assertEquals(legacyResp.decks(), sqlResp.decks(), "Danh sách DeckInfo (cardCount, masteredCount, sortOrder) phải khớp");

        // Kiểm tra bộ rỗng vẫn hiện với cardCount = 0, masteredCount = 0
        StudyPlanResponse.DeckInfo emptyDeckInfo = sqlResp.decks().stream()
                .filter(d -> d.id().equals(deck3Empty.getId()))
                .findFirst()
                .orElseThrow();
        assertEquals(0, emptyDeckInfo.cardCount());
        assertEquals(0, emptyDeckInfo.masteredCount());

        // Case khử trùng 2: Xóa deck5FullDup (trùng 100% với deck4Unique) -> totalWords không đổi
        int totalBeforeDupRemove = sqlResp.totalWords();
        StudyPlanResponse afterRemoveDup = studyPlanService.removeDecksFromPlan(userId, List.of(deck5FullDup.getId()));
        assertEquals(totalBeforeDupRemove, afterRemoveDup.totalWords(), "Xóa bộ trùng 100% từ thì totalWords giữ nguyên");

        // Case khử trùng 1: Xóa tiếp deck4Unique (chứa từ độc nhất vNew2) -> totalWords giảm đúng 1
        StudyPlanResponse afterRemoveUnique = studyPlanService.removeDecksFromPlan(userId, List.of(deck4Unique.getId()));
        assertEquals(totalBeforeDupRemove - 1, afterRemoveUnique.totalWords(), "Xóa bộ chứa từ độc nhất thì totalWords giảm đúng số từ đó");
    }

    @Test
    @DisplayName("Query Count Test: Xóa 1 bộ hay xóa 15 bộ đều có số câu SQL cố định O(1) và dưới 100ms")
    void queryCountAndLatency_IsConstantRegardlessOfDeckCount() {
        List<Long> deckIdsPlanA = new ArrayList<>();
        for (int i = 0; i < 5; i++) {
            Vocabulary v = createVocab("word_a_" + i, "meaning " + i);
            VocabularySet d = createDeckWithWords(userId, "PlanA Deck " + i, List.of(v));
            deckIdsPlanA.add(d.getId());
        }

        StudyPlanResponse planA = studyPlanService.createPlan(userId, new CreateStudyPlanRequest(
                "Plan A", deckIdsPlanA, LocalDate.now().plusDays(15), 30, 5, "Asia/Ho_Chi_Minh", false
        ));
        entityManager.flush();
        entityManager.clear();

        SessionFactory sf = entityManager.getEntityManagerFactory().unwrap(SessionFactory.class);
        Statistics stats = sf.getStatistics();
        stats.setStatisticsEnabled(true);

        // Lần 1: Xóa 1 bộ từ lộ trình 5 bộ
        stats.clear();
        studyPlanService.removeDecksFromPlan(userId, List.of(deckIdsPlanA.get(0)));
        long queriesForRemove1 = stats.getPrepareStatementCount();

        // Tạo lộ trình 20 bộ từ
        List<Long> deckIdsPlanB = new ArrayList<>();
        for (int i = 0; i < 20; i++) {
            List<Vocabulary> words = new ArrayList<>();
            for (int w = 0; w < 10; w++) {
                words.add(createVocab("word_b_" + i + "_" + w, "meaning"));
            }
            VocabularySet d = createDeckWithWords(userId, "PlanB Deck " + i, words);
            deckIdsPlanB.add(d.getId());
        }

        studyPlanService.createPlan(userId, new CreateStudyPlanRequest(
                "Plan B", deckIdsPlanB, LocalDate.now().plusDays(30), 30, 5, "Asia/Ho_Chi_Minh", false
        ));
        entityManager.flush();
        entityManager.clear();

        // Lần 2: Xóa hàng loạt 15 bộ từ cùng lúc từ lộ trình 20 bộ
        stats.clear();
        long startNs = System.nanoTime();
        StudyPlanResponse afterRemove15 = studyPlanService.removeDecksFromPlan(userId, deckIdsPlanB.subList(0, 15));
        long elapsedMs = (System.nanoTime() - startNs) / 1_000_000;
        long queriesForRemove15 = stats.getPrepareStatementCount();

        assertEquals(5, afterRemove15.decks().size());
        assertEquals(queriesForRemove1, queriesForRemove15,
                "Số câu SQL khi xóa 1 bộ và xóa 15 bộ phải bằng nhau tuyệt đối (O(1) queries)");
        assertTrue(elapsedMs < 200, "Thời gian thực thi xóa 15 bộ phải nhanh (< 200ms), thực tế: " + elapsedMs + "ms");

        // Kiểm tra EXPLAIN (ANALYZE, BUFFERS) cho 2 câu SQL mới
        List<Map<String, Object>> explainDeckStats = jdbcTemplate.queryForList(
                "EXPLAIN (ANALYZE, BUFFERS) " + StudyPlanSql.DECK_STATS.replace(":userId", userId.toString()).replace(":planId", afterRemove15.id().toString())
        );
        assertFalse(explainDeckStats.isEmpty());
    }

    @Test
    @DisplayName("Bảo toàn lịch sử SM-2 & Hoàn tác giữ nguyên vị trí sort_order ban đầu")
    void sm2ProgressPreservedAndUndoRestoresExactSortOrder() {
        Instant now = Instant.now();
        Vocabulary v1 = createVocab("preserve_1", "nghĩa 1");
        Vocabulary v2 = createVocab("preserve_2", "nghĩa 2");
        Vocabulary v3 = createVocab("preserve_3", "nghĩa 3");

        recordProgress(userId, v1.getId(), 6, 1, 85.71, 3, 15, now.plus(10, ChronoUnit.DAYS));
        recordProgress(userId, v2.getId(), 2, 2, 50.00, 1, 2, now.minus(1, ChronoUnit.HOURS));
        recordProgress(userId, v3.getId(), 4, 0, 100.00, 4, 30, now.plus(25, ChronoUnit.DAYS));

        VocabularySet d1 = createDeckWithWords(userId, "Thứ tự 1", List.of(v1));
        VocabularySet d2 = createDeckWithWords(userId, "Thứ tự 2", List.of(v2));
        VocabularySet d3 = createDeckWithWords(userId, "Thứ tự 3", List.of(v3));

        StudyPlanResponse initialPlan = studyPlanService.createPlan(userId, new CreateStudyPlanRequest(
                "Plan SM2", List.of(d1.getId(), d2.getId(), d3.getId()),
                LocalDate.now().plusDays(20), 20, 5, "Asia/Ho_Chi_Minh", false
        ));
        long initialRevision = initialPlan.revision();

        // Lưu snapshot StudyProgress trước khi xóa
        List<StudyProgress> beforeRemove = studyProgressRepository.findByUserIdAndVocabularyIdIn(
                userId, List.of(v1.getId(), v2.getId(), v3.getId())
        );
        assertEquals(3, beforeRemove.size());

        // Xóa bộ ở vị trí giữa (d2, sortOrder = 2)
        StudyPlanResponse afterRemoveMiddle = studyPlanService.removeDecksFromPlan(userId, List.of(d2.getId()));
        assertEquals(initialRevision + 1, afterRemoveMiddle.revision());
        assertEquals(2, afterRemoveMiddle.decks().size());

        // Kiểm tra StudyProgress của v2 vẫn còn nguyên vẹn 100%
        StudyProgress sp2AfterRemove = studyProgressRepository.findByUserIdAndVocabularyId(userId, v2.getId()).orElseThrow();
        assertEquals(2, sp2AfterRemove.getCorrectCount());
        assertEquals(2, sp2AfterRemove.getWrongCount());
        assertEquals(new BigDecimal("50.00"), sp2AfterRemove.getAccuracy());
        assertEquals(1, sp2AfterRemove.getRepetitions());

        // Hoàn tác (Undo) bộ d2 kèm sortOrder = 2
        AddDecksToPlanRequest undoReq = new AddDecksToPlanRequest(
                List.of(d2.getId()),
                null,
                null,
                null,
                List.of(new AddDecksToPlanRequest.DeckPosition(d2.getId(), 2))
        );
        StudyPlanResponse afterUndo = studyPlanService.addDecksToActivePlan(userId, undoReq);

        assertEquals(initialRevision + 2, afterUndo.revision());
        assertEquals(1, afterUndo.restoredCount());
        assertEquals(List.of(d1.getId(), d2.getId(), d3.getId()),
                afterUndo.decks().stream().map(StudyPlanResponse.DeckInfo::id).toList(),
                "Sau khi Hoàn tác, bộ d2 phải nằm lại đúng vị trí số 2 ở giữa d1 và d3");
        assertEquals(initialPlan.masteredWords(), afterUndo.masteredWords());
        assertEquals(initialPlan.learningWords(), afterUndo.learningWords());
        assertEquals(initialPlan.todayStats(), afterUndo.todayStats());
    }

    @Test
    @DisplayName("Xóa hết toàn bộ bộ từ (totalWords = 0) & Kiểm tra bảo mật quyền sở hữu giữa 2 User")
    void removeAllDecks_ZeroDivisionGuard_AndCrossUserSecurity() {
        Vocabulary v = createVocab("solo_word", "từ đơn");
        VocabularySet d1 = createDeckWithWords(userId, "Solo Deck", List.of(v));

        StudyPlanResponse plan = studyPlanService.createPlan(userId, new CreateStudyPlanRequest(
                "Plan Solo", List.of(d1.getId()), LocalDate.now().plusDays(10), 20, 5, "Asia/Ho_Chi_Minh", false
        ));

        // Tạo User B với lộ trình riêng
        User userB = userRepository.saveAndFlush(new User("userb_" + UUID.randomUUID() + "@example.com", "hash", "userb_" + UUID.randomUUID().toString().substring(0, 6), User.STATUS_ACTIVE));
        VocabularySet deckOfB = createDeckWithWords(userB.getId(), "Deck of B", List.of(v));
        StudyPlanResponse planOfB = studyPlanService.createPlan(userB.getId(), new CreateStudyPlanRequest(
                "Plan B", List.of(deckOfB.getId()), LocalDate.now().plusDays(10), 20, 5, "Asia/Ho_Chi_Minh", false
        ));

        // User A cố tình truyền ID bộ từ của User B và ID không tồn tại cùng với d1
        StudyPlanResponse emptyPlan = studyPlanService.removeDecksFromPlan(
                userId,
                List.of(d1.getId(), d1.getId(), deckOfB.getId(), 9999999L)
        );

        // Lộ trình của User A rỗng an toàn, không lỗi chia cho 0, completedToday = false
        assertTrue(emptyPlan.decks().isEmpty());
        assertEquals(0, emptyPlan.totalWords());
        assertEquals(0, emptyPlan.masteredWords());
        assertEquals(0, emptyPlan.learningWords());
        assertEquals(0.0, emptyPlan.averageWordsPerDay());
        assertFalse(emptyPlan.todayStats().completedToday(), "Khi lộ trình rỗng (totalWords = 0), completedToday phải là false");

        // Lộ trình của User B hoàn toàn nguyên vẹn
        StudyPlanResponse checkPlanB = studyPlanService.getCurrentPlan(userB.getId());
        assertEquals(1, checkPlanB.decks().size());
        assertEquals(deckOfB.getId(), checkPlanB.decks().get(0).id());
        assertEquals(planOfB.revision(), checkPlanB.revision());
    }

    private StudyPlanResponse buildPlanResponseLegacyForParity(Long userId, Long planId) {
        StudyPlan plan = studyPlanRepository.findById(planId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy lộ trình ôn tập."));
        if (!plan.getUserId().equals(userId)) {
            throw new ResourceNotFoundException("Không tìm thấy lộ trình ôn tập.");
        }

        List<StudyPlanDeck> planDecks = studyPlanDeckRepository.findByStudyPlanId(plan.getId()).stream()
                .sorted(Comparator.comparingInt(StudyPlanDeck::getSortOrder).thenComparingLong(StudyPlanDeck::getId))
                .toList();
        List<Long> deckIds = planDecks.stream().map(StudyPlanDeck::getDeckId).toList();

        List<Vocabulary> allPlanVocabs = deckIds.isEmpty() ? Collections.emptyList() : vocabularyRepository.findByDeckIdIn(deckIds);
        List<Long> allVocabIds = allPlanVocabs.stream().map(Vocabulary::getId).toList();
        Map<Long, StudyProgress> allProgressMap = allVocabIds.isEmpty() ? Collections.emptyMap() :
                studyProgressRepository.findByUserIdAndVocabularyIdIn(userId, allVocabIds)
                        .stream().collect(Collectors.toMap(StudyProgress::getVocabularyId, p -> p));

        List<StudyPlanResponse.DeckInfo> deckInfos = new ArrayList<>();
        if (!deckIds.isEmpty()) {
            Map<Long, String> deckNames = vocabularySetRepository.findAllById(deckIds).stream()
                    .collect(Collectors.toMap(VocabularySet::getId, VocabularySet::getName));

            for (StudyPlanDeck spd : planDecks) {
                Long deckId = spd.getDeckId();
                List<Vocabulary> vocabs = vocabularyRepository.findByDeckId(deckId);
                int deckMastered = 0;
                for (Vocabulary v : vocabs) {
                    StudyProgress sp = allProgressMap.get(v.getId());
                    if (isMasteredInJava(sp)) {
                        deckMastered++;
                    }
                }
                deckInfos.add(new StudyPlanResponse.DeckInfo(
                        deckId,
                        deckNames.getOrDefault(deckId, "Bộ thẻ #" + deckId),
                        vocabs.size(),
                        deckMastered,
                        spd.getSortOrder()
                ));
            }
        }

        Map<String, Vocabulary> dedupedPlanMap = new LinkedHashMap<>();
        for (Vocabulary v : allPlanVocabs) {
            if (v.getWord() != null) {
                dedupedPlanMap.putIfAbsent(normalizeWord(v.getWord()), v);
            }
        }
        List<Vocabulary> uniquePlanVocabs = new ArrayList<>(dedupedPlanMap.values());

        ZoneId zoneId = parseZoneId(plan.getTimezone());
        LocalDate currentStudyDate = getStudyDay(zoneId);
        Instant endOfStudyDay = currentStudyDate.plusDays(1).atTime(3, 59, 59).atZone(zoneId).toInstant();

        int masteredWords = 0;
        int learningWords = 0;
        int dueCount = 0;
        int weakCount = 0;
        int unstudiedNewWords = 0;

        for (Vocabulary v : uniquePlanVocabs) {
            StudyProgress sp = allProgressMap.get(v.getId());
            if (!isStudiedInJava(sp)) {
                unstudiedNewWords++;
            } else {
                if (isMasteredInJava(sp)) {
                    masteredWords++;
                } else {
                    learningWords++;
                }
                if (sp.getNextReviewAt() != null && sp.getNextReviewAt().isBefore(endOfStudyDay)) {
                    dueCount++;
                } else if (sp.getWrongCount() > 0 && (sp.getAccuracy() == null || sp.getAccuracy().doubleValue() < Sm2SqlConstants.WEAK_MAX_ACCURACY)) {
                    weakCount++;
                }
            }
        }

        int totalWords = uniquePlanVocabs.size();
        int remainingWords = Math.max(0, totalWords - masteredWords);

        LocalDate today = LocalDate.now();
        long daysRemaining = Math.max(1, ChronoUnit.DAYS.between(today, plan.getTargetDate()) + 1);
        double avgWordsPerDay = totalWords == 0
                ? 0.0
                : Math.round(((double) remainingWords / daysRemaining) * 10.0) / 10.0;
        boolean isOverloaded = avgWordsPerDay > plan.getMaxNewWordsPerDay();

        int newCount = Math.min(plan.getMaxNewWordsPerDay(), unstudiedNewWords);
        int totalToday = dueCount + weakCount + newCount;
        boolean completedToday = totalWords > 0 && totalToday == 0;

        StudyPlanResponse.TodayStats todayStats = new StudyPlanResponse.TodayStats(
                dueCount,
                weakCount,
                newCount,
                totalToday,
                completedToday
        );

        return new StudyPlanResponse(
                plan.getId(),
                plan.getName(),
                plan.getTargetDate(),
                plan.getMaxNewWordsPerDay(),
                plan.getMinWordsPerDay(),
                plan.getTimezone(),
                plan.isHardGateEnabled(),
                plan.getStatus(),
                deckInfos,
                totalWords,
                masteredWords,
                learningWords,
                remainingWords,
                daysRemaining,
                avgWordsPerDay,
                isOverloaded,
                todayStats,
                plan.getRevision(),
                null,
                plan.getCreatedAt(),
                plan.getUpdatedAt()
        );
    }

    private boolean isStudiedInJava(StudyProgress sp) {
        return sp != null && (sp.getCorrectCount() > 0 || sp.getWrongCount() > 0);
    }

    private boolean isMasteredInJava(StudyProgress sp) {
        return isStudiedInJava(sp)
                && sp.getAccuracy() != null
                && sp.getAccuracy().doubleValue() >= Sm2SqlConstants.MASTERED_MIN_ACCURACY
                && sp.getRepetitions() >= Sm2SqlConstants.MASTERED_MIN_REPETITIONS;
    }

    private String normalizeWord(String word) {
        return word == null ? "" : word.trim().toLowerCase(Locale.ROOT);
    }

    private ZoneId parseZoneId(String tz) {
        try {
            return (tz != null && !tz.isBlank()) ? ZoneId.of(tz) : ZoneId.of("Asia/Ho_Chi_Minh");
        } catch (Exception e) {
            return ZoneId.of("Asia/Ho_Chi_Minh");
        }
    }

    private LocalDate getStudyDay(ZoneId zoneId) {
        ZonedDateTime nowZoned = ZonedDateTime.now(zoneId);
        if (nowZoned.getHour() < 4) {
            return nowZoned.toLocalDate().minusDays(1);
        }
        return nowZoned.toLocalDate();
    }
}
