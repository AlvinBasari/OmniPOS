import React, { useState, useEffect } from 'react';
import { 
  Printer, 
  Tag, 
  Search, 
  CheckSquare, 
  Square, 
  Layers, 
  LayoutGrid, 
  Barcode as BarcodeIcon,
  Sparkles,
  Smartphone,
  Radio,
  ShieldCheck
} from 'lucide-react';
import { Product, SimCardSpecialNumber } from '../types';
import { useToastStore } from '../store/useToastStore';
import { useBusinessModeStore } from '../store/useBusinessModeStore';

// Simple SVG Code 128 / Barcode Bar Pattern Generator
const BarcodeSvg: React.FC<{ code: string; width?: number; height?: number }> = ({ code, width = 160, height = 40 }) => {
  const bars: boolean[] = [];
  for (let i = 0; i < code.length; i++) {
    const charCode = code.charCodeAt(i);
    for (let b = 0; b < 6; b++) {
      bars.push(((charCode >> b) & 1) === 1);
    }
    bars.push(false);
  }

  const barWidth = width / bars.length;

  return (
    <svg width={width} height={height} className="mx-auto">
      {bars.map((isDark, idx) => (
        <rect
          key={idx}
          x={idx * barWidth}
          y={0}
          width={barWidth * 0.85}
          height={height}
          fill={isDark ? '#000000' : '#ffffff'}
        />
      ))}
    </svg>
  );
};

