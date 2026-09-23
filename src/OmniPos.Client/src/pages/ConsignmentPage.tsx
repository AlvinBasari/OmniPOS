import React, { useState, useEffect } from 'react';
import {
  Handshake,
  DollarSign,
  PackagePlus,
  Building2,
  Calendar,
  Search,
  Filter,
  Plus,
  Printer,
  CheckCircle2,
  Clock,
  AlertCircle,
  TrendingUp,
  Receipt,
  FileText,
  Undo2,
  Wallet,
  ArrowUpRight,
  ShieldCheck,
  Edit2,
  Trash2,
  Check,
  Percent,
  Landmark,
  Package,
  X
} from 'lucide-react';
import {
  ConsignmentVendor,
  ConsignmentProduct,
  ConsignmentIntake,
  ConsignmentSettlement,
  ConsignmentReturn,
  ConsignmentSettlementStatus
} from '../types';
import { ConsignmentVendorModal } from '../components/modals/ConsignmentVendorModal';
import { ConsignmentIntakeModal } from '../components/modals/ConsignmentIntakeModal';
import { ConsignmentSettlementModal } from '../components/modals/ConsignmentSettlementModal';
import { ConsignmentSettlementPrintModal } from '../components/modals/ConsignmentSettlementPrintModal';
import { ConsignmentReturnModal } from '../components/modals/ConsignmentReturnModal';

