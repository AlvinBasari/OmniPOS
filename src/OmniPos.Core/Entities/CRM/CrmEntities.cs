namespace OmniPos.Core.Entities.CRM;

public class Customer : BaseEntity
{
    public string Name { get; set; } = string.Empty;
    public string? PhoneNumber { get; set; } // For WhatsApp receipt & notification
    public string? Email { get; set; }
    public string? Address { get; set; }
    public string CustomerGroup { get; set; } = "REGULAR"; // REGULAR, MEMBER, VIP, RESELLER
    public string MemberTier { get; set; } = "BRONZE"; // BRONZE, SILVER, GOLD, PLATINUM
    public string? MemberCode { get; set; } // Barcode / RFID Card Number
    public DateTime? BirthDate { get; set; } // For Birthday wishes & vouchers
    public string? Notes { get; set; }

    public int LoyaltyPoints { get; set; } = 0;
    public decimal DepositBalance { get; set; } = 0; // Saldo Deposit Belanja
    public decimal TotalReceivable { get; set; } = 0; // Total Hutang / Kasbon
    public decimal CreditLimit { get; set; } = 1000000; // Batas Maksimal Kasbon
    
    // CRM 360 Lifetime Metrics
    public decimal TotalSpent { get; set; } = 0;
    public int VisitCount { get; set; } = 0;
    public DateTime? LastVisitDate { get; set; }

    public ICollection<CustomerPoint> PointHistories { get; set; } = new List<CustomerPoint>();
    public ICollection<CustomerReceivable> Receivables { get; set; } = new List<CustomerReceivable>();
    public ICollection<CustomerDepositTransaction> DepositHistories { get; set; } = new List<CustomerDepositTransaction>();
}

public class CustomerDepositTransaction : BaseEntity
{
    public string CustomerId { get; set; } = string.Empty;
    public Customer? Customer { get; set; }
    public decimal Amount { get; set; } // + for topup, - for payment deduction
    public string Type { get; set; } = "TOPUP"; // TOPUP, PURCHASE_PAYMENT, REFUND
    public string PaymentMethod { get; set; } = "CASH";
    public string? ReferenceNumber { get; set; }
    public string CashierUserId { get; set; } = string.Empty;
    public string? Notes { get; set; }
    public decimal BalanceAfter { get; set; }
}

public class CustomerPoint : BaseEntity
{
    public string CustomerId { get; set; } = string.Empty;
    public Customer? Customer { get; set; }
    
    public int Points { get; set; } // + for earn, - for redeem
    public string Reason { get; set; } = string.Empty;
    public string? ReferenceOrderNumber { get; set; }
}

public class CustomerReceivable : BaseEntity
{
    public string CustomerId { get; set; } = string.Empty;
    public Customer? Customer { get; set; }
    
    public string InvoiceNumber { get; set; } = string.Empty;
    public decimal OriginalAmount { get; set; }
    public decimal RemainingAmount { get; set; }
    public DateTime DueDate { get; set; }
    public bool IsPaidOff { get; set; } = false;
    public DateTime? PaidOffDate { get; set; }
    
    public ICollection<CustomerReceivablePayment> Payments { get; set; } = new List<CustomerReceivablePayment>();
}

public class CustomerReceivablePayment : BaseEntity
{
    public string ReceivableId { get; set; } = string.Empty;
    public CustomerReceivable? Receivable { get; set; }
    
    public decimal AmountPaid { get; set; }
    public string PaymentMethod { get; set; } = "CASH";
    public string? ReferenceNumber { get; set; }
    public string ReceivedByUserId { get; set; } = string.Empty;
    public string? Notes { get; set; }
}
