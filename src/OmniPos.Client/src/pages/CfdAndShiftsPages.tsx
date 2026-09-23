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
// 2. CASHIER DASHBOARD & SHIFTS PAGE
// ==========================================
export { CashierDashboardPage, CashierDashboardPage as ShiftsPage } from './CashierDashboardPage';

