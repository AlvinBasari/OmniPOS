import React, { useState } from 'react';
import { X, Printer, FileText, Receipt, Building2, Calendar, CheckCircle2, Download } from 'lucide-react';
import { ConsignmentSettlement } from '../../types';

interface ConsignmentSettlementPrintModalProps {
  isOpen: boolean;
  onClose: () => void;
  settlement: ConsignmentSettlement;
}

export const ConsignmentSettlementPrintModal: React.FC<ConsignmentSettlementPrintModalProps> = ({
  isOpen,
  onClose,
  settlement
}) => {
  const [format, setFormat] = useState<'a4' | 'thermal'>('a4');

  if (!isOpen || !settlement) return null;

  const handlePrint = () => {
    window.print();
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '-';
    try {
      return new Date(dateStr).toLocaleDateString('id-ID', {
        day: 'numeric',
        month: 'long',
        year: 'numeric'
      });
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-fadeIn font-sans">
      <div className="bg-surface border border-border-subtle w-full max-w-4xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[94vh]">
        {/* Modal Top Bar */}
        <div className="flex items-center justify-between px-6 py-3.5 border-b border-border-subtle bg-subtle">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 border border-primary/20 text-primary rounded-xl">
              <Printer className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-text-primary">
                Cetak Bukti Rekonsiliasi & Voucher Pembayaran Vendor
              </h2>
              <p className="text-xs text-text-secondary">
                No. Dokumen: <span className="text-primary font-mono font-semibold">{settlement.settlementNumber}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Format Switcher */}
            <div className="flex bg-card p-1 rounded-xl border border-border-subtle">
              <button
                type="button"
                onClick={() => setFormat('a4')}
                className={`flex items-center gap-1.5 px-3 py-1 text-xs font-semibold rounded-lg transition ${
                  format === 'a4'
                    ? 'bg-primary text-white shadow'
                    : 'text-text-muted hover:text-text-primary'
                }`}
              >
                <FileText className="w-3.5 h-3.5" /> Surat A4 Resmi
              </button>
              <button
                type="button"
                onClick={() => setFormat('thermal')}
                className={`flex items-center gap-1.5 px-3 py-1 text-xs font-semibold rounded-lg transition ${
                  format === 'thermal'
                    ? 'bg-primary text-white shadow'
                    : 'text-text-muted hover:text-text-primary'
                }`}
              >
                <Receipt className="w-3.5 h-3.5" /> Slip Thermal 80mm
              </button>
            </div>

            <button
              onClick={onClose}
              className="p-1.5 text-text-muted hover:text-text-primary rounded-lg hover:bg-card-hover transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Preview Container */}
        <div className="flex-1 overflow-y-auto p-6 bg-app/60 flex justify-center">
          {format === 'a4' ? (
            /* ================= FORMAT A4 RESMI ================= */
            <div className="w-full max-w-2xl bg-white text-slate-900 p-8 rounded-lg shadow-xl font-sans text-xs print:p-0 print:shadow-none print:w-full">
              {/* Kop Surat Toko */}
              <div className="border-b-2 border-slate-900 pb-4 mb-4">
                <div className="flex justify-between items-start">
                  <div>
                    <h1 className="text-xl font-black tracking-tight text-slate-950">OMNIPOS RETAIL & CONSIGNMENT CENTER</h1>
                    <p className="text-[11px] text-slate-600 mt-0.5">Pusat Retail Terpadu, Grosir & Kemitraan Titip Jual</p>
                    <p className="text-[10px] text-slate-500">Jl. Malioboro No. 88, Yogyakarta | Telp: (0274) 556677 | WhatsApp: 0812-3456-7890</p>
                  </div>
                  <div className="text-right">
                    <span className="inline-block px-2.5 py-1 bg-slate-900 text-white font-black text-xs rounded uppercase tracking-wider">
                      VOUCHER SETTLEMENT
                    </span>
                    <p className="font-mono font-bold text-xs mt-1 text-slate-800">{settlement.settlementNumber}</p>
                    <p className="text-[10px] text-slate-500">{formatDate(settlement.settlementDate)}</p>
                  </div>
                </div>
              </div>

              {/* Info Mitra & Periode Rekonsiliasi */}
              <div className="grid grid-cols-2 gap-4 p-3 bg-slate-100 rounded-lg border border-slate-200 mb-5">
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-500 block">Mitra Vendor Penitip</span>
                  <p className="text-sm font-bold text-slate-900">{settlement.vendorName}</p>
                  <p className="text-[11px] text-slate-700 mt-0.5 font-mono">Rekening Tujuan:</p>
                  <p className="text-[11px] font-semibold text-slate-800 font-mono">
                    {settlement.bankDestination || 'Transfer Rekening Vendor'}
                  </p>
                </div>
                <div className="text-right">
                  <span className="text-[10px] uppercase font-bold text-slate-500 block">Periode Penjualan POS</span>
                  <p className="text-xs font-bold text-slate-900">
                    {formatDate(settlement.periodStartDate)} — {formatDate(settlement.periodEndDate)}
                  </p>
                  <span className="text-[10px] uppercase font-bold text-slate-500 block mt-1.5">Status Pembayaran</span>
                  <span className="inline-block px-2 py-0.5 text-[10px] font-bold rounded bg-emerald-100 text-emerald-800 uppercase">
                    {settlement.status === 'Paid' || settlement.status === 2 ? 'LUNAS (PAID)' : 'DISETUJUI (APPROVED)'}
                  </span>
                </div>
              </div>

              {/* Tabel Rincian Barang Terjual */}
              <table className="w-full text-left border border-slate-300 mb-4 text-[11px]">
                <thead>
                  <tr className="bg-slate-200 text-slate-800 font-bold border-b border-slate-300">
                    <th className="p-2 w-6 text-center border-r border-slate-300">#</th>
                    <th className="p-2 border-r border-slate-300">Nama Produk Konsinyasi</th>
                    <th className="p-2 w-16 text-center border-r border-slate-300">Terjual</th>
                    <th className="p-2 w-24 text-right border-r border-slate-300">Harga Jual</th>
                    <th className="p-2 w-24 text-right border-r border-slate-300">Total Omset</th>
                    <th className="p-2 w-20 text-right border-r border-slate-300">Komisi Toko</th>
                    <th className="p-2 w-28 text-right">Hak Vendor</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {settlement.items && settlement.items.map((item, idx) => (
                    <tr key={idx} className="even:bg-slate-50">
                      <td className="p-2 text-center text-slate-500 border-r border-slate-300">{idx + 1}</td>
                      <td className="p-2 border-r border-slate-300">
                        <span className="font-semibold text-slate-900">{item.productName}</span>
                        <span className="block text-[10px] text-slate-500 font-mono">{item.productSku}</span>
                      </td>
                      <td className="p-2 text-center font-bold border-r border-slate-300">{item.soldQuantity}</td>
                      <td className="p-2 text-right font-mono border-r border-slate-300">Rp {item.unitSellPrice.toLocaleString('id-ID')}</td>
                      <td className="p-2 text-right font-mono border-r border-slate-300">Rp {item.totalSalesAmount.toLocaleString('id-ID')}</td>
                      <td className="p-2 text-right font-mono text-slate-700 border-r border-slate-300">Rp {item.storeCommissionAmount.toLocaleString('id-ID')}</td>
                      <td className="p-2 text-right font-mono font-bold text-slate-900">Rp {item.vendorPayableAmount.toLocaleString('id-ID')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Ringkasan Total & Akumulasi Finansial */}
              <div className="flex justify-between items-start mb-6">
                <div className="w-1/2 pr-4 text-[10px] text-slate-500 leading-relaxed">
                  <p><strong>Catatan:</strong> {settlement.notes || 'Pembayaran settlement telah dihitung berdasarkan rekonsiliasi data kasir POS realtime tanpa selisih.'}</p>
                  {settlement.paymentReference && (
                    <p className="mt-1 font-mono text-slate-700">No. Ref Transfer: <strong>{settlement.paymentReference}</strong></p>
                  )}
                </div>
                <div className="w-1/2 bg-slate-100 p-3 rounded-lg border border-slate-200 space-y-1.5 text-right">
                  <div className="flex justify-between text-xs text-slate-600">
                    <span>Total Omset Penjualan POS:</span>
                    <span className="font-mono font-bold text-slate-900">Rp {settlement.totalGrossSales.toLocaleString('id-ID')}</span>
                  </div>
                  <div className="flex justify-between text-xs text-slate-600">
                    <span>Potongan Bagi Hasil / Komisi Toko:</span>
                    <span className="font-mono font-bold text-slate-800">- Rp {settlement.totalStoreCommission.toLocaleString('id-ID')}</span>
                  </div>
                  <div className="flex justify-between text-sm font-black text-slate-900 pt-1.5 border-t border-slate-300">
                    <span>Total Bersih Wajib Bayar Vendor:</span>
                    <span className="font-mono text-emerald-700">Rp {settlement.totalVendorPayable.toLocaleString('id-ID')}</span>
                  </div>
                </div>
              </div>

              {/* Kolom Tanda Tangan */}
              <div className="grid grid-cols-2 gap-8 text-center pt-6 border-t border-slate-300 text-xs">
                <div>
                  <p className="text-slate-500 font-semibold mb-14">Diterima & Disetujui Oleh Mitra Vendor,</p>
                  <p className="font-bold text-slate-900 underline">{settlement.vendorName}</p>
                  <p className="text-[10px] text-slate-500">Tanda Tangan & Cap Usaha</p>
                </div>
                <div>
                  <p className="text-slate-500 font-semibold mb-14">Diproses Oleh Keuangan Toko,</p>
                  <p className="font-bold text-slate-900 underline">{settlement.processedByStaffName || 'Finance Manager'}</p>
                  <p className="text-[10px] text-slate-500">OmniPOS Retail Hub</p>
                </div>
              </div>
            </div>
          ) : (
            /* ================= FORMAT THERMAL 80MM ================= */
            <div className="w-[320px] bg-white text-slate-900 p-4 rounded shadow font-mono text-[11px] leading-tight">
              <div className="text-center pb-2 border-b border-dashed border-slate-400">
                <p className="font-black text-sm">OMNIPOS RETAIL</p>
                <p className="text-[10px] text-slate-600">BUKTI BAYAR KONSINYASI</p>
                <p className="text-[9px] text-slate-500">Telp: 0812-3456-7890</p>
              </div>

              <div className="py-2 border-b border-dashed border-slate-400 text-[10px] space-y-0.5">
                <div className="flex justify-between">
                  <span>No. Settl:</span>
                  <span className="font-bold">{settlement.settlementNumber}</span>
                </div>
                <div className="flex justify-between">
                  <span>Tanggal:</span>
                  <span>{formatDate(settlement.settlementDate)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Vendor:</span>
                  <span className="font-bold">{settlement.vendorName}</span>
                </div>
                <div className="flex justify-between">
                  <span>Periode:</span>
                  <span>{formatDate(settlement.periodStartDate).slice(0, 6)} - {formatDate(settlement.periodEndDate).slice(0, 6)}</span>
                </div>
              </div>

              {/* Items List */}
              <div className="py-2 border-b border-dashed border-slate-400 space-y-1">
                {settlement.items && settlement.items.map((it, idx) => (
                  <div key={idx}>
                    <p className="font-bold text-[10px]">{it.productName}</p>
                    <div className="flex justify-between text-[10px] text-slate-700">
                      <span>{it.soldQuantity} x @{it.unitSellPrice.toLocaleString('id-ID')}</span>
                      <span>Rp {it.totalSalesAmount.toLocaleString('id-ID')}</span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Financial Totals */}
              <div className="py-2 border-b border-dashed border-slate-400 space-y-1 text-[11px]">
                <div className="flex justify-between">
                  <span>Total Omset POS:</span>
                  <span>Rp {settlement.totalGrossSales.toLocaleString('id-ID')}</span>
                </div>
                <div className="flex justify-between">
                  <span>Komisi Toko:</span>
                  <span>-Rp {settlement.totalStoreCommission.toLocaleString('id-ID')}</span>
                </div>
                <div className="flex justify-between font-black text-xs pt-1 border-t border-slate-300">
                  <span>DIBAYAR KE VENDOR:</span>
                  <span>Rp {settlement.totalVendorPayable.toLocaleString('id-ID')}</span>
                </div>
              </div>

              <div className="py-2 text-[10px] space-y-0.5">
                <p>Metode: <strong>{settlement.paymentMethod}</strong></p>
                {settlement.bankDestination && <p className="text-[9px] text-slate-600 truncate">{settlement.bankDestination}</p>}
                {settlement.paymentReference && <p className="text-[9px] text-slate-600">Ref: {settlement.paymentReference}</p>}
                <p>Kasir/Staff: {settlement.processedByStaffName || 'Finance'}</p>
              </div>

              <div className="pt-3 border-t border-dashed border-slate-400 text-center text-[9px] text-slate-500">
                <p>*** BUKTI PENGELUARAN SAH ***</p>
                <p>Terima kasih atas kemitraan Anda</p>
              </div>
            </div>
          )}
        </div>

        {/* Modal Bottom Actions */}
        <div className="flex items-center justify-between px-6 py-3.5 border-t border-border-subtle bg-subtle">
          <span className="text-xs text-text-secondary">
            {format === 'a4' ? 'Dokumen A4 cocok untuk arsip akuntansi dan tanda tangan resmi vendor' : 'Format slip thermal 80mm untuk struk kasir'}
          </span>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-text-secondary hover:text-text-primary hover:bg-card-hover rounded-xl transition"
            >
              Tutup
            </button>
            <button
              type="button"
              onClick={handlePrint}
              className="px-6 py-2 bg-primary hover:bg-primary-hover text-white font-bold text-xs rounded-xl transition flex items-center gap-2 shadow-sm"
            >
              <Printer className="w-4 h-4" />
              Cetak Dokumen Sekarang
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
