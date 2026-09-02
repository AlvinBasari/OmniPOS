@echo off
setlocal enabledelayedexpansion
title OMNIPOS DESKTOP - INSTALLER WINDOWS
color 0B
cls

set "DIR=%~dp0"
cd /d "%DIR%"

echo =================================================================
echo         OMNIPOS DESKTOP - INSTALLER SISTEM KASIR MANDIRI        
echo         Sistem Operasi: Microsoft Windows 10 / 11 (64-bit)       
echo =================================================================
echo.
echo Silakan pilih Edisi Sistem Toko yang ingin Anda pasang di komputer ini:
echo Setiap edisi akan terpasang sebagai aplikasi mandiri dengan database
echo terisolasi (pos_*.db) dan shortcut khusus di Desktop & Start Menu.
echo.
echo   [1] 🛒 OmniPOS Retail & Minimarket
echo       (Sembako, Toko Kelontong, Barcode Cepat, Grosir, Multi-Satuan, Kasbon)
echo.
echo   [2] 🍽️ OmniPOS Resto, Kafe & Bakery (F&B)
echo       (Denah Meja Visual, Layar Dapur KDS, Split Bill, Resep Bahan Baku / BOM)
echo.
echo   [3] ✂️ OmniPOS Layanan, Barbershop & Laundry
echo       (Antrean Pengerjaan, Penugasan Staf/Teknisi, Komisi Karyawan, Estimasi)
echo.
echo   [4] 💊 OmniPOS Apotek & Toko Obat
echo       (Peringatan Kadaluarsa FEFO, No. Batch Pabrik, Resep Dokter, SIP)
echo.
echo   [5] 📱 OmniPOS Gadget, Elektronik & IMEI
echo       (Pelacakan No. IMEI/Serial Unit, Kartu Garansi, Histori Klaim Servis)
echo.
echo   [6] 📦 Pasang Semua 5 Edisi Sekaligus (Shortcut Terpisah di Desktop)
echo   [7] ❌ Batal / Keluar
echo.
set /p CHOICE="Masukkan pilihan Anda [1-7]: "

if "%CHOICE%"=="1" (
    call :INSTALL_EDITION retail "OmniPOS Retail & Minimarket" "Sistem Kasir Sembako & Barcode"
) else if "%CHOICE%"=="2" (
    call :INSTALL_EDITION resto "OmniPOS Resto & Kafe" "Sistem Kasir F&B & Denah Meja"
) else if "%CHOICE%"=="3" (
    call :INSTALL_EDITION services "OmniPOS Layanan & Barbershop" "Sistem Kasir Jasa & Antrean"
) else if "%CHOICE%"=="4" (
    call :INSTALL_EDITION pharmacy "OmniPOS Apotek & Farmasi" "Sistem Kasir Obat & FEFO"
) else if "%CHOICE%"=="5" (
    call :INSTALL_EDITION electronics "OmniPOS Gadget & Elektronik" "Sistem Kasir IMEI & Garansi"
) else if "%CHOICE%"=="6" (
    call :INSTALL_EDITION retail "OmniPOS Retail & Minimarket" "Sistem Kasir Sembako & Barcode"
    call :INSTALL_EDITION resto "OmniPOS Resto & Kafe" "Sistem Kasir F&B & Denah Meja"
    call :INSTALL_EDITION services "OmniPOS Layanan & Barbershop" "Sistem Kasir Jasa & Antrean"
    call :INSTALL_EDITION pharmacy "OmniPOS Apotek & Farmasi" "Sistem Kasir Obat & FEFO"
    call :INSTALL_EDITION electronics "OmniPOS Gadget & Elektronik" "Sistem Kasir IMEI & Garansi"
) else if "%CHOICE%"=="7" (
    echo Instalasi dibatalkan.
    goto :EOF
) else (
    echo Pilihan tidak valid.
    pause
    goto :EOF
)

