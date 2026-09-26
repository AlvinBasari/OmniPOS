import React, { useState, useEffect, useRef } from 'react';
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
  AlertCircle,
  Check,
  AlertTriangle,
  Wallet,
  Award,
  Gift,
  KeyRound,
  ShieldCheck,
  ShieldAlert,
  UserX,
  Copy,
  Star,
  Ticket,
  RefreshCw,
  Zap,
  Radio,
  Building2,
  Hash,
  ArrowRight,
  Clock,
  Sparkles,
  Smartphone,
  ExternalLink,
  Laptop,
  Info,
  Settings
} from 'lucide-react';
import { 
  PaymentMethod,
  QrisSessionResponse,
  QrisStatusResponse,
  EdcEcrTriggerResponse
} from '../../types';
import { useToastStore } from '../../store/useToastStore';
import { QRCodeEncoder } from '../../utils/qrCodeGenerator';
import { cleanPhoneNumber, openWhatsAppUrl } from '../../utils/whatsappHelper';

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
  customerDepositBalance?: number;
  customerCreditLimit?: number;
  customerCurrentDebt?: number;
  onClose: () => void;
  onSubmitPayment: (payments: PaymentRow[]) => Promise<void>;
  onRedeemPoints?: (points: number, discountAmount: number) => Promise<void>;
}

