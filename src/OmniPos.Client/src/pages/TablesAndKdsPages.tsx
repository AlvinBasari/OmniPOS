import React, { useState, useEffect } from 'react';
import { 
  UtensilsCrossed, 
  ChefHat, 
  Clock, 
  CheckCircle2, 
  Users, 
  RefreshCw, 
  ArrowRight, 
  ArrowRightLeft,
  Sparkles, 
  AlertTriangle,
  Receipt,
  Plus,
  Flame,
  Check,
  Coffee,
  X,
  Volume2
} from 'lucide-react';
import { DiningTable, FloorPlanArea } from '../types';
import { useCartStore, playScanBeep } from '../store/useCartStore';
import { useToastStore } from '../store/useToastStore';
import { MoveTableModal } from '../components/modals/MoveTableModal';
import { GuestCheckModal, GuestCheckData } from '../components/modals/GuestCheckModal';

// ==========================================
// 1. TABLES PAGE (F&B FLOOR PLAN & TIMERS)
// ==========================================
interface TablesPageProps {
  onSelectTableForOrder: (table: DiningTable) => void;
}

export const TablesPage: React.FC<TablesPageProps> = ({ onSelectTableForOrder }) => {
  const [areas, setAreas] = useState<FloorPlanArea[]>([]);
  const [activeAreaId, setActiveAreaId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [isLoading, setIsLoading] = useState(false);

  // Modals State
  const [isMoveModalOpen, setIsMoveModalOpen] = useState(false);
  const [selectedTableForMove, setSelectedTableForMove] = useState<DiningTable | null>(null);

  const [isGuestCheckOpen, setIsGuestCheckOpen] = useState(false);
  const [guestCheckData, setGuestCheckData] = useState<GuestCheckData | null>(null);

  const [isAddTableModalOpen, setIsAddTableModalOpen] = useState(false);
  const [newTableNumber, setNewTableNumber] = useState('');
  const [newTableCapacity, setNewTableCapacity] = useState('4');

  const [isAddAreaModalOpen, setIsAddAreaModalOpen] = useState(false);
  const [newAreaName, setNewAreaName] = useState('');

  useEffect(() => {
    fetchTables();
    const interval = setInterval(fetchTables, 10000);
    return () => clearInterval(interval);
  }, []);

  const fetchTables = async () => {
    try {
      setIsLoading(true);
      const res = await fetch('/api/v1/tables');
      if (res.ok) {
        const data = await res.json();
        setAreas(data);
        if (data.length > 0 && !activeAreaId) {
          setActiveAreaId(data[0].id);
        }
      }
    } catch {
      // Mock tables if server not active
    } finally {
      setIsLoading(false);
    }
  };

  const handleTableStatusToggle = async (table: DiningTable, newStatus: string) => {
    try {
      await fetch(`/api/v1/tables/${table.id}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      fetchTables();
    } catch {
      // Local state update
    }
  };

  const handleOpenGuestCheck = async (table: DiningTable) => {
    try {
      const res = await fetch(`/api/v1/tables/${table.id}/guest-check`);
      if (res.ok) {
        const check = await res.json();
        setGuestCheckData({
          tableNumber: check.tableNumber,
          areaName: check.areaName,
          orderNumber: check.invoiceNumber,
          occupiedSince: check.occupiedSince,
          items: check.items || [],
          subtotal: check.subtotal || 0,
          taxAmount: check.taxAmount || 0,
          serviceChargeAmount: check.serviceChargeAmount || 0,
          totalAmount: check.totalAmount || table.currentBillAmount || 0
        });
        setIsGuestCheckOpen(true);
      } else {
        useToastStore.getState().showToast('Gagal memuat data pra-tagihan meja.', 'error');
      }
    } catch {
      useToastStore.getState().showToast('Gagal menghubungi server.', 'error');
    }
  };

  const handleCreateTable = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTableNumber.trim() || !activeAreaId) return;

    try {
      const res = await fetch('/api/v1/tables', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          areaId: activeAreaId,
          tableNumber: newTableNumber.trim(),
          capacity: parseInt(newTableCapacity, 10) || 4
        })
      });

      if (res.ok) {
        useToastStore.getState().showToast(`Meja ${newTableNumber} berhasil ditambahkan!`, 'success');
        setNewTableNumber('');
        setIsAddTableModalOpen(false);
        fetchTables();
      } else {
        useToastStore.getState().showToast('Gagal menambahkan meja.', 'error');
      }
    } catch {
      useToastStore.getState().showToast('Gagal menghubungi server.', 'error');
    }
  };

  const handleCreateArea = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAreaName.trim()) return;

    try {
      const res = await fetch('/api/v1/tables/areas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newAreaName.trim(),
          sortOrder: areas.length + 1
        })
      });

      if (res.ok) {
        const created = await res.json();
        useToastStore.getState().showToast(`Area ${created.name} berhasil dibuat!`, 'success');
        setNewAreaName('');
        setIsAddAreaModalOpen(false);
        await fetchTables();
        setActiveAreaId(created.id);
      }
    } catch {
      useToastStore.getState().showToast('Gagal menambahkan area.', 'error');
    }
  };

  const currentArea = areas.find((a) => a.id === activeAreaId) || areas[0];

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Available':
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-status-success/15 text-status-success border border-status-success/30">Kosong</span>;
      case 'Occupied':
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-status-danger/15 text-status-danger border border-status-danger/30">Terisi</span>;
      case 'WaitingFood':
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/15 text-amber-600 border border-amber-500/30">Tunggu Masak</span>;
      case 'ReadyToBill':
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-status-info/15 text-status-info border border-status-info/30">Siap Bayar</span>;
      default:
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-subtle text-text-muted">Kotor</span>;
    }
  };

  // Seating duration timer badge
  const renderDurationTimer = (occupiedSince?: string) => {
    if (!occupiedSince) return null;
    const minutes = Math.max(0, Math.floor((Date.now() - new Date(occupiedSince).getTime()) / 60000));
    const isLong = minutes > 60;
    const isMedium = minutes >= 30 && minutes <= 60;

    return (
      <div className={`flex items-center gap-1 text-[10px] font-mono px-2 py-0.5 rounded-full border ${
        isLong
          ? 'bg-rose-500/15 text-rose-600 border-rose-500/30 font-bold animate-pulse'
          : isMedium
          ? 'bg-amber-500/15 text-amber-600 border-amber-500/30 font-bold'
          : 'bg-subtle text-text-secondary border-border-subtle'
      }`}>
        <Clock className="w-3 h-3" />
        <span>{minutes} mnt</span>
      </div>
    );
  };

  // Filter tables by status
  const displayedTables = (currentArea?.tables || []).filter((t) => {
    if (statusFilter === 'ALL') return true;
    return t.status === statusFilter;
  });

  return (
    <div className="flex-1 flex flex-col bg-app overflow-hidden select-none">
      {/* Header & Area Selector */}
      <div className="p-4 bg-surface border-b border-border-subtle flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center font-bold">
            <UtensilsCrossed className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold text-text-primary">Manajemen Denah Meja & Ruangan Resto</h2>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
                F&B Enterprise
              </span>
            </div>
            <p className="text-xs text-text-secondary">Pindah/gabung meja, pantau durasi makan tamu, dan cetak pra-tagihan (Guest Check)</p>
          </div>
        </div>

        {/* Room / Area Tabs & Add Table Action */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 bg-subtle p-1 rounded-lg border border-border-subtle">
            {areas.map((area) => (
              <button
                key={area.id}
                onClick={() => setActiveAreaId(area.id)}
                className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-colors ${
                  activeAreaId === area.id
                    ? 'bg-card text-text-primary shadow-sm border border-border-subtle'
                    : 'text-text-secondary hover:text-text-primary'
                }`}
              >
                {area.name} ({area.tables?.length || 0})
              </button>
            ))}
            <button
              onClick={() => setIsAddAreaModalOpen(true)}
              className="px-2 py-1.5 rounded-md text-xs font-bold text-primary hover:bg-card-hover border border-dashed border-primary/40"
              title="Tambah Area / Lantai Baru"
            >
              + Area
            </button>
          </div>

          <button
            onClick={() => setIsAddTableModalOpen(true)}
            className="px-3 py-1.5 bg-primary hover:bg-primary-hover text-primary-text rounded-lg text-xs font-bold flex items-center gap-1 shadow-sm"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Tambah Meja</span>
          </button>
        </div>
      </div>

      {/* Subheader Status Quick Filters */}
      <div className="px-6 py-2.5 bg-subtle border-b border-border-subtle flex items-center justify-between text-xs">
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-bold text-text-muted uppercase tracking-wider">Status Meja:</span>
          {[
            { id: 'ALL', label: 'Semua Meja' },
            { id: 'Available', label: 'Kosong' },
            { id: 'Occupied', label: 'Terisi' },
            { id: 'WaitingFood', label: 'Tunggu Masak' },
            { id: 'ReadyToBill', label: 'Siap Bayar' }
          ].map((f) => (
            <button
              key={f.id}
              onClick={() => setStatusFilter(f.id)}
              className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-all ${
                statusFilter === f.id
                  ? 'bg-card text-primary font-bold shadow-xs border border-border-subtle'
                  : 'text-text-secondary hover:text-text-primary'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        <button
          onClick={fetchTables}
          disabled={isLoading}
          className="p-1.5 rounded-md hover:bg-card-hover text-text-muted hover:text-primary transition-all"
          title="Segarkan Denah Meja"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-primary' : ''}`} />
        </button>
      </div>

      {/* Tables Grid Canvas */}
      <div className="flex-1 overflow-y-auto p-6">
        {displayedTables.length > 0 ? (
          <div className="grid grid-cols-4 gap-4">
            {displayedTables.map((table) => {
              const isAvailable = table.status === 'Available';
              const isOccupied = !isAvailable;

              return (
                <div
                  key={table.id}
                  className={`p-4 rounded-xl border flex flex-col justify-between transition-all bg-card shadow-xs ${
                    isAvailable
                      ? 'border-border-subtle hover:border-status-success/70 hover:shadow-md'
                      : 'border-amber-500/40 bg-amber-500/5'
                  }`}
                >
                  <div>
                    {/* Top Row: Table Number & Status & Timer */}
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="text-base font-extrabold text-text-primary">Meja {table.tableNumber}</h3>
                          {renderDurationTimer(table.occupiedSince)}
                        </div>
                        <div className="flex items-center gap-1 text-xs text-text-secondary mt-0.5">
                          <Users className="w-3.5 h-3.5" />
                          <span>Kapasitas: {table.capacity} Orang</span>
                        </div>
                      </div>
                      {getStatusBadge(table.status)}
                    </div>

                    {/* Bill Info if Occupied */}
                    {isOccupied && (
                      <div className="mt-3 p-2 rounded-lg bg-subtle/80 border border-border-subtle/60 flex items-center justify-between text-xs">
                        <span className="text-text-muted">Total Bill:</span>
                        <span className="font-extrabold font-mono text-primary">
                          Rp {(table.currentBillAmount || 0).toLocaleString('id-ID')}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Actions Bar */}
                  <div className="pt-3 mt-4 border-t border-border-subtle/60 space-y-2">
                    {isAvailable ? (
                      <button
                        onClick={() => onSelectTableForOrder(table)}
                        className="w-full py-2 bg-primary hover:bg-primary-hover text-primary-text rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 shadow-sm transition-all"
                      >
                        <span>Buka Pesanan Meja</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    ) : (
                      <div className="space-y-1.5">
                        <div className="grid grid-cols-2 gap-1.5">
                          {/* Move / Merge Table */}
                          <button
                            onClick={() => {
                              setSelectedTableForMove(table);
                              setIsMoveModalOpen(true);
                            }}
                            className="py-1.5 bg-subtle hover:bg-card-hover border border-border-subtle text-xs font-semibold rounded-md text-text-secondary flex items-center justify-center gap-1"
                            title="Pindahkan pesanan ke meja lain atau gabungkan tagihan"
                          >
                            <ArrowRightLeft className="w-3 h-3" />
                            <span>Pindah / Gabung</span>
                          </button>

                          {/* Print Guest Check */}
                          <button
                            onClick={() => handleOpenGuestCheck(table)}
                            className="py-1.5 bg-subtle hover:bg-card-hover border border-border-subtle text-xs font-semibold rounded-md text-text-secondary flex items-center justify-center gap-1"
                            title="Cetak struk pra-tagihan (Guest Check)"
                          >
                            <Receipt className="w-3 h-3" />
                            <span>Guest Check</span>
                          </button>
                        </div>

                        <div className="flex gap-1.5">
                          <button
                            onClick={() => handleTableStatusToggle(table, 'Available')}
                            className="w-1/3 py-1.5 bg-subtle hover:bg-status-danger/10 hover:text-status-danger border border-border-subtle text-xs font-semibold rounded-md text-text-muted transition-colors"
                            title="Set meja menjadi kosong"
                          >
                            Kosongkan
                          </button>
                          <button
                            onClick={() => onSelectTableForOrder(table)}
                            className="w-2/3 py-1.5 bg-primary hover:bg-primary-hover text-primary-text text-xs font-bold rounded-md shadow-sm flex items-center justify-center gap-1"
                          >
                            <span>Lihat / Bayar Bill</span>
                            <ArrowRight className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="h-full flex flex-col items-center justify-center text-text-muted space-y-2">
            <UtensilsCrossed className="w-12 h-12 opacity-30" />
            <p className="text-xs font-semibold">Belum Ada Meja yang Sesuai Filter di Area Ini</p>
          </div>
        )}
      </div>

      {/* Global Modals for Tables Page */}
      <MoveTableModal
        isOpen={isMoveModalOpen}
        currentTable={selectedTableForMove}
        areas={areas}
        onClose={() => setIsMoveModalOpen(false)}
        onSuccess={fetchTables}
      />

      <GuestCheckModal
        isOpen={isGuestCheckOpen}
        data={guestCheckData}
        onClose={() => setIsGuestCheckOpen(false)}
      />

      {/* Add Table Modal */}
      {isAddTableModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/75 flex items-center justify-center p-4 select-none">
          <div className="w-full max-w-sm bg-surface border border-border-strong rounded-2xl shadow-2xl p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-border-subtle pb-3">
              <h3 className="text-sm font-bold text-text-primary">Tambah Meja di {currentArea?.name}</h3>
              <button onClick={() => setIsAddTableModalOpen(false)}>
                <X className="w-4 h-4 text-text-muted" />
              </button>
            </div>
            <form onSubmit={handleCreateTable} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-text-secondary mb-1">Nomor / Kode Meja *</label>
                <input
                  type="text"
                  required
                  value={newTableNumber}
                  onChange={(e) => setNewTableNumber(e.target.value)}
                  placeholder="Contoh: A-01, 12, VIP-1"
                  className="w-full px-3 py-2 bg-subtle border border-border-strong rounded-lg text-text-primary font-bold"
                  autoFocus
                />
              </div>
              <div>
                <label className="block font-semibold text-text-secondary mb-1">Kapasitas Kursi (Orang)</label>
                <input
                  type="number"
                  value={newTableCapacity}
                  onChange={(e) => setNewTableCapacity(e.target.value)}
                  placeholder="4"
                  className="w-full px-3 py-2 bg-subtle border border-border-strong rounded-lg text-text-primary font-mono"
                />
              </div>
              <div className="pt-2 flex gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddTableModalOpen(false)}
                  className="flex-1 py-2 bg-subtle border border-border-subtle rounded-lg font-semibold text-text-secondary"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 bg-primary text-primary-text rounded-lg font-bold shadow-sm"
                >
                  Simpan Meja
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Area Modal */}
      {isAddAreaModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/75 flex items-center justify-center p-4 select-none">
          <div className="w-full max-w-sm bg-surface border border-border-strong rounded-2xl shadow-2xl p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-border-subtle pb-3">
              <h3 className="text-sm font-bold text-text-primary">Tambah Area / Lantai Resto</h3>
              <button onClick={() => setIsAddAreaModalOpen(false)}>
                <X className="w-4 h-4 text-text-muted" />
              </button>
            </div>
            <form onSubmit={handleCreateArea} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-text-secondary mb-1">Nama Ruangan / Area *</label>
                <input
                  type="text"
                  required
                  value={newAreaName}
                  onChange={(e) => setNewAreaName(e.target.value)}
                  placeholder="Contoh: Lantai 2 Rooftop, VIP Room, Outdoor"
                  className="w-full px-3 py-2 bg-subtle border border-border-strong rounded-lg text-text-primary font-bold"
                  autoFocus
                />
              </div>
              <div className="pt-2 flex gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddAreaModalOpen(false)}
                  className="flex-1 py-2 bg-subtle border border-border-subtle rounded-lg font-semibold text-text-secondary"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 bg-primary text-primary-text rounded-lg font-bold shadow-sm"
                >
                  Simpan Area
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

// ==========================================
// 2. KITCHEN DISPLAY SYSTEM (KDS) PAGE
// ==========================================
export const KdsPage: React.FC = () => {
  const [kitchenOrders, setKitchenOrders] = useState<any[]>([]);
  const [selectedStation, setSelectedStation] = useState<string>('ALL');
  const [isLoading, setIsLoading] = useState<boolean>(false);

  useEffect(() => {
    fetchKdsOrders();
    const interval = setInterval(fetchKdsOrders, 5000);
    const heartbeatTimer = setInterval(() => {
      fetch('/api/v1/hardware/heartbeat/kds', { method: 'POST' }).catch(() => {});
    }, 3000);
    fetch('/api/v1/hardware/heartbeat/kds', { method: 'POST' }).catch(() => {});
    return () => {
      clearInterval(interval);
      clearInterval(heartbeatTimer);
    };
  }, []);

  const fetchKdsOrders = async () => {
    try {
      setIsLoading(true);
      const res = await fetch('/api/v1/sales/orders?limit=15');
      if (res.ok) {
        const data = await res.json();
        setKitchenOrders(data);
      }
    } catch {
      // Mock KDS fallback
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateOrderStatus = async (orderId: string, newStatus: string) => {
    try {
      playScanBeep();
      await fetch(`/api/v1/kds/orders/${orderId}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      });
      useToastStore.getState().showToast(`Status tiket dapur berhasil diperbarui ke ${newStatus}!`, 'info');
      fetchKdsOrders();
    } catch {
      useToastStore.getState().showToast('Gagal memperbarui status tiket.', 'error');
    }
  };

  const handleToggleItemStatus = async (itemId: string, currentPrepared: boolean) => {
    try {
      playScanBeep();
      await fetch(`/api/v1/kds/items/${itemId}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isPrepared: !currentPrepared })
      });
      fetchKdsOrders();
    } catch {}
  };

  // Filter orders by kitchen station
  const filteredOrders = kitchenOrders.filter((order) => {
    if (selectedStation === 'ALL') return true;
    return order.items?.some((item: any) => (item.kitchenStation || 'KITCHEN').toUpperCase() === selectedStation);
  });

  return (
    <div className="flex-1 flex flex-col bg-app overflow-hidden select-none">
      {/* KDS Header */}
      <div className="p-4 bg-surface border-b border-border-subtle flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-status-info/10 text-status-info flex items-center justify-center font-bold">
            <ChefHat className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold text-text-primary">Kitchen Display System (KDS)</h2>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-status-info/10 text-status-info border border-status-info/20">
                Layar Koki Real-Time
              </span>
            </div>
            <p className="text-xs text-text-secondary">Penyajian bertahap: Baru Masuk → Dimasak → Siap Diantar → Tersaji</p>
          </div>
        </div>

        {/* Station Filters */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 bg-subtle p-1 rounded-lg border border-border-subtle">
            {[
              { id: 'ALL', label: 'Semua Stasiun' },
              { id: 'KITCHEN', label: 'Dapur (Makanan)' },
              { id: 'BAR', label: 'Bar (Minuman)' },
              { id: 'GRILL', label: 'Grill & BBQ' }
            ].map((st) => (
              <button
                key={st.id}
                onClick={() => setSelectedStation(st.id)}
                className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-colors ${
                  selectedStation === st.id
                    ? 'bg-card text-text-primary shadow-sm border border-border-subtle'
                    : 'text-text-secondary hover:text-text-primary'
                }`}
              >
                {st.label}
              </button>
            ))}
          </div>

          <button
            onClick={fetchKdsOrders}
            className="p-2 rounded-lg bg-subtle hover:bg-card-hover border border-border-subtle text-text-secondary hover:text-primary transition-all"
            title="Perbarui Tiket Dapur"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin text-primary' : ''}`} />
          </button>
        </div>
      </div>

      {/* KDS Ticket Cards Grid */}
      <div className="flex-1 overflow-y-auto p-6">
        {filteredOrders.length > 0 ? (
          <div className="grid grid-cols-3 gap-4">
            {filteredOrders.map((order, idx) => {
              const minutesElapsed = Math.max(0, Math.floor((Date.now() - new Date(order.orderDate).getTime()) / 60000));
              const isOverdue = minutesElapsed > 15;
              const allItemsPrepared = order.items?.length > 0 && order.items.every((i: any) => i.kitchenPrepared);

              return (
                <div 
                  key={order.id || idx} 
                  className={`bg-card border rounded-xl overflow-hidden shadow-sm flex flex-col justify-between transition-all ${
                    isOverdue 
                      ? 'border-rose-500/50 shadow-rose-500/10' 
                      : 'border-border-strong'
                  }`}
                >
                  {/* Ticket Header */}
                  <div className={`p-3.5 border-b flex items-center justify-between ${
                    isOverdue ? 'bg-rose-500/10 border-rose-500/30' : 'bg-subtle border-border-subtle'
                  }`}>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="font-extrabold text-sm text-text-primary">
                          {order.diningTable?.tableNumber ? `MEJA ${order.diningTable.tableNumber}` : 'TAKE AWAY'}
                        </span>
                        <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-card text-text-muted">
                          #{order.invoiceNumber ? order.invoiceNumber.split('-').pop() : idx + 1}
                        </span>
                      </div>
                      <p className="text-[11px] text-text-secondary mt-0.5">
                        Tamu: <strong>{order.customer?.name || 'Umum'}</strong>
                      </p>
                    </div>

                    <div className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold font-mono border ${
                      isOverdue
                        ? 'bg-rose-500 text-white border-rose-600 animate-pulse'
                        : minutesElapsed > 8
                        ? 'bg-amber-500/15 text-amber-600 border-amber-500/30'
                        : 'bg-status-success/15 text-status-success border-status-success/30'
                    }`}>
                      <Clock className="w-3.5 h-3.5" />
                      <span>{minutesElapsed} mnt</span>
                    </div>
                  </div>

                  {/* Items List */}
                  <div className="p-4 space-y-2.5 flex-1 overflow-y-auto max-h-72">
                    {order.items?.map((item: any, ii: number) => {
                      const isPrepared = !!item.kitchenPrepared;
                      return (
                        <div 
                          key={ii} 
                          onClick={() => handleToggleItemStatus(item.id, isPrepared)}
                          className={`p-2 rounded-lg border cursor-pointer transition-all flex items-start justify-between ${
                            isPrepared
                              ? 'bg-status-success/10 border-status-success/30 text-status-success line-through opacity-70'
                              : 'bg-subtle/70 border-border-subtle hover:bg-card-hover'
                          }`}
                        >
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-extrabold text-xs text-text-primary">
                                {item.quantity}x {item.productName}
                              </span>
                              <span className="text-[9px] px-1.5 py-0.2 rounded bg-card text-text-muted font-mono uppercase">
                                {item.kitchenStation || 'KITCHEN'}
                              </span>
                            </div>

                            {/* Modifiers display */}
                            {item.modifiers?.map((m: any, mi: number) => (
                              <p key={mi} className="text-[10px] text-amber-700 dark:text-amber-400 font-semibold pl-2 mt-0.5">
                                • {m.modifierName}
                              </p>
                            ))}

                            {/* Notes display */}
                            {item.notes && (
                              <p className="text-[10px] text-rose-600 italic pl-2 mt-0.5">
                                Catatan: "{item.notes}"
                              </p>
                            )}
                          </div>

                          <div className={`w-5 h-5 rounded-md flex items-center justify-center border ${
                            isPrepared ? 'bg-status-success border-status-success text-white' : 'border-border-strong'
                          }`}>
                            {isPrepared && <Check className="w-3.5 h-3.5" />}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Ticket Footer Action Buttons */}
                  <div className="p-3 bg-subtle border-t border-border-subtle flex gap-2">
                    <button
                      type="button"
                      onClick={() => handleUpdateOrderStatus(order.id, 'Cooking')}
                      className="flex-1 py-1.5 bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30 text-amber-700 dark:text-amber-400 rounded-lg text-xs font-bold flex items-center justify-center gap-1"
                    >
                      <Flame className="w-3.5 h-3.5" />
                      <span>Masak</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleUpdateOrderStatus(order.id, 'Ready')}
                      className="flex-1 py-1.5 bg-status-info/15 hover:bg-status-info/25 border border-status-info/30 text-status-info rounded-lg text-xs font-bold flex items-center justify-center gap-1"
                    >
                      <UtensilsCrossed className="w-3.5 h-3.5" />
                      <span>Siap Diantar</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleUpdateOrderStatus(order.id, 'Served')}
                      className="flex-1 py-1.5 bg-status-success hover:bg-green-700 text-white rounded-lg text-xs font-bold flex items-center justify-center gap-1 shadow-sm"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Tersaji</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="h-full flex flex-col items-center justify-center text-text-muted space-y-2">
            <ChefHat className="w-12 h-12 opacity-30" />
            <p className="text-xs font-semibold">Semua Pesanan Dapur Telah Selesai Disajikan</p>
            <p className="text-[11px]">Tiket baru akan otomatis muncul saat kasir atau waiter menerima order.</p>
          </div>
        )}
      </div>
    </div>
  );
};
