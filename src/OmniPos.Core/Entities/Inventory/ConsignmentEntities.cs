using OmniPos.Core.Entities.Products;

namespace OmniPos.Core.Entities.Inventory;

public enum ConsignmentCommissionType
{
    Percentage, // Toko mengambil % tertentu dari harga jual kasir (e.g. 15%)
    FixedCost   // Vendor menetapkan harga pokok bersih (e.g. Rp 10.000), margin toko adalah selisih harga jual - harga pokok
}

public enum ConsignmentSettlementStatus
{
    Draft,
    Approved,
    Paid,
    Cancelled
}

public enum ConsignmentIntakeStatus
{
    Active,
    Completed,
    Cancelled
}

public enum ConsignmentReturnStatus
{
    Draft,
    Completed,
    Cancelled
}

public class ConsignmentVendor : BaseEntity
{
    public string VendorCode { get; set; } = string.Empty; // VND-001
    public string Name { get; set; } = string.Empty;
    public string? ContactPerson { get; set; }
    public string? Phone { get; set; }
    public string? Email { get; set; }
    public string? Address { get; set; }
    
    // Financial & Commission Setup
    public ConsignmentCommissionType CommissionType { get; set; } = ConsignmentCommissionType.Percentage;
    public decimal DefaultCommissionRate { get; set; } = 15.00m; // Default 15% Toko Margin
    
    // Bank Account Details for Payout
    public string? BankName { get; set; } // BCA, Mandiri, BRI, BNI
    public string? BankAccountNumber { get; set; }
    public string? BankAccountHolder { get; set; }
    
    // Running Balances
    public decimal TotalPayableBalance { get; set; } = 0; // Total belum disettle/dibayar
    public decimal TotalSettledAmount { get; set; } = 0; // Total akumulasi yang sudah dibayar
    
    public bool IsActive { get; set; } = true;
    public string? Notes { get; set; }
    
    public ICollection<ConsignmentIntake> Intakes { get; set; } = new List<ConsignmentIntake>();
    public ICollection<ConsignmentSettlement> Settlements { get; set; } = new List<ConsignmentSettlement>();
    public ICollection<ConsignmentReturn> Returns { get; set; } = new List<ConsignmentReturn>();
}

public class ConsignmentIntake : BaseEntity
{
    public string IntakeNumber { get; set; } = string.Empty; // TTB-YYYYMMDD-XXXX
    public string VendorId { get; set; } = string.Empty;
    public ConsignmentVendor? Vendor { get; set; }
    public string VendorName { get; set; } = string.Empty;
    
    public DateTime IntakeDate { get; set; } = DateTime.UtcNow;
    public string? ReceivedByStaffName { get; set; }
    public ConsignmentIntakeStatus Status { get; set; } = ConsignmentIntakeStatus.Active;
    
    public int TotalItemsCount { get; set; } = 0;
    public decimal TotalEstimatedValue { get; set; } = 0;
    public string? Notes { get; set; }
    
    public ICollection<ConsignmentIntakeItem> Items { get; set; } = new List<ConsignmentIntakeItem>();
}

public class ConsignmentIntakeItem : BaseEntity
{
    public string ConsignmentIntakeId { get; set; } = string.Empty;
    public ConsignmentIntake? ConsignmentIntake { get; set; }
    
    public string ProductId { get; set; } = string.Empty;
    public Product? Product { get; set; }
    public string ProductName { get; set; } = string.Empty;
    public string ProductSku { get; set; } = string.Empty;
    public string? ProductBarcode { get; set; }
    
    public decimal QuantityReceived { get; set; } = 0;
    public decimal QuantitySold { get; set; } = 0;
    public decimal QuantityReturned { get; set; } = 0;
    public decimal QuantityRemaining { get; set; } = 0;
    
    public decimal VendorPrice { get; set; } = 0; // Harga Pokok / Hak Vendor per Unit
    public decimal SellPrice { get; set; } = 0; // Harga Jual di Kasir POS
    public decimal CommissionRatePercent { get; set; } = 15.00m;
    public ConsignmentCommissionType CommissionType { get; set; } = ConsignmentCommissionType.Percentage;
    
