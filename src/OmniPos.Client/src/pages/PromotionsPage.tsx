import React, { useState, useEffect } from 'react';
import { 
  Gift, 
  Plus, 
  Sparkles, 
  Clock, 
  Trash2, 
  CheckCircle2, 
  Layers, 
  Percent,
  Calendar,
  ToggleLeft,
  ToggleRight,
  AlertCircle,
  Search
} from 'lucide-react';
import { PromotionRule, Product } from '../types';
import { useToastStore } from '../store/useToastStore';
import { useBusinessModeStore } from '../store/useBusinessModeStore';

export const PromotionsPage: React.FC = () => {
  const { mode } = useBusinessModeStore();
  const [promotions, setPromotions] = useState<PromotionRule[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  // New Promo Form
  const [name, setName] = useState('');
  const [promoType, setPromoType] = useState<any>('BuyXGetY');
  const [buyProductId, setBuyProductId] = useState('');
  const [buyQty, setBuyQty] = useState(2);
  const [getFreeProductId, setGetFreeProductId] = useState('');
  const [getFreeQty, setGetFreeQty] = useState(1);
  const [discountPercent, setDiscountPercent] = useState(10);
  const [bundlePrice, setBundlePrice] = useState('100000');
  const [description, setDescription] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [searchPromo, setSearchPromo] = useState('');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [pRes, prodRes] = await Promise.all([
        fetch('/api/v1/promotions'),
        fetch('/api/v1/products')
      ]);
      if (pRes.ok) setPromotions(await pRes.json());
      if (prodRes.ok) setProducts(await prodRes.json());
    } catch {}
  };

  const handleCreatePromo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const buyProd = products.find(p => p.id === buyProductId);
    const freeProd = products.find(p => p.id === getFreeProductId);

    const payload = {
      name: name.trim(),
      promoType,
      buyProductId: buyProd?.id,
      buyProductName: buyProd?.name,
      buyQuantityRequired: buyQty,
      getFreeProductId: freeProd?.id,
      getFreeProductName: freeProd?.name,
      getFreeQuantity: getFreeQty,
      discountPercent,
      bundleSpecialPrice: parseFloat(bundlePrice) || 0,
      description: description.trim(),
      isActive: true
    };

    try {
      const res = await fetch('/api/v1/promotions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        useToastStore.getState().showToast('Aturan promo baru berhasil dibuat!', 'success');
        setIsAddModalOpen(false);
        setName('');
        setDescription('');
        fetchData();
      }
    } catch {
      useToastStore.getState().showToast('Gagal menyimpan aturan promo.', 'error');
    }
  };

  const handleDeletePromo = async (id: string, name: string) => {
    if (!window.confirm(`Hapus promo "${name}"? Tindakan ini tidak dapat dibatalkan.`)) return;
    try {
      const res = await fetch(`/api/v1/promotions/${id}`, { method: 'DELETE' });
      if (res.ok) {
        useToastStore.getState().showToast(`Promo "${name}" berhasil dihapus.`, 'info');
        fetchData();
      }
    } catch {}
  };

  const handleTogglePromo = async (id: string, currentStatus: boolean) => {
    try {
      const res = await fetch(`/api/v1/promotions/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !currentStatus })
      });
      if (res.ok) {
        useToastStore.getState().showToast(`Promo berhasil ${!currentStatus ? 'diaktifkan' : 'dinonaktifkan'}!`, 'success');
        fetchData();
      } else {
        // Fallback: optimistic toggle locally
        setPromotions(prev => prev.map(p => p.id === id ? { ...p, isActive: !currentStatus } : p));
        useToastStore.getState().showToast(`Promo ${!currentStatus ? 'diaktifkan' : 'dinonaktifkan'} (lokal).`, 'info');
      }
    } catch {
      setPromotions(prev => prev.map(p => p.id === id ? { ...p, isActive: !currentStatus } : p));
    }
  };

  const now = new Date();
  const filteredPromos = promotions.filter(p =>
    !searchPromo || p.name.toLowerCase().includes(searchPromo.toLowerCase()) || (p.description || '').toLowerCase().includes(searchPromo.toLowerCase())
  );
  const activeCount = promotions.filter(p => p.isActive !== false).length;
  const inactiveCount = promotions.length - activeCount;

  return (
    <div className="flex-1 flex flex-col bg-app overflow-hidden select-none">
      {/* Header */}
      <header className="px-6 py-4 border-b border-border-subtle bg-surface flex items-center justify-between">
        <div>
          <h1 className="text-base font-bold text-text-primary flex items-center gap-2">
            <Gift className="w-5 h-5 text-primary" />
            Mesin Promo Otomatis & Bundling
          </h1>
          <p className="text-xs text-text-secondary mt-0.5">
            {mode === 'Electronics' 
              ? 'Atur diskon Beli Gadget Gratis Aksesoris, Paket Bundling SIM + Voucher, dan Promo Kasir' 
              : 'Atur diskon Beli X Gratis Y, Paket Bundling Hemat, dan Diskon Jam Tertentu di kasir'}
          </p>
        </div>

        <button
          onClick={() => setIsAddModalOpen(true)}
          className="px-4 py-2 bg-primary hover:bg-primary-hover text-primary-text rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-sm"
        >
          <Plus className="w-4 h-4" />
          <span>Buat Promo Baru</span>
        </button>
      </header>

      {/* Stats + Search Bar */}
      <div className="px-6 py-3 border-b border-border-subtle bg-surface flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 text-xs font-bold">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-600">
            <CheckCircle2 className="w-4 h-4" /><span>Aktif: {activeCount} Promo</span>
          </div>
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-500/10 border border-slate-500/20 text-slate-500">
            <AlertCircle className="w-4 h-4" /><span>Nonaktif: {inactiveCount} Promo</span>
          </div>
        </div>
        <div className="relative w-64">
          <Search className="w-4 h-4 text-text-muted absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchPromo}
            onChange={e => setSearchPromo(e.target.value)}
            placeholder="Cari nama promo..."
            className="w-full pl-9 pr-3 py-2 bg-card border border-border-subtle rounded-lg text-xs text-text-primary focus:outline-none focus:border-primary"
          />
        </div>
      </div>

      {/* Promo Cards Grid */}
      <div className="flex-1 overflow-y-auto p-6">
        <div className="grid grid-cols-2 gap-4">
          {filteredPromos.map((promo) => {
            const isActive = promo.isActive !== false;
            return (
            <div key={promo.id} className={`p-5 rounded-2xl border transition-all flex flex-col justify-between shadow-sm space-y-3 ${isActive ? 'bg-card border-border-subtle hover:border-primary/40' : 'bg-subtle border-border-subtle opacity-60'}`}>
              <div>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <span className="p-2 rounded-xl bg-primary/10 text-primary">
                      {promo.promoType === 'BuyXGetY' || promo.promoType === 0 ? <Gift className="w-4 h-4" /> :
                       promo.promoType === 'BundlingPackage' || promo.promoType === 1 ? <Layers className="w-4 h-4" /> : <Percent className="w-4 h-4" />}
                    </span>
                    <div>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-subtle text-primary uppercase">
                        {promo.promoType === 'BuyXGetY' || promo.promoType === 0 ? 'Beli X Gratis Y' :
                         promo.promoType === 'BundlingPackage' || promo.promoType === 1 ? 'Paket Bundling' : 'Diskon Khusus'}
                      </span>
                      <h3 className="text-xs font-bold text-text-primary mt-1">{promo.name}</h3>
                    </div>
                  </div>

                  <button
                    onClick={() => handleDeletePromo(promo.id, promo.name)}
                    className="p-1 text-text-muted hover:text-status-danger"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                <p className="text-xs text-text-secondary mt-2">
                  {promo.description || (
                    promo.buyProductName && promo.getFreeProductName
                      ? `Setiap beli ${promo.buyQuantityRequired} ${promo.buyProductName} GRATIS ${promo.getFreeQuantity} ${promo.getFreeProductName}`
                      : promo.bundleSpecialPrice > 0 ? `Harga Spesial Paket: Rp ${promo.bundleSpecialPrice.toLocaleString('id-ID')}` : 'Promo Aktif'
                  )}
                </p>
              </div>

              <div className="pt-2 border-t border-border-subtle flex items-center justify-between text-xs">
                <div className="flex items-center gap-1.5">
                  {isActive ? (
                    <span className="flex items-center gap-1 text-status-success font-bold text-[11px]">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Aktif di Kasir
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 text-text-muted font-bold text-[11px]">
                      <AlertCircle className="w-3.5 h-3.5" /> Nonaktif
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleTogglePromo(promo.id, isActive)}
                    title={isActive ? 'Nonaktifkan promo' : 'Aktifkan promo'}
                    className={`flex items-center gap-1 px-2 py-0.5 rounded-lg text-[11px] font-bold border transition-all ${isActive ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-600 hover:bg-rose-500/10 hover:text-rose-600 hover:border-rose-500/30' : 'bg-subtle border-border-subtle text-text-muted hover:bg-emerald-500/10 hover:text-emerald-600 hover:border-emerald-500/30'}`}
                  >
                    {isActive ? <ToggleRight className="w-3.5 h-3.5" /> : <ToggleLeft className="w-3.5 h-3.5" />}
                    {isActive ? 'Nonaktifkan' : 'Aktifkan'}
                  </button>
                </div>
              </div>
            </div>);
          })}
        </div>

        {promotions.length === 0 && (
          <div className="py-24 text-center text-text-muted space-y-2">
            <Gift className="w-12 h-12 mx-auto opacity-30" />
            <p className="text-xs font-bold text-text-primary">Belum Ada Aturan Promosi</p>
            <p className="text-[11px]">Klik "Buat Promo Baru" untuk menambahkan promo Beli X Gratis Y atau Bundling.</p>
          </div>
        )}
      </div>

      {/* Modal: Create Promo */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/75 flex items-center justify-center p-4">
          <form onSubmit={handleCreatePromo} className="bg-surface border border-border-strong w-full max-w-lg rounded-2xl p-5 space-y-4 shadow-2xl">
            <h2 className="text-base font-bold text-text-primary">Buat Aturan Promosi Kasir</h2>

            <div>
              <label className="block text-xs font-semibold text-text-secondary mb-1">Nama / Judul Promo *</label>
              <input
                type="text"
                required
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder={mode === 'Electronics' ? 'Contoh: Promo Bundling: Beli Smartphone Gratis Fast Charger' : 'Contoh: Promo Spesial: Beli 2 Gratis 1'}
                className="w-full px-3 py-2 bg-subtle border border-border-strong rounded-lg text-xs text-text-primary focus:outline-none focus:border-primary"
                autoFocus
              />
            </div>

            <div className="grid grid-cols-3 gap-2 text-xs">
              <button
                type="button"
                onClick={() => setPromoType('BuyXGetY')}
                className={`py-2 rounded-lg border font-bold transition-all ${
                  promoType === 'BuyXGetY' ? 'bg-primary text-primary-text border-primary shadow-sm' : 'bg-subtle border-border-subtle'
                }`}
              >
                Beli X Gratis Y
              </button>
              <button
                type="button"
                onClick={() => setPromoType('BundlingPackage')}
                className={`py-2 rounded-lg border font-bold transition-all ${
                  promoType === 'BundlingPackage' ? 'bg-primary text-primary-text border-primary shadow-sm' : 'bg-subtle border-border-subtle'
                }`}
              >
                Paket Bundling
              </button>
              <button
                type="button"
                onClick={() => setPromoType('HappyHourDiscount')}
                className={`py-2 rounded-lg border font-bold transition-all ${
                  promoType === 'HappyHourDiscount' ? 'bg-primary text-primary-text border-primary shadow-sm' : 'bg-subtle border-border-subtle'
                }`}
              >
                Diskon Jam Khusus
              </button>
            </div>

            {promoType === 'BuyXGetY' && (
              <div className="space-y-3 p-3 bg-subtle rounded-xl border border-border-subtle text-xs">
                <div className="grid grid-cols-3 gap-2">
                  <div className="col-span-2">
                    <label className="block font-semibold mb-1">Barang yang Dibeli:</label>
                    <select
                      value={buyProductId}
                      onChange={e => setBuyProductId(e.target.value)}
                      className="w-full px-2 py-1.5 bg-card border border-border-strong rounded"
                    >
                      <option value="">-- Pilih Produk --</option>
                      {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block font-semibold mb-1">Min. Qty Beli:</label>
                    <input
                      type="number"
                      min="1"
                      value={buyQty}
                      onChange={e => setBuyQty(parseInt(e.target.value) || 1)}
                      className="w-full px-2 py-1.5 bg-card border border-border-strong rounded text-center font-bold"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <div className="col-span-2">
                    <label className="block font-semibold mb-1">Barang Gratis / Hadiah:</label>
                    <select
                      value={getFreeProductId}
                      onChange={e => setGetFreeProductId(e.target.value)}
                      className="w-full px-2 py-1.5 bg-card border border-border-strong rounded"
                    >
                      <option value="">-- Pilih Produk Gratis --</option>
                      {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block font-semibold mb-1">Qty Gratis:</label>
                    <input
                      type="number"
                      min="1"
                      value={getFreeQty}
                      onChange={e => setGetFreeQty(parseInt(e.target.value) || 1)}
                      className="w-full px-2 py-1.5 bg-card border border-border-strong rounded text-center font-bold"
                    />
                  </div>
                </div>
              </div>
            )}

            {promoType === 'BundlingPackage' && (
              <div className="p-3 bg-subtle rounded-xl border border-border-subtle text-xs">
                <label className="block font-semibold mb-1">Harga Spesial Paket Bundling (Rp):</label>
                <input
                  type="number"
                  value={bundlePrice}
                  onChange={e => setBundlePrice(e.target.value)}
                  className="w-full px-3 py-2 bg-card border border-border-strong rounded font-mono font-bold text-sm"
                />
              </div>
            )}

            {promoType === 'HappyHourDiscount' && (
              <div className="space-y-3 p-3 bg-subtle rounded-xl border border-border-subtle text-xs">
                <p className="text-[11px] text-text-muted">Diskon otomatis aktif pada jam tertentu. Kasir mendapat pop-up pengingat saat jam promo dimulai.</p>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold mb-1">⏰ Jam Mulai:</label>
                    <input type="time" value={startDate.slice(0, 5) || '08:00'}
                      onChange={e => setStartDate(e.target.value)}
                      className="w-full px-2 py-1.5 bg-card border border-border-strong rounded font-mono font-bold" />
                  </div>
                  <div>
                    <label className="block font-semibold mb-1">⏰ Jam Selesai:</label>
                    <input type="time" value={endDate.slice(0, 5) || '12:00'}
                      onChange={e => setEndDate(e.target.value)}
                      className="w-full px-2 py-1.5 bg-card border border-border-strong rounded font-mono font-bold" />
                  </div>
                </div>
                <div>
                  <label className="block font-semibold mb-1">Besar Diskon (%):</label>
                  <input type="number" min="1" max="99" value={discountPercent}
                    onChange={e => setDiscountPercent(parseInt(e.target.value) || 10)}
                    className="w-full px-2 py-1.5 bg-card border border-border-strong rounded text-center font-bold font-mono text-sm" />
                </div>
                <p className="text-[10px] text-amber-600 font-bold">💡 Contoh: Happy Hour 10:00–12:00, Diskon 15% untuk semua produk di keranjang.</p>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-text-secondary mb-1">Berlaku Mulai (opsional)</label>
                <input
                  type="date"
                  value={startDate}
                  onChange={e => setStartDate(e.target.value)}
                  className="w-full px-3 py-2 bg-subtle border border-border-strong rounded-lg text-xs font-mono text-text-primary focus:outline-none focus:border-primary"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-text-secondary mb-1">Berlaku Hingga (opsional)</label>
                <input
                  type="date"
                  value={endDate}
                  onChange={e => setEndDate(e.target.value)}
                  className="w-full px-3 py-2 bg-subtle border border-border-strong rounded-lg text-xs font-mono text-text-primary focus:outline-none focus:border-primary"
                />
              </div>
            </div>

            <div className="flex gap-2 pt-2 border-t border-border-subtle">
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                className="flex-1 py-2 bg-subtle hover:bg-card-hover border border-border-subtle rounded-lg text-xs font-semibold"
              >
                Batal
              </button>
              <button
                type="submit"
                className="flex-1 py-2 bg-primary hover:bg-primary-hover text-primary-text rounded-lg text-xs font-bold shadow-sm"
              >
                Simpan & Aktifkan Promo
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
export default PromotionsPage;
