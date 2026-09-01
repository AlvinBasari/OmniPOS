using OmniPos.Core.Entities.Products;
using OmniPos.Core.Enums;

namespace OmniPos.Core.Entities.Inventory;

public class StockMutation : BaseEntity
{
    public string ProductId { get; set; } = string.Empty;
    public Product? Product { get; set; }
    
    public string? VariantId { get; set; }
    public ProductVariant? Variant { get; set; }
    
    public StockMutationType MutationType { get; set; }
    public decimal Quantity { get; set; } // + for In, - for Out
    public decimal StockBefore { get; set; }
    public decimal StockAfter { get; set; }
    public decimal UnitCost { get; set; }
    
    public string? ReferenceNumber { get; set; } // Order Number, PO Number, Opname Number
    public string? Notes { get; set; }
    public string CreatedByUserId { get; set; } = string.Empty;
}

public class BatchExpiry : BaseEntity
{
    public string ProductId { get; set; } = string.Empty;
    public Product? Product { get; set; }
    
    public string BatchNumber { get; set; } = string.Empty;
    public DateTime ExpiryDate { get; set; }
    public decimal Quantity { get; set; }
    public decimal BuyPrice { get; set; }
}

public class SerialNumber : BaseEntity
{
    public string ProductId { get; set; } = string.Empty;
    public Product? Product { get; set; }
    
    public string SerialNo { get; set; } = string.Empty; // IMEI or Serial
    public bool IsSold { get; set; } = false;
    public string? SoldOrderNumber { get; set; }
    public DateTime? WarrantyEndDate { get; set; }
}

public class Supplier : BaseEntity
{
    public string Name { get; set; } = string.Empty;
    public string? ContactPerson { get; set; }
    public string? Phone { get; set; }
    public string? Email { get; set; }
    public string? Address { get; set; }
    public decimal TotalPayable { get; set; } = 0; // Total Hutang Dagang
}

public class PurchaseOrder : BaseEntity
{
    public string PoNumber { get; set; } = string.Empty; // PO-YYYYMMDD-XXXX
    public string SupplierId { get; set; } = string.Empty;
    public Supplier? Supplier { get; set; }
    
    public DateTime OrderDate { get; set; } = DateTime.UtcNow;
    public DateTime? ExpectedDate { get; set; }
    public bool IsReceived { get; set; } = false;
    public DateTime? ReceivedDate { get; set; }
    
    public decimal Subtotal { get; set; } = 0;
    public decimal TaxAmount { get; set; } = 0;
    public decimal TotalAmount { get; set; } = 0;
    public decimal PaidAmount { get; set; } = 0;
    public bool IsFullyPaid { get; set; } = false;
    public DateTime? DueDate { get; set; }
    
    public ICollection<PurchaseOrderItem> Items { get; set; } = new List<PurchaseOrderItem>();
}

public class PurchaseOrderItem : BaseEntity
{
    public string PurchaseOrderId { get; set; } = string.Empty;
    public PurchaseOrder? PurchaseOrder { get; set; }
    
    public string ProductId { get; set; } = string.Empty;
    public Product? Product { get; set; }
    
    public decimal QuantityOrdered { get; set; }
    public decimal QuantityReceived { get; set; }
    public decimal UnitBuyPrice { get; set; }
    public decimal TotalPrice { get; set; }
    public string? BatchNumber { get; set; }
    public DateTime? ExpiryDate { get; set; }
}
