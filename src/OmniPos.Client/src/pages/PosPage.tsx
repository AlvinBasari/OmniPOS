import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  Search,
  Barcode,
  Users,
  Percent,
  PauseCircle,
  Plus,
  Minus,
  Trash2,
  Zap,
  ArrowRight,
  Sparkles,
  Tag,
  CreditCard,
  Banknote,
  Receipt,
  RotateCcw,
  Gift,
  Printer,
  ShieldCheck,
  Smartphone,
  RefreshCw,
  Wrench,
  Radio,
  Clock,
  EyeOff,
  Eye,
  TrendingUp,
  Scale,
  ChefHat,
  Divide,
  UtensilsCrossed,
  Pill,
  FileText,
  Keyboard,
  ScanLine,
  Maximize2,
  Minimize2,
  LayoutGrid,
  CheckCircle2,
  X,
  Ticket,
  Star,
  MapPin
} from 'lucide-react';
import { useHardwareStore } from '../store/useHardwareStore';
import { Product, Category, PaymentMethod, ProductSerialNumber, SimCardSpecialNumber, DeviceServiceTicket, CartItemModifier } from '../types';
import { useCartStore, playScanBeep, playErrorBeep, playCashBeep } from '../store/useCartStore';
import { useShiftStore } from '../store/useShiftAndThemeStores';
import { useBusinessModeStore } from '../store/useBusinessModeStore';
import { useToastStore } from '../store/useToastStore';
import { CustomerKasbonModal, PendingOrdersModal, DiscountTransactionModal } from '../components/modals/RetailModals';
import { PaymentModal, PaymentSuccessModal } from '../components/modals/PaymentModals';
import { ImeiSelectModal } from '../components/modals/ImeiSelectModal';
import { SimCardSelectModal } from '../components/modals/SimCardSelectModal';
import { TradeInModal, TradeInData } from '../components/modals/TradeInModal';
import { ServicePickupModal } from '../components/modals/ServicePickupModal';
import { MenuModifierModal } from '../components/modals/MenuModifierModal';
import { SplitBillModal } from '../components/modals/SplitBillModal';
import { GuestCheckModal, GuestCheckData } from '../components/modals/GuestCheckModal';
import { EtiketObatModal, EtiketData } from '../components/modals/EtiketObatModal';
import { ShortcutGuideModal } from '../components/modals/ShortcutGuideModal';
import { ScannerHardwareModal } from '../components/modals/ScannerHardwareModal';

