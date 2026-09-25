using System;
using System.Diagnostics;
using System.IO;
using System.Linq;
using System.Net.Http;
using System.Runtime.InteropServices;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Builder;
using Microsoft.Extensions.Hosting;
using Microsoft.Win32;
using Photino.NET;
using OmniPos.Server;

namespace OmniPos.Desktop;

internal static class Program
{
    [DllImport("kernel32.dll", CharSet = CharSet.Auto, SetLastError = true)]
    private static extern bool SetDllDirectory(string lpPathName);

    [DllImport("user32.dll", CharSet = CharSet.Unicode, SetLastError = true)]
    private static extern int MessageBox(IntPtr hWnd, string text, string caption, uint type);

    private const uint MB_OK = 0x00000000;
    private const uint MB_YESNO = 0x00000004;
    private const uint MB_ICONERROR = 0x00000010;
    private const uint MB_ICONWARNING = 0x00000030;
    private const uint MB_ICONINFORMATION = 0x00000040;
    private const int IDYES = 6;

    [STAThread]
    private static void Main(string[] args)
    {
        // 1. Setup native library path untuk Windows atau Linux
        if (OperatingSystem.IsWindows())
        {
            try
            {
                SetDllDirectory(AppDomain.CurrentDomain.BaseDirectory);
            }
            catch { }
        }
        else if (OperatingSystem.IsLinux())
        {
            EnsureLinuxWebKitCompatibility(args);
        }

        // 2. Jalankan aplikasi sepenuhnya pada Main STA Thread (Thread 1)
        Run(args);
    }

    private static void EnsureLinuxWebKitCompatibility(string[] args)
    {
        try
        {
            var appDir = AppDomain.CurrentDomain.BaseDirectory.TrimEnd(Path.DirectorySeparatorChar);

            // 1. Periksa dan buat symlink WebKitGTK 4.0 -> WebKitGTK 4.1 jika diperlukan
            var webkit40Path = Path.Combine(appDir, "libwebkit2gtk-4.0.so.37");
            var jscore40Path = Path.Combine(appDir, "libjavascriptcoregtk-4.0.so.18");

            if (!File.Exists(webkit40Path))
            {
                var candidateWebKit41 = new[]
                {
                    "/lib/x86_64-linux-gnu/libwebkit2gtk-4.1.so.0",
                    "/usr/lib/x86_64-linux-gnu/libwebkit2gtk-4.1.so.0",
                    "/usr/lib64/libwebkit2gtk-4.1.so.0",
                    "/usr/lib/libwebkit2gtk-4.1.so.0"
                }.FirstOrDefault(File.Exists);

                if (candidateWebKit41 != null)
                {
                    try { File.CreateSymbolicLink(webkit40Path, candidateWebKit41); } catch { }
                }
            }

            if (!File.Exists(jscore40Path))
            {
                var candidateJscore41 = new[]
                {
                    "/lib/x86_64-linux-gnu/libjavascriptcoregtk-4.1.so.0",
                    "/usr/lib/x86_64-linux-gnu/libjavascriptcoregtk-4.1.so.0",
                    "/usr/lib64/libjavascriptcoregtk-4.1.so.0",
                    "/usr/lib/libjavascriptcoregtk-4.1.so.0"
                }.FirstOrDefault(File.Exists);

                if (candidateJscore41 != null)
                {
                    try { File.CreateSymbolicLink(jscore40Path, candidateJscore41); } catch { }
                }
            }

            // 2. Periksa apakah LD_LIBRARY_PATH sudah memuat direktori aplikasi
            var currentLd = Environment.GetEnvironmentVariable("LD_LIBRARY_PATH") ?? "";
            var isReexeced = Environment.GetEnvironmentVariable("OMNIPOS_REEXECED") == "1";

            if (!isReexeced && !currentLd.Split(':').Any(p => string.Equals(p.TrimEnd('/'), appDir, StringComparison.Ordinal)))
            {
                var newLd = string.IsNullOrEmpty(currentLd) ? appDir : $"{appDir}:{currentLd}";
                var procPath = Environment.ProcessPath ?? Path.Combine(appDir, "OmniPos.Desktop");

                if (File.Exists(procPath))
                {
                    var psi = new ProcessStartInfo
                    {
                        FileName = procPath,
                        UseShellExecute = false
                    };
                    foreach (var arg in args) psi.ArgumentList.Add(arg);
                    psi.Environment["LD_LIBRARY_PATH"] = newLd;
                    psi.Environment["OMNIPOS_REEXECED"] = "1";

                    var proc = Process.Start(psi);
                    if (proc != null)
                    {
                        proc.WaitForExit();
                        Environment.Exit(proc.ExitCode);
                    }
                }
            }
        }
        catch
        {
            // Abaikan jika lingkungan terbatas, lanjutkan startup normal
        }
    }

