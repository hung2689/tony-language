package com.languagelearning.backend.auth.dto;

public class TokenRefreshResponse {

    private String accessToken;
    private String tokenType = "Bearer";
    private long expiresIn;

    public TokenRefreshResponse() {
    }

    public TokenRefreshResponse(String accessToken, long expiresIn) {
        this.accessToken = accessToken;
        this.tokenType = "Bearer";
        this.expiresIn = expiresIn;
    }

    public String getAccessToken() {
        return accessToken;
    }

    public void setAccessToken(String accessToken) {
        this.accessToken = accessToken;
    }

    public String getTokenType() {
        return tokenType;
    }

    public void setTokenType(String tokenType) {
        this.tokenType = tokenType;
    }

    public long getExpiresIn() {
        return expiresIn;
    }

    public void setExpiresIn(long expiresIn) {
        this.expiresIn = expiresIn;
    }
}
