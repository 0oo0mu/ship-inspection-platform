@echo off
title Frontend Server

cd /d "%~dp0frontend"

echo ==========================================
echo Starting Frontend Server
echo URL: http://localhost:3000
echo ==========================================

npm run dev

pause
