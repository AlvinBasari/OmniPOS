import React, { useState, useEffect } from 'react';
import { Scale, Plus, Minus, Check, Calculator, RefreshCw } from 'lucide-react';
import { useHardwareStore } from '../../store/useHardwareStore';
import { useCartStore } from '../../store/useCartStore';
import { useToastStore } from '../../store/useToastStore';

export const ManualScaleModal: React.FC = () => {
  const { isManualScaleOpen, closeManualScale, scaleTargetProduct } = useHardwareStore();
  const { addItem } = useCartStore();

  const [weightKg, setWeightKg] = useState('1.000');
  const [tareWeightKg, setTareWeightKg] = useState('0.000');
  const [unitMode, setUnitMode] = useState<'KG' | 'GRAM'>('KG');

  useEffect(() => {
    if (isManualScaleOpen) {
      setWeightKg('1.000');
      setTareWeightKg('0.000');
      setUnitMode(scaleTargetProduct?.unit === 'GRAM' ? 'GRAM' : 'KG');
    }
  }, [isManualScaleOpen, scaleTargetProduct]);

  if (!isManualScaleOpen || !scaleTargetProduct) return null;

  const grossVal = parseFloat(weightKg) || 0;
  const tareVal = parseFloat(tareWeightKg) || 0;
  const netWeight = Math.max(0, grossVal - tareVal);

  // Price calculation
  const multiplier = unitMode === 'GRAM' ? (scaleTargetProduct.unit === 'KG' ? netWeight / 1000 : netWeight) : netWeight;
  const calculatedTotal = Math.round(multiplier * scaleTargetProduct.sellPrice);

  const handleQuickAdd = (addKg: number) => {
    const current = parseFloat(weightKg) || 0;
    setWeightKg((current + addKg).toFixed(3));
  };

  const handleConfirmAddToCart = (e: React.FormEvent) => {
    e.preventDefault();
    if (netWeight <= 0) {
      useToastStore.getState().showToast('Berat bersih harus lebih besar dari 0!', 'warning');
      return;
    }

    const finalQty = unitMode === 'GRAM' && scaleTargetProduct.unit === 'KG' ? netWeight / 1000 : netWeight;
    
    addItem(scaleTargetProduct, undefined, [], finalQty);
    useToastStore.getState().showToast(`+${netWeight} ${unitMode} ${scaleTargetProduct.name} dimasukkan ke keranjang`, 'success');
    closeManualScale();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4 select-none">
      <div className="w-full max-w-md bg-card border border-border-strong rounded-2xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="p-4 bg-surface border-b border-border-subtle flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center font-bold">
              <Scale className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-text-primary">Timbangan Digital (Input Manual)</h3>
              <p className="text-[11px] text-text-secondary">Fallback kalkulator timbang berat produk kiloan/gram</p>
            </div>
          </div>
          <button onClick={closeManualScale} className="text-text-muted hover:text-text-primary font-bold text-sm">
            ✕
          </button>
        </div>

        <form onSubmit={handleConfirmAddToCart} className="p-5 space-y-4 text-xs">
          {/* Target Product Summary */}
          <div className="p-3 bg-subtle rounded-xl border border-border-subtle flex items-center justify-between">
            <div>
              <p className="font-bold text-sm text-text-primary">{scaleTargetProduct.name}</p>
              <p className="text-[10px] text-text-muted font-mono">{scaleTargetProduct.sku}</p>
            </div>
            <div className="text-right font-mono">
              <p className="text-xs text-text-muted">Harga Satuan:</p>
              <p className="font-bold text-primary text-sm">
                Rp {scaleTargetProduct.sellPrice.toLocaleString('id-ID')} /{scaleTargetProduct.unit}
              </p>
            </div>
          </div>

          {/* Scale Display Box */}
          <div className="p-4 rounded-2xl bg-zinc-950 text-emerald-400 border border-emerald-500/40 shadow-inner space-y-2">
            <div className="flex items-center justify-between text-[11px] font-mono uppercase text-emerald-500/70 font-bold">
              <span>Berat Bersih (Net Weight)</span>
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                Stabil
              </span>
            </div>

            <div className="flex items-baseline justify-between">
              <span className="text-4xl font-extrabold font-mono tracking-wider tabular-nums">
                {netWeight.toFixed(3)}
              </span>
              <span className="text-lg font-bold font-mono text-emerald-500 uppercase">
                {unitMode}
              </span>
            </div>

            <div className="pt-2 border-t border-emerald-900/60 flex items-center justify-between text-[11px] font-mono text-emerald-400/80">
              <span>Gross: {grossVal.toFixed(3)}</span>
              <span>Tare (Wadah): -{tareVal.toFixed(3)}</span>
            </div>
          </div>

          {/* Input Controls */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-text-secondary mb-1">Berat Kotor (Gross):</label>
              <input
                type="number"
                step="0.001"
                min="0.001"
                required
                value={weightKg}
                onChange={e => setWeightKg(e.target.value)}
                className="w-full px-3 py-2 bg-subtle border border-border-strong rounded-lg font-mono font-bold text-center text-sm text-text-primary focus:outline-none focus:border-primary"
                autoFocus
              />
            </div>

            <div>
              <label className="block font-semibold text-text-secondary mb-1">Potongan Wadah (Tare):</label>
              <input
                type="number"
                step="0.001"
                min="0"
                value={tareWeightKg}
                onChange={e => setTareWeightKg(e.target.value)}
                className="w-full px-3 py-2 bg-subtle border border-border-strong rounded-lg font-mono font-bold text-center text-sm text-text-primary focus:outline-none focus:border-primary"
              />
            </div>
          </div>

          {/* Quick Increment Buttons */}
          <div className="flex gap-1.5 flex-wrap">
            <span className="text-[10px] text-text-muted self-center font-bold mr-1">Cepat:</span>
            {[
              { label: '+100g', val: 0.1 },
              { label: '+250g', val: 0.25 },
              { label: '+500g', val: 0.5 },
              { label: '+1 Kg', val: 1.0 },
              { label: '+2 Kg', val: 2.0 }
            ].map(b => (
              <button
                key={b.label}
                type="button"
                onClick={() => handleQuickAdd(b.val)}
                className="px-2.5 py-1 rounded-md bg-subtle hover:bg-card-hover border border-border-subtle font-mono text-[10px] font-bold text-text-primary"
              >
                {b.label}
              </button>
            ))}
            <button
              type="button"
              onClick={() => { setWeightKg('0.000'); setTareWeightKg('0.000'); }}
              className="px-2.5 py-1 rounded-md bg-subtle hover:bg-rose-500/10 text-rose-600 border border-border-subtle font-mono text-[10px] font-bold ml-auto"
            >
              Reset
            </button>
          </div>

          {/* Total Calculated Price Banner */}
          <div className="p-3.5 bg-primary/10 border border-primary/30 rounded-xl flex items-center justify-between">
            <div>
              <span className="text-[10px] text-text-muted font-bold block uppercase">Total Harga Hasil Timbang:</span>
              <p className="text-xl font-extrabold font-mono text-primary tabular-nums">
                Rp {calculatedTotal.toLocaleString('id-ID')}
              </p>
            </div>
            <span className="text-[11px] font-mono text-text-secondary">
              {netWeight.toFixed(3)} {unitMode} × Rp {scaleTargetProduct.sellPrice.toLocaleString('id-ID')}
            </span>
          </div>

          {/* Submit Action */}
          <div className="flex gap-2 pt-2 border-t border-border-subtle">
            <button
              type="button"
              onClick={closeManualScale}
              className="flex-1 py-2.5 bg-subtle hover:bg-card-hover border border-border-subtle rounded-xl font-bold text-text-secondary"
            >
              Batal
            </button>
            <button
              type="submit"
              className="flex-1 py-2.5 bg-primary hover:bg-primary-hover text-primary-text rounded-xl font-bold flex items-center justify-center gap-1.5 shadow-md text-xs"
            >
              <Check className="w-4 h-4" />
              <span>Masukkan ke Keranjang</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
