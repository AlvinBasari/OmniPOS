import React, { useState, useEffect } from 'react';
import { Smartphone, Search, Check, AlertCircle, ShieldCheck } from 'lucide-react';
import { Product, ProductSerialNumber } from '../../types';

interface ImeiSelectModalProps {
  isOpen: boolean;
  product: Product | null;
  onClose: () => void;
  onSelectImei: (serial: ProductSerialNumber) => void;
}

export const ImeiSelectModal: React.FC<ImeiSelectModalProps> = ({
  isOpen,
  product,
  onClose,
  onSelectImei
}) => {
  const [serials, setSerials] = useState<ProductSerialNumber[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (isOpen && product) {
      fetchAvailableSerials(product.id);
    }
  }, [isOpen, product]);

  const fetchAvailableSerials = async (productId: string) => {
    try {
      setIsLoading(true);
      const res = await fetch(`/api/v1/electronics/serials?productId=${productId}&status=Available`);
      if (res.ok) {
        const data = await res.json();
        setSerials(data);
      }
    } catch {
      setSerials([]);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen || !product) return null;

  const filtered = serials.filter(s => 
    s.serialNo.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 select-none">
      <div className="w-full max-w-md bg-card border border-border-strong rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="p-4 bg-surface border-b border-border-subtle flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-bold">
              <Smartphone className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-xs text-text-primary truncate max-w-[240px]">
                {product.name}
              </h3>
              <p className="text-[10px] text-text-muted">
                Pilih atau scan nomor IMEI / Serial unit yang diambil
              </p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="w-7 h-7 rounded-lg hover:bg-card-hover flex items-center justify-center text-text-muted hover:text-text-primary text-sm font-bold"
          >
            ✕
          </button>
        </div>

        {/* Search Bar */}
        <div className="p-3 bg-surface/50 border-b border-border-subtle">
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-text-muted absolute left-3 top-2.5" />
            <input
              type="text"
              autoFocus
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Scan Barcode IMEI / Ketik Nomor..."
              className="w-full pl-8 pr-3 py-1.5 bg-subtle border border-border-subtle rounded-lg text-xs text-text-primary font-mono focus:outline-none focus:border-primary"
            />
          </div>
        </div>

        {/* Serial List */}
        <div className="p-3 overflow-y-auto flex-1 space-y-1.5">
          {isLoading ? (
            <div className="p-6 text-center text-xs text-text-muted">Memeriksa stok IMEI unit...</div>
          ) : filtered.length === 0 ? (
            <div className="p-6 text-center space-y-2">
              <AlertCircle className="w-8 h-8 text-status-warning mx-auto" />
              <p className="text-xs font-semibold text-text-primary">Tidak Ada Nomor IMEI Tersedia</p>
              <p className="text-[11px] text-text-muted">
                Semua stok IMEI telah terjual atau belum didaftarkan di master inventori.
              </p>
              <button
                onClick={() => {
                  // Fallback manual serial
                  if (searchQuery.trim()) {
                    onSelectImei({
                      id: 'custom-' + Date.now(),
                      productId: product.id,
                      productName: product.name,
                      sku: product.sku,
                      serialNo: searchQuery.trim(),
                      status: 'Available',
                      warrantyMonths: 12,
                      warrantyNotes: 'Garansi Toko 1 Tahun'
                    });
                  }
                }}
                disabled={!searchQuery.trim()}
                className="mt-2 px-3 py-1.5 bg-primary text-primary-text rounded-lg text-xs font-bold disabled:opacity-40"
              >
                Gunakan Nomor Manual: "{searchQuery || '...'}"
              </button>
            </div>
          ) : (
            filtered.map((s) => (
              <button
                key={s.id}
                onClick={() => onSelectImei(s)}
                className="w-full p-2.5 rounded-xl bg-subtle hover:bg-primary/10 border border-border-subtle hover:border-primary/40 flex items-center justify-between text-left transition-all group"
              >
                <div>
                  <div className="font-mono font-bold text-xs text-text-primary group-hover:text-primary flex items-center gap-1.5">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                    <span>{s.serialNo}</span>
                  </div>
                  <div className="text-[10px] text-text-muted mt-0.5">
                    {s.warrantyNotes || `${s.warrantyMonths} Bulan Garansi`} • {s.supplierName || 'Distributor'}
                  </div>
                </div>
                <div className="w-6 h-6 rounded-full bg-surface group-hover:bg-primary group-hover:text-primary-text flex items-center justify-center text-text-muted border border-border-subtle">
                  <Check className="w-3 h-3" />
                </div>
              </button>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="p-3 bg-surface border-t border-border-subtle flex justify-between items-center text-[11px] text-text-muted">
          <span>Tersedia: <strong>{serials.length} unit</strong> di toko</span>
          <button
            onClick={onClose}
            className="px-3 py-1.5 bg-subtle hover:bg-card-hover rounded-lg font-semibold text-text-secondary"
          >
            Batal
          </button>
        </div>
      </div>
    </div>
  );
};
