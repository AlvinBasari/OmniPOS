import React, { useState, useRef } from 'react';
import { 
  Printer, 
  X, 
  FileText, 
  Receipt, 
  Copy, 
  Check, 
  Truck, 
  Building2, 
  Package, 
  ShieldCheck 
} from 'lucide-react';
import { StockTransfer } from '../../types';
import { useSettingsStore } from '../../store/useSettingsStore';
import { useToastStore } from '../../store/useToastStore';
import { printElement } from '../../utils/printHelper';

interface StockTransferPrintModalProps {
  isOpen: boolean;
  onClose: () => void;
  transfer: StockTransfer | null;
  storeName?: string;
  storeAddress?: string;
  storePhone?: string;
}

export const StockTransferPrintModal: React.FC<StockTransferPrintModalProps> = ({
  isOpen,
  onClose,
  transfer,
  storeName = 'OMNIPOS STORE & WAREHOUSE',
  storeAddress = 'Zona Logistik & Pergudangan Terpadu',
  storePhone = '0812-3456-7890'
}) => {
  const [printFormat, setPrintFormat] = useState<'A4' | 'THERMAL'>('A4');
  const [isCopied, setIsCopied] = useState(false);
  const [isPrinting, setIsPrinting] = useState(false);
  const printAreaRef = useRef<HTMLDivElement>(null);

  if (!isOpen || !transfer) return null;

  const handleBrowserPrint = () => {
    if (printAreaRef.current) {
      printElement(printAreaRef.current, {
        title: `Surat Jalan Mutasi - ${transfer.transferNumber}`,
        pageSize: printFormat === 'A4' ? 'A4' : '80mm'
      });
    } else {
      window.print();
    }
  };

  const handleCopyText = () => {
    if (!printAreaRef.current) return;
    navigator.clipboard.writeText(printAreaRef.current.innerText);
    setIsCopied(true);
    useToastStore.getState().showToast('Teks surat jalan berhasil disalin!', 'success');
    setTimeout(() => setIsCopied(false), 2000);
  };

  const statusLabel = transfer.status === 'Received' ? 'SELESAI (DITERIMA)'
    : transfer.status === 'InTransit' ? 'DALAM PERJALANAN (IN-TRANSIT)'
    : transfer.status === 'PartiallyReceived' ? 'DITERIMA SEBAGIAN (ADA SELISIH)'
    : transfer.status === 'Cancelled' ? 'DIBATALKAN'
    : 'DRAFT';

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4 select-none">
      <div className="bg-surface border border-border-strong w-full max-w-2xl rounded-2xl shadow-2xl flex flex-col max-h-[92vh] overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Modal Header */}
        <div className="px-5 py-4 border-b border-border-subtle flex items-center justify-between bg-subtle">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center font-bold">
              <FileText className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-text-primary">
                Cetak Surat Jalan & Label Transfer Stok
              </h2>
              <p className="text-[11px] text-text-secondary font-mono">
                No. Dokumen: {transfer.transferNumber}
              </p>
            </div>
          </div>
          
          {/* Format Switcher */}
          <div className="flex items-center gap-2">
            <div className="flex bg-card p-0.5 rounded-lg border border-border-subtle text-xs">
              <button
                type="button"
                onClick={() => setPrintFormat('A4')}
                className={`px-3 py-1 rounded-md font-bold transition-all flex items-center gap-1.5 ${
                  printFormat === 'A4'
                    ? 'bg-primary text-white shadow-xs'
                    : 'text-text-secondary hover:text-text-primary'
                }`}
              >
                <FileText className="w-3.5 h-3.5" />
                <span>Surat Jalan A4</span>
              </button>
              <button
                type="button"
                onClick={() => setPrintFormat('THERMAL')}
                className={`px-3 py-1 rounded-md font-bold transition-all flex items-center gap-1.5 ${
                  printFormat === 'THERMAL'
                    ? 'bg-primary text-white shadow-xs'
                    : 'text-text-secondary hover:text-text-primary'
                }`}
              >
                <Receipt className="w-3.5 h-3.5" />
                <span>Label Thermal 80mm</span>
              </button>
            </div>

            <button
              onClick={onClose}
              className="p-1 rounded-lg text-text-muted hover:text-text-primary hover:bg-card-hover transition-colors ml-1"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Print Preview Scrollable Canvas */}
        <div className="flex-1 overflow-y-auto p-5 bg-subtle/50 flex justify-center">
          {printFormat === 'A4' ? (
            /* Format Surat Jalan Resmi A4 */
            <div 
              ref={printAreaRef}
              className="w-full max-w-[560px] bg-white text-zinc-900 p-6 rounded-xl shadow-lg border border-zinc-300 font-sans text-[11px] leading-relaxed select-text space-y-4"
            >
              {/* Kop Toko */}
              <div className="border-b-2 border-zinc-800 pb-3 flex justify-between items-start">
                <div>
                  <h1 className="text-base font-black tracking-tight uppercase text-zinc-900">
                    {storeName || 'OMNIPOS STORE & WAREHOUSE'}
                  </h1>
                  <p className="text-[10px] text-zinc-600">{storeAddress || 'Zona Logistik & Pergudangan'}</p>
                  <p className="text-[10px] text-zinc-600">Telp: {storePhone || '0812-3456-7890'}</p>
                </div>
                <div className="text-right">
                  <span className="inline-block px-2.5 py-1 bg-zinc-900 text-white font-black text-xs uppercase tracking-wider rounded">
                    SURAT JALAN TRANSFER
                  </span>
                  <p className="text-xs font-bold font-mono text-zinc-800 mt-1">
                    {transfer.transferNumber}
                  </p>
                  <p className="text-[10px] text-zinc-500 font-mono">
                    Tgl: {new Date(transfer.transferDate).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </p>
                </div>
              </div>

              {/* Rute & Ekspedisi Box */}
              <div className="grid grid-cols-2 gap-3 p-3 bg-zinc-50 rounded-lg border border-zinc-200 text-[10.5px]">
                <div className="space-y-1">
                  <p className="font-bold text-zinc-500 uppercase text-[9.5px]">GUDANG ASAL (PENGIRIM):</p>
                  <p className="font-extrabold text-zinc-900 text-xs">{transfer.sourceWarehouseName}</p>
                  <p className="text-zinc-600 text-[10px]">Petugas: {transfer.dispatchedByStaffName || 'Staff Logistik'}</p>
                  <p className="text-zinc-500 text-[10px]">Waktu Kirim: {transfer.dispatchedAt ? new Date(transfer.dispatchedAt).toLocaleTimeString('id-ID') : '-'}</p>
                </div>
                <div className="space-y-1">
                  <p className="font-bold text-zinc-500 uppercase text-[9.5px]">GUDANG TUJUAN (PENERIMA):</p>
                  <p className="font-extrabold text-zinc-900 text-xs">{transfer.destinationWarehouseName}</p>
                  <p className="text-zinc-600 text-[10px]">Penerima: {transfer.receivedByStaffName || 'Menunggu verifikasi'}</p>
                  <p className="text-zinc-500 text-[10px]">Status: <strong>{statusLabel}</strong></p>
                </div>
              </div>

              {/* Info Driver & Ekspedisi */}
              <div className="grid grid-cols-3 gap-2 px-1 text-[10px] text-zinc-700">
                <div>
                  <span className="text-zinc-500">Supir / Kurir:</span> <strong>{transfer.driverOrCourierName || 'Kurir Internal'}</strong>
                </div>
                <div>
                  <span className="text-zinc-500">No. Kendaraan:</span> <strong className="font-mono">{transfer.vehicleNumber || '-'}</strong>
                </div>
                <div>
                  <span className="text-zinc-500">No. Resi AWB:</span> <strong className="font-mono">{transfer.trackingNumber || '-'}</strong>
                </div>
              </div>

              {/* Tabel Item Kirim */}
              <table className="w-full text-left text-[10.5px] border-collapse border border-zinc-300">
                <thead>
                  <tr className="bg-zinc-100 text-zinc-800 font-bold border-b border-zinc-300">
                    <th className="py-1.5 px-2 border-r border-zinc-300 text-center w-8">No</th>
                    <th className="py-1.5 px-2 border-r border-zinc-300">Nama Barang & SKU</th>
                    <th className="py-1.5 px-2 border-r border-zinc-300 text-center w-20">Qty Kirim</th>
                    <th className="py-1.5 px-2 border-r border-zinc-300 text-center w-20">Qty Terima</th>
                    <th className="py-1.5 px-2">Catatan Koli</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-200">
                  {(transfer.items || []).map((item, idx) => (
                    <tr key={idx}>
                      <td className="py-1.5 px-2 text-center border-r border-zinc-300 text-zinc-500 font-mono">{idx + 1}</td>
                      <td className="py-1.5 px-2 border-r border-zinc-300">
                        <p className="font-bold text-zinc-900">{item.productName}</p>
                        <p className="text-[9px] text-zinc-500 font-mono">SKU: {item.productSku}</p>
                      </td>
                      <td className="py-1.5 px-2 text-center border-r border-zinc-300 font-bold font-mono">
                        {item.quantitySent} {item.unit || 'PCS'}
                      </td>
                      <td className="py-1.5 px-2 text-center border-r border-zinc-300 font-mono">
                        {transfer.status === 'Received' || transfer.status === 'PartiallyReceived'
                          ? `${item.quantityReceived} ${item.unit || 'PCS'}`
                          : '[ ______ ]'}
                      </td>
                      <td className="py-1.5 px-2 text-[10px] text-zinc-600">
                        {item.notes || '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="bg-zinc-50 font-bold border-t border-zinc-300">
                    <td colSpan={2} className="py-2 px-2 text-right border-r border-zinc-300">
                      TOTAL KUANTITAS:
                    </td>
                    <td className="py-2 px-2 text-center font-mono border-r border-zinc-300 text-xs">
                      {transfer.totalQuantitySent} Unit
                    </td>
                    <td className="py-2 px-2 text-center font-mono text-xs border-r border-zinc-300">
                      {transfer.status === 'Received' || transfer.status === 'PartiallyReceived'
                        ? `${transfer.totalQuantityReceived} Unit`
                        : '-'}
                    </td>
                    <td className="py-2 px-2 text-[10px] text-zinc-500">
                      {transfer.items?.length || 0} Variasi
                    </td>
                  </tr>
                </tfoot>
              </table>

              {/* Catatan Khusus */}
              {transfer.notes && (
                <div className="p-2 bg-amber-50 border border-amber-200 rounded text-[10px] text-amber-900">
                  <strong>Instruksi Pengiriman:</strong> {transfer.notes}
                </div>
              )}

              {/* Discrepancy Box */}
              {transfer.discrepancyNotes && (
                <div className="p-2 bg-rose-50 border border-rose-200 rounded text-[10px] text-rose-900">
                  <strong>Catatan Selisih Penerimaan:</strong> {transfer.discrepancyNotes}
                </div>
              )}

              {/* Tanda Tangan 3 Pihak */}
              <div className="grid grid-cols-3 gap-2 pt-3 text-center text-[10px] border-t border-zinc-300">
                <div className="space-y-10">
                  <p className="font-semibold text-zinc-600">Petugas Pengirim,</p>
                  <p className="font-bold border-t border-zinc-400 pt-1 mx-2">
                    ( {transfer.dispatchedByStaffName || 'Staff Pengirim'} )
                  </p>
                </div>
                <div className="space-y-10">
                  <p className="font-semibold text-zinc-600">Sopir / Kurir Pengantar,</p>
                  <p className="font-bold border-t border-zinc-400 pt-1 mx-2">
                    ( {transfer.driverOrCourierName || 'Kurir Ekspedisi'} )
                  </p>
                </div>
                <div className="space-y-10">
                  <p className="font-semibold text-zinc-600">Petugas Penerima,</p>
                  <p className="font-bold border-t border-zinc-400 pt-1 mx-2">
                    ( {transfer.receivedByStaffName || 'Supervisor Penerima'} )
                  </p>
                </div>
              </div>

              <p className="text-center text-[8.5px] text-zinc-400 pt-1">
                Dicetak otomatis oleh OmniPOS Enterprise Multi-Warehouse System · {new Date().toLocaleString('id-ID')}
              </p>
            </div>
          ) : (
            /* Format Slip Koli Thermal 80mm */
            <div
              ref={printAreaRef}
              className="w-full max-w-[340px] bg-white text-zinc-900 p-5 rounded-lg shadow-md border border-zinc-200 font-mono text-[11px] leading-relaxed select-text space-y-2"
            >
              {/* Header Struk */}
              <div className="text-center space-y-0.5">
                <p className="text-sm font-black tracking-tight">{storeName || 'OMNIPOS'}</p>
                <p className="text-[10px] text-zinc-600">LABEL KOLI TRANSFER STOK</p>
                <div className="border-t border-dashed border-zinc-400 my-2" />
                <p className="text-xs font-black tracking-wider uppercase">{transfer.transferNumber}</p>
                <p className="text-[10px] text-zinc-500">
                  Tgl: {new Date(transfer.transferDate).toLocaleDateString('id-ID')}
                </p>
                <div className="border-t border-dashed border-zinc-400 my-2" />
              </div>

              {/* Rute Singkat */}
              <div className="space-y-1 text-[10.5px]">
                <div className="flex justify-between">
                  <span className="text-zinc-500">Asal:</span>
                  <span className="font-bold">{transfer.sourceWarehouseName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-500">Tujuan:</span>
                  <span className="font-bold">{transfer.destinationWarehouseName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-500">Kurir:</span>
                  <span>{transfer.driverOrCourierName || 'Internal'} {transfer.vehicleNumber ? `(${transfer.vehicleNumber})` : ''}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-500">Status:</span>
                  <span className="font-bold">{statusLabel}</span>
                </div>
              </div>

              <div className="border-t border-dashed border-zinc-400 my-2" />

              {/* Daftar Barang */}
              <div className="space-y-1.5">
                {(transfer.items || []).map((item, idx) => (
                  <div key={idx} className="flex justify-between text-[10px]">
                    <div className="truncate pr-2">
                      <p className="font-bold">{item.productName}</p>
                      <p className="text-[9px] text-zinc-500">{item.productSku}</p>
                    </div>
                    <span className="font-bold font-mono shrink-0">
                      {item.quantitySent} {item.unit || 'PCS'}
                    </span>
                  </div>
                ))}
              </div>

              <div className="border-t border-dashed border-zinc-400 my-2" />

              {/* Summary Qty */}
              <div className="flex justify-between font-black text-xs">
                <span>TOTAL BARANG:</span>
                <span>{transfer.totalQuantitySent} UNIT</span>
              </div>

              {/* Tanda Tangan */}
              <div className="grid grid-cols-2 gap-2 pt-4 text-center text-[9.5px]">
                <div>
                  <p>Pengirim,</p>
                  <div className="h-8" />
                  <p className="border-t border-zinc-300 pt-0.5">({transfer.dispatchedByStaffName || 'Staff'})</p>
                </div>
                <div>
                  <p>Penerima,</p>
                  <div className="h-8" />
                  <p className="border-t border-zinc-300 pt-0.5">({transfer.receivedByStaffName || 'Staff'})</p>
                </div>
              </div>

              <p className="text-center text-[8.5px] text-zinc-400 pt-3">
                OmniPOS Offline-First
              </p>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-4 bg-surface border-t border-border-subtle flex items-center justify-between">
          <button
            onClick={handleCopyText}
            className="text-xs text-text-secondary hover:text-text-primary flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            {isCopied ? <Check className="w-3.5 h-3.5 text-status-success" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{isCopied ? 'Tersalin!' : 'Salin Teks Dokumen'}</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              onClick={handleBrowserPrint}
              className="py-2 px-4 rounded-xl bg-primary hover:bg-primary-hover text-primary-text font-bold text-xs flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>Cetak Sekarang (Ctrl+P)</span>
            </button>

            <button
              onClick={onClose}
              className="py-2 px-4 rounded-xl bg-subtle hover:bg-card-hover border border-border-subtle text-xs font-bold text-text-primary transition-colors cursor-pointer"
            >
              Tutup
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
