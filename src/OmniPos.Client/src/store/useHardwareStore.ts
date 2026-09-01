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
      // Fallback local status if server fails or is unreachable
      const fallbackStatus: HardwareStatus = {
        printer: {
          deviceType: 'ThermalPrinter',
          name: 'Printer Struk Thermal',
          status: 'Disconnected',
          isOnline: false,
          connectionMode: 'MANUAL_FALLBACK',
          details: 'Printer fisik tidak terhubung (Gunakan Cetak Browser/PDF)',
          fallbackInstruction: 'Sistem siap mencetak struk secara manual ke browser/PDF.'
        },
        cashDrawer: {
          deviceType: 'CashDrawer',
          name: 'Laci Kasir (Cash Drawer)',
          status: 'Disconnected',
          isOnline: false,
          connectionMode: 'ManualKey',
          details: 'Sinyal kick mati (Gunakan kunci fisik kasir)',
          fallbackInstruction: 'Buka laci secara manual menggunakan anak kunci.'
        },
        barcodeScanner: {
          deviceType: 'BarcodeScanner',
          name: 'Barcode Scanner (EAN-13 / PLU)',
          status: 'ManualOnly',
          isOnline: false,
          connectionMode: 'KeyboardManual',
          details: 'Scanner USB tidak terdeteksi (Gunakan tombol [F1]/[F2])',
          fallbackInstruction: 'Tekan [F1] untuk ketik barcode manual atau [F2] cari barang.'
        },
        digitalScale: {
          deviceType: 'DigitalScale',
          name: 'Timbangan Digital',
          status: 'ManualFallback',
          isOnline: false,
          connectionMode: 'ManualInput',
          details: 'Timbangan fisik offline (Kalkulator Timbang Manual Siap)',
          fallbackInstruction: 'Klik produk satuan KG/Gram untuk input timbangan manual.'
        },
        customerDisplay: {
          deviceType: 'CustomerFacingDisplay',
          name: 'Layar Pelanggan (CFD)',
          status: 'Disconnected',
          isOnline: false,
          connectionMode: 'SIGNALR',
          details: '0 Layar Terhubung (Buka /cfd di Monitor Kedua)'
        },
        kitchenDisplay: {
          deviceType: 'KitchenDisplaySystem',
          name: 'Layar Dapur (KDS)',
          status: 'Disconnected',
          isOnline: false,
          connectionMode: 'SIGNALR',
          details: '0 Layar Terhubung (Buka /kds di Monitor Dapur)'
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
