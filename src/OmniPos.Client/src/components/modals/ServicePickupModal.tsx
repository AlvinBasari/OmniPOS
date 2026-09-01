import React, { useState, useEffect } from 'react';
import { 
  X, 
  Search, 
  Wrench, 
  Smartphone, 
  Laptop, 
  CheckCircle2, 
  Clock, 
  DollarSign, 
  User, 
  Phone, 
  ShieldCheck,
  ArrowRight
} from 'lucide-react';
import { DeviceServiceTicket, DeviceServiceStatus } from '../../types';
import { useToastStore } from '../../store/useToastStore';

interface ServicePickupModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectServiceTicket: (ticket: DeviceServiceTicket) => void;
}

export const ServicePickupModal: React.FC<ServicePickupModalProps> = ({
  isOpen,
  onClose,
  onSelectServiceTicket
}) => {
  const [tickets, setTickets] = useState<DeviceServiceTicket[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      fetchTickets();
    }
  }, [isOpen]);

  const fetchTickets = async () => {
    try {
      setIsLoading(true);
      const res = await fetch('/api/v1/electronics/services');
      if (res.ok) {
        const data: DeviceServiceTicket[] = await res.json();
        // Filter tiket yang belum closed / picked up
        setTickets(data.filter(t => t.status !== 'PickedUpAndPaid' && t.status !== 'Cancelled'));
      }
    } catch {
      useToastStore.getState().showToast('Gagal memuat daftar tiket servis.', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  const filteredTickets = tickets.filter(t => {
    const q = searchQuery.toLowerCase();
    return (
      t.ticketNumber.toLowerCase().includes(q) ||
      t.customerName.toLowerCase().includes(q) ||
      t.customerPhone.includes(q) ||
      t.brandAndModel.toLowerCase().includes(q) ||
      (t.imeiOrSerial && t.imeiOrSerial.toLowerCase().includes(q))
    );
  });

  const getStatusBadge = (status: DeviceServiceStatus) => {
    switch (status) {
      case 'CompletedReadyForPickup':
        return <span className="px-2 py-0.5 rounded-md bg-status-success/15 text-status-success font-bold text-[10px] flex items-center gap-1"><CheckCircle2 className="w-3 h-3" /> Siap Diambil</span>;
      case 'Repairing':
        return <span className="px-2 py-0.5 rounded-md bg-status-warning/15 text-status-warning font-bold text-[10px] flex items-center gap-1"><Clock className="w-3 h-3" /> Sedang Dikerjakan</span>;
      case 'InInspection':
        return <span className="px-2 py-0.5 rounded-md bg-status-info/15 text-status-info font-bold text-[10px] flex items-center gap-1"><Wrench className="w-3 h-3" /> Pengecekan</span>;
      default:
        return <span className="px-2 py-0.5 rounded-md bg-subtle text-text-muted font-bold text-[10px]">{status}</span>;
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 select-none">
      <div className="bg-surface border border-border-strong w-full max-w-2xl rounded-2xl p-5 space-y-4 shadow-2xl animate-in fade-in zoom-in-95 duration-100 flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-border-subtle">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-blue-500/10 text-blue-600 flex items-center justify-center font-bold">
              <Wrench className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-text-primary">Pelunasan & Pengambilan Unit Servis</h2>
              <p className="text-xs text-text-secondary">Pilih tiket SPK servis untuk memuat sisa tagihan ke kasir POS.</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-subtle text-text-muted hover:text-text-primary"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search Bar */}
        <div className="relative">
          <Search className="w-4 h-4 text-text-muted absolute left-3 top-2.5" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Cari No. SPK (SRV-...), Nama Pelanggan, No. HP, atau Tipe Gadget..."
            className="w-full pl-9 pr-4 py-2 bg-subtle border border-border-subtle rounded-xl text-xs text-text-primary focus:outline-none focus:border-primary"
            autoFocus
          />
        </div>

        {/* Tickets List */}
        <div className="flex-1 overflow-y-auto space-y-2.5 pr-1">
          {isLoading ? (
            <div className="py-16 text-center text-text-muted text-xs">Memuat daftar tiket servis...</div>
          ) : filteredTickets.length === 0 ? (
            <div className="py-16 text-center text-text-muted text-xs space-y-1">
              <Wrench className="w-10 h-10 mx-auto opacity-30" />
              <p className="font-bold text-text-primary">Tidak Ada Tiket Servis Aktif</p>
              <p className="text-[11px]">Semua unit servis telah lunas atau tidak cocok dengan pencarian.</p>
            </div>
          ) : (
            filteredTickets.map(ticket => (
              <div 
                key={ticket.id}
                className="p-3.5 rounded-xl bg-card border border-border-subtle hover:border-primary/40 transition-all flex items-center justify-between gap-3 shadow-sm"
              >
                <div className="space-y-1 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-xs text-text-primary">{ticket.ticketNumber}</span>
                    {getStatusBadge(ticket.status)}
                    {ticket.status === 'CompletedReadyForPickup' && (
                      <span className="px-1.5 py-0.5 rounded bg-status-success/10 text-status-success text-[10px] font-bold">
                        ⭐ Rekomendasi Ambil
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-3 text-xs text-text-primary">
                    <span className="font-semibold">{ticket.brandAndModel}</span>
                    <span className="text-text-muted">•</span>
                    <span className="flex items-center gap-1 text-text-secondary">
                      <User className="w-3 h-3" /> {ticket.customerName} ({ticket.customerPhone})
                    </span>
                  </div>
                  <p className="text-[11px] text-text-muted truncate max-w-md">
                    Keluhan: {ticket.problemDescription}
                  </p>
                </div>

                <div className="text-right space-y-1 shrink-0">
                  <span className="text-[10px] text-text-muted block">Sisa Pelunasan:</span>
                  <span className="font-mono font-bold text-sm text-status-danger block">
                    Rp {ticket.remainingBalance.toLocaleString('id-ID')}
                  </span>
                  <button
                    onClick={() => {
                      onSelectServiceTicket(ticket);
                      onClose();
                    }}
                    className="px-3 py-1.5 bg-primary hover:bg-primary-hover text-primary-text rounded-lg text-xs font-bold flex items-center gap-1 shadow-sm transition-all"
                  >
                    <span>Tagihkan Kasir</span>
                    <ArrowRight className="w-3 h-3" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="pt-2 flex justify-between items-center border-t border-border-subtle text-xs text-text-muted">
          <span>Menampilkan {filteredTickets.length} tiket servis aktif</span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 bg-subtle hover:bg-card-hover border border-border-subtle rounded-lg text-text-secondary font-semibold"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
};
