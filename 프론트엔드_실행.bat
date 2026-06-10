@echo off
chcp 65001 >nul
title Frontend Server - Port 3000
cd /d "%~dp0frontend"
npm run dev
pause
