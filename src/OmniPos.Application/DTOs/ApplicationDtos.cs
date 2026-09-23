using OmniPos.Core.Entities.Shifts;
using OmniPos.Core.Enums;

namespace OmniPos.Application.DTOs;

public record CreateOrderDto(
    string CashierUserId,
    string? ShiftId,
    string? CustomerId,
    string? DiningTableId,
    string? ServiceStaffId,
    BusinessMode BusinessMode,
    List<CreateOrderItemDto> Items,
    List<CreatePaymentDto> Payments,
    decimal DiscountAmount,
    string? DiscountReason,
    decimal TaxPercentage,
    decimal ServiceChargePercentage,
    decimal RoundingAmount,
    string? Notes,
    int RedeemedPoints = 0,
    decimal RedeemedPointsDiscountAmount = 0,
    string? CouponCode = null,
    decimal CouponDiscountAmount = 0
);

public record CreateOrderItemDto(
    string ProductId,
    string? VariantId,
    decimal Quantity,
    decimal UnitPrice,
    decimal DiscountAmount,
    string? Notes,
    List<string>? ModifierOptionIds,
    string? SerialNumber,
    decimal UnitConversionMultiplier = 1
);

public record CreatePaymentDto(
    PaymentMethod Method,
    decimal Amount,
    string? ReferenceNumber,
    string? CardType,
    string? Notes
);

public record OrderResponseDto(
    string Id,
    string InvoiceNumber,
    DateTime OrderDate,
    OrderStatus Status,
    string CashierUserId,
    string? CustomerName,
    string? TableNumber,
    decimal Subtotal,
    decimal DiscountAmount,
    decimal TaxAmount,
    decimal ServiceChargeAmount,
    decimal RoundingAmount,
    decimal TotalAmount,
    decimal TotalPaid,
    decimal ChangeAmount,
    List<OrderItemResponseDto> Items,
    List<PaymentResponseDto> Payments,
    int RedeemedPoints = 0,
    decimal RedeemedPointsDiscountAmount = 0,
    string? CouponCode = null,
    decimal CouponDiscountAmount = 0,
    int EarnedPoints = 0,
    string? CustomerPhone = null,
    int CustomerLoyaltyPointsRemaining = 0
);

// Coupons & Loyalty Program DTOs
public record CouponDto(
    string Id,
    string Code,
    string Name,
    string? Description,
    string DiscountType,
    decimal DiscountValue,
    decimal MinimumSpendAmount,
    decimal MaxDiscountAmount,
    DateTime? StartDate,
    DateTime? EndDate,
    int UsageLimit,
    int UsageCount,
    bool IsActive,
    string AllowedCustomerTier,
    DateTime CreatedAt
);

public record CreateCouponDto(
    string Code,
    string Name,
    string? Description,
    string DiscountType,
    decimal DiscountValue,
    decimal MinimumSpendAmount,
    decimal MaxDiscountAmount,
    DateTime? StartDate,
    DateTime? EndDate,
    int UsageLimit,
    string? AllowedCustomerTier = "ALL"
);

public record UpdateCouponDto(
    string Name,
    string? Description,
    string DiscountType,
    decimal DiscountValue,
    decimal MinimumSpendAmount,
    decimal MaxDiscountAmount,
    DateTime? StartDate,
    DateTime? EndDate,
    int UsageLimit,
    bool IsActive,
    string? AllowedCustomerTier = "ALL"
);

public record ValidateCouponRequestDto(
    string Code,
    decimal Subtotal,
    string? CustomerId = null
);

public record ValidateCouponResponseDto(
    bool IsValid,
    string Message,
    string? CouponCode,
    string? CouponName,
    string? DiscountType,
    decimal DiscountValue,
    decimal DiscountAmount,
    decimal FinalTotalAfterDiscount
);

