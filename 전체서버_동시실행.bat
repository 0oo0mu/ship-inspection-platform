@echo off
chcp 65001 >nul
title Ship Inspection System

start "AI Server" cmd /k "chcp 65001 >nul && cd /d "%~dp0backend" && call venv\Scripts\activate.bat && python -m uvicorn main:app --reload --port 8000"

timeout /t 2 /nobreak >nul

start "Frontend" cmd /k "chcp 65001 >nul && cd /d "%~dp0frontend" && npm run dev"

timeout /t 5 /nobreak >nul
start http://localhost:3000

pause
