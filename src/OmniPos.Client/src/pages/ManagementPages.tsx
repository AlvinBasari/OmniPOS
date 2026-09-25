import React, { useState, useEffect, useRef } from 'react';
import { 
  Boxes, 
  Users, 
  BarChart3, 
  HardDriveDownload, 
  Database,
  Settings, 
  Plus, 
  Search, 
  Cloud, 
  CloudOff,
  HardDrive,
  ShieldCheck, 
  RefreshCw, 
  CheckCircle2,
  FileSpreadsheet,
  Printer,
  Palette,
  AlertCircle,
  UserCheck,
  KeyRound,
  Lock,
  UserX,
  Edit3,
  ShieldAlert,
  Upload,
  Download,
  Package,
  Layers,
  Trash2,
  TrendingUp,
  AlertTriangle,
  Flame,
  Save,
  DollarSign,
  Calendar,
  Monitor,
  ExternalLink,
  MessageSquare,
  Receipt,
  CreditCard,
  History,
  X,
  Phone,
  Barcode as BarcodeIcon,
  Briefcase,
  Utensils,
  ChefHat,
  Wrench,
  ShoppingCart,
  ClipboardList,
  RotateCcw,
  Smartphone,
  FolderTree,
  Calculator,
  Wand2,
  Sparkles,
  Percent,
  Scan,
  Hash,
  Wallet,
  Award,
  Cake,
  Gift,
  ChevronRight,
  UserPlus,
  Tag,
  ArrowDownToLine,
  Clock,
  CalendarDays,
  FileDown,
  Timer,
  Check,
  CheckSquare,
  Square,
  Sliders,
  Shield,
  Activity,
  LogOut
} from 'lucide-react';
import { 
  BackupHistory, 
  Customer, 
  CustomerAgingSummary, 
  Product, 
  ProductUnitConversion, 
  SalesSummary, 
  User, 
  UserRole,
  ShiftTemplate,
  EmployeeSchedule,
  UserPermission,
  AttendanceAnalytics,
  AttendanceRecord,
  AttendanceSummary
} from '../types';
import { useShiftStore, useThemeStore } from '../store/useShiftAndThemeStores';
import { useBusinessModeStore } from '../store/useBusinessModeStore';
import { useToastStore } from '../store/useToastStore';
import { useAuthStore } from '../store/useAuthStore';
import { RoundingRuleType, useSettingsStore } from '../store/useSettingsStore';
import { useHardwareStore } from '../store/useHardwareStore';
import { QuickBarcodePrintModal } from '../components/modals/QuickBarcodePrintModal';
import { GoogleDriveSetupModal } from '../components/modals/GoogleDriveSetupModal';
import { CategoryManagementModal } from '../components/modals/CategoryManagementModal';
import { ProductBarcodeScanModal } from '../components/modals/ProductBarcodeScanModal';
import { QuickStockInModal } from '../components/modals/QuickStockInModal';
import { CustomerFormModal } from '../components/modals/CustomerFormModal';
import { CustomerProfile360Drawer } from '../components/modals/CustomerProfile360Drawer';
import { CustomerDepositModal } from '../components/modals/CustomerDepositModal';
import { CustomerStatementThermalModal } from '../components/modals/CustomerStatementThermalModal';
import { 
  DailySalesTrendChart, 
  PaymentDistributionChart, 
  CategoryMarginChart, 
  FinancialWaterfallChart,
  HourlySalesChart,
  TaxAndServiceAuditCard,
  CashierPerformanceTable,
  PeriodGrowthBadge
} from '../components/reports/FinancialCharts';
import { FormalReportPrintModal } from '../components/modals/FormalReportPrintModal';
import { playScanBeep } from '../store/useCartStore';

const DEFAULT_UNITS = [
  'PCS', 'KG', 'GRAM', 'ONS', 'LITER', 'ML',
  'PACK', 'DUS', 'LUSIN', 'KODI', 'BOTOL', 'KALENG',
  'STRIP', 'TABLET', 'PORSI', 'CUP', 'SAK', 'POUCH',
  'METER', 'LEMBAR', 'ROLL', 'UNIT', 'SET', 'JASA'
];

function generateEan13(): string {
  const prefix = '899';
  const randomPart = Math.floor(100000000 + Math.random() * 900000000).toString();
  const base12 = (prefix + randomPart).slice(0, 12);
  let sum = 0;
  for (let i = 0; i < 12; i++) {
    const digit = parseInt(base12[i], 10);
    sum += (i % 2 === 0) ? digit : digit * 3;
  }
  const checkDigit = (10 - (sum % 10)) % 10;
  return base12 + checkDigit.toString();
}

