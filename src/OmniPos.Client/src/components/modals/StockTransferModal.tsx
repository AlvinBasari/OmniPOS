import React, { useState, useEffect } from 'react';
import { 
  Truck, 
  X, 
  Plus, 
  Trash2, 
  Search, 
  AlertCircle, 
  ArrowRight, 
  Building2, 
  Package, 
  CheckCircle2,
  Send,
  Save,
  Clock
} from 'lucide-react';
import { Warehouse, Product, WarehouseStockMatrixRow } from '../../types';
import { useToastStore } from '../../store/useToastStore';
import { useAuthStore } from '../../store/useAuthStore';

interface StockTransferModalProps {
  isOpen: boolean;
  onClose: () => void;
  warehouses: Warehouse[];
  products: Product[];
  onCreated: () => void;
}

interface TransferItemRow {
  productId: string;
  productName: string;
  sku: string;
  barcode?: string;
  unit: string;
  availableStock: number;
  quantity: number;
  unitCost: number;
  notes?: string;
}

export const StockTransferModal: React.FC<StockTransferModalProps> = ({
  isOpen,
  onClose,
  warehouses,
  products,
  onCreated,
}) => {
  const { currentUser } = useAuthStore();
  const [sourceWarehouseId, setSourceWarehouseId] = useState('');
  const [destinationWarehouseId, setDestinationWarehouseId] = useState('');
  const [driverName, setDriverName] = useState('');
  const [vehicleNumber, setVehicleNumber] = useState('');
  const [trackingNumber, setTrackingNumber] = useState('');
  const [notes, setNotes] = useState('');
  const [dispatchImmediately, setDispatchImmediately] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Items State
  const [items, setItems] = useState<TransferItemRow[]>([]);
  const [productSearch, setProductSearch] = useState('');
  const [sourceStocks, setSourceStocks] = useState<Record<string, number>>({});

  useEffect(() => {
    if (isOpen) {
      if (warehouses.length >= 2) {
        const defaultSrc = warehouses.find(w => w.isDefault) || warehouses[0];
        const defaultDest = warehouses.find(w => w.id !== defaultSrc.id) || warehouses[1];
        setSourceWarehouseId(defaultSrc.id);
        setDestinationWarehouseId(defaultDest.id);
      }
      setDriverName('');
      setVehicleNumber('');
      setTrackingNumber('');
      setNotes('');
      setDispatchImmediately(true);
      setItems([]);
      setProductSearch('');
    }
  }, [isOpen, warehouses]);

  // Fetch real-time stocks for selected source warehouse
  useEffect(() => {
    if (!sourceWarehouseId) return;

    const fetchSourceStocks = async () => {
      try {
        const res = await fetch(`/api/v1/warehouses/${sourceWarehouseId}/stocks`);
        if (res.ok) {
          const data = await res.json();
          const map: Record<string, number> = {};
          data.forEach((s: any) => {
            map[s.productId] = s.currentStock;
          });
          setSourceStocks(map);

          // Update available stock on existing rows
          setItems(prev => prev.map(row => ({
            ...row,
            availableStock: map[row.productId] ?? 0
          })));
        }
      } catch {}
    };

    fetchSourceStocks();
  }, [sourceWarehouseId]);

  if (!isOpen) return null;

  const handleAddItem = (prod: Product) => {
    const prodId = prod.id;
    if (items.some(i => i.productId === prodId)) {
      useToastStore.getState().showToast('Produk sudah ada di daftar transfer.', 'info');
      return;
    }

    const avail = sourceStocks[prodId] ?? prod.currentStock;

    setItems(prev => [
      ...prev,
      {
        productId: prodId,
        productName: prod.name,
        sku: prod.sku,
        barcode: prod.barcode,
        unit: prod.unit || 'PCS',
        availableStock: avail,
        quantity: Math.min(1, Math.max(1, avail)),
        unitCost: prod.buyPrice,
        notes: ''
      }
    ]);
    setProductSearch('');
  };

  const handleRemoveItem = (index: number) => {
    setItems(prev => prev.filter((_, idx) => idx !== index));
  };

  const handleQuantityChange = (index: number, val: number) => {
    setItems(prev => prev.map((row, idx) => {
      if (idx !== index) return row;
      const cleanVal = Math.max(0.01, isNaN(val) ? 0 : val);
      return { ...row, quantity: cleanVal };
    }));
  };

  const handleItemNotesChange = (index: number, val: string) => {
    setItems(prev => prev.map((row, idx) => idx === index ? { ...row, notes: val } : row));
  };

  const totalQuantity = items.reduce((acc, curr) => acc + curr.quantity, 0);
  const totalAssetValue = items.reduce((acc, curr) => acc + (curr.quantity * curr.unitCost), 0);

  const filteredProducts = productSearch.trim()
    ? products.filter(p => 
        p.name.toLowerCase().includes(productSearch.toLowerCase()) ||
        p.sku.toLowerCase().includes(productSearch.toLowerCase()) ||
        (p.barcode && p.barcode.toLowerCase().includes(productSearch.toLowerCase()))
      ).slice(0, 8)
    : [];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!sourceWarehouseId || !destinationWarehouseId) {
      useToastStore.getState().showToast('Pilih gudang asal dan gudang tujuan.', 'warning');
      return;
    }

    if (sourceWarehouseId === destinationWarehouseId) {
      useToastStore.getState().showToast('Gudang asal dan tujuan tidak boleh sama!', 'warning');
      return;
    }

    if (items.length === 0) {
      useToastStore.getState().showToast('Tambahkan minimal satu barang untuk ditransfer.', 'warning');
      return;
    }

    // Check if any quantity exceeds available stock if dispatched immediately
    if (dispatchImmediately) {
      const overStockItem = items.find(i => i.quantity > i.availableStock);
      if (overStockItem) {
        useToastStore.getState().showToast(
          `Jumlah transfer '${overStockItem.productName}' (${overStockItem.quantity}) melebihi stok tersedia (${overStockItem.availableStock})!`,
          'error'
        );
        return;
      }
    }

    try {
      setIsSubmitting(true);
      const res = await fetch('/api/v1/stock-transfers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sourceWarehouseId,
          destinationWarehouseId,
          driverOrCourierName: driverName.trim() || null,
          vehicleNumber: vehicleNumber.trim() || null,
          trackingNumber: trackingNumber.trim() || null,
          notes: notes.trim() || null,
          dispatchImmediately,
          staffName: currentUser?.fullName || 'Staff Logistik',
          items: items.map(i => ({
            productId: i.productId,
            quantity: i.quantity,
            notes: i.notes?.trim() || null
          }))
        })
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || 'Gagal membuat transfer stok.');
      }

      const createdTransfer = await res.json();
      useToastStore.getState().showToast(
        dispatchImmediately 
          ? `Surat Jalan ${createdTransfer.transferNumber} berhasil dibuat & diberangkatkan (In-Transit)!`
          : `Draft Transfer ${createdTransfer.transferNumber} berhasil disimpan!`,
        'success'
      );
      onCreated();
      onClose();
    } catch (err: any) {
      useToastStore.getState().showToast(err.message || 'Terjadi kesalahan sistem.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const srcWh = warehouses.find(w => w.id === sourceWarehouseId);
  const destWh = warehouses.find(w => w.id === destinationWarehouseId);

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4 select-none">
      <div className="bg-surface border border-border-strong w-full max-w-4xl rounded-2xl shadow-2xl flex flex-col max-h-[92vh] overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-5 py-4 border-b border-border-subtle flex items-center justify-between bg-subtle">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-bold">
              <Truck className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-text-primary">
                Buat Surat Perintah Transfer Stok Antar Gudang
              </h2>
              <p className="text-[11px] text-text-secondary">
                Mutasi persediaan barang antar cabang / gudang penyimpanan dengan pelacakan status resmi
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

        {/* Content Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5 space-y-4 text-xs">
          {/* Warehouse Route Card */}
          <div className="p-3.5 rounded-xl bg-card border border-border-subtle grid grid-cols-1 md:grid-cols-11 items-center gap-3">
            {/* Source Warehouse */}
            <div className="md:col-span-5 space-y-1">
              <label className="block text-[11px] font-bold text-text-secondary">
                Gudang Asal (Pengirim) <span className="text-status-danger">*</span>
              </label>
              <div className="relative">
                <select
                  value={sourceWarehouseId}
                  onChange={(e) => setSourceWarehouseId(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-subtle border border-border-strong font-bold text-text-primary focus:outline-none focus:border-primary appearance-none cursor-pointer"
                  required
                >
                  {warehouses.map(w => (
                    <option key={w.id} value={w.id} disabled={w.id === destinationWarehouseId}>
                      {w.code} - {w.name} {w.isDefault ? '(Utama)' : ''}
                    </option>
                  ))}
                </select>
              </div>
              {srcWh?.picName && (
                <p className="text-[10px] text-text-muted">PIC: {srcWh.picName}</p>
              )}
            </div>

            {/* Route Arrow Indicator */}
            <div className="md:col-span-1 flex items-center justify-center">
              <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center">
                <ArrowRight className="w-4 h-4" />
              </div>
            </div>

            {/* Destination Warehouse */}
            <div className="md:col-span-5 space-y-1">
              <label className="block text-[11px] font-bold text-text-secondary">
                Gudang Tujuan (Penerima) <span className="text-status-danger">*</span>
              </label>
              <div className="relative">
                <select
                  value={destinationWarehouseId}
                  onChange={(e) => setDestinationWarehouseId(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-subtle border border-border-strong font-bold text-text-primary focus:outline-none focus:border-primary appearance-none cursor-pointer"
                  required
                >
                  {warehouses.map(w => (
                    <option key={w.id} value={w.id} disabled={w.id === sourceWarehouseId}>
                      {w.code} - {w.name} {w.isDefault ? '(Utama)' : ''}
                    </option>
                  ))}
                </select>
              </div>
              {destWh?.picName && (
                <p className="text-[10px] text-text-muted">PIC: {destWh.picName}</p>
              )}
            </div>
          </div>

          {/* Logistics & Driver Details */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <label className="block text-text-secondary font-bold mb-1">
                Supir / Kurir Ekspedisi
              </label>
              <input
                type="text"
                value={driverName}
                onChange={(e) => setDriverName(e.target.value)}
                placeholder="Contoh: Budi (Kurir Toko) / Lalamove"
                className="w-full px-3 py-2 rounded-xl bg-card border border-border-strong text-text-primary focus:outline-none focus:border-primary"
              />
            </div>

            <div>
              <label className="block text-text-secondary font-bold mb-1">
                No. Polisi / Kendaraan
              </label>
              <input
                type="text"
                value={vehicleNumber}
                onChange={(e) => setVehicleNumber(e.target.value)}
                placeholder="Contoh: B 1234 XYZ (Grand Max)"
                className="w-full px-3 py-2 rounded-xl bg-card border border-border-strong text-text-primary focus:outline-none focus:border-primary uppercase"
              />
            </div>

            <div>
              <label className="block text-text-secondary font-bold mb-1">
                No. Resi / AWB (Jika Ekspedisi)
              </label>
              <input
                type="text"
                value={trackingNumber}
                onChange={(e) => setTrackingNumber(e.target.value)}
                placeholder="Contoh: LLM-9918230"
                className="w-full px-3 py-2 rounded-xl bg-card border border-border-strong text-text-primary focus:outline-none focus:border-primary"
              />
            </div>
          </div>

          {/* Product Search & Item Selector */}
          <div className="space-y-2">
            <label className="block text-text-secondary font-bold">
              Cari & Tambah Produk ke Surat Jalan Transfer
            </label>
            <div className="relative">
              <Search className="w-4 h-4 text-text-muted absolute left-3 top-2.5" />
              <input
                type="text"
                value={productSearch}
                onChange={(e) => setProductSearch(e.target.value)}
                placeholder="Ketik nama produk, kode SKU, atau scan barcode..."
                className="w-full pl-9 pr-4 py-2 rounded-xl bg-card border border-border-strong text-text-primary focus:outline-none focus:border-primary"
              />

              {/* Autocomplete Dropdown */}
              {filteredProducts.length > 0 && (
                <div className="absolute left-0 right-0 top-full mt-1 z-20 bg-surface border border-border-strong rounded-xl shadow-xl overflow-hidden max-h-52 overflow-y-auto">
                  {filteredProducts.map(p => {
                    const pId = p.id || (p as any).Id;
                    const avail = sourceStocks[pId] ?? p.currentStock;
                    return (
                      <button
                        key={pId}
                        type="button"
                        onClick={() => handleAddItem(p)}
                        className="w-full px-3.5 py-2 text-left hover:bg-card-hover border-b border-border-subtle/50 flex items-center justify-between transition-colors cursor-pointer"
                      >
                        <div>
                          <p className="font-bold text-text-primary">{p.name}</p>
                          <p className="text-[10px] text-text-muted font-mono">SKU: {p.sku} {p.barcode ? `· ${p.barcode}` : ''}</p>
                        </div>
                        <div className="text-right">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold font-mono ${
                            avail > 0 ? 'bg-emerald-500/15 text-status-success' : 'bg-rose-500/15 text-status-danger'
                          }`}>
                            Stok: {avail} {p.unit || 'PCS'}
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Transfer Items Table */}
          <div className="rounded-xl border border-border-subtle overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-subtle border-b border-border-subtle text-text-secondary font-bold">
                  <tr>
                    <th className="py-2.5 px-3">No</th>
                    <th className="py-2.5 px-3">Produk / Item</th>
                    <th className="py-2.5 px-3 text-center">Stok Gudang Asal</th>
                    <th className="py-2.5 px-3 text-center w-28">Qty Kirim</th>
                    <th className="py-2.5 px-3 text-right">Nilai HPP (Subtotal)</th>
                    <th className="py-2.5 px-3">Catatan / Rak</th>
                    <th className="py-2.5 px-3 text-center w-10">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border-subtle/60 bg-card">
                  {items.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-text-muted">
                        <Package className="w-7 h-7 mx-auto mb-1.5 opacity-40" />
                        <p>Belum ada produk yang ditambahkan ke surat jalan transfer.</p>
                        <p className="text-[10px]">Gunakan kolom pencarian di atas untuk menambahkan barang.</p>
                      </td>
                    </tr>
                  ) : (
                    items.map((row, idx) => {
                      const isOverStock = row.quantity > row.availableStock;
                      return (
                        <tr key={row.productId} className="hover:bg-card-hover/40 transition-colors">
                          <td className="py-2.5 px-3 font-mono text-text-muted">{idx + 1}</td>
                          <td className="py-2.5 px-3">
                            <p className="font-bold text-text-primary">{row.productName}</p>
                            <p className="text-[10px] text-text-muted font-mono">SKU: {row.sku}</p>
                          </td>
                          <td className="py-2.5 px-3 text-center font-mono">
                            <span className={`px-2 py-0.5 rounded font-bold ${
                              row.availableStock > 0 ? 'bg-subtle text-text-primary' : 'bg-status-danger/15 text-status-danger'
                            }`}>
                              {row.availableStock} {row.unit}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-center">
                            <div className="flex items-center justify-center gap-1">
                              <input
                                type="number"
                                min={0.01}
                                step={1}
                                value={row.quantity}
                                onChange={(e) => handleQuantityChange(idx, parseFloat(e.target.value))}
                                className={`w-20 px-2 py-1 rounded-lg bg-surface border text-center font-mono font-bold text-text-primary focus:outline-none ${
                                  isOverStock ? 'border-status-danger text-status-danger' : 'border-border-strong focus:border-primary'
                                }`}
                                required
                              />
                              <span className="text-[10px] text-text-muted font-medium">{row.unit}</span>
                            </div>
                            {isOverStock && (
                              <p className="text-[9px] text-status-danger font-bold mt-0.5">Melebihi stok!</p>
                            )}
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono font-bold text-text-primary">
                            Rp {(row.quantity * row.unitCost).toLocaleString('id-ID')}
                          </td>
                          <td className="py-2.5 px-3">
                            <input
                              type="text"
                              value={row.notes || ''}
                              onChange={(e) => handleItemNotesChange(idx, e.target.value)}
                              placeholder="Misal: Rak 2, Koli A"
                              className="w-full px-2 py-1 rounded-lg bg-surface border border-border-subtle text-text-primary focus:outline-none focus:border-primary text-[11px]"
                            />
                          </td>
                          <td className="py-2.5 px-3 text-center">
                            <button
                              type="button"
                              onClick={() => handleRemoveItem(idx)}
                              className="p-1 rounded-lg text-text-muted hover:text-status-danger hover:bg-status-danger/10 transition-colors"
                              title="Hapus baris"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Table Footer Summary */}
            {items.length > 0 && (
              <div className="p-3 bg-subtle border-t border-border-subtle flex flex-wrap items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-4 text-text-secondary">
                  <span>Total Variasi: <strong className="text-text-primary">{items.length} Item</strong></span>
                  <span>Total Kuantitas: <strong className="text-text-primary font-mono">{totalQuantity} Unit</strong></span>
                </div>
                <div className="text-right">
                  <span className="text-text-secondary">Total Nilai Aset: </span>
                  <span className="text-sm font-extrabold font-mono text-primary ml-1">
                    Rp {totalAssetValue.toLocaleString('id-ID')}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Notes & Dispatch Options */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
            <div>
              <label className="block text-text-secondary font-bold mb-1">
                Catatan Pengiriman & Instruksi Driver
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Misal: Barang rentan pecah, serahkan ke staf logistik shift sore..."
                rows={2}
                className="w-full px-3 py-2 rounded-xl bg-card border border-border-strong text-text-primary focus:outline-none focus:border-primary resize-none"
              />
            </div>

            <div className="space-y-2">
              <label className="block text-text-secondary font-bold mb-1">
                Pilihan Keberangkatan Transfer
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setDispatchImmediately(true)}
                  className={`p-2.5 rounded-xl border flex flex-col items-start gap-1 transition-all text-left cursor-pointer ${
                    dispatchImmediately
                      ? 'bg-primary/10 border-primary text-primary font-bold shadow-xs'
                      : 'bg-card border-border-subtle text-text-secondary hover:bg-card-hover'
                  }`}
                >
                  <div className="flex items-center gap-1.5 text-xs font-bold">
                    <Send className="w-3.5 h-3.5" />
                    <span>Kirim Sekarang (In-Transit)</span>
                  </div>
                  <p className="text-[10px] opacity-80 leading-snug">
                    Stok gudang asal langsung dipotong saat surat jalan dibuat.
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => setDispatchImmediately(false)}
                  className={`p-2.5 rounded-xl border flex flex-col items-start gap-1 transition-all text-left cursor-pointer ${
                    !dispatchImmediately
                      ? 'bg-amber-500/10 border-amber-500 text-amber-700 dark:text-amber-400 font-bold shadow-xs'
                      : 'bg-card border-border-subtle text-text-secondary hover:bg-card-hover'
                  }`}
                >
                  <div className="flex items-center gap-1.5 text-xs font-bold">
                    <Clock className="w-3.5 h-3.5" />
                    <span>Simpan Sebagai Draft</span>
                  </div>
                  <p className="text-[10px] opacity-80 leading-snug">
                    Stok belum dipotong, siap dicek ulang sebelum diberangkatkan.
                  </p>
                </button>
              </div>
            </div>
          </div>

          {/* Modal Actions */}
          <div className="pt-3 flex items-center justify-between border-t border-border-subtle">
            <p className="text-[11px] text-text-muted">
              Petugas: <strong className="text-text-primary">{currentUser?.fullName || 'Staff Logistik'}</strong>
            </p>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl bg-subtle hover:bg-card-hover border border-border-subtle text-text-secondary font-bold transition-colors"
              >
                Batal
              </button>
              <button
                type="submit"
                disabled={isSubmitting || items.length === 0}
                className="px-5 py-2 rounded-xl bg-primary hover:bg-primary-hover disabled:opacity-50 text-primary-text font-bold shadow-sm flex items-center gap-1.5 transition-all"
              >
                {dispatchImmediately ? <Send className="w-4 h-4" /> : <Save className="w-4 h-4" />}
                <span>
                  {isSubmitting
                    ? 'Memproses...'
                    : dispatchImmediately
                    ? 'Terbitkan Surat Jalan & Berangkatkan'
                    : 'Simpan Dokumen Draft'}
                </span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