public record LoyaltySettingsDto(
    decimal PointsPerSpendAmount, // e.g. 10000 = 1 pt
    decimal RedeemValuePerPoint,  // e.g. 1 pt = 1000 IDR
    int MinPointsToRedeem,        // e.g. 10 pts min
    decimal SilverThresholdSpend,
    decimal GoldThresholdSpend,
    decimal PlatinumThresholdSpend,
    decimal SilverPointMultiplier,
    decimal GoldPointMultiplier,
    decimal PlatinumPointMultiplier
);


public record OrderItemResponseDto(
    string Id,
    string ProductName,
    string? VariantName,
    decimal Quantity,
    decimal UnitPrice,
    decimal TotalPrice,
    List<string> Modifiers,
    string? Notes
);

public record PaymentResponseDto(
    string Id,
    PaymentMethod Method,
    decimal Amount,
    string? ReferenceNumber
);

public record OpenShiftDto(
    string UserId,
    string CashierName,
    decimal StartingCash,
    string? StartingCashDenominations = null,
    string? ShiftTemplateId = null
);

public record CloseShiftDto(
    string ShiftId,
    decimal ActualCashCount,
    string? ClosingNotes,
    string? SupervisorPin,
    string? ClosingCashDenominations = null
);

public record CreateCashTransactionDto(
    string ShiftId,
    bool IsCashIn,
    decimal Amount,
    string Category,
    string Description,
    string UserId
);

public record ShiftPaymentBreakdownDto(
    string Method,
    decimal Amount,
    int Count
);

public record ShiftTopProductDto(
    string ProductName,
    int Quantity,
    decimal Revenue
);

public record ShiftOrderSummaryDto(
    string OrderId,
    string InvoiceNumber,
    DateTime OrderDate,
    string CustomerName,
    decimal TotalAmount,
    string PaymentMethods,
    string Status
);

public record ShiftDashboardDto(
    string ShiftId,
    string ShiftNumber,
    string UserId,
    string CashierName,
    DateTime StartTime,
    int DurationMinutes,
    decimal StartingCash,
    decimal TotalCashSales,
    decimal TotalNonCashSales,
    decimal TotalCashIn,
    decimal TotalCashOut,
    decimal ExpectedCash,
    int TotalTransactions,
    decimal GrossSales,
    decimal TotalDiscounts,
    decimal NetSales,
    List<ShiftPaymentBreakdownDto> PaymentBreakdown,
    List<ShiftTopProductDto> TopProducts,
    List<ShiftOrderSummaryDto> Orders,
    List<CashTransaction> CashTransactions
);

public record ShiftHistoryItemDto(
    string ShiftId,
    string ShiftNumber,
    string UserId,
    string CashierName,
    DateTime StartTime,
    DateTime? EndTime,
    int DurationMinutes,
    decimal StartingCash,
    decimal TotalCashSales,
    decimal TotalNonCashSales,
    decimal ExpectedCash,
    decimal? ActualCashCount,
    decimal? CashDiscrepancy,
    int TotalTransactions,
    decimal NetSales,
    string? ClosingNotes
);

public record ZReportDto(
    string ShiftNumber,
    string CashierName,
    DateTime StartTime,
    DateTime EndTime,
    decimal StartingCash,
    decimal TotalCashSales,
    decimal TotalNonCashSales,
    decimal TotalCashIn,
    decimal TotalCashOut,
    decimal ExpectedCash,
    decimal ActualCashCount,
    decimal CashDiscrepancy,
    int TotalTransactions,
    decimal GrossSales,
    decimal TotalDiscounts,
    decimal NetSales,
    string? ClosingNotes = null,
    string? ClosingCashDenominations = null,
    List<ShiftPaymentBreakdownDto>? Payments = null
);

