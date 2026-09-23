import React, { useState, useEffect } from 'react';
import { X, Calculator, Building2, Calendar, DollarSign, CheckCircle2, AlertCircle, RefreshCw, FileText, ArrowRight, Wallet, Landmark } from 'lucide-react';
import { ConsignmentVendor, ConsignmentSettlementItem } from '../../types';

interface ConsignmentSettlementModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  vendors: ConsignmentVendor[];
}

export const ConsignmentSettlementModal: React.FC<ConsignmentSettlementModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  vendors
}) => {
  const [vendorId, setVendorId] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [staffName, setStaffName] = useState('Staff Keuangan');
  const [paymentMethod, setPaymentMethod] = useState('Transfer Bank');
  const [bankDestination, setBankDestination] = useState('');
  const [notes, setNotes] = useState('');
  const [approveImmediately, setApproveImmediately] = useState(true);

  const [calculating, setCalculating] = useState(false);
  const [calculated, setCalculated] = useState(false);
  const [previewItems, setPreviewItems] = useState<ConsignmentSettlementItem[]>([]);
  const [totalSoldQuantity, setTotalSoldQuantity] = useState(0);
  const [totalGrossSales, setTotalGrossSales] = useState(0);
  const [totalStoreCommission, setTotalStoreCommission] = useState(0);
  const [totalVendorPayable, setTotalVendorPayable] = useState(0);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      if (vendors.length > 0 && !vendorId) {
        setVendorId(vendors[0].id);
        const v = vendors[0];
        setBankDestination(`${v.bankName || 'Bank'} - ${v.bankAccountNumber || '-'} (${v.bankAccountHolder || v.name})`);
      }
      
      // Default: Last 30 days up to today
      const now = new Date();
      const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
      setStartDate(firstDay.toISOString().split('T')[0]);
      setEndDate(now.toISOString().split('T')[0]);
      
      setStaffName('Staff Keuangan');
      setPaymentMethod('Transfer Bank');
      setNotes('');
      setApproveImmediately(true);
      setCalculated(false);
      setPreviewItems([]);
      setError(null);
    }
  }, [isOpen, vendors]);

  const handleVendorSelect = (vId: string) => {
    setVendorId(vId);
    setCalculated(false);
    const v = vendors.find(x => x.id === vId);
    if (v) {
      setBankDestination(`${v.bankName || 'Bank'} - ${v.bankAccountNumber || '-'} (${v.bankAccountHolder || v.name})`);
    }
  };

  if (!isOpen) return null;

  const handleCalculatePreview = async () => {
    if (!vendorId) {
      setError('Pilih vendor konsinyasi terlebih dahulu.');
      return;
    }
    if (!startDate || !endDate) {
      setError('Tentukan rentang tanggal awal dan akhir penjualan.');
      return;
    }

    setCalculating(true);
    setError(null);

    try {
      const res = await fetch('/api/v1/consignment/settlements/calculate-preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          vendorId,
          periodStartDate: new Date(startDate).toISOString(),
          periodEndDate: new Date(endDate).toISOString()
        })
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => null);
        throw new Error(errData?.message || 'Gagal menghitung rekonsiliasi penjualan.');
      }

      const data = await res.json();
      setPreviewItems(data.items || []);
      setTotalSoldQuantity(data.totalSoldQuantity || 0);
      setTotalGrossSales(data.totalGrossSales || 0);
      setTotalStoreCommission(data.totalStoreCommission || 0);
      setTotalVendorPayable(data.totalVendorPayable || 0);
      setCalculated(true);

      if (data.items.length === 0) {
        setError('Tidak ada data produk titipan yang terdata untuk periode tanggal ini.');
      }
    } catch (err: any) {
      setError(err.message || 'Terjadi kesalahan sistem.');
    } finally {
      setCalculating(false);
    }
  };

  const updateItemQty = (index: number, newQty: number) => {
    setPreviewItems(prev => {
      const copy = [...prev];
      const item = { ...copy[index] };
      const qty = Math.max(0, newQty);
      item.soldQuantity = qty;
      item.totalSalesAmount = qty * item.unitSellPrice;
      
      const selectedVnd = vendors.find(v => v.id === vendorId);
      const commRate = selectedVnd?.defaultCommissionRate || 15;
      item.storeCommissionAmount = Math.round(item.totalSalesAmount * (commRate / 100));
      item.vendorPayableAmount = item.totalSalesAmount - item.storeCommissionAmount;

      copy[index] = item;

      // Recalculate totals
      const tQty = copy.reduce((acc, it) => acc + it.soldQuantity, 0);
      const tGross = copy.reduce((acc, it) => acc + it.totalSalesAmount, 0);
      const tComm = copy.reduce((acc, it) => acc + it.storeCommissionAmount, 0);
      const tPayable = copy.reduce((acc, it) => acc + it.vendorPayableAmount, 0);

      setTotalSoldQuantity(tQty);
      setTotalGrossSales(tGross);
      setTotalStoreCommission(tComm);
      setTotalVendorPayable(tPayable);

      return copy;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!calculated || previewItems.length === 0) {
      setError('Silakan jalankan perhitungan kalkulasi penjualan terlebih dahulu.');
      return;
    }

    if (totalSoldQuantity <= 0) {
      setError('Kuantitas produk terjual pada settlement ini harus lebih dari 0 unit.');
      return;
    }

    setLoading(true);
    setError(null);

    const payload = {
      vendorId,
      periodStartDate: new Date(startDate).toISOString(),
      periodEndDate: new Date(endDate).toISOString(),
      settlementDate: new Date().toISOString(),
      paymentMethod,
      bankDestination: bankDestination.trim() || undefined,
      notes: notes.trim() || undefined,
      staffName: staffName.trim() || undefined,
      approveImmediately,
      items: previewItems.map(i => ({
        productId: i.productId,
        productName: i.productName,
        productSku: i.productSku,
        soldQuantity: Number(i.soldQuantity),
        unitSellPrice: Number(i.unitSellPrice),
        totalSalesAmount: Number(i.totalSalesAmount),
        storeCommissionAmount: Number(i.storeCommissionAmount),
        vendorPayableAmount: Number(i.vendorPayableAmount),
        remainingStockSnapshot: Number(i.remainingStockSnapshot),
        notes: i.notes
      }))
    };

    try {
      const res = await fetch('/api/v1/consignment/settlements', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => null);
        throw new Error(errData?.message || 'Gagal menyimpan dokumen settlement.');
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
            <div className="p-2.5 bg-status-success/10 border border-status-success/20 text-status-success rounded-xl">
              <Calculator className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-text-primary">
                Buat Rekonsiliasi & Settlement Penjualan Konsinyasi
              </h2>
              <p className="text-xs text-text-secondary">
                Kalkulasi otomatis barang titip-jual yang laku di kasir POS, pembagian komisi toko, dan penetapan hak bayar vendor
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

          {/* Section 1: Filter Parameter Rekonsiliasi */}
          <div className="bg-card/60 border border-border-subtle p-4 rounded-xl space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="md:col-span-2">
                <label className="block text-xs font-semibold text-text-primary mb-1.5 flex items-center gap-1">
                  <Building2 className="w-3.5 h-3.5 text-status-success" /> Pilih Mitra Vendor Penitip <span className="text-status-danger">*</span>
                </label>
                <select
                  required
                  value={vendorId}
                  onChange={(e) => handleVendorSelect(e.target.value)}
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
                  <Calendar className="w-3.5 h-3.5 text-text-muted" /> Periode Dari Tanggal
                </label>
                <input
                  type="date"
                  required
                  value={startDate}
                  onChange={(e) => { setStartDate(e.target.value); setCalculated(false); }}
                  className="w-full bg-card border border-border-subtle rounded-xl px-3.5 py-2 text-xs text-text-primary focus:outline-none focus:border-border-focus"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-text-primary mb-1.5 flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5 text-text-muted" /> Sampai Tanggal
                </label>
                <input
                  type="date"
                  required
                  value={endDate}
                  onChange={(e) => { setEndDate(e.target.value); setCalculated(false); }}
                  className="w-full bg-card border border-border-subtle rounded-xl px-3.5 py-2 text-xs text-text-primary focus:outline-none focus:border-border-focus"
                />
              </div>
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-border-subtle">
              <span className="text-xs text-text-secondary">
                Sistem akan memindai seluruh transaksi kasir POS yang telah selesai (*Completed*) dalam rentang tanggal di atas.
              </span>
              <button
                type="button"
                onClick={handleCalculatePreview}
                disabled={calculating || !vendorId}
                className="px-5 py-2 bg-status-success/10 hover:bg-status-success/20 text-status-success border border-status-success/30 text-xs font-bold rounded-xl transition flex items-center gap-2 disabled:opacity-40"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${calculating ? 'animate-spin' : ''}`} />
                {calculating ? 'Menghitung Data POS...' : 'Tarik & Hitung Penjualan Real-Time'}
              </button>
            </div>
          </div>

          {/* Section 2: Hasil Perhitungan Item Terjual */}
          {calculated && (
            <div className="space-y-4 animate-fadeIn">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-semibold text-status-success uppercase tracking-wider flex items-center gap-1.5">
                  <DollarSign className="w-3.5 h-3.5" /> Rincian Barang Terjual & Split Komisi ({previewItems.length} Produk)
                </h3>
                <span className="text-xs font-medium text-text-secondary">
                  Total Laku: <strong className="text-text-primary">{totalSoldQuantity} Unit</strong>
                </span>
              </div>

              <div className="border border-border-subtle rounded-xl overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-subtle text-text-secondary font-semibold border-b border-border-subtle">
                    <tr>
                      <th className="p-3 w-8 text-center">#</th>
                      <th className="p-3">Nama Produk Titipan & SKU</th>
                      <th className="p-3 w-28 text-center">Qty Terjual</th>
                      <th className="p-3 w-32">Harga Jual (Rp)</th>
                      <th className="p-3 w-36">Total Omset Kasir (Rp)</th>
                      <th className="p-3 w-32">Komisi Toko (Rp)</th>
                      <th className="p-3 w-36 text-status-success">Hak Bayar Vendor (Rp)</th>
                      <th className="p-3 w-24 text-center">Sisa Stok</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border-subtle bg-surface text-text-primary">
                    {previewItems.map((item, idx) => (
                      <tr key={idx} className="hover:bg-card-hover/50 transition">
                        <td className="p-3 text-center text-text-muted">{idx + 1}</td>
                        <td className="p-3">
                          <p className="font-semibold text-text-primary">{item.productName}</p>
                          <p className="text-[11px] text-text-secondary font-mono">{item.productSku}</p>
                        </td>
                        <td className="p-3">
                          <input
                            type="number"
                            min="0"
                            value={item.soldQuantity}
                            onChange={(e) => updateItemQty(idx, parseFloat(e.target.value) || 0)}
                            className="w-full bg-card border border-border-subtle rounded-lg px-2 py-1 text-xs text-text-primary text-center font-bold focus:outline-none focus:border-border-focus"
                          />
                        </td>
                        <td className="p-3 font-mono">
                          Rp {item.unitSellPrice.toLocaleString('id-ID')}
                        </td>
                        <td className="p-3 font-mono font-semibold text-text-primary">
                          Rp {item.totalSalesAmount.toLocaleString('id-ID')}
                        </td>
                        <td className="p-3 font-mono font-semibold text-status-info">
                          Rp {item.storeCommissionAmount.toLocaleString('id-ID')}
                        </td>
                        <td className="p-3 font-mono font-bold text-status-success">
                          Rp {item.vendorPayableAmount.toLocaleString('id-ID')}
                        </td>
                        <td className="p-3 text-center font-semibold text-text-secondary">
                          {item.remainingStockSnapshot}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Rekap Finansial 4 Kotak */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 p-4 bg-subtle border border-border-subtle rounded-xl">
                <div className="p-3 bg-card rounded-lg border border-border-subtle">
                  <span className="text-[11px] text-text-secondary block">Total Unit Terjual</span>
                  <span className="text-xl font-black text-text-primary">{totalSoldQuantity} Unit</span>
                </div>
                <div className="p-3 bg-card rounded-lg border border-border-subtle">
                  <span className="text-[11px] text-text-secondary block">Total Omset Kotor POS</span>
                  <span className="text-xl font-black text-primary">Rp {totalGrossSales.toLocaleString('id-ID')}</span>
                </div>
                <div className="p-3 bg-card rounded-lg border border-border-subtle">
                  <span className="text-[11px] text-text-secondary block">Margin Komisi Toko</span>
                  <span className="text-xl font-black text-status-info">Rp {totalStoreCommission.toLocaleString('id-ID')}</span>
                </div>
                <div className="p-3 bg-status-success/10 rounded-lg border border-status-success/30">
                  <span className="text-[11px] text-status-success block font-semibold">Total Hak Bersih Vendor</span>
                  <span className="text-xl font-black text-status-success">Rp {totalVendorPayable.toLocaleString('id-ID')}</span>
                </div>
              </div>

              {/* Section 3: Detail Pembayaran & Approval */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-card/60 border border-border-subtle p-4 rounded-xl">
                <div>
                  <label className="block text-xs font-semibold text-text-primary mb-1.5 flex items-center gap-1">
                    <Wallet className="w-3.5 h-3.5 text-text-muted" /> Metode Pembayaran
                  </label>
                  <select
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                    className="w-full bg-card border border-border-subtle rounded-xl px-3 py-2 text-xs text-text-primary focus:outline-none focus:border-border-focus"
                  >
                    <option value="Transfer Bank">Transfer Bank</option>
                    <option value="Kas Toko">Kas Tunai Toko</option>
                    <option value="Giro / Cek">Giro / Cek Perusahaan</option>
                  </select>
                </div>

                <div className="md:col-span-2">
                  <label className="block text-xs font-semibold text-text-primary mb-1.5 flex items-center gap-1">
                    <Landmark className="w-3.5 h-3.5 text-text-muted" /> Rekening Tujuan Pembayaran
                  </label>
                  <input
                    type="text"
                    value={bankDestination}
                    onChange={(e) => setBankDestination(e.target.value)}
                    placeholder="Nama Bank & Nomor Rekening Tujuan Vendor..."
                    className="w-full bg-card border border-border-subtle rounded-xl px-3 py-2 text-xs text-text-primary placeholder:text-text-muted focus:outline-none focus:border-border-focus font-mono"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-xs font-semibold text-text-primary mb-1.5 flex items-center gap-1">
                    <FileText className="w-3.5 h-3.5 text-text-muted" /> Catatan Rekonsiliasi
                  </label>
                  <input
                    type="text"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="e.g. Settlement mingguan periode 1-15 September lunas"
                    className="w-full bg-card border border-border-subtle rounded-xl px-3 py-2 text-xs text-text-primary placeholder:text-text-muted focus:outline-none focus:border-border-focus"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-text-primary mb-1.5">
                    Petugas Keuangan
                  </label>
                  <input
                    type="text"
                    value={staffName}
                    onChange={(e) => setStaffName(e.target.value)}
                    className="w-full bg-card border border-border-subtle rounded-xl px-3 py-2 text-xs text-text-primary focus:outline-none focus:border-border-focus"
                  />
                </div>
              </div>

              <label className="flex items-center gap-2 cursor-pointer pt-1">
                <input
                  type="checkbox"
                  checked={approveImmediately}
                  onChange={(e) => setApproveImmediately(e.target.checked)}
                  className="w-4 h-4 rounded text-status-success bg-card border-border-subtle focus:ring-status-success focus:ring-offset-surface"
                />
                <span className="text-xs text-text-secondary font-medium">
                  Langsung setujui dokumen (*Approved*) dan masukkan kewajiban bayar ke saldo hutang vendor
                </span>
              </label>
            </div>
          )}

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
              disabled={loading || !calculated || previewItems.length === 0 || totalSoldQuantity <= 0}
              className="px-6 py-2 bg-status-success hover:opacity-90 text-white font-bold text-xs rounded-xl transition flex items-center gap-2 disabled:opacity-40 shadow-sm"
            >
              <CheckCircle2 className="w-4 h-4" />
              {loading ? 'Menyimpan...' : 'Simpan Dokumen Settlement'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
