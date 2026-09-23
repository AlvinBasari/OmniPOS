import React, { useState, useEffect, useRef } from 'react';
import { 
  ClipboardCheck, 
  Barcode, 
  Search, 
  Plus, 
  Minus, 
  CheckCircle2, 
  AlertTriangle, 
  Play, 
  Trash2,
  Clock,
  DollarSign,
  Printer,
  Filter,
  X,
  FileText,
  Check,
  UserCheck
} from 'lucide-react';
import { Product, StockOpnameSession } from '../types';
import { useToastStore } from '../store/useToastStore';
import { useBusinessModeStore } from '../store/useBusinessModeStore';
import { useAuthStore } from '../store/useAuthStore';
import { playScanBeep, playErrorBeep } from '../store/useCartStore';

interface AuditItemState {
  productId: string;
  productName: string;
  sku: string;
  barcode?: string;
  systemStock: number;
  physicalStock: number;
  unitCost: number;
  unit: string;
  notes?: string;
}

export const StockOpnamePage: React.FC = () => {
  const { mode } = useBusinessModeStore();
  const { currentUser } = useAuthStore();
  const [sessions, setSessions] = useState<StockOpnameSession[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [isAuditing, setIsAuditing] = useState(false);
  const [sessionTitle, setSessionTitle] = useState('Stock Opname Bulanan');
  const [barcodeScanInput, setBarcodeScanInput] = useState('');
  const [auditItems, setAuditItems] = useState<AuditItemState[]>([]);
  const [searchFilter, setSearchFilter] = useState('');
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [auditorName, setAuditorName] = useState(currentUser?.fullName || currentUser?.username || 'Admin Toko');
  const [auditNotes, setAuditNotes] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const barcodeInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchSessions();
    fetchProducts();
  }, [mode]);

  const fetchSessions = async () => {
    try {
      const res = await fetch('/api/v1/inventory/stock-opname');
      if (res.ok) setSessions(await res.json());
    } catch {}
  };

  const fetchProducts = async () => {
    try {
      const res = await fetch(`/api/v1/products?mode=${mode}`);
      if (res.ok) setProducts(await res.json());
    } catch {}
  };

  const handleStartNewSession = () => {
    // Populate all active products into audit table
    const initialList: AuditItemState[] = products.map(p => ({
      productId: p.id,
      productName: p.name,
      sku: p.sku,
      barcode: p.barcode,
      systemStock: p.currentStock,
      physicalStock: p.currentStock, // default match, user modifies as they scan
      unitCost: p.buyPrice,
      unit: p.unit || 'PCS'
    }));
    setAuditItems(initialList);
    setAuditorName(currentUser?.fullName || currentUser?.username || 'Admin Toko');
    setAuditNotes('');
    setIsAuditing(true);
    setTimeout(() => barcodeInputRef.current?.focus(), 100);
  };

  const handleBarcodeScan = (e: React.FormEvent) => {
    e.preventDefault();
    if (!barcodeScanInput.trim()) return;

    const matchedIdx = auditItems.findIndex(i => 
      (i.barcode && i.barcode.toLowerCase() === barcodeScanInput.trim().toLowerCase()) ||
      i.sku.toLowerCase() === barcodeScanInput.trim().toLowerCase()
    );

    if (matchedIdx >= 0) {
      playScanBeep();
      const updated = [...auditItems];
      updated[matchedIdx].physicalStock += 1;
      setAuditItems(updated);
      setBarcodeScanInput('');
      useToastStore.getState().showToast(`+1 ${updated[matchedIdx].productName} (Fisik: ${updated[matchedIdx].physicalStock})`, 'info');
    } else {
      playErrorBeep();
      useToastStore.getState().showToast(`Barang "${barcodeScanInput}" tidak ditemukan!`, 'warning');
      setBarcodeScanInput('');
    }
  };

  const handleSaveAndApply = async () => {
    try {
      setIsSaving(true);
      const payload = {
        title: sessionTitle,
        auditedByUserId: auditorName.trim() || currentUser?.fullName || currentUser?.username || 'Admin Toko',
        notes: auditNotes.trim() || undefined,
        items: auditItems.map(i => ({
          productId: i.productId,
          physicalStock: i.physicalStock,
          notes: i.physicalStock !== i.systemStock ? `Selisih ${i.physicalStock - i.systemStock} ${i.unit}` : undefined
        }))
      };

      const res = await fetch('/api/v1/inventory/stock-opname', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        useToastStore.getState().showToast('Audit Stock Opname selesai & stok sistem berhasil diperbarui!', 'success');
        setIsAuditing(false);
        setIsConfirmModalOpen(false);
        setAuditNotes('');
        fetchSessions();
        fetchProducts();
      } else {
        useToastStore.getState().showToast('Gagal menyimpan hasil stock opname.', 'error');
      }
    } catch {
      useToastStore.getState().showToast('Gagal menyimpan hasil stock opname.', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const [showOnlyVariance, setShowOnlyVariance] = useState(false);

  const handlePrintBeritaAcara = () => {
    const variantItems = auditItems.filter(i => i.physicalStock !== i.systemStock);
    const now = new Date().toLocaleDateString('id-ID', { dateStyle: 'full' });
    const w = window.open('', '_blank', 'width=900,height=800');
    if (!w) return;
    w.document.write(`<html><head><title>Berita Acara Stock Opname</title>
      <style>
        body { font-family: Arial, sans-serif; font-size: 11px; padding: 20mm; color: #111; }
        h2 { font-size: 15px; text-align: center; text-transform: uppercase; margin: 0 0 2px; }
        h3 { font-size: 11px; text-align: center; color: #555; margin: 0 0 16px; }
        table { width: 100%; border-collapse: collapse; margin-bottom: 16px; }
        th { background: #f3f4f6; padding: 7px 9px; text-align: left; font-weight: 700; border: 1px solid #e5e7eb; font-size: 10.5px; }
        td { padding: 6px 9px; border: 1px solid #e5e7eb; font-size: 10.5px; }
        .plus { color: #16a34a; font-weight: 700; }
        .minus { color: #dc2626; font-weight: 700; }
        .section { font-weight: 700; font-size: 11px; border-bottom: 2px solid #111; padding-bottom: 2px; margin: 14px 0 8px; }
        .sig-box { border: 1px solid #999; height: 55px; margin-top: 4px; border-radius: 3px; }
        .footer { font-size: 9px; color: #777; text-align: center; margin-top: 20px; border-top: 1px solid #ddd; padding-top: 8px; }
        @media print { @page { size: A4; margin: 20mm; } }
      </style>
    </head><body>
      <h2>Berita Acara Stock Opname</h2>
      <h3>${sessionTitle}</h3>
      <div class="section">Ringkasan Audit</div>
      <table>
        <tr><td style="width:40%">Tanggal Pelaksanaan</td><td>${now}</td></tr>
        <tr><td>Total Item Diaudit</td><td>${auditItems.length} SKU</td></tr>
        <tr><td>Item dengan Selisih</td><td>${variantItems.length} SKU</td></tr>
        <tr><td>Total Selisih Qty</td><td class="${totalDiscrepancyQty < 0 ? 'minus' : 'plus'}">${totalDiscrepancyQty > 0 ? '+' : ''}${totalDiscrepancyQty} Unit</td></tr>
        <tr><td>Estimasi Nilai Selisih</td><td class="${totalDiscrepancyVal < 0 ? 'minus' : 'plus'}">Rp ${totalDiscrepancyVal.toLocaleString('id-ID')}</td></tr>
      </table>
      <div class="section">Detail Selisih Stok (${variantItems.length} Item)</div>
      <table>
        <tr><th>#</th><th>SKU</th><th>Nama Produk</th><th style="text-align:center">Stok Sistem</th><th style="text-align:center">Fisik Terhitung</th><th style="text-align:center">Selisih</th><th style="text-align:right">Nilai Selisih (Rp)</th></tr>
        ${variantItems.map((item, i) => {
          const diff = item.physicalStock - item.systemStock;
          const diffVal = diff * item.unitCost;
          return `<tr>
            <td>${i+1}</td><td>${item.sku}</td><td>${item.productName}</td>
            <td style="text-align:center">${item.systemStock}</td>
            <td style="text-align:center">${item.physicalStock}</td>
            <td style="text-align:center" class="${diff < 0 ? 'minus' : 'plus'}">${diff > 0 ? '+' : ''}${diff}</td>
            <td style="text-align:right" class="${diffVal < 0 ? 'minus' : 'plus'}">${diffVal > 0 ? '+' : ''}Rp ${diffVal.toLocaleString('id-ID')}</td>
          </tr>`;
        }).join('')}
      </table>
      <div class="section">Persetujuan & Tanda Tangan</div>
      <table>
        <tr>
          <td style="width:50%;text-align:center;padding:8px 12px">
            <div>Pelaksana Audit,</div>
            <div class="sig-box"></div>
            <div style="margin-top:4px">(____________________)</div>
          </td>
          <td style="width:50%;text-align:center;padding:8px 12px">
            <div>Mengetahui & Menyetujui,</div>
            <div class="sig-box"></div>
            <div style="margin-top:4px">(____________________)</div>
          </td>
        </tr>
      </table>
      <div class="footer">Dicetak oleh OmniPOS · ${now} · Dokumen resmi untuk arsip akuntansi dan keperluan audit.</div>
    </body></html>`);
    w.document.close(); w.print();
  };

  const totalDiscrepancyQty = auditItems.reduce((acc, i) => acc + (i.physicalStock - i.systemStock), 0);
  const totalDiscrepancyVal = auditItems.reduce((acc, i) => acc + ((i.physicalStock - i.systemStock) * i.unitCost), 0);

  const filteredItems = auditItems.filter(i => {
    const matchSearch = i.productName.toLowerCase().includes(searchFilter.toLowerCase()) ||
      i.sku.toLowerCase().includes(searchFilter.toLowerCase()) ||
      (i.barcode && i.barcode.includes(searchFilter));
    const matchVariance = !showOnlyVariance || i.physicalStock !== i.systemStock;
    return matchSearch && matchVariance;
  });

  return (
    <div className="flex-1 flex flex-col bg-app overflow-hidden select-none">
      {/* Top Header */}
      <header className="px-6 py-4 border-b border-border-subtle bg-surface flex items-center justify-between">
        <div>
          <h1 className="text-base font-bold text-text-primary flex items-center gap-2">
            <ClipboardCheck className="w-5 h-5 text-primary" />
            Stock Opname Digital (Audit Fisik Rak)
          </h1>
          <p className="text-xs text-text-secondary mt-0.5">
            Cocokkan stok fisik barang di rak dengan database menggunakan scanner barcode
          </p>
        </div>

        {!isAuditing ? (
          <button
            onClick={handleStartNewSession}
            className="px-4 py-2 bg-primary hover:bg-primary-hover text-primary-text rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-sm"
          >
            <Plus className="w-4 h-4" />
            <span>Mulai Sesi Stock Opname Baru</span>
          </button>
        ) : (
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowOnlyVariance(v => !v)}
              className={`px-3 py-2 rounded-lg text-xs font-bold flex items-center gap-1.5 border transition-all ${showOnlyVariance ? 'bg-amber-500/10 border-amber-500/30 text-amber-600' : 'bg-subtle border-border-subtle text-text-secondary hover:bg-card-hover'}`}
            >
              <Filter className="w-3.5 h-3.5" />
              {showOnlyVariance ? 'Tampil Semua' : 'Hanya Selisih'}
            </button>
            <button
              onClick={handlePrintBeritaAcara}
              className="px-3 py-2 bg-subtle hover:bg-card-hover border border-border-subtle rounded-lg text-xs font-bold flex items-center gap-1.5 text-text-secondary"
            >
              <Printer className="w-3.5 h-3.5 text-primary" />
              Cetak BA
            </button>
            <button
              onClick={() => setIsAuditing(false)}
              className="px-3 py-2 bg-subtle hover:bg-card-hover border border-border-subtle rounded-lg text-xs font-semibold"
            >
              Batal
            </button>
            <button
              onClick={() => setIsConfirmModalOpen(true)}
              className="px-4 py-2 bg-status-success hover:bg-emerald-600 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-sm active:scale-95 transition-all"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Terapkan Penyesuaian Stok</span>
            </button>
          </div>
        )}
      </header>

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto p-6">
        {isAuditing ? (
          <div className="space-y-4">
            {/* Live Audit Barcode Scanner */}
            <div className="p-4 bg-card border border-primary/30 rounded-2xl flex flex-col gap-3 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-sm font-bold text-text-primary">Mode Scanner Audit Aktif</h2>
                  <p className="text-xs text-text-secondary">Arahkan scanner ke produk di rak toko untuk menambah hitungan fisik secara instan</p>
                </div>
                <div className="flex items-center gap-4 text-xs font-mono font-bold">
                  <span className="text-text-secondary">Total Selisih Qty: <strong className={totalDiscrepancyQty < 0 ? 'text-status-danger' : totalDiscrepancyQty > 0 ? 'text-status-success' : 'text-text-primary'}>{totalDiscrepancyQty}</strong></span>
                  <span className="text-text-secondary">Estimasi Nilai Selisih: <strong className={totalDiscrepancyVal < 0 ? 'text-status-danger' : totalDiscrepancyVal > 0 ? 'text-status-success' : 'text-text-primary'}>Rp {totalDiscrepancyVal.toLocaleString('id-ID')}</strong></span>
                </div>
              </div>

              <div className="flex gap-3">
                <form onSubmit={handleBarcodeScan} className="flex-1 relative">
                  <Barcode className="w-4 h-4 text-primary absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    ref={barcodeInputRef}
                    type="text"
                    value={barcodeScanInput}
                    onChange={e => setBarcodeScanInput(e.target.value)}
                    placeholder="Scan Barcode Barang Rak lalu [ENTER]..."
                    className="w-full pl-9 pr-3 py-2 bg-subtle border border-border-strong rounded-xl text-xs font-mono text-text-primary focus:outline-none focus:border-primary"
                    autoFocus
                  />
                </form>
                <div className="relative w-64">
                  <Search className="w-4 h-4 text-text-muted absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={searchFilter}
                    onChange={e => setSearchFilter(e.target.value)}
                    placeholder="Filter tabel barang..."
                    className="w-full pl-9 pr-3 py-2 bg-subtle border border-border-subtle rounded-xl text-xs text-text-primary focus:outline-none"
                  />
                </div>
              </div>
            </div>

            {/* Audit Table */}
            <div className="bg-card border border-border-subtle rounded-2xl overflow-hidden shadow-sm">
              <table className="w-full text-xs text-left">
                <thead className="bg-subtle text-text-secondary border-b border-border-subtle font-semibold">
                  <tr>
                    <th className="py-3 px-4">Kode & Nama Produk</th>
                    <th className="py-3 px-3 text-center">Stok Sistem</th>
                    <th className="py-3 px-3 text-center">Hitungan Fisik</th>
                    <th className="py-3 px-3 text-center">Selisih (Variance)</th>
                    <th className="py-3 px-4 text-right">Nilai Selisih (Rp)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border-subtle">
                  {filteredItems.map((item, idx) => {
                    const diff = item.physicalStock - item.systemStock;
                    const diffVal = diff * item.unitCost;
                    return (
                      <tr key={idx} className={`hover:bg-subtle/50 transition-colors ${diff !== 0 ? 'bg-amber-500/5' : ''}`}>
                        <td className="py-3 px-4">
                          <p className="font-bold text-text-primary">{item.productName}</p>
                          <p className="text-[10px] text-text-muted font-mono">{item.sku} {item.barcode && `| Barcode: ${item.barcode}`}</p>
                        </td>
                        <td className="py-3 px-3 text-center font-mono font-semibold">
                          {item.systemStock} {item.unit}
                        </td>
                        <td className="py-3 px-3 text-center">
                          <div className="inline-flex items-center gap-1 bg-subtle border border-border-strong rounded-lg p-0.5">
                            <button
                              onClick={() => {
                                const updated = [...auditItems];
                                updated[idx].physicalStock = Math.max(0, updated[idx].physicalStock - 1);
                                setAuditItems(updated);
                              }}
                              className="p-1 text-text-secondary hover:text-text-primary rounded hover:bg-card"
                            >
                              <Minus className="w-3 h-3" />
                            </button>
                            <input
                              type="number"
                              value={item.physicalStock}
                              onChange={e => {
                                const val = parseFloat(e.target.value) || 0;
                                const updated = [...auditItems];
                                updated[idx].physicalStock = val;
                                setAuditItems(updated);
                              }}
                              className="w-14 text-center font-mono font-bold bg-transparent text-xs focus:outline-none"
                            />
                            <button
                              onClick={() => {
                                const updated = [...auditItems];
                                updated[idx].physicalStock += 1;
                                setAuditItems(updated);
                              }}
                              className="p-1 text-text-secondary hover:text-text-primary rounded hover:bg-card"
                            >
                              <Plus className="w-3 h-3" />
                            </button>
                          </div>
                        </td>
                        <td className="py-3 px-3 text-center font-mono font-bold">
                          <span className={`px-2 py-0.5 rounded text-[11px] ${
                            diff < 0 ? 'bg-status-danger/10 text-status-danger' :
                            diff > 0 ? 'bg-status-success/10 text-status-success' : 'text-text-muted'
                          }`}>
                            {diff > 0 ? `+${diff}` : diff} {item.unit}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right font-mono font-bold tabular-nums">
                          <span className={diffVal < 0 ? 'text-status-danger' : diffVal > 0 ? 'text-status-success' : 'text-text-muted'}>
                            {diffVal > 0 ? `+Rp ${diffVal.toLocaleString('id-ID')}` : `Rp ${diffVal.toLocaleString('id-ID')}`}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <h2 className="text-sm font-bold text-text-primary">Riwayat Audit Stock Opname Toko</h2>
            <div className="grid grid-cols-1 gap-3">
              {sessions.map(s => (
                <div key={s.id} className="p-4 rounded-xl bg-card border border-border-subtle flex items-center justify-between shadow-sm">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-xs font-mono">{s.sessionNumber}</span>
                      <span className="text-xs font-bold text-text-primary">{s.title}</span>
                      <span className="text-[10px] px-2 py-0.5 rounded bg-status-success/10 text-status-success font-bold">SELESAI</span>
                    </div>
                    <p className="text-xs text-text-secondary mt-1">
                      Auditor: <strong>{s.auditedByUserId || 'Admin'}</strong> | Tanggal: {new Date(s.createdAt).toLocaleString('id-ID')}
                    </p>
                  </div>

                  <div className="text-right flex flex-col items-end gap-2">
                    <p className="text-xs font-bold font-mono">
                      Total Item: {s.totalItemsAudited}
                    </p>
                    <p className={`text-xs font-mono font-bold ${s.totalDiscrepancyValue < 0 ? 'text-status-danger' : 'text-status-success'}`}>
                      Selisih: {s.totalDiscrepancyQty} ({s.totalDiscrepancyValue < 0 ? '-' : '+'}Rp {Math.abs(s.totalDiscrepancyValue).toLocaleString('id-ID')})
                    </p>
                    <button
                      onClick={() => {
                        const w = window.open('', '_blank', 'width=600,height=500');
                        if (!w) return;
                        w.document.write(`<html><head><title>Riwayat Opname</title><style>body{font-family:Arial;padding:24px;font-size:11px}h2{font-size:14px}table{width:100%;border-collapse:collapse}th,td{border:1px solid #ddd;padding:6px 8px}th{background:#f5f5f5;font-weight:700}</style></head><body><h2>${s.title} — ${s.sessionNumber}</h2><p>Auditor: ${s.auditedByUserId} | ${new Date(s.createdAt).toLocaleString('id-ID')}</p><table><tr><th>Keterangan</th><th>Nilai</th></tr><tr><td>Total Item Diaudit</td><td>${s.totalItemsAudited} SKU</td></tr><tr><td>Total Selisih Qty</td><td>${s.totalDiscrepancyQty}</td></tr><tr><td>Nilai Selisih</td><td>Rp ${s.totalDiscrepancyValue.toLocaleString('id-ID')}</td></tr></table></body></html>`);
                        w.document.close(); w.print();
                      }}
                      className="px-2.5 py-1 bg-subtle hover:bg-card-hover border border-border-subtle rounded-lg text-[10px] font-bold text-text-secondary flex items-center gap-1"
                    >
                      <Printer className="w-3 h-3 text-primary" /> Cetak Ringkasan
                    </button>
                  </div>
                </div>
              ))}

              {sessions.length === 0 && (
                <div className="py-16 text-center text-text-muted space-y-2">
                  <ClipboardCheck className="w-12 h-12 mx-auto opacity-30" />
                  <p className="text-xs font-bold text-text-primary">Belum Ada Sesi Stock Opname</p>
                  <p className="text-[11px]">Klik "Mulai Sesi Stock Opname Baru" untuk memulai pencocokan stok fisik rak.</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Modal Berita Acara & Konfirmasi Stock Opname */}
      {isConfirmModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-card border border-border-subtle rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="p-4 border-b border-border-subtle bg-surface flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center font-bold">
                  <FileText className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-text-primary">Konfirmasi Berita Acara Stock Opname</h3>
                  <p className="text-[11px] text-text-secondary">{sessionTitle}</p>
                </div>
              </div>
              <button
                onClick={() => !isSaving && setIsConfirmModalOpen(false)}
                disabled={isSaving}
                className="p-1 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 text-text-muted"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto p-5 space-y-4 text-xs">
              {/* Auditor & Notes Input */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 p-3.5 bg-subtle rounded-xl border border-border-subtle">
                <div className="space-y-1">
                  <label className="block font-bold text-text-primary text-[11px] flex items-center gap-1">
                    <UserCheck className="w-3.5 h-3.5 text-primary" />
                    <span>Nama Auditor / Pelaksana:</span>
                  </label>
                  <input
                    type="text"
                    value={auditorName}
                    onChange={(e) => setAuditorName(e.target.value)}
                    disabled={isSaving}
                    placeholder="Nama staf pelaksana audit..."
                    className="w-full px-3 py-1.5 bg-surface border border-border-subtle rounded-lg text-text-primary text-xs focus:ring-2 focus:ring-primary outline-none font-sans"
                  />
                </div>
                <div className="space-y-1">
                  <label className="block font-bold text-text-primary text-[11px]">
                    Catatan / Keterangan Berita Acara:
                  </label>
                  <input
                    type="text"
                    value={auditNotes}
                    onChange={(e) => setAuditNotes(e.target.value)}
                    disabled={isSaving}
                    placeholder="Contoh: Audit berkala rak depan toko..."
                    className="w-full px-3 py-1.5 bg-surface border border-border-subtle rounded-lg text-text-primary text-xs focus:ring-2 focus:ring-primary outline-none font-sans"
                  />
                </div>
              </div>

              {/* Summary Metric Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                <div className="p-3 bg-card border border-border-subtle rounded-xl">
                  <span className="text-[10px] text-text-muted">Total SKU Diaudit</span>
                  <p className="text-base font-bold font-mono text-text-primary">{auditItems.length}</p>
                </div>
                <div className="p-3 bg-card border border-border-subtle rounded-xl">
                  <span className="text-[10px] text-text-muted">SKU Sesuai</span>
                  <p className="text-base font-bold font-mono text-status-success">
                    {auditItems.filter(i => i.physicalStock === i.systemStock).length}
                  </p>
                </div>
                <div className="p-3 bg-card border border-border-subtle rounded-xl">
                  <span className="text-[10px] text-text-muted">SKU Selisih</span>
                  <p className={`text-base font-bold font-mono ${auditItems.filter(i => i.physicalStock !== i.systemStock).length > 0 ? 'text-amber-500' : 'text-text-primary'}`}>
                    {auditItems.filter(i => i.physicalStock !== i.systemStock).length}
                  </p>
                </div>
                <div className="p-3 bg-card border border-border-subtle rounded-xl">
                  <span className="text-[10px] text-text-muted">Estimasi Nilai Selisih</span>
                  <p className={`text-base font-bold font-mono ${totalDiscrepancyVal < 0 ? 'text-status-danger' : totalDiscrepancyVal > 0 ? 'text-status-success' : 'text-text-primary'}`}>
                    Rp {Math.abs(totalDiscrepancyVal).toLocaleString('id-ID')}
                  </p>
                </div>
              </div>

              {/* Discrepancy Table */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-text-primary text-xs">
                    Rincian Barang Selisih ({auditItems.filter(i => i.physicalStock !== i.systemStock).length} item):
                  </span>
                  {auditItems.filter(i => i.physicalStock !== i.systemStock).length > 0 && (
                    <span className="text-[10px] text-amber-600 dark:text-amber-400 font-medium">
                      Periksa kembali sebelum menerapkan ke database
                    </span>
                  )}
                </div>
                
                <div className="max-h-48 overflow-y-auto border border-border-subtle rounded-xl bg-card">
                  {auditItems.filter(i => i.physicalStock !== i.systemStock).length === 0 ? (
                    <div className="p-6 text-center text-text-muted flex flex-col items-center gap-1">
                      <Check className="w-6 h-6 text-status-success" />
                      <p className="font-bold text-text-primary text-xs">Semua Stok Fisik Cocok 100%!</p>
                      <p className="text-[11px]">Tidak ditemukan perbedaan antara hitungan fisik di rak dengan database.</p>
                    </div>
                  ) : (
                    <table className="w-full text-left text-[11px]">
                      <thead className="bg-subtle text-text-secondary sticky top-0 border-b border-border-subtle font-semibold">
                        <tr>
                          <th className="p-2">Produk</th>
                          <th className="p-2 text-center">Sistem</th>
                          <th className="p-2 text-center">Fisik</th>
                          <th className="p-2 text-center">Selisih</th>
                          <th className="p-2 text-right">Nilai Selisih</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border-subtle/50 font-mono">
                        {auditItems
                          .filter(i => i.physicalStock !== i.systemStock)
                          .map((item) => {
                            const diff = item.physicalStock - item.systemStock;
                            const diffVal = diff * item.unitCost;
                            return (
                              <tr key={item.productId} className="hover:bg-card-hover/40">
                                <td className="p-2 font-sans font-medium text-text-primary">
                                  <div>{item.productName}</div>
                                  <div className="text-[9px] text-text-muted font-mono">{item.sku}</div>
                                </td>
                                <td className="p-2 text-center">{item.systemStock} {item.unit}</td>
                                <td className="p-2 text-center font-bold">{item.physicalStock} {item.unit}</td>
                                <td className={`p-2 text-center font-bold ${diff < 0 ? 'text-status-danger' : 'text-status-success'}`}>
                                  {diff > 0 ? `+${diff}` : diff} {item.unit}
                                </td>
                                <td className={`p-2 text-right font-bold ${diffVal < 0 ? 'text-status-danger' : 'text-status-success'}`}>
                                  Rp {diffVal.toLocaleString('id-ID')}
                                </td>
                              </tr>
                            );
                          })}
                      </tbody>
                    </table>
                  )}
                </div>
              </div>

              {/* Confirmation Notice */}
              <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl flex items-start gap-2.5 text-[11px] text-amber-900 dark:text-amber-200">
                <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                <p className="leading-relaxed">
                  <strong>Peringatan:</strong> Menyetujui berita acara ini akan memperbarui saldo stok master produk secara permanen dan mencatat transaksi penyesuaian stok opname ke laporan mutasi.
                </p>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-border-subtle bg-surface flex items-center justify-between">
              <button
                type="button"
                onClick={handlePrintBeritaAcara}
                className="px-3.5 py-2 bg-subtle hover:bg-card-hover border border-border-subtle rounded-xl text-xs font-bold text-text-secondary flex items-center gap-1.5 transition-colors"
              >
                <Printer className="w-4 h-4 text-primary" />
                <span>Cetak Dokumen BA</span>
              </button>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsConfirmModalOpen(false)}
                  disabled={isSaving}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-text-secondary hover:bg-subtle transition-colors"
                >
                  Kembali Hitung
                </button>
                <button
                  type="button"
                  onClick={handleSaveAndApply}
                  disabled={isSaving}
                  className="px-5 py-2 bg-status-success hover:bg-emerald-600 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-md transition-all active:scale-95 disabled:opacity-50"
                >
                  {isSaving ? (
                    <span>Menyimpan & Menyesuaikan Stok...</span>
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Setujui & Perbarui Stok Sekarang</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
export default StockOpnamePage;
