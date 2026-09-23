using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using OmniPos.Application.DTOs;
using OmniPos.Core.Entities.CRM;
using OmniPos.Core.Entities.Finance;
using OmniPos.Core.Entities.Inventory;
using OmniPos.Core.Entities.Products;
using OmniPos.Core.Entities.Sales;
using OmniPos.Core.Entities.Tables;
using OmniPos.Core.Enums;
using OmniPos.Infrastructure.Data;

namespace OmniPos.Application.Services;

public class CheckoutService
{
    private readonly AppDbContext _context;
    private readonly ILogger<CheckoutService> _logger;

    public CheckoutService(AppDbContext context, ILogger<CheckoutService> logger)
    {
        _context = context;
        _logger = logger;
    }

    public async Task<OrderResponseDto> ProcessCheckoutAsync(CreateOrderDto dto, CancellationToken ct = default)
    {
        using var tx = await _context.Database.BeginTransactionAsync(ct);
        try
        {
            var invoiceNumber = $"INV-{DateTime.UtcNow:yyyyMMdd}-{Guid.NewGuid().ToString("N")[..6].ToUpper()}";
            var effectiveCashierId = string.IsNullOrWhiteSpace(dto.CashierUserId) ? "Kasir" : dto.CashierUserId;

            Customer? customer = null;
            if (!string.IsNullOrEmpty(dto.CustomerId))
            {
                customer = await _context.Customers.FirstOrDefaultAsync(c => c.Id == dto.CustomerId, ct);
            }

            DiningTable? table = null;
            if (!string.IsNullOrEmpty(dto.DiningTableId))
            {
                table = await _context.DiningTables.FirstOrDefaultAsync(t => t.Id == dto.DiningTableId, ct);
            }
            
            var effectiveDiscount = dto.DiscountAmount + dto.RedeemedPointsDiscountAmount + dto.CouponDiscountAmount;

            var order = new Order
            {
                InvoiceNumber = invoiceNumber,
                OrderDate = DateTime.UtcNow,
                Status = OrderStatus.Completed,
                BusinessMode = dto.BusinessMode,
                CashierUserId = effectiveCashierId,
                ShiftId = dto.ShiftId,
                CustomerId = dto.CustomerId,
                Customer = customer,
                DiningTableId = dto.DiningTableId,
                DiningTable = table,
                ServiceStaffId = dto.ServiceStaffId,
                DiscountAmount = effectiveDiscount,
                DiscountReason = dto.DiscountReason,
                RedeemedPoints = dto.RedeemedPoints,
                RedeemedPointsDiscountAmount = dto.RedeemedPointsDiscountAmount,
                CouponCode = dto.CouponCode,
                CouponDiscountAmount = dto.CouponDiscountAmount,
                RoundingAmount = dto.RoundingAmount,
                Notes = dto.Notes
            };

            decimal calculatedSubtotal = 0;
            decimal calculatedTotalCogs = 0;

            // 1. Process Order Items & Modifiers
            foreach (var itemDto in dto.Items)
            {
                var product = await _context.Products
                    .Include(p => p.Recipe).ThenInclude(r => r.Items)
                    .FirstOrDefaultAsync(p => p.Id == itemDto.ProductId, ct);

                if (product == null)
                    throw new InvalidOperationException($"Product ID '{itemDto.ProductId}' not found.");

                decimal itemCost = product.BuyPrice;
                decimal itemUnitPrice = itemDto.UnitPrice > 0 ? itemDto.UnitPrice : product.SellPrice;

                // Handle Variant
                ProductVariant? variant = null;
                if (!string.IsNullOrEmpty(itemDto.VariantId))
                {
                    variant = await _context.ProductVariants.FirstOrDefaultAsync(v => v.Id == itemDto.VariantId, ct);
                    if (variant != null)
                    {
                        itemUnitPrice += variant.AdditionalPrice;
                        itemCost += variant.AdditionalCost;
                    }
                }

                var orderItem = new OrderItem
                {
                    OrderId = order.Id,
                    ProductId = product.Id,
                    VariantId = variant?.Id,
                    ProductName = product.Name,
                    VariantName = variant?.Name,
                    Sku = variant?.Sku ?? product.Sku,
                    Quantity = itemDto.Quantity,
                    UnitPrice = itemUnitPrice,
                    UnitCost = itemCost,
                    DiscountAmount = itemDto.DiscountAmount,
                    TotalPrice = (itemUnitPrice * itemDto.Quantity) - itemDto.DiscountAmount,
                    TotalCost = itemCost * itemDto.Quantity,
                    KitchenStation = product.KitchenStation ?? "BAR",
                    SerialNumber = itemDto.SerialNumber,
                    Notes = itemDto.Notes
                };

                calculatedSubtotal += orderItem.TotalPrice;
                calculatedTotalCogs += orderItem.TotalCost;

                // Modifiers
                if (itemDto.ModifierOptionIds != null && itemDto.ModifierOptionIds.Count > 0)
                {
                    var options = await _context.ModifierOptions
                        .Where(o => itemDto.ModifierOptionIds.Contains(o.Id))
                        .ToListAsync(ct);

                    foreach (var opt in options)
                    {
                        var mod = new OrderItemModifier
                        {
                            OrderItemId = orderItem.Id,
                            ModifierOptionId = opt.Id,
                            ModifierName = opt.Name,
                            Price = opt.Price,
                            Cost = opt.Cost
                        };
                        orderItem.Modifiers.Add(mod);
                        orderItem.TotalPrice += opt.Price * itemDto.Quantity;
                        orderItem.TotalCost += opt.Cost * itemDto.Quantity;
                        calculatedSubtotal += opt.Price * itemDto.Quantity;
                        calculatedTotalCogs += opt.Cost * itemDto.Quantity;
                    }
                }

                order.Items.Add(orderItem);

                // 2. Reduce Stock & Record Stock Mutations
                if (product.TrackStock)
                {
                    if (product.Recipe != null && product.Recipe.Items.Count > 0)
                    {
                        // Deduct Raw Materials (Recipe BOM)
                        foreach (var recipeItem in product.Recipe.Items)
                        {
                            var ingProduct = await _context.Products.FirstOrDefaultAsync(p => p.Id == recipeItem.IngredientProductId, ct);
                            if (ingProduct != null && ingProduct.TrackStock)
                            {
                                var qtyToDeduct = recipeItem.QuantityRequired * itemDto.Quantity;
                                var stockBefore = ingProduct.CurrentStock;
                                ingProduct.CurrentStock -= qtyToDeduct;

                                await _context.StockMutations.AddAsync(new StockMutation
                                {
                                    ProductId = ingProduct.Id,
                                    MutationType = StockMutationType.RecipeBOMConsumption,
                                    Quantity = -qtyToDeduct,
                                    StockBefore = stockBefore,
                                    StockAfter = ingProduct.CurrentStock,
                                    UnitCost = ingProduct.BuyPrice,
                                    ReferenceNumber = invoiceNumber,
                                    Notes = $"BOM untuk {product.Name} x{itemDto.Quantity}",
                                    CreatedByUserId = effectiveCashierId
                                }, ct);
                            }
                        }
                    }
                    else
                    {
                        // Direct Product Stock Deduction (supports multi-unit conversion e.g. Dus/Lusin)
                        var multiplier = itemDto.UnitConversionMultiplier > 0 ? itemDto.UnitConversionMultiplier : 1;
                        var totalStockUnitsToDeduct = itemDto.Quantity * multiplier;

                        var stockBefore = product.CurrentStock;
                        product.CurrentStock -= totalStockUnitsToDeduct;

                        await _context.StockMutations.AddAsync(new StockMutation
                        {
                            ProductId = product.Id,
                            VariantId = variant?.Id,
                            MutationType = StockMutationType.SalesDeduction,
                            Quantity = -totalStockUnitsToDeduct,
                            StockBefore = stockBefore,
                            StockAfter = product.CurrentStock,
                            UnitCost = product.BuyPrice,
                            ReferenceNumber = invoiceNumber,
                            Notes = multiplier > 1 ? $"Penjualan {invoiceNumber} (Konversi Satuan x{multiplier})" : $"Penjualan {invoiceNumber}",
                            CreatedByUserId = effectiveCashierId
                        }, ct);
                    }

                    // Update Electronics Serial Number / IMEI or SIM Card Special Number Status if specified
                    if (!string.IsNullOrWhiteSpace(itemDto.SerialNumber))
                    {
                        var cleanSerial = itemDto.SerialNumber.Trim();
                        var serialRecord = await _context.ProductSerialNumbers
                            .FirstOrDefaultAsync(s => s.SerialNo == cleanSerial && s.Status == OmniPos.Core.Entities.Electronics.SerialNumberStatus.Available, ct);
                        if (serialRecord != null)
                        {
                            serialRecord.Status = OmniPos.Core.Entities.Electronics.SerialNumberStatus.Sold;
                            serialRecord.SoldInvoiceNumber = invoiceNumber;
                            serialRecord.SoldDate = DateTime.UtcNow;
                            serialRecord.CustomerName = order.Customer?.Name ?? "Pelanggan Umum";
                            serialRecord.CustomerPhone = order.Customer?.PhoneNumber;
                            serialRecord.WarrantyEndDate = DateTime.UtcNow.AddMonths(serialRecord.WarrantyMonths);
                        }

                        var simCardRecord = await _context.SimCardSpecialNumbers
                            .FirstOrDefaultAsync(s => (s.Msisdn == cleanSerial || s.Iccid == cleanSerial) && s.Status == OmniPos.Core.Entities.Electronics.SimCardStatus.Available, ct);
                        if (simCardRecord != null)
                        {
                            simCardRecord.Status = OmniPos.Core.Entities.Electronics.SimCardStatus.Sold;
                            simCardRecord.SoldInvoiceNumber = invoiceNumber;
                            simCardRecord.SoldDate = DateTime.UtcNow;
                            simCardRecord.CustomerName = order.Customer?.Name ?? "Pelanggan Umum";
                            simCardRecord.CustomerPhone = order.Customer?.PhoneNumber;
                        }
                    }
                }
            }

            // 3. Financial Totals Calculation
            order.Subtotal = calculatedSubtotal;
            order.TotalCogs = calculatedTotalCogs;

            var taxableBase = Math.Max(0, order.Subtotal - order.DiscountAmount);

            decimal taxPct = dto.TaxPercentage;
            decimal servicePct = dto.ServiceChargePercentage;

            if (taxPct == 0 && servicePct == 0)
            {
                var taxSetting = await _context.AppSettings.FirstOrDefaultAsync(s => s.SettingKey == "TAX_RATE_PERCENT", ct);
                if (taxSetting != null && decimal.TryParse(taxSetting.SettingValue, out var sTax))
                    taxPct = sTax;

                var scSetting = await _context.AppSettings.FirstOrDefaultAsync(s => s.SettingKey == "SERVICE_CHARGE_PERCENT", ct);
                if (scSetting != null && decimal.TryParse(scSetting.SettingValue, out var sSc))
                    servicePct = sSc;
            }

            order.TaxAmount = taxPct > 0 ? Math.Round(taxableBase * (taxPct / 100m), 2) : 0;
            order.ServiceChargeAmount = servicePct > 0 ? Math.Round(taxableBase * (servicePct / 100m), 2) : 0;
            order.TotalAmount = taxableBase + order.TaxAmount + order.ServiceChargeAmount + order.RoundingAmount;

            // 4. Process Payments
            decimal totalPaid = 0;
            foreach (var p in dto.Payments)
            {
                var payment = new Payment
                {
                    OrderId = order.Id,
                    Method = p.Method,
                    Amount = p.Amount,
                    ReferenceNumber = p.ReferenceNumber,
                    CardType = p.CardType,
                    Notes = p.Notes
                };
                order.Payments.Add(payment);
                totalPaid += p.Amount;

                // If customer paid with CustomerReceivable (Kasbon)
                if (p.Method == PaymentMethod.CustomerReceivable && customer != null)
                {
                    if (customer.CreditLimit > 0 && (customer.TotalReceivable + p.Amount) > customer.CreditLimit)
                    {
                        throw new InvalidOperationException($"Total kasbon (Rp {(customer.TotalReceivable + p.Amount):N0}) melebihi limit kredit pelanggan (Rp {customer.CreditLimit:N0})!");
                    }

                    customer.TotalReceivable += p.Amount;
                    await _context.CustomerReceivables.AddAsync(new CustomerReceivable
                    {
                        CustomerId = customer.Id,
                        InvoiceNumber = invoiceNumber,
                        OriginalAmount = p.Amount,
                        RemainingAmount = p.Amount,
                        DueDate = DateTime.UtcNow.AddDays(30)
                    }, ct);
                }

                // If customer paid with CustomerDeposit (Saldo Belanja Dompet Toko)
                if (p.Method == PaymentMethod.CustomerDeposit && customer != null)
                {
                    if (customer.DepositBalance < p.Amount)
                    {
                        throw new InvalidOperationException($"Saldo deposit pelanggan tidak mencukupi. Sisa saldo: Rp {customer.DepositBalance:N0}");
                    }

                    customer.DepositBalance -= p.Amount;
                    await _context.CustomerDepositTransactions.AddAsync(new CustomerDepositTransaction
                    {
                        CustomerId = customer.Id,
                        Amount = -p.Amount,
                        Type = "PURCHASE_PAYMENT",
                        PaymentMethod = "DEPOSIT",
                        ReferenceNumber = invoiceNumber,
                        CashierUserId = dto.CashierUserId ?? "Kasir",
                        Notes = $"Pembayaran Belanja Nota #{invoiceNumber}",
                        BalanceAfter = customer.DepositBalance
                    }, ct);
                }
            }

            order.TotalPaid = totalPaid;
            order.ChangeAmount = Math.Max(0, totalPaid - order.TotalAmount);

            // 5. Customer Loyalty Points, Coupons & Lifetime Metrics
            if (!string.IsNullOrWhiteSpace(dto.CouponCode))
            {
                var cleanCouponCode = dto.CouponCode.Trim();
                var coupon = await _context.Coupons.FirstOrDefaultAsync(c => c.Code == cleanCouponCode && !c.IsDeleted, ct);
                if (coupon != null)
                {
                    coupon.UsageCount += 1;
                }
            }

            int newlyEarnedPoints = 0;
            if (customer != null)
            {
                // Process Redeemed Points deduction
                if (dto.RedeemedPoints > 0)
                {
                    if (customer.LoyaltyPoints < dto.RedeemedPoints)
                    {
                        throw new InvalidOperationException($"Poin loyalitas tidak mencukupi (Tersedia: {customer.LoyaltyPoints} poin, Ditukar: {dto.RedeemedPoints} poin).");
                    }
                    customer.LoyaltyPoints -= dto.RedeemedPoints;
                    await _context.CustomerPoints.AddAsync(new CustomerPoint
                    {
                        CustomerId = customer.Id,
                        Points = -dto.RedeemedPoints,
                        Reason = $"Tukar {dto.RedeemedPoints} Poin (Diskon Rp {dto.RedeemedPointsDiscountAmount:N0}) Nota #{invoiceNumber}",
                        ReferenceOrderNumber = invoiceNumber
                    }, ct);
                }

                customer.TotalSpent += order.TotalAmount;
                customer.VisitCount += 1;
                customer.LastVisitDate = DateTime.UtcNow;

                // Auto-upgrade Member Tier based on lifetime spend
                if (customer.TotalSpent >= 5000000m) customer.MemberTier = "PLATINUM";
                else if (customer.TotalSpent >= 2000000m) customer.MemberTier = "GOLD";
                else if (customer.TotalSpent >= 500000m) customer.MemberTier = "SILVER";
                else customer.MemberTier = "BRONZE";

                // Point multiplier based on Tier
                var multiplier = customer.MemberTier == "PLATINUM" ? 2.0m : customer.MemberTier == "GOLD" ? 1.5m : 1.0m;
                newlyEarnedPoints = (int)((order.TotalAmount / 10000m) * multiplier); // 1 point per 10,000 IDR * multiplier
                if (newlyEarnedPoints > 0)
                {
                    customer.LoyaltyPoints += newlyEarnedPoints;
                    await _context.CustomerPoints.AddAsync(new CustomerPoint
                    {
                        CustomerId = customer.Id,
                        Points = newlyEarnedPoints,
                        Reason = $"Perolehan Poin Belanja Nota #{invoiceNumber} ({customer.MemberTier})",
                        ReferenceOrderNumber = invoiceNumber
                    }, ct);
                }
                order.EarnedPoints = newlyEarnedPoints;
            }

            // 6. Update Shift Statistics
            if (!string.IsNullOrEmpty(dto.ShiftId))
            {
                var shift = await _context.Shifts.FirstOrDefaultAsync(s => s.Id == dto.ShiftId, ct);
                if (shift != null)
                {
                    shift.TotalTransactions += 1;
                    foreach (var p in order.Payments)
                    {
                        if (p.Method == PaymentMethod.Cash)
                            shift.TotalCashSales += (p.Amount - order.ChangeAmount);
                        else
                            shift.TotalNonCashSales += p.Amount;
                    }
                    shift.ExpectedCash = shift.StartingCash + shift.TotalCashSales + shift.TotalCashIn - shift.TotalCashOut;
                }
            }

            // 7. Update Table Status if DiningTable was set
            if (table != null)
            {
                table.Status = TableStatus.Available;
                table.CurrentOrderId = null;
                table.CurrentBillAmount = 0;
                table.OccupiedSince = null;
            }

            // 8. Automatic General Ledger Journaling
            await CreateSalesAutoJournalAsync(order, ct);

            // 9. Save Order
            await _context.Orders.AddAsync(order, ct);
            await _context.SaveChangesAsync(ct);
            await tx.CommitAsync(ct);

            _logger.LogInformation("Order {Invoice} completed successfully for amount Rp {Amount}", order.InvoiceNumber, order.TotalAmount);

            return new OrderResponseDto(
                Id: order.Id,
                InvoiceNumber: order.InvoiceNumber,
                OrderDate: order.OrderDate,
                Status: order.Status,
                CashierUserId: order.CashierUserId,
                CustomerName: customer?.Name,
                TableNumber: table?.TableNumber,
                Subtotal: order.Subtotal,
                DiscountAmount: order.DiscountAmount,
                TaxAmount: order.TaxAmount,
                ServiceChargeAmount: order.ServiceChargeAmount,
                RoundingAmount: order.RoundingAmount,
                TotalAmount: order.TotalAmount,
                TotalPaid: order.TotalPaid,
                ChangeAmount: order.ChangeAmount,
                Items: order.Items.Select(i => new OrderItemResponseDto(
                    Id: i.Id,
                    ProductName: i.ProductName,
                    VariantName: i.VariantName,
                    Quantity: i.Quantity,
                    UnitPrice: i.UnitPrice,
                    TotalPrice: i.TotalPrice,
                    Modifiers: i.Modifiers.Select(m => m.ModifierName).ToList(),
                    Notes: i.Notes
                )).ToList(),
                Payments: order.Payments.Select(p => new PaymentResponseDto(
                    Id: p.Id,
                    Method: p.Method,
                    Amount: p.Amount,
                    ReferenceNumber: p.ReferenceNumber
                )).ToList(),
                RedeemedPoints: order.RedeemedPoints,
                RedeemedPointsDiscountAmount: order.RedeemedPointsDiscountAmount,
                CouponCode: order.CouponCode,
                CouponDiscountAmount: order.CouponDiscountAmount,
                EarnedPoints: order.EarnedPoints,
                CustomerPhone: customer?.PhoneNumber,
                CustomerLoyaltyPointsRemaining: customer?.LoyaltyPoints ?? 0
            );
        }
        catch (Exception ex)
        {
            await tx.RollbackAsync(ct);
            _logger.LogError(ex, "Checkout transaction failed and was rolled back.");
            throw;
        }
    }

