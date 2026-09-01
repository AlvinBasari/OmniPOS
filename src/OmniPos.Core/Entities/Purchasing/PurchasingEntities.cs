namespace OmniPos.Core.Entities.Purchasing;

public class Supplier : BaseEntity
{
    public string Name { get; set; } = string.Empty;
    public string Code { get; set; } = string.Empty;
    public string? Phone { get; set; }
    public string? ContactPerson { get; set; }
    public string? Address { get; set; }
    public string? BankAccount { get; set; }
    public decimal TotalPayable { get; set; } = 0; // Total hutang aktif ke supplier
    public string? Notes { get; set; }
    public bool IsActive { get; set; } = true;

    public List<PurchaseInvoice> Invoices { get; set; } = new();
}

public enum PurchasePaymentStatus
{
    Unpaid,
    Partial,
    Paid
}

public class PurchaseInvoice : BaseEntity
{
    public string InvoiceNumber { get; set; } = string.Empty;
    public string? ReferenceNumber { get; set; } // No Faktur Fisik dari Distributor
    public string SupplierId { get; set; } = string.Empty;
    public string SupplierName { get; set; } = string.Empty;
    public DateTime PurchaseDate { get; set; } = DateTime.UtcNow;
    public decimal TotalAmount { get; set; } = 0;
    public decimal PaidAmount { get; set; } = 0;
    public decimal RemainingPayable { get; set; } = 0;
    public DateTime? DueDate { get; set; } // Tanggal Jatuh Tempo Pembayaran
    public PurchasePaymentStatus PaymentStatus { get; set; } = PurchasePaymentStatus.Unpaid;
    public string? ReceivedByUserId { get; set; }
    public string? Notes { get; set; }

    public Supplier? Supplier { get; set; }
    public List<PurchaseItem> Items { get; set; } = new();
    public List<PurchasePayment> Payments { get; set; } = new();
}

public class PurchaseItem : BaseEntity
{
    public string PurchaseInvoiceId { get; set; } = string.Empty;
    public string ProductId { get; set; } = string.Empty;
    public string ProductName { get; set; } = string.Empty;
    public string Sku { get; set; } = string.Empty;
    public decimal Quantity { get; set; } = 1;
    public decimal UnitCost { get; set; } = 0;
    public decimal TotalCost { get; set; } = 0;
    public string? BatchNumber { get; set; }
    public DateTime? ExpiredDate { get; set; }

    public PurchaseInvoice? PurchaseInvoice { get; set; }
}

public class PurchasePayment : BaseEntity
{
    public string PurchaseInvoiceId { get; set; } = string.Empty;
    public DateTime PaymentDate { get; set; } = DateTime.UtcNow;
    public decimal Amount { get; set; } = 0;
    public string PaymentMethod { get; set; } = "Kas Toko"; // Kas Toko / Transfer Bank
    public string? ProcessedByUserId { get; set; }
    public string? Notes { get; set; }

    public PurchaseInvoice? PurchaseInvoice { get; set; }
}
