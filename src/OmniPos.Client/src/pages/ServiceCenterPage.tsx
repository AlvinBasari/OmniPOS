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
  ExternalLink,
  X,
  Kanban,
  Table as TableIcon,
  Calendar,
  Trash2,
  ShoppingCart,
  Check,
  AlertCircle,
  Award,
  TrendingUp,
  RefreshCw
} from 'lucide-react';
import { 
  DeviceServiceTicket, 
  DeviceServiceStatus, 
  ServiceItemType, 
  Product,
  DeviceChecklistItem,
  ServiceWarrantyCheckResult,
  TechnicianSummaryItem
} from '../types';
import { useToastStore } from '../store/useToastStore';
import { useAuthStore } from '../store/useAuthStore';
import { useCartStore } from '../store/useCartStore';
import { generateServiceWhatsAppMessage, openWhatsAppUrl } from '../utils/whatsappHelper';
import { SpkReceiptPrintModal } from '../components/modals/SpkReceiptPrintModal';
import { useBusinessModeStore } from '../store/useBusinessModeStore';

const DEFAULT_CHECKLIST_ITEMS: { key: string; label: string }[] = [
  { key: 'lcd', label: 'Layar LCD / Display' },
  { key: 'touchscreen', label: 'Layar Sentuh (Touch)' },
  { key: 'camera', label: 'Kamera Depan / Belakang' },
  { key: 'battery', label: 'Baterai & Ketahanan' },
  { key: 'wifi', label: 'Koneksi Wi-Fi / BT / Sinyal' },
  { key: 'buttons', label: 'Tombol Power / Volume' },
  { key: 'charging_port', label: 'Port Charger & Konektor' },
  { key: 'audio', label: 'Speaker & Mikrofon' }
];

