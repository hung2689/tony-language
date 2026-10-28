package com.languagelearning.backend.common.security;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.security.test.web.servlet.setup.SecurityMockMvcConfigurers;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.web.context.WebApplicationContext;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

/**
 * Verifies that /actuator/health is publicly accessible without authentication,
 * returns HTTP 200 with {"status":"UP"} (or "DOWN"/"OUT_OF_SERVICE" when DB is unreachable,
 * but always 200/503 — never a Spring Security 401/403).
 *
 * Also verifies that other Actuator endpoints (/actuator/env, /actuator/beans, etc.)
 * are NOT exposed — they should return 404 (not registered) rather than leaking data.
 *
 * NOTE: These tests require a reachable PostgreSQL test database (TEST_DB_URL env var
 * or the default localhost:5432/language_learning_test). If no DB is available, the
 * Spring context will fail to load — this is an environment issue, not a code defect.
 */
@SpringBootTest
@ActiveProfiles("test")
class ActuatorHealthEndpointTest {

    @Autowired
    private WebApplicationContext webApplicationContext;

    private MockMvc mockMvc;

    @BeforeEach
    void setUp() {
        mockMvc = MockMvcBuilders
                .webAppContextSetup(webApplicationContext)
                .apply(SecurityMockMvcConfigurers.springSecurity())
                .build();
    }

    // ─── /actuator/health: PUBLIC, no credentials needed ──────────────────────

    @Test
    @DisplayName("GET /actuator/health is accessible without authentication and returns 200")
    void actuatorHealth_isPublicAndReturns200() throws Exception {
        mockMvc.perform(get("/actuator/health")
                        .accept(MediaType.APPLICATION_JSON))
                // Spring Boot returns 200 when status=UP, 503 when DOWN.
                // Either is acceptable — the important thing is it is NOT 401 or 403.
                .andExpect(result -> {
                    int status = result.getResponse().getStatus();
                    if (status != 200 && status != 503) {
                        throw new AssertionError(
                                "Expected 200 (UP) or 503 (DOWN) from /actuator/health, got: " + status
                                + ". A 401/403 means the endpoint is accidentally blocked by security.");
                    }
                })
                .andExpect(content().contentTypeCompatibleWith(MediaType.APPLICATION_JSON))
                .andExpect(jsonPath("$.status").exists());
    }

    @Test
    @DisplayName("GET /actuator/health does NOT require Authorization header")
    void actuatorHealth_noAuthHeaderRequired() throws Exception {
        // Deliberately omit any token / bearer
        mockMvc.perform(get("/actuator/health"))
                .andExpect(result -> {
                    int status = result.getResponse().getStatus();
                    if (status == 401 || status == 403) {
                        throw new AssertionError(
                                "/actuator/health must be publicly accessible, but returned HTTP " + status);
                    }
                });
    }

    // ─── Other Actuator endpoints: must NOT be exposed (404 = not registered) ─

    @Test
    @DisplayName("GET /actuator/env is NOT exposed (returns 404)")
    void actuatorEnv_isNotExposed() throws Exception {
        mockMvc.perform(get("/actuator/env")
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isNotFound());
    }

    @Test
    @DisplayName("GET /actuator/beans is NOT exposed (returns 404)")
    void actuatorBeans_isNotExposed() throws Exception {
        mockMvc.perform(get("/actuator/beans")
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isNotFound());
    }

    @Test
    @DisplayName("GET /actuator/configprops is NOT exposed (returns 404)")
    void actuatorConfigprops_isNotExposed() throws Exception {
        mockMvc.perform(get("/actuator/configprops")
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isNotFound());
    }

    @Test
    @DisplayName("GET /actuator/mappings is NOT exposed (returns 404)")
    void actuatorMappings_isNotExposed() throws Exception {
        mockMvc.perform(get("/actuator/mappings")
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isNotFound());
    }

    // ─── Protected app endpoints: still require authentication ────────────────

    @Test
    @DisplayName("GET /api/profile returns 401 without authentication (security intact)")
    void protectedEndpoint_requiresAuthentication() throws Exception {
        mockMvc.perform(get("/api/profile")
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isUnauthorized());
    }

    @Test
    @DisplayName("GET /api/users/me returns 401 without authentication (security intact)")
    void protectedUsersMe_requiresAuthentication() throws Exception {
        mockMvc.perform(get("/api/users/me")
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isUnauthorized());
    }
}
