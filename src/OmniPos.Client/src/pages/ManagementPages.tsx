import React, { useState, useEffect } from 'react';
import { 
  Boxes, 
  Users, 
  BarChart3, 
  HardDriveDownload, 
  Settings, 
  Plus, 
  Search, 
  Cloud, 
  ShieldCheck, 
  RefreshCw, 
  CheckCircle2,
  FileSpreadsheet,
  Printer,
  Palette,
  AlertCircle,
  UserCheck,
  KeyRound,
  Lock,
  UserX,
  Edit3,
  ShieldAlert,
  Upload,
  Download,
  Package,
  Layers,
  Trash2,
  TrendingUp,
  AlertTriangle,
  Flame,
  Save,
  DollarSign,
  Calendar
} from 'lucide-react';
import { BackupHistory, Customer, Product, ProductUnitConversion, SalesSummary, User, UserRole } from '../types';
import { useThemeStore } from '../store/useShiftAndThemeStores';
import { useBusinessModeStore } from '../store/useBusinessModeStore';
import { useToastStore } from '../store/useToastStore';
import { useAuthStore } from '../store/useAuthStore';

// ==========================================
// 1. INVENTORY & STOCK PAGE (WITH CSV & UNIT CONVERSION)
// ==========================================
export const InventoryPage: React.FC = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Add / Edit Product Modal State
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [formName, setFormName] = useState('');
  const [formSku, setFormSku] = useState('');
  const [formBarcode, setFormBarcode] = useState('');
  const [formCategoryId, setFormCategoryId] = useState('');
  const [formBuyPrice, setFormBuyPrice] = useState('0');
  const [formSellPrice, setFormSellPrice] = useState('0');
  const [formWholesalePrice, setFormWholesalePrice] = useState('');
  const [formWholesaleMinQty, setFormWholesaleMinQty] = useState('');
  const [formCurrentStock, setFormCurrentStock] = useState('0');
  const [formMinStockAlert, setFormMinStockAlert] = useState('5');
  const [formUnit, setFormUnit] = useState('PCS');
  const [isSavingProduct, setIsSavingProduct] = useState(false);

  // CSV Import Modal
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [csvRawText, setCsvRawText] = useState('');
  const [isImporting, setIsImporting] = useState(false);

  // Multi-Unit Conversion Modal
  const [selectedProductForUnits, setSelectedProductForUnits] = useState<Product | null>(null);
  const [unitConversions, setUnitConversions] = useState<ProductUnitConversion[]>([]);
  const [newUnitName, setNewUnitName] = useState('DUS');
  const [newConversionFactor, setNewConversionFactor] = useState(40);
  const [newUnitBarcode, setNewUnitBarcode] = useState('');
  const [newUnitSellPrice, setNewUnitSellPrice] = useState(0);
  // Stock Ledger (Mutations) Modal
  const [selectedProductForLedger, setSelectedProductForLedger] = useState<Product | null>(null);
  const [productMutations, setProductMutations] = useState<any[]>([]);
  const [isLoadingMutations, setIsLoadingMutations] = useState(false);

  const openStockLedger = async (p: Product) => {
    setSelectedProductForLedger(p);
    setIsLoadingMutations(true);
    try {
      const res = await fetch(`/api/v1/inventory/products/${p.id}/mutations`);
      if (res.ok) {
        const data = await res.json();
        setProductMutations(data.mutations || []);
      }
    } catch {}
    setIsLoadingMutations(false);
  };

  const fetchProducts = () => {
    setIsLoading(true);
    fetch('/api/v1/products')
      .then((r) => r.json())
      .then((d) => setProducts(d))
      .catch(() => {})
      .finally(() => setIsLoading(false));
  };

  const fetchCategories = () => {
    fetch('/api/v1/categories')
      .then(r => r.json())
      .then(d => setCategories(d))
      .catch(() => {});
  };

  useEffect(() => {
    fetchProducts();
    fetchCategories();
  }, []);

  const handleOpenAddProduct = () => {
    setEditingProduct(null);
    setFormName('');
    setFormSku(`PRD-${Date.now().toString().slice(-6)}`);
    setFormBarcode('');
    setFormCategoryId(categories[0]?.id || '');
    setFormBuyPrice('0');
    setFormSellPrice('0');
    setFormWholesalePrice('');
    setFormWholesaleMinQty('');
    setFormCurrentStock('0');
    setFormMinStockAlert('5');
    setFormUnit('PCS');
    setIsProductModalOpen(true);
  };

  const handleOpenEditProduct = (p: Product) => {
    setEditingProduct(p);
    setFormName(p.name);
    setFormSku(p.sku);
    setFormBarcode(p.barcode || '');
    setFormCategoryId(p.categoryId || '');
    setFormBuyPrice(p.buyPrice.toString());
    setFormSellPrice(p.sellPrice.toString());
    setFormWholesalePrice(p.wholesalePrice ? p.wholesalePrice.toString() : '');
    setFormWholesaleMinQty(p.wholesaleMinQty ? p.wholesaleMinQty.toString() : '');
    setFormCurrentStock(p.currentStock.toString());
    setFormMinStockAlert(p.minStockAlert.toString());
    setFormUnit(p.unit || 'PCS');
    setIsProductModalOpen(true);
  };

  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) {
      useToastStore.getState().showToast('Nama produk wajib diisi!', 'warning');
      return;
    }

    setIsSavingProduct(true);
    const payload = {
      name: formName.trim(),
      sku: formSku.trim(),
      barcode: formBarcode.trim() || formSku.trim(),
      categoryId: formCategoryId || undefined,
      buyPrice: parseFloat(formBuyPrice) || 0,
      sellPrice: parseFloat(formSellPrice) || 0,
      wholesalePrice: formWholesalePrice ? parseFloat(formWholesalePrice) : undefined,
      wholesaleMinQty: formWholesaleMinQty ? parseFloat(formWholesaleMinQty) : undefined,
      currentStock: parseFloat(formCurrentStock) || 0,
      minStockAlert: parseFloat(formMinStockAlert) || 5,
      unit: formUnit.trim().toUpperCase() || 'PCS'
    };

    try {
      const url = editingProduct ? `/api/v1/products/${editingProduct.id}` : '/api/v1/products';
      const method = editingProduct ? 'PUT' : 'POST';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        useToastStore.getState().showToast(editingProduct ? 'Produk berhasil diperbarui!' : 'Produk baru berhasil ditambahkan!', 'success');
        setIsProductModalOpen(false);
        fetchProducts();
      } else {
        useToastStore.getState().showToast('Gagal menyimpan produk.', 'error');
      }
    } catch {
      useToastStore.getState().showToast('Terjadi kesalahan jaringan.', 'error');
    } finally {
      setIsSavingProduct(false);
    }
  };

  const handleDeleteProduct = async (p: Product) => {
    if (!window.confirm(`Yakin ingin menghapus produk "${p.name}"?`)) return;

    try {
      const res = await fetch(`/api/v1/products/${p.id}`, { method: 'DELETE' });
      if (res.ok) {
        useToastStore.getState().showToast(`Produk "${p.name}" berhasil dihapus.`, 'info');
        fetchProducts();
      } else {
        useToastStore.getState().showToast('Gagal menghapus produk.', 'error');
      }
    } catch {
      useToastStore.getState().showToast('Gagal menghapus produk.', 'error');
    }
  };

  const handleDownloadTemplate = () => {
    window.open('/api/v1/products/template-csv', '_blank');
    useToastStore.getState().showToast('Mengunduh template CSV produk...', 'info');
  };

  const handleExportCsv = () => {
    window.open('/api/v1/products/export-csv', '_blank');
    useToastStore.getState().showToast('Mengunduh katalog produk CSV...', 'info');
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      setCsvRawText(event.target?.result as string || '');
    };
    reader.readAsText(file);
  };

  const handleExecuteImport = async () => {
    if (!csvRawText.trim()) {
      useToastStore.getState().showToast('Konten CSV masih kosong.', 'warning');
      return;
    }

    try {
      setIsImporting(true);
      const res = await fetch('/api/v1/products/import-csv', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ csvContent: csvRawText })
      });

      const data = await res.json();
      if (res.ok) {
        useToastStore.getState().showToast(
          `Impor Berhasil: ${data.importedCount} produk baru ditambahkan, ${data.updatedCount} produk diperbarui!`,
          'success'
        );
        setIsImportModalOpen(false);
        setCsvRawText('');
        fetchProducts();
      } else {
        useToastStore.getState().showToast(data.message || 'Gagal memproses impor CSV.', 'error');
      }
    } catch {
      useToastStore.getState().showToast('Gagal menghubungi server.', 'error');
    } finally {
      setIsImporting(false);
    }
  };

  // Open Unit Conversions Modal
  const openUnitConversions = async (p: Product) => {
    setSelectedProductForUnits(p);
    setNewUnitName('DUS');
    setNewConversionFactor(40);
    setNewUnitBarcode(p.barcode ? `${p.barcode}-DUS` : '');
    setNewUnitSellPrice(p.sellPrice * 38); // Sample default wholesale box price

    try {
      const res = await fetch(`/api/v1/products/${p.id}/unit-conversions`);
      if (res.ok) {
        const list = await res.json();
        setUnitConversions(list);
      }
    } catch {}
  };

  const handleAddUnitConversion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProductForUnits) return;

    try {
      const res = await fetch(`/api/v1/products/${selectedProductForUnits.id}/unit-conversions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          unitName: newUnitName.trim().toUpperCase(),
          conversionFactor: newConversionFactor,
          barcode: newUnitBarcode.trim() || undefined,
          sellPrice: newUnitSellPrice
        })
      });

      if (res.ok) {
        const created = await res.json();
        setUnitConversions([...unitConversions, created]);
        useToastStore.getState().showToast(`Satuan ${newUnitName} berhasil disimpan!`, 'success');
        setNewUnitName('LUSIN');
        setNewConversionFactor(12);
        setNewUnitBarcode('');
        setNewUnitSellPrice(selectedProductForUnits.sellPrice * 11.5);
      }
    } catch {
      useToastStore.getState().showToast('Gagal menyimpan satuan kemasan.', 'error');
    }
  };

  const handleDeleteUnitConversion = async (id: string) => {
    try {
      const res = await fetch(`/api/v1/products/unit-conversions/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setUnitConversions(unitConversions.filter(u => u.id !== id));
        useToastStore.getState().showToast('Satuan kemasan dihapus.', 'info');
      }
    } catch {}
  };

  const filtered = products.filter((p) =>
    p.name.toLowerCase().includes(search.toLowerCase()) || 
    p.sku.toLowerCase().includes(search.toLowerCase()) ||
    (p.barcode && p.barcode.includes(search))
  );

  return (
    <div className="flex-1 flex flex-col bg-app overflow-hidden select-none">
      <div className="p-4 bg-surface border-b border-border-subtle flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center font-bold">
            <Boxes className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-text-primary">Manajemen Katalog & Inventori Stok</h2>
            <p className="text-xs text-text-secondary">Kelola produk, barcode satuan/dus, HPP, impor CSV masal</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="relative w-56">
            <Search className="w-4 h-4 text-text-muted absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari barcode, SKU, nama..."
              className="w-full pl-9 pr-3 py-1.5 bg-card border border-border-strong rounded-md text-xs text-text-primary focus:outline-none focus:border-primary"
            />
          </div>

          <button
            onClick={handleOpenAddProduct}
            className="px-3 py-1.5 bg-primary hover:bg-primary-hover text-primary-text rounded-md text-xs font-bold flex items-center gap-1.5 shadow-sm"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Tambah Produk</span>
          </button>

          <button 
            onClick={handleDownloadTemplate}
            className="px-2.5 py-1.5 bg-card hover:bg-card-hover border border-border-subtle rounded-md text-xs font-semibold text-text-secondary flex items-center gap-1.5"
            title="Download Format Excel/CSV untuk Isi Data Produk"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Template</span>
          </button>

          <button 
            onClick={() => setIsImportModalOpen(true)}
            className="px-2.5 py-1.5 bg-emerald-600/10 hover:bg-emerald-600/20 text-emerald-600 border border-emerald-600/30 rounded-md text-xs font-bold flex items-center gap-1.5"
            title="Upload ratusan produk sekaligus"
          >
            <Upload className="w-3.5 h-3.5" />
            <span>Impor CSV</span>
          </button>

          <button 
            onClick={handleExportCsv}
            className="px-2.5 py-1.5 bg-card hover:bg-card-hover border border-border-subtle rounded-md text-xs font-semibold text-text-secondary flex items-center gap-1.5"
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            <span>Ekspor</span>
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        <div className="bg-card border border-border-subtle rounded-xl overflow-hidden shadow-sm">
          <table className="w-full text-left text-xs">
            <thead className="bg-subtle text-text-secondary font-semibold border-b border-border-subtle">
              <tr>
                <th className="p-3">SKU & Barcode</th>
                <th className="p-3">Nama Produk</th>
                <th className="p-3">Kategori</th>
                <th className="p-3">HPP (Beli)</th>
                <th className="p-3">Harga Jual</th>
                <th className="p-3">Stok Saat Ini</th>
                <th className="p-3">Kemasan Multi-Satuan</th>
                <th className="p-3 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-subtle/50">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-12 text-center text-text-muted space-y-2">
                    <Boxes className="w-8 h-8 mx-auto opacity-25" />
                    <p className="text-xs font-bold text-text-primary">Tidak ada produk yang cocok</p>
                    <p className="text-[11px]">Coba ubah kata kunci pencarian atau klik "+ Tambah Produk" untuk membuat baru.</p>
                  </td>
                </tr>
              ) : (
              filtered.map((p) => (
                <tr key={p.id} className="hover:bg-card-hover/50 transition-colors">
                  <td className="p-3 font-mono font-bold text-text-primary">
                    <div>{p.sku}</div>
                    {p.barcode && <span className="text-[10px] text-text-muted font-normal">{p.barcode}</span>}
                  </td>
                  <td className="p-3 font-semibold text-text-primary">{p.name}</td>
                  <td className="p-3 text-text-secondary">{p.category?.name || 'Umum'}</td>
                  <td className="p-3 font-mono tabular-nums">Rp {p.buyPrice.toLocaleString('id-ID')}</td>
                  <td className="p-3 font-mono font-bold text-primary tabular-nums">Rp {p.sellPrice.toLocaleString('id-ID')}</td>
                  <td className="p-3 font-mono font-bold tabular-nums">
                    <span className={p.currentStock <= p.minStockAlert ? 'text-status-warning' : 'text-text-primary'}>
                      {p.currentStock} {p.unit}
                    </span>
                  </td>
                  <td className="p-3">
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => openUnitConversions(p)}
                        className="px-2 py-1 rounded bg-subtle hover:bg-card-hover border border-border-subtle text-[11px] font-semibold text-text-secondary flex items-center gap-1"
                      >
                        <Package className="w-3 h-3 text-primary" />
                        <span>Dus/Lusin</span>
                      </button>
                      <button
                        onClick={() => openStockLedger(p)}
                        className="px-2 py-1 rounded bg-subtle hover:bg-card-hover border border-border-subtle text-[11px] font-semibold text-text-primary flex items-center gap-1"
                      >
                        <Layers className="w-3 h-3 text-status-info" />
                        <span>Kartu Stok</span>
                      </button>
                    </div>
                  </td>
                  <td className="p-3 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        p.currentStock <= 0 
                          ? 'bg-status-danger/10 text-status-danger' 
                          : p.currentStock <= p.minStockAlert 
                          ? 'bg-status-warning/10 text-status-warning' 
                          : 'bg-status-success/10 text-status-success'
                      }`}>
                        {p.currentStock <= 0 ? 'Habis' : p.currentStock <= p.minStockAlert ? 'Menipis' : 'Aman'}
                      </span>
                      <button
                        onClick={() => handleOpenEditProduct(p)}
                        title="Edit Produk"
                        className="p-1 rounded hover:bg-primary/10 text-text-secondary hover:text-primary transition-colors"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDeleteProduct(p)}
                        title="Hapus Produk"
                        className="p-1 rounded hover:bg-rose-500/10 text-text-secondary hover:text-rose-600 transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              )))}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL: ADD / EDIT PRODUCT */}
      {isProductModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-xl bg-card border border-border-strong rounded-2xl shadow-2xl overflow-hidden">
            <div className="p-4 bg-surface border-b border-border-subtle flex items-center justify-between">
              <h3 className="font-bold text-sm text-text-primary flex items-center gap-2">
                <Boxes className="w-4 h-4 text-primary" />
                {editingProduct ? 'Edit Informasi Produk' : 'Tambah Produk Baru ke Katalog'}
              </h3>
              <button onClick={() => setIsProductModalOpen(false)} className="text-text-muted hover:text-text-primary font-bold">
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveProduct} className="p-5 space-y-4 text-xs max-h-[80vh] overflow-y-auto">
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <label className="block font-semibold text-text-secondary mb-1">Nama Produk *</label>
                  <input
                    type="text"
                    required
                    value={formName}
                    onChange={e => setFormName(e.target.value)}
                    placeholder="Contoh: Samsung Galaxy A55 5G 8/256GB"
                    className="w-full px-3 py-2 bg-subtle border border-border-strong rounded-lg text-xs text-text-primary focus:outline-none focus:border-primary font-semibold"
                    autoFocus
                  />
                </div>

                <div>
                  <label className="block font-semibold text-text-secondary mb-1">Kode SKU *</label>
                  <input
                    type="text"
                    required
                    value={formSku}
                    onChange={e => setFormSku(e.target.value)}
                    placeholder="PRD-001"
                    className="w-full px-3 py-2 bg-subtle border border-border-strong rounded-lg text-xs font-mono text-text-primary focus:outline-none focus:border-primary"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-text-secondary mb-1">Barcode (EAN-13 / PLU)</label>
                  <input
                    type="text"
                    value={formBarcode}
                    onChange={e => setFormBarcode(e.target.value)}
                    placeholder="899238810101"
                    className="w-full px-3 py-2 bg-subtle border border-border-strong rounded-lg text-xs font-mono text-text-primary focus:outline-none focus:border-primary"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-text-secondary mb-1">Kategori Produk</label>
                  <select
                    value={formCategoryId}
                    onChange={e => setFormCategoryId(e.target.value)}
                    className="w-full px-3 py-2 bg-subtle border border-border-strong rounded-lg text-xs text-text-primary focus:outline-none focus:border-primary"
                  >
                    <option value="">-- Pilih Kategori --</option>
                    {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-text-secondary mb-1">Satuan Dasar</label>
                  <input
                    type="text"
                    value={formUnit}
                    onChange={e => setFormUnit(e.target.value)}
                    placeholder="PCS, UNIT, BOTOL, BOX"
                    className="w-full px-3 py-2 bg-subtle border border-border-strong rounded-lg text-xs font-mono text-text-primary focus:outline-none focus:border-primary uppercase"
                  />
                </div>
              </div>

              {/* Pricing Section */}
              <div className="p-3 bg-subtle rounded-xl border border-border-subtle space-y-3">
                <p className="font-bold text-text-primary flex items-center gap-1.5">
                  <DollarSign className="w-3.5 h-3.5 text-primary" /> Pengaturan Harga
                </p>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-text-secondary mb-1">Harga Beli / HPP (Rp):</label>
                    <input
                      type="number"
                      value={formBuyPrice}
                      onChange={e => setFormBuyPrice(e.target.value)}
                      className="w-full px-3 py-2 bg-card border border-border-strong rounded-lg font-mono font-bold text-text-primary focus:outline-none focus:border-primary"
                    />
                  </div>
                  <div>
                    <label className="block text-text-secondary mb-1">Harga Jual Kasir (Rp) *:</label>
                    <input
                      type="number"
                      required
                      value={formSellPrice}
                      onChange={e => setFormSellPrice(e.target.value)}
                      className="w-full px-3 py-2 bg-card border border-primary/40 rounded-lg font-mono font-bold text-primary focus:outline-none focus:border-primary text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-text-secondary mb-1">Harga Grosir (Opsional):</label>
                    <input
                      type="number"
                      value={formWholesalePrice}
                      onChange={e => setFormWholesalePrice(e.target.value)}
                      placeholder="Contoh: 48000"
                      className="w-full px-3 py-2 bg-card border border-border-strong rounded-lg font-mono text-emerald-600 font-bold focus:outline-none focus:border-primary"
                    />
                  </div>
                  <div>
                    <label className="block text-text-secondary mb-1">Min. Qty Grosir:</label>
                    <input
                      type="number"
                      value={formWholesaleMinQty}
                      onChange={e => setFormWholesaleMinQty(e.target.value)}
                      placeholder="Contoh: 3"
                      className="w-full px-3 py-2 bg-card border border-border-strong rounded-lg font-mono text-center font-bold focus:outline-none focus:border-primary"
                    />
                  </div>
                </div>
              </div>

              {/* Stock Section */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-text-secondary mb-1">Stok Fisik Awal</label>
                  <input
                    type="number"
                    value={formCurrentStock}
                    onChange={e => setFormCurrentStock(e.target.value)}
                    className="w-full px-3 py-2 bg-subtle border border-border-strong rounded-lg font-mono font-bold text-text-primary focus:outline-none focus:border-primary"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-text-secondary mb-1">Batas Minimum Peringatan (Alert)</label>
                  <input
                    type="number"
                    value={formMinStockAlert}
                    onChange={e => setFormMinStockAlert(e.target.value)}
                    className="w-full px-3 py-2 bg-subtle border border-border-strong rounded-lg font-mono font-bold text-text-primary focus:outline-none focus:border-primary"
                  />
                </div>
              </div>

              <div className="flex gap-2 pt-3 border-t border-border-subtle">
                <button
                  type="button"
                  onClick={() => setIsProductModalOpen(false)}
                  className="flex-1 py-2 bg-subtle hover:bg-card-hover border border-border-subtle rounded-lg font-semibold text-text-secondary"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSavingProduct}
                  className="flex-1 py-2 bg-primary hover:bg-primary-hover text-primary-text rounded-lg font-bold shadow-sm disabled:opacity-50"
                >
                  {isSavingProduct ? 'Menyimpan...' : editingProduct ? 'Simpan Perubahan' : 'Simpan Produk Baru'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: IMPORT CSV PRODUK */}
      {isImportModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-2xl bg-card border border-border-strong rounded-2xl shadow-2xl overflow-hidden">
            <div className="p-4 bg-surface border-b border-border-subtle flex items-center justify-between">
              <h3 className="font-bold text-sm text-text-primary flex items-center gap-2">
                <Upload className="w-4 h-4 text-primary" />
                Impor Masal Produk dari File CSV / Excel
              </h3>
              <button onClick={() => setIsImportModalOpen(false)} className="text-text-muted hover:text-text-primary font-bold">
                ✕
              </button>
            </div>

            <div className="p-5 space-y-4 text-xs">
              <div className="p-3 bg-subtle rounded-xl border border-border-subtle flex items-center justify-between">
                <div>
                  <p className="font-bold text-text-primary">Gunakan Template Standar</p>
                  <p className="text-[11px] text-text-muted">Header: SKU, Barcode, Name, Category, BuyPrice, SellPrice, WholesalePrice, WholesaleMinQty, CurrentStock, Unit</p>
                </div>
                <button
                  onClick={handleDownloadTemplate}
                  className="px-3 py-1.5 bg-card hover:bg-card-hover border border-border-subtle rounded-lg font-bold text-primary flex items-center gap-1.5 shadow-sm"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download Template</span>
                </button>
              </div>

              <div>
                <label className="block font-bold text-text-secondary mb-1.5">Pilih Berkas CSV:</label>
                <input
                  type="file"
                  accept=".csv,text/csv"
                  onChange={handleFileUpload}
                  className="w-full p-2 bg-subtle border border-dashed border-border-strong rounded-xl text-text-primary"
                />
              </div>

              <div>
                <label className="block font-bold text-text-secondary mb-1.5">Atau Tempelkan (Paste) Teks CSV Langsung:</label>
                <textarea
                  rows={6}
                  value={csvRawText}
                  onChange={(e) => setCsvRawText(e.target.value)}
                  placeholder="SKU,Barcode,Name,Category,BuyPrice,SellPrice,WholesalePrice,WholesaleMinQty,CurrentStock,Unit&#10;MIE-001,899238810101,Indomie Goreng 85g,Makanan,2800,3500,3200,5,100,PCS"
                  className="w-full p-3 bg-subtle border border-border-subtle rounded-xl font-mono text-[11px] text-text-primary focus:outline-none focus:border-primary"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  onClick={() => setIsImportModalOpen(false)}
                  className="px-4 py-2 rounded-lg bg-subtle hover:bg-card-hover font-semibold text-text-secondary border border-border-subtle"
                >
                  Batal
                </button>
                <button
                  onClick={handleExecuteImport}
                  disabled={isImporting || !csvRawText.trim()}
                  className="px-4 py-2 rounded-lg bg-primary text-primary-text font-bold shadow-md hover:bg-primary-hover disabled:opacity-40 flex items-center gap-1.5"
                >
                  <Upload className="w-4 h-4" />
                  <span>{isImporting ? 'Sedang Memproses...' : 'Mulai Impor ke Database'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: MULTI-UNIT CONVERSIONS (DUS, LUSIN, RENTENG) */}
      {selectedProductForUnits && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-xl bg-card border border-border-strong rounded-2xl shadow-2xl overflow-hidden">
            <div className="p-4 bg-surface border-b border-border-subtle flex items-center justify-between">
              <div>
                <h3 className="font-bold text-sm text-text-primary flex items-center gap-2">
                  <Package className="w-4 h-4 text-primary" />
                  Konversi Kemasan: {selectedProductForUnits.name}
                </h3>
                <p className="text-[11px] text-text-secondary">
                  Satuan Dasar: <strong>1 {selectedProductForUnits.unit}</strong> (Rp {selectedProductForUnits.sellPrice.toLocaleString('id-ID')})
                </p>
              </div>
              <button onClick={() => setSelectedProductForUnits(null)} className="text-text-muted hover:text-text-primary font-bold">
                ✕
              </button>
            </div>

            <div className="p-5 space-y-4 text-xs">
              {/* Form Tambah Satuan */}
              <form onSubmit={handleAddUnitConversion} className="p-3.5 bg-subtle rounded-xl border border-border-subtle space-y-3">
                <h4 className="font-bold text-text-primary text-xs flex items-center gap-1.5">
                  <Plus className="w-3.5 h-3.5 text-primary" /> Tambah Kemasan Baru (Dus / Lusin / Karton)
                </h4>
                <div className="grid grid-cols-4 gap-2">
                  <div>
                    <label className="block text-[10px] font-bold text-text-muted mb-1">Nama Satuan</label>
                    <input
                      type="text"
                      required
                      value={newUnitName}
                      onChange={(e) => setNewUnitName(e.target.value)}
                      placeholder="DUS / LUSIN"
                      className="w-full px-2.5 py-1.5 bg-card border border-border-subtle rounded-lg uppercase font-bold text-text-primary"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-text-muted mb-1">Isi per Kemasan</label>
                    <input
                      type="number"
                      required
                      min={2}
                      value={newConversionFactor}
                      onChange={(e) => setNewConversionFactor(Number(e.target.value))}
                      placeholder="40"
                      className="w-full px-2.5 py-1.5 bg-card border border-border-subtle rounded-lg font-mono font-bold text-text-primary"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-text-muted mb-1">Barcode Kardus</label>
                    <input
                      type="text"
                      value={newUnitBarcode}
                      onChange={(e) => setNewUnitBarcode(e.target.value)}
                      placeholder="Barcode Dus"
                      className="w-full px-2.5 py-1.5 bg-card border border-border-subtle rounded-lg font-mono text-text-primary"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-text-muted mb-1">Harga Jual Kemasan</label>
                    <input
                      type="number"
                      required
                      value={newUnitSellPrice}
                      onChange={(e) => setNewUnitSellPrice(Number(e.target.value))}
                      placeholder="135000"
                      className="w-full px-2.5 py-1.5 bg-card border border-border-subtle rounded-lg font-mono font-bold text-primary"
                    />
                  </div>
                </div>
                <div className="flex justify-end">
                  <button
                    type="submit"
                    className="px-3 py-1.5 bg-primary text-primary-text rounded-lg font-bold shadow-sm hover:bg-primary-hover"
                  >
                    + Simpan Satuan Kemasan
                  </button>
                </div>
              </form>

              {/* Daftar Satuan Terdaftar */}
              <div className="space-y-1.5">
                <h4 className="font-bold text-text-secondary text-xs">Satuan Kemasan Terdaftar:</h4>
                {unitConversions.length === 0 ? (
                  <p className="p-4 text-center text-text-muted bg-subtle rounded-xl border border-dashed border-border-subtle">
                    Belum ada kemasan khusus. Produk hanya dijual per {selectedProductForUnits.unit}.
                  </p>
                ) : (
                  unitConversions.map((u) => (
                    <div key={u.id} className="p-3 bg-card rounded-xl border border-border-subtle flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary font-bold flex items-center justify-center font-mono">
                          {u.unitName}
                        </div>
                        <div>
                          <p className="font-bold text-text-primary">
                            1 {u.unitName} = {u.conversionFactor} {selectedProductForUnits.unit}
                          </p>
                          <p className="text-[11px] text-text-muted font-mono">
                            Barcode: {u.barcode || '-'}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="font-bold font-mono text-primary">
                          Rp {u.sellPrice.toLocaleString('id-ID')}
                        </span>
                        <button
                          onClick={() => u.id && handleDeleteUnitConversion(u.id)}
                          className="p-1.5 rounded-lg text-text-muted hover:text-status-danger hover:bg-subtle"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: KARTU RIWAYAT MUTASI STOK (STOCK LEDGER) */}
      {selectedProductForLedger && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-3xl bg-card border border-border-strong rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
            <div className="p-4 bg-surface border-b border-border-subtle flex items-center justify-between">
              <div>
                <h3 className="font-bold text-sm text-text-primary flex items-center gap-2">
                  <Layers className="w-4 h-4 text-status-info" />
                  Kartu Mutasi Stok: {selectedProductForLedger.name}
                </h3>
                <p className="text-[11px] text-text-secondary">
                  SKU: <strong className="font-mono">{selectedProductForLedger.sku}</strong> • Stok Fisik Saat Ini: <strong className="text-primary font-mono">{selectedProductForLedger.currentStock} {selectedProductForLedger.unit}</strong> • HPP: <strong className="font-mono">Rp {selectedProductForLedger.buyPrice.toLocaleString('id-ID')}</strong>
                </p>
              </div>
              <button onClick={() => setSelectedProductForLedger(null)} className="text-text-muted hover:text-text-primary font-bold">
                ✕
              </button>
            </div>

            <div className="p-4 flex-1 overflow-y-auto space-y-3">
              {isLoadingMutations ? (
                <p className="p-8 text-center text-xs text-text-muted">Memuat riwayat mutasi stok...</p>
              ) : productMutations.length === 0 ? (
                <div className="p-8 text-center text-xs text-text-muted bg-subtle rounded-xl border border-border-subtle">
                  Belum ada catatan mutasi stok untuk produk ini.
                </div>
              ) : (
                <div className="bg-surface border border-border-subtle rounded-xl overflow-hidden shadow-xs">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-subtle text-text-secondary font-semibold border-b border-border-subtle">
                      <tr>
                        <th className="p-2.5">Tanggal & Waktu</th>
                        <th className="p-2.5">Tipe Mutasi</th>
                        <th className="p-2.5 text-center">Perubahan</th>
                        <th className="p-2.5 text-center">Sebelum → Sesudah</th>
                        <th className="p-2.5">No. Referensi / Keterangan</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border-subtle/50 font-mono">
                      {productMutations.map((m) => {
                        const isPlus = m.quantity > 0;
                        return (
                          <tr key={m.id} className="hover:bg-card-hover/50 text-[11px]">
                            <td className="p-2.5 text-text-muted font-sans">{new Date(m.createdAt).toLocaleString('id-ID')}</td>
                            <td className="p-2.5 font-sans font-semibold">
                              <span className={`px-2 py-0.5 rounded text-[10px] ${
                                m.mutationType === 'SaleOut' 
                                  ? 'bg-primary/10 text-primary' 
                                  : m.mutationType === 'PurchaseReceived'
                                  ? 'bg-status-success/10 text-status-success'
                                  : m.mutationType === 'SalesReturn'
                                  ? 'bg-status-info/10 text-status-info'
                                  : 'bg-status-warning/10 text-status-warning'
                              }`}>
                                {m.mutationType === 'SaleOut' && '🛒 Penjualan POS'}
                                {m.mutationType === 'PurchaseReceived' && '📦 Faktur Pembelian Supplier'}
                                {m.mutationType === 'StockOpnameAdjustment' && '📋 Penyesuaian Opname'}
                                {m.mutationType === 'SalesReturn' && '↩️ Retur Penjualan'}
                                {!['SaleOut', 'PurchaseReceived', 'StockOpnameAdjustment', 'SalesReturn'].includes(m.mutationType) && m.mutationType}
                              </span>
                            </td>
                            <td className={`p-2.5 text-center font-bold font-mono ${isPlus ? 'text-status-success' : 'text-status-danger'}`}>
                              {isPlus ? `+${m.quantity}` : m.quantity}
                            </td>
                            <td className="p-2.5 text-center text-text-secondary">
                              {m.stockBefore} → <strong className="text-text-primary">{m.stockAfter}</strong>
                            </td>
                            <td className="p-2.5 font-sans text-text-muted">
                              <span className="font-mono text-text-primary">{m.referenceNumber || '-'}</span>
                              {m.notes && <span className="block text-[10px]">{m.notes}</span>}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <div className="p-3 bg-subtle border-t border-border-subtle flex justify-end">
              <button
                onClick={() => setSelectedProductForLedger(null)}
                className="px-4 py-1.5 bg-card hover:bg-card-hover border border-border-subtle rounded-lg text-xs font-semibold text-text-primary"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// ==========================================
// 2. CRM & KASBON (RECEIVABLES) PAGE
// ==========================================
export const CustomersPage: React.FC = () => {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchCustomer, setSearchCustomer] = useState('');
  const [filterGroup, setFilterGroup] = useState('');

  useEffect(() => {
    setIsLoading(true);
    fetch('/api/v1/customers')
      .then((r) => r.json())
      .then((d) => setCustomers(d))
      .catch(() => useToastStore.getState().showToast('Gagal memuat data pelanggan.', 'error'))
      .finally(() => setIsLoading(false));
  }, []);

  const filteredCustomers = customers.filter(c => {
    const matchSearch = !searchCustomer ||
      c.name.toLowerCase().includes(searchCustomer.toLowerCase()) ||
      (c.phoneNumber || '').includes(searchCustomer);
    const matchGroup = !filterGroup || c.customerGroup === filterGroup;
    return matchSearch && matchGroup;
  });

  const totalKasbon = customers.reduce((s, c) => s + (c.totalReceivable || 0), 0);
  const totalPoin = customers.reduce((s, c) => s + (c.loyaltyPoints || 0), 0);
  const withKasbon = customers.filter(c => c.totalReceivable > 0).length;
  const groups = [...new Set(customers.map(c => c.customerGroup).filter(Boolean))];

  return (
    <div className="flex-1 flex flex-col bg-app overflow-hidden select-none">
      <div className="p-4 bg-surface border-b border-border-subtle flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center font-bold">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-text-primary">CRM, Member & Buku Kasbon</h2>
            <p className="text-xs text-text-secondary">Kelola poin loyalitas member dan catatan piutang belanja pelanggan</p>
          </div>
        </div>
      </div>

      {/* Stats + Search Bar */}
      <div className="px-4 py-3 border-b border-border-subtle bg-surface flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-3 text-xs font-bold">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary/10 border border-primary/20 text-primary">
            <Users className="w-3.5 h-3.5" /><span>{customers.length} Member</span>
          </div>
          {withKasbon > 0 && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-600">
              <DollarSign className="w-3.5 h-3.5" /><span>{withKasbon} Kasbon · Rp {totalKasbon.toLocaleString('id-ID')}</span>
            </div>
          )}
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-600">
            <TrendingUp className="w-3.5 h-3.5" /><span>{totalPoin.toLocaleString('id-ID')} Poin Beredar</span>
          </div>
        </div>
        <div className="ml-auto flex items-center gap-2">
          {groups.length > 0 && (
            <select value={filterGroup} onChange={e => setFilterGroup(e.target.value)}
              className="px-3 py-1.5 bg-card border border-border-subtle rounded-lg text-xs font-semibold text-text-primary focus:outline-none focus:border-primary">
              <option value="">Semua Group</option>
              {groups.map(g => <option key={g} value={g}>{g}</option>)}
            </select>
          )}
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-text-muted absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input type="text" value={searchCustomer} onChange={e => setSearchCustomer(e.target.value)}
              placeholder="Cari nama / no. HP..."
              className="pl-8 pr-3 py-1.5 bg-card border border-border-subtle rounded-lg text-xs text-text-primary focus:outline-none focus:border-primary w-52" />
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        {isLoading ? (
          <div className="py-16 text-center text-xs text-text-muted">Memuat data pelanggan...</div>
        ) : filteredCustomers.length === 0 ? (
          <div className="py-16 text-center space-y-2">
            <Users className="w-10 h-10 mx-auto opacity-25 text-text-muted" />
            <p className="text-xs font-bold text-text-primary">Tidak ada pelanggan ditemukan</p>
            <p className="text-[11px] text-text-muted">Coba ubah kata kunci pencarian atau filter group.</p>
          </div>
        ) : (
        <div className="grid grid-cols-3 gap-4">
          {filteredCustomers.map((c) => (
            <div key={c.id} className={`p-4 rounded-xl bg-card border shadow-sm space-y-3 transition-all hover:border-primary/30 ${c.totalReceivable > 0 ? 'border-rose-500/30' : 'border-border-subtle'}`}>
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-sm font-bold text-text-primary">{c.name}</h3>
                  <p className="text-xs text-text-secondary font-mono">{c.phoneNumber || '-'}</p>
                </div>
                <span className={`px-2 py-0.5 rounded text-[10px] font-bold border uppercase ${
                  c.customerGroup === 'VIP' ? 'bg-amber-500/10 text-amber-600 border-amber-500/30' :
                  c.customerGroup === 'Reseller' ? 'bg-purple-500/10 text-purple-600 border-purple-500/30' :
                  'bg-primary/10 text-primary border-primary/30'
                }`}>
                  {c.customerGroup || 'Reguler'}
                </span>
              </div>

              <div className="p-3 bg-subtle rounded-lg border border-border-subtle grid grid-cols-2 gap-2 text-xs">
                <div>
                  <span className="text-text-muted text-[11px]">Poin Loyalitas:</span>
                  <p className="font-bold text-primary font-mono">{(c.loyaltyPoints || 0).toLocaleString('id-ID')} Poin</p>
                </div>
                <div>
                  <span className="text-text-muted text-[11px]">Total Kasbon:</span>
                  <p className={`font-bold font-mono tabular-nums ${c.totalReceivable > 0 ? 'text-status-danger' : 'text-text-secondary'}`}>
                    {c.totalReceivable > 0 ? `Rp ${c.totalReceivable.toLocaleString('id-ID')}` : 'Lunas'}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
        )}
      </div>
    </div>
  );
};

// ==========================================
// 3. FINANCIAL REPORTS & P&L (LABA RUGI) PAGE
// ==========================================
export const ReportsPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'overview' | 'pnl'>('overview');
  const [summary, setSummary] = useState<SalesSummary | null>(null);
  const [pnlData, setPnlData] = useState<any | null>(null);
  const [isLoadingPnl, setIsLoadingPnl] = useState(false);
  const [isLoadingSummary, setIsLoadingSummary] = useState(false);

  // Date range filter — default: current month
  const today = new Date();
  const firstOfMonth = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().slice(0, 10);
  const todayStr = today.toISOString().slice(0, 10);
  const [dateFrom, setDateFrom] = useState(firstOfMonth);
  const [dateTo, setDateTo] = useState(todayStr);

  const fetchSummary = (from?: string, to?: string) => {
    setIsLoadingSummary(true);
    const q = from && to ? `?from=${from}&to=${to}` : '';
    fetch(`/api/v1/reports/sales-summary${q}`)
      .then((r) => r.json())
      .then((d) => setSummary(d))
      .catch(() => {})
      .finally(() => setIsLoadingSummary(false));
  };

  useEffect(() => { fetchSummary(dateFrom, dateTo); }, []);

  const handleApplyDateFilter = () => { fetchSummary(dateFrom, dateTo); };

  const handleQuickRange = (range: 'today' | 'week' | 'month' | 'all') => {
    const now = new Date();
    let from = '', to = now.toISOString().slice(0, 10);
    if (range === 'today') { from = to; }
    else if (range === 'week') { const d = new Date(now); d.setDate(d.getDate() - 7); from = d.toISOString().slice(0, 10); }
    else if (range === 'month') { from = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10); }
    else { from = '2020-01-01'; to = '2099-12-31'; }
    setDateFrom(from); setDateTo(to);
    fetchSummary(from, to);
  };

  const fetchPnlData = () => {
    setIsLoadingPnl(true);
    const q = dateFrom && dateTo ? `?from=${dateFrom}&to=${dateTo}` : '';
    fetch(`/api/v1/reports/profit-and-loss${q}`)
      .then((r) => r.json())
      .then((d) => setPnlData(d))
      .catch(() => {})
      .finally(() => setIsLoadingPnl(false));
  };

  useEffect(() => {
    if (activeTab === 'pnl') {
      fetchPnlData();
    }
  }, [activeTab]);

  const handleExportCsv = () => {
    window.open('/api/v1/reports/export-csv', '_blank');
    useToastStore.getState().showToast('Mengunduh laporan penjualan CSV...', 'info');
  };

  return (
    <div className="flex-1 flex flex-col bg-app overflow-hidden select-none">
      <div className="p-4 bg-surface border-b border-border-subtle flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center font-bold">
            <BarChart3 className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-text-primary">Laporan Finansial & Laba Rugi Toko</h2>
            <p className="text-xs text-text-secondary">Analisis omzet, margin laba kotor, beban kas kecil, dan laba bersih</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Tab Switcher */}
          <div className="flex p-1 bg-subtle rounded-lg border border-border-subtle text-xs font-bold">
            <button
              onClick={() => setActiveTab('overview')}
              className={`px-3 py-1.5 rounded-md transition-all ${
                activeTab === 'overview'
                  ? 'bg-card text-text-primary shadow-xs'
                  : 'text-text-secondary hover:text-text-primary'
              }`}
            >
              📊 Ringkasan Penjualan
            </button>
            <button
              onClick={() => setActiveTab('pnl')}
              className={`px-3 py-1.5 rounded-md transition-all ${
                activeTab === 'pnl'
                  ? 'bg-card text-text-primary shadow-xs'
                  : 'text-text-secondary hover:text-text-primary'
              }`}
            >
              📈 Laba Rugi (P&L)
            </button>
          </div>

          <button 
            onClick={handleExportCsv}
            className="px-3 py-1.5 bg-card hover:bg-card-hover border border-border-subtle rounded-md text-xs font-semibold text-text-secondary flex items-center gap-1.5"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>Ekspor CSV</span>
          </button>
        </div>
      </div>

      {/* Date Range Filter Bar */}
      <div className="px-4 py-2.5 border-b border-border-subtle bg-surface flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-1 text-xs font-bold text-text-secondary">
          <Calendar className="w-3.5 h-3.5 text-primary" /> Periode:
        </div>
        {[
          { key: 'today', label: 'Hari Ini' },
          { key: 'week', label: '7 Hari' },
          { key: 'month', label: 'Bulan Ini' },
          { key: 'all', label: 'Semua' },
        ].map(r => (
          <button key={r.key} onClick={() => handleQuickRange(r.key as any)}
            className="px-2.5 py-1 rounded-md bg-subtle hover:bg-primary/10 hover:text-primary border border-border-subtle text-xs font-bold text-text-secondary transition-all">
            {r.label}
          </button>
        ))}
        <div className="flex items-center gap-1.5 ml-auto">
          <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)}
            className="px-2 py-1 bg-card border border-border-strong rounded text-xs font-mono text-text-primary focus:outline-none focus:border-primary" />
          <span className="text-xs text-text-muted">s/d</span>
          <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)}
            className="px-2 py-1 bg-card border border-border-strong rounded text-xs font-mono text-text-primary focus:outline-none focus:border-primary" />
          <button onClick={handleApplyDateFilter}
            className="px-3 py-1 bg-primary hover:bg-primary-hover text-primary-text rounded text-xs font-bold shadow-sm">
            {isLoadingSummary ? 'Memuat...' : 'Terapkan'}
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-5 space-y-5">
        {/* ========================================================= */}
        {/* TAB 1: OVERVIEW & RETAIL ANALYTICS */}
        {/* ========================================================= */}
        {activeTab === 'overview' && (
          <>
            {/* KPI Cards */}
            <div className="grid grid-cols-4 gap-3">
              <div className="p-4 rounded-xl bg-card border border-border-subtle shadow-sm space-y-1">
                <span className="text-xs font-semibold text-text-secondary">Total Omzet Penjualan:</span>
                <p className="text-2xl font-bold font-mono text-primary tabular-nums">
                  Rp {(summary?.totalRevenue || 0).toLocaleString('id-ID')}
                </p>
              </div>
              <div className="p-4 rounded-xl bg-card border border-border-subtle shadow-sm space-y-1">
                <span className="text-xs font-semibold text-text-secondary">Laba Kotor Toko (Gross Profit):</span>
                <p className="text-2xl font-bold font-mono text-emerald-600 tabular-nums">
                  Rp {(summary?.totalGrossProfit || 0).toLocaleString('id-ID')}
                </p>
              </div>
              <div className="p-4 rounded-xl bg-card border border-border-subtle shadow-sm space-y-1">
                <span className="text-xs font-semibold text-text-secondary">Total Transaksi:</span>
                <p className="text-2xl font-bold font-mono text-text-primary tabular-nums">
                  {summary?.totalTransactions || 0} Struk
                </p>
              </div>
              <div className="p-4 rounded-xl bg-card border border-border-subtle shadow-sm space-y-1">
                <span className="text-xs font-semibold text-text-secondary">Rata-rata Nilai Belanja (Basket):</span>
                <p className="text-2xl font-bold font-mono text-text-primary tabular-nums">
                  Rp {Math.round(summary?.averageTicketSize || 0).toLocaleString('id-ID')}
                </p>
              </div>
            </div>

        {/* 2-Column: Top Fast-Moving Products vs Dead Stock */}
        <div className="grid grid-cols-2 gap-4">
          {/* Top Fast-Moving Products */}
          <div className="bg-card border border-border-subtle rounded-xl p-4 shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-text-primary flex items-center gap-1.5 uppercase tracking-wider">
                <Flame className="w-4 h-4 text-amber-500" />
                Top 10 Fast-Moving (Paling Laris)
              </h3>
              <span className="text-[10px] text-text-muted">Berdasarkan Kuantitas</span>
            </div>

            <div className="divide-y divide-border-subtle">
              {(!summary?.topProducts || summary.topProducts.length === 0) ? (
                <p className="p-4 text-center text-text-muted text-xs">Belum ada data penjualan.</p>
              ) : (
                summary.topProducts.map((p, idx) => (
                  <div key={idx} className="py-2.5 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2.5">
                      <span className="w-5 h-5 rounded-full bg-subtle flex items-center justify-center font-bold text-[10px] text-text-muted font-mono">
                        {idx + 1}
                      </span>
                      <div>
                        <p className="font-semibold text-text-primary">{p.productName}</p>
                        <p className="text-[10px] text-emerald-600 font-bold">Laba: +Rp {p.grossProfit.toLocaleString('id-ID')}</p>
                      </div>
                    </div>
                    <div className="text-right font-mono">
                      <p className="font-bold text-primary">{p.quantitySold} Terjual</p>
                      <p className="text-[10px] text-text-muted">Rp {p.revenue.toLocaleString('id-ID')}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Dead Stock / Slow-Moving Products */}
          <div className="bg-card border border-border-subtle rounded-xl p-4 shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-text-primary flex items-center gap-1.5 uppercase tracking-wider">
                <AlertTriangle className="w-4 h-4 text-rose-500" />
                Dead Stock / Stok Mengendap
              </h3>
              <span className="text-[10px] text-text-muted">Belum Laku & Ada Stok</span>
            </div>

            <div className="divide-y divide-border-subtle">
              {(!summary?.deadStock || summary.deadStock.length === 0) ? (
                <p className="p-4 text-center text-text-muted text-xs">Semua barang berputar aktif (Tidak ada dead stock).</p>
              ) : (
                summary.deadStock.slice(0, 10).map((d, idx) => (
                  <div key={idx} className="py-2.5 flex items-center justify-between text-xs">
                    <div>
                      <p className="font-semibold text-text-primary">{d.productName}</p>
                      <p className="text-[10px] text-text-muted">SKU: {d.sku} • Stok: {d.currentStock} pcs</p>
                    </div>
                    <div className="text-right font-mono">
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-rose-500/10 text-rose-600 font-bold border border-rose-500/20">
                        Modal Tertahan: Rp {d.tiedCapital.toLocaleString('id-ID')}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Category Gross Profit Margin Breakdown */}
        {summary?.categoryProfits && summary.categoryProfits.length > 0 && (
          <div className="bg-card border border-border-subtle rounded-xl p-4 shadow-sm space-y-3">
            <h3 className="text-xs font-bold text-text-primary uppercase tracking-wider">
              Analisis Margin Laba Kotor per Kategori Produk
            </h3>
            <table className="w-full text-left text-xs">
              <thead className="bg-subtle text-text-secondary font-semibold border-b border-border-subtle">
                <tr>
                  <th className="p-2.5">Kategori</th>
                  <th className="p-2.5">Omzet Penjualan</th>
                  <th className="p-2.5">HPP (Modal)</th>
                  <th className="p-2.5">Laba Kotor (Gross Profit)</th>
                  <th className="p-2.5">Margin %</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-subtle/50 font-mono">
                {summary.categoryProfits.map((c, idx) => (
                  <tr key={idx} className="hover:bg-card-hover/50">
                    <td className="p-2.5 font-bold font-sans text-text-primary">{c.categoryName}</td>
                    <td className="p-2.5">Rp {c.revenue.toLocaleString('id-ID')}</td>
                    <td className="p-2.5 text-text-muted">Rp {c.cogs.toLocaleString('id-ID')}</td>
                    <td className="p-2.5 font-bold text-emerald-600">Rp {c.grossProfit.toLocaleString('id-ID')}</td>
                    <td className="p-2.5">
                      <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-600 font-bold">
                        {c.marginPercentage}%
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </>
    )}

        {/* ========================================================= */}
        {/* TAB 2: PROFIT & LOSS (LABA RUGI / INCOME STATEMENT) */}
        {/* ========================================================= */}
        {activeTab === 'pnl' && (
          <div className="space-y-5">
            {isLoadingPnl ? (
              <p className="p-8 text-center text-xs text-text-muted">Mengkalkulasi laporan Laba Rugi real-time...</p>
            ) : !pnlData ? (
              <div className="p-8 text-center text-xs text-text-muted bg-card rounded-xl border border-border-subtle">
                Gagal memuat data laporan laba rugi.
              </div>
            ) : (
              <>
                {/* Highlight Cards */}
                <div className="grid grid-cols-3 gap-4">
                  <div className="p-4 rounded-xl bg-card border border-border-subtle shadow-sm space-y-1">
                    <span className="text-xs font-semibold text-text-secondary">Penjualan Bersih (Net Sales):</span>
                    <p className="text-2xl font-bold font-mono text-primary tabular-nums">
                      Rp {pnlData.netSales.toLocaleString('id-ID')}
                    </p>
                  </div>
                  <div className="p-4 rounded-xl bg-card border border-border-subtle shadow-sm space-y-1">
                    <span className="text-xs font-semibold text-text-secondary">Laba Kotor (Gross Margin {pnlData.grossMarginPercent}%):</span>
                    <p className="text-2xl font-bold font-mono text-emerald-600 tabular-nums">
                      Rp {pnlData.grossProfit.toLocaleString('id-ID')}
                    </p>
                  </div>
                  <div className="p-4 rounded-xl bg-card border border-primary/30 bg-primary/5 shadow-sm space-y-1">
                    <span className="text-xs font-semibold text-text-secondary">Laba Bersih Usaha (Net Margin {pnlData.netMarginPercent}%):</span>
                    <p className={`text-2xl font-bold font-mono tabular-nums ${pnlData.netOperatingIncome >= 0 ? 'text-status-success' : 'text-status-danger'}`}>
                      Rp {pnlData.netOperatingIncome.toLocaleString('id-ID')}
                    </p>
                  </div>
                </div>

                {/* Structured Income Statement Table */}
                <div className="bg-card border border-border-subtle rounded-2xl overflow-hidden shadow-sm">
                  <div className="p-4 bg-subtle border-b border-border-subtle flex items-center justify-between">
                    <div>
                      <h3 className="text-xs font-bold text-text-primary uppercase tracking-wider">
                        Laporan Laba Rugi Operasional (Income Statement)
                      </h3>
                      <p className="text-[11px] text-text-muted font-mono">
                        Periode: {new Date(pnlData.periodStart).toLocaleDateString('id-ID')} - {new Date(pnlData.periodEnd).toLocaleDateString('id-ID')}
                      </p>
                    </div>
                    <span className="px-2.5 py-1 rounded-full bg-primary/10 text-primary border border-primary/20 text-[10px] font-bold">
                      100% Real-Time POS Sync
                    </span>
                  </div>

                  <div className="p-5 divide-y divide-border-subtle space-y-4 text-xs">
                    
                    {/* SECTION 1: REVENUE */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between font-bold text-text-primary uppercase text-[11px]">
                        <span>1. Pendapatan Penjualan (Revenue)</span>
                        <span className="font-mono">Rp {pnlData.netSales.toLocaleString('id-ID')}</span>
                      </div>
                      <div className="pl-4 space-y-1 text-text-secondary">
                        <div className="flex justify-between">
                          <span>Penjualan Kotor (Gross Sales)</span>
                          <span className="font-mono">Rp {pnlData.grossSales.toLocaleString('id-ID')}</span>
                        </div>
                        {pnlData.totalDiscounts > 0 && (
                          <div className="flex justify-between text-status-danger">
                            <span>Diskon Penjualan & Promosi</span>
                            <span className="font-mono">-Rp {pnlData.totalDiscounts.toLocaleString('id-ID')}</span>
                          </div>
                        )}
                        {pnlData.totalReturns > 0 && (
                          <div className="flex justify-between text-status-danger">
                            <span>Retur Penjualan Produk</span>
                            <span className="font-mono">-Rp {pnlData.totalReturns.toLocaleString('id-ID')}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* SECTION 2: COGS & GROSS PROFIT */}
                    <div className="pt-3 space-y-2">
                      <div className="flex items-center justify-between font-bold text-text-primary uppercase text-[11px]">
                        <span>2. Beban Pokok Pendapatan (HPP / COGS)</span>
                        <span className="font-mono text-status-danger">-Rp {pnlData.totalCogs.toLocaleString('id-ID')}</span>
                      </div>
                      <div className="pl-4 text-text-secondary flex justify-between">
                        <span>Total HPP Barang Terjual</span>
                        <span className="font-mono">-Rp {pnlData.totalCogs.toLocaleString('id-ID')}</span>
                      </div>
                      <div className="p-3 bg-subtle rounded-xl flex items-center justify-between font-bold text-text-primary border border-border-subtle">
                        <span>LABA KOTOR (GROSS PROFIT) [{pnlData.grossMarginPercent}%]</span>
                        <span className="font-mono text-emerald-600 text-sm">Rp {pnlData.grossProfit.toLocaleString('id-ID')}</span>
                      </div>
                    </div>

                    {/* SECTION 3: OPERATING EXPENSES */}
                    <div className="pt-3 space-y-2">
                      <div className="flex items-center justify-between font-bold text-text-primary uppercase text-[11px]">
                        <span>3. Beban Operasional Kas Toko (Operating Expenses)</span>
                        <span className="font-mono text-status-danger">-Rp {pnlData.operatingExpenses.total.toLocaleString('id-ID')}</span>
                      </div>
                      {pnlData.operatingExpenses.breakdown.length === 0 ? (
                        <p className="pl-4 text-text-muted text-[11px]">Tidak ada pengeluaran kas kecil pada periode ini.</p>
                      ) : (
                        <div className="pl-4 space-y-1 text-text-secondary">
                          {pnlData.operatingExpenses.breakdown.map((b: any, idx: number) => (
                            <div key={idx} className="flex justify-between">
                              <span>• {b.category} ({b.count} transaksi)</span>
                              <span className="font-mono">-Rp {b.amount.toLocaleString('id-ID')}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* SECTION 4: NET OPERATING INCOME */}
                    <div className="pt-4">
                      <div className="p-4 bg-primary/10 border border-primary/40 rounded-xl flex items-center justify-between">
                        <div>
                          <div className="text-sm font-extrabold text-text-primary">
                            LABA BERSIH USAHA TOKO (NET OPERATING INCOME)
                          </div>
                          <div className="text-[11px] text-text-secondary">
                            Margin Bersih Usaha: <strong className="text-primary font-mono">{pnlData.netMarginPercent}%</strong>
                          </div>
                        </div>
                        <div className={`text-2xl font-extrabold font-mono tabular-nums ${pnlData.netOperatingIncome >= 0 ? 'text-status-success' : 'text-status-danger'}`}>
                          Rp {pnlData.netOperatingIncome.toLocaleString('id-ID')}
                        </div>
                      </div>
                    </div>

                  </div>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

// ==========================================
// 4. GOOGLE DRIVE BACKUP & RESTORE PAGE
// ==========================================
export const BackupPage: React.FC = () => {
  const [histories, setHistories] = useState<BackupHistory[]>([]);
  const [isBackingUp, setIsBackingUp] = useState(false);
  const [progress, setProgress] = useState<number | null>(null);
  const [statusMsg, setStatusMsg] = useState('');

  useEffect(() => {
    fetchHistories();
  }, []);

  const fetchHistories = async () => {
    try {
      const res = await fetch('/api/v1/backup/history');
      if (res.ok) {
        const data = await res.json();
        setHistories(data);
      }
    } catch {}
  };

  const handleCreateBackup = async () => {
    try {
      setIsBackingUp(true);
      setProgress(15);
      setStatusMsg('Membuat snapshot aman SQLite lokal (VACUUM INTO)...');
      
      setTimeout(() => {
        setProgress(50);
        setStatusMsg('Mengompresi & mengenkripsi arsip dengan AES-256-GCM...');
      }, 500);

      setTimeout(async () => {
        setProgress(85);
        setStatusMsg('Mengunggah arsip terenkripsi ke Google Drive...');
        const res = await fetch('/api/v1/backup/create-now', { method: 'POST' });
        if (res.ok) {
          setProgress(100);
          setStatusMsg('Selesai! Backup berhasil disimpan di cloud.');
          setTimeout(() => {
            setIsBackingUp(false);
            setProgress(null);
            fetchHistories();
          }, 1000);
        }
      }, 1000);
    } catch {
      setIsBackingUp(false);
      setProgress(null);
    }
  };

  return (
    <div className="flex-1 flex flex-col bg-app overflow-hidden select-none">
      <div className="p-4 bg-surface border-b border-border-subtle flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center font-bold">
            <HardDriveDownload className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-text-primary">Cadangan Cloud Google Drive (Encrypted)</h2>
            <p className="text-xs text-text-secondary">Arsip terenkripsi militer AES-256 otomatis saat tutup shift & manual</p>
          </div>
        </div>

        <button
          onClick={handleCreateBackup}
          disabled={isBackingUp}
          className="px-3 py-1.5 bg-primary hover:bg-primary-hover text-primary-text rounded-md text-xs font-bold flex items-center gap-1.5 shadow-sm disabled:opacity-50"
        >
          <Cloud className="w-4 h-4" />
          <span>{isBackingUp ? 'Sedang Mencadangkan...' : 'Backup Sekarang'}</span>
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {progress !== null && (
          <div className="p-4 bg-card border border-primary/40 rounded-xl shadow-md space-y-2 animate-fadeIn">
            <div className="flex justify-between text-xs font-bold">
              <span className="text-primary">{statusMsg}</span>
              <span className="font-mono text-primary">{progress}%</span>
            </div>
            <div className="w-full h-2.5 bg-subtle rounded-full overflow-hidden border border-border-subtle">
              <div
                className="h-full bg-primary transition-all duration-300 rounded-full"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        )}

        <div className="p-4 rounded-xl bg-subtle border border-border-subtle flex items-center gap-3 text-xs">
          <ShieldCheck className="w-6 h-6 text-status-success flex-shrink-0" />
          <div>
            <h4 className="font-bold text-text-primary">Keamanan Standar Perbankan (AES-256-GCM)</h4>
            <p className="text-text-secondary">
              Database disalin secara aman tanpa mengganggu transaksi kasir, dikompresi, dan dienkripsi sebelum diunggah ke Google Drive toko.
            </p>
          </div>
        </div>

        <div className="bg-card border border-border-subtle rounded-xl overflow-hidden shadow-sm">
          <div className="px-4 py-3 border-b border-border-subtle bg-subtle">
            <h3 className="text-xs font-bold text-text-primary">Riwayat Backup Terakhir (Rolling 30 Hari)</h3>
          </div>
          <table className="w-full text-left text-xs">
            <thead className="bg-subtle text-text-secondary font-semibold border-b border-border-subtle">
              <tr>
                <th className="p-3">Nama Berkas Backup</th>
                <th className="p-3">Ukuran</th>
                <th className="p-3">Pemicu</th>
                <th className="p-3">Enkripsi</th>
                <th className="p-3">Waktu Dibuat</th>
                <th className="p-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-subtle/50 font-mono">
              {histories.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-6 text-center text-text-muted font-sans">
                    Belum ada riwayat backup. Klik tombol 'Backup Sekarang' di atas.
                  </td>
                </tr>
              ) : (
                histories.map((h) => (
                  <tr key={h.id} className="hover:bg-card-hover/50">
                    <td className="p-3 font-bold text-text-primary">{h.fileName}</td>
                    <td className="p-3">{(h.fileSizeBytes / 1024).toFixed(1)} KB</td>
                    <td className="p-3 font-sans text-text-secondary">{h.triggerSource}</td>
                    <td className="p-3 font-sans text-status-success font-semibold">AES-256-GCM</td>
                    <td className="p-3 text-text-muted">{new Date(h.createdAt).toLocaleString('id-ID')}</td>
                    <td className="p-3">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-status-success/10 text-status-success border border-status-success/30 font-sans">
                        Tersinkron
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

// ==========================================
// 5. SETTINGS & STORE PROFILE PAGE (RECEIPT 58mm/80mm & CUSTOM HEADER/FOOTER)
// ==========================================
export const SettingsPage: React.FC = () => {
  const { theme, setTheme } = useThemeStore();
  const { mode, edition } = useBusinessModeStore();
  const [storeName, setStoreName] = useState('OmniPOS Minimarket Sejahtera');
  const [storeAddress, setStoreAddress] = useState('Jl. Sudirman No. 88, Jakarta Pusat');
  const [storePhone, setStorePhone] = useState('0812-9876-5432');
  const [paperSize, setPaperSize] = useState('80mm');
  const [receiptFooter, setReceiptFooter] = useState('Terima kasih atas kunjungan Anda! Barang yang sudah dibeli tidak dapat ditukar/dikembalikan tanpa struk asli.');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    fetch('/api/v1/settings')
      .then(r => r.json())
      .then(settings => {
        if (Array.isArray(settings)) {
          for (const s of settings) {
            if (s.settingKey === 'STORE_NAME') setStoreName(s.settingValue);
            if (s.settingKey === 'STORE_ADDRESS') setStoreAddress(s.settingValue);
            if (s.settingKey === 'STORE_PHONE') setStorePhone(s.settingValue);
            if (s.settingKey === 'PAPER_SIZE') setPaperSize(s.settingValue);
            if (s.settingKey === 'RECEIPT_FOOTER') setReceiptFooter(s.settingValue);
          }
        }
      })
      .catch(() => {});
  }, []);

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsSaving(true);
      const payload = [
        { settingKey: 'STORE_NAME', settingValue: storeName },
        { settingKey: 'STORE_ADDRESS', settingValue: storeAddress },
        { settingKey: 'STORE_PHONE', settingValue: storePhone },
        { settingKey: 'PAPER_SIZE', settingValue: paperSize },
        { settingKey: 'RECEIPT_FOOTER', settingValue: receiptFooter }
      ];

      const res = await fetch('/api/v1/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        useToastStore.getState().showToast('Pengaturan toko & struk berhasil disimpan!', 'success');
      } else {
        useToastStore.getState().showToast('Gagal menyimpan pengaturan.', 'error');
      }
    } catch {
      useToastStore.getState().showToast('Gagal menghubungi server.', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col bg-app overflow-hidden select-none">
      <div className="p-4 bg-surface border-b border-border-subtle flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center font-bold">
            <Settings className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-text-primary">Pengaturan Toko & Konfigurasi Sistem</h2>
            <p className="text-xs text-text-secondary">Kelola profil toko, kustomisasi struk nota 58/80mm, dan tema kasir</p>
          </div>
        </div>

        <button
          onClick={handleSaveSettings}
          disabled={isSaving}
          className="px-4 py-2 bg-primary hover:bg-primary-hover text-primary-text rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-md"
        >
          <Save className="w-4 h-4" />
          <span>{isSaving ? 'Menyimpan...' : 'Simpan Pengaturan'}</span>
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-6 max-w-3xl space-y-6">
        {/* Installed Edition Banner */}
        <div className="p-5 bg-card border border-border-subtle rounded-xl shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <span className="w-2.5 h-2.5 rounded-full bg-status-success" />
              <h3 className="text-xs font-bold text-text-primary uppercase tracking-wider">Edisi Aplikasi Terpasang</h3>
            </div>
            <span className="px-2.5 py-1 rounded text-xs font-bold bg-primary/15 text-primary border border-primary/30">
              Lisensi Aktif
            </span>
          </div>

          <div className="p-4 rounded-lg bg-subtle border border-border-subtle space-y-2">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-bold text-text-primary">
                {edition?.displayName || `OmniPOS Edisi ${mode}`}
              </h4>
              <span className="font-mono text-xs text-text-secondary bg-card px-2 py-0.5 rounded border border-border-subtle">
                DB: {edition?.dbPath ? edition.dbPath.split('/').pop() : `pos_${mode.toLowerCase()}.db`}
              </span>
            </div>
            <p className="text-xs text-text-secondary leading-relaxed">
              {edition?.tagline || 'Sistem kasir desktop mandiri dengan database lokal SQLite terenkripsi.'}
            </p>
          </div>
        </div>

        {/* Store Profile & Receipt Customization */}
        <div className="p-5 bg-card border border-border-subtle rounded-xl shadow-sm space-y-4">
          <h3 className="text-xs font-bold text-text-primary uppercase tracking-wider">Profil Toko & Kustomisasi Nota Kasir</h3>
          <div className="space-y-3 text-xs">
            <div>
              <label className="block font-semibold text-text-secondary mb-1">Nama Toko:</label>
              <input
                type="text"
                value={storeName}
                onChange={(e) => setStoreName(e.target.value)}
                className="w-full px-3 py-2 bg-subtle border border-border-strong rounded-md text-text-primary font-bold"
              />
            </div>
            <div>
              <label className="block font-semibold text-text-secondary mb-1">Alamat Toko (Dicetak di Header Struk):</label>
              <input
                type="text"
                value={storeAddress}
                onChange={(e) => setStoreAddress(e.target.value)}
                className="w-full px-3 py-2 bg-subtle border border-border-strong rounded-md text-text-primary"
              />
            </div>
            <div>
              <label className="block font-semibold text-text-secondary mb-1">No. Telepon / WhatsApp Toko:</label>
              <input
                type="text"
                value={storePhone}
                onChange={(e) => setStorePhone(e.target.value)}
                className="w-full px-3 py-2 bg-subtle border border-border-strong rounded-md text-text-primary font-mono"
              />
            </div>
            <div>
              <label className="block font-semibold text-text-secondary mb-1">Catatan Kebijakan Footer Struk:</label>
              <textarea
                rows={3}
                value={receiptFooter}
                onChange={(e) => setReceiptFooter(e.target.value)}
                placeholder="Pesan ucapan terima kasih dan syarat pengembalian barang..."
                className="w-full px-3 py-2 bg-subtle border border-border-strong rounded-md text-text-primary leading-relaxed"
              />
            </div>
          </div>
        </div>

        {/* Printer Setup */}
        <div className="p-5 bg-card border border-border-subtle rounded-xl shadow-sm space-y-4">
          <h3 className="text-xs font-bold text-text-primary uppercase tracking-wider">Printer Thermal & Laci Kas</h3>
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div>
              <label className="block font-semibold text-text-secondary mb-1">Ukuran Lebar Kertas Struk:</label>
              <select
                value={paperSize}
                onChange={(e) => setPaperSize(e.target.value)}
                className="w-full px-3 py-2 bg-subtle border border-border-strong rounded-md text-text-primary font-bold"
              >
                <option value="80mm">80mm (Desktop Thermal Printer Kasir)</option>
                <option value="58mm">58mm (Kompak Mini Thermal / Mobile)</option>
              </select>
            </div>
            <div className="flex items-end">
              <button
                onClick={async () => {
                  await fetch('/api/v1/printer/drawer/open', { method: 'POST' });
                  useToastStore.getState().showToast('Sinyal buka laci kas (Cash Drawer Kick) dikirim!', 'info');
                }}
                className="w-full py-2 bg-subtle hover:bg-card-hover border border-border-subtle rounded-md font-semibold text-text-primary flex items-center justify-center gap-1.5"
              >
                <Printer className="w-4 h-4" />
                <span>Test Buka Laci Kas</span>
              </button>
            </div>
          </div>
        </div>

        {/* Theme Settings */}
        <div className="p-5 bg-card border border-border-subtle rounded-xl shadow-sm space-y-4">
          <h3 className="text-xs font-bold text-text-primary uppercase tracking-wider">Pilihan Tema Visual Toko</h3>
          <div className="grid grid-cols-2 gap-3">
            {[
              { id: 'modern-light', label: '1. Modern Light (Default Siang)', desc: 'Putih bersih & Zinc netral (Square/Shopify)' },
              { id: 'deep-zinc-dark', label: '2. Deep Zinc Dark (Malam / Bar)', desc: 'Dark Zinc netral tanpa silau (Toast style)' },
              { id: 'high-contrast-mono', label: '3. High-Contrast Monomode', desc: 'Hitam-Putih tajam untuk minimarket cepat' },
              { id: 'warm-linen', label: '4. Warm Linen & Earth', desc: 'Abu-abu hangat untuk Bakery & Artisan Cafe' },
            ].map((t) => (
              <button
                key={t.id}
                onClick={() => setTheme(t.id as any)}
                className={`p-3 rounded-lg border text-left transition-all text-xs ${
                  theme === t.id
                    ? 'bg-primary/10 border-primary shadow-sm'
                    : 'bg-subtle border-border-subtle hover:bg-card-hover'
                }`}
              >
                <p className="font-bold text-text-primary">{t.label}</p>
                <p className="text-[11px] text-text-muted mt-0.5">{t.desc}</p>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

// ==========================================
// 6. USER & STAFF ACCESS MANAGEMENT PAGE (RBAC)
// ==========================================
export const UserManagementPage: React.FC = () => {
  const { currentUser } = useAuthStore();
  const { showToast } = useToastStore();

  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');

  // Modals
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);

  // Form State (Add / Edit)
  const [fullName, setFullName] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [pinCode, setPinCode] = useState('111111');
  const [role, setRole] = useState<UserRole>('Cashier');
  const [isActive, setIsActive] = useState(true);

  const fetchUsers = async () => {
    try {
      setIsLoading(true);
      const res = await fetch('/api/v1/users');
      if (res.ok) {
        const data = await res.json();
        setUsers(data);
      }
    } catch {
      showToast('Gagal memuat daftar pengguna.', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim() || !username.trim() || !password) {
      showToast('Nama Lengkap, Username, dan Kata Sandi wajib diisi.', 'error');
      return;
    }
    if (!/^\d{6}$/.test(pinCode)) {
      showToast('PIN Kasir harus 6 digit angka.', 'error');
      return;
    }

    try {
      const res = await fetch('/api/v1/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fullName,
          username,
          password,
          pinCode,
          role,
          isActive
        })
      });

      const data = await res.json();
      if (res.ok) {
        showToast(`Karyawan ${fullName} (${role}) berhasil ditambahkan!`, 'success');
        setIsAddModalOpen(false);
        setFullName('');
        setUsername('');
        setPassword('');
        setPinCode('111111');
        setRole('Cashier');
        fetchUsers();
      } else {
        showToast(data.message || 'Gagal menambahkan karyawan.', 'error');
      }
    } catch {
      showToast('Gagal menghubungi server.', 'error');
    }
  };

  const handleUpdateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser) return;

    try {
      const payload: any = {
        fullName,
        role,
        isActive
      };
      if (password.trim()) payload.newPassword = password.trim();
      if (pinCode.trim()) payload.newPinCode = pinCode.trim();

      const res = await fetch(`/api/v1/users/${selectedUser.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (res.ok) {
        showToast(`Data akun ${fullName} berhasil diperbarui!`, 'success');
        setIsEditModalOpen(false);
        fetchUsers();
      } else {
        showToast(data.message || 'Gagal memperbarui pengguna.', 'error');
      }
    } catch {
      showToast('Gagal menghubungi server.', 'error');
    }
  };

  const handleDeactivate = async (u: User) => {
    if (u.role === 'SuperAdmin') {
      showToast('Akun Pemilik Utama tidak dapat dihapus.', 'warning');
      return;
    }

    if (!confirm(`Yakin ingin menonaktifkan akun ${u.fullName}?`)) return;

    try {
      const res = await fetch(`/api/v1/users/${u.id}`, { method: 'DELETE' });
      if (res.ok) {
        showToast(`Akun ${u.fullName} telah dinonaktifkan.`, 'info');
        fetchUsers();
      }
    } catch {
      showToast('Gagal menonaktifkan akun.', 'error');
    }
  };

  const getRoleBadge = (r: UserRole) => {
    switch (r) {
      case 'SuperAdmin':
        return <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-amber-500/15 text-amber-500 border border-amber-500/30">👑 Pemilik / SuperAdmin</span>;
      case 'Manager':
        return <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-purple-500/15 text-purple-500 border border-purple-500/30">💼 Manajer</span>;
      case 'Cashier':
        return <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-emerald-500/15 text-emerald-500 border border-emerald-500/30">💵 Kasir</span>;
      case 'InventoryStaff':
        return <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-blue-500/15 text-blue-500 border border-blue-500/30">📦 Staf Gudang</span>;
      case 'Waiter':
        return <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-orange-500/15 text-orange-500 border border-orange-500/30">🍽️ Pelayan (F&B)</span>;
      case 'KitchenStaff':
        return <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-rose-500/15 text-rose-500 border border-rose-500/30">🍳 Koki / Dapur KDS</span>;
      case 'Technician':
        return <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-indigo-500/15 text-indigo-500 border border-indigo-500/30">✂️ Teknisi / Layanan</span>;
      default:
        return <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-subtle text-text-muted">{r}</span>;
    }
  };

  const filteredUsers = users.filter(u => 
    u.fullName.toLowerCase().includes(search.toLowerCase()) ||
    u.username.toLowerCase().includes(search.toLowerCase()) ||
    u.role.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="flex-1 flex flex-col bg-app overflow-hidden select-none">
      <div className="p-4 bg-surface border-b border-border-subtle flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center font-bold">
            <UserCheck className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-text-primary">Manajemen Karyawan & Hak Akses (RBAC)</h2>
            <p className="text-xs text-text-secondary">Kelola akun kasir, staf gudang, pelayan, dan wewenang otorisasi sistem</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="relative w-60">
            <Search className="w-4 h-4 text-text-muted absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari karyawan / role..."
              className="w-full pl-9 pr-3 py-1.5 bg-subtle border border-border-subtle rounded-lg text-xs text-text-primary focus:outline-none focus:border-primary"
            />
          </div>

          <button
            onClick={() => {
              setFullName('');
              setUsername('');
              setPassword('');
              setPinCode('111111');
              setRole('Cashier');
              setIsActive(true);
              setIsAddModalOpen(true);
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary text-primary-text font-bold text-xs shadow-sm hover:bg-primary-hover transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>Tambah Karyawan</span>
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        <div className="bg-card border border-border-subtle rounded-xl overflow-hidden shadow-sm">
          <table className="w-full text-left text-xs">
            <thead className="bg-subtle text-text-muted font-bold border-b border-border-subtle uppercase tracking-wider text-[10px]">
              <tr>
                <th className="p-3">Nama Karyawan</th>
                <th className="p-3">Username</th>
                <th className="p-3">Peran & Hak Akses</th>
                <th className="p-3">Status Akun</th>
                <th className="p-3">Login Terakhir</th>
                <th className="p-3 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-subtle">
              {filteredUsers.map((u) => (
                <tr key={u.id} className="hover:bg-subtle/50 transition-colors">
                  <td className="p-3 font-bold text-text-primary">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full bg-primary/10 text-primary font-bold flex items-center justify-center text-xs">
                        {u.fullName.charAt(0).toUpperCase()}
                      </div>
                      <span>{u.fullName}</span>
                    </div>
                  </td>
                  <td className="p-3 font-mono text-text-secondary">@{u.username}</td>
                  <td className="p-3">{getRoleBadge(u.role)}</td>
                  <td className="p-3">
                    {u.isActive ? (
                      <span className="flex items-center gap-1.5 text-status-success font-semibold">
                        <span className="w-2 h-2 rounded-full bg-status-success" />
                        Aktif
                      </span>
                    ) : (
                      <span className="flex items-center gap-1.5 text-text-muted font-semibold">
                        <span className="w-2 h-2 rounded-full bg-text-muted" />
                        Nonaktif
                      </span>
                    )}
                  </td>
                  <td className="p-3 text-text-muted text-[11px]">
                    {u.lastLoginAt ? new Date(u.lastLoginAt).toLocaleString('id-ID') : 'Belum pernah'}
                  </td>
                  <td className="p-3 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      <button
                        onClick={() => {
                          setSelectedUser(u);
                          setFullName(u.fullName);
                          setUsername(u.username);
                          setRole(u.role);
                          setIsActive(u.isActive);
                          setPassword('');
                          setPinCode('');
                          setIsEditModalOpen(true);
                        }}
                        className="p-1.5 rounded bg-subtle hover:bg-card-hover border border-border-subtle text-text-secondary hover:text-text-primary"
                        title="Edit Profil / Password"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>

                      {u.role !== 'SuperAdmin' && (
                        <button
                          onClick={() => handleDeactivate(u)}
                          className="p-1.5 rounded bg-subtle hover:bg-status-danger/10 border border-border-subtle text-status-danger"
                          title="Nonaktifkan Karyawan"
                        >
                          <UserX className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}

              {filteredUsers.length === 0 && !isLoading && (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-text-muted">
                    Tidak ada data karyawan yang cocok.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal: Tambah Karyawan Baru */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-card border border-border-strong rounded-2xl shadow-2xl overflow-hidden">
            <div className="p-4 bg-surface border-b border-border-subtle flex items-center justify-between">
              <h3 className="font-bold text-sm text-text-primary flex items-center gap-2">
                <Plus className="w-4 h-4 text-primary" />
                Tambah Akun Karyawan Baru
              </h3>
              <button 
                onClick={() => setIsAddModalOpen(false)}
                className="text-text-muted hover:text-text-primary text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateUser} className="p-5 space-y-4 text-xs">
              <div>
                <label className="block font-bold text-text-secondary mb-1">Nama Lengkap Karyawan *</label>
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Contoh: Siti Rahma"
                  className="w-full px-3 py-2 bg-subtle border border-border-subtle rounded-lg text-text-primary focus:outline-none focus:border-primary"
                />
              </div>

              <div>
                <label className="block font-bold text-text-secondary mb-1">Username Login *</label>
                <input
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="kasir2"
                  className="w-full px-3 py-2 bg-subtle border border-border-subtle rounded-lg text-text-primary focus:outline-none focus:border-primary font-mono lowercase"
                />
              </div>

              <div>
                <label className="block font-bold text-text-secondary mb-1">Peran & Hak Akses *</label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value as UserRole)}
                  className="w-full px-3 py-2 bg-subtle border border-border-subtle rounded-lg text-text-primary font-semibold"
                >
                  <option value="Cashier">💵 Kasir (Kasir POS, Shift Kas, Kasbon)</option>
                  <option value="InventoryStaff">📦 Staf Gudang (Inventori, Stok Masuk/Opname)</option>
                  <option value="Waiter">🍽️ Pelayan / Pramusaji (Denah Meja & Pesanan)</option>
                  <option value="KitchenStaff">🍳 Koki / Dapur KDS (Monitor Pesanan Masuk)</option>
                  <option value="Technician">✂️ Teknisi / Barber (Status Layanan & Antrean)</option>
                  <option value="Manager">💼 Manajer (Akses Operasional & Laporan)</option>
                  <option value="SuperAdmin">👑 SuperAdmin / Owner (Akses Penuh)</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-text-secondary mb-1">Kata Sandi *</label>
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Min. 6 huruf"
                    className="w-full px-3 py-2 bg-subtle border border-border-subtle rounded-lg text-text-primary"
                  />
                </div>

                <div>
                  <label className="block font-bold text-text-secondary mb-1">PIN Kasir (6 Angka) *</label>
                  <input
                    type="password"
                    maxLength={6}
                    required
                    value={pinCode}
                    onChange={(e) => setPinCode(e.target.value.replace(/\D/g, ''))}
                    placeholder="111111"
                    className="w-full px-3 py-2 bg-subtle border border-border-subtle rounded-lg text-text-primary font-mono tracking-widest font-bold"
                  />
                </div>
              </div>

              <div className="pt-3 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 rounded-lg bg-subtle hover:bg-card-hover border border-border-subtle font-semibold text-text-secondary"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-primary text-primary-text font-bold shadow-md hover:bg-primary-hover"
                >
                  Simpan Akun Karyawan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Edit Karyawan */}
      {isEditModalOpen && selectedUser && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-card border border-border-strong rounded-2xl shadow-2xl overflow-hidden">
            <div className="p-4 bg-surface border-b border-border-subtle flex items-center justify-between">
              <h3 className="font-bold text-sm text-text-primary flex items-center gap-2">
                <Edit3 className="w-4 h-4 text-primary" />
                Edit Akun: @{selectedUser.username}
              </h3>
              <button 
                onClick={() => setIsEditModalOpen(false)}
                className="text-text-muted hover:text-text-primary text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleUpdateUser} className="p-5 space-y-4 text-xs">
              <div>
                <label className="block font-bold text-text-secondary mb-1">Nama Lengkap Karyawan</label>
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full px-3 py-2 bg-subtle border border-border-subtle rounded-lg text-text-primary"
                />
              </div>

              <div>
                <label className="block font-bold text-text-secondary mb-1">Peran & Hak Akses</label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value as UserRole)}
                  className="w-full px-3 py-2 bg-subtle border border-border-subtle rounded-lg text-text-primary font-semibold"
                >
                  <option value="Cashier">💵 Kasir (Kasir POS, Shift Kas, Kasbon)</option>
                  <option value="InventoryStaff">📦 Staf Gudang (Inventori, Stok Masuk/Opname)</option>
                  <option value="Waiter">🍽️ Pelayan / Pramusaji (Denah Meja & Pesanan)</option>
                  <option value="KitchenStaff">🍳 Koki / Dapur KDS (Monitor Pesanan Masuk)</option>
                  <option value="Technician">✂️ Teknisi / Barber (Status Layanan & Antrean)</option>
                  <option value="Manager">💼 Manajer (Akses Operasional & Laporan)</option>
                  <option value="SuperAdmin">👑 SuperAdmin / Owner (Akses Penuh)</option>
                </select>
              </div>

              <div className="p-3 bg-subtle rounded-lg border border-border-subtle space-y-2">
                <p className="font-bold text-text-primary text-[11px]">Reset Sandi / PIN (Kosongkan jika tidak diubah):</p>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Sandi Baru"
                    className="w-full px-2.5 py-1.5 bg-card border border-border-subtle rounded-md text-text-primary"
                  />
                  <input
                    type="password"
                    maxLength={6}
                    value={pinCode}
                    onChange={(e) => setPinCode(e.target.value.replace(/\D/g, ''))}
                    placeholder="PIN Baru 6-digit"
                    className="w-full px-2.5 py-1.5 bg-card border border-border-subtle rounded-md text-text-primary font-mono tracking-widest"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="isActiveToggle"
                  checked={isActive}
                  onChange={(e) => setIsActive(e.target.checked)}
                  className="w-4 h-4 text-primary rounded"
                />
                <label htmlFor="isActiveToggle" className="font-semibold text-text-primary cursor-pointer">
                  Akun Aktif (Bisa Login & Buka Shift)
                </label>
              </div>

              <div className="pt-3 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="px-4 py-2 rounded-lg bg-subtle hover:bg-card-hover border border-border-subtle font-semibold text-text-secondary"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-primary text-primary-text font-bold shadow-md hover:bg-primary-hover"
                >
                  Simpan Perubahan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
