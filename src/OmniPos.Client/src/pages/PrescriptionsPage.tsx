import React, { useState, useEffect } from 'react';
import { 
  FileText, 
  Pill, 
  Plus, 
  Search, 
  Printer, 
  User, 
  CheckCircle2, 
  Clock, 
  Send, 
  ShoppingCart, 
  Sparkles, 
  AlertCircle, 
  Calendar, 
  Phone,
  Trash2,
  ExternalLink,
  Check,
  X
} from 'lucide-react';
import { Product } from '../types';
import { useToastStore } from '../store/useToastStore';
import { useCartStore } from '../store/useCartStore';
import { useAuthStore } from '../store/useAuthStore';
import { EtiketObatModal, EtiketData } from '../components/modals/EtiketObatModal';

export interface PrescribedMedicine {
  id: string;
  productId?: string;
  name: string;
  quantity: number;
  unit: string;
  price: number;
  signa: string;
  consumptionTime: string;
  period: string;
  notes?: string;
  isObatLuar: boolean;
}

export interface DoctorPrescription {
  id: string;
  prescriptionNumber: string;
  date: string;
  doctorName: string;
  doctorSip: string;
  clinicOrHospital: string;
  patientName: string;
  patientAge: string;
  patientPhone: string;
  diagnosis?: string;
  status: 'WaitingDispense' | 'Dispensed' | 'Completed';
  items: PrescribedMedicine[];
  totalPrice: number;
}

const SAMPLE_PRESCRIPTIONS: DoctorPrescription[] = [
  {
    id: 'rx-1',
    prescriptionNumber: 'RXP-2026-081',
    date: new Date().toISOString(),
    doctorName: 'dr. Hendra Pratama, Sp.A',
    doctorSip: 'SIP: 446/SIP.D/DKK/2023',
    clinicOrHospital: 'Klinik Pratama Sehat Medika',
    patientName: 'Ananda Rizky Ramadhan',
    patientAge: '7 Tahun (22 Kg)',
    patientPhone: '081234567890',
    diagnosis: 'ISPA & Demam Tinggi (Febris)',
    status: 'WaitingDispense',
    totalPrice: 24000,
    items: [
      {
        id: 'rx-m-1',
        name: 'Paracetamol 500mg Strip (10 Tablet)',
        quantity: 1,
        unit: 'STRIP',
        price: 6000,
        signa: '3 x 1/2 Tablet Sehari',
        consumptionTime: 'Sesudah Makan',
        period: 'Pagi, Siang, Malam',
        notes: 'Bila demam / p.r.n',
        isObatLuar: false
      },
      {
        id: 'rx-m-2',
        name: 'Amoxicillin 500mg (Batch AMX-2026)',
        quantity: 1,
        unit: 'STRIP',
        price: 12000,
        signa: '3 x 1/2 Tablet Sehari',
        consumptionTime: 'Sesudah Makan',
        period: 'Tiap 8 Jam',
        notes: 'Wajib dihabiskan (Antibiotik)',
        isObatLuar: false
      },
      {
        id: 'rx-m-3',
        name: 'Vitamin C 500mg IPI (Isi 45 Tablet)',
        quantity: 1,
        unit: 'BOTOL',
        price: 6000,
        signa: '1 x 1 Tablet Sehari',
        consumptionTime: 'Pagi Hari Sesudah Makan',
        period: 'Pagi',
        notes: 'Suplemen daya tahan tubuh',
        isObatLuar: false
      }
    ]
  },
  {
    id: 'rx-2',
    prescriptionNumber: 'RXP-2026-080',
    date: new Date(Date.now() - 3600000 * 3).toISOString(),
    doctorName: 'dr. Siti Rahmawati, Sp.KK',
    doctorSip: 'SIP: 512/SIP.SP/2022',
    clinicOrHospital: 'Puskesmas Kecamatan Sukamaju',
    patientName: 'Ibu Ratna Dewi',
    patientAge: '42 Tahun',
    patientPhone: '085712349999',
    diagnosis: 'Dermatitis Kontak Alergika & Luka Lecet',
    status: 'Dispensed',
    totalPrice: 21000,
    items: [
      {
        id: 'rx-m-4',
        name: 'Betadine Antiseptik Cair 30ml',
        quantity: 1,
        unit: 'BOTOL',
        price: 21000,
        signa: 'Oleskan 2x Sehari pada Area Luka',
        consumptionTime: 'Pagi dan Malam',
        period: 'Pagi dan Malam',
        notes: 'OBAT LUAR - Tidak Boleh Ditelan',
        isObatLuar: true
      }
    ]
  }
];