export const ConsignmentPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'settlements' | 'products' | 'vendors' | 'history'>('settlements');
  
  // Data States
  const [vendors, setVendors] = useState<ConsignmentVendor[]>([]);
  const [products, setProducts] = useState<ConsignmentProduct[]>([]);
  const [settlements, setSettlements] = useState<ConsignmentSettlement[]>([]);
  const [intakes, setIntakes] = useState<ConsignmentIntake[]>([]);
  const [returns, setReturns] = useState<ConsignmentReturn[]>([]);
  const [loading, setLoading] = useState(true);

  // Filter States
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedVendorFilter, setSelectedVendorFilter] = useState('');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<string>('');
  const [historySubTab, setHistorySubTab] = useState<'intake' | 'return'>('intake');

  // Modal States
  const [vendorModalOpen, setVendorModalOpen] = useState(false);
  const [selectedVendor, setSelectedVendor] = useState<ConsignmentVendor | null>(null);

  const [intakeModalOpen, setIntakeModalOpen] = useState(false);
  const [settlementModalOpen, setSettlementModalOpen] = useState(false);
  const [returnModalOpen, setReturnModalOpen] = useState(false);

  const [printModalOpen, setPrintModalOpen] = useState(false);
  const [selectedSettlementToPrint, setSelectedSettlementToPrint] = useState<ConsignmentSettlement | null>(null);

  // Quick Pay Modal State
  const [payModalOpen, setPayModalOpen] = useState(false);
  const [settlementToPay, setSettlementToPay] = useState<ConsignmentSettlement | null>(null);
  const [payMethod, setPayMethod] = useState('Transfer Bank');
  const [payRef, setPayRef] = useState('');
  const [payNotes, setPayNotes] = useState('');
  const [payLoading, setPayLoading] = useState(false);

  useEffect(() => {
    fetchAllData();
  }, []);

  const fetchAllData = async () => {
    setLoading(true);
    try {
      await Promise.all([
        fetchVendors(),
        fetchProducts(),
        fetchSettlements(),
        fetchIntakes(),
        fetchReturns()
      ]);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const fetchVendors = async () => {
    try {
      const res = await fetch('/api/v1/consignment/vendors');
      if (res.ok) {
        const data = await res.json();
        setVendors(data);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const fetchProducts = async () => {
    try {
      const res = await fetch('/api/v1/consignment/products');
      if (res.ok) {
        const data = await res.json();
        setProducts(data);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const fetchSettlements = async () => {
    try {
      const res = await fetch('/api/v1/consignment/settlements');
      if (res.ok) {
        const data = await res.json();
        setSettlements(data);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const fetchIntakes = async () => {
    try {
      const res = await fetch('/api/v1/consignment/intakes');
      if (res.ok) {
        const data = await res.json();
        setIntakes(data);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const fetchReturns = async () => {
    try {
      const res = await fetch('/api/v1/consignment/returns');
      if (res.ok) {
        const data = await res.json();
        setReturns(data);
      }
    } catch (e) {
      console.error(e);
    }
  };

  // KPI Calculations
  const totalPayableBalance = vendors.reduce((acc, v) => acc + (v.totalPayableBalance || 0), 0);
  const totalGrossSettled = settlements.reduce((acc, s) => acc + (s.totalGrossSales || 0), 0);
  const totalStoreCommissionEarned = settlements.reduce((acc, s) => acc + (s.totalStoreCommission || 0), 0);
  const pendingSettlementCount = settlements.filter(s => s.status === 'Draft' || s.status === 'Approved' || s.status === 0 || s.status === 1).length;

  const handleOpenPrint = (settlement: ConsignmentSettlement) => {
    setSelectedSettlementToPrint(settlement);
    setPrintModalOpen(true);
  };

  const handleOpenPay = (settlement: ConsignmentSettlement) => {
    setSettlementToPay(settlement);
    setPayMethod('Transfer Bank');
    setPayRef('');
    setPayNotes('');
    setPayModalOpen(true);
  };

  const handleConfirmPay = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!settlementToPay) return;

    setPayLoading(true);
    try {
      const res = await fetch(`/api/v1/consignment/settlements/${settlementToPay.id}/pay`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          paymentMethod: payMethod,
          paymentReference: payRef.trim() || undefined,
          paidAt: new Date().toISOString(),
          staffName: 'Finance Manager',
          notes: payNotes.trim() || undefined
        })
      });

      if (res.ok) {
        setPayModalOpen(false);
        fetchAllData();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setPayLoading(false);
    }
  };

  const handleCancelSettlement = async (settlementId: string) => {
    if (!confirm('Yakin ingin membatalkan dokumen settlement ini?')) return;
    try {
      const res = await fetch(`/api/v1/consignment/settlements/${settlementId}/cancel`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: 'Dibatalkan oleh supervisor' })
      });
      if (res.ok) {
        fetchAllData();
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Filtered Lists
  const filteredSettlements = settlements.filter(s => {
    if (selectedVendorFilter && s.vendorId !== selectedVendorFilter) return false;
    if (selectedStatusFilter && s.status.toString() !== selectedStatusFilter) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return s.settlementNumber.toLowerCase().includes(q) || s.vendorName.toLowerCase().includes(q);
    }
    return true;
  });

  const filteredProducts = products.filter(p => {
    if (selectedVendorFilter && p.consignmentVendorId !== selectedVendorFilter) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return p.name.toLowerCase().includes(q) || p.sku.toLowerCase().includes(q) || (p.barcode && p.barcode.toLowerCase().includes(q));
    }
    return true;
  });

  const filteredVendors = vendors.filter(v => {
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return v.name.toLowerCase().includes(q) || v.vendorCode.toLowerCase().includes(q) || (v.phone && v.phone.toLowerCase().includes(q));
    }
    return true;
  });

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '-';
    try {
      return new Date(dateStr).toLocaleDateString('id-ID', {
        day: 'numeric',
        month: 'short',
        year: 'numeric'
      });
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-app overflow-hidden font-sans select-none animate-fadeIn">
      {/* Top Header */}
      <header className="px-6 py-4 bg-surface border-b border-border-subtle flex flex-col sm:flex-row sm:items-center justify-between gap-4 shrink-0 shadow-2xs">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-primary/10 text-primary flex items-center justify-center font-bold shadow-xs">
            <Handshake className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base font-extrabold text-text-primary tracking-tight">
                Manajemen Barang Konsinyasi & Vendor
              </h1>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/15 text-status-success font-bold font-mono">
                {vendors.length} Mitra Aktif
              </span>
            </div>
            <p className="text-xs text-text-secondary">
              Kelola kemitraan titip jual, rekonsiliasi bagi hasil POS, komisi toko, dan pembayaran voucher
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={() => setIntakeModalOpen(true)}
            className="px-3.5 py-2 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs rounded-xl shadow-xs transition flex items-center gap-1.5"
          >
            <PackagePlus className="w-4 h-4" />
            <span>+ Terima Titipan (Intake)</span>
          </button>

          <button
            type="button"
            onClick={() => setSettlementModalOpen(true)}
            className="px-3.5 py-2 bg-primary hover:bg-primary-hover text-white font-bold text-xs rounded-xl shadow-xs transition flex items-center gap-1.5"
          >
            <DollarSign className="w-4 h-4" />
            <span>+ Rekonsiliasi & Settlement</span>
          </button>

          <button
            type="button"
            onClick={() => setReturnModalOpen(true)}
            className="px-3.5 py-2 bg-card hover:bg-card-hover border border-border-subtle text-text-primary font-bold text-xs rounded-xl shadow-xs transition flex items-center gap-1.5"
          >
            <Undo2 className="w-4 h-4 text-status-danger" />
            <span>Retur ke Vendor</span>
          </button>
        </div>
      </header>

      {/* Filter & Navigation Bar */}
      <div className="px-6 py-2.5 bg-surface border-b border-border-subtle flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0">
        {/* Tabs */}
        <div className="flex items-center gap-1 bg-subtle p-1 rounded-xl border border-border-subtle text-xs font-bold overflow-x-auto">
          <button
            type="button"
            onClick={() => { setActiveTab('settlements'); setSearchQuery(''); }}
            className={`px-3 py-1.5 rounded-lg transition flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'settlements'
                ? 'bg-card text-text-primary shadow-xs font-bold'
                : 'text-text-secondary hover:text-text-primary'
            }`}
          >
            <DollarSign className="w-3.5 h-3.5 text-primary" />
            <span>Rekonsiliasi & Settlement ({settlements.length})</span>
          </button>

          <button
            type="button"
            onClick={() => { setActiveTab('products'); setSearchQuery(''); }}
            className={`px-3 py-1.5 rounded-lg transition flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'products'
                ? 'bg-card text-text-primary shadow-xs font-bold'
                : 'text-text-secondary hover:text-text-primary'
            }`}
          >
            <Package className="w-3.5 h-3.5 text-amber-500" />
            <span>Katalog Titipan ({products.length})</span>
          </button>

          <button
            type="button"
            onClick={() => { setActiveTab('vendors'); setSearchQuery(''); }}
            className={`px-3 py-1.5 rounded-lg transition flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'vendors'
                ? 'bg-card text-text-primary shadow-xs font-bold'
                : 'text-text-secondary hover:text-text-primary'
            }`}
          >
            <Building2 className="w-3.5 h-3.5 text-blue-500" />
            <span>Mitra Vendor ({vendors.length})</span>
          </button>

          <button
            type="button"
            onClick={() => { setActiveTab('history'); setSearchQuery(''); }}
            className={`px-3 py-1.5 rounded-lg transition flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'history'
                ? 'bg-card text-text-primary shadow-xs font-bold'
                : 'text-text-secondary hover:text-text-primary'
            }`}
          >
            <FileText className="w-3.5 h-3.5 text-purple-500" />
            <span>Riwayat Intake & Retur</span>
          </button>
        </div>

        {/* Global Search & Filters */}
        <div className="flex items-center gap-2.5">
          {activeTab !== 'vendors' && (
            <select
              value={selectedVendorFilter}
              onChange={(e) => setSelectedVendorFilter(e.target.value)}
              className="bg-card border border-border-subtle text-xs text-text-primary rounded-xl px-3 py-1.5 focus:outline-none focus:border-border-focus"
            >
              <option value="">Semua Vendor</option>
              {vendors.map(v => (
                <option key={v.id} value={v.id}>{v.name}</option>
              ))}
            </select>
          )}

          {activeTab === 'settlements' && (
            <select
              value={selectedStatusFilter}
              onChange={(e) => setSelectedStatusFilter(e.target.value)}
              className="bg-card border border-border-subtle text-xs text-text-primary rounded-xl px-3 py-1.5 focus:outline-none focus:border-border-focus"
            >
              <option value="">Semua Status</option>
              <option value="Draft">Draft</option>
              <option value="Approved">Approved (Siap Bayar)</option>
              <option value="Paid">Paid (Lunas)</option>
              <option value="Cancelled">Cancelled</option>
            </select>
          )}

          <div className="relative w-56">
            <Search className="w-3.5 h-3.5 text-text-muted absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Cari dokumen / vendor..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-card border border-border-subtle rounded-xl pl-8 pr-3 py-1.5 text-xs text-text-primary placeholder:text-text-muted focus:outline-none focus:border-border-focus"
            />
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {/* KPI Cards Row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-card border border-border-subtle p-4 rounded-2xl shadow-2xs flex items-center justify-between">
            <div>
              <span className="text-xs font-semibold text-text-secondary">Hutang Konsinyasi Berjalan</span>
              <h3 className="text-xl font-black text-status-success mt-1 font-mono">
                Rp {totalPayableBalance.toLocaleString('id-ID')}
              </h3>
              <span className="text-[11px] text-text-muted flex items-center gap-1 mt-1">
                <ShieldCheck className="w-3.5 h-3.5 text-status-success" /> Wajib disettle ke vendor
              </span>
            </div>
            <div className="p-3 bg-primary/10 border border-primary/20 text-primary rounded-xl">
              <Wallet className="w-5 h-5" />
            </div>
          </div>

          <div className="bg-card border border-border-subtle p-4 rounded-2xl shadow-2xs flex items-center justify-between">
            <div>
              <span className="text-xs font-semibold text-text-secondary">Total Omset Terjual</span>
              <h3 className="text-xl font-black text-amber-500 mt-1 font-mono">
                Rp {totalGrossSettled.toLocaleString('id-ID')}
              </h3>
              <span className="text-[11px] text-text-muted flex items-center gap-1 mt-1">
                <TrendingUp className="w-3.5 h-3.5 text-amber-500" /> Dari produk titipan di POS
              </span>
            </div>
            <div className="p-3 bg-amber-500/10 border border-amber-500/20 text-amber-500 rounded-xl">
              <Receipt className="w-5 h-5" />
            </div>
          </div>

          <div className="bg-card border border-border-subtle p-4 rounded-2xl shadow-2xs flex items-center justify-between">
            <div>
              <span className="text-xs font-semibold text-text-secondary">Margin Komisi Toko</span>
              <h3 className="text-xl font-black text-status-info mt-1 font-mono">
                Rp {totalStoreCommissionEarned.toLocaleString('id-ID')}
              </h3>
              <span className="text-[11px] text-text-muted flex items-center gap-1 mt-1">
                <Percent className="w-3.5 h-3.5 text-status-info" /> Keuntungan bagi hasil bersih toko
              </span>
            </div>
            <div className="p-3 bg-sky-500/10 border border-sky-500/20 text-sky-500 rounded-xl">
              <ArrowUpRight className="w-5 h-5" />
            </div>
          </div>

          <div className="bg-card border border-border-subtle p-4 rounded-2xl shadow-2xs flex items-center justify-between">
            <div>
              <span className="text-xs font-semibold text-text-secondary">Settlement Menunggu Bayar</span>
              <h3 className="text-xl font-black text-text-primary mt-1 font-mono">
                {pendingSettlementCount} Dokumen
              </h3>
              <span className="text-[11px] text-text-muted flex items-center gap-1 mt-1">
                <Clock className="w-3.5 h-3.5 text-amber-500" /> Status Draft atau Approved
              </span>
            </div>
            <div className="p-3 bg-purple-500/10 border border-purple-500/20 text-purple-500 rounded-xl">
              <Calendar className="w-5 h-5" />
            </div>
          </div>
        </div>

        {/* TAB 1: REKONSILIASI & SETTLEMENT */}
        {activeTab === 'settlements' && (
          <div className="space-y-4">
            <div className="bg-card border border-border-subtle rounded-2xl overflow-hidden shadow-xs">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-subtle text-text-secondary font-bold text-[11px] uppercase tracking-wider border-b border-border-subtle">
                    <tr>
                      <th className="p-3.5 w-10 text-center">#</th>
                      <th className="p-3.5">No. Settlement</th>
                      <th className="p-3.5">Mitra Vendor</th>
                      <th className="p-3.5">Periode Penjualan</th>
                      <th className="p-3.5 text-center">Unit Terjual</th>
                      <th className="p-3.5 text-right">Omset Kasir POS</th>
                      <th className="p-3.5 text-right">Komisi Toko</th>
                      <th className="p-3.5 text-right text-status-success font-bold">Hak Bersih Vendor</th>
                      <th className="p-3.5 text-center">Status</th>
                      <th className="p-3.5 text-center">Aksi Dokumen</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border-subtle text-text-primary">
                    {filteredSettlements.length === 0 ? (
                      <tr>
                        <td colSpan={10} className="p-12 text-center text-text-muted">
                          <DollarSign className="w-8 h-8 mx-auto mb-2 opacity-40 text-text-muted" />
                          <p className="font-semibold text-text-secondary">Belum ada dokumen rekonsiliasi settlement.</p>
                          <p className="text-[11px] text-text-muted mt-0.5">
                            Klik tombol <strong>+ Rekonsiliasi & Settlement</strong> untuk menghitung penjualan periode tertentu.
                          </p>
                        </td>
                      </tr>
                    ) : (
                      filteredSettlements.map((s, idx) => {
                        const isPaid = s.status === 'Paid' || s.status === 2;
                        const isApproved = s.status === 'Approved' || s.status === 1;
                        const isDraft = s.status === 'Draft' || s.status === 0;

                        return (
                          <tr key={s.id} className="hover:bg-card-hover transition">
                            <td className="p-3.5 text-center text-text-muted">{idx + 1}</td>
                            <td className="p-3.5">
                              <span className="font-mono font-bold text-text-primary block">{s.settlementNumber}</span>
                              <span className="text-[11px] text-text-muted">{formatDate(s.settlementDate)}</span>
                            </td>
                            <td className="p-3.5">
                              <span className="font-semibold text-text-primary block">{s.vendorName}</span>
                              <span className="text-[11px] text-text-muted font-mono">{s.bankDestination || '-'}</span>
                            </td>
                            <td className="p-3.5 text-text-secondary">
                              {formatDate(s.periodStartDate)} — {formatDate(s.periodEndDate)}
                            </td>
                            <td className="p-3.5 text-center font-bold text-text-primary">
                              {s.totalSoldQuantity}
                            </td>
                            <td className="p-3.5 text-right font-mono font-semibold text-text-secondary">
                              Rp {s.totalGrossSales.toLocaleString('id-ID')}
                            </td>
                            <td className="p-3.5 text-right font-mono font-semibold text-status-info">
                              Rp {s.totalStoreCommission.toLocaleString('id-ID')}
                            </td>
                            <td className="p-3.5 text-right font-mono font-extrabold text-status-success text-sm">
                              Rp {s.totalVendorPayable.toLocaleString('id-ID')}
                            </td>
                            <td className="p-3.5 text-center">
                              {isPaid ? (
                                <span className="px-2.5 py-1 text-[11px] font-bold bg-emerald-500/10 text-status-success border border-emerald-500/30 rounded-full inline-flex items-center gap-1">
                                  <Check className="w-3 h-3" /> Lunas (Paid)
                                </span>
                              ) : isApproved ? (
                                <span className="px-2.5 py-1 text-[11px] font-bold bg-blue-500/10 text-status-info border border-blue-500/30 rounded-full inline-flex items-center gap-1">
                                  <Clock className="w-3 h-3" /> Approved
                                </span>
                              ) : isDraft ? (
                                <span className="px-2.5 py-1 text-[11px] font-bold bg-amber-500/10 text-amber-600 border border-amber-500/30 rounded-full">
                                  Draft
                                </span>
                              ) : (
                                <span className="px-2.5 py-1 text-[11px] font-bold bg-rose-500/10 text-status-danger border border-rose-500/30 rounded-full">
                                  Cancelled
                                </span>
                              )}
                            </td>
                            <td className="p-3.5">
                              <div className="flex items-center justify-center gap-2">
                                {!isPaid && s.status !== 'Cancelled' && (
                                  <button
                                    type="button"
                                    onClick={() => handleOpenPay(s)}
                                    className="px-2.5 py-1.5 bg-primary hover:bg-primary-hover text-white font-bold text-[11px] rounded-lg transition flex items-center gap-1 shadow-xs"
                                  >
                                    <Wallet className="w-3.5 h-3.5" /> Bayar
                                  </button>
                                )}
                                <button
                                  type="button"
                                  onClick={() => handleOpenPrint(s)}
                                  className="px-2.5 py-1.5 bg-card hover:bg-card-hover text-text-primary border border-border-subtle text-[11px] font-semibold rounded-lg transition flex items-center gap-1"
                                >
                                  <Printer className="w-3.5 h-3.5 text-primary" /> Cetak
                                </button>
                                {!isPaid && s.status !== 'Cancelled' && (
                                  <button
                                    type="button"
                                    onClick={() => handleCancelSettlement(s.id)}
                                    className="p-1.5 text-text-muted hover:text-status-danger rounded-lg hover:bg-card-hover transition"
                                    title="Batalkan Settlement"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                )}
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
          </div>
        )}

        {/* TAB 2: KATALOG BARANG TITIPAN */}
        {activeTab === 'products' && (
          <div className="space-y-4">
            <div className="bg-card border border-border-subtle rounded-2xl overflow-hidden shadow-xs">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-subtle text-text-secondary font-bold text-[11px] uppercase tracking-wider border-b border-border-subtle">
                    <tr>
                      <th className="p-3.5 w-10 text-center">#</th>
                      <th className="p-3.5">SKU / Barcode</th>
                      <th className="p-3.5">Nama Produk Titipan</th>
                      <th className="p-3.5">Mitra Vendor</th>
                      <th className="p-3.5 text-center">Sisa Stok Etalase</th>
                      <th className="p-3.5 text-right">Harga Jual Kasir</th>
                      <th className="p-3.5 text-right">Harga Pokok Vendor</th>
                      <th className="p-3.5 text-right text-status-info font-bold">Margin Toko</th>
                      <th className="p-3.5 text-right text-status-success font-bold">Estimasi Hak Vendor</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border-subtle text-text-primary">
                    {filteredProducts.length === 0 ? (
                      <tr>
                        <td colSpan={9} className="p-12 text-center text-text-muted">
                          <Package className="w-8 h-8 mx-auto mb-2 opacity-40 text-text-muted" />
                          <p className="font-semibold text-text-secondary">Belum ada katalog barang konsinyasi.</p>
                          <p className="text-[11px] text-text-muted mt-0.5">
                            Gunakan menu <strong>+ Terima Titipan (Intake)</strong> untuk menambahkan barang titip-jual.
                          </p>
                        </td>
                      </tr>
                    ) : (
                      filteredProducts.map((p, idx) => {
                        const marginNominal = p.sellPrice - p.consignmentVendorPrice;
                        const marginPercent = p.sellPrice > 0 ? ((marginNominal / p.sellPrice) * 100).toFixed(1) : '0';

                        return (
                          <tr key={p.id} className="hover:bg-card-hover transition">
                            <td className="p-3.5 text-center text-text-muted">{idx + 1}</td>
                            <td className="p-3.5">
                              <span className="font-mono font-bold text-text-primary block">{p.sku}</span>
                              {p.barcode && <span className="text-[10px] text-text-muted font-mono">{p.barcode}</span>}
                            </td>
                            <td className="p-3.5 font-semibold text-text-primary">
                              {p.name}
                            </td>
                            <td className="p-3.5 text-text-secondary">
                              <span className="inline-flex items-center gap-1.5 font-medium">
                                <Building2 className="w-3.5 h-3.5 text-text-muted" />
                                {p.vendorName}
                              </span>
                            </td>
                            <td className="p-3.5 text-center">
                              <span className={`px-2.5 py-1 text-xs font-black rounded-lg ${
                                p.currentStock <= p.minStockAlert
                                  ? 'bg-rose-500/10 text-status-danger border border-rose-500/30'
                                  : 'bg-subtle text-text-primary border border-border-subtle'
                              }`}>
                                {p.currentStock} {p.unit}
                              </span>
                            </td>
                            <td className="p-3.5 text-right font-mono font-semibold text-text-primary">
                              Rp {p.sellPrice.toLocaleString('id-ID')}
                            </td>
                            <td className="p-3.5 text-right font-mono font-semibold text-text-secondary">
                              Rp {p.consignmentVendorPrice.toLocaleString('id-ID')}
                            </td>
                            <td className="p-3.5 text-right font-mono font-bold text-status-info">
                              Rp {marginNominal.toLocaleString('id-ID')} ({marginPercent}%)
                            </td>
                            <td className="p-3.5 text-right font-mono font-bold text-status-success">
                              Rp {p.estimatedVendorPayableTotal.toLocaleString('id-ID')}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: MITRA PENITIP / VENDOR */}
        {activeTab === 'vendors' && (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <p className="text-xs text-text-secondary">
                Menampilkan {filteredVendors.length} mitra vendor penitip aktif
              </p>
              <button
                type="button"
                onClick={() => { setSelectedVendor(null); setVendorModalOpen(true); }}
                className="px-3.5 py-1.5 bg-primary hover:bg-primary-hover text-white font-bold text-xs rounded-xl transition flex items-center gap-1.5 shadow-xs"
              >
                <Plus className="w-4 h-4" />
                <span>+ Daftarkan Vendor Baru</span>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredVendors.map(v => (
                <div
                  key={v.id}
                  className="bg-card border border-border-subtle hover:border-border-strong p-5 rounded-2xl shadow-xs transition space-y-4"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 text-[10px] font-black uppercase font-mono bg-primary/10 text-primary border border-primary/20 rounded">
                          {v.vendorCode}
                        </span>
                        <span className="text-xs text-text-muted font-medium">
                          {v.commissionType === 1 || v.commissionType === 'FixedCost' ? 'Fixed Margin' : `${v.defaultCommissionRate}% Komisi Toko`}
                        </span>
                      </div>
                      <h3 className="text-base font-bold text-text-primary mt-1">{v.name}</h3>
                      <p className="text-xs text-text-secondary mt-0.5">PIC: {v.contactPerson || '-'} ({v.phone || '-'})</p>
                    </div>

                    <button
                      type="button"
                      onClick={() => { setSelectedVendor(v); setVendorModalOpen(true); }}
                      className="p-2 bg-subtle hover:bg-card-hover border border-border-subtle text-text-secondary rounded-xl transition"
                      title="Edit Profil Vendor"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div className="p-3 bg-subtle border border-border-subtle rounded-xl space-y-2 text-xs">
                    <div className="flex items-center justify-between text-text-secondary">
                      <span className="flex items-center gap-1">
                        <Landmark className="w-3.5 h-3.5 text-text-muted" /> Rekening Payout:
                      </span>
                      <span className="font-mono font-semibold text-text-primary">
                        {v.bankName || 'BCA'} {v.bankAccountNumber || '-'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-text-secondary">
                      <span>Pemilik Rekening:</span>
                      <span className="font-semibold text-text-primary uppercase truncate max-w-[160px]">
                        {v.bankAccountHolder || v.name}
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs pt-1 border-t border-border-subtle">
                    <div className="p-2.5 bg-subtle rounded-xl border border-border-subtle">
                      <span className="text-[10px] text-text-muted block">Hutang Belum Disettle</span>
                      <span className="text-sm font-black text-status-success font-mono">
                        Rp {(v.totalPayableBalance || 0).toLocaleString('id-ID')}
                      </span>
                    </div>
                    <div className="p-2.5 bg-subtle rounded-xl border border-border-subtle">
                      <span className="text-[10px] text-text-muted block">Total Sudah Disettle</span>
                      <span className="text-sm font-black text-text-primary font-mono">
                        Rp {(v.totalSettledAmount || 0).toLocaleString('id-ID')}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-text-muted pt-1">
                    <span>{v.productCount || 0} Produk Aktif</span>
                    <span>{v.totalStockOnHand || 0} Unit di Toko</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 4: RIWAYAT INTAKE & RETUR */}
        {activeTab === 'history' && (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setHistorySubTab('intake')}
                className={`px-3.5 py-1.5 text-xs font-bold rounded-xl transition ${
                  historySubTab === 'intake'
                    ? 'bg-amber-600 text-white shadow-xs'
                    : 'bg-card border border-border-subtle text-text-secondary hover:text-text-primary'
                }`}
              >
                Surat Tanda Terima Barang (Intake) ({intakes.length})
              </button>
              <button
                type="button"
                onClick={() => setHistorySubTab('return')}
                className={`px-3.5 py-1.5 text-xs font-bold rounded-xl transition ${
                  historySubTab === 'return'
                    ? 'bg-rose-600 text-white shadow-xs'
                    : 'bg-card border border-border-subtle text-text-secondary hover:text-text-primary'
                }`}
              >
                Berita Acara Retur ke Vendor ({returns.length})
              </button>
            </div>

            <div className="bg-card border border-border-subtle rounded-2xl overflow-hidden shadow-xs">
              {historySubTab === 'intake' ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-subtle text-text-secondary font-bold text-[11px] uppercase tracking-wider border-b border-border-subtle">
                      <tr>
                        <th className="p-3.5 w-10 text-center">#</th>
                        <th className="p-3.5">No. TTB</th>
                        <th className="p-3.5">Mitra Vendor</th>
                        <th className="p-3.5">Tanggal Diterima</th>
                        <th className="p-3.5 text-center">Total Item</th>
                        <th className="p-3.5 text-right">Estimasi Nilai Barang</th>
                        <th className="p-3.5">Penerima</th>
                        <th className="p-3.5">Catatan</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border-subtle text-text-primary">
                      {intakes.map((itk, idx) => (
                        <tr key={itk.id} className="hover:bg-card-hover transition">
                          <td className="p-3.5 text-center text-text-muted">{idx + 1}</td>
                          <td className="p-3.5 font-mono font-bold text-amber-600">{itk.intakeNumber}</td>
                          <td className="p-3.5 font-semibold text-text-primary">{itk.vendorName}</td>
                          <td className="p-3.5 text-text-secondary">{formatDate(itk.intakeDate)}</td>
                          <td className="p-3.5 text-center font-bold text-text-primary">{itk.totalItemsCount} SKU</td>
                          <td className="p-3.5 text-right font-mono font-bold text-text-primary">
                            Rp {itk.totalEstimatedValue.toLocaleString('id-ID')}
                          </td>
                          <td className="p-3.5 text-text-secondary">{itk.receivedByStaffName || '-'}</td>
                          <td className="p-3.5 text-text-muted text-[11px]">{itk.notes || '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-subtle text-text-secondary font-bold text-[11px] uppercase tracking-wider border-b border-border-subtle">
                      <tr>
                        <th className="p-3.5 w-10 text-center">#</th>
                        <th className="p-3.5">No. Retur</th>
                        <th className="p-3.5">Mitra Vendor</th>
                        <th className="p-3.5">Tanggal Retur</th>
                        <th className="p-3.5 text-center">Kuantitas Diretur</th>
                        <th className="p-3.5">Alasan Retur</th>
                        <th className="p-3.5">Petugas</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border-subtle text-text-primary">
                      {returns.map((ret, idx) => (
                        <tr key={ret.id} className="hover:bg-card-hover transition">
                          <td className="p-3.5 text-center text-text-muted">{idx + 1}</td>
                          <td className="p-3.5 font-mono font-bold text-status-danger">{ret.returnNumber}</td>
                          <td className="p-3.5 font-semibold text-text-primary">{ret.vendorName}</td>
                          <td className="p-3.5 text-text-secondary">{formatDate(ret.returnDate)}</td>
                          <td className="p-3.5 text-center font-bold text-status-danger">{ret.totalQuantityReturned} Unit</td>
                          <td className="p-3.5 text-text-secondary">{ret.reason || '-'}</td>
                          <td className="p-3.5 text-text-muted">{ret.processedByStaffName || '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* QUICK PAYOUT MODAL */}
      {payModalOpen && settlementToPay && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-fadeIn">
          <div className="bg-surface border border-border-subtle w-full max-w-md rounded-2xl shadow-2xl overflow-hidden p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-border-subtle">
              <div className="flex items-center gap-2">
                <Wallet className="w-5 h-5 text-primary" />
                <h3 className="text-base font-bold text-text-primary">Pelunasan Settlement Vendor</h3>
              </div>
              <button
                onClick={() => setPayModalOpen(false)}
                className="p-1 text-text-muted hover:text-text-primary rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 bg-primary/10 border border-primary/20 rounded-xl space-y-1">
              <span className="text-xs text-primary font-semibold block">Total Hak Bersih yang Dibayarkan:</span>
              <span className="text-2xl font-black text-text-primary block font-mono">
                Rp {settlementToPay.totalVendorPayable.toLocaleString('id-ID')}
              </span>
              <span className="text-[11px] text-text-secondary block font-mono">
                {settlementToPay.vendorName} ({settlementToPay.settlementNumber})
              </span>
            </div>

            <form onSubmit={handleConfirmPay} className="space-y-4 text-xs">
              <div>
                <label className="block text-text-primary mb-1 font-semibold">Metode Pembayaran</label>
                <select
                  value={payMethod}
                  onChange={(e) => setPayMethod(e.target.value)}
                  className="w-full bg-card border border-border-subtle rounded-xl px-3 py-2 text-text-primary focus:outline-none focus:border-border-focus"
                >
                  <option value="Transfer Bank">Transfer Bank (BCA / Mandiri / BRI / BNI)</option>
                  <option value="Kas Toko">Kas Tunai Toko (Laci Kasir)</option>
                  <option value="Giro / Cek">Giro / Cek Perusahaan</option>
                </select>
              </div>

              <div>
                <label className="block text-text-primary mb-1 font-semibold">Nomor Referensi Transaksi Bank / Bukti Bayar</label>
                <input
                  type="text"
                  required
                  value={payRef}
                  onChange={(e) => setPayRef(e.target.value)}
                  placeholder="e.g. TRF-BCA-99210291"
                  className="w-full bg-card border border-border-subtle rounded-xl px-3 py-2 text-text-primary font-mono placeholder:text-text-muted focus:outline-none focus:border-border-focus"
                />
              </div>

              <div>
                <label className="block text-text-primary mb-1 font-semibold">Catatan Pelunasan</label>
                <input
                  type="text"
                  value={payNotes}
                  onChange={(e) => setPayNotes(e.target.value)}
                  placeholder="e.g. Transfer via m-Banking berhasil"
                  className="w-full bg-card border border-border-subtle rounded-xl px-3 py-2 text-text-primary placeholder:text-text-muted focus:outline-none focus:border-border-focus"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-border-subtle">
                <button
                  type="button"
                  onClick={() => setPayModalOpen(false)}
                  className="px-4 py-2 text-text-secondary hover:text-text-primary hover:bg-card-hover rounded-xl transition font-semibold"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={payLoading}
                  className="px-5 py-2 bg-primary hover:bg-primary-hover text-white font-bold rounded-xl transition flex items-center gap-1.5 shadow-sm"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{payLoading ? 'Memproses...' : 'Tandai Lunas Dibayar'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modals */}
      <ConsignmentVendorModal
        isOpen={vendorModalOpen}
        onClose={() => setVendorModalOpen(false)}
        onSuccess={fetchAllData}
        vendor={selectedVendor}
      />

      <ConsignmentIntakeModal
        isOpen={intakeModalOpen}
        onClose={() => setIntakeModalOpen(false)}
        onSuccess={fetchAllData}
        vendors={vendors}
      />

      <ConsignmentSettlementModal
        isOpen={settlementModalOpen}
        onClose={() => setSettlementModalOpen(false)}
        onSuccess={fetchAllData}
        vendors={vendors}
      />

      {selectedSettlementToPrint && (
        <ConsignmentSettlementPrintModal
          isOpen={printModalOpen}
          onClose={() => { setPrintModalOpen(false); setSelectedSettlementToPrint(null); }}
          settlement={selectedSettlementToPrint}
        />
      )}

      <ConsignmentReturnModal
        isOpen={returnModalOpen}
        onClose={() => setReturnModalOpen(false)}
        onSuccess={fetchAllData}
        vendors={vendors}
      />
    </div>
  );
};
