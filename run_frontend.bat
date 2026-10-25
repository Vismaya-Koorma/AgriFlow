@echo off
title AgriFlow Frontend (React)
cd /d "%~dp0AgriFlow"
echo Starting AgriFlow Frontend on http://localhost:3000 ...
call npm.cmd run dev
pause
