package com.languagelearning.backend.common.security;

import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;

import java.time.Instant;
import java.util.List;

public class SecurityTestUtils {

    public static void setAuthenticatedUser(Long userId, String email, String username, List<String> roles) {
        Jwt jwt = Jwt.withTokenValue("mock-test-jwt-token")
                .header("alg", "HS256")
                .issuer("language-learning-app")
                .issuedAt(Instant.now())
                .expiresAt(Instant.now().plusSeconds(900))
                .subject(userId.toString())
                .claim("email", email)
                .claim("username", username)
                .claim("roles", roles)
                .build();

        List<SimpleGrantedAuthority> authorities = roles.stream()
                .map(role -> new SimpleGrantedAuthority("ROLE_" + role))
                .toList();

        JwtAuthenticationToken auth = new JwtAuthenticationToken(jwt, authorities);
        SecurityContextHolder.getContext().setAuthentication(auth);
    }

    public static void clearAuthentication() {
        SecurityContextHolder.clearContext();
    }
}
