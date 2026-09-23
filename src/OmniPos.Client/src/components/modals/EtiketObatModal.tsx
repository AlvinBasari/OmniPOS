import React, { useState } from 'react';
import { 
  X, 
  Printer, 
  Pill, 
  Clock, 
  Calendar, 
  User, 
  FileText, 
  AlertTriangle, 
  ShieldCheck,
  CheckCircle2,
  Sparkles,
  Info
} from 'lucide-react';
import { useAuthStore } from '../../store/useAuthStore';
import { useToastStore } from '../../store/useToastStore';

export type EtiketType = 'putih' | 'biru'; // Putih: Obat Dalam, Biru: Obat Luar

export interface EtiketData {
  doctorName?: string;
  prescriptionNumber?: string;
  patientName: string;
  patientAge?: string;
  medicineName: string;
  quantityStr?: string;
  signa: string; // e.g. "3 x 1 Tablet Sehari"
  consumptionTime: string; // "Sesudah Makan", "Sebelum Makan", "Bersama Makan", "Bila Sakit"
  period: string; // "Pagi / Siang / Malam", "Tiap 8 Jam"
  notes?: string; // "Habiskan (Antibiotik)", "Kocok Dahulu"
  expiredDate?: string;
  pharmacistName?: string;
  type: EtiketType;
}

interface EtiketObatModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialData?: Partial<EtiketData>;
}