    private static void Run(string[] args)
    {
        // Setup file logging persisten di LocalApplicationData
        var logDir = Path.Combine(
            Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData),
            "BasariITSolutions",
            "OmniPOS",
            "logs"
        );
        try { Directory.CreateDirectory(logDir); } catch { }
        var logFile = Path.Combine(logDir, "desktop_startup.log");

        void Log(string message)
        {
            var line = $"[{DateTime.Now:yyyy-MM-dd HH:mm:ss.fff}] {message}";
            Console.WriteLine(line);
            try { File.AppendAllText(logFile, line + Environment.NewLine); } catch { }
        }

        Log("==========================================================");
        Log(" OmniPOS Enterprise Desktop Host");
        Log($" OS: {RuntimeInformation.OSDescription} ({RuntimeInformation.OSArchitecture})");
        Log($" Main Thread: ID {Thread.CurrentThread.ManagedThreadId}, Apartment: {Thread.CurrentThread.GetApartmentState()}");
        Log("==========================================================");

        // 1. Ekstraksi Edisi dari Argumen CLI atau Environment (Prioritas tertinggi: Argumen CLI)
        string? cliEdition = null;

        for (int i = 0; i < args.Length; i++)
        {
            var arg = args[i];
            if (arg.StartsWith("--edition=", StringComparison.OrdinalIgnoreCase))
                cliEdition = arg.Substring("--edition=".Length).Trim().ToLowerInvariant();
            else if (arg.Equals("--edition", StringComparison.OrdinalIgnoreCase) && i + 1 < args.Length)
                cliEdition = args[i + 1].Trim().ToLowerInvariant();
            else if (arg.StartsWith("--mode=", StringComparison.OrdinalIgnoreCase))
                cliEdition = arg.Substring("--mode=".Length).Trim().ToLowerInvariant();
            else if (arg.Equals("--mode", StringComparison.OrdinalIgnoreCase) && i + 1 < args.Length)
                cliEdition = args[i + 1].Trim().ToLowerInvariant();
            else if (arg.Equals("-e", StringComparison.OrdinalIgnoreCase) && i + 1 < args.Length)
                cliEdition = args[i + 1].Trim().ToLowerInvariant();
            else if (arg.Equals("-m", StringComparison.OrdinalIgnoreCase) && i + 1 < args.Length)
                cliEdition = args[i + 1].Trim().ToLowerInvariant();
        }

        string edition = cliEdition ?? "retail";

        if (string.IsNullOrWhiteSpace(cliEdition))
        {
            var envEdition = Environment.GetEnvironmentVariable("OMNIPOS_EDITION") ?? Environment.GetEnvironmentVariable("OMNIPOS_MODE");
            if (!string.IsNullOrWhiteSpace(envEdition))
            {
                edition = envEdition.Trim().ToLowerInvariant();
            }
            else
            {
                var editionConfigFile = Path.Combine(AppDomain.CurrentDomain.BaseDirectory, "edition.txt");
                var cwdConfigFile = Path.Combine(Directory.GetCurrentDirectory(), "edition.txt");
                if (File.Exists(editionConfigFile))
                {
                    try
                    {
                        var fileContent = File.ReadAllText(editionConfigFile).Trim().ToLowerInvariant();
                        if (!string.IsNullOrWhiteSpace(fileContent)) edition = fileContent;
                    }
                    catch { }
                }
                else if (File.Exists(cwdConfigFile))
                {
                    try
                    {
                        var fileContent = File.ReadAllText(cwdConfigFile).Trim().ToLowerInvariant();
                        if (!string.IsNullOrWhiteSpace(fileContent)) edition = fileContent;
                    }
                    catch { }
                }
            }
        }

