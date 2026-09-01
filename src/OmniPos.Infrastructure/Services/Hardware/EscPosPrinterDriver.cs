using System.Net.Sockets;
using System.Text;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using OmniPos.Core.Interfaces;
using OmniPos.Infrastructure.Data;

namespace OmniPos.Infrastructure.Services.Hardware;

public class EscPosPrinterDriver : IPrintingService
{
    private readonly AppDbContext _context;
    private readonly ILogger<EscPosPrinterDriver> _logger;

    // Standard ESC/POS Control Commands
    private static readonly byte[] CmdInit = [27, 64];                // ESC @
    private static readonly byte[] CmdAlignLeft = [27, 97, 0];        // ESC a 0
    private static readonly byte[] CmdAlignCenter = [27, 97, 1];      // ESC a 1
    private static readonly byte[] CmdAlignRight = [27, 97, 2];       // ESC a 2
    private static readonly byte[] CmdBoldOn = [27, 69, 1];           // ESC E 1
    private static readonly byte[] CmdBoldOff = [27, 69, 0];          // ESC E 0
    private static readonly byte[] CmdDoubleSize = [29, 33, 17];      // GS ! 17 (2x Width & Height)
    private static readonly byte[] CmdNormalSize = [29, 33, 0];       // GS ! 0
    private static readonly byte[] CmdCutPaper = [29, 86, 66, 0];      // GS V 66 0 (Full Cut)
    private static readonly byte[] CmdOpenDrawer = [27, 112, 0, 25, 250]; // ESC p 0 25 250 (Kick Pin 2)

    public EscPosPrinterDriver(AppDbContext context, ILogger<EscPosPrinterDriver> logger)
    {
        _context = context;
        _logger = logger;
    }

    public async Task<bool> PrintReceiptAsync(string orderId, CancellationToken ct = default)
    {
        var order = await _context.Orders
            .Include(o => o.Items).ThenInclude(i => i.Modifiers)
            .Include(o => o.Payments)
            .Include(o => o.Customer)
            .FirstOrDefaultAsync(o => o.Id == orderId, ct);

        if (order == null)
        {
            _logger.LogWarning("Cannot print receipt: Order {OrderId} not found.", orderId);
            return false;
        }

        var storeName = await GetSettingAsync("STORE_NAME", "OmniPOS Store", ct);
        var storeAddress = await GetSettingAsync("STORE_ADDRESS", "Jl. Bisnis Modern No. 1", ct);
        var storePhone = await GetSettingAsync("STORE_PHONE", "0812-3456-7890", ct);
        var footerNote = await GetSettingAsync("RECEIPT_FOOTER", "Terima kasih atas kunjungan Anda!", ct);
        var isPaper80mm = (await GetSettingAsync("PAPER_SIZE", "80mm", ct)) == "80mm";
        var maxChars = isPaper80mm ? 42 : 32;

        using var ms = new MemoryStream();
        await ms.WriteAsync(CmdInit, ct);

        // Header
        await ms.WriteAsync(CmdAlignCenter, ct);
        await ms.WriteAsync(CmdDoubleSize, ct);
        await WriteTextAsync(ms, $"{storeName}\n", ct);
        await ms.WriteAsync(CmdNormalSize, ct);
        await WriteTextAsync(ms, $"{storeAddress}\n", ct);
        await WriteTextAsync(ms, $"Telp: {storePhone}\n", ct);
        await WriteTextAsync(ms, new string('-', maxChars) + "\n", ct);

        // Meta Info
        await ms.WriteAsync(CmdAlignLeft, ct);
        await WriteTextAsync(ms, $"No. Nota : {order.InvoiceNumber}\n", ct);
        await WriteTextAsync(ms, $"Tanggal  : {order.OrderDate.ToLocalTime():yyyy-MM-dd HH:mm:ss}\n", ct);
        await WriteTextAsync(ms, $"Kasir    : {order.CashierUserId}\n", ct);
        if (order.Customer != null)
        {
            await WriteTextAsync(ms, $"Member   : {order.Customer.Name} ({order.Customer.PhoneNumber})\n", ct);
        }
        await WriteTextAsync(ms, new string('-', maxChars) + "\n", ct);

        // Items
        foreach (var item in order.Items)
        {
            await ms.WriteAsync(CmdBoldOn, ct);
            await WriteTextAsync(ms, $"{item.ProductName}\n", ct);
            await ms.WriteAsync(CmdBoldOff, ct);

            var lineLeft = $"  {item.Quantity:N0} x {item.UnitPrice:N0}";
            var lineRight = $"{item.TotalPrice:N0}";
            var spaces = Math.Max(1, maxChars - lineLeft.Length - lineRight.Length);
            await WriteTextAsync(ms, $"{lineLeft}{new string(' ', spaces)}{lineRight}\n", ct);

            // Print IMEI / Serial Number and Warranty if attached
            if (!string.IsNullOrWhiteSpace(item.SerialNumber))
            {
                await WriteTextAsync(ms, $"   IMEI/SN: {item.SerialNumber}\n", ct);
                await WriteTextAsync(ms, $"   *Garansi Terdaftar Resmi & Toko\n", ct);
            }

            foreach (var mod in item.Modifiers)
            {
                var modLeft = $"   + {mod.ModifierName}";
                var modRight = mod.Price > 0 ? $"{mod.Price:N0}" : "";
                var modSpaces = Math.Max(1, maxChars - modLeft.Length - modRight.Length);
                await WriteTextAsync(ms, $"{modLeft}{new string(' ', modSpaces)}{modRight}\n", ct);
            }
        }

        await WriteTextAsync(ms, new string('-', maxChars) + "\n", ct);

        // Summary Lines
        await WriteSummaryLineAsync(ms, "Subtotal", $"{order.Subtotal:N0}", maxChars, ct);
        if (order.DiscountAmount > 0)
            await WriteSummaryLineAsync(ms, "Diskon", $"-{order.DiscountAmount:N0}", maxChars, ct);
        if (order.TaxAmount > 0)
            await WriteSummaryLineAsync(ms, "Pajak (PB1/PPN)", $"{order.TaxAmount:N0}", maxChars, ct);
        if (order.RoundingAmount != 0)
            await WriteSummaryLineAsync(ms, "Pembulatan", $"{order.RoundingAmount:N0}", maxChars, ct);

        await ms.WriteAsync(CmdBoldOn, ct);
        await WriteSummaryLineAsync(ms, "TOTAL", $"Rp {order.TotalAmount:N0}", maxChars, ct);
        await ms.WriteAsync(CmdBoldOff, ct);

        // Payments
        foreach (var payment in order.Payments)
        {
            await WriteSummaryLineAsync(ms, $"Bayar ({payment.Method})", $"{payment.Amount:N0}", maxChars, ct);
        }
        await WriteSummaryLineAsync(ms, "Kembalian", $"{order.ChangeAmount:N0}", maxChars, ct);

        // Footer
        await WriteTextAsync(ms, new string('-', maxChars) + "\n", ct);
        await ms.WriteAsync(CmdAlignCenter, ct);
        await WriteTextAsync(ms, $"{footerNote}\n\n\n\n", ct);

        // Cut Paper & Kick Drawer
        await ms.WriteAsync(CmdCutPaper, ct);
        await ms.WriteAsync(CmdOpenDrawer, ct);

        var receiptBytes = ms.ToArray();
        return await SendRawBytesToPrinterAsync(receiptBytes, ct);
    }

