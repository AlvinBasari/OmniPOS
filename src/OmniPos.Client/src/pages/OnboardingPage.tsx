import React, { useState } from 'react';
import { Store, User, Lock, KeyRound, Phone, MapPin, ArrowRight, ArrowLeft, Check } from 'lucide-react';
import { useAuthStore } from '../store/useAuthStore';
import { useBusinessModeStore } from '../store/useBusinessModeStore';
import { useToastStore } from '../store/useToastStore';

export const OnboardingPage: React.FC = () => {
  const { setupInitialAdmin, storeInfo } = useAuthStore();
  const { edition } = useBusinessModeStore();
  const { showToast } = useToastStore();

  const [step, setStep] = useState<1 | 2>(1);

  // Step 1: Profil Toko
  const [storeName, setStoreName] = useState(storeInfo.storeName || (edition?.displayName ?? 'OmniPOS Store'));
  const [storePhone, setStorePhone] = useState(storeInfo.storePhone || '0812-9876-5432');
  const [storeAddress, setStoreAddress] = useState(storeInfo.storeAddress || 'Jl. Sudirman No. 88, Jakarta Pusat');

  // Step 2: Akun Administrator Pemilik
  const [fullName, setFullName] = useState('');
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [pinCode, setPinCode] = useState('123456');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleNextStep = (e: React.FormEvent) => {
    e.preventDefault();
    if (!storeName.trim()) {
      showToast('Nama toko wajib diisi.', 'error');
      return;
    }
    setStep(2);
  };

  const handleFinalSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim() || !username.trim() || !password) {
      showToast('Harap lengkapi semua data wajib (*).', 'error');
      return;
    }

    if (password !== confirmPassword) {
      showToast('Konfirmasi kata sandi tidak cocok.', 'error');
      return;
    }

    if (password.length < 6) {
      showToast('Kata sandi minimal 6 karakter.', 'error');
      return;
    }

    if (!/^\d{6}$/.test(pinCode)) {
      showToast('PIN Kasir harus 6 digit angka.', 'error');
      return;
    }

    setIsSubmitting(true);
    await setupInitialAdmin({
      fullName: fullName.trim(),
      username: username.trim(),
      password,
      pinCode,
      storeName: storeName.trim(),
      storePhone: storePhone.trim(),
      storeAddress: storeAddress.trim()
    });
    setIsSubmitting(false);
  };

  return (
    <div className="h-screen w-screen flex bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 overflow-hidden select-none font-sans">
      {/* Left Sidebar (35%): Clean Minimalist Progress & Info */}
      <aside className="w-[36%] max-w-sm bg-zinc-900 text-zinc-100 p-8 flex flex-col justify-between border-r border-zinc-800">
        <div className="space-y-8">
          {/* Logo / Header */}
          <div>
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-emerald-600 flex items-center justify-center font-bold text-white text-sm">
                <Store className="w-4 h-4" />
              </div>
              <span className="font-bold text-sm tracking-tight text-white">OmniPOS</span>
            </div>
            <p className="text-xs text-zinc-400 mt-2 font-medium">
              {edition?.displayName || 'Konfigurasi Awal Sistem Kasir'}
            </p>
          </div>

          {/* Stepper */}
          <div className="space-y-3">
            {/* Step 1 */}
            <div className={`p-3 rounded-lg border text-xs transition-colors ${
              step === 1 
                ? 'bg-zinc-800/80 border-zinc-700 text-white' 
                : 'border-transparent text-zinc-400 hover:text-zinc-300'
            }`}>
              <div className="flex items-center gap-2.5">
                <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-mono font-bold ${
                  step > 1 ? 'bg-emerald-600 text-white' : step === 1 ? 'bg-zinc-100 text-zinc-900' : 'bg-zinc-800 text-zinc-500'
                }`}>
                  {step > 1 ? <Check className="w-3 h-3" /> : 1}
                </span>
                <span className="font-semibold">Profil & Informasi Usaha</span>
              </div>
              <p className="text-[11px] text-zinc-400 mt-1 pl-7 leading-relaxed">
                Identitas toko, nama bisnis, nomor kontak, dan alamat untuk nota kasir.
              </p>
            </div>

            {/* Step 2 */}
            <div className={`p-3 rounded-lg border text-xs transition-colors ${
              step === 2 
                ? 'bg-zinc-800/80 border-zinc-700 text-white' 
                : 'border-transparent text-zinc-400 hover:text-zinc-300'
            }`}>
              <div className="flex items-center gap-2.5">
                <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-mono font-bold ${
                  step === 2 ? 'bg-zinc-100 text-zinc-900' : 'bg-zinc-800 text-zinc-500'
                }`}>
                  2
                </span>
                <span className="font-semibold">Akun Administrator</span>
              </div>
              <p className="text-[11px] text-zinc-400 mt-1 pl-7 leading-relaxed">
                Kredensial login pemilik toko dan PIN kasir untuk otorisasi cepat.
              </p>
            </div>
          </div>
        </div>

        {/* Footer Meta */}
        <div className="pt-4 border-t border-zinc-800/80 text-[11px] text-zinc-500 flex items-center justify-between font-mono">
          <span>Database: SQLite Lokal</span>
          <span>Edisi {edition?.businessMode || 'Retail'}</span>
        </div>
      </aside>

      {/* Right Panel (64%): Clean, Spacious Form Content */}
      <main className="flex-1 bg-white dark:bg-zinc-950 flex flex-col justify-between p-10 overflow-y-auto">
        <div className="max-w-md w-full mx-auto my-auto space-y-6">
          <div>
            <span className="text-[11px] font-mono text-zinc-400 uppercase tracking-wider">
              Langkah {step} dari 2
            </span>
            <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-100 tracking-tight mt-0.5">
              {step === 1 ? 'Informasi & Profil Toko' : 'Pendaftaran Akun Administrator'}
            </h2>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
              {step === 1 
                ? 'Data ini akan digunakan sebagai identitas toko pada nota pembelian pelanggan.' 
                : 'Akun ini memiliki hak akses penuh untuk mengelola inventori, laporan, dan akun kasir.'}
            </p>
          </div>

          {step === 1 ? (
            <form onSubmit={handleNextStep} className="space-y-4 text-xs">
              <div>
                <label className="block font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                  Nama Toko / Usaha <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <Store className="w-3.5 h-3.5 text-zinc-400 absolute left-3 top-3" />
                  <input
                    type="text"
                    required
                    value={storeName}
                    onChange={(e) => setStoreName(e.target.value)}
                    placeholder={edition?.businessMode === 'Electronics' ? 'Contoh: Berkah Cell & Gadget Store' : edition?.businessMode === 'FoodAndBeverage' ? 'Contoh: Kafe Kopi Nusantara' : edition?.businessMode === 'Pharmacy' ? 'Contoh: Apotek Sehat Farma' : 'Contoh: Toko Berkah Mandiri'}
                    className="w-full pl-8 pr-3 py-2 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-md text-zinc-900 dark:text-zinc-100 focus:outline-none focus:border-zinc-400 dark:focus:border-zinc-600"
                    autoFocus
                  />
                </div>
              </div>

              <div>
                <label className="block font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                  Nomor Telepon / WhatsApp
                </label>
                <div className="relative">
                  <Phone className="w-3.5 h-3.5 text-zinc-400 absolute left-3 top-3" />
                  <input
                    type="text"
                    value={storePhone}
                    onChange={(e) => setStorePhone(e.target.value)}
                    placeholder="0812-9876-5432"
                    className="w-full pl-8 pr-3 py-2 font-mono bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-md text-zinc-900 dark:text-zinc-100 focus:outline-none focus:border-zinc-400 dark:focus:border-zinc-600"
                  />
                </div>
              </div>

              <div>
                <label className="block font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                  Alamat Lengkap
                </label>
                <div className="relative">
                  <MapPin className="w-3.5 h-3.5 text-zinc-400 absolute left-3 top-2.5" />
                  <textarea
                    rows={3}
                    value={storeAddress}
                    onChange={(e) => setStoreAddress(e.target.value)}
                    placeholder="Jl. Sudirman No. 88, Jakarta Pusat"
                    className="w-full pl-8 pr-3 py-2 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-md text-zinc-900 dark:text-zinc-100 focus:outline-none focus:border-zinc-400 dark:focus:border-zinc-600 resize-none"
                  />
                </div>
              </div>

              <div className="pt-2 flex justify-end">
                <button
                  type="submit"
                  className="flex items-center gap-1.5 px-4 py-2 bg-zinc-900 hover:bg-zinc-800 dark:bg-zinc-100 dark:hover:bg-white text-white dark:text-zinc-900 font-medium rounded-md transition-colors"
                >
                  <span>Lanjut ke Akun Pemilik</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </form>
          ) : (
            <form onSubmit={handleFinalSubmit} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                  Nama Lengkap Admin <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <User className="w-3.5 h-3.5 text-zinc-400 absolute left-3 top-3" />
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Nama pemilik / penanggung jawab"
                    className="w-full pl-8 pr-3 py-2 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-md text-zinc-900 dark:text-zinc-100 focus:outline-none focus:border-zinc-400 dark:focus:border-zinc-600"
                    autoFocus
                  />
                </div>
              </div>

              <div>
                <label className="block font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                  Username Login <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="admin"
                  className="w-full px-3 py-2 font-mono bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-md text-zinc-900 dark:text-zinc-100 focus:outline-none focus:border-zinc-400 dark:focus:border-zinc-600"
                />
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                    Kata Sandi <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <Lock className="w-3.5 h-3.5 text-zinc-400 absolute left-3 top-3" />
                    <input
                      type="password"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Min. 6 karakter"
                      className="w-full pl-8 pr-3 py-2 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-md text-zinc-900 dark:text-zinc-100 focus:outline-none focus:border-zinc-400 dark:focus:border-zinc-600"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                    Ulangi Sandi <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <Lock className="w-3.5 h-3.5 text-zinc-400 absolute left-3 top-3" />
                    <input
                      type="password"
                      required
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Ulangi sandi"
                      className="w-full pl-8 pr-3 py-2 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-md text-zinc-900 dark:text-zinc-100 focus:outline-none focus:border-zinc-400 dark:focus:border-zinc-600"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                  PIN Kasir Cepat (6 Digit) <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <KeyRound className="w-3.5 h-3.5 text-zinc-400 absolute left-3 top-3" />
                  <input
                    type="password"
                    maxLength={6}
                    required
                    value={pinCode}
                    onChange={(e) => setPinCode(e.target.value.replace(/\D/g, ''))}
                    placeholder="123456"
                    className="w-full pl-8 pr-3 py-2 font-mono font-bold tracking-widest bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-md text-zinc-900 dark:text-zinc-100 focus:outline-none focus:border-zinc-400 dark:focus:border-zinc-600"
                  />
                </div>
                <p className="text-[11px] text-zinc-400 mt-1">
                  PIN digunakan untuk login kasir kilat dan kunci layar (F12).
                </p>
              </div>

              <div className="pt-2 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="flex items-center gap-1 text-xs text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Kembali</span>
                </button>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-medium rounded-md transition-colors disabled:opacity-50"
                >
                  {isSubmitting ? 'Menyimpan...' : 'Selesaikan Pengaturan'}
                </button>
              </div>
            </form>
          )}
        </div>

        {/* Quiet Bottom Notice */}
        <div className="text-center text-[11px] text-zinc-400">
          Pengaturan ini hanya dilakukan satu kali saat instalasi awal.
        </div>
      </main>
    </div>
  );
};
export default OnboardingPage;