public record SalesSummaryDto(
    decimal TotalRevenue,
    decimal TotalGrossProfit,
    decimal TotalDiscounts,
    int TotalTransactions,
    decimal AverageTicketSize,
    List<DailySalesPointDto> DailyTrend,
    List<TopSellingProductDto> TopProducts,
    List<PaymentMethodBreakdownDto> PaymentBreakdown,
    List<DeadStockItemDto> DeadStock,
    List<CategoryProfitDto> CategoryProfits,
    List<LowStockItemDto> LowStockAlerts,
    List<HourlySalesPointDto> HourlyTrend,
    List<DayOfWeekSalesPointDto> DayOfWeekTrend,
    TaxAuditDto TaxAudit,
    List<CashierSalesDto> CashierSales,
    PeriodGrowthDto PeriodGrowth
);

public record DailySalesPointDto(string Date, decimal Revenue, int Transactions);
public record TopSellingProductDto(string ProductName, decimal QuantitySold, decimal Revenue, decimal GrossProfit);
public record PaymentMethodBreakdownDto(string Method, decimal Amount, int Count);
public record DeadStockItemDto(string Sku, string ProductName, string CategoryName, decimal CurrentStock, decimal BuyPrice, decimal TiedCapital);
public record CategoryProfitDto(string CategoryName, decimal Revenue, decimal Cogs, decimal GrossProfit, decimal MarginPercentage);
public record LowStockItemDto(string Sku, string ProductName, decimal CurrentStock, decimal MinStockAlert, string Unit);
public record HourlySalesPointDto(int Hour, string HourLabel, decimal Revenue, int Transactions, bool IsPeak);
public record DayOfWeekSalesPointDto(int DayIndex, string DayName, decimal Revenue, int Transactions);
public record TaxAuditDto(decimal TaxableSales, decimal NonTaxableSales, decimal TotalTax, decimal TotalServiceCharge, decimal TotalRounding);
public record CashierSalesDto(string CashierId, string CashierName, decimal Revenue, int Transactions, decimal AverageTicket, decimal RevenueSharePercent);
public record PeriodGrowthDto(decimal RevenueGrowthPercent, decimal TransactionsGrowthPercent, decimal ProfitGrowthPercent, decimal BasketGrowthPercent);

public record DynamicQrisResponse(
    string QrisPayload,
    decimal Amount,
    string ReferenceNumber,
    string InvoiceNumber
);

public record HardwareStatusDto(
    DeviceStatusItemDto Printer,
    DeviceStatusItemDto CashDrawer,
    DeviceStatusItemDto BarcodeScanner,
    DeviceStatusItemDto DigitalScale,
    DeviceStatusItemDto CustomerDisplay,
    DeviceStatusItemDto KitchenDisplay,
    DeviceStatusItemDto MobileScanner,
    DateTime CheckedAt
);

public record DeviceStatusItemDto(
    string DeviceType,
    string Name,
    string Status,
    bool IsOnline,
    string ConnectionMode,
    string? Details,
    string? FallbackInstruction
);

public record PayCustomerReceivableDto(
    decimal Amount,
    string PaymentMethod = "Cash",
    string? ReferenceNumber = null,
    string? Notes = null,
    string? CashierUserId = null
);

public record CustomerDepositTopupDto(
    decimal Amount,
    string PaymentMethod = "Cash",
    string? ReferenceNumber = null,
    string? Notes = null,
    string? CashierUserId = null
);

public record CustomerRedeemPointsDto(
    int Points,
    decimal DiscountValue,
    string? ReferenceOrderNumber = null,
    string? Reason = null
);

public record CustomerUpdateDto(
    string Name,
    string? PhoneNumber,
    string? Email,
    string? Address,
    string? CustomerGroup,
    string? MemberTier,
    string? MemberCode,
    DateTime? BirthDate,
    decimal CreditLimit,
    string? Notes
);

public record CreateShiftTemplateDto(
    string Name,
    string StartTime,
    string EndTime,
    int GracePeriodMinutes = 15,
    string ColorTag = "emerald",
    string? Description = null
);

