import React, { useRef, useState } from 'react';
import { 
  X, 
  Printer, 
  Wrench, 
  Smartphone, 
  FileText,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Clock,
  User,
  Phone,
  Calendar,
  Layers
} from 'lucide-react';
import { DeviceServiceTicket, DeviceChecklistItem } from '../../types';
import { useAuthStore } from '../../store/useAuthStore';
import { printElement } from '../../utils/printHelper';

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
  const [printFormat, setPrintFormat] = useState<'thermal' | 'a4'>('thermal');

  if (!isOpen || !ticket) return null;

  const handlePrint = () => {
    if (printRef.current) {
      printElement(printRef.current, {
        title: `SPK Servis - ${ticket.ticketNumber}`,
        pageSize: printFormat === 'a4' ? 'A4' : '80mm'
      });
    } else {
      window.print();
    }
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

  const formattedEta = ticket.estimatedCompletionDate
    ? new Date(ticket.estimatedCompletionDate).toLocaleDateString('id-ID', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      })
    : '-';

  // Parse checklist if available
  let checklistItems: DeviceChecklistItem[] = [];
  if (ticket.deviceChecklistJson) {
    try {
      checklistItems = JSON.parse(ticket.deviceChecklistJson);
    } catch {
      checklistItems = [];
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-card border border-border-subtle rounded-2xl w-full max-w-3xl shadow-2xl flex flex-col max-h-[92vh] overflow-hidden">
        {/* Header Bar */}
        <div className="p-4 border-b border-border-subtle flex items-center justify-between bg-surface print:hidden">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-bold">
              <Printer className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-text-primary flex items-center gap-2">
                <span>Cetak Tanda Terima & SPK Servis</span>
                <span className="font-mono text-xs px-2 py-0.5 bg-primary/10 text-primary rounded-md">
                  #{ticket.ticketNumber}
                </span>
              </h2>
              <p className="text-[11px] text-text-secondary">
                Pilih format cetak: Karcis Thermal Kasir atau Surat Perintah Kerja (SPK) A4
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Format Toggle */}
            <div className="flex bg-subtle p-0.5 rounded-lg border border-border-subtle text-xs">
              <button
                type="button"
                onClick={() => setPrintFormat('thermal')}
                className={`px-3 py-1 rounded-md font-bold transition-all ${
                  printFormat === 'thermal'
                    ? 'bg-primary text-primary-text shadow-xs'
                    : 'text-text-secondary hover:text-text-primary'
                }`}
              >
                Thermal (58/80mm)
              </button>
              <button
                type="button"
                onClick={() => setPrintFormat('a4')}
                className={`px-3 py-1 rounded-md font-bold transition-all ${
                  printFormat === 'a4'
                    ? 'bg-primary text-primary-text shadow-xs'
                    : 'text-text-secondary hover:text-text-primary'
                }`}
              >
                Surat Jalan A4
              </button>
            </div>

            <button
              onClick={handlePrint}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 shadow-md active:scale-95 transition-all"
            >
              <Printer className="w-4 h-4" />
              <span>Cetak Dokumen</span>
            </button>
            <button
              onClick={onClose}
              className="p-2 text-text-secondary hover:text-text-primary rounded-xl hover:bg-subtle transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Document Preview Area */}
        <div className="flex-1 overflow-y-auto p-6 bg-slate-200 dark:bg-slate-950 flex justify-center">
          {printFormat === 'thermal' ? (
            /* =================== FORMAT THERMAL 58/80MM =================== */
            <div 
              ref={printRef}
              className="w-full max-w-[340px] bg-white text-slate-900 p-4 rounded-xl border border-slate-300 shadow-lg print:shadow-none print:border-none print:m-0 print:p-2 font-mono text-[11px] leading-tight"
            >
              {/* Store Header */}
              <div className="text-center pb-2 border-b border-dashed border-slate-400">
                <div className="font-black text-sm uppercase tracking-wide">
                  {storeInfo?.storeName || 'OMNIPOS SERVICE CENTER'}
                </div>
                <div className="text-[10px] text-slate-600">
                  {storeInfo?.storeAddress || 'Pusat Servis & Reparasi Elektronik'}
                </div>
                <div className="text-[10px] text-slate-600 font-bold">
                  Telp/WA: {storeInfo?.storePhone || '0812-3456-7890'}
                </div>
                <div className="mt-1.5 inline-block px-2 py-0.5 bg-slate-900 text-white rounded text-[10px] font-bold">
                  TANDA TERIMA SERVIS
                </div>
              </div>

              {/* SPK & Customer Info */}
              <div className="py-2 border-b border-dashed border-slate-400 space-y-0.5 text-[10px]">
                <div className="flex justify-between">
                  <span>No. SPK:</span>
                  <span className="font-bold">{ticket.ticketNumber}</span>
                </div>
                <div className="flex justify-between">
                  <span>Waktu:</span>
                  <span>{formattedDate}</span>
                </div>
                <div className="flex justify-between">
                  <span>Pelanggan:</span>
                  <span className="font-bold">{ticket.customerName}</span>
                </div>
                <div className="flex justify-between">
                  <span>No. HP/WA:</span>
                  <span>{ticket.customerPhone}</span>
                </div>
                {ticket.assignedTechnicianName && (
                  <div className="flex justify-between">
                    <span>Teknisi:</span>
                    <span>{ticket.assignedTechnicianName}</span>
                  </div>
                )}
                {ticket.estimatedCompletionDate && (
                  <div className="flex justify-between font-bold text-slate-900">
                    <span>Target Selesai:</span>
                    <span>{formattedEta}</span>
                  </div>
                )}
              </div>

              {/* Device Info */}
              <div className="py-2 border-b border-dashed border-slate-400 space-y-0.5 text-[10px]">
                <div className="font-bold uppercase text-[9px] text-slate-700">UNIT DITERIMA:</div>
                <div className="font-bold text-[11px]">{ticket.brandAndModel}</div>
                {ticket.imeiOrSerial && (
                  <div>IMEI/SN: {ticket.imeiOrSerial}</div>
                )}
                {ticket.deviceColor && (
                  <div>Warna: {ticket.deviceColor}</div>
                )}
                {ticket.passcodeOrPattern && (
                  <div>Pola/PIN: {ticket.passcodeOrPattern}</div>
                )}
                <div>Kelengkapan: {ticket.accessoriesIncluded || 'Unit Only'}</div>
                <div className="mt-1 text-slate-800">
                  <span className="font-bold">Keluhan: </span>
                  {ticket.problemDescription}
                </div>
              </div>

              {/* Quick Checklist if available */}
              {checklistItems.length > 0 && (
                <div className="py-1.5 border-b border-dashed border-slate-400 text-[9px]">
                  <div className="font-bold text-slate-700 mb-0.5">CHECKLIST HARDWARE:</div>
                  <div className="grid grid-cols-2 gap-x-1 gap-y-0.5">
                    {checklistItems.map(item => (
                      <div key={item.key} className="flex items-center gap-1">
                        <span>{item.status === 'normal' ? '✓' : item.status === 'faulty' ? '✗' : '-'}</span>
                        <span className="truncate">{item.label}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Financial Breakdown */}
              <div className="py-2 border-b border-dashed border-slate-400 space-y-1 text-[11px]">
                {ticket.items && ticket.items.length > 0 && (
                  <div className="space-y-0.5 text-[10px] pb-1 border-b border-slate-200">
                    {ticket.items.map((it, idx) => (
                      <div key={idx} className="flex justify-between">
                        <span>{it.name} x{it.quantity}</span>
                        <span>Rp {(it.totalPrice || 0).toLocaleString('id-ID')}</span>
                      </div>
                    ))}
                  </div>
                )}

                <div className="flex justify-between text-slate-700">
                  <span>Estimasi Biaya:</span>
                  <span>Rp {(ticket.finalCost || ticket.estimatedCost).toLocaleString('id-ID')}</span>
                </div>
                <div className="flex justify-between text-slate-700">
                  <span>Uang Muka (DP):</span>
                  <span>Rp {(ticket.downPayment || 0).toLocaleString('id-ID')}</span>
                </div>
                <div className="flex justify-between font-extrabold text-xs pt-1 border-t border-slate-300">
                  <span>Sisa Pelunasan:</span>
                  <span>Rp {(ticket.remainingBalance || 0).toLocaleString('id-ID')}</span>
                </div>
                <div className="text-[10px] text-slate-600 flex justify-between">
                  <span>Garansi Servis:</span>
                  <span className="font-bold">{ticket.warrantyDaysGiven || 30} Hari</span>
                </div>
              </div>

              {/* Footer Note */}
              <div className="pt-2 text-center text-[9px] text-slate-600 space-y-1">
                <p className="italic">
                  * Harap simpan karcis tanda terima ini saat pengambilan unit di toko.
                </p>
                <p>Terima kasih atas kepercayaan Anda!</p>
                <div className="font-mono text-[8px] text-slate-400">
                  OmniPOS Service Engine • {new Date().toLocaleTimeString('id-ID')}
                </div>
              </div>
            </div>
          ) : (
            /* =================== FORMAT SURAT JALAN / SPK RESMI A4 =================== */
            <div 
              ref={printRef}
              className="w-full max-w-2xl bg-white text-slate-900 p-8 rounded-xl border border-slate-300 shadow-lg print:shadow-none print:border-none print:m-0 print:p-0 font-sans text-xs leading-normal"
            >
              {/* Official Store Header */}
              <div className="flex items-start justify-between pb-4 border-b-2 border-slate-900">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-slate-900 text-white flex items-center justify-center font-black">
                    <Wrench className="w-6 h-6 text-indigo-400" />
                  </div>
                  <div>
                    <h1 className="text-lg font-black uppercase tracking-wider text-slate-900">
                      {storeInfo?.storeName || 'OMNIPOS SERVICE CENTER'}
                    </h1>
                    <p className="text-[11px] text-slate-600 max-w-sm">
                      {storeInfo?.storeAddress || 'Pusat Servis, Reparasi Hardware, Software & Suku Cadang Original'}
                    </p>
                    <p className="text-[11px] text-slate-700 font-semibold">
                      Hotline / WhatsApp: {storeInfo?.storePhone || '0812-3456-7890'}
                    </p>
                  </div>
                </div>

                <div className="text-right">
                  <div className="px-3 py-1 bg-slate-900 text-white rounded font-mono font-bold text-xs inline-block">
                    SURAT PERINTAH KERJA (SPK)
                  </div>
                  <div className="mt-1.5 font-mono font-black text-slate-900 text-sm">
                    {ticket.ticketNumber}
                  </div>
                  <div className="text-[10px] text-slate-500">
                    Tgl Masuk: {formattedDate}
                  </div>
                </div>
              </div>

              {/* 2-Column Info Grid */}
              <div className="grid grid-cols-2 gap-4 py-4 border-b border-slate-200 text-xs">
                {/* Customer Details */}
                <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 space-y-1">
                  <div className="font-bold text-indigo-800 text-[11px] flex items-center gap-1 mb-1 uppercase tracking-wide">
                    <User className="w-3.5 h-3.5" /> Identitas Pelanggan
                  </div>
                  <div><span className="text-slate-500">Nama Pemilik:</span> <strong>{ticket.customerName}</strong></div>
                  <div><span className="text-slate-500">No. WhatsApp/HP:</span> <strong className="font-mono">{ticket.customerPhone}</strong></div>
                  {ticket.customerEmail && <div><span className="text-slate-500">Email:</span> {ticket.customerEmail}</div>}
                  {ticket.customerAddress && <div><span className="text-slate-500">Alamat:</span> {ticket.customerAddress}</div>}
                </div>

                {/* Device & Technician Details */}
                <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 space-y-1">
                  <div className="font-bold text-indigo-800 text-[11px] flex items-center gap-1 mb-1 uppercase tracking-wide">
                    <Smartphone className="w-3.5 h-3.5" /> Spesifikasi Perangkat
                  </div>
                  <div><span className="text-slate-500">Tipe / Model:</span> <strong>{ticket.brandAndModel}</strong></div>
                  <div><span className="text-slate-500">IMEI / Serial No:</span> <strong className="font-mono">{ticket.imeiOrSerial || '-'}</strong></div>
                  <div><span className="text-slate-500">Warna / Kondisi:</span> {ticket.deviceColor || '-'} ({ticket.physicalCondition})</div>
                  <div><span className="text-slate-500">Kelengkapan:</span> {ticket.accessoriesIncluded || 'Unit Saja'}</div>
                  {ticket.passcodeOrPattern && <div><span className="text-slate-500">Pola/PIN:</span> <strong className="font-mono text-indigo-700">{ticket.passcodeOrPattern}</strong></div>}
                  <div className="pt-1 border-t border-slate-200 flex justify-between text-[11px]">
                    <span><span className="text-slate-500">Teknisi:</span> <strong>{ticket.assignedTechnicianName || 'Staff Service'}</strong></span>
                    <span><span className="text-slate-500">Target ETA:</span> <strong>{formattedEta}</strong></span>
                  </div>
                </div>
              </div>

              {/* Hardware Checklist Grid */}
              <div className="py-3 border-b border-slate-200">
                <div className="font-bold text-slate-800 text-[11px] mb-2 uppercase tracking-wide flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5 text-indigo-600" />
                  Kondisi Hardware Awal Saat Diterima
                </div>
                {checklistItems.length > 0 ? (
                  <div className="grid grid-cols-4 gap-2 text-[10px]">
                    {checklistItems.map(item => (
                      <div 
                        key={item.key} 
                        className={`p-1.5 rounded border flex items-center justify-between ${
                          item.status === 'normal'
                            ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                            : item.status === 'faulty'
                            ? 'bg-rose-50 border-rose-200 text-rose-900'
                            : 'bg-slate-50 border-slate-200 text-slate-600'
                        }`}
                      >
                        <span className="font-medium truncate">{item.label}</span>
                        <span className="font-bold text-[9px] px-1 rounded bg-white">
                          {item.status === 'normal' ? 'Normal' : item.status === 'faulty' ? 'Rusak' : 'N/A'}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-[11px] text-slate-500 italic">
                    Kondisi fisik: {ticket.physicalCondition || 'Pemeriksaan standar'}
                  </div>
                )}
              </div>

              {/* Problem Description & Diagnosis */}
              <div className="py-3 border-b border-slate-200 space-y-1.5">
                <div>
                  <span className="font-bold text-slate-800 text-[11px] uppercase tracking-wide">Keluhan / Gejala Kerusakan:</span>
                  <div className="mt-1 p-2 bg-rose-50/70 border border-rose-200 rounded-lg text-slate-900 font-medium">
                    "{ticket.problemDescription}"
                  </div>
                </div>
                {ticket.technicianNotes && (
                  <div>
                    <span className="font-bold text-slate-800 text-[11px] uppercase tracking-wide">Hasil Diagnosa & Catatan Teknisi:</span>
                    <div className="mt-1 p-2 bg-indigo-50/70 border border-indigo-200 rounded-lg text-slate-900">
                      {ticket.technicianNotes}
                    </div>
                  </div>
                )}
              </div>

              {/* Itemized Parts & Costs */}
              <div className="py-3 border-b border-slate-200 space-y-2">
                <div className="font-bold text-slate-800 text-[11px] uppercase tracking-wide">
                  Rincian Suku Cadang & Biaya Layanan
                </div>
                <table className="w-full text-left text-xs border border-slate-200">
                  <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                    <tr>
                      <th className="p-2">Deskripsi Tindakan / Sparepart</th>
                      <th className="p-2">Tipe</th>
                      <th className="p-2 text-center">Qty</th>
                      <th className="p-2 text-right">Harga Satuan</th>
                      <th className="p-2 text-right">Subtotal</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 font-mono">
                    {ticket.items && ticket.items.length > 0 ? (
                      ticket.items.map((it, idx) => (
                        <tr key={idx}>
                          <td className="p-2 font-sans font-medium text-slate-900">{it.name}</td>
                          <td className="p-2 font-sans text-[10px] text-slate-600">
                            {it.itemType === 'SparePart' ? 'Sparepart' : 'Biaya Jasa'}
                          </td>
                          <td className="p-2 text-center font-sans">{it.quantity}</td>
                          <td className="p-2 text-right">Rp {it.unitPrice.toLocaleString('id-ID')}</td>
                          <td className="p-2 text-right font-bold text-slate-900">Rp {it.totalPrice.toLocaleString('id-ID')}</td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={5} className="p-2 text-slate-500 font-sans italic text-center">
                          Estimasi biaya servis awal berdasarkan diagnosa penerimaan.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>

                {/* Financial Summary */}
                <div className="flex justify-end pt-1">
                  <div className="w-72 space-y-1 text-xs font-mono">
                    <div className="flex justify-between text-slate-600 font-sans">
                      <span>Total Biaya Servis:</span>
                      <span className="font-bold font-mono text-slate-900">
                        Rp {(ticket.finalCost || ticket.estimatedCost).toLocaleString('id-ID')}
                      </span>
                    </div>
                    <div className="flex justify-between text-slate-600 font-sans">
                      <span>Uang Muka Diterima (DP):</span>
                      <span className="font-bold font-mono text-emerald-700">
                        Rp {(ticket.downPayment || 0).toLocaleString('id-ID')}
                      </span>
                    </div>
                    <div className="flex justify-between pt-1 border-t border-slate-300 font-bold text-sm text-slate-900 font-sans">
                      <span>Sisa Pelunasan:</span>
                      <span className="font-mono text-indigo-700">
                        Rp {(ticket.remainingBalance || 0).toLocaleString('id-ID')}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Terms & Conditions Clause */}
              <div className="py-3 border-b border-slate-200 text-[10px] text-slate-600 space-y-1 leading-tight">
                <div className="font-bold text-slate-800 uppercase">Klausul Garansi & Ketentuan Servis:</div>
                <ol className="list-decimal pl-4 space-y-0.5">
                  <li>Garansi servis toko berlaku selama <strong>{ticket.warrantyDaysGiven || 30} hari kalender</strong> terhitung sejak tanggal unit diambil untuk kerusakan / part yang sama.</li>
                  <li>Garansi batal apabila segel toko rusak/robek, unit jatuh, terkena cairan, atau telah dibongkar oleh pihak ketiga.</li>
                  <li>Toko tidak bertanggung jawab atas kehilangan data pada unit selama proses reparasi (pelanggan disarankan backup mandiri).</li>
                  <li>Unit yang tidak diambil dalam kurun waktu 30 hari kalender setelah status dinyatakan selesai bukan lagi menjadi tanggung jawab toko.</li>
                </ol>
              </div>

              {/* Signatures */}
              <div className="pt-4 grid grid-cols-2 gap-8 text-center text-xs">
                <div>
                  <div className="text-slate-500 mb-12">Pelanggan / Pemilik:</div>
                  <div className="font-bold text-slate-900 border-t border-slate-400 pt-1">
                    ( {ticket.customerName} )
                  </div>
                </div>
                <div>
                  <div className="text-slate-500 mb-12">Penerima / Teknisi Penanggung Jawab:</div>
                  <div className="font-bold text-slate-900 border-t border-slate-400 pt-1">
                    ( {ticket.assignedTechnicianName || 'Staff OmniPOS Service'} )
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

