namespace OmniPos.Core.Entities.Shifts;

public class Shift : BaseEntity
{
    public string ShiftNumber { get; set; } = string.Empty; // SFT-YYYYMMDD-XX
    public string UserId { get; set; } = string.Empty;
    public string CashierName { get; set; } = string.Empty;
    
    public DateTime StartTime { get; set; } = DateTime.UtcNow;
    public DateTime? EndTime { get; set; }
    public bool IsClosed { get; set; } = false;
    
    public decimal StartingCash { get; set; } = 0; // Modal Awal Laci
    public decimal TotalCashSales { get; set; } = 0;
    public decimal TotalNonCashSales { get; set; } = 0; // QRIS, Debit, Transfer
    public decimal TotalCashIn { get; set; } = 0;  // Petty Cash In
    public decimal TotalCashOut { get; set; } = 0; // Petty Cash Out
    
    public decimal ExpectedCash { get; set; } = 0; // Starting + CashSales + CashIn - CashOut
    public decimal? ActualCashCount { get; set; } // Blind Cash Count by Cashier
    public decimal? CashDiscrepancy { get; set; } // Actual - Expected (Over/Short)
    
    public int TotalTransactions { get; set; } = 0;
    public string? ClosingNotes { get; set; }
    public string? ClosedBySupervisorId { get; set; }
    
    public ICollection<CashTransaction> CashTransactions { get; set; } = new List<CashTransaction>();
}

public class CashTransaction : BaseEntity
{
    public string ShiftId { get; set; } = string.Empty;
    public Shift? Shift { get; set; }
    
    public bool IsCashIn { get; set; } = false; // True = Kas Masuk, False = Kas Keluar
    public decimal Amount { get; set; }
    public string Category { get; set; } = "OPERATIONAL"; // Beli ATK, Tambah Modal, Beli Plastik, dll
    public string Description { get; set; } = string.Empty;
    public string PerformedByUserId { get; set; } = string.Empty;
}
