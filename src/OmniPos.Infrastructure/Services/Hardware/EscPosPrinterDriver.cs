using System.Diagnostics;
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
    private static readonly byte[] CmdDoubleHeight = [29, 33, 1];     // GS ! 1
    private static readonly byte[] CmdDoubleWidth = [29, 33, 16];     // GS ! 16
    private static readonly byte[] CmdNormalSize = [29, 33, 0];       // GS ! 0
    private static readonly byte[] CmdSelectFontA = [27, 77, 0];      // ESC M 0 (Font A 12x24 standard)
    private static readonly byte[] CmdSelectFontB = [27, 77, 1];      // ESC M 1 (Font B 9x17 condensed)
    private static readonly byte[] CmdCutPaperFull = [29, 86, 66, 0]; // GS V 66 0 (Full Cut)
    private static readonly byte[] CmdCutPaperPartial = [29, 86, 66, 1]; // GS V 66 1 (Partial Cut)
    private static readonly byte[] CmdOpenDrawerPin2 = [27, 112, 0, 25, 250]; // ESC p 0 25 250 (Kick Pin 2)
    private static readonly byte[] CmdOpenDrawerPin5 = [27, 112, 1, 25, 250]; // ESC p 1 25 250 (Kick Pin 5)

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

        // 1. Enterprise Configuration Parameters
        var storeName = await GetSettingAsync("STORE_NAME", "OmniPOS Store", ct);
        var storeSubtitle = await GetSettingAsync("RECEIPT_HEADER_SUBTITLE", "", ct);
        var storeAddress = await GetSettingAsync("STORE_ADDRESS", "Jl. Bisnis Modern No. 1", ct);
        var storePhone = await GetSettingAsync("STORE_PHONE", "0812-3456-7890", ct);
        var footerNote = await GetSettingAsync("RECEIPT_FOOTER", "Terima kasih atas kunjungan Anda!", ct);
        var policyNote = await GetSettingAsync("RECEIPT_POLICY_NOTE", "Barang yang dibeli tidak dapat ditukar/dikembalikan kecuali cacat produksi maks 1x24 jam.", ct);
        
        var paperSize = await GetSettingAsync("PAPER_SIZE", "80mm", ct);
        var isPaper80mm = paperSize == "80mm";
        var defaultMaxChars = isPaper80mm ? 42 : 32;
        var configuredMaxChars = int.TryParse(await GetSettingAsync("PRINT_MAX_CHARS", defaultMaxChars.ToString(), ct), out var mc) && mc >= 20 ? mc : defaultMaxChars;
        var leftMargin = int.TryParse(await GetSettingAsync("PRINT_LEFT_MARGIN", "0", ct), out var lm) ? Math.Max(0, Math.Min(10, lm)) : 0;
        var maxChars = Math.Max(20, configuredMaxChars - leftMargin);
        var marginPrefix = new string(' ', leftMargin);

        var feedLines = int.TryParse(await GetSettingAsync("PRINT_FEED_LINES", "3", ct), out var fl) ? Math.Max(1, Math.Min(8, fl)) : 3;
        var cutMode = await GetSettingAsync("PRINT_CUT_MODE", "FULL", ct);
        var fontStyle = await GetSettingAsync("PRINT_FONT_STYLE", "FONT_A", ct);
        var autoDrawer = await GetSettingAsync("PRINT_AUTO_DRAWER", "AFTER", ct);
        var drawerPin = await GetSettingAsync("DRAWER_PIN", "PIN_2", ct);

        var showTaxDetail = (await GetSettingAsync("RECEIPT_SHOW_TAX_DETAIL", "true", ct)) == "true";
        var showDiscount = (await GetSettingAsync("RECEIPT_SHOW_DISCOUNT", "true", ct)) == "true";
        var showLoyalty = (await GetSettingAsync("RECEIPT_SHOW_LOYALTY", "true", ct)) == "true";
        var showWifi = (await GetSettingAsync("RECEIPT_SHOW_WIFI", "false", ct)) == "true";
        var wifiName = await GetSettingAsync("RECEIPT_WIFI_NAME", "OmniPOS_Guest", ct);
        var wifiPass = await GetSettingAsync("RECEIPT_WIFI_PASSWORD", "belanjamurah", ct);

        var qrMode = await GetSettingAsync("RECEIPT_QR_MODE", "NONE", ct);
        var qrContent = await GetSettingAsync("RECEIPT_QR_CONTENT", "", ct);

        using var ms = new MemoryStream();
        await ms.WriteAsync(CmdInit, ct);

        // Font Style (Font A = Normal 12x24, Font B = Condensed 9x17)
        await ms.WriteAsync(fontStyle == "FONT_B" ? CmdSelectFontB : CmdSelectFontA, ct);

        // Drawer Kick Before Print if configured
        if (autoDrawer == "BEFORE")
        {
            var kickCmd = drawerPin == "PIN_5" ? CmdOpenDrawerPin5 : CmdOpenDrawerPin2;
            await ms.WriteAsync(kickCmd, ct);
        }

        // Header
        await ms.WriteAsync(CmdAlignCenter, ct);
        await ms.WriteAsync(CmdDoubleSize, ct);
        await WriteTextAsync(ms, $"{marginPrefix}{storeName}\n", ct);
        await ms.WriteAsync(CmdNormalSize, ct);

        if (!string.IsNullOrWhiteSpace(storeSubtitle))
        {
            await WriteTextAsync(ms, $"{marginPrefix}{storeSubtitle}\n", ct);
        }
        if (!string.IsNullOrWhiteSpace(storeAddress))
        {
            await WriteTextAsync(ms, $"{marginPrefix}{storeAddress}\n", ct);
        }
        if (!string.IsNullOrWhiteSpace(storePhone))
        {
            await WriteTextAsync(ms, $"{marginPrefix}Telp: {storePhone}\n", ct);
        }
        await WriteTextAsync(ms, $"{marginPrefix}{new string('=', maxChars)}\n", ct);

        // Meta Info
        await ms.WriteAsync(CmdAlignLeft, ct);
        await WriteTextAsync(ms, $"{marginPrefix}No. Nota : {order.InvoiceNumber}\n", ct);
        await WriteTextAsync(ms, $"{marginPrefix}Tanggal  : {order.OrderDate.ToLocalTime():yyyy-MM-dd HH:mm}\n", ct);
        await WriteTextAsync(ms, $"{marginPrefix}Kasir    : {order.CashierUserId}\n", ct);
        if (order.Customer != null)
        {
            await WriteTextAsync(ms, $"{marginPrefix}Member   : {order.Customer.Name} ({order.Customer.PhoneNumber})\n", ct);
            if (!string.IsNullOrEmpty(order.Customer.MemberTier))
            {
                await WriteTextAsync(ms, $"{marginPrefix}Tier     : {order.Customer.MemberTier} (VIP)\n", ct);
            }
        }
        await WriteTextAsync(ms, $"{marginPrefix}{new string('-', maxChars)}\n", ct);

        // Items
        foreach (var item in order.Items)
        {
            await ms.WriteAsync(CmdBoldOn, ct);
            await WriteTextAsync(ms, $"{marginPrefix}{item.ProductName}\n", ct);
            await ms.WriteAsync(CmdBoldOff, ct);

            var lineLeft = $"  {item.Quantity:N0} x {item.UnitPrice:N0}";
            var lineRight = $"{item.TotalPrice:N0}";
            var spaces = Math.Max(1, maxChars - lineLeft.Length - lineRight.Length);
            await WriteTextAsync(ms, $"{marginPrefix}{lineLeft}{new string(' ', spaces)}{lineRight}\n", ct);

            // IMEI / Serial Number
            if (!string.IsNullOrWhiteSpace(item.SerialNumber))
            {
                await WriteTextAsync(ms, $"{marginPrefix}   SN/IMEI: {item.SerialNumber}\n", ct);
                await WriteTextAsync(ms, $"{marginPrefix}   *Garansi Terdaftar Toko\n", ct);
            }

            // Modifiers / Toppings
            foreach (var mod in item.Modifiers)
            {
                var modLeft = $"   + {mod.ModifierName}";
                var modRight = mod.Price > 0 ? $"{mod.Price:N0}" : "";
                var modSpaces = Math.Max(1, maxChars - modLeft.Length - modRight.Length);
                await WriteTextAsync(ms, $"{marginPrefix}{modLeft}{new string(' ', modSpaces)}{modRight}\n", ct);
            }

            // Item Discount
            if (showDiscount && item.DiscountAmount > 0)
            {
                var discLeft = "   (Diskon Item)";
                var discRight = $"-{item.DiscountAmount:N0}";
                var dSpaces = Math.Max(1, maxChars - discLeft.Length - discRight.Length);
                await WriteTextAsync(ms, $"{marginPrefix}{discLeft}{new string(' ', dSpaces)}{discRight}\n", ct);
            }
        }

        await WriteTextAsync(ms, $"{marginPrefix}{new string('-', maxChars)}\n", ct);

        // Summary Calculations
        await WriteSummaryLineAsync(ms, "Subtotal", $"{order.Subtotal:N0}", maxChars, marginPrefix, ct);

        if (showDiscount && order.DiscountAmount > 0)
        {
            await WriteSummaryLineAsync(ms, "Diskon Nota/Voucher", $"-{order.DiscountAmount:N0}", maxChars, marginPrefix, ct);
        }

        if (showTaxDetail && order.TaxAmount > 0)
        {
            await WriteSummaryLineAsync(ms, "PPN / Pajak", $"{order.TaxAmount:N0}", maxChars, marginPrefix, ct);
        }

        if (order.ServiceChargeAmount > 0)
        {
            await WriteSummaryLineAsync(ms, "Biaya Layanan", $"{order.ServiceChargeAmount:N0}", maxChars, marginPrefix, ct);
        }

        // Grand Total (Bold)
        await ms.WriteAsync(CmdBoldOn, ct);
        await WriteSummaryLineAsync(ms, "TOTAL AKHIR", $"Rp {order.TotalAmount:N0}", maxChars, marginPrefix, ct);
        await ms.WriteAsync(CmdBoldOff, ct);

        // Payments Breakdown
        foreach (var p in order.Payments)
        {
            var pName = p.Method switch
            {
                OmniPos.Core.Enums.PaymentMethod.Cash => "Bayar Tunai (Cash)",
                OmniPos.Core.Enums.PaymentMethod.QrisDynamic => "QRIS Dinamis",
                OmniPos.Core.Enums.PaymentMethod.QrisStatic => "QRIS Statis",
                OmniPos.Core.Enums.PaymentMethod.DebitCard => "Kartu Debit",
                OmniPos.Core.Enums.PaymentMethod.CreditCard => "Kartu Kredit",
                OmniPos.Core.Enums.PaymentMethod.BankTransfer => "Transfer Bank",
                OmniPos.Core.Enums.PaymentMethod.CustomerReceivable => "Kasbon / Piutang",
                OmniPos.Core.Enums.PaymentMethod.CustomerDeposit => "Saldo Deposit Member",
                _ => p.Method.ToString()
            };
            await WriteSummaryLineAsync(ms, pName, $"{p.Amount:N0}", maxChars, marginPrefix, ct);
        }

        // Change (Kembalian)
        var totalPaid = order.Payments.Sum(p => p.Amount);
        var change = totalPaid - order.TotalAmount;
        if (change > 0)
        {
            await WriteSummaryLineAsync(ms, "Kembalian", $"{change:N0}", maxChars, marginPrefix, ct);
        }

        // Member Loyalty Points
        if (showLoyalty && order.Customer != null)
        {
            await WriteTextAsync(ms, $"{marginPrefix}{new string('-', maxChars)}\n", ct);
            await ms.WriteAsync(CmdAlignCenter, ct);
            var earnedPoints = (int)(order.TotalAmount / 10000);
            await WriteTextAsync(ms, $"{marginPrefix}Poin Didapat: +{earnedPoints} | Total Poin: {order.Customer.LoyaltyPoints}\n", ct);
        }

        // Wi-Fi Info
        if (showWifi && !string.IsNullOrWhiteSpace(wifiName))
        {
            await WriteTextAsync(ms, $"{marginPrefix}{new string('-', maxChars)}\n", ct);
            await ms.WriteAsync(CmdAlignCenter, ct);
            await WriteTextAsync(ms, $"{marginPrefix}[ FREE WI-FI PELANGGAN ]\n", ct);
            await WriteTextAsync(ms, $"{marginPrefix}SSID: {wifiName} | Pass: {wifiPass}\n", ct);
        }

        // Footer Greeting & Policy
        await WriteTextAsync(ms, $"{marginPrefix}{new string('=', maxChars)}\n", ct);
        await ms.WriteAsync(CmdAlignCenter, ct);
        if (!string.IsNullOrWhiteSpace(footerNote))
        {
            await WriteTextAsync(ms, $"{marginPrefix}{footerNote}\n", ct);
        }
        if (!string.IsNullOrWhiteSpace(policyNote))
        {
            await WriteTextAsync(ms, $"{marginPrefix}{policyNote}\n", ct);
        }

        // Optional QR Code
        if (qrMode != "NONE")
        {
            var qrText = qrMode switch
            {
                "QRIS" => !string.IsNullOrEmpty(qrContent) ? qrContent : $"00020101021226...{order.InvoiceNumber}",
                "DIGITAL_RECEIPT" => !string.IsNullOrEmpty(qrContent) ? qrContent : $"http://omnipos.local/r/{order.InvoiceNumber}",
                "GOOGLE_REVIEW" => !string.IsNullOrEmpty(qrContent) ? qrContent : "https://g.page/review/omnipos",
                _ => qrContent
            };
            if (!string.IsNullOrWhiteSpace(qrText))
            {
                await WriteTextAsync(ms, "\n", ct);
                await WriteQrCodeAsync(ms, qrText, ct);
                await WriteTextAsync(ms, $"{marginPrefix}Scan QR untuk Nota / Review\n", ct);
            }
        }

        // Line feeds before cut
        await WriteTextAsync(ms, new string('\n', Math.Max(1, feedLines)), ct);

        // Auto Cut Paper
        if (cutMode == "FULL")
        {
            await ms.WriteAsync(CmdCutPaperFull, ct);
        }
        else if (cutMode == "PARTIAL")
        {
            await ms.WriteAsync(CmdCutPaperPartial, ct);
        }

        // Drawer Kick After Print
        if (autoDrawer == "AFTER")
        {
            var kickCmd = drawerPin == "PIN_5" ? CmdOpenDrawerPin5 : CmdOpenDrawerPin2;
            await ms.WriteAsync(kickCmd, ct);
        }

        return await SendRawBytesToPrinterAsync(ms.ToArray(), ct);
    }

    public async Task<bool> PrintKitchenTicketAsync(string orderId, string? station = null, CancellationToken ct = default)
    {
        var order = await _context.Orders
            .Include(o => o.Items).ThenInclude(i => i.Modifiers)
            .Include(o => o.DiningTable)
            .FirstOrDefaultAsync(o => o.Id == orderId, ct);

        if (order == null) return false;

        var isPaper80mm = (await GetSettingAsync("PAPER_SIZE", "80mm", ct)) == "80mm";
        var maxChars = isPaper80mm ? 42 : 32;
        var feedLines = int.TryParse(await GetSettingAsync("PRINT_FEED_LINES", "3", ct), out var fl) ? Math.Max(1, Math.Min(8, fl)) : 3;

        using var ms = new MemoryStream();
        await ms.WriteAsync(CmdInit, ct);
        await ms.WriteAsync(CmdAlignCenter, ct);
        await ms.WriteAsync(CmdDoubleSize, ct);
        await WriteTextAsync(ms, $"ORDER DAPUR / BAR\n", ct);
        await ms.WriteAsync(CmdNormalSize, ct);

        var tableName = order.DiningTable?.TableNumber ?? order.Notes ?? "Take Away";
        await ms.WriteAsync(CmdBoldOn, ct);
        await WriteTextAsync(ms, $"MEJA: {tableName}\n", ct);
        await ms.WriteAsync(CmdBoldOff, ct);
        await WriteTextAsync(ms, $"No: {order.InvoiceNumber} | {order.OrderDate.ToLocalTime():HH:mm}\n", ct);
        if (!string.IsNullOrEmpty(station))
        {
            await WriteTextAsync(ms, $"Station: {station}\n", ct);
        }
        await WriteTextAsync(ms, new string('=', maxChars) + "\n", ct);

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
                await WriteTextAsync(ms, $"    Catatan: {item.Notes}\n", ct);
            }
        }

        await WriteTextAsync(ms, new string('\n', feedLines), ct);
        var autoCut = (await GetSettingAsync("AUTO_CUT_PAPER", "true", ct)) != "false";
        if (autoCut)
        {
            await ms.WriteAsync(CmdCutPaperFull, ct);
        }

        return await SendRawBytesToPrinterAsync(ms.ToArray(), ct);
    }

    public async Task<bool> OpenCashDrawerAsync(CancellationToken ct = default)
    {
        var drawerPin = await GetSettingAsync("DRAWER_PIN", "PIN_2", ct);
        var drawerCmd = drawerPin == "PIN_5" ? CmdOpenDrawerPin5 : CmdOpenDrawerPin2;
        return await SendRawBytesToPrinterAsync(drawerCmd, ct);
    }

    public async Task<bool> PrintTestSlipAsync(CancellationToken ct = default)
    {
        var isPaper80mm = (await GetSettingAsync("PAPER_SIZE", "80mm", ct)) == "80mm";
        var defaultMaxChars = isPaper80mm ? 42 : 32;
        var configuredMaxChars = int.TryParse(await GetSettingAsync("PRINT_MAX_CHARS", defaultMaxChars.ToString(), ct), out var mc) && mc >= 20 ? mc : defaultMaxChars;
        var leftMargin = int.TryParse(await GetSettingAsync("PRINT_LEFT_MARGIN", "0", ct), out var lm) ? Math.Max(0, Math.Min(10, lm)) : 0;
        var maxChars = Math.Max(20, configuredMaxChars - leftMargin);
        var marginPrefix = new string(' ', leftMargin);

        var feedLines = int.TryParse(await GetSettingAsync("PRINT_FEED_LINES", "3", ct), out var fl) ? Math.Max(1, Math.Min(8, fl)) : 3;
        var printerType = await GetSettingAsync("PRINTER_TYPE", "VIRTUAL", ct);
        var usbPort = await GetSettingAsync("PRINTER_USB_PORT", "/dev/usb/lp0", ct);
        var lanIp = await GetSettingAsync("PRINTER_IP", "127.0.0.1", ct);
        var lanPort = await GetSettingAsync("PRINTER_PORT", "9100", ct);
        var drawerPin = await GetSettingAsync("DRAWER_PIN", "PIN_2", ct);
        var spoolerName = await GetSettingAsync("PRINTER_SYSTEM_NAME", "", ct);

        using var ms = new MemoryStream();
        await ms.WriteAsync(CmdInit, ct);
        await ms.WriteAsync(CmdAlignCenter, ct);
        await ms.WriteAsync(CmdDoubleSize, ct);
        await WriteTextAsync(ms, $"{marginPrefix}OMNIPOS HARDWARE TEST\n", ct);
        await ms.WriteAsync(CmdNormalSize, ct);
        await WriteTextAsync(ms, $"{marginPrefix}Pengujian Printer & Margin Presisi\n", ct);
        await WriteTextAsync(ms, $"{marginPrefix}Waktu: {DateTime.Now:yyyy-MM-dd HH:mm:ss}\n", ct);
        await WriteTextAsync(ms, $"{marginPrefix}{new string('=', maxChars)}\n", ct);

        // Precision Ruler Bar
        await ms.WriteAsync(CmdAlignLeft, ct);
        var ruler = "123456789012345678901234567890123456789012345678"[..Math.Min(48, maxChars)];
        await WriteTextAsync(ms, $"{marginPrefix}Ruler : {ruler}\n", ct);
        await WriteTextAsync(ms, $"{marginPrefix}Kolom : {maxChars} CPL (Margin Kiri: {leftMargin} spasi)\n", ct);
        await WriteTextAsync(ms, $"{marginPrefix}Status: TERHUBUNG & KALIBRASI OK\n", ct);
        await WriteTextAsync(ms, $"{marginPrefix}Driver: {printerType}\n", ct);
        if (printerType == "RAW_USB" || printerType == "USB_DIRECT")
            await WriteTextAsync(ms, $"{marginPrefix}Target Port USB : {usbPort}\n", ct);
        else if (printerType == "NETWORK_LAN")
            await WriteTextAsync(ms, $"{marginPrefix}Target LAN TCP  : {lanIp}:{lanPort}\n", ct);
        else if (printerType == "SYSTEM_SPOOLER" || printerType == "CUPS")
            await WriteTextAsync(ms, $"{marginPrefix}Target OS CUPS  : {spoolerName}\n", ct);

        await WriteTextAsync(ms, $"{marginPrefix}Pin Laci Uang   : {drawerPin}\n", ct);
        await WriteTextAsync(ms, $"{marginPrefix}{new string('-', maxChars)}\n", ct);
        
        await ms.WriteAsync(CmdBoldOn, ct);
        await WriteTextAsync(ms, $"{marginPrefix}Tes Teks Tebal (Bold): SUKSES\n", ct);
        await ms.WriteAsync(CmdBoldOff, ct);
        await WriteTextAsync(ms, $"{marginPrefix}Tes Ujung Kanan (Anti-Potong): [OK]\n", ct);

        // QR Code test
        await ms.WriteAsync(CmdAlignCenter, ct);
        await WriteQrCodeAsync(ms, "https://omnipos.id", ct);
        await WriteTextAsync(ms, $"{marginPrefix}QR Code Hardware Support: OK\n", ct);

        await WriteTextAsync(ms, new string('\n', feedLines), ct);
        await ms.WriteAsync(CmdCutPaperFull, ct);

        var drawerCmd = drawerPin == "PIN_5" ? CmdOpenDrawerPin5 : CmdOpenDrawerPin2;
        await ms.WriteAsync(drawerCmd, ct);

        return await SendRawBytesToPrinterAsync(ms.ToArray(), ct);
    }

    public async Task<bool> PrintZReportSlipAsync(string shiftId, CancellationToken ct = default)
    {
        var shift = await _context.Shifts
            .Include(s => s.CashTransactions)
            .FirstOrDefaultAsync(s => s.Id == shiftId, ct);

        if (shift == null) return false;

        var shiftOrders = await _context.Orders
            .Include(o => o.Payments)
            .Where(o => o.ShiftId == shift.Id && !o.IsVoided)
            .ToListAsync(ct);

        var grossSales = shiftOrders.Sum(o => o.Subtotal);
        var totalDiscounts = shiftOrders.Sum(o => o.DiscountAmount);
        var netSales = shiftOrders.Sum(o => o.TotalAmount);

        var storeName = await GetSettingAsync("STORE_NAME", "OmniPOS Store", ct);
        var storeAddress = await GetSettingAsync("STORE_ADDRESS", "Jl. Bisnis Modern No. 1", ct);
        var storePhone = await GetSettingAsync("STORE_PHONE", "0812-3456-7890", ct);
        
        var paperSize = await GetSettingAsync("PAPER_SIZE", "80mm", ct);
        var isPaper80mm = paperSize == "80mm";
        var defaultMaxChars = isPaper80mm ? 42 : 32;
        var configuredMaxChars = int.TryParse(await GetSettingAsync("PRINT_MAX_CHARS", defaultMaxChars.ToString(), ct), out var mc) && mc >= 20 ? mc : defaultMaxChars;
        var leftMargin = int.TryParse(await GetSettingAsync("PRINT_LEFT_MARGIN", "0", ct), out var lm) ? Math.Max(0, Math.Min(10, lm)) : 0;
        var maxChars = Math.Max(20, configuredMaxChars - leftMargin);
        var marginPrefix = new string(' ', leftMargin);
        var feedLines = int.TryParse(await GetSettingAsync("PRINT_FEED_LINES", "3", ct), out var fl) ? Math.Max(1, Math.Min(8, fl)) : 3;

        var drawerPin = await GetSettingAsync("DRAWER_PIN", "PIN_2", ct);

        using var ms = new MemoryStream();
        await ms.WriteAsync(CmdInit, ct);

        // Header
        await ms.WriteAsync(CmdAlignCenter, ct);
        await ms.WriteAsync(CmdDoubleSize, ct);
        await WriteTextAsync(ms, $"{marginPrefix}{storeName}\n", ct);
        await ms.WriteAsync(CmdNormalSize, ct);
        await WriteTextAsync(ms, $"{marginPrefix}{storeAddress}\n", ct);
        await WriteTextAsync(ms, $"{marginPrefix}Telp: {storePhone}\n", ct);
        await WriteTextAsync(ms, $"{marginPrefix}{new string('=', maxChars)}\n", ct);

        // Title
        await ms.WriteAsync(CmdBoldOn, ct);
        await WriteTextAsync(ms, $"{marginPrefix}RINGKASAN SHIFT (Z-REPORT)\n", ct);
        await ms.WriteAsync(CmdBoldOff, ct);
        await WriteTextAsync(ms, $"{marginPrefix}{new string('=', maxChars)}\n", ct);

        // Shift Metadata
        await ms.WriteAsync(CmdAlignLeft, ct);
        await WriteTextAsync(ms, $"{marginPrefix}No. Shift : {shift.ShiftNumber}\n", ct);
        await WriteTextAsync(ms, $"{marginPrefix}Kasir     : {shift.CashierName}\n", ct);
        await WriteTextAsync(ms, $"{marginPrefix}Mulai     : {shift.StartTime.ToLocalTime():yyyy-MM-dd HH:mm}\n", ct);
        var endTime = shift.EndTime?.ToLocalTime() ?? DateTime.Now;
        await WriteTextAsync(ms, $"{marginPrefix}Selesai   : {endTime:yyyy-MM-dd HH:mm}\n", ct);
        var duration = (int)(endTime - shift.StartTime.ToLocalTime()).TotalMinutes;
        await WriteTextAsync(ms, $"{marginPrefix}Durasi    : {duration / 60}j {duration % 60}m\n", ct);
        await WriteTextAsync(ms, $"{marginPrefix}{new string('-', maxChars)}\n", ct);

        // Cash Drawer Position
        await ms.WriteAsync(CmdAlignCenter, ct);
        await ms.WriteAsync(CmdBoldOn, ct);
        await WriteTextAsync(ms, $"{marginPrefix}[ REKONSILIASI KAS LACI ]\n", ct);
        await ms.WriteAsync(CmdBoldOff, ct);
        await ms.WriteAsync(CmdAlignLeft, ct);

        await WriteSummaryLineAsync(ms, "Modal Awal Kas", $"Rp {shift.StartingCash:N0}", maxChars, marginPrefix, ct);
        await WriteSummaryLineAsync(ms, "(+) Penjualan Tunai", $"Rp {shift.TotalCashSales:N0}", maxChars, marginPrefix, ct);
        await WriteSummaryLineAsync(ms, "(+) Kas Masuk", $"Rp {shift.TotalCashIn:N0}", maxChars, marginPrefix, ct);
        await WriteSummaryLineAsync(ms, "(-) Kas Keluar", $"Rp {shift.TotalCashOut:N0}", maxChars, marginPrefix, ct);
        await WriteTextAsync(ms, $"{marginPrefix}{new string('-', maxChars)}\n", ct);

        await ms.WriteAsync(CmdBoldOn, ct);
        await WriteSummaryLineAsync(ms, "Kas Diharapkan", $"Rp {shift.ExpectedCash:N0}", maxChars, marginPrefix, ct);
        var actual = shift.ActualCashCount ?? 0;
        await WriteSummaryLineAsync(ms, "Uang Fisik Kasir", $"Rp {actual:N0}", maxChars, marginPrefix, ct);

        var discrepancy = shift.CashDiscrepancy ?? (actual - shift.ExpectedCash);
        var discLabel = discrepancy == 0 ? "SEIMBANG (0)" : (discrepancy > 0 ? $"+Rp {discrepancy:N0} (LEBIH)" : $"-Rp {Math.Abs(discrepancy):N0} (KURANG)");
        await WriteSummaryLineAsync(ms, "Selisih Kas", discLabel, maxChars, marginPrefix, ct);
        await ms.WriteAsync(CmdBoldOff, ct);
        await WriteTextAsync(ms, $"{marginPrefix}{new string('-', maxChars)}\n", ct);

        // Payment Breakdown
        await ms.WriteAsync(CmdAlignCenter, ct);
        await ms.WriteAsync(CmdBoldOn, ct);
        await WriteTextAsync(ms, $"{marginPrefix}[ REKAP METODE PEMBAYARAN ]\n", ct);
        await ms.WriteAsync(CmdBoldOff, ct);
        await ms.WriteAsync(CmdAlignLeft, ct);

        var paymentGroups = shiftOrders
            .SelectMany(o => o.Payments)
            .GroupBy(p => p.Method)
            .OrderBy(g => g.Key);

        foreach (var g in paymentGroups)
        {
            var mName = g.Key switch
            {
                OmniPos.Core.Enums.PaymentMethod.Cash => "Tunai (Cash)",
                OmniPos.Core.Enums.PaymentMethod.QrisDynamic => "QRIS Dinamis",
                OmniPos.Core.Enums.PaymentMethod.QrisStatic => "QRIS Statis",
                OmniPos.Core.Enums.PaymentMethod.DebitCard => "Kartu Debit",
                OmniPos.Core.Enums.PaymentMethod.CreditCard => "Kartu Kredit",
                OmniPos.Core.Enums.PaymentMethod.BankTransfer => "Transfer Bank",
                OmniPos.Core.Enums.PaymentMethod.CustomerReceivable => "Kasbon / Piutang",
                OmniPos.Core.Enums.PaymentMethod.CustomerDeposit => "Saldo Deposit",
                _ => g.Key.ToString()
            };
            await WriteSummaryLineAsync(ms, $"{mName} ({g.Count()}x)", $"Rp {g.Sum(x => x.Amount):N0}", maxChars, marginPrefix, ct);
        }
        await WriteTextAsync(ms, $"{marginPrefix}{new string('-', maxChars)}\n", ct);

        // Sales Metrics
        await ms.WriteAsync(CmdAlignCenter, ct);
        await ms.WriteAsync(CmdBoldOn, ct);
        await WriteTextAsync(ms, $"{marginPrefix}[ RINGKASAN PENJUALAN ]\n", ct);
        await ms.WriteAsync(CmdBoldOff, ct);
        await ms.WriteAsync(CmdAlignLeft, ct);

        await WriteSummaryLineAsync(ms, "Total Struk Sukses", $"{shift.TotalTransactions} Struk", maxChars, marginPrefix, ct);
        await WriteSummaryLineAsync(ms, "Penjualan Kotor", $"Rp {grossSales:N0}", maxChars, marginPrefix, ct);
        if (totalDiscounts > 0)
            await WriteSummaryLineAsync(ms, "Diskon & Promo", $"-Rp {totalDiscounts:N0}", maxChars, marginPrefix, ct);
        await ms.WriteAsync(CmdBoldOn, ct);
        await WriteSummaryLineAsync(ms, "PENJUALAN BERSIH", $"Rp {netSales:N0}", maxChars, marginPrefix, ct);
        await ms.WriteAsync(CmdBoldOff, ct);

        if (!string.IsNullOrWhiteSpace(shift.ClosingNotes))
        {
            await WriteTextAsync(ms, $"{marginPrefix}{new string('-', maxChars)}\n", ct);
            await WriteTextAsync(ms, $"{marginPrefix}Catatan Kasir: {shift.ClosingNotes}\n", ct);
        }

        // Signatures
        await WriteTextAsync(ms, "\n" + marginPrefix + new string('-', maxChars) + "\n", ct);
        await ms.WriteAsync(CmdAlignCenter, ct);
        if (isPaper80mm)
        {
            await WriteTextAsync(ms, $"{marginPrefix}   Diserahkan Oleh,           Diterima Oleh,   \n\n\n\n", ct);
            await WriteTextAsync(ms, $"{marginPrefix}  ({shift.CashierName})         (   Supervisor   )  \n", ct);
        }
        else
        {
            await WriteTextAsync(ms, $"{marginPrefix}Diserahkan,        Diterima,\n\n\n", ct);
            await WriteTextAsync(ms, $"{marginPrefix}({shift.CashierName})    (Supervisor)\n", ct);
        }

        await WriteTextAsync(ms, $"{marginPrefix}Dicetak: {DateTime.Now:yyyy-MM-dd HH:mm:ss}\n", ct);
        await WriteTextAsync(ms, new string('\n', feedLines), ct);
        await ms.WriteAsync(CmdCutPaperFull, ct);

        // Kick Cash Drawer on Z-Report
        var drawerCmd = drawerPin == "PIN_5" ? CmdOpenDrawerPin5 : CmdOpenDrawerPin2;
        await ms.WriteAsync(drawerCmd, ct);

        return await SendRawBytesToPrinterAsync(ms.ToArray(), ct);
    }

    public async Task<bool> PrintRawTextAsync(string rawText, CancellationToken ct = default)
    {
        try
        {
            var feedLines = int.TryParse(await GetSettingAsync("PRINT_FEED_LINES", "3", ct), out var fl) ? Math.Max(1, Math.Min(8, fl)) : 3;
            var leftMargin = int.TryParse(await GetSettingAsync("PRINT_LEFT_MARGIN", "0", ct), out var lm) ? Math.Max(0, Math.Min(10, lm)) : 0;
            var marginPrefix = new string(' ', leftMargin);

            using var ms = new MemoryStream();
            await ms.WriteAsync(CmdInit, ct);
            await ms.WriteAsync(CmdNormalSize, ct);
            await ms.WriteAsync(CmdAlignLeft, ct);

            var lines = rawText.Replace("\r\n", "\n").Split('\n');
            foreach (var line in lines)
            {
                await WriteTextAsync(ms, $"{marginPrefix}{line}\n", ct);
            }

            await WriteTextAsync(ms, new string('\n', feedLines), ct);
            await ms.WriteAsync(CmdCutPaperFull, ct);

            return await SendRawBytesToPrinterAsync(ms.ToArray(), ct);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to print raw text statement/slip to printer.");
            return false;
        }
    }

    public async Task<string> GenerateReceiptPreviewAsync(string sampleMode = "retail", CancellationToken ct = default)
    {
        var storeName = await GetSettingAsync("STORE_NAME", "OmniPOS Retail Supermarket", ct);
        var storeSubtitle = await GetSettingAsync("RECEIPT_HEADER_SUBTITLE", "NPWP: 01.234.567.8-901.000 / NIB: 8120001234", ct);
        var storeAddress = await GetSettingAsync("STORE_ADDRESS", "Jl. Sudirman No. 45, Jakarta Pusat", ct);
        var storePhone = await GetSettingAsync("STORE_PHONE", "0812-9876-5432", ct);
        var footerNote = await GetSettingAsync("RECEIPT_FOOTER", "Terima kasih atas kunjungan Anda!", ct);
        var policyNote = await GetSettingAsync("RECEIPT_POLICY_NOTE", "Barang yang dibeli tidak dapat ditukar/dikembalikan.", ct);

        var paperSize = await GetSettingAsync("PAPER_SIZE", "80mm", ct);
        var isPaper80mm = paperSize == "80mm";
        var defaultMaxChars = isPaper80mm ? 42 : 32;
        var configuredMaxChars = int.TryParse(await GetSettingAsync("PRINT_MAX_CHARS", defaultMaxChars.ToString(), ct), out var mc) && mc >= 20 ? mc : defaultMaxChars;
        var leftMargin = int.TryParse(await GetSettingAsync("PRINT_LEFT_MARGIN", "0", ct), out var lm) ? Math.Max(0, Math.Min(10, lm)) : 0;
        var maxChars = Math.Max(20, configuredMaxChars - leftMargin);
        var marginPrefix = new string(' ', leftMargin);

        var showTaxDetail = (await GetSettingAsync("RECEIPT_SHOW_TAX_DETAIL", "true", ct)) == "true";
        var showDiscount = (await GetSettingAsync("RECEIPT_SHOW_DISCOUNT", "true", ct)) == "true";
        var showLoyalty = (await GetSettingAsync("RECEIPT_SHOW_LOYALTY", "true", ct)) == "true";
        var showWifi = (await GetSettingAsync("RECEIPT_SHOW_WIFI", "true", ct)) == "true";
        var wifiName = await GetSettingAsync("RECEIPT_WIFI_NAME", "OmniPOS_Store_Guest", ct);
        var wifiPass = await GetSettingAsync("RECEIPT_WIFI_PASSWORD", "belanjamurah", ct);

        var sb = new StringBuilder();

        // Helper line formatter
        void AddCenter(string text)
        {
            if (text.Length >= maxChars)
            {
                sb.AppendLine(marginPrefix + text);
                return;
            }
            var leftPad = (maxChars - text.Length) / 2;
            sb.AppendLine(marginPrefix + new string(' ', leftPad) + text);
        }

        void AddLeftRight(string left, string right)
        {
            var spaces = Math.Max(1, maxChars - left.Length - right.Length);
            sb.AppendLine(marginPrefix + left + new string(' ', spaces) + right);
        }

        AddCenter(storeName);
        if (!string.IsNullOrWhiteSpace(storeSubtitle)) AddCenter(storeSubtitle);
        if (!string.IsNullOrWhiteSpace(storeAddress)) AddCenter(storeAddress);
        if (!string.IsNullOrWhiteSpace(storePhone)) AddCenter($"Telp: {storePhone}");
        sb.AppendLine(marginPrefix + new string('=', maxChars));

        sb.AppendLine(marginPrefix + "No. Nota : INV-20260913-SAMPEL");
        sb.AppendLine(marginPrefix + $"Tanggal  : {DateTime.Now:yyyy-MM-dd HH:mm}");
        sb.AppendLine(marginPrefix + "Kasir    : Budi Santoso");
        sb.AppendLine(marginPrefix + "Member   : Bambang Pratama (GOLD)");
        sb.AppendLine(marginPrefix + new string('-', maxChars));

        if (sampleMode == "fnb")
        {
            sb.AppendLine(marginPrefix + "Nasi Goreng Spesial Seafood");
            AddLeftRight("  1 x 38.000", "38.000");
            sb.AppendLine(marginPrefix + "   + Level Pedas: Sedang");
            sb.AppendLine(marginPrefix + "   + Telur Mata Sapi");
            sb.AppendLine(marginPrefix + "Iced Caramel Macchiato");
            AddLeftRight("  2 x 25.000", "50.000");
            sb.AppendLine(marginPrefix + "   + Less Sugar 50%");
        }
        else if (sampleMode == "pharmacy")
        {
            sb.AppendLine(marginPrefix + "Amoxicillin 500mg Strip 10");
            AddLeftRight("  1 x 15.000", "15.000");
            sb.AppendLine(marginPrefix + "   Aturan: 3x1 Sesudah Makan (Dr. Hendra)");
            sb.AppendLine(marginPrefix + "Panadol Extra Paracetamol 10s");
            AddLeftRight("  2 x 14.500", "29.000");
        }
        else if (sampleMode == "electronics")
        {
            sb.AppendLine(marginPrefix + "Samsung Galaxy A54 5G 8/256GB");
            AddLeftRight("  1 x 5.999.000", "5.999.000");
            sb.AppendLine(marginPrefix + "   IMEI: 356789123456789");
            sb.AppendLine(marginPrefix + "   Garansi Resmi SEIN: 12 Bulan");
            sb.AppendLine(marginPrefix + "Tempered Glass KingKong Original");
            AddLeftRight("  1 x 85.000", "85.000");
        }
        else
        {
            // Retail standard
            sb.AppendLine(marginPrefix + "Minyak Goreng Sania 2 Liter");
            AddLeftRight("  2 x 34.500", "69.000");
            sb.AppendLine(marginPrefix + "Beras Premium Ramos 5kg");
            AddLeftRight("  1 x 72.000", "72.000");
            sb.AppendLine(marginPrefix + "Gula Pasir Gulaku 1kg");
            AddLeftRight("  3 x 17.500", "52.500");
        }

        sb.AppendLine(marginPrefix + new string('-', maxChars));
        AddLeftRight("Subtotal", "193.500");
        if (showDiscount) AddLeftRight("Diskon Member (GOLD 5%)", "-9.675");
        if (showTaxDetail) AddLeftRight("PPN 11%", "20.220");
        sb.AppendLine(marginPrefix + new string('-', maxChars));
        AddLeftRight("TOTAL AKHIR", "Rp 204.045");
        AddLeftRight("Bayar Tunai (Cash)", "250.000");
        AddLeftRight("Kembalian", "45.955");

        if (showLoyalty)
        {
            sb.AppendLine(marginPrefix + new string('-', maxChars));
            AddCenter("Poin Didapat: +20 | Sisa Poin: 480");
        }

        if (showWifi && !string.IsNullOrWhiteSpace(wifiName))
        {
            sb.AppendLine(marginPrefix + new string('-', maxChars));
            AddCenter("[ FREE WI-FI PELANGGAN ]");
            AddCenter($"SSID: {wifiName} | Pass: {wifiPass}");
        }

        sb.AppendLine(marginPrefix + new string('=', maxChars));
        if (!string.IsNullOrWhiteSpace(footerNote)) AddCenter(footerNote);
        if (!string.IsNullOrWhiteSpace(policyNote)) AddCenter(policyNote);
        AddCenter("[ QRIS / STRUK DIGITAL ]");
        AddCenter("::: QR CODE SIMULASI :::");

        return sb.ToString();
    }

    private static async Task WriteQrCodeAsync(MemoryStream ms, string qrText, CancellationToken ct)
    {
        try
        {
            if (string.IsNullOrWhiteSpace(qrText)) return;
            var qrBytes = Encoding.UTF8.GetBytes(qrText);
            if (qrBytes.Length > 250) return;

            // 1. Model: GS ( k 4 0 49 65 50 0 (Model 2)
            await ms.WriteAsync(new byte[] { 29, 40, 107, 4, 0, 49, 65, 50, 0 }, ct);
            // 2. Size: GS ( k 3 0 49 67 4 (Size 4 dots)
            await ms.WriteAsync(new byte[] { 29, 40, 107, 3, 0, 49, 67, 4 }, ct);
            // 3. Error correction: GS ( k 3 0 49 69 49 (Level M)
            await ms.WriteAsync(new byte[] { 29, 40, 107, 3, 0, 49, 69, 49 }, ct);
            // 4. Store data: GS ( k (pL pH 49 80 48) data...
            int len = qrBytes.Length + 3;
            byte pL = (byte)(len & 0xFF);
            byte pH = (byte)((len >> 8) & 0xFF);
            await ms.WriteAsync(new byte[] { 29, 40, 107, pL, pH, 49, 80, 48 }, ct);
            await ms.WriteAsync(qrBytes, ct);
            // 5. Print QR: GS ( k 3 0 49 81 48
            await ms.WriteAsync(new byte[] { 29, 40, 107, 3, 0, 49, 81, 48 }, ct);
        }
        catch {}
    }

    private static async Task WriteTextAsync(MemoryStream ms, string text, CancellationToken ct)
    {
        var bytes = Encoding.GetEncoding("ASCII", new EncoderReplacementFallback("?"), new DecoderReplacementFallback("?")).GetBytes(text);
        await ms.WriteAsync(bytes, ct);
    }

    private static async Task WriteSummaryLineAsync(MemoryStream ms, string label, string val, int maxChars, string marginPrefix, CancellationToken ct)
    {
        var spaces = Math.Max(1, maxChars - label.Length - val.Length);
        await WriteTextAsync(ms, $"{marginPrefix}{label}{new string(' ', spaces)}{val}\n", ct);
    }

    private async Task<string> GetSettingAsync(string key, string fallback, CancellationToken ct)
    {
        var setting = await _context.AppSettings.FirstOrDefaultAsync(s => s.SettingKey == key, ct);
        return setting?.SettingValue ?? fallback;
    }

    private async Task<bool> SendRawBytesToPrinterAsync(byte[] bytes, CancellationToken ct)
    {
        var printerType = await GetSettingAsync("PRINTER_TYPE", "VIRTUAL", ct);
        var customUsbPort = await GetSettingAsync("PRINTER_USB_PORT", "", ct);
        var printerIp = await GetSettingAsync("PRINTER_IP", "127.0.0.1", ct);
        var printerPort = int.Parse(await GetSettingAsync("PRINTER_PORT", "9100", ct));
        var spoolerName = await GetSettingAsync("PRINTER_SYSTEM_NAME", "", ct);

        // 1. Direct Physical USB Port (/dev/usb/lp*, /dev/ttyUSB*)
        if (printerType == "RAW_USB" || printerType == "USB_DIRECT")
        {
            try
            {
                var candidatePorts = new List<string>();
                if (!string.IsNullOrWhiteSpace(customUsbPort)) candidatePorts.Add(customUsbPort);
                candidatePorts.AddRange(["/dev/usb/lp0", "/dev/usb/lp1", "/dev/usb/lp2", "/dev/ttyUSB0", "/dev/ttyACM0"]);

                var activePort = candidatePorts.Distinct().FirstOrDefault(File.Exists);
                if (activePort != null)
                {
                    await File.WriteAllBytesAsync(activePort, bytes, ct);
                    _logger.LogInformation("Receipt successfully dispatched to physical USB port {Port} ({Count} bytes).", activePort, bytes.Length);
                    return true;
                }

                _logger.LogWarning("Physical USB thermal printer port (/dev/usb/lp*) not found. Checked: {Ports}", string.Join(", ", candidatePorts));
                return false;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to write raw bytes to physical USB printer port.");
                return false;
            }
        }

        // 2. CUPS / OS Print Spooler (lp / lpr / Windows Print Spooler)
        if (printerType == "SYSTEM_SPOOLER" || printerType == "CUPS")
        {
            if (string.IsNullOrWhiteSpace(spoolerName))
            {
                _logger.LogWarning("Cannot print via CUPS: PRINTER_SYSTEM_NAME is not set.");
                return false;
            }

            var tempFile = Path.Combine(Path.GetTempPath(), $"omnipos_receipt_{Guid.NewGuid():N}.bin");
            try
            {
                await File.WriteAllBytesAsync(tempFile, bytes, ct);

                var psi = new ProcessStartInfo
                {
                    FileName = "lp",
                    Arguments = $"-d \"{spoolerName}\" -o raw \"{tempFile}\"",
                    RedirectStandardOutput = true,
                    RedirectStandardError = true,
                    UseShellExecute = false,
                    CreateNoWindow = true
                };

                using var proc = Process.Start(psi);
                if (proc != null)
                {
                    await proc.WaitForExitAsync(ct);
                    if (proc.ExitCode == 0)
                    {
                        _logger.LogInformation("Receipt dispatched to CUPS printer '{Printer}' ({Count} bytes).", spoolerName, bytes.Length);
                        return true;
                    }
                    var err = await proc.StandardError.ReadToEndAsync(ct);
                    _logger.LogError("CUPS lp failed: {Error}", err);
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to dispatch print job to CUPS spooler '{Printer}'.", spoolerName);
            }
            finally
            {
                try { if (File.Exists(tempFile)) File.Delete(tempFile); } catch {}
            }
            return false;
        }

        // 3. Network TCP/IP Printer (Port 9100 JetDirect)
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

        // 4. Virtual Driver Mode (Simulator / Browser PDF)
        _logger.LogInformation("Virtual printer received {Count} bytes. Browser / PDF print available.", bytes.Length);
        return true;
    }
}
