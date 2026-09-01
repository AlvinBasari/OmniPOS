import React, { useState, useEffect, useRef } from 'react';
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
  Scale
} from 'lucide-react';
import { useHardwareStore } from '../store/useHardwareStore';
import { Product, Category, PaymentMethod, ProductSerialNumber, SimCardSpecialNumber, DeviceServiceTicket } from '../types';
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

export const PosPage: React.FC = () => {
  const {
    items,
    selectedCustomer,
    selectedTable,
    discountAmount,
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
    getTradeInAmount,
    getTotalAmount,
    getWholesaleSavings,
    getTotalItemCount,
    getQuickCashSuggestions
  } = useCartStore();

  const { activeShift } = useShiftStore();
  const { mode, edition } = useBusinessModeStore();

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

  const barcodeInputRef = useRef<HTMLInputElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const handleProductCardClick = (product: Product) => {
    const pName = product.name.toLowerCase();
    const pUnit = (product.unit || '').toUpperCase();
    if (pUnit === 'KG' || pUnit === 'GRAM' || pUnit === 'KILO' || pUnit === 'GR') {
      useHardwareStore.getState().openManualScale(product);
    } else if (mode === 'Electronics' && (pName.includes('nomor cantik') || pName.includes('perdana') || pName.includes('sim-nc') || pName.includes('kartu perdana'))) {
      setSelectedSimProduct(product);
      setIsSimCardModalOpen(true);
    } else if (mode === 'Electronics' && (pName.includes('imei') || pName.includes('serial') || pName.includes('galaxy') || pName.includes('iphone') || pName.includes('laptop') || pName.includes('macbook'))) {
      setSelectedImeiProduct(product);
      setIsImeiModalOpen(true);
    } else {
      addItem(product);
    }
  };

  const handleSelectImeiUnit = (serial: ProductSerialNumber) => {
    if (selectedImeiProduct) {
      addItem(selectedImeiProduct, undefined, [], 1, serial.serialNo);
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
      const res = await fetch('/api/v1/products');
      if (res.ok) {
        const data: Product[] = await res.json();
        setProducts(data);
      }
    } catch {}
  };

  const fetchCategories = async () => {
    try {
      const res = await fetch('/api/v1/categories');
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
      const isTyping = (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') && target !== barcodeInputRef.current;

      if (e.key === 'F1') {
        e.preventDefault();
        barcodeInputRef.current?.focus();
        barcodeInputRef.current?.select();
      } else if (e.key === 'F2') {
        e.preventDefault();
        searchInputRef.current?.focus();
        searchInputRef.current?.select();
      } else if (e.key === 'F3') {
        e.preventDefault();
        setIsCustomerModalOpen(true);
      } else if (e.key === 'F4') {
        e.preventDefault();
        setIsDiscountModalOpen(true);
      } else if (e.key === 'F5') {
        e.preventDefault();
        setIsTradeInModalOpen(true);
      } else if (e.key === 'F6') {
        e.preventDefault();
        if (items.length > 0) {
          parkCurrentOrder();
          useToastStore.getState().showToast('Transaksi aktif berhasil ditahan (Hold)!', 'info');
        } else {
          setIsPendingModalOpen(true);
        }
      } else if (e.key === 'F7') {
        e.preventDefault();
        setIsServicePickupOpen(true);
      } else if (e.key === 'F8') {
        e.preventDefault();
        if (items.length > 0) {
          handleQuickExactCashCheckout();
        }
      } else if (e.key === 'F9') {
        e.preventDefault();
        if (items.length > 0) {
          setIsPaymentOpen(true);
        } else if (lastCompletedOrder) {
          handleReprintLastReceipt();
        }
      } else if (e.key === 'Escape') {
        if (isPaymentOpen) setIsPaymentOpen(false);
        else if (isSuccessOpen) setIsSuccessOpen(false);
        else if (isCustomerModalOpen) setIsCustomerModalOpen(false);
        else if (isPendingModalOpen) setIsPendingModalOpen(false);
        else if (isDiscountModalOpen) setIsDiscountModalOpen(false);
        else if (isTradeInModalOpen) setIsTradeInModalOpen(false);
        else if (isServicePickupOpen) setIsServicePickupOpen(false);
        else if (isImeiModalOpen) setIsImeiModalOpen(false);
        else if (isSimCardModalOpen) setIsSimCardModalOpen(false);
        else if (searchQuery) setSearchQuery('');
        else if (items.length > 0) handleSafeClearCart();
      } else if (!isTyping) {
        // Numpad / Keyboard quick qty adjustments
        if (e.key === '+' || e.key === '=') {
          e.preventDefault();
          incrementLatestItem();
        } else if (e.key === '-' || e.key === '_') {
          e.preventDefault();
          decrementLatestItem();
        } else if (e.key === 'Delete') {
          e.preventDefault();
          removeLatestItem();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [items, isPaymentOpen, isCustomerModalOpen, isPendingModalOpen, isDiscountModalOpen, searchQuery, lastCompletedOrder]);

  // Barcode Continuous & Weighing Scale Scan Handler
  const handleBarcodeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!barcodeInput.trim()) return;

    const success = handleScanBarcode(barcodeInput, products);
    if (success) {
      setBarcodeInput('');
    } else {
      useToastStore.getState().showToast(`Barcode / PLU "${barcodeInput}" tidak terdaftar!`, 'warning');
      setBarcodeInput('');
    }
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

  // Reprint Last Receipt [F9 when cart empty]
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
      discountAmount: discountAmount,
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
        if (tradeIn) {
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

  // Filter Catalog Products
  const filteredProducts = products.filter((p) => {
    const matchesCategory = selectedCategory ? p.categoryId === selectedCategory : true;
    const matchesSearch = searchQuery
      ? p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.sku.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (p.barcode && p.barcode.includes(searchQuery))
      : true;
    const matchesStock = !hideOutOfStock || p.currentStock > 0;
    return matchesCategory && matchesSearch && matchesStock;
  });

  const wholesaleSavings = getWholesaleSavings();
  const quickCashOptions = getQuickCashSuggestions();

  return (
    <div className="flex-1 flex flex-col bg-app overflow-hidden select-none">
      <div className="flex-1 flex overflow-hidden">
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
                    placeholder="Scan Barcode / Timbangan lalu [ENTER] (F1)..."
                    className="w-full pl-9 pr-3 py-2 bg-subtle border border-border-strong rounded-lg text-xs font-mono font-bold text-text-primary focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary shadow-inner"
                    autoFocus
                  />
                </div>
                <div className="relative w-44">
                  <Search className="w-3.5 h-3.5 text-text-muted absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    ref={searchInputRef}
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Cari produk [F2]..."
                    className="w-full pl-8 pr-3 py-2 bg-card border border-border-subtle focus:border-primary rounded-lg text-xs text-text-primary focus:outline-none"
                  />
                </div>
              </form>
            </div>

            {/* Quick POS Action Shortcut Pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto text-[11px] font-semibold text-text-secondary">
              <button
                onClick={() => setIsCustomerModalOpen(true)}
                className="px-2.5 py-1 rounded-md bg-card hover:bg-card-hover border border-border-subtle flex items-center gap-1 text-text-primary shrink-0"
              >
                <Users className="w-3 h-3 text-primary" />
                <span>[F3] Pelanggan: <strong>{selectedCustomer ? selectedCustomer.name : 'Umum'}</strong></span>
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

              {/* Trade-In Module Shortcut */}
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

              {/* Service Center Pickup Shortcut */}
              <button
                onClick={() => setIsServicePickupOpen(true)}
                className="px-2.5 py-1 rounded-md bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/30 text-blue-600 font-bold flex items-center gap-1 shrink-0 transition-all"
              >
                <Wrench className="w-3 h-3" />
                <span>[F7] Ambil Servis</span>
              </button>

              {lastCompletedOrder && (
                <button
                  onClick={handleReprintLastReceipt}
                  className="px-2 py-1 rounded-md bg-card hover:bg-card-hover border border-border-subtle flex items-center gap-1 text-text-primary shrink-0"
                >
                  <Printer className="w-3 h-3 text-primary" />
                  <span>[F9] Cetak Ulang</span>
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
                const isImeiItem = product.name.toLowerCase().includes('galaxy') || product.name.toLowerCase().includes('iphone') || product.name.toLowerCase().includes('laptop') || product.name.toLowerCase().includes('macbook') || product.name.toLowerCase().includes('imei') || product.name.toLowerCase().includes('serial');
                const isSimItem = product.name.toLowerCase().includes('nomor cantik') || product.name.toLowerCase().includes('perdana') || product.name.toLowerCase().includes('sim-nc');
                const isVoucherItem = product.name.toLowerCase().includes('voucher') || product.name.toLowerCase().includes('kuota');

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
                        <span className="text-[10px] font-mono px-1 py-0.2 rounded bg-subtle text-text-muted">
                          {product.sku}
                        </span>
                        <span
                          className={`text-[10px] font-bold px-1.5 py-0.2 rounded ${
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

                      {/* Smart Badges for Electronics / Special Numbers / Vouchers */}
                      {(isImeiItem || isSimItem || isVoucherItem) && (
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
                      {product.wholesalePrice && product.wholesaleMinQty && (
                        <div className="mt-1 flex items-center gap-1 text-[10px] text-emerald-600 font-bold">
                          <Tag className="w-3 h-3" />
                          <span>Grosir ≥{product.wholesaleMinQty}: Rp {product.wholesalePrice.toLocaleString('id-ID')}</span>
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
                        <span className="text-[10px] px-1 bg-subtle text-text-secondary rounded font-mono">
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
        <section className="w-[40%] flex flex-col bg-surface select-none border-l border-border-subtle">
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
                  <p className="text-[9px] text-status-danger font-mono font-bold">
                    Kasbon: Rp {selectedCustomer.totalReceivable.toLocaleString('id-ID')}
                  </p>
                ) : (
                  <p className="text-[9px] text-text-muted">Klik untuk ganti [F3]</p>
                )}
              </div>
            </button>

            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-text-muted font-mono">
                {getTotalItemCount()} Item
              </span>
              <button
                onClick={handleSafeClearCart}
                disabled={items.length === 0}
                className="px-2 py-1 rounded bg-card hover:bg-status-danger/10 hover:text-status-danger border border-border-subtle text-[11px] font-semibold text-text-secondary disabled:opacity-30"
              >
                Hapus [ESC]
              </button>
            </div>
          </div>

          {/* Cart Items List with Tiered Wholesale & Promo Badges */}
          <div className="flex-1 overflow-y-auto p-2.5 space-y-1.5">
            {items.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-text-muted space-y-2">
                <Barcode className="w-12 h-12 opacity-25" />
                <p className="text-xs font-bold text-text-primary">Keranjang Belanja Kosong</p>
                <p className="text-[11px] text-center max-w-[200px]">
                  Scan barcode [F1] atau cari nama [F2]
                </p>
              </div>
            ) : (
              items.map((item, idx) => (
                <div 
                  key={idx} 
                  className={`p-2.5 rounded-xl border space-y-1.5 transition-all ${
                    item.isPromoReward 
                      ? 'bg-emerald-500/10 border-emerald-500/40 ring-1 ring-emerald-500/30'
                      : item.isWholesaleApplied
                      ? 'bg-emerald-500/5 border-emerald-500/30'
                      : 'bg-card border-border-subtle'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <h4 className="text-xs font-bold text-text-primary leading-tight truncate">
                          {item.name}
                        </h4>
                        {item.unit && (
                          <span className="text-[9px] px-1 rounded bg-subtle text-text-muted font-mono">
                            {item.unit}
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
                        <p className="text-[10px] text-text-muted">
                          Beli {item.wholesaleMinQty - item.quantity} lagi untuk harga grosir Rp {item.wholesalePrice.toLocaleString('id-ID')}
                        </p>
                      ) : null}
                    </div>

                    {!item.isPromoReward && (
                      <button
                        onClick={() => removeItem(idx)}
                        className="p-1 rounded-md text-text-muted hover:text-status-danger hover:bg-subtle"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
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
                          onClick={() => {
                            updateQty(idx, item.quantity - 1);
                            playScanBeep();
                          }}
                          className="p-1 rounded text-text-secondary hover:text-text-primary hover:bg-card"
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        <span className="text-xs font-bold font-mono px-2 tabular-nums">
                          {item.quantity}
                        </span>
                        <button
                          onClick={() => {
                            updateQty(idx, item.quantity + 1);
                            playScanBeep();
                          }}
                          className="p-1 rounded text-text-secondary hover:text-text-primary hover:bg-card"
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
                  <span>Potongan Diskon:</span>
                  <span className="font-mono">-Rp {discountAmount.toLocaleString('id-ID')}</span>
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
                <p className="text-[10px] font-bold text-text-muted mb-1 flex items-center gap-1">
                  <Banknote className="w-3 h-3 text-status-success" />
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

            {/* Major Dual Action Buttons: [F8] Quick Exact Cash & [F9] Full Checkout */}
            <div className="grid grid-cols-2 gap-2 pt-1">
              <button
                onClick={handleQuickExactCashCheckout}
                disabled={items.length === 0}
                className="py-3 px-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 shadow-sm transition-all active:scale-95 disabled:opacity-40"
              >
                <Zap className="w-4 h-4" />
                <span>[F8] UANG PAS</span>
              </button>

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
      </div>

      {/* POS Bottom Hotkey Cheat Sheet Bar */}
      <footer className="px-4 py-1.5 bg-slate-900 text-slate-300 text-[11px] font-mono flex items-center justify-between border-t border-slate-800">
        <div className="flex items-center gap-3">
          <span><strong className="text-white">[F1]</strong> Scan</span>
          <span><strong className="text-white">[F2]</strong> Cari</span>
          <span><strong className="text-white">[F3]</strong> Member</span>
          <span><strong className="text-white">[F4]</strong> Diskon</span>
          <span><strong className="text-white">[F5]</strong> Trade-In</span>
          <span><strong className="text-white">[F6]</strong> Hold</span>
          <span><strong className="text-white">[F7]</strong> Servis</span>
          <span><strong className="text-white">[F8]</strong> Pas</span>
          <span><strong className="text-white">[F9]</strong> Bayar</span>
        </div>
        <div className="flex items-center gap-3 text-slate-400">
          <span><strong className="text-slate-200">[+] / [-]</strong> Ubah Qty</span>
          <span><strong className="text-slate-200">[Del]</strong> Hapus Baris</span>
          <span><strong className="text-slate-200">[ESC]</strong> Batal</span>
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
        onClose={() => setIsPaymentOpen(false)}
        onSubmitPayment={handleCheckoutSubmit}
      />

      <PaymentSuccessModal
        isOpen={isSuccessOpen}
        orderNumber={completedOrder?.invoiceNumber || ''}
        totalAmount={completedOrder?.totalAmount || 0}
        changeAmount={completedOrder?.changeAmount || 0}
        customerPhone={selectedCustomer?.phoneNumber}
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
    </div>
  );
};
export default PosPage;
