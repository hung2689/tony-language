package com.languagelearning.backend.study;

import com.languagelearning.backend.account.User;
import com.languagelearning.backend.account.UserRepository;
import com.languagelearning.backend.common.security.SecurityTestUtils;
import com.languagelearning.backend.deck.entity.VocabularySet;
import com.languagelearning.backend.deck.entity.VocabularySetItem;
import com.languagelearning.backend.deck.repository.VocabularySetItemRepository;
import com.languagelearning.backend.deck.repository.VocabularySetRepository;
import com.languagelearning.backend.study.dto.TodayStudyQueueResponse;
import com.languagelearning.backend.study.dto.TodaySummaryResponse;
import com.languagelearning.backend.study.entity.StudyPlan;
import com.languagelearning.backend.study.entity.StudyPlanDeck;
import com.languagelearning.backend.study.entity.StudyProgress;
import com.languagelearning.backend.study.repository.StudyPlanDeckRepository;
import com.languagelearning.backend.study.repository.StudyPlanRepository;
import com.languagelearning.backend.study.repository.StudyProgressRepository;
import com.languagelearning.backend.study.service.StudyPlanService;
import com.languagelearning.backend.term.dto.TermCardDto;
import com.languagelearning.backend.term.entity.Vocabulary;
import com.languagelearning.backend.term.entity.VocabularySynonym;
import com.languagelearning.backend.term.repository.VocabularyRepository;
import com.languagelearning.backend.term.repository.VocabularySynonymRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.text.Normalizer;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.time.ZonedDateTime;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest
@ActiveProfiles("test")
@Transactional
public class TodayQueueParityIntegrationTest {

    @Autowired
    private StudyPlanService studyPlanService;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private VocabularyRepository vocabularyRepository;

    @Autowired
    private VocabularySetRepository vocabularySetRepository;

    @Autowired
    private VocabularySetItemRepository vocabularySetItemRepository;

    @Autowired
    private StudyPlanRepository studyPlanRepository;

    @Autowired
    private StudyPlanDeckRepository studyPlanDeckRepository;

    @Autowired
    private StudyProgressRepository studyProgressRepository;

    @Autowired
    private VocabularySynonymRepository vocabularySynonymRepository;

    private User testUser;

    @BeforeEach
    void setUp() {
        testUser = userRepository.findByEmailIgnoreCase("parity_user@languagelearning.com")
                .orElseGet(() -> {
                    User u = new User();
                    u.setEmail("parity_user@languagelearning.com");
                    u.setUsername("parity_user");
                    u.setPasswordHash("$2a$10$dummyHashForTestingPurposesOnly");
                    return userRepository.save(u);
                });
        SecurityTestUtils.setAuthenticatedUser(testUser.getId(), testUser.getEmail(), testUser.getUsername(), List.of("USER"));
    }

    private void assertQueueParity(TodayStudyQueueResponse expected, TodayStudyQueueResponse actual) {
        assertEquals(expected.planId(), actual.planId(), "planId must match");
        assertEquals(expected.planName(), actual.planName(), "planName must match");
        assertEquals(expected.todayDate(), actual.todayDate(), "todayDate must match");
        assertEquals(expected.dueCount(), actual.dueCount(), "dueCount must match");
        assertEquals(expected.weakCount(), actual.weakCount(), "weakCount must match");
        assertEquals(expected.newCount(), actual.newCount(), "newCount must match");
        assertEquals(expected.totalCount(), actual.totalCount(), "totalCount must match");
        assertEquals(expected.cards().size(), actual.cards().size(), "cards size must match");

        for (int i = 0; i < expected.cards().size(); i++) {
            TermCardDto expCard = expected.cards().get(i);
            TermCardDto actCard = actual.cards().get(i);
            assertEquals(expCard.getId(), actCard.getId(), "Card id at index " + i + " must match");
            assertEquals(expCard.getTerm(), actCard.getTerm(), "Card term at index " + i + " must match");
            assertEquals(expCard.getDefinition(), actCard.getDefinition(), "Card definition at index " + i + " must match");
            assertEquals(expCard.getPronunciation(), actCard.getPronunciation(), "Card pronunciation at index " + i + " must match");
            assertEquals(expCard.getPartOfSpeech(), actCard.getPartOfSpeech(), "Card partOfSpeech at index " + i + " must match");
            assertEquals(expCard.getExample(), actCard.getExample(), "Card example at index " + i + " must match");
            assertEquals(expCard.getSynonyms(), actCard.getSynonyms(), "Card synonyms at index " + i + " must match");
        }
    }