export const EtiketObatModal: React.FC<EtiketObatModalProps> = ({
  isOpen,
  onClose,
  initialData
}) => {
  const { storeInfo, currentUser } = useAuthStore();

  const [type, setType] = useState<EtiketType>(initialData?.type || 'putih');
  const [patientName, setPatientName] = useState(initialData?.patientName || 'Pasien Umum');
  const [patientAge, setPatientAge] = useState(initialData?.patientAge || '');
  const [prescriptionNo, setPrescriptionNo] = useState(
    initialData?.prescriptionNumber || `RXP-${Date.now().toString().slice(-6)}`
  );
  const [medicineName, setMedicineName] = useState(initialData?.medicineName || '');
  const [quantityStr, setQuantityStr] = useState(initialData?.quantityStr || '10 Tablet');
  const [signa, setSigna] = useState(initialData?.signa || '3 x 1 Tablet Sehari');
  const [consumptionTime, setConsumptionTime] = useState(initialData?.consumptionTime || 'Sesudah Makan');
  const [period, setPeriod] = useState(initialData?.period || 'Pagi, Siang, Malam');
  const [notes, setNotes] = useState(initialData?.notes || '');
  const [expiredDate, setExpiredDate] = useState(
    initialData?.expiredDate || new Date(Date.now() + 180 * 86400000).toISOString().split('T')[0]
  );
  const [isPrinting, setIsPrinting] = useState(false);

  // Sync initialData when opened
  React.useEffect(() => {
    if (initialData) {
      if (initialData.type) setType(initialData.type);
      if (initialData.patientName) setPatientName(initialData.patientName);
      if (initialData.patientAge) setPatientAge(initialData.patientAge);
      if (initialData.medicineName) setMedicineName(initialData.medicineName);
      if (initialData.quantityStr) setQuantityStr(initialData.quantityStr);
      if (initialData.signa) setSigna(initialData.signa);
      if (initialData.consumptionTime) setConsumptionTime(initialData.consumptionTime);
      if (initialData.notes) setNotes(initialData.notes);
    }
  }, [initialData, isOpen]);

  if (!isOpen) return null;

  const handlePrint = () => {
    setIsPrinting(true);
    const printWindow = window.open('', '_blank', 'width=550,height=650');
    if (!printWindow) {
      useToastStore.getState().showToast('Izinkan pop-up browser untuk mencetak etiket!', 'error');
      setIsPrinting(false);
      return;
    }

    const apotekName = storeInfo?.storeName || 'OMNIPOS APOTEK & FARMASI SEHAT';
    const apotekAddress = storeInfo?.storeAddress || 'Jl. Kesehatan No. 88, Kota Sejahtera';
    const siaNumber = 'SIPA: 19890812/SIPA-32.04/2024/2001';
    const currentDateStr = new Date().toLocaleDateString('id-ID', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });

    const isObatLuar = type === 'biru';

    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Etiket Obat - ${medicineName || 'Farmasi'}</title>
          <style>
            @page {
              margin: 0;
              size: auto;
            }
            body {
              font-family: Arial, Helvetica, sans-serif;
              margin: 0;
              padding: 6px;
              background: #fff;
              color: #000;
            }
            .etiket-box {
              width: 220px;
              min-height: 140px;
              box-sizing: border-box;
              border: 2px solid ${isObatLuar ? '#1e40af' : '#15803d'};
              background-color: ${isObatLuar ? '#eff6ff' : '#ffffff'};
              border-radius: 6px;
              padding: 6px 8px;
              display: flex;
              flex-direction: column;
              justify-content: space-between;
              text-align: center;
              overflow: hidden;
            }
            @media print {
              body { padding: 0; }
              .etiket-box {
                width: 188px;
                border: 2px solid ${isObatLuar ? '#000' : '#000'};
              }
            }
            .apotek-title {
              font-size: 9px;
              font-weight: 900;
              text-transform: uppercase;
              color: ${isObatLuar ? '#1e3a8a' : '#14532d'};
              line-height: 1.1;
            }
            .apotek-sub {
              font-size: 7px;
              color: #555;
              border-bottom: 1px solid #999;
              padding-bottom: 3px;
              margin-bottom: 4px;
            }
            .meta-row {
              display: flex;
              justify-content: space-between;
              font-size: 8px;
              font-family: monospace;
              color: #333;
              margin-bottom: 3px;
            }
            .patient-name {
              font-size: 10px;
              font-weight: bold;
              text-align: left;
              border-bottom: 1px dashed #aaa;
              padding-bottom: 2px;
              margin-bottom: 4px;
            }
            .medicine-name {
              font-size: 10px;
              font-weight: 900;
              text-transform: uppercase;
              margin: 2px 0;
            }
            .signa-box {
              background: ${isObatLuar ? '#dbeafe' : '#f0fdf4'};
              border: 1px solid ${isObatLuar ? '#93c5fd' : '#bbf7d0'};
              border-radius: 4px;
              padding: 4px;
              margin: 4px 0;
            }
            .signa-text {
              font-size: 11px;
              font-weight: 900;
              line-height: 1.2;
            }
            .signa-sub {
              font-size: 8px;
              font-weight: bold;
              color: #333;
              margin-top: 2px;
            }
            .warning-banner {
              background: #1e3a8a;
              color: #ffffff;
              font-size: 8px;
              font-weight: 900;
              text-transform: uppercase;
              padding: 2px;
              border-radius: 2px;
              letter-spacing: 0.5px;
              margin: 3px 0;
            }
            .footer-row {
              display: flex;
              justify-content: space-between;
              align-items: flex-end;
              font-size: 7px;
              color: #555;
              border-top: 1px solid #ccc;
              padding-top: 3px;
              margin-top: 3px;
            }
          </style>
        </head>
        <body>
          <div class="etiket-box">
            <div>
              <div class="apotek-title">${apotekName}</div>
              <div class="apotek-sub">${apotekAddress} • ${siaNumber}</div>
              <div class="meta-row">
                <span>No: ${prescriptionNo}</span>
                <span>Tgl: ${currentDateStr}</span>
              </div>
              <div class="patient-name">
                Pasien: <strong>${patientName}</strong> ${patientAge ? `(${patientAge})` : ''}
              </div>
            </div>

            <div>
              <div class="medicine-name">${medicineName} ${quantityStr ? `(${quantityStr})` : ''}</div>
              
              ${isObatLuar ? '<div class="warning-banner">⚠️ OBAT LUAR - TIDAK BOLEH DITELAN</div>' : ''}

              <div class="signa-box">
                <div class="signa-text">${signa}</div>
                <div class="signa-sub">${consumptionTime} • ${period}</div>
              </div>

              ${notes ? `<div style="font-size:8px;font-style:italic;color:#b91c1c;font-weight:bold;">${notes}</div>` : ''}
            </div>

            <div class="footer-row">
              <span>Exp: <strong>${expiredDate || '-'}</strong></span>
              <span>Apoteker: ${currentUser?.fullName || 'Apoteker Penanggung Jawab'}</span>
            </div>
          </div>

          <script>
            window.onload = function() {
              window.print();
              setTimeout(function() {
                window.close();
              }, 500);
            };
          </script>
        </body>
      </html>
    `;

    printWindow.document.open();
    printWindow.document.write(htmlContent);
    printWindow.document.close();
    setIsPrinting(false);
    useToastStore.getState().showToast(`Etiket obat berhasil dikirim ke printer thermal!`, 'success');
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-card border border-border-subtle rounded-2xl w-full max-w-xl shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="p-4 border-b border-border-subtle flex items-center justify-between bg-surface">
          <div className="flex items-center gap-2.5">
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold ${
              type === 'biru' ? 'bg-blue-600/10 text-blue-600' : 'bg-emerald-600/10 text-emerald-600'
            }`}>
              <Pill className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-text-primary flex items-center gap-2">
                <span>Cetak Etiket Aturan Pakai Obat</span>
                <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                  type === 'biru' ? 'bg-blue-500/10 text-blue-600 border border-blue-500/20' : 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/20'
                }`}>
                  {type === 'biru' ? 'Etiket Biru (Obat Luar)' : 'Etiket Putih (Obat Dalam)'}
                </span>
              </h2>
              <p className="text-[11px] text-text-secondary">
                Format standar Kemenkes & BPOM untuk label strip/botol obat
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-text-muted hover:text-text-primary rounded-lg hover:bg-subtle transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-4 space-y-4 overflow-y-auto max-h-[75vh]">
          {/* Tipe Etiket Selector */}
          <div>
            <label className="block text-xs font-bold text-text-secondary mb-1.5">
              Pilih Jenis Etiket Obat:
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setType('putih')}
                className={`p-3 rounded-xl border text-left flex items-start gap-3 transition-all ${
                  type === 'putih'
                    ? 'border-emerald-600 bg-emerald-500/10 shadow-xs'
                    : 'border-border-subtle bg-card hover:bg-card-hover text-text-secondary'
                }`}
              >
                <div className="w-4 h-4 rounded-full border-2 border-emerald-600 bg-white flex items-center justify-center mt-0.5">
                  {type === 'putih' && <div className="w-2 h-2 rounded-full bg-emerald-600" />}
                </div>
                <div>
                  <div className="font-bold text-xs text-text-primary">Etiket Putih (Obat Dalam)</div>
                  <p className="text-[10px] text-text-muted mt-0.5">Untuk tablet, kapsul, sirup oral yang diminum</p>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setType('biru')}
                className={`p-3 rounded-xl border text-left flex items-start gap-3 transition-all ${
                  type === 'biru'
                    ? 'border-blue-600 bg-blue-500/10 shadow-xs'
                    : 'border-border-subtle bg-card hover:bg-card-hover text-text-secondary'
                }`}
              >
                <div className="w-4 h-4 rounded-full border-2 border-blue-600 bg-blue-600 flex items-center justify-center mt-0.5">
                  {type === 'biru' && <div className="w-2 h-2 rounded-full bg-white" />}
                </div>
                <div>
                  <div className="font-bold text-xs text-text-primary">Etiket Biru (Obat Luar)</div>
                  <p className="text-[10px] text-text-muted mt-0.5">Salep, tetes telinga/mata, antiseptik (Tidak Ditelan)</p>
                </div>
              </button>
            </div>
          </div>

          {/* Pasien & Resep */}
          <div className="grid grid-cols-3 gap-2">
            <div className="col-span-2">
              <label className="block text-[11px] font-bold text-text-secondary mb-1">
                Nama Pasien *
              </label>
              <input
                type="text"
                required
                value={patientName}
                onChange={(e) => setPatientName(e.target.value)}
                placeholder="Contoh: Bpk. Bambang Sutrisno"
                className="w-full px-3 py-1.5 bg-card border border-border-strong rounded-lg text-xs font-semibold text-text-primary focus:outline-none focus:border-primary"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-text-secondary mb-1">
                Usia / BB
              </label>
              <input
                type="text"
                value={patientAge}
                onChange={(e) => setPatientAge(e.target.value)}
                placeholder="35 Thn / 60 Kg"
                className="w-full px-3 py-1.5 bg-card border border-border-strong rounded-lg text-xs font-semibold text-text-primary focus:outline-none focus:border-primary"
              />
            </div>
          </div>

          {/* Nama Obat & Jumlah */}
          <div className="grid grid-cols-3 gap-2">
            <div className="col-span-2">
              <label className="block text-[11px] font-bold text-text-secondary mb-1">
                Nama Obat *
              </label>
              <input
                type="text"
                required
                value={medicineName}
                onChange={(e) => setMedicineName(e.target.value)}
                placeholder="Contoh: Amoxicillin 500mg"
                className="w-full px-3 py-1.5 bg-card border border-border-strong rounded-lg text-xs font-bold text-text-primary focus:outline-none focus:border-primary"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-text-secondary mb-1">
                Jumlah / Satuan
              </label>
              <input
                type="text"
                value={quantityStr}
                onChange={(e) => setQuantityStr(e.target.value)}
                placeholder="10 Tablet"
                className="w-full px-3 py-1.5 bg-card border border-border-strong rounded-lg text-xs font-semibold text-text-primary focus:outline-none focus:border-primary"
              />
            </div>
          </div>

          {/* Aturan Pakai (Signa) Presets & Custom */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-[11px] font-bold text-text-secondary">
                Aturan Minum / Pakai (Signa) *
              </label>
              <span className="text-[10px] text-text-muted">Pilih cepat:</span>
            </div>
            <div className="flex flex-wrap gap-1.5 mb-2">
              {[
                '3 x 1 Tablet Sehari',
                '2 x 1 Tablet Sehari',
                '1 x 1 Tablet Sehari',
                '3 x 1 Sendok Teh (5ml)',
                'Oleskan Tipis 2x Sehari'
              ].map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => setSigna(preset)}
                  className={`px-2 py-1 rounded text-[10px] font-bold border transition-colors ${
                    signa === preset
                      ? 'bg-primary text-primary-text border-primary'
                      : 'bg-subtle text-text-secondary hover:bg-card-hover border-border-subtle'
                  }`}
                >
                  {preset}
                </button>
              ))}
            </div>
            <input
              type="text"
              required
              value={signa}
              onChange={(e) => setSigna(e.target.value)}
              className="w-full px-3 py-1.5 bg-card border border-border-strong rounded-lg text-xs font-bold text-text-primary focus:outline-none focus:border-primary"
            />
          </div>

          {/* Waktu Pemakaian & Instruksi Khusus */}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-[11px] font-bold text-text-secondary mb-1">
                Waktu Konsumsi
              </label>
              <select
                value={consumptionTime}
                onChange={(e) => setConsumptionTime(e.target.value)}
                className="w-full px-3 py-1.5 bg-card border border-border-strong rounded-lg text-xs font-semibold text-text-primary focus:outline-none focus:border-primary"
              >
                <option value="Sesudah Makan">Sesudah Makan</option>
                <option value="Sebelum Makan (Perut Kosong)">Sebelum Makan (Perut Kosong)</option>
                <option value="Bersama Makan / Saat Makan">Bersama Makan / Saat Makan</option>
                <option value="Sebelum Tidur Malam">Sebelum Tidur Malam</option>
                <option value="Bila Perlu / Saat Nyeri Sakit">Bila Perlu / Saat Nyeri Sakit</option>
              </select>
            </div>
            <div>
              <label className="block text-[11px] font-bold text-text-secondary mb-1">
                Peringatan / Catatan Khusus
              </label>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Contoh: Habiskan antibiotik"
                className="w-full px-3 py-1.5 bg-card border border-border-strong rounded-lg text-xs font-semibold text-text-primary focus:outline-none focus:border-primary"
              />
            </div>
          </div>

          {/* Tanggal Kadaluarsa (BUD) */}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-[11px] font-bold text-text-secondary mb-1">
                Nomor Resep
              </label>
              <input
                type="text"
                value={prescriptionNo}
                onChange={(e) => setPrescriptionNo(e.target.value)}
                className="w-full px-3 py-1.5 bg-card border border-border-strong rounded-lg text-xs font-mono font-semibold text-text-primary focus:outline-none focus:border-primary"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-text-secondary mb-1">
                Exp. Date / Beyond Use Date (BUD)
              </label>
              <input
                type="date"
                value={expiredDate}
                onChange={(e) => setExpiredDate(e.target.value)}
                className="w-full px-3 py-1.5 bg-card border border-border-strong rounded-lg text-xs font-semibold text-text-primary focus:outline-none focus:border-primary"
              />
            </div>
          </div>

          {/* Live Preview of Etiket */}
          <div>
            <label className="block text-xs font-bold text-text-secondary mb-1.5">
              Pratinjau Etiket Label Thermal:
            </label>
            <div className="bg-slate-100 rounded-xl p-4 flex items-center justify-center border border-slate-200">
              <div className={`w-[260px] rounded-lg p-3 shadow-md border-2 text-center space-y-2 ${
                type === 'biru'
                  ? 'border-blue-700 bg-blue-50 text-blue-950'
                  : 'border-emerald-700 bg-white text-slate-900'
              }`}>
                <div>
                  <h4 className="text-[10px] font-black uppercase leading-tight">
                    {storeInfo?.storeName || 'OMNIPOS APOTEK SEHAT'}
                  </h4>
                  <p className="text-[7px] text-slate-500">
                    SIPA: 19890812/SIPA-32.04/2024/2001
                  </p>
                  <div className="flex items-center justify-between text-[8px] font-mono text-slate-600 mt-1 border-b pb-1">
                    <span>No: {prescriptionNo}</span>
                    <span>{new Date().toLocaleDateString('id-ID')}</span>
                  </div>
                </div>

                <div className="text-left text-[9px] font-semibold">
                  Pasien: <strong className="text-black">{patientName}</strong> {patientAge ? `(${patientAge})` : ''}
                </div>

                <div className="border-t border-b py-1.5">
                  <div className="text-[11px] font-black uppercase text-black">
                    {medicineName || 'NAMA OBAT'} {quantityStr ? `(${quantityStr})` : ''}
                  </div>
                  {type === 'biru' && (
                    <div className="my-1 bg-blue-700 text-white font-black text-[8px] py-0.5 rounded uppercase">
                      ⚠️ OBAT LUAR - TIDAK BOLEH DITELAN
                    </div>
                  )}
                  <div className={`mt-1 p-1.5 rounded font-black text-xs ${
                    type === 'biru' ? 'bg-blue-100 text-blue-900' : 'bg-emerald-50 text-emerald-900'
                  }`}>
                    {signa}
                  </div>
                  <div className="text-[8px] font-bold text-slate-600 mt-0.5">
                    {consumptionTime}
                  </div>
                  {notes && (
                    <div className="text-[8px] italic text-rose-700 font-bold mt-0.5">
                      *{notes}
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-between text-[7px] text-slate-500 pt-1">
                  <span>Exp: <strong>{expiredDate || '-'}</strong></span>
                  <span>{currentUser?.fullName || 'Apoteker'}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-border-subtle bg-surface flex items-center justify-between">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-bold text-text-secondary hover:bg-subtle hover:text-text-primary transition-colors"
          >
            Batal
          </button>
          <button
            type="button"
            onClick={handlePrint}
            disabled={isPrinting || !patientName.trim() || !medicineName.trim()}
            className="px-5 py-2.5 bg-primary hover:bg-primary-hover text-primary-text font-bold text-xs rounded-xl flex items-center gap-2 shadow-md active:scale-95 transition-all disabled:opacity-40"
          >
            <Printer className="w-4 h-4" />
            <span>Cetak Etiket Stiker</span>
          </button>
        </div>
      </div>
    </div>
  );
};
