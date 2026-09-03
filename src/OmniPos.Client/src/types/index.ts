export type BusinessMode = 'Retail' | 'FoodAndBeverage' | 'Services' | 'Pharmacy' | 'Electronics';

export type PaymentMethod = 
  | 'Cash'
  | 'QrisDynamic'
  | 'QrisStatic'
  | 'DebitCard'
  | 'CreditCard'
  | 'BankTransfer'
  | 'CustomerReceivable'
  | 'CustomerDeposit';

export interface ModifierOption {
  id: string;
  name: string;
  price: number;
  cost: number;
}

export interface ModifierGroup {
  id: string;
  name: string;
  isRequired: boolean;
  maxSelections: number;
  options: ModifierOption[];
}

export interface ProductVariant {
  id: string;
  name: string;
  sku?: string;
  barcode?: string;
  additionalPrice: number;
  additionalCost: number;
  currentStock: number;
}

export interface Product {
  id: string;
  sku: string;
  barcode?: string;
  name: string;
  description?: string;
  imageUrl?: string;
  categoryId: string;
  category?: { name: string };
  unit: string;
  buyPrice: number;
  sellPrice: number;
  wholesalePrice?: number;
  wholesaleMinQty?: number;
  currentStock: number;
  minStockAlert: number;
  trackStock: boolean;
  isKitchenItem: boolean;
  kitchenStation?: string;
  hasVariants: boolean;
  variants: ProductVariant[];
  modifierGroups?: { modifierGroup: ModifierGroup }[];
  unitConversions?: ProductUnitConversion[];
}

export interface ProductUnitConversion {
  id?: string;
  productId: string;
  unitName: string;
  conversionFactor: number;
  barcode?: string;
  sku?: string;
  sellPrice: number;
  buyPrice: number;
}

export interface Category {
  id: string;
  name: string;
  iconName?: string;
  colorHex?: string;
  sortOrder: number;
}

export interface CartItemModifier {
  id?: string;
  name?: string;
  modifierOptionId?: string;
  modifierName?: string;
  price: number;
}

export interface CartItem {
  productId: string;
  variantId?: string;
  name: string;
  variantName?: string;
  sku?: string;
  unit?: string;
  quantity: number;
  regularPrice: number;
  wholesalePrice?: number;
  wholesaleMinQty?: number;
  isWholesaleApplied?: boolean;
  unitPrice: number;
  discountAmount: number;
  totalPrice: number;
  modifiers: CartItemModifier[];
  notes?: string;
  kitchenStation?: string;
  serialNumber?: string;
  isPromoReward?: boolean;
  promoRuleName?: string;
  serviceTicketId?: string;
  isServiceSettlement?: boolean;
}

export interface DiningTable {
  id: string;
  areaId: string;
  tableNumber: string;
  capacity: number;
  status: 'Available' | 'Occupied' | 'WaitingFood' | 'ReadyToBill' | 'NeedsCleaning';
  currentOrderId?: string;
  currentBillAmount: number;
  occupiedSince?: string;
}

export interface FloorPlanArea {
  id: string;
  name: string;
  sortOrder: number;
  tables: DiningTable[];
}

export interface Customer {
  id: string;
  name: string;
  phoneNumber?: string;
  email?: string;
  address?: string;
  memberCode?: string;
  customerGroup: string;
  loyaltyPoints: number;
  depositBalance: number;
  totalReceivable: number;
  creditLimit: number;
}

export interface Shift {
  id: string;
  shiftNumber: string;
  userId: string;
  cashierName: string;
  startTime: string;
  endTime?: string;
  isClosed: boolean;
  startingCash: number;
  totalCashSales: number;
  totalNonCashSales: number;
  totalCashIn: number;
  totalCashOut: number;
  expectedCash: number;
  actualCashCount?: number;
  cashDiscrepancy?: number;
  totalTransactions: number;
}

export interface CashTransaction {
  id: string;
  shiftId: string;
  isCashIn: boolean;
  amount: number;
  category: string;
  description: string;
  createdAt: string;
}

export interface BackupHistory {
  id: string;
  fileName: string;
  fileSizeBytes: number;
  googleDriveFileId?: string;
  isEncrypted: boolean;
  isUploadedToDrive: boolean;
  triggerSource: string;
  status: string;
  createdAt: string;
}

