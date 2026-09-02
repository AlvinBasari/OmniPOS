; ==============================================================================
; Inno Setup Script: OmniPOS Enterprise Desktop Installer
; Developer / Publisher: BASARI IT SOLUTIONS (Indonesia)
; Website: https://github.com/AlvinBasari/OmniPOS
; Target OS: Microsoft Windows 10 / 11 (64-bit)
; ==============================================================================

#define MyAppName "OmniPOS Enterprise"
#define MyAppVersion "1.0.0"
#define MyAppPublisher "BASARI IT SOLUTIONS"
#define MyAppPublisherURL "https://github.com/AlvinBasari/OmniPOS"
#define MyAppSupportURL "https://github.com/AlvinBasari/OmniPOS/issues"
#define MyAppUpdatesURL "https://github.com/AlvinBasari/OmniPOS/releases"
#define MyAppExeName "OmniPos.Desktop.exe"
#define MyAppCopyright "Copyright (C) 2026 BASARI IT SOLUTIONS. All rights reserved."

[Setup]
AppId={{D9A83415-8E1A-4C41-9876-081298765432}
AppName={#MyAppName}
AppVersion={#MyAppVersion}
AppVerName={#MyAppName} v{#MyAppVersion} (by {#MyAppPublisher})
AppPublisher={#MyAppPublisher}
AppPublisherURL={#MyAppPublisherURL}
AppSupportURL={#MyAppSupportURL}
AppUpdatesURL={#MyAppUpdatesURL}
AppCopyright={#MyAppCopyright}
DefaultDirName={autopf}\BasariITSolutions\OmniPOS
DefaultGroupName=BASARI IT SOLUTIONS\OmniPOS
AllowNoIcons=yes
OutputDir=publish\installer
OutputBaseFilename=OmniPOS-Enterprise-Setup-v{#MyAppVersion}
Compression=lzma2/ultra64
SolidCompression=yes
WizardStyle=modern
WizardSizePercent=105
PrivilegesRequired=lowest
DisableProgramGroupPage=no
VersionInfoVersion={#MyAppVersion}
VersionInfoCompany={#MyAppPublisher}
VersionInfoDescription=OmniPOS Enterprise Point of Sale System
VersionInfoCopyright={#MyAppCopyright}
VersionInfoProductName={#MyAppName}

[Languages]
Name: "indonesian"; MessagesFile: "compiler:Languages\Indonesian.isl"
Name: "english"; MessagesFile: "compiler:Default.isl"

[Types]
Name: "custom"; Description: "Pilih Edisi Toko Sesuai Jenis Usaha Anda"; Flags: iscustom
Name: "retail"; Description: "Instalasi Standar: Edisi Retail & Minimarket"
Name: "all"; Description: "Instalasi Lengkap: Semua 5 Edisi Toko"

[Components]
Name: "retail"; Description: "🛒 OmniPOS Retail & Minimarket (Sembako, Barcode Cepat, Grosir, Kasbon)"; Types: custom retail all; Flags: checkablealone
Name: "resto"; Description: "🍽️ OmniPOS Resto, Kafe & Bakery (Denah Meja, Layar Dapur KDS, BOM Resep)"; Types: custom all; Flags: checkablealone
Name: "services"; Description: "✂️ OmniPOS Layanan, Barbershop & Laundry (Antrean, Teknisi, Komisi Karyawan)"; Types: custom all; Flags: checkablealone
Name: "pharmacy"; Description: "💊 OmniPOS Apotek & Toko Obat (Peringatan Kadaluarsa FEFO, No. Batch Pabrik, Resep Dokter)"; Types: custom all; Flags: checkablealone
Name: "electronics"; Description: "📱 OmniPOS Gadget, Elektronik & IMEI (Pelacakan IMEI, Garansi, Servis SPK, Tukar Tambah)"; Types: custom all; Flags: checkablealone

[Tasks]
Name: "desktopicon"; Description: "{cm:CreateDesktopIcon}"; GroupDescription: "{cm:AdditionalIcons}"; Flags: checkedonce

[Files]
Source: "publish\win-x64\*"; DestDir: "{app}"; Flags: ignoreversion recursesubdirs createallsubdirs

[Icons]
; Retail Icons
Name: "{group}\OmniPOS Retail & Minimarket"; Filename: "{app}\{#MyAppExeName}"; Parameters: "--edition=retail"; WorkingDir: "{app}"; Comment: "Sistem Kasir Retail, Sembako & Minimarket - BASARI IT SOLUTIONS"; Components: retail
Name: "{autodesktop}\OmniPOS Retail & Minimarket"; Filename: "{app}\{#MyAppExeName}"; Parameters: "--edition=retail"; WorkingDir: "{app}"; Comment: "Sistem Kasir Retail, Sembako & Minimarket - BASARI IT SOLUTIONS"; Tasks: desktopicon; Components: retail

; Resto Icons
Name: "{group}\OmniPOS Resto & Kafe (F&B)"; Filename: "{app}\{#MyAppExeName}"; Parameters: "--edition=resto"; WorkingDir: "{app}"; Comment: "Sistem Kasir Resto, Kafe & Bakery - BASARI IT SOLUTIONS"; Components: resto
Name: "{autodesktop}\OmniPOS Resto & Kafe (F&B)"; Filename: "{app}\{#MyAppExeName}"; Parameters: "--edition=resto"; WorkingDir: "{app}"; Comment: "Sistem Kasir Resto, Kafe & Bakery - BASARI IT SOLUTIONS"; Tasks: desktopicon; Components: resto

; Services Icons
Name: "{group}\OmniPOS Layanan & Barbershop"; Filename: "{app}\{#MyAppExeName}"; Parameters: "--edition=services"; WorkingDir: "{app}"; Comment: "Sistem Kasir Layanan & Barbershop - BASARI IT SOLUTIONS"; Components: services
Name: "{autodesktop}\OmniPOS Layanan & Barbershop"; Filename: "{app}\{#MyAppExeName}"; Parameters: "--edition=services"; WorkingDir: "{app}"; Comment: "Sistem Kasir Layanan & Barbershop - BASARI IT SOLUTIONS"; Tasks: desktopicon; Components: services

; Pharmacy Icons
Name: "{group}\OmniPOS Apotek & Toko Obat"; Filename: "{app}\{#MyAppExeName}"; Parameters: "--edition=pharmacy"; WorkingDir: "{app}"; Comment: "Sistem Kasir Apotek & Farmasi - BASARI IT SOLUTIONS"; Components: pharmacy
Name: "{autodesktop}\OmniPOS Apotek & Toko Obat"; Filename: "{app}\{#MyAppExeName}"; Parameters: "--edition=pharmacy"; WorkingDir: "{app}"; Comment: "Sistem Kasir Apotek & Farmasi - BASARI IT SOLUTIONS"; Tasks: desktopicon; Components: pharmacy

; Electronics Icons
Name: "{group}\OmniPOS Gadget & Elektronik (IMEI)"; Filename: "{app}\{#MyAppExeName}"; Parameters: "--edition=electronics"; WorkingDir: "{app}"; Comment: "Sistem Kasir Gadget & Elektronik - BASARI IT SOLUTIONS"; Components: electronics
Name: "{autodesktop}\OmniPOS Gadget & Elektronik (IMEI)"; Filename: "{app}\{#MyAppExeName}"; Parameters: "--edition=electronics"; WorkingDir: "{app}"; Comment: "Sistem Kasir Gadget & Elektronik - BASARI IT SOLUTIONS"; Tasks: desktopicon; Components: electronics

; Global Uninstaller
Name: "{group}\{cm:UninstallProgram,{#MyAppName}}"; Filename: "{uninstallexe}"

[Run]
Filename: "{app}\{#MyAppExeName}"; Parameters: "--edition=retail"; Description: "Jalankan OmniPOS Retail sekarang"; Flags: nowait postinstall skipifsilent; Components: retail
Filename: "{app}\{#MyAppExeName}"; Parameters: "--edition=electronics"; Description: "Jalankan OmniPOS Elektronik sekarang"; Flags: nowait postinstall skipifsilent; Components: electronics and not retail
Filename: "{app}\{#MyAppExeName}"; Parameters: "--edition=resto"; Description: "Jalankan OmniPOS Resto sekarang"; Flags: nowait postinstall skipifsilent; Components: resto and not retail and not electronics
