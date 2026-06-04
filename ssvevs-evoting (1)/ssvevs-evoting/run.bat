@echo off
REM SSVEVS+ single-terminal launcher (Windows).
REM Usage:  run.bat            (boot everything)
REM         run.bat --setup    (install deps first, then boot)
where python >nul 2>nul && (python run.py %*) || (py run.py %*)
