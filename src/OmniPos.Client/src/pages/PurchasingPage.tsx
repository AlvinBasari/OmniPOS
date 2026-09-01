import React, { useState, useEffect } from 'react';
import { 
  Truck, 
  Plus, 
  Search, 
  DollarSign, 
  Calendar, 
  Clock, 
  AlertCircle, 
  CheckCircle2, 
  ChevronRight,
  FileText,
  Building2,
  Trash2,
  Receipt,
  Printer,
  Filter,
  Eye
} from 'lucide-react';
import { Supplier, PurchaseInvoice, Product } from '../types';
import { useToastStore } from '../store/useToastStore';

export const PurchasingPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'invoices' | 'suppliers' | 'payables'>('invoices');
  const [invoices, setInvoices] = useState<PurchaseInvoice[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Modal States
  const [isAddInvoiceOpen, setIsAddInvoiceOpen] = useState(false);
  const [isAddSupplierOpen, setIsAddSupplierOpen] = useState(false);
  const [isPayDebtOpen, setIsPayDebtOpen] = useState(false);
  const [selectedInvoiceForPay, setSelectedInvoiceForPay] = useState<PurchaseInvoice | null>(null);

  // Filters & Searches
  const [invoiceSearch, setInvoiceSearch] = useState('');
  const [invoiceStatusFilter, setInvoiceStatusFilter] = useState<'ALL' | 'UNPAID' | 'PARTIAL' | 'PAID'>('ALL');
  const [supplierSearch, setSupplierSearch] = useState('');
  const [poProductSearch, setPoProductSearch] = useState('');
  const [viewingInvoice, setViewingInvoice] = useState<PurchaseInvoice | null>(null);

  // New Supplier Form
  const [suppName, setSuppName] = useState('');
  const [suppCode, setSuppCode] = useState('');
  const [suppPhone, setSuppPhone] = useState('');
  const [suppContact, setSuppContact] = useState('');
  const [suppAddress, setSuppAddress] = useState('');

  // New Invoice Form
  const [invSupplierId, setInvSupplierId] = useState('');
  const [invRefNumber, setInvRefNumber] = useState('');
  const [invDueDate, setInvDueDate] = useState('');
  const [invPaidAmount, setInvPaidAmount] = useState('0');
  const [invPaymentMethod, setInvPaymentMethod] = useState('Kas Toko');
  const [invNotes, setInvNotes] = useState('');
  const [invItems, setInvItems] = useState<Array<{
    productId: string;
    productName: string;
    sku: string;
    quantity: number;
    unitCost: number;
    batchNumber?: string;
    expiredDate?: string;
  }>>([]);

  // Pay Debt Form
  const [payAmount, setPayAmount] = useState('');
  const [payMethod, setPayMethod] = useState('Kas Toko');
  const [payNotes, setPayNotes] = useState('');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setIsLoading(true);
      const [invRes, suppRes, prodRes] = await Promise.all([
        fetch('/api/v1/purchases'),
        fetch('/api/v1/suppliers'),
        fetch('/api/v1/products')
      ]);

      if (invRes.ok) setInvoices(await invRes.json());
      if (suppRes.ok) setSuppliers(await suppRes.json());
      if (prodRes.ok) setProducts(await prodRes.json());
    } catch {
      useToastStore.getState().showToast('Gagal memuat data pembelian.', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateSupplier = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!suppName.trim()) return;

    try {
      const res = await fetch('/api/v1/suppliers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: suppName.trim(),
          code: suppCode.trim() || `SUP-${Date.now().toString().slice(-4)}`,
          phone: suppPhone.trim(),
          contactPerson: suppContact.trim(),
          address: suppAddress.trim()
        })
      });

      if (res.ok) {
        useToastStore.getState().showToast('Supplier baru berhasil didaftarkan!', 'success');
        setIsAddSupplierOpen(false);
        setSuppName('');
        setSuppCode('');
        setSuppPhone('');
        setSuppContact('');
        setSuppAddress('');
        fetchData();
      }
    } catch {
      useToastStore.getState().showToast('Gagal menambahkan supplier.', 'error');
    }
  };

  const handleAddItemToInvoice = (product: Product) => {
    const existing = invItems.find(i => i.productId === product.id);
    if (existing) {
      setInvItems(invItems.map(i => i.productId === product.id ? { ...i, quantity: i.quantity + 1 } : i));
    } else {
      setInvItems([
        ...invItems,
        {
          productId: product.id,
          productName: product.name,
          sku: product.sku,
          quantity: 1,
          unitCost: product.buyPrice,
          batchNumber: `BATCH-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}`,
          expiredDate: new Date(Date.now() + 180 * 24 * 3600 * 1000).toISOString().slice(0, 10)
        }
      ]);
    }
  };

  const calculateInvoiceTotal = () => {
    return invItems.reduce((acc, i) => acc + (i.quantity * i.unitCost), 0);
  };

  const handleCreateInvoice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (invItems.length === 0) {
      useToastStore.getState().showToast('Pilih minimal 1 barang belanja!', 'warning');
      return;
    }

    const total = calculateInvoiceTotal();
    const paid = parseFloat(invPaidAmount) || 0;

    try {
      const res = await fetch('/api/v1/purchases', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          supplierId: invSupplierId,
          referenceNumber: invRefNumber,
          totalAmount: total,
          paidAmount: paid,
          dueDate: invDueDate ? new Date(invDueDate) : undefined,
          paymentMethod: invPaymentMethod,
          notes: invNotes,
          items: invItems
        })
      });

      if (res.ok) {
        useToastStore.getState().showToast('Faktur pembelian & stok barang berhasil masuk!', 'success');
        setIsAddInvoiceOpen(false);
        setInvItems([]);
        setInvRefNumber('');
        setInvPaidAmount('0');
        setInvNotes('');
        fetchData();
      }
    } catch {
      useToastStore.getState().showToast('Gagal memproses faktur pembelian.', 'error');
    }
  };

  const handlePayDebt = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedInvoiceForPay) return;

    try {
      const res = await fetch(`/api/v1/purchases/${selectedInvoiceForPay.id}/pay`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: parseFloat(payAmount) || 0,
          paymentMethod: payMethod,
          notes: payNotes
        })
      });

      if (res.ok) {
        useToastStore.getState().showToast('Pembayaran hutang supplier berhasil dicatat!', 'success');
        setIsPayDebtOpen(false);
        setSelectedInvoiceForPay(null);
        setPayAmount('');
        fetchData();
      }
    } catch {
      useToastStore.getState().showToast('Gagal memproses pembayaran hutang.', 'error');
    }
  };

  const handleAutoGenerateLowStockPo = async () => {
    try {
      setIsLoading(true);
      const res = await fetch('/api/v1/purchasing/low-stock-suggested-po');
      if (res.ok) {
        const data = await res.json();
        if (!data.items || data.items.length === 0) {
          useToastStore.getState().showToast('Semua produk berada di atas batas minimum stok (Aman)!', 'info');
          return;
        }
        setInvItems(data.items.map((i: any) => ({
          productId: i.productId,
          productName: i.productName,
          sku: i.sku,
          quantity: i.suggestedOrderQuantity,
          unitCost: i.unitCost,
        })));
        setInvNotes('Draf PO Otomatis: Restock Produk di Bawah Batas Minimum');
        setIsAddInvoiceOpen(true);
        useToastStore.getState().showToast(`${data.items.length} produk menipis otomatis dimasukkan ke draf PO!`, 'success');
      }
    } catch {
      useToastStore.getState().showToast('Gagal memuat analisis restock.', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handlePrintPurchaseInvoice = (inv: PurchaseInvoice) => {
    const now = new Date(inv.purchaseDate).toLocaleDateString('id-ID', { dateStyle: 'full' });
    const w = window.open('', '_blank', 'width=800,height=700');
    if (!w) return;
    w.document.write(`<html><head><title>Faktur Pembelian ${inv.invoiceNumber}</title>
      <style>
        body { font-family: Arial, sans-serif; font-size: 11px; padding: 20mm; color: #111; }
        h2 { font-size: 16px; margin: 0 0 4px; text-transform: uppercase; }
        .sub { font-size: 11px; color: #555; margin-bottom: 16px; }
        table { width: 100%; border-collapse: collapse; margin-bottom: 16px; }
        th { background: #f3f4f6; padding: 7px 9px; text-align: left; font-weight: 700; border: 1px solid #e5e7eb; font-size: 11px; }
        td { padding: 7px 9px; border: 1px solid #e5e7eb; font-size: 11px; }
        .total { font-weight: 700; font-size: 13px; }
        .section { font-weight: 700; font-size: 11px; border-bottom: 2px solid #111; padding-bottom: 2px; margin: 14px 0 8px; }
        .footer { font-size: 9px; color: #777; text-align: center; margin-top: 30px; border-top: 1px solid #ddd; padding-top: 8px; }
        @media print { @page { size: A4; margin: 20mm; } }
      </style>
    </head><body>
      <h2>Faktur Penerimaan Barang / Pembelian [PO]</h2>
      <div class="sub">No. Faktur: <strong>${inv.invoiceNumber}</strong> · Ref Distributor: <strong>${inv.referenceNumber || '-'}</strong></div>
      
      <div class="section">Informasi Distributor & Transaksi</div>
      <table>
        <tr><td style="width:25%">Supplier / Distributor</td><td style="width:75%"><strong>${inv.supplierName || 'Umum'}</strong></td></tr>
        <tr><td>Tanggal Faktur</td><td>${now}</td></tr>
        <tr><td>Jatuh Tempo</td><td>${inv.dueDate ? new Date(inv.dueDate).toLocaleDateString('id-ID') : 'Langsung Lunas'}</td></tr>
        <tr><td>Status Pembayaran</td><td><strong>${inv.remainingPayable <= 0 ? 'LUNAS' : inv.paidAmount > 0 ? 'SEBAGIAN' : 'BELUM DIBAYAR'}</strong></td></tr>
      </table>

      <div class="section">Rincian Barang Masuk</div>
      <table>
        <tr><th>#</th><th>Nama Produk / SKU</th><th style="text-align:center">Qty Masuk</th><th style="text-align:right">Harga Beli / HPP</th><th style="text-align:right">Subtotal</th></tr>
        ${(inv.items || []).map((it: any, idx: number) => `
          <tr>
            <td>${idx + 1}</td>
            <td><strong>${it.productName || it.sku}</strong></td>
            <td style="text-align:center">${it.quantity}</td>
            <td style="text-align:right">Rp ${(it.unitCost || 0).toLocaleString('id-ID')}</td>
            <td style="text-align:right">Rp ${(it.quantity * it.unitCost).toLocaleString('id-ID')}</td>
          </tr>
        `).join('')}
        <tr class="total">
          <td colspan="4" style="text-align:right">TOTAL FAKTUR:</td>
          <td style="text-align:right">Rp ${inv.totalAmount.toLocaleString('id-ID')}</td>
        </tr>
        <tr>
          <td colspan="4" style="text-align:right">Telah Dibayar (DP / Kas Toko):</td>
          <td style="text-align:right">Rp ${inv.paidAmount.toLocaleString('id-ID')}</td>
        </tr>
        <tr style="color:${inv.remainingPayable > 0 ? '#dc2626' : '#16a34a'};font-weight:700">
          <td colspan="4" style="text-align:right">Sisa Hutang:</td>
          <td style="text-align:right">Rp ${inv.remainingPayable.toLocaleString('id-ID')}</td>
        </tr>
      </table>

      <div class="section">Penerima Gudang & Penanggung Jawab</div>
      <table>
        <tr>
          <td style="width:50%;text-align:center;padding:12px">
            <div>Diterima oleh Gudang,</div>
            <div style="height:50px"></div>
            <div>(____________________)</div>
          </td>
          <td style="width:50%;text-align:center;padding:12px">
            <div>Bagian Pembelian / Keuangan,</div>
            <div style="height:50px"></div>
            <div>(____________________)</div>
          </td>
        </tr>
      </table>
      <div class="footer">Dicetak otomatis oleh OmniPOS · Dokumen resmi penerimaan stok gudang.</div>
    </body></html>`);
    w.document.close(); w.print();
  };

  const filteredInvoices = invoices.filter(inv => {
    const matchSearch = !invoiceSearch ||
      inv.invoiceNumber.toLowerCase().includes(invoiceSearch.toLowerCase()) ||
      (inv.supplierName || '').toLowerCase().includes(invoiceSearch.toLowerCase()) ||
      (inv.referenceNumber || '').toLowerCase().includes(invoiceSearch.toLowerCase());
    const matchStatus = 
      invoiceStatusFilter === 'ALL' ? true :
      invoiceStatusFilter === 'PAID' ? inv.remainingPayable <= 0 :
      invoiceStatusFilter === 'PARTIAL' ? inv.remainingPayable > 0 && inv.paidAmount > 0 :
      inv.paidAmount === 0;
    return matchSearch && matchStatus;
  });

  const filteredSuppliers = suppliers.filter(s =>
    !supplierSearch ||
    s.name.toLowerCase().includes(supplierSearch.toLowerCase()) ||
    (s.code || '').toLowerCase().includes(supplierSearch.toLowerCase()) ||
    (s.contactPerson || '').toLowerCase().includes(supplierSearch.toLowerCase()) ||
    (s.phone || '').includes(supplierSearch)
  );

  const totalHutangAktif = suppliers.reduce((acc, s) => acc + (s.totalPayable || 0), 0);

  return (
    <div className="flex-1 flex flex-col bg-app overflow-hidden select-none">
      {/* Header */}
      <header className="px-6 py-4 border-b border-border-subtle bg-surface flex items-center justify-between">
        <div>
          <h1 className="text-base font-bold text-text-primary flex items-center gap-2">
            <Truck className="w-5 h-5 text-primary" />
            Pembelian Barang & Hutang Dagang (Supplier)
          </h1>
          <p className="text-xs text-text-secondary mt-0.5">
            Kelola faktur barang masuk dari distributor, jadwal jatuh tempo, dan pelunasan hutang usaha
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleAutoGenerateLowStockPo}
            className="px-3.5 py-2 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-700 dark:text-amber-400 text-xs font-bold flex items-center gap-1.5 transition-all shadow-xs"
          >
            <span>⚡ Draf PO Otomatis (Stok Rendah)</span>
          </button>
          <div className="px-3 py-1.5 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-600 text-xs font-bold">
            Hutang: Rp {totalHutangAktif.toLocaleString('id-ID')}
          </div>
          <button
            onClick={() => {
              setInvItems([]);
              setInvNotes('');
              setIsAddInvoiceOpen(true);
            }}
            className="px-4 py-2 rounded-lg bg-primary hover:bg-primary-hover text-primary-text text-xs font-bold flex items-center gap-1.5 shadow-sm"
          >
            <Plus className="w-4 h-4" />
            <span>Input Faktur [PO]</span>
          </button>
        </div>
      </header>

      {/* Tabs */}
      <div className="px-6 border-b border-border-subtle bg-surface flex gap-6">
        <button
          onClick={() => setActiveTab('invoices')}
          className={`py-3 text-xs font-bold border-b-2 transition-all ${
            activeTab === 'invoices' ? 'border-primary text-primary' : 'border-transparent text-text-secondary hover:text-text-primary'
          }`}
        >
          Riwayat Faktur Pembelian ({invoices.length})
        </button>
        <button
          onClick={() => setActiveTab('payables')}
          className={`py-3 text-xs font-bold border-b-2 transition-all ${
            activeTab === 'payables' ? 'border-primary text-primary' : 'border-transparent text-text-secondary hover:text-text-primary'
          }`}
        >
          Jatuh Tempo & Hutang Usaha ({invoices.filter(i => i.remainingPayable > 0).length})
        </button>
        <button
          onClick={() => setActiveTab('suppliers')}
          className={`py-3 text-xs font-bold border-b-2 transition-all ${
            activeTab === 'suppliers' ? 'border-primary text-primary' : 'border-transparent text-text-secondary hover:text-text-primary'
          }`}
        >
          Daftar Supplier ({suppliers.length})
        </button>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto p-6">
        {activeTab === 'invoices' && (
          <div className="space-y-3">
            <div className="grid grid-cols-1 gap-3">
              {invoices.map((inv) => (
                <div key={inv.id} className="p-4 rounded-xl bg-card border border-border-subtle hover:border-primary/40 transition-all flex items-center justify-between shadow-sm">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-xs text-text-primary font-mono">{inv.invoiceNumber}</span>
                      {inv.referenceNumber && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-subtle text-text-muted font-mono">
                          Ref: {inv.referenceNumber}
                        </span>
                      )}
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                        inv.paymentStatus === 'Paid' || inv.paymentStatus === 2 ? 'bg-status-success/10 text-status-success' :
                        inv.paymentStatus === 'Partial' || inv.paymentStatus === 1 ? 'bg-amber-500/10 text-amber-600' : 'bg-status-danger/10 text-status-danger'
                      }`}>
                        {inv.paymentStatus === 'Paid' || inv.paymentStatus === 2 ? 'LUNAS' :
                         inv.paymentStatus === 'Partial' || inv.paymentStatus === 1 ? 'SEBAGIAN' : 'BELUM LUNAS (TEMPO)'}
                      </span>
                    </div>
                    <p className="text-xs text-text-secondary">
                      Supplier: <strong className="text-text-primary">{inv.supplierName}</strong> | Tanggal: {new Date(inv.purchaseDate).toLocaleDateString('id-ID')}
                    </p>
                    <p className="text-[11px] text-text-muted">
                      Barang ({inv.items?.length || 0} macam): {inv.items?.map(i => `${i.productName} (${i.quantity})`).join(', ') || '-'}
                    </p>
                  </div>

                  <div className="text-right flex items-center gap-4">
                    <div>
                      <p className="text-xs font-bold text-text-primary font-mono tabular-nums">
                        Total: Rp {inv.totalAmount.toLocaleString('id-ID')}
                      </p>
                      {inv.remainingPayable > 0 && (
                        <p className="text-[11px] text-status-danger font-bold font-mono">
                          Sisa Hutang: Rp {inv.remainingPayable.toLocaleString('id-ID')}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => handlePrintPurchaseInvoice(inv)}
                        title="Cetak Faktur Pembelian"
                        className="px-2.5 py-1.5 bg-subtle hover:bg-card-hover border border-border-subtle rounded-lg text-xs font-bold text-text-secondary flex items-center gap-1 transition-all"
                      >
                        <Printer className="w-3.5 h-3.5 text-primary" />
                        <span>Cetak</span>
                      </button>

                      {inv.remainingPayable > 0 && (
                        <button
                          onClick={() => {
                            setSelectedInvoiceForPay(inv);
                            setPayAmount(inv.remainingPayable.toString());
                            setIsPayDebtOpen(true);
                          }}
                          className="px-3 py-1.5 bg-primary hover:bg-primary-hover text-primary-text rounded-lg text-xs font-bold shadow-sm"
                        >
                          Bayar Hutang
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}

              {filteredInvoices.length === 0 && (
                <div className="py-16 text-center text-text-muted space-y-2">
                  <Truck className="w-12 h-12 mx-auto opacity-30" />
                  <p className="text-xs font-bold text-text-primary">Belum Ada Riwayat Pembelian Barang</p>
                  <p className="text-[11px]">Klik "Input Faktur Masuk" di pojok kanan atas untuk mencatat barang dari distributor.</p>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'payables' && (
          <div className="space-y-3">
            {invoices.filter(i => i.remainingPayable > 0).map((inv) => (
              <div key={inv.id} className="p-4 rounded-xl bg-card border border-rose-500/20 flex items-center justify-between shadow-sm">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-xs text-text-primary font-mono">{inv.invoiceNumber}</span>
                    <span className="text-xs font-bold text-text-primary">({inv.supplierName})</span>
                  </div>
                  <p className="text-xs text-text-secondary mt-1">
                    Jatuh Tempo: <strong className="text-status-danger">{inv.dueDate ? new Date(inv.dueDate).toLocaleDateString('id-ID') : 'Belum ditentukan'}</strong>
                  </p>
                </div>

                <div className="flex items-center gap-4 text-right">
                  <div>
                    <p className="text-sm font-extrabold text-status-danger font-mono">
                      Rp {inv.remainingPayable.toLocaleString('id-ID')}
                    </p>
                    <p className="text-[10px] text-text-muted">Dari Total: Rp {inv.totalAmount.toLocaleString('id-ID')}</p>
                  </div>
                  <button
                    onClick={() => {
                      setSelectedInvoiceForPay(inv);
                      setPayAmount(inv.remainingPayable.toString());
                      setIsPayDebtOpen(true);
                    }}
                    className="px-3 py-2 bg-primary hover:bg-primary-hover text-primary-text rounded-lg text-xs font-bold shadow-sm"
                  >
                    Bayar Sekarang
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'suppliers' && (
          <div className="space-y-3">
            <div className="flex justify-between items-center mb-2 gap-3 flex-wrap">
              <span className="text-xs font-semibold text-text-secondary">Daftar Distributor & Supplier Toko ({suppliers.length})</span>
              <div className="flex items-center gap-2 ml-auto">
                <div className="relative w-52">
                  <Search className="w-3.5 h-3.5 text-text-muted absolute left-2.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={supplierSearch}
                    onChange={e => setSupplierSearch(e.target.value)}
                    placeholder="Cari nama, kontak, HP..."
                    className="w-full pl-7 pr-3 py-1.5 bg-card border border-border-subtle rounded-lg text-xs text-text-primary focus:outline-none focus:border-primary"
                  />
                </div>
                <button
                  onClick={() => setIsAddSupplierOpen(true)}
                  className="px-3 py-1.5 bg-primary hover:bg-primary-hover text-primary-text rounded-lg text-xs font-bold flex items-center gap-1 shadow-sm"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Tambah Supplier</span>
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {filteredSuppliers.map((supp) => (
                <div key={supp.id} className="p-4 rounded-xl bg-card border border-border-subtle space-y-2 shadow-sm">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="text-xs font-bold text-text-primary">{supp.name}</h3>
                      <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-subtle text-text-muted">{supp.code}</span>
                    </div>
                    <span className="text-xs font-mono font-bold text-rose-600">
                      Hutang: Rp {supp.totalPayable.toLocaleString('id-ID')}
                    </span>
                  </div>
                  <p className="text-xs text-text-secondary">
                    Kontak: {supp.contactPerson || '-'} | Telepon: {supp.phone || '-'}
                  </p>
                  <p className="text-[11px] text-text-muted">{supp.address || '-'}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Modal: Add Supplier */}
      {isAddSupplierOpen && (
        <div className="fixed inset-0 z-50 bg-black/75 flex items-center justify-center p-4">
          <form onSubmit={handleCreateSupplier} className="bg-surface border border-border-strong w-full max-w-md rounded-2xl p-5 space-y-4 shadow-2xl">
            <h2 className="text-base font-bold text-text-primary">Tambah Supplier Baru</h2>
            <div>
              <label className="block text-xs font-semibold text-text-secondary mb-1">Nama Perusahaan / Supplier *</label>
              <input
                type="text"
                required
                value={suppName}
                onChange={e => setSuppName(e.target.value)}
                placeholder="Contoh: PT Indomarco Adi Prima"
                className="w-full px-3 py-2 bg-subtle border border-border-strong rounded-lg text-xs text-text-primary focus:outline-none focus:border-primary"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-text-secondary mb-1">Nama Sales / Kontak Person</label>
              <input
                type="text"
                value={suppContact}
                onChange={e => setSuppContact(e.target.value)}
                placeholder="Pak Hendra"
                className="w-full px-3 py-2 bg-subtle border border-border-strong rounded-lg text-xs text-text-primary focus:outline-none focus:border-primary"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-text-secondary mb-1">No. WhatsApp / Telepon</label>
              <input
                type="text"
                value={suppPhone}
                onChange={e => setSuppPhone(e.target.value)}
                placeholder="021-88991122"
                className="w-full px-3 py-2 bg-subtle border border-border-strong rounded-lg text-xs text-text-primary focus:outline-none focus:border-primary"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-text-secondary mb-1">Alamat Kantor / Gudang</label>
              <input
                type="text"
                value={suppAddress}
                onChange={e => setSuppAddress(e.target.value)}
                placeholder="Jl. Pulo Gadung No. 10"
                className="w-full px-3 py-2 bg-subtle border border-border-strong rounded-lg text-xs text-text-primary focus:outline-none focus:border-primary"
              />
            </div>

            <div className="flex gap-2 pt-2 border-t border-border-subtle">
              <button
                type="button"
                onClick={() => setIsAddSupplierOpen(false)}
                className="flex-1 py-2 bg-subtle hover:bg-card-hover border border-border-subtle rounded-lg text-xs font-semibold"
              >
                Batal
              </button>
              <button
                type="submit"
                className="flex-1 py-2 bg-primary hover:bg-primary-hover text-primary-text rounded-lg text-xs font-bold shadow-sm"
              >
                Simpan Supplier
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Modal: Input Purchase Invoice */}
      {isAddInvoiceOpen && (
        <div className="fixed inset-0 z-50 bg-black/75 flex items-center justify-center p-4">
          <form onSubmit={handleCreateInvoice} className="bg-surface border border-border-strong w-full max-w-2xl rounded-2xl p-5 space-y-4 shadow-2xl max-h-[90vh] flex flex-col">
            <h2 className="text-base font-bold text-text-primary">Input Faktur Pembelian Barang [PO]</h2>
            
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <label className="block font-semibold text-text-secondary mb-1">Pilih Supplier *</label>
                <select
                  value={invSupplierId}
                  onChange={e => setInvSupplierId(e.target.value)}
                  className="w-full px-3 py-2 bg-subtle border border-border-strong rounded-lg text-xs text-text-primary focus:outline-none focus:border-primary"
                >
                  <option value="">-- Pilih Supplier --</option>
                  {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block font-semibold text-text-secondary mb-1">No. Faktur Distributor (Fisik)</label>
                <input
                  type="text"
                  value={invRefNumber}
                  onChange={e => setInvRefNumber(e.target.value)}
                  placeholder="INV-WNG-2026/08/001"
                  className="w-full px-3 py-2 bg-subtle border border-border-strong rounded-lg text-xs font-mono text-text-primary focus:outline-none focus:border-primary"
                />
              </div>
            </div>

            {/* Product Picker to Add Items with Search */}
            <div className="p-3 bg-subtle rounded-xl border border-border-subtle space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-xs font-bold text-text-primary">Pilih Barang Masuk:</p>
                <div className="relative w-56">
                  <Search className="w-3.5 h-3.5 text-text-muted absolute left-2.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={poProductSearch}
                    onChange={e => setPoProductSearch(e.target.value)}
                    placeholder="Filter produk..."
                    className="w-full pl-7 pr-2 py-1 bg-card border border-border-strong rounded text-[11px] text-text-primary focus:outline-none focus:border-primary"
                  />
                </div>
              </div>
              <div className="flex gap-1.5 max-h-32 overflow-y-auto flex-wrap p-1">
                {products
                  .filter(p => !poProductSearch || p.name.toLowerCase().includes(poProductSearch.toLowerCase()) || p.sku.toLowerCase().includes(poProductSearch.toLowerCase()))
                  .map(p => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => handleAddItemToInvoice(p)}
                      className="px-2.5 py-1 rounded-lg bg-card hover:bg-primary hover:text-primary-text border border-border-subtle text-[11px] font-semibold transition-all flex items-center gap-1 shadow-xs"
                    >
                      <Plus className="w-3 h-3" />
                      <span>{p.name}</span>
                      <span className="font-mono text-[10px] text-text-muted">({p.unit})</span>
                    </button>
                  ))}
              </div>
            </div>

            {/* Selected Items Table */}
            <div className="flex-1 overflow-y-auto border border-border-subtle rounded-xl p-2 space-y-2 max-h-48">
              {invItems.map((item, idx) => (
                <div key={idx} className="p-2 rounded-lg bg-card border border-border-subtle flex items-center justify-between text-xs gap-2">
                  <div className="flex-1 truncate">
                    <p className="font-bold truncate">{item.productName}</p>
                    <p className="text-[10px] text-text-muted font-mono">{item.sku}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      value={item.quantity}
                      onChange={e => {
                        const val = parseFloat(e.target.value) || 1;
                        setInvItems(invItems.map((it, i) => i === idx ? { ...it, quantity: val } : it));
                      }}
                      className="w-16 px-1.5 py-1 bg-subtle border border-border-strong rounded font-mono text-center"
                    />
                    <input
                      type="number"
                      value={item.unitCost}
                      onChange={e => {
                        const val = parseFloat(e.target.value) || 0;
                        setInvItems(invItems.map((it, i) => i === idx ? { ...it, unitCost: val } : it));
                      }}
                      className="w-24 px-1.5 py-1 bg-subtle border border-border-strong rounded font-mono text-right"
                    />
                    <span className="font-bold font-mono w-24 text-right">
                      Rp {(item.quantity * item.unitCost).toLocaleString('id-ID')}
                    </span>
                    <button
                      type="button"
                      onClick={() => setInvItems(invItems.filter((_, i) => i !== idx))}
                      className="text-status-danger p-1"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Financial Summary & Payment Terms */}
            <div className="grid grid-cols-3 gap-3 text-xs pt-2 border-t border-border-subtle">
              <div>
                <span className="block text-text-muted">Total Pembelian:</span>
                <span className="text-base font-bold text-primary font-mono">Rp {calculateInvoiceTotal().toLocaleString('id-ID')}</span>
              </div>
              <div>
                <label className="block text-text-secondary font-semibold">Dibayar Sekarang (DP / Lunas):</label>
                <input
                  type="number"
                  value={invPaidAmount}
                  onChange={e => setInvPaidAmount(e.target.value)}
                  className="w-full px-2 py-1 bg-subtle border border-border-strong rounded font-mono font-bold"
                />
              </div>
              <div>
                <label className="block text-text-secondary font-semibold">Jatuh Tempo (Jika Tempo):</label>
                <input
                  type="date"
                  value={invDueDate}
                  onChange={e => setInvDueDate(e.target.value)}
                  className="w-full px-2 py-1 bg-subtle border border-border-strong rounded"
                />
              </div>
            </div>

            <div className="flex gap-2 pt-2 border-t border-border-subtle">
              <button
                type="button"
                onClick={() => setIsAddInvoiceOpen(false)}
                className="flex-1 py-2.5 bg-subtle hover:bg-card-hover border border-border-subtle rounded-lg text-xs font-semibold"
              >
                Batal
              </button>
              <button
                type="submit"
                className="flex-1 py-2.5 bg-primary hover:bg-primary-hover text-primary-text rounded-lg text-xs font-bold shadow-sm"
              >
                Simpan & Tambah Stok Masuk
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Modal: Pay Debt */}
      {isPayDebtOpen && selectedInvoiceForPay && (
        <div className="fixed inset-0 z-50 bg-black/75 flex items-center justify-center p-4">
          <form onSubmit={handlePayDebt} className="bg-surface border border-border-strong w-full max-w-md rounded-2xl p-5 space-y-4 shadow-2xl">
            <h2 className="text-base font-bold text-text-primary">Bayar Hutang Pembelian</h2>
            <div className="p-3 bg-subtle rounded-xl text-xs space-y-1">
              <p>Faktur: <strong className="font-mono">{selectedInvoiceForPay.invoiceNumber}</strong></p>
              <p>Supplier: <strong>{selectedInvoiceForPay.supplierName}</strong></p>
              <p className="text-status-danger font-bold">
                Sisa Hutang: Rp {selectedInvoiceForPay.remainingPayable.toLocaleString('id-ID')}
              </p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-text-secondary mb-1">Nominal yang Dibayarkan (Rp) *</label>
              <input
                type="number"
                required
                value={payAmount}
                onChange={e => setPayAmount(e.target.value)}
                className="w-full text-lg font-bold font-mono px-3 py-2 bg-subtle border border-border-strong rounded-lg text-text-primary focus:outline-none focus:border-primary"
                autoFocus
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-text-secondary mb-1">Metode Pembayaran</label>
              <select
                value={payMethod}
                onChange={e => setPayMethod(e.target.value)}
                className="w-full px-3 py-2 bg-subtle border border-border-strong rounded-lg text-xs text-text-primary focus:outline-none focus:border-primary"
              >
                <option value="Kas Toko">Kas Toko (Laci Kasir)</option>
                <option value="Transfer Bank BCA">Transfer Bank BCA</option>
                <option value="Transfer Bank Mandiri">Transfer Bank Mandiri</option>
              </select>
            </div>

            <div className="flex gap-2 pt-2 border-t border-border-subtle">
              <button
                type="button"
                onClick={() => setIsPayDebtOpen(false)}
                className="flex-1 py-2 bg-subtle hover:bg-card-hover border border-border-subtle rounded-lg text-xs font-semibold"
              >
                Batal
              </button>
              <button
                type="submit"
                className="flex-1 py-2 bg-primary hover:bg-primary-hover text-primary-text rounded-lg text-xs font-bold shadow-sm"
              >
                Konfirmasi Bayar
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
export default PurchasingPage;
