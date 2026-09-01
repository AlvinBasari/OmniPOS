import React, { useState, useEffect } from 'react';
import { 
  Wrench, 
  Plus, 
  Search, 
  Smartphone, 
  Laptop, 
  Clock, 
  CheckCircle2, 
  AlertTriangle, 
  User, 
  Phone, 
  Printer, 
  Package, 
  ShieldCheck, 
  FileText,
  DollarSign,
  Layers,
  Sparkles,
  Edit3,
  MessageSquare,
  Send,
  ExternalLink
} from 'lucide-react';
import { DeviceServiceTicket, DeviceServiceStatus, ServiceItemType, Product } from '../types';
import { useToastStore } from '../store/useToastStore';
import { useAuthStore } from '../store/useAuthStore';
import { generateServiceWhatsAppMessage, openWhatsAppUrl } from '../utils/whatsappHelper';
import { SpkReceiptPrintModal } from '../components/modals/SpkReceiptPrintModal';

export const ServiceCenterPage: React.FC = () => {
  const [tickets, setTickets] = useState<DeviceServiceTicket[]>([]);
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { storeInfo } = useAuthStore();

  // Modals
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState<DeviceServiceTicket | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isPrintSpkModalOpen, setIsPrintSpkModalOpen] = useState(false);
  const [printTicketTarget, setPrintTicketTarget] = useState<DeviceServiceTicket | null>(null);

  // New Ticket Form State
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [deviceType, setDeviceType] = useState('Smartphone');
  const [brandAndModel, setBrandAndModel] = useState('');
  const [imeiOrSerial, setImeiOrSerial] = useState('');
  const [deviceColor, setDeviceColor] = useState('');
  const [passcodeOrPattern, setPasscodeOrPattern] = useState('');
  const [problemDescription, setProblemDescription] = useState('');
  const [physicalCondition, setPhysicalCondition] = useState('Lecet Pemakaian Wajar');
  const [accessoriesIncluded, setAccessoriesIncluded] = useState('Unit Only');
  const [estimatedCost, setEstimatedCost] = useState('0');
  const [downPayment, setDownPayment] = useState('0');
  const [assignedTechnician, setAssignedTechnician] = useState('Teknisi Utama');
  const [warrantyDays, setWarrantyDays] = useState('30');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Action on Selected Ticket Form State
  const [actionStatus, setActionStatus] = useState<DeviceServiceStatus>('InInspection');
  const [technicianNotes, setTechnicianNotes] = useState('');
  const [actionFinalCost, setActionFinalCost] = useState('');

  // Add Item to Ticket Form State
  const [spareparts, setSpareparts] = useState<Product[]>([]);
  const [selectedProductId, setSelectedProductId] = useState('');
  const [customItemName, setCustomItemName] = useState('');
  const [customItemType, setCustomItemType] = useState<ServiceItemType>('SparePart');
  const [customItemQty, setCustomItemQty] = useState(1);
  const [customItemPrice, setCustomItemPrice] = useState(0);

  useEffect(() => {
    fetchTickets();
    fetchSpareparts();
  }, []);

  const fetchTickets = async () => {
    try {
      setIsLoading(true);
      const res = await fetch('/api/v1/electronics/services');
      if (res.ok) {
        const data = await res.json();
        setTickets(data);
      }
    } catch {
      useToastStore.getState().showToast('Gagal memuat data tiket servis.', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchSpareparts = async () => {
    try {
      const res = await fetch('/api/v1/products');
      if (res.ok) {
        const prods: Product[] = await res.json();
        setSpareparts(prods);
      }
    } catch {}
  };

  const handleSendWhatsApp = (ticket: DeviceServiceTicket) => {
    if (!ticket.customerPhone || ticket.customerPhone.trim().length < 8) {
      useToastStore.getState().showToast('Nomor WhatsApp pelanggan belum terdaftar pada tiket ini.', 'warning');
      return;
    }
    const msg = generateServiceWhatsAppMessage(ticket, storeInfo.storeName || 'OmniPOS Service Center', storeInfo.storePhone);
    openWhatsAppUrl(ticket.customerPhone, msg);
    useToastStore.getState().showToast(`Membuka WhatsApp untuk ${ticket.customerName}...`, 'info');
  };

  const handleCreateTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerName.trim() || !brandAndModel.trim() || !problemDescription.trim()) {
      useToastStore.getState().showToast('Lengkapi data wajib pelanggan, perangkat, dan keluhan.', 'warning');
      return;
    }

    try {
      setIsSubmitting(true);
      const payload = {
        customerName: customerName.trim(),
        customerPhone: customerPhone.trim(),
        deviceType,
        brandAndModel: brandAndModel.trim(),
        imeiOrSerial: imeiOrSerial.trim() || undefined,
        deviceColor: deviceColor.trim() || undefined,
        passcodeOrPattern: passcodeOrPattern.trim() || undefined,
        problemDescription: problemDescription.trim(),
        physicalCondition: physicalCondition.trim(),
        accessoriesIncluded: accessoriesIncluded.trim(),
        estimatedCost: parseFloat(estimatedCost) || 0,
        downPayment: parseFloat(downPayment) || 0,
        assignedTechnicianName: assignedTechnician.trim(),
        warrantyDaysGiven: parseInt(warrantyDays) || 30
      };

      const res = await fetch('/api/v1/electronics/services', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        const created = await res.json();
        useToastStore.getState().showToast(`SPK Tanda Terima Servis ${created.ticketNumber} berhasil diterbitkan!`, 'success');
        setIsAddModalOpen(false);
        resetForm();
        fetchTickets();
      } else {
        useToastStore.getState().showToast('Gagal membuat tiket servis.', 'error');
      }
    } catch {
      useToastStore.getState().showToast('Gagal menghubungi server.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setCustomerName('');
    setCustomerPhone('');
    setBrandAndModel('');
    setImeiOrSerial('');
    setDeviceColor('');
    setPasscodeOrPattern('');
    setProblemDescription('');
    setEstimatedCost('0');
    setDownPayment('0');
  };

  const openDetailModal = (t: DeviceServiceTicket) => {
    setSelectedTicket(t);
    setActionStatus(t.status);
    setTechnicianNotes(t.technicianNotes || '');
    setActionFinalCost(t.finalCost.toString());
    setIsDetailModalOpen(true);
  };

  const handleUpdateStatus = async () => {
    if (!selectedTicket) return;
    try {
      setIsSubmitting(true);
      const res = await fetch(`/api/v1/electronics/services/${selectedTicket.id}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: actionStatus,
          technicianNotes,
          finalCost: parseFloat(actionFinalCost) || undefined
        })
      });

      if (res.ok) {
        const updated = await res.json();
        useToastStore.getState().showToast(`Status tiket ${updated.ticketNumber} berhasil diperbarui!`, 'success');
        setSelectedTicket(updated);
        fetchTickets();
      }
    } catch {
      useToastStore.getState().showToast('Gagal memperbarui status tiket.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAddItemToTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTicket) return;

    let itemName = customItemName.trim();
    let unitPrice = customItemPrice;

    if (selectedProductId) {
      const prod = spareparts.find(p => p.id === selectedProductId);
      if (prod) {
        itemName = prod.name;
        unitPrice = prod.sellPrice;
      }
    }

    if (!itemName) {
      useToastStore.getState().showToast('Nama sparepart / biaya jasa wajib diisi.', 'warning');
      return;
    }

    try {
      const payload = {
        itemType: customItemType,
        productId: selectedProductId || undefined,
        name: itemName,
        quantity: customItemQty,
        unitPrice: unitPrice
      };

      const res = await fetch(`/api/v1/electronics/services/${selectedTicket.id}/items`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        const updated = await res.json();
        useToastStore.getState().showToast('Item sparepart/jasa berhasil ditambahkan!', 'success');
        setSelectedTicket(updated);
        setSelectedProductId('');
        setCustomItemName('');
        setCustomItemQty(1);
        setCustomItemPrice(0);
        fetchTickets();
      }
    } catch {
      useToastStore.getState().showToast('Gagal menambahkan item.', 'error');
    }
  };

  const handlePrintReceipt = (t: DeviceServiceTicket) => {
    setPrintTicketTarget(t);
    setIsPrintSpkModalOpen(true);
  };

  const getStatusBadge = (status: DeviceServiceStatus) => {
    switch (status) {
      case 'Received':
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/10 text-amber-600 border border-amber-500/20">Antrean Baru</span>;
      case 'InInspection':
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-500/10 text-blue-600 border border-blue-500/20">Pemeriksaan Teknisi</span>;
      case 'WaitingForSpareParts':
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-500/10 text-purple-600 border border-purple-500/20">Menunggu Part</span>;
      case 'Repairing':
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-500/10 text-indigo-600 border border-indigo-500/20">Sedang Dikerjakan</span>;
      case 'CompletedReadyForPickup':
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">Siap Diambil</span>;
      case 'PickedUpAndPaid':
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-600 text-white">Selesai & Lunas</span>;
      case 'Cancelled':
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-500/10 text-rose-600 border border-rose-500/20">Batal / Retur</span>;
      default:
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-subtle text-text-secondary">{status}</span>;
    }
  };

  const filteredTickets = tickets.filter(t => {
    if (statusFilter !== 'ALL' && t.status !== statusFilter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        t.ticketNumber.toLowerCase().includes(q) ||
        t.customerName.toLowerCase().includes(q) ||
        t.customerPhone.toLowerCase().includes(q) ||
        t.brandAndModel.toLowerCase().includes(q) ||
        (t.imeiOrSerial && t.imeiOrSerial.toLowerCase().includes(q))
      );
    }
    return true;
  });

  return (
    <div className="flex-1 flex flex-col bg-app overflow-hidden select-none">
      {/* Header */}
      <div className="p-4 bg-surface border-b border-border-subtle flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-bold">
            <Wrench className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-base font-bold text-text-primary flex items-center gap-2">
              Pusat Servis & Reparasi Elektronik (Service Center & RMA)
            </h1>
            <p className="text-xs text-text-secondary">
              Penerimaan SPK servis, pelacakan progres teknisi, kalkulasi biaya sparepart & garansi reparasi
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative w-64">
            <Search className="w-4 h-4 text-text-muted absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari No. SPK, Pelanggan, IMEI..."
              className="w-full pl-9 pr-3 py-1.5 bg-subtle border border-border-subtle rounded-lg text-xs text-text-primary focus:outline-none focus:border-primary"
            />
          </div>

          <button
            onClick={() => setIsAddModalOpen(true)}
            className="px-3.5 py-2 bg-primary hover:bg-primary-hover text-primary-text rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-sm"
          >
            <Plus className="w-4 h-4" />
            <span>Terima Servis Baru [SPK]</span>
          </button>
        </div>
      </div>

      {/* Status Filter Tabs */}
      <div className="px-4 py-2 bg-surface border-b border-border-subtle flex gap-2 overflow-x-auto text-xs font-semibold">
        {[
          { id: 'ALL', label: `Semua (${tickets.length})` },
          { id: 'Received', label: `Antrean Baru (${tickets.filter(t => t.status === 'Received').length})` },
          { id: 'InInspection', label: `Pemeriksaan (${tickets.filter(t => t.status === 'InInspection').length})` },
          { id: 'WaitingForCustomerApproval', label: `Tunggu Persetujuan (${tickets.filter(t => t.status === 'WaitingForCustomerApproval').length})` },
          { id: 'WaitingForSpareParts', label: `Menunggu Part (${tickets.filter(t => t.status === 'WaitingForSpareParts').length})` },
          { id: 'Repairing', label: `🔧 Sedang Dikerjakan (${tickets.filter(t => t.status === 'Repairing').length})` },
          { id: 'CompletedReadyForPickup', label: `✅ Siap Diambil (${tickets.filter(t => t.status === 'CompletedReadyForPickup').length})` },
          { id: 'PickedUpAndPaid', label: `Selesai & Lunas (${tickets.filter(t => t.status === 'PickedUpAndPaid').length})` },
          { id: 'Cancelled', label: `Dibatalkan (${tickets.filter(t => t.status === 'Cancelled').length})` }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setStatusFilter(tab.id)}
            className={`px-3 py-1.5 rounded-lg whitespace-nowrap transition-all ${
              statusFilter === tab.id
                ? 'bg-card border border-primary/40 text-primary shadow-xs'
                : 'text-text-secondary hover:text-text-primary'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Main Table */}
      <div className="flex-1 overflow-y-auto p-4">
        <div className="bg-card border border-border-subtle rounded-xl overflow-hidden shadow-sm">
          <table className="w-full text-left text-xs">
            <thead className="bg-subtle text-text-secondary font-semibold border-b border-border-subtle">
              <tr>
                <th className="p-3">No. SPK & Waktu</th>
                <th className="p-3">Pelanggan</th>
                <th className="p-3">Perangkat & IMEI</th>
                <th className="p-3">Keluhan Kerusakan</th>
                <th className="p-3">Teknisi</th>
                <th className="p-3 text-right">Biaya / DP / Sisa</th>
                <th className="p-3 text-center">Status</th>
                <th className="p-3 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-subtle/50">
              {isLoading ? (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-text-muted">Memuat data tiket servis...</td>
                </tr>
              ) : filteredTickets.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-text-muted">Tidak ada tiket servis yang sesuai kriteria.</td>
                </tr>
              ) : (
                filteredTickets.map(t => (
                  <tr key={t.id} className="hover:bg-card-hover/50 transition-colors">
                    <td className="p-3 font-mono">
                      <div className="font-bold text-text-primary">{t.ticketNumber}</div>
                      <div className="text-[10px] text-text-muted">{new Date(t.receivedDate).toLocaleDateString('id-ID')}</div>
                    </td>
                    <td className="p-3">
                      <div className="font-semibold text-text-primary">{t.customerName}</div>
                      <div className="text-[10px] text-text-muted font-mono">{t.customerPhone}</div>
                    </td>
                    <td className="p-3">
                      <div className="font-semibold text-text-primary flex items-center gap-1">
                        {t.deviceType === 'Laptop' ? <Laptop className="w-3.5 h-3.5 text-primary" /> : <Smartphone className="w-3.5 h-3.5 text-primary" />}
                        <span>{t.brandAndModel}</span>
                      </div>
                      {t.imeiOrSerial && <div className="text-[10px] text-text-muted font-mono">IMEI: {t.imeiOrSerial}</div>}
                    </td>
                    <td className="p-3 max-w-xs truncate text-text-secondary" title={t.problemDescription}>
                      {t.problemDescription}
                    </td>
                    <td className="p-3 text-text-secondary font-medium">
                      {t.assignedTechnicianName || '-'}
                    </td>
                    <td className="p-3 text-right font-mono tabular-nums">
                      <div className="font-bold text-text-primary">Rp {t.finalCost.toLocaleString('id-ID')}</div>
                      <div className="text-[10px] text-text-muted">DP: Rp {t.downPayment.toLocaleString('id-ID')}</div>
                      {t.remainingBalance > 0 && (
                        <div className="text-[10px] font-bold text-status-danger">Sisa: Rp {t.remainingBalance.toLocaleString('id-ID')}</div>
                      )}
                    </td>
                    <td className="p-3 text-center">
                      {getStatusBadge(t.status)}
                    </td>
                    <td className="p-3 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => handleSendWhatsApp(t)}
                          title="Kirim Update Status via WhatsApp ke Pelanggan"
                          className="p-1.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 border border-emerald-500/30 transition-colors"
                        >
                          <MessageSquare className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => openDetailModal(t)}
                          className="px-2.5 py-1 rounded-lg bg-primary/10 hover:bg-primary/20 border border-primary/30 text-[11px] font-bold text-primary transition-colors"
                        >
                          Kelola
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL: INPUT TIKET SERVIS BARU (SPK) */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-2xl bg-card border border-border-strong rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-4 bg-surface border-b border-border-subtle flex items-center justify-between">
              <h3 className="font-bold text-sm text-text-primary flex items-center gap-2">
                <Wrench className="w-4 h-4 text-primary" />
                Penerimaan Servis Perangkat Baru (Terbitkan SPK)
              </h3>
              <button onClick={() => setIsAddModalOpen(false)} className="text-text-muted hover:text-text-primary font-bold">
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateTicket} className="p-5 space-y-4 overflow-y-auto text-xs flex-1">
              {/* Section 1: Customer */}
              <div className="p-3.5 bg-subtle rounded-xl border border-border-subtle space-y-2">
                <h4 className="font-bold text-text-primary flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-primary" /> Informasi Pemilik Perangkat
                </h4>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-bold text-text-muted mb-1">Nama Pelanggan *</label>
                    <input
                      type="text"
                      required
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      placeholder="Bpk / Ibu..."
                      className="w-full px-3 py-2 bg-card border border-border-subtle rounded-lg text-text-primary"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-text-muted mb-1">Nomor WhatsApp / Telp *</label>
                    <input
                      type="text"
                      required
                      value={customerPhone}
                      onChange={(e) => setCustomerPhone(e.target.value)}
                      placeholder="0812-xxxx-xxxx"
                      className="w-full px-3 py-2 bg-card border border-border-subtle rounded-lg text-text-primary font-mono"
                    />
                  </div>
                </div>
              </div>

              {/* Section 2: Device Info */}
              <div className="p-3.5 bg-subtle rounded-xl border border-border-subtle space-y-2">
                <h4 className="font-bold text-text-primary flex items-center gap-1.5">
                  <Smartphone className="w-3.5 h-3.5 text-primary" /> Informasi Perangkat & Kondisi
                </h4>
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="block text-[10px] font-bold text-text-muted mb-1">Jenis Perangkat</label>
                    <select
                      value={deviceType}
                      onChange={(e) => setDeviceType(e.target.value)}
                      className="w-full px-2.5 py-2 bg-card border border-border-subtle rounded-lg text-text-primary font-semibold"
                    >
                      <option value="Smartphone">Smartphone (HP)</option>
                      <option value="Laptop">Laptop / Notebook</option>
                      <option value="Tablet">Tablet / iPad</option>
                      <option value="PC">Komputer Desktop (PC)</option>
                      <option value="Smartwatch">Smartwatch / Wearable</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-text-muted mb-1">Merek & Tipe *</label>
                    <input
                      type="text"
                      required
                      value={brandAndModel}
                      onChange={(e) => setBrandAndModel(e.target.value)}
                      placeholder="iPhone 13 / Samsung S23..."
                      className="w-full px-3 py-2 bg-card border border-border-subtle rounded-lg text-text-primary"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-text-muted mb-1">Nomor IMEI / Serial Number</label>
                    <input
                      type="text"
                      value={imeiOrSerial}
                      onChange={(e) => setImeiOrSerial(e.target.value)}
                      placeholder="35xxxx / Serial"
                      className="w-full px-3 py-2 bg-card border border-border-subtle rounded-lg text-text-primary font-mono"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2 pt-1">
                  <div>
                    <label className="block text-[10px] font-bold text-text-muted mb-1">Warna Perangkat</label>
                    <input
                      type="text"
                      value={deviceColor}
                      onChange={(e) => setDeviceColor(e.target.value)}
                      placeholder="Hitam / Titanium..."
                      className="w-full px-3 py-2 bg-card border border-border-subtle rounded-lg text-text-primary"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-text-muted mb-1">PIN / Pola Layar (Opsional)</label>
                    <input
                      type="text"
                      value={passcodeOrPattern}
                      onChange={(e) => setPasscodeOrPattern(e.target.value)}
                      placeholder="123456 / Pola L"
                      className="w-full px-3 py-2 bg-card border border-border-subtle rounded-lg text-text-primary font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-text-muted mb-1">Kelengkapan Disertakan</label>
                    <input
                      type="text"
                      value={accessoriesIncluded}
                      onChange={(e) => setAccessoriesIncluded(e.target.value)}
                      placeholder="Unit Only / Charger / Dus"
                      className="w-full px-3 py-2 bg-card border border-border-subtle rounded-lg text-text-primary"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-text-muted mb-1">Keluhan Kerusakan / Masalah *</label>
                  <textarea
                    required
                    rows={2}
                    value={problemDescription}
                    onChange={(e) => setProblemDescription(e.target.value)}
                    placeholder="Contoh: Layar retak setelah jatuh, layar bergaris hijau, sentuh tidak respon..."
                    className="w-full p-2.5 bg-card border border-border-subtle rounded-lg text-text-primary"
                  />
                </div>
              </div>

              {/* Section 3: Cost & DP */}
              <div className="p-3.5 bg-subtle rounded-xl border border-border-subtle space-y-2">
                <h4 className="font-bold text-text-primary flex items-center gap-1.5">
                  <DollarSign className="w-3.5 h-3.5 text-primary" /> Estimasi Biaya & Uang Muka (DP)
                </h4>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[10px] font-bold text-text-muted mb-1">Estimasi Total Biaya (Rp)</label>
                    <input
                      type="number"
                      value={estimatedCost}
                      onChange={(e) => setEstimatedCost(e.target.value)}
                      className="w-full px-3 py-2 bg-card border border-border-subtle rounded-lg text-text-primary font-mono font-bold"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-text-muted mb-1">Uang Muka Diterima / DP (Rp)</label>
                    <input
                      type="number"
                      value={downPayment}
                      onChange={(e) => setDownPayment(e.target.value)}
                      className="w-full px-3 py-2 bg-card border border-border-subtle rounded-lg text-text-primary font-mono font-bold text-primary"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-text-muted mb-1">Garansi Pengerjaan (Hari)</label>
                    <input
                      type="number"
                      value={warrantyDays}
                      onChange={(e) => setWarrantyDays(e.target.value)}
                      className="w-full px-3 py-2 bg-card border border-border-subtle rounded-lg text-text-primary font-mono"
                    />
                  </div>
                </div>
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 bg-subtle hover:bg-card-hover border border-border-subtle rounded-lg text-text-secondary font-semibold"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 bg-primary hover:bg-primary-hover text-primary-text font-bold rounded-lg shadow-md disabled:opacity-50 flex items-center gap-1.5"
                >
                  <FileText className="w-4 h-4" />
                  <span>{isSubmitting ? 'Menerbitkan...' : 'Terbitkan SPK Servis'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: DETAIL & TINDAKAN TEKNISI */}
      {isDetailModalOpen && selectedTicket && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-3xl bg-card border border-border-strong rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-4 bg-surface border-b border-border-subtle flex items-center justify-between">
              <div>
                <h3 className="font-bold text-sm text-text-primary flex items-center gap-2">
                  <Wrench className="w-4 h-4 text-primary" />
                  Pengelolaan Servis: {selectedTicket.ticketNumber} ({selectedTicket.brandAndModel})
                </h3>
                <p className="text-[11px] text-text-secondary">
                  Pemilik: <strong>{selectedTicket.customerName}</strong> ({selectedTicket.customerPhone}) • Status Saat Ini: {getStatusBadge(selectedTicket.status)}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleSendWhatsApp(selectedTicket)}
                  className="px-3 py-1.5 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 text-emerald-600 rounded-lg font-bold flex items-center gap-1.5 text-xs transition-colors"
                >
                  <MessageSquare className="w-3.5 h-3.5" />
                  <span>Kirim Update WA</span>
                </button>
                <button
                  onClick={() => handlePrintReceipt(selectedTicket)}
                  className="px-3 py-1.5 bg-subtle hover:bg-card-hover border border-border-subtle rounded-lg font-semibold text-text-primary flex items-center gap-1 text-xs"
                >
                  <Printer className="w-3.5 h-3.5 text-primary" />
                  <span>Cetak SPK</span>
                </button>
                <button onClick={() => setIsDetailModalOpen(false)} className="text-text-muted hover:text-text-primary font-bold ml-2">
                  ✕
                </button>
              </div>
            </div>

            <div className="p-5 space-y-4 overflow-y-auto text-xs flex-1">
              {/* Problem summary card */}
              <div className="p-3 bg-subtle rounded-xl border border-border-subtle grid grid-cols-3 gap-3">
                <div>
                  <span className="text-[10px] text-text-muted font-bold block">Keluhan Pelanggan:</span>
                  <p className="font-semibold text-text-primary">{selectedTicket.problemDescription}</p>
                </div>
                <div>
                  <span className="text-[10px] text-text-muted font-bold block">Kondisi & Kelengkapan:</span>
                  <p className="text-text-secondary">{selectedTicket.physicalCondition} ({selectedTicket.accessoriesIncluded})</p>
                  {selectedTicket.passcodeOrPattern && <p className="text-primary font-mono text-[11px]">PIN: {selectedTicket.passcodeOrPattern}</p>}
                </div>
                <div className="text-right">
                  <span className="text-[10px] text-text-muted font-bold block">Total Biaya / Sisa:</span>
                  <p className="font-bold font-mono text-primary text-sm">Rp {selectedTicket.finalCost.toLocaleString('id-ID')}</p>
                  <p className="font-mono text-status-danger text-[11px]">Sisa Pelunasan: Rp {selectedTicket.remainingBalance.toLocaleString('id-ID')}</p>
                </div>
              </div>

              {/* Rincian Sparepart & Jasa */}
              <div className="p-3 bg-surface rounded-xl border border-border-subtle space-y-3">
                <h4 className="font-bold text-text-primary flex items-center gap-1.5">
                  <Package className="w-3.5 h-3.5 text-primary" /> Rincian Komponen / Sparepart & Jasa Teknisi
                </h4>
                
                <table className="w-full text-left text-xs">
                  <thead className="bg-subtle text-text-secondary font-semibold border-b border-border-subtle">
                    <tr>
                      <th className="p-2">Item / Tindakan</th>
                      <th className="p-2">Tipe</th>
                      <th className="p-2 text-center">Qty</th>
                      <th className="p-2 text-right">Harga Satuan</th>
                      <th className="p-2 text-right">Subtotal</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border-subtle/50 font-mono">
                    {selectedTicket.items.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="p-4 text-center text-text-muted font-sans">Belum ada sparepart / jasa ditambahkan ke tiket ini.</td>
                      </tr>
                    ) : (
                      selectedTicket.items.map((it, idx) => (
                        <tr key={idx}>
                          <td className="p-2 font-sans font-semibold text-text-primary">{it.name}</td>
                          <td className="p-2 font-sans">
                            <span className={`px-1.5 py-0.5 rounded text-[10px] ${it.itemType === 'SparePart' ? 'bg-primary/10 text-primary' : 'bg-purple-500/10 text-purple-600'}`}>
                              {it.itemType === 'SparePart' ? 'Sparepart' : 'Jasa'}
                            </span>
                          </td>
                          <td className="p-2 text-center">{it.quantity}</td>
                          <td className="p-2 text-right">Rp {it.unitPrice.toLocaleString('id-ID')}</td>
                          <td className="p-2 text-right font-bold text-text-primary">Rp {it.totalPrice.toLocaleString('id-ID')}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>

                {/* Form Tambah Item */}
                <form onSubmit={handleAddItemToTicket} className="p-3 bg-subtle rounded-xl border border-border-subtle space-y-2">
                  <span className="font-bold text-[11px] text-text-primary block">Tambah Komponen dari Inventori / Jasa:</span>
                  <div className="grid grid-cols-5 gap-2">
                    <div className="col-span-2">
                      <select
                        value={selectedProductId}
                        onChange={(e) => {
                          setSelectedProductId(e.target.value);
                          const p = spareparts.find(sp => sp.id === e.target.value);
                          if (p) {
                            setCustomItemName(p.name);
                            setCustomItemPrice(p.sellPrice);
                          }
                        }}
                        className="w-full px-2.5 py-1.5 bg-card border border-border-subtle rounded-lg text-text-primary font-semibold"
                      >
                        <option value="">-- Pilih dari Katalog Inventori Toko --</option>
                        {spareparts.map(p => (
                          <option key={p.id} value={p.id}>{p.name} (Stok: {p.currentStock}) - Rp {p.sellPrice.toLocaleString('id-ID')}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <input
                        type="text"
                        value={customItemName}
                        onChange={(e) => setCustomItemName(e.target.value)}
                        placeholder="Atau nama kustom..."
                        className="w-full px-2.5 py-1.5 bg-card border border-border-subtle rounded-lg text-text-primary"
                      />
                    </div>
                    <div>
                      <input
                        type="number"
                        min="1"
                        value={customItemQty}
                        onChange={(e) => setCustomItemQty(Math.max(1, parseInt(e.target.value) || 1))}
                        placeholder="Qty"
                        className="w-full px-2.5 py-1.5 bg-card border border-border-subtle rounded-lg text-text-primary font-mono text-center font-bold"
                      />
                    </div>
                    <div>
                      <input
                        type="number"
                        value={customItemPrice}
                        onChange={(e) => setCustomItemPrice(Number(e.target.value))}
                        placeholder="Harga (Rp)"
                        className="w-full px-2.5 py-1.5 bg-card border border-border-subtle rounded-lg text-text-primary font-mono font-bold"
                      />
                    </div>
                  </div>
                  <div className="flex justify-end">
                    <button
                      type="submit"
                      className="px-3 py-1.5 bg-primary hover:bg-primary-hover text-primary-text rounded-lg font-bold text-xs shadow-sm flex items-center gap-1"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Tambahkan ke SPK</span>
                    </button>
                  </div>
                </form>
              </div>

              {/* Form Update Status & Catatan Teknisi */}
              <div className="p-3.5 bg-subtle rounded-xl border border-border-subtle space-y-3">
                <h4 className="font-bold text-text-primary flex items-center gap-1.5">
                  <Edit3 className="w-3.5 h-3.5 text-primary" /> Perbarui Status Servis & Hasil Pengecekan Teknisi
                </h4>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-bold text-text-muted mb-1">Status Progres Servis</label>
                    <select
                      value={actionStatus}
                      onChange={(e) => setActionStatus(e.target.value as DeviceServiceStatus)}
                      className="w-full px-3 py-2 bg-card border border-border-subtle rounded-lg text-text-primary font-bold"
                    >
                      <option value="Received">Antrean Baru (Received)</option>
                      <option value="InInspection">Sedang Dicek Teknisi (In Inspection)</option>
                      <option value="WaitingForCustomerApproval">Menunggu Persetujuan Biaya Pelanggan</option>
                      <option value="WaitingForSpareParts">Menunggu Pengiriman Sparepart</option>
                      <option value="Repairing">Sedang Dikerjakan / Reparasi (Repairing)</option>
                      <option value="CompletedReadyForPickup">Selesai Diperbaiki (Siap Diambil)</option>
                      <option value="PickedUpAndPaid">Sudah Diambil & Lunas (Closed)</option>
                      <option value="Cancelled">Batal / Tidak Dapat Diperbaiki</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-text-muted mb-1">Total Biaya Akhir (Rp)</label>
                    <input
                      type="number"
                      value={actionFinalCost}
                      onChange={(e) => setActionFinalCost(e.target.value)}
                      className="w-full px-3 py-2 bg-card border border-border-subtle rounded-lg text-text-primary font-mono font-bold"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-text-muted mb-1">Catatan Diagnosa / Laporan Pengerjaan Teknisi</label>
                  <textarea
                    rows={2}
                    value={technicianNotes}
                    onChange={(e) => setTechnicianNotes(e.target.value)}
                    placeholder="Contoh: Modul LCD telah diganti dengan part OEM, TrueTone telah dikalibrasi, touch responsive 100%..."
                    className="w-full p-2.5 bg-card border border-border-subtle rounded-lg text-text-primary"
                  />
                </div>

                <div className="flex justify-end">
                  <button
                    onClick={handleUpdateStatus}
                    disabled={isSubmitting}
                    className="px-4 py-2 bg-primary hover:bg-primary-hover text-primary-text rounded-lg font-bold shadow-md flex items-center gap-1.5"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Simpan Perubahan Servis</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Official SPK & Service Receipt Print Modal */}
      <SpkReceiptPrintModal
        isOpen={isPrintSpkModalOpen}
        ticket={printTicketTarget}
        onClose={() => {
          setIsPrintSpkModalOpen(false);
          setPrintTicketTarget(null);
        }}
      />
    </div>
  );
};
