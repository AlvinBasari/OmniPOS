import { create } from 'zustand';

interface SettingsState {
  isCfdEnabled: boolean;
  isLoading: boolean;
  setIsCfdEnabled: (enabled: boolean) => void;
  fetchSettings: () => Promise<void>;
  updateCfdSetting: (enabled: boolean) => Promise<boolean>;
}

export const useSettingsStore = create<SettingsState>((set, get) => ({
  isCfdEnabled: (() => {
    try {
      const cached = localStorage.getItem('omnipos_cfd_enabled');
      return cached === 'true'; // Default is false (hidden) unless turned on
    } catch {
      return false;
    }
  })(),
  isLoading: false,

  setIsCfdEnabled: (enabled: boolean) => {
    try {
      localStorage.setItem('omnipos_cfd_enabled', enabled ? 'true' : 'false');
    } catch {}
    set({ isCfdEnabled: enabled });
  },

  fetchSettings: async () => {
    try {
      set({ isLoading: true });
      const res = await fetch('/api/v1/settings');
      if (res.ok) {
        const settings = await res.json();
        if (Array.isArray(settings)) {
          const cfdSetting = settings.find((s: any) => s.settingKey === 'ENABLE_CFD');
          if (cfdSetting) {
            const isEnabled = cfdSetting.settingValue === 'true';
            get().setIsCfdEnabled(isEnabled);
          }
        }
      }
    } catch {
      // Keep local cached state
    } finally {
      set({ isLoading: false });
    }
  },

  updateCfdSetting: async (enabled: boolean) => {
    get().setIsCfdEnabled(enabled);
    try {
      const res = await fetch('/api/v1/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify([{ settingKey: 'ENABLE_CFD', settingValue: enabled ? 'true' : 'false' }])
      });
      return res.ok;
    } catch {
      return false;
    }
  }
}));
