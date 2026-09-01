import React, { useState, useEffect } from 'react';
import { 
  RotateCcw, 
  Search, 
  CheckCircle2, 
  AlertCircle, 
  Trash2, 
  Receipt,
  DollarSign,
  Package,
  Printer
} from 'lucide-react';
import { SalesReturn } from '../types';
import { useToastStore } from '../store/useToastStore';

export const SalesReturnPage: React.FC = () => {
  const [returns, setReturns] = useState<SalesReturn[]>([]);
  const [searchInvoice, setSearchInvoice] = useState('');
  const [foundOrder, setFoundOrder] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Return Processing State
  const [returnItems, setReturnItems] = useState<Array<{
    productId: string;
    productName: string;
    sku: string;
    quantity: number;
    unitPrice: number;
    isRestocked: boolean;
    condition: string;
  }>>([]);
  const [returnReason, setReturnReason] = useState('Barang Rusak / Cacat');
  const [refundMethod, setRefundMethod] = useState<'Cash' | 'StoreCredit'>('Cash');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    fetchReturns();
  }, []);

  const fetchReturns = async () => {
    try {
      const res = await fetch('/api/v1/sales/returns');
      if (res.ok) setReturns(await res.json());
    } catch {}
  };

  const handleSearchOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchInvoice.trim()) return;

    try {
      setIsLoading(true);
      const res = await fetch(`/api/v1/sales/returns/find-order?invoiceNumber=${encodeURIComponent(searchInvoice.trim())}`);
      if (res.ok) {
        const order = await res.json();
        setFoundOrder(order);
        // Pre-fill return items with 0 qty
        setReturnItems(order.items.map((i: any) => ({
          productId: i.productId,
          productName: i.productName,
          sku: i.sku,
          quantity: 0,
          maxQty: i.quantity,
          unitPrice: i.unitPrice,
          isRestocked: true,
          condition: 'Bagus'
        })));
        useToastStore.getState().showToast(`Nota "${order.invoiceNumber}" ditemukan!`, 'success');
      } else {
        useToastStore.getState().showToast('Nomor nota penjualan tidak ditemukan!', 'warning');
        setFoundOrder(null);
      }
    } catch {
      useToastStore.getState().showToast('Gagal mencari nota penjualan.', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const calculateTotalRefund = () => {
    return returnItems.reduce((acc, i) => acc + (i.quantity * i.unitPrice), 0);
  };

  const handleProcessReturn = async (e: React.FormEvent) => {
    e.preventDefault();
    const itemsToReturn = returnItems.filter(i => i.quantity > 0);
    if (itemsToReturn.length === 0) {
      useToastStore.getState().showToast('Pilih minimal 1 barang untuk diretur!', 'warning');
      return;
    }

    const totalRefund = calculateTotalRefund();

    try {
      const res = await fetch('/api/v1/sales/returns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          originalInvoiceNumber: foundOrder.invoiceNumber,
          customerId: foundOrder.customerId,
          customerName: foundOrder.customerName || 'Pelanggan',
          cashierUserId: 'Kasir Toko',
          totalRefundAmount: totalRefund,
          refundMethod,
          returnReason,
          notes,
          items: itemsToReturn
        })
      });

      if (res.ok) {
        useToastStore.getState().showToast(`Retur barang berhasil! Uang dikembalikan: Rp ${totalRefund.toLocaleString('id-ID')}`, 'success');
        setFoundOrder(null);
        setSearchInvoice('');
        fetchReturns();
      }
    } catch {
      useToastStore.getState().showToast('Gagal memproses retur penjualan.', 'error');
    }
  };

  const handlePrintReturnReceipt = (ret: any) => {
    const now = new Date().toLocaleString('id-ID', { dateStyle: 'full', timeStyle: 'short' });
    const w = window.open('', '_blank', 'width=400,height=600');
    if (!w) return;
    w.document.write(`<html><head><title>Bukti Retur</title>
      <style>
        body { font-family: 'Courier New', monospace; width: 300px; margin: 0 auto; padding: 10px; font-size: 11px; }
        h2 { font-size: 13px; text-align: center; margin: 4px 0; }
        .sub { text-align: center; font-size: 10px; color: #555; margin-bottom: 8px; }
        .line { border-top: 1px dashed #000; margin: 6px 0; }
        .row { display: flex; justify-content: space-between; margin: 2px 0; }
        .total { font-size: 14px; font-weight: 700; }
        .center { text-align: center; }
        @media print { @page { size: 80mm auto; margin: 0; } body { width: 72mm; } }
      </style>
    </head><body>
      <h2>BUKTI RETUR / REFUND</h2>
      <div class="sub">OmniPOS · ${now}</div>
      <div class="line"></div>
      <div class="row"><span>No. Retur:</span><span>${ret.returnNumber}</span></div>
      <div class="row"><span>Nota Asal:</span><span>${ret.originalInvoiceNumber}</span></div>
      <div class="row"><span>Pelanggan:</span><span>${ret.customerName || 'Umum'}</span></div>
      <div class="row"><span>Alasan:</span><span style="max-width:160px;text-align:right">${ret.returnReason}</span></div>
      <div class="line"></div>
      <div class="row"><span>Metode Pengembalian:</span><span>${ret.refundMethod === 'Cash' || ret.refundMethod === 0 ? 'Uang Tunai' : 'Deposit/Kasbon'}</span></div>
      <div class="line"></div>
      <div class="row total"><span>TOTAL REFUND:</span><span>Rp ${ret.totalRefundAmount.toLocaleString('id-ID')}</span></div>
      <div class="line"></div>
      <div class="center" style="margin-top:20px;font-size:9px">Terima kasih atas pengertiannya.<br>Bukti ini sah sebagai dokumen pengembalian barang.</div>
    </body></html>`);
    w.document.close(); w.print();
  };

  return (
    <div className="flex-1 flex flex-col bg-app overflow-hidden select-none">
      {/* Header */}
      <header className="px-6 py-4 border-b border-border-subtle bg-surface flex items-center justify-between">
        <div>
          <h1 className="text-base font-bold text-text-primary flex items-center gap-2">
            <RotateCcw className="w-5 h-5 text-primary" />
            Retur Penjualan & Pengembalian Uang (Refund)
          </h1>
          <p className="text-xs text-text-secondary mt-0.5">
            Proses retur barang rusak/salah beli berdasarkan nomor nota dan kembalikan stok otomatis
          </p>
        </div>
      </header>

      {/* Main Grid */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {/* Search Order Bar */}
        <div className="p-5 bg-card border border-border-subtle rounded-2xl shadow-sm space-y-4 max-w-3xl">
          <h2 className="text-sm font-bold text-text-primary">1. Cari Nota Pembelian Pelanggan</h2>
          <form onSubmit={handleSearchOrder} className="flex gap-2">
            <div className="relative flex-1">
              <Receipt className="w-4 h-4 text-text-muted absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchInvoice}
                onChange={e => setSearchInvoice(e.target.value)}
                placeholder="Masukkan Nomor Faktur Nota (misal: INV-20260831-XXXX)..."
                className="w-full pl-9 pr-3 py-2 bg-subtle border border-border-strong rounded-xl text-xs font-mono text-text-primary focus:outline-none focus:border-primary"
                autoFocus
              />
            </div>
            <button
              type="submit"
              disabled={isLoading}
              className="px-5 py-2 bg-primary hover:bg-primary-hover text-primary-text rounded-xl text-xs font-bold shadow-sm"
            >
              {isLoading ? 'Mencari...' : 'Cari Nota'}
            </button>
          </form>

          {/* Found Order Details & Return Selector */}
          {foundOrder && (
            <div className="pt-4 border-t border-border-subtle space-y-4">
              <div className="p-3 bg-subtle rounded-xl text-xs flex justify-between items-center">
                <div>
                  <p className="font-bold font-mono text-primary text-sm">{foundOrder.invoiceNumber}</p>
                  <p className="text-text-secondary mt-0.5">
                    Tanggal: {new Date(foundOrder.orderDate).toLocaleString('id-ID')} | Kasir: {foundOrder.cashierUserId}
                  </p>
                </div>
                <span className="text-sm font-extrabold font-mono text-text-primary">
                  Total Belanja: Rp {foundOrder.totalAmount?.toLocaleString('id-ID')}
                </span>
              </div>

              {/* Items to Return Table */}
              <div className="space-y-2">
                <p className="text-xs font-bold text-text-primary">Pilih Barang yang Diretur:</p>
                <div className="border border-border-subtle rounded-xl overflow-hidden divide-y divide-border-subtle">
                  {returnItems.map((item: any, idx) => (
                    <div key={idx} className="p-3 bg-card flex items-center justify-between text-xs gap-3">
                      <div className="flex-1">
                        <p className="font-bold text-text-primary">{item.productName}</p>
                        <p className="text-[10px] text-text-muted font-mono">{item.sku} | Harga Beli: Rp {item.unitPrice.toLocaleString('id-ID')}</p>
                      </div>

                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-1.5">
                          <span className="text-[11px] text-text-secondary">Qty Retur:</span>
                          <input
                            type="number"
                            min="0"
                            max={item.maxQty}
                            value={item.quantity}
                            onChange={e => {
                              const val = Math.min(item.maxQty, Math.max(0, parseInt(e.target.value) || 0));
                              setReturnItems(returnItems.map((it, i) => i === idx ? { ...it, quantity: val } : it));
                            }}
                            className="w-14 px-2 py-1 bg-subtle border border-border-strong rounded text-center font-mono font-bold text-xs"
                          />
                          <span className="text-[10px] text-text-muted">/ Max {item.maxQty}</span>
                        </div>

                        <label className="flex items-center gap-1 text-[11px] text-text-secondary cursor-pointer">
                          <input
                            type="checkbox"
                            checked={item.isRestocked}
                            onChange={e => {
                              setReturnItems(returnItems.map((it, i) => i === idx ? { ...it, isRestocked: e.target.checked } : it));
                            }}
                            className="rounded"
                          />
                          <span>Masuk Stok Kembali</span>
                        </label>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Refund Parameters & Confirmation */}
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <label className="block font-semibold text-text-secondary mb-1">Alasan Retur</label>
                  <select
                    value={returnReason}
                    onChange={e => setReturnReason(e.target.value)}
                    className="w-full px-3 py-2 bg-subtle border border-border-strong rounded-lg"
                  >
                    <option value="Barang Rusak / Cacat">Barang Rusak / Cacat</option>
                    <option value="Kadaluarsa / Basi">Kadaluarsa / Basi</option>
                    <option value="Salah Beli / Tukar Varian">Salah Beli / Tukar Varian</option>
                    <option value="Pelanggan Batal Beli">Pelanggan Batal Beli</option>
                    <option value="Garansi Distributor — Unit Bermasalah">Garansi Distributor — Unit Bermasalah</option>
                    <option value="Tidak Sesuai Spesifikasi">Tidak Sesuai Spesifikasi</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-text-secondary mb-1">Metode Pengembalian Dana</label>
                  <select
                    value={refundMethod}
                    onChange={e => setRefundMethod(e.target.value as any)}
                    className="w-full px-3 py-2 bg-subtle border border-border-strong rounded-lg"
                  >
                    <option value="Cash">Uang Tunai (Kas Laci Kasir)</option>
                    <option value="StoreCredit">Saldo Deposit / Kasbon Pelanggan</option>
                  </select>
                </div>
              </div>

              <div className="pt-3 border-t border-border-subtle flex items-center justify-between">
                <div>
                  <span className="text-xs text-text-secondary">Total Pengembalian Uang:</span>
                  <p className="text-xl font-extrabold font-mono text-status-danger">
                    Rp {calculateTotalRefund().toLocaleString('id-ID')}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={handleProcessReturn}
                  disabled={calculateTotalRefund() === 0}
                  className="px-6 py-2.5 bg-status-danger hover:bg-rose-700 text-white rounded-xl text-xs font-bold shadow-md disabled:opacity-40"
                >
                  Konfirmasi Proses Retur & Refund
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Historical Returns */}
        <div className="space-y-3 max-w-3xl">
          <h2 className="text-sm font-bold text-text-primary">2. Riwayat Transaksi Retur</h2>
          <div className="grid grid-cols-1 gap-2">
            {returns.map(ret => (
              <div key={ret.id} className="p-3.5 rounded-xl bg-card border border-border-subtle flex items-center justify-between text-xs shadow-sm">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold font-mono text-primary">{ret.returnNumber}</span>
                    <span className="text-text-muted">| Nota Asal: <strong className="font-mono text-text-primary">{ret.originalInvoiceNumber}</strong></span>
                  </div>
                  <p className="text-text-secondary mt-0.5">
                    Alasan: {ret.returnReason} | Tanggal: {new Date(ret.returnDate).toLocaleDateString('id-ID')}
                  </p>
                </div>

                <div className="text-right flex flex-col items-end gap-1">
                  <p className="font-extrabold font-mono text-status-danger">
                    -Rp {ret.totalRefundAmount.toLocaleString('id-ID')}
                  </p>
                  <p className="text-[10px] text-text-muted">Metode: {ret.refundMethod === 'Cash' || ret.refundMethod === 0 ? 'Tunai' : 'Deposit'}</p>
                  <button
                    onClick={() => handlePrintReturnReceipt(ret)}
                    className="px-2 py-0.5 rounded bg-subtle hover:bg-card-hover border border-border-subtle text-[10px] font-bold text-text-secondary flex items-center gap-1 transition-all"
                  >
                    <Printer className="w-3 h-3 text-primary" /> Cetak Bukti
                  </button>
                </div>
              </div>
            ))}

            {returns.length === 0 && (
              <p className="text-xs text-text-muted py-6 text-center">Belum ada riwayat transaksi retur.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
export default SalesReturnPage;
