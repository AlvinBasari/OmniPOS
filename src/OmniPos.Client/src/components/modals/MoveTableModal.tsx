import React, { useState } from 'react';
import { ArrowRightLeft, Merge, X, Check, UtensilsCrossed, AlertCircle } from 'lucide-react';
import { DiningTable, FloorPlanArea } from '../../types';
import { useToastStore } from '../../store/useToastStore';

interface MoveTableModalProps {
  isOpen: boolean;
  currentTable: DiningTable | null;
  areas: FloorPlanArea[];
  onClose: () => void;
  onSuccess: () => void;
}

export const MoveTableModal: React.FC<MoveTableModalProps> = ({
  isOpen,
  currentTable,
  areas,
  onClose,
  onSuccess
}) => {
  const [modalMode, setModalMode] = useState<'move' | 'merge'>('move');
  const [targetTableId, setTargetTableId] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  if (!isOpen || !currentTable) return null;

  // All tables across areas excluding current table
  const allOtherTables: Array<DiningTable & { areaName: string }> = [];
  for (const area of areas) {
    for (const t of area.tables || []) {
      if (t.id !== currentTable.id) {
        allOtherTables.push({ ...t, areaName: area.name });
      }
    }
  }

  // Filter based on mode:
  // Move requires target to be Available
  // Merge can target an Occupied or Available table
  const eligibleTables = modalMode === 'move' 
    ? allOtherTables.filter(t => t.status === 'Available')
    : allOtherTables;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetTableId) {
      useToastStore.getState().showToast('Pilih meja tujuan terlebih dahulu.', 'warning');
      return;
    }

    const target = allOtherTables.find(t => t.id === targetTableId);
    if (!target) return;

    try {
      setIsSubmitting(true);
      const endpoint = modalMode === 'move' ? '/api/v1/tables/move' : '/api/v1/tables/merge';
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sourceTableId: currentTable.id,
          targetTableId: target.id
        })
      });

      if (res.ok) {
        const msg = modalMode === 'move'
          ? `Pesanan berhasil dipindahkan dari Meja ${currentTable.tableNumber} ke Meja ${target.tableNumber}!`
          : `Tagihan Meja ${currentTable.tableNumber} berhasil digabungkan ke Meja ${target.tableNumber}!`;
        useToastStore.getState().showToast(msg, 'success');
        onSuccess();
        onClose();
      } else {
        const err = await res.json();
        useToastStore.getState().showToast(err.message || 'Gagal memproses meja.', 'error');
      }
    } catch {
      useToastStore.getState().showToast('Gagal menghubungi server.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4 select-none">
      <div className="w-full max-w-md bg-surface border border-border-strong rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="p-4 bg-subtle border-b border-border-subtle flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center font-bold">
              {modalMode === 'move' ? <ArrowRightLeft className="w-4 h-4" /> : <Merge className="w-4 h-4" />}
            </div>
            <div>
              <h3 className="text-sm font-bold text-text-primary">
                {modalMode === 'move' ? 'Pindah Meja Tamu' : 'Gabung Meja (Merge Tables)'}
              </h3>
              <p className="text-xs text-text-secondary">
                Meja Asal: <strong>Meja {currentTable.tableNumber}</strong> (Tagihan: Rp {currentTable.currentBillAmount.toLocaleString('id-ID')})
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 rounded-md text-text-muted hover:text-text-primary">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Mode Selector Tabs */}
        <div className="px-5 pt-4">
          <div className="grid grid-cols-2 gap-2 p-1 bg-subtle rounded-lg border border-border-subtle">
            <button
              type="button"
              onClick={() => { setModalMode('move'); setTargetTableId(''); }}
              className={`py-1.5 rounded-md text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                modalMode === 'move'
                  ? 'bg-primary text-primary-text shadow-sm'
                  : 'text-text-secondary hover:text-text-primary'
              }`}
            >
              <ArrowRightLeft className="w-3.5 h-3.5" />
              <span>1. Pindah Meja (Move)</span>
            </button>
            <button
              type="button"
              onClick={() => { setModalMode('merge'); setTargetTableId(''); }}
              className={`py-1.5 rounded-md text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                modalMode === 'merge'
                  ? 'bg-primary text-primary-text shadow-sm'
                  : 'text-text-secondary hover:text-text-primary'
              }`}
            >
              <Merge className="w-3.5 h-3.5" />
              <span>2. Gabung Meja (Merge)</span>
            </button>
          </div>
        </div>

        {/* Content Form */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4 flex-1 overflow-y-auto text-xs">
          <div className="p-3 bg-subtle rounded-lg border border-border-subtle text-[11px] text-text-secondary leading-relaxed">
            {modalMode === 'move' ? (
              <p>
                Gunakan opsi ini jika tamu ingin pindah tempat duduk (misal pindah dari dalam ke area outdoor smoking). Seluruh pesanan aktif di Meja <strong>{currentTable.tableNumber}</strong> akan dipindahkan ke meja tujuan.
              </p>
            ) : (
              <p>
                Gunakan opsi ini jika ada dua meja terpisah yang ingin menggabungkan pembayarannya menjadi satu tagihan. Tagihan Meja <strong>{currentTable.tableNumber}</strong> akan ditambahkan ke meja tujuan.
              </p>
            )}
          </div>

          {/* Target Table Grid */}
          <div className="space-y-2">
            <label className="block font-bold text-text-primary uppercase tracking-wider text-[11px]">
              Pilih Meja Tujuan:
            </label>

            {eligibleTables.length === 0 ? (
              <div className="p-6 text-center text-text-muted space-y-1 bg-subtle rounded-xl border border-dashed border-border-subtle">
                <AlertCircle className="w-6 h-6 mx-auto opacity-40 text-amber-500" />
                <p className="font-semibold">Tidak ada meja kosong yang tersedia.</p>
                <p className="text-[10px]">Semua meja lain sedang terisi penuh.</p>
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-2.5 max-h-56 overflow-y-auto pr-1">
                {eligibleTables.map((tbl) => {
                  const isSelected = targetTableId === tbl.id;
                  const isOccupied = tbl.status !== 'Available';
                  return (
                    <button
                      key={tbl.id}
                      type="button"
                      onClick={() => setTargetTableId(tbl.id)}
                      className={`p-3 rounded-xl border text-left transition-all relative ${
                        isSelected
                          ? 'bg-primary/15 border-primary text-primary font-bold shadow-xs'
                          : isOccupied
                          ? 'bg-amber-500/5 border-amber-500/30 text-text-primary hover:bg-amber-500/10'
                          : 'bg-card border-border-subtle hover:bg-card-hover text-text-primary'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-extrabold text-xs">Meja {tbl.tableNumber}</span>
                        {isSelected && <Check className="w-3.5 h-3.5 text-primary" />}
                      </div>
                      <p className="text-[10px] text-text-muted mt-0.5 truncate">{tbl.areaName}</p>
                      <div className="mt-1">
                        {tbl.status === 'Available' ? (
                          <span className="text-[9px] font-bold text-status-success">Kosong</span>
                        ) : (
                          <span className="text-[9px] font-bold text-amber-600">Terisi (Rp {tbl.currentBillAmount.toLocaleString('id-ID')})</span>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="pt-3 border-t border-border-subtle flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2 rounded-lg bg-subtle hover:bg-card-hover border border-border-subtle font-semibold text-text-secondary"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={!targetTableId || isSubmitting}
              className="flex-1 py-2 rounded-lg bg-primary hover:bg-primary-hover text-primary-text font-bold shadow-sm disabled:opacity-50 flex items-center justify-center gap-1.5"
            >
              <span>{isSubmitting ? 'Memproses...' : modalMode === 'move' ? 'Pindahkan Meja' : 'Gabungkan Meja'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
