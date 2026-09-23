import React, { useRef } from 'react';
import { 
  Printer, 
  X, 
  Copy, 
  Check, 
  Share2, 
  FileText, 
  Building2, 
  DollarSign, 
  CreditCard,
  QrCode,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { ZReport } from '../../types';
import { useAuthStore } from '../../store/useAuthStore';
import { useSettingsStore } from '../../store/useSettingsStore';
import { useHardwareStore } from '../../store/useHardwareStore';
import { useToastStore } from '../../store/useToastStore';
import { useShiftStore } from '../../store/useShiftAndThemeStores';

interface ThermalZReportModalProps {
  isOpen?: boolean;
  onClose?: () => void;
  zReport?: ZReport | null;
  shiftId?: string;
  onFinishedLogout?: () => void;
}

export const ThermalZReportModal: React.FC<ThermalZReportModalProps> = ({
  isOpen,
  onClose,
  zReport: propZReport,
  shiftId,
  onFinishedLogout,
}) => {
  const { storeInfo } = useAuthStore();
  const { isThermalZReportOpen, zReportData, closeThermalZReport } = useShiftStore();
  const [copied, setCopied] = React.useState(false);
  const [isPrintingHardware, setIsPrintingHardware] = React.useState(false);
  const receiptRef = useRef<HTMLDivElement>(null);

  const showModal = isOpen !== undefined ? isOpen : isThermalZReportOpen;
  const effectiveZReport = propZReport !== undefined ? propZReport : zReportData;
  const handleModalClose = onClose || closeThermalZReport;

  if (!showModal || !effectiveZReport) return null;

  const zReport = effectiveZReport;

  const storeName = storeInfo?.storeName || 'OMNIPOS STORE';
  const storeAddress = storeInfo?.storeAddress || 'Jl. Bisnis Ritel Modern No. 1';
  const storePhone = storeInfo?.storePhone || '0812-3456-7890';

  const startDateFormatted = new Date(zReport.startTime).toLocaleString('id-ID', {
    dateStyle: 'short',
    timeStyle: 'short',
  });
  const endDateFormatted = new Date(zReport.endTime).toLocaleString('id-ID', {
    dateStyle: 'short',
    timeStyle: 'short',
  });

  const durationMinutes = Math.max(0, Math.round(
    (new Date(zReport.endTime).getTime() - new Date(zReport.startTime).getTime()) / 60000
  ));
  const durationHours = Math.floor(durationMinutes / 60);
  const durationRemainingMinutes = durationMinutes % 60;

  const targetShiftId = shiftId || zReport.shiftId || zReport.id || zReport.shiftNumber;

  const handleHardwarePrint = async () => {
    if (!targetShiftId) {
      handleBrowserPrint();
      return;
    }

    try {
      setIsPrintingHardware(true);
      useToastStore.getState().showToast('Mengirim perintah cetak Z-Report ke printer thermal...', 'info');
      const res = await fetch(`/api/v1/shifts/${targetShiftId}/print-zreport`, { method: 'POST' });
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          useToastStore.getState().showToast('Struk Z-Report fisik berhasil dicetak & laci kas terbuka!', 'success');
          return;
        }
      }
      // If hardware fails, fallback to browser print
      useToastStore.getState().showToast('Printer fisik tidak merespon. Membuka dialog cetak browser...', 'warning');
      handleBrowserPrint();
    } catch {
      useToastStore.getState().showToast('Gagal menghubungi hardware. Mengalihkan ke cetak browser...', 'warning');
      handleBrowserPrint();
    } finally {
      setIsPrintingHardware(false);
    }
  };

  const handleBrowserPrint = () => {
    const printContent = receiptRef.current?.innerHTML;
    if (!printContent) return;

    const printWindow = window.open('', '_blank', 'width=450,height=750');
    if (!printWindow) return;

    printWindow.document.write(`
      <html>
        <head>
          <title>Struk Z-Report ${zReport.shiftNumber}</title>
          <style>
            @page { size: 80mm auto; margin: 0; }
            body {
              font-family: 'Courier New', Courier, monospace;
              width: 72mm;
              margin: 0 auto;
              padding: 10px 4px;
              color: #000;
              font-size: 11px;
              line-height: 1.35;
            }
            .center { text-align: center; }
            .right { text-align: right; }
            .bold { font-weight: bold; }
            .line { border-top: 1px dashed #000; margin: 6px 0; }
            .double-line { border-top: 1px double #000; margin: 6px 0; }
            .row { display: flex; justify-content: space-between; margin: 2px 0; }
            .title { font-size: 13px; font-weight: bold; margin: 2px 0; }
            .store-name { font-size: 15px; font-weight: bold; }
            .footer { font-size: 9px; text-align: center; margin-top: 14px; }
          </style>
        </head>
        <body onload="window.print(); window.close();">
          ${printContent}
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  const handleCopyText = () => {
    const lines = [
      `================================`,
      `       ${storeName.toUpperCase()}       `,
      `   ${storeAddress}   `,
      `       Telp: ${storePhone}       `,
      `================================`,
      `   RINGKASAN SHIFT (Z-REPORT)   `,
      `================================`,
      `No. Shift : ${zReport.shiftNumber}`,
      `Kasir     : ${zReport.cashierName}`,
      `Mulai     : ${startDateFormatted}`,
      `Selesai   : ${endDateFormatted}`,
      `Durasi    : ${durationHours}j ${durationRemainingMinutes}m`,
      `--------------------------------`,
      `[ REKONSILIASI KAS LACI ]`,
      `Modal Awal Kas    : Rp ${zReport.startingCash.toLocaleString('id-ID')}`,
      `(+) Penjualan Tunai: Rp ${zReport.totalCashSales.toLocaleString('id-ID')}`,
      `(+) Kas Masuk      : Rp ${zReport.totalCashIn.toLocaleString('id-ID')}`,
      `(-) Kas Keluar     : Rp ${zReport.totalCashOut.toLocaleString('id-ID')}`,
      `--------------------------------`,
      `Kas Diharapkan    : Rp ${zReport.expectedCash.toLocaleString('id-ID')}`,
      `Uang Fisik Kasir  : Rp ${zReport.actualCashCount.toLocaleString('id-ID')}`,
      `Selisih Kas       : Rp ${zReport.cashDiscrepancy.toLocaleString('id-ID')} (${zReport.cashDiscrepancy === 0 ? 'SEIMBANG' : zReport.cashDiscrepancy > 0 ? 'LEBIH' : 'KURANG'})`,
      `--------------------------------`,
      `[ RINGKASAN PENJUALAN ]`,
      `Total Struk       : ${zReport.totalTransactions} Transaksi`,
      `Penjualan Kotor   : Rp ${zReport.grossSales.toLocaleString('id-ID')}`,
      `Diskon & Promo    : -Rp ${zReport.totalDiscounts.toLocaleString('id-ID')}`,
      `Penjualan Bersih  : Rp ${zReport.netSales.toLocaleString('id-ID')}`,
      `================================`,
      `Dicetak: ${new Date().toLocaleString('id-ID')}`,
      `================================`,
    ];

    navigator.clipboard.writeText(lines.join('\n'));
    setCopied(true);
    useToastStore.getState().showToast('Teks struk Z-Report berhasil disalin!', 'success');
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDone = () => {
    handleModalClose();
    if (onFinishedLogout) {
      onFinishedLogout();
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4 select-none">
      <div className="bg-surface border border-border-strong w-full max-w-md rounded-2xl shadow-2xl flex flex-col max-h-[92vh] overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        
        {/* Header Modal */}
        <div className="px-5 py-4 border-b border-border-subtle flex items-center justify-between bg-subtle">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center font-bold">
              <Printer className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-text-primary">Struk Thermal Kasir (Z-Report)</h2>
              <p className="text-[11px] text-text-secondary">Pratinjau ringkasan penutupan shift kasir</p>
            </div>
          </div>
          <button 
            onClick={handleModalClose}
            className="p-1 rounded-lg text-text-muted hover:text-text-primary hover:bg-card-hover transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Receipt Preview (Thermal Look & Feel) */}
        <div className="flex-1 overflow-y-auto p-5 bg-subtle/50 flex justify-center">
          <div 
            ref={receiptRef}
            className="w-full max-w-[340px] bg-white text-zinc-900 p-5 rounded-lg shadow-md border border-zinc-200 font-mono text-[11px] leading-relaxed select-text"
          >
            {/* Store Header */}
            <div className="text-center space-y-0.5">
              <p className="text-sm font-black tracking-tight">{storeName}</p>
              <p className="text-[10px] text-zinc-600">{storeAddress}</p>
              <p className="text-[10px] text-zinc-600">Telp: {storePhone}</p>
              <div className="border-t border-dashed border-zinc-400 my-2.5" />
              <p className="text-xs font-black tracking-wider uppercase">RINGKASAN SHIFT (Z-REPORT)</p>
              <div className="border-t border-dashed border-zinc-400 my-2.5" />
            </div>

            {/* Shift Meta */}
            <div className="space-y-1 text-[10.5px]">
              <div className="flex justify-between">
                <span>No. Shift</span>
                <span className="font-bold">{zReport.shiftNumber}</span>
              </div>
              <div className="flex justify-between">
                <span>Kasir</span>
                <span className="font-bold">{zReport.cashierName}</span>
              </div>
              <div className="flex justify-between">
                <span>Mulai</span>
                <span>{startDateFormatted}</span>
              </div>
              <div className="flex justify-between">
                <span>Selesai</span>
                <span>{endDateFormatted}</span>
              </div>
              <div className="flex justify-between text-zinc-600">
                <span>Durasi</span>
                <span>{durationHours} jam {durationRemainingMinutes} mnt</span>
              </div>
            </div>

            <div className="border-t border-dashed border-zinc-400 my-2.5" />

            {/* Cash Drawer Reconciliation */}
            <div className="space-y-1">
              <p className="text-center font-bold uppercase text-[10px] tracking-wider text-zinc-700">
                [ REKONSILIASI KAS LACI ]
              </p>
              <div className="flex justify-between">
                <span>Modal Awal Kas</span>
                <span>Rp {zReport.startingCash.toLocaleString('id-ID')}</span>
              </div>
              <div className="flex justify-between text-emerald-700 font-semibold">
                <span>(+) Penjualan Tunai</span>
                <span>+Rp {zReport.totalCashSales.toLocaleString('id-ID')}</span>
              </div>
              <div className="flex justify-between text-blue-700">
                <span>(+) Kas Masuk (In)</span>
                <span>+Rp {zReport.totalCashIn.toLocaleString('id-ID')}</span>
              </div>
              <div className="flex justify-between text-rose-700">
                <span>(-) Kas Keluar (Out)</span>
                <span>-Rp {zReport.totalCashOut.toLocaleString('id-ID')}</span>
              </div>
              <div className="border-t border-dashed border-zinc-300 my-1.5" />
              <div className="flex justify-between font-bold">
                <span>Kas Diharapkan</span>
                <span>Rp {zReport.expectedCash.toLocaleString('id-ID')}</span>
              </div>
              <div className="flex justify-between font-bold">
                <span>Uang Fisik Dihitung</span>
                <span>Rp {zReport.actualCashCount.toLocaleString('id-ID')}</span>
              </div>
              <div className={`flex justify-between font-extrabold text-[11.5px] ${
                zReport.cashDiscrepancy === 0 
                  ? 'text-emerald-700' 
                  : zReport.cashDiscrepancy > 0 
                  ? 'text-amber-700' 
                  : 'text-rose-700'
              }`}>
                <span>Selisih Kas</span>
                <span>
                  {zReport.cashDiscrepancy === 0 
                    ? 'Rp 0 (PAS)' 
                    : zReport.cashDiscrepancy > 0 
                    ? `+Rp ${zReport.cashDiscrepancy.toLocaleString('id-ID')} (LEBIH)` 
                    : `-Rp ${Math.abs(zReport.cashDiscrepancy).toLocaleString('id-ID')} (KURANG)`}
                </span>
              </div>
            </div>

            {/* Payment Method Breakdown (if available) */}
            {zReport.payments && zReport.payments.length > 0 && (
              <>
                <div className="border-t border-dashed border-zinc-400 my-2.5" />
                <div className="space-y-1">
                  <p className="text-center font-bold uppercase text-[10px] tracking-wider text-zinc-700">
                    [ REKAP CARA BAYAR ]
                  </p>
                  {zReport.payments.map((p, idx) => (
                    <div key={idx} className="flex justify-between">
                      <span>{p.method} ({p.count}x)</span>
                      <span>Rp {p.amount.toLocaleString('id-ID')}</span>
                    </div>
                  ))}
                </div>
              </>
            )}

            <div className="border-t border-dashed border-zinc-400 my-2.5" />

            {/* Sales Summary */}
            <div className="space-y-1">
              <p className="text-center font-bold uppercase text-[10px] tracking-wider text-zinc-700">
                [ RINGKASAN PENJUALAN ]
              </p>
              <div className="flex justify-between">
                <span>Total Struk Sukses</span>
                <span className="font-bold">{zReport.totalTransactions} Struk</span>
              </div>
              <div className="flex justify-between">
                <span>Penjualan Kotor</span>
                <span>Rp {zReport.grossSales.toLocaleString('id-ID')}</span>
              </div>
              {zReport.totalDiscounts > 0 && (
                <div className="flex justify-between text-rose-700">
                  <span>Diskon & Promo</span>
                  <span>-Rp {zReport.totalDiscounts.toLocaleString('id-ID')}</span>
                </div>
              )}
              <div className="border-t border-dashed border-zinc-300 my-1" />
              <div className="flex justify-between font-black text-xs">
                <span>PENJUALAN BERSIH</span>
                <span>Rp {zReport.netSales.toLocaleString('id-ID')}</span>
              </div>
            </div>

            {/* Notes */}
            {zReport.closingNotes && (
              <>
                <div className="border-t border-dashed border-zinc-400 my-2.5" />
                <p className="text-[10px] text-zinc-700">
                  <strong>Catatan:</strong> {zReport.closingNotes}
                </p>
              </>
            )}

            {/* Signature Block */}
            <div className="border-t border-dashed border-zinc-400 my-4" />
            <div className="grid grid-cols-2 text-center text-[10px] gap-2 pt-1">
              <div>
                <p>Diserahkan,</p>
                <div className="h-10" />
                <p className="font-bold border-t border-zinc-300 pt-1">
                  ({zReport.cashierName})
                </p>
              </div>
              <div>
                <p>Diterima,</p>
                <div className="h-10" />
                <p className="font-bold border-t border-zinc-300 pt-1">
                  ( Supervisor / Owner )
                </p>
              </div>
            </div>

            <p className="text-center text-[9px] text-zinc-500 mt-4">
              Dicetak: {new Date().toLocaleString('id-ID')}
            </p>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 bg-surface border-t border-border-subtle space-y-2">
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={handleHardwarePrint}
              disabled={isPrintingHardware}
              className="py-2.5 px-3 rounded-xl bg-primary hover:bg-primary-hover text-primary-text font-bold text-xs flex items-center justify-center gap-1.5 shadow-sm transition-all"
            >
              <Printer className="w-4 h-4" />
              <span>{isPrintingHardware ? 'Mencetak...' : 'Cetak Thermal (ESC/POS)'}</span>
            </button>

            <button
              onClick={handleBrowserPrint}
              className="py-2.5 px-3 rounded-xl bg-card hover:bg-card-hover border border-border-strong text-text-primary font-bold text-xs flex items-center justify-center gap-1.5 transition-all"
            >
              <FileText className="w-4 h-4" />
              <span>Cetak Browser / PDF</span>
            </button>
          </div>

          <div className="flex items-center justify-between pt-1">
            <button
              onClick={handleCopyText}
              className="text-xs text-text-secondary hover:text-text-primary flex items-center gap-1.5 transition-colors"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-status-success" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Tersalin!' : 'Salin Teks Struk'}</span>
            </button>

            <button
              onClick={handleDone}
              className="px-4 py-1.5 rounded-lg bg-subtle hover:bg-card-hover border border-border-subtle text-xs font-bold text-text-primary transition-colors"
            >
              {onFinishedLogout ? 'Selesai & Keluar' : 'Tutup'}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
