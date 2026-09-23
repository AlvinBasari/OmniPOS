import React, { useState, useEffect, useRef } from 'react';
import { 
  Smartphone, 
  Barcode, 
  X, 
  Check, 
  Copy, 
  RefreshCw, 
  AlertCircle, 
  Flashlight, 
  Radio, 
  Zap,
  ArrowRight,
  Laptop
} from 'lucide-react';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import { QRCodeEncoder } from '../../utils/qrCodeGenerator';
import { playScanBeep } from '../../store/useCartStore';
import { useToastStore } from '../../store/useToastStore';

interface ProductBarcodeScanModalProps {
  isOpen: boolean;
  onClose: () => void;
  onBarcodeDetected: (barcode: string) => void;
}

export const ProductBarcodeScanModal: React.FC<ProductBarcodeScanModalProps> = ({
  isOpen,
  onClose,
  onBarcodeDetected
}) => {
  const [activeTab, setActiveTab] = useState<'mobile' | 'physical' | 'webcam'>('mobile');
  
  // Mobile scanner state
  const [networkInfo, setNetworkInfo] = useState<{
    primaryIp: string;
    port: number;
    mobileScanUrl: string;
    tunnelActive?: boolean;
    tunnelUrl?: string | null;
    activeScanners: number;
  } | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [copied, setCopied] = useState(false);
  const [recentScans, setRecentScans] = useState<any[]>([]);
  const [isHpOnline, setIsHpOnline] = useState(false);
  const [autoApply, setAutoApply] = useState(true);
  const initialTimeRef = useRef<number>(Date.now());
  const processedScanIdsRef = useRef<Set<string>>(new Set());

  // Physical scanner input state
  const [physicalInputVal, setPhysicalInputVal] = useState('');
  const physicalInputRef = useRef<HTMLInputElement>(null);

  // Webcam state (optional tab)
  const [isWebcamLoading, setIsWebcamLoading] = useState(false);
  const [webcamError, setWebcamError] = useState<string | null>(null);
  const [torchOn, setTorchOn] = useState(false);
  const scannerRef = useRef<Html5Qrcode | null>(null);

  // When modal opens: initialize state
  useEffect(() => {
    if (!isOpen) {
      stopWebcam();
      return;
    }

    initialTimeRef.current = Date.now();
    setActiveTab('mobile');
    setPhysicalInputVal('');
    fetchNetworkAndScans();

    const interval = setInterval(fetchRecentScans, 1200);
    return () => {
      clearInterval(interval);
      stopWebcam();
    };
  }, [isOpen]);

  // Focus input when switching to physical tab
  useEffect(() => {
    if (activeTab === 'physical') {
      setTimeout(() => physicalInputRef.current?.focus(), 150);
    } else if (activeTab === 'webcam') {
      startWebcam();
    } else {
      stopWebcam();
    }
  }, [activeTab]);

  const fetchNetworkAndScans = async () => {
    try {
      const res = await fetch('/api/v1/system/network-info');
      if (res.ok) {
        const data = await res.json();
        const urlToUse = (data.tunnelActive && data.tunnelUrl) ? data.tunnelUrl : data.mobileScanUrl;
        setNetworkInfo(data);
        if (urlToUse) {
          const qr = await QRCodeEncoder.generateDataURL(urlToUse, 240);
          setQrDataUrl(qr);
        }
      }
    } catch {}
    fetchRecentScans();
  };

  const fetchRecentScans = async () => {
    try {
      const res = await fetch('/api/v1/hardware/mobile-scan/poll');
      if (res.ok) {
        const data = await res.json();
        setIsHpOnline(data.isScannerOnline || (data.activeScanners && data.activeScanners > 0));
        
        if (Array.isArray(data.scans)) {
          setRecentScans(data.scans.slice(-4).reverse());

          // Check if there is a fresh scan made AFTER modal opened
          for (const scan of data.scans) {
            if (scan.id && !processedScanIdsRef.current.has(scan.id)) {
              processedScanIdsRef.current.add(scan.id);
              const scanTime = new Date(scan.timestamp).getTime();
              // If scan happened around or after modal opened
              if (scanTime >= initialTimeRef.current - 1500) {
                playScanBeep();
                if (autoApply) {
                  useToastStore.getState().showToast(`Barcode dari ${scan.deviceName || 'HP'}: ${scan.barcode}`, 'success');
                  onBarcodeDetected(scan.barcode);
                  onClose();
                  return;
                } else {
                  useToastStore.getState().showToast(`Scan diterima dari ${scan.deviceName || 'HP'}: ${scan.barcode} (Siap dipilih)`, 'info');
                }
              }
            }
          }
        }
      }
    } catch {}
  };

  const handleCopyLink = () => {
    const url = (networkInfo?.tunnelActive && networkInfo?.tunnelUrl) 
      ? networkInfo.tunnelUrl 
      : networkInfo?.mobileScanUrl || '';
    if (url) {
      navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      useToastStore.getState().showToast('Tautan scanner HP disalin!', 'info');
    }
  };

  const handleSelectRecentScan = (barcode: string) => {
    playScanBeep();
    onBarcodeDetected(barcode);
    onClose();
  };

  // Physical Barcode Scanner Key Handler (Keyboard Wedge)
  const handlePhysicalKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const code = physicalInputVal.trim();
      if (code) {
        playScanBeep();
        useToastStore.getState().showToast(`Barcode alat scan diterima: ${code}`, 'success');
        onBarcodeDetected(code);
        onClose();
      }
    }
  };

  const handlePhysicalSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const code = physicalInputVal.trim();
    if (code) {
      playScanBeep();
      onBarcodeDetected(code);
      onClose();
    }
  };

  // Safe Webcam Scanner (Laptop / PC)
  const startWebcam = async () => {
    setIsWebcamLoading(true);
    setWebcamError(null);

    try {
      const scanner = new Html5Qrcode('product-barcode-webcam-view');
      scannerRef.current = scanner;

      const formatsToSupport = [
        Html5QrcodeSupportedFormats.EAN_13,
        Html5QrcodeSupportedFormats.EAN_8,
        Html5QrcodeSupportedFormats.CODE_128,
        Html5QrcodeSupportedFormats.CODE_39,
        Html5QrcodeSupportedFormats.UPC_A,
        Html5QrcodeSupportedFormats.UPC_E,
        Html5QrcodeSupportedFormats.QR_CODE
      ];

      const scanConfig: any = {
        fps: 15,
        qrbox: { width: 240, height: 140 },
        formatsToSupport
      };

      // Query available cameras safely to avoid OverconstrainedError
      const cameras = await Html5Qrcode.getCameras();
      if (!cameras || cameras.length === 0) {
        throw new Error('Tidak ada perangkat webcam atau kamera yang terdeteksi di PC/laptop ini.');
      }

      // Pick first available camera (usually laptop integrated webcam)
      const cameraId = cameras[0].id;

      await scanner.start(
        cameraId,
        scanConfig,
        (decodedText: string) => {
          playScanBeep();
          onBarcodeDetected(decodedText.trim());
          onClose();
        },
        () => {}
      );

      setIsWebcamLoading(false);
    } catch (err: any) {
      setIsWebcamLoading(false);
      const msg = err?.message || String(err);
      setWebcamError(
        msg.includes('Permission') || err?.name === 'NotAllowedError'
          ? 'Izin kamera tidak diberikan. Silakan izinkan browser mengakses kamera.'
          : 'Gagal mengaktifkan kamera PC: ' + msg
      );
    }
  };

  const stopWebcam = async () => {
    if (scannerRef.current) {
      try {
        if (scannerRef.current.isScanning) {
          await scannerRef.current.stop();
        }
        await scannerRef.current.clear();
      } catch {}
      scannerRef.current = null;
    }
    setIsWebcamLoading(false);
  };

  const toggleTorch = async () => {
    if (!scannerRef.current || !scannerRef.current.isScanning) return;
    try {
      const next = !torchOn;
      await scannerRef.current.applyVideoConstraints({
        advanced: [{ torch: next } as any]
      });
      setTorchOn(next);
    } catch {
      useToastStore.getState().showToast('Senter flash tidak didukung kamera ini.', 'warning');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-60 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4 select-none animate-fadeIn">
      <div className="w-full max-w-lg bg-card border border-border-strong rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-4 bg-surface border-b border-border-subtle flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-bold">
              <Barcode className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-text-primary">Pindai Barcode Produk</h3>
              <p className="text-[11px] text-text-muted">
                Gunakan HP (Smartphone) atau Alat Scan Fisik untuk mengisi barcode
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-text-muted hover:text-text-primary hover:bg-subtle transition-colors"
            title="Tutup"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Selector */}
        <div className="p-2.5 bg-subtle/80 border-b border-border-subtle flex gap-1.5">
          <button
            type="button"
            onClick={() => setActiveTab('mobile')}
            className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all ${
              activeTab === 'mobile'
                ? 'bg-card text-primary shadow-sm border border-border-subtle'
                : 'text-text-muted hover:text-text-primary hover:bg-card/50'
            }`}
          >
            <Smartphone className="w-4 h-4" />
            <span>Kamera HP (Rekomendasi)</span>
            {isHpOnline && (
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" title="HP Terhubung" />
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('physical')}
            className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all ${
              activeTab === 'physical'
                ? 'bg-card text-primary shadow-sm border border-border-subtle'
                : 'text-text-muted hover:text-text-primary hover:bg-card/50'
            }`}
          >
            <Barcode className="w-4 h-4" />
            <span>Alat Scan USB</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('webcam')}
            className={`py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
              activeTab === 'webcam'
                ? 'bg-card text-primary shadow-sm border border-border-subtle'
                : 'text-text-muted hover:text-text-primary hover:bg-card/50'
            }`}
            title="Gunakan webcam bawaan laptop/PC"
          >
            <Laptop className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Webcam PC</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 flex-1 overflow-y-auto space-y-4">
          {/* TAB 1: SCAN PAKAI HP */}
          {activeTab === 'mobile' && (
            <div className="space-y-4">
              {/* Status Banner */}
              <div className={`p-3 rounded-xl border flex items-center justify-between ${
                isHpOnline 
                  ? 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-300 dark:border-emerald-800 text-emerald-950 dark:text-emerald-200' 
                  : 'bg-amber-50 dark:bg-amber-950/30 border-amber-300 dark:border-amber-800 text-amber-950 dark:text-amber-200'
              }`}>
                <div className="flex items-center gap-2.5">
                  <span className={`w-2.5 h-2.5 rounded-full ${isHpOnline ? 'bg-emerald-600 animate-pulse' : 'bg-amber-600'}`} />
                  <div>
                    <p className="font-bold text-xs">
                      {isHpOnline ? 'HP Android Terhubung & Siap Scan!' : 'Menunggu Sambungan HP...'}
                    </p>
                    <p className="text-[11px] opacity-85">
                      {isHpOnline 
                        ? 'Arahkan kamera HP ke barcode kemasan produk. Hasilnya langsung masuk otomatis.' 
                        : 'Buka scanner di HP Anda menggunakan QR Code atau tautan di bawah ini.'}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      const next = !autoApply;
                      setAutoApply(next);
                      useToastStore.getState().showToast(
                        next ? '⚡ Auto-pasang barcode DIAKTIFKAN' : '✋ Auto-pasang DINONAKTIFKAN (Pilih manual)',
                        'info'
                      );
                    }}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-bold flex items-center gap-1.5 border transition-all ${
                      autoApply
                        ? 'bg-card border-emerald-500/50 text-emerald-600 shadow-2xs'
                        : 'bg-card/70 border-border-subtle text-text-muted hover:text-text-secondary'
                    }`}
                    title="Aktifkan untuk langsung memasukkan hasil scan dan menutup modal"
                  >
                    <span className={`w-2 h-2 rounded-full ${autoApply ? 'bg-emerald-500 animate-pulse' : 'bg-zinc-400'}`} />
                    <span>Auto-Pasang: {autoApply ? 'ON' : 'OFF'}</span>
                  </button>
                  <Radio className={`w-5 h-5 shrink-0 ${isHpOnline ? 'animate-pulse text-emerald-500' : 'text-amber-500'}`} />
                </div>
              </div>

              {/* QR Code Card */}
              <div className="p-4 bg-surface rounded-2xl border border-border-subtle flex flex-col items-center text-center space-y-3">
                <p className="text-xs font-bold text-text-primary">
                  1. Scan QR Code ini dengan Kamera HP Anda:
                </p>

                <div className="p-2.5 bg-white rounded-xl shadow-md border border-zinc-200">
                  {qrDataUrl ? (
                    <img 
                      src={qrDataUrl} 
                      alt="QR Code Mobile Scanner" 
                      className="w-44 h-44 object-contain"
                    />
                  ) : (
                    <div className="w-44 h-44 flex items-center justify-center text-zinc-400">
                      <RefreshCw className="w-6 h-6 animate-spin text-primary" />
                    </div>
                  )}
                </div>

                <div className="w-full max-w-sm space-y-1.5">
                  <p className="text-[11px] text-text-muted">
                    Atau buka alamat ini di Google Chrome / Browser HP:
                  </p>
                  <div className="flex items-center gap-1.5 bg-subtle p-1.5 rounded-xl border border-border-subtle">
                    <input 
                      type="text" 
                      readOnly 
                      value={(networkInfo?.tunnelActive && networkInfo?.tunnelUrl) ? networkInfo.tunnelUrl : (networkInfo?.mobileScanUrl || '')}
                      className="w-full bg-transparent px-2 text-[11px] font-mono font-bold text-text-primary focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={handleCopyLink}
                      className="px-2.5 py-1 bg-card hover:bg-card-hover border border-border-subtle rounded-lg text-xs font-bold text-primary flex items-center gap-1 shrink-0"
                    >
                      {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copied ? 'Tersalin' : 'Salin'}</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Recent Scans (e.g. barcode just scanned) */}
              {recentScans.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-xs font-bold text-text-secondary flex items-center gap-1.5">
                    <Zap className="w-3.5 h-3.5 text-amber-500" />
                    Hasil Scan Terakhir dari HP:
                  </h4>
                  <div className="space-y-1.5">
                    {recentScans.map((s) => (
                      <div 
                        key={s.id}
                        className="p-2.5 bg-card hover:bg-card-hover border border-border-subtle rounded-xl flex items-center justify-between transition-colors"
                      >
                        <div className="flex items-center gap-2">
                          <Barcode className="w-4 h-4 text-primary" />
                          <div>
                            <p className="font-mono font-bold text-xs text-text-primary">{s.barcode}</p>
                            <p className="text-[10px] text-text-muted">
                              {s.deviceName || 'HP Android'} • {new Date(s.timestamp).toLocaleTimeString('id-ID')}
                            </p>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleSelectRecentScan(s.barcode)}
                          className="px-3 py-1 bg-primary text-primary-text rounded-lg text-xs font-bold hover:bg-primary-hover shadow-xs flex items-center gap-1"
                        >
                          <span>Pilih Barcode</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: ALAT SCAN FISIK (BARCODE SCANNER GUN) */}
          {activeTab === 'physical' && (
            <div className="space-y-4">
              <div className="p-4 bg-primary/5 border border-primary/20 rounded-2xl text-center space-y-2">
                <div className="w-12 h-12 rounded-full bg-primary/10 text-primary mx-auto flex items-center justify-center font-bold">
                  <Barcode className="w-6 h-6" />
                </div>
                <h4 className="font-bold text-sm text-text-primary">
                  Alat Scan Barcode Fisik (USB / Wireless)
                </h4>
                <p className="text-xs text-text-secondary max-w-sm mx-auto leading-relaxed">
                  Alat scan fisik bertindak seperti pengetik otomatis (keyboard-wedge). Cukup arahkan moncong scanner ke barcode produk dan <strong>tarik pelatuk (trigger)</strong>.
                </p>
              </div>

              <form onSubmit={handlePhysicalSubmit} className="space-y-3">
                <label className="block text-xs font-semibold text-text-secondary text-center">
                  Kolom Siap Menerima Tembakan Barcode:
                </label>
                <div className="relative">
                  <input
                    ref={physicalInputRef}
                    type="text"
                    value={physicalInputVal}
                    onChange={e => setPhysicalInputVal(e.target.value)}
                    onKeyDown={handlePhysicalKeyDown}
                    placeholder="Tembak barcode produk sekarang..."
                    className="w-full text-center text-base font-mono font-bold py-3.5 px-4 bg-card border-2 border-primary rounded-xl text-primary focus:outline-none focus:ring-4 focus:ring-primary/20 shadow-inner"
                    autoFocus
                  />
                  {physicalInputVal && (
                    <button
                      type="button"
                      onClick={() => setPhysicalInputVal('')}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setPhysicalInputVal('')}
                    className="flex-1 py-2 rounded-lg bg-subtle hover:bg-card-hover border border-border-subtle text-xs font-semibold text-text-secondary"
                  >
                    Kosongkan
                  </button>
                  <button
                    type="submit"
                    disabled={!physicalInputVal.trim()}
                    className="flex-1 py-2 rounded-lg bg-primary hover:bg-primary-hover text-primary-text text-xs font-bold disabled:opacity-40 shadow-sm"
                  >
                    Gunakan Barcode Ini
                  </button>
                </div>
              </form>

              <div className="p-3 bg-subtle rounded-xl text-[11px] text-text-muted space-y-1 border border-border-subtle">
                <p className="font-semibold text-text-secondary">💡 Tips Alat Scan:</p>
                <p>• Jika alat scan tidak merespons, pastikan kabel USB scanner telah tertancap kuat ke PC.</p>
                <p>• Anda juga bisa langsung menembak barcode di kolom isian Barcode utama tanpa harus membuka modal ini.</p>
              </div>
            </div>
          )}

          {/* TAB 3: WEBCAM INTERNAL LAPTOP / PC */}
          {activeTab === 'webcam' && (
            <div className="space-y-3">
              <div className="relative bg-black w-full h-64 rounded-2xl overflow-hidden flex items-center justify-center border border-border-subtle">
                <div 
                  id="product-barcode-webcam-view" 
                  className="w-full h-full object-cover flex items-center justify-center overflow-hidden" 
                />

                {isWebcamLoading && (
                  <div className="absolute inset-0 bg-black/85 flex flex-col items-center justify-center space-y-2 text-white">
                    <RefreshCw className="w-7 h-7 animate-spin text-primary" />
                    <span className="text-xs font-semibold">Mengaktifkan webcam PC/laptop...</span>
                  </div>
                )}

                {webcamError && (
                  <div className="absolute inset-0 bg-black/95 p-5 flex flex-col items-center justify-center text-center space-y-3 text-rose-400">
                    <AlertCircle className="w-8 h-8 text-rose-500" />
                    <p className="text-xs font-semibold leading-relaxed max-w-xs">{webcamError}</p>
                    <button
                      type="button"
                      onClick={() => setActiveTab('mobile')}
                      className="px-4 py-2 bg-primary text-primary-text font-bold rounded-xl text-xs hover:bg-primary-hover shadow-md flex items-center gap-1.5"
                    >
                      <Smartphone className="w-4 h-4" />
                      <span>Gunakan Scanner HP Saja</span>
                    </button>
                  </div>
                )}

                {!isWebcamLoading && !webcamError && (
                  <>
                    <div className="pointer-events-none absolute inset-0 flex items-center justify-center z-10">
                      <div className="w-56 h-36 border-2 border-primary rounded-xl flex flex-col justify-between p-2 shadow-[0_0_0_9999px_rgba(0,0,0,0.5)]">
                        <div className="w-full h-0.5 bg-rose-500 shadow-[0_0_8px_#f43f5e] animate-pulse my-auto" />
                      </div>
                    </div>

                    <div className="absolute bottom-3 right-3 z-20">
                      <button
                        type="button"
                        onClick={toggleTorch}
                        className={`p-2.5 rounded-full backdrop-blur-md border ${
                          torchOn ? 'bg-amber-500 text-black border-amber-400' : 'bg-black/60 text-white border-white/20'
                        }`}
                        title="Flash"
                      >
                        <Flashlight className="w-4 h-4" />
                      </button>
                    </div>
                  </>
                )}
              </div>

              <p className="text-center text-[11px] text-text-muted">
                Arahkan kemasan produk ke hadapan kamera laptop atau webcam USB Anda.
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-3 bg-surface border-t border-border-subtle flex items-center justify-between text-xs">
          <p className="text-[11px] text-text-muted">
            {activeTab === 'mobile' && 'Scan dengan HP Android / iPhone'}
            {activeTab === 'physical' && 'Arahkan scanner gun & tembak'}
            {activeTab === 'webcam' && 'Deteksi otomatis kamera PC'}
          </p>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 bg-subtle hover:bg-card-hover border border-border-subtle rounded-lg font-semibold text-text-primary text-xs transition-colors"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
};
