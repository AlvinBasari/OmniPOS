namespace OmniPos.Core.Entities.CRM;

public class Customer : BaseEntity
{
    public string Name { get; set; } = string.Empty;
    public string? PhoneNumber { get; set; } // For WhatsApp receipt & notification
    public string? Email { get; set; }
    public string? Address { get; set; }
    public string CustomerGroup { get; set; } = "REGULAR"; // REGULAR, MEMBER, VIP, RESELLER
    
    public int LoyaltyPoints { get; set; } = 0;
    public decimal DepositBalance { get; set; } = 0; // Saldo Deposit Belanja
    public decimal TotalReceivable { get; set; } = 0; // Total Hutang / Kasbon
    public decimal CreditLimit { get; set; } = 1000000; // Batas Maksimal Kasbon
    
    public ICollection<CustomerPoint> PointHistories { get; set; } = new List<CustomerPoint>();
    public ICollection<CustomerReceivable> Receivables { get; set; } = new List<CustomerReceivable>();
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
