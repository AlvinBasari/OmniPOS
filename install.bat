@echo off
setlocal enabledelayedexpansion
title "BASARI IT SOLUTIONS - OmniPOS Enterprise Setup Wizard"
color 0B
cls

set "DIR=%~dp0"
cd /d "%DIR%"

:: Deteksi folder aplikasi dan file executable OmniPos.Desktop.exe
set "APP_DIR=%DIR%publish\win-x64"
if exist "%DIR%OmniPos.Desktop.exe" set "APP_DIR=%DIR%"
if exist "%DIR%publish\win-x64\OmniPos.Desktop.exe" set "APP_DIR=%DIR%publish\win-x64"
set "EXE_TARGET=%APP_DIR%\OmniPos.Desktop.exe"

echo ===============================================================================
echo   ____    _    ____    _    ____  ___ 
echo  ^| __ )  / \  / ___^|  / \  ^|  _ \^|_ _^|
echo  ^|  _ \ / _ \ \___ \ / _ \ ^| ^|_) ^|^| ^|   BASARI IT SOLUTIONS
echo  ^| ^|_) / ___ \ ___) / ___ \^|  _ ^< ^| ^|   Enterprise Software Engineering
echo  ^|____/_/   \_^\____/_/   \_^\_^| \_\___^|  www.basari-it.com
echo ===============================================================================
echo            OMNIPOS ENTERPRISE POINT OF SALE - SETUP WIZARD
echo       Copyright (C) 2026 BASARI IT SOLUTIONS. All rights reserved.
echo ===============================================================================
echo.
echo [1/3] Memeriksa Kesiapan Sistem Windows...

:: Check Architecture
if "%PROCESSOR_ARCHITECTURE%"=="AMD64" (
    echo   [OK] Arsitektur Sistem: 64-bit (x64) Didukung Penuh
) else if "%PROCESSOR_ARCHITEW6432%"=="AMD64" (
    echo   [OK] Arsitektur Sistem: WOW64 64-bit Didukung Penuh
) else (
    echo   [PERINGATAN] Sistem Anda terdeteksi 32-bit. Disarankan Windows 10/11 64-bit.
)

:: Check WebView2 Runtime (Standard in Windows 11 & modern Windows 10)
reg query "HKLM\SOFTWARE\WOW6432Node\Microsoft\EdgeUpdate\Clients\{F3017226-F501-47DD-9A0E-C087C2FBFC37}" >nul 2>&1
if %ERRORLEVEL% EQU 0 (
    echo   [OK] Microsoft Edge WebView2 Runtime: Terpasang
) else (
    echo   [INFO] WebView2 Runtime bawaan Windows akan digunakan oleh Photino Engine.
)

echo.
echo ===============================================================================
echo   PILIH EDISI SISTEM KASIR TOKO ANDA (BASARI IT SOLUTIONS)
echo ===============================================================================
echo   Setiap edisi akan dipasang sebagai aplikasi mandiri dengan database
echo   terenkripsi terisolasi (pos_*.db) dan shortcut khusus di Desktop ^& Start Menu:
echo.
echo   [1] 🛒 OmniPOS Retail, Sembako ^& Minimarket
echo       Fitur: Barcode Kilat, Timbangan Manual/Digital, Harga Grosir Bertingkat,
echo              Multi-Satuan (Dus/Renteng/Pcs), Buku Kasbon ^& Saldo Piutang.
echo.
echo   [2] 🍽️  OmniPOS Resto, Kafe ^& Bakery (Food ^& Beverage)
echo       Fitur: Denah Meja Visual Dinamis, Layar Pesanan Dapur (KDS), Split Bill,
echo              Bahan Baku ^& Resep BOM (Bill of Materials), Cetak Slip Dapur.
echo.
echo   [3] ✂️  OmniPOS Layanan, Barbershop ^& Laundry Kiloan
echo       Fitur: Manajemen Antrean Pengerjaan, Penugasan Staf ^& Teknisi Presisi,
echo              Bagi Hasil ^& Komisi Karyawan, Estimasi Waktu Selesai.
echo.
echo   [4] 💊 OmniPOS Apotek ^& Toko Obat (Farmasi)
echo       Fitur: Peringatan Kadaluarsa Dini (FEFO First-Expired-First-Out),
echo              Pelacakan No. Batch Pabrik, Resep Dokter ^& SIP Apoteker.
echo.
echo   [5] 📱 OmniPOS Gadget, Elektronik ^& IMEI
echo       Fitur: Pelacakan No. IMEI ^& Serial Number, Kartu Garansi Digital,
echo              Pusat Servis ^& SPK Tanda Terima, Tukar Tambah (Trade-In),
echo              Voucher Data ^& Kartu Perdana Nomor Cantik.
echo.
echo   [6] 📦 Pasang SEMUA 5 Edisi Sekaligus (5 Shortcut Mandiri di Desktop)
echo   [7] ❌ Batal / Keluar Installer
echo ===============================================================================
echo.
set /p CHOICE="Masukkan nomor pilihan Anda [1-7]: "

