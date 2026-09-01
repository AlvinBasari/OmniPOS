import React, { useEffect } from 'react';
import { 
  Store, 
  Clock, 
  Palette, 
  Lock, 
  Wifi, 
  Cloud,
  Smartphone,
  LogOut,
  Printer
} from 'lucide-react';
import { useShiftStore, useThemeStore, ThemePreset } from '../../store/useShiftAndThemeStores';
import { useBusinessModeStore } from '../../store/useBusinessModeStore';
import { useAuthStore } from '../../store/useAuthStore';
import { useHardwareStore } from '../../store/useHardwareStore';

interface TopNavbarProps {
  onOpenOpenShiftModal: () => void;
  onOpenCloseShiftModal: () => void;
  onOpenCashMovementModal?: () => void;
}

export const TopNavbar: React.FC<TopNavbarProps> = ({ 
  onOpenOpenShiftModal,
  onOpenCloseShiftModal,
  onOpenCashMovementModal
}) => {
  const { activeShift } = useShiftStore();
  const { theme, setTheme, lockScreen } = useThemeStore();
  const { mode, edition, fetchInitialMode } = useBusinessModeStore();
  const { currentUser, logout } = useAuthStore();
  const { hardwareStatus, fetchHardwareStatus, setIsHardwareModalOpen } = useHardwareStore();

  useEffect(() => {
    fetchHardwareStatus();
    const interval = setInterval(() => {
      fetchHardwareStatus();
    }, 15000);
    return () => clearInterval(interval);
  }, [fetchHardwareStatus]);

  const cycleTheme = () => {
    const themes: ThemePreset[] = ['modern-light', 'deep-zinc-dark', 'high-contrast-mono', 'warm-linen'];
    const nextIdx = (themes.indexOf(theme) + 1) % themes.length;
    setTheme(themes[nextIdx]);
  };

  const getRoleDisplayName = (r?: string) => {
    switch (r) {
      case 'SuperAdmin': return '👑 Pemilik / Admin';
      case 'Manager': return '💼 Manajer';
      case 'Cashier': return '💵 Kasir';
      case 'InventoryStaff': return '📦 Staf Gudang';
      case 'Waiter': return '🍽️ Pelayan';
      case 'KitchenStaff': return '🍳 Koki';
      case 'Technician': return '✂️ Teknisi';
      default: return 'Karyawan';
    }
  };

  const editionLabel = edition?.displayName || (
    mode === 'Electronics' ? 'OmniPOS Gadget & Elektronik' :
    mode === 'Retail' ? 'OmniPOS Retail & Sembako' :
    mode === 'FoodAndBeverage' ? 'OmniPOS Resto & Cafe' :
    mode === 'Services' ? 'OmniPOS Jasa & Layanan' :
    mode === 'Pharmacy' ? 'OmniPOS Apotek & Farmasi' : 'OmniPOS'
  );

  const editionBadge = (
    mode === 'Electronics' ? 'Edisi Gadget & IMEI' :
    mode === 'Retail' ? 'Edisi Retail' :
    mode === 'FoodAndBeverage' ? 'Edisi Resto (F&B)' :
    mode === 'Services' ? 'Edisi Jasa' :
    mode === 'Pharmacy' ? 'Edisi Apotek' : 'Edisi Standar'
  );

  return (
    <header className="h-14 bg-surface border-b border-border-subtle flex items-center justify-between px-4 z-20 select-none">
      {/* Brand Display (Static Standalone Application) */}
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center text-primary-text font-bold shadow-sm">
          {mode === 'Electronics' ? <Smartphone className="w-4 h-4" /> : <Store className="w-4 h-4" />}
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h1 className="font-bold text-sm text-text-primary tracking-tight leading-none">
              {editionLabel}
            </h1>
            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-primary/10 text-primary border border-primary/20">
              {editionBadge}
            </span>
          </div>
          <p className="text-[10px] text-text-muted mt-0.5">
            {edition?.tagline || 'Sistem Kasir Desktop Mandiri Terenkripsi'}
          </p>
        </div>
      </div>

      {/* Center Status Indicators */}
      <div className="flex items-center gap-3">
        {/* Shift Badge */}
        {activeShift ? (
          <button 
            onClick={onOpenCloseShiftModal}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-status-success/10 border border-status-success/30 text-status-success text-xs font-semibold hover:bg-status-success/20 transition-colors"
          >
            <span className="w-2 h-2 rounded-full bg-status-success animate-pulse" />
            <span>Shift: {activeShift.cashierName}</span>
            <span className="text-text-muted font-normal">({activeShift.shiftNumber.split('-')[2]})</span>
          </button>
        ) : (
          <button 
            onClick={onOpenOpenShiftModal}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-status-warning/10 border border-status-warning/30 text-status-warning text-xs font-semibold hover:bg-status-warning/20 transition-colors"
          >
            <Clock className="w-3.5 h-3.5" />
            <span>Shift Belum Buka (Buka)</span>
          </button>
        )}

        {/* Real-time Hardware Status Pill */}
        <button
          onClick={() => setIsHardwareModalOpen(true)}
          title="Klik untuk diagnosa koneksi Printer, Laci Kas, Scanner, Timbangan, CFD & KDS"
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold border transition-all ${
            !hardwareStatus?.printer.isOnline
              ? 'bg-rose-500/10 border-rose-500/40 text-rose-600 animate-pulse'
              : hardwareStatus?.printer.status === 'Virtual'
              ? 'bg-amber-500/10 border-amber-500/30 text-amber-600 hover:bg-amber-500/20'
              : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-600 hover:bg-emerald-500/20'
          }`}
        >
          <Printer className="w-3.5 h-3.5" />
          <span>
            {!hardwareStatus?.printer.isOnline
              ? 'Hardware: Terputus (Mode Manual)'
              : hardwareStatus?.printer.status === 'Virtual'
              ? 'Hardware: Mode Virtual/Manual'
              : 'Hardware: Terhubung (Online)'}
          </span>
        </button>

        {/* Local LAN Mesh Indicator */}
        <div className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-subtle text-text-secondary text-xs border border-border-subtle">
          <Wifi className="w-3.5 h-3.5 text-status-success" />
          <span>LAN Mesh: Online</span>
        </div>

        {/* Kas Masuk / Kas Keluar Button */}
        {activeShift && onOpenCashMovementModal && (
          <button
            onClick={onOpenCashMovementModal}
            title="Catat Kas Masuk / Keluar / Setor Brankas"
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-subtle hover:bg-card-hover border border-border-subtle text-text-primary text-xs font-semibold transition-colors"
          >
            <span className="text-primary font-bold">Rp</span>
            <span>Kas In/Out</span>
          </button>
        )}

        {/* Google Drive Status Indicator */}
        <div className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-subtle text-text-secondary text-xs border border-border-subtle">
          <Cloud className="w-3.5 h-3.5 text-status-info" />
          <span>GDrive Sync: Siap</span>
        </div>
      </div>

      {/* Right Controls (User Info, Theme, Lock Screen & Logout) */}
      <div className="flex items-center gap-2">
        {/* Active Logged-in User Badge */}
        {currentUser && (
          <div className="flex items-center gap-2 px-2.5 py-1 rounded-lg bg-subtle border border-border-subtle text-xs">
            <div className="w-5 h-5 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-[10px]">
              {currentUser.fullName.charAt(0).toUpperCase()}
            </div>
            <div className="text-left leading-none">
              <p className="font-bold text-text-primary text-[11px] truncate max-w-[100px]">{currentUser.fullName}</p>
              <p className="text-[9px] text-text-muted">{getRoleDisplayName(currentUser.role)}</p>
            </div>
          </div>
        )}

        {/* Theme Switcher Button */}
        <button 
          onClick={cycleTheme}
          title={`Tema Aktif: ${theme} (Klik untuk ganti)`}
          className="flex items-center gap-1.5 px-2 py-1.5 rounded-md bg-subtle hover:bg-card-hover border border-border-subtle text-xs text-text-secondary transition-colors"
        >
          <Palette className="w-3.5 h-3.5" />
        </button>

        {/* Quick Lock Button */}
        <button 
          onClick={() => lockScreen(currentUser?.fullName || activeShift?.cashierName || 'Kasir')}
          title="Kunci Layar Kasir [F12]"
          className="flex items-center gap-1 px-2.5 py-1.5 rounded-md bg-subtle hover:bg-status-danger/10 hover:text-status-danger border border-border-subtle text-xs text-text-secondary transition-colors"
        >
          <Lock className="w-3.5 h-3.5" />
          <span>Kunci [F12]</span>
        </button>

        {/* Logout / Switch User Button */}
        <button 
          onClick={logout}
          title="Ganti Akun / Keluar"
          className="flex items-center gap-1 px-2 py-1.5 rounded-md bg-subtle hover:bg-status-danger/10 hover:text-status-danger border border-border-subtle text-xs text-text-secondary transition-colors"
        >
          <LogOut className="w-3.5 h-3.5" />
        </button>
      </div>
    </header>
  );
};
export default TopNavbar;
