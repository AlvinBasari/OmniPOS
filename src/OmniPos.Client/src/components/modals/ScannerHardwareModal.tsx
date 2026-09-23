import React, { useState } from 'react';
import { 
  Barcode, 
  Smartphone, 
  Zap, 
  Check, 
  X, 
  Radio, 
  CheckCircle2, 
  ExternalLink,
  ShieldCheck,
  RefreshCw
} from 'lucide-react';
import { useHardwareStore } from '../../store/useHardwareStore';
import { useToastStore } from '../../store/useToastStore';
import { playScanBeep } from '../../store/useCartStore';

export const ScannerHardwareModal: React.FC = () => {
  const {
    isScannerHardwareModalOpen,
    setIsScannerHardwareModalOpen,
    detectedScannerType,
    lastDetectedScannerName,
    setDetectedScannerType,
    isMobileScannerEnabled,
    setIsMobileScannerEnabled,
    setIsMobileScannerModalOpen
  } = useHardwareStore();

  const [testInput, setTestInput] = useState('');
  const [testResult, setTestResult] = useState<{ barcode: string; time: string } | null>(null);

  if (!isScannerHardwareModalOpen) return null;

  const handleTestSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!testInput.trim()) return;

    playScanBeep();
    setDetectedScannerType('usb', 'Alat Scan USB (Teruji)');
    setTestResult({
      barcode: testInput.trim(),
      time: new Date().toLocaleTimeString('id-ID')
    });
    useToastStore.getState().showToast(`Alat Scan USB berhasil membaca barcode: ${testInput.trim()}`, 'success');
    setTestInput('');
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4 select-none">
      <div className="bg-surface border border-border-strong w-full max-w-xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="px-5 py-4 bg-surface border-b border-border-subtle flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-bold">
              <Barcode className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-text-primary">Deteksi Hardware Scanner Kasir</h2>
              <p className="text-xs text-text-secondary mt-0.5">
                Mendeteksi otomatis: Alat Scan Barcode USB / Laser & Kamera HP Android
              </p>
            </div>
          </div>

          <button
            onClick={() => setIsScannerHardwareModalOpen(false)}
            className="p-2 rounded-xl hover:bg-subtle text-text-muted hover:text-text-primary font-bold text-sm transition-colors"
            title="Tutup Modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 overflow-y-auto space-y-4">
          {/* Active Detected Status Card */}
          <div className={`p-4 rounded-xl border transition-all flex items-center justify-between shadow-xs ${
            detectedScannerType === 'usb'
              ? 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-300 dark:border-emerald-800'
              : detectedScannerType === 'hp'
              ? 'bg-sky-50 dark:bg-sky-950/30 border-sky-300 dark:border-sky-800'
              : 'bg-slate-50 dark:bg-zinc-900/50 border-slate-300 dark:border-zinc-700'
          }`}>
            <div className="flex items-center gap-3">
              <div className={`w-11 h-11 rounded-xl flex items-center justify-center font-bold shrink-0 shadow-sm ${
                detectedScannerType === 'usb'
                  ? 'bg-emerald-600 text-white'
                  : detectedScannerType === 'hp'
                  ? 'bg-sky-600 text-white'
                  : 'bg-primary text-white'
              }`}>
                {detectedScannerType === 'usb' ? (
                  <Barcode className="w-6 h-6" />
                ) : detectedScannerType === 'hp' ? (
                  <Smartphone className="w-6 h-6" />
                ) : (
                  <Zap className="w-6 h-6" />
                )}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-500 dark:text-zinc-400 font-semibold uppercase tracking-wider">
                    Hardware Aktif Saat Ini:
                  </span>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-black tracking-wide uppercase ${
                    detectedScannerType === 'usb'
                      ? 'bg-emerald-600 text-white'
                      : detectedScannerType === 'hp'
                      ? 'bg-sky-600 text-white'
                      : 'bg-primary text-white'
                  }`}>
                    {detectedScannerType === 'usb' ? 'ALAT SCAN USB' : detectedScannerType === 'hp' ? 'KAMERA HP' : 'DUAL AUTO'}
                  </span>
                </div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white mt-0.5">
                  {detectedScannerType === 'usb'
                    ? 'Alat Scan Barcode USB / Laser'
                    : detectedScannerType === 'hp'
                    ? `Kamera HP Android (${lastDetectedScannerName})`
                    : 'Mode Dual-Deteksi Otomatis'}
                </h3>
                <p className="text-xs text-slate-600 dark:text-zinc-300 mt-0.5">
                  {detectedScannerType === 'usb'
                    ? 'Sistem siap menerima tembakan barcode dari scanner fisik USB / wireless gun.'
                    : detectedScannerType === 'hp'
                    ? 'Sistem sedang menerima tembakan barcode dari kamera smartphone Android.'
                    : 'Sistem siap menerima barcode dari Alat Scan USB maupun Kamera HP kapan saja.'}
                </p>
              </div>
            </div>
          </div>

          {/* 2 Comparison Hardware Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            {/* Card 1: Alat Scan USB */}
            <div className={`p-4 rounded-xl border transition-all space-y-3 ${
              detectedScannerType === 'usb'
                ? 'bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-400 dark:border-emerald-700'
                : 'bg-slate-50 dark:bg-zinc-900/40 border-slate-200 dark:border-zinc-800'
            }`}>
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-emerald-600 text-white flex items-center justify-center font-bold">
                    <Barcode className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-900 dark:text-white">Alat Scan USB / Laser</h4>
                    <span className="text-[10px] text-emerald-700 dark:text-emerald-300 font-semibold flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                      Plug & Play (Siap Tembak)
                    </span>
                  </div>
                </div>
                {detectedScannerType === 'usb' && (
                  <span className="px-2 py-0.5 text-[9px] font-black bg-emerald-600 text-white rounded-full">
                    AKTIF
                  </span>
                )}
              </div>

              <p className="text-[11px] text-slate-600 dark:text-zinc-400 leading-relaxed">
                Mendukung semua barcode scanner fisik USB, wireless dongle 2.4GHz, dan Bluetooth (tipe keyboard-wedge HID).
              </p>

              {/* Quick Test Barcode Gun Input */}
              <form onSubmit={handleTestSubmit} className="space-y-1.5 pt-1">
                <label className="text-[10px] font-bold text-slate-700 dark:text-zinc-300 block">
                  Uji Tembak Scanner Fisik:
                </label>
                <div className="flex items-center gap-1.5">
                  <input
                    type="text"
                    value={testInput}
                    onChange={(e) => setTestInput(e.target.value)}
                    placeholder="Tembak barcode di sini..."
                    className="flex-1 px-2.5 py-1.5 bg-white dark:bg-zinc-800 border border-slate-300 dark:border-zinc-700 rounded-lg text-xs font-mono text-slate-900 dark:text-white focus:outline-none focus:border-primary"
                  />
                  <button
                    type="submit"
                    className="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg transition-colors cursor-pointer shadow-xs"
                  >
                    Tes
                  </button>
                </div>
                {testResult && (
                  <p className="text-[10px] text-emerald-700 dark:text-emerald-300 font-mono font-bold pt-0.5">
                    ✓ Terbaca: {testResult.barcode} ({testResult.time})
                  </p>
                )}
              </form>
            </div>

            {/* Card 2: Kamera HP Android */}
            <div className={`p-4 rounded-xl border transition-all space-y-3 ${
              detectedScannerType === 'hp'
                ? 'bg-sky-50/50 dark:bg-sky-950/20 border-sky-400 dark:border-sky-700'
                : 'bg-slate-50 dark:bg-zinc-900/40 border-slate-200 dark:border-zinc-800'
            }`}>
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-sky-600 text-white flex items-center justify-center font-bold">
                    <Smartphone className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-900 dark:text-white">Kamera HP Android</h4>
                    <span className={`text-[10px] font-semibold flex items-center gap-1 ${
                      isMobileScannerEnabled ? 'text-sky-700 dark:text-sky-300' : 'text-slate-500 dark:text-zinc-400'
                    }`}>
                      <span className={`w-2 h-2 rounded-full ${isMobileScannerEnabled ? 'bg-sky-500 animate-pulse' : 'bg-slate-400'}`} />
                      {isMobileScannerEnabled ? 'Saklar ON (Aktif)' : 'Saklar OFF (Dijeda)'}
                    </span>
                  </div>
                </div>
                {detectedScannerType === 'hp' && (
                  <span className="px-2 py-0.5 text-[9px] font-black bg-sky-600 text-white rounded-full">
                    AKTIF
                  </span>
                )}
              </div>

              <p className="text-[11px] text-slate-600 dark:text-zinc-400 leading-relaxed">
                Gunakan kamera HP Android toko sebagai pemindai nirkabel melalui jaringan WiFi toko atau jalur Cloud HTTPS.
              </p>

              {/* HP Quick Actions */}
              <div className="pt-1 space-y-1.5">
                <button
                  type="button"
                  onClick={() => {
                    setIsScannerHardwareModalOpen(false);
                    setIsMobileScannerModalOpen(true);
                  }}
                  className="w-full py-2 bg-white dark:bg-zinc-800 hover:bg-slate-100 dark:hover:bg-zinc-700 border border-slate-300 dark:border-zinc-700 rounded-lg text-xs font-bold text-sky-700 dark:text-sky-300 flex items-center justify-center gap-1.5 shadow-xs transition-colors cursor-pointer"
                >
                  <ExternalLink className="w-3.5 h-3.5 text-sky-600" />
                  <span>Buka QR Code Sambungan HP</span>
                </button>

                <div className="flex items-center justify-between px-2 py-1 bg-slate-100 dark:bg-zinc-800/80 rounded-lg text-xs text-slate-700 dark:text-zinc-300">
                  <span className="text-[11px]">Saklar HP Kasir:</span>
                  <button
                    type="button"
                    onClick={() => {
                      const next = !isMobileScannerEnabled;
                      setIsMobileScannerEnabled(next);
                      useToastStore.getState().showToast(
                        next ? 'Scanner HP Diaktifkan (ON)' : 'Scanner HP Dinonaktifkan (OFF)',
                        next ? 'success' : 'info'
                      );
                    }}
                    className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase transition-colors ${
                      isMobileScannerEnabled ? 'bg-sky-600 text-white' : 'bg-slate-400 text-white'
                    }`}
                  >
                    {isMobileScannerEnabled ? 'ON' : 'OFF'}
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Mode Switcher Buttons */}
          <div className="pt-2 border-t border-slate-200 dark:border-zinc-800 space-y-2">
            <span className="text-xs font-bold text-slate-700 dark:text-zinc-300 block">
              Pilih Prioritas Mode Hardware:
            </span>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => {
                  setDetectedScannerType('auto', 'Deteksi Otomatis (Dual-Mode)');
                  useToastStore.getState().showToast('Mode Deteksi Otomatis: Siap menerima Alat Scan USB maupun HP', 'info');
                }}
                className={`py-2 px-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 border transition-all cursor-pointer ${
                  detectedScannerType === 'auto'
                    ? 'bg-primary text-white border-primary shadow-xs'
                    : 'bg-white dark:bg-zinc-800 text-slate-700 dark:text-zinc-300 border-slate-300 dark:border-zinc-700 hover:bg-slate-50'
                }`}
              >
                <Zap className="w-3.5 h-3.5" />
                <span>Dual Auto</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setDetectedScannerType('usb', 'Alat Scan USB / Laser');
                  useToastStore.getState().showToast('Prioritas diatur ke: Alat Scan Barcode USB', 'success');
                }}
                className={`py-2 px-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 border transition-all cursor-pointer ${
                  detectedScannerType === 'usb'
                    ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                    : 'bg-white dark:bg-zinc-800 text-slate-700 dark:text-zinc-300 border-slate-300 dark:border-zinc-700 hover:bg-slate-50'
                }`}
              >
                <Barcode className="w-3.5 h-3.5" />
                <span>Alat Scan USB</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setDetectedScannerType('hp', 'Kamera HP Android');
                  useToastStore.getState().showToast('Prioritas diatur ke: Kamera HP Android', 'success');
                }}
                className={`py-2 px-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 border transition-all cursor-pointer ${
                  detectedScannerType === 'hp'
                    ? 'bg-sky-600 text-white border-sky-600 shadow-xs'
                    : 'bg-white dark:bg-zinc-800 text-slate-700 dark:text-zinc-300 border-slate-300 dark:border-zinc-700 hover:bg-slate-50'
                }`}
              >
                <Smartphone className="w-3.5 h-3.5" />
                <span>Kamera HP</span>
              </button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3.5 bg-surface border-t border-border-subtle flex items-center justify-between text-xs">
          <div className="flex items-center gap-2 text-slate-600 dark:text-zinc-400 text-[11px]">
            <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>Kedua hardware dapat digunakan bergantian tanpa perlu pengaturan ulang</span>
          </div>
          <button
            onClick={() => setIsScannerHardwareModalOpen(false)}
            className="px-6 py-2 bg-slate-900 hover:bg-black dark:bg-primary dark:hover:bg-primary-hover text-white font-bold rounded-xl shadow-xs text-xs transition-all cursor-pointer"
          >
            Selesai
          </button>
        </div>
      </div>
    </div>
  );
};