    public async Task<bool> PrintKitchenTicketAsync(string orderId, string? station = null, CancellationToken ct = default)
    {
        var order = await _context.Orders
            .Include(o => o.Items).ThenInclude(i => i.Modifiers)
            .Include(o => o.DiningTable)
            .FirstOrDefaultAsync(o => o.Id == orderId, ct);

        if (order == null) return false;

        using var ms = new MemoryStream();
        await ms.WriteAsync(CmdInit, ct);
        await ms.WriteAsync(CmdAlignCenter, ct);
        await ms.WriteAsync(CmdDoubleSize, ct);
        await WriteTextAsync(ms, $"TIKET DAPUR - {station ?? "KITCHEN"}\n", ct);
        await ms.WriteAsync(CmdNormalSize, ct);
        await WriteTextAsync(ms, $"Meja: {order.DiningTable?.TableNumber ?? "TAKEAWAY"}\n", ct);
        await WriteTextAsync(ms, $"Nota: {order.InvoiceNumber} | {DateTime.Now:HH:mm:ss}\n", ct);
        await WriteTextAsync(ms, new string('=', 32) + "\n", ct);

        await ms.WriteAsync(CmdAlignLeft, ct);
        var targetItems = order.Items.Where(i => station == null || i.KitchenStation == station).ToList();
        foreach (var item in targetItems)
        {
            await ms.WriteAsync(CmdBoldOn, ct);
            await WriteTextAsync(ms, $"[ ] {item.Quantity:N0}x {item.ProductName}\n", ct);
            await ms.WriteAsync(CmdBoldOff, ct);
            foreach (var mod in item.Modifiers)
            {
                await WriteTextAsync(ms, $"    * {mod.ModifierName}\n", ct);
            }
            if (!string.IsNullOrEmpty(item.Notes))
            {
                await WriteTextAsync(ms, $"    Note: {item.Notes}\n", ct);
            }
        }

        await WriteTextAsync(ms, "\n\n\n", ct);
        await ms.WriteAsync(CmdCutPaper, ct);

        return await SendRawBytesToPrinterAsync(ms.ToArray(), ct);
    }

    public async Task<bool> OpenCashDrawerAsync(CancellationToken ct = default)
    {
        return await SendRawBytesToPrinterAsync(CmdOpenDrawer, ct);
    }

