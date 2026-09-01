using Microsoft.EntityFrameworkCore;
using OmniPos.Application.DTOs;
using OmniPos.Core.Entities.Finance;
using OmniPos.Core.Entities.Shifts;
using OmniPos.Core.Enums;
using OmniPos.Infrastructure.Data;

namespace OmniPos.Application.Services;

public class ShiftService
{
    private readonly AppDbContext _context;

    public ShiftService(AppDbContext context)
    {
        _context = context;
    }

    public async Task<Shift> OpenShiftAsync(OpenShiftDto dto, CancellationToken ct = default)
    {
        var shiftNumber = $"SFT-{DateTime.UtcNow:yyyyMMdd}-{Guid.NewGuid().ToString("N")[..4].ToUpper()}";
        var shift = new Shift
        {
            ShiftNumber = shiftNumber,
            UserId = dto.UserId,
            CashierName = dto.CashierName,
            StartTime = DateTime.UtcNow,
            StartingCash = dto.StartingCash,
            ExpectedCash = dto.StartingCash,
            IsClosed = false
        };

        await _context.Shifts.AddAsync(shift, ct);
        await _context.SaveChangesAsync(ct);
        return shift;
    }

    public async Task<ZReportDto> CloseShiftAsync(CloseShiftDto dto, CancellationToken ct = default)
    {
        var shift = await _context.Shifts
            .Include(s => s.CashTransactions)
            .FirstOrDefaultAsync(s => s.Id == dto.ShiftId, ct);

        if (shift == null) throw new InvalidOperationException("Shift not found.");
        if (shift.IsClosed) throw new InvalidOperationException("Shift is already closed.");

        shift.IsClosed = true;
        shift.EndTime = DateTime.UtcNow;
        shift.ActualCashCount = dto.ActualCashCount;
        shift.CashDiscrepancy = dto.ActualCashCount - shift.ExpectedCash;
        shift.ClosingNotes = dto.ClosingNotes;

        // Fetch shift orders
        var shiftOrders = await _context.Orders
            .Where(o => o.ShiftId == shift.Id && !o.IsVoided)
            .ToListAsync(ct);

        var grossSales = shiftOrders.Sum(o => o.Subtotal);
        var totalDiscounts = shiftOrders.Sum(o => o.DiscountAmount);
        var netSales = shiftOrders.Sum(o => o.TotalAmount);

        await _context.SaveChangesAsync(ct);

        return new ZReportDto(
            ShiftNumber: shift.ShiftNumber,
            CashierName: shift.CashierName,
            StartTime: shift.StartTime,
            EndTime: shift.EndTime.Value,
            StartingCash: shift.StartingCash,
            TotalCashSales: shift.TotalCashSales,
            TotalNonCashSales: shift.TotalNonCashSales,
            TotalCashIn: shift.TotalCashIn,
            TotalCashOut: shift.TotalCashOut,
            ExpectedCash: shift.ExpectedCash,
            ActualCashCount: shift.ActualCashCount.Value,
            CashDiscrepancy: shift.CashDiscrepancy.Value,
            TotalTransactions: shift.TotalTransactions,
            GrossSales: grossSales,
            TotalDiscounts: totalDiscounts,
            NetSales: netSales
        );
    }

    public async Task<CashTransaction> AddCashTransactionAsync(CreateCashTransactionDto dto, CancellationToken ct = default)
    {
        var shift = await _context.Shifts.FirstOrDefaultAsync(s => s.Id == dto.ShiftId, ct);
        if (shift == null || shift.IsClosed) throw new InvalidOperationException("Active shift not found.");

        var tx = new CashTransaction
        {
            ShiftId = shift.Id,
            IsCashIn = dto.IsCashIn,
            Amount = dto.Amount,
            Category = dto.Category,
            Description = dto.Description,
            PerformedByUserId = dto.UserId
        };

        if (dto.IsCashIn)
            shift.TotalCashIn += dto.Amount;
        else
            shift.TotalCashOut += dto.Amount;

        shift.ExpectedCash = shift.StartingCash + shift.TotalCashSales + shift.TotalCashIn - shift.TotalCashOut;

        await _context.CashTransactions.AddAsync(tx, ct);
        await _context.SaveChangesAsync(ct);
        return tx;
    }
}

public class FinancialReportService
{
    private readonly AppDbContext _context;

    public FinancialReportService(AppDbContext context)
    {
        _context = context;
    }

