namespace OmniPos.Core.Entities.Inventory;

public enum StockOpnameStatus
{
    Draft,
    Completed,
    Cancelled
}

public class StockOpnameSession : BaseEntity
{
    public string SessionNumber { get; set; } = string.Empty;
    public string Title { get; set; } = "Stock Opname Rutin";
    public StockOpnameStatus Status { get; set; } = StockOpnameStatus.Draft;
    public int TotalItemsAudited { get; set; } = 0;
    public decimal TotalDiscrepancyQty { get; set; } = 0;
    public decimal TotalDiscrepancyValue { get; set; } = 0; // Nominal kerugian/surplus selisih fisik vs sistem
    public string? AuditedByUserId { get; set; }
    public DateTime? CompletedAt { get; set; }
    public string? Notes { get; set; }

    public List<StockOpnameItem> Items { get; set; } = new();
}

public class StockOpnameItem : BaseEntity
{
    public string StockOpnameSessionId { get; set; } = string.Empty;
    public string ProductId { get; set; } = string.Empty;
    public string ProductName { get; set; } = string.Empty;
    public string Sku { get; set; } = string.Empty;
    public decimal SystemStock { get; set; } = 0;
    public decimal PhysicalStock { get; set; } = 0;
    public decimal DiscrepancyQty { get; set; } = 0; // Physical - System
    public decimal UnitCost { get; set; } = 0;
    public decimal DiscrepancyValue { get; set; } = 0; // DiscrepancyQty * UnitCost
    public string? Notes { get; set; }

    public StockOpnameSession? Session { get; set; }
}

public class ProductBatch : BaseEntity
{
    public string ProductId { get; set; } = string.Empty;
    public string ProductName { get; set; } = string.Empty;
    public string Sku { get; set; } = string.Empty;
    public string BatchNumber { get; set; } = string.Empty;
    public DateTime ExpiredDate { get; set; }
    public decimal InitialStock { get; set; } = 0;
    public decimal CurrentStock { get; set; } = 0;
    public DateTime ReceivedDate { get; set; } = DateTime.UtcNow;
    public string? Notes { get; set; }
}
