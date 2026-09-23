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
  isConsignment?: boolean;
  consignmentVendorId?: string;
  consignmentVendorPrice?: number;
  consignmentCommissionRate?: number;
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
  promoRuleId?: string;
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
  memberTier?: 'BRONZE' | 'SILVER' | 'GOLD' | 'PLATINUM' | string;
  birthDate?: string;
  notes?: string;
  loyaltyPoints: number;
  depositBalance: number;
  totalReceivable: number;
  creditLimit: number;
  totalSpent?: number;
  visitCount?: number;
  lastVisitDate?: string;
}

export interface CustomerDepositTransaction {
  id: string;
  customerId: string;
  amount: number;
  type: 'TOPUP' | 'PURCHASE_PAYMENT' | 'REFUND' | string;
  paymentMethod: string;
  referenceNumber?: string;
  cashierUserId: string;
  notes?: string;
  balanceAfter: number;
  createdAt: string;
}

export interface CustomerPointHistory {
  id: string;
  customerId: string;
  points: number;
  reason: string;
  referenceOrderNumber?: string;
  createdAt: string;
}

export interface Customer360Profile {
  customer: Customer;
  metrics: {
    totalSpent: number;
    visitCount: number;
    averageOrderValue: number;
    firstVisitDate?: string;
    lastVisitDate?: string;
  };
  topProducts: Array<{
    productId: string;
    productName: string;
    totalQuantity: number;
    totalRevenue: number;
  }>;
  recentOrders: Array<{
    id: string;
    invoiceNumber: string;
    orderDate: string;
    totalAmount: number;
    status: string;
    itemsCount: number;
  }>;
  pointsHistory: CustomerPointHistory[];
  depositHistory: CustomerDepositTransaction[];
}

export interface CustomerAgingSummary {
  totalReceivable: number;
  current: number;    // < 7 hari
  dueSoon: number;    // 7 - 14 hari
  overdue: number;    // 15 - 30 hari
  badDebt: number;    // > 30 hari
  unpaidCount: number;
  customersWithKasbonCount: number;
}

export interface CashDenominations {
  c100k: number;
  c50k: number;
  c20k: number;
  c10k: number;
  c5k: number;
  c2k: number;
  c1k: number;
  coins: number;
}

export interface Shift {
  id: string;
  shiftNumber: string;
  userId: string;
  cashierName: string;
  startTime: string;
  endTime?: string;
  isClosed: boolean;
  shiftTemplateId?: string;
  shiftTemplateName?: string;
  scheduledStartTime?: string;
  scheduledEndTime?: string;
  lateMinutes?: number;
  earlyLeaveMinutes?: number;
  overtimeMinutes?: number;
  attendanceStatus?: string;
  startingCash: number;
  totalCashSales: number;
  totalNonCashSales: number;
  totalCashIn: number;
  totalCashOut: number;
  expectedCash: number;
  actualCashCount?: number;
  cashDiscrepancy?: number;
  totalTransactions: number;
  closingNotes?: string;
  startingCashDenominations?: string;
  closingCashDenominations?: string;
  cashTransactions?: CashTransaction[];
}

export interface ShiftTemplate {
  id: string;
  name: string;
  startTime: string;
  endTime: string;
  gracePeriodMinutes: number;
  isActive: boolean;
  colorTag: string;
  description?: string;
}

export interface EmployeeSchedule {
  id?: string;
  userId: string;
  dayOfWeek: number;
  isWorkDay: boolean;
  shiftTemplateId?: string;
  shiftTemplate?: ShiftTemplate;
  customStartTime?: string;
  customEndTime?: string;
  notes?: string;
}

export interface UserPermission {
  id?: string;
  userId: string;
  targetRole?: string;
  canApplyManualDiscount: boolean;
  canVoidOrderItem: boolean;
  canAccessReports: boolean;
  canEditProductPrice: boolean;
  canOpenCashDrawerDirectly: boolean;
  canAuthorizeCustomerDebt: boolean;
  canModifyInventory: boolean;
  canManagePromotions: boolean;
  canManageUsers: boolean;
}

export interface AttendanceSummary {
  totalShifts: number;
  onTimeCount: number;
  lateCount: number;
  totalLateMinutes: number;
  earlyLeaveCount: number;
  totalEarlyLeaveMinutes: number;
  overtimeCount: number;
  totalOvertimeMinutes: number;
  totalOvertimeHours: number;
  compliancePercent: number;
}

