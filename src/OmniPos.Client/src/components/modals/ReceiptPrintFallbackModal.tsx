import React, { useRef } from 'react';
import { Printer, Download, Check, AlertCircle, Copy, Share2 } from 'lucide-react';
import { useHardwareStore } from '../../store/useHardwareStore';
import { useToastStore } from '../../store/useToastStore';

export const ReceiptPrintFallbackModal: React.FC = () => {
  const { isBrowserPrintOpen, closeBrowserPrint, browserPrintData } = useHardwareStore();
  const receiptRef = useRef<HTMLDivElement>(null);

  if (!isBrowserPrintOpen || !browserPrintData) return null;

  const order = browserPrintData;
  const items = order.items || [];
  const payments = order.payments || [];
  const now = new Date(order.orderDate || Date.now()).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' });

  const handlePrint = () => {
    const printContent = receiptRef.current?.innerHTML;
    if (!printContent) return;

    const printWindow = window.open('', '_blank', 'width=450,height=700');
    if (!printWindow) return;

    printWindow.document.write(`
      <html>
        <head>
          <title>Struk ${order.invoiceNumber || 'Transaksi'}</title>
          <style>
            @page { size: 80mm auto; margin: 0; }
            body {
              font-family: 'Courier New', Courier, monospace;
              width: 72mm;
              margin: 0 auto;
              padding: 8px 4px;
              color: #000;
              font-size: 11px;
              line-height: 1.3;
            }
            .center { text-align: center; }
            .right { text-align: right; }
            .bold { font-weight: bold; }
            .line { border-top: 1px dashed #000; margin: 6px 0; }
            .row { display: flex; justify-content: space-between; margin: 2px 0; }
            .title { font-size: 14px; font-weight: bold; margin: 2px 0; }
            .footer { font-size: 9px; text-align: center; margin-top: 12px; }
          </style>
        </head>
        <body onload="window.print(); window.close();">
          ${printContent}
        </body>
      </html>
    `);
    printWindow.document.close();
    useToastStore.getState().showToast('Membuka dialog cetak browser...', 'info');
  };

  const handleCopyTextReceipt = () => {
    const lines = [
      `================================`,
      `       OMNIPOS STORE            `,
      `   Jl. Bisnis Modern No. 1      `,
      `================================`,
      `No. Nota : ${order.invoiceNumber || 'INV-001'}`,
      `Tanggal  : ${now}`,
      `Kasir    : ${order.cashierUserId || 'Kasir'}`,
      `Pelanggan: ${order.customerName || 'Pelanggan Umum'}`,
      `--------------------------------`,
      ...items.map((it: any) => `${it.productName || it.name} x${it.quantity} = Rp ${(it.totalPrice || it.unitPrice * it.quantity).toLocaleString('id-ID')}`),
      `--------------------------------`,
      `TOTAL    : Rp ${(order.totalAmount || 0).toLocaleString('id-ID')}`,
      `BAYAR    : Rp ${(order.totalPaid || order.totalAmount || 0).toLocaleString('id-ID')}`,
      `KEMBALI  : Rp ${(order.changeAmount || 0).toLocaleString('id-ID')}`,
      `================================`,
      ` Terima kasih atas kunjungan Anda! `
    ].join('\n');

    navigator.clipboard.writeText(lines);
    useToastStore.getState().showToast('Teks struk berhasil disalin ke clipboard!', 'success');
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4 select-none">
      <div className="w-full max-w-sm bg-card border border-border-strong rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-3.5 bg-surface border-b border-border-subtle flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-primary/10 text-primary flex items-center justify-center font-bold">
              <Printer className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-xs text-text-primary">Cetak Struk Transaksi (Fallback)</h3>
              <p className="text-[10px] text-text-muted">Preview struk nota thermal 80mm / 58mm</p>
            </div>
          </div>
          <button onClick={closeBrowserPrint} className="text-text-muted hover:text-text-primary font-bold text-sm">
            ✕
          </button>
        </div>

        {/* Receipt Thermal Paper Simulation */}
        <div className="flex-1 overflow-y-auto p-4 bg-subtle flex justify-center">
          <div 
            ref={receiptRef}
            className="w-full max-w-[280px] bg-white text-zinc-900 p-4 rounded-lg shadow-md border border-zinc-200 font-mono text-[11px] leading-tight space-y-2 select-text"
          >
            {/* Store Header */}
            <div className="text-center space-y-0.5">
              <h2 className="text-sm font-bold uppercase tracking-tight">OMNIPOS STORE</h2>
              <p className="text-[10px] text-zinc-600">Jl. Bisnis Modern No. 1, Jakarta</p>
              <p className="text-[10px] text-zinc-600">Telp: 0812-3456-7890</p>
            </div>

            <div className="border-t border-dashed border-zinc-400 my-1.5" />

            {/* Meta */}
            <div className="text-[10px] space-y-0.5">
              <div className="flex justify-between">
                <span>No. Nota:</span>
                <span className="font-bold">{order.invoiceNumber || 'INV-LOCAL'}</span>
              </div>
              <div className="flex justify-between">
                <span>Tanggal:</span>
                <span>{now}</span>
              </div>
              <div className="flex justify-between">
                <span>Kasir:</span>
                <span>{order.cashierUserId || 'Kasir'}</span>
              </div>
              {order.customerName && (
                <div className="flex justify-between">
                  <span>Member:</span>
                  <span className="font-bold">{order.customerName}</span>
                </div>
              )}
            </div>

            <div className="border-t border-dashed border-zinc-400 my-1.5" />

            {/* Items */}
            <div className="space-y-1.5">
              {items.map((it: any, idx: number) => (
                <div key={idx} className="space-y-0.5">
                  <div className="font-bold truncate">{it.productName || it.name}</div>
                  <div className="flex justify-between text-[10px] text-zinc-700">
                    <span>{it.quantity} x {(it.unitPrice || 0).toLocaleString('id-ID')}</span>
                    <span className="font-bold text-zinc-900 font-mono">
                      {(it.totalPrice || (it.unitPrice * it.quantity) || 0).toLocaleString('id-ID')}
                    </span>
                  </div>
                  {it.serialNumber && (
                    <div className="text-[9px] text-zinc-500 font-mono">SN: {it.serialNumber}</div>
                  )}
                  {it.notes && (
                    <div className="text-[9px] text-zinc-500 italic">({it.notes})</div>
                  )}
                </div>
              ))}
            </div>

            <div className="border-t border-dashed border-zinc-400 my-1.5" />

            {/* Summary */}
            <div className="space-y-0.5 text-[10px]">
              <div className="flex justify-between">
                <span>Subtotal:</span>
                <span>Rp {(order.subtotal || order.totalAmount || 0).toLocaleString('id-ID')}</span>
              </div>
              {order.discountAmount > 0 && (
                <div className="flex justify-between text-rose-600">
                  <span>Diskon:</span>
                  <span>-Rp {order.discountAmount.toLocaleString('id-ID')}</span>
                </div>
              )}
              {order.roundingAmount !== 0 && order.roundingAmount && (
                <div className="flex justify-between">
                  <span>Pembulatan:</span>
                  <span>{order.roundingAmount > 0 ? '+' : ''}Rp {order.roundingAmount.toLocaleString('id-ID')}</span>
                </div>
              )}
              <div className="flex justify-between font-bold text-xs pt-1 border-t border-zinc-300">
                <span>TOTAL:</span>
                <span>Rp {(order.totalAmount || 0).toLocaleString('id-ID')}</span>
              </div>
              {payments.map((p: any, idx: number) => (
                <div key={idx} className="flex justify-between text-[10px] text-zinc-700">
                  <span>Bayar ({p.method || 'Tunai'}):</span>
                  <span>Rp {(p.amount || 0).toLocaleString('id-ID')}</span>
                </div>
              ))}
              <div className="flex justify-between text-[10px] font-bold">
                <span>Kembalian:</span>
                <span>Rp {(order.changeAmount || 0).toLocaleString('id-ID')}</span>
              </div>
            </div>

            <div className="border-t border-dashed border-zinc-400 my-1.5" />

            {/* Footer */}
            <div className="text-center text-[9px] text-zinc-600 pt-1 space-y-0.5">
              <p className="font-bold">TERIMA KASIH ATAS KUNJUNGAN ANDA!</p>
              <p>Barang yang sudah dibeli tidak dapat ditukar/dikembalikan tanpa struk asli.</p>
              <p className="text-[8px] text-zinc-400 pt-1">Dicetak oleh OmniPOS Enterprise Driver</p>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-3.5 bg-surface border-t border-border-subtle flex gap-2">
          <button
            onClick={handleCopyTextReceipt}
            className="p-2.5 bg-subtle hover:bg-card-hover border border-border-subtle rounded-xl text-text-secondary hover:text-text-primary transition-colors flex items-center justify-center"
            title="Salin Teks Nota"
          >
            <Copy className="w-4 h-4" />
          </button>
          <button
            onClick={handlePrint}
            className="flex-1 py-2.5 bg-primary hover:bg-primary-hover text-primary-text rounded-xl font-bold flex items-center justify-center gap-1.5 shadow-md text-xs"
          >
            <Printer className="w-4 h-4" />
            <span>Cetak Browser / PDF [Ctrl+P]</span>
          </button>
        </div>
      </div>
    </div>
  );
};
