@echo off
chcp 65001 >nul
title AI Server - Port 8000
cd /d "%~dp0backend"
call venv\Scripts\activate.bat
python -m uvicorn main:app --reload --port 8000
pause