    public async Task<bool> PrintTestSlipAsync(CancellationToken ct = default)
    {
        var isPaper80mm = (await GetSettingAsync("PAPER_SIZE", "80mm", ct)) == "80mm";
        var maxChars = isPaper80mm ? 42 : 32;

        using var ms = new MemoryStream();
        await ms.WriteAsync(CmdInit, ct);
        await ms.WriteAsync(CmdAlignCenter, ct);
        await ms.WriteAsync(CmdDoubleSize, ct);
        await WriteTextAsync(ms, "OMNIPOS HARDWARE TEST\n", ct);
        await ms.WriteAsync(CmdNormalSize, ct);
        await WriteTextAsync(ms, $"Waktu: {DateTime.Now:yyyy-MM-dd HH:mm:ss}\n", ct);
        await WriteTextAsync(ms, new string('=', maxChars) + "\n", ct);
        await ms.WriteAsync(CmdAlignLeft, ct);
        await WriteTextAsync(ms, "Status Koneksi : TERHUBUNG (ONLINE)\n", ct);
        await WriteTextAsync(ms, $"Lebar Kertas   : {maxChars} Karakter ({await GetSettingAsync("PAPER_SIZE", "80mm", ct)})\n", ct);
        await WriteTextAsync(ms, $"Driver Mode    : {await GetSettingAsync("PRINTER_TYPE", "VIRTUAL", ct)}\n", ct);
        await WriteTextAsync(ms, new string('-', maxChars) + "\n", ct);
        await ms.WriteAsync(CmdBoldOn, ct);
        await WriteTextAsync(ms, "Tes Teks Tebal (Bold): BERHASIL OK\n", ct);
        await ms.WriteAsync(CmdBoldOff, ct);
        await WriteTextAsync(ms, "Tes Pemotong Kertas & Laci: DIUJI\n", ct);
        await WriteTextAsync(ms, "\n\n\n\n", ct);
        await ms.WriteAsync(CmdCutPaper, ct);

        return await SendRawBytesToPrinterAsync(ms.ToArray(), ct);
    }

    private static async Task WriteTextAsync(MemoryStream ms, string text, CancellationToken ct)
    {
        var bytes = Encoding.GetEncoding("ASCII", new EncoderReplacementFallback("?"), new DecoderReplacementFallback("?")).GetBytes(text);
        await ms.WriteAsync(bytes, ct);
    }

    private static async Task WriteSummaryLineAsync(MemoryStream ms, string label, string val, int maxChars, CancellationToken ct)
    {
        var spaces = Math.Max(1, maxChars - label.Length - val.Length);
        await WriteTextAsync(ms, $"{label}{new string(' ', spaces)}{val}\n", ct);
    }

    private async Task<string> GetSettingAsync(string key, string fallback, CancellationToken ct)
    {
        var setting = await _context.AppSettings.FirstOrDefaultAsync(s => s.SettingKey == key, ct);
        return setting?.SettingValue ?? fallback;
    }

    private async Task<bool> SendRawBytesToPrinterAsync(byte[] bytes, CancellationToken ct)
    {
        var printerType = await GetSettingAsync("PRINTER_TYPE", "VIRTUAL", ct);
        var printerIp = await GetSettingAsync("PRINTER_IP", "127.0.0.1", ct);
        var printerPort = int.Parse(await GetSettingAsync("PRINTER_PORT", "9100", ct));

        if (printerType == "RAW_USB" || printerType == "USB_DIRECT")
        {
            try
            {
                string[] possiblePorts = ["/dev/usb/lp0", "/dev/usb/lp1", "/dev/usb/lp2", "/dev/ttyUSB0", "/dev/ttyACM0"];
                var activePort = possiblePorts.FirstOrDefault(File.Exists);
                if (activePort != null)
                {
                    await File.WriteAllBytesAsync(activePort, bytes, ct);
                    _logger.LogInformation("Receipt successfully dispatched to physical USB port {Port} ({Count} bytes).", activePort, bytes.Length);
                    return true;
                }

                _logger.LogWarning("Physical USB thermal printer port (/dev/usb/lp*) not found.");
                return false;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to write raw bytes to physical USB printer port.");
                return false;
            }
        }

        if (printerType == "NETWORK_LAN")
        {
            try
            {
                using var client = new TcpClient();
                var connectTask = client.ConnectAsync(printerIp, printerPort, ct);
                var delayTask = Task.Delay(1500, ct);
                var completed = await Task.WhenAny(connectTask.AsTask(), delayTask);
                if (completed != connectTask.AsTask() || !client.Connected)
                {
                    _logger.LogWarning("Network printer at {Ip}:{Port} is unreachable.", printerIp, printerPort);
                    return false;
                }

                using var stream = client.GetStream();
                await stream.WriteAsync(bytes, ct);
                await stream.FlushAsync(ct);
                _logger.LogInformation("Receipt dispatched to network printer {Ip}:{Port} ({Count} bytes).", printerIp, printerPort, bytes.Length);
                return true;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to print via network TCP to {Ip}:{Port}", printerIp, printerPort);
                return false;
            }
        }

        // Virtual Driver Mode
        _logger.LogInformation("Virtual printer received {Count} bytes.", bytes.Length);
        return true;
    }
}
