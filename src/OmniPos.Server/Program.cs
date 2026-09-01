using System;
using System.IO;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using OmniPos.Application.DTOs;
using OmniPos.Application.Services;
using OmniPos.Core.Entities.CRM;
using OmniPos.Core.Entities.Identity;
using OmniPos.Core.Entities.Products;
using OmniPos.Core.Entities.Tables;
using OmniPos.Core.Entities.Inventory;
using OmniPos.Core.Entities.Purchasing;
using OmniPos.Core.Entities.Marketing;
using OmniPos.Core.Entities.Sales;
using OmniPos.Core.Enums;
using OmniPos.Core.Interfaces;
using OmniPos.Infrastructure.Data;
using OmniPos.Infrastructure.Data.Repositories;
using OmniPos.Infrastructure.Data.Seeders;
using OmniPos.Infrastructure.Services.Backup;
using OmniPos.Infrastructure.Services.Hardware;
using OmniPos.Infrastructure.Services.Security;
using OmniPos.Server.Hubs;

namespace OmniPos.Server;

public static class ServerAppBuilder
{
    public static async Task<WebApplication> BuildAsync(string[] args, int port = 5000, string edition = "retail", string? customDbPath = null)
    {
        // Ekstraksi edition dan port dari CLI args jika diteruskan
        for (int i = 0; i < args.Length; i++)
        {
            var arg = args[i];
            if (arg.StartsWith("--edition=", StringComparison.OrdinalIgnoreCase))
                edition = arg.Substring("--edition=".Length).Trim().ToLowerInvariant();
            else if (arg.Equals("--edition", StringComparison.OrdinalIgnoreCase) && i + 1 < args.Length)
                edition = args[i + 1].Trim().ToLowerInvariant();
            else if (arg.StartsWith("--mode=", StringComparison.OrdinalIgnoreCase))
                edition = arg.Substring("--mode=".Length).Trim().ToLowerInvariant();
            else if (arg.Equals("--mode", StringComparison.OrdinalIgnoreCase) && i + 1 < args.Length)
                edition = args[i + 1].Trim().ToLowerInvariant();
            else if (arg.Equals("-e", StringComparison.OrdinalIgnoreCase) && i + 1 < args.Length)
                edition = args[i + 1].Trim().ToLowerInvariant();
            else if (arg.Equals("-m", StringComparison.OrdinalIgnoreCase) && i + 1 < args.Length)
                edition = args[i + 1].Trim().ToLowerInvariant();
            else if (arg.StartsWith("--port=", StringComparison.OrdinalIgnoreCase) && int.TryParse(arg.Substring("--port=".Length).Trim(), out var pVal))
                port = pVal;
            else if ((arg.Equals("--port", StringComparison.OrdinalIgnoreCase) || arg.Equals("-p", StringComparison.OrdinalIgnoreCase)) && i + 1 < args.Length && int.TryParse(args[i + 1], out var pVal2))
                port = pVal2;
        }

        var targetMode = edition.ToLowerInvariant() switch
        {
            "resto" or "foodandbeverage" or "fnb" => BusinessMode.FoodAndBeverage,
            "services" or "jasa" or "barber" or "laundry" => BusinessMode.Services,
            "pharmacy" or "apotek" or "farmasi" => BusinessMode.Pharmacy,
            "electronics" or "gadget" or "elektronik" => BusinessMode.Electronics,
            _ => BusinessMode.Retail
        };

        var editionSlug = targetMode switch
        {
            BusinessMode.FoodAndBeverage => "resto",
            BusinessMode.Services => "services",
            BusinessMode.Pharmacy => "pharmacy",
            BusinessMode.Electronics => "electronics",
            _ => "retail"
        };

        var baseDir = AppDomain.CurrentDomain.BaseDirectory;
        var webRoot = Path.Combine(baseDir, "wwwroot");
        if (!Directory.Exists(webRoot))
        {
            webRoot = Path.Combine(Directory.GetCurrentDirectory(), "publish", "linux-x64", "wwwroot");
        }
        if (!Directory.Exists(webRoot))
        {
            webRoot = Path.Combine(Directory.GetCurrentDirectory(), "src", "OmniPos.Server", "wwwroot");
        }
        if (!Directory.Exists(webRoot))
        {
            webRoot = Path.Combine(Directory.GetCurrentDirectory(), "wwwroot");
        }

        var builder = WebApplication.CreateBuilder(new WebApplicationOptions
        {
            Args = args,
            ContentRootPath = Directory.Exists(webRoot) ? Path.GetDirectoryName(webRoot) : baseDir,
            WebRootPath = Directory.Exists(webRoot) ? webRoot : null
        });

        builder.WebHost.ConfigureKestrel(serverOptions =>
        {
            serverOptions.Listen(System.Net.IPAddress.Loopback, port);
        });

        // Isolated database path per edition
        var dbPath = customDbPath ?? Path.Combine(AppDomain.CurrentDomain.BaseDirectory, $"pos_{editionSlug}.db");

        // Configure JSON Serialization for EF Core Navigation Properties
        builder.Services.ConfigureHttpJsonOptions(options =>
        {
            options.SerializerOptions.ReferenceHandler = System.Text.Json.Serialization.ReferenceHandler.IgnoreCycles;
            options.SerializerOptions.DefaultIgnoreCondition = System.Text.Json.Serialization.JsonIgnoreCondition.WhenWritingNull;
            options.SerializerOptions.Converters.Add(new System.Text.Json.Serialization.JsonStringEnumConverter());
        });

        // Register EF Core SQLite
        builder.Services.AddDbContext<AppDbContext>(options =>
        {
            options.UseSqlite($"Data Source={dbPath}");
        });

        // Register Core & Infrastructure Services
        builder.Services.AddScoped<IUnitOfWork, UnitOfWork>();
        builder.Services.AddScoped(typeof(IRepository<>), typeof(GenericRepository<>));
        builder.Services.AddSingleton<IEncryptor, Aes256Encryptor>();
        builder.Services.AddScoped<IBackupService, GoogleDriveBackupService>();
        builder.Services.AddScoped<IPrintingService, EscPosPrinterDriver>();

        // Register Application Services
        builder.Services.AddScoped<CheckoutService>();
        builder.Services.AddScoped<ShiftService>();
        builder.Services.AddScoped<FinancialReportService>();
        builder.Services.AddSingleton<QRISGeneratorService>();

        // SignalR & CORS
        builder.Services.AddSignalR();
        builder.Services.AddCors(options =>
        {
            options.AddPolicy("AllowLocalAll", policy =>
            {
                policy.AllowAnyOrigin()
                      .AllowAnyMethod()
                      .AllowAnyHeader();
            });
        });

        builder.Services.AddEndpointsApiExplorer();
        builder.Services.AddSwaggerGen();

        var app = builder.Build();

        // Auto-migrate SQLite Database & Seed Data on Startup
        using (var scope = app.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
            await db.Database.EnsureCreatedAsync();
            await db.Database.ExecuteSqlRawAsync("PRAGMA journal_mode = WAL; PRAGMA synchronous = NORMAL; PRAGMA foreign_keys = ON;");
            await DatabaseSeeder.SeedAsync(db, targetMode);
        }

        if (app.Environment.IsDevelopment())
        {
            app.UseSwagger();
            app.UseSwaggerUI();
        }

        app.UseCors("AllowLocalAll");
        app.UseDefaultFiles();
        app.UseStaticFiles(new StaticFileOptions
        {
            OnPrepareResponse = ctx =>
            {
                ctx.Context.Response.Headers.Append("Cache-Control", "no-cache, no-store, must-revalidate");
                ctx.Context.Response.Headers.Append("Pragma", "no-cache");
                ctx.Context.Response.Headers.Append("Expires", "0");
            }
        });

        // SignalR WebSocket Hub
        app.MapHub<PosHub>("/hubs/pos");

        #region REST API Endpoints

        // 0. SYSTEM & EDITION INFO
        app.MapGet("/api/v1/system/edition", () =>
        {
            var displayName = targetMode switch
            {
                BusinessMode.FoodAndBeverage => "OmniPOS Resto, Kafe & Bakery",
                BusinessMode.Services => "OmniPOS Layanan, Barbershop & Laundry",
                BusinessMode.Pharmacy => "OmniPOS Apotek & Toko Obat",
                BusinessMode.Electronics => "OmniPOS Gadget & Toko Elektronik",
                _ => "OmniPOS Retail, Sembako & Minimarket"
            };

            var tagline = targetMode switch
            {
                BusinessMode.FoodAndBeverage => "Sistem Kasir F&B, Denah Meja Visual & Layar Dapur KDS",
                BusinessMode.Services => "Sistem Kasir Jasa, Antrean & Penugasan Staf",
                BusinessMode.Pharmacy => "Sistem Kasir Farmasi, Peringatan FEFO & Resep Dokter",
                BusinessMode.Electronics => "Sistem Kasir Gadget, Pelacakan IMEI & Garansi",
                _ => "Sistem Kasir Barcode Kilat, Grosir & Buku Kasbon"
            };

            return Results.Ok(new
            {
                editionKey = editionSlug,
                businessMode = targetMode.ToString(),
                displayName,
                tagline,
                dbPath
            });
        });

        app.MapPost("/api/v1/system/edition", async ([FromBody] SwitchEditionDto dto) =>
        {
            var target = dto.Edition?.Trim().ToLowerInvariant() ?? "electronics";
            var editionFile = Path.Combine(AppDomain.CurrentDomain.BaseDirectory, "edition.txt");
            await File.WriteAllTextAsync(editionFile, target);

            var cwdEditionFile = Path.Combine(Directory.GetCurrentDirectory(), "edition.txt");
            if (cwdEditionFile != editionFile)
            {
                try { await File.WriteAllTextAsync(cwdEditionFile, target); } catch { }
            }

            return Results.Ok(new { success = true, edition = target, message = $"Edisi toko berhasil disimpan ke {target}." });
        });

        // 1. PRODUCTS & CATEGORIES
        app.MapGet("/api/v1/products", async (AppDbContext db, [FromQuery] string? search, [FromQuery] string? categoryId, [FromQuery] BusinessMode? mode) =>
        {
            var query = db.Products
                .Include(p => p.Category)
                .Include(p => p.Variants)
                .Include(p => p.ModifierGroups).ThenInclude(mg => mg.ModifierGroup).ThenInclude(g => g.Options)
                .AsQueryable();

            if (mode.HasValue)
            {
                query = query.Where(p => p.BusinessMode == mode.Value);
            }

            if (!string.IsNullOrWhiteSpace(search))
            {
                var s = search.ToLower();
                query = query.Where(p => p.Name.ToLower().Contains(s) || (p.Barcode != null && p.Barcode.Contains(s)) || p.Sku.ToLower().Contains(s));
            }

            if (!string.IsNullOrWhiteSpace(categoryId))
            {
                query = query.Where(p => p.CategoryId == categoryId);
            }

            var products = await query.ToListAsync();
            return Results.Ok(products);
        });

        app.MapPost("/api/v1/products", async (AppDbContext db, [FromBody] Product p) =>
        {
            if (string.IsNullOrWhiteSpace(p.Name))
                return Results.BadRequest(new { message = "Nama produk wajib diisi." });

            if (string.IsNullOrWhiteSpace(p.Sku))
                p.Sku = $"PRD-{DateTime.Now:yyyyMMddHHmmss}";

            if (string.IsNullOrWhiteSpace(p.Barcode))
                p.Barcode = p.Sku;

            if (string.IsNullOrWhiteSpace(p.CategoryId))
            {
                var defCat = await db.Categories.FirstOrDefaultAsync(c => !c.IsDeleted);
                p.CategoryId = defCat?.Id ?? "cat_default";
            }

            p.BusinessMode = p.BusinessMode == default ? BusinessMode.Retail : p.BusinessMode;
            p.CreatedAt = DateTime.UtcNow;

            await db.Products.AddAsync(p);
            await db.SaveChangesAsync();
            return Results.Created($"/api/v1/products/{p.Id}", p);
        });

        app.MapPut("/api/v1/products/{id}", async (AppDbContext db, string id, [FromBody] Product input) =>
        {
            var existing = await db.Products.FirstOrDefaultAsync(p => p.Id == id && !p.IsDeleted);
            if (existing == null) return Results.NotFound(new { message = "Produk tidak ditemukan." });

            existing.Name = input.Name;
            existing.Sku = input.Sku;
            existing.Barcode = input.Barcode;
            existing.CategoryId = input.CategoryId;
            existing.BuyPrice = input.BuyPrice;
            existing.SellPrice = input.SellPrice;
            existing.WholesalePrice = input.WholesalePrice;
            existing.WholesaleMinQty = input.WholesaleMinQty;
            existing.CurrentStock = input.CurrentStock;
            existing.MinStockAlert = input.MinStockAlert;
            existing.Unit = input.Unit ?? "PCS";
            existing.UpdatedAt = DateTime.UtcNow;

            await db.SaveChangesAsync();
            return Results.Ok(existing);
        });

        app.MapDelete("/api/v1/products/{id}", async (AppDbContext db, string id) =>
        {
            var existing = await db.Products.FirstOrDefaultAsync(p => p.Id == id && !p.IsDeleted);
            if (existing == null) return Results.NotFound(new { message = "Produk tidak ditemukan." });

            existing.IsDeleted = true;
            existing.UpdatedAt = DateTime.UtcNow;
            await db.SaveChangesAsync();
            return Results.Ok(new { success = true, message = "Produk berhasil dihapus." });
        });

        app.MapGet("/api/v1/categories", async (AppDbContext db, [FromQuery] BusinessMode? mode) =>
        {
            var query = db.Categories.AsQueryable();
            if (mode.HasValue)
            {
                query = query.Where(c => c.BusinessMode == mode.Value);
            }
            var categories = await query.OrderBy(c => c.SortOrder).ToListAsync();
            return Results.Ok(categories);
        });

        // 1.1 CSV Template, Export & Bulk Import Endpoints
        app.MapGet("/api/v1/products/template-csv", () =>
        {
            var csv = "SKU,Barcode,Name,Category,BuyPrice,SellPrice,WholesalePrice,WholesaleMinQty,CurrentStock,Unit\n" +
                      "MIE-001,899238810101,Indomie Goreng Original 85g,Makanan & Mie,2800,3500,3200,5,100,PCS\n" +
                      "MNM-001,899990901234,Le Minerale 600ml,Minuman,2500,3500,3000,10,120,BOTOL\n" +
                      "MPO-001,899123456789,Minyak Goreng Sania 2L,Sembako & Minyak,32000,38000,36000,3,40,POUCH\n";
            return Results.Text(csv, "text/csv; charset=utf-8");
        });

        app.MapGet("/api/v1/products/export-csv", async (AppDbContext db) =>
        {
            var products = await db.Products.Include(p => p.Category).Where(p => !p.IsDeleted).ToListAsync();
            var sb = new System.Text.StringBuilder();
            sb.AppendLine("SKU,Barcode,Name,Category,BuyPrice,SellPrice,WholesalePrice,WholesaleMinQty,CurrentStock,Unit");
            foreach (var p in products)
            {
                var safeName = p.Name.Replace("\"", "\"\"");
                var safeCat = (p.Category?.Name ?? "Umum").Replace("\"", "\"\"");
                sb.AppendLine($"\"{p.Sku}\",\"{p.Barcode}\",\"{safeName}\",\"{safeCat}\",{p.BuyPrice},{p.SellPrice},{p.WholesalePrice ?? 0},{p.WholesaleMinQty ?? 0},{p.CurrentStock},\"{p.Unit}\"");
            }
            return Results.Text(sb.ToString(), "text/csv; charset=utf-8");
        });

        app.MapPost("/api/v1/products/import-csv", async (AppDbContext db, [FromBody] ImportCsvDto dto) =>
        {
            if (string.IsNullOrWhiteSpace(dto.CsvContent)) return Results.BadRequest(new { message = "Konten CSV kosong." });
            var lines = dto.CsvContent.Split(new[] { "\r\n", "\n" }, StringSplitOptions.RemoveEmptyEntries);
            if (lines.Length <= 1) return Results.BadRequest(new { message = "File CSV tidak memiliki baris data." });

            int importedCount = 0;
            int updatedCount = 0;
            var errors = new List<string>();

            var defaultCat = await db.Categories.FirstOrDefaultAsync(c => !c.IsDeleted);
            var defaultCatId = defaultCat?.Id ?? "cat_default";

            for (int i = 1; i < lines.Length; i++)
            {
                var line = lines[i].Trim();
                if (string.IsNullOrWhiteSpace(line)) continue;

                var parts = System.Text.RegularExpressions.Regex.Split(line, ",(?=(?:[^\"]*\"[^\"]*\")*[^\"]*$)")
                    .Select(s => s.Trim().Trim('"')).ToArray();

                if (parts.Length < 6)
                {
                    errors.Add($"Baris {i + 1}: Kolom tidak lengkap (minimal 6 kolom: SKU, Barcode, Name, Category, BuyPrice, SellPrice)");
                    continue;
                }

                var sku = parts[0].Trim();
                var barcode = parts.Length > 1 ? parts[1].Trim() : null;
                var name = parts.Length > 2 ? parts[2].Trim() : "";
                var catName = parts.Length > 3 ? parts[3].Trim() : "Umum";
                decimal.TryParse(parts.Length > 4 ? parts[4] : "0", out var buyPrice);
                decimal.TryParse(parts.Length > 5 ? parts[5] : "0", out var sellPrice);
                decimal? wholesalePrice = parts.Length > 6 && decimal.TryParse(parts[6], out var wp) && wp > 0 ? wp : null;
                decimal? wholesaleMinQty = parts.Length > 7 && decimal.TryParse(parts[7], out var wmq) && wmq > 0 ? wmq : null;
                decimal.TryParse(parts.Length > 8 ? parts[8] : "0", out var currentStock);
                var unit = parts.Length > 9 && !string.IsNullOrWhiteSpace(parts[9]) ? parts[9].Trim().ToUpperInvariant() : "PCS";

                if (string.IsNullOrWhiteSpace(sku) || string.IsNullOrWhiteSpace(name))
                {
                    errors.Add($"Baris {i + 1}: SKU dan Nama Barang wajib diisi");
                    continue;
                }

                var cat = await db.Categories.FirstOrDefaultAsync(c => c.Name.ToLower() == catName.ToLower() && !c.IsDeleted);
                if (cat == null && !string.IsNullOrWhiteSpace(catName))
                {
                    cat = new Category { Name = catName, BusinessMode = BusinessMode.Retail, SortOrder = 10 };
                    await db.Categories.AddAsync(cat);
                    await db.SaveChangesAsync();
                }

                var categoryId = cat?.Id ?? defaultCatId;

                var existing = await db.Products.FirstOrDefaultAsync(p => (p.Sku == sku || (barcode != null && p.Barcode == barcode)) && !p.IsDeleted);
                if (existing != null)
                {
                    existing.Name = name;
                    if (!string.IsNullOrWhiteSpace(barcode)) existing.Barcode = barcode;
                    existing.CategoryId = categoryId;
                    existing.BuyPrice = buyPrice;
                    existing.SellPrice = sellPrice;
                    existing.WholesalePrice = wholesalePrice;
                    existing.WholesaleMinQty = wholesaleMinQty;
                    existing.Unit = unit;
                    if (currentStock > 0) existing.CurrentStock = currentStock;
                    updatedCount++;
                }
                else
                {
                    var newProd = new Product
                    {
                        Sku = sku,
                        Barcode = string.IsNullOrWhiteSpace(barcode) ? sku : barcode,
                        Name = name,
                        CategoryId = categoryId,
                        BusinessMode = BusinessMode.Retail,
                        BuyPrice = buyPrice,
                        SellPrice = sellPrice,
                        WholesalePrice = wholesalePrice,
                        WholesaleMinQty = wholesaleMinQty,
                        CurrentStock = currentStock,
                        Unit = unit,
                        TrackStock = true
                    };
                    await db.Products.AddAsync(newProd);
                    importedCount++;
                }
            }

            await db.SaveChangesAsync();
            return Results.Ok(new { importedCount, updatedCount, errors });
        });

        // 1.2 Multi-Unit Conversions Endpoints
        app.MapGet("/api/v1/products/{productId}/unit-conversions", async (AppDbContext db, string productId) =>
        {
            var list = await db.ProductUnitConversions.Where(u => u.ProductId == productId && !u.IsDeleted).ToListAsync();
            return Results.Ok(list);
        });

        app.MapPost("/api/v1/products/{productId}/unit-conversions", async (AppDbContext db, string productId, [FromBody] ProductUnitConversion uc) =>
        {
            uc.ProductId = productId;
            if (string.IsNullOrWhiteSpace(uc.UnitName)) uc.UnitName = "DUS";
            if (uc.ConversionFactor <= 0) uc.ConversionFactor = 1;
            await db.ProductUnitConversions.AddAsync(uc);
            await db.SaveChangesAsync();
            return Results.Ok(uc);
        });

        app.MapDelete("/api/v1/products/unit-conversions/{id}", async (AppDbContext db, string id) =>
        {
            var item = await db.ProductUnitConversions.FirstOrDefaultAsync(u => u.Id == id);
            if (item != null)
            {
                item.IsDeleted = true;
                await db.SaveChangesAsync();
            }
            return Results.Ok(new { success = true });
        });

        // 2. SALES & CHECKOUT
        app.MapPost("/api/v1/sales/checkout", async (
            [FromBody] CreateOrderDto dto,
            CheckoutService checkoutService,
            IPrintingService printer,
            IHubContext<PosHub> hub) =>
        {
            try
            {
                var result = await checkoutService.ProcessCheckoutAsync(dto);
                
                // Print Receipt automatically
                _ = printer.PrintReceiptAsync(result.Id);
                
                // Notify KDS Screen and CFD Screen
                await hub.Clients.All.SendAsync("ReceiveKitchenOrder", result);
                
                return Results.Created($"/api/v1/sales/orders/{result.Id}", result);
            }
            catch (Exception ex)
            {
                return Results.BadRequest(new { error = ex.Message });
            }
        });

        app.MapGet("/api/v1/sales/orders", async (AppDbContext db, [FromQuery] int limit = 20) =>
        {
            var orders = await db.Orders
                .Include(o => o.Items)
                .Include(o => o.Payments)
                .Include(o => o.Customer)
                .OrderByDescending(o => o.OrderDate)
                .Take(limit)
                .ToListAsync();
            return Results.Ok(orders);
        });

        app.MapPost("/api/v1/sales/qris/generate", (
            [FromBody] QrisGenerateRequest req,
            QRISGeneratorService qrisService) =>
        {
            var result = qrisService.GenerateDynamicQris("ID1020023456789", "OmniPOS Store", "JAKARTA", req.Amount, req.InvoiceNumber);
            return Results.Ok(result);
        });

        // 3. SHIFTS & CASH DRAWER
        app.MapGet("/api/v1/shifts/active", async (AppDbContext db) =>
        {
            var activeShift = await db.Shifts
                .Include(s => s.CashTransactions)
                .FirstOrDefaultAsync(s => !s.IsClosed);
            return Results.Ok(activeShift);
        });

        app.MapPost("/api/v1/shifts/open", async ([FromBody] OpenShiftDto dto, ShiftService shiftService) =>
        {
            var shift = await shiftService.OpenShiftAsync(dto);
            return Results.Ok(shift);
        });

        app.MapPost("/api/v1/shifts/close", async (
            [FromBody] CloseShiftDto dto,
            ShiftService shiftService,
            IBackupService backupService) =>
        {
            var zReport = await shiftService.CloseShiftAsync(dto);
            // Automatic Background Backup to Google Drive on Shift Close
            _ = Task.Run(async () =>
            {
                var localBackupPath = await backupService.CreateLocalEncryptedBackupAsync("SHIFT_CLOSE");
                await backupService.UploadBackupToGoogleDriveAsync(localBackupPath);
            });
            return Results.Ok(zReport);
        });

        app.MapPost("/api/v1/shifts/cash-tx", async ([FromBody] CreateCashTransactionDto dto, ShiftService shiftService) =>
        {
            var tx = await shiftService.AddCashTransactionAsync(dto);
            return Results.Ok(tx);
        });

        // 4. TABLES (F&B)
        app.MapGet("/api/v1/tables", async (AppDbContext db) =>
        {
            var areas = await db.FloorPlanAreas
                .Include(a => a.Tables)
                .OrderBy(a => a.SortOrder)
                .ToListAsync();
            return Results.Ok(areas);
        });

        app.MapPut("/api/v1/tables/{id}/status", async (
            string id,
            [FromBody] TableStatusUpdateRequest req,
            AppDbContext db,
            IHubContext<PosHub> hub) =>
        {
            var table = await db.DiningTables.FirstOrDefaultAsync(t => t.Id == id);
            if (table == null) return Results.NotFound();
            
            table.Status = req.Status;
            if (req.Status == TableStatus.Available)
            {
                table.CurrentOrderId = null;
                table.CurrentBillAmount = 0;
            }
            await db.SaveChangesAsync();
            
            await hub.Clients.All.SendAsync("TableStatusUpdated", id, req.Status.ToString());
            return Results.Ok(table);
        });

        // 5. CRM & CUSTOMERS
        app.MapGet("/api/v1/customers", async (AppDbContext db) =>
        {
            var customers = await db.Customers
                .Include(c => c.Receivables)
                .OrderBy(c => c.Name)
                .ToListAsync();
            return Results.Ok(customers);
        });

        app.MapPost("/api/v1/customers", async ([FromBody] Customer customer, AppDbContext db) =>
        {
            await db.Customers.AddAsync(customer);
            await db.SaveChangesAsync();
            return Results.Created($"/api/v1/customers/{customer.Id}", customer);
        });

        // 6. REPORTS & ANALYTICS
        app.MapGet("/api/v1/reports/sales-summary", async (
            [FromQuery] string? start,
            [FromQuery] string? end,
            FinancialReportService reportService) =>
        {
            var startDate = DateTime.TryParse(start, out var s) ? s.ToUniversalTime() : DateTime.UtcNow.AddDays(-30);
            var endDate = DateTime.TryParse(end, out var e) ? e.ToUniversalTime() : DateTime.UtcNow;
            var summary = await reportService.GetSalesSummaryAsync(startDate, endDate);
            return Results.Ok(summary);
        });

        // 7. BACKUP & GOOGLE DRIVE
        app.MapGet("/api/v1/backup/history", async (AppDbContext db) =>
        {
            var history = await db.BackupHistories
                .OrderByDescending(b => b.CreatedAt)
                .Take(30)
                .ToListAsync();
            return Results.Ok(history);
        });

        app.MapPost("/api/v1/backup/create-now", async (IBackupService backupService) =>
        {
            var localPath = await backupService.CreateLocalEncryptedBackupAsync("MANUAL");
            var uploaded = await backupService.UploadBackupToGoogleDriveAsync(localPath);
            return Results.Ok(new { path = localPath, uploadedToDrive = uploaded });
        });

        // 8. PRINTER TEST & CASH DRAWER
        app.MapPost("/api/v1/printer/drawer/open", async (IPrintingService printer) =>
        {
            var success = await printer.OpenCashDrawerAsync();
            return Results.Ok(new { success });
        });

        app.MapPost("/api/v1/printer/receipt/{orderId}", async (string orderId, IPrintingService printer) =>
        {
            var success = await printer.PrintReceiptAsync(orderId);
            return Results.Ok(new { success });
        });

        app.MapPost("/api/v1/printer/receipt-by-invoice/{invoiceNumber}", async (string invoiceNumber, AppDbContext db, IPrintingService printer) =>
        {
            var order = await db.Orders.FirstOrDefaultAsync(o => o.InvoiceNumber == invoiceNumber);
            if (order == null) return Results.NotFound(new { message = "Nota tidak ditemukan." });
            var success = await printer.PrintReceiptAsync(order.Id);
            return Results.Ok(new { success, invoiceNumber });
        });

        // 8.1 REAL-TIME HARDWARE DIAGNOSTICS & CONNECTIVITY
        app.MapGet("/api/v1/hardware/status", async (AppDbContext db, IPrintingService printer) =>
        {
            var printerType = (await db.AppSettings.FirstOrDefaultAsync(s => s.SettingKey == "PRINTER_TYPE"))?.SettingValue ?? "VIRTUAL";
            var printerIp = (await db.AppSettings.FirstOrDefaultAsync(s => s.SettingKey == "PRINTER_IP"))?.SettingValue ?? "127.0.0.1";
            var printerPortStr = (await db.AppSettings.FirstOrDefaultAsync(s => s.SettingKey == "PRINTER_PORT"))?.SettingValue ?? "9100";
            int.TryParse(printerPortStr, out var printerPort);
            if (printerPort <= 0) printerPort = 9100;
            var paperSize = (await db.AppSettings.FirstOrDefaultAsync(s => s.SettingKey == "PAPER_SIZE"))?.SettingValue ?? "80mm";

            bool printerOnline = true;
            string printerStatus = "Connected";
            string printerDetails = $"Thermal {paperSize} ({printerType})";

            if (printerType == "NETWORK_LAN")
            {
                try
                {
                    using var tcp = new System.Net.Sockets.TcpClient();
                    var connectTask = tcp.ConnectAsync(printerIp, printerPort);
                    var delayTask = Task.Delay(1000);
                    var completed = await Task.WhenAny(connectTask, delayTask);
                    if (completed == connectTask && tcp.Connected)
                    {
                        printerOnline = true;
                        printerStatus = "Connected";
                        printerDetails = $"LAN {printerIp}:{printerPort} - Online";
                    }
                    else
                    {
                        printerOnline = false;
                        printerStatus = "Disconnected";
                        printerDetails = $"LAN {printerIp}:{printerPort} - Tidak Merespon";
                    }
                }
                catch
                {
                    printerOnline = false;
                    printerStatus = "Disconnected";
                    printerDetails = $"LAN {printerIp}:{printerPort} - Terputus";
                }
            }
            else if (printerType == "VIRTUAL")
            {
                printerOnline = true;
                printerStatus = "Virtual";
                printerDetails = "Spooler Virtual (Fallback Browser/PDF Siap)";
            }

            var status = new HardwareStatusDto(
                Printer: new DeviceStatusItemDto(
                    DeviceType: "ThermalPrinter",
                    Name: $"Printer Struk Thermal ({paperSize})",
                    Status: printerStatus,
                    IsOnline: printerOnline,
                    ConnectionMode: printerType,
                    Details: printerDetails,
                    FallbackInstruction: "Bila printer fisik offline, sistem otomatis mengalihkan ke Cetak Struk Browser / PDF."
                ),
                CashDrawer: new DeviceStatusItemDto(
                    DeviceType: "CashDrawer",
                    Name: "Laci Kasir (Cash Drawer RJ11)",
                    Status: printerOnline ? "Connected" : "ManualOnly",
                    IsOnline: printerOnline,
                    ConnectionMode: "PrinterKickPin2",
                    Details: printerOnline ? "Terkoneksi via Kick Printer Pin 2" : "Laci manual (Gunakan kunci fisik jika printer offline)",
                    FallbackInstruction: "Gunakan anak kunci manual kasir jika printer struk mati."
                ),
                BarcodeScanner: new DeviceStatusItemDto(
                    DeviceType: "BarcodeScanner",
                    Name: "Barcode Scanner (EAN-13 / PLU)",
                    Status: "Connected",
                    IsOnline: true,
                    ConnectionMode: "USB_HID_Wedge",
                    Details: "Keyboard Wedge Mode Aktif (Input Instan F1)",
                    FallbackInstruction: "Gunakan tombol [F1] untuk ketik barcode/PLU manual atau [F2] untuk cari nama barang."
                ),
                DigitalScale: new DeviceStatusItemDto(
                    DeviceType: "DigitalScale",
                    Name: "Timbangan Digital (RS-232 / Barcode)",
                    Status: "ManualFallback",
                    IsOnline: true,
                    ConnectionMode: "ManualInput",
                    Details: "Kalkulator Timbang Manual Terintegrasi (Gram / Kg)",
                    FallbackInstruction: "Sistem otomatis membuka popup timbangan manual untuk produk satuan KG/Gram."
                ),
                CustomerDisplay: new DeviceStatusItemDto(
                    DeviceType: "CustomerFacingDisplay",
                    Name: "Layar Pelanggan (CFD Dual Screen)",
                    Status: "Connected",
                    IsOnline: true,
                    ConnectionMode: "SIGNALR",
                    Details: "WebSocket Real-time Broadcast Aktif (/cfd)",
                    FallbackInstruction: "Layar pelanggan dapat dibuka di tab baru atau monitor kedua pada URL /cfd."
                ),
                KitchenDisplay: new DeviceStatusItemDto(
                    DeviceType: "KitchenDisplaySystem",
                    Name: "Layar Dapur (KDS Station)",
                    Status: "Connected",
                    IsOnline: true,
                    ConnectionMode: "SIGNALR",
                    Details: "WebSocket Pesanan Dapur Aktif (/kds)",
                    FallbackInstruction: "Jika KDS mati, kasir dapat mencetak tiket dapur fisik via printer thermal."
                ),
                CheckedAt: DateTime.UtcNow
            );

            return Results.Ok(status);
        });

        app.MapPost("/api/v1/hardware/test/printer", async (IPrintingService printer) =>
        {
            var success = await printer.PrintTestSlipAsync();
            return Results.Ok(new { success, message = success ? "Tes cetak berhasil dikirim!" : "Gagal mengirim tes cetak." });
        });

        app.MapPost("/api/v1/hardware/test/drawer", async (IPrintingService printer) =>
        {
            var success = await printer.OpenCashDrawerAsync();
            return Results.Ok(new { success, message = success ? "Sinyal kick laci berhasil dikirim!" : "Gagal membuka laci otomatis." });
        });

        // 9. SETTINGS
        app.MapGet("/api/v1/settings", async (AppDbContext db) =>
        {
            var settings = await db.AppSettings.ToListAsync();
            return Results.Ok(settings);
        });

        app.MapPut("/api/v1/settings", async ([FromBody] List<AppSetting> newSettings, AppDbContext db) =>
        {
            foreach (var item in newSettings)
            {
                var existing = await db.AppSettings.FirstOrDefaultAsync(s => s.SettingKey == item.SettingKey);
                if (existing != null)
                    existing.SettingValue = item.SettingValue;
                else
                    await db.AppSettings.AddAsync(item);
            }
            await db.SaveChangesAsync();
            return Results.Ok(newSettings);
        });

        // 10. AUTHENTICATION & INITIAL SETUP
        app.MapGet("/api/v1/auth/setup-status", async (AppDbContext db) =>
        {
            var hasAdmin = await db.Users.AnyAsync(u => u.Role == UserRole.SuperAdmin && !u.IsDeleted);
            var storeSetting = await db.AppSettings.FirstOrDefaultAsync(s => s.SettingKey == "STORE_NAME");
            var storePhone = await db.AppSettings.FirstOrDefaultAsync(s => s.SettingKey == "STORE_PHONE");
            var storeAddress = await db.AppSettings.FirstOrDefaultAsync(s => s.SettingKey == "STORE_ADDRESS");

            return Results.Ok(new
            {
                isSetupRequired = !hasAdmin,
                storeName = storeSetting?.SettingValue ?? "OmniPOS Store",
                storePhone = storePhone?.SettingValue ?? "",
                storeAddress = storeAddress?.SettingValue ?? "",
                edition = targetMode.ToString(),
                editionSlug
            });
        });

        app.MapPost("/api/v1/auth/setup-initial-admin", async (AppDbContext db, [FromBody] InitialAdminSetupDto dto) =>
        {
            if (string.IsNullOrWhiteSpace(dto.Username) || string.IsNullOrWhiteSpace(dto.Password) || string.IsNullOrWhiteSpace(dto.FullName))
            {
                return Results.BadRequest(new { message = "Nama Lengkap, Username, dan Password wajib diisi." });
            }

            var existingAdmin = await db.Users.AnyAsync(u => u.Role == UserRole.SuperAdmin && !u.IsDeleted);
            if (existingAdmin)
            {
                return Results.BadRequest(new { message = "Akun Administrator Pemilik sudah terdaftar sebelumnya." });
            }

            var pin = string.IsNullOrWhiteSpace(dto.PinCode) ? "123456" : dto.PinCode.Trim();

            var admin = new User
            {
                FullName = dto.FullName.Trim(),
                Username = dto.Username.Trim().ToLowerInvariant(),
                PasswordHash = PasswordHasher.Hash(dto.Password),
                PinCodeHash = PasswordHasher.Hash(pin),
                Role = UserRole.SuperAdmin,
                IsActive = true,
                LastLoginAt = DateTime.UtcNow
            };

            await db.Users.AddAsync(admin);

            if (!string.IsNullOrWhiteSpace(dto.StoreName))
            {
                var sName = await db.AppSettings.FirstOrDefaultAsync(s => s.SettingKey == "STORE_NAME");
                if (sName != null) sName.SettingValue = dto.StoreName.Trim();
            }
            if (!string.IsNullOrWhiteSpace(dto.StorePhone))
            {
                var sPhone = await db.AppSettings.FirstOrDefaultAsync(s => s.SettingKey == "STORE_PHONE");
                if (sPhone != null) sPhone.SettingValue = dto.StorePhone.Trim();
            }
            if (!string.IsNullOrWhiteSpace(dto.StoreAddress))
            {
                var sAddr = await db.AppSettings.FirstOrDefaultAsync(s => s.SettingKey == "STORE_ADDRESS");
                if (sAddr != null) sAddr.SettingValue = dto.StoreAddress.Trim();
            }

            await db.SaveChangesAsync();

            return Results.Ok(new
            {
                message = "Registrasi Administrator Toko Berhasil!",
                user = new
                {
                    admin.Id,
                    admin.Username,
                    admin.FullName,
                    role = admin.Role.ToString(),
                    admin.IsActive
                }
            });
        });

        app.MapPost("/api/v1/auth/login", async (AppDbContext db, [FromBody] LoginRequestDto dto) =>
        {
            User? user = null;

            // 1. PIN Login dengan User/Username Terpilih
            if (!string.IsNullOrWhiteSpace(dto.PinCode) && (!string.IsNullOrWhiteSpace(dto.Username) || !string.IsNullOrWhiteSpace(dto.UserId)))
            {
                var target = !string.IsNullOrWhiteSpace(dto.Username) ? dto.Username.Trim().ToLowerInvariant() : dto.UserId?.Trim();
                user = await db.Users.FirstOrDefaultAsync(u => 
                    (u.Username.ToLower() == target || u.Id == target) && !u.IsDeleted);

                if (user == null || !PasswordHasher.Verify(dto.PinCode.Trim(), user.PinCodeHash))
                {
                    return Results.BadRequest(new { message = "PIN yang dimasukkan salah untuk akun ini." });
                }
                if (!user.IsActive)
                {
                    return Results.BadRequest(new { message = "Akun ini sedang dinonaktifkan. Hubungi Administrator." });
                }
            }
            // 2. PIN Login Global (Langsung mengetik PIN pada Keypad)
            else if (!string.IsNullOrWhiteSpace(dto.PinCode))
            {
                var activeUsers = await db.Users.Where(u => u.IsActive && !u.IsDeleted).ToListAsync();
                var matchingUsers = activeUsers.Where(u => PasswordHasher.Verify(dto.PinCode.Trim(), u.PinCodeHash)).ToList();

                if (matchingUsers.Count == 0)
                {
                    return Results.BadRequest(new { message = "PIN yang dimasukkan tidak terdaftar pada akun aktif." });
                }
                if (matchingUsers.Count > 1)
                {
                    // Duplikasi PIN terdeteksi: Minta kasir memilih kartu profil mereka
                    return Results.Ok(new
                    {
                        isAmbiguous = true,
                        message = "PIN ini digunakan oleh beberapa pengguna. Silakan klik akun Anda:",
                        candidateUsers = matchingUsers.Select(u => new
                        {
                            u.Id,
                            u.Username,
                            u.FullName,
                            role = u.Role.ToString()
                        })
                    });
                }

                user = matchingUsers[0];
            }
            // 3. Username & Password Login
            else if (!string.IsNullOrWhiteSpace(dto.Username) && !string.IsNullOrWhiteSpace(dto.Password))
            {
                var un = dto.Username.Trim().ToLowerInvariant();
                user = await db.Users.FirstOrDefaultAsync(u => u.Username.ToLower() == un && !u.IsDeleted);
                if (user == null || !PasswordHasher.Verify(dto.Password, user.PasswordHash))
                {
                    return Results.BadRequest(new { message = "Username atau password salah." });
                }
                if (!user.IsActive)
                {
                    return Results.BadRequest(new { message = "Akun Anda sedang dinonaktifkan. Hubungi Administrator." });
                }
            }
            else
            {
                return Results.BadRequest(new { message = "Harap masukkan Username & Password atau 6-digit PIN." });
            }

            user.LastLoginAt = DateTime.UtcNow;
            await db.SaveChangesAsync();

            return Results.Ok(new
            {
                message = "Login berhasil",
                user = new
                {
                    user.Id,
                    user.Username,
                    user.FullName,
                    role = user.Role.ToString(),
                    user.IsActive,
                    user.LastLoginAt
                }
            });
        });

        // 11. USER / STAFF MANAGEMENT
        app.MapGet("/api/v1/users", async (AppDbContext db) =>
        {
            var users = await db.Users
                .Where(u => !u.IsDeleted)
                .OrderBy(u => u.Role)
                .ThenBy(u => u.FullName)
                .Select(u => new
                {
                    u.Id,
                    u.Username,
                    u.FullName,
                    role = u.Role.ToString(),
                    u.IsActive,
                    u.LastLoginAt,
                    u.CreatedAt
                })
                .ToListAsync();

            return Results.Ok(users);
        });

        app.MapPost("/api/v1/users", async (AppDbContext db, [FromBody] CreateUserDto dto) =>
        {
            if (string.IsNullOrWhiteSpace(dto.Username) || string.IsNullOrWhiteSpace(dto.FullName) || string.IsNullOrWhiteSpace(dto.Password))
            {
                return Results.BadRequest(new { message = "Nama Lengkap, Username, dan Password wajib diisi." });
            }

            var un = dto.Username.Trim().ToLowerInvariant();
            var exists = await db.Users.AnyAsync(u => u.Username.ToLower() == un && !u.IsDeleted);
            if (exists)
            {
                return Results.BadRequest(new { message = $"Username '{dto.Username}' sudah digunakan." });
            }

            var pin = string.IsNullOrWhiteSpace(dto.PinCode) ? "111111" : dto.PinCode.Trim();

            var newUser = new User
            {
                FullName = dto.FullName.Trim(),
                Username = un,
                PasswordHash = PasswordHasher.Hash(dto.Password),
                PinCodeHash = PasswordHasher.Hash(pin),
                Role = dto.Role,
                IsActive = dto.IsActive
            };

            await db.Users.AddAsync(newUser);
            await db.SaveChangesAsync();

            return Results.Created($"/api/v1/users/{newUser.Id}", new
            {
                newUser.Id,
                newUser.Username,
                newUser.FullName,
                role = newUser.Role.ToString(),
                newUser.IsActive,
                newUser.CreatedAt
            });
        });

        app.MapPut("/api/v1/users/{id}", async (AppDbContext db, string id, [FromBody] UpdateUserDto dto) =>
        {
            var user = await db.Users.FirstOrDefaultAsync(u => u.Id == id && !u.IsDeleted);
            if (user == null) return Results.NotFound(new { message = "Pengguna tidak ditemukan." });

            if (!string.IsNullOrWhiteSpace(dto.FullName)) user.FullName = dto.FullName.Trim();
            user.Role = dto.Role;
            user.IsActive = dto.IsActive;

            if (!string.IsNullOrWhiteSpace(dto.NewPassword))
            {
                user.PasswordHash = PasswordHasher.Hash(dto.NewPassword);
            }
            if (!string.IsNullOrWhiteSpace(dto.NewPinCode))
            {
                user.PinCodeHash = PasswordHasher.Hash(dto.NewPinCode.Trim());
            }

            await db.SaveChangesAsync();

            return Results.Ok(new
            {
                user.Id,
                user.Username,
                user.FullName,
                role = user.Role.ToString(),
                user.IsActive,
                user.UpdatedAt
            });
        });

        app.MapDelete("/api/v1/users/{id}", async (AppDbContext db, string id) =>
        {
            var user = await db.Users.FirstOrDefaultAsync(u => u.Id == id && !u.IsDeleted);
            if (user == null) return Results.NotFound(new { message = "Pengguna tidak ditemukan." });

            if (user.Role == UserRole.SuperAdmin)
            {
                var adminCount = await db.Users.CountAsync(u => u.Role == UserRole.SuperAdmin && !u.IsDeleted);
                if (adminCount <= 1)
                {
                    return Results.BadRequest(new { message = "Tidak dapat menghapus satu-satunya akun Administrator / Pemilik Toko." });
                }
            }

            user.IsDeleted = true;
            user.IsActive = false;
            await db.SaveChangesAsync();

            return Results.Ok(new { message = "Pengguna berhasil dinonaktifkan." });
        });

        #endregion

        #region 10. Purchasing, Suppliers & Accounts Payable Endpoints

        app.MapGet("/api/v1/suppliers", async (AppDbContext db) =>
        {
            var list = await db.Suppliers.Where(s => !s.IsDeleted).OrderBy(s => s.Name).ToListAsync();
            return Results.Ok(list);
        });

        app.MapPost("/api/v1/suppliers", async (AppDbContext db, [FromBody] OmniPos.Core.Entities.Purchasing.Supplier supplier) =>
        {
            if (string.IsNullOrWhiteSpace(supplier.Name)) return Results.BadRequest(new { message = "Nama supplier wajib diisi." });
            if (string.IsNullOrWhiteSpace(supplier.Code)) supplier.Code = $"SUP-{DateTime.UtcNow.Ticks.ToString()[^4..]}";
            await db.Suppliers.AddAsync(supplier);
            await db.SaveChangesAsync();
            return Results.Ok(supplier);
        });

        app.MapGet("/api/v1/purchases", async (AppDbContext db) =>
        {
            var invoices = await db.PurchaseInvoices
                .Include(p => p.Items)
                .Include(p => p.Payments)
                .Where(p => !p.IsDeleted)
                .OrderByDescending(p => p.PurchaseDate)
                .ToListAsync();
            return Results.Ok(invoices);
        });

        app.MapPost("/api/v1/purchases", async (AppDbContext db, [FromBody] CreatePurchaseInvoiceDto dto) =>
        {
            var invoiceNumber = $"PO-{DateTime.UtcNow:yyyyMMdd}-{Guid.NewGuid().ToString("N")[..4].ToUpper()}";
            var supplier = await db.Suppliers.FirstOrDefaultAsync(s => s.Id == dto.SupplierId);
            var supplierName = supplier?.Name ?? dto.SupplierName ?? "Supplier Umum";

            var invoice = new OmniPos.Core.Entities.Purchasing.PurchaseInvoice
            {
                InvoiceNumber = invoiceNumber,
                ReferenceNumber = dto.ReferenceNumber,
                SupplierId = dto.SupplierId ?? "",
                SupplierName = supplierName,
                PurchaseDate = dto.PurchaseDate ?? DateTime.UtcNow,
                TotalAmount = dto.TotalAmount,
                PaidAmount = dto.PaidAmount,
                RemainingPayable = Math.Max(0, dto.TotalAmount - dto.PaidAmount),
                DueDate = dto.DueDate,
                PaymentStatus = dto.PaidAmount >= dto.TotalAmount ? OmniPos.Core.Entities.Purchasing.PurchasePaymentStatus.Paid :
                                dto.PaidAmount > 0 ? OmniPos.Core.Entities.Purchasing.PurchasePaymentStatus.Partial :
                                OmniPos.Core.Entities.Purchasing.PurchasePaymentStatus.Unpaid,
                Notes = dto.Notes
            };

            // Process Items and update product stock & buy prices
            foreach (var item in dto.Items)
            {
                var pItem = new OmniPos.Core.Entities.Purchasing.PurchaseItem
                {
                    PurchaseInvoiceId = invoice.Id,
                    ProductId = item.ProductId,
                    ProductName = item.ProductName,
                    Sku = item.Sku,
                    Quantity = item.Quantity,
                    UnitCost = item.UnitCost,
                    TotalCost = item.Quantity * item.UnitCost,
                    BatchNumber = item.BatchNumber,
                    ExpiredDate = item.ExpiredDate
                };
                invoice.Items.Add(pItem);

                // Update product stock & HPP in database
                var prod = await db.Products.FirstOrDefaultAsync(p => p.Id == item.ProductId);
                if (prod != null)
                {
                    var stockBefore = prod.CurrentStock;
                    prod.CurrentStock += item.Quantity;
                    if (item.UnitCost > 0) prod.BuyPrice = item.UnitCost; // Update latest purchase cost

                    await db.StockMutations.AddAsync(new StockMutation
                    {
                        ProductId = prod.Id,
                        MutationType = StockMutationType.PurchaseReceived,
                        Quantity = item.Quantity,
                        StockBefore = stockBefore,
                        StockAfter = prod.CurrentStock,
                        UnitCost = item.UnitCost,
                        ReferenceNumber = invoiceNumber,
                        Notes = $"Faktur Pembelian {invoiceNumber}"
                    });

                    // Add Batch if specified
                    if (!string.IsNullOrWhiteSpace(item.BatchNumber) || item.ExpiredDate.HasValue)
                    {
                        await db.ProductBatches.AddAsync(new ProductBatch
                        {
                            ProductId = prod.Id,
                            ProductName = prod.Name,
                            Sku = prod.Sku,
                            BatchNumber = item.BatchNumber ?? $"BATCH-{DateTime.UtcNow:yyyyMMdd}",
                            ExpiredDate = item.ExpiredDate ?? DateTime.UtcNow.AddMonths(6),
                            InitialStock = item.Quantity,
                            CurrentStock = item.Quantity
                        });
                    }
                }
            }

            // Update Supplier Debt
            if (supplier != null && invoice.RemainingPayable > 0)
            {
                supplier.TotalPayable += invoice.RemainingPayable;
            }

            // Record initial payment if any
            if (dto.PaidAmount > 0)
            {
                invoice.Payments.Add(new OmniPos.Core.Entities.Purchasing.PurchasePayment
                {
                    PurchaseInvoiceId = invoice.Id,
                    Amount = dto.PaidAmount,
                    PaymentMethod = dto.PaymentMethod ?? "Kas Toko",
                    Notes = "Pembayaran DP / Lunas Awal"
                });
            }

            await db.PurchaseInvoices.AddAsync(invoice);
            await db.SaveChangesAsync();
            return Results.Ok(invoice);
        });

        app.MapPost("/api/v1/purchases/{id}/pay", async (AppDbContext db, string id, [FromBody] PayDebtDto dto) =>
        {
            var invoice = await db.PurchaseInvoices.Include(p => p.Payments).FirstOrDefaultAsync(p => p.Id == id);
            if (invoice == null) return Results.NotFound(new { message = "Faktur pembelian tidak ditemukan." });

            var payAmount = Math.Min(dto.Amount, invoice.RemainingPayable);
            invoice.PaidAmount += payAmount;
            invoice.RemainingPayable = Math.Max(0, invoice.TotalAmount - invoice.PaidAmount);
            invoice.PaymentStatus = invoice.RemainingPayable <= 0 ? OmniPos.Core.Entities.Purchasing.PurchasePaymentStatus.Paid : OmniPos.Core.Entities.Purchasing.PurchasePaymentStatus.Partial;

            var payment = new OmniPos.Core.Entities.Purchasing.PurchasePayment
            {
                PurchaseInvoiceId = invoice.Id,
                Amount = payAmount,
                PaymentMethod = dto.PaymentMethod ?? "Kas Toko",
                Notes = dto.Notes ?? "Pembayaran Cicilan/Pelunasan Hutang"
            };
            invoice.Payments.Add(payment);

            // Update supplier balance
            var supplier = await db.Suppliers.FirstOrDefaultAsync(s => s.Id == invoice.SupplierId);
            if (supplier != null)
            {
                supplier.TotalPayable = Math.Max(0, supplier.TotalPayable - payAmount);
            }

            await db.SaveChangesAsync();
            return Results.Ok(invoice);
        });

        #endregion

        #region 11. Stock Opname & Batches Endpoints

        app.MapGet("/api/v1/inventory/stock-opname", async (AppDbContext db) =>
        {
            var sessions = await db.StockOpnameSessions.Include(s => s.Items).Where(s => !s.IsDeleted).OrderByDescending(s => s.CreatedAt).ToListAsync();
            return Results.Ok(sessions);
        });

        app.MapPost("/api/v1/inventory/stock-opname", async (AppDbContext db, [FromBody] SubmitStockOpnameDto dto) =>
        {
            var sessionNumber = $"SO-{DateTime.UtcNow:yyyyMMdd}-{Guid.NewGuid().ToString("N")[..4].ToUpper()}";
            var session = new StockOpnameSession
            {
                SessionNumber = sessionNumber,
                Title = dto.Title ?? "Stock Opname Fisik",
                Status = StockOpnameStatus.Completed,
                TotalItemsAudited = dto.Items.Count,
                AuditedByUserId = dto.AuditedByUserId ?? "Admin",
                CompletedAt = DateTime.UtcNow,
                Notes = dto.Notes
            };

            decimal totalDiscrepancyQty = 0;
            decimal totalDiscrepancyValue = 0;

            foreach (var item in dto.Items)
            {
                var prod = await db.Products.FirstOrDefaultAsync(p => p.Id == item.ProductId);
                if (prod != null)
                {
                    var systemStock = prod.CurrentStock;
                    var physicalStock = item.PhysicalStock;
                    var diff = physicalStock - systemStock;
                    var diffVal = diff * prod.BuyPrice;

                    var soItem = new StockOpnameItem
                    {
                        StockOpnameSessionId = session.Id,
                        ProductId = prod.Id,
                        ProductName = prod.Name,
                        Sku = prod.Sku,
                        SystemStock = systemStock,
                        PhysicalStock = physicalStock,
                        DiscrepancyQty = diff,
                        UnitCost = prod.BuyPrice,
                        DiscrepancyValue = diffVal,
                        Notes = item.Notes
                    };
                    session.Items.Add(soItem);

                    totalDiscrepancyQty += diff;
                    totalDiscrepancyValue += diffVal;

                    // Apply physical count to database
                    prod.CurrentStock = physicalStock;

                    await db.StockMutations.AddAsync(new StockMutation
                    {
                        ProductId = prod.Id,
                        MutationType = StockMutationType.StockOpnameAdjustment,
                        Quantity = diff,
                        StockBefore = systemStock,
                        StockAfter = physicalStock,
                        UnitCost = prod.BuyPrice,
                        ReferenceNumber = sessionNumber,
                        Notes = $"Penyesuaian Hasil Audit Stock Opname {sessionNumber}"
                    });
                }
            }

            session.TotalDiscrepancyQty = totalDiscrepancyQty;
            session.TotalDiscrepancyValue = totalDiscrepancyValue;

            await db.StockOpnameSessions.AddAsync(session);
            await db.SaveChangesAsync();
            return Results.Ok(session);
        });

        app.MapGet("/api/v1/inventory/batches", async (AppDbContext db) =>
        {
            var batches = await db.ProductBatches.Where(b => !b.IsDeleted).OrderBy(b => b.ExpiredDate).ToListAsync();
            return Results.Ok(batches);
        });

        app.MapPost("/api/v1/inventory/batches", async (AppDbContext db, [FromBody] ProductBatch batch) =>
        {
            await db.ProductBatches.AddAsync(batch);
            await db.SaveChangesAsync();
            return Results.Ok(batch);
        });

        app.MapDelete("/api/v1/inventory/batches/{id}", async (AppDbContext db, string id) =>
        {
            var batch = await db.ProductBatches.FirstOrDefaultAsync(b => b.Id == id);
            if (batch != null) { batch.IsDeleted = true; await db.SaveChangesAsync(); }
            return Results.Ok(new { message = "Batch berhasil dihapus." });
        });

        #endregion

        #region 12. Promotions & Sales Returns Endpoints

        app.MapGet("/api/v1/promotions", async (AppDbContext db) =>
        {
            var list = await db.PromotionRules.Where(p => !p.IsDeleted).OrderByDescending(p => p.CreatedAt).ToListAsync();
            return Results.Ok(list);
        });

        app.MapPost("/api/v1/promotions", async (AppDbContext db, [FromBody] OmniPos.Core.Entities.Marketing.PromotionRule promo) =>
        {
            await db.PromotionRules.AddAsync(promo);
            await db.SaveChangesAsync();
            return Results.Ok(promo);
        });

        app.MapDelete("/api/v1/promotions/{id}", async (AppDbContext db, string id) =>
        {
            var promo = await db.PromotionRules.FirstOrDefaultAsync(p => p.Id == id);
            if (promo != null) { promo.IsDeleted = true; await db.SaveChangesAsync(); }
            return Results.Ok(new { message = "Promo berhasil dihapus." });
        });

        app.MapGet("/api/v1/sales/returns/find-order", async (AppDbContext db, string invoiceNumber) =>
        {
            var order = await db.Orders.Include(o => o.Items).FirstOrDefaultAsync(o => o.InvoiceNumber == invoiceNumber.Trim());
            if (order == null) return Results.NotFound(new { message = "Nota penjualan tidak ditemukan." });
            return Results.Ok(order);
        });

        app.MapGet("/api/v1/sales/returns", async (AppDbContext db) =>
        {
            var returns = await db.SalesReturns.Include(r => r.Items).Where(r => !r.IsDeleted).OrderByDescending(r => r.ReturnDate).ToListAsync();
            return Results.Ok(returns);
        });

        app.MapPost("/api/v1/sales/returns", async (AppDbContext db, [FromBody] CreateSalesReturnDto dto) =>
        {
            var returnNumber = $"RET-{DateTime.UtcNow:yyyyMMdd}-{Guid.NewGuid().ToString("N")[..4].ToUpper()}";
            var salesReturn = new OmniPos.Core.Entities.Sales.SalesReturn
            {
                ReturnNumber = returnNumber,
                OriginalInvoiceNumber = dto.OriginalInvoiceNumber,
                CustomerId = dto.CustomerId,
                CustomerName = dto.CustomerName ?? "Pelanggan",
                CashierUserId = dto.CashierUserId ?? "Kasir",
                TotalRefundAmount = dto.TotalRefundAmount,
                RefundMethod = dto.RefundMethod,
                ReturnReason = dto.ReturnReason ?? "Barang Rusak / Cacat",
                Notes = dto.Notes
            };

            foreach (var item in dto.Items)
            {
                var retItem = new OmniPos.Core.Entities.Sales.SalesReturnItem
                {
                    SalesReturnId = salesReturn.Id,
                    ProductId = item.ProductId,
                    ProductName = item.ProductName,
                    Sku = item.Sku,
                    ReturnedQuantity = item.Quantity,
                    UnitPrice = item.UnitPrice,
                    RefundAmount = item.Quantity * item.UnitPrice,
                    IsRestocked = item.IsRestocked,
                    Condition = item.Condition ?? "Bagus"
                };
                salesReturn.Items.Add(retItem);

                // If restocked to active inventory
                if (item.IsRestocked)
                {
                    var prod = await db.Products.FirstOrDefaultAsync(p => p.Id == item.ProductId);
                    if (prod != null)
                    {
                        var stockBefore = prod.CurrentStock;
                        prod.CurrentStock += item.Quantity;

                        await db.StockMutations.AddAsync(new StockMutation
                        {
                            ProductId = prod.Id,
                            MutationType = StockMutationType.SalesReturn,
                            Quantity = item.Quantity,
                            StockBefore = stockBefore,
                            StockAfter = prod.CurrentStock,
                            UnitCost = prod.BuyPrice,
                            ReferenceNumber = returnNumber,
                            Notes = $"Retur Masuk Nota {dto.OriginalInvoiceNumber}"
                        });
                    }
                }
            }

            await db.SalesReturns.AddAsync(salesReturn);
            await db.SaveChangesAsync();
            return Results.Ok(salesReturn);
        });

        #endregion

        #region 13. Advanced Retail Inventory, PO & P&L Endpoints

        // 13.1 Product Stock Ledger / Mutation History
        app.MapGet("/api/v1/inventory/products/{productId}/mutations", async (AppDbContext db, string productId) =>
        {
            var product = await db.Products.FirstOrDefaultAsync(p => p.Id == productId);
            if (product == null) return Results.NotFound(new { message = "Produk tidak ditemukan." });

            var mutations = await db.StockMutations
                .Where(m => m.ProductId == productId)
                .OrderByDescending(m => m.CreatedAt)
                .Take(100)
                .ToListAsync();

            return Results.Ok(new
            {
                product.Id,
                product.Name,
                product.Sku,
                product.CurrentStock,
                product.BuyPrice,
                product.SellPrice,
                mutations = mutations.Select(m => new
                {
                    m.Id,
                    m.CreatedAt,
                    mutationType = m.MutationType.ToString(),
                    m.Quantity,
                    m.StockBefore,
                    m.StockAfter,
                    m.UnitCost,
                    m.ReferenceNumber,
                    m.Notes
                })
            });
        });

        // 13.2 Auto-Generate PO Reorder List from Low Stock
        app.MapGet("/api/v1/purchasing/low-stock-suggested-po", async (AppDbContext db, [FromQuery] int? targetMode) =>
        {
            var mode = targetMode.HasValue ? (BusinessMode)targetMode.Value : BusinessMode.Retail;
            var lowStockProducts = await db.Products
                .Where(p => !p.IsDeleted && p.BusinessMode == mode && p.CurrentStock <= p.MinStockAlert)
                .ToListAsync();

            var suppliers = await db.Suppliers.Where(s => !s.IsDeleted).ToListAsync();
            var defaultSup = suppliers.FirstOrDefault() ?? new OmniPos.Core.Entities.Purchasing.Supplier { Id = "sup_default", Name = "Supplier Utama Toko" };

            var suggestedItems = lowStockProducts.Select(p =>
            {
                var suggestedQty = Math.Max(10, (p.MinStockAlert * 2) - p.CurrentStock);
                return new
                {
                    productId = p.Id,
                    productName = p.Name,
                    sku = p.Sku,
                    currentStock = p.CurrentStock,
                    minStockAlert = p.MinStockAlert,
                    suggestedOrderQuantity = suggestedQty,
                    unitCost = p.BuyPrice,
                    estimatedTotalCost = suggestedQty * p.BuyPrice,
                    supplierId = defaultSup.Id,
                    supplierName = defaultSup.Name
                };
            }).ToList();

            return Results.Ok(new
            {
                totalLowStockProducts = suggestedItems.Count,
                estimatedTotalInvestment = suggestedItems.Sum(i => i.estimatedTotalCost),
                items = suggestedItems
            });
        });

        // 13.3 Profit & Loss (P&L / Laba Rugi) Comprehensive Statement
        app.MapGet("/api/v1/reports/profit-and-loss", async (AppDbContext db, [FromQuery] string? start, [FromQuery] string? end) =>
        {
            var startDate = DateTime.TryParse(start, out var s) ? s.ToUniversalTime() : DateTime.UtcNow.AddDays(-30);
            var endDate = DateTime.TryParse(end, out var e) ? e.ToUniversalTime() : DateTime.UtcNow;

            var orders = await db.Orders
                .Include(o => o.Items)
                .Where(o => !o.IsVoided && o.OrderDate >= startDate && o.OrderDate <= endDate)
                .ToListAsync();

            var cashExpenses = await db.CashTransactions
                .Where(c => !c.IsCashIn && c.CreatedAt >= startDate && c.CreatedAt <= endDate)
                .ToListAsync();

            var salesReturns = await db.SalesReturns
                .Where(r => !r.IsDeleted && r.ReturnDate >= startDate && r.ReturnDate <= endDate)
                .ToListAsync();

            decimal grossSales = orders.Sum(o => o.Subtotal);
            decimal totalDiscounts = orders.Sum(o => o.DiscountAmount);
            decimal totalReturns = salesReturns.Sum(r => r.TotalRefundAmount);
            decimal netSales = grossSales - totalDiscounts - totalReturns;

            decimal totalCogs = orders.Sum(o => o.TotalCogs);
            decimal grossProfit = netSales - totalCogs;
            decimal grossMarginPercent = netSales > 0 ? Math.Round((grossProfit / netSales) * 100, 2) : 0;

            decimal totalOperatingExpenses = cashExpenses.Sum(c => c.Amount);
            decimal netOperatingIncome = grossProfit - totalOperatingExpenses;
            decimal netMarginPercent = netSales > 0 ? Math.Round((netOperatingIncome / netSales) * 100, 2) : 0;

            return Results.Ok(new
            {
                periodStart = startDate,
                periodEnd = endDate,
                grossSales,
                totalDiscounts,
                totalReturns,
                netSales,
                totalCogs,
                grossProfit,
                grossMarginPercent,
                operatingExpenses = new
                {
                    total = totalOperatingExpenses,
                    breakdown = cashExpenses.GroupBy(c => c.Category).Select(g => new
                    {
                        category = g.Key,
                        amount = g.Sum(x => x.Amount),
                        count = g.Count()
                    }).ToList()
                },
                netOperatingIncome,
                netMarginPercent
            });
        });

        // 13.4 Customer Loyalty Points (Earn / Redeem)
        app.MapPost("/api/v1/customers/{id}/points/earn", async (AppDbContext db, string id, [FromBody] int points) =>
        {
            var customer = await db.Customers.FirstOrDefaultAsync(c => c.Id == id);
            if (customer == null) return Results.NotFound(new { message = "Pelanggan tidak ditemukan." });

            customer.LoyaltyPoints += points;
            await db.CustomerPoints.AddAsync(new OmniPos.Core.Entities.CRM.CustomerPoint
            {
                CustomerId = customer.Id,
                Points = points,
                Reason = "Reward Belanja Kasir",
            });
            await db.SaveChangesAsync();
            return Results.Ok(new { customer.Id, customer.Name, customer.LoyaltyPoints });
        });

        #endregion

        #region 14. Electronics & Gadget Specific Endpoints (IMEI, Warranty, Service Center, Trade-In)

        // 14.1 Get Serial Numbers / IMEIs
        app.MapGet("/api/v1/electronics/serials", async (AppDbContext db, [FromQuery] string? productId, [FromQuery] string? status) =>
        {
            var query = db.ProductSerialNumbers.Include(s => s.Product).Where(s => !s.IsDeleted);
            if (!string.IsNullOrWhiteSpace(productId))
            {
                query = query.Where(s => s.ProductId == productId);
            }
            if (!string.IsNullOrWhiteSpace(status) && Enum.TryParse<OmniPos.Core.Entities.Electronics.SerialNumberStatus>(status, true, out var parsedStatus))
            {
                query = query.Where(s => s.Status == parsedStatus);
            }
            var list = await query.OrderByDescending(s => s.CreatedAt).ToListAsync();
            return Results.Ok(list);
        });

        // 14.2 Batch Add IMEIs / Serial Numbers
        app.MapPost("/api/v1/electronics/serials/batch-add", async (AppDbContext db, [FromBody] BatchAddSerialDto dto) =>
        {
            var product = await db.Products.FirstOrDefaultAsync(p => p.Id == dto.ProductId);
            if (product == null) return Results.NotFound(new { message = "Produk tidak ditemukan." });

            var added = new List<OmniPos.Core.Entities.Electronics.ProductSerialNumber>();
            foreach (var serial in dto.SerialNumbers)
            {
                var cleanSerial = serial.Trim();
                if (string.IsNullOrWhiteSpace(cleanSerial)) continue;

                var exists = await db.ProductSerialNumbers.AnyAsync(s => s.SerialNo == cleanSerial && !s.IsDeleted);
                if (exists) continue; // Skip duplicate serial

                var item = new OmniPos.Core.Entities.Electronics.ProductSerialNumber
                {
                    ProductId = product.Id,
                    ProductName = product.Name,
                    Sku = product.Sku,
                    SerialNo = cleanSerial,
                    Status = OmniPos.Core.Entities.Electronics.SerialNumberStatus.Available,
                    SupplierName = dto.SupplierName,
                    PurchaseInvoiceNumber = dto.PurchaseInvoiceNumber,
                    WarrantyMonths = dto.WarrantyMonths > 0 ? dto.WarrantyMonths : 12,
                    WarrantyNotes = dto.WarrantyNotes ?? "Garansi Resmi 1 Tahun"
                };
                added.Add(item);
                await db.ProductSerialNumbers.AddAsync(item);
            }

            // Sync product current stock
            product.CurrentStock += added.Count;
            await db.SaveChangesAsync();

            return Results.Ok(new { count = added.Count, message = $"{added.Count} IMEI / Serial Number berhasil didaftarkan ke inventori!" });
        });

        // 14.3 Search IMEI / Serial Number & Warranty Check
        app.MapGet("/api/v1/electronics/serials/search/{query}", async (AppDbContext db, string query) =>
        {
            var clean = query.Trim();
            var serial = await db.ProductSerialNumbers
                .Include(s => s.Product)
                .FirstOrDefaultAsync(s => s.SerialNo.ToLower() == clean.ToLower() && !s.IsDeleted);

            if (serial == null) return Results.NotFound(new { message = "IMEI / Serial Number tidak ditemukan dalam database." });

            var isWarrantyActive = serial.WarrantyEndDate.HasValue && serial.WarrantyEndDate.Value >= DateTime.UtcNow;

            return Results.Ok(new
            {
                serial.Id,
                serial.SerialNo,
                serial.ProductId,
                serial.ProductName,
                serial.Sku,
                status = serial.Status.ToString(),
                serial.SupplierName,
                serial.PurchaseInvoiceNumber,
                serial.SoldInvoiceNumber,
                serial.SoldDate,
                serial.CustomerName,
                serial.CustomerPhone,
                serial.WarrantyMonths,
                serial.WarrantyEndDate,
                serial.WarrantyNotes,
                isWarrantyActive,
                remainingWarrantyDays = serial.WarrantyEndDate.HasValue ? Math.Max(0, (int)(serial.WarrantyEndDate.Value - DateTime.UtcNow).TotalDays) : 0
            });
        });

        // 14.4 Service Center - List Tickets
        app.MapGet("/api/v1/electronics/services", async (AppDbContext db, [FromQuery] string? status) =>
        {
            var query = db.DeviceServiceTickets.Include(t => t.Items).Where(t => !t.IsDeleted);
            if (!string.IsNullOrWhiteSpace(status) && Enum.TryParse<OmniPos.Core.Entities.Electronics.DeviceServiceStatus>(status, true, out var parsedStatus))
            {
                query = query.Where(t => t.Status == parsedStatus);
            }
            var list = await query.OrderByDescending(t => t.ReceivedDate).ToListAsync();
            return Results.Ok(list);
        });

        // 14.5 Service Center - Create Service Ticket (SPK)
        app.MapPost("/api/v1/electronics/services", async (AppDbContext db, [FromBody] CreateServiceTicketDto dto) =>
        {
            var ticketNumber = $"SRV-{DateTime.UtcNow:yyyyMMdd}-{Guid.NewGuid().ToString("N")[..4].ToUpper()}";
            var ticket = new OmniPos.Core.Entities.Electronics.DeviceServiceTicket
            {
                TicketNumber = ticketNumber,
                CustomerName = dto.CustomerName.Trim(),
                CustomerPhone = dto.CustomerPhone.Trim(),
                CustomerEmail = dto.CustomerEmail,
                CustomerAddress = dto.CustomerAddress,
                DeviceType = dto.DeviceType ?? "Smartphone",
                BrandAndModel = dto.BrandAndModel.Trim(),
                ImeiOrSerial = dto.ImeiOrSerial,
                DeviceColor = dto.DeviceColor,
                PasscodeOrPattern = dto.PasscodeOrPattern,
                ProblemDescription = dto.ProblemDescription.Trim(),
                PhysicalCondition = dto.PhysicalCondition ?? "Lecet Pemakaian Wajar",
                AccessoriesIncluded = dto.AccessoriesIncluded ?? "Unit Only",
                EstimatedCost = dto.EstimatedCost,
                DownPayment = dto.DownPayment,
                FinalCost = dto.EstimatedCost,
                RemainingBalance = Math.Max(0, dto.EstimatedCost - dto.DownPayment),
                Status = OmniPos.Core.Entities.Electronics.DeviceServiceStatus.Received,
                AssignedTechnicianName = dto.AssignedTechnicianName ?? "Teknisi Utama",
                TechnicianNotes = dto.TechnicianNotes,
                WarrantyDaysGiven = dto.WarrantyDaysGiven > 0 ? dto.WarrantyDaysGiven : 30
            };

            await db.DeviceServiceTickets.AddAsync(ticket);
            await db.SaveChangesAsync();
            return Results.Ok(ticket);
        });

        // 14.6 Service Center - Update Status & Technician Notes
        app.MapPut("/api/v1/electronics/services/{id}/status", async (AppDbContext db, string id, [FromBody] UpdateServiceStatusDto dto) =>
        {
            var ticket = await db.DeviceServiceTickets.Include(t => t.Items).FirstOrDefaultAsync(t => t.Id == id);
            if (ticket == null) return Results.NotFound(new { message = "Tiket servis tidak ditemukan." });

            ticket.Status = dto.Status;
            if (!string.IsNullOrWhiteSpace(dto.TechnicianNotes)) ticket.TechnicianNotes = dto.TechnicianNotes;
            if (!string.IsNullOrWhiteSpace(dto.AssignedTechnicianName)) ticket.AssignedTechnicianName = dto.AssignedTechnicianName;
            if (dto.FinalCost.HasValue)
            {
                ticket.FinalCost = dto.FinalCost.Value;
                ticket.RemainingBalance = Math.Max(0, ticket.FinalCost - ticket.DownPayment);
            }
            if (dto.Status == OmniPos.Core.Entities.Electronics.DeviceServiceStatus.CompletedReadyForPickup)
            {
                ticket.CompletedDate = DateTime.UtcNow;
            }
            else if (dto.Status == OmniPos.Core.Entities.Electronics.DeviceServiceStatus.PickedUpAndPaid)
            {
                ticket.PickedUpDate = DateTime.UtcNow;
                ticket.RemainingBalance = 0;
            }

            await db.SaveChangesAsync();
            return Results.Ok(ticket);
        });

        app.MapPut("/api/v1/electronics/services/{id}/action", async (AppDbContext db, string id, [FromBody] UpdateServiceStatusDto dto) =>
        {
            var ticket = await db.DeviceServiceTickets.Include(t => t.Items).FirstOrDefaultAsync(t => t.Id == id);
            if (ticket == null) return Results.NotFound(new { message = "Tiket servis tidak ditemukan." });

            ticket.Status = dto.Status;
            if (!string.IsNullOrWhiteSpace(dto.TechnicianNotes)) ticket.TechnicianNotes = dto.TechnicianNotes;
            if (!string.IsNullOrWhiteSpace(dto.AssignedTechnicianName)) ticket.AssignedTechnicianName = dto.AssignedTechnicianName;
            if (dto.FinalCost.HasValue)
            {
                ticket.FinalCost = dto.FinalCost.Value;
                ticket.RemainingBalance = Math.Max(0, ticket.FinalCost - ticket.DownPayment);
            }
            if (dto.Status == OmniPos.Core.Entities.Electronics.DeviceServiceStatus.CompletedReadyForPickup)
            {
                ticket.CompletedDate = DateTime.UtcNow;
            }
            else if (dto.Status == OmniPos.Core.Entities.Electronics.DeviceServiceStatus.PickedUpAndPaid)
            {
                ticket.PickedUpDate = DateTime.UtcNow;
                ticket.RemainingBalance = 0;
            }

            await db.SaveChangesAsync();
            return Results.Ok(ticket);
        });

        // 14.7 Service Center - Add Item / Sparepart
        app.MapPost("/api/v1/electronics/services/{id}/items", async (AppDbContext db, string id, [FromBody] AddServiceItemDto dto) =>
        {
            var ticket = await db.DeviceServiceTickets.Include(t => t.Items).FirstOrDefaultAsync(t => t.Id == id);
            if (ticket == null) return Results.NotFound(new { message = "Tiket servis tidak ditemukan." });

            var item = new OmniPos.Core.Entities.Electronics.DeviceServiceItem
            {
                DeviceServiceTicketId = ticket.Id,
                ItemType = dto.ItemType,
                ProductId = dto.ProductId,
                Name = dto.Name,
                Quantity = dto.Quantity,
                UnitPrice = dto.UnitPrice,
                TotalPrice = dto.Quantity * dto.UnitPrice
            };
            ticket.Items.Add(item);

            // Recalculate ticket final cost
            ticket.FinalCost = ticket.Items.Sum(i => i.TotalPrice);
            ticket.RemainingBalance = Math.Max(0, ticket.FinalCost - ticket.DownPayment);

            // Deduct sparepart from inventory if productId is linked
            if (!string.IsNullOrWhiteSpace(dto.ProductId))
            {
                var prod = await db.Products.FirstOrDefaultAsync(p => p.Id == dto.ProductId);
                if (prod != null)
                {
                    prod.CurrentStock = Math.Max(0, prod.CurrentStock - dto.Quantity);
                }
            }

            await db.SaveChangesAsync();
            return Results.Ok(ticket);
        });

        // 14.8 Trade-In / Tukar Tambah
        app.MapGet("/api/v1/electronics/trade-in", async (AppDbContext db) =>
        {
            var list = await db.TradeInTransactions.OrderByDescending(t => t.TransactionDate).ToListAsync();
            return Results.Ok(list);
        });

        app.MapPost("/api/v1/electronics/trade-in", async (AppDbContext db, [FromBody] CreateTradeInDto dto) =>
        {
            var tradeInNumber = $"TRD-{DateTime.UtcNow:yyyyMMdd}-{Guid.NewGuid().ToString("N")[..4].ToUpper()}";
            var tradeIn = new OmniPos.Core.Entities.Electronics.TradeInTransaction
            {
                TradeInNumber = tradeInNumber,
                CustomerName = dto.CustomerName.Trim(),
                CustomerPhone = dto.CustomerPhone.Trim(),
                DeviceBrandModel = dto.DeviceBrandModel.Trim(),
                ImeiOrSerial = dto.ImeiOrSerial,
                ConditionGrade = dto.ConditionGrade ?? "Grade A",
                FunctionalNotes = dto.FunctionalNotes ?? "Fungsi normal",
                AccessoriesIncluded = dto.AccessoriesIncluded ?? "Unit Only",
                ValuationAmount = dto.ValuationAmount,
                ReceivedByUserId = dto.ReceivedByUserId ?? "Kasir",
                NewInvoiceNumber = dto.NewInvoiceNumber
            };

            await db.TradeInTransactions.AddAsync(tradeIn);
            await db.SaveChangesAsync();
            return Results.Ok(tradeIn);
        });

        // 14.9 SIM Cards & Special Numbers (Nomor Cantik)
        app.MapGet("/api/v1/electronics/sim-cards", async (
            AppDbContext db,
            [FromQuery] string? provider,
            [FromQuery] string? patternTier,
            [FromQuery] string? status,
            [FromQuery] string? search) =>
        {
            var query = db.SimCardSpecialNumbers.AsQueryable();

            if (!string.IsNullOrWhiteSpace(provider) && provider != "ALL")
                query = query.Where(s => s.Provider == provider);

            if (!string.IsNullOrWhiteSpace(patternTier) && patternTier != "ALL")
                query = query.Where(s => s.PatternTier == patternTier);

            if (!string.IsNullOrWhiteSpace(status) && status != "ALL")
            {
                if (Enum.TryParse<OmniPos.Core.Entities.Electronics.SimCardStatus>(status, true, out var stEnum))
                    query = query.Where(s => s.Status == stEnum);
            }

            if (!string.IsNullOrWhiteSpace(search))
            {
                var q = search.Trim().ToLower();
                query = query.Where(s => s.Msisdn.ToLower().Contains(q) || 
                                         (s.Iccid != null && s.Iccid.ToLower().Contains(q)) || 
                                         s.Provider.ToLower().Contains(q) ||
                                         s.PatternTier.ToLower().Contains(q));
            }

            var rawList = await query.ToListAsync();
            var list = rawList.OrderBy(s => s.Status).ThenByDescending(s => s.SellPrice).ToList();
            return Results.Ok(list);
        });

        app.MapGet("/api/v1/electronics/sim-cards/{id}", async (AppDbContext db, string id) =>
        {
            var item = await db.SimCardSpecialNumbers.FirstOrDefaultAsync(s => s.Id == id);
            return item != null ? Results.Ok(item) : Results.NotFound();
        });

        app.MapPost("/api/v1/electronics/sim-cards", async (AppDbContext db, [FromBody] CreateSimCardDto dto) =>
        {
            var cleanMsisdn = dto.Msisdn.Trim();
            var exists = await db.SimCardSpecialNumbers.AnyAsync(s => s.Msisdn == cleanMsisdn);
            if (exists)
                return Results.BadRequest(new { message = $"Nomor {cleanMsisdn} sudah terdaftar di sistem!" });

            var item = new OmniPos.Core.Entities.Electronics.SimCardSpecialNumber
            {
                Msisdn = cleanMsisdn,
                Provider = dto.Provider?.Trim() ?? "Telkomsel",
                PatternTier = dto.PatternTier?.Trim() ?? "Reguler Cantik",
                Iccid = dto.Iccid?.Trim(),
                DefaultQuotaGb = dto.DefaultQuotaGb?.Trim() ?? "10GB",
                MainBalance = dto.MainBalance,
                ExpiryDate = dto.ExpiryDate ?? DateTime.UtcNow.AddMonths(3),
                BuyPrice = dto.BuyPrice,
                SellPrice = dto.SellPrice,
                Status = OmniPos.Core.Entities.Electronics.SimCardStatus.Available,
                Notes = dto.Notes?.Trim()
            };

            await db.SimCardSpecialNumbers.AddAsync(item);
            await db.SaveChangesAsync();
            return Results.Ok(item);
        });

        app.MapPost("/api/v1/electronics/sim-cards/batch-import", async (AppDbContext db, [FromBody] BatchImportSimCardDto dto) =>
        {
            if (dto.Items == null || dto.Items.Count == 0)
                return Results.BadRequest(new { message = "Tidak ada nomor kartu yang dikirim." });

            var inserted = new List<OmniPos.Core.Entities.Electronics.SimCardSpecialNumber>();
            foreach (var itemDto in dto.Items)
            {
                var clean = itemDto.Msisdn?.Trim();
                if (string.IsNullOrWhiteSpace(clean)) continue;

                var exists = await db.SimCardSpecialNumbers.AnyAsync(s => s.Msisdn == clean);
                if (exists) continue;

                var sim = new OmniPos.Core.Entities.Electronics.SimCardSpecialNumber
                {
                    Msisdn = clean,
                    Provider = itemDto.Provider?.Trim() ?? "Telkomsel",
                    PatternTier = itemDto.PatternTier?.Trim() ?? "Reguler Cantik",
                    Iccid = itemDto.Iccid?.Trim(),
                    DefaultQuotaGb = itemDto.DefaultQuotaGb?.Trim() ?? "10GB",
                    MainBalance = itemDto.MainBalance,
                    ExpiryDate = itemDto.ExpiryDate ?? DateTime.UtcNow.AddMonths(3),
                    BuyPrice = itemDto.BuyPrice,
                    SellPrice = itemDto.SellPrice,
                    Status = OmniPos.Core.Entities.Electronics.SimCardStatus.Available,
                    Notes = itemDto.Notes?.Trim()
                };
                inserted.Add(sim);
            }

            if (inserted.Count > 0)
            {
                await db.SimCardSpecialNumbers.AddRangeAsync(inserted);
                await db.SaveChangesAsync();
            }

            return Results.Ok(new { message = $"{inserted.Count} nomor perdana / kartu cantik berhasil didaftarkan!", count = inserted.Count });
        });

        app.MapPut("/api/v1/electronics/sim-cards/{id}", async (AppDbContext db, string id, [FromBody] UpdateSimCardDto dto) =>
        {
            var item = await db.SimCardSpecialNumbers.FirstOrDefaultAsync(s => s.Id == id);
            if (item == null) return Results.NotFound();

            if (!string.IsNullOrWhiteSpace(dto.Provider)) item.Provider = dto.Provider.Trim();
            if (!string.IsNullOrWhiteSpace(dto.PatternTier)) item.PatternTier = dto.PatternTier.Trim();
            if (dto.Iccid != null) item.Iccid = dto.Iccid.Trim();
            if (dto.DefaultQuotaGb != null) item.DefaultQuotaGb = dto.DefaultQuotaGb.Trim();
            if (dto.MainBalance.HasValue) item.MainBalance = dto.MainBalance.Value;
            if (dto.ExpiryDate.HasValue) item.ExpiryDate = dto.ExpiryDate.Value;
            if (dto.BuyPrice.HasValue) item.BuyPrice = dto.BuyPrice.Value;
            if (dto.SellPrice.HasValue) item.SellPrice = dto.SellPrice.Value;
            if (dto.Status.HasValue) item.Status = dto.Status.Value;
            if (dto.CustomerName != null) item.CustomerName = dto.CustomerName.Trim();
            if (dto.CustomerPhone != null) item.CustomerPhone = dto.CustomerPhone.Trim();
            if (dto.CustomerNik != null) item.CustomerNik = dto.CustomerNik.Trim();
            if (dto.Notes != null) item.Notes = dto.Notes.Trim();

            await db.SaveChangesAsync();
            return Results.Ok(item);
        });

        app.MapPut("/api/v1/electronics/sim-cards/{id}/reserve", async (AppDbContext db, string id, [FromBody] ReserveSimCardDto dto) =>
        {
            var item = await db.SimCardSpecialNumbers.FirstOrDefaultAsync(s => s.Id == id);
            if (item == null) return Results.NotFound();

            item.Status = OmniPos.Core.Entities.Electronics.SimCardStatus.ReservedBooking;
            item.CustomerName = dto.CustomerName.Trim();
            item.CustomerPhone = dto.CustomerPhone.Trim();
            if (!string.IsNullOrWhiteSpace(dto.Notes))
                item.Notes = (item.Notes != null ? item.Notes + " | " : "") + "Booking: " + dto.Notes.Trim();

            await db.SaveChangesAsync();
            return Results.Ok(item);
        });

        #endregion

        return app;
    }

