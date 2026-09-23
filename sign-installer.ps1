<#
.SYNOPSIS
    Script untuk menandatangani biner OmniPOS secara digital (Code Signing)
    menggunakan sertifikat digital lokal terpercaya agar tidak diblokir Windows / Antivirus.
.USAGE
    powershell -ExecutionPolicy Bypass -File .\sign-installer.ps1
#>

Param(
    [string]$ExePath = "publish\installer\OmniPOS-Setup.exe",
    [string]$CertName = "BASARI IT SOLUTIONS"
)

$ErrorActionPreference = "Stop"

Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "  OmniPOS - Windows Authenticode Code Signing Tool" -ForegroundColor Cyan
Write-Host "==========================================================" -ForegroundColor Cyan

# 1. Cari atau buat sertifikat Code Signing lokal
$cert = Get-ChildItem Cert:\CurrentUser\My -CodeSigningCert -ErrorAction SilentlyContinue | 
        Where-Object { $_.Subject -like "*$CertName*" } | 
        Select-Object -First 1

if (-not $cert) {
    Write-Host "[1/3] Membuat sertifikat digital Code Signing lokal..." -ForegroundColor Yellow
    $cert = New-SelfSignedCertificate `
        -Type CodeSigningCert `
        -Subject "CN=$CertName, O=BASARI IT SOLUTIONS, C=ID" `
        -CertStoreLocation Cert:\CurrentUser\My `
        -NotAfter (Get-Date).AddYears(10) `
        -KeyFriendlyName "OmniPOS Enterprise Code Signing"
    
    # Ekspor public certificate (.cer)
    $cerPath = Join-Path $PSScriptRoot "OmniPOS-Publisher.cer"
    Export-Certificate -Cert $cert -FilePath $cerPath | Out-Null
    
    # Daftarkan ke Trusted Root & Trusted Publisher PC lokal saat ini
    try {
        Import-Certificate -FilePath $cerPath -CertStoreLocation Cert:\LocalMachine\Root | Out-Null
        Import-Certificate -FilePath $cerPath -CertStoreLocation Cert:\LocalMachine\TrustedPublisher | Out-Null
        Write-Host "      Sertifikat berhasil didaftarkan ke Trusted Root PC ini." -ForegroundColor Green
    } catch {
        Write-Host "      (Jalankan PowerShell sebagai Administrator untuk mendaftarkan ke LocalMachine Root)" -ForegroundColor Gray
    }
} else {
    Write-Host "[1/3] Menggunakan sertifikat yang sudah ada: $($cert.Subject)" -ForegroundColor Green
}

# 2. Tandatangani biner target
$resolvedPath = Resolve-Path $ExePath -ErrorAction SilentlyContinue
if (-not $resolvedPath -or -not (Test-Path $resolvedPath)) {
    Write-Error "File biner tidak ditemukan di: $ExePath"
}

Write-Host "[2/3] Menandatangani berkas digital: $resolvedPath..." -ForegroundColor Yellow
$sig = Set-AuthenticodeSignature -FilePath $resolvedPath -Certificate $cert -TimestampServer "http://timestamp.digicert.com"

if ($sig.Status -eq "Valid") {
    Write-Host "[3/3] SELESAI! File berhasil ditandatangani secara digital (Valid)." -ForegroundColor Green
    Write-Host "      Publisher: $($sig.SignerCertificate.Subject)" -ForegroundColor White
    Write-Host "      Status:    $($sig.Status)" -ForegroundColor White
} else {
    Write-Host "[3/3] Status tanda tangan: $($sig.Status) ($($sig.StatusMessage))" -ForegroundColor Yellow
}

Write-Host "==========================================================" -ForegroundColor Cyan