    public async Task<SalesSummaryDto> GetSalesSummaryAsync(DateTime startDate, DateTime endDate, CancellationToken ct = default)
    {
        var orders = await _context.Orders
            .Include(o => o.Items)
            .Include(o => o.Payments)
            .Where(o => o.OrderDate >= startDate && o.OrderDate <= endDate && !o.IsVoided)
            .ToListAsync(ct);

        var totalRevenue = orders.Sum(o => o.TotalAmount);
        var totalCogs = orders.Sum(o => o.TotalCogs);
        var totalDiscounts = orders.Sum(o => o.DiscountAmount);
        var totalTransactions = orders.Count;
        var avgTicket = totalTransactions > 0 ? (totalRevenue / totalTransactions) : 0;
        var grossProfit = totalRevenue - totalCogs;

        // Daily trend
        var dailyTrend = orders
            .GroupBy(o => o.OrderDate.ToString("yyyy-MM-dd"))
            .Select(g => new DailySalesPointDto(
                Date: g.Key,
                Revenue: g.Sum(o => o.TotalAmount),
                Transactions: g.Count()
            ))
            .OrderBy(d => d.Date)
            .ToList();

        // Top fast-moving products
        var topProducts = orders
            .SelectMany(o => o.Items)
            .GroupBy(i => i.ProductName)
            .Select(g => new TopSellingProductDto(
                ProductName: g.Key,
                QuantitySold: g.Sum(i => i.Quantity),
                Revenue: g.Sum(i => i.TotalPrice),
                GrossProfit: g.Sum(i => i.TotalPrice - i.TotalCost)
            ))
            .OrderByDescending(p => p.QuantitySold)
            .Take(10)
            .ToList();

        // Payment breakdown
        var paymentBreakdown = orders
            .SelectMany(o => o.Payments)
            .GroupBy(p => p.Method.ToString())
            .Select(g => new PaymentMethodBreakdownDto(
                Method: g.Key,
                Amount: g.Sum(p => p.Amount),
                Count: g.Count()
            ))
            .ToList();

        // All active products in catalog for Dead Stock & Low Stock Analysis
        var allProducts = await _context.Products
            .Include(p => p.Category)
            .Where(p => !p.IsDeleted)
            .ToListAsync(ct);

        var soldProductIds = orders
            .SelectMany(o => o.Items)
            .Select(i => i.ProductId)
            .ToHashSet();

        // Dead Stock / Slow-Moving: active items in inventory with zero sales in the period
        var deadStock = allProducts
            .Where(p => p.CurrentStock > 0 && !soldProductIds.Contains(p.Id))
            .Select(p => new DeadStockItemDto(
                Sku: p.Sku,
                ProductName: p.Name,
                CategoryName: p.Category?.Name ?? "Umum",
                CurrentStock: p.CurrentStock,
                BuyPrice: p.BuyPrice,
                TiedCapital: p.CurrentStock * p.BuyPrice
            ))
            .OrderByDescending(d => d.TiedCapital)
            .Take(15)
            .ToList();

        // Category Gross Profit Breakdown
        var prodCategoryMap = allProducts.ToDictionary(p => p.Id, p => p.Category?.Name ?? "Umum");
        var categoryProfits = orders
            .SelectMany(o => o.Items)
            .GroupBy(i => prodCategoryMap.TryGetValue(i.ProductId, out var cat) ? cat : "Umum")
            .Select(g =>
            {
                var rev = g.Sum(i => i.TotalPrice);
                var cogs = g.Sum(i => i.TotalCost);
                var gp = rev - cogs;
                var margin = rev > 0 ? (gp / rev) * 100 : 0;
                return new CategoryProfitDto(
                    CategoryName: g.Key,
                    Revenue: rev,
                    Cogs: cogs,
                    GrossProfit: gp,
                    MarginPercentage: Math.Round(margin, 1)
                );
            })
            .OrderByDescending(c => c.GrossProfit)
            .ToList();

        // Low Stock Alert Items
        var lowStockAlerts = allProducts
            .Where(p => p.TrackStock && p.CurrentStock <= p.MinStockAlert)
            .Select(p => new LowStockItemDto(
                Sku: p.Sku,
                ProductName: p.Name,
                CurrentStock: p.CurrentStock,
                MinStockAlert: p.MinStockAlert,
                Unit: p.Unit
            ))
            .OrderBy(p => p.CurrentStock)
            .ToList();

        return new SalesSummaryDto(
            TotalRevenue: totalRevenue,
            TotalGrossProfit: grossProfit,
            TotalDiscounts: totalDiscounts,
            TotalTransactions: totalTransactions,
            AverageTicketSize: avgTicket,
            DailyTrend: dailyTrend,
            TopProducts: topProducts,
            PaymentBreakdown: paymentBreakdown,
            DeadStock: deadStock,
            CategoryProfits: categoryProfits,
            LowStockAlerts: lowStockAlerts
        );
    }
}
