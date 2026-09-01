@echo off
title OmniPOS - Kasir Apotek & Toko Obat
cd /d "%~dp0"
echo ==========================================================
echo   Meluncurkan OmniPOS Apotek & Toko Obat
echo   Database Terisolasi: pos_pharmacy.db
echo ==========================================================
if exist "publish\win-x64\OmniPos.Desktop.exe" (
    start "" "publish\win-x64\OmniPos.Desktop.exe" --edition=pharmacy %*
) else (
    echo [Error] Biner Desktop Windows belum dikompilasi di publish\win-x64\OmniPos.Desktop.exe
    pause
)
