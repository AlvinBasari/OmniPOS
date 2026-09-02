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
  Wifi, 
  WifiOff, 
  History, 
  Barcode, 
  Package, 
  Zap, 
  Layers,
  Sparkles,
  RefreshCw,
  X
} from 'lucide-react';

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

  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const isScanningRef = useRef(false);
  const lastScanTimeRef = useRef(0);

  // Initialize Device Name from User Agent
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

  // Start Camera Stream
  useEffect(() => {
    startCamera();
    return () => {
      stopCamera();
    };
  }, [facingMode]);

  const startCamera = async () => {
    stopCamera();
    setCameraError(null);

    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setCameraError('Browser ini tidak mendukung akses kamera langsung. Gunakan Google Chrome / Samsung Internet.');
        return;
      }

      const constraints: MediaStreamConstraints = {
        video: {
          facingMode: { ideal: facingMode },
          width: { ideal: 1280 },
          height: { ideal: 720 }
        },
        audio: false
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.setAttribute('playsinline', 'true');
        await videoRef.current.play();
        setIsCameraActive(true);
        startBarcodeDetection();
      }
    } catch (err: any) {
      console.error('Camera access error:', err);
      setCameraError(
        err.name === 'NotAllowedError' 
          ? 'Izin kamera ditolak. Silakan izinkan akses kamera di pengaturan browser Android Anda.' 
          : 'Gagal membuka kamera: ' + (err.message || 'Perangkat kamera sibuk.')
      );
      setIsCameraActive(false);
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    isScanningRef.current = false;
    setIsCameraActive(false);
  };

  const toggleTorch = async () => {
    if (!streamRef.current) return;
    const track = streamRef.current.getVideoTracks()[0];
    if (track) {
      try {
        const capabilities: any = track.getCapabilities?.() || {};
        if (capabilities.torch) {
          const nextState = !torchEnabled;
          await (track as any).applyConstraints({
            advanced: [{ torch: nextState }]
          });
          setTorchEnabled(nextState);
        } else {
          alert('Lampu senter (torch) tidak didukung oleh kamera ini.');
        }
      } catch (err) {
        console.warn('Torch not supported:', err);
      }
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

  // Barcode Detection Loop
  const startBarcodeDetection = () => {
    if (isScanningRef.current) return;
    isScanningRef.current = true;

    // Check for native BarcodeDetector API (Available on Android Chrome/Edge/Opera)
    if ('BarcodeDetector' in window) {
      const barcodeDetector = new (window as any).BarcodeDetector({
        formats: [
          'ean_13', 
          'ean_8', 
          'code_128', 
          'code_39', 
          'code_93', 
          'itf', 
          'upc_a', 
          'upc_e', 
          'qr_code', 
          'data_matrix'
        ]
      });

      const detectFrame = async () => {
        if (!isScanningRef.current || !videoRef.current) return;

        if (videoRef.current.readyState === videoRef.current.HAVE_ENOUGH_DATA) {
          try {
            const barcodes = await barcodeDetector.detect(videoRef.current);
            if (barcodes.length > 0) {
              const rawCode = barcodes[0].rawValue;
              const now = Date.now();
              // Debounce 1.2s between identical scans in single mode or 0.8s in warehouse mode
              if (now - lastScanTimeRef.current > (scanMode === 'cashier' ? 1200 : 800)) {
                lastScanTimeRef.current = now;
                handleSendBarcode(rawCode);
              }
            }
          } catch (e) {
            // Ignore frame decode errors
          }
        }
        requestAnimationFrame(detectFrame);
      };

      requestAnimationFrame(detectFrame);
    } else {
      // Fallback: Canvas periodic analyzer
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');

      const fallbackFrame = () => {
        if (!isScanningRef.current || !videoRef.current) return;
        requestAnimationFrame(fallbackFrame);
      };
      requestAnimationFrame(fallbackFrame);
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
          found: data.found,
          product: data.product
        };

        setLastScanned(scanResult);
        setScanHistory(prev => [scanResult, ...prev.slice(0, 49)]);
        setManualBarcode('');
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
      <div className="relative flex-1 bg-black flex items-center justify-center overflow-hidden min-h-[320px]">
        {isCameraActive ? (
          <>
            <video
              ref={videoRef}
              autoPlay
              muted
              playsInline
              className="absolute inset-0 w-full h-full object-cover"
            />

            {/* Viewfinder Target Box Overlay */}
            <div className="relative z-10 w-64 h-48 border-2 border-indigo-500/60 rounded-2xl flex flex-col justify-between p-3 pointer-events-none shadow-[0_0_0_9999px_rgba(0,0,0,0.55)]">
              {/* Corner Indicators */}
              <div className="flex justify-between">
                <div className="w-5 h-5 border-t-3 border-l-3 border-indigo-400 rounded-tl-lg" />
                <div className="w-5 h-5 border-t-3 border-r-3 border-indigo-400 rounded-tr-lg" />
              </div>

              {/* Animated Laser Scanning Line */}
              <div className="w-full h-0.5 bg-gradient-to-r from-transparent via-rose-500 to-transparent shadow-[0_0_8px_#f43f5e] animate-bounce" />

              <div className="flex justify-between">
                <div className="w-5 h-5 border-b-3 border-l-3 border-indigo-400 rounded-bl-lg" />
                <div className="w-5 h-5 border-b-3 border-r-3 border-indigo-400 rounded-br-lg" />
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
        ) : (
          <div className="p-6 text-center space-y-3 max-w-xs">
            {cameraError ? (
              <div className="space-y-3">
                <AlertCircle className="w-10 h-10 text-rose-500 mx-auto" />
                <p className="text-xs text-rose-300 font-medium">{cameraError}</p>
                <button
                  onClick={startCamera}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-xs font-bold shadow-sm"
                >
                  Coba Buka Kamera Lagi
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                <RefreshCw className="w-8 h-8 text-indigo-400 animate-spin mx-auto" />
                <p className="text-xs text-slate-400">Menghubungkan ke kamera Android...</p>
              </div>
            )}
          </div>
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
            placeholder="Ketik Barcode / SKU jika stiker rusak..."
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