    private void assertSummaryParity(TodayStudyQueueResponse queue, TodaySummaryResponse summary) {
        assertEquals(queue.planId(), summary.planId(), "summary planId must match");
        assertEquals(queue.planName(), summary.planName(), "summary planName must match");
        assertEquals(queue.todayDate(), summary.todayDate(), "summary todayDate must match");
        assertEquals(queue.dueCount(), summary.dueCount(), "summary dueCount must match");
        assertEquals(queue.weakCount(), summary.weakCount(), "summary weakCount must match");
        assertEquals(queue.newCount(), summary.newCount(), "summary newCount must match");
        assertEquals(queue.totalCount(), summary.totalCount(), "summary totalCount must match");

        assertEquals(queue.dueCount(), summary.dueWords(), "summary dueWords must match");
        assertEquals(queue.weakCount(), summary.weakWords(), "summary weakWords must match");
        assertEquals(queue.newCount(), summary.newWords(), "summary newWords must match");
        assertEquals(queue.totalCount(), summary.totalWords(), "summary totalWords must match");
    }

    private Vocabulary createVocab(String word, String meaning, String type, String pron, String ex) {
        Vocabulary v = new Vocabulary();
        v.setWord(word);
        v.setMeaning(meaning);
        v.setWordType(type);
        v.setPronunciation(pron);
        v.setExampleSentence(ex);
        return vocabularyRepository.save(v);
    }

    private VocabularySet createDeck(String name) {
        VocabularySet set = new VocabularySet();
        set.setName(name);
        set.setUserId(testUser.getId());
        return vocabularySetRepository.save(set);
    }

    private void addCardToDeck(Long deckId, Long vocabId) {
        VocabularySetItem item = new VocabularySetItem(deckId, vocabId);
        vocabularySetItemRepository.save(item);
    }

    private StudyPlan createPlan(String name, String tz, int maxNew, int minWords) {
        StudyPlan plan = new StudyPlan();
        plan.setUserId(testUser.getId());
        plan.setName(name);
        plan.setTimezone(tz);
        plan.setStatus(StudyPlan.Status.ACTIVE);
        plan.setMaxNewWordsPerDay(maxNew);
        plan.setMinWordsPerDay(minWords);
        plan.setTargetDate(LocalDate.now().plusDays(30));
        return studyPlanRepository.save(plan);
    }

    private void attachDeckToPlan(Long planId, Long deckId, int sortOrder) {
        StudyPlanDeck spd = new StudyPlanDeck(planId, deckId, sortOrder);
        studyPlanDeckRepository.save(spd);
    }

    @Test
    @DisplayName("Kịch bản 1: Lộ trình rỗng (không có bộ từ nào)")
    void testParity_EmptyPlan() {
        createPlan("Empty Plan", "Asia/Ho_Chi_Minh", 20, 10);
        TodayStudyQueueResponse legacy = studyPlanService.getTodayQueueLegacyForParity(testUser.getId());
        TodayStudyQueueResponse optimized = studyPlanService.getTodayQueue(testUser.getId());
        assertQueueParity(legacy, optimized);
        assertSummaryParity(optimized, studyPlanService.getTodaySummary(testUser.getId()));
        assertEquals(0, optimized.totalCount());
        assertTrue(optimized.cards().isEmpty());
    }

    @Test
    @DisplayName("Kịch bản 2: Toàn bộ từ mới (User chưa học từ nào)")
    void testParity_AllNewWords() {
        VocabularySet deck = createDeck("New Words Deck");
        for (int i = 1; i <= 25; i++) {
            Vocabulary v = createVocab("word_" + i, "Nghĩa " + i, "noun", "/w" + i + "/", "Ex " + i);
            addCardToDeck(deck.getId(), v.getId());
        }
        StudyPlan plan = createPlan("New Words Plan", "Asia/Ho_Chi_Minh", 10, 5);
        attachDeckToPlan(plan.getId(), deck.getId(), 1);

        TodayStudyQueueResponse legacy = studyPlanService.getTodayQueueLegacyForParity(testUser.getId());
        TodayStudyQueueResponse optimized = studyPlanService.getTodayQueue(testUser.getId());
        assertQueueParity(legacy, optimized);
        assertSummaryParity(optimized, studyPlanService.getTodaySummary(testUser.getId()));
        assertEquals(10, optimized.newCount());
        assertEquals(10, optimized.totalCount());
    }

