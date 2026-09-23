import React, { useState } from 'react';
import { 
  X, 
  Printer, 
  Tag, 
  Layers, 
  Check, 
  Barcode as BarcodeIcon,
  Sparkles,
  Info
} from 'lucide-react';
import { Product } from '../../types';
import { useToastStore } from '../../store/useToastStore';
import { RealBarcodeSvg, generateBarcodeSvgString } from '../../utils/barcodeGenerator';

export type BarcodeTemplate = 'thermal_40x30' | 'thermal_33x15' | 'shelf_tag';

interface QuickBarcodePrintModalProps {
  isOpen: boolean;
  product: Product | null;
  onClose: () => void;
}

export const QuickBarcodePrintModal: React.FC<QuickBarcodePrintModalProps> = ({
  isOpen,
  product,
  onClose
}) => {
  const [template, setTemplate] = useState<BarcodeTemplate>('thermal_40x30');
  const [copies, setCopies] = useState<number>(1);
  const [isPrinting, setIsPrinting] = useState(false);

  if (!isOpen || !product) return null;

  const barcodeText = product.barcode?.trim() || product.sku;

  const handlePrint = () => {
    setIsPrinting(true);
    const printWindow = window.open('', '_blank', 'width=600,height=700');
    if (!printWindow) {
      useToastStore.getState().showToast('Izinkan pop-up browser untuk mencetak barcode!', 'error');
      setIsPrinting(false);
      return;
    }

    // Generate label HTML
    let labelHtml = '';
    const safeCopies = Math.max(1, Math.min(copies, 200));

    const svg33x15 = generateBarcodeSvgString(barcodeText, 114, 18);
    const svgShelf = generateBarcodeSvgString(barcodeText, 160, 28);
    const svg40x30 = generateBarcodeSvgString(barcodeText, 138, 26);

    for (let i = 0; i < safeCopies; i++) {
      if (template === 'thermal_33x15') {
        labelHtml += `
          <div class="label thermal-33x15">
            <div class="title">${product.name}</div>
            <div class="sku-code">SKU: ${product.sku}</div>
            <div class="barcode-container">
              ${svg33x15}
            </div>
            <div class="price">Rp ${product.sellPrice.toLocaleString('id-ID')}</div>
          </div>
        `;
      } else if (template === 'shelf_tag') {
        labelHtml += `
          <div class="label shelf-tag">
            <div class="shop-header">OmniPOS Retail & Supermarket</div>
            <div class="title">${product.name}</div>
            <div class="meta-row">
              <span>SKU: ${product.sku}</span>
              <span>Unit: ${product.unit || 'PCS'}</span>
            </div>
            <div class="barcode-container">
              ${svgShelf}
              <div class="barcode-num">${barcodeText}</div>
            </div>
            <div class="footer-row">
              ${product.wholesalePrice ? `<div class="wholesale">Grosir: Rp ${product.wholesalePrice.toLocaleString('id-ID')} (≥${product.wholesaleMinQty || 5})</div>` : '<div></div>'}
              <div class="price">Rp ${product.sellPrice.toLocaleString('id-ID')}</div>
            </div>
          </div>
        `;
      } else {
        // default 40x30
        labelHtml += `
          <div class="label thermal-40x30">
            <div class="title">${product.name}</div>
            <div class="sku-code">SKU: ${product.sku}</div>
            <div class="barcode-container">
              ${svg40x30}
              <div class="barcode-num">${barcodeText}</div>
            </div>
            <div class="footer-row">
              <span class="unit">/${product.unit || 'PCS'}</span>
              <span class="price">Rp ${product.sellPrice.toLocaleString('id-ID')}</span>
            </div>
          </div>
        `;
      }
    }

    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Cetak Barcode - ${product.name}</title>
          <style>
            @page {
              margin: 0;
              size: auto;
            }
            body {
              font-family: Arial, Helvetica, sans-serif;
              margin: 0;
              padding: 6px;
              background: #fff;
              color: #000;
            }
            .labels-container {
              display: flex;
              flex-direction: column;
              gap: 8px;
            }
            .label {
              border: 1px dashed #666;
              box-sizing: border-box;
              page-break-after: always;
              overflow: hidden;
              background: #fff;
            }
            @media print {
              .label {
                border: none;
              }
            }
            /* Thermal 40x30mm */
            .thermal-40x30 {
              width: 151px;
              height: 113px;
              padding: 4px 6px;
              display: flex;
              flex-direction: column;
              justify-content: space-between;
              text-align: center;
            }
            .thermal-40x30 .title {
              font-size: 9px;
              font-weight: bold;
              line-height: 1.1;
              text-transform: uppercase;
              max-height: 20px;
              overflow: hidden;
            }
            .thermal-40x30 .sku-code {
              font-size: 7px;
              color: #444;
            }
            .thermal-40x30 .barcode-bars {
              font-family: 'Libre Barcode 128', 'Courier New', monospace;
              font-size: 26px;
              line-height: 1;
              letter-spacing: 2px;
            }
            .thermal-40x30 .barcode-num {
              font-size: 8px;
              letter-spacing: 2px;
              font-family: monospace;
            }
            .thermal-40x30 .footer-row {
              display: flex;
              justify-content: space-between;
              align-items: baseline;
              border-top: 1px solid #000;
              padding-top: 2px;
            }
            .thermal-40x30 .unit { font-size: 8px; }
            .thermal-40x30 .price { font-size: 12px; font-weight: 900; }

            /* Thermal 33x15mm */
            .thermal-33x15 {
              width: 124px;
              height: 56px;
              padding: 2px 4px;
              display: flex;
              flex-direction: column;
              justify-content: space-between;
              text-align: center;
            }
            .thermal-33x15 .title {
              font-size: 7px;
              font-weight: bold;
              white-space: nowrap;
              overflow: hidden;
              text-overflow: ellipsis;
            }
            .thermal-33x15 .sku-code { display: none; }
            .thermal-33x15 .barcode-bars {
              font-family: 'Libre Barcode 128', 'Courier New', monospace;
              font-size: 18px;
              line-height: 1;
            }
            .thermal-33x15 .price { font-size: 9px; font-weight: bold; }

            /* Shelf Tag 65x35mm */
            .shelf-tag {
              width: 245px;
              height: 132px;
              padding: 6px 8px;
              display: flex;
              flex-direction: column;
              justify-content: space-between;
            }
            .shelf-tag .shop-header {
              font-size: 7px;
              text-transform: uppercase;
              letter-spacing: 1px;
              color: #555;
            }
            .shelf-tag .title {
              font-size: 11px;
              font-weight: bold;
              line-height: 1.1;
              text-transform: uppercase;
            }
            .shelf-tag .meta-row {
              display: flex;
              justify-content: space-between;
              font-size: 8px;
              color: #444;
            }
            .shelf-tag .barcode-container {
              text-align: center;
            }
            .shelf-tag .barcode-bars {
              font-family: 'Libre Barcode 128', 'Courier New', monospace;
              font-size: 26px;
              line-height: 1;
            }
            .shelf-tag .barcode-num {
              font-size: 8px;
              font-family: monospace;
              letter-spacing: 2px;
            }
            .shelf-tag .footer-row {
              display: flex;
              justify-content: space-between;
              align-items: flex-end;
              border-top: 1px solid #000;
              padding-top: 3px;
            }
            .shelf-tag .wholesale {
              font-size: 8px;
              font-weight: bold;
              color: #065f46;
            }
            .shelf-tag .price {
              font-size: 15px;
              font-weight: 900;
            }
          </style>
        </head>
        <body>
          <div class="labels-container">
            ${labelHtml}
          </div>
          <script>
            window.onload = function() {
              window.print();
              setTimeout(function() {
                window.close();
              }, 500);
            };
          </script>
        </body>
      </html>
    `;

    printWindow.document.open();
    printWindow.document.write(htmlContent);
    printWindow.document.close();
    setIsPrinting(false);
    useToastStore.getState().showToast(`Mengirim ${safeCopies} label barcode ke printer thermal...`, 'success');
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-card border border-border-subtle rounded-2xl w-full max-w-lg shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="p-4 border-b border-border-subtle flex items-center justify-between bg-surface">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center font-bold">
              <BarcodeIcon className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-text-primary">
                Cetak Stiker Barcode & Label Harga
              </h2>
              <p className="text-[11px] text-text-secondary">
                Pratinjau langsung & cetak ke printer label thermal
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-text-muted hover:text-text-primary rounded-lg hover:bg-subtle transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-4 space-y-4 overflow-y-auto max-h-[75vh]">
          {/* Target Product Card */}
          <div className="p-3 rounded-xl bg-subtle/70 border border-border-subtle flex items-center justify-between">
            <div>
              <h3 className="text-xs font-bold text-text-primary leading-tight">
                {product.name}
              </h3>
              <div className="flex items-center gap-2 mt-1 text-[11px] text-text-secondary font-mono">
                <span>SKU: {product.sku}</span>
                <span>•</span>
                <span>Barcode: {barcodeText}</span>
              </div>
            </div>
            <div className="text-right">
              <span className="text-xs text-text-muted">Harga Jual</span>
              <p className="text-sm font-black font-mono text-primary">
                Rp {product.sellPrice.toLocaleString('id-ID')}
              </p>
            </div>
          </div>

          {/* Template Selection */}
          <div>
            <label className="block text-xs font-bold text-text-secondary mb-1.5">
              Pilih Format Ukuran Stiker:
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setTemplate('thermal_40x30')}
                className={`p-2.5 rounded-xl border text-left transition-all ${
                  template === 'thermal_40x30'
                    ? 'border-primary bg-primary/10 text-primary shadow-xs'
                    : 'border-border-subtle bg-card hover:bg-card-hover text-text-secondary'
                }`}
              >
                <div className="font-bold text-xs flex items-center justify-between">
                  <span>Thermal 40x30</span>
                  {template === 'thermal_40x30' && <Check className="w-3.5 h-3.5" />}
                </div>
                <p className="text-[10px] text-text-muted mt-0.5">Standar Stiker Produk</p>
              </button>

              <button
                type="button"
                onClick={() => setTemplate('thermal_33x15')}
                className={`p-2.5 rounded-xl border text-left transition-all ${
                  template === 'thermal_33x15'
                    ? 'border-primary bg-primary/10 text-primary shadow-xs'
                    : 'border-border-subtle bg-card hover:bg-card-hover text-text-secondary'
                }`}
              >
                <div className="font-bold text-xs flex items-center justify-between">
                  <span>Mini 33x15</span>
                  {template === 'thermal_33x15' && <Check className="w-3.5 h-3.5" />}
                </div>
                <p className="text-[10px] text-text-muted mt-0.5">Aksesoris / Mini</p>
              </button>

              <button
                type="button"
                onClick={() => setTemplate('shelf_tag')}
                className={`p-2.5 rounded-xl border text-left transition-all ${
                  template === 'shelf_tag'
                    ? 'border-primary bg-primary/10 text-primary shadow-xs'
                    : 'border-border-subtle bg-card hover:bg-card-hover text-text-secondary'
                }`}
              >
                <div className="font-bold text-xs flex items-center justify-between">
                  <span>Label Rak 65x35</span>
                  {template === 'shelf_tag' && <Check className="w-3.5 h-3.5" />}
                </div>
                <p className="text-[10px] text-text-muted mt-0.5">Papan Rak & Grosir</p>
              </button>
            </div>
          </div>

          {/* Copies Configuration */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-bold text-text-secondary">
                Jumlah Lembar Cetak:
              </label>
              <span className="text-[11px] text-text-muted">
                Stok fisik: <strong className="text-text-primary">{product.currentStock} {product.unit}</strong>
              </span>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex gap-1.5 flex-1">
                {[1, 5, 10].map((num) => (
                  <button
                    key={num}
                    type="button"
                    onClick={() => setCopies(num)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all ${
                      copies === num
                        ? 'bg-primary text-primary-text border-primary shadow-xs'
                        : 'bg-subtle text-text-secondary hover:bg-card-hover border-border-subtle'
                    }`}
                  >
                    {num} Lembar
                  </button>
                ))}
                {product.currentStock > 0 && (
                  <button
                    type="button"
                    onClick={() => setCopies(Math.floor(product.currentStock))}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all ${
                      copies === Math.floor(product.currentStock)
                        ? 'bg-primary text-primary-text border-primary shadow-xs'
                        : 'bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20 border-emerald-500/30'
                    }`}
                  >
                    Sesuai Stok ({Math.floor(product.currentStock)})
                  </button>
                )}
              </div>
              <input
                type="number"
                min="1"
                max="200"
                value={copies}
                onChange={(e) => setCopies(Math.max(1, parseInt(e.target.value) || 1))}
                className="w-20 px-2.5 py-1.5 bg-card border border-border-strong rounded-lg text-xs font-bold text-center text-text-primary focus:outline-none focus:border-primary"
              />
            </div>
          </div>

          {/* Live Preview Box */}
          <div>
            <label className="block text-xs font-bold text-text-secondary mb-1.5">
              Pratinjau Hasil Cetak:
            </label>
            <div className="bg-slate-100 rounded-xl p-6 flex items-center justify-center border border-slate-200">
              {template === 'thermal_33x15' ? (
                <div className="w-[180px] bg-white text-black border border-black rounded p-2 text-center shadow-md">
                  <p className="text-[10px] font-bold uppercase truncate">{product.name}</p>
                  <div className="my-1">
                    <RealBarcodeSvg code={barcodeText} width={130} height={18} />
                  </div>
                  <p className="text-xs font-black font-mono">Rp {product.sellPrice.toLocaleString('id-ID')}</p>
                </div>
              ) : template === 'shelf_tag' ? (
                <div className="w-[280px] bg-white text-black border-2 border-black rounded-lg p-3 shadow-md space-y-2">
                  <div className="flex items-center justify-between text-[8px] text-slate-600 uppercase tracking-widest font-bold">
                    <span>OMNIPOS RETAIL</span>
                    <span>{product.unit || 'PCS'}</span>
                  </div>
                  <div>
                    <h4 className="text-xs font-bold uppercase leading-tight">{product.name}</h4>
                    <p className="text-[9px] font-mono text-slate-600">SKU: {product.sku}</p>
                  </div>
                  <div className="text-center py-1 bg-slate-50 rounded">
                    <RealBarcodeSvg code={barcodeText} width={160} height={28} />
                    <p className="text-[9px] font-mono tracking-widest mt-0.5">{barcodeText}</p>
                  </div>
                  <div className="pt-2 border-t-2 border-black flex items-end justify-between">
                    <div>
                      {product.wholesalePrice ? (
                        <p className="text-[9px] font-bold text-emerald-800">
                          GROSIR: Rp {product.wholesalePrice.toLocaleString('id-ID')} (≥{product.wholesaleMinQty || 5})
                        </p>
                      ) : (
                        <span className="text-[9px] text-slate-500">Harga Konsumen</span>
                      )}
                    </div>
                    <span className="text-lg font-black font-mono">
                      Rp {product.sellPrice.toLocaleString('id-ID')}
                    </span>
                  </div>
                </div>
              ) : (
                /* Standard Thermal 40x30 */
                <div className="w-[210px] bg-white text-black border-2 border-black rounded-lg p-3 shadow-md text-center space-y-1.5">
                  <h4 className="text-[11px] font-bold uppercase leading-tight line-clamp-2">{product.name}</h4>
                  <p className="text-[9px] font-mono text-slate-600">SKU: {product.sku}</p>
                  <div className="py-1">
                    <RealBarcodeSvg code={barcodeText} width={150} height={26} />
                    <p className="text-[9px] font-mono tracking-widest mt-0.5">{barcodeText}</p>
                  </div>
                  <div className="pt-1.5 border-t border-black flex items-baseline justify-between px-1">
                    <span className="text-[9px] text-slate-600">/{product.unit || 'PCS'}</span>
                    <span className="text-base font-black font-mono">
                      Rp {product.sellPrice.toLocaleString('id-ID')}
                    </span>
                  </div>
                </div>
              )}
            </div>
            <p className="text-[10px] text-text-muted mt-1.5 text-center flex items-center justify-center gap-1">
              <Info className="w-3 h-3" />
              <span>Didesain kompatibel dengan printer label thermal Xprinter, Blueprint, Kassen, Panda, dll.</span>
            </p>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-border-subtle bg-surface flex items-center justify-between">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-bold text-text-secondary hover:bg-subtle hover:text-text-primary transition-colors"
          >
            Tutup
          </button>
          <button
            type="button"
            onClick={handlePrint}
            disabled={isPrinting}
            className="px-5 py-2.5 bg-primary hover:bg-primary-hover text-primary-text font-bold text-xs rounded-xl flex items-center gap-2 shadow-md active:scale-95 transition-all"
          >
            <Printer className="w-4 h-4" />
            <span>Cetak {copies} Lembar Stiker</span>
          </button>
        </div>
      </div>
    </div>
  );
};
