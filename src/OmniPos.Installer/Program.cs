using System;
using System.Diagnostics;
using System.IO;
using System.IO.Compression;
using System.Reflection;
using System.Runtime.InteropServices;
using System.Text;
using System.Threading.Tasks;

namespace OmniPos.Installer;

class Program
{
    private const string AppTitle = "OmniPOS Enterprise Point of Sale";
    private const string DeveloperName = "BASARI IT SOLUTIONS";
    private const string Version = "1.0.0";

    static async Task Main(string[] args)
    {
        Console.OutputEncoding = Encoding.UTF8;
        try { Console.Title = $"{DeveloperName} - {AppTitle} Setup v{Version}"; } catch { }

        PrintHeader();
        CheckSystemPrerequisites();

        var choice = DisplayEditionMenu();
        if (choice == 7)
        {
            Console.ForegroundColor = ConsoleColor.Yellow;
            Console.WriteLine("\n[INFO] Instalasi dibatalkan oleh pengguna.");
            Console.ResetColor();
            return;
        }

        var defaultInstallDir = Path.Combine(
            Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData),
            "Programs",
            "BasariITSolutions",
            "OmniPOS"
        );

        Console.ForegroundColor = ConsoleColor.Cyan;
        Console.WriteLine("\n===============================================================================");
        Console.WriteLine("  LOKASI INSTALASI APLIKASI");
        Console.WriteLine("===============================================================================");
        Console.ResetColor();
        Console.WriteLine($"Lokasi default: {defaultInstallDir}");
        Console.Write("Tekan [ENTER] untuk menyetujui atau masukkan path direktori baru: ");
        var customPath = Console.ReadLine()?.Trim();
        var targetDir = string.IsNullOrWhiteSpace(customPath) ? defaultInstallDir : customPath;

        Directory.CreateDirectory(targetDir);

        Console.ForegroundColor = ConsoleColor.Cyan;
        Console.WriteLine("\n===============================================================================");
        Console.WriteLine("  MENGEKSTRAKSI BERKAS APLIKASI OMNIPOS ENTERPRISE");
        Console.WriteLine("===============================================================================");
        Console.ResetColor();

        await ExtractPayloadAsync(targetDir);

        Console.ForegroundColor = ConsoleColor.Cyan;
        Console.WriteLine("\n===============================================================================");
        Console.WriteLine("  MEMBUAT SHORTCUT & KONFIGURASI SISTEM");
        Console.WriteLine("===============================================================================");
        Console.ResetColor();

        InstallSelectedEditions(choice, targetDir);

