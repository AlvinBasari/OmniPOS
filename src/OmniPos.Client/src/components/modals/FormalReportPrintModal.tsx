import React, { useRef } from 'react';
import { 
  Printer, 
  X, 
  FileText, 
  Building2, 
  Calendar, 
  ShieldCheck, 
  DollarSign, 
  Users, 
  Percent, 
  TrendingUp 
} from 'lucide-react';
import { SalesSummary } from '../../types';
import { useAuthStore } from '../../store/useAuthStore';
import { useBusinessModeStore } from '../../store/useBusinessModeStore';
import { printElement } from '../../utils/printHelper';

interface FormalReportPrintModalProps {
  isOpen: boolean;
  onClose: () => void;
  summary: SalesSummary | null;
  pnlData: any | null;
  dateFrom: string;
  dateTo: string;
}

export const FormalReportPrintModal: React.FC<FormalReportPrintModalProps> = ({
  isOpen,
  onClose,
  summary,
  pnlData,
  dateFrom,
  dateTo,
}) => {
  const { storeInfo, currentUser } = useAuthStore();
  const storeName = storeInfo?.storeName || 'OMNIPOS STORE';
  const storeAddress = storeInfo?.storeAddress || '';
  const storePhone = storeInfo?.storePhone || '';
  const { mode } = useBusinessModeStore();
  const printContainerRef = useRef<HTMLDivElement>(null);

  if (!isOpen) return null;

  const handlePrint = () => {
    if (printContainerRef.current) {
      printElement(printContainerRef.current, {
        title: `Laporan Formal PnL - ${storeName}`,
        pageSize: 'A4'
      });
    } else {
      window.print();
    }
  };

  const formattedDateFrom = new Date(dateFrom).toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });
  const formattedDateTo = new Date(dateTo).toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });
  const printTimestamp = new Date().toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm overflow-y-auto">
      {/* Container Dialog */}
      <div className="bg-card border border-border-strong rounded-2xl shadow-2xl w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in duration-150">
        
        {/* Modal Action Header (Hidden when printing) */}
        <div className="p-4 bg-surface border-b border-border-subtle flex items-center justify-between no-print">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center font-bold">
              <FileText className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-text-primary">
                Pratinjau Dokumen Laporan Keuangan Formal (A4)
              </h3>
              <p className="text-[11px] text-text-secondary">
                Format standar cetak atau simpan sebagai file PDF untuk pembukuan & audit
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePrint}
              className="px-4 py-2 bg-primary hover:bg-primary-hover text-primary-text rounded-xl text-xs font-bold flex items-center gap-2 shadow-md transition-all active:scale-95"
            >
              <Printer className="w-4 h-4" />
              <span>Cetak / Simpan PDF (A4)</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-2 hover:bg-subtle text-text-muted hover:text-text-primary rounded-xl transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Printable Body */}
        <div className="flex-1 overflow-y-auto p-6 lg:p-10 bg-white text-zinc-900 printable-document">
          <div ref={printContainerRef} className="max-w-3xl mx-auto space-y-6 text-xs leading-relaxed">
            
            {/* 1. KOP RESMI TOKO */}
            <div className="border-b-2 border-zinc-800 pb-4 flex items-start justify-between">
              <div>
                <h1 className="text-xl font-extrabold tracking-tight uppercase text-zinc-950">
                  {storeName || 'OMNIPOS STORE'}
                </h1>
                <p className="text-zinc-600 text-xs mt-0.5 max-w-md leading-normal">
                  {storeAddress || 'Alamat Toko Belum Dikonfigurasi'}
                </p>
                <p className="text-zinc-600 text-xs font-mono mt-0.5">
                  Telepon / WA: {storePhone || '-'}
                </p>
              </div>

              <div className="text-right space-y-1">
                <span className="px-2.5 py-1 bg-zinc-100 border border-zinc-300 rounded font-bold text-[10px] uppercase tracking-wider text-zinc-800">
                  Edisi: {mode}
                </span>
                <p className="text-[10px] text-zinc-500 font-mono">
                  Dicetak: {printTimestamp}
                </p>
              </div>
            </div>

            {/* 2. JUDUL DOKUMEN */}
            <div className="text-center py-2 space-y-1">
              <h2 className="text-base font-bold uppercase tracking-wider text-zinc-950">
                Laporan Keuangan & Laba Rugi Operasional
              </h2>
              <p className="text-xs text-zinc-600 font-mono font-semibold">
                Periode: {formattedDateFrom} s/d {formattedDateTo}
              </p>
            </div>

            {/* 3. RINGKASAN EKSEKUTIF (EXECUTIVE KPI SUMMARY) */}
            <div className="grid grid-cols-4 gap-3 p-3 bg-zinc-50 border border-zinc-200 rounded-lg text-center">
              <div>
                <span className="text-[10px] text-zinc-500 font-medium block">Total Omzet (Penjualan)</span>
                <span className="font-mono font-bold text-zinc-900 text-sm">
                  Rp {(summary?.totalRevenue || 0).toLocaleString('id-ID')}
                </span>
              </div>
              <div>
                <span className="text-[10px] text-zinc-500 font-medium block">Laba Kotor (Gross Profit)</span>
                <span className="font-mono font-bold text-emerald-700 text-sm">
                  Rp {(summary?.totalGrossProfit || 0).toLocaleString('id-ID')}
                </span>
              </div>
              <div>
                <span className="text-[10px] text-zinc-500 font-medium block">Laba Bersih Usaha</span>
                <span className={`font-mono font-bold text-sm ${pnlData?.netOperatingIncome >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
                  Rp {(pnlData?.netOperatingIncome || 0).toLocaleString('id-ID')}
                </span>
              </div>
              <div>
                <span className="text-[10px] text-zinc-500 font-medium block">Total Struk Transaksi</span>
                <span className="font-mono font-bold text-zinc-900 text-sm">
                  {summary?.totalTransactions || 0} Transaksi
                </span>
              </div>
            </div>

            {/* 4. LAPORAN LABA RUGI OPERASIONAL (INCOME STATEMENT) */}
            <div className="space-y-2">
              <h3 className="font-bold text-xs uppercase tracking-wider text-zinc-900 border-b border-zinc-200 pb-1">
                I. Rincian Laporan Laba Rugi (Income Statement)
              </h3>
              
              <table className="w-full text-left font-mono text-xs">
                <tbody className="divide-y divide-zinc-100">
                  <tr className="font-sans font-bold bg-zinc-50">
                    <td className="p-2" colSpan={2}>1. Pendapatan Penjualan</td>
                    <td className="p-2 text-right">Rp {(pnlData?.netSales || summary?.totalRevenue || 0).toLocaleString('id-ID')}</td>
                  </tr>
                  <tr>
                    <td className="p-1.5 pl-6 text-zinc-600 font-sans" colSpan={2}>• Penjualan Kotor (Gross Sales)</td>
                    <td className="p-1.5 text-right text-zinc-800">Rp {(pnlData?.grossSales || summary?.totalRevenue || 0).toLocaleString('id-ID')}</td>
                  </tr>
                  {(pnlData?.totalDiscounts > 0 || summary?.totalDiscounts > 0) && (
                    <tr>
                      <td className="p-1.5 pl-6 text-zinc-600 font-sans" colSpan={2}>• Potongan Diskon Promosi Penjualan</td>
                      <td className="p-1.5 text-right text-rose-600">-Rp {(pnlData?.totalDiscounts || summary?.totalDiscounts || 0).toLocaleString('id-ID')}</td>
                    </tr>
                  )}
                  {pnlData?.totalReturns > 0 && (
                    <tr>
                      <td className="p-1.5 pl-6 text-zinc-600 font-sans" colSpan={2}>• Retur Penjualan Produk</td>
                      <td className="p-1.5 text-right text-rose-600">-Rp {(pnlData.totalReturns).toLocaleString('id-ID')}</td>
                    </tr>
                  )}

                  <tr className="font-sans font-bold bg-zinc-50">
                    <td className="p-2" colSpan={2}>2. Beban Pokok Pendapatan (HPP / COGS)</td>
                    <td className="p-2 text-right text-rose-600">-Rp {(pnlData?.totalCogs || 0).toLocaleString('id-ID')}</td>
                  </tr>

                  <tr className="font-sans font-bold bg-emerald-50 text-emerald-900 border-y border-emerald-200">
                    <td className="p-2">LABA KOTOR (GROSS PROFIT)</td>
                    <td className="p-2 text-center text-[10px] font-mono">Margin: {pnlData?.grossMarginPercent || 0}%</td>
                    <td className="p-2 text-right">Rp {(pnlData?.grossProfit || summary?.totalGrossProfit || 0).toLocaleString('id-ID')}</td>
                  </tr>

                  <tr className="font-sans font-bold bg-zinc-50">
                    <td className="p-2" colSpan={2}>3. Beban Operasional Kas Toko (Cash Expenses)</td>
                    <td className="p-2 text-right text-rose-600">-Rp {(pnlData?.operatingExpenses?.total || 0).toLocaleString('id-ID')}</td>
                  </tr>
                  {pnlData?.operatingExpenses?.breakdown?.map((b: any, idx: number) => (
                    <tr key={idx}>
                      <td className="p-1.5 pl-6 text-zinc-600 font-sans" colSpan={2}>• {b.category} ({b.count} transaksi)</td>
                      <td className="p-1.5 text-right text-zinc-800">-Rp {b.amount.toLocaleString('id-ID')}</td>
                    </tr>
                  ))}

                  <tr className="font-sans font-extrabold bg-zinc-100 text-zinc-950 text-sm border-t-2 border-zinc-800">
                    <td className="p-2.5">LABA BERSIH OPERASIONAL (NET INCOME)</td>
                    <td className="p-2.5 text-center text-xs font-mono">Net Margin: {pnlData?.netMarginPercent || 0}%</td>
                    <td className={`p-2.5 text-right ${pnlData?.netOperatingIncome >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
                      Rp {(pnlData?.netOperatingIncome || 0).toLocaleString('id-ID')}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* 5. REKAPITULASI PAJAK & PEMBAYARAN */}
            <div className="grid grid-cols-2 gap-4 pt-2">
              {/* Pajak */}
              <div className="space-y-1.5 p-3 border border-zinc-200 rounded-lg">
                <h4 className="font-bold text-[11px] uppercase tracking-wider text-zinc-900 border-b border-zinc-200 pb-1">
                  II. Rekapitulasi Pajak & Layanan
                </h4>
                <div className="space-y-1 font-mono text-[11px]">
                  <div className="flex justify-between text-zinc-600">
                    <span>DPP (Kena Pajak):</span>
                    <span>Rp {(summary?.taxAudit?.taxableSales || 0).toLocaleString('id-ID')}</span>
                  </div>
                  <div className="flex justify-between font-bold text-zinc-900">
                    <span>Total PPN/PB1 Terkumpul:</span>
                    <span>Rp {(summary?.taxAudit?.totalTax || 0).toLocaleString('id-ID')}</span>
                  </div>
                  <div className="flex justify-between text-zinc-600">
                    <span>Service Charge:</span>
                    <span>Rp {(summary?.taxAudit?.totalServiceCharge || 0).toLocaleString('id-ID')}</span>
                  </div>
                  <div className="flex justify-between text-zinc-600">
                    <span>Bebas Pajak:</span>
                    <span>Rp {(summary?.taxAudit?.nonTaxableSales || 0).toLocaleString('id-ID')}</span>
                  </div>
                </div>
              </div>

              {/* Metode Pembayaran */}
              <div className="space-y-1.5 p-3 border border-zinc-200 rounded-lg">
                <h4 className="font-bold text-[11px] uppercase tracking-wider text-zinc-900 border-b border-zinc-200 pb-1">
                  III. Sebaran Pembayaran
                </h4>
                <div className="space-y-1 font-mono text-[11px]">
                  {summary?.paymentBreakdown?.slice(0, 4).map((p, idx) => (
                    <div key={idx} className="flex justify-between text-zinc-700">
                      <span>{p.method} ({p.count}x):</span>
                      <span className="font-bold">Rp {p.amount.toLocaleString('id-ID')}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* 6. KOLOM TANDA TANGAN RESMI (SIGNATURE BLOCKS) */}
            <div className="pt-8 grid grid-cols-2 gap-8 text-center text-xs">
              <div className="space-y-16">
                <div>
                  <p className="font-semibold text-zinc-700">Disiapkan Oleh,</p>
                  <p className="text-[10px] text-zinc-500">Kasir / Bagian Keuangan</p>
                </div>
                <div>
                  <p className="border-t border-zinc-400 font-bold text-zinc-900 pt-1.5 inline-block min-w-[180px]">
                    ( .................................................. )
                  </p>
                </div>
              </div>

              <div className="space-y-16">
                <div>
                  <p className="font-semibold text-zinc-700">Mengetahui & Menyetujui,</p>
                  <p className="text-[10px] text-zinc-500">Pemilik Toko / Manajemen</p>
                </div>
                <div>
                  <p className="border-t border-zinc-400 font-bold text-zinc-900 pt-1.5 inline-block min-w-[180px]">
                    ( .................................................. )
                  </p>
                </div>
              </div>
            </div>

            {/* Footer Notice */}
            <div className="pt-4 border-t border-zinc-200 text-center text-[10px] text-zinc-400">
              Dokumen ini dihasilkan secara otomatis oleh OmniPOS Desktop System dan sah sebagai arsip pembukuan internal usaha.
            </div>

          </div>
        </div>

      </div>

      {/* Global Print Style Injection */}
      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          .printable-document, .printable-document * {
            visibility: visible;
          }
          .printable-document {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            margin: 0;
            padding: 20mm;
            background: white !important;
            color: black !important;
          }
          .no-print {
            display: none !important;
          }
        }
      `}</style>
    </div>
  );
};
