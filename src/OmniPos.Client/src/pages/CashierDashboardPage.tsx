import React, { useState, useEffect } from 'react';
import { 
  Receipt, 
  DollarSign, 
  Clock, 
  ArrowUpRight, 
  ArrowDownRight, 
  Plus, 
  Minus, 
  CheckCircle2, 
  AlertTriangle, 
  Lock, 
  Printer, 
  Calculator, 
  CreditCard, 
  QrCode, 
  Landmark, 
  FileText,
  Flame,
  ChevronRight,
  TrendingUp,
  AlertCircle,
  RefreshCw,
  Download,
  Eye,
  ExternalLink,
  Coins,
  History,
  LayoutDashboard
} from 'lucide-react';
import { useShiftStore, useThemeStore } from '../store/useShiftAndThemeStores';
import { useAuthStore } from '../store/useAuthStore';
import { useToastStore } from '../store/useToastStore';
import { 
  ShiftDashboardData, 
  ShiftHistoryItem, 
  ZReport, 
  CashDenominations 
} from '../types';

export const CashierDashboardPage: React.FC = () => {
  const { 
    activeShift, 
    setActiveShift, 
    dashboardInitialTab, 
    openThermalZReport 
  } = useShiftStore();
  const { currentUser } = useAuthStore();
  const { lockScreen } = useThemeStore();

  const [activeTab, setActiveTab] = useState<'live' | 'closing' | 'history'>(
    dashboardInitialTab === 'closing' ? 'closing' : dashboardInitialTab === 'history' ? 'history' : 'live'
  );

  useEffect(() => {
    if (dashboardInitialTab) {
      setActiveTab(dashboardInitialTab);
    }
  }, [dashboardInitialTab]);
  const [dashboardData, setDashboardData] = useState<ShiftDashboardData | null>(null);
  const [history, setHistory] = useState<ShiftHistoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);

  // Open Shift State (when no active shift)
  const [openStartingCash, setOpenStartingCash] = useState('200000');
  const [openCashierName, setOpenCashierName] = useState(currentUser?.fullName || 'Kasir');
  const [isOpenSubmitting, setIsOpenSubmitting] = useState(false);

  // Petty Cash Form State
  const [pettyAmount, setPettyAmount] = useState('');
  const [pettyDesc, setPettyDesc] = useState('');
  const [pettyCategory, setPettyCategory] = useState('OPERASIONAL');
  const [isPettyIn, setIsPettyIn] = useState(false);
  const [isPettySubmitting, setIsPettySubmitting] = useState(false);

  // Closing Denomination State
  const [c100k, setC100k] = useState<number | ''>('');
  const [c50k, setC50k] = useState<number | ''>('');
  const [c20k, setC20k] = useState<number | ''>('');
  const [c10k, setC10k] = useState<number | ''>('');
  const [c5k, setC5k] = useState<number | ''>('');
  const [c2k, setC2k] = useState<number | ''>('');
  const [c1k, setC1k] = useState<number | ''>('');
  const [coins, setCoins] = useState<number | ''>('');
  const [manualOverrideCash, setManualOverrideCash] = useState<string>('');
  const [isManualCash, setIsManualCash] = useState(false);
  const [closingNotes, setClosingNotes] = useState('');
  const [isClosing, setIsClosing] = useState(false);

  useEffect(() => {
    if (currentUser?.fullName) {
      setOpenCashierName(currentUser.fullName);
    }
  }, [currentUser]);

  useEffect(() => {
    if (dashboardInitialTab) {
      setActiveTab(dashboardInitialTab);
    }
  }, [dashboardInitialTab]);

  const fetchDashboard = async () => {
    if (!activeShift) return;
    try {
      setIsLoading(true);
      const res = await fetch('/api/v1/shifts/active/dashboard');
      if (res.ok) {
        const data = await res.json();
        setDashboardData(data);
      }
    } catch {
      useToastStore.getState().showToast('Gagal memuat telemetri shift.', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchHistory = async () => {
    try {
      setIsLoadingHistory(true);
      const res = await fetch('/api/v1/shifts/history');
      if (res.ok) {
        const data = await res.json();
        setHistory(data);
      }
    } catch {
      // silent
    } finally {
      setIsLoadingHistory(false);
    }
  };

  useEffect(() => {
    if (activeShift) {
      fetchDashboard();
    }
    fetchHistory();
  }, [activeShift]);

  // Open Shift Action
  const handleOpenShift = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsOpenSubmitting(true);
      const res = await fetch('/api/v1/shifts/open', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: currentUser?.id || 'user_1',
          cashierName: openCashierName.trim() || currentUser?.fullName || 'Kasir',
          startingCash: parseFloat(openStartingCash) || 0,
        }),
      });

      if (res.ok) {
        const shift = await res.json();
        setActiveShift(shift);
        setActiveTab('live');
        useToastStore.getState().showToast(`Shift ${shift.shiftNumber} berhasil dibuka! Laci kas terbuka.`, 'success');
        fetchDashboard();
        fetchHistory();
      } else {
        useToastStore.getState().showToast('Gagal membuka shift kasir!', 'error');
      }
    } catch {
      useToastStore.getState().showToast('Gagal membuka shift! Periksa koneksi backend.', 'error');
    } finally {
      setIsOpenSubmitting(false);
    }
  };

  // Physical Denomination Calculation
  const totalDenominationCash = 
    (Number(c100k) || 0) * 100000 +
    (Number(c50k) || 0) * 50000 +
    (Number(c20k) || 0) * 20000 +
    (Number(c10k) || 0) * 10000 +
    (Number(c5k) || 0) * 5000 +
    (Number(c2k) || 0) * 2000 +
    (Number(c1k) || 0) * 1000 +
    (Number(coins) || 0);

  const actualCashCount = isManualCash 
    ? (parseFloat(manualOverrideCash) || 0) 
    : totalDenominationCash;

  const expectedCash = dashboardData?.expectedCash ?? activeShift?.expectedCash ?? 0;
  const cashDiscrepancy = actualCashCount - expectedCash;

  // Submit Petty Cash
  const handleAddPettyCash = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeShift) return;
    const amt = parseFloat(pettyAmount);
    if (!amt || amt <= 0) {
      useToastStore.getState().showToast('Nominal kas harus lebih dari 0.', 'warning');
      return;
    }

    try {
      setIsPettySubmitting(true);
      const res = await fetch('/api/v1/shifts/cash-tx', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          shiftId: activeShift.id,
          isCashIn: isPettyIn,
          amount: amt,
          category: pettyCategory,
          description: pettyDesc.trim() || (isPettyIn ? 'Tambah Modal Kas' : 'Pengeluaran Toko'),
          userId: currentUser?.id || activeShift.userId,
        }),
      });

      if (res.ok) {
        useToastStore.getState().showToast(
          isPettyIn ? `Kas masuk Rp ${amt.toLocaleString('id-ID')} dicatat!` : `Kas keluar Rp ${amt.toLocaleString('id-ID')} dicatat!`,
          'success'
        );
        setPettyAmount('');
        setPettyDesc('');
        fetchDashboard();
        fetchHistory();
      } else {
        useToastStore.getState().showToast('Gagal mencatat transaksi kas operasional.', 'error');
      }
    } catch {
      useToastStore.getState().showToast('Terjadi kesalahan jaringan.', 'error');
    } finally {
      setIsPettySubmitting(false);
    }
  };

  // Close Shift & Reconciliation Submission
  const handleCloseShift = async () => {
    if (!activeShift) return;

    if (!isManualCash && totalDenominationCash === 0) {
      if (!window.confirm('Perhitungan uang fisik masih Rp 0. Apakah Anda yakin tidak ada uang tunai sama sekali di laci?')) {
        return;
      }
    }

    try {
      setIsClosing(true);
      const denominationsObj: CashDenominations = {
        c100k: Number(c100k) || 0,
        c50k: Number(c50k) || 0,
        c20k: Number(c20k) || 0,
        c10k: Number(c10k) || 0,
        c5k: Number(c5k) || 0,
        c2k: Number(c2k) || 0,
        c1k: Number(c1k) || 0,
        coins: Number(coins) || 0,
      };

      const denominationJson = JSON.stringify(denominationsObj);

      const res = await fetch('/api/v1/shifts/close', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          shiftId: activeShift.id,
          actualCashCount,
          closingNotes: closingNotes.trim(),
          closingCashDenominations: isManualCash ? null : denominationJson,
          supervisorPin: '',
        }),
      });

      if (res.ok) {
        const zReport: ZReport = await res.json();
        setActiveShift(null);
        openThermalZReport(zReport);
        setActiveTab('history');
        fetchHistory();
        useToastStore.getState().showToast('Shift resmi ditutup & Z-Report berhasil dibuat!', 'success');
      } else {
        useToastStore.getState().showToast('Gagal menutup shift. Periksa koneksi backend.', 'error');
      }
    } catch {
      useToastStore.getState().showToast('Terjadi kesalahan saat menutup shift.', 'error');
    } finally {
      setIsClosing(false);
    }
  };

  const handleViewZReport = async (shiftId: string) => {
    try {
      const res = await fetch(`/api/v1/shifts/${shiftId}/z-report`);
      if (res.ok) {
        const data = await res.json();
        openThermalZReport(data);
      } else {
        useToastStore.getState().showToast('Gagal memuat Z-Report shift!', 'error');
      }
    } catch {
      useToastStore.getState().showToast('Gagal memuat Z-Report!', 'error');
    }
  };

  const handlePrintZReportHardware = async (shiftId: string) => {
    try {
      const res = await fetch(`/api/v1/shifts/${shiftId}/print-zreport`, { method: 'POST' });
      if (res.ok) {
        useToastStore.getState().showToast('Perintah cetak Z-Report dikirim ke printer kasir!', 'success');
      } else {
        useToastStore.getState().showToast('Gagal mencetak ke printer fisik!', 'error');
      }
    } catch {
      useToastStore.getState().showToast('Gagal menghubungi printer!', 'error');
    }
  };

  const handleExportCsv = () => {
    window.open('/api/v1/shifts/export-csv', '_blank');
  };

  const handleLockScreen = () => {
    lockScreen(currentUser?.fullName || activeShift?.cashierName || 'Kasir');
  };

  const startTimeFormatted = activeShift ? new Date(activeShift.startTime).toLocaleTimeString('id-ID', {
    hour: '2-digit',
    minute: '2-digit',
  }) : '';

  return (
    <div className="flex-1 flex flex-col bg-app overflow-hidden select-none">
      {/* 1. Page Header Bar */}
      <div className="p-4 bg-surface border-b border-border-subtle flex flex-col md:flex-row md:items-center justify-between gap-3 shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-bold shadow-sm">
            <LayoutDashboard className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base font-extrabold text-text-primary">Dashboard & Manajemen Kasir</h1>
              {activeShift ? (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-500/15 text-emerald-600 border border-emerald-500/30 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
                  SHIFT AKTIF #{activeShift.shiftNumber.split('-')[2] || activeShift.shiftNumber}
                </span>
              ) : (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/15 text-amber-600 border border-amber-500/30 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" />
                  SHIFT BELUM BUKA
                </span>
              )}
            </div>
            <p className="text-xs text-text-secondary">
              {activeShift ? (
                <span>Kasir: <strong className="text-text-primary">{activeShift.cashierName}</strong> • Mulai Pukul: <strong>{startTimeFormatted}</strong></span>
              ) : (
                'Monitoring arus kas laci kasir, pencatatan transaksi kas kecil, dan arsip Z-Report'
              )}
            </p>
          </div>
        </div>

        {/* Action Controls & Tab Switcher */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Main Navigation Tabs */}
          <div className="flex items-center bg-subtle p-1 rounded-xl border border-border-subtle text-xs">
            <button
              onClick={() => setActiveTab('live')}
              disabled={!activeShift}
              className={`px-3 py-1.5 rounded-lg font-bold transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-40 ${
                activeTab === 'live'
                  ? 'bg-primary text-white shadow-sm'
                  : 'text-text-secondary hover:text-text-primary'
              }`}
            >
              <Receipt className="w-3.5 h-3.5" />
              <span>Live Shift</span>
            </button>
            <button
              onClick={() => setActiveTab('closing')}
              disabled={!activeShift}
              className={`px-3 py-1.5 rounded-lg font-bold transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-40 ${
                activeTab === 'closing'
                  ? 'bg-status-danger text-white shadow-sm'
                  : 'text-text-secondary hover:text-text-primary'
              }`}
            >
              <Calculator className="w-3.5 h-3.5" />
              <span>Tutup Shift</span>
            </button>
            <button
              onClick={() => setActiveTab('history')}
              className={`px-3 py-1.5 rounded-lg font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'history'
                  ? 'bg-card text-text-primary shadow-sm border border-border-subtle'
                  : 'text-text-secondary hover:text-text-primary'
              }`}
            >
              <History className="w-3.5 h-3.5" />
              <span>Riwayat Shift</span>
            </button>
          </div>

          <div className="h-6 w-px bg-border-subtle mx-0.5 hidden sm:block" />

          {/* Quick Lock Button */}
          <button
            onClick={handleLockScreen}
            title="Kunci Layar Kasir [F12]"
            className="p-2 rounded-lg bg-subtle hover:bg-card-hover border border-border-subtle text-text-secondary hover:text-text-primary transition-colors cursor-pointer"
          >
            <Lock className="w-4 h-4" />
          </button>

          {/* Export CSV Button */}
          <button
            onClick={handleExportCsv}
            title="Ekspor CSV Riwayat Shift"
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-subtle hover:bg-card-hover border border-border-subtle text-xs font-semibold text-text-secondary hover:text-text-primary transition-colors cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Ekspor CSV</span>
          </button>

          {/* Refresh Button */}
          <button
            onClick={() => {
              if (activeShift) fetchDashboard();
              fetchHistory();
            }}
            disabled={isLoading || isLoadingHistory}
            title="Muat Ulang Data"
            className="p-2 rounded-lg bg-subtle hover:bg-card-hover border border-border-subtle text-text-secondary hover:text-text-primary transition-colors cursor-pointer"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading || isLoadingHistory ? 'animate-spin text-primary' : ''}`} />
          </button>
        </div>
      </div>

      {/* 2. Main Workspace Body */}
      <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6">
        
        {/* CASE A: SHIFT NOT ACTIVE YET -> Show In-Page Open Shift Hero Banner */}
        {!activeShift && activeTab !== 'history' && (
          <div className="bg-card border border-border-subtle rounded-2xl p-6 md:p-8 shadow-sm space-y-6 max-w-2xl mx-auto my-4 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center font-black shrink-0">
                <Receipt className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-lg font-black text-text-primary">Buka Shift Kasir Baru</h2>
                <p className="text-xs text-text-secondary mt-0.5 leading-relaxed">
                  Shift kasir saat ini sedang nonaktif. Masukkan modal awal kas laci untuk mulai mencatat transaksi penjualan, menerima pembayaran tunai/non-tunai, dan memantau rekonsiliasi kas.
                </p>
              </div>
            </div>

            <form onSubmit={handleOpenShift} className="space-y-4 pt-2 border-t border-border-subtle">
              <div>
                <label className="block text-xs font-bold text-text-secondary mb-1">
                  Nama Kasir Bertugas:
                </label>
                <input
                  type="text"
                  value={openCashierName}
                  onChange={(e) => setOpenCashierName(e.target.value)}
                  className="w-full text-sm px-3.5 py-2.5 bg-subtle border border-border-strong rounded-xl text-text-primary font-semibold focus:outline-none focus:border-primary transition-all"
                  required
                />
                {currentUser && (
                  <p className="text-[11px] text-primary/80 mt-1 font-medium">
                    ✓ Terisi otomatis dari akun aktif ({currentUser.username} - {currentUser.role})
                  </p>
                )}
              </div>

              <div>
                <label className="block text-xs font-bold text-text-secondary mb-1">
                  Modal Awal Kas Laci (Starting Float Rp):
                </label>
                <input
                  type="number"
                  value={openStartingCash}
                  onChange={(e) => setOpenStartingCash(e.target.value)}
                  className="w-full text-2xl font-black font-mono px-3.5 py-2.5 bg-subtle border border-border-strong rounded-xl text-text-primary focus:outline-none focus:border-primary tabular-nums transition-all"
                  required
                  min="0"
                  step="1000"
                />

                {/* Quick Presets */}
                <div className="flex items-center gap-2 mt-2.5 flex-wrap">
                  <span className="text-xs text-text-muted mr-1 font-medium">Pilihan Cepat:</span>
                  {[100000, 200000, 300000, 500000, 1000000].map((amt) => (
                    <button
                      key={amt}
                      type="button"
                      onClick={() => setOpenStartingCash(amt.toString())}
                      className={`text-xs font-mono font-bold px-3 py-1.5 rounded-lg border transition-all cursor-pointer ${
                        openStartingCash === amt.toString()
                          ? 'bg-primary text-white border-primary shadow-sm scale-105'
                          : 'bg-subtle text-text-secondary hover:bg-card-hover border-border-subtle'
                      }`}
                    >
                      {(amt / 1000).toLocaleString('id-ID')}k
                    </button>
                  ))}
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-status-info/10 border border-status-info/20 text-xs text-text-secondary flex items-start gap-2.5">
                <span className="text-status-info font-bold text-sm">ℹ️</span>
                <p className="text-xs leading-relaxed">
                  Laci kasir fisik (Cash Drawer) akan terbuka otomatis secara instan saat tombol konfirmasi ditekan.
                </p>
              </div>

              <button
                type="submit"
                disabled={isOpenSubmitting}
                className="w-full py-3 bg-primary hover:bg-primary-hover text-white rounded-xl font-bold text-sm shadow-md transition-all flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
              >
                <span>{isOpenSubmitting ? 'Membuka Shift...' : 'Konfirmasi Buka Shift Kasir'}</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </form>
          </div>
        )}

        {/* CASE B: SHIFT IS ACTIVE -> TAB 1: LIVE MONITORING */}
        {activeShift && activeTab === 'live' && (
          <div className="space-y-6">
            {/* Top 4 Telemetry Cash Drawer Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* 1. Modal Awal */}
              <div className="p-4 rounded-2xl bg-card border border-border-subtle shadow-sm space-y-2">
                <div className="flex items-center justify-between text-xs text-text-muted">
                  <span className="font-semibold uppercase tracking-wider text-[10px]">1. Modal Awal (Float)</span>
                  <Receipt className="w-4 h-4 text-text-muted" />
                </div>
                <p className="text-xl font-black font-mono text-text-primary tabular-nums">
                  Rp {activeShift.startingCash.toLocaleString('id-ID')}
                </p>
                <span className="text-[11px] text-text-muted block">Kas masuk saat buka laci</span>
              </div>

              {/* 2. Penjualan Tunai */}
              <div className="p-4 rounded-2xl bg-card border border-border-subtle shadow-sm space-y-2">
                <div className="flex items-center justify-between text-xs text-text-muted">
                  <span className="font-semibold uppercase tracking-wider text-[10px] text-emerald-600">2. (+) Penjualan Tunai</span>
                  <DollarSign className="w-4 h-4 text-emerald-600" />
                </div>
                <p className="text-xl font-black font-mono text-emerald-600 tabular-nums">
                  +Rp {(dashboardData?.totalCashSales ?? activeShift.totalCashSales).toLocaleString('id-ID')}
                </p>
                <span className="text-[11px] text-text-muted block">Dari uang fisik belanja pelanggan</span>
              </div>

              {/* 3. Arus Kas Kecil (Net) */}
              <div className="p-4 rounded-2xl bg-card border border-border-subtle shadow-sm space-y-2">
                <div className="flex items-center justify-between text-xs text-text-muted">
                  <span className="font-semibold uppercase tracking-wider text-[10px]">3. (+/-) Kas Masuk/Keluar</span>
                  <div className="flex items-center gap-1">
                    <ArrowUpRight className="w-3.5 h-3.5 text-blue-500" />
                    <ArrowDownRight className="w-3.5 h-3.5 text-rose-500" />
                  </div>
                </div>
                <p className={`text-xl font-black font-mono tabular-nums ${
                  ((dashboardData?.totalCashIn ?? activeShift.totalCashIn) - (dashboardData?.totalCashOut ?? activeShift.totalCashOut)) >= 0
                    ? 'text-text-primary'
                    : 'text-rose-600'
                }`}>
                  Rp {((dashboardData?.totalCashIn ?? activeShift.totalCashIn) - (dashboardData?.totalCashOut ?? activeShift.totalCashOut)).toLocaleString('id-ID')}
                </p>
                <span className="text-[11px] text-text-muted block">
                  In: +Rp {(dashboardData?.totalCashIn ?? activeShift.totalCashIn).toLocaleString('id-ID')} | Out: -Rp {(dashboardData?.totalCashOut ?? activeShift.totalCashOut).toLocaleString('id-ID')}
                </span>
              </div>

              {/* 4. Total Kas Diharapkan (Hero Expected Card) */}
              <div className="p-4 rounded-2xl bg-primary/10 border-2 border-primary/30 shadow-sm space-y-2 relative overflow-hidden">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-extrabold uppercase tracking-wider text-[10px] text-primary">
                    4. Kas Sistem Diharapkan
                  </span>
                  <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                </div>
                <p className="text-2xl font-black font-mono text-primary tabular-nums">
                  Rp {expectedCash.toLocaleString('id-ID')}
                </p>
                <span className="text-[11px] text-text-muted block font-medium">
                  Uang fisik yang wajib ada di laci
                </span>
              </div>
            </div>

            {/* Split 2 Columns: Left (Payments + Top Products + Petty Cash), Right (Recent Receipts + Closing Card) */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* LEFT COLUMN */}
              <div className="space-y-6">
                {/* A. Non-Cash & Digital Payment Breakdown */}
                <div className="p-5 rounded-2xl bg-card border border-border-subtle shadow-sm space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-bold text-text-primary uppercase tracking-wider flex items-center gap-2">
                      <CreditCard className="w-4 h-4 text-primary" />
                      <span>Rekapitulasi Pembayaran Non-Tunai</span>
                    </h3>
                    <span className="text-xs font-mono font-bold text-primary">
                      Rp {(dashboardData?.totalNonCashSales ?? activeShift.totalNonCashSales).toLocaleString('id-ID')}
                    </span>
                  </div>

                  <div className="space-y-2">
                    {dashboardData?.paymentBreakdown && dashboardData.paymentBreakdown.length > 0 ? (
                      dashboardData.paymentBreakdown.map((pm, idx) => (
                        <div key={idx} className="p-3 rounded-xl bg-subtle border border-border-subtle flex items-center justify-between text-xs">
                          <div className="flex items-center gap-2.5">
                            {pm.method.includes('QRIS') ? (
                              <QrCode className="w-4 h-4 text-indigo-500" />
                            ) : pm.method.includes('Transfer') ? (
                              <Landmark className="w-4 h-4 text-amber-500" />
                            ) : (
                              <CreditCard className="w-4 h-4 text-blue-500" />
                            )}
                            <div>
                              <p className="font-bold text-text-primary">{pm.method}</p>
                              <span className="text-[10px] text-text-muted">{pm.count} transaksi</span>
                            </div>
                          </div>
                          <span className="font-mono font-bold text-text-primary tabular-nums">
                            Rp {pm.amount.toLocaleString('id-ID')}
                          </span>
                        </div>
                      ))
                    ) : (
                      <p className="text-xs text-text-muted text-center py-4 italic">
                        Belum ada transaksi non-tunai (QRIS / Kartu / Transfer) pada shift ini.
                      </p>
                    )}
                  </div>
                </div>

                {/* B. Top 5 Products Sold in Shift */}
                <div className="p-5 rounded-2xl bg-card border border-border-subtle shadow-sm space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-bold text-text-primary uppercase tracking-wider flex items-center gap-2">
                      <Flame className="w-4 h-4 text-amber-500" />
                      <span>Produk Terlaris Shift Ini</span>
                    </h3>
                    <span className="text-[11px] text-text-muted">Top 5 Item</span>
                  </div>

                  <div className="space-y-2">
                    {dashboardData?.topProducts && dashboardData.topProducts.length > 0 ? (
                      dashboardData.topProducts.map((prod, idx) => (
                        <div key={idx} className="p-2.5 rounded-xl bg-subtle border border-border-subtle flex items-center justify-between text-xs">
                          <div className="flex items-center gap-2.5 truncate">
                            <span className="w-5 h-5 rounded-full bg-primary/10 text-primary font-black flex items-center justify-center text-[10px] shrink-0">
                              {idx + 1}
                            </span>
                            <span className="font-semibold text-text-primary truncate">{prod.productName}</span>
                          </div>
                          <div className="text-right shrink-0">
                            <span className="font-bold text-primary font-mono">{prod.quantity}x</span>
                            <span className="text-[10px] text-text-muted block font-mono">
                              Rp {prod.revenue.toLocaleString('id-ID')}
                            </span>
                          </div>
                        </div>
                      ))
                    ) : (
                      <p className="text-xs text-text-muted text-center py-4 italic">
                        Belum ada produk yang terjual pada shift ini.
                      </p>
                    )}
                  </div>
                </div>

                {/* C. Quick Petty Cash Movement Form */}
                <div className="p-5 rounded-2xl bg-card border border-border-subtle shadow-sm space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-bold text-text-primary uppercase tracking-wider">
                      Input Kas Masuk / Kas Keluar (Petty Cash)
                    </h3>
                    <span className="text-[11px] text-text-muted">Memperbarui saldo kas laci</span>
                  </div>

                  <form onSubmit={handleAddPettyCash} className="space-y-3 text-xs">
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => setIsPettyIn(false)}
                        className={`flex-1 py-2.5 rounded-xl font-bold flex items-center justify-center gap-1.5 border transition-all cursor-pointer ${
                          !isPettyIn ? 'bg-status-danger/15 border-status-danger text-status-danger shadow-xs' : 'bg-subtle border-border-subtle text-text-secondary hover:bg-card-hover'
                        }`}
                      >
                        <ArrowDownRight className="w-4 h-4" />
                        <span>Kas Keluar (Operasional)</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setIsPettyIn(true)}
                        className={`flex-1 py-2.5 rounded-xl font-bold flex items-center justify-center gap-1.5 border transition-all cursor-pointer ${
                          isPettyIn ? 'bg-status-success/15 border-status-success text-status-success shadow-xs' : 'bg-subtle border-border-subtle text-text-secondary hover:bg-card-hover'
                        }`}
                      >
                        <ArrowUpRight className="w-4 h-4" />
                        <span>Kas Masuk (Tambah Modal)</span>
                      </button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      <div>
                        <label className="block text-[11px] font-semibold text-text-secondary mb-1">Nominal (Rp):</label>
                        <input
                          type="number"
                          value={pettyAmount}
                          onChange={(e) => setPettyAmount(e.target.value)}
                          placeholder="Contoh: 50000"
                          className="w-full text-sm font-mono font-bold px-3 py-2 bg-subtle border border-border-strong rounded-xl text-text-primary tabular-nums focus:outline-none focus:border-primary"
                          required
                          min="500"
                          step="500"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-semibold text-text-secondary mb-1">Keperluan / Keterangan:</label>
                        <input
                          type="text"
                          value={pettyDesc}
                          onChange={(e) => setPettyDesc(e.target.value)}
                          placeholder="Beli kertas thermal, galon..."
                          className="w-full text-xs px-3 py-2 bg-subtle border border-border-strong rounded-xl text-text-primary focus:outline-none focus:border-primary"
                          required
                        />
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={isPettySubmitting}
                      className="w-full py-2.5 bg-primary hover:bg-primary-hover text-white rounded-xl font-bold text-xs shadow-sm transition-all disabled:opacity-50 cursor-pointer"
                    >
                      {isPettySubmitting ? 'Menyimpan...' : 'Simpan Transaksi Kas ke Laci'}
                    </button>
                  </form>
                </div>
              </div>

              {/* RIGHT COLUMN */}
              <div className="space-y-6">
                {/* D. Close Shift CTA Banner */}
                <div className="p-5 rounded-2xl bg-status-danger/10 border border-status-danger/25 shadow-sm space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Calculator className="w-4 h-4 text-status-danger" />
                      <h3 className="text-xs font-bold text-status-danger uppercase tracking-wider">
                        Selesai Jam Dinas Kasir?
                      </h3>
                    </div>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-status-danger/20 text-status-danger">
                      REKONSILIASI
                    </span>
                  </div>
                  <p className="text-xs text-text-secondary leading-relaxed">
                    Lakukan penghitungan uang fisik laci kasir (blind count), rekonsiliasi selisih kas, dan cetak Z-Report sebelum menyerahkan shift ke kasir berikutnya atau menutup toko.
                  </p>
                  <button
                    onClick={() => setActiveTab('closing')}
                    className="w-full py-2.5 bg-status-danger hover:bg-red-700 text-white font-bold text-xs rounded-xl shadow-sm transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <span>Lanjut ke Penutupan Shift & Hitung Uang Laci</span>
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>

                {/* E. Recent Receipts / Orders in Shift */}
                <div className="p-5 rounded-2xl bg-card border border-border-subtle shadow-sm space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-bold text-text-primary uppercase tracking-wider flex items-center gap-2">
                      <Receipt className="w-4 h-4 text-primary" />
                      <span>Transaksi Penjualan Shift Ini</span>
                    </h3>
                    <span className="text-xs font-mono font-bold text-text-primary">
                      {dashboardData?.orders?.length ?? 0} Struk
                    </span>
                  </div>

                  <div className="overflow-x-auto max-h-[380px] overflow-y-auto">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="border-b border-border-subtle text-text-muted text-[10px] uppercase tracking-wider bg-subtle/50">
                          <th className="py-2 px-2.5">No. Struk</th>
                          <th className="py-2 px-2.5">Waktu</th>
                          <th className="py-2 px-2.5">Metode</th>
                          <th className="py-2 px-2.5 text-right">Total</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border-subtle">
                        {dashboardData?.orders && dashboardData.orders.length > 0 ? (
                          dashboardData.orders.map((ord, idx) => (
                            <tr key={idx} className="hover:bg-subtle/50 transition-colors">
                              <td className="py-2 px-2.5 font-mono font-bold text-text-primary">
                                {ord.invoiceNumber}
                              </td>
                              <td className="py-2 px-2.5 text-text-muted font-mono text-[11px]">
                                {new Date(ord.orderDate).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                              </td>
                              <td className="py-2 px-2.5">
                                <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${
                                  ord.paymentMethods === 'Cash'
                                    ? 'bg-emerald-500/15 text-emerald-600'
                                    : 'bg-primary/15 text-primary'
                                }`}>
                                  {ord.paymentMethods}
                                </span>
                              </td>
                              <td className="py-2 px-2.5 text-right font-mono font-bold text-text-primary">
                                Rp {ord.totalAmount.toLocaleString('id-ID')}
                              </td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td colSpan={4} className="py-6 text-center text-text-muted italic">
                              Belum ada struk penjualan pada shift ini.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* CASE C: SHIFT IS ACTIVE -> TAB 2: CLOSING & RECONCILIATION */}
        {activeShift && activeTab === 'closing' && (
          <div className="max-w-3xl mx-auto space-y-6 animate-in fade-in zoom-in-95 duration-200">
            {/* Closing Header */}
            <div className="p-5 rounded-2xl bg-card border border-border-subtle shadow-sm flex items-center justify-between">
              <div>
                <h2 className="text-base font-extrabold text-text-primary">Rekonsiliasi Kas Laci (Tutup Shift)</h2>
                <p className="text-xs text-text-secondary">Hitung uang fisik di laci kasir dan bandingkan dengan saldo sistem</p>
              </div>
              <button
                onClick={() => setActiveTab('live')}
                className="px-3 py-1.5 rounded-xl bg-subtle hover:bg-card-hover border border-border-subtle text-xs font-semibold text-text-secondary cursor-pointer"
              >
                ◀ Kembali ke Live
              </button>
            </div>

            {/* Expected Cash Banner */}
            <div className="p-5 rounded-2xl bg-primary/10 border border-primary/25 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <span className="text-xs font-extrabold uppercase tracking-wider text-primary">
                  Saldo Kas Sistem yang Diharapkan:
                </span>
                <p className="text-[11px] text-text-muted mt-0.5">
                  Modal Awal (Rp {activeShift.startingCash.toLocaleString('id-ID')}) + Penjualan Tunai (+Rp {(dashboardData?.totalCashSales ?? activeShift.totalCashSales).toLocaleString('id-ID')}) + Kas Masuk - Keluar
                </p>
              </div>
              <p className="text-2xl font-black font-mono text-primary tabular-nums">
                Rp {expectedCash.toLocaleString('id-ID')}
              </p>
            </div>

            {/* Cash Denomination Calculator Card */}
            <div className="p-6 rounded-2xl bg-card border border-border-subtle shadow-sm space-y-5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Coins className="w-4 h-4 text-primary" />
                  <h3 className="text-xs font-bold text-text-primary uppercase tracking-wider">
                    Kalkulator Pecahan Uang Rupiah (Blind Count)
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setIsManualCash(!isManualCash)}
                  className="text-xs text-primary font-bold hover:underline cursor-pointer"
                >
                  {isManualCash ? 'Gunakan Kalkulator Lembar' : 'Mode Input Manual Total'}
                </button>
              </div>

              {!isManualCash ? (
                <div className="space-y-3">
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {[
                      { label: 'Rp 100.000', val: c100k, set: setC100k, mult: 100000 },
                      { label: 'Rp 50.000', val: c50k, set: setC50k, mult: 50000 },
                      { label: 'Rp 20.000', val: c20k, set: setC20k, mult: 20000 },
                      { label: 'Rp 10.000', val: c10k, set: setC10k, mult: 10000 },
                      { label: 'Rp 5.000', val: c5k, set: setC5k, mult: 5000 },
                      { label: 'Rp 2.000', val: c2k, set: setC2k, mult: 2000 },
                      { label: 'Rp 1.000', val: c1k, set: setC1k, mult: 1000 },
                    ].map((item, idx) => (
                      <div key={idx} className="p-2.5 rounded-xl bg-subtle border border-border-subtle space-y-1">
                        <span className="text-[11px] font-bold text-text-secondary">{item.label}</span>
                        <div className="flex items-center gap-1.5">
                          <input
                            type="number"
                            min="0"
                            placeholder="0"
                            value={item.val}
                            onChange={(e) => item.set(e.target.value === '' ? '' : Math.max(0, parseInt(e.target.value) || 0))}
                            className="w-full text-sm font-mono font-bold px-2.5 py-1.5 bg-card border border-border-strong rounded-lg text-text-primary tabular-nums focus:outline-none focus:border-primary"
                          />
                          <span className="text-[10px] text-text-muted">lbr</span>
                        </div>
                        <span className="text-[10px] text-text-muted font-mono block text-right">
                          = Rp {((Number(item.val) || 0) * item.mult).toLocaleString('id-ID')}
                        </span>
                      </div>
                    ))}

                    {/* Total Koin Logam */}
                    <div className="p-2.5 rounded-xl bg-subtle border border-border-subtle space-y-1">
                      <span className="text-[11px] font-bold text-text-secondary">Koin Logam (Total Rp)</span>
                      <input
                        type="number"
                        min="0"
                        placeholder="0"
                        value={coins}
                        onChange={(e) => setCoins(e.target.value === '' ? '' : Math.max(0, parseFloat(e.target.value) || 0))}
                        className="w-full text-sm font-mono font-bold px-2.5 py-1.5 bg-card border border-border-strong rounded-lg text-text-primary tabular-nums focus:outline-none focus:border-primary"
                      />
                      <span className="text-[10px] text-text-muted font-mono block text-right">
                        = Rp {(Number(coins) || 0).toLocaleString('id-ID')}
                      </span>
                    </div>
                  </div>

                  <div className="flex justify-end">
                    <button
                      type="button"
                      onClick={() => {
                        setC100k(''); setC50k(''); setC20k(''); setC10k('');
                        setC5k(''); setC2k(''); setC1k(''); setCoins('');
                      }}
                      className="text-[11px] text-text-muted hover:text-text-primary underline cursor-pointer"
                    >
                      Reset Hitungan Uang
                    </button>
                  </div>
                </div>
              ) : (
                <div>
                  <label className="block text-xs font-semibold text-text-secondary mb-1">
                    Input Total Uang Fisik Hasil Hitung Manual (Rp):
                  </label>
                  <input
                    type="number"
                    value={manualOverrideCash}
                    onChange={(e) => setManualOverrideCash(e.target.value)}
                    placeholder="Contoh: 1250000"
                    className="w-full text-xl font-bold font-mono px-3 py-2 bg-subtle border border-border-strong rounded-xl text-text-primary tabular-nums focus:outline-none focus:border-primary"
                    required
                  />
                </div>
              )}

              {/* Total Physical Cash Calculated */}
              <div className="p-4 rounded-xl bg-subtle border border-border-subtle flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-text-secondary">Total Uang Fisik Terhitung:</span>
                  <p className="text-[11px] text-text-muted">Hasil dari pecahan lembar & koin</p>
                </div>
                <p className="text-2xl font-black font-mono text-text-primary tabular-nums">
                  Rp {actualCashCount.toLocaleString('id-ID')}
                </p>
              </div>

              {/* Discrepancy Indicator Card */}
              <div className={`p-4 rounded-xl border flex items-center justify-between ${
                Math.abs(cashDiscrepancy) < 0.01
                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-700'
                  : cashDiscrepancy > 0
                  ? 'bg-amber-500/10 border-amber-500/30 text-amber-700'
                  : 'bg-rose-500/10 border-rose-500/30 text-rose-700'
              }`}>
                <div className="flex items-center gap-2.5">
                  {Math.abs(cashDiscrepancy) < 0.01 ? (
                    <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                  ) : cashDiscrepancy > 0 ? (
                    <AlertTriangle className="w-5 h-5 text-amber-600" />
                  ) : (
                    <AlertCircle className="w-5 h-5 text-rose-600" />
                  )}
                  <div>
                    <h4 className="text-xs font-bold uppercase tracking-wider">
                      {Math.abs(cashDiscrepancy) < 0.01 ? 'Status: Kas Laci Seimbang (PAS)' : cashDiscrepancy > 0 ? 'Status: Kas Laci Berlebih (LEBIH)' : 'Status: Kas Laci Kurang (SELISIH KURANG)'}
                    </h4>
                    <p className="text-[11px] opacity-80">
                      {Math.abs(cashDiscrepancy) < 0.01
                        ? 'Saldo fisik sama persis dengan sistem pembukuan.'
                        : cashDiscrepancy > 0
                        ? 'Fisik lebih banyak dari perhitungan sistem.'
                        : 'Fisik lebih sedikit dari perhitungan sistem.'}
                    </p>
                  </div>
                </div>

                <div className="text-right">
                  <span className="text-xs font-extrabold font-mono text-sm tabular-nums">
                    {Math.abs(cashDiscrepancy) < 0.01
                      ? 'Rp 0 (PAS)'
                      : cashDiscrepancy > 0
                      ? `+Rp ${cashDiscrepancy.toLocaleString('id-ID')}`
                      : `-Rp ${Math.abs(cashDiscrepancy).toLocaleString('id-ID')}`}
                  </span>
                </div>
              </div>

              {/* Closing Notes */}
              <div>
                <label className="block text-xs font-semibold text-text-secondary mb-1">
                  Catatan Penutupan Kasir (Opsional):
                </label>
                <input
                  type="text"
                  value={closingNotes}
                  onChange={(e) => setClosingNotes(e.target.value)}
                  placeholder="Contoh: Laci seimbang, sisa uang receh diserahkan ke kasir shift 2..."
                  className="w-full text-xs px-3.5 py-2.5 bg-subtle border border-border-strong rounded-xl text-text-primary focus:outline-none focus:border-primary"
                />
              </div>

              {/* Submit Button */}
              <button
                type="button"
                onClick={handleCloseShift}
                disabled={isClosing}
                className="w-full py-3.5 bg-status-danger hover:bg-red-700 text-white font-bold text-sm rounded-xl shadow-md transition-all flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
              >
                <Printer className="w-4 h-4" />
                <span>{isClosing ? 'Menutup Shift...' : 'Konfirmasi Tutup Shift & Cetak Z-Report'}</span>
              </button>
            </div>
          </div>
        )}

        {/* CASE D: TAB 3: SHIFT HISTORY & PAST AUDIT */}
        {activeTab === 'history' && (
          <div className="bg-card border border-border-subtle rounded-2xl p-5 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h3 className="text-xs font-bold text-text-primary uppercase tracking-wider">
                  Riwayat & Arsip Penutupan Shift Kasir
                </h3>
                <p className="text-[11px] text-text-muted">
                  Daftar seluruh shift yang telah ditutup beserta laporan selisih uang fisik dan slip Z-Report
                </p>
              </div>
              <span className="text-xs text-text-muted font-mono">{history.length} shift tercatat</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-border-subtle text-text-muted text-[10px] uppercase tracking-wider bg-subtle/50">
                    <th className="py-2.5 px-3">No. Shift</th>
                    <th className="py-2.5 px-3">Kasir</th>
                    <th className="py-2.5 px-3">Waktu Mulai - Selesai</th>
                    <th className="py-2.5 px-3 text-right">Modal Awal</th>
                    <th className="py-2.5 px-3 text-right">Penjualan Tunai</th>
                    <th className="py-2.5 px-3 text-right">Non-Tunai</th>
                    <th className="py-2.5 px-3 text-right">Kas Diharapkan</th>
                    <th className="py-2.5 px-3 text-right">Uang Fisik</th>
                    <th className="py-2.5 px-3 text-center">Selisih (Discrepancy)</th>
                    <th className="py-2.5 px-3 text-center">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border-subtle">
                  {history.length === 0 ? (
                    <tr>
                      <td colSpan={10} className="py-8 text-center text-text-muted italic">
                        Belum ada riwayat shift yang tersimpan.
                      </td>
                    </tr>
                  ) : (
                    history.map((s) => {
                      const sid = s.shiftId || s.id || s.shiftNumber;
                      const isShiftOpen = !s.endTime || s.status === 'Open';
                      const diff = s.cashDiscrepancy ?? s.discrepancy ?? 0;
                      return (
                        <tr key={sid} className="hover:bg-subtle/50 transition-colors">
                          <td className="py-2.5 px-3 font-mono font-bold text-text-primary">
                            {s.shiftNumber}
                            {isShiftOpen && (
                              <span className="ml-1.5 px-1.5 py-0.5 rounded text-[9px] bg-emerald-500/20 text-emerald-600 font-semibold">
                                AKTIF
                              </span>
                            )}
                          </td>
                          <td className="py-2.5 px-3 font-semibold text-text-primary">
                            {s.cashierName}
                          </td>
                          <td className="py-2.5 px-3 text-text-muted text-[11px]">
                            <div>{new Date(s.startTime).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}</div>
                            <div className="font-mono text-[10px]">
                              {new Date(s.startTime).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })} - {s.endTime ? new Date(s.endTime).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) : 'Sekarang'}
                            </div>
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono">
                            Rp {s.startingCash.toLocaleString('id-ID')}
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono text-emerald-600">
                            Rp {s.totalCashSales.toLocaleString('id-ID')}
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono text-blue-600">
                            Rp {s.totalNonCashSales.toLocaleString('id-ID')}
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono font-bold text-text-primary">
                            Rp {s.expectedCash.toLocaleString('id-ID')}
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono font-bold text-text-primary">
                            {s.actualCashCount != null ? `Rp ${s.actualCashCount.toLocaleString('id-ID')}` : '-'}
                          </td>
                          <td className="py-2.5 px-3 text-center">
                            {isShiftOpen ? (
                              <span className="text-[11px] text-text-muted italic">Belum Dihitung</span>
                            ) : Math.abs(diff) < 0.01 ? (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/15 text-emerald-600 border border-emerald-500/30 inline-flex items-center gap-1">
                                <CheckCircle2 className="w-3 h-3" /> Pas (Rp 0)
                              </span>
                            ) : diff > 0 ? (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/15 text-amber-600 border border-amber-500/30 inline-flex items-center gap-1 font-mono">
                                +Rp {diff.toLocaleString('id-ID')}
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/15 text-rose-600 border border-rose-500/30 inline-flex items-center gap-1 font-mono">
                                -Rp {Math.abs(diff).toLocaleString('id-ID')}
                              </span>
                            )}
                          </td>
                          <td className="py-2.5 px-3 text-center">
                            <div className="flex items-center justify-center gap-1.5">
                              <button
                                onClick={() => handleViewZReport(sid)}
                                title="Lihat Slip Z-Report Thermal"
                                className="p-1.5 rounded-lg hover:bg-card-hover text-text-secondary hover:text-text-primary border border-border-subtle cursor-pointer"
                              >
                                <Eye className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => handlePrintZReportHardware(sid)}
                                title="Cetak Ulang Langsung ke Printer Kasir"
                                className="p-1.5 rounded-lg hover:bg-card-hover text-primary hover:text-primary-hover border border-border-subtle cursor-pointer"
                              >
                                <Printer className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
export default CashierDashboardPage;
