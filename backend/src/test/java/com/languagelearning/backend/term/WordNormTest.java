package com.languagelearning.backend.term;

import com.languagelearning.backend.study.service.StudyPlanService;
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
import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest
@ActiveProfiles("test")
public class WordNormTest {

    @Autowired
    private VocabularyRepository vocabularyRepository;

    @Autowired
    private JdbcTemplate jdbcTemplate;

    @Test
    @DisplayName("1. Báo cáo encoding, collation của DB và khả năng normalize của PostgreSQL")
    void testDatabaseEncodingCollationAndPostgresFunctions() {
        String serverEncoding = jdbcTemplate.queryForObject("SHOW server_encoding", String.class);
        Map<String, Object> dbInfo = jdbcTemplate.queryForMap(
                "SELECT datcollate, datctype FROM pg_database WHERE datname = current_database()"
        );
        String datcollate = String.valueOf(dbInfo.get("datcollate"));
        String datctype = String.valueOf(dbInfo.get("datctype"));

        System.out.println("=========================================================================");
        System.out.println("DATABASE ENCODING & COLLATION INFO:");
        System.out.println("  server_encoding: " + serverEncoding);
        System.out.println("  datcollate:      " + datcollate);
        System.out.println("  datctype:        " + datctype);
        System.out.println("=========================================================================");

        assertNotNull(serverEncoding);
        assertEquals("UTF8", serverEncoding.toUpperCase());

        String provolatile = jdbcTemplate.queryForObject(
                "SELECT provolatile::text FROM pg_proc WHERE proname = 'normalize' LIMIT 1",
                String.class
        );
        assertEquals("i", provolatile, "PostgreSQL normalize() phải là IMMUTABLE ('i')");
    }

    @Test
    @Transactional
    @DisplayName("2. Đối chiếu word_norm trong DB và Java normalizeWord: Chuẩn hóa khoảng trắng, chữ hoa thường và Tiếng Việt NFC")
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

            String dbWordNorm = jdbcTemplate.queryForObject(
                    "SELECT word_norm FROM vocabularies WHERE id = ?",
                    String.class,
                    vocab.getId()
            );

            String javaWordNorm = StudyPlanService.normalizeWord(inputWord);

            assertNotNull(dbWordNorm, "DB word_norm must not be null");
            assertEquals(javaWordNorm, dbWordNorm, "PostgreSQL word_norm phải khớp 100% với Java normalizeWord cho từ: " + inputWord);
        }
    }

    @Test
    @Transactional
    @DisplayName("3. Đối chiếu xử lý NFD (Decomposed Unicode): Sau V11 DB word_norm và Java normalizeWord KHỚP NHAU 100% dạng NFC")
    void testWordNormComparison_NfdCase() {
        // "tiếng việt" in composed NFC
        String nfcWord = "tiếng việt";
        // "tiếng việt" in decomposed NFD
        String nfdWord = Normalizer.normalize(nfcWord, Normalizer.Form.NFD);

        assertNotEquals(nfcWord, nfdWord, "NFC và NFD có chuỗi byte khác nhau trước khi chuẩn hóa");
        assertEquals(nfcWord, StudyPlanService.normalizeWord(nfdWord), "Java normalizeWord chuẩn hóa NFD về NFC thành công");

        Vocabulary vocab = new Vocabulary("  " + nfdWord + "  ", "NFD test", "noun", "/ipa/", "example sentence");
        vocab = vocabularyRepository.saveAndFlush(vocab);

        String dbWordNorm = jdbcTemplate.queryForObject(
                "SELECT word_norm FROM vocabularies WHERE id = ?",
                String.class,
                vocab.getId()
        );

        String javaWordNorm = StudyPlanService.normalizeWord("  " + nfdWord + "  ");

        assertNotNull(dbWordNorm);
        // Sau V11: cột sinh dùng normalize(..., NFC) nên dbWordNorm đã được chuẩn hóa về canonical NFC!
        assertEquals(nfcWord, dbWordNorm, "PostgreSQL word_norm dưới V11 phải chuyển NFD thành canonical NFC");
        assertEquals(javaWordNorm, dbWordNorm, "Sau V11, DB word_norm và Java normalizeWord phải KHỚP NHAU 100% (cùng dạng NFC)");
    }

    @Test
    @Transactional
    @DisplayName("4. Ca test CHỮ HOA tiếng Việt (TIẾNG VIỆT, ĐƯỜNG, HỌC TẬP) cả dạng NFC lẫn NFD")
    void testVietnameseUppercase_NfcAndNfd() {
        String[][] cases = {
                {"TIẾNG VIỆT", "tiếng việt"},
                {"ĐƯỜNG", "đường"},
                {"HỌC TẬP", "học tập"},
                {"TRƯỜNG HỌC", "trường học"}
        };

        for (String[] pair : cases) {
            String upperNfc = pair[0];
            String expectedLowerNfc = pair[1];

            // 1. Kiểm tra ca chữ hoa dạng NFC
            Vocabulary vocabNfc = new Vocabulary("  " + upperNfc + " \n", "NFC upper test", "noun", "/ipa/", "example sentence");
            vocabNfc = vocabularyRepository.saveAndFlush(vocabNfc);
            String dbWordNormNfc = jdbcTemplate.queryForObject(
                    "SELECT word_norm FROM vocabularies WHERE id = ?",
                    String.class,
                    vocabNfc.getId()
            );
            String javaNormNfc = StudyPlanService.normalizeWord("  " + upperNfc + " \n");

            assertEquals(expectedLowerNfc, javaNormNfc, "Java normalizeWord phải ra chữ thường NFC");
            assertEquals(expectedLowerNfc, dbWordNormNfc, "DB word_norm phải ra chữ thường NFC cho từ hoa NFC: " + upperNfc);
            assertEquals(javaNormNfc, dbWordNormNfc, "DB word_norm và Java normalizeWord phải bằng nhau cho từ hoa NFC: " + upperNfc);

            // 2. Kiểm tra ca chữ hoa dạng NFD
            String upperNfd = Normalizer.normalize(upperNfc, Normalizer.Form.NFD);
            Vocabulary vocabNfd = new Vocabulary("\t" + upperNfd + "\r\n", "NFD upper test", "noun", "/ipa/", "example sentence");
            vocabNfd = vocabularyRepository.saveAndFlush(vocabNfd);
            String dbWordNormNfd = jdbcTemplate.queryForObject(
                    "SELECT word_norm FROM vocabularies WHERE id = ?",
                    String.class,
                    vocabNfd.getId()
            );
            String javaNormNfd = StudyPlanService.normalizeWord("\t" + upperNfd + "\r\n");

            assertEquals(expectedLowerNfc, javaNormNfd, "Java normalizeWord phải ra chữ thường NFC từ input NFD hoa");
            assertEquals(expectedLowerNfc, dbWordNormNfd, "DB word_norm phải ra chữ thường NFC cho từ hoa NFD: " + upperNfc);
            assertEquals(javaNormNfd, dbWordNormNfd, "DB word_norm và Java normalizeWord phải bằng nhau cho từ hoa NFD: " + upperNfc);
        }
    }
}
