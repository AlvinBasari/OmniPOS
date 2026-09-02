using System;
using System.Diagnostics;
using System.IO;
using System.IO.Compression;
using System.Linq;
using System.Reflection;
using System.Runtime.InteropServices;
using System.Text.Json;
using System.Threading.Tasks;
using Photino.NET;

namespace OmniPos.Installer;

class Program
{
    private const string AppTitle = "OmniPOS Enterprise Point of Sale";
    private const string DeveloperName = "BASARI IT SOLUTIONS";
    private const string Version = "1.0.0";
    private const string RegKeyPath = @"Software\Microsoft\Windows\CurrentVersion\Uninstall\OmniPOS_BasariITSolutions";

    private static PhotinoWindow? _window;
    private static string _targetDir = Path.Combine(
        Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData),
        "Programs",
        "BasariITSolutions",
        "OmniPOS"
    );

    [STAThread]
    static void Main(string[] args)
    {
        try
        {
            _window = new PhotinoWindow()
                .SetTitle($"{DeveloperName} - {AppTitle} Setup Wizard v{Version}")
                .SetSize(900, 680)
                .SetResizable(false)
                .Center()
                .RegisterWebMessageReceivedHandler(OnWebMessageReceived);

            _window.LoadRawString(GetInstallerHtml());
            _window.WaitForClose();
        }
        catch (Exception ex)
        {
            Console.WriteLine($"[Error] Gagal meluncurkan antarmuka grafis: {ex.Message}");
        }
    }

    private static void OnWebMessageReceived(object? sender, string message)
    {
        try
        {
            using var doc = JsonDocument.Parse(message);
            var root = doc.RootElement;
            var action = root.GetProperty("action").GetString();

            if (action == "GET_DEFAULT_CONFIG")
            {
                bool isInstalled = File.Exists(Path.Combine(_targetDir, "OmniPos.Desktop.exe"));
                string currentEdition = "retail";

                var metaFile = Path.Combine(_targetDir, "installed_edition.json");
                if (File.Exists(metaFile))
                {
                    try
                    {
                        var json = File.ReadAllText(metaFile);
                        using var metaDoc = JsonDocument.Parse(json);
                        if (metaDoc.RootElement.TryGetProperty("edition", out var edElem))
                        {
                            currentEdition = edElem.GetString() ?? "retail";
                        }
                    }
                    catch { }
                }

                var response = JsonSerializer.Serialize(new
                {
                    type = "INIT_CONFIG",
                    defaultPath = _targetDir,
                    version = Version,
                    developer = DeveloperName,
                    appTitle = AppTitle,
                    isInstalled = isInstalled,
                    currentEdition = currentEdition
                });
                _window?.SendWebMessage(response);
            }
            else if (action == "START_INSTALL" || action == "START_REPAIR")
            {
                var edition = root.GetProperty("edition").GetString() ?? "retail";
                var path = root.GetProperty("path").GetString();
                if (!string.IsNullOrWhiteSpace(path)) _targetDir = path;
                var createDesktop = root.GetProperty("desktopShortcut").GetBoolean();
                var createMenu = root.GetProperty("menuShortcut").GetBoolean();

                _ = Task.Run(async () =>
                {
                    await PerformInstallationAsync(edition, _targetDir, createDesktop, createMenu);
                });
            }
            else if (action == "START_UNINSTALL")
            {
                var keepData = root.GetProperty("keepDatabases").GetBoolean();
                _ = Task.Run(async () =>
                {
                    await PerformUninstallationAsync(_targetDir, keepData);
                });
            }
            else if (action == "LAUNCH_APP")
            {
                var edition = root.GetProperty("edition").GetString() ?? "retail";
                LaunchInstalledApp(edition, _targetDir);
                _window?.Close();
            }
            else if (action == "CLOSE_INSTALLER")
            {
                _window?.Close();
            }
        }
        catch (Exception ex)
        {
            SendProgress(0, $"Error: {ex.Message}", isError: true);
        }
    }

    private static async Task PerformInstallationAsync(string edition, string targetDir, bool createDesktop, bool createMenu)
    {
        try
        {
            // 1. Matikan proses OmniPos jika sedang berjalan
            KillRunningApp();

            Directory.CreateDirectory(targetDir);
            SendProgress(5, "Mempersiapkan direktori dan mengekstrak berkas sistem...");
            await Task.Delay(100);

            // 2. Ekstraksi Payload Zip dengan deteksi nama manifest resource yang tepat
            var assembly = Assembly.GetExecutingAssembly();
            var resName = assembly.GetManifestResourceNames()
                .FirstOrDefault(n => n.EndsWith("payload.zip", StringComparison.OrdinalIgnoreCase));

            if (resName != null)
            {
                using var stream = assembly.GetManifestResourceStream(resName);
                if (stream != null)
                {
                    using var archive = new ZipArchive(stream, ZipArchiveMode.Read);
                    int total = archive.Entries.Count;
                    int count = 0;

                    foreach (var entry in archive.Entries)
                    {
                        if (string.IsNullOrEmpty(entry.Name)) continue;
                        var destPath = Path.Combine(targetDir, entry.FullName);
                        var destDir = Path.GetDirectoryName(destPath);
                        if (!string.IsNullOrEmpty(destDir)) Directory.CreateDirectory(destDir);

                        entry.ExtractToFile(destPath, overwrite: true);
                        count++;

                        if (count % 4 == 0 || count == total)
                        {
                            int percent = 10 + (int)((double)count / total * 70);
                            SendProgress(percent, $"Mengekstrak {entry.Name} ({count}/{total})...");
                            await Task.Delay(10);
                        }
                    }
                }
            }
            else
            {
                // Fallback copy local files
                SendProgress(30, "Menyalin berkas sistem aplikasi...");
                var baseDir = AppDomain.CurrentDomain.BaseDirectory;
                CopyDirectory(baseDir, targetDir);
            }

            SendProgress(82, "Menulis metadata dan konfigurasi instalasi...");
            await Task.Delay(100);

            // Simpan metadata edisi
            var metaFile = Path.Combine(targetDir, "installed_edition.json");
            File.WriteAllText(metaFile, JsonSerializer.Serialize(new
            {
                edition = edition,
                version = Version,
                developer = DeveloperName,
                installedAt = DateTime.Now.ToString("yyyy-MM-dd HH:mm:ss")
            }));

            // 3. Buat file Uninstaller Script
            CreateUninstallerScript(targetDir);

            // 4. Daftarkan ke Windows Registry (Add/Remove Programs)
            RegisterWindowsUninstaller(targetDir);

            SendProgress(90, "Membuat shortcut desktop dan Start Menu Windows...");
            await Task.Delay(150);

            var desktopExe = Path.Combine(targetDir, "OmniPos.Desktop.exe");

            // 5. Buat Shortcut
            if (edition == "all")
            {
                CreateEditionShortcut("retail", "OmniPOS Retail & Minimarket", "Sistem Kasir Sembako & Barcode", targetDir, desktopExe, createDesktop, createMenu);
                CreateEditionShortcut("resto", "OmniPOS Resto & Kafe", "Sistem Kasir Resto, Kafe & Dapur KDS", targetDir, desktopExe, createDesktop, createMenu);
                CreateEditionShortcut("services", "OmniPOS Layanan & Barbershop", "Sistem Kasir Jasa & Komisi Staf", targetDir, desktopExe, createDesktop, createMenu);
                CreateEditionShortcut("pharmacy", "OmniPOS Apotek & Farmasi", "Sistem Kasir Obat, Resep & FEFO", targetDir, desktopExe, createDesktop, createMenu);
                CreateEditionShortcut("electronics", "OmniPOS Gadget & Elektronik", "Sistem Kasir IMEI, Garansi & Servis", targetDir, desktopExe, createDesktop, createMenu);
            }
            else
            {
                var (name, desc) = GetEditionDetails(edition);
                CreateEditionShortcut(edition, name, desc, targetDir, desktopExe, createDesktop, createMenu);
            }

            SendProgress(100, "Instalasi selesai sempurna!");
            await Task.Delay(200);

            var completeMsg = JsonSerializer.Serialize(new
            {
                type = "INSTALL_COMPLETE",
                edition = edition,
                targetDir = targetDir
            });
            _window?.SendWebMessage(completeMsg);
        }
        catch (Exception ex)
        {
            SendProgress(0, $"Gagal memasang: {ex.Message}", isError: true);
        }
    }

    private static async Task PerformUninstallationAsync(string targetDir, bool keepDatabases)
    {
        try
        {
            KillRunningApp();
            SendProgress(20, "Menghapus shortcut Desktop & Start Menu Windows...");
            await Task.Delay(200);

            // 1. Hapus Shortcut Desktop & Start Menu
            RemoveAllShortcuts();

            SendProgress(50, "Membersihkan registrasi sistem Windows...");
            await Task.Delay(200);

            // 2. Hapus Windows Registry Entry
            UnregisterWindowsUninstaller();

            SendProgress(75, "Menghapus berkas aplikasi...");
            await Task.Delay(200);

            // 3. Hapus File Aplikasi di targetDir
            if (Directory.Exists(targetDir))
            {
                foreach (var file in Directory.GetFiles(targetDir))
                {
                    var isDb = file.EndsWith(".db", StringComparison.OrdinalIgnoreCase) || 
                               file.EndsWith(".db-wal", StringComparison.OrdinalIgnoreCase) ||
                               file.EndsWith(".db-shm", StringComparison.OrdinalIgnoreCase);

                    if (isDb && keepDatabases) continue;

                    try { File.Delete(file); } catch { }
                }

                foreach (var dir in Directory.GetDirectories(targetDir))
                {
                    try { Directory.Delete(dir, true); } catch { }
                }

                // Jika tidak menyimpan database dan folder kosong, hapus foldernya
                if (!keepDatabases)
                {
                    try { Directory.Delete(targetDir, true); } catch { }
                }
            }

            SendProgress(100, "Penghapusan aplikasi berhasil diselesaikan!");
            await Task.Delay(300);

            var completeMsg = JsonSerializer.Serialize(new
            {
                type = "UNINSTALL_COMPLETE",
                targetDir = targetDir
            });
            _window?.SendWebMessage(completeMsg);
        }
        catch (Exception ex)
        {
            SendProgress(0, $"Gagal menghapus: {ex.Message}", isError: true);
        }
    }

    private static void KillRunningApp()
    {
        try
        {
            foreach (var p in Process.GetProcessesByName("OmniPos.Desktop"))
            {
                try { p.Kill(); p.WaitForExit(1500); } catch { }
            }
        }
        catch { }
    }

    private static void CreateUninstallerScript(string targetDir)
    {
        var uninstallBat = Path.Combine(targetDir, "uninstall.bat");
        var content = $@"@echo off
title Hapus Instalasi OmniPOS - {DeveloperName}
cd /d ""%~dp0""
echo ===============================================================================
echo   OMNIPOS ENTERPRISE - PENGHAPUSAN INSTALASI (UNINSTALL)
echo   Pengembang: {DeveloperName}
echo ===============================================================================
echo.
echo Menutup proses OmniPOS jika sedang berjalan...
taskkill /f /im OmniPos.Desktop.exe >nul 2>&1

echo Menghapus shortcut Desktop...
del /q ""%USERPROFILE%\Desktop\OmniPOS *.lnk"" >nul 2>&1

echo Menghapus Start Menu...
rmdir /s /q ""%APPDATA%\Microsoft\Windows\Start Menu\Programs\{DeveloperName}"" >nul 2>&1

echo Membersihkan registri Windows...
reg delete ""HKCU\{RegKeyPath}"" /f >nul 2>&1

echo.
set /p DEL_DB=""Apakah Anda ingin menghapus database transaksi (*.db) juga? (Y/N): ""
if /i ""%DEL_DB%""==""Y"" (
    echo Menghapus seluruh berkas dan database...
    cd ..
    rmdir /s /q ""%~dp0"" >nul 2>&1
) else (
    echo Menyimpan berkas database (.db). Menghapus berkas program...
    for %%F in (""%~dp0*.*"") do (
        if not ""%%~xF""=="".db"" if not ""%%~xF""=="".db-wal"" if not ""%%~xF""=="".db-shm"" (
            del /q ""%%F"" >nul 2>&1
        )
    )
    rmdir /s /q ""%~dp0wwwroot"" >nul 2>&1
)

echo.
echo [SUKSES] OmniPOS Enterprise telah berhasil dihapus dari komputer Anda.
echo.
pause
";
        File.WriteAllText(uninstallBat, content);
    }

    private static void RegisterWindowsUninstaller(string targetDir)
    {
        if (!RuntimeInformation.IsOSPlatform(OSPlatform.Windows)) return;
        try
        {
            var desktopExe = Path.Combine(targetDir, "OmniPos.Desktop.exe");
            var uninstallCmd = $"cmd.exe /c \"\"{Path.Combine(targetDir, "uninstall.bat")}\"\"";

            var psScript = $@"
$reg = 'HKCU:\{RegKeyPath}';
if (-not (Test-Path $reg)) {{ New-Item -Path $reg -Force | Out-Null }}
Set-ItemProperty -Path $reg -Name 'DisplayName' -Value '{AppTitle} - {DeveloperName}'
Set-ItemProperty -Path $reg -Name 'DisplayVersion' -Value '{Version}'
Set-ItemProperty -Path $reg -Name 'Publisher' -Value '{DeveloperName}'
Set-ItemProperty -Path $reg -Name 'InstallLocation' -Value '{targetDir.Replace("'", "''")}'
Set-ItemProperty -Path $reg -Name 'UninstallString' -Value '{uninstallCmd.Replace("'", "''")}'
Set-ItemProperty -Path $reg -Name 'DisplayIcon' -Value '{desktopExe.Replace("'", "''")},0'
Set-ItemProperty -Path $reg -Name 'NoModify' -Value 1 -Type DWord
Set-ItemProperty -Path $reg -Name 'NoRepair' -Value 0 -Type DWord
";
            var psi = new ProcessStartInfo("powershell", $"-NoProfile -ExecutionPolicy Bypass -Command \"{psScript}\"")
            {
                CreateNoWindow = true,
                UseShellExecute = false
            };
            using var p = Process.Start(psi);
            p?.WaitForExit(3000);
        }
        catch { }
    }

    private static void UnregisterWindowsUninstaller()
    {
        if (!RuntimeInformation.IsOSPlatform(OSPlatform.Windows)) return;
        try
        {
            var psi = new ProcessStartInfo("powershell", $"-NoProfile -ExecutionPolicy Bypass -Command \"Remove-Item -Path 'HKCU:\\{RegKeyPath}' -Recurse -Force -ErrorAction SilentlyContinue\"")
            {
                CreateNoWindow = true,
                UseShellExecute = false
            };
            using var p = Process.Start(psi);
            p?.WaitForExit(3000);
        }
        catch { }
    }

    private static void RemoveAllShortcuts()
    {
        try
        {
            var desktopPath = Environment.GetFolderPath(Environment.SpecialFolder.DesktopDirectory);
            string[] names = {
                "OmniPOS Retail & Minimarket.lnk",
                "OmniPOS Resto & Kafe.lnk",
                "OmniPOS Layanan & Barbershop.lnk",
                "OmniPOS Apotek & Farmasi.lnk",
                "OmniPOS Gadget & Elektronik.lnk"
            };

            foreach (var n in names)
            {
                var lnk = Path.Combine(desktopPath, n);
                if (File.Exists(lnk)) { try { File.Delete(lnk); } catch { } }
            }

            var startMenuDir = Path.Combine(
                Environment.GetFolderPath(Environment.SpecialFolder.ApplicationData),
                "Microsoft", "Windows", "Start Menu", "Programs", DeveloperName
            );
            if (Directory.Exists(startMenuDir))
            {
                try { Directory.Delete(startMenuDir, true); } catch { }
            }
        }
        catch { }
    }

    private static (string name, string desc) GetEditionDetails(string key) => key switch
    {
        "retail" => ("OmniPOS Retail & Minimarket", "Sistem Kasir Sembako & Barcode Kilat"),
        "resto" => ("OmniPOS Resto & Kafe", "Sistem Kasir F&B, Denah Meja & Dapur KDS"),
        "services" => ("OmniPOS Layanan & Barbershop", "Sistem Kasir Jasa, Antrean & Komisi Staf"),
        "pharmacy" => ("OmniPOS Apotek & Farmasi", "Sistem Kasir Obat, Resep Dokter & FEFO"),
        "electronics" => ("OmniPOS Gadget & Elektronik", "Sistem Kasir IMEI, Garansi, Servis & Trade-In"),
        _ => ("OmniPOS Retail & Minimarket", "Sistem Kasir Modern")
    };

    private static void CreateEditionShortcut(string editionKey, string displayName, string description, string targetDir, string desktopExe, bool createDesktop, bool createMenu)
    {
        var runBatPath = Path.Combine(targetDir, $"run-{editionKey}.bat");
        var batContent = $"@echo off\r\ncd /d \"%~dp0\"\r\nif exist \"%~dp0OmniPos.Desktop.exe\" (\r\n    start \"\" \"%~dp0OmniPos.Desktop.exe\" --edition={editionKey} %*\r\n) else (\r\n    echo [Error] File OmniPos.Desktop.exe tidak ditemukan di direktori instalasi.\r\n    pause\r\n)\r\n";
        File.WriteAllText(runBatPath, batContent);

        if (createDesktop)
        {
            var desktopPath = Environment.GetFolderPath(Environment.SpecialFolder.DesktopDirectory);
            var desktopLnk = Path.Combine(desktopPath, $"{displayName}.lnk");
            CreateWindowsShortcut(desktopLnk, desktopExe, $"--edition={editionKey}", targetDir, $"{description} - {DeveloperName}");
        }

        if (createMenu)
        {
            var startMenuPath = Path.Combine(
                Environment.GetFolderPath(Environment.SpecialFolder.ApplicationData),
                "Microsoft", "Windows", "Start Menu", "Programs", DeveloperName, "OmniPOS"
            );
            Directory.CreateDirectory(startMenuPath);
            var menuLnk = Path.Combine(startMenuPath, $"{displayName}.lnk");
            CreateWindowsShortcut(menuLnk, desktopExe, $"--edition={editionKey}", targetDir, $"{description} - {DeveloperName}");
        }
    }

    private static void CreateWindowsShortcut(string shortcutPath, string targetExe, string args, string workingDir, string description)
    {
        try
        {
            if (RuntimeInformation.IsOSPlatform(OSPlatform.Windows))
            {
                var escapedPath = shortcutPath.Replace("'", "''");
                var escapedTarget = targetExe.Replace("'", "''");
                var escapedArgs = args.Replace("'", "''");
                var escapedWork = workingDir.Replace("'", "''");
                var escapedDesc = description.Replace("'", "''");

                var psScript = $"$ws = New-Object -ComObject WScript.Shell; $s = $ws.CreateShortcut('{escapedPath}'); $s.TargetPath = '{escapedTarget}'; $s.Arguments = '{escapedArgs}'; $s.WorkingDirectory = '{escapedWork}'; $s.Description = '{escapedDesc}'; $s.IconLocation = '{escapedTarget},0'; $s.Save()";

                var psi = new ProcessStartInfo("powershell", $"-NoProfile -ExecutionPolicy Bypass -Command \"{psScript}\"")
                {
                    CreateNoWindow = true,
                    UseShellExecute = false
                };
                using var p = Process.Start(psi);
                p?.WaitForExit(5000);
            }
        }
        catch { }
    }

    private static void CopyDirectory(string sourceDir, string destDir)
    {
        Directory.CreateDirectory(destDir);
        foreach (var file in Directory.GetFiles(sourceDir))
        {
            var fileName = Path.GetFileName(file);
            if (fileName.Equals("OmniPOS-Setup.exe", StringComparison.OrdinalIgnoreCase)) continue;
            File.Copy(file, Path.Combine(destDir, fileName), true);
        }
        foreach (var dir in Directory.GetDirectories(sourceDir))
        {
            var dirName = Path.GetFileName(dir);
            CopyDirectory(dir, Path.Combine(destDir, dirName));
        }
    }

    private static void LaunchInstalledApp(string edition, string targetDir)
    {
        var exePath = Path.Combine(targetDir, "OmniPos.Desktop.exe");
        if (File.Exists(exePath))
        {
            var key = edition == "all" ? "retail" : edition;
            Process.Start(new ProcessStartInfo(exePath, $"--edition={key}")
            {
                WorkingDirectory = targetDir,
                UseShellExecute = true
            });
        }
    }

    private static void SendProgress(int percent, string message, bool isError = false)
    {
        var json = JsonSerializer.Serialize(new
        {
            type = "PROGRESS",
            percent = percent,
            message = message,
            isError = isError
        });
        _window?.SendWebMessage(json);
    }

    private static string GetInstallerHtml()
    {
        return @"<!DOCTYPE html>
<html lang=""id"">
<head>
  <meta charset=""UTF-8"" />
  <meta name=""viewport"" content=""width=device-width, initial-scale=1.0"" />
  <title>BASARI IT SOLUTIONS - OmniPOS Enterprise Setup Wizard</title>
  <style>
    :root {
      --bg: #0d1117;
      --card-bg: #161b22;
      --card-border: #30363d;
      --primary: #10b981;
      --primary-hover: #059669;
      --accent: #38bdf8;
      --danger: #ef4444;
      --text: #f0f6fc;
      --text-muted: #8b949e;
      --surface: #21262d;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; user-select: none; }
    body { background: var(--bg); color: var(--text); height: 100vh; display: flex; flex-direction: column; overflow: hidden; }
    
    /* Top Header */
    .header { background: linear-gradient(135deg, #1f2937, #111827); border-bottom: 1px solid var(--card-border); padding: 16px 24px; display: flex; justify-content: space-between; align-items: center; }
    .header-brand { display: flex; align-items: center; gap: 14px; }
    .header-logo { width: 40px; height: 40px; background: linear-gradient(135deg, #2563eb, #10b981); border-radius: 10px; display: flex; align-items: center; justify-content: center; font-weight: 900; font-size: 18px; color: #fff; box-shadow: 0 4px 12px rgba(37,99,235,0.3); }
    .header-title h1 { font-size: 15px; font-weight: 700; letter-spacing: -0.3px; }
    .header-title p { font-size: 11px; color: var(--text-muted); margin-top: 2px; }
    .header-badge { font-size: 10px; font-weight: 700; background: rgba(56, 189, 248, 0.15); color: #38bdf8; border: 1px solid rgba(56, 189, 248, 0.3); padding: 3px 10px; border-radius: 6px; }

    /* Stepper */
    .stepper { display: flex; justify-content: center; gap: 8px; padding: 10px 24px; background: #090d13; border-bottom: 1px solid #21262d; font-size: 12px; }
    .step-item { display: flex; align-items: center; gap: 6px; color: var(--text-muted); font-weight: 600; padding: 4px 12px; border-radius: 20px; }
    .step-item.active { color: #fff; background: #1f2937; border: 1px solid #374151; }
    .step-item.completed { color: #10b981; }

    /* Main Container */
    .content { flex: 1; padding: 20px 24px; overflow-y: auto; }
    .page { display: none; height: 100%; flex-direction: column; }
    .page.active { display: flex; }

    .section-title { font-size: 15px; font-weight: 700; margin-bottom: 4px; }
    .section-desc { font-size: 12px; color: var(--text-muted); margin-bottom: 14px; }
    
    /* Grid of Editions */
    .edition-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px; }
    .edition-card { background: var(--card-bg); border: 2px solid var(--card-border); border-radius: 10px; padding: 12px 14px; cursor: pointer; transition: all 0.15s ease; position: relative; }
    .edition-card:hover { border-color: #4b5563; background: #1c2128; transform: translateY(-1px); }
    .edition-card.selected { border-color: #10b981; background: rgba(16, 185, 129, 0.08); box-shadow: 0 0 0 1px #10b981; }
    .edition-card-header { display: flex; align-items: center; gap: 10px; margin-bottom: 6px; }
    .svg-icon { width: 22px; height: 22px; stroke: #10b981; fill: none; stroke-width: 2; stroke-linecap: round; stroke-linejoin: round; }
    .edition-name { font-size: 13px; font-weight: 700; color: #fff; }
    .edition-desc-text { font-size: 11px; color: var(--text-muted); line-height: 1.4; }
    .edition-check { position: absolute; top: 12px; right: 12px; width: 18px; height: 18px; border-radius: 50%; border: 2px solid var(--card-border); display: flex; align-items: center; justify-content: center; font-size: 10px; }
    .edition-card.selected .edition-check { background: #10b981; border-color: #10b981; color: #042f1a; font-weight: 900; }

    /* Mode Selection Cards (Maintenance) */
    .maint-grid { display: flex; flex-direction: column; gap: 12px; margin-top: 10px; }
    .maint-card { background: var(--card-bg); border: 2px solid var(--card-border); border-radius: 10px; padding: 14px 18px; cursor: pointer; display: flex; align-items: center; gap: 16px; transition: all 0.15s ease; }
    .maint-card:hover { border-color: #38bdf8; background: #1c2128; transform: translateY(-1px); }
    .maint-icon-box { width: 44px; height: 44px; border-radius: 10px; background: rgba(56, 189, 248, 0.12); display: flex; align-items: center; justify-content: center; }
    .maint-icon-box.danger { background: rgba(239, 68, 68, 0.12); }
    .maint-icon-box.danger svg { stroke: #ef4444; }
    .maint-info h3 { font-size: 14px; font-weight: 700; color: #fff; margin-bottom: 3px; }
    .maint-info p { font-size: 12px; color: var(--text-muted); }

    /* Form & Checkbox */
    .form-group { margin-bottom: 16px; }
    .form-label { font-size: 12px; font-weight: 600; margin-bottom: 6px; display: block; }
    .form-input { width: 100%; padding: 10px 14px; background: var(--surface); border: 1px solid var(--card-border); border-radius: 8px; color: #fff; font-size: 12px; outline: none; }
    .form-input:focus { border-color: #38bdf8; }
    .checkbox-item { display: flex; align-items: center; gap: 10px; margin-top: 10px; cursor: pointer; font-size: 12px; }
    .checkbox-item input { width: 16px; height: 16px; accent-color: #10b981; cursor: pointer; }

    /* Progress & Result Box */
    .center-box { display: flex; flex-direction: column; align-items: center; justify-content: center; flex: 1; text-align: center; }
    .progress-bar-container { width: 100%; max-width: 560px; height: 12px; background: #21262d; border-radius: 8px; overflow: hidden; margin: 20px 0 10px 0; border: 1px solid #30363d; }
    .progress-bar-fill { height: 100%; width: 0%; background: linear-gradient(90deg, #10b981, #38bdf8); border-radius: 8px; transition: width 0.1s linear; }
    .progress-status { font-size: 12px; color: var(--text-muted); font-family: monospace; }
    .result-icon { width: 64px; height: 64px; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin-bottom: 16px; }
    .result-icon.success { background: rgba(16, 185, 129, 0.15); border: 2px solid #10b981; color: #10b981; }
    .result-icon.danger { background: rgba(239, 68, 68, 0.15); border: 2px solid #ef4444; color: #ef4444; }

    /* Footer Buttons */
    .footer { padding: 14px 24px; background: var(--card-bg); border-top: 1px solid var(--card-border); display: flex; justify-content: space-between; align-items: center; }
    .btn { padding: 9px 18px; border-radius: 8px; font-size: 12px; font-weight: 700; cursor: pointer; transition: all 0.15s ease; border: none; outline: none; }
    .btn-secondary { background: var(--surface); color: var(--text); border: 1px solid var(--card-border); }
    .btn-secondary:hover { background: #2b313a; }
    .btn-primary { background: #10b981; color: #042f1a; font-weight: 800; box-shadow: 0 2px 8px rgba(16,185,129,0.3); }
    .btn-primary:hover { background: #059669; }
    .btn-danger { background: #ef4444; color: #fff; font-weight: 800; box-shadow: 0 2px 8px rgba(239,68,68,0.3); }
    .btn-danger:hover { background: #dc2626; }
  </style>
</head>
<body>

  <!-- Header -->
  <div class=""header"">
    <div class=""header-brand"">
      <div class=""header-logo"">OP</div>
      <div class=""header-title"">
        <h1>BASARI IT SOLUTIONS</h1>
        <p>OmniPOS Enterprise Desktop Setup Wizard v1.0.0</p>
      </div>
    </div>
    <div class=""header-badge"">Windows Native Setup</div>
  </div>

  <!-- Stepper -->
  <div class=""stepper"">
    <div id=""step-nav-1"" class=""step-item active""><span>1</span> Pilihan</div>
    <div id=""step-nav-2"" class=""step-item""><span>2</span> Konfigurasi</div>
    <div id=""step-nav-3"" class=""step-item""><span>3</span> Eksekusi</div>
    <div id=""step-nav-4"" class=""step-item""><span>4</span> Selesai</div>
  </div>

  <!-- Content -->
  <div class=""content"">

    <!-- PAGE 0: MAINTENANCE (JIKA SUDAH TERPASANG) -->
    <div id=""page-0"" class=""page"">
      <div class=""section-title"">OmniPOS Terdeteksi Sudah Terpasang</div>
      <div class=""section-desc"" id=""installedLocText"">Aplikasi OmniPOS Enterprise telah terpasang di komputer ini. Silakan pilih opsi pemeliharaan:</div>
      
      <div class=""maint-grid"">
        <div class=""maint-card"" onclick=""handleMaintenance('repair')"">
          <div class=""maint-icon-box"">
            <svg class=""svg-icon"" viewBox=""0 0 24 24""><path d=""M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67""/></svg>
          </div>
          <div class=""maint-info"">
            <h3>Perbaiki / Reinstall Berkas Sistem</h3>
            <p>Mengekstrak ulang seluruh berkas executable (.exe), pustaka DLL, aset UI, dan memperbarui shortcut.</p>
          </div>
        </div>

        <div class=""maint-card"" onclick=""handleMaintenance('change_edition')"">
          <div class=""maint-icon-box"">
            <svg class=""svg-icon"" viewBox=""0 0 24 24""><path d=""M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z""/><circle cx=""12"" cy=""12"" r=""3""/></svg>
          </div>
          <div class=""maint-info"">
            <h3>Ubah Edisi / Pasang Shortcut Tambahan</h3>
            <p>Ganti edisi aktif (Retail, Resto, Layanan, Apotek, Elektronik) atau tambahkan 5 shortcut edisi sekaligus.</p>
          </div>
        </div>

        <div class=""maint-card"" onclick=""handleMaintenance('uninstall')"">
          <div class=""maint-icon-box danger"">
            <svg class=""svg-icon"" viewBox=""0 0 24 24""><path d=""M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M10 11v6M14 11v6""/></svg>
          </div>
          <div class=""maint-info"">
            <h3 style=""color: #ef4444;"">Hapus Instalasi (Uninstall)</h3>
            <p>Menghapus seluruh berkas program, shortcut desktop, dan registrasi sistem Windows secara bersih.</p>
          </div>
        </div>
      </div>
    </div>

    <!-- PAGE 1: PILIH EDISI -->
    <div id=""page-1"" class=""page active"">
      <div class=""section-title"">Pilih Edisi Toko Anda</div>
      <div class=""section-desc"">Setiap edisi terpasang sebagai aplikasi mandiri dengan database terenkripsi terisolasi:</div>
      
      <div class=""edition-grid"">
        <!-- Retail -->
        <div class=""edition-card selected"" onclick=""selectEdition('retail', this)"">
          <div class=""edition-check"">✓</div>
          <div class=""edition-card-header"">
            <svg class=""svg-icon"" viewBox=""0 0 24 24""><circle cx=""8"" cy=""21"" r=""1""/><circle cx=""19"" cy=""21"" r=""1""/><path d=""M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12""/></svg>
            <span class=""edition-name"">Retail & Minimarket</span>
          </div>
          <p class=""edition-desc-text"">Sembako, Barcode Kilat, Timbangan Manual/Digital, Harga Grosir, Kasbon.</p>
        </div>

        <!-- Resto -->
        <div class=""edition-card"" onclick=""selectEdition('resto', this)"">
          <div class=""edition-check""></div>
          <div class=""edition-card-header"">
            <svg class=""svg-icon"" viewBox=""0 0 24 24""><path d=""M18 8h1a4 4 0 0 1 0 8h-1M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8zM6 1v3M10 1v3M14 1v3""/></svg>
            <span class=""edition-name"">Resto, Kafe & Bakery</span>
          </div>
          <p class=""edition-desc-text"">Denah Meja Visual, Layar Dapur KDS, Split Bill, Resep Bahan Baku / BOM.</p>
        </div>

        <!-- Services -->
        <div class=""edition-card"" onclick=""selectEdition('services', this)"">
          <div class=""edition-check""></div>
          <div class=""edition-card-header"">
            <svg class=""svg-icon"" viewBox=""0 0 24 24""><circle cx=""6"" cy=""6"" r=""3""/><circle cx=""6"" cy=""18"" r=""3""/><line x1=""20"" y1=""4"" x2=""8.12"" y2=""15.88""/><line x1=""14.47"" y1=""14.48"" x2=""20"" y2=""20""/><line x1=""8.12"" y1=""8.12"" x2=""12"" y2=""12""/></svg>
            <span class=""edition-name"">Layanan & Barbershop</span>
          </div>
          <p class=""edition-desc-text"">Antrean Pengerjaan, Penugasan Staf/Teknisi, Bagi Hasil & Komisi Karyawan.</p>
        </div>

        <!-- Pharmacy -->
        <div class=""edition-card"" onclick=""selectEdition('pharmacy', this)"">
          <div class=""edition-check""></div>
          <div class=""edition-card-header"">
            <svg class=""svg-icon"" viewBox=""0 0 24 24""><path d=""m10.5 20.5 10-10a4.95 4.95 0 1 0-7-7l-10 10a4.95 4.95 0 1 0 7 7Z""/><path d=""m8.5 8.5 7 7""/></svg>
            <span class=""edition-name"">Apotek & Toko Obat</span>
          </div>
          <p class=""edition-desc-text"">Peringatan Kadaluarsa FEFO, No. Batch Pabrik, Resep Dokter & SIP Apoteker.</p>
        </div>

        <!-- Electronics -->
        <div class=""edition-card"" onclick=""selectEdition('electronics', this)"">
          <div class=""edition-check""></div>
          <div class=""edition-card-header"">
            <svg class=""svg-icon"" viewBox=""0 0 24 24""><rect width=""14"" height=""20"" x=""5"" y=""2"" rx=""2"" ry=""2""/><path d=""M12 18h.01""/></svg>
            <span class=""edition-name"">Gadget & Elektronik</span>
          </div>
          <p class=""edition-desc-text"">Pelacakan IMEI, Garansi Digital, Pusat Servis SPK, Tukar Tambah (Trade-In).</p>
        </div>

        <!-- All Editions -->
        <div class=""edition-card"" onclick=""selectEdition('all', this)"">
          <div class=""edition-check""></div>
          <div class=""edition-card-header"">
            <svg class=""svg-icon"" viewBox=""0 0 24 24""><path d=""m7.5 4.27 9 5.15M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z""/><path d=""m3.3 7 8.7 5 8.7-5M12 22V12""/></svg>
            <span class=""edition-name"">Semua 5 Edisi Sekaligus</span>
          </div>
          <p class=""edition-desc-text"">Pasang 5 aplikasi sekaligus dengan 5 shortcut terpisah di Desktop.</p>
        </div>
      </div>
    </div>

    <!-- PAGE 2: LOKASI & PINTASAN -->
    <div id=""page-2"" class=""page"">
      <div class=""section-title"">Pengaturan Direktori & Pintasan</div>
      <div class=""section-desc"">Tentukan folder instalasi dan pembuatan shortcut aplikasi:</div>

      <div class=""form-group"">
        <label class=""form-label"">Folder Instalasi Aplikasi</label>
        <input type=""text"" id=""targetPathInput"" class=""form-input"" value=""..."" />
      </div>

      <div class=""form-group"" style=""background: var(--card-bg); padding: 14px; border-radius: 8px; border: 1px solid var(--card-border);"">
        <label class=""form-label"">Opsi Pintasan Sistem</label>
        <label class=""checkbox-item"">
          <input type=""checkbox"" id=""chkDesktop"" checked />
          <span>Buat Icon Shortcut di Layar Desktop Kasir</span>
        </label>
        <label class=""checkbox-item"">
          <input type=""checkbox"" id=""chkMenu"" checked />
          <span>Daftarkan ke Start Menu Windows (BASARI IT SOLUTIONS\OmniPOS)</span>
        </label>
      </div>
    </div>

    <!-- PAGE UNINSTALL CONFIRM -->
    <div id=""page-uninstall-confirm"" class=""page"">
      <div class=""section-title"" style=""color: #ef4444;"">Konfirmasi Penghapusan OmniPOS</div>
      <div class=""section-desc"">Apakah Anda yakin ingin menghapus OmniPOS Enterprise dari komputer ini?</div>

      <div class=""form-group"" style=""background: var(--card-bg); padding: 16px; border-radius: 8px; border: 1px solid var(--card-border);"">
        <p style=""font-size: 13px; margin-bottom: 12px; color: #fff;"">Tindakan ini akan menghapus berkas aplikasi dan shortcut desktop.</p>
        <label class=""checkbox-item"">
          <input type=""checkbox"" id=""chkKeepDb"" checked />
          <span>Simpan database riwayat penjualan & data toko (*.db)</span>
        </label>
      </div>
    </div>

    <!-- PAGE 3: PROSES PROGRESS -->
    <div id=""page-3"" class=""page"">
      <div class=""center-box"">
        <div class=""section-title"" id=""progressTitle"" style=""font-size: 16px;"">Memproses...</div>
        <p class=""section-desc"" id=""progressSubtitle"">Mohon tunggu sementara sistem memproses berkas.</p>
        <div class=""progress-bar-container"">
          <div id=""progressFill"" class=""progress-bar-fill""></div>
        </div>
        <div id=""progressText"" class=""progress-status"">Mempersiapkan... 0%</div>
      </div>
    </div>

    <!-- PAGE 4: SELESAI -->
    <div id=""page-4"" class=""page"">
      <div class=""center-box"">
        <div id=""resultIcon"" class=""result-icon success"">
          <svg style=""width: 32px; height: 32px; stroke: currentColor; fill: none; stroke-width: 2.5;"" viewBox=""0 0 24 24""><path d=""M20 6 9 17l-5-5""/></svg>
        </div>
        <div class=""section-title"" id=""resultTitle"" style=""font-size: 18px;"">Instalasi Selesai!</div>
        <p class=""section-desc"" id=""resultDesc"" style=""max-width: 480px; line-height: 1.5; margin-bottom: 20px;"">
          OmniPOS Enterprise siap digunakan. Pintasan aplikasi kasir telah dibuat di Desktop.
        </p>
        
        <label id=""launchBox"" class=""checkbox-item"" style=""margin-bottom: 10px;"">
          <input type=""checkbox"" id=""chkLaunchNow"" checked />
          <span style=""font-weight: 700; color: #fff;"">Langsung jalankan OmniPOS sekarang</span>
        </label>
      </div>
    </div>

  </div>

  <!-- Footer -->
  <div class=""footer"">
    <button id=""btnBack"" class=""btn btn-secondary"" onclick=""prevStep()"" style=""visibility: hidden;"">← Kembali</button>
    <div style=""display: flex; gap: 8px;"">
      <button id=""btnCancel"" class=""btn btn-secondary"" onclick=""cancelInstall()"">Batal</button>
      <button id=""btnNext"" class=""btn btn-primary"" onclick=""nextStep()"">Lanjut →</button>
    </div>
  </div>

  <script>
    let currentStep = 1;
    let selectedEdition = 'retail';
    let installPath = '';
    let isInstalled = false;
    let currentMode = 'install'; // install, repair, change_edition, uninstall

    window.onload = () => {
      if (window.external && window.external.receiveMessage) {
        window.external.receiveMessage((msg) => {
          try {
            const data = JSON.parse(msg);
            if (data.type === 'INIT_CONFIG') {
              installPath = data.defaultPath;
              isInstalled = data.isInstalled;
              document.getElementById('targetPathInput').value = installPath;

              if (isInstalled) {
                document.getElementById('installedLocText').innerText = 'OmniPOS Enterprise terpasang di: ' + installPath;
                goToPage('page-0');
                setStepperVisible(false);
              } else {
                goToPage('page-1');
                setStepperVisible(true);
              }
            } else if (data.type === 'PROGRESS') {
              document.getElementById('progressFill').style.width = data.percent + '%';
              document.getElementById('progressText').innerText = data.message + ' (' + data.percent + '%)';
            } else if (data.type === 'INSTALL_COMPLETE') {
              showSuccess('Instalasi Berhasil Diselesaikan!', 'OmniPOS Enterprise siap digunakan. Pintasan aplikasi kasir telah dibuat di Desktop dan Start Menu Windows.', true);
            } else if (data.type === 'UNINSTALL_COMPLETE') {
              showSuccess('Penghapusan Berhasil!', 'OmniPOS Enterprise telah bersih dihapus dari komputer Anda.', false);
            }
          } catch(e) {}
        });
        window.external.sendMessage(JSON.stringify({ action: 'GET_DEFAULT_CONFIG' }));
      }
    };

    function setStepperVisible(visible) {
      document.querySelector('.stepper').style.display = visible ? 'flex' : 'none';
    }

    function selectEdition(key, elem) {
      selectedEdition = key;
      document.querySelectorAll('.edition-card').forEach(c => {
        c.classList.remove('selected');
        c.querySelector('.edition-check').innerText = '';
      });
      elem.classList.add('selected');
      elem.querySelector('.edition-check').innerText = '✓';
    }

    function handleMaintenance(action) {
      if (action === 'repair') {
        currentMode = 'repair';
        startExecution('Memperbaiki OmniPOS...', 'Mengekstrak ulang berkas sistem dan memperbarui shortcut...', {
          action: 'START_REPAIR',
          edition: selectedEdition,
          path: installPath,
          desktopShortcut: true,
          menuShortcut: true
        });
      } else if (action === 'change_edition') {
        currentMode = 'change_edition';
        setStepperVisible(true);
        goToPage('page-1');
        currentStep = 1;
        updateButtons();
      } else if (action === 'uninstall') {
        currentMode = 'uninstall';
        goToPage('page-uninstall-confirm');
        document.getElementById('btnBack').style.visibility = 'visible';
        document.getElementById('btnNext').innerText = 'Hapus Sekarang 🗑️';
        document.getElementById('btnNext').className = 'btn btn-danger';
        document.getElementById('btnNext').style.display = 'block';
        document.getElementById('btnCancel').style.display = 'block';
      }
    }

    function goToPage(pageId) {
      document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
      const target = document.getElementById(pageId);
      if (target) target.classList.add('active');
    }

    function updateStepper(step) {
      for (let i = 1; i <= 4; i++) {
        const sNav = document.getElementById('step-nav-' + i);
        if (!sNav) continue;
        sNav.classList.remove('active', 'completed');
        if (i < step) sNav.classList.add('completed');
        if (i === step) sNav.classList.add('active');
      }
    }

    function updateButtons() {
      const btnBack = document.getElementById('btnBack');
      const btnNext = document.getElementById('btnNext');
      const btnCancel = document.getElementById('btnCancel');
      btnNext.className = 'btn btn-primary';

      if (currentStep === 1) {
        btnBack.style.visibility = isInstalled ? 'visible' : 'hidden';
        btnNext.innerText = 'Lanjut →';
        btnNext.style.display = 'block';
        btnCancel.style.display = 'block';
      } else if (currentStep === 2) {
        btnBack.style.visibility = 'visible';
        btnNext.innerText = 'Pasang Sekarang ⚡';
        btnNext.style.display = 'block';
        btnCancel.style.display = 'block';
      }
    }

    function startExecution(title, subtitle, payload) {
      document.getElementById('progressTitle').innerText = title;
      document.getElementById('progressSubtitle').innerText = subtitle;
      document.getElementById('progressFill').style.width = '0%';
      goToPage('page-3');
      updateStepper(3);

      document.getElementById('btnBack').style.visibility = 'hidden';
      document.getElementById('btnNext').style.display = 'none';
      document.getElementById('btnCancel').style.display = 'none';

      if (window.external && window.external.sendMessage) {
        window.external.sendMessage(JSON.stringify(payload));
      }
    }

    function showSuccess(title, desc, allowLaunch) {
      document.getElementById('resultTitle').innerText = title;
      document.getElementById('resultDesc').innerText = desc;
      document.getElementById('launchBox').style.display = allowLaunch ? 'flex' : 'none';
      
      const icon = document.getElementById('resultIcon');
      if (allowLaunch) {
        icon.className = 'result-icon success';
        icon.innerHTML = '<svg style=""width: 32px; height: 32px; stroke: currentColor; fill: none; stroke-width: 2.5;"" viewBox=""0 0 24 24""><path d=""M20 6 9 17l-5-5""/></svg>';
      } else {
        icon.className = 'result-icon danger';
        icon.innerHTML = '<svg style=""width: 32px; height: 32px; stroke: currentColor; fill: none; stroke-width: 2.5;"" viewBox=""0 0 24 24""><path d=""M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6""/></svg>';
      }

      goToPage('page-4');
      updateStepper(4);

      const btnNext = document.getElementById('btnNext');
      btnNext.innerText = 'Tutup ✓';
      btnNext.className = 'btn btn-primary';
      btnNext.style.display = 'block';
      document.getElementById('btnBack').style.visibility = 'hidden';
      document.getElementById('btnCancel').style.display = 'none';
      currentStep = 4;
    }

    function nextStep() {
      if (currentMode === 'uninstall') {
        const keepDb = document.getElementById('chkKeepDb').checked;
        startExecution('Menghapus OmniPOS Enterprise...', 'Menghapus berkas sistem, shortcut dan registrasi...', {
          action: 'START_UNINSTALL',
          keepDatabases: keepDb
        });
        return;
      }

      if (currentStep === 1) {
        currentStep = 2;
        goToPage('page-2');
        updateStepper(2);
        updateButtons();
      } else if (currentStep === 2) {
        installPath = document.getElementById('targetPathInput').value.trim();
        const chkDesktop = document.getElementById('chkDesktop').checked;
        const chkMenu = document.getElementById('chkMenu').checked;

        startExecution('Memasang OmniPOS Enterprise...', 'Mengekstrak seluruh berkas program dan membuat shortcut...', {
          action: 'START_INSTALL',
          edition: selectedEdition,
          path: installPath,
          desktopShortcut: chkDesktop,
          menuShortcut: chkMenu
        });
      } else if (currentStep === 4) {
        const launchNow = document.getElementById('chkLaunchNow').checked;
        if (launchNow && currentMode !== 'uninstall' && window.external && window.external.sendMessage) {
          window.external.sendMessage(JSON.stringify({
            action: 'LAUNCH_APP',
            edition: selectedEdition
          }));
        } else if (window.external && window.external.sendMessage) {
          window.external.sendMessage(JSON.stringify({ action: 'CLOSE_INSTALLER' }));
        }
      }
    }

    function prevStep() {
      if (currentMode === 'uninstall') {
        goToPage('page-0');
        document.getElementById('btnBack').style.visibility = 'hidden';
        document.getElementById('btnNext').style.display = 'none';
        return;
      }

      if (currentStep === 2) {
        currentStep = 1;
        goToPage('page-1');
        updateStepper(1);
        updateButtons();
      } else if (currentStep === 1 && isInstalled) {
        goToPage('page-0');
        setStepperVisible(false);
        document.getElementById('btnBack').style.visibility = 'hidden';
        document.getElementById('btnNext').style.display = 'none';
      }
    }

    function cancelInstall() {
      if (window.external && window.external.sendMessage) {
        window.external.sendMessage(JSON.stringify({ action: 'CLOSE_INSTALLER' }));
      }
    }
  </script>
</body>
</html>";
    }
}