    @Test
    @DisplayName("Kịch bản 3: Toàn bộ từ đến hạn (Due reviews)")
    void testParity_AllDueWords() {
        VocabularySet deck = createDeck("Due Deck");
        StudyPlan plan = createPlan("Due Plan", "Asia/Ho_Chi_Minh", 5, 5);
        attachDeckToPlan(plan.getId(), deck.getId(), 1);

        Instant past = Instant.now().minus(2, ChronoUnit.DAYS);
        for (int i = 1; i <= 15; i++) {
            Vocabulary v = createVocab("due_word_" + i, "Nghĩa " + i, "verb", "/d" + i + "/", "Ex " + i);
            addCardToDeck(deck.getId(), v.getId());

            StudyProgress sp = new StudyProgress(testUser.getId(), v.getId());
            sp.setCorrectCount(2);
            sp.setWrongCount(0);
            sp.setAccuracy(new BigDecimal("100.00"));
            sp.setNextReviewAt(past.plus(i, ChronoUnit.HOURS));
            studyProgressRepository.save(sp);
        }

        TodayStudyQueueResponse legacy = studyPlanService.getTodayQueueLegacyForParity(testUser.getId());
        TodayStudyQueueResponse optimized = studyPlanService.getTodayQueue(testUser.getId());
        assertQueueParity(legacy, optimized);
        assertSummaryParity(optimized, studyPlanService.getTodaySummary(testUser.getId()));
        assertEquals(15, optimized.dueCount());
        assertEquals(15, optimized.totalCount());
    }

    @Test
    @DisplayName("Kịch bản 4: Trùng từ khác hoa-thường, khoảng trắng, Unicode NFC vs NFD")
    void testParity_Duplicates_Case_Whitespace_Nfd_Nfc() {
        VocabularySet deck = createDeck("Unicode Deck");
        // "tiếng việt" in various forms
        String nfdWord = Normalizer.normalize("tiếng việt", Normalizer.Form.NFD);
        String nfcUpper = "  TIẾNG VIỆT  ";
        String nfcLower = "tiếng việt";

        Vocabulary v1 = createVocab(nfcUpper, "Nghĩa hoa khoảng trắng", "noun", "/tv1/", "Ex 1");
        Vocabulary v2 = createVocab(nfdWord, "Nghĩa NFD", "noun", "/tv2/", "Ex 2");
        Vocabulary v3 = createVocab(nfcLower, "Nghĩa chuẩn NFC", "noun", "/tv3/", "Ex 3");

        addCardToDeck(deck.getId(), v1.getId());
        addCardToDeck(deck.getId(), v2.getId());
        addCardToDeck(deck.getId(), v3.getId());

        // Synonyms for v1
        VocabularySynonym s1 = new VocabularySynonym();
        s1.setVocabularyId(v1.getId());
        s1.setSynonym("tieng viet");
        vocabularySynonymRepository.save(s1);

        StudyPlan plan = createPlan("Unicode Plan", "Asia/Ho_Chi_Minh", 10, 5);
        attachDeckToPlan(plan.getId(), deck.getId(), 1);

        TodayStudyQueueResponse legacy = studyPlanService.getTodayQueueLegacyForParity(testUser.getId());
        TodayStudyQueueResponse optimized = studyPlanService.getTodayQueue(testUser.getId());
        assertQueueParity(legacy, optimized);
        assertSummaryParity(optimized, studyPlanService.getTodaySummary(testUser.getId()));
        assertEquals(1, optimized.totalCount(), "Deduplication must select exactly 1 card");
        assertEquals(v1.getId(), optimized.cards().get(0).getId(), "Must pick MIN(id)");
        assertEquals(List.of("tieng viet"), optimized.cards().get(0).getSynonyms());
    }

