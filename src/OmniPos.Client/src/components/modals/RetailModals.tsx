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
  AlertTriangle
} from 'lucide-react';
import { Customer } from '../../types';
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
                          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-subtle text-text-muted">
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
                      <span className="text-[10px] px-2 py-0.5 rounded bg-subtle text-text-muted flex items-center gap-1 font-mono">
                        <Clock className="w-3 h-3" />
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
  const [discountType, setDiscountType] = useState<'percent' | 'nominal'>('percent');
  const [percentVal, setPercentVal] = useState<number>(0);
  const [nominalVal, setNominalVal] = useState<string>('');
  const [reason, setReason] = useState<string>('Diskon Khusus Toko');

  if (!isOpen) return null;

  const calculateFinalDiscount = () => {
    if (discountType === 'percent') {
      return Math.round((subtotal * percentVal) / 100);
    }
    return parseFloat(nominalVal) || 0;
  };

  const handleSave = () => {
    const finalAmount = calculateFinalDiscount();
    onApplyDiscount(finalAmount, reason);
    useToastStore.getState().showToast(`Diskon Rp ${finalAmount.toLocaleString('id-ID')} berhasil diterapkan!`, 'success');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/75 flex items-center justify-center p-4 select-none">
      <div className="bg-surface border border-border-strong w-full max-w-md rounded-2xl shadow-2xl overflow-hidden space-y-4 p-5">
        <div className="flex items-center justify-between border-b border-border-subtle pb-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-rose-500/10 text-rose-500 flex items-center justify-center font-bold">
              <Percent className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-text-primary">Diskon Transaksi [F4]</h2>
              <p className="text-xs text-text-secondary">Subtotal: Rp {subtotal.toLocaleString('id-ID')}</p>
            </div>
          </div>
          <button onClick={onClose}><X className="w-5 h-5 text-text-muted" /></button>
        </div>

        {/* Type Switcher */}
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
            <div className="grid grid-cols-5 gap-2">
              {[5, 10, 15, 20, 25].map((p) => (
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
              <span>Potongan:</span>
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
            placeholder="Diskon Khusus / Member VIP / Promo Toko"
            className="w-full text-xs px-3 py-2 bg-subtle border border-border-strong rounded-lg text-text-primary focus:outline-none focus:border-primary"
          />
        </div>

        <div className="pt-2 flex gap-2 border-t border-border-subtle">
          <button
            type="button"
            onClick={() => {
              onApplyDiscount(0, '');
              onClose();
            }}
            className="px-4 py-2 bg-subtle hover:bg-status-danger/10 hover:text-status-danger border border-border-subtle rounded-lg text-xs font-semibold"
          >
            Hapus Diskon
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="flex-1 py-2 bg-primary hover:bg-primary-hover text-primary-text rounded-lg text-xs font-bold shadow-sm"
          >
            Terapkan Diskon
          </button>
        </div>
      </div>
    </div>
  );
};
