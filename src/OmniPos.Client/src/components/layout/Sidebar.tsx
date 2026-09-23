import React, { useState, useEffect } from 'react';
import { 
  ShoppingCart, 
  UtensilsCrossed, 
  ChefHat, 
  Monitor, 
  Boxes, 
  Receipt, 
  Users, 
  BarChart3, 
  HardDriveDownload, 
  Settings,
  Scissors,
  Pill,
  Smartphone,
  UserCheck,
  Truck,
  ClipboardCheck,
  Tag,
  Gift,
  Clock,
  Calendar,
  Timer,
  RotateCcw,
  Wrench,
  ShieldCheck,
  Radio,
  RefreshCw,
  FileText,
  Sliders,
  PanelLeftClose,
  PanelLeftOpen,
  ChevronLeft,
  ChevronRight,
  Package,
  Layers,
  CreditCard,
  LayoutDashboard,
  Wallet,
  Building2,
  Handshake
} from 'lucide-react';
import { useBusinessModeStore } from '../../store/useBusinessModeStore';
import { useAuthStore } from '../../store/useAuthStore';
import { useSettingsStore } from '../../store/useSettingsStore';
import { useShiftStore } from '../../store/useShiftAndThemeStores';

export type NavigationPage = 
  | 'pos' 
  | 'tables' 
  | 'kds' 
  | 'cfd' 
  | 'services'
  | 'prescriptions'
  | 'electronics-serials'
  | 'sim-cards'
  | 'trade-in'
  | 'inventory' 
  | 'warehouse-transfer'
  | 'consignment'
  | 'purchasing'
  | 'stock-opname'
  | 'price-tags'
  | 'promos'
  | 'expired-tracker'
  | 'returns'
  | 'shifts' 
  | 'shift-audit'
  | 'expenses'
  | 'customers' 
  | 'reports' 
  | 'hardware'
  | 'backup' 
  | 'users'
  | 'settings';

interface SidebarProps {
  currentPage: NavigationPage;
  onNavigate: (page: NavigationPage) => void;
}

interface NavItem {
  id: NavigationPage | string;
  label: string;
  shortLabel?: string;
  icon: any;
  badge?: string;
  onClick?: () => void;
}

interface NavGroup {
  id: string;
  title: string;
  items: NavItem[];
}