    private async Task CreateSalesAutoJournalAsync(Order order, CancellationToken ct)
    {
        var cashAccount = await _context.Accounts.FirstOrDefaultAsync(a => a.AccountCode == "1001", ct);
        var bankAccount = await _context.Accounts.FirstOrDefaultAsync(a => a.AccountCode == "1002", ct);
        var receivableAccount = await _context.Accounts.FirstOrDefaultAsync(a => a.AccountCode == "1003", ct);
        var inventoryAccount = await _context.Accounts.FirstOrDefaultAsync(a => a.AccountCode == "1004", ct);
        var salesRevenueAccount = await _context.Accounts.FirstOrDefaultAsync(a => a.AccountCode == "4001", ct);
        var cogsAccount = await _context.Accounts.FirstOrDefaultAsync(a => a.AccountCode == "5001", ct);

        if (salesRevenueAccount == null) return;

        var journal = new JournalEntry
        {
            EntryNumber = $"JRN-{DateTime.UtcNow:yyyyMMdd}-{Guid.NewGuid().ToString("N")[..4].ToUpper()}",
            TransactionDate = order.OrderDate,
            Description = $"Jurnal Otomatis Penjualan Nota #{order.InvoiceNumber}",
            ReferenceNumber = order.InvoiceNumber,
            SourceModule = "SALES"
        };

        // 1. Debit Cash/Bank/Receivable
        foreach (var p in order.Payments)
        {
            var targetAccount = p.Method switch
            {
                PaymentMethod.Cash => cashAccount,
                PaymentMethod.CustomerReceivable => receivableAccount,
                _ => bankAccount
            };

            if (targetAccount != null)
            {
                var netPaymentAmount = p.Method == PaymentMethod.Cash ? (p.Amount - order.ChangeAmount) : p.Amount;
                journal.Details.Add(new JournalDetail
                {
                    AccountId = targetAccount.Id,
                    Debit = netPaymentAmount,
                    Credit = 0,
                    Notes = $"Penerimaan {p.Method}"
                });
                targetAccount.CurrentBalance += netPaymentAmount;
            }
        }

        // 2. Credit Sales Revenue
        journal.Details.Add(new JournalDetail
        {
            AccountId = salesRevenueAccount.Id,
            Debit = 0,
            Credit = order.TotalAmount,
            Notes = "Pendapatan Penjualan Bersih"
        });
        salesRevenueAccount.CurrentBalance += order.TotalAmount;

        // 3. Debit HPP & Credit Persediaan
        if (order.TotalCogs > 0 && cogsAccount != null && inventoryAccount != null)
        {
            journal.Details.Add(new JournalDetail
            {
                AccountId = cogsAccount.Id,
                Debit = order.TotalCogs,
                Credit = 0,
                Notes = "Beban Pokok Penjualan (HPP)"
            });
            cogsAccount.CurrentBalance += order.TotalCogs;

            journal.Details.Add(new JournalDetail
            {
                AccountId = inventoryAccount.Id,
                Debit = 0,
                Credit = order.TotalCogs,
                Notes = "Pengurangan Persediaan Barang"
            });
            inventoryAccount.CurrentBalance -= order.TotalCogs;
        }

        journal.TotalDebit = journal.Details.Sum(d => d.Debit);
        journal.TotalCredit = journal.Details.Sum(d => d.Credit);

        await _context.JournalEntries.AddAsync(journal, ct);
    }
}
