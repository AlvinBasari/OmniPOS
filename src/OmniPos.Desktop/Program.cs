using System;
using System.IO;
using System.Linq;
using System.Net.Http;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Builder;
using Microsoft.Extensions.Hosting;
using Photino.NET;
using OmniPos.Server;

namespace OmniPos.Desktop;

internal static class Program
{
    [STAThread]
    private static void Main(string[] args)
    {
        MainAsync(args).GetAwaiter().GetResult();
    }

    private static async Task MainAsync(string[] args)
    {
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

        // Jika tidak diatur via CLI args eksplisit, periksa Environment Variable atau edition.txt
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
                    var fileContent = (await File.ReadAllTextAsync(editionConfigFile)).Trim().ToLowerInvariant();
                    if (!string.IsNullOrWhiteSpace(fileContent)) edition = fileContent;
                }
                else if (File.Exists(cwdConfigFile))
                {
                    var fileContent = (await File.ReadAllTextAsync(cwdConfigFile)).Trim().ToLowerInvariant();
                    if (!string.IsNullOrWhiteSpace(fileContent)) edition = fileContent;
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

        Console.WriteLine("==========================================================");
        Console.WriteLine($" {windowTitle}");
        Console.WriteLine(" Multi-Platform: Linux (WebKitGTK) & Windows 11 (WebView2)");
        Console.WriteLine("==========================================================");

        WebApplication? app = null;
        int activePort = 5000;
        string activeUrl = "http://127.0.0.1:5000";

        // 3. Cari port bebas dan nyalakan Kestrel dengan database terisolasi
        for (int p = 5000; p <= 5030; p++)
        {
            try
            {
                app = await ServerAppBuilder.BuildAsync(args, p, edition);
                app.Urls.Clear();
                app.Urls.Add($"http://127.0.0.1:{p}");
                await app.StartAsync();
                activePort = p;
                activeUrl = $"http://127.0.0.1:{activePort}";
                Console.WriteLine($"[OmniPOS Engine] Berhasil aktif ({edition}) & mendengarkan pada: {activeUrl}");
                break;
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[OmniPOS Engine] Port {p} belum siap ({ex.Message}), mencoba port berikutnya...");
                if (app != null)
                {
                    await app.DisposeAsync();
                    app = null;
                }
            }
        }

        if (app == null)
        {
            Console.WriteLine("[OmniPOS Fatal] Gagal menginisialisasi server backend pada rentang port 5000-5030.");
            return;
        }

        // 4. Verifikasi kesiapan endpoint dengan HTTP probe
        try
        {
            using var httpClient = new HttpClient { Timeout = TimeSpan.FromSeconds(2) };
            var res = await httpClient.GetAsync($"{activeUrl}/api/v1/products");
            Console.WriteLine($"[OmniPOS Engine] Probe HTTP 200 OK ({res.StatusCode})");
        }
        catch (Exception ex)
        {
            Console.WriteLine($"[OmniPOS Probe Notice] {ex.Message}");
        }

        // 5. Luncurkan Jendela Desktop Native Photino atau Mode Headless
        bool isHeadless = args.Contains("--no-gui") || args.Contains("--headless") || Environment.GetEnvironmentVariable("OMNIPOS_NO_GUI") == "1";
        if (isHeadless)
        {
            Console.WriteLine("[OmniPOS Engine] Mode Headless aktif. Server backend berjalan tanpa UI desktop...");
            Console.WriteLine($"[OmniPOS Engine] Buka antarmuka kasir di browser: {activeUrl}");
            await app.WaitForShutdownAsync();
            return;
        }

        bool nativeWindowSuccess = false;
        var launchTime = DateTime.UtcNow;

        try
        {
            var window = new PhotinoWindow()
                .SetTitle(windowTitle)
                .SetUseOsDefaultLocation(true)
                .SetUseOsDefaultSize(false)
                .SetSize(1366, 800)
                .SetMinSize(1024, 700)
                .SetResizable(true)
                .SetDevToolsEnabled(true)
                .Load(activeUrl);

            Console.WriteLine("[OmniPOS Desktop] Window initialized successfully. Running native event loop...");
            window.WaitForClose();
            nativeWindowSuccess = true;

            // Jika jendela tertutup seketika (< 2 detik setelah buka), kemungkinan terjadi WebKit/Display crash
            if ((DateTime.UtcNow - launchTime).TotalSeconds < 2)
            {
                Console.WriteLine("[OmniPOS Notice] Jendela native ditutup cepat. Mengaktifkan fallback browser web...");
                nativeWindowSuccess = false;
            }
        }
        catch (Exception ex)
        {
            Console.WriteLine($"[OmniPOS Desktop Notice] Native window error: {ex.Message}");
            nativeWindowSuccess = false;
        }

        if (!nativeWindowSuccess)
        {
            Console.WriteLine($"[OmniPOS Browser Fallback] Membuka antarmuka kasir otomatis di Web Browser: {activeUrl}");
            TryOpenBrowser(activeUrl);
            Console.WriteLine("[OmniPOS Engine] Server kasir tetap aktif di background. Tekan CTRL+C untuk menutup.");
            await app.WaitForShutdownAsync();
            return;
        }

        Console.WriteLine("[OmniPOS Desktop] Stopping embedded engine...");
        await app.StopAsync();
        await app.DisposeAsync();
    }

    private static void TryOpenBrowser(string url)
    {
        try
        {
            if (OperatingSystem.IsWindows())
            {
                System.Diagnostics.Process.Start(new System.Diagnostics.ProcessStartInfo(url) { UseShellExecute = true });
            }
            else if (OperatingSystem.IsLinux())
            {
                System.Diagnostics.Process.Start(new System.Diagnostics.ProcessStartInfo("xdg-open", url) { UseShellExecute = false });
            }
            else if (OperatingSystem.IsMacOS())
            {
                System.Diagnostics.Process.Start(new System.Diagnostics.ProcessStartInfo("open", url) { UseShellExecute = false });
            }
        }
        catch (Exception ex)
        {
            Console.WriteLine($"[OmniPOS Browser Error] Tidak dapat membuka browser otomatis: {ex.Message}");
        }
    }
}
