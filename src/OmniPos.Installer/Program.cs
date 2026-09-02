using System;
using System.Diagnostics;
using System.IO;
using System.IO.Compression;
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
                .SetSize(900, 660)
                .SetResizable(false)
                .Center()
                .RegisterWebMessageReceivedHandler(OnWebMessageReceived);

            _window.LoadRawString(GetInstallerHtml());
            _window.WaitForClose();
        }
        catch (Exception ex)
        {
            Console.WriteLine($"[Error] Tidak dapat meluncurkan antarmuka grafis: {ex.Message}");
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
                var response = JsonSerializer.Serialize(new
                {
                    type = "INIT_CONFIG",
                    defaultPath = _targetDir,
                    version = Version,
                    developer = DeveloperName,
                    appTitle = AppTitle
                });
                _window?.SendWebMessage(response);
            }
            else if (action == "START_INSTALL")
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
            Directory.CreateDirectory(targetDir);
            SendProgress(10, "Menyiapkan direktori instalasi...");

            // 1. Ekstraksi Payload Zip
            var assembly = Assembly.GetExecutingAssembly();
            using var stream = assembly.GetManifestResourceStream("payload.zip");

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

                    if (count % 5 == 0 || count == total)
                    {
                        int percent = 10 + (int)((double)count / total * 75);
                        SendProgress(percent, $"Mengekstrak {entry.Name} ({count}/{total})...");
                        await Task.Delay(15);
                    }
                }
            }
            else
            {
                SendProgress(30, "Menyalin berkas sistem aplikasi...");
                var baseDir = AppDomain.CurrentDomain.BaseDirectory;
                CopyDirectory(baseDir, targetDir);
            }

            SendProgress(90, "Membuat shortcut desktop dan menu Windows...");
            await Task.Delay(200);

            var desktopExe = Path.Combine(targetDir, "OmniPos.Desktop.exe");

            // 2. Buat Shortcut
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
            await Task.Delay(300);

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
        var batContent = $"@echo off\r\ntitle {displayName} - {DeveloperName}\r\ncd /d \"%~dp0\"\r\nstart \"\" \"OmniPos.Desktop.exe\" --edition={editionKey} %*\r\n";
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

                var psScript = $"$ws = New-Object -ComObject WScript.Shell; $s = $ws.CreateShortcut('{escapedPath}'); $s.TargetPath = '{escapedTarget}'; $s.Arguments = '{escapedArgs}'; $s.WorkingDirectory = '{escapedWork}'; $s.Description = '{escapedDesc}'; $s.Save()";

                var psi = new ProcessStartInfo("powershell", $"-NoProfile -ExecutionPolicy Bypass -Command \"{psScript}\"")
                {
                    CreateNoWindow = true,
                    UseShellExecute = false
                };
                using var p = Process.Start(psi);
                p?.WaitForExit(3000);
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
  <title>BASARI IT SOLUTIONS - OmniPOS Enterprise Setup</title>
  <style>
    :root {
      --bg: #0d1117;
      --card-bg: #161b22;
      --card-border: #30363d;
      --primary: #238636;
      --primary-hover: #2ea043;
      --accent: #58a6ff;
      --text: #f0f6fc;
      --text-muted: #8b949e;
      --surface: #21262d;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; user-select: none; }
    body { background: var(--bg); color: var(--text); height: 100vh; display: flex; flex-direction: column; overflow: hidden; }
    
    /* Top Header */
    .header { background: linear-gradient(135deg, #1f2937, #111827); border-bottom: 1px solid var(--card-border); padding: 18px 24px; display: flex; justify-content: space-between; align-items: center; }
    .header-brand { display: flex; align-items: center; gap: 14px; }
    .header-logo { width: 42px; height: 42px; background: linear-gradient(135deg, #2563eb, #10b981); border-radius: 10px; display: flex; align-items: center; justify-content: center; font-weight: 900; font-size: 20px; color: #fff; box-shadow: 0 4px 12px rgba(37,99,235,0.3); }
    .header-title h1 { font-size: 16px; font-weight: 700; letter-spacing: -0.3px; }
    .header-title p { font-size: 11px; color: var(--text-muted); margin-top: 2px; }
    .header-badge { font-size: 10px; font-weight: 700; background: rgba(56, 189, 248, 0.15); color: #38bdf8; border: 1px solid rgba(56, 189, 248, 0.3); padding: 3px 8px; border-radius: 6px; }

    /* Stepper */
    .stepper { display: flex; justify-content: center; gap: 8px; padding: 12px 24px; background: #090d13; border-bottom: 1px solid #21262d; font-size: 12px; }
    .step-item { display: flex; align-items: center; gap: 6px; color: var(--text-muted); font-weight: 600; padding: 4px 12px; border-radius: 20px; }
    .step-item.active { color: #fff; background: #1f2937; border: 1px solid #374151; }
    .step-item.completed { color: #10b981; }

    /* Main Container */
    .content { flex: 1; padding: 20px 24px; overflow-y: auto; }
    .page { display: none; height: 100%; flex-direction: column; }
    .page.active { display: flex; }

    /* Grid of Editions */
    .section-title { font-size: 14px; font-weight: 700; margin-bottom: 4px; }
    .section-desc { font-size: 12px; color: var(--text-muted); margin-bottom: 14px; }
    
    .edition-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px; }
    .edition-card { background: var(--card-bg); border: 2px solid var(--card-border); border-radius: 10px; padding: 12px 14px; cursor: pointer; transition: all 0.15s ease; position: relative; }
    .edition-card:hover { border-color: #4b5563; background: #1c2128; transform: translateY(-1px); }
    .edition-card.selected { border-color: #10b981; background: rgba(16, 185, 129, 0.08); box-shadow: 0 0 0 1px #10b981; }
    .edition-card-header { display: flex; align-items: center; gap: 10px; margin-bottom: 6px; }
    .edition-icon { font-size: 20px; }
    .edition-name { font-size: 13px; font-weight: 700; color: #fff; }
    .edition-desc { font-size: 11px; color: var(--text-muted); line-height: 1.4; }
    .edition-check { position: absolute; top: 12px; right: 12px; width: 18px; height: 18px; border-radius: 50%; border: 2px solid var(--card-border); display: flex; align-items: center; justify-content: center; font-size: 10px; }
    .edition-card.selected .edition-check { background: #10b981; border-color: #10b981; color: #fff; font-weight: 900; }

    /* Step 2 Inputs */
    .form-group { margin-bottom: 16px; }
    .form-label { font-size: 12px; font-weight: 600; margin-bottom: 6px; display: block; }
    .form-input { width: 100%; padding: 10px 14px; background: var(--surface); border: 1px solid var(--card-border); border-radius: 8px; color: #fff; font-size: 12px; outline: none; }
    .form-input:focus { border-color: #38bdf8; }
    .checkbox-item { display: flex; align-items: center; gap: 10px; margin-top: 10px; cursor: pointer; font-size: 12px; }
    .checkbox-item input { width: 16px; height: 16px; accent-color: #10b981; cursor: pointer; }

    /* Step 3 Progress */
    .progress-box { display: flex; flex-direction: column; align-items: center; justify-content: center; flex: 1; text-align: center; }
    .progress-bar-container { width: 100%; max-width: 540px; height: 12px; background: #21262d; border-radius: 8px; overflow: hidden; margin: 20px 0 10px 0; border: 1px solid #30363d; }
    .progress-bar-fill { height: 100%; width: 0%; background: linear-gradient(90deg, #10b981, #38bdf8); border-radius: 8px; transition: width 0.1s linear; }
    .progress-status { font-size: 12px; color: var(--text-muted); font-family: monospace; }

    /* Step 4 Success */
    .success-box { display: flex; flex-direction: column; align-items: center; justify-content: center; flex: 1; text-align: center; }
    .success-icon { width: 64px; height: 64px; background: rgba(16, 185, 129, 0.15); border: 2px solid #10b981; color: #10b981; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 32px; margin-bottom: 16px; }
    .success-title { font-size: 18px; font-weight: 700; margin-bottom: 6px; }
    .success-desc { font-size: 12px; color: var(--text-muted); max-width: 480px; line-height: 1.5; margin-bottom: 20px; }

    /* Footer Buttons */
    .footer { padding: 14px 24px; background: var(--card-bg); border-top: 1px solid var(--card-border); display: flex; justify-content: space-between; align-items: center; }
    .btn { padding: 9px 18px; border-radius: 8px; font-size: 12px; font-weight: 700; cursor: pointer; transition: all 0.15s ease; border: none; outline: none; }
    .btn-secondary { background: var(--surface); color: var(--text); border: 1px solid var(--card-border); }
    .btn-secondary:hover { background: #2b313a; }
    .btn-primary { background: #10b981; color: #042f1a; font-weight: 800; box-shadow: 0 2px 8px rgba(16,185,129,0.3); }
    .btn-primary:hover { background: #059669; }
    .btn-primary:disabled { opacity: 0.5; cursor: not-allowed; }
  </style>
</head>
<body>

  <!-- Header -->
  <div class=""header"">
    <div class=""header-brand"">
      <div class=""header-logo"">O</div>
      <div class=""header-title"">
        <h1>BASARI IT SOLUTIONS</h1>
        <p>OmniPOS Enterprise Desktop Setup Wizard v1.0.0</p>
      </div>
    </div>
    <div class=""header-badge"">Windows GUI Setup</div>
  </div>

  <!-- Stepper -->
  <div class=""stepper"">
    <div id=""step-nav-1"" class=""step-item active""><span>1</span> Pilih Edisi</div>
    <div id=""step-nav-2"" class=""step-item""><span>2</span> Lokasi & Pintasan</div>
    <div id=""step-nav-3"" class=""step-item""><span>3</span> Pemasangan</div>
    <div id=""step-nav-4"" class=""step-item""><span>4</span> Selesai</div>
  </div>

  <!-- Content -->
  <div class=""content"">

    <!-- PAGE 1: PILIH EDISI -->
    <div id=""page-1"" class=""page active"">
      <div class=""section-title"">Pilih Edisi Toko Anda</div>
      <div class=""section-desc"">Setiap edisi terpasang sebagai aplikasi mandiri dengan database terenkripsi terisolasi:</div>
      
      <div class=""edition-grid"">
        <div class=""edition-card selected"" onclick=""selectEdition('retail', this)"">
          <div class=""edition-check"">✓</div>
          <div class=""edition-card-header"">
            <span class=""edition-icon"">🛒</span>
            <span class=""edition-name"">Retail & Minimarket</span>
          </div>
          <p class=""edition-desc"">Sembako, Barcode Kilat, Timbangan Manual/Digital, Harga Grosir, Kasbon.</p>
        </div>

        <div class=""edition-card"" onclick=""selectEdition('resto', this)"">
          <div class=""edition-check""></div>
          <div class=""edition-card-header"">
            <span class=""edition-icon"">🍽️</span>
            <span class=""edition-name"">Resto, Kafe & Bakery</span>
          </div>
          <p class=""edition-desc"">Denah Meja Visual, Layar Dapur KDS, Split Bill, Resep Bahan Baku / BOM.</p>
        </div>

        <div class=""edition-card"" onclick=""selectEdition('services', this)"">
          <div class=""edition-check""></div>
          <div class=""edition-card-header"">
            <span class=""edition-icon"">✂️</span>
            <span class=""edition-name"">Layanan & Barbershop</span>
          </div>
          <p class=""edition-desc"">Antrean Pengerjaan, Penugasan Staf/Teknisi, Bagi Hasil & Komisi Karyawan.</p>
        </div>

        <div class=""edition-card"" onclick=""selectEdition('pharmacy', this)"">
          <div class=""edition-check""></div>
          <div class=""edition-card-header"">
            <span class=""edition-icon"">💊</span>
            <span class=""edition-name"">Apotek & Toko Obat</span>
          </div>
          <p class=""edition-desc"">Peringatan Kadaluarsa FEFO, No. Batch Pabrik, Resep Dokter & SIP Apoteker.</p>
        </div>

        <div class=""edition-card"" onclick=""selectEdition('electronics', this)"">
          <div class=""edition-check""></div>
          <div class=""edition-card-header"">
            <span class=""edition-icon"">📱</span>
            <span class=""edition-name"">Gadget & Elektronik</span>
          </div>
          <p class=""edition-desc"">Pelacakan IMEI, Garansi Digital, Pusat Servis SPK, Tukar Tambah (Trade-In).</p>
        </div>

        <div class=""edition-card"" onclick=""selectEdition('all', this)"">
          <div class=""edition-check""></div>
          <div class=""edition-card-header"">
            <span class=""edition-icon"">📦</span>
            <span class=""edition-name"">Semua 5 Edisi Sekaligus</span>
          </div>
          <p class=""edition-desc"">Pasang 5 aplikasi sekaligus dengan 5 shortcut terpisah di Desktop.</p>
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

    <!-- PAGE 3: PROSES INSTALASI -->
    <div id=""page-3"" class=""page"">
      <div class=""progress-box"">
        <div class=""section-title"" style=""font-size: 16px;"">Memasang OmniPOS Enterprise...</div>
        <p class=""section-desc"">Mohon tunggu sementara sistem mengekstrak dan mengonfigurasi database.</p>
        <div class=""progress-bar-container"">
          <div id=""progressFill"" class=""progress-bar-fill""></div>
        </div>
        <div id=""progressText"" class=""progress-status"">Mempersiapkan pemasangan... 0%</div>
      </div>
    </div>

    <!-- PAGE 4: SELESAI -->
    <div id=""page-4"" class=""page"">
      <div class=""success-box"">
        <div class=""success-icon"">✓</div>
        <div class=""success-title"">Instalasi Berhasil Diselesaikan!</div>
        <p class=""success-desc"">OmniPOS Enterprise siap digunakan. Pintasan aplikasi kasir telah dibuat di Desktop dan Start Menu Windows.</p>
        
        <label class=""checkbox-item"" style=""margin-bottom: 10px;"">
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

    // Initialize config from C# backend
    window.onload = () => {
      if (window.external && window.external.receiveMessage) {
        window.external.receiveMessage((msg) => {
          try {
            const data = JSON.parse(msg);
            if (data.type === 'INIT_CONFIG') {
              installPath = data.defaultPath;
              document.getElementById('targetPathInput').value = installPath;
            } else if (data.type === 'PROGRESS') {
              document.getElementById('progressFill').style.width = data.percent + '%';
              document.getElementById('progressText').innerText = data.message + ' (' + data.percent + '%)';
            } else if (data.type === 'INSTALL_COMPLETE') {
              goToStep(4);
            }
          } catch(e) {}
        });
        window.external.sendMessage(JSON.stringify({ action: 'GET_DEFAULT_CONFIG' }));
      }
    };

    function selectEdition(key, elem) {
      selectedEdition = key;
      document.querySelectorAll('.edition-card').forEach(c => {
        c.classList.remove('selected');
        c.querySelector('.edition-check').innerText = '';
      });
      elem.classList.add('selected');
      elem.querySelector('.edition-check').innerText = '✓';
    }

    function goToStep(step) {
      currentStep = step;
      for (let i = 1; i <= 4; i++) {
        document.getElementById('page-' + i).classList.remove('active');
        const sNav = document.getElementById('step-nav-' + i);
        sNav.classList.remove('active', 'completed');
        if (i < step) sNav.classList.add('completed');
        if (i === step) sNav.classList.add('active');
      }
      document.getElementById('page-' + step).classList.add('active');

      const btnBack = document.getElementById('btnBack');
      const btnNext = document.getElementById('btnNext');
      const btnCancel = document.getElementById('btnCancel');

      if (step === 1) {
        btnBack.style.visibility = 'hidden';
        btnNext.innerText = 'Lanjut →';
        btnNext.style.display = 'block';
        btnCancel.style.display = 'block';
      } else if (step === 2) {
        btnBack.style.visibility = 'visible';
        btnNext.innerText = 'Pasang Sekarang ⚡';
        btnNext.style.display = 'block';
        btnCancel.style.display = 'block';
      } else if (step === 3) {
        btnBack.style.visibility = 'hidden';
        btnNext.style.display = 'none';
        btnCancel.style.display = 'none';
      } else if (step === 4) {
        btnBack.style.visibility = 'hidden';
        btnCancel.style.display = 'none';
        btnNext.innerText = 'Selesai ✓';
        btnNext.style.display = 'block';
      }
    }

    function nextStep() {
      if (currentStep === 1) {
        goToStep(2);
      } else if (currentStep === 2) {
        installPath = document.getElementById('targetPathInput').value.trim();
        const chkDesktop = document.getElementById('chkDesktop').checked;
        const chkMenu = document.getElementById('chkMenu').checked;
        goToStep(3);

        if (window.external && window.external.sendMessage) {
          window.external.sendMessage(JSON.stringify({
            action: 'START_INSTALL',
            edition: selectedEdition,
            path: installPath,
            desktopShortcut: chkDesktop,
            menuShortcut: chkMenu
          }));
        }
      } else if (currentStep === 4) {
        const launchNow = document.getElementById('chkLaunchNow').checked;
        if (launchNow && window.external && window.external.sendMessage) {
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
      if (currentStep === 2) goToStep(1);
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
