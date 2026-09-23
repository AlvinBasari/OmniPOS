import React, { useState, useEffect } from 'react';
import { 
  X, 
  Wallet, 
  ArrowUpRight, 
  CheckCircle2, 
  CreditCard, 
  QrCode, 
  Banknote, 
  Clock, 
  Send, 
  AlertCircle,
  History
} from 'lucide-react';
import { Customer, CustomerDepositTransaction } from '../../types';

interface CustomerDepositModalProps {
  isOpen: boolean;
  onClose: () => void;
  customer: Customer | null;
  onSuccess: () => void;
}

const PRESET_AMOUNTS = [25000, 50000, 100000, 200000, 500000, 1000000];

export const CustomerDepositModal: React.FC<CustomerDepositModalProps> = ({
  isOpen,
  onClose,
  customer,
  onSuccess,
}) => {
  const [activeTab, setActiveTab] = useState<'topup' | 'history'>('topup');
  const [amount, setAmount] = useState<number>(100000);
  const [customAmountStr, setCustomAmountStr] = useState<string>('100000');
  const [paymentMethod, setPaymentMethod] = useState<string>('CASH');
  const [referenceNumber, setReferenceNumber] = useState<string>('');
  const [notes, setNotes] = useState<string>('Top-up saldo belanja');
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [successData, setSuccessData] = useState<{ newBalance: number; amount: number } | null>(null);
  
  const [history, setHistory] = useState<CustomerDepositTransaction[]>([]);
  const [loadingHistory, setLoadingHistory] = useState<boolean>(false);

  useEffect(() => {
    if (isOpen && customer) {
      setAmount(100000);
      setCustomAmountStr('100000');
      setPaymentMethod('CASH');
      setReferenceNumber('');
      setNotes('Top-up saldo belanja');
      setError(null);
      setSuccessData(null);
      setActiveTab('topup');
      loadHistory();
    }
  }, [isOpen, customer]);

  const loadHistory = async () => {
    if (!customer) return;
    setLoadingHistory(true);
    try {
      const res = await fetch(`/api/v1/customers/${customer.id}/deposit/history`);
      if (res.ok) {
        const data = await res.json();
        setHistory(data || []);
      }
    } catch (err) {
      console.error('Failed to load deposit history', err);
    } finally {
      setLoadingHistory(false);
    }
  };

  if (!isOpen || !customer) return null;

  const handlePresetClick = (val: number) => {
    setAmount(val);
    setCustomAmountStr(val.toString());
  };

  const handleCustomChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/\D/g, '');
    const num = parseInt(raw, 10) || 0;
    setAmount(num);
    setCustomAmountStr(raw);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (amount <= 0) {
      setError('Nominal top-up harus lebih dari Rp 0');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/v1/customers/${customer.id}/deposit/topup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount,
          paymentMethod,
          referenceNumber: referenceNumber.trim() || undefined,
          notes: notes.trim() || undefined,
          cashierUserId: 'Kasir',
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'Gagal melakukan top-up deposit');
      }

      setSuccessData({
        newBalance: data.newBalance,
        amount: amount,
      });
      loadHistory();
      onSuccess();
    } catch (err: any) {
      setError(err.message || 'Terjadi kesalahan sistem.');
    } finally {
      setLoading(false);
    }
  };

  const handleSendWaNotification = () => {
    if (!customer.phoneNumber || !successData) return;
    let cleanPhone = customer.phoneNumber.replace(/\D/g, '');
    if (cleanPhone.startsWith('0')) {
      cleanPhone = '62' + cleanPhone.slice(1);
    } else if (!cleanPhone.startsWith('62')) {
      cleanPhone = '62' + cleanPhone;
    }

    const msg = `*KONFIRMASI TOP-UP SALDO DEPOSIT*\nHalo kak *${customer.name}*,\n\nTop-up saldo belanja Anda telah berhasil!\n• Nominal Top-Up: *Rp ${successData.amount.toLocaleString('id-ID')}*\n• Metode: *${paymentMethod}*\n• Saldo Baru Saat Ini: *Rp ${successData.newBalance.toLocaleString('id-ID')}*\n\nSaldo dapat langsung digunakan untuk berbelanja di toko kami tanpa perlu bawa uang tunai. Terima kasih banyak! 🙏`;

    window.open(`https://api.whatsapp.com/send?phone=${cleanPhone}&text=${encodeURIComponent(msg)}`, '_blank');
  };

  const currentBalance = customer.depositBalance || 0;
  const simulatedNewBalance = currentBalance + (amount || 0);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="bg-gradient-to-r from-emerald-600 to-teal-700 p-5 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-white/10 rounded-xl">
              <Wallet className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg font-bold">Saldo Deposit (Store Credit)</h2>
              <p className="text-xs text-emerald-100">{customer.name} • {customer.memberTier || 'REGULAR'}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-white/20 rounded-lg text-white/80 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Balance Card Header */}
        <div className="bg-emerald-50 px-6 py-4 border-b border-emerald-100 flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-emerald-700 uppercase tracking-wider">Saldo Deposit Saat Ini</span>
            <div className="text-2xl font-black text-emerald-900 mt-0.5">
              Rp {currentBalance.toLocaleString('id-ID')}
            </div>
          </div>
          <div className="flex gap-1 bg-white p-1 rounded-xl border border-emerald-200">
            <button
              type="button"
              onClick={() => setActiveTab('topup')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                activeTab === 'topup' ? 'bg-emerald-600 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <ArrowUpRight className="w-3.5 h-3.5" /> Top-Up
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('history')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                activeTab === 'history' ? 'bg-emerald-600 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <History className="w-3.5 h-3.5" /> Riwayat
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto flex-1">
          {error && (
            <div className="mb-4 p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-sm flex items-start gap-2">
              <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {activeTab === 'topup' ? (
            successData ? (
              <div className="text-center py-6">
                <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-3 shadow-inner">
                  <CheckCircle2 className="w-10 h-10" />
                </div>
                <h3 className="text-lg font-bold text-slate-800">Top-Up Deposit Berhasil!</h3>
                <p className="text-sm text-slate-500 mt-1">
                  Nominal <span className="font-semibold text-emerald-600">Rp {successData.amount.toLocaleString('id-ID')}</span> berhasil dikreditkan ke saldo deposit pelanggan.
                </p>

                <div className="mt-5 p-4 bg-slate-50 border border-slate-200 rounded-xl text-left max-w-sm mx-auto space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Nama Pelanggan</span>
                    <span className="font-bold text-slate-800">{customer.name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Metode Bayar</span>
                    <span className="font-semibold text-slate-700">{paymentMethod}</span>
                  </div>
                  <div className="flex justify-between pt-2 border-t border-slate-200">
                    <span className="text-slate-700 font-semibold">Saldo Baru</span>
                    <span className="font-black text-emerald-700 text-base">
                      Rp {successData.newBalance.toLocaleString('id-ID')}
                    </span>
                  </div>
                </div>

                <div className="mt-6 flex flex-col gap-2">
                  {customer.phoneNumber && (
                    <button
                      type="button"
                      onClick={handleSendWaNotification}
                      className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold flex items-center justify-center gap-2 shadow-sm transition-colors"
                    >
                      <Send className="w-4 h-4" />
                      Kirim Konfirmasi via WhatsApp (Gratis)
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => {
                      setSuccessData(null);
                      setAmount(100000);
                      setCustomAmountStr('100000');
                    }}
                    className="w-full py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-semibold transition-colors"
                  >
                    Top-Up Lagi
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-5">
                {/* Nominal Pre-sets */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                    Pilih Nominal Cepat
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {PRESET_AMOUNTS.map((val) => (
                      <button
                        key={val}
                        type="button"
                        onClick={() => handlePresetClick(val)}
                        className={`py-2 px-3 rounded-xl border text-sm font-semibold transition-all ${
                          amount === val
                            ? 'border-emerald-600 bg-emerald-50 text-emerald-700 ring-2 ring-emerald-500/20 shadow-sm'
                            : 'border-slate-200 hover:border-slate-300 text-slate-700 bg-white'
                        }`}
                      >
                        Rp {(val / 1000).toLocaleString('id-ID')}k
                      </button>
                    ))}
                  </div>
                </div>

                {/* Custom Amount */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Atau Masukkan Nominal Sendiri
                  </label>
                  <div className="relative">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-sm">
                      Rp
                    </span>
                    <input
                      type="text"
                      value={customAmountStr ? parseInt(customAmountStr, 10).toLocaleString('id-ID') : ''}
                      onChange={handleCustomChange}
                      placeholder="0"
                      className="w-full pl-11 pr-4 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-bold text-slate-800 text-lg"
                      required
                    />
                  </div>
                </div>

                {/* Payment Method */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                    Metode Pembayaran Top-Up
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    <button
                      type="button"
                      onClick={() => setPaymentMethod('CASH')}
                      className={`py-2.5 px-3 rounded-xl border text-xs font-bold flex flex-col items-center gap-1.5 transition-all ${
                        paymentMethod === 'CASH'
                          ? 'border-emerald-600 bg-emerald-50 text-emerald-800 ring-2 ring-emerald-500/20'
                          : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      <Banknote className="w-5 h-5" />
                      Tunai (Cash)
                    </button>
                    <button
                      type="button"
                      onClick={() => setPaymentMethod('QRIS')}
                      className={`py-2.5 px-3 rounded-xl border text-xs font-bold flex flex-col items-center gap-1.5 transition-all ${
                        paymentMethod === 'QRIS'
                          ? 'border-emerald-600 bg-emerald-50 text-emerald-800 ring-2 ring-emerald-500/20'
                          : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      <QrCode className="w-5 h-5" />
                      QRIS
                    </button>
                    <button
                      type="button"
                      onClick={() => setPaymentMethod('TRANSFER')}
                      className={`py-2.5 px-3 rounded-xl border text-xs font-bold flex flex-col items-center gap-1.5 transition-all ${
                        paymentMethod === 'TRANSFER'
                          ? 'border-emerald-600 bg-emerald-50 text-emerald-800 ring-2 ring-emerald-500/20'
                          : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      <CreditCard className="w-5 h-5" />
                      Transfer Bank
                    </button>
                  </div>
                  {paymentMethod === 'CASH' && (
                    <p className="text-[11px] text-emerald-700 mt-1.5 flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Otomatis menambah penerimaan kas masuk (Cash In) pada shift kasir aktif.
                    </p>
                  )}
                </div>

                {/* Reference No & Notes */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">
                      No. Ref / Bukti (Opsional)
                    </label>
                    <input
                      type="text"
                      value={referenceNumber}
                      onChange={(e) => setReferenceNumber(e.target.value)}
                      placeholder="Contoh: TRX-9982"
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">
                      Catatan
                    </label>
                    <input
                      type="text"
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="Top-up belanja..."
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                </div>

                {/* Total Preview */}
                <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 flex justify-between items-center">
                  <span className="text-xs font-semibold text-slate-600">Simulasi Saldo Setelah Top-Up:</span>
                  <span className="text-base font-black text-emerald-700">
                    Rp {simulatedNewBalance.toLocaleString('id-ID')}
                  </span>
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={onClose}
                    className="flex-1 py-2.5 rounded-xl border border-slate-300 font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    disabled={loading || amount <= 0}
                    className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold transition-colors disabled:opacity-50 flex items-center justify-center gap-2 shadow-sm"
                  >
                    {loading ? 'Menyimpan...' : `Top-Up Rp ${amount.toLocaleString('id-ID')}`}
                  </button>
                </div>
              </form>
            )
          ) : (
            /* History Tab */
            <div className="space-y-3">
              {loadingHistory ? (
                <div className="py-8 text-center text-sm text-slate-400">Memuat riwayat deposit...</div>
              ) : history.length === 0 ? (
                <div className="py-8 text-center text-sm text-slate-400">Belum ada riwayat transaksi deposit.</div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {history.map((tx) => (
                    <div key={tx.id} className="py-2.5 flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <div
                          className={`p-2 rounded-lg ${
                            tx.type === 'TOPUP' ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'
                          }`}
                        >
                          {tx.type === 'TOPUP' ? <ArrowUpRight className="w-4 h-4" /> : <Wallet className="w-4 h-4" />}
                        </div>
                        <div>
                          <p className="text-xs font-bold text-slate-800">
                            {tx.type === 'TOPUP' ? 'Top-Up Deposit' : 'Pembayaran Belanja'}
                          </p>
                          <p className="text-[11px] text-slate-400 flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {new Date(tx.createdAt).toLocaleString('id-ID', {
                              dateStyle: 'short',
                              timeStyle: 'short',
                            })} • {tx.paymentMethod}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <div
                          className={`text-xs font-bold ${
                            tx.type === 'TOPUP' ? 'text-emerald-600' : 'text-rose-600'
                          }`}
                        >
                          {tx.type === 'TOPUP' ? '+' : '-'} Rp {tx.amount.toLocaleString('id-ID')}
                        </div>
                        <div className="text-[10px] text-slate-400">
                          Sisa: Rp {tx.balanceAfter.toLocaleString('id-ID')}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
