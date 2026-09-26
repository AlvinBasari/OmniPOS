import React from 'react';
import { Printer, X, FileText, CheckCircle2, Download } from 'lucide-react';
import { ComprehensivePnL, CashFlowStatement, BalanceSheet, MarginMatrixData } from '../../types';
import { printElement } from '../../utils/printHelper';

interface FinancialReportPrintModalProps {
  isOpen: boolean;
  onClose: () => void;
  pnlData: ComprehensivePnL | null;
  cashFlowData: CashFlowStatement | null;
  balanceSheetData: BalanceSheet | null;
  marginData: MarginMatrixData | null;
  dateFrom: string;
  dateTo: string;
}

export const FinancialReportPrintModal: React.FC<FinancialReportPrintModalProps> = ({
  isOpen,
  onClose,
  pnlData,
  cashFlowData,
  balanceSheetData,
  marginData,
  dateFrom,
  dateTo,
}) => {
  if (!isOpen) return null;

  const handlePrint = () => {
    printElement('official-financial-report-a4', {
      title: 'Laporan Keuangan Resmi SAK EMKM',
      pageSize: 'A4'
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-surface rounded-2xl shadow-2xl border border-border-subtle w-full max-w-4xl overflow-hidden flex flex-col my-auto max-h-[92vh]">
        {/* Modal Header */}
        <div className="p-4 bg-subtle border-b border-border-subtle flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
              <FileText className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-text-primary">Laporan Keuangan Resmi Format A4 (PDF Ready)</h3>
              <p className="text-[11px] text-text-secondary">Standar Laba Rugi SAK EMKM, Arus Kas & Posisi Neraca</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="px-3.5 py-1.5 bg-primary hover:bg-primary-hover text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Cetak / Simpan PDF</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-text-muted hover:text-text-primary rounded-lg hover:bg-card transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Modal Body - A4 Document Sheet */}
        <div className="flex-1 overflow-y-auto p-6 bg-app/60 flex justify-center">
          <div
            id="a4-financial-report-print"
            className="w-full max-w-[780px] bg-white text-gray-900 p-8 shadow-lg border border-gray-200 rounded-sm font-sans text-xs leading-relaxed select-text print:shadow-none print:border-none"
            style={{ color: '#111827', backgroundColor: '#ffffff' }}
          >
            {/* Kop Laporan Toko */}
            <div className="border-b-2 border-gray-900 pb-4 mb-5 flex items-start justify-between">
              <div>
                <h1 className="text-lg font-black tracking-tight text-gray-950 uppercase">OMNIPOS ENTERPRISE RETAIL</h1>
                <p className="text-[11px] text-gray-600 font-medium">Laporan Keuangan & Kinerja Bisnis Komprehensif</p>
                <p className="text-[10px] text-gray-500">Jl. Bisnis Terpadu No. 88 • CS: 0812-3456-7890 • NPWP: 01.234.567.8-901.000</p>
              </div>
              <div className="text-right">
                <span className="inline-block px-2.5 py-1 rounded bg-gray-100 text-gray-800 font-mono font-bold text-[10px] border border-gray-300">
                  DOKUMEN KEUANGAN SAH
                </span>
                <p className="text-[10px] text-gray-600 mt-1">Periode: <strong className="font-mono">{dateFrom} s/d {dateTo}</strong></p>
                <p className="text-[9px] text-gray-400">Dicetak: {new Date().toLocaleString('id-ID')}</p>
              </div>
            </div>

            {/* SEKSI 1: LAPORAN LABA RUGI (INCOME STATEMENT) */}
            <div className="mb-6">
              <div className="flex items-center justify-between bg-gray-100 px-3 py-1.5 border border-gray-300 rounded font-bold text-gray-900 mb-2">
                <span className="uppercase tracking-wide text-[11px]">1. Laporan Laba Rugi Komprehensif (Income Statement)</span>
                <span className="text-[10px] text-gray-600 font-mono">SAK EMKM</span>
              </div>
              <table className="w-full text-xs border-collapse">
                <tbody>
                  <tr className="border-b border-gray-200">
                    <td className="py-1.5 font-semibold text-gray-900">Penjualan Kotor (Gross Sales)</td>
                    <td className="py-1.5 text-right font-mono">Rp {(pnlData?.grossSales || 0).toLocaleString('id-ID')}</td>
                  </tr>
                  {(pnlData?.totalDiscounts || 0) > 0 && (
                    <tr className="border-b border-gray-100 text-gray-600">
                      <td className="py-1 pl-4">Potongan Penjualan & Diskon Promosi</td>
                      <td className="py-1 text-right font-mono text-red-600">-Rp {(pnlData?.totalDiscounts || 0).toLocaleString('id-ID')}</td>
                    </tr>
                  )}
                  {(pnlData?.totalReturns || 0) > 0 && (
                    <tr className="border-b border-gray-100 text-gray-600">
                      <td className="py-1 pl-4">Retur Penjualan Produk</td>
                      <td className="py-1 text-right font-mono text-red-600">-Rp {(pnlData?.totalReturns || 0).toLocaleString('id-ID')}</td>
                    </tr>
                  )}
                  <tr className="border-b-2 border-gray-300 font-bold bg-gray-50/50">
                    <td className="py-1.5">Penjualan Bersih (Net Revenue)</td>
                    <td className="py-1.5 text-right font-mono text-primary">Rp {(pnlData?.netSales || 0).toLocaleString('id-ID')}</td>
                  </tr>
                  <tr className="border-b border-gray-100 text-gray-600">
                    <td className="py-1 pl-4">Beban Pokok Pendapatan (HPP / COGS)</td>
                    <td className="py-1 text-right font-mono text-red-600">-Rp {(pnlData?.totalCogs || 0).toLocaleString('id-ID')}</td>
                  </tr>
                  <tr className="border-b-2 border-gray-300 font-bold bg-emerald-50 text-emerald-950">
                    <td className="py-1.5">LABA KOTOR USAHA (GROSS PROFIT) — Margin: {pnlData?.grossMarginPercent || 0}%</td>
                    <td className="py-1.5 text-right font-mono text-emerald-700">Rp {(pnlData?.grossProfit || 0).toLocaleString('id-ID')}</td>
                  </tr>

                  {/* Beban Operasional Breakdown */}
                  <tr>
                    <td colSpan={2} className="pt-2 pb-1 font-semibold text-gray-900">Beban Operasional Kas Toko (Operating Expenses):</td>
                  </tr>
                  {pnlData?.operatingExpenses.breakdown.map((b, idx) => (
                    <tr key={idx} className="border-b border-gray-100 text-gray-600">
                      <td className="py-0.5 pl-4">• {b.category} ({b.count} transaksi)</td>
                      <td className="py-0.5 text-right font-mono">-Rp {b.amount.toLocaleString('id-ID')}</td>
                    </tr>
                  ))}
                  <tr className="border-b-2 border-gray-400 font-bold bg-gray-50">
                    <td className="py-1.5">Total Beban Operasional</td>
                    <td className="py-1.5 text-right font-mono text-red-600">-Rp {(pnlData?.operatingExpenses.total || 0).toLocaleString('id-ID')}</td>
                  </tr>

                  {/* Net Income */}
                  <tr className="border-b-2 border-gray-950 font-black bg-emerald-100/70 text-emerald-950 text-[13px]">
                    <td className="py-2.5">LABA BERSIH USAHA (NET OPERATING INCOME) — Net Margin: {pnlData?.netMarginPercent || 0}%</td>
                    <td className="py-2.5 text-right font-mono text-emerald-800">Rp {(pnlData?.netOperatingIncome || 0).toLocaleString('id-ID')}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* SEKSI 2 & 3: ARUS KAS & RINGKASAN NERACA (2 KOLOM) */}
            <div className="grid grid-cols-2 gap-5 mb-6">
              {/* Arus Kas */}
              <div className="border border-gray-300 rounded p-3 bg-gray-50/30">
                <div className="font-bold text-gray-900 border-b border-gray-300 pb-1 mb-2 text-[11px] uppercase">
                  2. Laporan Arus Kas (Cash Flow)
                </div>
                <div className="space-y-1 text-[11px]">
                  <div className="flex justify-between text-gray-700">
                    <span>Kas Masuk Penjualan POS:</span>
                    <span className="font-mono">Rp {(cashFlowData?.operatingActivities.inflows.posCashSales || 0).toLocaleString('id-ID')}</span>
                  </div>
                  <div className="flex justify-between text-gray-700">
                    <span>Kas Masuk Digital/Bank:</span>
                    <span className="font-mono">Rp {(cashFlowData?.operatingActivities.inflows.posDigitalSales || 0).toLocaleString('id-ID')}</span>
                  </div>
                  <div className="flex justify-between text-gray-700">
                    <span>Pelunasan Piutang:</span>
                    <span className="font-mono">Rp {(cashFlowData?.operatingActivities.inflows.receivableCollections || 0).toLocaleString('id-ID')}</span>
                  </div>
                  <div className="flex justify-between font-semibold border-t border-gray-200 pt-1">
                    <span>Total Arus Kas Masuk:</span>
                    <span className="font-mono text-emerald-700">Rp {(cashFlowData?.operatingActivities.inflows.total || 0).toLocaleString('id-ID')}</span>
                  </div>
                  <div className="flex justify-between text-gray-700 pt-1">
                    <span>Pengeluaran PO & Konsinyasi:</span>
                    <span className="font-mono text-red-600">-Rp {((cashFlowData?.operatingActivities.outflows.supplierPayments || 0) + (cashFlowData?.operatingActivities.outflows.consignmentPayouts || 0)).toLocaleString('id-ID')}</span>
                  </div>
                  <div className="flex justify-between text-gray-700">
                    <span>Beban Operasional & Lain:</span>
                    <span className="font-mono text-red-600">-Rp {(cashFlowData?.operatingActivities.outflows.operatingExpenses || 0).toLocaleString('id-ID')}</span>
                  </div>
                  <div className="flex justify-between font-semibold border-t border-gray-200 pt-1">
                    <span>Total Arus Kas Keluar:</span>
                    <span className="font-mono text-red-600">-Rp {(cashFlowData?.operatingActivities.outflows.total || 0).toLocaleString('id-ID')}</span>
                  </div>
                  <div className="flex justify-between font-bold border-t-2 border-gray-400 pt-1 text-gray-950 bg-gray-100 p-1 rounded">
                    <span>Perubahan Kas Bersih:</span>
                    <span className="font-mono">Rp {(cashFlowData?.netCashChange || 0).toLocaleString('id-ID')}</span>
                  </div>
                </div>
              </div>

              {/* Posisi Neraca */}
              <div className="border border-gray-300 rounded p-3 bg-gray-50/30">
                <div className="font-bold text-gray-900 border-b border-gray-300 pb-1 mb-2 text-[11px] uppercase">
                  3. Posisi Keuangan (Balance Sheet)
                </div>
                <div className="space-y-1 text-[11px]">
                  <div className="flex justify-between text-gray-700">
                    <span>Kas & Setara Kas (Bank):</span>
                    <span className="font-mono">Rp {(balanceSheetData?.assets.cashAndBank || 0).toLocaleString('id-ID')}</span>
                  </div>
                  <div className="flex justify-between text-gray-700">
                    <span>Piutang Usaha Pelanggan:</span>
                    <span className="font-mono">Rp {(balanceSheetData?.assets.accountsReceivable || 0).toLocaleString('id-ID')}</span>
                  </div>
                  <div className="flex justify-between text-gray-700">
                    <span>Nilai Persediaan Barang (HPP):</span>
                    <span className="font-mono">Rp {(balanceSheetData?.assets.merchandiseInventory || 0).toLocaleString('id-ID')}</span>
                  </div>
                  <div className="flex justify-between font-semibold border-t border-gray-200 pt-1">
                    <span>Total Aset Lancar:</span>
                    <span className="font-mono text-primary">Rp {(balanceSheetData?.assets.totalAssets || 0).toLocaleString('id-ID')}</span>
                  </div>
                  <div className="flex justify-between text-gray-700 pt-1">
                    <span>Hutang Supplier & Konsinyasi:</span>
                    <span className="font-mono text-red-600">Rp {(balanceSheetData?.liabilities.totalLiabilities || 0).toLocaleString('id-ID')}</span>
                  </div>
                  <div className="flex justify-between font-bold border-t-2 border-gray-400 pt-1 text-gray-950 bg-gray-100 p-1 rounded">
                    <span>Total Ekuitas Bersih Toko:</span>
                    <span className="font-mono">Rp {(balanceSheetData?.equity.totalEquity || 0).toLocaleString('id-ID')}</span>
                  </div>
                  <div className="flex justify-between text-[10px] text-gray-500 pt-1">
                    <span>Rasio Likuiditas (Current Ratio):</span>
                    <span className="font-mono font-bold text-emerald-700">{balanceSheetData?.financialRatios.currentRatio || 0}x</span>
                  </div>
                </div>
              </div>
            </div>

            {/* SEKSI 4: ANALISIS MARGIN KATEGORI PRODUK */}
            {marginData && marginData.categoryProfits.length > 0 && (
              <div className="mb-6">
                <div className="flex items-center justify-between bg-gray-100 px-3 py-1.5 border border-gray-300 rounded font-bold text-gray-900 mb-2">
                  <span className="uppercase tracking-wide text-[11px]">4. Ringkasan Margin Laba per Kategori Produk</span>
                  <span className="text-[10px] text-gray-600">Rata-rata Margin Toko: {marginData.averageStoreMargin}%</span>
                </div>
                <table className="w-full text-left text-xs border border-gray-200">
                  <thead className="bg-gray-100 border-b border-gray-300 font-semibold text-gray-700">
                    <tr>
                      <th className="p-1.5">Kategori</th>
                      <th className="p-1.5 text-right">Omzet Penjualan</th>
                      <th className="p-1.5 text-right">HPP (Modal)</th>
                      <th className="p-1.5 text-right">Laba Kotor</th>
                      <th className="p-1.5 text-center">Margin %</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 font-mono text-[11px]">
                    {marginData.categoryProfits.slice(0, 6).map((c, idx) => (
                      <tr key={idx}>
                        <td className="p-1.5 font-sans font-medium text-gray-900">{c.categoryName}</td>
                        <td className="p-1.5 text-right">Rp {c.revenue.toLocaleString('id-ID')}</td>
                        <td className="p-1.5 text-right text-gray-500">Rp {c.cogs.toLocaleString('id-ID')}</td>
                        <td className="p-1.5 text-right font-bold text-emerald-700">Rp {c.grossProfit.toLocaleString('id-ID')}</td>
                        <td className="p-1.5 text-center font-bold">{c.marginPercentage}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Tanda Tangan & Pengesahan 3 Pihak */}
            <div className="pt-6 border-t border-gray-300 grid grid-cols-3 gap-6 text-center text-xs text-gray-700">
              <div className="space-y-12">
                <p className="font-semibold">Disiapkan Oleh (Kasir/Staff)</p>
                <div className="border-t border-gray-400 mx-4 pt-1">
                  <p className="font-bold text-gray-900">Staff Keuangan</p>
                </div>
              </div>
              <div className="space-y-12">
                <p className="font-semibold">Diperiksa Oleh (Supervisor)</p>
                <div className="border-t border-gray-400 mx-4 pt-1">
                  <p className="font-bold text-gray-900">Supervisor Operasional</p>
                </div>
              </div>
              <div className="space-y-12">
                <p className="font-semibold">Disetujui Oleh (Owner/Direktur)</p>
                <div className="border-t border-gray-400 mx-4 pt-1">
                  <p className="font-bold text-gray-900">Pemilik / Direktur</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
