import React, { useState, useEffect } from 'react';
import { 
  X, 
  User, 
  Phone, 
  Mail, 
  MapPin, 
  CreditCard, 
  Barcode, 
  Calendar, 
  Award, 
  FileText, 
  Sparkles, 
  Save,
  AlertCircle
} from 'lucide-react';
import { Customer } from '../../types';
import { useToastStore } from '../../store/useToastStore';

interface CustomerFormModalProps {
  isOpen: boolean;
  customer?: Customer | null;
  onClose: () => void;
  onSaved: (customer: Customer) => void;
}

export const CustomerFormModal: React.FC<CustomerFormModalProps> = ({
  isOpen,
  customer,
  onClose,
  onSaved
}) => {
  const [name, setName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState('');
  const [customerGroup, setCustomerGroup] = useState('REGULAR');
  const [memberTier, setMemberTier] = useState('BRONZE');
  const [memberCode, setMemberCode] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [creditLimit, setCreditLimit] = useState('1000000');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      if (customer) {
        setName(customer.name || '');
        setPhoneNumber(customer.phoneNumber || '');
        setEmail(customer.email || '');
        setAddress(customer.address || '');
        setCustomerGroup(customer.customerGroup || 'REGULAR');
        setMemberTier(customer.memberTier || 'BRONZE');
        setMemberCode(customer.memberCode || '');
        setBirthDate(customer.birthDate ? customer.birthDate.slice(0, 10) : '');
        setCreditLimit((customer.creditLimit || 1000000).toString());
        setNotes(customer.notes || '');
      } else {
        setName('');
        setPhoneNumber('');
        setEmail('');
        setAddress('');
        setCustomerGroup('REGULAR');
        setMemberTier('BRONZE');
        setMemberCode(`MBR-${Math.floor(100000 + Math.random() * 900000)}`);
        setBirthDate('');
        setCreditLimit('1000000');
        setNotes('');
      }
    }
  }, [isOpen, customer]);

  if (!isOpen) return null;

  const handleGenerateBarcode = () => {
    const randomCode = `MBR-${Math.floor(100000 + Math.random() * 900000)}`;
    setMemberCode(randomCode);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      useToastStore.getState().showToast('Nama pelanggan wajib diisi!', 'warning');
      return;
    }

    try {
      setIsSubmitting(true);
      const payload = {
        name: name.trim(),
        phoneNumber: phoneNumber.trim() || null,
        email: email.trim() || null,
        address: address.trim() || null,
        customerGroup: customerGroup.trim() || 'REGULAR',
        memberTier: memberTier.trim() || 'BRONZE',
        memberCode: memberCode.trim() || null,
        birthDate: birthDate ? new Date(birthDate).toISOString() : null,
        creditLimit: parseFloat(creditLimit) || 0,
        notes: notes.trim() || null
      };

      const url = customer ? `/api/v1/customers/${customer.id}` : '/api/v1/customers';
      const method = customer ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        const saved: Customer = await res.json();
        useToastStore.getState().showToast(
          customer ? `Data pelanggan "${saved.name}" berhasil diperbarui!` : `Pelanggan baru "${saved.name}" berhasil ditambahkan!`,
          'success'
        );
        onSaved(saved);
        onClose();
      } else {
        const err = await res.json().catch(() => ({ message: 'Gagal menyimpan data pelanggan' }));
        useToastStore.getState().showToast(err.message || 'Gagal menyimpan data!', 'error');
      }
    } catch {
      useToastStore.getState().showToast('Terjadi kesalahan jaringan.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4 select-none">
      <div className="bg-card w-full max-w-xl rounded-2xl shadow-2xl border border-border-subtle flex flex-col max-h-[90vh] overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        
        {/* Header */}
        <div className="p-4 bg-surface border-b border-border-subtle flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
              <User className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-text-primary">
                {customer ? 'Ubah Data Pelanggan / Member' : 'Pendaftaran Member Baru'}
              </h3>
              <p className="text-xs text-text-secondary">
                Kelola profil, nomor WhatsApp, barcode kartu fisik, dan limit kredit
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-text-muted hover:text-text-primary hover:bg-subtle transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5 space-y-4 text-xs">
          
          {/* Row 1: Nama & No WhatsApp */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-bold text-text-secondary mb-1">
                Nama Lengkap Pelanggan <span className="text-status-danger">*</span>
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-text-muted absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Contoh: Ibu Rina Hartono"
                  className="w-full pl-9 pr-3 py-2 bg-subtle border border-border-subtle rounded-xl text-text-primary font-semibold focus:outline-none focus:border-primary"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-text-secondary mb-1">
                Nomor WhatsApp (Untuk E-Struk / Tagihan)
              </label>
              <div className="relative">
                <Phone className="w-4 h-4 text-emerald-500 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="tel"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  placeholder="0812xxxxxxxx"
                  className="w-full pl-9 pr-3 py-2 bg-subtle border border-border-subtle rounded-xl text-text-primary font-mono font-semibold focus:outline-none focus:border-primary"
                />
              </div>
            </div>
          </div>

          {/* Row 2: Barcode Kartu Member & Auto Generate */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-[11px] font-bold text-text-secondary flex items-center gap-1.5">
                <Barcode className="w-4 h-4 text-primary" />
                <span>Kode Barcode / RFID Kartu Member Fisik:</span>
              </label>
              <button
                type="button"
                onClick={handleGenerateBarcode}
                className="text-[10px] text-primary hover:underline font-bold flex items-center gap-1"
              >
                <Sparkles className="w-3 h-3" /> Auto-Generate
              </button>
            </div>
            <div className="relative">
              <input
                type="text"
                value={memberCode}
                onChange={(e) => setMemberCode(e.target.value)}
                placeholder="Scan kartu member RFID atau ketik barcode..."
                className="w-full px-3 py-2 bg-subtle border border-border-subtle rounded-xl text-text-primary font-mono font-bold focus:outline-none focus:border-primary tracking-wider"
              />
            </div>
            <p className="text-[10px] text-text-muted mt-0.5">
              Dapat discan langsung di kasir menggunakan Barcode Scanner USB / RFID Reader saat berbelanja.
            </p>
          </div>

          {/* Row 3: Tier Member & Grup Pelanggan */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-bold text-text-secondary mb-1 flex items-center gap-1">
                <Award className="w-3.5 h-3.5 text-amber-500" />
                <span>Tingkatan Member (Tier):</span>
              </label>
              <select
                value={memberTier}
                onChange={(e) => setMemberTier(e.target.value)}
                className="w-full px-3 py-2 bg-subtle border border-border-subtle rounded-xl text-text-primary font-bold focus:outline-none focus:border-primary"
              >
                <option value="BRONZE">🥉 BRONZE (Member Baru)</option>
                <option value="SILVER">🥈 SILVER (Diskon 3% + 1.0x Poin)</option>
                <option value="GOLD">🥇 GOLD (Diskon 5% + 1.5x Poin)</option>
                <option value="PLATINUM">⭐ PLATINUM / VIP (Diskon 10% + 2.0x Poin)</option>
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-text-secondary mb-1">
                Kategori / Grup Khusus:
              </label>
              <select
                value={customerGroup}
                onChange={(e) => setCustomerGroup(e.target.value)}
                className="w-full px-3 py-2 bg-subtle border border-border-subtle rounded-xl text-text-primary font-bold focus:outline-none focus:border-primary"
              >
                <option value="REGULAR">Pelanggan Reguler</option>
                <option value="MEMBER">Member Toko</option>
                <option value="VIP">Pelanggan VIP</option>
                <option value="RESELLER">Grosir / Reseller</option>
                <option value="KARYAWAN">Karyawan Internal</option>
              </select>
            </div>
          </div>

          {/* Row 4: Tanggal Lahir (Ultah) & Limit Kasbon */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-bold text-text-secondary mb-1 flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-primary" />
                <span>Tanggal Lahir (Promo Ultah):</span>
              </label>
              <input
                type="date"
                value={birthDate}
                onChange={(e) => setBirthDate(e.target.value)}
                className="w-full px-3 py-2 bg-subtle border border-border-subtle rounded-xl text-text-primary font-semibold focus:outline-none focus:border-primary"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-text-secondary mb-1 flex items-center gap-1">
                <CreditCard className="w-3.5 h-3.5 text-status-warning" />
                <span>Plafon Limit Kasbon (Rp):</span>
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted font-bold">Rp</span>
                <input
                  type="number"
                  min="0"
                  step="50000"
                  value={creditLimit}
                  onChange={(e) => setCreditLimit(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-subtle border border-border-subtle rounded-xl text-text-primary font-mono font-bold focus:outline-none focus:border-primary"
                />
              </div>
            </div>
          </div>

          {/* Row 5: Email & Alamat */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-bold text-text-secondary mb-1">
                Email (Opsional)
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-text-muted absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="nama@email.com"
                  className="w-full pl-9 pr-3 py-2 bg-subtle border border-border-subtle rounded-xl text-text-primary focus:outline-none focus:border-primary"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-text-secondary mb-1">
                Alamat / Domisili
              </label>
              <div className="relative">
                <MapPin className="w-4 h-4 text-text-muted absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="Alamat rumah / ruko toko..."
                  className="w-full pl-9 pr-3 py-2 bg-subtle border border-border-subtle rounded-xl text-text-primary focus:outline-none focus:border-primary"
                />
              </div>
            </div>
          </div>

          {/* Row 6: Catatan / Preferensi Khusus */}
          <div>
            <label className="block text-[11px] font-bold text-text-secondary mb-1 flex items-center gap-1">
              <FileText className="w-3.5 h-3.5 text-text-muted" />
              <span>Catatan Khusus Pelanggan:</span>
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Contoh: Langganan beras merk Rojo Lele, alergi kacang, minta struk selalu di-WA..."
              className="w-full px-3 py-2 bg-subtle border border-border-subtle rounded-xl text-text-primary resize-none focus:outline-none focus:border-primary"
            />
          </div>

          {/* Footer Submit */}
          <div className="pt-2 border-t border-border-subtle flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-subtle hover:bg-card border border-border-subtle font-bold text-text-secondary transition-colors"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 rounded-xl bg-primary hover:bg-primary-hover text-primary-text font-bold flex items-center gap-2 shadow-sm transition-all disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              <span>{isSubmitting ? 'Menyimpan...' : customer ? 'Simpan Perubahan' : 'Daftarkan Member'}</span>
            </button>
          </div>
        </form>

      </div>
    </div>
  );
};
