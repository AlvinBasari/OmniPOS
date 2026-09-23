import React, { useState, useEffect } from 'react';
import { X, Undo2, Building2, Plus, Trash2, CheckCircle2, AlertCircle, Calendar, User, FileText } from 'lucide-react';
import { ConsignmentVendor, ConsignmentProduct } from '../../types';

interface ConsignmentReturnModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  vendors: ConsignmentVendor[];
}

interface ReturnItemRow {
  productId: string;
  productName: string;
  productSku: string;
  quantityReturned: number;
  maxStock: number;
  unitVendorPrice: number;
  notes?: string;
}

export const ConsignmentReturnModal: React.FC<ConsignmentReturnModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  vendors
}) => {
  const [vendorId, setVendorId] = useState('');
  const [returnDate, setReturnDate] = useState(new Date().toISOString().split('T')[0]);
  const [staffName, setStaffName] = useState('Staff Gudang');
  const [reason, setReason] = useState('Barang titip jual mendekati kadaluarsa / ditarik vendor');
  const [notes, setNotes] = useState('');
  const [items, setItems] = useState<ReturnItemRow[]>([]);
  const [vendorProducts, setVendorProducts] = useState<ConsignmentProduct[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      if (vendors.length > 0 && !vendorId) {
        setVendorId(vendors[0].id);
        fetchProductsForVendor(vendors[0].id);
      } else if (vendorId) {
        fetchProductsForVendor(vendorId);
      }
      setReturnDate(new Date().toISOString().split('T')[0]);
      setStaffName('Staff Gudang');
      setReason('Barang titip jual mendekati kadaluarsa / ditarik vendor');
      setNotes('');
      setItems([]);
      setError(null);
    }
  }, [isOpen, vendors]);

  const fetchProductsForVendor = async (vId: string) => {
    try {
      const res = await fetch(`/api/v1/consignment/products?vendorId=${vId}`);
      if (res.ok) {
        const data = await res.json();
        setVendorProducts(data || []);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleVendorChange = (vId: string) => {
    setVendorId(vId);
    setItems([]);
    fetchProductsForVendor(vId);
  };

  if (!isOpen) return null;

  const addItemRow = () => {
    if (vendorProducts.length === 0) {
      setError('Vendor ini tidak memiliki produk konsinyasi terdaftar.');
      return;
    }

    const firstProd = vendorProducts[0];
    setItems(prev => [
      ...prev,
      {
        productId: firstProd.id,
        productName: firstProd.name,
        productSku: firstProd.sku,
        quantityReturned: 1,
        maxStock: firstProd.currentStock,
        unitVendorPrice: firstProd.consignmentVendorPrice,
        notes: ''
      }
    ]);
  };

  const removeItemRow = (index: number) => {
    setItems(prev => prev.filter((_, i) => i !== index));
  };

  const handleProductSelect = (index: number, prodId: string) => {
    const prod = vendorProducts.find(p => p.id === prodId);
    if (!prod) return;

    setItems(prev => {
      const copy = [...prev];
      copy[index] = {
        ...copy[index],
        productId: prod.id,
        productName: prod.name,
        productSku: prod.sku,
        maxStock: prod.currentStock,
        unitVendorPrice: prod.consignmentVendorPrice
      };
      return copy;
    });
  };

  const updateItemQty = (index: number, val: number) => {
    setItems(prev => {
      const copy = [...prev];
      copy[index] = { ...copy[index], quantityReturned: Math.max(1, val) };
      return copy;
    });
  };

  const totalReturnQty = items.reduce((acc, it) => acc + (Number(it.quantityReturned) || 0), 0);
  const totalReturnValue = items.reduce((acc, it) => acc + ((Number(it.quantityReturned) || 0) * (Number(it.unitVendorPrice) || 0)), 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!vendorId) {
      setError('Pilih vendor konsinyasi terlebih dahulu.');
      return;
    }

    if (items.length === 0) {
      setError('Tambahkan minimal 1 barang yang akan diretur.');
      return;
    }

    setLoading(true);
    setError(null);

    const payload = {
      vendorId,
      returnDate: new Date(returnDate).toISOString(),
      reason: reason.trim() || undefined,
      staffName: staffName.trim() || undefined,
      notes: notes.trim() || undefined,
      items: items.map(i => ({
        productId: i.productId,
        productName: i.productName,
        productSku: i.productSku,
        quantityReturned: Number(i.quantityReturned),
        unitVendorPrice: Number(i.unitVendorPrice),
        notes: i.notes?.trim() || undefined
      }))
    };

    try {
      const res = await fetch('/api/v1/consignment/returns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => null);
        throw new Error(errData?.message || 'Gagal memproses retur konsinyasi.');
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Terjadi kesalahan sistem.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-fadeIn font-sans">
      <div className="bg-surface border border-border-subtle w-full max-w-3xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border-subtle bg-subtle">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-status-danger/10 border border-status-danger/20 text-status-danger rounded-xl">
              <Undo2 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-text-primary">
                Retur Barang Konsinyasi ke Vendor
              </h2>
              <p className="text-xs text-text-secondary">
                Pengembalian barang titip jual yang tidak laku/kadaluarsa & pengurangan stok etalase
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-text-muted hover:text-text-primary rounded-lg hover:bg-card-hover transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6 bg-surface text-text-primary">
          {error && (
            <div className="p-3 bg-rose-500/10 border border-rose-500/30 text-status-danger rounded-xl text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Section 1: Parameter Retur */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-card/60 border border-border-subtle p-4 rounded-xl">
            <div>
              <label className="block text-xs font-semibold text-text-primary mb-1.5 flex items-center gap-1">
                <Building2 className="w-3.5 h-3.5 text-status-danger" /> Vendor Tujuan Retur <span className="text-status-danger">*</span>
              </label>
              <select
                required
                value={vendorId}
                onChange={(e) => handleVendorChange(e.target.value)}
                className="w-full bg-card border border-border-subtle rounded-xl px-3.5 py-2 text-xs text-text-primary focus:outline-none focus:border-border-focus font-semibold"
              >
                <option value="">-- Pilih Vendor --</option>
                {vendors.map(v => (
                  <option key={v.id} value={v.id}>
                    [{v.vendorCode}] {v.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-text-primary mb-1.5 flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-text-muted" /> Tanggal Retur
              </label>
              <input
                type="date"
                required
                value={returnDate}
                onChange={(e) => setReturnDate(e.target.value)}
                className="w-full bg-card border border-border-subtle rounded-xl px-3.5 py-2 text-xs text-text-primary focus:outline-none focus:border-border-focus"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-text-primary mb-1.5 flex items-center gap-1">
                <User className="w-3.5 h-3.5 text-text-muted" /> Petugas Gudang
              </label>
              <input
                type="text"
                value={staffName}
                onChange={(e) => setStaffName(e.target.value)}
                className="w-full bg-card border border-border-subtle rounded-xl px-3.5 py-2 text-xs text-text-primary focus:outline-none focus:border-border-focus"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-text-primary mb-1.5">
              Alasan Retur Barang
            </label>
            <input
              type="text"
              required
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. Tidak laku setelah 30 hari / kemasan rusak / ditarik vendor"
              className="w-full bg-card border border-border-subtle rounded-xl px-3.5 py-2 text-xs text-text-primary placeholder:text-text-muted focus:outline-none focus:border-border-focus"
            />
          </div>

          {/* Section 2: Tabel Barang Diretur */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-semibold text-status-danger uppercase tracking-wider flex items-center gap-1.5">
                <Undo2 className="w-3.5 h-3.5" /> Rincian Barang yang Diretur ({items.length} Produk)
              </h3>
              <button
                type="button"
                onClick={addItemRow}
                disabled={vendorProducts.length === 0}
                className="px-3 py-1.5 bg-status-danger/10 hover:bg-status-danger/20 text-status-danger border border-status-danger/30 text-xs font-semibold rounded-lg transition flex items-center gap-1.5 disabled:opacity-30"
              >
                <Plus className="w-3.5 h-3.5" /> Tambah Barang
              </button>
            </div>

            {items.length === 0 ? (
              <div className="p-8 text-center border border-dashed border-border-subtle rounded-xl text-text-muted text-xs">
                Klik tombol <strong>+ Tambah Barang</strong> untuk memilih produk yang akan dikembalikan ke vendor.
              </div>
            ) : (
              <div className="border border-border-subtle rounded-xl overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-subtle text-text-secondary font-semibold border-b border-border-subtle">
                    <tr>
                      <th className="p-3 w-8 text-center">#</th>
                      <th className="p-3">Produk Konsinyasi</th>
                      <th className="p-3 w-28 text-center">Stok Ada</th>
                      <th className="p-3 w-32 text-center">Qty Retur</th>
                      <th className="p-3 w-32 text-right">Nilai Pokok</th>
                      <th className="p-3 w-12 text-center">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border-subtle bg-surface text-text-primary">
                    {items.map((row, idx) => (
                      <tr key={idx} className="hover:bg-card-hover/50 transition">
                        <td className="p-3 text-center text-text-muted">{idx + 1}</td>
                        <td className="p-3">
                          <select
                            value={row.productId}
                            onChange={(e) => handleProductSelect(idx, e.target.value)}
                            className="w-full bg-card border border-border-subtle rounded-lg px-2.5 py-1 text-xs text-text-primary focus:outline-none"
                          >
                            {vendorProducts.map(p => (
                              <option key={p.id} value={p.id}>
                                {p.name} ({p.sku}) — Sisa Stok: {p.currentStock}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td className="p-3 text-center font-bold text-text-secondary">
                          {row.maxStock}
                        </td>
                        <td className="p-3">
                          <input
                            type="number"
                            min="1"
                            max={row.maxStock}
                            required
                            value={row.quantityReturned}
                            onChange={(e) => updateItemQty(idx, parseFloat(e.target.value) || 0)}
                            className="w-full bg-card border border-border-subtle rounded-lg px-2 py-1 text-xs text-text-primary text-center font-bold focus:outline-none focus:border-border-focus"
                          />
                        </td>
                        <td className="p-3 text-right font-mono font-bold text-status-danger">
                          Rp {(row.quantityReturned * row.unitVendorPrice).toLocaleString('id-ID')}
                        </td>
                        <td className="p-3 text-center">
                          <button
                            type="button"
                            onClick={() => removeItemRow(idx)}
                            className="p-1 text-text-muted hover:text-status-danger rounded transition"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Ringkasan Retur */}
          {items.length > 0 && (
            <div className="flex justify-between items-center p-4 bg-subtle border border-border-subtle rounded-xl text-xs">
              <span className="text-text-secondary">Total Kuantitas Diretur: <strong className="text-text-primary">{totalReturnQty} Unit</strong></span>
              <span className="text-text-secondary">Total Nilai Pokok Retur: <strong className="text-status-danger font-mono">Rp {totalReturnValue.toLocaleString('id-ID')}</strong></span>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-text-primary mb-1.5 flex items-center gap-1">
              <FileText className="w-3.5 h-3.5 text-text-muted" /> Catatan Tambahan
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Catatan nomor resi pengembalian atau bukti serah terima..."
              className="w-full bg-card border border-border-subtle rounded-xl px-3.5 py-2 text-xs text-text-primary placeholder:text-text-muted focus:outline-none focus:border-border-focus resize-none"
            />
          </div>

          {/* Footer Buttons */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-border-subtle">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-text-secondary hover:text-text-primary hover:bg-card-hover rounded-xl transition"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={loading || items.length === 0}
              className="px-6 py-2 bg-status-danger hover:opacity-90 text-white font-bold text-xs rounded-xl transition flex items-center gap-2 disabled:opacity-50 shadow-sm"
            >
              <CheckCircle2 className="w-4 h-4" />
              {loading ? 'Memproses...' : 'Proses Retur & Potong Stok'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
