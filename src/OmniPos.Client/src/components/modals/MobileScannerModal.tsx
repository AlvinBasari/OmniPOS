import React, { useState, useEffect } from 'react';
import { 
  Smartphone, 
  Copy, 
  Check, 
  Wifi, 
  ExternalLink, 
  RefreshCw, 
  ShieldCheck, 
  Zap, 
  X, 
  Radio, 
  AlertTriangle,
  Globe,
  Lock,
  Edit3
} from 'lucide-react';
import { QRCodeEncoder } from '../../utils/qrCodeGenerator';
import { useToastStore } from '../../store/useToastStore';
import { useHardwareStore } from '../../store/useHardwareStore';

interface MobileScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const MobileScannerModal: React.FC<MobileScannerModalProps> = ({ isOpen, onClose }) => {
  const { isMobileScannerEnabled, setIsMobileScannerEnabled } = useHardwareStore();
  const [networkInfo, setNetworkInfo] = useState<{
    primaryIp: string;
    port: number;
    localIps: string[];
    mobileScanUrl: string;
    isUsbTethering?: boolean;
    tunnelActive?: boolean;
    tunnelUrl?: string | null;
    activeScanners: number;
  } | null>(null);

  const [connectionType, setConnectionType] = useState<'local' | 'cloud'>('local');
  const [isLoading, setIsLoading] = useState(false);
  const [isStartingTunnel, setIsStartingTunnel] = useState(false);
  const [copied, setCopied] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [recentScans, setRecentScans] = useState<any[]>([]);
  const [activeUrl, setActiveUrl] = useState<string>('');
  const [isEditingIp, setIsEditingIp] = useState(false);
  const [customIp, setCustomIp] = useState('');

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
        const fullUrl = data.mobileScanUrl || `${window.location.origin}/mobile-scan`;
        setNetworkInfo({ ...data, mobileScanUrl: fullUrl });

