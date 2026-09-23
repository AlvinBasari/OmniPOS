import React, { useState, useEffect } from 'react';
import { 
  X, 
  ArrowDownToLine, 
  Boxes, 
  Tag, 
  AlertCircle, 
  CheckCircle2, 
  Plus, 
  FileText,
  DollarSign,
  TrendingUp
} from 'lucide-react';
import { Product } from '../../types';
import { useToastStore } from '../../store/useToastStore';
import { useAuthStore } from '../../store/useAuthStore';

interface QuickStockInModalProps {
  isOpen: boolean;
  onClose: () => void;
  product: Product | null;
  onSuccess: () => void;
}

export const QuickStockInModal: React.FC<QuickStockInModalProps> = ({
  isOpen,
  onClose,
  product,
  onSuccess
}) => {
  const { currentUser } = useAuthStore();
  const [qty, setQty] = useState<number>(10);
  const [notes, setNotes] = useState<string>('Restock Toko');
  const [refNumber, setRefNumber] = useState<string>('');
  const [isUpdateBuyPrice, setIsUpdateBuyPrice] = useState<boolean>(false);
  const [newBuyPrice, setNewBuyPrice] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  useEffect(() => {
    if (isOpen && product) {
      setQty(10);
      setNotes('Restock Toko');
      setRefNumber('');
      setIsUpdateBuyPrice(false);
      setNewBuyPrice(product.buyPrice ? product.buyPrice.toString() : '0');
    }
  }, [isOpen, product]);

  if (!isOpen || !product) return null;

  const currentStock = product.currentStock || 0;
  const targetStock = currentStock + (Number.isFinite(qty) ? qty : 0);
  const buyPriceNum = parseFloat(newBuyPrice) || product.buyPrice || 0;
  const currentAsset = currentStock * (product.buyPrice || 0);
  const incomingAsset = (Number.isFinite(qty) ? qty : 0) * (isUpdateBuyPrice ? buyPriceNum : (product.buyPrice || 0));

  const handlePresetQty = (val: number) => {
    setQty(prev => Math.max(1, (Number.isFinite(prev) ? prev : 0) + val));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!qty || qty <= 0) {
      useToastStore.getState().showToast('Jumlah stok masuk harus lebih dari 0!', 'warning');
      return;
    }

    try {
      setIsSubmitting(true);
      const payload = {
        productId: product.id,
        quantity: qty,
        newBuyPrice: isUpdateBuyPrice && buyPriceNum > 0 ? buyPriceNum : null,
        notes: notes.trim() || 'Penerimaan Stok Kilat',
        referenceNumber: refNumber.trim() || undefined,
        userId: currentUser?.username || 'admin'
      };

      const res = await fetch('/api/v1/inventory/quick-stock-in', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        const data = await res.json();
        useToastStore.getState().showToast(data.message || `Berhasil menambahkan +${qty} ${product.unit}!`, 'success');
        onSuccess();
        onClose();
      } else {
        const err = await res.json();
        useToastStore.getState().showToast(err.message || 'Gagal menambahkan stok.', 'error');
      }
    } catch {
      useToastStore.getState().showToast('Terjadi kesalahan jaringan.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-surface border border-border-strong w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        
        {/* Header */}
        <div className="px-5 py-4 border-b border-border-subtle flex items-center justify-between bg-subtle/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-600 flex items-center justify-center font-bold">
              <ArrowDownToLine className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-text-primary flex items-center gap-2">
                <span>Penerimaan Stok Kilat (Quick Stock In)</span>
              </h2>
              <p className="text-[11px] text-text-muted">
                Tambahkan stok fisik barang secara instan tanpa membuat dokumen faktur panjang
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-text-muted hover:text-text-primary hover:bg-card transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Product Info Banner */}
        <div className="p-4 mx-5 mt-4 rounded-xl bg-card border border-border-subtle flex items-center justify-between">
          <div className="space-y-0.5">
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs font-bold text-primary px-1.5 py-0.5 rounded bg-primary/10">
                {product.sku}
              </span>
              {product.barcode && (
                <span className="text-[11px] font-mono text-text-muted">
                  {product.barcode}
                </span>
              )}
            </div>
            <h3 className="text-sm font-bold text-text-primary line-clamp-1">
              {product.name}
            </h3>
            <p className="text-[11px] text-text-muted">
              Satuan: <span className="font-bold text-text-secondary">{product.unit || 'PCS'}</span> • 
              HPP Saat Ini: <span className="font-bold font-mono text-text-secondary">Rp {(product.buyPrice || 0).toLocaleString('id-ID')}</span>
            </p>
          </div>
          <div className="text-right">
            <span className="text-[10px] text-text-muted uppercase font-bold tracking-wider block">Stok Fisik Saat Ini</span>
            <span className="text-xl font-black font-mono text-text-primary">
              {currentStock} <span className="text-xs font-normal font-sans text-text-muted">{product.unit || 'PCS'}</span>
            </span>
          </div>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          
          {/* Input Qty */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-bold text-text-secondary">
                Jumlah Stok Masuk ({product.unit || 'PCS'}) *
              </label>
              <div className="flex items-center gap-1">
                {[5, 10, 20, 50, 100].map(val => (
                  <button
                    key={val}
                    type="button"
                    onClick={() => handlePresetQty(val)}
                    className="px-2 py-0.5 rounded bg-subtle hover:bg-emerald-500/15 hover:text-emerald-700 text-[10px] font-mono font-bold text-text-secondary border border-border-subtle transition-all cursor-pointer"
                  >
                    +{val}
                  </button>
                ))}
              </div>
            </div>
            <div className="relative">
              <input
                type="number"
                min="1"
                required
                autoFocus
                value={qty}
                onChange={e => setQty(Math.max(1, parseInt(e.target.value) || 0))}
                className="w-full px-4 py-2.5 bg-card border-2 border-emerald-500/50 focus:border-emerald-600 rounded-xl font-mono text-lg font-black text-emerald-700 dark:text-emerald-400 focus:outline-none"
              />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-bold text-text-muted">
                {product.unit || 'PCS'}
              </span>
            </div>
          </div>

          {/* Real-time Calculation Card */}
          <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 grid grid-cols-2 gap-3 text-xs">
            <div>
              <span className="text-[10px] font-bold text-emerald-800 dark:text-emerald-300 block">Kalkulasi Stok Fisik</span>
              <p className="font-mono text-sm font-black text-emerald-900 dark:text-emerald-200 mt-0.5">
                {currentStock} + {qty || 0} = <span className="underline">{targetStock} {product.unit}</span>
              </p>
            </div>
            <div className="text-right">
              <span className="text-[10px] font-bold text-emerald-800 dark:text-emerald-300 block">Estimasi Nilai Tambahan Modal</span>
              <p className="font-mono text-sm font-black text-emerald-900 dark:text-emerald-200 mt-0.5">
                +Rp {incomingAsset.toLocaleString('id-ID')}
              </p>
            </div>
          </div>

          {/* Update HPP Toggle */}
          <div className="pt-1 border-t border-border-subtle/70">
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 cursor-pointer select-none text-xs font-semibold text-text-primary">
                <input
                  type="checkbox"
                  checked={isUpdateBuyPrice}
                  onChange={e => setIsUpdateBuyPrice(e.target.checked)}
                  className="rounded border-border-strong text-primary focus:ring-primary w-4 h-4 cursor-pointer"
                />
                <span>Perbarui Harga Beli / Modal HPP Baru</span>
              </label>
              <span className="text-[10px] text-text-muted">
                (Centang jika supplier menaikkan harga)
              </span>
            </div>

            {isUpdateBuyPrice && (
              <div className="mt-2.5 p-3 rounded-xl bg-subtle border border-border-subtle space-y-2 animate-in fade-in duration-150">
                <label className="block text-[11px] font-bold text-text-secondary">
                  Harga Modal HPP Baru per {product.unit} (Rp):
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-text-muted font-mono">
                    Rp
                  </span>
                  <input
                    type="number"
                    min="0"
                    value={newBuyPrice}
                    onChange={e => setNewBuyPrice(e.target.value)}
                    className="w-full pl-9 pr-3 py-1.5 bg-card border border-border-strong rounded-lg font-mono text-xs font-bold text-text-primary focus:outline-none focus:border-primary"
                  />
                </div>
                {buyPriceNum !== product.buyPrice && (
                  <p className="text-[10px] text-text-muted">
                    HPP lama Rp {(product.buyPrice || 0).toLocaleString('id-ID')} → HPP baru Rp {buyPriceNum.toLocaleString('id-ID')} ({buyPriceNum > (product.buyPrice || 0) ? 'Naik' : 'Turun'} Rp {Math.abs(buyPriceNum - (product.buyPrice || 0)).toLocaleString('id-ID')})
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Notes & Ref Number */}
          <div className="grid grid-cols-2 gap-3 pt-1">
            <div>
              <label className="block text-[11px] font-semibold text-text-secondary mb-1">
                Catatan Mutasi
              </label>
              <input
                type="text"
                value={notes}
                onChange={e => setNotes(e.target.value)}
                placeholder="Contoh: Kiriman Distributor ABC"
                className="w-full px-3 py-1.5 bg-card border border-border-subtle rounded-lg text-xs text-text-primary focus:outline-none focus:border-primary"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-text-secondary mb-1">
                No. Referensi / DO (Opsional)
              </label>
              <input
                type="text"
                value={refNumber}
                onChange={e => setRefNumber(e.target.value)}
                placeholder="Contoh: DO-2026/09/001"
                className="w-full px-3 py-1.5 bg-card border border-border-subtle rounded-lg font-mono text-xs text-text-primary focus:outline-none focus:border-primary"
              />
            </div>
          </div>

          {/* Buttons */}
          <div className="flex items-center gap-2 pt-3 border-t border-border-subtle">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="flex-1 py-2 px-4 rounded-xl border border-border-subtle hover:bg-subtle text-xs font-semibold text-text-secondary transition-all cursor-pointer"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-2 py-2 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-md hover:shadow-lg active:scale-98 transition-all flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>{isSubmitting ? 'Memproses...' : `Tambah +${qty} ${product.unit || 'PCS'} ke Stok`}</span>
            </button>
          </div>
        </form>

      </div>
    </div>
  );
};
