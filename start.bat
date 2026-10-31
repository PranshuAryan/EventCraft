@echo off
title EventCraft
where node >nul 2>nul || (echo Node.js is not installed. Download it from https://nodejs.org then run this again. & pause & exit /b)
if not exist node_modules (echo Installing, please wait... & call npm install)
if not exist server\.env copy server\.env.example server\.env >nul
start "" cmd /c "timeout /t 6 >nul & start http://localhost:5173"
call npm run dev