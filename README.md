# Language Learning Platform

An interactive language learning web application built with Spring Boot, PostgreSQL, and React.

---

## 1. Getting Started (Fresh-Clone Steps)

### Prerequisites
- **Java 17+** (JDK 17 or higher)
- **Node.js 18+** & npm
- **PostgreSQL 15+** or Docker

### Backend Setup
1. Navigate to `backend`:
   ```bash
   cd backend
   ```
2. Copy `.env.example` to `.env` (untracked):
   ```bash
   cp .env.example .env
   ```
3. Generate a secure 256-bit JWT secret:
   - On Linux / macOS / Git Bash:
     ```bash
     openssl rand -base64 32
     ```
   - On Windows PowerShell:
     ```powershell
     [Convert]::ToBase64String((1..32 | ForEach-Object { Get-Random -Maximum 256 } | ForEach-Object { [byte]$_ }))
     ```
   Paste the generated string into your untracked `.env` as `JWT_SECRET`.
4. Run Flyway migrations and start the backend:
   ```bash
   ./mvnw spring-boot:run
   ```

### Frontend Setup
1. Navigate to `frontend`:
   ```bash
   cd frontend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start the Vite development server:
   ```bash
   npm run dev
   ```

---

## 2. Database Configuration & Docker

- **Default Port:** `5432` (`localhost:5432/language_learning`).
- **Docker Compose:** Run the pre-configured PostgreSQL container on default port 5432:
  ```bash
  docker compose up -d postgres
  ```
- **Port Overrides (e.g., Local PostgreSQL on 5433):**
  If your machine runs PostgreSQL on port 5433, you can override the port by setting an untracked environment variable:
  ```powershell
  # In PowerShell session:
  $env:DB_PORT="5433"
  ```
  Or define `DB_PORT=5433` in your untracked `backend/.env` file.
  The committed configuration in `application.properties` respects `DB_URL`, `DB_HOST`, and `DB_PORT` overrides.

---

## 3. Spring Profiles

- **`dev` (Development):**
  - Uses `DevDataSeeder` to auto-seed initial development user and deck data.
  - Allows fallback developer JWT secret if `JWT_SECRET` is unset.
  - Active by default in local development unless specified otherwise.
- **`test` (Isolated Integration Testing):**
  - Connects strictly to the dedicated test database: `language_learning_test`.
  - Aborts the Spring application context immediately if the connected database name does not end with `_test`.
  - Disables `DevDataSeeder` so test isolation is guaranteed and no fake dev data is inserted.
- **`prod` (Production):**
  - Requires a valid, non-placeholder `JWT_SECRET` of at least 32 bytes (256 bits).
  - Secure cookies enforced (`Secure; HttpOnly; SameSite=Strict`).

---

## 4. Test Database Setup & Running Tests

### Creating the Dedicated Test Database
Integration tests run strictly against `language_learning_test` and **never** touch the development database `language_learning`.

To create the test database on your PostgreSQL instance:
```sql
CREATE DATABASE language_learning_test;
```
Or via terminal:
```bash
# If running on port 5432:
psql -U postgres -h localhost -p 5432 -c "CREATE DATABASE language_learning_test;"

# If running on port 5433:
psql -U postgres -h localhost -p 5433 -c "CREATE DATABASE language_learning_test;"
```

### Running Backend Tests
```bash
cd backend
./mvnw test
```
*Note: If the test database `language_learning_test` is unavailable, integration tests requiring PostgreSQL will report "not run" or fail safely before touching development data.*

### Running Frontend Tests
```bash
cd frontend
npm test
```
