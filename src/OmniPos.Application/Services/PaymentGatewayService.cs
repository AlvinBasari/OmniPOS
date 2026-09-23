using System.Collections.Concurrent;
using System.Text.Json;
using OmniPos.Application.DTOs;

namespace OmniPos.Application.Services;

public class QrisPaymentSession
{
    public string ReferenceId { get; set; } = string.Empty;
    public string InvoiceNumber { get; set; } = string.Empty;
    public decimal Amount { get; set; }
    public string? CustomerName { get; set; }
    public string QrisPayload { get; set; } = string.Empty;
    public string QrisDataUrl { get; set; } = string.Empty;
    public string Status { get; set; } = "PENDING"; // PENDING, SETTLED, EXPIRED, CANCELLED
    public bool IsSettled => Status == "SETTLED";
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime ExpiresAt { get; set; } = DateTime.UtcNow.AddMinutes(5);
    public string? Issuer { get; set; } // BCA, MANDIRI, BRI, GOPAY, OVO, SHOPEEPAY, DANA
    public string? Rrn { get; set; } // Retrieval Reference Number
    public DateTime? SettledAt { get; set; }
    public string Provider { get; set; } = "EMVCO_DYNAMIC"; // SIMULATOR, MIDTRANS, XENDIT, TRIPAY, EMVCO_DYNAMIC
}

public class PaymentGatewayService
{
    private static readonly ConcurrentDictionary<string, QrisPaymentSession> Sessions = new();
    private readonly QRISGeneratorService _qrisGenerator;

    public PaymentGatewayService(QRISGeneratorService qrisGenerator)
    {
        _qrisGenerator = qrisGenerator;
    }

    public QrisSessionDto GenerateQrisSession(
        QrisGenerateRequestDto req,
        string? nmid = "ID1020023456789",
        string? merchantName = "OmniPOS Store",
        string? city = "JAKARTA",
        string? provider = "SIMULATOR")
    {
        var cleanNmid = string.IsNullOrWhiteSpace(nmid) ? "ID1020023456789" : nmid.Trim();
        var cleanMerchant = string.IsNullOrWhiteSpace(merchantName) ? "OmniPOS Store" : merchantName.Trim();
        var cleanCity = string.IsNullOrWhiteSpace(city) ? "JAKARTA" : city.Trim();
        var cleanProvider = string.IsNullOrWhiteSpace(provider) ? "SIMULATOR" : provider.Trim().ToUpperInvariant();

        // 1. Generate unique transaction reference
        var timestamp = DateTime.UtcNow.ToString("yyyyMMddHHmmss");
        var randomSuffix = Random.Shared.Next(1000, 9999);
        var refId = $"QRIS-{timestamp}-{randomSuffix}";

        // 2. Generate standard EMVCo QRIS Payload
        var emvcoResult = _qrisGenerator.GenerateDynamicQris(
            cleanNmid,
            cleanMerchant,
            cleanCity,
            req.Amount,
            req.InvoiceNumber
        );

        var session = new QrisPaymentSession
        {
            ReferenceId = refId,
            InvoiceNumber = req.InvoiceNumber,
            Amount = req.Amount,
            CustomerName = req.CustomerName,
            QrisPayload = emvcoResult.QrisPayload,
            Status = "PENDING",
            CreatedAt = DateTime.UtcNow,
            ExpiresAt = DateTime.UtcNow.AddMinutes(5),
            Provider = cleanProvider
        };

        Sessions[refId] = session;

        // Clean up old sessions (> 24 hours)
        CleanupOldSessions();

        return new QrisSessionDto(
            ReferenceId: session.ReferenceId,
            InvoiceNumber: session.InvoiceNumber,
            Amount: session.Amount,
            QrisPayload: session.QrisPayload,
            QrisDataUrl: "", // Frontend will render with QRCodeEncoder
            Status: session.Status,
            CreatedAt: session.CreatedAt,
            ExpiresAt: session.ExpiresAt,
            Issuer: null,
            Rrn: null,
            Provider: session.Provider
        );
    }

    public QrisStatusDto GetQrisStatus(string referenceId)
    {
        if (!Sessions.TryGetValue(referenceId, out var session))
        {
            return new QrisStatusDto(
                ReferenceId: referenceId,
                InvoiceNumber: "",
                Amount: 0,
                Status: "NOT_FOUND",
                IsSettled: false,
                Issuer: null,
                Rrn: null,
                SettledAt: null,
                Message: "Sesi QRIS tidak ditemukan atau telah kedaluwarsa."
            );
        }

        // Check expiration
        if (session.Status == "PENDING" && DateTime.UtcNow > session.ExpiresAt)
        {
            session.Status = "EXPIRED";
        }

        var message = session.Status switch
        {
            "SETTLED" => $"Pembayaran sukses via {session.Issuer ?? "QRIS Nasional"} (RRN: {session.Rrn ?? "-"})",
            "PENDING" => "Menunggu pelanggan memindai dan menyelesaikan pembayaran...",
            "EXPIRED" => "QRIS telah kedaluwarsa. Silakan buat QRIS baru.",
            _ => "Status tidak diketahui."
        };

        return new QrisStatusDto(
            ReferenceId: session.ReferenceId,
            InvoiceNumber: session.InvoiceNumber,
            Amount: session.Amount,
            Status: session.Status,
            IsSettled: session.IsSettled,
            Issuer: session.Issuer,
            Rrn: session.Rrn,
            SettledAt: session.SettledAt,
            Message: message
        );
    }

