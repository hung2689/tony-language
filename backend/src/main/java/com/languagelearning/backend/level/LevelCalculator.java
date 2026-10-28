package com.languagelearning.backend.level;

import com.languagelearning.backend.level.dto.LevelInfoDto;
import com.languagelearning.backend.level.dto.TierDto;

import java.util.List;

/**
 * Pure mathematical level calculator.
 * All methods are deterministic, side-effect free, and boundary-checked.
 */
public final class LevelCalculator {

    public static final List<TierDto> TIERS = List.of(
            new TierDto(1, "Tập sự", 1, 4, "#94a3b8", "Khởi đầu hành trình tích lũy từ vựng"),
            new TierDto(2, "Đồng", 5, 9, "#cd7f32", "Đang hình thành thói quen học tập vững chắc"),
            new TierDto(3, "Bạc", 10, 19, "#cbd5e1", "Vốn từ mở rộng, phản xạ học tập ổn định"),
            new TierDto(4, "Vàng", 20, 29, "#eab308", "Khả năng ghi nhớ từ vựng nhanh và chính xác"),
            new TierDto(5, "Bạch kim", 30, 44, "#06b6d4", "Làm chủ ngữ cảnh từ vựng chuyên sâu"),
            new TierDto(6, "Kim cương", 45, 59, "#8b5cf6", "Độ chuẩn xác và tốc độ phản xạ vượt trội"),
            new TierDto(7, "Huyền thoại", 60, 79, "#f43f5e", "Kỷ luật bền bỉ, trình độ tiếng Anh điêu luyện"),
            new TierDto(8, "Tối thượng", 80, 100, "#f59e0b", "Đỉnh cao học thuật và làm chủ ngôn ngữ toàn diện")
    );

    private LevelCalculator() {}

    /**
     * Calculates the cumulative XP required to reach a given level L.
     * Formula: 40 * L * (L - 1) for L in [1, 100].
     * L1 = 0, L2 = 80, L10 = 3,600, L30 = 34,800, L60 = 141,600, L100 = 396,000.
     */
    public static long cumulativeXpForLevel(int level) {
        if (level <= 1) return 0L;
        if (level > XpConfig.MAX_LEVEL) level = XpConfig.MAX_LEVEL;
        return (long) XpConfig.LEVEL_CURVE_COEFFICIENT * level * (level - 1);
    }

    /**
     * Calculates current level from total accumulated XP.
     * Analytical solution of 40*L*(L-1) <= totalXp.
     */
    public static int levelFromXp(long totalXp) {
        if (totalXp <= 0) return 1;
        if (totalXp >= cumulativeXpForLevel(XpConfig.MAX_LEVEL)) return XpConfig.MAX_LEVEL;

        // Quadratic formula: 40*L^2 - 40*L - totalXp = 0
        // L = (40 + sqrt(1600 + 160*totalXp)) / 80 = (1 + sqrt(1 + 0.1 * totalXp)) / 2
        double discriminant = 1.0 + 0.1 * totalXp;
        int level = (int) Math.floor((1.0 + Math.sqrt(discriminant)) / 2.0);

        if (level < 1) level = 1;
        if (level > XpConfig.MAX_LEVEL) level = XpConfig.MAX_LEVEL;

        // Verify boundary precision
        while (level < XpConfig.MAX_LEVEL && totalXp >= cumulativeXpForLevel(level + 1)) {
            level++;
        }
        while (level > 1 && totalXp < cumulativeXpForLevel(level)) {
            level--;
        }

        return level;
    }

    /**
     * Returns how much XP has been earned towards the next level within current level.
     */
    public static long xpIntoCurrentLevel(long totalXp) {
        if (totalXp <= 0) return 0L;
        int level = levelFromXp(totalXp);
        if (level >= XpConfig.MAX_LEVEL) {
            return cumulativeXpForLevel(XpConfig.MAX_LEVEL);
        }
        long base = cumulativeXpForLevel(level);
        return Math.max(0L, totalXp - base);
    }

    /**
     * Returns the total XP required to advance from currentLevel to currentLevel + 1.
     * Formula: 80 * currentLevel (difference of cumulative sums).
     * If at max level (100), returns 0.
     */
    public static long xpRequiredForNextLevel(int currentLevel) {
        if (currentLevel >= XpConfig.MAX_LEVEL) return 0L;
        return cumulativeXpForLevel(currentLevel + 1) - cumulativeXpForLevel(currentLevel);
    }

    /**
     * Returns the Tier for a given level.
     */
    public static TierDto tierForLevel(int level) {
        int clamped = Math.max(1, Math.min(XpConfig.MAX_LEVEL, level));
        for (TierDto t : TIERS) {
            if (clamped >= t.minLevel() && clamped <= t.maxLevel()) {
                return t;
            }
        }
        return TIERS.getFirst();
    }

    /**
     * Builds full LevelInfoDto from total XP.
     */
    public static LevelInfoDto calculateLevelInfo(long totalXp) {
        int level = levelFromXp(totalXp);
        long xpInto = xpIntoCurrentLevel(totalXp);
        long xpForNext = xpRequiredForNextLevel(level);
        TierDto tier = tierForLevel(level);
        boolean isMax = level >= XpConfig.MAX_LEVEL;

        return new LevelInfoDto(
                level,
                totalXp,
                xpInto,
                xpForNext,
                tier.id(),
                tier.name(),
                isMax
        );
    }
}
