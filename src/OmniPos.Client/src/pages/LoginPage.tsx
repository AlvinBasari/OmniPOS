import React, { useState, useEffect } from 'react';
import { 
  Store, 
  Lock, 
  KeyRound, 
  User, 
  Phone, 
  Mail, 
  Clock, 
  FileText, 
  Headphones, 
  Copy, 
  Check, 
  AlertTriangle, 
  X,
  ShieldCheck
} from 'lucide-react';
import { useAuthStore } from '../store/useAuthStore';
import { useBusinessModeStore } from '../store/useBusinessModeStore';
import { useThemeStore } from '../store/useShiftAndThemeStores';
import { useToastStore } from '../store/useToastStore';

export const LoginPage: React.FC = () => {
  const { loginWithPin, loginWithPassword } = useAuthStore();
  const { edition } = useBusinessModeStore();
  const { showToast } = useToastStore();

  const [authMode, setAuthMode] = useState<'pin' | 'password'>('pin');
  const [users, setUsers] = useState<Array<{ id: string; username: string; fullName: string; role: string }>>([]);
  const [selectedUser, setSelectedUser] = useState<{ id: string; username: string; fullName: string; role: string } | null>(null);
  
  // PIN State
  const [pin, setPin] = useState('');
  const [pinError, setPinError] = useState('');
  const [candidateUsers, setCandidateUsers] = useState<Array<{ id: string; username: string; fullName: string; role: string }> | null>(null);

  // Password State
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Modals
  const [isTermsOpen, setIsTermsOpen] = useState(false);
  const [copiedText, setCopiedText] = useState<string | null>(null);

  // Fetch staff list for selector
  useEffect(() => {
    fetch('/api/v1/users')
      .then((res) => (res.ok ? res.json() : []))
      .then((data) => {
        if (Array.isArray(data)) {
          setUsers(data);
        }
      })
      .catch(() => {});
  }, []);

  // Keyboard input for PIN
  useEffect(() => {
    if (authMode !== 'pin' || isTermsOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (['input', 'textarea'].includes((e.target as HTMLElement)?.tagName?.toLowerCase())) return;

      if (/^[0-9]$/.test(e.key)) {
        e.preventDefault();
        handlePinInput(e.key);
      } else if (e.key === 'Backspace') {
        e.preventDefault();
        handlePinBackspace();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        setPin('');
        setCandidateUsers(null);
        setPinError('');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [authMode, pin, selectedUser, isTermsOpen]);

  const handlePinInput = async (digit: string) => {
    if (pin.length < 6) {
      const newPin = pin + digit;
      setPin(newPin);
      if (newPin.length === 6) {
        setIsSubmitting(true);
        const result = await loginWithPin(newPin, selectedUser?.username || selectedUser?.id);
        setIsSubmitting(false);

        if (result.success) {
          useThemeStore.setState({ isLocked: false });
          setPin('');
          setPinError('');
          setSelectedUser(null);
          setCandidateUsers(null);
        } else if (result.isAmbiguous && result.candidateUsers) {
          setCandidateUsers(result.candidateUsers);
          setPinError('');
        } else {
          setPinError(result.message || 'PIN tidak cocok!');
          setTimeout(() => {
            setPin('');
            setPinError('');
          }, 800);
        }
      }
    }
  };

  const handlePinBackspace = () => {
    setPin((p) => p.slice(0, -1));
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password) {
      showToast('Username dan kata sandi wajib diisi.', 'error');
      return;
    }
    setIsSubmitting(true);
    const success = await loginWithPassword(username.trim(), password);
    setIsSubmitting(false);
    if (success) {
      useThemeStore.setState({ isLocked: false });
      setUsername('');
      setPassword('');
      setSelectedUser(null);
      setCandidateUsers(null);
    }
  };

  const selectCandidateAndLogin = async (cand: { id: string; username: string; fullName: string; role: string }) => {
    setSelectedUser(cand);
    setCandidateUsers(null);
    if (pin.length === 6) {
      setIsSubmitting(true);
      const result = await loginWithPin(pin, cand.username);
      setIsSubmitting(false);
      if (result.success) {
        useThemeStore.setState({ isLocked: false });
        setPin('');
        setPinError('');
        setSelectedUser(null);
      }
    }
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedText(label);
    showToast(`${label} disalin`, 'info');
    setTimeout(() => setCopiedText(null), 2000);
  };

  return (
    <div className="h-screen w-screen flex flex-col lg:flex-row bg-slate-100 text-slate-900 overflow-hidden font-sans select-none">
      
      {/* ========================================================================= */}
      {/* KIRI (38%): BRANDING SLATE, HOTLINE HELPDESK & SYARAT LISENSI */}
      {/* ========================================================================= */}
      <aside className="w-full lg:w-[38%] bg-slate-900 text-slate-100 p-8 sm:p-10 flex flex-col justify-between overflow-y-auto border-r border-slate-800">
        <div className="space-y-6">
          {/* Brand Header */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-bold shadow-md shadow-emerald-950/40">
              <Store className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-lg tracking-tight text-white">OmniPOS</span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-800 text-slate-300 uppercase tracking-wide border border-slate-700">
                  {edition?.editionKey || 'Desktop'}
                </span>
              </div>
              <p className="text-xs text-slate-400 font-medium">Sistem Kasir & Manajemen Toko</p>
            </div>
          </div>

          {/* Business Mode Title Box */}
          <div className="p-4 rounded-xl bg-slate-800/80 border border-slate-700/80 space-y-1">
            <div className="text-xs font-bold text-emerald-400 flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>{edition?.displayName || 'OmniPOS Retail & Minimarket'}</span>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              {edition?.tagline || 'Sistem kasir barcode kilat, transaksi grosir, multi-satuan dan rekonsiliasi kas.'}
            </p>
          </div>

          {/* Helpdesk Hotline & Bug Report Card */}
          <div className="p-4 rounded-xl bg-slate-800/80 border border-slate-700/80 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-100">
                <Headphones className="w-4 h-4 text-emerald-400" />
                <span>Bantuan & Laporan Kendala</span>
              </div>
              <span className="text-[10px] text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-800/60 font-mono">
                Support CS
              </span>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              Jika mengalami kendala operasional, error printer, atau butuh bantuan:
            </p>

            <div className="space-y-2">
              <div className="p-2.5 rounded-lg bg-slate-900/90 border border-slate-700/80 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <Phone className="w-4 h-4 text-emerald-400" />
                  <div>
                    <div className="text-[10px] text-slate-400 font-medium">WhatsApp / Telepon:</div>
                    <div className="font-mono font-bold text-xs text-white">0812-9876-5432</div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => copyToClipboard('0812-9876-5432', 'Nomor WhatsApp')}
                  className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 rounded text-[11px] font-semibold text-slate-200 border border-slate-600 transition-colors flex items-center gap-1"
                >
                  {copiedText === 'Nomor WhatsApp' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3 text-slate-400" />}
                  <span>{copiedText === 'Nomor WhatsApp' ? 'Tersalin' : 'Salin'}</span>
                </button>
              </div>

              <div className="p-2.5 rounded-lg bg-slate-900/90 border border-slate-700/80 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <Mail className="w-4 h-4 text-emerald-400" />
                  <div>
                    <div className="text-[10px] text-slate-400 font-medium">Email Bug Report:</div>
                    <div className="font-mono font-bold text-xs text-white">helpdesk@omnipos.id</div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => copyToClipboard('helpdesk@omnipos.id', 'Email Helpdesk')}
                  className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 rounded text-[11px] font-semibold text-slate-200 border border-slate-600 transition-colors flex items-center gap-1"
                >
                  {copiedText === 'Email Helpdesk' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3 text-slate-400" />}
                  <span>{copiedText === 'Email Helpdesk' ? 'Tersalin' : 'Salin'}</span>
                </button>
              </div>
            </div>

            <div className="flex items-center gap-1.5 text-[11px] text-slate-400 pt-1">
              <Clock className="w-3.5 h-3.5 text-slate-400" />
              <span>Jam Operasional: <strong>08:00 - 22:00 WIB</strong></span>
            </div>
          </div>
        </div>

        {/* Footer Info */}
        <div className="pt-6 mt-6 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
          <button
            type="button"
            onClick={() => setIsTermsOpen(true)}
            className="text-slate-300 hover:text-emerald-400 font-medium underline underline-offset-2 flex items-center gap-1 transition-colors"
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Ketentuan Lisensi</span>
          </button>
          <span className="font-mono text-[11px] text-slate-400">v2.4.0 • Offline Ready</span>
        </div>
      </aside>

      {/* ========================================================================= */}
      {/* KANAN (62%): FORMULIR LOGIN KASIR (CARD CENTERED DENGAN LATAR SOFT SLATE) */}
      {/* ========================================================================= */}
      <main className="w-full lg:w-[62%] bg-slate-100/90 p-6 sm:p-10 flex flex-col justify-center items-center overflow-y-auto">
        <div className="w-full max-w-md bg-white border border-slate-200/90 rounded-2xl shadow-sm p-6 sm:p-8 space-y-5">
          
          {/* Header Card */}
          <div className="text-center space-y-1">
            <div className="w-11 h-11 rounded-xl bg-slate-100 text-slate-700 mx-auto flex items-center justify-center mb-2 border border-slate-200">
              <Lock className="w-5 h-5 text-emerald-600" />
            </div>
            <h1 className="text-lg font-bold text-slate-900 tracking-tight">Masuk ke Sistem Kasir</h1>
            <p className="text-xs text-slate-500">
              {selectedUser 
                ? <span>Pengguna: <strong className="text-slate-900 font-bold">{selectedUser.fullName} ({selectedUser.role})</strong></span>
                : 'Pilih profil kasir atau masukkan 6-digit PIN'
              }
            </p>
          </div>

          {/* Mode Switcher Tabs */}
          <div className="grid grid-cols-2 p-1 bg-slate-100 rounded-xl border border-slate-200/80">
            <button
              type="button"
              onClick={() => {
                setAuthMode('pin');
                setPinError('');
              }}
              className={`py-1.5 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                authMode === 'pin'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <KeyRound className="w-3.5 h-3.5 text-emerald-600" />
              <span>PIN Cepat (6-Digit)</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setAuthMode('password');
                setPinError('');
              }}
              className={`py-1.5 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                authMode === 'password'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <User className="w-3.5 h-3.5 text-slate-600" />
              <span>Username & Sandi</span>
            </button>
          </div>

          {/* 1. PIN LOGIN MODE */}
          {authMode === 'pin' && (
            <div className="space-y-4">
              
              {/* Staff Switcher Chips */}
              {users.length > 0 && !candidateUsers && (
                <div className="space-y-1.5 text-left">
                  <div className="flex items-center justify-between">
                    <label className="text-[11px] font-semibold text-slate-500">Pilih Staf:</label>
                    {selectedUser && (
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedUser(null);
                          setPin('');
                          setPinError('');
                        }}
                        className="text-[10px] text-emerald-600 hover:underline font-semibold"
                      >
                        Batal Pilihan
                      </button>
                    )}
                  </div>
                  <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-thin">
                    {users.map((u) => {
                      const isSelected = selectedUser?.id === u.id;
                      return (
                        <button
                          key={u.id}
                          type="button"
                          onClick={() => {
                            if (isSelected) {
                              setSelectedUser(null);
                            } else {
                              setSelectedUser(u);
                              setPin('');
                              setPinError('');
                            }
                          }}
                          className={`px-3 py-1.5 rounded-lg border text-xs transition-all flex items-center gap-1.5 shrink-0 ${
                            isSelected
                              ? 'bg-emerald-50 text-emerald-800 border-emerald-500 font-bold shadow-2xs'
                              : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                          }`}
                        >
                          <span className={`w-1.5 h-1.5 rounded-full ${isSelected ? 'bg-emerald-600' : 'bg-slate-400'}`}></span>
                          <span>{u.fullName}</span>
                          <span className={`text-[10px] ${isSelected ? 'text-emerald-700' : 'text-slate-400'}`}>({u.role})</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Duplicate PIN Disambiguation Alert */}
              {candidateUsers && candidateUsers.length > 0 && (
                <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 space-y-2 text-left animate-fade-in">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-amber-800">
                    <AlertTriangle className="w-4 h-4 shrink-0 text-amber-600" />
                    <span>PIN digunakan oleh beberapa staf. Klik akun Anda:</span>
                  </div>
                  <div className="grid grid-cols-1 gap-1.5 max-h-36 overflow-y-auto">
                    {candidateUsers.map((cand) => (
                      <button
                        key={cand.id}
                        type="button"
                        onClick={() => selectCandidateAndLogin(cand)}
                        className="p-2 rounded-lg bg-white hover:bg-emerald-50 border border-slate-200 hover:border-emerald-500 flex items-center justify-between text-xs transition-colors text-left"
                      >
                        <div>
                          <div className="font-bold text-slate-900">{cand.fullName}</div>
                          <div className="text-[10px] text-slate-500 font-mono">@{cand.username}</div>
                        </div>
                        <span className="px-2 py-0.5 bg-slate-100 rounded text-[10px] font-bold text-slate-700 border border-slate-200">
                          {cand.role}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Visual PIN Dots */}
              <div className="flex justify-center gap-3 my-2">
                {[0, 1, 2, 3, 4, 5].map((idx) => (
                  <div
                    key={idx}
                    className={`w-3.5 h-3.5 rounded-full border transition-all ${
                      idx < pin.length
                        ? pinError
                          ? 'bg-red-600 border-red-600 scale-110'
                          : 'bg-emerald-600 border-emerald-600 scale-110'
                        : 'bg-slate-100 border-slate-300'
                    }`}
                  />
                ))}
              </div>

              {pinError && (
                <p className="text-xs font-bold text-red-600 text-center">
                  {pinError}
                </p>
              )}

              {/* Numpad Keypad */}
              <div className="grid grid-cols-3 gap-2 max-w-[270px] mx-auto">
                {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((n) => (
                  <button
                    key={n}
                    type="button"
                    disabled={isSubmitting}
                    onClick={() => handlePinInput(n)}
                    className="h-11 rounded-xl bg-slate-50 border border-slate-200 hover:bg-slate-100 text-lg font-bold font-mono text-slate-800 active:scale-95 transition-all shadow-2xs disabled:opacity-50"
                  >
                    {n}
                  </button>
                ))}
                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={() => {
                    setPin('');
                    setCandidateUsers(null);
                    setPinError('');
                  }}
                  className="h-11 rounded-xl bg-slate-50 border border-slate-200 text-[11px] font-bold text-slate-500 hover:bg-slate-100 hover:text-slate-800 active:scale-95 transition-all"
                >
                  CLEAR
                </button>
                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={() => handlePinInput('0')}
                  className="h-11 rounded-xl bg-slate-50 border border-slate-200 hover:bg-slate-100 text-lg font-bold font-mono text-slate-800 active:scale-95 transition-all shadow-2xs"
                >
                  0
                </button>
                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={handlePinBackspace}
                  className="h-11 rounded-xl bg-slate-50 border border-slate-200 text-[11px] font-bold text-slate-500 hover:bg-slate-100 hover:text-slate-800 active:scale-95 transition-all"
                >
                  DEL
                </button>
              </div>
            </div>
          )}

          {/* 2. USERNAME & PASSWORD FORM */}
          {authMode === 'password' && (
            <form onSubmit={handlePasswordSubmit} className="space-y-4 text-left">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Username
                </label>
                <div className="relative">
                  <User className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                  <input
                    type="text"
                    required
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="Contoh: admin / kasir1"
                    className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:border-emerald-600 focus:bg-white font-mono lowercase"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Kata Sandi (Password)
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Masukkan kata sandi..."
                    className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:border-emerald-600 focus:bg-white"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm shadow-xs transition-all disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isSubmitting ? (
                  <span>Memverifikasi...</span>
                ) : (
                  <>
                    <Lock className="w-4 h-4" />
                    <span>Masuk ke POS</span>
                  </>
                )}
              </button>
            </form>
          )}

          <div className="pt-1 text-center">
            <span className="text-[11px] text-slate-400">
              Numpad atau Keyboard fisik aktif untuk input PIN.
            </span>
          </div>
        </div>
      </main>

      {/* ========================================================================= */}
      {/* MODAL: SYARAT & KETENTUAN PENGGUNAAN LISENSI */}
      {/* ========================================================================= */}
      {isTermsOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 w-full max-w-2xl rounded-2xl shadow-xl overflow-hidden flex flex-col max-h-[85vh] animate-scale-in">
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-2 text-slate-900 font-bold text-sm">
                <FileText className="w-4 h-4 text-emerald-600" />
                <span>Syarat Penggunaan Lisensi OmniPOS</span>
              </div>
              <button onClick={() => setIsTermsOpen(false)} className="text-slate-400 hover:text-slate-800">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-4 text-xs text-slate-700 leading-relaxed">
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-800">
                <strong>Lisensi Software Kasir Offline:</strong> OmniPOS beroperasi secara mandiri di perangkat lokal Anda tanpa ketergantungan wajib koneksi internet.
              </div>

              <div className="space-y-1.5">
                <h4 className="font-bold text-slate-900 text-sm">1. Kepemilikan & Privasi Data</h4>
                <p>
                  Seluruh basis data transaksi, persediaan barang, dan data pelanggan tersimpan secara lokal pada komputer kasir Anda. Tidak ada data transaksi yang dibagikan ke pihak luar tanpa konfigurasi cadangan cloud resmi.
                </p>
              </div>

              <div className="space-y-1.5">
                <h4 className="font-bold text-slate-900 text-sm">2. Tanggung Jawab Operasional</h4>
                <p>
                  Kasir dan supervisor bertanggung jawab atas keakuratan saldo modal awal shift, pencatatan transaksi kas masuk/keluar, dan verifikasi fisik uang laci saat penutupan shift (Z-Report).
                </p>
              </div>

              <div className="space-y-1.5">
                <h4 className="font-bold text-slate-900 text-sm">3. Cadangan & Keamanan Data (Backup)</h4>
                <p>
                  Sistem menyediakan fitur backup lokal terenkripsi AES-256. Pengguna disarankan mengekspor file cadangan secara berkala ke media eksternal untuk mengantisipasi kegagalan perangkat keras.
                </p>
              </div>

              <div className="space-y-1.5">
                <h4 className="font-bold text-slate-900 text-sm">4. Bantuan Teknis & Perbaikan Kendala</h4>
                <p>
                  Dukungan teknis tersedia melalui WhatsApp dan Email Helpdesk untuk perbaikan kendala operasional, pengaturan printer kasir, dan pembaruan sistem.
                </p>
              </div>
            </div>

            <div className="p-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between">
              <span className="text-[11px] text-slate-500">Versi 2.4.0 • 2026</span>
              <button
                type="button"
                onClick={() => setIsTermsOpen(false)}
                className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all"
              >
                Saya Mengerti & Setuju
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