        // 2. Pemetaan Judul Jendela Desktop Sesuai Edisi Bisnis
        string windowTitle = edition switch
        {
            "resto" or "foodandbeverage" or "fnb" => "OmniPOS - Kasir Resto, Kafe & Bakery (F&B)",
            "services" or "jasa" or "barber" or "laundry" => "OmniPOS - Kasir Layanan, Barbershop & Laundry",
            "pharmacy" or "apotek" or "farmasi" => "OmniPOS - Kasir Apotek & Toko Obat",
            "electronics" or "gadget" or "elektronik" => "OmniPOS - Kasir Gadget & Elektronik (IMEI)",
            _ => "OmniPOS - Kasir Retail, Sembako & Minimarket"
        };

        Log($"[OmniPOS Target] Edisi: {edition} | Judul: {windowTitle}");

        // 3. Inisialisasi Server Kestrel di Background Task, tetap menjaga Main Thread STA
        WebApplication? app = null;
        int activePort = 5000;
        string activeUrl = "http://127.0.0.1:5000";

        for (int p = 5000; p <= 5030; p++)
        {
            try
            {
                int candidatePort = p;
                string currentEdition = edition;
                app = Task.Run(async () =>
                {
                    var serverApp = await ServerAppBuilder.BuildAsync(args, candidatePort, currentEdition);
                    serverApp.Urls.Clear();
                    serverApp.Urls.Add($"http://0.0.0.0:{candidatePort}");
                    await serverApp.StartAsync();
                    return serverApp;
                }).GetAwaiter().GetResult();

                activePort = p;
                activeUrl = $"http://127.0.0.1:{activePort}";
                Log($"[OmniPOS Engine] Berhasil aktif ({edition}) & mendengarkan pada: http://0.0.0.0:{activePort} (Lokal: {activeUrl})");
                break;
            }
            catch (Exception ex)
            {
                Log($"[OmniPOS Engine] Port {p} belum siap ({ex.Message}), mencoba port berikutnya...");
                if (app != null)
                {
                    try { Task.Run(async () => await app.DisposeAsync()).GetAwaiter().GetResult(); } catch { }
                    app = null;
                }
            }
        }

        if (app == null)
        {
            Log("[OmniPOS Fatal] Gagal menginisialisasi server backend pada rentang port 5000-5030.");
            if (OperatingSystem.IsWindows())
            {
                MessageBox(IntPtr.Zero, "Gagal menginisialisasi backend OmniPOS (Port 5000-5030 terpakai).", "OmniPOS Fatal", MB_OK | MB_ICONERROR);
            }
            return;
        }

        // 4. Verifikasi kesiapan endpoint & static webroot dengan HTTP probe
        try
        {
            Task.Run(async () =>
            {
                using var httpClient = new HttpClient { Timeout = TimeSpan.FromSeconds(3) };
                var resApi = await httpClient.GetAsync($"{activeUrl}/api/v1/products");
                var resHtml = await httpClient.GetAsync(activeUrl);
                Log($"[OmniPOS Engine] Probe API OK ({resApi.StatusCode}), Probe WebRoot OK ({resHtml.StatusCode})");
            }).GetAwaiter().GetResult();
        }
        catch (Exception ex)
        {
            Log($"[OmniPOS Probe Notice] {ex.Message}");
        }

        // 5. Mode Headless
        bool isHeadless = args.Contains("--no-gui", StringComparer.OrdinalIgnoreCase) || 
                          args.Contains("--headless", StringComparer.OrdinalIgnoreCase) || 
                          Environment.GetEnvironmentVariable("OMNIPOS_NO_GUI") == "1";
        if (isHeadless)
        {
            Log("[OmniPOS Engine] Mode Headless aktif. Server backend berjalan tanpa UI desktop...");
            Log($"[OmniPOS Engine] Buka antarmuka kasir di browser: {activeUrl}");
            Task.Run(async () => await app.WaitForShutdownAsync()).GetAwaiter().GetResult();
            return;
        }

        // 6. Mode Browser Eksplisit
        bool openBrowser = args.Contains("--browser", StringComparer.OrdinalIgnoreCase) || 
                           args.Contains("-b", StringComparer.OrdinalIgnoreCase) || 
                           Environment.GetEnvironmentVariable("OMNIPOS_BROWSER") == "1";
        if (openBrowser)
        {
            Log($"[OmniPOS Browser Mode] Membuka antarmuka kasir di Web Browser: {activeUrl}");
            TryOpenBrowser(activeUrl);
            Log("[OmniPOS Engine] Server kasir tetap aktif di background. Tekan CTRL+C untuk menutup.");
            Task.Run(async () => await app.WaitForShutdownAsync()).GetAwaiter().GetResult();
            return;
        }