// ==========================================
// 1. INVENTORY & STOCK PAGE (WITH CSV & UNIT CONVERSION)
// ==========================================
export const InventoryPage: React.FC = () => {
  const { mode } = useBusinessModeStore();
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState<'all' | 'wholesale' | 'low_stock' | 'out_of_stock'>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');

  // Add / Edit Product Modal State
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [formName, setFormName] = useState('');
  const [formSku, setFormSku] = useState('');
  const [formBarcode, setFormBarcode] = useState('');
  const [formCategoryId, setFormCategoryId] = useState('');
  const [formBuyPrice, setFormBuyPrice] = useState('0');
  const [formSellPrice, setFormSellPrice] = useState('0');
  const [formWholesalePrice, setFormWholesalePrice] = useState('');
  const [formWholesaleMinQty, setFormWholesaleMinQty] = useState('');
  const [formCurrentStock, setFormCurrentStock] = useState('0');
  const [formMinStockAlert, setFormMinStockAlert] = useState('5');
  const [formUnit, setFormUnit] = useState('PCS');
  const [isSavingProduct, setIsSavingProduct] = useState(false);

  // Category Modal & Quick Add
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [isQuickAddCategory, setIsQuickAddCategory] = useState(false);
  const [quickCategoryName, setQuickCategoryName] = useState('');
  const [isSavingQuickCat, setIsSavingQuickCat] = useState(false);

  // Barcode Camera Scan Modal
  const [isBarcodeScanModalOpen, setIsBarcodeScanModalOpen] = useState(false);
  const [latestMobileScan, setLatestMobileScan] = useState<string | null>(null);
  const { isMobileScannerEnabled: isHpSyncEnabled, setIsMobileScannerEnabled: setIsHpSyncEnabled } = useHardwareStore();
  const mobileProcessedScanIdsRef = useRef<Set<string>>(new Set());

  // Units State & Quick Add Custom Unit
  const [availableUnits, setAvailableUnits] = useState<string[]>(DEFAULT_UNITS);
  const [isQuickAddUnit, setIsQuickAddUnit] = useState(false);
  const [quickUnitName, setQuickUnitName] = useState('');
  const [isSavingQuickUnit, setIsSavingQuickUnit] = useState(false);

  // Smart Pricing Calculator
  const [pricingMode, setPricingMode] = useState<'smart' | 'manual'>('smart');
  const [smartMarginPercent, setSmartMarginPercent] = useState('30');
  const [smartTaxPercent, setSmartTaxPercent] = useState('0');
  const [smartRounding, setSmartRounding] = useState<'none' | '100' | '500' | '1000'>('500');

  // CSV Import Modal
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [csvRawText, setCsvRawText] = useState('');
  const [isImporting, setIsImporting] = useState(false);

  // Multi-Unit Conversion Modal
  const [selectedProductForUnits, setSelectedProductForUnits] = useState<Product | null>(null);
  const [unitConversions, setUnitConversions] = useState<ProductUnitConversion[]>([]);
  const [newUnitName, setNewUnitName] = useState('DUS');
  const [newConversionFactor, setNewConversionFactor] = useState(40);
  const [newUnitBarcode, setNewUnitBarcode] = useState('');
  const [newUnitSellPrice, setNewUnitSellPrice] = useState(0);
  // Stock Ledger (Mutations) Modal
  const [selectedProductForLedger, setSelectedProductForLedger] = useState<Product | null>(null);
  const [productMutations, setProductMutations] = useState<any[]>([]);
  const [isLoadingMutations, setIsLoadingMutations] = useState(false);
  // Quick Barcode Print Modal
  const [selectedProductForBarcode, setSelectedProductForBarcode] = useState<Product | null>(null);
  // Quick Stock In Modal
  const [isQuickStockInOpen, setIsQuickStockInOpen] = useState(false);
  const [quickStockInProduct, setQuickStockInProduct] = useState<Product | null>(null);

  // Inventory Analytics (Fase 4: Fast Moving vs Dead Stock)
  const [viewMode, setViewMode] = useState<'products' | 'analytics'>('products');
  const [analyticsData, setAnalyticsData] = useState<any>(null);
  const [analyticsPeriod, setAnalyticsPeriod] = useState(30);
  const [isLoadingAnalytics, setIsLoadingAnalytics] = useState(false);
  const [analyticsTab, setAnalyticsTab] = useState<'fast' | 'dead' | 'slow' | 'reorder' | 'abc'>('fast');

  const fetchAnalytics = async (period: number = analyticsPeriod) => {
    try {
      setIsLoadingAnalytics(true);
      const res = await fetch(`/api/v1/inventory/analytics?days=${period}`);
      if (res.ok) setAnalyticsData(await res.json());
    } catch {
      useToastStore.getState().showToast('Gagal memuat data analitik inventori.', 'error');
    } finally { setIsLoadingAnalytics(false); }
  };

  const handleOpenQuickStockIn = (p: Product, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setQuickStockInProduct(p);
    setIsQuickStockInOpen(true);
  };

  const openStockLedger = async (p: Product) => {
    setSelectedProductForLedger(p);
    setIsLoadingMutations(true);
    try {
      const res = await fetch(`/api/v1/inventory/products/${p.id}/mutations`);
      if (res.ok) {
        const data = await res.json();
        setProductMutations(data.mutations || []);
      }
    } catch {}
    setIsLoadingMutations(false);
  };

  const fetchProducts = () => {
    setIsLoading(true);
    fetch(`/api/v1/products?mode=${mode}`)
      .then((r) => r.json())
      .then((d) => setProducts(d))
      .catch(() => {})
      .finally(() => setIsLoading(false));
  };

  const fetchCategories = () => {
    fetch(`/api/v1/categories?mode=${mode}`)
      .then(r => r.json())
      .then(d => setCategories(d))
      .catch(() => {});
  };

  const fetchUnits = async () => {
    try {
      const res = await fetch('/api/v1/system/units');
      if (res.ok) {
        const data = await res.json();
        if (data.allUnits && Array.isArray(data.allUnits)) {
          setAvailableUnits(data.allUnits);
        }
      }
    } catch {}
  };

  useEffect(() => {
    fetchProducts();
    fetchCategories();
    fetchUnits();
  }, [mode]);

  // Mobile Android / iPhone Scanner Listener during Add/Edit Product
  useEffect(() => {
    if (!isProductModalOpen) return;

    let isMounted = true;
    const pollMobileScans = async () => {
      try {
        const res = await fetch('/api/v1/hardware/mobile-scan/poll');
        if (res.ok && isMounted) {
          const data = await res.json();
          if (Array.isArray(data.scans) && data.scans.length > 0) {
            const latest = data.scans[data.scans.length - 1];
            if (latest && latest.barcode) {
              setLatestMobileScan(latest.barcode);
              if (latest.id && !mobileProcessedScanIdsRef.current.has(latest.id)) {
                mobileProcessedScanIdsRef.current.add(latest.id);
                const scanTime = new Date(latest.timestamp).getTime();
                // If scanned recently (within 90 seconds)
                if (Date.now() - scanTime < 90000) {
                  if (isHpSyncEnabled) {
                    setFormBarcode(latest.barcode);
                    playScanBeep();
                    useToastStore.getState().showToast(
                      `Barcode dari ${latest.deviceName || 'HP'}: ${latest.barcode} otomatis terisi!`,
                      'success'
                    );
                  } else {
                    useToastStore.getState().showToast(
                      `HP mendeteksi: ${latest.barcode} (Sync HP sedang OFF - klik tombol pill untuk pasang)`,
                      'info'
                    );
                  }
                }
              }
            }
          }
        }
      } catch {}
    };

    pollMobileScans();
    const interval = setInterval(pollMobileScans, 1200);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [isProductModalOpen, isHpSyncEnabled]);

  const calculateSmartPrice = (
    buyVal?: string,
    marginVal?: string,
    taxVal?: string,
    roundingVal?: string
  ) => {
    const buy = parseFloat(buyVal !== undefined ? buyVal : formBuyPrice) || 0;
    const margin = parseFloat(marginVal !== undefined ? marginVal : smartMarginPercent) || 0;
    const tax = parseFloat(taxVal !== undefined ? taxVal : smartTaxPercent) || 0;
    const rounding = roundingVal !== undefined ? roundingVal : smartRounding;

    const marginAmt = buy * (margin / 100);
    const preTax = buy + marginAmt;
    const taxAmt = preTax * (tax / 100);
    let total = preTax + taxAmt;

    if (rounding === '100') {
      total = Math.ceil(total / 100) * 100;
    } else if (rounding === '500') {
      total = Math.ceil(total / 500) * 500;
    } else if (rounding === '1000') {
      total = Math.ceil(total / 1000) * 1000;
    }

    return Math.round(total);
  };

  const updateSmartPricing = (
    newBuy?: string,
    newMargin?: string,
    newTax?: string,
    newRounding?: string
  ) => {
    if (newBuy !== undefined) setFormBuyPrice(newBuy);
    if (newMargin !== undefined) setSmartMarginPercent(newMargin);
    if (newTax !== undefined) setSmartTaxPercent(newTax);
    if (newRounding !== undefined) setSmartRounding(newRounding as any);

    const calculated = calculateSmartPrice(newBuy, newMargin, newTax, newRounding);
    setFormSellPrice(calculated.toString());
  };

  const handleQuickAddCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickCategoryName.trim()) return;
    setIsSavingQuickCat(true);
    try {
      const res = await fetch(`/api/v1/categories?mode=${mode}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: quickCategoryName.trim() })
      });
      if (res.ok) {
        const created = await res.json();
        setCategories(prev => [...prev, created]);
        setFormCategoryId(created.id);
        setQuickCategoryName('');
        setIsQuickAddCategory(false);
        useToastStore.getState().showToast(`Kategori "${created.name}" berhasil dibuat!`, 'success');
      }
    } catch {
      useToastStore.getState().showToast('Gagal membuat kategori.', 'error');
    } finally {
      setIsSavingQuickCat(false);
    }
  };

  const handleQuickAddUnit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickUnitName.trim()) return;
    const unitUpper = quickUnitName.trim().toUpperCase();
    setIsSavingQuickUnit(true);
    try {
      const res = await fetch('/api/v1/system/units', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ unitName: unitUpper })
      });
      if (res.ok) {
        if (!availableUnits.includes(unitUpper)) {
          setAvailableUnits(prev => [...prev, unitUpper].sort());
        }
        setFormUnit(unitUpper);
        setQuickUnitName('');
        setIsQuickAddUnit(false);
        useToastStore.getState().showToast(`Satuan "${unitUpper}" berhasil ditambahkan!`, 'success');
      }
    } catch {
      useToastStore.getState().showToast('Gagal menambahkan satuan.', 'error');
    } finally {
      setIsSavingQuickUnit(false);
    }
  };

  const handleOpenAddProduct = () => {
    setEditingProduct(null);
    setFormName('');
    setFormSku(`PRD-${Date.now().toString().slice(-6)}`);
    setFormBarcode(generateEan13());
    setFormCategoryId(categories[0]?.id || '');
    setFormBuyPrice('10000');
    setPricingMode('smart');
    setSmartMarginPercent('30');
    setSmartTaxPercent('0');
    setSmartRounding('500');
    const initialSell = calculateSmartPrice('10000', '30', '0', '500');
    setFormSellPrice(initialSell.toString());
    setFormWholesalePrice('');
    setFormWholesaleMinQty('');
    setFormCurrentStock('0');
    setFormMinStockAlert('5');
    setFormUnit('PCS');
    setIsQuickAddCategory(false);
    setIsQuickAddUnit(false);
    setIsProductModalOpen(true);

    // Cek apakah ada scan terbaru dari HP
    fetch('/api/v1/hardware/mobile-scan/poll')
      .then(r => r.json())
      .then(d => {
        if (Array.isArray(d.scans) && d.scans.length > 0) {
          const last = d.scans[d.scans.length - 1];
          if (last && last.barcode) {
            setLatestMobileScan(last.barcode);
          }
        }
      })
      .catch(() => {});
  };

  const handleOpenEditProduct = (p: Product) => {
    setEditingProduct(p);
    setFormName(p.name);
    setFormSku(p.sku);
    setFormBarcode(p.barcode || '');
    setFormCategoryId(p.categoryId || '');
    setFormBuyPrice(p.buyPrice.toString());
    setFormSellPrice(p.sellPrice.toString());
    setFormWholesalePrice(p.wholesalePrice ? p.wholesalePrice.toString() : '');
    setFormWholesaleMinQty(p.wholesaleMinQty ? p.wholesaleMinQty.toString() : '');
    setFormCurrentStock(p.currentStock.toString());
    setFormMinStockAlert(p.minStockAlert.toString());
    setFormUnit(p.unit || 'PCS');
    setPricingMode('manual');
    if (p.buyPrice > 0 && p.sellPrice > p.buyPrice) {
      const margin = Math.round(((p.sellPrice - p.buyPrice) / p.buyPrice) * 100);
      setSmartMarginPercent(margin.toString());
    } else {
      setSmartMarginPercent('30');
    }
    setSmartTaxPercent('0');
    setSmartRounding('500');
    setIsQuickAddCategory(false);
    setIsQuickAddUnit(false);
    setIsProductModalOpen(true);
  };

  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) {
      useToastStore.getState().showToast('Nama produk wajib diisi!', 'warning');
      return;
    }

    setIsSavingProduct(true);
    const payload = {
      name: formName.trim(),
      sku: formSku.trim(),
      barcode: formBarcode.trim() || formSku.trim(),
      categoryId: formCategoryId || undefined,
      businessMode: mode,
      buyPrice: parseFloat(formBuyPrice) || 0,
      sellPrice: parseFloat(formSellPrice) || 0,
      wholesalePrice: formWholesalePrice ? parseFloat(formWholesalePrice) : undefined,
      wholesaleMinQty: formWholesaleMinQty ? parseFloat(formWholesaleMinQty) : undefined,
      currentStock: parseFloat(formCurrentStock) || 0,
      minStockAlert: parseFloat(formMinStockAlert) || 5,
      unit: formUnit.trim().toUpperCase() || 'PCS'
    };

    try {
      const url = editingProduct ? `/api/v1/products/${editingProduct.id}?mode=${mode}` : `/api/v1/products?mode=${mode}`;
      const method = editingProduct ? 'PUT' : 'POST';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        useToastStore.getState().showToast(editingProduct ? 'Produk berhasil diperbarui!' : 'Produk baru berhasil ditambahkan!', 'success');
        setIsProductModalOpen(false);
        fetchProducts();
      } else {
        useToastStore.getState().showToast('Gagal menyimpan produk.', 'error');
      }
    } catch {
      useToastStore.getState().showToast('Terjadi kesalahan jaringan.', 'error');
    } finally {
      setIsSavingProduct(false);
    }
  };

  const handleDeleteProduct = async (p: Product) => {
    if (!window.confirm(`Yakin ingin menghapus produk "${p.name}"?`)) return;

    try {
      const res = await fetch(`/api/v1/products/${p.id}`, { method: 'DELETE' });
      if (res.ok) {
        useToastStore.getState().showToast(`Produk "${p.name}" berhasil dihapus.`, 'info');
        fetchProducts();
      } else {
        useToastStore.getState().showToast('Gagal menghapus produk.', 'error');
      }
    } catch {
      useToastStore.getState().showToast('Gagal menghapus produk.', 'error');
    }
  };

  const handleDownloadTemplate = () => {
    window.open('/api/v1/products/template-csv', '_blank');
    useToastStore.getState().showToast('Mengunduh template CSV produk...', 'info');
  };

  const handleExportCsv = () => {
    window.open(`/api/v1/products/export-csv?mode=${mode}`, '_blank');
    useToastStore.getState().showToast('Mengunduh katalog produk CSV...', 'info');
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      setCsvRawText(event.target?.result as string || '');
    };
    reader.readAsText(file);
  };

  const handleExecuteImport = async () => {
    if (!csvRawText.trim()) {
      useToastStore.getState().showToast('Konten CSV masih kosong.', 'warning');
      return;
    }

    try {
      setIsImporting(true);
      const res = await fetch(`/api/v1/products/import-csv?mode=${mode}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ csvContent: csvRawText })
      });

      const data = await res.json();
      if (res.ok) {
        useToastStore.getState().showToast(
          `Impor Berhasil: ${data.importedCount} produk baru ditambahkan, ${data.updatedCount} produk diperbarui!`,
          'success'
        );
        setIsImportModalOpen(false);
        setCsvRawText('');
        fetchProducts();
      } else {
        useToastStore.getState().showToast(data.message || 'Gagal memproses impor CSV.', 'error');
      }
    } catch {
      useToastStore.getState().showToast('Gagal menghubungi server.', 'error');
    } finally {
      setIsImporting(false);
    }
  };

  // Open Unit Conversions Modal
  const openUnitConversions = async (p: Product) => {
    setSelectedProductForUnits(p);
    setNewUnitName('DUS');
    setNewConversionFactor(40);
    setNewUnitBarcode(p.barcode ? `${p.barcode}-DUS` : '');
    setNewUnitSellPrice(p.sellPrice * 38); // Sample default wholesale box price

    try {
      const res = await fetch(`/api/v1/products/${p.id}/unit-conversions`);
      if (res.ok) {
        const list = await res.json();
        setUnitConversions(list);
      }
    } catch {}
  };

  const handleAddUnitConversion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProductForUnits) return;

    try {
      const res = await fetch(`/api/v1/products/${selectedProductForUnits.id}/unit-conversions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          unitName: newUnitName.trim().toUpperCase(),
          conversionFactor: newConversionFactor,
          barcode: newUnitBarcode.trim() || undefined,
          sellPrice: newUnitSellPrice
        })
      });

      if (res.ok) {
        const created = await res.json();
        setUnitConversions([...unitConversions, created]);
        useToastStore.getState().showToast(`Satuan ${newUnitName} berhasil disimpan!`, 'success');
        setNewUnitName('LUSIN');
        setNewConversionFactor(12);
        setNewUnitBarcode('');
        setNewUnitSellPrice(selectedProductForUnits.sellPrice * 11.5);
      }
    } catch {
      useToastStore.getState().showToast('Gagal menyimpan satuan kemasan.', 'error');
    }
  };

  const handleDeleteUnitConversion = async (id: string) => {
    try {
      const res = await fetch(`/api/v1/products/unit-conversions/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setUnitConversions(unitConversions.filter(u => u.id !== id));
        useToastStore.getState().showToast('Satuan kemasan dihapus.', 'info');
      }
    } catch {}
  };

  const totalSku = products.length;
  const totalAssetValue = products.reduce((acc, p) => acc + (p.currentStock * p.buyPrice), 0);
  const wholesaleCount = products.filter(p => p.wholesalePrice && p.wholesalePrice > 0).length;
  const lowStockCount = products.filter(p => p.currentStock <= p.minStockAlert && p.currentStock > 0).length;
  const outOfStockCount = products.filter(p => p.currentStock <= 0).length;

  const filtered = products.filter((p) => {
    const matchSearch =
      p.name.toLowerCase().includes(search.toLowerCase()) || 
      p.sku.toLowerCase().includes(search.toLowerCase()) ||
      (p.barcode && p.barcode.includes(search));

    const matchCategory =
      categoryFilter === 'all' || 
      p.categoryId === categoryFilter || 
      (p.category?.name && p.category.name.toLowerCase() === categoryFilter.toLowerCase());

    let matchStatus = true;
    if (statusFilter === 'wholesale') {
      matchStatus = Boolean(p.wholesalePrice && p.wholesalePrice > 0);
    } else if (statusFilter === 'low_stock') {
      matchStatus = p.currentStock <= p.minStockAlert && p.currentStock > 0;
    } else if (statusFilter === 'out_of_stock') {
      matchStatus = p.currentStock <= 0;
    }

    return matchSearch && matchCategory && matchStatus;
  });

  return (
    <div className="flex-1 flex flex-col bg-app overflow-hidden select-none">
      <div className="p-4 bg-surface border-b border-border-subtle flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center font-bold">
            <Boxes className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-text-primary">
              {mode === 'Retail' ? 'Stok & Grosir Ritel Supermarket' : 'Manajemen Katalog & Inventori Stok'}
            </h2>
            <p className="text-xs text-text-secondary">
              {mode === 'Retail'
                ? 'Kelola inventori barang, penetapan harga grosir bertingkat, konversi dus/lusin, & HPP'
                : 'Kelola produk, barcode satuan/dus, HPP modal, konversi kemasan, & impor CSV masal'}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="relative w-56">
            <Search className="w-4 h-4 text-text-muted absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari barcode, SKU, nama..."
              className="w-full pl-9 pr-3 py-1.5 bg-card border border-border-strong rounded-md text-xs text-text-primary focus:outline-none focus:border-primary"
            />
          </div>

          <button
            onClick={handleOpenAddProduct}
            className="px-3 py-1.5 bg-primary hover:bg-primary-hover text-primary-text rounded-md text-xs font-bold flex items-center gap-1.5 shadow-sm active:scale-95 transition-all"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Tambah Produk</span>
          </button>

          <button
            onClick={() => setIsCategoryModalOpen(true)}
            className="px-2.5 py-1.5 bg-card hover:bg-card-hover border border-border-strong rounded-md text-xs font-bold text-text-primary flex items-center gap-1.5 shadow-xs"
            title="Kelola Daftar Kategori Produk"
          >
            <FolderTree className="w-3.5 h-3.5 text-primary" />
            <span>Kategori</span>
          </button>

          <button 
            onClick={handleDownloadTemplate}
            className="px-2.5 py-1.5 bg-card hover:bg-card-hover border border-border-subtle rounded-md text-xs font-semibold text-text-secondary flex items-center gap-1.5"
            title="Download Format Excel/CSV untuk Isi Data Produk"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Template</span>
          </button>

          <button 
            onClick={() => setIsImportModalOpen(true)}
            className="px-2.5 py-1.5 bg-emerald-600/10 hover:bg-emerald-600/20 text-emerald-600 border border-emerald-600/30 rounded-md text-xs font-bold flex items-center gap-1.5"
            title="Upload ratusan produk sekaligus"
          >
            <Upload className="w-3.5 h-3.5" />
            <span>Impor CSV</span>
          </button>

          <button 
            onClick={handleExportCsv}
            className="px-2.5 py-1.5 bg-card hover:bg-card-hover border border-border-subtle rounded-md text-xs font-semibold text-text-secondary flex items-center gap-1.5"
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            <span>Ekspor</span>
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* KPI Dashboard Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div 
            onClick={() => setStatusFilter('all')}
            className={`p-3.5 rounded-xl border transition-all cursor-pointer shadow-xs ${
              statusFilter === 'all'
                ? 'bg-primary/10 border-primary/40 ring-1 ring-primary/40' 
                : 'bg-card border-border-subtle hover:border-border-strong'
            }`}
          >
            <div className="flex items-center justify-between text-text-secondary text-[11px] font-bold">
              <span>Total SKU Terdaftar</span>
              <Boxes className="w-4 h-4 text-primary" />
            </div>
            <p className="text-lg font-black font-mono text-text-primary mt-1">{totalSku} <span className="text-[10px] font-sans font-normal text-text-muted">Item</span></p>
            <p className="text-[10px] text-text-muted mt-0.5">Katalog aktif di toko</p>
          </div>

          <div className="p-3.5 rounded-xl border bg-card border-border-subtle shadow-xs">
            <div className="flex items-center justify-between text-text-secondary text-[11px] font-bold">
              <span>Valuasi Aset Stok</span>
              <DollarSign className="w-4 h-4 text-emerald-600" />
            </div>
            <p className="text-lg font-black font-mono text-emerald-600 dark:text-emerald-400 mt-1">
              Rp {totalAssetValue.toLocaleString('id-ID')}
            </p>
            <p className="text-[10px] text-text-muted mt-0.5">Total nilai modal berjalan (HPP)</p>
          </div>

          <div 
            onClick={() => setStatusFilter(statusFilter === 'wholesale' ? 'all' : 'wholesale')}
            className={`p-3.5 rounded-xl border transition-all cursor-pointer shadow-xs ${
              statusFilter === 'wholesale'
                ? 'bg-emerald-500/15 border-emerald-500/40 ring-1 ring-emerald-500/40' 
                : 'bg-card border-border-subtle hover:border-border-strong'
            }`}
          >
            <div className="flex items-center justify-between text-text-secondary text-[11px] font-bold">
              <span>Skema Grosir Aktif</span>
              <Tag className="w-4 h-4 text-emerald-600" />
            </div>
            <p className="text-lg font-black font-mono text-emerald-700 dark:text-emerald-400 mt-1">
              {wholesaleCount} <span className="text-[10px] font-sans font-normal text-text-muted">SKU</span>
            </p>
            <p className="text-[10px] text-emerald-700 dark:text-emerald-300 font-medium mt-0.5">
              {wholesaleCount > 0 ? `${Math.round((wholesaleCount / (totalSku || 1)) * 100)}% katalog siap grosir` : 'Belum diset'}
            </p>
          </div>

          <div 
            onClick={() => setStatusFilter(statusFilter === 'low_stock' ? 'all' : 'low_stock')}
            className={`p-3.5 rounded-xl border transition-all cursor-pointer shadow-xs ${
              statusFilter === 'low_stock' || statusFilter === 'out_of_stock'
                ? 'bg-amber-500/15 border-amber-500/40 ring-1 ring-amber-500/40' 
                : 'bg-card border-border-subtle hover:border-border-strong'
            }`}
          >
            <div className="flex items-center justify-between text-text-secondary text-[11px] font-bold">
              <span>Stok Kritis / Habis</span>
              <AlertTriangle className={`w-4 h-4 ${lowStockCount + outOfStockCount > 0 ? 'text-amber-500' : 'text-text-muted'}`} />
            </div>
            <p className={`text-lg font-black font-mono mt-1 ${lowStockCount + outOfStockCount > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-text-primary'}`}>
              {lowStockCount + outOfStockCount} <span className="text-[10px] font-sans font-normal text-text-muted">SKU</span>
            </p>
            <p className="text-[10px] text-text-muted mt-0.5">
              {outOfStockCount > 0 ? `${outOfStockCount} habis, ${lowStockCount} menipis` : lowStockCount > 0 ? `${lowStockCount} butuh restock` : 'Stok aman'}
            </p>
          </div>
        </div>

        {/* Filter Toolbar: Status Tabs & Category Dropdown */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
          <div className="flex flex-wrap items-center gap-1.5 p-1 bg-subtle rounded-xl border border-border-subtle text-xs">
            <button
              onClick={() => { setViewMode('products'); setStatusFilter('all'); }}
              className={`px-3 py-1.5 rounded-lg font-bold transition-all ${
                viewMode === 'products' && statusFilter === 'all' 
                  ? 'bg-surface text-primary shadow-xs' 
                  : 'text-text-secondary hover:text-text-primary'
              }`}
            >
              Semua ({totalSku})
            </button>
            <button
              onClick={() => { setViewMode('products'); setStatusFilter('wholesale'); }}
              className={`px-3 py-1.5 rounded-lg font-bold flex items-center gap-1.5 transition-all ${
                viewMode === 'products' && statusFilter === 'wholesale' 
                  ? 'bg-surface text-emerald-700 dark:text-emerald-400 shadow-xs' 
                  : 'text-text-secondary hover:text-emerald-700'
              }`}
            >
              <Tag className="w-3 h-3" />
              <span>Grosir Aktif ({wholesaleCount})</span>
            </button>
            <button
              onClick={() => { setViewMode('products'); setStatusFilter('low_stock'); }}
              className={`px-3 py-1.5 rounded-lg font-bold flex items-center gap-1.5 transition-all ${
                viewMode === 'products' && statusFilter === 'low_stock' 
                  ? 'bg-surface text-amber-600 dark:text-amber-400 shadow-xs' 
                  : 'text-text-secondary hover:text-amber-600'
              }`}
            >
              <AlertTriangle className="w-3 h-3" />
              <span>Stok Menipis ({lowStockCount})</span>
            </button>
            <button
              onClick={() => { setViewMode('products'); setStatusFilter('out_of_stock'); }}
              className={`px-3 py-1.5 rounded-lg font-bold flex items-center gap-1.5 transition-all ${
                viewMode === 'products' && statusFilter === 'out_of_stock' 
                  ? 'bg-surface text-red-600 dark:text-red-400 shadow-xs' 
                  : 'text-text-secondary hover:text-red-600'
              }`}
            >
              <span>Stok Habis ({outOfStockCount})</span>
            </button>
            <button
              onClick={() => { setViewMode('analytics'); if (!analyticsData) fetchAnalytics(); }}
              className={`px-3 py-1.5 rounded-lg font-bold flex items-center gap-1.5 transition-all ${
                viewMode === 'analytics'
                  ? 'bg-surface text-violet-600 dark:text-violet-400 shadow-xs' 
                  : 'text-text-secondary hover:text-violet-600'
              }`}
            >
              <BarChart3 className="w-3 h-3" />
              <span>📊 Analitik Stok</span>
              {analyticsData && (
                <span className="ml-1 px-1.5 py-0.5 bg-rose-100 text-rose-600 rounded-full text-[9px] font-black">
                  {analyticsData.summary?.deadStockCount || 0} mati
                </span>
              )}
            </button>
          </div>

          {viewMode === 'products' && (
          <div className="flex items-center gap-2">
            <label className="text-[11px] font-bold text-text-secondary">Filter Kategori:</label>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="px-2.5 py-1.5 bg-card border border-border-strong rounded-lg text-xs text-text-primary focus:outline-none focus:border-primary font-sans"
            >
              <option value="all">Semua Kategori ({categories.length})</option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.name} {cat.productsCount !== undefined ? `(${cat.productsCount})` : ''}
                </option>
              ))}
            </select>
          </div>
          )}
        </div>


        {/* Analytics Panel — shown when Analytics tab is active */}
        {viewMode === 'analytics' && (
          <div className="space-y-4">
            {/* Period Selector + Refresh */}
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2">
                <label className="text-[11px] font-bold text-text-secondary">Periode Analisis:</label>
                {([7, 14, 30, 60, 90] as number[]).map(d => (
                  <button key={d} onClick={() => { setAnalyticsPeriod(d); fetchAnalytics(d); }}
                    className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${analyticsPeriod === d ? 'bg-violet-600 text-white shadow-sm' : 'bg-card border border-border-strong text-text-secondary hover:border-violet-400'}`}>
                    {d} Hari
                  </button>
                ))}
              </div>
              <button onClick={() => fetchAnalytics()} disabled={isLoadingAnalytics}
                className="flex items-center gap-1.5 px-3 py-1 rounded-lg border border-border-subtle bg-card hover:bg-card-hover text-xs text-text-secondary transition-all disabled:opacity-50">
                <RefreshCw className={`w-3 h-3 ${isLoadingAnalytics ? 'animate-spin' : ''}`} />
                {isLoadingAnalytics ? 'Memuat...' : 'Perbarui'}
              </button>
            </div>

            {isLoadingAnalytics && !analyticsData && (
              <div className="py-16 text-center text-text-muted">
                <RefreshCw className="w-8 h-8 mx-auto mb-2 animate-spin opacity-30" />
                <p className="text-sm font-semibold">Menganalisis data inventori...</p>
              </div>
            )}

            {analyticsData && (
              <>
                {/* KPI Summary Cards */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200">
                    <p className="text-[11px] font-bold text-emerald-700 mb-1 flex items-center gap-1"><Flame className="w-3.5 h-3.5" />Fast Moving</p>
                    <p className="text-2xl font-black text-emerald-700">{analyticsData.summary.fastMovingCount}</p>
                    <p className="text-[10px] text-emerald-600 mt-0.5">SKU perputaran tinggi ({analyticsPeriod}h)</p>
                  </div>
                  <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200">
                    <p className="text-[11px] font-bold text-rose-700 mb-1 flex items-center gap-1"><Package className="w-3.5 h-3.5" />Dead Stock</p>
                    <p className="text-2xl font-black text-rose-700">{analyticsData.summary.deadStockCount}</p>
                    <p className="text-[10px] text-rose-600 mt-0.5">SKU tidak terjual ({analyticsPeriod}h)</p>
                  </div>
                  <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200">
                    <p className="text-[11px] font-bold text-amber-700 mb-1 flex items-center gap-1"><TrendingUp className="w-3.5 h-3.5" />Slow Moving</p>
                    <p className="text-2xl font-black text-amber-700">{analyticsData.summary.slowMovingCount}</p>
                    <p className="text-[10px] text-amber-600 mt-0.5">SKU perputaran lambat</p>
                  </div>
                  <div className="p-3.5 rounded-xl bg-blue-50 border border-blue-200">
                    <p className="text-[11px] font-bold text-blue-700 mb-1 flex items-center gap-1"><AlertTriangle className="w-3.5 h-3.5" />Reorder Alert</p>
                    <p className="text-2xl font-black text-blue-700">{analyticsData.summary.reorderNeededCount}</p>
                    <p className="text-[10px] text-blue-600 mt-0.5">SKU perlu segera restock</p>
                  </div>
                </div>

                {/* Pareto ABC Summary */}
                <div className="p-3.5 rounded-xl bg-card border border-border-subtle flex flex-wrap gap-4 text-xs">
                  <div className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-md bg-emerald-500 text-white text-[10px] font-black flex items-center justify-center">A</span>
                    <span className="text-text-secondary">{analyticsData.summary.classACount} SKU = <strong>70% omzet</strong> (Stars ⭐)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-md bg-amber-400 text-white text-[10px] font-black flex items-center justify-center">B</span>
                    <span className="text-text-secondary">{analyticsData.summary.classBCount} SKU = <strong>20% omzet</strong> (Reguler)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-md bg-slate-400 text-white text-[10px] font-black flex items-center justify-center">C</span>
                    <span className="text-text-secondary">{analyticsData.summary.classCCount} SKU = <strong>10% omzet</strong> (Ekor)</span>
                  </div>
                  <div className="ml-auto flex items-center gap-2">
                    <DollarSign className="w-3.5 h-3.5 text-text-muted" />
                    <span className="text-text-secondary">Total omzet: <strong className="font-mono text-text-primary">Rp {(analyticsData.summary.totalRevenue || 0).toLocaleString('id-ID')}</strong></span>
                  </div>
                </div>

                {/* Sub-tab Navigation */}
                <div className="flex flex-wrap items-center gap-1.5 p-1 bg-subtle rounded-xl border border-border-subtle text-xs w-fit">
                  {([
                    { key: 'fast', label: '🔥 Fast Moving', count: analyticsData.fastMoving?.length },
                    { key: 'dead', label: '💀 Dead Stock', count: analyticsData.deadStock?.length },
                    { key: 'slow', label: '🐢 Slow Moving', count: analyticsData.slowMoving?.length },
                    { key: 'reorder', label: '🔔 Reorder Alert', count: analyticsData.reorderNeeded?.length },
                    { key: 'abc', label: '📊 Pareto ABC', count: analyticsData.abcClassification?.length },
                  ] as { key: typeof analyticsTab, label: string, count: number }[]).map(t => (
                    <button key={t.key} onClick={() => setAnalyticsTab(t.key)}
                      className={`px-3 py-1.5 rounded-lg font-bold transition-all flex items-center gap-1 ${analyticsTab === t.key ? 'bg-surface text-primary shadow-xs' : 'text-text-secondary hover:text-text-primary'}`}>
                      {t.label}
                      <span className="ml-0.5 text-[9px] text-text-muted">({t.count || 0})</span>
                    </button>
                  ))}
                </div>

                {/* Fast Moving Table */}
                {analyticsTab === 'fast' && (
                  <div className="rounded-xl border border-emerald-200 overflow-hidden">
                    <div className="p-3 bg-emerald-50 border-b border-emerald-200">
                      <p className="text-xs font-bold text-emerald-700 flex items-center gap-2"><Flame className="w-4 h-4" />Produk Fast Moving — Perputaran Tinggi (terjual lebih dari rata-rata, aktif {'>'}7 hari)</p>
                      <p className="text-[10px] text-emerald-600 mt-0.5">Prioritaskan stok produk ini. Stok menipis = kehilangan omzet.</p>
                    </div>
                    <table className="w-full text-xs">
                      <thead className="bg-emerald-50/50 text-text-secondary font-semibold">
                        <tr><th className="p-2.5 text-left">Produk</th><th className="p-2.5">Kategori</th><th className="p-2.5">Qty Terjual</th><th className="p-2.5">Tx</th><th className="p-2.5">Omzet</th><th className="p-2.5">Stok Saat Ini</th><th className="p-2.5">Hari Terakhir Jual</th></tr>
                      </thead>
                      <tbody className="divide-y divide-border-subtle/50">
                        {(analyticsData.fastMoving || []).length === 0 ? (
                          <tr><td colSpan={7} className="p-6 text-center text-text-muted text-xs">Tidak ada data fast moving untuk periode ini.</td></tr>
                        ) : (analyticsData.fastMoving || []).map((p: any, i: number) => (
                          <tr key={p.id} className="hover:bg-emerald-50/30">
                            <td className="p-2.5 font-semibold text-text-primary">{p.name}<div className="text-[10px] text-text-muted font-mono">{p.sku}</div></td>
                            <td className="p-2.5 text-text-secondary">{p.categoryName}</td>
                            <td className="p-2.5 font-mono font-bold text-emerald-700 text-center">{Number(p.qtySold).toLocaleString('id-ID')}</td>
                            <td className="p-2.5 text-center text-text-secondary">{p.txCount}</td>
                            <td className="p-2.5 font-mono text-text-primary text-right">Rp {Number(p.revenue).toLocaleString('id-ID')}</td>
                            <td className="p-2.5 text-center">
                              <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${Number(p.currentStock) <= Number(p.minStockAlert) ? 'bg-rose-100 text-rose-700' : 'bg-emerald-100 text-emerald-700'}`}>
                                {p.currentStock}
                              </span>
                            </td>
                            <td className="p-2.5 text-text-secondary text-center">{p.daysSinceLastSale != null ? `${Math.round(p.daysSinceLastSale)} hari lalu` : '—'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                {/* Dead Stock Table */}
                {analyticsTab === 'dead' && (
                  <div className="rounded-xl border border-rose-200 overflow-hidden">
                    <div className="p-3 bg-rose-50 border-b border-rose-200">
                      <p className="text-xs font-bold text-rose-700 flex items-center gap-2"><Package className="w-4 h-4" />Dead Stock — Tidak Terjual dalam {analyticsPeriod} Hari</p>
                      <p className="text-[10px] text-rose-600 mt-0.5">Pertimbangkan promo cuci gudang, bundling, atau retur ke distributor.</p>
                    </div>
                    <table className="w-full text-xs">
                      <thead className="bg-rose-50/50 text-text-secondary font-semibold">
                        <tr><th className="p-2.5 text-left">Produk</th><th className="p-2.5">Kategori</th><th className="p-2.5">Stok</th><th className="p-2.5">HPP</th><th className="p-2.5">Nilai Tertahan</th><th className="p-2.5">Terakhir Terjual</th></tr>
                      </thead>
                      <tbody className="divide-y divide-border-subtle/50">
                        {(analyticsData.deadStock || []).length === 0 ? (
                          <tr><td colSpan={6} className="p-6 text-center text-text-muted text-xs">🎉 Tidak ada dead stock! Semua barang berputar aktif.</td></tr>
                        ) : (analyticsData.deadStock || []).map((p: any, i: number) => (
                          <tr key={p.id} className="hover:bg-rose-50/20">
                            <td className="p-2.5 font-semibold text-text-primary">{p.name}<div className="text-[10px] text-text-muted font-mono">{p.sku}</div></td>
                            <td className="p-2.5 text-text-secondary">{p.categoryName}</td>
                            <td className="p-2.5 font-mono font-bold text-rose-700 text-center">{p.currentStock}</td>
                            <td className="p-2.5 font-mono text-text-secondary text-right">Rp {Number(p.buyPrice).toLocaleString('id-ID')}</td>
                            <td className="p-2.5 font-mono font-bold text-rose-700 text-right">Rp {Number(p.stockValue).toLocaleString('id-ID')}</td>
                            <td className="p-2.5 text-text-secondary text-center">{p.lastSaleDate ? new Date(p.lastSaleDate).toLocaleDateString('id-ID', {dateStyle:'short'}) : 'Belum pernah'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                {/* Slow Moving Table */}
                {analyticsTab === 'slow' && (
                  <div className="rounded-xl border border-amber-200 overflow-hidden">
                    <div className="p-3 bg-amber-50 border-b border-amber-200">
                      <p className="text-xs font-bold text-amber-700 flex items-center gap-2"><TrendingUp className="w-4 h-4" />Slow Moving — Penjualan Di Bawah 20% Rata-rata</p>
                      <p className="text-[10px] text-amber-600 mt-0.5">Produk ini butuh strategi promosi atau penyesuaian harga.</p>
                    </div>
                    <table className="w-full text-xs">
                      <thead className="bg-amber-50/50 text-text-secondary font-semibold">
                        <tr><th className="p-2.5 text-left">Produk</th><th className="p-2.5">Kategori</th><th className="p-2.5">Qty Terjual</th><th className="p-2.5">Stok</th><th className="p-2.5">Nilai Stok</th><th className="p-2.5">Hari Terakhir Jual</th></tr>
                      </thead>
                      <tbody className="divide-y divide-border-subtle/50">
                        {(analyticsData.slowMoving || []).length === 0 ? (
                          <tr><td colSpan={6} className="p-6 text-center text-text-muted text-xs">Tidak ada slow moving untuk periode ini.</td></tr>
                        ) : (analyticsData.slowMoving || []).map((p: any, i: number) => (
                          <tr key={p.id} className="hover:bg-amber-50/20">
                            <td className="p-2.5 font-semibold text-text-primary">{p.name}<div className="text-[10px] text-text-muted font-mono">{p.sku}</div></td>
                            <td className="p-2.5 text-text-secondary">{p.categoryName}</td>
                            <td className="p-2.5 font-mono font-bold text-amber-700 text-center">{Number(p.qtySold).toLocaleString('id-ID')}</td>
                            <td className="p-2.5 text-center">{p.currentStock}</td>
                            <td className="p-2.5 font-mono text-text-secondary text-right">Rp {Number(p.stockValue).toLocaleString('id-ID')}</td>
                            <td className="p-2.5 text-text-secondary text-center">{p.daysSinceLastSale != null ? `${Math.round(p.daysSinceLastSale)} hari lalu` : '—'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                {/* Reorder Alert Table */}
                {analyticsTab === 'reorder' && (
                  <div className="rounded-xl border border-blue-200 overflow-hidden">
                    <div className="p-3 bg-blue-50 border-b border-blue-200">
                      <p className="text-xs font-bold text-blue-700 flex items-center gap-2"><AlertTriangle className="w-4 h-4" />Reorder Alert — Stok Sudah Di Bawah Minimum</p>
                      <p className="text-[10px] text-blue-600 mt-0.5">Segera buat PO ke supplier sebelum kehabisan. Proyeksi: hari stok habis berdasarkan rata-rata penjualan harian.</p>
                    </div>
                    <table className="w-full text-xs">
                      <thead className="bg-blue-50/50 text-text-secondary font-semibold">
                        <tr><th className="p-2.5 text-left">Produk</th><th className="p-2.5">Stok</th><th className="p-2.5">Min Stok</th><th className="p-2.5">Rata-rata/Hari</th><th className="p-2.5">Habis dalam</th><th className="p-2.5">Saran Order</th></tr>
                      </thead>
                      <tbody className="divide-y divide-border-subtle/50">
                        {(analyticsData.reorderNeeded || []).length === 0 ? (
                          <tr><td colSpan={6} className="p-6 text-center text-text-muted text-xs">✅ Stok semua produk masih aman.</td></tr>
                        ) : (analyticsData.reorderNeeded || []).map((p: any, i: number) => (
                          <tr key={p.id} className="hover:bg-blue-50/20">
                            <td className="p-2.5 font-semibold text-text-primary">{p.name}<div className="text-[10px] text-text-muted font-mono">{p.sku}</div></td>
                            <td className="p-2.5 text-center"><span className={`px-1.5 py-0.5 rounded-full text-[10px] font-black ${p.currentStock === 0 ? 'bg-rose-100 text-rose-700' : 'bg-amber-100 text-amber-700'}`}>{p.currentStock}</span></td>
                            <td className="p-2.5 text-center text-text-secondary">{p.minStockAlert}</td>
                            <td className="p-2.5 text-center font-mono">{p.dailyAvgSold > 0 ? `${p.dailyAvgSold} ${p.unit || 'PCS'}` : '—'}</td>
                            <td className="p-2.5 text-center"><span className={`text-[11px] font-bold ${p.daysUntilStockOut < 3 ? 'text-rose-600' : p.daysUntilStockOut < 7 ? 'text-amber-600' : 'text-text-secondary'}`}>{p.daysUntilStockOut >= 999 ? '∞' : `~${p.daysUntilStockOut} hari`}</span></td>
                            <td className="p-2.5 text-center"><span className="px-2 py-1 bg-blue-100 text-blue-700 rounded-lg text-[11px] font-bold">{p.suggestedReorder} {p.unit || 'PCS'}</span></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                {/* Pareto ABC Table */}
                {analyticsTab === 'abc' && (
                  <div className="rounded-xl border border-violet-200 overflow-hidden">
                    <div className="p-3 bg-violet-50 border-b border-violet-200">
                      <p className="text-xs font-bold text-violet-700 flex items-center gap-2"><BarChart3 className="w-4 h-4" />Klasifikasi Pareto ABC — Top 50 Produk by Omzet</p>
                      <p className="text-[10px] text-violet-600 mt-0.5">A = 70% omzet (Stars), B = 20% omzet (Reguler), C = 10% omzet (Ekor/Niche)</p>
                    </div>
                    <table className="w-full text-xs">
                      <thead className="bg-violet-50/50 text-text-secondary font-semibold">
                        <tr><th className="p-2.5">#</th><th className="p-2.5 text-left">Produk</th><th className="p-2.5">Kelas</th><th className="p-2.5">Qty Terjual</th><th className="p-2.5">Omzet</th><th className="p-2.5">% Omzet</th><th className="p-2.5">Laba Kotor</th><th className="p-2.5">Stok</th></tr>
                      </thead>
                      <tbody className="divide-y divide-border-subtle/50">
                        {(analyticsData.abcClassification || []).map((p: any, i: number) => (
                          <tr key={p.id} className="hover:bg-violet-50/20">
                            <td className="p-2.5 text-center text-text-muted font-mono">{i+1}</td>
                            <td className="p-2.5 font-semibold text-text-primary">{p.name}<div className="text-[10px] text-text-muted font-mono">{p.sku}</div></td>
                            <td className="p-2.5 text-center">
                              <span className={`px-2 py-0.5 rounded-full text-[11px] font-black ${p.abcClass === 'A' ? 'bg-emerald-100 text-emerald-700' : p.abcClass === 'B' ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-600'}`}>
                                {p.abcClass}
                              </span>
                            </td>
                            <td className="p-2.5 font-mono text-center">{Number(p.qtySold).toLocaleString('id-ID')}</td>
                            <td className="p-2.5 font-mono text-right">Rp {Number(p.revenue).toLocaleString('id-ID')}</td>
                            <td className="p-2.5 text-center text-text-secondary font-mono">{p.revenueShare}%</td>
                            <td className="p-2.5 font-mono text-right text-emerald-700">Rp {Number(p.grossProfit).toLocaleString('id-ID')}</td>
                            <td className="p-2.5 text-center">{p.currentStock}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* Table Container — only visible when products tab active */}
        {viewMode === 'products' && <div className="bg-card border border-border-subtle rounded-xl overflow-hidden shadow-sm">
          <table className="w-full text-left text-xs">
            <thead className="bg-subtle text-text-secondary font-semibold border-b border-border-subtle">
              <tr>
                <th className="p-3">SKU & Barcode</th>
                <th className="p-3">Nama Produk</th>
                <th className="p-3">Kategori</th>
                <th className="p-3">HPP (Beli)</th>
                <th className="p-3">Harga Eceran</th>
                <th className="p-3">Skema Grosir</th>
                <th className="p-3">Stok Fisik</th>
                <th className="p-3">Kemasan Multi-Satuan</th>
                <th className="p-3 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-subtle/50">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={9} className="p-12 text-center text-text-muted space-y-2">
                    <Boxes className="w-8 h-8 mx-auto opacity-25" />
                    <p className="text-xs font-bold text-text-primary">Tidak ada produk yang cocok dengan filter</p>
                    <p className="text-[11px]">Coba ubah tab status, kata kunci pencarian, atau klik "+ Tambah Produk".</p>
                  </td>
                </tr>
              ) : (
              filtered.map((p) => (
                <tr key={p.id} className="hover:bg-card-hover/50 transition-colors">
                  <td className="p-3 font-mono font-bold text-text-primary">
                    <div>{p.sku}</div>
                    {p.barcode && <span className="text-[10px] text-text-muted font-normal">{p.barcode}</span>}
                  </td>
                  <td className="p-3 font-semibold text-text-primary">{p.name}</td>
                  <td className="p-3 text-text-secondary">{p.category?.name || 'Umum'}</td>
                  <td className="p-3 font-mono text-text-secondary tabular-nums">Rp {p.buyPrice.toLocaleString('id-ID')}</td>
                  <td className="p-3 font-mono font-bold text-primary tabular-nums">
                    <div>Rp {p.sellPrice.toLocaleString('id-ID')}</div>
                    <div className="text-[9px] text-text-muted font-sans font-normal">per {p.unit || 'PCS'}</div>
                  </td>
                  <td className="p-3">
                    {p.wholesalePrice && p.wholesalePrice > 0 ? (
                      <div>
                        <div className="font-bold text-emerald-700 dark:text-emerald-400 font-mono tabular-nums text-xs">
                          Rp {p.wholesalePrice.toLocaleString('id-ID')}
                        </div>
                        <div className="text-[10px] text-text-secondary flex items-center gap-1.5 mt-0.5 font-sans">
                          <span>≥{p.wholesaleMinQty || 5} {p.unit || 'PCS'}</span>
                          {p.sellPrice > p.wholesalePrice && (
                            <span className="px-1.5 py-0.2 rounded bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 font-extrabold text-[9px]">
                              Hemat {Math.round(((p.sellPrice - p.wholesalePrice) / p.sellPrice) * 100)}%
                            </span>
                          )}
                        </div>
                      </div>
                    ) : (
                      <button
                        onClick={() => handleOpenEditProduct(p)}
                        className="text-[11px] text-text-muted hover:text-primary transition-colors flex items-center gap-1 group"
                        title="Klik untuk menyetel harga grosir produk ini"
                      >
                        <Plus className="w-3 h-3 text-text-muted group-hover:text-primary" />
                        <span className="italic">Atur Grosir</span>
                      </button>
                    )}
                  </td>
                  <td className="p-3 font-mono font-bold tabular-nums">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                        p.currentStock <= 0 
                          ? 'bg-status-danger/10 text-status-danger border border-status-danger/30' 
                          : p.currentStock <= p.minStockAlert 
                          ? 'bg-status-warning/10 text-status-warning border border-status-warning/30' 
                          : 'bg-status-success/10 text-status-success border border-status-success/20'
                      }`}>
                        {p.currentStock <= 0 ? 'Habis (0)' : `${p.currentStock} ${p.unit}`}
                      </span>
                      <button
                        onClick={(e) => handleOpenQuickStockIn(p, e)}
                        className="px-2 py-0.5 rounded-md bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30 text-[10px] font-bold flex items-center gap-1 transition-all active:scale-95 shadow-2xs cursor-pointer"
                        title="Tambah stok fisik kilat (Quick Stock In)"
                      >
                        <Plus className="w-2.5 h-2.5" />
                        <span>Masuk</span>
                      </button>
                    </div>
                  </td>
                  <td className="p-3">
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => openUnitConversions(p)}
                        className="px-2 py-1 rounded bg-subtle hover:bg-card-hover border border-border-subtle text-[11px] font-semibold text-text-secondary flex items-center gap-1"
                        title="Atur Kemasan Dus / Lusin / Grosir"
                      >
                        <Package className="w-3 h-3 text-primary" />
                        <span>Dus/Lusin</span>
                      </button>
                      <button
                        onClick={() => openStockLedger(p)}
                        className="px-2 py-1 rounded bg-subtle hover:bg-card-hover border border-border-subtle text-[11px] font-semibold text-text-primary flex items-center gap-1"
                        title="Lihat Riwayat Keluar-Masuk Stok"
                      >
                        <Layers className="w-3 h-3 text-status-info" />
                        <span>Kartu Stok</span>
                      </button>
                      <button
                        onClick={() => setSelectedProductForBarcode(p)}
                        className="px-2 py-1 rounded bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-[11px] font-bold text-amber-600 flex items-center gap-1 transition-all shadow-2xs"
                        title="Cetak Stiker Barcode & Label Harga Produk"
                      >
                        <BarcodeIcon className="w-3 h-3 text-amber-600" />
                        <span>Barcode</span>
                      </button>
                    </div>
                  </td>
                  <td className="p-3 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      <button
                        onClick={() => handleOpenEditProduct(p)}
                        title="Edit Produk"
                        className="p-1 rounded hover:bg-primary/10 text-text-secondary hover:text-primary transition-colors"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDeleteProduct(p)}
                        title="Hapus Produk"
                        className="p-1 rounded hover:bg-rose-500/10 text-text-secondary hover:text-rose-600 transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              )))}
            </tbody>
          </table>
        </div>}
      </div>

      {/* MODAL: ADD / EDIT PRODUCT */}
      {isProductModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-2xl bg-card border border-border-strong rounded-2xl shadow-2xl overflow-hidden">
            <div className="p-4 bg-surface border-b border-border-subtle flex items-center justify-between">
              <h3 className="font-bold text-sm text-text-primary flex items-center gap-2">
                <Boxes className="w-4 h-4 text-primary" />
                {editingProduct ? 'Edit Informasi Produk' : 'Tambah Produk Baru ke Katalog'}
              </h3>
              <button 
                onClick={() => setIsProductModalOpen(false)} 
                className="p-1.5 rounded-lg text-text-muted hover:text-text-primary hover:bg-subtle transition-colors"
                title="Tutup Modal"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveProduct} className="p-5 space-y-4 text-xs max-h-[80vh] overflow-y-auto">
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <label className="block font-semibold text-text-secondary mb-1">Nama Produk *</label>
                  <input
                    type="text"
                    required
                    value={formName}
                    onChange={e => setFormName(e.target.value)}
                    placeholder="Contoh: Samsung Galaxy A55 5G 8/256GB"
                    className="w-full px-3 py-2 bg-subtle border border-border-strong rounded-lg text-xs text-text-primary focus:outline-none focus:border-primary font-semibold"
                    autoFocus
                  />
                </div>

                <div>
                  <label className="block font-semibold text-text-secondary mb-1">Kode SKU *</label>
                  <input
                    type="text"
                    required
                    value={formSku}
                    onChange={e => setFormSku(e.target.value)}
                    placeholder="PRD-001"
                    className="w-full px-3 py-2 bg-subtle border border-border-strong rounded-lg text-xs font-mono text-text-primary focus:outline-none focus:border-primary"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="font-semibold text-text-secondary">Barcode (EAN-13 / PLU)</label>
                    <div className="flex items-center gap-1.5">
                      {/* Toggle Switch ON/OFF Scan HP */}
                      <button
                        type="button"
                        onClick={() => {
                          const next = !isHpSyncEnabled;
                          setIsHpSyncEnabled(next);
                          useToastStore.getState().showToast(
                            next ? '🟢 Sinkronisasi Scanner HP DIAKTIFKAN' : '⚪ Sinkronisasi Scanner HP DINONAKTIFKAN',
                            'info'
                          );
                        }}
                        className={`px-2 py-0.5 rounded-md text-[10px] font-bold flex items-center gap-1 border transition-all ${
                          isHpSyncEnabled
                            ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-600 dark:text-emerald-400 shadow-2xs'
                            : 'bg-subtle border-border-subtle text-text-muted hover:text-text-secondary'
                        }`}
                        title="Klik untuk menyalakan/mematikan penerimaan otomatis dari scanner HP"
                      >
                        <span className={`w-1.5 h-1.5 rounded-full ${isHpSyncEnabled ? 'bg-emerald-500 animate-pulse' : 'bg-zinc-400'}`} />
                        <span>HP Sync: {isHpSyncEnabled ? 'ON' : 'OFF'}</span>
                      </button>

                      <span className="text-text-muted">|</span>

                      <button
                        type="button"
                        onClick={() => setFormBarcode(generateEan13())}
                        title="Buat Barcode Standar EAN-13 Otomatis"
                        className="text-[10px] text-primary hover:text-primary-hover font-bold hover:underline flex items-center gap-0.5"
                      >
                        <Sparkles className="w-3 h-3" /> Auto
                      </button>
                      <span className="text-text-muted">|</span>
                      <button
                        type="button"
                        onClick={() => setIsBarcodeScanModalOpen(true)}
                        title="Scan Barcode via HP Android atau Alat Scan USB"
                        className="text-[10px] text-accent hover:text-accent-hover font-bold hover:underline flex items-center gap-1 bg-accent/10 px-1.5 py-0.5 rounded"
                      >
                        <Smartphone className="w-3 h-3" /> Scan HP / Alat
                      </button>
                    </div>
                  </div>
                  <div className="relative">
                    <input
                      type="text"
                      value={formBarcode}
                      onChange={e => setFormBarcode(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault(); // cegah submit form saat barcode scanner fisik menekan enter
                          const val = formBarcode.trim();
                          if (val) {
                            playScanBeep();
                            useToastStore.getState().showToast(`Barcode fisik terbaca: ${val}`, 'success');
                          }
                        }
                      }}
                      placeholder="Tembak alat scan atau ketik nomor barcode..."
                      className="w-full pl-3 pr-8 py-2 bg-subtle border border-border-strong rounded-lg text-xs font-mono text-text-primary focus:outline-none focus:border-primary"
                    />
                    {formBarcode && (
                      <button
                        type="button"
                        onClick={() => setFormBarcode('')}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary"
                        title="Hapus Barcode"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>

                  {latestMobileScan && latestMobileScan !== formBarcode && (
                    <div className="mt-1.5 flex items-center justify-between bg-primary/10 border border-primary/25 px-2.5 py-1 rounded-lg text-[11px] animate-fadeIn">
                      <span className="text-text-secondary flex items-center gap-1.5">
                        <Smartphone className="w-3.5 h-3.5 text-primary animate-pulse" />
                        Terdeteksi dari HP: <strong className="font-mono font-bold text-text-primary">{latestMobileScan}</strong>
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          setFormBarcode(latestMobileScan);
                          playScanBeep();
                          useToastStore.getState().showToast(`Barcode ${latestMobileScan} diterapkan dari HP!`, 'success');
                        }}
                        className="px-2 py-0.5 bg-primary text-primary-text font-bold rounded text-[10px] hover:bg-primary-hover shadow-xs"
                      >
                        Pakai Barcode Ini
                      </button>
                    </div>
                  )}
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="font-semibold text-text-secondary">Kategori Produk</label>
                    <button
                      type="button"
                      onClick={() => setIsQuickAddCategory(!isQuickAddCategory)}
                      className="text-[10px] text-primary hover:text-primary-hover font-bold hover:underline"
                    >
                      {isQuickAddCategory ? 'Batal' : '+ Kategori Baru'}
                    </button>
                  </div>
                  {isQuickAddCategory ? (
                    <div className="flex gap-1.5">
                      <input
                        type="text"
                        placeholder="Nama kategori..."
                        value={quickCategoryName}
                        onChange={e => setQuickCategoryName(e.target.value)}
                        className="flex-1 px-2.5 py-1.5 bg-subtle border border-primary rounded-lg text-xs text-text-primary focus:outline-none"
                        autoFocus
                      />
                      <button
                        type="button"
                        onClick={handleQuickAddCategory}
                        disabled={isSavingQuickCat || !quickCategoryName.trim()}
                        className="px-2.5 py-1.5 bg-primary text-primary-text rounded-lg text-xs font-bold disabled:opacity-50"
                      >
                        {isSavingQuickCat ? '...' : 'Simpan'}
                      </button>
                    </div>
                  ) : (
                    <div className="flex gap-1.5">
                      <select
                        value={formCategoryId}
                        onChange={e => setFormCategoryId(e.target.value)}
                        className="w-full px-3 py-2 bg-subtle border border-border-strong rounded-lg text-xs text-text-primary focus:outline-none focus:border-primary"
                      >
                        <option value="">-- Pilih Kategori --</option>
                        {categories.map(c => (
                          <option key={c.id} value={c.id}>
                            {c.name}
                          </option>
                        ))}
                      </select>
                      <button
                        type="button"
                        onClick={() => setIsCategoryModalOpen(true)}
                        title="Buka Menu Kelola Kategori Lengkap"
                        className="p-2 bg-subtle hover:bg-card-hover border border-border-strong rounded-lg text-text-muted hover:text-primary transition-colors flex-shrink-0"
                      >
                        <FolderTree className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="font-semibold text-text-secondary">Satuan Dasar</label>
                    <button
                      type="button"
                      onClick={() => setIsQuickAddUnit(!isQuickAddUnit)}
                      className="text-[10px] text-primary hover:text-primary-hover font-bold hover:underline"
                    >
                      {isQuickAddUnit ? 'Batal' : '+ Satuan Kustom'}
                    </button>
                  </div>
                  {isQuickAddUnit ? (
                    <div className="flex gap-1.5">
                      <input
                        type="text"
                        placeholder="Misal: DUS, PACK..."
                        value={quickUnitName}
                        onChange={e => setQuickUnitName(e.target.value.toUpperCase())}
                        className="flex-1 px-2.5 py-1.5 bg-subtle border border-primary rounded-lg text-xs font-mono uppercase text-text-primary focus:outline-none"
                        autoFocus
                      />
                      <button
                        type="button"
                        onClick={handleQuickAddUnit}
                        disabled={isSavingQuickUnit || !quickUnitName.trim()}
                        className="px-2.5 py-1.5 bg-primary text-primary-text rounded-lg text-xs font-bold disabled:opacity-50"
                      >
                        {isSavingQuickUnit ? '...' : 'Simpan'}
                      </button>
                    </div>
                  ) : (
                    <select
                      value={formUnit}
                      onChange={e => setFormUnit(e.target.value)}
                      className="w-full px-3 py-2 bg-subtle border border-border-strong rounded-lg text-xs font-mono font-bold text-text-primary focus:outline-none focus:border-primary"
                    >
                      {availableUnits.map(u => (
                        <option key={u} value={u}>
                          {u}
                        </option>
                      ))}
                    </select>
                  )}
                </div>
              </div>

              {/* Pricing Section (Mode Pintar vs Mode Manual) */}
              <div className="p-3 bg-subtle rounded-xl border border-border-subtle space-y-3">
                <div className="flex items-center justify-between">
                  <p className="font-bold text-text-primary flex items-center gap-1.5">
                    <DollarSign className="w-3.5 h-3.5 text-primary" /> Pengaturan Harga
                  </p>
                  <div className="flex items-center bg-card p-0.5 rounded-lg border border-border-subtle">
                    <button
                      type="button"
                      onClick={() => {
                        setPricingMode('smart');
                        updateSmartPricing();
                      }}
                      className={`px-2.5 py-1 rounded-md text-[11px] font-bold flex items-center gap-1 transition-all ${
                        pricingMode === 'smart'
                          ? 'bg-primary text-primary-text shadow-xs'
                          : 'text-text-muted hover:text-text-primary'
                      }`}
                    >
                      <Sparkles className="w-3 h-3" /> Mode Hitung Pintar
                    </button>
                    <button
                      type="button"
                      onClick={() => setPricingMode('manual')}
                      className={`px-2.5 py-1 rounded-md text-[11px] font-bold flex items-center gap-1 transition-all ${
                        pricingMode === 'manual'
                          ? 'bg-primary text-primary-text shadow-xs'
                          : 'text-text-muted hover:text-text-primary'
                      }`}
                    >
                      <Edit3 className="w-3 h-3" /> Mode Manual
                    </button>
                  </div>
                </div>

                {pricingMode === 'smart' ? (
                  <div className="space-y-3">
                    {/* Row 1: HPP, Margin %, Pajak (PPN) %, Pembulatan */}
                    <div className="grid grid-cols-4 gap-2">
                      <div>
                        <label className="block text-text-secondary text-[11px] font-semibold mb-1">
                          Harga Beli (HPP) *
                        </label>
                        <input
                          type="number"
                          required
                          min="0"
                          value={formBuyPrice}
                          onChange={e => updateSmartPricing(e.target.value, undefined, undefined, undefined)}
                          className="w-full px-2.5 py-1.5 bg-card border border-border-strong rounded-lg font-mono font-bold text-text-primary focus:outline-none focus:border-primary text-xs"
                        />
                      </div>
                      <div>
                        <label className="block text-text-secondary text-[11px] font-semibold mb-1">
                          Margin (%)
                        </label>
                        <div className="relative">
                          <input
                            type="number"
                            min="0"
                            step="any"
                            value={smartMarginPercent}
                            onChange={e => updateSmartPricing(undefined, e.target.value, undefined, undefined)}
                            className="w-full px-2.5 py-1.5 bg-card border border-border-strong rounded-lg font-mono font-bold text-text-primary focus:outline-none focus:border-primary text-xs pr-6"
                          />
                          <span className="absolute right-2 top-1/2 -translate-y-1/2 text-text-muted font-bold text-[10px]">%</span>
                        </div>
                      </div>
                      <div>
                        <label className="block text-text-secondary text-[11px] font-semibold mb-1">
                          Pajak / PPN (%)
                        </label>
                        <div className="relative">
                          <input
                            type="number"
                            min="0"
                            step="any"
                            value={smartTaxPercent}
                            onChange={e => updateSmartPricing(undefined, undefined, e.target.value, undefined)}
                            placeholder="0"
                            className="w-full px-2.5 py-1.5 bg-card border border-border-strong rounded-lg font-mono font-bold text-text-primary focus:outline-none focus:border-primary text-xs pr-6"
                          />
                          <span className="absolute right-2 top-1/2 -translate-y-1/2 text-text-muted font-bold text-[10px]">%</span>
                        </div>
                      </div>
                      <div>
                        <label className="block text-text-secondary text-[11px] font-semibold mb-1">
                          Pembulatan
                        </label>
                        <select
                          value={smartRounding}
                          onChange={e => updateSmartPricing(undefined, undefined, undefined, e.target.value)}
                          className="w-full px-2 py-1.5 bg-card border border-border-strong rounded-lg text-[11px] font-bold text-text-primary focus:outline-none focus:border-primary"
                        >
                          <option value="none">Pas (Tanpa)</option>
                          <option value="100">Ke Rp 100</option>
                          <option value="500">Ke Rp 500</option>
                          <option value="1000">Ke Rp 1.000</option>
                        </select>
                      </div>
                    </div>

                    {/* Quick Preset Buttons for Margin & PPN */}
                    <div className="flex items-center justify-between text-[11px] bg-card/60 p-2 rounded-lg border border-border-subtle/80">
                      <div className="flex items-center gap-1.5">
                        <span className="text-text-muted font-semibold">Preset Margin:</span>
                        {['15', '20', '30', '50', '100'].map(p => (
                          <button
                            key={p}
                            type="button"
                            onClick={() => updateSmartPricing(undefined, p, undefined, undefined)}
                            className={`px-1.5 py-0.5 rounded text-[10px] font-bold border ${
                              smartMarginPercent === p
                                ? 'bg-primary/20 border-primary text-primary'
                                : 'bg-subtle border-border-subtle text-text-secondary hover:text-text-primary'
                            }`}
                          >
                            {p}%
                          </button>
                        ))}
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-text-muted font-semibold">Preset PPN:</span>
                        {['0', '11', '12'].map(t => (
                          <button
                            key={t}
                            type="button"
                            onClick={() => updateSmartPricing(undefined, undefined, t, undefined)}
                            className={`px-1.5 py-0.5 rounded text-[10px] font-bold border ${
                              smartTaxPercent === t
                                ? 'bg-accent/20 border-accent text-accent'
                                : 'bg-subtle border-border-subtle text-text-secondary hover:text-text-primary'
                            }`}
                          >
                            {t}%
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Live Calculation Breakdown Card */}
                    <div className="p-2.5 bg-primary/5 border border-primary/20 rounded-lg flex items-center justify-between">
                      <div className="space-y-0.5">
                        <div className="text-[10px] text-text-secondary flex items-center gap-2">
                          <span>HPP: <strong className="font-mono text-text-primary">Rp {(parseFloat(formBuyPrice) || 0).toLocaleString('id-ID')}</strong></span>
                          <span>+ Margin ({smartMarginPercent}%): <strong className="font-mono text-emerald-600">Rp {Math.round((parseFloat(formBuyPrice) || 0) * (parseFloat(smartMarginPercent) || 0) / 100).toLocaleString('id-ID')}</strong></span>
                          {(parseFloat(smartTaxPercent) || 0) > 0 && (
                            <span>+ Pajak ({smartTaxPercent}%): <strong className="font-mono text-accent">Rp {Math.round(((parseFloat(formBuyPrice) || 0) * (1 + (parseFloat(smartMarginPercent) || 0) / 100)) * (parseFloat(smartTaxPercent) || 0) / 100).toLocaleString('id-ID')}</strong></span>
                          )}
                        </div>
                        <p className="text-[11px] text-text-muted">
                          Harga jual otomatis terhitung dan siap dipakai di kasir.
                        </p>
                      </div>
                      <div className="text-right">
                        <span className="text-[10px] text-text-secondary block">Harga Jual Rekomendasi</span>
                        <span className="font-mono font-black text-base text-primary">
                          Rp {(parseFloat(formSellPrice) || 0).toLocaleString('id-ID')}
                        </span>
                      </div>
                    </div>
                  </div>
                ) : (
                  /* Manual Mode */
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-text-secondary mb-1">Harga Beli / HPP (Rp):</label>
                      <input
                        type="number"
                        min="0"
                        value={formBuyPrice}
                        onChange={e => setFormBuyPrice(e.target.value)}
                        className="w-full px-3 py-2 bg-card border border-border-strong rounded-lg font-mono font-bold text-text-primary focus:outline-none focus:border-primary"
                      />
                    </div>
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="block text-text-secondary font-bold">Harga Jual Kasir (Rp) *:</label>
                        {parseFloat(formBuyPrice) > 0 && parseFloat(formSellPrice) > 0 && (
                          <span className="text-[10px] font-mono text-emerald-600 font-bold">
                            Untung: Rp {(parseFloat(formSellPrice) - parseFloat(formBuyPrice)).toLocaleString('id-ID')} ({Math.round(((parseFloat(formSellPrice) - parseFloat(formBuyPrice)) / parseFloat(formBuyPrice)) * 100)}%)
                          </span>
                        )}
                      </div>
                      <input
                        type="number"
                        required
                        min="0"
                        value={formSellPrice}
                        onChange={e => setFormSellPrice(e.target.value)}
                        className="w-full px-3 py-2 bg-card border border-primary/40 rounded-lg font-mono font-bold text-primary focus:outline-none focus:border-primary text-sm"
                      />
                    </div>
                  </div>
                )}

                {/* Wholesale Price (Both Modes) with Smart Calculator & Margin Protection */}
                <div className="pt-2 border-t border-border-subtle/70 space-y-2">
                  <div className="flex items-center justify-between flex-wrap gap-1">
                    <div className="flex items-center gap-1.5">
                      <Tag className="w-3.5 h-3.5 text-emerald-600" />
                      <span className="text-xs font-bold text-text-secondary">Pengaturan Harga Grosir / Borongan:</span>
                    </div>
                    {/* Discount Presets from Retail */}
                    <div className="flex items-center gap-1">
                      <span className="text-[10px] text-text-muted">Diskon Eceran:</span>
                      {[5, 8, 10, 15, 20].map(pct => (
                        <button
                          key={pct}
                          type="button"
                          onClick={() => {
                            const sell = parseFloat(formSellPrice) || 0;
                            if (sell <= 0) {
                              useToastStore.getState().showToast('Tentukan Harga Jual Kasir terlebih dahulu!', 'warning');
                              return;
                            }
                            const val = Math.round((sell * (1 - pct / 100)) / 100) * 100;
                            setFormWholesalePrice(val.toString());
                            if (!formWholesaleMinQty || parseInt(formWholesaleMinQty) <= 1) {
                              setFormWholesaleMinQty('5');
                            }
                          }}
                          className="px-1.5 py-0.5 rounded bg-subtle hover:bg-emerald-500/15 hover:text-emerald-700 text-[10px] font-mono font-bold text-text-secondary border border-border-subtle transition-all cursor-pointer"
                          title={`Set harga grosir ${pct}% lebih hemat dari eceran`}
                        >
                          -{pct}%
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-[11px] font-bold text-text-secondary">Harga Grosir (Rp):</label>
                        {parseFloat(formWholesalePrice) > 0 && parseFloat(formSellPrice) > parseFloat(formWholesalePrice) && (
                          <span className="text-[10px] font-mono font-bold text-emerald-600">
                            Hemat {Math.round(((parseFloat(formSellPrice) - parseFloat(formWholesalePrice)) / parseFloat(formSellPrice)) * 100)}%
                          </span>
                        )}
                      </div>
                      <input
                        type="number"
                        min="0"
                        value={formWholesalePrice}
                        onChange={e => setFormWholesalePrice(e.target.value)}
                        placeholder="Contoh: 48000 (Kosongkan jika tidak ada)"
                        className="w-full px-3 py-2 bg-card border border-border-strong rounded-lg font-mono text-emerald-600 font-bold focus:outline-none focus:border-primary text-sm"
                      />
                    </div>
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-[11px] font-bold text-text-secondary">Min. Qty Grosir:</label>
                        {parseFloat(formWholesalePrice) > 0 && (
                          <span className="text-[10px] text-text-muted">
                            {formUnit || 'PCS'}
                          </span>
                        )}
                      </div>
                      <input
                        type="number"
                        min="1"
                        value={formWholesaleMinQty}
                        onChange={e => setFormWholesaleMinQty(e.target.value)}
                        placeholder="Contoh: 5"
                        className="w-full px-3 py-2 bg-card border border-border-strong rounded-lg font-mono text-center font-bold focus:outline-none focus:border-primary text-sm"
                      />
                    </div>
                  </div>

                  {/* Wholesale Profit & Loss Protection Indicator */}
                  {parseFloat(formWholesalePrice) > 0 && (
                    <div>
                      {parseFloat(formBuyPrice) > 0 && parseFloat(formWholesalePrice) <= parseFloat(formBuyPrice) ? (
                        <div className="p-2.5 rounded-lg bg-rose-500/15 border border-rose-500/40 text-rose-700 dark:text-rose-300 text-xs flex items-start gap-2">
                          <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600 mt-0.5" />
                          <div className="text-[11px] leading-tight">
                            <span className="font-bold">⚠️ PERINGATAN RUGI MODAL:</span> Harga grosir (Rp {parseFloat(formWholesalePrice).toLocaleString('id-ID')}) berada di bawah atau sama dengan modal beli HPP (Rp {parseFloat(formBuyPrice).toLocaleString('id-ID')}). Penjualan grosir ini akan menghasilkan kerugian!
                          </div>
                        </div>
                      ) : parseFloat(formBuyPrice) > 0 ? (
                        <div className="p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-xs flex items-center justify-between text-emerald-800 dark:text-emerald-300">
                          <span className="text-[11px]">
                            Margin Laba Grosir terhadap Modal HPP:
                          </span>
                          <span className="font-mono font-bold text-[11px]">
                            +Rp {(parseFloat(formWholesalePrice) - parseFloat(formBuyPrice)).toLocaleString('id-ID')} ({Math.round(((parseFloat(formWholesalePrice) - parseFloat(formBuyPrice)) / parseFloat(formBuyPrice)) * 100)}%)
                          </span>
                        </div>
                      ) : null}
                    </div>
                  )}
                </div>
              </div>

              {/* Stock Section */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-text-secondary mb-1">Stok Fisik Awal</label>
                  <input
                    type="number"
                    value={formCurrentStock}
                    onChange={e => setFormCurrentStock(e.target.value)}
                    className="w-full px-3 py-2 bg-subtle border border-border-strong rounded-lg font-mono font-bold text-text-primary focus:outline-none focus:border-primary"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-text-secondary mb-1">Batas Minimum Peringatan (Alert)</label>
                  <input
                    type="number"
                    value={formMinStockAlert}
                    onChange={e => setFormMinStockAlert(e.target.value)}
                    className="w-full px-3 py-2 bg-subtle border border-border-strong rounded-lg font-mono font-bold text-text-primary focus:outline-none focus:border-primary"
                  />
                </div>
              </div>

              <div className="flex gap-2 pt-3 border-t border-border-subtle">
                <button
                  type="button"
                  onClick={() => setIsProductModalOpen(false)}
                  className="flex-1 py-2 bg-subtle hover:bg-card-hover border border-border-subtle rounded-lg font-semibold text-text-secondary"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSavingProduct}
                  className="flex-1 py-2 bg-primary hover:bg-primary-hover text-primary-text rounded-lg font-bold shadow-sm disabled:opacity-50"
                >
                  {isSavingProduct ? 'Menyimpan...' : editingProduct ? 'Simpan Perubahan' : 'Simpan Produk Baru'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: IMPORT CSV PRODUK */}
      {isImportModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-2xl bg-card border border-border-strong rounded-2xl shadow-2xl overflow-hidden">
            <div className="p-4 bg-surface border-b border-border-subtle flex items-center justify-between">
              <h3 className="font-bold text-sm text-text-primary flex items-center gap-2">
                <Upload className="w-4 h-4 text-primary" />
                Impor Masal Produk dari File CSV / Excel
              </h3>
              <button 
                onClick={() => setIsImportModalOpen(false)} 
                className="p-1.5 rounded-lg text-text-muted hover:text-text-primary hover:bg-subtle transition-colors"
                title="Tutup Modal"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-4 text-xs">
              <div className="p-3 bg-subtle rounded-xl border border-border-subtle flex items-center justify-between">
                <div>
                  <p className="font-bold text-text-primary">Gunakan Template Standar</p>
                  <p className="text-[11px] text-text-muted">Header: SKU, Barcode, Name, Category, BuyPrice, SellPrice, WholesalePrice, WholesaleMinQty, CurrentStock, Unit</p>
                </div>
                <button
                  onClick={handleDownloadTemplate}
                  className="px-3 py-1.5 bg-card hover:bg-card-hover border border-border-subtle rounded-lg font-bold text-primary flex items-center gap-1.5 shadow-sm"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download Template</span>
                </button>
              </div>

              <div>
                <label className="block font-bold text-text-secondary mb-1.5">Pilih Berkas CSV:</label>
                <input
                  type="file"
                  accept=".csv,text/csv"
                  onChange={handleFileUpload}
                  className="w-full p-2 bg-subtle border border-dashed border-border-strong rounded-xl text-text-primary"
                />
              </div>

              <div>
                <label className="block font-bold text-text-secondary mb-1.5">Atau Tempelkan (Paste) Teks CSV Langsung:</label>
                <textarea
                  rows={6}
                  value={csvRawText}
                  onChange={(e) => setCsvRawText(e.target.value)}
                  placeholder="SKU,Barcode,Name,Category,BuyPrice,SellPrice,WholesalePrice,WholesaleMinQty,CurrentStock,Unit&#10;MIE-001,899238810101,Indomie Goreng 85g,Makanan,2800,3500,3200,5,100,PCS"
                  className="w-full p-3 bg-subtle border border-border-subtle rounded-xl font-mono text-[11px] text-text-primary focus:outline-none focus:border-primary"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  onClick={() => setIsImportModalOpen(false)}
                  className="px-4 py-2 rounded-lg bg-subtle hover:bg-card-hover font-semibold text-text-secondary border border-border-subtle"
                >
                  Batal
                </button>
                <button
                  onClick={handleExecuteImport}
                  disabled={isImporting || !csvRawText.trim()}
                  className="px-4 py-2 rounded-lg bg-primary text-primary-text font-bold shadow-md hover:bg-primary-hover disabled:opacity-40 flex items-center gap-1.5"
                >
                  <Upload className="w-4 h-4" />
                  <span>{isImporting ? 'Sedang Memproses...' : 'Mulai Impor ke Database'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: MULTI-UNIT CONVERSIONS (DUS, LUSIN, RENTENG) */}
      {selectedProductForUnits && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-xl bg-card border border-border-strong rounded-2xl shadow-2xl overflow-hidden">
            <div className="p-4 bg-surface border-b border-border-subtle flex items-center justify-between">
              <div>
                <h3 className="font-bold text-sm text-text-primary flex items-center gap-2">
                  <Package className="w-4 h-4 text-primary" />
                  Konversi Kemasan: {selectedProductForUnits.name}
                </h3>
                <p className="text-[11px] text-text-secondary">
                  Satuan Dasar: <strong>1 {selectedProductForUnits.unit}</strong> (Rp {selectedProductForUnits.sellPrice.toLocaleString('id-ID')})
                </p>
              </div>
              <button 
                onClick={() => setSelectedProductForUnits(null)} 
                className="p-1.5 rounded-lg text-text-muted hover:text-text-primary hover:bg-subtle transition-colors"
                title="Tutup Modal"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-4 text-xs">
              {/* Form Tambah Satuan */}
              <form onSubmit={handleAddUnitConversion} className="p-3.5 bg-subtle rounded-xl border border-border-subtle space-y-3">
                <h4 className="font-bold text-text-primary text-xs flex items-center gap-1.5">
                  <Plus className="w-3.5 h-3.5 text-primary" /> Tambah Kemasan Baru (Dus / Lusin / Karton)
                </h4>
                <div className="grid grid-cols-4 gap-2">
                  <div>
                    <label className="block text-[10px] font-bold text-text-muted mb-1">Nama Satuan</label>
                    <input
                      type="text"
                      required
                      value={newUnitName}
                      onChange={(e) => setNewUnitName(e.target.value)}
                      placeholder="DUS / LUSIN"
                      className="w-full px-2.5 py-1.5 bg-card border border-border-subtle rounded-lg uppercase font-bold text-text-primary"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-text-muted mb-1">Isi per Kemasan</label>
                    <input
                      type="number"
                      required
                      min={2}
                      value={newConversionFactor}
                      onChange={(e) => setNewConversionFactor(Number(e.target.value))}
                      placeholder="40"
                      className="w-full px-2.5 py-1.5 bg-card border border-border-subtle rounded-lg font-mono font-bold text-text-primary"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-text-muted mb-1">Barcode Kardus</label>
                    <input
                      type="text"
                      value={newUnitBarcode}
                      onChange={(e) => setNewUnitBarcode(e.target.value)}
                      placeholder="Barcode Dus"
                      className="w-full px-2.5 py-1.5 bg-card border border-border-subtle rounded-lg font-mono text-text-primary"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-text-muted mb-1">Harga Jual Kemasan</label>
                    <input
                      type="number"
                      required
                      value={newUnitSellPrice}
                      onChange={(e) => setNewUnitSellPrice(Number(e.target.value))}
                      placeholder="135000"
                      className="w-full px-2.5 py-1.5 bg-card border border-border-subtle rounded-lg font-mono font-bold text-primary"
                    />
                  </div>
                </div>
                <div className="flex justify-end">
                  <button
                    type="submit"
                    className="px-3 py-1.5 bg-primary text-primary-text rounded-lg font-bold shadow-sm hover:bg-primary-hover"
                  >
                    + Simpan Satuan Kemasan
                  </button>
                </div>
              </form>

              {/* Daftar Satuan Terdaftar */}
              <div className="space-y-1.5">
                <h4 className="font-bold text-text-secondary text-xs">Satuan Kemasan Terdaftar:</h4>
                {unitConversions.length === 0 ? (
                  <p className="p-4 text-center text-text-muted bg-subtle rounded-xl border border-dashed border-border-subtle">
                    Belum ada kemasan khusus. Produk hanya dijual per {selectedProductForUnits.unit}.
                  </p>
                ) : (
                  unitConversions.map((u) => (
                    <div key={u.id} className="p-3 bg-card rounded-xl border border-border-subtle flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary font-bold flex items-center justify-center font-mono">
                          {u.unitName}
                        </div>
                        <div>
                          <p className="font-bold text-text-primary">
                            1 {u.unitName} = {u.conversionFactor} {selectedProductForUnits.unit}
                          </p>
                          <p className="text-[11px] text-text-muted font-mono">
                            Barcode: {u.barcode || '-'}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="font-bold font-mono text-primary">
                          Rp {u.sellPrice.toLocaleString('id-ID')}
                        </span>
                        <button
                          onClick={() => u.id && handleDeleteUnitConversion(u.id)}
                          className="p-1.5 rounded-lg text-text-muted hover:text-status-danger hover:bg-subtle"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: KARTU RIWAYAT MUTASI STOK (STOCK LEDGER) */}
      {selectedProductForLedger && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-3xl bg-card border border-border-strong rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
            <div className="p-4 bg-surface border-b border-border-subtle flex items-center justify-between">
              <div>
                <h3 className="font-bold text-sm text-text-primary flex items-center gap-2">
                  <Layers className="w-4 h-4 text-status-info" />
                  Kartu Mutasi Stok: {selectedProductForLedger.name}
                </h3>
                <p className="text-[11px] text-text-secondary">
                  SKU: <strong className="font-mono">{selectedProductForLedger.sku}</strong> • Stok Fisik Saat Ini: <strong className="text-primary font-mono">{selectedProductForLedger.currentStock} {selectedProductForLedger.unit}</strong> • HPP: <strong className="font-mono">Rp {selectedProductForLedger.buyPrice.toLocaleString('id-ID')}</strong>
                </p>
              </div>
              <button 
                onClick={() => setSelectedProductForLedger(null)} 
                className="p-1.5 rounded-lg text-text-muted hover:text-text-primary hover:bg-subtle transition-colors"
                title="Tutup Modal"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 flex-1 overflow-y-auto space-y-3">
              {isLoadingMutations ? (
                <p className="p-8 text-center text-xs text-text-muted">Memuat riwayat mutasi stok...</p>
              ) : productMutations.length === 0 ? (
                <div className="p-8 text-center text-xs text-text-muted bg-subtle rounded-xl border border-border-subtle">
                  Belum ada catatan mutasi stok untuk produk ini.
                </div>
              ) : (
                <div className="bg-surface border border-border-subtle rounded-xl overflow-hidden shadow-xs">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-subtle text-text-secondary font-semibold border-b border-border-subtle">
                      <tr>
                        <th className="p-2.5">Tanggal & Waktu</th>
                        <th className="p-2.5">Tipe Mutasi</th>
                        <th className="p-2.5 text-center">Perubahan</th>
                        <th className="p-2.5 text-center">Sebelum → Sesudah</th>
                        <th className="p-2.5">No. Referensi / Keterangan</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border-subtle/50 font-mono">
                      {productMutations.map((m) => {
                        const isPlus = m.quantity > 0;
                        return (
                          <tr key={m.id} className="hover:bg-card-hover/50 text-[11px]">
                            <td className="p-2.5 text-text-muted font-sans">{new Date(m.createdAt).toLocaleString('id-ID')}</td>
                            <td className="p-2.5 font-sans font-semibold">
                              <span className={`px-2 py-0.5 rounded text-[10px] ${
                                m.mutationType === 'SaleOut' 
                                  ? 'bg-primary/10 text-primary' 
                                  : m.mutationType === 'PurchaseReceived'
                                  ? 'bg-status-success/10 text-status-success'
                                  : m.mutationType === 'SalesReturn'
                                  ? 'bg-status-info/10 text-status-info'
                                  : 'bg-status-warning/10 text-status-warning'
                              }`}>
                                {m.mutationType === 'SaleOut' && (
                                  <span className="inline-flex items-center gap-1">
                                    <ShoppingCart className="w-3 h-3 text-primary" />
                                    Penjualan POS
                                  </span>
                                )}
                                {m.mutationType === 'PurchaseReceived' && (
                                  <span className="inline-flex items-center gap-1">
                                    <Package className="w-3 h-3 text-status-success" />
                                    Faktur Pembelian
                                  </span>
                                )}
                                {m.mutationType === 'StockOpnameAdjustment' && (
                                  <span className="inline-flex items-center gap-1">
                                    <ClipboardList className="w-3 h-3 text-status-warning" />
                                    Penyesuaian Opname
                                  </span>
                                )}
                                {m.mutationType === 'SalesReturn' && (
                                  <span className="inline-flex items-center gap-1">
                                    <RotateCcw className="w-3 h-3 text-status-info" />
                                    Retur Penjualan
                                  </span>
                                )}
                                {!['SaleOut', 'PurchaseReceived', 'StockOpnameAdjustment', 'SalesReturn'].includes(m.mutationType) && m.mutationType}
                              </span>
                            </td>
                            <td className={`p-2.5 text-center font-bold font-mono ${isPlus ? 'text-status-success' : 'text-status-danger'}`}>
                              {isPlus ? `+${m.quantity}` : m.quantity}
                            </td>
                            <td className="p-2.5 text-center text-text-secondary">
                              {m.stockBefore} → <strong className="text-text-primary">{m.stockAfter}</strong>
                            </td>
                            <td className="p-2.5 font-sans text-text-muted">
                              <span className="font-mono text-text-primary">{m.referenceNumber || '-'}</span>
                              {m.notes && <span className="block text-[10px]">{m.notes}</span>}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <div className="p-3 bg-subtle border-t border-border-subtle flex justify-end">
              <button
                onClick={() => setSelectedProductForLedger(null)}
                className="px-4 py-1.5 bg-card hover:bg-card-hover border border-border-subtle rounded-lg text-xs font-semibold text-text-primary"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: CETAK CEPAT BARCODE PRODUK */}
      <QuickBarcodePrintModal
        isOpen={!!selectedProductForBarcode}
        product={selectedProductForBarcode}
        onClose={() => setSelectedProductForBarcode(null)}
      />

      {/* MODAL: KELOLA KATEGORI PRODUK */}
      <CategoryManagementModal
        isOpen={isCategoryModalOpen}
        onClose={() => setIsCategoryModalOpen(false)}
        onCategoriesChanged={() => {
          fetchCategories();
          fetchProducts();
        }}
        mode={mode}
      />

      {/* MODAL: SCAN BARCODE VIA KAMERA */}
      <ProductBarcodeScanModal
        isOpen={isBarcodeScanModalOpen}
        onClose={() => setIsBarcodeScanModalOpen(false)}
        onBarcodeDetected={(scannedBarcode) => {
          setFormBarcode(scannedBarcode);
          setIsBarcodeScanModalOpen(false);
          useToastStore.getState().showToast(`Barcode terdeteksi: ${scannedBarcode}`, 'success');
        }}
      />

      {/* MODAL: PENERIMAAN STOK KILAT (QUICK STOCK IN) */}
      <QuickStockInModal
        isOpen={isQuickStockInOpen}
        product={quickStockInProduct}
        onClose={() => {
          setIsQuickStockInOpen(false);
          setQuickStockInProduct(null);
        }}
        onSuccess={() => {
          fetchProducts();
        }}
      />
    </div>
  );
};

// ==========================================
// 2. CRM & KASBON (RECEIVABLES) MODAL & PAGE
// ==========================================
interface CustomerKasbonModalProps {
  customer: Customer | null;
  isOpen: boolean;
  onClose: () => void;
  onPaymentSuccess: () => void;
  initialTab?: 'pay' | 'invoices' | 'history';
}

const CustomerKasbonModal: React.FC<CustomerKasbonModalProps> = ({
  customer,
  isOpen,
  onClose,
  onPaymentSuccess,
  initialTab = 'pay'
}) => {
  const { currentUser } = useAuthStore();
  const { fetchActiveShift } = useShiftStore();
  const [activeTab, setActiveTab] = useState<'pay' | 'invoices' | 'history'>(initialTab);
  const [receivables, setReceivables] = useState<any[]>([]);
  const [recentPayments, setRecentPayments] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [payAmount, setPayAmount] = useState<number>(0);
  const [paymentMethod, setPaymentMethod] = useState<string>('Cash');
  const [refNumber, setRefNumber] = useState('');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (isOpen && customer) {
      setActiveTab(initialTab);
      setPayAmount(customer.totalReceivable || 0);
      setRefNumber('');
      setNotes('');
      fetchReceivablesData();
    }
  }, [isOpen, customer, initialTab]);

  const fetchReceivablesData = async () => {
    if (!customer) return;
    setIsLoading(true);
    try {
      const res = await fetch(`/api/v1/customers/${customer.id}/receivables`);
      if (res.ok) {
        const data = await res.json();
        setReceivables(data.receivables || []);
        setRecentPayments(data.recentPayments || []);
      }
    } catch {
      useToastStore.getState().showToast('Gagal memuat rincian kasbon.', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handlePayKasbon = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customer) return;
    if (payAmount <= 0) {
      useToastStore.getState().showToast('Masukkan jumlah pembayaran yang valid.', 'error');
      return;
    }

    try {
      setIsSubmitting(true);
      const res = await fetch(`/api/v1/customers/${customer.id}/receivables/pay`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: payAmount,
          paymentMethod: paymentMethod,
          referenceNumber: refNumber || null,
          notes: notes || null,
          cashierUserId: currentUser?.username || 'Kasir'
        })
      });

      if (!res.ok) {
        const err = await res.text();
        throw new Error(err || 'Gagal memproses pembayaran kasbon');
      }

      useToastStore.getState().showToast(`Pembayaran kasbon Rp ${payAmount.toLocaleString('id-ID')} berhasil dicatat!`, 'success');
      await fetchActiveShift();
      onPaymentSuccess();
      onClose();
    } catch (err: any) {
      useToastStore.getState().showToast(err.message || 'Gagal menyimpan pembayaran kasbon.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSendWhatsApp = () => {
    if (!customer?.phoneNumber) {
      useToastStore.getState().showToast(`Pelanggan ${customer?.name} tidak memiliki nomor HP terdaftar.`, 'error');
      return;
    }
    let phone = customer.phoneNumber.replace(/[^0-9]/g, '');
    if (phone.startsWith('0')) {
      phone = '62' + phone.slice(1);
    }
    const msg = `Halo Kak ${customer.name},\n\nSalam hangat dari Toko/Kasir OmniPOS.\nKami ingin menginformasikan saldo kasbon/piutang belanja Anda saat ini:\n\n*Total Kasbon: Rp ${(customer.totalReceivable || 0).toLocaleString('id-ID')}*\n\nMohon konfirmasi atau lakukan pelunasan via kasir/transfer. Terima kasih! 🙏`;
    window.open(`https://api.whatsapp.com/send?phone=${phone}&text=${encodeURIComponent(msg)}`, '_blank');
  };

  if (!isOpen || !customer) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-card w-full max-w-2xl rounded-2xl shadow-2xl border border-border-subtle flex flex-col max-h-[90vh] overflow-hidden animate-in fade-in zoom-in duration-150">
        {/* Modal Header */}
        <div className="p-5 bg-surface border-b border-border-subtle flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
              <Receipt className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-text-primary">Buku Kasbon & Pelunasan Piutang</h3>
              <p className="text-xs text-text-secondary">
                Pelanggan: <span className="font-bold text-text-primary">{customer.name}</span> · {customer.phoneNumber || 'Tanpa No. HP'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {customer.phoneNumber && (
              <button
                type="button"
                onClick={handleSendWhatsApp}
                title="Kirim Pengingat Tagihan via WhatsApp"
                className="px-3 py-1.5 rounded-lg bg-emerald-500/10 text-emerald-600 border border-emerald-500/30 text-xs font-bold flex items-center gap-1.5 hover:bg-emerald-500/20"
              >
                <MessageSquare className="w-3.5 h-3.5" /> WhatsApp
              </button>
            )}
            <button
              onClick={onClose}
              className="p-1.5 text-text-muted hover:text-text-primary rounded-lg hover:bg-subtle"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Balance Overview Banner */}
        <div className="px-5 py-3 bg-subtle/70 border-b border-border-subtle flex items-center justify-between">
          <div>
            <span className="text-[11px] text-text-muted">Total Sisa Kasbon:</span>
            <p className="text-2xl font-black font-mono tabular-nums text-rose-600">
              Rp {(customer.totalReceivable || 0).toLocaleString('id-ID')}
            </p>
          </div>
          <div className="text-right">
            <span className="text-[11px] text-text-muted">Limit Kredit:</span>
            <p className="text-xs font-bold text-text-secondary font-mono">
              Rp {(customer.creditLimit || 0).toLocaleString('id-ID')}
            </p>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-border-subtle bg-surface px-5 pt-2 gap-4">
          <button
            onClick={() => setActiveTab('pay')}
            className={`pb-2.5 text-xs font-bold border-b-2 flex items-center gap-1.5 transition-colors ${
              activeTab === 'pay'
                ? 'border-primary text-primary'
                : 'border-transparent text-text-secondary hover:text-text-primary'
            }`}
          >
            <CreditCard className="w-3.5 h-3.5" /> Bayar / Cicil Kasbon
          </button>
          <button
            onClick={() => setActiveTab('invoices')}
            className={`pb-2.5 text-xs font-bold border-b-2 flex items-center gap-1.5 transition-colors ${
              activeTab === 'invoices'
                ? 'border-primary text-primary'
                : 'border-transparent text-text-secondary hover:text-text-primary'
            }`}
          >
            <Receipt className="w-3.5 h-3.5" /> Faktur Belum Lunas ({receivables.length})
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`pb-2.5 text-xs font-bold border-b-2 flex items-center gap-1.5 transition-colors ${
              activeTab === 'history'
                ? 'border-primary text-primary'
                : 'border-transparent text-text-secondary hover:text-text-primary'
            }`}
          >
            <History className="w-3.5 h-3.5" /> Riwayat Pembayaran ({recentPayments.length})
          </button>
        </div>

        {/* Tab Content */}
        <div className="p-5 flex-1 overflow-y-auto">
          {isLoading ? (
            <div className="py-12 text-center text-xs text-text-muted">Memuat data faktur kasbon...</div>
          ) : activeTab === 'pay' ? (
            <form onSubmit={handlePayKasbon} className="space-y-4 max-w-lg mx-auto">
              <div>
                <label className="block text-xs font-bold text-text-secondary mb-1">
                  Jumlah Pembayaran (Rp)
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-text-muted">Rp</span>
                  <input
                    type="number"
                    min="1"
                    max={customer.totalReceivable || 999999999}
                    value={payAmount || ''}
                    onChange={(e) => setPayAmount(Number(e.target.value))}
                    required
                    className="w-full pl-10 pr-4 py-2.5 bg-subtle border border-border-subtle rounded-xl text-base font-bold font-mono text-text-primary focus:outline-none focus:border-primary"
                    placeholder="0"
                  />
                </div>
              </div>

              {/* Quick Amount Buttons */}
              <div className="flex items-center gap-2 flex-wrap">
                <button
                  type="button"
                  onClick={() => setPayAmount(customer.totalReceivable || 0)}
                  className="px-2.5 py-1 rounded-lg bg-emerald-500/10 text-emerald-600 border border-emerald-500/30 text-xs font-bold hover:bg-emerald-500/20"
                >
                  Lunas Penuh (Rp {(customer.totalReceivable || 0).toLocaleString('id-ID')})
                </button>
                {customer.totalReceivable > 10000 && (
                  <button
                    type="button"
                    onClick={() => setPayAmount(Math.round((customer.totalReceivable || 0) / 2))}
                    className="px-2.5 py-1 rounded-lg bg-subtle border border-border-subtle text-xs font-bold hover:bg-card"
                  >
                    50% (Rp {Math.round((customer.totalReceivable || 0) / 2).toLocaleString('id-ID')})
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setPayAmount(50000)}
                  className="px-2.5 py-1 rounded-lg bg-subtle border border-border-subtle text-xs font-bold hover:bg-card"
                >
                  Rp 50.000
                </button>
                <button
                  type="button"
                  onClick={() => setPayAmount(100000)}
                  className="px-2.5 py-1 rounded-lg bg-subtle border border-border-subtle text-xs font-bold hover:bg-card"
                >
                  Rp 100.000
                </button>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-text-secondary mb-1">
                    Metode Pembayaran
                  </label>
                  <select
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                    className="w-full px-3 py-2 bg-subtle border border-border-subtle rounded-xl text-xs font-bold text-text-primary focus:outline-none focus:border-primary"
                  >
                    <option value="Cash">Tunai (Masuk Kasir Shift)</option>
                    <option value="Transfer Bank">Transfer Bank</option>
                    <option value="QRIS">QRIS Dinamis / Statis</option>
                    <option value="Debit">Kartu Debit / EDC</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-text-secondary mb-1">
                    No. Referensi / Bukti (Opsional)
                  </label>
                  <input
                    type="text"
                    value={refNumber}
                    onChange={(e) => setRefNumber(e.target.value)}
                    placeholder="Contoh: TRF-9021..."
                    className="w-full px-3 py-2 bg-subtle border border-border-subtle rounded-xl text-xs text-text-primary focus:outline-none focus:border-primary"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-text-secondary mb-1">
                  Catatan Pelunasan (Opsional)
                </label>
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Contoh: Titipan pelunasan via supir / toko"
                  className="w-full px-3 py-2 bg-subtle border border-border-subtle rounded-xl text-xs text-text-primary focus:outline-none focus:border-primary"
                />
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isSubmitting || payAmount <= 0}
                  className="w-full py-3 rounded-xl bg-primary text-primary-text font-bold text-sm hover:bg-primary-hover shadow-md disabled:opacity-50 transition-all flex items-center justify-center gap-2"
                >
                  {isSubmitting ? 'Memproses...' : `Konfirmasi Pembayaran Rp ${payAmount.toLocaleString('id-ID')}`}
                </button>
              </div>
            </form>
          ) : activeTab === 'invoices' ? (
            <div className="space-y-3">
              {receivables.length === 0 ? (
                <div className="py-12 text-center text-xs text-text-muted">
                  Tidak ada faktur kasbon aktif yang belum lunas.
                </div>
              ) : (
                <div className="divide-y divide-border-subtle border border-border-subtle rounded-xl overflow-hidden">
                  {receivables.map((r) => (
                    <div key={r.id} className="p-3 bg-surface hover:bg-subtle/50 flex items-center justify-between text-xs">
                      <div>
                        <p className="font-bold text-text-primary font-mono">{r.invoiceNumber}</p>
                        <p className="text-[11px] text-text-muted">
                          {new Date(r.createdAt).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                        </p>
                        {r.notes && <p className="text-[11px] text-text-secondary italic">{r.notes}</p>}
                      </div>
                      <div className="text-right">
                        <span className="text-[11px] text-text-muted">Sisa Tagihan:</span>
                        <p className="font-bold font-mono text-rose-600">
                          Rp {(r.balanceDue || r.amount).toLocaleString('id-ID')}
                        </p>
                        <span className="text-[10px] text-text-muted">Total Awal: Rp {(r.amount || 0).toLocaleString('id-ID')}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              {recentPayments.length === 0 ? (
                <div className="py-12 text-center text-xs text-text-muted">
                  Belum ada riwayat pembayaran kasbon yang tercatat.
                </div>
              ) : (
                <div className="divide-y divide-border-subtle border border-border-subtle rounded-xl overflow-hidden">
                  {recentPayments.map((p) => (
                    <div key={p.id} className="p-3 bg-surface hover:bg-subtle/50 flex items-center justify-between text-xs">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 text-[10px] font-bold">
                            {p.paymentMethod}
                          </span>
                          {p.referenceNumber && (
                            <span className="text-[10px] text-text-muted font-mono">Ref: {p.referenceNumber}</span>
                          )}
                        </div>
                        <p className="text-[11px] text-text-muted mt-1">
                          {new Date(p.createdAt).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })} · Kasir: {p.cashierUserId || 'Sistem'}
                        </p>
                        {p.notes && <p className="text-[11px] text-text-secondary italic">{p.notes}</p>}
                      </div>
                      <div className="text-right">
                        <p className="font-bold font-mono text-emerald-600">
                          + Rp {(p.amount || 0).toLocaleString('id-ID')}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export const CustomersPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'members' | 'kasbon' | 'deposit' | 'birthday'>('members');
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [agingSummary, setAgingSummary] = useState<CustomerAgingSummary | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [searchCustomer, setSearchCustomer] = useState('');
  const [filterGroup, setFilterGroup] = useState('');
  const [filterTier, setFilterTier] = useState('');

  // Modals state
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);

  const [isProfileDrawerOpen, setIsProfileDrawerOpen] = useState(false);
  const [profileCustomer, setProfileCustomer] = useState<Customer | null>(null);

  const [isDepositModalOpen, setIsDepositModalOpen] = useState(false);
  const [depositCustomer, setDepositCustomer] = useState<Customer | null>(null);

  const [isStatementModalOpen, setIsStatementModalOpen] = useState(false);
  const [statementCustomer, setStatementCustomer] = useState<Customer | null>(null);

  const [isKasbonModalOpen, setIsKasbonModalOpen] = useState(false);
  const [kasbonCustomer, setKasbonCustomer] = useState<Customer | null>(null);
  const [modalInitialTab, setModalInitialTab] = useState<'pay' | 'invoices' | 'history'>('pay');

  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadCustomers = async () => {
    setIsLoading(true);
    try {
      const [cRes, aRes] = await Promise.all([
        fetch('/api/v1/customers'),
        fetch('/api/v1/customers/receivables/aging')
      ]);
      if (cRes.ok) {
        const cData = await cRes.json();
        setCustomers(cData || []);
      }
      if (aRes.ok) {
        const aData = await aRes.json();
        setAgingSummary(aData);
      }
    } catch {
      useToastStore.getState().showToast('Gagal memuat data pelanggan.', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadCustomers();
  }, []);

  const handleOpenAddModal = () => {
    setEditingCustomer(null);
    setIsFormModalOpen(true);
  };

  const handleOpenEditModal = (c: Customer, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setEditingCustomer(c);
    setIsFormModalOpen(true);
  };

  const handleOpenProfile360 = (c: Customer) => {
    setProfileCustomer(c);
    setIsProfileDrawerOpen(true);
  };

  const handleOpenDepositModal = (c: Customer, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setDepositCustomer(c);
    setIsDepositModalOpen(true);
  };

  const handleOpenStatementModal = (c: Customer, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setStatementCustomer(c);
    setIsStatementModalOpen(true);
  };

  const handleOpenKasbonModal = (c: Customer, tab: 'pay' | 'invoices' | 'history' = 'pay', e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setKasbonCustomer(c);
    setModalInitialTab(tab);
    setIsKasbonModalOpen(true);
  };

  const handleExportCsv = () => {
    window.open('/api/v1/customers/export-csv', '_blank');
  };

  const handleImportCsv = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      const text = event.target?.result;
      if (typeof text !== 'string') return;

      try {
        const res = await fetch('/api/v1/customers/import-csv', {
          method: 'POST',
          headers: { 'Content-Type': 'text/csv' },
          body: text
        });
        const data = await res.json();
        if (res.ok) {
          useToastStore.getState().showToast(data.message || 'Impor CSV berhasil!', 'success');
          loadCustomers();
        } else {
          useToastStore.getState().showToast(data.message || 'Gagal impor CSV.', 'error');
        }
      } catch {
        useToastStore.getState().showToast('Terjadi kesalahan saat mengunggah CSV.', 'error');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleSendWhatsAppReminder = (customer: Customer, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (!customer.phoneNumber) {
      useToastStore.getState().showToast(`Pelanggan ${customer.name} tidak memiliki nomor WhatsApp.`, 'error');
      return;
    }
    let phone = customer.phoneNumber.replace(/[^0-9]/g, '');
    if (phone.startsWith('0')) {
      phone = '62' + phone.slice(1);
    } else if (!phone.startsWith('62')) {
      phone = '62' + phone;
    }
    const storeName = useAuthStore.getState().storeInfo?.storeName || 'OmniPOS Store';
    const msg = `Halo Kak *${customer.name}*,\n\nSalam dari *${storeName}*.\nKami menginformasikan catatan saldo tagihan kasbon Anda saat ini:\n\n*Total Kasbon: Rp ${(customer.totalReceivable || 0).toLocaleString('id-ID')}*\n\nMohon konfirmasi atau lakukan pelunasan di kasir kami saat berkunjung. Terima kasih banyak! 🙏`;
    window.open(`https://api.whatsapp.com/send?phone=${phone}&text=${encodeURIComponent(msg)}`, '_blank');
  };

  const handleSendBirthdayGreeting = (customer: Customer, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (!customer.phoneNumber) {
      useToastStore.getState().showToast(`Pelanggan ${customer.name} tidak memiliki nomor WhatsApp.`, 'error');
      return;
    }
    let phone = customer.phoneNumber.replace(/[^0-9]/g, '');
    if (phone.startsWith('0')) {
      phone = '62' + phone.slice(1);
    } else if (!phone.startsWith('62')) {
      phone = '62' + phone;
    }
    const msg = `🎉 *SELAMAT ULANG TAHUN KAK ${customer.name.toUpperCase()}!* 🎂🎈\n\nKeluarga besar OmniPOS mengucapkan selamat bertambah usia! Semoga selalu diberikan kesehatan, kesuksesan, dan kebahagiaan berlimpah.\n\nSebagai hadiah spesial, dapatkan *Bonus Poin Loyalitas & Diskon Eksklusif* pada kunjungan belanja Anda berikutnya di toko kami!\n\nSampai jumpa di kasir OmniPOS ya kak! ✨`;
    window.open(`https://api.whatsapp.com/send?phone=${phone}&text=${encodeURIComponent(msg)}`, '_blank');
  };

  // Filtered lists
  const filteredCustomers = customers.filter(c => {
    const matchSearch = !searchCustomer ||
      c.name.toLowerCase().includes(searchCustomer.toLowerCase()) ||
      (c.phoneNumber || '').includes(searchCustomer) ||
      (c.memberCode || '').toLowerCase().includes(searchCustomer.toLowerCase());
    const matchGroup = !filterGroup || c.customerGroup === filterGroup;
    const matchTier = !filterTier || (c.memberTier || 'BRONZE') === filterTier;
    return matchSearch && matchGroup && matchTier;
  });

  const kasbonCustomers = customers.filter(c => (c.totalReceivable || 0) > 0);
  const depositCustomers = customers.filter(c => (c.depositBalance || 0) > 0);

  // Birthday this month
  const currentMonth = new Date().getMonth() + 1;
  const birthdayCustomers = customers.filter(c => {
    if (!c.birthDate) return false;
    const bMonth = new Date(c.birthDate).getMonth() + 1;
    return bMonth === currentMonth;
  });

  // Global calculations
  const totalKasbon = customers.reduce((s, c) => s + (c.totalReceivable || 0), 0);
  const totalDeposit = customers.reduce((s, c) => s + (c.depositBalance || 0), 0);
  const totalPoin = customers.reduce((s, c) => s + (c.loyaltyPoints || 0), 0);
  const groups = [...new Set(customers.map(c => c.customerGroup).filter(Boolean))];

  const getTierBadge = (tier?: string) => {
    const t = (tier || 'BRONZE').toUpperCase();
    if (t === 'PLATINUM') return 'bg-purple-100 text-purple-800 border-purple-300';
    if (t === 'GOLD') return 'bg-amber-100 text-amber-800 border-amber-300';
    if (t === 'SILVER') return 'bg-slate-200 text-slate-800 border-slate-300';
    return 'bg-amber-50 text-amber-900 border-amber-200';
  };

  return (
    <div className="flex-1 flex flex-col bg-app overflow-hidden select-none">
      {/* Page Header */}
      <div className="p-4 bg-surface border-b border-border-subtle flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-bold shadow-sm">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-text-primary">CRM & Manajemen Member</h2>
            <p className="text-xs text-text-secondary">Loyalitas bertingkat (Tiering), Saldo Deposit (Store Credit), Buku Kasbon, dan Notifikasi WhatsApp Rp 0</p>
          </div>
        </div>

        {/* Global Header Actions */}
        <div className="flex items-center gap-2">
          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleImportCsv} 
            accept=".csv" 
            className="hidden" 
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="px-3 py-1.5 rounded-lg border border-border-subtle bg-card hover:bg-subtle text-xs font-semibold text-text-primary flex items-center gap-1.5 transition-colors"
            title="Unggah berkas CSV data member"
          >
            <Upload className="w-3.5 h-3.5 text-text-muted" /> Impor CSV
          </button>
          <button
            type="button"
            onClick={handleExportCsv}
            className="px-3 py-1.5 rounded-lg border border-border-subtle bg-card hover:bg-subtle text-xs font-semibold text-text-primary flex items-center gap-1.5 transition-colors"
            title="Download seluruh data member dalam format CSV"
          >
            <Download className="w-3.5 h-3.5 text-text-muted" /> Ekspor CSV
          </button>
          <button
            type="button"
            onClick={handleOpenAddModal}
            className="px-3.5 py-1.5 rounded-lg bg-primary hover:bg-primary-hover text-white text-xs font-bold flex items-center gap-1.5 shadow-sm transition-colors"
          >
            <UserPlus className="w-4 h-4" /> Tambah Member
          </button>
        </div>
      </div>

      {/* Tabs Bar */}
      <div className="px-4 bg-surface border-b border-border-subtle flex items-center gap-2">
        <button
          type="button"
          onClick={() => setActiveTab('members')}
          className={`py-3 px-4 text-xs font-bold border-b-2 flex items-center gap-2 transition-all ${
            activeTab === 'members'
              ? 'border-primary text-primary'
              : 'border-transparent text-text-muted hover:text-text-primary'
          }`}
        >
          <Users className="w-4 h-4" />
          Direktori Member ({customers.length})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('kasbon')}
          className={`py-3 px-4 text-xs font-bold border-b-2 flex items-center gap-2 transition-all ${
            activeTab === 'kasbon'
              ? 'border-rose-600 text-rose-600'
              : 'border-transparent text-text-muted hover:text-text-primary'
          }`}
        >
          <DollarSign className="w-4 h-4" />
          Buku Kasbon & Aging ({kasbonCustomers.length})
          {totalKasbon > 0 && (
            <span className="ml-1 px-1.5 py-0.5 rounded-full text-[10px] bg-rose-500/10 text-rose-600 border border-rose-500/20 font-mono">
              Rp {(totalKasbon / 1000).toLocaleString('id-ID')}k
            </span>
          )}
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('deposit')}
          className={`py-3 px-4 text-xs font-bold border-b-2 flex items-center gap-2 transition-all ${
            activeTab === 'deposit'
              ? 'border-emerald-600 text-emerald-600'
              : 'border-transparent text-text-muted hover:text-text-primary'
          }`}
        >
          <Wallet className="w-4 h-4" />
          Saldo Deposit ({depositCustomers.length})
          {totalDeposit > 0 && (
            <span className="ml-1 px-1.5 py-0.5 rounded-full text-[10px] bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 font-mono">
              Rp {(totalDeposit / 1000).toLocaleString('id-ID')}k
            </span>
          )}
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('birthday')}
          className={`py-3 px-4 text-xs font-bold border-b-2 flex items-center gap-2 transition-all ${
            activeTab === 'birthday'
              ? 'border-amber-500 text-amber-600'
              : 'border-transparent text-text-muted hover:text-text-primary'
          }`}
        >
          <Cake className="w-4 h-4" />
          Ulang Tahun Bulan Ini ({birthdayCustomers.length})
        </button>
      </div>

      {/* Main Tab Content */}
      <div className="flex-1 overflow-y-auto p-4">
        {isLoading ? (
          <div className="py-24 text-center text-xs text-text-muted">Memuat data CRM & Pelanggan...</div>
        ) : (
          <>
            {/* ========================================================= */}
            {/* TAB 1: DIREKTORI MEMBER */}
            {/* ========================================================= */}
            {activeTab === 'members' && (
              <div className="space-y-4">
                {/* Metrics Banner */}
                <div className="grid grid-cols-4 gap-3">
                  <div className="p-3.5 bg-card rounded-xl border border-border-subtle shadow-sm flex items-center gap-3">
                    <div className="p-2.5 rounded-lg bg-primary/10 text-primary">
                      <Users className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-[11px] font-semibold text-text-muted uppercase tracking-wider">Total Pelanggan</p>
                      <p className="text-xl font-bold text-text-primary mt-0.5">{customers.length}</p>
                    </div>
                  </div>
                  <div className="p-3.5 bg-card rounded-xl border border-border-subtle shadow-sm flex items-center gap-3">
                    <div className="p-2.5 rounded-lg bg-emerald-500/10 text-emerald-600">
                      <Wallet className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-[11px] font-semibold text-text-muted uppercase tracking-wider">Saldo Deposit Pelanggan</p>
                      <p className="text-xl font-bold text-emerald-600 mt-0.5 font-mono">
                        Rp {totalDeposit.toLocaleString('id-ID')}
                      </p>
                    </div>
                  </div>
                  <div className="p-3.5 bg-card rounded-xl border border-border-subtle shadow-sm flex items-center gap-3">
                    <div className="p-2.5 rounded-lg bg-rose-500/10 text-rose-600">
                      <DollarSign className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-[11px] font-semibold text-text-muted uppercase tracking-wider">Total Kasbon Belum Lunas</p>
                      <p className="text-xl font-bold text-rose-600 mt-0.5 font-mono">
                        Rp {totalKasbon.toLocaleString('id-ID')}
                      </p>
                    </div>
                  </div>
                  <div className="p-3.5 bg-card rounded-xl border border-border-subtle shadow-sm flex items-center gap-3">
                    <div className="p-2.5 rounded-lg bg-amber-500/10 text-amber-600">
                      <Award className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-[11px] font-semibold text-text-muted uppercase tracking-wider">Total Poin Beredar</p>
                      <p className="text-xl font-bold text-amber-600 mt-0.5 font-mono">
                        {totalPoin.toLocaleString('id-ID')} Poin
                      </p>
                    </div>
                  </div>
                </div>

                {/* Filter & Search Bar */}
                <div className="p-3 bg-card rounded-xl border border-border-subtle flex items-center justify-between gap-3 flex-wrap">
                  <div className="flex items-center gap-2">
                    <div className="relative">
                      <Search className="w-3.5 h-3.5 text-text-muted absolute left-2.5 top-1/2 -translate-y-1/2" />
                      <input 
                        type="text" 
                        value={searchCustomer} 
                        onChange={e => setSearchCustomer(e.target.value)}
                        placeholder="Cari nama, no. HP, atau kode barcode member..."
                        className="pl-8 pr-3 py-1.5 bg-subtle border border-border-subtle rounded-lg text-xs text-text-primary focus:outline-none focus:border-primary w-64" 
                      />
                    </div>
                    <select
                      value={filterTier}
                      onChange={e => setFilterTier(e.target.value)}
                      className="px-3 py-1.5 bg-subtle border border-border-subtle rounded-lg text-xs font-semibold text-text-primary focus:outline-none focus:border-primary"
                    >
                      <option value="">Semua Tier</option>
                      <option value="BRONZE">Bronze (Belanja &lt; 1jt)</option>
                      <option value="SILVER">Silver (Belanja ≥ 1jt)</option>
                      <option value="GOLD">Gold (Belanja ≥ 5jt)</option>
                      <option value="PLATINUM">Platinum (Belanja ≥ 15jt)</option>
                    </select>
                    {groups.length > 0 && (
                      <select 
                        value={filterGroup} 
                        onChange={e => setFilterGroup(e.target.value)}
                        className="px-3 py-1.5 bg-subtle border border-border-subtle rounded-lg text-xs font-semibold text-text-primary focus:outline-none focus:border-primary"
                      >
                        <option value="">Semua Grup</option>
                        {groups.map(g => <option key={g} value={g}>{g}</option>)}
                      </select>
                    )}
                  </div>
                  <div className="text-xs text-text-muted font-medium">
                    Menampilkan <span className="font-bold text-text-primary">{filteredCustomers.length}</span> pelanggan
                  </div>
                </div>

                {/* Member Cards Grid */}
                {filteredCustomers.length === 0 ? (
                  <div className="py-20 text-center space-y-2">
                    <Users className="w-10 h-10 mx-auto opacity-25 text-text-muted" />
                    <p className="text-xs font-bold text-text-primary">Tidak ada pelanggan ditemukan</p>
                    <p className="text-[11px] text-text-muted">Coba ubah kata kunci pencarian atau filter tier.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-3 gap-4">
                    {filteredCustomers.map((c) => {
                      const tier = (c.memberTier || 'BRONZE').toUpperCase();
                      return (
                        <div 
                          key={c.id} 
                          onClick={() => handleOpenProfile360(c)}
                          className={`p-4 rounded-xl bg-card border shadow-sm space-y-3 cursor-pointer transition-all hover:border-primary/40 hover:shadow-md ${
                            c.totalReceivable > 0 ? 'border-rose-500/30' : 'border-border-subtle'
                          }`}
                        >
                          <div className="flex items-start justify-between">
                            <div>
                              <div className="flex items-center gap-1.5">
                                <h3 className="text-sm font-bold text-text-primary">{c.name}</h3>
                                <span className={`px-1.5 py-0.5 rounded text-[9px] font-black border uppercase ${getTierBadge(tier)}`}>
                                  {tier}
                                </span>
                              </div>
                              <p className="text-xs text-text-secondary font-mono mt-0.5 flex items-center gap-2">
                                <span>{c.phoneNumber || 'Tanpa No. HP'}</span>
                                {c.memberCode && (
                                  <span className="text-[10px] text-text-muted bg-subtle px-1.5 py-0.2 rounded border border-border-subtle">
                                    ID: {c.memberCode}
                                  </span>
                                )}
                              </p>
                            </div>
                            <button
                              type="button"
                              onClick={(e) => handleOpenEditModal(c, e)}
                              className="p-1 rounded hover:bg-subtle text-text-muted hover:text-text-primary transition-colors"
                              title="Edit Data Member"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>
                          </div>

                          {/* Stats Pill Box */}
                          <div className="p-2.5 bg-subtle rounded-lg border border-border-subtle grid grid-cols-3 gap-2 text-center text-xs">
                            <div>
                              <span className="text-text-muted text-[10px] block">Poin</span>
                              <span className="font-bold text-amber-600 font-mono">{(c.loyaltyPoints || 0).toLocaleString('id-ID')}</span>
                            </div>
                            <div>
                              <span className="text-text-muted text-[10px] block">Deposit</span>
                              <span className="font-bold text-emerald-600 font-mono">
                                Rp {((c.depositBalance || 0) / 1000).toLocaleString('id-ID')}k
                              </span>
                            </div>
                            <div>
                              <span className="text-text-muted text-[10px] block">Kasbon</span>
                              <span className={`font-bold font-mono ${c.totalReceivable > 0 ? 'text-rose-600' : 'text-text-muted'}`}>
                                {c.totalReceivable > 0 ? `Rp ${((c.totalReceivable) / 1000).toLocaleString('id-ID')}k` : 'Rp 0'}
                              </span>
                            </div>
                          </div>

                          {/* Quick Actions Row */}
                          <div className="pt-2 border-t border-border-subtle/60 flex items-center justify-between gap-1.5">
                            <button
                              type="button"
                              onClick={(e) => handleOpenDepositModal(c, e)}
                              className="py-1 px-2 rounded-lg bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20 text-[11px] font-bold flex items-center gap-1 transition-colors"
                              title="Top-Up Saldo Deposit Belanja"
                            >
                              <Wallet className="w-3 h-3" /> +Deposit
                            </button>

                            {c.totalReceivable > 0 ? (
                              <div className="flex items-center gap-1">
                                <button
                                  type="button"
                                  onClick={(e) => handleOpenStatementModal(c, e)}
                                  className="py-1 px-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-bold flex items-center gap-1 transition-colors"
                                  title="Cetak Slip Thermal Tagihan Piutang Kasbon"
                                >
                                  <Receipt className="w-3 h-3" /> Slip
                                </button>
                                <button
                                  type="button"
                                  onClick={(e) => handleOpenKasbonModal(c, 'pay', e)}
                                  className="py-1 px-2.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-[11px] font-bold flex items-center gap-1 transition-colors shadow-sm"
                                  title="Bayar Kasbon"
                                >
                                  <CreditCard className="w-3 h-3" /> Bayar
                                </button>
                              </div>
                            ) : (
                              <span className="text-[11px] text-text-muted font-medium flex items-center gap-1">
                                <CheckCircle2 className="w-3 h-3 text-emerald-500" /> Bebas Kasbon
                              </span>
                            )}

                            {c.phoneNumber && (
                              c.totalReceivable > 0 ? (
                                <button
                                  type="button"
                                  onClick={(e) => handleSendWhatsAppReminder(c, e)}
                                  className="py-1 px-2.5 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-600 text-[11px] font-bold flex items-center gap-1 transition-colors border border-emerald-500/30 shadow-sm"
                                  title="Kirim Pesan Pengingat Tagihan Kasbon via WhatsApp"
                                >
                                  <MessageSquare className="w-3 h-3 text-emerald-600" /> Tagih WA
                                </button>
                              ) : (
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    let phone = (c.phoneNumber || '').replace(/[^0-9]/g, '');
                                    if (phone.startsWith('0')) phone = '62' + phone.slice(1);
                                    else if (!phone.startsWith('62')) phone = '62' + phone;
                                    const storeName = useAuthStore.getState().storeInfo?.storeName || 'OmniPOS Store';
                                    window.open(`https://api.whatsapp.com/send?phone=${phone}&text=${encodeURIComponent(`Halo Kak ${c.name}, terima kasih telah menjadi pelanggan setia ${storeName}!`)}`, '_blank');
                                  }}
                                  className="py-1 px-2 rounded-lg bg-emerald-50 text-emerald-600 hover:bg-emerald-100 text-[11px] font-bold flex items-center gap-1 transition-colors"
                                  title="Chat WhatsApp Gratis (Click-to-Chat)"
                                >
                                  <MessageSquare className="w-3 h-3" /> WA
                                </button>
                              )
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* ========================================================= */}
            {/* TAB 2: BUKU KASBON & AGING */}
            {/* ========================================================= */}
            {activeTab === 'kasbon' && (
              <div className="space-y-4">
                {/* Aging Breakdown Cards */}
                <div className="grid grid-cols-5 gap-3">
                  <div className="p-3.5 bg-card rounded-xl border border-border-subtle shadow-sm">
                    <span className="text-[10px] font-bold text-text-muted uppercase tracking-wider block">Total Piutang Kasbon</span>
                    <span className="text-lg font-black text-rose-600 font-mono mt-0.5 block">
                      Rp {(agingSummary?.totalReceivable || totalKasbon).toLocaleString('id-ID')}
                    </span>
                    <span className="text-[10px] text-text-muted mt-1 block">
                      {agingSummary?.customersWithKasbonCount || kasbonCustomers.length} pelanggan menunggak
                    </span>
                  </div>
                  <div className="p-3.5 bg-emerald-500/5 rounded-xl border border-emerald-500/20 shadow-sm">
                    <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider block">Lancar (&lt; 7 Hari)</span>
                    <span className="text-lg font-black text-emerald-600 font-mono mt-0.5 block">
                      Rp {(agingSummary?.current || 0).toLocaleString('id-ID')}
                    </span>
                    <span className="text-[10px] text-emerald-600/80 mt-1 block">Risiko rendah</span>
                  </div>
                  <div className="p-3.5 bg-amber-500/5 rounded-xl border border-amber-500/20 shadow-sm">
                    <span className="text-[10px] font-bold text-amber-700 uppercase tracking-wider block">Jatuh Tempo (7-14 Hari)</span>
                    <span className="text-lg font-black text-amber-600 font-mono mt-0.5 block">
                      Rp {(agingSummary?.dueSoon || 0).toLocaleString('id-ID')}
                    </span>
                    <span className="text-[10px] text-amber-600/80 mt-1 block">Kirim pengingat ringan</span>
                  </div>
                  <div className="p-3.5 bg-orange-500/5 rounded-xl border border-orange-500/20 shadow-sm">
                    <span className="text-[10px] font-bold text-orange-700 uppercase tracking-wider block">Menunggak (15-30 Hari)</span>
                    <span className="text-lg font-black text-orange-600 font-mono mt-0.5 block">
                      Rp {(agingSummary?.overdue || 0).toLocaleString('id-ID')}
                    </span>
                    <span className="text-[10px] text-orange-600/80 mt-1 block">Perlu penagihan aktif</span>
                  </div>
                  <div className="p-3.5 bg-rose-500/5 rounded-xl border border-rose-500/20 shadow-sm">
                    <span className="text-[10px] font-bold text-rose-700 uppercase tracking-wider block">Macet / Risiko (&gt; 30 Hari)</span>
                    <span className="text-lg font-black text-rose-700 font-mono mt-0.5 block">
                      Rp {(agingSummary?.badDebt || 0).toLocaleString('id-ID')}
                    </span>
                    <span className="text-[10px] text-rose-600/80 mt-1 block">Blokir kasbon baru</span>
                  </div>
                </div>

                {/* Kasbon Debtors Table */}
                <div className="bg-card rounded-xl border border-border-subtle overflow-hidden shadow-sm">
                  <div className="p-4 border-b border-border-subtle flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-bold text-text-primary">Daftar Pelanggan Menunggak Kasbon</h3>
                      <p className="text-xs text-text-secondary">Pantau batas plafon kredit dan cetak slip tagihan kasir</p>
                    </div>
                    <span className="px-2.5 py-1 rounded-lg bg-rose-500/10 text-rose-600 text-xs font-bold border border-rose-500/20">
                      {kasbonCustomers.length} Pelanggan
                    </span>
                  </div>

                  {kasbonCustomers.length === 0 ? (
                    <div className="p-12 text-center space-y-2">
                      <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto" />
                      <p className="text-sm font-bold text-text-primary">Semua Kasbon Lunas!</p>
                      <p className="text-xs text-text-muted">Tidak ada piutang pelanggan yang tertunggak saat ini.</p>
                    </div>
                  ) : (
                    <div className="divide-y divide-border-subtle">
                      {kasbonCustomers.map((c) => {
                        const isOverLimit = c.totalReceivable > (c.creditLimit || 0);
                        const limitUsedPct = (c.creditLimit || 0) > 0 
                          ? Math.min(100, Math.round((c.totalReceivable / c.creditLimit) * 100))
                          : 100;

                        return (
                          <div key={c.id} className="p-4 flex items-center justify-between hover:bg-subtle/50 transition-colors">
                            <div className="space-y-1">
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-sm text-text-primary">{c.name}</span>
                                <span className={`px-1.5 py-0.2 rounded text-[9px] font-black border uppercase ${getTierBadge(c.memberTier)}`}>
                                  {c.memberTier || 'BRONZE'}
                                </span>
                                {isOverLimit && (
                                  <span className="px-1.5 py-0.5 bg-rose-100 text-rose-700 text-[10px] font-bold rounded flex items-center gap-1">
                                    <AlertTriangle className="w-3 h-3" /> Over Plafon!
                                  </span>
                                )}
                              </div>
                              <p className="text-xs text-text-secondary font-mono">
                                Telp: {c.phoneNumber || '-'} • Alamat: {c.address || '-'}
                              </p>
                              {/* Plafon bar */}
                              <div className="flex items-center gap-2 pt-1 text-[11px]">
                                <span className="text-text-muted">Plafon: Rp {(c.creditLimit || 0).toLocaleString('id-ID')}</span>
                                <div className="w-28 h-1.5 bg-slate-200 rounded-full overflow-hidden">
                                  <div 
                                    className={`h-full rounded-full ${limitUsedPct >= 90 ? 'bg-rose-600' : 'bg-amber-500'}`} 
                                    style={{ width: `${limitUsedPct}%` }}
                                  />
                                </div>
                                <span className="text-text-muted font-mono">{limitUsedPct}% terpakai</span>
                              </div>
                            </div>

                            <div className="flex items-center gap-4">
                              <div className="text-right">
                                <span className="text-xs text-text-muted block">Sisa Tagihan</span>
                                <span className="text-base font-black text-rose-600 font-mono">
                                  Rp {c.totalReceivable.toLocaleString('id-ID')}
                                </span>
                              </div>

                              <div className="flex items-center gap-2">
                                <button
                                  type="button"
                                  onClick={() => handleOpenStatementModal(c)}
                                  className="px-3 py-1.5 rounded-lg border border-border-subtle hover:bg-subtle text-xs font-bold text-text-primary flex items-center gap-1.5 transition-colors shadow-sm"
                                  title="Cetak Slip Thermal Piutang (58/80mm ESC/POS)"
                                >
                                  <Receipt className="w-3.5 h-3.5 text-text-muted" /> Slip Thermal
                                </button>
                                {c.phoneNumber && (
                                  <button
                                    type="button"
                                    onClick={() => handleSendWhatsAppReminder(c)}
                                    className="px-3 py-1.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 text-xs font-bold flex items-center gap-1.5 transition-colors"
                                    title="Kirim Pesan Pengingat Tagihan WhatsApp (Gratis Rp 0)"
                                  >
                                    <MessageSquare className="w-3.5 h-3.5" /> Ingatkan WA
                                  </button>
                                )}
                                <button
                                  type="button"
                                  onClick={() => handleOpenKasbonModal(c, 'pay')}
                                  className="px-3 py-1.5 rounded-lg bg-primary hover:bg-primary-hover text-white text-xs font-bold flex items-center gap-1.5 transition-colors shadow-sm"
                                >
                                  <CreditCard className="w-3.5 h-3.5" /> Bayar Kasbon
                                </button>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ========================================================= */}
            {/* TAB 3: SALDO DEPOSIT (STORE CREDIT) */}
            {/* ========================================================= */}
            {activeTab === 'deposit' && (
              <div className="space-y-4">
                {/* Deposit Info Banner */}
                <div className="p-4 bg-gradient-to-r from-emerald-600 to-teal-700 rounded-2xl text-white shadow-md flex items-center justify-between">
                  <div className="space-y-1">
                    <span className="px-2 py-0.5 rounded-full bg-white/20 text-[10px] font-bold uppercase tracking-wider">
                      Store Credit & Prabayar
                    </span>
                    <h3 className="text-xl font-black">Total Saldo Deposit: Rp {totalDeposit.toLocaleString('id-ID')}</h3>
                    <p className="text-xs text-emerald-100 max-w-xl">
                      Pelanggan dapat melakukan deposit saldo di muka menggunakan Tunai, QRIS, atau Transfer. Saldo deposit dapat langsung digunakan kasir saat belanja di POS.
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="text-3xl font-black">{depositCustomers.length}</span>
                    <span className="block text-xs text-emerald-100">Member Memiliki Saldo</span>
                  </div>
                </div>

                {/* List of Customers with Deposit */}
                <div className="bg-card rounded-xl border border-border-subtle overflow-hidden shadow-sm">
                  <div className="p-4 border-b border-border-subtle flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-bold text-text-primary">Daftar Akun Saldo Deposit Pelanggan</h3>
                      <p className="text-xs text-text-secondary">Pilih pelanggan untuk top-up atau melihat riwayat transaksi deposit</p>
                    </div>
                  </div>

                  <div className="divide-y divide-border-subtle">
                    {customers.map((c) => (
                      <div key={c.id} className="p-4 flex items-center justify-between hover:bg-subtle/50 transition-colors">
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-sm text-text-primary">{c.name}</span>
                            <span className={`px-1.5 py-0.2 rounded text-[9px] font-black border uppercase ${getTierBadge(c.memberTier)}`}>
                              {c.memberTier || 'BRONZE'}
                            </span>
                          </div>
                          <p className="text-xs text-text-secondary font-mono">
                            No. HP: {c.phoneNumber || '-'} • Kode: {c.memberCode || '-'}
                          </p>
                        </div>

                        <div className="flex items-center gap-4">
                          <div className="text-right">
                            <span className="text-xs text-text-muted block">Saldo Deposit Aktif</span>
                            <span className={`text-base font-black font-mono ${
                              (c.depositBalance || 0) > 0 ? 'text-emerald-600' : 'text-text-muted'
                            }`}>
                              Rp {(c.depositBalance || 0).toLocaleString('id-ID')}
                            </span>
                          </div>

                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => handleOpenDepositModal(c)}
                              className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1.5 transition-colors shadow-sm"
                            >
                              <Wallet className="w-3.5 h-3.5" /> Top-Up Saldo
                            </button>
                            <button
                              type="button"
                              onClick={() => handleOpenProfile360(c)}
                              className="px-3 py-1.5 rounded-lg border border-border-subtle hover:bg-subtle text-xs font-semibold text-text-primary flex items-center gap-1.5 transition-colors"
                            >
                              Lihat Riwayat
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* ========================================================= */}
            {/* TAB 4: ULANG TAHUN & PROMO */}
            {/* ========================================================= */}
            {activeTab === 'birthday' && (
              <div className="space-y-4">
                <div className="p-4 bg-gradient-to-r from-amber-500 to-rose-500 rounded-2xl text-white shadow-md flex items-center justify-between">
                  <div className="space-y-1">
                    <span className="px-2 py-0.5 rounded-full bg-white/20 text-[10px] font-bold uppercase tracking-wider">
                      Otomatisasi Hubungan Pelanggan (CRM)
                    </span>
                    <h3 className="text-xl font-black">Ulang Tahun Member Bulan Ini ({new Date().toLocaleString('id-ID', { month: 'long' })})</h3>
                    <p className="text-xs text-amber-100 max-w-xl">
                      Apresiasi pelanggan setia Anda di hari ulang tahun mereka dengan ucapan hangat dan voucher belanja via WhatsApp secara langsung dan gratis!
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="text-3xl font-black">{birthdayCustomers.length}</span>
                    <span className="block text-xs text-amber-100">Member Ulang Tahun</span>
                  </div>
                </div>

                {birthdayCustomers.length === 0 ? (
                  <div className="p-16 text-center space-y-2 bg-card rounded-xl border border-border-subtle">
                    <Cake className="w-12 h-12 text-amber-500/50 mx-auto" />
                    <p className="text-sm font-bold text-text-primary">Tidak Ada Member Ulang Tahun Bulan Ini</p>
                    <p className="text-xs text-text-muted">
                      Pastikan tanggal lahir pelanggan diisi saat pendaftaran member baru untuk mengaktifkan fitur ini.
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-4">
                    {birthdayCustomers.map((c) => {
                      const bDate = c.birthDate ? new Date(c.birthDate) : null;
                      const dateFormatted = bDate ? bDate.toLocaleDateString('id-ID', { day: 'numeric', month: 'long' }) : '-';
                      const isToday = bDate && bDate.getDate() === new Date().getDate();

                      return (
                        <div key={c.id} className="p-4 rounded-xl bg-card border border-border-subtle shadow-sm flex items-center justify-between">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-sm text-text-primary">{c.name}</span>
                              <span className={`px-1.5 py-0.2 rounded text-[9px] font-black border uppercase ${getTierBadge(c.memberTier)}`}>
                                {c.memberTier || 'BRONZE'}
                              </span>
                              {isToday && (
                                <span className="px-2 py-0.5 rounded-full bg-rose-500 text-white text-[10px] font-black animate-pulse">
                                  HARI INI! 🎂
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-text-secondary font-medium">
                              📅 Ulang Tahun: <span className="font-bold text-amber-600">{dateFormatted}</span>
                            </p>
                            <p className="text-xs text-text-muted font-mono">
                              WhatsApp: {c.phoneNumber || 'Belum diisi'}
                            </p>
                          </div>

                          <div>
                            {c.phoneNumber ? (
                              <button
                                type="button"
                                onClick={() => handleSendBirthdayGreeting(c)}
                                className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm transition-colors"
                              >
                                <MessageSquare className="w-4 h-4" />
                                Kirim Ucapan & Voucher WA
                              </button>
                            ) : (
                              <span className="text-xs text-text-muted italic">No. WA Kosong</span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>

      {/* ========================================================= */}
      {/* MODALS & DRAWERS */}
      {/* ========================================================= */}
      {/* 1. Add / Edit Member Modal */}
      <CustomerFormModal
        isOpen={isFormModalOpen}
        onClose={() => {
          setIsFormModalOpen(false);
          setEditingCustomer(null);
        }}
        customer={editingCustomer}
        onSaved={() => {
          loadCustomers();
        }}
      />

      {/* 2. Customer 360 Profile Drawer */}
      <CustomerProfile360Drawer
        isOpen={isProfileDrawerOpen}
        onClose={() => {
          setIsProfileDrawerOpen(false);
          setProfileCustomer(null);
        }}
        customer={profileCustomer}
        onOpenTopupDeposit={(c) => {
          setIsProfileDrawerOpen(false);
          handleOpenDepositModal(c);
        }}
        onOpenKasbonModal={(c) => {
          setIsProfileDrawerOpen(false);
          handleOpenKasbonModal(c, 'pay');
        }}
      />

      {/* 3. Top-Up Saldo Deposit Modal */}
      <CustomerDepositModal
        isOpen={isDepositModalOpen}
        onClose={() => {
          setIsDepositModalOpen(false);
          setDepositCustomer(null);
        }}
        customer={depositCustomer}
        onSuccess={() => {
          loadCustomers();
        }}
      />

      {/* 4. Thermal Kasbon Statement Modal (58/80mm ESC/POS) */}
      <CustomerStatementThermalModal
        isOpen={isStatementModalOpen}
        onClose={() => {
          setIsStatementModalOpen(false);
          setStatementCustomer(null);
        }}
        customer={statementCustomer}
      />

      {/* 5. Kasbon Settlement & Ledger Modal */}
      <CustomerKasbonModal
        customer={kasbonCustomer}
        isOpen={isKasbonModalOpen}
        initialTab={modalInitialTab}
        onClose={() => {
          setIsKasbonModalOpen(false);
          setKasbonCustomer(null);
        }}
        onPaymentSuccess={() => {
          loadCustomers();
        }}
      />
    </div>
  );
};

// ==========================================
// 3. FINANCIAL REPORTS & P&L (LABA RUGI) PAGE
// ==========================================
export const ReportsPage: React.FC = () => {
  const { mode } = useBusinessModeStore();
  const [activeTab, setActiveTab] = useState<'overview' | 'pnl'>('overview');
  const [summary, setSummary] = useState<SalesSummary | null>(null);
  const [pnlData, setPnlData] = useState<any | null>(null);
  const [isLoadingPnl, setIsLoadingPnl] = useState(false);
  const [isLoadingSummary, setIsLoadingSummary] = useState(false);
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);

  // Date range filter — default: current month
  const today = new Date();
  const firstOfMonth = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().slice(0, 10);
  const todayStr = today.toISOString().slice(0, 10);
  const [dateFrom, setDateFrom] = useState(firstOfMonth);
  const [dateTo, setDateTo] = useState(todayStr);

  const fetchSummary = (from?: string, to?: string) => {
    setIsLoadingSummary(true);
    const q = from && to ? `?from=${from}&to=${to}&mode=${mode}` : `?mode=${mode}`;
    fetch(`/api/v1/reports/sales-summary${q}`)
      .then((r) => r.json())
      .then((d) => setSummary(d))
      .catch(() => {})
      .finally(() => setIsLoadingSummary(false));
  };

  useEffect(() => { 
    fetchSummary(dateFrom, dateTo); 
    if (activeTab === 'pnl') fetchPnlData();
  }, [mode]);

  const handleApplyDateFilter = () => { 
    fetchSummary(dateFrom, dateTo); 
    if (activeTab === 'pnl') fetchPnlData();
  };

  const handleQuickRange = (range: 'today' | 'week' | 'month' | 'all') => {
    const now = new Date();
    let from = '', to = now.toISOString().slice(0, 10);
    if (range === 'today') { from = to; }
    else if (range === 'week') { const d = new Date(now); d.setDate(d.getDate() - 7); from = d.toISOString().slice(0, 10); }
    else if (range === 'month') { from = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10); }
    else { from = '2020-01-01'; to = '2099-12-31'; }
    setDateFrom(from); setDateTo(to);
    fetchSummary(from, to);
    if (activeTab === 'pnl') {
      const q = `?from=${from}&to=${to}&mode=${mode}`;
      fetch(`/api/v1/reports/profit-and-loss${q}`)
        .then((r) => r.json())
        .then((d) => setPnlData(d))
        .catch(() => {});
    }
  };

  const fetchPnlData = () => {
    setIsLoadingPnl(true);
    const q = dateFrom && dateTo ? `?from=${dateFrom}&to=${dateTo}&mode=${mode}` : `?mode=${mode}`;
    fetch(`/api/v1/reports/profit-and-loss${q}`)
      .then((r) => r.json())
      .then((d) => setPnlData(d))
      .catch(() => {})
      .finally(() => setIsLoadingPnl(false));
  };

  useEffect(() => {
    if (activeTab === 'pnl') {
      fetchPnlData();
    }
  }, [activeTab]);

  const handleOpenPrintModal = () => {
    if (!pnlData) {
      fetchPnlData();
    }
    setIsPrintModalOpen(true);
  };

  const handleExportCsv = () => {
    window.open(`/api/v1/reports/export-csv?from=${dateFrom}&to=${dateTo}&mode=${mode}`, '_blank');
    useToastStore.getState().showToast('Mengunduh laporan penjualan CSV...', 'info');
  };

  return (
    <div className="flex-1 flex flex-col bg-app overflow-hidden select-none">
      <div className="p-4 bg-surface border-b border-border-subtle flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center font-bold">
            <BarChart3 className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-text-primary">Laporan Finansial & Laba Rugi Toko</h2>
            <p className="text-xs text-text-secondary">Analisis omzet, margin laba kotor, beban kas kecil, dan laba bersih</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Tab Switcher */}
          <div className="flex p-1 bg-subtle rounded-lg border border-border-subtle text-xs font-bold">
            <button
              onClick={() => setActiveTab('overview')}
              className={`px-3 py-1.5 rounded-md transition-all flex items-center gap-1.5 ${
                activeTab === 'overview'
                  ? 'bg-card text-text-primary shadow-xs'
                  : 'text-text-secondary hover:text-text-primary'
              }`}
            >
              <BarChart3 className="w-3.5 h-3.5 text-primary" />
              <span>Ringkasan Penjualan</span>
            </button>
            <button
              onClick={() => setActiveTab('pnl')}
              className={`px-3 py-1.5 rounded-md transition-all flex items-center gap-1.5 ${
                activeTab === 'pnl'
                  ? 'bg-card text-text-primary shadow-xs'
                  : 'text-text-secondary hover:text-text-primary'
              }`}
            >
              <TrendingUp className="w-3.5 h-3.5 text-status-success" />
              <span>Laba Rugi (P&L)</span>
            </button>
          </div>

          <button 
            onClick={handleOpenPrintModal}
            className="px-3 py-1.5 bg-primary hover:bg-primary-hover text-primary-text rounded-md text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all"
            title="Cetak Dokumen Resmi A4 atau simpan PDF"
          >
            <Printer className="w-4 h-4" />
            <span>Cetak Laporan A4 / PDF</span>
          </button>

          <button 
            onClick={handleExportCsv}
            className="px-3 py-1.5 bg-card hover:bg-card-hover border border-border-subtle rounded-md text-xs font-semibold text-text-secondary flex items-center gap-1.5"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>Ekspor CSV</span>
          </button>
        </div>
      </div>

      {/* Date Range Filter Bar */}
      <div className="px-4 py-2.5 border-b border-border-subtle bg-surface flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-1 text-xs font-bold text-text-secondary">
          <Calendar className="w-3.5 h-3.5 text-primary" /> Periode:
        </div>
        {[
          { key: 'today', label: 'Hari Ini' },
          { key: 'week', label: '7 Hari' },
          { key: 'month', label: 'Bulan Ini' },
          { key: 'all', label: 'Semua' },
        ].map(r => (
          <button key={r.key} onClick={() => handleQuickRange(r.key as any)}
            className="px-2.5 py-1 rounded-md bg-subtle hover:bg-primary/10 hover:text-primary border border-border-subtle text-xs font-bold text-text-secondary transition-all">
            {r.label}
          </button>
        ))}
        <div className="flex items-center gap-1.5 ml-auto">
          <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)}
            className="px-2 py-1 bg-card border border-border-strong rounded text-xs font-mono text-text-primary focus:outline-none focus:border-primary" />
          <span className="text-xs text-text-muted">s/d</span>
          <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)}
            className="px-2 py-1 bg-card border border-border-strong rounded text-xs font-mono text-text-primary focus:outline-none focus:border-primary" />
          <button onClick={handleApplyDateFilter}
            className="px-3 py-1 bg-primary hover:bg-primary-hover text-primary-text rounded text-xs font-bold shadow-sm">
            {isLoadingSummary ? 'Memuat...' : 'Terapkan'}
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-5 space-y-5">
        {/* ========================================================= */}
        {/* TAB 1: OVERVIEW & RETAIL ANALYTICS */}
        {/* ========================================================= */}
        {activeTab === 'overview' && (
          <>
            {/* KPI Cards with Period Growth Comparison */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              <div className="p-4 rounded-xl bg-card border border-border-subtle shadow-sm space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-text-secondary">Total Omzet Penjualan:</span>
                  <PeriodGrowthBadge growthPercent={summary?.periodGrowth?.revenueGrowthPercent} />
                </div>
                <p className="text-2xl font-bold font-mono text-primary tabular-nums">
                  Rp {(summary?.totalRevenue || 0).toLocaleString('id-ID')}
                </p>
              </div>
              <div className="p-4 rounded-xl bg-card border border-border-subtle shadow-sm space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-text-secondary">Laba Kotor Toko (Gross Profit):</span>
                  <PeriodGrowthBadge growthPercent={summary?.periodGrowth?.profitGrowthPercent} />
                </div>
                <p className="text-2xl font-bold font-mono text-emerald-600 tabular-nums">
                  Rp {(summary?.totalGrossProfit || 0).toLocaleString('id-ID')}
                </p>
              </div>
              <div className="p-4 rounded-xl bg-card border border-border-subtle shadow-sm space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-text-secondary">Total Transaksi:</span>
                  <PeriodGrowthBadge growthPercent={summary?.periodGrowth?.transactionsGrowthPercent} />
                </div>
                <p className="text-2xl font-bold font-mono text-text-primary tabular-nums">
                  {summary?.totalTransactions || 0} Struk
                </p>
              </div>
              <div className="p-4 rounded-xl bg-card border border-border-subtle shadow-sm space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-text-secondary">Rata-rata Belanja (Basket):</span>
                  <PeriodGrowthBadge growthPercent={summary?.periodGrowth?.basketGrowthPercent} />
                </div>
                <p className="text-2xl font-bold font-mono text-text-primary tabular-nums">
                  Rp {Math.round(summary?.averageTicketSize || 0).toLocaleString('id-ID')}
                </p>
              </div>
            </div>

            {/* DIAGRAM 1: Tren Penjualan Harian & Frekuensi Transaksi */}
            <DailySalesTrendChart data={summary?.dailyTrend || []} />

            {/* DIAGRAM 2: Analisis Jam Sibuk Penjualan (Hourly Peak Hours) */}
            <HourlySalesChart data={summary?.hourlyTrend || []} />

            {/* DIAGRAM 3 & 4: Distribusi Pembayaran & Kontribusi Margin Kategori */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <PaymentDistributionChart data={summary?.paymentBreakdown || []} />
              <CategoryMarginChart categories={summary?.categoryProfits || []} />
            </div>

        {/* 2-Column: Top Fast-Moving Products vs Dead Stock */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Top Fast-Moving Products */}
          <div className="bg-card border border-border-subtle rounded-xl p-4 shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-text-primary flex items-center gap-1.5 uppercase tracking-wider">
                <Flame className="w-4 h-4 text-amber-500" />
                Top 10 Fast-Moving (Paling Laris)
              </h3>
              <span className="text-[10px] text-text-muted">Berdasarkan Kuantitas</span>
            </div>

            <div className="divide-y divide-border-subtle">
              {(!summary?.topProducts || summary.topProducts.length === 0) ? (
                <p className="p-4 text-center text-text-muted text-xs">Belum ada data penjualan.</p>
              ) : (
                summary.topProducts.map((p, idx) => (
                  <div key={idx} className="py-2.5 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2.5">
                      <span className="w-5 h-5 rounded-full bg-subtle flex items-center justify-center font-bold text-[10px] text-text-muted font-mono">
                        {idx + 1}
                      </span>
                      <div>
                        <p className="font-semibold text-text-primary">{p.productName}</p>
                        <p className="text-[10px] text-emerald-600 font-bold">Laba: +Rp {p.grossProfit.toLocaleString('id-ID')}</p>
                      </div>
                    </div>
                    <div className="text-right font-mono">
                      <p className="font-bold text-primary">{p.quantitySold} Terjual</p>
                      <p className="text-[10px] text-text-muted">Rp {p.revenue.toLocaleString('id-ID')}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Dead Stock / Slow-Moving Products */}
          <div className="bg-card border border-border-subtle rounded-xl p-4 shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-text-primary flex items-center gap-1.5 uppercase tracking-wider">
                <AlertTriangle className="w-4 h-4 text-rose-500" />
                Dead Stock / Stok Mengendap
              </h3>
              <span className="text-[10px] text-text-muted">Belum Laku & Ada Stok</span>
            </div>

            <div className="divide-y divide-border-subtle">
              {(!summary?.deadStock || summary.deadStock.length === 0) ? (
                <p className="p-4 text-center text-text-muted text-xs">Semua barang berputar aktif (Tidak ada dead stock).</p>
              ) : (
                summary.deadStock.slice(0, 10).map((d, idx) => (
                  <div key={idx} className="py-2.5 flex items-center justify-between text-xs">
                    <div>
                      <p className="font-semibold text-text-primary">{d.productName}</p>
                      <p className="text-[10px] text-text-muted">SKU: {d.sku} • Stok: {d.currentStock} pcs</p>
                    </div>
                    <div className="text-right font-mono">
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-rose-500/10 text-rose-600 font-bold border border-rose-500/20">
                        Modal Tertahan: Rp {d.tiedCapital.toLocaleString('id-ID')}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Category Gross Profit Margin Breakdown */}
        {summary?.categoryProfits && summary.categoryProfits.length > 0 && (
          <div className="bg-card border border-border-subtle rounded-xl p-4 shadow-sm space-y-3">
            <h3 className="text-xs font-bold text-text-primary uppercase tracking-wider">
              Analisis Margin Laba Kotor per Kategori Produk
            </h3>
            <table className="w-full text-left text-xs">
              <thead className="bg-subtle text-text-secondary font-semibold border-b border-border-subtle">
                <tr>
                  <th className="p-2.5">Kategori</th>
                  <th className="p-2.5">Omzet Penjualan</th>
                  <th className="p-2.5">HPP (Modal)</th>
                  <th className="p-2.5">Laba Kotor (Gross Profit)</th>
                  <th className="p-2.5">Margin %</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-subtle/50 font-mono">
                {summary.categoryProfits.map((c, idx) => (
                  <tr key={idx} className="hover:bg-card-hover/50">
                    <td className="p-2.5 font-bold font-sans text-text-primary">{c.categoryName}</td>
                    <td className="p-2.5">Rp {c.revenue.toLocaleString('id-ID')}</td>
                    <td className="p-2.5 text-text-muted">Rp {c.cogs.toLocaleString('id-ID')}</td>
                    <td className="p-2.5 font-bold text-emerald-600">Rp {c.grossProfit.toLocaleString('id-ID')}</td>
                    <td className="p-2.5">
                      <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-600 font-bold">
                        {c.marginPercentage}%
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Rekapitulasi Pajak PPN & Biaya Layanan + Produktivitas Kasir */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <TaxAndServiceAuditCard taxAudit={summary?.taxAudit} />
          <CashierPerformanceTable cashiers={summary?.cashierSales || []} />
        </div>
      </>
    )}

        {/* ========================================================= */}
        {/* TAB 2: PROFIT & LOSS (LABA RUGI / INCOME STATEMENT) */}
        {/* ========================================================= */}
        {activeTab === 'pnl' && (
          <div className="space-y-5">
            {isLoadingPnl ? (
              <p className="p-8 text-center text-xs text-text-muted">Mengkalkulasi laporan Laba Rugi real-time...</p>
            ) : !pnlData ? (
              <div className="p-8 text-center text-xs text-text-muted bg-card rounded-xl border border-border-subtle">
                Gagal memuat data laporan laba rugi.
              </div>
            ) : (
              <>
                {/* Highlight Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="p-4 rounded-xl bg-card border border-border-subtle shadow-sm space-y-1">
                    <span className="text-xs font-semibold text-text-secondary">Penjualan Bersih (Net Sales):</span>
                    <p className="text-2xl font-bold font-mono text-primary tabular-nums">
                      Rp {pnlData.netSales.toLocaleString('id-ID')}
                    </p>
                  </div>
                  <div className="p-4 rounded-xl bg-card border border-border-subtle shadow-sm space-y-1">
                    <span className="text-xs font-semibold text-text-secondary">Laba Kotor (Gross Margin {pnlData.grossMarginPercent}%):</span>
                    <p className="text-2xl font-bold font-mono text-emerald-600 tabular-nums">
                      Rp {pnlData.grossProfit.toLocaleString('id-ID')}
                    </p>
                  </div>
                  <div className="p-4 rounded-xl bg-card border border-primary/30 bg-primary/5 shadow-sm space-y-1">
                    <span className="text-xs font-semibold text-text-secondary">Laba Bersih Usaha (Net Margin {pnlData.netMarginPercent}%):</span>
                    <p className={`text-2xl font-bold font-mono tabular-nums ${pnlData.netOperatingIncome >= 0 ? 'text-status-success' : 'text-status-danger'}`}>
                      Rp {pnlData.netOperatingIncome.toLocaleString('id-ID')}
                    </p>
                  </div>
                </div>

                {/* DIAGRAM 4: Waterfall Financial Flow Chart */}
                <FinancialWaterfallChart pnlData={pnlData} />

                {/* Rekapitulasi Pajak PPN & Biaya Layanan */}
                {summary?.taxAudit && (
                  <TaxAndServiceAuditCard taxAudit={summary.taxAudit} />
                )}

                {/* Structured Income Statement Table */}
                <div className="bg-card border border-border-subtle rounded-2xl overflow-hidden shadow-sm">
                  <div className="p-4 bg-subtle border-b border-border-subtle flex items-center justify-between">
                    <div>
                      <h3 className="text-xs font-bold text-text-primary uppercase tracking-wider">
                        Laporan Laba Rugi Operasional (Income Statement)
                      </h3>
                      <p className="text-[11px] text-text-muted font-mono">
                        Periode: {new Date(pnlData.periodStart).toLocaleDateString('id-ID')} - {new Date(pnlData.periodEnd).toLocaleDateString('id-ID')}
                      </p>
                    </div>
                    <span className="px-2.5 py-1 rounded-full bg-primary/10 text-primary border border-primary/20 text-[10px] font-bold">
                      100% Real-Time POS Sync
                    </span>
                  </div>

                  <div className="p-5 divide-y divide-border-subtle space-y-4 text-xs">
                    
                    {/* SECTION 1: REVENUE */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between font-bold text-text-primary uppercase text-[11px]">
                        <span>1. Pendapatan Penjualan (Revenue)</span>
                        <span className="font-mono">Rp {pnlData.netSales.toLocaleString('id-ID')}</span>
                      </div>
                      <div className="pl-4 space-y-1 text-text-secondary">
                        <div className="flex justify-between">
                          <span>Penjualan Kotor (Gross Sales)</span>
                          <span className="font-mono">Rp {pnlData.grossSales.toLocaleString('id-ID')}</span>
                        </div>
                        {pnlData.totalDiscounts > 0 && (
                          <div className="flex justify-between text-status-danger">
                            <span>Diskon Penjualan & Promosi</span>
                            <span className="font-mono">-Rp {pnlData.totalDiscounts.toLocaleString('id-ID')}</span>
                          </div>
                        )}
                        {pnlData.totalReturns > 0 && (
                          <div className="flex justify-between text-status-danger">
                            <span>Retur Penjualan Produk</span>
                            <span className="font-mono">-Rp {pnlData.totalReturns.toLocaleString('id-ID')}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* SECTION 2: COGS & GROSS PROFIT */}
                    <div className="pt-3 space-y-2">
                      <div className="flex items-center justify-between font-bold text-text-primary uppercase text-[11px]">
                        <span>2. Beban Pokok Pendapatan (HPP / COGS)</span>
                        <span className="font-mono text-status-danger">-Rp {pnlData.totalCogs.toLocaleString('id-ID')}</span>
                      </div>
                      <div className="pl-4 text-text-secondary flex justify-between">
                        <span>Total HPP Barang Terjual</span>
                        <span className="font-mono">-Rp {pnlData.totalCogs.toLocaleString('id-ID')}</span>
                      </div>
                      <div className="p-3 bg-subtle rounded-xl flex items-center justify-between font-bold text-text-primary border border-border-subtle">
                        <span>LABA KOTOR (GROSS PROFIT) [{pnlData.grossMarginPercent}%]</span>
                        <span className="font-mono text-emerald-600 text-sm">Rp {pnlData.grossProfit.toLocaleString('id-ID')}</span>
                      </div>
                    </div>

                    {/* SECTION 3: OPERATING EXPENSES */}
                    <div className="pt-3 space-y-2">
                      <div className="flex items-center justify-between font-bold text-text-primary uppercase text-[11px]">
                        <span>3. Beban Operasional Kas Toko (Operating Expenses)</span>
                        <span className="font-mono text-status-danger">-Rp {pnlData.operatingExpenses.total.toLocaleString('id-ID')}</span>
                      </div>
                      {pnlData.operatingExpenses.breakdown.length === 0 ? (
                        <p className="pl-4 text-text-muted text-[11px]">Tidak ada pengeluaran kas kecil pada periode ini.</p>
                      ) : (
                        <div className="pl-4 space-y-1 text-text-secondary">
                          {pnlData.operatingExpenses.breakdown.map((b: any, idx: number) => (
                            <div key={idx} className="flex justify-between">
                              <span>• {b.category} ({b.count} transaksi)</span>
                              <span className="font-mono">-Rp {b.amount.toLocaleString('id-ID')}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* SECTION 4: NET OPERATING INCOME */}
                    <div className="pt-4">
                      <div className="p-4 bg-primary/10 border border-primary/40 rounded-xl flex items-center justify-between">
                        <div>
                          <div className="text-sm font-extrabold text-text-primary">
                            LABA BERSIH USAHA TOKO (NET OPERATING INCOME)
                          </div>
                          <div className="text-[11px] text-text-secondary">
                            Margin Bersih Usaha: <strong className="text-primary font-mono">{pnlData.netMarginPercent}%</strong>
                          </div>
                        </div>
                        <div className={`text-2xl font-extrabold font-mono tabular-nums ${pnlData.netOperatingIncome >= 0 ? 'text-status-success' : 'text-status-danger'}`}>
                          Rp {pnlData.netOperatingIncome.toLocaleString('id-ID')}
                        </div>
                      </div>
                    </div>

                  </div>
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {/* Formal A4 Document Print / PDF Export Modal */}
      <FormalReportPrintModal
        isOpen={isPrintModalOpen}
        onClose={() => setIsPrintModalOpen(false)}
        summary={summary}
        pnlData={pnlData}
        dateFrom={dateFrom}
        dateTo={dateTo}
      />
    </div>
  );
};

// ==========================================
// 4. DATABASE BACKUP, EXPORT & DISASTER RECOVERY PAGE
// ==========================================
export const BackupPage: React.FC = () => {
  const [histories, setHistories] = useState<BackupHistory[]>([]);
  const [isBackingUp, setIsBackingUp] = useState(false);
  const [progress, setProgress] = useState<number | null>(null);
  const [statusMsg, setStatusMsg] = useState('');
  const [isGdriveModalOpen, setIsGdriveModalOpen] = useState(false);
  const [gdriveConfig, setGdriveConfig] = useState<{
    email?: string;
    clientId?: string;
    folderName?: string;
    isConfigured?: boolean;
    autoOnShiftClose?: boolean;
    autoDaily?: boolean;
  } | null>(null);

  // Restore from history table modal
  const [selectedBackupForRestore, setSelectedBackupForRestore] = useState<string | null>(null);
  const [isRestoreModalOpen, setIsRestoreModalOpen] = useState(false);
  const [adminPassword, setAdminPassword] = useState('');
  const [isRestoring, setIsRestoring] = useState(false);
  const [restoreError, setRestoreError] = useState('');

  // Restore from uploaded local file modal
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadAdminPassword, setUploadAdminPassword] = useState('');
  const [isUploadingRestore, setIsUploadingRestore] = useState(false);
  const [uploadRestoreError, setUploadRestoreError] = useState('');
  const uploadFileInputRef = useRef<HTMLInputElement>(null);

  const handleDownloadBackup = (fileName: string) => {
    const downloadUrl = `/api/v1/backup/download/${encodeURIComponent(fileName)}`;
    const a = document.createElement('a');
    a.href = downloadUrl;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    useToastStore.getState().showToast(`Mengunduh berkas cadangan: ${fileName}`, 'info');
  };

  const handleExportRawDb = () => {
    const downloadUrl = '/api/v1/backup/export-raw-db';
    const a = document.createElement('a');
    a.href = downloadUrl;
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    a.download = `omnipos_database_${timestamp}.db`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    useToastStore.getState().showToast('Memulai pengunduhan snapshot berkas database (.db)...', 'info');
  };

  const handleExecuteRestore = async () => {
    if (!selectedBackupForRestore) return;
    if (!adminPassword.trim()) {
      setRestoreError('Kata sandi Administrator / Owner wajib diisi!');
      return;
    }

    try {
      setIsRestoring(true);
      setRestoreError('');
      const res = await fetch(`/api/v1/backup/restore/${encodeURIComponent(selectedBackupForRestore)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ adminPassword: adminPassword.trim() })
      });

      const data = await res.json().catch(() => null);
      if (res.ok && data?.success) {
        useToastStore.getState().showToast('Database berhasil dipulihkan dari cadangan!', 'success');
        setIsRestoreModalOpen(false);
        setAdminPassword('');
        setSelectedBackupForRestore(null);
        fetchHistories();
      } else {
        setRestoreError(data?.message || 'Gagal memulihkan database dari berkas cadangan.');
      }
    } catch {
      setRestoreError('Terjadi kesalahan koneksi saat memulihkan database.');
    } finally {
      setIsRestoring(false);
    }
  };

  const handleExecuteUploadRestore = async () => {
    if (!uploadFile) {
      setUploadRestoreError('Pilih berkas database (.db / .sqlite / .bak) terlebih dahulu!');
      return;
    }
    if (!uploadAdminPassword.trim()) {
      setUploadRestoreError('Kata sandi Administrator / Owner wajib diisi untuk otorisasi!');
      return;
    }

    try {
      setIsUploadingRestore(true);
      setUploadRestoreError('');

      const formData = new FormData();
      formData.append('file', uploadFile);
      formData.append('adminPassword', uploadAdminPassword.trim());

      const res = await fetch('/api/v1/backup/upload-restore', {
        method: 'POST',
        body: formData
      });

      const data = await res.json().catch(() => null);
      if (res.ok && data?.success) {
        useToastStore.getState().showToast('Database berhasil dipulihkan dari berkas! Memuat ulang sistem...', 'success');
        setIsUploadModalOpen(false);
        setUploadFile(null);
        setUploadAdminPassword('');
        fetchHistories();
        setTimeout(() => {
          window.location.reload();
        }, 1500);
      } else {
        setUploadRestoreError(data?.message || 'Gagal memulihkan database dari berkas yang diunggah.');
      }
    } catch {
      setUploadRestoreError('Terjadi kesalahan saat mengunggah atau memulihkan database.');
    } finally {
      setIsUploadingRestore(false);
    }
  };

  useEffect(() => {
    fetchHistories();
    fetchGdriveConfig();
  }, []);

  const fetchHistories = async () => {
    try {
      const res = await fetch('/api/v1/backup/history');
      if (res.ok) {
        const data = await res.json();
        setHistories(data);
      }
    } catch {}
  };

  const fetchGdriveConfig = async () => {
    try {
      const res = await fetch('/api/v1/backup/config');
      if (res.ok) {
        const data = await res.json();
        setGdriveConfig(data);
      }
    } catch {}
  };

  const handleCreateLocalBackup = async () => {
    try {
      setIsBackingUp(true);
      setProgress(20);
      setStatusMsg('Membuat snapshot aman SQLite lokal (VACUUM INTO)...');
      
      setTimeout(() => {
        setProgress(60);
        setStatusMsg('Mengompresi & mengenkripsi arsip dengan AES-256-GCM...');
      }, 500);

      setTimeout(async () => {
        const res = await fetch('/api/v1/backup/create-now', { method: 'POST' });
        setProgress(100);
        setStatusMsg('Selesai! Cadangan lokal aman berhasil disimpan di harddisk kasir.');
        useToastStore.getState().showToast('Cadangan lokal SQLite berhasil dibuat dan dienkripsi AES-256.', 'success');
        setTimeout(() => {
          setIsBackingUp(false);
          setProgress(null);
          fetchHistories();
        }, 1200);
      }, 1000);
    } catch {
      setIsBackingUp(false);
      setProgress(null);
      useToastStore.getState().showToast('Gagal membuat cadangan lokal.', 'error');
    }
  };

  const handleSyncToGoogleDrive = async () => {
    if (!gdriveConfig?.isConfigured) {
      useToastStore.getState().showToast(
        'Google Drive belum di-setup! Hubungkan akun Google Drive terlebih dahulu untuk mengaktifkan sinkronisasi cloud.',
        'warning'
      );
      setIsGdriveModalOpen(true);
      return;
    }

    try {
      setIsBackingUp(true);
      setProgress(20);
      setStatusMsg('Mempersiapkan berkas cadangan lokal terenkripsi...');

      setTimeout(() => {
        setProgress(60);
        setStatusMsg('Mengunggah arsip terenkripsi ke Google Drive...');
      }, 500);

      setTimeout(async () => {
        const res = await fetch('/api/v1/backup/sync-drive', { method: 'POST' });
        const data = await res.json().catch(() => null);
        if (res.ok && data?.success) {
          setProgress(100);
          setStatusMsg('Selesai! Cadangan berhasil disinkronkan ke Google Drive.');
          useToastStore.getState().showToast('Cadangan berhasil disinkronkan ke Google Drive toko!', 'success');
        } else {
          setProgress(null);
          useToastStore.getState().showToast(data?.message || 'Gagal menyinkronkan ke Google Drive.', 'error');
        }
        setTimeout(() => {
          setIsBackingUp(false);
          setProgress(null);
          fetchHistories();
        }, 1200);
      }, 1000);
    } catch {
      setIsBackingUp(false);
      setProgress(null);
      useToastStore.getState().showToast('Gagal melakukan sinkronisasi ke cloud.', 'error');
    }
  };

  return (
    <div className="flex-1 flex flex-col bg-app overflow-hidden select-none">
      {/* Top Header */}
      <div className="p-4 bg-surface border-b border-border-subtle flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center font-bold">
            <HardDriveDownload className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-text-primary">Cadangan & Pemulihan Basis Data (Backup & Recovery)</h2>
            <p className="text-xs text-text-secondary">Ekspor lokal (.db / flashdisk), restorasi migrasi perangkat, dan sinkronisasi Google Drive</p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={handleExportRawDb}
            title="Unduh langsung berkas snapshot database SQLite (.db) ke komputer atau flashdisk"
            className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-md text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all active:scale-95"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Ekspor Basis Data (.db)</span>
          </button>

          <button
            onClick={() => {
              setUploadFile(null);
              setUploadAdminPassword('');
              setUploadRestoreError('');
              setIsUploadModalOpen(true);
            }}
            title="Unggah berkas database (.db / .bak) dari komputer atau flashdisk untuk pemulihan"
            className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-md text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all active:scale-95"
          >
            <Upload className="w-3.5 h-3.5" />
            <span>Pulihkan dari Berkas (.db)</span>
          </button>

          <button
            onClick={() => setIsGdriveModalOpen(true)}
            className="px-3 py-1.5 bg-card hover:bg-card-hover border border-border-subtle text-text-primary rounded-md text-xs font-bold flex items-center gap-1.5 shadow-sm transition-colors"
          >
            <Settings className="w-3.5 h-3.5 text-primary" />
            <span>Setup Google Drive</span>
          </button>

          <button
            onClick={handleCreateLocalBackup}
            disabled={isBackingUp}
            title="Buat snapshot arsip database terenkripsi AES-256 di harddisk kasir"
            className="px-3 py-1.5 bg-card hover:bg-card-hover border border-border-subtle text-text-primary rounded-md text-xs font-bold flex items-center gap-1.5 shadow-sm transition-colors disabled:opacity-50"
          >
            <HardDrive className="w-3.5 h-3.5 text-text-muted" />
            <span>Snapshot Arsip</span>
          </button>

          {gdriveConfig?.isConfigured ? (
            <button
              onClick={handleSyncToGoogleDrive}
              disabled={isBackingUp}
              className="px-3 py-1.5 bg-primary hover:bg-primary-hover text-primary-text rounded-md text-xs font-bold flex items-center gap-1.5 shadow-sm disabled:opacity-50 transition-all active:scale-95"
            >
              <Cloud className="w-4 h-4" />
              <span>{isBackingUp ? 'Menyinkronkan...' : 'Sinkron Drive'}</span>
            </button>
          ) : (
            <button
              onClick={handleSyncToGoogleDrive}
              title="Google Drive belum di-setup. Klik untuk menghubungkan akun."
              className="px-3 py-1.5 bg-amber-500/10 hover:bg-amber-500/20 text-amber-700 dark:text-amber-400 border border-amber-500/30 rounded-md text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all"
            >
              <CloudOff className="w-3.5 h-3.5 text-amber-600" />
              <span>Sinkron Drive (Terkunci)</span>
            </button>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {/* Progress notification if backing up */}
        {progress !== null && (
          <div className="p-4 bg-card border border-primary/40 rounded-xl shadow-md space-y-2 animate-fadeIn">
            <div className="flex justify-between text-xs font-bold">
              <span className="text-primary">{statusMsg}</span>
              <span className="font-mono text-primary">{progress}%</span>
            </div>
            <div className="w-full h-2.5 bg-subtle rounded-full overflow-hidden border border-border-subtle">
              <div
                className="h-full bg-primary transition-all duration-300 rounded-full"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        )}

        {/* Section 1: Local Backup & Disaster Recovery Cards */}
        <div>
          <h3 className="text-xs font-bold text-text-primary uppercase tracking-wider mb-3 flex items-center gap-2">
            <Database className="w-4 h-4 text-primary" />
            <span>Manajemen Basis Data Mandiri (Offline & USB Flashdisk)</span>
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Card 1: Direct Raw DB Export */}
            <div className="p-4 rounded-xl bg-card border border-border-subtle flex flex-col justify-between hover:border-emerald-500/50 transition-all shadow-sm">
              <div className="space-y-2">
                <div className="w-9 h-9 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold">
                  <Download className="w-5 h-5" />
                </div>
                <h4 className="font-bold text-text-primary text-xs">Ekspor Basis Data (.db)</h4>
                <p className="text-[11px] text-text-secondary leading-relaxed">
                  Unduh langsung berkas snapshot database SQLite aktif (<span className="font-mono text-emerald-600 dark:text-emerald-400 font-semibold">.db</span>) ke harddisk atau flashdisk. Format SQLite standar tanpa ketergantungan Google Drive, siap dipindahkan ke komputer lain.
                </p>
              </div>
              <button
                onClick={handleExportRawDb}
                className="mt-4 w-full py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold flex items-center justify-center gap-2 shadow-sm transition-all active:scale-95"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Unduh File .db Sekarang</span>
              </button>
            </div>

            {/* Card 2: Restore from Uploaded File */}
            <div className="p-4 rounded-xl bg-card border border-border-subtle flex flex-col justify-between hover:border-amber-500/50 transition-all shadow-sm">
              <div className="space-y-2">
                <div className="w-9 h-9 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center font-bold">
                  <RotateCcw className="w-5 h-5" />
                </div>
                <h4 className="font-bold text-text-primary text-xs">Pulihkan dari Berkas Cadangan</h4>
                <p className="text-[11px] text-text-secondary leading-relaxed">
                  Gunakan berkas cadangan dari flashdisk atau harddisk eksternal untuk pemulihan bencana (misal: instalasi ulang setelah PC kasir lama rusak atau migrasi data ke terminal kasir baru).
                </p>
              </div>
              <button
                onClick={() => {
                  setUploadFile(null);
                  setUploadAdminPassword('');
                  setUploadRestoreError('');
                  setIsUploadModalOpen(true);
                }}
                className="mt-4 w-full py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-bold flex items-center justify-center gap-2 shadow-sm transition-all active:scale-95"
              >
                <Upload className="w-3.5 h-3.5" />
                <span>Unggah & Pulihkan Database</span>
              </button>
            </div>

            {/* Card 3: Encrypted Local Archive */}
            <div className="p-4 rounded-xl bg-card border border-border-subtle flex flex-col justify-between hover:border-primary/50 transition-all shadow-sm">
              <div className="space-y-2">
                <div className="w-9 h-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center font-bold">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <h4 className="font-bold text-text-primary text-xs">Arsip Snapshot Terenkripsi (AES-256)</h4>
                <p className="text-[11px] text-text-secondary leading-relaxed">
                  Snapshot database SQLite lokal yang dikompresi dan diproteksi enkripsi AES-256-GCM. Dibuat otomatis saat penutupan shift kasir dan tersimpan aman di direktori internal aplikasi.
                </p>
              </div>
              <button
                onClick={handleCreateLocalBackup}
                disabled={isBackingUp}
                className="mt-4 w-full py-2 bg-card hover:bg-card-hover border border-border-subtle text-text-primary rounded-lg text-xs font-bold flex items-center justify-center gap-2 shadow-sm transition-all active:scale-95 disabled:opacity-50"
              >
                <HardDrive className="w-3.5 h-3.5 text-text-muted" />
                <span>Buat Snapshot Sekarang</span>
              </button>
            </div>
          </div>
        </div>

        {/* Section 2: Google Drive Connection Status Card */}
        <div className={`p-4 rounded-xl border flex flex-wrap items-center justify-between gap-3 text-xs ${
          gdriveConfig?.isConfigured 
            ? 'bg-emerald-50/70 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200' 
            : 'bg-amber-500/10 border-amber-500/30 text-amber-900 dark:text-amber-200'
        }`}>
          <div className="flex items-center gap-3">
            {gdriveConfig?.isConfigured ? (
              <CheckCircle2 className="w-6 h-6 text-emerald-600 dark:text-emerald-400 shrink-0" />
            ) : (
              <AlertTriangle className="w-6 h-6 text-amber-600 dark:text-amber-400 shrink-0" />
            )}
            <div>
              <div className="flex items-center gap-2">
                <h4 className="font-bold text-xs">
                  {gdriveConfig?.isConfigured 
                    ? `Google Drive Cloud Terhubung: ${gdriveConfig.email || gdriveConfig.clientId}` 
                    : 'Google Drive Belum Dihubungkan — Sinkronisasi Cloud Dinonaktifkan'}
                </h4>
                {!gdriveConfig?.isConfigured && (
                  <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-500/30 text-[10px] font-extrabold uppercase tracking-wide">
                    Opsional
                  </span>
                )}
              </div>
              <p className="text-[11px] opacity-90 mt-0.5">
                {gdriveConfig?.isConfigured 
                  ? `Folder: ${gdriveConfig.folderName || 'OmniPOS_Backups'} • Enkripsi: AES-256-GCM • Auto-Backup Tutup Shift: ${gdriveConfig.autoOnShiftClose ? 'Aktif' : 'Nonaktif'}` 
                  : 'Jika Anda ingin salinan cadangan tersimpan di awan secara otomatis, hubungkan akun Google Drive toko. Untuk pencadangan lokal offline, Anda dapat mengekspor berkas .db langsung ke flashdisk kapan saja tanpa koneksi internet.'}
              </p>
            </div>
          </div>

          <button
            onClick={() => setIsGdriveModalOpen(true)}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold border shadow-sm transition-colors flex items-center gap-1.5 ${
              gdriveConfig?.isConfigured
                ? 'bg-white dark:bg-card-dark border-border-subtle hover:bg-card-hover text-text-primary'
                : 'bg-amber-600 hover:bg-amber-700 text-white border-transparent'
            }`}
          >
            <Settings className="w-3.5 h-3.5" />
            <span>{gdriveConfig?.isConfigured ? 'Ubah Akun / Kredensial' : 'Setup Akun Google Drive'}</span>
          </button>
        </div>

        {/* Section 3: Riwayat Backup Table */}
        <div className="bg-card border border-border-subtle rounded-xl overflow-hidden shadow-sm">
          <div className="px-4 py-3 border-b border-border-subtle bg-subtle flex items-center justify-between">
            <h3 className="text-xs font-bold text-text-primary">Riwayat Backup Terdaftar (Rolling 30 Hari)</h3>
            <span className="text-[11px] text-text-muted">{histories.length} catatan cadangan</span>
          </div>
          <table className="w-full text-left text-xs">
            <thead className="bg-subtle text-text-secondary font-semibold border-b border-border-subtle">
              <tr>
                <th className="p-3">Nama Berkas Backup</th>
                <th className="p-3">Ukuran</th>
                <th className="p-3">Pemicu</th>
                <th className="p-3">Enkripsi</th>
                <th className="p-3">Waktu Dibuat</th>
                <th className="p-3">Status Cloud</th>
                <th className="p-3 text-right font-sans">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-subtle/50 font-mono">
              {histories.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-6 text-center text-text-muted font-sans">
                    Belum ada riwayat backup. Klik tombol 'Snapshot Arsip' atau 'Ekspor Basis Data' di atas.
                  </td>
                </tr>
              ) : (
                histories.map((h) => (
                  <tr key={h.id} className="hover:bg-card-hover/50">
                    <td className="p-3 font-bold text-text-primary">{h.fileName}</td>
                    <td className="p-3">{(h.fileSizeBytes / 1024).toFixed(1)} KB</td>
                    <td className="p-3 font-sans text-text-secondary">
                      {h.triggerSource === 'SHIFT_CLOSE' ? 'Tutup Shift' : h.triggerSource === 'MANUAL_SYNC' ? 'Sinkron Cloud' : h.triggerSource === 'DISASTER_RECOVERY_UPLOAD' ? 'Impor Berkas' : 'Manual'}
                    </td>
                    <td className="p-3 font-sans text-status-success font-semibold">AES-256-GCM</td>
                    <td className="p-3 text-text-muted">{new Date(h.createdAt).toLocaleString('id-ID')}</td>
                    <td className="p-3">
                      {h.isUploadedToDrive ? (
                        <div className="flex flex-col gap-0.5">
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-status-success/10 text-status-success border border-status-success/30 font-sans w-fit">
                            <Cloud className="w-3 h-3" />
                            <span>Tersinkron Cloud</span>
                          </span>
                          {h.googleDriveFileId && (
                            <span className="text-[9px] text-text-muted font-mono">{h.googleDriveFileId}</span>
                          )}
                        </div>
                      ) : (
                        <div className="flex flex-col gap-0.5">
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-subtle text-text-secondary border border-border-subtle font-sans w-fit">
                            <HardDrive className="w-3 h-3 text-text-muted" />
                            <span>Hanya Tersimpan Lokal</span>
                          </span>
                          <span className="text-[9px] text-amber-600 dark:text-amber-400 font-sans font-medium">
                            Belum disinkron ke Drive
                          </span>
                        </div>
                      )}
                    </td>
                    <td className="p-3 text-right font-sans">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => handleDownloadBackup(h.fileName)}
                          title="Unduh berkas cadangan ke komputer ini"
                          className="px-2.5 py-1 bg-card hover:bg-card-hover border border-border-subtle rounded-md text-[11px] font-bold text-text-primary flex items-center gap-1 shadow-sm transition-colors"
                        >
                          <Download className="w-3.5 h-3.5 text-primary" />
                          <span>Unduh</span>
                        </button>
                        <button
                          onClick={() => {
                            setSelectedBackupForRestore(h.fileName);
                            setAdminPassword('');
                            setRestoreError('');
                            setIsRestoreModalOpen(true);
                          }}
                          title="Pulihkan database kasir dari berkas cadangan ini"
                          className="px-2.5 py-1 bg-amber-500/10 hover:bg-amber-500/20 text-amber-700 dark:text-amber-400 border border-amber-500/30 rounded-md text-[11px] font-bold flex items-center gap-1 shadow-sm transition-colors"
                        >
                          <RotateCcw className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                          <span>Pulihkan</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal 1: Konfirmasi & Otorisasi Restore Database dari History */}
      {isRestoreModalOpen && selectedBackupForRestore && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-card border border-border-subtle rounded-2xl w-full max-w-md shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="p-4 bg-amber-500/10 border-b border-amber-500/20 flex items-center justify-between">
              <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400 font-bold text-sm">
                <RotateCcw className="w-5 h-5" />
                <span>Pulihkan Database dari Cadangan</span>
              </div>
              <button
                onClick={() => {
                  if (!isRestoring) {
                    setIsRestoreModalOpen(false);
                    setAdminPassword('');
                    setRestoreError('');
                  }
                }}
                disabled={isRestoring}
                className="p-1 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 text-text-muted"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-4 text-xs">
              <div className="p-3.5 bg-amber-500/10 border border-amber-500/30 rounded-xl flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                <div className="space-y-1 text-amber-900 dark:text-amber-200">
                  <p className="font-bold text-xs">PERHATIAN: Tindakan Pemulihan Data</p>
                  <p className="text-[11px] leading-relaxed opacity-90">
                    Pemulihan akan menimpa database aktif dengan snapshot dari berkas ini. Sistem otomatis membuat salinan darurat (safety rollback) sebelum proses penimpaan database.
                  </p>
                </div>
              </div>

              <div className="space-y-1 bg-subtle p-3 rounded-lg border border-border-subtle">
                <span className="text-text-muted text-[11px]">Berkas Cadangan Terpilih:</span>
                <p className="font-mono font-bold text-text-primary text-xs break-all">{selectedBackupForRestore}</p>
              </div>

              <div className="space-y-1.5">
                <label className="block font-bold text-text-primary text-xs">
                  Kata Sandi Administrator / Owner:
                </label>
                <input
                  type="password"
                  value={adminPassword}
                  onChange={(e) => setAdminPassword(e.target.value)}
                  disabled={isRestoring}
                  placeholder="Masukkan kata sandi Admin..."
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleExecuteRestore();
                  }}
                  className="w-full px-3 py-2 bg-surface border border-border-subtle rounded-lg text-text-primary text-xs focus:ring-2 focus:ring-primary focus:border-transparent outline-none font-sans"
                />
                <p className="text-[10px] text-text-muted">
                  Wajib memasukkan kata sandi akun Admin / Owner untuk otorisasi keamanan data.
                </p>
              </div>

              {restoreError && (
                <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-600 dark:text-red-400 font-medium text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{restoreError}</span>
                </div>
              )}
            </div>

            <div className="p-4 border-t border-border-subtle bg-surface flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setIsRestoreModalOpen(false);
                  setAdminPassword('');
                  setRestoreError('');
                }}
                disabled={isRestoring}
                className="px-4 py-2 rounded-xl text-xs font-bold text-text-secondary hover:bg-subtle transition-colors"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleExecuteRestore}
                disabled={isRestoring || !adminPassword.trim()}
                className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-md transition-all active:scale-95 disabled:opacity-50"
              >
                {isRestoring ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Memulihkan Database...</span>
                  </>
                ) : (
                  <>
                    <RotateCcw className="w-4 h-4" />
                    <span>Konfirmasi Pulihkan Data</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal 2: Unggah & Pulihkan dari Berkas Lokal (.db / .bak / flashdisk) */}
      {isUploadModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-card border border-border-subtle rounded-2xl w-full max-w-md shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="p-4 bg-amber-500/10 border-b border-amber-500/20 flex items-center justify-between">
              <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400 font-bold text-sm">
                <Upload className="w-5 h-5" />
                <span>Unggah & Pulihkan Basis Data (.db / .bak)</span>
              </div>
              <button
                onClick={() => {
                  if (!isUploadingRestore) {
                    setIsUploadModalOpen(false);
                    setUploadFile(null);
                    setUploadAdminPassword('');
                    setUploadRestoreError('');
                  }
                }}
                disabled={isUploadingRestore}
                className="p-1 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 text-text-muted"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-4 text-xs">
              <div className="p-3.5 bg-amber-500/10 border border-amber-500/30 rounded-xl flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                <div className="space-y-1 text-amber-900 dark:text-amber-200">
                  <p className="font-bold text-xs">PERINGATAN PEMULIHAN SISTEM</p>
                  <p className="text-[11px] leading-relaxed opacity-90">
                    File cadangan yang Anda pilih akan menggantikan database aktif saat ini. Sistem akan otomatis memverifikasi integritas SQLite dan membuat file cadangan cadangan rollback darurat.
                  </p>
                </div>
              </div>

              {/* File Input */}
              <div className="space-y-1.5">
                <label className="block font-bold text-text-primary text-xs">
                  Pilih Berkas Cadangan (.db, .sqlite, .bak):
                </label>
                <input
                  type="file"
                  ref={uploadFileInputRef}
                  accept=".db,.sqlite,.bak"
                  className="hidden"
                  onChange={(e) => {
                    if (e.target.files && e.target.files[0]) {
                      setUploadFile(e.target.files[0]);
                      setUploadRestoreError('');
                    }
                  }}
                />
                <div 
                  onClick={() => uploadFileInputRef.current?.click()}
                  className="p-4 border-2 border-dashed border-border-subtle hover:border-primary/60 rounded-xl bg-subtle cursor-pointer flex flex-col items-center justify-center gap-1.5 text-center transition-all"
                >
                  <Database className="w-8 h-8 text-primary/70" />
                  {uploadFile ? (
                    <div className="space-y-0.5">
                      <p className="font-mono font-bold text-text-primary text-xs">{uploadFile.name}</p>
                      <p className="text-[11px] text-text-secondary">{(uploadFile.size / 1024).toFixed(1)} KB — Klik untuk ganti berkas</p>
                    </div>
                  ) : (
                    <div>
                      <p className="font-bold text-text-primary text-xs">Klik untuk memilih berkas dari PC / Flashdisk</p>
                      <p className="text-[10px] text-text-muted">Mendukung berkas snapshot SQLite (.db, .sqlite, .bak)</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Password Admin */}
              <div className="space-y-1.5">
                <label className="block font-bold text-text-primary text-xs">
                  Kata Sandi Administrator / Owner:
                </label>
                <input
                  type="password"
                  value={uploadAdminPassword}
                  onChange={(e) => setUploadAdminPassword(e.target.value)}
                  disabled={isUploadingRestore}
                  placeholder="Masukkan kata sandi Admin..."
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleExecuteUploadRestore();
                  }}
                  className="w-full px-3 py-2 bg-surface border border-border-subtle rounded-lg text-text-primary text-xs focus:ring-2 focus:ring-primary focus:border-transparent outline-none font-sans"
                />
                <p className="text-[10px] text-text-muted">
                  Wajib memasukkan kata sandi akun Admin / Owner untuk validasi integritas keamanan data.
                </p>
              </div>

              {uploadRestoreError && (
                <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-600 dark:text-red-400 font-medium text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{uploadRestoreError}</span>
                </div>
              )}
            </div>

            <div className="p-4 border-t border-border-subtle bg-surface flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setIsUploadModalOpen(false);
                  setUploadFile(null);
                  setUploadAdminPassword('');
                  setUploadRestoreError('');
                }}
                disabled={isUploadingRestore}
                className="px-4 py-2 rounded-xl text-xs font-bold text-text-secondary hover:bg-subtle transition-colors"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleExecuteUploadRestore}
                disabled={isUploadingRestore || !uploadFile || !uploadAdminPassword.trim()}
                className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-md transition-all active:scale-95 disabled:opacity-50"
              >
                {isUploadingRestore ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Memverifikasi & Memulihkan...</span>
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4" />
                    <span>Pulihkan Database Sekarang</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal 3: Setup Google Drive */}
      <GoogleDriveSetupModal
        isOpen={isGdriveModalOpen}
        onClose={() => setIsGdriveModalOpen(false)}
        onSaved={() => {
          fetchGdriveConfig();
          fetchHistories();
        }}
      />
    </div>
  );
};

// ==========================================
// 5. SETTINGS & STORE PROFILE PAGE (RECEIPT 58mm/80mm & CUSTOM HEADER/FOOTER)
// ==========================================
export const SettingsPage: React.FC = () => {
  const { theme, setTheme } = useThemeStore();
  const { mode, edition } = useBusinessModeStore();
  const { 
    isCfdEnabled, 
    taxPercentage: currentTax,
    serviceChargePercentage: currentService,
    roundingRule: currentRounding,
    updateCfdSetting, 
    updateTaxAndRoundingSettings,
    fetchSettings: fetchGlobalSettings 
  } = useSettingsStore();

  const [storeName, setStoreName] = useState('OmniPOS Minimarket Sejahtera');
  const [storeAddress, setStoreAddress] = useState('Jl. Sudirman No. 88, Jakarta Pusat');
  const [storePhone, setStorePhone] = useState('0812-9876-5432');
  const [paperSize, setPaperSize] = useState('80mm');
  const [receiptFooter, setReceiptFooter] = useState('Terima kasih atas kunjungan Anda! Barang yang sudah dibeli tidak dapat ditukar/dikembalikan tanpa struk asli.');
  const [taxPercent, setTaxPercent] = useState<number>(currentTax);
  const [servicePercent, setServicePercent] = useState<number>(currentService);
  const [roundingRule, setRoundingRule] = useState<RoundingRuleType>(currentRounding);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    fetchGlobalSettings();
    fetch('/api/v1/settings')
      .then(r => r.json())
      .then(settings => {
        if (Array.isArray(settings)) {
          for (const s of settings) {
            if (s.settingKey === 'STORE_NAME') setStoreName(s.settingValue);
            if (s.settingKey === 'STORE_ADDRESS') setStoreAddress(s.settingValue);
            if (s.settingKey === 'STORE_PHONE') setStorePhone(s.settingValue);
            if (s.settingKey === 'PAPER_SIZE') setPaperSize(s.settingValue);
            if (s.settingKey === 'RECEIPT_FOOTER') setReceiptFooter(s.settingValue);
            if (s.settingKey === 'TAX_RATE_PERCENT') setTaxPercent(parseFloat(s.settingValue) || 0);
            if (s.settingKey === 'SERVICE_CHARGE_PERCENT') setServicePercent(parseFloat(s.settingValue) || 0);
            if (s.settingKey === 'ROUNDING_RULE') setRoundingRule(s.settingValue as RoundingRuleType);
          }
        }
      })
      .catch(() => {});
  }, [fetchGlobalSettings]);

  const handleSaveSettings = async (e?: React.FormEvent | React.MouseEvent) => {
    if (e && 'preventDefault' in e) e.preventDefault();
    try {
      setIsSaving(true);
      const payload = [
        { settingKey: 'STORE_NAME', settingValue: storeName },
        { settingKey: 'STORE_ADDRESS', settingValue: storeAddress },
        { settingKey: 'STORE_PHONE', settingValue: storePhone },
        { settingKey: 'PAPER_SIZE', settingValue: paperSize },
        { settingKey: 'RECEIPT_FOOTER', settingValue: receiptFooter },
        { settingKey: 'ENABLE_CFD', settingValue: isCfdEnabled ? 'true' : 'false' },
        { settingKey: 'TAX_RATE_PERCENT', settingValue: taxPercent.toString() },
        { settingKey: 'SERVICE_CHARGE_PERCENT', settingValue: servicePercent.toString() },
        { settingKey: 'ROUNDING_RULE', settingValue: roundingRule }
      ];

      const res = await fetch('/api/v1/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        await updateTaxAndRoundingSettings(taxPercent, servicePercent, roundingRule);
        useToastStore.getState().showToast('Pengaturan toko, pajak, pembulatan & struk berhasil disimpan!', 'success');
      } else {
        useToastStore.getState().showToast('Gagal menyimpan pengaturan.', 'error');
      }
    } catch {
      useToastStore.getState().showToast('Gagal menghubungi server.', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col bg-app overflow-hidden select-none">
      {/* Top Header */}
      <div className="p-4 px-6 bg-surface border-b border-border-subtle flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-bold">
            <Settings className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-text-primary">Pengaturan Toko & Konfigurasi Sistem</h2>
            <p className="text-xs text-text-secondary">Kelola profil toko, kustomisasi struk nota 58/80mm, layar pelanggan dan tema kasir</p>
          </div>
        </div>

        <button
          type="button"
          onClick={handleSaveSettings}
          disabled={isSaving}
          className="px-5 py-2.5 bg-primary hover:bg-primary-hover text-primary-text rounded-xl text-xs font-bold flex items-center gap-2 shadow-md transition-all active:scale-95 disabled:opacity-50"
        >
          <Save className="w-4 h-4" />
          <span>{isSaving ? 'Menyimpan...' : 'Simpan Pengaturan'}</span>
        </button>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto p-6 lg:p-8">
        <div className="max-w-6xl mx-auto space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
            
            {/* LEFT COLUMN: Identitas Toko & Layar */}
            <div className="space-y-6">
              {/* Installed Edition Banner */}
              <div className="p-5 bg-card border border-border-subtle rounded-xl shadow-sm space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-status-success" />
                    <h3 className="text-xs font-bold text-text-primary uppercase tracking-wider">Edisi Aplikasi Terpasang</h3>
                  </div>
                  <span className="px-2.5 py-1 rounded text-xs font-bold bg-primary/15 text-primary border border-primary/30">
                    Lisensi Aktif
                  </span>
                </div>

                <div className="p-4 rounded-lg bg-subtle border border-border-subtle space-y-2">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-bold text-text-primary">
                      {edition?.displayName || `OmniPOS Edisi ${mode}`}
                    </h4>
                    <span className="font-mono text-xs text-text-secondary bg-card px-2 py-0.5 rounded border border-border-subtle">
                      DB: {edition?.dbPath ? edition.dbPath.split('/').pop() : `pos_${mode.toLowerCase()}.db`}
                    </span>
                  </div>
                  <p className="text-xs text-text-secondary leading-relaxed">
                    {edition?.tagline || 'Sistem kasir desktop mandiri dengan database lokal SQLite terenkripsi.'}
                  </p>
                </div>
              </div>

              {/* Quick Jump to Payment Gateway & EDC Settings */}
              <div className="p-5 bg-card border border-emerald-500/30 rounded-xl shadow-sm space-y-3 bg-emerald-500/5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold">
                      <CreditCard className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="text-xs font-bold text-text-primary uppercase tracking-wider">Gateway QRIS & Mesin EDC</h3>
                      <p className="text-[11px] text-text-secondary">Pengaturan NMID, provider Midtrans/Xendit/Tripay, & Terminal EDC BCA/Mandiri/BRI</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      window.dispatchEvent(new CustomEvent('omnipos-navigate', { detail: 'hardware' }));
                      setTimeout(() => window.dispatchEvent(new CustomEvent('omnipos-hardware-tab', { detail: 'payment' })), 80);
                    }}
                    className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
                  >
                    <span>Atur QRIS & EDC</span>
                  </button>
                </div>
              </div>

              {/* Store Profile & Receipt Customization */}
              <div className="p-5 bg-card border border-border-subtle rounded-xl shadow-sm space-y-4">
                <div className="flex items-center gap-2.5 pb-2 border-b border-border-subtle">
                  <div className="w-7 h-7 rounded-lg bg-primary/10 text-primary flex items-center justify-center font-bold">
                    <Printer className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-xs font-bold text-text-primary uppercase tracking-wider">Profil Toko & Kustomisasi Nota Kasir</h3>
                    <p className="text-[11px] text-text-secondary">Informasi yang dicetak pada bagian atas dan bawah struk belanja</p>
                  </div>
                </div>
                <div className="space-y-3 text-xs">
                  <div>
                    <label className="block font-semibold text-text-secondary mb-1">Nama Toko:</label>
                    <input
                      type="text"
                      value={storeName}
                      onChange={(e) => setStoreName(e.target.value)}
                      className="w-full px-3 py-2 bg-subtle border border-border-strong rounded-md text-text-primary font-bold focus:outline-none focus:border-primary"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-text-secondary mb-1">Alamat Toko (Dicetak di Header Struk):</label>
                    <input
                      type="text"
                      value={storeAddress}
                      onChange={(e) => setStoreAddress(e.target.value)}
                      className="w-full px-3 py-2 bg-subtle border border-border-strong rounded-md text-text-primary focus:outline-none focus:border-primary"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-text-secondary mb-1">No. Telepon / WhatsApp Toko:</label>
                    <input
                      type="text"
                      value={storePhone}
                      onChange={(e) => setStorePhone(e.target.value)}
                      className="w-full px-3 py-2 bg-subtle border border-border-strong rounded-md text-text-primary font-mono focus:outline-none focus:border-primary"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-text-secondary mb-1">Catatan Kebijakan Footer Struk:</label>
                    <textarea
                      rows={3}
                      value={receiptFooter}
                      onChange={(e) => setReceiptFooter(e.target.value)}
                      placeholder="Pesan ucapan terima kasih dan syarat pengembalian barang..."
                      className="w-full px-3 py-2 bg-subtle border border-border-strong rounded-md text-text-primary leading-relaxed focus:outline-none focus:border-primary"
                    />
                  </div>
                </div>
              </div>

              {/* Customer Facing Display (CFD) Optional Feature Toggle */}
              <div className="p-5 bg-card border border-border-subtle rounded-xl shadow-sm space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center font-bold">
                      <Monitor className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="text-xs font-bold text-text-primary uppercase tracking-wider">Fitur Layar Pelanggan (CFD)</h3>
                      <p className="text-[11px] text-text-secondary">Tampilkan keranjang belanja dan QRIS di monitor sekunder yang menghadap ke pembeli</p>
                    </div>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input 
                      type="checkbox" 
                      checked={isCfdEnabled}
                      onChange={async (e) => {
                        const val = e.target.checked;
                        await updateCfdSetting(val);
                        useToastStore.getState().showToast(
                          val ? 'Fitur Layar Pelanggan diaktifkan di sidebar!' : 'Fitur Layar Pelanggan dinonaktifkan (disembunyikan dari sidebar).',
                          'info'
                        );
                      }}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-subtle peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-border-strong after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                  </label>
                </div>

                <div className="p-3.5 bg-subtle rounded-lg border border-border-subtle flex items-center justify-between text-xs gap-3">
                  <div>
                    <p className="font-semibold text-text-primary">
                      {isCfdEnabled ? 'Status: Aktif (Menu Layar Pelanggan muncul di Sidebar)' : 'Status: Nonaktif (Menu Layar Pelanggan disembunyikan dari Sidebar)'}
                    </p>
                    <p className="text-[11px] text-text-muted mt-0.5">
                      Jika Anda tidak memiliki monitor kedua untuk pelanggan, matikan opsi ini agar sidebar kasir lebih ringkas.
                    </p>
                  </div>
                  {isCfdEnabled && (
                    <button
                      type="button"
                      onClick={() => {
                        window.open('/cfd', '_blank', 'width=1024,height=768');
                      }}
                      className="px-3 py-1.5 bg-card hover:bg-card-hover border border-border-subtle rounded-md font-bold text-primary flex items-center gap-1.5 shadow-sm whitespace-nowrap"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      <span>Buka Layar di Tab Baru</span>
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* RIGHT COLUMN: Hardware, Pajak & Tema */}
            <div className="space-y-6">
              {/* Printer Setup & Hardware Hub */}
              <div className="p-5 bg-card border border-border-subtle rounded-xl shadow-sm space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-xs font-bold text-text-primary uppercase tracking-wider">Printer Thermal & Hardware Kasir</h3>
                    <p className="text-[11px] text-text-secondary">Atur kertas struk atau buka panel hardware untuk diagnosa USB/LAN, laci uang & scanner.</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => useHardwareStore.getState().setIsHardwareModalOpen(true)}
                    className="px-3 py-1.5 bg-primary/10 hover:bg-primary/20 text-primary border border-primary/30 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors shadow-sm whitespace-nowrap"
                  >
                    <Settings className="w-3.5 h-3.5" />
                    <span>Status & Uji Hardware</span>
                  </button>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div>
                    <label className="block font-semibold text-text-secondary mb-1">Ukuran Lebar Kertas Struk:</label>
                    <select
                      value={paperSize}
                      onChange={(e) => setPaperSize(e.target.value)}
                      className="w-full px-3 py-2 bg-subtle border border-border-strong rounded-md text-text-primary font-bold focus:outline-none focus:border-primary"
                    >
                      <option value="80mm">80mm (Desktop Thermal Printer Kasir)</option>
                      <option value="58mm">58mm (Kompak Mini Thermal / Mobile)</option>
                    </select>
                  </div>
                  <div className="flex items-end">
                    <button
                      type="button"
                      onClick={async () => {
                        await fetch('/api/v1/printer/drawer/open', { method: 'POST' });
                        useToastStore.getState().showToast('Sinyal buka laci kas (Cash Drawer Kick) dikirim!', 'info');
                      }}
                      className="w-full py-2 bg-subtle hover:bg-card-hover border border-border-subtle rounded-md font-semibold text-text-primary flex items-center justify-center gap-1.5"
                    >
                      <Printer className="w-4 h-4" />
                      <span>Test Buka Laci Kas</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Tax (PPN) & Rounding Configuration */}
              <div className="p-5 bg-card border border-border-subtle rounded-xl shadow-sm space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-xs font-bold text-text-primary uppercase tracking-wider">Tarif Pajak (PPN) & Pembulatan Belanja</h3>
                    <p className="text-[11px] text-text-secondary">Konfigurasi otomatis hitungan kasir untuk pajak, biaya layanan, dan pembulatan</p>
                  </div>
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-primary/10 text-primary border border-primary/20">
                    Kalkulasi Kasir
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                  {/* Tax Rate */}
                  <div className="space-y-2">
                    <label className="block font-semibold text-text-secondary">
                      Tarif Pajak (PPN / PB1):
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        min="0"
                        max="100"
                        step="0.5"
                        value={taxPercent}
                        onChange={(e) => setTaxPercent(parseFloat(e.target.value) || 0)}
                        className="w-full px-3 py-2 bg-subtle border border-border-strong rounded-md text-text-primary font-bold font-mono focus:outline-none focus:border-primary"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 font-bold text-text-muted">%</span>
                    </div>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <button
                        type="button"
                        onClick={() => setTaxPercent(0)}
                        className={`px-2 py-1 rounded text-[10px] font-bold border transition-colors ${taxPercent === 0 ? 'bg-primary text-primary-text border-primary' : 'bg-subtle border-border-subtle text-text-secondary hover:bg-card'}`}
                      >
                        0% (Bebas)
                      </button>
                      <button
                        type="button"
                        onClick={() => setTaxPercent(11)}
                        className={`px-2 py-1 rounded text-[10px] font-bold border transition-colors ${taxPercent === 11 ? 'bg-primary text-primary-text border-primary' : 'bg-subtle border-border-subtle text-text-secondary hover:bg-card'}`}
                      >
                        11% (Standar)
                      </button>
                      <button
                        type="button"
                        onClick={() => setTaxPercent(12)}
                        className={`px-2 py-1 rounded text-[10px] font-bold border transition-colors ${taxPercent === 12 ? 'bg-primary text-primary-text border-primary' : 'bg-subtle border-border-subtle text-text-secondary hover:bg-card'}`}
                      >
                        12% (PPN 2025)
                      </button>
                    </div>
                  </div>

                  {/* Service Charge */}
                  <div className="space-y-2">
                    <label className="block font-semibold text-text-secondary">
                      Biaya Layanan (Service Resto):
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        min="0"
                        max="100"
                        step="0.5"
                        value={servicePercent}
                        onChange={(e) => setServicePercent(parseFloat(e.target.value) || 0)}
                        className="w-full px-3 py-2 bg-subtle border border-border-strong rounded-md text-text-primary font-bold font-mono focus:outline-none focus:border-primary"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 font-bold text-text-muted">%</span>
                    </div>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <button
                        type="button"
                        onClick={() => setServicePercent(0)}
                        className={`px-2 py-1 rounded text-[10px] font-bold border transition-colors ${servicePercent === 0 ? 'bg-primary text-primary-text border-primary' : 'bg-subtle border-border-subtle text-text-secondary hover:bg-card'}`}
                      >
                        0% (Retail)
                      </button>
                      <button
                        type="button"
                        onClick={() => setServicePercent(5)}
                        className={`px-2 py-1 rounded text-[10px] font-bold border transition-colors ${servicePercent === 5 ? 'bg-primary text-primary-text border-primary' : 'bg-subtle border-border-subtle text-text-secondary hover:bg-card'}`}
                      >
                        5% (Cafe)
                      </button>
                      <button
                        type="button"
                        onClick={() => setServicePercent(10)}
                        className={`px-2 py-1 rounded text-[10px] font-bold border transition-colors ${servicePercent === 10 ? 'bg-primary text-primary-text border-primary' : 'bg-subtle border-border-subtle text-text-secondary hover:bg-card'}`}
                      >
                        10% (Resto)
                      </button>
                    </div>
                  </div>
                </div>

                {/* Rounding Rules */}
                <div className="space-y-2 pt-2 border-t border-border-subtle text-xs">
                  <label className="block font-semibold text-text-secondary">
                    Aturan Pembulatan Nilai Total Belanja:
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    {[
                      { id: 'NONE', label: 'Tanpa Pembulatan', desc: 'Sesuai hitungan desimal' },
                      { id: 'NEAREST_100', label: 'Rp 100 Terdekat', desc: 'Rekomendasi kasir RI' },
                      { id: 'NEAREST_500', label: 'Rp 500 Terdekat', desc: 'Kembalian koin 500' }
                    ].map((r) => (
                      <button
                        key={r.id}
                        type="button"
                        onClick={() => setRoundingRule(r.id as RoundingRuleType)}
                        className={`p-2.5 rounded-lg border text-left transition-all ${
                          roundingRule === r.id
                            ? 'bg-primary/10 border-primary shadow-sm ring-1 ring-primary'
                            : 'bg-subtle border-border-subtle hover:bg-card-hover'
                        }`}
                      >
                        <p className="font-bold text-text-primary text-xs">{r.label}</p>
                        <p className="text-[10px] text-text-muted mt-0.5">{r.desc}</p>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Live Simulator Preview */}
                <div className="p-3.5 bg-subtle rounded-lg border border-border-subtle text-xs space-y-2">
                  <div className="flex items-center justify-between text-text-secondary font-semibold">
                    <span>Simulasi Kalkulasi Tagihan Kasir</span>
                    <span className="text-[11px] text-text-muted font-mono">Contoh Subtotal: Rp 35.450</span>
                  </div>
                  {(() => {
                    const subtotal = 35450;
                    const tax = Math.round((subtotal * taxPercent) / 100);
                    const service = Math.round((subtotal * servicePercent) / 100);
                    const rawTotal = subtotal + tax + service;
                    let finalTotal = rawTotal;
                    if (roundingRule === 'NEAREST_100') finalTotal = Math.round(rawTotal / 100) * 100;
                    else if (roundingRule === 'NEAREST_500') finalTotal = Math.round(rawTotal / 500) * 500;
                    const roundingDiff = finalTotal - rawTotal;

                    return (
                      <div className="bg-card p-2.5 rounded border border-border-subtle space-y-1 font-mono text-[11px]">
                        <div className="flex justify-between text-text-secondary">
                          <span>Subtotal:</span>
                          <span>Rp {subtotal.toLocaleString('id-ID')}</span>
                        </div>
                        {tax > 0 && (
                          <div className="flex justify-between text-text-secondary">
                            <span>Pajak ({taxPercent}%):</span>
                            <span>+Rp {tax.toLocaleString('id-ID')}</span>
                          </div>
                        )}
                        {service > 0 && (
                          <div className="flex justify-between text-text-secondary">
                            <span>Service ({servicePercent}%):</span>
                            <span>+Rp {service.toLocaleString('id-ID')}</span>
                          </div>
                        )}
                        {roundingDiff !== 0 && (
                          <div className="flex justify-between text-amber-600 dark:text-amber-400">
                            <span>Pembulatan:</span>
                            <span>{roundingDiff > 0 ? `+Rp ${roundingDiff}` : `-Rp ${Math.abs(roundingDiff)}`}</span>
                          </div>
                        )}
                        <div className="pt-1.5 border-t border-border-subtle flex justify-between font-bold text-xs text-text-primary font-sans">
                          <span>Total Diterima Kasir:</span>
                          <span className="font-mono text-primary font-bold">Rp {finalTotal.toLocaleString('id-ID')}</span>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              </div>

              {/* Theme Settings */}
              <div className="p-5 bg-card border border-border-subtle rounded-xl shadow-sm space-y-4">
                <div>
                  <h3 className="text-xs font-bold text-text-primary uppercase tracking-wider">Pilihan Tema Visual Toko</h3>
                  <p className="text-[11px] text-text-secondary">Sesuaikan suasana pencahayaan dan kontras layar kasir Anda</p>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {[
                    { id: 'modern-light', label: '1. Modern Light', badge: 'Default Siang', desc: 'Putih bersih & Zinc netral (Square/Shopify)' },
                    { id: 'deep-zinc-dark', label: '2. Deep Zinc Dark', badge: 'Malam / Bar', desc: 'Dark Zinc netral tanpa silau (Toast style)' },
                    { id: 'high-contrast-mono', label: '3. High-Contrast Mono', badge: 'Minimarket', desc: 'Hitam-Putih tajam untuk transaksi cepat' },
                    { id: 'warm-linen', label: '4. Warm Linen & Earth', badge: 'Cafe & Bakery', desc: 'Abu-abu hangat untuk Bakery & Artisan Cafe' },
                  ].map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => setTheme(t.id as any)}
                      className={`p-3 rounded-lg border text-left transition-all text-xs flex flex-col justify-between ${
                        theme === t.id
                          ? 'bg-primary/10 border-primary shadow-sm ring-1 ring-primary'
                          : 'bg-subtle border-border-subtle hover:bg-card-hover'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <p className="font-bold text-text-primary">{t.label}</p>
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-surface border border-border-subtle text-text-muted font-medium">
                          {t.badge}
                        </span>
                      </div>
                      <p className="text-[11px] text-text-muted">{t.desc}</p>
                    </button>
                  ))}
                </div>
              </div>
            </div>

          </div>

          {/* Bottom Save Action Bar */}
          <div className="p-4 bg-card border border-border-subtle rounded-xl shadow-sm flex flex-col sm:flex-row items-center justify-between gap-3">
            <div>
              <h4 className="text-xs font-bold text-text-primary">Simpan Semua Perubahan Pengaturan</h4>
              <p className="text-[11px] text-text-muted">Perubahan profil toko, printer, dan aturan hitungan kasir langsung aktif di perangkat ini.</p>
            </div>
            <button
              type="button"
              onClick={handleSaveSettings}
              disabled={isSaving}
              className="w-full sm:w-auto px-6 py-2.5 bg-primary hover:bg-primary-hover text-primary-text rounded-xl text-xs font-bold flex items-center justify-center gap-2 shadow-md transition-all active:scale-95 disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              <span>{isSaving ? 'Menyimpan...' : 'Simpan Pengaturan Toko'}</span>
            </button>
          </div>

        </div>
      </div>
    </div>
  );
};

// ==========================================
// 6. USER, SHIFTS ROSTER & RBAC MANAGEMENT PAGE
// ==========================================
export const UserManagementPage: React.FC = () => {
  const { currentUser } = useAuthStore();
  const { showToast } = useToastStore();

  // Active Main Tab
  const [activeTab, setActiveTab] = useState<'users' | 'schedules' | 'attendance' | 'permissions'>('users');

  // -------------------------------------------------------------
  // 1. USERS & ACCOUNTS STATE
  // -------------------------------------------------------------
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('All');

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);

  const [fullName, setFullName] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [pinCode, setPinCode] = useState('111111');
  const [role, setRole] = useState<UserRole>('Cashier');
  const [isActive, setIsActive] = useState(true);

  // -------------------------------------------------------------
  // 2. SHIFT TEMPLATES & WORK ROSTER STATE
  // -------------------------------------------------------------
  const [shiftTemplates, setShiftTemplates] = useState<ShiftTemplate[]>([]);
  const [selectedRosterUserId, setSelectedRosterUserId] = useState<string>('');
  const [rosterSchedules, setRosterSchedules] = useState<EmployeeSchedule[]>([]);
  const [isRosterSaving, setIsRosterSaving] = useState(false);

  // Shift Template Modal State
  const [isTemplateModalOpen, setIsTemplateModalOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<ShiftTemplate | null>(null);
  const [tplName, setTplName] = useState('');
  const [tplStartTime, setTplStartTime] = useState('07:00');
  const [tplEndTime, setTplEndTime] = useState('15:00');
  const [tplGracePeriod, setTplGracePeriod] = useState(15);
  const [tplColorTag, setTplColorTag] = useState('#3b82f6');
  const [tplDescription, setTplDescription] = useState('');

  // -------------------------------------------------------------
  // 3. ATTENDANCE & OVERTIME RECAP STATE
  // -------------------------------------------------------------
  const [attendanceData, setAttendanceData] = useState<AttendanceAnalytics | null>(null);
  const [attendancePeriodDays, setAttendancePeriodDays] = useState<number>(14);
  const [attendanceUserFilter, setAttendanceUserFilter] = useState<string>('All');
  const [attendanceStatusFilter, setAttendanceStatusFilter] = useState<string>('All');
  const [isAttendanceLoading, setIsAttendanceLoading] = useState(false);

  // -------------------------------------------------------------
  // 4. GRANULAR RBAC PERMISSIONS STATE
  // -------------------------------------------------------------
  const [selectedPermUserId, setSelectedPermUserId] = useState<string>('');
  const [userPermission, setUserPermission] = useState<UserPermission>({
    userId: '',
    canApplyManualDiscount: false,
    canVoidOrderItem: false,
    canAccessReports: false,
    canEditProductPrice: false,
    canOpenCashDrawerDirectly: false,
    canAuthorizeCustomerDebt: false,
    canModifyInventory: false,
    canManagePromotions: false,
    canManageUsers: false
  });
  const [isPermLoading, setIsPermLoading] = useState(false);
  const [isPermSaving, setIsPermSaving] = useState(false);

  // =============================================================
  // DATA FETCHING FUNCTIONS
  // =============================================================
  const fetchUsers = async () => {
    try {
      setIsLoading(true);
      const res = await fetch('/api/v1/users');
      if (res.ok) {
        const data = await res.json();
        setUsers(data);
        if (data.length > 0 && !selectedRosterUserId) {
          setSelectedRosterUserId(data[0].id);
        }
        if (data.length > 0 && !selectedPermUserId) {
          setSelectedPermUserId(data[0].id);
        }
      }
    } catch {
      showToast('Gagal memuat daftar pengguna.', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchShiftTemplates = async () => {
    try {
      const res = await fetch('/api/v1/shifts/templates');
      if (res.ok) {
        const data = await res.json();
        setShiftTemplates(data);
      }
    } catch {
      showToast('Gagal memuat template shift.', 'error');
    }
  };

  const fetchUserSchedule = async (userId: string) => {
    if (!userId) return;
    try {
      const res = await fetch(`/api/v1/users/${userId}/schedule`);
      if (res.ok) {
        const data: EmployeeSchedule[] = await res.json();
        // Ensure 7 days structure (1=Monday .. 6=Saturday, 0=Sunday)
        const days = [1, 2, 3, 4, 5, 6, 0];
        const fullList: EmployeeSchedule[] = days.map(d => {
          const existing = data.find(item => item.dayOfWeek === d);
          if (existing) return existing;
          return {
            userId,
            dayOfWeek: d,
            isWorkDay: d !== 0, // default Sunday off
            shiftTemplateId: shiftTemplates.length > 0 ? shiftTemplates[0].id : undefined,
            notes: ''
          };
        });
        setRosterSchedules(fullList);
      }
    } catch {
      showToast('Gagal memuat jadwal karyawan.', 'error');
    }
  };

  const fetchAttendance = async () => {
    try {
      setIsAttendanceLoading(true);
      const res = await fetch(`/api/v1/users/attendance-analytics?days=${attendancePeriodDays}`);
      if (res.ok) {
        const data: AttendanceAnalytics = await res.json();
        setAttendanceData(data);
      }
    } catch {
      showToast('Gagal memuat rekap presensi.', 'error');
    } finally {
      setIsAttendanceLoading(false);
    }
  };

  const fetchUserPermissions = async (userId: string) => {
    if (!userId) return;
    try {
      setIsPermLoading(true);
      const res = await fetch(`/api/v1/users/${userId}/permissions`);
      if (res.ok) {
        const data: UserPermission = await res.json();
        setUserPermission(data);
      }
    } catch {
      showToast('Gagal memuat hak akses wewenang.', 'error');
    } finally {
      setIsPermLoading(false);
    }
  };

  // Initial load
  useEffect(() => {
    fetchUsers();
    fetchShiftTemplates();
  }, []);

  // When roster user changes or shiftTemplates load
  useEffect(() => {
    if (selectedRosterUserId) {
      fetchUserSchedule(selectedRosterUserId);
    }
  }, [selectedRosterUserId, shiftTemplates]);

  // When tab becomes attendance or period changes
  useEffect(() => {
    if (activeTab === 'attendance') {
      fetchAttendance();
    }
  }, [activeTab, attendancePeriodDays]);

  // When permissions user changes
  useEffect(() => {
    if (selectedPermUserId) {
      fetchUserPermissions(selectedPermUserId);
    }
  }, [selectedPermUserId]);

  // =============================================================
  // HANDLERS: TAB 1 (USERS)
  // =============================================================
  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim() || !username.trim() || !password) {
      showToast('Nama Lengkap, Username, dan Kata Sandi wajib diisi.', 'error');
      return;
    }
    if (!/^\d{6}$/.test(pinCode)) {
      showToast('PIN Kasir harus 6 digit angka.', 'error');
      return;
    }

    try {
      const res = await fetch('/api/v1/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fullName,
          username,
          password,
          pinCode,
          role,
          isActive
        })
      });

      const data = await res.json();
      if (res.ok) {
        showToast(`Karyawan ${fullName} (${role}) berhasil ditambahkan!`, 'success');
        setIsAddModalOpen(false);
        setFullName('');
        setUsername('');
        setPassword('');
        setPinCode('111111');
        setRole('Cashier');
        fetchUsers();
      } else {
        showToast(data.message || 'Gagal menambahkan karyawan.', 'error');
      }
    } catch {
      showToast('Gagal menghubungi server.', 'error');
    }
  };

  const handleUpdateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser) return;

    try {
      const payload: any = {
        fullName,
        role,
        isActive
      };
      if (password.trim()) payload.newPassword = password.trim();
      if (pinCode.trim()) payload.newPinCode = pinCode.trim();

      const res = await fetch(`/api/v1/users/${selectedUser.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (res.ok) {
        showToast(`Data akun ${fullName} berhasil diperbarui!`, 'success');
        setIsEditModalOpen(false);
        fetchUsers();
      } else {
        showToast(data.message || 'Gagal memperbarui pengguna.', 'error');
      }
    } catch {
      showToast('Gagal menghubungi server.', 'error');
    }
  };

  const handleDeactivate = async (u: User) => {
    if (u.role === 'SuperAdmin') {
      showToast('Akun Pemilik Utama tidak dapat dihapus.', 'warning');
      return;
    }

    if (!confirm(`Yakin ingin menonaktifkan akun ${u.fullName}?`)) return;

    try {
      const res = await fetch(`/api/v1/users/${u.id}`, { method: 'DELETE' });
      if (res.ok) {
        showToast(`Akun ${u.fullName} telah dinonaktifkan.`, 'info');
        fetchUsers();
      }
    } catch {
      showToast('Gagal menonaktifkan akun.', 'error');
    }
  };

  // =============================================================
  // HANDLERS: TAB 2 (SHIFT TEMPLATES & ROSTER)
  // =============================================================
  const handleOpenAddTemplate = () => {
    setEditingTemplate(null);
    setTplName('');
    setTplStartTime('07:00');
    setTplEndTime('15:00');
    setTplGracePeriod(15);
    setTplColorTag('#3b82f6');
    setTplDescription('');
    setIsTemplateModalOpen(true);
  };

  const handleOpenEditTemplate = (tpl: ShiftTemplate) => {
    setEditingTemplate(tpl);
    setTplName(tpl.name);
    setTplStartTime(tpl.startTime);
    setTplEndTime(tpl.endTime);
    setTplGracePeriod(tpl.gracePeriodMinutes || 15);
    setTplColorTag(tpl.colorTag || '#3b82f6');
    setTplDescription(tpl.description || '');
    setIsTemplateModalOpen(true);
  };

  const handleSaveTemplate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tplName.trim() || !tplStartTime || !tplEndTime) {
      showToast('Nama Shift, Jam Mulai, dan Jam Selesai wajib diisi.', 'error');
      return;
    }

    try {
      const payload = {
        name: tplName.trim(),
        startTime: tplStartTime,
        endTime: tplEndTime,
        gracePeriodMinutes: tplGracePeriod,
        colorTag: tplColorTag,
        description: tplDescription.trim(),
        isActive: true
      };

      const url = editingTemplate 
        ? `/api/v1/shifts/templates/${editingTemplate.id}`
        : '/api/v1/shifts/templates';
      const method = editingTemplate ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        showToast(`Template shift "${tplName}" berhasil disimpan!`, 'success');
        setIsTemplateModalOpen(false);
        fetchShiftTemplates();
      } else {
        const err = await res.json();
        showToast(err.message || 'Gagal menyimpan template shift.', 'error');
      }
    } catch {
      showToast('Gagal menghubungi server.', 'error');
    }
  };

  const handleDeleteTemplate = async (id: string, name: string) => {
    if (!confirm(`Hapus template shift "${name}"? Shift yang sedang berjalan tidak akan terhapus.`)) return;
    try {
      const res = await fetch(`/api/v1/shifts/templates/${id}`, { method: 'DELETE' });
      if (res.ok) {
        showToast(`Template shift "${name}" dihapus.`, 'info');
        fetchShiftTemplates();
      }
    } catch {
      showToast('Gagal menghapus template shift.', 'error');
    }
  };

  const handleUpdateScheduleRow = (dayOfWeek: number, field: keyof EmployeeSchedule, value: any) => {
    setRosterSchedules(prev => prev.map(item => {
      if (item.dayOfWeek === dayOfWeek) {
        return { ...item, [field]: value };
      }
      return item;
    }));
  };

  const handleApplyTemplateToWeekdays = (templateId: string) => {
    setRosterSchedules(prev => prev.map(item => {
      if (item.dayOfWeek >= 1 && item.dayOfWeek <= 5) {
        return {
          ...item,
          isWorkDay: true,
          shiftTemplateId: templateId
        };
      }
      return item;
    }));
    showToast('Template diterapkan ke hari Senin-Jumat!', 'info');
  };

  const handleSaveRoster = async () => {
    if (!selectedRosterUserId) return;
    try {
      setIsRosterSaving(true);
      const payload = {
        userId: selectedRosterUserId,
        schedules: rosterSchedules.map(s => ({
          dayOfWeek: s.dayOfWeek,
          isWorkDay: s.isWorkDay,
          shiftTemplateId: s.shiftTemplateId || null,
          customStartTime: s.customStartTime || null,
          customEndTime: s.customEndTime || null,
          notes: s.notes || null
        }))
      };

      const res = await fetch(`/api/v1/users/${selectedRosterUserId}/schedule`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        showToast('Jadwal mingguan karyawan berhasil disimpan & aktif!', 'success');
      } else {
        const err = await res.json();
        showToast(err.message || 'Gagal menyimpan jadwal.', 'error');
      }
    } catch {
      showToast('Gagal menghubungi server.', 'error');
    } finally {
      setIsRosterSaving(false);
    }
  };

  // =============================================================
  // HANDLERS: TAB 3 (ATTENDANCE & CSV EXPORT)
  // =============================================================
  const handleExportCsv = () => {
    const url = `/api/v1/users/attendance-analytics/export-csv?days=${attendancePeriodDays}`;
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `rekap_presensi_omnipos_${attendancePeriodDays}hari.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('Mengekspor file CSV rekap presensi...', 'success');
  };

  // =============================================================
  // HANDLERS: TAB 4 (GRANULAR RBAC PERMISSIONS)
  // =============================================================
  const handleTogglePermission = (field: keyof UserPermission) => {
    setUserPermission(prev => ({
      ...prev,
      [field]: !prev[field]
    }));
  };

  const handleApplyRolePreset = (presetRole: UserRole) => {
    let preset: Partial<UserPermission> = {
      canApplyManualDiscount: false,
      canVoidOrderItem: false,
      canAccessReports: false,
      canEditProductPrice: false,
      canOpenCashDrawerDirectly: false,
      canAuthorizeCustomerDebt: false,
      canModifyInventory: false,
      canManagePromotions: false,
      canManageUsers: false
    };

    if (presetRole === 'SuperAdmin') {
      preset = {
        canApplyManualDiscount: true,
        canVoidOrderItem: true,
        canAccessReports: true,
        canEditProductPrice: true,
        canOpenCashDrawerDirectly: true,
        canAuthorizeCustomerDebt: true,
        canModifyInventory: true,
        canManagePromotions: true,
        canManageUsers: true
      };
    } else if (presetRole === 'Manager') {
      preset = {
        canApplyManualDiscount: true,
        canVoidOrderItem: true,
        canAccessReports: true,
        canEditProductPrice: true,
        canOpenCashDrawerDirectly: true,
        canAuthorizeCustomerDebt: true,
        canModifyInventory: true,
        canManagePromotions: true,
        canManageUsers: false
      };
    } else if (presetRole === 'Cashier') {
      preset = {
        canApplyManualDiscount: true,
        canVoidOrderItem: false,
        canAccessReports: false,
        canEditProductPrice: false,
        canOpenCashDrawerDirectly: false,
        canAuthorizeCustomerDebt: true,
        canModifyInventory: false,
        canManagePromotions: false,
        canManageUsers: false
      };
    } else if (presetRole === 'InventoryStaff') {
      preset = {
        canApplyManualDiscount: false,
        canVoidOrderItem: false,
        canAccessReports: false,
        canEditProductPrice: false,
        canOpenCashDrawerDirectly: false,
        canAuthorizeCustomerDebt: false,
        canModifyInventory: true,
        canManagePromotions: false,
        canManageUsers: false
      };
    }

    setUserPermission(prev => ({ ...prev, ...preset }));
    showToast(`Preset hak akses ${presetRole} diterapkan!`, 'info');
  };

  const handleSavePermissions = async () => {
    if (!selectedPermUserId) return;
    try {
      setIsPermSaving(true);
      const res = await fetch(`/api/v1/users/${selectedPermUserId}/permissions`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(userPermission)
      });

      if (res.ok) {
        showToast('Hak akses wewenang karyawan berhasil disimpan!', 'success');
      } else {
        const err = await res.json();
        showToast(err.message || 'Gagal menyimpan hak akses.', 'error');
      }
    } catch {
      showToast('Gagal menghubungi server.', 'error');
    } finally {
      setIsPermSaving(false);
    }
  };

  // Helper: Role badge styling
  const getRoleBadge = (r: UserRole) => {
    switch (r) {
      case 'SuperAdmin':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30 shadow-2xs">
            <ShieldCheck className="w-3.5 h-3.5 shrink-0" />
            SuperAdmin / Owner
          </span>
        );
      case 'Manager':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-purple-500/15 text-purple-600 dark:text-purple-400 border border-purple-500/30 shadow-2xs">
            <Briefcase className="w-3.5 h-3.5 shrink-0" />
            Manajer
          </span>
        );
      case 'Cashier':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 shadow-2xs">
            <Receipt className="w-3.5 h-3.5 shrink-0" />
            Kasir
          </span>
        );
      case 'InventoryStaff':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-blue-500/15 text-blue-600 dark:text-blue-400 border border-blue-500/30 shadow-2xs">
            <Package className="w-3.5 h-3.5 shrink-0" />
            Staf Gudang
          </span>
        );
      case 'Waiter':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-orange-500/15 text-orange-600 dark:text-orange-400 border border-orange-500/30 shadow-2xs">
            <Utensils className="w-3.5 h-3.5 shrink-0" />
            Pelayan (F&B)
          </span>
        );
      case 'KitchenStaff':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/30 shadow-2xs">
            <ChefHat className="w-3.5 h-3.5 shrink-0" />
            Koki / Dapur KDS
          </span>
        );
      case 'Technician':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 border border-indigo-500/30 shadow-2xs">
            <Wrench className="w-3.5 h-3.5 shrink-0" />
            Teknisi / Layanan
          </span>
        );
      default:
        return <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-subtle text-text-muted">{r}</span>;
    }
  };

  const getDayName = (d: number) => {
    switch (d) {
      case 1: return 'Senin';
      case 2: return 'Selasa';
      case 3: return 'Rabu';
      case 4: return 'Kamis';
      case 5: return 'Jumat';
      case 6: return 'Sabtu';
      case 0: return 'Minggu';
      default: return `Hari #${d}`;
    }
  };

  const filteredUsers = users.filter(u => {
    const matchSearch = u.fullName.toLowerCase().includes(search.toLowerCase()) ||
      u.username.toLowerCase().includes(search.toLowerCase()) ||
      u.role.toLowerCase().includes(search.toLowerCase());
    const matchRole = roleFilter === 'All' || u.role === roleFilter;
    return matchSearch && matchRole;
  });

  const selectedRosterUserObj = users.find(u => u.id === selectedRosterUserId);
  const selectedPermUserObj = users.find(u => u.id === selectedPermUserId);

  // Attendance Records Filtered
  const filteredAttendanceRecords = (attendanceData?.records || []).filter(r => {
    const matchUser = attendanceUserFilter === 'All' || r.userId === attendanceUserFilter;
    const matchStatus = attendanceStatusFilter === 'All' || r.attendanceStatus === attendanceStatusFilter;
    return matchUser && matchStatus;
  });

  return (
    <div className="flex-1 flex flex-col bg-app overflow-hidden select-none">
      {/* Top Main Navigation Header */}
      <div className="p-4 bg-surface border-b border-border-subtle flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-bold shadow-xs">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-text-primary flex items-center gap-2">
              <span>Manajemen Karyawan, Shift & Hak Akses (HR & RBAC)</span>
              <span className="text-[10px] px-2 py-0.5 rounded-md bg-primary/10 text-primary font-mono font-bold">
                ENTERPRISE
              </span>
            </h2>
            <p className="text-xs text-text-secondary">Kelola akun pengguna, template & roster jadwal shift kerja, rekap presensi keterlambatan/lembur, dan wewenang otorisasi granular</p>
          </div>
        </div>

        {/* Tab Switcher Pills */}
        <div className="flex items-center gap-1.5 p-1 bg-subtle border border-border-subtle rounded-xl overflow-x-auto">
          <button
            onClick={() => setActiveTab('users')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
              activeTab === 'users'
                ? 'bg-primary text-primary-text shadow-sm'
                : 'text-text-secondary hover:text-text-primary hover:bg-card-hover'
            }`}
          >
            <UserCheck className="w-3.5 h-3.5" />
            <span>👥 Karyawan & Akun</span>
          </button>

          <button
            onClick={() => setActiveTab('schedules')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
              activeTab === 'schedules'
                ? 'bg-primary text-primary-text shadow-sm'
                : 'text-text-secondary hover:text-text-primary hover:bg-card-hover'
            }`}
          >
            <CalendarDays className="w-3.5 h-3.5" />
            <span>📅 Jadwal & Shift (Roster)</span>
          </button>

          <button
            onClick={() => setActiveTab('attendance')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
              activeTab === 'attendance'
                ? 'bg-primary text-primary-text shadow-sm'
                : 'text-text-secondary hover:text-text-primary hover:bg-card-hover'
            }`}
          >
            <Timer className="w-3.5 h-3.5" />
            <span>⏱️ Rekap Presensi & Lembur</span>
          </button>

          <button
            onClick={() => setActiveTab('permissions')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
              activeTab === 'permissions'
                ? 'bg-primary text-primary-text shadow-sm'
                : 'text-text-secondary hover:text-text-primary hover:bg-card-hover'
            }`}
          >
            <Shield className="w-3.5 h-3.5" />
            <span>🛡️ Hak Akses (RBAC)</span>
          </button>
        </div>
      </div>

      {/* Main Tab Contents */}
      <div className="flex-1 overflow-y-auto p-4">

        {/* ============================================================= */}
        {/* TAB 1: USERS & STAFF ACCOUNTS */}
        {/* ============================================================= */}
        {activeTab === 'users' && (
          <div className="space-y-4">
            {/* Quick KPI Counters */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="p-3.5 bg-card border border-border-subtle rounded-xl shadow-xs flex items-center justify-between">
                <div>
                  <p className="text-[11px] text-text-muted font-semibold">Total Karyawan</p>
                  <p className="text-xl font-bold font-mono text-text-primary mt-0.5">{users.length}</p>
                </div>
                <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center font-bold">
                  <Users className="w-4 h-4" />
                </div>
              </div>

              <div className="p-3.5 bg-card border border-border-subtle rounded-xl shadow-xs flex items-center justify-between">
                <div>
                  <p className="text-[11px] text-text-muted font-semibold">Kasir Aktif</p>
                  <p className="text-xl font-bold font-mono text-emerald-500 mt-0.5">
                    {users.filter(u => u.role === 'Cashier' && u.isActive).length}
                  </p>
                </div>
                <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-500 flex items-center justify-center font-bold">
                  <Receipt className="w-4 h-4" />
                </div>
              </div>

              <div className="p-3.5 bg-card border border-border-subtle rounded-xl shadow-xs flex items-center justify-between">
                <div>
                  <p className="text-[11px] text-text-muted font-semibold">Manajer & Admin</p>
                  <p className="text-xl font-bold font-mono text-purple-500 mt-0.5">
                    {users.filter(u => (u.role === 'Manager' || u.role === 'SuperAdmin') && u.isActive).length}
                  </p>
                </div>
                <div className="w-8 h-8 rounded-lg bg-purple-500/10 text-purple-500 flex items-center justify-center font-bold">
                  <Briefcase className="w-4 h-4" />
                </div>
              </div>

              <div className="p-3.5 bg-card border border-border-subtle rounded-xl shadow-xs flex items-center justify-between">
                <div>
                  <p className="text-[11px] text-text-muted font-semibold">Staf Gudang & Layanan</p>
                  <p className="text-xl font-bold font-mono text-blue-500 mt-0.5">
                    {users.filter(u => ['InventoryStaff', 'Waiter', 'KitchenStaff', 'Technician'].includes(u.role) && u.isActive).length}
                  </p>
                </div>
                <div className="w-8 h-8 rounded-lg bg-blue-500/10 text-blue-500 flex items-center justify-center font-bold">
                  <Package className="w-4 h-4" />
                </div>
              </div>
            </div>

            {/* Filter Bar */}
            <div className="p-3 bg-card border border-border-subtle rounded-xl shadow-xs flex flex-col md:flex-row items-center justify-between gap-3">
              <div className="flex items-center gap-2 w-full md:w-auto">
                <div className="relative flex-1 md:w-64">
                  <Search className="w-4 h-4 text-text-muted absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Cari nama, username, role..."
                    className="w-full pl-9 pr-3 py-1.5 bg-subtle border border-border-subtle rounded-lg text-xs text-text-primary focus:outline-none focus:border-primary"
                  />
                </div>

                <select
                  value={roleFilter}
                  onChange={(e) => setRoleFilter(e.target.value)}
                  className="px-3 py-1.5 bg-subtle border border-border-subtle rounded-lg text-xs text-text-primary font-semibold"
                >
                  <option value="All">Semua Peran / Role</option>
                  <option value="Cashier">Kasir</option>
                  <option value="Manager">Manajer</option>
                  <option value="InventoryStaff">Staf Gudang</option>
                  <option value="Waiter">Pelayan (F&B)</option>
                  <option value="KitchenStaff">Koki (KDS)</option>
                  <option value="Technician">Teknisi</option>
                  <option value="SuperAdmin">SuperAdmin</option>
                </select>
              </div>

              <button
                onClick={() => {
                  setFullName('');
                  setUsername('');
                  setPassword('');
                  setPinCode('111111');
                  setRole('Cashier');
                  setIsActive(true);
                  setIsAddModalOpen(true);
                }}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-primary text-primary-text font-bold text-xs shadow-md hover:bg-primary-hover transition-all w-full md:w-auto justify-center"
              >
                <Plus className="w-4 h-4" />
                <span>Tambah Karyawan Baru</span>
              </button>
            </div>

            {/* Users Table */}
            <div className="bg-card border border-border-subtle rounded-xl overflow-hidden shadow-sm">
              <table className="w-full text-left text-xs">
                <thead className="bg-subtle text-text-muted font-bold border-b border-border-subtle uppercase tracking-wider text-[10px]">
                  <tr>
                    <th className="p-3">Nama Karyawan</th>
                    <th className="p-3">Username Login</th>
                    <th className="p-3">Peran & Wewenang</th>
                    <th className="p-3">Status Akun</th>
                    <th className="p-3">Login Terakhir</th>
                    <th className="p-3 text-right">Pintasan & Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border-subtle">
                  {filteredUsers.map((u) => (
                    <tr key={u.id} className="hover:bg-subtle/50 transition-colors">
                      <td className="p-3 font-bold text-text-primary">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-full bg-primary/10 text-primary font-bold flex items-center justify-center text-xs ring-1 ring-primary/20">
                            {u.fullName.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <span className="block text-text-primary">{u.fullName}</span>
                            <span className="text-[10px] text-text-muted font-normal font-mono">ID: {u.id.substring(0, 8)}...</span>
                          </div>
                        </div>
                      </td>
                      <td className="p-3 font-mono text-text-secondary font-semibold">@{u.username}</td>
                      <td className="p-3">{getRoleBadge(u.role)}</td>
                      <td className="p-3">
                        {u.isActive ? (
                          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                            Aktif
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-subtle text-text-muted border border-border-subtle">
                            <span className="w-1.5 h-1.5 rounded-full bg-text-muted" />
                            Nonaktif
                          </span>
                        )}
                      </td>
                      <td className="p-3 text-text-muted text-[11px]">
                        {u.lastLoginAt ? new Date(u.lastLoginAt).toLocaleString('id-ID') : 'Belum pernah'}
                      </td>
                      <td className="p-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Shortcut to Roster */}
                          <button
                            onClick={() => {
                              setSelectedRosterUserId(u.id);
                              setActiveTab('schedules');
                            }}
                            className="p-1.5 rounded-lg bg-subtle hover:bg-card-hover border border-border-subtle text-text-secondary hover:text-primary transition-colors"
                            title="Atur Jadwal Shift Roster"
                          >
                            <CalendarDays className="w-3.5 h-3.5" />
                          </button>

                          {/* Shortcut to RBAC */}
                          <button
                            onClick={() => {
                              setSelectedPermUserId(u.id);
                              setActiveTab('permissions');
                            }}
                            className="p-1.5 rounded-lg bg-subtle hover:bg-card-hover border border-border-subtle text-text-secondary hover:text-amber-500 transition-colors"
                            title="Atur Hak Akses Granular (RBAC)"
                          >
                            <Shield className="w-3.5 h-3.5" />
                          </button>

                          {/* Edit User Button */}
                          <button
                            onClick={() => {
                              setSelectedUser(u);
                              setFullName(u.fullName);
                              setUsername(u.username);
                              setRole(u.role);
                              setIsActive(u.isActive);
                              setPassword('');
                              setPinCode('');
                              setIsEditModalOpen(true);
                            }}
                            className="p-1.5 rounded-lg bg-subtle hover:bg-card-hover border border-border-subtle text-text-secondary hover:text-text-primary transition-colors"
                            title="Edit Profil / Password / PIN"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>

                          {u.role !== 'SuperAdmin' && (
                            <button
                              onClick={() => handleDeactivate(u)}
                              className="p-1.5 rounded-lg bg-subtle hover:bg-status-danger/10 border border-border-subtle text-status-danger transition-colors"
                              title="Nonaktifkan Karyawan"
                            >
                              <UserX className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}

                  {filteredUsers.length === 0 && !isLoading && (
                    <tr>
                      <td colSpan={6} className="p-8 text-center text-text-muted">
                        Tidak ada data karyawan yang cocok dengan pencarian.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ============================================================= */}
        {/* TAB 2: SHIFT TEMPLATES & WORK ROSTER */}
        {/* ============================================================= */}
        {activeTab === 'schedules' && (
          <div className="space-y-6">
            {/* Top Sub-Section: Shift Templates */}
            <div className="p-4 bg-card border border-border-subtle rounded-xl shadow-xs space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border-subtle pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center font-bold">
                    <Clock className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="font-bold text-sm text-text-primary">1. Master Template Shift Toko</h3>
                    <p className="text-[11px] text-text-muted">Tentukan jam mulai, jam selesai, toleransi keterlambatan, dan warna penanda shift</p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleOpenAddTemplate}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary text-primary-text font-bold text-xs shadow-sm hover:bg-primary-hover transition-all self-start sm:self-auto"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Tambah Template Shift</span>
                </button>
              </div>

              {/* Grid of Shift Templates */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                {shiftTemplates.map((tpl) => (
                  <div
                    key={tpl.id}
                    className="p-3.5 rounded-xl border border-border-subtle bg-subtle/50 hover:bg-card-hover transition-all flex flex-col justify-between space-y-3"
                  >
                    <div>
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-xs text-text-primary flex items-center gap-2">
                          <span className="w-3 h-3 rounded-full" style={{ backgroundColor: tpl.colorTag || '#3b82f6' }} />
                          {tpl.name}
                        </span>
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-card border border-border-subtle font-semibold text-text-secondary">
                          {tpl.gracePeriodMinutes || 15} mnt grace
                        </span>
                      </div>
                      <div className="mt-2 text-base font-bold font-mono text-primary">
                        {tpl.startTime} - {tpl.endTime}
                      </div>
                      {tpl.description && (
                        <p className="text-[11px] text-text-muted mt-1 line-clamp-1">{tpl.description}</p>
                      )}
                    </div>

                    <div className="flex items-center justify-end gap-1.5 pt-2 border-t border-border-subtle">
                      <button
                        type="button"
                        onClick={() => handleOpenEditTemplate(tpl)}
                        className="p-1 rounded bg-card hover:bg-subtle border border-border-subtle text-text-secondary hover:text-text-primary text-[10px] font-semibold flex items-center gap-1 px-2"
                      >
                        <Edit3 className="w-3 h-3" />
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteTemplate(tpl.id, tpl.name)}
                        className="p-1 rounded bg-card hover:bg-status-danger/10 border border-border-subtle text-status-danger text-[10px] font-semibold flex items-center gap-1 px-2"
                      >
                        <Trash2 className="w-3 h-3" />
                        Hapus
                      </button>
                    </div>
                  </div>
                ))}

                {shiftTemplates.length === 0 && (
                  <div className="col-span-full p-6 text-center text-text-muted border border-dashed border-border-subtle rounded-xl">
                    Belum ada template shift. Klik tombol "Tambah Template Shift" di atas.
                  </div>
                )}
              </div>
            </div>

            {/* Bottom Sub-Section: Weekly Roster Per Employee */}
            <div className="p-4 bg-card border border-border-subtle rounded-xl shadow-xs space-y-4">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-border-subtle pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-500 flex items-center justify-center font-bold">
                    <CalendarDays className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="font-bold text-sm text-text-primary">2. Roster Jadwal Mingguan Karyawan</h3>
                    <p className="text-[11px] text-text-muted">Tetapkan hari kerja aktif & penugasan shift harian (Senin - Minggu) per individu</p>
                  </div>
                </div>

                {/* Employee Selector Dropdown */}
                <div className="flex items-center gap-2">
                  <label className="text-xs font-semibold text-text-secondary whitespace-nowrap">Pilih Karyawan:</label>
                  <select
                    value={selectedRosterUserId}
                    onChange={(e) => setSelectedRosterUserId(e.target.value)}
                    className="px-3 py-1.5 bg-subtle border border-border-subtle rounded-lg text-xs font-bold text-text-primary focus:outline-none focus:border-primary"
                  >
                    {users.map(u => (
                      <option key={u.id} value={u.id}>
                        {u.fullName} ({u.role})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Quick Preset Buttons */}
              <div className="flex flex-wrap items-center justify-between gap-2 p-3 bg-subtle/50 rounded-xl border border-border-subtle text-xs">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-semibold text-text-secondary text-[11px]">Terapkan Cepat (Senin-Jumat):</span>
                  {shiftTemplates.map(tpl => (
                    <button
                      key={tpl.id}
                      type="button"
                      onClick={() => handleApplyTemplateToWeekdays(tpl.id)}
                      className="px-2.5 py-1 rounded-md bg-card border border-border-subtle text-text-primary font-semibold text-[11px] hover:border-primary transition-all flex items-center gap-1.5 shadow-2xs"
                    >
                      <span className="w-2 h-2 rounded-full" style={{ backgroundColor: tpl.colorTag || '#3b82f6' }} />
                      {tpl.name}
                    </button>
                  ))}
                </div>

                <div className="text-[11px] text-text-muted">
                  Karyawan: <strong className="text-text-primary">{selectedRosterUserObj?.fullName}</strong> ({selectedRosterUserObj?.role})
                </div>
              </div>

              {/* 7-Days Schedule Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-7 gap-2.5">
                {rosterSchedules.map((schedule) => {
                  const dayName = getDayName(schedule.dayOfWeek);
                  const isWeekend = schedule.dayOfWeek === 0 || schedule.dayOfWeek === 6;

                  return (
                    <div
                      key={schedule.dayOfWeek}
                      className={`p-3 rounded-xl border transition-all flex flex-col justify-between space-y-2.5 ${
                        schedule.isWorkDay
                          ? 'bg-card border-border-subtle shadow-xs'
                          : 'bg-subtle/30 border-dashed border-border-subtle opacity-75'
                      }`}
                    >
                      {/* Day Header & Work Day Toggle */}
                      <div className="flex items-center justify-between border-b border-border-subtle pb-2">
                        <span className={`font-bold text-xs ${isWeekend ? 'text-amber-500' : 'text-text-primary'}`}>
                          {dayName}
                        </span>
                        <label className="flex items-center gap-1 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={schedule.isWorkDay}
                            onChange={(e) => handleUpdateScheduleRow(schedule.dayOfWeek, 'isWorkDay', e.target.checked)}
                            className="w-3.5 h-3.5 text-primary rounded"
                          />
                          <span className={`text-[10px] font-bold ${schedule.isWorkDay ? 'text-emerald-500' : 'text-text-muted'}`}>
                            {schedule.isWorkDay ? 'KERJA' : 'LIBUR'}
                          </span>
                        </label>
                      </div>

                      {/* Shift Template Selector or OFF State */}
                      {schedule.isWorkDay ? (
                        <div className="space-y-2">
                          <div>
                            <label className="block text-[10px] font-semibold text-text-muted mb-1">Shift:</label>
                            <select
                              value={schedule.shiftTemplateId || ''}
                              onChange={(e) => handleUpdateScheduleRow(schedule.dayOfWeek, 'shiftTemplateId', e.target.value)}
                              className="w-full px-2 py-1.5 bg-subtle border border-border-subtle rounded-md text-xs font-semibold text-text-primary focus:outline-none focus:border-primary"
                            >
                              {shiftTemplates.map(t => (
                                <option key={t.id} value={t.id}>
                                  {t.name} ({t.startTime}-{t.endTime})
                                </option>
                              ))}
                            </select>
                          </div>

                          <div>
                            <label className="block text-[10px] font-semibold text-text-muted mb-1">Catatan:</label>
                            <input
                              type="text"
                              value={schedule.notes || ''}
                              onChange={(e) => handleUpdateScheduleRow(schedule.dayOfWeek, 'notes', e.target.value)}
                              placeholder="Misal: PIC Kas"
                              className="w-full px-2 py-1 bg-subtle border border-border-subtle rounded-md text-[11px] text-text-primary"
                            />
                          </div>
                        </div>
                      ) : (
                        <div className="py-4 text-center">
                          <span className="text-[11px] font-bold text-text-muted bg-subtle px-2.5 py-1 rounded-full">
                            🏖️ Hari Libur
                          </span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Bottom Action Save Roster */}
              <div className="pt-3 border-t border-border-subtle flex items-center justify-between">
                <p className="text-[11px] text-text-muted">
                  Perubahan jadwal langsung otomatis digunakan untuk kalkulasi telemetri keterlambatan & lembur saat kasir buka/tutup shift.
                </p>

                <button
                  type="button"
                  onClick={handleSaveRoster}
                  disabled={isRosterSaving}
                  className="px-5 py-2 rounded-xl bg-primary text-primary-text font-bold text-xs shadow-md hover:bg-primary-hover transition-all flex items-center gap-2 disabled:opacity-50"
                >
                  <Save className="w-4 h-4" />
                  <span>{isRosterSaving ? 'Menyimpan...' : 'Simpan Jadwal Roster Karyawan'}</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ============================================================= */}
        {/* TAB 3: ATTENDANCE & OVERTIME RECAP */}
        {/* ============================================================= */}
        {activeTab === 'attendance' && (
          <div className="space-y-4">
            {/* Top Filter & Export Bar */}
            <div className="p-3.5 bg-card border border-border-subtle rounded-xl shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3">
              <div className="flex items-center gap-2 flex-wrap">
                {/* Period Selector */}
                <div className="flex items-center gap-1.5 p-1 bg-subtle rounded-lg border border-border-subtle text-xs">
                  <span className="text-[11px] text-text-muted px-1.5 font-semibold">Periode:</span>
                  {[7, 14, 30, 90].map((days) => (
                    <button
                      key={days}
                      type="button"
                      onClick={() => setAttendancePeriodDays(days)}
                      className={`px-2.5 py-1 rounded-md font-bold text-[11px] transition-all ${
                        attendancePeriodDays === days
                          ? 'bg-primary text-white shadow-xs'
                          : 'text-text-secondary hover:text-text-primary'
                      }`}
                    >
                      {days} Hari
                    </button>
                  ))}
                </div>

                {/* Filter User */}
                <select
                  value={attendanceUserFilter}
                  onChange={(e) => setAttendanceUserFilter(e.target.value)}
                  className="px-3 py-1.5 bg-subtle border border-border-subtle rounded-lg text-xs font-semibold text-text-primary"
                >
                  <option value="All">Semua Karyawan</option>
                  {users.map(u => (
                    <option key={u.id} value={u.id}>{u.fullName}</option>
                  ))}
                </select>

                {/* Filter Status */}
                <select
                  value={attendanceStatusFilter}
                  onChange={(e) => setAttendanceStatusFilter(e.target.value)}
                  className="px-3 py-1.5 bg-subtle border border-border-subtle rounded-lg text-xs font-semibold text-text-primary"
                >
                  <option value="All">Semua Status Presensi</option>
                  <option value="OnTime">Tepat Waktu (On Time)</option>
                  <option value="Late">Terlambat (Late)</option>
                  <option value="EarlyLeave">Pulang Lebih Awal (Early)</option>
                  <option value="Overtime">Lembur (Overtime)</option>
                </select>
              </div>

              {/* Actions: Refresh & Export CSV */}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={fetchAttendance}
                  disabled={isAttendanceLoading}
                  className="p-2 rounded-lg bg-subtle hover:bg-card-hover border border-border-subtle text-text-secondary hover:text-text-primary transition-colors"
                  title="Muat Ulang Data"
                >
                  <RefreshCw className={`w-4 h-4 ${isAttendanceLoading ? 'animate-spin' : ''}`} />
                </button>

                <button
                  type="button"
                  onClick={handleExportCsv}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md transition-all"
                >
                  <FileDown className="w-4 h-4" />
                  <span>Unduh Rekap CSV</span>
                </button>
              </div>
            </div>

            {/* KPI Summary Cards */}
            {attendanceData && (
              <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                <div className="p-3.5 bg-card border border-border-subtle rounded-xl shadow-xs">
                  <p className="text-[11px] text-text-muted font-semibold">Total Shift Presensi</p>
                  <p className="text-xl font-bold font-mono text-text-primary mt-1">
                    {attendanceData.summary.totalShifts} <span className="text-xs font-normal text-text-muted">shift</span>
                  </p>
                  <p className="text-[10px] text-text-muted mt-0.5">{attendancePeriodDays} hari terakhir</p>
                </div>

                <div className="p-3.5 bg-card border border-border-subtle rounded-xl shadow-xs">
                  <p className="text-[11px] text-text-muted font-semibold">Tingkat Kepatuhan</p>
                  <p className={`text-xl font-bold font-mono mt-1 ${
                    attendanceData.summary.compliancePercent >= 90
                      ? 'text-emerald-500'
                      : attendanceData.summary.compliancePercent >= 75
                      ? 'text-amber-500'
                      : 'text-rose-500'
                  }`}>
                    {attendanceData.summary.compliancePercent}%
                  </p>
                  <p className="text-[10px] text-emerald-500 font-semibold mt-0.5">
                    {attendanceData.summary.onTimeCount} tepat waktu
                  </p>
                </div>

                <div className="p-3.5 bg-card border border-border-subtle rounded-xl shadow-xs">
                  <p className="text-[11px] text-text-muted font-semibold">Total Keterlambatan</p>
                  <p className="text-xl font-bold font-mono text-amber-500 mt-1">
                    {attendanceData.summary.lateCount} <span className="text-xs font-normal text-text-muted">kali</span>
                  </p>
                  <p className="text-[10px] text-amber-500 font-semibold mt-0.5">
                    Akumulasi: {attendanceData.summary.totalLateMinutes} menit
                  </p>
                </div>

                <div className="p-3.5 bg-card border border-border-subtle rounded-xl shadow-xs">
                  <p className="text-[11px] text-text-muted font-semibold">Tutup Sebelum Shift</p>
                  <p className="text-xl font-bold font-mono text-orange-500 mt-1">
                    {attendanceData.summary.earlyLeaveCount} <span className="text-xs font-normal text-text-muted">kali</span>
                  </p>
                  <p className="text-[10px] text-orange-500 font-semibold mt-0.5">
                    Akumulasi: {attendanceData.summary.totalEarlyLeaveMinutes} menit
                  </p>
                </div>

                <div className="p-3.5 bg-card border border-border-subtle rounded-xl shadow-xs">
                  <p className="text-[11px] text-text-muted font-semibold">Lembur / Overtime</p>
                  <p className="text-xl font-bold font-mono text-purple-500 mt-1">
                    {attendanceData.summary.overtimeCount} <span className="text-xs font-normal text-text-muted">shift</span>
                  </p>
                  <p className="text-[10px] text-purple-500 font-semibold mt-0.5">
                    Total: {attendanceData.summary.totalOvertimeHours} jam ({attendanceData.summary.totalOvertimeMinutes} mnt)
                  </p>
                </div>
              </div>
            )}

            {/* Attendance History Table */}
            <div className="bg-card border border-border-subtle rounded-xl overflow-hidden shadow-sm">
              <table className="w-full text-left text-xs">
                <thead className="bg-subtle text-text-muted font-bold border-b border-border-subtle uppercase tracking-wider text-[10px]">
                  <tr>
                    <th className="p-3">Waktu Buka / Tutup</th>
                    <th className="p-3">Kasir / Karyawan</th>
                    <th className="p-3">Template Shift</th>
                    <th className="p-3">Status Kedisiplinan</th>
                    <th className="p-3">Durasi Real</th>
                    <th className="p-3">Total Omzet Kasir</th>
                    <th className="p-3">Selisih Kas Laci</th>
                    <th className="p-3">Catatan</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border-subtle">
                  {filteredAttendanceRecords.map((rec) => {
                    const startDate = new Date(rec.startTime);
                    const endDate = rec.endTime ? new Date(rec.endTime) : null;

                    return (
                      <tr key={rec.id} className="hover:bg-subtle/50 transition-colors">
                        <td className="p-3 text-text-primary font-mono text-[11px]">
                          <div>
                            <span className="font-bold">{startDate.toLocaleDateString('id-ID', { day: '2-digit', month: 'short' })}</span>{' '}
                            <span>{startDate.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}</span>
                          </div>
                          {endDate ? (
                            <div className="text-text-muted text-[10px]">
                              s/d {endDate.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                            </div>
                          ) : (
                            <span className="text-emerald-500 font-bold text-[10px]">● Sedang Berjalan</span>
                          )}
                        </td>

                        <td className="p-3 font-bold text-text-primary">
                          <div className="flex items-center gap-2">
                            <div className="w-6 h-6 rounded-full bg-primary/10 text-primary font-bold flex items-center justify-center text-[10px]">
                              {rec.cashierName.charAt(0).toUpperCase()}
                            </div>
                            <span>{rec.cashierName}</span>
                          </div>
                        </td>

                        <td className="p-3">
                          {rec.shiftTemplateName ? (
                            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold bg-primary/10 text-primary border border-primary/20">
                              {rec.shiftTemplateName}
                            </span>
                          ) : (
                            <span className="text-text-muted text-[11px]">- Non-Template -</span>
                          )}
                        </td>

                        <td className="p-3">
                          {rec.attendanceStatus === 'OnTime' && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
                              <Check className="w-3 h-3" />
                              Tepat Waktu
                            </span>
                          )}

                          {rec.attendanceStatus === 'Late' && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/30">
                              <AlertTriangle className="w-3 h-3" />
                              Telat +{rec.lateMinutes} mnt
                            </span>
                          )}

                          {rec.attendanceStatus === 'EarlyLeave' && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-orange-500/10 text-orange-600 dark:text-orange-400 border border-orange-500/30">
                              <LogOut className="w-3 h-3" />
                              Pulang Awal -{rec.earlyLeaveMinutes} mnt
                            </span>
                          )}

                          {rec.attendanceStatus === 'Overtime' && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/30">
                              <Activity className="w-3 h-3" />
                              Lembur +{rec.overtimeMinutes} mnt
                            </span>
                          )}

                          {rec.attendanceStatus === 'OpenRunning' && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 animate-pulse">
                              Shift Berjalan
                            </span>
                          )}
                        </td>

                        <td className="p-3 font-mono text-text-secondary text-[11px]">
                          {rec.durationHours > 0 ? `${rec.durationHours} jam ` : ''}{rec.durationMinutes % 60} mnt
                        </td>

                        <td className="p-3 font-mono font-bold text-text-primary text-[11px]">
                          Rp {(rec.totalCashSales + rec.totalNonCashSales).toLocaleString('id-ID')}
                        </td>

                        <td className="p-3 font-mono text-[11px]">
                          {rec.cashDiscrepancy !== undefined && rec.cashDiscrepancy !== null ? (
                            rec.cashDiscrepancy === 0 ? (
                              <span className="text-emerald-500 font-bold">Pas (Rp 0)</span>
                            ) : rec.cashDiscrepancy > 0 ? (
                              <span className="text-emerald-600 font-bold">+Rp {rec.cashDiscrepancy.toLocaleString('id-ID')}</span>
                            ) : (
                              <span className="text-rose-600 font-bold">-Rp {Math.abs(rec.cashDiscrepancy).toLocaleString('id-ID')}</span>
                            )
                          ) : (
                            <span className="text-text-muted">-</span>
                          )}
                        </td>

                        <td className="p-3 text-text-muted text-[11px] max-w-xs truncate">
                          {rec.closingNotes || '-'}
                        </td>
                      </tr>
                    );
                  })}

                  {filteredAttendanceRecords.length === 0 && !isAttendanceLoading && (
                    <tr>
                      <td colSpan={8} className="p-8 text-center text-text-muted">
                        Belum ada riwayat presensi shift pada filter periode ini.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ============================================================= */}
        {/* TAB 4: GRANULAR RBAC PERMISSIONS */}
        {/* ============================================================= */}
        {activeTab === 'permissions' && (
          <div className="space-y-6">
            {/* User Selector & Profile Card */}
            <div className="p-4 bg-card border border-border-subtle rounded-xl shadow-xs space-y-4">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-border-subtle pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-500 flex items-center justify-center font-bold">
                    <Shield className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="font-bold text-sm text-text-primary">Matriks Otorisasi Hak Akses Fitur Kasir (RBAC)</h3>
                    <p className="text-[11px] text-text-muted">Atur izin khusus per individu: diskon manual, void belanja, buka laci kasir, otorisasi kasbon, dan laporan</p>
                  </div>
                </div>

                {/* Employee Selector Dropdown */}
                <div className="flex items-center gap-2">
                  <label className="text-xs font-semibold text-text-secondary whitespace-nowrap">Pilih Karyawan:</label>
                  <select
                    value={selectedPermUserId}
                    onChange={(e) => setSelectedPermUserId(e.target.value)}
                    className="px-3 py-1.5 bg-subtle border border-border-subtle rounded-lg text-xs font-bold text-text-primary focus:outline-none focus:border-primary"
                  >
                    {users.map(u => (
                      <option key={u.id} value={u.id}>
                        {u.fullName} ({u.role})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Quick Role Presets */}
              <div className="flex flex-wrap items-center justify-between gap-2 p-3 bg-subtle/50 rounded-xl border border-border-subtle text-xs">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-semibold text-text-secondary text-[11px]">Terapkan Preset Standar:</span>
                  <button
                    type="button"
                    onClick={() => handleApplyRolePreset('Cashier')}
                    className="px-2.5 py-1 rounded-md bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 font-semibold text-[11px] hover:bg-emerald-500/20"
                  >
                    Kasir Standar
                  </button>
                  <button
                    type="button"
                    onClick={() => handleApplyRolePreset('Manager')}
                    className="px-2.5 py-1 rounded-md bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20 font-semibold text-[11px] hover:bg-purple-500/20"
                  >
                    Manajer Operasional
                  </button>
                  <button
                    type="button"
                    onClick={() => handleApplyRolePreset('InventoryStaff')}
                    className="px-2.5 py-1 rounded-md bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20 font-semibold text-[11px] hover:bg-blue-500/20"
                  >
                    Staf Gudang
                  </button>
                  <button
                    type="button"
                    onClick={() => handleApplyRolePreset('SuperAdmin')}
                    className="px-2.5 py-1 rounded-md bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 font-semibold text-[11px] hover:bg-amber-500/20"
                  >
                    Full Akses (Owner)
                  </button>
                </div>

                <div className="text-[11px] text-text-muted">
                  Mengatur izin untuk: <strong className="text-text-primary">{selectedPermUserObj?.fullName}</strong> ({selectedPermUserObj?.role})
                </div>
              </div>

              {/* Grid of 9 Granular Permissions */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 pt-2">
                {/* 1. canApplyManualDiscount */}
                <div
                  onClick={() => handleTogglePermission('canApplyManualDiscount')}
                  className={`p-3.5 rounded-xl border transition-all cursor-pointer flex items-start justify-between gap-3 ${
                    userPermission.canApplyManualDiscount
                      ? 'bg-primary/5 border-primary shadow-2xs'
                      : 'bg-card border-border-subtle hover:bg-card-hover'
                  }`}
                >
                  <div className="space-y-1">
                    <span className="font-bold text-xs text-text-primary flex items-center gap-1.5">
                      <Percent className="w-3.5 h-3.5 text-primary" />
                      Diskon Manual POS
                    </span>
                    <p className="text-[11px] text-text-muted leading-relaxed">
                      Beri potongan harga manual langsung pada keranjang kasir
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    checked={userPermission.canApplyManualDiscount}
                    onChange={() => {}}
                    className="w-4 h-4 text-primary rounded mt-0.5 cursor-pointer pointer-events-none"
                  />
                </div>

                {/* 2. canVoidOrderItem */}
                <div
                  onClick={() => handleTogglePermission('canVoidOrderItem')}
                  className={`p-3.5 rounded-xl border transition-all cursor-pointer flex items-start justify-between gap-3 ${
                    userPermission.canVoidOrderItem
                      ? 'bg-primary/5 border-primary shadow-2xs'
                      : 'bg-card border-border-subtle hover:bg-card-hover'
                  }`}
                >
                  <div className="space-y-1">
                    <span className="font-bold text-xs text-text-primary flex items-center gap-1.5">
                      <Trash2 className="w-3.5 h-3.5 text-rose-500" />
                      Void / Hapus Item Belanja
                    </span>
                    <p className="text-[11px] text-text-muted leading-relaxed">
                      Membatalkan / menghapus produk dari transaksi yang sedang aktif
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    checked={userPermission.canVoidOrderItem}
                    onChange={() => {}}
                    className="w-4 h-4 text-primary rounded mt-0.5 cursor-pointer pointer-events-none"
                  />
                </div>

                {/* 3. canAccessReports */}
                <div
                  onClick={() => handleTogglePermission('canAccessReports')}
                  className={`p-3.5 rounded-xl border transition-all cursor-pointer flex items-start justify-between gap-3 ${
                    userPermission.canAccessReports
                      ? 'bg-primary/5 border-primary shadow-2xs'
                      : 'bg-card border-border-subtle hover:bg-card-hover'
                  }`}
                >
                  <div className="space-y-1">
                    <span className="font-bold text-xs text-text-primary flex items-center gap-1.5">
                      <BarChart3 className="w-3.5 h-3.5 text-purple-500" />
                      Akses Laporan & Keuangan
                    </span>
                    <p className="text-[11px] text-text-muted leading-relaxed">
                      Melihat ringkasan omzet, laba kotor margin, dan riwayat shift
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    checked={userPermission.canAccessReports}
                    onChange={() => {}}
                    className="w-4 h-4 text-primary rounded mt-0.5 cursor-pointer pointer-events-none"
                  />
                </div>

                {/* 4. canEditProductPrice */}
                <div
                  onClick={() => handleTogglePermission('canEditProductPrice')}
                  className={`p-3.5 rounded-xl border transition-all cursor-pointer flex items-start justify-between gap-3 ${
                    userPermission.canEditProductPrice
                      ? 'bg-primary/5 border-primary shadow-2xs'
                      : 'bg-card border-border-subtle hover:bg-card-hover'
                  }`}
                >
                  <div className="space-y-1">
                    <span className="font-bold text-xs text-text-primary flex items-center gap-1.5">
                      <DollarSign className="w-3.5 h-3.5 text-emerald-500" />
                      Ubah Harga Master Produk
                    </span>
                    <p className="text-[11px] text-text-muted leading-relaxed">
                      Mengubah harga modal beli dan harga jual di menu inventori
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    checked={userPermission.canEditProductPrice}
                    onChange={() => {}}
                    className="w-4 h-4 text-primary rounded mt-0.5 cursor-pointer pointer-events-none"
                  />
                </div>

                {/* 5. canOpenCashDrawerDirectly */}
                <div
                  onClick={() => handleTogglePermission('canOpenCashDrawerDirectly')}
                  className={`p-3.5 rounded-xl border transition-all cursor-pointer flex items-start justify-between gap-3 ${
                    userPermission.canOpenCashDrawerDirectly
                      ? 'bg-primary/5 border-primary shadow-2xs'
                      : 'bg-card border-border-subtle hover:bg-card-hover'
                  }`}
                >
                  <div className="space-y-1">
                    <span className="font-bold text-xs text-text-primary flex items-center gap-1.5">
                      <KeyRound className="w-3.5 h-3.5 text-amber-500" />
                      Buka Laci Kasir Manual
                    </span>
                    <p className="text-[11px] text-text-muted leading-relaxed">
                      Membuka laci kasir fisik langsung tanpa transaksi penjualan
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    checked={userPermission.canOpenCashDrawerDirectly}
                    onChange={() => {}}
                    className="w-4 h-4 text-primary rounded mt-0.5 cursor-pointer pointer-events-none"
                  />
                </div>

                {/* 6. canAuthorizeCustomerDebt */}
                <div
                  onClick={() => handleTogglePermission('canAuthorizeCustomerDebt')}
                  className={`p-3.5 rounded-xl border transition-all cursor-pointer flex items-start justify-between gap-3 ${
                    userPermission.canAuthorizeCustomerDebt
                      ? 'bg-primary/5 border-primary shadow-2xs'
                      : 'bg-card border-border-subtle hover:bg-card-hover'
                  }`}
                >
                  <div className="space-y-1">
                    <span className="font-bold text-xs text-text-primary flex items-center gap-1.5">
                      <CreditCard className="w-3.5 h-3.5 text-blue-500" />
                      Otorisasi Kasbon Pelanggan
                    </span>
                    <p className="text-[11px] text-text-muted leading-relaxed">
                      Menyetujui penjualan dengan metode pembayaran kasbon / piutang
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    checked={userPermission.canAuthorizeCustomerDebt}
                    onChange={() => {}}
                    className="w-4 h-4 text-primary rounded mt-0.5 cursor-pointer pointer-events-none"
                  />
                </div>

                {/* 7. canModifyInventory */}
                <div
                  onClick={() => handleTogglePermission('canModifyInventory')}
                  className={`p-3.5 rounded-xl border transition-all cursor-pointer flex items-start justify-between gap-3 ${
                    userPermission.canModifyInventory
                      ? 'bg-primary/5 border-primary shadow-2xs'
                      : 'bg-card border-border-subtle hover:bg-card-hover'
                  }`}
                >
                  <div className="space-y-1">
                    <span className="font-bold text-xs text-text-primary flex items-center gap-1.5">
                      <Package className="w-3.5 h-3.5 text-cyan-500" />
                      Ubah Stok & Opname Manual
                    </span>
                    <p className="text-[11px] text-text-muted leading-relaxed">
                      Melakukan penyesuaian stok manual dan stok opname gudang
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    checked={userPermission.canModifyInventory}
                    onChange={() => {}}
                    className="w-4 h-4 text-primary rounded mt-0.5 cursor-pointer pointer-events-none"
                  />
                </div>

                {/* 8. canManagePromotions */}
                <div
                  onClick={() => handleTogglePermission('canManagePromotions')}
                  className={`p-3.5 rounded-xl border transition-all cursor-pointer flex items-start justify-between gap-3 ${
                    userPermission.canManagePromotions
                      ? 'bg-primary/5 border-primary shadow-2xs'
                      : 'bg-card border-border-subtle hover:bg-card-hover'
                  }`}
                >
                  <div className="space-y-1">
                    <span className="font-bold text-xs text-text-primary flex items-center gap-1.5">
                      <Gift className="w-3.5 h-3.5 text-rose-500" />
                      Kelola Promo & Diskon Toko
                    </span>
                    <p className="text-[11px] text-text-muted leading-relaxed">
                      Membuat, mengedit, dan mengaktifkan aturan promosi otomatis
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    checked={userPermission.canManagePromotions}
                    onChange={() => {}}
                    className="w-4 h-4 text-primary rounded mt-0.5 cursor-pointer pointer-events-none"
                  />
                </div>

                {/* 9. canManageUsers */}
                <div
                  onClick={() => handleTogglePermission('canManageUsers')}
                  className={`p-3.5 rounded-xl border transition-all cursor-pointer flex items-start justify-between gap-3 ${
                    userPermission.canManageUsers
                      ? 'bg-primary/5 border-primary shadow-2xs'
                      : 'bg-card border-border-subtle hover:bg-card-hover'
                  }`}
                >
                  <div className="space-y-1">
                    <span className="font-bold text-xs text-text-primary flex items-center gap-1.5">
                      <UserCheck className="w-3.5 h-3.5 text-indigo-500" />
                      Kelola Karyawan & Akun
                    </span>
                    <p className="text-[11px] text-text-muted leading-relaxed">
                      Menambah user baru, mereset password, dan mengatur wewenang
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    checked={userPermission.canManageUsers}
                    onChange={() => {}}
                    className="w-4 h-4 text-primary rounded mt-0.5 cursor-pointer pointer-events-none"
                  />
                </div>
              </div>

              {/* Bottom Action Bar */}
              <div className="pt-3 border-t border-border-subtle flex items-center justify-between">
                <p className="text-[11px] text-text-muted">
                  Wewenang disimpan langsung ke database dan divalidasi pada setiap aksi kasir POS.
                </p>

                <button
                  type="button"
                  onClick={handleSavePermissions}
                  disabled={isPermSaving}
                  className="px-5 py-2 rounded-xl bg-primary text-primary-text font-bold text-xs shadow-md hover:bg-primary-hover transition-all flex items-center gap-2 disabled:opacity-50"
                >
                  <Save className="w-4 h-4" />
                  <span>{isPermSaving ? 'Menyimpan...' : 'Simpan Hak Akses Karyawan'}</span>
                </button>
              </div>
            </div>
          </div>
        )}

      </div>

      {/* ============================================================= */}
      {/* MODAL: TAMBAH KARYAWAN BARU */}
      {/* ============================================================= */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-card border border-border-strong rounded-2xl shadow-2xl overflow-hidden">
            <div className="p-4 bg-surface border-b border-border-subtle flex items-center justify-between">
              <h3 className="font-bold text-sm text-text-primary flex items-center gap-2">
                <Plus className="w-4 h-4 text-primary" />
                Tambah Akun Karyawan Baru
              </h3>
              <button 
                onClick={() => setIsAddModalOpen(false)}
                className="p-1.5 rounded-lg text-text-muted hover:text-text-primary hover:bg-subtle transition-colors"
                title="Tutup Modal"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateUser} className="p-5 space-y-4 text-xs">
              <div>
                <label className="block font-bold text-text-secondary mb-1">Nama Lengkap Karyawan *</label>
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Contoh: Siti Rahma"
                  className="w-full px-3 py-2 bg-subtle border border-border-subtle rounded-lg text-text-primary focus:outline-none focus:border-primary"
                />
              </div>

              <div>
                <label className="block font-bold text-text-secondary mb-1">Username Login *</label>
                <input
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="kasir2"
                  className="w-full px-3 py-2 bg-subtle border border-border-subtle rounded-lg text-text-primary focus:outline-none focus:border-primary font-mono lowercase"
                />
              </div>

              <div>
                <label className="block font-bold text-text-secondary mb-1">Peran & Hak Akses *</label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value as UserRole)}
                  className="w-full px-3 py-2 bg-subtle border border-border-subtle rounded-lg text-text-primary font-semibold"
                >
                  <option value="Cashier">Kasir (Kasir POS, Shift Kas, Kasbon)</option>
                  <option value="InventoryStaff">Staf Gudang (Inventori, Stok Masuk/Opname)</option>
                  <option value="Waiter">Pelayan / Pramusaji (Denah Meja & Pesanan)</option>
                  <option value="KitchenStaff">Koki / Dapur KDS (Monitor Pesanan Masuk)</option>
                  <option value="Technician">Teknisi / Barber (Status Layanan & Antrean)</option>
                  <option value="Manager">Manajer (Akses Operasional & Laporan)</option>
                  <option value="SuperAdmin">SuperAdmin / Owner (Akses Penuh)</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-text-secondary mb-1">Kata Sandi *</label>
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Min. 6 huruf"
                    className="w-full px-3 py-2 bg-subtle border border-border-subtle rounded-lg text-text-primary"
                  />
                </div>

                <div>
                  <label className="block font-bold text-text-secondary mb-1">PIN Kasir (6 Angka) *</label>
                  <input
                    type="password"
                    maxLength={6}
                    required
                    value={pinCode}
                    onChange={(e) => setPinCode(e.target.value.replace(/\D/g, ''))}
                    placeholder="111111"
                    className="w-full px-3 py-2 bg-subtle border border-border-subtle rounded-lg text-text-primary font-mono tracking-widest font-bold"
                  />
                </div>
              </div>

              <div className="pt-3 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 rounded-lg bg-subtle hover:bg-card-hover border border-border-subtle font-semibold text-text-secondary"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-primary text-primary-text font-bold shadow-md hover:bg-primary-hover"
                >
                  Simpan Akun Karyawan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================= */}
      {/* MODAL: EDIT KARYAWAN */}
      {/* ============================================================= */}
      {isEditModalOpen && selectedUser && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-card border border-border-strong rounded-2xl shadow-2xl overflow-hidden">
            <div className="p-4 bg-surface border-b border-border-subtle flex items-center justify-between">
              <h3 className="font-bold text-sm text-text-primary flex items-center gap-2">
                <Edit3 className="w-4 h-4 text-primary" />
                Edit Akun: @{selectedUser.username}
              </h3>
              <button 
                onClick={() => setIsEditModalOpen(false)}
                className="p-1.5 rounded-lg text-text-muted hover:text-text-primary hover:bg-subtle transition-colors"
                title="Tutup Modal"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleUpdateUser} className="p-5 space-y-4 text-xs">
              <div>
                <label className="block font-bold text-text-secondary mb-1">Nama Lengkap Karyawan</label>
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full px-3 py-2 bg-subtle border border-border-subtle rounded-lg text-text-primary"
                />
              </div>

              <div>
                <label className="block font-bold text-text-secondary mb-1">Peran & Hak Akses</label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value as UserRole)}
                  className="w-full px-3 py-2 bg-subtle border border-border-subtle rounded-lg text-text-primary font-semibold"
                >
                  <option value="Cashier">Kasir (Kasir POS, Shift Kas, Kasbon)</option>
                  <option value="InventoryStaff">Staf Gudang (Inventori, Stok Masuk/Opname)</option>
                  <option value="Waiter">Pelayan / Pramusaji (Denah Meja & Pesanan)</option>
                  <option value="KitchenStaff">Koki / Dapur KDS (Monitor Pesanan Masuk)</option>
                  <option value="Technician">Teknisi / Barber (Status Layanan & Antrean)</option>
                  <option value="Manager">Manajer (Akses Operasional & Laporan)</option>
                  <option value="SuperAdmin">SuperAdmin / Owner (Akses Penuh)</option>
                </select>
              </div>

              <div className="p-3 bg-subtle rounded-lg border border-border-subtle space-y-2">
                <p className="font-bold text-text-primary text-[11px]">Reset Sandi / PIN (Kosongkan jika tidak diubah):</p>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Sandi Baru"
                    className="w-full px-2.5 py-1.5 bg-card border border-border-subtle rounded-md text-text-primary"
                  />
                  <input
                    type="password"
                    maxLength={6}
                    value={pinCode}
                    onChange={(e) => setPinCode(e.target.value.replace(/\D/g, ''))}
                    placeholder="PIN Baru 6-digit"
                    className="w-full px-2.5 py-1.5 bg-card border border-border-subtle rounded-md text-text-primary font-mono tracking-widest"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="isActiveToggle"
                  checked={isActive}
                  onChange={(e) => setIsActive(e.target.checked)}
                  className="w-4 h-4 text-primary rounded"
                />
                <label htmlFor="isActiveToggle" className="font-semibold text-text-primary cursor-pointer">
                  Akun Aktif (Bisa Login & Buka Shift)
                </label>
              </div>

              <div className="pt-3 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="px-4 py-2 rounded-lg bg-subtle hover:bg-card-hover border border-border-subtle font-semibold text-text-secondary"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-primary text-primary-text font-bold shadow-md hover:bg-primary-hover"
                >
                  Simpan Perubahan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================= */}
      {/* MODAL: TAMBAH / EDIT TEMPLATE SHIFT */}
      {/* ============================================================= */}
      {isTemplateModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-card border border-border-strong rounded-2xl shadow-2xl overflow-hidden">
            <div className="p-4 bg-surface border-b border-border-subtle flex items-center justify-between">
              <h3 className="font-bold text-sm text-text-primary flex items-center gap-2">
                <Clock className="w-4 h-4 text-primary" />
                {editingTemplate ? `Edit Template: ${editingTemplate.name}` : 'Tambah Template Shift Baru'}
              </h3>
              <button 
                onClick={() => setIsTemplateModalOpen(false)}
                className="p-1.5 rounded-lg text-text-muted hover:text-text-primary hover:bg-subtle transition-colors"
                title="Tutup Modal"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveTemplate} className="p-5 space-y-4 text-xs">
              <div>
                <label className="block font-bold text-text-secondary mb-1">Nama Shift *</label>
                <input
                  type="text"
                  required
                  value={tplName}
                  onChange={(e) => setTplName(e.target.value)}
                  placeholder="Misal: Shift Pagi, Shift Siang, Full Day"
                  className="w-full px-3 py-2 bg-subtle border border-border-subtle rounded-lg text-text-primary focus:outline-none focus:border-primary"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-text-secondary mb-1">Jam Mulai (HH:mm) *</label>
                  <input
                    type="time"
                    required
                    value={tplStartTime}
                    onChange={(e) => setTplStartTime(e.target.value)}
                    className="w-full px-3 py-2 bg-subtle border border-border-subtle rounded-lg text-text-primary font-mono text-center font-bold"
                  />
                </div>

                <div>
                  <label className="block font-bold text-text-secondary mb-1">Jam Selesai (HH:mm) *</label>
                  <input
                    type="time"
                    required
                    value={tplEndTime}
                    onChange={(e) => setTplEndTime(e.target.value)}
                    className="w-full px-3 py-2 bg-subtle border border-border-subtle rounded-lg text-text-primary font-mono text-center font-bold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-text-secondary mb-1">Toleransi Telat (Menit)</label>
                  <input
                    type="number"
                    min="0"
                    max="120"
                    value={tplGracePeriod}
                    onChange={(e) => setTplGracePeriod(parseInt(e.target.value) || 0)}
                    className="w-full px-3 py-2 bg-subtle border border-border-subtle rounded-lg text-text-primary font-mono font-bold"
                  />
                </div>

                <div>
                  <label className="block font-bold text-text-secondary mb-1">Warna Tag Penanda</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={tplColorTag}
                      onChange={(e) => setTplColorTag(e.target.value)}
                      className="w-10 h-8 rounded border border-border-subtle cursor-pointer bg-transparent"
                    />
                    <span className="font-mono text-[11px] text-text-secondary">{tplColorTag}</span>
                  </div>
                </div>
              </div>

              <div>
                <label className="block font-bold text-text-secondary mb-1">Keterangan / Deskripsi (Opsional)</label>
                <input
                  type="text"
                  value={tplDescription}
                  onChange={(e) => setTplDescription(e.target.value)}
                  placeholder="Misal: Bertanggung jawab opening kasir & setoran awal"
                  className="w-full px-3 py-2 bg-subtle border border-border-subtle rounded-lg text-text-primary"
                />
              </div>

              <div className="pt-3 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsTemplateModalOpen(false)}
                  className="px-4 py-2 rounded-lg bg-subtle hover:bg-card-hover border border-border-subtle font-semibold text-text-secondary"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-primary text-primary-text font-bold shadow-md hover:bg-primary-hover"
                >
                  Simpan Template Shift
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

