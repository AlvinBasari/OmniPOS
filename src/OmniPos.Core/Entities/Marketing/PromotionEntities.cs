namespace OmniPos.Core.Entities.Marketing;

public enum PromotionType
{
    BuyXGetY,              // Beli X Gratis Y
    BundlingPackage,       // Paket Bundling Sembako
    HappyHourDiscount,     // Diskon Jam Tertentu
    MinimumSpendDiscount   // Diskon Belanja Minimal Rp
}

public class PromotionRule : BaseEntity
{
    public string Name { get; set; } = string.Empty;
    public string? Code { get; set; }
    public string? Description { get; set; }
    public PromotionType PromoType { get; set; } = PromotionType.BuyXGetY;

    // Buy X Get Y Parameters
    public string? BuyProductId { get; set; }
    public string? BuyProductName { get; set; }
    public decimal BuyQuantityRequired { get; set; } = 2;
    public string? GetFreeProductId { get; set; }
    public string? GetFreeProductName { get; set; }
    public decimal GetFreeQuantity { get; set; } = 1;

    // Discount Parameters
    public decimal DiscountPercent { get; set; } = 0;
    public decimal DiscountNominal { get; set; } = 0;
    public decimal MinimumSpendAmount { get; set; } = 0;
    public decimal BundleSpecialPrice { get; set; } = 0;

    // Schedule Parameters
    public DateTime? StartDate { get; set; }
    public DateTime? EndDate { get; set; }
    public TimeSpan? StartTime { get; set; } // e.g. 14:00
    public TimeSpan? EndTime { get; set; }   // e.g. 17:00
    public bool IsActive { get; set; } = true;
}
