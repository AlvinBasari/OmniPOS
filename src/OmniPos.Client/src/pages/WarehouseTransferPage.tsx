import React, { useState, useEffect } from 'react';
import { 
  Truck, 
  Building2, 
  Boxes, 
  Plus, 
  Search, 
  Filter, 
  Printer, 
  ClipboardCheck, 
  Send, 
  RotateCcw, 
  Trash2, 
  AlertTriangle, 
  CheckCircle2, 
  Clock, 
  ArrowRight, 
  RefreshCw, 
  DollarSign, 
  ShieldCheck, 
  ChevronRight,
  Package,
  Layers,
  Check,
  Edit2
} from 'lucide-react';
import { 
  Warehouse, 
  StockTransfer, 
  StockTransferStatus, 
  Product, 
  WarehouseStockMatrixRow 
} from '../types';
import { useToastStore } from '../store/useToastStore';
import { useBusinessModeStore } from '../store/useBusinessModeStore';
import { useAuthStore } from '../store/useAuthStore';
import { WarehouseModal } from '../components/modals/WarehouseModal';
import { StockTransferModal } from '../components/modals/StockTransferModal';
import { StockTransferReceiveModal } from '../components/modals/StockTransferReceiveModal';
import { StockTransferPrintModal } from '../components/modals/StockTransferPrintModal';
import { QuickRebalanceModal } from '../components/modals/QuickRebalanceModal';

