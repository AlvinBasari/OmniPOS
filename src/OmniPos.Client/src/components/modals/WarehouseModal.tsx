import React, { useState, useEffect } from 'react';
import { Building2, X, Check, AlertCircle, ShieldCheck } from 'lucide-react';
import { Warehouse } from '../../types';
import { useToastStore } from '../../store/useToastStore';

interface WarehouseModalProps {
  isOpen: boolean;
  onClose: () => void;
  warehouseToEdit: Warehouse | null;
  onSaved: () => void;
}

export const WarehouseModal: React.FC<WarehouseModalProps> = ({
  isOpen,
  onClose,
  warehouseToEdit,
  onSaved,
}) => {
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [phone, setPhone] = useState('');
  const [picName, setPicName] = useState('');
  const [isDefault, setIsDefault] = useState(false);
  const [isActive, setIsActive] = useState(true);
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (warehouseToEdit) {
      setCode(warehouseToEdit.code);
      setName(warehouseToEdit.name);
      setAddress(warehouseToEdit.address || '');
      setPhone(warehouseToEdit.phone || '');
      setPicName(warehouseToEdit.picName || '');
      setIsDefault(warehouseToEdit.isDefault);
      setIsActive(warehouseToEdit.isActive);
      setNotes(warehouseToEdit.notes || '');
    } else {
      setCode('');
      setName('');
      setAddress('');
      setPhone('');
      setPicName('');
      setIsDefault(false);
      setIsActive(true);
      setNotes('');
    }
  }, [warehouseToEdit, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim() || !name.trim()) {
      useToastStore.getState().showToast('Kode dan nama gudang wajib diisi!', 'warning');
      return;
    }

    try {
      setIsSubmitting(true);
      const url = warehouseToEdit ? `/api/v1/warehouses/${warehouseToEdit.id}` : '/api/v1/warehouses';
      const method = warehouseToEdit ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: code.trim().toUpperCase(),
          name: name.trim(),
          address: address.trim() || null,
          phone: phone.trim() || null,
          picName: picName.trim() || null,
          isDefault,
          isActive,
          notes: notes.trim() || null
        })
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || 'Gagal menyimpan gudang.');
      }

      useToastStore.getState().showToast(
        warehouseToEdit ? `Gudang '${name}' berhasil diperbarui!` : `Gudang baru '${name}' berhasil ditambahkan!`,
        'success'
      );
      onSaved();
      onClose();
    } catch (err: any) {
      useToastStore.getState().showToast(err.message || 'Terjadi kesalahan sistem.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4 select-none">
      <div className="bg-surface border border-border-strong w-full max-w-lg rounded-2xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-5 py-4 border-b border-border-subtle flex items-center justify-between bg-subtle">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-bold">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-text-primary">
                {warehouseToEdit ? 'Edit Lokasi Gudang / Cabang' : 'Tambah Gudang / Cabang Baru'}
              </h2>
              <p className="text-[11px] text-text-secondary">
                {warehouseToEdit ? `Kelola informasi lokasi ${warehouseToEdit.code}` : 'Daftarkan titik lokasi inventori toko Anda'}
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

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5 space-y-4 text-xs">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-text-secondary font-bold mb-1">
                Kode Lokasi / Gudang <span className="text-status-danger">*</span>
              </label>
              <input
                type="text"
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                placeholder="Contoh: WH-01, CAB-02"
                className="w-full px-3 py-2 rounded-xl bg-card border border-border-strong font-mono uppercase font-bold text-text-primary focus:outline-none focus:border-primary"
                required
              />
            </div>

            <div>
              <label className="block text-text-secondary font-bold mb-1">
                Nama Gudang / Cabang <span className="text-status-danger">*</span>
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Contoh: Gudang Pusat, Display Toko"
                className="w-full px-3 py-2 rounded-xl bg-card border border-border-strong text-text-primary focus:outline-none focus:border-primary"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-text-secondary font-bold mb-1">
                Penanggung Jawab (PIC)
              </label>
              <input
                type="text"
                value={picName}
                onChange={(e) => setPicName(e.target.value)}
                placeholder="Nama Kepala Gudang / Supervisor"
                className="w-full px-3 py-2 rounded-xl bg-card border border-border-strong text-text-primary focus:outline-none focus:border-primary"
              />
            </div>

            <div>
              <label className="block text-text-secondary font-bold mb-1">
                No. Telepon / WhatsApp PIC
              </label>
              <input
                type="text"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="0812-xxxx-xxxx"
                className="w-full px-3 py-2 rounded-xl bg-card border border-border-strong text-text-primary focus:outline-none focus:border-primary"
              />
            </div>
          </div>

          <div>
            <label className="block text-text-secondary font-bold mb-1">
              Alamat Lengkap / Keterangan Lokasi
            </label>
            <input
              type="text"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="Contoh: Ruko Blok A No. 12, Lantai 2"
              className="w-full px-3 py-2 rounded-xl bg-card border border-border-strong text-text-primary focus:outline-none focus:border-primary"
            />
          </div>

          <div>
            <label className="block text-text-secondary font-bold mb-1">
              Catatan Internal
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Catatan akses masuk, kapasitas muat, dsb."
              rows={2}
              className="w-full px-3 py-2 rounded-xl bg-card border border-border-strong text-text-primary focus:outline-none focus:border-primary resize-none"
            />
          </div>

          <div className="pt-2 border-t border-border-subtle/60 space-y-2.5">
            <label className="flex items-center gap-2.5 p-2.5 rounded-xl bg-subtle border border-border-subtle cursor-pointer hover:bg-card-hover transition-colors">
              <input
                type="checkbox"
                checked={isDefault}
                onChange={(e) => setIsDefault(e.target.checked)}
                className="w-4 h-4 rounded text-primary accent-primary"
              />
              <div className="flex-1">
                <div className="flex items-center gap-1.5 font-bold text-text-primary">
                  <ShieldCheck className="w-3.5 h-3.5 text-primary" />
                  <span>Jadikan Gudang Utama Default</span>
                </div>
                <p className="text-[10px] text-text-secondary">
                  Gudang utama digunakan sebagai lokasi default saat barang masuk dari supplier (PO).
                </p>
              </div>
            </label>

            {warehouseToEdit && (
              <label className="flex items-center gap-2.5 p-2.5 rounded-xl bg-subtle border border-border-subtle cursor-pointer hover:bg-card-hover transition-colors">
                <input
                  type="checkbox"
                  checked={isActive}
                  onChange={(e) => setIsActive(e.target.checked)}
                  className="w-4 h-4 rounded text-primary accent-primary"
                />
                <div>
                  <span className="font-bold text-text-primary">Status Gudang Aktif</span>
                  <p className="text-[10px] text-text-secondary">
                    Nonaktifkan jika gudang sedang dalam perbaikan / tutup sementara.
                  </p>
                </div>
              </label>
            )}
          </div>

          {/* Action Buttons */}
          <div className="pt-4 flex items-center justify-end gap-2.5 border-t border-border-subtle">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-subtle hover:bg-card-hover border border-border-subtle text-text-secondary font-bold transition-colors"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 rounded-xl bg-primary hover:bg-primary-hover disabled:opacity-50 text-primary-text font-bold shadow-sm flex items-center gap-1.5 transition-all"
            >
              <Check className="w-4 h-4" />
              <span>{isSubmitting ? 'Menyimpan...' : warehouseToEdit ? 'Perbarui Gudang' : 'Simpan Gudang'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
