import React, { useState, useEffect } from 'react';
import { 
  Wallet, 
  Plus, 
  Search, 
  Calendar, 
  FileSpreadsheet, 
  Printer, 
  Trash2, 
  Edit3, 
  Camera, 
  PieChart, 
  TrendingDown, 
  TrendingUp, 
  Tag, 
  Building2, 
  Zap, 
  Users, 
  Package, 
  Truck, 
  Wrench, 
  Megaphone, 
  Coffee, 
  ShoppingBag, 
  Receipt, 
  X, 
  Sliders, 
  FileText, 
  Check, 
  CreditCard,
  AlertCircle 
} from 'lucide-react';
import { 
  Expense, 
  ExpenseCategory, 
  ExpenseSummary, 
  PaymentSourceType 
} from '../types';
import { useAuthStore } from '../store/useAuthStore';
import { useShiftStore } from '../store/useShiftAndThemeStores';
import { useToastStore } from '../store/useToastStore';
import { useSettingsStore } from '../store/useSettingsStore';

const ICON_MAP: Record<string, any> = {
  Zap: Zap,
  Users: Users,
  Building2: Building2,
  Package: Package,
  Truck: Truck,
  Wrench: Wrench,
  Megaphone: Megaphone,
  Coffee: Coffee,
  ShoppingBag: ShoppingBag,
  Receipt: Receipt,
  Wallet: Wallet,
  FileText: FileText,
  Tag: Tag,
};

const PAYMENT_SOURCES: { key: PaymentSourceType; label: string; desc: string; icon: any; color: string }[] = [
  { 
    key: 'PETTY_CASH', 
    label: 'Kas Laci Kasir (Shift)', 
    desc: 'Memotong uang tunai laci shift kasir saat ini', 
    icon: Wallet, 
    color: 'border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400' 
  },
  { 
    key: 'STORE_SAFE', 
    label: 'Brankas / Kas Toko', 
    desc: 'Kas cadangan toko di luar laci kasir', 
    icon: Building2, 
    color: 'border-blue-500/30 bg-blue-500/10 text-blue-600 dark:text-blue-400' 
  },
  { 
    key: 'BANK_TRANSFER', 
    label: 'Transfer Bank Toko', 
    desc: 'Pembayaran rekening bank toko (PLN, Sewa, WiFi)', 
    icon: CreditCard, 
    color: 'border-purple-500/30 bg-purple-500/10 text-purple-600 dark:text-purple-400' 
  },
  { 
    key: 'OWNER_POCKET', 
    label: 'Talangan Pribadi / Owner', 
    desc: 'Ditalangi uang pribadi untuk di-reimburse nanti', 
    icon: Users, 
    color: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' 
  },
];