if "%CHOICE%"=="1" (
    call :INSTALL_EDITION retail "OmniPOS Retail & Minimarket" "Sistem Kasir Sembako & Barcode Kilat"
) else if "%CHOICE%"=="2" (
    call :INSTALL_EDITION resto "OmniPOS Resto & Kafe" "Sistem Kasir F&B, Denah Meja & Dapur KDS"
) else if "%CHOICE%"=="3" (
    call :INSTALL_EDITION services "OmniPOS Layanan & Barbershop" "Sistem Kasir Jasa, Antrean & Komisi Staf"
) else if "%CHOICE%"=="4" (
    call :INSTALL_EDITION pharmacy "OmniPOS Apotek & Farmasi" "Sistem Kasir Obat, Resep Dokter & FEFO"
) else if "%CHOICE%"=="5" (
    call :INSTALL_EDITION electronics "OmniPOS Gadget & Elektronik" "Sistem Kasir IMEI, Garansi, Servis & Trade-In"
) else if "%CHOICE%"=="6" (
    call :INSTALL_EDITION retail "OmniPOS Retail & Minimarket" "Sistem Kasir Sembako & Barcode Kilat"
    call :INSTALL_EDITION resto "OmniPOS Resto & Kafe" "Sistem Kasir F&B, Denah Meja & Dapur KDS"
    call :INSTALL_EDITION services "OmniPOS Layanan & Barbershop" "Sistem Kasir Jasa, Antrean & Komisi Staf"
    call :INSTALL_EDITION pharmacy "OmniPOS Apotek & Farmasi" "Sistem Kasir Obat, Resep Dokter & FEFO"
    call :INSTALL_EDITION electronics "OmniPOS Gadget & Elektronik" "Sistem Kasir IMEI, Garansi, Servis & Trade-In"
) else if "%CHOICE%"=="7" (
    echo.
    echo Instalasi dibatalkan oleh pengguna.
    goto :EOF
) else (
    echo.
    echo [Error] Pilihan tidak valid. Silakan jalankan ulang installer.
    pause
    goto :EOF
)

echo.
echo ===============================================================================
echo   [SUKSES] INSTALASI OMNIPOS ENTERPRISE BERHASIL DISELESAIKAN!
echo   Pengembang Resmi: BASARI IT SOLUTIONS (Indonesia)
echo ===============================================================================
echo.
echo Shortcut aplikasi kasir telah dibuat di Layar Desktop & Start Menu Windows.
echo Anda dapat membukanya langsung dengan klik ganda icon di Desktop.
echo.
set /p LAUNCH_NOW="Apakah Anda ingin langsung meluncurkan aplikasi kasir? (Y/N): "
if /i "%LAUNCH_NOW%"=="Y" (
    if "%CHOICE%"=="1" start "" "%EXE_TARGET%" --edition=retail
    if "%CHOICE%"=="2" start "" "%EXE_TARGET%" --edition=resto
    if "%CHOICE%"=="3" start "" "%EXE_TARGET%" --edition=services
    if "%CHOICE%"=="4" start "" "%EXE_TARGET%" --edition=pharmacy
    if "%CHOICE%"=="5" start "" "%EXE_TARGET%" --edition=electronics
    if "%CHOICE%"=="6" start "" "%EXE_TARGET%" --edition=retail
)
goto :EOF

