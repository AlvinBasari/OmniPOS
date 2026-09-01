using Microsoft.EntityFrameworkCore;
using OmniPos.Core.Entities;
using OmniPos.Core.Entities.CRM;
using OmniPos.Core.Entities.Finance;
using OmniPos.Core.Entities.Identity;
using OmniPos.Core.Entities.Inventory;
using OmniPos.Core.Entities.Products;
using OmniPos.Core.Entities.Sales;
using OmniPos.Core.Entities.Shifts;
using OmniPos.Core.Entities.Tables;

namespace OmniPos.Infrastructure.Data;

public class AppDbContext : DbContext
{
    public AppDbContext(DbContextOptions<AppDbContext> options) : base(options)
    {
    }

    // Products
    public DbSet<Product> Products => Set<Product>();
    public DbSet<Category> Categories => Set<Category>();
    public DbSet<ProductVariant> ProductVariants => Set<ProductVariant>();
    public DbSet<ModifierGroup> ModifierGroups => Set<ModifierGroup>();
    public DbSet<ModifierOption> ModifierOptions => Set<ModifierOption>();
    public DbSet<ProductModifierGroup> ProductModifierGroups => Set<ProductModifierGroup>();
    public DbSet<ProductUnitConversion> ProductUnitConversions => Set<ProductUnitConversion>();
    public DbSet<Recipe> Recipes => Set<Recipe>();
    public DbSet<RecipeItem> RecipeItems => Set<RecipeItem>();

    // Inventory & Batches
    public DbSet<StockMutation> StockMutations => Set<StockMutation>();
    public DbSet<BatchExpiry> BatchExpiries => Set<BatchExpiry>();
    public DbSet<SerialNumber> SerialNumbers => Set<SerialNumber>();
    public DbSet<ProductBatch> ProductBatches => Set<ProductBatch>();
    public DbSet<StockOpnameSession> StockOpnameSessions => Set<StockOpnameSession>();
    public DbSet<StockOpnameItem> StockOpnameItems => Set<StockOpnameItem>();

    // Electronics & Gadget Specific
    public DbSet<OmniPos.Core.Entities.Electronics.ProductSerialNumber> ProductSerialNumbers => Set<OmniPos.Core.Entities.Electronics.ProductSerialNumber>();
    public DbSet<OmniPos.Core.Entities.Electronics.DeviceServiceTicket> DeviceServiceTickets => Set<OmniPos.Core.Entities.Electronics.DeviceServiceTicket>();
    public DbSet<OmniPos.Core.Entities.Electronics.DeviceServiceItem> DeviceServiceItems => Set<OmniPos.Core.Entities.Electronics.DeviceServiceItem>();
    public DbSet<OmniPos.Core.Entities.Electronics.TradeInTransaction> TradeInTransactions => Set<OmniPos.Core.Entities.Electronics.TradeInTransaction>();
    public DbSet<OmniPos.Core.Entities.Electronics.SimCardSpecialNumber> SimCardSpecialNumbers => Set<OmniPos.Core.Entities.Electronics.SimCardSpecialNumber>();

    // Purchasing & Suppliers
    public DbSet<OmniPos.Core.Entities.Purchasing.Supplier> Suppliers => Set<OmniPos.Core.Entities.Purchasing.Supplier>();
    public DbSet<OmniPos.Core.Entities.Purchasing.PurchaseInvoice> PurchaseInvoices => Set<OmniPos.Core.Entities.Purchasing.PurchaseInvoice>();
    public DbSet<OmniPos.Core.Entities.Purchasing.PurchaseItem> PurchaseItems => Set<OmniPos.Core.Entities.Purchasing.PurchaseItem>();
    public DbSet<OmniPos.Core.Entities.Purchasing.PurchasePayment> PurchasePayments => Set<OmniPos.Core.Entities.Purchasing.PurchasePayment>();

