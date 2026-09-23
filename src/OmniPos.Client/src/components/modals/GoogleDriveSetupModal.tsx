import React, { useState, useEffect } from 'react';
import { 
  Cloud, 
  Key, 
  ShieldCheck, 
  CheckCircle2, 
  AlertTriangle, 
  X, 
  Eye, 
  EyeOff, 
  RefreshCw, 
  HardDrive, 
  Clock, 
  HelpCircle,
  ExternalLink,
  Save,
  Check
} from 'lucide-react';

interface GoogleDriveSetupModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved?: () => void;
}

export const GoogleDriveSetupModal: React.FC<GoogleDriveSetupModalProps> = ({
  isOpen,
  onClose,
  onSaved
}) => {
  const [email, setEmail] = useState('');
  const [clientId, setClientId] = useState('');
  const [clientSecret, setClientSecret] = useState('');
  const [showSecret, setShowSecret] = useState(false);
  const [folderName, setFolderName] = useState('OmniPOS_Backups');
  const [masterKey, setMasterKey] = useState('');
  const [showMasterKey, setShowMasterKey] = useState(false);
  const [autoOnShiftClose, setAutoOnShiftClose] = useState(true);
  const [autoDaily, setAutoDaily] = useState(true);
  const [retentionDays, setRetentionDays] = useState(30);

  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [isConfigured, setIsConfigured] = useState(false);
  const [showGuide, setShowGuide] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadConfig();
      setTestResult(null);
      setSaveSuccess(false);
    }
  }, [isOpen]);

  const loadConfig = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/v1/backup/config');
      if (res.ok) {
        const data = await res.json();
        setEmail(data.email || '');
        setClientId(data.clientId || '');
        setClientSecret(data.clientSecret || '');
        setFolderName(data.folderName || 'OmniPOS_Backups');
        setMasterKey(data.masterKey || 'OmniPOS-Secure-Vault-Key-2026');
        setAutoOnShiftClose(data.autoOnShiftClose ?? true);
        setAutoDaily(data.autoDaily ?? true);
        setRetentionDays(data.retentionDays || 30);
        setIsConfigured(data.isConfigured);
      }
    } catch (e) {
      console.error('Failed to load backup config:', e);
    } finally {
      setIsLoading(false);
    }
  };

  const generateRandomKey = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%&*';
    let key = 'OmniPOS-';
    for (let i = 0; i < 20; i++) {
      key += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setMasterKey(key);
    setShowMasterKey(true);
  };

  const handleTestConnection = async () => {
    setIsTesting(true);
    setTestResult(null);
    try {
      const res = await fetch('/api/v1/backup/test-gdrive', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), clientId: clientId.trim() })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setTestResult({
          success: true,
          message: data.message || 'Koneksi ke Google Drive berhasil terverifikasi!'
        });
      } else {
        setTestResult({
          success: false,
          message: data.message || 'Gagal terhubung ke Google Drive. Pastikan kredensial benar.'
        });
      }
    } catch (e) {
      setTestResult({
        success: false,
        message: 'Koneksi gagal: Server POS tidak dapat dihubungi.'
      });
    } finally {
      setIsTesting(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setSaveSuccess(false);
    try {
      const res = await fetch('/api/v1/backup/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email.trim(),
          clientId: clientId.trim(),
          clientSecret: clientSecret.trim(),
          folderName: folderName.trim() || 'OmniPOS_Backups',
          masterKey: masterKey.trim() || 'OmniPOS-Secure-Vault-Key-2026',
          autoOnShiftClose,
          autoDaily,
          retentionDays: Number(retentionDays) || 30
        })
      });

      if (res.ok) {
        setIsConfigured(Boolean(email.trim() || clientId.trim()));
        setSaveSuccess(true);
        if (onSaved) onSaved();
        setTimeout(() => setSaveSuccess(false), 3000);
      } else {
        alert('Gagal menyimpan konfigurasi. Silakan coba lagi.');
      }
    } catch (e) {
      console.error('Failed to save config:', e);
      alert('Terjadi kesalahan jaringan saat menyimpan konfigurasi.');
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-white dark:bg-card-dark rounded-2xl shadow-2xl border border-gray-100 dark:border-gray-800 w-full max-w-2xl max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in duration-200">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-gray-800 bg-gradient-to-r from-blue-50/50 via-white to-indigo-50/50 dark:from-blue-950/20 dark:via-card-dark dark:to-indigo-950/20">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600/10 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400 flex items-center justify-center">
              <Cloud className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                Setup Akun Google Drive Cloud Backup
                <span className="text-xs px-2 py-0.5 rounded-full font-semibold bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300">
                  AES-256
                </span>
              </h2>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Amankan database POS otomatis ke Google Drive pribadi/toko Anda
              </p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Status Badge Banner */}
        <div className="px-6 pt-4">
          {isConfigured ? (
            <div className="p-3 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 rounded-xl flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                <div>
                  <p className="text-xs font-semibold text-emerald-800 dark:text-emerald-300">
                    Akun Google Drive Terhubung & Aktif
                  </p>
                  <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-mono">
                    {email || clientId} • Folder: {folderName}
                  </p>
                </div>
              </div>
              <span className="text-[11px] bg-emerald-100 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-200 px-2.5 py-1 rounded-full font-bold">
                Online & Siap Sync
              </span>
            </div>
          ) : (
            <div className="p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-xl flex items-center gap-2.5">
              <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0" />
              <div>
                <p className="text-xs font-semibold text-amber-800 dark:text-amber-300">
                  Google Drive Belum Dikonfigurasi
                </p>
                <p className="text-[11px] text-amber-700 dark:text-amber-400">
                  Cadangan saat ini hanya tersimpan di harddisk kasir. Hubungkan Google Drive agar data aman saat PC kasir rusak/hilang.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Content Form */}
        <form onSubmit={handleSave} className="p-6 overflow-y-auto flex-1 space-y-5">
          {isLoading ? (
            <div className="py-12 flex flex-col items-center justify-center text-gray-500">
              <RefreshCw className="w-8 h-8 animate-spin text-primary mb-2" />
              <p className="text-sm">Memuat konfigurasi Google Drive...</p>
            </div>
          ) : (
            <>
              {/* Account Credential Section */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-gray-300 flex items-center gap-1.5">
                    <Cloud className="w-4 h-4 text-blue-500" />
                    Kredensial Akun Google
                  </h3>
                  <button
                    type="button"
                    onClick={() => setShowGuide(!showGuide)}
                    className="text-xs text-primary hover:underline flex items-center gap-1 font-medium"
                  >
                    <HelpCircle className="w-3.5 h-3.5" />
                    {showGuide ? 'Sembunyikan Panduan' : 'Panduan 3 Langkah'}
                  </button>
                </div>

                {/* Quick 3-Step Guide Collapsible */}
                {showGuide && (
                  <div className="p-4 bg-blue-50/70 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900 rounded-xl text-xs space-y-2 text-gray-700 dark:text-gray-300 animate-in fade-in">
                    <p className="font-bold text-blue-900 dark:text-blue-200 flex items-center gap-1.5">
                      <HelpCircle className="w-4 h-4" /> Cara Membuat Google Drive API Credentials:
                    </p>
                    <ol className="list-decimal pl-4 space-y-1 text-xs">
                      <li>
                        Buka <a href="https://console.cloud.google.com" target="_blank" rel="noreferrer" className="text-blue-600 underline font-semibold inline-flex items-center gap-0.5">Google Cloud Console <ExternalLink className="w-3 h-3" /></a>, buat project baru (contoh: <em>OmniPOS Backup</em>).
                      </li>
                      <li>
                        Pilih menu <strong>APIs & Services &gt; Library</strong>, cari dan aktifkan <strong>Google Drive API</strong>.
                      </li>
                      <li>
                        Buka menu <strong>Credentials &gt; Create Credentials &gt; OAuth client ID</strong> (pilih Desktop Application), lalu salin Client ID & Client Secret ke form di bawah ini.
                      </li>
                    </ol>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Google Account Email */}
                  <div>
                    <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Email Akun Google Toko <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="toko.berkah@gmail.com"
                      className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-800/80 border border-gray-200 dark:border-gray-700 rounded-lg text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors"
                    />
                    <p className="text-[11px] text-gray-500 mt-1">Akun Google pemilik cadangan</p>
                  </div>

                  {/* Target Folder Name */}
                  <div>
                    <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Nama Folder di Google Drive
                    </label>
                    <input
                      type="text"
                      value={folderName}
                      onChange={(e) => setFolderName(e.target.value)}
                      placeholder="OmniPOS_Backups"
                      className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-800/80 border border-gray-200 dark:border-gray-700 rounded-lg text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors font-mono"
                    />
                    <p className="text-[11px] text-gray-500 mt-1">Otomatis dibuat jika belum ada</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Client ID */}
                  <div>
                    <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Google OAuth Client ID
                    </label>
                    <input
                      type="text"
                      value={clientId}
                      onChange={(e) => setClientId(e.target.value)}
                      placeholder="xxxx-yyyy.apps.googleusercontent.com"
                      className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-800/80 border border-gray-200 dark:border-gray-700 rounded-lg text-xs font-mono text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors"
                    />
                  </div>

                  {/* Client Secret */}
                  <div>
                    <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Google Client Secret
                    </label>
                    <div className="relative">
                      <input
                        type={showSecret ? 'text' : 'password'}
                        value={clientSecret}
                        onChange={(e) => setClientSecret(e.target.value)}
                        placeholder="GOCSPX-xxxxxxxxxxxxx"
                        className="w-full px-3 py-2 pr-9 bg-gray-50 dark:bg-gray-800/80 border border-gray-200 dark:border-gray-700 rounded-lg text-xs font-mono text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors"
                      />
                      <button
                        type="button"
                        onClick={() => setShowSecret(!showSecret)}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                      >
                        {showSecret ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Master Encryption Key (AES-256) */}
              <div className="pt-2 border-t border-gray-100 dark:border-gray-800 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-gray-300 flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-emerald-500" />
                    Kunci Enkripsi Master Database (AES-256-GCM)
                  </h3>
                  <button
                    type="button"
                    onClick={generateRandomKey}
                    className="text-xs text-primary hover:underline font-medium flex items-center gap-1"
                  >
                    <Key className="w-3.5 h-3.5" />
                    Acak Kunci Baru
                  </button>
                </div>

                <div className="relative">
                  <input
                    type={showMasterKey ? 'text' : 'password'}
                    required
                    value={masterKey}
                    onChange={(e) => setMasterKey(e.target.value)}
                    placeholder="Masukkan kunci enkripsi database..."
                    className="w-full px-3 py-2 pr-10 bg-gray-50 dark:bg-gray-800/80 border border-gray-200 dark:border-gray-700 rounded-lg text-xs font-mono text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors"
                  />
                  <button
                    type="button"
                    onClick={() => setShowMasterKey(!showMasterKey)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                  >
                    {showMasterKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                <div className="p-2.5 bg-gray-50 dark:bg-gray-800/40 rounded-lg border border-gray-200 dark:border-gray-700/60 text-[11px] text-gray-500 dark:text-gray-400 flex items-start gap-2">
                  <Key className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                  <span>
                    <strong>Penting:</strong> Kunci ini digunakan untuk mengunci file zip sebelum diunggah ke Google Drive. Simpan kunci ini di catatan pribadi pemilik toko agar data dapat direstore jika PC rusak.
                  </span>
                </div>
              </div>

              {/* Automation & Schedule */}
              <div className="pt-2 border-t border-gray-100 dark:border-gray-800 space-y-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-gray-300 flex items-center gap-1.5">
                  <Clock className="w-4 h-4 text-purple-500" />
                  Otomatisasi Jadwal Cadangan
                </h3>

                <div className="space-y-2.5">
                  <label className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-800/40 rounded-xl border border-gray-200 dark:border-gray-800 cursor-pointer hover:bg-gray-100/60 dark:hover:bg-gray-800/80 transition-colors">
                    <input
                      type="checkbox"
                      checked={autoOnShiftClose}
                      onChange={(e) => setAutoOnShiftClose(e.target.checked)}
                      className="w-4 h-4 rounded text-primary focus:ring-primary border-gray-300"
                    />
                    <div className="flex-1">
                      <p className="text-xs font-semibold text-gray-900 dark:text-white">
                        Auto-Backup saat Tutup Shift (Z-Report)
                      </p>
                      <p className="text-[11px] text-gray-500">
                        Setiap kali kasir menutup shift, cadangan otomatis dibuat dan disinkronkan ke Google Drive di latar belakang.
                      </p>
                    </div>
                  </label>

                  <label className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-800/40 rounded-xl border border-gray-200 dark:border-gray-800 cursor-pointer hover:bg-gray-100/60 dark:hover:bg-gray-800/80 transition-colors">
                    <input
                      type="checkbox"
                      checked={autoDaily}
                      onChange={(e) => setAutoDaily(e.target.checked)}
                      className="w-4 h-4 rounded text-primary focus:ring-primary border-gray-300"
                    />
                    <div className="flex-1">
                      <p className="text-xs font-semibold text-gray-900 dark:text-white">
                        Auto-Backup Harian Tengah Malam (23:59)
                      </p>
                      <p className="text-[11px] text-gray-500">
                        Cadangan harian otomatis untuk rekap tutup buku seluruh transaksi harian.
                      </p>
                    </div>
                  </label>
                </div>

                <div className="flex items-center justify-between text-xs text-gray-600 dark:text-gray-400 pt-1">
                  <span>Kebijakan Retensi Cadangan (Rolling Retention):</span>
                  <span className="font-semibold text-gray-900 dark:text-white bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded">
                    Simpan 30 File Terakhir
                  </span>
                </div>
              </div>

              {/* Test Connection Banner */}
              {testResult && (
                <div className={`p-3.5 rounded-xl border text-xs flex items-start gap-2.5 animate-in fade-in ${
                  testResult.success 
                    ? 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300' 
                    : 'bg-rose-50 dark:bg-rose-950/30 border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-300'
                }`}>
                  {testResult.success ? (
                    <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                  ) : (
                    <AlertTriangle className="w-5 h-5 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
                  )}
                  <div className="flex-1">
                    <p className="font-semibold">{testResult.success ? 'Uji Koneksi Berhasil!' : 'Uji Koneksi Gagal'}</p>
                    <p className="mt-0.5 text-[11px] leading-relaxed">{testResult.message}</p>
                  </div>
                </div>
              )}

              {saveSuccess && (
                <div className="p-3 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 rounded-xl text-xs text-emerald-800 dark:text-emerald-300 flex items-center gap-2 animate-in fade-in">
                  <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Pengaturan akun Google Drive dan enkripsi berhasil disimpan!</span>
                </div>
              )}
            </>
          )}

          {/* Footer Actions */}
          <div className="pt-4 border-t border-gray-100 dark:border-gray-800 flex flex-wrap items-center justify-between gap-3">
            <button
              type="button"
              disabled={isTesting || !email.trim()}
              onClick={handleTestConnection}
              className="px-4 py-2 bg-blue-50 hover:bg-blue-100 dark:bg-blue-900/30 dark:hover:bg-blue-900/50 text-blue-700 dark:text-blue-300 rounded-xl font-medium text-xs flex items-center gap-2 transition-colors disabled:opacity-50"
            >
              {isTesting ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <HardDrive className="w-4 h-4" />
              )}
              {isTesting ? 'Menguji Koneksi...' : 'Uji Koneksi Google Drive'}
            </button>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 border border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl text-xs font-medium text-gray-700 dark:text-gray-300 transition-colors"
              >
                Tutup
              </button>
              <button
                type="submit"
                disabled={isSaving}
                className="px-5 py-2 bg-primary hover:bg-primary-dark text-white rounded-xl text-xs font-semibold flex items-center gap-2 shadow-sm shadow-primary/20 transition-all disabled:opacity-50"
              >
                {isSaving ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <Save className="w-4 h-4" />
                )}
                {isSaving ? 'Menyimpan...' : 'Simpan Konfigurasi'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
