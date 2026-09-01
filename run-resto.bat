@echo off
title OmniPOS - Kasir Resto, Kafe & Bakery (F&B)
cd /d "%~dp0"
echo ==========================================================
echo   Meluncurkan OmniPOS Resto, Kafe & Bakery (F&B)
echo   Database Terisolasi: pos_resto.db
echo ==========================================================
if exist "publish\win-x64\OmniPos.Desktop.exe" (
    start "" "publish\win-x64\OmniPos.Desktop.exe" --edition=resto %*
) else (
    echo [Error] Biner Desktop Windows belum dikompilasi di publish\win-x64\OmniPos.Desktop.exe
    pause
)
