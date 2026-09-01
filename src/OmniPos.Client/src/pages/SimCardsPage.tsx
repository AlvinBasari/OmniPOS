import React, { useState, useEffect } from 'react';
import { 
  Radio, 
  Search, 
  Plus, 
  Upload, 
  Bookmark, 
  Download, 
  Filter,
  CheckCircle2,
  Clock,
  Sparkles
} from 'lucide-react';
import { SimCardSpecialNumber } from '../types';
import { useToastStore } from '../store/useToastStore';

export const SimCardsPage: React.FC = () => {
  const [simCards, setSimCards] = useState<SimCardSpecialNumber[]>([]);
  const [isLoadingSimCards, setIsLoadingSimCards] = useState(false);
  const [simSearchQuery, setSimSearchQuery] = useState('');
  const [simProviderFilter, setSimProviderFilter] = useState('ALL');
  const [simTierFilter, setSimTierFilter] = useState('ALL');
  const [simStatusFilter, setSimStatusFilter] = useState('ALL');
  const [isAddSimModalOpen, setIsAddSimModalOpen] = useState(false);
  const [isBatchImportSimModalOpen, setIsBatchImportSimModalOpen] = useState(false);

  // Single SIM Form State
  const [simMsisdn, setSimMsisdn] = useState('');
  const [simProvider, setSimProvider] = useState('Telkomsel');
  const [simPatternTier, setSimPatternTier] = useState('Panca Super');
  const [simIccid, setSimIccid] = useState('');
  const [simQuota, setSimQuota] = useState('15GB');
  const [simBalance, setSimBalance] = useState('10000');
  const [simExpiryDate, setSimExpiryDate] = useState('');
  const [simBuyPrice, setSimBuyPrice] = useState('100000');
  const [simSellPrice, setSimSellPrice] = useState('500000');
  const [simNotes, setSimNotes] = useState('Segel Pabrik');

  // Batch Import SIM State
  const [batchSimText, setBatchSimText] = useState('');
  const [batchSimProvider, setBatchSimProvider] = useState('Telkomsel');
  const [batchSimTier, setBatchSimTier] = useState('Reguler Cantik');
  const [batchSimQuota, setBatchSimQuota] = useState('10GB');
  const [batchSimBuyPrice, setBatchSimBuyPrice] = useState('25000');
  const [batchSimSellPrice, setBatchSimSellPrice] = useState('50000');

  useEffect(() => {
    fetchSimCards();
  }, []);

  const fetchSimCards = async () => {
    try {
      setIsLoadingSimCards(true);
      const res = await fetch('/api/v1/electronics/sim-cards');
      if (res.ok) setSimCards(await res.json());
    } catch {}
    finally { setIsLoadingSimCards(false); }
  };

  const handleCreateSimCard = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!simMsisdn.trim()) {
      useToastStore.getState().showToast('Nomor HP/MSISDN wajib diisi.', 'warning');
      return;
    }

    try {
      const payload = {
        msisdn: simMsisdn.trim(),
        provider: simProvider,
        patternTier: simPatternTier,
        iccid: simIccid.trim() || undefined,
        defaultQuotaGb: simQuota.trim() || undefined,
        mainBalance: parseFloat(simBalance) || 0,
        expiryDate: simExpiryDate ? new Date(simExpiryDate).toISOString() : undefined,
        buyPrice: parseFloat(simBuyPrice) || 0,
        sellPrice: parseFloat(simSellPrice) || 0,
        notes: simNotes.trim() || undefined
      };

      const res = await fetch('/api/v1/electronics/sim-cards', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        useToastStore.getState().showToast(`Nomor ${simMsisdn} berhasil didaftarkan!`, 'success');
        setIsAddSimModalOpen(false);
        setSimMsisdn('');
        setSimIccid('');
        fetchSimCards();
      }
    } catch {
      useToastStore.getState().showToast('Gagal menambahkan nomor perdana.', 'error');
    }
  };

  const handleBatchImportSimCards = async (e: React.FormEvent) => {
    e.preventDefault();
    const lines = batchSimText.split(/[\n,;]+/).map(s => s.trim()).filter(Boolean);
    if (lines.length === 0) {
      useToastStore.getState().showToast('Masukkan minimal satu nomor MSISDN.', 'warning');
      return;
    }

    try {
      const items = lines.map(num => ({
        msisdn: num,
        provider: batchSimProvider,
        patternTier: batchSimTier,
        defaultQuotaGb: batchSimQuota,
        mainBalance: 0,
        buyPrice: parseFloat(batchSimBuyPrice) || 0,
        sellPrice: parseFloat(batchSimSellPrice) || 0,
        notes: 'Impor Massal'
      }));

      const res = await fetch('/api/v1/electronics/sim-cards/batch-import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items })
      });

      if (res.ok) {
        const data = await res.json();
        useToastStore.getState().showToast(data.message || 'Impor nomor perdana berhasil!', 'success');
        setIsBatchImportSimModalOpen(false);
        setBatchSimText('');
        fetchSimCards();
      }
    } catch {
      useToastStore.getState().showToast('Gagal impor nomor massal.', 'error');
    }
  };

  const handleReserveSim = async (sim: SimCardSpecialNumber) => {
    const cust = prompt(`Masukkan Nama Pelanggan yang Membooking Nomor ${sim.msisdn}:`);
    if (!cust) return;

    try {
      const res = await fetch(`/api/v1/electronics/sim-cards/${sim.id}/reserve`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerName: cust.trim(),
          customerPhone: '',
          notes: 'Booking Kasir'
        })
      });

      if (res.ok) {
        useToastStore.getState().showToast(`Nomor ${sim.msisdn} berhasil di-booking!`, 'success');
        fetchSimCards();
      }
    } catch {
      useToastStore.getState().showToast('Gagal membooking nomor.', 'error');
    }
  };

  const exportSimCardsToCsv = () => {
    if (simCards.length === 0) {
      useToastStore.getState().showToast('Tidak ada data nomor cantik untuk diekspor.', 'warning');
      return;
    }
    const headers = ['ID', 'MSISDN', 'Operator', 'Pola Tier', 'ICCID', 'Kuota Default', 'Pulsa Utama', 'Harga Modal', 'Harga Jual', 'Batas Registrasi', 'Status'];
    const rows = simCards.map(s => [
      s.id,
      `"${s.msisdn}"`,
      `"${s.provider}"`,
      `"${s.patternTier}"`,
      `"${s.iccid || ''}"`,
      `"${s.defaultQuotaGb || ''}"`,
      s.mainBalance || 0,
      s.buyPrice || 0,
      s.sellPrice || 0,
      s.expiryDate ? new Date(s.expiryDate).toLocaleDateString('id-ID') : '',
      s.status
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `stok_nomor_cantik_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    useToastStore.getState().showToast('Ekspor CSV Stok Nomor Cantik berhasil diunduh!', 'success');
  };

  const filteredSimCards = simCards.filter(s => {
    const matchQuery = s.msisdn.toLowerCase().includes(simSearchQuery.toLowerCase()) ||
                       (s.iccid && s.iccid.toLowerCase().includes(simSearchQuery.toLowerCase())) ||
                       s.provider.toLowerCase().includes(simSearchQuery.toLowerCase()) ||
                       s.patternTier.toLowerCase().includes(simSearchQuery.toLowerCase());
    const matchProvider = simProviderFilter === 'ALL' || s.provider.toLowerCase().includes(simProviderFilter.toLowerCase());
    const matchTier = simTierFilter === 'ALL' || s.patternTier.toLowerCase() === simTierFilter.toLowerCase();
    const matchStatus = simStatusFilter === 'ALL' || String(s.status) === simStatusFilter;
    return matchQuery && matchProvider && matchTier && matchStatus;
  });

  return (
    <div className="flex-1 flex flex-col bg-app overflow-hidden select-none">
      {/* Dedicated Header for SIM Cards & Special Numbers */}
      <div className="p-4 bg-surface border-b border-border-subtle flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-500/10 text-indigo-600 flex items-center justify-center font-bold">
            <Radio className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-base font-bold text-text-primary flex items-center gap-2">
              Katalog Kartu SIM & Stok Nomor Cantik
            </h1>
            <p className="text-xs text-text-secondary">
              Manajemen nomor perdana VIP, pencarian pola kuartet/panca, booking pelanggan & registrasi operator
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={exportSimCardsToCsv}
            className="px-3 py-1.5 bg-subtle hover:bg-subtle/80 text-text-primary border border-border-subtle rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-xs transition-all"
            title="Unduh seluruh database kartu SIM ke format CSV Excel"
          >
            <Download className="w-4 h-4 text-emerald-600" />
            <span>Ekspor CSV</span>
          </button>
          <button
            onClick={() => setIsBatchImportSimModalOpen(true)}
            className="px-3 py-1.5 bg-subtle hover:bg-subtle/80 text-text-primary border border-border-subtle rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-xs transition-all"
          >
            <Upload className="w-4 h-4 text-primary" />
            <span>Impor Massal</span>
          </button>
          <button
            onClick={() => setIsAddSimModalOpen(true)}
            className="px-3.5 py-1.5 bg-primary hover:bg-primary-hover text-primary-text rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>Tambah Nomor Cantik</span>
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-5 space-y-4">
        {/* Filters & Metrics Bar */}
        <div className="p-3 bg-surface border border-border-subtle rounded-xl flex flex-wrap items-center justify-between gap-3 shadow-xs">
          <div className="flex items-center gap-2 flex-1 min-w-[280px]">
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
              <input
                type="text"
                placeholder="Cari digit nomor (misal: 8888, 7777), ICCID, atau operator..."
                value={simSearchQuery}
                onChange={(e) => setSimSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 bg-card border border-border-subtle rounded-lg text-xs text-text-primary font-mono focus:border-primary focus:outline-hidden"
              />
            </div>

            <select
              value={simProviderFilter}
              onChange={(e) => setSimProviderFilter(e.target.value)}
              className="px-3 py-1.5 bg-card border border-border-subtle rounded-lg text-xs text-text-primary font-semibold focus:border-primary focus:outline-hidden"
            >
              <option value="ALL">Semua Operator</option>
              <option value="Telkomsel">Telkomsel</option>
              <option value="Indosat Ooredoo IM3">Indosat IM3</option>
              <option value="XL Axiata">XL Axiata</option>
              <option value="Axis">Axis</option>
              <option value="Tri (3)">Tri (3)</option>
              <option value="Smartfren">Smartfren</option>
            </select>

            <select
              value={simTierFilter}
              onChange={(e) => setSimTierFilter(e.target.value)}
              className="px-3 py-1.5 bg-card border border-border-subtle rounded-lg text-xs text-text-primary font-semibold focus:border-primary focus:outline-hidden"
            >
              <option value="ALL">Semua Pola Tier</option>
              <option value="Panca Super">Panca Super (5 Kembar)</option>
              <option value="Kwartet Super">Kwartet Super (4 Kembar)</option>
              <option value="Triplet Emas">Triplet Emas (3 Kembar)</option>
              <option value="Urut Tangga">Urut Tangga (1234)</option>
              <option value="Cermin Kaca">Cermin Kaca (ABBA)</option>
              <option value="Reguler Cantik">Reguler Cantik</option>
            </select>

            <select
              value={simStatusFilter}
              onChange={(e) => setSimStatusFilter(e.target.value)}
              className="px-3 py-1.5 bg-card border border-border-subtle rounded-lg text-xs text-text-primary font-semibold focus:border-primary focus:outline-hidden"
            >
              <option value="ALL">Semua Status</option>
              <option value="InStock">Tersedia (Ready)</option>
              <option value="Reserved">Dibooking Pelanggan</option>
              <option value="Sold">Sudah Terjual</option>
            </select>
          </div>

          <div className="flex items-center gap-3 text-xs font-semibold text-text-secondary">
            <span>Total: <strong className="text-text-primary font-mono">{filteredSimCards.length}</strong> nomor</span>
            <span>•</span>
            <span className="text-emerald-600">Ready: <strong className="font-mono">{filteredSimCards.filter(s => String(s.status) === 'InStock' || String(s.status) === '0').length}</strong></span>
            <span>•</span>
            <span className="text-amber-600">Booking: <strong className="font-mono">{filteredSimCards.filter(s => String(s.status) === 'Reserved' || String(s.status) === '1').length}</strong></span>
          </div>
        </div>

        {/* SIM Cards Table */}
        <div className="bg-card border border-border-subtle rounded-xl overflow-hidden shadow-xs">
          <table className="w-full text-left text-xs">
            <thead className="bg-subtle text-text-secondary font-semibold border-b border-border-subtle">
              <tr>
                <th className="p-3">Nomor Perdana (MSISDN)</th>
                <th className="p-3">Operator</th>
                <th className="p-3">Pola Tier</th>
                <th className="p-3">Kuota / Pulsa</th>
                <th className="p-3">ICCID & Barcode</th>
                <th className="p-3 text-right">Harga Jual</th>
                <th className="p-3 text-center">Status</th>
                <th className="p-3 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-subtle">
              {isLoadingSimCards ? (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-text-muted">
                    Memuat katalog nomor cantik...
                  </td>
                </tr>
              ) : filteredSimCards.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-text-muted">
                    Tidak ditemukan nomor cantik yang sesuai dengan filter.
                  </td>
                </tr>
              ) : (
                filteredSimCards.map((s) => {
                  const isSold = String(s.status) === 'Sold' || String(s.status) === '2';
                  const isReserved = String(s.status) === 'Reserved' || String(s.status) === '1';

                  let providerBadge = 'bg-slate-500/10 text-slate-600 border-slate-500/20';
                  if (s.provider.toLowerCase().includes('telkomsel')) providerBadge = 'bg-red-500/10 text-red-600 border-red-500/20';
                  else if (s.provider.toLowerCase().includes('indosat')) providerBadge = 'bg-amber-500/10 text-amber-600 border-amber-500/20';
                  else if (s.provider.toLowerCase().includes('xl')) providerBadge = 'bg-blue-500/10 text-blue-600 border-blue-500/20';
                  else if (s.provider.toLowerCase().includes('axis')) providerBadge = 'bg-purple-500/10 text-purple-600 border-purple-500/20';
                  else if (s.provider.toLowerCase().includes('tri')) providerBadge = 'bg-orange-500/10 text-orange-600 border-orange-500/20';
                  else if (s.provider.toLowerCase().includes('smartfren')) providerBadge = 'bg-pink-500/10 text-pink-600 border-pink-500/20';

                  return (
                    <tr key={s.id} className="hover:bg-subtle/50 transition-colors">
                      <td className="p-3">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-sm font-extrabold text-text-primary tracking-wider">
                            {s.msisdn}
                          </span>
                          {s.patternTier.includes('Super') && (
                            <Sparkles className="w-3.5 h-3.5 text-amber-500 animate-pulse" />
                          )}
                        </div>
                      </td>

                      <td className="p-3">
                        <span className={`px-2 py-0.5 rounded text-[11px] font-bold border ${providerBadge}`}>
                          {s.provider}
                        </span>
                      </td>

                      <td className="p-3">
                        <span className="px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-600 border border-indigo-500/20 text-[11px] font-bold">
                          {s.patternTier}
                        </span>
                      </td>

                      <td className="p-3 text-text-secondary">
                        <div className="font-semibold text-text-primary">{s.defaultQuotaGb || '-'}</div>
                        <div className="text-[10px] text-text-muted font-mono">Pulsa: Rp {(s.mainBalance || 0).toLocaleString('id-ID')}</div>
                      </td>

                      <td className="p-3 text-text-secondary font-mono text-[11px]">
                        {s.iccid || '-'}
                      </td>

                      <td className="p-3 text-right font-mono font-bold text-sm text-text-primary">
                        Rp {s.sellPrice.toLocaleString('id-ID')}
                      </td>

                      <td className="p-3 text-center">
                        {isSold ? (
                          <span className="px-2 py-0.5 rounded-full bg-slate-500/10 text-slate-600 text-[10px] font-bold">
                            Terjual
                          </span>
                        ) : isReserved ? (
                          <span className="px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-600 text-[10px] font-bold">
                            Dibooking ({s.customerName || 'Pelanggan'})
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 text-[10px] font-bold">
                            Tersedia
                          </span>
                        )}
                      </td>

                      <td className="p-3 text-center">
                        {!isSold && !isReserved && (
                          <button
                            onClick={() => handleReserveSim(s)}
                            className="px-2.5 py-1 rounded-lg bg-subtle hover:bg-amber-500/10 text-text-secondary hover:text-amber-600 border border-border-subtle text-[11px] font-bold flex items-center gap-1 mx-auto transition-all"
                          >
                            <Bookmark className="w-3 h-3" />
                            <span>Booking</span>
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Single Add SIM Card */}
      {isAddSimModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-100">
          <div className="bg-surface border border-border-strong rounded-2xl w-full max-w-lg shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-border-subtle pb-3">
              <h2 className="text-sm font-bold text-text-primary flex items-center gap-2">
                <Plus className="w-4 h-4 text-primary" />
                Tambah Stok Nomor Cantik / Perdana
              </h2>
              <button
                onClick={() => setIsAddSimModalOpen(false)}
                className="text-text-muted hover:text-text-primary text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateSimCard} className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-text-secondary font-bold mb-1">Nomor HP (MSISDN) *</label>
                  <input
                    type="text"
                    required
                    placeholder="0812-8888-9999"
                    value={simMsisdn}
                    onChange={(e) => setSimMsisdn(e.target.value)}
                    className="w-full px-3 py-2 bg-card border border-border-subtle rounded-lg text-text-primary font-mono text-sm font-bold focus:border-primary focus:outline-hidden"
                  />
                </div>
                <div>
                  <label className="block text-text-secondary font-bold mb-1">Operator Seluler</label>
                  <select
                    value={simProvider}
                    onChange={(e) => setSimProvider(e.target.value)}
                    className="w-full px-3 py-2 bg-card border border-border-subtle rounded-lg text-text-primary font-bold focus:border-primary focus:outline-hidden"
                  >
                    <option value="Telkomsel">Telkomsel</option>
                    <option value="Indosat Ooredoo IM3">Indosat Ooredoo IM3</option>
                    <option value="XL Axiata">XL Axiata</option>
                    <option value="Axis">Axis</option>
                    <option value="Tri (3)">Tri (3)</option>
                    <option value="Smartfren">Smartfren</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-text-secondary font-bold mb-1">Pola Cantik / Tier</label>
                  <select
                    value={simPatternTier}
                    onChange={(e) => setSimPatternTier(e.target.value)}
                    className="w-full px-3 py-2 bg-card border border-border-subtle rounded-lg text-text-primary font-bold focus:border-primary focus:outline-hidden"
                  >
                    <option value="Panca Super">Panca Super (5 Digit Kembar)</option>
                    <option value="Kwartet Super">Kwartet Super (4 Digit Kembar)</option>
                    <option value="Triplet Emas">Triplet Emas (3 Digit Kembar)</option>
                    <option value="Urut Tangga">Urut Tangga (1234/4321)</option>
                    <option value="Cermin Kaca">Cermin Kaca (ABBA/BAAB)</option>
                    <option value="Reguler Cantik">Reguler Cantik</option>
                  </select>
                </div>
                <div>
                  <label className="block text-text-secondary font-bold mb-1">Nomor Seri ICCID (Chip)</label>
                  <input
                    type="text"
                    placeholder="8962..."
                    value={simIccid}
                    onChange={(e) => setSimIccid(e.target.value)}
                    className="w-full px-3 py-2 bg-card border border-border-subtle rounded-lg text-text-primary font-mono focus:border-primary focus:outline-hidden"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-text-secondary font-bold mb-1">Bawaan Kuota Data</label>
                  <input
                    type="text"
                    placeholder="Contoh: 15GB / 30 Hari"
                    value={simQuota}
                    onChange={(e) => setSimQuota(e.target.value)}
                    className="w-full px-3 py-2 bg-card border border-border-subtle rounded-lg text-text-primary focus:border-primary focus:outline-hidden"
                  />
                </div>
                <div>
                  <label className="block text-text-secondary font-bold mb-1">Pulsa Utama (Rp)</label>
                  <input
                    type="number"
                    value={simBalance}
                    onChange={(e) => setSimBalance(e.target.value)}
                    className="w-full px-3 py-2 bg-card border border-border-subtle rounded-lg text-text-primary font-mono focus:border-primary focus:outline-hidden"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-text-secondary font-bold mb-1">Harga Modal Beli (Rp)</label>
                  <input
                    type="number"
                    value={simBuyPrice}
                    onChange={(e) => setSimBuyPrice(e.target.value)}
                    className="w-full px-3 py-2 bg-card border border-border-subtle rounded-lg text-text-primary font-mono font-bold focus:border-primary focus:outline-hidden"
                  />
                </div>
                <div>
                  <label className="block text-text-secondary font-bold mb-1">Harga Jual Khusus (Rp) *</label>
                  <input
                    type="number"
                    required
                    value={simSellPrice}
                    onChange={(e) => setSimSellPrice(e.target.value)}
                    className="w-full px-3 py-2 bg-card border border-primary/40 rounded-lg text-text-primary font-mono font-black text-sm text-primary focus:border-primary focus:outline-hidden"
                  />
                </div>
              </div>

              <div>
                <label className="block text-text-secondary font-bold mb-1">Catatan Tambahan</label>
                <input
                  type="text"
                  placeholder="Segel pabrik, kartu perdana aktif, dsb."
                  value={simNotes}
                  onChange={(e) => setSimNotes(e.target.value)}
                  className="w-full px-3 py-2 bg-card border border-border-subtle rounded-lg text-text-primary focus:border-primary focus:outline-hidden"
                />
              </div>

              <div className="pt-3 flex justify-end gap-2 border-t border-border-subtle">
                <button
                  type="button"
                  onClick={() => setIsAddSimModalOpen(false)}
                  className="px-4 py-2 rounded-lg bg-subtle hover:bg-subtle/80 text-text-primary font-bold"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-lg bg-primary hover:bg-primary-hover text-primary-text font-bold shadow-sm"
                >
                  Simpan Nomor Cantik
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Batch Import SIM Cards */}
      {isBatchImportSimModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-100">
          <div className="bg-surface border border-border-strong rounded-2xl w-full max-w-lg shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-border-subtle pb-3">
              <h2 className="text-sm font-bold text-text-primary flex items-center gap-2">
                <Upload className="w-4 h-4 text-primary" />
                Impor Massal Kartu Perdana & Nomor Cantik
              </h2>
              <button
                onClick={() => setIsBatchImportSimModalOpen(false)}
                className="text-text-muted hover:text-text-primary text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleBatchImportSimCards} className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-text-secondary font-bold mb-1">Operator</label>
                  <select
                    value={batchSimProvider}
                    onChange={(e) => setBatchSimProvider(e.target.value)}
                    className="w-full px-3 py-2 bg-card border border-border-subtle rounded-lg text-text-primary font-bold focus:border-primary focus:outline-hidden"
                  >
                    <option value="Telkomsel">Telkomsel</option>
                    <option value="Indosat Ooredoo IM3">Indosat Ooredoo IM3</option>
                    <option value="XL Axiata">XL Axiata</option>
                    <option value="Axis">Axis</option>
                    <option value="Tri (3)">Tri (3)</option>
                    <option value="Smartfren">Smartfren</option>
                  </select>
                </div>
                <div>
                  <label className="block text-text-secondary font-bold mb-1">Pola Tier</label>
                  <select
                    value={batchSimTier}
                    onChange={(e) => setBatchSimTier(e.target.value)}
                    className="w-full px-3 py-2 bg-card border border-border-subtle rounded-lg text-text-primary font-bold focus:border-primary focus:outline-hidden"
                  >
                    <option value="Panca Super">Panca Super (5 Digit Kembar)</option>
                    <option value="Kwartet Super">Kwartet Super (4 Digit Kembar)</option>
                    <option value="Triplet Emas">Triplet Emas (3 Digit Kembar)</option>
                    <option value="Urut Tangga">Urut Tangga (1234/4321)</option>
                    <option value="Cermin Kaca">Cermin Kaca (ABBA/BAAB)</option>
                    <option value="Reguler Cantik">Reguler Cantik</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-text-secondary font-bold mb-1">Kuota</label>
                  <input
                    type="text"
                    value={batchSimQuota}
                    onChange={(e) => setBatchSimQuota(e.target.value)}
                    className="w-full px-3 py-2 bg-card border border-border-subtle rounded-lg text-text-primary focus:border-primary focus:outline-hidden"
                  />
                </div>
                <div>
                  <label className="block text-text-secondary font-bold mb-1">Modal (Rp)</label>
                  <input
                    type="number"
                    value={batchSimBuyPrice}
                    onChange={(e) => setBatchSimBuyPrice(e.target.value)}
                    className="w-full px-3 py-2 bg-card border border-border-subtle rounded-lg text-text-primary font-mono focus:border-primary focus:outline-hidden"
                  />
                </div>
                <div>
                  <label className="block text-text-secondary font-bold mb-1">Jual (Rp)</label>
                  <input
                    type="number"
                    value={batchSimSellPrice}
                    onChange={(e) => setBatchSimSellPrice(e.target.value)}
                    className="w-full px-3 py-2 bg-card border border-border-subtle rounded-lg text-text-primary font-mono font-bold focus:border-primary focus:outline-hidden"
                  />
                </div>
              </div>

              <div>
                <label className="block text-text-secondary font-bold mb-1">
                  Daftar Nomor MSISDN (1 baris / koma per nomor):
                </label>
                <textarea
                  rows={6}
                  required
                  placeholder="081288881111&#10;081288882222&#10;081288883333"
                  value={batchSimText}
                  onChange={(e) => setBatchSimText(e.target.value)}
                  className="w-full p-3 bg-card border border-border-subtle rounded-lg text-text-primary font-mono text-xs focus:border-primary focus:outline-hidden leading-relaxed"
                />
              </div>

              <div className="pt-3 flex justify-end gap-2 border-t border-border-subtle">
                <button
                  type="button"
                  onClick={() => setIsBatchImportSimModalOpen(false)}
                  className="px-4 py-2 rounded-lg bg-subtle hover:bg-subtle/80 text-text-primary font-bold"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-lg bg-primary hover:bg-primary-hover text-primary-text font-bold shadow-sm"
                >
                  Impor Sekarang
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
