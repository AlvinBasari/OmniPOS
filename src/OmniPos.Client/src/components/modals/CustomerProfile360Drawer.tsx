import React, { useState, useEffect } from 'react';
import { 
  X, 
  User, 
  Phone, 
  Mail, 
  MapPin, 
  CreditCard, 
  Award, 
  TrendingUp, 
  ShoppingBag, 
  Calendar, 
  Coins, 
  Receipt, 
  DollarSign, 
  Flame, 
  Clock, 
  MessageSquare,
  FileText,
  ExternalLink,
  Wallet
} from 'lucide-react';
import { Customer, Customer360Profile } from '../../types';
import { useToastStore } from '../../store/useToastStore';

interface CustomerProfile360DrawerProps {
  customer: Customer | null;
  isOpen: boolean;
  onClose: () => void;
  onOpenTopupDeposit?: (c: Customer) => void;
  onOpenKasbonModal?: (c: Customer) => void;
}

export const CustomerProfile360Drawer: React.FC<CustomerProfile360DrawerProps> = ({
  customer,
  isOpen,
  onClose,
  onOpenTopupDeposit,
  onOpenKasbonModal
}) => {
  const [profileData, setProfileData] = useState<Customer360Profile | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'orders' | 'points' | 'deposit'>('overview');

  useEffect(() => {
    if (isOpen && customer) {
      fetch360Data(customer.id);
      setActiveTab('overview');
    }
  }, [isOpen, customer]);

  const fetch360Data = async (customerId: string) => {
    try {
      setIsLoading(true);
      const res = await fetch(`/api/v1/customers/${customerId}/profile360`);
      if (res.ok) {
        const data: Customer360Profile = await res.json();
        setProfileData(data);
      }
    } catch {
      useToastStore.getState().showToast('Gagal memuat profil analitik pelanggan.', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen || !customer) return null;

  // Free WhatsApp click-to-chat generator
  const handleSendWhatsAppInfo = () => {
    if (!customer.phoneNumber) {
      useToastStore.getState().showToast(`Pelanggan ${customer.name} tidak memiliki nomor WhatsApp.`, 'error');
      return;
    }
    let phone = customer.phoneNumber.replace(/[^0-9]/g, '');
    if (phone.startsWith('0')) phone = '62' + phone.slice(1);

    const msg = `Halo Kak ${customer.name}!\n\nTerima kasih telah menjadi pelanggan setia toko kami. Berikut adalah status kartu member Anda saat ini:\n\n` +
      `🎖️ *Tier Member:* ${customer.memberTier || 'BRONZE'}\n` +
      `⭐ *Poin Loyalitas:* ${(customer.loyaltyPoints || 0).toLocaleString('id-ID')} Poin\n` +
      `💳 *Saldo Deposit Belanja:* Rp ${(customer.depositBalance || 0).toLocaleString('id-ID')}\n` +
      (customer.totalReceivable > 0 ? `⚠️ *Tagihan Kasbon:* Rp ${customer.totalReceivable.toLocaleString('id-ID')}\n` : '') +
      `\nKunjungi toko kami untuk menikmati berbagai promo menarik. Terima kasih banyak! 🙏`;

    window.open(`https://api.whatsapp.com/send?phone=${phone}&text=${encodeURIComponent(msg)}`, '_blank');
  };

  const getTierColor = (tier?: string) => {
    switch (tier?.toUpperCase()) {
      case 'PLATINUM':
      case 'VIP':
        return 'from-purple-600 to-indigo-700 text-white';
      case 'GOLD':
        return 'from-amber-500 to-yellow-600 text-white';
      case 'SILVER':
        return 'from-slate-400 to-zinc-600 text-white';
      default:
        return 'from-amber-700 to-amber-900 text-white';
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex justify-end select-none animate-in fade-in duration-200">
      <div className="w-full max-w-2xl bg-card border-l border-border-subtle h-full shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-right duration-200">
        
        {/* Drawer Header */}
        <div className="p-4 bg-surface border-b border-border-subtle flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-bold">
              <Award className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-text-primary flex items-center gap-2">
                <span>Profil 360° Pelanggan</span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-primary/10 text-primary border border-primary/20">
                  {customer.memberCode || 'MBR-REG'}
                </span>
              </h3>
              <p className="text-[11px] text-text-secondary">Analitik riwayat belanja, preferensi & buku loyalitas</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {customer.phoneNumber && (
              <button
                type="button"
                onClick={handleSendWhatsAppInfo}
                title="Kirim Ringkasan Member via WhatsApp"
                className="px-2.5 py-1.5 rounded-lg bg-emerald-500/10 text-emerald-600 border border-emerald-500/30 text-xs font-bold hover:bg-emerald-500/20 flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <MessageSquare className="w-3.5 h-3.5" />
                <span>Kirim WA</span>
              </button>
            )}
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-text-muted hover:text-text-primary hover:bg-subtle transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Digital Member Card Banner */}
        <div className="p-4 bg-subtle border-b border-border-subtle">
          <div className={`p-4 rounded-2xl bg-gradient-to-r ${getTierColor(customer.memberTier)} shadow-md relative overflow-hidden space-y-3`}>
            {/* Background Pattern */}
            <div className="absolute right-[-20px] bottom-[-20px] opacity-15 pointer-events-none">
              <Award className="w-40 h-40" />
            </div>

            <div className="flex items-start justify-between relative z-10">
              <div>
                <span className="text-[10px] font-black uppercase tracking-widest opacity-80 block">
                  KARTU MEMBER DIGITAL
                </span>
                <h2 className="text-lg font-black tracking-wide drop-shadow-xs">{customer.name}</h2>
                <p className="text-xs opacity-90 font-mono">{customer.phoneNumber || 'Tanpa No. WhatsApp'}</p>
              </div>
              <div className="text-right">
                <span className="px-2.5 py-1 rounded-full bg-white/20 backdrop-blur-xs text-[11px] font-black tracking-wider uppercase border border-white/30">
                  {customer.memberTier || 'BRONZE'} TIER
                </span>
                <p className="text-[10px] opacity-75 mt-1 font-mono">{customer.customerGroup}</p>
              </div>
            </div>

            {/* Balances Grid */}
            <div className="grid grid-cols-3 gap-2 pt-2 border-t border-white/20 relative z-10 text-xs">
              <div className="bg-black/20 p-2 rounded-xl backdrop-blur-xs">
                <span className="text-[10px] opacity-80 flex items-center gap-1">
                  <Coins className="w-3 h-3" /> Poin Member:
                </span>
                <p className="font-extrabold font-mono text-sm">
                  {(customer.loyaltyPoints || 0).toLocaleString('id-ID')} Poin
                </p>
              </div>
              <div className="bg-black/20 p-2 rounded-xl backdrop-blur-xs">
                <span className="text-[10px] opacity-80 flex items-center gap-1">
                  <Wallet className="w-3 h-3" /> Saldo Deposit:
                </span>
                <p className="font-extrabold font-mono text-sm">
                  Rp {(customer.depositBalance || 0).toLocaleString('id-ID')}
                </p>
              </div>
              <div className="bg-black/20 p-2 rounded-xl backdrop-blur-xs">
                <span className="text-[10px] opacity-80 flex items-center gap-1">
                  <CreditCard className="w-3 h-3" /> Kasbon Piutang:
                </span>
                <p className={`font-extrabold font-mono text-sm ${customer.totalReceivable > 0 ? 'text-amber-200' : 'text-emerald-200'}`}>
                  {customer.totalReceivable > 0 ? `Rp ${customer.totalReceivable.toLocaleString('id-ID')}` : 'Rp 0 (Lunas)'}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-border-subtle bg-surface px-4 pt-2 gap-4 text-xs font-bold">
          <button
            onClick={() => setActiveTab('overview')}
            className={`pb-2.5 border-b-2 transition-colors cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'overview' ? 'border-primary text-primary' : 'border-transparent text-text-secondary hover:text-text-primary'
            }`}
          >
            <TrendingUp className="w-3.5 h-3.5" /> Ringkasan 360°
          </button>
          <button
            onClick={() => setActiveTab('orders')}
            className={`pb-2.5 border-b-2 transition-colors cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'orders' ? 'border-primary text-primary' : 'border-transparent text-text-secondary hover:text-text-primary'
            }`}
          >
            <ShoppingBag className="w-3.5 h-3.5" /> Riwayat Belanja ({profileData?.recentOrders?.length || 0})
          </button>
          <button
            onClick={() => setActiveTab('points')}
            className={`pb-2.5 border-b-2 transition-colors cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'points' ? 'border-primary text-primary' : 'border-transparent text-text-secondary hover:text-text-primary'
            }`}
          >
            <Coins className="w-3.5 h-3.5" /> Mutasi Poin ({profileData?.pointsHistory?.length || 0})
          </button>
          <button
            onClick={() => setActiveTab('deposit')}
            className={`pb-2.5 border-b-2 transition-colors cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'deposit' ? 'border-primary text-primary' : 'border-transparent text-text-secondary hover:text-text-primary'
            }`}
          >
            <Wallet className="w-3.5 h-3.5" /> Dompet Deposit ({profileData?.depositHistory?.length || 0})
          </button>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {isLoading ? (
            <div className="py-20 text-center text-xs text-text-muted">Memuat data analitik pelanggan 360°...</div>
          ) : activeTab === 'overview' ? (
            <div className="space-y-4">
              
              {/* 4 Metrics Cards */}
              <div className="grid grid-cols-4 gap-2.5">
                <div className="p-3 bg-card border border-border-subtle rounded-xl">
                  <span className="text-[10px] text-text-muted block">Lifetime Value (LTV):</span>
                  <p className="text-sm font-extrabold font-mono text-primary mt-0.5">
                    Rp {(profileData?.metrics.totalSpent || 0).toLocaleString('id-ID')}
                  </p>
                </div>
                <div className="p-3 bg-card border border-border-subtle rounded-xl">
                  <span className="text-[10px] text-text-muted block">Jumlah Kunjungan:</span>
                  <p className="text-sm font-extrabold font-mono text-text-primary mt-0.5">
                    {(profileData?.metrics.visitCount || 0)} Transaksi
                  </p>
                </div>
                <div className="p-3 bg-card border border-border-subtle rounded-xl">
                  <span className="text-[10px] text-text-muted block">Rata-rata Keranjang:</span>
                  <p className="text-sm font-extrabold font-mono text-emerald-600 mt-0.5">
                    Rp {Math.round(profileData?.metrics.averageOrderValue || 0).toLocaleString('id-ID')}
                  </p>
                </div>
                <div className="p-3 bg-card border border-border-subtle rounded-xl">
                  <span className="text-[10px] text-text-muted block">Terakhir Belanja:</span>
                  <p className="text-xs font-bold font-mono text-text-primary mt-0.5 truncate">
                    {profileData?.metrics.lastVisitDate
                      ? new Date(profileData.metrics.lastVisitDate).toLocaleDateString('id-ID', { day: '2-digit', month: 'short' })
                      : '-'}
                  </p>
                </div>
              </div>

              {/* Top 5 Products Purchased */}
              <div className="p-4 bg-card border border-border-subtle rounded-xl space-y-3">
                <h4 className="text-xs font-bold text-text-primary uppercase tracking-wider flex items-center gap-1.5">
                  <Flame className="w-4 h-4 text-amber-500" />
                  <span>Produk Paling Sering Dibeli Pelanggan Ini</span>
                </h4>
                {profileData?.topProducts && profileData.topProducts.length > 0 ? (
                  <div className="space-y-2">
                    {profileData.topProducts.map((p, idx) => (
                      <div key={idx} className="p-2.5 rounded-lg bg-subtle border border-border-subtle flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2.5 truncate">
                          <span className="w-5 h-5 rounded-full bg-primary/10 text-primary font-black flex items-center justify-center text-[10px] shrink-0">
                            {idx + 1}
                          </span>
                          <span className="font-semibold text-text-primary truncate">{p.productName}</span>
                        </div>
                        <div className="text-right shrink-0">
                          <span className="font-bold text-primary font-mono">{p.totalQuantity}x Beli</span>
                          <span className="text-[10px] text-text-muted block font-mono">
                            Rp {p.totalRevenue.toLocaleString('id-ID')}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-text-muted italic text-center py-4">
                    Belum ada riwayat pembelian produk yang tercatat.
                  </p>
                )}
              </div>

              {/* Customer Notes / Preferences */}
              {customer.notes && (
                <div className="p-3.5 bg-amber-500/10 border border-amber-500/20 rounded-xl text-xs space-y-1">
                  <span className="font-bold text-amber-700 flex items-center gap-1">
                    <FileText className="w-3.5 h-3.5" /> Catatan Khusus Pelanggan:
                  </span>
                  <p className="text-text-primary leading-relaxed">{customer.notes}</p>
                </div>
              )}

              {/* Action Buttons */}
              <div className="grid grid-cols-2 gap-2 pt-2">
                {onOpenTopupDeposit && (
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onOpenTopupDeposit(customer);
                    }}
                    className="py-2.5 px-3 rounded-xl bg-primary text-primary-text font-bold text-xs hover:bg-primary-hover shadow-sm flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <Wallet className="w-4 h-4" /> Top-Up Saldo Deposit
                  </button>
                )}
                {onOpenKasbonModal && (
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onOpenKasbonModal(customer);
                    }}
                    className="py-2.5 px-3 rounded-xl bg-card border border-border-subtle hover:bg-card-hover font-bold text-xs text-text-primary flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <CreditCard className="w-4 h-4 text-status-warning" /> Buku Kasbon & Piutang
                  </button>
                )}
              </div>
            </div>
          ) : activeTab === 'orders' ? (
            <div className="space-y-2">
              {profileData?.recentOrders && profileData.recentOrders.length > 0 ? (
                profileData.recentOrders.map((o) => (
                  <div key={o.id} className="p-3 bg-card border border-border-subtle rounded-xl flex items-center justify-between text-xs">
                    <div>
                      <p className="font-bold font-mono text-text-primary">{o.invoiceNumber}</p>
                      <p className="text-[11px] text-text-muted mt-0.5">
                        {new Date(o.orderDate).toLocaleString('id-ID', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })} · {o.itemsCount} Item
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold font-mono text-primary">Rp {o.totalAmount.toLocaleString('id-ID')}</p>
                      <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-emerald-500/10 text-emerald-600">
                        {o.status}
                      </span>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-xs text-text-muted text-center py-10 italic">Belum ada struk belanja yang tercatat.</p>
              )}
            </div>
          ) : activeTab === 'points' ? (
            <div className="space-y-2">
              {profileData?.pointsHistory && profileData.pointsHistory.length > 0 ? (
                profileData.pointsHistory.map((pt) => {
                  const isPositive = pt.points > 0;
                  return (
                    <div key={pt.id} className="p-3 bg-card border border-border-subtle rounded-xl flex items-center justify-between text-xs">
                      <div>
                        <p className="font-bold text-text-primary">{pt.reason}</p>
                        <p className="text-[11px] text-text-muted mt-0.5 font-mono">
                          {new Date(pt.createdAt).toLocaleString('id-ID')}
                          {pt.referenceOrderNumber ? ` · Nota #${pt.referenceOrderNumber}` : ''}
                        </p>
                      </div>
                      <div className="text-right font-mono font-bold text-sm">
                        <span className={isPositive ? 'text-emerald-600' : 'text-rose-600'}>
                          {isPositive ? `+${pt.points}` : pt.points} Poin
                        </span>
                      </div>
                    </div>
                  );
                })
              ) : (
                <p className="text-xs text-text-muted text-center py-10 italic">Belum ada mutasi poin loyalitas.</p>
              )}
            </div>
          ) : (
            <div className="space-y-2">
              {profileData?.depositHistory && profileData.depositHistory.length > 0 ? (
                profileData.depositHistory.map((d) => {
                  const isTopup = d.amount > 0;
                  return (
                    <div key={d.id} className="p-3 bg-card border border-border-subtle rounded-xl flex items-center justify-between text-xs">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${
                            isTopup ? 'bg-emerald-500/10 text-emerald-600' : 'bg-primary/10 text-primary'
                          }`}>
                            {d.type === 'TOPUP' ? 'Setoran Top-Up' : 'Bayar Belanja'}
                          </span>
                          <span className="text-[10px] text-text-muted font-mono">{d.paymentMethod}</span>
                        </div>
                        <p className="text-[11px] text-text-muted mt-1 font-mono">
                          {new Date(d.createdAt).toLocaleString('id-ID')} · Kasir: {d.cashierUserId}
                        </p>
                        {d.notes && <p className="text-[11px] text-text-secondary italic">{d.notes}</p>}
                      </div>
                      <div className="text-right">
                        <p className={`font-bold font-mono text-sm ${isTopup ? 'text-emerald-600' : 'text-rose-600'}`}>
                          {isTopup ? `+ Rp ${d.amount.toLocaleString('id-ID')}` : `- Rp ${Math.abs(d.amount).toLocaleString('id-ID')}`}
                        </p>
                        <span className="text-[10px] text-text-muted font-mono">
                          Saldo: Rp {d.balanceAfter.toLocaleString('id-ID')}
                        </span>
                      </div>
                    </div>
                  );
                })
              ) : (
                <p className="text-xs text-text-muted text-center py-10 italic">Belum ada mutasi dompet deposit.</p>
              )}
            </div>
          )}
        </div>

      </div>
    </div>
  );
};
