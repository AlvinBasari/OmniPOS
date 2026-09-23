import React from 'react';
import { Printer, X } from 'lucide-react';
import { ComprehensivePnL, CashFlowStatement, BalanceSheet } from '../../types';

interface FinancialThermalSummaryModalProps {
  isOpen: boolean;
  onClose: () => void;
  pnlData: ComprehensivePnL | null;
  cashFlowData: CashFlowStatement | null;
  balanceSheetData: BalanceSheet | null;
  dateFrom: string;
  dateTo: string;
}

export const FinancialThermalSummaryModal: React.FC<FinancialThermalSummaryModalProps> = ({
  isOpen,
  onClose,
  pnlData,
  cashFlowData,
  balanceSheetData,
  dateFrom,
  dateTo,
}) => {
  if (!isOpen) return null;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-surface rounded-2xl shadow-2xl border border-border-subtle w-full max-w-lg overflow-hidden flex flex-col my-auto max-h-[90vh]">
        {/* Header */}
        <div className="p-4 bg-subtle border-b border-border-subtle flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
              <Printer className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-text-primary">Struk Ringkasan Finansial Toko (80mm)</h3>
              <p className="text-[11px] text-text-secondary">Pratinjau cetak slip printer kasir thermal</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-text-muted hover:text-text-primary rounded-lg hover:bg-card transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Thermal Receipt Preview */}
        <div className="flex-1 overflow-y-auto p-4 bg-app/50 flex justify-center">
          <div
            id="thermal-financial-print"
            className="w-[320px] bg-white text-black p-4 font-mono text-xs shadow-md border border-gray-200 rounded-sm leading-tight select-text"
            style={{ color: '#000', backgroundColor: '#fff' }}
          >
            {/* Header Toko */}
            <div className="text-center pb-2 border-b border-dashed border-gray-400 space-y-0.5">
              <p className="font-bold text-sm tracking-wide">OMNIPOS RETAIL STORE</p>
              <p className="text-[10px] text-gray-700">RINGKASAN EKSEKUTIF KEUANGAN</p>
              <p className="text-[9px] text-gray-500">Sistem POS & Keuangan Offline-First</p>
            </div>

            {/* Info Periode */}
            <div className="py-2 border-b border-dashed border-gray-400 text-[10px] space-y-0.5">
              <div className="flex justify-between">
                <span>Periode Awal:</span>
                <span className="font-bold">{dateFrom || '-'}</span>
              </div>
              <div className="flex justify-between">
                <span>Periode Akhir:</span>
                <span className="font-bold">{dateTo || '-'}</span>
              </div>
              <div className="flex justify-between">
                <span>Waktu Cetak:</span>
                <span>{new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}</span>
              </div>
            </div>

            {/* 1. LABA RUGI (P&L) */}
            <div className="py-2 border-b border-dashed border-gray-400 space-y-1">
              <p className="font-bold text-[11px] text-center uppercase tracking-wider">[ 1. LAPORAN LABA RUGI ]</p>
              <div className="flex justify-between">
                <span>Penjualan Kotor:</span>
                <span>Rp {(pnlData?.grossSales || 0).toLocaleString('id-ID')}</span>
              </div>
              {(pnlData?.totalDiscounts || 0) > 0 && (
                <div className="flex justify-between text-gray-700">
                  <span>- Total Diskon:</span>
                  <span>-Rp {(pnlData?.totalDiscounts || 0).toLocaleString('id-ID')}</span>
                </div>
              )}
              {(pnlData?.totalReturns || 0) > 0 && (
                <div className="flex justify-between text-gray-700">
                  <span>- Retur Penjualan:</span>
                  <span>-Rp {(pnlData?.totalReturns || 0).toLocaleString('id-ID')}</span>
                </div>
              )}
              <div className="flex justify-between font-bold pt-0.5">
                <span>Penjualan Bersih:</span>
                <span>Rp {(pnlData?.netSales || 0).toLocaleString('id-ID')}</span>
              </div>
              <div className="flex justify-between text-gray-700">
                <span>- HPP (Modal):</span>
                <span>-Rp {(pnlData?.totalCogs || 0).toLocaleString('id-ID')}</span>
              </div>
              <div className="flex justify-between font-bold border-t border-dotted border-gray-300 pt-1">
                <span>LABA KOTOR ({pnlData?.grossMarginPercent || 0}%):</span>
                <span>Rp {(pnlData?.grossProfit || 0).toLocaleString('id-ID')}</span>
              </div>
              <div className="flex justify-between text-gray-700">
                <span>- Beban Operasional:</span>
                <span>-Rp {(pnlData?.operatingExpenses.total || 0).toLocaleString('id-ID')}</span>
              </div>
              <div className="flex justify-between font-bold text-[12px] border-t-2 border-gray-800 pt-1">
                <span>LABA BERSIH:</span>
                <span>Rp {(pnlData?.netOperatingIncome || 0).toLocaleString('id-ID')}</span>
              </div>
              <div className="flex justify-between text-[10px] text-gray-600">
                <span>Net Profit Margin:</span>
                <span className="font-bold">{pnlData?.netMarginPercent || 0}%</span>
              </div>
            </div>

            {/* 2. ARUS KAS (CASH FLOW) */}
            <div className="py-2 border-b border-dashed border-gray-400 space-y-1">
              <p className="font-bold text-[11px] text-center uppercase tracking-wider">[ 2. RINGKASAN ARUS KAS ]</p>
              <div className="flex justify-between">
                <span>Kas Masuk POS (Tunai):</span>
                <span>Rp {(cashFlowData?.operatingActivities.inflows.posCashSales || 0).toLocaleString('id-ID')}</span>
              </div>
              <div className="flex justify-between">
                <span>Kas Masuk Digital (QRIS/Bank):</span>
                <span>Rp {(cashFlowData?.operatingActivities.inflows.posDigitalSales || 0).toLocaleString('id-ID')}</span>
              </div>
              <div className="flex justify-between">
                <span>Pelunasan Piutang:</span>
                <span>Rp {(cashFlowData?.operatingActivities.inflows.receivableCollections || 0).toLocaleString('id-ID')}</span>
              </div>
              <div className="flex justify-between font-bold text-gray-900 border-t border-dotted border-gray-300 pt-0.5">
                <span>Total Kas Masuk:</span>
                <span>Rp {(cashFlowData?.operatingActivities.inflows.total || 0).toLocaleString('id-ID')}</span>
              </div>
              <div className="flex justify-between text-gray-700">
                <span>- Bayar PO & Konsinyasi:</span>
                <span>-Rp {((cashFlowData?.operatingActivities.outflows.supplierPayments || 0) + (cashFlowData?.operatingActivities.outflows.consignmentPayouts || 0)).toLocaleString('id-ID')}</span>
              </div>
              <div className="flex justify-between text-gray-700">
                <span>- Beban Kas & Lainnya:</span>
                <span>-Rp {((cashFlowData?.operatingActivities.outflows.operatingExpenses || 0) + (cashFlowData?.operatingActivities.outflows.tradeInPurchases || 0)).toLocaleString('id-ID')}</span>
              </div>
              <div className="flex justify-between font-bold border-t border-dotted border-gray-300 pt-0.5">
                <span>Total Kas Keluar:</span>
                <span>-Rp {(cashFlowData?.operatingActivities.outflows.total || 0).toLocaleString('id-ID')}</span>
              </div>
              <div className="flex justify-between font-bold border-t border-gray-800 pt-1">
                <span>ARUS KAS BERSIH:</span>
                <span>Rp {(cashFlowData?.netCashChange || 0).toLocaleString('id-ID')}</span>
              </div>
            </div>

            {/* 3. POSISI SALDO KAS & BANK */}
            <div className="py-2 border-b border-dashed border-gray-400 space-y-1">
              <p className="font-bold text-[11px] text-center uppercase tracking-wider">[ 3. SALDO KAS & BANK ]</p>
              <div className="flex justify-between text-[10px]">
                <span>• Kas Laci Kasir:</span>
                <span>Rp {(cashFlowData?.liquidCashPositions.cashInDrawers || 0).toLocaleString('id-ID')}</span>
              </div>
              <div className="flex justify-between text-[10px]">
                <span>• Kas Brankas Toko:</span>
                <span>Rp {(cashFlowData?.liquidCashPositions.cashInStoreSafe || 0).toLocaleString('id-ID')}</span>
              </div>
              <div className="flex justify-between text-[10px]">
                <span>• Rekening Bank / QRIS:</span>
                <span>Rp {(cashFlowData?.liquidCashPositions.bankAndDigitalAccounts || 0).toLocaleString('id-ID')}</span>
              </div>
              <div className="flex justify-between font-bold pt-1 border-t border-dotted border-gray-300">
                <span>TOTAL LIKUIDITAS KAS:</span>
                <span>Rp {(cashFlowData?.liquidCashPositions.totalLiquidCash || 0).toLocaleString('id-ID')}</span>
              </div>
            </div>

            {/* 4. POSISI NERACA SINGKAT */}
            <div className="py-2 border-b border-dashed border-gray-400 space-y-1">
              <p className="font-bold text-[11px] text-center uppercase tracking-wider">[ 4. RINGKASAN NERACA ]</p>
              <div className="flex justify-between">
                <span>Total Aset (Kas+Stok+Piutang):</span>
                <span className="font-bold">Rp {(balanceSheetData?.assets.totalAssets || 0).toLocaleString('id-ID')}</span>
              </div>
              <div className="flex justify-between text-gray-700">
                <span>Total Hutang (Supplier+Konsinyasi):</span>
                <span>Rp {(balanceSheetData?.liabilities.totalLiabilities || 0).toLocaleString('id-ID')}</span>
              </div>
              <div className="flex justify-between font-bold text-gray-900 border-t border-dotted border-gray-300 pt-0.5">
                <span>Ekuitas Bersih Toko:</span>
                <span>Rp {(balanceSheetData?.equity.totalEquity || 0).toLocaleString('id-ID')}</span>
              </div>
            </div>

            {/* Footer */}
            <div className="pt-3 text-center text-[10px] space-y-1 text-gray-600">
              <p className="font-bold">*** PENGESAHAN TOKO ***</p>
              <div className="flex justify-between pt-6 px-2 text-[9px]">
                <div className="text-center">
                  <p>( Supervisor )</p>
                </div>
                <div className="text-center">
                  <p>( Owner / Direktur )</p>
                </div>
              </div>
              <p className="text-[8px] text-gray-400 pt-2">Dicetak otomatis oleh OmniPOS Engine Offline</p>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="p-4 bg-subtle border-t border-border-subtle flex items-center justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-card hover:bg-card-hover border border-border-subtle text-text-secondary rounded-xl text-xs font-bold transition-all"
          >
            Tutup
          </button>
          <button
            onClick={handlePrint}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all"
          >
            <Printer className="w-4 h-4" />
            <span>Cetak Thermal (80mm)</span>
          </button>
        </div>
      </div>
    </div>
  );
};