export const WarehouseTransferPage: React.FC = () => {
  const { mode } = useBusinessModeStore();
  const { currentUser } = useAuthStore();
  const [activeTab, setActiveTab] = useState<'transfers' | 'warehouses' | 'matrix'>('transfers');
  
  // Data States
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [transfers, setTransfers] = useState<StockTransfer[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [matrixData, setMatrixData] = useState<{ warehouses: any[]; matrix: WarehouseStockMatrixRow[] }>({
    warehouses: [],
    matrix: []
  });
  const [isLoading, setIsLoading] = useState(false);

  // Filters & Searches
  const [transferSearch, setTransferSearch] = useState('');
  const [transferStatusFilter, setTransferStatusFilter] = useState<string>('ALL');
  const [sourceFilter, setSourceFilter] = useState<string>('ALL');
  const [matrixSearch, setMatrixSearch] = useState('');

  // Modals States
  const [isAddWarehouseOpen, setIsAddWarehouseOpen] = useState(false);
  const [warehouseToEdit, setWarehouseToEdit] = useState<Warehouse | null>(null);
  
  const [isAddTransferOpen, setIsAddTransferOpen] = useState(false);
  const [selectedTransferForReceive, setSelectedTransferForReceive] = useState<StockTransfer | null>(null);
  const [selectedTransferForPrint, setSelectedTransferForPrint] = useState<StockTransfer | null>(null);

  const [isQuickRebalanceOpen, setIsQuickRebalanceOpen] = useState(false);
  const [rebalanceInitialProductId, setRebalanceInitialProductId] = useState<string | undefined>(undefined);

  useEffect(() => {
    fetchAllData();
  }, [mode]);

  const fetchAllData = async () => {
    try {
      setIsLoading(true);
      await Promise.all([
        fetchWarehouses(),
        fetchTransfers(),
        fetchProducts(),
        fetchMatrix()
      ]);
    } catch {
      useToastStore.getState().showToast('Gagal memuat data multi-gudang.', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchWarehouses = async () => {
    try {
      const res = await fetch('/api/v1/warehouses');
      if (res.ok) setWarehouses(await res.json());
    } catch {}
  };

  const fetchTransfers = async () => {
    try {
      const res = await fetch('/api/v1/stock-transfers');
      if (res.ok) setTransfers(await res.json());
    } catch {}
  };

  const fetchProducts = async () => {
    try {
      const res = await fetch(`/api/v1/products?mode=${mode}`);
      if (res.ok) setProducts(await res.json());
    } catch {}
  };

  const fetchMatrix = async () => {
    try {
      const res = await fetch(`/api/v1/warehouses/matrix?mode=${mode}`);
      if (res.ok) setMatrixData(await res.json());
    } catch {}
  };

  // Dispatch Action (Draft -> InTransit)
  const handleDispatchTransfer = async (transfer: StockTransfer) => {
    if (!window.confirm(`Berangkatkan surat jalan ${transfer.transferNumber} sekarang? Stok gudang asal akan langsung dipotong.`)) {
      return;
    }

    try {
      const res = await fetch(`/api/v1/stock-transfers/${transfer.id}/dispatch`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          staffName: currentUser?.fullName || 'Staff Logistik'
        })
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || 'Gagal memberangkatkan transfer.');
      }

      useToastStore.getState().showToast(`Surat jalan ${transfer.transferNumber} berhasil diberangkatkan (In-Transit)!`, 'success');
      fetchAllData();
    } catch (err: any) {
      useToastStore.getState().showToast(err.message || 'Terjadi kendala sistem.', 'error');
    }
  };

  // Cancel Transfer Action
  const handleCancelTransfer = async (transfer: StockTransfer) => {
    const reason = window.prompt(`Masukkan alasan pembatalan transfer ${transfer.transferNumber}:`, 'Batal kirim / permintaan cabang');
    if (reason === null) return;

    try {
      const res = await fetch(`/api/v1/stock-transfers/${transfer.id}/cancel`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reason: reason || 'Dibatalkan oleh staf',
          staffName: currentUser?.fullName || 'Staff'
        })
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || 'Gagal membatalkan transfer.');
      }

      useToastStore.getState().showToast(`Transfer ${transfer.transferNumber} berhasil dibatalkan.`, 'info');
      fetchAllData();
    } catch (err: any) {
      useToastStore.getState().showToast(err.message || 'Terjadi kendala sistem.', 'error');
    }
  };

  // Delete Draft Transfer Action
  const handleDeleteTransfer = async (transfer: StockTransfer) => {
    if (!window.confirm(`Hapus dokumen draft transfer ${transfer.transferNumber}?`)) return;

    try {
      const res = await fetch(`/api/v1/stock-transfers/${transfer.id}`, { method: 'DELETE' });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || 'Gagal menghapus transfer.');
      }

      useToastStore.getState().showToast(`Dokumen transfer ${transfer.transferNumber} berhasil dihapus.`, 'info');
      fetchTransfers();
    } catch (err: any) {
      useToastStore.getState().showToast(err.message || 'Terjadi kendala sistem.', 'error');
    }
  };

  // Set Default Warehouse Action
  const handleSetDefaultWarehouse = async (warehouse: Warehouse) => {
    try {
      const res = await fetch(`/api/v1/warehouses/${warehouse.id}/set-default`, { method: 'POST' });
      if (!res.ok) throw new Error('Gagal mengubah gudang utama.');
      useToastStore.getState().showToast(`'${warehouse.name}' kini menjadi gudang utama default.`, 'success');
      fetchWarehouses();
    } catch (err: any) {
      useToastStore.getState().showToast(err.message, 'error');
    }
  };

  // KPI Calculations
  const inTransitCount = transfers.filter(t => t.status === 'InTransit').length;
  const pendingReceiveCount = inTransitCount;
  const discrepancyCount = transfers.filter(t => t.status === 'PartiallyReceived').length;
  const totalTransfersMonth = transfers.length;
  const totalAssetInTransit = transfers
    .filter(t => t.status === 'InTransit')
    .reduce((acc, curr) => acc + curr.totalAssetValue, 0);

  // Filtered Transfers
  const filteredTransfers = transfers.filter(t => {
    const matchStatus = transferStatusFilter === 'ALL' || t.status === transferStatusFilter;
    const matchSource = sourceFilter === 'ALL' || t.sourceWarehouseId === sourceFilter;
    const matchSearch = transferSearch.trim() === '' ||
      t.transferNumber.toLowerCase().includes(transferSearch.toLowerCase()) ||
      t.sourceWarehouseName.toLowerCase().includes(transferSearch.toLowerCase()) ||
      t.destinationWarehouseName.toLowerCase().includes(transferSearch.toLowerCase()) ||
      (t.driverOrCourierName && t.driverOrCourierName.toLowerCase().includes(transferSearch.toLowerCase())) ||
      (t.items && t.items.some(i => i.productName.toLowerCase().includes(transferSearch.toLowerCase())));
    return matchStatus && matchSource && matchSearch;
  });

  // Filtered Matrix Rows
  const filteredMatrix = matrixData.matrix.filter(row => {
    if (!matrixSearch.trim()) return true;
    const q = matrixSearch.toLowerCase();
    return row.productName.toLowerCase().includes(q) ||
           row.sku.toLowerCase().includes(q) ||
           (row.barcode && row.barcode.toLowerCase().includes(q)) ||
           row.categoryName.toLowerCase().includes(q);
  });

  return (
    <div className="flex-1 flex flex-col h-full bg-app overflow-hidden font-sans select-none">
      {/* Top Header & Tab Navigation Bar */}
      <header className="px-6 py-4 bg-surface border-b border-border-subtle flex flex-col sm:flex-row sm:items-center justify-between gap-4 shrink-0 shadow-2xs">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-primary/10 text-primary flex items-center justify-center font-bold shadow-xs">
            <Truck className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base font-extrabold text-text-primary tracking-tight">
                Multi-Gudang & Transfer Stok Cabang
              </h1>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/15 text-status-success font-bold font-mono">
                {warehouses.length} Lokasi Aktif
              </span>
            </div>
            <p className="text-xs text-text-secondary">
              Manajemen titik simpan, surat jalan mutasi barang, dan verifikasi fisik penerimaan
            </p>
          </div>
        </div>

        {/* Tab Switcher */}
        <div className="flex bg-card p-1 rounded-xl border border-border-subtle text-xs font-bold shadow-2xs">
          <button
            onClick={() => setActiveTab('transfers')}
            className={`px-3.5 py-1.5 rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'transfers'
                ? 'bg-primary text-white shadow-sm'
                : 'text-text-secondary hover:text-text-primary'
            }`}
          >
            <Truck className="w-4 h-4" />
            <span>Surat Jalan & Transfer</span>
            {inTransitCount > 0 && (
              <span className="px-1.5 py-0.2 rounded-full text-[9px] bg-amber-500 text-white font-black animate-pulse">
                {inTransitCount}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('warehouses')}
            className={`px-3.5 py-1.5 rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'warehouses'
                ? 'bg-primary text-white shadow-sm'
                : 'text-text-secondary hover:text-text-primary'
            }`}
          >
            <Building2 className="w-4 h-4" />
            <span>Master Gudang & Lokasi</span>
          </button>

          <button
            onClick={() => setActiveTab('matrix')}
            className={`px-3.5 py-1.5 rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'matrix'
                ? 'bg-primary text-white shadow-sm'
                : 'text-text-secondary hover:text-text-primary'
            }`}
          >
            <Boxes className="w-4 h-4" />
            <span>Matriks Sebaran Stok</span>
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto p-6 space-y-5">
        {/* TAB 1: SURAT JALAN & TRANSFER STOK */}
        {activeTab === 'transfers' && (
          <div className="space-y-5">
            {/* 4 KPI Telemetry Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Card 1: Total Transfer */}
              <div className="p-4 rounded-2xl bg-card border border-border-subtle shadow-2xs space-y-1">
                <div className="flex items-center justify-between text-text-muted">
                  <span className="text-xs font-semibold">Total Mutasi Transfer</span>
                  <Truck className="w-4 h-4 text-primary" />
                </div>
                <div className="flex items-baseline justify-between">
                  <span className="text-2xl font-black font-mono text-text-primary">
                    {totalTransfersMonth}
                  </span>
                  <span className="text-[11px] text-text-muted">Dokumen</span>
                </div>
                <p className="text-[10px] text-text-secondary">Rekapitulasi perpindahan inventori</p>
              </div>

              {/* Card 2: In-Transit */}
              <div className="p-4 rounded-2xl bg-card border border-amber-500/30 bg-amber-500/5 shadow-2xs space-y-1">
                <div className="flex items-center justify-between text-amber-700 dark:text-amber-400">
                  <span className="text-xs font-bold">Sedang Dalam Perjalanan</span>
                  <Clock className="w-4 h-4" />
                </div>
                <div className="flex items-baseline justify-between">
                  <span className="text-2xl font-black font-mono text-amber-700 dark:text-amber-300">
                    {inTransitCount}
                  </span>
                  <span className="text-[10px] font-mono font-bold text-amber-700 dark:text-amber-400">
                    Rp {totalAssetInTransit.toLocaleString('id-ID')}
                  </span>
                </div>
                <p className="text-[10px] text-text-secondary">Menunggu verifikasi fisik tiba di tujuan</p>
              </div>

              {/* Card 3: Completed Transfers */}
              <div className="p-4 rounded-2xl bg-card border border-emerald-500/30 bg-emerald-500/5 shadow-2xs space-y-1">
                <div className="flex items-center justify-between text-status-success">
                  <span className="text-xs font-bold">Selesai & Diterima Cocok</span>
                  <CheckCircle2 className="w-4 h-4" />
                </div>
                <div className="flex items-baseline justify-between">
                  <span className="text-2xl font-black font-mono text-status-success">
                    {transfers.filter(t => t.status === 'Received').length}
                  </span>
                  <span className="text-[11px] text-status-success font-semibold">100% Match</span>
                </div>
                <p className="text-[10px] text-text-secondary">Kuantitas fisik cocok dengan surat jalan</p>
              </div>

              {/* Card 4: Discrepancy Alerts */}
              <div className="p-4 rounded-2xl bg-card border border-rose-500/30 bg-rose-500/5 shadow-2xs space-y-1">
                <div className="flex items-center justify-between text-status-danger">
                  <span className="text-xs font-bold">Kasus Selisih / Rusak</span>
                  <AlertTriangle className="w-4 h-4" />
                </div>
                <div className="flex items-baseline justify-between">
                  <span className="text-2xl font-black font-mono text-status-danger">
                    {discrepancyCount}
                  </span>
                  <span className="text-[11px] text-status-danger font-semibold">Perlu Audit</span>
                </div>
                <p className="text-[10px] text-text-secondary">Barang kurang/rusak saat di perjalanan</p>
              </div>
            </div>

            {/* Toolbar & Filters */}
            <div className="p-4 bg-surface border border-border-subtle rounded-2xl flex flex-col md:flex-row items-center justify-between gap-3 shadow-2xs">
              <div className="flex flex-1 items-center gap-3 w-full md:w-auto">
                {/* Search */}
                <div className="relative flex-1 max-w-sm">
                  <Search className="w-4 h-4 text-text-muted absolute left-3 top-2.5" />
                  <input
                    type="text"
                    value={transferSearch}
                    onChange={(e) => setTransferSearch(e.target.value)}
                    placeholder="Cari no. transfer, gudang, kurir, atau nama item..."
                    className="w-full pl-9 pr-3 py-2 rounded-xl bg-card border border-border-strong text-xs text-text-primary focus:outline-none focus:border-primary"
                  />
                </div>

                {/* Status Filter */}
                <select
                  value={transferStatusFilter}
                  onChange={(e) => setTransferStatusFilter(e.target.value)}
                  className="px-3 py-2 rounded-xl bg-card border border-border-strong text-xs font-bold text-text-primary focus:outline-none focus:border-primary cursor-pointer"
                >
                  <option value="ALL">Semua Status</option>
                  <option value="Draft">Draft (Belum Kirim)</option>
                  <option value="InTransit">Dalam Perjalanan (In-Transit)</option>
                  <option value="Received">Selesai (Diterima Cocok)</option>
                  <option value="PartiallyReceived">Ada Selisih (Discrepancy)</option>
                  <option value="Cancelled">Dibatalkan</option>
                </select>

                {/* Warehouse Filter */}
                <select
                  value={sourceFilter}
                  onChange={(e) => setSourceFilter(e.target.value)}
                  className="px-3 py-2 rounded-xl bg-card border border-border-strong text-xs font-bold text-text-primary focus:outline-none focus:border-primary cursor-pointer hidden lg:block"
                >
                  <option value="ALL">Semua Gudang Asal</option>
                  {warehouses.map(w => (
                    <option key={w.id} value={w.id}>{w.code} - {w.name}</option>
                  ))}
                </select>
              </div>

              {/* Add Transfer Button */}
              <div className="flex items-center gap-2 w-full md:w-auto justify-end">
                <button
                  onClick={() => setIsAddTransferOpen(true)}
                  className="px-4 py-2 rounded-xl bg-primary hover:bg-primary-hover text-primary-text font-bold text-xs flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>Buat Surat Jalan Transfer Baru</span>
                </button>
              </div>
            </div>

            {/* Transfer List Table */}
            <div className="rounded-2xl border border-border-subtle bg-surface overflow-hidden shadow-2xs">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-subtle border-b border-border-subtle text-text-secondary font-bold">
                    <tr>
                      <th className="py-3 px-4">No. Surat Jalan</th>
                      <th className="py-3 px-4">Rute Transfer (Asal ➔ Tujuan)</th>
                      <th className="py-3 px-4">Tanggal & Ekspedisi</th>
                      <th className="py-3 px-4 text-center">Total Kuantitas</th>
                      <th className="py-3 px-4 text-right">Nilai Aset</th>
                      <th className="py-3 px-4 text-center">Status</th>
                      <th className="py-3 px-4 text-right">Aksi Operasional</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border-subtle/60">
                    {filteredTransfers.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="py-12 text-center text-text-muted">
                          <Truck className="w-9 h-9 mx-auto mb-2 opacity-30" />
                          <p className="font-bold">Tidak ada data transfer stok yang cocok.</p>
                          <p className="text-[11px]">Gunakan tombol di atas untuk membuat surat jalan transfer antar cabang.</p>
                        </td>
                      </tr>
                    ) : (
                      filteredTransfers.map((t) => {
                        const statusBadge = t.status === 'Received' ? (
                          <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-500/15 text-status-success inline-flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3" /> Selesai Diterima
                          </span>
                        ) : t.status === 'InTransit' ? (
                          <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-500/15 text-amber-700 dark:text-amber-400 inline-flex items-center gap-1 animate-pulse">
                            <Truck className="w-3 h-3" /> Dalam Perjalanan
                          </span>
                        ) : t.status === 'PartiallyReceived' ? (
                          <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-rose-500/15 text-status-danger inline-flex items-center gap-1">
                            <AlertTriangle className="w-3 h-3" /> Ada Selisih
                          </span>
                        ) : t.status === 'Cancelled' ? (
                          <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-subtle text-text-muted">
                            Dibatalkan
                          </span>
                        ) : (
                          <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-blue-500/15 text-blue-700 dark:text-blue-400">
                            Draft
                          </span>
                        );

                        return (
                          <tr key={t.id} className="hover:bg-card-hover/40 transition-colors">
                            {/* Document Number */}
                            <td className="py-3 px-4">
                              <p className="font-mono font-bold text-primary">{t.transferNumber}</p>
                              <p className="text-[10px] text-text-muted">{t.items?.length || 0} Variasi Barang</p>
                            </td>

                            {/* Route */}
                            <td className="py-3 px-4">
                              <div className="flex items-center gap-1.5">
                                <span className="font-bold text-text-primary">{t.sourceWarehouseName}</span>
                                <ArrowRight className="w-3.5 h-3.5 text-text-muted shrink-0" />
                                <span className="font-bold text-text-primary">{t.destinationWarehouseName}</span>
                              </div>
                              {t.notes && (
                                <p className="text-[10px] text-text-secondary truncate max-w-xs mt-0.5">{t.notes}</p>
                              )}
                            </td>

                            {/* Logistics info */}
                            <td className="py-3 px-4">
                              <p className="text-text-primary font-medium">
                                {new Date(t.transferDate).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                              </p>
                              <p className="text-[10px] text-text-muted">
                                {t.driverOrCourierName || 'Kurir Internal'} {t.vehicleNumber ? `· ${t.vehicleNumber}` : ''}
                              </p>
                            </td>

                            {/* Quantities */}
                            <td className="py-3 px-4 text-center font-mono">
                              <div className="font-bold text-text-primary text-xs">
                                {t.totalQuantitySent} Unit
                              </div>
                              {(t.status === 'Received' || t.status === 'PartiallyReceived') && (
                                <p className={`text-[10px] ${t.totalQuantityReceived === t.totalQuantitySent ? 'text-status-success' : 'text-status-danger font-bold'}`}>
                                  Terima: {t.totalQuantityReceived} Unit
                                </p>
                              )}
                            </td>

                            {/* Asset Value */}
                            <td className="py-3 px-4 text-right font-mono font-bold text-text-primary">
                              Rp {t.totalAssetValue.toLocaleString('id-ID')}
                            </td>

                            {/* Status */}
                            <td className="py-3 px-4 text-center">
                              {statusBadge}
                            </td>

                            {/* Operations */}
                            <td className="py-3 px-4 text-right">
                              <div className="flex items-center justify-end gap-1.5">
                                {/* Dispatch Button (for Draft) */}
                                {t.status === 'Draft' && (
                                  <button
                                    onClick={() => handleDispatchTransfer(t)}
                                    className="px-2.5 py-1 rounded-lg bg-primary hover:bg-primary-hover text-primary-text font-bold text-[11px] flex items-center gap-1 transition-all cursor-pointer"
                                    title="Berangkatkan surat jalan (potong stok gudang asal)"
                                  >
                                    <Send className="w-3 h-3" />
                                    <span>Kirim</span>
                                  </button>
                                )}

                                {/* Receive & Verify Button (for InTransit) */}
                                {t.status === 'InTransit' && (
                                  <button
                                    onClick={() => setSelectedTransferForReceive(t)}
                                    className="px-2.5 py-1 rounded-lg bg-status-success hover:bg-emerald-600 text-white font-bold text-[11px] flex items-center gap-1 shadow-xs transition-all cursor-pointer"
                                    title="Verifikasi fisik barang yang tiba di gudang tujuan"
                                  >
                                    <ClipboardCheck className="w-3 h-3" />
                                    <span>Verifikasi Terima</span>
                                  </button>
                                )}

                                {/* Print Surat Jalan A4 / Thermal */}
                                <button
                                  onClick={() => setSelectedTransferForPrint(t)}
                                  className="p-1.5 rounded-lg bg-subtle hover:bg-card-hover border border-border-subtle text-text-secondary hover:text-text-primary transition-colors cursor-pointer"
                                  title="Cetak Surat Jalan Resmi A4 & Label Koli Thermal"
                                >
                                  <Printer className="w-3.5 h-3.5" />
                                </button>

                                {/* Cancel Transfer */}
                                {(t.status === 'Draft' || t.status === 'InTransit') && (
                                  <button
                                    onClick={() => handleCancelTransfer(t)}
                                    className="p-1.5 rounded-lg bg-subtle hover:bg-status-danger/10 border border-border-subtle text-text-muted hover:text-status-danger transition-colors cursor-pointer"
                                    title="Batalkan transfer & pulihkan stok"
                                  >
                                    <RotateCcw className="w-3.5 h-3.5" />
                                  </button>
                                )}

                                {/* Delete Draft */}
                                {t.status === 'Draft' && (
                                  <button
                                    onClick={() => handleDeleteTransfer(t)}
                                    className="p-1.5 rounded-lg bg-subtle hover:bg-status-danger/10 border border-border-subtle text-text-muted hover:text-status-danger transition-colors cursor-pointer"
                                    title="Hapus draft"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                )}
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
        )}

        {/* TAB 2: MASTER GUDANG & LOKASI CABANG */}
        {activeTab === 'warehouses' && (
          <div className="space-y-5">
            {/* Header with Add Button */}
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-sm font-bold text-text-primary">Daftar Titik Lokasi Inventori & Gudang</h2>
                <p className="text-xs text-text-secondary">Kelola cabang ritel, etalase display toko, dan gudang pusat</p>
              </div>
              <button
                onClick={() => {
                  setWarehouseToEdit(null);
                  setIsAddWarehouseOpen(true);
                }}
                className="px-4 py-2 rounded-xl bg-primary hover:bg-primary-hover text-primary-text font-bold text-xs flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Tambah Gudang / Cabang Baru</span>
              </button>
            </div>

            {/* Warehouse Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {warehouses.map((w) => (
                <div 
                  key={w.id} 
                  className={`p-5 rounded-2xl bg-surface border transition-all flex flex-col justify-between space-y-4 shadow-2xs ${
                    w.isDefault ? 'border-primary/40 ring-2 ring-primary/20' : 'border-border-subtle'
                  }`}
                >
                  <div className="space-y-2.5">
                    {/* Top Badges */}
                    <div className="flex items-center justify-between">
                      <span className="font-mono font-black text-xs px-2 py-0.5 rounded bg-subtle text-text-primary border border-border-subtle">
                        {w.code}
                      </span>
                      {w.isDefault ? (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-primary text-white shadow-2xs flex items-center gap-1">
                          <ShieldCheck className="w-3 h-3" /> Gudang Utama
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/15 text-status-success">
                          Cabang Aktif
                        </span>
                      )}
                    </div>

                    {/* Warehouse Title */}
                    <div>
                      <h3 className="font-extrabold text-sm text-text-primary">{w.name}</h3>
                      <p className="text-[11px] text-text-secondary mt-0.5 truncate">{w.address || 'Alamat belum diatur'}</p>
                    </div>

                    {/* PIC & Phone */}
                    <div className="p-2.5 bg-subtle rounded-xl text-[11px] space-y-1">
                      <p className="text-text-secondary">
                        PIC: <strong className="text-text-primary">{w.picName || '-'}</strong>
                      </p>
                      <p className="text-text-secondary">
                        Telp: <span className="font-mono">{w.phone || '-'}</span>
                      </p>
                    </div>

                    {/* Stock Telemetry Stats */}
                    <div className="grid grid-cols-2 gap-2 pt-1">
                      <div className="p-2 rounded-lg bg-card border border-border-subtle text-center">
                        <p className="text-[10px] text-text-muted">Total Fisik</p>
                        <p className="text-sm font-black font-mono text-text-primary">{w.totalUnits || 0} Unit</p>
                      </div>
                      <div className="p-2 rounded-lg bg-card border border-border-subtle text-center">
                        <p className="text-[10px] text-text-muted">Variasi SKU</p>
                        <p className="text-sm font-black font-mono text-text-primary">{w.activeItemCount || 0} Item</p>
                      </div>
                    </div>

                    {/* Asset Value */}
                    <div className="p-2.5 rounded-xl bg-card border border-border-subtle flex items-center justify-between text-xs">
                      <span className="text-text-secondary font-medium">Nilai Aset Stok:</span>
                      <span className="font-extrabold font-mono text-primary">
                        Rp {(w.totalAssetValue || 0).toLocaleString('id-ID')}
                      </span>
                    </div>
                  </div>

                  {/* Card Actions */}
                  <div className="pt-3 border-t border-border-subtle flex items-center justify-between gap-2">
                    {!w.isDefault && (
                      <button
                        onClick={() => handleSetDefaultWarehouse(w)}
                        className="text-[11px] font-bold text-text-muted hover:text-primary transition-colors cursor-pointer"
                        title="Jadikan lokasi penerimaan default"
                      >
                        Set Utama
                      </button>
                    )}
                    <div className="flex items-center gap-1.5 ml-auto">
                      <button
                        onClick={() => {
                          setWarehouseToEdit(w);
                          setIsAddWarehouseOpen(true);
                        }}
                        className="px-3 py-1.5 rounded-lg bg-subtle hover:bg-card-hover border border-border-subtle text-text-primary font-bold text-[11px] flex items-center gap-1 transition-colors cursor-pointer"
                      >
                        <Edit2 className="w-3 h-3" />
                        <span>Edit</span>
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 3: MATRIKS SEBARAN STOK */}
        {activeTab === 'matrix' && (
          <div className="space-y-5">
            {/* Matrix Toolbar */}
            <div className="p-4 bg-surface border border-border-subtle rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-3 shadow-2xs">
              <div className="relative flex-1 max-w-md w-full">
                <Search className="w-4 h-4 text-text-muted absolute left-3 top-2.5" />
                <input
                  type="text"
                  value={matrixSearch}
                  onChange={(e) => setMatrixSearch(e.target.value)}
                  placeholder="Cari produk di semua gudang..."
                  className="w-full pl-9 pr-3 py-2 rounded-xl bg-card border border-border-strong text-xs text-text-primary focus:outline-none focus:border-primary"
                />
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    setRebalanceInitialProductId(undefined);
                    setIsQuickRebalanceOpen(true);
                  }}
                  className="px-4 py-2 rounded-xl bg-primary hover:bg-primary-hover text-primary-text font-bold text-xs flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
                >
                  <RefreshCw className="w-4 h-4" />
                  <span>Quick Stock Rebalance (Pindah Cepat)</span>
                </button>
              </div>
            </div>

            {/* Matrix Table */}
            <div className="rounded-2xl border border-border-subtle bg-surface overflow-hidden shadow-2xs">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-subtle border-b border-border-subtle text-text-secondary font-bold">
                    <tr>
                      <th className="py-3 px-4 w-12 text-center">No</th>
                      <th className="py-3 px-4">Nama Produk & SKU</th>
                      <th className="py-3 px-4">Kategori</th>
                      <th className="py-3 px-4 text-center bg-primary/5 font-extrabold text-primary">
                        Total Seluruh Toko
                      </th>
                      {matrixData.warehouses.map(wh => (
                        <th key={wh.id} className="py-3 px-4 text-center font-bold">
                          {wh.code} {wh.isDefault ? '(Utama)' : ''}
                        </th>
                      ))}
                      <th className="py-3 px-4 text-right">Nilai Total Aset</th>
                      <th className="py-3 px-4 text-center w-24">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border-subtle/60">
                    {filteredMatrix.length === 0 ? (
                      <tr>
                        <td colSpan={5 + matrixData.warehouses.length} className="py-12 text-center text-text-muted">
                          <Boxes className="w-9 h-9 mx-auto mb-2 opacity-30" />
                          <p className="font-bold">Tidak ada produk yang cocok dengan pencarian matriks.</p>
                        </td>
                      </tr>
                    ) : (
                      filteredMatrix.map((row, idx) => (
                        <tr key={row.productId} className="hover:bg-card-hover/40 transition-colors">
                          <td className="py-2.5 px-4 text-center font-mono text-text-muted">{idx + 1}</td>
                          
                          {/* Product Info */}
                          <td className="py-2.5 px-4">
                            <p className="font-bold text-text-primary">{row.productName}</p>
                            <p className="text-[10px] text-text-muted font-mono">SKU: {row.sku} {row.barcode ? `· ${row.barcode}` : ''}</p>
                          </td>

                          {/* Category */}
                          <td className="py-2.5 px-4 text-text-secondary">
                            {row.categoryName}
                          </td>

                          {/* Central Total Stock */}
                          <td className="py-2.5 px-4 text-center font-mono font-black text-sm bg-primary/5 text-primary">
                            {row.totalStock} {row.unit}
                          </td>

                          {/* Dynamic Warehouse Columns */}
                          {matrixData.warehouses.map(wh => {
                            const whStock = row.warehouseStocks?.[wh.id] ?? 0;
                            const isLow = whStock <= row.minStockAlert && whStock > 0;
                            const isZero = whStock === 0;

                            return (
                              <td key={wh.id} className="py-2.5 px-4 text-center font-mono font-bold">
                                <span className={`px-2 py-0.5 rounded text-[11px] ${
                                  isZero
                                    ? 'bg-subtle text-text-muted opacity-50'
                                    : isLow
                                    ? 'bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-500/30'
                                    : 'bg-emerald-500/10 text-status-success'
                                }`}>
                                  {whStock}
                                </span>
                              </td>
                            );
                          })}

                          {/* Asset Value */}
                          <td className="py-2.5 px-4 text-right font-mono font-bold text-text-primary">
                            Rp {row.totalAssetValue.toLocaleString('id-ID')}
                          </td>

                          {/* Quick Action */}
                          <td className="py-2.5 px-4 text-center">
                            <button
                              onClick={() => {
                                setRebalanceInitialProductId(row.productId);
                                setIsQuickRebalanceOpen(true);
                              }}
                              className="px-2.5 py-1 rounded-lg bg-subtle hover:bg-primary hover:text-white border border-border-subtle font-bold text-[10.5px] transition-all cursor-pointer"
                              title="Pindahkan stok produk ini antar rak/gudang"
                            >
                              Pindah
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* MODALS */}
      {/* 1. Warehouse CRUD Modal */}
      <WarehouseModal
        isOpen={isAddWarehouseOpen}
        onClose={() => setIsAddWarehouseOpen(false)}
        warehouseToEdit={warehouseToEdit}
        onSaved={fetchWarehouses}
      />

      {/* 2. Stock Transfer Create Modal */}
      <StockTransferModal
        isOpen={isAddTransferOpen}
        onClose={() => setIsAddTransferOpen(false)}
        warehouses={warehouses}
        products={products}
        onCreated={fetchAllData}
      />

      {/* 3. Stock Transfer Receive Modal */}
      <StockTransferReceiveModal
        isOpen={!!selectedTransferForReceive}
        onClose={() => setSelectedTransferForReceive(null)}
        transfer={selectedTransferForReceive}
        onReceived={fetchAllData}
      />

      {/* 4. Stock Transfer Print Modal */}
      <StockTransferPrintModal
        isOpen={!!selectedTransferForPrint}
        onClose={() => setSelectedTransferForPrint(null)}
        transfer={selectedTransferForPrint}
      />

      {/* 5. Quick Rebalance Modal */}
      <QuickRebalanceModal
        isOpen={isQuickRebalanceOpen}
        onClose={() => setIsQuickRebalanceOpen(false)}
        warehouses={warehouses}
        products={products}
        initialProductId={rebalanceInitialProductId}
        onRebalanced={fetchAllData}
      />
    </div>
  );
};
