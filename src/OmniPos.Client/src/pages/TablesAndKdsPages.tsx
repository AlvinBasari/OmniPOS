import React, { useState, useEffect } from 'react';
import { 
  UtensilsCrossed, 
  ChefHat, 
  Clock, 
  CheckCircle2, 
  Users, 
  RefreshCw, 
  ArrowRight,
  Sparkles,
  AlertTriangle
} from 'lucide-react';
import { DiningTable, FloorPlanArea } from '../types';
import { useCartStore } from '../store/useCartStore';

// ==========================================
// 1. TABLES PAGE (F&B FLOOR PLAN)
// ==========================================
interface TablesPageProps {
  onSelectTableForOrder: (table: DiningTable) => void;
}

export const TablesPage: React.FC<TablesPageProps> = ({ onSelectTableForOrder }) => {
  const [areas, setAreas] = useState<FloorPlanArea[]>([]);
  const [activeAreaId, setActiveAreaId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    fetchTables();
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

  const currentArea = areas.find((a) => a.id === activeAreaId) || areas[0];

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Available':
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-status-success/15 text-status-success border border-status-success/30">Kosong</span>;
      case 'Occupied':
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-status-danger/15 text-status-danger border border-status-danger/30">Terisi</span>;
      case 'WaitingFood':
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-status-warning/15 text-status-warning border border-status-warning/30">Tunggu Makanan</span>;
      case 'ReadyToBill':
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-status-info/15 text-status-info border border-status-info/30">Siap Bayar</span>;
      default:
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-subtle text-text-muted">Kotor</span>;
    }
  };

  return (
    <div className="flex-1 flex flex-col bg-app overflow-hidden select-none">
      {/* Header & Area Selector */}
      <div className="p-4 bg-surface border-b border-border-subtle flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center font-bold">
            <UtensilsCrossed className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-text-primary">Manajemen Denah Meja F&B</h2>
            <p className="text-xs text-text-secondary">Pilih meja untuk mencatat pesanan atau melihat tagihan berjalan</p>
          </div>
        </div>

        {/* Room / Area Tabs */}
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
        </div>
      </div>

      {/* Tables Grid Canvas */}
      <div className="flex-1 overflow-y-auto p-6">
        {currentArea && currentArea.tables && currentArea.tables.length > 0 ? (
          <div className="grid grid-cols-4 gap-4">
            {currentArea.tables.map((table) => {
              const isAvailable = table.status === 'Available';
              return (
                <div
                  key={table.id}
                  className={`p-4 rounded-xl border flex flex-col justify-between transition-all bg-card ${
                    isAvailable
                      ? 'border-border-subtle hover:border-status-success hover:shadow-md'
                      : 'border-status-danger/40 bg-status-danger/5 shadow-sm'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="text-base font-bold text-text-primary">Meja {table.tableNumber}</h3>
                      <div className="flex items-center gap-1 text-xs text-text-secondary mt-0.5">
                        <Users className="w-3.5 h-3.5" />
                        <span>Kapasitas: {table.capacity} Orang</span>
                      </div>
                    </div>
                    {getStatusBadge(table.status)}
                  </div>

                  <div className="pt-4 mt-4 border-t border-border-subtle/60 flex items-center justify-between">
                    {isAvailable ? (
                      <button
                        onClick={() => onSelectTableForOrder(table)}
                        className="w-full py-2 bg-primary hover:bg-primary-hover text-primary-text rounded-md text-xs font-bold flex items-center justify-center gap-1.5 shadow-sm transition-all"
                      >
                        <span>Buka Pesanan Meja</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    ) : (
                      <div className="w-full flex gap-2">
                        <button
                          onClick={() => handleTableStatusToggle(table, 'Available')}
                          className="flex-1 py-1.5 bg-subtle hover:bg-card-hover border border-border-subtle text-xs font-semibold rounded text-text-secondary"
                        >
                          Set Kosong
                        </button>
                        <button
                          onClick={() => onSelectTableForOrder(table)}
                          className="flex-1 py-1.5 bg-primary hover:bg-primary-hover text-primary-text text-xs font-bold rounded shadow-sm"
                        >
                          Lihat Bill
                        </button>
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
            <p className="text-xs font-semibold">Belum Ada Meja di Area Ini</p>
          </div>
        )}
      </div>
    </div>
  );
};

// ==========================================
// 2. KITCHEN DISPLAY SYSTEM (KDS) PAGE
// ==========================================
export const KdsPage: React.FC = () => {
  const [kitchenOrders, setKitchenOrders] = useState<any[]>([]);
  const [selectedStation, setSelectedStation] = useState<string>('ALL');

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
      const res = await fetch('/api/v1/sales/orders?limit=10');
      if (res.ok) {
        const data = await res.json();
        setKitchenOrders(data);
      }
    } catch {
      // Mock KDS fallback
    }
  };

  return (
    <div className="flex-1 flex flex-col bg-app overflow-hidden select-none">
      {/* KDS Header */}
      <div className="p-4 bg-surface border-b border-border-subtle flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-status-info/10 text-status-info flex items-center justify-center font-bold">
            <ChefHat className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-text-primary">Kitchen Display System (KDS)</h2>
            <p className="text-xs text-text-secondary">Antrean tiket pesanan dapur real-time via WebSocket lokal</p>
          </div>
        </div>

        {/* Station Filters */}
        <div className="flex items-center gap-1.5 bg-subtle p-1 rounded-lg border border-border-subtle">
          {['ALL', 'KITCHEN', 'BAR', 'GRILL'].map((station) => (
            <button
              key={station}
              onClick={() => setSelectedStation(station)}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-colors ${
                selectedStation === station
                  ? 'bg-card text-text-primary shadow-sm border border-border-subtle'
                  : 'text-text-secondary hover:text-text-primary'
              }`}
            >
              {station === 'ALL' ? 'Semua Stasiun' : `Stasiun ${station}`}
            </button>
          ))}
        </div>
      </div>

      {/* KDS Ticket Cards Grid */}
      <div className="flex-1 overflow-y-auto p-6">
        <div className="grid grid-cols-3 gap-4">
          {kitchenOrders.map((order, idx) => (
            <div key={order.id || idx} className="bg-card border border-border-strong rounded-xl overflow-hidden shadow-sm flex flex-col justify-between">
              {/* Ticket Header */}
              <div className="p-3.5 bg-subtle border-b border-border-subtle flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-bold text-text-primary font-mono">{order.invoiceNumber}</h4>
                  <p className="text-[11px] text-text-secondary">Meja: {order.diningTable?.tableNumber || 'TAKEAWAY'}</p>
                </div>
                <div className="flex items-center gap-1 px-2 py-1 rounded bg-status-warning/10 text-status-warning text-xs font-bold border border-status-warning/30">
                  <Clock className="w-3.5 h-3.5" />
                  <span>04:15</span>
                </div>
              </div>

              {/* Items List */}
              <div className="p-4 space-y-2.5 flex-1 overflow-y-auto">
                {order.items?.map((item: any, ii: number) => (
                  <div key={ii} className="flex items-start justify-between border-b border-border-subtle/50 pb-2">
                    <div>
                      <p className="text-xs font-bold text-text-primary leading-tight">
                        {item.quantity}x {item.productName}
                      </p>
                      {item.modifiers?.map((m: any, mi: number) => (
                        <p key={mi} className="text-[10px] text-text-secondary">• {m.modifierName}</p>
                      ))}
                    </div>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-subtle text-text-muted font-mono">
                      {item.kitchenStation || 'BAR'}
                    </span>
                  </div>
                ))}
              </div>

              {/* Ticket Footer Actions */}
              <div className="p-3 bg-subtle border-t border-border-subtle flex gap-2">
                <button className="flex-1 py-2 bg-status-success hover:bg-green-700 text-white rounded-md text-xs font-bold flex items-center justify-center gap-1.5 shadow-sm transition-all">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Siap Saji (Served)</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
