import React, { useEffect } from 'react';
import { 
  X, 
  Keyboard, 
  ShoppingCart, 
  Zap, 
  Layers, 
  ShieldCheck, 
  CornerDownLeft, 
  ArrowUpDown, 
  Sliders, 
  CheckCircle2 
} from 'lucide-react';
import { BusinessMode } from '../../types';

interface ShortcutGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
  mode: BusinessMode;
}

export const ShortcutGuideModal: React.FC<ShortcutGuideModalProps> = ({
  isOpen,
  onClose,
  mode
}) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const modeF5Title = 
    mode === 'Retail' ? 'Timbang Manual (Kalkulator Bobot)' :
    mode === 'Electronics' ? 'Tukar Tambah (Trade-In Unit)' :
    mode === 'FoodAndBeverage' ? 'Split Bill (Pecah Tagihan)' :
    mode === 'Pharmacy' ? 'Etiket Obat (Aturan Pakai)' :
    'Aksi Khusus Mode';

  const modeF7Title = 
    mode === 'Electronics' ? 'Ambil Servis (Klaim SPK Pelanggan)' :
    mode === 'FoodAndBeverage' ? 'Pra-Tagihan (Guest Check / Bill Sementara)' :
    'Cetak Ulang Nota Transaksi Terakhir';

  const modeF8Title = 
    mode === 'FoodAndBeverage' ? 'Kirim Pesanan ke KDS / Printer Dapur' :
    'Checkout Cepat Uang Pas (Instant Cash)';

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-surface border border-border-strong w-full max-w-3xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-border-subtle flex items-center justify-between bg-subtle">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center border border-primary/20">
              <Keyboard className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-text-primary flex items-center gap-2">
                Panduan Pintasan Keyboard Kasir
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-primary/15 text-primary font-bold border border-primary/30">
                  Mode: {mode}
                </span>
              </h2>
              <p className="text-xs text-text-secondary">
                Operasikan kasir secepat kilat tanpa mouse menggunakan kombinasi tombol di bawah ini
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-text-muted hover:text-text-primary hover:bg-card border border-transparent hover:border-border-subtle transition-all"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-5 text-xs">
          {/* Section 1: Function Keys F1 - F9 */}
          <div>
            <h3 className="font-bold text-text-primary mb-2.5 flex items-center gap-1.5 text-xs">
              <Zap className="w-4 h-4 text-amber-500" />
              Tombol Fungsi Utama (F1 – F9)
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              <div className="flex items-center justify-between p-2.5 rounded-xl bg-card border border-border-subtle hover:border-primary/40 transition-all">
                <div className="flex items-center gap-2">
                  <kbd className="px-2 py-1 rounded-md bg-subtle border border-border-strong font-mono font-bold text-text-primary shadow-xs">F1</kbd>
                  <span className="text-text-primary font-medium">Scan Barcode / Timbangan</span>
                </div>
                <span className="text-[11px] text-text-muted">Fokus otomatis</span>
              </div>

              <div className="flex items-center justify-between p-2.5 rounded-xl bg-card border border-border-subtle hover:border-primary/40 transition-all">
                <div className="flex items-center gap-2">
                  <kbd className="px-2 py-1 rounded-md bg-subtle border border-border-strong font-mono font-bold text-text-primary shadow-xs">F2</kbd>
                  <span className="text-text-primary font-medium">Cari Produk di Katalog</span>
                </div>
                <span className="text-[11px] text-text-muted">Ketik nama produk</span>
              </div>

              <div className="flex items-center justify-between p-2.5 rounded-xl bg-card border border-border-subtle hover:border-primary/40 transition-all">
                <div className="flex items-center gap-2">
                  <kbd className="px-2 py-1 rounded-md bg-subtle border border-border-strong font-mono font-bold text-text-primary shadow-xs">F3</kbd>
                  <span className="text-text-primary font-medium">Pilih Pelanggan / Pasien</span>
                </div>
                <span className="text-[11px] text-text-muted">Buku kasbon</span>
              </div>

              <div className="flex items-center justify-between p-2.5 rounded-xl bg-card border border-border-subtle hover:border-primary/40 transition-all">
                <div className="flex items-center gap-2">
                  <kbd className="px-2 py-1 rounded-md bg-subtle border border-border-strong font-mono font-bold text-text-primary shadow-xs">F4</kbd>
                  <span className="text-text-primary font-medium">Diskon Transaksi</span>
                </div>
                <span className="text-[11px] text-text-muted">% atau nominal</span>
              </div>

              <div className="flex items-center justify-between p-2.5 rounded-xl bg-card border border-border-subtle hover:border-primary/40 transition-all">
                <div className="flex items-center gap-2">
                  <kbd className="px-2 py-1 rounded-md bg-purple-500/10 border border-purple-500/30 text-purple-600 font-mono font-bold shadow-xs">F5</kbd>
                  <span className="text-text-primary font-medium">{modeF5Title}</span>
                </div>
                <span className="text-[10px] text-purple-600 font-semibold">Khusus Mode</span>
              </div>

              <div className="flex items-center justify-between p-2.5 rounded-xl bg-card border border-border-subtle hover:border-primary/40 transition-all">
                <div className="flex items-center gap-2">
                  <kbd className="px-2 py-1 rounded-md bg-amber-500/10 border border-amber-500/30 text-amber-600 font-mono font-bold shadow-xs">F6</kbd>
                  <span className="text-text-primary font-medium">Tahan Transaksi (Pending)</span>
                </div>
                <span className="text-[11px] text-text-muted">Tahan / panggil nota</span>
              </div>

              <div className="flex items-center justify-between p-2.5 rounded-xl bg-card border border-border-subtle hover:border-primary/40 transition-all">
                <div className="flex items-center gap-2">
                  <kbd className="px-2 py-1 rounded-md bg-blue-500/10 border border-blue-500/30 text-blue-600 font-mono font-bold shadow-xs">F7</kbd>
                  <span className="text-text-primary font-medium">{modeF7Title}</span>
                </div>
                <span className="text-[10px] text-blue-600 font-semibold">Khusus Mode</span>
              </div>

              <div className="flex items-center justify-between p-2.5 rounded-xl bg-card border border-border-subtle hover:border-primary/40 transition-all">
                <div className="flex items-center gap-2">
                  <kbd className="px-2 py-1 rounded-md bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 font-mono font-bold shadow-xs">F8</kbd>
                  <span className="text-text-primary font-medium">{modeF8Title}</span>
                </div>
                <span className="text-[10px] text-emerald-600 font-semibold">Aksi Instan</span>
              </div>

              <div className="flex items-center justify-between p-2.5 rounded-xl bg-card border border-border-subtle hover:border-primary/40 transition-all">
                <div className="flex items-center gap-2">
                  <kbd className="px-2.5 py-1 rounded-md bg-primary text-white font-mono font-bold shadow-sm">F9</kbd>
                  <span className="text-text-primary font-bold">Bayar Lengkap (Full Payment)</span>
                </div>
                <span className="text-[11px] text-primary font-semibold">Buka dialog multi-metode tunai, kartu, QRIS</span>
              </div>

              <div className="flex items-center justify-between p-2.5 rounded-xl bg-card border border-border-subtle hover:border-primary/40 transition-all">
                <div className="flex items-center gap-2">
                  <kbd className="px-2.5 py-1 rounded-md bg-amber-500 text-white font-mono font-bold shadow-sm">F10</kbd>
                  <span className="text-text-primary font-bold">Mode Fokus Kasir (Layar Penuh)</span>
                </div>
                <span className="text-[11px] text-amber-600 font-semibold">Sembunyikan katalog manual, maksimalkan scan</span>
              </div>
            </div>
          </div>

          {/* Section 2: Cart Navigation & Adjustments */}
          <div>
            <h3 className="font-bold text-text-primary mb-2.5 flex items-center gap-1.5 text-xs">
              <ShoppingCart className="w-4 h-4 text-primary" />
              Navigasi & Pengaturan Baris Keranjang Belanja
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
              <div className="p-2.5 rounded-xl bg-card border border-border-subtle space-y-1">
                <div className="flex items-center gap-2">
                  <kbd className="px-1.5 py-0.5 rounded bg-subtle border border-border-strong font-mono font-bold">↑</kbd>
                  <kbd className="px-1.5 py-0.5 rounded bg-subtle border border-border-strong font-mono font-bold">↓</kbd>
                </div>
                <p className="font-bold text-text-primary">Pilih Baris Item</p>
                <p className="text-[11px] text-text-muted">Navigasi baris keranjang yang ingin diubah kuantitasnya.</p>
              </div>

              <div className="p-2.5 rounded-xl bg-card border border-border-subtle space-y-1">
                <div className="flex items-center gap-2">
                  <kbd className="px-1.5 py-0.5 rounded bg-subtle border border-border-strong font-mono font-bold">+</kbd>
                  <kbd className="px-1.5 py-0.5 rounded bg-subtle border border-border-strong font-mono font-bold">-</kbd>
                </div>
                <p className="font-bold text-text-primary">Ubah Kuantitas</p>
                <p className="text-[11px] text-text-muted">Tambah atau kurangi jumlah item yang sedang disorot.</p>
              </div>

              <div className="p-2.5 rounded-xl bg-card border border-border-subtle space-y-1">
                <div className="flex items-center gap-2">
                  <kbd className="px-1.5 py-0.5 rounded bg-rose-500/10 border border-rose-500/30 text-rose-600 font-mono font-bold">Del</kbd>
                  <kbd className="px-1.5 py-0.5 rounded bg-subtle border border-border-strong font-mono font-bold">ESC</kbd>
                </div>
                <p className="font-bold text-text-primary">Hapus / Batalkan</p>
                <p className="text-[11px] text-text-muted">Del untuk hapus 1 baris, ESC untuk batalkan/bersihkan keranjang.</p>
              </div>
            </div>
          </div>

          {/* Section 3: Modal Acceleration & System Keys */}
          <div>
            <h3 className="font-bold text-text-primary mb-2.5 flex items-center gap-1.5 text-xs">
              <ShieldCheck className="w-4 h-4 text-emerald-500" />
              Sistem & Pembayaran Cepat
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
              <div className="flex items-center justify-between p-2.5 rounded-xl bg-card border border-border-subtle">
                <div className="flex items-center gap-2">
                  <kbd className="px-2 py-0.5 rounded bg-subtle border border-border-strong font-mono font-bold">Enter</kbd>
                  <span className="text-text-primary">Tambah / Konfirmasi</span>
                </div>
                <span className="text-[10px] text-text-muted">Pencarian & Modal</span>
              </div>

              <div className="flex items-center justify-between p-2.5 rounded-xl bg-card border border-border-subtle">
                <div className="flex items-center gap-2">
                  <kbd className="px-2 py-0.5 rounded bg-subtle border border-border-strong font-mono font-bold">F10</kbd>
                  <span className="text-text-primary">Kas & Shift</span>
                </div>
                <span className="text-[10px] text-text-muted">Buka Laci Kas</span>
              </div>

              <div className="flex items-center justify-between p-2.5 rounded-xl bg-card border border-border-subtle">
                <div className="flex items-center gap-2">
                  <kbd className="px-2 py-0.5 rounded bg-subtle border border-border-strong font-mono font-bold">F12</kbd>
                  <span className="text-text-primary">Kunci Layar</span>
                </div>
                <span className="text-[10px] text-text-muted">PIN Keamanan</span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-border-subtle bg-subtle flex items-center justify-between">
          <p className="text-[11px] text-text-muted">
            Tip: Seluruh tombol di atas juga dapat <strong>diklik langsung</strong> bila menggunakan layar sentuh.
          </p>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-primary hover:bg-primary-hover text-white rounded-xl font-bold text-xs transition-all shadow-sm active:scale-95"
          >
            Mengerti [ESC]
          </button>
        </div>
      </div>
    </div>
  );
};
