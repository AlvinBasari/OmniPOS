import React, { useState } from 'react';
import { 
  Divide, 
  Users, 
  Check, 
  X, 
  Receipt, 
  CreditCard, 
  ArrowRight,
  Sparkles,
  Layers
} from 'lucide-react';
import { CartItem } from '../../types';
import { useToastStore } from '../../store/useToastStore';
import { playCashBeep } from '../../store/useCartStore';

interface SplitBillModalProps {
  isOpen: boolean;
  tableNumber?: string;
  totalAmount: number;
  items: CartItem[];
  onClose: () => void;
  onCompleteSplitPayment?: (shareAmount: number, splitNumber: number) => void;
}

export const SplitBillModal: React.FC<SplitBillModalProps> = ({
  isOpen,
  tableNumber,
  totalAmount,
  items,
  onClose,
  onCompleteSplitPayment
}) => {
  const [splitMode, setSplitMode] = useState<'equal' | 'itemized'>('equal');
  const [paxCount, setPaxCount] = useState<number>(2);
  const [paidShares, setPaidShares] = useState<number[]>([]);
  const [activePayingShare, setActivePayingShare] = useState<number | null>(null);

  if (!isOpen) return null;

  // Equal split calculation
  const shareAmount = Math.ceil(totalAmount / paxCount / 100) * 100;
  const remainingShares = paxCount - paidShares.length;
  const remainingTotal = shareAmount * remainingShares;

  const handlePayShare = (shareIndex: number) => {
    playCashBeep();
    setPaidShares([...paidShares, shareIndex]);
    useToastStore.getState().showToast(`Bagian ${shareIndex + 1} sebesar Rp ${shareAmount.toLocaleString('id-ID')} berhasil dibayar!`, 'success');
    if (onCompleteSplitPayment) {
      onCompleteSplitPayment(shareAmount, shareIndex + 1);
    }
  };

  const isAllPaid = paidShares.length === paxCount;

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4 select-none">
      <div className="w-full max-w-lg bg-surface border border-border-strong rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-4 bg-subtle border-b border-border-subtle flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center font-bold">
              <Divide className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-text-primary">
                Split Bill (Pecah Tagihan) {tableNumber ? `— Meja ${tableNumber}` : ''}
              </h3>
              <p className="text-xs text-text-secondary">
                Total Tagihan: <strong className="text-text-primary font-mono">Rp {totalAmount.toLocaleString('id-ID')}</strong>
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 rounded-md text-text-muted hover:text-text-primary">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Mode Selector */}
        <div className="px-5 pt-4">
          <div className="grid grid-cols-2 gap-2 p-1 bg-subtle rounded-lg border border-border-subtle">
            <button
              type="button"
              onClick={() => setSplitMode('equal')}
              className={`py-1.5 rounded-md text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                splitMode === 'equal'
                  ? 'bg-primary text-primary-text shadow-sm'
                  : 'text-text-secondary hover:text-text-primary'
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              <span>1. Bagi Sama Rata (Equal Split)</span>
            </button>
            <button
              type="button"
              onClick={() => setSplitMode('itemized')}
              className={`py-1.5 rounded-md text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                splitMode === 'itemized'
                  ? 'bg-primary text-primary-text shadow-sm'
                  : 'text-text-secondary hover:text-text-primary'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>2. Pisah per Menu (Itemized)</span>
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-5 overflow-y-auto space-y-4 text-xs flex-1">
          {splitMode === 'equal' ? (
            <>
              {/* Number of Pax Buttons */}
              <div className="space-y-2">
                <label className="block font-bold text-text-primary uppercase tracking-wider text-[11px]">
                  Bagi Berapa Orang (Jumlah Tamu)?
                </label>
                <div className="grid grid-cols-5 gap-2">
                  {[2, 3, 4, 5, 6].map((count) => (
                    <button
                      key={count}
                      type="button"
                      onClick={() => {
                        setPaxCount(count);
                        setPaidShares([]);
                      }}
                      className={`py-2 rounded-xl border text-center font-bold font-mono transition-all ${
                        paxCount === count
                          ? 'bg-primary text-primary-text border-primary shadow-xs'
                          : 'bg-card border-border-subtle hover:bg-card-hover text-text-primary'
                      }`}
                    >
                      <span className="text-sm block">{count}</span>
                      <span className="text-[10px] font-normal opacity-75">Orang</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Share Amount Card */}
              <div className="p-4 bg-primary/10 border border-primary/25 rounded-xl flex items-center justify-between">
                <div>
                  <span className="text-[11px] text-text-secondary">Iuran Tagihan per Orang:</span>
                  <p className="text-xl font-black font-mono text-primary leading-tight mt-0.5">
                    Rp {shareAmount.toLocaleString('id-ID')}
                  </p>
                </div>
                <div className="text-right text-[11px] text-text-muted">
                  <p>Sisa: <strong>{remainingShares} / {paxCount} Orang</strong></p>
                  <p className="font-mono">Rp {remainingTotal.toLocaleString('id-ID')}</p>
                </div>
              </div>

              {/* Shares Checklist */}
              <div className="space-y-2">
                <label className="block font-bold text-text-primary uppercase tracking-wider text-[11px]">
                  Daftar Pembayaran per Tamu:
                </label>
                <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                  {Array.from({ length: paxCount }).map((_, idx) => {
                    const isPaid = paidShares.includes(idx);
                    return (
                      <div
                        key={idx}
                        className={`p-3 rounded-xl border flex items-center justify-between transition-all ${
                          isPaid
                            ? 'bg-status-success/10 border-status-success/30 text-status-success'
                            : 'bg-card border-border-subtle'
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          <div className={`w-6 h-6 rounded-full flex items-center justify-center font-bold text-xs ${
                            isPaid ? 'bg-status-success text-white' : 'bg-subtle text-text-secondary'
                          }`}>
                            {idx + 1}
                          </div>
                          <div>
                            <span className="font-bold text-text-primary">Orang ke-{idx + 1}</span>
                            <p className="text-[10px] text-text-muted font-mono">Rp {shareAmount.toLocaleString('id-ID')}</p>
                          </div>
                        </div>

                        {isPaid ? (
                          <div className="flex items-center gap-1 text-[11px] font-bold text-status-success">
                            <Check className="w-4 h-4" />
                            <span>Lunas</span>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handlePayShare(idx)}
                            className="px-3 py-1.5 bg-primary hover:bg-primary-hover text-primary-text rounded-lg text-xs font-bold shadow-xs flex items-center gap-1"
                          >
                            <CreditCard className="w-3.5 h-3.5" />
                            <span>Bayar Bagian Ini</span>
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </>
          ) : (
            /* Itemized Breakdown */
            <div className="space-y-3">
              <p className="text-text-secondary text-[11px]">
                Daftar menu di meja ini untuk dibayar sebagian atau terpisah:
              </p>
              <div className="space-y-1.5 max-h-60 overflow-y-auto pr-1">
                {items.map((it, idx) => (
                  <div key={idx} className="p-2.5 bg-card border border-border-subtle rounded-lg flex items-center justify-between">
                    <div>
                      <p className="font-bold text-text-primary text-xs">{it.quantity}x {it.name}</p>
                      {it.modifiers?.map((m, mi) => (
                        <p key={mi} className="text-[10px] text-text-muted">• {m.modifierName || m.name}</p>
                      ))}
                    </div>
                    <div className="text-right">
                      <span className="font-mono font-bold text-text-primary">
                        Rp {it.totalPrice.toLocaleString('id-ID')}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
              <p className="text-[11px] text-text-muted italic">
                * Tip: Untuk membayar menu tertentu, Anda juga dapat menahan keranjang `[F6]` atau membayar sebagian via metode tunai.
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-surface border-t border-border-subtle flex items-center justify-between">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-subtle hover:bg-card-hover border border-border-subtle rounded-lg text-xs font-semibold text-text-secondary"
          >
            {isAllPaid ? 'Selesai' : 'Tutup'}
          </button>
          {isAllPaid && (
            <span className="text-xs font-bold text-status-success flex items-center gap-1">
              <Check className="w-4 h-4" />
              <span>Semua Bagian Berhasil Dilunasi!</span>
            </span>
          )}
        </div>
      </div>
    </div>
  );
};