interface PrescriptionsPageProps {
  onNavigateToPos?: () => void;
}

export const PrescriptionsPage: React.FC<PrescriptionsPageProps> = ({ onNavigateToPos }) => {
  const [prescriptions, setPrescriptions] = useState<DoctorPrescription[]>(() => {
    const saved = localStorage.getItem('omnipos_prescriptions_data');
    return saved ? JSON.parse(saved) : SAMPLE_PRESCRIPTIONS;
  });

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  // Modal Cetak Etiket
  const [isEtiketModalOpen, setIsEtiketModalOpen] = useState(false);
  const [etiketInitialData, setEtiketInitialData] = useState<Partial<EtiketData> | undefined>(undefined);

  // Modal Catat Resep Baru
  const [isAddPrescriptionOpen, setIsAddPrescriptionOpen] = useState(false);
  const [newDoctorName, setNewDoctorName] = useState('dr. Hendra Pratama, Sp.A');
  const [newDoctorSip, setNewDoctorSip] = useState('SIP: 446/SIP.D/2023');
  const [newClinic, setNewClinic] = useState('Klinik Pratama Sehat');
  const [newPatientName, setNewPatientName] = useState('');
  const [newPatientAge, setNewPatientAge] = useState('');
  const [newPatientPhone, setNewPatientPhone] = useState('');
  const [newDiagnosis, setNewDiagnosis] = useState('');
  const [newItems, setNewItems] = useState<PrescribedMedicine[]>([
    {
      id: 'm-1',
      name: 'Paracetamol 500mg Strip (10 Tablet)',
      quantity: 1,
      unit: 'STRIP',
      price: 6000,
      signa: '3 x 1 Tablet Sehari',
      consumptionTime: 'Sesudah Makan',
      period: 'Pagi, Siang, Malam',
      notes: '',
      isObatLuar: false
    }
  ]);

  const [products, setProducts] = useState<Product[]>([]);

  useEffect(() => {
    localStorage.setItem('omnipos_prescriptions_data', JSON.stringify(prescriptions));
  }, [prescriptions]);

  useEffect(() => {
    fetch('/api/v1/products?mode=Pharmacy')
      .then(r => r.json())
      .then(d => setProducts(d))
      .catch(() => {});
  }, []);

  const handleOpenEtiket = (rx: DoctorPrescription, item: PrescribedMedicine) => {
    setEtiketInitialData({
      doctorName: rx.doctorName,
      prescriptionNumber: rx.prescriptionNumber,
      patientName: rx.patientName,
      patientAge: rx.patientAge,
      medicineName: item.name,
      quantityStr: `${item.quantity} ${item.unit}`,
      signa: item.signa,
      consumptionTime: item.consumptionTime,
      period: item.period,
      notes: item.notes,
      type: item.isObatLuar ? 'biru' : 'putih'
    });
    setIsEtiketModalOpen(true);
  };

  const handleTransferToCart = (rx: DoctorPrescription) => {
    const { addItem, setCustomer } = useCartStore.getState();
    
    // Set customer name
    setCustomer({
      id: `rx-patient-${Date.now()}`,
      name: rx.patientName,
      phoneNumber: rx.patientPhone,
      customerGroup: 'Pasien Resep Dokter',
      loyaltyPoints: 0,
      depositBalance: 0,
      totalReceivable: 0,
      creditLimit: 0
    });

    // Add each item to cart
    rx.items.forEach(item => {
      addItem({
        id: item.productId || `prod-rx-${Date.now()}-${Math.random()}`,
        sku: `RX-${rx.prescriptionNumber}`,
        barcode: `RX-${rx.prescriptionNumber}`,
        name: `${item.name} (${item.signa})`,
        categoryId: 'cat-resep',
        unit: item.unit,
        buyPrice: item.price * 0.7,
        sellPrice: item.price,
        currentStock: 100,
        minStockAlert: 5,
        trackStock: true,
        isKitchenItem: false,
        hasVariants: false,
        variants: []
      });
    });

    // Update status to Dispensed
    setPrescriptions(prev =>
      prev.map(p => (p.id === rx.id ? { ...p, status: 'Dispensed' } : p))
    );

    useToastStore.getState().showToast(
      `Obat dari Resep #${rx.prescriptionNumber} telah dimuat ke kasir! Silakan proses transaksi pembayaran.`,
      'success'
    );

    if (onNavigateToPos) {
      onNavigateToPos();
    }
  };

  const handleSendWhatsAppNotification = (rx: DoctorPrescription) => {
    if (!rx.patientPhone) {
      useToastStore.getState().showToast('Nomor WhatsApp pasien belum dicatat.', 'warning');
      return;
    }

    const { storeInfo } = useAuthStore.getState();
    const shopName = storeInfo?.storeName || 'Apotek OmniPOS';

    const itemList = rx.items.map(i => `• ${i.name} (${i.signa})`).join('\n');
    const msg = `Halo ${rx.patientName},\n\nKami dari *${shopName}* menginformasikan bahwa Resep Obat Anda (*No: ${rx.prescriptionNumber}*) dari ${rx.doctorName} telah siap diambil dan telah selesai diracik:\n\n${itemList}\n\nTotal Biaya: *Rp ${rx.totalPrice.toLocaleString('id-ID')}*\n\nTerima kasih, semoga lekas pulih dan sehat selalu! 🙏`;

    let cleanPhone = rx.patientPhone.replace(/\D/g, '');
    if (cleanPhone.startsWith('0')) cleanPhone = '62' + cleanPhone.slice(1);

    window.open(`https://wa.me/${cleanPhone}?text=${encodeURIComponent(msg)}`, '_blank');
    useToastStore.getState().showToast('Membuka WhatsApp pasien...', 'info');
  };

  const handleAddNewItemRow = () => {
    setNewItems(prev => [
      ...prev,
      {
        id: `item-${Date.now()}`,
        name: 'Amoxicillin 500mg (Batch AMX-2026)',
        quantity: 1,
        unit: 'STRIP',
        price: 12000,
        signa: '3 x 1 Tablet Sehari',
        consumptionTime: 'Sesudah Makan',
        period: 'Pagi, Siang, Malam',
        notes: 'Habiskan antibiotik',
        isObatLuar: false
      }
    ]);
  };

  const handleRemoveItemRow = (idx: number) => {
    setNewItems(prev => prev.filter((_, i) => i !== idx));
  };

  const handleSavePrescription = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPatientName.trim()) {
      useToastStore.getState().showToast('Nama pasien wajib diisi!', 'warning');
      return;
    }

    const total = newItems.reduce((acc, curr) => acc + curr.price * curr.quantity, 0);
    const newRx: DoctorPrescription = {
      id: `rx-${Date.now()}`,
      prescriptionNumber: `RXP-${Date.now().toString().slice(-4)}`,
      date: new Date().toISOString(),
      doctorName: newDoctorName.trim(),
      doctorSip: newDoctorSip.trim(),
      clinicOrHospital: newClinic.trim(),
      patientName: newPatientName.trim(),
      patientAge: newPatientAge.trim() || 'Dewasa',
      patientPhone: newPatientPhone.trim(),
      diagnosis: newDiagnosis.trim() || 'Pemeriksaan Rutin',
      status: 'WaitingDispense',
      items: newItems,
      totalPrice: total
    };

    setPrescriptions([newRx, ...prescriptions]);
    setIsAddPrescriptionOpen(false);
    useToastStore.getState().showToast(`Resep #${newRx.prescriptionNumber} berhasil dicatat!`, 'success');
  };

  const filteredPrescriptions = prescriptions.filter(p => {
    if (statusFilter !== 'ALL' && p.status !== statusFilter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        p.prescriptionNumber.toLowerCase().includes(q) ||
        p.patientName.toLowerCase().includes(q) ||
        p.doctorName.toLowerCase().includes(q) ||
        p.items.some(i => i.name.toLowerCase().includes(q))
      );
    }
    return true;
  });

  return (
    <div className="flex-1 flex flex-col bg-app overflow-hidden select-none">
      {/* Top Header */}
      <div className="p-4 bg-surface border-b border-border-subtle flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-600/10 text-emerald-600 flex items-center justify-center font-bold">
            <Pill className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-base font-bold text-text-primary flex items-center gap-2">
              Pusat Resep Dokter & Etiket Farmasi
            </h1>
            <p className="text-xs text-text-secondary">
              Pencatatan resep dokter, verifikasi aturan pakai (Signa), cetak etiket putih/biru, dan transfer ke kasir
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <div className="relative w-64">
            <Search className="w-4 h-4 text-text-muted absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari No. Resep, Pasien, Obat..."
              className="w-full pl-9 pr-3 py-1.5 bg-subtle border border-border-subtle rounded-lg text-xs text-text-primary focus:outline-none focus:border-primary"
            />
          </div>

          <button
            onClick={() => setIsAddPrescriptionOpen(true)}
            className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all active:scale-95"
          >
            <Plus className="w-4 h-4" />
            <span>+ Catat Resep Baru</span>
          </button>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="px-4 py-2 border-b border-border-subtle bg-subtle/50 flex items-center justify-between text-xs">
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setStatusFilter('ALL')}
            className={`px-3 py-1 rounded-lg font-bold transition-all ${
              statusFilter === 'ALL'
                ? 'bg-primary text-primary-text shadow-xs'
                : 'text-text-secondary hover:bg-card-hover'
            }`}
          >
            Semua Resep ({prescriptions.length})
          </button>
          <button
            onClick={() => setStatusFilter('WaitingDispense')}
            className={`px-3 py-1 rounded-lg font-bold transition-all ${
              statusFilter === 'WaitingDispense'
                ? 'bg-amber-500 text-white shadow-xs'
                : 'text-text-secondary hover:bg-card-hover'
            }`}
          >
            Menunggu Dispensing ({prescriptions.filter(p => p.status === 'WaitingDispense').length})
          </button>
          <button
            onClick={() => setStatusFilter('Dispensed')}
            className={`px-3 py-1 rounded-lg font-bold transition-all ${
              statusFilter === 'Dispensed'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'text-text-secondary hover:bg-card-hover'
            }`}
          >
            Selesai / Terlayani ({prescriptions.filter(p => p.status === 'Dispensed').length})
          </button>
        </div>
      </div>

      {/* Prescriptions List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {filteredPrescriptions.length === 0 ? (
          <div className="py-20 text-center text-text-muted space-y-2">
            <FileText className="w-12 h-12 mx-auto opacity-25 text-emerald-600" />
            <p className="text-sm font-bold text-text-primary">Tidak Ada Resep Dokter</p>
            <p className="text-xs">Klik tombol "+ Catat Resep Baru" untuk menginput resep dari dokter atau klinik.</p>
          </div>
        ) : (
          filteredPrescriptions.map((rx) => (
            <div
              key={rx.id}
              className="bg-card border border-border-subtle rounded-2xl p-4 shadow-sm space-y-3 transition-all hover:border-border-strong"
            >
              {/* Header Card */}
              <div className="flex items-start justify-between border-b border-border-subtle pb-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-black text-sm text-text-primary">
                      #{rx.prescriptionNumber}
                    </span>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      rx.status === 'WaitingDispense'
                        ? 'bg-amber-500/10 text-amber-600 border border-amber-500/20'
                        : 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/20'
                    }`}>
                      {rx.status === 'WaitingDispense' ? 'Menunggu Racik & Dispensing' : 'Selesai Diracik'}
                    </span>
                    <span className="text-[11px] text-text-muted">
                      {new Date(rx.date).toLocaleDateString('id-ID', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-text-secondary">
                    <span className="font-bold text-text-primary">{rx.doctorName}</span>
                    <span>•</span>
                    <span className="font-mono text-[11px]">{rx.doctorSip}</span>
                    <span>•</span>
                    <span>{rx.clinicOrHospital}</span>
                  </div>
                </div>

                <div className="text-right">
                  <div className="text-xs font-bold text-text-primary">
                    Pasien: <span className="text-primary">{rx.patientName}</span> ({rx.patientAge})
                  </div>
                  {rx.patientPhone && (
                    <div className="text-[11px] text-text-secondary font-mono flex items-center justify-end gap-1 mt-0.5">
                      <Phone className="w-3 h-3 text-emerald-600" />
                      <span>{rx.patientPhone}</span>
                    </div>
                  )}
                  {rx.diagnosis && (
                    <div className="text-[10px] text-text-muted mt-0.5">
                      Diagnosa: <em>{rx.diagnosis}</em>
                    </div>
                  )}
                </div>
              </div>

              {/* Items Table */}
              <div className="bg-subtle/50 rounded-xl overflow-hidden border border-border-subtle">
                <table className="w-full text-left text-xs">
                  <thead className="bg-subtle text-text-secondary font-semibold border-b border-border-subtle">
                    <tr>
                      <th className="p-2.5">Obat & Sediaan</th>
                      <th className="p-2.5 text-center">Jumlah</th>
                      <th className="p-2.5">Aturan Pakai (Signa)</th>
                      <th className="p-2.5">Jenis Etiket</th>
                      <th className="p-2.5 text-right">Harga</th>
                      <th className="p-2.5 text-right">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border-subtle">
                    {rx.items.map((item) => (
                      <tr key={item.id} className="hover:bg-card-hover/40 transition-colors">
                        <td className="p-2.5 font-bold text-text-primary">
                          <div>{item.name}</div>
                          {item.notes && (
                            <span className="text-[10px] text-rose-600 italic font-normal">
                              *{item.notes}
                            </span>
                          )}
                        </td>
                        <td className="p-2.5 text-center font-mono font-bold">
                          {item.quantity} {item.unit}
                        </td>
                        <td className="p-2.5">
                          <div className="font-bold text-emerald-700 dark:text-emerald-400">
                            {item.signa}
                          </div>
                          <div className="text-[10px] text-text-muted">
                            {item.consumptionTime} • {item.period}
                          </div>
                        </td>
                        <td className="p-2.5">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            item.isObatLuar
                              ? 'bg-blue-600 text-white'
                              : 'bg-emerald-600 text-white'
                          }`}>
                            {item.isObatLuar ? 'Obat Luar (Biru)' : 'Obat Dalam (Putih)'}
                          </span>
                        </td>
                        <td className="p-2.5 text-right font-mono font-bold text-text-primary">
                          Rp {(item.price * item.quantity).toLocaleString('id-ID')}
                        </td>
                        <td className="p-2.5 text-right">
                          <button
                            onClick={() => handleOpenEtiket(rx, item)}
                            className="px-2.5 py-1 rounded-lg bg-emerald-600/10 hover:bg-emerald-600/20 text-emerald-600 border border-emerald-600/30 text-[11px] font-bold inline-flex items-center gap-1 transition-all"
                            title="Cetak Etiket Aturan Pakai ke Printer Label Thermal"
                          >
                            <Printer className="w-3 h-3" />
                            <span>Cetak Etiket</span>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Footer Actions */}
              <div className="flex items-center justify-between pt-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-text-secondary">Estimasi Tagihan:</span>
                  <span className="text-sm font-black font-mono text-primary">
                    Rp {rx.totalPrice.toLocaleString('id-ID')}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  {rx.patientPhone && (
                    <button
                      onClick={() => handleSendWhatsAppNotification(rx)}
                      className="px-3 py-1.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 border border-emerald-500/30 text-xs font-bold flex items-center gap-1.5 transition-all"
                    >
                      <Send className="w-3.5 h-3.5" />
                      <span>Kirim Info WA</span>
                    </button>
                  )}

                  <button
                    onClick={() => handleTransferToCart(rx)}
                    className="px-3.5 py-1.5 bg-primary hover:bg-primary-hover text-primary-text rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all"
                  >
                    <ShoppingCart className="w-3.5 h-3.5" />
                    <span>Pindahkan ke Kasir & Bayar</span>
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Modal Cetak Etiket */}
      <EtiketObatModal
        isOpen={isEtiketModalOpen}
        onClose={() => setIsEtiketModalOpen(false)}
        initialData={etiketInitialData}
      />

      {/* Modal Catat Resep Baru */}
      {isAddPrescriptionOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-card border border-border-subtle rounded-2xl w-full max-w-2xl shadow-2xl flex flex-col max-h-[88vh] overflow-hidden">
            <div className="p-4 border-b border-border-subtle flex items-center justify-between bg-surface">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-emerald-600/10 text-emerald-600 flex items-center justify-center font-bold">
                  <FileText className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-text-primary">
                    Catat Resep Dokter Baru
                  </h3>
                  <p className="text-[11px] text-text-secondary">
                    Input rincian resep, data dokter pengirim, dan aturan pakai obat
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsAddPrescriptionOpen(false)}
                className="p-1.5 text-text-muted hover:text-text-primary rounded-lg hover:bg-subtle transition-colors"
                title="Tutup Modal"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSavePrescription} className="flex-1 overflow-y-auto p-4 space-y-4 text-xs">
              {/* Data Dokter */}
              <div className="p-3 bg-subtle rounded-xl border border-border-subtle space-y-2">
                <h4 className="font-bold text-text-primary flex items-center gap-1">
                  <User className="w-3.5 h-3.5 text-emerald-600" /> Data Dokter & Faskes
                </h4>
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="block text-[10px] font-bold text-text-muted mb-1">Nama Dokter</label>
                    <input
                      type="text"
                      required
                      value={newDoctorName}
                      onChange={(e) => setNewDoctorName(e.target.value)}
                      className="w-full px-2.5 py-1.5 bg-card border border-border-strong rounded-lg text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-text-muted mb-1">No. SIP Dokter</label>
                    <input
                      type="text"
                      value={newDoctorSip}
                      onChange={(e) => setNewDoctorSip(e.target.value)}
                      className="w-full px-2.5 py-1.5 bg-card border border-border-strong rounded-lg text-xs font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-text-muted mb-1">Klinik / RS</label>
                    <input
                      type="text"
                      value={newClinic}
                      onChange={(e) => setNewClinic(e.target.value)}
                      className="w-full px-2.5 py-1.5 bg-card border border-border-strong rounded-lg text-xs"
                    />
                  </div>
                </div>
              </div>

              {/* Data Pasien */}
              <div className="p-3 bg-subtle rounded-xl border border-border-subtle space-y-2">
                <h4 className="font-bold text-text-primary flex items-center gap-1">
                  <User className="w-3.5 h-3.5 text-primary" /> Data Pasien
                </h4>
                <div className="grid grid-cols-4 gap-2">
                  <div className="col-span-2">
                    <label className="block text-[10px] font-bold text-text-muted mb-1">Nama Pasien *</label>
                    <input
                      type="text"
                      required
                      value={newPatientName}
                      onChange={(e) => setNewPatientName(e.target.value)}
                      placeholder="Nama lengkap pasien"
                      className="w-full px-2.5 py-1.5 bg-card border border-border-strong rounded-lg text-xs font-bold"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-text-muted mb-1">Usia / BB</label>
                    <input
                      type="text"
                      value={newPatientAge}
                      onChange={(e) => setNewPatientAge(e.target.value)}
                      placeholder="Contoh: 25 Thn"
                      className="w-full px-2.5 py-1.5 bg-card border border-border-strong rounded-lg text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-text-muted mb-1">No. WhatsApp</label>
                    <input
                      type="text"
                      value={newPatientPhone}
                      onChange={(e) => setNewPatientPhone(e.target.value)}
                      placeholder="0812xxxxxxxx"
                      className="w-full px-2.5 py-1.5 bg-card border border-border-strong rounded-lg text-xs font-mono"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-text-muted mb-1">Diagnosa Singkat</label>
                  <input
                    type="text"
                    value={newDiagnosis}
                    onChange={(e) => setNewDiagnosis(e.target.value)}
                    placeholder="Contoh: ISPA, Hipertensi, Alergi"
                    className="w-full px-2.5 py-1.5 bg-card border border-border-strong rounded-lg text-xs"
                  />
                </div>
              </div>

              {/* Rincian Obat */}
              <div className="p-3 bg-subtle rounded-xl border border-border-subtle space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-text-primary flex items-center gap-1">
                    <Pill className="w-3.5 h-3.5 text-emerald-600" /> Daftar Obat & Aturan Pakai (Signa)
                  </h4>
                  <button
                    type="button"
                    onClick={handleAddNewItemRow}
                    className="text-[11px] text-emerald-600 font-bold hover:underline"
                  >
                    + Tambah Obat Lain
                  </button>
                </div>

                <div className="space-y-2.5">
                  {newItems.map((item, idx) => (
                    <div key={item.id} className="p-2.5 bg-card rounded-lg border border-border-subtle space-y-2">
                      <div className="grid grid-cols-4 gap-2">
                        <div className="col-span-2">
                          <label className="block text-[10px] font-bold text-text-muted mb-0.5">Nama Obat</label>
                          <input
                            type="text"
                            required
                            value={item.name}
                            onChange={(e) => {
                              const val = e.target.value;
                              setNewItems(prev => prev.map((it, i) => i === idx ? { ...it, name: val } : it));
                            }}
                            className="w-full px-2 py-1 bg-subtle border border-border-strong rounded text-xs font-bold"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-text-muted mb-0.5">Jumlah</label>
                          <input
                            type="number"
                            min="1"
                            value={item.quantity}
                            onChange={(e) => {
                              const q = parseInt(e.target.value) || 1;
                              setNewItems(prev => prev.map((it, i) => i === idx ? { ...it, quantity: q } : it));
                            }}
                            className="w-full px-2 py-1 bg-subtle border border-border-strong rounded text-xs font-mono"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-text-muted mb-0.5">Harga Jual</label>
                          <input
                            type="number"
                            value={item.price}
                            onChange={(e) => {
                              const p = parseFloat(e.target.value) || 0;
                              setNewItems(prev => prev.map((it, i) => i === idx ? { ...it, price: p } : it));
                            }}
                            className="w-full px-2 py-1 bg-subtle border border-border-strong rounded text-xs font-mono"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-3 gap-2">
                        <div className="col-span-2">
                          <label className="block text-[10px] font-bold text-text-muted mb-0.5">Signa (Aturan Pakai)</label>
                          <input
                            type="text"
                            required
                            value={item.signa}
                            onChange={(e) => {
                              const s = e.target.value;
                              setNewItems(prev => prev.map((it, i) => i === idx ? { ...it, signa: s } : it));
                            }}
                            className="w-full px-2 py-1 bg-subtle border border-border-strong rounded text-xs"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-text-muted mb-0.5">Jenis Etiket</label>
                          <select
                            value={item.isObatLuar ? 'luar' : 'dalam'}
                            onChange={(e) => {
                              const isL = e.target.value === 'luar';
                              setNewItems(prev => prev.map((it, i) => i === idx ? { ...it, isObatLuar: isL } : it));
                            }}
                            className="w-full px-2 py-1 bg-subtle border border-border-strong rounded text-xs"
                          >
                            <option value="dalam">Obat Dalam (Putih)</option>
                            <option value="luar">Obat Luar (Biru)</option>
                          </select>
                        </div>
                      </div>

                      {newItems.length > 1 && (
                        <div className="flex justify-end">
                          <button
                            type="button"
                            onClick={() => handleRemoveItemRow(idx)}
                            className="text-[10px] text-rose-600 font-bold hover:underline flex items-center gap-1"
                          >
                            <Trash2 className="w-3 h-3" />
                            <span>Hapus Baris Obat</span>
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-between pt-2">
                <button
                  type="button"
                  onClick={() => setIsAddPrescriptionOpen(false)}
                  className="px-4 py-2 rounded-lg bg-subtle hover:bg-card-hover font-semibold text-text-secondary"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg shadow-sm"
                >
                  Simpan & Terbitkan Resep
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
export default PrescriptionsPage;
