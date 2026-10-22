# Language Learning Backend

Backend service for the Language Learning platform built with Spring Boot 4.1.1, Java 21, Spring Security with Nimbus OAuth2 Resource Server (HMAC-SHA256 JWT), PostgreSQL, and Flyway.

---

## Prerequisites

- **Java 21 (JDK 21)**
  - Note: If Java 21 is not your default system Java, set `JAVA_HOME` before running:
    - **Windows:** `set JAVA_HOME=C:\Program Files\Java\jdk-21`
    - **Linux/macOS:** `export JAVA_HOME=/path/to/jdk-21`
- **PostgreSQL** running locally on port `5433` (or `5432`) with database `language_learning`.

---

## Running the Application

### 1. Development Mode (`dev` Profile)
In development, the application uses the `dev` profile. This profile enables `DevDataSeeder`, which seeds a test user with real BCrypt credentials:
- **Email:** `dev@languagelearning.com`
- **Username:** `dev_user`
- **Password:** `DevPassword123!`

To run with Maven:
```bash
# Windows (PowerShell / Command Prompt)
set JAVA_HOME=C:\Program Files\Java\jdk-21
.\mvnw.cmd spring-boot:run

# Linux / macOS
export JAVA_HOME=/path/to/jdk-21
./mvnw spring-boot:run
```
> **Note:** The `dev` profile is automatically configured via `spring-boot-maven-plugin` arguments when running `spring-boot:run`. The committed `application.properties` does **not** have `spring.profiles.active=dev` enabled by default, ensuring that packaged JARs (`java -jar`) do not activate the dev seeder or seed password without explicit configuration.

The backend starts at `http://localhost:8080`.

---

## Running Tests

To run the complete test suite (unit tests with Mockito and full end-to-end integration tests against the PostgreSQL database):
```bash
# Windows
set JAVA_HOME=C:\Program Files\Java\jdk-21
.\mvnw.cmd test

# Linux / macOS
./mvnw test
```

---

## Authentication & Security Overview (Phase 1.5)

- **Access Token:**
  - Standard JWT signed with HMAC-SHA256 (via Nimbus JOSE).
  - Lifetime: 15 minutes.
  - Carried in HTTP `Authorization: Bearer <token>` header.
  - Kept in-memory on the frontend (never stored in `localStorage` or `sessionStorage`).

- **Refresh Token:**
  - Cryptographically secure 256-bit random token.
  - Lifetime: 14 days.
  - Only the SHA-256 hash is persisted in the `refresh_tokens` database table.
  - Delivered via an `HttpOnly`, `SameSite=Strict`, `Path=/api/auth` cookie.
  - **Rotation & Family Revocation:** Every refresh call issues a new refresh token and revokes the old one. If an already-revoked refresh token is re-submitted outside the 10-second grace window, the entire token family for that user is immediately revoked to neutralize token theft.

- **Brute-Force Protection:**
  - In-memory rate limiter tracking failed login attempts per `email + client IP`.
  - Max 5 failed attempts in a 15-minute sliding window; returns HTTP 429 (`Too Many Requests`).

- **CSRF Protection:**
  - Refresh and logout cookie-based endpoints require the `X-Requested-With: XMLHttpRequest` custom header. Requests missing this header are rejected with HTTP 403.

- **Production Guardrails:**
  - `JwtCurrentUserProvider` resolves the user strictly from the JWT `sub` / `SecurityContext`.
  - Non-dev environments enforce a minimum 256-bit `JWT_SECRET` environment variable at startup, failing loudly if absent or weak.