export interface OrderResponse {
  id: string;
  invoiceNumber: string;
  orderDate: string;
  status: string;
  subtotal: number;
  discountAmount: number;
  taxAmount: number;
  roundingAmount: number;
  totalAmount: number;
  totalPaid: number;
  changeAmount: number;
}

export type UserRole = 
  | 'SuperAdmin'
  | 'Manager'
  | 'Supervisor'
  | 'Cashier'
  | 'InventoryStaff'
  | 'Waiter'
  | 'KitchenStaff'
  | 'Technician';

export interface User {
  id: string;
  username: string;
  fullName: string;
  role: UserRole;
  isActive: boolean;
  lastLoginAt?: string;
  createdAt?: string;
}

// ==========================================
// ENTERPRISE MODULES TYPES
// ==========================================

export interface Supplier {
  id: string;
  name: string;
  code: string;
  phone?: string;
  contactPerson?: string;
  address?: string;
  bankAccount?: string;
  totalPayable: number;
  notes?: string;
  isActive: boolean;
}

export interface PurchaseItem {
  id?: string;
  productId: string;
  productName: string;
  sku: string;
  quantity: number;
  unitCost: number;
  totalCost: number;
  batchNumber?: string;
  expiredDate?: string;
}

export interface PurchasePayment {
  id: string;
  paymentDate: string;
  amount: number;
  paymentMethod: string;
  notes?: string;
}

export interface PurchaseInvoice {
  id: string;
  invoiceNumber: string;
  referenceNumber?: string;
  supplierId: string;
  supplierName: string;
  purchaseDate: string;
  totalAmount: number;
  paidAmount: number;
  remainingPayable: number;
  dueDate?: string;
  paymentStatus: 'Unpaid' | 'Partial' | 'Paid' | 0 | 1 | 2;
  notes?: string;
  items: PurchaseItem[];
  payments: PurchasePayment[];
}

export interface StockOpnameItem {
  id?: string;
  productId: string;
  productName: string;
  sku: string;
  systemStock: number;
  physicalStock: number;
  discrepancyQty: number;
  unitCost: number;
  discrepancyValue: number;
  notes?: string;
}

export interface StockOpnameSession {
  id: string;
  sessionNumber: string;
  title: string;
  status: 'Draft' | 'Completed' | 'Cancelled' | 0 | 1 | 2;
  totalItemsAudited: number;
  totalDiscrepancyQty: number;
  totalDiscrepancyValue: number;
  auditedByUserId?: string;
  createdAt: string;
  completedAt?: string;
  notes?: string;
  items: StockOpnameItem[];
}

export interface ProductBatch {
  id: string;
  productId: string;
  productName: string;
  sku: string;
  batchNumber: string;
  expiredDate: string;
  initialStock: number;
  currentStock: number;
  receivedDate: string;
  notes?: string;
}

export interface PromotionRule {
  id: string;
  name: string;
  code?: string;
  description?: string;
  promoType: 'BuyXGetY' | 'BundlingPackage' | 'HappyHourDiscount' | 'MinimumSpendDiscount' | 0 | 1 | 2 | 3;
  buyProductId?: string;
  buyProductName?: string;
  buyQuantityRequired: number;
  getFreeProductId?: string;
  getFreeProductName?: string;
  getFreeQuantity: number;
  discountPercent: number;
  discountNominal: number;
  minimumSpendAmount: number;
  bundleSpecialPrice: number;
  startDate?: string;
  endDate?: string;
  isActive: boolean;
}

export interface SalesReturnItem {
  id?: string;
  productId: string;
  productName: string;
  sku: string;
  returnedQuantity: number;
  unitPrice: number;
  refundAmount: number;
  isRestocked: boolean;
  condition: string;
}

export interface SalesReturn {
  id: string;
  returnNumber: string;
  originalInvoiceNumber: string;
  returnDate: string;
  customerId?: string;
  customerName?: string;
  cashierUserId?: string;
  totalRefundAmount: number;
  refundMethod: 'Cash' | 'StoreCredit' | 'BankTransfer' | 0 | 1 | 2;
  returnReason: string;
  notes?: string;
  items: SalesReturnItem[];
}

export interface TopProductSummary {
  productName: string;
  quantitySold: number;
  revenue: number;
  grossProfit: number;
}

export interface DeadStockItem {
  sku: string;
  productName: string;
  categoryName: string;
  currentStock: number;
  buyPrice: number;
  tiedCapital: number;
}

export interface CategoryProfit {
  categoryName: string;
  revenue: number;
  cogs: number;
  grossProfit: number;
  marginPercentage: number;
}

