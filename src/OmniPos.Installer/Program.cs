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
                .SetSize(920, 690)
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
                string currentLaunchMode = "desktop";

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
                        if (metaDoc.RootElement.TryGetProperty("launchMode", out var lmElem))
                        {
                            currentLaunchMode = lmElem.GetString() ?? "desktop";
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
                    currentEdition = currentEdition,
                    currentLaunchMode = currentLaunchMode
                });
                _window?.SendWebMessage(response);
            }
            else if (action == "BROWSE_INSTALL_DIR")
            {
                var cur = root.TryGetProperty("currentPath", out var cp) ? cp.GetString() ?? _targetDir : _targetDir;
                var chosen = ShowFolderBrowserDialog(cur);
                if (!string.IsNullOrEmpty(chosen))
                {
                    var resp = JsonSerializer.Serialize(new
                    {
                        type = "INSTALL_DIR_SELECTED",
                        path = chosen
                    });
                    _window?.SendWebMessage(resp);
                }
            }
            else if (action == "BROWSE_BACKUP_FILE")
            {
                var chosen = ShowOpenFileDialog();
                if (!string.IsNullOrEmpty(chosen) && File.Exists(chosen))
                {
                    var fi = new FileInfo(chosen);
                    var resp = JsonSerializer.Serialize(new
                    {
                        type = "BACKUP_FILE_SELECTED",
                        path = chosen,
                        fileName = fi.Name,
                        fileSize = fi.Length
                    });
                    _window?.SendWebMessage(resp);
                }
            }
            else if (action == "START_INSTALL" || action == "START_REPAIR")
            {
                var edition = root.TryGetProperty("edition", out var edElem) ? edElem.GetString() ?? "retail" : "retail";
                var path = root.TryGetProperty("path", out var pathElem) ? pathElem.GetString() : null;
                if (!string.IsNullOrWhiteSpace(path)) _targetDir = path;
                var launchMode = root.TryGetProperty("launchMode", out var lmElem) ? lmElem.GetString() ?? "desktop" : "desktop";
                var restoreBackupPath = root.TryGetProperty("restoreBackupPath", out var rbpElem) ? rbpElem.GetString() : null;
                var createDesktop = root.TryGetProperty("desktopShortcut", out var dsElem) && dsElem.GetBoolean();
                var createMenu = root.TryGetProperty("menuShortcut", out var msElem) && msElem.GetBoolean();

                _ = Task.Run(async () =>
                {
                    await PerformInstallationAsync(edition, _targetDir, launchMode, restoreBackupPath, createDesktop, createMenu);
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
                var edition = root.TryGetProperty("edition", out var edElem) ? edElem.GetString() ?? "retail" : "retail";
                var launchMode = root.TryGetProperty("launchMode", out var lmElem) ? lmElem.GetString() ?? "desktop" : "desktop";
                LaunchInstalledApp(edition, _targetDir, launchMode);
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

    private static string? ShowFolderBrowserDialog(string initialPath)
    {
        try
        {
            if (RuntimeInformation.IsOSPlatform(OSPlatform.Windows))
            {
                var psScript = $@"
Add-Type -AssemblyName System.Windows.Forms
$f = New-Object System.Windows.Forms.FolderBrowserDialog
$f.Description = 'Pilih Folder Direktori Instalasi OmniPOS'
$f.SelectedPath = '{initialPath.Replace("'", "''")}'
$f.ShowNewFolderButton = $true
if ($f.ShowDialog() -eq [System.Windows.Forms.DialogResult]::OK) {{
    Write-Output $f.SelectedPath
}}
";
                var psi = new ProcessStartInfo("powershell", $"-NoProfile -ExecutionPolicy Bypass -Command \"{psScript}\"")
                {
                    CreateNoWindow = true,
                    UseShellExecute = false,
                    RedirectStandardOutput = true
                };
                using var p = Process.Start(psi);
                if (p != null)
                {
                    var output = p.StandardOutput.ReadToEnd().Trim();
                    p.WaitForExit(30000);
                    if (!string.IsNullOrEmpty(output)) return output;
                }
            }
        }
        catch { }
        return null;
    }

    private static string? ShowOpenFileDialog()
    {
        try
        {
            if (RuntimeInformation.IsOSPlatform(OSPlatform.Windows))
            {
                var psScript = @"
Add-Type -AssemblyName System.Windows.Forms
$f = New-Object System.Windows.Forms.OpenFileDialog
$f.Title = 'Pilih Berkas Cadangan Basis Data OmniPOS (.db / .sqlite / .bak)'
$f.Filter = 'SQLite Database (*.db;*.sqlite;*.bak)|*.db;*.sqlite;*.bak|Semua Berkas (*.*)|*.*'
$f.CheckFileExists = $true
if ($f.ShowDialog() -eq [System.Windows.Forms.DialogResult]::OK) {
    Write-Output $f.FileName
}
";
                var psi = new ProcessStartInfo("powershell", $"-NoProfile -ExecutionPolicy Bypass -Command \"{psScript}\"")
                {
                    CreateNoWindow = true,
                    UseShellExecute = false,
                    RedirectStandardOutput = true
                };
                using var p = Process.Start(psi);
                if (p != null)
                {
                    var output = p.StandardOutput.ReadToEnd().Trim();
                    p.WaitForExit(30000);
                    if (!string.IsNullOrEmpty(output) && File.Exists(output))
                    {
                        return output;
                    }
                }
            }
        }
        catch { }
        return null;
    }

    private static async Task PerformInstallationAsync(
        string edition, 
        string targetDir, 
        string launchMode, 
        string? restoreBackupPath, 
        bool createDesktop, 
        bool createMenu)
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
                            int percent = 10 + (int)((double)count / total * 65);
                            SendProgress(percent, $"Mengekstrak berkas program: {entry.Name} ({count}/{total})...");
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

            // 3. Pulihkan Basis Data dari Cadangan jika ditentukan pengguna (Disaster Recovery)
            bool restoredFromBackup = false;
            if (!string.IsNullOrWhiteSpace(restoreBackupPath) && File.Exists(restoreBackupPath))
            {
                SendProgress(78, $"Memulihkan basis data dari cadangan: {Path.GetFileName(restoreBackupPath)}...");
                await Task.Delay(150);

                try
                {
                    var editionsToRestore = edition == "all"
                        ? new[] { "retail", "resto", "services", "pharmacy", "electronics" }
                        : new[] { edition };

                    // Salin ke direktori target program
                    foreach (var ed in editionsToRestore)
                    {
                        var destDb = Path.Combine(targetDir, $"pos_{ed}.db");
                        File.Copy(restoreBackupPath, destDb, overwrite: true);

                        var wal = Path.Combine(targetDir, $"pos_{ed}.db-wal");
                        var shm = Path.Combine(targetDir, $"pos_{ed}.db-shm");
                        if (File.Exists(wal)) try { File.Delete(wal); } catch { }
                        if (File.Exists(shm)) try { File.Delete(shm); } catch { }
                    }

                    // Sinkronkan juga ke %LOCALAPPDATA%\BasariITSolutions\OmniPOS\data\ untuk redundansi fallback
                    var appDataDir = Path.Combine(
                        Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData),
                        "BasariITSolutions",
                        "OmniPOS",
                        "data"
                    );
                    Directory.CreateDirectory(appDataDir);

                    foreach (var ed in editionsToRestore)
                    {
                        var appDataDb = Path.Combine(appDataDir, $"pos_{ed}.db");
                        File.Copy(restoreBackupPath, appDataDb, overwrite: true);

                        var wal = Path.Combine(appDataDir, $"pos_{ed}.db-wal");
                        var shm = Path.Combine(appDataDir, $"pos_{ed}.db-shm");
                        if (File.Exists(wal)) try { File.Delete(wal); } catch { }
                        if (File.Exists(shm)) try { File.Delete(shm); } catch { }
                    }

                    restoredFromBackup = true;
                }
                catch (Exception ex)
                {
                    Console.WriteLine($"[Peringatan] Gagal memulihkan database cadangan: {ex.Message}");
                }
            }

            SendProgress(85, "Menulis metadata konfigurasi dan mode peluncuran...");
            await Task.Delay(100);

            // Simpan metadata instalasi lengkap
            var metaFile = Path.Combine(targetDir, "installed_edition.json");
            File.WriteAllText(metaFile, JsonSerializer.Serialize(new
            {
                edition = edition,
                launchMode = launchMode,
                restoredFromBackup = restoredFromBackup,
                version = Version,
                developer = DeveloperName,
                installedAt = DateTime.Now.ToString("yyyy-MM-dd HH:mm:ss")
            }));

            // 4. Buat file Uninstaller Script
            CreateUninstallerScript(targetDir);

            // 5. Daftarkan ke Windows Registry (Add/Remove Programs)
            RegisterWindowsUninstaller(targetDir);

            SendProgress(92, "Membuat pintasan terpadu di Desktop dan Start Menu...");
            await Task.Delay(150);

            var desktopExe = Path.Combine(targetDir, "OmniPos.Desktop.exe");

            // 6. Buat Shortcut Tunggal Sesuai Mode Peluncuran yang Dipilih Pengguna
            if (edition == "all")
            {
                CreateEditionShortcut("retail", "OmniPOS Retail & Minimarket", "Sistem Kasir Sembako & Barcode", targetDir, desktopExe, launchMode, createDesktop, createMenu);
                CreateEditionShortcut("resto", "OmniPOS Resto & Kafe", "Sistem Kasir Resto, Kafe & Dapur KDS", targetDir, desktopExe, launchMode, createDesktop, createMenu);
                CreateEditionShortcut("services", "OmniPOS Layanan & Barbershop", "Sistem Kasir Jasa & Komisi Staf", targetDir, desktopExe, launchMode, createDesktop, createMenu);
                CreateEditionShortcut("pharmacy", "OmniPOS Apotek & Farmasi", "Sistem Kasir Obat, Resep & FEFO", targetDir, desktopExe, launchMode, createDesktop, createMenu);
                CreateEditionShortcut("electronics", "OmniPOS Gadget & Elektronik", "Sistem Kasir IMEI, Garansi & Servis", targetDir, desktopExe, launchMode, createDesktop, createMenu);
            }
            else
            {
                var (name, desc) = GetEditionDetails(edition);
                CreateEditionShortcut(edition, name, desc, targetDir, desktopExe, launchMode, createDesktop, createMenu);
            }

            SendProgress(100, "Instalasi berhasil diselesaikan!");
            await Task.Delay(200);

            var completeMsg = JsonSerializer.Serialize(new
            {
                type = "INSTALL_COMPLETE",
                edition = edition,
                launchMode = launchMode,
                restoredFromBackup = restoredFromBackup,
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
                "OmniPOS Gadget & Elektronik.lnk",
                "OmniPOS Kasir (Mode Browser).lnk"
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

    private static void CreateEditionShortcut(
        string editionKey, 
        string displayName, 
        string description, 
        string targetDir, 
        string desktopExe, 
        string launchMode, 
        bool createDesktop, 
        bool createMenu)
    {
        var isBrowser = string.Equals(launchMode, "browser", StringComparison.OrdinalIgnoreCase);
        var args = isBrowser ? $"--browser --edition={editionKey}" : $"--edition={editionKey}";

        // Script batch peluncur edisi
        var runBatPath = Path.Combine(targetDir, $"run-{editionKey}.bat");
        var batContent = $"@echo off\r\ncd /d \"%~dp0\"\r\nif exist \"%~dp0OmniPos.Desktop.exe\" (\r\n    start \"\" \"%~dp0OmniPos.Desktop.exe\" {args} %*\r\n) else (\r\n    echo [Error] File OmniPos.Desktop.exe tidak ditemukan di direktori instalasi.\r\n    pause\r\n)\r\n";
        File.WriteAllText(runBatPath, batContent);

        var runBrowserBatPath = Path.Combine(targetDir, "run-browser.bat");
        var browserBatContent = $"@echo off\r\ncd /d \"%~dp0\"\r\nif exist \"%~dp0OmniPos.Desktop.exe\" (\r\n    start \"\" \"%~dp0OmniPos.Desktop.exe\" --browser --edition={editionKey} %*\r\n) else (\r\n    echo [Error] File OmniPos.Desktop.exe tidak ditemukan.\r\n    pause\r\n)\r\n";
        File.WriteAllText(runBrowserBatPath, browserBatContent);

        // Shortcut Desktop: HANYA SATU SHORTCUT SESUAI MODE
        if (createDesktop)
        {
            var desktopPath = Environment.GetFolderPath(Environment.SpecialFolder.DesktopDirectory);
            var desktopLnk = Path.Combine(desktopPath, $"{displayName}.lnk");
            CreateWindowsShortcut(desktopLnk, desktopExe, args, targetDir, $"{description} - {DeveloperName}");
        }

        // Start Menu
        if (createMenu)
        {
            var startMenuPath = Path.Combine(
                Environment.GetFolderPath(Environment.SpecialFolder.ApplicationData),
                "Microsoft", "Windows", "Start Menu", "Programs", DeveloperName, "OmniPOS"
            );
            Directory.CreateDirectory(startMenuPath);
            var menuLnk = Path.Combine(startMenuPath, $"{displayName}.lnk");
            CreateWindowsShortcut(menuLnk, desktopExe, args, targetDir, $"{description} - {DeveloperName}");
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

    private static void LaunchInstalledApp(string edition, string targetDir, string launchMode)
    {
        var exePath = Path.Combine(targetDir, "OmniPos.Desktop.exe");
        if (File.Exists(exePath))
        {
            var key = edition == "all" ? "retail" : edition;
            var isBrowser = string.Equals(launchMode, "browser", StringComparison.OrdinalIgnoreCase);
            var args = isBrowser ? $"--browser --edition={key}" : $"--edition={key}";

            Process.Start(new ProcessStartInfo(exePath, args)
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
      --bg: #0c1017;
      --card-bg: #141b26;
      --card-hover: #1b2433;
      --card-border: #222d3d;
      --card-selected-border: #10b981;
      --card-selected-bg: rgba(16, 185, 129, 0.08);
      --primary: #10b981;
      --primary-hover: #059669;
      --accent: #38bdf8;
      --danger: #ef4444;
      --danger-hover: #dc2626;
      --text: #f1f5f9;
      --text-muted: #8b99ad;
      --surface: #18202d;
      --border-subtle: #1e2736;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; user-select: none; }
    body { background: var(--bg); color: var(--text); height: 100vh; display: flex; flex-direction: column; overflow: hidden; }

    /* Top Brand Header */
    .header {
      background: #111722;
      border-bottom: 1px solid var(--border-subtle);
      padding: 16px 28px;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .header-brand { display: flex; align-items: center; gap: 14px; }
    .header-logo {
      width: 40px;
      height: 40px;
      background: #10b981;
      border-radius: 10px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 900;
      font-size: 17px;
      color: #042f1a;
      letter-spacing: -0.5px;
    }
    .header-title h1 { font-size: 15px; font-weight: 700; letter-spacing: -0.2px; color: #fff; }
    .header-title p { font-size: 11px; color: var(--text-muted); margin-top: 2px; }
    .header-badge {
      font-size: 10px;
      font-weight: 700;
      background: rgba(16, 185, 129, 0.1);
      color: #10b981;
      border: 1px solid rgba(16, 185, 129, 0.3);
      padding: 4px 10px;
      border-radius: 6px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    /* 5-Step Stepper */
    .stepper {
      display: flex;
      justify-content: space-between;
      padding: 10px 28px;
      background: #090d14;
      border-bottom: 1px solid var(--border-subtle);
      font-size: 11px;
    }
    .step-item {
      display: flex;
      align-items: center;
      gap: 8px;
      color: var(--text-muted);
      font-weight: 600;
      padding: 5px 10px;
      border-radius: 6px;
      transition: all 0.15s ease;
    }
    .step-badge {
      width: 20px;
      height: 20px;
      border-radius: 50%;
      background: var(--surface);
      border: 1px solid var(--card-border);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 10px;
      font-weight: 800;
      color: var(--text-muted);
    }
    .step-item.active {
      color: #fff;
    }
    .step-item.active .step-badge {
      background: #10b981;
      border-color: #10b981;
      color: #042f1a;
    }
    .step-item.completed {
      color: #10b981;
    }
    .step-item.completed .step-badge {
      background: rgba(16, 185, 129, 0.15);
      border-color: #10b981;
      color: #10b981;
    }

    /* Content Area */
    .content { flex: 1; padding: 22px 28px; overflow-y: auto; }
    .page { display: none; height: 100%; flex-direction: column; }
    .page.active { display: flex; }

    .section-title { font-size: 16px; font-weight: 700; margin-bottom: 4px; color: #fff; }
    .section-desc { font-size: 12px; color: var(--text-muted); margin-bottom: 16px; line-height: 1.5; }

    /* Interactive Radio Cards */
    .cards-grid { display: grid; gap: 12px; }
    .cards-grid-2 { grid-template-columns: repeat(2, 1fr); }
    .cards-grid-3 { grid-template-columns: repeat(3, 1fr); }

    .selectable-card {
      background: var(--card-bg);
      border: 1.5px solid var(--card-border);
      border-radius: 10px;
      padding: 16px;
      cursor: pointer;
      transition: all 0.15s ease;
      position: relative;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
    }
    .selectable-card:hover {
      border-color: #3b495e;
      background: var(--card-hover);
    }
    .selectable-card.selected {
      border-color: var(--card-selected-border);
      background: var(--card-selected-bg);
      box-shadow: 0 0 0 1px #10b981;
    }
    .card-radio-indicator {
      position: absolute;
      top: 14px;
      right: 14px;
      width: 18px;
      height: 18px;
      border-radius: 50%;
      border: 2px solid #3b495e;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .selectable-card.selected .card-radio-indicator {
      border-color: #10b981;
      background: #10b981;
    }
    .selectable-card.selected .card-radio-indicator::after {
      content: '';
      width: 6px;
      height: 6px;
      border-radius: 50%;
      background: #042f1a;
    }

    .card-icon-box {
      width: 38px;
      height: 38px;
      border-radius: 8px;
      background: rgba(16, 185, 129, 0.1);
      display: flex;
      align-items: center;
      justify-content: center;
      margin-bottom: 12px;
    }
    .card-icon-box svg {
      width: 20px;
      height: 20px;
      stroke: #10b981;
      fill: none;
      stroke-width: 2;
      stroke-linecap: round;
      stroke-linejoin: round;
    }
    .card-title { font-size: 13px; font-weight: 700; color: #fff; margin-bottom: 4px; display: flex; align-items: center; gap: 8px; }
    .card-desc { font-size: 11px; color: var(--text-muted); line-height: 1.45; }
    .card-badge {
      font-size: 9px;
      font-weight: 800;
      background: rgba(56, 189, 248, 0.15);
      color: #38bdf8;
      border: 1px solid rgba(56, 189, 248, 0.3);
      padding: 1px 6px;
      border-radius: 4px;
      text-transform: uppercase;
    }

    /* Forms */
    .form-group { margin-bottom: 16px; }
    .form-label { font-size: 12px; font-weight: 600; margin-bottom: 6px; display: block; color: #e2e8f0; }
    .input-row { display: flex; gap: 8px; }
    .form-input {
      flex: 1;
      padding: 10px 14px;
      background: var(--surface);
      border: 1px solid var(--card-border);
      border-radius: 8px;
      color: #fff;
      font-size: 12px;
      outline: none;
      transition: border-color 0.15s ease;
    }
    .form-input:focus { border-color: #10b981; }
    .checkbox-item {
      display: flex;
      align-items: center;
      gap: 10px;
      margin-top: 10px;
      cursor: pointer;
      font-size: 12px;
      color: #e2e8f0;
    }
    .checkbox-item input { width: 16px; height: 16px; accent-color: #10b981; cursor: pointer; }

    /* File Chooser Box */
    .file-picker-box {
      border: 2px dashed var(--card-border);
      border-radius: 10px;
      padding: 20px;
      text-align: center;
      background: var(--surface);
      cursor: pointer;
      transition: all 0.15s ease;
      margin-top: 12px;
    }
    .file-picker-box:hover {
      border-color: #10b981;
      background: rgba(16, 185, 129, 0.03);
    }
    .file-picker-box svg {
      width: 32px;
      height: 32px;
      stroke: #10b981;
      fill: none;
      stroke-width: 2;
      stroke-linecap: round;
      stroke-linejoin: round;
      margin-bottom: 8px;
    }

    /* Progress & Results */
    .center-box {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      flex: 1;
      text-align: center;
    }
    .progress-bar-container {
      width: 100%;
      max-width: 580px;
      height: 10px;
      background: var(--surface);
      border-radius: 6px;
      overflow: hidden;
      margin: 22px 0 10px 0;
      border: 1px solid var(--card-border);
    }
    .progress-bar-fill {
      height: 100%;
      width: 0%;
      background: #10b981;
      border-radius: 6px;
      transition: width 0.1s linear;
    }
    .progress-status { font-size: 12px; color: var(--text-muted); font-family: monospace; }
    .result-icon {
      width: 60px;
      height: 60px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      margin-bottom: 16px;
    }
    .result-icon.success {
      background: rgba(16, 185, 129, 0.12);
      border: 2px solid #10b981;
      color: #10b981;
    }
    .result-icon.danger {
      background: rgba(239, 68, 68, 0.12);
      border: 2px solid #ef4444;
      color: #ef4444;
    }

    /* Summary Spec Table */
    .spec-table {
      width: 100%;
      max-width: 540px;
      background: var(--card-bg);
      border: 1px solid var(--card-border);
      border-radius: 8px;
      margin: 16px 0;
      text-align: left;
      font-size: 12px;
      overflow: hidden;
    }
    .spec-row {
      display: flex;
      justify-content: space-between;
      padding: 10px 16px;
      border-bottom: 1px solid var(--border-subtle);
    }
    .spec-row:last-child { border-bottom: none; }
    .spec-label { color: var(--text-muted); font-weight: 500; }
    .spec-val { color: #fff; font-weight: 700; }

    /* Footer Buttons */
    .footer {
      padding: 16px 28px;
      background: #111722;
      border-top: 1px solid var(--border-subtle);
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .btn {
      padding: 9px 20px;
      border-radius: 7px;
      font-size: 12px;
      font-weight: 700;
      cursor: pointer;
      transition: all 0.15s ease;
      border: none;
      outline: none;
      display: inline-flex;
      align-items: center;
      gap: 6px;
    }
    .btn-secondary {
      background: var(--surface);
      color: var(--text);
      border: 1px solid var(--card-border);
    }
    .btn-secondary:hover { background: #232c3d; }
    .btn-primary {
      background: #10b981;
      color: #042f1a;
      font-weight: 800;
    }
    .btn-primary:hover { background: #059669; }
    .btn-danger {
      background: #ef4444;
      color: #fff;
      font-weight: 800;
    }
    .btn-danger:hover { background: #dc2626; }
  </style>
</head>
<body>

  <!-- Brand Header -->
  <div class=""header"">
    <div class=""header-brand"">
      <div class=""header-logo"">OP</div>
      <div class=""header-title"">
        <h1>BASARI IT SOLUTIONS</h1>
        <p>OmniPOS Enterprise Desktop Setup Wizard v1.0.0</p>
      </div>
    </div>
    <div class=""header-badge"">Enterprise Edition</div>
  </div>

  <!-- 5-Step Stepper -->
  <div class=""stepper"">
    <div id=""step-nav-1"" class=""step-item active"">
      <div class=""step-badge"">1</div>
      <span>Edisi Toko</span>
    </div>
    <div id=""step-nav-2"" class=""step-item"">
      <div class=""step-badge"">2</div>
      <span>Mode Peluncuran</span>
    </div>
    <div id=""step-nav-3"" class=""step-item"">
      <div class=""step-badge"">3</div>
      <span>Sumber Database</span>
    </div>
    <div id=""step-nav-4"" class=""step-item"">
      <div class=""step-badge"">4</div>
      <span>Lokasi & Pintasan</span>
    </div>
    <div id=""step-nav-5"" class=""step-item"">
      <div class=""step-badge"">5</div>
      <span>Selesai</span>
    </div>
  </div>

  <!-- Content Pages -->
  <div class=""content"">

    <!-- PAGE 0: MAINTENANCE (JIKA SUDAH TERPASANG) -->
    <div id=""page-0"" class=""page"">
      <div class=""section-title"">OmniPOS Terdeteksi Sudah Terpasang</div>
      <div class=""section-desc"" id=""installedLocText"">Aplikasi OmniPOS Enterprise telah terpasang di komputer ini. Silakan pilih tindakan pemeliharaan sistem:</div>
      
      <div class=""cards-grid"">
        <div class=""selectable-card"" onclick=""handleMaintenance('repair')"">
          <div class=""card-icon-box"">
            <svg viewBox=""0 0 24 24""><path d=""M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67""/></svg>
          </div>
          <div>
            <div class=""card-title"">Perbaiki & Perbarui Berkas Sistem</div>
            <p class=""card-desc"">Mengekstrak ulang seluruh berkas executable (.exe), pustaka runtime, modul webview, dan memperbarui pintasan desktop tanpa menghapus database kasir.</p>
          </div>
        </div>

        <div class=""selectable-card"" onclick=""handleMaintenance('change_edition')"">
          <div class=""card-icon-box"">
            <svg viewBox=""0 0 24 24""><path d=""M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z""/><circle cx=""12"" cy=""12"" r=""3""/></svg>
          </div>
          <div>
            <div class=""card-title"">Ubah Edisi Toko atau Mode Peluncuran</div>
            <p class=""card-desc"">Ganti edisi bisnis aktif (Retail, Resto, Layanan, Apotek, Gadget) atau sesuaikan mode peluncuran (Jendela Desktop Native vs Browser Web).</p>
          </div>
        </div>

        <div class=""selectable-card"" onclick=""handleMaintenance('uninstall')"">
          <div class=""card-icon-box"" style=""background: rgba(239, 68, 68, 0.1);"">
            <svg style=""stroke: #ef4444;"" viewBox=""0 0 24 24""><path d=""M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M10 11v6M14 11v6""/></svg>
          </div>
          <div>
            <div class=""card-title"" style=""color: #ef4444;"">Hapus Instalasi Aplikasi (Uninstall)</div>
            <p class=""card-desc"">Menghapus seluruh berkas program, pintasan desktop, dan registrasi sistem Windows secara bersih.</p>
          </div>
        </div>
      </div>
    </div>

    <!-- PAGE 1: PILIH EDISI BISNIS -->
    <div id=""page-1"" class=""page active"">
      <div class=""section-title"">Langkah 1: Pilih Edisi Bisnis Toko</div>
      <div class=""section-desc"">Pilih bidang usaha toko Anda. Setiap edisi dirancang khusus dengan fitur alur kerja dan isolasi database terenkripsi:</div>

      <div class=""cards-grid cards-grid-2"">
        <!-- Retail -->
        <div class=""selectable-card selected"" onclick=""selectEdition('retail', this)"">
          <div class=""card-radio-indicator""></div>
          <div class=""card-icon-box"">
            <svg viewBox=""0 0 24 24""><circle cx=""8"" cy=""21"" r=""1""/><circle cx=""19"" cy=""21"" r=""1""/><path d=""M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12""/></svg>
          </div>
          <div>
            <div class=""card-title"">Retail & Minimarket</div>
            <p class=""card-desc"">Sembako, pemindai barcode kilat, timbangan digital, multi-satuan (dus/pak/pcs), harga grosir, kasbon tempo.</p>
          </div>
        </div>

        <!-- Resto -->
        <div class=""selectable-card"" onclick=""selectEdition('resto', this)"">
          <div class=""card-radio-indicator""></div>
          <div class=""card-icon-box"">
            <svg viewBox=""0 0 24 24""><path d=""M18 8h1a4 4 0 0 1 0 8h-1M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8zM6 1v3M10 1v3M14 1v3""/></svg>
          </div>
          <div>
            <div class=""card-title"">Resto, Kafe & Bakery</div>
            <p class=""card-desc"">Denah meja visual, layar pesanan dapur (KDS), split bill meja, resep bahan baku (BOM), cetak checker dapur & bar.</p>
          </div>
        </div>

        <!-- Services -->
        <div class=""selectable-card"" onclick=""selectEdition('services', this)"">
          <div class=""card-radio-indicator""></div>
          <div class=""card-icon-box"">
            <svg viewBox=""0 0 24 24""><circle cx=""6"" cy=""6"" r=""3""/><circle cx=""6"" cy=""18"" r=""3""/><line x1=""20"" y1=""4"" x2=""8.12"" y2=""15.88""/><line x1=""14.47"" y1=""14.48"" x2=""20"" y2=""20""/><line x1=""8.12"" y1=""8.12"" x2=""12"" y2=""12""/></svg>
          </div>
          <div>
            <div class=""card-title"">Layanan, Barbershop & Salon</div>
            <p class=""card-desc"">Antrean pengerjaan pelanggan, penugasan teknisi/kapster, perhitungan bagi hasil & komisi staf otomatis.</p>
          </div>
        </div>

        <!-- Pharmacy -->
        <div class=""selectable-card"" onclick=""selectEdition('pharmacy', this)"">
          <div class=""card-radio-indicator""></div>
          <div class=""card-icon-box"">
            <svg viewBox=""0 0 24 24""><path d=""m10.5 20.5 10-10a4.95 4.95 0 1 0-7-7l-10 10a4.95 4.95 0 1 0 7 7Z""/><path d=""m8.5 8.5 7 7""/></svg>
          </div>
          <div>
            <div class=""card-title"">Apotek & Toko Obat</div>
            <p class=""card-desc"">Peringatan kadaluarsa FEFO, nomor batch pabrik, resep dokter, nomor SIP apoteker, kartu stok obat.</p>
          </div>
        </div>

        <!-- Electronics -->
        <div class=""selectable-card"" onclick=""selectEdition('electronics', this)"">
          <div class=""card-radio-indicator""></div>
          <div class=""card-icon-box"">
            <svg viewBox=""0 0 24 24""><rect width=""14"" height=""20"" x=""5"" y=""2"" rx=""2"" ry=""2""/><path d=""M12 18h.01""/></svg>
          </div>
          <div>
            <div class=""card-title"">Gadget & Toko Elektronik</div>
            <p class=""card-desc"">Pelacakan IMEI & nomor seri per unit, garansi digital toko, SPK servis reparasi, dan transaksi tukar tambah.</p>
          </div>
        </div>

        <!-- All Editions -->
        <div class=""selectable-card"" onclick=""selectEdition('all', this)"">
          <div class=""card-radio-indicator""></div>
          <div class=""card-icon-box"">
            <svg viewBox=""0 0 24 24""><path d=""m7.5 4.27 9 5.15M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z""/><path d=""m3.3 7 8.7 5 8.7-5M12 22V12""/></svg>
          </div>
          <div>
            <div class=""card-title"">Semua 5 Edisi Sekaligus</div>
            <p class=""card-desc"">Pasang seluruh fitur 5 edisi bisnis dengan pintasan terpisah di komputer kasir serbaguna.</p>
          </div>
        </div>
      </div>
    </div>

    <!-- PAGE 2: PILIH MODE PELUNCURAN (SINGLE SHORTCUT) -->
    <div id=""page-2"" class=""page"">
      <div class=""section-title"">Langkah 2: Pilih Mode Peluncuran Aplikasi</div>
      <div class=""section-desc"">Tentukan bagaimana kasir akan membuka OmniPOS. Installer hanya akan membuat satu pintasan utama di desktop sesuai pilihan Anda:</div>

      <div class=""cards-grid cards-grid-2"">
        <!-- Desktop Native Window -->
        <div class=""selectable-card selected"" id=""mode-card-desktop"" onclick=""selectLaunchMode('desktop')"">
          <div class=""card-radio-indicator""></div>
          <div class=""card-icon-box"">
            <svg viewBox=""0 0 24 24""><rect width=""20"" height=""14"" x=""2"" y=""3"" rx=""2""/><line x1=""8"" x2=""16"" y1=""21"" y2=""21""/><line x1=""12"" x2=""12"" y1=""17"" y2=""21""/></svg>
          </div>
          <div>
            <div class=""card-title"">
              <span>Jendela Desktop Terdedikasi</span>
              <span class=""card-badge"">Direkomendasikan</span>
            </div>
            <p class=""card-desc"" style=""margin-top: 6px;"">
              Aplikasi berjalan dalam jendela kasir mandiri berperforma tinggi (Microsoft Edge WebView2) tanpa tab atau address bar browser. Sangat cocok untuk kasir meja, layar sentuh (touchscreen), dan kecepatan cetak struk langsung.
            </p>
          </div>
        </div>

        <!-- Web Browser -->
        <div class=""selectable-card"" id=""mode-card-browser"" onclick=""selectLaunchMode('browser')"">
          <div class=""card-radio-indicator""></div>
          <div class=""card-icon-box"">
            <svg viewBox=""0 0 24 24""><circle cx=""12"" cy=""12"" r=""10""/><line x1=""2"" x2=""22"" y1=""12"" y2=""12""/><path d=""M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z""/></svg>
          </div>
          <div>
            <div class=""card-title"">
              <span>Peramban Web Standar (Browser)</span>
            </div>
            <p class=""card-desc"" style=""margin-top: 6px;"">
              Pintasan akan otomatis menyalakan server lokal di latar belakang dan membuka antarmuka kasir pada browser default Anda (Google Chrome, Microsoft Edge, dll). Cocok jika komputer kasir juga dipakai untuk tab kerja lain.
            </p>
          </div>
        </div>
      </div>
    </div>

    <!-- PAGE 3: SUMBER BASIS DATA (RESTORE CADANGAN) -->
    <div id=""page-3"" class=""page"">
      <div class=""section-title"">Langkah 3: Tentukan Sumber Basis Data (Database)</div>
      <div class=""section-desc"">Apakah Anda memulai toko baru atau melakukan instalasi ulang karena komputer lama rusak / migrasi data dari flashdisk?</div>

      <div class=""cards-grid cards-grid-2"">
        <!-- New DB -->
        <div class=""selectable-card selected"" id=""db-card-fresh"" onclick=""selectDbSource('fresh')"">
          <div class=""card-radio-indicator""></div>
          <div class=""card-icon-box"">
            <svg viewBox=""0 0 24 24""><ellipse cx=""12"" cy=""5"" rx=""9"" ry=""3""/><path d=""M21 12c0 1.66-4 3-9 3s-9-1.34-9-3""/><path d=""M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5""/></svg>
          </div>
          <div>
            <div class=""card-title"">Basis Data Baru (Default)</div>
            <p class=""card-desc"" style=""margin-top: 6px;"">
              Mulai dengan database bersih baru siap pakai yang terenkripsi aman secara otomatis di komputer ini.
            </p>
          </div>
        </div>

        <!-- Restore from Backup -->
        <div class=""selectable-card"" id=""db-card-restore"" onclick=""selectDbSource('restore')"">
          <div class=""card-radio-indicator""></div>
          <div class=""card-icon-box"">
            <svg viewBox=""0 0 24 24""><path d=""M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4""/><polyline points=""17 8 12 3 7 8""/><line x1=""12"" x2=""12"" y1=""3"" y2=""15""/></svg>
          </div>
          <div>
            <div class=""card-title"">Pulihkan dari Berkas Cadangan (.db / .bak)</div>
            <p class=""card-desc"" style=""margin-top: 6px;"">
              Gunakan opsi ini untuk pemulihan bencana (misal: komputer kasir lama rusak atau migrasi data toko dari USB flashdisk).
            </p>
          </div>
        </div>
      </div>

      <!-- File Chooser Container (muncul jika restore dipilih) -->
      <div id=""backupFileContainer"" style=""display: none; margin-top: 14px;"">
        <div class=""file-picker-box"" onclick=""browseBackupFile()"">
          <svg viewBox=""0 0 24 24""><path d=""M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z""/><polyline points=""14 2 14 8 20 8""/><line x1=""12"" y1=""18"" x2=""12"" y2=""12""/><line x1=""9"" y1=""15"" x2=""15"" y2=""15""/></svg>
          <div id=""backupFileLabel"" style=""font-size: 13px; font-weight: 700; color: #fff;"">
            Klik untuk Memilih Berkas Cadangan (.db / .sqlite / .bak)
          </div>
          <p id=""backupFileSubtext"" style=""font-size: 11px; color: var(--text-muted); margin-top: 4px;"">
            Pilih berkas dari harddisk atau flashdisk eksternal
          </p>
        </div>
      </div>
    </div>

    <!-- PAGE 4: LOKASI INSTALASI & PINTASAN -->
    <div id=""page-4"" class=""page"">
      <div class=""section-title"">Langkah 4: Direktori Instalasi & Pintasan</div>
      <div class=""section-desc"">Tentukan lokasi pemasangan berkas program dan preferensi pintasan sistem Windows:</div>

      <div class=""form-group"">
        <label class=""form-label"">Folder Instalasi Aplikasi</label>
        <div class=""input-row"">
          <input type=""text"" id=""targetPathInput"" class=""form-input"" value="""" />
          <button type=""button"" class=""btn btn-secondary"" onclick=""browseInstallDir()"">Telusuri...</button>
        </div>
      </div>

      <div class=""form-group"" style=""background: var(--card-bg); padding: 16px; border-radius: 8px; border: 1px solid var(--card-border);"">
        <label class=""form-label"">Opsi Pintasan Sistem</label>
        <label class=""checkbox-item"">
          <input type=""checkbox"" id=""chkDesktop"" checked />
          <span>Buat 1 pintasan utama di Layar Desktop sesuai mode peluncuran yang dipilih</span>
        </label>
        <label class=""checkbox-item"">
          <input type=""checkbox"" id=""chkMenu"" checked />
          <span>Daftarkan ke Start Menu Windows (BASARI IT SOLUTIONS\OmniPOS)</span>
        </label>
      </div>

      <!-- Ringkasan Konfigurasi Sebelum Pemasangan -->
      <div class=""spec-table"" style=""max-width: 100%; margin-top: 8px;"">
        <div class=""spec-row"">
          <span class=""spec-label"">Edisi Toko Terpilih:</span>
          <span class=""spec-val"" id=""summaryEdition"">Retail & Minimarket</span>
        </div>
        <div class=""spec-row"">
          <span class=""spec-label"">Mode Peluncuran:</span>
          <span class=""spec-val"" id=""summaryLaunchMode"">Jendela Desktop Native</span>
        </div>
        <div class=""spec-row"">
          <span class=""spec-label"">Sumber Database:</span>
          <span class=""spec-val"" id=""summaryDbSource"">Basis Data Baru</span>
        </div>
      </div>
    </div>

    <!-- PAGE UNINSTALL CONFIRM -->
    <div id=""page-uninstall-confirm"" class=""page"">
      <div class=""section-title"" style=""color: #ef4444;"">Konfirmasi Penghapusan Instalasi</div>
      <div class=""section-desc"">Apakah Anda yakin ingin menghapus OmniPOS Enterprise dari komputer kasir ini?</div>

      <div class=""form-group"" style=""background: var(--card-bg); padding: 18px; border-radius: 8px; border: 1px solid var(--card-border);"">
        <p style=""font-size: 13px; margin-bottom: 12px; color: #fff;"">Tindakan ini akan menghapus berkas aplikasi, executable, dan pintasan desktop.</p>
        <label class=""checkbox-item"">
          <input type=""checkbox"" id=""chkKeepDb"" checked />
          <span style=""font-weight: 700; color: #10b981;"">Simpan berkas database transaksi & master produk (*.db)</span>
        </label>
        <p style=""font-size: 11px; color: var(--text-muted); margin-top: 6px; margin-left: 26px;"">
          Disarankan tetap dicentang agar riwayat transaksi kasir Anda tidak hilang jika ingin memasang kembali di kemudian hari.
        </p>
      </div>
    </div>

    <!-- PAGE 5: PROSES PROGRESS -->
    <div id=""page-5"" class=""page"">
      <div class=""center-box"">
        <div class=""section-title"" id=""progressTitle"" style=""font-size: 16px;"">Memasang OmniPOS Enterprise...</div>
        <p class=""section-desc"" id=""progressSubtitle"">Mohon tunggu sementara sistem mengekstrak berkas dan mengonfigurasi database.</p>
        <div class=""progress-bar-container"">
          <div id=""progressFill"" class=""progress-bar-fill""></div>
        </div>
        <div id=""progressText"" class=""progress-status"">Mempersiapkan... 0%</div>
      </div>
    </div>

    <!-- PAGE 6: SELESAI -->
    <div id=""page-6"" class=""page"">
      <div class=""center-box"">
        <div id=""resultIcon"" class=""result-icon success"">
          <svg style=""width: 30px; height: 30px; stroke: currentColor; fill: none; stroke-width: 2.5;"" viewBox=""0 0 24 24""><path d=""M20 6 9 17l-5-5""/></svg>
        </div>
        <div class=""section-title"" id=""resultTitle"" style=""font-size: 18px;"">Instalasi Berhasil Diselesaikan</div>
        <p class=""section-desc"" id=""resultDesc"" style=""max-width: 520px; line-height: 1.5; margin-bottom: 14px;"">
          OmniPOS Enterprise telah berhasil terpasang dan siap digunakan pada terminal kasir ini.
        </p>

        <div class=""spec-table"">
          <div class=""spec-row"">
            <span class=""spec-label"">Edisi Terpasang:</span>
            <span class=""spec-val"" id=""resEdition"">Retail & Minimarket</span>
          </div>
          <div class=""spec-row"">
            <span class=""spec-label"">Mode Peluncuran:</span>
            <span class=""spec-val"" id=""resLaunchMode"">Jendela Desktop Terdedikasi</span>
          </div>
          <div class=""spec-row"">
            <span class=""spec-label"">Status Basis Data:</span>
            <span class=""spec-val"" id=""resDbStatus"">Siap Digunakan</span>
          </div>
        </div>
        
        <label id=""launchBox"" class=""checkbox-item"" style=""margin-top: 10px; margin-bottom: 10px;"">
          <input type=""checkbox"" id=""chkLaunchNow"" checked />
          <span style=""font-weight: 700; color: #fff;"">Langsung jalankan OmniPOS sekarang</span>
        </label>
      </div>
    </div>

  </div>

  <!-- Footer Actions -->
  <div class=""footer"">
    <button id=""btnBack"" class=""btn btn-secondary"" onclick=""prevStep()"" style=""visibility: hidden;"">
      Kembali
    </button>
    <div style=""display: flex; gap: 10px;"">
      <button id=""btnCancel"" class=""btn btn-secondary"" onclick=""cancelInstall()"">Batal</button>
      <button id=""btnNext"" class=""btn btn-primary"" onclick=""nextStep()"">Lanjut</button>
    </div>
  </div>

  <script>
    let currentStep = 1;
    let selectedEdition = 'retail';
    let selectedLaunchMode = 'desktop'; // 'desktop' or 'browser'
    let selectedDbSource = 'fresh';     // 'fresh' or 'restore'
    let restoreBackupPath = '';
    let restoreBackupFileName = '';
    let installPath = '';
    let isInstalled = false;
    let currentMode = 'install'; // 'install', 'repair', 'change_edition', 'uninstall'

    const editionDisplayNames = {
      'retail': 'Retail & Minimarket',
      'resto': 'Resto, Kafe & Bakery',
      'services': 'Layanan & Barbershop',
      'pharmacy': 'Apotek & Farmasi',
      'electronics': 'Gadget & Elektronik',
      'all': 'Semua 5 Edisi Sekaligus'
    };

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
            } else if (data.type === 'INSTALL_DIR_SELECTED') {
              installPath = data.path;
              document.getElementById('targetPathInput').value = installPath;
            } else if (data.type === 'BACKUP_FILE_SELECTED') {
              restoreBackupPath = data.path;
              restoreBackupFileName = data.fileName;
              const sizeKb = (data.fileSize / 1024).toFixed(1);
              document.getElementById('backupFileLabel').innerText = 'Berkas Terpilih: ' + data.fileName;
              document.getElementById('backupFileSubtext').innerText = 'Ukuran: ' + sizeKb + ' KB • Path: ' + data.path;
            } else if (data.type === 'PROGRESS') {
              document.getElementById('progressFill').style.width = data.percent + '%';
              document.getElementById('progressText').innerText = data.message + ' (' + data.percent + '%)';
            } else if (data.type === 'INSTALL_COMPLETE') {
              showSuccess('Instalasi Berhasil Diselesaikan', 'OmniPOS Enterprise siap digunakan. Pintasan aplikasi kasir telah dibuat di Desktop sesuai mode yang Anda pilih.', true, data);
            } else if (data.type === 'UNINSTALL_COMPLETE') {
              showSuccess('Penghapusan Berhasil', 'OmniPOS Enterprise telah bersih dihapus dari komputer Anda.', false);
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
      document.querySelectorAll('#page-1 .selectable-card').forEach(c => c.classList.remove('selected'));
      elem.classList.add('selected');
      updateSummary();
    }

    function selectLaunchMode(mode) {
      selectedLaunchMode = mode;
      document.getElementById('mode-card-desktop').classList.toggle('selected', mode === 'desktop');
      document.getElementById('mode-card-browser').classList.toggle('selected', mode === 'browser');
      updateSummary();
    }

    function selectDbSource(source) {
      selectedDbSource = source;
      document.getElementById('db-card-fresh').classList.toggle('selected', source === 'fresh');
      document.getElementById('db-card-restore').classList.toggle('selected', source === 'restore');
      document.getElementById('backupFileContainer').style.display = source === 'restore' ? 'block' : 'none';
      updateSummary();
    }

    function browseInstallDir() {
      if (window.external && window.external.sendMessage) {
        window.external.sendMessage(JSON.stringify({
          action: 'BROWSE_INSTALL_DIR',
          currentPath: document.getElementById('targetPathInput').value.trim()
        }));
      }
    }

    function browseBackupFile() {
      if (window.external && window.external.sendMessage) {
        window.external.sendMessage(JSON.stringify({ action: 'BROWSE_BACKUP_FILE' }));
      }
    }

    function updateSummary() {
      const edName = editionDisplayNames[selectedEdition] || 'Retail & Minimarket';
      const lmName = selectedLaunchMode === 'browser' ? 'Peramban Web Standar (Browser)' : 'Jendela Desktop Terdedikasi (Native Window)';
      const dbName = selectedDbSource === 'restore' 
        ? (restoreBackupFileName ? 'Pulihkan dari: ' + restoreBackupFileName : 'Pulihkan dari Berkas Cadangan') 
        : 'Basis Data Bersih Baru';

      const sEd = document.getElementById('summaryEdition');
      if (sEd) sEd.innerText = edName;
      const sLm = document.getElementById('summaryLaunchMode');
      if (sLm) sLm.innerText = lmName;
      const sDb = document.getElementById('summaryDbSource');
      if (sDb) sDb.innerText = dbName;
    }

    function handleMaintenance(action) {
      if (action === 'repair') {
        currentMode = 'repair';
        startExecution('Memperbaiki OmniPOS Enterprise...', 'Mengekstrak ulang berkas sistem dan memperbarui pintasan desktop...', {
          action: 'START_REPAIR',
          edition: selectedEdition,
          path: installPath,
          launchMode: selectedLaunchMode,
          desktopShortcut: true,
          menuShortcut: true
        });
      } else if (action === 'change_edition') {
        currentMode = 'change_edition';
        setStepperVisible(true);
        goToPage('page-1');
        currentStep = 1;
        updateStepper(1);
        updateButtons();
      } else if (action === 'uninstall') {
        currentMode = 'uninstall';
        goToPage('page-uninstall-confirm');
        document.getElementById('btnBack').style.visibility = 'visible';
        document.getElementById('btnNext').innerText = 'Hapus Sekarang';
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
      for (let i = 1; i <= 5; i++) {
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
        btnNext.innerText = 'Lanjut';
        btnNext.style.display = 'inline-flex';
        btnCancel.style.display = 'inline-flex';
      } else if (currentStep === 2) {
        btnBack.style.visibility = 'visible';
        btnNext.innerText = 'Lanjut';
        btnNext.style.display = 'inline-flex';
        btnCancel.style.display = 'inline-flex';
      } else if (currentStep === 3) {
        btnBack.style.visibility = 'visible';
        btnNext.innerText = 'Lanjut';
        btnNext.style.display = 'inline-flex';
        btnCancel.style.display = 'inline-flex';
      } else if (currentStep === 4) {
        btnBack.style.visibility = 'visible';
        btnNext.innerText = 'Pasang Sekarang';
        btnNext.style.display = 'inline-flex';
        btnCancel.style.display = 'inline-flex';
      }
    }

    function startExecution(title, subtitle, payload) {
      document.getElementById('progressTitle').innerText = title;
      document.getElementById('progressSubtitle').innerText = subtitle;
      document.getElementById('progressFill').style.width = '0%';
      goToPage('page-5');
      updateStepper(5);

      document.getElementById('btnBack').style.visibility = 'hidden';
      document.getElementById('btnNext').style.display = 'none';
      document.getElementById('btnCancel').style.display = 'none';

      if (window.external && window.external.sendMessage) {
        window.external.sendMessage(JSON.stringify(payload));
      }
    }

    function showSuccess(title, desc, allowLaunch, data) {
      document.getElementById('resultTitle').innerText = title;
      document.getElementById('resultDesc').innerText = desc;
      document.getElementById('launchBox').style.display = allowLaunch ? 'flex' : 'none';
      
      const icon = document.getElementById('resultIcon');
      if (allowLaunch) {
        icon.className = 'result-icon success';
        icon.innerHTML = '<svg style=""width: 30px; height: 30px; stroke: currentColor; fill: none; stroke-width: 2.5;"" viewBox=""0 0 24 24""><path d=""M20 6 9 17l-5-5""/></svg>';
        
        if (data) {
          document.getElementById('resEdition').innerText = editionDisplayNames[data.edition] || data.edition;
          document.getElementById('resLaunchMode').innerText = data.launchMode === 'browser' ? 'Peramban Web Standar' : 'Jendela Desktop Terdedikasi';
          document.getElementById('resDbStatus').innerText = data.restoredFromBackup ? 'Dipulihkan dari Cadangan' : 'Basis Data Baru Siap Pakai';
        }
      } else {
        icon.className = 'result-icon danger';
        icon.innerHTML = '<svg style=""width: 30px; height: 30px; stroke: currentColor; fill: none; stroke-width: 2.5;"" viewBox=""0 0 24 24""><path d=""M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6""/></svg>';
      }

      goToPage('page-6');
      updateStepper(5);

      const btnNext = document.getElementById('btnNext');
      btnNext.innerText = 'Selesai';
      btnNext.className = 'btn btn-primary';
      btnNext.style.display = 'inline-flex';
      document.getElementById('btnBack').style.visibility = 'hidden';
      document.getElementById('btnCancel').style.display = 'none';
      currentStep = 6;
    }

    function nextStep() {
      if (currentMode === 'uninstall') {
        const keepDb = document.getElementById('chkKeepDb').checked;
        startExecution('Menghapus OmniPOS Enterprise...', 'Menghapus berkas program, pintasan dan registrasi sistem Windows...', {
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
        currentStep = 3;
        goToPage('page-3');
        updateStepper(3);
        updateButtons();
      } else if (currentStep === 3) {
        if (selectedDbSource === 'restore' && !restoreBackupPath) {
          alert('Silakan pilih berkas cadangan database (.db / .sqlite / .bak) terlebih dahulu sebelum melanjutkan!');
          return;
        }
        currentStep = 4;
        updateSummary();
        goToPage('page-4');
        updateStepper(4);
        updateButtons();
      } else if (currentStep === 4) {
        installPath = document.getElementById('targetPathInput').value.trim();
        const chkDesktop = document.getElementById('chkDesktop').checked;
        const chkMenu = document.getElementById('chkMenu').checked;

        startExecution('Memasang OmniPOS Enterprise...', 'Mengekstrak berkas program dan menyiapkan database kasir...', {
          action: 'START_INSTALL',
          edition: selectedEdition,
          path: installPath,
          launchMode: selectedLaunchMode,
          restoreBackupPath: selectedDbSource === 'restore' ? restoreBackupPath : null,
          desktopShortcut: chkDesktop,
          menuShortcut: chkMenu
        });
      } else if (currentStep === 6) {
        const launchNow = document.getElementById('chkLaunchNow').checked;
        if (launchNow && currentMode !== 'uninstall' && window.external && window.external.sendMessage) {
          window.external.sendMessage(JSON.stringify({
            action: 'LAUNCH_APP',
            edition: selectedEdition,
            launchMode: selectedLaunchMode
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

      if (currentStep === 4) {
        currentStep = 3;
        goToPage('page-3');
        updateStepper(3);
        updateButtons();
      } else if (currentStep === 3) {
        currentStep = 2;
        goToPage('page-2');
        updateStepper(2);
        updateButtons();
      } else if (currentStep === 2) {
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