        // 7. Pada Windows, verifikasi WebView2 Runtime sebelum membuka jendela native
        if (OperatingSystem.IsWindows())
        {
            if (!IsWebView2InstalledOnWindows())
            {
                Log("[OmniPOS Warning] Microsoft Edge WebView2 Runtime tidak ditemukan di komputer Windows ini.");
                int choice = MessageBox(
                    IntPtr.Zero,
                    "OmniPOS Desktop memerlukan Microsoft Edge WebView2 Runtime untuk menampilkan antarmuka kasir desktop.\n\n" +
                    "Apakah Anda ingin mengunduh dan memasang WebView2 Runtime secara otomatis sekarang?\n\n" +
                    "[Yes / Ya] - Unduh & Pasang Otomatis (Rekomendasi)\n" +
                    "[No / Tidak] - Buka dalam Mode Web Browser biasa",
                    "OmniPOS Enterprise - WebView2 Runtime Diperlukan",
                    MB_YESNO | MB_ICONWARNING
                );

                if (choice == IDYES)
                {
                    Log("[OmniPOS Desktop] Memulai pemasangan otomatis WebView2 Runtime...");
                    bool installed = DownloadAndInstallWebView2(Log);
                    if (!installed)
                    {
                        Log("[OmniPOS Desktop] Pemasangan WebView2 belum selesai. Beralih ke Web Browser...");
                        TryOpenBrowser(activeUrl);
                        Task.Run(async () => await app.WaitForShutdownAsync()).GetAwaiter().GetResult();
                        return;
                    }
                }
                else
                {
                    Log("[OmniPOS Desktop] Pengguna memilih fallback ke Web Browser.");
                    TryOpenBrowser(activeUrl);
                    Task.Run(async () => await app.WaitForShutdownAsync()).GetAwaiter().GetResult();
                    return;
                }
            }
        }

        // 8. Luncurkan Jendela Desktop Native Photino langsung pada Main STA Thread
        bool nativeWindowSuccess = false;
        var launchTime = DateTime.UtcNow;

        try
        {
            var tempDir = Path.Combine(
                Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData),
                "BasariITSolutions",
                "OmniPOS",
                $"webview2_{edition}"
            );
            try { Directory.CreateDirectory(tempDir); } catch { }

            // Bersihkan file lock sisa jika ada proses crash sebelumnya agar tidak terjadi white-screen deadlock
            if (OperatingSystem.IsWindows())
            {
                try
                {
                    var lockFile = Path.Combine(tempDir, "EBWebView", "SingletonLock");
                    if (File.Exists(lockFile)) File.Delete(lockFile);
                    var socketFile = Path.Combine(tempDir, "EBWebView", "SingletonSocket");
                    if (File.Exists(socketFile)) File.Delete(socketFile);
                }
                catch { }
            }

            Log($"[OmniPOS Desktop] Creating PhotinoWindow on Thread ID {Thread.CurrentThread.ManagedThreadId} (Apartment: {Thread.CurrentThread.GetApartmentState()})");
            Log($"[OmniPOS Desktop] TempFilesPath: {tempDir} | Target URL: {activeUrl}");

            var window = new PhotinoWindow()
                .SetTitle(windowTitle)
                .SetUseOsDefaultLocation(true)
                .SetUseOsDefaultSize(false)
                .SetSize(1366, 800)
                .SetMinSize(1024, 700)
                .SetResizable(true)
                .SetDevToolsEnabled(true)
                .SetTemporaryFilesPath(tempDir)
                .Load(new Uri(activeUrl));

            Log("[OmniPOS Desktop] PhotinoWindow loaded. Running native event loop on Main STA Thread...");
            window.WaitForClose();
            nativeWindowSuccess = true;

