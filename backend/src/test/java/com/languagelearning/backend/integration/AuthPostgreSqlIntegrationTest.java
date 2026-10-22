package com.languagelearning.backend.integration;

import com.jayway.jsonpath.JsonPath;
import com.languagelearning.backend.account.RefreshToken;
import com.languagelearning.backend.account.RefreshTokenRepository;
import com.languagelearning.backend.account.User;
import com.languagelearning.backend.account.UserRepository;
import com.languagelearning.backend.auth.service.RefreshTokenService;
import com.languagelearning.backend.folder.dto.FolderCreateRequest;
import com.languagelearning.backend.folder.dto.FolderResponse;
import com.languagelearning.backend.folder.service.FolderService;
import jakarta.servlet.http.Cookie;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.test.web.servlet.setup.SecurityMockMvcConfigurers;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.context.WebApplicationContext;

import java.time.Instant;
import java.util.List;

import static org.hamcrest.Matchers.*;
import static org.junit.jupiter.api.Assertions.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@ActiveProfiles("dev")
@Transactional
public class AuthPostgreSqlIntegrationTest {

    @Autowired
    private WebApplicationContext webApplicationContext;

    private MockMvc mockMvc;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private RefreshTokenRepository refreshTokenRepository;

    @Autowired
    private RefreshTokenService refreshTokenService;

    @Autowired
    private FolderService folderService;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @BeforeEach
    void setUpMockMvc() {
        this.mockMvc = MockMvcBuilders
                .webAppContextSetup(webApplicationContext)
                .apply(SecurityMockMvcConfigurers.springSecurity())
                .build();
    }

    @Test
    @DisplayName("Unauthenticated request to protected endpoint returns 401 with standard ErrorResponse JSON")
    void unauthenticatedRequest_Returns401Json() throws Exception {
        mockMvc.perform(get("/api/users/me"))
                .andExpect(status().isUnauthorized())
                .andExpect(header().string("Content-Type", containsString("application/json")))
                .andExpect(jsonPath("$.errorCode").value("UNAUTHENTICATED"))
                .andExpect(jsonPath("$.message").isNotEmpty());
    }

