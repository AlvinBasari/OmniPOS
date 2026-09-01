using Microsoft.EntityFrameworkCore;
using OmniPos.Core.Entities.CRM;
using OmniPos.Core.Entities.Finance;
using OmniPos.Core.Entities.Identity;
using OmniPos.Core.Entities.Products;
using OmniPos.Core.Entities.Tables;
using OmniPos.Core.Enums;
using OmniPos.Infrastructure.Services.Security;

namespace OmniPos.Infrastructure.Data.Seeders;

public static class DatabaseSeeder
{
    public static async Task SeedAsync(AppDbContext context, BusinessMode targetMode = BusinessMode.Retail)
    {
        await EnsureTablesCreatedSafelyAsync(context);

        // 1. Users are registered on first-time setup wizard by the store owner

        // 2. Seed Default Settings based on target BusinessMode
        if (!await context.AppSettings.AnyAsync())
        {
            string storeName = targetMode switch
            {
                BusinessMode.FoodAndBeverage => "OmniPOS Resto & Cafe Nusantara",
                BusinessMode.Services => "OmniPOS Layanan Barbershop & Laundry",
                BusinessMode.Pharmacy => "OmniPOS Apotek & Farmasi Sehat",
                BusinessMode.Electronics => "OmniPOS Gadget & Elektronik Mart",
                _ => "OmniPOS Retail & Minimarket Sejahtera"
            };

            var settings = new List<AppSetting>
            {
                new() { SettingKey = "STORE_NAME", SettingValue = storeName },
                new() { SettingKey = "STORE_ADDRESS", SettingValue = "Jl. Sudirman No. 88, Jakarta Pusat" },
                new() { SettingKey = "STORE_PHONE", SettingValue = "0812-9876-5432" },
                new() { SettingKey = "BUSINESS_MODE", SettingValue = targetMode.ToString() },
                new() { SettingKey = "PAPER_SIZE", SettingValue = "80mm" },
                new() { SettingKey = "THEME_PRESET", SettingValue = "modern-light" },
                new() { SettingKey = "TAX_PERCENTAGE", SettingValue = targetMode == BusinessMode.FoodAndBeverage ? "10" : "11" },
                new() { SettingKey = "SERVICE_CHARGE_PERCENTAGE", SettingValue = "0" },
                new() { SettingKey = "ENABLE_ROUNDING", SettingValue = "true" },
                new() { SettingKey = "BACKUP_MASTER_KEY", SettingValue = "OmniPOS-Secure-Vault-Key-2026" },
                new() { SettingKey = "PRINTER_TYPE", SettingValue = "VIRTUAL" }
            };
            await context.AppSettings.AddRangeAsync(settings);
        }

        // 3. Seed Chart of Accounts (COA)
        if (!await context.Accounts.AnyAsync())
        {
            var accounts = new List<Account>
            {
                new() { AccountCode = "1001", AccountName = "Kas di Laci (Cash Float)", Type = AccountType.Asset },
                new() { AccountCode = "1002", AccountName = "Bank & QRIS Clearing", Type = AccountType.Asset },
                new() { AccountCode = "1003", AccountName = "Piutang Pelanggan (Kasbon)", Type = AccountType.Asset },
                new() { AccountCode = "1004", AccountName = "Persediaan Barang Dagang", Type = AccountType.Asset },
                new() { AccountCode = "2001", AccountName = "Hutang Usaha Supplier", Type = AccountType.Liability },
                new() { AccountCode = "3001", AccountName = "Modal Pemilik", Type = AccountType.Equity },
                new() { AccountCode = "4001", AccountName = "Pendapatan Penjualan", Type = AccountType.Revenue },
                new() { AccountCode = "5001", AccountName = "Harga Pokok Penjualan (HPP)", Type = AccountType.CostOfGoodsSold },
                new() { AccountCode = "6001", AccountName = "Beban Kas Kecil Operasional", Type = AccountType.Expense }
            };
            await context.Accounts.AddRangeAsync(accounts);
        }

        // 4. Seed Categories & Products specific to Target Business Mode
        if (!await context.Categories.AnyAsync(c => c.BusinessMode == targetMode && !c.IsDeleted))
        {
            if (targetMode == BusinessMode.FoodAndBeverage)
            {
                var catCoffee = new Category { Name = "Coffee & Espresso", IconName = "Coffee", SortOrder = 1, BusinessMode = BusinessMode.FoodAndBeverage };
                var catNonCoffee = new Category { Name = "Non-Coffee & Tea", IconName = "CupSoda", SortOrder = 2, BusinessMode = BusinessMode.FoodAndBeverage };
                var catFood = new Category { Name = "Food & Meals", IconName = "Utensils", SortOrder = 3, BusinessMode = BusinessMode.FoodAndBeverage };
                var catBakery = new Category { Name = "Pastry & Bakery", IconName = "Cake", SortOrder = 4, BusinessMode = BusinessMode.FoodAndBeverage };

                await context.Categories.AddRangeAsync(catCoffee, catNonCoffee, catFood, catBakery);
                await context.SaveChangesAsync();

                var modSugar = new ModifierGroup
                {
                    Name = "Tingkat Gula",
                    IsRequired = false,
                    MaxSelections = 1,
                    Options = new List<ModifierOption>
                    {
                        new() { Name = "Normal Sugar", Price = 0 },
                        new() { Name = "Less Sugar (50%)", Price = 0 },
                        new() { Name = "No Sugar (0%)", Price = 0 }
                    }
                };

                var modAddons = new ModifierGroup
                {
                    Name = "Extra Topping",
                    IsRequired = false,
                    MaxSelections = 3,
                    Options = new List<ModifierOption>
                    {
                        new() { Name = "Extra Espresso Shot", Price = 5000, Cost = 2000 },
                        new() { Name = "Oat Milk Upgrade", Price = 8000, Cost = 3500 },
                        new() { Name = "Caramel Drizzle", Price = 4000, Cost = 1000 }
                    }
                };

                await context.ModifierGroups.AddRangeAsync(modSugar, modAddons);
                await context.SaveChangesAsync();

                var products = new List<Product>
                {
                    new() { Sku = "COF-001", Barcode = "899001", Name = "Kopi Susu Gula Aren", CategoryId = catCoffee.Id, BusinessMode = BusinessMode.FoodAndBeverage, BuyPrice = 8000, SellPrice = 22000, CurrentStock = 100, Unit = "CUP", IsKitchenItem = true, KitchenStation = "BAR" },
                    new() { Sku = "COF-002", Barcode = "899002", Name = "Espresso Single Shot", CategoryId = catCoffee.Id, BusinessMode = BusinessMode.FoodAndBeverage, BuyPrice = 5000, SellPrice = 18000, CurrentStock = 120, Unit = "CUP", IsKitchenItem = true, KitchenStation = "BAR" },
                    new() { Sku = "COF-003", Barcode = "899003", Name = "Caffe Latte", CategoryId = catCoffee.Id, BusinessMode = BusinessMode.FoodAndBeverage, BuyPrice = 9000, SellPrice = 28000, CurrentStock = 85, Unit = "CUP", IsKitchenItem = true, KitchenStation = "BAR" },
                    new() { Sku = "TEA-001", Barcode = "899004", Name = "Matcha Green Tea Latte", CategoryId = catNonCoffee.Id, BusinessMode = BusinessMode.FoodAndBeverage, BuyPrice = 10000, SellPrice = 30000, CurrentStock = 60, Unit = "CUP", IsKitchenItem = true, KitchenStation = "BAR" },
                    new() { Sku = "FOD-001", Barcode = "899005", Name = "Nasi Goreng Spesial", CategoryId = catFood.Id, BusinessMode = BusinessMode.FoodAndBeverage, BuyPrice = 15000, SellPrice = 35000, CurrentStock = 45, Unit = "PORSI", IsKitchenItem = true, KitchenStation = "KITCHEN" },
                    new() { Sku = "FOD-002", Barcode = "899006", Name = "Mie Ayam Bakso", CategoryId = catFood.Id, BusinessMode = BusinessMode.FoodAndBeverage, BuyPrice = 12000, SellPrice = 28000, CurrentStock = 50, Unit = "PORSI", IsKitchenItem = true, KitchenStation = "KITCHEN" },
                    new() { Sku = "BAK-001", Barcode = "899007", Name = "Croissant Butter", CategoryId = catBakery.Id, BusinessMode = BusinessMode.FoodAndBeverage, BuyPrice = 11000, SellPrice = 25000, CurrentStock = 25, Unit = "PCS", IsKitchenItem = false }
                };
                await context.Products.AddRangeAsync(products);
            }
            else if (targetMode == BusinessMode.Services)
            {
                var catBarber = new Category { Name = "Barbershop & Pangkas", IconName = "Scissors", SortOrder = 1, BusinessMode = BusinessMode.Services };
                var catLaundry = new Category { Name = "Laundry Kiloan & Satuan", IconName = "Sparkles", SortOrder = 2, BusinessMode = BusinessMode.Services };

                await context.Categories.AddRangeAsync(catBarber, catLaundry);
                await context.SaveChangesAsync();

                var products = new List<Product>
                {
                    new() { Sku = "SRV-001", Name = "Gentlemen Haircut + Cuci Rambut", CategoryId = catBarber.Id, BusinessMode = BusinessMode.Services, BuyPrice = 10000, SellPrice = 45000, CurrentStock = 999, Unit = "ORANG", IsKitchenItem = false },
                    new() { Sku = "SRV-002", Name = "Pewarnaan / Hair Coloring Premium", CategoryId = catBarber.Id, BusinessMode = BusinessMode.Services, BuyPrice = 35000, SellPrice = 120000, CurrentStock = 999, Unit = "ORANG", IsKitchenItem = false },
                    new() { Sku = "LND-001", Name = "Cuci Kering Setrika Kilat (1 Hari)", CategoryId = catLaundry.Id, BusinessMode = BusinessMode.Services, BuyPrice = 3000, SellPrice = 10000, CurrentStock = 999, Unit = "KG", IsKitchenItem = false },
                    new() { Sku = "LND-002", Name = "Cuci Bedcover Besar / Sprei", CategoryId = catLaundry.Id, BusinessMode = BusinessMode.Services, BuyPrice = 8000, SellPrice = 30000, CurrentStock = 999, Unit = "PCS", IsKitchenItem = false }
                };
                await context.Products.AddRangeAsync(products);
            }
            else if (targetMode == BusinessMode.Pharmacy)
            {
                var catObatBebas = new Category { Name = "Obat Bebas & Vitamin", IconName = "Pill", SortOrder = 1, BusinessMode = BusinessMode.Pharmacy };
                var catObatResep = new Category { Name = "Obat Resep & Terbatas", IconName = "FileText", SortOrder = 2, BusinessMode = BusinessMode.Pharmacy };

                await context.Categories.AddRangeAsync(catObatBebas, catObatResep);
                await context.SaveChangesAsync();

                var products = new List<Product>
                {
                    new() { Sku = "FAR-001", Barcode = "8992001", Name = "Paracetamol 500mg Strip (10 Tablet)", CategoryId = catObatBebas.Id, BusinessMode = BusinessMode.Pharmacy, BuyPrice = 3500, SellPrice = 6000, CurrentStock = 150, Unit = "STRIP", IsKitchenItem = false },
                    new() { Sku = "FAR-002", Barcode = "8992002", Name = "Vitamin C 500mg IPI (Isi 45 Tablet)", CategoryId = catObatBebas.Id, BusinessMode = BusinessMode.Pharmacy, BuyPrice = 6000, SellPrice = 9500, CurrentStock = 80, Unit = "BOTOL", IsKitchenItem = false },
                    new() { Sku = "FAR-003", Barcode = "8992003", Name = "Betadine Antiseptik Cair 30ml", CategoryId = catObatBebas.Id, BusinessMode = BusinessMode.Pharmacy, BuyPrice = 16000, SellPrice = 21000, CurrentStock = 45, Unit = "BOTOL", IsKitchenItem = false },
                    new() { Sku = "FAR-004", Barcode = "8992004", Name = "Amoxicillin 500mg (Batch AMX-2026)", CategoryId = catObatResep.Id, BusinessMode = BusinessMode.Pharmacy, BuyPrice = 7000, SellPrice = 12000, CurrentStock = 90, Unit = "STRIP", IsKitchenItem = false }
                };
                await context.Products.AddRangeAsync(products);
            }
            else if (targetMode == BusinessMode.Electronics)
            {
                var catGadget = new Category { Name = "Smartphone & Gadget (IMEI)", IconName = "Smartphone", SortOrder = 1, BusinessMode = BusinessMode.Electronics };
                var catLaptop = new Category { Name = "Laptop & PC (Serial)", IconName = "Laptop", SortOrder = 2, BusinessMode = BusinessMode.Electronics };
                var catAksesoris = new Category { Name = "Aksesoris & Audio", IconName = "Headphones", SortOrder = 3, BusinessMode = BusinessMode.Electronics };
                var catSparepart = new Category { Name = "Sparepart & Jasa Servis", IconName = "Wrench", SortOrder = 4, BusinessMode = BusinessMode.Electronics };
                var catPerdana = new Category { Name = "Kartu Perdana & Voucher Data", IconName = "Radio", SortOrder = 5, BusinessMode = BusinessMode.Electronics };

                await context.Categories.AddRangeAsync(catGadget, catLaptop, catAksesoris, catSparepart, catPerdana);
                await context.SaveChangesAsync();

                var pSamsungS24 = new Product { Sku = "GDT-001", Barcode = "8993001", Name = "Samsung Galaxy S24 Ultra 12/256GB (Garansi Resmi SEIN)", CategoryId = catGadget.Id, BusinessMode = BusinessMode.Electronics, BuyPrice = 18200000, SellPrice = 20999000, CurrentStock = 8, Unit = "UNIT", IsKitchenItem = false };
                var pIphone15 = new Product { Sku = "GDT-002", Barcode = "8993002", Name = "Apple iPhone 15 Pro 128GB Titanium (Garansi Resmi iBox)", CategoryId = catGadget.Id, BusinessMode = BusinessMode.Electronics, BuyPrice = 17500000, SellPrice = 19999000, CurrentStock = 6, Unit = "UNIT", IsKitchenItem = false };
                var pRedmiNote13 = new Product { Sku = "GDT-003", Barcode = "8993003", Name = "Xiaomi Redmi Note 13 Pro 8/256GB (Garansi Resmi TAM)", CategoryId = catGadget.Id, BusinessMode = BusinessMode.Electronics, BuyPrice = 3200000, SellPrice = 3799000, CurrentStock = 15, Unit = "UNIT", IsKitchenItem = false };
                
                var pAsusLaptop = new Product { Sku = "LPT-001", Barcode = "8993004", Name = "Laptop ASUS Vivobook 14 Core i5 16GB/512GB (Garansi 2 Thn)", CategoryId = catLaptop.Id, BusinessMode = BusinessMode.Electronics, BuyPrice = 8500000, SellPrice = 9899000, CurrentStock = 5, Unit = "UNIT", IsKitchenItem = false };
                var pMacbookAir = new Product { Sku = "LPT-002", Barcode = "8993005", Name = "Apple MacBook Air M3 8/256GB Space Grey (Garansi Resmi)", CategoryId = catLaptop.Id, BusinessMode = BusinessMode.Electronics, BuyPrice = 16800000, SellPrice = 18999000, CurrentStock = 4, Unit = "UNIT", IsKitchenItem = false };
                
                var pChargerAnker = new Product { Sku = "ACC-001", Barcode = "8993006", Name = "Anker 65W GaN Fast Charger Type-C (Garansi Toko 18 Bln)", CategoryId = catAksesoris.Id, BusinessMode = BusinessMode.Electronics, BuyPrice = 280000, SellPrice = 399000, CurrentStock = 30, Unit = "UNIT", IsKitchenItem = false };
                var pSonyTws = new Product { Sku = "ACC-002", Barcode = "8993007", Name = "Sony WF-1000XM5 ANC Wireless Earbuds (Garansi Resmi 1 Thn)", CategoryId = catAksesoris.Id, BusinessMode = BusinessMode.Electronics, BuyPrice = 3200000, SellPrice = 3899000, CurrentStock = 10, Unit = "UNIT", IsKitchenItem = false };
                
                var pLcdIphone = new Product { Sku = "SPT-001", Barcode = "8993008", Name = "LCD Touchscreen iPhone 13 Original Assembly", CategoryId = catSparepart.Id, BusinessMode = BusinessMode.Electronics, BuyPrice = 1200000, SellPrice = 1650000, CurrentStock = 8, Unit = "PCS", IsKitchenItem = false };
                var pBatSamsung = new Product { Sku = "SPT-002", Barcode = "8993009", Name = "Baterai Samsung Galaxy A54 5000mAh Original", CategoryId = catSparepart.Id, BusinessMode = BusinessMode.Electronics, BuyPrice = 220000, SellPrice = 350000, CurrentStock = 12, Unit = "PCS", IsKitchenItem = false };
                var pJasaServis = new Product { Sku = "JSA-001", Barcode = "8993010", Name = "Jasa Pemasangan Sparepart & Servis Presisi", CategoryId = catSparepart.Id, BusinessMode = BusinessMode.Electronics, BuyPrice = 0, SellPrice = 150000, CurrentStock = 999, Unit = "JASA", IsKitchenItem = false };

                // Perdana & Voucher Data
                var pPerdanaTelkomsel = new Product { Sku = "SIM-001", Barcode = "8993011", Name = "Kartu Perdana Telkomsel Kuota 15GB (Masa Tunggu Aktivasi)", CategoryId = catPerdana.Id, BusinessMode = BusinessMode.Electronics, BuyPrice = 35000, SellPrice = 45000, CurrentStock = 40, Unit = "PCS", IsKitchenItem = false };
                var pVoucherTelkomsel = new Product { Sku = "VCR-001", Barcode = "8993012", Name = "Voucher Fisik Telkomsel Data 10GB 30 Hari", CategoryId = catPerdana.Id, BusinessMode = BusinessMode.Electronics, BuyPrice = 28000, SellPrice = 35000, CurrentStock = 50, Unit = "PCS", IsKitchenItem = false };
                var pVoucherIndosat = new Product { Sku = "VCR-002", Barcode = "8993013", Name = "Voucher Fisik Indosat Freedom 14GB 30 Hari", CategoryId = catPerdana.Id, BusinessMode = BusinessMode.Electronics, BuyPrice = 38000, SellPrice = 48000, CurrentStock = 35, Unit = "PCS", IsKitchenItem = false };
                var pPerdanaCantikTsel = new Product { Sku = "SIM-NC-001", Barcode = "8993014", Name = "Kartu Perdana Khusus Nomor Cantik Telkomsel (Panca Super)", CategoryId = catPerdana.Id, BusinessMode = BusinessMode.Electronics, BuyPrice = 150000, SellPrice = 750000, CurrentStock = 5, Unit = "PCS", IsKitchenItem = false };
                var pPerdanaCantikIsat = new Product { Sku = "SIM-NC-002", Barcode = "8993015", Name = "Kartu Perdana Khusus Nomor Cantik Indosat IM3 (Triple 999)", CategoryId = catPerdana.Id, BusinessMode = BusinessMode.Electronics, BuyPrice = 90000, SellPrice = 350000, CurrentStock = 4, Unit = "PCS", IsKitchenItem = false };

                var allProducts = new List<Product> { 
                    pSamsungS24, pIphone15, pRedmiNote13, pAsusLaptop, pMacbookAir, 
                    pChargerAnker, pSonyTws, pLcdIphone, pBatSamsung, pJasaServis,
                    pPerdanaTelkomsel, pVoucherTelkomsel, pVoucherIndosat, pPerdanaCantikTsel, pPerdanaCantikIsat 
                };
                await context.Products.AddRangeAsync(allProducts);
                await context.SaveChangesAsync();

                // Seed Serial Numbers / IMEIs
                var serials = new List<OmniPos.Core.Entities.Electronics.ProductSerialNumber>
                {
                    // Samsung Galaxy S24 Ultra IMEIs
                    new() { ProductId = pSamsungS24.Id, ProductName = pSamsungS24.Name, Sku = pSamsungS24.Sku, SerialNo = "358921104829101", Status = OmniPos.Core.Entities.Electronics.SerialNumberStatus.Available, SupplierName = "PT Samsung Electronics Indonesia", WarrantyMonths = 12, WarrantyNotes = "Garansi Resmi SEIN 12 Bulan" },
                    new() { ProductId = pSamsungS24.Id, ProductName = pSamsungS24.Name, Sku = pSamsungS24.Sku, SerialNo = "358921104829102", Status = OmniPos.Core.Entities.Electronics.SerialNumberStatus.Available, SupplierName = "PT Samsung Electronics Indonesia", WarrantyMonths = 12, WarrantyNotes = "Garansi Resmi SEIN 12 Bulan" },
                    new() { ProductId = pSamsungS24.Id, ProductName = pSamsungS24.Name, Sku = pSamsungS24.Sku, SerialNo = "358921104829103", Status = OmniPos.Core.Entities.Electronics.SerialNumberStatus.Available, SupplierName = "PT Samsung Electronics Indonesia", WarrantyMonths = 12, WarrantyNotes = "Garansi Resmi SEIN 12 Bulan" },
                    
                    // iPhone 15 Pro IMEIs
                    new() { ProductId = pIphone15.Id, ProductName = pIphone15.Name, Sku = pIphone15.Sku, SerialNo = "354029198230011", Status = OmniPos.Core.Entities.Electronics.SerialNumberStatus.Available, SupplierName = "PT Erajaya Swasembada (iBox)", WarrantyMonths = 12, WarrantyNotes = "Garansi Resmi Apple Indonesia / iBox 1 Tahun" },
                    new() { ProductId = pIphone15.Id, ProductName = pIphone15.Name, Sku = pIphone15.Sku, SerialNo = "354029198230012", Status = OmniPos.Core.Entities.Electronics.SerialNumberStatus.Available, SupplierName = "PT Erajaya Swasembada (iBox)", WarrantyMonths = 12, WarrantyNotes = "Garansi Resmi Apple Indonesia / iBox 1 Tahun" },
                    
                    // Laptop Asus & MacBook Serials
                    new() { ProductId = pAsusLaptop.Id, ProductName = pAsusLaptop.Name, Sku = pAsusLaptop.Sku, SerialNo = "SN-ASUS-2026-9901", Status = OmniPos.Core.Entities.Electronics.SerialNumberStatus.Available, SupplierName = "Distributor Asus Indonesia", WarrantyMonths = 24, WarrantyNotes = "Garansi Global Asus 2 Tahun" },
                    new() { ProductId = pMacbookAir.Id, ProductName = pMacbookAir.Name, Sku = pMacbookAir.Sku, SerialNo = "C02G9012MD6R", Status = OmniPos.Core.Entities.Electronics.SerialNumberStatus.Available, SupplierName = "PT Erajaya Swasembada (iBox)", WarrantyMonths = 12, WarrantyNotes = "Garansi Resmi Apple 1 Tahun" }
                };
                await context.ProductSerialNumbers.AddRangeAsync(serials);

                // Seed Nomor Cantik & SIM Card
                var simCards = new List<OmniPos.Core.Entities.Electronics.SimCardSpecialNumber>
                {
                    new() { Msisdn = "0812-8888-8888", Provider = "Telkomsel", PatternTier = "Panca Super", Iccid = "8962012345678901", DefaultQuotaGb = "25GB", MainBalance = 25000, ExpiryDate = DateTime.UtcNow.AddMonths(3), BuyPrice = 250000, SellPrice = 1250000, Status = OmniPos.Core.Entities.Electronics.SimCardStatus.Available, Notes = "Segel Pabrik Telkomsel SimPATI Red" },
                    new() { Msisdn = "0857-7777-1234", Provider = "Indosat Ooredoo IM3", PatternTier = "Kwartet Tangga", Iccid = "8962012345678902", DefaultQuotaGb = "15GB", MainBalance = 10000, ExpiryDate = DateTime.UtcNow.AddMonths(2), BuyPrice = 90000, SellPrice = 450000, Status = OmniPos.Core.Entities.Electronics.SimCardStatus.Available, Notes = "Segel Pabrik IM3 Freedom" },
                    new() { Msisdn = "0811-9999-9999", Provider = "Telkomsel", PatternTier = "VIP Platinum", Iccid = "8962012345678903", DefaultQuotaGb = "50GB", MainBalance = 100000, ExpiryDate = DateTime.UtcNow.AddMonths(6), BuyPrice = 500000, SellPrice = 2750000, Status = OmniPos.Core.Entities.Electronics.SimCardStatus.Available, Notes = "Telkomsel Halo/Pra-Bayar VIP Super Cantik" },
                    new() { Msisdn = "0818-0818-0818", Provider = "XL Axiata", PatternTier = "Mirror / Kembar", Iccid = "8962012345678904", DefaultQuotaGb = "20GB", MainBalance = 15000, ExpiryDate = DateTime.UtcNow.AddDays(45), BuyPrice = 80000, SellPrice = 350000, Status = OmniPos.Core.Entities.Electronics.SimCardStatus.Available, Notes = "XL Flex Triple Kembar" },
                    new() { Msisdn = "0852-1234-5678", Provider = "Telkomsel", PatternTier = "Tangga Seri", Iccid = "8962012345678905", DefaultQuotaGb = "10GB", MainBalance = 5000, ExpiryDate = DateTime.UtcNow.AddDays(15), BuyPrice = 60000, SellPrice = 250000, Status = OmniPos.Core.Entities.Electronics.SimCardStatus.Available, Notes = "Masa Aktif Registrasi H-15 (Perhatian)" },
                    new() { Msisdn = "0896-5555-5555", Provider = "Tri (3)", PatternTier = "Panca Super", Iccid = "8962012345678906", DefaultQuotaGb = "33GB", MainBalance = 20000, ExpiryDate = DateTime.UtcNow.AddMonths(3), BuyPrice = 120000, SellPrice = 600000, Status = OmniPos.Core.Entities.Electronics.SimCardStatus.Available, Notes = "Tri Happy Kuota Jumbo 33GB" }
                };
                await context.SimCardSpecialNumbers.AddRangeAsync(simCards);

                // Seed Sample Service Tickets (SPK Servis)
                var ticket1 = new OmniPos.Core.Entities.Electronics.DeviceServiceTicket
                {
                    TicketNumber = $"SRV-{DateTime.UtcNow:yyyyMMdd}-001",
                    CustomerName = "Budi Hartono",
                    CustomerPhone = "0812-3344-5566",
                    DeviceType = "Smartphone",
                    BrandAndModel = "iPhone 13 128GB Midnight",
                    ImeiOrSerial = "352901847192801",
                    PasscodeOrPattern = "123456",
                    ProblemDescription = "Layar sentuh retak & garis hijau setelah terjatuh dari motor",
                    PhysicalCondition = "Sudut bezel lecet, kaca belakang mulus",
                    AccessoriesIncluded = "Unit Only (Tanpa Charger)",
                    EstimatedCost = 1800000,
                    DownPayment = 500000,
                    FinalCost = 1800000,
                    RemainingBalance = 1300000,
                    Status = OmniPos.Core.Entities.Electronics.DeviceServiceStatus.InInspection,
                    AssignedTechnicianName = "Rian (Senior Hardware Tech)",
                    TechnicianNotes = "Perlu penggantian modul LCD Original dan kalibrasi TrueTone.",
                    WarrantyDaysGiven = 30
                };
                ticket1.Items.Add(new OmniPos.Core.Entities.Electronics.DeviceServiceItem
                {
                    ItemType = OmniPos.Core.Entities.Electronics.ServiceItemType.SparePart,
                    Name = "LCD Touchscreen iPhone 13 Original",
                    Quantity = 1,
                    UnitPrice = 1650000,
                    TotalPrice = 1650000
                });
                ticket1.Items.Add(new OmniPos.Core.Entities.Electronics.DeviceServiceItem
                {
                    ItemType = OmniPos.Core.Entities.Electronics.ServiceItemType.LaborCost,
                    Name = "Jasa Pasang & Kalibrasi TrueTone",
                    Quantity = 1,
                    UnitPrice = 150000,
                    TotalPrice = 150000
                });

                var ticket2 = new OmniPos.Core.Entities.Electronics.DeviceServiceTicket
                {
                    TicketNumber = $"SRV-{DateTime.UtcNow:yyyyMMdd}-002",
                    CustomerName = "Siti Rahmawati",
                    CustomerPhone = "0813-8899-7700",
                    DeviceType = "Laptop",
                    BrandAndModel = "Asus Vivobook 14 A412",
                    ImeiOrSerial = "SN-ASUS-9912",
                    ProblemDescription = "Baterai kembung dan mati mendadak saat charger dilepas",
                    PhysicalCondition = "Mulus, casing bawah sedikit terangkat karena baterai",
                    AccessoriesIncluded = "Unit + Charger Adaptor Original",
                    EstimatedCost = 650000,
                    DownPayment = 200000,
                    FinalCost = 650000,
                    RemainingBalance = 450000,
                    Status = OmniPos.Core.Entities.Electronics.DeviceServiceStatus.CompletedReadyForPickup,
                    AssignedTechnicianName = "Andi (Laptop Specialist)",
                    TechnicianNotes = "Baterai baru original telah dipasang, pengujian charging normal 100%.",
                    WarrantyDaysGiven = 60
                };

                await context.DeviceServiceTickets.AddRangeAsync(ticket1, ticket2);
                await context.SaveChangesAsync();
            }
            else // Default: Retail, Sembako & Minimarket
            {
                var catSembako = new Category { Name = "Sembako (Beras/Minyak/Gula)", IconName = "ShoppingBag", SortOrder = 1, BusinessMode = BusinessMode.Retail };
                var catMieBumbu = new Category { Name = "Mie Instan & Bumbu", IconName = "Package", SortOrder = 2, BusinessMode = BusinessMode.Retail };
                var catMinumanKemasan = new Category { Name = "Minuman Kemasan & Susu", IconName = "Milk", SortOrder = 3, BusinessMode = BusinessMode.Retail };
                var catSabunRumah = new Category { Name = "Sabun & Kebutuhan Rumah", IconName = "Sparkles", SortOrder = 4, BusinessMode = BusinessMode.Retail };

                await context.Categories.AddRangeAsync(catSembako, catMieBumbu, catMinumanKemasan, catSabunRumah);
                await context.SaveChangesAsync();

                var products = new List<Product>
                {
                    new() { Sku = "SMB-001", Barcode = "8991001", Name = "Beras Ramos Setra Premium 5 Kg", CategoryId = catSembako.Id, BusinessMode = BusinessMode.Retail, BuyPrice = 64000, SellPrice = 72000, WholesalePrice = 69000, WholesaleMinQty = 5, CurrentStock = 50, Unit = "SAK", IsKitchenItem = false },
                    new() { Sku = "SMB-002", Barcode = "8991002", Name = "Minyak Goreng Sania Pouch 2 Liter", CategoryId = catSembako.Id, BusinessMode = BusinessMode.Retail, BuyPrice = 31000, SellPrice = 36000, WholesalePrice = 34500, WholesaleMinQty = 6, CurrentStock = 80, Unit = "POUCH", IsKitchenItem = false },
                    new() { Sku = "SMB-003", Barcode = "8991003", Name = "Gula Pasir Gulaku Putih 1 Kg", CategoryId = catSembako.Id, BusinessMode = BusinessMode.Retail, BuyPrice = 15500, SellPrice = 18500, WholesalePrice = 17500, WholesaleMinQty = 10, CurrentStock = 120, Unit = "KG", IsKitchenItem = false },
                    new() { Sku = "SMB-004", Barcode = "8991004", Name = "Telur Ayam Negeri Segar 1 Kg", CategoryId = catSembako.Id, BusinessMode = BusinessMode.Retail, BuyPrice = 25000, SellPrice = 29000, WholesalePrice = 27500, WholesaleMinQty = 10, CurrentStock = 60, Unit = "KG", IsKitchenItem = false },
                    new() { Sku = "MIE-001", Barcode = "8991005", Name = "Indomie Goreng Spesial 85g", CategoryId = catMieBumbu.Id, BusinessMode = BusinessMode.Retail, BuyPrice = 2800, SellPrice = 3500, WholesalePrice = 3100, WholesaleMinQty = 40, CurrentStock = 240, Unit = "PCS", IsKitchenItem = false },
                    new() { Sku = "MIE-002", Barcode = "8991006", Name = "Indomie Goreng 1 Dus (40 Pcs)", CategoryId = catMieBumbu.Id, BusinessMode = BusinessMode.Retail, BuyPrice = 112000, SellPrice = 124000, WholesalePrice = 120000, WholesaleMinQty = 5, CurrentStock = 30, Unit = "DUS", IsKitchenItem = false },
                    new() { Sku = "MNM-001", Barcode = "8991007", Name = "Susu Kental Manis Frisian Flag 370g", CategoryId = catMinumanKemasan.Id, BusinessMode = BusinessMode.Retail, BuyPrice = 11500, SellPrice = 13500, WholesalePrice = 12500, WholesaleMinQty = 12, CurrentStock = 75, Unit = "KALENG", IsKitchenItem = false },
                    new() { Sku = "SBN-001", Barcode = "8991008", Name = "Sabun Cuci Piring Sunlight 750ml", CategoryId = catSabunRumah.Id, BusinessMode = BusinessMode.Retail, BuyPrice = 13000, SellPrice = 16000, WholesalePrice = 14500, WholesaleMinQty = 6, CurrentStock = 45, Unit = "POUCH", IsKitchenItem = false },
                    new() { Sku = "SBN-002", Barcode = "8991009", Name = "Deterjen Rinso Molto Anti Noda 770g", CategoryId = catSabunRumah.Id, BusinessMode = BusinessMode.Retail, BuyPrice = 17500, SellPrice = 21500, WholesalePrice = 19500, WholesaleMinQty = 6, CurrentStock = 40, Unit = "BKS", IsKitchenItem = false }
                };
                await context.Products.AddRangeAsync(products);
            }
        }

        // 5. Seed Dining Tables (Only if F&B)
        if (targetMode == BusinessMode.FoodAndBeverage && !await context.FloorPlanAreas.AnyAsync())
        {
            var areaMain = new FloorPlanArea { Name = "Ruang Utama (Indoor)", SortOrder = 1 };
            var areaOutdoor = new FloorPlanArea { Name = "Area Outdoor & Terrace", SortOrder = 2 };

            await context.FloorPlanAreas.AddRangeAsync(areaMain, areaOutdoor);
            await context.SaveChangesAsync();

            var tables = new List<DiningTable>
            {
                new() { AreaId = areaMain.Id, TableNumber = "A-01", Capacity = 2, PositionX = 50, PositionY = 50 },
                new() { AreaId = areaMain.Id, TableNumber = "A-02", Capacity = 4, PositionX = 200, PositionY = 50 },
                new() { AreaId = areaMain.Id, TableNumber = "A-03", Capacity = 4, PositionX = 350, PositionY = 50 },
                new() { AreaId = areaMain.Id, TableNumber = "A-04", Capacity = 6, PositionX = 500, PositionY = 50 },
                new() { AreaId = areaOutdoor.Id, TableNumber = "O-01", Capacity = 4, PositionX = 50, PositionY = 50 },
                new() { AreaId = areaOutdoor.Id, TableNumber = "O-02", Capacity = 4, PositionX = 200, PositionY = 50 }
            };

            await context.DiningTables.AddRangeAsync(tables);
        }

        // 7. Seed Sample Suppliers
        if (!await context.Suppliers.AnyAsync())
        {
            List<OmniPos.Core.Entities.Purchasing.Supplier> suppliers;
            if (targetMode == BusinessMode.Electronics)
            {
                suppliers = new List<OmniPos.Core.Entities.Purchasing.Supplier>
                {
                    new() { Name = "PT Erajaya Swasembada (iBox & Xiaomi)", Code = "SUP-EL-001", Phone = "021-80682222", ContactPerson = "Ferry (Distributor Account)", Address = "Gedung Erajaya Plaza, Bandengan, Jakarta Barat", TotalPayable = 45000000, Notes = "Distributor Resmi iPhone, Xiaomi & iPad" },
                    new() { Name = "PT Samsung Electronics Indonesia", Code = "SUP-EL-002", Phone = "021-5151234", ContactPerson = "Agus (Key Account)", Address = "TCC Batavia Tower One, Jakarta Pusat", TotalPayable = 28000000, Notes = "Distributor Resmi Samsung SEIN" },
                    new() { Name = "Distributor Pulsa & Voucher Seluler Nusantara", Code = "SUP-EL-003", Phone = "0811-9988-1122", ContactPerson = "Pak Rahmat (Server Pulsa)", Address = "Ruko Graha Seluler No. 12, Roxy Mas, Jakarta", TotalPayable = 5000000, Notes = "Supplier Grosir Kartu Perdana & Voucher Fisik Data" }
                };
            }
            else
            {
                suppliers = new List<OmniPos.Core.Entities.Purchasing.Supplier>
                {
                    new() { Name = "PT Indomarco Adi Prima (Indofood)", Code = "SUP-001", Phone = "021-88991122", ContactPerson = "Pak Hendra (Sales)", Address = "Kawasan Industri Pulo Gadung, Jakarta", TotalPayable = 2500000, Notes = "Distributor Resmi Indomie & Bimoli" },
                    new() { Name = "PT Unilever Indonesia Distributor", Code = "SUP-002", Phone = "021-55443322", ContactPerson = "Ibu Dewi", Address = "BSD Green Office Park, Tangerang", TotalPayable = 1200000, Notes = "Sabun, Shampoo, Deterjen" },
                    new() { Name = "CV Beras Berkah Tani Mandiri", Code = "SUP-003", Phone = "0812-9988-7766", ContactPerson = "Haji Mansur", Address = "Pasar Induk Cipinang, Jakarta Timur", TotalPayable = 0, Notes = "Beras Ramos & Pandan Wangi" }
                };
            }
            await context.Suppliers.AddRangeAsync(suppliers);
        }

        // 8. Seed Sample Product Batches (Expired Tracking)
        if (!await context.ProductBatches.AnyAsync())
        {
            List<OmniPos.Core.Entities.Inventory.ProductBatch> batches;
            if (targetMode == BusinessMode.Electronics)
            {
                batches = new List<OmniPos.Core.Entities.Inventory.ProductBatch>
                {
                    new() { Sku = "VCR-001", ProductName = "Voucher Fisik Telkomsel Data 10GB 30 Hari", BatchNumber = "BATCH-VCR-TSEL-H7", ExpiredDate = DateTime.UtcNow.AddDays(7), InitialStock = 50, CurrentStock = 25, Notes = "Masa Berlaku Voucher Kritis (H-7)" },
                    new() { Sku = "VCR-002", ProductName = "Voucher Fisik Indosat Freedom 14GB 30 Hari", BatchNumber = "BATCH-VCR-ISAT-H25", ExpiredDate = DateTime.UtcNow.AddDays(25), InitialStock = 100, CurrentStock = 35, Notes = "Peringatan Masa Berlaku H-25" },
                    new() { Sku = "SIM-001", ProductName = "Kartu Perdana Telkomsel Kuota 15GB (Masa Tunggu Aktivasi)", BatchNumber = "BATCH-SIM-TSEL-2026", ExpiredDate = DateTime.UtcNow.AddMonths(4), InitialStock = 100, CurrentStock = 40, Notes = "Stok Aman (Batas Aktivasi 4 Bulan)" }
                };
            }
            else if (targetMode == BusinessMode.Pharmacy)
            {
                batches = new List<OmniPos.Core.Entities.Inventory.ProductBatch>
                {
                    new() { Sku = "FAR-001", ProductName = "Paracetamol 500mg Strip (10 Tablet)", BatchNumber = "BATCH-PCT-2026A", ExpiredDate = DateTime.UtcNow.AddMonths(12), InitialStock = 150, CurrentStock = 150, Notes = "Stok Farmasi Aman" },
                    new() { Sku = "FAR-004", ProductName = "Amoxicillin 500mg (Batch AMX-2026)", BatchNumber = "BATCH-AMX-2026", ExpiredDate = DateTime.UtcNow.AddMonths(6), InitialStock = 90, CurrentStock = 90, Notes = "Peringatan H-180" }
                };
            }
            else
            {
                batches = new List<OmniPos.Core.Entities.Inventory.ProductBatch>
                {
                    new() { Sku = "MNM-001", ProductName = "Susu Kental Manis Frisian Flag 370g", BatchNumber = "BATCH-FF-2026A", ExpiredDate = DateTime.UtcNow.AddDays(5), InitialStock = 50, CurrentStock = 15, Notes = "Mendekati Kadaluarsa (Kritis H-5)" },
                    new() { Sku = "MIE-001", ProductName = "Indomie Goreng Original 85g", BatchNumber = "BATCH-IND-882", ExpiredDate = DateTime.UtcNow.AddDays(22), InitialStock = 200, CurrentStock = 45, Notes = "Peringatan H-22" },
                    new() { Sku = "SMB-002", ProductName = "Minyak Goreng Tropical 2 Liter", BatchNumber = "BATCH-TRP-901", ExpiredDate = DateTime.UtcNow.AddMonths(8), InitialStock = 60, CurrentStock = 30, Notes = "Stok Aman" }
                };
            }
            await context.ProductBatches.AddRangeAsync(batches);
        }

        // 9. Seed Sample Promotions
        if (!await context.PromotionRules.AnyAsync())
        {
            List<OmniPos.Core.Entities.Marketing.PromotionRule> promos;
            if (targetMode == BusinessMode.Electronics)
            {
                promos = new List<OmniPos.Core.Entities.Marketing.PromotionRule>
                {
                    new() { 
                        Name = "Promo Bundling: Beli iPhone 15 Pro Gratis Fast Charger Anker 65W", 
                        PromoType = OmniPos.Core.Entities.Marketing.PromotionType.BuyXGetY,
                        BuyProductName = "Apple iPhone 15 Pro 128GB Titanium (Garansi Resmi iBox)",
                        BuyQuantityRequired = 1,
                        GetFreeProductName = "Anker 65W GaN Fast Charger Type-C (Garansi Toko 18 Bln)",
                        GetFreeQuantity = 1,
                        IsActive = true
                    },
                    new() {
                        Name = "Paket Starter: Perdana Kuota 15GB + Voucher Data 10GB",
                        PromoType = OmniPos.Core.Entities.Marketing.PromotionType.BundlingPackage,
                        BundleSpecialPrice = 65000,
                        Description = "Paket hemat internet super kencang",
                        IsActive = true
                    }
                };
            }
            else
            {
                promos = new List<OmniPos.Core.Entities.Marketing.PromotionRule>
                {
                    new() { 
                        Name = "Promo Jumat Berkah: Beli 2 Minyak Tropical Gratis 1 Gula Pasir", 
                        PromoType = OmniPos.Core.Entities.Marketing.PromotionType.BuyXGetY,
                        BuyProductName = "Minyak Goreng Tropical 2 Liter",
                        BuyQuantityRequired = 2,
                        GetFreeProductName = "Gula Pasir Gulaku Premium 1kg",
                        GetFreeQuantity = 1,
                        IsActive = true
                    },
                    new() {
                        Name = "Paket Sembako Hemat A (Beras + Minyak + Telur)",
                        PromoType = OmniPos.Core.Entities.Marketing.PromotionType.BundlingPackage,
                        BundleSpecialPrice = 115000,
                        Description = "Paket komplit hemat Rp 12.000",
                        IsActive = true
                    }
                };
            }
            await context.PromotionRules.AddRangeAsync(promos);
        }

        await context.SaveChangesAsync();
    }

    public static async Task EnsureTablesCreatedSafelyAsync(AppDbContext context)
    {
        try
        {
            await context.Database.EnsureCreatedAsync();
        }
        catch { }

        try
        {
            var createScript = context.Database.GenerateCreateScript();
            if (!string.IsNullOrWhiteSpace(createScript))
            {
                var safeScript = createScript
                    .Replace("CREATE TABLE ", "CREATE TABLE IF NOT EXISTS ")
                    .Replace("CREATE UNIQUE INDEX ", "CREATE UNIQUE INDEX IF NOT EXISTS ")
                    .Replace("CREATE INDEX ", "CREATE INDEX IF NOT EXISTS ");

                var statements = safeScript.Split(new[] { ";\r\n", ";\n" }, StringSplitOptions.RemoveEmptyEntries);
                foreach (var stmt in statements)
                {
                    var trimmed = stmt.Trim();
                    if (!string.IsNullOrWhiteSpace(trimmed))
                    {
                        try
                        {
                            await context.Database.ExecuteSqlRawAsync(trimmed + ";");
                        }
                        catch { }
                    }
                }
            }
        }
        catch { }
    }
}
