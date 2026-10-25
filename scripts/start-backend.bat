@echo off
cd /d "D:\Pham Duy Hung\PROJECT\LanguageLearning\backend"
set DB_PORT=5433

REM Load GEMINI_API_KEY from .env.gemini if present in root
if exist "..\.env.gemini" (
  for /f "usebackq tokens=1,2 delims==" %%A in ("..\.env.gemini") do (
    if "%%A"=="GEMINI_API_KEY" set GEMINI_API_KEY=%%B
    if "%%A"=="GEMINI_MODEL" set GEMINI_MODEL=%%B
  )
)

call mvnw.cmd spring-boot:run
