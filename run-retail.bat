@echo off
title OmniPOS - Kasir Retail, Sembako & Minimarket
cd /d "%~dp0"
echo ==========================================================
echo   Meluncurkan OmniPOS Retail, Sembako & Minimarket
echo   Database Terisolasi: pos_retail.db
echo ==========================================================
if exist "publish\win-x64\OmniPos.Desktop.exe" (
    start "" "publish\win-x64\OmniPos.Desktop.exe" --edition=retail %*
) else (
    echo [Error] Biner Desktop Windows belum dikompilasi di publish\win-x64\OmniPos.Desktop.exe
    pause
)