export const ExpensePage: React.FC = () => {
  const { currentUser } = useAuthStore();
  const { activeShift, fetchActiveShift } = useShiftStore();
  const storeName = (() => {
    try { return localStorage.getItem('omnipos_store_name') || 'OMNIPOS STORE'; } catch { return 'OMNIPOS STORE'; }
  })();
  const storeAddress = (() => {
    try { return localStorage.getItem('omnipos_store_address') || 'Jl. Operasional Toko No. 1'; } catch { return 'Jl. Operasional Toko No. 1'; }
  })();

  const [activeTab, setActiveTab] = useState<'transactions' | 'budget' | 'categories'>('transactions');

  // Filter States
  const today = new Date();
  const firstOfMonth = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().slice(0, 10);
  const todayStr = today.toISOString().slice(0, 10);
  const [dateFrom, setDateFrom] = useState(firstOfMonth);
  const [dateTo, setDateTo] = useState(todayStr);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedPaymentSource, setSelectedPaymentSource] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Data States
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [categories, setCategories] = useState<ExpenseCategory[]>([]);
  const [summary, setSummary] = useState<ExpenseSummary | null>(null);
  const [isLoadingExpenses, setIsLoadingExpenses] = useState(false);

  // Modal States
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [isVoucherModalOpen, setIsVoucherModalOpen] = useState(false);
  const [selectedVoucherExpense, setSelectedVoucherExpense] = useState<Expense | null>(null);
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<ExpenseCategory | null>(null);
  const [photoPreviewUrl, setPhotoPreviewUrl] = useState<string | null>(null);

  // Form Fields for Expense
  const [formAmount, setFormAmount] = useState<string>('');
  const [formCategoryName, setFormCategoryName] = useState<string>('');
  const [formCategoryId, setFormCategoryId] = useState<string>('');
  const [formPaymentSource, setFormPaymentSource] = useState<PaymentSourceType>('PETTY_CASH');
  const [formPayee, setFormPayee] = useState<string>('');
  const [formDescription, setFormDescription] = useState<string>('');
  const [formExpenseDate, setFormExpenseDate] = useState<string>(todayStr);
  const [formReceiptPhoto, setFormReceiptPhoto] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Category Form Fields
  const [catName, setCatName] = useState('');
  const [catCode, setCatCode] = useState('');
  const [catIcon, setCatIcon] = useState('Receipt');
  const [catColor, setCatColor] = useState('#3b82f6');
  const [catBudget, setCatBudget] = useState('0');
  const [catDesc, setCatDesc] = useState('');
  const [isSavingCat, setIsSavingCat] = useState(false);

  // Load initial data
  useEffect(() => {
    fetchActiveShift();
    fetchCategories();
    fetchSummaryData();
    fetchExpensesList();
  }, []);

  const fetchCategories = async () => {
    try {
      const res = await fetch('/api/v1/expenses/categories');
      if (res.ok) {
        const data = await res.json();
        setCategories(data);
        if (data.length > 0 && !formCategoryName) {
          setFormCategoryName(data[0].name);
          setFormCategoryId(data[0].id);
        }
      }
    } catch {
      useToastStore.getState().showToast('Gagal memuat kategori biaya.', 'error');
    }
  };

  const fetchExpensesList = async () => {
    setIsLoadingExpenses(true);
    try {
      const q = new URLSearchParams({
        from: dateFrom,
        to: dateTo,
        categoryId: selectedCategory,
        paymentSource: selectedPaymentSource,
        search: searchQuery,
        limit: '100'
      });
      const res = await fetch(`/api/v1/expenses?${q.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setExpenses(data.items || []);
      }
    } catch {
      useToastStore.getState().showToast('Gagal memuat daftar pengeluaran.', 'error');
    } finally {
      setIsLoadingExpenses(false);
    }
  };

  const fetchSummaryData = async () => {
    try {
      const q = new URLSearchParams({ from: dateFrom, to: dateTo });
      const res = await fetch(`/api/v1/expenses/summary?${q.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setSummary(data);
      }
    } catch {
      // ignore
    }
  };

  const handleApplyFilter = () => {
    fetchExpensesList();
    fetchSummaryData();
  };

  const handleQuickRange = (range: 'today' | 'week' | 'month' | 'all') => {
    const now = new Date();
    let from = '', to = now.toISOString().slice(0, 10);
    if (range === 'today') { from = to; }
    else if (range === 'week') { const d = new Date(now); d.setDate(d.getDate() - 7); from = d.toISOString().slice(0, 10); }
    else if (range === 'month') { from = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10); }
    else { from = '2020-01-01'; to = '2099-12-31'; }
    setDateFrom(from);
    setDateTo(to);
    
    setTimeout(() => {
      const q = new URLSearchParams({
        from,
        to,
        categoryId: selectedCategory,
        paymentSource: selectedPaymentSource,
        search: searchQuery,
        limit: '100'
      });
      fetch(`/api/v1/expenses?${q.toString()}`)
        .then(r => r.json())
        .then(d => setExpenses(d.items || []));
      fetch(`/api/v1/expenses/summary?from=${from}&to=${to}`)
        .then(r => r.json())
        .then(d => setSummary(d));
    }, 50);
  };

  // Open Create Modal
  const handleOpenCreateModal = () => {
    setEditingExpense(null);
    setFormAmount('');
    const defaultCat = categories[0];
    setFormCategoryName(defaultCat ? defaultCat.name : 'Operasional');
    setFormCategoryId(defaultCat ? defaultCat.id : '');
    setFormPaymentSource(activeShift ? 'PETTY_CASH' : 'STORE_SAFE');
    setFormPayee('');
    setFormDescription('');
    setFormExpenseDate(todayStr);
    setFormReceiptPhoto(null);
    setIsFormModalOpen(true);
  };

  // Open Edit Modal
  const handleOpenEditModal = (exp: Expense) => {
    setEditingExpense(exp);
    setFormAmount(exp.amount.toString());
    setFormCategoryName(exp.categoryName);
    setFormCategoryId(exp.categoryId || '');
    setFormPaymentSource(exp.paymentSource as PaymentSourceType);
    setFormPayee(exp.payee || '');
    setFormDescription(exp.description);
    setFormExpenseDate(exp.expenseDate.slice(0, 10));
    setFormReceiptPhoto(exp.receiptPhotoBase64 || null);
    setIsFormModalOpen(true);
  };

  // Handle Photo File Upload
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        useToastStore.getState().showToast('Ukuran foto terlalu besar (maksimal 2MB).', 'error');
        return;
      }
      const reader = new FileReader();
      reader.onload = () => {
        setFormReceiptPhoto(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  // Save Expense
  const handleSaveExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    const amountNum = parseFloat(formAmount);
    if (isNaN(amountNum) || amountNum <= 0) {
      useToastStore.getState().showToast('Nominal pengeluaran harus lebih besar dari Rp 0.', 'error');
      return;
    }
    if (!formDescription.trim()) {
      useToastStore.getState().showToast('Keterangan pengeluaran wajib diisi.', 'error');
      return;
    }

    setIsSaving(true);
    try {
      if (editingExpense) {
        // Update
        const payload = {
          expenseDate: new Date(formExpenseDate).toISOString(),
          categoryId: formCategoryId,
          categoryName: formCategoryName,
          amount: amountNum,
          paymentSource: formPaymentSource,
          payee: formPayee,
          description: formDescription,
          receiptPhotoBase64: formReceiptPhoto
        };
        const res = await fetch(`/api/v1/expenses/${editingExpense.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        if (res.ok) {
          useToastStore.getState().showToast('Pengeluaran berhasil diperbarui!', 'success');
          setIsFormModalOpen(false);
          fetchExpensesList();
          fetchSummaryData();
          fetchActiveShift();
        } else {
          const err = await res.json();
          useToastStore.getState().showToast(err.message || 'Gagal memperbarui pengeluaran.', 'error');
        }
      } else {
        // Create
        const payload = {
          expenseDate: new Date(formExpenseDate).toISOString(),
          categoryId: formCategoryId,
          categoryName: formCategoryName,
          amount: amountNum,
          paymentSource: formPaymentSource,
          shiftId: activeShift?.id || null,
          payee: formPayee,
          description: formDescription,
          receiptPhotoBase64: formReceiptPhoto,
          recordedByUserId: currentUser?.id || 'admin',
          recordedByUserName: currentUser?.fullName || currentUser?.username || 'Kasir'
        };
        const res = await fetch('/api/v1/expenses', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        if (res.ok) {
          const created = await res.json();
          useToastStore.getState().showToast(`Pengeluaran ${created.expenseNumber} berhasil dicatat!`, 'success');
          setIsFormModalOpen(false);
          fetchExpensesList();
          fetchSummaryData();
          fetchActiveShift();
          // Open voucher for printing
          setSelectedVoucherExpense(created);
          setIsVoucherModalOpen(true);
        } else {
          const err = await res.json();
          useToastStore.getState().showToast(err.message || 'Gagal menyimpan pengeluaran.', 'error');
        }
      }
    } catch {
      useToastStore.getState().showToast('Terjadi kesalahan saat menyimpan pengeluaran.', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  // Delete Expense
  const handleDeleteExpense = async (id: string, number: string) => {
    if (!window.confirm(`Yakin ingin menghapus catatan pengeluaran ${number}?`)) return;
    try {
      const res = await fetch(`/api/v1/expenses/${id}`, { method: 'DELETE' });
      if (res.ok) {
        useToastStore.getState().showToast(`Pengeluaran ${number} berhasil dihapus.`, 'success');
        fetchExpensesList();
        fetchSummaryData();
        fetchActiveShift();
      } else {
        useToastStore.getState().showToast('Gagal menghapus pengeluaran.', 'error');
      }
    } catch {
      useToastStore.getState().showToast('Terjadi kesalahan koneksi.', 'error');
    }
  };

  // Export CSV
  const handleExportCsv = () => {
    const q = new URLSearchParams({
      from: dateFrom,
      to: dateTo,
      categoryName: selectedCategory,
      paymentSource: selectedPaymentSource
    });
    window.open(`/api/v1/expenses/export-csv?${q.toString()}`, '_blank');
    useToastStore.getState().showToast('Mengunduh rekapitulasi pengeluaran CSV...', 'info');
  };

  // Category Save
  const handleSaveCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!catName.trim()) {
      useToastStore.getState().showToast('Nama kategori wajib diisi.', 'error');
      return;
    }
    setIsSavingCat(true);
    try {
      const budgetNum = parseFloat(catBudget) || 0;
      if (editingCategory) {
        const res = await fetch(`/api/v1/expenses/categories/${editingCategory.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: catName,
            code: catCode,
            iconName: catIcon,
            colorTag: catColor,
            monthlyBudget: budgetNum,
            description: catDesc
          })
        });
        if (res.ok) {
          useToastStore.getState().showToast('Kategori biaya berhasil diperbarui!', 'success');
          setIsCategoryModalOpen(false);
          fetchCategories();
          fetchSummaryData();
        }
      } else {
        const res = await fetch('/api/v1/expenses/categories', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: catName,
            code: catCode,
            iconName: catIcon,
            colorTag: catColor,
            monthlyBudget: budgetNum,
            description: catDesc
          })
        });
        if (res.ok) {
          useToastStore.getState().showToast('Kategori biaya baru berhasil ditambahkan!', 'success');
          setIsCategoryModalOpen(false);
          fetchCategories();
          fetchSummaryData();
        }
      }
    } catch {
      useToastStore.getState().showToast('Gagal menyimpan kategori biaya.', 'error');
    } finally {
      setIsSavingCat(false);
    }
  };

  const handleDeleteCategory = async (id: string, name: string) => {
    if (!window.confirm(`Hapus kategori "${name}"? Data pengeluaran yang sudah ada tidak akan hilang.`)) return;
    try {
      const res = await fetch(`/api/v1/expenses/categories/${id}`, { method: 'DELETE' });
      if (res.ok) {
        useToastStore.getState().showToast(`Kategori "${name}" dihapus.`, 'success');
        fetchCategories();
        fetchSummaryData();
      }
    } catch {
      useToastStore.getState().showToast('Gagal menghapus kategori.', 'error');
    }
  };

  return (
    <div className="flex-1 flex flex-col bg-app overflow-hidden select-none">
      
      {/* Top Header */}
      <div className="p-4 bg-surface border-b border-border-subtle flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center font-bold">
            <Wallet className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-base font-bold text-text-primary">Biaya & Beban Toko (Expense & Petty Cash)</h1>
            <p className="text-xs text-text-secondary">Pencatatan kas kecil, operasional harian, anggaran beban, dan slip kas keluar</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Tab Switcher */}
          <div className="flex p-1 bg-subtle rounded-lg border border-border-subtle text-xs font-bold">
            <button
              onClick={() => setActiveTab('transactions')}
              className={`px-3 py-1.5 rounded-md transition-all flex items-center gap-1.5 ${
                activeTab === 'transactions'
                  ? 'bg-card text-text-primary shadow-xs'
                  : 'text-text-secondary hover:text-text-primary'
              }`}
            >
              <FileText className="w-3.5 h-3.5 text-primary" />
              <span>Daftar Pengeluaran</span>
            </button>
            <button
              onClick={() => setActiveTab('budget')}
              className={`px-3 py-1.5 rounded-md transition-all flex items-center gap-1.5 ${
                activeTab === 'budget'
                  ? 'bg-card text-text-primary shadow-xs'
                  : 'text-text-secondary hover:text-text-primary'
              }`}
            >
              <PieChart className="w-3.5 h-3.5 text-purple-500" />
              <span>Analisis Anggaran</span>
            </button>
            <button
              onClick={() => setActiveTab('categories')}
              className={`px-3 py-1.5 rounded-md transition-all flex items-center gap-1.5 ${
                activeTab === 'categories'
                  ? 'bg-card text-text-primary shadow-xs'
                  : 'text-text-secondary hover:text-text-primary'
              }`}
            >
              <Tag className="w-3.5 h-3.5 text-emerald-500" />
              <span>Master Kategori</span>
            </button>
          </div>

          <button
            onClick={handleExportCsv}
            className="px-3 py-2 bg-card hover:bg-card-hover border border-border-subtle rounded-lg text-xs font-bold text-text-secondary flex items-center gap-1.5 transition-all"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
            <span>Ekspor CSV</span>
          </button>

          <button
            onClick={handleOpenCreateModal}
            className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-lg text-xs font-bold flex items-center gap-2 shadow-sm transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>Catat Pengeluaran Baru</span>
          </button>
        </div>
      </div>

      {/* KPI Cards Row */}
      <div className="p-4 bg-surface border-b border-border-subtle grid grid-cols-2 lg:grid-cols-4 gap-3">
        
        {/* KPI 1: Total Bulan Ini */}
        <div className="p-3.5 rounded-xl bg-card border border-border-subtle shadow-xs space-y-1">
          <div className="flex items-center justify-between text-xs text-text-secondary">
            <span className="font-semibold">Beban Bulan Ini</span>
            {summary && summary.monthGrowthPercent !== 0 && (
              <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded flex items-center gap-0.5 ${
                summary.monthGrowthPercent > 0 
                  ? 'bg-rose-500/10 text-rose-600' 
                  : 'bg-emerald-500/10 text-emerald-600'
              }`}>
                {summary.monthGrowthPercent > 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                {summary.monthGrowthPercent > 0 ? `+${summary.monthGrowthPercent}%` : `${summary.monthGrowthPercent}%`}
              </span>
            )}
          </div>
          <p className="text-xl font-bold font-mono text-text-primary tabular-nums">
            Rp {(summary?.totalThisMonth || 0).toLocaleString('id-ID')}
          </p>
          <p className="text-[10px] text-text-muted">
            Bulan lalu: Rp {(summary?.totalLastMonth || 0).toLocaleString('id-ID')}
          </p>
        </div>

        {/* KPI 2: Total Hari Ini */}
        <div className="p-3.5 rounded-xl bg-card border border-border-subtle shadow-xs space-y-1">
          <div className="flex items-center justify-between text-xs text-text-secondary">
            <span className="font-semibold">Beban Hari Ini</span>
            <span className="text-[10px] font-mono text-text-muted">{today.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}</span>
          </div>
          <p className="text-xl font-bold font-mono text-amber-600 dark:text-amber-400 tabular-nums">
            Rp {(summary?.totalToday || 0).toLocaleString('id-ID')}
          </p>
          <p className="text-[10px] text-text-muted">
            Pengeluaran kas tercatat hari ini
          </p>
        </div>

        {/* KPI 3: Kas Keluar Shift Aktif */}
        <div className="p-3.5 rounded-xl bg-card border border-border-subtle shadow-xs space-y-1">
          <div className="flex items-center justify-between text-xs text-text-secondary">
            <span className="font-semibold">Kas Laci Shift Aktif</span>
            {activeShift ? (
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-600">
                LIVE
              </span>
            ) : (
              <span className="text-[10px] font-mono text-text-muted">Shift Tutup</span>
            )}
          </div>
          <p className="text-xl font-bold font-mono text-rose-600 dark:text-rose-400 tabular-nums">
            Rp {(summary?.totalPettyCashShift || 0).toLocaleString('id-ID')}
          </p>
          <p className="text-[10px] text-text-muted truncate">
            {activeShift ? `Kasir: ${activeShift.cashierName}` : 'Tidak ada shift kasir berjalan'}
          </p>
        </div>

        {/* KPI 4: Kategori Beban Terbesar */}
        <div className="p-3.5 rounded-xl bg-card border border-border-subtle shadow-xs space-y-1">
          <div className="flex items-center justify-between text-xs text-text-secondary">
            <span className="font-semibold">Kategori Terbesar</span>
            <span className="text-[10px] font-mono text-primary font-bold">
              {summary?.categoryBreakdown?.[0]?.percentageOfTotal ? `${summary.categoryBreakdown[0].percentageOfTotal}%` : '-'}
            </span>
          </div>
          <p className="text-sm font-bold text-text-primary truncate">
            {summary?.categoryBreakdown?.[0]?.categoryName || 'Belum ada data'}
          </p>
          <p className="text-[10px] font-mono text-text-muted">
            {summary?.categoryBreakdown?.[0]?.totalAmount 
              ? `Rp ${summary.categoryBreakdown[0].totalAmount.toLocaleString('id-ID')}` 
              : 'Periode ini'}
          </p>
        </div>

      </div>

      {/* Main Workspace Area */}
      <div className="flex-1 overflow-hidden flex flex-col p-4 space-y-4">
        
        {/* ========================================================================= */}
        {/* TAB 1: TRANSAKSI & DAFTAR PENGELUARAN */}
        {/* ========================================================================= */}
        {activeTab === 'transactions' && (
          <div className="flex-1 flex flex-col bg-card border border-border-subtle rounded-2xl overflow-hidden shadow-sm">
            
            {/* Filter Bar */}
            <div className="p-3 border-b border-border-subtle bg-subtle flex items-center justify-between gap-3 flex-wrap">
              {/* Quick Date Pills */}
              <div className="flex items-center gap-1">
                {[
                  { key: 'today', label: 'Hari Ini' },
                  { key: 'week', label: '7 Hari' },
                  { key: 'month', label: 'Bulan Ini' },
                  { key: 'all', label: 'Semua' },
                ].map((r) => (
                  <button
                    key={r.key}
                    onClick={() => handleQuickRange(r.key as any)}
                    className="px-2.5 py-1 rounded-md bg-card hover:bg-primary/10 hover:text-primary border border-border-subtle text-xs font-semibold text-text-secondary transition-all"
                  >
                    {r.label}
                  </button>
                ))}
              </div>

              {/* Date Input Pickers */}
              <div className="flex items-center gap-1.5">
                <input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  className="px-2 py-1 bg-card border border-border-strong rounded text-xs font-mono text-text-primary focus:outline-none focus:border-primary"
                />
                <span className="text-xs text-text-muted">s/d</span>
                <input
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                  className="px-2 py-1 bg-card border border-border-strong rounded text-xs font-mono text-text-primary focus:outline-none focus:border-primary"
                />
              </div>

              {/* Category Filter */}
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="px-2.5 py-1 bg-card border border-border-strong rounded text-xs text-text-primary focus:outline-none focus:border-primary"
              >
                <option value="all">Semua Kategori</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.name}>{c.name}</option>
                ))}
              </select>

              {/* Payment Source Filter */}
              <select
                value={selectedPaymentSource}
                onChange={(e) => setSelectedPaymentSource(e.target.value)}
                className="px-2.5 py-1 bg-card border border-border-strong rounded text-xs text-text-primary focus:outline-none focus:border-primary"
              >
                <option value="all">Semua Sumber Dana</option>
                {PAYMENT_SOURCES.map((s) => (
                  <option key={s.key} value={s.key}>{s.label}</option>
                ))}
              </select>

              {/* Search Box */}
              <div className="relative flex-1 min-w-[180px]">
                <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-text-muted" />
                <input
                  type="text"
                  placeholder="Cari nota, keperluan, vendor..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleApplyFilter()}
                  className="w-full pl-8 pr-3 py-1 bg-card border border-border-strong rounded text-xs text-text-primary placeholder:text-text-muted focus:outline-none focus:border-primary"
                />
              </div>

              <button
                onClick={handleApplyFilter}
                className="px-3 py-1 bg-primary hover:bg-primary-hover text-primary-text rounded text-xs font-bold transition-all shadow-xs"
              >
                Terapkan
              </button>
            </div>

            {/* Table Area */}
            <div className="flex-1 overflow-y-auto">
              {isLoadingExpenses ? (
                <div className="p-12 text-center text-xs text-text-muted">Memuat data pengeluaran...</div>
              ) : expenses.length === 0 ? (
                <div className="p-12 text-center space-y-3">
                  <div className="w-12 h-12 rounded-full bg-subtle flex items-center justify-center mx-auto text-text-muted">
                    <Receipt className="w-6 h-6" />
                  </div>
                  <p className="text-xs font-bold text-text-primary">Belum ada pengeluaran pada periode ini</p>
                  <p className="text-xs text-text-muted">Klik tombol "Catat Pengeluaran Baru" untuk mencatat beban operasional toko.</p>
                  <button
                    onClick={handleOpenCreateModal}
                    className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-lg text-xs font-bold transition-all shadow-xs"
                  >
                    + Catat Pengeluaran Pertama
                  </button>
                </div>
              ) : (
                <table className="w-full text-left text-xs">
                  <thead className="sticky top-0 bg-surface border-b border-border-subtle text-text-secondary uppercase text-[10px] tracking-wider select-none font-bold">
                    <tr>
                      <th className="py-2.5 px-3">No. Nota</th>
                      <th className="py-2.5 px-3">Tanggal</th>
                      <th className="py-2.5 px-3">Kategori</th>
                      <th className="py-2.5 px-3">Penerima / Keperluan</th>
                      <th className="py-2.5 px-3">Sumber Pembayaran</th>
                      <th className="py-2.5 px-3 text-right">Nominal</th>
                      <th className="py-2.5 px-3 text-center">Bukti Nota</th>
                      <th className="py-2.5 px-3">Dicatat Oleh</th>
                      <th className="py-2.5 px-3 text-center">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border-subtle">
                    {expenses.map((item) => {
                      const srcInfo = PAYMENT_SOURCES.find(s => s.key === item.paymentSource);
                      const catInfo = categories.find(c => c.name === item.categoryName);
                      const IconComponent = catInfo && ICON_MAP[catInfo.iconName] ? ICON_MAP[catInfo.iconName] : Receipt;

                      return (
                        <tr key={item.id} className="hover:bg-subtle/60 transition-colors">
                          <td className="py-2.5 px-3 font-mono font-bold text-primary">
                            {item.expenseNumber}
                          </td>
                          <td className="py-2.5 px-3 text-text-secondary font-mono">
                            {new Date(item.expenseDate).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })}
                            <span className="text-[10px] text-text-muted block">
                              {new Date(item.expenseDate).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </td>
                          <td className="py-2.5 px-3">
                            <span 
                              className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[11px] font-bold"
                              style={{ 
                                backgroundColor: `${catInfo?.colorTag || '#3b82f6'}15`, 
                                color: catInfo?.colorTag || '#3b82f6',
                                border: `1px solid ${catInfo?.colorTag || '#3b82f6'}30`
                              }}
                            >
                              <IconComponent className="w-3 h-3" />
                              <span>{item.categoryName}</span>
                            </span>
                          </td>
                          <td className="py-2.5 px-3">
                            {item.payee && (
                              <span className="font-bold text-text-primary block text-xs">
                                {item.payee}
                              </span>
                            )}
                            <span className="text-text-secondary text-[11px] line-clamp-1" title={item.description}>
                              {item.description}
                            </span>
                          </td>
                          <td className="py-2.5 px-3">
                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold border ${srcInfo?.color || 'bg-subtle text-text-secondary'}`}>
                              {srcInfo ? <srcInfo.icon className="w-3 h-3" /> : <Wallet className="w-3 h-3" />}
                              <span>{srcInfo?.label || item.paymentSource}</span>
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono font-bold text-sm text-text-primary">
                            Rp {item.amount.toLocaleString('id-ID')}
                          </td>
                          <td className="py-2.5 px-3 text-center">
                            {item.receiptPhotoBase64 ? (
                              <button
                                onClick={() => setPhotoPreviewUrl(item.receiptPhotoBase64!)}
                                className="w-8 h-8 rounded-lg overflow-hidden border border-border-subtle hover:border-primary transition-all inline-block shadow-xs"
                                title="Lihat Foto Nota"
                              >
                                <img 
                                  src={item.receiptPhotoBase64} 
                                  alt="Nota" 
                                  className="w-full h-full object-cover" 
                                />
                              </button>
                            ) : (
                              <span className="text-[10px] text-text-muted italic">-</span>
                            )}
                          </td>
                          <td className="py-2.5 px-3 text-text-secondary text-[11px]">
                            {item.recordedByUserName || 'Admin'}
                          </td>
                          <td className="py-2.5 px-3 text-center">
                            <div className="flex items-center justify-center gap-1">
                              <button
                                onClick={() => {
                                  setSelectedVoucherExpense(item);
                                  setIsVoucherModalOpen(true);
                                }}
                                className="p-1 rounded bg-subtle hover:bg-primary/10 text-text-secondary hover:text-primary transition-all"
                                title="Cetak Slip Kas Keluar"
                              >
                                <Printer className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => handleOpenEditModal(item)}
                                className="p-1 rounded bg-subtle hover:bg-amber-500/10 text-text-secondary hover:text-amber-600 transition-all"
                                title="Edit Pengeluaran"
                              >
                                <Edit3 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => handleDeleteExpense(item.id, item.expenseNumber)}
                                className="p-1 rounded bg-subtle hover:bg-rose-500/10 text-text-secondary hover:text-rose-600 transition-all"
                                title="Hapus Pengeluaran"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot className="sticky bottom-0 bg-surface border-t border-border-strong font-bold">
                    <tr>
                      <td colSpan={5} className="py-2.5 px-3 text-text-secondary text-right">
                        Total {expenses.length} Transaksi:
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono text-base text-primary">
                        Rp {expenses.reduce((s, x) => s + x.amount, 0).toLocaleString('id-ID')}
                      </td>
                      <td colSpan={3}></td>
                    </tr>
                  </tfoot>
                </table>
              )}
            </div>

          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 2: ANALISIS ANGGARAN (BUDGET VS ACTUAL) */}
        {/* ========================================================================= */}
        {activeTab === 'budget' && (
          <div className="flex-1 overflow-y-auto space-y-4">
            
            {/* Top Row: Sumber Pembayaran & Ringkasan */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              
              {/* Payment Source Distribution */}
              <div className="bg-card border border-border-subtle rounded-2xl p-4 shadow-sm space-y-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-text-primary flex items-center gap-1.5">
                  <CreditCard className="w-4 h-4 text-primary" />
                  <span>Distribusi Sumber Pembayaran Beban</span>
                </h3>
                <div className="space-y-2">
                  {summary?.paymentSourceBreakdown?.map((src) => (
                    <div key={src.paymentSource} className="space-y-1">
                      <div className="flex justify-between text-xs">
                        <span className="font-semibold text-text-primary">{src.label} ({src.count}x)</span>
                        <span className="font-mono font-bold text-text-primary">
                          Rp {src.totalAmount.toLocaleString('id-ID')} ({src.percentage}%)
                        </span>
                      </div>
                      <div className="h-2 rounded-full bg-subtle overflow-hidden">
                        <div 
                          className="h-full bg-primary rounded-full transition-all"
                          style={{ width: `${src.percentage}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Total Expenses vs Sales Ratio */}
              <div className="bg-card border border-border-subtle rounded-2xl p-4 shadow-sm space-y-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-text-primary flex items-center gap-1.5">
                  <TrendingDown className="w-4 h-4 text-amber-500" />
                  <span>Efisiensi Beban Operasional</span>
                </h3>
                <div className="p-4 rounded-xl bg-subtle space-y-2">
                  <p className="text-xs text-text-secondary">
                    Total beban operasional periode ini tercatat <strong className="text-text-primary font-mono">Rp {(summary?.periodTotal || 0).toLocaleString('id-ID')}</strong> dari total <strong className="text-text-primary">{summary?.periodCount || 0}</strong> transaksi pengeluaran.
                  </p>
                  <p className="text-[11px] text-text-muted">
                    Semua pengeluaran ini langsung diperhitungkan pada pos <em>Operating Expenses</em> di Laporan Laba Rugi (P&L) untuk memberikan nilai laba bersih riil toko Anda.
                  </p>
                </div>
              </div>

            </div>

            {/* Budget vs Actual Breakdown per Category */}
            <div className="bg-card border border-border-subtle rounded-2xl p-4 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-text-primary flex items-center gap-1.5">
                    <Sliders className="w-4 h-4 text-purple-500" />
                    <span>Realisasi Pengeluaran vs Target Pagu Anggaran (Budget)</span>
                  </h3>
                  <p className="text-[11px] text-text-secondary">Pantau apakah biaya operasional toko masih dalam batas anggaran bulanan</p>
                </div>
                <button
                  onClick={() => setActiveTab('categories')}
                  className="px-3 py-1.5 bg-subtle hover:bg-card border border-border-subtle rounded-lg text-xs font-bold text-text-secondary transition-all"
                >
                  Atur Pagu Anggaran
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {summary?.categoryBreakdown?.map((cat) => {
                  const isOver = cat.monthlyBudget > 0 && cat.totalAmount > cat.monthlyBudget;
                  const isNear = cat.monthlyBudget > 0 && cat.totalAmount >= cat.monthlyBudget * 0.8 && !isOver;

                  return (
                    <div 
                      key={cat.categoryId}
                      className="p-3.5 rounded-xl bg-subtle border border-border-subtle space-y-2.5"
                    >
                      <div className="flex items-center justify-between">
                        <span 
                          className="px-2 py-0.5 rounded text-xs font-bold"
                          style={{ 
                            backgroundColor: `${cat.colorTag}15`, 
                            color: cat.colorTag,
                            border: `1px solid ${cat.colorTag}30` 
                          }}
                        >
                          {cat.categoryName}
                        </span>
                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                          isOver 
                            ? 'bg-rose-500/10 text-rose-600' 
                            : isNear 
                            ? 'bg-amber-500/10 text-amber-600'
                            : 'bg-emerald-500/10 text-emerald-600'
                        }`}>
                          {cat.monthlyBudget > 0 ? `${cat.budgetUsagePercent}% Anggaran` : `${cat.percentageOfTotal}% dari Total`}
                        </span>
                      </div>

                      <div className="flex justify-between items-baseline">
                        <span className="text-base font-bold font-mono text-text-primary">
                          Rp {cat.totalAmount.toLocaleString('id-ID')}
                        </span>
                        <span className="text-xs font-mono text-text-muted">
                          {cat.monthlyBudget > 0 
                            ? `Pagu: Rp ${cat.monthlyBudget.toLocaleString('id-ID')}` 
                            : 'Tanpa Pagu'}
                        </span>
                      </div>

                      {cat.monthlyBudget > 0 && (
                        <div className="space-y-1">
                          <div className="h-2 rounded-full bg-border-subtle overflow-hidden">
                            <div 
                              className={`h-full rounded-full transition-all ${
                                isOver ? 'bg-rose-500' : isNear ? 'bg-amber-500' : 'bg-emerald-500'
                              }`}
                              style={{ width: `${Math.min(100, cat.budgetUsagePercent)}%` }}
                            />
                          </div>
                          {isOver && (
                            <p className="text-[10px] text-rose-500 font-bold flex items-center gap-1">
                              <AlertCircle className="w-3 h-3" />
                              Melebihi pagu sebesar Rp {(cat.totalAmount - cat.monthlyBudget).toLocaleString('id-ID')}
                            </p>
                          )}
                        </div>
                      )}

                    </div>
                  );
                })}
              </div>

            </div>

          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 3: MASTER KATEGORI BIAYA */}
        {/* ========================================================================= */}
        {activeTab === 'categories' && (
          <div className="flex-1 flex flex-col bg-card border border-border-subtle rounded-2xl overflow-hidden shadow-sm">
            <div className="p-3 border-b border-border-subtle bg-subtle flex items-center justify-between">
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-text-primary">
                  Master Kategori Biaya & Pagu Anggaran Bulanan
                </h3>
                <p className="text-[11px] text-text-secondary">Kelola pos pengeluaran, warna label, ikon, dan limit budget toko</p>
              </div>
              <button
                onClick={() => {
                  setEditingCategory(null);
                  setCatName('');
                  setCatCode('');
                  setCatIcon('Receipt');
                  setCatColor('#3b82f6');
                  setCatBudget('500000');
                  setCatDesc('');
                  setIsCategoryModalOpen(true);
                }}
                className="px-3 py-1.5 bg-primary hover:bg-primary-hover text-primary-text rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-xs"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Tambah Kategori</span>
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {categories.map((cat) => {
                  const IconComp = ICON_MAP[cat.iconName] || Receipt;
                  return (
                    <div 
                      key={cat.id}
                      className="p-3.5 rounded-xl bg-subtle border border-border-subtle flex flex-col justify-between space-y-3"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-2.5">
                          <div 
                            className="w-9 h-9 rounded-lg flex items-center justify-center"
                            style={{ backgroundColor: `${cat.colorTag}20`, color: cat.colorTag }}
                          >
                            <IconComp className="w-4 h-4" />
                          </div>
                          <div>
                            <h4 className="text-xs font-bold text-text-primary">{cat.name}</h4>
                            <span className="text-[10px] font-mono text-text-muted font-bold">[{cat.code}]</span>
                          </div>
                        </div>

                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => {
                              setEditingCategory(cat);
                              setCatName(cat.name);
                              setCatCode(cat.code);
                              setCatIcon(cat.iconName);
                              setCatColor(cat.colorTag);
                              setCatBudget(cat.monthlyBudget.toString());
                              setCatDesc(cat.description || '');
                              setIsCategoryModalOpen(true);
                            }}
                            className="p-1 rounded bg-card hover:bg-primary/10 text-text-secondary hover:text-primary transition-all"
                            title="Edit Kategori"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          {!cat.isDefault && (
                            <button
                              onClick={() => handleDeleteCategory(cat.id, cat.name)}
                              className="p-1 rounded bg-card hover:bg-rose-500/10 text-text-secondary hover:text-rose-600 transition-all"
                              title="Hapus Kategori"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>

                      {cat.description && (
                        <p className="text-[11px] text-text-secondary line-clamp-2">{cat.description}</p>
                      )}

                      <div className="pt-2 border-t border-border-subtle flex items-center justify-between text-xs">
                        <span className="text-text-muted">Pagu Anggaran:</span>
                        <span className="font-mono font-bold text-primary">
                          {cat.monthlyBudget > 0 ? `Rp ${cat.monthlyBudget.toLocaleString('id-ID')} / bln` : 'Tidak Dibatasi'}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

      </div>

      {/* ========================================================================= */}
      {/* MODAL 1: CATAT / EDIT PENGELUARAN */}
      {/* ========================================================================= */}
      {isFormModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-card border border-border-strong rounded-2xl max-w-lg w-full shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            
            {/* Modal Header */}
            <div className="p-4 bg-surface border-b border-border-subtle flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-500 flex items-center justify-center">
                  <Wallet className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-text-primary">
                    {editingExpense ? 'Edit Catatan Pengeluaran' : 'Catat Pengeluaran Baru'}
                  </h3>
                  <p className="text-[11px] text-text-secondary">Input bukti kas keluar & biaya operasional toko</p>
                </div>
              </div>
              <button
                onClick={() => setIsFormModalOpen(false)}
                className="p-1.5 rounded-lg hover:bg-subtle text-text-muted hover:text-text-primary"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Form Body */}
            <form onSubmit={handleSaveExpense} className="p-5 overflow-y-auto space-y-4 flex-1">
              
              {/* 1. Nominal (Rp) */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-text-primary">
                  Nominal Pengeluaran (Rp) <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-bold text-text-muted">Rp</span>
                  <input
                    type="number"
                    required
                    min="1"
                    placeholder="0"
                    value={formAmount}
                    onChange={(e) => setFormAmount(e.target.value)}
                    className="w-full pl-10 pr-3 py-2.5 bg-subtle border border-border-strong rounded-xl text-lg font-bold font-mono text-text-primary focus:outline-none focus:border-primary"
                  />
                </div>
                {/* Quick nominal chips */}
                <div className="flex items-center gap-1.5 flex-wrap pt-1">
                  {[10000, 20000, 50000, 100000, 200000, 500000].map((amt) => (
                    <button
                      key={amt}
                      type="button"
                      onClick={() => setFormAmount(amt.toString())}
                      className="px-2 py-0.5 rounded bg-subtle hover:bg-primary/10 hover:text-primary border border-border-subtle text-[11px] font-mono font-semibold text-text-secondary transition-all"
                    >
                      +{(amt / 1000).toLocaleString('id-ID')}k
                    </button>
                  ))}
                </div>
              </div>

              {/* 2. Sumber Pembayaran (Payment Source) */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-text-primary">
                  Sumber Dana Pembayaran <span className="text-rose-500">*</span>
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {PAYMENT_SOURCES.map((s) => {
                    const isSelected = formPaymentSource === s.key;
                    return (
                      <button
                        key={s.key}
                        type="button"
                        onClick={() => setFormPaymentSource(s.key)}
                        className={`p-2.5 rounded-xl border text-left flex flex-col justify-between gap-1 transition-all ${
                          isSelected 
                            ? `${s.color} border-current ring-1 ring-current` 
                            : 'bg-subtle border-border-subtle text-text-secondary hover:border-border-strong'
                        }`}
                      >
                        <div className="flex items-center gap-1.5 font-bold text-xs">
                          <s.icon className="w-3.5 h-3.5 shrink-0" />
                          <span>{s.label}</span>
                        </div>
                        <span className="text-[10px] text-text-muted line-clamp-1">{s.desc}</span>
                      </button>
                    );
                  })}
                </div>
                {formPaymentSource === 'PETTY_CASH' && (
                  <p className="text-[11px] text-amber-600 dark:text-amber-400 bg-amber-500/10 p-2 rounded-lg border border-amber-500/20">
                    💡 Pengeluaran akan memotong saldo tunai kasir shift saat ini dan tercatat di Z-Report kasir.
                  </p>
                )}
              </div>

              {/* 3. Kategori & Tanggal */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-text-primary">
                    Kategori Biaya <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={formCategoryName}
                    onChange={(e) => {
                      setFormCategoryName(e.target.value);
                      const cat = categories.find(c => c.name === e.target.value);
                      if (cat) setFormCategoryId(cat.id);
                    }}
                    className="w-full px-3 py-2 bg-subtle border border-border-strong rounded-xl text-xs text-text-primary focus:outline-none focus:border-primary"
                  >
                    {categories.map((c) => (
                      <option key={c.id} value={c.name}>{c.name}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-text-primary">
                    Tanggal Transaksi <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="date"
                    required
                    value={formExpenseDate}
                    onChange={(e) => setFormExpenseDate(e.target.value)}
                    className="w-full px-3 py-2 bg-subtle border border-border-strong rounded-xl text-xs font-mono text-text-primary focus:outline-none focus:border-primary"
                  />
                </div>
              </div>

              {/* 4. Penerima / Vendor */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-text-primary">
                  Penerima / Toko / Vendor (Opsional)
                </label>
                <input
                  type="text"
                  placeholder="Misal: PLN / Toko Plastik Berkah / Uang Makan Budi"
                  value={formPayee}
                  onChange={(e) => setFormPayee(e.target.value)}
                  className="w-full px-3 py-2 bg-subtle border border-border-strong rounded-xl text-xs text-text-primary placeholder:text-text-muted focus:outline-none focus:border-primary"
                />
              </div>

              {/* 5. Keterangan / Keperluan */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-text-primary">
                  Keterangan & Rincian Keperluan <span className="text-rose-500">*</span>
                </label>
                <textarea
                  required
                  rows={2}
                  placeholder="Misal: Beli 2 pack plastik kresek hitam ukuran 35 & 1 roll lakban"
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  className="w-full px-3 py-2 bg-subtle border border-border-strong rounded-xl text-xs text-text-primary placeholder:text-text-muted focus:outline-none focus:border-primary resize-none"
                />
              </div>

              {/* 6. Upload Foto Struk / Nota */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-text-primary flex items-center justify-between">
                  <span>Foto Bukti Struk / Kwitansi (Opsional)</span>
                  {formReceiptPhoto && (
                    <button
                      type="button"
                      onClick={() => setFormReceiptPhoto(null)}
                      className="text-[10px] text-rose-500 hover:underline"
                    >
                      Hapus Foto
                    </button>
                  )}
                </label>

                {formReceiptPhoto ? (
                  <div className="relative rounded-xl overflow-hidden border border-border-strong h-32 bg-black/20 flex items-center justify-center">
                    <img 
                      src={formReceiptPhoto} 
                      alt="Bukti Nota" 
                      className="h-full w-full object-contain" 
                    />
                  </div>
                ) : (
                  <label className="border-2 border-dashed border-border-strong hover:border-primary rounded-xl p-3 flex flex-col items-center justify-center gap-1 cursor-pointer bg-subtle/50 hover:bg-subtle transition-all">
                    <Camera className="w-5 h-5 text-text-muted" />
                    <span className="text-[11px] font-semibold text-text-secondary">Klik untuk upload foto nota</span>
                    <span className="text-[10px] text-text-muted">Maksimal ukuran 2MB (JPG, PNG)</span>
                    <input 
                      type="file" 
                      accept="image/*" 
                      className="hidden" 
                      onChange={handleFileChange} 
                    />
                  </label>
                )}
              </div>

              {/* Modal Actions */}
              <div className="pt-3 border-t border-border-subtle flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsFormModalOpen(false)}
                  className="px-4 py-2 bg-subtle hover:bg-card border border-border-subtle rounded-xl text-xs font-bold text-text-secondary transition-all"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-5 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all"
                >
                  {isSaving ? 'Menyimpan...' : (
                    <>
                      <Check className="w-4 h-4" />
                      <span>{editingExpense ? 'Simpan Perubahan' : 'Simpan Pengeluaran'}</span>
                    </>
                  )}
                </button>
              </div>

            </form>

          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 2: CETAK SLIP KAS KELUAR (EXPENSE VOUCHER) */}
      {/* ========================================================================= */}
      {isVoucherModalOpen && selectedVoucherExpense && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-card border border-border-strong rounded-2xl max-w-sm w-full shadow-2xl overflow-hidden flex flex-col">
            
            <div className="p-3 bg-surface border-b border-border-subtle flex items-center justify-between">
              <span className="text-xs font-bold text-text-primary flex items-center gap-1.5">
                <Printer className="w-4 h-4 text-primary" />
                <span>Bukti Pengeluaran Kas (Voucher)</span>
              </span>
              <button onClick={() => setIsVoucherModalOpen(false)} className="p-1 text-text-muted hover:text-text-primary">
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Thermal Slip Preview Container */}
            <div className="p-5 bg-white text-black font-mono text-xs space-y-3 overflow-y-auto max-h-[60vh] select-text">
              <div className="text-center space-y-0.5 border-b border-black pb-2">
                <p className="font-bold text-sm uppercase">{storeName}</p>
                <p className="text-[10px]">{storeAddress}</p>
                <p className="font-bold text-xs pt-1 uppercase">*** BUKTI KAS KELUAR ***</p>
              </div>

              <div className="space-y-1 text-[11px]">
                <div className="flex justify-between">
                  <span>No. Voucher:</span>
                  <span className="font-bold">{selectedVoucherExpense.expenseNumber}</span>
                </div>
                <div className="flex justify-between">
                  <span>Tanggal:</span>
                  <span>{new Date(selectedVoucherExpense.expenseDate).toLocaleDateString('id-ID')} {new Date(selectedVoucherExpense.expenseDate).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}</span>
                </div>
                <div className="flex justify-between">
                  <span>Kategori:</span>
                  <span>{selectedVoucherExpense.categoryName}</span>
                </div>
                <div className="flex justify-between">
                  <span>Sumber Kas:</span>
                  <span>{selectedVoucherExpense.paymentSource}</span>
                </div>
                {selectedVoucherExpense.payee && (
                  <div className="flex justify-between">
                    <span>Penerima:</span>
                    <span className="font-bold">{selectedVoucherExpense.payee}</span>
                  </div>
                )}
              </div>

              <div className="border-t border-b border-dashed border-black py-2 space-y-1">
                <span className="text-[10px] text-gray-600 block">Keterangan / Keperluan:</span>
                <p className="text-xs font-bold">{selectedVoucherExpense.description}</p>
              </div>

              <div className="flex justify-between items-center text-sm font-bold border-b border-black pb-2">
                <span>TOTAL DIBAYARKAN:</span>
                <span>Rp {selectedVoucherExpense.amount.toLocaleString('id-ID')}</span>
              </div>

              {/* Signature Blocks */}
              <div className="grid grid-cols-2 gap-4 pt-3 text-center text-[10px]">
                <div className="space-y-8">
                  <span>Dikeluarkan Oleh,</span>
                  <span className="border-t border-black block pt-1 font-bold">
                    ( {selectedVoucherExpense.recordedByUserName || 'Kasir'} )
                  </span>
                </div>
                <div className="space-y-8">
                  <span>Penerima / Vendor,</span>
                  <span className="border-t border-black block pt-1 font-bold">
                    ( {selectedVoucherExpense.payee || '.....................'} )
                  </span>
                </div>
              </div>
            </div>

            <div className="p-3 bg-surface border-t border-border-subtle flex items-center justify-end gap-2">
              <button
                onClick={() => setIsVoucherModalOpen(false)}
                className="px-3 py-1.5 bg-subtle hover:bg-card border border-border-subtle rounded-lg text-xs font-bold text-text-secondary"
              >
                Tutup
              </button>
              <button
                onClick={() => {
                  window.print();
                }}
                className="px-4 py-1.5 bg-primary hover:bg-primary-hover text-primary-text rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-sm"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Cetak Slip</span>
              </button>
            </div>

          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 3: MASTER KATEGORI MODAL */}
      {/* ========================================================================= */}
      {isCategoryModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-card border border-border-strong rounded-2xl max-w-md w-full shadow-2xl overflow-hidden flex flex-col">
            <div className="p-4 bg-surface border-b border-border-subtle flex items-center justify-between">
              <h3 className="text-sm font-bold text-text-primary">
                {editingCategory ? 'Edit Kategori Biaya' : 'Tambah Kategori Biaya'}
              </h3>
              <button onClick={() => setIsCategoryModalOpen(false)} className="p-1 text-text-muted hover:text-text-primary">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveCategory} className="p-5 space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-text-primary">Nama Kategori *</label>
                <input
                  type="text"
                  required
                  placeholder="Misal: Biaya Perizinan Toko"
                  value={catName}
                  onChange={(e) => setCatName(e.target.value)}
                  className="w-full px-3 py-2 bg-subtle border border-border-strong rounded-xl text-xs text-text-primary focus:outline-none focus:border-primary"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-text-primary">Kode Singkat</label>
                  <input
                    type="text"
                    maxLength={6}
                    placeholder="IZIN"
                    value={catCode}
                    onChange={(e) => setCatCode(e.target.value)}
                    className="w-full px-3 py-2 bg-subtle border border-border-strong rounded-xl text-xs font-mono uppercase text-text-primary focus:outline-none focus:border-primary"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-text-primary">Warna Label</label>
                  <input
                    type="color"
                    value={catColor}
                    onChange={(e) => setCatColor(e.target.value)}
                    className="w-full h-9 p-1 bg-subtle border border-border-strong rounded-xl cursor-pointer"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-text-primary">Pagu Anggaran Bulanan (Rp)</label>
                <input
                  type="number"
                  placeholder="0 (Jika tidak dibatasi)"
                  value={catBudget}
                  onChange={(e) => setCatBudget(e.target.value)}
                  className="w-full px-3 py-2 bg-subtle border border-border-strong rounded-xl text-xs font-mono text-text-primary focus:outline-none focus:border-primary"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-text-primary">Keterangan</label>
                <textarea
                  rows={2}
                  placeholder="Deskripsi peruntukan pos pengeluaran ini..."
                  value={catDesc}
                  onChange={(e) => setCatDesc(e.target.value)}
                  className="w-full px-3 py-2 bg-subtle border border-border-strong rounded-xl text-xs text-text-primary focus:outline-none focus:border-primary resize-none"
                />
              </div>

              <div className="pt-3 border-t border-border-subtle flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsCategoryModalOpen(false)}
                  className="px-4 py-2 bg-subtle hover:bg-card border border-border-subtle rounded-xl text-xs font-bold text-text-secondary"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSavingCat}
                  className="px-5 py-2 bg-primary hover:bg-primary-hover text-primary-text rounded-xl text-xs font-bold"
                >
                  {isSavingCat ? 'Menyimpan...' : 'Simpan Kategori'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 4: PHOTO PREVIEW MODAL */}
      {/* ========================================================================= */}
      {photoPreviewUrl && (
        <div 
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4 cursor-zoom-out"
          onClick={() => setPhotoPreviewUrl(null)}
        >
          <div className="relative max-w-2xl max-h-[85vh] bg-card rounded-2xl overflow-hidden border border-border-subtle shadow-2xl p-2">
            <button
              onClick={() => setPhotoPreviewUrl(null)}
              className="absolute top-4 right-4 p-2 rounded-full bg-black/60 text-white hover:bg-black"
            >
              <X className="w-5 h-5" />
            </button>
            <img 
              src={photoPreviewUrl} 
              alt="Foto Nota Preview" 
              className="max-w-full max-h-[80vh] object-contain rounded-xl mx-auto" 
            />
          </div>
        </div>
      )}

    </div>
  );
};
export default ExpensePage;
