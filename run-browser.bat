@echo off
cd /d "%~dp0"
echo ========================================================
echo   OmniPOS Enterprise - Membuka Mode Web Browser
echo ========================================================
if exist "%~dp0OmniPos.Desktop.exe" (
    start "" "%~dp0OmniPos.Desktop.exe" --browser %*
) else if exist "%~dp0publish\win-x64\OmniPos.Desktop.exe" (
    start "" "%~dp0publish\win-x64\OmniPos.Desktop.exe" --browser %*
) else (
    echo [Error] Biner OmniPos.Desktop.exe tidak ditemukan.
    pause
)
