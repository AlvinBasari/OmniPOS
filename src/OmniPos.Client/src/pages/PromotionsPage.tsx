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
  Search, 
  Lightbulb,
  Ticket,
  Star,
  Award,
  ShieldCheck,
  Check,
  Edit2,
  Copy,
  Save,
  RefreshCw,
  Users,
  Calculator,
  Crown,
  DollarSign,
  Tag,
  AlertTriangle,
  X
} from 'lucide-react';
import { PromotionRule, Product, Coupon, LoyaltySettings } from '../types';
import { useToastStore } from '../store/useToastStore';
import { useBusinessModeStore } from '../store/useBusinessModeStore';

export const PromotionsPage: React.FC = () => {
  const { mode } = useBusinessModeStore();
  const [activeTab, setActiveTab] = useState<'promos' | 'coupons' | 'loyalty'>('promos');

  // ==========================================
  // TAB 1: AUTOMATIC PROMOTIONS & BUNDLING
  // ==========================================
  const [promotions, setPromotions] = useState<PromotionRule[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [isAddPromoModalOpen, setIsAddPromoModalOpen] = useState(false);
  const [searchPromo, setSearchPromo] = useState('');

  // New Promo Form State
  const [promoName, setPromoName] = useState('');
  const [promoType, setPromoType] = useState<any>('BuyXGetY');
  const [buyProductId, setBuyProductId] = useState('');
  const [buyQty, setBuyQty] = useState(2);
  const [getFreeProductId, setGetFreeProductId] = useState('');
  const [getFreeQty, setGetFreeQty] = useState(1);
  const [discountPercent, setDiscountPercent] = useState(10);
  const [bundlePrice, setBundlePrice] = useState('100000');
  const [promoDescription, setPromoDescription] = useState('');
  const [promoStartDate, setPromoStartDate] = useState('');
  const [promoEndDate, setPromoEndDate] = useState('');

  // ==========================================
  // TAB 2: COUPONS & DISCOUNT VOUCHERS
  // ==========================================
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [searchCoupon, setSearchCoupon] = useState('');
  const [couponTierFilter, setCouponTierFilter] = useState('ALL');
  const [isCouponModalOpen, setIsCouponModalOpen] = useState(false);
  const [editingCoupon, setEditingCoupon] = useState<Coupon | null>(null);

  // Coupon Form State
  const [cCode, setCCode] = useState('');
  const [cName, setCName] = useState('');
  const [cDescription, setCDescription] = useState('');
  const [cDiscountType, setCDiscountType] = useState<'FixedAmount' | 'Percentage'>('FixedAmount');
  const [cDiscountValue, setCDiscountValue] = useState<number>(10000);
  const [cMinSpend, setCMinSpend] = useState<number>(50000);
  const [cMaxDiscount, setCMaxDiscount] = useState<number>(0);
  const [cUsageLimit, setCUsageLimit] = useState<number>(100);
  const [cStartDate, setCStartDate] = useState('');
  const [cEndDate, setCEndDate] = useState('');
  const [cAllowedTier, setCAllowedTier] = useState('ALL');
  const [cIsActive, setCIsActive] = useState(true);

  // ==========================================
  // TAB 3: MEMBER LOYALTY PROGRAM SETTINGS
  // ==========================================
  const [loyaltySettings, setLoyaltySettings] = useState<LoyaltySettings>({
    pointsPerSpendAmount: 10000,
    redeemValuePerPoint: 1000,
    minPointsToRedeem: 10,
    silverThresholdSpend: 500000,
    goldThresholdSpend: 2000000,
    platinumThresholdSpend: 5000000,
    silverPointMultiplier: 1.0,
    goldPointMultiplier: 1.5,
    platinumPointMultiplier: 2.0
  });
  const [isSavingLoyalty, setIsSavingLoyalty] = useState(false);
  const [simulationSpend, setSimulationSpend] = useState<number>(100000);

  // ==========================================
  // INITIAL DATA FETCHING
  // ==========================================
  useEffect(() => {
    fetchPromosAndProducts();
    fetchCoupons();
    fetchLoyaltySettings();
  }, [mode]);

  const fetchPromosAndProducts = async () => {
    try {
      const [pRes, prodRes] = await Promise.all([
        fetch('/api/v1/promotions'),
        fetch(`/api/v1/products?mode=${mode}`)
      ]);
      if (pRes.ok) setPromotions(await pRes.json());
      if (prodRes.ok) setProducts(await prodRes.json());
    } catch {}
  };

  const fetchCoupons = async () => {
    try {
      const res = await fetch('/api/v1/coupons');
      if (res.ok) setCoupons(await res.json());
    } catch {}
  };

  const fetchLoyaltySettings = async () => {
    try {
      const res = await fetch('/api/v1/loyalty/settings');
      if (res.ok) {
        const data = await res.json();
        setLoyaltySettings(data);
      }
    } catch {}
  };

  // ==========================================
  // TAB 1 ACTIONS: PROMOTIONS
  // ==========================================
  const handleCreatePromo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!promoName.trim()) return;

    const buyProd = products.find(p => p.id === buyProductId);
    const freeProd = products.find(p => p.id === getFreeProductId);

    const payload = {
      name: promoName.trim(),
      promoType,
      buyProductId: buyProd?.id,
      buyProductName: buyProd?.name,
      buyQuantityRequired: buyQty,
      getFreeProductId: freeProd?.id,
      getFreeProductName: freeProd?.name,
      getFreeQuantity: getFreeQty,
      discountPercent,
      bundleSpecialPrice: parseFloat(bundlePrice) || 0,
      description: promoDescription.trim(),
      startDate: promoStartDate || null,
      endDate: promoEndDate || null,
      isActive: true
    };

    try {
      const res = await fetch('/api/v1/promotions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        useToastStore.getState().showToast('Aturan promo otomatis berhasil dibuat!', 'success');
        setIsAddPromoModalOpen(false);
        setPromoName('');
        setPromoDescription('');
        fetchPromosAndProducts();
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
        fetchPromosAndProducts();
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
        fetchPromosAndProducts();
      } else {
        setPromotions(prev => prev.map(p => p.id === id ? { ...p, isActive: !currentStatus } : p));
      }
    } catch {
      setPromotions(prev => prev.map(p => p.id === id ? { ...p, isActive: !currentStatus } : p));
    }
  };

  // ==========================================
  // TAB 2 ACTIONS: COUPONS
  // ==========================================
  const handleOpenCreateCoupon = () => {
    setEditingCoupon(null);
    setCCode(`HEMAT${Math.floor(10 + Math.random() * 90)}K`);
    setCName('');
    setCDescription('');
    setCDiscountType('FixedAmount');
    setCDiscountValue(10000);
    setCMinSpend(50000);
    setCMaxDiscount(0);
    setCUsageLimit(100);
    setCStartDate('');
    setCEndDate('');
    setCAllowedTier('ALL');
    setCIsActive(true);
    setIsCouponModalOpen(true);
  };

  const handleOpenEditCoupon = (coupon: Coupon) => {
    setEditingCoupon(coupon);
    setCCode(coupon.code);
    setCName(coupon.name);
    setCDescription(coupon.description || '');
    setCDiscountType(coupon.discountType as any || 'FixedAmount');
    setCDiscountValue(coupon.discountValue);
    setCMinSpend(coupon.minimumSpendAmount);
    setCMaxDiscount(coupon.maxDiscountAmount);
    setCUsageLimit(coupon.usageLimit);
    setCStartDate(coupon.startDate ? coupon.startDate.split('T')[0] : '');
    setCEndDate(coupon.endDate ? coupon.endDate.split('T')[0] : '');
    setCAllowedTier(coupon.allowedCustomerTier || 'ALL');
    setCIsActive(coupon.isActive);
    setIsCouponModalOpen(true);
  };

  const handleSaveCoupon = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cCode.trim() || !cName.trim()) {
      useToastStore.getState().showToast('Kode dan Nama kupon wajib diisi.', 'warning');
      return;
    }

    const payload = {
      code: cCode.trim().toUpperCase(),
      name: cName.trim(),
      description: cDescription.trim(),
      discountType: cDiscountType,
      discountValue: Number(cDiscountValue),
      minimumSpendAmount: Number(cMinSpend),
      maxDiscountAmount: Number(cMaxDiscount),
      startDate: cStartDate ? new Date(cStartDate).toISOString() : null,
      endDate: cEndDate ? new Date(cEndDate).toISOString() : null,
      usageLimit: Number(cUsageLimit),
      allowedCustomerTier: cAllowedTier,
      isActive: cIsActive
    };

    try {
      let res;
      if (editingCoupon) {
        res = await fetch(`/api/v1/coupons/${editingCoupon.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
      } else {
        res = await fetch('/api/v1/coupons', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
      }

      if (res.ok) {
        useToastStore.getState().showToast(editingCoupon ? 'Kupon diskon berhasil diperbarui!' : 'Kupon diskon baru berhasil dibuat!', 'success');
        setIsCouponModalOpen(false);
        fetchCoupons();
      } else {
        const data = await res.json();
        useToastStore.getState().showToast(data.message || 'Gagal menyimpan kupon.', 'error');
      }
    } catch {
      useToastStore.getState().showToast('Terjadi kesalahan saat menyimpan kupon.', 'error');
    }
  };

  const handleDeleteCoupon = async (id: string, code: string) => {
    if (!window.confirm(`Apakah Anda yakin ingin menghapus kupon diskon "${code}"?`)) return;
    try {
      const res = await fetch(`/api/v1/coupons/${id}`, { method: 'DELETE' });
      if (res.ok) {
        useToastStore.getState().showToast(`Kupon "${code}" berhasil dihapus.`, 'info');
        fetchCoupons();
      }
    } catch {
      useToastStore.getState().showToast('Gagal menghapus kupon.', 'error');
    }
  };

  const handleToggleCouponStatus = async (coupon: Coupon) => {
    try {
      const res = await fetch(`/api/v1/coupons/${coupon.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: coupon.name,
          description: coupon.description,
          discountType: coupon.discountType,
          discountValue: coupon.discountValue,
          minimumSpendAmount: coupon.minimumSpendAmount,
          maxDiscountAmount: coupon.maxDiscountAmount,
          startDate: coupon.startDate,
          endDate: coupon.endDate,
          usageLimit: coupon.usageLimit,
          allowedCustomerTier: coupon.allowedCustomerTier,
          isActive: !coupon.isActive
        })
      });
      if (res.ok) {
        useToastStore.getState().showToast(`Kupon ${coupon.code} ${!coupon.isActive ? 'diaktifkan' : 'dinonaktifkan'}!`, 'success');
        fetchCoupons();
      }
    } catch {
      useToastStore.getState().showToast('Gagal mengubah status kupon.', 'error');
    }
  };

  // ==========================================
  // TAB 3 ACTIONS: LOYALTY SETTINGS
  // ==========================================
  const handleSaveLoyaltySettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingLoyalty(true);
    try {
      const res = await fetch('/api/v1/loyalty/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(loyaltySettings)
      });
      if (res.ok) {
        useToastStore.getState().showToast('Pengaturan Program Loyalty Poin berhasil disimpan!', 'success');
      } else {
        useToastStore.getState().showToast('Gagal menyimpan pengaturan loyalty.', 'error');
      }
    } catch {
      useToastStore.getState().showToast('Terjadi kesalahan jaringan saat menyimpan pengaturan loyalty.', 'error');
    } finally {
      setIsSavingLoyalty(false);
    }
  };

  // Filtered lists
  const filteredPromos = promotions.filter(p =>
    !searchPromo || p.name.toLowerCase().includes(searchPromo.toLowerCase()) || (p.description || '').toLowerCase().includes(searchPromo.toLowerCase())
  );
  const activePromoCount = promotions.filter(p => p.isActive !== false).length;

  const filteredCoupons = coupons.filter(c => {
    const matchesSearch = !searchCoupon || c.code.toLowerCase().includes(searchCoupon.toLowerCase()) || c.name.toLowerCase().includes(searchCoupon.toLowerCase());
    const matchesTier = couponTierFilter === 'ALL' || c.allowedCustomerTier === couponTierFilter;
    return matchesSearch && matchesTier;
  });
  const activeCouponCount = coupons.filter(c => c.isActive).length;

  return (
    <div className="flex-1 flex flex-col bg-app overflow-hidden select-none">
      {/* Top Header */}
      <header className="px-6 py-4 border-b border-border-subtle bg-surface flex items-center justify-between">
        <div>
          <h1 className="text-base font-bold text-text-primary flex items-center gap-2">
            <Gift className="w-5 h-5 text-primary" />
            <span>Pusat Promosi, Kupon & Loyalty Poin Member</span>
          </h1>
          <p className="text-xs text-text-secondary mt-0.5">
            Kelola promo bundling kasir, master kupon voucher diskon, dan skema perolehan loyalty poin member
          </p>
        </div>

        {/* Action Button depending on tab */}
        {activeTab === 'promos' && (
          <button
            onClick={() => setIsAddPromoModalOpen(true)}
            className="px-4 py-2 bg-primary hover:bg-primary-hover text-primary-text rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Buat Promo Baru</span>
          </button>
        )}

        {activeTab === 'coupons' && (
          <button
            onClick={handleOpenCreateCoupon}
            className="px-4 py-2 bg-primary hover:bg-primary-hover text-primary-text rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Buat Kupon Diskon Baru</span>
          </button>
        )}

        {activeTab === 'loyalty' && (
          <button
            onClick={handleSaveLoyaltySettings}
            disabled={isSavingLoyalty}
            className="px-4 py-2 bg-primary hover:bg-primary-hover text-primary-text rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all disabled:opacity-50 cursor-pointer"
          >
            <Save className="w-4 h-4" />
            <span>{isSavingLoyalty ? 'Menyimpan...' : 'Simpan Pengaturan Poin'}</span>
          </button>
        )}
      </header>

      {/* Modern 3-Tab Bar */}
      <div className="px-6 bg-surface border-b border-border-subtle flex items-center gap-2">
        <button
          onClick={() => setActiveTab('promos')}
          className={`px-4 py-3 text-xs font-bold border-b-2 flex items-center gap-2 transition-all cursor-pointer ${
            activeTab === 'promos'
              ? 'border-primary text-primary bg-primary/5'
              : 'border-transparent text-text-secondary hover:text-text-primary hover:bg-card-hover'
          }`}
        >
          <Gift className="w-4 h-4" />
          <span>Promo Otomatis & Bundling</span>
          <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-subtle border border-border-subtle">
            {promotions.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('coupons')}
          className={`px-4 py-3 text-xs font-bold border-b-2 flex items-center gap-2 transition-all cursor-pointer ${
            activeTab === 'coupons'
              ? 'border-primary text-primary bg-primary/5'
              : 'border-transparent text-text-secondary hover:text-text-primary hover:bg-card-hover'
          }`}
        >
          <Ticket className="w-4 h-4" />
          <span>Master Kupon & Voucher Diskon</span>
          <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-subtle border border-border-subtle">
            {coupons.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('loyalty')}
          className={`px-4 py-3 text-xs font-bold border-b-2 flex items-center gap-2 transition-all cursor-pointer ${
            activeTab === 'loyalty'
              ? 'border-primary text-primary bg-primary/5'
              : 'border-transparent text-text-secondary hover:text-text-primary hover:bg-card-hover'
          }`}
        >
          <Star className="w-4 h-4" />
          <span>Program Loyalty Poin & Tier Member</span>
          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-700 dark:text-amber-400">
            Tier Multiplier
          </span>
        </button>
      </div>

      {/* ========================================================= */}
      {/* TAB 1: PROMO OTOMATIS & BUNDLING */}
      {/* ========================================================= */}
      {activeTab === 'promos' && (
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Subheader & Search */}
          <div className="px-6 py-3 border-b border-border-subtle bg-surface flex items-center justify-between gap-4">
            <div className="flex items-center gap-3 text-xs font-bold">
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-600">
                <CheckCircle2 className="w-4 h-4" />
                <span>Aktif: {activePromoCount} Promo</span>
              </div>
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-500/10 border border-slate-500/20 text-text-muted">
                <AlertCircle className="w-4 h-4" />
                <span>Total: {promotions.length} Promo</span>
              </div>
            </div>
            <div className="relative w-64">
              <Search className="w-4 h-4 text-text-muted absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchPromo}
                onChange={e => setSearchPromo(e.target.value)}
                placeholder="Cari promo..."
                className="w-full pl-9 pr-3 py-2 bg-card border border-border-subtle rounded-lg text-xs text-text-primary focus:outline-none focus:border-primary"
              />
            </div>
          </div>

          {/* Promo Grid */}
          <div className="flex-1 overflow-y-auto p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredPromos.map((promo) => {
                const isActive = promo.isActive !== false;
                return (
                  <div 
                    key={promo.id} 
                    className={`p-5 rounded-2xl border transition-all flex flex-col justify-between shadow-xs space-y-3 ${
                      isActive ? 'bg-card border-border-subtle hover:border-primary/40' : 'bg-subtle border-border-subtle opacity-60'
                    }`}
                  >
                    <div>
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-2.5">
                          <span className="p-2.5 rounded-xl bg-primary/10 text-primary">
                            {promo.promoType === 'BuyXGetY' || promo.promoType === 0 ? <Gift className="w-5 h-5" /> :
                             promo.promoType === 'BundlingPackage' || promo.promoType === 1 ? <Layers className="w-5 h-5" /> : <Percent className="w-5 h-5" />}
                          </span>
                          <div>
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-subtle text-primary uppercase tracking-wider">
                              {promo.promoType === 'BuyXGetY' || promo.promoType === 0 ? 'Beli X Gratis Y' :
                               promo.promoType === 'BundlingPackage' || promo.promoType === 1 ? 'Paket Bundling' : 'Diskon Jam Khusus'}
                            </span>
                            <h3 className="text-sm font-bold text-text-primary mt-1">{promo.name}</h3>
                          </div>
                        </div>

                        <button
                          onClick={() => handleDeletePromo(promo.id, promo.name)}
                          className="p-1.5 text-text-muted hover:text-rose-600 rounded-lg hover:bg-rose-500/10 transition-colors cursor-pointer"
                          title="Hapus promo"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>

                      <p className="text-xs text-text-secondary mt-2.5 leading-relaxed">
                        {promo.description || (
                          promo.buyProductName && promo.getFreeProductName
                            ? `Setiap beli ${promo.buyQuantityRequired} ${promo.buyProductName} GRATIS ${promo.getFreeQuantity} ${promo.getFreeProductName}`
                            : promo.bundleSpecialPrice > 0 ? `Harga Spesial Paket: Rp ${promo.bundleSpecialPrice.toLocaleString('id-ID')}` : 'Promo Aktif'
                        )}
                      </p>
                    </div>

                    <div className="pt-3 border-t border-border-subtle flex items-center justify-between text-xs">
                      <div className="flex items-center gap-1.5">
                        {isActive ? (
                          <span className="flex items-center gap-1 text-emerald-600 font-bold text-[11px]">
                            <CheckCircle2 className="w-3.5 h-3.5" /> Aktif di Kasir
                          </span>
                        ) : (
                          <span className="flex items-center gap-1 text-text-muted font-bold text-[11px]">
                            <AlertCircle className="w-3.5 h-3.5" /> Nonaktif
                          </span>
                        )}
                      </div>
                      
                      <button
                        onClick={() => handleTogglePromo(promo.id, isActive)}
                        className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-[11px] font-bold border transition-all cursor-pointer ${
                          isActive 
                            ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-600 hover:bg-rose-500/10 hover:text-rose-600 hover:border-rose-500/30' 
                            : 'bg-subtle border-border-subtle text-text-muted hover:bg-emerald-500/10 hover:text-emerald-600 hover:border-emerald-500/30'
                        }`}
                      >
                        {isActive ? <ToggleRight className="w-4 h-4" /> : <ToggleLeft className="w-4 h-4" />}
                        <span>{isActive ? 'Nonaktifkan' : 'Aktifkan'}</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            {filteredPromos.length === 0 && (
              <div className="py-24 text-center text-text-muted space-y-2">
                <Gift className="w-12 h-12 mx-auto opacity-30" />
                <p className="text-xs font-bold text-text-primary">Belum Ada Aturan Promosi</p>
                <p className="text-[11px]">Klik "Buat Promo Baru" untuk menambahkan promo Beli X Gratis Y atau Bundling.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* TAB 2: MASTER KUPON & VOUCHER DISKON */}
      {/* ========================================================= */}
      {activeTab === 'coupons' && (
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Subheader, Filter & Search */}
          <div className="px-6 py-3 border-b border-border-subtle bg-surface flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-text-secondary">Tier Member:</span>
              {['ALL', 'BRONZE', 'SILVER', 'GOLD', 'PLATINUM'].map((tier) => (
                <button
                  key={tier}
                  onClick={() => setCouponTierFilter(tier)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    couponTierFilter === tier
                      ? 'bg-primary text-primary-text shadow-xs'
                      : 'bg-subtle hover:bg-card-hover text-text-secondary border border-border-subtle'
                  }`}
                >
                  {tier === 'ALL' ? 'Semua Tier' : tier}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-3">
              <div className="text-xs font-bold text-emerald-600 px-3 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4" />
                <span>{activeCouponCount} Kupon Aktif</span>
              </div>
              <div className="relative w-64">
                <Search className="w-4 h-4 text-text-muted absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchCoupon}
                  onChange={e => setSearchCoupon(e.target.value)}
                  placeholder="Cari kode atau nama kupon..."
                  className="w-full pl-9 pr-3 py-1.5 bg-card border border-border-subtle rounded-lg text-xs text-text-primary focus:outline-none focus:border-primary"
                />
              </div>
            </div>
          </div>

          {/* Coupon Cards Grid */}
          <div className="flex-1 overflow-y-auto p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredCoupons.map((coupon) => {
                const isPercentage = coupon.discountType === 'Percentage' || coupon.discountType === '0';
                const isUsageFull = coupon.usageLimit > 0 && coupon.usageCount >= coupon.usageLimit;
                const isExpired = coupon.endDate && new Date(coupon.endDate) < new Date();

                return (
                  <div
                    key={coupon.id}
                    className={`rounded-2xl border transition-all p-5 flex flex-col justify-between shadow-xs relative overflow-hidden ${
                      !coupon.isActive || isExpired || isUsageFull
                        ? 'bg-subtle border-border-subtle opacity-70'
                        : 'bg-card border-border-subtle hover:border-primary/40'
                    }`}
                  >
                    {/* Top Tag & Actions */}
                    <div className="space-y-3">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-2">
                          <span className="px-2.5 py-1 rounded-lg bg-primary/10 border border-primary/20 text-primary font-mono font-black text-sm tracking-wider flex items-center gap-1.5">
                            <Tag className="w-3.5 h-3.5" />
                            {coupon.code}
                          </span>
                          <button
                            onClick={() => {
                              navigator.clipboard.writeText(coupon.code);
                              useToastStore.getState().showToast(`Kode '${coupon.code}' disalin!`, 'info');
                            }}
                            className="p-1 rounded text-text-muted hover:text-text-primary hover:bg-subtle cursor-pointer"
                            title="Salin Kode Kupon"
                          >
                            <Copy className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => handleOpenEditCoupon(coupon)}
                            className="p-1.5 text-text-muted hover:text-primary rounded-lg hover:bg-primary/10 transition-colors cursor-pointer"
                            title="Edit kupon"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteCoupon(coupon.id, coupon.code)}
                            className="p-1.5 text-text-muted hover:text-rose-600 rounded-lg hover:bg-rose-500/10 transition-colors cursor-pointer"
                            title="Hapus kupon"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                      <div>
                        <h3 className="text-sm font-bold text-text-primary">{coupon.name}</h3>
                        <p className="text-xs text-text-secondary mt-1 line-clamp-2">
                          {coupon.description || 'Kupon diskon belanja kasir'}
                        </p>
                      </div>

                      {/* Value & Requirement Pills */}
                      <div className="p-3 bg-subtle rounded-xl border border-border-subtle space-y-2 text-xs">
                        <div className="flex justify-between items-center">
                          <span className="text-text-muted">Besar Diskon:</span>
                          <span className="font-mono font-black text-emerald-600 text-sm">
                            {isPercentage ? `${coupon.discountValue}%` : `Rp ${coupon.discountValue.toLocaleString('id-ID')}`}
                            {isPercentage && coupon.maxDiscountAmount > 0 && (
                              <span className="text-[10px] text-text-muted font-normal block text-right">
                                Max: Rp {coupon.maxDiscountAmount.toLocaleString('id-ID')}
                              </span>
                            )}
                          </span>
                        </div>

                        <div className="flex justify-between items-center">
                          <span className="text-text-muted">Min. Belanja:</span>
                          <span className="font-mono font-bold text-text-primary">
                            {coupon.minimumSpendAmount > 0 ? `Rp ${coupon.minimumSpendAmount.toLocaleString('id-ID')}` : 'Tanpa Min.'}
                          </span>
                        </div>

                        <div className="flex justify-between items-center">
                          <span className="text-text-muted">Khusus Tier:</span>
                          <span className="font-bold text-primary uppercase text-[10px] px-2 py-0.5 rounded bg-primary/10 border border-primary/20">
                            {coupon.allowedCustomerTier || 'SEMUA MEMBER'}
                          </span>
                        </div>
                      </div>

                      {/* Usage Limit & Progress */}
                      <div className="space-y-1 text-xs">
                        <div className="flex justify-between text-[11px]">
                          <span className="text-text-muted">Kuota Terpakai:</span>
                          <span className="font-mono font-bold text-text-primary">
                            {coupon.usageCount} / {coupon.usageLimit > 0 ? coupon.usageLimit : '∞'}
                          </span>
                        </div>
                        {coupon.usageLimit > 0 && (
                          <div className="w-full bg-subtle h-1.5 rounded-full overflow-hidden border border-border-subtle">
                            <div
                              className={`h-full transition-all ${
                                isUsageFull ? 'bg-rose-500' : 'bg-primary'
                              }`}
                              style={{ width: `${Math.min(100, (coupon.usageCount / coupon.usageLimit) * 100)}%` }}
                            />
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Bottom Status & Toggle */}
                    <div className="pt-3 mt-3 border-t border-border-subtle flex items-center justify-between text-xs">
                      <div>
                        {isExpired ? (
                          <span className="text-[10px] font-bold text-rose-500 flex items-center gap-1">
                            <AlertTriangle className="w-3 h-3" /> Kadaluarsa
                          </span>
                        ) : isUsageFull ? (
                          <span className="text-[10px] font-bold text-amber-600 flex items-center gap-1">
                            <AlertCircle className="w-3 h-3" /> Kuota Habis
                          </span>
                        ) : coupon.isActive ? (
                          <span className="text-[10px] font-bold text-emerald-600 flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3" /> Aktif di Kasir
                          </span>
                        ) : (
                          <span className="text-[10px] font-bold text-text-muted flex items-center gap-1">
                            <AlertCircle className="w-3 h-3" /> Nonaktif
                          </span>
                        )}
                      </div>

                      <button
                        onClick={() => handleToggleCouponStatus(coupon)}
                        className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold border transition-all cursor-pointer ${
                          coupon.isActive
                            ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-600 hover:bg-rose-500/10 hover:text-rose-600 hover:border-rose-500/30'
                            : 'bg-subtle border-border-subtle text-text-muted hover:bg-emerald-500/10 hover:text-emerald-600 hover:border-emerald-500/30'
                        }`}
                      >
                        {coupon.isActive ? <ToggleRight className="w-3.5 h-3.5" /> : <ToggleLeft className="w-3.5 h-3.5" />}
                        <span>{coupon.isActive ? 'Nonaktifkan' : 'Aktifkan'}</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            {filteredCoupons.length === 0 && (
              <div className="py-24 text-center text-text-muted space-y-2">
                <Ticket className="w-12 h-12 mx-auto opacity-30" />
                <p className="text-xs font-bold text-text-primary">Belum Ada Kupon Diskon</p>
                <p className="text-[11px]">Klik "Buat Kupon Diskon Baru" untuk membuat voucher promo kasir.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* TAB 3: PROGRAM LOYALTY POIN & TIER MEMBER */}
      {/* ========================================================= */}
      {activeTab === 'loyalty' && (
        <div className="flex-1 overflow-y-auto p-6 space-y-6 max-w-5xl mx-auto w-full">
          {/* Main Info Card */}
          <div className="p-5 bg-linear-to-r from-amber-500/10 via-primary/10 to-transparent border border-amber-500/30 rounded-2xl flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-2xl bg-amber-500/20 text-amber-600">
                <Crown className="w-7 h-7" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-text-primary">Program Poin Loyalitas & Multiplier Tier Pelanggan</h2>
                <p className="text-xs text-text-secondary mt-0.5">
                  Setiap transaksi member terdaftar di kasir akan otomatis menghasilkan poin belanja dan dapat ditukar menjadi potongan tagihan.
                </p>
              </div>
            </div>

            <button
              onClick={fetchLoyaltySettings}
              className="p-2 rounded-xl bg-card hover:bg-card-hover border border-border-subtle text-text-secondary hover:text-text-primary text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <RefreshCw className="w-4 h-4" />
              <span>Muat Ulang</span>
            </button>
          </div>

          <form onSubmit={handleSaveLoyaltySettings} className="space-y-6">
            {/* 1. Point Earning & Redemption Ratio */}
            <div className="p-5 bg-card border border-border-subtle rounded-2xl space-y-4">
              <h3 className="text-xs font-bold text-text-primary uppercase tracking-wider flex items-center gap-2">
                <Star className="w-4 h-4 text-amber-500" />
                <span>1. Konfigurasi Rasio Perolehan & Penukaran Poin</span>
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-4 bg-subtle rounded-xl border border-border-subtle space-y-2">
                  <label className="block text-xs font-bold text-text-secondary">
                    Nominal Belanja per 1 Poin (Rp):
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-text-muted">Rp</span>
                    <input
                      type="number"
                      min="1000"
                      step="1000"
                      value={loyaltySettings.pointsPerSpendAmount}
                      onChange={e => setLoyaltySettings({ ...loyaltySettings, pointsPerSpendAmount: parseFloat(e.target.value) || 0 })}
                      className="w-full pl-10 pr-3 py-2 bg-card border border-border-strong rounded-lg text-sm font-mono font-bold text-text-primary focus:outline-none focus:border-primary"
                    />
                  </div>
                  <p className="text-[11px] text-text-muted">
                    Contoh: Rp 10.000 = Pembelian Rp 50.000 dapat 5 Poin.
                  </p>
                </div>

                <div className="p-4 bg-subtle rounded-xl border border-border-subtle space-y-2">
                  <label className="block text-xs font-bold text-text-secondary">
                    Nilai Tukar Rupiah per 1 Poin (Rp):
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-text-muted">Rp</span>
                    <input
                      type="number"
                      min="1"
                      step="1"
                      value={loyaltySettings.redeemValuePerPoint}
                      onChange={e => setLoyaltySettings({ ...loyaltySettings, redeemValuePerPoint: parseFloat(e.target.value) || 0 })}
                      className="w-full pl-10 pr-3 py-2 bg-card border border-border-strong rounded-lg text-sm font-mono font-bold text-text-primary focus:outline-none focus:border-primary"
                    />
                  </div>
                  <p className="text-[11px] text-text-muted">
                    Contoh: 1 Poin = Rp 1 (atau Rp 1.000 jika skala 1 pts = seribu rupiah).
                  </p>
                </div>

                <div className="p-4 bg-subtle rounded-xl border border-border-subtle space-y-2">
                  <label className="block text-xs font-bold text-text-secondary">
                    Minimal Poin untuk Ditukar:
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={loyaltySettings.minPointsToRedeem}
                    onChange={e => setLoyaltySettings({ ...loyaltySettings, minPointsToRedeem: parseInt(e.target.value) || 1 })}
                    className="w-full px-3 py-2 bg-card border border-border-strong rounded-lg text-sm font-mono font-bold text-text-primary focus:outline-none focus:border-primary"
                  />
                  <p className="text-[11px] text-text-muted">
                    Batas minimal saldo poin member sebelum tombol redeem di kasir aktif.
                  </p>
                </div>
              </div>
            </div>

            {/* 2. Customer Tier Thresholds & Multipliers */}
            <div className="p-5 bg-card border border-border-subtle rounded-2xl space-y-4">
              <h3 className="text-xs font-bold text-text-primary uppercase tracking-wider flex items-center gap-2">
                <Crown className="w-4 h-4 text-amber-500" />
                <span>2. Level Member & Multiplier Poin Belanja</span>
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                {/* Bronze */}
                <div className="p-4 bg-subtle rounded-xl border border-border-subtle space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-extrabold text-xs text-amber-800 dark:text-amber-300">BRONZE</span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-card text-text-muted">Member Baru</span>
                  </div>
                  <div className="space-y-1">
                    <span className="text-[10px] text-text-muted block">Ambang Belanja</span>
                    <p className="text-xs font-bold font-mono text-text-primary">Rp 0 (Otomatis)</p>
                  </div>
                  <div className="space-y-1">
                    <span className="text-[10px] text-text-muted block">Pengali Poin</span>
                    <p className="text-xs font-bold font-mono text-text-primary">1.0x (Normal)</p>
                  </div>
                </div>

                {/* Silver */}
                <div className="p-4 bg-subtle rounded-xl border border-border-subtle space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-extrabold text-xs text-slate-700 dark:text-slate-300">SILVER</span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-500/20 text-slate-700 dark:text-slate-300">Tier 2</span>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] text-text-muted block">Min. Belanja (Rp):</label>
                    <input
                      type="number"
                      step="50000"
                      value={loyaltySettings.silverThresholdSpend}
                      onChange={e => setLoyaltySettings({ ...loyaltySettings, silverThresholdSpend: parseFloat(e.target.value) || 0 })}
                      className="w-full px-2 py-1 bg-card border border-border-strong rounded font-mono font-bold text-xs"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] text-text-muted block">Pengali Poin (x):</label>
                    <input
                      type="number"
                      step="0.1"
                      value={loyaltySettings.silverPointMultiplier}
                      onChange={e => setLoyaltySettings({ ...loyaltySettings, silverPointMultiplier: parseFloat(e.target.value) || 1 })}
                      className="w-full px-2 py-1 bg-card border border-border-strong rounded font-mono font-bold text-xs"
                    />
                  </div>
                </div>

                {/* Gold */}
                <div className="p-4 bg-subtle rounded-xl border border-border-subtle space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-extrabold text-xs text-amber-600">GOLD</span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-500/20 text-amber-700">Tier 3</span>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] text-text-muted block">Min. Belanja (Rp):</label>
                    <input
                      type="number"
                      step="100000"
                      value={loyaltySettings.goldThresholdSpend}
                      onChange={e => setLoyaltySettings({ ...loyaltySettings, goldThresholdSpend: parseFloat(e.target.value) || 0 })}
                      className="w-full px-2 py-1 bg-card border border-border-strong rounded font-mono font-bold text-xs"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] text-text-muted block">Pengali Poin (x):</label>
                    <input
                      type="number"
                      step="0.1"
                      value={loyaltySettings.goldPointMultiplier}
                      onChange={e => setLoyaltySettings({ ...loyaltySettings, goldPointMultiplier: parseFloat(e.target.value) || 1.5 })}
                      className="w-full px-2 py-1 bg-card border border-border-strong rounded font-mono font-bold text-xs"
                    />
                  </div>
                </div>

                {/* Platinum */}
                <div className="p-4 bg-subtle rounded-xl border border-border-subtle space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-extrabold text-xs text-indigo-600">PLATINUM</span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-700">VIP</span>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] text-text-muted block">Min. Belanja (Rp):</label>
                    <input
                      type="number"
                      step="500000"
                      value={loyaltySettings.platinumThresholdSpend}
                      onChange={e => setLoyaltySettings({ ...loyaltySettings, platinumThresholdSpend: parseFloat(e.target.value) || 0 })}
                      className="w-full px-2 py-1 bg-card border border-border-strong rounded font-mono font-bold text-xs"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] text-text-muted block">Pengali Poin (x):</label>
                    <input
                      type="number"
                      step="0.1"
                      value={loyaltySettings.platinumPointMultiplier}
                      onChange={e => setLoyaltySettings({ ...loyaltySettings, platinumPointMultiplier: parseFloat(e.target.value) || 2 })}
                      className="w-full px-2 py-1 bg-card border border-border-strong rounded font-mono font-bold text-xs"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* 3. Interactive Simulation Box */}
            <div className="p-5 bg-card border border-border-subtle rounded-2xl space-y-3">
              <h3 className="text-xs font-bold text-text-primary uppercase tracking-wider flex items-center gap-2">
                <Calculator className="w-4 h-4 text-primary" />
                <span>Simulasi Perhitungan Reward Belanja</span>
              </h3>

              <div className="flex items-center gap-3">
                <label className="text-xs font-semibold text-text-secondary whitespace-nowrap">
                  Simulasi Belanja:
                </label>
                <div className="relative w-48">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-text-muted">Rp</span>
                  <input
                    type="number"
                    step="10000"
                    value={simulationSpend}
                    onChange={e => setSimulationSpend(parseFloat(e.target.value) || 0)}
                    className="w-full pl-9 pr-3 py-1.5 bg-subtle border border-border-strong rounded-lg text-xs font-mono font-bold text-text-primary"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 pt-2">
                {[
                  { tier: 'Bronze', mult: 1.0, color: 'text-amber-800 dark:text-amber-300' },
                  { tier: 'Silver', mult: loyaltySettings.silverPointMultiplier, color: 'text-slate-600 dark:text-slate-300' },
                  { tier: 'Gold', mult: loyaltySettings.goldPointMultiplier, color: 'text-amber-600' },
                  { tier: 'Platinum', mult: loyaltySettings.platinumPointMultiplier, color: 'text-indigo-600' }
                ].map(item => {
                  const basePts = Math.floor(simulationSpend / (loyaltySettings.pointsPerSpendAmount || 10000));
                  const finalPts = Math.floor(basePts * item.mult);
                  const redeemVal = finalPts * (loyaltySettings.redeemValuePerPoint || 1);

                  return (
                    <div key={item.tier} className="p-3 bg-subtle rounded-xl border border-border-subtle space-y-1 text-xs">
                      <span className={`font-bold block ${item.color}`}>Member {item.tier} ({item.mult}x)</span>
                      <p className="font-mono font-extrabold text-sm text-text-primary">
                        +{finalPts.toLocaleString('id-ID')} Poin
                      </p>
                      <p className="text-[10px] text-emerald-600 font-bold">
                        = Diskon Rp {redeemVal.toLocaleString('id-ID')}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Submit Button */}
            <div className="flex justify-end pt-2">
              <button
                type="submit"
                disabled={isSavingLoyalty}
                className="px-6 py-2.5 bg-primary hover:bg-primary-hover text-primary-text rounded-xl text-xs font-bold flex items-center gap-2 shadow-sm transition-all disabled:opacity-50 cursor-pointer"
              >
                <Save className="w-4 h-4" />
                <span>{isSavingLoyalty ? 'Menyimpan Pengaturan...' : 'Simpan Perubahan Skema Loyalty'}</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL 1: CREATE AUTOMATIC PROMOTION */}
      {/* ========================================================= */}
      {isAddPromoModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/75 flex items-center justify-center p-4">
          <form onSubmit={handleCreatePromo} className="bg-surface border border-border-strong w-full max-w-lg rounded-2xl p-5 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between pb-2 border-b border-border-subtle">
              <h2 className="text-base font-bold text-text-primary">Buat Aturan Promosi Kasir</h2>
              <button type="button" onClick={() => setIsAddPromoModalOpen(false)} className="p-1 rounded-md text-text-muted hover:text-text-primary">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div>
              <label className="block text-xs font-semibold text-text-secondary mb-1">Nama / Judul Promo *</label>
              <input
                type="text"
                required
                value={promoName}
                onChange={e => setPromoName(e.target.value)}
                placeholder={mode === 'Electronics' ? 'Contoh: Promo Bundling Beli Smartphone Gratis Fast Charger' : 'Contoh: Promo Spesial Beli 2 Gratis 1'}
                className="w-full px-3 py-2 bg-subtle border border-border-strong rounded-lg text-xs text-text-primary focus:outline-none focus:border-primary"
                autoFocus
              />
            </div>

            <div className="grid grid-cols-3 gap-2 text-xs">
              <button
                type="button"
                onClick={() => setPromoType('BuyXGetY')}
                className={`py-2 rounded-lg border font-bold transition-all ${
                  promoType === 'BuyXGetY' ? 'bg-primary text-primary-text border-primary shadow-sm' : 'bg-subtle border-border-subtle text-text-secondary'
                }`}
              >
                Beli X Gratis Y
              </button>
              <button
                type="button"
                onClick={() => setPromoType('BundlingPackage')}
                className={`py-2 rounded-lg border font-bold transition-all ${
                  promoType === 'BundlingPackage' ? 'bg-primary text-primary-text border-primary shadow-sm' : 'bg-subtle border-border-subtle text-text-secondary'
                }`}
              >
                Paket Bundling
              </button>
              <button
                type="button"
                onClick={() => setPromoType('HappyHourDiscount')}
                className={`py-2 rounded-lg border font-bold transition-all ${
                  promoType === 'HappyHourDiscount' ? 'bg-primary text-primary-text border-primary shadow-sm' : 'bg-subtle border-border-subtle text-text-secondary'
                }`}
              >
                Diskon Khusus
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
                <div>
                  <label className="block font-semibold mb-1">Besar Diskon (%):</label>
                  <input
                    type="number"
                    min="1"
                    max="99"
                    value={discountPercent}
                    onChange={e => setDiscountPercent(parseInt(e.target.value) || 10)}
                    className="w-full px-2 py-1.5 bg-card border border-border-strong rounded text-center font-bold font-mono text-sm"
                  />
                </div>
              </div>
            )}

            <div className="flex gap-2 pt-2 border-t border-border-subtle">
              <button
                type="button"
                onClick={() => setIsAddPromoModalOpen(false)}
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

      {/* ========================================================= */}
      {/* MODAL 2: CREATE / EDIT COUPON */}
      {/* ========================================================= */}
      {isCouponModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/75 flex items-center justify-center p-4">
          <form onSubmit={handleSaveCoupon} className="bg-surface border border-border-strong w-full max-w-lg rounded-2xl p-5 space-y-4 shadow-2xl max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-2 border-b border-border-subtle">
              <div className="flex items-center gap-2">
                <Ticket className="w-5 h-5 text-primary" />
                <h2 className="text-base font-bold text-text-primary">
                  {editingCoupon ? 'Edit Kupon Diskon' : 'Buat Kupon Diskon Baru'}
                </h2>
              </div>
              <button type="button" onClick={() => setIsCouponModalOpen(false)} className="p-1 rounded-md text-text-muted hover:text-text-primary">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Code & Name */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-text-secondary mb-1">Kode Kupon *</label>
                <div className="flex gap-1.5">
                  <input
                    type="text"
                    required
                    value={cCode}
                    onChange={e => setCCode(e.target.value.toUpperCase())}
                    placeholder="HEMAT10K"
                    className="w-full px-3 py-2 bg-subtle border border-border-strong rounded-lg text-xs font-mono font-bold text-primary uppercase focus:outline-none focus:border-primary"
                  />
                  <button
                    type="button"
                    onClick={() => setCCode(`PROMO${Math.floor(100 + Math.random() * 900)}`)}
                    className="px-2.5 py-1.5 bg-subtle hover:bg-card-hover border border-border-subtle rounded-lg text-[10px] font-bold text-text-secondary"
                    title="Buat Kode Acak"
                  >
                    Acak
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-text-secondary mb-1">Nama Promo *</label>
                <input
                  type="text"
                  required
                  value={cName}
                  onChange={e => setCName(e.target.value)}
                  placeholder="Voucher Belanja Hemat"
                  className="w-full px-3 py-2 bg-subtle border border-border-strong rounded-lg text-xs text-text-primary focus:outline-none focus:border-primary"
                />
              </div>
            </div>

            {/* Description */}
            <div>
              <label className="block text-xs font-semibold text-text-secondary mb-1">Keterangan / Deskripsi</label>
              <input
                type="text"
                value={cDescription}
                onChange={e => setCDescription(e.target.value)}
                placeholder="Potongan belanja spesial pelanggan"
                className="w-full px-3 py-2 bg-subtle border border-border-strong rounded-lg text-xs text-text-primary focus:outline-none focus:border-primary"
              />
            </div>

            {/* Discount Type & Value */}
            <div className="grid grid-cols-2 gap-3 p-3 bg-subtle rounded-xl border border-border-subtle">
              <div>
                <label className="block text-xs font-semibold text-text-secondary mb-1">Jenis Potongan</label>
                <select
                  value={cDiscountType}
                  onChange={e => setCDiscountType(e.target.value as any)}
                  className="w-full px-3 py-2 bg-card border border-border-strong rounded-lg text-xs font-semibold text-text-primary focus:outline-none focus:border-primary"
                >
                  <option value="FixedAmount">Nominal Tetap (Rp)</option>
                  <option value="Percentage">Persentase (%)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-text-secondary mb-1">
                  {cDiscountType === 'FixedAmount' ? 'Nilai Potongan (Rp) *' : 'Persentase Diskon (%) *'}
                </label>
                <input
                  type="number"
                  required
                  min="1"
                  value={cDiscountValue}
                  onChange={e => setCDiscountValue(parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2 bg-card border border-border-strong rounded-lg text-xs font-mono font-bold text-text-primary focus:outline-none focus:border-primary"
                />
              </div>
            </div>

            {/* Min Spend & Max Discount */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-text-secondary mb-1">Minimal Belanja (Rp)</label>
                <input
                  type="number"
                  value={cMinSpend}
                  onChange={e => setCMinSpend(parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2 bg-subtle border border-border-strong rounded-lg text-xs font-mono text-text-primary focus:outline-none focus:border-primary"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-text-secondary mb-1">Max Diskon (0 = Bebas)</label>
                <input
                  type="number"
                  value={cMaxDiscount}
                  onChange={e => setCMaxDiscount(parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2 bg-subtle border border-border-strong rounded-lg text-xs font-mono text-text-primary focus:outline-none focus:border-primary"
                />
              </div>
            </div>

            {/* Target Tier & Quota */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-text-secondary mb-1">Khusus Tier Member</label>
                <select
                  value={cAllowedTier}
                  onChange={e => setCAllowedTier(e.target.value)}
                  className="w-full px-3 py-2 bg-subtle border border-border-strong rounded-lg text-xs font-bold text-text-primary focus:outline-none focus:border-primary"
                >
                  <option value="ALL">Semua Pelanggan / Member</option>
                  <option value="BRONZE">Khusus Bronze Ke Atas</option>
                  <option value="SILVER">Khusus Silver Ke Atas</option>
                  <option value="GOLD">Khusus Gold Ke Atas</option>
                  <option value="PLATINUM">Khusus Platinum VIP</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-text-secondary mb-1">Batas Kuota Pemakaian</label>
                <input
                  type="number"
                  value={cUsageLimit}
                  onChange={e => setCUsageLimit(parseInt(e.target.value) || 0)}
                  placeholder="0 = Unlimited"
                  className="w-full px-3 py-2 bg-subtle border border-border-strong rounded-lg text-xs font-mono text-text-primary focus:outline-none focus:border-primary"
                />
              </div>
            </div>

            {/* Date Range */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-text-secondary mb-1">Berlaku Mulai</label>
                <input
                  type="date"
                  value={cStartDate}
                  onChange={e => setCStartDate(e.target.value)}
                  className="w-full px-3 py-2 bg-subtle border border-border-strong rounded-lg text-xs font-mono text-text-primary focus:outline-none focus:border-primary"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-text-secondary mb-1">Berlaku Hingga</label>
                <input
                  type="date"
                  value={cEndDate}
                  onChange={e => setCEndDate(e.target.value)}
                  className="w-full px-3 py-2 bg-subtle border border-border-strong rounded-lg text-xs font-mono text-text-primary focus:outline-none focus:border-primary"
                />
              </div>
            </div>

            {/* Active Switch */}
            <div className="flex items-center justify-between p-3 bg-subtle rounded-xl border border-border-subtle">
              <span className="text-xs font-bold text-text-primary">Status Kupon Aktif di POS Kasir</span>
              <button
                type="button"
                onClick={() => setCIsActive(!cIsActive)}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold border transition-all cursor-pointer ${
                  cIsActive ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-600' : 'bg-card border-border-subtle text-text-muted'
                }`}
              >
                {cIsActive ? <ToggleRight className="w-4 h-4" /> : <ToggleLeft className="w-4 h-4" />}
                <span>{cIsActive ? 'Aktif' : 'Nonaktif'}</span>
              </button>
            </div>

            {/* Modal Actions */}
            <div className="flex gap-2 pt-2 border-t border-border-subtle">
              <button
                type="button"
                onClick={() => setIsCouponModalOpen(false)}
                className="flex-1 py-2.5 bg-subtle hover:bg-card-hover border border-border-subtle rounded-lg text-xs font-semibold transition-colors"
              >
                Batal
              </button>
              <button
                type="submit"
                className="flex-1 py-2.5 bg-primary hover:bg-primary-hover text-primary-text rounded-lg text-xs font-bold shadow-sm transition-all"
              >
                {editingCoupon ? 'Simpan Perubahan Kupon' : 'Terbitkan Kupon Diskon'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

export default PromotionsPage;

