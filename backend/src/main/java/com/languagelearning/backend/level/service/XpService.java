package com.languagelearning.backend.level.service;

import com.languagelearning.backend.level.LevelCalculator;
import com.languagelearning.backend.level.XpConfig;
import com.languagelearning.backend.level.dto.LevelInfoDto;
import com.languagelearning.backend.level.entity.UserXp;
import com.languagelearning.backend.level.entity.XpEvent;
import com.languagelearning.backend.level.repository.UserXpRepository;
import com.languagelearning.backend.level.repository.XpEventRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.*;
import java.util.*;
import java.util.stream.Collectors;

@Service
public class XpService {

    private static final Logger log = LoggerFactory.getLogger(XpService.class);

    private final UserXpRepository userXpRepository;
    private final XpEventRepository xpEventRepository;

    @Autowired(required = false)
    private JdbcTemplate jdbcTemplate;

    public XpService(UserXpRepository userXpRepository, XpEventRepository xpEventRepository) {
        this.userXpRepository = userXpRepository;
        this.xpEventRepository = xpEventRepository;
    }

    public record AnswerXpItem(String clientAnswerId, boolean isCorrect, int attemptNo, boolean isOverride) {}

    /**
     * Batch awards answer XP in consolidated queries:
     * 1) 1 query for daily remaining quota
     * 2) 1 query to check existing clientAnswerIds
     * 3) 1 batch insert into xp_events
     * 4) 1 atomic update into user_xp (if totalBatchXp > 0)
     */
    @Transactional
    public int awardAnswersBatchXp(Long userId, List<AnswerXpItem> items, Instant now) {
        if (userId == null || items == null || items.isEmpty()) {
            return 0;
        }
        if (now == null) now = Instant.now();

        // 1. Collect non-blank clientAnswerIds (deduplicate within batch)
        List<AnswerXpItem> validItems = new ArrayList<>();
        Set<String> uniqueKeys = new HashSet<>();
        for (AnswerXpItem item : items) {
            if (item.clientAnswerId() != null && !item.clientAnswerId().isBlank()) {
                String key = item.clientAnswerId().trim();
                if (uniqueKeys.add(key)) {
                    validItems.add(new AnswerXpItem(key, item.isCorrect(), item.attemptNo(), item.isOverride()));
                }
            }
        }
        if (validItems.isEmpty()) {
            return 0;
        }

        // 2. Daily cap check
        ZoneOffset offset = ZoneOffset.UTC;
        LocalDate today = now.atOffset(offset).toLocalDate();
        Instant startOfDay = today.atStartOfDay().toInstant(offset);
        Instant endOfDay = today.plusDays(1).atStartOfDay().toInstant(offset);

        long currentDailyXp = xpEventRepository.sumXpByUserIdAndCreatedAtBetween(userId, startOfDay, endOfDay);
        long remainingQuota = Math.max(0L, XpConfig.DAILY_CAP_XP - currentDailyXp);

        // 3. Find existing keys
        Set<String> existingKeys = new HashSet<>();
        if (jdbcTemplate != null) {
            String placeholders = validItems.stream().map(i -> "?").collect(Collectors.joining(", "));
            List<Object> params = new ArrayList<>();
            params.add(userId);
            validItems.forEach(i -> params.add(i.clientAnswerId()));
            List<String> found = jdbcTemplate.query(
                    "SELECT source_key FROM xp_events WHERE user_id = ? AND source_type = 'STUDY_ANSWER' AND source_key IN (" + placeholders + ")",
                    (rs, rowNum) -> rs.getString("source_key"),
                    params.toArray()
            );
            existingKeys.addAll(found);
        } else {
            for (AnswerXpItem item : validItems) {
                if (xpEventRepository.existsByUserIdAndSourceTypeAndSourceKey(userId, "STUDY_ANSWER", item.clientAnswerId())) {
                    existingKeys.add(item.clientAnswerId());
                }
            }
        }

        // 4. Calculate actual XP for each item
        List<Object[]> eventsToInsert = new ArrayList<>();
        int totalBatchXp = 0;
        java.sql.Timestamp nowTimestamp = java.sql.Timestamp.from(now);

        for (AnswerXpItem item : validItems) {
            if (existingKeys.contains(item.clientAnswerId())) {
                continue;
            }

            int requestedXp = XpConfig.WRONG_OR_SKIPPED_XP;
            if (item.isOverride()) {
                requestedXp = XpConfig.OVERRIDE_XP;
            } else if (item.isCorrect()) {
                requestedXp = (item.attemptNo() <= 1) ? XpConfig.FIRST_ATTEMPT_CORRECT_XP : XpConfig.RETRY_CORRECT_XP;
            }

            int actualXp = (int) Math.min(requestedXp, remainingQuota);
            remainingQuota -= actualXp;
            totalBatchXp += actualXp;

            eventsToInsert.add(new Object[]{userId, "STUDY_ANSWER", item.clientAnswerId(), actualXp, nowTimestamp});
        }

        if (eventsToInsert.isEmpty()) {
            return 0;
        }

        // 5. Batch insert events
        if (jdbcTemplate != null) {
            jdbcTemplate.batchUpdate(
                    "INSERT INTO xp_events (user_id, source_type, source_key, xp, created_at) " +
                    "VALUES (?, ?, ?, ?, ?) ON CONFLICT (user_id, source_type, source_key) DO NOTHING",
                    eventsToInsert
            );
        } else {
            for (Object[] row : eventsToInsert) {
                XpEvent event = new XpEvent((Long) row[0], (String) row[1], (String) row[2], (Integer) row[3]);
                try {
                    xpEventRepository.save(event);
                } catch (DataIntegrityViolationException ex) {
                    log.debug("Concurrent XP event race caught for user {} source {}:{}", userId, row[1], row[2]);
                }
            }
        }

        // 6. Atomically update total XP if earned
        if (totalBatchXp > 0) {
            userXpRepository.addXpAtomic(userId, totalBatchXp, now);
        }

        return totalBatchXp;
    }

