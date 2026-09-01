using OmniPos.Core.Entities.CRM;
using OmniPos.Core.Entities.Products;
using OmniPos.Core.Entities.Tables;
using OmniPos.Core.Enums;

namespace OmniPos.Core.Entities.Sales;

public class Order : BaseEntity
{
    public string InvoiceNumber { get; set; } = string.Empty; // INV-YYYYMMDD-XXXX
    public DateTime OrderDate { get; set; } = DateTime.UtcNow;
    public OrderStatus Status { get; set; } = OrderStatus.Completed;
    public BusinessMode BusinessMode { get; set; } = BusinessMode.Retail;
    
    public string CashierUserId { get; set; } = string.Empty;
    public string? ShiftId { get; set; }
    
    public string? CustomerId { get; set; }
    public Customer? Customer { get; set; }
    
    public string? DiningTableId { get; set; }
    public DiningTable? DiningTable { get; set; }
    
    public string? ServiceStaffId { get; set; } // For Services mode commission
    
    // Financial Fields (Precise decimal)
    public decimal Subtotal { get; set; } = 0;
    public decimal DiscountAmount { get; set; } = 0;
    public string? DiscountReason { get; set; }
    public decimal TaxAmount { get; set; } = 0;
    public decimal ServiceChargeAmount { get; set; } = 0;
    public decimal RoundingAmount { get; set; } = 0;
    public decimal TotalAmount { get; set; } = 0;
    
    public decimal TotalPaid { get; set; } = 0;
    public decimal ChangeAmount { get; set; } = 0;
    public decimal TotalCogs { get; set; } = 0; // Total HPP untuk Laba Kotor
    
    public bool IsVoided { get; set; } = false;
    public string? VoidReason { get; set; }
    public string? VoidedBySupervisorId { get; set; }
    public DateTime? VoidedAt { get; set; }
    
    public string? Notes { get; set; }
    
    public ICollection<OrderItem> Items { get; set; } = new List<OrderItem>();
    public ICollection<Payment> Payments { get; set; } = new List<Payment>();
}

public class OrderItem : BaseEntity
{
    public string OrderId { get; set; } = string.Empty;
    public Order? Order { get; set; }
    
    public string ProductId { get; set; } = string.Empty;
    public Product? Product { get; set; }
    
    public string? VariantId { get; set; }
    public ProductVariant? Variant { get; set; }
    
    public string ProductName { get; set; } = string.Empty;
    public string? VariantName { get; set; }
    public string? Sku { get; set; }
    
    public decimal Quantity { get; set; } = 1;
    public decimal UnitPrice { get; set; } = 0;
    public decimal UnitCost { get; set; } = 0; // HPP per unit
    public decimal DiscountAmount { get; set; } = 0;
    public decimal TotalPrice { get; set; } = 0;
    public decimal TotalCost { get; set; } = 0;
    
    public string? SerialNumber { get; set; }
    public string? Notes { get; set; }
    
    // KDS Status for F&B
    public string? KitchenStation { get; set; }
    public bool KitchenPrepared { get; set; } = false;
    public DateTime? KitchenPreparedAt { get; set; }
    
    public ICollection<OrderItemModifier> Modifiers { get; set; } = new List<OrderItemModifier>();
}

public class OrderItemModifier : BaseEntity
{
    public string OrderItemId { get; set; } = string.Empty;
    public OrderItem? OrderItem { get; set; }
    
    public string ModifierOptionId { get; set; } = string.Empty;
    public string ModifierName { get; set; } = string.Empty;
    public decimal Price { get; set; } = 0;
    public decimal Cost { get; set; } = 0;
}

public class Payment : BaseEntity
{
    public string OrderId { get; set; } = string.Empty;
    public Order? Order { get; set; }
    
    public PaymentMethod Method { get; set; }
    public decimal Amount { get; set; }
    public string? ReferenceNumber { get; set; } // EDC Auth Code / Bank Ref / QRIS RRN
    public string? CardType { get; set; } // BCA, MANDIRI, VISA, MASTERCARD
    public string? Notes { get; set; }
}

public class HoldOrder : BaseEntity
{
    public string HoldNumber { get; set; } = string.Empty; // HOLD-01
    public string? CustomerName { get; set; }
    public string? TableName { get; set; }
    public string CashierUserId { get; set; } = string.Empty;
    public string SerializedCartJson { get; set; } = string.Empty;
    public decimal TotalEstimated { get; set; }
    public string? Notes { get; set; }
}

public class Promotion : BaseEntity
{
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
    public string? PromoCode { get; set; }
    public PromotionType Type { get; set; }
    
    public decimal DiscountValue { get; set; } // e.g. 10 (%) or 15000 (Rupiah)
    public decimal? MinSpendAmount { get; set; }
    public decimal? MaxDiscountAmount { get; set; }
    
    public DateTime StartDate { get; set; }
    public DateTime EndDate { get; set; }
    public TimeSpan? HappyHourStart { get; set; }
    public TimeSpan? HappyHourEnd { get; set; }
    
    public bool IsActive { get; set; } = true;
    public int UsageCount { get; set; } = 0;
    public int? MaxUsageLimit { get; set; }
}