    @Test
    @DisplayName("Kịch bản 5: Nhiều deck trong cùng plan chứa chung từ vựng")
    void testParity_MultipleDecksSharingSameWords() {
        VocabularySet deck1 = createDeck("Deck A");
        VocabularySet deck2 = createDeck("Deck B");

        Vocabulary vShared = createVocab("shared_word", "Nghĩa chung", "adj", "/sh/", "Shared");
        Vocabulary vUniqueA = createVocab("unique_a", "Nghĩa A", "noun", "/ua/", "A");
        Vocabulary vUniqueB = createVocab("unique_b", "Nghĩa B", "noun", "/ub/", "B");

        addCardToDeck(deck1.getId(), vShared.getId());
        addCardToDeck(deck1.getId(), vUniqueA.getId());

        addCardToDeck(deck2.getId(), vShared.getId()); // shared in deck 2
        addCardToDeck(deck2.getId(), vUniqueB.getId());

        StudyPlan plan = createPlan("Multi Deck Plan", "Asia/Ho_Chi_Minh", 10, 5);
        attachDeckToPlan(plan.getId(), deck1.getId(), 1);
        attachDeckToPlan(plan.getId(), deck2.getId(), 2);

        TodayStudyQueueResponse legacy = studyPlanService.getTodayQueueLegacyForParity(testUser.getId());
        TodayStudyQueueResponse optimized = studyPlanService.getTodayQueue(testUser.getId());
        assertQueueParity(legacy, optimized);
        assertSummaryParity(optimized, studyPlanService.getTodaySummary(testUser.getId()));
        assertEquals(3, optimized.totalCount(), "Must deduplicate shared word across decks");
    }

    @Test
    @DisplayName("Kịch bản 6: Múi giờ khác nhau (UTC vs Asia/Ho_Chi_Minh vs America/New_York)")
    void testParity_DifferentTimezones() {
        VocabularySet deck = createDeck("Tz Deck");
        Vocabulary v = createVocab("tz_word", "Múi giờ", "noun", "/tz/", "Tz");
        addCardToDeck(deck.getId(), v.getId());

        StudyProgress sp = new StudyProgress(testUser.getId(), v.getId());
        sp.setCorrectCount(1);
        sp.setWrongCount(0);
        sp.setAccuracy(new BigDecimal("100.00"));
        // scheduled near day boundary
        sp.setNextReviewAt(Instant.now().plus(6, ChronoUnit.HOURS));
        studyProgressRepository.save(sp);

        String[] timezones = {"UTC", "Asia/Ho_Chi_Minh", "America/New_York", "Europe/London"};
        for (String tz : timezones) {
            StudyPlan plan = createPlan("Plan " + tz, tz, 10, 5);
            attachDeckToPlan(plan.getId(), deck.getId(), 1);

            TodayStudyQueueResponse legacy = studyPlanService.getTodayQueueLegacyForParity(testUser.getId());
            TodayStudyQueueResponse optimized = studyPlanService.getTodayQueue(testUser.getId());
            assertQueueParity(legacy, optimized);
            assertSummaryParity(optimized, studyPlanService.getTodaySummary(testUser.getId()));

            // Clean up plan for next tz
            studyPlanDeckRepository.deleteByStudyPlanId(plan.getId());
            studyPlanRepository.delete(plan);
        }
    }

