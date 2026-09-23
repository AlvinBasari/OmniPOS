import React, { useState, useEffect } from 'react';
import { RefreshCw, X, Check, ArrowRight, Building2, Package, AlertCircle } from 'lucide-react';
import { Warehouse, Product } from '../../types';
import { useToastStore } from '../../store/useToastStore';
import { useAuthStore } from '../../store/useAuthStore';

interface QuickRebalanceModalProps {
  isOpen: boolean;
  onClose: () => void;
  warehouses: Warehouse[];
  products: Product[];
  initialProductId?: string;
  initialSourceWarehouseId?: string;
  onRebalanced: () => void;
}

export const QuickRebalanceModal: React.FC<QuickRebalanceModalProps> = ({
  isOpen,
  onClose,
  warehouses,
  products,
  initialProductId,
  initialSourceWarehouseId,
  onRebalanced,
}) => {
  const { currentUser } = useAuthStore();
  const [selectedProductId, setSelectedProductId] = useState('');
  const [sourceWarehouseId, setSourceWarehouseId] = useState('');
  const [destinationWarehouseId, setDestinationWarehouseId] = useState('');
  const [quantity, setQuantity] = useState('1');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [sourceStock, setSourceStock] = useState<number>(0);

  useEffect(() => {
    if (isOpen) {
      const prodId = initialProductId || (products.length > 0 ? (products[0].id || (products[0] as any).Id) : '');
      setSelectedProductId(prodId);

      const srcId = initialSourceWarehouseId || (warehouses.find(w => w.isDefault)?.id || (warehouses[0]?.id || ''));
      const destId = warehouses.find(w => w.id !== srcId)?.id || (warehouses[1]?.id || '');

      setSourceWarehouseId(srcId);
      setDestinationWarehouseId(destId);
      setQuantity('1');
      setNotes('Pengisian stok display cepat');
    }
  }, [isOpen, initialProductId, initialSourceWarehouseId, warehouses, products]);

  // Fetch stock at selected source warehouse
  useEffect(() => {
    if (!sourceWarehouseId || !selectedProductId) return;

    const fetchStock = async () => {
      try {
        const res = await fetch(`/api/v1/warehouses/${sourceWarehouseId}/stocks`);
        if (res.ok) {
          const data = await res.json();
          const item = data.find((s: any) => s.productId === selectedProductId);
          setSourceStock(item ? item.currentStock : 0);
        }
      } catch {
        setSourceStock(0);
      }
    };

    fetchStock();
  }, [sourceWarehouseId, selectedProductId]);

  if (!isOpen) return null;

  const selectedProduct = products.find(p => (p.id || (p as any).Id) === selectedProductId);
  const qtyNum = parseFloat(quantity) || 0;
  const isOverStock = qtyNum > sourceStock;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedProductId || !sourceWarehouseId || !destinationWarehouseId) {
      useToastStore.getState().showToast('Lengkapi produk dan lokasi gudang.', 'warning');
      return;
    }

    if (sourceWarehouseId === destinationWarehouseId) {
      useToastStore.getState().showToast('Gudang asal dan tujuan tidak boleh sama!', 'warning');
      return;
    }

    if (qtyNum <= 0) {
      useToastStore.getState().showToast('Jumlah rebalance harus lebih dari 0.', 'warning');
      return;
    }

    if (qtyNum > sourceStock) {
      useToastStore.getState().showToast(`Stok tidak mencukupi (Tersedia: ${sourceStock}, Diminta: ${qtyNum})!`, 'error');
      return;
    }

    try {
      setIsSubmitting(true);
      const res = await fetch('/api/v1/warehouses/quick-rebalance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productId: selectedProductId,
          sourceWarehouseId,
          destinationWarehouseId,
          quantity: qtyNum,
          notes: notes.trim() || 'Quick Rebalance',
          staffName: currentUser?.fullName || 'Staff'
        })
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || 'Gagal memindahkan stok.');
      }

      const data = await res.json();
      useToastStore.getState().showToast(data.message || 'Stok berhasil dipindahkan seketika!', 'success');
      onRebalanced();
      onClose();
    } catch (err: any) {
      useToastStore.getState().showToast(err.message || 'Terjadi kesalahan sistem.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4 select-none">
      <div className="bg-surface border border-border-strong w-full max-w-lg rounded-2xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-5 py-4 border-b border-border-subtle flex items-center justify-between bg-subtle">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-bold">
              <RefreshCw className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-text-primary">
                Quick Stock Rebalance (Pindah Stok Cepat)
              </h2>
              <p className="text-[11px] text-text-secondary">
                Pemindahan stok instan antar rak / etalase toko tanpa alur ekspedisi
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-text-muted hover:text-text-primary hover:bg-card-hover transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5 space-y-4 text-xs">
          {/* Select Product */}
          <div>
            <label className="block text-text-secondary font-bold mb-1">
              Pilih Produk yang Akan Dipindahkan <span className="text-status-danger">*</span>
            </label>
            <select
              value={selectedProductId}
              onChange={(e) => setSelectedProductId(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl bg-card border border-border-strong font-bold text-text-primary focus:outline-none focus:border-primary appearance-none cursor-pointer"
              required
            >
              {products.map(p => {
                const pId = p.id || (p as any).Id;
                return (
                  <option key={pId} value={pId}>
                    {p.name} (SKU: {p.sku}) · Total: {p.currentStock} {p.unit || 'PCS'}
                  </option>
                );
              })}
            </select>
          </div>

          {/* Source & Destination Warehouse Route */}
          <div className="p-3.5 rounded-xl bg-card border border-border-subtle space-y-3">
            <div className="grid grid-cols-2 gap-3 items-center">
              <div>
                <label className="block text-[11px] font-bold text-text-secondary mb-1">
                  Dari Gudang Asal:
                </label>
                <select
                  value={sourceWarehouseId}
                  onChange={(e) => setSourceWarehouseId(e.target.value)}
                  className="w-full px-2.5 py-1.5 rounded-lg bg-subtle border border-border-strong font-bold text-text-primary focus:outline-none focus:border-primary"
                  required
                >
                  {warehouses.map(w => (
                    <option key={w.id} value={w.id} disabled={w.id === destinationWarehouseId}>
                      {w.code} - {w.name}
                    </option>
                  ))}
                </select>
                <p className="text-[10px] text-text-muted mt-1">
                  Tersedia: <strong className="font-mono text-text-primary">{sourceStock} {selectedProduct?.unit || 'PCS'}</strong>
                </p>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-text-secondary mb-1">
                  Ke Gudang Tujuan:
                </label>
                <select
                  value={destinationWarehouseId}
                  onChange={(e) => setDestinationWarehouseId(e.target.value)}
                  className="w-full px-2.5 py-1.5 rounded-lg bg-subtle border border-border-strong font-bold text-text-primary focus:outline-none focus:border-primary"
                  required
                >
                  {warehouses.map(w => (
                    <option key={w.id} value={w.id} disabled={w.id === sourceWarehouseId}>
                      {w.code} - {w.name}
                    </option>
                  ))}
                </select>
                <p className="text-[10px] text-text-muted mt-1">
                  Target alokasi stok baru
                </p>
              </div>
            </div>
          </div>

          {/* Quantity Input */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-text-secondary font-bold mb-1">
                Kuantitas yang Dipindahkan <span className="text-status-danger">*</span>
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min={0.01}
                  step={1}
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  className={`w-full px-3 py-2 rounded-xl bg-card border font-mono font-bold text-text-primary focus:outline-none ${
                    isOverStock ? 'border-status-danger text-status-danger' : 'border-border-strong focus:border-primary'
                  }`}
                  required
                />
                <span className="font-bold text-text-secondary">{selectedProduct?.unit || 'PCS'}</span>
              </div>
              {isOverStock && (
                <p className="text-[10px] text-status-danger font-bold mt-1">Melebihi stok di gudang asal!</p>
              )}
            </div>

            <div>
              <label className="block text-text-secondary font-bold mb-1">
                Alasan / Keperluan
              </label>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Contoh: Isi rak etalase kasir"
                className="w-full px-3 py-2 rounded-xl bg-card border border-border-strong text-text-primary focus:outline-none focus:border-primary"
              />
            </div>
          </div>

          {/* Summary Box */}
          <div className="p-3 bg-subtle border border-border-subtle rounded-xl flex items-center justify-between text-xs">
            <span className="text-text-secondary">Nilai HPP Barang:</span>
            <span className="font-bold font-mono text-primary text-sm">
              Rp {((selectedProduct?.buyPrice || 0) * qtyNum).toLocaleString('id-ID')}
            </span>
          </div>

          {/* Action Buttons */}
          <div className="pt-3 flex items-center justify-end gap-2.5 border-t border-border-subtle">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-subtle hover:bg-card-hover border border-border-subtle text-text-secondary font-bold transition-colors"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={isSubmitting || isOverStock || qtyNum <= 0}
              className="px-5 py-2 rounded-xl bg-primary hover:bg-primary-hover disabled:opacity-50 text-primary-text font-bold shadow-sm flex items-center gap-1.5 transition-all"
            >
              <Check className="w-4 h-4" />
              <span>{isSubmitting ? 'Memproses...' : 'Pindahkan Stok Sekarang'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
