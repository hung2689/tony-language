package com.languagelearning.backend.integration;

import com.languagelearning.backend.account.User;
import com.languagelearning.backend.account.UserRepository;
import com.languagelearning.backend.auth.service.JwtTokenService;
import com.languagelearning.backend.common.security.PerfDataSeeder;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.test.context.ActiveProfiles;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;

import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@ActiveProfiles("test")
public class CompressionIntegrationTest {

    @LocalServerPort
    private int port;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private JwtTokenService jwtTokenService;

    @Test
    @DisplayName("Verify server.compression.enabled compresses large responses like GET /api/decks")
    void verifyGzipCompressionOnLargePayload() throws Exception {
        User perfUser = userRepository.findByEmailIgnoreCase(PerfDataSeeder.PERF_USER_EMAIL)
                .orElseThrow(() -> new IllegalStateException("Perf user not found"));

        String token = jwtTokenService.generateAccessToken(perfUser);

        HttpClient client = HttpClient.newHttpClient();

        // 1. Request WITHOUT gzip
        HttpRequest rawRequest = HttpRequest.newBuilder()
                .uri(URI.create("http://localhost:" + port + "/api/decks"))
                .header("Authorization", "Bearer " + token)
                .GET()
                .build();

        HttpResponse<byte[]> rawResponse = client.send(rawRequest, HttpResponse.BodyHandlers.ofByteArray());
        assertEquals(200, rawResponse.statusCode());
        int rawSize = rawResponse.body().length;

        // 2. Request WITH gzip
        HttpRequest gzipRequest = HttpRequest.newBuilder()
                .uri(URI.create("http://localhost:" + port + "/api/decks"))
                .header("Authorization", "Bearer " + token)
                .header("Accept-Encoding", "gzip")
                .GET()
                .build();

        HttpResponse<byte[]> gzipResponse = client.send(gzipRequest, HttpResponse.BodyHandlers.ofByteArray());
        assertEquals(200, gzipResponse.statusCode());
        int gzipSize = gzipResponse.body().length;
        String contentEncoding = gzipResponse.headers().firstValue("Content-Encoding").orElse(null);

        System.out.println("=========================================================================");
        System.out.println("COMPRESSION TEST RESULTS for GET /api/decks:");
        System.out.printf("  Raw Size (without gzip)     : %d bytes%n", rawSize);
        System.out.printf("  Compressed Size (with gzip) : %d bytes%n", gzipSize);
        System.out.printf("  Content-Encoding Header     : %s%n", contentEncoding);
        if (rawSize > 0) {
            double ratio = (1.0 - ((double) gzipSize / rawSize)) * 100.0;
            System.out.printf("  Bandwidth Reduction         : %.1f%%%n", ratio);
        }
        System.out.println("=========================================================================");

        assertEquals("gzip", contentEncoding, "Response must be compressed with gzip");
        assertTrue(rawSize > 1024, "Raw response must exceed server.compression.min-response-size (1024 bytes)");
        assertTrue(gzipSize < rawSize, "Compressed response must be smaller than uncompressed response");
    }
}
