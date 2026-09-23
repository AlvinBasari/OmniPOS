import React, { useState, useEffect } from 'react';
import { X, PackagePlus, Building2, Plus, Trash2, CheckCircle2, AlertCircle, Calendar, User, FileText } from 'lucide-react';
import { ConsignmentVendor, Product } from '../../types';

interface ConsignmentIntakeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  vendors: ConsignmentVendor[];
}

interface IntakeItemRow {
  productId?: string;
  productName: string;
  productSku: string;
  productBarcode?: string;
  quantity: number;
  vendorPrice: number;
  sellPrice: number;
  commissionRatePercent: number;
  notes?: string;
}

export const ConsignmentIntakeModal: React.FC<ConsignmentIntakeModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  vendors
}) => {
  const [vendorId, setVendorId] = useState('');
  const [intakeDate, setIntakeDate] = useState(new Date().toISOString().split('T')[0]);
  const [staffName, setStaffName] = useState('Budi Santoso (Gudang)');
  const [notes, setNotes] = useState('');
  const [items, setItems] = useState<IntakeItemRow[]>([]);
  const [availableProducts, setAvailableProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      if (vendors.length > 0 && !vendorId) {
        setVendorId(vendors[0].id);
      }
      setIntakeDate(new Date().toISOString().split('T')[0]);
      setStaffName('Budi Santoso (Gudang)');
      setNotes('');
      setItems([
        {
          productName: '',
          productSku: `CON-${Date.now().toString().slice(-6)}`,
          quantity: 10,
          vendorPrice: 0,
          sellPrice: 0,
          commissionRatePercent: 15,
          notes: ''
        }
      ]);
      fetchProducts();
    }
  }, [isOpen, vendors]);

  const handleVendorChange = (vId: string) => {
    setVendorId(vId);
    const selectedVnd = vendors.find(v => v.id === vId);
    if (selectedVnd) {
      setItems(prev => prev.map(item => ({
        ...item,
        commissionRatePercent: selectedVnd.defaultCommissionRate || 15
      })));
    }
  };

  const fetchProducts = async () => {
    try {
      const res = await fetch('/api/v1/products?pageSize=100');
      if (res.ok) {
        const data = await res.json();
        setAvailableProducts(data.items || data || []);
      }
    } catch (e) {
      console.error(e);
    }
  };

  if (!isOpen) return null;

  const addItemRow = () => {
    const selectedVnd = vendors.find(v => v.id === vendorId);
    setItems(prev => [
      ...prev,
      {
        productName: '',
        productSku: `CON-${Date.now().toString().slice(-6)}`,
        quantity: 10,
        vendorPrice: 0,
        sellPrice: 0,
        commissionRatePercent: selectedVnd?.defaultCommissionRate || 15,
        notes: ''
      }
    ]);
  };

  const removeItemRow = (index: number) => {
    if (items.length <= 1) return;
    setItems(prev => prev.filter((_, i) => i !== index));
  };

  const updateItemRow = (index: number, field: keyof IntakeItemRow, val: any) => {
    setItems(prev => {
      const copy = [...prev];
      const row = { ...copy[index], [field]: val };

      if (field === 'sellPrice' && row.commissionRatePercent > 0) {
        const sell = Number(val) || 0;
        row.vendorPrice = Math.round(sell * (1 - (row.commissionRatePercent / 100)));
      } else if (field === 'commissionRatePercent' && row.sellPrice > 0) {
        const rate = Number(val) || 0;
        row.vendorPrice = Math.round(row.sellPrice * (1 - (rate / 100)));
      }

      copy[index] = row;
      return copy;
    });
  };

  const handleSelectExistingProduct = (index: number, product: Product) => {
    setItems(prev => {
      const copy = [...prev];
      const selectedVnd = vendors.find(v => v.id === vendorId);
      const commRate = product.consignmentCommissionRate || selectedVnd?.defaultCommissionRate || 15;
      const vendorPrice = (product.consignmentVendorPrice && product.consignmentVendorPrice > 0)
        ? product.consignmentVendorPrice 
        : Math.round(product.sellPrice * (1 - (commRate / 100)));

      copy[index] = {
        ...copy[index],
        productId: product.id,
        productName: product.name,
        productSku: product.sku,
        productBarcode: product.barcode || '',
        sellPrice: product.sellPrice,
        vendorPrice: vendorPrice,
        commissionRatePercent: commRate
      };
      return copy;
    });
  };

  const totalUnits = items.reduce((acc, it) => acc + (Number(it.quantity) || 0), 0);
  const totalSellValue = items.reduce((acc, it) => acc + ((Number(it.quantity) || 0) * (Number(it.sellPrice) || 0)), 0);
  const totalVendorValue = items.reduce((acc, it) => acc + ((Number(it.quantity) || 0) * (Number(it.vendorPrice) || 0)), 0);
  const totalStoreMargin = totalSellValue - totalVendorValue;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!vendorId) {
      setError('Pilih vendor konsinyasi terlebih dahulu.');
      return;
    }

    const validItems = items.filter(i => i.productName.trim() && i.quantity > 0);
    if (validItems.length === 0) {
      setError('Masukkan minimal 1 barang titipan dengan nama dan kuantitas valid.');
      return;
    }

    setLoading(true);
    setError(null);

    const payload = {
      vendorId,
      intakeDate: new Date(intakeDate).toISOString(),
      staffName: staffName.trim() || undefined,
      notes: notes.trim() || undefined,
      items: validItems.map(i => ({
        productId: i.productId || undefined,
        productName: i.productName.trim(),
        productSku: i.productSku.trim(),
        productBarcode: i.productBarcode?.trim() || undefined,
        quantity: Number(i.quantity),
        vendorPrice: Number(i.vendorPrice),
        sellPrice: Number(i.sellPrice),
        commissionRatePercent: Number(i.commissionRatePercent),
        commissionType: 0,
        notes: i.notes?.trim() || undefined
      }))
    };

    try {
      const res = await fetch('/api/v1/consignment/intakes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => null);
        throw new Error(errData?.message || 'Gagal menyimpan tanda terima barang konsinyasi.');
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
      <div className="bg-surface border border-border-subtle w-full max-w-5xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[94vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border-subtle bg-subtle">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-primary/10 border border-primary/20 text-primary rounded-xl">
              <PackagePlus className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-text-primary">
                Tanda Terima Barang Titip Jual (Intake Konsinyasi)
              </h2>
              <p className="text-xs text-text-secondary">
                Pencatatan penerimaan stok barang konsinyasi baru & penambahan kuantitas ke etalase toko
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

          {/* Section 1: Informasi Dokumen & Vendor */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 bg-card/60 border border-border-subtle p-4 rounded-xl">
            <div className="md:col-span-2">
              <label className="block text-xs font-semibold text-text-primary mb-1.5 flex items-center gap-1">
                <Building2 className="w-3.5 h-3.5 text-primary" /> Pilih Mitra Vendor Penitip <span className="text-status-danger">*</span>
              </label>
              <select
                required
                value={vendorId}
                onChange={(e) => handleVendorChange(e.target.value)}
                className="w-full bg-card border border-border-subtle rounded-xl px-3.5 py-2 text-xs text-text-primary focus:outline-none focus:border-border-focus font-semibold"
              >
                <option value="">-- Pilih Vendor Konsinyasi --</option>
                {vendors.map(v => (
                  <option key={v.id} value={v.id}>
                    [{v.vendorCode}] {v.name} ({v.commissionType === 1 || v.commissionType === 'FixedCost' ? 'Fixed Margin' : `${v.defaultCommissionRate}% Komisi`})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-text-primary mb-1.5 flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-text-muted" /> Tanggal Terima
              </label>
              <input
                type="date"
                required
                value={intakeDate}
                onChange={(e) => setIntakeDate(e.target.value)}
                className="w-full bg-card border border-border-subtle rounded-xl px-3.5 py-2 text-xs text-text-primary focus:outline-none focus:border-border-focus"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-text-primary mb-1.5 flex items-center gap-1">
                <User className="w-3.5 h-3.5 text-text-muted" /> Petugas Penerima
              </label>
              <input
                type="text"
                value={staffName}
                onChange={(e) => setStaffName(e.target.value)}
                className="w-full bg-card border border-border-subtle rounded-xl px-3.5 py-2 text-xs text-text-primary focus:outline-none focus:border-border-focus"
              />
            </div>
          </div>

          {/* Section 2: Tabel Daftar Barang Titipan */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-semibold text-primary uppercase tracking-wider flex items-center gap-1.5">
                <PackagePlus className="w-3.5 h-3.5" /> Rincian Barang Titip Jual ({items.length} Baris)
              </h3>
              <button
                type="button"
                onClick={addItemRow}
                className="px-3 py-1.5 bg-primary/10 hover:bg-primary/20 text-primary border border-primary/30 text-xs font-semibold rounded-lg transition flex items-center gap-1.5"
              >
                <Plus className="w-3.5 h-3.5" /> Tambah Baris Barang
              </button>
            </div>

            <div className="border border-border-subtle rounded-xl overflow-hidden">
              <table className="w-full text-left text-xs">
                <thead className="bg-subtle text-text-secondary font-semibold border-b border-border-subtle">
                  <tr>
                    <th className="p-3 w-8 text-center">#</th>
                    <th className="p-3">Nama Produk Titipan & SKU</th>
                    <th className="p-3 w-24 text-center">Kuantitas</th>
                    <th className="p-3 w-32">Harga Jual Kasir (Rp)</th>
                    <th className="p-3 w-24 text-center">Komisi Toko</th>
                    <th className="p-3 w-32">Harga Hak Vendor (Rp)</th>
                    <th className="p-3 w-32">Subtotal Omset (Rp)</th>
                    <th className="p-3 w-12 text-center">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border-subtle bg-surface text-text-primary">
                  {items.map((row, idx) => {
                    const rowSellSubtotal = (Number(row.quantity) || 0) * (Number(row.sellPrice) || 0);
                    return (
                      <tr key={idx} className="hover:bg-card-hover/50 transition">
                        <td className="p-3 text-center text-text-muted">{idx + 1}</td>
                        <td className="p-3 space-y-1">
                          <input
                            type="text"
                            required
                            placeholder="Nama Produk (e.g. Keripik Tempe 200g)"
                            value={row.productName}
                            onChange={(e) => updateItemRow(idx, 'productName', e.target.value)}
                            className="w-full bg-card border border-border-subtle rounded-lg px-2.5 py-1 text-xs text-text-primary placeholder:text-text-muted focus:outline-none focus:border-border-focus"
                          />
                          <div className="flex gap-2">
                            <input
                              type="text"
                              placeholder="SKU: CON-XXX"
                              value={row.productSku}
                              onChange={(e) => updateItemRow(idx, 'productSku', e.target.value.toUpperCase())}
                              className="w-1/2 bg-card/70 border border-border-subtle rounded-lg px-2 py-0.5 text-[11px] text-text-secondary font-mono uppercase"
                            />
                            {availableProducts.length > 0 && (
                              <select
                                onChange={(e) => {
                                  const prod = availableProducts.find(p => p.id === e.target.value);
                                  if (prod) handleSelectExistingProduct(idx, prod);
                                }}
                                className="w-1/2 bg-card/70 border border-border-subtle rounded-lg px-1.5 py-0.5 text-[11px] text-text-muted focus:outline-none"
                              >
                                <option value="">Pilih dari Produk Ada</option>
                                {availableProducts.map(p => (
                                  <option key={p.id} value={p.id}>{p.name} ({p.sku})</option>
                                ))}
                              </select>
                            )}
                          </div>
                        </td>
                        <td className="p-3">
                          <input
                            type="number"
                            min="1"
                            required
                            value={row.quantity}
                            onChange={(e) => updateItemRow(idx, 'quantity', parseFloat(e.target.value) || 0)}
                            className="w-full bg-card border border-border-subtle rounded-lg px-2 py-1 text-xs text-text-primary text-center font-bold focus:outline-none focus:border-border-focus"
                          />
                        </td>
                        <td className="p-3">
                          <input
                            type="number"
                            min="0"
                            step="500"
                            required
                            value={row.sellPrice}
                            onChange={(e) => updateItemRow(idx, 'sellPrice', parseFloat(e.target.value) || 0)}
                            className="w-full bg-card border border-border-subtle rounded-lg px-2 py-1 text-xs text-text-primary font-semibold focus:outline-none focus:border-border-focus"
                          />
                        </td>
                        <td className="p-3">
                          <div className="relative">
                            <input
                              type="number"
                              min="0"
                              max="100"
                              step="0.5"
                              value={row.commissionRatePercent}
                              onChange={(e) => updateItemRow(idx, 'commissionRatePercent', parseFloat(e.target.value) || 0)}
                              className="w-full bg-card border border-border-subtle rounded-lg pl-2 pr-5 py-1 text-xs text-text-primary text-center font-semibold focus:outline-none focus:border-border-focus"
                            />
                            <span className="absolute right-1.5 top-1/2 -translate-y-1/2 text-[10px] text-text-muted font-bold">%</span>
                          </div>
                        </td>
                        <td className="p-3">
                          <input
                            type="number"
                            min="0"
                            step="500"
                            required
                            value={row.vendorPrice}
                            onChange={(e) => updateItemRow(idx, 'vendorPrice', parseFloat(e.target.value) || 0)}
                            className="w-full bg-card border border-border-subtle rounded-lg px-2 py-1 text-xs text-status-success font-semibold focus:outline-none focus:border-border-focus"
                          />
                        </td>
                        <td className="p-3 font-mono font-bold text-text-primary">
                          Rp {rowSellSubtotal.toLocaleString('id-ID')}
                        </td>
                        <td className="p-3 text-center">
                          <button
                            type="button"
                            onClick={() => removeItemRow(idx)}
                            disabled={items.length <= 1}
                            className="p-1 text-text-muted hover:text-status-danger rounded transition disabled:opacity-30"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Section 3: Ringkasan Nilai Finansial */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 p-4 bg-subtle border border-border-subtle rounded-xl">
            <div className="p-3 bg-card rounded-lg border border-border-subtle">
              <span className="text-[11px] text-text-secondary block">Total Unit Diterima</span>
              <span className="text-lg font-bold text-text-primary">{totalUnits} Unit</span>
            </div>
            <div className="p-3 bg-card rounded-lg border border-border-subtle">
              <span className="text-[11px] text-text-secondary block">Estimasi Omset Jual (100%)</span>
              <span className="text-lg font-bold text-primary">Rp {totalSellValue.toLocaleString('id-ID')}</span>
            </div>
            <div className="p-3 bg-card rounded-lg border border-border-subtle">
              <span className="text-[11px] text-text-secondary block">Hak Bayar Pokok Vendor</span>
              <span className="text-lg font-bold text-status-success">Rp {totalVendorValue.toLocaleString('id-ID')}</span>
            </div>
            <div className="p-3 bg-card rounded-lg border border-border-subtle">
              <span className="text-[11px] text-text-secondary block">Estimasi Margin Komisi Toko</span>
              <span className="text-lg font-bold text-status-info">Rp {totalStoreMargin.toLocaleString('id-ID')}</span>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-text-primary mb-1.5 flex items-center gap-1">
              <FileText className="w-3.5 h-3.5 text-text-muted" /> Catatan Tanda Terima
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Catatan kondisi dus, masa kadaluarsa, perjanjian penataan etalase..."
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
              disabled={loading}
              className="px-6 py-2 bg-primary hover:bg-primary-hover text-white font-bold text-xs rounded-xl transition flex items-center gap-2 disabled:opacity-50 shadow-sm"
            >
              <CheckCircle2 className="w-4 h-4" />
              {loading ? 'Memproses...' : 'Simpan Tanda Terima & Tambah Stok'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