    @Transactional(readOnly = true)
    public LevelInfoDto getLevelInfo(Long userId) {
        long totalXp = userXpRepository.findById(userId)
                .map(UserXp::getTotalXp)
                .orElse(0L);
        return LevelCalculator.calculateLevelInfo(totalXp);
    }

    /**
     * Atomically and idempotently awards XP to a user.
     * Enforces the daily cap of 500 XP and prevents duplicate awards via unique source key.
     */
    @Transactional
    public int awardXp(Long userId, String sourceType, String sourceKey, int requestedXp, Instant now) {
        if (userId == null || sourceType == null || sourceKey == null) {
            return 0;
        }

        // 1. Idempotency check: if event already exists, return 0 (no double XP)
        if (xpEventRepository.existsByUserIdAndSourceTypeAndSourceKey(userId, sourceType, sourceKey)) {
            log.debug("XP event already recorded for user {} with source {}:{}", userId, sourceType, sourceKey);
            return 0;
        }

        if (now == null) now = Instant.now();

        // 2. Daily cap check
        int actualXp = 0;
        if (requestedXp > 0) {
            ZoneOffset offset = ZoneOffset.UTC;
            LocalDate today = now.atOffset(offset).toLocalDate();
            Instant startOfDay = today.atStartOfDay().toInstant(offset);
            Instant endOfDay = today.plusDays(1).atStartOfDay().toInstant(offset);

            long currentDailyXp = xpEventRepository.sumXpByUserIdAndCreatedAtBetween(userId, startOfDay, endOfDay);
            long remainingDailyQuota = Math.max(0L, XpConfig.DAILY_CAP_XP - currentDailyXp);

            actualXp = (int) Math.min(requestedXp, remainingDailyQuota);
        }

        // 3. Persist XP Event
        XpEvent event = new XpEvent(userId, sourceType, sourceKey, actualXp);
        try {
            xpEventRepository.save(event);
        } catch (DataIntegrityViolationException ex) {
            // Concurrent insert caught by DB unique constraint
            log.debug("Concurrent XP event race caught for user {} source {}:{}", userId, sourceType, sourceKey);
            return 0;
        }

        // 4. Atomically update total XP if earned
        if (actualXp > 0) {
            userXpRepository.addXpAtomic(userId, actualXp, now);
        }

        return actualXp;
    }

    /**
     * Awards answer XP based on study rules:
     * - First attempt correct: +5 XP
     * - Retry correct (attempt > 1): +2 XP
     * - Wrong or override: 0 XP
     */
    @Transactional
    public int awardAnswerXp(Long userId, String clientAnswerId, boolean isCorrect, int attemptNo, boolean isOverride) {
        if (clientAnswerId == null || clientAnswerId.isBlank()) {
            return 0;
        }

        int requestedXp = XpConfig.WRONG_OR_SKIPPED_XP;
        if (isOverride) {
            requestedXp = XpConfig.OVERRIDE_XP;
        } else if (isCorrect) {
            requestedXp = (attemptNo <= 1) ? XpConfig.FIRST_ATTEMPT_CORRECT_XP : XpConfig.RETRY_CORRECT_XP;
        }

        return awardXp(userId, "STUDY_ANSWER", clientAnswerId.trim(), requestedXp, Instant.now());
    }

    /**
     * Awards session completion bonus if session reached minimum answers threshold.
     */
    @Transactional
    public int awardSessionCompletionBonus(Long userId, Long sessionId, int answerCount) {
        if (sessionId == null) return 0;

        int requestedXp = (answerCount >= XpConfig.SESSION_MIN_ANSWERS_FOR_BONUS)
                ? XpConfig.SESSION_FINISHED_XP
                : 0;

        return awardXp(userId, "SESSION_FINISH", "session_" + sessionId, requestedXp, Instant.now());
    }

    /**
     * Awards daily streak bonus once per day (idempotent per user and date).
     */
    @Transactional
    public int awardDailyStreakBonus(Long userId, LocalDate date) {
        if (userId == null || date == null) return 0;
        String sourceKey = "streak_" + date;
        return awardXp(userId, "DAILY_STREAK", sourceKey, XpConfig.DAILY_STREAK_BONUS_XP, Instant.now());
    }
}
