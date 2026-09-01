using OmniPos.Core.Enums;

namespace OmniPos.Core.Entities.Tables;

public class FloorPlanArea : BaseEntity
{
    public string Name { get; set; } = string.Empty; // e.g. "Lantai 1", "Outdoor", "VIP"
    public int SortOrder { get; set; } = 0;
    
    public ICollection<DiningTable> Tables { get; set; } = new List<DiningTable>();
}

public class DiningTable : BaseEntity
{
    public string AreaId { get; set; } = string.Empty;
    public FloorPlanArea? Area { get; set; }
    
    public string TableNumber { get; set; } = string.Empty; // e.g. "A-01", "VIP-1"
    public int Capacity { get; set; } = 4;
    public TableStatus Status { get; set; } = TableStatus.Available;
    
    public int PositionX { get; set; } = 0; // Grid coordinate for canvas
    public int PositionY { get; set; } = 0;
    
    public string? CurrentOrderId { get; set; }
    public decimal CurrentBillAmount { get; set; } = 0;
    public DateTime? OccupiedSince { get; set; }
}
