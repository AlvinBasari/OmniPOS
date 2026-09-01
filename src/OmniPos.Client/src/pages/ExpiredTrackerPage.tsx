import React, { useState, useEffect } from 'react';
import { 
  Clock, 
  AlertTriangle, 
  CheckCircle2, 
  Plus, 
  Search, 
  Radio,
  ShieldCheck,
  Printer,
  Signal,
  Package,
  X
} from 'lucide-react';
import { ProductBatch, Product, SimCardSpecialNumber, ProductSerialNumber } from '../types';
import { useToastStore } from '../store/useToastStore';
import { useBusinessModeStore } from '../store/useBusinessModeStore';

export const ExpiredTrackerPage: React.FC = () => {
  const { mode } = useBusinessModeStore();
  const isElectronics = mode === 'Electronics';

  // RETAIL mode states
  const [batches, setBatches] = useState<ProductBatch[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isAddBatchOpen, setIsAddBatchOpen] = useState(false);
  const [selectedProductId, setSelectedProductId] = useState('');
  const [batchNo, setBatchNo] = useState('');
  const [expDate, setExpDate] = useState('');
  const [stockQty, setStockQty] = useState('50');
  const [notes, setNotes] = useState('');

  // ELECTRONICS mode
  const [elTab, setElTab] = useState<'sim' | 'warranty'>('sim');
  const [simCards, setSimCards] = useState<SimCardSpecialNumber[]>([]);
  const [simSearch, setSimSearch] = useState('');
  const [simProvFilter, setSimProvFilter] = useState('ALL');
  const [serials, setSerials] = useState<ProductSerialNumber[]>([]);
  const [serialSearch, setSerialSearch] = useState('');
  const [warrantyFilter, setWarrantyFilter] = useState<'ALL' | 'expiring' | 'expired'>('ALL');

  useEffect(() => {
    if (isElectronics) {
      fetchSimCards();
      fetchSerials();
    } else {
      fetchData();
    }
  }, [isElectronics]);

  const fetchData = async () => {
    try {
      const [bRes, prodRes] = await Promise.all([
        fetch('/api/v1/inventory/batches'),
        fetch('/api/v1/products')
      ]);
      if (bRes.ok) setBatches(await bRes.json());
      if (prodRes.ok) setProducts(await prodRes.json());
    } catch {}
  };

  const fetchSimCards = async () => {
    try {
      const res = await fetch('/api/v1/electronics/sim-cards');
      if (res.ok) setSimCards(await res.json());
    } catch {}
  };

  const fetchSerials = async () => {
    try {
      const res = await fetch('/api/v1/electronics/serials');
      if (res.ok) setSerials(await res.json());
    } catch {}
  };

  const handleCreateBatch = async (e: React.FormEvent) => {
    e.preventDefault();
    const prod = products.find(p => p.id === selectedProductId);
    if (!prod || !expDate) return;
    try {
      const res = await fetch('/api/v1/inventory/batches', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productId: prod.id, productName: prod.name, sku: prod.sku,
          batchNumber: batchNo.trim() || `BATCH-${Date.now().toString().slice(-4)}`,
          expiredDate: new Date(expDate),
          initialStock: parseFloat(stockQty) || 0,
          currentStock: parseFloat(stockQty) || 0,
          notes: notes.trim()
        })
      });
      if (res.ok) {
        useToastStore.getState().showToast('Batch berhasil dicatat!', 'success');
        setIsAddBatchOpen(false);
        setSelectedProductId(''); setBatchNo(''); setExpDate(''); fetchData();
      }
    } catch {
      useToastStore.getState().showToast('Gagal mencatat batch.', 'error');
    }
  };

  const getDaysUntil = (dateStr: string) => Math.ceil((new Date(dateStr).getTime() - Date.now()) / 86400000);

  const getStatusBadge = (days: number) => {
    if (days <= 0) return { label: 'HANGUS / KADALUARSA', cls: 'bg-rose-600 text-white' };
    if (days <= 7) return { label: `KRITIS (H-${days})`, cls: 'bg-rose-500/10 text-rose-600 border border-rose-500/30' };
    if (days <= 30) return { label: `PERINGATAN (H-${days})`, cls: 'bg-amber-500/10 text-amber-600 border border-amber-500/30' };
    if (days <= 90) return { label: `SEGERA (H-${days})`, cls: 'bg-sky-500/10 text-sky-600 border border-sky-500/30' };
    return { label: `AMAN (${days} hari)`, cls: 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/20' };
  };

  // ---- ELECTRONICS SIM ----
  const activeSims = simCards.filter(s => s.status !== 'Sold' && s.status !== 1);
  const filteredSims = activeSims.filter(s => {
    const ms = !simSearch || s.msisdn.includes(simSearch) || s.provider.toLowerCase().includes(simSearch.toLowerCase());
    const mp = simProvFilter === 'ALL' || s.provider === simProvFilter;
    return ms && mp;
  }).sort((a, b) => new Date(a.expiryDate).getTime() - new Date(b.expiryDate).getTime());

  const simExpiredCount = activeSims.filter(s => getDaysUntil(s.expiryDate) <= 0).length;
  const simCriticalCount = activeSims.filter(s => { const d = getDaysUntil(s.expiryDate); return d > 0 && d <= 30; }).length;
  const simSafeCount = activeSims.filter(s => getDaysUntil(s.expiryDate) > 30).length;

  // ---- ELECTRONICS WARRANTY ----
  const serialsWithW = serials.filter(s => s.warrantyEndDate);
  const filteredSerials = serialsWithW.filter(s => {
    const ms = !serialSearch || (s.serialNo || '').toLowerCase().includes(serialSearch.toLowerCase()) || (s.productName || '').toLowerCase().includes(serialSearch.toLowerCase());
    const d = getDaysUntil(s.warrantyEndDate!);
    if (warrantyFilter === 'expired') return ms && d <= 0;
    if (warrantyFilter === 'expiring') return ms && d > 0 && d <= 90;
    return ms;
  }).sort((a, b) => new Date(a.warrantyEndDate!).getTime() - new Date(b.warrantyEndDate!).getTime());

  const wExpiredCt = serialsWithW.filter(s => getDaysUntil(s.warrantyEndDate!) <= 0).length;
  const wExpiringCt = serialsWithW.filter(s => { const d = getDaysUntil(s.warrantyEndDate!); return d > 0 && d <= 90; }).length;

  // ---- RETAIL ----
  const filteredBatches = batches.filter(b =>
    b.productName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    b.batchNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
    b.sku.toLowerCase().includes(searchQuery.toLowerCase())
  );
  const criticalCt = batches.filter(b => getDaysUntil(b.expiredDate) <= 7).length;
  const warningCt = batches.filter(b => { const d = getDaysUntil(b.expiredDate); return d > 7 && d <= 30; }).length;

  const OP_COLORS: Record<string, string> = {
    'Telkomsel': 'bg-red-500/10 text-red-700 border-red-500/30',
    'Indosat Ooredoo IM3': 'bg-yellow-600/10 text-yellow-700 border-yellow-600/30',
    'XL Axiata': 'bg-blue-500/10 text-blue-700 border-blue-500/30',
    'Axis': 'bg-purple-500/10 text-purple-700 border-purple-500/30',
    'Smartfren': 'bg-orange-500/10 text-orange-700 border-orange-500/30',
    'Tri (3)': 'bg-sky-500/10 text-sky-700 border-sky-500/30',
  };

  const handlePrintSim = () => {
    const el = document.getElementById('sim-print-zone');
    if (!el) return;
    const w = window.open('', '_blank', 'width=960,height=720');
    if (!w) return;
    w.document.write(`<html><head><title>Laporan Masa Aktif SIM</title>
      <style>body{font-family:Arial,sans-serif;font-size:11px;padding:24px}table{width:100%;border-collapse:collapse}th{background:#f3f4f6;padding:7px 9px;text-align:left;font-weight:700;border-bottom:2px solid #e5e7eb}td{padding:6px 9px;border-bottom:1px solid #f0f0f0}h2{font-size:15px;margin:0 0 4px}p.sub{font-size:10px;color:#6b7280;margin:0 0 18px}.r{color:#dc2626;font-weight:700}.a{color:#d97706;font-weight:700}.g{color:#16a34a}</style>
    </head><body>${el.innerHTML}</body></html>`);
    w.document.close(); w.print();
  };

  return (
    <div className="flex-1 flex flex-col bg-app overflow-hidden select-none">

      {/* HEADER */}
      <header className="px-6 py-4 border-b border-border-subtle bg-surface flex items-center justify-between">
        <div>
          <h1 className="text-base font-bold text-text-primary flex items-center gap-2">
            <Clock className="w-5 h-5 text-primary" />
            {isElectronics ? 'Monitor Masa Aktif & Garansi Distributor' : 'Monitoring Tanggal Kadaluarsa (FEFO Tracker)'}
          </h1>
          <p className="text-xs text-text-secondary mt-0.5">
            {isElectronics
              ? 'Pantau batas aktivasi kartu perdana & masa garansi unit dari distributor secara real-time'
              : 'Peringatan dini barang mendekati expired date & rekomendasi First Expired First Out'}
          </p>
        </div>
        {!isElectronics && (
          <button onClick={() => setIsAddBatchOpen(true)} className="px-4 py-2 bg-primary hover:bg-primary-hover text-primary-text rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-sm">
            <Plus className="w-4 h-4" /> Catat Batch & Expired Baru
          </button>
        )}
      </header>

      {/* ELECTRONICS TAB SWITCHER */}
      {isElectronics && (
        <div className="px-6 py-2.5 border-b border-border-subtle bg-surface flex items-center gap-2">
          <button
            onClick={() => setElTab('sim')}
            className={`px-4 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all ${elTab === 'sim' ? 'bg-primary text-primary-text' : 'bg-subtle text-text-secondary hover:bg-card-hover border border-border-subtle'}`}
          >
            <Radio className="w-3.5 h-3.5" />
            📶 Batas Registrasi Kartu Perdana
          </button>
          <button
            onClick={() => setElTab('warranty')}
            className={`px-4 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all ${elTab === 'warranty' ? 'bg-primary text-primary-text' : 'bg-subtle text-text-secondary hover:bg-card-hover border border-border-subtle'}`}
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            🛡️ Garansi Distributor Unit
          </button>
        </div>
      )}

      {/* METRIC BADGES */}
      <div className="px-6 py-3 border-b border-border-subtle bg-surface flex items-center gap-3 flex-wrap text-xs font-bold">
        {isElectronics && elTab === 'sim' ? (
          <>
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-600">
              <AlertTriangle className="w-4 h-4" /><span>Masa Aktif Habis: {simExpiredCount} Nomor</span>
            </div>
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-600">
              <Clock className="w-4 h-4" /><span>Segera Dijual (≤30 hari): {simCriticalCount} Nomor</span>
            </div>
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-600">
              <CheckCircle2 className="w-4 h-4" /><span>Aman: {simSafeCount} Nomor</span>
            </div>
            <button onClick={handlePrintSim} className="ml-auto px-3 py-1.5 bg-subtle hover:bg-card-hover border border-border-subtle rounded-lg flex items-center gap-1.5 text-text-secondary transition-all">
              <Printer className="w-3.5 h-3.5 text-primary" /> Cetak Laporan
            </button>
          </>
        ) : isElectronics && elTab === 'warranty' ? (
          <>
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-600">
              <AlertTriangle className="w-4 h-4" /><span>Garansi Habis: {wExpiredCt} Unit</span>
            </div>
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-600">
              <Clock className="w-4 h-4" /><span>Hampir Habis (≤90 hari): {wExpiringCt} Unit</span>
            </div>
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-600">
              <CheckCircle2 className="w-4 h-4" /><span>Total Dipantau: {serialsWithW.length} Unit</span>
            </div>
          </>
        ) : (
          <>
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-600">
              <AlertTriangle className="w-4 h-4" /><span>Kritis (H-7): {criticalCt} Batch</span>
            </div>
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-600">
              <Clock className="w-4 h-4" /><span>Peringatan (H-30): {warningCt} Batch</span>
            </div>
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-600">
              <CheckCircle2 className="w-4 h-4" /><span>Total: {batches.length} Batch</span>
            </div>
          </>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-4">

        {/* ======= ELECTRONICS: SIM TAB ======= */}
        {isElectronics && elTab === 'sim' && (
          <>
            <div className="flex flex-wrap items-center gap-3">
              <div className="relative flex-1 min-w-48 max-w-sm">
                <Search className="w-4 h-4 text-text-muted absolute left-3 top-1/2 -translate-y-1/2" />
                <input type="text" value={simSearch} onChange={e => setSimSearch(e.target.value)}
                  placeholder="Cari nomor MSISDN atau operator..."
                  className="w-full pl-9 pr-3 py-2 bg-card border border-border-strong rounded-lg text-xs text-text-primary focus:outline-none focus:border-primary" />
              </div>
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-[11px] font-semibold text-text-muted">Filter:</span>
                {['ALL', 'Telkomsel', 'Indosat Ooredoo IM3', 'XL Axiata', 'Axis', 'Smartfren', 'Tri (3)'].map(op => (
                  <button key={op} onClick={() => setSimProvFilter(op)}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all ${simProvFilter === op ? 'bg-primary text-primary-text' : 'bg-subtle text-text-muted hover:bg-card-hover border border-border-subtle'}`}
                  >{op === 'ALL' ? 'Semua' : op}</button>
                ))}
              </div>
            </div>

            <div id="sim-print-zone">
              <div className="hidden">
                <h2>Laporan Monitoring Masa Aktif Kartu Perdana</h2>
                <p className="sub">Dicetak: {new Date().toLocaleDateString('id-ID', { dateStyle: 'full' })} | Total aktif: {filteredSims.length} nomor</p>
              </div>
              <div className="bg-card border border-border-subtle rounded-xl overflow-hidden shadow-sm">
                <table className="w-full text-left text-xs">
                  <thead className="bg-subtle text-text-secondary font-semibold border-b border-border-subtle">
                    <tr>
                      <th className="py-3 px-4">Nomor MSISDN</th>
                      <th className="py-3 px-3">Operator</th>
                      <th className="py-3 px-3">Tier</th>
                      <th className="py-3 px-3 text-right">Harga Jual</th>
                      <th className="py-3 px-3">Batas Registrasi</th>
                      <th className="py-3 px-3 text-center">Status Waktu</th>
                      <th className="py-3 px-3 text-center">Prioritas</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border-subtle">
                    {filteredSims.length === 0 ? (
                      <tr><td colSpan={7} className="py-12 text-center text-text-muted">
                        <Signal className="w-8 h-8 mx-auto mb-2 opacity-30" />
                        Tidak ada kartu perdana aktif untuk dipantau.
                      </td></tr>
                    ) : filteredSims.map(s => {
                      const days = getDaysUntil(s.expiryDate);
                      const badge = getStatusBadge(days);
                      const opCls = OP_COLORS[s.provider] || 'bg-slate-500/10 text-slate-600 border-slate-500/20';
                      return (
                        <tr key={s.id} className={`transition-colors hover:bg-card-hover/40 ${days <= 0 ? 'bg-rose-500/5' : days <= 30 ? 'bg-amber-500/5' : ''}`}>
                          <td className="py-3 px-4 font-mono font-black text-sm text-text-primary tracking-wide">{s.msisdn}</td>
                          <td className="py-3 px-3">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${opCls}`}>{s.provider}</span>
                          </td>
                          <td className="py-3 px-3">
                            <span className="px-2 py-0.5 rounded bg-amber-500/10 text-amber-600 border border-amber-500/20 text-[10px] font-bold">{s.patternTier}</span>
                          </td>
                          <td className="py-3 px-3 text-right font-mono font-bold text-emerald-600">
                            Rp {s.sellPrice.toLocaleString('id-ID')}
                          </td>
                          <td className="py-3 px-3 font-mono text-text-secondary text-[11px]">
                            {new Date(s.expiryDate).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                          </td>
                          <td className="py-3 px-3 text-center">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${badge.cls}`}>{badge.label}</span>
                          </td>
                          <td className="py-3 px-3 text-center">
                            {days <= 0 ? <span className="text-[10px] font-bold text-rose-600">🗑 Hangus</span>
                              : days <= 30 ? <span className="text-[10px] font-bold text-amber-600 animate-pulse">⚠ Segera Jual!</span>
                              : <span className="text-[10px] text-emerald-600">✓ Aman</span>}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}

        {/* ======= ELECTRONICS: WARRANTY TAB ======= */}
        {isElectronics && elTab === 'warranty' && (
          <>
            <div className="flex flex-wrap items-center gap-3">
              <div className="relative flex-1 min-w-48 max-w-sm">
                <Search className="w-4 h-4 text-text-muted absolute left-3 top-1/2 -translate-y-1/2" />
                <input type="text" value={serialSearch} onChange={e => setSerialSearch(e.target.value)}
                  placeholder="Cari produk, IMEI, atau serial..."
                  className="w-full pl-9 pr-3 py-2 bg-card border border-border-strong rounded-lg text-xs text-text-primary focus:outline-none focus:border-primary" />
              </div>
              <div className="flex items-center gap-1.5">
                {([{ k: 'ALL', l: 'Semua' }, { k: 'expiring', l: 'Hampir Habis (≤90 hr)' }, { k: 'expired', l: 'Sudah Habis' }] as const).map(f => (
                  <button key={f.k} onClick={() => setWarrantyFilter(f.k as any)}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all ${warrantyFilter === f.k ? 'bg-primary text-primary-text' : 'bg-subtle text-text-muted hover:bg-card-hover border border-border-subtle'}`}
                  >{f.l}</button>
                ))}
              </div>
            </div>

            <div className="bg-card border border-border-subtle rounded-xl overflow-hidden shadow-sm">
              <table className="w-full text-left text-xs">
                <thead className="bg-subtle text-text-secondary font-semibold border-b border-border-subtle">
                  <tr>
                    <th className="py-3 px-4">Produk & IMEI/Serial</th>
                    <th className="py-3 px-3">Supplier / Distributor</th>
                    <th className="py-3 px-3">Invoice Pembelian</th>
                    <th className="py-3 px-3">Batas Garansi Distributor</th>
                    <th className="py-3 px-3 text-center">Status Garansi</th>
                    <th className="py-3 px-3 text-center">Status Unit</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border-subtle">
                  {filteredSerials.length === 0 ? (
                    <tr><td colSpan={6} className="py-12 text-center text-text-muted">
                      <ShieldCheck className="w-8 h-8 mx-auto mb-2 opacity-30" />
                      {serialsWithW.length === 0 ? 'Belum ada data IMEI dengan garansi distributor.' : 'Tidak ada hasil untuk filter ini.'}
                    </td></tr>
                  ) : filteredSerials.map(s => {
                    const days = getDaysUntil(s.warrantyEndDate!);
                    const badge = getStatusBadge(days);
                    const isSold = s.status === 'Sold';
                    const isInStock = s.status === 'Available';
                    return (
                      <tr key={s.id} className={`transition-colors hover:bg-card-hover/40 ${days <= 0 ? 'bg-rose-500/5' : days <= 90 ? 'bg-amber-500/5' : ''}`}>
                        <td className="py-3 px-4">
                          <div className="font-bold text-text-primary">{s.productName}</div>
                          <div className="text-[10px] text-text-muted font-mono">{s.serialNo}</div>
                        </td>
                        <td className="py-3 px-3 text-text-secondary text-[11px]">{s.supplierName || '-'}</td>
                        <td className="py-3 px-3 font-mono text-text-secondary text-[11px]">
                          {s.purchaseInvoiceNumber || '-'}
                        </td>
                        <td className="py-3 px-3 font-mono text-text-secondary text-[11px]">
                          {new Date(s.warrantyEndDate!).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
                        </td>
                        <td className="py-3 px-3 text-center">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${badge.cls}`}>{badge.label}</span>
                        </td>
                        <td className="py-3 px-3 text-center">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${isSold ? 'bg-slate-500/10 text-slate-600 border-slate-500/20' : isInStock ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20' : 'bg-amber-500/10 text-amber-600 border-amber-500/20'}`}>
                            {isSold ? 'Terjual' : isInStock ? 'Stok' : 'Servis'}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}

        {/* ======= RETAIL: BATCH TABLE ======= */}
        {!isElectronics && (
          <>
            <div className="relative max-w-md">
              <Search className="w-4 h-4 text-text-muted absolute left-3 top-1/2 -translate-y-1/2" />
              <input type="text" value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                placeholder="Cari nomor batch / nama produk..."
                className="w-full pl-9 pr-3 py-2 bg-card border border-border-strong rounded-lg text-xs text-text-primary focus:outline-none focus:border-primary" />
            </div>
            <div className="bg-card border border-border-subtle rounded-2xl overflow-hidden shadow-sm">
              <table className="w-full text-xs text-left">
                <thead className="bg-subtle text-text-secondary border-b border-border-subtle font-semibold">
                  <tr>
                    <th className="py-3 px-4">Nama Produk & SKU</th>
                    <th className="py-3 px-3">Nomor Batch</th>
                    <th className="py-3 px-3">Tgl Kadaluarsa</th>
                    <th className="py-3 px-3">Status FEFO</th>
                    <th className="py-3 px-3 text-center">Sisa Stok</th>
                    <th className="py-3 px-4">Catatan</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border-subtle">
                  {filteredBatches.map(batch => {
                    const days = getDaysUntil(batch.expiredDate);
                    const badge = getStatusBadge(days);
                    return (
                      <tr key={batch.id} className="hover:bg-subtle/50 transition-colors">
                        <td className="py-3 px-4"><p className="font-bold text-text-primary">{batch.productName}</p><p className="text-[10px] text-text-muted font-mono">{batch.sku}</p></td>
                        <td className="py-3 px-3 font-mono font-bold text-primary">{batch.batchNumber}</td>
                        <td className="py-3 px-3 font-mono font-semibold">{new Date(batch.expiredDate).toLocaleDateString('id-ID', { year: 'numeric', month: 'long', day: 'numeric' })}</td>
                        <td className="py-3 px-3"><span className={`px-2 py-0.5 rounded text-[10px] font-bold ${badge.cls}`}>{badge.label}</span></td>
                        <td className="py-3 px-3 text-center font-mono font-bold">{batch.currentStock} Unit</td>
                        <td className="py-3 px-4 text-text-secondary text-[11px]">{batch.notes || '-'}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>

      {/* MODAL: ADD BATCH (Retail) */}
      {isAddBatchOpen && (
        <div className="fixed inset-0 z-50 bg-black/75 flex items-center justify-center p-4">
          <form onSubmit={handleCreateBatch} className="bg-surface border border-border-strong w-full max-w-md rounded-2xl p-5 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold text-text-primary flex items-center gap-2">
                <Package className="w-5 h-5 text-primary" /> Catat Batch & Expired Date Baru
              </h2>
              <button type="button" onClick={() => setIsAddBatchOpen(false)} className="text-text-muted hover:text-text-primary"><X className="w-5 h-5" /></button>
            </div>
            <div>
              <label className="block text-xs font-semibold text-text-secondary mb-1">Pilih Produk *</label>
              <select required value={selectedProductId} onChange={e => setSelectedProductId(e.target.value)}
                className="w-full px-3 py-2 bg-subtle border border-border-strong rounded-lg text-xs text-text-primary focus:outline-none focus:border-primary">
                <option value="">-- Pilih Produk --</option>
                {products.map(p => <option key={p.id} value={p.id}>{p.name} ({p.sku})</option>)}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-text-secondary mb-1">Nomor Batch *</label>
                <input type="text" required value={batchNo} onChange={e => setBatchNo(e.target.value)} placeholder="BATCH-2026-08"
                  className="w-full px-3 py-2 bg-subtle border border-border-strong rounded-lg text-xs font-mono text-text-primary focus:outline-none focus:border-primary" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-text-secondary mb-1">Jumlah Stok *</label>
                <input type="number" required value={stockQty} onChange={e => setStockQty(e.target.value)}
                  className="w-full px-3 py-2 bg-subtle border border-border-strong rounded-lg text-xs font-mono text-text-primary focus:outline-none focus:border-primary" />
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-text-secondary mb-1">Tanggal Kadaluarsa *</label>
              <input type="date" required value={expDate} onChange={e => setExpDate(e.target.value)}
                className="w-full px-3 py-2 bg-subtle border border-border-strong rounded-lg text-xs font-mono text-text-primary focus:outline-none focus:border-primary" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-text-secondary mb-1">Catatan Tambahan</label>
              <input type="text" value={notes} onChange={e => setNotes(e.target.value)} placeholder="Misal: Batch kiriman distributor pagi"
                className="w-full px-3 py-2 bg-subtle border border-border-strong rounded-lg text-xs text-text-primary focus:outline-none focus:border-primary" />
            </div>
            <div className="flex gap-2 pt-2 border-t border-border-subtle">
              <button type="button" onClick={() => setIsAddBatchOpen(false)} className="flex-1 py-2 bg-subtle hover:bg-card-hover border border-border-subtle rounded-lg text-xs font-semibold">Batal</button>
              <button type="submit" className="flex-1 py-2 bg-primary hover:bg-primary-hover text-primary-text rounded-lg text-xs font-bold shadow-sm">Simpan Batch</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

export default ExpiredTrackerPage;