    public static async Task Main(string[] args)
    {
        int port = 5000;
        for (int i = 0; i < args.Length; i++)
        {
            var arg = args[i];
            if (arg.StartsWith("--port=", StringComparison.OrdinalIgnoreCase) && int.TryParse(arg.Substring("--port=".Length).Trim(), out var pVal))
                port = pVal;
            else if ((arg.Equals("--port", StringComparison.OrdinalIgnoreCase) || arg.Equals("-p", StringComparison.OrdinalIgnoreCase)) && i + 1 < args.Length && int.TryParse(args[i + 1], out var pVal2))
                port = pVal2;
        }

        var app = await BuildAsync(args, port);
        await app.RunAsync();
    }
}

public record QrisGenerateRequest(decimal Amount, string InvoiceNumber);
public record TableStatusUpdateRequest(TableStatus Status);
public record InitialAdminSetupDto(string FullName, string Username, string Password, string PinCode, string? StoreName, string? StoreAddress, string? StorePhone);
public record LoginRequestDto(string? Username, string? Password, string? PinCode, string? UserId = null);
public record CreateUserDto(string FullName, string Username, string Password, string PinCode, UserRole Role, bool IsActive = true);
public record UpdateUserDto(string FullName, UserRole Role, bool IsActive, string? NewPassword, string? NewPinCode);

