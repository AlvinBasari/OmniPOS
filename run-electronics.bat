@echo off
title OmniPOS - Kasir Gadget & Elektronik (IMEI)
cd /d "%~dp0"
echo ==========================================================
echo   Meluncurkan OmniPOS Gadget & Elektronik (IMEI)
echo   Database Terisolasi: pos_electronics.db
echo ==========================================================
if exist "publish\win-x64\OmniPos.Desktop.exe" (
    start "" "publish\win-x64\OmniPos.Desktop.exe" --edition=electronics %*
) else (
    echo [Error] Biner Desktop Windows belum dikompilasi di publish\win-x64\OmniPos.Desktop.exe
    pause
)
