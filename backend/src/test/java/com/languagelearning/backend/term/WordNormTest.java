package com.languagelearning.backend.term;

import com.languagelearning.backend.term.entity.Vocabulary;
import com.languagelearning.backend.term.repository.VocabularyRepository;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.annotation.Transactional;

import java.text.Normalizer;

import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest
@ActiveProfiles("test")
public class WordNormTest {

    @Autowired
    private VocabularyRepository vocabularyRepository;

    @Autowired
    private JdbcTemplate jdbcTemplate;

    /**
     * Replicates StudyPlanService.normalizeWord logic:
     * Normalizer.normalize(word.trim().toLowerCase(), Normalizer.Form.NFC)
     */
    private String normalizeWord(String word) {
        if (word == null) return "";
        return Normalizer.normalize(word.trim().toLowerCase(), Normalizer.Form.NFC);
    }

    @Test
    @Transactional
    @DisplayName("Đối chiếu word_norm trong DB và Java normalizeWord: Chuẩn hóa khoảng trắng, chữ hoa thường và Tiếng Việt NFC")
    void testWordNormMatchesJavaNormalizeWord_StandardNfcCases() {
        String[] testWords = {
                "  Hello World  ",
                "\t\nVOCABULARY\r\n",
                "  TẬP SỰ  ",
                "Học Từ Vựng",
                "Tiếng Việt Có Dấu: ẵ, ặ, ẳ, ấ, ơ, ư, đ",
                "   KẾ HOẠCH HỌC TẬP   "
        };

        for (String inputWord : testWords) {
            Vocabulary vocab = new Vocabulary(inputWord, "nghĩa test", "noun", "/test/", "example sentence");
            vocab = vocabularyRepository.saveAndFlush(vocab);

            // Fetch stored word_norm directly from database
            String dbWordNorm = jdbcTemplate.queryForObject(
                    "SELECT word_norm FROM vocabularies WHERE id = ?",
                    String.class,
                    vocab.getId()
            );

            String javaWordNorm = normalizeWord(inputWord);

            assertNotNull(dbWordNorm, "DB word_norm must not be null");
            assertEquals(javaWordNorm, dbWordNorm, "PostgreSQL word_norm phải khớp 100% với Java normalizeWord cho từ: " + inputWord);
        }
    }

    @Test
    @Transactional
    @DisplayName("Đối chiếu xử lý NFD (Decomposed Unicode) giữa Java và PostgreSQL word_norm")
    void testWordNormComparison_NfdCase() {
        // "tiếng việt" in composed NFC
        String nfcWord = "tiếng việt";
        // "tiếng việt" in decomposed NFD
        String nfdWord = Normalizer.normalize(nfcWord, Normalizer.Form.NFD);

        assertNotEquals(nfcWord, nfdWord, "NFC và NFD có chuỗi byte khác nhau");
        assertEquals(nfcWord, normalizeWord(nfdWord), "Java normalizeWord chuẩn hóa NFD về NFC thành công");

        Vocabulary vocab = new Vocabulary("  " + nfdWord + "  ", "NFD test", "noun", "/ipa/", "example sentence");
        vocab = vocabularyRepository.saveAndFlush(vocab);

        String dbWordNorm = jdbcTemplate.queryForObject(
                "SELECT word_norm FROM vocabularies WHERE id = ?",
                String.class,
                vocab.getId()
        );

        // PostgreSQL lower(btrim(...)) strips whitespace and lowercases, preserving UTF-8 code points
        assertNotNull(dbWordNorm);
        assertEquals(nfdWord, dbWordNorm, "PostgreSQL word_norm loại bỏ khoảng trắng và chuyển chữ thường trên chuỗi NFD");
        // When normalized in Java, both converge to canonical NFC
        assertEquals(Normalizer.normalize(dbWordNorm, Normalizer.Form.NFC), normalizeWord(nfdWord));

        // Kiểm tra xem dbWordNorm và javaWordNorm có bằng nhau không với input NFD:
        String javaWordNorm = normalizeWord("  " + nfdWord + "  ");
        assertNotEquals(javaWordNorm, dbWordNorm, "Với chuỗi NFD, word_norm (NFD) và Java normalizeWord (NFC) KHÔNG BẰNG NHAU!");
    }

    @Test
    @Transactional
    @DisplayName("Kiểm tra khả năng dùng normalize(word, NFC) trong PostgreSQL Generated Column")
    void testPostgresNormalizeFunctionAndGeneratedColumn() {
        // 1. Kiểm tra hàm normalize có tồn tại và thuộc tính provolatile
        try {
            String provolatile = jdbcTemplate.queryForObject(
                    "SELECT provolatile::text FROM pg_proc WHERE proname = 'normalize' LIMIT 1",
                    String.class
            );
            System.out.println("=== PostgreSQL normalize() provolatile: " + provolatile + " ('i' = IMMUTABLE) ===");
        } catch (Exception e) {
            System.out.println("=== Không tìm thấy hàm normalize trong pg_proc: " + e.getMessage());
        }

        // 2. Thử tạo bảng với GENERATED ALWAYS AS (normalize(..., NFC)) STORED
        try {
            jdbcTemplate.execute(
                    "CREATE TEMP TABLE temp_vocab_norm (" +
                    "  id serial primary key, " +
                    "  word text, " +
                    "  word_norm text GENERATED ALWAYS AS (normalize(lower(btrim(word, E' \t\n\r')), NFC)) STORED" +
                    ")"
            );
            System.out.println("=== THÀNH CÔNG: PostgreSQL CHO PHÉP dùng normalize(..., NFC) trong GENERATED ALWAYS AS ... STORED ===");

            // Test insert NFD into temp table
            String nfcWord = "tiếng việt";
            String nfdWord = Normalizer.normalize(nfcWord, Normalizer.Form.NFD);
            jdbcTemplate.update("INSERT INTO temp_vocab_norm (word) VALUES (?)", "  " + nfdWord + "  ");
            String genNorm = jdbcTemplate.queryForObject("SELECT word_norm FROM temp_vocab_norm LIMIT 1", String.class);
            System.out.println("=== Giá trị sau normalize(...) trong DB: " + genNorm + " (Khớp NFC: " + nfcWord.equals(genNorm) + ") ===");
            assertEquals(nfcWord, genNorm, "normalize(..., NFC) đã chuyển NFD thành NFC ngay trong DB!");
        } catch (Exception e) {
            System.out.println("=== THẤT BẠI: PostgreSQL KHÔNG cho phép: " + e.getMessage());
        }
    }
}
