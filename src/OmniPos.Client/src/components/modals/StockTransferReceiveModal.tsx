import React, { useState, useEffect } from 'react';
import { 
  ClipboardCheck, 
  X, 
  Check, 
  AlertTriangle, 
  CheckCircle2, 
  Building2, 
  Truck, 
  FileText,
  AlertCircle
} from 'lucide-react';
import { StockTransfer, StockTransferItem } from '../../types';
import { useToastStore } from '../../store/useToastStore';
import { useAuthStore } from '../../store/useAuthStore';

interface StockTransferReceiveModalProps {
  isOpen: boolean;
  onClose: () => void;
  transfer: StockTransfer | null;
  onReceived: () => void;
}

interface ReceiveItemState {
  itemId: string;
  productId: string;
  productName: string;
  sku: string;
  unit: string;
  quantitySent: number;
  quantityReceived: number;
  unitCost: number;
  notes: string;
}

export const StockTransferReceiveModal: React.FC<StockTransferReceiveModalProps> = ({
  isOpen,
  onClose,
  transfer,
  onReceived,
}) => {
  const { currentUser } = useAuthStore();
  const [items, setItems] = useState<ReceiveItemState[]>([]);
  const [discrepancyNotes, setDiscrepancyNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (transfer && isOpen) {
      setItems(
        (transfer.items || []).map(i => ({
          itemId: i.id || '',
          productId: i.productId,
          productName: i.productName,
          sku: i.productSku,
          unit: i.unit || 'PCS',
          quantitySent: i.quantitySent,
          quantityReceived: i.quantitySent, // Default to sent qty for speed
          unitCost: i.unitCost,
          notes: ''
        }))
      );
      setDiscrepancyNotes('');
    }
  }, [transfer, isOpen]);

  if (!isOpen || !transfer) return null;

  const handleQtyChange = (index: number, val: number) => {
    setItems(prev => prev.map((row, idx) => {
      if (idx !== index) return row;
      const cleanVal = Math.max(0, isNaN(val) ? 0 : val);
      return { ...row, quantityReceived: cleanVal };
    }));
  };

  const handleItemNotesChange = (index: number, val: string) => {
    setItems(prev => prev.map((row, idx) => idx === index ? { ...row, notes: val } : row));
  };

  const handleMatchAll = () => {
    setItems(prev => prev.map(row => ({
      ...row,
      quantityReceived: row.quantitySent
    })));
    useToastStore.getState().showToast('Seluruh kuantitas fisik diset sesuai surat jalan.', 'info');
  };

  const totalSent = items.reduce((acc, curr) => acc + curr.quantitySent, 0);
  const totalReceived = items.reduce((acc, curr) => acc + curr.quantityReceived, 0);
  const totalDiscrepancy = totalSent - totalReceived;
  const hasDiscrepancy = items.some(i => i.quantityReceived !== i.quantitySent);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (items.length === 0) return;

    try {
      setIsSubmitting(true);
      const res = await fetch(`/api/v1/stock-transfers/${transfer.id}/receive`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          staffName: currentUser?.fullName || 'Staff Penerima',
          discrepancyNotes: discrepancyNotes.trim() || null,
          items: items.map(i => ({
            itemId: i.itemId,
            productId: i.productId,
            quantityReceived: i.quantityReceived,
            notes: i.notes?.trim() || null
          }))
        })
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || 'Gagal memverifikasi penerimaan transfer.');
      }

      useToastStore.getState().showToast(
        hasDiscrepancy
          ? `Penerimaan ${transfer.transferNumber} selesai dengan catatan selisih (${totalDiscrepancy} unit kurang)!`
          : `Penerimaan ${transfer.transferNumber} berhasil diverifikasi 100% cocok!`,
        hasDiscrepancy ? 'warning' : 'success'
      );
      onReceived();
      onClose();
    } catch (err: any) {
      useToastStore.getState().showToast(err.message || 'Terjadi kesalahan sistem.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4 select-none">
      <div className="bg-surface border border-border-strong w-full max-w-3xl rounded-2xl shadow-2xl flex flex-col max-h-[92vh] overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-5 py-4 border-b border-border-subtle flex items-center justify-between bg-subtle">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-status-success/15 text-status-success flex items-center justify-center font-bold">
              <ClipboardCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-bold text-text-primary">
                  Verifikasi Penerimaan Fisik Barang
                </h2>
                <span className="font-mono text-xs px-2 py-0.5 rounded bg-primary/10 text-primary font-bold">
                  {transfer.transferNumber}
                </span>
              </div>
              <p className="text-[11px] text-text-secondary">
                Pencocokan kuantitas surat jalan vs fisik nyata di {transfer.destinationWarehouseName}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-text-muted hover:text-text-primary hover:bg-card-hover transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5 space-y-4 text-xs">
          {/* Summary Route Banner */}
          <div className="p-3 rounded-xl bg-card border border-border-subtle grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
            <div>
              <p className="text-[10px] text-text-muted">Dari Gudang Asal:</p>
              <p className="font-bold text-text-primary truncate">{transfer.sourceWarehouseName}</p>
            </div>
            <div>
              <p className="text-[10px] text-text-muted">Tiba di Gudang Tujuan:</p>
              <p className="font-bold text-text-primary truncate">{transfer.destinationWarehouseName}</p>
            </div>
            <div>
              <p className="text-[10px] text-text-muted">Kurir / Supir:</p>
              <p className="font-bold text-text-primary">{transfer.driverOrCourierName || 'Kurir Internal'} {transfer.vehicleNumber ? `(${transfer.vehicleNumber})` : ''}</p>
            </div>
            <div>
              <p className="text-[10px] text-text-muted">Waktu Berangkat:</p>
              <p className="font-mono text-text-secondary">
                {transfer.dispatchedAt ? new Date(transfer.dispatchedAt).toLocaleString('id-ID') : '-'}
              </p>
            </div>
          </div>

          {/* Quick Match All Bar */}
          <div className="flex items-center justify-between">
            <span className="font-bold text-text-primary text-xs">
              Rincian Pengecekan Fisik per Item:
            </span>
            <button
              type="button"
              onClick={handleMatchAll}
              className="px-3 py-1.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-status-success font-bold text-[11px] flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>1-Klik Terima Semua Sesuai</span>
            </button>
          </div>

          {/* Items Checklist Table */}
          <div className="rounded-xl border border-border-subtle overflow-hidden">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-subtle border-b border-border-subtle text-text-secondary font-bold">
                <tr>
                  <th className="py-2.5 px-3">No</th>
                  <th className="py-2.5 px-3">Nama Produk</th>
                  <th className="py-2.5 px-3 text-center">Qty Kirim</th>
                  <th className="py-2.5 px-3 text-center w-28">Qty Diterima Fisik</th>
                  <th className="py-2.5 px-3 text-center">Status</th>
                  <th className="py-2.5 px-3">Catatan Selisih / Kondisi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-subtle/60 bg-card">
                {items.map((row, idx) => {
                  const isMatch = row.quantityReceived === row.quantitySent;
                  const isLess = row.quantityReceived < row.quantitySent;
                  const isSurplus = row.quantityReceived > row.quantitySent;

                  return (
                    <tr key={row.productId} className="hover:bg-card-hover/40 transition-colors">
                      <td className="py-2.5 px-3 font-mono text-text-muted">{idx + 1}</td>
                      <td className="py-2.5 px-3">
                        <p className="font-bold text-text-primary">{row.productName}</p>
                        <p className="text-[10px] text-text-muted font-mono">SKU: {row.sku}</p>
                      </td>
                      <td className="py-2.5 px-3 text-center font-mono font-bold text-text-primary">
                        {row.quantitySent} {row.unit}
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <input
                            type="number"
                            min={0}
                            step={1}
                            value={row.quantityReceived}
                            onChange={(e) => handleQtyChange(idx, parseFloat(e.target.value))}
                            className={`w-20 px-2 py-1 rounded-lg bg-surface border text-center font-mono font-bold focus:outline-none ${
                              isMatch
                                ? 'border-border-strong text-text-primary focus:border-primary'
                                : isLess
                                ? 'border-status-danger text-status-danger bg-rose-500/5'
                                : 'border-amber-500 text-amber-700 bg-amber-500/5'
                            }`}
                            required
                          />
                          <span className="text-[10px] text-text-muted font-medium">{row.unit}</span>
                        </div>
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        {isMatch ? (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/15 text-status-success inline-flex items-center gap-1">
                            <Check className="w-3 h-3" /> Pas
                          </span>
                        ) : isLess ? (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-500/15 text-status-danger inline-flex items-center gap-1">
                            <AlertCircle className="w-3 h-3" /> Kurang -{row.quantitySent - row.quantityReceived}
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/15 text-amber-700 dark:text-amber-400 inline-flex items-center gap-1">
                            Lebih +{row.quantityReceived - row.quantitySent}
                          </span>
                        )}
                      </td>
                      <td className="py-2.5 px-3">
                        <input
                          type="text"
                          value={row.notes}
                          onChange={(e) => handleItemNotesChange(idx, e.target.value)}
                          placeholder={!isMatch ? "Tuliskan penyebab selisih/rusak..." : "Kondisi fisik aman"}
                          className={`w-full px-2 py-1 rounded-lg bg-surface border text-[11px] text-text-primary focus:outline-none ${
                            !isMatch ? 'border-status-danger/40 focus:border-status-danger' : 'border-border-subtle focus:border-primary'
                          }`}
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Discrepancy Warning Banner */}
          {hasDiscrepancy && (
            <div className="p-3.5 rounded-xl bg-status-danger/10 border border-status-danger/30 space-y-2">
              <div className="flex items-center gap-2 text-status-danger font-bold text-xs">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>Peringatan Selisih Penerimaan Fisik ({totalDiscrepancy > 0 ? `Kurang ${totalDiscrepancy} Unit` : `Lebih ${Math.abs(totalDiscrepancy)} Unit`})</span>
              </div>
              <p className="text-[11px] text-text-secondary leading-relaxed">
                Hanya kuantitas fisik yang nyata diterima ({totalReceived} unit) yang akan ditambahkan ke stok gudang <strong>{transfer.destinationWarehouseName}</strong>. Selisih akan dicatat pada log mutasi transfer untuk investigasi kurir.
              </p>
              <div>
                <label className="block text-[11px] font-bold text-text-primary mb-1">
                  Catatan Selisih Resmi <span className="text-status-danger">*</span>
                </label>
                <textarea
                  value={discrepancyNotes}
                  onChange={(e) => setDiscrepancyNotes(e.target.value)}
                  placeholder="Contoh: 1 dus kemasan penyok saat perjalanan, isi 1 botol pecah..."
                  rows={2}
                  className="w-full px-3 py-2 rounded-xl bg-surface border border-status-danger/40 text-text-primary text-xs focus:outline-none focus:border-status-danger resize-none"
                  required={hasDiscrepancy}
                />
              </div>
            </div>
          )}

          {/* Footer & Submit */}
          <div className="pt-3 flex items-center justify-between border-t border-border-subtle">
            <p className="text-[11px] text-text-muted">
              Petugas Penerima: <strong className="text-text-primary">{currentUser?.fullName || 'Staff Penerima'}</strong>
            </p>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl bg-subtle hover:bg-card-hover border border-border-subtle text-text-secondary font-bold transition-colors"
              >
                Batal
              </button>
              <button
                type="submit"
                disabled={isSubmitting || (hasDiscrepancy && !discrepancyNotes.trim())}
                className="px-5 py-2 rounded-xl bg-status-success hover:bg-emerald-600 disabled:opacity-50 text-white font-bold shadow-sm flex items-center gap-1.5 transition-all"
              >
                <Check className="w-4 h-4" />
                <span>{isSubmitting ? 'Menyimpan...' : 'Konfirmasi Penerimaan Fisik'}</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