export const PosPage: React.FC = () => {
  const {
    items,
    selectedCustomer,
    selectedTable,
    discountAmount,
    discountReason,
    appliedCoupon,
    redeemedPoints,
    redeemedPointsDiscountAmount,
    tradeIn,
    parkedOrders,
    loadPromotionRules,
    addItem,
    addServiceTicketSettlement,
    updateQty,
    removeItem,
    incrementLatestItem,
    decrementLatestItem,
    removeLatestItem,
    clearCart,
    parkCurrentOrder,
    setDiscount,
    setTradeIn,
    setLastCompletedOrder,
    lastCompletedOrder,
    handleScanBarcode,
    getSubtotal,
    getTaxAmount,
    getServiceChargeAmount,
    getTradeInAmount,
    getTotalAmount,
    getWholesaleSavings,
    getTotalItemCount,
    getQuickCashSuggestions
  } = useCartStore();

  const { activeShift } = useShiftStore();
  const { mode, edition } = useBusinessModeStore();
  const { 
    isMobileScannerEnabled, 
    detectedScannerType, 
    setDetectedScannerType, 
    setIsScannerHardwareModalOpen 
  } = useHardwareStore();

  // Local States
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [barcodeInput, setBarcodeInput] = useState('');
  
  const [hideOutOfStock, setHideOutOfStock] = useState(false);
  const [showMargin, setShowMargin] = useState(false);

  // Modals state
  const [isPaymentOpen, setIsPaymentOpen] = useState(false);
  const [isSuccessOpen, setIsSuccessOpen] = useState(false);
  const [completedOrder, setCompletedOrder] = useState<any>(null);
  const [isCustomerModalOpen, setIsCustomerModalOpen] = useState(false);
  const [isPendingModalOpen, setIsPendingModalOpen] = useState(false);
  const [isDiscountModalOpen, setIsDiscountModalOpen] = useState(false);
  const [isTradeInModalOpen, setIsTradeInModalOpen] = useState(false);
  const [isServicePickupOpen, setIsServicePickupOpen] = useState(false);
  const [isImeiModalOpen, setIsImeiModalOpen] = useState(false);
  const [selectedImeiProduct, setSelectedImeiProduct] = useState<Product | null>(null);
  const [isSimCardModalOpen, setIsSimCardModalOpen] = useState(false);
  const [selectedSimProduct, setSelectedSimProduct] = useState<Product | null>(null);

  // F&B Modals State
  const [isModifierModalOpen, setIsModifierModalOpen] = useState(false);
  const [selectedModifierProduct, setSelectedModifierProduct] = useState<Product | null>(null);
  const [isSplitBillModalOpen, setIsSplitBillModalOpen] = useState(false);
  const [isGuestCheckOpen, setIsGuestCheckOpen] = useState(false);
  const [guestCheckData, setGuestCheckData] = useState<GuestCheckData | null>(null);

  const [barcodeInputRef, searchInputRef] = [useRef<HTMLInputElement>(null), useRef<HTMLInputElement>(null)];

  // Focus Mode States (Mode Fokus Kasir / Fullscreen Barcode Scan)
  const [isFocusMode, setIsFocusMode] = useState<boolean>(() => {
    return localStorage.getItem('omnipos_pos_focus_mode') === 'true';
  });
  const [autoFocusOnScan, setAutoFocusOnScan] = useState<boolean>(() => {
    return localStorage.getItem('omnipos_auto_focus_on_scan') !== 'false';
  });
  const [lastScannedItem, setLastScannedItem] = useState<{
    name: string;
    price: number;
    quantity: number;
    barcode: string;
    unit?: string;
    timestamp: number;
  } | null>(null);
  const [isQuickSearchOpen, setIsQuickSearchOpen] = useState(false);
  const [focusSearchQuery, setFocusSearchQuery] = useState('');
  const [focusSelectedResultIndex, setFocusSelectedResultIndex] = useState(0);
  const focusBarcodeInputRef = useRef<HTMLInputElement>(null);
  const focusQuickSearchInputRef = useRef<HTMLInputElement>(null);

  const focusFilteredProducts = useMemo(() => {
    if (!focusSearchQuery.trim()) return [];
    const q = focusSearchQuery.toLowerCase().trim();
    return products.filter(p =>
      p.name.toLowerCase().includes(q) ||
      p.sku.toLowerCase().includes(q) ||
      (p.barcode && p.barcode.toLowerCase().includes(q))
    ).slice(0, 10);
  }, [products, focusSearchQuery]);

  const toggleFocusMode = () => {
    setIsFocusMode(prev => {
      const next = !prev;
      localStorage.setItem('omnipos_pos_focus_mode', next ? 'true' : 'false');
      useToastStore.getState().showToast(
        next 
          ? 'Mode Fokus Kasir Aktif! Layar dimaksimalkan untuk scan barcode.' 
          : 'Mode Normal Aktif. Menampilkan katalog produk manual.',
        'info'
      );
      setTimeout(() => {
        if (next) {
          focusBarcodeInputRef.current?.focus();
        } else {
          barcodeInputRef.current?.focus();
        }
      }, 60);
      return next;
    });
  };

  // Keyboard shortcut tactile visual feedback & help modal
  const [isShortcutGuideOpen, setIsShortcutGuideOpen] = useState(false);
  const [activeShortcutKey, setActiveShortcutKey] = useState<string | null>(null);
  const shortcutTimerRef = useRef<any>(null);

  // Barcode Scanner Hardware Speed Detection (< 45ms per character indicates hardware gun)
  const lastKeyTimeRef = useRef<number>(0);
  const consecutiveFastKeysRef = useRef<number>(0);

  const triggerActiveShortcut = (key: string) => {
    if (shortcutTimerRef.current) clearTimeout(shortcutTimerRef.current);
    setActiveShortcutKey(key);
    shortcutTimerRef.current = setTimeout(() => setActiveShortcutKey(null), 300);
  };

  // Cart item targeted selection for ArrowUp/Down and [+] / [-] / [Del]
  const [selectedCartIndex, setSelectedCartIndex] = useState<number | null>(null);

  useEffect(() => {
    if (items.length > 0) {
      setSelectedCartIndex(items.length - 1);
    } else {
      setSelectedCartIndex(null);
    }
  }, [items.length]);

  const targetCartIndex = (selectedCartIndex !== null && selectedCartIndex >= 0 && selectedCartIndex < items.length)
    ? selectedCartIndex
    : items.length - 1;

  const incrementSelectedItem = () => {
    if (items.length === 0 || targetCartIndex < 0) return;
    updateQty(targetCartIndex, items[targetCartIndex].quantity + 1);
    playScanBeep();
  };

  const decrementSelectedItem = () => {
    if (items.length === 0 || targetCartIndex < 0) return;
    if (items[targetCartIndex].quantity > 1) {
      updateQty(targetCartIndex, items[targetCartIndex].quantity - 1);
      playScanBeep();
    } else {
      removeItem(targetCartIndex);
      playErrorBeep();
      if (selectedCartIndex !== null && selectedCartIndex >= items.length - 1) {
        setSelectedCartIndex(Math.max(0, items.length - 2));
      }
    }
  };

  const removeSelectedItem = () => {
    if (items.length === 0 || targetCartIndex < 0) return;
    removeItem(targetCartIndex);
    playErrorBeep();
    if (selectedCartIndex !== null && selectedCartIndex >= items.length - 1) {
      setSelectedCartIndex(Math.max(0, items.length - 2));
    }
  };

  // Visual scan flash feedback
  const [isScanFlashing, setIsScanFlashing] = useState(false);
  const flashTimeoutRef = useRef<any>(null);

  // Pharmacy Etiket Modal
  const [isPharmacyEtiketOpen, setIsPharmacyEtiketOpen] = useState(false);
  const [pharmacyEtiketData, setPharmacyEtiketData] = useState<Partial<EtiketData> | undefined>(undefined);

  const handleOpenItemEtiket = (item: any) => {
    const isObatLuar = item.name.toLowerCase().includes('betadine') || 
                       item.name.toLowerCase().includes('salep') || 
                       item.name.toLowerCase().includes('cair') ||
                       item.name.toLowerCase().includes('tetes');
    setPharmacyEtiketData({
      patientName: selectedCustomer?.name || 'Pasien Umum',
      medicineName: item.name,
      quantityStr: `${item.quantity} ${item.unit || 'PCS'}`,
      signa: isObatLuar ? 'Oleskan 2x Sehari pada Area Luka' : '3 x 1 Tablet Sehari',
      consumptionTime: isObatLuar ? 'Pagi dan Malam' : 'Sesudah Makan',
      period: 'Pagi, Siang, Malam',
      type: isObatLuar ? 'biru' : 'putih'
    });
    setIsPharmacyEtiketOpen(true);
  };

  const triggerScanFlash = () => {
    if (flashTimeoutRef.current) clearTimeout(flashTimeoutRef.current);
    setIsScanFlashing(true);
    flashTimeoutRef.current = setTimeout(() => setIsScanFlashing(false), 500);
  };

  const handleProductCardClick = (product: Product) => {
    const pName = product.name.toLowerCase();
    const pUnit = (product.unit || '').toUpperCase();
    if (pUnit === 'KG' || pUnit === 'GRAM' || pUnit === 'KILO' || pUnit === 'GR') {
      useHardwareStore.getState().openManualScale(product);
    } else if (mode === 'FoodAndBeverage') {
      if (product.modifierGroups && product.modifierGroups.length > 0) {
        setSelectedModifierProduct(product);
        setIsModifierModalOpen(true);
      } else {
        addItem(product);
        triggerScanFlash();
      }
    } else if (mode === 'Electronics' && (pName.includes('nomor cantik') || pName.includes('perdana') || pName.includes('sim-nc') || pName.includes('kartu perdana'))) {
      setSelectedSimProduct(product);
      setIsSimCardModalOpen(true);
    } else if (mode === 'Electronics' && (pName.includes('imei') || pName.includes('serial') || pName.includes('galaxy') || pName.includes('iphone') || pName.includes('laptop') || pName.includes('macbook'))) {
      setSelectedImeiProduct(product);
      setIsImeiModalOpen(true);
    } else {
      addItem(product);
      triggerScanFlash();
    }
  };

  const handleConfirmModifiers = (prod: Product, modifiers: CartItemModifier[], notes: string) => {
    addItem(prod, undefined, modifiers, 1);
    if (notes) {
      const cartItems = useCartStore.getState().items;
      if (cartItems.length > 0) {
        cartItems[cartItems.length - 1].notes = notes;
      }
    }
    useToastStore.getState().showToast(`Menu ${prod.name} ditambahkan ke pesanan!`, 'success');
  };

  const handleSendToKitchen = async () => {
    if (items.length === 0) {
      useToastStore.getState().showToast('Keranjang masih kosong.', 'warning');
      return;
    }
    try {
      const res = await fetch('/api/v1/sales/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cashierUserId: activeShift?.cashierName || 'Kasir Resto',
          businessMode: 1, // FoodAndBeverage
          diningTableId: selectedTable?.id,
          items: items.map(i => ({
            productId: i.productId,
            quantity: i.quantity,
            unitPrice: i.unitPrice,
            discountAmount: i.discountAmount || 0,
            notes: i.notes,
            modifierOptionIds: i.modifiers?.map(m => m.modifierOptionId || m.id || '') || []
          })),
          payments: [
            { method: 0, amount: getTotalAmount() }
          ],
          discountAmount: discountAmount
        })
      });

      if (res.ok) {
        playCashBeep();
        useToastStore.getState().showToast(`Pesanan Meja ${selectedTable?.tableNumber || 'Takeaway'} terkirim ke dapur (KDS)!`, 'success');
        clearCart();
      } else {
        useToastStore.getState().showToast('Gagal mengirim pesanan ke dapur.', 'error');
      }
    } catch {
      useToastStore.getState().showToast('Gagal menghubungi server.', 'error');
    }
  };

  const handleOpenCartGuestCheck = () => {
    if (items.length === 0) {
      useToastStore.getState().showToast('Keranjang pesanan masih kosong.', 'warning');
      return;
    }
    setGuestCheckData({
      tableNumber: selectedTable?.tableNumber || 'TAKE AWAY',
      areaName: 'Resto & Kafe',
      orderNumber: `CHK-${selectedTable?.tableNumber || 'DINE-IN'}`,
      items: items.map(i => ({
        name: i.name,
        quantity: i.quantity,
        unitPrice: i.unitPrice,
        totalPrice: i.totalPrice,
        notes: i.notes,
        modifiers: i.modifiers?.map(m => ({ name: m.modifierName || m.name || '', price: m.price }))
      })),
      subtotal: getSubtotal(),
      taxAmount: getTaxAmount(),
      serviceChargeAmount: getServiceChargeAmount(),
      totalAmount: getTotalAmount()
    });
    setIsGuestCheckOpen(true);
  };

  const handleSelectImeiUnit = (serial: ProductSerialNumber) => {
    if (selectedImeiProduct) {
      addItem(selectedImeiProduct, undefined, [], 1, serial.serialNo);
      triggerScanFlash();
      setIsImeiModalOpen(false);
      setSelectedImeiProduct(null);
      useToastStore.getState().showToast(`IMEI ${serial.serialNo} berhasil ditambahkan ke keranjang!`, 'success');
    }
  };

  const handleSelectSimCard = (sim: SimCardSpecialNumber) => {
    if (selectedSimProduct) {
      const customPrice = sim.sellPrice > 0 ? sim.sellPrice : selectedSimProduct.sellPrice;
      const customProduct = { ...selectedSimProduct, sellPrice: customPrice };
      addItem(customProduct, undefined, [], 1, sim.msisdn);
      triggerScanFlash();
      setIsSimCardModalOpen(false);
      setSelectedSimProduct(null);
      useToastStore.getState().showToast(`Nomor Cantik ${sim.msisdn} (${sim.provider}) ditambahkan ke keranjang!`, 'success');
    }
  };

  // Fetch catalog & active promotion rules
  useEffect(() => {
    fetchProducts();
    fetchCategories();
    loadPromotionRules();
  }, [mode]);

  const fetchProducts = async () => {
    try {
      const res = await fetch(`/api/v1/products?mode=${mode}`);
      if (res.ok) {
        const data: Product[] = await res.json();
        setProducts(data);
      }
    } catch {}
  };

  const fetchCategories = async () => {
    try {
      const res = await fetch(`/api/v1/categories?mode=${mode}`);
      if (res.ok) {
        const data: Category[] = await res.json();
        setCategories(data);
      }
    } catch {}
  };

  // Global Retail POS Hotkey Listeners
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const isTyping = (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') && 
        target !== barcodeInputRef.current && target !== focusBarcodeInputRef.current;

      if (e.key === 'F1') {
        e.preventDefault();
        triggerActiveShortcut('F1');
        if (isFocusMode) {
          focusBarcodeInputRef.current?.focus();
          focusBarcodeInputRef.current?.select();
        } else {
          barcodeInputRef.current?.focus();
          barcodeInputRef.current?.select();
        }
      } else if (e.key === 'F2') {
        e.preventDefault();
        triggerActiveShortcut('F2');
        if (isFocusMode) {
          setIsQuickSearchOpen(true);
          setTimeout(() => {
            focusQuickSearchInputRef.current?.focus();
            focusQuickSearchInputRef.current?.select();
          }, 50);
        } else {
          searchInputRef.current?.focus();
          searchInputRef.current?.select();
        }
      } else if (e.key === 'F3') {
        e.preventDefault();
        triggerActiveShortcut('F3');
        setIsCustomerModalOpen(true);
      } else if (e.key === 'F4') {
        e.preventDefault();
        triggerActiveShortcut('F4');
        setIsDiscountModalOpen(true);
      } else if (e.key === 'F5') {
        e.preventDefault();
        triggerActiveShortcut('F5');
        if (mode === 'Electronics') {
          setIsTradeInModalOpen(true);
        } else if (mode === 'Retail') {
          useHardwareStore.getState().openManualScale({
            id: 'generic-scale-item',
            name: 'Item Timbangan Manual',
            sku: 'SCALE-MANUAL',
            sellPrice: 0,
            currentStock: 999,
            unit: 'KG',
            categoryId: '',
            businessMode: 0,
            buyPrice: 0,
            trackStock: false,
            hasVariants: false,
            isKitchenItem: false,
            minStockAlert: 0
          } as any);
        } else if (mode === 'FoodAndBeverage') {
          if (items.length > 0) {
            setIsSplitBillModalOpen(true);
          }
        } else if (mode === 'Pharmacy') {
          setPharmacyEtiketData({
            patientName: selectedCustomer?.name || '',
            doctorName: '',
            medicineName: items[items.length - 1]?.name || '',
            signa: '3 x 1 sehari',
            consumptionTime: 'Sesudah Makan',
            type: 'putih'
          });
          setIsPharmacyEtiketOpen(true);
        }
      } else if (e.key === 'F6') {
        e.preventDefault();
        triggerActiveShortcut('F6');
        if (items.length > 0) {
          parkCurrentOrder();
          useToastStore.getState().showToast('Transaksi aktif berhasil ditahan (Pending)!', 'info');
        } else {
          setIsPendingModalOpen(true);
        }
      } else if (e.key === 'F7') {
        e.preventDefault();
        triggerActiveShortcut('F7');
        if (mode === 'Electronics') {
          setIsServicePickupOpen(true);
        } else if (mode === 'FoodAndBeverage') {
          if (items.length > 0) {
            handleOpenCartGuestCheck();
          }
        } else {
          if (lastCompletedOrder) {
            handleReprintLastReceipt();
          } else {
            useToastStore.getState().showToast('Belum ada transaksi terakhir untuk dicetak ulang [F7]', 'info');
          }
        }
      } else if (e.key === 'F8') {
        e.preventDefault();
        triggerActiveShortcut('F8');
        if (mode === 'FoodAndBeverage') {
          if (items.length > 0) {
            handleSendToKitchen();
          }
        } else if (items.length > 0) {
          handleQuickExactCashCheckout();
        }
      } else if (e.key === 'F9') {
        e.preventDefault();
        triggerActiveShortcut('F9');
        if (items.length > 0) {
          setIsPaymentOpen(true);
        }
      } else if (e.key === 'F10' || (e.altKey && (e.key === 'f' || e.key === 'F'))) {
        e.preventDefault();
        triggerActiveShortcut('F10');
        toggleFocusMode();
      } else if (e.key === '?' || e.key === 'F11') {
        e.preventDefault();
        triggerActiveShortcut('?');
        setIsShortcutGuideOpen(true);
      } else if (e.key === 'Escape') {
        triggerActiveShortcut('ESC');
        if (isQuickSearchOpen) {
          setIsQuickSearchOpen(false);
          focusBarcodeInputRef.current?.focus();
        }
        else if (isShortcutGuideOpen) setIsShortcutGuideOpen(false);
        else if (isPaymentOpen) setIsPaymentOpen(false);
        else if (isSuccessOpen) setIsSuccessOpen(false);
        else if (isCustomerModalOpen) setIsCustomerModalOpen(false);
        else if (isPendingModalOpen) setIsPendingModalOpen(false);
        else if (isDiscountModalOpen) setIsDiscountModalOpen(false);
        else if (isTradeInModalOpen) setIsTradeInModalOpen(false);
        else if (isServicePickupOpen) setIsServicePickupOpen(false);
        else if (isPharmacyEtiketOpen) setIsPharmacyEtiketOpen(false);
        else if (isImeiModalOpen) setIsImeiModalOpen(false);
        else if (isSimCardModalOpen) setIsSimCardModalOpen(false);
        else if (searchQuery) setSearchQuery('');
        else if (items.length > 0) handleSafeClearCart();
      } else if (!isTyping) {
        if (e.key === 'ArrowDown') {
          e.preventDefault();
          if (items.length > 0) {
            setSelectedCartIndex(prev => (prev === null || prev >= items.length - 1 ? 0 : prev + 1));
          }
        } else if (e.key === 'ArrowUp') {
          e.preventDefault();
          if (items.length > 0) {
            setSelectedCartIndex(prev => (prev === null || prev <= 0 ? items.length - 1 : prev - 1));
          }
        } else if (e.key === '+' || e.key === '=') {
          e.preventDefault();
          triggerActiveShortcut('+');
          incrementSelectedItem();
        } else if (e.key === '-' || e.key === '_') {
          e.preventDefault();
          triggerActiveShortcut('-');
          decrementSelectedItem();
        } else if (e.key === 'Delete') {
          e.preventDefault();
          triggerActiveShortcut('Del');
          removeSelectedItem();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    items, 
    isPaymentOpen, 
    isSuccessOpen, 
    isCustomerModalOpen, 
    isPendingModalOpen, 
    isDiscountModalOpen, 
    isTradeInModalOpen, 
    isServicePickupOpen, 
    isPharmacyEtiketOpen,
    isShortcutGuideOpen,
    isImeiModalOpen, 
    isSimCardModalOpen, 
    searchQuery, 
    lastCompletedOrder, 
    selectedCustomer,
    selectedCartIndex,
    mode,
    isFocusMode,
    isQuickSearchOpen
  ]);

  // Real-time Mobile Android Scanner Listener
  const processedScanIdsRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    let isMounted = true;
    const pollMobileScans = async () => {
      try {
        const res = await fetch('/api/v1/hardware/mobile-scan/poll');
        if (res.ok && isMounted) {
          const data = await res.json();
          if (Array.isArray(data.scans)) {
            for (const scan of data.scans) {
              if (scan.id && !processedScanIdsRef.current.has(scan.id)) {
                processedScanIdsRef.current.add(scan.id);
                // Check if Mobile Scanner is enabled
                if (!useHardwareStore.getState().isMobileScannerEnabled) {
                  useToastStore.getState().showToast(
                    `Scan HP (${scan.barcode}) diabaikan: Saklar Scanner HP sedang NONAKTIF (OFF)`,
                    'info'
                  );
                  continue;
                }
                // Update detected hardware to HP
                useHardwareStore.getState().setDetectedScannerType('hp', scan.deviceName || 'Kamera HP');

                // Execute barcode addition to cart
                const success = handleScanBarcode(scan.barcode, products);
                if (success) {
                  playScanBeep();
                  triggerScanFlash();
                  const matched = products.find(p => p.barcode === scan.barcode || p.sku === scan.barcode);
                  if (matched) {
                    setLastScannedItem({
                      name: matched.name,
                      price: matched.sellPrice,
                      quantity: 1,
                      barcode: scan.barcode,
                      unit: matched.unit,
                      timestamp: Date.now()
                    });
                  }
                  if (autoFocusOnScan && !isFocusMode) {
                    setIsFocusMode(true);
                    localStorage.setItem('omnipos_pos_focus_mode', 'true');
                  }
                  useToastStore.getState().showToast(`Scan HP (${scan.deviceName || 'Android'}): ${matched?.name || scan.barcode}`, 'success');
                } else {
                  playErrorBeep();
                  useToastStore.getState().showToast(`Scan HP: Barcode '${scan.barcode}' tidak ditemukan di katalog`, 'warning');
                }
              }
            }
          }
        }
      } catch {}
    };

    const interval = setInterval(pollMobileScans, 1500);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [products, handleScanBarcode, autoFocusOnScan, isFocusMode]);

  // Unified Barcode Scan Processor
  const processBarcodeScan = (rawCode: string): boolean => {
    const trimmed = rawCode.trim();
    if (!trimmed) return false;

    // Detected as Physical USB Barcode Scanner
    useHardwareStore.getState().setDetectedScannerType('usb', 'Alat Scan USB');

    const matchedProduct = products.find(p => p.barcode === trimmed || p.sku === trimmed);
    const success = handleScanBarcode(trimmed, products);

    if (success) {
      triggerScanFlash();
      if (matchedProduct) {
        setLastScannedItem({
          name: matchedProduct.name,
          price: matchedProduct.sellPrice,
          quantity: 1,
          barcode: trimmed,
          unit: matchedProduct.unit,
          timestamp: Date.now()
        });
      }
      if (autoFocusOnScan && !isFocusMode) {
        setIsFocusMode(true);
        localStorage.setItem('omnipos_pos_focus_mode', 'true');
      }
      return true;
    } else {
      useToastStore.getState().showToast(`Barcode / PLU "${trimmed}" tidak terdaftar!`, 'warning');
      return false;
    }
  };

  // Barcode Continuous & Weighing Scale Scan Handler
  const handleBarcodeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!barcodeInput.trim()) return;
    processBarcodeScan(barcodeInput);
    setBarcodeInput('');
  };

  // Instant Exact Cash Checkout [F8]
  const handleQuickExactCashCheckout = async () => {
    const total = getTotalAmount();
    if (total <= 0) return;
    await handleCheckoutSubmit([{ method: 'Cash', amount: total }]);
  };

  // Safe Clear Cart with confirmation for multi-item cart
  const handleSafeClearCart = () => {
    if (items.length === 0) return;
    if (items.length >= 2) {
      if (window.confirm(`Kosongkan keranjang belanja (${getTotalItemCount()} item)?`)) {
        clearCart();
        useToastStore.getState().showToast('Keranjang belanja berhasil dikosongkan.', 'info');
      }
    } else {
      clearCart();
    }
  };

  // Reprint Last Receipt [F7]
  const handleReprintLastReceipt = async () => {
    if (!lastCompletedOrder) {
      useToastStore.getState().showToast('Belum ada riwayat transaksi sebelumnya untuk dicetak ulang.', 'warning');
      return;
    }

    try {
      useToastStore.getState().showToast(`Mencetak ulang nota ${lastCompletedOrder.invoiceNumber}...`, 'info');
      await fetch(`/api/v1/printer/receipt-by-invoice/${lastCompletedOrder.invoiceNumber}`, { method: 'POST' });
    } catch {
      useToastStore.getState().showToast('Gagal mencetak ulang nota.', 'error');
    }
  };

  const handleCheckoutSubmit = async (payments: Array<{ method: PaymentMethod; amount: number; referenceNumber?: string }>) => {
    const activeItems = items.filter(i => !i.isPromoReward);
    const primaryMethod = payments.length === 1 ? payments[0].method : 'SplitPayment' as PaymentMethod;

    const orderPayload = {
      cashierUserId: activeShift?.cashierName || 'Kasir Retail',
      shiftId: activeShift?.id,
      customerId: selectedCustomer?.id,
      diningTableId: mode === 'FoodAndBeverage' ? selectedTable?.id : undefined,
      businessMode: mode,
      items: activeItems.map((i) => ({
        productId: i.productId,
        variantId: i.variantId,
        quantity: i.quantity,
        unitPrice: i.unitPrice,
        discountAmount: i.discountAmount,
        notes: i.notes,
        serialNumber: i.serialNumber,
        modifierOptionIds: i.modifiers.map((m) => m.id),
      })),
      payments: payments.map(p => ({
        method: p.method,
        amount: p.amount,
        referenceNumber: p.referenceNumber,
      })),
      discountAmount: discountAmount || 0,
      discountReason: discountReason || 'Diskon Kasir',
      redeemedPoints: redeemedPoints || 0,
      redeemedPointsDiscountAmount: redeemedPointsDiscountAmount || 0,
      couponCode: appliedCoupon?.couponCode || null,
      couponDiscountAmount: appliedCoupon?.discountAmount || 0,
      taxPercentage: mode === 'FoodAndBeverage' ? 10 : 0,
      serviceChargePercentage: 0,
      roundingAmount: 0,
    };

    try {
      const res = await fetch('/api/v1/sales/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(orderPayload),
      });

      if (res.ok) {
        const result = await res.json();
        playCashBeep();

        // If trade-in was attached, record trade-in transaction
        if (mode === 'Electronics' && tradeIn) {
          try {
            await fetch('/api/v1/electronics/trade-in', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                customerName: tradeIn.customerName,
                customerPhone: tradeIn.customerPhone,
                deviceBrandModel: tradeIn.deviceBrandModel,
                imeiOrSerial: tradeIn.imeiOrSerial,
                conditionGrade: tradeIn.conditionGrade,
                functionalNotes: tradeIn.functionalNotes,
                accessoriesIncluded: tradeIn.accessoriesIncluded,
                valuationAmount: tradeIn.valuationAmount,
                newPurchaseInvoiceNumber: result.invoiceNumber
              })
            });
          } catch {}
        }

        // If service settlements were attached, update service ticket status to PickedUpAndPaid
        const serviceItems = items.filter(i => i.isServiceSettlement && i.serviceTicketId);
        for (const sItem of serviceItems) {
          try {
            await fetch(`/api/v1/electronics/services/${sItem.serviceTicketId}/action`, {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                status: 'PickedUpAndPaid',
                technicianNotes: `Pelunasan kasir lunas (Faktur: ${result.invoiceNumber})`,
                finalCost: sItem.totalPrice
              })
            });
          } catch {}
        }

        setCompletedOrder(result);
        setLastCompletedOrder({
          orderNumber: result.invoiceNumber,
          invoiceNumber: result.invoiceNumber,
          orderDate: result.orderDate,
          cashierName: activeShift?.cashierName || 'Kasir Retail',
          customerName: selectedCustomer?.name,
          totalAmount: result.totalAmount,
          totalPaid: result.totalPaid,
          changeAmount: result.changeAmount,
          paymentMethod: primaryMethod,
          items: [...items],
          tradeIn: tradeIn
        });
        setIsPaymentOpen(false);
        setIsSuccessOpen(true);
        clearCart();
        useToastStore.getState().showToast(`Transaksi ${result.invoiceNumber} Berhasil!`, 'success');
      } else {
        playErrorBeep();
        useToastStore.getState().showToast('Gagal memproses transaksi kasir!', 'error');
      }
    } catch {
      playErrorBeep();
      useToastStore.getState().showToast('Terjadi kesalahan jaringan server!', 'error');
    }
  };

  const handlePrintReceipt = async () => {
    if (!completedOrder) return;
    try {
      await fetch(`/api/v1/printer/receipt/${completedOrder.id}`, { method: 'POST' });
    } catch {}
    setIsSuccessOpen(false);
  };

  const handleRedeemLoyaltyPoints = async (points: number, discountValue: number) => {
    if (!selectedCustomer) return;
    try {
      const res = await fetch(`/api/v1/customers/${selectedCustomer.id}/points/redeem`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          points,
          discountValue,
          reason: `Tukar ${points} Poin Loyalitas`,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setDiscount(discountAmount + discountValue, `Tukar ${points} Poin Loyalitas`);
        selectedCustomer.loyaltyPoints = Math.max(0, (selectedCustomer.loyaltyPoints || 0) - points);
        useToastStore.getState().showToast(data.message || `Diskon poin Rp ${discountValue.toLocaleString('id-ID')} diterapkan!`, 'success');
      } else {
        useToastStore.getState().showToast(data.message || 'Gagal menukarkan poin.', 'error');
      }
    } catch {
      useToastStore.getState().showToast('Terjadi kesalahan saat memproses penukaran poin.', 'error');
    }
  };

  // Filter Catalog Products
  const filteredProducts = products.filter((p) => {
    const matchesCategory = selectedCategory ? p.categoryId === selectedCategory : true;
    const matchesSearch = searchQuery
      ? p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.sku.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (p.barcode && p.barcode.includes(searchQuery)) ||
        (p.location && p.location.toLowerCase().includes(searchQuery.toLowerCase()))
      : true;
    const matchesStock = !hideOutOfStock || p.currentStock > 0;
    return matchesCategory && matchesSearch && matchesStock;
  });

  const wholesaleSavings = getWholesaleSavings();
  const quickCashOptions = getQuickCashSuggestions();

  return (
    <div className="flex-1 flex flex-col bg-app overflow-hidden select-none">
      <div className="flex-1 flex overflow-hidden">
        {isFocusMode ? (
          <div className="flex-1 flex flex-col bg-app overflow-hidden">
            {/* FOCUS TOP BAR */}
            <div className="p-3 border-b border-border-subtle bg-surface flex items-center justify-between gap-3 shrink-0 shadow-xs">
              <form onSubmit={handleBarcodeSubmit} className="flex-1 max-w-2xl flex items-center gap-2">
                <div className="relative flex-1">
                  <Barcode className="w-5 h-5 text-primary absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    ref={focusBarcodeInputRef}
                    type="text"
                    value={barcodeInput}
                    onChange={(e) => setBarcodeInput(e.target.value)}
                    onKeyDown={(e) => {
                      const now = performance.now();
                      if (now - lastKeyTimeRef.current < 45) {
                        consecutiveFastKeysRef.current += 1;
                        if (consecutiveFastKeysRef.current >= 3) {
                          useHardwareStore.getState().setDetectedScannerType('usb', 'Alat Scan USB / Laser');
                        }
                      } else {
                        consecutiveFastKeysRef.current = 0;
                      }
                      lastKeyTimeRef.current = now;
                    }}
                    placeholder="SCAN BARCODE / TIMBANGAN PRODUK LALU [ENTER] [F1]..."
                    className="w-full pl-11 pr-4 py-2.5 bg-subtle border-2 border-primary/50 focus:border-primary rounded-xl text-sm font-mono font-black text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/20 shadow-inner tracking-wider"
                    autoFocus
                  />
                </div>
                {/* Scanner Hardware Detector Status */}
                <button
                  type="button"
                  onClick={() => setIsScannerHardwareModalOpen(true)}
                  className="h-10 px-3 rounded-xl border border-border-subtle bg-card hover:bg-subtle flex items-center gap-2 text-xs font-semibold text-text-primary transition-all shrink-0 cursor-pointer shadow-xs"
                  title="Pengaturan Scanner USB & Kamera HP"
                >
                  <ScanLine className="w-4 h-4 text-primary" />
                  <span className="font-mono text-xs hidden md:inline">
                    {detectedScannerType === 'usb' ? 'Scan USB' : detectedScannerType === 'hp' ? 'Scan HP' : 'Dual Scan'}
                  </span>
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                </button>
              </form>

              {/* Action Buttons & Switches */}
              <div className="flex items-center gap-2">
                {/* Quick Search Button [F2] */}
                <button
                  type="button"
                  onClick={() => {
                    setIsQuickSearchOpen(true);
                    setTimeout(() => focusQuickSearchInputRef.current?.focus(), 50);
                  }}
                  className="h-10 px-3.5 rounded-xl bg-primary/10 hover:bg-primary/20 text-primary border border-primary/30 text-xs font-bold flex items-center gap-2 transition-all active:scale-95 cursor-pointer shadow-xs"
                  title="Cari Produk Manual [F2]"
                >
                  <Search className="w-4 h-4" />
                  <span className="font-bold">Cari Manual [F2]</span>
                </button>

                {/* Auto Focus On Scan Toggle */}
                <label className="hidden lg:flex items-center gap-2 text-xs font-semibold text-text-secondary bg-subtle px-3 py-2 rounded-xl border border-border-subtle cursor-pointer hover:bg-card select-none">
                  <input
                    type="checkbox"
                    checked={autoFocusOnScan}
                    onChange={(e) => {
                      setAutoFocusOnScan(e.target.checked);
                      localStorage.setItem('omnipos_auto_focus_on_scan', e.target.checked ? 'true' : 'false');
                      useToastStore.getState().showToast(
                        e.target.checked ? 'Auto-Fokus aktif: Scan barcode otomatis alihkan ke Mode Fokus' : 'Auto-Fokus nonaktif',
                        'info'
                      );
                    }}
                    className="rounded text-primary focus:ring-primary w-4 h-4"
                  />
                  <span>Auto-Fokus Scan</span>
                </label>

                {/* Exit Focus Mode [F10] */}
                <button
                  type="button"
                  onClick={toggleFocusMode}
                  className="h-10 px-3.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-black text-xs flex items-center gap-2 transition-all shadow-md active:scale-95 cursor-pointer"
                  title="Kembali ke Mode Normal (Katalog Manual) [F10]"
                >
                  <Minimize2 className="w-4 h-4" />
                  <span>Mode Normal [F10]</span>
                </button>
              </div>
            </div>

            {/* FEEDBACK BANNER: LAST SCANNED ITEM */}
            {lastScannedItem && (
              <div className="bg-emerald-500/10 border-b border-emerald-500/30 px-4 py-2.5 flex items-center justify-between shrink-0 animate-fadeIn">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-emerald-500 text-white flex items-center justify-center shrink-0 shadow-xs">
                    <CheckCircle2 className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-black uppercase tracking-wider text-emerald-700 dark:text-emerald-300 font-mono bg-emerald-500/20 px-1.5 py-0.5 rounded">
                        Baru Di-Scan
                      </span>
                      <span className="font-mono text-xs text-text-secondary">
                        Barcode: {lastScannedItem.barcode}
                      </span>
                    </div>
                    <p className="text-sm font-black text-text-primary">
                      {lastScannedItem.name}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <p className="text-[11px] text-text-secondary">Harga Satuan</p>
                    <p className="font-mono font-bold text-sm text-emerald-600 dark:text-emerald-400">
                      Rp {lastScannedItem.price.toLocaleString('id-ID')} {lastScannedItem.unit ? `/ ${lastScannedItem.unit}` : ''}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setLastScannedItem(null)}
                    className="p-1 rounded-md text-text-muted hover:text-text-primary hover:bg-subtle"
                    title="Tutup Notifikasi"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}

            {/* MAIN SPLIT: 68% CART TABLE / 32% CHECKOUT & MEGA TOTAL */}
            <div className="flex-1 flex overflow-hidden">
              {/* LEFT 68%: JUMBO SCAN CART TABLE */}
              <div className="w-[68%] flex flex-col border-r border-border-subtle bg-surface select-none">
                {/* Cart Table Header Toolbar */}
                <div className="px-4 py-2 border-b border-border-subtle bg-subtle flex items-center justify-between shrink-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-black text-text-primary font-mono bg-card px-2.5 py-1 rounded-lg border border-border-subtle shadow-xs">
                      {getTotalItemCount()} Macam Produk
                    </span>
                    <span className="text-xs font-bold text-text-secondary font-mono">
                      ({items.reduce((s, it) => s + it.quantity, 0)} Total Pcs)
                    </span>
                    {isScanFlashing && (
                      <span className="px-2 py-0.5 rounded-full bg-emerald-500 text-white text-[11px] font-bold animate-pulse flex items-center gap-1 shadow-xs">
                        <Zap className="w-3 h-3" />
                        <span>Scan Berhasil</span>
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        if (items.length > 0) {
                          parkCurrentOrder();
                          useToastStore.getState().showToast('Transaksi aktif berhasil ditahan (Pending)!', 'info');
                        } else {
                          setIsPendingModalOpen(true);
                        }
                      }}
                      className="px-2.5 py-1 rounded-lg bg-card hover:bg-amber-500/10 hover:text-amber-500 border border-border-subtle text-xs font-bold text-text-secondary transition-all cursor-pointer"
                    >
                      Hold [F6] {parkedOrders.length > 0 && `(${parkedOrders.length})`}
                    </button>
                    <button
                      type="button"
                      onClick={handleSafeClearCart}
                      disabled={items.length === 0}
                      className="px-2.5 py-1 rounded-lg bg-card hover:bg-status-danger/10 hover:text-status-danger border border-border-subtle text-xs font-bold text-text-secondary disabled:opacity-30 transition-all cursor-pointer"
                    >
                      Hapus Keranjang [ESC]
                    </button>
                  </div>
                </div>

                {/* Table Content */}
                <div className="flex-1 overflow-y-auto">
                  {items.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-text-secondary space-y-4 p-8 text-center">
                      <div className="w-20 h-20 rounded-2xl bg-subtle border-2 border-dashed border-border-strong flex items-center justify-center text-primary">
                        <ScanLine className="w-10 h-10 animate-pulse" />
                      </div>
                      <div className="space-y-1 max-w-md">
                        <h3 className="text-lg font-black text-text-primary tracking-wide">
                          MODE FOKUS KASIR AKTIF
                        </h3>
                        <p className="text-xs text-text-secondary leading-relaxed">
                          Arahkan scanner ke barcode produk untuk langsung menambahkan ke keranjang belanja, atau tekan <kbd className="px-1.5 py-0.5 rounded bg-subtle border font-mono font-bold text-text-primary">F2</kbd> untuk cari produk manual.
                        </p>
                      </div>
                      <div className="flex items-center gap-3 pt-2 text-xs text-text-muted font-mono">
                        <span>[F1] Fokus Barcode</span>
                        <span>•</span>
                        <span>[F2] Cari Manual</span>
                        <span>•</span>
                        <span>[F3] Pilih Pelanggan</span>
                        <span>•</span>
                        <span>[F10] Mode Normal</span>
                      </div>
                    </div>
                  ) : (
                    <table className="w-full text-left border-collapse table-fixed">
                      <colgroup>
                        <col className="w-10" />
                        <col />
                        <col className="w-20" />
                        <col className="w-28" />
                        <col className="w-32" />
                        <col className="w-28" />
                        <col className="w-32" />
                        <col className="w-14" />
                      </colgroup>
                      <thead className="sticky top-0 bg-subtle/95 backdrop-blur-xs text-[11px] font-mono font-bold uppercase text-text-secondary border-b border-border-subtle z-10">
                        <tr>
                          <th className="py-2.5 px-3 text-center">#</th>
                          <th className="py-2.5 px-3">Produk & Detail</th>
                          <th className="py-2.5 px-3 text-center">Satuan</th>
                          <th className="py-2.5 px-3 text-right">Harga Satuan</th>
                          <th className="py-2.5 px-3 text-center">Kuantitas</th>
                          <th className="py-2.5 px-3 text-right">Hemat / Grosir</th>
                          <th className="py-2.5 px-3 text-right">Subtotal</th>
                          <th className="py-2.5 px-3 text-center">Aksi</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border-subtle text-xs">
                        {items.map((item, idx) => (
                          <tr
                            key={idx}
                            onClick={() => setSelectedCartIndex(idx)}
                            className={`transition-colors cursor-pointer ${
                              selectedCartIndex === idx
                                ? 'bg-primary/10 border-l-4 border-l-primary'
                                : item.isPromoReward
                                ? 'bg-emerald-500/10 hover:bg-emerald-500/15'
                                : item.isWholesaleApplied
                                ? 'bg-emerald-500/5 hover:bg-emerald-500/10'
                                : 'hover:bg-subtle/60'
                            }`}
                          >
                            <td className="py-3 px-3 text-center font-mono font-bold text-text-muted">
                              {idx + 1}
                            </td>
                            <td className="py-3 px-3">
                              <div className="space-y-0.5 min-w-0">
                                <div className="flex items-center gap-2">
                                  <span className="font-bold text-sm text-text-primary truncate" title={item.name}>
                                    {item.name}
                                  </span>
                                  {selectedCartIndex === idx && (
                                    <span className="text-[10px] font-mono font-bold px-1.5 py-0.2 rounded bg-primary text-white shrink-0">
                                      Aktif [+/-]
                                    </span>
                                  )}
                                </div>
                                <div className="flex items-center gap-2 text-[11px] font-mono text-text-muted">
                                  {item.sku && <span>SKU: {item.sku}</span>}
                                  {products.find(p => p.id === item.productId)?.barcode && (
                                    <span>• Barcode: {products.find(p => p.id === item.productId)?.barcode}</span>
                                  )}
                                </div>
                                {item.serialNumber && (
                                  <div className="flex items-center gap-1 text-[11px] text-primary font-mono font-bold">
                                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                                    <span>IMEI/SN: {item.serialNumber}</span>
                                  </div>
                                )}
                                {item.isPromoReward && (
                                  <div className="flex items-center gap-1 text-[11px] text-emerald-600 font-bold">
                                    <Gift className="w-3.5 h-3.5 text-emerald-500" />
                                    <span>GRATIS: {item.promoRuleName}</span>
                                  </div>
                                )}
                                {!item.isPromoReward && item.isWholesaleApplied && (
                                  <div className="flex items-center gap-1 text-[11px] text-emerald-600 font-bold">
                                    <Sparkles className="w-3.5 h-3.5 text-emerald-500" />
                                    <span>Harga Grosir Aktif: Rp {item.unitPrice.toLocaleString('id-ID')}</span>
                                  </div>
                                )}
                                {!item.isPromoReward && !item.isWholesaleApplied && item.wholesalePrice && item.wholesaleMinQty && (
                                  <p className="text-[10px] font-semibold text-emerald-700 dark:text-emerald-400">
                                    Beli {item.wholesaleMinQty - item.quantity} lagi untuk harga grosir Rp {item.wholesalePrice.toLocaleString('id-ID')}
                                  </p>
                                )}
                                {item.modifiers && item.modifiers.length > 0 && (
                                  <div className="text-[11px] text-amber-700 dark:text-amber-400 font-medium">
                                    {item.modifiers.map((m, mi) => (
                                      <span key={mi} className="mr-2">
                                        • {m.modifierName || m.name} {m.price > 0 && `(+Rp ${m.price.toLocaleString('id-ID')})`}
                                      </span>
                                    ))}
                                  </div>
                                )}
                                {item.notes && (
                                  <p className="text-[11px] text-rose-600 italic">
                                    Catatan: "{item.notes}"
                                  </p>
                                )}
                              </div>
                            </td>
                            <td className="py-3 px-3 text-center">
                              <span className="font-mono text-xs px-2 py-0.5 rounded bg-subtle border border-border-subtle font-bold text-text-secondary">
                                {item.unit || 'PCS'}
                              </span>
                            </td>
                            <td className="py-3 px-3 text-right font-mono">
                              {item.regularPrice && item.regularPrice > item.unitPrice ? (
                                <div>
                                  <span className="text-[11px] text-text-muted line-through block">
                                    Rp {item.regularPrice.toLocaleString('id-ID')}
                                  </span>
                                  <span className="font-bold text-sm text-emerald-600 dark:text-emerald-400">
                                    Rp {item.unitPrice.toLocaleString('id-ID')}
                                  </span>
                                </div>
                              ) : (
                                <span className="font-bold text-sm text-text-primary">
                                  Rp {item.unitPrice.toLocaleString('id-ID')}
                                </span>
                              )}
                            </td>
                            <td className="py-3 px-3">
                              {item.isPromoReward ? (
                                <div className="text-center font-mono font-bold text-emerald-600">
                                  {item.quantity}
                                </div>
                              ) : (
                                <div className="flex items-center justify-center gap-1.5 bg-subtle rounded-xl border border-border-subtle p-1 max-w-[120px] mx-auto">
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      updateQty(idx, item.quantity - 1);
                                      playScanBeep();
                                    }}
                                    className="w-7 h-7 rounded-lg bg-card hover:bg-subtle text-text-secondary hover:text-text-primary border border-border-subtle flex items-center justify-center font-bold"
                                    title="Kurangi Kuantitas [-]"
                                  >
                                    <Minus className="w-3.5 h-3.5" />
                                  </button>
                                  <span className="font-mono font-black text-sm px-2 tabular-nums">
                                    {item.quantity}
                                  </span>
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      updateQty(idx, item.quantity + 1);
                                      playScanBeep();
                                    }}
                                    className="w-7 h-7 rounded-lg bg-card hover:bg-subtle text-text-secondary hover:text-text-primary border border-border-subtle flex items-center justify-center font-bold"
                                    title="Tambah Kuantitas [+]"
                                  >
                                    <Plus className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              )}
                            </td>
                            <td className="py-3 px-3 text-right font-mono">
                              {item.isWholesaleApplied && item.regularPrice ? (
                                <span className="text-emerald-600 font-bold text-xs">
                                  -Rp {((item.regularPrice - item.unitPrice) * item.quantity).toLocaleString('id-ID')}
                                </span>
                              ) : item.isPromoReward ? (
                                <span className="text-emerald-600 font-bold text-xs">100% Promo</span>
                              ) : (
                                <span className="text-text-muted text-xs">-</span>
                              )}
                            </td>
                            <td className="py-3 px-3 text-right font-mono">
                              <span className="font-black text-base text-emerald-600 dark:text-emerald-400">
                                Rp {item.totalPrice.toLocaleString('id-ID')}
                              </span>
                            </td>
                            <td className="py-3 px-3 text-center">
                              <div className="flex items-center justify-center gap-1">
                                {mode === 'Pharmacy' && (
                                  <button
                                    type="button"
                                    onClick={(e) => { e.stopPropagation(); handleOpenItemEtiket(item); }}
                                    className="p-1.5 rounded-lg bg-emerald-600/10 hover:bg-emerald-600/20 text-emerald-600"
                                    title="Etiket Obat"
                                  >
                                    <Pill className="w-4 h-4" />
                                  </button>
                                )}
                                {!item.isPromoReward && (
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      removeItem(idx);
                                      if (selectedCartIndex === idx) {
                                        setSelectedCartIndex(Math.max(0, idx - 1));
                                      }
                                    }}
                                    className="p-1.5 rounded-lg text-text-muted hover:text-status-danger hover:bg-status-danger/10 transition-colors"
                                    title="Hapus Item [Del]"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              </div>

              {/* RIGHT 32%: MEGA TOTAL DISPLAY & CHECKOUT PANEL */}
              <div className="w-[32%] flex flex-col bg-subtle select-none p-3 space-y-2.5 overflow-y-auto">
                {/* Mega Total Display (OLED Style) */}
                <div className="bg-zinc-950 text-white rounded-2xl p-4 border-2 border-zinc-800 shadow-xl space-y-1 shrink-0">
                  <div className="flex items-center justify-between text-zinc-400 text-xs font-mono font-bold uppercase tracking-wider">
                    <span>TOTAL TAGIHAN</span>
                    <span className="text-zinc-500 font-mono text-[11px]">
                      {items.reduce((s, it) => s + it.quantity, 0)} Total Pcs
                    </span>
                  </div>
                  <div className="text-3xl xl:text-4xl 2xl:text-5xl font-black font-mono tracking-tight text-emerald-400 drop-shadow-[0_0_15px_rgba(52,211,153,0.35)] py-1">
                    Rp {getTotalAmount().toLocaleString('id-ID')}
                  </div>
                  {wholesaleSavings > 0 && (
                    <div className="text-xs font-bold text-emerald-300 font-mono flex items-center gap-1.5 pt-1 border-t border-zinc-800">
                      <Tag className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Hemat Harga Grosir: -Rp {wholesaleSavings.toLocaleString('id-ID')}</span>
                    </div>
                  )}
                </div>

                {/* Customer / Member Card */}
                <div className="bg-card rounded-xl p-2.5 border border-border-subtle flex items-center justify-between shrink-0 shadow-xs">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center font-bold shrink-0">
                      <Users className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-text-primary truncate">
                        {selectedCustomer ? selectedCustomer.name : 'Pelanggan Umum'}
                      </p>
                      {selectedCustomer?.totalReceivable ? (
                        <p className="text-[10px] text-status-danger font-mono font-bold truncate">
                          Kasbon: Rp {selectedCustomer.totalReceivable.toLocaleString('id-ID')}
                        </p>
                      ) : (
                        <p className="text-[10px] text-text-muted">Pelanggan Member [F3]</p>
                      )}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsCustomerModalOpen(true)}
                    className="px-2.5 py-1 rounded-lg bg-subtle hover:bg-primary/10 hover:text-primary text-text-secondary border border-border-subtle text-xs font-bold transition-all shrink-0 cursor-pointer"
                  >
                    Ganti [F3]
                  </button>
                </div>

                {/* Financial Cost Breakdown */}
                <div className="bg-card rounded-xl p-3 border border-border-subtle space-y-1.5 text-xs shrink-0 shadow-xs">
                  <div className="flex justify-between items-center text-text-secondary">
                    <span>Subtotal Barang:</span>
                    <span className="font-mono font-semibold text-text-primary">
                      Rp {getSubtotal().toLocaleString('id-ID')}
                    </span>
                  </div>
                  {wholesaleSavings > 0 && (
                    <div className="flex justify-between items-center text-emerald-600 font-bold">
                      <span className="flex items-center gap-1"><Tag className="w-3 h-3" /> Hemat Grosir:</span>
                      <span className="font-mono">-Rp {wholesaleSavings.toLocaleString('id-ID')}</span>
                    </div>
                  )}
                  {discountAmount > 0 && (
                    <div className="flex justify-between items-center text-status-danger font-bold">
                      <span>Diskon Manual:</span>
                      <span className="font-mono">-Rp {discountAmount.toLocaleString('id-ID')}</span>
                    </div>
                  )}
                  {appliedCoupon && (
                    <div className="flex justify-between items-center text-indigo-600 font-bold">
                      <span className="flex items-center gap-1">
                        <Ticket className="w-3 h-3" /> Kupon ({appliedCoupon.couponCode}):
                      </span>
                      <span className="font-mono">-Rp {appliedCoupon.discountAmount.toLocaleString('id-ID')}</span>
                    </div>
                  )}
                  {redeemedPoints > 0 && (
                    <div className="flex justify-between items-center text-amber-600 font-bold">
                      <span className="flex items-center gap-1">
                        <Star className="w-3 h-3" /> Tukar {redeemedPoints} Poin:
                      </span>
                      <span className="font-mono">-Rp {redeemedPointsDiscountAmount.toLocaleString('id-ID')}</span>
                    </div>
                  )}
                  {tradeIn && (
                    <div className="flex justify-between items-center text-purple-600 font-bold">
                      <span>Tukar Tambah ({tradeIn.deviceBrandModel}):</span>
                      <span className="font-mono">-Rp {tradeIn.valuationAmount.toLocaleString('id-ID')}</span>
                    </div>
                  )}
                  <div className="pt-1.5 border-t border-border-subtle flex justify-between items-center font-bold">
                    <button
                      type="button"
                      onClick={() => setIsDiscountModalOpen(true)}
                      className="text-primary hover:underline text-xs flex items-center gap-1 font-bold cursor-pointer"
                    >
                      <Percent className="w-3 h-3" /> Diskon, Kupon & Poin [F4]
                    </button>
                    <span className="text-text-muted font-mono text-[11px]">
                      {(discountAmount + (appliedCoupon?.discountAmount || 0) + (redeemedPointsDiscountAmount || 0)) > 0 
                        ? `-Rp ${(discountAmount + (appliedCoupon?.discountAmount || 0) + (redeemedPointsDiscountAmount || 0)).toLocaleString('id-ID')}` 
                        : 'Rp 0'}
                    </span>
                  </div>
                </div>

                {/* Quick Cash Suggestions Bar */}
                {items.length > 0 && quickCashOptions.length > 0 && (
                  <div className="bg-card rounded-xl p-2.5 border border-border-subtle space-y-1.5 shrink-0 shadow-xs">
                    <p className="text-[11px] font-bold text-text-primary flex items-center gap-1">
                      <Banknote className="w-3.5 h-3.5 text-status-success" />
                      Bayar Cepat Pecahan Uang Tunai:
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {quickCashOptions.map((opt, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => handleCheckoutSubmit([{ method: 'Cash', amount: opt }])}
                          className="flex-1 min-w-[75px] py-1.5 px-2 rounded-lg bg-subtle hover:bg-emerald-600 hover:text-white border border-border-subtle text-xs font-mono font-bold text-text-primary transition-all shadow-xs active:scale-95 text-center cursor-pointer"
                        >
                          {opt === getTotalAmount() ? 'Uang Pas' : `Rp ${opt.toLocaleString('id-ID')}`}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Checkout Mega Action Buttons */}
                <div className="space-y-2 pt-1 mt-auto shrink-0">
                  {mode === 'FoodAndBeverage' ? (
                    <button
                      type="button"
                      onClick={handleSendToKitchen}
                      disabled={items.length === 0}
                      className="w-full h-12 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 shadow-md transition-all active:scale-95 disabled:opacity-40 cursor-pointer"
                    >
                      <ChefHat className="w-4 h-4" />
                      <span>[F8] KIRIM KE DAPUR</span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={handleQuickExactCashCheckout}
                      disabled={items.length === 0}
                      className="w-full h-12 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 shadow-md transition-all active:scale-95 disabled:opacity-40 cursor-pointer"
                    >
                      <Zap className="w-4 h-4" />
                      <span>[F8] BAYAR UANG PAS (RP {getTotalAmount().toLocaleString('id-ID')})</span>
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => setIsPaymentOpen(true)}
                    disabled={items.length === 0}
                    className="w-full h-14 rounded-xl bg-primary hover:bg-primary-hover text-white font-black text-sm uppercase tracking-wider flex items-center justify-center gap-2.5 shadow-xl transition-all active:scale-95 disabled:opacity-40 cursor-pointer"
                  >
                    <span>[F9] BAYAR LENGKAP / METODE LAIN</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>

            {/* QUICK SEARCH POPOVER MODAL (F2) */}
            {isQuickSearchOpen && (
              <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-start justify-center pt-20 p-4 animate-in fade-in">
                <div className="bg-surface border-2 border-primary/50 shadow-2xl rounded-2xl w-full max-w-xl overflow-hidden animate-in zoom-in-95 duration-150">
                  <div className="p-3 border-b border-border-subtle flex items-center gap-2 bg-subtle">
                    <Search className="w-5 h-5 text-primary shrink-0" />
                    <input
                      ref={focusQuickSearchInputRef}
                      type="text"
                      value={focusSearchQuery}
                      onChange={(e) => {
                        setFocusSearchQuery(e.target.value);
                        setFocusSelectedResultIndex(0);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Escape') {
                          setIsQuickSearchOpen(false);
                          setFocusSearchQuery('');
                          focusBarcodeInputRef.current?.focus();
                        } else if (e.key === 'ArrowDown') {
                          e.preventDefault();
                          setFocusSelectedResultIndex(prev => Math.min(focusFilteredProducts.length - 1, prev + 1));
                        } else if (e.key === 'ArrowUp') {
                          e.preventDefault();
                          setFocusSelectedResultIndex(prev => Math.max(0, prev - 1));
                        } else if (e.key === 'Enter') {
                          e.preventDefault();
                          if (focusFilteredProducts.length > 0) {
                            const itemToAdd = focusFilteredProducts[focusSelectedResultIndex] || focusFilteredProducts[0];
                            if (itemToAdd.currentStock > 0 || !itemToAdd.trackStock) {
                              handleProductCardClick(itemToAdd);
                              setLastScannedItem({
                                name: itemToAdd.name,
                                price: itemToAdd.sellPrice,
                                quantity: 1,
                                barcode: itemToAdd.barcode || itemToAdd.sku,
                                unit: itemToAdd.unit,
                                timestamp: Date.now()
                              });
                              setIsQuickSearchOpen(false);
                              setFocusSearchQuery('');
                              focusBarcodeInputRef.current?.focus();
                              useToastStore.getState().showToast(`${itemToAdd.name} ditambahkan!`, 'success');
                            } else {
                              useToastStore.getState().showToast(`Stok ${itemToAdd.name} habis!`, 'warning');
                            }
                          }
                        }
                      }}
                      placeholder="Cari produk manual (contoh: Beras, Telur, Kopi)..."
                      className="flex-1 bg-transparent border-none text-sm font-bold text-text-primary focus:outline-none placeholder:text-text-muted"
                      autoFocus
                    />
                    <button
                      type="button"
                      onClick={() => {
                        setIsQuickSearchOpen(false);
                        setFocusSearchQuery('');
                        focusBarcodeInputRef.current?.focus();
                      }}
                      className="p-1 rounded-lg hover:bg-card text-text-secondary hover:text-text-primary cursor-pointer"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>

                  <div className="max-h-80 overflow-y-auto divide-y divide-border-subtle/50">
                    {focusSearchQuery.trim() === '' ? (
                      <div className="p-6 text-center text-text-secondary text-xs">
                        Ketik nama barang, SKU, atau barcode untuk mencari produk tanpa scanner.
                      </div>
                    ) : focusFilteredProducts.length === 0 ? (
                      <div className="p-6 text-center text-text-secondary text-xs">
                        Tidak ada produk cocok dengan "{focusSearchQuery}".
                      </div>
                    ) : (
                      focusFilteredProducts.map((p, idx) => (
                        <div
                          key={p.id}
                          onClick={() => {
                            if (p.currentStock > 0 || !p.trackStock) {
                              handleProductCardClick(p);
                              setLastScannedItem({
                                name: p.name,
                                price: p.sellPrice,
                                quantity: 1,
                                barcode: p.barcode || p.sku,
                                unit: p.unit,
                                timestamp: Date.now()
                              });
                              setIsQuickSearchOpen(false);
                              setFocusSearchQuery('');
                              focusBarcodeInputRef.current?.focus();
                              useToastStore.getState().showToast(`${p.name} ditambahkan!`, 'success');
                            } else {
                              useToastStore.getState().showToast(`Stok ${p.name} habis!`, 'warning');
                            }
                          }}
                          className={`p-3 flex items-center justify-between cursor-pointer transition-colors ${
                            focusSelectedResultIndex === idx ? 'bg-primary/10 border-l-4 border-primary' : 'hover:bg-subtle'
                          }`}
                        >
                          <div>
                            <p className="font-bold text-sm text-text-primary">{p.name}</p>
                            <div className="flex items-center gap-2 text-xs text-text-secondary font-mono">
                              <span>SKU: {p.sku}</span>
                              {p.barcode && <span>• Barcode: {p.barcode}</span>}
                              <span>• Stok: {p.currentStock} {p.unit}</span>
                            </div>
                          </div>
                          <div className="text-right font-mono">
                            <span className="font-bold text-sm text-emerald-600 dark:text-emerald-400">
                              Rp {p.sellPrice.toLocaleString('id-ID')}
                            </span>
                          </div>
                        </div>
                      ))
                    )}
                  </div>

                  <div className="p-2.5 bg-subtle border-t border-border-subtle flex items-center justify-between text-[11px] text-text-secondary">
                    <span>Tekan [↑] [↓] untuk memilih, [ENTER] untuk masukkan ke keranjang</span>
                    <kbd className="px-1.5 py-0.5 bg-card border border-border-subtle rounded font-mono text-[10px]">ESC Tutup</kbd>
                  </div>
                </div>
              </div>
            )}
          </div>
        ) : (
          <>
            {/* ========================================================= */}
            {/* LEFT 60% : SCANNER BAR, PRODUCT CATALOG & CATEGORIES     */}
            {/* ========================================================= */}
            <section className="w-[60%] flex flex-col border-r border-border-subtle bg-app">
          {/* Top Bar: Continuous Barcode Scanner Bar & Manual Search */}
          <div className="p-2.5 border-b border-border-subtle bg-surface space-y-2">
            <div className="flex items-center gap-2">
              <form onSubmit={handleBarcodeSubmit} className="flex-1 flex items-center gap-2">
                <div className="relative flex-1">
                  <Barcode className="w-4 h-4 text-primary absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    ref={barcodeInputRef}
                    type="text"
                    value={barcodeInput}
                    onChange={(e) => setBarcodeInput(e.target.value)}
                    onKeyDown={(e) => {
                      const now = performance.now();
                      if (now - lastKeyTimeRef.current < 45) {
                        consecutiveFastKeysRef.current += 1;
                        if (consecutiveFastKeysRef.current >= 3) {
                          setDetectedScannerType('usb', 'Alat Scan USB / Laser');
                        }
                      } else {
                        consecutiveFastKeysRef.current = 0;
                      }
                      lastKeyTimeRef.current = now;
                    }}
                    placeholder="Scan Barcode / Timbangan lalu [ENTER] [F1]..."
                    className="w-full pl-9 pr-3 py-2 bg-subtle border border-border-strong rounded-lg text-xs font-mono font-bold text-text-primary focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary shadow-inner"
                    autoFocus
                  />
                </div>
                <div className="relative w-48">
                  <Search className="w-3.5 h-3.5 text-text-muted absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    ref={searchInputRef}
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        if (filteredProducts.length > 0) {
                          const topP = filteredProducts[0];
                          if (topP.currentStock > 0 || !topP.trackStock) {
                            handleProductCardClick(topP);
                            setSearchQuery('');
                            barcodeInputRef.current?.focus();
                            useToastStore.getState().showToast(`${topP.name} ditambahkan!`, 'success');
                          } else {
                            useToastStore.getState().showToast(`Stok ${topP.name} habis!`, 'warning');
                          }
                        }
                      } else if (e.key === 'Escape') {
                        e.preventDefault();
                        setSearchQuery('');
                        barcodeInputRef.current?.focus();
                      }
                    }}
                    placeholder="Cari produk [F2] lalu [ENTER]..."
                    className="w-full pl-8 pr-3 py-2 bg-card border border-border-subtle focus:border-primary rounded-lg text-xs text-text-primary focus:outline-none"
                  />
                </div>

                {/* Hardware Scanner Detection Button (Alat Scan USB vs Kamera HP) */}
                <button
                  type="button"
                  onClick={() => setIsScannerHardwareModalOpen(true)}
                  title={`Hardware Scanner: ${
                    detectedScannerType === 'usb'
                      ? 'Alat Scan USB / Laser (Terdeteksi)'
                      : detectedScannerType === 'hp'
                      ? 'Kamera HP Android (Terhubung)'
                      : 'Dual Auto (Alat Scan USB & Kamera HP)'
                  }. Klik untuk uji coba & diagnosa hardware.`}
                  className={`px-3 py-2 border rounded-lg text-xs font-bold flex items-center gap-1.5 shrink-0 transition-all active:scale-95 shadow-xs cursor-pointer ${
                    detectedScannerType === 'usb'
                      ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800 hover:bg-emerald-100'
                      : detectedScannerType === 'hp'
                      ? 'bg-sky-50 dark:bg-sky-950/40 text-sky-800 dark:text-sky-300 border-sky-300 dark:border-sky-800 hover:bg-sky-100'
                      : 'bg-slate-100 dark:bg-zinc-800 text-slate-800 dark:text-zinc-200 border-slate-300 dark:border-zinc-700 hover:bg-slate-200'
                  }`}
                >
                  {detectedScannerType === 'usb' ? (
                    <Barcode className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  ) : detectedScannerType === 'hp' ? (
                    <Smartphone className="w-4 h-4 text-sky-600 dark:text-sky-400" />
                  ) : (
                    <Zap className="w-4 h-4 text-primary" />
                  )}
                  <span className="font-medium text-slate-600 dark:text-zinc-400 hidden sm:inline">Scanner:</span>
                  <span className="font-bold">
                    {detectedScannerType === 'usb'
                      ? 'Alat Scan USB'
                      : detectedScannerType === 'hp'
                      ? 'Kamera HP'
                      : 'Alat / HP'}
                  </span>
                  <span className={`text-[9px] font-black px-1.5 py-0.5 rounded-full ${
                    detectedScannerType === 'usb'
                      ? 'bg-emerald-600 text-white'
                      : detectedScannerType === 'hp'
                      ? 'bg-sky-600 text-white'
                      : 'bg-primary text-white'
                  }`}>
                    {detectedScannerType === 'usb' ? 'USB' : detectedScannerType === 'hp' ? 'HP' : 'AUTO'}
                  </span>
                </button>

                {/* Switch to Focus Mode Button */}
                <button
                  type="button"
                  onClick={toggleFocusMode}
                  title="Aktifkan Mode Fokus Kasir [F10]: Sembunyikan katalog manual untuk memperbesar tampilan scan barcode & total harga."
                  className="px-3 py-2 border rounded-lg text-xs font-bold flex items-center gap-1.5 shrink-0 transition-all active:scale-95 shadow-xs cursor-pointer bg-amber-500/10 hover:bg-amber-500/20 text-amber-700 dark:text-amber-400 border-amber-500/30"
                >
                  <ScanLine className="w-4 h-4 text-amber-500" />
                  <span className="hidden sm:inline font-bold">Mode Fokus</span>
                  <kbd className="text-[10px] font-mono font-bold px-1 py-0.5 rounded bg-amber-500 text-white shadow-xs">F10</kbd>
                </button>
              </form>
            </div>

            {/* Quick POS Action Shortcut Pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto text-[11px] font-semibold text-text-secondary">
              <button
                onClick={() => setIsCustomerModalOpen(true)}
                className="px-2.5 py-1 rounded-md bg-card hover:bg-card-hover border border-border-subtle flex items-center gap-1 text-text-primary shrink-0"
              >
                <Users className="w-3 h-3 text-primary" />
                <span>[F3] {mode === 'Pharmacy' ? 'Pasien' : 'Pelanggan'}: <strong>{selectedCustomer ? selectedCustomer.name : 'Umum'}</strong></span>
              </button>

              <button
                onClick={() => setIsDiscountModalOpen(true)}
                className={`px-2.5 py-1 rounded-md border flex items-center gap-1 shrink-0 ${
                  discountAmount > 0
                    ? 'bg-status-danger/10 border-status-danger/30 text-status-danger font-bold'
                    : 'bg-card hover:bg-card-hover border-border-subtle text-text-primary'
                }`}
              >
                <Percent className="w-3 h-3" />
                <span>[F4] Diskon {discountAmount > 0 && `(Rp ${discountAmount.toLocaleString('id-ID')})`}</span>
              </button>

              {/* Retail Manual Scale Shortcut */}
              {mode === 'Retail' && (
                <button
                  onClick={() => useHardwareStore.getState().openManualScale({
                    id: 'generic-scale-item',
                    name: 'Item Timbangan Manual',
                    sku: 'SCALE-MANUAL',
                    sellPrice: 0,
                    currentStock: 999,
                    unit: 'KG',
                    categoryId: '',
                    businessMode: 0,
                    buyPrice: 0,
                    trackStock: false,
                    hasVariants: false,
                    isKitchenItem: false,
                    minStockAlert: 0
                  } as any)}
                  className="px-2.5 py-1 rounded-md bg-purple-500/10 hover:bg-purple-500/20 border border-purple-500/30 text-purple-600 font-bold flex items-center gap-1 shrink-0 transition-all"
                >
                  <Scale className="w-3 h-3 text-purple-600" />
                  <span>[F5] Timbang Manual</span>
                </button>
              )}

              {/* Trade-In Module Shortcut (Only in Electronics) */}
              {mode === 'Electronics' && (
                <button
                  onClick={() => setIsTradeInModalOpen(true)}
                  className={`px-2.5 py-1 rounded-md border flex items-center gap-1 shrink-0 transition-all ${
                    tradeIn
                      ? 'bg-purple-500/10 border-purple-500/30 text-purple-600 font-bold'
                      : 'bg-card hover:bg-card-hover border-border-subtle text-text-primary'
                  }`}
                >
                  <RefreshCw className="w-3 h-3 text-purple-600" />
                  <span>[F5] Tukar Tambah {tradeIn && `(-Rp ${tradeIn.valuationAmount.toLocaleString('id-ID')})`}</span>
                </button>
              )}

              {/* Pharmacy Etiket Modal Shortcut */}
              {mode === 'Pharmacy' && (
                <button
                  onClick={() => {
                    setPharmacyEtiketData({
                      patientName: selectedCustomer?.name || '',
                      doctorName: '',
                      medicineName: items[items.length - 1]?.name || '',
                      signa: '3 x 1 sehari',
                      consumptionTime: 'Sesudah Makan',
                      type: 'putih'
                    });
                    setIsPharmacyEtiketOpen(true);
                  }}
                  className="px-2.5 py-1 rounded-md bg-teal-500/10 hover:bg-teal-500/20 border border-teal-500/30 text-teal-600 font-bold flex items-center gap-1 shrink-0 transition-all"
                >
                  <FileText className="w-3 h-3 text-teal-600" />
                  <span>[F5] Etiket Obat</span>
                </button>
              )}

              {/* F&B Split Bill, Guest Check & Send to Kitchen Shortcuts */}
              {mode === 'FoodAndBeverage' && (
                <>
                  <button
                    onClick={() => setIsSplitBillModalOpen(true)}
                    disabled={items.length === 0}
                    className="px-2.5 py-1 rounded-md bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-600 font-bold flex items-center gap-1 shrink-0 transition-all disabled:opacity-40"
                  >
                    <Divide className="w-3 h-3 text-amber-600" />
                    <span>[F5] Split Bill</span>
                  </button>
                  <button
                    onClick={handleOpenCartGuestCheck}
                    disabled={items.length === 0}
                    className="px-2.5 py-1 rounded-md bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/30 text-blue-600 font-bold flex items-center gap-1 shrink-0 transition-all disabled:opacity-40"
                  >
                    <Receipt className="w-3 h-3 text-blue-600" />
                    <span>[F7] Pra-Tagihan</span>
                  </button>
                  <button
                    onClick={handleSendToKitchen}
                    disabled={items.length === 0}
                    className="px-2.5 py-1 rounded-md bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-rose-600 font-bold flex items-center gap-1 shrink-0 transition-all disabled:opacity-40"
                  >
                    <ChefHat className="w-3 h-3 text-rose-600" />
                    <span>[F8] Kirim Dapur</span>
                  </button>
                </>
              )}

              <button
                onClick={() => setIsPendingModalOpen(true)}
                className={`px-2.5 py-1 rounded-md border flex items-center gap-1 shrink-0 ${
                  parkedOrders.length > 0
                    ? 'bg-amber-500/10 border-amber-500/30 text-amber-600 font-bold animate-pulse'
                    : 'bg-card hover:bg-card-hover border-border-subtle text-text-primary'
                }`}
              >
                <PauseCircle className="w-3 h-3" />
                <span>[F6] Pending ({parkedOrders.length})</span>
              </button>

              {/* Service Center Pickup Shortcut (Only in Electronics) */}
              {mode === 'Electronics' && (
                <button
                  onClick={() => setIsServicePickupOpen(true)}
                  className="px-2.5 py-1 rounded-md bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/30 text-blue-600 font-bold flex items-center gap-1 shrink-0 transition-all"
                >
                  <Wrench className="w-3 h-3" />
                  <span>[F7] Ambil Servis</span>
                </button>
              )}

              {lastCompletedOrder && (
                <button
                  onClick={handleReprintLastReceipt}
                  title="Cetak ulang nota transaksi terakhir [F7]"
                  className="px-2 py-1 rounded-md bg-card hover:bg-card-hover border border-border-subtle flex items-center gap-1 text-text-primary shrink-0 transition-all"
                >
                  <Printer className="w-3 h-3 text-primary" />
                  <span>[F7] Cetak Ulang</span>
                </button>
              )}

              <div className="ml-auto flex items-center gap-1.5 border-l border-border-subtle pl-2">
                <button
                  onClick={() => setHideOutOfStock(h => !h)}
                  title={hideOutOfStock ? 'Tampilkan semua produk' : 'Sembunyikan stok habis'}
                  className={`px-2 py-1 rounded-md border flex items-center gap-1 text-[11px] font-bold transition-all shrink-0 ${hideOutOfStock ? 'bg-primary/10 border-primary/30 text-primary' : 'bg-card hover:bg-card-hover border-border-subtle text-text-muted'}`}
                >
                  {hideOutOfStock ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
                  <span>{hideOutOfStock ? 'Tampil Semua' : 'Habis Disembunyikan'}</span>
                </button>
                <button
                  onClick={() => setShowMargin(m => !m)}
                  title={showMargin ? 'Sembunyikan margin' : 'Tampilkan margin produk'}
                  className={`px-2 py-1 rounded-md border flex items-center gap-1 text-[11px] font-bold transition-all shrink-0 ${showMargin ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-600' : 'bg-card hover:bg-card-hover border-border-subtle text-text-muted'}`}
                >
                  <TrendingUp className="w-3 h-3" />
                  <span>Margin</span>
                </button>
                <button
                  onClick={() => setIsShortcutGuideOpen(true)}
                  title="Buka Panduan Pintasan Keyboard Kasir [? atau F11]"
                  className="px-2 py-1 rounded-md bg-amber-500/15 hover:bg-amber-500/25 text-amber-700 dark:text-amber-300 border border-amber-500/40 flex items-center gap-1 text-[11px] font-black transition-all shrink-0 shadow-xs active:scale-95"
                >
                  <Keyboard className="w-3 h-3 text-amber-600 dark:text-amber-400" />
                  <span>[?] Panduan</span>
                </button>
              </div>
            </div>
          </div>

          {/* Category Filter Tabs */}
          <div className="px-3 py-1.5 border-b border-border-subtle flex gap-1.5 overflow-x-auto bg-surface">
            <button
              onClick={() => setSelectedCategory(null)}
              className={`px-3 py-1 rounded-md text-xs font-semibold whitespace-nowrap transition-colors ${
                selectedCategory === null
                  ? 'bg-primary text-primary-text shadow-sm'
                  : 'bg-subtle hover:bg-card-hover text-text-secondary border border-border-subtle'
              }`}
            >
              Semua ({filteredProducts.length}){hideOutOfStock && products.filter(p => p.currentStock <= 0).length > 0 && <span className="ml-1 text-[9px] text-text-muted">({products.filter(p => p.currentStock <= 0).length} disembunyikan)</span>}
            </button>
            {categories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`px-3 py-1 rounded-md text-xs font-semibold whitespace-nowrap transition-colors ${
                  selectedCategory === cat.id
                    ? 'bg-primary text-primary-text shadow-sm'
                    : 'bg-subtle hover:bg-card-hover text-text-secondary border border-border-subtle'
                }`}
              >
                {cat.name}
              </button>
            ))}
          </div>

          {/* Product Grid Area with Stock & Wholesale Badges */}
          <div className="flex-1 overflow-y-auto p-2.5">
            {filteredProducts.length === 0 && (
              <div className="h-full flex flex-col items-center justify-center text-text-muted space-y-2 py-16">
                <Search className="w-10 h-10 opacity-20" />
                <p className="text-xs font-bold text-text-primary">
                  {searchQuery ? `Produk "${searchQuery}" tidak ditemukan` : 'Tidak ada produk di kategori ini'}
                </p>
                <p className="text-[11px]">
                  {searchQuery ? 'Coba kata kunci lain atau scan barcode [F1]' : 'Tambahkan produk via menu Manajemen'}
                </p>
                {searchQuery && (
                  <button onClick={() => setSearchQuery('')}
                    className="mt-2 px-3 py-1.5 bg-primary/10 hover:bg-primary/20 text-primary border border-primary/30 rounded-lg text-xs font-bold">
                    Hapus Pencarian
                  </button>
                )}
              </div>
            )}
            <div className="grid grid-cols-3 gap-2">
              {filteredProducts.map((product) => {
                const inStock = product.currentStock > 0;
                const isLowStock = product.currentStock <= product.minStockAlert;
                const isElectronics = mode === 'Electronics';
                const isImeiItem = isElectronics && (product.name.toLowerCase().includes('galaxy') || product.name.toLowerCase().includes('iphone') || product.name.toLowerCase().includes('laptop') || product.name.toLowerCase().includes('macbook') || product.name.toLowerCase().includes('imei') || product.name.toLowerCase().includes('serial'));
                const isSimItem = isElectronics && (product.name.toLowerCase().includes('nomor cantik') || product.name.toLowerCase().includes('perdana') || product.name.toLowerCase().includes('sim-nc'));
                const isVoucherItem = isElectronics && (product.name.toLowerCase().includes('voucher') || product.name.toLowerCase().includes('kuota'));

                return (
                  <div
                    key={product.id}
                    onClick={() => {
                      if (inStock) { handleProductCardClick(product); }
                      else { useToastStore.getState().showToast(`Stok ${product.name} habis! Silakan restok terlebih dahulu.`, 'warning'); }
                    }}
                    className={`p-2.5 rounded-xl border flex flex-col justify-between transition-all select-none cursor-pointer ${
                      inStock
                        ? 'bg-card hover:bg-card-hover border-border-subtle hover:border-primary active:scale-[0.98] shadow-sm'
                        : 'bg-card/40 border-border-subtle opacity-40 cursor-default'
                    }`}
                  >
                    <div>
                      {/* Top Row: SKU & Stock Badge */}
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[11px] font-mono font-bold px-1.5 py-0.5 rounded-md bg-zinc-200/80 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 border border-zinc-300 dark:border-zinc-700 tracking-wider shadow-xs">
                          {product.sku}
                        </span>
                        <span
                          className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                            !inStock
                              ? 'bg-status-danger/10 text-status-danger'
                              : isLowStock
                              ? 'bg-status-warning/10 text-status-warning'
                              : 'bg-status-success/10 text-status-success'
                          }`}
                        >
                          {!inStock ? 'Habis' : isLowStock ? `Sisa ${product.currentStock} ${product.unit}` : `Stok: ${product.currentStock} ${product.unit}`}
                        </span>
                      </div>

                      <h3 className="text-xs font-bold text-text-primary line-clamp-2 leading-tight">
                        {product.name}
                      </h3>

                      {/* Storage / Rack Location */}
                      {product.location && (
                        <div className="mt-1 flex items-center gap-1 text-[10px] text-amber-700 dark:text-amber-400 font-medium truncate" title={`Lokasi: ${product.location}`}>
                          <MapPin className="w-2.5 h-2.5 text-amber-500 shrink-0" />
                          <span className="truncate">{product.location}</span>
                        </div>
                      )}

                      {/* Smart Badges for Electronics / Special Numbers / Vouchers */}
                      {isElectronics && (isImeiItem || isSimItem || isVoucherItem) && (
                        <div className="flex items-center gap-1 mt-1 flex-wrap">
                          {isImeiItem && (
                            <span className="px-1.5 py-0.2 rounded bg-purple-500/10 text-purple-600 font-bold text-[9px] flex items-center gap-0.5">
                              <Smartphone className="w-2.5 h-2.5" /> Unit IMEI
                            </span>
                          )}
                          {isSimItem && (
                            <span className="px-1.5 py-0.2 rounded bg-blue-500/10 text-blue-600 font-bold text-[9px] flex items-center gap-0.5">
                              <Radio className="w-2.5 h-2.5" /> SIM VIP
                            </span>
                          )}
                          {isVoucherItem && (
                            <span className="px-1.5 py-0.2 rounded bg-amber-500/10 text-amber-600 font-bold text-[9px] flex items-center gap-0.5">
                              <Clock className="w-2.5 h-2.5" /> Voucher
                            </span>
                          )}
                        </div>
                      )}

                      {/* Wholesale badge for Retail items */}
                      {mode === 'Retail' && product.wholesalePrice && product.wholesaleMinQty && (
                        <div className="mt-1 flex items-center gap-1 text-[10px] text-emerald-600 font-bold">
                          <Tag className="w-3 h-3" />
                          <span>Grosir ≥{product.wholesaleMinQty}: Rp {product.wholesalePrice.toLocaleString('id-ID')}</span>
                        </div>
                      )}

                      {/* Pharmacy Drug Classification Badge */}
                      {mode === 'Pharmacy' && (
                        <div className="mt-1 flex items-center gap-1">
                          {product.name.toLowerCase().includes('amoxicillin') || (product.category?.name || '').toLowerCase().includes('resep') ? (
                            <span className="px-1.5 py-0.5 rounded bg-rose-600 text-white font-black text-[9px] flex items-center gap-1">
                              <span className="w-3 h-3 rounded-full bg-white text-rose-600 flex items-center justify-center font-black text-[8px]">K</span>
                              <span>Obat Resep / Keras</span>
                            </span>
                          ) : (
                            <span className="px-1.5 py-0.5 rounded bg-emerald-600 text-white font-black text-[9px] flex items-center gap-1">
                              <span className="w-3 h-3 rounded-full bg-white text-emerald-600 flex items-center justify-center font-black text-[8px]">●</span>
                              <span>Obat Bebas</span>
                            </span>
                          )}
                        </div>
                      )}
                    </div>

                    <div className="pt-2 mt-2 border-t border-border-subtle flex items-center justify-between">
                      <span className="text-xs font-extrabold text-primary font-mono tabular-nums">
                        Rp {product.sellPrice.toLocaleString('id-ID')}
                      </span>
                      <div className="flex items-center gap-1">
                        {showMargin && product.buyPrice > 0 && (
                          <span className="text-[10px] font-bold text-emerald-600 font-mono">
                            +{Math.round(((product.sellPrice - product.buyPrice) / product.sellPrice) * 100)}%
                          </span>
                        )}
                        <span className="text-[11px] px-1.5 py-0.5 bg-zinc-200/80 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 rounded font-mono font-bold border border-zinc-300 dark:border-zinc-700">
                          /{product.unit}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* ========================================================= */}
        {/* RIGHT 40% : STICKY CART & RETAIL CHECKOUT ENGINE          */}
        {/* ========================================================= */}
        <section className={`w-[40%] flex flex-col bg-surface select-none border-l border-border-subtle transition-all duration-300 ${
          isScanFlashing
            ? 'ring-2 ring-emerald-500 bg-emerald-500/[0.03] shadow-xl shadow-emerald-500/10'
            : ''
        }`}>
          {/* Cart Header (Customer Info, Item Count & Clear) */}
          <div className="p-2.5 border-b border-border-subtle flex items-center justify-between bg-subtle">
            <button
              onClick={() => setIsCustomerModalOpen(true)}
              className="flex items-center gap-2 px-2 py-1 rounded-lg bg-card border border-border-subtle hover:border-primary text-xs font-semibold text-text-primary text-left transition-all"
            >
              <Users className="w-3.5 h-3.5 text-primary flex-shrink-0" />
              <div className="leading-tight">
                <p className="font-bold text-[11px] truncate max-w-[150px]">
                  {selectedCustomer ? selectedCustomer.name : 'Pelanggan Umum'}
                </p>
                {selectedCustomer?.totalReceivable ? (
                  <p className="text-[10px] text-status-danger font-mono font-bold">
                    Kasbon: Rp {selectedCustomer.totalReceivable.toLocaleString('id-ID')}
                  </p>
                ) : (
                  <p className="text-[10px] text-text-secondary font-bold">Klik untuk ganti [F3]</p>
                )}
              </div>
            </button>

            <div className="flex items-center gap-2">
              {isScanFlashing && (
                <span className="px-2 py-0.5 rounded-full bg-emerald-500 text-white text-[10px] font-bold animate-pulse flex items-center gap-1 shadow-sm">
                  <Zap className="w-3 h-3" />
                  <span>Scan Berhasil!</span>
                </span>
              )}
              <span className="text-xs font-black text-text-primary font-mono bg-zinc-200/80 dark:bg-zinc-800 px-2 py-0.5 rounded border border-zinc-300 dark:border-zinc-700">
                {getTotalItemCount()} Item
              </span>
              <button
                onClick={handleSafeClearCart}
                disabled={items.length === 0}
                className="px-2 py-1 rounded bg-card hover:bg-status-danger/10 hover:text-status-danger border border-border-subtle text-[11px] font-bold text-text-primary disabled:opacity-30"
              >
                Hapus [ESC]
              </button>
            </div>
          </div>

          {/* Cart Items List with Tiered Wholesale & Promo Badges */}
          <div className="flex-1 overflow-y-auto p-2.5 space-y-1.5">
            {items.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-text-secondary space-y-2">
                <Barcode className="w-12 h-12 opacity-35 text-text-secondary" />
                <p className="text-xs font-bold text-text-primary">Keranjang Belanja Kosong</p>
                <p className="text-[11px] text-center max-w-[200px] text-text-secondary font-medium">
                  Scan barcode [F1] atau cari nama [F2]
                </p>
              </div>
            ) : (
              items.map((item, idx) => (
                <div 
                  key={idx} 
                  onClick={() => setSelectedCartIndex(idx)}
                  className={`p-2.5 rounded-xl border space-y-1.5 transition-all cursor-pointer ${
                    selectedCartIndex === idx
                      ? 'ring-2 ring-primary border-primary bg-primary/[0.04] shadow-sm'
                      : item.isPromoReward 
                      ? 'bg-emerald-500/10 border-emerald-500/40'
                      : item.isWholesaleApplied
                      ? 'bg-emerald-500/5 border-emerald-500/30 hover:border-primary/40'
                      : 'bg-card border-border-subtle hover:border-primary/40'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <h4 className="text-xs font-bold text-text-primary leading-tight truncate">
                          {item.name}
                        </h4>
                        {item.unit && (
                          <span className="text-[10px] px-1.5 py-0.2 rounded bg-zinc-200/80 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 font-mono font-bold border border-zinc-300 dark:border-zinc-700">
                            {item.unit}
                          </span>
                        )}
                        {selectedCartIndex === idx && (
                          <span className="text-[10px] font-mono text-primary font-bold px-1.5 py-0.2 rounded bg-primary/10 border border-primary/20">
                            Aktif [+/-]
                          </span>
                        )}
                      </div>

                      {/* Electronics IMEI / Serial Number Badge */}
                      {item.serialNumber && (
                        <div className="flex items-center gap-1 text-[10px] text-primary font-bold font-mono mt-0.5">
                          <ShieldCheck className="w-3 h-3 text-emerald-500" />
                          <span>IMEI/SN: {item.serialNumber}</span>
                        </div>
                      )}

                      {/* Promo Reward Badge */}
                      {item.isPromoReward && (
                        <div className="flex items-center gap-1 text-[10px] text-emerald-600 font-bold mt-0.5">
                          <Gift className="w-3 h-3 text-emerald-500" />
                          <span>GRATIS: {item.promoRuleName}</span>
                        </div>
                      )}

                      {/* Wholesale Applied Highlight */}
                      {!item.isPromoReward && item.isWholesaleApplied ? (
                        <div className="flex items-center gap-1 text-[10px] text-emerald-600 font-bold mt-0.5">
                          <Sparkles className="w-3 h-3 text-emerald-500" />
                          <span>Harga Grosir: Rp {item.unitPrice.toLocaleString('id-ID')} / {item.unit}</span>
                        </div>
                      ) : !item.isPromoReward && item.wholesalePrice && item.wholesaleMinQty ? (
                        <p className="text-[11px] font-semibold text-emerald-700 dark:text-emerald-400">
                          Beli {item.wholesaleMinQty - item.quantity} lagi untuk harga grosir Rp {item.wholesalePrice.toLocaleString('id-ID')}
                        </p>
                      ) : null}

                      {/* F&B Modifiers & Kitchen Notes */}
                      {item.modifiers && item.modifiers.length > 0 && (
                        <div className="mt-1 space-y-0.5">
                          {item.modifiers.map((m, mi) => (
                            <p key={mi} className="text-[10px] text-amber-700 dark:text-amber-400 font-semibold pl-1">
                              • {m.modifierName || m.name} {m.price > 0 && `(+Rp ${m.price.toLocaleString('id-ID')})`}
                            </p>
                          ))}
                        </div>
                      )}
                      {item.notes && (
                        <p className="text-[10px] text-rose-600 italic pl-1 mt-0.5">
                          Catatan: "{item.notes}"
                        </p>
                      )}
                    </div>

                    <div className="flex items-center gap-1">
                      {mode === 'Pharmacy' && (
                        <button
                          onClick={(e) => { e.stopPropagation(); handleOpenItemEtiket(item); }}
                          className="px-1.5 py-1 rounded bg-emerald-600/10 hover:bg-emerald-600/20 text-emerald-600 border border-emerald-600/30 text-[10px] font-bold flex items-center gap-1 transition-all"
                          title="Cetak Etiket Aturan Pakai Obat"
                        >
                          <Pill className="w-3 h-3" />
                          <span>Etiket</span>
                        </button>
                      )}
                      {!item.isPromoReward && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            removeItem(idx);
                            if (selectedCartIndex === idx) {
                              setSelectedCartIndex(Math.max(0, idx - 1));
                            }
                          }}
                          className="p-1 rounded-md text-text-muted hover:text-status-danger hover:bg-subtle"
                          title="Hapus Baris Ini [Del]"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Bottom Row: Quantity Stepper & Line Total */}
                  <div className="flex items-center justify-between pt-1 border-t border-border-subtle/40">
                    {item.isPromoReward ? (
                      <span className="text-[11px] font-bold text-emerald-600 font-mono">
                        Hadiah Promo ({item.quantity} {item.unit})
                      </span>
                    ) : (
                      <div className="flex items-center gap-1.5 bg-subtle rounded-lg border border-border-subtle p-0.5">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            updateQty(idx, item.quantity - 1);
                            playScanBeep();
                          }}
                          className="p-1 rounded text-text-secondary hover:text-text-primary hover:bg-card"
                          title="Kurangi Kuantitas [-]"
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        <span className="text-xs font-bold font-mono px-2 tabular-nums">
                          {item.quantity}
                        </span>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            updateQty(idx, item.quantity + 1);
                            playScanBeep();
                          }}
                          className="p-1 rounded text-text-secondary hover:text-text-primary hover:bg-card"
                          title="Tambah Kuantitas [+]"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>
                    )}

                    <div className="text-right">
                      {item.isPromoReward ? (
                        <span className="text-xs font-black text-emerald-600 font-mono">
                          Rp 0 (GRATIS)
                        </span>
                      ) : (
                        <span className="text-xs font-bold text-text-primary font-mono tabular-nums">
                          Rp {item.totalPrice.toLocaleString('id-ID')}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Cart Summary & Financial Calculations */}
          <div className="p-3 border-t border-border-subtle bg-subtle space-y-2">
            <div className="space-y-1 text-xs text-text-secondary">
              <div className="flex justify-between items-center">
                <span>Subtotal Barang:</span>
                <span className="font-mono font-semibold text-text-primary">
                  Rp {getSubtotal().toLocaleString('id-ID')}
                </span>
              </div>

              {/* Wholesale Savings Banner */}
              {wholesaleSavings > 0 && (
                <div className="flex justify-between items-center text-emerald-600 font-bold">
                  <span className="flex items-center gap-1">
                    <Tag className="w-3 h-3" /> Hemat Harga Grosir:
                  </span>
                  <span className="font-mono">-Rp {wholesaleSavings.toLocaleString('id-ID')}</span>
                </div>
              )}

              {discountAmount > 0 && (
                <div className="flex justify-between items-center text-status-danger font-bold">
                  <span>Diskon Manual:</span>
                  <span className="font-mono">-Rp {discountAmount.toLocaleString('id-ID')}</span>
                </div>
              )}

              {appliedCoupon && (
                <div className="flex justify-between items-center text-indigo-600 font-bold">
                  <span className="flex items-center gap-1">
                    <Ticket className="w-3 h-3" /> Kupon ({appliedCoupon.couponCode}):
                  </span>
                  <span className="font-mono">-Rp {appliedCoupon.discountAmount.toLocaleString('id-ID')}</span>
                </div>
              )}

              {redeemedPoints > 0 && (
                <div className="flex justify-between items-center text-amber-600 font-bold">
                  <span className="flex items-center gap-1">
                    <Star className="w-3 h-3" /> Tukar {redeemedPoints} Poin:
                  </span>
                  <span className="font-mono">-Rp {redeemedPointsDiscountAmount.toLocaleString('id-ID')}</span>
                </div>
              )}

              {/* Trade-In Deduction */}
              {tradeIn && (
                <div className="flex justify-between items-center text-purple-600 font-bold">
                  <span className="flex items-center gap-1">
                    <RefreshCw className="w-3 h-3" /> Tukar Tambah ({tradeIn.deviceBrandModel}):
                  </span>
                  <span className="font-mono">-Rp {tradeIn.valuationAmount.toLocaleString('id-ID')}</span>
                </div>
              )}

              <div className="pt-2 border-t border-border-subtle flex justify-between items-baseline">
                <span className="text-sm font-extrabold text-text-primary">Total Tagihan:</span>
                <span className="text-2xl font-black text-primary font-mono tabular-nums tracking-tight">
                  Rp {getTotalAmount().toLocaleString('id-ID')}
                </span>
              </div>
            </div>

            {/* Quick Cash Suggestions Bar */}
            {items.length > 0 && quickCashOptions.length > 0 && (
              <div className="pt-1">
                <p className="text-[11px] font-bold text-text-primary mb-1 flex items-center gap-1">
                  <Banknote className="w-3.5 h-3.5 text-status-success" />
                  Bayar Cepat Pecahan Uang Tunai:
                </p>
                <div className="flex flex-wrap gap-1">
                  {quickCashOptions.map((opt, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleCheckoutSubmit([{ method: 'Cash', amount: opt }])}
                      className="px-2 py-1 rounded bg-card hover:bg-primary hover:text-primary-text border border-border-subtle text-[11px] font-bold font-mono text-text-primary transition-all shadow-sm active:scale-95"
                    >
                      {opt === getTotalAmount() ? 'Uang Pas' : `Rp ${opt.toLocaleString('id-ID')}`}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Major Dual Action Buttons: [F8] Quick Action & [F9] Full Checkout */}
            <div className="grid grid-cols-2 gap-2 pt-1">
              {mode === 'FoodAndBeverage' ? (
                <button
                  onClick={handleSendToKitchen}
                  disabled={items.length === 0}
                  className="py-3 px-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 shadow-sm transition-all active:scale-95 disabled:opacity-40"
                >
                  <ChefHat className="w-4 h-4" />
                  <span>[F8] KIRIM DAPUR</span>
                </button>
              ) : (
                <button
                  onClick={handleQuickExactCashCheckout}
                  disabled={items.length === 0}
                  className="py-3 px-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 shadow-sm transition-all active:scale-95 disabled:opacity-40"
                >
                  <Zap className="w-4 h-4" />
                  <span>[F8] UANG PAS</span>
                </button>
              )}

              <button
                onClick={() => setIsPaymentOpen(true)}
                disabled={items.length === 0}
                className="py-3 px-2 rounded-xl bg-primary hover:bg-primary-hover text-primary-text font-bold text-xs flex items-center justify-center gap-1.5 shadow-md transition-all active:scale-95 disabled:opacity-40"
              >
                <span>[F9] BAYAR LENGKAP</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </section>
          </>
        )}
      </div>

      {/* POS Interactive Hotkey Action Bar (Sleek Black Deck with High-Contrast Text & Keycaps) */}
      <footer className="w-full px-2 py-1.5 bg-zinc-950 text-white text-xs font-mono flex items-center justify-between border-t-2 border-zinc-800 shrink-0 gap-1.5 shadow-2xl min-h-[42px] overflow-hidden">
        {/* Left Section: Action Shortcuts (F1 - F9) - Smooth internal scroll if window is very narrow, NEVER pushing the right section */}
        <div className="flex-1 min-w-0 flex items-center gap-1 overflow-x-auto no-scrollbar py-0.5">
          {/* F1 */}
          <button
            onClick={() => {
              barcodeInputRef.current?.focus();
              barcodeInputRef.current?.select();
              triggerActiveShortcut('F1');
            }}
            className={`px-1.5 py-1 rounded-lg border flex items-center gap-1 transition-all text-xs active:scale-95 cursor-pointer shrink-0 ${
              activeShortcutKey === 'F1'
                ? 'bg-primary text-white border-2 border-white ring-4 ring-primary/50 shadow-xl'
                : 'bg-zinc-900/90 hover:bg-zinc-800 text-white border-zinc-700 hover:border-zinc-500 shadow-sm'
            }`}
            title="Scan Barcode / Timbangan [F1]"
          >
            <kbd className={`px-1.5 py-0.2 rounded text-[10px] font-mono font-black shadow-sm ${
              activeShortcutKey === 'F1' ? 'bg-white text-primary' : 'bg-zinc-100 text-zinc-950 border border-white'
            }`}>F1</kbd>
            <span className="font-sans font-black text-white text-xs">Scan</span>
          </button>

          {/* F2 */}
          <button
            onClick={() => {
              searchInputRef.current?.focus();
              searchInputRef.current?.select();
              triggerActiveShortcut('F2');
            }}
            className={`px-1.5 py-1 rounded-lg border flex items-center gap-1 transition-all text-xs active:scale-95 cursor-pointer shrink-0 ${
              activeShortcutKey === 'F2'
                ? 'bg-primary text-white border-2 border-white ring-4 ring-primary/50 shadow-xl'
                : 'bg-zinc-900/90 hover:bg-zinc-800 text-white border-zinc-700 hover:border-zinc-500 shadow-sm'
            }`}
            title="Cari Produk di Katalog [F2]"
          >
            <kbd className={`px-1.5 py-0.2 rounded text-[10px] font-mono font-black shadow-sm ${
              activeShortcutKey === 'F2' ? 'bg-white text-primary' : 'bg-zinc-100 text-zinc-950 border border-white'
            }`}>F2</kbd>
            <span className="font-sans font-black text-white text-xs">Cari</span>
          </button>

          {/* F3 */}
          <button
            onClick={() => {
              setIsCustomerModalOpen(true);
              triggerActiveShortcut('F3');
            }}
            className={`px-1.5 py-1 rounded-lg border flex items-center gap-1 transition-all text-xs active:scale-95 cursor-pointer shrink-0 ${
              activeShortcutKey === 'F3'
                ? 'bg-primary text-white border-2 border-white ring-4 ring-primary/50 shadow-xl'
                : 'bg-zinc-900/90 hover:bg-zinc-800 text-white border-zinc-700 hover:border-zinc-500 shadow-sm'
            }`}
            title={`Pilih ${mode === 'Pharmacy' ? 'Pasien' : 'Pelanggan'} [F3]`}
          >
            <kbd className={`px-1.5 py-0.2 rounded text-[10px] font-mono font-black shadow-sm ${
              activeShortcutKey === 'F3' ? 'bg-white text-primary' : 'bg-zinc-100 text-zinc-950 border border-white'
            }`}>F3</kbd>
            <span className="font-sans font-black text-white text-xs">
              {mode === 'Pharmacy' ? 'Pasien' : 'Member'}
            </span>
          </button>

          {/* F4 */}
          <button
            onClick={() => {
              setIsDiscountModalOpen(true);
              triggerActiveShortcut('F4');
            }}
            className={`px-1.5 py-1 rounded-lg border flex items-center gap-1 transition-all text-xs active:scale-95 cursor-pointer shrink-0 ${
              activeShortcutKey === 'F4'
                ? 'bg-primary text-white border-2 border-white ring-4 ring-primary/50 shadow-xl'
                : 'bg-zinc-900/90 hover:bg-zinc-800 text-white border-zinc-700 hover:border-zinc-500 shadow-sm'
            }`}
            title="Diskon Transaksi [F4]"
          >
            <kbd className={`px-1.5 py-0.2 rounded text-[10px] font-mono font-black shadow-sm ${
              activeShortcutKey === 'F4' ? 'bg-white text-primary' : 'bg-zinc-100 text-zinc-950 border border-white'
            }`}>F4</kbd>
            <span className="font-sans font-black text-white text-xs">Diskon</span>
          </button>

          {/* F5 Mode Specific */}
          {mode === 'Retail' && (
            <button
              onClick={() => {
                useHardwareStore.getState().openManualScale({
                  id: 'generic-scale-item',
                  name: 'Item Timbangan Manual',
                  sku: 'SCALE-MANUAL',
                  sellPrice: 0,
                  currentStock: 999,
                  unit: 'KG',
                  categoryId: '',
                  businessMode: 0,
                  buyPrice: 0,
                  trackStock: false,
                  hasVariants: false,
                  isKitchenItem: false,
                  minStockAlert: 0
                } as any);
                triggerActiveShortcut('F5');
              }}
              className={`px-1.5 py-1 rounded-lg border flex items-center gap-1 transition-all text-xs active:scale-95 cursor-pointer shrink-0 ${
                activeShortcutKey === 'F5'
                  ? 'bg-purple-600 text-white border-2 border-white ring-4 ring-purple-400/50 shadow-xl'
                  : 'bg-purple-950/80 hover:bg-purple-900 text-purple-100 border-purple-500/80 shadow-sm'
              }`}
              title="Timbang Manual Digital [F5]"
            >
              <kbd className="px-1.5 py-0.2 rounded bg-purple-400 text-purple-950 font-mono font-black text-[10px] shadow-sm">F5</kbd>
              <span className="font-sans font-black text-purple-100 text-xs">Timbang</span>
            </button>
          )}

          {mode === 'Electronics' && (
            <button
              onClick={() => {
                setIsTradeInModalOpen(true);
                triggerActiveShortcut('F5');
              }}
              className={`px-1.5 py-1 rounded-lg border flex items-center gap-1 transition-all text-xs active:scale-95 cursor-pointer shrink-0 ${
                activeShortcutKey === 'F5'
                  ? 'bg-purple-600 text-white border-2 border-white ring-4 ring-purple-400/50 shadow-xl'
                  : 'bg-purple-950/80 hover:bg-purple-900 text-purple-100 border-purple-500/80 shadow-sm'
              }`}
              title="Tukar Tambah Gadget [F5]"
            >
              <kbd className="px-1.5 py-0.2 rounded bg-purple-400 text-purple-950 font-mono font-black text-[10px] shadow-sm">F5</kbd>
              <span className="font-sans font-black text-purple-100 text-xs">Trade-In</span>
            </button>
          )}

          {mode === 'FoodAndBeverage' && (
            <button
              onClick={() => {
                if (items.length > 0) setIsSplitBillModalOpen(true);
                triggerActiveShortcut('F5');
              }}
              disabled={items.length === 0}
              className={`px-1.5 py-1 rounded-lg border flex items-center gap-1 transition-all text-xs active:scale-95 cursor-pointer shrink-0 ${
                activeShortcutKey === 'F5'
                  ? 'bg-amber-600 text-white border-2 border-white ring-4 ring-amber-400/50 shadow-xl'
                  : items.length > 0
                  ? 'bg-amber-950/80 hover:bg-amber-900 text-amber-100 border-amber-500/80 shadow-sm'
                  : 'bg-zinc-900/60 text-zinc-500 border-zinc-800 cursor-not-allowed'
              }`}
              title="Split Bill Tagihan [F5]"
            >
              <kbd className={`px-1.5 py-0.2 rounded text-[10px] font-mono font-black shadow-sm ${
                items.length > 0 ? 'bg-amber-400 text-amber-950' : 'bg-zinc-800 text-zinc-500 border border-zinc-700'
              }`}>F5</kbd>
              <span className={`font-sans font-black text-xs ${items.length > 0 ? 'text-amber-100' : 'text-zinc-500'}`}>Split</span>
            </button>
          )}

          {mode === 'Pharmacy' && (
            <button
              onClick={() => {
                setPharmacyEtiketData({
                  patientName: selectedCustomer?.name || '',
                  doctorName: '',
                  medicineName: items[items.length - 1]?.name || '',
                  signa: '3 x 1 sehari',
                  consumptionTime: 'Sesudah Makan',
                  type: 'putih'
                });
                setIsPharmacyEtiketOpen(true);
                triggerActiveShortcut('F5');
              }}
              className={`px-1.5 py-1 rounded-lg border flex items-center gap-1 transition-all text-xs active:scale-95 cursor-pointer shrink-0 ${
                activeShortcutKey === 'F5'
                  ? 'bg-teal-600 text-white border-2 border-white ring-4 ring-teal-400/50 shadow-xl'
                  : 'bg-teal-950/80 hover:bg-teal-900 text-teal-100 border-teal-500/80 shadow-sm'
              }`}
              title="Cetak Etiket Aturan Pakai Obat [F5]"
            >
              <kbd className="px-1.5 py-0.2 rounded bg-teal-400 text-teal-950 font-mono font-black text-[10px] shadow-sm">F5</kbd>
              <span className="font-sans font-black text-teal-100 text-xs">Etiket</span>
            </button>
          )}

          {/* F6 Pending */}
          <button
            onClick={() => {
              if (items.length > 0) {
                parkCurrentOrder();
                useToastStore.getState().showToast('Transaksi aktif berhasil ditahan (Pending)!', 'info');
              } else {
                setIsPendingModalOpen(true);
              }
              triggerActiveShortcut('F6');
            }}
            className={`px-1.5 py-1 rounded-lg border flex items-center gap-1 transition-all text-xs active:scale-95 cursor-pointer shrink-0 ${
              activeShortcutKey === 'F6'
                ? 'bg-amber-600 text-white border-2 border-white ring-4 ring-amber-400/50 shadow-xl'
                : parkedOrders.length > 0
                ? 'bg-amber-950/90 hover:bg-amber-900 text-amber-100 border-amber-400 shadow-md'
                : 'bg-zinc-900/90 hover:bg-zinc-800 text-white border-zinc-700 hover:border-zinc-500 shadow-sm'
            }`}
            title={`Tahan / Buka Antrean Pending [F6] (${parkedOrders.length})`}
          >
            <kbd className={`px-1.5 py-0.2 rounded text-[10px] font-mono font-black shadow-sm ${
              parkedOrders.length > 0 ? 'bg-amber-400 text-amber-950' : 'bg-zinc-100 text-zinc-950 border border-white'
            }`}>F6</kbd>
            <span className="font-sans font-black text-white text-xs">
              Hold
              {parkedOrders.length > 0 && (
                <span className="ml-1 px-1.5 py-0.2 rounded-full bg-amber-400 text-black text-[10px] font-black">
                  {parkedOrders.length}
                </span>
              )}
            </span>
          </button>

          {/* F7 Mode Specific */}
          {mode === 'Electronics' ? (
            <button
              onClick={() => {
                setIsServicePickupOpen(true);
                triggerActiveShortcut('F7');
              }}
              className={`px-1.5 py-1 rounded-lg border flex items-center gap-1 transition-all text-xs active:scale-95 cursor-pointer shrink-0 ${
                activeShortcutKey === 'F7'
                  ? 'bg-blue-600 text-white border-2 border-white ring-4 ring-blue-400/50 shadow-xl'
                  : 'bg-blue-950/80 hover:bg-blue-900 text-blue-100 border-blue-500/80 shadow-sm'
              }`}
              title="Ambil Servis Pelanggan [F7]"
            >
              <kbd className="px-1.5 py-0.2 rounded bg-blue-400 text-blue-950 font-mono font-black text-[10px] shadow-sm">F7</kbd>
              <span className="font-sans font-black text-blue-100 text-xs">Servis</span>
            </button>
          ) : mode === 'FoodAndBeverage' ? (
            <button
              onClick={() => {
                if (items.length > 0) handleOpenCartGuestCheck();
                triggerActiveShortcut('F7');
              }}
              disabled={items.length === 0}
              className={`px-1.5 py-1 rounded-lg border flex items-center gap-1 transition-all text-xs active:scale-95 cursor-pointer shrink-0 ${
                activeShortcutKey === 'F7'
                  ? 'bg-blue-600 text-white border-2 border-white ring-4 ring-blue-400/50 shadow-xl'
                  : items.length > 0
                  ? 'bg-blue-950/80 hover:bg-blue-900 text-blue-100 border-blue-500/80 shadow-sm'
                  : 'bg-zinc-900/60 text-zinc-500 border-zinc-800 cursor-not-allowed'
              }`}
              title="Cetak Pra-Tagihan Guest Check [F7]"
            >
              <kbd className={`px-1.5 py-0.2 rounded text-[10px] font-mono font-black shadow-sm ${
                items.length > 0 ? 'bg-blue-400 text-blue-950' : 'bg-zinc-800 text-zinc-500 border border-zinc-700'
              }`}>F7</kbd>
              <span className={`font-sans font-black text-xs ${items.length > 0 ? 'text-blue-100' : 'text-zinc-500'}`}>Pra-Bill</span>
            </button>
          ) : (
            <button
              onClick={() => {
                if (lastCompletedOrder) {
                  handleReprintLastReceipt();
                } else {
                  useToastStore.getState().showToast('Belum ada transaksi terakhir untuk dicetak ulang [F7]', 'info');
                }
                triggerActiveShortcut('F7');
              }}
              className={`px-1.5 py-1 rounded-lg border flex items-center gap-1 transition-all text-xs active:scale-95 cursor-pointer shrink-0 ${
                activeShortcutKey === 'F7'
                  ? 'bg-primary text-white border-2 border-white ring-4 ring-primary/50 shadow-xl'
                  : 'bg-zinc-900/90 hover:bg-zinc-800 text-white border-zinc-700 hover:border-zinc-500 shadow-sm'
              }`}
              title="Cetak Ulang Nota Terakhir [F7]"
            >
              <kbd className={`px-1.5 py-0.2 rounded text-[10px] font-mono font-black shadow-sm ${
                activeShortcutKey === 'F7' ? 'bg-white text-primary' : 'bg-zinc-100 text-zinc-950 border border-white'
              }`}>F7</kbd>
              <span className="font-sans font-black text-white text-xs">Ulang</span>
            </button>
          )}

          {/* F8 Quick Action */}
          {mode === 'FoodAndBeverage' ? (
            <button
              onClick={() => {
                if (items.length > 0) handleSendToKitchen();
                triggerActiveShortcut('F8');
              }}
              disabled={items.length === 0}
              className={`px-1.5 py-1 rounded-lg border-2 flex items-center gap-1 transition-all text-xs active:scale-95 cursor-pointer shrink-0 ${
                activeShortcutKey === 'F8'
                  ? 'bg-rose-500 text-white border-white ring-4 ring-rose-400/50 shadow-xl'
                  : items.length > 0
                  ? 'bg-rose-600 hover:bg-rose-500 text-white border-rose-400 shadow-lg ring-1 ring-rose-500/50'
                  : 'bg-zinc-900/60 text-zinc-400 border-zinc-800 cursor-not-allowed'
              }`}
              title="Kirim Pesanan ke Dapur (KDS) [F8]"
            >
              <kbd className={`px-1.5 py-0.2 rounded text-[10px] font-mono font-black shadow-sm ${
                items.length > 0 ? 'bg-rose-950 text-rose-300 border border-rose-400' : 'bg-zinc-800 text-zinc-400 border border-zinc-700'
              }`}>F8</kbd>
              <span className={`font-sans font-black uppercase tracking-wider text-xs ${items.length > 0 ? 'text-white' : 'text-zinc-400'}`}>Dapur</span>
            </button>
          ) : (
            <button
              onClick={() => {
                if (items.length > 0) handleQuickExactCashCheckout();
                triggerActiveShortcut('F8');
              }}
              disabled={items.length === 0}
              className={`px-1.5 py-1 rounded-lg border-2 flex items-center gap-1 transition-all text-xs active:scale-95 cursor-pointer shrink-0 ${
                activeShortcutKey === 'F8'
                  ? 'bg-emerald-500 text-white border-white ring-4 ring-emerald-400/50 shadow-xl'
                  : items.length > 0
                  ? 'bg-emerald-600 hover:bg-emerald-500 text-white border-emerald-400 shadow-lg ring-1 ring-emerald-500/50'
                  : 'bg-zinc-900/60 text-zinc-400 border-zinc-800 cursor-not-allowed'
              }`}
              title="Bayar Cepat Uang Pas [F8]"
            >
              <kbd className={`px-1.5 py-0.2 rounded text-[10px] font-mono font-black shadow-sm ${
                items.length > 0 ? 'bg-emerald-950 text-emerald-300 border border-emerald-400' : 'bg-zinc-800 text-zinc-400 border border-zinc-700'
              }`}>F8</kbd>
              <span className={`font-sans font-black uppercase tracking-wider text-xs ${items.length > 0 ? 'text-white' : 'text-zinc-400'}`}>PAS</span>
            </button>
          )}

          {/* F9 Full Checkout */}
          <button
            onClick={() => {
              if (items.length > 0) setIsPaymentOpen(true);
              triggerActiveShortcut('F9');
            }}
            disabled={items.length === 0}
            className={`px-1.5 py-1 rounded-lg border-2 flex items-center gap-1 transition-all text-xs active:scale-95 cursor-pointer shrink-0 ${
              activeShortcutKey === 'F9'
                ? 'bg-primary text-white border-white ring-4 ring-primary/50 shadow-xl'
                : items.length > 0
                ? 'bg-primary hover:bg-primary-hover text-white border-primary-light shadow-lg ring-1 ring-primary/50'
                : 'bg-zinc-900/60 text-zinc-400 border-zinc-800 cursor-not-allowed'
            }`}
            title="Buka Pembayaran Lengkap [F9]"
          >
            <kbd className={`px-1.5 py-0.2 rounded text-[10px] font-mono font-black shadow-sm ${
              items.length > 0 ? 'bg-black/40 text-white border border-white/40' : 'bg-zinc-800 text-zinc-400 border border-zinc-700'
            }`}>F9</kbd>
            <span className={`font-sans font-black uppercase tracking-wider text-xs ${items.length > 0 ? 'text-white' : 'text-zinc-400'}`}>Bayar</span>
          </button>

          {/* F10 Focus Mode */}
          <button
            onClick={() => {
              triggerActiveShortcut('F10');
              toggleFocusMode();
            }}
            className={`px-1.5 py-1 rounded-lg border-2 flex items-center gap-1 transition-all text-xs active:scale-95 cursor-pointer shrink-0 ${
              activeShortcutKey === 'F10'
                ? 'bg-amber-500 text-white border-white ring-4 ring-amber-400/50 shadow-xl'
                : isFocusMode
                ? 'bg-amber-500 hover:bg-amber-400 text-white border-amber-300 shadow-lg ring-1 ring-amber-500/50'
                : 'bg-zinc-900/90 hover:bg-zinc-800 text-white border-zinc-700 hover:border-zinc-500 shadow-sm'
            }`}
            title="Toggle Mode Fokus Kasir [F10]"
          >
            <kbd className={`px-1.5 py-0.2 rounded text-[10px] font-mono font-black shadow-sm ${
              isFocusMode ? 'bg-black/40 text-white border border-white/40' : 'bg-zinc-100 text-zinc-950 border border-white'
            }`}>F10</kbd>
            <span className="font-sans font-black text-xs">
              {isFocusMode ? 'Normal' : 'Fokus'}
            </span>
          </button>
        </div>

        {/* Right Section: Permanently Pinned Navigation, Adjustments & High-Visibility Guide (NEVER CUT OFF) */}
        <div className="shrink-0 flex items-center gap-1 text-zinc-300 pl-2 border-l border-zinc-800 bg-zinc-950">
          <div className="flex items-center gap-0.5">
            <button
              onClick={() => {
                if (items.length > 0) setSelectedCartIndex(prev => (prev === null || prev <= 0 ? items.length - 1 : prev - 1));
              }}
              title="Pilih Baris Item Sebelumnya [↑]"
              className="w-6 h-6 rounded bg-zinc-800 hover:bg-zinc-700 border border-zinc-600 text-white font-mono font-black text-xs flex items-center justify-center shadow-sm transition-all cursor-pointer active:scale-95"
            >
              ↑
            </button>
            <button
              onClick={() => {
                if (items.length > 0) setSelectedCartIndex(prev => (prev === null || prev >= items.length - 1 ? 0 : prev + 1));
              }}
              title="Pilih Baris Item Berikutnya [↓]"
              className="w-6 h-6 rounded bg-zinc-800 hover:bg-zinc-700 border border-zinc-600 text-white font-mono font-black text-xs flex items-center justify-center shadow-sm transition-all cursor-pointer active:scale-95"
            >
              ↓
            </button>
          </div>

          <div className="flex items-center gap-0.5 pl-0.5 border-l border-zinc-800">
            <button
              onClick={() => { incrementSelectedItem(); triggerActiveShortcut('+'); }}
              disabled={items.length === 0}
              className={`w-6 h-6 rounded-md border text-xs font-mono font-black flex items-center justify-center transition-all cursor-pointer shadow-sm ${
                activeShortcutKey === '+'
                  ? 'bg-primary text-white border-white shadow-md'
                  : items.length > 0
                  ? 'bg-zinc-800 hover:bg-zinc-700 text-white border-zinc-600'
                  : 'bg-zinc-900/60 text-zinc-500 border-zinc-800 cursor-not-allowed'
              }`}
              title="Tambah Qty Item Terpilih [+]"
            >
              +
            </button>
            <button
              onClick={() => { decrementSelectedItem(); triggerActiveShortcut('-'); }}
              disabled={items.length === 0}
              className={`w-6 h-6 rounded-md border text-xs font-mono font-black flex items-center justify-center transition-all cursor-pointer shadow-sm ${
                activeShortcutKey === '-'
                  ? 'bg-primary text-white border-white shadow-md'
                  : items.length > 0
                  ? 'bg-zinc-800 hover:bg-zinc-700 text-white border-zinc-600'
                  : 'bg-zinc-900/60 text-zinc-500 border-zinc-800 cursor-not-allowed'
              }`}
              title="Kurangi Qty Item Terpilih [-]"
            >
              -
            </button>
            <button
              onClick={() => { removeSelectedItem(); triggerActiveShortcut('Del'); }}
              disabled={items.length === 0}
              className={`px-1.5 h-6 rounded-md border text-[11px] font-mono font-black flex items-center justify-center transition-all cursor-pointer shadow-sm ${
                activeShortcutKey === 'Del'
                  ? 'bg-rose-600 text-white border-white shadow-md'
                  : items.length > 0
                  ? 'bg-rose-950 hover:bg-rose-900 text-rose-200 border-rose-600'
                  : 'bg-zinc-900/60 text-zinc-500 border-zinc-800 cursor-not-allowed'
              }`}
              title="Hapus Baris Item Terpilih [Del]"
            >
              Del
            </button>
            <button
              onClick={() => { handleSafeClearCart(); triggerActiveShortcut('ESC'); }}
              disabled={items.length === 0}
              className={`px-1.5 h-6 rounded-md border text-[11px] font-mono font-black flex items-center justify-center transition-all cursor-pointer shadow-sm ${
                activeShortcutKey === 'ESC'
                  ? 'bg-zinc-700 text-white border-white shadow-md'
                  : items.length > 0
                  ? 'bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border-zinc-600'
                  : 'bg-zinc-900/60 text-zinc-500 border-zinc-800 cursor-not-allowed'
              }`}
              title="Batalkan / Bersihkan Keranjang [ESC]"
            >
              ESC
            </button>
          </div>

          {/* Dedicated Shortcut Help Button - ALWAYS VISIBLE & PROMINENT */}
          <button
            onClick={() => {
              setIsShortcutGuideOpen(true);
              triggerActiveShortcut('?');
            }}
            className={`ml-1 px-2.5 py-1 rounded-lg border text-xs font-black transition-all flex items-center gap-1.5 cursor-pointer shadow-md shrink-0 active:scale-95 ${
              activeShortcutKey === '?'
                ? 'bg-amber-400 text-zinc-950 border-white ring-4 ring-amber-400/50 shadow-xl'
                : 'bg-amber-500 hover:bg-amber-400 text-zinc-950 border-amber-300'
            }`}
            title="Buka Panduan Pintasan Keyboard Kasir [? atau F11]"
          >
            <kbd className="px-1 py-0.2 rounded bg-zinc-950 text-amber-400 font-mono font-black text-[10px] leading-none">?</kbd>
            <span className="font-sans font-black text-zinc-950 tracking-wide text-xs">Panduan</span>
          </button>
        </div>
      </footer>

      {/* Global POS Modals */}
      <CustomerKasbonModal
        isOpen={isCustomerModalOpen}
        onClose={() => setIsCustomerModalOpen(false)}
      />

      <PendingOrdersModal
        isOpen={isPendingModalOpen}
        onClose={() => setIsPendingModalOpen(false)}
      />

      <DiscountTransactionModal
        isOpen={isDiscountModalOpen}
        subtotal={getSubtotal()}
        currentDiscount={discountAmount}
        onClose={() => setIsDiscountModalOpen(false)}
        onApplyDiscount={(amount, reason) => setDiscount(amount, reason)}
      />

      <PaymentModal
        isOpen={isPaymentOpen}
        totalAmount={getTotalAmount()}
        customerName={selectedCustomer?.name}
        customerPoints={selectedCustomer?.loyaltyPoints}
        customerDepositBalance={selectedCustomer?.depositBalance}
        customerCreditLimit={selectedCustomer?.creditLimit}
        customerCurrentDebt={selectedCustomer?.totalReceivable}
        onClose={() => setIsPaymentOpen(false)}
        onSubmitPayment={handleCheckoutSubmit}
        onRedeemPoints={handleRedeemLoyaltyPoints}
      />

      <PaymentSuccessModal
        isOpen={isSuccessOpen}
        orderNumber={completedOrder?.invoiceNumber || ''}
        totalAmount={completedOrder?.totalAmount || 0}
        changeAmount={completedOrder?.changeAmount || 0}
        subtotal={completedOrder?.subtotal}
        discountAmount={completedOrder?.discountAmount}
        couponCode={completedOrder?.couponCode}
        couponDiscountAmount={completedOrder?.couponDiscountAmount}
        redeemedPoints={completedOrder?.redeemedPoints}
        redeemedPointsDiscountAmount={completedOrder?.redeemedPointsDiscountAmount}
        earnedPoints={completedOrder?.earnedPoints}
        customerRemainingPoints={completedOrder?.customerLoyaltyPointsRemaining}
        customerName={completedOrder?.customerName || selectedCustomer?.name}
        customerPhone={completedOrder?.customerPhone || selectedCustomer?.phoneNumber}
        items={completedOrder?.items}
        payments={completedOrder?.payments}
        onClose={() => setIsSuccessOpen(false)}
        onPrintReceipt={handlePrintReceipt}
      />

      <ImeiSelectModal
        isOpen={isImeiModalOpen}
        product={selectedImeiProduct}
        onClose={() => {
          setIsImeiModalOpen(false);
          setSelectedImeiProduct(null);
        }}
        onSelectImei={handleSelectImeiUnit}
      />

      <SimCardSelectModal
        isOpen={isSimCardModalOpen}
        product={selectedSimProduct}
        onClose={() => {
          setIsSimCardModalOpen(false);
          setSelectedSimProduct(null);
        }}
        onSelectSimCard={handleSelectSimCard}
      />

      <TradeInModal
        isOpen={isTradeInModalOpen}
        onClose={() => setIsTradeInModalOpen(false)}
        onApplyTradeIn={(data) => setTradeIn(data)}
        currentTradeIn={tradeIn}
        onRemoveTradeIn={() => setTradeIn(null)}
      />

      <ServicePickupModal
        isOpen={isServicePickupOpen}
        onClose={() => setIsServicePickupOpen(false)}
        onSelectServiceTicket={(ticket) => {
          addServiceTicketSettlement(ticket);
          useToastStore.getState().showToast(`Sisa pelunasan tiket ${ticket.ticketNumber} ditambahkan ke keranjang kasir!`, 'success');
        }}
      />

      {/* F&B Modals */}
      <MenuModifierModal
        isOpen={isModifierModalOpen}
        product={selectedModifierProduct}
        onClose={() => {
          setIsModifierModalOpen(false);
          setSelectedModifierProduct(null);
        }}
        onConfirm={handleConfirmModifiers}
      />

      <SplitBillModal
        isOpen={isSplitBillModalOpen}
        tableNumber={selectedTable?.tableNumber}
        totalAmount={getTotalAmount()}
        items={items}
        onClose={() => setIsSplitBillModalOpen(false)}
      />

      <GuestCheckModal
        isOpen={isGuestCheckOpen}
        data={guestCheckData}
        onClose={() => setIsGuestCheckOpen(false)}
      />

      {/* Pharmacy Etiket Modal */}
      <EtiketObatModal
        isOpen={isPharmacyEtiketOpen}
        onClose={() => setIsPharmacyEtiketOpen(false)}
        initialData={pharmacyEtiketData}
      />

      {/* Keyboard Shortcut Guide Modal */}
      <ShortcutGuideModal
        isOpen={isShortcutGuideOpen}
        onClose={() => setIsShortcutGuideOpen(false)}
        mode={mode}
      />

      {/* Scanner Hardware Detection & Test Modal */}
      <ScannerHardwareModal />
    </div>
  );
};
export default PosPage;