    public string? Notes { get; set; }
}

public class ConsignmentSettlement : BaseEntity
{
    public string SettlementNumber { get; set; } = string.Empty; // STL-YYYYMM-XXXX
    public string VendorId { get; set; } = string.Empty;
    public ConsignmentVendor? Vendor { get; set; }
    public string VendorName { get; set; } = string.Empty;
    
    public DateTime PeriodStartDate { get; set; } = DateTime.UtcNow;
    public DateTime PeriodEndDate { get; set; } = DateTime.UtcNow;
    public DateTime SettlementDate { get; set; } = DateTime.UtcNow;
    
    public decimal TotalSoldQuantity { get; set; } = 0;
    public decimal TotalGrossSales { get; set; } = 0; // Total Penjualan Kotor di POS
    public decimal TotalStoreCommission { get; set; } = 0; // Margin / Pendapatan Komisi Toko
    public decimal TotalVendorPayable { get; set; } = 0; // Bersih Hak Bayar Vendor
    
    public ConsignmentSettlementStatus Status { get; set; } = ConsignmentSettlementStatus.Draft;
    
    // Payout Details
    public string PaymentMethod { get; set; } = "Transfer Bank"; // Transfer Bank, Kas Toko, Giro
    public string? BankDestination { get; set; }
    public string? PaymentReference { get; set; } // No Ref Transaksi Bank
    public DateTime? PaidAt { get; set; }
    public string? ProcessedByStaffName { get; set; }
    public string? Notes { get; set; }
    
    public ICollection<ConsignmentSettlementItem> Items { get; set; } = new List<ConsignmentSettlementItem>();
}

public class ConsignmentSettlementItem : BaseEntity
{
    public string ConsignmentSettlementId { get; set; } = string.Empty;
    public ConsignmentSettlement? ConsignmentSettlement { get; set; }
    
    public string ProductId { get; set; } = string.Empty;
    public string ProductName { get; set; } = string.Empty;
    public string ProductSku { get; set; } = string.Empty;
    
    public decimal SoldQuantity { get; set; } = 0;
    public decimal UnitSellPrice { get; set; } = 0;
    public decimal TotalSalesAmount { get; set; } = 0; // SoldQty * UnitSellPrice
    public decimal StoreCommissionAmount { get; set; } = 0; // SoldQty * Commission
    public decimal VendorPayableAmount { get; set; } = 0; // TotalSalesAmount - StoreCommissionAmount
    
    public decimal RemainingStockSnapshot { get; set; } = 0;
    public string? Notes { get; set; }
}

public class ConsignmentReturn : BaseEntity
{
    public string ReturnNumber { get; set; } = string.Empty; // RTN-YYYYMMDD-XXXX
    public string VendorId { get; set; } = string.Empty;
    public ConsignmentVendor? Vendor { get; set; }
    public string VendorName { get; set; } = string.Empty;
    
    public DateTime ReturnDate { get; set; } = DateTime.UtcNow;
    public ConsignmentReturnStatus Status { get; set; } = ConsignmentReturnStatus.Completed;
    public decimal TotalQuantityReturned { get; set; } = 0;
    public string? Reason { get; set; } // Kadaluarsa, Tidak Laku, Ditarik Vendor
    public string? ProcessedByStaffName { get; set; }
    public string? Notes { get; set; }
    
    public ICollection<ConsignmentReturnItem> Items { get; set; } = new List<ConsignmentReturnItem>();
}

public class ConsignmentReturnItem : BaseEntity
{
    public string ConsignmentReturnId { get; set; } = string.Empty;
    public ConsignmentReturn? ConsignmentReturn { get; set; }
    
    public string ProductId { get; set; } = string.Empty;
    public string ProductName { get; set; } = string.Empty;
    public string ProductSku { get; set; } = string.Empty;
    public decimal QuantityReturned { get; set; } = 0;
    public decimal UnitVendorPrice { get; set; } = 0;
    public string? Notes { get; set; }
}
