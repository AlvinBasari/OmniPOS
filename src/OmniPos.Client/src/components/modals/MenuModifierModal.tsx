import React, { useState, useEffect } from 'react';
import { 
  Flame, 
  Coffee, 
  Plus, 
  Check, 
  UtensilsCrossed, 
  X, 
  DollarSign, 
  MessageSquare,
  Sparkles
} from 'lucide-react';
import { Product, CartItemModifier } from '../../types';
import { useCartStore } from '../../store/useCartStore';
import { useToastStore } from '../../store/useToastStore';

interface MenuModifierModalProps {
  isOpen: boolean;
  product: Product | null;
  onClose: () => void;
  onConfirm?: (product: Product, modifiers: CartItemModifier[], notes: string) => void;
}

export const MenuModifierModal: React.FC<MenuModifierModalProps> = ({
  isOpen,
  product,
  onClose,
  onConfirm
}) => {
  const { addItem } = useCartStore();

  const [spicyLevel, setSpicyLevel] = useState<string>('Level 1');
  const [iceLevel, setIceLevel] = useState<string>('Normal Ice');
  const [sugarLevel, setSugarLevel] = useState<string>('Normal Sugar');
  const [selectedToppings, setSelectedToppings] = useState<Array<{ name: string; price: number }>>([]);
  const [kitchenNotes, setKitchenNotes] = useState<string>('');

  useEffect(() => {
    if (isOpen) {
      setSpicyLevel('Level 1');
      setIceLevel('Normal Ice');
      setSugarLevel('Normal Sugar');
      setSelectedToppings([]);
      setKitchenNotes('');
    }
  }, [isOpen, product]);

  if (!isOpen || !product) return null;

  const pName = product.name.toLowerCase();
  const isDrink = pName.includes('kopi') || pName.includes('tea') || pName.includes('teh') || 
                  pName.includes('juice') || pName.includes('jus') || pName.includes('latte') || 
                  pName.includes('es ') || pName.includes('ice') || pName.includes('boba') ||
                  pName.includes('milk') || pName.includes('minuman');

  const isSpicyFood = pName.includes('mie') || pName.includes('nasi goreng') || pName.includes('ayam') || 
                      pName.includes('geprek') || pName.includes('sambal') || pName.includes('bakso') || 
                      pName.includes('seblak') || pName.includes('rendang') || pName.includes('pedas');

  const availableToppings = isDrink ? [
    { name: 'Boba Brown Sugar', price: 4000 },
    { name: 'Extra Shot Espresso', price: 6000 },
    { name: 'Puding Coklat', price: 3000 },
    { name: 'Cheese Foam Cream', price: 5000 },
    { name: 'Oat Milk Upgrade', price: 7000 }
  ] : [
    { name: 'Telur Mata Sapi', price: 5000 },
    { name: 'Extra Keju Melted', price: 4000 },
    { name: 'Sambal Extra Pedas', price: 3000 },
    { name: 'Sosis Bakar Potong', price: 5000 },
    { name: 'Kerupuk Kaleng Gurih', price: 2000 }
  ];

  const toggleTopping = (topping: { name: string; price: number }) => {
    if (selectedToppings.some(t => t.name === topping.name)) {
      setSelectedToppings(selectedToppings.filter(t => t.name !== topping.name));
    } else {
      setSelectedToppings([...selectedToppings, topping]);
    }
  };

  const toppingsTotal = selectedToppings.reduce((acc, t) => acc + t.price, 0);
  const finalUnitPrice = product.sellPrice + toppingsTotal;

  const handleAddWithModifiers = () => {
    const modifiers: CartItemModifier[] = [];

    if (isSpicyFood) {
      modifiers.push({
        id: `spicy_${spicyLevel}`,
        name: `Tingkat Kepedasan: ${spicyLevel}`,
        modifierOptionId: `spicy_${spicyLevel}`,
        modifierName: `Tingkat Kepedasan: ${spicyLevel}`,
        price: 0
      });
    }

    if (isDrink) {
      modifiers.push({
        id: `ice_${iceLevel}`,
        name: iceLevel,
        modifierOptionId: `ice_${iceLevel}`,
        modifierName: iceLevel,
        price: 0
      });
      modifiers.push({
        id: `sugar_${sugarLevel}`,
        name: sugarLevel,
        modifierOptionId: `sugar_${sugarLevel}`,
        modifierName: sugarLevel,
        price: 0
      });
    }

    for (const top of selectedToppings) {
      modifiers.push({
        id: `top_${top.name}`,
        name: `+ Topping: ${top.name}`,
        modifierOptionId: `top_${top.name}`,
        modifierName: `+ Topping: ${top.name}`,
        price: top.price
      });
    }

    if (onConfirm) {
      onConfirm(product, modifiers, kitchenNotes);
    } else {
      addItem(product, undefined, modifiers, 1);
      useToastStore.getState().showToast(`Menu ${product.name} berhasil ditambahkan dengan varian custom!`, 'success');
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4 select-none">
      <div className="w-full max-w-lg bg-surface border border-border-strong rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-4 bg-subtle border-b border-border-subtle flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-bold">
              {isDrink ? <Coffee className="w-5 h-5" /> : <UtensilsCrossed className="w-5 h-5" />}
            </div>
            <div>
              <h2 className="text-sm font-bold text-text-primary leading-tight">
                Kustomisasi Menu: {product.name}
              </h2>
              <p className="text-xs text-text-secondary">
                Harga Dasar: Rp {product.sellPrice.toLocaleString('id-ID')}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-card-hover text-text-muted hover:text-text-primary transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 overflow-y-auto space-y-5 text-xs">
          {/* Level Pedas (Makanan) */}
          {isSpicyFood && (
            <div className="space-y-2">
              <label className="flex items-center gap-1.5 font-bold text-text-primary uppercase tracking-wider text-[11px]">
                <Flame className="w-3.5 h-3.5 text-rose-500" />
                <span>Pilihan Level Pedas</span>
              </label>
              <div className="grid grid-cols-5 gap-2">
                {['Level 0 (Manis)', 'Level 1 (Sedang)', 'Level 2 (Pedas)', 'Level 3 (Super)', 'Level 5 (Gila)'].map((lvl) => (
                  <button
                    key={lvl}
                    type="button"
                    onClick={() => setSpicyLevel(lvl)}
                    className={`py-2 px-1 rounded-lg border text-center transition-all ${
                      spicyLevel === lvl
                        ? 'bg-rose-500/15 border-rose-500 text-rose-600 font-bold shadow-xs'
                        : 'bg-card border-border-subtle hover:bg-card-hover text-text-secondary'
                    }`}
                  >
                    <span className="block text-[11px] truncate">{lvl.split(' ')[0]} {lvl.split(' ')[1]}</span>
                    <span className="block text-[9px] opacity-75 truncate">{lvl.includes('(') ? lvl.substring(lvl.indexOf('(')) : ''}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Level Es & Gula (Minuman) */}
          {isDrink && (
            <div className="grid grid-cols-2 gap-4">
              {/* Es */}
              <div className="space-y-2">
                <label className="block font-bold text-text-primary uppercase tracking-wider text-[11px]">
                  Tingkat Es (Ice Level)
                </label>
                <div className="space-y-1.5">
                  {['Normal Ice', 'Less Ice', 'No Ice (Hangat)'].map((ice) => (
                    <button
                      key={ice}
                      type="button"
                      onClick={() => setIceLevel(ice)}
                      className={`w-full py-2 px-3 rounded-lg border text-left flex items-center justify-between transition-all ${
                        iceLevel === ice
                          ? 'bg-primary/10 border-primary text-primary font-bold'
                          : 'bg-card border-border-subtle hover:bg-card-hover text-text-secondary'
                      }`}
                    >
                      <span>{ice}</span>
                      {iceLevel === ice && <Check className="w-3.5 h-3.5" />}
                    </button>
                  ))}
                </div>
              </div>

              {/* Gula */}
              <div className="space-y-2">
                <label className="block font-bold text-text-primary uppercase tracking-wider text-[11px]">
                  Tingkat Manis (Sugar Level)
                </label>
                <div className="space-y-1.5">
                  {['Normal Sugar (100%)', 'Less Sugar (50%)', 'No Sugar (0%)'].map((sugar) => (
                    <button
                      key={sugar}
                      type="button"
                      onClick={() => setSugarLevel(sugar)}
                      className={`w-full py-2 px-3 rounded-lg border text-left flex items-center justify-between transition-all ${
                        sugarLevel === sugar
                          ? 'bg-primary/10 border-primary text-primary font-bold'
                          : 'bg-card border-border-subtle hover:bg-card-hover text-text-secondary'
                      }`}
                    >
                      <span>{sugar}</span>
                      {sugarLevel === sugar && <Check className="w-3.5 h-3.5" />}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Ekstra Topping Tambahan */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="font-bold text-text-primary uppercase tracking-wider text-[11px]">
                Topping / Add-on Tambahan (Bisa Pilih Banyak)
              </label>
              <span className="text-[10px] text-text-muted">
                {selectedToppings.length} dipilih
              </span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {availableToppings.map((t) => {
                const isChecked = selectedToppings.some(st => st.name === t.name);
                return (
                  <button
                    key={t.name}
                    type="button"
                    onClick={() => toggleTopping(t)}
                    className={`p-2.5 rounded-lg border text-left flex items-center justify-between transition-all ${
                      isChecked
                        ? 'bg-primary/10 border-primary text-primary font-bold shadow-xs'
                        : 'bg-card border-border-subtle hover:bg-card-hover text-text-secondary'
                    }`}
                  >
                    <div>
                      <p className="text-xs font-semibold">{t.name}</p>
                      <p className="text-[10px] opacity-80 font-mono">+Rp {t.price.toLocaleString('id-ID')}</p>
                    </div>
                    <div className={`w-4 h-4 rounded flex items-center justify-center border ${isChecked ? 'bg-primary border-primary text-white' : 'border-border-strong'}`}>
                      {isChecked && <Check className="w-3 h-3" />}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Catatan Khusus Dapur */}
          <div className="space-y-1.5">
            <label className="flex items-center gap-1.5 font-bold text-text-primary uppercase tracking-wider text-[11px]">
              <MessageSquare className="w-3.5 h-3.5 text-amber-500" />
              <span>Instruksi Khusus Koki / Barista (Kitchen Notes)</span>
            </label>
            <input
              type="text"
              value={kitchenNotes}
              onChange={(e) => setKitchenNotes(e.target.value)}
              placeholder="Contoh: Tanpa daun bawang, kuah dipisah, ekstra es batu..."
              className="w-full px-3 py-2 bg-subtle border border-border-strong rounded-lg text-xs text-text-primary focus:outline-none focus:border-primary"
            />
          </div>
        </div>

        {/* Footer with Price Summary & Add Button */}
        <div className="p-4 bg-subtle border-t border-border-subtle flex items-center justify-between">
          <div>
            <span className="text-[11px] text-text-muted">Total Harga Unit + Modifiers:</span>
            <p className="text-base font-extrabold font-mono text-primary leading-none">
              Rp {finalUnitPrice.toLocaleString('id-ID')}
            </p>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-card hover:bg-card-hover border border-border-subtle text-xs font-semibold text-text-secondary rounded-lg"
            >
              Batal
            </button>
            <button
              type="button"
              onClick={handleAddWithModifiers}
              className="px-5 py-2 bg-primary hover:bg-primary-hover text-primary-text text-xs font-bold rounded-lg shadow-md flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" />
              <span>Tambahkan ke Pesanan</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
