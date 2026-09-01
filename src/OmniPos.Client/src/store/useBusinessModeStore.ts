import { create } from 'zustand';
import { BusinessMode } from '../types';

export interface EditionInfo {
  editionKey: string;
  businessMode: BusinessMode;
  displayName: string;
  tagline: string;
  dbPath: string;
}

interface BusinessModeState {
  mode: BusinessMode;
  edition: EditionInfo | null;
  fetchInitialMode: () => Promise<void>;
}

export const useBusinessModeStore = create<BusinessModeState>((set) => ({
  mode: 'Retail',
  edition: null,

  fetchInitialMode: async () => {
    try {
      const res = await fetch('/api/v1/system/edition');
      if (res.ok) {
        const editionData: EditionInfo = await res.json();
        set({
          mode: editionData.businessMode,
          edition: editionData
        });
        localStorage.setItem('omnipos_business_mode', editionData.businessMode);
      }
    } catch {
      // Fallback
      set({
        mode: 'Retail',
        edition: {
          editionKey: 'retail',
          businessMode: 'Retail',
          displayName: 'OmniPOS Retail & Minimarket',
          tagline: 'Sistem Kasir Barcode Kilat, Grosir & Buku Kasbon',
          dbPath: 'pos_retail.db'
        }
      });
    }
  },
}));
