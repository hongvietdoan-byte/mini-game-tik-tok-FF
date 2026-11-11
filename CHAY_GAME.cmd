@echo off
title Ba Vuong Dai Chien - May chu game
cd /d "%~dp0"

echo === Ba Vuong Dai Chien: khoi dong tool game ===
if not exist "apps\dashboard\dist\index.html" goto build
if not exist "apps\overlay\dist\index.html" goto build
goto run

:build
echo [1/2] Dang dung giao dien (lan dau mat ~1 phut)...
call corepack pnpm build:web || (echo LOI build giao dien & pause & exit /b 1)

:run
echo [2/2] Dang chay may chu tai http://127.0.0.1:8787 ...
start "" /min powershell -NoProfile -WindowStyle Hidden -Command "Start-Sleep 6; if (Test-Path 'data/admin-token.txt') { Get-Content 'data/admin-token.txt' -Raw | Set-Clipboard }; Start-Process 'http://127.0.0.1:8787/dashboard/'"
echo.
echo  - Dashboard (dieu khien): http://127.0.0.1:8787/dashboard/
echo  - Overlay (dua vao LIVE Studio, 1080x1920): http://127.0.0.1:8787/overlay/
echo  - Ma quan tri da duoc CHEP SAN vao clipboard: bam Ctrl+V o o dang nhap Dashboard.
echo  - DUNG TAT cua so nay trong luc LIVE. Tat cua so = tat game.
echo.
call "%~dp0node_modules\.bin\tsx.cmd" "%~dp0apps\server\src\main.ts"
pause