    @Test
    @DisplayName("Invalid or forged JWT token returns 401 Unauthorized")
    void invalidToken_Returns401() throws Exception {
        mockMvc.perform(get("/api/users/me")
                        .header("Authorization", "Bearer invalid.token.payload"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.errorCode").value("UNAUTHENTICATED"));
    }

    @Test
    @DisplayName("CSRF protection: /api/auth/refresh without X-Requested-With header returns 403 Forbidden")
    void refreshWithoutCsrfHeader_Returns403() throws Exception {
        mockMvc.perform(post("/api/auth/refresh")
                        .cookie(new Cookie("refresh_token", "some_token")))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.errorCode").value("CSRF_HEADER_MISSING"));
    }

    @Test
    @DisplayName("CSRF protection: /api/auth/logout without X-Requested-With header returns 403 Forbidden")
    void logoutWithoutCsrfHeader_Returns403() throws Exception {
        mockMvc.perform(post("/api/auth/logout")
                        .cookie(new Cookie("refresh_token", "some_token")))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.errorCode").value("CSRF_HEADER_MISSING"));
    }

    @Test
    @DisplayName("End-to-end auth flow: Register -> Login -> GET /api/users/me -> Refresh -> Logout")
    void endToEndAuthFlow() throws Exception {
        String testEmail = "e2e_user_" + System.currentTimeMillis() + "@test.com";
        String testUsername = "e2e_user_" + (System.currentTimeMillis() % 100000);

        // 1. Register
        String regJson = String.format("{\"email\":\"%s\",\"username\":\"%s\",\"password\":\"SecurePass123\"}",
                testEmail, testUsername);

        MvcResult regResult = mockMvc.perform(post("/api/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(regJson))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.accessToken").isNotEmpty())
                .andExpect(jsonPath("$.user.email").value(testEmail))
                .andExpect(cookie().exists("refresh_token"))
                .andExpect(cookie().httpOnly("refresh_token", true))
                .andReturn();

        String rawRefreshToken = regResult.getResponse().getCookie("refresh_token").getValue();
        assertNotNull(rawRefreshToken);

        // 2. Login
        String loginJson = String.format("{\"email\":\"%s\",\"password\":\"SecurePass123\"}", testEmail);
        MvcResult loginResult = mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(loginJson))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.accessToken").isNotEmpty())
                .andExpect(jsonPath("$.user.username").value(testUsername))
                .andReturn();

        String accessToken = JsonPath.read(loginResult.getResponse().getContentAsString(), "$.accessToken");

        // 3. Call GET /api/users/me with Bearer token
        mockMvc.perform(get("/api/users/me")
                        .header("Authorization", "Bearer " + accessToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.email").value(testEmail))
                .andExpect(jsonPath("$.username").value(testUsername))
                .andExpect(jsonPath("$.roles", hasItem("USER")));

        // 4. Refresh token with CSRF header
        String loginRefreshToken = loginResult.getResponse().getCookie("refresh_token").getValue();
        MvcResult refreshResult = mockMvc.perform(post("/api/auth/refresh")
                        .header("X-Requested-With", "XMLHttpRequest")
                        .cookie(new Cookie("refresh_token", loginRefreshToken)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.accessToken").isNotEmpty())
                .andExpect(cookie().exists("refresh_token"))
                .andReturn();

        String newRefreshToken = refreshResult.getResponse().getCookie("refresh_token").getValue();
        assertNotEquals(loginRefreshToken, newRefreshToken);

        // 5. Logout with CSRF header clears cookie
        mockMvc.perform(post("/api/auth/logout")
                        .header("X-Requested-With", "XMLHttpRequest")
                        .cookie(new Cookie("refresh_token", newRefreshToken)))
                .andExpect(status().isOk())
                .andExpect(cookie().maxAge("refresh_token", 0));
    }

    @Test
    @DisplayName("User resource isolation: User A cannot read, update, or delete User B's folder (returns 404)")
    void resourceIsolation_UserACannotAccessUserBResource() throws Exception {
        // Create User B in database
        User userB = new User("user_b_" + System.currentTimeMillis() + "@test.com",
                passwordEncoder.encode("Pass123456"), "user_b", User.STATUS_ACTIVE);
        userB = userRepository.save(userB);

        // User A logs in or registers
        String userAEmail = "user_a_" + System.currentTimeMillis() + "@test.com";
        String regJson = String.format("{\"email\":\"%s\",\"username\":\"%s\",\"password\":\"Pass123456\"}",
                userAEmail, "user_a_" + (System.currentTimeMillis() % 10000));

        MvcResult regResult = mockMvc.perform(post("/api/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(regJson))
                .andExpect(status().isCreated())
                .andReturn();
        String accessTokenA = JsonPath.read(regResult.getResponse().getContentAsString(), "$.accessToken");

        // Directly create a folder belonging to User B
        com.languagelearning.backend.common.security.SecurityTestUtils.setAuthenticatedUser(
                userB.getId(), userB.getEmail(), userB.getUsername(), List.of("USER"));
        FolderResponse folderB = folderService.createFolder(new FolderCreateRequest("User B Private Folder"));
        com.languagelearning.backend.common.security.SecurityTestUtils.clearAuthentication();

        // User A tries to GET User B's folder -> must return 404
        mockMvc.perform(get("/api/folders/" + folderB.getId())
                        .header("Authorization", "Bearer " + accessTokenA))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.errorCode").value("FOLDER_NOT_FOUND"));

        // User A tries to DELETE User B's folder -> must return 404
        mockMvc.perform(delete("/api/folders/" + folderB.getId())
                        .header("Authorization", "Bearer " + accessTokenA))
                .andExpect(status().isNotFound());
    }

    @Test
    @DisplayName("Token reuse detection: Reusing old token after grace window revokes all user active tokens")
    void tokenReuseDetection_RevokesAllTokens() throws Exception {
        User user = new User("reuse_" + System.currentTimeMillis() + "@test.com", "hash", "reuse_user", User.STATUS_ACTIVE);
        user = userRepository.save(user);

        // 1. Issue an initial refresh token
        String rawToken1 = refreshTokenService.issueRefreshToken(user);
        String hash1 = refreshTokenService.hashToken(rawToken1);

        // 2. Rotate it legitimately
        RefreshTokenService.RotatedTokenResult rotatedResult = refreshTokenService.rotateRefreshToken(rawToken1);
        String rawToken2 = rotatedResult.newRawRefreshToken();
        String hash2 = refreshTokenService.hashToken(rawToken2);

        // Active token2 exists
        assertTrue(refreshTokenRepository.findByTokenHash(hash2).orElseThrow().isActive());

        // Simulate that token1 was rotated 30 seconds ago (outside 10s grace window)
        RefreshToken token1 = refreshTokenRepository.findByTokenHash(hash1).orElseThrow();
        token1.setRevokedAt(Instant.now().minusSeconds(30));
        refreshTokenRepository.saveAndFlush(token1);

        // 3. Attacker presents old token1 again -> reuse detection triggers
        assertThrows(Exception.class, () -> refreshTokenService.rotateRefreshToken(rawToken1));

        // 4. Token2 must now be REVOKED as well (family revocation)
        RefreshToken token2After = refreshTokenRepository.findByTokenHash(hash2).orElseThrow();
        assertNotNull(token2After.getRevokedAt(), "Token 2 must have been revoked due to reuse detection");
    }
}