export const PriceTagLabelPage: React.FC = () => {
  const { mode } = useBusinessModeStore();
  const [labelCategory, setLabelCategory] = useState<'products' | 'sim_cards' | 'imei_boxes'>('products');
  const [products, setProducts] = useState<Product[]>([]);
  const [simCards, setSimCards] = useState<SimCardSpecialNumber[]>([]);
  const [selectedProductIds, setSelectedProductIds] = useState<Set<string>>(new Set());
  const [selectedSimCardIds, setSelectedSimCardIds] = useState<Set<string>>(new Set());
  const [templateSize, setTemplateSize] = useState<'shelf_tag' | 'thermal_40x30' | 'thermal_33x15' | 'sim_showcase' | 'a4_grid'>('shelf_tag');
  const [searchQuery, setSearchQuery] = useState('');
  const [copiesPerItem, setCopiesPerItem] = useState(1);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [pRes, sRes] = await Promise.all([
        fetch('/api/v1/products'),
        fetch('/api/v1/electronics/sim-cards')
      ]);
      if (pRes.ok) {
        const pData: Product[] = await pRes.json();
        setProducts(pData);
        setSelectedProductIds(new Set(pData.slice(0, 6).map(p => p.id)));
      }
      if (sRes.ok) {
        const sData: SimCardSpecialNumber[] = await sRes.json();
        setSimCards(sData);
        setSelectedSimCardIds(new Set(sData.slice(0, 4).map(s => s.id)));
      }
    } catch {}
  };

  const toggleSelectProduct = (id: string) => {
    const next = new Set(selectedProductIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedProductIds(next);
  };

  const toggleSelectSimCard = (id: string) => {
    const next = new Set(selectedSimCardIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedSimCardIds(next);
  };

  const selectAll = () => {
    if (labelCategory === 'sim_cards') {
      setSelectedSimCardIds(new Set(simCards.map(s => s.id)));
    } else {
      setSelectedProductIds(new Set(products.map(p => p.id)));
    }
  };

  const deselectAll = () => {
    if (labelCategory === 'sim_cards') setSelectedSimCardIds(new Set());
    else setSelectedProductIds(new Set());
  };

  const handlePrint = () => {
    const count = labelCategory === 'sim_cards' ? selectedSimCardIds.size : selectedProductIds.size;
    if (count === 0) {
      useToastStore.getState().showToast('Pilih minimal 1 item untuk dicetak!', 'warning');
      return;
    }
    window.print();
  };

  const filteredProducts = products.filter(p => 
    p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.sku.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (p.barcode && p.barcode.includes(searchQuery))
  );

  const filteredSimCards = simCards.filter(s =>
    s.msisdn.includes(searchQuery) ||
    s.provider.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.patternTier.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const selectedProductsList = products.filter(p => selectedProductIds.has(p.id));
  const selectedSimCardsList = simCards.filter(s => selectedSimCardIds.has(s.id));

  return (
    <div className="flex-1 flex bg-app overflow-hidden select-none">
      {/* LEFT 40%: Selection Panel (Hidden on Print) */}
      <section className="w-[40%] flex flex-col border-r border-border-subtle bg-surface print:hidden">
        <header className="p-4 border-b border-border-subtle flex items-center justify-between">
          <div>
            <h1 className="text-base font-bold text-text-primary flex items-center gap-2">
              <Tag className="w-5 h-5 text-primary" />
              Cetak Label Barcode & Stiker
            </h1>
            <p className="text-xs text-text-secondary mt-0.5">Desain & cetak label harga, stiker nomor cantik, & box IMEI</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={selectAll}
              className="text-[11px] text-primary font-bold hover:underline"
            >
              Pilih Semua
            </button>
            <span className="text-text-muted">|</span>
            <button
              onClick={deselectAll}
              className="text-[11px] text-text-muted hover:underline"
            >
              Reset
            </button>
          </div>
        </header>

        {/* Category Mode Switcher */}
        <div className="p-2 border-b border-border-subtle bg-subtle/50 grid grid-cols-2 gap-1 text-xs">
          <button
            onClick={() => setLabelCategory('products')}
            className={`py-1.5 px-3 rounded-lg font-bold flex items-center justify-center gap-1.5 transition-all ${
              labelCategory === 'products' ? 'bg-primary text-primary-text shadow-sm' : 'text-text-secondary hover:bg-card-hover'
            }`}
          >
            <Tag className="w-3.5 h-3.5" />
            <span>Label Produk ({products.length})</span>
          </button>
          <button
            onClick={() => {
              setLabelCategory('sim_cards');
              setTemplateSize('sim_showcase');
            }}
            className={`py-1.5 px-3 rounded-lg font-bold flex items-center justify-center gap-1.5 transition-all ${
              labelCategory === 'sim_cards' ? 'bg-primary text-primary-text shadow-sm' : 'text-text-secondary hover:bg-card-hover'
            }`}
          >
            <Radio className="w-3.5 h-3.5" />
            <span>Nomor Cantik ({simCards.length})</span>
          </button>
        </div>

        {/* Search */}
        <div className="p-3 border-b border-border-subtle bg-subtle">
          <div className="relative">
            <Search className="w-4 h-4 text-text-muted absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder={labelCategory === 'sim_cards' ? "Cari nomor telepon / operator..." : "Cari nama produk / barcode..."}
              className="w-full pl-9 pr-3 py-2 bg-card border border-border-strong rounded-lg text-xs text-text-primary focus:outline-none focus:border-primary"
            />
          </div>
        </div>

        {/* Selection List */}
        <div className="flex-1 overflow-y-auto p-3 space-y-1.5">
          {labelCategory === 'products' ? (
            filteredProducts.map(p => {
              const isSelected = selectedProductIds.has(p.id);
              return (
                <div
                  key={p.id}
                  onClick={() => toggleSelectProduct(p.id)}
                  className={`p-3 rounded-xl border cursor-pointer flex items-center justify-between transition-all ${
                    isSelected
                      ? 'bg-primary/10 border-primary shadow-sm'
                      : 'bg-card hover:bg-card-hover border-border-subtle'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    {isSelected ? (
                      <CheckSquare className="w-4 h-4 text-primary flex-shrink-0" />
                    ) : (
                      <Square className="w-4 h-4 text-text-muted flex-shrink-0" />
                    )}
                    <div>
                      <p className="text-xs font-bold text-text-primary leading-tight">{p.name}</p>
                      <p className="text-[10px] text-text-muted font-mono mt-0.5">
                        {p.sku} | Barcode: {p.barcode || p.sku}
                      </p>
                    </div>
                  </div>

                  <span className="text-xs font-bold font-mono text-primary tabular-nums">
                    Rp {p.sellPrice.toLocaleString('id-ID')}
                  </span>
                </div>
              );
            })
          ) : (
            filteredSimCards.map(s => {
              const isSelected = selectedSimCardIds.has(s.id);
              return (
                <div
                  key={s.id}
                  onClick={() => toggleSelectSimCard(s.id)}
                  className={`p-3 rounded-xl border cursor-pointer flex items-center justify-between transition-all ${
                    isSelected
                      ? 'bg-primary/10 border-primary shadow-sm'
                      : 'bg-card hover:bg-card-hover border-border-subtle'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    {isSelected ? (
                      <CheckSquare className="w-4 h-4 text-primary flex-shrink-0" />
                    ) : (
                      <Square className="w-4 h-4 text-text-muted flex-shrink-0" />
                    )}
                    <div>
                      <p className="text-xs font-bold text-text-primary font-mono leading-tight">{s.msisdn}</p>
                      <p className="text-[10px] text-text-muted mt-0.5">
                        {s.provider} • <span className="text-primary font-semibold">{s.patternTier}</span>
                      </p>
                    </div>
                  </div>

                  <span className="text-xs font-bold font-mono text-primary tabular-nums">
                    Rp {s.sellPrice.toLocaleString('id-ID')}
                  </span>
                </div>
              );
            })
          )}
        </div>
      </section>

      {/* RIGHT 60%: Layout Configuration & Live Print Preview */}
      <section className="w-[60%] flex flex-col bg-app overflow-hidden print:w-full print:bg-white print:p-0">
        {/* Controls Bar (Hidden on Print) */}
        <div className="p-4 border-b border-border-subtle bg-surface flex items-center justify-between print:hidden">
          <div className="flex items-center gap-3">
            <label className="text-xs font-bold text-text-secondary">Template Ukuran:</label>
            <select
              value={templateSize}
              onChange={e => setTemplateSize(e.target.value as any)}
              className="px-3 py-1.5 bg-subtle border border-border-strong rounded-lg text-xs font-bold text-text-primary focus:outline-none focus:border-primary"
            >
              {labelCategory === 'sim_cards' ? (
                <>
                  <option value="sim_showcase">📱 Stiker Etalase Nomor Cantik (VIP Card 75x45mm)</option>
                  <option value="thermal_40x30">🖨️ Stiker Thermal Nomor Cantik (40x30mm)</option>
                </>
              ) : (
                <>
                  <option value="shelf_tag">🏷️ Price Tag Rak Minimarket (65x35mm)</option>
                  <option value="thermal_40x30">🖨️ Stiker Thermal Barcode Box (40x30mm)</option>
                  <option value="thermal_33x15">🖨️ Stiker Thermal Mini (33x15mm)</option>
                  <option value="a4_grid">📄 Lembar Kertas A4 Grid (3x10 per lembar)</option>
                </>
              )}
            </select>

            <div className="flex items-center gap-1.5 text-xs text-text-secondary">
              <span>Qty per Item:</span>
              <input
                type="number"
                min="1"
                max="20"
                value={copiesPerItem}
                onChange={e => setCopiesPerItem(Math.max(1, parseInt(e.target.value) || 1))}
                className="w-12 px-2 py-1 bg-subtle border border-border-strong rounded text-center font-mono font-bold"
              />
            </div>
          </div>

          <button
            onClick={handlePrint}
            className="px-5 py-2 bg-primary hover:bg-primary-hover text-primary-text rounded-lg text-xs font-bold flex items-center gap-2 shadow-md transition-all active:scale-95"
          >
            <Printer className="w-4 h-4" />
            <span>Cetak {(labelCategory === 'sim_cards' ? selectedSimCardIds.size : selectedProductIds.size) * copiesPerItem} Label</span>
          </button>
        </div>

        {/* Live Label Canvas / Print Preview Area */}
        <div className="flex-1 overflow-y-auto p-6 flex flex-col items-center justify-start print:p-0 print:overflow-visible">
          {labelCategory === 'sim_cards' ? (
            selectedSimCardsList.length === 0 ? (
              <div className="py-24 text-center text-text-muted space-y-2 print:hidden">
                <Radio className="w-12 h-12 mx-auto opacity-30" />
                <p className="text-xs font-bold text-text-primary">Pilih Nomor Cantik di Sebelah Kiri</p>
                <p className="text-[11px]">Pilih nomor telepon untuk melihat pratinjau stiker etalase.</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-4 w-full max-w-4xl print:grid-cols-2 print:gap-3">
                {selectedSimCardsList.flatMap((s) =>
                  Array.from({ length: copiesPerItem }).map((_, copyIdx) => (
                    <div
                      key={`${s.id}-${copyIdx}`}
                      className="bg-white text-black border-2 border-black rounded-xl p-4 flex flex-col justify-between shadow-sm print:shadow-none print:break-inside-avoid min-h-[160px]"
                    >
                      {/* Operator & Tier Badge */}
                      <div className="flex items-center justify-between border-b-2 border-black pb-2">
                        <div>
                          <span className="text-[10px] font-extrabold uppercase tracking-widest text-slate-800">
                            {s.provider}
                          </span>
                          <p className="text-[9px] font-bold text-indigo-700">{s.patternTier}</p>
                        </div>
                        <div className="text-right">
                          <span className="px-2 py-0.5 rounded bg-black text-white text-[9px] font-bold">
                            {s.defaultQuotaGb || 'PERDANA'}
                          </span>
                        </div>
                      </div>

                      {/* Giant MSISDN Number */}
                      <div className="py-3 text-center">
                        <p className="text-2xl font-black font-mono tracking-tight text-black">
                          {s.msisdn}
                        </p>
                        <p className="text-[9px] font-mono text-slate-500 mt-0.5">
                          ICCID: {s.iccid || '896201xxxxxxxxxx'} • Pulsa: Rp {(s.mainBalance || 0).toLocaleString('id-ID')}
                        </p>
                      </div>

                      {/* Footer: Price */}
                      <div className="pt-2 border-t-2 border-black flex items-center justify-between">
                        <span className="text-[10px] font-bold text-slate-700 uppercase">Harga Khusus</span>
                        <span className="text-lg font-black font-mono tracking-tight text-black">
                          Rp {s.sellPrice.toLocaleString('id-ID')}
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )
          ) : (
            selectedProductsList.length === 0 ? (
              <div className="py-24 text-center text-text-muted space-y-2 print:hidden">
                <Tag className="w-12 h-12 mx-auto opacity-30" />
                <p className="text-xs font-bold text-text-primary">Pilih Produk di Sebelah Kiri</p>
                <p className="text-[11px]">Pilih barang dagangan untuk melihat pratinjau label harga dan barcode.</p>
              </div>
            ) : (
              <div className={`grid gap-4 w-full max-w-4xl ${
                templateSize === 'shelf_tag' ? 'grid-cols-2' :
                templateSize === 'thermal_40x30' ? 'grid-cols-3' :
                templateSize === 'thermal_33x15' ? 'grid-cols-4' : 'grid-cols-3'
              } print:grid-cols-3 print:gap-2`}>
                {selectedProductsList.flatMap((p) => 
                  Array.from({ length: copiesPerItem }).map((_, copyIdx) => (
                    <div
                      key={`${p.id}-${copyIdx}`}
                      className={`bg-white text-black border border-black rounded-lg p-3 flex flex-col justify-between shadow-sm print:shadow-none print:border-black print:break-inside-avoid ${
                        templateSize === 'shelf_tag' ? 'min-h-[140px]' :
                        templateSize === 'thermal_40x30' ? 'min-h-[110px] p-2' :
                        templateSize === 'thermal_33x15' ? 'min-h-[70px] p-1.5' : 'min-h-[120px]'
                      }`}
                    >
                      {/* Header: Product Name */}
                      <div>
                        <h3 className={`font-bold uppercase leading-tight line-clamp-2 ${templateSize === 'thermal_33x15' ? 'text-[9px]' : 'text-xs'}`}>
                          {p.name}
                        </h3>
                        <p className={`font-mono text-slate-600 ${templateSize === 'thermal_33x15' ? 'text-[7px]' : 'text-[9px]'}`}>
                          SKU: {p.sku}
                        </p>
                      </div>

                      {/* Barcode SVG */}
                      <div className="my-1 text-center">
                        <BarcodeSvg
                          code={p.barcode || p.sku}
                          width={templateSize === 'thermal_33x15' ? 100 : 140}
                          height={templateSize === 'thermal_33x15' ? 20 : 28}
                        />
                        <p className="font-mono text-[8px] tracking-widest mt-0.5">{p.barcode || p.sku}</p>
                      </div>

                      {/* Footer: Price & Wholesale */}
                      <div className="pt-1 border-t border-black flex items-end justify-between">
                        <div>
                          {p.wholesalePrice && templateSize === 'shelf_tag' && (
                            <p className="text-[8px] font-bold text-emerald-800">
                              GROSIR: Rp {p.wholesalePrice.toLocaleString('id-ID')} (≥{p.wholesaleMinQty || 5} {p.unit})
                            </p>
                          )}
                          <span className="text-[8px] text-slate-600">Harga / {p.unit || 'PCS'}</span>
                        </div>
                        <span className={`font-black font-mono tracking-tight ${templateSize === 'thermal_33x15' ? 'text-xs' : 'text-base'}`}>
                          Rp {p.sellPrice.toLocaleString('id-ID')}
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )
          )}
        </div>
      </section>
    </div>
  );
};
export default PriceTagLabelPage;
