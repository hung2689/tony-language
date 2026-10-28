package com.languagelearning.backend.level;

import com.languagelearning.backend.level.dto.LevelInfoDto;
import com.languagelearning.backend.level.dto.TierDto;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.*;

class LevelCalculatorTest {

    @Test
    @DisplayName("Exact cumulative XP values match formula 40*L*(L-1)")
    void testCumulativeXpMilestones() {
        assertEquals(0L, LevelCalculator.cumulativeXpForLevel(1));
        assertEquals(80L, LevelCalculator.cumulativeXpForLevel(2));
        assertEquals(3600L, LevelCalculator.cumulativeXpForLevel(10));
        assertEquals(34800L, LevelCalculator.cumulativeXpForLevel(30));
        assertEquals(141600L, LevelCalculator.cumulativeXpForLevel(60));
        assertEquals(396000L, LevelCalculator.cumulativeXpForLevel(100));
    }

    @Test
    @DisplayName("Level calculation from XP boundaries")
    void testLevelFromXpBoundaries() {
        assertEquals(1, LevelCalculator.levelFromXp(0));
        assertEquals(1, LevelCalculator.levelFromXp(79));
        assertEquals(2, LevelCalculator.levelFromXp(80));
        assertEquals(2, LevelCalculator.levelFromXp(81));
        assertEquals(2, LevelCalculator.levelFromXp(239)); // L3 requires 240 XP
        assertEquals(3, LevelCalculator.levelFromXp(240));

        assertEquals(9, LevelCalculator.levelFromXp(3599));
        assertEquals(10, LevelCalculator.levelFromXp(3600));

        assertEquals(29, LevelCalculator.levelFromXp(34799));
        assertEquals(30, LevelCalculator.levelFromXp(34800));

        assertEquals(59, LevelCalculator.levelFromXp(141599));
        assertEquals(60, LevelCalculator.levelFromXp(141600));

        assertEquals(99, LevelCalculator.levelFromXp(395999));
        assertEquals(100, LevelCalculator.levelFromXp(396000));
        assertEquals(100, LevelCalculator.levelFromXp(500000)); // Cap at 100
    }

    @Test
    @DisplayName("Every Tier edge maps accurately to 8 student tiers")
    void testTierEdges() {
        // Tier 1: Tập sự (L1 - 4)
        assertEquals("Tập sự", LevelCalculator.tierForLevel(1).name());
        assertEquals("Tập sự", LevelCalculator.tierForLevel(4).name());

        // Tier 2: Đồng (L5 - 9)
        assertEquals("Đồng", LevelCalculator.tierForLevel(5).name());
        assertEquals("Đồng", LevelCalculator.tierForLevel(9).name());

        // Tier 3: Bạc (L10 - 19)
        assertEquals("Bạc", LevelCalculator.tierForLevel(10).name());
        assertEquals("Bạc", LevelCalculator.tierForLevel(19).name());

        // Tier 4: Vàng (L20 - 29)
        assertEquals("Vàng", LevelCalculator.tierForLevel(20).name());
        assertEquals("Vàng", LevelCalculator.tierForLevel(29).name());

        // Tier 5: Bạch kim (L30 - 44)
        assertEquals("Bạch kim", LevelCalculator.tierForLevel(30).name());
        assertEquals("Bạch kim", LevelCalculator.tierForLevel(44).name());

        // Tier 6: Kim cương (L45 - 59)
        assertEquals("Kim cương", LevelCalculator.tierForLevel(45).name());
        assertEquals("Kim cương", LevelCalculator.tierForLevel(59).name());

        // Tier 7: Huyền thoại (L60 - 79)
        assertEquals("Huyền thoại", LevelCalculator.tierForLevel(60).name());
        assertEquals("Huyền thoại", LevelCalculator.tierForLevel(79).name());

        // Tier 8: Tối thượng (L80 - 100)
        assertEquals("Tối thượng", LevelCalculator.tierForLevel(80).name());
        assertEquals("Tối thượng", LevelCalculator.tierForLevel(100).name());
    }

    @Test
    @DisplayName("xpIntoCurrentLevel and xpRequiredForNextLevel calculate progress correctly")
    void testXpProgress() {
        // At 0 XP -> Level 1, 0 into level, 80 needed for L2
        LevelInfoDto info0 = LevelCalculator.calculateLevelInfo(0);
        assertEquals(1, info0.level());
        assertEquals(0L, info0.xpIntoLevel());
        assertEquals(80L, info0.xpForNext());
        assertFalse(info0.maxLevel());

        // At 40 XP -> Level 1, 40 into level, 80 needed for L2
        LevelInfoDto info40 = LevelCalculator.calculateLevelInfo(40);
        assertEquals(1, info40.level());
        assertEquals(40L, info40.xpIntoLevel());
        assertEquals(80L, info40.xpForNext());

        // At 80 XP -> Level 2, 0 into level, 160 needed for L3 (40*3*2 - 80 = 240 - 80 = 160)
        LevelInfoDto info80 = LevelCalculator.calculateLevelInfo(80);
        assertEquals(2, info80.level());
        assertEquals(0L, info80.xpIntoLevel());
        assertEquals(160L, info80.xpForNext());

        // At 100 XP -> Level 2, 20 into level, 160 needed for L3
        LevelInfoDto info100 = LevelCalculator.calculateLevelInfo(100);
        assertEquals(2, info100.level());
        assertEquals(20L, info100.xpIntoLevel());
        assertEquals(160L, info100.xpForNext());

        // At 396000 XP -> Level 100 (Max level), 0 needed for next
        LevelInfoDto infoMax = LevelCalculator.calculateLevelInfo(396000);
        assertEquals(100, infoMax.level());
        assertEquals(0L, infoMax.xpForNext());
        assertTrue(infoMax.maxLevel());
        assertEquals("Tối thượng", infoMax.tierName());
    }
}
