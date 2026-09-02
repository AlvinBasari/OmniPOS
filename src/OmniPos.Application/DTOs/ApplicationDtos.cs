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
    string? Notes
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
    List<PaymentResponseDto> Payments
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
    decimal StartingCash
);

public record CloseShiftDto(
    string ShiftId,
    decimal ActualCashCount,
    string? ClosingNotes,
    string? SupervisorPin
);

public record CreateCashTransactionDto(
    string ShiftId,
    bool IsCashIn,
    decimal Amount,
    string Category,
    string Description,
    string UserId
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
    decimal NetSales
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
    List<LowStockItemDto> LowStockAlerts
);

public record DailySalesPointDto(string Date, decimal Revenue, int Transactions);
public record TopSellingProductDto(string ProductName, decimal QuantitySold, decimal Revenue, decimal GrossProfit);
public record PaymentMethodBreakdownDto(string Method, decimal Amount, int Count);
public record DeadStockItemDto(string Sku, string ProductName, string CategoryName, decimal CurrentStock, decimal BuyPrice, decimal TiedCapital);
public record CategoryProfitDto(string CategoryName, decimal Revenue, decimal Cogs, decimal GrossProfit, decimal MarginPercentage);
public record LowStockItemDto(string Sku, string ProductName, decimal CurrentStock, decimal MinStockAlert, string Unit);

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

