using System;
using System.Collections.Generic;
using OmniPos.Core.Entities.Products;

namespace OmniPos.Core.Entities.Electronics;

public enum DeviceServiceStatus
{
    Received,                     // Baru diterima (Menunggu antrean inspeksi)
    InInspection,                 // Sedang dicek teknisi
    WaitingForCustomerApproval,   // Menunggu persetujuan biaya/part dari pelanggan
    WaitingForSpareParts,         // Menunggu kiriman sparepart
    Repairing,                    // Sedang dikerjakan/reparasi
    CompletedReadyForPickup,      // Selesai diperbaiki & siap diambil
    PickedUpAndPaid,              // Sudah diambil & lunas
    Cancelled                     // Batal / Tidak dapat diperbaiki
}

public enum ServiceItemType
{
    SparePart,
    LaborCost
}

public enum SerialNumberStatus
{
    Available,
    Sold,
    InService,
    Returned
}

public class ProductSerialNumber : BaseEntity
{
    public string ProductId { get; set; } = string.Empty;
    public Product? Product { get; set; }
    
    public string ProductName { get; set; } = string.Empty;
    public string Sku { get; set; } = string.Empty;
    public string SerialNo { get; set; } = string.Empty; // IMEI / Serial Number
    
    public SerialNumberStatus Status { get; set; } = SerialNumberStatus.Available;
    
    public string? PurchaseInvoiceNumber { get; set; }
    public string? SupplierName { get; set; }
    
    public string? SoldInvoiceNumber { get; set; }
    public DateTime? SoldDate { get; set; }
    public string? CustomerName { get; set; }
    public string? CustomerPhone { get; set; }
    
    public int WarrantyMonths { get; set; } = 12;
    public DateTime? WarrantyEndDate { get; set; }
    public string? WarrantyNotes { get; set; } // Garansi Resmi SEIN/iBox/Distributor/Toko
}

public class DeviceServiceTicket : BaseEntity
{
    public string TicketNumber { get; set; } = string.Empty; // SRV-YYYYMMDD-XXXX
    
    // Customer Info
    public string CustomerName { get; set; } = string.Empty;
    public string CustomerPhone { get; set; } = string.Empty;
    public string? CustomerEmail { get; set; }
    public string? CustomerAddress { get; set; }
    
    // Device Info
    public string DeviceType { get; set; } = "Smartphone"; // Smartphone, Laptop, Tablet, TV, Audio
    public string BrandAndModel { get; set; } = string.Empty; // e.g. "Samsung Galaxy S23 Ultra 12/256"
    public string? ImeiOrSerial { get; set; }
    public string? DeviceColor { get; set; }
    public string? PasscodeOrPattern { get; set; } // Pola / PIN layar untuk pengujian teknisi
    
    // Diagnosis & Complaints
    public string ProblemDescription { get; set; } = string.Empty;
    public string PhysicalCondition { get; set; } = "Lecet Pemakaian Wajar";
    public string AccessoriesIncluded { get; set; } = "Unit Only"; // Unit Only, Dus, Charger, Kabel
    
    // Cost & Financials
    public decimal EstimatedCost { get; set; } = 0;
    public decimal DownPayment { get; set; } = 0;
    public decimal FinalCost { get; set; } = 0;
    public decimal RemainingBalance { get; set; } = 0;
    
    // Status & Technician
    public DeviceServiceStatus Status { get; set; } = DeviceServiceStatus.Received;
    public string? AssignedTechnicianName { get; set; }
    public string? TechnicianNotes { get; set; }
    public int WarrantyDaysGiven { get; set; } = 30; // Garansi pengerjaan toko (misal 30 hari)
    
    public DateTime ReceivedDate { get; set; } = DateTime.UtcNow;
    public DateTime? CompletedDate { get; set; }
    public DateTime? PickedUpDate { get; set; }
    public string? FinalInvoiceNumber { get; set; }
    
    public ICollection<DeviceServiceItem> Items { get; set; } = new List<DeviceServiceItem>();
}

public class DeviceServiceItem : BaseEntity
{
    public string DeviceServiceTicketId { get; set; } = string.Empty;
    public DeviceServiceTicket? DeviceServiceTicket { get; set; }
    
    public ServiceItemType ItemType { get; set; } = ServiceItemType.SparePart;
    public string? ProductId { get; set; } // Nullable if custom labor or non-inventory part
    public string Name { get; set; } = string.Empty;
    public decimal Quantity { get; set; } = 1;
    public decimal UnitPrice { get; set; } = 0;
    public decimal TotalPrice { get; set; } = 0;
}

public class TradeInTransaction : BaseEntity
{
    public string TradeInNumber { get; set; } = string.Empty; // TRD-YYYYMMDD-XXXX
    public string? OrderId { get; set; }
    public string? NewInvoiceNumber { get; set; }
    
    public string CustomerName { get; set; } = string.Empty;
    public string CustomerPhone { get; set; } = string.Empty;
    
    // Traded-in Device Info
    public string DeviceBrandModel { get; set; } = string.Empty; // e.g. "iPhone 11 128GB Black Ex-iBox"
    public string? ImeiOrSerial { get; set; }
    public string ConditionGrade { get; set; } = "Grade A"; // Grade A (Mulus), Grade B (Normal), Grade C (Minus)
    public string FunctionalNotes { get; set; } = "Fungsi normal, baterai wajar";
    public string AccessoriesIncluded { get; set; } = "Unit + Dus";
    
    public decimal ValuationAmount { get; set; } = 0; // Nilai potongan tukar tambah
    public string? ReceivedByUserId { get; set; }
    public DateTime TransactionDate { get; set; } = DateTime.UtcNow;
}

public enum SimCardStatus
{
    Available,
    Sold,
    ReservedBooking,
    Expired
}

public class SimCardSpecialNumber : BaseEntity
{
    public string Msisdn { get; set; } = string.Empty; // Nomor Telepon e.g. "0812-8888-8888"
    public string Provider { get; set; } = "Telkomsel"; // Telkomsel, Indosat Ooredoo IM3, XL Axiata, Axis, Smartfren, Tri
    public string PatternTier { get; set; } = "Panca Super"; // Panca Super (88888), Kwartet (7777), Triple (999), Tangga Seri (1234), Mirror (8228), VIP Gold, Reguler Cantik
    public string? Iccid { get; set; } // Serial Fisik Kartu SIM
    
    public string DefaultQuotaGb { get; set; } = "15GB"; // Kuota bawaan kartu
    public decimal MainBalance { get; set; } = 0; // Pulsa bawaan
    
    public DateTime ExpiryDate { get; set; } = DateTime.UtcNow.AddMonths(3); // Batas akhir registrasi/aktivasi
    
    public decimal BuyPrice { get; set; } = 0; // Harga modal
    public decimal SellPrice { get; set; } = 0; // Harga jual khusus nomor cantik
    
    public SimCardStatus Status { get; set; } = SimCardStatus.Available;
    
    public string? SoldInvoiceNumber { get; set; }
    public DateTime? SoldDate { get; set; }
    public string? CustomerName { get; set; }
    public string? CustomerPhone { get; set; }
    public string? CustomerNik { get; set; } // NIK untuk registrasi prabayar
    
    public string? Notes { get; set; } // Segel Pabrik / Belum Registrasi / dsb
}
