import React, { useState } from 'react';
import { 
  BarChart3, 
  TrendingUp, 
  TrendingDown, 
  PieChart, 
  Wallet, 
  CreditCard, 
  QrCode, 
  Banknote, 
  ArrowRight,
  Sparkles,
  Layers,
  Calendar,
  Clock,
  Flame,
  ShieldCheck,
  Users,
  Percent,
  Receipt
} from 'lucide-react';
import { 
  CategoryProfit, 
  HourlySalesPoint, 
  DayOfWeekSalesPoint, 
  TaxAuditSummary, 
  CashierSalesSummary, 
  PeriodGrowthSummary 
} from '../../types';

// =========================================================================
// 1. GRAFIK TREN PENJUALAN HARIAN & TRANSAKSI (BAR + LINE COMBO)
// =========================================================================

interface DailySalesTrendChartProps {
  data: { date: string; revenue: number; transactions: number }[];
}

export const DailySalesTrendChart: React.FC<DailySalesTrendChartProps> = ({ data }) => {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);
  const [metricView, setMetricView] = useState<'both' | 'revenue' | 'transactions'>('both');

  if (!data || data.length === 0) {
    return (
      <div className="bg-card border border-border-subtle rounded-2xl p-6 text-center space-y-2">
        <div className="w-12 h-12 rounded-full bg-subtle flex items-center justify-center mx-auto text-text-muted">
          <BarChart3 className="w-6 h-6" />
        </div>
        <h4 className="text-xs font-bold text-text-primary">Belum Ada Data Tren Penjualan</h4>
        <p className="text-[11px] text-text-muted">Data grafik akan terisi otomatis seiring transaksi kasir pada periode tanggal yang dipilih.</p>
      </div>
    );
  }

  // Calculate statistics
  const maxRevenue = Math.max(...data.map(d => d.revenue), 1000);
  const maxTransactions = Math.max(...data.map(d => d.transactions), 1);
  const totalRevenue = data.reduce((acc, d) => acc + d.revenue, 0);
  const totalTransactions = data.reduce((acc, d) => acc + d.transactions, 0);
  const avgDailyRevenue = Math.round(totalRevenue / data.length);
  
  // Peak day
  const peakDay = [...data].sort((a, b) => b.revenue - a.revenue)[0];

  // SVG dimensions
  const chartHeight = 180;
  const paddingBottom = 28;
  const paddingTop = 20;
  const usableHeight = chartHeight - paddingBottom - paddingTop;
  
  const width = 800;
  const barWidth = Math.max(12, Math.min(42, Math.floor((width - 80) / data.length) - 6));
  const spacing = (width - 80) / data.length;

  return (
    <div className="bg-card border border-border-subtle rounded-2xl p-5 shadow-sm space-y-4">
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-border-subtle">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
            <BarChart3 className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-xs font-bold text-text-primary uppercase tracking-wider">
              Grafik Tren Penjualan Harian & Frekuensi Transaksi
            </h3>
            <p className="text-[11px] text-text-muted">
              Visualisasi dinamika omzet harian dan lonjakan struk kasir
            </p>
          </div>
        </div>

        {/* View Toggle */}
        <div className="flex items-center gap-1.5 p-1 bg-subtle rounded-lg border border-border-subtle text-[11px] font-bold">
          <button
            type="button"
            onClick={() => setMetricView('both')}
            className={`px-2.5 py-1 rounded transition-all ${
              metricView === 'both' ? 'bg-card text-text-primary shadow-xs' : 'text-text-secondary hover:text-text-primary'
            }`}
          >
            Gabungan (Semua)
          </button>
          <button
            type="button"
            onClick={() => setMetricView('revenue')}
            className={`px-2.5 py-1 rounded transition-all ${
              metricView === 'revenue' ? 'bg-card text-primary shadow-xs' : 'text-text-secondary hover:text-text-primary'
            }`}
          >
            Omzet (Rp)
          </button>
          <button
            type="button"
            onClick={() => setMetricView('transactions')}
            className={`px-2.5 py-1 rounded transition-all ${
              metricView === 'transactions' ? 'bg-card text-emerald-600 shadow-xs' : 'text-text-secondary hover:text-text-primary'
            }`}
          >
            Struk (Qty)
          </button>
        </div>
      </div>

      {/* Highlights Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
        <div className="p-2.5 rounded-xl bg-subtle border border-border-subtle">
          <span className="text-[10px] font-medium text-text-muted block">Rata-rata Omzet / Hari</span>
          <span className="font-mono font-bold text-primary text-sm">
            Rp {avgDailyRevenue.toLocaleString('id-ID')}
          </span>
        </div>
        <div className="p-2.5 rounded-xl bg-subtle border border-border-subtle">
          <span className="text-[10px] font-medium text-text-muted block">Hari Omzet Tertinggi</span>
          <div className="flex items-center gap-1 font-mono font-bold text-text-primary text-xs">
            <span>{peakDay ? formatDateShort(peakDay.date) : '-'}</span>
            {peakDay && (
              <span className="text-[10px] text-emerald-600">(Rp {peakDay.revenue.toLocaleString('id-ID')})</span>
            )}
          </div>
        </div>
        <div className="p-2.5 rounded-xl bg-subtle border border-border-subtle">
          <span className="text-[10px] font-medium text-text-muted block">Total Titik Hari</span>
          <span className="font-mono font-bold text-text-primary text-sm">
            {data.length} Hari Aktif
          </span>
        </div>
        <div className="p-2.5 rounded-xl bg-subtle border border-border-subtle">
          <span className="text-[10px] font-medium text-text-muted block">Rata-rata Transaksi / Hari</span>
          <span className="font-mono font-bold text-emerald-600 text-sm">
            {Math.round(totalTransactions / data.length)} Struk/hari
          </span>
        </div>
      </div>

      {/* SVG Chart Area */}
      <div className="relative overflow-x-auto select-none pt-2">
        <svg
          viewBox={`0 0 ${width} ${chartHeight}`}
          className="w-full h-48 overflow-visible"
        >
          <defs>
            <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="rgb(var(--color-primary-rgb, 59, 130, 246))" stopOpacity="0.9" />
              <stop offset="100%" stopColor="rgb(var(--color-primary-rgb, 59, 130, 246))" stopOpacity="0.4" />
            </linearGradient>
            <linearGradient id="barGradientHover" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="rgb(var(--color-primary-rgb, 59, 130, 246))" stopOpacity="1" />
              <stop offset="100%" stopColor="rgb(var(--color-primary-rgb, 59, 130, 246))" stopOpacity="0.7" />
            </linearGradient>
          </defs>

          {/* Grid lines (horizontal) */}
          {[0, 0.25, 0.5, 0.75, 1].map((ratio, i) => {
            const y = paddingTop + usableHeight * (1 - ratio);
            const val = Math.round(maxRevenue * ratio);
            return (
              <g key={i}>
                <line
                  x1="45"
                  y1={y}
                  x2={width - 20}
                  y2={y}
                  stroke="currentColor"
                  className="text-border-subtle"
                  strokeDasharray="4 4"
                  strokeWidth="1"
                />
                <text
                  x="40"
                  y={y + 3}
                  textAnchor="end"
                  className="text-[9px] fill-text-muted font-mono"
                >
                  {formatCompactRupiah(val)}
                </text>
              </g>
            );
          })}

          {/* Base X Axis */}
          <line
            x1="45"
            y1={chartHeight - paddingBottom}
            x2={width - 20}
            y2={chartHeight - paddingBottom}
            stroke="currentColor"
            className="text-border-subtle"
            strokeWidth="1.5"
          />

          {/* Bars for Revenue */}
          {(metricView === 'both' || metricView === 'revenue') &&
            data.map((d, idx) => {
              const xCenter = 55 + idx * spacing + spacing / 2;
              const barHeight = Math.max(3, (d.revenue / maxRevenue) * usableHeight);
              const y = chartHeight - paddingBottom - barHeight;
              const isHovered = hoveredIdx === idx;

              return (
                <g 
                  key={`bar-${idx}`}
                  onMouseEnter={() => setHoveredIdx(idx)}
                  onMouseLeave={() => setHoveredIdx(null)}
                  className="cursor-pointer transition-all duration-150"
                >
                  <rect
                    x={xCenter - barWidth / 2}
                    y={y}
                    width={barWidth}
                    height={barHeight}
                    rx="4"
                    fill={isHovered ? "url(#barGradientHover)" : "url(#barGradient)"}
                    className={isHovered ? "filter drop-shadow" : ""}
                  />
                  {/* Subtle highlight ring when hovered */}
                  {isHovered && (
                    <rect
                      x={xCenter - barWidth / 2 - 1.5}
                      y={y - 1.5}
                      width={barWidth + 3}
                      height={barHeight + 3}
                      rx="5"
                      fill="none"
                      stroke="currentColor"
                      className="text-primary"
                      strokeWidth="1.5"
                    />
                  )}
                </g>
              );
            })}

          {/* Transaction Line & Dots */}
          {(metricView === 'both' || metricView === 'transactions') && (
            <g>
              {/* Path line */}
              {data.length > 1 && (
                <polyline
                  fill="none"
                  stroke="#10b981"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  points={data
                    .map((d, idx) => {
                      const x = 55 + idx * spacing + spacing / 2;
                      const y = chartHeight - paddingBottom - Math.max(3, (d.transactions / maxTransactions) * usableHeight);
                      return `${x},${y}`;
                    })
                    .join(' ')}
                />
              )}

              {/* Data points */}
              {data.map((d, idx) => {
                const x = 55 + idx * spacing + spacing / 2;
                const y = chartHeight - paddingBottom - Math.max(3, (d.transactions / maxTransactions) * usableHeight);
                const isHovered = hoveredIdx === idx;

                return (
                  <circle
                    key={`dot-${idx}`}
                    cx={x}
                    cy={y}
                    r={isHovered ? 5.5 : 3.5}
                    fill="#10b981"
                    stroke="#ffffff"
                    strokeWidth={isHovered ? 2 : 1.5}
                    className="cursor-pointer transition-all duration-150 drop-shadow-sm"
                    onMouseEnter={() => setHoveredIdx(idx)}
                    onMouseLeave={() => setHoveredIdx(null)}
                  />
                );
              })}
            </g>
          )}

          {/* X Axis Labels */}
          {data.map((d, idx) => {
            const x = 55 + idx * spacing + spacing / 2;
            const isHovered = hoveredIdx === idx;
            // Only show every few labels if there are too many days
            const showLabel = data.length <= 14 || idx % Math.ceil(data.length / 12) === 0 || idx === data.length - 1;

            if (!showLabel && !isHovered) return null;

            return (
              <text
                key={`label-${idx}`}
                x={x}
                y={chartHeight - 8}
                textAnchor="middle"
                className={`text-[9px] font-mono transition-colors ${
                  isHovered ? 'fill-primary font-bold' : 'fill-text-muted'
                }`}
              >
                {formatDateShort(d.date)}
              </text>
            );
          })}
        </svg>

        {/* Floating Tooltip Card */}
        {hoveredIdx !== null && data[hoveredIdx] && (
          <div 
            className="absolute top-0 pointer-events-none transition-all duration-100 z-10"
            style={{
              left: `${Math.max(10, Math.min(85, ((55 + hoveredIdx * spacing + spacing / 2) / width) * 100))}%`,
              transform: 'translateX(-50%)'
            }}
          >
            <div className="bg-card text-text-primary border border-border-strong p-2.5 rounded-xl shadow-2xl text-xs space-y-1">
              <p className="font-bold text-text-primary flex items-center gap-1.5 pb-1 border-b border-border-subtle">
                <Calendar className="w-3.5 h-3.5 text-primary" />
                <span>{formatDateFull(data[hoveredIdx].date)}</span>
              </p>
              <div className="space-y-0.5 pt-0.5 text-[11px] font-mono">
                <div className="flex items-center justify-between gap-4 text-primary font-bold">
                  <span>Omzet Penjualan:</span>
                  <span>Rp {data[hoveredIdx].revenue.toLocaleString('id-ID')}</span>
                </div>
                <div className="flex items-center justify-between gap-4 text-emerald-600 font-bold">
                  <span>Jumlah Struk:</span>
                  <span>{data[hoveredIdx].transactions} Transaksi</span>
                </div>
                <div className="flex items-center justify-between gap-4 text-text-muted pt-1 border-t border-border-subtle/50 text-[10px]">
                  <span>Rata-rata/Struk:</span>
                  <span>
                    Rp {data[hoveredIdx].transactions > 0
                      ? Math.round(data[hoveredIdx].revenue / data[hoveredIdx].transactions).toLocaleString('id-ID')
                      : '0'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Legend & Help footer */}
      <div className="flex items-center justify-between pt-2 border-t border-border-subtle text-[11px] text-text-muted">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-sm bg-primary" />
            <span className="font-semibold text-text-secondary">Omzet Penjualan (Rp)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-1.5 rounded-full bg-emerald-500" />
            <span className="font-semibold text-text-secondary">Frekuensi Struk Kasir</span>
          </div>
        </div>
        <span className="hidden sm:inline">Arahkan kursor ke grafik untuk rincian harian</span>
      </div>
    </div>
  );
};

// =========================================================================
// 2. DIAGRAM METODE PEMBAYARAN (DONUT CHART)
// =========================================================================

interface PaymentDistributionChartProps {
  data: { method: string; amount: number; count: number }[];
}

const PAYMENT_COLORS: Record<string, { bg: string; stroke: string; label: string; icon: any }> = {
  CASH: { bg: '#10b981', stroke: '#059669', label: 'Tunai (Cash)', icon: Banknote },
  QRIS: { bg: '#6366f1', stroke: '#4f46e5', label: 'QRIS Statis/Dinamis', icon: QrCode },
  TRANSFER: { bg: '#f59e0b', stroke: '#d97706', label: 'Transfer Bank', icon: ArrowRight },
  DEBIT: { bg: '#06b6d4', stroke: '#0891b2', label: 'Kartu Debit', icon: CreditCard },
  CREDIT: { bg: '#a855f7', stroke: '#9333ea', label: 'Kartu Kredit', icon: CreditCard },
  DEBT: { bg: '#f43f5e', stroke: '#e11d48', label: 'Kasbon / Member', icon: Wallet },
  OTHER: { bg: '#64748b', stroke: '#475569', label: 'Lainnya', icon: Wallet },
};

export const PaymentDistributionChart: React.FC<PaymentDistributionChartProps> = ({ data }) => {
  const [hoveredMethod, setHoveredMethod] = useState<string | null>(null);

  if (!data || data.length === 0) {
    return (
      <div className="bg-card border border-border-subtle rounded-2xl p-6 text-center space-y-2">
        <div className="w-12 h-12 rounded-full bg-subtle flex items-center justify-center mx-auto text-text-muted">
          <PieChart className="w-6 h-6" />
        </div>
        <h4 className="text-xs font-bold text-text-primary">Belum Ada Data Pembayaran</h4>
        <p className="text-[11px] text-text-muted">Diagram sebaran cara bayar akan muncul setelah ada penjualan.</p>
      </div>
    );
  }

  const totalAmount = data.reduce((sum, item) => sum + item.amount, 0);
  const totalCount = data.reduce((sum, item) => sum + item.count, 0);

  // Donut SVG parameters
  const size = 180;
  const strokeWidth = 24;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;

  // Compute stroke offsets
  let accumulatedPercent = 0;
  const slices = data.map((item) => {
    const percent = totalAmount > 0 ? (item.amount / totalAmount) : 0;
    const strokeDasharray = `${percent * circumference} ${circumference * (1 - percent)}`;
    const strokeDashoffset = -accumulatedPercent * circumference;
    accumulatedPercent += percent;

    const normalizedKey = (item.method || '').toUpperCase();
    const config = PAYMENT_COLORS[normalizedKey] || PAYMENT_COLORS.OTHER;

    return {
      ...item,
      percent: percent * 100,
      config,
      strokeDasharray,
      strokeDashoffset,
    };
  });

  const activeSlice = hoveredMethod ? slices.find(s => s.method === hoveredMethod) : null;

  return (
    <div className="bg-card border border-border-subtle rounded-2xl p-5 shadow-sm space-y-4">
      <div className="flex items-center justify-between pb-3 border-b border-border-subtle">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
            <PieChart className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-xs font-bold text-text-primary uppercase tracking-wider">
              Distribusi Metode Pembayaran
            </h3>
            <p className="text-[11px] text-text-muted">Sebaran nilai transaksi berdasarkan saluran pembayaran</p>
          </div>
        </div>
        <span className="px-2.5 py-1 rounded-full bg-subtle border border-border-subtle text-[11px] font-mono font-bold text-text-secondary">
          {totalCount} Total Transaksi
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
        {/* Donut Chart Canvas (Left/Center) */}
        <div className="md:col-span-5 flex justify-center items-center relative select-none">
          <div className="relative w-44 h-44">
            <svg viewBox={`0 0 ${size} ${size}`} className="w-full h-full -rotate-90">
              {/* Background ring */}
              <circle
                cx={size / 2}
                cy={size / 2}
                r={radius}
                fill="none"
                stroke="currentColor"
                className="text-subtle"
                strokeWidth={strokeWidth}
              />
              {/* Segments */}
              {slices.map((slice, i) => (
                <circle
                  key={i}
                  cx={size / 2}
                  cy={size / 2}
                  r={radius}
                  fill="none"
                  stroke={slice.config.bg}
                  strokeWidth={hoveredMethod === slice.method ? strokeWidth + 4 : strokeWidth}
                  strokeDasharray={slice.strokeDasharray}
                  strokeDashoffset={slice.strokeDashoffset}
                  strokeLinecap="butt"
                  className="transition-all duration-200 cursor-pointer"
                  onMouseEnter={() => setHoveredMethod(slice.method)}
                  onMouseLeave={() => setHoveredMethod(null)}
                />
              ))}
            </svg>

            {/* Center Label */}
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-2 pointer-events-none">
              {activeSlice ? (
                <>
                  <span className="text-[10px] font-bold text-text-muted uppercase tracking-wider">
                    {activeSlice.config.label}
                  </span>
                  <span className="text-base font-extrabold font-mono text-text-primary">
                    {activeSlice.percent.toFixed(1)}%
                  </span>
                  <span className="text-[10px] font-mono text-primary font-bold">
                    Rp {activeSlice.amount.toLocaleString('id-ID')}
                  </span>
                </>
              ) : (
                <>
                  <span className="text-[10px] font-bold text-text-muted uppercase tracking-wider">
                    Total Pembayaran
                  </span>
                  <span className="text-sm font-extrabold font-mono text-text-primary">
                    Rp {formatCompactRupiah(totalAmount)}
                  </span>
                  <span className="text-[10px] text-text-secondary">
                    {slices.length} Saluran
                  </span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Legend & Breakdown List (Right) */}
        <div className="md:col-span-7 space-y-2">
          {slices.map((slice, i) => {
            const Icon = slice.config.icon;
            const isHovered = hoveredMethod === slice.method;

            return (
              <div
                key={i}
                onMouseEnter={() => setHoveredMethod(slice.method)}
                onMouseLeave={() => setHoveredMethod(null)}
                className={`p-2.5 rounded-xl border transition-all cursor-pointer flex items-center justify-between text-xs ${
                  isHovered
                    ? 'bg-primary/10 border-primary shadow-xs'
                    : 'bg-subtle border-border-subtle hover:bg-card'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <span 
                    className="w-3 h-3 rounded-full flex-shrink-0" 
                    style={{ backgroundColor: slice.config.bg }} 
                  />
                  <div className="flex items-center gap-1.5 font-semibold text-text-primary">
                    <Icon className="w-3.5 h-3.5 text-text-muted" />
                    <span>{slice.config.label}</span>
                  </div>
                </div>

                <div className="text-right font-mono flex items-center gap-3">
                  <div className="text-right">
                    <p className="font-bold text-text-primary">Rp {slice.amount.toLocaleString('id-ID')}</p>
                    <p className="text-[10px] text-text-muted">{slice.count} Transaksi</p>
                  </div>
                  <span 
                    className="px-2 py-0.5 rounded text-[10px] font-bold text-white shadow-xs"
                    style={{ backgroundColor: slice.config.bg }}
                  >
                    {slice.percent.toFixed(1)}%
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

// =========================================================================
// 3. DIAGRAM BAR MARGIN & KONTRIBUSI KATEGORI PRODUK
// =========================================================================

interface CategoryMarginChartProps {
  categories: CategoryProfit[];
}

export const CategoryMarginChart: React.FC<CategoryMarginChartProps> = ({ categories }) => {
  if (!categories || categories.length === 0) return null;

  const maxRevenue = Math.max(...categories.map(c => c.revenue), 1);

  return (
    <div className="bg-card border border-border-subtle rounded-2xl p-5 shadow-sm space-y-4">
      <div className="flex items-center justify-between pb-3 border-b border-border-subtle">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-600 flex items-center justify-center font-bold">
            <Layers className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-xs font-bold text-text-primary uppercase tracking-wider">
              Diagram Kontribusi Omzet & Margin per Kategori
            </h3>
            <p className="text-[11px] text-text-muted">
              Perbandingan omzet penjualan, porsi modal HPP, dan persentase laba kotor
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3 text-[11px] text-text-muted font-semibold">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-sm bg-emerald-500" />
            <span>Laba Kotor</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-sm bg-slate-400 dark:bg-slate-600" />
            <span>Modal HPP</span>
          </div>
        </div>
      </div>

      <div className="space-y-3.5">
        {categories.map((c, idx) => {
          const revPercent = (c.revenue / maxRevenue) * 100;
          const grossProfitShare = c.revenue > 0 ? (c.grossProfit / c.revenue) * 100 : 0;
          const cogsShare = 100 - grossProfitShare;

          return (
            <div key={idx} className="space-y-1.5 text-xs">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-text-primary font-sans">{c.categoryName}</span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-600 font-bold border border-emerald-500/20 font-mono">
                    Margin: {c.marginPercentage}%
                  </span>
                </div>
                <div className="font-mono text-right flex items-center gap-3">
                  <span className="text-text-muted text-[11px]">
                    HPP: Rp {c.cogs.toLocaleString('id-ID')}
                  </span>
                  <span className="font-bold text-emerald-600 text-xs">
                    Laba: +Rp {c.grossProfit.toLocaleString('id-ID')}
                  </span>
                  <span className="font-extrabold text-primary text-xs">
                    (Rp {c.revenue.toLocaleString('id-ID')})
                  </span>
                </div>
              </div>

              {/* Proportional Split Bar */}
              <div className="h-3.5 w-full bg-subtle rounded-full overflow-hidden flex border border-border-subtle/50">
                <div 
                  className="h-full rounded-full overflow-hidden flex transition-all duration-500"
                  style={{ width: `${revPercent}%` }}
                >
                  {/* COGS Part */}
                  <div 
                    className="h-full bg-slate-400 dark:bg-slate-600"
                    style={{ width: `${cogsShare}%` }}
                    title={`HPP Modal: Rp ${c.cogs.toLocaleString('id-ID')}`}
                  />
                  {/* Gross Profit Part */}
                  <div 
                    className="h-full bg-emerald-500 hover:bg-emerald-400 transition-colors"
                    style={{ width: `${grossProfitShare}%` }}
                    title={`Laba Kotor: Rp ${c.grossProfit.toLocaleString('id-ID')}`}
                  />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

// =========================================================================
// 4. DIAGRAM ALUR FINANSIAL LABA RUGI (WATERFALL FINANCIAL FLOW CHART)
// =========================================================================

interface FinancialWaterfallChartProps {
  pnlData: {
    grossSales: number;
    totalDiscounts: number;
    totalReturns: number;
    netSales: number;
    totalCogs: number;
    grossProfit: number;
    grossMarginPercent: number;
    operatingExpenses: { total: number; breakdown: any[] };
    netOperatingIncome: number;
    netMarginPercent: number;
  };
}

export const FinancialWaterfallChart: React.FC<FinancialWaterfallChartProps> = ({ pnlData }) => {
  if (!pnlData) return null;

  const grossSales = pnlData.grossSales || 1;
  const isProfitable = pnlData.netOperatingIncome >= 0;

  const steps = [
    {
      label: 'Penjualan Kotor (Gross Sales)',
      sub: 'Total nilai transaksi kasir sebelum diskon/retur',
      amount: pnlData.grossSales,
      type: 'base',
      color: 'bg-blue-600',
      textColor: 'text-blue-600',
      badge: 'Basis (100%)',
      widthPercent: 100,
    },
    {
      label: '(-) Diskon & Retur',
      sub: `Diskon: Rp ${(pnlData.totalDiscounts || 0).toLocaleString('id-ID')} • Retur: Rp ${(pnlData.totalReturns || 0).toLocaleString('id-ID')}`,
      amount: (pnlData.totalDiscounts || 0) + (pnlData.totalReturns || 0),
      type: 'deduct',
      color: 'bg-rose-500',
      textColor: 'text-rose-600',
      badge: `-${(((pnlData.totalDiscounts + pnlData.totalReturns) / grossSales) * 100).toFixed(1)}%`,
      widthPercent: Math.min(100, Math.max(2, (((pnlData.totalDiscounts + pnlData.totalReturns) / grossSales) * 100))),
    },
    {
      label: '(=) Penjualan Bersih (Net Sales)',
      sub: 'Uang riil yang masuk dari pelanggan setelah potongan',
      amount: pnlData.netSales,
      type: 'subtotal',
      color: 'bg-indigo-600',
      textColor: 'text-indigo-600',
      badge: `${((pnlData.netSales / grossSales) * 100).toFixed(1)}%`,
      widthPercent: Math.min(100, Math.max(2, ((pnlData.netSales / grossSales) * 100))),
    },
    {
      label: '(-) HPP / Modal Pokok Barang (COGS)',
      sub: 'Harga beli barang dagangan yang laku terjual',
      amount: pnlData.totalCogs,
      type: 'deduct',
      color: 'bg-rose-500',
      textColor: 'text-rose-600',
      badge: `-${((pnlData.totalCogs / grossSales) * 100).toFixed(1)}%`,
      widthPercent: Math.min(100, Math.max(2, ((pnlData.totalCogs / grossSales) * 100))),
    },
    {
      label: '(=) Laba Kotor (Gross Profit)',
      sub: `Margin Kotor Toko: ${pnlData.grossMarginPercent}% dari Penjualan Bersih`,
      amount: pnlData.grossProfit,
      type: 'subtotal',
      color: 'bg-emerald-600',
      textColor: 'text-emerald-600',
      badge: `${pnlData.grossMarginPercent}% Margin`,
      widthPercent: Math.min(100, Math.max(2, ((pnlData.grossProfit / grossSales) * 100))),
    },
    {
      label: '(-) Beban Kas Toko (Operasional)',
      sub: `${pnlData.operatingExpenses.breakdown.length} pos biaya kas kecil operasional`,
      amount: pnlData.operatingExpenses.total,
      type: 'deduct',
      color: 'bg-rose-500',
      textColor: 'text-rose-600',
      badge: `-${((pnlData.operatingExpenses.total / grossSales) * 100).toFixed(1)}%`,
      widthPercent: Math.min(100, Math.max(2, ((pnlData.operatingExpenses.total / grossSales) * 100))),
    },
    {
      label: '(=) Laba Bersih Usaha (Net Income)',
      sub: isProfitable ? 'Laba bersih operasional yang siap diambil / ditahan' : 'Toko mengalami defisit operasional',
      amount: pnlData.netOperatingIncome,
      type: 'final',
      color: isProfitable ? 'bg-emerald-600' : 'bg-rose-600',
      textColor: isProfitable ? 'text-emerald-600' : 'text-rose-600',
      badge: `${pnlData.netMarginPercent}% Net Margin`,
      widthPercent: Math.min(100, Math.max(2, (Math.abs(pnlData.netOperatingIncome) / grossSales) * 100)),
    },
  ];

  return (
    <div className="bg-card border border-border-subtle rounded-2xl p-5 shadow-sm space-y-4">
      <div className="flex items-center justify-between pb-3 border-b border-border-subtle">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-600 flex items-center justify-center font-bold">
            <TrendingUp className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-xs font-bold text-text-primary uppercase tracking-wider">
              Diagram Alur Finansial Laba Rugi (Income Waterfall)
            </h3>
            <p className="text-[11px] text-text-muted">
              Visualisasi runtunan pembentukan laba bersih dari omzet kotor hingga laba final
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className={`px-3 py-1 rounded-full text-xs font-bold border font-mono ${
            isProfitable
              ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/30'
              : 'bg-rose-500/10 text-rose-600 border-rose-500/30'
          }`}>
            {isProfitable ? 'SURPLUS BERSIH' : 'DEFISIT BERSIH'}
          </span>
        </div>
      </div>

      {/* Waterfall Steps */}
      <div className="space-y-3 pt-1">
        {steps.map((step, idx) => (
          <div key={idx} className="space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <span className={`font-bold ${step.textColor}`}>{step.label}</span>
                <span className="text-[10px] text-text-muted hidden sm:inline">({step.sub})</span>
              </div>
              <div className="flex items-center gap-2 font-mono">
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-subtle border border-border-subtle text-text-secondary font-bold">
                  {step.badge}
                </span>
                <span className={`font-bold ${step.textColor}`}>
                  {step.type === 'deduct' && step.amount > 0 ? '-' : ''}
                  Rp {Math.abs(step.amount).toLocaleString('id-ID')}
                </span>
              </div>
            </div>

            {/* Visual Bar Indicator */}
            <div className="h-3 w-full bg-subtle rounded-full overflow-hidden flex items-center border border-border-subtle/40">
              <div
                className={`h-full rounded-full transition-all duration-500 ${step.color}`}
                style={{ width: `${step.widthPercent}%` }}
              />
            </div>
          </div>
        ))}
      </div>

      {/* Summary Footer */}
      <div className="p-3.5 bg-subtle rounded-xl border border-border-subtle flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2 text-text-secondary">
          <Sparkles className="w-4 h-4 text-amber-500 flex-shrink-0" />
          <span>
            Setiap <strong>Rp 100.000</strong> penjualan kotor menghasilkan <strong>Rp {Math.max(0, Math.round((pnlData.netOperatingIncome / grossSales) * 100000)).toLocaleString('id-ID')}</strong> laba bersih toko.
          </span>
        </div>
        <div className="font-mono font-bold text-text-primary text-xs">
          Rasio Efisiensi: {pnlData.grossSales > 0 ? Math.round(((pnlData.grossProfit - pnlData.operatingExpenses.total) / pnlData.grossProfit) * 100) : 0}% Laba Tertahan
        </div>
      </div>
    </div>
  );
};

// =========================================================================
// HELPER FORMATTERS
// =========================================================================

function formatDateShort(dateStr: string): string {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  const day = d.getDate();
  const month = d.toLocaleString('id-ID', { month: 'short' });
  return `${day} ${month}`;
}

function formatDateFull(dateStr: string): string {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString('id-ID', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });
}

function formatCompactRupiah(val: number): string {
  if (val >= 1_000_000_000) {
    return `${(val / 1_000_000_000).toFixed(1)}M`;
  }
  if (val >= 1_000_000) {
    return `${(val / 1_000_000).toFixed(1)}jt`;
  }
  if (val >= 1_000) {
    return `${(val / 1_000).toFixed(0)}rb`;
  }
  return val.toString();
}

// =========================================================================
// 5. INDIKATOR PERTUMBUHAN PERIODE (PERIOD GROWTH BADGE)
// =========================================================================

interface PeriodGrowthBadgeProps {
  growthPercent?: number;
  label?: string;
}

export const PeriodGrowthBadge: React.FC<PeriodGrowthBadgeProps> = ({ 
  growthPercent = 0, 
  label = 'vs periode lalu' 
}) => {
  if (growthPercent === 0 || isNaN(growthPercent)) return null;
  const isPositive = growthPercent > 0;
  return (
    <div className={`inline-flex items-center gap-1 text-[11px] font-mono font-bold px-2 py-0.5 rounded-full ${
      isPositive 
        ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20' 
        : 'bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/20'
    }`}>
      {isPositive ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
      <span>{isPositive ? `+${growthPercent}%` : `${growthPercent}%`}</span>
      <span className="text-[9px] font-sans font-normal opacity-80">{label}</span>
    </div>
  );
};

// =========================================================================
// 6. ANALISIS JAM SIBUK & WAKTU PENJUALAN (HOURLY PEAK HOURS CHART)
// =========================================================================

interface HourlySalesChartProps {
  data?: HourlySalesPoint[];
}

export const HourlySalesChart: React.FC<HourlySalesChartProps> = ({ data = [] }) => {
  const [hoveredHour, setHoveredHour] = useState<number | null>(null);
  const [filterMode, setFilterMode] = useState<'all' | 'business'>('business');

  if (!data || data.length === 0) return null;

  // Filter 07:00 - 23:00 or full 24 hours
  const filteredData = filterMode === 'business'
    ? data.filter(d => d.hour >= 7 && d.hour <= 23)
    : data;

  const maxRevenue = Math.max(...data.map(d => d.revenue), 1000);
  const peakHours = data.filter(d => d.isPeak && d.revenue > 0);
  const peakHourDesc = peakHours.length > 0
    ? peakHours.map(p => `${p.hour.toString().padStart(2, '0')}:00`).join(', ')
    : 'Merata';

  const chartHeight = 160;
  const paddingBottom = 28;
  const paddingTop = 20;
  const usableHeight = chartHeight - paddingBottom - paddingTop;
  const width = 800;
  const spacing = (width - 60) / filteredData.length;
  const barWidth = Math.max(10, Math.min(32, spacing - 6));

  return (
    <div className="bg-card border border-border-subtle rounded-2xl p-5 shadow-sm space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-border-subtle">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-500 flex items-center justify-center font-bold">
            <Clock className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-xs font-bold text-text-primary uppercase tracking-wider">
                Analisis Jam Sibuk Penjualan (Peak Hours)
              </h3>
              {peakHours.length > 0 && (
                <span className="px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-600 border border-amber-500/30 text-[10px] font-bold flex items-center gap-1">
                  <Flame className="w-3 h-3 text-amber-500" />
                  Jam Sibuk: {peakHourDesc}
                </span>
              )}
            </div>
            <p className="text-[11px] text-text-muted">
              Distribusi omzet dan kepadatan transaksi per jam untuk optimasi jadwal staf & stok
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 p-1 bg-subtle rounded-lg border border-border-subtle text-[11px] font-bold">
          <button
            type="button"
            onClick={() => setFilterMode('business')}
            className={`px-2.5 py-1 rounded transition-all ${
              filterMode === 'business' ? 'bg-card text-text-primary shadow-xs' : 'text-text-secondary hover:text-text-primary'
            }`}
          >
            Jam Toko (07-23)
          </button>
          <button
            type="button"
            onClick={() => setFilterMode('all')}
            className={`px-2.5 py-1 rounded transition-all ${
              filterMode === 'all' ? 'bg-card text-text-primary shadow-xs' : 'text-text-secondary hover:text-text-primary'
            }`}
          >
            24 Jam Penuh
          </button>
        </div>
      </div>

      {/* SVG Hourly Bars */}
      <div className="relative overflow-x-auto select-none pt-2">
        <svg viewBox={`0 0 ${width} ${chartHeight}`} className="w-full h-40 overflow-visible">
          <defs>
            <linearGradient id="hourlyGradientNormal" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.8" />
              <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.3" />
            </linearGradient>
            <linearGradient id="hourlyGradientPeak" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#f59e0b" stopOpacity="0.95" />
              <stop offset="100%" stopColor="#f59e0b" stopOpacity="0.45" />
            </linearGradient>
          </defs>

          {/* Horizontal gridlines */}
          {[0, 0.5, 1].map((ratio, i) => {
            const y = paddingTop + usableHeight * (1 - ratio);
            const val = Math.round(maxRevenue * ratio);
            return (
              <g key={i}>
                <line
                  x1="45"
                  y1={y}
                  x2={width - 15}
                  y2={y}
                  stroke="currentColor"
                  className="text-border-subtle"
                  strokeDasharray="4 4"
                  strokeWidth="1"
                />
                <text
                  x="40"
                  y={y + 3}
                  textAnchor="end"
                  className="text-[9px] fill-text-muted font-mono"
                >
                  {formatCompactRupiah(val)}
                </text>
              </g>
            );
          })}

          {/* Base line */}
          <line
            x1="45"
            y1={chartHeight - paddingBottom}
            x2={width - 15}
            y2={chartHeight - paddingBottom}
            stroke="currentColor"
            className="text-border-subtle"
            strokeWidth="1.5"
          />

          {/* Bars */}
          {filteredData.map((d, idx) => {
            const xCenter = 50 + idx * spacing + spacing / 2;
            const barHeight = Math.max(2, (d.revenue / maxRevenue) * usableHeight);
            const y = chartHeight - paddingBottom - barHeight;
            const isHovered = hoveredHour === d.hour;

            return (
              <g
                key={`hour-${d.hour}`}
                onMouseEnter={() => setHoveredHour(d.hour)}
                onMouseLeave={() => setHoveredHour(null)}
                className="cursor-pointer transition-all duration-150"
              >
                <rect
                  x={xCenter - barWidth / 2}
                  y={y}
                  width={barWidth}
                  height={barHeight}
                  rx="3"
                  fill={d.isPeak ? "url(#hourlyGradientPeak)" : "url(#hourlyGradientNormal)"}
                  className={isHovered ? "filter drop-shadow" : ""}
                />
                {/* Peak flame indicator dot */}
                {d.isPeak && (
                  <circle
                    cx={xCenter}
                    cy={y - 5}
                    r={3}
                    fill="#f59e0b"
                    className="animate-pulse"
                  />
                )}
                {/* X axis hour label */}
                <text
                  x={xCenter}
                  y={chartHeight - 10}
                  textAnchor="middle"
                  className={`text-[9px] font-mono ${
                    d.isPeak 
                      ? 'fill-amber-600 font-bold' 
                      : (isHovered ? 'fill-primary font-bold' : 'fill-text-muted')
                  }`}
                >
                  {d.hour.toString().padStart(2, '0')}
                </text>
              </g>
            );
          })}
        </svg>

        {/* Hover Tooltip */}
        {hoveredHour !== null && (
          (() => {
            const item = data.find(d => d.hour === hoveredHour);
            if (!item) return null;
            const filteredIdx = filteredData.findIndex(d => d.hour === hoveredHour);
            if (filteredIdx < 0) return null;
            const leftPercent = Math.max(10, Math.min(85, ((50 + filteredIdx * spacing + spacing / 2) / width) * 100));

            return (
              <div 
                className="absolute top-0 pointer-events-none transition-all duration-100 z-10"
                style={{ left: `${leftPercent}%`, transform: 'translateX(-50%)' }}
              >
                <div className="bg-card text-text-primary border border-border-strong p-2.5 rounded-xl shadow-2xl text-xs space-y-1">
                  <div className="flex items-center justify-between gap-3 pb-1 border-b border-border-subtle font-bold text-text-primary">
                    <span className="flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-primary" />
                      <span>Pukul {item.hourLabel}</span>
                    </span>
                    {item.isPeak && (
                      <span className="px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-600 font-bold text-[9px] flex items-center gap-0.5">
                        <Flame className="w-2.5 h-2.5" /> Peak Hour
                      </span>
                    )}
                  </div>
                  <div className="text-[11px] font-mono space-y-0.5">
                    <div className="flex justify-between gap-4 font-bold text-primary">
                      <span>Omzet Jam Ini:</span>
                      <span>Rp {item.revenue.toLocaleString('id-ID')}</span>
                    </div>
                    <div className="flex justify-between gap-4 font-bold text-emerald-600">
                      <span>Jumlah Transaksi:</span>
                      <span>{item.transactions} Struk</span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })()
        )}
      </div>

      <div className="flex items-center justify-between pt-2 border-t border-border-subtle text-[11px] text-text-muted">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-sm bg-blue-500" />
            <span className="font-semibold text-text-secondary">Jam Normal</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-sm bg-amber-500" />
            <span className="font-semibold text-text-secondary">Jam Sibuk Utama (Peak Rush)</span>
          </div>
        </div>
        <span>Gunakan data ini untuk penataan jadwal kasir & staf</span>
      </div>
    </div>
  );
};

// =========================================================================
// 7. REKAPITULASI PAJAK (PPN/PB1) & BIAYA LAYANAN RESMI
// =========================================================================

interface TaxAndServiceAuditCardProps {
  taxAudit?: TaxAuditSummary;
}

export const TaxAndServiceAuditCard: React.FC<TaxAndServiceAuditCardProps> = ({ taxAudit }) => {
  if (!taxAudit) return null;

  return (
    <div className="bg-card border border-border-subtle rounded-2xl p-5 shadow-sm space-y-4">
      <div className="flex items-center justify-between pb-3 border-b border-border-subtle">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-indigo-500/10 text-indigo-600 flex items-center justify-center font-bold">
            <ShieldCheck className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-xs font-bold text-text-primary uppercase tracking-wider">
              Rekapitulasi Pajak (PPN/PB1) & Biaya Layanan Toko
            </h3>
            <p className="text-[11px] text-text-muted">
              Laporan kepatuhan pajak siap pakai untuk pelaporan SPT Masa bulanan
            </p>
          </div>
        </div>

        <span className="px-2.5 py-1 rounded-full bg-indigo-500/10 text-indigo-600 border border-indigo-500/20 text-[10px] font-bold">
          Audit Pajak Terverifikasi
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
        {/* DPP Kena Pajak */}
        <div className="p-3.5 rounded-xl bg-subtle border border-border-subtle space-y-1">
          <span className="text-[11px] font-semibold text-text-secondary block">
            DPP (Penjualan Kena Pajak):
          </span>
          <p className="text-lg font-bold font-mono text-text-primary tabular-nums">
            Rp {taxAudit.taxableSales.toLocaleString('id-ID')}
          </p>
          <span className="text-[10px] text-text-muted block">Dasar Pengenaan Pajak</span>
        </div>

        {/* PPN / PB1 Terkumpul */}
        <div className="p-3.5 rounded-xl bg-indigo-500/5 border border-indigo-500/30 space-y-1">
          <span className="text-[11px] font-semibold text-indigo-600 dark:text-indigo-400 block">
            Pajak PPN / PB1 Terkumpul:
          </span>
          <p className="text-lg font-bold font-mono text-indigo-600 dark:text-indigo-400 tabular-nums">
            Rp {taxAudit.totalTax.toLocaleString('id-ID')}
          </p>
          <span className="text-[10px] text-indigo-500/80 block">Kewajiban Setor Kas Negara/Daerah</span>
        </div>

        {/* Service Charge Terkumpul */}
        <div className="p-3.5 rounded-xl bg-subtle border border-border-subtle space-y-1">
          <span className="text-[11px] font-semibold text-text-secondary block">
            Biaya Layanan (Service Charge):
          </span>
          <p className="text-lg font-bold font-mono text-amber-600 dark:text-amber-400 tabular-nums">
            Rp {taxAudit.totalServiceCharge.toLocaleString('id-ID')}
          </p>
          <span className="text-[10px] text-text-muted block">Alokasi Tim Pelayan & Kitchen</span>
        </div>

        {/* Penjualan Bebas Pajak */}
        <div className="p-3.5 rounded-xl bg-subtle border border-border-subtle space-y-1">
          <span className="text-[11px] font-semibold text-text-secondary block">
            Penjualan Bebas Pajak:
          </span>
          <p className="text-lg font-bold font-mono text-text-primary tabular-nums">
            Rp {taxAudit.nonTaxableSales.toLocaleString('id-ID')}
          </p>
          <span className="text-[10px] text-text-muted block">Bebas PPN / Tarif 0%</span>
        </div>
      </div>

      {taxAudit.totalRounding !== 0 && (
        <div className="p-2.5 bg-subtle rounded-xl border border-border-subtle flex items-center justify-between text-xs font-mono text-text-muted">
          <span>Total Selisih Pembulatan Kasir:</span>
          <span className={taxAudit.totalRounding > 0 ? 'text-emerald-600 font-bold' : 'text-amber-600 font-bold'}>
            {taxAudit.totalRounding > 0 ? `+Rp ${taxAudit.totalRounding.toLocaleString('id-ID')}` : `-Rp ${Math.abs(taxAudit.totalRounding).toLocaleString('id-ID')}`}
          </span>
        </div>
      )}
    </div>
  );
};

// =========================================================================
// 8. LAPORAN KONTRIBUSI & PRODUKTIVITAS KASIR
// =========================================================================

interface CashierPerformanceTableProps {
  cashiers?: CashierSalesSummary[];
}

export const CashierPerformanceTable: React.FC<CashierPerformanceTableProps> = ({ cashiers = [] }) => {
  if (!cashiers || cashiers.length === 0) return null;

  return (
    <div className="bg-card border border-border-subtle rounded-2xl p-5 shadow-sm space-y-4">
      <div className="flex items-center justify-between pb-3 border-b border-border-subtle">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center font-bold">
            <Users className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-xs font-bold text-text-primary uppercase tracking-wider">
              Laporan Produktivitas Kasir & Staf Penjualan
            </h3>
            <p className="text-[11px] text-text-muted">
              Rincian kontribusi omzet dan jumlah transaksi yang dilayani masing-masing staf
            </p>
          </div>
        </div>

        <span className="px-2.5 py-1 rounded-full bg-subtle border border-border-subtle text-[11px] font-mono font-bold text-text-secondary">
          {cashiers.length} Kasir Aktif
        </span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead className="bg-subtle text-text-secondary font-semibold border-b border-border-subtle">
            <tr>
              <th className="p-3">Nama Kasir / Staf</th>
              <th className="p-3">Total Omzet</th>
              <th className="p-3">Jumlah Struk</th>
              <th className="p-3">Rata-rata/Struk</th>
              <th className="p-3">Pangsa Kontribusi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border-subtle/50 font-mono">
            {cashiers.map((c, idx) => (
              <tr key={idx} className="hover:bg-card-hover/50 transition-colors">
                <td className="p-3 font-sans font-bold text-text-primary flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-full bg-primary/15 text-primary flex items-center justify-center text-[10px] font-bold uppercase">
                    {c.cashierName.slice(0, 2)}
                  </div>
                  <div>
                    <p className="text-xs font-semibold">{c.cashierName}</p>
                    <p className="text-[10px] font-mono text-text-muted font-normal">ID: {c.cashierId || 'System'}</p>
                  </div>
                </td>
                <td className="p-3 font-bold text-primary">
                  Rp {c.revenue.toLocaleString('id-ID')}
                </td>
                <td className="p-3 text-text-primary">
                  {c.transactions} Transaksi
                </td>
                <td className="p-3 text-text-muted">
                  Rp {Math.round(c.averageTicket).toLocaleString('id-ID')}
                </td>
                <td className="p-3">
                  <div className="flex items-center gap-2">
                    <div className="w-24 h-2 bg-subtle rounded-full overflow-hidden border border-border-subtle">
                      <div 
                        className="h-full bg-primary rounded-full" 
                        style={{ width: `${Math.min(100, c.revenueSharePercent)}%` }} 
                      />
                    </div>
                    <span className="text-[11px] font-bold text-text-primary">
                      {c.revenueSharePercent}%
                    </span>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
