using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using OmniPos.Application.DTOs;
using OmniPos.Core.Entities.CRM;
using OmniPos.Core.Entities.Finance;
using OmniPos.Core.Entities.Inventory;
using OmniPos.Core.Entities.Products;
using OmniPos.Core.Entities.Sales;
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
            
            var order = new Order
            {
                InvoiceNumber = invoiceNumber,
                OrderDate = DateTime.UtcNow,
                Status = OrderStatus.Completed,
                BusinessMode = dto.BusinessMode,
                CashierUserId = dto.CashierUserId,
                ShiftId = dto.ShiftId,
                CustomerId = dto.CustomerId,
                DiningTableId = dto.DiningTableId,
                ServiceStaffId = dto.ServiceStaffId,
                DiscountAmount = dto.DiscountAmount,
                DiscountReason = dto.DiscountReason,
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
                                    CreatedByUserId = dto.CashierUserId
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
                            CreatedByUserId = dto.CashierUserId
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
            order.TaxAmount = dto.TaxPercentage > 0 ? Math.Round(taxableBase * (dto.TaxPercentage / 100m), 2) : 0;
            order.ServiceChargeAmount = dto.ServiceChargePercentage > 0 ? Math.Round(taxableBase * (dto.ServiceChargePercentage / 100m), 2) : 0;
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
                if (p.Method == PaymentMethod.CustomerReceivable && !string.IsNullOrEmpty(dto.CustomerId))
                {
                    var cust = await _context.Customers.FirstOrDefaultAsync(c => c.Id == dto.CustomerId, ct);
                    if (cust != null)
                    {
                        cust.TotalReceivable += p.Amount;
                        await _context.CustomerReceivables.AddAsync(new CustomerReceivable
                        {
                            CustomerId = cust.Id,
                            InvoiceNumber = invoiceNumber,
                            OriginalAmount = p.Amount,
                            RemainingAmount = p.Amount,
                            DueDate = DateTime.UtcNow.AddDays(30)
                        }, ct);
                    }
                }
            }

            order.TotalPaid = totalPaid;
            order.ChangeAmount = Math.Max(0, totalPaid - order.TotalAmount);

            // 5. Customer Loyalty Points
            if (!string.IsNullOrEmpty(dto.CustomerId))
            {
                var customer = await _context.Customers.FirstOrDefaultAsync(c => c.Id == dto.CustomerId, ct);
                if (customer != null)
                {
                    var earnedPoints = (int)(order.TotalAmount / 10000m); // 1 point per 10,000 IDR
                    if (earnedPoints > 0)
                    {
                        customer.LoyaltyPoints += earnedPoints;
                        await _context.CustomerPoints.AddAsync(new CustomerPoint
                        {
                            CustomerId = customer.Id,
                            Points = earnedPoints,
                            Reason = $"Poin Belanja Nota #{invoiceNumber}",
                            ReferenceOrderNumber = invoiceNumber
                        }, ct);
                    }
                }
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
            if (!string.IsNullOrEmpty(dto.DiningTableId))
            {
                var table = await _context.DiningTables.FirstOrDefaultAsync(t => t.Id == dto.DiningTableId, ct);
                if (table != null)
                {
                    table.Status = TableStatus.Available;
                    table.CurrentOrderId = null;
                    table.CurrentBillAmount = 0;
                    table.OccupiedSince = null;
                }
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
                CustomerName: null,
                TableNumber: null,
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
                )).ToList()
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