    // Sales & Returns
    public DbSet<Order> Orders => Set<Order>();
    public DbSet<OrderItem> OrderItems => Set<OrderItem>();
    public DbSet<OrderItemModifier> OrderItemModifiers => Set<OrderItemModifier>();
    public DbSet<Payment> Payments => Set<Payment>();
    public DbSet<HoldOrder> HoldOrders => Set<HoldOrder>();
    public DbSet<Promotion> Promotions => Set<Promotion>();
    public DbSet<OmniPos.Core.Entities.Marketing.PromotionRule> PromotionRules => Set<OmniPos.Core.Entities.Marketing.PromotionRule>();
    public DbSet<OmniPos.Core.Entities.Sales.SalesReturn> SalesReturns => Set<OmniPos.Core.Entities.Sales.SalesReturn>();
    public DbSet<OmniPos.Core.Entities.Sales.SalesReturnItem> SalesReturnItems => Set<OmniPos.Core.Entities.Sales.SalesReturnItem>();

    // Shifts
    public DbSet<Shift> Shifts => Set<Shift>();
    public DbSet<CashTransaction> CashTransactions => Set<CashTransaction>();

    // CRM
    public DbSet<Customer> Customers => Set<Customer>();
    public DbSet<CustomerPoint> CustomerPoints => Set<CustomerPoint>();
    public DbSet<CustomerReceivable> CustomerReceivables => Set<CustomerReceivable>();
    public DbSet<CustomerReceivablePayment> CustomerReceivablePayments => Set<CustomerReceivablePayment>();

    // Tables
    public DbSet<FloorPlanArea> FloorPlanAreas => Set<FloorPlanArea>();
    public DbSet<DiningTable> DiningTables => Set<DiningTable>();

    // Finance
    public DbSet<Account> Accounts => Set<Account>();
    public DbSet<JournalEntry> JournalEntries => Set<JournalEntry>();
    public DbSet<JournalDetail> JournalDetails => Set<JournalDetail>();

    // Identity & System
    public DbSet<User> Users => Set<User>();
    public DbSet<AuditLog> AuditLogs => Set<AuditLog>();
    public DbSet<AppSetting> AppSettings => Set<AppSetting>();
    public DbSet<BackupHistory> BackupHistories => Set<BackupHistory>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        // Global Soft Delete Filter
        foreach (var entityType in modelBuilder.Model.GetEntityTypes())
        {
            if (typeof(BaseEntity).IsAssignableFrom(entityType.ClrType))
            {
                var parameter = System.Linq.Expressions.Expression.Parameter(entityType.ClrType, "e");
                var property = System.Linq.Expressions.Expression.Property(parameter, nameof(BaseEntity.IsDeleted));
                var filter = System.Linq.Expressions.Expression.Lambda(
                    System.Linq.Expressions.Expression.Equal(property, System.Linq.Expressions.Expression.Constant(false)),
                    parameter
                );
                modelBuilder.Entity(entityType.ClrType).HasQueryFilter(filter);
            }
        }

        // Indexes for high performance
        modelBuilder.Entity<Product>()
            .HasIndex(p => p.Barcode);
        modelBuilder.Entity<Product>()
            .HasIndex(p => p.Sku);
        modelBuilder.Entity<Order>()
            .HasIndex(o => o.InvoiceNumber)
            .IsUnique();
        modelBuilder.Entity<Order>()
            .HasIndex(o => o.OrderDate);
        modelBuilder.Entity<User>()
            .HasIndex(u => u.Username)
            .IsUnique();
        modelBuilder.Entity<Customer>()
            .HasIndex(c => c.PhoneNumber);

        // Configure Decimals for Financial Accuracy
        foreach (var property in modelBuilder.Model.GetEntityTypes()
                     .SelectMany(t => t.GetProperties())
                     .Where(p => p.ClrType == typeof(decimal) || p.ClrType == typeof(decimal?)))
        {
            property.SetPrecision(18);
            property.SetScale(2);
        }
    }

    public override Task<int> SaveChangesAsync(CancellationToken cancellationToken = default)
    {
        foreach (var entry in ChangeTracker.Entries<BaseEntity>())
        {
            if (entry.State == EntityState.Modified)
            {
                entry.Entity.UpdatedAt = DateTime.UtcNow;
            }
            else if (entry.State == EntityState.Deleted)
            {
                entry.State = EntityState.Modified;
                entry.Entity.IsDeleted = true;
                entry.Entity.UpdatedAt = DateTime.UtcNow;
            }
        }
        return base.SaveChangesAsync(cancellationToken);
    }
}