echo.
echo =================================================================
echo              INSTALASI OMNIPOS BERHASIL DISELESAIKAN!           
echo =================================================================
echo Shortcut aplikasi kasir telah dibuat di Layar Desktop & Start Menu.
echo Anda dapat membukanya langsung dengan klik ganda icon di Desktop.
echo.
set /p LAUNCH_NOW="Apakah Anda ingin membuka aplikasi sekarang? (Y/N): "
if /i "%LAUNCH_NOW%"=="Y" (
    if "%CHOICE%"=="1" start "" "%DIR%publish\win-x64\run-retail.bat"
    if "%CHOICE%"=="2" start "" "%DIR%publish\win-x64\run-resto.bat"
    if "%CHOICE%"=="3" start "" "%DIR%publish\win-x64\run-services.bat"
    if "%CHOICE%"=="4" start "" "%DIR%publish\win-x64\run-pharmacy.bat"
    if "%CHOICE%"=="5" start "" "%DIR%publish\win-x64\run-electronics.bat"
    if "%CHOICE%"=="6" start "" "%DIR%publish\win-x64\run-retail.bat"
)
goto :EOF

:INSTALL_EDITION
set "KEY=%~1"
set "NAME=%~2"
set "DESC=%~3"
set "EXE_PATH=%DIR%publish\win-x64\OmniPos.Desktop.exe"
set "RUN_BAT=%DIR%publish\win-x64\run-%KEY%.bat"
set "START_MENU=%APPDATA%\Microsoft\Windows\Start Menu\Programs\OmniPOS"

echo.
echo >>> Memasang: %NAME%...

if not exist "%DIR%publish\win-x64" mkdir "%DIR%publish\win-x64"
if not exist "%START_MENU%" mkdir "%START_MENU%"

:: Buat file launcher .bat mandiri per edisi
(
echo @echo off
echo title %NAME%
echo cd /d "%%~dp0"
echo echo ==========================================================
echo echo   Meluncurkan %NAME%
echo echo   Database Terisolasi: pos_%KEY%.db
echo echo ==========================================================
echo if exist "OmniPos.Desktop.exe" (
echo     start "" "OmniPos.Desktop.exe" --edition=%KEY% %%*
echo ^) else if exist "publish\win-x64\OmniPos.Desktop.exe" (
echo     start "" "publish\win-x64\OmniPos.Desktop.exe" --edition=%KEY% %%*
echo ^) else (
echo     echo [Error] Biner OmniPos.Desktop.exe tidak ditemukan.
echo     pause
echo ^)
) > "%RUN_BAT%"

:: Buat file launcher di root juga
copy /y "%RUN_BAT%" "%DIR%run-%KEY%.bat" >nul 2>&1

:: Buat Shortcut .lnk di Desktop Windows menggunakan PowerShell
set "DESKTOP_LNK=%USERPROFILE%\Desktop\%NAME%.lnk"
powershell -NoProfile -ExecutionPolicy Bypass -Command "$ws = New-Object -ComObject WScript.Shell; $s = $ws.CreateShortcut('%DESKTOP_LNK%'); $s.TargetPath = '%RUN_BAT%'; $s.WorkingDirectory = '%DIR%publish\win-x64'; $s.Description = '%DESC%'; $s.Save()" >nul 2>&1

:: Buat Shortcut .lnk di Start Menu Windows
set "MENU_LNK=%START_MENU%\%NAME%.lnk"
powershell -NoProfile -ExecutionPolicy Bypass -Command "$ws = New-Object -ComObject WScript.Shell; $s = $ws.CreateShortcut('%MENU_LNK%'); $s.TargetPath = '%RUN_BAT%'; $s.WorkingDirectory = '%DIR%publish\win-x64'; $s.Description = '%DESC%'; $s.Save()" >nul 2>&1

echo   [OK] Shortcut Desktop: "%DESKTOP_LNK%"
echo   [OK] Shortcut Start Menu: "%MENU_LNK%"
echo   [OK] Database Terisolasi: "%DIR%publish\win-x64\pos_%KEY%.db"
exit /b 0
