import React, { useState, useEffect } from 'react';
import { 
  Smartphone, 
  QrCode, 
  Copy, 
  Check, 
  Wifi, 
  ExternalLink, 
  RefreshCw, 
  ShieldCheck, 
  Zap, 
  X,
  Radio,
  CheckCircle2,
  Info
} from 'lucide-react';
import { QRCodeEncoder } from '../../utils/qrCodeGenerator';
import { useToastStore } from '../../store/useToastStore';
import { useHardwareStore } from '../../store/useHardwareStore';

interface MobileScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const MobileScannerModal: React.FC<MobileScannerModalProps> = ({ isOpen, onClose }) => {
  const [networkInfo, setNetworkInfo] = useState<{
    primaryIp: string;
    port: number;
    localIps: string[];
    mobileScanUrl: string;
    activeScanners: number;
  } | null>(null);

  const [isLoading, setIsLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [qrSvg, setQrSvg] = useState<string>('');
  const [recentScans, setRecentScans] = useState<any[]>([]);

  useEffect(() => {
    if (isOpen) {
      fetchNetworkInfo();
      const interval = setInterval(fetchRecentScans, 2500);
      return () => clearInterval(interval);
    }
  }, [isOpen]);

  const fetchNetworkInfo = async () => {
    try {
      setIsLoading(true);
      const res = await fetch('/api/v1/system/network-info');
      if (res.ok) {
        const data = await res.json();
        // If on localhost / loopback, use the real network IP returned by server
        const fullUrl = data.mobileScanUrl || `${window.location.origin}/mobile-scan`;
        setNetworkInfo({ ...data, mobileScanUrl: fullUrl });
        const svg = QRCodeEncoder.generateSVG(fullUrl, 220);
        setQrSvg(svg);
      } else {
        const fallbackUrl = `${window.location.origin}/mobile-scan`;
        setNetworkInfo({
          primaryIp: window.location.hostname,
          port: parseInt(window.location.port || '5000'),
          localIps: [window.location.hostname],
          mobileScanUrl: fallbackUrl,
          activeScanners: 0
        });
        setQrSvg(QRCodeEncoder.generateSVG(fallbackUrl, 220));
      }
    } catch {
      const fallbackUrl = `${window.location.origin}/mobile-scan`;
      setNetworkInfo({
        primaryIp: window.location.hostname,
        port: parseInt(window.location.port || '5000'),
        localIps: [window.location.hostname],
        mobileScanUrl: fallbackUrl,
        activeScanners: 0
      });
      setQrSvg(QRCodeEncoder.generateSVG(fallbackUrl, 220));
    } finally {
      setIsLoading(false);
    }
  };

  const fetchRecentScans = async () => {
    try {
      const res = await fetch('/api/v1/hardware/mobile-scan/poll');
      if (res.ok) {
        const data = await res.json();
        setRecentScans(data.scans || []);
      }
    } catch {}
  };

  if (!isOpen) return null;

  const handleCopyUrl = () => {
    if (networkInfo?.mobileScanUrl) {
      navigator.clipboard.writeText(networkInfo.mobileScanUrl);
      setCopied(true);
      useToastStore.getState().showToast('URL Scanner disalin ke clipboard!', 'success');
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4 select-none">
      <div className="bg-card border border-border-strong w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-4 bg-surface border-b border-border-subtle flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/10 text-indigo-500 flex items-center justify-center font-bold">
              <Smartphone className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-bold text-text-primary">Sambungkan Scanner Barcode HP Android</h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-600 border border-emerald-500/30 flex items-center gap-1">
                  <Radio className="w-3 h-3 text-emerald-500 animate-pulse" />
                  WiFi / LAN Ready
                </span>
              </div>
              <p className="text-xs text-text-secondary mt-0.5">
                Gunakan kamera HP Android Anda sebagai scanner barcode nirkabel langsung ke kasir
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-subtle text-text-muted hover:text-text-primary font-bold text-sm"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-6">
          {/* Main 2-Column Section */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
            {/* Left: QR Code Card */}
            <div className="p-5 bg-subtle rounded-2xl border border-border-subtle flex flex-col items-center justify-center text-center space-y-3">
              <div className="p-2 bg-white rounded-xl shadow-md border border-slate-200">
                {qrSvg ? (
                  <div 
                    dangerouslySetInnerHTML={{ __html: qrSvg }} 
                    className="w-48 h-48 flex items-center justify-center"
                  />
                ) : (
                  <div className="w-48 h-48 flex items-center justify-center text-text-muted">
                    <RefreshCw className="w-6 h-6 animate-spin" />
                  </div>
                )}
              </div>

              <div>
                <p className="text-xs font-bold text-text-primary">Pindai QR ini di HP Android</p>
                <p className="text-[11px] text-text-muted">Gunakan Kamera HP / Google Lens / Browser</p>
              </div>
            </div>

            {/* Right: Steps & URL Box */}
            <div className="space-y-4">
              <div className="space-y-3 text-xs">
                <div className="flex items-start gap-2.5">
                  <div className="w-5 h-5 rounded-full bg-primary/20 text-primary font-bold flex items-center justify-center shrink-0 mt-0.5 text-[10px]">
                    1
                  </div>
                  <p className="text-text-secondary leading-relaxed">
                    Pastikan HP Android terhubung ke <strong>WiFi / Hotspot yang sama</strong> dengan komputer kasir.
                  </p>
                </div>

                <div className="flex items-start gap-2.5">
                  <div className="w-5 h-5 rounded-full bg-primary/20 text-primary font-bold flex items-center justify-center shrink-0 mt-0.5 text-[10px]">
                    2
                  </div>
                  <p className="text-text-secondary leading-relaxed">
                    Arahkan kamera HP ke QR Code, atau buka link di bawah pada browser HP (Chrome / Samsung Internet).
                  </p>
                </div>

                <div className="flex items-start gap-2.5">
                  <div className="w-5 h-5 rounded-full bg-primary/20 text-primary font-bold flex items-center justify-center shrink-0 mt-0.5 text-[10px]">
                    3
                  </div>
                  <p className="text-text-secondary leading-relaxed">
                    Arahkan kamera HP ke barcode produk — <strong>otomatis masuk ke keranjang belanja kasir</strong> secara instan!
                  </p>
                </div>
              </div>

              {/* Direct URL Box */}
              <div className="p-3 bg-card border border-border-strong rounded-xl space-y-1.5">
                <label className="text-[11px] font-semibold text-text-secondary block">
                  Link Langsung Scanner HP:
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    readOnly
                    value={networkInfo?.mobileScanUrl || 'Memuat...'}
                    className="flex-1 px-3 py-1.5 bg-subtle border border-border-subtle rounded-lg text-xs font-mono text-text-primary select-all focus:outline-none"
                  />
                  <button
                    onClick={handleCopyUrl}
                    className="px-3 py-1.5 bg-primary/10 hover:bg-primary/20 text-primary border border-primary/30 rounded-lg text-xs font-bold flex items-center gap-1 transition-all"
                  >
                    {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copied ? 'Tersalin' : 'Salin'}</span>
                  </button>
                </div>
              </div>

              {/* Live Test Open Button */}
              <button
                onClick={() => window.open(networkInfo?.mobileScanUrl || '/mobile-scan', '_blank')}
                className="w-full py-2 bg-subtle hover:bg-card-hover border border-border-subtle rounded-xl text-xs font-semibold text-text-secondary flex items-center justify-center gap-1.5 transition-all"
              >
                <ExternalLink className="w-3.5 h-3.5 text-primary" />
                <span>Uji Coba Buka di Tab Baru Komputer</span>
              </button>
            </div>
          </div>

          {/* Live Recent Mobile Scans Feed */}
          <div className="p-4 bg-subtle rounded-xl border border-border-subtle space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-text-primary flex items-center gap-1.5">
                <Zap className="w-3.5 h-3.5 text-amber-500" />
                Monitor Aktivitas Scan HP Real-time
              </span>
              <span className="text-[11px] text-text-muted font-mono">
                {recentScans.length} Pindaian Terakhir
              </span>
            </div>

            {recentScans.length === 0 ? (
              <p className="text-xs text-text-muted text-center py-3">
                Belum ada pindaian dari HP. Pindai QR di atas untuk mulai scan barang.
              </p>
            ) : (
              <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                {recentScans.slice(-5).reverse().map((scan: any, idx: number) => (
                  <div key={idx} className="p-2 rounded-lg bg-card border border-border-subtle flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-emerald-500" />
                      <div>
                        <p className="font-bold text-text-primary">{scan.product?.name || `Barcode: ${scan.barcode}`}</p>
                        <p className="text-[10px] text-text-muted font-mono">{scan.deviceName || 'HP Android'} · {scan.barcode}</p>
                      </div>
                    </div>
                    {scan.product && (
                      <span className="font-mono font-bold text-emerald-600 text-xs">
                        Rp {scan.product.sellPrice.toLocaleString('id-ID')}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-surface border-t border-border-subtle flex items-center justify-between text-xs">
          <div className="flex items-center gap-2 text-text-muted text-[11px]">
            <ShieldCheck className="w-4 h-4 text-emerald-500" />
            <span>Kamera HP berjalan sepenuhnya di jaringan lokal toko (aman tanpa internet luar)</span>
          </div>
          <button
            onClick={onClose}
            className="px-5 py-2 bg-primary hover:bg-primary-hover text-primary-text font-bold rounded-xl shadow-sm"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
};