export const Sidebar: React.FC<SidebarProps> = ({ currentPage, onNavigate }) => {
  const { mode, edition } = useBusinessModeStore();
  const { currentUser } = useAuthStore();
  const { isCfdEnabled, isSidebarCollapsed, toggleSidebarCollapsed } = useSettingsStore();
  const { activeShift, openDashboard, fetchActiveShift } = useShiftStore();

  useEffect(() => {
    fetchActiveShift();
  }, [fetchActiveShift]);

  const userRole = currentUser?.role || 'SuperAdmin';
  const isAdminOrManager = userRole === 'SuperAdmin' || userRole === 'Manager' || userRole === 'Supervisor' || (userRole as string) === 'Admin';

  // Live real-time Clock & Date state
  const [currentTime, setCurrentTime] = useState<Date>(new Date());
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const dayName = currentTime.toLocaleDateString('id-ID', { weekday: 'long' });
  const dateStr = currentTime.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
  const timeStr = currentTime.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
  const shortTimeStr = currentTime.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', hour12: false });

  // Shift Duration & Countdown Calculation (Target 8 Jam Standar Retail)
  let remainingShiftMs = 0;
  let elapsedShiftMs = 0;
  let shiftProgressPercent = 0;
  let shiftCountdownStr = '';
  let isOvertime = false;

  if (activeShift?.startTime) {
    const startMs = new Date(activeShift.startTime).getTime();
    elapsedShiftMs = Math.max(0, currentTime.getTime() - startMs);
    const targetShiftMs = 8 * 3600 * 1000; // 8 Jam Shift Standar
    remainingShiftMs = targetShiftMs - elapsedShiftMs;
    shiftProgressPercent = Math.min(100, Math.round((elapsedShiftMs / targetShiftMs) * 100));

    if (remainingShiftMs > 0) {
      const h = Math.floor(remainingShiftMs / 3600000);
      const m = Math.floor((remainingShiftMs % 3600000) / 60000);
      const s = Math.floor((remainingShiftMs % 60000) / 1000);
      shiftCountdownStr = `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    } else {
      isOvertime = true;
      const overMs = Math.abs(remainingShiftMs);
      const h = Math.floor(overMs / 3600000);
      const m = Math.floor((overMs % 3600000) / 60000);
      const s = Math.floor((overMs % 60000) / 1000);
      shiftCountdownStr = `+${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    }
  }

  // Global hotkey Ctrl+B to toggle sidebar collapse
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && (e.key === 'b' || e.key === 'B')) {
        e.preventDefault();
        toggleSidebarCollapsed();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [toggleSidebarCollapsed]);

  // 1. GRUP TRANSAKSI & OPERASIONAL
  const getOperationalNavItems = (): NavItem[] => {
    const items: NavItem[] = [];

    // Kasir POS Utama
    if (isAdminOrManager || userRole === 'Cashier' || userRole === 'Technician') {
      const posLabel = mode === 'Retail' ? 'Kasir Retail'
        : mode === 'FoodAndBeverage' ? 'Kasir Resto'
        : mode === 'Services' ? 'Kasir Layanan'
        : mode === 'Pharmacy' ? 'Kasir Resep'
        : 'Kasir Gadget';
      const posIcon = mode === 'Services' ? Scissors : mode === 'Pharmacy' ? Pill : mode === 'Electronics' ? Smartphone : ShoppingCart;
      items.push({ id: 'pos', label: posLabel, shortLabel: 'Kasir', icon: posIcon });

      // Dashboard Kasir (Live Shift Telemetry & Rekonsiliasi)
      // Dikecualikan untuk Admin / Owner agar tidak membebani kewajiban operasional kasir.
      // Admin / Owner mengaudit dan memantau di menu "Audit & Riwayat Shift".
      if (userRole === 'Cashier' || userRole === 'Technician') {
        items.push({
          id: 'shifts',
          label: 'Dashboard Kasir',
          shortLabel: 'Dash',
          icon: LayoutDashboard,
          badge: activeShift ? 'LIVE' : undefined,
        });
      }
    }

    // F&B Specific: Meja & KDS
    if (mode === 'FoodAndBeverage') {
      if (isAdminOrManager || userRole === 'Cashier' || userRole === 'Waiter') {
        items.push({ id: 'tables', label: 'Denah Meja', shortLabel: 'Meja', icon: UtensilsCrossed });
      }
      if (isAdminOrManager || userRole === 'KitchenStaff' || userRole === 'Waiter') {
        items.push({ id: 'kds', label: 'Dapur (KDS)', shortLabel: 'KDS', icon: ChefHat });
      }
    }

    // Services / Electronics Specific: SPK & Layanan
    if (mode === 'Services') {
      if (isAdminOrManager || userRole === 'Cashier' || userRole === 'Technician') {
        items.push({ id: 'services', label: 'Antrean Layanan & SPK', shortLabel: 'SPK', icon: Wrench });
      }
    }

    // Pharmacy Specific: Resep & Etiket Obat
    if (mode === 'Pharmacy') {
      if (isAdminOrManager || userRole === 'Cashier') {
        items.push({ id: 'prescriptions', label: 'Resep & Etiket Obat', shortLabel: 'Resep', icon: FileText });
      }
    }

    // Electronics Specific: Service Center, IMEI & Garansi, SIM, Trade-In
    if (mode === 'Electronics') {
      if (isAdminOrManager || userRole === 'Cashier' || userRole === 'Technician') {
        items.push({ id: 'services', label: 'Pusat Servis (SPK)', shortLabel: 'Servis', icon: Wrench });
        items.push({ id: 'electronics-serials', label: 'IMEI & Cek Garansi', shortLabel: 'IMEI', icon: ShieldCheck });
        items.push({ id: 'sim-cards', label: 'Nomor Cantik & SIM', shortLabel: 'SIM', icon: Radio });
        items.push({ id: 'trade-in', label: 'Tukar Tambah (Trade-In)', shortLabel: 'TradeIn', icon: RefreshCw });
      }
    }

    // Customer Facing Display
    if (isCfdEnabled && (isAdminOrManager || userRole === 'Cashier')) {
      items.push({ id: 'cfd', label: 'Layar Pelanggan (CFD)', shortLabel: 'CFD', icon: Monitor });
    }

    return items;
  };

  // 2. GRUP INVENTORI & GUDANG
  const getInventoryNavItems = (): NavItem[] => {
    const items: NavItem[] = [];
    if (isAdminOrManager || userRole === 'InventoryStaff') {
      items.push({ id: 'inventory', label: mode === 'Retail' ? 'Stok & Grosir' : 'Katalog & Stok', shortLabel: 'Stok', icon: Boxes });
      items.push({ id: 'warehouse-transfer', label: 'Multi-Gudang & Transfer', shortLabel: 'Gudang', icon: Building2 });
      items.push({ id: 'consignment', label: 'Barang Konsinyasi & Vendor', shortLabel: 'Konsinyasi', icon: Handshake });
      items.push({ id: 'purchasing', label: 'Pembelian & Supplier', shortLabel: 'Beli', icon: Truck });
      items.push({ id: 'stock-opname', label: 'Stock Opname Digital', shortLabel: 'Opname', icon: ClipboardCheck });
      items.push({ id: 'price-tags', label: 'Cetak Label Barcode', shortLabel: 'Barcode', icon: Tag });
      items.push({ id: 'expired-tracker', label: 'Pantau Kadaluarsa', shortLabel: 'Expired', icon: Clock });
    }
    return items;
  };

  // 3. GRUP PENJUALAN & PELANGGAN
  const getSalesNavItems = (): NavItem[] => {
    const items: NavItem[] = [];
    if (isAdminOrManager || userRole === 'Cashier') {
      items.push({ id: 'returns', label: 'Retur Penjualan', shortLabel: 'Retur', icon: RotateCcw });
      items.push({ id: 'promos', label: 'Promo & Diskon', shortLabel: 'Promo', icon: Gift });
      items.push({ id: 'customers', label: 'CRM & Kasbon', shortLabel: 'Member', icon: Users });
    }
    return items;
  };

  // 4. GRUP KEUANGAN & LAPORAN
  const getFinanceNavItems = (): NavItem[] => {
    const items: NavItem[] = [];
    if (isAdminOrManager || userRole === 'Cashier') {
      items.push({ 
        id: 'expenses', 
        label: 'Biaya & Beban Toko', 
        shortLabel: 'Beban', 
        icon: Wallet, 
      });
    }
    if (isAdminOrManager) {
      items.push({ 
        id: 'shift-audit', 
        label: 'Audit & Riwayat Shift', 
        shortLabel: 'Audit', 
        icon: Receipt,
      });
      items.push({ id: 'reports', label: 'Laporan Finansial', shortLabel: 'Laporan', icon: BarChart3 });
    }
    return items;
  };

  // 5. GRUP SISTEM & PENGATURAN
  const getSystemNavItems = (): NavItem[] => {
    const items: NavItem[] = [];
    // Perangkat & Hardware is accessible for all roles so cashiers and managers can manage printers, barcode scanners, EDC, and QRIS
    items.push({ id: 'hardware', label: 'Perangkat & Hardware', shortLabel: 'Hardware', icon: Sliders });
    if (isAdminOrManager) {
      items.push({ id: 'settings', label: 'Pengaturan Toko', shortLabel: 'Setting', icon: Settings });
    }
    if (userRole === 'SuperAdmin') {
      items.push({ id: 'users', label: 'Karyawan & Akses', shortLabel: 'Karyawan', icon: UserCheck });
      items.push({ id: 'backup', label: 'Google Drive Backup', shortLabel: 'Backup', icon: HardDriveDownload });
    }
    return items;
  };

  // Assemble the categorized groups
  const groups: NavGroup[] = [
    { id: 'operational', title: 'Operasional Kasir', items: getOperationalNavItems() },
    { id: 'inventory', title: 'Inventori & Gudang', items: getInventoryNavItems() },
    { id: 'sales', title: 'Penjualan & CRM', items: getSalesNavItems() },
    { id: 'finance', title: 'Keuangan & Shift', items: getFinanceNavItems() },
    { id: 'system', title: 'Pengaturan & Sistem', items: getSystemNavItems() }
  ].filter(g => g.items.length > 0);

  return (
    <aside 
      className={`bg-surface border-r border-border-subtle flex flex-col justify-between select-none transition-all duration-200 ease-in-out shrink-0 ${
        isSidebarCollapsed ? 'w-16 p-2' : 'w-56 p-2.5'
      }`}
    >
      {/* Top Header & Minimize Button */}
      <div className="flex flex-col min-h-0">
        <div className={`flex items-center pb-2 mb-1 border-b border-border-subtle ${
          isSidebarCollapsed ? 'justify-center' : 'justify-between px-1'
        }`}>
          {!isSidebarCollapsed && (
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] font-black tracking-wider uppercase text-text-muted">MENU UTAMA</span>
              <span className="text-[9px] px-1.5 py-0.2 rounded-full bg-primary/10 text-primary font-bold border border-primary/20">
                {mode}
              </span>
            </div>
          )}

          <button
            onClick={toggleSidebarCollapsed}
            className={`p-1.5 rounded-lg hover:bg-subtle text-text-muted hover:text-text-primary transition-colors cursor-pointer ${
              isSidebarCollapsed ? 'w-10 h-10 flex items-center justify-center' : ''
            }`}
            title={isSidebarCollapsed ? 'Perluas Sidebar [Ctrl+B]' : 'Kecilkan Sidebar [Ctrl+B] (Layar Kasir Lebih Luas)'}
          >
            {isSidebarCollapsed ? (
              <PanelLeftOpen className="w-5 h-5 text-primary hover:scale-110 transition-transform" />
            ) : (
              <PanelLeftClose className="w-4 h-4" />
            )}
          </button>
        </div>

        {/* Scrollable Navigation Groups */}
        <div className="overflow-y-auto space-y-3 pr-0.5">
          {groups.map((group, groupIdx) => (
            <div key={group.id} className="space-y-0.5">
              {/* Group Heading or Divider */}
              {!isSidebarCollapsed ? (
                <div className="px-2 pt-1 pb-1 text-[10px] font-bold text-text-muted tracking-wider uppercase">
                  {group.title}
                </div>
              ) : (
                groupIdx > 0 && <div className="my-2 border-t border-border-subtle mx-1.5" />
              )}

              {/* Group Items */}
              {group.items.map((item) => {
                const Icon = item.icon;
                const isActive = currentPage === item.id;

                if (isSidebarCollapsed) {
                  return (
                    <div key={item.id} className="relative group flex justify-center py-0.5">
                      <button
                        onClick={() => {
                          if (item.onClick) {
                            item.onClick();
                          } else {
                            onNavigate(item.id as NavigationPage);
                          }
                        }}
                        className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all cursor-pointer relative ${
                          isActive
                            ? 'bg-primary text-white shadow-md ring-2 ring-primary/30 scale-105'
                            : 'text-text-secondary hover:bg-card-hover hover:text-text-primary'
                        }`}
                        title={item.label}
                      >
                        <Icon className="w-4 h-4 shrink-0" />
                        {item.badge && (
                          <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                        )}
                      </button>

                      {/* Floating Tooltip on Hover */}
                      <div className="fixed left-16 z-50 ml-2 hidden group-hover:flex items-center pointer-events-none transition-opacity duration-150">
                        <div className="px-2.5 py-1.5 rounded-lg bg-slate-900 dark:bg-zinc-800 text-white text-xs font-bold shadow-xl border border-slate-700 dark:border-zinc-700 flex items-center gap-1.5 whitespace-nowrap">
                          <Icon className="w-3.5 h-3.5 text-primary" />
                          <span>{item.label}</span>
                          {item.badge && (
                            <span className="px-1.5 py-0.2 rounded text-[9px] bg-emerald-500 text-white font-black">
                              {item.badge}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                }

                return (
                  <button
                    key={item.id}
                    onClick={() => {
                      if (item.onClick) {
                        item.onClick();
                      } else {
                        onNavigate(item.id as NavigationPage);
                      }
                    }}
                    className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all text-left cursor-pointer ${
                      isActive
                        ? 'bg-primary text-white shadow-sm font-bold'
                        : 'text-text-secondary hover:bg-card-hover hover:text-text-primary'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 truncate">
                      <Icon className="w-4 h-4 shrink-0" />
                      <span className="truncate">{item.label}</span>
                    </div>
                    {item.badge && (
                      <span className="text-[9px] font-black px-1.5 py-0.5 rounded-full bg-emerald-500 text-white shadow-xs flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping" />
                        {item.badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          ))}
        </div>
      </div>

      {/* Bottom Footer - Live Clock, Date & Shift Countdown Widget */}
      <div className="pt-2 border-t border-border-subtle mt-2">
        {!isSidebarCollapsed ? (
          <div className="p-2.5 rounded-xl bg-card border border-border-subtle shadow-xs space-y-2">
            {/* 1. Day, Date & Online Status */}
            <div className="flex items-center justify-between text-[11px] text-text-secondary font-medium">
              <div className="flex items-center gap-1.5 truncate">
                <Calendar className="w-3.5 h-3.5 text-primary shrink-0" />
                <span className="truncate font-semibold text-text-primary capitalize">
                  {dayName}, <span className="font-normal text-text-secondary">{dateStr}</span>
                </span>
              </div>
              <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" title="Sistem Online & Terhubung" />
            </div>

            {/* 2. Sisa Waktu Shift / Shift Status Badge */}
            {activeShift ? (
              <div 
                onClick={() => {
                  const isAdmin = currentUser?.role === 'SuperAdmin' || currentUser?.role === 'Manager' || currentUser?.role === 'Supervisor' || (currentUser?.role as string) === 'Admin';
                  if (isAdmin) {
                    onNavigate('shift-audit');
                  } else {
                    openDashboard('live');
                  }
                }}
                className={`p-2 rounded-xl border transition-all cursor-pointer shadow-2xs ${
                  isOvertime
                    ? 'bg-amber-500/10 border-amber-500/30 hover:bg-amber-500/20' 
                    : 'bg-emerald-500/10 border-emerald-500/25 hover:bg-emerald-500/15'
                }`}
                title={isOvertime ? "Shift telah melebihi target 8 jam. Klik untuk rekap / tutup shift." : `Shift ${activeShift.cashierName} aktif (Target: 8 Jam). Klik untuk buka Dashboard Kasir.`}
              >
                <div className="flex items-center justify-between gap-1 text-[10px]">
                  <span className="font-bold text-text-secondary flex items-center gap-1.5 truncate">
                    <Timer className={`w-3.5 h-3.5 shrink-0 ${isOvertime ? 'text-amber-500 animate-pulse' : 'text-emerald-600 dark:text-emerald-400'}`} />
                    <span className="truncate">{isOvertime ? 'Overtime Shift' : 'Sisa Shift (8j)'}</span>
                  </span>
                  <span className={`font-mono font-black shrink-0 px-1.5 py-0.2 rounded text-[11px] ${
                    isOvertime 
                      ? 'bg-amber-500/20 text-amber-700 dark:text-amber-300' 
                      : 'bg-emerald-500/20 text-emerald-700 dark:text-emerald-300'
                  }`}>
                    {shiftCountdownStr}
                  </span>
                </div>
                {/* Mini Progress Bar */}
                <div className="w-full bg-border-subtle/60 h-1.5 rounded-full mt-1.5 overflow-hidden">
                  <div 
                    className={`h-full transition-all duration-500 rounded-full ${
                      isOvertime ? 'bg-amber-500' : shiftProgressPercent > 80 ? 'bg-amber-400' : 'bg-emerald-500'
                    }`}
                    style={{ width: `${Math.min(100, shiftProgressPercent)}%` }}
                  />
                </div>
              </div>
            ) : (
              <div 
                onClick={() => {
                  const isAdmin = currentUser?.role === 'SuperAdmin' || currentUser?.role === 'Manager' || currentUser?.role === 'Supervisor' || (currentUser?.role as string) === 'Admin';
                  if (isAdmin) {
                    onNavigate('shift-audit');
                  } else {
                    onNavigate('shifts');
                  }
                }}
                className="p-1.5 rounded-lg bg-subtle border border-border-subtle flex items-center justify-between text-[10px] text-text-muted hover:bg-card-hover transition-colors cursor-pointer"
                title="Laci kasir saat ini tutup. Klik untuk buka shift kasir."
              >
                <span className="flex items-center gap-1 font-medium">
                  <span className="w-1.5 h-1.5 rounded-full bg-zinc-400" />
                  <span>Status Shift:</span>
                </span>
                <span className="font-bold text-text-secondary">Tutup (Buka)</span>
              </div>
            )}

            {/* 3. Live Digital Clock & Minimize Button */}
            <div className="flex items-baseline justify-between pt-0.5 border-t border-border-subtle/50">
              <div className="flex items-baseline gap-1">
                <Clock className="w-3.5 h-3.5 text-text-muted shrink-0 self-center" />
                <span className="text-sm font-black font-mono tracking-wider text-text-primary">
                  {timeStr}
                </span>
                <span className="text-[9px] font-bold text-text-muted">
                  WIB
                </span>
              </div>

              <button 
                onClick={toggleSidebarCollapsed}
                className="text-[9px] text-text-muted hover:text-primary transition-colors flex items-center gap-0.5 font-semibold cursor-pointer"
                title="Kecilkan sidebar [Ctrl+B]"
              >
                <span>Kecilkan</span>
                <ChevronLeft className="w-3 h-3" />
              </button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-1">
            <button
              onClick={toggleSidebarCollapsed}
              className={`w-10 rounded-xl bg-card hover:bg-card-hover border border-border-subtle flex flex-col items-center justify-center p-1.5 text-text-secondary hover:text-primary transition-all cursor-pointer group relative shadow-xs ${
                activeShift ? (isOvertime ? 'border-amber-500/40 ring-1 ring-amber-500/20' : 'border-emerald-500/40 ring-1 ring-emerald-500/20') : ''
              }`}
              title={`${dayName}, ${dateStr} - ${timeStr} WIB. ${activeShift ? (isOvertime ? `Overtime: ${shiftCountdownStr}` : `Sisa Shift: ${shiftCountdownStr}`) : 'Shift Tutup'}. Klik untuk perluas menu [Ctrl+B]`}
            >
              <Clock className={`w-3.5 h-3.5 ${activeShift ? (isOvertime ? 'text-amber-500' : 'text-emerald-500') : 'text-primary'}`} />
              <span className="text-[8px] font-mono font-bold leading-none mt-1 text-text-primary">
                {shortTimeStr}
              </span>
              {activeShift && (
                <span className={`text-[7px] font-mono font-bold leading-none mt-0.5 ${isOvertime ? 'text-amber-500' : 'text-emerald-600 dark:text-emerald-400'}`}>
                  {isOvertime ? 'OVT' : `${Math.floor(remainingShiftMs/3600000)}j`}
                </span>
              )}
            </button>
          </div>
        )}
      </div>
    </aside>
  );
};

export default Sidebar;