    @Test
    @DisplayName("Kịch bản 7: Quota min/max ở các giá trị biên")
    void testParity_QuotaBoundaries_MinMax() {
        VocabularySet deck = createDeck("Quota Deck");
        List<Long> vocabIds = new ArrayList<>();
        for (int i = 1; i <= 20; i++) {
            Vocabulary v = createVocab("qword_" + i, "Nghĩa " + i, "noun", "/q" + i + "/", "Ex " + i);
            addCardToDeck(deck.getId(), v.getId());
            vocabIds.add(v.getId());
        }

        // Half due, half other
        for (int i = 0; i < 10; i++) {
            StudyProgress sp = new StudyProgress(testUser.getId(), vocabIds.get(i));
            sp.setCorrectCount(2);
            sp.setWrongCount(0);
            sp.setAccuracy(new BigDecimal("100.00"));
            if (i < 5) {
                sp.setNextReviewAt(Instant.now().minus(1, ChronoUnit.DAYS)); // Due
            } else {
                sp.setNextReviewAt(Instant.now().plus(10, ChronoUnit.DAYS)); // Other
            }
            studyProgressRepository.save(sp);
        }

        // Case A: maxNew = 0, minWords = 0 (only due cards)
        StudyPlan planA = createPlan("Plan A", "Asia/Ho_Chi_Minh", 0, 0);
        attachDeckToPlan(planA.getId(), deck.getId(), 1);
        TodayStudyQueueResponse qA = studyPlanService.getTodayQueue(testUser.getId());
        assertQueueParity(
                studyPlanService.getTodayQueueLegacyForParity(testUser.getId()),
                qA
        );
        assertSummaryParity(qA, studyPlanService.getTodaySummary(testUser.getId()));
        studyPlanDeckRepository.deleteByStudyPlanId(planA.getId());
        studyPlanRepository.delete(planA);

        // Case B: minWords = 15 (requires backfilling from other cards)
        StudyPlan planB = createPlan("Plan B", "Asia/Ho_Chi_Minh", 3, 15);
        attachDeckToPlan(planB.getId(), deck.getId(), 1);
        TodayStudyQueueResponse qB = studyPlanService.getTodayQueue(testUser.getId());
        assertQueueParity(
                studyPlanService.getTodayQueueLegacyForParity(testUser.getId()),
                qB
        );
        assertSummaryParity(qB, studyPlanService.getTodaySummary(testUser.getId()));
        studyPlanDeckRepository.deleteByStudyPlanId(planB.getId());
        studyPlanRepository.delete(planB);

        // Case C: minWords > total cards (backfill exhausts other cards cleanly)
        StudyPlan planC = createPlan("Plan C", "Asia/Ho_Chi_Minh", 20, 100);
        attachDeckToPlan(planC.getId(), deck.getId(), 1);
        TodayStudyQueueResponse qC = studyPlanService.getTodayQueue(testUser.getId());
        assertQueueParity(
                studyPlanService.getTodayQueueLegacyForParity(testUser.getId()),
                qC
        );
        assertSummaryParity(qC, studyPlanService.getTodaySummary(testUser.getId()));
    }

    @Test
    @DisplayName("Kịch bản 8: User hoàn toàn chưa có StudyProgress nào")
    void testParity_UserWithoutProgress() {
        User brandNewUser = new User();
        brandNewUser.setEmail("brand_new_user@languagelearning.com");
        brandNewUser.setUsername("brand_new_user");
        brandNewUser.setPasswordHash("hash");
        userRepository.save(brandNewUser);

        VocabularySet deck = createDeck("Deck for New User");
        for (int i = 1; i <= 8; i++) {
            Vocabulary v = createVocab("fresh_word_" + i, "Nghĩa " + i, "verb", "/f/", "Fresh");
            addCardToDeck(deck.getId(), v.getId());
        }

        StudyPlan plan = new StudyPlan();
        plan.setUserId(brandNewUser.getId());
        plan.setName("Fresh Plan");
        plan.setTimezone("Asia/Ho_Chi_Minh");
        plan.setStatus(StudyPlan.Status.ACTIVE);
        plan.setMaxNewWordsPerDay(5);
        plan.setMinWordsPerDay(0);
        plan.setTargetDate(LocalDate.now().plusDays(20));
        studyPlanRepository.save(plan);
        attachDeckToPlan(plan.getId(), deck.getId(), 1);

        TodayStudyQueueResponse legacy = studyPlanService.getTodayQueueLegacyForParity(brandNewUser.getId());
        TodayStudyQueueResponse optimized = studyPlanService.getTodayQueue(brandNewUser.getId());
        assertQueueParity(legacy, optimized);
        assertSummaryParity(optimized, studyPlanService.getTodaySummary(brandNewUser.getId()));
        assertEquals(5, optimized.totalCount());
        assertEquals(5, optimized.newCount());
    }