public record CreatePurchaseItemDto(string ProductId, string ProductName, string Sku, decimal Quantity, decimal UnitCost, string? BatchNumber, DateTime? ExpiredDate);
public record CreatePurchaseInvoiceDto(string? SupplierId, string? SupplierName, string? ReferenceNumber, DateTime? PurchaseDate, decimal TotalAmount, decimal PaidAmount, DateTime? DueDate, string? PaymentMethod, string? Notes, List<CreatePurchaseItemDto> Items);
public record PayDebtDto(decimal Amount, string? PaymentMethod, string? Notes);

public record StockOpnameItemInputDto(string ProductId, decimal PhysicalStock, string? Notes);
public record SubmitStockOpnameDto(string? Title, string? AuditedByUserId, string? Notes, List<StockOpnameItemInputDto> Items);

public record CreateSalesReturnItemDto(string ProductId, string ProductName, string Sku, decimal Quantity, decimal UnitPrice, bool IsRestocked, string? Condition);
public record CreateSalesReturnDto(string OriginalInvoiceNumber, string? CustomerId, string? CustomerName, string? CashierUserId, decimal TotalRefundAmount, OmniPos.Core.Entities.Sales.ReturnRefundMethod RefundMethod, string? ReturnReason, string? Notes, List<CreateSalesReturnItemDto> Items);
public record ImportCsvDto(string CsvContent);