export interface AttendanceRecord {
  id: string;
  shiftNumber: string;
  userId: string;
  cashierName: string;
  startTime: string;
  endTime?: string;
  isClosed: boolean;
  shiftTemplateName?: string;
  scheduledStartTime?: string;
  scheduledEndTime?: string;
  lateMinutes: number;
  earlyLeaveMinutes: number;
  overtimeMinutes: number;
  attendanceStatus: string;
  durationMinutes: number;
  durationHours: number;
  startingCash: number;
  totalCashSales: number;
  totalNonCashSales: number;
  expectedCash: number;
  actualCashCount?: number;
  cashDiscrepancy?: number;
  totalTransactions: number;
  closingNotes?: string;
}

export interface AttendanceAnalytics {
  periodDays: number;
  summary: AttendanceSummary;
  records: AttendanceRecord[];
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

export interface ShiftPaymentBreakdown {
  method: string;
  amount: number;
  count: number;
}

export interface ShiftTopProduct {
  productName: string;
  quantity: number;
  revenue: number;
}

export interface ShiftOrderSummary {
  orderId: string;
  invoiceNumber: string;
  orderDate: string;
  customerName: string;
  totalAmount: number;
  paymentMethods: string;
  status: string;
}

export interface ShiftDashboardData {
  shiftId: string;
  shiftNumber: string;
  userId: string;
  cashierName: string;
  startTime: string;
  durationMinutes: number;
  startingCash: number;
  totalCashSales: number;
  totalNonCashSales: number;
  totalCashIn: number;
  totalCashOut: number;
  expectedCash: number;
  totalTransactions: number;
  grossSales: number;
  totalDiscounts: number;
  netSales: number;
  paymentBreakdown: ShiftPaymentBreakdown[];
  topProducts: ShiftTopProduct[];
  orders: ShiftOrderSummary[];
  cashTransactions: CashTransaction[];
}

export interface ShiftHistoryItem {
  id?: string;
  shiftId: string;
  shiftNumber: string;
  userId: string;
  cashierName: string;
  startTime: string;
  endTime?: string;
  shiftTemplateName?: string;
  lateMinutes?: number;
  earlyLeaveMinutes?: number;
  overtimeMinutes?: number;
  attendanceStatus?: string;
  durationMinutes: number;
  startingCash: number;
  totalCashSales: number;
  totalNonCashSales: number;
  expectedCash: number;
  actualCashCount?: number;
  cashDiscrepancy?: number;
  discrepancy?: number;
  totalTransactions: number;
  netSales: number;
  closingNotes?: string;
  status?: string;
}

export interface ZReport {
  id?: string;
  shiftId?: string;
  shiftNumber: string;
  cashierName: string;
  startTime: string;
  endTime: string;
  startingCash: number;
  totalCashSales: number;
  totalNonCashSales: number;
  totalCashIn: number;
  totalCashOut: number;
  expectedCash: number;
  actualCashCount: number;
  cashDiscrepancy: number;
  totalTransactions: number;
  grossSales: number;
  totalDiscounts: number;
  netSales: number;
  closingNotes?: string;
  closingCashDenominations?: string;
  payments?: ShiftPaymentBreakdown[];
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

export interface HourlySalesPoint {
  hour: number;
  hourLabel: string;
  revenue: number;
  transactions: number;
  isPeak: boolean;
}

export interface DayOfWeekSalesPoint {
  dayIndex: number;
  dayName: string;
  revenue: number;
  transactions: number;
}

export interface TaxAuditSummary {
  taxableSales: number;
  nonTaxableSales: number;
  totalTax: number;
  totalServiceCharge: number;
  totalRounding: number;
}

export interface CashierSalesSummary {
  cashierId: string;
  cashierName: string;
  revenue: number;
  transactions: number;
  averageTicket: number;
  revenueSharePercent: number;
}

export interface PeriodGrowthSummary {
  revenueGrowthPercent: number;
  transactionsGrowthPercent: number;
  profitGrowthPercent: number;
  basketGrowthPercent: number;
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
  hourlyTrend?: HourlySalesPoint[];
  dayOfWeekTrend?: DayOfWeekSalesPoint[];
  taxAudit?: TaxAuditSummary;
  cashierSales?: CashierSalesSummary[];
  periodGrowth?: PeriodGrowthSummary;
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

export interface DeviceChecklistItem {
  key: string;
  label: string;
  status: 'normal' | 'faulty' | 'not_tested';
  notes?: string;
}

export interface ServiceWarrantyCheckResult {
  isFound: boolean;
  query: string;
  ticket?: DeviceServiceTicket;
  isWarrantyActive: boolean;
  remainingWarrantyDays: number;
  warrantyExpiryDate?: string;
}

export interface TechnicianSummaryItem {
  technicianName: string;
  totalAssignedTickets: number;
  activeTickets: number;
  completedTickets: number;
  totalLaborEarned: number;
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
  deviceChecklistJson?: string;
  estimatedCost: number;
  downPayment: number;
  finalCost: number;
  remainingBalance: number;
  status: DeviceServiceStatus;
  assignedTechnicianName?: string;
  technicianNotes?: string;
  warrantyDaysGiven: number;
  warrantyExpiryDate?: string;
  receivedDate: string;
  estimatedCompletionDate?: string;
  completedDate?: string;
  pickedUpDate?: string;
  finalInvoiceNumber?: string;
  items: DeviceServiceItem[];
}

export interface DiagnosticChecklistItem {
  key: string;
  name: string;
  category: 'Screen' | 'Performance' | 'Connectivity' | 'CameraAudio' | 'SecurityBody';
  status: 'Normal' | 'Minus' | 'Rusak' | 'N/A';
  note?: string;
}

export interface TradeInDeductionItem {
  id: string;
  reason: string;
  amount: number;
}

export interface TradeInTransaction {
  id: string;
  tradeInNumber: string;
  orderId?: string;
  newInvoiceNumber?: string;
  customerName: string;
  customerPhone: string;
  customerNik?: string;
  customerAddress?: string;
  deviceBrandModel: string;
  imeiOrSerial?: string;
  conditionGrade: string;
  batteryHealthPercent?: number;
  diagnosticChecklistJson?: string;
  marketEstimatePrice?: number;
  deductionsJson?: string;
  functionalNotes: string;
  accessoriesIncluded: string;
  valuationAmount: number;
  receivedByUserId?: string;
  receivedByStaffName?: string;
  transactionDate: string;
  status: 'Draft' | 'Approved' | 'AppliedInPos' | 'Completed' | 'RestockedForSale' | 'Scrapped' | 'Cancelled';
  targetNewProductId?: string;
  targetNewProductName?: string;
  resultingProductId?: string;
  theftFreeGuaranteeStatement?: boolean;
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

export type PaymentSourceType = 'PETTY_CASH' | 'STORE_SAFE' | 'BANK_TRANSFER' | 'OWNER_POCKET';

export interface Expense {
  id: string;
  expenseNumber: string;
  expenseDate: string;
  categoryId?: string;
  categoryName: string;
  amount: number;
  paymentSource: PaymentSourceType | string;
  shiftId?: string;
  cashTransactionId?: string;
  payee?: string;
  description: string;
  receiptPhotoBase64?: string;
  recordedByUserId?: string;
  recordedByUserName?: string;
  approvalStatus: 'APPROVED' | 'PENDING' | 'REJECTED' | string;
  approvedBySupervisorId?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface ExpenseCategory {
  id: string;
  name: string;
  code: string;
  iconName: string;
  colorTag: string;
  monthlyBudget: number;
  description?: string;
  isDefault: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface ExpenseCategoryBreakdownItem {
  categoryId: string;
  categoryName: string;
  code: string;
  colorTag: string;
  iconName: string;
  totalAmount: number;
  count: number;
  monthlyBudget: number;
  budgetUsagePercent: number;
  percentageOfTotal: number;
}

export interface ExpensePaymentSourceBreakdownItem {
  paymentSource: string;
  label: string;
  totalAmount: number;
  count: number;
  percentage: number;
}

export interface ExpenseDailyTrendItem {
  date: string;
  amount: number;
  count: number;
}

export interface ExpenseSummary {
  totalThisMonth: number;
  totalLastMonth: number;
  monthGrowthPercent: number;
  totalToday: number;
  totalPettyCashShift: number;
  periodTotal: number;
  periodCount: number;
  categoryBreakdown: ExpenseCategoryBreakdownItem[];
  paymentSourceBreakdown: ExpensePaymentSourceBreakdownItem[];
  dailyTrend: ExpenseDailyTrendItem[];
}

export type CouponDiscountType = 'Percentage' | 'FixedAmount';

export interface Coupon {
  id: string;
  code: string;
  name: string;
  description?: string;
  discountType: CouponDiscountType | string;
  discountValue: number;
  minimumSpendAmount: number;
  maxDiscountAmount: number;
  startDate?: string;
  endDate?: string;
  usageLimit: number;
  usageCount: number;
  isActive: boolean;
  allowedCustomerTier: string;
  createdAt: string;
}

export interface ValidateCouponResult {
  isValid: boolean;
  message: string;
  couponCode?: string;
  couponName?: string;
  discountType?: string;
  discountValue: number;
  discountAmount: number;
  finalTotalAfterDiscount: number;
}

export interface LoyaltySettings {
  pointsPerSpendAmount: number;
  redeemValuePerPoint: number;
  minPointsToRedeem: number;
  silverThresholdSpend: number;
  goldThresholdSpend: number;
  platinumThresholdSpend: number;
  silverPointMultiplier: number;
  goldPointMultiplier: number;
  platinumPointMultiplier: number;
}

export type StockTransferStatus = 'Draft' | 'InTransit' | 'Received' | 'PartiallyReceived' | 'Cancelled';

export interface Warehouse {
  id: string;
  code: string;
  name: string;
  address?: string;
  phone?: string;
  picName?: string;
  isDefault: boolean;
  isActive: boolean;
  notes?: string;
  createdAt: string;
  totalUnits?: number;
  activeItemCount?: number;
  totalAssetValue?: number;
}

export interface WarehouseStockItem {
  id: string;
  warehouseId: string;
  productId: string;
  productName: string;
  sku: string;
  barcode?: string;
  unit: string;
  categoryName: string;
  buyPrice: number;
  sellPrice: number;
  currentStock: number;
  minStockAlert: number;
  rackLocation: string;
  stockAssetValue: number;
}

export interface WarehouseStockMatrixRow {
  productId: string;
  productName: string;
  sku: string;
  barcode?: string;
  categoryName: string;
  unit: string;
  buyPrice: number;
  sellPrice: number;
  totalStock: number;
  minStockAlert: number;
  warehouseStocks: Record<string, number>;
  warehouseRacks: Record<string, string>;
  totalAssetValue: number;
}

export interface StockTransferItem {
  id?: string;
  stockTransferId?: string;
  productId: string;
  productName: string;
  productSku: string;
  productBarcode?: string;
  unit: string;
  quantitySent: number;
  quantityReceived: number;
  unitCost: number;
  subtotalValue: number;
  serialNumbersJson?: string;
  status: 'Pending' | 'ReceivedMatch' | 'Discrepancy' | 'Damaged' | 'Surplus' | string;
  notes?: string;
}

export interface StockTransfer {
  id: string;
  transferNumber: string;
  sourceWarehouseId: string;
  sourceWarehouseName: string;
  destinationWarehouseId: string;
  destinationWarehouseName: string;
  transferDate: string;
  status: StockTransferStatus;
  totalItemsCount: number;
  totalQuantitySent: number;
  totalQuantityReceived: number;
  totalAssetValue: number;
  driverOrCourierName?: string;
  vehicleNumber?: string;
  trackingNumber?: string;
  dispatchedAt?: string;
  dispatchedByStaffName?: string;
  receivedAt?: string;
  receivedByStaffName?: string;
  notes?: string;
  discrepancyNotes?: string;
  createdAt: string;
  items: StockTransferItem[];
}

// Consignment (Barang Titipan & Rekonsiliasi Vendor)
export type ConsignmentCommissionType = 'Percentage' | 'FixedCost' | 0 | 1;
export type ConsignmentSettlementStatus = 'Draft' | 'Approved' | 'Paid' | 'Cancelled' | 0 | 1 | 2 | 3;
export type ConsignmentIntakeStatus = 'Active' | 'Completed' | 'Cancelled' | 0 | 1 | 2;
export type ConsignmentReturnStatus = 'Draft' | 'Completed' | 'Cancelled' | 0 | 1 | 2;

export interface ConsignmentVendor {
  id: string;
  vendorCode: string;
  name: string;
  contactPerson?: string;
  phone?: string;
  email?: string;
  address?: string;
  commissionType: ConsignmentCommissionType;
  defaultCommissionRate: number;
  bankName?: string;
  bankAccountNumber?: string;
  bankAccountHolder?: string;
  totalPayableBalance: number;
  totalSettledAmount: number;
  isActive: boolean;
  notes?: string;
  productCount?: number;
  totalStockOnHand?: number;
  totalStockValue?: number;
  settlementCount?: number;
}

export interface ConsignmentProduct {
  id: string;
  name: string;
  sku: string;
  barcode?: string;
  unit: string;
  sellPrice: number;
  buyPrice: number;
  consignmentVendorId: string;
  vendorName: string;
  consignmentVendorPrice: number;
  consignmentCommissionRate: number;
  currentStock: number;
  minStockAlert: number;
  estimatedVendorPayableTotal: number;
  estimatedStoreMarginTotal: number;
}

export interface ConsignmentIntakeItem {
  id?: string;
  productId: string;
  productName: string;
  productSku: string;
  productBarcode?: string;
  quantityReceived: number;
  quantitySold: number;
  quantityReturned: number;
  quantityRemaining: number;
  vendorPrice: number;
  sellPrice: number;
  commissionRatePercent: number;
  commissionType: ConsignmentCommissionType;
  notes?: string;
}

export interface ConsignmentIntake {
  id: string;
  intakeNumber: string;
  vendorId: string;
  vendorName: string;
  intakeDate: string;
  receivedByStaffName?: string;
  status: ConsignmentIntakeStatus;
  totalItemsCount: number;
  totalEstimatedValue: number;
  notes?: string;
  createdAt: string;
  items: ConsignmentIntakeItem[];
}

export interface ConsignmentSettlementItem {
  id?: string;
  productId: string;
  productName: string;
  productSku: string;
  soldQuantity: number;
  unitSellPrice: number;
  totalSalesAmount: number;
  storeCommissionAmount: number;
  vendorPayableAmount: number;
  remainingStockSnapshot: number;
  notes?: string;
}

export interface ConsignmentSettlement {
  id: string;
  settlementNumber: string;
  vendorId: string;
  vendorName: string;
  periodStartDate: string;
  periodEndDate: string;
  settlementDate: string;
  totalSoldQuantity: number;
  totalGrossSales: number;
  totalStoreCommission: number;
  totalVendorPayable: number;
  status: ConsignmentSettlementStatus;
  paymentMethod: string;
  bankDestination?: string;
  paymentReference?: string;
  paidAt?: string;
  processedByStaffName?: string;
  notes?: string;
  createdAt: string;
  items: ConsignmentSettlementItem[];
}

export interface ConsignmentReturnItem {
  id?: string;
  productId: string;
  productName: string;
  productSku: string;
  quantityReturned: number;
  unitVendorPrice: number;
  notes?: string;
}

export interface ConsignmentReturn {
  id: string;
  returnNumber: string;
  vendorId: string;
  vendorName: string;
  returnDate: string;
  status: ConsignmentReturnStatus;
  totalQuantityReturned: number;
  reason?: string;
  processedByStaffName?: string;
  notes?: string;
  createdAt: string;
  items: ConsignmentReturnItem[];
}

// ==========================================
// COMPREHENSIVE FINANCIAL & P&L REPORTING TYPES
// ==========================================

export interface WaterfallItem {
  name: string;
  amount: number;
  type: 'increase' | 'decrease' | 'subtotal' | 'total';
}

export interface ComprehensivePnL {
  periodStart: string;
  periodEnd: string;
  grossSales: number;
  totalDiscounts: number;
  totalReturns: number;
  netSales: number;
  totalCogs: number;
  grossProfit: number;
  grossMarginPercent: number;
  operatingExpenses: {
    total: number;
    breakdown: { category: string; amount: number; count: number }[];
  };
  taxCollected: number;
  serviceCharges: number;
  roundingAdjustments: number;
  netOperatingIncome: number;
  netMarginPercent: number;
  growthComparison: {
    prevPeriodStart: string;
    prevPeriodEnd: string;
    prevNetSales: number;
    prevGrossProfit: number;
    prevNetIncome: number;
    revenueGrowthPercent: number;
    grossProfitGrowthPercent: number;
    netIncomeGrowthPercent: number;
  };
  waterfall: WaterfallItem[];
}

export interface CashFlowStatement {
  periodStart: string;
  periodEnd: string;
  operatingActivities: {
    inflows: {
      posCashSales: number;
      posDigitalSales: number;
      receivableCollections: number;
      otherInflows: number;
      total: number;
    };
    outflows: {
      supplierPayments: number;
      consignmentPayouts: number;
      tradeInPurchases: number;
      operatingExpenses: number;
      salesRefunds: number;
      total: number;
    };
    netOperatingCashFlow: number;
  };
  financingActivities: {
    shiftStartingFloat: number;
    netFinancingCashFlow: number;
  };
  netCashChange: number;
  liquidCashPositions: {
    cashInDrawers: number;
    cashInStoreSafe: number;
    bankAndDigitalAccounts: number;
    totalLiquidCash: number;
  };
}

export interface BalanceSheet {
  asOfDate: string;
  assets: {
    cashAndBank: number;
    accountsReceivable: number;
    merchandiseInventory: number;
    consignmentInventory: number;
    totalAssets: number;
  };
  liabilities: {
    supplierPayable: number;
    consignmentPayable: number;
    customerDeposits: number;
    totalLiabilities: number;
  };
  equity: {
    initialOwnerCapital: number;
    retainedEarnings: number;
    totalEquity: number;
  };
  financialRatios: {
    currentRatio: number;
    quickRatio: number;
    debtToEquityPercent: number;
  };
}

export interface ProductQuadrantItem {
  productId: string;
  productName: string;
  sku: string;
  quantitySold: number;
  revenue: number;
  cogs: number;
  grossProfit: number;
  marginPercentage: number;
}

export interface MarginMatrixData {
  periodStart: string;
  periodEnd: string;
  averageStoreMargin: number;
  medianSalesVolume: number;
  categoryProfits: {
    categoryId: string;
    categoryName: string;
    quantitySold: number;
    revenue: number;
    cogs: number;
    grossProfit: number;
    marginPercentage: number;
  }[];
  bcgQuadrants: {
    stars: { count: number; label: string; description: string; items: ProductQuadrantItem[] };
    cashCows: { count: number; label: string; description: string; items: ProductQuadrantItem[] };
    opportunities: { count: number; label: string; description: string; items: ProductQuadrantItem[] };
    underperformers: { count: number; label: string; description: string; items: ProductQuadrantItem[] };
  };
  discountErosion: {
    totalDiscountsGiven: number;
    potentialGrossProfit: number;
    marginErosionPercent: number;
  };
}

export interface GeneralLedgerAccount {
  id: string;
  accountCode: string;
  accountName: string;
  type: string;
  debit: number;
  credit: number;
  balance: number;
}

export interface GeneralLedgerData {
  totalAccounts: number;
  accounts: GeneralLedgerAccount[];
}

// Payment Gateway & EDC Card Types
export interface QrisSessionResponse {
  referenceId: string;
  invoiceNumber: string;
  amount: number;
  qrisPayload: string;
  qrisDataUrl: string;
  status: 'PENDING' | 'SETTLED' | 'EXPIRED' | 'CANCELLED';
  createdAt: string;
  expiresAt: string;
  issuer?: string | null;
  rrn?: string | null;
  provider: string;
}

export interface QrisStatusResponse {
  referenceId: string;
  invoiceNumber: string;
  amount: number;
  status: 'PENDING' | 'SETTLED' | 'EXPIRED' | 'NOT_FOUND';
  isSettled: boolean;
  issuer?: string | null;
  rrn?: string | null;
  settledAt?: string | null;
  message: string;
}

export interface EdcEcrTriggerRequest {
  amount: number;
  invoiceNumber: string;
  bank: string;
  cardType: string;
  ecrHost?: string;
  ecrPort?: number;
  comPort?: string;
}

export interface EdcEcrTriggerResponse {
  success: boolean;
  responseCode: string;
  approvalCode: string;
  cardNumber: string;
  cardType: string;
  bank: string;
  message: string;
  traceNumber: string;
}

export interface PaymentGatewaySettings {
  qrisProvider: 'SIMULATOR' | 'MIDTRANS' | 'XENDIT' | 'TRIPAY' | 'EMVCO_DYNAMIC';
  qrisNmid: string;
  qrisMerchantName: string;
  qrisMerchantCity: string;
  qrisServerKey: string;
  qrisClientKey: string;
  edcIntegrationMode: 'STANDALONE' | 'ECR_DIRECT_LINK';
  edcDefaultBank: string;
  edcEcrIp: string;
  edcEcrPort: number;
  edcEcrComPort: string;
  edcSurchargePercent: number;
}





