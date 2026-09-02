import React, { useEffect } from 'react';
import { 
  Clock, 
  Lock, 
  Wifi, 
  Cloud,
  Smartphone,
  LogOut,
  Printer,
  ChevronRight,
  ShieldCheck,
  Zap,
  DollarSign
} from 'lucide-react';
import { useShiftStore, useThemeStore } from '../../store/useShiftAndThemeStores';
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
  const { lockScreen } = useThemeStore();
  const { mode, edition } = useBusinessModeStore();
  const { currentUser, logout } = useAuthStore();
  const { hardwareStatus, fetchHardwareStatus, setIsHardwareModalOpen, setIsMobileScannerModalOpen } = useHardwareStore();

  useEffect(() => {
    fetchHardwareStatus();
    const interval = setInterval(() => {
      fetchHardwareStatus();
    }, 15000);
    return () => clearInterval(interval);
  }, [fetchHardwareStatus]);

  const getRoleDisplayName = (r?: string) => {
    switch (r) {
      case 'SuperAdmin': return 'Super Admin';
      case 'Manager': return 'Manager';
      case 'Cashier': return 'Kasir';
      case 'InventoryStaff': return 'Staf Gudang';
      case 'Waiter': return 'Waiter';
      case 'KitchenStaff': return 'Dapur';
      case 'Technician': return 'Teknisi';
      default: return 'Karyawan';
    }
  };

  const getEditionName = () => {
    switch (mode) {
      case 'Retail': return 'Retail & Minimarket';
      case 'FoodAndBeverage': return 'Resto & Kafe';
      case 'Electronics': return 'Gadget & Elektronik';
      case 'Services': return 'Layanan & Barbershop';
      case 'Pharmacy': return 'Apotek & Farmasi';
      default: return 'Point of Sale';
    }
  };

  const isPrinterOnline = hardwareStatus?.printer.isOnline ?? false;
  const isPrinterVirtual = hardwareStatus?.printer.status === 'Virtual';

  return (
    <header className="h-14 bg-surface border-b border-border-subtle flex items-center justify-between px-4 z-20 select-none">
      {/* 1. Left Brand & Edition Section */}
      <div className="flex items-center gap-3">
        {/* Sleek Minimalist Geometric Brand Emblem */}
        <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center text-primary-text font-black text-sm tracking-tighter shadow-sm">
          OP
        </div>
        
        <div className="flex items-center gap-2.5">
          <div>
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-sm text-text-primary tracking-tight leading-none">
                OmniPOS
              </span>
              <span className="text-[11px] font-semibold text-text-secondary tracking-normal">
                {getEditionName()}
              </span>
            </div>
            <p className="text-[10px] text-text-muted mt-0.5 leading-none">
              BASARI IT SOLUTIONS Enterprise
            </p>
          </div>

          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
            {mode}
          </span>
        </div>
      </div>

      {/* 2. Center Telemetry & Operational Control Bar */}
      <div className="flex items-center gap-2">
        {/* Shift Operational Status Button */}
        {activeShift ? (
          <button 
            onClick={onOpenCloseShiftModal}
            title="Shift kasir aktif. Klik untuk rekap kas & tutup shift."
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-status-success/10 border border-status-success/30 text-status-success text-xs font-semibold hover:bg-status-success/20 transition-all"
          >
            <span className="w-2 h-2 rounded-full bg-status-success animate-pulse" />
            <span>Shift: {activeShift.cashierName}</span>
            <span className="text-[10px] opacity-75 font-normal">#{activeShift.shiftNumber.split('-')[2] || '01'}</span>
          </button>
        ) : (
          <button 
            onClick={onOpenOpenShiftModal}
            title="Shift belum dibuka. Klik untuk modal kas awal & mulai transaksi."
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-status-warning/10 border border-status-warning/30 text-status-warning text-xs font-semibold hover:bg-status-warning/20 transition-all"
          >
            <span className="w-2 h-2 rounded-full bg-status-warning" />
            <span>Shift Tutup (Buka)</span>
          </button>
        )}

        {/* Real-time Hardware Diagnostics Button */}
        <button
          onClick={() => setIsHardwareModalOpen(true)}
          title="Status perangkat keras (Printer, Laci Kasir, Scanner, CFD). Klik untuk diagnosa."
          className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-all ${
            !isPrinterOnline
              ? 'bg-status-danger/10 border-status-danger/30 text-status-danger hover:bg-status-danger/20'
              : isPrinterVirtual
              ? 'bg-status-warning/10 border-status-warning/30 text-status-warning hover:bg-status-warning/20'
              : 'bg-subtle border-border-subtle text-text-secondary hover:bg-card-hover'
          }`}
        >
          <span className={`w-2 h-2 rounded-full ${
            !isPrinterOnline ? 'bg-status-danger' : isPrinterVirtual ? 'bg-status-warning' : 'bg-status-success'
          }`} />
          <Printer className="w-3.5 h-3.5" />
          <span>
            {!isPrinterOnline ? 'Hardware Offline' : isPrinterVirtual ? 'Hardware Virtual' : 'Hardware Siap'}
          </span>
        </button>

        {/* Quick Cash Movement (Kas Masuk / Kas Keluar) */}
        {activeShift && onOpenCashMovementModal && (
          <button
            onClick={onOpenCashMovementModal}
            title="Catat Kas Masuk, Kas Keluar, atau Setor Uang ke Brankas"
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-subtle hover:bg-card-hover border border-border-subtle text-text-secondary hover:text-text-primary text-xs font-medium transition-colors"
          >
            <DollarSign className="w-3.5 h-3.5 text-primary" />
            <span>Kas In/Out</span>
          </button>
        )}

        {/* Connectivity Telemetry Capsule */}
        <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-subtle border border-border-subtle text-text-muted text-xs">
          <div className="flex items-center gap-1" title="Jaringan Mesh LAN Lokal: Aktif & Terhubung">
            <Wifi className="w-3.5 h-3.5 text-status-success" />
            <span className="text-[11px] hidden lg:inline">LAN</span>
          </div>
          <span className="text-border-subtle">|</span>
          <div className="flex items-center gap-1" title="Sinkronisasi Backup Google Drive: Siap">
            <Cloud className="w-3.5 h-3.5 text-status-info" />
            <span className="text-[11px] hidden lg:inline">Cloud</span>
          </div>
          <span className="text-border-subtle">|</span>
          <button 
            onClick={() => setIsMobileScannerModalOpen(true)}
            title="Scanner HP Android. Klik untuk sambungkan kamera HP."
            className="flex items-center gap-1 hover:text-primary transition-colors"
          >
            <Smartphone className="w-3.5 h-3.5 text-primary" />
            <span className="text-[11px] hidden lg:inline">HP Scan</span>
          </button>
        </div>
      </div>

      {/* 3. Right Profile & Security Controls */}
      <div className="flex items-center gap-2">
        {/* User Profile Pill */}
        {currentUser && (
          <div className="flex items-center gap-2 px-2.5 py-1 rounded-lg bg-subtle border border-border-subtle text-xs">
            <div className="w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-[11px]">
              {currentUser.fullName.charAt(0).toUpperCase()}
            </div>
            <div className="text-left leading-tight pr-1">
              <p className="font-semibold text-text-primary text-[12px] truncate max-w-[120px]">
                {currentUser.fullName}
              </p>
              <p className="text-[10px] text-text-muted font-normal">
                {getRoleDisplayName(currentUser.role)}
              </p>
            </div>
          </div>
        )}

        <div className="h-5 w-px bg-border-subtle mx-0.5" />

        {/* Quick Lock Button */}
        <button 
          onClick={() => lockScreen(currentUser?.fullName || activeShift?.cashierName || 'Kasir')}
          title="Kunci Layar Kasir [F12]"
          className="p-2 rounded-lg bg-subtle hover:bg-card-hover text-text-secondary hover:text-text-primary border border-border-subtle transition-colors"
        >
          <Lock className="w-4 h-4" />
        </button>

        {/* Logout / Switch User Button */}
        <button 
          onClick={logout}
          title="Keluar / Ganti Akun Pengguna"
          className="p-2 rounded-lg bg-subtle hover:bg-status-danger/10 text-text-secondary hover:text-status-danger border border-border-subtle transition-colors"
        >
          <LogOut className="w-4 h-4" />
        </button>
      </div>
    </header>
  );
};
export default TopNavbar;
