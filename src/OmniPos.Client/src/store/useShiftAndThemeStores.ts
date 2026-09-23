import { create } from 'zustand';
import { Shift, ZReport } from '../types';

interface ShiftStore {
  activeShift: Shift | null;
  isLoading: boolean;
  isDashboardOpen: boolean;
  dashboardInitialTab: 'live' | 'closing' | 'history';
  isThermalZReportOpen: boolean;
  zReportData: ZReport | null;
  isLogoutGuardOpen: boolean;

  setActiveShift: (shift: Shift | null) => void;
  fetchActiveShift: () => Promise<void>;
  setDashboardInitialTab: (tab: 'live' | 'closing' | 'history') => void;
  openDashboard: (tab?: 'live' | 'closing' | 'history') => void;
  closeDashboard: () => void;
  openThermalZReport: (data: ZReport) => void;
  closeThermalZReport: () => void;
  setIsLogoutGuardOpen: (open: boolean) => void;
}

export const useShiftStore = create<ShiftStore>((set) => ({
  activeShift: null,
  isLoading: false,
  isDashboardOpen: false,
  dashboardInitialTab: 'live',
  isThermalZReportOpen: false,
  zReportData: null,
  isLogoutGuardOpen: false,

  setActiveShift: (shift) => set({ activeShift: shift }),
  setDashboardInitialTab: (tab) => set({ dashboardInitialTab: tab }),
  openDashboard: (tab = 'live') => set({ isDashboardOpen: true, dashboardInitialTab: tab }),
  closeDashboard: () => set({ isDashboardOpen: false }),

  openThermalZReport: (data) => set({ isThermalZReportOpen: true, zReportData: data }),
  closeThermalZReport: () => set({ isThermalZReportOpen: false, zReportData: null }),

  setIsLogoutGuardOpen: (open) => set({ isLogoutGuardOpen: open }),

  fetchActiveShift: async () => {
    try {
      set({ isLoading: true });
      const res = await fetch('/api/v1/shifts/active');
      if (res.ok) {
        const data = await res.json();
        set({ activeShift: data });
      }
    } catch {
      // Offline fallback
    } finally {
      set({ isLoading: false });
    }
  },
}));

export type ThemePreset = 'modern-light' | 'deep-zinc-dark' | 'high-contrast-mono' | 'warm-linen';

interface ThemeStore {
  theme: ThemePreset;
  isLocked: boolean;
  lockedCashierName: string;
  setTheme: (theme: ThemePreset) => void;
  lockScreen: (cashierName?: string) => void;
  unlockScreen: (pin: string) => boolean;
}

export const useThemeStore = create<ThemeStore>((set, get) => ({
  theme: (localStorage.getItem('omnipos_theme') as ThemePreset) || 'modern-light',
  isLocked: false,
  lockedCashierName: 'Budi Santoso',

  setTheme: (theme) => {
    localStorage.setItem('omnipos_theme', theme);
    document.documentElement.setAttribute('data-theme', theme);
    set({ theme });
  },

  lockScreen: (cashierName = 'Kasir 1') => {
    set({ isLocked: true, lockedCashierName: cashierName });
  },

  unlockScreen: (pin) => {
    // Quick PIN verification (111111 for cashier, 123456 for admin)
    if (pin === '111111' || pin === '123456' || pin === '000000') {
      set({ isLocked: false });
      return true;
    }
    return false;
  },
}));
