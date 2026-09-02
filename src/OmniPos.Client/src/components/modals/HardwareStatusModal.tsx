import React, { useEffect } from 'react';
import { 
  Printer, 
  Archive, 
  Barcode, 
  Scale, 
  Monitor, 
  ChefHat, 
  RefreshCw, 
  CheckCircle2, 
  AlertTriangle, 
  XCircle, 
  Wifi, 
  Settings, 
  ExternalLink,
  ShieldCheck,
  Zap,
  Info,
  Smartphone
} from 'lucide-react';
import { useHardwareStore } from '../../store/useHardwareStore';
import { useBusinessModeStore } from '../../store/useBusinessModeStore';

export const HardwareStatusModal: React.FC = () => {
  const { 
    isHardwareModalOpen, 
    setIsHardwareModalOpen, 
    hardwareStatus, 
    fetchHardwareStatus, 
    isLoading,
    testPrinter,
    testCashDrawer 
  } = useHardwareStore();
  const { mode, edition } = useBusinessModeStore();

  useEffect(() => {
    if (isHardwareModalOpen) {
      fetchHardwareStatus();
    }
  }, [isHardwareModalOpen, fetchHardwareStatus]);

  if (!isHardwareModalOpen) return null;

  const allDevices = hardwareStatus ? [
    {
      key: 'printer',
      item: hardwareStatus.printer,
      icon: <Printer className="w-5 h-5 text-primary" />,
      actionText: 'Tes Cetak Slip',
      onAction: testPrinter,
      supportedModes: ['Retail', 'Electronics', 'FoodAndBeverage', 'Services', 'Pharmacy']
    },
    {
      key: 'cashDrawer',
      item: hardwareStatus.cashDrawer,
      icon: <Archive className="w-5 h-5 text-amber-500" />,
      actionText: 'Tes Buka Laci',
      onAction: testCashDrawer,
      supportedModes: ['Retail', 'Electronics', 'FoodAndBeverage', 'Services', 'Pharmacy']
    },
    {
      key: 'barcodeScanner',
      item: hardwareStatus.barcodeScanner,
      icon: <Barcode className="w-5 h-5 text-emerald-500" />,
      actionText: 'Mode Keyboard Wedge',
      onAction: () => alert('Scanner USB beroperasi sebagai Keyboard Wedge. Arahkan barcode ke kolom scan [F1] atau pencarian katalog [F2].'),
      supportedModes: ['Retail', 'Electronics', 'Pharmacy']
    },
    {
      key: 'digitalScale',
      item: hardwareStatus.digitalScale,
      icon: <Scale className="w-5 h-5 text-purple-500" />,
      actionText: 'Kalkulator Timbang',
      onAction: () => alert('Mode timbangan manual aktif. Saat kasir mengklik produk kiloan (KG/Gram), popup timbangan manual akan muncul otomatis.'),
      supportedModes: ['Retail']
    },
    {
      key: 'customerDisplay',
      item: hardwareStatus.customerDisplay,
      icon: <Monitor className="w-5 h-5 text-blue-500" />,
      actionText: 'Buka CFD Layar 2',
      onAction: () => window.open('/cfd', '_blank'),
      supportedModes: ['Retail', 'Electronics', 'FoodAndBeverage', 'Services', 'Pharmacy']
    },
    {
      key: 'kitchenDisplay',
      item: hardwareStatus.kitchenDisplay,
      icon: <ChefHat className="w-5 h-5 text-rose-500" />,
      actionText: 'Buka Layar KDS',
      onAction: () => window.open('/kds', '_blank'),
      supportedModes: ['FoodAndBeverage']
    },
    {
      key: 'mobileScanner',
      item: hardwareStatus.mobileScanner || {
        deviceType: 'MobileScanner',
        name: 'Scanner Barcode HP Android',
        status: 'Disconnected',
        isOnline: false,
        connectionMode: 'WiFi_Camera_Scan',
        details: 'Gunakan kamera HP Android sebagai scanner nirkabel kasir',
        fallbackInstruction: 'Buka scanner di browser HP atau scan QR pairing.'
      },
      icon: <Smartphone className="w-5 h-5 text-indigo-500" />,
      actionText: 'Buka QR Pair HP',
      onAction: () => {
        setIsHardwareModalOpen(false);
        useHardwareStore.getState().setIsMobileScannerModalOpen(true);
      },
      supportedModes: ['Retail', 'Electronics', 'Pharmacy', 'Services', 'FoodAndBeverage']
    }
  ] : [];

  const devices = allDevices.filter(d => d.supportedModes.includes(mode));
  const onlineCount = devices.filter(d => d.item.isOnline).length;

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4 select-none">
      <div className="w-full max-w-3xl bg-card border border-border-strong rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-4 bg-surface border-b border-border-subtle flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-bold">
              <Zap className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-bold text-text-primary">
                  Status Hardware — {edition?.displayName || `Edisi ${mode}`}
                </h2>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                  onlineCount === devices.length 
                    ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/30' 
                    : 'bg-amber-500/10 text-amber-600 border-amber-500/30'
                }`}>
                  {onlineCount}/{devices.length} Perangkat Siap
                </span>
              </div>
              <p className="text-xs text-text-secondary mt-0.5">
                Monitoring real-time perangkat kasir khusus edisi {edition?.displayName || mode}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => fetchHardwareStatus()}
              disabled={isLoading}
              className="p-2 rounded-lg bg-subtle hover:bg-card-hover border border-border-subtle text-text-secondary hover:text-primary transition-all disabled:opacity-50"
              title="Periksa Ulang Semua Perangkat"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin text-primary' : ''}`} />
            </button>
            <button
              onClick={() => setIsHardwareModalOpen(false)}
              className="p-2 rounded-lg hover:bg-subtle text-text-muted hover:text-text-primary font-bold text-sm"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Device Grid */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4 text-xs">
          {/* Global Fallback Info Banner */}
          <div className="p-3 bg-subtle rounded-xl border border-border-subtle flex items-start gap-2.5">
            <Info className="w-4 h-4 text-primary shrink-0 mt-0.5" />
            <div className="text-text-secondary leading-relaxed">
              <strong className="text-text-primary font-semibold block">Sistem Fallback Otomatis Aktif:</strong>
              Jika printer thermal atau perangkat fisik tidak terhubung saat transaksi, sistem kasir akan <strong>secara otomatis mengalihkan ke mode cetak browser / PDF dan timbangan manual</strong> tanpa menghentikan pelayanan kasir.
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {devices.map((dev) => {
              const item = dev.item;
              const isOk = item.status === 'Connected' || item.status === 'Virtual';
              const isFallback = item.status === 'ManualFallback' || item.status === 'ManualOnly';
              const isOffline = item.status === 'Disconnected' || item.status === 'Error';

              return (
                <div 
                  key={dev.key} 
                  className={`p-4 rounded-xl border flex flex-col justify-between space-y-3 transition-all bg-card shadow-xs ${
                    isOffline 
                      ? 'border-rose-500/40 bg-rose-500/5' 
                      : isFallback 
                      ? 'border-amber-500/30' 
                      : 'border-border-subtle hover:border-primary/40'
                  }`}
                >
                  <div>
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <div className="p-2 rounded-lg bg-subtle border border-border-subtle">
                          {dev.icon}
                        </div>
                        <div>
                          <h3 className="font-bold text-xs text-text-primary leading-tight">{item.name}</h3>
                          <span className="text-[10px] font-mono text-text-muted">{item.connectionMode}</span>
                        </div>
                      </div>

                      {/* Status Badge */}
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold flex items-center gap-1 border shrink-0 ${
                        isOk
                          ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/30'
                          : isFallback
                          ? 'bg-amber-500/10 text-amber-600 border-amber-500/30'
                          : 'bg-rose-500/10 text-rose-600 border-rose-500/30 animate-pulse'
                      }`}>
                        {isOk && <CheckCircle2 className="w-3 h-3" />}
                        {isFallback && <AlertTriangle className="w-3 h-3" />}
                        {isOffline && <XCircle className="w-3 h-3" />}
                        <span>{isOk ? 'Terhubung' : isFallback ? 'Mode Manual' : 'Terputus (Offline)'}</span>
                      </span>
                    </div>

                    <p className="text-[11px] text-text-secondary mt-2.5 font-medium">
                      {item.details || 'Siap digunakan'}
                    </p>

                    {item.fallbackInstruction && (
                      <p className="text-[10px] text-text-muted mt-1 bg-subtle p-1.5 rounded border border-border-subtle/60 leading-tight">
                        💡 <strong>Fallback:</strong> {item.fallbackInstruction}
                      </p>
                    )}
                  </div>

                  <div className="pt-2 border-t border-border-subtle flex items-center justify-between">
                    <span className="text-[10px] text-text-muted font-mono">
                      {item.isOnline ? 'Online' : 'Gunakan Manual'}
                    </span>
                    <button
                      onClick={dev.onAction}
                      className="px-2.5 py-1 rounded-lg bg-subtle hover:bg-primary/10 hover:text-primary border border-border-subtle text-[11px] font-bold transition-all text-text-secondary"
                    >
                      {dev.actionText}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer */}
        <div className="p-3.5 bg-subtle border-t border-border-subtle flex items-center justify-between text-xs">
          <div className="flex items-center gap-1.5 text-text-muted text-[11px]">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
            <span>Pemeriksaan otomatis setiap 15 detik · OmniPOS Hardware Driver</span>
          </div>
          <button
            onClick={() => setIsHardwareModalOpen(false)}
            className="px-4 py-1.5 bg-primary hover:bg-primary-hover text-primary-text rounded-lg font-bold shadow-sm"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
};
