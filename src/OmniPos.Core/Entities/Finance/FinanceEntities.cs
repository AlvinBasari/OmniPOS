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
