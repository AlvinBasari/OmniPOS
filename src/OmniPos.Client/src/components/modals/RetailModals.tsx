import React, { useState, useEffect } from 'react';
import { 
  X, 
  Search, 
  UserPlus, 
  Users, 
  CreditCard, 
  PauseCircle, 
  PlayCircle, 
  Trash2, 
  Clock, 
  Percent, 
  DollarSign, 
  CheckCircle,
  AlertTriangle,
  Ticket,
  Gift,
  Sparkles,
  Star,
  Award,
  CheckCircle2,
  AlertCircle,
  Tag,
  ArrowRight
} from 'lucide-react';
import { Customer, Coupon } from '../../types';
import { useCartStore, ParkedOrder, playScanBeep } from '../../store/useCartStore';
import { useToastStore } from '../../store/useToastStore';

// ==========================================
// 1. CUSTOMER & KASBON SELECTOR MODAL [F3]
// ==========================================
interface CustomerKasbonModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const CustomerKasbonModal: React.FC<CustomerKasbonModalProps> = ({ isOpen, onClose }) => {
  const { selectedCustomer, setCustomer } = useCartStore();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // New customer quick-add state
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [newName, setNewName] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newCreditLimit, setNewCreditLimit] = useState('500000');

  useEffect(() => {
    if (isOpen) {
      fetchCustomers();
      setIsAddingNew(false);
    }
  }, [isOpen]);

  const fetchCustomers = async () => {
    try {
      setIsLoading(true);
      const res = await fetch('/api/v1/customers');
      if (res.ok) {
        const data: Customer[] = await res.json();
        setCustomers(data);
      }
    } catch {
      // Fallback
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  const filtered = customers.filter(
    (c) =>
      c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (c.phoneNumber && c.phoneNumber.includes(searchQuery)) ||
      (c.memberCode && c.memberCode.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const handleSelectCustomer = (c: Customer) => {
    setCustomer(c);
    useToastStore.getState().showToast(`Pelanggan terpilih: ${c.name}`, 'success');
    onClose();
  };

  const handleCreateCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;

    try {
      const res = await fetch('/api/v1/customers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newName.trim(),
          phone: newPhone.trim(),
          creditLimit: parseFloat(newCreditLimit) || 0,
        }),
      });

      if (res.ok) {
        const created: Customer = await res.json();
        setCustomer(created);
        useToastStore.getState().showToast(`Pelanggan baru "${created.name}" berhasil dibuat & dipilih!`, 'success');
        onClose();
      }
    } catch {
      useToastStore.getState().showToast('Gagal mendaftarkan pelanggan baru!', 'error');
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/75 flex items-center justify-center p-4 select-none">
      <div className="bg-surface border border-border-strong w-full max-w-xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="px-5 py-4 border-b border-border-subtle flex items-center justify-between bg-subtle">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
              <Users className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-text-primary">Pilih Pelanggan & Buku Kasbon [F3]</h2>
              <p className="text-xs text-text-secondary">Pilih member untuk mencatat poin atau transaksi kasbon (piutang)</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 rounded-md text-text-muted hover:text-text-primary">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        {!isAddingNew ? (
          <div className="p-4 flex-1 flex flex-col overflow-hidden space-y-3">
            {/* Search Bar & Add Button */}
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-text-muted absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Ketik Nama Pelanggan / No. WhatsApp / Kode Member..."
                  className="w-full pl-9 pr-3 py-2 bg-subtle border border-border-strong rounded-lg text-xs text-text-primary focus:outline-none focus:border-primary"
                  autoFocus
                />
              </div>
              <button
                onClick={() => setIsAddingNew(true)}
                className="px-3 py-2 bg-primary hover:bg-primary-hover text-primary-text rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-sm"
              >
                <UserPlus className="w-4 h-4" />
                <span>Tambah Baru</span>
              </button>
            </div>

            {/* General Guest Option */}
            <button
              onClick={() => {
                setCustomer(null);
                useToastStore.getState().showToast('Mode Pelanggan Umum diaktifkan', 'info');
                onClose();
              }}
              className={`p-3 rounded-xl border text-left flex items-center justify-between transition-all ${
                !selectedCustomer
                  ? 'bg-primary/10 border-primary text-primary font-bold'
                  : 'bg-card hover:bg-card-hover border-border-subtle text-text-secondary'
              }`}
            >
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-slate-400" />
                <span className="text-xs font-semibold">Pelanggan Umum / Tamu (Tanpa Akun)</span>
              </div>
              {!selectedCustomer && <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-primary text-primary-text">Aktif</span>}
            </button>

            {/* Customer List */}
            <div className="flex-1 overflow-y-auto space-y-2 pr-1">
              {filtered.map((c) => {
                const isSelected = selectedCustomer?.id === c.id;
                const remainingLimit = Math.max(0, c.creditLimit - c.totalReceivable);
                return (
                  <div
                    key={c.id}
                    onClick={() => handleSelectCustomer(c)}
                    className={`p-3 rounded-xl border cursor-pointer transition-all flex items-center justify-between ${
                      isSelected
                        ? 'bg-primary/10 border-primary shadow-sm'
                        : 'bg-card hover:bg-card-hover border-border-subtle'
                    }`}
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-text-primary">{c.name}</span>
                        {c.memberCode && (
                          <span className="text-[11px] font-mono font-bold px-1.5 py-0.5 rounded-md bg-zinc-200/80 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 border border-zinc-300 dark:border-zinc-700">
                            {c.memberCode}
                          </span>
                        )}
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-600 font-semibold">
                          ⭐ {c.loyaltyPoints} Poin
                        </span>
                      </div>
                      <p className="text-[11px] text-text-muted mt-0.5">
                        WA: {c.phoneNumber || '-'} | Alamat: {c.address || '-'}
                      </p>
                    </div>

                    {/* Credit Limit & Outstanding Debt Status */}
                    <div className="text-right">
                      <div className="text-[11px] font-bold text-text-primary">
                        Kasbon: <span className={c.totalReceivable > 0 ? 'text-status-danger font-mono' : 'text-status-success'}>Rp {c.totalReceivable.toLocaleString('id-ID')}</span>
                      </div>
                      <p className="text-[10px] text-text-muted">
                        Limit: Rp {c.creditLimit.toLocaleString('id-ID')} (Sisa: Rp {remainingLimit.toLocaleString('id-ID')})
                      </p>
                    </div>
                  </div>
                );
              })}

              {filtered.length === 0 && !isLoading && (
                <div className="p-8 text-center text-text-muted text-xs space-y-1">
                  <p>Tidak ditemukan pelanggan yang sesuai.</p>
                  <button onClick={() => setIsAddingNew(true)} className="text-primary font-bold hover:underline">
                    + Daftarkan "{searchQuery}" sekarang
                  </button>
                </div>
              )}
            </div>
          </div>
        ) : (
          <form onSubmit={handleCreateCustomer} className="p-5 space-y-4">
            <h3 className="text-sm font-bold text-text-primary">Daftarkan Pelanggan / Kasbon Baru</h3>
            <div>
              <label className="block text-xs font-semibold text-text-secondary mb-1">Nama Lengkap *</label>
              <input
                type="text"
                required
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Contoh: Ibu Rina (Warung Samping)"
                className="w-full px-3 py-2 bg-subtle border border-border-strong rounded-lg text-xs text-text-primary focus:outline-none focus:border-primary"
                autoFocus
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-text-secondary mb-1">No. WhatsApp / Telepon</label>
              <input
                type="tel"
                value={newPhone}
                onChange={(e) => setNewPhone(e.target.value)}
                placeholder="08123456789"
                className="w-full px-3 py-2 bg-subtle border border-border-strong rounded-lg text-xs text-text-primary focus:outline-none focus:border-primary"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-text-secondary mb-1">Batas Maksimal Kasbon (Credit Limit) Rp</label>
              <input
                type="number"
                value={newCreditLimit}
                onChange={(e) => setNewCreditLimit(e.target.value)}
                placeholder="500000"
                className="w-full px-3 py-2 bg-subtle border border-border-strong rounded-lg text-xs font-mono text-text-primary focus:outline-none focus:border-primary"
              />
              <p className="text-[10px] text-text-muted mt-1">Batas plafon utang belanja yang diizinkan untuk pelanggan ini.</p>
            </div>

            <div className="flex gap-2 pt-2 border-t border-border-subtle">
              <button
                type="button"
                onClick={() => setIsAddingNew(false)}
                className="flex-1 py-2 rounded-lg bg-subtle hover:bg-card-hover border border-border-subtle text-xs font-semibold text-text-secondary"
              >
                Batal
              </button>
              <button
                type="submit"
                className="flex-1 py-2 rounded-lg bg-primary hover:bg-primary-hover text-primary-text text-xs font-bold shadow-sm"
              >
                Simpan & Pilih Pelanggan
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

// ==========================================
// 2. PENDING ORDERS (HOLD & RECALL) MODAL [F6]
// ==========================================
interface PendingOrdersModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const PendingOrdersModal: React.FC<PendingOrdersModalProps> = ({ isOpen, onClose }) => {
  const { parkedOrders, restoreParkedOrder, deleteParkedOrder } = useCartStore();

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/75 flex items-center justify-center p-4 select-none">
      <div className="bg-surface border border-border-strong w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="px-5 py-4 border-b border-border-subtle flex items-center justify-between bg-subtle">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-500 flex items-center justify-center">
              <PauseCircle className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-text-primary">Daftar Transaksi Ditahan (Pending) [F6]</h2>
              <p className="text-xs text-text-secondary">Pilih transaksi yang ingin dilanjutkan kasir kembali</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 rounded-md text-text-muted hover:text-text-primary">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* List of Held Carts */}
        <div className="p-4 flex-1 overflow-y-auto space-y-3">
          {parkedOrders.length === 0 ? (
            <div className="py-12 text-center text-text-muted space-y-2">
              <PauseCircle className="w-12 h-12 mx-auto opacity-30" />
              <p className="text-xs font-bold text-text-primary">Tidak Ada Transaksi yang Ditahan</p>
              <p className="text-[11px]">Tekan [F6] pada keranjang aktif untuk menahan transaksi pelanggan sementara.</p>
            </div>
          ) : (
            parkedOrders.map((order) => (
              <div
                key={order.id}
                className="p-4 rounded-xl bg-card border border-border-subtle hover:border-primary/50 transition-all space-y-3 shadow-sm"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-text-primary">{order.holdNumber}</span>
                      <span className="text-[11px] px-2 py-0.5 rounded-md bg-zinc-200/80 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 border border-zinc-300 dark:border-zinc-700 flex items-center gap-1 font-mono font-bold">
                        <Clock className="w-3 h-3 text-zinc-700 dark:text-zinc-300" />
                        {new Date(order.parkedAt).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <p className="text-xs text-text-secondary mt-0.5">
                      Pelanggan: <strong className="text-text-primary">{order.customerName || 'Pelanggan Umum'}</strong>
                    </p>
                  </div>
                  <span className="text-sm font-extrabold font-mono text-primary tabular-nums">
                    Rp {order.subtotal.toLocaleString('id-ID')}
                  </span>
                </div>

                {/* Items preview */}
                <div className="p-2 bg-subtle rounded-lg text-[11px] space-y-1 text-text-secondary">
                  <p className="font-semibold text-text-primary">Isi Keranjang ({order.items.reduce((a, b) => a + b.quantity, 0)} item):</p>
                  <p className="truncate">
                    {order.items.map((i) => `${i.name} x${i.quantity}`).join(', ')}
                  </p>
                </div>

                {/* Actions */}
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      restoreParkedOrder(order.id);
                      playScanBeep();
                      useToastStore.getState().showToast(`Transaksi "${order.holdNumber}" berhasil dilanjutkan!`, 'success');
                      onClose();
                    }}
                    className="flex-1 py-2 bg-primary hover:bg-primary-hover text-primary-text rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 shadow-sm"
                  >
                    <PlayCircle className="w-4 h-4" />
                    <span>Lanjutkan Transaksi</span>
                  </button>
                  <button
                    onClick={() => deleteParkedOrder(order.id)}
                    className="px-3 py-2 bg-subtle hover:bg-status-danger/10 hover:text-status-danger border border-border-subtle rounded-lg text-xs font-semibold"
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
  );
};

// ==========================================
// 3. DISCOUNT TRANSACTION MODAL [F4]
// ==========================================
interface DiscountModalProps {
  isOpen: boolean;
  subtotal: number;
  currentDiscount: number;
  onClose: () => void;
  onApplyDiscount: (amount: number, reason: string) => void;
}

export const DiscountTransactionModal: React.FC<DiscountModalProps> = ({
  isOpen,
  subtotal,
  currentDiscount,
  onClose,
  onApplyDiscount,
}) => {
  const { 
    selectedCustomer, 
    appliedCoupon, 
    setAppliedCoupon, 
    redeemedPoints, 
    redeemedPointsDiscountAmount, 
    setRedeemedPoints,
    discountAmount: manualDiscount,
    discountReason: manualReason
  } = useCartStore();

  const [activeTab, setActiveTab] = useState<'manual' | 'coupon' | 'points'>('manual');

  // Tab 1: Manual Discount State
  const [discountType, setDiscountType] = useState<'percent' | 'nominal'>('percent');
  const [percentVal, setPercentVal] = useState<number>(0);
  const [nominalVal, setNominalVal] = useState<string>(manualDiscount > 0 ? manualDiscount.toString() : '');
  const [reason, setReason] = useState<string>(manualReason || 'Diskon Khusus Toko');

  // Tab 2: Coupon / Voucher State
  const [couponCodeInput, setCouponCodeInput] = useState('');
  const [isValidatingCoupon, setIsValidatingCoupon] = useState(false);
  const [couponError, setCouponError] = useState('');
  const [availableCoupons, setAvailableCoupons] = useState<Coupon[]>([]);

  // Tab 3: Loyalty Points State
  const [pointsInput, setPointsInput] = useState<number>(redeemedPoints || 0);
  const pointExchangeRate = 1000; // 1 point = Rp 1.000

  useEffect(() => {
    if (isOpen) {
      setNominalVal(manualDiscount > 0 ? manualDiscount.toString() : '');
      setReason(manualReason || 'Diskon Khusus Toko');
      setCouponCodeInput('');
      setCouponError('');
      setPointsInput(redeemedPoints || 0);
      fetchAvailableCoupons();
    }
  }, [isOpen, manualDiscount, manualReason, redeemedPoints]);

  const fetchAvailableCoupons = async () => {
    try {
      const res = await fetch('/api/v1/coupons');
      if (res.ok) {
        const data: Coupon[] = await res.json();
        setAvailableCoupons(data.filter(c => c.isActive));
      }
    } catch {}
  };

  if (!isOpen) return null;

  // Manual calculation
  const calculateManualDiscount = () => {
    if (discountType === 'percent') {
      return Math.round((subtotal * percentVal) / 100);
    }
    return parseFloat(nominalVal) || 0;
  };

  const handleApplyManual = () => {
    const finalAmount = calculateManualDiscount();
    onApplyDiscount(finalAmount, reason);
    useToastStore.getState().showToast(`Diskon manual Rp ${finalAmount.toLocaleString('id-ID')} diterapkan!`, 'success');
  };

  const handleClearManual = () => {
    onApplyDiscount(0, '');
    setPercentVal(0);
    setNominalVal('');
    useToastStore.getState().showToast('Diskon manual dihapus.', 'info');
  };

  // Coupon handling
  const handleValidateAndApplyCoupon = async (codeToValidate?: string) => {
    const targetCode = (codeToValidate || couponCodeInput).trim();
    if (!targetCode) {
      setCouponError('Masukkan kode kupon terlebih dahulu.');
      return;
    }

    try {
      setIsValidatingCoupon(true);
      setCouponError('');

      const res = await fetch('/api/v1/coupons/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: targetCode,
          subtotal,
          customerId: selectedCustomer?.id
        })
      });

      const result = await res.json();
      if (result.isValid) {
        setAppliedCoupon(result);
        setCouponCodeInput('');
        useToastStore.getState().showToast(result.message, 'success');
      } else {
        setCouponError(result.message);
        useToastStore.getState().showToast(result.message, 'warning');
      }
    } catch {
      setCouponError('Gagal memvalidasi kupon promo.');
    } finally {
      setIsValidatingCoupon(false);
    }
  };

  const handleRemoveCoupon = () => {
    setAppliedCoupon(null);
    useToastStore.getState().showToast('Kupon diskon dilepas.', 'info');
  };

  // Points handling
  const maxRedeemablePoints = selectedCustomer ? Math.min(selectedCustomer.loyaltyPoints, Math.floor(subtotal / pointExchangeRate)) : 0;

  const handleApplyPoints = (ptsToUse: number) => {
    if (!selectedCustomer) {
      useToastStore.getState().showToast('Harap pilih pelanggan/member terlebih dahulu.', 'warning');
      return;
    }
    if (ptsToUse <= 0) {
      setRedeemedPoints(0, 0);
      useToastStore.getState().showToast('Penukaran poin dibatalkan.', 'info');
      return;
    }
    if (ptsToUse > selectedCustomer.loyaltyPoints) {
      useToastStore.getState().showToast(`Poin tidak cukup! Saldo member: ${selectedCustomer.loyaltyPoints} poin.`, 'warning');
      return;
    }

    const discountFromPts = ptsToUse * pointExchangeRate;
    setRedeemedPoints(ptsToUse, discountFromPts);
    useToastStore.getState().showToast(`Berhasil menukar ${ptsToUse} poin (Potongan Rp ${discountFromPts.toLocaleString('id-ID')})!`, 'success');
  };

  const totalDiscountApplied = (manualDiscount || 0) + (appliedCoupon?.discountAmount || 0) + (redeemedPointsDiscountAmount || 0);
  const finalSubtotalAfterAllDiscounts = Math.max(0, subtotal - totalDiscountApplied);

  return (
    <div className="fixed inset-0 z-50 bg-black/75 flex items-center justify-center p-4 select-none">
      <div className="bg-surface border border-border-strong w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-5 py-3.5 border-b border-border-subtle flex items-center justify-between bg-subtle">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center font-bold">
              <Gift className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-text-primary">Diskon, Kupon & Poin Member [F4]</h2>
              <p className="text-[11px] text-text-secondary">
                Subtotal Belanja: <strong className="font-mono text-text-primary">Rp {subtotal.toLocaleString('id-ID')}</strong>
                {selectedCustomer && (
                  <span className="ml-2 text-primary font-medium">| Member: {selectedCustomer.name} (⭐ {selectedCustomer.loyaltyPoints} Pts)</span>
                )}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 text-text-muted hover:text-text-primary"><X className="w-5 h-5" /></button>
        </div>

        {/* Tab Switcher */}
        <div className="grid grid-cols-3 gap-1 bg-subtle p-2 border-b border-border-subtle text-xs">
          <button
            type="button"
            onClick={() => setActiveTab('manual')}
            className={`py-2 px-3 rounded-lg font-bold flex items-center justify-center gap-1.5 transition-all ${
              activeTab === 'manual'
                ? 'bg-card text-text-primary shadow-xs border border-border-subtle'
                : 'text-text-secondary hover:text-text-primary'
            }`}
          >
            <Percent className="w-3.5 h-3.5 text-rose-500" />
            <span>Diskon Manual</span>
            {manualDiscount > 0 && <span className="w-2 h-2 rounded-full bg-rose-500" />}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('coupon')}
            className={`py-2 px-3 rounded-lg font-bold flex items-center justify-center gap-1.5 transition-all ${
              activeTab === 'coupon'
                ? 'bg-card text-text-primary shadow-xs border border-border-subtle'
                : 'text-text-secondary hover:text-text-primary'
            }`}
          >
            <Ticket className="w-3.5 h-3.5 text-indigo-500" />
            <span>Kupon & Voucher</span>
            {appliedCoupon && <span className="w-2 h-2 rounded-full bg-indigo-500" />}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('points')}
            className={`py-2 px-3 rounded-lg font-bold flex items-center justify-center gap-1.5 transition-all ${
              activeTab === 'points'
                ? 'bg-card text-text-primary shadow-xs border border-border-subtle'
                : 'text-text-secondary hover:text-text-primary'
            }`}
          >
            <Star className="w-3.5 h-3.5 text-amber-500" />
            <span>Tukar Poin</span>
            {redeemedPoints > 0 && <span className="w-2 h-2 rounded-full bg-amber-500" />}
          </button>
        </div>

        {/* Tab Body */}
        <div className="p-5 flex-1 overflow-y-auto space-y-4">
          {/* TAB 1: MANUAL DISCOUNT */}
          {activeTab === 'manual' && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-2 bg-subtle p-1 rounded-lg">
                <button
                  type="button"
                  onClick={() => setDiscountType('percent')}
                  className={`py-1.5 rounded-md text-xs font-bold transition-all ${
                    discountType === 'percent' ? 'bg-primary text-primary-text shadow-sm' : 'text-text-secondary'
                  }`}
                >
                  Persentase (%)
                </button>
                <button
                  type="button"
                  onClick={() => setDiscountType('nominal')}
                  className={`py-1.5 rounded-md text-xs font-bold transition-all ${
                    discountType === 'nominal' ? 'bg-primary text-primary-text shadow-sm' : 'text-text-secondary'
                  }`}
                >
                  Nominal Rupiah (Rp)
                </button>
              </div>

              {discountType === 'percent' ? (
                <div className="space-y-2">
                  <div className="grid grid-cols-6 gap-1.5">
                    {[5, 10, 15, 20, 25, 50].map((p) => (
                      <button
                        key={p}
                        type="button"
                        onClick={() => setPercentVal(p)}
                        className={`py-2 rounded-lg border text-xs font-bold font-mono transition-all ${
                          percentVal === p
                            ? 'bg-primary text-primary-text border-primary'
                            : 'bg-card border-border-subtle text-text-primary hover:bg-card-hover'
                        }`}
                      >
                        {p}%
                      </button>
                    ))}
                  </div>
                  <div className="pt-2 flex justify-between text-xs text-text-secondary">
                    <span>Potongan Harga:</span>
                    <span className="font-bold font-mono text-status-danger">
                      -Rp {Math.round((subtotal * percentVal) / 100).toLocaleString('id-ID')}
                    </span>
                  </div>
                </div>
              ) : (
                <div>
                  <label className="block text-xs font-semibold text-text-secondary mb-1">Nominal Diskon (Rp)</label>
                  <input
                    type="number"
                    value={nominalVal}
                    onChange={(e) => setNominalVal(e.target.value)}
                    placeholder="Contoh: 10000"
                    className="w-full text-base font-bold font-mono px-3 py-2 bg-subtle border border-border-strong rounded-lg text-text-primary focus:outline-none focus:border-primary"
                    autoFocus
                  />
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-text-secondary mb-1">Alasan Diskon</label>
                <input
                  type="text"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Diskon Khusus / Potongan Negosiasi"
                  className="w-full text-xs px-3 py-2 bg-subtle border border-border-strong rounded-lg text-text-primary focus:outline-none focus:border-primary"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={handleClearManual}
                  className="px-4 py-2 bg-subtle hover:bg-rose-500/10 hover:text-rose-600 border border-border-subtle rounded-lg text-xs font-semibold transition-colors"
                >
                  Hapus Diskon Manual
                </button>
                <button
                  type="button"
                  onClick={handleApplyManual}
                  className="flex-1 py-2 bg-primary hover:bg-primary-hover text-primary-text rounded-lg text-xs font-bold shadow-sm"
                >
                  Terapkan Diskon Manual
                </button>
              </div>
            </div>
          )}

          {/* TAB 2: COUPON & VOUCHER */}
          {activeTab === 'coupon' && (
            <div className="space-y-4">
              {/* Active Applied Coupon Banner */}
              {appliedCoupon && (
                <div className="p-3.5 bg-indigo-500/10 border border-indigo-500/30 rounded-xl flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-indigo-500 text-white flex items-center justify-center font-bold">
                      <Ticket className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-black font-mono text-indigo-600 dark:text-indigo-400 bg-indigo-500/20 px-2 py-0.5 rounded">
                          {appliedCoupon.couponCode}
                        </span>
                        <span className="text-xs font-bold text-text-primary">{appliedCoupon.couponName}</span>
                      </div>
                      <p className="text-[11px] text-text-secondary mt-0.5">
                        Potongan: <strong className="text-emerald-600 font-mono">-Rp {appliedCoupon.discountAmount.toLocaleString('id-ID')}</strong>
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={handleRemoveCoupon}
                    className="px-3 py-1.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 border border-rose-500/30 rounded-lg text-xs font-bold transition-colors"
                  >
                    Lepas Kupon
                  </button>
                </div>
              )}

              {/* Coupon Code Input */}
              <div>
                <label className="block text-xs font-semibold text-text-secondary mb-1">Ketik Kode Kupon / Voucher Promo</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={couponCodeInput}
                    onChange={(e) => {
                      setCouponCodeInput(e.target.value.toUpperCase());
                      setCouponError('');
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleValidateAndApplyCoupon();
                      }
                    }}
                    placeholder="Contoh: HEMAT10K, MEMBERVIP"
                    className="flex-1 px-3 py-2 bg-subtle border border-border-strong rounded-lg text-xs font-mono font-bold text-text-primary focus:outline-none focus:border-primary uppercase tracking-wider"
                  />
                  <button
                    type="button"
                    onClick={() => handleValidateAndApplyCoupon()}
                    disabled={isValidatingCoupon || !couponCodeInput.trim()}
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold shadow-sm disabled:opacity-40"
                  >
                    {isValidatingCoupon ? 'Mengecek...' : 'Gunakan'}
                  </button>
                </div>
                {couponError && (
                  <p className="text-[11px] text-rose-600 font-medium mt-1.5 flex items-center gap-1">
                    <AlertCircle className="w-3.5 h-3.5" /> {couponError}
                  </p>
                )}
              </div>

              {/* Available Coupons List */}
              <div className="space-y-2 pt-2 border-t border-border-subtle">
                <span className="text-[11px] font-bold text-text-secondary uppercase tracking-wider">
                  Kupon Toko Tersedia ({availableCoupons.length})
                </span>
                <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                  {availableCoupons.map((c) => {
                    const isEligible = subtotal >= c.minimumSpendAmount;
                    return (
                      <div
                        key={c.id}
                        className={`p-3 rounded-xl border flex items-center justify-between transition-all ${
                          isEligible 
                            ? 'bg-card hover:bg-card-hover border-border-subtle' 
                            : 'bg-subtle/40 border-border-subtle/50 opacity-60'
                        }`}
                      >
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-black text-xs text-indigo-600 bg-indigo-500/10 px-2 py-0.5 rounded">
                              {c.code}
                            </span>
                            <span className="text-xs font-bold text-text-primary">{c.name}</span>
                          </div>
                          <p className="text-[10px] text-text-muted mt-0.5">
                            {c.discountType === 'Percentage' || c.discountType === '0' 
                              ? `Diskon ${c.discountValue}%` 
                              : `Potongan Rp ${c.discountValue.toLocaleString('id-ID')}`}
                            {c.minimumSpendAmount > 0 && ` | Min. Belanja Rp ${c.minimumSpendAmount.toLocaleString('id-ID')}`}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleValidateAndApplyCoupon(c.code)}
                          disabled={!isEligible}
                          className="px-3 py-1 bg-indigo-600/10 hover:bg-indigo-600/20 text-indigo-600 rounded text-xs font-bold disabled:opacity-30"
                        >
                          Pakai
                        </button>
                      </div>
                    );
                  })}
                  {availableCoupons.length === 0 && (
                    <p className="text-xs text-text-muted text-center py-4">Belum ada kupon promo aktif di master data.</p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: LOYALTY POINTS */}
          {activeTab === 'points' && (
            <div className="space-y-4">
              {!selectedCustomer ? (
                <div className="p-6 rounded-xl bg-amber-500/5 border border-amber-500/20 text-center space-y-3">
                  <div className="w-10 h-10 rounded-full bg-amber-500/10 text-amber-600 mx-auto flex items-center justify-center">
                    <Star className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-text-primary">Pelanggan / Member Belum Dipilih</h4>
                    <p className="text-[11px] text-text-secondary mt-0.5">
                      Poin loyalitas terikat dengan akun member. Harap pilih member di kasir terlebih dahulu.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Member Summary Card */}
                  <div className="p-4 rounded-xl bg-gradient-to-br from-amber-500/10 to-primary/10 border border-amber-500/30 flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-black text-text-primary">{selectedCustomer.name}</span>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500 text-white uppercase">
                          {selectedCustomer.memberTier || 'BRONZE'} MEMBER
                        </span>
                      </div>
                      <p className="text-[11px] text-text-secondary mt-1">
                        Saldo Poin Tersedia: <strong className="font-mono text-amber-600 text-xs">⭐ {selectedCustomer.loyaltyPoints} Poin</strong>
                      </p>
                      <p className="text-[10px] text-text-muted">
                        Nilai Tukar: 1 Poin = Rp {pointExchangeRate.toLocaleString('id-ID')}
                      </p>
                    </div>

                    <div className="text-right">
                      <span className="text-[10px] text-text-muted block">Maksimal Ditukar:</span>
                      <span className="font-mono font-bold text-sm text-text-primary">
                        {maxRedeemablePoints} Poin (Rp {(maxRedeemablePoints * pointExchangeRate).toLocaleString('id-ID')})
                      </span>
                    </div>
                  </div>

                  {/* Redeem Form */}
                  <div className="space-y-3">
                    <label className="block text-xs font-semibold text-text-secondary">Jumlah Poin yang Ingin Ditukar</label>
                    <div className="grid grid-cols-4 gap-2">
                      {[5, 10, 20].filter(pts => pts <= selectedCustomer.loyaltyPoints).map(pts => (
                        <button
                          key={pts}
                          type="button"
                          onClick={() => {
                            setPointsInput(pts);
                            handleApplyPoints(pts);
                          }}
                          className="py-2 px-2 bg-card hover:bg-card-hover border border-border-subtle rounded-lg text-xs font-bold text-text-primary transition-colors flex flex-col items-center"
                        >
                          <span>{pts} Poin</span>
                          <span className="text-[10px] text-emerald-600 font-mono">-Rp {(pts * pointExchangeRate).toLocaleString('id-ID')}</span>
                        </button>
                      ))}
                      {maxRedeemablePoints > 0 && (
                        <button
                          type="button"
                          onClick={() => {
                            setPointsInput(maxRedeemablePoints);
                            handleApplyPoints(maxRedeemablePoints);
                          }}
                          className="py-2 px-2 bg-amber-500/10 hover:bg-amber-500/20 text-amber-700 border border-amber-500/30 rounded-lg text-xs font-bold transition-colors flex flex-col items-center"
                        >
                          <span>Tukar Maksimal</span>
                          <span className="text-[10px] text-amber-700 font-mono">{maxRedeemablePoints} Pts</span>
                        </button>
                      )}
                    </div>

                    <div className="flex gap-2 pt-2">
                      <input
                        type="number"
                        min="0"
                        max={selectedCustomer.loyaltyPoints}
                        value={pointsInput || ''}
                        onChange={e => setPointsInput(parseInt(e.target.value) || 0)}
                        placeholder="Jumlah poin..."
                        className="flex-1 px-3 py-2 bg-subtle border border-border-strong rounded-lg text-xs font-mono font-bold text-text-primary"
                      />
                      <button
                        type="button"
                        onClick={() => handleApplyPoints(pointsInput)}
                        className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-bold shadow-sm"
                      >
                        Terapkan Poin
                      </button>
                    </div>

                    {redeemedPoints > 0 && (
                      <div className="p-3 bg-status-success/10 border border-status-success/30 rounded-xl flex items-center justify-between text-xs">
                        <span className="font-semibold text-text-primary">
                          ⭐ {redeemedPoints} Poin Ditukarkan (Hemat Rp {redeemedPointsDiscountAmount.toLocaleString('id-ID')})
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            setPointsInput(0);
                            handleApplyPoints(0);
                          }}
                          className="text-status-danger font-bold hover:underline"
                        >
                          Batal Tukar
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer Summary & Done Button */}
        <div className="px-5 py-3 border-t border-border-subtle bg-subtle flex items-center justify-between">
          <div>
            <div className="text-[11px] text-text-secondary">
              Total Diskon: <strong className="font-mono text-status-danger">-Rp {totalDiscountApplied.toLocaleString('id-ID')}</strong>
            </div>
            <div className="text-xs font-bold text-text-primary">
              Tagihan Akhir: <strong className="font-mono text-primary">Rp {finalSubtotalAfterAllDiscounts.toLocaleString('id-ID')}</strong>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="px-6 py-2.5 bg-primary hover:bg-primary-hover text-primary-text rounded-xl text-xs font-bold shadow-sm flex items-center gap-1.5"
          >
            <span>[Enter] Selesai & Kembali ke POS</span>
          </button>
        </div>
      </div>
    </div>
  );
};