:INSTALL_EDITION
set "KEY=%~1"
set "NAME=%~2"
set "DESC=%~3"
set "RUN_BAT=%APP_DIR%\run-%KEY%.bat"
set "START_MENU=%APPDATA%\Microsoft\Windows\Start Menu\Programs\BASARI IT SOLUTIONS\OmniPOS"

echo.
echo >>> Memasang: %NAME% oleh BASARI IT SOLUTIONS...

if not exist "%APP_DIR%" mkdir "%APP_DIR%"
if not exist "%START_MENU%" mkdir "%START_MENU%"

:: 1. Buat file launcher .bat mandiri per edisi dengan path absolut %~dp0
(
echo @echo off
echo cd /d "%%~dp0"
echo if exist "%%~dp0OmniPos.Desktop.exe" (
echo     start "" "%%~dp0OmniPos.Desktop.exe" --edition=%KEY% %%*
echo ^) else if exist "%%~dp0publish\win-x64\OmniPos.Desktop.exe" (
echo     start "" "%%~dp0publish\win-x64\OmniPos.Desktop.exe" --edition=%KEY% %%*
echo ^) else (
echo     echo [Error] Biner OmniPos.Desktop.exe tidak ditemukan di folder %%~dp0
echo     pause
echo ^)
) > "%RUN_BAT%"

:: 2. Salin launcher ke direktori root juga jika berbeda
if not "%DIR%"=="%APP_DIR%\" (
    copy /y "%RUN_BAT%" "%DIR%run-%KEY%.bat" >nul 2>&1
)

:: 3. Buat Shortcut .lnk di Desktop Windows LANGSUNG ke OmniPos.Desktop.exe
set "DESKTOP_LNK=%USERPROFILE%\Desktop\%NAME%.lnk"
powershell -NoProfile -ExecutionPolicy Bypass -Command ^
  "$ws = New-Object -ComObject WScript.Shell; $s = $ws.CreateShortcut('%DESKTOP_LNK%'); $s.TargetPath = '%EXE_TARGET%'; $s.Arguments = '--edition=%KEY%'; $s.WorkingDirectory = '%APP_DIR%'; $s.Description = '%DESC% - BASARI IT SOLUTIONS'; $s.IconLocation = '%EXE_TARGET%,0'; $s.Save()" >nul 2>&1

:: 4. Buat Shortcut .lnk di Start Menu Windows LANGSUNG ke OmniPos.Desktop.exe
set "MENU_LNK=%START_MENU%\%NAME%.lnk"
powershell -NoProfile -ExecutionPolicy Bypass -Command ^
  "$ws = New-Object -ComObject WScript.Shell; $s = $ws.CreateShortcut('%MENU_LNK%'); $s.TargetPath = '%EXE_TARGET%'; $s.Arguments = '--edition=%KEY%'; $s.WorkingDirectory = '%APP_DIR%'; $s.Description = '%DESC% - BASARI IT SOLUTIONS'; $s.IconLocation = '%EXE_TARGET%,0'; $s.Save()" >nul 2>&1

echo   [OK] Shortcut Desktop   : "%DESKTOP_LNK%"
echo   [OK] Shortcut Start Menu: "%MENU_LNK%"
echo   [OK] Target Executable  : "%EXE_TARGET% --edition=%KEY%"
echo   [OK] Database Mandiri   : "%APP_DIR%\pos_%KEY%.db"
exit /b 0
