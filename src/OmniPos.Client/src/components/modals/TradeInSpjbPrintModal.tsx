import React, { useState } from 'react';
import { X, Printer, FileText } from 'lucide-react';
import { TradeInTransaction, DiagnosticChecklistItem, TradeInDeductionItem } from '../../types';
import { printElement } from '../../utils/printHelper';

interface TradeInSpjbPrintModalProps {
  isOpen: boolean;
  onClose: () => void;
  tradeIn: TradeInTransaction;
  storeName?: string;
  storeAddress?: string;
  storePhone?: string;
}

export const TradeInSpjbPrintModal: React.FC<TradeInSpjbPrintModalProps> = ({
  isOpen,
  onClose,
  tradeIn,
  storeName = 'OMNIPOS ELECTRONICS & GADGET STORE',
  storeAddress = 'Jl. Boulevard Raya Blok A4 No. 12, Jakarta',
  storePhone = '0812-8888-9999'
}) => {
  const [printFormat, setPrintFormat] = useState<'a4' | 'thermal'>('a4');

  if (!isOpen) return null;

  // Parse JSON diagnostic & deductions
  let diagnosticList: DiagnosticChecklistItem[] = [];
  try {
    if (tradeIn.diagnosticChecklistJson) {
      diagnosticList = JSON.parse(tradeIn.diagnosticChecklistJson);
    }
  } catch (e) {
    diagnosticList = [];
  }

  let deductionList: TradeInDeductionItem[] = [];
  try {
    if (tradeIn.deductionsJson) {
      deductionList = JSON.parse(tradeIn.deductionsJson);
    }
  } catch (e) {
    deductionList = [];
  }

  const handlePrint = () => {
    const targetId = printFormat === 'a4' ? 'tradein-spjb-a4' : 'tradein-spjb-thermal';
    printElement(targetId, {
      title: `SPJB Tukar Tambah - ${tradeIn.tradeInNumber}`,
      pageSize: printFormat === 'a4' ? 'A4' : '80mm'
    });
  };

  const formattedDate = new Date(tradeIn.transactionDate).toLocaleDateString('id-ID', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 select-none overflow-y-auto">
      <div className="bg-surface border border-border-strong w-full max-w-3xl rounded-2xl p-5 space-y-4 shadow-2xl my-auto animate-in fade-in zoom-in-95 duration-100 max-h-[95vh] flex flex-col">
        {/* Header & Format Toggle */}
        <div className="flex items-center justify-between pb-3 border-b border-border-subtle shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-purple-500/10 text-purple-600 flex items-center justify-center font-bold">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-text-primary">
                Cetak SPJB & Tanda Terima Tukar Tambah
              </h2>
              <p className="text-xs text-text-secondary font-mono">
                No. SPJB: {tradeIn.tradeInNumber}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Format Switcher */}
            <div className="flex bg-subtle p-1 rounded-xl border border-border-subtle text-xs">
              <button
                type="button"
                onClick={() => setPrintFormat('a4')}
                className={`px-3 py-1 rounded-lg font-bold transition-all ${
                  printFormat === 'a4'
                    ? 'bg-purple-600 text-white shadow-sm'
                    : 'text-text-muted hover:text-text-primary'
                }`}
              >
                Dokumen A4 Resmi
              </button>
              <button
                type="button"
                onClick={() => setPrintFormat('thermal')}
                className={`px-3 py-1 rounded-lg font-bold transition-all ${
                  printFormat === 'thermal'
                    ? 'bg-purple-600 text-white shadow-sm'
                    : 'text-text-muted hover:text-text-primary'
                }`}
              >
                Slip Thermal 80mm
              </button>
            </div>

            <button
              onClick={onClose}
              className="p-1.5 rounded-lg hover:bg-subtle text-text-muted hover:text-text-primary transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Preview Area */}
        <div className="flex-1 overflow-y-auto p-4 bg-zinc-900/30 rounded-xl border border-border-subtle flex justify-center">
          {printFormat === 'a4' ? (
            /* ========================================================================= */
            /* A4 FORMAT: SURAT PERJANJIAN JUAL BELI (SPJB) HP / LAPTOP BEKAS RESMI     */
            /* ========================================================================= */
            <div id="tradein-spjb-a4" className="bg-white text-black p-8 w-[210mm] min-h-[260mm] shadow-lg rounded text-[11px] font-sans space-y-4 printable-spjb printable-document">
              {/* Header Toko */}
              <div className="border-b-2 border-black pb-3 flex justify-between items-start">
                <div>
                  <h1 className="text-base font-extrabold tracking-tight uppercase">{storeName}</h1>
                  <p className="text-[10px] text-gray-700">{storeAddress}</p>
                  <p className="text-[10px] text-gray-700">Hotline / WhatsApp: {storePhone}</p>
                </div>
                <div className="text-right">
                  <div className="inline-block border border-black px-2 py-0.5 font-bold font-mono text-xs">
                    {tradeIn.tradeInNumber}
                  </div>
                  <p className="text-[9px] text-gray-600 mt-1">{formattedDate}</p>
                  <p className="text-[9px] font-bold text-purple-800 uppercase">
                    Status: {tradeIn.status === 'RestockedForSale' ? 'RESTOCKED / TERSEDIA' : tradeIn.status}
                  </p>
                </div>
              </div>

              {/* Title Document */}
              <div className="text-center py-1">
                <h2 className="text-sm font-black uppercase tracking-wider underline">
                  SURAT PERJANJIAN JUAL BELI (SPJB) HP / UNIT BEKAS
                </h2>
                <p className="text-[9px] text-gray-500 italic">
                  Berita Acara Serah Terima & Tukar Tambah Unit Elektronik / Gadget
                </p>
              </div>

              {/* Pihak Pertama (Pelanggan) */}
              <div className="border border-gray-300 p-2.5 rounded bg-gray-50 space-y-1">
                <span className="font-bold text-[10px] uppercase text-gray-800 block">
                  I. IDENTITAS PENJUAL / PEMILIK PERANGKAT LAMA (PIHAK PERTAMA)
                </span>
                <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-[10px]">
                  <div><span className="font-semibold text-gray-600">Nama Lengkap:</span> <span className="font-bold">{tradeIn.customerName}</span></div>
                  <div><span className="font-semibold text-gray-600">No. HP / WA:</span> <span className="font-mono">{tradeIn.customerPhone || '-'}</span></div>
                  <div><span className="font-semibold text-gray-600">No. KTP / NIK:</span> <span className="font-mono font-bold">{tradeIn.customerNik || '- (Wajib Lampirkan KTP)'}</span></div>
                  <div><span className="font-semibold text-gray-600">Alamat:</span> <span>{tradeIn.customerAddress || '-'}</span></div>
                </div>
              </div>

              {/* Rincian Unit Yang Dijual / Ditukar */}
              <div className="border border-gray-300 p-2.5 rounded bg-gray-50 space-y-1">
                <span className="font-bold text-[10px] uppercase text-gray-800 block">
                  II. SPESIFIKASI & KONDISI FISIK UNIT BEKAS
                </span>
                <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-[10px]">
                  <div><span className="font-semibold text-gray-600">Merek / Model:</span> <span className="font-bold">{tradeIn.deviceBrandModel}</span></div>
                  <div><span className="font-semibold text-gray-600">IMEI / No. Seri:</span> <span className="font-mono font-bold">{tradeIn.imeiOrSerial || '-'}</span></div>
                  <div><span className="font-semibold text-gray-600">Grade Fisik:</span> <span className="font-bold bg-gray-200 px-1.5 py-0.5 rounded text-[9px]">{tradeIn.conditionGrade}</span></div>
                  <div><span className="font-semibold text-gray-600">Battery Health:</span> <span className="font-mono font-bold">{tradeIn.batteryHealthPercent || 100}%</span></div>
                  <div><span className="font-semibold text-gray-600">Kelengkapan:</span> <span>{tradeIn.accessoriesIncluded}</span></div>
                  <div><span className="font-semibold text-gray-600">Catatan Fungsi:</span> <span>{tradeIn.functionalNotes}</span></div>
                </div>

                {/* Checklist Inspeksi Hardware */}
                {diagnosticList.length > 0 && (
                  <div className="mt-2 pt-2 border-t border-gray-200">
                    <span className="font-bold text-[9px] text-gray-700 block mb-1">Hasil Diagnosa Hardware & Fitur:</span>
                    <div className="grid grid-cols-4 gap-1 text-[9px]">
                      {diagnosticList.map((item, idx) => (
                        <div key={idx} className="border border-gray-200 px-1.5 py-0.5 rounded bg-white flex items-center justify-between">
                          <span className="truncate">{item.name}:</span>
                          <span className={`font-bold ml-1 ${item.status === 'Normal' ? 'text-green-700' : item.status === 'Minus' ? 'text-amber-700' : 'text-red-700'}`}>
                            {item.status}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Rincian Finansial & Taksiran */}
              <div className="border border-gray-300 p-2.5 rounded bg-purple-50/50 space-y-1">
                <span className="font-bold text-[10px] uppercase text-purple-900 block">
                  III. KESEPAKATAN HARGA TAKSIRAN & PEMOTONGAN KASIR
                </span>
                <div className="flex justify-between items-center text-[10px]">
                  <div>
                    <p className="text-gray-600">Estimasi Pasaran Normal: <span className="font-mono font-semibold">Rp {(tradeIn.marketEstimatePrice || tradeIn.valuationAmount).toLocaleString('id-ID')}</span></p>
                    {tradeIn.targetNewProductName && (
                      <p className="text-gray-700 mt-0.5">Unit Baru Yang Dibeli: <span className="font-bold">{tradeIn.targetNewProductName}</span></p>
                    )}
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] text-gray-600 uppercase font-bold block">NILAI BERSIH POTONGAN / BUYBACK:</span>
                    <span className="text-base font-extrabold font-mono text-purple-900">
                      Rp {tradeIn.valuationAmount.toLocaleString('id-ID')}
                    </span>
                  </div>
                </div>

                {deductionList.length > 0 && (
                  <div className="text-[9px] text-gray-600 pt-1 border-t border-purple-200">
                    <span className="font-bold">Potongan Minus:</span> {deductionList.map(d => `${d.reason} (-Rp ${d.amount.toLocaleString('id-ID')})`).join(', ')}
                  </div>
                )}
              </div>

              {/* Klausul Legalitas & Jaminan Hukum Bebas Barang Curian */}
              <div className="border border-gray-300 p-2.5 rounded text-[8.5px] leading-relaxed text-gray-700 space-y-1">
                <span className="font-bold uppercase text-gray-900 block">IV. PERNYATAAN & JAMINAN HUKUM PIHAK PERTAMA</span>
                <ol className="list-decimal pl-4 space-y-0.5">
                  <li>Pihak Pertama menyatakan dengan sesungguhnya bahwa unit perangkat di atas adalah **MILIK PRIBADI YANG SAH** dan bukan merupakan barang curian, barang gadai tanpa izin, atau barang hasil tindak pidana lainnya.</li>
                  <li>Pihak Pertama telah mengeluarkan/logout seluruh akun pribadi (Apple ID / iCloud, Google Account, PIN/Pola Layar) dan membebaskan Pihak Toko dari segala isi data pribadi di dalam perangkat.</li>
                  <li>Apabila di kemudian hari terbukti unit perangkat tersebut bermasalah secara hukum (termasuk sengketa kepemilikan/laporan kehilangan kepolisian), maka Pihak Pertama bersedia **BERTANGGUNG JAWAB PENUH SECARA HUKUM** dan mengganti kerugian materiil kepada Pihak Toko sebesar 100% dari nilai transaksi.</li>
                </ol>
              </div>

              {/* Kolom Tanda Tangan */}
              <div className="pt-3 grid grid-cols-2 gap-8 text-center text-[10px]">
                <div className="space-y-12">
                  <p className="font-bold">Pihak Pertama (Penjual / Pemilik),</p>
                  <div>
                    <p className="font-bold underline uppercase font-mono">({tradeIn.customerName})</p>
                    <p className="text-[9px] text-gray-500">NIK: {tradeIn.customerNik || '..................................'}</p>
                  </div>
                </div>
                <div className="space-y-12">
                  <p className="font-bold">Pihak Kedua (Petugas Toko / Kasir),</p>
                  <div>
                    <p className="font-bold underline uppercase font-mono">({tradeIn.receivedByStaffName || tradeIn.receivedByUserId || 'Kasir OmniPOS'})</p>
                    <p className="text-[9px] text-gray-500">{storeName}</p>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            /* ========================================================================= */
            /* THERMAL FORMAT (80MM): SLIP TEMPEL UNIT & BUKTI TERIMA TUKAR TAMBAH      */
            /* ========================================================================= */
            <div id="tradein-spjb-thermal" className="bg-white text-black p-4 w-[80mm] min-h-[140mm] shadow-lg rounded text-[10px] font-mono space-y-2 printable-thermal printable-document">
              <div className="text-center border-b border-black pb-2">
                <h3 className="font-bold text-xs uppercase">{storeName}</h3>
                <p className="text-[8px]">{storeAddress}</p>
                <p className="text-[8px]">Telp: {storePhone}</p>
                <div className="mt-1 inline-block border border-black px-2 py-0.5 font-bold text-[9px]">
                  SLIP TUKAR TAMBAH / BUYBACK
                </div>
              </div>

              <div className="space-y-0.5 text-[9px]">
                <div className="flex justify-between"><span>No SPJB:</span><span className="font-bold">{tradeIn.tradeInNumber}</span></div>
                <div className="flex justify-between"><span>Tanggal:</span><span>{new Date(tradeIn.transactionDate).toLocaleDateString('id-ID')}</span></div>
                <div className="flex justify-between"><span>Pelanggan:</span><span className="font-bold">{tradeIn.customerName}</span></div>
                <div className="flex justify-between"><span>No Telp:</span><span>{tradeIn.customerPhone || '-'}</span></div>
                <div className="flex justify-between"><span>No NIK:</span><span>{tradeIn.customerNik || '-'}</span></div>
              </div>

              <div className="border-t border-dashed border-black pt-1.5 space-y-0.5 text-[9px]">
                <div className="font-bold uppercase text-[9.5px]">{tradeIn.deviceBrandModel}</div>
                <div className="flex justify-between"><span>IMEI/SN:</span><span className="font-bold">{tradeIn.imeiOrSerial || '-'}</span></div>
                <div className="flex justify-between"><span>Grade:</span><span className="font-bold">{tradeIn.conditionGrade}</span></div>
                <div className="flex justify-between"><span>Battery Health:</span><span className="font-bold">{tradeIn.batteryHealthPercent || 100}%</span></div>
                <div className="flex justify-between"><span>Kelengkapan:</span><span>{tradeIn.accessoriesIncluded}</span></div>
                <div><span className="text-gray-700">Catatan:</span> {tradeIn.functionalNotes}</div>
              </div>

              <div className="border-t-2 border-black pt-1.5 flex justify-between items-center text-[10px] font-bold">
                <span>NILAI POTONGAN:</span>
                <span>Rp {tradeIn.valuationAmount.toLocaleString('id-ID')}</span>
              </div>

              <div className="border-t border-dashed border-black pt-2 text-center text-[7.5px] text-gray-700 leading-tight space-y-1">
                <p>Unit dijamin bukan barang curian dan akun pribadi telah di-logout.</p>
                <div className="flex justify-around pt-3">
                  <div>
                    <p className="mb-6">Pelanggan,</p>
                    <p className="font-bold">({tradeIn.customerName.slice(0, 10)})</p>
                  </div>
                  <div>
                    <p className="mb-6">Petugas,</p>
                    <p className="font-bold">({(tradeIn.receivedByStaffName || 'Kasir').slice(0, 10)})</p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between pt-2 border-t border-border-subtle shrink-0">
          <div className="text-xs text-text-muted">
            Format aktif: <span className="font-bold text-text-primary uppercase">{printFormat}</span>
          </div>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-subtle hover:bg-card-hover border border-border-subtle rounded-xl text-text-secondary font-semibold text-xs"
            >
              Tutup
            </button>
            <button
              type="button"
              onClick={handlePrint}
              className="px-5 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl font-bold text-xs shadow-md flex items-center gap-1.5 transition-all"
            >
              <Printer className="w-4 h-4" />
              <span>Cetak Dokumen</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