export interface LowStockItem {
  sku: string;
  productName: string;
  currentStock: number;
  minStockAlert: number;
  unit: string;
}

export interface SalesSummary {
  totalRevenue: number;
  totalGrossProfit: number;
  totalDiscounts: number;
  totalTransactions: number;
  averageTicketSize: number;
  dailyTrend: { date: string; revenue: number; transactions: number }[];
  topProducts: TopProductSummary[];
  paymentBreakdown: { method: string; amount: number; count: number }[];
  deadStock: DeadStockItem[];
  categoryProfits: CategoryProfit[];
  lowStockAlerts: LowStockItem[];
}

// ==========================================
// ELECTRONICS & GADGET SPECIFIC TYPES
// ==========================================

export type SerialNumberStatus = 'Available' | 'Sold' | 'InService' | 'Returned';

export interface ProductSerialNumber {
  id: string;
  productId: string;
  product?: Product;
  productName: string;
  sku: string;
  serialNo: string;
  status: SerialNumberStatus;
  supplierName?: string;
  purchaseInvoiceNumber?: string;
  soldInvoiceNumber?: string;
  soldDate?: string;
  customerName?: string;
  customerPhone?: string;
  warrantyMonths: number;
  warrantyEndDate?: string;
  warrantyNotes?: string;
}

export type DeviceServiceStatus = 
  | 'Received'
  | 'InInspection'
  | 'WaitingForCustomerApproval'
  | 'WaitingForSpareParts'
  | 'Repairing'
  | 'CompletedReadyForPickup'
  | 'PickedUpAndPaid'
  | 'Cancelled';

export type ServiceItemType = 'SparePart' | 'LaborCost';

export interface DeviceServiceItem {
  id?: string;
  deviceServiceTicketId?: string;
  itemType: ServiceItemType;
  productId?: string;
  name: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
}

export interface DeviceServiceTicket {
  id: string;
  ticketNumber: string;
  customerName: string;
  customerPhone: string;
  customerEmail?: string;
  customerAddress?: string;
  deviceType: string;
  brandAndModel: string;
  imeiOrSerial?: string;
  deviceColor?: string;
  passcodeOrPattern?: string;
  problemDescription: string;
  physicalCondition: string;
  accessoriesIncluded: string;
  estimatedCost: number;
  downPayment: number;
  finalCost: number;
  remainingBalance: number;
  status: DeviceServiceStatus;
  assignedTechnicianName?: string;
  technicianNotes?: string;
  warrantyDaysGiven: number;
  receivedDate: string;
  completedDate?: string;
  pickedUpDate?: string;
  finalInvoiceNumber?: string;
  items: DeviceServiceItem[];
}

export interface TradeInTransaction {
  id: string;
  tradeInNumber: string;
  orderId?: string;
  newInvoiceNumber?: string;
  customerName: string;
  customerPhone: string;
  deviceBrandModel: string;
  imeiOrSerial?: string;
  conditionGrade: string;
  functionalNotes: string;
  accessoriesIncluded: string;
  valuationAmount: number;
  receivedByUserId?: string;
  transactionDate: string;
}

export type SimCardStatus = 'Available' | 'Sold' | 'ReservedBooking' | 'Expired' | 0 | 1 | 2 | 3;

export interface SimCardSpecialNumber {
  id: string;
  msisdn: string;
  provider: string;
  patternTier: string;
  iccid?: string;
  defaultQuotaGb: string;
  mainBalance: number;
  expiryDate: string;
  buyPrice: number;
  sellPrice: number;
  status: SimCardStatus;
  soldInvoiceNumber?: string;
  soldDate?: string;
  customerName?: string;
  customerPhone?: string;
  customerNik?: string;
  notes?: string;
}export interface DeviceStatusItem {
  deviceType: string;
  name: string;
  status: string; // 'Connected' | 'Disconnected' | 'Virtual' | 'ManualFallback' | 'ManualOnly' | 'Error'
  isOnline: boolean;
  connectionMode: string;
  details?: string;
  fallbackInstruction?: string;
}

export interface HardwareStatus {
  printer: DeviceStatusItem;
  cashDrawer: DeviceStatusItem;
  barcodeScanner: DeviceStatusItem;
  digitalScale: DeviceStatusItem;
  customerDisplay: DeviceStatusItem;
  kitchenDisplay: DeviceStatusItem;
  mobileScanner?: DeviceStatusItem;
  checkedAt: string;
}
