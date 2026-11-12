@echo off
setlocal
title Ba Vuong Dai Chien - May chu game
set "ROOT=%~dp0"
cd /d "%ROOT%"

where py >nul 2>nul
if errorlevel 1 goto python_launcher_missing
set "QUIZ_PY_VERSION="
for /f "delims=" %%V in ('py -3 -c "import sys; print(sys.version_info.major*100+sys.version_info.minor)" 2^>nul') do set "QUIZ_PY_VERSION=%%V"
if not defined QUIZ_PY_VERSION goto python3_missing
if %QUIZ_PY_VERSION% LSS 309 goto python_too_old

where node >nul 2>nul
if errorlevel 1 goto node_missing

set "QUIZ_DATA_DIR=%ROOT%data"
set "QUIZ_DB=%QUIZ_DATA_DIR%\quiz.db"
set "QUIZ_COMMIT="
where git >nul 2>nul
if errorlevel 1 goto git_missing
for /f "delims=" %%H in ('git rev-parse HEAD 2^>nul') do set "QUIZ_COMMIT=%%H"
if not defined QUIZ_COMMIT goto git_missing
goto git_ready

:git_missing
set "QUIZ_COMMIT=khong-xac-dinh"
echo [quiz] CANH BAO: khong co Git/checkout; moi lan khoi dong se build lai web.

:git_ready

echo === Ba Vuong Dai Chien: khoi dong source-run ===
echo [quiz] Commit: %QUIZ_COMMIT%
echo [quiz] Database source-run: %QUIZ_DB%
echo [quiz] Du lieu Electron trong AppData khong duoc dung cho buoi LIVE 12-14/11.
echo.

py -3 tools\web_build.py check
if errorlevel 2 goto build_check_error
if errorlevel 1 goto build
goto backup

:build
echo [1/3] Dist thieu hoac cu hon HEAD; dang build lai Dashboard va Overlay...
call corepack pnpm build:web
if errorlevel 1 goto build_error
py -3 tools\web_build.py verify
if errorlevel 1 goto verify_build_error

:backup
echo [2/3] Dang sao luu DB va assets-local truoc khi mo server...
py -3 tools\backup.py create --root "%ROOT%"
if errorlevel 2 goto backup_full
if errorlevel 1 goto backup_error

:run
echo [3/3] Dang chay may chu tai http://127.0.0.1:8787 ...
start "" /min powershell -NoProfile -WindowStyle Hidden -Command "Start-Sleep 6; if (Test-Path 'data/admin-token.txt') { Get-Content 'data/admin-token.txt' -Raw | Set-Clipboard }; Start-Process 'http://127.0.0.1:8787/dashboard/'"
echo.
echo  - Dashboard (dieu khien): http://127.0.0.1:8787/dashboard/
echo  - Overlay (dua vao LIVE Studio, 1080x1920): http://127.0.0.1:8787/overlay/?role=program
echo  - Tab xem thu: http://127.0.0.1:8787/overlay/
echo  - Ma quan tri da duoc CHEP SAN vao clipboard: bam Ctrl+V o o dang nhap Dashboard.
echo  - DUNG TAT cua so nay trong luc LIVE. Tat cua so = tat game.
echo.
call "%~dp0node_modules\.bin\tsx.cmd" "%~dp0apps\server\src\main.ts"
pause
exit /b 0

:build_check_error
echo LOI: khong doc duoc commit HEAD de kiem tra dist.
pause
exit /b 1

:build_error
echo LOI: build Dashboard/Overlay that bai.
pause
exit /b 1

:verify_build_error
echo LOI: build xong nhung dist van thieu hoac cu hon HEAD.
pause
exit /b 1

:backup_error
echo LOI: backup truoc khi mo server that bai; server khong duoc mo.
pause
exit /b 1

:backup_full
echo !!! CANH BAO: O DIA GAN DAY HOAC KHONG DU CHO CHO BAN BACKUP MOI.
echo !!! Co the tiep tuc chay game ma khong co backup moi, du lieu co nguy co neu may gap su co.
set "QUIZ_CONTINUE="
set /p "QUIZ_CONTINUE=Ban co muon tiep tuc khong co backup moi? [Y/N]: "
if /i "%QUIZ_CONTINUE%"=="Y" goto run
echo Da dung theo lua chon; server chua duoc mo.
pause
exit /b 1

:python_launcher_missing
echo LOI: khong tim thay Python Launcher 'py'. Cai Python 3.9 tro len va bat py launcher.
pause
exit /b 1

:python3_missing
echo LOI: co 'py' nhung khong tim thay Python 3. Yeu cau Python 3.9 tro len.
pause
exit /b 1

:python_too_old
echo LOI: Python phat hien ma '%QUIZ_PY_VERSION%' cu hon 3.9. Hay cai Python 3.9 tro len.
pause
exit /b 1

:node_missing
echo LOI: khong tim thay Node.js. Cai Node.js 22 tro len de build va chay server.
pause
exit /b 1
