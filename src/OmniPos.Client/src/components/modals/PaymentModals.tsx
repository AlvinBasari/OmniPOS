import React, { useState, useEffect } from 'react';
import { 
  X, 
  Banknote, 
  QrCode, 
  CreditCard, 
  FileText, 
  CheckCircle2, 
  Printer, 
  Share2, 
  PlusCircle,
  AlertCircle
} from 'lucide-react';
import { PaymentMethod } from '../../types';
import { useToastStore } from '../../store/useToastStore';

// ==========================================
// 1. PAYMENT MODAL (SINGLE & SPLIT PAYMENT)
// ==========================================
export interface PaymentRow {
  method: PaymentMethod;
  amount: number;
  referenceNumber?: string;
}

interface PaymentModalProps {
  isOpen: boolean;
  totalAmount: number;
  customerName?: string;
  customerPoints?: number;
  onClose: () => void;
  onSubmitPayment: (payments: PaymentRow[]) => Promise<void>;
}

export const PaymentModal: React.FC<PaymentModalProps> = ({
  isOpen,
  totalAmount,
  customerName,
  customerPoints = 0,
  onClose,
  onSubmitPayment,
}) => {
  const [isSplitMode, setIsSplitMode] = useState<boolean>(false);
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod>('Cash');
  const [cashGiven, setCashGiven] = useState<string>(totalAmount.toString());
  const [refNumber, setRefNumber] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [qrisPayload, setQrisPayload] = useState<string | null>(null);

  // Split payment list
  const [splitPayments, setSplitPayments] = useState<PaymentRow[]>([]);
  const [splitAddMethod, setSplitAddMethod] = useState<PaymentMethod>('Cash');
  const [splitAddAmount, setSplitAddAmount] = useState<string>('');

  useEffect(() => {
    if (isOpen) {
      setIsSplitMode(false);
      setCashGiven(totalAmount.toString());
      setRefNumber('');
      setIsProcessing(false);
      setSelectedMethod('Cash');
      setQrisPayload(null);
      setSplitPayments([]);
      setSplitAddMethod('Cash');
      setSplitAddAmount(totalAmount.toString());
    }
  }, [isOpen, totalAmount]);

  if (!isOpen) return null;

  const cashVal = parseFloat(cashGiven) || 0;
  const changeVal = Math.max(0, cashVal - totalAmount);

  // Split calculations
  const totalSplitPaid = splitPayments.reduce((acc, p) => acc + p.amount, 0);
  const remainingSplitBalance = Math.max(0, totalAmount - totalSplitPaid);
  const splitChangeVal = Math.max(0, totalSplitPaid - totalAmount);

  const handleQuickCash = (addAmount: number) => {
    setCashGiven((cashVal + addAmount).toString());
  };

  const handleExactCash = () => {
    setCashGiven(totalAmount.toString());
  };

  const handleGenerateQris = () => {
    setSelectedMethod('QrisDynamic');
    setQrisPayload(`00020101021251440014ID.OR.GPN.WWW01189360091100200234560215000000000000000520458125303360540${totalAmount.toString().length}${totalAmount}5802ID5913OMNIPOS STORE6007JAKARTA62180114INV-${Date.now()}6304ABCD`);
  };

  const handleAddSplitRow = () => {
    const amt = parseFloat(splitAddAmount) || 0;
    if (amt <= 0) {
      useToastStore.getState().showToast('Masukkan nominal pembayaran yang valid.', 'warning');
      return;
    }
    const newPayments = [...splitPayments, { method: splitAddMethod, amount: amt, referenceNumber: refNumber || undefined }];
    setSplitPayments(newPayments);
    const newRemaining = Math.max(0, totalAmount - newPayments.reduce((acc, p) => acc + p.amount, 0));
    setSplitAddAmount(newRemaining > 0 ? newRemaining.toString() : '0');
    setRefNumber('');
  };

  const handleRemoveSplitRow = (index: number) => {
    const newPayments = splitPayments.filter((_, i) => i !== index);
    setSplitPayments(newPayments);
    const newRemaining = Math.max(0, totalAmount - newPayments.reduce((acc, p) => acc + p.amount, 0));
    setSplitAddAmount(newRemaining > 0 ? newRemaining.toString() : '0');
  };

  const handleConfirmSingle = async () => {
    if (selectedMethod === 'Cash' && cashVal < totalAmount) {
      useToastStore.getState().showToast('Nominal uang tunai kurang dari total tagihan!', 'warning');
      return;
    }

    try {
      setIsProcessing(true);
      const paid = selectedMethod === 'Cash' ? cashVal : totalAmount;
      await onSubmitPayment([
        {
          method: selectedMethod,
          amount: paid,
          referenceNumber: refNumber || undefined
        }
      ]);
    } catch {
      useToastStore.getState().showToast('Gagal memproses pembayaran!', 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleConfirmSplit = async () => {
    if (totalSplitPaid < totalAmount) {
      useToastStore.getState().showToast(`Pembayaran belum lunas! Kurang Rp ${remainingSplitBalance.toLocaleString('id-ID')}`, 'warning');
      return;
    }

    try {
      setIsProcessing(true);
      await onSubmitPayment(splitPayments);
    } catch {
      useToastStore.getState().showToast('Gagal memproses pembayaran split!', 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/75 flex items-center justify-center p-4">
      <div className="bg-surface border border-border-strong w-full max-w-2xl rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="px-5 py-4 border-b border-border-subtle flex items-center justify-between bg-subtle">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-text-primary">Metode Pembayaran Kasir</h2>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${isSplitMode ? 'bg-primary/20 text-primary border border-primary/40' : 'bg-card border border-border-subtle text-text-secondary'}`}>
                {isSplitMode ? 'SPLIT MULTI-BAYAR' : 'BAYAR TUNGGAL'}
              </span>
            </div>
            <p className="text-xs text-text-secondary mt-0.5">
              Total Tagihan: <span className="font-bold text-primary tabular-nums">Rp {totalAmount.toLocaleString('id-ID')}</span>
              {customerName && <span className="ml-2 text-text-muted">• Pelanggan: <strong className="text-text-primary">{customerName}</strong></span>}
            </p>
          </div>
          
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setIsSplitMode(!isSplitMode)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all border ${
                isSplitMode
                  ? 'bg-primary text-primary-text border-primary'
                  : 'bg-card hover:bg-card-hover border-border-subtle text-text-secondary'
              }`}
            >
              {isSplitMode ? '✓ Mode Split Aktif' : 'Split Payment (Multi-Bayar)'}
            </button>
            <button onClick={onClose} className="p-1 rounded-md text-text-muted hover:text-text-primary hover:bg-card-hover">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-5 flex-1 overflow-y-auto space-y-5">
          
          {/* ========================================================= */}
          {/* 1. SINGLE PAYMENT MODE */}
          {/* ========================================================= */}
          {!isSplitMode && (
            <>
              {/* Payment Method Selector Buttons */}
              <div className="grid grid-cols-4 gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedMethod('Cash')}
                  className={`p-3 rounded-lg border flex flex-col items-center gap-1.5 transition-all text-xs font-semibold ${
                    selectedMethod === 'Cash'
                      ? 'bg-primary/10 border-primary text-primary shadow-sm'
                      : 'bg-card border-border-subtle text-text-secondary hover:bg-card-hover'
                  }`}
                >
                  <Banknote className="w-5 h-5" />
                  <span>Tunai (Cash)</span>
                </button>

                <button
                  type="button"
                  onClick={handleGenerateQris}
                  className={`p-3 rounded-lg border flex flex-col items-center gap-1.5 transition-all text-xs font-semibold ${
                    selectedMethod === 'QrisDynamic'
                      ? 'bg-primary/10 border-primary text-primary shadow-sm'
                      : 'bg-card border-border-subtle text-text-secondary hover:bg-card-hover'
                  }`}
                >
                  <QrCode className="w-5 h-5" />
                  <span>QRIS Dinamis</span>
                </button>

                <button
                  type="button"
                  onClick={() => setSelectedMethod('DebitCard')}
                  className={`p-3 rounded-lg border flex flex-col items-center gap-1.5 transition-all text-xs font-semibold ${
                    selectedMethod === 'DebitCard'
                      ? 'bg-primary/10 border-primary text-primary shadow-sm'
                      : 'bg-card border-border-subtle text-text-secondary hover:bg-card-hover'
                  }`}
                >
                  <CreditCard className="w-5 h-5" />
                  <span>Kartu / EDC</span>
                </button>

                <button
                  type="button"
                  onClick={() => setSelectedMethod('CustomerReceivable')}
                  className={`p-3 rounded-lg border flex flex-col items-center gap-1.5 transition-all text-xs font-semibold ${
                    selectedMethod === 'CustomerReceivable'
                      ? 'bg-primary/10 border-primary text-primary shadow-sm'
                      : 'bg-card border-border-subtle text-text-secondary hover:bg-card-hover'
                  }`}
                >
                  <FileText className="w-5 h-5" />
                  <span>Kasbon (Piutang)</span>
                </button>
              </div>

              {/* Method: Cash Inputs & Quick Cash */}
              {selectedMethod === 'Cash' && (
                <div className="space-y-4 bg-subtle p-4 rounded-lg border border-border-subtle">
                  <div>
                    <label className="block text-xs font-semibold text-text-secondary mb-1">
                      Uang Tunai Diterima (Rp):
                    </label>
                    <input
                      type="number"
                      value={cashGiven}
                      onChange={(e) => setCashGiven(e.target.value)}
                      className="w-full text-2xl font-bold font-mono px-3 py-2 bg-card border border-border-strong rounded-md text-text-primary focus:outline-none focus:border-primary tabular-nums"
                      autoFocus
                    />
                  </div>

                  {/* Quick Cash Buttons */}
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={handleExactCash}
                      className="px-3 py-1.5 bg-card hover:bg-card-hover border border-border-subtle rounded-md text-xs font-bold text-text-primary"
                    >
                      Uang Pas (Rp {totalAmount.toLocaleString('id-ID')})
                    </button>
                    <button
                      type="button"
                      onClick={() => handleQuickCash(10000)}
                      className="px-3 py-1.5 bg-card hover:bg-card-hover border border-border-subtle rounded-md text-xs font-semibold text-text-secondary"
                    >
                      +10.000
                    </button>
                    <button
                      type="button"
                      onClick={() => handleQuickCash(20000)}
                      className="px-3 py-1.5 bg-card hover:bg-card-hover border border-border-subtle rounded-md text-xs font-semibold text-text-secondary"
                    >
                      +20.000
                    </button>
                    <button
                      type="button"
                      onClick={() => handleQuickCash(50000)}
                      className="px-3 py-1.5 bg-card hover:bg-card-hover border border-border-subtle rounded-md text-xs font-semibold text-text-secondary"
                    >
                      +50.000
                    </button>
                    <button
                      type="button"
                      onClick={() => handleQuickCash(100000)}
                      className="px-3 py-1.5 bg-card hover:bg-card-hover border border-border-subtle rounded-md text-xs font-semibold text-text-secondary"
                    >
                      +100.000
                    </button>
                  </div>

                  {/* Change Display */}
                  <div className="pt-2 border-t border-border-subtle flex items-center justify-between">
                    <span className="text-sm font-semibold text-text-secondary">Uang Kembalian:</span>
                    <span className={`text-xl font-bold font-mono tabular-nums ${changeVal >= 0 ? 'text-status-success' : 'text-status-danger'}`}>
                      Rp {changeVal.toLocaleString('id-ID')}
                    </span>
                  </div>
                </div>
              )}

              {/* Method: Dynamic QRIS */}
              {selectedMethod === 'QrisDynamic' && (
                <div className="bg-subtle p-5 rounded-lg border border-border-subtle text-center space-y-3">
                  <p className="text-xs font-semibold text-text-secondary">
                    Tampilkan QRIS ini ke pelanggan atau layar kedua (CFD)
                  </p>
                  <div className="w-48 h-48 mx-auto bg-white p-3 rounded-lg border border-border-strong flex flex-col items-center justify-center shadow-md">
                    <QrCode className="w-36 h-36 text-slate-900" />
                    <span className="text-[10px] font-bold text-slate-700 tracking-widest mt-1">QRIS NASIONAL</span>
                  </div>
                  <p className="text-xs font-bold text-primary tabular-nums">
                    Nominal Tersemat: Rp {totalAmount.toLocaleString('id-ID')}
                  </p>
                  <p className="text-[11px] text-text-muted">Mendukung BCA, Mandiri, BRI, GoPay, OVO, ShopeePay, DANA</p>
                </div>
              )}

              {/* Method: Debit / Credit Card */}
              {selectedMethod === 'DebitCard' && (
                <div className="space-y-3 bg-subtle p-4 rounded-lg border border-border-subtle">
                  <div>
                    <label className="block text-xs font-semibold text-text-secondary mb-1">
                      Nomor Referensi / Approval Code Mesin EDC:
                    </label>
                    <input
                      type="text"
                      placeholder="Contoh: REF-109283 / 882910"
                      value={refNumber}
                      onChange={(e) => setRefNumber(e.target.value)}
                      className="w-full text-sm font-mono px-3 py-2 bg-card border border-border-strong rounded-md text-text-primary focus:outline-none focus:border-primary"
                      autoFocus
                    />
                  </div>
                  <p className="text-xs text-text-muted">Pastikan pembayaran kartu telah disetujui di mesin EDC fisik sebelum konfirmasi.</p>
                </div>
              )}

              {/* Method: Customer Receivable (Kasbon) */}
              {selectedMethod === 'CustomerReceivable' && (
                <div className="space-y-3 bg-subtle p-4 rounded-lg border border-border-subtle">
                  <div className="flex items-center gap-2 text-status-warning text-xs font-semibold">
                    <AlertCircle className="w-4 h-4" />
                    <span>Transaksi ini akan dicatat sebagai Piutang Pelanggan (Jatuh Tempo 30 Hari).</span>
                  </div>
                  <p className="text-xs text-text-secondary">
                    Pelanggan: <span className="font-bold text-text-primary">{customerName || 'Pelanggan Umum (Belum Pilih)'}</span>
                  </p>
                </div>
              )}
            </>
          )}

          {/* ========================================================= */}
          {/* 2. SPLIT PAYMENT (MULTI-METODE) MODE */}
          {/* ========================================================= */}
          {isSplitMode && (
            <div className="space-y-4">
              {/* Financial Progress Indicator */}
              <div className="grid grid-cols-3 gap-3 p-3.5 bg-subtle rounded-xl border border-border-subtle text-center">
                <div>
                  <div className="text-[11px] text-text-secondary font-medium">Total Tagihan:</div>
                  <div className="text-sm font-extrabold font-mono text-text-primary">
                    Rp {totalAmount.toLocaleString('id-ID')}
                  </div>
                </div>
                <div>
                  <div className="text-[11px] text-text-secondary font-medium">Sudah Dibayar:</div>
                  <div className="text-sm font-extrabold font-mono text-status-success">
                    Rp {totalSplitPaid.toLocaleString('id-ID')}
                  </div>
                </div>
                <div>
                  <div className="text-[11px] text-text-secondary font-medium">Sisa Tagihan:</div>
                  <div className={`text-sm font-extrabold font-mono ${remainingSplitBalance === 0 ? 'text-status-success' : 'text-status-danger'}`}>
                    Rp {remainingSplitBalance.toLocaleString('id-ID')}
                  </div>
                </div>
              </div>

              {/* List of Added Split Payments */}
              <div className="space-y-2">
                <div className="text-xs font-bold text-text-secondary">Rincian Pembayaran Masuk:</div>
                {splitPayments.length === 0 ? (
                  <div className="p-4 rounded-lg border border-dashed border-border-strong text-center text-xs text-text-muted">
                    Belum ada metode pembayaran yang ditambahkan. Tambahkan baris pembayaran di bawah.
                  </div>
                ) : (
                  <div className="space-y-1.5">
                    {splitPayments.map((p, idx) => (
                      <div key={idx} className="p-2.5 rounded-lg bg-card border border-border-subtle flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2">
                          <span className="w-5 h-5 rounded-full bg-primary/20 text-primary font-bold flex items-center justify-center text-[10px]">
                            {idx + 1}
                          </span>
                          <div>
                            <div className="font-bold text-text-primary">
                              {p.method === 'Cash' && '💵 Tunai (Cash)'}
                              {p.method === 'QrisDynamic' && '📱 QRIS Dinamis'}
                              {p.method === 'DebitCard' && '💳 Kartu / EDC'}
                              {p.method === 'CustomerReceivable' && '📝 Kasbon Piutang'}
                            </div>
                            {p.referenceNumber && (
                              <div className="text-[10px] text-text-muted font-mono">Ref: {p.referenceNumber}</div>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="font-mono font-bold text-text-primary tabular-nums">
                            Rp {p.amount.toLocaleString('id-ID')}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleRemoveSplitRow(idx)}
                            className="p-1 text-status-danger hover:bg-status-danger/10 rounded transition-colors"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Add Split Payment Form */}
              {remainingSplitBalance > 0 && (
                <div className="p-4 rounded-xl bg-card border border-border-strong space-y-3">
                  <div className="text-xs font-bold text-text-primary flex items-center gap-1.5">
                    <PlusCircle className="w-4 h-4 text-primary" />
                    <span>Tambah Baris Pembayaran:</span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {[
                      { id: 'Cash', label: '💵 Tunai' },
                      { id: 'QrisDynamic', label: '📱 QRIS' },
                      { id: 'DebitCard', label: '💳 EDC/Kartu' },
                      { id: 'CustomerReceivable', label: '📝 Kasbon' },
                    ].map((m) => (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => setSplitAddMethod(m.id as PaymentMethod)}
                        className={`py-1.5 px-2 rounded-lg text-xs font-bold border transition-all ${
                          splitAddMethod === m.id
                            ? 'bg-primary text-primary-text border-primary shadow-xs'
                            : 'bg-subtle border-border-subtle text-text-secondary hover:bg-card-hover'
                        }`}
                      >
                        {m.label}
                      </button>
                    ))}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[11px] font-semibold text-text-secondary mb-1">Nominal (Rp):</label>
                      <input
                        type="number"
                        value={splitAddAmount}
                        onChange={(e) => setSplitAddAmount(e.target.value)}
                        placeholder="Nominal..."
                        className="w-full text-sm font-mono font-bold px-3 py-2 bg-subtle border border-border-strong rounded-lg text-text-primary focus:outline-none focus:border-primary"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-text-secondary mb-1">No. Ref (Opsional):</label>
                      <input
                        type="text"
                        value={refNumber}
                        onChange={(e) => setRefNumber(e.target.value)}
                        placeholder="Contoh: REF-12345"
                        className="w-full text-sm font-mono px-3 py-2 bg-subtle border border-border-strong rounded-lg text-text-primary focus:outline-none focus:border-primary"
                      />
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handleAddSplitRow}
                    className="w-full py-2 bg-primary/10 hover:bg-primary/20 text-primary border border-primary/40 rounded-lg text-xs font-bold transition-all"
                  >
                    + Tambahkan ke Rincian Pembayaran
                  </button>
                </div>
              )}

              {/* Split Kembalian */}
              {splitChangeVal > 0 && (
                <div className="p-3 bg-status-success/10 border border-status-success/30 rounded-xl flex items-center justify-between text-xs">
                  <span className="font-semibold text-text-primary">Uang Kembalian Pelanggan:</span>
                  <span className="font-mono font-bold text-sm text-status-success">
                    Rp {splitChangeVal.toLocaleString('id-ID')}
                  </span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-5 py-3 border-t border-border-subtle flex items-center justify-between bg-subtle">
          <button
            type="button"
            onClick={onClose}
            disabled={isProcessing}
            className="px-4 py-2 rounded-md text-xs font-semibold text-text-secondary hover:bg-card-hover border border-border-subtle"
          >
            [ESC] Batal
          </button>
          
          {!isSplitMode ? (
            <button
              type="button"
              onClick={handleConfirmSingle}
              disabled={isProcessing}
              className="px-6 py-2.5 rounded-md text-xs font-bold bg-primary hover:bg-primary-hover text-primary-text shadow-sm flex items-center gap-2"
            >
              {isProcessing ? (
                <span>Memproses Pembayaran...</span>
              ) : (
                <span>[Enter] Konfirmasi & Bayar Lunas</span>
              )}
            </button>
          ) : (
            <button
              type="button"
              onClick={handleConfirmSplit}
              disabled={isProcessing || totalSplitPaid < totalAmount}
              className={`px-6 py-2.5 rounded-md text-xs font-bold shadow-sm flex items-center gap-2 transition-all ${
                totalSplitPaid >= totalAmount
                  ? 'bg-primary hover:bg-primary-hover text-primary-text'
                  : 'bg-border-strong text-text-muted cursor-not-allowed'
              }`}
            >
              {isProcessing ? (
                <span>Memproses Pembayaran Split...</span>
              ) : (
                <span>✓ Selesaikan Transaksi Multi-Bayar</span>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

// ==========================================
// 2. PAYMENT SUCCESS MODAL & DIGITAL RECEIPT
// ==========================================
interface PaymentSuccessModalProps {
  isOpen: boolean;
  orderNumber: string;
  totalAmount: number;
  changeAmount: number;
  customerPhone?: string;
  onClose: () => void;
  onPrintReceipt: () => void;
}

export const PaymentSuccessModal: React.FC<PaymentSuccessModalProps> = ({
  isOpen,
  orderNumber,
  totalAmount,
  changeAmount,
  customerPhone,
  onClose,
  onPrintReceipt,
}) => {
  const [waPhone, setWaPhone] = useState(customerPhone || '');
  const [isWaInputOpen, setIsWaInputOpen] = useState(false);

  useEffect(() => {
    if (customerPhone) setWaPhone(customerPhone);
  }, [customerPhone]);

  if (!isOpen) return null;

  const handleSendWhatsAppReceipt = () => {
    const cleanPhone = waPhone.replace(/[^0-9]/g, '');
    const phoneWithCode = cleanPhone.startsWith('0') ? '62' + cleanPhone.slice(1) : cleanPhone;

    const receiptMessage = `*STRUK DIGITAL OMNIPOS*\n` +
      `--------------------------------\n` +
      `No. Nota : *${orderNumber}*\n` +
      `Tanggal  : ${new Date().toLocaleString('id-ID')}\n` +
      `Total    : *Rp ${totalAmount.toLocaleString('id-ID')}*\n` +
      `Kembalian: Rp ${changeAmount.toLocaleString('id-ID')}\n` +
      `Status   : *LUNAS*\n` +
      `--------------------------------\n` +
      `Terima kasih telah berbelanja di toko kami! 🙏`;

    const waUrl = `https://api.whatsapp.com/send?phone=${phoneWithCode}&text=${encodeURIComponent(receiptMessage)}`;
    window.open(waUrl, '_blank');
    useToastStore.getState().showToast('Membuka WhatsApp untuk mengirim struk...', 'info');
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4 select-none">
      <div className="bg-surface border border-border-strong w-full max-w-md rounded-2xl shadow-2xl p-6 text-center space-y-4">
        <div className="w-14 h-14 rounded-full bg-status-success/20 text-status-success mx-auto flex items-center justify-center">
          <CheckCircle2 className="w-8 h-8" />
        </div>

        <div>
          <h2 className="text-lg font-bold text-text-primary">Pembayaran Berhasil!</h2>
          <p className="text-xs text-text-secondary font-mono">Nota: {orderNumber}</p>
        </div>

        {/* Big Change Box */}
        <div className="p-4 bg-subtle rounded-xl border border-border-subtle space-y-1">
          <p className="text-xs font-semibold text-text-secondary">Uang Kembalian:</p>
          <p className="text-3xl font-extrabold text-status-success font-mono tabular-nums">
            Rp {changeAmount.toLocaleString('id-ID')}
          </p>
          <p className="text-[11px] text-text-muted">Total Tagihan: Rp {totalAmount.toLocaleString('id-ID')}</p>
        </div>

        {/* WhatsApp Receipt Expander */}
        <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-left space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-emerald-600 flex items-center gap-1.5">
              <Share2 className="w-3.5 h-3.5" />
              Kirim Struk ke WhatsApp Pelanggan
            </span>
          </div>

          <div className="flex gap-2">
            <input
              type="tel"
              value={waPhone}
              onChange={e => setWaPhone(e.target.value)}
              placeholder="08123456789"
              className="flex-1 px-3 py-1.5 bg-card border border-border-strong rounded-lg text-xs font-mono text-text-primary focus:outline-none focus:border-emerald-500"
            />
            <button
              onClick={handleSendWhatsAppReceipt}
              disabled={!waPhone.trim()}
              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold shadow-sm disabled:opacity-40"
            >
              Kirim WA
            </button>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="space-y-2 pt-1">
          <button
            onClick={onPrintReceipt}
            className="w-full py-2.5 rounded-xl bg-primary hover:bg-primary-hover text-primary-text text-xs font-bold flex items-center justify-center gap-2 shadow-sm"
          >
            <Printer className="w-4 h-4" />
            <span>[Enter] Cetak Struk Kasir</span>
          </button>
          <button
            onClick={onClose}
            className="w-full py-2.5 rounded-xl bg-card hover:bg-card-hover border border-border-subtle text-text-secondary text-xs font-semibold flex items-center justify-center gap-2"
          >
            <PlusCircle className="w-4 h-4" />
            <span>[Spasi] Transaksi Baru</span>
          </button>
        </div>
      </div>
    </div>
  );
};

