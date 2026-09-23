import React, { useState, useEffect, useMemo } from 'react';
import { 
  Receipt, 
  CheckCircle2, 
  AlertTriangle, 
  AlertCircle, 
  Clock, 
  DollarSign, 
  CreditCard, 
  QrCode, 
  Printer, 
  Eye, 
  Download, 
  RefreshCw, 
  Search, 
  Filter, 
  Smartphone, 
  Laptop, 
  Wifi, 
  Copy, 
  Check, 
  X, 
  ChevronRight, 
  Coins, 
  FileText, 
  ShieldAlert, 
  Sparkles, 
  Info,
  Calendar,
  Layers,
  ArrowUpRight,
  ArrowDownRight,
  HelpCircle,
  TrendingUp,
  User
} from 'lucide-react';
import { useShiftStore } from '../store/useShiftAndThemeStores';
import { useAuthStore } from '../store/useAuthStore';
import { useToastStore } from '../store/useToastStore';
import { QRCodeEncoder } from '../utils/qrCodeGenerator';
import { 
  ShiftHistoryItem, 
  ZReport, 
  ShiftDashboardData, 
  ShiftPaymentBreakdown 
} from '../types';

export const ShiftAuditPage: React.FC = () => {
  const { activeShift, openThermalZReport } = useShiftStore();
  const { currentUser, storeInfo } = useAuthStore();
  const { showToast } = useToastStore();

  const [shifts, setShifts] = useState<ShiftHistoryItem[]>([]);
  const [activeShiftDashboard, setActiveShiftDashboard] = useState<ShiftDashboardData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [dateFilter, setDateFilter] = useState<'today' | 'yesterday' | 'week' | 'month' | 'all'>('week');
  const [statusFilter, setStatusFilter] = useState<'all' | 'balanced' | 'shortage' | 'surplus'>('all');

  // Detail Modal
  const [selectedShiftId, setSelectedShiftId] = useState<string | null>(null);
  const [detailZReport, setDetailZReport] = useState<ZReport | null>(null);
  const [isLoadingDetail, setIsLoadingDetail] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

  // Multi-Device Guide Modal
  const [isGuideModalOpen, setIsGuideModalOpen] = useState(false);
  const [networkInfo, setNetworkInfo] = useState<{ primaryIp: string; port: number; localIps: string[] } | null>(null);
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string>('');
  const [copiedUrl, setCopiedUrl] = useState(false);

  // Fetch shift history and active dashboard
  const fetchAuditData = async () => {
    setIsRefreshing(true);
    try {
      // 1. Shift History
      const histRes = await fetch('/api/v1/shifts/history?limit=100');
      if (histRes.ok) {
        const histData = await histRes.json();
        setShifts(histData);
      }

      // 2. Active Shift Live Dashboard (if any)
      if (activeShift) {
        const liveRes = await fetch('/api/v1/shifts/active/dashboard');
        if (liveRes.ok) {
          const liveData = await liveRes.json();
          setActiveShiftDashboard(liveData);
        }
      } else {
        setActiveShiftDashboard(null);
      }
    } catch (err) {
      console.error('Error fetching audit data:', err);
    } finally {
      setIsRefreshing(false);
      setIsLoading(false);
    }
  };

  useEffect(() => {
    setIsLoading(true);
    fetchAuditData();
  }, [activeShift]);

  // Fetch network info for multi-device pairing
  useEffect(() => {
    fetch('/api/v1/system/network-info')
      .then(res => res.json())
      .then(async (data) => {
        setNetworkInfo(data);
        const hostUrl = `http://${data.primaryIp}:${data.port}`;
        const qr = await QRCodeEncoder.generateDataURL(hostUrl, 240);
        setQrCodeDataUrl(qr);
      })
      .catch(() => {});
  }, []);

  // Filter shifts based on date, search, and status
  const filteredShifts = useMemo(() => {
    const now = new Date();
    const todayMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterdayMidnight = new Date(todayMidnight.getTime() - 24 * 60 * 60 * 1000);
    const weekAgoMidnight = new Date(todayMidnight.getTime() - 7 * 24 * 60 * 60 * 1000);
    const monthAgoMidnight = new Date(todayMidnight.getTime() - 30 * 24 * 60 * 60 * 1000);

    return shifts.filter(s => {
      const shiftDate = new Date(s.startTime);

      // Date filtering
      if (dateFilter === 'today' && shiftDate < todayMidnight) return false;
      if (dateFilter === 'yesterday') {
        if (shiftDate < yesterdayMidnight || shiftDate >= todayMidnight) return false;
      }
      if (dateFilter === 'week' && shiftDate < weekAgoMidnight) return false;
      if (dateFilter === 'month' && shiftDate < monthAgoMidnight) return false;

      // Status (discrepancy) filtering
      const diff = s.cashDiscrepancy ?? s.discrepancy ?? 0;
      if (statusFilter === 'balanced' && Math.abs(diff) >= 0.01) return false;
      if (statusFilter === 'shortage' && diff >= -0.01) return false;
      if (statusFilter === 'surplus' && diff <= 0.01) return false;

      // Search query (Cashier name or shift number)
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchNum = s.shiftNumber.toLowerCase().includes(q);
        const matchName = s.cashierName.toLowerCase().includes(q);
        const matchNotes = (s.closingNotes || '').toLowerCase().includes(q);
        if (!matchNum && !matchName && !matchNotes) return false;
      }

      return true;
    });
  }, [shifts, dateFilter, statusFilter, searchQuery]);

  // Aggregate KPIs for the filtered list
  const kpis = useMemo(() => {
    let totalActualCash = 0;
    let totalNetSales = 0;
    let totalNonCash = 0;
    let netDiscrepancy = 0;
    let totalDiscrepantShifts = 0;

    filteredShifts.forEach(s => {
      totalActualCash += (s.actualCashCount ?? 0);
      totalNetSales += (s.netSales ?? 0);
      totalNonCash += (s.totalNonCashSales ?? 0);
      const diff = s.cashDiscrepancy ?? s.discrepancy ?? 0;
      netDiscrepancy += diff;
      if (Math.abs(diff) > 0.01) totalDiscrepantShifts += 1;
    });

    return {
      totalActualCash,
      totalNetSales,
      totalNonCash,
      netDiscrepancy,
      totalDiscrepantShifts,
      totalShiftsCount: filteredShifts.length
    };
  }, [filteredShifts]);

  // Handle open shift detail
  const handleOpenDetail = async (shiftId: string) => {
    setSelectedShiftId(shiftId);
    setIsLoadingDetail(true);
    setIsDetailModalOpen(true);
    try {
      const res = await fetch(`/api/v1/shifts/${shiftId}/z-report`);
      if (res.ok) {
        const data = await res.json();
        setDetailZReport(data);
      } else {
        showToast('Gagal memuat rincian laporan Z-Report.', 'error');
        setIsDetailModalOpen(false);
      }
    } catch (err) {
      showToast('Terjadi kesalahan saat memuat data shift.', 'error');
      setIsDetailModalOpen(false);
    } finally {
      setIsLoadingDetail(false);
    }
  };

  // Direct ESC/POS hardware print
  const handlePrintHardware = async (shiftId: string) => {
    try {
      const res = await fetch(`/api/v1/shifts/${shiftId}/print-zreport`, { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        showToast('Struk Z-Report berhasil dikirim ke printer kasir thermal!', 'success');
      } else {
        showToast(data.message || 'Printer fisik tidak terhubung.', 'warning');
      }
    } catch (err) {
      showToast('Gagal mencetak struk ke printer.', 'error');
    }
  };

  // Export CSV
  const handleExportCsv = () => {
    window.location.href = '/api/v1/shifts/export-csv';
  };

  // Copy local server URL
  const handleCopyUrl = () => {
    if (!networkInfo) return;
    const url = `http://${networkInfo.primaryIp}:${networkInfo.port}`;
    navigator.clipboard.writeText(url);
    setCopiedUrl(true);
    showToast('Alamat URL berhasil disalin!', 'success');
    setTimeout(() => setCopiedUrl(false), 2000);
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-app overflow-y-auto">
      {/* 1. Header Section */}
      <div className="p-6 bg-surface border-b border-border-subtle shrink-0">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-primary/10 border border-primary/20 rounded-xl text-primary">
              <Receipt className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-black text-text-primary tracking-tight">
                  Audit & Riwayat Shift Kasir
                </h1>
                <span className="px-2 py-0.5 text-[10px] font-extrabold uppercase rounded-full bg-primary/10 text-primary border border-primary/20">
                  Admin & Keuangan
                </span>
              </div>
              <p className="text-xs text-text-secondary mt-0.5">
                Pusat rekonsiliasi kas laci fisik, analisis selisih kasir (*variance*), dan arsip laporan Z-Report.
              </p>
            </div>
          </div>

          <div className="flex items-center flex-wrap gap-2">
            <button
              onClick={() => setIsGuideModalOpen(true)}
              className="px-3 py-2 rounded-lg bg-subtle hover:bg-card-hover border border-border-subtle text-text-secondary hover:text-text-primary text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
              title="Panduan Alur Toko 1 PC & Akses Jarak Jauh dari HP"
            >
              <Smartphone className="w-3.5 h-3.5 text-primary" />
              <span>Akses HP / Multi-Device</span>
            </button>

            <button
              onClick={handleExportCsv}
              className="px-3 py-2 rounded-lg bg-subtle hover:bg-card-hover border border-border-subtle text-text-secondary hover:text-text-primary text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
              title="Ekspor Seluruh Riwayat Shift ke Excel / CSV"
            >
              <Download className="w-3.5 h-3.5 text-emerald-500" />
              <span>Ekspor CSV</span>
            </button>

            <button
              onClick={fetchAuditData}
              disabled={isRefreshing}
              className="px-3 py-2 rounded-lg bg-primary hover:bg-primary-hover text-primary-text text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer shadow-sm disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
              <span>{isRefreshing ? 'Memuat...' : 'Segarkan Data'}</span>
            </button>
          </div>
        </div>
      </div>

      <div className="p-6 space-y-6 max-w-7xl mx-auto w-full">
        {/* 2. Educational Alur Toko 1 PC Banner */}
        <div className="p-4 rounded-xl bg-gradient-to-r from-primary/5 via-subtle to-subtle border border-primary/20 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-lg bg-primary/10 text-primary mt-0.5">
              <Info className="w-4 h-4" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-text-primary">
                Alur Operasional & Audit Kasir (Sistem 1 PC)
              </h4>
              <p className="text-[11px] text-text-secondary mt-0.5 leading-relaxed">
                Pada sistem 1 PC, kasir bertugas melayani transaksi di menu <strong>Kasir (POS)</strong> dan melakukan penutupan shift saat jam kerja selesai. Admin/Owner melakukan verifikasi fisik uang setoran kasir dan audit selisih di halaman ini setelah shift ditutup.
              </p>
            </div>
          </div>
          <button
            onClick={() => setIsGuideModalOpen(true)}
            className="shrink-0 px-3 py-1.5 rounded-lg bg-surface border border-primary/30 hover:border-primary text-primary text-[11px] font-bold flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
          >
            <Wifi className="w-3.5 h-3.5" />
            <span>Cara Pantau Live dari HP</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* 3. Live Active Shift Snapshot (Supervisor Read-Only Monitoring) */}
        {activeShift ? (
          <div className="p-5 rounded-2xl bg-surface border border-emerald-500/30 shadow-sm relative overflow-hidden">
            <div className="absolute top-0 right-0 left-0 h-1 bg-emerald-500" />
            
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-border-subtle">
              <div className="flex items-center gap-3">
                <div className="relative">
                  <span className="w-3.5 h-3.5 rounded-full bg-emerald-500 inline-block animate-ping absolute inset-0" />
                  <span className="w-3.5 h-3.5 rounded-full bg-emerald-500 inline-block relative" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-extrabold text-text-primary">
                      Shift Kasir Sedang Berjalan (Status Live)
                    </h3>
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
                      Terminal POS Aktif
                    </span>
                  </div>
                  <p className="text-[11px] text-text-muted mt-0.5">
                    Kasir bertugas: <strong className="text-text-primary">{activeShift.cashierName}</strong> &bull; No: <span className="font-mono">{activeShift.shiftNumber}</span> &bull; Dibuka: {new Date(activeShift.startTime).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })} ({Math.round((Date.now() - new Date(activeShift.startTime).getTime()) / 60000)} menit lalu)
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span className="px-3 py-1 rounded-lg bg-subtle text-text-secondary text-xs font-semibold border border-border-subtle">
                  Mode Pengawas (Read-Only)
                </span>
              </div>
            </div>

            {/* Live Metrics Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mt-4">
              <div className="p-3 rounded-xl bg-subtle border border-border-subtle">
                <span className="text-[10px] text-text-muted uppercase font-bold tracking-wider">Modal Awal Kasir</span>
                <p className="text-sm font-bold text-text-primary font-mono mt-1">
                  Rp {activeShift.startingCash.toLocaleString('id-ID')}
                </p>
              </div>

              <div className="p-3 rounded-xl bg-subtle border border-border-subtle">
                <span className="text-[10px] text-text-muted uppercase font-bold tracking-wider">Penjualan Tunai</span>
                <p className="text-sm font-bold text-emerald-600 font-mono mt-1">
                  Rp {(activeShiftDashboard?.totalCashSales ?? activeShift.totalCashSales).toLocaleString('id-ID')}
                </p>
              </div>

              <div className="p-3 rounded-xl bg-subtle border border-border-subtle">
                <span className="text-[10px] text-text-muted uppercase font-bold tracking-wider">Penjualan Non-Tunai</span>
                <p className="text-sm font-bold text-blue-600 font-mono mt-1">
                  Rp {(activeShiftDashboard?.totalNonCashSales ?? activeShift.totalNonCashSales).toLocaleString('id-ID')}
                </p>
              </div>

              <div className="p-3 rounded-xl bg-subtle border border-border-subtle">
                <span className="text-[10px] text-text-muted uppercase font-bold tracking-wider">Petty Cash Net (In/Out)</span>
                <p className="text-sm font-bold text-text-primary font-mono mt-1">
                  +Rp {(activeShiftDashboard?.totalCashIn ?? activeShift.totalCashIn ?? 0).toLocaleString('id-ID')} / -Rp {(activeShiftDashboard?.totalCashOut ?? activeShift.totalCashOut ?? 0).toLocaleString('id-ID')}
                </p>
              </div>

              <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30">
                <span className="text-[10px] text-emerald-700 dark:text-emerald-300 uppercase font-bold tracking-wider">Perkiraan Kas di Laci</span>
                <p className="text-base font-black text-emerald-600 dark:text-emerald-400 font-mono mt-0.5">
                  Rp {(activeShiftDashboard?.expectedCash ?? activeShift.expectedCash).toLocaleString('id-ID')}
                </p>
              </div>
            </div>
          </div>
        ) : (
          <div className="p-4 rounded-xl bg-surface border border-border-subtle flex items-center justify-between text-xs text-text-muted">
            <div className="flex items-center gap-2.5">
              <span className="w-2.5 h-2.5 rounded-full bg-slate-400" />
              <span>Tidak ada kasir yang sedang aktif bertugas saat ini. Seluruh shift tercatat telah ditutup.</span>
            </div>
            <span className="font-semibold text-text-secondary">Laci Kasir: Tertutup</span>
          </div>
        )}

        {/* 4. Executive KPI Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          <div className="p-4 rounded-xl bg-surface border border-border-subtle shadow-sm">
            <div className="flex items-center justify-between text-text-muted mb-2">
              <span className="text-xs font-semibold">Total Setoran Kas Fisik</span>
              <DollarSign className="w-4 h-4 text-emerald-500" />
            </div>
            <p className="text-lg font-extrabold text-text-primary font-mono">
              Rp {kpis.totalActualCash.toLocaleString('id-ID')}
            </p>
            <span className="text-[10px] text-text-muted mt-1 block">Uang aktual dihitung kasir</span>
          </div>

          <div className="p-4 rounded-xl bg-surface border border-border-subtle shadow-sm">
            <div className="flex items-center justify-between text-text-muted mb-2">
              <span className="text-xs font-semibold">Total Omset Bersih</span>
              <TrendingUp className="w-4 h-4 text-primary" />
            </div>
            <p className="text-lg font-extrabold text-primary font-mono">
              Rp {kpis.totalNetSales.toLocaleString('id-ID')}
            </p>
            <span className="text-[10px] text-text-muted mt-1 block">Gabungan tunai & non-tunai</span>
          </div>

          <div className="p-4 rounded-xl bg-surface border border-border-subtle shadow-sm">
            <div className="flex items-center justify-between text-text-muted mb-2">
              <span className="text-xs font-semibold">Penerimaan Non-Tunai</span>
              <CreditCard className="w-4 h-4 text-blue-500" />
            </div>
            <p className="text-lg font-extrabold text-blue-600 font-mono">
              Rp {kpis.totalNonCash.toLocaleString('id-ID')}
            </p>
            <span className="text-[10px] text-text-muted mt-1 block">QRIS, EDC, Transfer Bank</span>
          </div>

          <div className="p-4 rounded-xl bg-surface border border-border-subtle shadow-sm">
            <div className="flex items-center justify-between text-text-muted mb-2">
              <span className="text-xs font-semibold">Net Selisih Kasir</span>
              {kpis.netDiscrepancy === 0 ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
              ) : kpis.netDiscrepancy < 0 ? (
                <AlertCircle className="w-4 h-4 text-rose-500" />
              ) : (
                <AlertTriangle className="w-4 h-4 text-amber-500" />
              )}
            </div>
            <p className={`text-lg font-extrabold font-mono ${
              kpis.netDiscrepancy === 0 
                ? 'text-emerald-600' 
                : kpis.netDiscrepancy < 0 
                  ? 'text-rose-600' 
                  : 'text-amber-600'
            }`}>
              {kpis.netDiscrepancy > 0 ? '+' : ''}Rp {kpis.netDiscrepancy.toLocaleString('id-ID')}
            </p>
            <span className="text-[10px] text-text-muted mt-1 block">
              {kpis.totalDiscrepantShifts === 0 
                ? 'Semua laci seimbang 100%' 
                : `${kpis.totalDiscrepantShifts} shift berselisih`}
            </span>
          </div>

          <div className="p-4 rounded-xl bg-surface border border-border-subtle shadow-sm">
            <div className="flex items-center justify-between text-text-muted mb-2">
              <span className="text-xs font-semibold">Total Sesi Shift</span>
              <Layers className="w-4 h-4 text-text-muted" />
            </div>
            <p className="text-lg font-extrabold text-text-primary font-mono">
              {kpis.totalShiftsCount} Shift
            </p>
            <span className="text-[10px] text-text-muted mt-1 block">Telah ditutup & diaudit</span>
          </div>
        </div>

        {/* 5. Filter & Toolbar */}
        <div className="p-4 rounded-2xl bg-surface border border-border-subtle space-y-3">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
            {/* Quick Date Range Pills */}
            <div className="flex items-center flex-wrap gap-1.5">
              <span className="text-xs font-bold text-text-muted mr-1 flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5" /> Rentang:
              </span>
              {(['today', 'yesterday', 'week', 'month', 'all'] as const).map((r) => (
                <button
                  key={r}
                  onClick={() => setDateFilter(r)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    dateFilter === r
                      ? 'bg-primary text-primary-text shadow-sm'
                      : 'bg-subtle hover:bg-card-hover text-text-secondary border border-border-subtle'
                  }`}
                >
                  {r === 'today' ? 'Hari Ini'
                    : r === 'yesterday' ? 'Kemarin'
                    : r === 'week' ? '7 Hari Terakhir'
                    : r === 'month' ? '30 Hari Terakhir'
                    : 'Semua'}
                </button>
              ))}
            </div>

            {/* Discrepancy Status Filter */}
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-bold text-text-muted mr-1 flex items-center gap-1">
                <Filter className="w-3.5 h-3.5" /> Status Selisih:
              </span>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as any)}
                className="px-3 py-1.5 bg-subtle border border-border-subtle rounded-lg text-xs font-semibold text-text-primary outline-none focus:border-primary cursor-pointer"
              >
                <option value="all">Semua Status</option>
                <option value="balanced">Pas / Seimbang (Rp 0)</option>
                <option value="shortage">Selisih Kurang (Defisit)</option>
                <option value="surplus">Selisih Lebih (Surplus)</option>
              </select>
            </div>
          </div>

          {/* Search Box */}
          <div className="relative">
            <Search className="w-4 h-4 text-text-muted absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari berdasarkan nama kasir, nomor shift (SFT-...), atau catatan penutupan..."
              className="w-full pl-9 pr-4 py-2 bg-subtle border border-border-subtle rounded-xl text-xs text-text-primary placeholder:text-text-muted outline-none focus:border-primary transition-all"
            />
            {searchQuery && (
              <button 
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* 6. Shift Audit Table */}
        <div className="rounded-2xl bg-surface border border-border-subtle shadow-sm overflow-hidden">
          <div className="p-4 border-b border-border-subtle flex items-center justify-between">
            <div>
              <h3 className="text-sm font-extrabold text-text-primary">Daftar Rekonsiliasi & Audit Shift</h3>
              <p className="text-xs text-text-secondary">
                Menampilkan {filteredShifts.length} dari total {shifts.length} shift tersimpan.
              </p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-border-subtle text-text-muted text-[10px] uppercase tracking-wider bg-subtle/50">
                  <th className="py-3 px-4">No. Shift</th>
                  <th className="py-3 px-4">Kasir</th>
                  <th className="py-3 px-4">Waktu Buka - Tutup</th>
                  <th className="py-3 px-4 text-right">Modal Awal</th>
                  <th className="py-3 px-4 text-right">Penjualan Tunai</th>
                  <th className="py-3 px-4 text-right">Non-Tunai</th>
                  <th className="py-3 px-4 text-right">Kas Diharapkan</th>
                  <th className="py-3 px-4 text-right">Uang Fisik Kasir</th>
                  <th className="py-3 px-4 text-center">Selisih Kas</th>
                  <th className="py-3 px-4 text-center">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-subtle">
                {isLoading ? (
                  <tr>
                    <td colSpan={10} className="py-12 text-center text-text-muted">
                      <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-primary" />
                      <span>Memuat riwayat audit shift...</span>
                    </td>
                  </tr>
                ) : filteredShifts.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="py-12 text-center text-text-muted italic">
                      Tidak ditemukan riwayat shift untuk kriteria filter yang dipilih.
                    </td>
                  </tr>
                ) : (
                  filteredShifts.map((s) => {
                    const diff = s.cashDiscrepancy ?? s.discrepancy ?? 0;
                    const isBalanced = Math.abs(diff) < 0.01;
                    const isShortage = diff < -0.01;
                    const isSurplus = diff > 0.01;

                    return (
                      <tr key={s.shiftId} className="hover:bg-subtle/50 transition-colors">
                        <td className="py-3 px-4 font-mono font-extrabold text-text-primary">
                          {s.shiftNumber}
                        </td>
                        <td className="py-3 px-4 font-bold text-text-primary">
                          <div className="flex items-center gap-2">
                            <div className="w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-[10px]">
                              {s.cashierName.charAt(0).toUpperCase()}
                            </div>
                            <span>{s.cashierName}</span>
                          </div>
                        </td>
                        <td className="py-3 px-4 text-text-muted text-[11px]">
                          <div>{new Date(s.startTime).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}</div>
                          <div className="font-mono text-[10px] text-text-secondary">
                            {new Date(s.startTime).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })} - {s.endTime ? new Date(s.endTime).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) : 'Sekarang'}
                            {s.durationMinutes > 0 && ` (${Math.floor(s.durationMinutes / 60)}j ${s.durationMinutes % 60}m)`}
                          </div>
                        </td>
                        <td className="py-3 px-4 text-right font-mono text-text-secondary">
                          Rp {s.startingCash.toLocaleString('id-ID')}
                        </td>
                        <td className="py-3 px-4 text-right font-mono text-emerald-600 font-semibold">
                          Rp {s.totalCashSales.toLocaleString('id-ID')}
                        </td>
                        <td className="py-3 px-4 text-right font-mono text-blue-600 font-semibold">
                          Rp {s.totalNonCashSales.toLocaleString('id-ID')}
                        </td>
                        <td className="py-3 px-4 text-right font-mono font-bold text-text-primary">
                          Rp {s.expectedCash.toLocaleString('id-ID')}
                        </td>
                        <td className="py-3 px-4 text-right font-mono font-black text-text-primary">
                          {s.actualCashCount != null ? `Rp ${s.actualCashCount.toLocaleString('id-ID')}` : '-'}
                        </td>
                        <td className="py-3 px-4 text-center">
                          {isBalanced ? (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-500/15 text-emerald-600 border border-emerald-500/30 inline-flex items-center gap-1">
                              <CheckCircle2 className="w-3 h-3" /> Pas (Rp 0)
                            </span>
                          ) : isShortage ? (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-rose-500/15 text-rose-600 border border-rose-500/30 inline-flex items-center gap-1 font-mono">
                              <AlertCircle className="w-3 h-3" /> -Rp {Math.abs(diff).toLocaleString('id-ID')}
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-amber-500/15 text-amber-600 border border-amber-500/30 inline-flex items-center gap-1 font-mono">
                              <AlertTriangle className="w-3 h-3" /> +Rp {diff.toLocaleString('id-ID')}
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              onClick={() => handleOpenDetail(s.shiftId)}
                              title="Lihat Rincian Audit Lengkap & Pecahan Uang"
                              className="px-2.5 py-1 rounded-lg bg-subtle hover:bg-card-hover text-text-secondary hover:text-text-primary border border-border-subtle text-xs font-semibold flex items-center gap-1 cursor-pointer transition-colors"
                            >
                              <Eye className="w-3.5 h-3.5 text-primary" />
                              <span>Detail</span>
                            </button>

                            <button
                              onClick={() => handlePrintHardware(s.shiftId)}
                              title="Cetak Struk Z-Report ke Printer Kasir Thermal"
                              className="p-1 rounded-lg hover:bg-card-hover text-text-muted hover:text-primary border border-border-subtle cursor-pointer transition-colors"
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
      </div>

      {/* 7. Modal Drilldown Detail Audit Shift */}
      {isDetailModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-surface border border-border-subtle rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="p-5 border-b border-border-subtle flex items-center justify-between bg-subtle/50">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-primary/10 text-primary">
                  <Receipt className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-text-primary">
                    Detail Audit Shift #{detailZReport?.shiftNumber || selectedShiftId}
                  </h3>
                  <p className="text-xs text-text-secondary">
                    Kasir: <strong>{detailZReport?.cashierName}</strong> &bull; {detailZReport ? new Date(detailZReport.startTime).toLocaleDateString('id-ID', { dateStyle: 'full' }) : ''}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsDetailModalOpen(false)}
                className="p-2 rounded-lg hover:bg-card-hover text-text-muted hover:text-text-primary cursor-pointer transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto space-y-6">
              {isLoadingDetail ? (
                <div className="py-16 text-center text-text-muted">
                  <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-primary" />
                  <p className="text-xs">Memuat data rekonsiliasi shift...</p>
                </div>
              ) : detailZReport ? (
                <>
                  {/* Financial Overview Cards */}
                  <div className="grid grid-cols-3 gap-3">
                    <div className="p-3.5 rounded-xl bg-subtle border border-border-subtle">
                      <span className="text-[10px] text-text-muted uppercase font-bold tracking-wider">Penjualan Kotor</span>
                      <p className="text-sm font-bold text-text-primary font-mono mt-1">
                        Rp {detailZReport.grossSales.toLocaleString('id-ID')}
                      </p>
                    </div>

                    <div className="p-3.5 rounded-xl bg-subtle border border-border-subtle">
                      <span className="text-[10px] text-text-muted uppercase font-bold tracking-wider">Total Diskon</span>
                      <p className="text-sm font-bold text-rose-500 font-mono mt-1">
                        -Rp {detailZReport.totalDiscounts.toLocaleString('id-ID')}
                      </p>
                    </div>

                    <div className="p-3.5 rounded-xl bg-primary/10 border border-primary/20">
                      <span className="text-[10px] text-primary uppercase font-bold tracking-wider">Penjualan Bersih</span>
                      <p className="text-base font-black text-primary font-mono mt-0.5">
                        Rp {detailZReport.netSales.toLocaleString('id-ID')}
                      </p>
                    </div>
                  </div>

                  {/* Cash Drawer Reconciliation */}
                  <div className="p-4 rounded-xl bg-subtle border border-border-subtle space-y-2.5">
                    <h4 className="text-xs font-bold text-text-primary flex items-center gap-1.5">
                      <Coins className="w-4 h-4 text-amber-500" />
                      <span>Rekonsiliasi Kas Laci (Cash Drawer Audit)</span>
                    </h4>

                    <div className="space-y-1.5 text-xs">
                      <div className="flex justify-between text-text-secondary">
                        <span>Modal Awal Kasir</span>
                        <span className="font-mono font-semibold">Rp {detailZReport.startingCash.toLocaleString('id-ID')}</span>
                      </div>
                      <div className="flex justify-between text-text-secondary">
                        <span>Penjualan Tunai Bersih</span>
                        <span className="font-mono font-semibold text-emerald-600">+Rp {detailZReport.totalCashSales.toLocaleString('id-ID')}</span>
                      </div>
                      <div className="flex justify-between text-text-secondary">
                        <span>Kas Masuk Tambahan (Cash In)</span>
                        <span className="font-mono font-semibold text-emerald-600">+Rp {detailZReport.totalCashIn.toLocaleString('id-ID')}</span>
                      </div>
                      <div className="flex justify-between text-text-secondary">
                        <span>Kas Keluar / Petty Cash (Cash Out)</span>
                        <span className="font-mono font-semibold text-rose-600">-Rp {detailZReport.totalCashOut.toLocaleString('id-ID')}</span>
                      </div>
                      <div className="pt-2 border-t border-border-subtle flex justify-between font-bold text-text-primary">
                        <span>Total Kas Diharapkan Sistem</span>
                        <span className="font-mono">Rp {detailZReport.expectedCash.toLocaleString('id-ID')}</span>
                      </div>
                      <div className="flex justify-between font-bold text-text-primary">
                        <span>Uang Fisik Aktual Dihitung Kasir</span>
                        <span className="font-mono text-primary">Rp {detailZReport.actualCashCount.toLocaleString('id-ID')}</span>
                      </div>
                      <div className="pt-1.5 flex justify-between font-black text-xs">
                        <span>Status Selisih (Discrepancy)</span>
                        <span className={`font-mono ${
                          detailZReport.cashDiscrepancy === 0 
                            ? 'text-emerald-600' 
                            : detailZReport.cashDiscrepancy < 0 
                              ? 'text-rose-600' 
                              : 'text-amber-600'
                        }`}>
                          {detailZReport.cashDiscrepancy === 0 
                            ? 'PAS / SEIMBANG (Rp 0)' 
                            : detailZReport.cashDiscrepancy < 0 
                              ? `DEFISIT KURANG (-Rp ${Math.abs(detailZReport.cashDiscrepancy).toLocaleString('id-ID')})`
                              : `SURPLUS LEBIH (+Rp ${detailZReport.cashDiscrepancy.toLocaleString('id-ID')})`}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Cash Denominations (Blind Count breakdown by Cashier) */}
                  {detailZReport.closingCashDenominations && (
                    <div className="p-4 rounded-xl bg-subtle border border-border-subtle space-y-3">
                      <h4 className="text-xs font-bold text-text-primary flex items-center gap-1.5">
                        <FileText className="w-4 h-4 text-blue-500" />
                        <span>Rincian Lembaran Uang Pecahan (Blind Count Kasir)</span>
                      </h4>

                      {(() => {
                        try {
                          const denom = JSON.parse(detailZReport.closingCashDenominations);
                          const items = [
                            { label: 'Rp 100.000', count: denom.c100k || 0, val: (denom.c100k || 0) * 100000 },
                            { label: 'Rp 50.000', count: denom.c50k || 0, val: (denom.c50k || 0) * 50000 },
                            { label: 'Rp 20.000', count: denom.c20k || 0, val: (denom.c20k || 0) * 20000 },
                            { label: 'Rp 10.000', count: denom.c10k || 0, val: (denom.c10k || 0) * 10000 },
                            { label: 'Rp 5.000', count: denom.c5k || 0, val: (denom.c5k || 0) * 5000 },
                            { label: 'Rp 2.000', count: denom.c2k || 0, val: (denom.c2k || 0) * 2000 },
                            { label: 'Rp 1.000', count: denom.c1k || 0, val: (denom.c1k || 0) * 1000 },
                            { label: 'Koin Receh', count: '-', val: denom.coins || 0 },
                          ].filter(x => (typeof x.count === 'number' ? x.count > 0 : x.val > 0));

                          if (items.length === 0) {
                            return <p className="text-xs text-text-muted italic">Kasir menginput nominal total langsung tanpa rincian lembaran.</p>;
                          }

                          return (
                            <div className="grid grid-cols-2 gap-2">
                              {items.map((it, idx) => (
                                <div key={idx} className="p-2 rounded-lg bg-surface border border-border-subtle flex items-center justify-between text-xs">
                                  <span className="font-semibold text-text-primary">{it.label}</span>
                                  <div className="text-right">
                                    <span className="text-[10px] text-text-muted mr-1 font-mono">
                                      {typeof it.count === 'number' ? `x${it.count}` : ''}
                                    </span>
                                    <span className="font-mono font-bold text-text-primary">
                                      Rp {it.val.toLocaleString('id-ID')}
                                    </span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          );
                        } catch {
                          return <p className="text-xs text-text-muted italic">Data pecahan tidak tersedia.</p>;
                        }
                      })()}
                    </div>
                  )}

                  {/* Payment Breakdown */}
                  {detailZReport.payments && detailZReport.payments.length > 0 && (
                    <div className="p-4 rounded-xl bg-subtle border border-border-subtle space-y-2.5">
                      <h4 className="text-xs font-bold text-text-primary flex items-center gap-1.5">
                        <CreditCard className="w-4 h-4 text-primary" />
                        <span>Rincian Pembayaran Masuk</span>
                      </h4>

                      <div className="space-y-1.5 text-xs">
                        {detailZReport.payments.map((p, idx) => (
                          <div key={idx} className="flex justify-between items-center text-text-secondary">
                            <span>{p.method} ({p.count} transaksi)</span>
                            <span className="font-mono font-bold text-text-primary">Rp {p.amount.toLocaleString('id-ID')}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Closing Notes */}
                  {detailZReport.closingNotes && (
                    <div className="p-3.5 rounded-xl bg-subtle border border-border-subtle">
                      <span className="text-[10px] text-text-muted uppercase font-bold tracking-wider">Catatan Kasir:</span>
                      <p className="text-xs text-text-primary italic mt-1">
                        "{detailZReport.closingNotes}"
                      </p>
                    </div>
                  )}
                </>
              ) : null}
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-border-subtle flex items-center justify-between bg-subtle/50">
              <button
                onClick={() => {
                  if (detailZReport) {
                    openThermalZReport(detailZReport);
                  }
                }}
                className="px-3.5 py-2 rounded-xl bg-subtle hover:bg-card-hover border border-border-subtle text-xs font-bold text-text-primary flex items-center gap-1.5 cursor-pointer transition-colors"
              >
                <Eye className="w-3.5 h-3.5 text-primary" />
                <span>Pratinjau Slip Thermal</span>
              </button>

              <div className="flex items-center gap-2">
                {selectedShiftId && (
                  <button
                    onClick={() => handlePrintHardware(selectedShiftId)}
                    className="px-4 py-2 rounded-xl bg-primary hover:bg-primary-hover text-primary-text text-xs font-bold flex items-center gap-1.5 shadow-sm cursor-pointer transition-colors"
                  >
                    <Printer className="w-3.5 h-3.5" />
                    <span>Cetak ke Printer Kasir</span>
                  </button>
                )}
                <button
                  onClick={() => setIsDetailModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-subtle hover:bg-card-hover border border-border-subtle text-xs font-bold text-text-secondary cursor-pointer transition-colors"
                >
                  Tutup
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 8. Modal Panduan Multi-Device / Akses HP untuk Pemilik Toko */}
      {isGuideModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-surface border border-border-subtle rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="p-5 border-b border-border-subtle flex items-center justify-between bg-subtle/50">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-primary/10 text-primary">
                  <Smartphone className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-text-primary">
                    Akses Live Audit dari HP & Laptop
                  </h3>
                  <p className="text-xs text-text-secondary">
                    Pantau kasir tanpa mengganggu komputer kasir utama
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsGuideModalOpen(false)}
                className="p-2 rounded-lg hover:bg-card-hover text-text-muted hover:text-text-primary cursor-pointer transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 space-y-5">
              <div className="p-3.5 rounded-xl bg-primary/5 border border-primary/20 text-xs text-text-secondary leading-relaxed">
                OmniPOS berjalan di atas teknologi <strong>Local Web Server</strong>. Komputer kasir Anda bertindak sebagai server pusat yang dapat diakses secara langsung oleh HP, Tablet, atau Laptop pribadi pemilik toko melalui jaringan Wi-Fi toko yang sama!
              </div>

              {/* QR Code & URL Box */}
              <div className="flex flex-col items-center justify-center p-5 bg-subtle rounded-2xl border border-border-subtle space-y-3">
                {qrCodeDataUrl ? (
                  <div className="p-2 bg-white rounded-xl shadow-sm">
                    <img src={qrCodeDataUrl} alt="QR Code Server" className="w-40 h-40" />
                  </div>
                ) : (
                  <div className="w-40 h-40 bg-subtle flex items-center justify-center text-text-muted text-xs">
                    Membuat QR Code...
                  </div>
                )}

                <div className="text-center space-y-1">
                  <span className="text-[10px] uppercase tracking-wider font-bold text-text-muted">
                    Alamat Server Toko Anda:
                  </span>
                  <div className="flex items-center gap-2">
                    <code className="px-3 py-1.5 rounded-lg bg-surface border border-border-subtle text-xs font-mono font-bold text-primary">
                      {networkInfo ? `http://${networkInfo.primaryIp}:${networkInfo.port}` : 'Memuat IP...'}
                    </code>
                    <button
                      onClick={handleCopyUrl}
                      className="p-1.5 rounded-lg bg-surface hover:bg-card-hover border border-border-subtle text-text-secondary hover:text-text-primary transition-colors cursor-pointer"
                      title="Salin Alamat URL"
                    >
                      {copiedUrl ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              </div>

              {/* Step-by-Step Instructions */}
              <div className="space-y-2 text-xs">
                <h4 className="font-bold text-text-primary">Langkah Menghubungkan HP Pemilik:</h4>
                <ol className="list-decimal list-inside space-y-1 text-text-secondary">
                  <li>Pastikan HP / Laptop terhubung ke <strong>Wi-Fi toko yang sama</strong> dengan komputer kasir.</li>
                  <li>Buka aplikasi kamera di HP dan <strong>scan QR Code</strong> di atas (atau ketik URL di browser Chrome/Safari).</li>
                  <li>Login menggunakan akun <strong>Admin / Owner</strong>.</li>
                  <li>Buka menu <strong>Audit & Riwayat Shift</strong> atau <strong>Dashboard Kasir</strong> untuk memantau live audit secara real-time!</li>
                </ol>
              </div>
            </div>

            <div className="p-4 border-t border-border-subtle bg-subtle/50 flex justify-end">
              <button
                onClick={() => setIsGuideModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-primary text-primary-text text-xs font-bold shadow-sm cursor-pointer"
              >
                Saya Mengerti
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
export default ShiftAuditPage;
