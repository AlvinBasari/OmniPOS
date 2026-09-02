; Script generated for Inno Setup 6+
; OmniPOS Desktop - Multi-Edition Standalone POS System

#define MyAppName "OmniPOS Desktop"
#define MyAppVersion "1.0.0"
#define MyAppPublisher "OmniPOS Technologies"
#define MyAppURL "https://github.com/AlvinBasari/OmniPOS"
#define MyAppExeName "OmniPos.Desktop.exe"

[Setup]
AppId={{D9A83415-8E1A-4C41-9876-081298765432}
AppName={#MyAppName}
AppVersion={#MyAppVersion}
AppPublisher={#MyAppPublisher}
AppPublisherURL={#MyAppURL}
AppSupportURL={#MyAppURL}
AppUpdatesURL={#MyAppURL}
DefaultDirName={autopf}\OmniPOS
DefaultGroupName=OmniPOS
AllowNoIcons=yes
OutputDir=publish\installer
OutputBaseFilename=OmniPOS-Setup-v{#MyAppVersion}
Compression=lzma2/ultra64
SolidCompression=yes
WizardStyle=modern
PrivilegesRequired=lowest
DisableProgramGroupPage=no

[Languages]
Name: "indonesian"; MessagesFile: "compiler:Languages\Indonesian.isl"
Name: "english"; MessagesFile: "compiler:Default.isl"

[Types]
Name: "custom"; Description: "Kustomisasi Edisi Toko"; Flags: iscustom

[Components]
Name: "retail"; Description: "🛒 OmniPOS Retail & Minimarket (Sembako, Barcode Cepat, Grosir, Kasbon)"; Types: custom; Flags: checkablealone
Name: "resto"; Description: "🍽️ OmniPOS Resto, Kafe & Bakery (Denah Meja, Layar Dapur KDS, BOM Resep)"; Types: custom; Flags: checkablealone
Name: "services"; Description: "✂️ OmniPOS Layanan, Barbershop & Laundry (Antrean, Teknisi, Komisi Staf)"; Types: custom; Flags: checkablealone
Name: "pharmacy"; Description: "💊 OmniPOS Apotek & Toko Obat (Peringatan FEFO, No. Batch Pabrik, Resep Dokter)"; Types: custom; Flags: checkablealone
Name: "electronics"; Description: "📱 OmniPOS Gadget, Elektronik & IMEI (Pelacakan IMEI, Garansi, Tukar Tambah, SPK)"; Types: custom; Flags: checkablealone

[Tasks]
Name: "desktopicon"; Description: "{cm:CreateDesktopIcon}"; GroupDescription: "{cm:AdditionalIcons}"

[Files]
Source: "publish\win-x64\*"; DestDir: "{app}"; Flags: ignoreversion recursesubdirs createallsubdirs

[Icons]
; Retail Icons
Name: "{group}\OmniPOS Retail & Minimarket"; Filename: "{app}\{#MyAppExeName}"; Parameters: "--edition=retail"; WorkingDir: "{app}"; Components: retail
Name: "{autodesktop}\OmniPOS Retail & Minimarket"; Filename: "{app}\{#MyAppExeName}"; Parameters: "--edition=retail"; WorkingDir: "{app}"; Tasks: desktopicon; Components: retail

; Resto Icons
Name: "{group}\OmniPOS Resto & Kafe (F&B)"; Filename: "{app}\{#MyAppExeName}"; Parameters: "--edition=resto"; WorkingDir: "{app}"; Components: resto
Name: "{autodesktop}\OmniPOS Resto & Kafe (F&B)"; Filename: "{app}\{#MyAppExeName}"; Parameters: "--edition=resto"; WorkingDir: "{app}"; Tasks: desktopicon; Components: resto

; Services Icons
Name: "{group}\OmniPOS Layanan & Barbershop"; Filename: "{app}\{#MyAppExeName}"; Parameters: "--edition=services"; WorkingDir: "{app}"; Components: services
Name: "{autodesktop}\OmniPOS Layanan & Barbershop"; Filename: "{app}\{#MyAppExeName}"; Parameters: "--edition=services"; WorkingDir: "{app}"; Tasks: desktopicon; Components: services

; Pharmacy Icons
Name: "{group}\OmniPOS Apotek & Toko Obat"; Filename: "{app}\{#MyAppExeName}"; Parameters: "--edition=pharmacy"; WorkingDir: "{app}"; Components: pharmacy
Name: "{autodesktop}\OmniPOS Apotek & Toko Obat"; Filename: "{app}\{#MyAppExeName}"; Parameters: "--edition=pharmacy"; WorkingDir: "{app}"; Tasks: desktopicon; Components: pharmacy

; Electronics Icons
Name: "{group}\OmniPOS Gadget & Elektronik (IMEI)"; Filename: "{app}\{#MyAppExeName}"; Parameters: "--edition=electronics"; WorkingDir: "{app}"; Components: electronics
Name: "{autodesktop}\OmniPOS Gadget & Elektronik (IMEI)"; Filename: "{app}\{#MyAppExeName}"; Parameters: "--edition=electronics"; WorkingDir: "{app}"; Tasks: desktopicon; Components: electronics

; Global Uninstaller
Name: "{group}\{cm:UninstallProgram,{#MyAppName}}"; Filename: "{uninstallexe}"

[Run]
Filename: "{app}\{#MyAppExeName}"; Parameters: "--edition=retail"; Description: "Jalankan OmniPOS Retail sekarang"; Flags: nowait postinstall skipifsilent; Components: retail
Filename: "{app}\{#MyAppExeName}"; Parameters: "--edition=electronics"; Description: "Jalankan OmniPOS Elektronik sekarang"; Flags: nowait postinstall skipifsilent; Components: electronics and not retail