public record BatchAddSerialDto(string ProductId, List<string> SerialNumbers, string? SupplierName, string? PurchaseInvoiceNumber, int WarrantyMonths = 12, string? WarrantyNotes = null);
public record CreateServiceTicketDto(string CustomerName, string CustomerPhone, string? CustomerEmail, string? CustomerAddress, string? DeviceType, string BrandAndModel, string? ImeiOrSerial, string? DeviceColor, string? PasscodeOrPattern, string ProblemDescription, string? PhysicalCondition, string? AccessoriesIncluded, decimal EstimatedCost, decimal DownPayment, string? AssignedTechnicianName, string? TechnicianNotes, int WarrantyDaysGiven = 30);
public record UpdateServiceStatusDto(OmniPos.Core.Entities.Electronics.DeviceServiceStatus Status, string? TechnicianNotes, string? AssignedTechnicianName, decimal? FinalCost);
public record AddServiceItemDto(OmniPos.Core.Entities.Electronics.ServiceItemType ItemType, string? ProductId, string Name, decimal Quantity, decimal UnitPrice);
public record CreateTradeInDto(string CustomerName, string CustomerPhone, string DeviceBrandModel, string? ImeiOrSerial, string? ConditionGrade, string? FunctionalNotes, string? AccessoriesIncluded, decimal ValuationAmount, string? ReceivedByUserId, string? NewInvoiceNumber);

public record CreateSimCardDto(string Msisdn, string? Provider, string? PatternTier, string? Iccid, string? DefaultQuotaGb, decimal MainBalance, DateTime? ExpiryDate, decimal BuyPrice, decimal SellPrice, string? Notes);
public record BatchImportSimCardDto(List<CreateSimCardDto> Items);
public record UpdateSimCardDto(string? Provider, string? PatternTier, string? Iccid, string? DefaultQuotaGb, decimal? MainBalance, DateTime? ExpiryDate, decimal? BuyPrice, decimal? SellPrice, OmniPos.Core.Entities.Electronics.SimCardStatus? Status, string? CustomerName, string? CustomerPhone, string? CustomerNik, string? Notes);
public record ReserveSimCardDto(string CustomerName, string CustomerPhone, string? Notes);
public record SwitchEditionDto(string Edition);