        if (data.tunnelActive && data.tunnelUrl) {
          setConnectionType('cloud');
          setActiveUrl(data.tunnelUrl);
          const imgUrl = await QRCodeEncoder.generateDataURL(data.tunnelUrl, 280);
          setQrDataUrl(imgUrl);
        } else {
          setActiveUrl(fullUrl);
          const imgUrl = await QRCodeEncoder.generateDataURL(fullUrl, 280);
          setQrDataUrl(imgUrl);
        }
      } else {
        const fallbackUrl = `${window.location.origin}/mobile-scan`;
        setNetworkInfo({
          primaryIp: window.location.hostname,
          port: parseInt(window.location.port || '5000'),
          localIps: [window.location.hostname],
          mobileScanUrl: fallbackUrl,
          activeScanners: 0
        });
        setActiveUrl(fallbackUrl);
        const imgUrl = await QRCodeEncoder.generateDataURL(fallbackUrl, 280);
        setQrDataUrl(imgUrl);
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
      setActiveUrl(fallbackUrl);
      const imgUrl = await QRCodeEncoder.generateDataURL(fallbackUrl, 280);
      setQrDataUrl(imgUrl);
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

  const handleSwitchToLocal = async (ipToUse?: string) => {
    setConnectionType('local');
    const port = networkInfo?.port || 5000;
    const chosenIp = ipToUse || networkInfo?.primaryIp || window.location.hostname;
    const url = `http://${chosenIp}:${port}/mobile-scan`;
    setActiveUrl(url);
    const imgUrl = await QRCodeEncoder.generateDataURL(url, 280);
    setQrDataUrl(imgUrl);
  };

  const handleSwitchToCloud = async () => {
    setConnectionType('cloud');
    if (networkInfo?.tunnelUrl) {
      setActiveUrl(networkInfo.tunnelUrl);
      const imgUrl = await QRCodeEncoder.generateDataURL(networkInfo.tunnelUrl, 280);
      setQrDataUrl(imgUrl);
      return;
    }

    try {
      setIsStartingTunnel(true);
      const res = await fetch('/api/v1/system/tunnel/start', { method: 'POST' });
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.url) {
          setActiveUrl(data.url);
          setNetworkInfo(prev => prev ? { ...prev, tunnelActive: true, tunnelUrl: data.url } : null);
          const imgUrl = await QRCodeEncoder.generateDataURL(data.url, 280);
          setQrDataUrl(imgUrl);
          useToastStore.getState().showToast('Jalur Cloud HTTPS berhasil diaktifkan!', 'success');
        } else {
          useToastStore.getState().showToast('Gagal memulai terowongan Cloud HTTPS. Gunakan jalur lokal.', 'error');
          handleSwitchToLocal();
        }
      } else {
        useToastStore.getState().showToast('Gagal terhubung ke layanan Cloud.', 'error');
        handleSwitchToLocal();
      }
    } catch {
      useToastStore.getState().showToast('Terjadi kesalahan saat memulai Cloud HTTPS.', 'error');
      handleSwitchToLocal();
    } finally {
      setIsStartingTunnel(false);
    }
  };

  const handleApplyCustomIp = async () => {
    if (!customIp.trim()) return;
    setIsEditingIp(false);
    await handleSwitchToLocal(customIp.trim());
    useToastStore.getState().showToast(`IP Scanner disesuaikan: ${customIp.trim()}`, 'info');
  };

  if (!isOpen) return null;

  const handleCopyUrl = () => {
    if (activeUrl) {
      navigator.clipboard.writeText(activeUrl);
      setCopied(true);
      useToastStore.getState().showToast('URL Scanner disalin ke clipboard!', 'success');
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4 select-none">
      <div className="bg-surface border border-border-strong w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header: Clean & Balanced */}
        <div className="px-5 py-4 bg-surface border-b border-border-subtle flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-bold">
              <Smartphone className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-text-primary">Scanner Barcode HP Android</h2>
                {connectionType === 'cloud' ? (
                  <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-sky-100 text-sky-800 dark:bg-sky-950/60 dark:text-sky-300 border border-sky-300 dark:border-sky-800 flex items-center gap-1">
                    <Lock className="w-3 h-3 text-sky-600 dark:text-sky-400" />
                    Cloud HTTPS
                  </span>
                ) : (
                  <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800 flex items-center gap-1">
                    <Radio className="w-3 h-3 text-emerald-600 dark:text-emerald-400 animate-pulse" />
                    WiFi / LAN Lokal
                  </span>
                )}
              </div>
              <p className="text-xs text-text-secondary mt-0.5">
                Kamera HP berfungsi nirkabel sebagai scanner barcode kasir
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl hover:bg-subtle text-text-muted hover:text-text-primary font-bold text-sm transition-colors"
            title="Tutup Modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 overflow-y-auto space-y-4">
          
          {/* Master Switch Card: High Contrast & Crystal Clear UX */}
          <div className={`p-4 rounded-xl border transition-all flex items-center justify-between shadow-xs ${
            isMobileScannerEnabled 
              ? 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-300 dark:border-emerald-800' 
              : 'bg-slate-100 dark:bg-zinc-800/80 border-slate-300 dark:border-zinc-700'
          }`}>
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold shrink-0 transition-all ${
                isMobileScannerEnabled 
                  ? 'bg-emerald-600 text-white shadow-sm' 
                  : 'bg-slate-300 dark:bg-zinc-700 text-slate-700 dark:text-zinc-300'
              }`}>
                <Smartphone className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-slate-900 dark:text-white">
                    Penerimaan Barcode dari Kamera HP
                  </span>
                  <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black tracking-wide uppercase ${
                    isMobileScannerEnabled 
                      ? 'bg-emerald-600 text-white' 
                      : 'bg-slate-600 text-white'
                  }`}>
                    {isMobileScannerEnabled ? 'AKTIF (ON)' : 'NONAKTIF (OFF)'}
                  </span>
                </div>
                <p className="text-xs text-slate-700 dark:text-zinc-300 mt-0.5">
                  {isMobileScannerEnabled 
                    ? 'Scanner HP aktif menerima barcode dan langsung memasukkan barang ke transaksi kasir.' 
                    : 'Penerimaan scan dijeda. Barcode dari HP tidak akan dimasukkan ke keranjang kasir.'}
                </p>
              </div>
            </div>

            {/* Tactile Switch Toggle Button */}
            <div className="shrink-0 pl-3">
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
                className={`relative inline-flex h-7 w-14 items-center rounded-full transition-colors focus:outline-none cursor-pointer shadow-inner p-0.5 ${
                  isMobileScannerEnabled ? 'bg-emerald-600' : 'bg-slate-400 dark:bg-zinc-600'
                }`}
                role="switch"
                aria-checked={isMobileScannerEnabled}
              >
                <span className="sr-only">Saklar Scanner HP</span>
                <span
                  className={`inline-block h-6 w-6 transform rounded-full bg-white shadow-md transition-transform flex items-center justify-center font-black text-[9px] ${
                    isMobileScannerEnabled ? 'translate-x-7 text-emerald-700' : 'translate-x-0 text-slate-600'
                  }`}
                >
                  {isMobileScannerEnabled ? 'ON' : 'OFF'}
                </span>
              </button>
            </div>
          </div>

          {/* Connection Type Switch Tabs: Clean Segmented Control */}
          <div className="bg-slate-100 dark:bg-zinc-800/80 p-1 rounded-xl border border-slate-200 dark:border-zinc-700 grid grid-cols-2 gap-1">
            <button
              onClick={() => handleSwitchToLocal()}
              className={`py-2 px-3 rounded-lg text-xs font-bold flex items-center justify-center gap-2 transition-all ${
                connectionType === 'local' 
                  ? 'bg-white dark:bg-zinc-700 text-slate-900 dark:text-white shadow-xs border border-slate-300 dark:border-zinc-600' 
                  : 'text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white font-semibold'
              }`}
            >
              <Wifi className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              <span>Jalur Lokal (WiFi / LAN Toko)</span>
            </button>

            <button
              onClick={handleSwitchToCloud}
              disabled={isStartingTunnel}
              className={`py-2 px-3 rounded-lg text-xs font-bold flex items-center justify-center gap-2 transition-all ${
                connectionType === 'cloud' 
                  ? 'bg-sky-600 text-white shadow-xs border border-sky-500' 
                  : 'text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white font-semibold'
              }`}
            >
              {isStartingTunnel ? (
                <RefreshCw className="w-4 h-4 animate-spin text-sky-200" />
              ) : (
                <Globe className="w-4 h-4 text-sky-500 dark:text-sky-300" />
              )}
              <span>Jalur Cloud Online (HTTPS)</span>
              {networkInfo?.isUsbTethering && (
                <span className="px-2 py-0.5 text-[10px] font-bold bg-amber-200 text-amber-900 dark:bg-amber-900 dark:text-amber-200 rounded-full border border-amber-300 dark:border-amber-700">
                  Solusi Tethering
                </span>
              )}
            </button>
          </div>

          {/* Diagnostic Alert: 100% Readable High-Contrast Colors */}
          {connectionType === 'local' && networkInfo?.isUsbTethering && (
            <div className="p-3.5 bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-700/60 rounded-xl flex items-start gap-3 shadow-xs">
              <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="font-bold text-amber-950 dark:text-amber-100 text-xs">
                  Perhatian: Komputer Kasir Terhubung via USB Tethering HP ({networkInfo.primaryIp})
                </p>
                <p className="text-[11px] text-amber-900 dark:text-amber-200 leading-relaxed font-normal">
                  Jika HP kasir terhubung ke WiFi toko, HP tidak dapat membuka alamat kabel USB lokal ini. 
                  Silakan klik tab <strong>"Jalur Cloud Online (HTTPS)"</strong> di atas agar HP Anda bisa langsung memindai dari jaringan mana pun.
                </p>
              </div>
            </div>
          )}

          {/* Main 2-Column Section */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 items-center">
            {/* Left: QR Code Card */}
            <div className="p-4 bg-slate-50 dark:bg-zinc-900/50 rounded-2xl border border-slate-200 dark:border-zinc-800 flex flex-col items-center justify-center text-center space-y-2.5">
              <div className="p-2.5 bg-white rounded-xl shadow-xs border border-slate-200">
                {isStartingTunnel ? (
                  <div className="w-48 h-48 flex flex-col items-center justify-center text-slate-700 space-y-2">
                    <RefreshCw className="w-8 h-8 animate-spin text-sky-600" />
                    <span className="text-xs font-bold text-slate-800">Menghubungkan Cloud HTTPS...</span>
                  </div>
                ) : qrDataUrl ? (
                  <img 
                    src={qrDataUrl} 
                    alt="QR Barcode Scanner HP" 
                    className="w-48 h-48 rounded-lg"
                  />
                ) : (
                  <div className="w-48 h-48 flex items-center justify-center text-slate-400">
                    <RefreshCw className="w-6 h-6 animate-spin" />
                  </div>
                )}
              </div>

              <div>
                <p className="text-xs font-bold text-slate-900 dark:text-white">Arahkan Kamera HP ke QR Code ini</p>
                <p className="text-[11px] text-slate-600 dark:text-zinc-400 font-medium mt-0.5">
                  {connectionType === 'cloud' ? 'Dapat dibuka dari WiFi maupun Kuota Data Seluler' : 'Buka Kamera HP / Google Lens'}
                </p>
                {!isMobileScannerEnabled && (
                  <div className="mt-2 px-3 py-1.5 rounded-lg bg-amber-100 dark:bg-amber-950/60 border border-amber-300 dark:border-amber-700 text-amber-900 dark:text-amber-200 text-xs font-semibold flex items-center justify-center gap-1.5">
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0" />
                    <span>Saklar HP sedang OFF. Scan dijeda.</span>
                  </div>
                )}
              </div>
            </div>

            {/* Right: Steps & URL Box */}
            <div className="space-y-3.5">
              <div className="space-y-2.5 text-xs">
                <div className="flex items-start gap-2.5">
                  <div className="w-5 h-5 rounded-full bg-primary/10 text-primary font-bold flex items-center justify-center shrink-0 mt-0.5 text-[10px]">
                    1
                  </div>
                  <p className="text-slate-700 dark:text-zinc-300 leading-relaxed">
                    {connectionType === 'cloud' ? (
                      <span>Gunakan HP apa saja (terhubung ke <strong className="text-slate-900 dark:text-white">WiFi toko atau Kuota Data 4G</strong>).</span>
                    ) : (
                      <span>Pastikan HP terhubung ke <strong className="text-slate-900 dark:text-white">WiFi / Hotspot yang sama</strong> dengan komputer kasir.</span>
                    )}
                  </p>
                </div>

                <div className="flex items-start gap-2.5">
                  <div className="w-5 h-5 rounded-full bg-primary/10 text-primary font-bold flex items-center justify-center shrink-0 mt-0.5 text-[10px]">
                    2
                  </div>
                  <p className="text-slate-700 dark:text-zinc-300 leading-relaxed">
                    Arahkan kamera HP ke QR Code, atau buka tautan link di bawah pada browser HP Anda.
                  </p>
                </div>

                <div className="flex items-start gap-2.5">
                  <div className="w-5 h-5 rounded-full bg-primary/10 text-primary font-bold flex items-center justify-center shrink-0 mt-0.5 text-[10px]">
                    3
                  </div>
                  <p className="text-slate-700 dark:text-zinc-300 leading-relaxed">
                    Arahkan kamera HP ke barcode produk — <strong className="text-slate-900 dark:text-white">barang seketika masuk ke keranjang belanja kasir</strong> secara otomatis!
                  </p>
                </div>
              </div>

              {/* Direct URL Box */}
              <div className="p-3 bg-slate-50 dark:bg-zinc-900/50 border border-slate-200 dark:border-zinc-700 rounded-xl space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-bold text-slate-800 dark:text-zinc-200 block">
                    Link Langsung Scanner HP:
                  </label>
                  {connectionType === 'local' && (
                    <button
                      onClick={() => {
                        setCustomIp(networkInfo?.primaryIp || '');
                        setIsEditingIp(!isEditingIp);
                      }}
                      className="text-[10px] text-primary hover:underline flex items-center gap-1 font-bold"
                    >
                      <Edit3 className="w-3 h-3" />
                      <span>{isEditingIp ? 'Batal' : 'Ubah IP Manual'}</span>
                    </button>
                  )}
                </div>

                {isEditingIp ? (
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      placeholder="Masukkan IP (misal: 192.168.1.100)"
                      value={customIp}
                      onChange={(e) => setCustomIp(e.target.value)}
                      className="flex-1 px-3 py-1.5 bg-white dark:bg-zinc-800 border border-primary/50 rounded-lg text-xs font-mono text-slate-900 dark:text-white focus:outline-none"
                    />
                    <button
                      onClick={handleApplyCustomIp}
                      className="px-3 py-1.5 bg-primary text-white rounded-lg text-xs font-bold hover:bg-primary-hover"
                    >
                      Terapkan
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      readOnly
                      value={activeUrl || 'Memuat tautan...'}
                      className="flex-1 px-3 py-2 bg-white dark:bg-zinc-800 border border-slate-300 dark:border-zinc-700 rounded-lg text-xs font-mono text-slate-800 dark:text-zinc-200 select-all"
                    />
                    <button
                      onClick={handleCopyUrl}
                      className="px-3 py-2 bg-white hover:bg-slate-50 dark:bg-zinc-700 dark:hover:bg-zinc-600 border border-slate-300 dark:border-zinc-600 rounded-lg text-xs font-bold text-slate-800 dark:text-white flex items-center gap-1.5 shadow-xs transition-colors shrink-0"
                    >
                      {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copied ? 'Tersalin' : 'Salin'}</span>
                    </button>
                  </div>
                )}

                {/* Local IP quick selectors */}
                {connectionType === 'local' && (networkInfo?.localIps?.length ?? 0) > 1 && (
                  <div className="pt-1 flex flex-wrap items-center gap-1">
                    <span className="text-[10px] text-slate-500 dark:text-zinc-400">Pilih IP Lain:</span>
                    {networkInfo?.localIps.map((ip) => {
                      const isCurrent = activeUrl.includes(ip);
                      return (
                        <button
                          key={ip}
                          onClick={() => handleSwitchToLocal(ip)}
                          className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold transition-all ${
                            isCurrent
                              ? 'bg-primary text-white ring-2 ring-primary/30'
                              : 'bg-white dark:bg-zinc-700 hover:bg-slate-100 text-slate-700 dark:text-zinc-300 border border-slate-300 dark:border-zinc-600'
                          }`}
                        >
                          {ip}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Live Test Open Button */}
              <button
                onClick={() => window.open(activeUrl || '/mobile-scan', '_blank')}
                className="w-full py-2.5 bg-slate-100 dark:bg-zinc-800 hover:bg-slate-200 dark:hover:bg-zinc-700 border border-slate-300 dark:border-zinc-700 rounded-xl text-xs font-semibold text-slate-800 dark:text-zinc-200 flex items-center justify-center gap-1.5 transition-all"
              >
                <ExternalLink className="w-3.5 h-3.5 text-primary" />
                <span>Uji Coba Buka di Tab Baru Komputer</span>
              </button>
            </div>
          </div>

          {/* Live Recent Mobile Scans Feed */}
          <div className="p-4 bg-slate-50 dark:bg-zinc-900/50 rounded-xl border border-slate-200 dark:border-zinc-800 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                  <Zap className="w-3.5 h-3.5 text-amber-500" />
                  Monitor Aktivitas Scan HP Real-time
                </span>
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold border ${
                  isMobileScannerEnabled 
                    ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800' 
                    : 'bg-slate-200 dark:bg-zinc-800 text-slate-700 dark:text-zinc-300 border-slate-300 dark:border-zinc-700'
                }`}>
                  {isMobileScannerEnabled ? '🟢 Siap Menerima Scan' : '⚪ Dijeda (Switch OFF)'}
                </span>
              </div>
              <span className="text-[11px] text-slate-500 dark:text-zinc-400 font-mono">
                {recentScans.length} Pindaian Terakhir
              </span>
            </div>

            {recentScans.length === 0 ? (
              <p className="text-xs text-slate-500 dark:text-zinc-400 text-center py-2.5">
                Belum ada pindaian dari HP. Arahkan kamera HP ke barcode untuk mulai scan.
              </p>
            ) : (
              <div className="space-y-1.5 max-h-32 overflow-y-auto pr-1">
                {recentScans.slice(-5).reverse().map((scan: any, idx: number) => (
                  <div key={idx} className="p-2.5 rounded-lg bg-white dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 flex items-center justify-between text-xs shadow-2xs">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-emerald-500" />
                      <div>
                        <p className="font-bold text-slate-900 dark:text-white">{scan.product?.name || `Barcode: ${scan.barcode}`}</p>
                        <p className="text-[10px] text-slate-500 dark:text-zinc-400 font-mono">{scan.deviceName || 'HP Android'} · {scan.barcode}</p>
                      </div>
                    </div>
                    {scan.product && (
                      <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400 text-xs">
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
        <div className="px-5 py-3.5 bg-surface border-t border-border-subtle flex items-center justify-between text-xs">
          <div className="flex items-center gap-2 text-slate-600 dark:text-zinc-400 text-[11px]">
            <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <span>
              {connectionType === 'cloud' 
                ? 'Koneksi terenkripsi HTTPS aman — izin kamera HP langsung diizinkan otomatis' 
                : 'Kamera HP berjalan aman di jaringan lokal toko'}
            </span>
          </div>
          <button
            onClick={onClose}
            className="px-6 py-2 bg-slate-900 hover:bg-black dark:bg-primary dark:hover:bg-primary-hover text-white font-bold rounded-xl shadow-xs text-xs transition-all cursor-pointer"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
};
