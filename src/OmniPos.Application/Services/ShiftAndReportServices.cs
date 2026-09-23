using Microsoft.EntityFrameworkCore;
using OmniPos.Application.DTOs;
using OmniPos.Core.Entities.Finance;
using OmniPos.Core.Entities.Identity;
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
        var now = DateTime.UtcNow;

        // 1. Determine Schedule & Template for today
        var dayOfWeek = (int)now.DayOfWeek;
        var schedule = await _context.EmployeeSchedules
            .Include(es => es.ShiftTemplate)
            .FirstOrDefaultAsync(es => es.UserId == dto.UserId && es.DayOfWeek == dayOfWeek && !es.IsDeleted, ct);

        ShiftTemplate? template = null;
        if (!string.IsNullOrWhiteSpace(dto.ShiftTemplateId))
        {
            template = await _context.ShiftTemplates.FirstOrDefaultAsync(st => st.Id == dto.ShiftTemplateId && !st.IsDeleted, ct);
        }
        else if (schedule?.ShiftTemplate != null)
        {
            template = schedule.ShiftTemplate;
        }

        DateTime? scheduledStart = null;
        DateTime? scheduledEnd = null;
        int lateMinutes = 0;
        string attendanceStatus = "ON_TIME";

        if (template != null)
        {
            if (TimeSpan.TryParse(template.StartTime, out var sTime))
            {
                scheduledStart = now.Date.Add(sTime);
                var grace = template.GracePeriodMinutes > 0 ? template.GracePeriodMinutes : 15;
                if (now > scheduledStart.Value.AddMinutes(grace))
                {
                    lateMinutes = (int)(now - scheduledStart.Value).TotalMinutes;
                    attendanceStatus = "LATE";
                }
            }

            if (TimeSpan.TryParse(template.EndTime, out var eTime))
            {
                scheduledEnd = now.Date.Add(eTime);
                if (scheduledEnd <= scheduledStart)
                {
                    // Crossing midnight (e.g. 21:00 - 05:00)
                    scheduledEnd = scheduledEnd.Value.AddDays(1);
                }
            }
        }
        else if (schedule != null && !string.IsNullOrWhiteSpace(schedule.CustomStartTime) && TimeSpan.TryParse(schedule.CustomStartTime, out var csTime))
        {
            scheduledStart = now.Date.Add(csTime);
            if (now > scheduledStart.Value.AddMinutes(15))
            {
                lateMinutes = (int)(now - scheduledStart.Value).TotalMinutes;
                attendanceStatus = "LATE";
            }
            if (!string.IsNullOrWhiteSpace(schedule.CustomEndTime) && TimeSpan.TryParse(schedule.CustomEndTime, out var ceTime))
            {
                scheduledEnd = now.Date.Add(ceTime);
                if (scheduledEnd <= scheduledStart) scheduledEnd = scheduledEnd.Value.AddDays(1);
            }
        }

        var shift = new Shift
        {
            ShiftNumber = shiftNumber,
            UserId = dto.UserId,
            CashierName = dto.CashierName,
            StartTime = now,
            StartingCash = dto.StartingCash,
            StartingCashDenominations = dto.StartingCashDenominations,
            ExpectedCash = dto.StartingCash,
            IsClosed = false,
            ShiftTemplateId = template?.Id,
            ShiftTemplateName = template?.Name ?? (schedule?.IsWorkDay == true ? "Jadwal Kustom" : "Reguler (Fleksibel)"),
            ScheduledStartTime = scheduledStart,
            ScheduledEndTime = scheduledEnd,
            LateMinutes = lateMinutes,
            AttendanceStatus = attendanceStatus
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

        var now = DateTime.UtcNow;
        shift.IsClosed = true;
        shift.EndTime = now;
        shift.ActualCashCount = dto.ActualCashCount;
        shift.CashDiscrepancy = dto.ActualCashCount - shift.ExpectedCash;
        shift.ClosingNotes = dto.ClosingNotes;
        shift.ClosingCashDenominations = dto.ClosingCashDenominations;

        // Calculate Early Leave or Overtime
        if (shift.ScheduledEndTime.HasValue)
        {
            var scheduledEnd = shift.ScheduledEndTime.Value;
            if (now < scheduledEnd.AddMinutes(-10))
            {
                shift.EarlyLeaveMinutes = (int)(scheduledEnd - now).TotalMinutes;
            }
            else if (now > scheduledEnd.AddMinutes(15))
            {
                shift.OvertimeMinutes = (int)(now - scheduledEnd).TotalMinutes;
            }

            if (shift.LateMinutes > 0 && shift.EarlyLeaveMinutes > 0)
                shift.AttendanceStatus = "LATE_AND_EARLY_LEAVE";
            else if (shift.LateMinutes > 0)
                shift.AttendanceStatus = "LATE";
            else if (shift.EarlyLeaveMinutes > 0)
                shift.AttendanceStatus = "EARLY_LEAVE";
            else if (shift.OvertimeMinutes > 0)
                shift.AttendanceStatus = "OVERTIME";
            else
                shift.AttendanceStatus = "ON_TIME";
        }
        else
        {
            // Standard 8-hour benchmark for ad-hoc shift
            var durationHours = (now - shift.StartTime).TotalHours;
            if (durationHours > 8.5)
            {
                shift.OvertimeMinutes = (int)((durationHours - 8.0) * 60);
                shift.AttendanceStatus = "OVERTIME";
            }
        }

        // Fetch shift orders
        var shiftOrders = await _context.Orders
            .Include(o => o.Payments)
            .Where(o => o.ShiftId == shift.Id && !o.IsVoided)
            .ToListAsync(ct);

        var grossSales = shiftOrders.Sum(o => o.Subtotal);
        var totalDiscounts = shiftOrders.Sum(o => o.DiscountAmount);
        var netSales = shiftOrders.Sum(o => o.TotalAmount);

        var payments = shiftOrders
            .SelectMany(o => o.Payments)
            .GroupBy(p => p.Method)
            .Select(g => new ShiftPaymentBreakdownDto(
                g.Key.ToString(),
                g.Sum(x => x.Amount),
                g.Count()))
            .OrderByDescending(x => x.Amount)
            .ToList();

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
            NetSales: netSales,
            ClosingNotes: shift.ClosingNotes,
            ClosingCashDenominations: shift.ClosingCashDenominations,
            Payments: payments
        );
    }

    public async Task<ShiftDashboardDto?> GetActiveShiftDashboardAsync(CancellationToken ct = default)
    {
        var shift = await _context.Shifts
            .Include(s => s.CashTransactions)
            .FirstOrDefaultAsync(s => !s.IsClosed, ct);

        if (shift == null) return null;

        var orders = await _context.Orders
            .Include(o => o.Items)
            .Include(o => o.Payments)
            .Include(o => o.Customer)
            .Where(o => o.ShiftId == shift.Id && !o.IsVoided)
            .OrderByDescending(o => o.OrderDate)
            .ToListAsync(ct);

        var grossSales = orders.Sum(o => o.Subtotal);
        var totalDiscounts = orders.Sum(o => o.DiscountAmount);
        var netSales = orders.Sum(o => o.TotalAmount);
        var durationMinutes = (int)(DateTime.UtcNow - shift.StartTime).TotalMinutes;

        var paymentBreakdown = orders
            .SelectMany(o => o.Payments)
            .GroupBy(p => p.Method)
            .Select(g => new ShiftPaymentBreakdownDto(
                g.Key.ToString(),
                g.Sum(x => x.Amount),
                g.Count()))
            .OrderByDescending(x => x.Amount)
            .ToList();

        var topProducts = orders
            .SelectMany(o => o.Items)
            .GroupBy(i => i.ProductName)
            .Select(g => new ShiftTopProductDto(
                g.Key,
                (int)g.Sum(x => x.Quantity),
                g.Sum(x => x.TotalPrice)))
            .OrderByDescending(x => x.Quantity)
            .Take(10)
            .ToList();

        var orderSummaries = orders
            .Select(o => new ShiftOrderSummaryDto(
                o.Id,
                o.InvoiceNumber,
                o.OrderDate,
                o.Customer?.Name ?? "Umum",
                o.TotalAmount,
                string.Join(", ", o.Payments.Select(p => p.Method.ToString())),
                o.Status.ToString()))
            .ToList();

        return new ShiftDashboardDto(
            ShiftId: shift.Id,
            ShiftNumber: shift.ShiftNumber,
            UserId: shift.UserId,
            CashierName: shift.CashierName,
            StartTime: shift.StartTime,
            DurationMinutes: durationMinutes,
            StartingCash: shift.StartingCash,
            TotalCashSales: shift.TotalCashSales,
            TotalNonCashSales: shift.TotalNonCashSales,
            TotalCashIn: shift.TotalCashIn,
            TotalCashOut: shift.TotalCashOut,
            ExpectedCash: shift.ExpectedCash,
            TotalTransactions: shift.TotalTransactions,
            GrossSales: grossSales,
            TotalDiscounts: totalDiscounts,
            NetSales: netSales,
            PaymentBreakdown: paymentBreakdown,
            TopProducts: topProducts,
            Orders: orderSummaries,
            CashTransactions: shift.CashTransactions.OrderByDescending(c => c.CreatedAt).ToList()
        );
    }

    public async Task<List<ShiftHistoryItemDto>> GetShiftHistoryAsync(int limit = 50, CancellationToken ct = default)
    {
        var shifts = await _context.Shifts
            .Where(s => s.IsClosed)
            .OrderByDescending(s => s.StartTime)
            .Take(limit)
            .ToListAsync(ct);

        var shiftIds = shifts.Select(s => s.Id).ToHashSet();
        var orders = await _context.Orders
            .Where(o => o.ShiftId != null && shiftIds.Contains(o.ShiftId) && !o.IsVoided)
            .Select(o => new { ShiftId = o.ShiftId!, o.TotalAmount })
            .ToListAsync(ct);

        var netSalesByShift = orders
            .GroupBy(o => o.ShiftId)
            .ToDictionary(g => g.Key, g => g.Sum(x => x.TotalAmount));

        return shifts.Select(s =>
        {
            var endTime = s.EndTime ?? s.StartTime;
            var duration = (int)(endTime - s.StartTime).TotalMinutes;
            var netSales = netSalesByShift.TryGetValue(s.Id, out var ns) ? ns : (s.TotalCashSales + s.TotalNonCashSales);

            return new ShiftHistoryItemDto(
                ShiftId: s.Id,
                ShiftNumber: s.ShiftNumber,
                UserId: s.UserId,
                CashierName: s.CashierName,
                StartTime: s.StartTime,
                EndTime: s.EndTime,
                DurationMinutes: duration,
                StartingCash: s.StartingCash,
                TotalCashSales: s.TotalCashSales,
                TotalNonCashSales: s.TotalNonCashSales,
                ExpectedCash: s.ExpectedCash,
                ActualCashCount: s.ActualCashCount,
                CashDiscrepancy: s.CashDiscrepancy,
                TotalTransactions: s.TotalTransactions,
                NetSales: netSales,
                ClosingNotes: s.ClosingNotes
            );
        }).ToList();
    }

    public async Task<ZReportDto?> GetShiftZReportAsync(string shiftId, CancellationToken ct = default)
    {
        var shift = await _context.Shifts
            .Include(s => s.CashTransactions)
            .FirstOrDefaultAsync(s => s.Id == shiftId, ct);

        if (shift == null) return null;

        var shiftOrders = await _context.Orders
            .Include(o => o.Payments)
            .Where(o => o.ShiftId == shift.Id && !o.IsVoided)
            .ToListAsync(ct);

        var grossSales = shiftOrders.Sum(o => o.Subtotal);
        var totalDiscounts = shiftOrders.Sum(o => o.DiscountAmount);
        var netSales = shiftOrders.Sum(o => o.TotalAmount);

        var payments = shiftOrders
            .SelectMany(o => o.Payments)
            .GroupBy(p => p.Method)
            .Select(g => new ShiftPaymentBreakdownDto(
                g.Key.ToString(),
                g.Sum(x => x.Amount),
                g.Count()))
            .OrderByDescending(x => x.Amount)
            .ToList();

        return new ZReportDto(
            ShiftNumber: shift.ShiftNumber,
            CashierName: shift.CashierName,
            StartTime: shift.StartTime,
            EndTime: shift.EndTime ?? DateTime.UtcNow,
            StartingCash: shift.StartingCash,
            TotalCashSales: shift.TotalCashSales,
            TotalNonCashSales: shift.TotalNonCashSales,
            TotalCashIn: shift.TotalCashIn,
            TotalCashOut: shift.TotalCashOut,
            ExpectedCash: shift.ExpectedCash,
            ActualCashCount: shift.ActualCashCount ?? 0,
            CashDiscrepancy: shift.CashDiscrepancy ?? 0,
            TotalTransactions: shift.TotalTransactions,
            GrossSales: grossSales,
            TotalDiscounts: totalDiscounts,
            NetSales: netSales,
            ClosingNotes: shift.ClosingNotes,
            ClosingCashDenominations: shift.ClosingCashDenominations,
            Payments: payments
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

    public async Task<SalesSummaryDto> GetSalesSummaryAsync(DateTime startDate, DateTime endDate, BusinessMode? mode = null, CancellationToken ct = default)
    {
        var ordersQuery = _context.Orders
            .Include(o => o.Items)
            .Include(o => o.Payments)
            .Where(o => o.OrderDate >= startDate && o.OrderDate <= endDate && !o.IsVoided);

        if (mode.HasValue)
        {
            ordersQuery = ordersQuery.Where(o => o.BusinessMode == mode.Value);
        }

        var orders = await ordersQuery.ToListAsync(ct);

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

        // All active products in catalog for Dead Stock & Low Stock Analysis (filtered by BusinessMode)
        var prodQuery = _context.Products
            .Include(p => p.Category)
            .Where(p => !p.IsDeleted);

        if (mode.HasValue)
        {
            prodQuery = prodQuery.Where(p => p.BusinessMode == mode.Value);
        }

        var allProducts = await prodQuery.ToListAsync(ct);

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

        // 1. Hourly Trend (00:00 to 23:00)
        var hourlyMap = orders
            .GroupBy(o => o.OrderDate.Hour)
            .ToDictionary(g => g.Key, g => (Revenue: g.Sum(o => o.TotalAmount), Count: g.Count()));

        decimal maxHourlyRevenue = hourlyMap.Count > 0 ? hourlyMap.Values.Max(v => v.Revenue) : 0;
        var hourlyTrend = new List<HourlySalesPointDto>();
        for (int h = 0; h < 24; h++)
        {
            var rev = hourlyMap.TryGetValue(h, out var val) ? val.Revenue : 0;
            var count = hourlyMap.TryGetValue(h, out var v2) ? v2.Count : 0;
            bool isPeak = maxHourlyRevenue > 0 && rev >= maxHourlyRevenue * 0.8m && rev > 0;
            hourlyTrend.Add(new HourlySalesPointDto(
                Hour: h,
                HourLabel: $"{h:D2}:00 - {(h + 1):D2}:00",
                Revenue: rev,
                Transactions: count,
                IsPeak: isPeak
            ));
        }

        // 2. Day of Week Trend (Senin to Minggu)
        var dayNames = new[] { "Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu" };
        var dayOfWeekMap = orders
            .GroupBy(o => (int)o.OrderDate.DayOfWeek)
            .ToDictionary(g => g.Key, g => (Revenue: g.Sum(o => o.TotalAmount), Count: g.Count()));

        var dayIndices = new[] { 1, 2, 3, 4, 5, 6, 0 };
        var dayOfWeekTrend = dayIndices.Select(idx => new DayOfWeekSalesPointDto(
            DayIndex: idx,
            DayName: dayNames[idx],
            Revenue: dayOfWeekMap.TryGetValue(idx, out var d) ? d.Revenue : 0,
            Transactions: dayOfWeekMap.TryGetValue(idx, out var d2) ? d2.Count : 0
        )).ToList();

        // 3. Tax & Service Audit
        decimal taxableSales = orders.Where(o => o.TaxAmount > 0).Sum(o => o.Subtotal - o.DiscountAmount);
        decimal nonTaxableSales = orders.Where(o => o.TaxAmount == 0).Sum(o => o.Subtotal - o.DiscountAmount);
        decimal totalTax = orders.Sum(o => o.TaxAmount);
        decimal totalServiceCharge = orders.Sum(o => o.ServiceChargeAmount);
        decimal totalRounding = orders.Sum(o => o.RoundingAmount);
        var taxAudit = new TaxAuditDto(
            TaxableSales: taxableSales,
            NonTaxableSales: nonTaxableSales,
            TotalTax: totalTax,
            TotalServiceCharge: totalServiceCharge,
            TotalRounding: totalRounding
        );

        // 4. Cashier Performance & Sales
        var users = await _context.Users.AsNoTracking().ToListAsync(ct);
        var userMap = users.ToDictionary(u => u.Id, u => string.IsNullOrWhiteSpace(u.FullName) ? u.Username : u.FullName);

        var cashierSales = orders
            .GroupBy(o => o.CashierUserId)
            .Select(g =>
            {
                var cId = g.Key ?? string.Empty;
                var cName = userMap.TryGetValue(cId, out var name) && !string.IsNullOrWhiteSpace(name)
                    ? name
                    : (string.IsNullOrWhiteSpace(cId) ? "Kasir Utama / POS" : $"Kasir ({cId[..Math.Min(6, cId.Length)]})");
                var cRev = g.Sum(o => o.TotalAmount);
                var cCount = g.Count();
                var cAvg = cCount > 0 ? cRev / cCount : 0;
                var cShare = totalRevenue > 0 ? Math.Round((cRev / totalRevenue) * 100, 1) : 0;
                return new CashierSalesDto(
                    CashierId: cId,
                    CashierName: cName,
                    Revenue: cRev,
                    Transactions: cCount,
                    AverageTicket: cAvg,
                    RevenueSharePercent: cShare
                );
            })
            .OrderByDescending(c => c.Revenue)
            .ToList();

        // 5. Period-over-Period Growth Comparison
        var duration = endDate - startDate;
        var prevStart = startDate - duration;
        var prevEnd = startDate;

        var prevOrdersQuery = _context.Orders
            .Where(o => o.OrderDate >= prevStart && o.OrderDate < prevEnd && !o.IsVoided);
        if (mode.HasValue)
        {
            prevOrdersQuery = prevOrdersQuery.Where(o => o.BusinessMode == mode.Value);
        }
        var prevOrders = await prevOrdersQuery.ToListAsync(ct);

        decimal prevRevenue = prevOrders.Sum(o => o.TotalAmount);
        int prevTransactions = prevOrders.Count;
        decimal prevProfit = prevOrders.Sum(o => o.TotalAmount - o.TotalCogs);
        decimal prevBasket = prevTransactions > 0 ? (prevRevenue / prevTransactions) : 0;

        decimal revGrowth = prevRevenue > 0 ? Math.Round(((totalRevenue - prevRevenue) / prevRevenue) * 100, 1) : 0;
        decimal txGrowth = prevTransactions > 0 ? Math.Round(((decimal)(totalTransactions - prevTransactions) / prevTransactions) * 100, 1) : 0;
        decimal profitGrowth = prevProfit > 0 ? Math.Round(((grossProfit - prevProfit) / prevProfit) * 100, 1) : 0;
        decimal basketGrowth = prevBasket > 0 ? Math.Round(((avgTicket - prevBasket) / prevBasket) * 100, 1) : 0;

        var periodGrowth = new PeriodGrowthDto(
            RevenueGrowthPercent: revGrowth,
            TransactionsGrowthPercent: txGrowth,
            ProfitGrowthPercent: profitGrowth,
            BasketGrowthPercent: basketGrowth
        );

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
            LowStockAlerts: lowStockAlerts,
            HourlyTrend: hourlyTrend,
            DayOfWeekTrend: dayOfWeekTrend,
            TaxAudit: taxAudit,
            CashierSales: cashierSales,
            PeriodGrowth: periodGrowth
        );
    }
}
