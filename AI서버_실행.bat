@echo off
title AI Server

cd /d "%~dp0backend"
call ..\venv\Scripts\activate.bat

echo ==========================================
echo Starting AI Inspection Server
echo URL: http://localhost:8000
echo ==========================================

python -m uvicorn main:app --reload --host 0.0.0.0 --port 8000

pause
