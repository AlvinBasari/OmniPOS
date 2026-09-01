import React, { useState, useEffect } from 'react';
import { 
  X, 
  Lock, 
  Unlock, 
  AlertTriangle, 
  CheckCircle, 
  DollarSign, 
  KeyRound,
  FileSpreadsheet
} from 'lucide-react';
import { useShiftStore, useThemeStore } from '../../store/useShiftAndThemeStores';
import { useToastStore } from '../../store/useToastStore';
import { useAuthStore } from '../../store/useAuthStore';

// ==========================================
// 1. OPEN SHIFT MODAL
// ==========================================
interface OpenShiftModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const OpenShiftModal: React.FC<OpenShiftModalProps> = ({ isOpen, onClose }) => {
  const { setActiveShift } = useShiftStore();
  const [startingCash, setStartingCash] = useState('200000');
  const [cashierName, setCashierName] = useState('Budi Santoso');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsSubmitting(true);
      const res = await fetch('/api/v1/shifts/open', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: 'user_1',
          cashierName,
          startingCash: parseFloat(startingCash) || 0,
        }),
      });
      if (res.ok) {
        const shift = await res.json();
        setActiveShift(shift);
        useToastStore.getState().showToast(`Shift ${shift.shiftNumber} berhasil dibuka!`, 'success');
        onClose();
      }
    } catch {
      useToastStore.getState().showToast('Gagal membuka shift!', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/75 flex items-center justify-center p-4">
      <div className="bg-surface border border-border-strong w-full max-w-md rounded-xl shadow-2xl overflow-hidden">
        <div className="px-5 py-4 border-b border-border-subtle flex items-center justify-between bg-subtle">
          <h2 className="text-base font-bold text-text-primary">Buka Shift Kasir Baru</h2>
          <button onClick={onClose}><X className="w-5 h-5 text-text-muted" /></button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-text-secondary mb-1">Nama Kasir Bertugas:</label>
            <input
              type="text"
              value={cashierName}
              onChange={(e) => setCashierName(e.target.value)}
              className="w-full text-sm px-3 py-2 bg-card border border-border-strong rounded-md text-text-primary focus:outline-none focus:border-primary"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-text-secondary mb-1">Modal Awal Kas Laci (Starting Float Rp):</label>
            <input
              type="number"
              value={startingCash}
              onChange={(e) => setStartingCash(e.target.value)}
              className="w-full text-xl font-bold font-mono px-3 py-2 bg-card border border-border-strong rounded-md text-text-primary focus:outline-none focus:border-primary tabular-nums"
              required
            />
          </div>

          <div className="pt-2 flex items-center justify-between">
            <button type="button" onClick={onClose} className="px-4 py-2 rounded-md text-xs font-semibold text-text-secondary hover:bg-card-hover border border-border-subtle">
              Batal
            </button>
            <button type="submit" disabled={isSubmitting} className="px-5 py-2.5 rounded-md text-xs font-bold bg-primary hover:bg-primary-hover text-primary-text shadow-sm">
              {isSubmitting ? 'Membuka...' : 'Konfirmasi Buka Shift'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ==========================================
// 2. CLOSE SHIFT & BLIND CASH COUNT MODAL
// ==========================================
interface CloseShiftModalProps {
  isOpen: boolean;
  onClose: () => void;
  onShiftClosed: (zReport: any) => void;
}

export const CloseShiftModal: React.FC<CloseShiftModalProps> = ({ isOpen, onClose, onShiftClosed }) => {
  const { activeShift, setActiveShift } = useShiftStore();
  const [actualCash, setActualCash] = useState('');
  const [notes, setNotes] = useState('');
  const [supervisorPin, setSupervisorPin] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen || !activeShift) return null;

  const actualCashNum = parseFloat(actualCash) || 0;
  const discrepancy = actualCashNum - activeShift.expectedCash;

  const handleCloseShift = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsSubmitting(true);
      const res = await fetch('/api/v1/shifts/close', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          shiftId: activeShift.id,
          actualCashCount: actualCashNum,
          closingNotes: notes,
          supervisorPin,
        }),
      });

      if (res.ok) {
        const zReport = await res.json();
        setActiveShift(null);
        onShiftClosed(zReport);
        onClose();
      }
    } catch {
      useToastStore.getState().showToast('Gagal menutup shift!', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
      <div className="bg-surface border border-border-strong w-full max-w-lg rounded-xl shadow-2xl overflow-hidden">
        <div className="px-5 py-4 border-b border-border-subtle flex items-center justify-between bg-subtle">
          <div>
            <h2 className="text-base font-bold text-text-primary">Tutup Shift & Rekonsiliasi Kas (Z-Report)</h2>
            <p className="text-xs text-text-secondary">Shift: {activeShift.shiftNumber} | Kasir: {activeShift.cashierName}</p>
          </div>
          <button onClick={onClose}><X className="w-5 h-5 text-text-muted" /></button>
        </div>

        <form onSubmit={handleCloseShift} className="p-5 space-y-4">
          <div className="p-4 bg-subtle rounded-lg border border-border-subtle space-y-2 text-xs">
            <div className="flex justify-between text-text-secondary">
              <span>Modal Awal Kas:</span>
              <span className="font-mono font-semibold">Rp {activeShift.startingCash.toLocaleString('id-ID')}</span>
            </div>
            <div className="flex justify-between text-text-secondary">
              <span>Total Penjualan Tunai:</span>
              <span className="font-mono font-semibold text-status-success">+Rp {activeShift.totalCashSales.toLocaleString('id-ID')}</span>
            </div>
            <div className="flex justify-between text-text-secondary">
              <span>Kas Masuk / Keluar:</span>
              <span className="font-mono font-semibold">Rp {(activeShift.totalCashIn - activeShift.totalCashOut).toLocaleString('id-ID')}</span>
            </div>
            <div className="pt-2 border-t border-border-subtle flex justify-between font-bold text-text-primary">
              <span>Total Kas Sistem yang Diharapkan:</span>
              <span className="font-mono text-primary">Rp {activeShift.expectedCash.toLocaleString('id-ID')}</span>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-text-secondary mb-1">
              Input Uang Fisik Aktual di Laci (Blind Cash Count):
            </label>
            <input
              type="number"
              value={actualCash}
              onChange={(e) => setActualCash(e.target.value)}
              placeholder="Hitung uang fisik di laci..."
              className="w-full text-xl font-bold font-mono px-3 py-2 bg-card border border-border-strong rounded-md text-text-primary focus:outline-none focus:border-primary tabular-nums"
              required
              autoFocus
            />
          </div>

          {actualCash !== '' && (
            <div className={`p-3 rounded-md text-xs font-semibold flex items-center justify-between border ${
              discrepancy === 0 
                ? 'bg-status-success/10 border-status-success text-status-success' 
                : discrepancy > 0 
                  ? 'bg-status-warning/10 border-status-warning text-status-warning'
                  : 'bg-status-danger/10 border-status-danger text-status-danger'
            }`}>
              <span>Selisih Kas (Discrepancy):</span>
              <span className="font-mono text-sm tabular-nums">
                {discrepancy >= 0 ? `+Rp ${discrepancy.toLocaleString('id-ID')}` : `-Rp ${Math.abs(discrepancy).toLocaleString('id-ID')}`}
              </span>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-text-secondary mb-1">Catatan Penutupan Kasir:</label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Contoh: Laci seimbang, sisa uang kecil..."
              className="w-full text-xs px-3 py-2 bg-card border border-border-subtle rounded-md text-text-primary"
            />
          </div>

          <div className="pt-3 border-t border-border-subtle flex items-center justify-between">
            <button type="button" onClick={onClose} className="px-4 py-2 rounded-md text-xs font-semibold text-text-secondary hover:bg-card-hover border border-border-subtle">
              Batal
            </button>
            <button type="submit" disabled={isSubmitting} className="px-5 py-2.5 rounded-md text-xs font-bold bg-status-danger hover:bg-red-700 text-white shadow-sm flex items-center gap-2">
              <FileSpreadsheet className="w-4 h-4" />
              <span>{isSubmitting ? 'Menutup Shift...' : 'Tutup Shift & Cetak Z-Report'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ==========================================
// ==========================================
// 3. QUICK PIN LOCK & LOGIN SCREEN
// ==========================================
export const QuickLockModal: React.FC = () => {
  const { isLocked, lockedCashierName } = useThemeStore();
  const { currentUser, loginWithPin, loginWithPassword } = useAuthStore();
  
  const [users, setUsers] = useState<Array<{ id: string; username: string; fullName: string; role: string }>>([]);
  const [selectedUser, setSelectedUser] = useState<{ id: string; username: string; fullName: string; role: string } | null>(null);
  const [pin, setPin] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [isPasswordMode, setIsPasswordMode] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [candidateUsers, setCandidateUsers] = useState<Array<{ id: string; username: string; fullName: string; role: string }> | null>(null);

  // Auto-trigger lock screen if no user is authenticated
  const isScreenLocked = isLocked || !currentUser;

  // Fetch active users for profile switcher
  useEffect(() => {
    if (isScreenLocked) {
      fetch('/api/v1/users')
        .then((res) => (res.ok ? res.json() : []))
        .then((data) => {
          if (Array.isArray(data)) {
            setUsers(data);
            // Default selected user if locked by specific user
            if (currentUser) {
              const matched = data.find((u) => u.id === currentUser.id || u.username === currentUser.username);
              if (matched) setSelectedUser(matched);
            }
          }
        })
        .catch(() => {});
    }
  }, [isScreenLocked, currentUser]);

  if (!isScreenLocked) return null;

  const handleKeyPress = async (num: string) => {
    if (pin.length < 6) {
      const newPin = pin + num;
      setPin(newPin);
      if (newPin.length === 6) {
        setIsSubmitting(true);
        const result = await loginWithPin(newPin, selectedUser?.username || selectedUser?.id);
        setIsSubmitting(false);
        if (result.success) {
          useThemeStore.setState({ isLocked: false });
          setPin('');
          setErrorMsg('');
          setSelectedUser(null);
          setCandidateUsers(null);
        } else if (result.isAmbiguous && result.candidateUsers) {
          setCandidateUsers(result.candidateUsers);
          setErrorMsg('');
        } else {
          setErrorMsg(result.message || 'PIN salah!');
          setTimeout(() => {
            setPin('');
            setErrorMsg('');
          }, 900);
        }
      }
    }
  };

  const handleBackspace = () => {
    setPin((p) => p.slice(0, -1));
  };

  const handlePasswordLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !password) return;
    setIsSubmitting(true);
    const success = await loginWithPassword(username, password);
    setIsSubmitting(false);
    if (success) {
      useThemeStore.setState({ isLocked: false });
      setUsername('');
      setPassword('');
      setIsPasswordMode(false);
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
        setErrorMsg('');
        setSelectedUser(null);
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/90 flex flex-col items-center justify-center p-4 select-none">
      <div className="w-full max-w-md text-center space-y-4 bg-surface p-6 rounded-2xl border border-border-strong shadow-2xl backdrop-blur-md">
        <div className="w-12 h-12 rounded-xl bg-subtle border border-border-strong mx-auto flex items-center justify-center text-primary shadow-sm">
          <Lock className="w-6 h-6" />
        </div>

        <div>
          <h2 className="text-base font-bold text-text-primary">
            {currentUser ? 'Layar Kasir Terkunci' : 'Masuk ke POS'}
          </h2>
          <p className="text-xs text-text-secondary mt-0.5">
            {selectedUser ? (
              <span>Akun Dipilih: <strong className="text-primary font-bold">{selectedUser.fullName} ({selectedUser.role})</strong></span>
            ) : (
              'Pilih profil staf atau masukkan 6-digit PIN'
            )}
          </p>
        </div>

        {!isPasswordMode ? (
          <>
            {/* Candidate selection modal when PIN is shared */}
            {candidateUsers && candidateUsers.length > 0 && (
              <div className="p-3 bg-subtle rounded-xl border border-status-warning/40 space-y-2 text-left animate-fade-in">
                <div className="flex items-center gap-1.5 text-xs font-bold text-status-warning">
                  <AlertTriangle className="w-4 h-4" />
                  <span>PIN cocok dengan beberapa akun. Klik akun Anda:</span>
                </div>
                <div className="grid grid-cols-1 gap-1.5 max-h-40 overflow-y-auto">
                  {candidateUsers.map((cand) => (
                    <button
                      key={cand.id}
                      onClick={() => selectCandidateAndLogin(cand)}
                      className="p-2 rounded-lg bg-card hover:bg-primary/10 border border-border-subtle hover:border-primary flex items-center justify-between text-xs transition-colors text-left"
                    >
                      <div>
                        <div className="font-bold text-text-primary">{cand.fullName}</div>
                        <div className="text-[10px] text-text-muted font-mono">@{cand.username}</div>
                      </div>
                      <span className="px-2 py-0.5 bg-subtle rounded text-[10px] font-bold text-text-secondary border border-border-subtle">
                        {cand.role}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Staff Profile Avatars List (if available and not already in candidate picker) */}
            {!candidateUsers && users.length > 0 && !currentUser && (
              <div className="space-y-1 text-left">
                <label className="text-[11px] font-semibold text-text-muted block">Pilih Pengguna:</label>
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
                            setErrorMsg('');
                          }
                        }}
                        className={`px-3 py-1.5 rounded-lg border text-xs font-medium whitespace-nowrap transition-all flex items-center gap-1.5 shrink-0 ${
                          isSelected
                            ? 'bg-primary text-primary-text border-primary shadow-sm font-bold'
                            : 'bg-card text-text-secondary border-border-subtle hover:bg-card-hover'
                        }`}
                      >
                        <span className="w-2 h-2 rounded-full bg-status-success inline-block"></span>
                        <span>{u.fullName}</span>
                        <span className={`text-[10px] opacity-75 ${isSelected ? 'text-primary-text' : 'text-text-muted'}`}>
                          ({u.role})
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* PIN Dots Display */}
            <div className="flex justify-center gap-3 my-2">
              {[0, 1, 2, 3, 4, 5].map((idx) => (
                <div
                  key={idx}
                  className={`w-3.5 h-3.5 rounded-full border transition-all ${
                    idx < pin.length
                      ? errorMsg
                        ? 'bg-status-danger border-status-danger scale-110'
                        : 'bg-primary border-primary scale-110'
                      : 'bg-subtle border-border-strong'
                  }`}
                />
              ))}
            </div>

            {errorMsg && <p className="text-xs font-bold text-status-danger">{errorMsg}</p>}

            {/* Numeric Keypad */}
            <div className="grid grid-cols-3 gap-2 max-w-[260px] mx-auto">
              {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((n) => (
                <button
                  key={n}
                  disabled={isSubmitting}
                  onClick={() => handleKeyPress(n)}
                  className="h-11 rounded-xl bg-card border border-border-subtle hover:bg-card-hover text-lg font-bold font-mono text-text-primary active:scale-95 transition-all shadow-xs disabled:opacity-50"
                >
                  {n}
                </button>
              ))}
              <button
                disabled={isSubmitting}
                onClick={() => {
                  setPin('');
                  setCandidateUsers(null);
                  setErrorMsg('');
                }}
                className="h-11 rounded-xl bg-card border border-border-subtle text-[11px] font-bold text-text-secondary active:scale-95"
              >
                CLEAR
              </button>
              <button
                disabled={isSubmitting}
                onClick={() => handleKeyPress('0')}
                className="h-11 rounded-xl bg-card border border-border-subtle hover:bg-card-hover text-lg font-bold font-mono text-text-primary active:scale-95"
              >
                0
              </button>
              <button
                disabled={isSubmitting}
                onClick={handleBackspace}
                className="h-11 rounded-xl bg-card border border-border-subtle text-[11px] font-bold text-text-secondary active:scale-95"
              >
                DEL
              </button>
            </div>

            <div className="pt-2 border-t border-border-subtle">
              <button
                type="button"
                onClick={() => setIsPasswordMode(true)}
                className="text-xs font-semibold text-primary hover:underline"
              >
                Masuk dengan Username & Password →
              </button>
            </div>
          </>
        ) : (
          <form onSubmit={handlePasswordLogin} className="space-y-3 text-xs text-left">
            <div>
              <label className="block font-bold text-text-secondary mb-1">Username</label>
              <input
                type="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="admin / kasir1"
                className="w-full px-3 py-2 bg-card border border-border-subtle rounded-lg text-text-primary focus:outline-none focus:border-primary font-mono lowercase"
              />
            </div>
            <div>
              <label className="block font-bold text-text-secondary mb-1">Kata Sandi</label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Kata sandi akun"
                className="w-full px-3 py-2 bg-card border border-border-subtle rounded-lg text-text-primary focus:outline-none focus:border-primary"
              />
            </div>

            <div className="pt-2 flex flex-col gap-2">
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-2.5 rounded-lg bg-primary text-primary-text font-bold shadow-md hover:bg-primary-hover disabled:opacity-50"
              >
                {isSubmitting ? 'Memverifikasi...' : 'Masuk ke POS'}
              </button>
              <button
                type="button"
                onClick={() => setIsPasswordMode(false)}
                className="w-full py-2 rounded-lg bg-card hover:bg-card-hover border border-border-subtle text-text-secondary font-semibold"
              >
                ← Kembali ke PIN Kasir
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

// ==========================================
// 4. CASH MOVEMENT MODAL (CASH IN / OUT / CASH DROP)
// ==========================================
interface CashMovementModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const CashMovementModal: React.FC<CashMovementModalProps> = ({ isOpen, onClose }) => {
  const { activeShift, fetchActiveShift } = useShiftStore();
  const { currentUser } = useAuthStore();
  const [movementType, setMovementType] = useState<'CashIn' | 'CashOut' | 'CashDrop'>('CashOut');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('Operasional Toko');
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const amt = parseFloat(amount) || 0;
    if (amt <= 0) {
      useToastStore.getState().showToast('Masukkan nominal kas yang valid.', 'warning');
      return;
    }
    if (!description.trim()) {
      useToastStore.getState().showToast('Keterangan kas wajib diisi.', 'warning');
      return;
    }

    if (!activeShift) {
      useToastStore.getState().showToast('Tidak ada shift kasir yang aktif saat ini.', 'error');
      return;
    }

    try {
      setIsSubmitting(true);
      const isCashIn = movementType === 'CashIn';
      const cat = movementType === 'CashDrop' ? 'Setor Brankas (Cash Drop)' : category;

      const res = await fetch('/api/v1/shifts/cash-tx', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          shiftId: activeShift.id,
          isCashIn,
          amount: amt,
          category: cat,
          description: description.trim(),
          userId: currentUser?.id || activeShift.cashierName,
        }),
      });

      if (res.ok) {
        await fetchActiveShift();
        useToastStore.getState().showToast(
          `Kas ${isCashIn ? 'Masuk' : 'Keluar'} Rp ${amt.toLocaleString('id-ID')} berhasil dicatat!`,
          'success'
        );
        onClose();
        setAmount('');
        setDescription('');
      } else {
        useToastStore.getState().showToast('Gagal mencatat transaksi kas laci!', 'error');
      }
    } catch {
      useToastStore.getState().showToast('Terjadi kesalahan jaringan!', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/75 flex items-center justify-center p-4">
      <div className="bg-surface border border-border-strong w-full max-w-md rounded-2xl shadow-2xl overflow-hidden">
        <div className="px-5 py-4 border-b border-border-subtle flex items-center justify-between bg-subtle">
          <div>
            <h2 className="text-base font-bold text-text-primary">Kas Masuk / Kas Keluar Laci</h2>
            <p className="text-xs text-text-secondary">
              Saldo Laci Berjalan: <span className="font-bold text-primary font-mono tabular-nums">Rp {activeShift?.expectedCash?.toLocaleString('id-ID') || 0}</span>
            </p>
          </div>
          <button onClick={onClose}><X className="w-5 h-5 text-text-muted" /></button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {/* Movement Type Tabs */}
          <div className="grid grid-cols-3 gap-1.5 p-1 bg-subtle rounded-xl border border-border-subtle">
            <button
              type="button"
              onClick={() => {
                setMovementType('CashOut');
                setCategory('Operasional Toko');
              }}
              className={`py-2 text-xs font-bold rounded-lg transition-all ${
                movementType === 'CashOut'
                  ? 'bg-status-danger text-white shadow-xs'
                  : 'text-text-secondary hover:bg-card-hover'
              }`}
            >
              💸 Kas Keluar
            </button>
            <button
              type="button"
              onClick={() => {
                setMovementType('CashIn');
                setCategory('Tambah Modal Laci');
              }}
              className={`py-2 text-xs font-bold rounded-lg transition-all ${
                movementType === 'CashIn'
                  ? 'bg-status-success text-white shadow-xs'
                  : 'text-text-secondary hover:bg-card-hover'
              }`}
            >
              📥 Kas Masuk
            </button>
            <button
              type="button"
              onClick={() => {
                setMovementType('CashDrop');
                setCategory('Setor Brankas');
              }}
              className={`py-2 text-xs font-bold rounded-lg transition-all ${
                movementType === 'CashDrop'
                  ? 'bg-primary text-primary-text shadow-xs'
                  : 'text-text-secondary hover:bg-card-hover'
              }`}
            >
              🏦 Setor Brankas
            </button>
          </div>

          <div>
            <label className="block text-xs font-semibold text-text-secondary mb-1">
              Nominal (Rp):
            </label>
            <input
              type="number"
              required
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="Contoh: 50000"
              className="w-full text-lg font-bold font-mono px-3 py-2 bg-card border border-border-strong rounded-xl text-text-primary focus:outline-none focus:border-primary"
              autoFocus
            />
          </div>

          {movementType === 'CashOut' && (
            <div>
              <label className="block text-xs font-semibold text-text-secondary mb-1">Kategori Pengeluaran:</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full text-xs px-3 py-2 bg-card border border-border-strong rounded-lg text-text-primary focus:outline-none focus:border-primary"
              >
                <option value="Operasional Toko">Operasional Toko (Kantong Plastik/Kresek)</option>
                <option value="Kebutuhan Toko">Kebutuhan Toko (Es Batu/Air Galon/ATK)</option>
                <option value="Biaya Kebersihan/Parkir">Biaya Kebersihan & Keamanan / Parkir</option>
                <option value="Konsumsi Karyawan">Konsumsi Karyawan / Snack Shift</option>
                <option value="Lainnya">Lain-lain</option>
              </select>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-text-secondary mb-1">Keterangan Detail:</label>
            <input
              type="text"
              required
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={
                movementType === 'CashDrop'
                  ? 'Setor uang tunai shift 1 ke brankas utama'
                  : movementType === 'CashIn'
                  ? 'Tukar uang receh kembalian Rp 100rb'
                  : 'Beli kresek ukuran sedang 3 pak'
              }
              className="w-full text-xs px-3 py-2 bg-card border border-border-strong rounded-lg text-text-primary focus:outline-none focus:border-primary"
            />
          </div>

          <div className="pt-2 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-text-secondary hover:bg-card-hover border border-border-subtle"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className={`px-5 py-2 rounded-xl text-xs font-bold text-white shadow-sm transition-all ${
                movementType === 'CashOut'
                  ? 'bg-status-danger hover:bg-red-700'
                  : movementType === 'CashIn'
                  ? 'bg-status-success hover:bg-emerald-700'
                  : 'bg-primary hover:bg-primary-hover text-primary-text'
              }`}
            >
              {isSubmitting ? 'Menyimpan...' : '✓ Simpan Transaksi Kas'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ==========================================
// 5. SUPERVISOR PIN PROMPT MODAL
// ==========================================
interface SupervisorPinModalProps {
  isOpen: boolean;
  actionTitle: string;
  onSuccess: () => void;
  onClose: () => void;
}

export const SupervisorPinModal: React.FC<SupervisorPinModalProps> = ({
  isOpen,
  actionTitle,
  onSuccess,
  onClose,
}) => {
  const [pin, setPin] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);

  if (!isOpen) return null;

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pin.trim()) return;

    try {
      setIsVerifying(true);
      const res = await fetch('/api/v1/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pinCode: pin.trim() }),
      });

      if (res.ok) {
        const user = await res.json();
        if (user.role === 'SuperAdmin' || user.role === 'Admin' || user.role === 'Supervisor' || user.role === 'Manager') {
          useToastStore.getState().showToast(`Otorisasi disetujui oleh ${user.fullName}!`, 'success');
          onSuccess();
          onClose();
          setPin('');
          setErrorMsg('');
        } else {
          setErrorMsg('Hanya akun Supervisor atau Admin yang berhak memberi otorisasi!');
          setPin('');
        }
      } else {
        setErrorMsg('PIN Supervisor salah!');
        setPin('');
      }
    } catch {
      setErrorMsg('Gagal memverifikasi PIN.');
    } finally {
      setIsVerifying(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4 select-none">
      <div className="bg-surface border border-border-strong w-full max-w-sm rounded-2xl shadow-2xl p-6 text-center space-y-4">
        <div className="w-12 h-12 rounded-full bg-status-warning/20 text-status-warning mx-auto flex items-center justify-center">
          <KeyRound className="w-6 h-6" />
        </div>

        <div>
          <h3 className="text-base font-bold text-text-primary">Otorisasi Supervisor</h3>
          <p className="text-xs text-text-secondary mt-1">
            Tindakan <strong className="text-status-warning">{actionTitle}</strong> memerlukan izin PIN Supervisor/Admin.
          </p>
        </div>

        <form onSubmit={handleVerify} className="space-y-3">
          <input
            type="password"
            maxLength={6}
            required
            autoFocus
            value={pin}
            onChange={(e) => {
              setPin(e.target.value);
              setErrorMsg('');
            }}
            placeholder="Masukkan 6-digit PIN..."
            className="w-full text-center font-mono tracking-widest text-xl px-3 py-2.5 bg-subtle border border-border-strong rounded-xl text-text-primary focus:outline-none focus:border-primary"
          />

          {errorMsg && (
            <p className="text-xs font-bold text-status-danger">{errorMsg}</p>
          )}

          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2 rounded-xl text-xs font-semibold text-text-secondary hover:bg-card-hover border border-border-subtle"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={isVerifying || pin.length < 4}
              className="flex-1 py-2 rounded-xl text-xs font-bold bg-primary hover:bg-primary-hover text-primary-text shadow-sm disabled:opacity-50"
            >
              {isVerifying ? 'Memeriksa...' : 'Otorisasi'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

