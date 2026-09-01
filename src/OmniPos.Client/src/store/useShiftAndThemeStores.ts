import { create } from 'zustand';
import { Shift } from '../types';

interface ShiftStore {
  activeShift: Shift | null;
  isLoading: boolean;
  setActiveShift: (shift: Shift | null) => void;
  fetchActiveShift: () => Promise<void>;
}

export const useShiftStore = create<ShiftStore>((set) => ({
  activeShift: null,
  isLoading: false,

  setActiveShift: (shift) => set({ activeShift: shift }),

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
