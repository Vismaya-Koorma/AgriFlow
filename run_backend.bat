@echo off
title AgriFlow Backend (Django)
cd /d "%~dp0"
echo Starting AgriFlow Django Backend on http://127.0.0.1:8000 ...
"C:\Users\Vismaya K\AppData\Local\Programs\Python\Python311\python.exe" manage.py runserver 127.0.0.1:8000
pause
