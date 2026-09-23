import React, { useState, useEffect } from 'react';
import {
  BarChart3,
  TrendingUp,
  DollarSign,
  Calendar,
  Printer,
  FileSpreadsheet,
  Receipt,
  Scale,
  PieChart,
  BookOpen,
  ArrowUpRight,
  ArrowDownRight,
  Flame,
  AlertTriangle,
  HelpCircle,
  Package,
  Layers,
  Building2,
  Wallet,
  Landmark,
  ShieldCheck,
  RefreshCw,
  Clock,
  CheckCircle2,
  Percent,
} from 'lucide-react';
import { useAuthStore } from '../store/useAuthStore';
import { useToastStore } from '../store/useToastStore';
import {
  ComprehensivePnL,
  CashFlowStatement,
  BalanceSheet,
  MarginMatrixData,
  GeneralLedgerData,
} from '../types';
import { FinancialReportPrintModal } from '../components/modals/FinancialReportPrintModal';
import { FinancialThermalSummaryModal } from '../components/modals/FinancialThermalSummaryModal';

type ActiveTab = 'pnl' | 'cashflow' | 'balancesheet' | 'margin' | 'ledger';

export const FinancialReportsPage: React.FC = () => {
  const { currentUser } = useAuthStore();
  const [activeTab, setActiveTab] = useState<ActiveTab>('pnl');

  // Date range filter — default: current month
  const today = new Date();
  const firstOfMonth = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().slice(0, 10);
  const todayStr = today.toISOString().slice(0, 10);
  const [dateFrom, setDateFrom] = useState(firstOfMonth);
  const [dateTo, setDateTo] = useState(todayStr);

  // Data States
  const [pnlData, setPnlData] = useState<ComprehensivePnL | null>(null);
  const [cashFlowData, setCashFlowData] = useState<CashFlowStatement | null>(null);
  const [balanceSheetData, setBalanceSheetData] = useState<BalanceSheet | null>(null);
  const [marginData, setMarginData] = useState<MarginMatrixData | null>(null);
  const [ledgerData, setLedgerData] = useState<GeneralLedgerData | null>(null);

  // Loading States
  const [isLoading, setIsLoading] = useState(false);

  // Modal States
  const [isA4ModalOpen, setIsA4ModalOpen] = useState(false);
  const [isThermalModalOpen, setIsThermalModalOpen] = useState(false);

  // Fetch all financial data
  const fetchAllFinancials = async (from = dateFrom, to = dateTo) => {
    setIsLoading(true);
    try {
      const q = `?from=${from}&to=${to}`;
      const [resPnl, resCf, resBs, resMargin, resGl] = await Promise.all([
        fetch(`/api/v1/reports/pnl-comprehensive${q}`),
        fetch(`/api/v1/reports/cash-flow${q}`),
        fetch(`/api/v1/reports/balance-sheet`),
        fetch(`/api/v1/reports/margin-matrix${q}`),
        fetch(`/api/v1/reports/general-ledger`),
      ]);

      if (resPnl.ok) setPnlData(await resPnl.json());
      if (resCf.ok) setCashFlowData(await resCf.json());
      if (resBs.ok) setBalanceSheetData(await resBs.json());
      if (resMargin.ok) setMarginData(await resMargin.json());
      if (resGl.ok) setLedgerData(await resGl.json());
    } catch (err) {
      console.error('Failed to load financial reports', err);
      useToastStore.getState().showToast('Gagal memuat laporan keuangan', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAllFinancials(dateFrom, dateTo);
  }, []);

  const handleQuickRange = (range: 'today' | 'week' | 'month' | 'quarter' | 'year') => {
    const now = new Date();
    let from = '',
      to = now.toISOString().slice(0, 10);

    if (range === 'today') {
      from = to;
    } else if (range === 'week') {
      const d = new Date(now);
      d.setDate(d.getDate() - 7);
      from = d.toISOString().slice(0, 10);
    } else if (range === 'month') {
      from = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
    } else if (range === 'quarter') {
      const quarterMonth = Math.floor(now.getMonth() / 3) * 3;
      from = new Date(now.getFullYear(), quarterMonth, 1).toISOString().slice(0, 10);
    } else if (range === 'year') {
      from = new Date(now.getFullYear(), 0, 1).toISOString().slice(0, 10);
    }

    setDateFrom(from);
    setDateTo(to);
    fetchAllFinancials(from, to);
  };

  const handleApplyFilter = () => {
    fetchAllFinancials(dateFrom, dateTo);
  };

  const handleExportCsv = () => {
    window.open(`/api/v1/reports/export-financial-csv?from=${dateFrom}&to=${dateTo}`, '_blank');
    useToastStore.getState().showToast('Mengunduh Laporan Keuangan format CSV...', 'info');
  };

  return (
    <div className="flex-1 flex flex-col bg-app overflow-hidden select-none">
      {/* Top Header */}
      <div className="p-4 bg-surface border-b border-border-subtle flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center font-bold shadow-xs">
            <TrendingUp className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-text-primary">Laporan Keuangan & Laba Rugi Komprehensif</h2>
              <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 text-[10px] font-bold">
                100% Offline Engine
              </span>
            </div>
            <p className="text-xs text-text-secondary">
              P&L SAK EMKM, Arus Kas Kasir & Bank, Posisi Neraca, Matriks Margin BCG, dan Buku Besar Terpadu
            </p>
          </div>
        </div>

        {/* Header Action Buttons */}
        <div className="flex items-center gap-2.5">
          <button
            onClick={() => setIsA4ModalOpen(true)}
            className="px-3.5 py-1.5 bg-primary hover:bg-primary-hover text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all"
            title="Cetak Laporan Keuangan Format A4 / PDF"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Cetak A4 / PDF</span>
          </button>

          <button
            onClick={() => setIsThermalModalOpen(true)}
            className="px-3 py-1.5 bg-card hover:bg-card-hover border border-border-subtle rounded-lg text-xs font-semibold text-text-primary flex items-center gap-1.5 transition-all"
            title="Cetak Slip Ringkasan Kasir Thermal 80mm"
          >
            <Receipt className="w-3.5 h-3.5 text-emerald-600" />
            <span>Slip Thermal 80mm</span>
          </button>

          <button
            onClick={handleExportCsv}
            className="px-3 py-1.5 bg-card hover:bg-card-hover border border-border-subtle rounded-lg text-xs font-semibold text-text-secondary flex items-center gap-1.5 transition-all"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
            <span>Ekspor CSV</span>
          </button>
        </div>
      </div>

      {/* Navigation Tabs Bar & Date Range Filter */}
      <div className="px-4 py-2.5 bg-surface border-b border-border-subtle flex items-center justify-between flex-wrap gap-3">
        {/* 5 Tab Switcher */}
        <div className="flex p-1 bg-subtle rounded-xl border border-border-subtle text-xs font-bold gap-1">
          <button
            onClick={() => setActiveTab('pnl')}
            className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${
              activeTab === 'pnl'
                ? 'bg-card text-text-primary shadow-xs'
                : 'text-text-secondary hover:text-text-primary'
            }`}
          >
            <TrendingUp className="w-3.5 h-3.5 text-emerald-600" />
            <span>Laba Rugi (P&L)</span>
          </button>

          <button
            onClick={() => setActiveTab('cashflow')}
            className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${
              activeTab === 'cashflow'
                ? 'bg-card text-text-primary shadow-xs'
                : 'text-text-secondary hover:text-text-primary'
            }`}
          >
            <Wallet className="w-3.5 h-3.5 text-primary" />
            <span>Arus Kas (Cash Flow)</span>
          </button>

          <button
            onClick={() => setActiveTab('balancesheet')}
            className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${
              activeTab === 'balancesheet'
                ? 'bg-card text-text-primary shadow-xs'
                : 'text-text-secondary hover:text-text-primary'
            }`}
          >
            <Scale className="w-3.5 h-3.5 text-indigo-600" />
            <span>Neraca Keuangan</span>
          </button>

          <button
            onClick={() => setActiveTab('margin')}
            className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${
              activeTab === 'margin'
                ? 'bg-card text-text-primary shadow-xs'
                : 'text-text-secondary hover:text-text-primary'
            }`}
          >
            <PieChart className="w-3.5 h-3.5 text-amber-500" />
            <span>Matriks Margin (BCG)</span>
          </button>

          <button
            onClick={() => setActiveTab('ledger')}
            className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${
              activeTab === 'ledger'
                ? 'bg-card text-text-primary shadow-xs'
                : 'text-text-secondary hover:text-text-primary'
            }`}
          >
            <BookOpen className="w-3.5 h-3.5 text-cyan-600" />
            <span>Buku Besar (COA)</span>
          </button>
        </div>

        {/* Date Filter */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-1 bg-subtle p-1 rounded-lg border border-border-subtle text-xs">
            <button
              onClick={() => handleQuickRange('today')}
              className="px-2 py-0.5 rounded hover:bg-card text-text-secondary hover:text-text-primary font-medium"
            >
              Hari Ini
            </button>
            <button
              onClick={() => handleQuickRange('week')}
              className="px-2 py-0.5 rounded hover:bg-card text-text-secondary hover:text-text-primary font-medium"
            >
              7 Hari
            </button>
            <button
              onClick={() => handleQuickRange('month')}
              className="px-2 py-0.5 rounded hover:bg-card text-text-secondary hover:text-text-primary font-medium"
            >
              Bulan Ini
            </button>
            <button
              onClick={() => handleQuickRange('quarter')}
              className="px-2 py-0.5 rounded hover:bg-card text-text-secondary hover:text-text-primary font-medium"
            >
              Kuartal
            </button>
            <button
              onClick={() => handleQuickRange('year')}
              className="px-2 py-0.5 rounded hover:bg-card text-text-secondary hover:text-text-primary font-medium"
            >
              Tahun Ini
            </button>
          </div>

          <div className="flex items-center gap-1.5">
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="px-2 py-1 bg-card border border-border-subtle rounded-lg text-xs font-mono text-text-primary focus:outline-none focus:border-primary"
            />
            <span className="text-xs text-text-muted">s/d</span>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="px-2 py-1 bg-card border border-border-subtle rounded-lg text-xs font-mono text-text-primary focus:outline-none focus:border-primary"
            />
            <button
              onClick={handleApplyFilter}
              className="px-3 py-1 bg-primary hover:bg-primary-hover text-white rounded-lg text-xs font-bold shadow-xs transition-all flex items-center gap-1"
            >
              <RefreshCw className={`w-3 h-3 ${isLoading ? 'animate-spin' : ''}`} />
              <span>Terapkan</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto p-5 space-y-5">
        {/* ========================================================================= */}
        {/* TAB 1: LABA RUGI KOMPREHENSIF (INCOME STATEMENT / P&L) */}
        {/* ========================================================================= */}
        {activeTab === 'pnl' && (
          <div className="space-y-5">
            {/* 4 KPI Highlight Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="p-4 rounded-2xl bg-card border border-border-subtle shadow-sm space-y-1">
                <div className="flex items-center justify-between text-xs text-text-secondary font-medium">
                  <span>Penjualan Bersih (Net Sales):</span>
                  {pnlData?.growthComparison && (
                    <span
                      className={`inline-flex items-center text-[10px] font-bold px-1.5 py-0.5 rounded ${
                        pnlData.growthComparison.revenueGrowthPercent >= 0
                          ? 'bg-emerald-500/10 text-emerald-600'
                          : 'bg-rose-500/10 text-rose-600'
                      }`}
                    >
                      {pnlData.growthComparison.revenueGrowthPercent >= 0 ? '+' : ''}
                      {pnlData.growthComparison.revenueGrowthPercent}% MoM
                    </span>
                  )}
                </div>
                <p className="text-2xl font-bold font-mono text-primary tabular-nums">
                  Rp {(pnlData?.netSales || 0).toLocaleString('id-ID')}
                </p>
                <p className="text-[10px] text-text-muted font-mono">
                  Kotor: Rp {(pnlData?.grossSales || 0).toLocaleString('id-ID')}
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-card border border-border-subtle shadow-sm space-y-1">
                <div className="flex items-center justify-between text-xs text-text-secondary font-medium">
                  <span>Laba Kotor (Gross Profit):</span>
                  <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-600 font-bold text-[10px]">
                    Margin {pnlData?.grossMarginPercent || 0}%
                  </span>
                </div>
                <p className="text-2xl font-bold font-mono text-emerald-600 tabular-nums">
                  Rp {(pnlData?.grossProfit || 0).toLocaleString('id-ID')}
                </p>
                <p className="text-[10px] text-text-muted font-mono">
                  HPP: -Rp {(pnlData?.totalCogs || 0).toLocaleString('id-ID')}
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-card border border-border-subtle shadow-sm space-y-1">
                <div className="flex items-center justify-between text-xs text-text-secondary font-medium">
                  <span>Beban Operasional Kas:</span>
                  <span className="text-[10px] text-rose-500 font-bold">
                    {pnlData?.operatingExpenses.breakdown.length || 0} Kategori
                  </span>
                </div>
                <p className="text-2xl font-bold font-mono text-rose-600 tabular-nums">
                  -Rp {(pnlData?.operatingExpenses.total || 0).toLocaleString('id-ID')}
                </p>
                <p className="text-[10px] text-text-muted">
                  Kas Kecil & Pengeluaran Toko
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-emerald-500/5 border border-emerald-500/20 shadow-sm space-y-1">
                <div className="flex items-center justify-between text-xs text-emerald-700 font-bold">
                  <span>Laba Bersih Usaha (Net Profit):</span>
                  <span className="px-2 py-0.5 rounded bg-emerald-600 text-white font-bold text-[10px]">
                    Net {pnlData?.netMarginPercent || 0}%
                  </span>
                </div>
                <p
                  className={`text-2xl font-black font-mono tabular-nums ${
                    (pnlData?.netOperatingIncome || 0) >= 0 ? 'text-emerald-600' : 'text-rose-600'
                  }`}
                >
                  Rp {(pnlData?.netOperatingIncome || 0).toLocaleString('id-ID')}
                </p>
                <p className="text-[10px] text-text-muted">
                  Setelah HPP & Seluruh Beban Operasional
                </p>
              </div>
            </div>

            {/* Waterfall Flow Breakdown Bar */}
            {pnlData?.waterfall && (
              <div className="bg-card border border-border-subtle rounded-2xl p-4 shadow-sm space-y-3">
                <h3 className="text-xs font-bold text-text-primary uppercase tracking-wider flex items-center gap-1.5">
                  <Layers className="w-4 h-4 text-primary" />
                  Alur Finansial Waterfall (Dari Omzet ke Laba Bersih)
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-2">
                  {pnlData.waterfall.map((w, idx) => (
                    <div
                      key={idx}
                      className={`p-2.5 rounded-xl border flex flex-col justify-between ${
                        w.type === 'total'
                          ? 'bg-emerald-500/10 border-emerald-500/30'
                          : w.type === 'subtotal'
                          ? 'bg-primary/10 border-primary/20'
                          : w.type === 'decrease'
                          ? 'bg-rose-500/5 border-rose-500/20'
                          : 'bg-subtle border-border-subtle'
                      }`}
                    >
                      <span className="text-[10px] font-semibold text-text-secondary leading-tight truncate">
                        {w.name}
                      </span>
                      <span
                        className={`text-xs font-bold font-mono mt-2 tabular-nums ${
                          w.amount < 0
                            ? 'text-rose-600'
                            : w.type === 'total'
                            ? 'text-emerald-600'
                            : 'text-text-primary'
                        }`}
                      >
                        {w.amount < 0 ? '-' : ''}Rp {Math.abs(w.amount).toLocaleString('id-ID')}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Structured SAK EMKM Income Statement Table */}
            <div className="bg-card border border-border-subtle rounded-2xl overflow-hidden shadow-sm">
              <div className="p-4 bg-subtle border-b border-border-subtle flex items-center justify-between">
                <div>
                  <h3 className="text-xs font-bold text-text-primary uppercase tracking-wider">
                    Laporan Laba Rugi Operasional Terstruktur (Income Statement SAK EMKM)
                  </h3>
                  <p className="text-[11px] text-text-secondary font-mono">
                    Periode: {dateFrom} s/d {dateTo} • Terintegrasi Otomatis dari POS & Gudang
                  </p>
                </div>
                <span className="px-2.5 py-1 rounded-full bg-primary/10 text-primary border border-primary/20 text-[10px] font-bold">
                  Standar Akuntansi Indonesia
                </span>
              </div>

              <div className="p-5 divide-y divide-border-subtle space-y-4 text-xs">
                {/* 1. Pendapatan Penjualan */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between font-bold text-text-primary uppercase text-[11px]">
                    <span>1. Pendapatan Penjualan Bersih (Net Revenue)</span>
                    <span className="font-mono text-primary">Rp {(pnlData?.netSales || 0).toLocaleString('id-ID')}</span>
                  </div>
                  <div className="pl-4 space-y-1.5 text-text-secondary">
                    <div className="flex justify-between">
                      <span>• Penjualan Kotor Toko (Gross Sales)</span>
                      <span className="font-mono">Rp {(pnlData?.grossSales || 0).toLocaleString('id-ID')}</span>
                    </div>
                    {(pnlData?.totalDiscounts || 0) > 0 && (
                      <div className="flex justify-between text-rose-600">
                        <span>• Potongan Harga & Diskon Promosi</span>
                        <span className="font-mono">-Rp {(pnlData?.totalDiscounts || 0).toLocaleString('id-ID')}</span>
                      </div>
                    )}
                    {(pnlData?.totalReturns || 0) > 0 && (
                      <div className="flex justify-between text-rose-600">
                        <span>• Retur Penjualan Pelanggan</span>
                        <span className="font-mono">-Rp {(pnlData?.totalReturns || 0).toLocaleString('id-ID')}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* 2. HPP & Laba Kotor */}
                <div className="pt-3 space-y-2">
                  <div className="flex items-center justify-between font-bold text-text-primary uppercase text-[11px]">
                    <span>2. Beban Pokok Pendapatan (HPP / Cost of Goods Sold)</span>
                    <span className="font-mono text-rose-600">-Rp {(pnlData?.totalCogs || 0).toLocaleString('id-ID')}</span>
                  </div>
                  <div className="pl-4 text-text-secondary flex justify-between">
                    <span>• Total HPP Barang Dagang Terjual</span>
                    <span className="font-mono">-Rp {(pnlData?.totalCogs || 0).toLocaleString('id-ID')}</span>
                  </div>
                  <div className="p-3 bg-emerald-500/5 rounded-xl flex items-center justify-between font-bold text-text-primary border border-emerald-500/20">
                    <span className="text-emerald-700">LABA KOTOR (GROSS PROFIT) [{pnlData?.grossMarginPercent || 0}%]</span>
                    <span className="font-mono text-emerald-600 text-sm">Rp {(pnlData?.grossProfit || 0).toLocaleString('id-ID')}</span>
                  </div>
                </div>

                {/* 3. Beban Operasional Kas */}
                <div className="pt-3 space-y-2">
                  <div className="flex items-center justify-between font-bold text-text-primary uppercase text-[11px]">
                    <span>3. Beban Operasional Toko (Operating Expenses)</span>
                    <span className="font-mono text-rose-600">-Rp {(pnlData?.operatingExpenses.total || 0).toLocaleString('id-ID')}</span>
                  </div>
                  {pnlData?.operatingExpenses.breakdown && pnlData.operatingExpenses.breakdown.length > 0 ? (
                    <div className="pl-4 space-y-1.5 text-text-secondary">
                      {pnlData.operatingExpenses.breakdown.map((b, idx) => (
                        <div key={idx} className="flex justify-between">
                          <span>• {b.category} ({b.count} pengeluaran)</span>
                          <span className="font-mono">-Rp {b.amount.toLocaleString('id-ID')}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="pl-4 text-text-muted text-[11px]">Belum ada pengeluaran kas tercatat pada periode ini.</p>
                  )}
                </div>

                {/* 4. Laba Bersih Final */}
                <div className="pt-4">
                  <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl flex items-center justify-between">
                    <div>
                      <div className="text-sm font-extrabold text-emerald-900 dark:text-emerald-200">
                        LABA BERSIH USAHA (NET OPERATING INCOME)
                      </div>
                      <div className="text-[11px] text-text-secondary">
                        Rasio Margin Bersih: <strong className="text-emerald-600 font-mono font-bold">{pnlData?.netMarginPercent || 0}%</strong>
                      </div>
                    </div>
                    <div
                      className={`text-2xl font-black font-mono tabular-nums ${
                        (pnlData?.netOperatingIncome || 0) >= 0 ? 'text-emerald-600' : 'text-rose-600'
                      }`}
                    >
                      Rp {(pnlData?.netOperatingIncome || 0).toLocaleString('id-ID')}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 2: LAPORAN ARUS KAS (CASH FLOW STATEMENT) */}
        {/* ========================================================================= */}
        {activeTab === 'cashflow' && (
          <div className="space-y-5">
            {/* 3 KPI Cash Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 rounded-2xl bg-card border border-border-subtle shadow-sm space-y-1">
                <span className="text-xs font-semibold text-text-secondary">Total Arus Kas Masuk:</span>
                <p className="text-2xl font-bold font-mono text-emerald-600 tabular-nums">
                  Rp {(cashFlowData?.operatingActivities.inflows.total || 0).toLocaleString('id-ID')}
                </p>
                <p className="text-[10px] text-text-muted">POS Kasir, Digital, dan Piutang</p>
              </div>

              <div className="p-4 rounded-2xl bg-card border border-border-subtle shadow-sm space-y-1">
                <span className="text-xs font-semibold text-text-secondary">Total Arus Kas Keluar:</span>
                <p className="text-2xl font-bold font-mono text-rose-600 tabular-nums">
                  -Rp {(cashFlowData?.operatingActivities.outflows.total || 0).toLocaleString('id-ID')}
                </p>
                <p className="text-[10px] text-text-muted">PO Supplier, Konsinyasi, Trade-In & Beban</p>
              </div>

              <div className="p-4 rounded-2xl bg-card border border-primary/30 bg-primary/5 shadow-sm space-y-1">
                <span className="text-xs font-semibold text-text-secondary">Perubahan Bersih Kas:</span>
                <p
                  className={`text-2xl font-bold font-mono tabular-nums ${
                    (cashFlowData?.netCashChange || 0) >= 0 ? 'text-emerald-600' : 'text-rose-600'
                  }`}
                >
                  Rp {(cashFlowData?.netCashChange || 0).toLocaleString('id-ID')}
                </p>
                <p className="text-[10px] text-text-muted">Net Cash Flow Periode Ini</p>
              </div>
            </div>

            {/* Posisi Likuiditas Saldo Kas & Bank Toko */}
            <div className="bg-card border border-border-subtle rounded-2xl p-5 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xs font-bold text-text-primary uppercase tracking-wider flex items-center gap-1.5">
                    <Landmark className="w-4 h-4 text-emerald-600" />
                    Posisi Saldo Kas & Rekening Bank Aktual
                  </h3>
                  <p className="text-[11px] text-text-secondary">Distribusi aset likuid siap pakai di toko</p>
                </div>
                <span className="px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-600 font-bold font-mono text-xs border border-emerald-500/20">
                  Total Likuid: Rp {(cashFlowData?.liquidCashPositions.totalLiquidCash || 0).toLocaleString('id-ID')}
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-4 rounded-xl bg-subtle border border-border-subtle flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-emerald-500/10 text-emerald-600 flex items-center justify-center font-bold">
                    <Wallet className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-[11px] text-text-secondary font-medium">Kas di Laci Kasir:</span>
                    <p className="text-base font-bold font-mono text-text-primary">
                      Rp {(cashFlowData?.liquidCashPositions.cashInDrawers || 0).toLocaleString('id-ID')}
                    </p>
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-subtle border border-border-subtle flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-indigo-500/10 text-indigo-600 flex items-center justify-center font-bold">
                    <Building2 className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-[11px] text-text-secondary font-medium">Kas di Brankas Toko:</span>
                    <p className="text-base font-bold font-mono text-text-primary">
                      Rp {(cashFlowData?.liquidCashPositions.cashInStoreSafe || 0).toLocaleString('id-ID')}
                    </p>
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-subtle border border-border-subtle flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-cyan-500/10 text-cyan-600 flex items-center justify-center font-bold">
                    <Landmark className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-[11px] text-text-secondary font-medium">Rekening Bank & QRIS:</span>
                    <p className="text-base font-bold font-mono text-text-primary">
                      Rp {(cashFlowData?.liquidCashPositions.bankAndDigitalAccounts || 0).toLocaleString('id-ID')}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Arus Kas Detail Table */}
            <div className="bg-card border border-border-subtle rounded-2xl overflow-hidden shadow-sm">
              <div className="p-4 bg-subtle border-b border-border-subtle">
                <h3 className="text-xs font-bold text-text-primary uppercase tracking-wider">
                  Rincian Aktivitas Arus Kas Masuk vs Keluar
                </h3>
              </div>
              <div className="p-5 space-y-4 text-xs divide-y divide-border-subtle">
                {/* Penerimaan */}
                <div className="space-y-2">
                  <div className="flex justify-between font-bold text-text-primary uppercase text-[11px]">
                    <span>A. Arus Kas Masuk Operasional</span>
                    <span className="font-mono text-emerald-600">Rp {(cashFlowData?.operatingActivities.inflows.total || 0).toLocaleString('id-ID')}</span>
                  </div>
                  <div className="pl-4 space-y-1 text-text-secondary">
                    <div className="flex justify-between">
                      <span>• Penerimaan Kasir POS Tunai</span>
                      <span className="font-mono">Rp {(cashFlowData?.operatingActivities.inflows.posCashSales || 0).toLocaleString('id-ID')}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>• Penerimaan Digital (QRIS, Transfer, EDC)</span>
                      <span className="font-mono">Rp {(cashFlowData?.operatingActivities.inflows.posDigitalSales || 0).toLocaleString('id-ID')}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>• Penerimaan Pelunasan Piutang Kasbon Pelanggan</span>
                      <span className="font-mono">Rp {(cashFlowData?.operatingActivities.inflows.receivableCollections || 0).toLocaleString('id-ID')}</span>
                    </div>
                  </div>
                </div>

                {/* Pengeluaran */}
                <div className="pt-3 space-y-2">
                  <div className="flex justify-between font-bold text-text-primary uppercase text-[11px]">
                    <span>B. Arus Kas Keluar Operasional</span>
                    <span className="font-mono text-rose-600">-Rp {(cashFlowData?.operatingActivities.outflows.total || 0).toLocaleString('id-ID')}</span>
                  </div>
                  <div className="pl-4 space-y-1 text-text-secondary">
                    <div className="flex justify-between">
                      <span>• Pembayaran Faktur Pembelian Supplier (PO)</span>
                      <span className="font-mono text-rose-600">-Rp {(cashFlowData?.operatingActivities.outflows.supplierPayments || 0).toLocaleString('id-ID')}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>• Pembayaran Bagi Hasil Vendor Konsinyasi</span>
                      <span className="font-mono text-rose-600">-Rp {(cashFlowData?.operatingActivities.outflows.consignmentPayouts || 0).toLocaleString('id-ID')}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>• Modal Pembelian Unit Bekas Tukar Tambah (Trade-In)</span>
                      <span className="font-mono text-rose-600">-Rp {(cashFlowData?.operatingActivities.outflows.tradeInPurchases || 0).toLocaleString('id-ID')}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>• Beban Operasional Kas Toko (Expenses)</span>
                      <span className="font-mono text-rose-600">-Rp {(cashFlowData?.operatingActivities.outflows.operatingExpenses || 0).toLocaleString('id-ID')}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>• Pengembalian Dana Retur Penjualan</span>
                      <span className="font-mono text-rose-600">-Rp {(cashFlowData?.operatingActivities.outflows.salesRefunds || 0).toLocaleString('id-ID')}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 3: NERACA KEUANGAN (BALANCE SHEET) */}
        {/* ========================================================================= */}
        {activeTab === 'balancesheet' && (
          <div className="space-y-5">
            {/* Financial Health Ratios Banner */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 rounded-2xl bg-card border border-border-subtle shadow-sm space-y-1">
                <span className="text-xs font-semibold text-text-secondary">Current Ratio (Likuiditas Lancar):</span>
                <p className="text-2xl font-bold font-mono text-emerald-600 tabular-nums">
                  {balanceSheetData?.financialRatios.currentRatio || 0}x
                </p>
                <p className="text-[10px] text-text-muted">Aset Lancar / Total Liabilitas (Ideal &gt; 1.5x)</p>
              </div>

              <div className="p-4 rounded-2xl bg-card border border-border-subtle shadow-sm space-y-1">
                <span className="text-xs font-semibold text-text-secondary">Quick Ratio (Rasio Cepat):</span>
                <p className="text-2xl font-bold font-mono text-indigo-600 tabular-nums">
                  {balanceSheetData?.financialRatios.quickRatio || 0}x
                </p>
                <p className="text-[10px] text-text-muted">(Kas + Piutang) / Total Liabilitas</p>
              </div>

              <div className="p-4 rounded-2xl bg-card border border-border-subtle shadow-sm space-y-1">
                <span className="text-xs font-semibold text-text-secondary">Debt-to-Equity Ratio:</span>
                <p className="text-2xl font-bold font-mono text-text-primary tabular-nums">
                  {balanceSheetData?.financialRatios.debtToEquityPercent || 0}%
                </p>
                <p className="text-[10px] text-text-muted">Proporsi Hutang terhadap Ekuitas</p>
              </div>
            </div>

            {/* 2 Column: Aset vs Liabilitas & Ekuitas */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              {/* Kolom Kiri: Aset Lancar */}
              <div className="bg-card border border-border-subtle rounded-2xl overflow-hidden shadow-sm flex flex-col">
                <div className="p-4 bg-primary/5 border-b border-border-subtle flex items-center justify-between">
                  <h3 className="text-xs font-bold text-text-primary uppercase tracking-wider flex items-center gap-1.5">
                    <Wallet className="w-4 h-4 text-primary" />
                    ASET LANCAR (CURRENT ASSETS)
                  </h3>
                  <span className="font-mono font-bold text-xs text-primary">
                    Rp {(balanceSheetData?.assets.totalAssets || 0).toLocaleString('id-ID')}
                  </span>
                </div>
                <div className="p-5 space-y-3 text-xs divide-y divide-border-subtle">
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="font-semibold text-text-primary">Kas & Setara Kas (Bank)</p>
                      <p className="text-[10px] text-text-muted">Saldo kasir, brankas, dan rekening usaha</p>
                    </div>
                    <span className="font-mono font-bold">
                      Rp {(balanceSheetData?.assets.cashAndBank || 0).toLocaleString('id-ID')}
                    </span>
                  </div>

                  <div className="flex justify-between items-center pt-2">
                    <div>
                      <p className="font-semibold text-text-primary">Piutang Usaha Pelanggan (Kasbon)</p>
                      <p className="text-[10px] text-text-muted">Tagihan invoice tempo pelanggan belum lunas</p>
                    </div>
                    <span className="font-mono font-bold">
                      Rp {(balanceSheetData?.assets.accountsReceivable || 0).toLocaleString('id-ID')}
                    </span>
                  </div>

                  <div className="flex justify-between items-center pt-2">
                    <div>
                      <p className="font-semibold text-text-primary">Persediaan Barang Dagang Milik Toko</p>
                      <p className="text-[10px] text-text-muted">Valuasi stok fisik berdasarkan HPP</p>
                    </div>
                    <span className="font-mono font-bold text-emerald-600">
                      Rp {(balanceSheetData?.assets.merchandiseInventory || 0).toLocaleString('id-ID')}
                    </span>
                  </div>

                  <div className="flex justify-between items-center pt-2">
                    <div>
                      <p className="font-semibold text-text-primary">Persediaan Barang Titipan Konsinyasi</p>
                      <p className="text-[10px] text-text-muted">Nilai barang titipan vendor di toko</p>
                    </div>
                    <span className="font-mono font-bold text-indigo-600">
                      Rp {(balanceSheetData?.assets.consignmentInventory || 0).toLocaleString('id-ID')}
                    </span>
                  </div>
                </div>
              </div>

              {/* Kolom Kanan: Liabilitas & Ekuitas */}
              <div className="bg-card border border-border-subtle rounded-2xl overflow-hidden shadow-sm flex flex-col">
                <div className="p-4 bg-subtle border-b border-border-subtle flex items-center justify-between">
                  <h3 className="text-xs font-bold text-text-primary uppercase tracking-wider flex items-center gap-1.5">
                    <Scale className="w-4 h-4 text-indigo-600" />
                    LIABILITAS & EKUITAS
                  </h3>
                  <span className="font-mono font-bold text-xs text-text-primary">
                    Rp {(balanceSheetData?.assets.totalAssets || 0).toLocaleString('id-ID')}
                  </span>
                </div>
                <div className="p-5 space-y-3 text-xs divide-y divide-border-subtle">
                  {/* Liabilitas */}
                  <div className="space-y-2">
                    <p className="font-bold text-text-primary uppercase text-[11px] text-rose-600">
                      Kewajiban / Hutang Toko (Liabilities):
                    </p>
                    <div className="flex justify-between items-center pl-3">
                      <div>
                        <p className="font-semibold text-text-primary">Hutang Pembelian Supplier (PO)</p>
                        <p className="text-[10px] text-text-muted">Faktur supplier belum dibayar</p>
                      </div>
                      <span className="font-mono font-bold text-rose-600">
                        Rp {(balanceSheetData?.liabilities.supplierPayable || 0).toLocaleString('id-ID')}
                      </span>
                    </div>

                    <div className="flex justify-between items-center pl-3">
                      <div>
                        <p className="font-semibold text-text-primary">Hutang Bagi Hasil Konsinyasi</p>
                        <p className="text-[10px] text-text-muted">Settlement vendor disetujui belum cair</p>
                      </div>
                      <span className="font-mono font-bold text-rose-600">
                        Rp {(balanceSheetData?.liabilities.consignmentPayable || 0).toLocaleString('id-ID')}
                      </span>
                    </div>

                    <div className="flex justify-between items-center pl-3">
                      <div>
                        <p className="font-semibold text-text-primary">Titipan Saldo Deposit Pelanggan</p>
                        <p className="text-[10px] text-text-muted">Saldo dompet deposit belanja member</p>
                      </div>
                      <span className="font-mono font-bold text-rose-600">
                        Rp {(balanceSheetData?.liabilities.customerDeposits || 0).toLocaleString('id-ID')}
                      </span>
                    </div>
                  </div>

                  {/* Ekuitas */}
                  <div className="pt-3 space-y-2">
                    <p className="font-bold text-text-primary uppercase text-[11px] text-emerald-600">
                      Ekuitas Modal Pemilik (Equity):
                    </p>
                    <div className="flex justify-between items-center pl-3">
                      <div>
                        <p className="font-semibold text-text-primary">Modal Disetor Awal</p>
                        <p className="text-[10px] text-text-muted">Investasi modal pokok awal toko</p>
                      </div>
                      <span className="font-mono font-bold">
                        Rp {(balanceSheetData?.equity.initialOwnerCapital || 0).toLocaleString('id-ID')}
                      </span>
                    </div>

                    <div className="flex justify-between items-center pl-3">
                      <div>
                        <p className="font-semibold text-text-primary">Laba Ditahan / Akumulasi Berjalan</p>
                        <p className="text-[10px] text-text-muted">Pertumbuhan laba kumulatif usaha</p>
                      </div>
                      <span className="font-mono font-bold text-emerald-600">
                        Rp {(balanceSheetData?.equity.retainedEarnings || 0).toLocaleString('id-ID')}
                      </span>
                    </div>

                    <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl flex justify-between items-center font-bold">
                      <span className="text-emerald-800 dark:text-emerald-300">TOTAL EKUITAS BERSIH</span>
                      <span className="font-mono text-emerald-600 text-sm">
                        Rp {(balanceSheetData?.equity.totalEquity || 0).toLocaleString('id-ID')}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 4: MATRIKS MARGIN & BCG MATRIX KUADRAN PRODUK */}
        {/* ========================================================================= */}
        {activeTab === 'margin' && (
          <div className="space-y-5">
            {/* BCG 4-Quadrant Cards */}
            <div>
              <div className="mb-3">
                <h3 className="text-xs font-bold text-text-primary uppercase tracking-wider flex items-center gap-1.5">
                  <Flame className="w-4 h-4 text-amber-500" />
                  Matriks Portofolio Produk (BCG Matrix Quadrants)
                </h3>
                <p className="text-[11px] text-text-secondary">
                  Klasifikasi produk berdasarkan volume penjualan vs tingkat margin keuntungan toko
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* 1. STARS */}
                <div className="p-4 rounded-2xl bg-card border border-emerald-500/30 shadow-sm space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-xs text-emerald-700 dark:text-emerald-300 flex items-center gap-1.5 uppercase">
                      🌟 BINTANG (High Volume & High Margin)
                    </span>
                    <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 font-bold text-[10px]">
                      {marginData?.bcgQuadrants.stars.count || 0} SKU
                    </span>
                  </div>
                  <p className="text-[11px] text-text-secondary">{marginData?.bcgQuadrants.stars.description}</p>
                  <div className="divide-y divide-border-subtle pt-1">
                    {marginData?.bcgQuadrants.stars.items.slice(0, 4).map((item, idx) => (
                      <div key={idx} className="py-1.5 flex justify-between items-center text-xs">
                        <div>
                          <p className="font-semibold text-text-primary">{item.productName}</p>
                          <p className="text-[10px] text-emerald-600 font-bold">Margin: {item.marginPercentage}%</p>
                        </div>
                        <span className="font-mono font-bold text-primary">{item.quantitySold} pcs</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* 2. CASH COWS */}
                <div className="p-4 rounded-2xl bg-card border border-primary/30 shadow-sm space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-xs text-primary flex items-center gap-1.5 uppercase">
                      🐂 SAPI PERAH (High Volume & Low Margin)
                    </span>
                    <span className="px-2 py-0.5 rounded-full bg-primary/10 text-primary font-bold text-[10px]">
                      {marginData?.bcgQuadrants.cashCows.count || 0} SKU
                    </span>
                  </div>
                  <p className="text-[11px] text-text-secondary">{marginData?.bcgQuadrants.cashCows.description}</p>
                  <div className="divide-y divide-border-subtle pt-1">
                    {marginData?.bcgQuadrants.cashCows.items.slice(0, 4).map((item, idx) => (
                      <div key={idx} className="py-1.5 flex justify-between items-center text-xs">
                        <div>
                          <p className="font-semibold text-text-primary">{item.productName}</p>
                          <p className="text-[10px] text-text-muted">Omzet: Rp {item.revenue.toLocaleString('id-ID')}</p>
                        </div>
                        <span className="font-mono font-bold text-primary">{item.quantitySold} pcs</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* 3. OPPORTUNITIES */}
                <div className="p-4 rounded-2xl bg-card border border-indigo-500/30 shadow-sm space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-xs text-indigo-700 dark:text-indigo-300 flex items-center gap-1.5 uppercase">
                      ❓ PELUANG (Low Volume & High Margin)
                    </span>
                    <span className="px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-600 font-bold text-[10px]">
                      {marginData?.bcgQuadrants.opportunities.count || 0} SKU
                    </span>
                  </div>
                  <p className="text-[11px] text-text-secondary">{marginData?.bcgQuadrants.opportunities.description}</p>
                  <div className="divide-y divide-border-subtle pt-1">
                    {marginData?.bcgQuadrants.opportunities.items.slice(0, 4).map((item, idx) => (
                      <div key={idx} className="py-1.5 flex justify-between items-center text-xs">
                        <div>
                          <p className="font-semibold text-text-primary">{item.productName}</p>
                          <p className="text-[10px] text-emerald-600 font-bold">Margin: {item.marginPercentage}%</p>
                        </div>
                        <span className="font-mono font-bold text-text-secondary">{item.quantitySold} pcs</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* 4. UNDERPERFORMERS */}
                <div className="p-4 rounded-2xl bg-card border border-rose-500/30 shadow-sm space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-xs text-rose-700 dark:text-rose-300 flex items-center gap-1.5 uppercase">
                      🐕 BEBAN STOK (Low Volume & Low Margin)
                    </span>
                    <span className="px-2 py-0.5 rounded-full bg-rose-500/10 text-rose-600 font-bold text-[10px]">
                      {marginData?.bcgQuadrants.underperformers.count || 0} SKU
                    </span>
                  </div>
                  <p className="text-[11px] text-text-secondary">{marginData?.bcgQuadrants.underperformers.description}</p>
                  <div className="divide-y divide-border-subtle pt-1">
                    {marginData?.bcgQuadrants.underperformers.items.slice(0, 4).map((item, idx) => (
                      <div key={idx} className="py-1.5 flex justify-between items-center text-xs">
                        <div>
                          <p className="font-semibold text-text-primary">{item.productName}</p>
                          <p className="text-[10px] text-rose-500">Margin: {item.marginPercentage}%</p>
                        </div>
                        <span className="font-mono font-bold text-text-muted">{item.quantitySold} pcs</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Category Gross Profit Breakdown Table */}
            <div className="bg-card border border-border-subtle rounded-2xl overflow-hidden shadow-sm">
              <div className="p-4 bg-subtle border-b border-border-subtle flex items-center justify-between">
                <h3 className="text-xs font-bold text-text-primary uppercase tracking-wider">
                  Analisis Margin & Kontribusi Laba per Kategori Produk
                </h3>
                <span className="text-[11px] text-text-secondary font-mono">
                  Rata-rata Margin Toko: <strong className="text-emerald-600 font-bold">{marginData?.averageStoreMargin || 0}%</strong>
                </span>
              </div>
              <table className="w-full text-left text-xs">
                <thead className="bg-subtle text-text-secondary font-semibold border-b border-border-subtle">
                  <tr>
                    <th className="p-3">Kategori Produk</th>
                    <th className="p-3 text-right">Volume Terjual</th>
                    <th className="p-3 text-right">Omzet Penjualan</th>
                    <th className="p-3 text-right">HPP (Modal)</th>
                    <th className="p-3 text-right">Laba Kotor (Gross Profit)</th>
                    <th className="p-3 text-center">Margin %</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border-subtle/60 font-mono">
                  {marginData?.categoryProfits.map((c, idx) => (
                    <tr key={idx} className="hover:bg-card-hover/50">
                      <td className="p-3 font-bold font-sans text-text-primary">{c.categoryName}</td>
                      <td className="p-3 text-right">{c.quantitySold} pcs</td>
                      <td className="p-3 text-right">Rp {c.revenue.toLocaleString('id-ID')}</td>
                      <td className="p-3 text-right text-text-muted">Rp {c.cogs.toLocaleString('id-ID')}</td>
                      <td className="p-3 text-right font-bold text-emerald-600">Rp {c.grossProfit.toLocaleString('id-ID')}</td>
                      <td className="p-3 text-center">
                        <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 font-bold text-[10px] border border-emerald-500/20">
                          {c.marginPercentage}%
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 5: BUKU BESAR & JURNAL UMUM (GENERAL LEDGER / COA) */}
        {/* ========================================================================= */}
        {activeTab === 'ledger' && (
          <div className="space-y-5">
            <div className="bg-card border border-border-subtle rounded-2xl overflow-hidden shadow-sm">
              <div className="p-4 bg-subtle border-b border-border-subtle flex items-center justify-between">
                <div>
                  <h3 className="text-xs font-bold text-text-primary uppercase tracking-wider">
                    Daftar Akun Standar (Chart of Accounts - COA) & Saldo Buku Besar
                  </h3>
                  <p className="text-[11px] text-text-secondary">
                    Pencatatan debit dan kredit otomatis terintegrasi dari seluruh modul POS & Gudang
                  </p>
                </div>
                <span className="px-3 py-1 rounded-full bg-primary/10 text-primary border border-primary/20 text-xs font-bold font-mono">
                  {ledgerData?.totalAccounts || 0} Akun Aktif
                </span>
              </div>

              <table className="w-full text-left text-xs">
                <thead className="bg-subtle text-text-secondary font-semibold border-b border-border-subtle">
                  <tr>
                    <th className="p-3">Kode Akun</th>
                    <th className="p-3">Nama Akun Akuntansi</th>
                    <th className="p-3 text-center">Tipe Akun</th>
                    <th className="p-3 text-right">Total Debit</th>
                    <th className="p-3 text-right">Total Kredit</th>
                    <th className="p-3 text-right">Saldo Berjalan</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border-subtle/60 font-mono">
                  {ledgerData?.accounts.map((acc, idx) => (
                    <tr key={idx} className="hover:bg-card-hover/50">
                      <td className="p-3 font-bold text-primary">{acc.accountCode}</td>
                      <td className="p-3 font-sans font-semibold text-text-primary">{acc.accountName}</td>
                      <td className="p-3 text-center">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-subtle border border-border-subtle text-text-secondary">
                          {acc.type}
                        </span>
                      </td>
                      <td className="p-3 text-right">Rp {acc.debit.toLocaleString('id-ID')}</td>
                      <td className="p-3 text-right">Rp {acc.credit.toLocaleString('id-ID')}</td>
                      <td className="p-3 text-right font-bold text-emerald-600">
                        Rp {acc.balance.toLocaleString('id-ID')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Formal A4 Document Print Modal */}
      <FinancialReportPrintModal
        isOpen={isA4ModalOpen}
        onClose={() => setIsA4ModalOpen(false)}
        pnlData={pnlData}
        cashFlowData={cashFlowData}
        balanceSheetData={balanceSheetData}
        marginData={marginData}
        dateFrom={dateFrom}
        dateTo={dateTo}
      />

      {/* 80mm Thermal Slip Print Modal */}
      <FinancialThermalSummaryModal
        isOpen={isThermalModalOpen}
        onClose={() => setIsThermalModalOpen(false)}
        pnlData={pnlData}
        cashFlowData={cashFlowData}
        balanceSheetData={balanceSheetData}
        dateFrom={dateFrom}
        dateTo={dateTo}
      />
    </div>
  );
};
export default FinancialReportsPage;
