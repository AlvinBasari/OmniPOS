namespace OmniPos.Core.Entities.Sales;

public enum ReturnRefundMethod
{
    Cash,
    StoreCredit,
    BankTransfer
}

public class SalesReturn : BaseEntity
{
    public string ReturnNumber { get; set; } = string.Empty;
    public string OriginalInvoiceNumber { get; set; } = string.Empty;
    public DateTime ReturnDate { get; set; } = DateTime.UtcNow;
    public string? CustomerId { get; set; }
    public string? CustomerName { get; set; }
    public string? CashierUserId { get; set; }
    public decimal TotalRefundAmount { get; set; } = 0;
    public ReturnRefundMethod RefundMethod { get; set; } = ReturnRefundMethod.Cash;
    public string ReturnReason { get; set; } = "Barang Rusak / Cacat";
    public string? Notes { get; set; }

    public List<SalesReturnItem> Items { get; set; } = new();
}

public class SalesReturnItem : BaseEntity
{
    public string SalesReturnId { get; set; } = string.Empty;
    public string ProductId { get; set; } = string.Empty;
    public string ProductName { get; set; } = string.Empty;
    public string Sku { get; set; } = string.Empty;
    public decimal ReturnedQuantity { get; set; } = 1;
    public decimal UnitPrice { get; set; } = 0;
    public decimal RefundAmount { get; set; } = 0;
    public bool IsRestocked { get; set; } = true; // Apakah barang dimasukkan kembali ke stok aktif
    public string Condition { get; set; } = "Bagus"; // Bagus / Cacat (Afkir)

    public SalesReturn? SalesReturn { get; set; }
}
