import { create } from 'zustand';
import { HardwareStatus, Product } from '../types';
import { useToastStore } from './useToastStore';

interface HardwareStoreState {
  hardwareStatus: HardwareStatus | null;
  isLoading: boolean;
  lastCheckTime: Date | null;
  isHardwareModalOpen: boolean;
  
  // Browser Print Fallback Modal State
  isBrowserPrintOpen: boolean;
  browserPrintData: any | null;

  // Manual Scale Modal State
  isManualScaleOpen: boolean;
  scaleTargetProduct: Product | null;

  // Actions
  fetchHardwareStatus: () => Promise<HardwareStatus | null>;
  testPrinter: () => Promise<boolean>;
  testCashDrawer: () => Promise<boolean>;
  
  setIsHardwareModalOpen: (open: boolean) => void;
  openBrowserPrint: (orderData: any) => void;
  closeBrowserPrint: () => void;
  openManualScale: (product: Product) => void;
  closeManualScale: () => void;
}

export const useHardwareStore = create<HardwareStoreState>((set, get) => ({
  hardwareStatus: null,
  isLoading: false,
  lastCheckTime: null,
  isHardwareModalOpen: false,
  
  isBrowserPrintOpen: false,
  browserPrintData: null,

  isManualScaleOpen: false,
  scaleTargetProduct: null,

  fetchHardwareStatus: async () => {
    try {
      set({ isLoading: true });
      const res = await fetch('/api/v1/hardware/status');
      if (res.ok) {
        const data: HardwareStatus = await res.json();
        set({ hardwareStatus: data, lastCheckTime: new Date(), isLoading: false });
        return data;
      }
    } catch {
      // Fallback local status if server fails
      const fallbackStatus: HardwareStatus = {
        printer: {
          deviceType: 'ThermalPrinter',
          name: 'Printer Struk Thermal',
          status: 'Virtual',
          isOnline: true,
          connectionMode: 'VIRTUAL',
          details: 'Mode Spooler Virtual / Fallback Browser',
          fallbackInstruction: 'Sistem siap mencetak struk secara manual ke browser/PDF.'
        },
        cashDrawer: {
          deviceType: 'CashDrawer',
          name: 'Laci Kasir (Cash Drawer)',
          status: 'ManualOnly',
          isOnline: true,
          connectionMode: 'ManualKey',
          details: 'Gunakan kunci fisik kasir',
          fallbackInstruction: 'Buka laci secara manual menggunakan anak kunci.'
        },
        barcodeScanner: {
          deviceType: 'BarcodeScanner',
          name: 'Barcode Scanner (EAN-13 / PLU)',
          status: 'Connected',
          isOnline: true,
          connectionMode: 'USB_HID_Wedge',
          details: 'Keyboard Wedge Input [F1]',
          fallbackInstruction: 'Tekan [F1] untuk ketik barcode manual.'
        },
        digitalScale: {
          deviceType: 'DigitalScale',
          name: 'Timbangan Digital',
          status: 'ManualFallback',
          isOnline: true,
          connectionMode: 'ManualInput',
          details: 'Kalkulator Timbang Manual Gram / Kg',
          fallbackInstruction: 'Klik produk timbang untuk input berat manual.'
        },
        customerDisplay: {
          deviceType: 'CustomerFacingDisplay',
          name: 'Layar Pelanggan (CFD)',
          status: 'Connected',
          isOnline: true,
          connectionMode: 'SIGNALR',
          details: 'Real-time WebSocket'
        },
        kitchenDisplay: {
          deviceType: 'KitchenDisplaySystem',
          name: 'Layar Dapur (KDS)',
          status: 'Connected',
          isOnline: true,
          connectionMode: 'SIGNALR',
          details: 'Real-time KDS Hub'
        },
        checkedAt: new Date().toISOString()
      };
      set({ hardwareStatus: fallbackStatus, lastCheckTime: new Date(), isLoading: false });
      return fallbackStatus;
    } finally {
      set({ isLoading: false });
    }
    return null;
  },

  testPrinter: async () => {
    try {
      useToastStore.getState().showToast('Mengirim tes cetak ke printer...', 'info');
      const res = await fetch('/api/v1/hardware/test/printer', { method: 'POST' });
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          useToastStore.getState().showToast('Tes cetak fisik berhasil dikirim!', 'success');
          return true;
        }
      }
      useToastStore.getState().showToast('Printer fisik tidak merespon. Mengalihkan ke mode cetak browser...', 'warning');
      return false;
    } catch {
      useToastStore.getState().showToast('Gagal menghubungi printer fisik. Beralih ke fallback manual.', 'error');
      return false;
    }
  },

  testCashDrawer: async () => {
    try {
      useToastStore.getState().showToast('Mengirim sinyal buka laci (kick)...', 'info');
      const res = await fetch('/api/v1/hardware/test/drawer', { method: 'POST' });
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          useToastStore.getState().showToast('Sinyal kick laci kas berhasil dikirim!', 'success');
          return true;
        }
      }
      useToastStore.getState().showToast('Laci tidak otomatis terbuka. Silakan buka manual dengan kunci fisik.', 'warning');
      return false;
    } catch {
      useToastStore.getState().showToast('Laci tidak terhubung listrik. Gunakan kunci fisik kasir.', 'warning');
      return false;
    }
  },

  setIsHardwareModalOpen: (open: boolean) => set({ isHardwareModalOpen: open }),

  openBrowserPrint: (orderData: any) => set({ isBrowserPrintOpen: true, browserPrintData: orderData }),
  closeBrowserPrint: () => set({ isBrowserPrintOpen: false, browserPrintData: null }),

  openManualScale: (product: Product) => set({ isManualScaleOpen: true, scaleTargetProduct: product }),
  closeManualScale: () => set({ isManualScaleOpen: false, scaleTargetProduct: null })
}));
