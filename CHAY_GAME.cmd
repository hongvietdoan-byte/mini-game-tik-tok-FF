@echo off
setlocal
chcp 65001 >nul
title Nha Thong Thai Free Fire - May chu game
set "ROOT=%~dp0"
set "ROOT=%ROOT:~0,-1%"
cd /d "%ROOT%"

where py >nul 2>nul
if errorlevel 1 goto python_launcher_missing
set "QUIZ_PY_VERSION="
for /f "delims=" %%V in ('py -3 -c "import sys; print(sys.version_info.major*100+sys.version_info.minor)" 2^>nul') do set "QUIZ_PY_VERSION=%%V"
if not defined QUIZ_PY_VERSION goto python3_missing
if %QUIZ_PY_VERSION% LSS 309 goto python_too_old

where node >nul 2>nul
if errorlevel 1 goto node_missing

set "QUIZ_DATA_DIR=%ROOT%\data"
set "QUIZ_DB=%QUIZ_DATA_DIR%\quiz.db"
if not "%~1"=="" set "QUIZ_PROGRAM_WIDTH=%~1"
if not "%~2"=="" set "QUIZ_PROGRAM_HEIGHT=%~2"
if not defined QUIZ_PROGRAM_WIDTH set "QUIZ_PROGRAM_WIDTH=1080"
if not defined QUIZ_PROGRAM_HEIGHT set "QUIZ_PROGRAM_HEIGHT=1920"
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

echo === Nha Thong Thai Free Fire: khoi dong source-run ===
echo [quiz] Commit: %QUIZ_COMMIT%
echo [quiz] Database source-run: %QUIZ_DB%
echo [quiz] Du lieu Electron trong AppData khong duoc dung cho buoi LIVE 12-14/11.
echo.

for /f "delims=" %%T in ('py -3 tools\step_timer.py start') do set "QUIZ_STEP_START=%%T"
py -3 tools\check_workspace_links.py --root "%ROOT%"
set "QUIZ_STEP_RC=%ERRORLEVEL%"
for /f "delims=" %%T in ('py -3 tools\step_timer.py elapsed %QUIZ_STEP_START%') do echo [1/5] xong sau %%T s
if not "%QUIZ_STEP_RC%"=="0" goto workspace_links_error

for /f "delims=" %%T in ('py -3 tools\step_timer.py start') do set "QUIZ_STEP_START=%%T"
py -3 tools\web_build.py ensure
set "QUIZ_STEP_RC=%ERRORLEVEL%"
for /f "delims=" %%T in ('py -3 tools\step_timer.py elapsed %QUIZ_STEP_START%') do echo [2/5] xong sau %%T s
if not "%QUIZ_STEP_RC%"=="0" goto build_error

for /f "delims=" %%T in ('py -3 tools\step_timer.py start') do set "QUIZ_STEP_START=%%T"
py -3 tools\server_build.py ensure --root "%ROOT%"
set "QUIZ_STEP_RC=%ERRORLEVEL%"
for /f "delims=" %%T in ('py -3 tools\step_timer.py elapsed %QUIZ_STEP_START%') do echo [3/5] xong sau %%T s
set "QUIZ_SERVER_USE_TSX=0"
if not "%QUIZ_STEP_RC%"=="0" goto server_build_fallback
goto backup

:server_build_fallback
set "QUIZ_SERVER_USE_TSX=1"
echo [quiz] Bundle server chua san sang; se chay bang tsx de tiep tuc.

:backup
echo [4/5] Dang sao luu DB va assets-local truoc khi mo server...
for /f "delims=" %%T in ('py -3 tools\step_timer.py start') do set "QUIZ_STEP_START=%%T"
py -3 tools\backup.py create --root "%ROOT%"
set "QUIZ_STEP_RC=%ERRORLEVEL%"
for /f "delims=" %%T in ('py -3 tools\step_timer.py elapsed %QUIZ_STEP_START%') do echo [4/5] xong sau %%T s
if "%QUIZ_STEP_RC%"=="2" goto backup_full
if not "%QUIZ_STEP_RC%"=="0" goto backup_error

:run
echo [5/5] Dang chay may chu tai http://127.0.0.1:8787 ...
echo.
echo  - Dashboard (dieu khien): http://127.0.0.1:8787/dashboard/
echo  - Khung game program yeu cau: %QUIZ_PROGRAM_WIDTH%x%QUIZ_PROGRAM_HEIGHT% CSS px; dung Window Capture cua cua so nay trong LIVE Studio.
echo  - Neu Edge khong tu mo cua so game: http://127.0.0.1:8787/overlay/?role=program
echo  - Ma quan tri da duoc CHEP SAN vao clipboard: bam Ctrl+V o o dang nhap Dashboard.
echo  - DUNG TAT cua so nay trong luc LIVE. Tat cua so = tat game.
echo.
call powershell -NoLogo -NoProfile -ExecutionPolicy Bypass -File "%ROOT%\tools\start-game.ps1" -Root "%ROOT%"
pause
exit /b 0

:workspace_links_error
echo LOI: lien ket @quiz khong thuoc apps/ hoac packages/ cua checkout nay.
echo Hay sua bang lenh: corepack pnpm install --frozen-lockfile --offline
pause
exit /b 1

:build_error
echo LOI: khong the dam bao Dashboard/Overlay dist khop voi source; game chua duoc mo.
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