    public QrisStatusDto MarkQrisSettled(string referenceId, string? issuer = null, string? rrn = null)
    {
        if (!Sessions.TryGetValue(referenceId, out var session))
        {
            return new QrisStatusDto(
                ReferenceId: referenceId,
                InvoiceNumber: "",
                Amount: 0,
                Status: "NOT_FOUND",
                IsSettled: false,
                Issuer: null,
                Rrn: null,
                SettledAt: null,
                Message: "Sesi QRIS tidak ditemukan."
            );
        }

        session.Status = "SETTLED";
        session.Issuer = string.IsNullOrWhiteSpace(issuer) ? "BCA Mobile" : issuer.Trim();
        session.Rrn = string.IsNullOrWhiteSpace(rrn) ? $"RRN{DateTime.UtcNow:yyMMddHHmmss}" : rrn.Trim();
        session.SettledAt = DateTime.UtcNow;

        return new QrisStatusDto(
            ReferenceId: session.ReferenceId,
            InvoiceNumber: session.InvoiceNumber,
            Amount: session.Amount,
            Status: session.Status,
            IsSettled: true,
            Issuer: session.Issuer,
            Rrn: session.Rrn,
            SettledAt: session.SettledAt,
            Message: $"Pembayaran sebesar Rp {session.Amount:N0} berhasil diterima dari {session.Issuer}."
        );
    }

    public QrisStatusDto SimulateCustomerPayment(string referenceId, string? customIssuer = null)
    {
        var sampleIssuers = new[] { "BCA Mobile", "Livin' by Mandiri", "BRImo", "GoPay", "OVO", "ShopeePay", "DANA" };
        var chosenIssuer = !string.IsNullOrWhiteSpace(customIssuer)
            ? customIssuer
            : sampleIssuers[Random.Shared.Next(sampleIssuers.Length)];

        var generatedRrn = $"{Random.Shared.Next(100000, 999999)}{Random.Shared.Next(100000, 999999)}";
        return MarkQrisSettled(referenceId, chosenIssuer, generatedRrn);
    }

    public bool ProcessPaymentWebhook(string jsonPayload, out string referenceId, out string message)
    {
        referenceId = string.Empty;
        message = string.Empty;

        try
        {
            using var doc = JsonDocument.Parse(jsonPayload);
            var root = doc.RootElement;

            // 1. Midtrans Format: order_id, transaction_status, issuer
            if (root.TryGetProperty("order_id", out var orderIdProp))
            {
                var orderId = orderIdProp.GetString() ?? "";
                var txStatus = root.TryGetProperty("transaction_status", out var st) ? st.GetString() : "";
                var issuer = root.TryGetProperty("issuer", out var isProp) ? isProp.GetString() : "Midtrans QRIS";
                var rrn = root.TryGetProperty("transaction_id", out var trProp) ? trProp.GetString() : "";

                // Find session by orderId or referenceId
                var session = Sessions.Values.FirstOrDefault(s => s.InvoiceNumber == orderId || s.ReferenceId == orderId);
                if (session != null)
                {
                    referenceId = session.ReferenceId;
                    if (txStatus is "settlement" or "capture")
                    {
                        MarkQrisSettled(session.ReferenceId, issuer, rrn);
                        message = "Midtrans payment settlement confirmed.";
                        return true;
                    }
                }
            }

            // 2. Xendit / Tripay Format: external_id, status
            if (root.TryGetProperty("external_id", out var extIdProp))
            {
                var extId = extIdProp.GetString() ?? "";
                var status = root.TryGetProperty("status", out var st) ? st.GetString() : "";
                var session = Sessions.Values.FirstOrDefault(s => s.InvoiceNumber == extId || s.ReferenceId == extId);
                if (session != null && (status is "COMPLETED" or "PAID" or "SETTLED"))
                {
                    referenceId = session.ReferenceId;
                    MarkQrisSettled(session.ReferenceId, "Xendit QRIS", $"XEN-{DateTime.UtcNow.Ticks % 1000000000}");
                    message = "Xendit payment settlement confirmed.";
                    return true;
                }
            }

            return false;
        }
        catch (Exception ex)
        {
            message = ex.Message;
            return false;
        }
    }

    public EdcEcrTriggerResponse TriggerEcrTransaction(EdcEcrTriggerRequest req)
    {
        // Real-world ECR Protocol simulation / bridge
        // Generates realistic ISO 8583 / ECR Link response with bank approval code
        var approvalCode = Random.Shared.Next(100000, 999999).ToString();
        var traceNumber = Random.Shared.Next(1000, 9999).ToString("D6");
        
        // Generate masked card number
        var bin = req.Bank.ToUpperInvariant() switch
        {
            "BCA" => "5412-75",
            "MANDIRI" => "4122-38",
            "BRI" => "5221-84",
            "BNI" => "4617-00",
            _ => "4000-00"
        };
        var last4 = Random.Shared.Next(1000, 9999).ToString();
        var maskedCard = $"{bin}XX-XXXX-{last4}";

        return new EdcEcrTriggerResponse(
            Success: true,
            ResponseCode: "00",
            ApprovalCode: approvalCode,
            CardNumber: maskedCard,
            CardType: req.CardType,
            Bank: req.Bank,
            Message: "TRANSAKSI DISETUJUI / APPROVED (00)",
            TraceNumber: traceNumber
        );
    }

    private static void CleanupOldSessions()
    {
        var cutoff = DateTime.UtcNow.AddHours(-12);
        foreach (var kvp in Sessions)
        {
            if (kvp.Value.CreatedAt < cutoff)
            {
                Sessions.TryRemove(kvp.Key, out _);
            }
        }
    }
}
