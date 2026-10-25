@echo off
echo Starting AgriFlow Backend and Frontend...
start "AgriFlow Backend" cmd /k ""%~dp0run_backend.bat""
start "AgriFlow Frontend" cmd /k ""%~dp0run_frontend.bat""
