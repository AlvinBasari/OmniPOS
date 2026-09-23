using OmniPos.Core.Entities;
using OmniPos.Core.Enums;

namespace OmniPos.Core.Entities.Identity;

/// <summary>
/// Template Shift Toko (misal: Shift Pagi 07:00 - 15:00, Shift Siang 14:00 - 22:00, Full Day 08:00 - 20:00)
/// </summary>
public class ShiftTemplate : BaseEntity
{
    public string Name { get; set; } = string.Empty;
    public string StartTime { get; set; } = "07:00"; // Format HH:mm (24-hour)
    public string EndTime { get; set; } = "15:00";   // Format HH:mm (24-hour)
    public int GracePeriodMinutes { get; set; } = 15; // Toleransi keterlambatan (menit)
    public bool IsActive { get; set; } = true;
    public string ColorTag { get; set; } = "emerald"; // emerald, blue, amber, purple, rose, indigo
    public string? Description { get; set; }
}

/// <summary>
/// Jadwal Kerja Mingguan Karyawan (Roster)
/// </summary>
public class EmployeeSchedule : BaseEntity
{
    public string UserId { get; set; } = string.Empty;
    public int DayOfWeek { get; set; } // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
    public bool IsWorkDay { get; set; } = true;
    public string? ShiftTemplateId { get; set; }
    public ShiftTemplate? ShiftTemplate { get; set; }
    
    public string? CustomStartTime { get; set; }
    public string? CustomEndTime { get; set; }
    public string? Notes { get; set; }
}

/// <summary>
/// Granular Feature Permissions per User / Role
/// </summary>
public class UserPermission : BaseEntity
{
    public string UserId { get; set; } = string.Empty;
    public UserRole? TargetRole { get; set; }

    public bool CanApplyManualDiscount { get; set; } = false;
    public bool CanVoidOrderItem { get; set; } = false;
    public bool CanAccessReports { get; set; } = false;
    public bool CanEditProductPrice { get; set; } = false;
    public bool CanOpenCashDrawerDirectly { get; set; } = false;
    public bool CanAuthorizeCustomerDebt { get; set; } = false;
    public bool CanModifyInventory { get; set; } = false;
    public bool CanManagePromotions { get; set; } = false;
    public bool CanManageUsers { get; set; } = false;
}
