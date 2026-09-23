import React, { useState, useEffect, useRef } from 'react';
import {
  RotateCcw,
  Search,
  Receipt,
  Printer,
  RefreshCw,
  Package,
  Wallet,
  Banknote,
  ArrowRightLeft,
  Download,
  AlertTriangle,
  Filter,
  ChevronDown,
  ChevronUp,
  X,
  Scan,
  Info,
} from 'lucide-react';
import { SalesReturn } from '../types';
import { useToastStore } from '../store/useToastStore';
import { useAuthStore } from '../store/useAuthStore';

type RefundMethodKey = 'Cash' | 'StoreCredit' | 'BankTransfer' | 'ExchangeProduct';

interface ReturnItemState {
  productId: string;
  productName: string;
  sku: string;
  quantity: number;
  maxQty: number;
  unitPrice: number;
  isRestocked: boolean;
  condition: 'Bagus' | 'Cacat' | 'Tidak Bisa Dijual';
}

const REFUND_METHODS: { key: RefundMethodKey; label: string; desc: string; icon: React.ReactNode; color: string }[] = [
  { key: 'Cash', label: 'Uang Tunai', desc: 'Kas laci kasir dikurangi otomatis', icon: <Banknote className="w-4 h-4" />, color: 'text-emerald-600' },
  { key: 'StoreCredit', label: 'Saldo Deposit', desc: 'Tambah saldo deposit/wallet pelanggan', icon: <Wallet className="w-4 h-4" />, color: 'text-blue-600' },
  { key: 'BankTransfer', label: 'Transfer Bank', desc: 'Refund melalui transfer rekening bank', icon: <ArrowRightLeft className="w-4 h-4" />, color: 'text-violet-600' },
  { key: 'ExchangeProduct', label: 'Tukar Barang', desc: 'Ganti dengan barang lain / varian berbeda', icon: <Package className="w-4 h-4" />, color: 'text-amber-600' },
];

const RETURN_REASONS = [
  'Barang Rusak / Cacat Produksi',
  'Kadaluarsa / Basi',
  'Salah Beli / Tukar Varian',
  'Pelanggan Batal Beli',
  'Garansi Distributor — Unit Bermasalah',
  'Tidak Sesuai Spesifikasi',
  'Kemasan Rusak / Penyok',
  'Lainnya',
];

const METHOD_LABEL: Record<string, string> = {
  Cash: 'Tunai', '0': 'Tunai',
  StoreCredit: 'Saldo Deposit', '1': 'Saldo Deposit',
  BankTransfer: 'Transfer Bank', '2': 'Transfer Bank',
  ExchangeProduct: 'Tukar Barang', '3': 'Tukar Barang',
};

