using OmniPos.Core.Enums;

namespace OmniPos.Core.Entities.Finance;

public class Account : BaseEntity
{
    public string AccountCode { get; set; } = string.Empty; // e.g. 1001 (Kas), 4001 (Penjualan), 5001 (HPP)
    public string AccountName { get; set; } = string.Empty;
    public AccountType Type { get; set; }
    public decimal CurrentBalance { get; set; } = 0;
    public bool IsSystemDefault { get; set; } = true;
}

public class JournalEntry : BaseEntity
{
    public string EntryNumber { get; set; } = string.Empty; // JRN-YYYYMMDD-XXXX
    public DateTime TransactionDate { get; set; } = DateTime.UtcNow;
    public string Description { get; set; } = string.Empty;
    public string? ReferenceNumber { get; set; } // Invoice No / PO No / Shift No
    public string SourceModule { get; set; } = "SALES"; // SALES, INVENTORY, PETTY_CASH, CLOSING
    
    public decimal TotalDebit { get; set; }
    public decimal TotalCredit { get; set; }
    
    public ICollection<JournalDetail> Details { get; set; } = new List<JournalDetail>();
}

public class JournalDetail : BaseEntity
{
    public string JournalEntryId { get; set; } = string.Empty;
    public JournalEntry? JournalEntry { get; set; }
    
    public string AccountId { get; set; } = string.Empty;
    public Account? Account { get; set; }
    
    public decimal Debit { get; set; } = 0;
    public decimal Credit { get; set; } = 0;
    public string? Notes { get; set; }
}

public class Expense : BaseEntity
{
    public string ExpenseNumber { get; set; } = string.Empty; // EXP-YYYYMMDD-XXXX
    public DateTime ExpenseDate { get; set; } = DateTime.UtcNow;
    public string? CategoryId { get; set; }
    public string CategoryName { get; set; } = "Operasional";
    public decimal Amount { get; set; }
    public string PaymentSource { get; set; } = "PETTY_CASH"; // PETTY_CASH, STORE_SAFE, BANK_TRANSFER, OWNER_POCKET
    public string? ShiftId { get; set; }
    public string? CashTransactionId { get; set; }
    public string? Payee { get; set; } // Vendor / Toko / Karyawan Penerima
    public string Description { get; set; } = string.Empty;
    public string? ReceiptPhotoBase64 { get; set; } // Base64 image data of receipt
    public string? RecordedByUserId { get; set; }
    public string? RecordedByUserName { get; set; }
    public string ApprovalStatus { get; set; } = "APPROVED"; // APPROVED, PENDING, REJECTED
    public string? ApprovedBySupervisorId { get; set; }
}

public class ExpenseCategory : BaseEntity
{
    public string Name { get; set; } = string.Empty;
    public string Code { get; set; } = string.Empty;
    public string IconName { get; set; } = "Receipt";
    public string ColorTag { get; set; } = "#3b82f6";
    public decimal MonthlyBudget { get; set; } = 0;
    public string? Description { get; set; }
    public bool IsDefault { get; set; } = false;
}