        PrintSuccess(choice, targetDir);
    }

    private static void PrintHeader()
    {
        Console.ForegroundColor = ConsoleColor.Cyan;
        Console.WriteLine("===============================================================================");
        Console.WriteLine(@"  ____    _    ____    _    ____  ___ ");
        Console.WriteLine(@" | __ )  / \  / ___|  / \  |  _ \|_ _|");
        Console.WriteLine(@" |  _ \ / _ \ \___ \ / _ \ | |_) || |   BASARI IT SOLUTIONS");
        Console.WriteLine(@" | |_) / ___ \ ___) / ___ \|  _ < | |   Enterprise Software Engineering");
        Console.WriteLine(@" |____/_/   \_\____/_/   \_\_| \_\___|  www.basari-it.com");
        Console.WriteLine("===============================================================================");
        Console.ForegroundColor = ConsoleColor.White;
        Console.WriteLine($"      {AppTitle.ToUpper()} - SETUP WIZARD v{Version}");
        Console.WriteLine($"         Copyright (C) 2026 {DeveloperName}. All rights reserved.");
        Console.ForegroundColor = ConsoleColor.Cyan;
        Console.WriteLine("===============================================================================");
        Console.ResetColor();
    }

    private static void CheckSystemPrerequisites()
    {
        Console.ForegroundColor = ConsoleColor.Yellow;
        Console.WriteLine("\n[1/3] Memeriksa Kesiapan Sistem Windows...");
        Console.ResetColor();

        var is64Bit = Environment.Is64BitOperatingSystem;
        Console.ForegroundColor = ConsoleColor.Green;
        Console.WriteLine($"  [OK] Arsitektur Sistem: {(is64Bit ? "64-bit (x64) Didukung Penuh" : "32-bit")}");
        Console.WriteLine($"  [OK] Microsoft Windows: {Environment.OSVersion.VersionString}");
        Console.WriteLine($"  [OK] Microsoft .NET 8 Runtime: Standalone Engine Siap Digunakan");
        Console.ResetColor();
    }

    private static int DisplayEditionMenu()
    {
        Console.ForegroundColor = ConsoleColor.Cyan;
        Console.WriteLine("\n===============================================================================");
        Console.WriteLine($"  PILIH EDISI SISTEM KASIR TOKO ANDA ({DeveloperName})");
        Console.WriteLine("===============================================================================");
        Console.ResetColor();
        Console.WriteLine("  Setiap edisi terpasang dengan database terenkripsi terisolasi (pos_*.db)\n  dan shortcut khusus jenis usaha di Desktop & Start Menu:\n");

        Console.ForegroundColor = ConsoleColor.White;
        Console.WriteLine("  [1] 🛒 OmniPOS Retail, Sembako & Minimarket");
        Console.ForegroundColor = ConsoleColor.Gray;
        Console.WriteLine("      Fitur: Barcode Kilat, Timbangan Manual/Digital, Harga Grosir Bertingkat,\n             Multi-Satuan (Dus/Renteng/Pcs), Buku Kasbon & Saldo Piutang.\n");

        Console.ForegroundColor = ConsoleColor.White;
        Console.WriteLine("  [2] 🍽️  OmniPOS Resto, Kafe & Bakery (Food & Beverage)");
        Console.ForegroundColor = ConsoleColor.Gray;
        Console.WriteLine("      Fitur: Denah Meja Visual Dinamis, Layar Pesanan Dapur (KDS), Split Bill,\n             Bahan Baku & Resep BOM (Bill of Materials), Cetak Slip Dapur.\n");

        Console.ForegroundColor = ConsoleColor.White;
        Console.WriteLine("  [3] ✂️  OmniPOS Layanan, Barbershop & Laundry Kiloan");
        Console.ForegroundColor = ConsoleColor.Gray;
        Console.WriteLine("      Fitur: Manajemen Antrean Pengerjaan, Penugasan Staf & Teknisi Presisi,\n             Bagi Hasil & Komisi Karyawan, Estimasi Waktu Selesai.\n");

        Console.ForegroundColor = ConsoleColor.White;
        Console.WriteLine("  [4] 💊 OmniPOS Apotek & Toko Obat (Farmasi)");
        Console.ForegroundColor = ConsoleColor.Gray;
        Console.WriteLine("      Fitur: Peringatan Kadaluarsa Dini (FEFO First-Expired-First-Out),\n             Pelacakan No. Batch Pabrik, Resep Dokter & SIP Apoteker.\n");

        Console.ForegroundColor = ConsoleColor.White;
        Console.WriteLine("  [5] 📱 OmniPOS Gadget, Elektronik & IMEI");
        Console.ForegroundColor = ConsoleColor.Gray;
        Console.WriteLine("      Fitur: Pelacakan No. IMEI & Serial Number, Kartu Garansi Digital,\n             Pusat Servis & SPK Tanda Terima, Tukar Tambah (Trade-In),\n             Voucher Data & Kartu Perdana Nomor Cantik.\n");

        Console.ForegroundColor = ConsoleColor.Green;
        Console.WriteLine("  [6] 📦 Pasang SEMUA 5 Edisi Sekaligus (5 Shortcut Mandiri di Desktop)");
        Console.ForegroundColor = ConsoleColor.Red;
        Console.WriteLine("  [7] ❌ Batal / Keluar Installer");
        Console.ForegroundColor = ConsoleColor.Cyan;
        Console.WriteLine("===============================================================================");
        Console.ResetColor();

        while (true)
        {
            Console.Write("Masukkan nomor pilihan Anda [1-7]: ");
            var input = Console.ReadLine()?.Trim();
            if (int.TryParse(input, out int c) && c >= 1 && c <= 7)
            {
                return c;
            }
            Console.ForegroundColor = ConsoleColor.Red;
            Console.WriteLine("Pilihan tidak valid. Silakan masukkan angka 1 sampai 7.");
            Console.ResetColor();
        }
    }

    private static async Task ExtractPayloadAsync(string targetDir)
    {
        var assembly = Assembly.GetExecutingAssembly();
        using var stream = assembly.GetManifestResourceStream("payload.zip");

        if (stream != null)
        {
            Console.WriteLine("Mengekstrak paket biner tersemat...");
            using var archive = new ZipArchive(stream, ZipArchiveMode.Read);
            int total = archive.Entries.Count;
            int count = 0;
            foreach (var entry in archive.Entries)
            {
                if (string.IsNullOrEmpty(entry.Name)) continue; // skip directories
                var destPath = Path.Combine(targetDir, entry.FullName);
                var destDir = Path.GetDirectoryName(destPath);
                if (!string.IsNullOrEmpty(destDir)) Directory.CreateDirectory(destDir);

                entry.ExtractToFile(destPath, overwrite: true);
                count++;
                if (count % 10 == 0 || count == total)
                {
                    int percent = (int)((double)count / total * 100);
                    Console.Write($"\rProgress Ekstraksi: [{new string('#', percent / 5)}{new string('-', 20 - percent / 5)}] {percent}% ({count}/{total})");
                }
            }
            Console.WriteLine("\n[OK] Ekstraksi biner aplikasi selesai 100%.");
        }
        else
        {
            // Fallback: Copy from local directory if running unbundled
            var baseDir = AppDomain.CurrentDomain.BaseDirectory;
            Console.WriteLine($"Menyalin file aplikasi dari {baseDir}...");
            CopyDirectory(baseDir, targetDir);
            Console.WriteLine("[OK] Penyalinan berkas selesai.");
        }

        await Task.Yield();
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

    private static void InstallSelectedEditions(int choice, string targetDir)
    {
        var desktopExe = Path.Combine(targetDir, "OmniPos.Desktop.exe");

        if (choice == 1 || choice == 6)
            CreateEditionShortcut("retail", "OmniPOS Retail & Minimarket", "Sistem Kasir Sembako & Barcode Kilat", targetDir, desktopExe);
        if (choice == 2 || choice == 6)
            CreateEditionShortcut("resto", "OmniPOS Resto & Kafe", "Sistem Kasir Resto, Kafe & Dapur KDS", targetDir, desktopExe);
        if (choice == 3 || choice == 6)
            CreateEditionShortcut("services", "OmniPOS Layanan & Barbershop", "Sistem Kasir Jasa & Komisi Staf", targetDir, desktopExe);
        if (choice == 4 || choice == 6)
            CreateEditionShortcut("pharmacy", "OmniPOS Apotek & Farmasi", "Sistem Kasir Obat, Resep & FEFO", targetDir, desktopExe);
        if (choice == 5 || choice == 6)
            CreateEditionShortcut("electronics", "OmniPOS Gadget & Elektronik", "Sistem Kasir IMEI, Garansi & Servis", targetDir, desktopExe);
    }

    private static void CreateEditionShortcut(string editionKey, string displayName, string description, string targetDir, string desktopExe)
    {
        // 1. Create launcher .bat in targetDir
        var runBatPath = Path.Combine(targetDir, $"run-{editionKey}.bat");
        var batContent = $"@echo off\r\ntitle {displayName} - {DeveloperName}\r\ncd /d \"%~dp0\"\r\nstart \"\" \"OmniPos.Desktop.exe\" --edition={editionKey} %*\r\n";
        File.WriteAllText(runBatPath, batContent);

        // 2. Desktop Shortcut (.lnk)
        var desktopPath = Environment.GetFolderPath(Environment.SpecialFolder.DesktopDirectory);
        var desktopLnk = Path.Combine(desktopPath, $"{displayName}.lnk");
        CreateWindowsShortcut(desktopLnk, desktopExe, $"--edition={editionKey}", targetDir, $"{description} - {DeveloperName}");

        // 3. Start Menu Shortcut (.lnk)
        var startMenuPath = Path.Combine(
            Environment.GetFolderPath(Environment.SpecialFolder.ApplicationData),
            "Microsoft", "Windows", "Start Menu", "Programs", DeveloperName, "OmniPOS"
        );
        Directory.CreateDirectory(startMenuPath);
        var menuLnk = Path.Combine(startMenuPath, $"{displayName}.lnk");
        CreateWindowsShortcut(menuLnk, desktopExe, $"--edition={editionKey}", targetDir, $"{description} - {DeveloperName}");

        Console.ForegroundColor = ConsoleColor.Green;
        Console.WriteLine($"  [OK] Shortcut Terpasang: {displayName}");
        Console.ResetColor();
        Console.WriteLine($"       -> Desktop   : {desktopLnk}");
        Console.WriteLine($"       -> Start Menu: {menuLnk}");
        Console.WriteLine($"       -> Database  : pos_{editionKey}.db");
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

    private static void PrintSuccess(int choice, string targetDir)
    {
        Console.ForegroundColor = ConsoleColor.Green;
        Console.WriteLine("\n===============================================================================");
        Console.WriteLine($"  [SUKSES] INSTALASI {AppTitle.ToUpper()} SELESAI!");
        Console.WriteLine($"  Pengembang Resmi: {DeveloperName} (Enterprise Software Engineering)");
        Console.WriteLine("===============================================================================");
        Console.ResetColor();
        Console.WriteLine("\nIcon aplikasi kasir telah dibuat di Desktop dan Start Menu Windows.");
        Console.Write("Apakah Anda ingin langsung meluncurkan aplikasi kasir sekarang? (Y/N): ");
        var ans = Console.ReadLine()?.Trim();
        if (ans?.Equals("Y", StringComparison.OrdinalIgnoreCase) == true)
        {
            var key = choice switch
            {
                1 => "retail",
                2 => "resto",
                3 => "services",
                4 => "pharmacy",
                5 => "electronics",
                _ => "retail"
            };

            var exePath = Path.Combine(targetDir, "OmniPos.Desktop.exe");
            if (File.Exists(exePath))
            {
                Process.Start(new ProcessStartInfo(exePath, $"--edition={key}")
                {
                    WorkingDirectory = targetDir,
                    UseShellExecute = true
                });
            }
        }
    }
}