export const SalesReturnPage: React.FC = () => {
  const { currentUser, storeInfo } = useAuthStore();

  const [returns, setReturns] = useState<SalesReturn[]>([]);
  const [searchInvoice, setSearchInvoice] = useState('');
  const [foundOrder, setFoundOrder] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const [returnItems, setReturnItems] = useState<ReturnItemState[]>([]);
  const [returnReason, setReturnReason] = useState(RETURN_REASONS[0]);
  const [refundMethod, setRefundMethod] = useState<RefundMethodKey>('Cash');
  const [notes, setNotes] = useState('');
  const [exchangeNote, setExchangeNote] = useState('');

  const [historySearch, setHistorySearch] = useState('');
  const [historyMethodFilter, setHistoryMethodFilter] = useState('all');
  const [showHistoryFilter, setShowHistoryFilter] = useState(false);

  const invoiceInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { fetchReturns(); }, []);

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
      setFoundOrder(null);
      const res = await fetch(`/api/v1/sales/returns/find-order?invoiceNumber=${encodeURIComponent(searchInvoice.trim())}`);
      if (res.ok) {
        const order = await res.json();
        setFoundOrder(order);
        setReturnItems(order.items.map((i: any) => ({
          productId: i.productId, productName: i.productName, sku: i.sku,
          quantity: 0, maxQty: i.quantity, unitPrice: i.unitPrice,
          isRestocked: true, condition: 'Bagus' as const,
        })));
        setNotes(''); setExchangeNote('');
        useToastStore.getState().showToast(`Nota "${order.invoiceNumber}" ditemukan!`, 'success');
      } else {
        useToastStore.getState().showToast('Nomor nota tidak ditemukan. Periksa kembali.', 'warning');
      }
    } catch {
      useToastStore.getState().showToast('Gagal mencari nota. Periksa koneksi server.', 'error');
    } finally { setIsLoading(false); }
  };

  const totalRefund = returnItems.reduce((a, i) => a + i.quantity * i.unitPrice, 0);
  const selectedCount = returnItems.filter(i => i.quantity > 0).length;
  const isHighValue = totalRefund >= 500_000;

  const handleClickConfirm = () => {
    if (selectedCount === 0) { useToastStore.getState().showToast('Pilih minimal 1 barang dan masukkan qty retur!', 'warning'); return; }
    if (refundMethod === 'StoreCredit' && !foundOrder?.customerId) { useToastStore.getState().showToast('Refund Saldo Deposit hanya untuk pelanggan member terdaftar!', 'warning'); return; }
    if (isHighValue && refundMethod !== 'ExchangeProduct') { setShowConfirm(true); } else { handleProcessReturn(); }
  };

  const handleProcessReturn = async () => {
    setShowConfirm(false);
    const items = returnItems.filter(i => i.quantity > 0);
    const finalNotes = refundMethod === 'ExchangeProduct' && exchangeNote ? `[Tukar Barang: ${exchangeNote}] ${notes}`.trim() : notes;
    try {
      setIsSubmitting(true);
      const res = await fetch('/api/v1/sales/returns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          originalInvoiceNumber: foundOrder.invoiceNumber,
          customerId: foundOrder.customerId || null,
          customerName: foundOrder.customerName || 'Pelanggan Umum',
          cashierUserId: currentUser?.id || 'Kasir',
          totalRefundAmount: refundMethod === 'ExchangeProduct' ? 0 : totalRefund,
          refundMethod, returnReason, notes: finalNotes,
          items: items.map(i => ({ productId: i.productId, productName: i.productName, sku: i.sku, quantity: i.quantity, unitPrice: i.unitPrice, isRestocked: i.isRestocked, condition: i.condition })),
        }),
      });
      if (res.ok) {
        const ml = REFUND_METHODS.find(m => m.key === refundMethod)?.label || refundMethod;
        useToastStore.getState().showToast(refundMethod === 'ExchangeProduct' ? 'Retur tukar barang berhasil dicatat!' : `Retur berhasil! Refund Rp ${totalRefund.toLocaleString('id-ID')} via ${ml}`, 'success');
        setFoundOrder(null); setSearchInvoice(''); setReturnItems([]); setNotes(''); setExchangeNote('');
        fetchReturns();
      } else {
        const d = await res.json().catch(() => ({}));
        useToastStore.getState().showToast(d?.message || 'Gagal memproses retur.', 'error');
      }
    } catch { useToastStore.getState().showToast('Gagal memproses retur. Periksa koneksi server.', 'error'); }
    finally { setIsSubmitting(false); }
  };

  const handleExportCSV = () => window.open('/api/v1/sales/returns/export-csv', '_blank');

  const handlePrintReturnReceipt = (ret: any) => {
    const sn = storeInfo?.storeName || 'OmniPOS';
    const sp = storeInfo?.storePhone || '';
    const dateStr = new Date(ret.returnDate).toLocaleString('id-ID', { dateStyle: 'long', timeStyle: 'short' });
    const ml = METHOD_LABEL[ret.refundMethod?.toString()] || 'Tunai';
    const isEx = ret.refundMethod?.toString() === 'ExchangeProduct' || ret.refundMethod?.toString() === '3';
    const rows = (ret.items || []).map((i: any) =>
      `<div class="row"><span>${i.productName} (${i.condition || 'Bagus'}) x${i.returnedQuantity}</span><span>${isEx ? '-' : 'Rp ' + (i.refundAmount || i.unitPrice * i.returnedQuantity).toLocaleString('id-ID')}</span></div>`
    ).join('');
    const w = window.open('', '_blank', 'width=400,height=700');
    if (!w) return;
    w.document.write(`<!DOCTYPE html><html><head><title>Bukti Retur</title>
<style>body{font-family:'Courier New',monospace;width:300px;margin:0 auto;padding:10px;font-size:11px}h2{font-size:13px;text-align:center;margin:4px 0}.sub{text-align:center;font-size:10px;color:#555;margin-bottom:8px}.line{border-top:1px dashed #000;margin:6px 0}.row{display:flex;justify-content:space-between;margin:2px 0}.total{font-size:13px;font-weight:700}.center{text-align:center}@media print{@page{size:80mm auto;margin:0}body{width:72mm}}</style>
</head><body>
<h2>${sn}</h2><div class="sub">${sp}</div>
<h2>BUKTI RETUR / REFUND</h2><div class="sub">${dateStr}</div>
<div class="line"></div>
<div class="row"><span>No. Retur:</span><span>${ret.returnNumber}</span></div>
<div class="row"><span>Nota Asal:</span><span>${ret.originalInvoiceNumber}</span></div>
<div class="row"><span>Pelanggan:</span><span>${ret.customerName || 'Umum'}</span></div>
<div class="row"><span>Kasir:</span><span>${ret.cashierUserId || '-'}</span></div>
<div class="row"><span>Alasan:</span><span style="max-width:160px;text-align:right">${ret.returnReason}</span></div>
<div class="line"></div>
<p style="font-size:10px;font-weight:700;margin:2px 0">Barang Diretur:</p>
${rows}
<div class="line"></div>
<div class="row"><span>Metode Refund:</span><span>${ml}</span></div>
${isEx ? '<div class="row"><span>Nilai Refund:</span><span>Tukar Barang</span></div>' : `<div class="row total"><span>TOTAL REFUND:</span><span>Rp ${ret.totalRefundAmount.toLocaleString('id-ID')}</span></div>`}
${ret.notes ? `<div class="row" style="font-size:9px"><span>Catatan:</span><span style="max-width:160px;text-align:right">${ret.notes}</span></div>` : ''}
<div class="line"></div>
<div class="center" style="margin-top:16px;font-size:9px">Terima kasih atas pengertiannya.<br>Bukti ini sah sebagai dokumen pengembalian barang.</div>
<div style="margin-top:30px;display:flex;justify-content:space-between;font-size:9px">
<div style="text-align:center"><div style="border-top:1px solid #000;width:80px;margin-top:20px">Kasir</div></div>
<div style="text-align:center"><div style="border-top:1px solid #000;width:80px;margin-top:20px">Pelanggan</div></div>
</div></body></html>`);
    w.document.close(); setTimeout(() => w.print(), 400);
  };

  const filteredReturns = returns.filter(r => {
    const q = historySearch.toLowerCase();
    const ms = r.refundMethod?.toString();
    const matchSearch = !q || [r.returnNumber, r.originalInvoiceNumber, r.customerName, r.returnReason].some(s => s?.toLowerCase().includes(q));
    const matchMethod = historyMethodFilter === 'all'
      || (historyMethodFilter === 'Cash' && (ms === 'Cash' || ms === '0'))
      || (historyMethodFilter === 'StoreCredit' && (ms === 'StoreCredit' || ms === '1'))
      || (historyMethodFilter === 'BankTransfer' && (ms === 'BankTransfer' || ms === '2'))
      || (historyMethodFilter === 'ExchangeProduct' && (ms === 'ExchangeProduct' || ms === '3'));
    return matchSearch && matchMethod;
  });

  const totalHistory = filteredReturns.reduce((a, r) => a + (r.totalRefundAmount || 0), 0);

  return (
    <div className="flex-1 flex flex-col bg-app overflow-hidden select-none">
      <header className="px-6 py-4 border-b border-border-subtle bg-surface flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-base font-bold text-text-primary flex items-center gap-2">
            <RotateCcw className="w-5 h-5 text-primary" />
            Retur Penjualan &amp; Pengembalian Dana
          </h1>
          <p className="text-xs text-text-secondary mt-0.5">Proses retur barang dan pilih metode pengembalian dana yang fleksibel</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={handleExportCSV} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border-subtle bg-card hover:bg-card-hover text-xs font-semibold text-text-secondary transition-all">
            <Download className="w-3.5 h-3.5" />Ekspor CSV
          </button>
          <button onClick={fetchReturns} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border-subtle bg-card hover:bg-card-hover text-xs font-semibold text-text-secondary transition-all">
            <RefreshCw className="w-3.5 h-3.5" />Muat Ulang
          </button>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {/* Search Section */}
        <div className="p-5 bg-card border border-border-subtle rounded-2xl shadow-sm space-y-4 max-w-4xl">
          <h2 className="text-sm font-bold text-text-primary flex items-center gap-2">
            <span className="w-5 h-5 rounded-full bg-primary text-primary-text text-[10px] font-black flex items-center justify-center">1</span>
            Cari Nota Pembelian Pelanggan
          </h2>
          <form onSubmit={handleSearchOrder} className="flex gap-2">
            <div className="relative flex-1">
              <Receipt className="w-4 h-4 text-text-muted absolute left-3 top-1/2 -translate-y-1/2" />
              <input ref={invoiceInputRef} type="text" value={searchInvoice} onChange={e => setSearchInvoice(e.target.value)}
                placeholder="Scan atau ketik Nomor Nota (INV-YYYYMMDD-XXXX)..."
                className="w-full pl-9 pr-3 py-2.5 bg-subtle border border-border-strong rounded-xl text-xs font-mono text-text-primary focus:outline-none focus:border-primary" autoFocus />
            </div>
            <button type="button" onClick={() => invoiceInputRef.current?.focus()} title="Fokus untuk scan barcode"
              className="px-3 py-2 border border-border-subtle rounded-xl bg-subtle hover:bg-card-hover text-text-secondary transition-all">
              <Scan className="w-4 h-4" />
            </button>
            <button type="submit" disabled={isLoading || !searchInvoice.trim()}
              className="px-5 py-2 bg-primary hover:bg-primary-hover text-primary-text rounded-xl text-xs font-bold shadow-sm disabled:opacity-50 disabled:cursor-not-allowed transition-all">
              {isLoading ? <span className="flex items-center gap-1.5"><RefreshCw className="w-3.5 h-3.5 animate-spin" />Mencari...</span> : 'Cari Nota'}
            </button>
          </form>

          {foundOrder && (
            <div className="pt-4 border-t border-border-subtle space-y-4">
              {/* Order info */}
              <div className="p-3 bg-primary/5 border border-primary/20 rounded-xl flex flex-wrap items-center justify-between gap-2 text-xs">
                <div>
                  <p className="font-black font-mono text-primary text-base">{foundOrder.invoiceNumber}</p>
                  <p className="text-text-secondary mt-0.5">
                    {new Date(foundOrder.orderDate).toLocaleString('id-ID', { dateStyle: 'long', timeStyle: 'short' })} &nbsp;|&nbsp; Kasir: <strong>{foundOrder.cashierUserId || '-'}</strong>
                  </p>
                  {foundOrder.customerName && <p className="text-text-secondary">Pelanggan: <strong>{foundOrder.customerName}</strong></p>}
                </div>
                <div className="text-right">
                  <p className="text-text-muted text-[10px]">Total Belanja</p>
                  <p className="text-xl font-extrabold font-mono text-text-primary">Rp {foundOrder.totalAmount?.toLocaleString('id-ID')}</p>
                </div>
              </div>

              {/* Step 2: Items */}
              <div className="space-y-2">
                <h3 className="text-xs font-bold text-text-primary flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-primary text-primary-text text-[10px] font-black flex items-center justify-center">2</span>
                  Pilih Barang yang Diretur
                </h3>
                <div className="border border-border-subtle rounded-xl overflow-hidden divide-y divide-border-subtle">
                  {returnItems.map((item, idx) => (
                    <div key={idx} className="p-3 bg-card flex flex-wrap items-center gap-3 text-xs">
                      <div className="flex-1 min-w-[150px]">
                        <p className="font-bold text-text-primary">{item.productName}</p>
                        <p className="text-[10px] text-text-muted font-mono">{item.sku} &nbsp;|&nbsp; Rp {item.unitPrice.toLocaleString('id-ID')} / satuan</p>
                      </div>
                      {/* Qty stepper */}
                      <div className="flex items-center gap-1.5 shrink-0">
                        <span className="text-[11px] text-text-secondary">Qty:</span>
                        <div className="flex items-center border border-border-strong rounded-lg overflow-hidden">
                          <button onClick={() => setReturnItems(prev => prev.map((it, i) => i === idx ? { ...it, quantity: Math.max(0, it.quantity - 1) } : it))}
                            className="px-2 py-1 text-text-secondary hover:bg-subtle font-bold">−</button>
                          <input type="number" min="0" max={item.maxQty} value={item.quantity}
                            onChange={e => { const v = Math.min(item.maxQty, Math.max(0, parseInt(e.target.value) || 0)); setReturnItems(prev => prev.map((it, i) => i === idx ? { ...it, quantity: v } : it)); }}
                            className="w-12 py-1 bg-subtle text-center font-mono font-bold text-xs border-x border-border-strong focus:outline-none" />
                          <button onClick={() => setReturnItems(prev => prev.map((it, i) => i === idx ? { ...it, quantity: Math.min(it.maxQty, it.quantity + 1) } : it))}
                            className="px-2 py-1 text-text-secondary hover:bg-subtle font-bold">+</button>
                        </div>
                        <span className="text-[10px] text-text-muted">/ {item.maxQty}</span>
                      </div>
                      {/* Kondisi */}
                      <div className="flex items-center gap-1.5 shrink-0">
                        <span className="text-[11px] text-text-secondary">Kondisi:</span>
                        <select value={item.condition}
                          onChange={e => setReturnItems(prev => prev.map((it, i) => i === idx ? { ...it, condition: e.target.value as any, isRestocked: e.target.value !== 'Tidak Bisa Dijual' } : it))}
                          className="text-[11px] px-2 py-1 border border-border-strong rounded-lg bg-subtle font-semibold focus:outline-none focus:border-primary">
                          <option value="Bagus">✅ Bagus</option>
                          <option value="Cacat">⚠️ Cacat</option>
                          <option value="Tidak Bisa Dijual">❌ Tidak Bisa Dijual</option>
                        </select>
                      </div>
                      {/* Masuk stok */}
                      <label className="flex items-center gap-1.5 text-[11px] text-text-secondary cursor-pointer shrink-0">
                        <input type="checkbox" checked={item.isRestocked} disabled={item.condition === 'Tidak Bisa Dijual'}
                          onChange={e => setReturnItems(prev => prev.map((it, i) => i === idx ? { ...it, isRestocked: e.target.checked } : it))}
                          className="rounded accent-primary" />
                        <span className={item.condition === 'Tidak Bisa Dijual' ? 'opacity-40' : ''}>Masuk Stok</span>
                      </label>
                      {item.quantity > 0 && (
                        <span className="ml-auto text-xs font-bold font-mono text-status-danger shrink-0">
                          −Rp {(item.quantity * item.unitPrice).toLocaleString('id-ID')}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Step 3: Alasan & Metode */}
              <div className="space-y-3">
                <h3 className="text-xs font-bold text-text-primary flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-primary text-primary-text text-[10px] font-black flex items-center justify-center">3</span>
                  Alasan &amp; Metode Pengembalian
                </h3>
                <div>
                  <label className="block text-[11px] font-semibold text-text-secondary mb-1">Alasan Retur</label>
                  <select value={returnReason} onChange={e => setReturnReason(e.target.value)}
                    className="w-full px-3 py-2 bg-subtle border border-border-strong rounded-lg text-xs focus:outline-none focus:border-primary">
                    {RETURN_REASONS.map(r => <option key={r} value={r}>{r}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-text-secondary mb-1.5">Metode Pengembalian Dana</label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {REFUND_METHODS.map(m => {
                      const isSelected = refundMethod === m.key;
                      const disabled = m.key === 'StoreCredit' && !foundOrder?.customerId;
                      return (
                        <button key={m.key} type="button" disabled={disabled} onClick={() => setRefundMethod(m.key)}
                          className={`p-3 rounded-xl border-2 text-left transition-all ${isSelected ? 'border-primary bg-primary/5' : 'border-border-subtle bg-card hover:bg-subtle'} ${disabled ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'}`}>
                          <div className={`${m.color} mb-1`}>{m.icon}</div>
                          <p className="text-xs font-bold text-text-primary">{m.label}</p>
                          <p className="text-[10px] text-text-muted leading-tight">{m.desc}</p>
                          {disabled && <p className="text-[9px] text-rose-500 mt-1">Butuh pelanggan member</p>}
                        </button>
                      );
                    })}
                  </div>
                </div>
                {refundMethod === 'ExchangeProduct' && (
                  <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl space-y-2">
                    <p className="text-[11px] font-semibold text-amber-700 flex items-center gap-1.5">
                      <Package className="w-3.5 h-3.5" />Keterangan Barang Pengganti
                    </p>
                    <input type="text" value={exchangeNote} onChange={e => setExchangeNote(e.target.value)}
                      placeholder="Contoh: Tukar ke varian Rasa Coklat 200g SKU-XXX"
                      className="w-full px-3 py-2 bg-white border border-amber-300 rounded-lg text-xs focus:outline-none focus:border-amber-500" />
                    <p className="text-[10px] text-amber-600"><Info className="w-3 h-3 inline mr-0.5" />Nilai refund dicatat Rp 0 (tukar setara). Stok barang pengganti disesuaikan manual.</p>
                  </div>
                )}
                <div>
                  <label className="block text-[11px] font-semibold text-text-secondary mb-1">Catatan Tambahan (opsional)</label>
                  <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2}
                    placeholder="Keterangan kondisi barang, nomor seri, atau informasi lain..."
                    className="w-full px-3 py-2 bg-subtle border border-border-strong rounded-lg text-xs resize-none focus:outline-none focus:border-primary" />
                </div>
              </div>

              {/* Summary & Submit */}
              <div className="pt-4 border-t border-border-subtle flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-[11px] text-text-muted">
                    {selectedCount} jenis barang · Metode: <strong>{REFUND_METHODS.find(m => m.key === refundMethod)?.label}</strong>
                  </p>
                  {refundMethod !== 'ExchangeProduct'
                    ? <p className="text-2xl font-extrabold font-mono text-status-danger">−Rp {totalRefund.toLocaleString('id-ID')}</p>
                    : <p className="text-lg font-extrabold text-amber-600">Tukar Barang Setara</p>}
                  {isHighValue && refundMethod !== 'ExchangeProduct' && (
                    <p className="text-[10px] text-amber-600 flex items-center gap-1 mt-0.5">
                      <AlertTriangle className="w-3 h-3" />Transaksi besar — akan meminta konfirmasi tambahan
                    </p>
                  )}
                </div>
                <div className="flex gap-2">
                  <button type="button" onClick={() => { setFoundOrder(null); setSearchInvoice(''); setReturnItems([]); }}
                    className="px-4 py-2.5 border border-border-subtle bg-card hover:bg-subtle rounded-xl text-xs font-semibold text-text-secondary transition-all">
                    <X className="w-3.5 h-3.5 inline mr-1" />Batal
                  </button>
                  <button type="button" onClick={handleClickConfirm} disabled={isSubmitting || selectedCount === 0}
                    className="px-6 py-2.5 bg-status-danger hover:bg-rose-700 text-white rounded-xl text-xs font-bold shadow-md disabled:opacity-40 disabled:cursor-not-allowed transition-all flex items-center gap-2">
                    {isSubmitting ? <><RefreshCw className="w-3.5 h-3.5 animate-spin" />Memproses...</> : <><RotateCcw className="w-3.5 h-3.5" />Proses Retur</>}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Confirm Dialog */}
        {showConfirm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
            <div className="bg-card border border-border-subtle rounded-2xl shadow-2xl p-6 max-w-sm w-full mx-4 space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center shrink-0">
                  <AlertTriangle className="w-5 h-5 text-amber-600" />
                </div>
                <div>
                  <p className="font-bold text-text-primary text-sm">Konfirmasi Refund Besar</p>
                  <p className="text-xs text-text-secondary">Nilai pengembalian melebihi Rp 500.000</p>
                </div>
              </div>
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs space-y-1">
                <div className="flex justify-between"><span className="text-text-secondary">Nota Asal:</span><span className="font-mono font-bold">{foundOrder?.invoiceNumber}</span></div>
                <div className="flex justify-between"><span className="text-text-secondary">Total Refund:</span><span className="font-mono font-extrabold text-status-danger">Rp {totalRefund.toLocaleString('id-ID')}</span></div>
                <div className="flex justify-between"><span className="text-text-secondary">Metode:</span><span className="font-bold">{REFUND_METHODS.find(m => m.key === refundMethod)?.label}</span></div>
              </div>
              <p className="text-xs text-text-muted">Pastikan barang sudah diperiksa dan mendapat persetujuan supervisor sebelum melanjutkan.</p>
              <div className="flex gap-2 pt-1">
                <button onClick={() => setShowConfirm(false)} className="flex-1 py-2 border border-border-subtle rounded-xl text-xs font-semibold text-text-secondary hover:bg-subtle transition-all">Batal</button>
                <button onClick={handleProcessReturn} className="flex-1 py-2 bg-status-danger hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition-all">Ya, Proses Retur</button>
              </div>
            </div>
          </div>
        )}

        {/* History */}
        <div className="space-y-3 max-w-4xl">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-sm font-bold text-text-primary flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-primary text-primary-text text-[10px] font-black flex items-center justify-center">2</span>
              Riwayat Transaksi Retur
              <span className="text-[10px] font-normal text-text-muted">({filteredReturns.length} transaksi)</span>
            </h2>
            <button onClick={() => setShowHistoryFilter(v => !v)}
              className="flex items-center gap-1.5 px-3 py-1.5 border border-border-subtle rounded-lg bg-card hover:bg-subtle text-xs font-semibold text-text-secondary transition-all">
              <Filter className="w-3.5 h-3.5" />Filter &amp; Cari
              {showHistoryFilter ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            </button>
          </div>

          {showHistoryFilter && (
            <div className="p-3 bg-card border border-border-subtle rounded-xl flex flex-wrap gap-3 items-center">
              <div className="relative flex-1 min-w-[180px]">
                <Search className="w-3.5 h-3.5 text-text-muted absolute left-2.5 top-1/2 -translate-y-1/2" />
                <input type="text" value={historySearch} onChange={e => setHistorySearch(e.target.value)}
                  placeholder="Cari nomor retur, nota, pelanggan..."
                  className="w-full pl-8 pr-3 py-1.5 bg-subtle border border-border-strong rounded-lg text-xs focus:outline-none focus:border-primary" />
              </div>
              <select value={historyMethodFilter} onChange={e => setHistoryMethodFilter(e.target.value)}
                className="text-xs px-2 py-1.5 border border-border-strong rounded-lg bg-subtle focus:outline-none focus:border-primary">
                <option value="all">Semua Metode</option>
                <option value="Cash">Tunai</option>
                <option value="StoreCredit">Saldo Deposit</option>
                <option value="BankTransfer">Transfer Bank</option>
                <option value="ExchangeProduct">Tukar Barang</option>
              </select>
              {(historySearch || historyMethodFilter !== 'all') && (
                <button onClick={() => { setHistorySearch(''); setHistoryMethodFilter('all'); }}
                  className="text-xs text-text-muted hover:text-text-primary flex items-center gap-1 transition-all">
                  <X className="w-3.5 h-3.5" /> Reset
                </button>
              )}
            </div>
          )}

          {filteredReturns.length > 0 && (
            <div className="text-xs">
              <span className="px-3 py-1.5 bg-rose-50 border border-rose-200 rounded-lg text-rose-700 font-semibold">
                Total Refund: <strong className="font-mono">Rp {totalHistory.toLocaleString('id-ID')}</strong>
              </span>
            </div>
          )}

          <div className="space-y-2">
            {filteredReturns.map(ret => {
              const ms = ret.refundMethod?.toString();
              const ml = METHOD_LABEL[ms] || 'Tunai';
              const isEx = ms === 'ExchangeProduct' || ms === '3';
              const badgeCls = ms === 'Cash' || ms === '0' ? 'bg-emerald-100 text-emerald-700'
                : ms === 'StoreCredit' || ms === '1' ? 'bg-blue-100 text-blue-700'
                : ms === 'BankTransfer' || ms === '2' ? 'bg-violet-100 text-violet-700'
                : 'bg-amber-100 text-amber-700';
              return (
                <div key={ret.id} className="p-4 rounded-xl bg-card border border-border-subtle shadow-sm">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold font-mono text-primary text-sm">{ret.returnNumber}</span>
                        <span className="text-text-secondary text-xs">Nota: <strong className="font-mono text-text-primary">{ret.originalInvoiceNumber}</strong></span>
                      </div>
                      <p className="text-[11px] text-text-secondary mt-0.5">
                        {new Date(ret.returnDate).toLocaleDateString('id-ID', { dateStyle: 'medium' })} · {ret.customerName || 'Pelanggan Umum'} · <span className="text-text-primary font-medium">{ret.returnReason}</span>
                      </p>
                      {ret.notes && <p className="text-[10px] text-text-muted mt-0.5 line-clamp-1">{ret.notes}</p>}
                    </div>
                    <div className="text-right flex flex-col items-end gap-1.5 shrink-0">
                      {isEx
                        ? <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 text-[10px] font-bold"><Package className="w-3 h-3 inline mr-0.5" />Tukar Barang</span>
                        : <p className="font-extrabold font-mono text-status-danger">−Rp {ret.totalRefundAmount.toLocaleString('id-ID')}</p>}
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${badgeCls}`}>{ml}</span>
                      <button onClick={() => handlePrintReturnReceipt(ret)}
                        className="px-2.5 py-1 rounded-lg border border-border-subtle bg-subtle hover:bg-card-hover text-[10px] font-bold text-text-secondary flex items-center gap-1 transition-all">
                        <Printer className="w-3 h-3 text-primary" />Cetak Bukti
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}

            {filteredReturns.length === 0 && (
              <div className="py-12 text-center text-text-muted">
                <RotateCcw className="w-10 h-10 mx-auto mb-2 opacity-20" />
                <p className="text-sm font-semibold">
                  {historySearch || historyMethodFilter !== 'all' ? 'Tidak ada riwayat retur yang sesuai filter' : 'Belum ada transaksi retur penjualan'}
                </p>
                <p className="text-xs mt-1 opacity-70">
                  {historySearch || historyMethodFilter !== 'all' ? 'Coba ubah kata kunci atau filter' : 'Cari nomor nota di atas untuk memproses retur'}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SalesReturnPage;
