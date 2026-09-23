import React, { useState, useEffect } from 'react';
import { 
  FolderTree, 
  Plus, 
  Edit3, 
  Trash2, 
  X, 
  Check, 
  Boxes, 
  AlertCircle,
  Palette
} from 'lucide-react';
import { useToastStore } from '../../store/useToastStore';
import { BusinessMode } from '../../types';

interface CategoryItem {
  id: string;
  name: string;
  description?: string;
  colorHex?: string;
  iconName?: string;
  sortOrder: number;
  businessMode: BusinessMode;
  productsCount: number;
}

interface CategoryManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCategoriesChanged: () => void;
  mode: BusinessMode;
}

const PRESET_COLORS = [
  '#16a34a', // Emerald Green
  '#2563eb', // Royal Blue
  '#9333ea', // Purple
  '#f59e0b', // Amber
  '#ef4444', // Red
  '#06b6d4', // Cyan
  '#ec4899', // Pink
  '#64748b'  // Slate
];

export const CategoryManagementModal: React.FC<CategoryManagementModalProps> = ({
  isOpen,
  onClose,
  onCategoriesChanged,
  mode
}) => {
  const [categories, setCategories] = useState<CategoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  
  // Form State
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formName, setFormName] = useState('');
  const [formDesc, setFormDesc] = useState('');
  const [formColor, setFormColor] = useState(PRESET_COLORS[0]);
  const [isSaving, setIsSaving] = useState(false);
  const [isFormOpen, setIsFormOpen] = useState(false);

  useEffect(() => {
    if (isOpen) {
      fetchCategories();
      resetForm();
    }
  }, [isOpen, mode]);

  const fetchCategories = async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/v1/categories?mode=${mode}`);
      if (res.ok) {
        const data = await res.json();
        setCategories(data || []);
      }
    } catch {
      useToastStore.getState().showToast('Gagal memuat kategori.', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const resetForm = () => {
    setEditingId(null);
    setFormName('');
    setFormDesc('');
    setFormColor(PRESET_COLORS[0]);
    setIsFormOpen(false);
  };

  const handleOpenAdd = () => {
    resetForm();
    setIsFormOpen(true);
  };

  const handleOpenEdit = (c: CategoryItem) => {
    setEditingId(c.id);
    setFormName(c.name);
    setFormDesc(c.description || '');
    setFormColor(c.colorHex || PRESET_COLORS[0]);
    setIsFormOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) {
      useToastStore.getState().showToast('Nama kategori wajib diisi.', 'warning');
      return;
    }

    setIsSaving(true);
    try {
      const url = editingId ? `/api/v1/categories/${editingId}` : `/api/v1/categories?mode=${mode}`;
      const method = editingId ? 'PUT' : 'POST';
      const payload = {
        name: formName.trim(),
        description: formDesc.trim() || undefined,
        colorHex: formColor,
        businessMode: mode
      };

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        useToastStore.getState().showToast(
          editingId ? 'Kategori berhasil diperbarui.' : 'Kategori baru berhasil ditambahkan.',
          'success'
        );
        resetForm();
        await fetchCategories();
        onCategoriesChanged();
      } else {
        const err = await res.json();
        useToastStore.getState().showToast(err.message || 'Gagal menyimpan kategori.', 'error');
      }
    } catch {
      useToastStore.getState().showToast('Terjadi kesalahan jaringan.', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (c: CategoryItem) => {
    if (c.productsCount > 0) {
      alert(`Kategori "${c.name}" masih memiliki ${c.productsCount} produk. Pindahkan atau hapus produk tersebut terlebih dahulu.`);
      return;
    }

    if (!window.confirm(`Yakin ingin menghapus kategori "${c.name}"?`)) return;

    try {
      const res = await fetch(`/api/v1/categories/${c.id}`, { method: 'DELETE' });
      if (res.ok) {
        useToastStore.getState().showToast(`Kategori "${c.name}" berhasil dihapus.`, 'info');
        await fetchCategories();
        onCategoriesChanged();
      } else {
        const err = await res.json();
        useToastStore.getState().showToast(err.message || 'Gagal menghapus kategori.', 'error');
      }
    } catch {
      useToastStore.getState().showToast('Terjadi kesalahan jaringan.', 'error');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4 select-none">
      <div className="w-full max-w-xl bg-card border border-border-strong rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="p-4 bg-surface border-b border-border-subtle flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-bold">
              <FolderTree className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-text-primary">Manajemen Kategori Produk</h3>
              <p className="text-xs text-text-secondary">Atur klasifikasi barang untuk katalog dan filter kasir</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-text-muted hover:text-text-primary hover:bg-subtle transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 flex-1 overflow-y-auto space-y-4 text-xs">
          {/* Action Bar */}
          <div className="flex items-center justify-between">
            <span className="font-bold text-text-primary">
              Daftar Kategori Aktif ({categories.length})
            </span>
            {!isFormOpen && (
              <button
                onClick={handleOpenAdd}
                className="px-3 py-1.5 bg-primary hover:bg-primary-hover text-primary-text rounded-lg font-bold flex items-center gap-1.5 shadow-sm transition-all"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>+ Kategori Baru</span>
              </button>
            )}
          </div>

          {/* Add / Edit Inline Form */}
          {isFormOpen && (
            <form onSubmit={handleSave} className="p-4 bg-subtle border border-primary/40 rounded-xl space-y-3 animate-in fade-in duration-150">
              <div className="flex items-center justify-between border-b border-border-subtle pb-2">
                <span className="font-bold text-text-primary flex items-center gap-1.5">
                  <Palette className="w-3.5 h-3.5 text-primary" />
                  {editingId ? 'Edit Kategori' : 'Tambah Kategori Baru'}
                </span>
                <button
                  type="button"
                  onClick={resetForm}
                  className="p-1 text-text-muted hover:text-text-primary"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div>
                <label className="block font-semibold text-text-secondary mb-1">Nama Kategori *</label>
                <input
                  type="text"
                  required
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="Contoh: Minuman Dingin, Snack & Biskuit, Obat Resep"
                  className="w-full px-3 py-2 bg-card border border-border-strong rounded-lg text-text-primary font-semibold focus:outline-none focus:border-primary"
                  autoFocus
                />
              </div>

              <div>
                <label className="block font-semibold text-text-secondary mb-1">Keterangan (Opsional)</label>
                <input
                  type="text"
                  value={formDesc}
                  onChange={(e) => setFormDesc(e.target.value)}
                  placeholder="Deskripsi singkat kategori produk..."
                  className="w-full px-3 py-2 bg-card border border-border-strong rounded-lg text-text-primary focus:outline-none focus:border-primary"
                />
              </div>

              <div>
                <label className="block font-semibold text-text-secondary mb-1.5">Warna Penanda Label</label>
                <div className="flex items-center gap-2 flex-wrap">
                  {PRESET_COLORS.map(color => (
                    <button
                      key={color}
                      type="button"
                      onClick={() => setFormColor(color)}
                      style={{ backgroundColor: color }}
                      className={`w-7 h-7 rounded-full transition-transform flex items-center justify-center ${
                        formColor === color ? 'ring-3 ring-offset-2 ring-primary scale-110' : 'hover:scale-105'
                      }`}
                    >
                      {formColor === color && <Check className="w-4 h-4 text-white drop-shadow" />}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={resetForm}
                  className="flex-1 py-1.5 bg-card hover:bg-card-hover border border-border-subtle rounded-lg font-semibold text-text-secondary"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="flex-1 py-1.5 bg-primary hover:bg-primary-hover text-primary-text rounded-lg font-bold shadow-sm disabled:opacity-50"
                >
                  {isSaving ? 'Menyimpan...' : editingId ? 'Simpan Perubahan' : 'Buat Kategori'}
                </button>
              </div>
            </form>
          )}

          {/* Categories List */}
          {isLoading ? (
            <div className="p-8 text-center text-text-muted">Memuat daftar kategori...</div>
          ) : categories.length === 0 ? (
            <div className="p-8 text-center text-text-muted border border-dashed border-border-strong rounded-xl space-y-2">
              <FolderTree className="w-8 h-8 mx-auto opacity-30" />
              <p className="font-semibold text-text-primary">Belum ada kategori untuk mode ini.</p>
              <p className="text-[11px]">Klik "+ Kategori Baru" untuk membuat klasifikasi produk pertama Anda.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {categories.map((c) => (
                <div
                  key={c.id}
                  className="p-3 bg-card hover:bg-card-hover border border-border-subtle rounded-xl flex items-center justify-between transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <span 
                      className="w-4 h-4 rounded-full shrink-0 shadow-xs" 
                      style={{ backgroundColor: c.colorHex || '#16a34a' }}
                    />
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-text-primary text-xs">{c.name}</span>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-semibold bg-subtle text-text-secondary border border-border-subtle flex items-center gap-1">
                          <Boxes className="w-3 h-3 text-text-muted" />
                          {c.productsCount} Produk
                        </span>
                      </div>
                      {c.description && (
                        <p className="text-[11px] text-text-muted mt-0.5">{c.description}</p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleOpenEdit(c)}
                      className="p-1.5 rounded-lg hover:bg-primary/10 text-text-secondary hover:text-primary transition-colors"
                      title="Edit Kategori"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleDelete(c)}
                      className="p-1.5 rounded-lg hover:bg-rose-500/10 text-text-secondary hover:text-rose-600 transition-colors"
                      title="Hapus Kategori"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-3 bg-surface border-t border-border-subtle flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-subtle hover:bg-card-hover border border-border-subtle rounded-lg font-bold text-text-primary text-xs"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
};
