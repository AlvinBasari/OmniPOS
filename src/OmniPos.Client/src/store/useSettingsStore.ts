import { create } from 'zustand';
import { useCartStore } from './useCartStore';

export type RoundingRuleType = 'NONE' | 'NEAREST_100' | 'NEAREST_500';

interface SettingsState {
  isCfdEnabled: boolean;
  taxPercentage: number;
  serviceChargePercentage: number;
  roundingRule: RoundingRuleType;
  isLoading: boolean;

  setIsCfdEnabled: (enabled: boolean) => void;
  setTaxPercentage: (val: number) => void;
  setServiceChargePercentage: (val: number) => void;
  setRoundingRule: (rule: RoundingRuleType) => void;

  fetchSettings: () => Promise<void>;
  updateCfdSetting: (enabled: boolean) => Promise<boolean>;
  isSidebarCollapsed: boolean;
  setIsSidebarCollapsed: (val: boolean) => void;
  toggleSidebarCollapsed: () => void;

  updateTaxAndRoundingSettings: (
    tax: number,
    service: number,
    rounding: RoundingRuleType
  ) => Promise<boolean>;
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
  taxPercentage: (() => {
    try {
      const cached = localStorage.getItem('omnipos_tax_rate');
      return cached !== null ? parseFloat(cached) : 0;
    } catch {
      return 0;
    }
  })(),
  serviceChargePercentage: (() => {
    try {
      const cached = localStorage.getItem('omnipos_service_charge');
      return cached !== null ? parseFloat(cached) : 0;
    } catch {
      return 0;
    }
  })(),
  roundingRule: (() => {
    try {
      const cached = localStorage.getItem('omnipos_rounding_rule');
      return (cached as RoundingRuleType) || 'NEAREST_100';
    } catch {
      return 'NEAREST_100';
    }
  })(),
  isLoading: false,

  setIsCfdEnabled: (enabled: boolean) => {
    try {
      localStorage.setItem('omnipos_cfd_enabled', enabled ? 'true' : 'false');
    } catch {}
    set({ isCfdEnabled: enabled });
  },

  isSidebarCollapsed: (() => {
    try {
      return localStorage.getItem('omnipos_sidebar_collapsed') === 'true';
    } catch {
      return false;
    }
  })(),
  setIsSidebarCollapsed: (collapsed: boolean) => {
    try {
      localStorage.setItem('omnipos_sidebar_collapsed', collapsed ? 'true' : 'false');
    } catch {}
    set({ isSidebarCollapsed: collapsed });
  },
  toggleSidebarCollapsed: () => {
    const next = !get().isSidebarCollapsed;
    try {
      localStorage.setItem('omnipos_sidebar_collapsed', next ? 'true' : 'false');
    } catch {}
    set({ isSidebarCollapsed: next });
  },

  setTaxPercentage: (val: number) => {
    try {
      localStorage.setItem('omnipos_tax_rate', val.toString());
    } catch {}
    set({ taxPercentage: val });
    useCartStore.getState().setTaxPercentage(val);
  },

  setServiceChargePercentage: (val: number) => {
    try {
      localStorage.setItem('omnipos_service_charge', val.toString());
    } catch {}
    set({ serviceChargePercentage: val });
    useCartStore.getState().setServiceChargePercentage(val);
  },

  setRoundingRule: (rule: RoundingRuleType) => {
    try {
      localStorage.setItem('omnipos_rounding_rule', rule);
    } catch {}
    set({ roundingRule: rule });
    useCartStore.getState().setRoundingRule(rule);
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
            get().setIsCfdEnabled(cfdSetting.settingValue === 'true');
          }

          const taxSetting = settings.find((s: any) => s.settingKey === 'TAX_RATE_PERCENT');
          if (taxSetting) {
            const tax = parseFloat(taxSetting.settingValue) || 0;
            get().setTaxPercentage(tax);
          }

          const scSetting = settings.find((s: any) => s.settingKey === 'SERVICE_CHARGE_PERCENT');
          if (scSetting) {
            const sc = parseFloat(scSetting.settingValue) || 0;
            get().setServiceChargePercentage(sc);
          }

          const roundSetting = settings.find((s: any) => s.settingKey === 'ROUNDING_RULE');
          if (roundSetting) {
            const r = roundSetting.settingValue as RoundingRuleType;
            if (['NONE', 'NEAREST_100', 'NEAREST_500'].includes(r)) {
              get().setRoundingRule(r);
            }
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
  },

  updateTaxAndRoundingSettings: async (
    tax: number,
    service: number,
    rounding: RoundingRuleType
  ) => {
    get().setTaxPercentage(tax);
    get().setServiceChargePercentage(service);
    get().setRoundingRule(rounding);

    try {
      const payload = [
        { settingKey: 'TAX_RATE_PERCENT', settingValue: tax.toString() },
        { settingKey: 'SERVICE_CHARGE_PERCENT', settingValue: service.toString() },
        { settingKey: 'ROUNDING_RULE', settingValue: rounding }
      ];
      const res = await fetch('/api/v1/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      return res.ok;
    } catch {
      return false;
    }
  }
}));
