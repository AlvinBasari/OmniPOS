import React, { useRef } from 'react';
import { 
  X, 
  Printer, 
  Wrench, 
  Smartphone, 
  FileText 
} from 'lucide-react';
import { DeviceServiceTicket } from '../../types';
import { useAuthStore } from '../../store/useAuthStore';

interface SpkReceiptPrintModalProps {
  isOpen: boolean;
  ticket: DeviceServiceTicket | null;
  onClose: () => void;
}

export const SpkReceiptPrintModal: React.FC<SpkReceiptPrintModalProps> = ({
  isOpen,
  ticket,
  onClose
}) => {
  const { storeInfo } = useAuthStore();
  const printRef = useRef<HTMLDivElement>(null);

  if (!isOpen || !ticket) return null;

  const handlePrint = () => {
    window.print();
  };

  const formattedDate = ticket.receivedDate 
    ? new Date(ticket.receivedDate).toLocaleDateString('id-ID', {
        day: '2-digit',
        month: 'long',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      })
    : new Date().toLocaleDateString('id-ID');

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-card border border-border-subtle rounded-2xl w-full max-w-2xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden">
        {/* Header Bar */}
        <div className="p-4 border-b border-border-subtle flex items-center justify-between bg-surface print:hidden">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center font-bold">
              <Printer className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-text-primary">
                Cetak Tanda Terima & SPK Servis
              </h2>
              <p className="text-[11px] text-text-secondary">
                Surat Perintah Kerja resmi #{ticket.ticketNumber}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="px-4 py-2 bg-primary hover:bg-primary-hover text-primary-text font-bold text-xs rounded-xl flex items-center gap-1.5 shadow-md active:scale-95 transition-all"
            >
              <Printer className="w-4 h-4" />
              <span>Cetak Sekarang</span>
            </button>
            <button
              onClick={onClose}
              className="p-2 text-text-secondary hover:text-text-primary rounded-xl hover:bg-subtle"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Document Preview */}
        <div className="flex-1 overflow-y-auto p-6 bg-slate-100 dark:bg-slate-950 flex justify-center">
          <div 
            ref={printRef}
            className="w-full max-w-lg bg-white text-slate-900 p-6 rounded-xl border border-slate-300 shadow-md print:shadow-none print:border-none print:m-0 print:p-0 font-sans text-xs"
          >
            {/* Store Header */}
            <div className="text-center pb-4 border-b-2 border-dashed border-slate-300">
              <div className="flex items-center justify-center gap-1.5 text-base font-black uppercase tracking-wider text-slate-900">
                <Wrench className="w-5 h-5 text-indigo-600 inline" />
                <span>{storeInfo?.storeName || 'OMNIPOS SERVICE CENTER'}</span>
              </div>
              <p className="text-[11px] text-slate-600 mt-0.5">
                {storeInfo?.storeAddress || 'Pusat Servis Smartphone, Laptop & Gadget Terpercaya'}
              </p>
              <p className="text-[11px] text-slate-600 font-mono">
                WhatsApp Helpdesk: {storeInfo?.storePhone || '0812-3456-7890'}
              </p>
              <div className="mt-2 inline-block px-3 py-1 bg-slate-900 text-white rounded-md font-mono font-bold text-xs">
                TANDA TERIMA & SPK SERVIS
              </div>
            </div>

            {/* Ticket & Customer Summary */}
            <div className="py-3 border-b border-slate-200 grid grid-cols-2 gap-2 text-[11px]">
              <div>
                <span className="text-slate-500 block text-[10px]">NOMOR SPK:</span>
                <span className="font-mono font-black text-slate-900 text-sm">{ticket.ticketNumber}</span>
              </div>
              <div className="text-right">
                <span className="text-slate-500 block text-[10px]">TANGGAL PENERIMAAN:</span>
                <span className="font-semibold text-slate-800">{formattedDate}</span>
              </div>
              <div>
                <span className="text-slate-500 block text-[10px]">NAMA PELANGGAN:</span>
                <span className="font-bold text-slate-900">{ticket.customerName}</span>
              </div>
              <div className="text-right">
                <span className="text-slate-500 block text-[10px]">NO. TELEPON / WA:</span>
                <span className="font-mono font-bold text-slate-900">{ticket.customerPhone}</span>
              </div>
            </div>

            {/* Device Info */}
            <div className="py-3 border-b border-slate-200 space-y-1.5">
              <div className="font-bold text-slate-800 uppercase tracking-wide text-[10px] text-indigo-700 flex items-center gap-1">
                <Smartphone className="w-3.5 h-3.5" />
                Informasi Perangkat
              </div>
              <div className="grid grid-cols-2 gap-x-2 gap-y-1 bg-slate-50 p-2.5 rounded-lg border border-slate-200 text-[11px]">
                <div>
                  <span className="text-slate-500">Tipe / Model:</span>{' '}
                  <strong className="text-slate-900">{ticket.brandAndModel}</strong>
                </div>
                <div>
                  <span className="text-slate-500">IMEI / Serial:</span>{' '}
                  <span className="font-mono font-bold">{ticket.imeiOrSerial || '-'}</span>
                </div>
                <div>
                  <span className="text-slate-500">Warna Unit:</span>{' '}
                  <span>{ticket.deviceColor || '-'}</span>
                </div>
                <div>
                  <span className="text-slate-500">Kondisi Fisik:</span>{' '}
                  <span>{ticket.physicalCondition || 'Wajar'}</span>
                </div>
                <div className="col-span-2">
                  <span className="text-slate-500">Kelengkapan Diterima:</span>{' '}
                  <strong className="text-slate-800">{ticket.accessoriesIncluded || 'Unit Saja'}</strong>
                </div>
              </div>
            </div>

            {/* Problem & Diagnosis */}
            <div className="py-3 border-b border-slate-200 space-y-1">
              <div className="font-bold text-slate-800 uppercase tracking-wide text-[10px] text-rose-700 flex items-center gap-1">
                <FileText className="w-3.5 h-3.5" />
                Keluhan / Gejala Kerusakan
              </div>
              <div className="p-2 bg-rose-50/50 border border-rose-200 rounded-lg text-slate-900 font-medium">
                "{ticket.problemDescription}"
              </div>
              {ticket.technicianNotes && (
                <div className="mt-1 p-2 bg-slate-50 border border-slate-200 rounded-lg text-[11px]">
                  <span className="font-bold text-slate-700">Catatan Teknisi ({ticket.assignedTechnicianName || 'Teknisi'}):</span>{' '}
                  <span className="text-slate-800">{ticket.technicianNotes}</span>
                </div>
              )}
            </div>

            {/* Cost Breakdown */}
            <div className="py-3 border-b border-slate-200 space-y-1 text-[11px]">
              <div className="font-bold text-slate-800 uppercase tracking-wide text-[10px] text-emerald-700">
                Rincian Estimasi Biaya
              </div>
              
              {ticket.items && ticket.items.length > 0 && (
                <div className="mb-2 space-y-1">
                  {ticket.items.map((it, idx) => (
                    <div key={idx} className="flex justify-between text-slate-700">
                      <span>• {it.name} x{it.quantity}</span>
                      <span className="font-mono">Rp {(it.totalPrice || 0).toLocaleString('id-ID')}</span>
                    </div>
                  ))}
                </div>
              )}

              <div className="flex justify-between text-slate-600">
                <span>Total Estimasi Biaya:</span>
                <span className="font-mono font-bold text-slate-900">
                  Rp {(ticket.finalCost || ticket.estimatedCost).toLocaleString('id-ID')}
                </span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Uang Muka (DP Terbayar):</span>
                <span className="font-mono text-emerald-700 font-bold">
                  Rp {(ticket.downPayment || 0).toLocaleString('id-ID')}
                </span>
              </div>
              <div className="flex justify-between pt-1 border-t border-slate-200 text-sm font-extrabold">
                <span className="text-slate-900">Sisa Pelunasan Saat Pengambilan:</span>
                <span className="font-mono text-indigo-700">
                  Rp {(ticket.remainingBalance || 0).toLocaleString('id-ID')}
                </span>
              </div>
            </div>

            {/* Terms & Conditions */}
            <div className="py-2.5 border-b border-slate-200 text-[9px] text-slate-500 space-y-0.5 leading-tight">
              <div className="font-bold text-slate-700 uppercase">Syarat & Ketentuan Servis:</div>
              <ol className="list-decimal pl-3.5 space-y-0.5">
                <li>Pengambilan unit wajib membawa lembar Tanda Terima SPK ini / verifikasi WhatsApp resmi.</li>
                <li>Garansi servis berlaku selama <strong>{ticket.warrantyDaysGiven || 30} hari</strong> untuk sparepart/kerusakan yang sama.</li>
                <li>Garansi tidak berlaku jika segel toko rusak, terkena air, jatuh, atau kelalaian pemakai.</li>
                <li>Unit yang tidak diambil lebih dari 30 hari sejak notifikasi selesai berada di luar tanggung jawab toko.</li>
              </ol>
            </div>

            {/* Signatures */}
            <div className="pt-3 grid grid-cols-2 gap-4 text-center text-[10px]">
              <div>
                <div className="text-slate-500 mb-8">Pemilik / Pelanggan:</div>
                <div className="font-bold text-slate-900 border-t border-slate-400 pt-1">
                  ( {ticket.customerName} )
                </div>
              </div>
              <div>
                <div className="text-slate-500 mb-8">Penerima / Teknisi:</div>
                <div className="font-bold text-slate-900 border-t border-slate-400 pt-1">
                  ( {ticket.assignedTechnicianName || 'Staff Service'} )
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