export const PaymentModal: React.FC<PaymentModalProps> = ({
  isOpen,
  totalAmount,
  customerName,
  customerPoints = 0,
  customerDepositBalance = 0,
  customerCreditLimit = 0,
  customerCurrentDebt = 0,
  onClose,
  onSubmitPayment,
  onRedeemPoints,
}) => {
  const [isSplitMode, setIsSplitMode] = useState<boolean>(false);
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod>('Cash');
  const [cashGiven, setCashGiven] = useState<string>(totalAmount.toString());
  const [refNumber, setRefNumber] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [qrisPayload, setQrisPayload] = useState<string | null>(null);
  const [qrisDataUrl, setQrisDataUrl] = useState<string>('');
  const [isRedeemingPoints, setIsRedeemingPoints] = useState<boolean>(false);
  const [pointsToRedeem, setPointsToRedeem] = useState<number>(0);

  // Real-time Dynamic QRIS States
  const [qrisSession, setQrisSession] = useState<QrisSessionResponse | null>(null);
  const [qrisCountdown, setQrisCountdown] = useState<number>(300);
  const [isQrisGenerating, setIsQrisGenerating] = useState<boolean>(false);
  const [isCheckingQris, setIsCheckingQris] = useState<boolean>(false);
  const [isSimulatingQris, setIsSimulatingQris] = useState<boolean>(false);
  const [isQrisSettled, setIsQrisSettled] = useState<boolean>(false);
  const [qrisSettledInfo, setQrisSettledInfo] = useState<{ issuer: string; rrn: string } | null>(null);

  // EDC Card States (Standalone Slip vs ECR Direct Link)
  const [edcMode, setEdcMode] = useState<'MANUAL_SLIP' | 'ECR_LINK'>('MANUAL_SLIP');
  const [edcBank, setEdcBank] = useState<string>('BCA');
  const [edcCardType, setEdcCardType] = useState<string>('Debit GPN');
  const [edcCardLast4, setEdcCardLast4] = useState<string>('');
  const [edcApprovalCode, setEdcApprovalCode] = useState<string>('');
  const [edcTraceNo, setEdcTraceNo] = useState<string>('');
  const [isEcrTriggering, setIsEcrTriggering] = useState<boolean>(false);
  const [ecrApproved, setEcrApproved] = useState<boolean>(false);

  const pollIntervalRef = useRef<any>(null);
  const countdownIntervalRef = useRef<any>(null);

  // Split payment list
  const [splitPayments, setSplitPayments] = useState<PaymentRow[]>([]);
  const [splitAddMethod, setSplitAddMethod] = useState<PaymentMethod>('Cash');
  const [splitAddAmount, setSplitAddAmount] = useState<string>('');

  // Kasbon (Customer Receivable) credit limit & supervisor authorization
  const [supervisorPin, setSupervisorPin] = useState<string>('');
  const [authorizedSupervisor, setAuthorizedSupervisor] = useState<string | null>(null);
  const [isVerifyingPin, setIsVerifyingPin] = useState<boolean>(false);
  const [pinError, setPinError] = useState<string>('');

  useEffect(() => {
    if (isOpen) {
      setIsSplitMode(false);
      setCashGiven(totalAmount.toString());
      setRefNumber('');
      setIsProcessing(false);
      setSelectedMethod('Cash');
      setQrisPayload(null);
      setQrisDataUrl('');
      setQrisSession(null);
      setQrisCountdown(300);
      setIsQrisSettled(false);
      setQrisSettledInfo(null);
      setSplitPayments([]);
      setSplitAddMethod('Cash');
      setSplitAddAmount(totalAmount.toString());
      setSupervisorPin('');
      setAuthorizedSupervisor(null);
      setPinError('');
      setEdcMode('MANUAL_SLIP');
      setEdcBank('BCA');
      setEdcCardType('Debit GPN');
      setEdcCardLast4('');
      setEdcApprovalCode('');
      setEdcTraceNo('');
      setEcrApproved(false);
      setIsEcrTriggering(false);
    }
  }, [isOpen, totalAmount]);

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

  // Clean intervals on unmount or close
  useEffect(() => {
    return () => {
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
      if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
    };
  }, []);

  // Polling QRIS status every 2 seconds
  useEffect(() => {
    if (!isOpen || selectedMethod !== 'QrisDynamic' || !qrisSession || isQrisSettled) {
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
      return;
    }

    pollIntervalRef.current = setInterval(async () => {
      try {
        const res = await fetch(`/api/v1/payments/qris/status/${qrisSession.referenceId}`);
        if (res.ok) {
          const status: QrisStatusResponse = await res.json();
          if (status.isSettled || status.status === 'SETTLED') {
            if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
            setIsQrisSettled(true);
            const issuer = status.issuer || 'QRIS Nasional';
            const rrn = status.rrn || status.referenceId;
            setQrisSettledInfo({ issuer, rrn });
            setRefNumber(`${issuer} - ${rrn}`);
            useToastStore.getState().showToast(`Pembayaran QRIS Rp ${totalAmount.toLocaleString('id-ID')} Berhasil Diterima dari ${issuer}!`, 'success');

            if (!isSplitMode) {
              setTimeout(() => {
                onSubmitPayment([
                  {
                    method: 'QrisDynamic',
                    amount: totalAmount,
                    referenceNumber: rrn
                  }
                ]);
              }, 1200);
            }
          }
        }
      } catch {
        // Polling silently
      }
    }, 2000);

    return () => {
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
    };
  }, [isOpen, selectedMethod, qrisSession, isQrisSettled, isSplitMode, totalAmount, onSubmitPayment]);

  // QRIS Countdown Timer
  useEffect(() => {
    if (!isOpen || selectedMethod !== 'QrisDynamic' || !qrisSession || isQrisSettled) {
      if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
      return;
    }

    countdownIntervalRef.current = setInterval(() => {
      setQrisCountdown(prev => {
        if (prev <= 1) {
          if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
    };
  }, [isOpen, selectedMethod, qrisSession, isQrisSettled]);

  // Sync refNumber for Manual Slip EDC
  useEffect(() => {
    if (selectedMethod === 'DebitCard' && edcMode === 'MANUAL_SLIP') {
      const parts = [edcBank, edcCardType];
      if (edcCardLast4) parts.push(`•••• ${edcCardLast4}`);
      if (edcApprovalCode) parts.push(`Appr: ${edcApprovalCode}`);
      if (edcTraceNo) parts.push(`Trace: ${edcTraceNo}`);
      setRefNumber(parts.join(' - '));
    }
  }, [selectedMethod, edcMode, edcBank, edcCardType, edcCardLast4, edcApprovalCode, edcTraceNo]);

  const handleGenerateQris = async () => {
    setSelectedMethod('QrisDynamic');
    setIsQrisGenerating(true);
    setIsQrisSettled(false);
    setQrisSettledInfo(null);
    setQrisCountdown(300);

    try {
      const res = await fetch('/api/v1/payments/qris/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: isSplitMode ? (parseFloat(splitAddAmount) || remainingSplitBalance) : totalAmount,
          invoiceNumber: `INV-${Date.now()}`,
          customerName: customerName || undefined
        })
      });

      if (res.ok) {
        const session: QrisSessionResponse = await res.json();
        setQrisSession(session);
        setQrisPayload(session.qrisPayload);
        const dataUrl = await QRCodeEncoder.generateDataURL(session.qrisPayload, 260);
        setQrisDataUrl(dataUrl);
      } else {
        useToastStore.getState().showToast('Gagal membuat sesi QRIS dari server gateway.', 'error');
      }
    } catch {
      useToastStore.getState().showToast('Terjadi kesalahan koneksi saat membuat QRIS.', 'error');
    } finally {
      setIsQrisGenerating(false);
    }
  };

  const handleCheckQrisStatusManual = async () => {
    if (!qrisSession) return;
    setIsCheckingQris(true);
    try {
      const res = await fetch(`/api/v1/payments/qris/status/${qrisSession.referenceId}`);
      if (res.ok) {
        const status: QrisStatusResponse = await res.json();
        if (status.isSettled || status.status === 'SETTLED') {
          setIsQrisSettled(true);
          const issuer = status.issuer || 'QRIS Nasional';
          const rrn = status.rrn || status.referenceId;
          setQrisSettledInfo({ issuer, rrn });
          setRefNumber(`${issuer} - ${rrn}`);
          useToastStore.getState().showToast(`Pembayaran QRIS Berhasil Terkonfirmasi! (${issuer})`, 'success');
        } else {
          useToastStore.getState().showToast('Menunggu pembayaran dari nasabah...', 'info');
        }
      }
    } catch {
      useToastStore.getState().showToast('Gagal memeriksa status ke server gateway.', 'error');
    } finally {
      setIsCheckingQris(false);
    }
  };

  const handleSimulatePayment = async () => {
    if (!qrisSession) return;
    setIsSimulatingQris(true);
    try {
      const res = await fetch(`/api/v1/payments/qris/simulate-pay/${qrisSession.referenceId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ issuer: 'BCA Mobile' })
      });
      if (res.ok) {
        const status: QrisStatusResponse = await res.json();
        setIsQrisSettled(true);
        const issuer = status.issuer || 'BCA Mobile';
        const rrn = status.rrn || `RRN-${Date.now()}`;
        setQrisSettledInfo({ issuer, rrn });
        setRefNumber(`${issuer} - ${rrn}`);
        useToastStore.getState().showToast(`⚡ Simulasi Berhasil: Pembayaran Rp ${totalAmount.toLocaleString('id-ID')} diterima dari ${issuer}!`, 'success');

        if (!isSplitMode) {
          setTimeout(() => {
            onSubmitPayment([
              {
                method: 'QrisDynamic',
                amount: totalAmount,
                referenceNumber: rrn
              }
            ]);
          }, 1200);
        }
      }
    } catch {
      useToastStore.getState().showToast('Gagal menjalankan simulasi pembayaran.', 'error');
    } finally {
      setIsSimulatingQris(false);
    }
  };

  const handleTriggerEcr = async () => {
    setIsEcrTriggering(true);
    setEcrApproved(false);
    try {
      const res = await fetch('/api/v1/payments/edc/ecr-trigger', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: isSplitMode ? (parseFloat(splitAddAmount) || remainingSplitBalance) : totalAmount,
          invoiceNumber: `INV-${Date.now()}`,
          bank: edcBank,
          cardType: edcCardType
        })
      });

      if (res.ok) {
        const data: EdcEcrTriggerResponse = await res.json();
        if (data.success) {
          setEcrApproved(true);
          setEdcApprovalCode(data.approvalCode);
          setEdcTraceNo(data.traceNumber);
          const last4 = data.cardNumber.slice(-4);
          setEdcCardLast4(last4);
          const refStr = `${data.bank} ${data.cardType} •••• ${last4} (Appr: ${data.approvalCode})`;
          setRefNumber(refStr);
          useToastStore.getState().showToast(`Mesin EDC ${data.bank}: Transaksi Disetujui (Appr Code: ${data.approvalCode})!`, 'success');
        } else {
          useToastStore.getState().showToast(`Mesin EDC Menolak: ${data.message}`, 'error');
        }
      } else {
        useToastStore.getState().showToast('Gagal menghubungi mesin EDC via ECR protocol.', 'error');
      }
    } catch {
      useToastStore.getState().showToast('Kesalahan koneksi ke driver mesin EDC.', 'error');
    } finally {
      setIsEcrTriggering(false);
    }
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

  // Kasbon (Customer Receivable) Derivations
  const isKasbon = selectedMethod === 'CustomerReceivable';
  const newTotalDebt = customerCurrentDebt + totalAmount;
  const isCreditLimitSet = customerCreditLimit > 0;
  const isKasbonOverLimit = isCreditLimitSet && newTotalDebt > customerCreditLimit;
  const overLimitAmount = isKasbonOverLimit ? newTotalDebt - customerCreditLimit : 0;
  const isKasbonBlocked = isKasbon && (!customerName || (isKasbonOverLimit && !authorizedSupervisor));

  const handleVerifySupervisorPin = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!supervisorPin.trim()) return;
    try {
      setIsVerifyingPin(true);
      setPinError('');
      const res = await fetch('/api/v1/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pinCode: supervisorPin.trim() })
      });
      const data = await res.json();
      if (res.ok && data.user) {
        const r = data.user.role;
        const roleStr = typeof r === 'string' ? r : (r === 0 ? 'SuperAdmin' : r === 1 ? 'Manager' : r === 2 ? 'Supervisor' : 'Staff');
        const isPrivileged = ['SuperAdmin', 'Manager', 'Supervisor'].includes(roleStr) || r === 0 || r === 1 || r === 2;
        if (isPrivileged) {
          setAuthorizedSupervisor(`${data.user.fullName} (${roleStr})`);
          useToastStore.getState().showToast(`Otorisasi kasbon disetujui oleh ${data.user.fullName}!`, 'success');
          setSupervisorPin('');
        } else {
          setPinError('Hanya Supervisor, Manager, atau Pemilik Toko yang berhak mengotorisasi kasbon di atas limit.');
          useToastStore.getState().showToast('Otorisasi Ditolak: Wewenang tidak mencukupi.', 'warning');
        }
      } else {
        setPinError(data.message || 'PIN yang dimasukkan salah.');
        useToastStore.getState().showToast('PIN otorisasi salah!', 'error');
      }
    } catch {
      setPinError('Gagal memverifikasi PIN otorisasi.');
    } finally {
      setIsVerifyingPin(false);
    }
  };

  const handleConfirmSingle = async () => {
    if (selectedMethod === 'Cash' && cashVal < totalAmount) {
      useToastStore.getState().showToast(`Uang tunai kurang Rp ${(totalAmount - cashVal).toLocaleString('id-ID')}!`, 'warning');
      return;
    }

    if (selectedMethod === 'CustomerDeposit' && customerDepositBalance < totalAmount) {
      useToastStore.getState().showToast(`Saldo deposit tidak cukup (Saldo: Rp ${customerDepositBalance.toLocaleString('id-ID')}). Silakan gunakan Split Payment!`, 'warning');
      return;
    }

    if (selectedMethod === 'CustomerReceivable') {
      if (!customerName) {
        useToastStore.getState().showToast('Kasbon gagal! Harap pilih pelanggan/member terlebih dahulu sebelum mencatat kasbon.', 'warning');
        return;
      }
      if (isKasbonOverLimit && !authorizedSupervisor) {
        useToastStore.getState().showToast('Kasbon melebihi limit kredit! Diperlukan otorisasi PIN Supervisor/Owner untuk melanjutkan.', 'error');
        return;
      }
    }

    if (selectedMethod === 'DebitCard') {
      if (edcMode === 'MANUAL_SLIP' && !edcApprovalCode.trim()) {
        useToastStore.getState().showToast('Harap masukkan Approval Code dari struk EDC fisik terlebih dahulu.', 'warning');
        return;
      }
    }

    try {
      setIsProcessing(true);
      await onSubmitPayment([
        {
          method: selectedMethod,
          amount: selectedMethod === 'Cash' ? totalAmount : totalAmount,
          referenceNumber: refNumber || undefined,
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

    const depositUsed = splitPayments.filter(p => p.method === 'CustomerDeposit').reduce((s, p) => s + p.amount, 0);
    if (depositUsed > customerDepositBalance) {
      useToastStore.getState().showToast(`Saldo deposit tidak cukup (Dipakai: Rp ${depositUsed.toLocaleString('id-ID')}, Tersedia: Rp ${customerDepositBalance.toLocaleString('id-ID')})!`, 'warning');
      return;
    }

    const kasbonUsed = splitPayments.filter(p => p.method === 'CustomerReceivable').reduce((s, p) => s + p.amount, 0);
    if (kasbonUsed > 0) {
      if (!customerName) {
        useToastStore.getState().showToast('Kasbon gagal! Harap pilih pelanggan/member terlebih dahulu.', 'warning');
        return;
      }
      const splitTotalDebt = customerCurrentDebt + kasbonUsed;
      if (customerCreditLimit > 0 && splitTotalDebt > customerCreditLimit && !authorizedSupervisor) {
        useToastStore.getState().showToast('Porsi kasbon melebihi limit kredit! Diperlukan otorisasi PIN Supervisor/Owner.', 'error');
        return;
      }
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

  useEffect(() => {
    if (!isOpen) return;

    const handleModalKeys = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const isInput = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA';

      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
        return;
      }

      if (e.key === 'Enter') {
        e.preventDefault();
        if (!isSplitMode) {
          handleConfirmSingle();
        } else if (totalSplitPaid >= totalAmount) {
          handleConfirmSplit();
        }
        return;
      }

      // If user is typing in an input field, do not hijack numeric keys
      if (isInput) return;

      if (e.key === '1') {
        e.preventDefault();
        setSelectedMethod('Cash');
      } else if (e.key === '2') {
        e.preventDefault();
        handleGenerateQris();
      } else if (e.key === '3') {
        e.preventDefault();
        setSelectedMethod('DebitCard');
      } else if (e.key === '4') {
        e.preventDefault();
        setSelectedMethod('CustomerReceivable');
      } else if (e.key === '5') {
        e.preventDefault();
        setSelectedMethod('CustomerDeposit');
      }
    };

    window.addEventListener('keydown', handleModalKeys);
    return () => window.removeEventListener('keydown', handleModalKeys);
  }, [isOpen, isSplitMode, selectedMethod, cashVal, totalAmount, totalSplitPaid, splitPayments, isProcessing, customerDepositBalance]);

  if (!isOpen) return null;

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
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all border flex items-center gap-1.5 ${
                isSplitMode
                  ? 'bg-primary text-primary-text border-primary'
                  : 'bg-card hover:bg-card-hover border-border-subtle text-text-secondary'
              }`}
            >
              {isSplitMode && <Check className="w-3.5 h-3.5" />}
              <span>{isSplitMode ? 'Mode Split Aktif' : 'Split Payment (Multi-Bayar)'}</span>
            </button>
            <button onClick={onClose} className="p-1 rounded-md text-text-muted hover:text-text-primary hover:bg-card-hover">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-5 flex-1 overflow-y-auto space-y-5">
          
          {/* Loyalty Points Redemption Widget */}
          {customerPoints > 0 && onRedeemPoints && (
            <div className="p-3.5 bg-amber-500/10 border border-amber-500/30 rounded-xl flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-lg bg-amber-500/20 text-amber-700">
                  <Award className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-xs font-bold text-text-primary flex items-center gap-1.5">
                    <span>Poin Loyalitas Member:</span>
                    <span className="text-amber-600 font-mono font-black">{customerPoints.toLocaleString('id-ID')} Poin</span>
                  </div>
                  <p className="text-[11px] text-text-secondary">
                    Tukarkan poin menjadi potongan diskon belanja langsung (1 Poin = Rp 1)
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={async () => {
                    const redeemMax = Math.min(customerPoints, totalAmount);
                    if (redeemMax <= 0) return;
                    setIsRedeemingPoints(true);
                    try {
                      await onRedeemPoints(redeemMax, redeemMax);
                    } finally {
                      setIsRedeemingPoints(false);
                    }
                  }}
                  disabled={isRedeemingPoints || totalAmount <= 0}
                  className="px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold transition-colors flex items-center gap-1.5 shadow-sm disabled:opacity-50"
                >
                  <Gift className="w-3.5 h-3.5" />
                  {isRedeemingPoints ? 'Menukarkan...' : `Tukar Max (Rp ${Math.min(customerPoints, totalAmount).toLocaleString('id-ID')})`}
                </button>
              </div>
            </div>
          )}

          {/* ========================================================= */}
          {/* 1. SINGLE PAYMENT MODE */}
          {/* ========================================================= */}
          {!isSplitMode && (
            <>
              {/* Payment Method Selector Buttons */}
              <div className="grid grid-cols-5 gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedMethod('Cash')}
                  className={`p-2.5 rounded-lg border flex flex-col items-center gap-1 transition-all text-xs font-semibold relative ${
                    selectedMethod === 'Cash'
                      ? 'bg-primary/10 border-primary text-primary shadow-sm'
                      : 'bg-card border-border-subtle text-text-secondary hover:bg-card-hover'
                  }`}
                >
                  <kbd className="absolute top-1 right-1 px-1 py-0.2 rounded bg-subtle border border-border-strong text-[9px] font-mono font-bold text-text-muted">1</kbd>
                  <Banknote className="w-4 h-4" />
                  <span>Tunai</span>
                </button>

                <button
                  type="button"
                  onClick={handleGenerateQris}
                  className={`p-2.5 rounded-lg border flex flex-col items-center gap-1 transition-all text-xs font-semibold relative ${
                    selectedMethod === 'QrisDynamic'
                      ? 'bg-primary/10 border-primary text-primary shadow-sm'
                      : 'bg-card border-border-subtle text-text-secondary hover:bg-card-hover'
                  }`}
                >
                  <kbd className="absolute top-1 right-1 px-1 py-0.2 rounded bg-subtle border border-border-strong text-[9px] font-mono font-bold text-text-muted">2</kbd>
                  <QrCode className="w-4 h-4" />
                  <span>QRIS</span>
                </button>

                <button
                  type="button"
                  onClick={() => setSelectedMethod('DebitCard')}
                  className={`p-2.5 rounded-lg border flex flex-col items-center gap-1 transition-all text-xs font-semibold relative ${
                    selectedMethod === 'DebitCard'
                      ? 'bg-primary/10 border-primary text-primary shadow-sm'
                      : 'bg-card border-border-subtle text-text-secondary hover:bg-card-hover'
                  }`}
                >
                  <kbd className="absolute top-1 right-1 px-1 py-0.2 rounded bg-subtle border border-border-strong text-[9px] font-mono font-bold text-text-muted">3</kbd>
                  <CreditCard className="w-4 h-4" />
                  <span>EDC/Kartu</span>
                </button>

                <button
                  type="button"
                  onClick={() => setSelectedMethod('CustomerReceivable')}
                  className={`p-2.5 rounded-lg border flex flex-col items-center gap-1 transition-all text-xs font-semibold relative ${
                    selectedMethod === 'CustomerReceivable'
                      ? 'bg-primary/10 border-primary text-primary shadow-sm'
                      : 'bg-card border-border-subtle text-text-secondary hover:bg-card-hover'
                  }`}
                >
                  <kbd className="absolute top-1 right-1 px-1 py-0.2 rounded bg-subtle border border-border-strong text-[9px] font-mono font-bold text-text-muted">4</kbd>
                  <FileText className="w-4 h-4" />
                  <span>Kasbon</span>
                </button>

                <button
                  type="button"
                  onClick={() => setSelectedMethod('CustomerDeposit')}
                  className={`p-2.5 rounded-lg border flex flex-col items-center gap-1 transition-all text-xs font-semibold relative ${
                    selectedMethod === 'CustomerDeposit'
                      ? 'bg-emerald-500/15 border-emerald-500 text-emerald-600 shadow-sm'
                      : 'bg-card border-border-subtle text-text-secondary hover:bg-card-hover'
                  }`}
                >
                  <kbd className="absolute top-1 right-1 px-1 py-0.2 rounded bg-subtle border border-border-strong text-[9px] font-mono font-bold text-text-muted">5</kbd>
                  <Wallet className="w-4 h-4" />
                  <span>Deposit</span>
                  {customerDepositBalance > 0 && (
                    <span className="text-[9px] text-emerald-600 font-bold font-mono">
                      Rp {(customerDepositBalance / 1000).toLocaleString('id-ID')}k
                    </span>
                  )}
                </button>
              </div>

              {/* Method: Cash Inputs & Indonesian Smart Quick Cash */}
              {selectedMethod === 'Cash' && (
                <div className="space-y-4 bg-subtle p-4 rounded-xl border border-border-subtle">
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-xs font-bold text-text-secondary">
                        Uang Tunai Diterima (Rp):
                      </label>
                      <span className="text-xs font-mono font-semibold text-text-muted">
                        Format: Rp {(cashVal || 0).toLocaleString('id-ID')}
                      </span>
                    </div>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-base font-bold text-text-muted">Rp</span>
                      <input
                        type="number"
                        value={cashGiven}
                        onChange={(e) => setCashGiven(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && cashVal >= totalAmount && !isProcessing) {
                            e.preventDefault();
                            handleConfirmSingle();
                          }
                        }}
                        className="w-full text-2xl font-bold font-mono pl-11 pr-4 py-2.5 bg-card border border-border-strong rounded-xl text-text-primary focus:outline-none focus:border-primary tabular-nums shadow-inner"
                        autoFocus
                        placeholder="0"
                      />
                    </div>
                  </div>

                  {/* Indonesian Smart Banknote Suggestions (Direct Click) */}
                  <div>
                    <span className="text-[11px] font-bold text-text-muted uppercase tracking-wider block mb-1.5">
                      Pilihan Uang Lembaran:
                    </span>
                    <div className="grid grid-cols-3 sm:grid-cols-6 gap-1.5">
                      <button
                        type="button"
                        onClick={handleExactCash}
                        className={`px-2 py-2 rounded-lg text-xs font-bold border transition-all text-center ${
                          cashVal === totalAmount
                            ? 'bg-primary text-primary-text border-primary shadow-sm'
                            : 'bg-card hover:bg-card-hover border-border-subtle text-primary'
                        }`}
                      >
                        Uang Pas
                      </button>
                      {(() => {
                        const opts = new Set<number>();
                        const denoms = [10000, 20000, 50000, 100000, 200000];
                        for (const d of denoms) {
                          if (d > totalAmount) {
                            opts.add(d);
                          } else {
                            const nextMultiple = Math.ceil(totalAmount / d) * d;
                            if (nextMultiple > totalAmount && nextMultiple <= totalAmount + 100000) {
                              opts.add(nextMultiple);
                            }
                          }
                        }
                        return Array.from(opts)
                          .filter(amt => amt !== totalAmount)
                          .sort((a, b) => a - b)
                          .slice(0, 5)
                          .map(suggestedAmt => (
                            <button
                              key={suggestedAmt}
                              type="button"
                              onClick={() => setCashGiven(suggestedAmt.toString())}
                              className={`px-2 py-2 rounded-lg text-xs font-bold font-mono border transition-all text-center ${
                                cashVal === suggestedAmt
                                  ? 'bg-primary text-primary-text border-primary shadow-sm'
                                  : 'bg-card hover:bg-card-hover border-border-subtle text-text-primary'
                              }`}
                            >
                              Rp {suggestedAmt.toLocaleString('id-ID')}
                            </button>
                          ));
                      })()}
                    </div>
                  </div>

                  {/* Incremental Quick Add Buttons */}
                  <div>
                    <span className="text-[11px] font-bold text-text-muted uppercase tracking-wider block mb-1.5">
                      Tambah Nominal Cepat:
                    </span>
                    <div className="flex flex-wrap items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => handleQuickCash(10000)}
                        className="px-2.5 py-1 bg-card hover:bg-card-hover border border-border-subtle rounded-lg text-xs font-semibold text-text-secondary"
                      >
                        +10.000
                      </button>
                      <button
                        type="button"
                        onClick={() => handleQuickCash(20000)}
                        className="px-2.5 py-1 bg-card hover:bg-card-hover border border-border-subtle rounded-lg text-xs font-semibold text-text-secondary"
                      >
                        +20.000
                      </button>
                      <button
                        type="button"
                        onClick={() => handleQuickCash(50000)}
                        className="px-2.5 py-1 bg-card hover:bg-card-hover border border-border-subtle rounded-lg text-xs font-semibold text-text-secondary"
                      >
                        +50.000
                      </button>
                      <button
                        type="button"
                        onClick={() => handleQuickCash(100000)}
                        className="px-2.5 py-1 bg-card hover:bg-card-hover border border-border-subtle rounded-lg text-xs font-semibold text-text-secondary"
                      >
                        +100.000
                      </button>
                      <button
                        type="button"
                        onClick={() => setCashGiven('0')}
                        className="ml-auto px-2.5 py-1 bg-card hover:bg-rose-500/10 hover:text-rose-600 border border-border-subtle rounded-lg text-xs font-semibold text-text-muted transition-colors"
                      >
                        Reset (0)
                      </button>
                    </div>
                  </div>

                  {/* Change or Deficiency Display */}
                  <div className="pt-3 border-t border-border-subtle flex items-center justify-between">
                    <div>
                      <span className="text-xs font-semibold text-text-secondary block">Status Kembalian:</span>
                      {cashVal < totalAmount ? (
                        <span className="text-[11px] font-bold text-rose-500 flex items-center gap-1.5">
                          <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                          <span>Uang tunai kurang Rp {(totalAmount - cashVal).toLocaleString('id-ID')}</span>
                        </span>
                      ) : (
                        <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
                          <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                          <span>Uang tunai mencukupi tagihan</span>
                        </span>
                      )}
                    </div>
                    <div className="text-right">
                      <span className="text-xs text-text-muted">Uang Kembalian:</span>
                      <p className={`text-2xl font-black font-mono tabular-nums ${changeVal >= 0 && cashVal >= totalAmount ? 'text-status-success' : 'text-text-muted'}`}>
                        Rp {changeVal.toLocaleString('id-ID')}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Method: Dynamic QRIS */}
              {selectedMethod === 'QrisDynamic' && (
                <div className="bg-subtle p-5 rounded-2xl border border-border-subtle text-center space-y-4 shadow-sm">
                  {/* Header Status & Countdown */}
                  <div className="flex items-center justify-between pb-3 border-b border-border-subtle">
                    <div className="flex items-center gap-2 text-left">
                      <div className="p-2 rounded-lg bg-primary/10 text-primary">
                        <QrCode className="w-5 h-5" />
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-text-primary">QRIS Dinamis Interkoneksi Nasional</h4>
                        <p className="text-[11px] text-text-muted">Standar Bank Indonesia (ASPI / EMVCo MPM)</p>
                      </div>
                    </div>

                    {/* Live Radar Pulse & Expiration Badge & Setup Button */}
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          onClose();
                          window.dispatchEvent(new CustomEvent('omnipos-navigate', { detail: 'hardware' }));
                          setTimeout(() => window.dispatchEvent(new CustomEvent('omnipos-hardware-tab', { detail: 'payment' })), 80);
                        }}
                        title="Buka Pengaturan Gateway QRIS & Mesin EDC"
                        className="p-1.5 rounded-lg bg-card hover:bg-card-hover border border-border-subtle text-text-muted hover:text-primary transition-colors cursor-pointer flex items-center gap-1 text-[11px] font-semibold"
                      >
                        <Settings className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">Setup</span>
                      </button>

                      {!isQrisSettled ? (
                        <div className="flex items-center gap-1.5 px-2.5 py-1 bg-amber-500/10 border border-amber-500/30 text-amber-600 rounded-full text-xs font-bold font-mono">
                          <Clock className="w-3.5 h-3.5 animate-spin" />
                          <span>
                            {Math.floor(qrisCountdown / 60).toString().padStart(2, '0')}:{(qrisCountdown % 60).toString().padStart(2, '0')}
                          </span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1 px-2.5 py-1 bg-emerald-500/15 border border-emerald-500/40 text-emerald-600 rounded-full text-xs font-bold">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>LUNAS</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* QRIS Display Container */}
                  {isQrisSettled ? (
                    <div className="py-6 px-4 bg-emerald-500/10 border-2 border-emerald-500 rounded-2xl text-center space-y-3 animate-in fade-in zoom-in duration-300">
                      <div className="w-16 h-16 mx-auto bg-emerald-500 text-white rounded-full flex items-center justify-center shadow-lg shadow-emerald-500/30">
                        <CheckCircle2 className="w-10 h-10" />
                      </div>
                      <div>
                        <h3 className="text-base font-black text-emerald-700 dark:text-emerald-300 tracking-wide">
                          PEMBAYARAN QRIS BERHASIL!
                        </h3>
                        <p className="text-xs text-text-secondary mt-0.5">
                          Notifikasi instan terverifikasi oleh Payment Gateway
                        </p>
                      </div>

                      <div className="max-w-md mx-auto p-3 bg-surface rounded-xl border border-emerald-500/30 text-xs space-y-1.5 font-mono text-left">
                        <div className="flex justify-between">
                          <span className="text-text-muted">Aplikasi / Sumber:</span>
                          <strong className="text-text-primary">{qrisSettledInfo?.issuer || 'QRIS Nasional'}</strong>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-text-muted">No. Referensi (RRN):</span>
                          <strong className="text-text-primary font-bold">{qrisSettledInfo?.rrn || qrisSession?.referenceId}</strong>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-text-muted">Nominal Terbayar:</span>
                          <strong className="text-emerald-600 font-bold">Rp {totalAmount.toLocaleString('id-ID')}</strong>
                        </div>
                      </div>

                      <p className="text-[11px] text-text-muted animate-pulse">
                        Menyelesaikan invoice kasir dalam sekejap...
                      </p>
                    </div>
                  ) : (
                    <>
                      {/* QR Box with Live Scanner Frame */}
                      <div className="relative w-64 h-64 mx-auto bg-white p-3 rounded-2xl border-2 border-slate-200 shadow-md flex flex-col items-center justify-center">
                        {isQrisGenerating ? (
                          <div className="flex flex-col items-center gap-2 text-slate-500">
                            <RefreshCw className="w-8 h-8 animate-spin text-primary" />
                            <span className="text-xs font-semibold">Membuat QRIS Dinamis...</span>
                          </div>
                        ) : qrisDataUrl ? (
                          <div className="relative">
                            <img src={qrisDataUrl} alt="QRIS Nasional" className="w-52 h-52 rounded-lg" />
                            <div className="absolute inset-x-0 top-0 h-0.5 bg-primary/80 shadow-[0_0_8px_rgba(59,130,246,0.8)] animate-pulse" />
                          </div>
                        ) : (
                          <div className="flex flex-col items-center gap-2 text-slate-400">
                            <QrCode className="w-40 h-40 animate-pulse" />
                            <span className="text-xs">Klik 'Buat QRIS'</span>
                          </div>
                        )}
                        <span className="text-[10px] font-black text-slate-800 tracking-wider mt-1.5 flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-rose-600" />
                          QRIS DINAMIS INTERKONEKSI
                        </span>
                      </div>

                      {/* Status & Amount Indicator */}
                      <div className="space-y-1">
                        <div className="flex items-center justify-center gap-2 text-xs font-bold text-text-primary">
                          <Radio className="w-3.5 h-3.5 text-primary animate-pulse" />
                          <span>Menunggu Pembayaran Nasabah...</span>
                        </div>
                        <p className="text-base font-extrabold text-primary font-mono tabular-nums">
                          Total: Rp {totalAmount.toLocaleString('id-ID')}
                        </p>
                        {qrisSession && (
                          <p className="text-[10px] text-text-muted font-mono">
                            Ref: {qrisSession.referenceId} ({qrisSession.provider})
                          </p>
                        )}
                      </div>

                      {/* Interactive Controls for Cashier / Testing */}
                      <div className="pt-2 flex flex-wrap items-center justify-center gap-2">
                        <button
                          type="button"
                          onClick={handleCheckQrisStatusManual}
                          disabled={isCheckingQris || !qrisSession}
                          className="px-3 py-1.5 rounded-lg bg-card hover:bg-card-hover border border-border-subtle text-xs font-semibold text-text-secondary flex items-center gap-1.5 transition-all disabled:opacity-50 cursor-pointer"
                        >
                          <RefreshCw className={`w-3.5 h-3.5 ${isCheckingQris ? 'animate-spin' : ''}`} />
                          <span>{isCheckingQris ? 'Memeriksa...' : 'Cek Status'}</span>
                        </button>

                        <button
                          type="button"
                          onClick={handleSimulatePayment}
                          disabled={isSimulatingQris || !qrisSession}
                          className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1.5 transition-all shadow-sm disabled:opacity-50 cursor-pointer"
                          title="Simulasikan pelunasan QRIS instan dari HP nasabah untuk uji coba"
                        >
                          <Zap className="w-3.5 h-3.5" />
                          <span>{isSimulatingQris ? 'Memproses...' : 'Simulasi Bayar via HP'}</span>
                        </button>

                        <button
                          type="button"
                          onClick={handleGenerateQris}
                          disabled={isQrisGenerating}
                          className="px-3 py-1.5 rounded-lg bg-subtle hover:bg-card-hover border border-border-subtle text-xs font-semibold text-text-muted flex items-center gap-1.5 transition-all cursor-pointer"
                        >
                          <RefreshCw className="w-3.5 h-3.5" />
                          <span>Buat Ulang</span>
                        </button>
                      </div>

                      {/* Supported Wallets / Mobile Bankings */}
                      <div className="pt-2 border-t border-border-subtle text-[11px] text-text-muted">
                        Mendukung seluruh m-Banking & e-Wallet: BCA • Mandiri • BRI • BNI • GoPay • OVO • DANA • ShopeePay
                      </div>
                    </>
                  )}
                </div>
              )}

              {/* Method: Debit / Credit Card (Mesin EDC) */}
              {selectedMethod === 'DebitCard' && (
                <div className="space-y-4 bg-subtle p-4 rounded-2xl border border-border-subtle">
                  
                  {/* EDC Mode Switcher: Standalone Manual Slip vs ECR Direct Link */}
                  <div className="flex items-center justify-between pb-3 border-b border-border-subtle">
                    <div className="flex items-center gap-2">
                      <div className="p-2 rounded-lg bg-primary/10 text-primary">
                        <CreditCard className="w-5 h-5" />
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-text-primary">Pembayaran Kartu Debit & Kredit (Mesin EDC)</h4>
                        <p className="text-[11px] text-text-muted">Mendukung Kartu Debit GPN, Visa, Mastercard, dan JCB</p>
                      </div>
                    </div>

                    {/* Mode Toggle Buttons & Setup Link */}
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          onClose();
                          window.dispatchEvent(new CustomEvent('omnipos-navigate', { detail: 'hardware' }));
                          setTimeout(() => window.dispatchEvent(new CustomEvent('omnipos-hardware-tab', { detail: 'payment' })), 80);
                        }}
                        title="Buka Pengaturan Gateway QRIS & Mesin EDC"
                        className="p-1.5 rounded-lg bg-card hover:bg-card-hover border border-border-subtle text-text-muted hover:text-primary transition-colors cursor-pointer flex items-center gap-1 text-[11px] font-semibold"
                      >
                        <Settings className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">Setup</span>
                      </button>

                      <div className="flex p-1 bg-card rounded-xl border border-border-subtle">
                        <button
                          type="button"
                          onClick={() => setEdcMode('MANUAL_SLIP')}
                          className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                            edcMode === 'MANUAL_SLIP'
                              ? 'bg-primary text-primary-text shadow-xs'
                              : 'text-text-secondary hover:text-text-primary'
                          }`}
                        >
                          Input Struk EDC (Manual)
                        </button>
                        <button
                          type="button"
                          onClick={() => setEdcMode('ECR_LINK')}
                          className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                            edcMode === 'ECR_LINK'
                              ? 'bg-primary text-primary-text shadow-xs'
                              : 'text-text-secondary hover:text-text-primary'
                          }`}
                        >
                          ECR Direct Link (Otomatis)
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* MODE 1: STANDALONE MANUAL SLIP ENTRY */}
                  {edcMode === 'MANUAL_SLIP' && (
                    <div className="space-y-4">
                      {/* Step 1: Bank Selection */}
                      <div>
                        <label className="block text-xs font-bold text-text-secondary mb-1.5 flex items-center gap-1.5">
                          <Building2 className="w-3.5 h-3.5 text-primary" />
                          <span>1. Pilih Bank Mesin EDC / Penerbit Kartu:</span>
                        </label>
                        <div className="grid grid-cols-4 sm:grid-cols-7 gap-1.5">
                          {['BCA', 'Mandiri', 'BRI', 'BNI', 'CIMB Niaga', 'Permata', 'Lainnya'].map((bank) => (
                            <button
                              key={bank}
                              type="button"
                              onClick={() => setEdcBank(bank)}
                              className={`py-1.5 px-2 rounded-lg text-xs font-bold border transition-all text-center cursor-pointer ${
                                edcBank === bank
                                  ? 'bg-primary text-primary-text border-primary shadow-xs'
                                  : 'bg-card hover:bg-card-hover border-border-subtle text-text-secondary'
                              }`}
                            >
                              {bank}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Step 2: Card Type */}
                      <div>
                        <label className="block text-xs font-bold text-text-secondary mb-1.5 flex items-center gap-1.5">
                          <CreditCard className="w-3.5 h-3.5 text-primary" />
                          <span>2. Jenis Kartu:</span>
                        </label>
                        <div className="grid grid-cols-3 gap-2">
                          {[
                            { id: 'Debit GPN', label: 'Debit GPN (Domestik)' },
                            { id: 'Debit Visa/MC', label: 'Debit Visa / MC' },
                            { id: 'Kartu Kredit', label: 'Kartu Kredit (Credit Card)' },
                          ].map((ct) => (
                            <button
                              key={ct.id}
                              type="button"
                              onClick={() => setEdcCardType(ct.id)}
                              className={`py-2 px-3 rounded-lg text-xs font-bold border transition-all text-center cursor-pointer ${
                                edcCardType === ct.id
                                  ? 'bg-primary/10 border-primary text-primary shadow-xs'
                                  : 'bg-card hover:bg-card-hover border-border-subtle text-text-secondary'
                              }`}
                            >
                              {ct.label}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Step 3: Card Details (Last 4 & Approval Code from Slip) */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-semibold text-text-secondary mb-1">
                            4 Digit Terakhir Kartu:
                          </label>
                          <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-mono font-bold text-text-muted">••••</span>
                            <input
                              type="text"
                              maxLength={4}
                              placeholder="Contoh: 4219"
                              value={edcCardLast4}
                              onChange={(e) => setEdcCardLast4(e.target.value.replace(/\D/g, ''))}
                              className="w-full text-sm font-mono font-bold pl-12 pr-3 py-2 bg-card border border-border-strong rounded-lg text-text-primary focus:outline-none focus:border-primary tracking-widest"
                            />
                          </div>
                        </div>

                        <div>
                          <label className="block text-xs font-semibold text-text-secondary mb-1 flex items-center justify-between">
                            <span>Approval Code (No. Otorisasi EDC):</span>
                            <span className="text-[10px] text-text-muted">Dari struk kertas</span>
                          </label>
                          <input
                            type="text"
                            maxLength={10}
                            placeholder="Contoh: 882910"
                            value={edcApprovalCode}
                            onChange={(e) => setEdcApprovalCode(e.target.value.toUpperCase())}
                            className="w-full text-sm font-mono font-bold px-3 py-2 bg-card border border-border-strong rounded-lg text-text-primary focus:outline-none focus:border-primary uppercase"
                            autoFocus
                          />
                        </div>
                      </div>

                      {/* Realistic Visual Card Badge Preview */}
                      <div className="p-3 bg-gradient-to-r from-slate-900 to-slate-800 text-white rounded-xl shadow-md flex items-center justify-between">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <div className="w-7 h-5 bg-amber-400 rounded-sm flex items-center justify-center text-[8px] font-black text-slate-900">
                              CHIP
                            </div>
                            <span className="text-xs font-bold tracking-wider uppercase text-slate-200">
                              Bank {edcBank}
                            </span>
                          </div>
                          <div className="font-mono text-sm tracking-widest font-bold text-slate-100">
                            •••• •••• •••• {edcCardLast4 || 'XXXX'}
                          </div>
                          <div className="text-[10px] text-slate-400 font-semibold uppercase">
                            {edcCardType} • {customerName || 'NAMA PEMEGANG KARTU'}
                          </div>
                        </div>
                        <div className="text-right space-y-0.5">
                          <span className="text-[10px] text-slate-400 block font-mono">APPROVAL CODE</span>
                          <span className="text-sm font-mono font-black text-amber-400 block">
                            {edcApprovalCode || '------'}
                          </span>
                          <span className="text-[10px] text-emerald-400 font-bold block">
                            Rp {totalAmount.toLocaleString('id-ID')}
                          </span>
                        </div>
                      </div>

                      <div className="p-2.5 rounded-lg bg-blue-500/10 border border-blue-500/20 text-xs text-blue-800 dark:text-blue-300 flex items-start gap-2">
                        <Info className="w-4 h-4 shrink-0 mt-0.5 text-blue-600" />
                        <p className="text-[11px] leading-relaxed">
                          <strong>Prosedur Standalone:</strong> Gesek atau dip kartu nasabah pada mesin EDC fisik Anda. Setelah nasabah mengetik PIN dan struk EDC keluar bertuliskan <strong>APPROVED</strong>, catat nomor Approval Code di atas sebelum menekan tombol Konfirmasi.
                        </p>
                      </div>
                    </div>
                  )}

                  {/* MODE 2: INTEGRATED ECR DIRECT LINK */}
                  {edcMode === 'ECR_LINK' && (
                    <div className="space-y-4">
                      <div className="p-3 rounded-xl bg-card border border-border-subtle flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2">
                          <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                          <span className="font-bold text-text-primary">EDC Bridge Ready (ECR Protocol v2.1)</span>
                        </div>
                        <span className="font-mono text-text-muted">Target: Bank {edcBank}</span>
                      </div>

                      {ecrApproved ? (
                        <div className="p-5 bg-emerald-500/10 border-2 border-emerald-500 rounded-2xl text-center space-y-3 animate-in zoom-in duration-200">
                          <div className="w-12 h-12 mx-auto bg-emerald-500 text-white rounded-full flex items-center justify-center">
                            <CheckCircle2 className="w-8 h-8" />
                          </div>
                          <div>
                            <h4 className="text-sm font-extrabold text-emerald-700 dark:text-emerald-300">
                              TRANSAKSI EDC DISETUJUI / APPROVED (00)
                            </h4>
                            <p className="text-xs text-text-secondary mt-0.5">
                              Mesin EDC telah mengonfirmasi pembayaran kartu secara langsung
                            </p>
                          </div>

                          <div className="p-3 bg-surface rounded-xl border border-emerald-500/30 text-xs space-y-1 font-mono text-left max-w-sm mx-auto">
                            <div className="flex justify-between">
                              <span className="text-text-muted">Bank & Kartu:</span>
                              <strong className="text-text-primary">{edcBank} ({edcCardType})</strong>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-text-muted">Nomor Kartu:</span>
                              <strong className="text-text-primary">•••• •••• •••• {edcCardLast4}</strong>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-text-muted">Approval Code:</span>
                              <strong className="text-emerald-600 font-bold">{edcApprovalCode}</strong>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-text-muted">Trace Number:</span>
                              <strong className="text-text-primary">{edcTraceNo}</strong>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="p-6 bg-card border-2 border-dashed border-border-strong rounded-2xl text-center space-y-3">
                          <div className="w-14 h-14 mx-auto bg-primary/10 text-primary rounded-2xl flex items-center justify-center">
                            {isEcrTriggering ? (
                              <RefreshCw className="w-7 h-7 animate-spin" />
                            ) : (
                              <CreditCard className="w-7 h-7" />
                            )}
                          </div>
                          <div>
                            <h4 className="text-xs font-bold text-text-primary">
                              {isEcrTriggering ? 'Mengirim Data Tagihan ke Layar Mesin EDC...' : 'Kirim Tagihan ke Mesin EDC'}
                            </h4>
                            <p className="text-[11px] text-text-secondary mt-0.5">
                              {isEcrTriggering 
                                ? 'Nasabah dipersilakan tap, gesek, atau masukkan kartu dan PIN pada mesin EDC' 
                                : `Nominal tagihan Rp ${totalAmount.toLocaleString('id-ID')} akan otomatis tampil di layar mesin EDC.`}
                            </p>
                          </div>

                          <div className="pt-2 flex justify-center gap-2">
                            <button
                              type="button"
                              onClick={handleTriggerEcr}
                              disabled={isEcrTriggering}
                              className="px-5 py-2.5 bg-primary hover:bg-primary-hover text-primary-text font-bold text-xs rounded-xl shadow-md transition-all flex items-center gap-2 disabled:opacity-50 cursor-pointer"
                            >
                              <Zap className="w-4 h-4" />
                              <span>{isEcrTriggering ? 'Menunggu Approval EDC...' : `Kirim Tagihan Rp ${totalAmount.toLocaleString('id-ID')}`}</span>
                            </button>
                          </div>
                        </div>
                      )}

                      <div className="p-2.5 rounded-lg bg-subtle border border-border-subtle text-[11px] text-text-muted">
                        💡 Mode ECR (Electronic Cash Register) menghubungkan POS langsung ke terminal EDC Ingenico, Verifone, Pax, atau Castles via kabel Serial RS-232 atau LAN Ethernet tanpa kasir perlu mengetik ulang nominal tagihan.
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Method: Customer Receivable (Kasbon / Tempo) */}
              {selectedMethod === 'CustomerReceivable' && (
                <div className="space-y-3.5 bg-card p-4 rounded-xl border border-border-subtle shadow-xs">
                  
                  {/* Header Bar */}
                  <div className="flex items-center justify-between pb-2 border-b border-border-subtle">
                    <span className="text-xs font-bold text-amber-600 uppercase tracking-wider flex items-center gap-1.5">
                      <FileText className="w-4 h-4" /> Buku Kasbon & Piutang Pelanggan
                    </span>
                    <span className="text-[11px] font-semibold px-2 py-0.5 rounded bg-amber-500/10 text-amber-700 border border-amber-500/20">
                      Jatuh Tempo Standar: 30 Hari
                    </span>
                  </div>

                  {/* Customer Status */}
                  {!customerName ? (
                    <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-700 dark:text-rose-300 space-y-2">
                      <div className="flex items-center gap-2 font-bold text-xs">
                        <UserX className="w-4 h-4 text-rose-600 shrink-0" />
                        <span>Pelanggan Belum Dipilih!</span>
                      </div>
                      <p className="text-[11px] leading-relaxed">
                        Transaksi kasbon/tempo <strong>tidak dapat diproses</strong> untuk Pelanggan Umum tanpa akun. Silakan tutup jendela pembayaran ini, tekan <kbd className="px-1.5 py-0.5 bg-rose-200/50 dark:bg-rose-900/50 rounded text-rose-800 font-mono font-bold">[F3]</kbd> di kasir untuk memilih member terdaftar.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {/* Customer Info Card */}
                      <div className="flex items-center justify-between p-3 rounded-lg bg-subtle border border-border-subtle text-xs">
                        <div>
                          <span className="text-[10px] font-bold text-text-muted uppercase tracking-wider block">Pelanggan Terpilih:</span>
                          <span className="font-bold text-sm text-text-primary mt-0.5 block">{customerName}</span>
                        </div>
                        <div className="text-right">
                          <span className="text-[10px] font-bold text-text-muted uppercase tracking-wider block">Plafon Kredit (Limit):</span>
                          <span className="font-mono font-bold text-sm text-text-primary mt-0.5 block">
                            {customerCreditLimit > 0 ? `Rp ${customerCreditLimit.toLocaleString('id-ID')}` : 'Tidak Dibatasi (Rp 0)'}
                          </span>
                        </div>
                      </div>

                      {/* Debt Metrics Breakdown */}
                      <div className="grid grid-cols-3 gap-2 text-xs">
                        <div className="p-2.5 rounded-lg bg-subtle/70 border border-border-subtle">
                          <span className="text-[10px] text-text-muted block">Hutang Berjalan</span>
                          <span className="font-mono font-bold text-text-primary text-xs mt-0.5 block">
                            Rp {customerCurrentDebt.toLocaleString('id-ID')}
                          </span>
                        </div>
                        <div className="p-2.5 rounded-lg bg-subtle/70 border border-border-subtle">
                          <span className="text-[10px] text-text-muted block">Tagihan Baru Ini</span>
                          <span className="font-mono font-bold text-amber-600 text-xs mt-0.5 block">
                            +Rp {totalAmount.toLocaleString('id-ID')}
                          </span>
                        </div>
                        <div className={`p-2.5 rounded-lg border ${isKasbonOverLimit ? 'bg-rose-500/10 border-rose-500/30' : 'bg-subtle/70 border-border-subtle'}`}>
                          <span className={`text-[10px] block ${isKasbonOverLimit ? 'text-rose-700 font-bold' : 'text-text-muted'}`}>
                            {isKasbonOverLimit ? 'Over Plafon' : 'Sisa Plafon'}
                          </span>
                          <span className={`font-mono font-bold text-xs mt-0.5 block ${isKasbonOverLimit ? 'text-rose-700' : 'text-emerald-600'}`}>
                            {isKasbonOverLimit 
                              ? `+Rp ${overLimitAmount.toLocaleString('id-ID')}` 
                              : customerCreditLimit > 0 
                              ? `Rp ${Math.max(0, customerCreditLimit - newTotalDebt).toLocaleString('id-ID')}` 
                              : 'Aman'}
                          </span>
                        </div>
                      </div>

                      {/* Limit Exceeded Alert & Supervisor PIN Form */}
                      {isKasbonOverLimit && (
                        <div className="p-3.5 rounded-xl bg-rose-500/10 border-2 border-rose-500/40 space-y-3 animate-in fade-in duration-150">
                          <div className="flex items-start gap-2">
                            <ShieldAlert className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                            <div>
                              <h4 className="text-xs font-bold text-rose-800 dark:text-rose-200">
                                Batas Maksimal Kasbon Terlampaui!
                              </h4>
                              <p className="text-[11px] text-rose-700 dark:text-rose-300 mt-0.5">
                                Total hutang menjadi <strong>Rp {newTotalDebt.toLocaleString('id-ID')}</strong> (Plafon: Rp {customerCreditLimit.toLocaleString('id-ID')}, Melebihi: <strong>Rp {overLimitAmount.toLocaleString('id-ID')}</strong>).
                              </p>
                            </div>
                          </div>

                          {authorizedSupervisor ? (
                            <div className="p-2.5 rounded-lg bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-between text-xs">
                              <span className="flex items-center gap-1.5 font-bold text-emerald-800 dark:text-emerald-200">
                                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                                <span>Otorisasi Disetujui: {authorizedSupervisor}</span>
                              </span>
                              <button
                                type="button"
                                onClick={() => setAuthorizedSupervisor(null)}
                                className="text-[10px] text-text-muted hover:text-rose-600 underline cursor-pointer"
                              >
                                Batal Otorisasi
                              </button>
                            </div>
                          ) : (
                            <form onSubmit={handleVerifySupervisorPin} className="p-3 rounded-lg bg-surface border border-border-strong space-y-2">
                              <div className="flex items-center justify-between">
                                <label className="text-[11px] font-bold text-text-primary flex items-center gap-1.5">
                                  <KeyRound className="w-3.5 h-3.5 text-primary" />
                                  <span>PIN Otorisasi Supervisor / Owner</span>
                                </label>
                                <span className="text-[10px] text-text-muted">Diperlukan untuk bypass limit</span>
                              </div>
                              <div className="flex gap-2">
                                <input
                                  type="password"
                                  maxLength={6}
                                  value={supervisorPin}
                                  onChange={e => setSupervisorPin(e.target.value)}
                                  placeholder="Ketik 6 digit PIN Supervisor..."
                                  className="flex-1 px-3 py-1.5 bg-card border border-border-strong rounded-lg font-mono text-xs text-text-primary focus:outline-none focus:border-primary"
                                  autoFocus
                                />
                                <button
                                  type="submit"
                                  disabled={isVerifyingPin || !supervisorPin.trim()}
                                  className="px-4 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-bold transition-all disabled:opacity-50 cursor-pointer"
                                >
                                  {isVerifyingPin ? 'Memeriksa...' : 'Bypass & Izinkan'}
                                </button>
                              </div>
                              {pinError && (
                                <p className="text-[10px] font-semibold text-rose-600 flex items-center gap-1">
                                  <AlertCircle className="w-3 h-3 shrink-0" />
                                  <span>{pinError}</span>
                                </p>
                              )}
                            </form>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Method: Customer Deposit (Store Credit) */}
              {selectedMethod === 'CustomerDeposit' && (
                <div className="space-y-3 bg-emerald-500/5 p-4 rounded-xl border border-emerald-500/20">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-emerald-700 uppercase tracking-wider flex items-center gap-1.5">
                      <Wallet className="w-4 h-4" /> Saldo Deposit (Store Credit) Pelanggan
                    </span>
                    <span className="text-base font-black text-emerald-600 font-mono">
                      Rp {(customerDepositBalance || 0).toLocaleString('id-ID')}
                    </span>
                  </div>
                  <p className="text-xs text-text-secondary">
                    Pelanggan: <strong className="text-text-primary">{customerName || 'Pelanggan Umum (Belum Pilih)'}</strong>
                  </p>
                  {(customerDepositBalance || 0) >= totalAmount ? (
                    <div className="p-3 bg-white/80 dark:bg-card/80 rounded-lg border border-emerald-500/30 text-xs text-emerald-700 flex items-center justify-between">
                      <span className="flex items-center gap-1.5 font-semibold">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" /> Saldo cukup untuk melunasi transaksi ini.
                      </span>
                      <span className="font-mono font-bold">
                        Sisa Deposit: Rp {((customerDepositBalance || 0) - totalAmount).toLocaleString('id-ID')}
                      </span>
                    </div>
                  ) : (
                    <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-lg text-xs space-y-1.5">
                      <div className="flex items-center gap-1.5 font-bold">
                        <AlertTriangle className="w-4 h-4 shrink-0" />
                        Saldo deposit tidak mencukupi (Kurang Rp {(totalAmount - (customerDepositBalance || 0)).toLocaleString('id-ID')})
                      </div>
                      <p className="text-[11px] text-rose-600">
                        Gunakan mode Split Payment untuk memotong saldo deposit sebagian dan membayar sisanya dengan Tunai/QRIS.
                      </p>
                      <button
                        type="button"
                        onClick={() => {
                          setIsSplitMode(true);
                          if ((customerDepositBalance || 0) > 0) {
                            setSplitPayments([
                              { method: 'CustomerDeposit', amount: customerDepositBalance || 0 }
                            ]);
                            setSplitAddMethod('Cash');
                            setSplitAddAmount(Math.max(0, totalAmount - (customerDepositBalance || 0)).toString());
                          }
                        }}
                        className="mt-1 px-3 py-1 bg-emerald-600 text-white rounded text-[11px] font-bold hover:bg-emerald-700"
                      >
                        Gunakan Sebagian via Split Payment →
                      </button>
                    </div>
                  )}
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
                            <div className="font-bold text-text-primary flex items-center gap-1.5">
                              {p.method === 'Cash' && (
                                <>
                                  <Banknote className="w-3.5 h-3.5 text-emerald-500" />
                                  <span>Tunai (Cash)</span>
                                </>
                              )}
                              {p.method === 'QrisDynamic' && (
                                <>
                                  <QrCode className="w-3.5 h-3.5 text-indigo-500" />
                                  <span>QRIS Dinamis</span>
                                </>
                              )}
                              {p.method === 'DebitCard' && (
                                <>
                                  <CreditCard className="w-3.5 h-3.5 text-blue-500" />
                                  <span>Kartu / EDC</span>
                                </>
                              )}
                              {p.method === 'CustomerReceivable' && (
                                <>
                                  <FileText className="w-3.5 h-3.5 text-amber-500" />
                                  <span>Kasbon Piutang</span>
                                </>
                              )}
                              {p.method === 'CustomerDeposit' && (
                                <>
                                  <Wallet className="w-3.5 h-3.5 text-emerald-500" />
                                  <span>Saldo Deposit</span>
                                </>
                              )}
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

                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                    {[
                      { id: 'Cash', label: 'Tunai', icon: Banknote },
                      { id: 'QrisDynamic', label: 'QRIS', icon: QrCode },
                      { id: 'DebitCard', label: 'EDC/Kartu', icon: CreditCard },
                      { id: 'CustomerReceivable', label: 'Kasbon', icon: FileText },
                      { id: 'CustomerDeposit', label: 'Deposit', icon: Wallet },
                    ].map((m) => {
                      const IconComp = m.icon;
                      return (
                        <button
                          key={m.id}
                          type="button"
                          onClick={() => {
                            setSplitAddMethod(m.id as PaymentMethod);
                            if (m.id === 'CustomerDeposit' && customerDepositBalance > 0) {
                              setSplitAddAmount(Math.min(customerDepositBalance, remainingSplitBalance).toString());
                            }
                          }}
                          className={`py-1.5 px-2 rounded-lg text-xs font-bold border transition-all flex items-center justify-center gap-1.5 ${
                            splitAddMethod === m.id
                              ? 'bg-primary text-primary-text border-primary shadow-xs'
                              : 'bg-subtle border-border-subtle text-text-secondary hover:bg-card-hover'
                          }`}
                        >
                          <IconComp className="w-3.5 h-3.5" />
                          <span>{m.label}</span>
                        </button>
                      );
                    })}
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
              disabled={isProcessing || isKasbonBlocked}
              className={`px-6 py-2.5 rounded-md text-xs font-bold shadow-sm flex items-center gap-2 transition-all ${
                isKasbonBlocked
                  ? 'bg-border-strong text-text-muted cursor-not-allowed opacity-60'
                  : 'bg-primary hover:bg-primary-hover text-primary-text'
              }`}
            >
              {isProcessing ? (
                <span>Memproses Pembayaran...</span>
              ) : isKasbonBlocked ? (
                <span>{!customerName ? 'Pilih Member Kasbon Dulu' : 'Perlu Otorisasi Supervisor'}</span>
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
                <span className="flex items-center gap-1.5">
                  <Check className="w-4 h-4" />
                  <span>Selesaikan Transaksi Multi-Bayar</span>
                </span>
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
  subtotal?: number;
  discountAmount?: number;
  couponCode?: string;
  couponDiscountAmount?: number;
  redeemedPoints?: number;
  redeemedPointsDiscountAmount?: number;
  earnedPoints?: number;
  customerRemainingPoints?: number;
  customerName?: string;
  customerPhone?: string;
  items?: Array<{ name: string; quantity: number; unitPrice: number; totalPrice: number }>;
  payments?: Array<{ method: string; amount: number; referenceNumber?: string }>;
  onClose: () => void;
  onPrintReceipt: () => void;
}

export const PaymentSuccessModal: React.FC<PaymentSuccessModalProps> = ({
  isOpen,
  orderNumber,
  totalAmount,
  changeAmount,
  subtotal = 0,
  discountAmount = 0,
  couponCode,
  couponDiscountAmount = 0,
  redeemedPoints = 0,
  redeemedPointsDiscountAmount = 0,
  earnedPoints = 0,
  customerRemainingPoints = 0,
  customerName,
  customerPhone,
  items = [],
  payments = [],
  onClose,
  onPrintReceipt,
}) => {
  const [waPhone, setWaPhone] = useState(customerPhone || '');
  const [copied, setCopied] = useState(false);
  const [showReceiptDetails, setShowReceiptDetails] = useState(false);

  useEffect(() => {
    if (customerPhone) setWaPhone(customerPhone);
    setCopied(false);
  }, [customerPhone, isOpen]);

  if (!isOpen) return null;

  const generateReceiptText = () => {
    const divider = '------------------------------------------';
    let text = `🧾 *STRUK PEMBELIAN OMNIPOS*\n`;
    text += `${divider}\n`;
    text += `No. Faktur : *${orderNumber}*\n`;
    text += `Tanggal    : ${new Date().toLocaleString('id-ID')}\n`;
    if (customerName) {
      text += `Pelanggan  : *${customerName}*\n`;
    }
    text += `${divider}\n`;

    if (items && items.length > 0) {
      items.forEach(item => {
        text += `${item.name}\n`;
        text += `  ${item.quantity}x @Rp ${item.unitPrice.toLocaleString('id-ID')} = Rp ${item.totalPrice.toLocaleString('id-ID')}\n`;
      });
      text += `${divider}\n`;
    }

    if (subtotal > 0 && subtotal !== totalAmount) {
      text += `Subtotal   : Rp ${subtotal.toLocaleString('id-ID')}\n`;
    }
    if (discountAmount > 0) {
      text += `Diskon     : -Rp ${discountAmount.toLocaleString('id-ID')}\n`;
    }
    if (couponCode && couponDiscountAmount > 0) {
      text += `Kupon (${couponCode}): -Rp ${couponDiscountAmount.toLocaleString('id-ID')}\n`;
    }
    if (redeemedPoints > 0 && redeemedPointsDiscountAmount > 0) {
      text += `Tukar Poin (${redeemedPoints} pts): -Rp ${redeemedPointsDiscountAmount.toLocaleString('id-ID')}\n`;
    }

    text += `*TOTAL TAGIHAN : Rp ${totalAmount.toLocaleString('id-ID')}*\n`;

    if (payments && payments.length > 0) {
      payments.forEach(p => {
        text += `Bayar (${p.method}): Rp ${p.amount.toLocaleString('id-ID')}\n`;
      });
    }

    text += `Kembalian  : Rp ${changeAmount.toLocaleString('id-ID')}\n`;
    text += `Status     : *LUNAS*\n`;

    if (earnedPoints > 0 || customerRemainingPoints > 0) {
      text += `${divider}\n`;
      if (earnedPoints > 0) {
        text += `⭐ Poin Diperoleh : +${earnedPoints.toLocaleString('id-ID')} Poin\n`;
      }
      if (customerRemainingPoints > 0) {
        text += `⭐ Saldo Poin Member: ${customerRemainingPoints.toLocaleString('id-ID')} Poin\n`;
      }
    }

    text += `${divider}\n`;
    text += `Terima kasih atas kunjungan Anda! 🙏\n`;
    text += `_Simpan struk ini sebagai bukti pembayaran sah._`;

    return text;
  };

  const handleSendWhatsAppReceipt = () => {
    if (!waPhone.trim()) {
      useToastStore.getState().showToast('Nomor WhatsApp tidak boleh kosong.', 'warning');
      return;
    }
    const receiptText = generateReceiptText();
    openWhatsAppUrl(waPhone, receiptText);
    useToastStore.getState().showToast('Membuka WhatsApp untuk mengirim struk...', 'info');
  };

  const handleCopyReceiptText = async () => {
    const text = generateReceiptText();
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(text);
      } else {
        const textarea = document.createElement('textarea');
        textarea.value = text;
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
      }
      setCopied(true);
      useToastStore.getState().showToast('Teks struk berhasil disalin ke clipboard!', 'success');
      setTimeout(() => setCopied(false), 3000);
    } catch {
      useToastStore.getState().showToast('Gagal menyalin teks struk.', 'error');
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4 select-none">
      <div className="bg-surface border border-border-strong w-full max-w-lg rounded-2xl shadow-2xl p-5 text-center space-y-4 max-h-[92vh] overflow-y-auto">
        {/* Header Icon & Title */}
        <div className="flex flex-col items-center">
          <div className="w-13 h-13 rounded-full bg-emerald-500/20 text-emerald-600 flex items-center justify-center mb-2">
            <CheckCircle2 className="w-7 h-7" />
          </div>
          <h2 className="text-lg font-extrabold text-text-primary">Pembayaran Berhasil!</h2>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-xs font-mono font-bold text-primary px-2.5 py-0.5 rounded-full bg-primary/10 border border-primary/20">
              {orderNumber}
            </span>
            {customerName && (
              <span className="text-xs font-medium text-text-secondary">
                • {customerName}
              </span>
            )}
          </div>
        </div>

        {/* Big Change Box & Total */}
        <div className="p-4 bg-subtle rounded-xl border border-border-subtle flex items-center justify-between">
          <div className="text-left">
            <span className="text-[11px] text-text-muted uppercase font-bold tracking-wider block">Uang Kembalian:</span>
            <p className="text-2xl font-black text-status-success font-mono tabular-nums mt-0.5">
              Rp {changeAmount.toLocaleString('id-ID')}
            </p>
          </div>
          <div className="text-right">
            <span className="text-[11px] text-text-muted uppercase font-bold tracking-wider block">Total Tagihan:</span>
            <p className="text-sm font-bold text-text-primary font-mono tabular-nums mt-0.5">
              Rp {totalAmount.toLocaleString('id-ID')}
            </p>
          </div>
        </div>

        {/* Loyalty Reward Points & Coupon Recap */}
        {(earnedPoints > 0 || couponCode || redeemedPoints > 0) && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-left text-xs">
            {earnedPoints > 0 && (
              <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl space-y-1">
                <div className="flex items-center gap-1.5 font-bold text-amber-700 dark:text-amber-400">
                  <Star className="w-4 h-4 fill-amber-500 text-amber-500" />
                  <span>Poin Member Diperoleh</span>
                </div>
                <div className="flex items-baseline justify-between">
                  <span className="font-extrabold font-mono text-base text-amber-600">
                    +{earnedPoints.toLocaleString('id-ID')} Pts
                  </span>
                  {customerRemainingPoints > 0 && (
                    <span className="text-[10px] text-text-muted font-medium">
                      Total: {customerRemainingPoints.toLocaleString('id-ID')}
                    </span>
                  )}
                </div>
              </div>
            )}

            {(couponCode || redeemedPoints > 0) && (
              <div className="p-3 bg-indigo-500/10 border border-indigo-500/30 rounded-xl space-y-1">
                <div className="flex items-center gap-1.5 font-bold text-indigo-700 dark:text-indigo-400">
                  <Ticket className="w-4 h-4 text-indigo-500" />
                  <span>Diskon & Voucher</span>
                </div>
                <div className="text-[11px] text-text-secondary space-y-0.5">
                  {couponCode && (
                    <div className="flex justify-between">
                      <span>Kupon ({couponCode}):</span>
                      <strong className="text-indigo-600">-Rp {couponDiscountAmount.toLocaleString('id-ID')}</strong>
                    </div>
                  )}
                  {redeemedPoints > 0 && (
                    <div className="flex justify-between">
                      <span>Tukar ({redeemedPoints} Pts):</span>
                      <strong className="text-indigo-600">-Rp {redeemedPointsDiscountAmount.toLocaleString('id-ID')}</strong>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Toggle Detailed Receipt Breakdown */}
        <div className="text-left">
          <button
            type="button"
            onClick={() => setShowReceiptDetails(!showReceiptDetails)}
            className="text-xs font-semibold text-primary hover:underline flex items-center gap-1"
          >
            <span>{showReceiptDetails ? 'Sembunyikan Rincian Item Nota' : 'Lihat Rincian Item Nota'}</span>
            <span className="text-[10px]">{showReceiptDetails ? '▲' : '▼'}</span>
          </button>

          {showReceiptDetails && (
            <div className="mt-2 p-3 bg-subtle rounded-xl border border-border-subtle max-h-40 overflow-y-auto space-y-1.5 text-xs font-mono">
              {items.map((it, idx) => (
                <div key={idx} className="flex justify-between text-text-secondary border-b border-border-subtle/50 pb-1">
                  <span className="truncate max-w-[220px]">{it.name} x{it.quantity}</span>
                  <span className="font-bold text-text-primary">Rp {it.totalPrice.toLocaleString('id-ID')}</span>
                </div>
              ))}
              <div className="pt-1 flex justify-between font-bold text-text-primary">
                <span>Total</span>
                <span>Rp {totalAmount.toLocaleString('id-ID')}</span>
              </div>
            </div>
          )}
        </div>

        {/* WhatsApp & Digital e-Receipt Box */}
        <div className="p-3.5 bg-emerald-500/10 border border-emerald-500/25 rounded-xl text-left space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-emerald-700 dark:text-emerald-400 flex items-center gap-1.5">
              <Share2 className="w-3.5 h-3.5" />
              <span>e-Receipt Struk WhatsApp & Salin Teks</span>
            </span>
            <button
              type="button"
              onClick={handleCopyReceiptText}
              className="text-[11px] font-bold text-emerald-700 dark:text-emerald-400 hover:text-emerald-800 flex items-center gap-1 bg-emerald-500/20 px-2 py-0.5 rounded-md transition-colors"
            >
              {copied ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
              <span>{copied ? 'Tersalin!' : 'Salin Teks'}</span>
            </button>
          </div>

          <div className="flex gap-2">
            <input
              type="tel"
              value={waPhone}
              onChange={e => setWaPhone(e.target.value)}
              placeholder="08123456789 atau 628..."
              className="flex-1 px-3 py-1.5 bg-card border border-border-strong rounded-lg text-xs font-mono text-text-primary focus:outline-none focus:border-emerald-500"
            />
            <button
              type="button"
              onClick={handleSendWhatsAppReceipt}
              disabled={!waPhone.trim()}
              className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold shadow-sm transition-all flex items-center gap-1.5 disabled:opacity-40"
            >
              <Share2 className="w-3.5 h-3.5" />
              <span>Kirim WA</span>
            </button>
          </div>
          <p className="text-[10px] text-text-muted">
            Format nomor otomatis diawali 62. Tidak memerlukan koneksi cloud berbayar (Direct WhatsApp Link).
          </p>
        </div>

        {/* Action Buttons */}
        <div className="space-y-2 pt-1">
          <button
            type="button"
            onClick={onPrintReceipt}
            className="w-full py-2.5 rounded-xl bg-primary hover:bg-primary-hover text-primary-text text-xs font-bold flex items-center justify-center gap-2 shadow-sm transition-all"
          >
            <Printer className="w-4 h-4" />
            <span>[Enter] Cetak Struk Kasir Thermal</span>
          </button>
          <button
            type="button"
            onClick={onClose}
            className="w-full py-2.5 rounded-xl bg-card hover:bg-card-hover border border-border-subtle text-text-secondary text-xs font-semibold flex items-center justify-center gap-2 transition-colors"
          >
            <PlusCircle className="w-4 h-4" />
            <span>[Spasi / ESC] Buka Transaksi Baru</span>
          </button>
        </div>
      </div>
    </div>
  );
};

