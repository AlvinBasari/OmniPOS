@echo off
cd /d "%~dp0"
if exist "%~dp0OmniPos.Desktop.exe" (
    start "" /d "%~dp0" "%~dp0OmniPos.Desktop.exe" --edition=services %*
) else if exist "%~dp0publish\win-x64\OmniPos.Desktop.exe" (
    start "" /d "%~dp0publish\win-x64" "%~dp0publish\win-x64\OmniPos.Desktop.exe" --edition=services %*
) else (
    echo [Error] Biner OmniPos.Desktop.exe tidak ditemukan.
    pause
)
