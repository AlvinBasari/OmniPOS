import React from 'react';
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
  RotateCcw,
  Wrench,
  ShieldCheck,
  Radio,
  RefreshCw
} from 'lucide-react';
import { useBusinessModeStore } from '../../store/useBusinessModeStore';
import { useAuthStore } from '../../store/useAuthStore';

export type NavigationPage = 
  | 'pos' 
  | 'tables' 
  | 'kds' 
  | 'cfd' 
  | 'services'
  | 'electronics-serials'
  | 'sim-cards'
  | 'trade-in'
  | 'inventory' 
  | 'purchasing'
  | 'stock-opname'
  | 'price-tags'
  | 'promos'
  | 'expired-tracker'
  | 'returns'
  | 'shifts' 
  | 'customers' 
  | 'reports' 
  | 'backup' 
  | 'users'
  | 'settings';

interface SidebarProps {
  currentPage: NavigationPage;
  onNavigate: (page: NavigationPage) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ currentPage, onNavigate }) => {
  const { mode, edition } = useBusinessModeStore();
  const { currentUser } = useAuthStore();

  const userRole = currentUser?.role || 'SuperAdmin';
  const isAdminOrManager = userRole === 'SuperAdmin' || userRole === 'Manager';

  // Dynamic Navigation Items based on active business mode and User Role
  const getOperationalNavItems = () => {
    const items: Array<{ id: NavigationPage; label: string; icon: any }> = [];

    // Kasir POS
    if (isAdminOrManager || userRole === 'Cashier' || userRole === 'Technician') {
      const posLabel = mode === 'Retail' ? 'Kasir Retail [F1]'
        : mode === 'FoodAndBeverage' ? 'Kasir Resto [F1]'
        : mode === 'Services' ? 'Kasir Layanan [F1]'
        : mode === 'Pharmacy' ? 'Kasir Resep [F1]'
        : 'Kasir Gadget [F1]';
      const posIcon = mode === 'Services' ? Scissors : mode === 'Pharmacy' ? Pill : mode === 'Electronics' ? Smartphone : ShoppingCart;
      items.push({ id: 'pos', label: posLabel, icon: posIcon });
    }

    // Electronics Specific: Service Center, IMEI & Garansi, SIM & Nomor Cantik, Tukar Tambah
    if (mode === 'Electronics') {
      if (isAdminOrManager || userRole === 'Cashier' || userRole === 'Technician') {
        items.push({ id: 'services', label: 'Pusat Servis (SPK)', icon: Wrench });
        items.push({ id: 'electronics-serials', label: 'IMEI & Cek Garansi', icon: ShieldCheck });
        items.push({ id: 'sim-cards', label: 'Nomor Cantik & SIM', icon: Radio });
        items.push({ id: 'trade-in', label: 'Tukar Tambah (Trade-In)', icon: RefreshCw });
      }
    }

    // F&B Specific: Meja & KDS
    if (mode === 'FoodAndBeverage') {
      if (isAdminOrManager || userRole === 'Cashier' || userRole === 'Waiter') {
        items.push({ id: 'tables', label: 'Denah Meja [F7]', icon: UtensilsCrossed });
      }
      if (isAdminOrManager || userRole === 'KitchenStaff' || userRole === 'Waiter') {
        items.push({ id: 'kds', label: 'Dapur (KDS)', icon: ChefHat });
      }
    }

    // Customer Display
    if (isAdminOrManager || userRole === 'Cashier') {
      items.push({ id: 'cfd', label: 'Layar Pelanggan', icon: Monitor });
    }

    return items;
  };

  const getManagementNavItems = () => {
    const items: Array<{ id: NavigationPage; label: string; icon: any }> = [];

    // Stok & Katalog (Admin, Manager, InventoryStaff)
    if (isAdminOrManager || userRole === 'InventoryStaff') {
      items.push({ id: 'inventory', label: mode === 'Retail' ? 'Stok & Grosir' : 'Katalog & Stok', icon: Boxes });
      items.push({ id: 'purchasing', label: 'Pembelian & Supplier', icon: Truck });
      items.push({ id: 'stock-opname', label: 'Stock Opname Digital', icon: ClipboardCheck });
      items.push({ id: 'price-tags', label: 'Cetak Label Barcode', icon: Tag });
      items.push({ id: 'expired-tracker', label: 'Pantau Kadaluarsa', icon: Clock });
    }

    // Retur Penjualan & Promo
    if (isAdminOrManager || userRole === 'Cashier') {
      items.push({ id: 'returns', label: 'Retur Penjualan', icon: RotateCcw });
      items.push({ id: 'promos', label: 'Promo & Bundling', icon: Gift });
    }

    // Shift & Kas Laci (Admin, Manager, Cashier)
    if (isAdminOrManager || userRole === 'Cashier') {
      items.push({ id: 'shifts', label: 'Kas & Shift [F10]', icon: Receipt });
    }

    // CRM & Kasbon (Admin, Manager, Cashier)
    if (isAdminOrManager || userRole === 'Cashier') {
      items.push({ id: 'customers', label: 'CRM & Kasbon [F3]', icon: Users });
    }

    // Laporan Finansial (Admin, Manager only)
    if (isAdminOrManager) {
      items.push({ id: 'reports', label: 'Laporan Finansial', icon: BarChart3 });
    }

    // Kelola Karyawan & Hak Akses (Admin only)
    if (userRole === 'SuperAdmin') {
      items.push({ id: 'users', label: 'Karyawan & Akses', icon: UserCheck });
    }

    // Google Drive Backup (Admin only)
    if (userRole === 'SuperAdmin') {
      items.push({ id: 'backup', label: 'Google Drive', icon: HardDriveDownload });
    }

    // Pengaturan Toko (Admin only)
    if (userRole === 'SuperAdmin') {
      items.push({ id: 'settings', label: 'Pengaturan Toko', icon: Settings });
    }

    return items;
  };

  const operationalNavItems = getOperationalNavItems();
  const managementNavItems = getManagementNavItems();

  return (
    <aside className="w-56 bg-surface border-r border-border-subtle flex flex-col justify-between p-2 select-none">
      <div className="space-y-1 overflow-y-auto">
        {operationalNavItems.length > 0 && (
          <>
            <div className="px-3 py-1.5 text-[11px] font-bold text-text-muted tracking-wider uppercase flex items-center justify-between">
              <span>Menu Kasir</span>
              <span className="text-[10px] px-1 rounded bg-primary/10 text-primary font-mono">{mode}</span>
            </div>
            {operationalNavItems.map((item) => {
              const Icon = item.icon;
              const isActive = currentPage === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => onNavigate(item.id)}
                  className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-md text-xs font-semibold transition-colors text-left ${
                    isActive
                      ? 'bg-primary text-primary-text shadow-sm'
                      : 'text-text-secondary hover:bg-card-hover hover:text-text-primary'
                  }`}
                >
                  <Icon className="w-4 h-4 flex-shrink-0" />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </>
        )}

        {managementNavItems.length > 0 && (
          <>
            <div className="pt-3 px-3 py-1.5 text-[11px] font-bold text-text-muted tracking-wider uppercase">
              Manajemen & Data
            </div>
            {managementNavItems.map((item) => {
              const Icon = item.icon;
              const isActive = currentPage === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => onNavigate(item.id)}
                  className={`w-full flex items-center gap-2.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-colors text-left ${
                    isActive
                      ? 'bg-primary text-primary-text shadow-sm'
                      : 'text-text-secondary hover:bg-card-hover hover:text-text-primary'
                  }`}
                >
                  <Icon className="w-4 h-4 flex-shrink-0" />
                  <span className="truncate">{item.label}</span>
                </button>
              );
            })}
          </>
        )}
      </div>

      {/* System Status Footer */}
      <div className="p-2.5 rounded-lg bg-subtle border border-border-subtle text-[11px] text-text-muted space-y-0.5 mt-2">
        <div className="flex items-center justify-between">
          <p className="font-bold text-text-primary">OmniPOS Enterprise</p>
          <span className="w-1.5 h-1.5 rounded-full bg-status-success" />
        </div>
        <p className="text-[10px] text-text-secondary truncate">
          Edisi: <strong className="text-text-primary">{edition?.displayName || mode}</strong>
        </p>
        <div className="flex items-center justify-between pt-1 border-t border-border-subtle mt-1 text-[10px]">
          <span className="text-text-muted">Akun:</span>
          <span className="font-bold text-text-primary truncate max-w-[120px]">
            {currentUser ? currentUser.fullName : 'Admin'}
          </span>
        </div>
      </div>
    </aside>
  );
};
export default Sidebar;