    @Test
    @DisplayName("Kịch bản 9: Tie-break khi cùng accuracy và cùng next_review_at")
    void testParity_TieBreak_SameNextReview_SameAccuracy() {
        VocabularySet deck = createDeck("Tie Break Deck");
        StudyPlan plan = createPlan("Tie Plan", "Asia/Ho_Chi_Minh", 10, 5);
        attachDeckToPlan(plan.getId(), deck.getId(), 1);

        Instant identicalReview = Instant.now().minus(5, ChronoUnit.HOURS);
        // 3 due cards with IDENTICAL nextReviewAt
        for (int i = 1; i <= 3; i++) {
            Vocabulary v = createVocab("due_tie_" + i, "Nghĩa " + i, "noun", "/dt/", "Due tie");
            addCardToDeck(deck.getId(), v.getId());

            StudyProgress sp = new StudyProgress(testUser.getId(), v.getId());
            sp.setCorrectCount(1);
            sp.setWrongCount(0);
            sp.setAccuracy(new BigDecimal("100.00"));
            sp.setNextReviewAt(identicalReview);
            studyProgressRepository.save(sp);
        }

        // 3 weak cards with IDENTICAL accuracy (50.0%) and future nextReviewAt
        Instant futureReview = Instant.now().plus(10, ChronoUnit.DAYS);
        for (int i = 1; i <= 3; i++) {
            Vocabulary v = createVocab("weak_tie_" + i, "Nghĩa " + i, "noun", "/wt/", "Weak tie");
            addCardToDeck(deck.getId(), v.getId());

            StudyProgress sp = new StudyProgress(testUser.getId(), v.getId());
            sp.setCorrectCount(1);
            sp.setWrongCount(1);
            sp.setAccuracy(new BigDecimal("50.00"));
            sp.setNextReviewAt(futureReview);
            studyProgressRepository.save(sp);
        }

        TodayStudyQueueResponse legacy = studyPlanService.getTodayQueueLegacyForParity(testUser.getId());
        TodayStudyQueueResponse optimized = studyPlanService.getTodayQueue(testUser.getId());
        assertQueueParity(legacy, optimized);
        assertSummaryParity(optimized, studyPlanService.getTodaySummary(testUser.getId()));
    }

    @Test
    @DisplayName("Kịch bản 10: Ranh giới ngày học ở biên 03:59 và 04:01")
    void testParity_Boundary_0359_and_0401() {
        VocabularySet deck = createDeck("Boundary Deck");
        Vocabulary vBefore = createVocab("word_0359", "Trước 4h", "noun", "/b/", "Before");
        Vocabulary vAfter = createVocab("word_0401", "Sau 4h", "noun", "/a/", "After");
        addCardToDeck(deck.getId(), vBefore.getId());
        addCardToDeck(deck.getId(), vAfter.getId());

        ZoneId zoneId = ZoneId.of("Asia/Ho_Chi_Minh");
        ZonedDateTime nowZoned = ZonedDateTime.now(zoneId);
        LocalDate studyDate = (nowZoned.getHour() < 4) ? nowZoned.toLocalDate().minusDays(1) : nowZoned.toLocalDate();

        // 03:59:58 of end of study day
        Instant dueToday = studyDate.plusDays(1).atTime(3, 59, 58).atZone(zoneId).toInstant();
        // 04:00:01 of end of study day (belongs to tomorrow's cutoff)
        Instant dueTomorrow = studyDate.plusDays(1).atTime(4, 0, 1).atZone(zoneId).toInstant();

        StudyProgress sp1 = new StudyProgress(testUser.getId(), vBefore.getId());
        sp1.setCorrectCount(1);
        sp1.setWrongCount(0);
        sp1.setAccuracy(new BigDecimal("100.00"));
        sp1.setNextReviewAt(dueToday);
        studyProgressRepository.save(sp1);

        StudyProgress sp2 = new StudyProgress(testUser.getId(), vAfter.getId());
        sp2.setCorrectCount(1);
        sp2.setWrongCount(0);
        sp2.setAccuracy(new BigDecimal("100.00"));
        sp2.setNextReviewAt(dueTomorrow);
        studyProgressRepository.save(sp2);

        StudyPlan plan = createPlan("Boundary Plan", "Asia/Ho_Chi_Minh", 0, 0);
        attachDeckToPlan(plan.getId(), deck.getId(), 1);

        TodayStudyQueueResponse legacy = studyPlanService.getTodayQueueLegacyForParity(testUser.getId());
        TodayStudyQueueResponse optimized = studyPlanService.getTodayQueue(testUser.getId());
        assertQueueParity(legacy, optimized);
        assertSummaryParity(optimized, studyPlanService.getTodaySummary(testUser.getId()));
        assertEquals(1, optimized.dueCount(), "Only word due at 03:59:58 should be due today");
        assertEquals(vBefore.getId(), optimized.cards().get(0).getId());
    }
}
