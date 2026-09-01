import React, { useState } from 'react';
import { 
  X, 
  RefreshCw, 
  Smartphone, 
  Laptop, 
  DollarSign, 
  CheckCircle2, 
  AlertCircle,
  Sparkles,
  Layers,
  FileText
} from 'lucide-react';
import { useToastStore } from '../../store/useToastStore';

export interface TradeInData {
  customerName: string;
  customerPhone: string;
  deviceBrandModel: string;
  imeiOrSerial: string;
  conditionGrade: string;
  functionalNotes: string;
  accessoriesIncluded: string;
  valuationAmount: number;
}

interface TradeInModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApplyTradeIn: (tradeIn: TradeInData) => void;
  currentTradeIn?: TradeInData | null;
  onRemoveTradeIn?: () => void;
}

export const TradeInModal: React.FC<TradeInModalProps> = ({
  isOpen,
  onClose,
  onApplyTradeIn,
  currentTradeIn,
  onRemoveTradeIn
}) => {
  const [customerName, setCustomerName] = useState(currentTradeIn?.customerName || '');
  const [customerPhone, setCustomerPhone] = useState(currentTradeIn?.customerPhone || '');
  const [deviceType, setDeviceType] = useState('Smartphone');
  const [deviceBrandModel, setDeviceBrandModel] = useState(currentTradeIn?.deviceBrandModel || '');
  const [imeiOrSerial, setImeiOrSerial] = useState(currentTradeIn?.imeiOrSerial || '');
  const [conditionGrade, setConditionGrade] = useState(currentTradeIn?.conditionGrade || 'Grade A');
  const [functionalNotes, setFunctionalNotes] = useState(currentTradeIn?.functionalNotes || 'Fungsi normal 100%, iCloud/Google Account sudah logout');
  const [accessoriesIncluded, setAccessoriesIncluded] = useState(currentTradeIn?.accessoriesIncluded || 'Unit + Box');
  const [valuationAmount, setValuationAmount] = useState<string>(
    currentTradeIn ? currentTradeIn.valuationAmount.toString() : ''
  );

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const valAmount = parseFloat(valuationAmount);

    if (!customerName.trim() || !deviceBrandModel.trim() || !valAmount || valAmount <= 0) {
      useToastStore.getState().showToast('Lengkapi nama pelanggan, model perangkat bekas, dan nominal taksiran harga.', 'warning');
      return;
    }

    onApplyTradeIn({
      customerName: customerName.trim(),
      customerPhone: customerPhone.trim(),
      deviceBrandModel: deviceBrandModel.trim(),
      imeiOrSerial: imeiOrSerial.trim(),
      conditionGrade,
      functionalNotes: functionalNotes.trim(),
      accessoriesIncluded: accessoriesIncluded.trim(),
      valuationAmount: valAmount
    });

    useToastStore.getState().showToast(`Potongan Tukar Tambah Rp ${valAmount.toLocaleString('id-ID')} diterapkan ke kasir!`, 'success');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 select-none">
      <div className="bg-surface border border-border-strong w-full max-w-lg rounded-2xl p-5 space-y-4 shadow-2xl animate-in fade-in zoom-in-95 duration-100">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-border-subtle">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-purple-500/10 text-purple-600 flex items-center justify-center font-bold">
              <RefreshCw className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-text-primary">Tukar Tambah Unit Bekas (Trade-In)</h2>
              <p className="text-xs text-text-secondary">Taksir unit lama pelanggan untuk memotong pembayaran unit baru di kasir.</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-subtle text-text-muted hover:text-text-primary"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3.5 text-xs">
          {/* Data Pelanggan */}
          <div className="p-3 bg-subtle rounded-xl border border-border-subtle space-y-2">
            <span className="font-bold text-[11px] text-text-primary block">1. Identitas Pelanggan:</span>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[10px] font-bold text-text-muted mb-1">Nama Pemilik *</label>
                <input
                  type="text"
                  required
                  value={customerName}
                  onChange={e => setCustomerName(e.target.value)}
                  placeholder="Budi Santoso"
                  className="w-full px-2.5 py-1.5 bg-card border border-border-subtle rounded-lg text-text-primary font-semibold"
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-text-muted mb-1">No. WhatsApp / HP</label>
                <input
                  type="text"
                  value={customerPhone}
                  onChange={e => setCustomerPhone(e.target.value)}
                  placeholder="0812-xxxx-xxxx"
                  className="w-full px-2.5 py-1.5 bg-card border border-border-subtle rounded-lg text-text-primary font-mono"
                />
              </div>
            </div>
          </div>

          {/* Data Perangkat Bekas */}
          <div className="p-3 bg-subtle rounded-xl border border-border-subtle space-y-2">
            <span className="font-bold text-[11px] text-text-primary block">2. Perangkat Tukar Tambah:</span>
            <div className="grid grid-cols-3 gap-2">
              <div className="col-span-2">
                <label className="block text-[10px] font-bold text-text-muted mb-1">Merek & Model Gadget *</label>
                <input
                  type="text"
                  required
                  value={deviceBrandModel}
                  onChange={e => setDeviceBrandModel(e.target.value)}
                  placeholder="Contoh: iPhone 11 64GB Black"
                  className="w-full px-2.5 py-1.5 bg-card border border-border-subtle rounded-lg text-text-primary font-semibold"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-text-muted mb-1">IMEI / Serial</label>
                <input
                  type="text"
                  value={imeiOrSerial}
                  onChange={e => setImeiOrSerial(e.target.value)}
                  placeholder="35xxxx / Serial"
                  className="w-full px-2.5 py-1.5 bg-card border border-border-subtle rounded-lg text-text-primary font-mono text-[11px]"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[10px] font-bold text-text-muted mb-1">Grade Kondisi Fisik</label>
                <select
                  value={conditionGrade}
                  onChange={e => setConditionGrade(e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-card border border-border-subtle rounded-lg text-text-primary font-bold"
                >
                  <option value="Grade A">Grade A (Mulus Like New)</option>
                  <option value="Grade B">Grade B (Lecet Halus Wajar)</option>
                  <option value="Grade C">Grade C (Lecet / Dent Terlihat)</option>
                  <option value="Grade D / Rusak">Grade D (Layar Retak / Minus Fungsi)</option>
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-bold text-text-muted mb-1">Kelengkapan</label>
                <input
                  type="text"
                  value={accessoriesIncluded}
                  onChange={e => setAccessoriesIncluded(e.target.value)}
                  placeholder="Fullset / Unit Only / Charger"
                  className="w-full px-2.5 py-1.5 bg-card border border-border-subtle rounded-lg text-text-primary"
                />
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-text-muted mb-1">Catatan Fungsi & Baterai</label>
              <input
                type="text"
                value={functionalNotes}
                onChange={e => setFunctionalNotes(e.target.value)}
                placeholder="Face ID / Fingerprint Normal, BH 85%, Layar Original..."
                className="w-full px-2.5 py-1.5 bg-card border border-border-subtle rounded-lg text-text-primary"
              />
            </div>
          </div>

          {/* Nilai Taksiran Harga */}
          <div className="p-3 bg-purple-500/10 border border-purple-500/30 rounded-xl space-y-1.5">
            <label className="block font-bold text-xs text-purple-700 dark:text-purple-300">
              3. Nilai Taksiran Tukar Tambah / Potongan Kasir (Rp) *
            </label>
            <div className="relative">
              <span className="absolute left-3 top-2 font-mono font-bold text-purple-600">Rp</span>
              <input
                type="number"
                required
                value={valuationAmount}
                onChange={e => setValuationAmount(e.target.value)}
                placeholder="3500000"
                className="w-full pl-10 pr-3 py-2 bg-card border border-purple-500/40 rounded-lg text-sm font-bold font-mono text-text-primary focus:outline-none focus:border-purple-600"
              />
            </div>
            <p className="text-[10px] text-text-muted">
              Nominal ini akan otomatis memotong total belanja pada keranjang kasir saat ini.
            </p>
          </div>

          <div className="pt-2 flex items-center justify-between gap-2 border-t border-border-subtle">
            {currentTradeIn && onRemoveTradeIn ? (
              <button
                type="button"
                onClick={() => {
                  onRemoveTradeIn();
                  onClose();
                }}
                className="px-3 py-2 bg-status-danger/10 hover:bg-status-danger/20 text-status-danger rounded-lg font-bold transition-colors"
              >
                Hapus Potongan Trade-In
              </button>
            ) : (
              <div />
            )}

            <div className="flex gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 bg-subtle hover:bg-card-hover border border-border-subtle rounded-lg text-text-secondary font-semibold"
              >
                Batal
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-bold shadow-md flex items-center gap-1.5"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Terapkan Potongan</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
