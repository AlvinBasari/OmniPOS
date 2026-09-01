namespace OmniPos.Core.Enums;

public enum BusinessMode
{
    Retail,
    FoodAndBeverage,
    Services,
    Pharmacy,
    Electronics
}

public enum OrderStatus
{
    Draft,
    Pending,
    Processing,
    Completed,
    Voided,
    Refunded
}

public enum PaymentMethod
{
    Cash,
    QrisDynamic,
    QrisStatic,
    DebitCard,
    CreditCard,
    BankTransfer,
    CustomerReceivable, // Kasbon / PayLater
    CustomerDeposit     // Saldo Deposit Member
}

public enum StockMutationType
{
    InitialStock,
    SalesDeduction,
    SalesReturn,
    PurchaseReceived,
    PurchaseReturn,
    StockOpnameAdjustment,
    DamageWaste,
    RecipeBOMConsumption
}

public enum UserRole
{
    SuperAdmin,     // Pemilik Toko / Owner (Akses Penuh Semua Modul)
    Manager,        // Manajer Operasional (Laporan, Manajemen Stok, Approval Diskon)
    Supervisor,     // Supervisor Shift (Otorisasi Void/Refund, Approval Shift)
    Cashier,        // Kasir (POS Kasir, Shift, Kasbon, Input Kas Laci)
    InventoryStaff, // Staf Gudang (Stok Masuk, Stok Opname, PO Supplier)
    Waiter,         // Pelayan / Pramusaji (Denah Meja & Input Pesanan)
    KitchenStaff,   // Koki / Barista (Monitor Layar Dapur KDS)
    Technician      // Teknisi / Barber (Status Antrean & Layanan Jasa)
}

public enum PromotionType
{
    PercentageDiscount,
    FixedAmountDiscount,
    BuyXGetY,
    TieredQuantity,
    HappyHour,
    MinimumSpend
}

public enum TableStatus
{
    Available,
    Occupied,
    WaitingFood,
    ReadyToBill,
    NeedsCleaning
}

public enum AccountType
{
    Asset,
    Liability,
    Equity,
    Revenue,
    CostOfGoodsSold,
    Expense
}
