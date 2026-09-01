@echo off
title OmniPOS - Kasir Layanan, Barbershop & Laundry
cd /d "%~dp0"
echo ==========================================================
echo   Meluncurkan OmniPOS Layanan, Barbershop & Laundry
echo   Database Terisolasi: pos_services.db
echo ==========================================================
if exist "publish\win-x64\OmniPos.Desktop.exe" (
    start "" "publish\win-x64\OmniPos.Desktop.exe" --edition=services %*
) else (
    echo [Error] Biner Desktop Windows belum dikompilasi di publish\win-x64\OmniPos.Desktop.exe
    pause
)
