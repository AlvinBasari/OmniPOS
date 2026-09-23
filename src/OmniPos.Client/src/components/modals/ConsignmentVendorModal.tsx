import React, { useState, useEffect } from 'react';
import { X, Building2, User, Phone, Mail, MapPin, Landmark, Percent, FileText, CheckCircle2, AlertCircle } from 'lucide-react';
import { ConsignmentVendor, ConsignmentCommissionType } from '../../types';

interface ConsignmentVendorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  vendor?: ConsignmentVendor | null;
}

export const ConsignmentVendorModal: React.FC<ConsignmentVendorModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  vendor
}) => {
  const [vendorCode, setVendorCode] = useState('');
  const [name, setName] = useState('');
  const [contactPerson, setContactPerson] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState('');
  const [commissionType, setCommissionType] = useState<ConsignmentCommissionType>('Percentage');
  const [defaultCommissionRate, setDefaultCommissionRate] = useState<number>(15);
  const [bankName, setBankName] = useState('BCA');
  const [bankAccountNumber, setBankAccountNumber] = useState('');
  const [bankAccountHolder, setBankAccountHolder] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (vendor) {
      setVendorCode(vendor.vendorCode || '');
      setName(vendor.name || '');
      setContactPerson(vendor.contactPerson || '');
      setPhone(vendor.phone || '');
      setEmail(vendor.email || '');
      setAddress(vendor.address || '');
      setCommissionType(vendor.commissionType === 1 || vendor.commissionType === 'FixedCost' ? 'FixedCost' : 'Percentage');
      setDefaultCommissionRate(vendor.defaultCommissionRate || 15);
      setBankName(vendor.bankName || 'BCA');
      setBankAccountNumber(vendor.bankAccountNumber || '');
      setBankAccountHolder(vendor.bankAccountHolder || '');
      setIsActive(vendor.isActive ?? true);
      setNotes(vendor.notes || '');
    } else {
      setVendorCode('');
      setName('');
      setContactPerson('');
      setPhone('');
      setEmail('');
      setAddress('');
      setCommissionType('Percentage');
      setDefaultCommissionRate(15);
      setBankName('BCA');
      setBankAccountNumber('');
      setBankAccountHolder('');
      setIsActive(true);
      setNotes('');
    }
    setError(null);
  }, [vendor, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Nama vendor konsinyasi wajib diisi.');
      return;
    }

    setLoading(true);
    setError(null);

    const payload = {
      vendorCode: vendorCode.trim() || undefined,
      name: name.trim(),
      contactPerson: contactPerson.trim() || undefined,
      phone: phone.trim() || undefined,
      email: email.trim() || undefined,
      address: address.trim() || undefined,
      commissionType: commissionType === 'FixedCost' ? 1 : 0,
      defaultCommissionRate: Number(defaultCommissionRate) || 15,
      bankName: bankName.trim() || undefined,
      bankAccountNumber: bankAccountNumber.trim() || undefined,
      bankAccountHolder: bankAccountHolder.trim() || undefined,
      isActive,
      notes: notes.trim() || undefined
    };

    try {
      const url = vendor ? `/api/v1/consignment/vendors/${vendor.id}` : '/api/v1/consignment/vendors';
      const method = vendor ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => null);
        throw new Error(errData?.message || 'Gagal menyimpan data vendor konsinyasi.');
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Terjadi kesalahan sistem.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-fadeIn font-sans">
      <div className="bg-surface border border-border-subtle w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border-subtle bg-subtle">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-primary/10 border border-primary/20 text-primary rounded-xl">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-text-primary">
                {vendor ? 'Edit Mitra Vendor Konsinyasi' : 'Daftar Vendor Konsinyasi Baru'}
              </h2>
              <p className="text-xs text-text-secondary">
                Kelola informasi mitra penitip barang, persentase bagi hasil, dan rekening pembayaran
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-text-muted hover:text-text-primary rounded-lg hover:bg-card-hover transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6 bg-surface text-text-primary">
          {error && (
            <div className="p-3 bg-rose-500/10 border border-rose-500/30 text-status-danger rounded-xl text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Section 1: Profil Vendor */}
          <div className="space-y-4">
            <h3 className="text-xs font-semibold text-primary uppercase tracking-wider flex items-center gap-1.5">
              <Building2 className="w-3.5 h-3.5" /> 1. Identitas Mitra & Kontak
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-text-primary mb-1.5">
                  Kode Vendor
                </label>
                <input
                  type="text"
                  value={vendorCode}
                  onChange={(e) => setVendorCode(e.target.value.toUpperCase())}
                  placeholder="e.g. VND-001"
                  className="w-full bg-card border border-border-subtle rounded-xl px-3.5 py-2 text-xs text-text-primary placeholder:text-text-muted focus:outline-none focus:border-border-focus uppercase font-mono"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-xs font-semibold text-text-primary mb-1.5">
                  Nama Usaha / Vendor <span className="text-status-danger">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. CV Snack Tradisional Nusantara"
                  className="w-full bg-card border border-border-subtle rounded-xl px-3.5 py-2 text-xs text-text-primary placeholder:text-text-muted focus:outline-none focus:border-border-focus"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-text-primary mb-1.5 flex items-center gap-1">
                  <User className="w-3.5 h-3.5 text-text-muted" /> Nama PIC / Pemilik
                </label>
                <input
                  type="text"
                  value={contactPerson}
                  onChange={(e) => setContactPerson(e.target.value)}
                  placeholder="e.g. Ibu Hj. Maryam"
                  className="w-full bg-card border border-border-subtle rounded-xl px-3.5 py-2 text-xs text-text-primary placeholder:text-text-muted focus:outline-none focus:border-border-focus"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-text-primary mb-1.5 flex items-center gap-1">
                  <Phone className="w-3.5 h-3.5 text-text-muted" /> No. WhatsApp / HP
                </label>
                <input
                  type="text"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="e.g. 0812-3456-7890"
                  className="w-full bg-card border border-border-subtle rounded-xl px-3.5 py-2 text-xs text-text-primary placeholder:text-text-muted focus:outline-none focus:border-border-focus"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-text-primary mb-1.5 flex items-center gap-1">
                  <Mail className="w-3.5 h-3.5 text-text-muted" /> Email
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="e.g. mitra@snack.id"
                  className="w-full bg-card border border-border-subtle rounded-xl px-3.5 py-2 text-xs text-text-primary placeholder:text-text-muted focus:outline-none focus:border-border-focus"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-text-primary mb-1.5 flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 text-text-muted" /> Alamat Lengkap
              </label>
              <textarea
                rows={2}
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="Alamat kantor / gudang / tempat produksi vendor..."
                className="w-full bg-card border border-border-subtle rounded-xl px-3.5 py-2 text-xs text-text-primary placeholder:text-text-muted focus:outline-none focus:border-border-focus resize-none"
              />
            </div>
          </div>

          {/* Section 2: Skema Bagi Hasil & Rekening Bank */}
          <div className="space-y-4 pt-3 border-t border-border-subtle">
            <h3 className="text-xs font-semibold text-primary uppercase tracking-wider flex items-center gap-1.5">
              <Landmark className="w-3.5 h-3.5" /> 2. Skema Bagi Hasil & Rekening Payout
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-text-primary mb-1.5 flex items-center gap-1">
                  <Percent className="w-3.5 h-3.5 text-text-muted" /> Skema Komisi Default
                </label>
                <select
                  value={commissionType}
                  onChange={(e) => setCommissionType(e.target.value as ConsignmentCommissionType)}
                  className="w-full bg-card border border-border-subtle rounded-xl px-3.5 py-2 text-xs text-text-primary focus:outline-none focus:border-border-focus"
                >
                  <option value="Percentage">Persentase (% Omset Jual Kasir)</option>
                  <option value="FixedCost">Harga Pokok Tetap (Fixed Cost Margin)</option>
                </select>
                <p className="text-[11px] text-text-muted mt-1">
                  {commissionType === 'Percentage' 
                    ? 'Toko mengambil % komisi dari total harga jual barang yang laku.'
                    : 'Vendor menetapkan harga beli bersih, selisih harga jual adalah margin toko.'}
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-text-primary mb-1.5">
                  Default Margin / Komisi Toko (%)
                </label>
                <div className="relative">
                  <input
                    type="number"
                    min="0"
                    max="100"
                    step="0.5"
                    value={defaultCommissionRate}
                    onChange={(e) => setDefaultCommissionRate(parseFloat(e.target.value) || 0)}
                    className="w-full bg-card border border-border-subtle rounded-xl pl-3.5 pr-8 py-2 text-xs text-text-primary focus:outline-none focus:border-border-focus font-semibold"
                  />
                  <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-text-muted">%</span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-subtle border border-border-subtle p-4 rounded-xl">
              <div>
                <label className="block text-xs font-semibold text-text-primary mb-1.5">
                  Nama Bank
                </label>
                <select
                  value={bankName}
                  onChange={(e) => setBankName(e.target.value)}
                  className="w-full bg-card border border-border-subtle rounded-xl px-3 py-2 text-xs text-text-primary focus:outline-none focus:border-border-focus"
                >
                  <option value="BCA">BCA</option>
                  <option value="Mandiri">Mandiri</option>
                  <option value="BRI">BRI</option>
                  <option value="BNI">BNI</option>
                  <option value="BSI">BSI (Syariah)</option>
                  <option value="CIMB Niaga">CIMB Niaga</option>
                  <option value="Permata">Permata Bank</option>
                  <option value="Kas Tunai">Kas Tunai Toko</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-text-primary mb-1.5">
                  Nomor Rekening
                </label>
                <input
                  type="text"
                  value={bankAccountNumber}
                  onChange={(e) => setBankAccountNumber(e.target.value)}
                  placeholder="e.g. 8820-1928-33"
                  className="w-full bg-card border border-border-subtle rounded-xl px-3 py-2 text-xs text-text-primary placeholder:text-text-muted focus:outline-none focus:border-border-focus font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-text-primary mb-1.5">
                  Nama Pemilik Rekening
                </label>
                <input
                  type="text"
                  value={bankAccountHolder}
                  onChange={(e) => setBankAccountHolder(e.target.value.toUpperCase())}
                  placeholder="e.g. CV SNACK NUSANTARA"
                  className="w-full bg-card border border-border-subtle rounded-xl px-3 py-2 text-xs text-text-primary placeholder:text-text-muted focus:outline-none focus:border-border-focus uppercase"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-text-primary mb-1.5 flex items-center gap-1">
                <FileText className="w-3.5 h-3.5 text-text-muted" /> Catatan Tambahan / Perjanjian
              </label>
              <textarea
                rows={2}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Perjanjian tempo pembayaran, syarat retur kadaluarsa, dsb..."
                className="w-full bg-card border border-border-subtle rounded-xl px-3.5 py-2 text-xs text-text-primary placeholder:text-text-muted focus:outline-none focus:border-border-focus resize-none"
              />
            </div>

            {vendor && (
              <label className="flex items-center gap-2 cursor-pointer pt-2">
                <input
                  type="checkbox"
                  checked={isActive}
                  onChange={(e) => setIsActive(e.target.checked)}
                  className="w-4 h-4 rounded text-primary bg-card border-border-subtle focus:ring-border-focus"
                />
                <span className="text-xs text-text-primary font-medium">Status Vendor Aktif</span>
              </label>
            )}
          </div>

          {/* Footer Buttons */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-border-subtle bg-surface">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-text-secondary hover:text-text-primary hover:bg-card-hover rounded-xl transition"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2 bg-primary hover:bg-primary-hover text-white font-bold text-xs rounded-xl transition flex items-center gap-1.5 shadow-sm disabled:opacity-50"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>{loading ? 'Menyimpan...' : (vendor ? 'Simpan Perubahan' : 'Daftarkan Vendor')}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
