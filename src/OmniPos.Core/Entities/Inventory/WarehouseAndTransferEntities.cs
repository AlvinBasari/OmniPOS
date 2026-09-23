using OmniPos.Core.Entities.Products;
using OmniPos.Core.Enums;

namespace OmniPos.Core.Entities.Inventory;

public class Warehouse : BaseEntity
{
    public string Code { get; set; } = string.Empty; // e.g. WH-01, DISP-01, CAB-02
    public string Name { get; set; } = string.Empty; // e.g. Gudang Utama (Pusat), Toko / Display Etalase
    public string? Address { get; set; }
    public string? Phone { get; set; }
    public string? PicName { get; set; } // Penanggung Jawab Gudang
    public bool IsDefault { get; set; } = false; // Main store location
    public bool IsActive { get; set; } = true;
    public string? Notes { get; set; }

    public ICollection<WarehouseStock> Stocks { get; set; } = new List<WarehouseStock>();
}

public class WarehouseStock : BaseEntity
{
    public string WarehouseId { get; set; } = string.Empty;
    public Warehouse? Warehouse { get; set; }

    public string ProductId { get; set; } = string.Empty;
    public Product? Product { get; set; }

    public decimal CurrentStock { get; set; } = 0;
    public decimal MinStockAlert { get; set; } = 5;
    public string? RackLocation { get; set; } // e.g. Rak A-02, Etalase 1
}

public enum StockTransferStatus
{
    Draft,
    InTransit,
    Received,
    PartiallyReceived,
    Cancelled
}

public class StockTransfer : BaseEntity
{
    public string TransferNumber { get; set; } = string.Empty; // TRF-YYYYMMDD-XXXX
    
    public string SourceWarehouseId { get; set; } = string.Empty;
    public Warehouse? SourceWarehouse { get; set; }
    public string SourceWarehouseName { get; set; } = string.Empty;

    public string DestinationWarehouseId { get; set; } = string.Empty;
    public Warehouse? DestinationWarehouse { get; set; }
    public string DestinationWarehouseName { get; set; } = string.Empty;

    public DateTime TransferDate { get; set; } = DateTime.UtcNow;
    public StockTransferStatus Status { get; set; } = StockTransferStatus.Draft;

    public int TotalItemsCount { get; set; } = 0;
    public decimal TotalQuantitySent { get; set; } = 0;
    public decimal TotalQuantityReceived { get; set; } = 0;
    public decimal TotalAssetValue { get; set; } = 0;

    public string? DriverOrCourierName { get; set; } // Supir / Nama Ekspedisi
    public string? VehicleNumber { get; set; } // No. Polisi Kendaraan (e.g. B 1234 XYZ)
    public string? TrackingNumber { get; set; } // No. Resi jika via ekspedisi

    public DateTime? DispatchedAt { get; set; }
    public string? DispatchedByStaffName { get; set; }

    public DateTime? ReceivedAt { get; set; }
    public string? ReceivedByStaffName { get; set; }

    public string? Notes { get; set; }
    public string? DiscrepancyNotes { get; set; }

    public ICollection<StockTransferItem> Items { get; set; } = new List<StockTransferItem>();
}

public class StockTransferItem : BaseEntity
{
    public string StockTransferId { get; set; } = string.Empty;
    public StockTransfer? StockTransfer { get; set; }

    public string ProductId { get; set; } = string.Empty;
    public Product? Product { get; set; }

    public string ProductName { get; set; } = string.Empty;
    public string ProductSku { get; set; } = string.Empty;
    public string? ProductBarcode { get; set; }
    public string Unit { get; set; } = "PCS";

    public decimal QuantitySent { get; set; } = 0;
    public decimal QuantityReceived { get; set; } = 0;
    public decimal UnitCost { get; set; } = 0;
    public decimal SubtotalValue { get; set; } = 0;

    public string? SerialNumbersJson { get; set; } // JSON array of serial/IMEI strings
    public string Status { get; set; } = "Pending"; // Pending, ReceivedMatch, Discrepancy, Damaged
    public string? Notes { get; set; }
}
