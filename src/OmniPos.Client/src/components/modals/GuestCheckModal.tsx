import React, { useRef } from 'react';
import { Printer, X, Receipt, UtensilsCrossed, Clock, CheckCircle2 } from 'lucide-react';
import { useAuthStore } from '../../store/useAuthStore';
import { useToastStore } from '../../store/useToastStore';

export interface GuestCheckData {
  tableNumber: string;
  areaName?: string;
  orderNumber?: string;
  serverName?: string;
  occupiedSince?: string;
  items: Array<{
    name: string;
    quantity: number;
    unitPrice: number;
    totalPrice: number;
    notes?: string;
    modifiers?: Array<{ name: string; price: number }>;
  }>;
  subtotal: number;
  taxAmount?: number;
  serviceChargeAmount?: number;
  totalAmount: number;
}

interface GuestCheckModalProps {
  isOpen: boolean;
  data: GuestCheckData | null;
  onClose: () => void;
}

export const GuestCheckModal: React.FC<GuestCheckModalProps> = ({
  isOpen,
  data,
  onClose
}) => {
  const { storeInfo } = useAuthStore();
  const printRef = useRef<HTMLDivElement>(null);

  if (!isOpen || !data) return null;

  const handlePrint = () => {
    const printContent = printRef.current?.innerHTML;
    if (!printContent) return;

    const printWindow = window.open('', '_blank', 'width=450,height=700');
    if (!printWindow) {
      useToastStore.getState().showToast('Izinkan pop-up browser untuk mencetak Guest Check.', 'warning');
      return;
    }

    printWindow.document.write(`
      <html>
        <head>
          <title>Guest Check - Meja ${data.tableNumber}</title>
          <style>
            body {
              font-family: 'Courier New', Courier, monospace;
              width: 78mm;
              margin: 0 auto;
              padding: 10px;
              color: #000;
              font-size: 12px;
            }
            .text-center { text-align: center; }
            .text-right { text-align: right; }
            .bold { font-weight: bold; }
            .divider { border-top: 1px dashed #000; margin: 6px 0; }
            .flex-between { display: flex; justify-content: space-between; }
            .item-row { margin: 3px 0; }
            .modifier-row { font-size: 10px; padding-left: 8px; color: #444; }
            .footer-box { border: 1px solid #000; padding: 4px; margin-top: 10px; text-align: center; font-size: 10px; }
          </style>
        </head>
        <body>
          ${printContent}
          <script>
            window.onload = function() {
              window.print();
              setTimeout(function() { window.close(); }, 500);
            };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
    useToastStore.getState().showToast(`Guest Check Meja ${data.tableNumber} dikirim ke printer!`, 'success');
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4 select-none">
      <div className="w-full max-w-md bg-surface border border-border-strong rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="p-4 bg-subtle border-b border-border-subtle flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-600 flex items-center justify-center font-bold">
              <Receipt className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-text-primary">
                Guest Check (Pra-Tagihan Meja)
              </h3>
              <p className="text-xs text-text-secondary">
                Meja {data.tableNumber} — {data.areaName || 'Resto'}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 rounded-md text-text-muted hover:text-text-primary">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Paper Bill Simulation Preview */}
        <div className="p-5 overflow-y-auto flex-1 bg-subtle/50 flex justify-center">
          <div 
            ref={printRef}
            className="w-full max-w-[340px] bg-white text-zinc-950 p-4 rounded-lg shadow-md font-mono text-[11px] leading-relaxed border border-zinc-200"
          >
            {/* Header */}
            <div className="text-center space-y-0.5">
              <h2 className="font-extrabold text-sm tracking-wide uppercase">
                {storeInfo?.storeName || 'OMNIPOS RESTO & KAFE'}
              </h2>
              <p className="text-[10px] text-zinc-600">
                {storeInfo?.storeAddress || 'Jl. Kuliner Nusantara No. 88'}
              </p>
              <p className="text-[10px] text-zinc-600">
                Telp: {storeInfo?.storePhone || '0812-3456-7890'}
              </p>
            </div>

            <div className="border-t border-dashed border-zinc-400 my-2.5" />

            {/* Meta Table */}
            <div className="space-y-1 text-[10px]">
              <div className="flex justify-between font-bold text-[12px]">
                <span>MEJA: {data.tableNumber}</span>
                <span>{data.orderNumber || 'GUEST CHECK'}</span>
              </div>
              <div className="flex justify-between text-zinc-600">
                <span>Area: {data.areaName || 'Utama'}</span>
                <span>Waktu: {new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}</span>
              </div>
              <div className="flex justify-between text-zinc-600">
                <span>Pelayan: {data.serverName || 'Waiter'}</span>
                <span>Status: Belum Dibayar</span>
              </div>
            </div>

            <div className="border-t border-dashed border-zinc-400 my-2.5" />

            {/* Items */}
            <div className="space-y-1.5">
              {data.items.map((item, idx) => (
                <div key={idx} className="space-y-0.5">
                  <div className="flex justify-between font-bold">
                    <span className="truncate max-w-[200px]">{item.quantity}x {item.name}</span>
                    <span>Rp {item.totalPrice.toLocaleString('id-ID')}</span>
                  </div>
                  {item.modifiers?.map((m, mi) => (
                    <div key={mi} className="flex justify-between text-[10px] text-zinc-600 pl-3">
                      <span>• {m.name}</span>
                      {m.price > 0 && <span>+Rp {m.price.toLocaleString('id-ID')}</span>}
                    </div>
                  ))}
                  {item.notes && (
                    <p className="text-[9px] text-amber-700 italic pl-3">"{item.notes}"</p>
                  )}
                </div>
              ))}
            </div>

            <div className="border-t border-dashed border-zinc-400 my-2.5" />

            {/* Totals */}
            <div className="space-y-1 text-[11px]">
              <div className="flex justify-between">
                <span>Subtotal ({data.items.reduce((a, b) => a + b.quantity, 0)} item):</span>
                <span>Rp {data.subtotal.toLocaleString('id-ID')}</span>
              </div>
              {data.serviceChargeAmount ? (
                <div className="flex justify-between text-zinc-600 text-[10px]">
                  <span>Service Charge:</span>
                  <span>Rp {data.serviceChargeAmount.toLocaleString('id-ID')}</span>
                </div>
              ) : null}
              {data.taxAmount ? (
                <div className="flex justify-between text-zinc-600 text-[10px]">
                  <span>Pajak Restoran (PB1):</span>
                  <span>Rp {data.taxAmount.toLocaleString('id-ID')}</span>
                </div>
              ) : null}
              <div className="border-t border-zinc-300 my-1" />
              <div className="flex justify-between font-extrabold text-sm text-zinc-950">
                <span>TOTAL TAGIHAN:</span>
                <span>Rp {data.totalAmount.toLocaleString('id-ID')}</span>
              </div>
            </div>

            {/* Footer Notice */}
            <div className="mt-3 p-2 border border-zinc-300 rounded text-center text-[9px] text-zinc-600 space-y-0.5">
              <p className="font-bold text-zinc-800 uppercase tracking-tight">*** BILL SEMENTARA (GUEST CHECK) ***</p>
              <p>Belum termasuk bukti lunas transaksi.</p>
              <p>Mohon bawa slip ini ke kasir untuk proses pelunasan.</p>
            </div>
          </div>
        </div>

        {/* Modal Action Buttons */}
        <div className="p-4 bg-surface border-t border-border-subtle flex gap-2">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-2 rounded-lg bg-subtle hover:bg-card-hover border border-border-subtle text-xs font-semibold text-text-secondary"
          >
            Tutup
          </button>
          <button
            type="button"
            onClick={handlePrint}
            className="flex-1 py-2 rounded-lg bg-primary hover:bg-primary-hover text-primary-text text-xs font-bold shadow-md flex items-center justify-center gap-1.5"
          >
            <Printer className="w-4 h-4" />
            <span>Cetak Guest Check (Faktur Meja)</span>
          </button>
        </div>
      </div>
    </div>
  );
};
