import React, { useState, useEffect, useRef } from 'react';
import { 
  Camera, 
  Flashlight, 
  RotateCcw, 
  CheckCircle2, 
  AlertCircle, 
  Send, 
  Volume2, 
  VolumeX, 
  Smartphone, 
  History, 
  Barcode, 
  Zap, 
  Layers, 
  RefreshCw, 
  X 
} from 'lucide-react';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';

interface ScannedResult {
  id: string;
  barcode: string;
  timestamp: string;
  found: boolean;
  product?: {
    id: string;
    name: string;
    sku: string;
    barcode: string;
    sellPrice: number;
    stock: number;
    unit?: string;
    categoryName?: string;
  };
}

export const MobileScannerPage: React.FC = () => {
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [isCameraLoading, setIsCameraLoading] = useState(true);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [torchEnabled, setTorchEnabled] = useState(false);
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [scanMode, setScanMode] = useState<'cashier' | 'warehouse'>('cashier');
  
  const [manualBarcode, setManualBarcode] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [isConnected, setIsConnected] = useState(true);
  const [deviceName, setDeviceName] = useState('HP Android');
  
  const [lastScanned, setLastScanned] = useState<ScannedResult | null>(null);
  const [scanHistory, setScanHistory] = useState<ScannedResult[]>([]);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);

  const qrScannerRef = useRef<Html5Qrcode | null>(null);
  const lastScanTimeRef = useRef(0);
  const isStartingRef = useRef(false);

  // Detect Device Name from User Agent
  useEffect(() => {
    const ua = navigator.userAgent;
    if (ua.includes('Android')) {
      const match = ua.match(/Android\s+([\d.]+);\s+([^;)]+)/);
      if (match && match[2]) {
        setDeviceName(match[2].trim());
      } else {
        setDeviceName('Android Device');
      }
    }
  }, []);

  // Heartbeat to Server every 3 seconds
  useEffect(() => {
    const sendHeartbeat = async () => {
      try {
        const res = await fetch('/api/v1/hardware/heartbeat/mobile-scanner', { method: 'POST' });
        setIsConnected(res.ok);
      } catch {
        setIsConnected(false);
      }
    };

    sendHeartbeat();
    const interval = setInterval(sendHeartbeat, 3000);
    return () => clearInterval(interval);
  }, []);

  // Initialize and manage camera scanning
  useEffect(() => {
    let isCancelled = false;

    const initScanner = async () => {
      if (isStartingRef.current) return;
      isStartingRef.current = true;
      setIsCameraLoading(true);
      setCameraError(null);

      // Stop previous instance if running
      await cleanupScanner();

      if (isCancelled) {
        isStartingRef.current = false;
        return;
      }

      try {
        const element = document.getElementById('omnipos-qr-reader');
        if (!element) {
          throw new Error('Container kamera tidak ditemukan.');
        }

        const html5QrCode = new Html5Qrcode('omnipos-qr-reader');
        qrScannerRef.current = html5QrCode;

        const formatsToSupport = [
          Html5QrcodeSupportedFormats.EAN_13,
          Html5QrcodeSupportedFormats.EAN_8,
          Html5QrcodeSupportedFormats.CODE_128,
          Html5QrcodeSupportedFormats.CODE_39,
          Html5QrcodeSupportedFormats.CODE_93,
          Html5QrcodeSupportedFormats.UPC_A,
          Html5QrcodeSupportedFormats.UPC_E,
          Html5QrcodeSupportedFormats.ITF,
          Html5QrcodeSupportedFormats.QR_CODE
        ];

        const config = {
          fps: 15,
          qrbox: { width: 260, height: 160 },
          formatsToSupport,
          experimentalFeatures: {
            useBarCodeDetectorIfSupported: true
          }
        };

        // Try environment facingMode first, fallback to available camera id
        let cameraConfig: any = { facingMode };
        try {
          const cameras = await Html5Qrcode.getCameras();
          if (cameras && cameras.length > 0) {
            const backCamera = cameras.find(c => 
              c.label.toLowerCase().includes('back') || 
              c.label.toLowerCase().includes('rear') || 
              c.label.toLowerCase().includes('belakang')
            );
            if (facingMode === 'environment' && backCamera) {
              cameraConfig = backCamera.id;
            } else if (facingMode === 'user') {
              const frontCamera = cameras.find(c => 
                c.label.toLowerCase().includes('front') || 
                c.label.toLowerCase().includes('depan')
              );
              cameraConfig = frontCamera ? frontCamera.id : cameras[0].id;
            }
          }
        } catch {
          // getCameras not supported or blocked, continue with { facingMode }
        }

        if (isCancelled) {
          isStartingRef.current = false;
          return;
        }

        await html5QrCode.start(
          cameraConfig,
          config,
          (decodedText: string) => {
            const now = Date.now();
            const cooldown = scanMode === 'cashier' ? 1200 : 700;
            if (now - lastScanTimeRef.current > cooldown) {
              lastScanTimeRef.current = now;
              handleSendBarcode(decodedText);
            }
          },
          () => {
            // Periodic frame decode failure is normal when no barcode is in view
          }
        );

        if (!isCancelled) {
          setIsCameraActive(true);
          setIsCameraLoading(false);
          setCameraError(null);
        }
      } catch (err: any) {
        console.error('Camera init error:', err);
        if (!isCancelled) {
          setIsCameraLoading(false);
          setIsCameraActive(false);
          const errStr = err?.message || String(err);
          if (errStr.includes('Permission') || errStr.includes('NotAllowedError') || err?.name === 'NotAllowedError') {
            setCameraError('Izin kamera ditolak. Silakan klik ikon gembok di samping alamat browser dan ubah izin Kamera menjadi "Izinkan".');
          } else {
            setCameraError('Gagal menyalakan kamera: ' + (errStr || 'Pastikan browser diizinkan mengakses kamera.'));
          }
        }
      } finally {
        isStartingRef.current = false;
      }
    };

    initScanner();

    return () => {
      isCancelled = true;
      cleanupScanner();
    };
  }, [facingMode]);

  const cleanupScanner = async () => {
    if (qrScannerRef.current) {
      try {
        if (qrScannerRef.current.isScanning) {
          await qrScannerRef.current.stop();
        }
        await qrScannerRef.current.clear();
      } catch {}
      qrScannerRef.current = null;
    }
    setIsCameraActive(false);
  };

  const toggleTorch = async () => {
    if (!qrScannerRef.current || !qrScannerRef.current.isScanning) return;
    try {
      const nextState = !torchEnabled;
      await qrScannerRef.current.applyVideoConstraints({
        advanced: [{ torch: nextState } as any]
      });
      setTorchEnabled(nextState);
    } catch {
      alert('Lampu senter (flash) tidak didukung pada browser atau kamera ini.');
    }
  };

  const toggleCamera = () => {
    setFacingMode(prev => (prev === 'environment' ? 'user' : 'environment'));
    setTorchEnabled(false);
  };

  // Play Sound & Vibration Feedback
  const playScanFeedback = () => {
    if (soundEnabled) {
      try {
        const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
        if (AudioCtx) {
          const ctx = new AudioCtx();
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(1760, ctx.currentTime); // High pitch retail beep (A6)
          gain.gain.setValueAtTime(0.3, ctx.currentTime);
          gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.08);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start();
          osc.stop(ctx.currentTime + 0.08);
        }
      } catch {}
    }

    if (navigator.vibrate) {
      navigator.vibrate([60]);
    }
  };

  // Send Barcode to Server
  const handleSendBarcode = async (barcodeVal: string) => {
    const cleanBarcode = barcodeVal.trim();
    if (!cleanBarcode) return;

    playScanFeedback();
    setIsSending(true);

    try {
      const res = await fetch('/api/v1/hardware/mobile-scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          barcode: cleanBarcode,
          deviceName: deviceName
        })
      });

      if (res.ok) {
        const data = await res.json();
        const scanResult: ScannedResult = {
          id: Math.random().toString(),
          barcode: cleanBarcode,
          timestamp: new Date().toLocaleTimeString('id-ID'),
          found: data.found ?? true,
          product: data.product
        };

        setLastScanned(scanResult);
        setScanHistory(prev => [scanResult, ...prev.slice(0, 49)]);
      }
    } catch (err) {
      console.error('Failed to dispatch barcode:', err);
    } finally {
      setIsSending(false);
    }
  };

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (manualBarcode.trim()) {
      handleSendBarcode(manualBarcode.trim());
      setManualBarcode('');
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans select-none">
      {/* Header Bar */}
      <header className="p-3.5 bg-slate-900/90 backdrop-blur-md border-b border-slate-800 flex items-center justify-between sticky top-0 z-30">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center text-white font-bold shadow-sm">
            <Smartphone className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <h1 className="text-sm font-bold text-white tracking-tight">OmniPOS Mobile Scanner</h1>
              <span className={`w-2 h-2 rounded-full ${isConnected ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'}`} />
            </div>
            <p className="text-[10px] text-slate-400 font-mono">
              {deviceName} · {isConnected ? 'Tersambung ke Kasir' : 'Terputus'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Audio Toggle */}
          <button
            onClick={() => setSoundEnabled(!soundEnabled)}
            className="p-2 rounded-lg bg-slate-800 text-slate-300 hover:text-white border border-slate-700 active:scale-95 transition-all"
            title="Suara Beep"
          >
            {soundEnabled ? <Volume2 className="w-4 h-4 text-emerald-400" /> : <VolumeX className="w-4 h-4 text-slate-500" />}
          </button>

          {/* History Button */}
          <button
            onClick={() => setIsHistoryOpen(true)}
            className="relative p-2 rounded-lg bg-slate-800 text-slate-300 hover:text-white border border-slate-700 active:scale-95 transition-all"
            title="Riwayat Scan"
          >
            <History className="w-4 h-4" />
            {scanHistory.length > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-indigo-600 text-white text-[9px] font-bold flex items-center justify-center">
                {scanHistory.length}
              </span>
            )}
          </button>
        </div>
      </header>

      {/* Mode Selector Tabs */}
      <div className="px-3 pt-2 pb-1 bg-slate-900 border-b border-slate-800 flex gap-2">
        <button
          onClick={() => setScanMode('cashier')}
          className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
            scanMode === 'cashier' 
              ? 'bg-indigo-600 text-white shadow-sm' 
              : 'bg-slate-800 text-slate-400 hover:text-slate-200'
          }`}
        >
          <Zap className="w-3.5 h-3.5" />
          <span>Mode Kasir (Auto-Input)</span>
        </button>
        <button
          onClick={() => setScanMode('warehouse')}
          className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
            scanMode === 'warehouse' 
              ? 'bg-amber-600 text-white shadow-sm' 
              : 'bg-slate-800 text-slate-400 hover:text-slate-200'
          }`}
        >
          <Layers className="w-3.5 h-3.5" />
          <span>Mode Gudang (Cepat)</span>
        </button>
      </div>

      {/* Camera Viewfinder Viewport */}
      <div className="relative flex-1 bg-black flex items-center justify-center overflow-hidden min-h-[340px]">
        {/* The permanent DOM container for Html5Qrcode */}
        <div 
          id="omnipos-qr-reader" 
          className="w-full h-full object-cover flex items-center justify-center overflow-hidden" 
        />

        {/* Loading Overlay */}
        {isCameraLoading && (
          <div className="absolute inset-0 bg-slate-950/90 backdrop-blur-xs flex flex-col items-center justify-center space-y-3 z-20">
            <RefreshCw className="w-9 h-9 text-indigo-400 animate-spin" />
            <p className="text-xs font-bold text-slate-300">Menghubungkan ke Kamera Android...</p>
            <p className="text-[11px] text-slate-500">Klik "Izinkan" jika browser meminta izin kamera</p>
          </div>
        )}

        {/* Camera Error Overlay */}
        {!isCameraLoading && cameraError && (
          <div className="absolute inset-0 bg-slate-950/95 flex flex-col items-center justify-center p-6 text-center space-y-3.5 z-20">
            <AlertCircle className="w-12 h-12 text-rose-500 mx-auto" />
            <p className="text-xs text-rose-300 font-medium max-w-xs leading-relaxed">{cameraError}</p>
            <button
              onClick={() => {
                setFacingMode(prev => prev);
                window.location.reload();
              }}
              className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold shadow-lg active:scale-95 transition-all"
            >
              Muat Ulang / Coba Buka Kamera Lagi
            </button>
          </div>
        )}

        {/* Laser & Target Box Overlay (Active only when camera is streaming) */}
        {!isCameraLoading && isCameraActive && (
          <>
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center z-10">
              <div className="w-64 h-44 border-2 border-indigo-500/80 rounded-2xl flex flex-col justify-between p-3 shadow-[0_0_0_9999px_rgba(0,0,0,0.5)]">
                {/* Corner Indicators */}
                <div className="flex justify-between">
                  <div className="w-5 h-5 border-t-3 border-l-3 border-indigo-400 rounded-tl-lg" />
                  <div className="w-5 h-5 border-t-3 border-r-3 border-indigo-400 rounded-tr-lg" />
                </div>

                {/* Animated Laser Scanning Line */}
                <div className="w-full h-0.5 bg-gradient-to-r from-transparent via-rose-500 to-transparent shadow-[0_0_10px_#f43f5e] animate-bounce" />

                <div className="flex justify-between">
                  <div className="w-5 h-5 border-b-3 border-l-3 border-indigo-400 rounded-bl-lg" />
                  <div className="w-5 h-5 border-b-3 border-r-3 border-indigo-400 rounded-br-lg" />
                </div>
              </div>
            </div>

            {/* Quick Camera Action Buttons Overlay */}
            <div className="absolute bottom-4 left-0 right-0 z-20 flex items-center justify-center gap-4 px-4">
              <button
                onClick={toggleTorch}
                className={`p-3 rounded-full backdrop-blur-md border transition-all active:scale-90 ${
                  torchEnabled 
                    ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-lg shadow-amber-500/30' 
                    : 'bg-slate-900/80 text-slate-200 border-slate-700'
                }`}
                title="Senter Flash"
              >
                <Flashlight className="w-5 h-5" />
              </button>

              <button
                onClick={toggleCamera}
                className="p-3 rounded-full bg-slate-900/80 text-slate-200 border border-slate-700 backdrop-blur-md active:scale-90 transition-all"
                title="Ganti Kamera Depan/Belakang"
              >
                <RotateCcw className="w-5 h-5" />
              </button>
            </div>
          </>
        )}
      </div>

      {/* Live Scanned Feedback Card */}
      {lastScanned && (
        <div className="p-3.5 bg-slate-900 border-t border-slate-800 animate-in slide-in-from-bottom duration-200">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-2.5">
              <div className={`p-2 rounded-xl border ${
                lastScanned.found 
                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' 
                  : 'bg-amber-500/10 border-amber-500/30 text-amber-400'
              }`}>
                {lastScanned.found ? <CheckCircle2 className="w-5 h-5" /> : <Barcode className="w-5 h-5" />}
              </div>
              <div>
                <h3 className="font-bold text-sm text-white leading-tight">
                  {lastScanned.product?.name || `Barcode: ${lastScanned.barcode}`}
                </h3>
                {lastScanned.product ? (
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs font-extrabold text-emerald-400 font-mono">
                      Rp {lastScanned.product.sellPrice.toLocaleString('id-ID')}
                    </span>
                    <span className="text-[10px] text-slate-400 font-mono">
                      Stok: {lastScanned.product.stock} {lastScanned.product.unit || 'Pcs'}
                    </span>
                  </div>
                ) : (
                  <p className="text-[11px] text-slate-400 mt-0.5 font-mono">
                    Barcode terkirim ke kasir · Belum terdaftar di katalog
                  </p>
                )}
              </div>
            </div>

            <span className="text-[10px] text-slate-500 font-mono shrink-0">
              {lastScanned.timestamp}
            </span>
          </div>
        </div>
      )}

      {/* Manual Barcode Input Fallback Footer */}
      <footer className="p-3 bg-slate-900 border-t border-slate-800">
        <form onSubmit={handleManualSubmit} className="flex gap-2">
          <input
            type="text"
            value={manualBarcode}
            onChange={(e) => setManualBarcode(e.target.value)}
            placeholder="Ketik Barcode / SKU jika kamera bermasalah..."
            className="flex-1 px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white font-mono placeholder:text-slate-500 focus:outline-none focus:border-indigo-500"
          />
          <button
            type="submit"
            disabled={!manualBarcode.trim() || isSending}
            className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 shadow-sm active:scale-95 transition-all"
          >
            <Send className="w-3.5 h-3.5" />
            <span>Kirim</span>
          </button>
        </form>
      </footer>

      {/* Scan History Drawer */}
      {isHistoryOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 flex flex-col justify-end">
          <div className="bg-slate-900 border-t border-slate-800 rounded-t-2xl max-h-[80vh] flex flex-col p-4 space-y-3">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <History className="w-4 h-4 text-indigo-400" />
                <h2 className="text-sm font-bold text-white">Riwayat Pindaian ({scanHistory.length})</h2>
              </div>
              <button
                onClick={() => setIsHistoryOpen(false)}
                className="p-1.5 rounded-lg bg-slate-800 text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-2 pr-1">
              {scanHistory.length === 0 ? (
                <p className="text-xs text-slate-500 text-center py-6">Belum ada riwayat pindaian.</p>
              ) : (
                scanHistory.map((item) => (
                  <div key={item.id} className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between text-xs">
                    <div>
                      <p className="font-bold text-white text-xs">{item.product?.name || item.barcode}</p>
                      <p className="text-[10px] text-slate-400 font-mono">
                        {item.barcode} · {item.timestamp}
                      </p>
                    </div>
                    {item.product && (
                      <span className="font-mono font-bold text-emerald-400 text-xs">
                        Rp {item.product.sellPrice.toLocaleString('id-ID')}
                      </span>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
