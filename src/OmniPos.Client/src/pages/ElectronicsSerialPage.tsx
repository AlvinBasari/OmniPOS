import React, { useState, useEffect } from 'react';
import { 
  ShieldCheck, 
  Smartphone, 
  Search, 
  Plus, 
  CheckCircle2, 
  AlertTriangle, 
  Clock, 
  Layers, 
  RefreshCw, 
  FileText, 
  Calendar, 
  DollarSign, 
  Tag, 
  Laptop, 
  ArrowLeftRight,
  Upload,
  Radio,
  Sparkles,
  Database,
  Coins,
  Copy,
  Bookmark,
  Download,
  Printer
} from 'lucide-react';
import { ProductSerialNumber, TradeInTransaction, Product, SimCardSpecialNumber } from '../types';
import { useToastStore } from '../store/useToastStore';

export interface ElectronicsSerialPageProps {
  initialTab?: 'warranty' | 'inventory' | 'simcards' | 'tradein';
}

export const ElectronicsSerialPage: React.FC<ElectronicsSerialPageProps> = ({ initialTab = 'warranty' }) => {
  const [activeTab, setActiveTab] = useState<'warranty' | 'inventory' | 'simcards' | 'tradein'>(initialTab);

  useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab);
    }
  }, [initialTab]);

  // Tab 1: Quick Warranty Lookup
  const [searchImei, setSearchImei] = useState('');
  const [warrantyResult, setWarrantyResult] = useState<any | null>(null);
  const [isSearchingWarranty, setIsSearchingWarranty] = useState(false);

  // Tab 2: Master Inventory Serial Numbers
  const [serials, setSerials] = useState<ProductSerialNumber[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [isLoadingSerials, setIsLoadingSerials] = useState(false);
  const [isAddBatchModalOpen, setIsAddBatchModalOpen] = useState(false);

  // Batch Add Form State
  const [batchProductId, setBatchProductId] = useState('');
  const [batchSerialsText, setBatchSerialsText] = useState('');
  const [batchSupplierName, setBatchSupplierName] = useState('Distributor Resmi');
  const [batchWarrantyMonths, setBatchWarrantyMonths] = useState(12);
  const [batchWarrantyNotes, setBatchWarrantyNotes] = useState('Garansi Resmi 1 Tahun');
  const [isSubmittingBatch, setIsSubmittingBatch] = useState(false);

  // Tab 3: SIM Cards & Special Numbers
  const [simCards, setSimCards] = useState<SimCardSpecialNumber[]>([]);
  const [isLoadingSimCards, setIsLoadingSimCards] = useState(false);
  const [simSearchQuery, setSimSearchQuery] = useState('');
  const [simProviderFilter, setSimProviderFilter] = useState('ALL');
  const [simTierFilter, setSimTierFilter] = useState('ALL');
  const [simStatusFilter, setSimStatusFilter] = useState('ALL');
  const [isAddSimModalOpen, setIsAddSimModalOpen] = useState(false);
  const [isBatchImportSimModalOpen, setIsBatchImportSimModalOpen] = useState(false);

  // Single SIM Form State
  const [simMsisdn, setSimMsisdn] = useState('');
  const [simProvider, setSimProvider] = useState('Telkomsel');
  const [simPatternTier, setSimPatternTier] = useState('Panca Super');
  const [simIccid, setSimIccid] = useState('');
  const [simQuota, setSimQuota] = useState('15GB');
  const [simBalance, setSimBalance] = useState('10000');
  const [simExpiryDate, setSimExpiryDate] = useState('');
  const [simBuyPrice, setSimBuyPrice] = useState('100000');
  const [simSellPrice, setSimSellPrice] = useState('500000');
  const [simNotes, setSimNotes] = useState('Segel Pabrik');

  // Batch Import SIM State
  const [batchSimText, setBatchSimText] = useState('');
  const [batchSimProvider, setBatchSimProvider] = useState('Telkomsel');
  const [batchSimTier, setBatchSimTier] = useState('Reguler Cantik');
  const [batchSimQuota, setBatchSimQuota] = useState('10GB');
  const [batchSimBuyPrice, setBatchSimBuyPrice] = useState('25000');
  const [batchSimSellPrice, setBatchSimSellPrice] = useState('50000');

  // Tab 4: Trade-In State
  const [tradeIns, setTradeIns] = useState<TradeInTransaction[]>([]);
  const [isAddTradeInModalOpen, setIsAddTradeInModalOpen] = useState(false);
  const [printSpjbTarget, setPrintSpjbTarget] = useState<TradeInTransaction | null>(null);
  const [tinCustName, setTinCustName] = useState('');
  const [tinCustPhone, setTinCustPhone] = useState('');
  const [tinDeviceModel, setTinDeviceModel] = useState('');
  const [tinImei, setTinImei] = useState('');
  const [tinGrade, setTinGrade] = useState('Grade A (Mulus)');
  const [tinNotes, setTinNotes] = useState('Fungsi normal, baterai wajar');
  const [tinAccessories, setTinAccessories] = useState('Unit + Dus');
  const [tinValuation, setTinValuation] = useState('');

  useEffect(() => {
    fetchSerials();
    fetchProducts();
    fetchSimCards();
    fetchTradeIns();
  }, []);

  const fetchSimCards = async () => {
    try {
      setIsLoadingSimCards(true);
      const res = await fetch('/api/v1/electronics/sim-cards');
      if (res.ok) setSimCards(await res.json());
    } catch {}
    finally { setIsLoadingSimCards(false); }
  };

  const fetchSerials = async () => {
    try {
      setIsLoadingSerials(true);
      const res = await fetch('/api/v1/electronics/serials');
      if (res.ok) setSerials(await res.json());
    } catch {}
    finally { setIsLoadingSerials(false); }
  };

  const fetchProducts = async () => {
    try {
      const res = await fetch('/api/v1/products');
      if (res.ok) setProducts(await res.json());
    } catch {}
  };

  const fetchTradeIns = async () => {
    try {
      const res = await fetch('/api/v1/electronics/trade-in');
      if (res.ok) setTradeIns(await res.json());
    } catch {}
  };

  const handleSearchWarranty = async (e: React.FormEvent) => {
    e.preventDefault();
    const query = searchImei.trim();
    if (!query) return;

    try {
      setIsSearchingWarranty(true);
      setWarrantyResult(null);
      const res = await fetch(`/api/v1/electronics/serials/search/${encodeURIComponent(query)}`);
      if (res.ok) {
        const data = await res.json();
        setWarrantyResult(data);
        useToastStore.getState().showToast('Data garansi IMEI ditemukan!', 'success');
      } else {
        useToastStore.getState().showToast('Nomor IMEI / Serial Number tidak terdaftar di sistem.', 'warning');
      }
    } catch {
      useToastStore.getState().showToast('Gagal mencari nomor IMEI.', 'error');
    } finally {
      setIsSearchingWarranty(false);
    }
  };

  const handleBatchAddSerials = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!batchProductId) {
      useToastStore.getState().showToast('Pilih produk terlebih dahulu.', 'warning');
      return;
    }

    const rawList = batchSerialsText.split(/[\n,;]+/).map(s => s.trim()).filter(Boolean);
    if (rawList.length === 0) {
      useToastStore.getState().showToast('Masukkan minimal satu nomor IMEI / Serial.', 'warning');
      return;
    }

    try {
      setIsSubmittingBatch(true);
      const payload = {
        productId: batchProductId,
        serialNumbers: rawList,
        supplierName: batchSupplierName,
        warrantyMonths: batchWarrantyMonths,
        warrantyNotes: batchWarrantyNotes
      };

      const res = await fetch('/api/v1/electronics/serials/batch-add', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        const data = await res.json();
        useToastStore.getState().showToast(data.message || 'IMEI berhasil didaftarkan!', 'success');
        setIsAddBatchModalOpen(false);
        setBatchSerialsText('');
        fetchSerials();
      }
    } catch {
      useToastStore.getState().showToast('Gagal mendaftarkan IMEI.', 'error');
    } finally {
      setIsSubmittingBatch(false);
    }
  };

  const handleCreateTradeIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tinCustName.trim() || !tinDeviceModel.trim()) return;

    try {
      const payload = {
        customerName: tinCustName.trim(),
        customerPhone: tinCustPhone.trim(),
        deviceBrandModel: tinDeviceModel.trim(),
        imeiOrSerial: tinImei.trim() || undefined,
        conditionGrade: tinGrade,
        functionalNotes: tinNotes,
        accessoriesIncluded: tinAccessories,
        valuationAmount: parseFloat(tinValuation) || 0
      };

      const res = await fetch('/api/v1/electronics/trade-in', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        useToastStore.getState().showToast('Transaksi Tukar Tambah berhasil dicatat!', 'success');
        setIsAddTradeInModalOpen(false);
        setTinCustName('');
        setTinCustPhone('');
        setTinDeviceModel('');
        setTinImei('');
        setTinValuation('');
        fetchTradeIns();
      }
    } catch {
      useToastStore.getState().showToast('Gagal mencatat tukar tambah.', 'error');
    }
  };

  const handleCreateSimCard = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!simMsisdn.trim()) return;

    try {
      const payload = {
        msisdn: simMsisdn.trim(),
        provider: simProvider,
        patternTier: simPatternTier,
        iccid: simIccid.trim() || undefined,
        defaultQuotaGb: simQuota.trim() || '10GB',
        mainBalance: parseFloat(simBalance) || 0,
        expiryDate: simExpiryDate ? new Date(simExpiryDate).toISOString() : undefined,
        buyPrice: parseFloat(simBuyPrice) || 0,
        sellPrice: parseFloat(simSellPrice) || 0,
        notes: simNotes.trim() || undefined
      };

      const res = await fetch('/api/v1/electronics/sim-cards', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        useToastStore.getState().showToast(`Nomor Cantik ${simMsisdn} berhasil didaftarkan!`, 'success');
        setIsAddSimModalOpen(false);
        setSimMsisdn('');
        setSimIccid('');
        fetchSimCards();
      } else {
        const err = await res.json();
        useToastStore.getState().showToast(err.message || 'Gagal mendaftarkan nomor.', 'error');
      }
    } catch {
      useToastStore.getState().showToast('Terjadi kesalahan sistem.', 'error');
    }
  };

  const handleBatchImportSim = async (e: React.FormEvent) => {
    e.preventDefault();
    const lines = batchSimText.split(/[\n,;]+/).map(s => s.trim()).filter(Boolean);
    if (lines.length === 0) {
      useToastStore.getState().showToast('Masukkan minimal satu nomor telepon.', 'warning');
      return;
    }

    try {
      const items = lines.map(line => ({
        msisdn: line,
        provider: batchSimProvider,
        patternTier: batchSimTier,
        defaultQuotaGb: batchSimQuota,
        mainBalance: 0,
        buyPrice: parseFloat(batchSimBuyPrice) || 0,
        sellPrice: parseFloat(batchSimSellPrice) || 0,
        notes: 'Batch Import'
      }));

      const res = await fetch('/api/v1/electronics/sim-cards/batch-import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items })
      });

      if (res.ok) {
        const data = await res.json();
        useToastStore.getState().showToast(data.message || 'Nomor berhasil diimpor!', 'success');
        setIsBatchImportSimModalOpen(false);
        setBatchSimText('');
        fetchSimCards();
      }
    } catch {
      useToastStore.getState().showToast('Gagal impor nomor massal.', 'error');
    }
  };

  const handleReserveSim = async (sim: SimCardSpecialNumber) => {
    const cust = prompt(`Masukkan Nama Pelanggan yang Membooking Nomor ${sim.msisdn}:`);
    if (!cust) return;

    try {
      const res = await fetch(`/api/v1/electronics/sim-cards/${sim.id}/reserve`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerName: cust.trim(),
          customerPhone: '',
          notes: 'Booking Kasir'
        })
      });

      if (res.ok) {
        useToastStore.getState().showToast(`Nomor ${sim.msisdn} berhasil di-booking!`, 'success');
        fetchSimCards();
      }
    } catch {
      useToastStore.getState().showToast('Gagal membooking nomor.', 'error');
    }
  };

  const exportSimCardsToCsv = () => {
    if (simCards.length === 0) {
      useToastStore.getState().showToast('Tidak ada data nomor cantik untuk diekspor.', 'warning');
      return;
    }
    const headers = ['ID', 'MSISDN', 'Operator', 'Pola Tier', 'ICCID', 'Kuota Default', 'Pulsa Utama', 'Harga Modal', 'Harga Jual', 'Batas Registrasi', 'Status'];
    const rows = simCards.map(s => [
      s.id,
      `"${s.msisdn}"`,
      `"${s.provider}"`,
      `"${s.patternTier}"`,
      `"${s.iccid || ''}"`,
      `"${s.defaultQuotaGb || ''}"`,
      s.mainBalance || 0,
      s.buyPrice || 0,
      s.sellPrice || 0,
      s.expiryDate ? new Date(s.expiryDate).toLocaleDateString('id-ID') : '',
      s.status
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `stok_nomor_cantik_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    useToastStore.getState().showToast('Ekspor CSV Stok Nomor Cantik berhasil diunduh!', 'success');
  };

  const exportSerialsToCsv = () => {
    if (serials.length === 0) {
      useToastStore.getState().showToast('Tidak ada inventori serial/IMEI untuk diekspor.', 'warning');
      return;
    }
    const headers = ['ID', 'Produk', 'SKU', 'Serial/IMEI', 'Supplier', 'Bulan Garansi', 'Status', 'Tanggal Masuk', 'Faktur Jual'];
    const rows = serials.map(s => [
      s.id,
      `"${s.product?.name || s.productName || s.productId}"`,
      `"${s.product?.sku || s.sku || ''}"`,
      `"${s.serialNo}"`,
      `"${s.supplierName || ''}"`,
      s.warrantyMonths || 12,
      s.status,
      s.soldDate ? new Date(s.soldDate).toLocaleDateString('id-ID') : '',
      `"${s.soldInvoiceNumber || ''}"`
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `inventori_serial_imei_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    useToastStore.getState().showToast('Ekspor CSV Inventori Serial & IMEI berhasil diunduh!', 'success');
  };

  const handlePrintSimSticker = (sim: SimCardSpecialNumber) => {
    const w = window.open('', '_blank', 'width=400,height=320');
    if (!w) return;
    w.document.write(`<html><head><title>Stiker Nomor Cantik</title>
      <style>
        @page { size: 80mm 50mm; margin: 2mm; }
        body { font-family: Arial, sans-serif; font-size: 11px; padding: 4mm; width: 76mm; }
        .msisdn { font-size: 22px; font-weight: 900; letter-spacing: 2px; text-align: center; margin: 4px 0; }
        .op { font-size: 10px; color: #555; text-align: center; margin-bottom: 2px; }
        .tier { font-size: 9px; font-weight: 700; background: #fef3c7; color: #92400e; padding: 1px 6px; border-radius: 3px; display: inline-block; }
        .price { font-size: 16px; font-weight: 900; color: #16a34a; text-align: center; margin: 4px 0; }
        .quota { font-size: 10px; text-align: center; color: #374151; margin-bottom: 2px; }
        .exp { font-size: 9px; color: #dc2626; text-align: center; }
        hr { border: 0; border-top: 1px dashed #ccc; margin: 3px 0; }
      </style>
    </head><body>
      <div class="op">${sim.provider}</div>
      <div class="msisdn">${sim.msisdn}</div>
      <div style="text-align:center"><span class="tier">${sim.patternTier}</span></div>
      <hr/>
      <div class="quota">Kuota: ${sim.defaultQuotaGb || '-'} | Pulsa: Rp ${(sim.mainBalance || 0).toLocaleString('id-ID')}</div>
      <div class="price">Rp ${sim.sellPrice.toLocaleString('id-ID')}</div>
      ${sim.expiryDate ? `<div class="exp">⚠ Batas Registrasi: ${new Date(sim.expiryDate).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}</div>` : ''}
      <hr/>
      <div style="font-size:8px;text-align:center;color:#9ca3af">Stiker OmniPOS | ___________________</div>
    </body></html>`);
    w.document.close(); w.print();
  };

  const handlePrintSpjb = (t: TradeInTransaction) => {
    const now = new Date().toLocaleDateString('id-ID', { dateStyle: 'full' });
    const w = window.open('', '_blank', 'width=800,height=900');
    if (!w) return;
    w.document.write(`<html><head><title>SPJB Tukar Tambah</title>
      <style>
        body { font-family: Arial, sans-serif; font-size: 11px; padding: 18mm 20mm; color: #111; }
        h2 { font-size: 15px; margin: 0 0 2px; text-align: center; text-transform: uppercase; }
        h3 { font-size: 11px; margin: 0 0 14px; text-align: center; color: #555; }
        .section-title { font-weight: 700; font-size: 11px; text-transform: uppercase; color: #1a1a1a; border-bottom: 2px solid #111; padding-bottom: 2px; margin: 14px 0 8px; }
        table { width: 100%; border-collapse: collapse; margin-bottom: 10px; }
        td, th { padding: 5px 8px; font-size: 10.5px; }
        .label { color: #555; font-weight: 600; width: 38%; }
        .border-all td, .border-all th { border: 1px solid #ccc; }
        .sig-box { border: 1px solid #999; height: 60px; margin-top: 4px; border-radius: 4px; }
        .footer { font-size: 9px; color: #777; text-align: center; margin-top: 20px; border-top: 1px solid #ddd; padding-top: 8px; }
        .grade { font-weight: 700; font-size: 13px; }
        .valuation { font-size: 18px; font-weight: 900; color: #16a34a; }
        @media print { @page { size: A4; margin: 18mm; } }
      </style>
    </head><body>
      <h2>Surat Perjanjian Tukar Tambah (Trade-In)</h2>
      <h3>Surat Penerimaan & Penilaian Perangkat Bekas</h3>
      <div class="section-title">Identitas Dokumen</div>
      <table><tr>
        <td class="label">Nomor Transaksi</td><td><strong>${t.tradeInNumber}</strong></td>
        <td class="label">Tanggal</td><td>${now}</td>
      </tr></table>
      <div class="section-title">Data Pelanggan</div>
      <table><tr>
        <td class="label">Nama Pelanggan</td><td><strong>${t.customerName}</strong></td>
        <td class="label">No. HP</td><td>${t.customerPhone || '-'}</td>
      </tr></table>
      <div class="section-title">Detail Perangkat Diterima</div>
      <table class="border-all">
        <tr><th>Item</th><th>Keterangan</th></tr>
        <tr><td class="label">Merek & Model</td><td><strong>${t.deviceBrandModel}</strong></td></tr>
        <tr><td class="label">IMEI / Serial Number</td><td>${t.imeiOrSerial || '-'}</td></tr>
        <tr><td class="label">Kelengkapan Fisik</td><td>${t.accessoriesIncluded || '-'}</td></tr>
        <tr><td class="label">Catatan Fungsi</td><td>${t.functionalNotes || '-'}</td></tr>
      </table>
      <div class="section-title">Penilaian (Appraisal)</div>
      <table><tr>
        <td class="label">Grade Kondisi Fisik</td><td class="grade">${t.conditionGrade}</td>
      </tr><tr>
        <td class="label">Nilai Taksiran (Buyback)</td><td class="valuation">Rp ${t.valuationAmount.toLocaleString('id-ID')}</td>
      </tr></table>
      <div class="section-title">Matriks Inspeksi Fisik</div>
      <table class="border-all">
        <tr><th>Komponen</th><th style="width:20%">Kondisi</th><th>Catatan</th></tr>
        <tr><td>Layar / Display</td><td></td><td></td></tr>
        <tr><td>Body / Casing</td><td></td><td></td></tr>
        <tr><td>Tombol (Power, Volume)</td><td></td><td></td></tr>
        <tr><td>Kamera Depan & Belakang</td><td></td><td></td></tr>
        <tr><td>Baterai (estimasi kapasitas %)</td><td></td><td></td></tr>
        <tr><td>Speaker & Mikrofon</td><td></td><td></td></tr>
        <tr><td>Port Charger / USB</td><td></td><td></td></tr>
        <tr><td>Koneksi (WiFi / Bluetooth / SIM)</td><td></td><td></td></tr>
        <tr><td>Fingerprint / Face ID / Sensor</td><td></td><td></td></tr>
      </table>
      <div class="section-title">Klausul Perjanjian</div>
      <ol style="font-size:10px;line-height:1.6;padding-left:16px;color:#333">
        <li>Pelanggan menyatakan perangkat adalah milik sah, bebas dari sengketa hukum dan segala tuntutan pihak ketiga.</li>
        <li>Nilai taksiran yang disepakati bersifat final dan tidak dapat diubah setelah ditandatangani kedua pihak.</li>
        <li>Toko tidak bertanggung jawab atas data pribadi yang tersisa di perangkat setelah serah terima.</li>
        <li>Perangkat yang sudah diserahterimakan tidak dapat dikembalikan kecuali terdapat cacat tersembunyi yang disembunyikan secara sengaja.</li>
        <li>Transaksi tukar tambah ini tunduk pada ketentuan toko yang berlaku dan bersifat mengikat secara hukum.</li>
      </ol>
      <table style="margin-top:24px">
        <tr>
          <td style="width:50%;text-align:center;vertical-align:top;padding:0 12px">
            <div>Penyetor (Pelanggan),</div>
            <div class="sig-box"></div>
            <div style="margin-top:4px">(${t.customerName})</div>
          </td>
          <td style="width:50%;text-align:center;vertical-align:top;padding:0 12px">
            <div>Penerima (Staff / Teknisi Toko),</div>
            <div class="sig-box"></div>
            <div style="margin-top:4px">(__________________________)</div>
          </td>
        </tr>
      </table>
      <div class="footer">Dokumen ini dicetak otomatis oleh OmniPOS · ${now} · Harap simpan sebagai arsip bisnis Anda.</div>
    </body></html>`);
    w.document.close(); w.print();
  };

  const filteredSerials = serials.filter(s => {
    if (statusFilter !== 'ALL' && s.status !== statusFilter) return false;
    return true;
  });

  const filteredSimCards = simCards.filter(s => {
    const matchQuery = s.msisdn.toLowerCase().includes(simSearchQuery.toLowerCase()) ||
                       (s.iccid && s.iccid.toLowerCase().includes(simSearchQuery.toLowerCase())) ||
                       s.provider.toLowerCase().includes(simSearchQuery.toLowerCase()) ||
                       s.patternTier.toLowerCase().includes(simSearchQuery.toLowerCase());
    const matchProvider = simProviderFilter === 'ALL' || s.provider.toLowerCase().includes(simProviderFilter.toLowerCase());
    const matchTier = simTierFilter === 'ALL' || s.patternTier.toLowerCase() === simTierFilter.toLowerCase();
    const matchStatus = simStatusFilter === 'ALL' || String(s.status) === simStatusFilter;
    return matchQuery && matchProvider && matchTier && matchStatus;
  });

  const isSimOnly = initialTab === 'simcards';
  const isTradeInOnly = initialTab === 'tradein';
  const isImeiOnly = initialTab === 'warranty' || initialTab === 'inventory';

  // Dynamic Header Details
  const getHeaderInfo = () => {
    if (isSimOnly) {
      return {
        icon: Radio,
        title: 'Katalog Kartu SIM & Nomor Cantik',
        desc: 'Manajemen nomor perdana VIP, kuota data seluler, booking pelanggan & registrasi operator seluler'
      };
    }
    if (isTradeInOnly) {
      return {
        icon: RefreshCw,
        title: 'Tukar Tambah Gadget (Trade-In)',
        desc: 'Valuasi penilaian unit HP & Laptop bekas, appraisal kondisi fisik & riwayat tukar tambah kasir'
      };
    }
    return {
      icon: ShieldCheck,
      title: 'Pelacakan IMEI & Garansi Unit',
      desc: 'Pencarian status garansi resmi/toko, inventori serial number & registrasi unit baru'
    };
  };

  const headerInfo = getHeaderInfo();
  const HeaderIcon = headerInfo.icon;

  return (
    <div className="flex-1 flex flex-col bg-app overflow-hidden select-none">
      {/* Header */}
      <div className="p-4 bg-surface border-b border-border-subtle flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-bold">
            <HeaderIcon className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-base font-bold text-text-primary flex items-center gap-2">
              {headerInfo.title}
            </h1>
            <p className="text-xs text-text-secondary">
              {headerInfo.desc}
            </p>
          </div>
        </div>

        {/* Sub-Tab Navigation only for IMEI page (Cek Garansi vs Inventori IMEI) */}
        {isImeiOnly && (
          <div className="flex p-1 bg-subtle rounded-lg border border-border-subtle text-xs font-bold">
            <button
              onClick={() => setActiveTab('warranty')}
              className={`px-3 py-1.5 rounded-md transition-all ${
                activeTab === 'warranty'
                  ? 'bg-card text-text-primary shadow-xs'
                  : 'text-text-secondary hover:text-text-primary'
              }`}
            >
              🛡️ Cek Garansi Cepat
            </button>
            <button
              onClick={() => setActiveTab('inventory')}
              className={`px-3 py-1.5 rounded-md transition-all ${
                activeTab === 'inventory'
                  ? 'bg-card text-text-primary shadow-xs'
                  : 'text-text-secondary hover:text-text-primary'
              }`}
            >
              📦 Inventori IMEI ({serials.length})
            </button>
          </div>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-5">
        {/* ========================================================= */}
        {/* TAB 1: QUICK WARRANTY LOOKUP */}
        {/* ========================================================= */}
        {activeTab === 'warranty' && (
          <div className="max-w-2xl mx-auto space-y-5">
            <div className="p-6 bg-card rounded-2xl border border-border-subtle shadow-sm text-center space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-primary/10 text-primary mx-auto flex items-center justify-center">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-base font-bold text-text-primary">Pencarian Garansi Resmi & Toko</h2>
                <p className="text-xs text-text-secondary mt-0.5">
                  Masukkan atau scan nomor 15-digit IMEI smartphone atau Serial Number laptop
                </p>
              </div>

              <form onSubmit={handleSearchWarranty} className="flex gap-2 max-w-md mx-auto">
                <input
                  type="text"
                  required
                  value={searchImei}
                  onChange={(e) => setSearchImei(e.target.value)}
                  placeholder="Contoh: 358921104829101..."
                  className="flex-1 px-4 py-2.5 bg-subtle border border-border-subtle rounded-xl text-xs text-text-primary font-mono text-center focus:outline-none focus:border-primary"
                />
                <button
                  type="submit"
                  disabled={isSearchingWarranty}
                  className="px-5 py-2.5 bg-primary hover:bg-primary-hover text-primary-text font-bold rounded-xl text-xs shadow-md disabled:opacity-50 flex items-center gap-1.5"
                >
                  <Search className="w-4 h-4" />
                  <span>{isSearchingWarranty ? 'Mencari...' : 'Cek Status'}</span>
                </button>
              </form>

              {/* Sample Quick Chips */}
              <div className="flex justify-center items-center gap-1.5 text-[11px] text-text-muted">
                <span>Coba IMEI Contoh:</span>
                <button 
                  onClick={() => setSearchImei('358921104829101')} 
                  className="px-2 py-0.5 rounded bg-subtle border border-border-subtle font-mono text-primary hover:bg-card"
                >
                  Samsung S24 (358921104829101)
                </button>
                <button 
                  onClick={() => setSearchImei('354029198230011')} 
                  className="px-2 py-0.5 rounded bg-subtle border border-border-subtle font-mono text-primary hover:bg-card"
                >
                  iPhone 15 (354029198230011)
                </button>
              </div>
            </div>

            {/* Result Card */}
            {warrantyResult && (
              <div className="p-6 bg-card rounded-2xl border border-primary/40 shadow-lg space-y-4 animate-fade-in">
                <div className="flex items-start justify-between">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-text-muted">Hasil Pengecekan Unit:</span>
                    <h3 className="text-base font-bold text-text-primary mt-0.5">{warrantyResult.productName}</h3>
                    <p className="text-xs font-mono text-primary mt-0.5">IMEI / SN: {warrantyResult.serialNo}</p>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                    warrantyResult.status === 'Available'
                      ? 'bg-blue-500/10 text-blue-600 border border-blue-500/20'
                      : warrantyResult.isWarrantyActive
                      ? 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/20'
                      : 'bg-rose-500/10 text-rose-600 border border-rose-500/20'
                  }`}>
                    {warrantyResult.status === 'Available' ? '📦 Stok Siap Jual di Toko' : warrantyResult.isWarrantyActive ? '🛡️ Garansi Masih Aktif' : '⚠️ Garansi Telah Berakhir'}
                  </span>
                </div>

                <div className="p-4 bg-subtle rounded-xl border border-border-subtle grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <span className="text-text-muted block text-[10px]">Cakupan Garansi:</span>
                    <strong className="text-text-primary">{warrantyResult.warrantyNotes || `${warrantyResult.warrantyMonths} Bulan Garansi`}</strong>
                  </div>
                  <div>
                    <span className="text-text-muted block text-[10px]">Sisa Masa Berlaku:</span>
                    <strong className="text-emerald-600 font-mono">{warrantyResult.remainingWarrantyDays} Hari Tersisa</strong>
                  </div>
                  <div>
                    <span className="text-text-muted block text-[10px]">Distributor / Sumber:</span>
                    <span className="text-text-secondary">{warrantyResult.supplierName || 'Distributor Resmi'}</span>
                  </div>
                  <div>
                    <span className="text-text-muted block text-[10px]">Riwayat Nota Penjualan:</span>
                    <span className="font-mono text-text-primary">{warrantyResult.soldInvoiceNumber || 'Belum Terjual (Unit Baru)'}</span>
                  </div>
                  {warrantyResult.customerName && (
                    <div className="col-span-2 pt-1 border-t border-border-subtle">
                      <span className="text-text-muted block text-[10px]">Pemilik Pertama:</span>
                      <strong className="text-text-primary">{warrantyResult.customerName}</strong> ({warrantyResult.customerPhone || '-'})
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ========================================================= */}
        {/* TAB 2: MASTER INVENTORY SERIAL NUMBERS */}
        {/* ========================================================= */}
        {activeTab === 'inventory' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex gap-2">
                {['ALL', 'Available', 'Sold', 'InService'].map(st => (
                  <button
                    key={st}
                    onClick={() => setStatusFilter(st)}
                    className={`px-3 py-1 rounded-lg text-xs font-semibold ${
                      statusFilter === st ? 'bg-card border border-primary text-primary' : 'bg-subtle text-text-secondary'
                    }`}
                  >
                    {st === 'ALL' ? 'Semua Status' : st === 'Available' ? 'Tersedia di Toko' : st === 'Sold' ? 'Terjual' : 'Dalam Servis'}
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={exportSerialsToCsv}
                  className="px-3.5 py-2 bg-subtle hover:bg-card-hover border border-border-subtle rounded-lg text-xs font-bold text-text-secondary flex items-center gap-1.5 transition-all"
                >
                  <Download className="w-3.5 h-3.5 text-primary" />
                  <span>Ekspor CSV</span>
                </button>
                <button
                  onClick={() => setIsAddBatchModalOpen(true)}
                  className="px-3.5 py-2 bg-primary hover:bg-primary-hover text-primary-text rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-sm"
                >
                  <Plus className="w-4 h-4" />
                  <span>Input / Scan Batch IMEI Masuk</span>
                </button>
              </div>
            </div>

            <div className="bg-card border border-border-subtle rounded-xl overflow-hidden shadow-sm">
              <table className="w-full text-left text-xs">
                <thead className="bg-subtle text-text-secondary font-semibold border-b border-border-subtle">
                  <tr>
                    <th className="p-3">Nomor IMEI / Serial</th>
                    <th className="p-3">Nama Produk & SKU</th>
                    <th className="p-3">Distributor / Supplier</th>
                    <th className="p-3">Durasi Garansi</th>
                    <th className="p-3">Nota Penjualan</th>
                    <th className="p-3 text-center">Status Unit</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border-subtle/50 font-mono">
                  {filteredSerials.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="p-8 text-center text-text-muted font-sans">Belum ada data IMEI terdaftar.</td>
                    </tr>
                  ) : (
                    filteredSerials.map(s => (
                      <tr key={s.id} className="hover:bg-card-hover/50">
                        <td className="p-3 font-bold text-text-primary">{s.serialNo}</td>
                        <td className="p-3 font-sans">
                          <div className="font-semibold text-text-primary">{s.productName}</div>
                          <div className="text-[10px] text-text-muted font-mono">{s.sku}</div>
                        </td>
                        <td className="p-3 font-sans text-text-secondary">{s.supplierName || 'Distributor'}</td>
                        <td className="p-3 font-sans text-text-secondary">{s.warrantyNotes || `${s.warrantyMonths} Bulan`}</td>
                        <td className="p-3 text-text-muted">{s.soldInvoiceNumber || '-'}</td>
                        <td className="p-3 text-center font-sans">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            s.status === 'Available' 
                              ? 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/20' 
                              : s.status === 'Sold' 
                              ? 'bg-subtle text-text-muted border border-border-subtle' 
                              : 'bg-amber-500/10 text-amber-600 border border-amber-500/20'
                          }`}>
                            {s.status === 'Available' ? 'Tersedia' : s.status === 'Sold' ? 'Terjual' : s.status}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* TAB 3: SIM CARDS & NOMOR CANTIK */}
        {/* ========================================================= */}
        {activeTab === 'simcards' && (
          <div className="space-y-4">
            {/* Quick Metrics */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="p-4 bg-card rounded-xl border border-border-subtle shadow-xs">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-text-secondary">Total Nomor Cantik</span>
                  <Radio className="w-4 h-4 text-primary" />
                </div>
                <div className="mt-2 text-xl font-bold text-text-primary">{simCards.length}</div>
                <div className="text-[11px] text-text-muted mt-0.5">Seluruh operator seluler</div>
              </div>

              <div className="p-4 bg-card rounded-xl border border-border-subtle shadow-xs">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-text-secondary">Nomor Tersedia</span>
                  <Sparkles className="w-4 h-4 text-emerald-500" />
                </div>
                <div className="mt-2 text-xl font-bold text-emerald-600">
                  {simCards.filter(s => s.status === 'Available' || s.status === 0).length}
                </div>
                <div className="text-[11px] text-emerald-600/80 mt-0.5">Siap dijual di kasir</div>
              </div>

              <div className="p-4 bg-card rounded-xl border border-border-subtle shadow-xs">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-text-secondary">Nomor Terjual</span>
                  <CheckCircle2 className="w-4 h-4 text-blue-500" />
                </div>
                <div className="mt-2 text-xl font-bold text-text-primary">
                  {simCards.filter(s => s.status === 'Sold' || s.status === 1).length}
                </div>
                <div className="text-[11px] text-text-muted mt-0.5">Telah diaktivasi pelanggan</div>
              </div>

              <div className="p-4 bg-card rounded-xl border border-border-subtle shadow-xs">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-text-secondary">Kritis Batas Registrasi</span>
                  <AlertTriangle className="w-4 h-4 text-amber-500" />
                </div>
                <div className="mt-2 text-xl font-bold text-amber-600">
                  {simCards.filter(s => {
                    const days = Math.ceil((new Date(s.expiryDate).getTime() - Date.now()) / (1000 * 3600 * 24));
                    return (s.status === 'Available' || s.status === 0) && days <= 30;
                  }).length}
                </div>
                <div className="text-[11px] text-amber-600/80 mt-0.5">Kadaluarsa dlm 30 hari</div>
              </div>
            </div>

            {/* Filter & Action Bar */}
            <div className="p-4 bg-card rounded-xl border border-border-subtle space-y-3">
              <div className="flex flex-col md:flex-row gap-2 justify-between items-stretch md:items-center">
                <div className="relative flex-1">
                  <Search className="w-4 h-4 text-text-muted absolute left-3 top-2.5" />
                  <input
                    type="text"
                    value={simSearchQuery}
                    onChange={(e) => setSimSearchQuery(e.target.value)}
                    placeholder="Cari pola digit (misal: 8888, 9999, 1234), nomor MSISDN, atau ICCID..."
                    className="w-full pl-9 pr-3 py-2 bg-subtle border border-border-subtle rounded-xl text-xs text-text-primary font-mono focus:outline-none focus:border-primary"
                  />
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={exportSimCardsToCsv}
                    className="px-3.5 py-2 bg-subtle hover:bg-card-hover border border-border-subtle rounded-xl text-xs font-bold text-text-secondary flex items-center gap-1.5 transition-all"
                  >
                    <Download className="w-3.5 h-3.5 text-primary" />
                    <span>Ekspor CSV Stok</span>
                  </button>

                  <button
                    onClick={() => setIsBatchImportSimModalOpen(true)}
                    className="px-3.5 py-2 bg-subtle hover:bg-card-hover border border-border-subtle rounded-xl text-xs font-bold text-text-secondary flex items-center gap-1.5 transition-all"
                  >
                    <Upload className="w-3.5 h-3.5 text-primary" />
                    <span>⚡ Batch Import MSISDN</span>
                  </button>

                  <button
                    onClick={() => setIsAddSimModalOpen(true)}
                    className="px-3.5 py-2 bg-primary hover:bg-primary-hover text-primary-text rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Tambah Nomor Cantik</span>
                  </button>
                </div>
              </div>

              {/* Tag Filters */}
              <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-border-subtle/60 text-xs">
                <div className="flex items-center gap-1 overflow-x-auto pb-1 max-w-full">
                  <span className="text-[11px] font-semibold text-text-muted mr-1">Operator:</span>
                  {['ALL', 'Telkomsel', 'Indosat Ooredoo IM3', 'XL Axiata', 'Axis', 'Smartfren', 'Tri (3)'].map(p => (
                    <button
                      key={p}
                      onClick={() => setSimProviderFilter(p)}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all shrink-0 ${
                        simProviderFilter === p 
                          ? 'bg-primary text-primary-text' 
                          : 'bg-subtle text-text-muted hover:bg-card-hover border border-border-subtle'
                      }`}
                    >
                      {p}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Table of Special Numbers */}
            <div className="bg-card border border-border-subtle rounded-xl overflow-hidden shadow-sm">
              <table className="w-full text-left text-xs">
                <thead className="bg-subtle text-text-secondary font-semibold border-b border-border-subtle">
                  <tr>
                    <th className="p-3">Nomor Telepon (MSISDN)</th>
                    <th className="p-3">Operator & Pola</th>
                    <th className="p-3">Kuota & Pulsa</th>
                    <th className="p-3">Batas Registrasi</th>
                    <th className="p-3 text-right">Modal & Harga Jual</th>
                    <th className="p-3 text-center">Status</th>
                    <th className="p-3 text-center">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border-subtle/50">
                  {filteredSimCards.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="p-8 text-center text-text-muted">
                        Tidak ada nomor kartu yang sesuai dengan filter pencarian.
                      </td>
                    </tr>
                  ) : (
                    filteredSimCards.map(s => {
                      const daysLeft = Math.ceil((new Date(s.expiryDate).getTime() - Date.now()) / (1000 * 3600 * 24));
                      const isExpiring = daysLeft <= 30;
                      const isSold = s.status === 'Sold' || s.status === 1;
                      const isReserved = s.status === 'ReservedBooking' || s.status === 2;

                      return (
                        <tr key={s.id} className="hover:bg-card-hover/50 transition-colors">
                          <td className="p-3">
                            <div className="font-mono font-black text-sm text-text-primary tracking-wide flex items-center gap-1.5">
                              <span>{s.msisdn}</span>
                              <button
                                title="Salin Nomor"
                                onClick={() => {
                                  navigator.clipboard.writeText(s.msisdn);
                                  useToastStore.getState().showToast(`Nomor ${s.msisdn} disalin!`, 'info');
                                }}
                                className="text-text-muted hover:text-primary p-0.5"
                              >
                                <Copy className="w-3 h-3" />
                              </button>
                            </div>
                            {s.iccid && <div className="text-[10px] text-text-muted font-mono">ICCID: {s.iccid}</div>}
                          </td>

                          <td className="p-3">
                            <div className="font-bold text-text-primary">{s.provider}</div>
                            <span className="inline-block mt-0.5 px-2 py-0.5 rounded bg-amber-500/10 text-amber-600 border border-amber-500/20 text-[10px] font-bold">
                              {s.patternTier}
                            </span>
                          </td>

                          <td className="p-3">
                            <div className="text-text-primary font-semibold flex items-center gap-1">
                              <Database className="w-3 h-3 text-primary" /> {s.defaultQuotaGb || '0GB'}
                            </div>
                            {s.mainBalance > 0 && (
                              <div className="text-[10px] text-text-muted font-mono">
                                Pulsa: Rp {s.mainBalance.toLocaleString('id-ID')}
                              </div>
                            )}
                          </td>

                          <td className="p-3">
                            <div className="text-text-secondary text-[11px]">
                              {new Date(s.expiryDate).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                            </div>
                            <span className={`inline-block mt-0.5 px-1.5 py-0.2 rounded text-[10px] font-bold ${
                              daysLeft <= 0 ? 'bg-rose-600 text-white' :
                              isExpiring ? 'bg-rose-500/10 text-rose-600 border border-rose-500/30' : 
                              'bg-emerald-500/10 text-emerald-600'
                            }`}>
                              {daysLeft <= 0 ? 'KADALUARSA' : `H-${daysLeft} hari lagi`}
                            </span>
                          </td>

                          <td className="p-3 text-right">
                            <div className="font-mono font-black text-emerald-600 text-sm">
                              Rp {s.sellPrice.toLocaleString('id-ID')}
                            </div>
                            <div className="text-[10px] text-text-muted font-mono">
                              Modal: Rp {s.buyPrice.toLocaleString('id-ID')}
                            </div>
                          </td>

                          <td className="p-3 text-center">
                            {isSold ? (
                              <div>
                                <span className="px-2 py-0.5 rounded-full bg-slate-500/10 text-slate-600 border border-slate-500/20 text-[10px] font-bold">
                                  Terjual
                                </span>
                                {s.soldInvoiceNumber && (
                                  <div className="text-[9px] text-text-muted font-mono mt-0.5">{s.soldInvoiceNumber}</div>
                                )}
                              </div>
                            ) : isReserved ? (
                              <div>
                                <span className="px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-600 border border-amber-500/20 text-[10px] font-bold">
                                  Dibooking
                                </span>
                                {s.customerName && <div className="text-[10px] text-text-muted mt-0.5">{s.customerName}</div>}
                              </div>
                            ) : (
                              <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 text-[10px] font-bold">
                                Tersedia
                              </span>
                            )}
                          </td>

                          <td className="p-3 text-center">
                            <div className="flex flex-col items-center gap-1">
                              {!isSold && !isReserved && (
                                <button
                                  onClick={() => handleReserveSim(s)}
                                  className="px-2.5 py-1 rounded-lg bg-subtle hover:bg-amber-500/10 text-text-secondary hover:text-amber-600 border border-border-subtle text-[11px] font-bold flex items-center gap-1 transition-all w-full justify-center"
                                >
                                  <Bookmark className="w-3 h-3" />
                                  <span>Booking</span>
                                </button>
                              )}
                              <button
                                onClick={() => handlePrintSimSticker(s)}
                                title="Cetak Stiker Harga"
                                className="px-2.5 py-1 rounded-lg bg-subtle hover:bg-primary/10 text-text-secondary hover:text-primary border border-border-subtle text-[11px] font-bold flex items-center gap-1 transition-all w-full justify-center"
                              >
                                <Printer className="w-3 h-3" />
                                <span>Stiker</span>
                              </button>
                            </div>
                          </td>

                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* TAB 4: TRADE-IN / TUKAR TAMBAH */}
        {/* ========================================================= */}
        {activeTab === 'tradein' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xs font-bold text-text-primary">Buku Catatan Tukar Tambah (Trade-In / Buyback)</h3>
                <p className="text-[11px] text-text-secondary">Penerimaan gadget bekas pelanggan sebagai potongan belanja unit baru</p>
              </div>

              <button
                onClick={() => setIsAddTradeInModalOpen(true)}
                className="px-3.5 py-2 bg-primary hover:bg-primary-hover text-primary-text rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-sm"
              >
                <Plus className="w-4 h-4" />
                <span>Formulir Tukar Tambah Baru</span>
              </button>
            </div>

            <div className="bg-card border border-border-subtle rounded-xl overflow-hidden shadow-sm">
              <table className="w-full text-left text-xs">
                <thead className="bg-subtle text-text-secondary font-semibold border-b border-border-subtle">
                  <tr>
                    <th className="p-3">No. Transaksi</th>
                    <th className="p-3">Pelanggan</th>
                    <th className="p-3">Perangkat Bekas & IMEI</th>
                    <th className="p-3">Grade Fisik & Kelengkapan</th>
                    <th className="p-3">Catatan Fungsi</th>
                    <th className="p-3 text-right">Nilai Taksiran (Rp)</th>
                    <th className="p-3 text-center">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border-subtle/50">
                  {tradeIns.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="p-8 text-center text-text-muted font-sans">Belum ada transaksi tukar tambah.</td>
                    </tr>
                  ) : (
                    tradeIns.map(t => (
                      <tr key={t.id} className="hover:bg-card-hover/50">
                        <td className="p-3 font-mono font-bold text-text-primary">{t.tradeInNumber}</td>
                        <td className="p-3">
                          <div className="font-semibold text-text-primary">{t.customerName}</div>
                          <div className="text-[10px] text-text-muted font-mono">{t.customerPhone}</div>
                        </td>
                        <td className="p-3">
                          <div className="font-bold text-text-primary">{t.deviceBrandModel}</div>
                          {t.imeiOrSerial && <div className="text-[10px] text-text-muted font-mono">IMEI: {t.imeiOrSerial}</div>}
                        </td>
                        <td className="p-3">
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-primary/10 text-primary mr-1">
                            {t.conditionGrade}
                          </span>
                          <span className="text-text-secondary text-[11px]">{t.accessoriesIncluded}</span>
                        </td>
                        <td className="p-3 text-text-secondary max-w-xs truncate">{t.functionalNotes}</td>
                        <td className="p-3 text-right font-mono font-bold text-emerald-600 tabular-nums">
                          Rp {t.valuationAmount.toLocaleString('id-ID')}
                        </td>
                        <td className="p-3 text-center">
                          <button
                            onClick={() => handlePrintSpjb(t)}
                            title="Cetak Surat Perjanjian Tukar Tambah (SPJB)"
                            className="px-2.5 py-1 rounded-lg bg-subtle hover:bg-primary/10 text-text-secondary hover:text-primary border border-border-subtle text-[11px] font-bold flex items-center gap-1 mx-auto transition-all"
                          >
                            <Printer className="w-3 h-3" />
                            <span>SPJB</span>
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* MODAL: INPUT BATCH IMEI / SERIAL */}
      {isAddBatchModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-card border border-border-strong rounded-2xl shadow-2xl overflow-hidden">
            <div className="p-4 bg-surface border-b border-border-subtle flex items-center justify-between">
              <h3 className="font-bold text-sm text-text-primary flex items-center gap-2">
                <Smartphone className="w-4 h-4 text-primary" />
                Input / Scan Nomor IMEI Barang Masuk
              </h3>
              <button onClick={() => setIsAddBatchModalOpen(false)} className="text-text-muted hover:text-text-primary font-bold">
                ✕
              </button>
            </div>

            <form onSubmit={handleBatchAddSerials} className="p-5 space-y-3 text-xs">
              <div>
                <label className="block font-bold text-text-muted mb-1">Pilih Produk Gadget / Laptop *</label>
                <select
                  required
                  value={batchProductId}
                  onChange={(e) => setBatchProductId(e.target.value)}
                  className="w-full px-3 py-2 bg-card border border-border-subtle rounded-lg text-text-primary font-semibold"
                >
                  <option value="">-- Pilih Produk --</option>
                  {products.map(p => (
                    <option key={p.id} value={p.id}>{p.name} ({p.sku})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-bold text-text-muted mb-1">
                  Tempelkan (Paste) atau Scan IMEI / Serial Number (1 per baris) *
                </label>
                <textarea
                  required
                  rows={5}
                  value={batchSerialsText}
                  onChange={(e) => setBatchSerialsText(e.target.value)}
                  placeholder="358921104829101&#10;358921104829102&#10;358921104829103"
                  className="w-full p-3 bg-subtle border border-border-subtle rounded-xl font-mono text-xs text-text-primary focus:outline-none focus:border-primary"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-bold text-text-muted mb-1">Supplier / Distributor</label>
                  <input
                    type="text"
                    value={batchSupplierName}
                    onChange={(e) => setBatchSupplierName(e.target.value)}
                    className="w-full px-3 py-2 bg-card border border-border-subtle rounded-lg text-text-primary"
                  />
                </div>
                <div>
                  <label className="block font-bold text-text-muted mb-1">Klausul Garansi</label>
                  <input
                    type="text"
                    value={batchWarrantyNotes}
                    onChange={(e) => setBatchWarrantyNotes(e.target.value)}
                    placeholder="Garansi Resmi SEIN 1 Tahun"
                    className="w-full px-3 py-2 bg-card border border-border-subtle rounded-lg text-text-primary"
                  />
                </div>
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddBatchModalOpen(false)}
                  className="px-4 py-2 bg-subtle hover:bg-card-hover border border-border-subtle rounded-lg text-text-secondary font-semibold"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingBatch}
                  className="px-5 py-2 bg-primary hover:bg-primary-hover text-primary-text font-bold rounded-lg shadow-md disabled:opacity-50"
                >
                  {isSubmittingBatch ? 'Mendaftarkan...' : 'Simpan ke Inventori'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: INPUT TRADE-IN / TUKAR TAMBAH */}
      {isAddTradeInModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-card border border-border-strong rounded-2xl shadow-2xl overflow-hidden">
            <div className="p-4 bg-surface border-b border-border-subtle flex items-center justify-between">
              <h3 className="font-bold text-sm text-text-primary flex items-center gap-2">
                <ArrowLeftRight className="w-4 h-4 text-primary" />
                Penerimaan Tukar Tambah (Trade-In)
              </h3>
              <button onClick={() => setIsAddTradeInModalOpen(false)} className="text-text-muted hover:text-text-primary font-bold">
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateTradeIn} className="p-5 space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-bold text-text-muted mb-1">Nama Pemilik *</label>
                  <input
                    type="text"
                    required
                    value={tinCustName}
                    onChange={(e) => setTinCustName(e.target.value)}
                    placeholder="Nama pelanggan..."
                    className="w-full px-3 py-2 bg-card border border-border-subtle rounded-lg text-text-primary"
                  />
                </div>
                <div>
                  <label className="block font-bold text-text-muted mb-1">Nomor WhatsApp *</label>
                  <input
                    type="text"
                    required
                    value={tinCustPhone}
                    onChange={(e) => setTinCustPhone(e.target.value)}
                    placeholder="0812-xxxx"
                    className="w-full px-3 py-2 bg-card border border-border-subtle rounded-lg text-text-primary font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-bold text-text-muted mb-1">Tipe HP Bekas *</label>
                  <input
                    type="text"
                    required
                    value={tinDeviceModel}
                    onChange={(e) => setTinDeviceModel(e.target.value)}
                    placeholder="iPhone 11 128GB Black..."
                    className="w-full px-3 py-2 bg-card border border-border-subtle rounded-lg text-text-primary"
                  />
                </div>
                <div>
                  <label className="block font-bold text-text-muted mb-1">Nomor IMEI Bekas</label>
                  <input
                    type="text"
                    value={tinImei}
                    onChange={(e) => setTinImei(e.target.value)}
                    placeholder="35xxxx"
                    className="w-full px-3 py-2 bg-card border border-border-subtle rounded-lg text-text-primary font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-bold text-text-muted mb-1">Grade Kondisi Fisik</label>
                  <select
                    value={tinGrade}
                    onChange={(e) => setTinGrade(e.target.value)}
                    className="w-full px-3 py-2 bg-card border border-border-subtle rounded-lg text-text-primary font-bold"
                  >
                    <option value="Grade A (Mulus 98%)">Grade A (Mulus 98-99%)</option>
                    <option value="Grade B (Lecet Wajar 90%)">Grade B (Lecet Wajar 90%)</option>
                    <option value="Grade C (Lecet Pemakaian Berat)">Grade C (Lecet Berat / Dent)</option>
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-text-muted mb-1">Nilai Taksiran Tukar Tambah (Rp) *</label>
                  <input
                    type="number"
                    required
                    value={tinValuation}
                    onChange={(e) => setTinValuation(e.target.value)}
                    placeholder="2500000"
                    className="w-full px-3 py-2 bg-card border border-border-subtle rounded-lg text-text-primary font-mono font-bold text-emerald-600"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-text-muted mb-1">Kelengkapan Disertakan</label>
                <input
                  type="text"
                  value={tinAccessories}
                  onChange={(e) => setTinAccessories(e.target.value)}
                  placeholder="Unit + Dus + Charger"
                  className="w-full px-3 py-2 bg-card border border-border-subtle rounded-lg text-text-primary"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddTradeInModalOpen(false)}
                  className="px-4 py-2 bg-subtle hover:bg-card-hover border border-border-subtle rounded-lg text-text-secondary font-semibold"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-primary hover:bg-primary-hover text-primary-text font-bold rounded-lg shadow-md"
                >
                  Simpan Tukar Tambah
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: INPUT SATUAN NOMOR CANTIK */}
      {isAddSimModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-card border border-border-strong rounded-2xl shadow-2xl overflow-hidden">
            <div className="p-4 bg-surface border-b border-border-subtle flex items-center justify-between">
              <h3 className="font-bold text-sm text-text-primary flex items-center gap-2">
                <Radio className="w-4 h-4 text-primary" />
                Pendaftaran Kartu Perdana & Nomor Cantik Baru
              </h3>
              <button onClick={() => setIsAddSimModalOpen(false)} className="text-text-muted hover:text-text-primary font-bold">
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateSimCard} className="p-5 space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-bold text-text-muted mb-1">Nomor Telepon (MSISDN) *</label>
                  <input
                    type="text"
                    required
                    value={simMsisdn}
                    onChange={(e) => setSimMsisdn(e.target.value)}
                    placeholder="0812-8888-8888"
                    className="w-full px-3 py-2 bg-card border border-border-subtle rounded-lg text-text-primary font-mono font-bold"
                  />
                </div>
                <div>
                  <label className="block font-bold text-text-muted mb-1">Operator Seluler</label>
                  <select
                    value={simProvider}
                    onChange={(e) => setSimProvider(e.target.value)}
                    className="w-full px-3 py-2 bg-card border border-border-subtle rounded-lg text-text-primary font-bold"
                  >
                    <option value="Telkomsel">Telkomsel</option>
                    <option value="Indosat Ooredoo IM3">Indosat Ooredoo IM3</option>
                    <option value="XL Axiata">XL Axiata</option>
                    <option value="Axis">Axis</option>
                    <option value="Smartfren">Smartfren</option>
                    <option value="Tri (3)">Tri (3)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-bold text-text-muted mb-1">Pola Tier Cantik</label>
                  <select
                    value={simPatternTier}
                    onChange={(e) => setSimPatternTier(e.target.value)}
                    className="w-full px-3 py-2 bg-card border border-border-subtle rounded-lg text-text-primary"
                  >
                    <option value="Panca Super">Panca Super (88888)</option>
                    <option value="Kwartet">Kwartet (7777)</option>
                    <option value="Triple">Triple (999)</option>
                    <option value="Tangga Seri">Tangga Seri (1234)</option>
                    <option value="Mirror / Kembar">Mirror / Kembar (8228)</option>
                    <option value="VIP Platinum">VIP Platinum</option>
                    <option value="Reguler Cantik">Reguler Cantik</option>
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-text-muted mb-1">Serial Fisik / ICCID</label>
                  <input
                    type="text"
                    value={simIccid}
                    onChange={(e) => setSimIccid(e.target.value)}
                    placeholder="89620..."
                    className="w-full px-3 py-2 bg-card border border-border-subtle rounded-lg text-text-primary font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block font-bold text-text-muted mb-1">Kuota Bawaan</label>
                  <input
                    type="text"
                    value={simQuota}
                    onChange={(e) => setSimQuota(e.target.value)}
                    placeholder="15GB"
                    className="w-full px-3 py-2 bg-card border border-border-subtle rounded-lg text-text-primary"
                  />
                </div>
                <div>
                  <label className="block font-bold text-text-muted mb-1">Pulsa Awal (Rp)</label>
                  <input
                    type="number"
                    value={simBalance}
                    onChange={(e) => setSimBalance(e.target.value)}
                    placeholder="10000"
                    className="w-full px-3 py-2 bg-card border border-border-subtle rounded-lg text-text-primary font-mono"
                  />
                </div>
                <div>
                  <label className="block font-bold text-text-muted mb-1">Batas Registrasi</label>
                  <input
                    type="date"
                    value={simExpiryDate}
                    onChange={(e) => setSimExpiryDate(e.target.value)}
                    className="w-full px-3 py-2 bg-card border border-border-subtle rounded-lg text-text-primary text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-bold text-text-muted mb-1">Harga Modal Kulak (Rp)</label>
                  <input
                    type="number"
                    value={simBuyPrice}
                    onChange={(e) => setSimBuyPrice(e.target.value)}
                    placeholder="100000"
                    className="w-full px-3 py-2 bg-card border border-border-subtle rounded-lg text-text-primary font-mono"
                  />
                </div>
                <div>
                  <label className="block font-bold text-text-muted mb-1">Harga Jual Khusus (Rp) *</label>
                  <input
                    type="number"
                    required
                    value={simSellPrice}
                    onChange={(e) => setSimSellPrice(e.target.value)}
                    placeholder="500000"
                    className="w-full px-3 py-2 bg-card border border-border-subtle rounded-lg text-text-primary font-mono font-bold text-emerald-600"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-text-muted mb-1">Catatan</label>
                <input
                  type="text"
                  value={simNotes}
                  onChange={(e) => setSimNotes(e.target.value)}
                  placeholder="Segel Pabrik / Belum Registrasi"
                  className="w-full px-3 py-2 bg-card border border-border-subtle rounded-lg text-text-primary"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddSimModalOpen(false)}
                  className="px-4 py-2 bg-subtle hover:bg-card-hover border border-border-subtle rounded-lg text-text-secondary font-semibold"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-primary hover:bg-primary-hover text-primary-text font-bold rounded-lg shadow-md"
                >
                  Simpan Nomor Cantik
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: BATCH IMPORT MSISDN */}
      {isBatchImportSimModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-card border border-border-strong rounded-2xl shadow-2xl overflow-hidden">
            <div className="p-4 bg-surface border-b border-border-subtle flex items-center justify-between">
              <h3 className="font-bold text-sm text-text-primary flex items-center gap-2">
                <Upload className="w-4 h-4 text-primary" />
                Batch Import Nomor Perdana / SIM Card Massal
              </h3>
              <button onClick={() => setIsBatchImportSimModalOpen(false)} className="text-text-muted hover:text-text-primary font-bold">
                ✕
              </button>
            </div>

            <form onSubmit={handleBatchImportSim} className="p-5 space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-bold text-text-muted mb-1">Operator</label>
                  <select
                    value={batchSimProvider}
                    onChange={(e) => setBatchSimProvider(e.target.value)}
                    className="w-full px-3 py-2 bg-card border border-border-subtle rounded-lg text-text-primary font-bold"
                  >
                    <option value="Telkomsel">Telkomsel</option>
                    <option value="Indosat Ooredoo IM3">Indosat Ooredoo IM3</option>
                    <option value="XL Axiata">XL Axiata</option>
                    <option value="Axis">Axis</option>
                    <option value="Smartfren">Smartfren</option>
                    <option value="Tri (3)">Tri (3)</option>
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-text-muted mb-1">Pola Tier Default</label>
                  <select
                    value={batchSimTier}
                    onChange={(e) => setBatchSimTier(e.target.value)}
                    className="w-full px-3 py-2 bg-card border border-border-subtle rounded-lg text-text-primary"
                  >
                    <option value="Reguler Cantik">Reguler Cantik</option>
                    <option value="Panca Super">Panca Super</option>
                    <option value="Kwartet">Kwartet</option>
                    <option value="Triple">Triple</option>
                    <option value="Tangga Seri">Tangga Seri</option>
                    <option value="Mirror / Kembar">Mirror / Kembar</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-bold text-text-muted mb-1">
                  Tempelkan List Nomor Telepon (1 Nomor per baris) *
                </label>
                <textarea
                  required
                  rows={5}
                  value={batchSimText}
                  onChange={(e) => setBatchSimText(e.target.value)}
                  placeholder="081288880001&#10;081288880002&#10;081288880003"
                  className="w-full p-3 bg-subtle border border-border-subtle rounded-xl font-mono text-xs text-text-primary focus:outline-none focus:border-primary"
                />
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block font-bold text-text-muted mb-1">Kuota</label>
                  <input
                    type="text"
                    value={batchSimQuota}
                    onChange={(e) => setBatchSimQuota(e.target.value)}
                    className="w-full px-3 py-2 bg-card border border-border-subtle rounded-lg text-text-primary"
                  />
                </div>
                <div>
                  <label className="block font-bold text-text-muted mb-1">Harga Modal (Rp)</label>
                  <input
                    type="number"
                    value={batchSimBuyPrice}
                    onChange={(e) => setBatchSimBuyPrice(e.target.value)}
                    className="w-full px-3 py-2 bg-card border border-border-subtle rounded-lg text-text-primary font-mono"
                  />
                </div>
                <div>
                  <label className="block font-bold text-text-muted mb-1">Harga Jual (Rp)</label>
                  <input
                    type="number"
                    value={batchSimSellPrice}
                    onChange={(e) => setBatchSimSellPrice(e.target.value)}
                    className="w-full px-3 py-2 bg-card border border-border-subtle rounded-lg text-text-primary font-mono font-bold text-emerald-600"
                  />
                </div>
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsBatchImportSimModalOpen(false)}
                  className="px-4 py-2 bg-subtle hover:bg-card-hover border border-border-subtle rounded-lg text-text-secondary font-semibold"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-primary hover:bg-primary-hover text-primary-text font-bold rounded-lg shadow-md"
                >
                  Impor Nomor Massal
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
