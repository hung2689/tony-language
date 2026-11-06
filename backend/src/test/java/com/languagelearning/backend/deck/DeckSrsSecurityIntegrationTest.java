package com.languagelearning.backend.deck;

import com.languagelearning.backend.account.User;
import com.languagelearning.backend.account.UserRepository;
import com.languagelearning.backend.common.security.SecurityTestUtils;
import com.languagelearning.backend.deck.entity.VocabularySet;
import com.languagelearning.backend.deck.repository.VocabularySetRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.security.test.web.servlet.setup.SecurityMockMvcConfigurers;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.context.WebApplicationContext;

import java.util.List;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@ActiveProfiles("test")
@Transactional
public class DeckSrsSecurityIntegrationTest {

    @Autowired
    private WebApplicationContext webApplicationContext;

    private MockMvc mockMvc;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private VocabularySetRepository vocabularySetRepository;

    private User userA;
    private User userB;
    private VocabularySet deckB;

    @BeforeEach
    void setUp() {
        this.mockMvc = MockMvcBuilders
                .webAppContextSetup(webApplicationContext)
                .apply(SecurityMockMvcConfigurers.springSecurity())
                .build();

        userA = userRepository.findByEmailIgnoreCase("user_a@languagelearning.com")
                .orElseGet(() -> {
                    User u = new User();
                    u.setEmail("user_a@languagelearning.com");
                    u.setUsername("user_a");
                    u.setPasswordHash("hashA");
                    return userRepository.save(u);
                });

        userB = userRepository.findByEmailIgnoreCase("user_b@languagelearning.com")
                .orElseGet(() -> {
                    User u = new User();
                    u.setEmail("user_b@languagelearning.com");
                    u.setUsername("user_b");
                    u.setPasswordHash("hashB");
                    return userRepository.save(u);
                });

        deckB = new VocabularySet();
        deckB.setName("Deck belonging to User B");
        deckB.setUserId(userB.getId());
        deckB = vocabularySetRepository.save(deckB);
    }

    @Test
    @DisplayName("User A truy cập getDeckForecast của Deck thuộc User B -> Nhận HTTP 404 (DECK_NOT_FOUND)")
    void testGetDeckForecast_UserACannotAccessUserBDeck() throws Exception {
        // Authenticate as User A
        SecurityTestUtils.setAuthenticatedUser(userA.getId(), userA.getEmail(), userA.getUsername(), List.of("USER"));

        mockMvc.perform(get("/api/decks/{id}/srs-forecast", deckB.getId()))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.message").value("Không tìm thấy bộ từ vựng"));
    }

    @Test
    @DisplayName("User A truy cập getDeckStudyQueue của Deck thuộc User B -> Nhận HTTP 404 (DECK_NOT_FOUND)")
    void testGetDeckStudyQueue_UserACannotAccessUserBDeck() throws Exception {
        // Authenticate as User A
        SecurityTestUtils.setAuthenticatedUser(userA.getId(), userA.getEmail(), userA.getUsername(), List.of("USER"));

        mockMvc.perform(get("/api/decks/{id}/srs-queue", deckB.getId()))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.message").value("Không tìm thấy bộ từ vựng"));
    }

    @Test
    @DisplayName("Chính chủ User B truy cập getDeckForecast và getDeckStudyQueue -> Nhận HTTP 200")
    void testOwnerCanAccessOwnDeck() throws Exception {
        // Authenticate as User B (Owner)
        SecurityTestUtils.setAuthenticatedUser(userB.getId(), userB.getEmail(), userB.getUsername(), List.of("USER"));

        mockMvc.perform(get("/api/decks/{id}/srs-forecast", deckB.getId()))
                .andExpect(status().isOk());

        mockMvc.perform(get("/api/decks/{id}/srs-queue", deckB.getId()))
                .andExpect(status().isOk());
    }
}
