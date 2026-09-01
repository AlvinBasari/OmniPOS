import React, { useState, useEffect } from 'react';
import { 
  Radio, 
  Search, 
  Check, 
  AlertCircle, 
  Sparkles, 
  Calendar, 
  Database, 
  Coins, 
  Filter,
  Flame
} from 'lucide-react';
import { Product, SimCardSpecialNumber } from '../../types';

interface SimCardSelectModalProps {
  isOpen: boolean;
  product: Product | null;
  onClose: () => void;
  onSelectSimCard: (sim: SimCardSpecialNumber) => void;
}

export const SimCardSelectModal: React.FC<SimCardSelectModalProps> = ({
  isOpen,
  product,
  onClose,
  onSelectSimCard
}) => {
  const [simCards, setSimCards] = useState<SimCardSpecialNumber[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedProvider, setSelectedProvider] = useState('ALL');
  const [selectedTier, setSelectedTier] = useState('ALL');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      fetchAvailableSimCards();
    }
  }, [isOpen]);

  const fetchAvailableSimCards = async () => {
    try {
      setIsLoading(true);
      const res = await fetch('/api/v1/electronics/sim-cards?status=Available');
      if (res.ok) {
        const data = await res.json();
        setSimCards(data);
      }
    } catch {
      setSimCards([]);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  const providers = ['ALL', 'Telkomsel', 'Indosat Ooredoo IM3', 'XL Axiata', 'Axis', 'Smartfren', 'Tri (3)'];
  const tiers = ['ALL', 'Panca Super', 'Kwartet', 'Triple', 'Tangga Seri', 'Mirror / Kembar', 'VIP Platinum', 'Reguler Cantik'];

  const filtered = simCards.filter(s => {
    const matchQuery = s.msisdn.toLowerCase().includes(searchQuery.toLowerCase()) ||
                       (s.iccid && s.iccid.toLowerCase().includes(searchQuery.toLowerCase())) ||
                       s.provider.toLowerCase().includes(searchQuery.toLowerCase()) ||
                       s.patternTier.toLowerCase().includes(searchQuery.toLowerCase());
    const matchProvider = selectedProvider === 'ALL' || s.provider.toLowerCase().includes(selectedProvider.toLowerCase());
    const matchTier = selectedTier === 'ALL' || s.patternTier.toLowerCase() === selectedTier.toLowerCase();
    return matchQuery && matchProvider && matchTier;
  });

  const getProviderColor = (provider: string) => {
    const p = provider.toLowerCase();
    if (p.includes('telkomsel')) return 'bg-rose-500/10 text-rose-600 border-rose-500/20';
    if (p.includes('indosat') || p.includes('im3')) return 'bg-amber-500/10 text-amber-600 border-amber-500/20';
    if (p.includes('xl')) return 'bg-blue-500/10 text-blue-600 border-blue-500/20';
    if (p.includes('axis')) return 'bg-purple-500/10 text-purple-600 border-purple-500/20';
    if (p.includes('smartfren')) return 'bg-pink-500/10 text-pink-600 border-pink-500/20';
    if (p.includes('tri') || p.includes('3')) return 'bg-orange-500/10 text-orange-600 border-orange-500/20';
    return 'bg-subtle text-text-secondary border-border-subtle';
  };

  const getDaysLeft = (expiryDateStr: string) => {
    const diff = new Date(expiryDateStr).getTime() - Date.now();
    return Math.ceil(diff / (1000 * 3600 * 24));
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 select-none">
      <div className="w-full max-w-2xl bg-card border border-border-strong rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-4 bg-surface border-b border-border-subtle flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center font-bold">
              <Radio className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-sm text-text-primary">
                  Pilih Kartu Perdana & Nomor Cantik
                </h3>
                <span className="px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-600 border border-amber-500/20 text-[10px] font-bold flex items-center gap-1">
                  <Sparkles className="w-3 h-3" /> Special VIP
                </span>
              </div>
              <p className="text-xs text-text-muted">
                {product ? product.name : 'Pilih nomor dari inventori kartu seluler'}
              </p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="w-8 h-8 rounded-lg hover:bg-card-hover flex items-center justify-center text-text-muted hover:text-text-primary text-sm font-bold"
          >
            ✕
          </button>
        </div>

        {/* Filter & Search Bar */}
        <div className="p-3 bg-surface/50 border-b border-border-subtle space-y-2">
          <div className="relative">
            <Search className="w-4 h-4 text-text-muted absolute left-3 top-2.5" />
            <input
              type="text"
              autoFocus
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Ketik 4 digit ekor (misal: 8888, 9999, 1234) atau cari provider..."
              className="w-full pl-9 pr-3 py-2 bg-subtle border border-border-subtle rounded-xl text-xs text-text-primary font-mono focus:outline-none focus:border-primary"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2 text-xs">
            <div className="flex items-center gap-1 overflow-x-auto pb-1 max-w-full">
              <span className="text-[11px] font-semibold text-text-muted mr-1">Provider:</span>
              {providers.map((p) => (
                <button
                  key={p}
                  onClick={() => setSelectedProvider(p)}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all shrink-0 ${
                    selectedProvider === p 
                      ? 'bg-primary text-primary-text' 
                      : 'bg-subtle hover:bg-card-hover text-text-muted border border-border-subtle'
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* List of Special SIM Numbers */}
        <div className="p-3 overflow-y-auto flex-1 space-y-2">
          {isLoading ? (
            <div className="p-10 text-center text-xs text-text-muted">Memuat daftar nomor perdana cantik...</div>
          ) : filtered.length === 0 ? (
            <div className="p-8 text-center space-y-3">
              <AlertCircle className="w-10 h-10 text-status-warning mx-auto" />
              <p className="text-sm font-bold text-text-primary">Nomor Tidak Ditemukan</p>
              <p className="text-xs text-text-muted max-w-md mx-auto">
                Tidak ada nomor perdana tersedia dengan filter pencarian "{searchQuery}".
              </p>
              {searchQuery.trim() && (
                <button
                  onClick={() => {
                    onSelectSimCard({
                      id: 'custom-' + Date.now(),
                      msisdn: searchQuery.trim(),
                      provider: selectedProvider !== 'ALL' ? selectedProvider : 'Operator Umum',
                      patternTier: 'Nomor Custom',
                      defaultQuotaGb: '10GB',
                      mainBalance: 0,
                      expiryDate: new Date(Date.now() + 90 * 24 * 3600 * 1000).toISOString(),
                      buyPrice: 0,
                      sellPrice: product ? product.sellPrice : 50000,
                      status: 'Available',
                      notes: 'Input nomor manual di kasir'
                    });
                  }}
                  className="px-4 py-2 bg-primary text-primary-text rounded-xl text-xs font-bold shadow-md hover:bg-primary-hover"
                >
                  Gunakan Nomor Manual: "{searchQuery}" (Rp {product?.sellPrice.toLocaleString('id-ID') || '50.000'})
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {filtered.map((s) => {
                const daysLeft = getDaysLeft(s.expiryDate);
                const isExpiringSoon = daysLeft <= 30;

                return (
                  <button
                    key={s.id}
                    onClick={() => onSelectSimCard(s)}
                    className="p-3 rounded-xl bg-subtle hover:bg-primary/10 border border-border-subtle hover:border-primary/40 text-left transition-all group flex flex-col justify-between relative overflow-hidden"
                  >
                    <div>
                      <div className="flex items-center justify-between gap-2 mb-1.5">
                        <span className={`px-2 py-0.5 rounded-md border text-[10px] font-bold ${getProviderColor(s.provider)}`}>
                          {s.provider}
                        </span>
                        <span className="px-1.5 py-0.5 rounded bg-surface border border-border-subtle text-[10px] font-semibold text-text-muted">
                          {s.patternTier}
                        </span>
                      </div>

                      <div className="font-mono font-black text-base text-text-primary group-hover:text-primary tracking-wider my-1">
                        {s.msisdn}
                      </div>

                      <div className="flex flex-wrap items-center gap-2 text-[11px] text-text-muted mt-1">
                        <span className="flex items-center gap-1">
                          <Database className="w-3 h-3 text-primary" /> {s.defaultQuotaGb || '0GB'}
                        </span>
                        {s.mainBalance > 0 && (
                          <span className="flex items-center gap-1">
                            <Coins className="w-3 h-3 text-amber-500" /> Rp {s.mainBalance.toLocaleString('id-ID')}
                          </span>
                        )}
                        <span className={`flex items-center gap-1 ${isExpiringSoon ? 'text-rose-500 font-bold' : ''}`}>
                          <Calendar className="w-3 h-3" /> H-{daysLeft}
                        </span>
                      </div>
                    </div>

                    <div className="mt-3 pt-2 border-t border-border-subtle flex items-center justify-between">
                      <span className="text-[10px] text-text-muted">Harga Jual:</span>
                      <div className="text-right">
                        <span className="text-xs font-black text-emerald-600">
                          Rp {s.sellPrice.toLocaleString('id-ID')}
                        </span>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-3 bg-surface border-t border-border-subtle flex justify-between items-center text-xs text-text-muted">
          <span>Tersedia: <strong>{simCards.length} nomor perdana</strong></span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-subtle hover:bg-card-hover rounded-xl font-semibold text-text-secondary"
          >
            Batal
          </button>
        </div>
      </div>
    </div>
  );
};
