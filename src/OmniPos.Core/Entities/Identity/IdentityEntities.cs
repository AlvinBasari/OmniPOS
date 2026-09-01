using OmniPos.Core.Enums;

namespace OmniPos.Core.Entities.Identity;

public class User : BaseEntity
{
    public string Username { get; set; } = string.Empty;
    public string FullName { get; set; } = string.Empty;
    public string PasswordHash { get; set; } = string.Empty;
    public string PinCodeHash { get; set; } = string.Empty; // 6-digit PIN for quick cashier login & supervisor approval
    public UserRole Role { get; set; } = UserRole.Cashier;
    public bool IsActive { get; set; } = true;
    public DateTime? LastLoginAt { get; set; }
}

public class AuditLog : BaseEntity
{
    public string UserId { get; set; } = string.Empty;
    public string UserName { get; set; } = string.Empty;
    public string Action { get; set; } = string.Empty; // VOID_ITEM, CANCEL_ORDER, OPEN_DRAWER, CHANGE_PRICE
    public string Module { get; set; } = string.Empty;
    public string? ReferenceId { get; set; }
    public string Details { get; set; } = string.Empty;
    public string? SupervisorApprovedBy { get; set; }
}

public class AppSetting : BaseEntity
{
    public string SettingKey { get; set; } = string.Empty;
    public string SettingValue { get; set; } = string.Empty;
    public string? Description { get; set; }
}

public class BackupHistory : BaseEntity
{
    public string FileName { get; set; } = string.Empty;
    public long FileSizeBytes { get; set; }
    public string? GoogleDriveFileId { get; set; }
    public string? ChecksumSha256 { get; set; }
    public bool IsEncrypted { get; set; } = true;
    public bool IsUploadedToDrive { get; set; } = false;
    public string TriggerSource { get; set; } = "SHIFT_CLOSE"; // SHIFT_CLOSE, SCHEDULED, MANUAL
    public string Status { get; set; } = "SUCCESS";
    public string? ErrorMessage { get; set; }
}
