import React from 'react';
import { 
  ShieldAlert, 
  Lock, 
  ArrowRight, 
  X, 
  AlertTriangle, 
  Receipt, 
  DollarSign,
  LogOut
} from 'lucide-react';
import { useShiftStore, useThemeStore } from '../../store/useShiftAndThemeStores';
import { useAuthStore } from '../../store/useAuthStore';

export const LogoutGuardModal: React.FC = () => {
  const { 
    activeShift, 
    isLogoutGuardOpen, 
    setIsLogoutGuardOpen,
    setDashboardInitialTab 
  } = useShiftStore();
  const { lockScreen } = useThemeStore();
  const { logout, currentUser } = useAuthStore();

  const isAdmin = currentUser?.role === 'SuperAdmin' || currentUser?.role === 'Manager' || currentUser?.role === 'Supervisor' || (currentUser?.role as string) === 'Admin';
  if (!isLogoutGuardOpen || !activeShift || isAdmin) return null;

  const handleCloseAndGoToDashboard = () => {
    setIsLogoutGuardOpen(false);
    setDashboardInitialTab('closing');
    window.dispatchEvent(new CustomEvent('omnipos-navigate', { detail: 'shifts' }));
  };

  const handleLockScreenOnly = () => {
    setIsLogoutGuardOpen(false);
    lockScreen(currentUser?.fullName || activeShift.cashierName);
  };

  const handleForceLogout = () => {
    setIsLogoutGuardOpen(false);
    logout();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4 select-none">
      <div className="bg-surface border border-status-warning/40 w-full max-w-md rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        
        {/* Header with Warning Icon */}
        <div className="p-5 bg-status-warning/10 border-b border-status-warning/20 flex items-start gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-status-warning/20 text-status-warning flex items-center justify-center shrink-0">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <div className="flex-1">
            <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded bg-status-warning/20 text-status-warning">
              Peringatan Keamanan Shift
            </span>
            <h3 className="text-base font-extrabold text-text-primary mt-1">
              Shift Kasir Sedang Aktif!
            </h3>
            <p className="text-xs text-text-secondary mt-0.5">
              Kasir bertugas: <strong className="text-text-primary">{activeShift.cashierName}</strong>
            </p>
          </div>
          <button 
            onClick={() => setIsLogoutGuardOpen(false)}
            className="p-1 rounded-lg text-text-muted hover:text-text-primary hover:bg-subtle transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 space-y-4">
          <div className="p-3.5 rounded-xl bg-card border border-border-subtle space-y-2 text-xs">
            <div className="flex justify-between items-center">
              <span className="text-text-secondary flex items-center gap-1.5">
                <Receipt className="w-3.5 h-3.5 text-primary" /> Struk Terlayani:
              </span>
              <span className="font-bold font-mono text-text-primary">
                {activeShift.totalTransactions} Transaksi
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-text-secondary flex items-center gap-1.5">
                <DollarSign className="w-3.5 h-3.5 text-status-success" /> Kas Diharapkan di Laci:
              </span>
              <span className="font-extrabold font-mono text-status-success text-sm">
                Rp {activeShift.expectedCash.toLocaleString('id-ID')}
              </span>
            </div>
          </div>

          <p className="text-xs text-text-secondary leading-relaxed">
            Untuk menjaga akurasi pembukuan dan mencegah selisih uang kas tanpa pertanggungjawaban, silakan lakukan <strong>Tutup Shift & Konfirmasi Kas</strong> sebelum keluar.
          </p>

          {/* Action Buttons */}
          <div className="space-y-2.5 pt-1">
            {/* Primary Action: Go to Dashboard Closing */}
            <button
              onClick={handleCloseAndGoToDashboard}
              className="w-full py-3 px-4 rounded-xl bg-primary hover:bg-primary-hover text-primary-text font-bold text-xs flex items-center justify-center gap-2 shadow-sm transition-all"
            >
              <span>Buka Dashboard Kasir & Tutup Shift</span>
              <ArrowRight className="w-4 h-4" />
            </button>

            {/* Secondary Action: Lock Screen (For breaks) */}
            <button
              onClick={handleLockScreenOnly}
              className="w-full py-2.5 px-4 rounded-xl bg-card hover:bg-card-hover border border-border-strong text-text-primary font-bold text-xs flex items-center justify-center gap-2 transition-all"
            >
              <Lock className="w-4 h-4 text-text-muted" />
              <span>Hanya Kunci Layar (Istirahat / Toilet)</span>
            </button>

            {/* Cancel */}
            <button
              onClick={() => setIsLogoutGuardOpen(false)}
              className="w-full py-2 text-text-muted hover:text-text-primary text-xs font-semibold transition-colors"
            >
              Batal, Kembali ke Layar Kasir
            </button>
          </div>

          {/* Supervisor / Force Logout Option */}
          <div className="pt-2 border-t border-border-subtle/60 text-center">
            <button
              onClick={handleForceLogout}
              className="text-[11px] text-text-muted hover:text-status-danger underline transition-colors"
            >
              Keluar Paksa Tanpa Tutup Shift (Khusus Supervisor/Darurat)
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