export const ServiceCenterPage: React.FC = () => {
  const { mode } = useBusinessModeStore();
  const isServicesMode = mode === 'Services';
  const { storeInfo } = useAuthStore();

  // Active Main Navigation Tab: 'workflow' | 'warranty' | 'technicians'
  const [activeTab, setActiveTab] = useState<'workflow' | 'warranty' | 'technicians'>('workflow');
  // Workflow View Mode: 'kanban' | 'table'
  const [viewMode, setViewMode] = useState<'kanban' | 'table'>('kanban');

  const [tickets, setTickets] = useState<DeviceServiceTicket[]>([]);
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Modals
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState<DeviceServiceTicket | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isPrintSpkModalOpen, setIsPrintSpkModalOpen] = useState(false);
  const [printTicketTarget, setPrintTicketTarget] = useState<DeviceServiceTicket | null>(null);

  // New Ticket Form State
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [customerAddress, setCustomerAddress] = useState('');
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
  const [estimatedEta, setEstimatedEta] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Hardware Checklist State for New Ticket
  const [checklist, setChecklist] = useState<DeviceChecklistItem[]>(
    DEFAULT_CHECKLIST_ITEMS.map(item => ({ ...item, status: 'normal' }))
  );

  // Action on Selected Ticket Form State
  const [actionStatus, setActionStatus] = useState<DeviceServiceStatus>('InInspection');
  const [technicianNotes, setTechnicianNotes] = useState('');
  const [actionFinalCost, setActionFinalCost] = useState('');
  const [actionTechnician, setActionTechnician] = useState('');
  const [actionWarrantyDays, setActionWarrantyDays] = useState('30');
  const [actionEta, setActionEta] = useState('');

  // Add Item to Ticket Form State
  const [spareparts, setSpareparts] = useState<Product[]>([]);
  const [selectedProductId, setSelectedProductId] = useState('');
  const [customItemName, setCustomItemName] = useState('');
  const [customItemType, setCustomItemType] = useState<ServiceItemType>('SparePart');
  const [customItemQty, setCustomItemQty] = useState(1);
  const [customItemPrice, setCustomItemPrice] = useState(0);

  // Tab 2: Warranty Tracker State
  const [warrantySearchQuery, setWarrantySearchQuery] = useState('');
  const [warrantyResult, setWarrantyResult] = useState<ServiceWarrantyCheckResult | null>(null);
  const [isCheckingWarranty, setIsCheckingWarranty] = useState(false);

  // Tab 3: Technicians KPI Summary State
  const [technicianSummaries, setTechnicianSummaries] = useState<TechnicianSummaryItem[]>([]);
  const [isLoadingTechSummary, setIsLoadingTechSummary] = useState(false);

  useEffect(() => {
    fetchTickets();
    fetchSpareparts();
  }, []);

  useEffect(() => {
    if (activeTab === 'technicians') {
      fetchTechnicianSummaries();
    }
  }, [activeTab]);

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
      const res = await fetch('/api/v1/products?mode=Electronics');
      if (res.ok) {
        const prods: Product[] = await res.json();
        setSpareparts(prods);
      }
    } catch {}
  };

  const fetchTechnicianSummaries = async () => {
    try {
      setIsLoadingTechSummary(true);
      const res = await fetch('/api/v1/electronics/services/technicians-summary');
      if (res.ok) {
        const data = await res.json();
        setTechnicianSummaries(data);
      }
    } catch {
      useToastStore.getState().showToast('Gagal memuat rekap teknisi.', 'error');
    } finally {
      setIsLoadingTechSummary(false);
    }
  };

  const handleCheckWarranty = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!warrantySearchQuery.trim()) {
      useToastStore.getState().showToast('Masukkan No. SPK, IMEI, No. HP, atau Nama Pelanggan.', 'warning');
      return;
    }

    try {
      setIsCheckingWarranty(true);
      const res = await fetch(`/api/v1/electronics/services/warranty-check?query=${encodeURIComponent(warrantySearchQuery.trim())}`);
      if (res.ok) {
        const data: ServiceWarrantyCheckResult = await res.json();
        setWarrantyResult(data);
        if (!data.isFound) {
          useToastStore.getState().showToast('Data garansi servis tidak ditemukan.', 'info');
        }
      }
    } catch {
      useToastStore.getState().showToast('Gagal memeriksa garansi.', 'error');
    } finally {
      setIsCheckingWarranty(false);
    }
  };

  const handleSendWhatsApp = (ticket: DeviceServiceTicket) => {
    if (!ticket.customerPhone || ticket.customerPhone.trim().length < 8) {
      useToastStore.getState().showToast('Nomor WhatsApp pelanggan belum terdaftar pada tiket ini.', 'warning');
      return;
    }
    const msg = generateServiceWhatsAppMessage(ticket, storeInfo?.storeName || 'OmniPOS Service Center', storeInfo?.storePhone);
    openWhatsAppUrl(ticket.customerPhone, msg);
    useToastStore.getState().showToast(`Membuka WhatsApp untuk ${ticket.customerName}...`, 'info');
  };

  const handleCreateTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerName.trim() || !brandAndModel.trim() || !problemDescription.trim()) {
      useToastStore.getState().showToast('Lengkapi data wajib: Nama Pelanggan, Perangkat, dan Keluhan Kerusakan.', 'warning');
      return;
    }

    try {
      setIsSubmitting(true);
      const payload = {
        customerName: customerName.trim(),
        customerPhone: customerPhone.trim(),
        customerEmail: customerEmail.trim() || undefined,
        customerAddress: customerAddress.trim() || undefined,
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
        warrantyDaysGiven: parseInt(warrantyDays) || 30,
        deviceChecklistJson: JSON.stringify(checklist),
        estimatedCompletionDate: estimatedEta ? new Date(estimatedEta).toISOString() : undefined
      };

      const res = await fetch('/api/v1/electronics/services', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        const created: DeviceServiceTicket = await res.json();
        useToastStore.getState().showToast(`SPK Tanda Terima Servis ${created.ticketNumber} berhasil diterbitkan!`, 'success');
        setIsAddModalOpen(false);
        resetForm();
        fetchTickets();
        
        // Auto open print modal for convenience
        setPrintTicketTarget(created);
        setIsPrintSpkModalOpen(true);
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
    setCustomerEmail('');
    setCustomerAddress('');
    setBrandAndModel('');
    setImeiOrSerial('');
    setDeviceColor('');
    setPasscodeOrPattern('');
    setProblemDescription('');
    setPhysicalCondition('Lecet Pemakaian Wajar');
    setAccessoriesIncluded('Unit Only');
    setEstimatedCost('0');
    setDownPayment('0');
    setWarrantyDays('30');
    setEstimatedEta('');
    setChecklist(DEFAULT_CHECKLIST_ITEMS.map(item => ({ ...item, status: 'normal' })));
  };

  const openDetailModal = (t: DeviceServiceTicket) => {
    setSelectedTicket(t);
    setActionStatus(t.status);
    setTechnicianNotes(t.technicianNotes || '');
    setActionFinalCost(t.finalCost.toString());
    setActionTechnician(t.assignedTechnicianName || 'Teknisi Utama');
    setActionWarrantyDays((t.warrantyDaysGiven || 30).toString());
    setActionEta(t.estimatedCompletionDate ? new Date(t.estimatedCompletionDate).toISOString().slice(0, 16) : '');
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
          assignedTechnicianName: actionTechnician,
          warrantyDaysGiven: parseInt(actionWarrantyDays) || 30,
          estimatedCompletionDate: actionEta ? new Date(actionEta).toISOString() : undefined,
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
        useToastStore.getState().showToast('Item sparepart/jasa berhasil dialokasikan!', 'success');
        setSelectedTicket(updated);
        setActionFinalCost(updated.finalCost.toString());
        setSelectedProductId('');
        setCustomItemName('');
        setCustomItemQty(1);
        setCustomItemPrice(0);
        fetchTickets();
        fetchSpareparts();
      }
    } catch {
      useToastStore.getState().showToast('Gagal menambahkan item.', 'error');
    }
  };

  const handleDeleteItemFromTicket = async (itemId: string) => {
    if (!selectedTicket) return;
    if (!confirm('Hapus item ini dari tiket? Stok sparepart gudang akan otomatis dipulihkan.')) return;

    try {
      const res = await fetch(`/api/v1/electronics/services/${selectedTicket.id}/items/${itemId}`, {
        method: 'DELETE'
      });

      if (res.ok) {
        const updated = await res.json();
        useToastStore.getState().showToast('Item dihapus & stok inventori dipulihkan.', 'success');
        setSelectedTicket(updated);
        setActionFinalCost(updated.finalCost.toString());
        fetchTickets();
        fetchSpareparts();
      }
    } catch {
      useToastStore.getState().showToast('Gagal menghapus item.', 'error');
    }
  };

  const handleDeleteTicket = async (ticketId: string) => {
    if (!confirm('Yakin ingin menghapus SPK tiket servis ini? Tindakan ini tidak dapat dibatalkan.')) return;

    try {
      const res = await fetch(`/api/v1/electronics/services/${ticketId}`, {
        method: 'DELETE'
      });

      if (res.ok) {
        useToastStore.getState().showToast('Tiket servis berhasil dihapus.', 'success');
        setIsDetailModalOpen(false);
        fetchTickets();
      }
    } catch {
      useToastStore.getState().showToast('Gagal menghapus tiket.', 'error');
    }
  };

  const handleTransferToCart = (ticket: DeviceServiceTicket) => {
    const { setCustomer, addItem } = useCartStore.getState();

    // 1. Set Customer Info in POS Cart
    setCustomer({
      id: `service-cust-${Date.now()}`,
      name: ticket.customerName,
      phoneNumber: ticket.customerPhone,
      customerGroup: 'Pelanggan Servis & Reparasi',
      loyaltyPoints: 0,
      depositBalance: 0,
      totalReceivable: 0,
      creditLimit: 0
    });

    // 2. Add Service Settlement Item to POS Cart
    const settlementAmount = ticket.remainingBalance > 0 ? ticket.remainingBalance : ticket.finalCost;
    addItem({
      id: `srv-settlement-${ticket.id}`,
      sku: ticket.ticketNumber,
      barcode: ticket.ticketNumber,
      name: `Pelunasan Servis: ${ticket.brandAndModel} (#${ticket.ticketNumber})`,
      categoryId: 'cat-service-settlement',
      unit: 'Unit',
      buyPrice: 0,
      sellPrice: settlementAmount,
      currentStock: 999,
      minStockAlert: 1,
      trackStock: false,
      isKitchenItem: false,
      hasVariants: false,
      variants: []
    });

    useToastStore.getState().showToast(`Tiket #${ticket.ticketNumber} berhasil ditransfer ke Keranjang Kasir POS!`, 'success');
  };

  const handlePrintReceipt = (t: DeviceServiceTicket) => {
    setPrintTicketTarget(t);
    setIsPrintSpkModalOpen(true);
  };

  const isOverdue = (t: DeviceServiceTicket) => {
    if (!t.estimatedCompletionDate) return false;
    if (t.status === 'CompletedReadyForPickup' || t.status === 'PickedUpAndPaid' || t.status === 'Cancelled') return false;
    return new Date(t.estimatedCompletionDate).getTime() < Date.now();
  };

  const getStatusBadge = (status: DeviceServiceStatus) => {
    switch (status) {
      case 'Received':
        return <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-500/10 text-amber-600 border border-amber-500/20">Antrean Baru</span>;
      case 'InInspection':
        return <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-blue-500/10 text-blue-600 border border-blue-500/20">Pemeriksaan</span>;
      case 'WaitingForCustomerApproval':
        return <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-600/10 text-amber-700 border border-amber-600/20">Konfirmasi Biaya</span>;
      case 'WaitingForSpareParts':
        return <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-purple-500/10 text-purple-600 border border-purple-500/20">Menunggu Part</span>;
      case 'Repairing':
        return <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-indigo-500/10 text-indigo-600 border border-indigo-500/20">Pengerjaan</span>;
      case 'CompletedReadyForPickup':
        return <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-500/15 text-emerald-600 border border-emerald-500/30">Siap Diambil</span>;
      case 'PickedUpAndPaid':
        return <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-600 text-white shadow-xs">Selesai & Lunas</span>;
      case 'Cancelled':
        return <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-rose-500/10 text-rose-600 border border-rose-500/20">Batal / Retur</span>;
      default:
        return <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-subtle text-text-secondary">{status}</span>;
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

  // Kanban Columns Definition
  const kanbanColumns: { id: DeviceServiceStatus | 'WaitingPartsOrApproval'; title: string; badgeColor: string; statuses: DeviceServiceStatus[] }[] = [
    { id: 'Received', title: '📥 Antrean Masuk', badgeColor: 'bg-amber-500/10 text-amber-600 border-amber-500/20', statuses: ['Received'] },
    { id: 'InInspection', title: '🔍 Pemeriksaan & Diagnosa', badgeColor: 'bg-blue-500/10 text-blue-600 border-blue-500/20', statuses: ['InInspection'] },
    { id: 'WaitingPartsOrApproval', title: '⏳ Tunggu Persetujuan / Part', badgeColor: 'bg-purple-500/10 text-purple-600 border-purple-500/20', statuses: ['WaitingForCustomerApproval', 'WaitingForSpareParts'] },
    { id: 'Repairing', title: '⚙️ Proses Reparasi', badgeColor: 'bg-indigo-500/10 text-indigo-600 border-indigo-500/20', statuses: ['Repairing'] },
    { id: 'CompletedReadyForPickup', title: '✅ Siap Diambil', badgeColor: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/30', statuses: ['CompletedReadyForPickup'] },
    { id: 'PickedUpAndPaid', title: '🎉 Selesai & Lunas', badgeColor: 'bg-emerald-600 text-white', statuses: ['PickedUpAndPaid'] }
  ];

  return (
    <div className="flex-1 flex flex-col bg-app overflow-hidden select-none">
      {/* Top Header Bar */}
      <div className="p-4 bg-surface border-b border-border-subtle flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-bold">
            <Wrench className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-base font-bold text-text-primary flex items-center gap-2">
              {isServicesMode
                ? 'Pusat Antrean Layanan & SPK Jasa (Work Order)'
                : 'Pusat Servis & Bengkel Elektronik / HP / Komputer (Service Center)'}
            </h1>
            <p className="text-xs text-text-secondary">
              100% Offline • Manajemen SPK, Diagnosa Hardware, Alokasi Sparepart, Cek Garansi Toko & Rekap Jasa Teknisi
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {activeTab === 'workflow' && (
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
          )}

          <button
            onClick={() => setIsAddModalOpen(true)}
            className="px-3.5 py-2 bg-primary hover:bg-primary-hover text-primary-text rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all active:scale-95"
          >
            <Plus className="w-4 h-4" />
            <span>Terima Servis Baru [SPK]</span>
          </button>
        </div>
      </div>

      {/* Main 3 Navigation Tabs */}
      <div className="px-4 py-2 bg-surface border-b border-border-subtle flex items-center justify-between">
        <div className="flex gap-2">
          <button
            onClick={() => setActiveTab('workflow')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all ${
              activeTab === 'workflow'
                ? 'bg-primary text-primary-text shadow-xs'
                : 'text-text-secondary hover:text-text-primary hover:bg-subtle'
            }`}
          >
            <Layers className="w-4 h-4" />
            <span>📋 Antrean & Alur Servis ({tickets.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('warranty')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all ${
              activeTab === 'warranty'
                ? 'bg-primary text-primary-text shadow-xs'
                : 'text-text-secondary hover:text-text-primary hover:bg-subtle'
            }`}
          >
            <ShieldCheck className="w-4 h-4" />
            <span>🛡️ Cek Garansi Servis & Riwayat IMEI</span>
          </button>

          <button
            onClick={() => setActiveTab('technicians')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all ${
              activeTab === 'technicians'
                ? 'bg-primary text-primary-text shadow-xs'
                : 'text-text-secondary hover:text-text-primary hover:bg-subtle'
            }`}
          >
            <Award className="w-4 h-4" />
            <span>👨‍🔧 Kinerja Teknisi & Rekap Jasa</span>
          </button>
        </div>

        {/* View Mode Toggle for Workflow Tab */}
        {activeTab === 'workflow' && (
          <div className="flex items-center gap-1 bg-subtle p-0.5 rounded-lg border border-border-subtle text-xs">
            <button
              onClick={() => setViewMode('kanban')}
              className={`px-2.5 py-1 rounded-md font-bold flex items-center gap-1 transition-all ${
                viewMode === 'kanban'
                  ? 'bg-card text-primary shadow-xs border border-border-subtle'
                  : 'text-text-secondary hover:text-text-primary'
              }`}
            >
              <Kanban className="w-3.5 h-3.5" />
              <span>Kanban</span>
            </button>
            <button
              onClick={() => setViewMode('table')}
              className={`px-2.5 py-1 rounded-md font-bold flex items-center gap-1 transition-all ${
                viewMode === 'table'
                  ? 'bg-card text-primary shadow-xs border border-border-subtle'
                  : 'text-text-secondary hover:text-text-primary'
              }`}
            >
              <TableIcon className="w-3.5 h-3.5" />
              <span>Tabel</span>
            </button>
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: WORKFLOW & SERVICE LIFECYCLE (KANBAN & TABLE) */}
      {/* ========================================================================= */}
      {activeTab === 'workflow' && (
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Status Filter Badges (For Table Mode or Quick Filter) */}
          {viewMode === 'table' && (
            <div className="px-4 py-2 bg-surface border-b border-border-subtle flex gap-2 overflow-x-auto text-xs font-semibold">
              {[
                { id: 'ALL', label: `Semua (${tickets.length})` },
                { id: 'Received', label: `Antrean Baru (${tickets.filter(t => t.status === 'Received').length})` },
                { id: 'InInspection', label: `Pemeriksaan (${tickets.filter(t => t.status === 'InInspection').length})` },
                { id: 'WaitingForCustomerApproval', label: `Konfirmasi Biaya (${tickets.filter(t => t.status === 'WaitingForCustomerApproval').length})` },
                { id: 'WaitingForSpareParts', label: `Menunggu Part (${tickets.filter(t => t.status === 'WaitingForSpareParts').length})` },
                { id: 'Repairing', label: `Pengerjaan (${tickets.filter(t => t.status === 'Repairing').length})` },
                { id: 'CompletedReadyForPickup', label: `Siap Diambil (${tickets.filter(t => t.status === 'CompletedReadyForPickup').length})` },
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
          )}

          {/* Kanban Board View */}
          {viewMode === 'kanban' ? (
            <div className="flex-1 overflow-x-auto overflow-y-hidden p-4">
              <div className="flex gap-4 h-full min-w-max">
                {kanbanColumns.map(col => {
                  const columnTickets = filteredTickets.filter(t => col.statuses.includes(t.status));
                  return (
                    <div 
                      key={col.id} 
                      className="w-76 flex flex-col bg-subtle/70 rounded-2xl border border-border-subtle overflow-hidden"
                    >
                      {/* Column Header */}
                      <div className="p-3 bg-surface border-b border-border-subtle flex items-center justify-between">
                        <span className="font-bold text-xs text-text-primary">{col.title}</span>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-card border border-border-subtle text-text-secondary">
                          {columnTickets.length}
                        </span>
                      </div>

                      {/* Ticket Cards List */}
                      <div className="flex-1 overflow-y-auto p-2.5 space-y-2.5">
                        {columnTickets.length === 0 ? (
                          <div className="h-32 flex items-center justify-center text-[11px] text-text-muted italic border-2 border-dashed border-border-subtle/60 rounded-xl">
                            Tidak ada tiket
                          </div>
                        ) : (
                          columnTickets.map(t => {
                            const overdue = isOverdue(t);
                            return (
                              <div
                                key={t.id}
                                className={`bg-card p-3 rounded-xl border transition-all shadow-xs hover:shadow-md ${
                                  overdue 
                                    ? 'border-rose-500/50 bg-rose-500/5' 
                                    : 'border-border-subtle hover:border-primary/40'
                                }`}
                              >
                                {/* Ticket Number & Overdue Alert */}
                                <div className="flex items-center justify-between mb-1.5">
                                  <span className="font-mono font-bold text-xs text-primary">
                                    {t.ticketNumber}
                                  </span>
                                  {overdue && (
                                    <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-rose-500/15 text-rose-600 border border-rose-500/30 flex items-center gap-0.5">
                                      <AlertTriangle className="w-2.5 h-2.5" /> Terlambat
                                    </span>
                                  )}
                                </div>

                                {/* Customer & Device Info */}
                                <div className="space-y-1 mb-2.5">
                                  <div className="font-bold text-text-primary text-xs flex items-center gap-1.5">
                                    <Smartphone className="w-3.5 h-3.5 text-primary shrink-0" />
                                    <span className="truncate">{t.brandAndModel}</span>
                                  </div>
                                  <div className="text-[11px] text-text-secondary flex items-center gap-1">
                                    <User className="w-3 h-3 text-text-muted shrink-0" />
                                    <span className="truncate font-medium">{t.customerName}</span>
                                    <span className="font-mono text-[10px] text-text-muted">({t.customerPhone})</span>
                                  </div>
                                  <div className="text-[10px] text-text-muted line-clamp-2 italic bg-subtle p-1.5 rounded-lg border border-border-subtle">
                                    "{t.problemDescription}"
                                  </div>
                                </div>

                                {/* Technician & ETA */}
                                <div className="pt-2 border-t border-border-subtle/60 flex items-center justify-between text-[10px] text-text-secondary mb-2">
                                  <span>Teknisi: <strong>{t.assignedTechnicianName || '-'}</strong></span>
                                  {t.estimatedCompletionDate && (
                                    <span className={`font-medium ${overdue ? 'text-rose-600 font-bold' : ''}`}>
                                      ETA: {new Date(t.estimatedCompletionDate).toLocaleDateString('id-ID', { day: '2-digit', month: 'short' })}
                                    </span>
                                  )}
                                </div>

                                {/* Financial Summary & Action Buttons */}
                                <div className="pt-2 border-t border-border-subtle flex items-center justify-between">
                                  <div className="font-mono">
                                    <div className="text-[11px] font-bold text-text-primary">
                                      Rp {t.finalCost.toLocaleString('id-ID')}
                                    </div>
                                    {t.remainingBalance > 0 && t.status !== 'PickedUpAndPaid' && (
                                      <div className="text-[9px] font-bold text-rose-500">
                                        Sisa: Rp {t.remainingBalance.toLocaleString('id-ID')}
                                      </div>
                                    )}
                                  </div>

                                  <div className="flex items-center gap-1">
                                    <button
                                      onClick={() => handleSendWhatsApp(t)}
                                      title="Kirim Update WA"
                                      className="p-1 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 border border-emerald-500/20 transition-colors"
                                    >
                                      <MessageSquare className="w-3.5 h-3.5" />
                                    </button>
                                    <button
                                      onClick={() => handlePrintReceipt(t)}
                                      title="Cetak SPK"
                                      className="p-1 rounded-lg bg-subtle hover:bg-card-hover border border-border-subtle text-text-secondary transition-colors"
                                    >
                                      <Printer className="w-3.5 h-3.5 text-primary" />
                                    </button>
                                    {t.status === 'CompletedReadyForPickup' && t.remainingBalance > 0 && (
                                      <button
                                        onClick={() => handleTransferToCart(t)}
                                        title="Transfer ke Kasir POS untuk Pelunasan"
                                        className="p-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white transition-colors"
                                      >
                                        <ShoppingCart className="w-3.5 h-3.5" />
                                      </button>
                                    )}
                                    <button
                                      onClick={() => openDetailModal(t)}
                                      className="px-2 py-1 rounded-lg bg-primary hover:bg-primary-hover text-primary-text font-bold text-[10px] transition-all shadow-xs"
                                    >
                                      Kelola
                                    </button>
                                  </div>
                                </div>
                              </div>
                            );
                          })
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            /* Table View */
            <div className="flex-1 overflow-y-auto p-4">
              <div className="bg-card border border-border-subtle rounded-xl overflow-hidden shadow-sm">
                <table className="w-full text-left text-xs">
                  <thead className="bg-subtle text-text-secondary font-semibold border-b border-border-subtle">
                    <tr>
                      <th className="p-3">No. SPK & Waktu</th>
                      <th className="p-3">Pelanggan</th>
                      <th className="p-3">Perangkat & IMEI</th>
                      <th className="p-3">Keluhan Kerusakan</th>
                      <th className="p-3">Teknisi & ETA</th>
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
                      filteredTickets.map(t => {
                        const overdue = isOverdue(t);
                        return (
                          <tr key={t.id} className={`hover:bg-card-hover/50 transition-colors ${overdue ? 'bg-rose-500/5' : ''}`}>
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
                            <td className="p-3 text-text-secondary">
                              <div className="font-medium text-text-primary">{t.assignedTechnicianName || '-'}</div>
                              {t.estimatedCompletionDate && (
                                <div className={`text-[10px] ${overdue ? 'text-rose-600 font-bold flex items-center gap-0.5' : 'text-text-muted'}`}>
                                  {overdue && <AlertTriangle className="w-2.5 h-2.5" />}
                                  ETA: {new Date(t.estimatedCompletionDate).toLocaleDateString('id-ID')}
                                </div>
                              )}
                            </td>
                            <td className="p-3 text-right font-mono tabular-nums">
                              <div className="font-bold text-text-primary">Rp {t.finalCost.toLocaleString('id-ID')}</div>
                              <div className="text-[10px] text-text-muted">DP: Rp {t.downPayment.toLocaleString('id-ID')}</div>
                              {t.remainingBalance > 0 && t.status !== 'PickedUpAndPaid' && (
                                <div className="text-[10px] font-bold text-rose-500">Sisa: Rp {t.remainingBalance.toLocaleString('id-ID')}</div>
                              )}
                            </td>
                            <td className="p-3 text-center">
                              {getStatusBadge(t.status)}
                            </td>
                            <td className="p-3 text-right">
                              <div className="flex items-center justify-end gap-1.5">
                                <button
                                  onClick={() => handleSendWhatsApp(t)}
                                  title="Kirim Update WA"
                                  className="p-1.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 border border-emerald-500/30 transition-colors"
                                >
                                  <MessageSquare className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  onClick={() => handlePrintReceipt(t)}
                                  title="Cetak SPK"
                                  className="p-1.5 rounded-lg bg-subtle hover:bg-card-hover border border-border-subtle text-text-secondary transition-colors"
                                >
                                  <Printer className="w-3.5 h-3.5 text-primary" />
                                </button>
                                {t.status === 'CompletedReadyForPickup' && t.remainingBalance > 0 && (
                                  <button
                                    onClick={() => handleTransferToCart(t)}
                                    title="Transfer ke Kasir POS untuk Pelunasan"
                                    className="p-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white transition-colors"
                                  >
                                    <ShoppingCart className="w-3.5 h-3.5" />
                                  </button>
                                )}
                                <button
                                  onClick={() => openDetailModal(t)}
                                  className="px-2.5 py-1 rounded-lg bg-primary/10 hover:bg-primary/20 border border-primary/30 text-[11px] font-bold text-primary transition-colors"
                                >
                                  Kelola
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: WARRANTY TRACKER & IMEI SEARCH */}
      {/* ========================================================================= */}
      {activeTab === 'warranty' && (
        <div className="flex-1 overflow-y-auto p-6 flex flex-col items-center">
          <div className="w-full max-w-3xl space-y-6">
            {/* Search Box */}
            <div className="bg-card border border-border-subtle rounded-2xl p-6 shadow-sm space-y-4 text-center">
              <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 text-indigo-600 flex items-center justify-center mx-auto">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-base font-bold text-text-primary">
                  Pusat Verifikasi Garansi Servis & Riwayat IMEI / No. SPK
                </h2>
                <p className="text-xs text-text-secondary mt-1">
                  Cek masa aktif garansi reparasi toko berdasarkan No. SPK, IMEI, No. HP, atau Nama Pelanggan (100% Offline).
                </p>
              </div>

              <form onSubmit={handleCheckWarranty} className="flex gap-2 max-w-xl mx-auto">
                <div className="relative flex-1">
                  <Search className="w-4 h-4 text-text-muted absolute left-3 top-3" />
                  <input
                    type="text"
                    value={warrantySearchQuery}
                    onChange={(e) => setWarrantySearchQuery(e.target.value)}
                    placeholder="Masukkan No. SPK (SRV-...), IMEI (35...), atau No. HP..."
                    className="w-full pl-9 pr-3 py-2.5 bg-subtle border border-border-subtle rounded-xl text-xs text-text-primary focus:outline-none focus:border-primary font-mono font-semibold"
                  />
                </div>
                <button
                  type="submit"
                  disabled={isCheckingWarranty}
                  className="px-5 py-2.5 bg-primary hover:bg-primary-hover text-primary-text font-bold text-xs rounded-xl shadow-md transition-all active:scale-95 disabled:opacity-50 flex items-center gap-1.5"
                >
                  <Search className="w-4 h-4" />
                  <span>{isCheckingWarranty ? 'Mengecek...' : 'Cari Garansi'}</span>
                </button>
              </form>
            </div>

            {/* Warranty Result Card */}
            {warrantyResult && warrantyResult.isFound && warrantyResult.ticket && (
              <div className="bg-card border border-border-subtle rounded-2xl p-6 shadow-md space-y-5">
                {/* Status Header Badge */}
                <div className="flex items-center justify-between pb-4 border-b border-border-subtle">
                  <div>
                    <span className="font-mono text-xs font-bold text-text-muted">HASIL PELACAKAN GARANSI:</span>
                    <h3 className="text-lg font-black text-text-primary mt-0.5">
                      {warrantyResult.ticket.brandAndModel}
                    </h3>
                  </div>

                  <div>
                    {warrantyResult.isWarrantyActive ? (
                      <div className="px-4 py-2 bg-emerald-500/15 border border-emerald-500/30 rounded-xl text-emerald-600 font-bold text-xs flex items-center gap-2">
                        <CheckCircle2 className="w-5 h-5" />
                        <div>
                          <div>GARANSI TOKO AKTIF</div>
                          <div className="text-[10px] font-normal font-mono">Sisa {warrantyResult.remainingWarrantyDays} Hari Lagi</div>
                        </div>
                      </div>
                    ) : (
                      <div className="px-4 py-2 bg-rose-500/15 border border-rose-500/30 rounded-xl text-rose-600 font-bold text-xs flex items-center gap-2">
                        <AlertCircle className="w-5 h-5" />
                        <div>
                          <div>GARANSI HABIS / KEDALUWARSA</div>
                          <div className="text-[10px] font-normal">Masa garansi {warrantyResult.ticket.warrantyDaysGiven} hari telah berakhir</div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Details Grid */}
                <div className="grid grid-cols-2 gap-4 text-xs">
                  <div className="p-3 bg-subtle rounded-xl border border-border-subtle space-y-1.5">
                    <span className="font-bold text-indigo-700 text-[10px] uppercase block">Informasi Tiket & Pelanggan:</span>
                    <div><span className="text-text-muted">No. SPK:</span> <strong className="font-mono">{warrantyResult.ticket.ticketNumber}</strong></div>
                    <div><span className="text-text-muted">Pelanggan:</span> <strong>{warrantyResult.ticket.customerName}</strong></div>
                    <div><span className="text-text-muted">No. HP/WA:</span> <span className="font-mono">{warrantyResult.ticket.customerPhone}</span></div>
                    <div><span className="text-text-muted">Teknisi:</span> <strong>{warrantyResult.ticket.assignedTechnicianName || '-'}</strong></div>
                  </div>

                  <div className="p-3 bg-subtle rounded-xl border border-border-subtle space-y-1.5">
                    <span className="font-bold text-indigo-700 text-[10px] uppercase block">Riwayat Pengerjaan & Waktu:</span>
                    <div><span className="text-text-muted">Tgl Masuk:</span> {new Date(warrantyResult.ticket.receivedDate).toLocaleDateString('id-ID')}</div>
                    <div><span className="text-text-muted">Tgl Selesai / Diambil:</span> {warrantyResult.ticket.completedDate ? new Date(warrantyResult.ticket.completedDate).toLocaleDateString('id-ID') : '-'}</div>
                    <div><span className="text-text-muted">Durasi Garansi:</span> <strong>{warrantyResult.ticket.warrantyDaysGiven} Hari</strong></div>
                    {warrantyResult.warrantyExpiryDate && (
                      <div><span className="text-text-muted">Kedaluwarsa Pada:</span> <strong className="font-mono text-primary">{new Date(warrantyResult.warrantyExpiryDate).toLocaleDateString('id-ID')}</strong></div>
                    )}
                  </div>
                </div>

                {/* Replaced Parts */}
                {warrantyResult.ticket.items && warrantyResult.ticket.items.length > 0 && (
                  <div className="p-3 bg-subtle rounded-xl border border-border-subtle space-y-2 text-xs">
                    <span className="font-bold text-text-primary text-[11px] block">Suku Cadang yang Diganti / Dikerjakan:</span>
                    <div className="space-y-1">
                      {warrantyResult.ticket.items.map((it, idx) => (
                        <div key={idx} className="flex justify-between font-mono bg-card p-2 rounded-lg border border-border-subtle">
                          <span className="font-sans font-medium text-text-primary">• {it.name} (x{it.quantity})</span>
                          <span>Rp {(it.totalPrice || 0).toLocaleString('id-ID')}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="pt-2 flex justify-end gap-2">
                  <button
                    onClick={() => handleSendWhatsApp(warrantyResult.ticket!)}
                    className="px-4 py-2 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 border border-emerald-500/30 rounded-xl font-bold text-xs flex items-center gap-1.5"
                  >
                    <MessageSquare className="w-4 h-4" />
                    <span>Kirim Bukti Garansi via WA</span>
                  </button>
                  <button
                    onClick={() => handlePrintReceipt(warrantyResult.ticket!)}
                    className="px-4 py-2 bg-primary hover:bg-primary-hover text-primary-text rounded-xl font-bold text-xs flex items-center gap-1.5 shadow-md"
                  >
                    <Printer className="w-4 h-4" />
                    <span>Cetak Ulang SPK & Garansi</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: TECHNICIANS KPI & LABOR REPORT */}
      {/* ========================================================================= */}
      {activeTab === 'technicians' && (
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Summary Stat Cards */}
          <div className="grid grid-cols-4 gap-4">
            <div className="bg-card p-4 rounded-2xl border border-border-subtle shadow-xs">
              <div className="flex items-center justify-between text-text-muted mb-2">
                <span className="text-xs font-bold uppercase">Total SPK Masuk</span>
                <Wrench className="w-4 h-4 text-primary" />
              </div>
              <div className="text-2xl font-black text-text-primary">
                {tickets.length} <span className="text-xs font-normal text-text-muted">unit</span>
              </div>
            </div>

            <div className="bg-card p-4 rounded-2xl border border-border-subtle shadow-xs">
              <div className="flex items-center justify-between text-text-muted mb-2">
                <span className="text-xs font-bold uppercase">Aktif Dikerjakan</span>
                <Clock className="w-4 h-4 text-amber-500" />
              </div>
              <div className="text-2xl font-black text-amber-600">
                {tickets.filter(t => t.status !== 'CompletedReadyForPickup' && t.status !== 'PickedUpAndPaid' && t.status !== 'Cancelled').length} <span className="text-xs font-normal text-text-muted">antrean</span>
              </div>
            </div>

            <div className="bg-card p-4 rounded-2xl border border-border-subtle shadow-xs">
              <div className="flex items-center justify-between text-text-muted mb-2">
                <span className="text-xs font-bold uppercase">Selesai Diperbaiki</span>
                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
              </div>
              <div className="text-2xl font-black text-emerald-600">
                {tickets.filter(t => t.status === 'CompletedReadyForPickup' || t.status === 'PickedUpAndPaid').length} <span className="text-xs font-normal text-text-muted">unit</span>
              </div>
            </div>

            <div className="bg-card p-4 rounded-2xl border border-border-subtle shadow-xs">
              <div className="flex items-center justify-between text-text-muted mb-2">
                <span className="text-xs font-bold uppercase">Total Pendapatan Jasa</span>
                <TrendingUp className="w-4 h-4 text-indigo-500" />
              </div>
              <div className="text-xl font-black text-indigo-600 font-mono">
                Rp {technicianSummaries.reduce((acc, t) => acc + t.totalLaborEarned, 0).toLocaleString('id-ID')}
              </div>
            </div>
          </div>

          {/* Technicians Performance Table */}
          <div className="bg-card border border-border-subtle rounded-2xl overflow-hidden shadow-sm">
            <div className="p-4 bg-surface border-b border-border-subtle flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-text-primary">
                  Rekapitulasi Kinerja Teknisi & Hasil Jasa Servis
                </h3>
                <p className="text-[11px] text-text-secondary">
                  Distribusi beban kerja teknisi dan total komisi/omzet biaya jasa pengerjaan
                </p>
              </div>
              <button
                onClick={fetchTechnicianSummaries}
                className="p-2 bg-subtle hover:bg-card-hover border border-border-subtle rounded-xl text-text-secondary hover:text-text-primary transition-colors"
                title="Muat Ulang"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
            </div>

            <table className="w-full text-left text-xs">
              <thead className="bg-subtle text-text-secondary font-semibold border-b border-border-subtle">
                <tr>
                  <th className="p-3">Nama Teknisi</th>
                  <th className="p-3 text-center">Total SPK Ditugaskan</th>
                  <th className="p-3 text-center">Sedang Dikerjakan</th>
                  <th className="p-3 text-center">Selesai Diperbaiki</th>
                  <th className="p-3 text-right">Total Pendapatan Jasa</th>
                  <th className="p-3 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-subtle/50">
                {isLoadingTechSummary ? (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-text-muted">Memuat data rekap kinerja teknisi...</td>
                  </tr>
                ) : technicianSummaries.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-text-muted">Belum ada penugasan teknisi pada tiket servis.</td>
                  </tr>
                ) : (
                  technicianSummaries.map((tech, idx) => (
                    <tr key={idx} className="hover:bg-card-hover/50 transition-colors">
                      <td className="p-3 font-bold text-text-primary flex items-center gap-2">
                        <div className="w-7 h-7 rounded-lg bg-primary/10 text-primary flex items-center justify-center text-xs font-black">
                          {tech.technicianName.charAt(0).toUpperCase()}
                        </div>
                        <span>{tech.technicianName}</span>
                      </td>
                      <td className="p-3 text-center font-bold">{tech.totalAssignedTickets}</td>
                      <td className="p-3 text-center">
                        <span className="px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-600 font-bold font-mono">
                          {tech.activeTickets}
                        </span>
                      </td>
                      <td className="p-3 text-center">
                        <span className="px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-600 font-bold font-mono">
                          {tech.completedTickets}
                        </span>
                      </td>
                      <td className="p-3 text-right font-mono font-bold text-indigo-600">
                        Rp {tech.totalLaborEarned.toLocaleString('id-ID')}
                      </td>
                      <td className="p-3 text-right">
                        <button
                          onClick={() => {
                            setSearchQuery(tech.technicianName);
                            setActiveTab('workflow');
                            setViewMode('table');
                          }}
                          className="px-2.5 py-1 rounded-lg bg-subtle hover:bg-card-hover border border-border-subtle text-[11px] font-semibold text-text-primary"
                        >
                          Lihat Antrean
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: INPUT TIKET SERVIS BARU (SPK) */}
      {/* ========================================================================= */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-2xl bg-card border border-border-strong rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
            <div className="p-4 bg-surface border-b border-border-subtle flex items-center justify-between">
              <h3 className="font-bold text-sm text-text-primary flex items-center gap-2">
                <Wrench className="w-4 h-4 text-primary" />
                Penerimaan Servis Perangkat Baru (Terbitkan SPK)
              </h3>
              <button 
                onClick={() => setIsAddModalOpen(false)} 
                className="p-1.5 rounded-lg text-text-muted hover:text-text-primary hover:bg-subtle transition-colors"
                title="Tutup Modal"
              >
                <X className="w-5 h-5" />
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
                      className="w-full px-3 py-2 bg-card border border-border-subtle rounded-lg text-text-primary font-semibold"
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
                      className="w-full px-3 py-2 bg-card border border-border-subtle rounded-lg text-text-primary font-mono font-semibold"
                    />
                  </div>
                </div>
              </div>

              {/* Section 2: Device Info */}
              <div className="p-3.5 bg-subtle rounded-xl border border-border-subtle space-y-3">
                <h4 className="font-bold text-text-primary flex items-center gap-1.5">
                  <Smartphone className="w-3.5 h-3.5 text-primary" /> Spesifikasi Perangkat & Kelengkapan
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
                      <option value="Audio/TV">Audio & TV / Elektronik</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-text-muted mb-1">Merek & Tipe Model *</label>
                    <input
                      type="text"
                      required
                      value={brandAndModel}
                      onChange={(e) => setBrandAndModel(e.target.value)}
                      placeholder="iPhone 13 128GB / Samsung S23..."
                      className="w-full px-3 py-2 bg-card border border-border-subtle rounded-lg text-text-primary font-semibold"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-text-muted mb-1">IMEI / Serial Number</label>
                    <input
                      type="text"
                      value={imeiOrSerial}
                      onChange={(e) => setImeiOrSerial(e.target.value)}
                      placeholder="35xxxxxxxxxxxxx"
                      className="w-full px-3 py-2 bg-card border border-border-subtle rounded-lg text-text-primary font-mono"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="block text-[10px] font-bold text-text-muted mb-1">Warna Unit</label>
                    <input
                      type="text"
                      value={deviceColor}
                      onChange={(e) => setDeviceColor(e.target.value)}
                      placeholder="Hitam / Titanium / Silver..."
                      className="w-full px-3 py-2 bg-card border border-border-subtle rounded-lg text-text-primary"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-text-muted mb-1">Pola / PIN Layar</label>
                    <input
                      type="text"
                      value={passcodeOrPattern}
                      onChange={(e) => setPasscodeOrPattern(e.target.value)}
                      placeholder="123456 / Pola L / Tanpa Sandi"
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
                    placeholder="Contoh: Layar sentuh tidak respon, layar bergaris setelah jatuh, baterai cepat habis..."
                    className="w-full p-2.5 bg-card border border-border-subtle rounded-lg text-text-primary font-medium"
                  />
                </div>
              </div>

              {/* Section 3: Hardware Checklist */}
              <div className="p-3.5 bg-subtle rounded-xl border border-border-subtle space-y-2">
                <h4 className="font-bold text-text-primary flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <ShieldCheck className="w-3.5 h-3.5 text-primary" /> Checklist Fisik & Hardware Awal
                  </span>
                  <span className="text-[10px] text-text-muted font-normal">Klik untuk ubah kondisi</span>
                </h4>
                <div className="grid grid-cols-2 gap-2">
                  {checklist.map((item, idx) => (
                    <div 
                      key={item.key}
                      className="flex items-center justify-between p-2 bg-card rounded-lg border border-border-subtle"
                    >
                      <span className="font-medium text-[11px] text-text-primary">{item.label}</span>
                      <div className="flex gap-1">
                        <button
                          type="button"
                          onClick={() => {
                            const copy = [...checklist];
                            copy[idx].status = 'normal';
                            setChecklist(copy);
                          }}
                          className={`px-2 py-0.5 rounded text-[10px] font-bold transition-all ${
                            item.status === 'normal'
                              ? 'bg-emerald-500 text-white'
                              : 'bg-subtle text-text-muted hover:text-text-primary'
                          }`}
                        >
                          Normal
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            const copy = [...checklist];
                            copy[idx].status = 'faulty';
                            setChecklist(copy);
                          }}
                          className={`px-2 py-0.5 rounded text-[10px] font-bold transition-all ${
                            item.status === 'faulty'
                              ? 'bg-rose-500 text-white'
                              : 'bg-subtle text-text-muted hover:text-text-primary'
                          }`}
                        >
                          Rusak
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            const copy = [...checklist];
                            copy[idx].status = 'not_tested';
                            setChecklist(copy);
                          }}
                          className={`px-2 py-0.5 rounded text-[10px] font-bold transition-all ${
                            item.status === 'not_tested'
                              ? 'bg-slate-500 text-white'
                              : 'bg-subtle text-text-muted hover:text-text-primary'
                          }`}
                        >
                          N/A
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Section 4: Cost, DP, ETA & Technician */}
              <div className="p-3.5 bg-subtle rounded-xl border border-border-subtle space-y-3">
                <h4 className="font-bold text-text-primary flex items-center gap-1.5">
                  <DollarSign className="w-3.5 h-3.5 text-primary" /> Estimasi Biaya, Target Selesai (ETA) & Penugasan
                </h4>
                <div className="grid grid-cols-4 gap-2">
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
                    <label className="block text-[10px] font-bold text-text-muted mb-1">Uang Muka Diterima (DP)</label>
                    <input
                      type="number"
                      value={downPayment}
                      onChange={(e) => setDownPayment(e.target.value)}
                      className="w-full px-3 py-2 bg-card border border-border-subtle rounded-lg text-text-primary font-mono font-bold text-primary"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-text-muted mb-1">Teknisi Penanggung Jawab</label>
                    <input
                      type="text"
                      value={assignedTechnician}
                      onChange={(e) => setAssignedTechnician(e.target.value)}
                      placeholder="Nama Teknisi"
                      className="w-full px-3 py-2 bg-card border border-border-subtle rounded-lg text-text-primary font-semibold"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-text-muted mb-1">Garansi Servis (Hari)</label>
                    <input
                      type="number"
                      value={warrantyDays}
                      onChange={(e) => setWarrantyDays(e.target.value)}
                      className="w-full px-3 py-2 bg-card border border-border-subtle rounded-lg text-text-primary font-mono"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-text-muted mb-1">Target Estimasi Selesai (ETA Tanggal & Jam)</label>
                  <input
                    type="datetime-local"
                    value={estimatedEta}
                    onChange={(e) => setEstimatedEta(e.target.value)}
                    className="w-full px-3 py-2 bg-card border border-border-subtle rounded-lg text-text-primary font-semibold"
                  />
                </div>
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 bg-subtle hover:bg-card-hover border border-border-subtle rounded-xl text-text-secondary font-semibold"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 bg-primary hover:bg-primary-hover text-primary-text font-bold rounded-xl shadow-md disabled:opacity-50 flex items-center gap-1.5"
                >
                  <FileText className="w-4 h-4" />
                  <span>{isSubmitting ? 'Menerbitkan...' : 'Terbitkan SPK Servis'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: DETAIL & PENGELOLAAN SERVIS TEKNISI */}
      {/* ========================================================================= */}
      {isDetailModalOpen && selectedTicket && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-3xl bg-card border border-border-strong rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
            {/* Header */}
            <div className="p-4 bg-surface border-b border-border-subtle flex items-center justify-between">
              <div>
                <h3 className="font-bold text-sm text-text-primary flex items-center gap-2">
                  <Wrench className="w-4 h-4 text-primary" />
                  Pengelolaan Servis: {selectedTicket.ticketNumber} ({selectedTicket.brandAndModel})
                </h3>
                <p className="text-[11px] text-text-secondary">
                  Pemilik: <strong>{selectedTicket.customerName}</strong> ({selectedTicket.customerPhone}) • Status: {getStatusBadge(selectedTicket.status)}
                </p>
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => handleSendWhatsApp(selectedTicket)}
                  className="px-3 py-1.5 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 text-emerald-600 rounded-lg font-bold flex items-center gap-1.5 text-xs transition-colors"
                >
                  <MessageSquare className="w-3.5 h-3.5" />
                  <span>Kirim WA</span>
                </button>
                <button
                  onClick={() => handlePrintReceipt(selectedTicket)}
                  className="px-3 py-1.5 bg-subtle hover:bg-card-hover border border-border-subtle rounded-lg font-semibold text-text-primary flex items-center gap-1 text-xs"
                >
                  <Printer className="w-3.5 h-3.5 text-primary" />
                  <span>Cetak SPK</span>
                </button>
                {selectedTicket.status === 'CompletedReadyForPickup' && selectedTicket.remainingBalance > 0 && (
                  <button
                    onClick={() => handleTransferToCart(selectedTicket)}
                    className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold flex items-center gap-1 text-xs shadow-sm"
                  >
                    <ShoppingCart className="w-3.5 h-3.5" />
                    <span>Transfer ke Kasir POS</span>
                  </button>
                )}
                <button 
                  onClick={() => setIsDetailModalOpen(false)} 
                  className="p-1.5 rounded-lg text-text-muted hover:text-text-primary hover:bg-subtle transition-colors ml-1"
                  title="Tutup Modal"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="p-5 space-y-4 overflow-y-auto text-xs flex-1">
              {/* Problem summary card */}
              <div className="p-3 bg-subtle rounded-xl border border-border-subtle grid grid-cols-3 gap-3">
                <div>
                  <span className="text-[10px] text-text-muted font-bold block">Keluhan Pelanggan:</span>
                  <p className="font-semibold text-text-primary">{selectedTicket.problemDescription}</p>
                  {selectedTicket.imeiOrSerial && <p className="text-[10px] font-mono text-text-muted mt-0.5">IMEI: {selectedTicket.imeiOrSerial}</p>}
                </div>
                <div>
                  <span className="text-[10px] text-text-muted font-bold block">Kondisi & Kelengkapan:</span>
                  <p className="text-text-secondary">{selectedTicket.physicalCondition} ({selectedTicket.accessoriesIncluded})</p>
                  {selectedTicket.passcodeOrPattern && <p className="text-primary font-mono text-[11px] font-bold">PIN/Pola: {selectedTicket.passcodeOrPattern}</p>}
                </div>
                <div className="text-right">
                  <span className="text-[10px] text-text-muted font-bold block">Total Biaya / Sisa:</span>
                  <p className="font-bold font-mono text-primary text-sm">Rp {selectedTicket.finalCost.toLocaleString('id-ID')}</p>
                  <p className="font-mono text-rose-500 font-bold text-[11px]">Sisa: Rp {selectedTicket.remainingBalance.toLocaleString('id-ID')}</p>
                </div>
              </div>

              {/* Rincian Sparepart & Jasa */}
              <div className="p-3 bg-surface rounded-xl border border-border-subtle space-y-3">
                <h4 className="font-bold text-text-primary flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <Package className="w-3.5 h-3.5 text-primary" /> Alokasi Sparepart & Biaya Jasa Teknisi
                  </span>
                  <span className="text-[10px] text-text-muted">Sparepart otomatis memotong stok gudang inventori</span>
                </h4>
                
                <table className="w-full text-left text-xs">
                  <thead className="bg-subtle text-text-secondary font-semibold border-b border-border-subtle">
                    <tr>
                      <th className="p-2">Item / Suku Cadang</th>
                      <th className="p-2">Tipe</th>
                      <th className="p-2 text-center">Qty</th>
                      <th className="p-2 text-right">Harga Satuan</th>
                      <th className="p-2 text-right">Subtotal</th>
                      <th className="p-2 text-center">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border-subtle/50 font-mono">
                    {selectedTicket.items.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="p-4 text-center text-text-muted font-sans italic">
                          Belum ada sparepart / jasa dialokasikan ke tiket ini.
                        </td>
                      </tr>
                    ) : (
                      selectedTicket.items.map((it) => (
                        <tr key={it.id || it.name}>
                          <td className="p-2 font-sans font-semibold text-text-primary">{it.name}</td>
                          <td className="p-2 font-sans">
                            <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${it.itemType === 'SparePart' ? 'bg-primary/10 text-primary' : 'bg-purple-500/10 text-purple-600'}`}>
                              {it.itemType === 'SparePart' ? 'Sparepart' : 'Jasa'}
                            </span>
                          </td>
                          <td className="p-2 text-center">{it.quantity}</td>
                          <td className="p-2 text-right">Rp {it.unitPrice.toLocaleString('id-ID')}</td>
                          <td className="p-2 text-right font-bold text-text-primary">Rp {it.totalPrice.toLocaleString('id-ID')}</td>
                          <td className="p-2 text-center font-sans">
                            {it.id && (
                              <button
                                onClick={() => handleDeleteItemFromTicket(it.id!)}
                                className="p-1 text-rose-500 hover:text-rose-700 hover:bg-rose-500/10 rounded-md"
                                title="Hapus item & kembalikan stok"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>

                {/* Form Tambah Item */}
                <form onSubmit={handleAddItemToTicket} className="p-3 bg-subtle rounded-xl border border-border-subtle space-y-2">
                  <span className="font-bold text-[11px] text-text-primary block">Tambah Komponen dari Inventori Toko / Jasa:</span>
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
                            setCustomItemType('SparePart');
                          }
                        }}
                        className="w-full px-2.5 py-1.5 bg-card border border-border-subtle rounded-lg text-text-primary font-semibold"
                      >
                        <option value="">-- Pilih dari Stok Inventori Toko --</option>
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
                        placeholder="Atau nama jasa/item..."
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
                  <div className="flex justify-between items-center pt-1">
                    <div className="flex gap-2">
                      <label className="flex items-center gap-1 text-[11px] font-semibold text-text-secondary cursor-pointer">
                        <input
                          type="radio"
                          name="itemTypeOption"
                          checked={customItemType === 'SparePart'}
                          onChange={() => setCustomItemType('SparePart')}
                        />
                        <span>Sparepart</span>
                      </label>
                      <label className="flex items-center gap-1 text-[11px] font-semibold text-text-secondary cursor-pointer">
                        <input
                          type="radio"
                          name="itemTypeOption"
                          checked={customItemType === 'LaborCost'}
                          onChange={() => setCustomItemType('LaborCost')}
                        />
                        <span>Jasa Teknisi</span>
                      </label>
                    </div>
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
                  <Edit3 className="w-3.5 h-3.5 text-primary" /> Perbarui Status Servis & Diagnosa Teknisi
                </h4>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[10px] font-bold text-text-muted mb-1">Status Progres Servis</label>
                    <select
                      value={actionStatus}
                      onChange={(e) => setActionStatus(e.target.value as DeviceServiceStatus)}
                      className="w-full px-3 py-2 bg-card border border-border-subtle rounded-lg text-text-primary font-bold"
                    >
                      <option value="Received">Antrean Baru (Received)</option>
                      <option value="InInspection">Sedang Dicek Teknisi (In Inspection)</option>
                      <option value="WaitingForCustomerApproval">Menunggu Konfirmasi Biaya Pelanggan</option>
                      <option value="WaitingForSpareParts">Menunggu Pengiriman Sparepart</option>
                      <option value="Repairing">Sedang Dikerjakan / Reparasi (Repairing)</option>
                      <option value="CompletedReadyForPickup">Selesai Diperbaiki (Siap Diambil)</option>
                      <option value="PickedUpAndPaid">Sudah Diambil & Lunas (Closed)</option>
                      <option value="Cancelled">Batal / Tidak Dapat Diperbaiki</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-text-muted mb-1">Teknisi Penanggung Jawab</label>
                    <input
                      type="text"
                      value={actionTechnician}
                      onChange={(e) => setActionTechnician(e.target.value)}
                      className="w-full px-3 py-2 bg-card border border-border-subtle rounded-lg text-text-primary font-semibold"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-text-muted mb-1">Garansi Pengerjaan (Hari)</label>
                    <input
                      type="number"
                      value={actionWarrantyDays}
                      onChange={(e) => setActionWarrantyDays(e.target.value)}
                      className="w-full px-3 py-2 bg-card border border-border-subtle rounded-lg text-text-primary font-mono"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-text-muted mb-1">Laporan Pengerjaan & Catatan Teknisi</label>
                  <textarea
                    rows={2}
                    value={technicianNotes}
                    onChange={(e) => setTechnicianNotes(e.target.value)}
                    placeholder="Contoh: Modul LCD telah diganti dengan part OEM, TrueTone telah dikalibrasi, touch responsive 100%..."
                    className="w-full p-2.5 bg-card border border-border-subtle rounded-lg text-text-primary font-medium"
                  />
                </div>

                <div className="flex justify-between items-center pt-2 border-t border-border-subtle">
                  <button
                    type="button"
                    onClick={() => handleDeleteTicket(selectedTicket.id)}
                    className="px-3 py-2 bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 rounded-xl font-bold flex items-center gap-1 text-xs"
                  >
                    <Trash2 className="w-4 h-4" />
                    <span>Hapus Tiket</span>
                  </button>

                  <button
                    onClick={handleUpdateStatus}
                    disabled={isSubmitting}
                    className="px-5 py-2 bg-primary hover:bg-primary-hover text-primary-text rounded-xl font-bold shadow-md flex items-center gap-1.5"
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
