import React, { useState, useEffect } from 'react';
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
  FileText,
  ShieldCheck,
  BatteryCharging,
  Plus,
  Trash2,
  HelpCircle
} from 'lucide-react';
import { useToastStore } from '../../store/useToastStore';
import { DiagnosticChecklistItem, TradeInDeductionItem } from '../../types';

export interface TradeInData {
  customerName: string;
  customerPhone: string;
  customerNik?: string;
  customerAddress?: string;
  deviceBrandModel: string;
  imeiOrSerial: string;
  conditionGrade: string;
  batteryHealthPercent?: number;
  diagnosticChecklistJson?: string;
  marketEstimatePrice?: number;
  deductionsJson?: string;
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

const DEFAULT_DIAGNOSTICS: DiagnosticChecklistItem[] = [
  { key: 'lcd', name: 'Layar & LCD Display', category: 'Screen', status: 'Normal' },
  { key: 'touch', name: 'Touchscreen / Sentuh', category: 'Screen', status: 'Normal' },
  { key: 'faceid', name: 'Face ID / Fingerprint', category: 'SecurityBody', status: 'Normal' },
  { key: 'camera', name: 'Kamera Depan & Belakang', category: 'CameraAudio', status: 'Normal' },
  { key: 'battery', name: 'Baterai & Daya', category: 'Performance', status: 'Normal' },
  { key: 'network', name: 'Sinyal & Wi-Fi', category: 'Connectivity', status: 'Normal' },
  { key: 'audio', name: 'Speaker, Mic & Cas', category: 'CameraAudio', status: 'Normal' },
  { key: 'icloud', name: 'Akun iCloud / Google', category: 'SecurityBody', status: 'Normal' }
];

export const TradeInModal: React.FC<TradeInModalProps> = ({
  isOpen,
  onClose,
  onApplyTradeIn,
  currentTradeIn,
  onRemoveTradeIn
}) => {
  // Identity
  const [customerName, setCustomerName] = useState(currentTradeIn?.customerName || '');
  const [customerPhone, setCustomerPhone] = useState(currentTradeIn?.customerPhone || '');
  const [customerNik, setCustomerNik] = useState(currentTradeIn?.customerNik || '');
  const [customerAddress, setCustomerAddress] = useState(currentTradeIn?.customerAddress || '');

  // Device Info
  const [deviceBrandModel, setDeviceBrandModel] = useState(currentTradeIn?.deviceBrandModel || '');
  const [imeiOrSerial, setImeiOrSerial] = useState(currentTradeIn?.imeiOrSerial || '');
  const [batteryHealthPercent, setBatteryHealthPercent] = useState<number>(currentTradeIn?.batteryHealthPercent || 88);
  const [conditionGrade, setConditionGrade] = useState(currentTradeIn?.conditionGrade || 'Grade A');
  const [accessoriesIncluded, setAccessoriesIncluded] = useState(currentTradeIn?.accessoriesIncluded || 'Unit + Dus + Kabel');
  const [functionalNotes, setFunctionalNotes] = useState(currentTradeIn?.functionalNotes || 'Fungsi normal 100%, iCloud/Google Account sudah logout');

  // Diagnostics & Valuation
  const [diagnostics, setDiagnostics] = useState<DiagnosticChecklistItem[]>(() => {
    if (currentTradeIn?.diagnosticChecklistJson) {
      try { return JSON.parse(currentTradeIn.diagnosticChecklistJson); } catch {}
    }
    return DEFAULT_DIAGNOSTICS;
  });

  const [marketEstimatePrice, setMarketEstimatePrice] = useState<string>(
    currentTradeIn?.marketEstimatePrice ? currentTradeIn.marketEstimatePrice.toString() : '5000000'
  );

  const [deductions, setDeductions] = useState<TradeInDeductionItem[]>(() => {
    if (currentTradeIn?.deductionsJson) {
      try { return JSON.parse(currentTradeIn.deductionsJson); } catch {}
    }
    return [];
  });

  const [valuationAmount, setValuationAmount] = useState<string>(
    currentTradeIn ? currentTradeIn.valuationAmount.toString() : '5000000'
  );

  const [theftFreeGuarantee, setTheftFreeGuarantee] = useState(true);
  const [newMinusReason, setNewMinusReason] = useState('');
  const [newMinusAmount, setNewMinusAmount] = useState('');

  // Auto calculate Valuation & Grade based on diagnostics and deductions
  useEffect(() => {
    const market = parseFloat(marketEstimatePrice) || 0;
    const totalDeductions = deductions.reduce((sum, d) => sum + (d.amount || 0), 0);
    const calculatedValuation = Math.max(0, market - totalDeductions);
    setValuationAmount(calculatedValuation.toString());

    // Auto calculate suggested grade
    const minusCount = diagnostics.filter(d => d.status === 'Minus').length;
    const rusakCount = diagnostics.filter(d => d.status === 'Rusak').length;

    if (rusakCount > 0 || totalDeductions >= market * 0.45) {
      setConditionGrade('Grade D (Minus Berat / Rusak)');
    } else if (minusCount >= 2 || totalDeductions >= market * 0.25 || batteryHealthPercent < 80) {
      setConditionGrade('Grade C (Minus Ringan / Lecet)');
    } else if (minusCount === 1 || totalDeductions > 0 || batteryHealthPercent < 85) {
      setConditionGrade('Grade B (Mulus Pemakaian Normal)');
    } else {
      setConditionGrade('Grade A (Like New / Istimewa)');
    }
  }, [marketEstimatePrice, deductions, diagnostics, batteryHealthPercent]);

  if (!isOpen) return null;

  const handleUpdateDiagnostic = (key: string, status: 'Normal' | 'Minus' | 'Rusak' | 'N/A') => {
    setDiagnostics(prev => prev.map(d => d.key === key ? { ...d, status } : d));
  };

  const handleAddDeduction = () => {
    const amt = parseFloat(newMinusAmount);
    if (!newMinusReason.trim() || isNaN(amt) || amt <= 0) {
      useToastStore.getState().showToast('Isi nama minus dan nominal potongan harga.', 'warning');
      return;
    }
    const item: TradeInDeductionItem = {
      id: Date.now().toString(),
      reason: newMinusReason.trim(),
      amount: amt
    };
    setDeductions(prev => [...prev, item]);
    setNewMinusReason('');
    setNewMinusAmount('');
  };

  const handleRemoveDeduction = (id: string) => {
    setDeductions(prev => prev.filter(d => d.id !== id));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const valAmount = parseFloat(valuationAmount);

    if (!customerName.trim() || !deviceBrandModel.trim() || isNaN(valAmount) || valAmount <= 0) {
      useToastStore.getState().showToast('Lengkapi nama pelanggan, model perangkat bekas, dan nominal taksiran harga.', 'warning');
      return;
    }

    if (!theftFreeGuarantee) {
      useToastStore.getState().showToast('Wajib menyetujui pernyataan bebas sengketa / barang curian.', 'warning');
      return;
    }

    onApplyTradeIn({
      customerName: customerName.trim(),
      customerPhone: customerPhone.trim(),
      customerNik: customerNik.trim() || undefined,
      customerAddress: customerAddress.trim() || undefined,
      deviceBrandModel: deviceBrandModel.trim(),
      imeiOrSerial: imeiOrSerial.trim(),
      conditionGrade,
      batteryHealthPercent,
      diagnosticChecklistJson: JSON.stringify(diagnostics),
      marketEstimatePrice: parseFloat(marketEstimatePrice) || valAmount,
      deductionsJson: JSON.stringify(deductions),
      functionalNotes: functionalNotes.trim(),
      accessoriesIncluded: accessoriesIncluded.trim(),
      valuationAmount: valAmount
    });

    useToastStore.getState().showToast(`Potongan Tukar Tambah Rp ${valAmount.toLocaleString('id-ID')} diterapkan ke kasir!`, 'success');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 select-none overflow-y-auto">
      <div className="bg-surface border border-border-strong w-full max-w-2xl rounded-2xl p-5 space-y-4 shadow-2xl animate-in fade-in zoom-in-95 duration-100 max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-border-subtle shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-purple-500/10 text-purple-600 flex items-center justify-center font-bold">
              <RefreshCw className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-text-primary">
                Taksiran Tukar Tambah & Buyback HP Bekas
              </h2>
              <p className="text-xs text-text-secondary">
                Inspeksi kondisi fisik & potong langsung total tagihan di keranjang kasir POS.
              </p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-subtle text-text-muted hover:text-text-primary"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto pr-1 space-y-3.5 text-xs">
          {/* Section 1: Identitas Pelanggan & Legalitas */}
          <div className="p-3 bg-subtle rounded-xl border border-border-subtle space-y-2">
            <div className="flex items-center gap-1.5 font-bold text-[11px] text-text-primary">
              <ShieldCheck className="w-3.5 h-3.5 text-purple-600" />
              <span>1. Identitas Penjual / Pelanggan (Wajib untuk SPJB):</span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <div className="col-span-2">
                <label className="block text-[10px] font-bold text-text-muted mb-1">Nama Pemilik HP *</label>
                <input
                  type="text"
                  required
                  value={customerName}
                  onChange={e => setCustomerName(e.target.value)}
                  placeholder="Contoh: Budi Santoso"
                  className="w-full px-2.5 py-1.5 bg-card border border-border-subtle rounded-lg text-text-primary font-semibold"
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-text-muted mb-1">No. WhatsApp</label>
                <input
                  type="text"
                  value={customerPhone}
                  onChange={e => setCustomerPhone(e.target.value)}
                  placeholder="0812-xxxx-xxxx"
                  className="w-full px-2.5 py-1.5 bg-card border border-border-subtle rounded-lg text-text-primary font-mono text-[11px]"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-text-muted mb-1">No. KTP / NIK</label>
                <input
                  type="text"
                  value={customerNik}
                  onChange={e => setCustomerNik(e.target.value)}
                  placeholder="3171xxxxxxxx"
                  className="w-full px-2.5 py-1.5 bg-card border border-border-subtle rounded-lg text-text-primary font-mono text-[11px]"
                />
              </div>
            </div>
            <div>
              <label className="block text-[10px] font-bold text-text-muted mb-0.5">Alamat Tempat Tinggal Pelanggan</label>
              <input
                type="text"
                value={customerAddress}
                onChange={e => setCustomerAddress(e.target.value)}
                placeholder="Jl. Kelapa Gading No. 8, Jakarta Utara"
                className="w-full px-2.5 py-1 bg-card border border-border-subtle rounded-lg text-text-primary text-[11px]"
              />
            </div>
          </div>

          {/* Section 2: Data Perangkat Bekas */}
          <div className="p-3 bg-subtle rounded-xl border border-border-subtle space-y-2">
            <span className="font-bold text-[11px] text-text-primary block">
              2. Spesifikasi Unit & Kondisi Fisik:
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <div className="sm:col-span-2">
                <label className="block text-[10px] font-bold text-text-muted mb-1">Merek & Model Gadget *</label>
                <input
                  type="text"
                  required
                  value={deviceBrandModel}
                  onChange={e => setDeviceBrandModel(e.target.value)}
                  placeholder="Contoh: iPhone 13 Pro 256GB Sierra Blue"
                  className="w-full px-2.5 py-1.5 bg-card border border-border-subtle rounded-lg text-text-primary font-semibold"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-text-muted mb-1">IMEI / No. Seri Fisik</label>
                <input
                  type="text"
                  value={imeiOrSerial}
                  onChange={e => setImeiOrSerial(e.target.value)}
                  placeholder="35848209xxxx"
                  className="w-full px-2.5 py-1.5 bg-card border border-border-subtle rounded-lg text-text-primary font-mono text-[11px]"
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="block text-[10px] font-bold text-text-muted mb-1">Battery Health (%)</label>
                <div className="relative">
                  <input
                    type="number"
                    min="1"
                    max="100"
                    value={batteryHealthPercent}
                    onChange={e => setBatteryHealthPercent(parseInt(e.target.value) || 0)}
                    className="w-full px-2.5 py-1.5 bg-card border border-border-subtle rounded-lg text-text-primary font-mono font-bold"
                  />
                  <span className="absolute right-2.5 top-1.5 text-text-muted font-bold">%</span>
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-text-muted mb-1">Grade Kondisi</label>
                <div className="px-2.5 py-1.5 bg-purple-500/10 border border-purple-500/30 rounded-lg text-purple-700 dark:text-purple-300 font-bold text-[11px] truncate">
                  {conditionGrade}
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-text-muted mb-1">Kelengkapan Unit</label>
                <input
                  type="text"
                  value={accessoriesIncluded}
                  onChange={e => setAccessoriesIncluded(e.target.value)}
                  placeholder="Fullset / Unit Only / Box"
                  className="w-full px-2.5 py-1.5 bg-card border border-border-subtle rounded-lg text-text-primary text-[11px]"
                />
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-text-muted mb-1">Catatan Tambahan / Status Akun</label>
              <input
                type="text"
                value={functionalNotes}
                onChange={e => setFunctionalNotes(e.target.value)}
                placeholder="Layar original, kamera normal, iCloud sudah logout di depan kasir..."
                className="w-full px-2.5 py-1.5 bg-card border border-border-subtle rounded-lg text-text-primary text-[11px]"
              />
            </div>
          </div>

          {/* Section 3: Diagnosa Hardware 8-Titik */}
          <div className="p-3 bg-subtle rounded-xl border border-border-subtle space-y-2">
            <span className="font-bold text-[11px] text-text-primary block">
              3. Checklist Hasil Uji Diagnosa Hardware (8-Titik):
            </span>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
              {diagnostics.map(item => (
                <div key={item.key} className="p-1.5 bg-card rounded-lg border border-border-subtle space-y-1">
                  <span className="text-[10px] font-semibold text-text-primary block truncate">{item.name}</span>
                  <div className="grid grid-cols-3 gap-0.5">
                    {(['Normal', 'Minus', 'Rusak'] as const).map(st => (
                      <button
                        key={st}
                        type="button"
                        onClick={() => handleUpdateDiagnostic(item.key, st)}
                        className={`py-0.5 rounded text-[9px] font-bold transition-all ${
                          item.status === st
                            ? st === 'Normal'
                              ? 'bg-status-success text-white'
                              : st === 'Minus'
                              ? 'bg-amber-500 text-white'
                              : 'bg-status-danger text-white'
                            : 'bg-subtle text-text-muted hover:text-text-primary'
                        }`}
                      >
                        {st}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Section 4: Kalkulator Taksiran Harga & Potongan Minus */}
          <div className="p-3 bg-purple-500/10 border border-purple-500/30 rounded-xl space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="font-bold text-xs text-purple-700 dark:text-purple-300">
                4. Kalkulasi Taksiran Harga Beli Toko:
              </span>
              <span className="text-[10px] font-bold text-purple-600 font-mono">
                Formula: Pasaran - Potongan Minus
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[10px] font-bold text-text-muted mb-1">Harga Pasaran Normal (Rp)</label>
                <input
                  type="number"
                  value={marketEstimatePrice}
                  onChange={e => setMarketEstimatePrice(e.target.value)}
                  placeholder="5000000"
                  className="w-full px-2.5 py-1.5 bg-card border border-border-subtle rounded-lg text-text-primary font-mono font-bold"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-purple-700 dark:text-purple-300 mb-1">
                  Taksiran Bersih Kasir (Rp) *
                </label>
                <input
                  type="number"
                  required
                  value={valuationAmount}
                  onChange={e => setValuationAmount(e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-card border-2 border-purple-500 rounded-lg text-text-primary font-mono font-black text-sm text-purple-600 dark:text-purple-400"
                />
              </div>
            </div>

            {/* List Minus Deductions */}
            <div className="space-y-1.5 pt-1 border-t border-purple-500/20">
              <span className="text-[10px] font-bold text-text-muted block">Rincian Pemotongan Minus Fisik:</span>
              
              {deductions.map(d => (
                <div key={d.id} className="flex items-center justify-between p-1.5 bg-card rounded-lg border border-purple-500/20 text-[10px]">
                  <span className="text-text-primary font-medium">{d.reason}</span>
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-status-danger">-Rp {d.amount.toLocaleString('id-ID')}</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveDeduction(d.id)}
                      className="text-text-muted hover:text-status-danger p-0.5"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}

              {/* Add Deduction Row */}
              <div className="flex gap-1.5 pt-1">
                <input
                  type="text"
                  value={newMinusReason}
                  onChange={e => setNewMinusReason(e.target.value)}
                  placeholder="Minus (contoh: Layar baret dalam, BH 78%, Box hilang)"
                  className="flex-1 px-2 py-1 bg-card border border-border-subtle rounded-lg text-[10px]"
                />
                <input
                  type="number"
                  value={newMinusAmount}
                  onChange={e => setNewMinusAmount(e.target.value)}
                  placeholder="Potongan (Rp)"
                  className="w-28 px-2 py-1 bg-card border border-border-subtle rounded-lg text-[10px] font-mono"
                />
                <button
                  type="button"
                  onClick={handleAddDeduction}
                  className="px-2.5 py-1 bg-purple-600 text-white rounded-lg font-bold text-[10px] flex items-center gap-1 hover:bg-purple-700"
                >
                  <Plus className="w-3 h-3" />
                  <span>Tambah</span>
                </button>
              </div>
            </div>
          </div>

          {/* Legal Statement Checkbox */}
          <div className="p-2.5 bg-amber-500/10 border border-amber-500/30 rounded-xl flex items-start gap-2">
            <input
              type="checkbox"
              id="theftFreeCheck"
              checked={theftFreeGuarantee}
              onChange={e => setTheftFreeGuarantee(e.target.checked)}
              className="mt-0.5 rounded text-purple-600 focus:ring-purple-500"
            />
            <label htmlFor="theftFreeCheck" className="text-[10px] text-text-secondary leading-snug cursor-pointer">
              <span className="font-bold text-amber-700 dark:text-amber-400 block">Jaminan Legalitas & Kepemilikan Sah:</span>
              Pelanggan menyatakan unit bekas adalah milik pribadi yang sah, bukan barang curian/sengketa hukum, dan akun pribadi telah dikeluarkan (logout).
            </label>
          </div>
        </form>

        {/* Footer Buttons */}
        <div className="pt-2 flex items-center justify-between gap-2 border-t border-border-subtle shrink-0">
          {currentTradeIn && onRemoveTradeIn ? (
            <button
              type="button"
              onClick={() => {
                onRemoveTradeIn();
                onClose();
              }}
              className="px-3 py-2 bg-status-danger/10 hover:bg-status-danger/20 text-status-danger rounded-xl font-bold transition-colors text-xs"
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
              className="px-4 py-2 bg-subtle hover:bg-card-hover border border-border-subtle rounded-xl text-text-secondary font-semibold text-xs"
            >
              Batal
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              className="px-5 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl font-bold shadow-md flex items-center gap-1.5 text-xs transition-all"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Terapkan ke Kasir POS</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
