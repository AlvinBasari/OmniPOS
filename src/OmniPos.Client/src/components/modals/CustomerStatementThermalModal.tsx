import React, { useState, useEffect } from 'react';
import { 
  X, 
  Printer, 
  Copy, 
  Send, 
  Check, 
  AlertTriangle, 
  Receipt,
  FileText
} from 'lucide-react';
import { Customer } from '../../types';

interface CustomerStatementThermalModalProps {
  isOpen: boolean;
  onClose: () => void;
  customer: Customer | null;
}

export const CustomerStatementThermalModal: React.FC<CustomerStatementThermalModalProps> = ({
  isOpen,
  onClose,
  customer,
}) => {
  const [loading, setLoading] = useState<boolean>(true);
  const [rawText, setRawText] = useState<string>('');
  const [unpaidCount, setUnpaidCount] = useState<number>(0);
  const [copied, setCopied] = useState<boolean>(false);
  const [printing, setPrinting] = useState<boolean>(false);
  const [printSuccess, setPrintSuccess] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && customer) {
      loadStatement(false);
      setCopied(false);
      setPrintSuccess(false);
    }
  }, [isOpen, customer]);

  const loadStatement = async (shouldPrint: boolean = false) => {
    if (!customer) return;
    setLoading(!shouldPrint);
    if (shouldPrint) setPrinting(true);
    setError(null);

    try {
      const res = await fetch(`/api/v1/customers/${customer.id}/statement-thermal?print=${shouldPrint}`);
      if (!res.ok) {
        throw new Error('Gagal memuat slip tagihan piutang.');
      }
      const data = await res.json();
      setRawText(data.rawText || '');
      setUnpaidCount(data.unpaidCount || 0);
      if (shouldPrint) {
        setPrintSuccess(true);
        setTimeout(() => setPrintSuccess(false), 3000);
      }
    } catch (err: any) {
      setError(err.message || 'Gagal terhubung ke server printer.');
    } finally {
      setLoading(false);
      setPrinting(false);
    }
  };

  if (!isOpen || !customer) return null;

  const handleCopyText = () => {
    if (!rawText) return;
    navigator.clipboard.writeText(rawText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSendWa = () => {
    if (!customer.phoneNumber) {
      alert('Pelanggan tidak memiliki nomor WhatsApp!');
      return;
    }

    let cleanPhone = customer.phoneNumber.replace(/\D/g, '');
    if (cleanPhone.startsWith('0')) {
      cleanPhone = '62' + cleanPhone.slice(1);
    } else if (!cleanPhone.startsWith('62')) {
      cleanPhone = '62' + cleanPhone;
    }

    const msg = `*REKAPITULASI TAGIHAN KASBON*\nKepada Yth. Bpk/Ibu *${customer.name}*,\n\nBerikut kami informasikan ringkasan saldo tagihan kasbon aktif Anda:\n\n• Total Tagihan Kasbon: *Rp ${customer.totalReceivable.toLocaleString('id-ID')}*\n• Jumlah Transaksi Kasbon: *${unpaidCount} nota*\n• Batas Plafon Kredit: *Rp ${customer.creditLimit.toLocaleString('id-ID')}*\n\nMohon untuk melakukan konfirmasi atau pelunasan melalui kasir atau transfer bank.\n\n_Catatan: Abaikan pesan ini apabila Anda telah melakukan pembayaran sebelumnya._\nTerima kasih atas kerja samanya! 🙏`;

    window.open(`https://api.whatsapp.com/send?phone=${cleanPhone}&text=${encodeURIComponent(msg)}`, '_blank');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="bg-slate-900 p-4 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-white/10 rounded-lg">
              <Receipt className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <h2 className="text-base font-bold">Slip Thermal Kasbon</h2>
              <p className="text-xs text-slate-400">{customer.name} • {customer.phoneNumber || 'Tanpa No. HP'}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-white/10 rounded-lg text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Action Toolbar */}
        <div className="bg-slate-50 border-b border-slate-200 p-3 flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 text-xs text-slate-600 font-medium">
            <FileText className="w-4 h-4 text-slate-400" />
            Format Thermal 58/80mm ESC/POS
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleCopyText}
              className="px-2.5 py-1.5 rounded-lg border border-slate-200 hover:bg-white text-xs font-semibold text-slate-700 flex items-center gap-1 transition-colors shadow-sm"
              title="Salin teks struk"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
              {copied ? 'Tersalin' : 'Salin'}
            </button>
            <button
              type="button"
              onClick={() => loadStatement(true)}
              disabled={printing || loading}
              className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold flex items-center gap-1.5 transition-colors shadow-sm disabled:opacity-50"
            >
              <Printer className="w-3.5 h-3.5" />
              {printing ? 'Mencetak...' : printSuccess ? 'Tercetak!' : 'Cetak Struk'}
            </button>
          </div>
        </div>

        {/* Body Preview */}
        <div className="p-4 overflow-y-auto flex-1 bg-slate-100 flex justify-center">
          {loading ? (
            <div className="py-16 text-center text-sm text-slate-400">Memuat format slip thermal...</div>
          ) : error ? (
            <div className="p-4 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          ) : (
            <div className="w-full max-w-[340px] bg-white p-5 rounded-lg shadow-sm border border-slate-200 text-slate-900 font-mono text-[12px] leading-relaxed whitespace-pre select-all">
              {rawText}
            </div>
          )}
        </div>

        {/* Footer WhatsApp Button */}
        <div className="p-4 bg-white border-t border-slate-200 space-y-2">
          {customer.phoneNumber ? (
            <button
              type="button"
              onClick={handleSendWa}
              className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold flex items-center justify-center gap-2 shadow-sm transition-colors text-sm"
            >
              <Send className="w-4 h-4" />
              Kirim Tagihan Kasbon via WhatsApp (Gratis Rp 0)
            </button>
          ) : (
            <div className="text-center text-xs text-slate-400 py-1">
              Nomor WhatsApp pelanggan belum terdaftar untuk kirim notifikasi otomatis.
            </div>
          )}
          <button
            type="button"
            onClick={onClose}
            className="w-full py-2 text-xs font-semibold text-slate-500 hover:text-slate-800 transition-colors"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
};
