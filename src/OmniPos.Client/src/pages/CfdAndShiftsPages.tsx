import React, { useState, useEffect } from 'react';
import { 
  Monitor, 
  Receipt, 
  Plus, 
  Minus, 
  DollarSign, 
  QrCode, 
  Clock,
  Sparkles,
  ArrowUpRight,
  ArrowDownRight
} from 'lucide-react';
import { useCartStore } from '../store/useCartStore';
import { useShiftStore } from '../store/useShiftAndThemeStores';
import { useToastStore } from '../store/useToastStore';
import { CashTransaction } from '../types';

// ==========================================
// 1. CUSTOMER FACING DISPLAY (CFD)
// ==========================================
export const CfdPage: React.FC = () => {
  const { items, getSubtotal, getTaxAmount, getTotalAmount, selectedCustomer } = useCartStore();

  useEffect(() => {
    const sendHeartbeat = () => {
      fetch('/api/v1/hardware/heartbeat/cfd', { method: 'POST' }).catch(() => {});
    };
    sendHeartbeat();
    const timer = setInterval(sendHeartbeat, 3000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="flex-1 flex flex-col bg-surface overflow-hidden select-none">
      {/* CFD Header */}
      <div className="p-5 bg-subtle border-b border-border-subtle flex items-center justify-between">
        <div>
          <h2 className="text-xl font-extrabold text-text-primary">OmniPOS Store & Cafe</h2>
          <p className="text-xs text-text-secondary">
            {selectedCustomer ? `Selamat datang, ${selectedCustomer.name}!` : 'Selamat Datang!'}
          </p>
        </div>
        <div className="text-right">
          <span className="text-xs text-text-secondary">Total Tagihan:</span>
          <p className="text-3xl font-extrabold text-primary font-mono tabular-nums">
            Rp {getTotalAmount().toLocaleString('id-ID')}
          </p>
        </div>
      </div>

      {/* CFD Body Split: Left Items, Right QRIS / Banner */}
      <div className="flex-1 flex overflow-hidden">
        {/* Scanned Items Live List */}
        <div className="w-1/2 p-6 border-r border-border-subtle overflow-y-auto space-y-3">
          <h3 className="text-xs font-bold text-text-muted uppercase tracking-wider">Daftar Belanjaan Anda</h3>
          {items.length === 0 ? (
            <div className="h-64 flex flex-col items-center justify-center text-text-muted">
              <Receipt className="w-12 h-12 opacity-30 mb-2" />
              <p className="text-sm font-semibold">Menunggu Kasir Memindai Barang...</p>
            </div>
          ) : (
            <div className="space-y-2">
              {items.map((item, idx) => (
                <div key={idx} className="p-3 rounded-lg bg-subtle border border-border-subtle flex items-center justify-between">
                  <div>
                    <h4 className="text-sm font-bold text-text-primary">{item.name}</h4>
                    <p className="text-xs text-text-secondary font-mono">
                      {item.quantity} x Rp {item.unitPrice.toLocaleString('id-ID')}
                    </p>
                  </div>
                  <span className="text-sm font-bold text-primary font-mono tabular-nums">
                    Rp {item.totalPrice.toLocaleString('id-ID')}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Dynamic QRIS / Promo Banner */}
        <div className="w-1/2 p-8 bg-subtle flex flex-col items-center justify-center text-center space-y-4">
          <div className="w-56 h-56 bg-white p-4 rounded-2xl border border-border-strong shadow-lg flex flex-col items-center justify-center">
            <QrCode className="w-44 h-44 text-slate-900" />
            <span className="text-[11px] font-extrabold text-slate-800 tracking-widest mt-1">QRIS NASIONAL</span>
          </div>

          <div className="space-y-1">
            <h4 className="text-sm font-bold text-text-primary">Scan untuk Pembayaran QRIS Cepat</h4>
            <p className="text-xs text-text-secondary">Mendukung BCA, Mandiri, GoPay, OVO, ShopeePay, DANA & Bank Lainnya</p>
          </div>
        </div>
      </div>
    </div>
  );
};

// ==========================================
// 2. SHIFTS & PETTY CASH PAGE
// ==========================================
export const ShiftsPage: React.FC = () => {
  const { activeShift } = useShiftStore();
  const [cashTxAmount, setCashTxAmount] = useState('');
  const [cashTxDesc, setCashTxDesc] = useState('');
  const [isCashIn, setIsCashIn] = useState(false);
  const [recentTx, setRecentTx] = useState<CashTransaction[]>([]);

  const handleAddPettyCash = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeShift) {
      useToastStore.getState().showToast('Buka shift terlebih dahulu!', 'warning');
      return;
    }

    try {
      const res = await fetch('/api/v1/shifts/cash-tx', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          shiftId: activeShift.id,
          isCashIn,
          amount: parseFloat(cashTxAmount) || 0,
          category: 'OPERASIONAL',
          description: cashTxDesc,
          userId: activeShift.userId,
        }),
      });

      if (res.ok) {
        useToastStore.getState().showToast('Transaksi kas operasional berhasil dicatat!', 'success');
        setCashTxAmount('');
        setCashTxDesc('');
      }
    } catch {
      useToastStore.getState().showToast('Gagal mencatat transaksi kas!', 'error');
    }
  };

  return (
    <div className="flex-1 flex flex-col bg-app overflow-hidden select-none">
      <div className="p-4 bg-surface border-b border-border-subtle flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center font-bold">
            <Receipt className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-text-primary">Kas Laci & Manajemen Shift</h2>
            <p className="text-xs text-text-secondary">Kelola arus kas kecil operasional dan riwayat penutupan buku harian</p>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6 max-w-4xl space-y-6">
        {/* Active Shift Summary Banner */}
        {activeShift ? (
          <div className="p-5 rounded-xl bg-card border border-border-subtle shadow-sm space-y-4">
            <div className="flex justify-between items-start">
              <div>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-status-success/10 text-status-success border border-status-success/30 uppercase">
                  Shift Sedang Berjalan
                </span>
                <h3 className="text-base font-bold text-text-primary mt-1">{activeShift.shiftNumber}</h3>
                <p className="text-xs text-text-secondary">Kasir: {activeShift.cashierName}</p>
              </div>
              <div className="text-right">
                <span className="text-xs text-text-muted">Total Kas Sistem Diharapkan:</span>
                <p className="text-2xl font-bold font-mono text-primary tabular-nums">
                  Rp {activeShift.expectedCash.toLocaleString('id-ID')}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-4 gap-3 pt-3 border-t border-border-subtle/60 text-xs">
              <div className="p-2.5 rounded-lg bg-subtle">
                <span className="text-text-muted text-[11px]">Modal Awal:</span>
                <p className="font-bold font-mono text-text-primary">Rp {activeShift.startingCash.toLocaleString('id-ID')}</p>
              </div>
              <div className="p-2.5 rounded-lg bg-subtle">
                <span className="text-text-muted text-[11px]">Penjualan Tunai:</span>
                <p className="font-bold font-mono text-status-success">+Rp {activeShift.totalCashSales.toLocaleString('id-ID')}</p>
              </div>
              <div className="p-2.5 rounded-lg bg-subtle">
                <span className="text-text-muted text-[11px]">Kas Masuk:</span>
                <p className="font-bold font-mono text-status-info">+Rp {activeShift.totalCashIn.toLocaleString('id-ID')}</p>
              </div>
              <div className="p-2.5 rounded-lg bg-subtle">
                <span className="text-text-muted text-[11px]">Kas Keluar:</span>
                <p className="font-bold font-mono text-status-danger">-Rp {activeShift.totalCashOut.toLocaleString('id-ID')}</p>
              </div>
            </div>
          </div>
        ) : (
          <div className="p-5 rounded-xl bg-card border border-status-warning/30 text-center space-y-2">
            <p className="text-sm font-bold text-text-primary">Belum Ada Shift Kasir yang Aktif</p>
            <p className="text-xs text-text-secondary">Silakan buka shift kasir baru melalui tombol di bilah atas.</p>
          </div>
        )}

        {/* Petty Cash Entry Form */}
        <div className="p-5 rounded-xl bg-card border border-border-subtle shadow-sm space-y-4">
          <h3 className="text-xs font-bold text-text-primary uppercase tracking-wider">Input Kas Masuk / Kas Keluar (Petty Cash)</h3>
          <form onSubmit={handleAddPettyCash} className="space-y-4 text-xs">
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setIsCashIn(false)}
                className={`flex-1 py-2 rounded-md font-bold flex items-center justify-center gap-1.5 border transition-all ${
                  !isCashIn ? 'bg-status-danger/10 border-status-danger text-status-danger' : 'bg-subtle border-border-subtle text-text-secondary'
                }`}
              >
                <ArrowDownRight className="w-4 h-4" />
                <span>Kas Keluar (Beli Barang/Operasional)</span>
              </button>
              <button
                type="button"
                onClick={() => setIsCashIn(true)}
                className={`flex-1 py-2 rounded-md font-bold flex items-center justify-center gap-1.5 border transition-all ${
                  isCashIn ? 'bg-status-success/10 border-status-success text-status-success' : 'bg-subtle border-border-subtle text-text-secondary'
                }`}
              >
                <ArrowUpRight className="w-4 h-4" />
                <span>Kas Masuk (Tambah Modal Kas)</span>
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold text-text-secondary mb-1">Nominal Uang (Rp):</label>
                <input
                  type="number"
                  value={cashTxAmount}
                  onChange={(e) => setCashTxAmount(e.target.value)}
                  placeholder="Contoh: 50000"
                  className="w-full text-sm font-mono px-3 py-2 bg-subtle border border-border-strong rounded-md text-text-primary font-bold tabular-nums"
                  required
                />
              </div>
              <div>
                <label className="block font-semibold text-text-secondary mb-1">Keterangan / Keperluan:</label>
                <input
                  type="text"
                  value={cashTxDesc}
                  onChange={(e) => setCashTxDesc(e.target.value)}
                  placeholder="Contoh: Beli plastik & kertas thermal"
                  className="w-full text-xs px-3 py-2 bg-subtle border border-border-strong rounded-md text-text-primary"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              className="w-full py-2.5 bg-primary hover:bg-primary-hover text-primary-text rounded-md font-bold shadow-sm"
            >
              Simpan Transaksi Kas
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