public record UpdateShiftTemplateDto(
    string Name,
    string StartTime,
    string EndTime,
    int GracePeriodMinutes = 15,
    string ColorTag = "emerald",
    bool IsActive = true,
    string? Description = null
);

public record EmployeeScheduleItemDto(
    int DayOfWeek,
    bool IsWorkDay,
    string? ShiftTemplateId = null,
    string? CustomStartTime = null,
    string? CustomEndTime = null,
    string? Notes = null
);

public record SaveEmployeeScheduleDto(
    List<EmployeeScheduleItemDto> Schedules
);

public record UserPermissionDto(
    string? UserId,
    UserRole? TargetRole,
    bool CanApplyManualDiscount = true,
    bool CanVoidOrderItem = false,
    bool CanAccessReports = false,
    bool CanEditProductPrice = false,
    bool CanOpenCashDrawerDirectly = false,
    bool CanAuthorizeCustomerDebt = false,
    bool CanModifyInventory = false,
    bool CanManagePromotions = false,
    bool CanManageUsers = false
);

public record CreateExpenseDto(
    DateTime? ExpenseDate,
    string? CategoryId,
    string CategoryName,
    decimal Amount,
    string PaymentSource = "PETTY_CASH", // PETTY_CASH, STORE_SAFE, BANK_TRANSFER, OWNER_POCKET
    string? ShiftId = null,
    string? Payee = null,
    string Description = "",
    string? ReceiptPhotoBase64 = null,
    string? RecordedByUserId = null,
    string? RecordedByUserName = null
);

public record UpdateExpenseDto(
    DateTime? ExpenseDate,
    string? CategoryId,
    string CategoryName,
    decimal Amount,
    string PaymentSource,
    string? Payee,
    string Description,
    string? ReceiptPhotoBase64
);

public record CreateExpenseCategoryDto(
    string Name,
    string? Code,
    string IconName = "Receipt",
    string ColorTag = "#3b82f6",
    decimal MonthlyBudget = 0,
    string? Description = null
);

public record UpdateExpenseCategoryDto(
    string Name,
    string? Code,
    string IconName = "Receipt",
    string ColorTag = "#3b82f6",
    decimal MonthlyBudget = 0,
    string? Description = null
);

// Payment Gateway & Real-time QRIS DTOs
public record QrisGenerateRequestDto(
    decimal Amount,
    string InvoiceNumber,
    string? CustomerName = null,
    string? Provider = null
);

public record QrisSessionDto(
    string ReferenceId,
    string InvoiceNumber,
    decimal Amount,
    string QrisPayload,
    string QrisDataUrl,
    string Status,
    DateTime CreatedAt,
    DateTime ExpiresAt,
    string? Issuer,
    string? Rrn,
    string Provider
);

public record QrisStatusDto(
    string ReferenceId,
    string InvoiceNumber,
    decimal Amount,
    string Status,
    bool IsSettled,
    string? Issuer,
    string? Rrn,
    DateTime? SettledAt,
    string Message
);

public record QrisSimulatePayDto(
    string? Issuer = "BCA Mobile",
    string? Rrn = null
);

public record EdcEcrTriggerRequest(
    decimal Amount,
    string InvoiceNumber,
    string Bank,
    string CardType,
    string? EcrHost = null,
    int? EcrPort = null,
    string? ComPort = null
);

public record EdcEcrTriggerResponse(
    bool Success,
    string ResponseCode,
    string ApprovalCode,
    string CardNumber,
    string CardType,
    string Bank,
    string Message,
    string TraceNumber
);

public record PaymentGatewaySettingsDto(
    string QrisProvider,
    string QrisNmid,
    string QrisMerchantName,
    string QrisMerchantCity,
    string QrisServerKey,
    string QrisClientKey,
    string EdcIntegrationMode,
    string EdcDefaultBank,
    string EdcEcrIp,
    int EdcEcrPort,
    string EdcEcrComPort,
    decimal EdcSurchargePercent
);