            // Jika jendela tertutup seketika (< 2 detik setelah buka), kemungkinan terjadi crash
            if ((DateTime.UtcNow - launchTime).TotalSeconds < 2)
            {
                Log("[OmniPOS Notice] Jendela native ditutup sangat cepat (< 2 detik). Mengaktifkan fallback browser web...");
                nativeWindowSuccess = false;
            }
        }
        catch (Exception ex)
        {
            Log($"[OmniPOS Desktop Error] Exception saat membuka jendela desktop: {ex.GetType().Name} - {ex.Message}\n{ex.StackTrace}");
            if (ex.InnerException != null)
            {
                Log($"[OmniPOS Desktop Inner] {ex.InnerException.GetType().Name} - {ex.InnerException.Message}");
            }
            nativeWindowSuccess = false;
        }

        if (!nativeWindowSuccess)
        {
            Log($"[OmniPOS Browser Fallback] Membuka antarmuka kasir otomatis di Web Browser: {activeUrl}");
            TryOpenBrowser(activeUrl);
            Log("[OmniPOS Engine] Server kasir tetap aktif di background. Tekan CTRL+C untuk menutup.");
            Task.Run(async () => await app.WaitForShutdownAsync()).GetAwaiter().GetResult();
            return;
        }

        Log("[OmniPOS Desktop] Stopping embedded engine...");
        Task.Run(async () =>
        {
            await app.StopAsync();
            await app.DisposeAsync();
        }).GetAwaiter().GetResult();
        Log("[OmniPOS Desktop] Aplikasi kasir berhasil ditutup.");
    }

    public static bool IsWebView2InstalledOnWindows()
    {
        if (!OperatingSystem.IsWindows()) return true;

        try
        {
            const string regKeyGuid = @"{F3017226-FE2A-4295-8BDF-00C3A9A7E4C5}";
            var subKeys = new[]
            {
                $@"SOFTWARE\WOW6432Node\Microsoft\EdgeUpdate\Clients\{regKeyGuid}",
                $@"SOFTWARE\Microsoft\EdgeUpdate\Clients\{regKeyGuid}"
            };

            foreach (var subKey in subKeys)
            {
                using var hklmKey = Registry.LocalMachine.OpenSubKey(subKey);
                var pv = hklmKey?.GetValue("pv") as string;
                if (!string.IsNullOrWhiteSpace(pv) && pv != "0.0.0.0") return true;
            }

            using var hkcuKey = Registry.CurrentUser.OpenSubKey($@"Software\Microsoft\EdgeUpdate\Clients\{regKeyGuid}");
            var hkcuPv = hkcuKey?.GetValue("pv") as string;
            if (!string.IsNullOrWhiteSpace(hkcuPv) && hkcuPv != "0.0.0.0") return true;
        }
        catch
        {
            // Abaikan query registry error
        }

        return false;
    }

    private static bool DownloadAndInstallWebView2(Action<string> log)
    {
        try
        {
            var setupPath = Path.Combine(Path.GetTempPath(), "MicrosoftEdgeWebview2Setup.exe");
            log($"[WebView2 Installer] Mengunduh runtime resmi Microsoft ke {setupPath}...");

            using (var httpClient = new HttpClient { Timeout = TimeSpan.FromMinutes(2) })
            {
                var bytes = httpClient.GetByteArrayAsync("https://go.microsoft.com/fwlink/p/?LinkId=2124703").GetAwaiter().GetResult();
                File.WriteAllBytes(setupPath, bytes);
            }

            log("[WebView2 Installer] Menjalankan installer silent...");
            var psi = new ProcessStartInfo
            {
                FileName = setupPath,
                Arguments = "/silent /install",
                UseShellExecute = true
            };
            var proc = Process.Start(psi);
            proc?.WaitForExit(120000);

            bool success = IsWebView2InstalledOnWindows();
            log($"[WebView2 Installer] Status akhir pemasangan WebView2: {success}");
            return success;
        }
        catch (Exception ex)
        {
            log($"[WebView2 Installer Error] Gagal memasang WebView2: {ex.Message}");
            return false;
        }
    }

    private static void TryOpenBrowser(string url)
    {
        try
        {
            if (OperatingSystem.IsWindows())
            {
                Process.Start(new ProcessStartInfo(url) { UseShellExecute = true });
            }
            else if (OperatingSystem.IsLinux())
            {
                Process.Start(new ProcessStartInfo("xdg-open", url) { UseShellExecute = false });
            }
            else if (OperatingSystem.IsMacOS())
            {
                Process.Start(new ProcessStartInfo("open", url) { UseShellExecute = false });
            }
        }
        catch (Exception ex)
        {
            Console.WriteLine($"[OmniPOS Browser Error] Tidak dapat membuka browser otomatis: {ex.Message}");
        }
    }
}
