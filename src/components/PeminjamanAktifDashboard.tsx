import React, { useState, useMemo, useEffect } from 'react';
import { DatabaseState, Transaksi, Guru, Barang } from '../types';
import {
  Clock,
  Search,
  Filter,
  RotateCcw,
  CheckCircle2,
  AlertTriangle,
  Laptop,
  Users,
  Box,
  Layers,
  ArrowUpDown,
  Printer,
  Calendar,
  Sparkles,
  ChevronRight,
  RefreshCw,
  Eye,
  X,
  Check,
  Zap,
  Tag,
  SlidersHorizontal,
  LayoutGrid,
  List
} from 'lucide-react';
import { playScannerSuccessBeep } from '../lib/scannerAudio';

interface PeminjamanAktifDashboardProps {
  db: DatabaseState;
  setDb: React.Dispatch<React.SetStateAction<DatabaseState>>;
  onGoToKasirWithGuru: (guru: Guru, targetTx?: Transaksi) => void;
  showToast: (msg: string, type: 'success' | 'error' | 'info' | 'warning') => void;
}

export const PeminjamanAktifDashboard: React.FC<PeminjamanAktifDashboardProps> = ({
  db,
  setDb,
  onGoToKasirWithGuru,
  showToast
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedDurationFilter, setSelectedDurationFilter] = useState<'all' | 'recent' | 'medium' | 'long'>('all');
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'units'>('newest');
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');

  // Direct return modal state
  const [quickReturnModalTx, setQuickReturnModalTx] = useState<Transaksi | null>(null);
  const [quickReturnQty, setQuickReturnQty] = useState<number>(1);
  const [isProcessingReturn, setIsProcessingReturn] = useState(false);

  // Detail Modal State
  const [selectedDetailTx, setSelectedDetailTx] = useState<Transaksi | null>(null);

  // Live timer tick to update "x time ago" dynamically
  const [, setTick] = useState(0);
  useEffect(() => {
    const timer = setInterval(() => setTick((t) => t + 1), 30000);
    return () => clearInterval(timer);
  }, []);

  // Filter Active Transactions
  const activeTransaksis = useMemo(() => {
    return db.transaksis.filter((t) => t.status === 'aktif');
  }, [db.transaksis]);

  // Extract Categories
  const categories = useMemo(() => {
    const set = new Set<string>();
    db.barangs.forEach((b) => {
      if (b.kategori) set.add(b.kategori);
    });
    return Array.from(set);
  }, [db.barangs]);

  // Calculate Overall Statistics
  const stats = useMemo(() => {
    const totalTransactions = activeTransaksis.length;
    let totalUnits = 0;
    const uniqueGuruIds = new Set<string>();
    let overThreeHoursCount = 0;

    const now = Date.now();

    activeTransaksis.forEach((tx) => {
      const remaining = tx.jumlah - (tx.jumlah_kembali || 0);
      totalUnits += remaining;
      uniqueGuruIds.add(tx.guru_id);

      const pinjamTime = new Date(tx.tgl_pinjam).getTime();
      const diffHours = (now - pinjamTime) / (1000 * 60 * 60);
      if (diffHours >= 3) {
        overThreeHoursCount++;
      }
    });

    return {
      totalTransactions,
      totalUnits,
      totalGurus: uniqueGuruIds.size,
      overThreeHoursCount
    };
  }, [activeTransaksis]);

  // Helper to format human elapsed time
  const getElapsedTimeString = (isoDate: string) => {
    const diffMs = Date.now() - new Date(isoDate).getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'Baru saja';
    if (diffMins < 60) return `${diffMins} menit lalu`;
    if (diffHours < 24) {
      const remainingMins = diffMins % 60;
      return remainingMins > 0 ? `${diffHours} jam ${remainingMins} mnt` : `${diffHours} jam lalu`;
    }
    return `${diffDays} hari lalu`;
  };

  // Helper to determine status severity based on duration
  const getDurationBadge = (isoDate: string) => {
    const diffHours = (Date.now() - new Date(isoDate).getTime()) / (1000 * 60 * 60);
    if (diffHours > 24) {
      return {
        label: '> 24 Jam (Perlu Diingatkan)',
        color: 'bg-rose-500/10 text-rose-700 border-rose-200'
      };
    }
    if (diffHours >= 4) {
      return {
        label: 'Durasi Panjang (> 4 Jam)',
        color: 'bg-amber-500/10 text-amber-700 border-amber-200'
      };
    }
    if (diffHours >= 1) {
      return {
        label: 'Sedang Dipakai',
        color: 'bg-sky-500/10 text-[#074A69] border-sky-200'
      };
    }
    return {
      label: 'Baru Dipinjam',
      color: 'bg-emerald-500/10 text-emerald-700 border-emerald-200'
    };
  };

  // Filtered and Sorted Active Transactions
  const filteredTransaksis = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const now = Date.now();

    return activeTransaksis
      .filter((tx) => {
        const guru = db.gurus.find((g) => g.id === tx.guru_id);
        const barang = db.barangs.find((b) => b.kode === tx.barang_kode);

        // Search text matching
        if (q) {
          const matchTxId = tx.id.toLowerCase().includes(q);
          const matchGuruName = guru ? guru.nama.toLowerCase().includes(q) : false;
          const matchGuruId = tx.guru_id.toLowerCase().includes(q);
          const matchGuruMapel = guru ? guru.mapel.toLowerCase().includes(q) : false;
          const matchBarangName = barang ? barang.nama.toLowerCase().includes(q) : false;
          const matchBarangKode = tx.barang_kode.toLowerCase().includes(q);

          if (
            !matchTxId &&
            !matchGuruName &&
            !matchGuruId &&
            !matchGuruMapel &&
            !matchBarangName &&
            !matchBarangKode
          ) {
            return false;
          }
        }

        // Category filter
        if (selectedCategory !== 'all') {
          if (!barang || barang.kategori !== selectedCategory) {
            return false;
          }
        }

        // Duration filter
        if (selectedDurationFilter !== 'all') {
          const diffHours = (now - new Date(tx.tgl_pinjam).getTime()) / (1000 * 60 * 60);
          if (selectedDurationFilter === 'recent' && diffHours > 2) return false;
          if (selectedDurationFilter === 'medium' && (diffHours <= 2 || diffHours > 4)) return false;
          if (selectedDurationFilter === 'long' && diffHours <= 4) return false;
        }

        return true;
      })
      .sort((a, b) => {
        if (sortBy === 'newest') {
          return new Date(b.tgl_pinjam).getTime() - new Date(a.tgl_pinjam).getTime();
        }
        if (sortBy === 'oldest') {
          return new Date(a.tgl_pinjam).getTime() - new Date(b.tgl_pinjam).getTime();
        }
        if (sortBy === 'units') {
          const remA = a.jumlah - (a.jumlah_kembali || 0);
          const remB = b.jumlah - (b.jumlah_kembali || 0);
          return remB - remA;
        }
        return 0;
      });
  }, [activeTransaksis, db.gurus, db.barangs, searchQuery, selectedCategory, selectedDurationFilter, sortBy]);

  // Execute Direct Return from Modal
  const handleConfirmDirectReturn = () => {
    if (!quickReturnModalTx) return;

    setIsProcessingReturn(true);
    const tx = quickReturnModalTx;
    const nowIso = new Date().toISOString();
    const returnQty = quickReturnQty;

    const updatedBarangs = [...db.barangs];
    const updatedTransaksis = [...db.transaksis];

    const txIndex = updatedTransaksis.findIndex((t) => t.id === tx.id);
    if (txIndex !== -1) {
      const currentTx = updatedTransaksis[txIndex];
      const newTotalReturned = (currentTx.jumlah_kembali || 0) + returnQty;

      currentTx.jumlah_kembali = newTotalReturned;
      if (newTotalReturned >= currentTx.jumlah) {
        currentTx.status = 'selesai';
        currentTx.tgl_kembali = nowIso;
      }

      // Restore barang stock
      const barangIndex = updatedBarangs.findIndex((b) => b.kode === currentTx.barang_kode);
      if (barangIndex !== -1) {
        updatedBarangs[barangIndex].tersedia = Math.min(
          updatedBarangs[barangIndex].total_stok,
          updatedBarangs[barangIndex].tersedia + returnQty
        );
      }

      setDb((prev) => ({
        ...prev,
        barangs: updatedBarangs,
        transaksis: updatedTransaksis
      }));

      playScannerSuccessBeep();
      showToast(`Berhasil mengembalikan ${returnQty} unit barang!`, 'success');
    }

    setIsProcessingReturn(false);
    setQuickReturnModalTx(null);
  };

  // Open Direct Return Modal
  const handleOpenDirectReturnModal = (tx: Transaksi) => {
    const remaining = tx.jumlah - (tx.jumlah_kembali || 0);
    setQuickReturnModalTx(tx);
    setQuickReturnQty(remaining);
  };

  // Print Active Borrowings Report
  const handlePrintActiveReport = () => {
    window.print();
  };

  return (
    <div className="flex flex-col gap-6 text-left w-full">
      {/* Top Banner / Heading */}
      <div className="bg-gradient-to-r from-[#074A69] via-[#09577c] to-[#042d40] text-white p-5 sm:p-6 rounded-2xl shadow-md border border-[#074A69]/30 relative overflow-hidden flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="absolute right-0 top-0 bottom-0 w-1/3 opacity-10 bg-[radial-gradient(#38bdf8_1px,transparent_1px)] [background-size:16px_16px] pointer-events-none"></div>

        <div className="relative z-10">
          <div className="flex items-center gap-2 mb-1.5">
            <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
            </span>
            <span className="text-xs uppercase tracking-wider font-extrabold text-emerald-300">
              Live Monitoring Lab Komputer
            </span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black tracking-tight text-white flex items-center gap-2.5">
            <Clock className="w-6 h-6 text-sky-300" /> Dashboard Peminjaman Aktif
          </h2>
          <p className="text-xs sm:text-sm text-sky-100/80 mt-1 max-w-xl">
            Pantau real-time semua perangkat laptop, proyektor, dan aksesoris yang sedang berada di luar lab beserta
            informasi guru peminjam.
          </p>
        </div>

        <div className="relative z-10 flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={handlePrintActiveReport}
            className="px-3.5 py-2 bg-white/15 hover:bg-white/25 text-white border border-white/20 rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer backdrop-blur-xs shadow-2xs"
            title="Cetak Laporan Peminjaman Berlangsung"
          >
            <Printer className="w-4 h-4 text-sky-200" />
            <span>Cetak Ringkasan</span>
          </button>
        </div>
      </div>

      {/* 4 Summary Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Card 1: Total Transaksi Aktif */}
        <div className="bg-white/95 backdrop-blur-sm p-4 sm:p-5 rounded-2xl border border-[#074A69]/15 shadow-xs flex items-center gap-3.5 transition hover:shadow-sm">
          <div className="w-11 h-11 rounded-xl bg-sky-50 text-[#074A69] border border-sky-100 flex items-center justify-center shrink-0">
            <Layers className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Transaksi Aktif</p>
            <h3 className="text-xl sm:text-2xl font-black text-gray-900 leading-tight">
              {stats.totalTransactions} <span className="text-xs font-normal text-gray-500">Berkas</span>
            </h3>
          </div>
        </div>

        {/* Card 2: Total Unit Sedang Dipinjam */}
        <div className="bg-white/95 backdrop-blur-sm p-4 sm:p-5 rounded-2xl border border-[#074A69]/15 shadow-xs flex items-center gap-3.5 transition hover:shadow-sm">
          <div className="w-11 h-11 rounded-xl bg-amber-50 text-amber-700 border border-amber-100 flex items-center justify-center shrink-0">
            <Box className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Unit di Luar Lab</p>
            <h3 className="text-xl sm:text-2xl font-black text-gray-900 leading-tight">
              {stats.totalUnits} <span className="text-xs font-normal text-gray-500">Perangkat</span>
            </h3>
          </div>
        </div>

        {/* Card 3: Guru Peminjam */}
        <div className="bg-white/95 backdrop-blur-sm p-4 sm:p-5 rounded-2xl border border-[#074A69]/15 shadow-xs flex items-center gap-3.5 transition hover:shadow-sm">
          <div className="w-11 h-11 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-100 flex items-center justify-center shrink-0">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Guru Peminjam</p>
            <h3 className="text-xl sm:text-2xl font-black text-gray-900 leading-tight">
              {stats.totalGurus} <span className="text-xs font-normal text-gray-500">Orang</span>
            </h3>
          </div>
        </div>

        {/* Card 4: Pinjaman Lama */}
        <div className="bg-white/95 backdrop-blur-sm p-4 sm:p-5 rounded-2xl border border-[#074A69]/15 shadow-xs flex items-center gap-3.5 transition hover:shadow-sm">
          <div
            className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 border ${
              stats.overThreeHoursCount > 0
                ? 'bg-rose-50 text-rose-600 border-rose-100'
                : 'bg-emerald-50 text-emerald-600 border-emerald-100'
            }`}
          >
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Pinjaman &gt; 3 Jam</p>
            <h3
              className={`text-xl sm:text-2xl font-black leading-tight ${
                stats.overThreeHoursCount > 0 ? 'text-rose-600' : 'text-gray-900'
              }`}
            >
              {stats.overThreeHoursCount} <span className="text-xs font-normal text-gray-500">Perlu Pantau</span>
            </h3>
          </div>
        </div>
      </div>

      {/* Control Filters Bar */}
      <div className="bg-white/90 backdrop-blur-md p-4 rounded-2xl border border-[#074A69]/15 shadow-xs flex flex-col lg:flex-row gap-3 items-stretch lg:items-center justify-between">
        {/* Search Input */}
        <div className="relative flex-1 min-w-[240px]">
          <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-3 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari nama guru, ID kartu (KB-001), barang, ID transaksi..."
            className="w-full pl-10 pr-8 py-2 bg-slate-50 border border-gray-200 rounded-xl text-xs sm:text-sm font-medium text-gray-800 placeholder-gray-400 focus:bg-white focus:border-[#074A69] focus:ring-2 focus:ring-[#074A69]/20 outline-none transition"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-2.5 text-gray-400 hover:text-gray-600 text-xs"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Filter Pills */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Category Filter */}
          <div className="flex items-center gap-1 bg-slate-50 border border-gray-200 rounded-xl px-2.5 py-1.5 text-xs">
            <Filter className="w-3.5 h-3.5 text-[#074A69]" />
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="bg-transparent font-bold text-gray-700 outline-none cursor-pointer text-xs"
            >
              <option value="all">Semua Kategori</option>
              {categories.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>

          {/* Duration Filter */}
          <div className="flex items-center gap-1 bg-slate-50 border border-gray-200 rounded-xl px-2.5 py-1.5 text-xs">
            <Clock className="w-3.5 h-3.5 text-[#074A69]" />
            <select
              value={selectedDurationFilter}
              onChange={(e) => setSelectedDurationFilter(e.target.value as any)}
              className="bg-transparent font-bold text-gray-700 outline-none cursor-pointer text-xs"
            >
              <option value="all">Semua Durasi</option>
              <option value="recent">Baru (&lt; 2 Jam)</option>
              <option value="medium">Sedang (2-4 Jam)</option>
              <option value="long">Panjang (&gt; 4 Jam)</option>
            </select>
          </div>

          {/* Sort By */}
          <div className="flex items-center gap-1 bg-slate-50 border border-gray-200 rounded-xl px-2.5 py-1.5 text-xs">
            <ArrowUpDown className="w-3.5 h-3.5 text-[#074A69]" />
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="bg-transparent font-bold text-gray-700 outline-none cursor-pointer text-xs"
            >
              <option value="newest">Terbaru Dipinjam</option>
              <option value="oldest">Terlama (Prioritas)</option>
              <option value="units">Unit Terbanyak</option>
            </select>
          </div>

          {/* View Toggle */}
          <div className="flex items-center bg-slate-100 p-0.5 rounded-xl border border-gray-200">
            <button
              type="button"
              onClick={() => setViewMode('grid')}
              className={`p-1.5 rounded-lg transition cursor-pointer ${
                viewMode === 'grid' ? 'bg-white text-[#074A69] shadow-2xs font-bold' : 'text-gray-500 hover:text-gray-800'
              }`}
              title="Tampilan Grid Kartu"
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => setViewMode('table')}
              className={`p-1.5 rounded-lg transition cursor-pointer ${
                viewMode === 'table' ? 'bg-white text-[#074A69] shadow-2xs font-bold' : 'text-gray-500 hover:text-gray-800'
              }`}
              title="Tampilan Tabel Rinci"
            >
              <List className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Main Content: Active Loans Grid / Table */}
      {filteredTransaksis.length === 0 ? (
        <div className="bg-white/90 backdrop-blur-md rounded-2xl border border-dashed border-gray-300 p-12 text-center flex flex-col items-center justify-center">
          <div className="w-16 h-16 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mb-3">
            <CheckCircle2 className="w-8 h-8" />
          </div>
          <h3 className="text-base font-extrabold text-gray-900">
            {activeTransaksis.length === 0
              ? 'Tidak Ada Peminjaman Aktif Saat Ini'
              : 'Tidak Ada Transaksi yang Sesuai Filter'}
          </h3>
          <p className="text-xs text-gray-500 max-w-md mt-1">
            {activeTransaksis.length === 0
              ? 'Semua perangkat lab (laptop, proyektor, kabel) sudah dikembalikan dan tersimpan aman di lemari inventaris.'
              : 'Coba ubah kata kunci pencarian atau reset filter kategori / durasi di atas.'}
          </p>
          {(searchQuery || selectedCategory !== 'all' || selectedDurationFilter !== 'all') && (
            <button
              onClick={() => {
                setSearchQuery('');
                setSelectedCategory('all');
                setSelectedDurationFilter('all');
              }}
              className="mt-4 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-gray-700 font-bold rounded-xl text-xs transition cursor-pointer"
            >
              Reset Semua Filter
            </button>
          )}
        </div>
      ) : viewMode === 'grid' ? (
        /* GRID VIEW */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
          {filteredTransaksis.map((tx) => {
            const guru = db.gurus.find((g) => g.id === tx.guru_id);
            const barang = db.barangs.find((b) => b.kode === tx.barang_kode);
            const remaining = tx.jumlah - (tx.jumlah_kembali || 0);
            const durationBadge = getDurationBadge(tx.tgl_pinjam);
            const elapsed = getElapsedTimeString(tx.tgl_pinjam);

            const pinjamDateFormatted = new Date(tx.tgl_pinjam).toLocaleTimeString('id-ID', {
              hour: '2-digit',
              minute: '2-digit'
            });

            return (
              <div
                key={tx.id}
                className="bg-white/95 backdrop-blur-md rounded-2xl border border-[#074A69]/20 shadow-xs hover:shadow-md transition-all flex flex-col justify-between overflow-hidden group"
              >
                {/* Card Header */}
                <div className="p-4 sm:p-5 pb-3">
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <span className="font-mono text-xs font-bold text-[#074A69] bg-sky-50 px-2.5 py-1 rounded-lg border border-sky-100">
                      {tx.id}
                    </span>

                    <span
                      className={`text-[10px] font-bold px-2.5 py-1 rounded-full border flex items-center gap-1 ${durationBadge.color}`}
                    >
                      <Clock className="w-3 h-3" />
                      <span>{elapsed}</span>
                    </span>
                  </div>

                  {/* Teacher Info */}
                  <div className="flex items-start gap-3 mb-4">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#074A69] to-[#0d6b97] text-white flex items-center justify-center font-black text-sm shrink-0 shadow-2xs">
                      {guru ? guru.nama.charAt(0).toUpperCase() : 'G'}
                    </div>
                    <div className="min-w-0 flex-1">
                      <h4 className="text-sm font-extrabold text-gray-900 truncate group-hover:text-[#074A69] transition">
                        {guru ? guru.nama : tx.guru_id}
                      </h4>
                      <p className="text-xs text-gray-500 truncate">
                        {guru ? `${guru.mapel}` : 'Guru Peminjam'}
                      </p>
                      <span className="inline-block mt-0.5 font-mono text-[10px] font-bold text-sky-700 bg-[#f0f7fb] px-1.5 py-0.5 rounded">
                        ID: {tx.guru_id}
                      </span>
                    </div>
                  </div>

                  {/* Item Details Box */}
                  <div className="bg-slate-50/80 rounded-xl p-3 border border-gray-100 flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-[10px] uppercase font-bold text-gray-400">Barang Dipinjam:</p>
                      <p className="text-xs sm:text-sm font-extrabold text-gray-900 truncate">
                        {barang ? barang.nama : tx.barang_kode}
                      </p>
                      <p className="text-[10px] text-gray-500 font-mono">
                        Kode: {tx.barang_kode} {barang ? `• ${barang.kategori}` : ''}
                      </p>
                    </div>

                    <div className="text-right shrink-0 bg-white px-2.5 py-1.5 rounded-lg border border-gray-200 shadow-2xs">
                      <p className="text-[10px] font-bold text-gray-400 uppercase">Sisa Pinjam</p>
                      <p className="text-sm font-black text-rose-600">
                        {remaining} <span className="text-[10px] font-bold text-gray-600">Unit</span>
                      </p>
                    </div>
                  </div>

                  {/* Pinjam timestamp note */}
                  <p className="text-[11px] text-gray-400 mt-2.5 flex items-center gap-1 font-medium">
                    <Calendar className="w-3 h-3 text-gray-400" />
                    <span>Waktu Ambil: {pinjamDateFormatted} WIB</span>
                  </p>
                </div>

                {/* Card Action Buttons Footer */}
                <div className="p-3 bg-slate-50/90 border-t border-gray-100 flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleOpenDirectReturnModal(tx)}
                    className="flex-1 py-2 px-2.5 bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800 text-white rounded-xl text-xs font-bold transition shadow-xs flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Kembalikan Cepat</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      if (guru) onGoToKasirWithGuru(guru, tx);
                    }}
                    className="py-2 px-3 bg-white hover:bg-sky-50 text-[#074A69] border border-[#074A69]/30 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1 cursor-pointer"
                    title="Buka Guru Ini di Kasir / Transaksi"
                  >
                    <Zap className="w-3.5 h-3.5 text-amber-500" />
                    <span className="hidden sm:inline">Kasir</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setSelectedDetailTx(tx)}
                    className="p-2 bg-white hover:bg-gray-100 text-gray-600 border border-gray-200 rounded-xl transition cursor-pointer"
                    title="Lihat Rincian Lengkap"
                  >
                    <Eye className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* TABLE VIEW */
        <div className="bg-white/95 backdrop-blur-md rounded-2xl border border-[#074A69]/15 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-gray-200 text-gray-600 font-extrabold uppercase tracking-wider text-[10px]">
                  <th className="py-3.5 px-4">ID Transaksi</th>
                  <th className="py-3.5 px-4">Guru Peminjam</th>
                  <th className="py-3.5 px-4">Barang Lab</th>
                  <th className="py-3.5 px-4 text-center">Unit Dipinjam</th>
                  <th className="py-3.5 px-4">Waktu Pinjam</th>
                  <th className="py-3.5 px-4">Durasi Berjalan</th>
                  <th className="py-3.5 px-4 text-center">Aksi Cepat</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredTransaksis.map((tx) => {
                  const guru = db.gurus.find((g) => g.id === tx.guru_id);
                  const barang = db.barangs.find((b) => b.kode === tx.barang_kode);
                  const remaining = tx.jumlah - (tx.jumlah_kembali || 0);
                  const durationBadge = getDurationBadge(tx.tgl_pinjam);
                  const elapsed = getElapsedTimeString(tx.tgl_pinjam);

                  return (
                    <tr key={tx.id} className="hover:bg-[#f0f7fb]/60 transition">
                      <td className="py-3.5 px-4 font-mono font-bold text-[#074A69]">{tx.id}</td>
                      <td className="py-3.5 px-4">
                        <p className="font-extrabold text-gray-900">{guru ? guru.nama : tx.guru_id}</p>
                        <p className="text-[10px] text-gray-500">
                          {guru?.mapel} • <span className="font-mono text-sky-700">{tx.guru_id}</span>
                        </p>
                      </td>
                      <td className="py-3.5 px-4">
                        <p className="font-bold text-gray-900">{barang ? barang.nama : tx.barang_kode}</p>
                        <p className="text-[10px] text-gray-500 font-mono">
                          {tx.barang_kode} {barang ? `(${barang.kategori})` : ''}
                        </p>
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <span className="font-black text-rose-600 bg-rose-50 border border-rose-200 px-2.5 py-1 rounded-lg">
                          {remaining} Unit
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-gray-600 font-mono text-[11px]">
                        {new Date(tx.tgl_pinjam).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })} WIB
                      </td>
                      <td className="py-3.5 px-4">
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full border inline-flex items-center gap-1 ${durationBadge.color}`}
                        >
                          <Clock className="w-3 h-3" /> {elapsed}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleOpenDirectReturnModal(tx)}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white px-2.5 py-1 rounded-lg text-xs font-bold transition flex items-center gap-1 cursor-pointer shadow-2xs"
                            title="Proses Pengembalian Langsung"
                          >
                            <RotateCcw className="w-3 h-3" />
                            <span>Kembali</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              if (guru) onGoToKasirWithGuru(guru, tx);
                            }}
                            className="bg-[#074A69] hover:bg-[#05364d] text-white px-2 py-1 rounded-lg text-xs font-bold transition flex items-center gap-1 cursor-pointer"
                            title="Buka di Kasir"
                          >
                            <Zap className="w-3 h-3 text-amber-400" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal: Direct Return Action */}
      {quickReturnModalTx && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 border border-gray-100 animate-fadeIn text-left">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100 mb-4">
              <h3 className="font-extrabold text-base text-gray-900 flex items-center gap-2">
                <RotateCcw className="w-5 h-5 text-emerald-600" /> Konfirmasi Pengembalian Barang
              </h3>
              <button
                onClick={() => setQuickReturnModalTx(null)}
                className="w-8 h-8 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-600 flex items-center justify-center transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Transaction Brief */}
            <div className="bg-[#f0f7fb] p-4 rounded-xl border border-sky-100 mb-4 space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-gray-500 font-medium">ID Transaksi:</span>
                <span className="font-mono font-bold text-[#074A69]">{quickReturnModalTx.id}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500 font-medium">Peminjam:</span>
                <span className="font-bold text-gray-900">
                  {db.gurus.find((g) => g.id === quickReturnModalTx.guru_id)?.nama || quickReturnModalTx.guru_id}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500 font-medium">Barang:</span>
                <span className="font-bold text-gray-900">
                  {db.barangs.find((b) => b.kode === quickReturnModalTx.barang_kode)?.nama ||
                    quickReturnModalTx.barang_kode}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500 font-medium">Total Masih Dipinjam:</span>
                <span className="font-bold text-rose-600">
                  {quickReturnModalTx.jumlah - (quickReturnModalTx.jumlah_kembali || 0)} Unit
                </span>
              </div>
            </div>

            {/* Qty Selector */}
            <div className="mb-5">
              <label className="block text-xs font-extrabold text-gray-700 uppercase tracking-wider mb-2">
                Jumlah Unit yang Dikembalikan:
              </label>
              <div className="flex items-center gap-3">
                <input
                  type="range"
                  min="1"
                  max={quickReturnModalTx.jumlah - (quickReturnModalTx.jumlah_kembali || 0)}
                  value={quickReturnQty}
                  onChange={(e) => setQuickReturnQty(parseInt(e.target.value) || 1)}
                  className="flex-1 accent-emerald-600 cursor-pointer"
                />
                <span className="w-16 text-center py-2 px-3 bg-slate-100 border border-gray-200 rounded-xl font-bold text-sm text-emerald-800">
                  {quickReturnQty} Unit
                </span>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setQuickReturnModalTx(null)}
                className="flex-1 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-xl text-xs transition cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                disabled={isProcessingReturn}
                onClick={handleConfirmDirectReturn}
                className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs transition shadow-md shadow-emerald-600/20 flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                <Check className="w-4 h-4" />
                <span>{isProcessingReturn ? 'Menyimpan...' : 'Proses Kembali'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Transaction Details */}
      {selectedDetailTx && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 border border-gray-100 animate-fadeIn text-left">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100 mb-4">
              <h3 className="font-extrabold text-base text-gray-900 flex items-center gap-2">
                <Box className="w-5 h-5 text-[#074A69]" /> Detail Transaksi Peminjaman
              </h3>
              <button
                onClick={() => setSelectedDetailTx(null)}
                className="w-8 h-8 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-600 flex items-center justify-center transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {(() => {
              const guru = db.gurus.find((g) => g.id === selectedDetailTx.guru_id);
              const barang = db.barangs.find((b) => b.kode === selectedDetailTx.barang_kode);
              const remaining = selectedDetailTx.jumlah - (selectedDetailTx.jumlah_kembali || 0);

              return (
                <div className="space-y-3.5 text-xs text-gray-700">
                  <div className="p-3 bg-slate-50 rounded-xl border border-gray-200 space-y-1.5">
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Identitas Peminjam</p>
                    <p className="text-sm font-extrabold text-gray-900">{guru?.nama || selectedDetailTx.guru_id}</p>
                    <p className="text-gray-500">Mata Pelajaran: {guru?.mapel || '-'}</p>
                    <p className="text-gray-500">NIP: {guru?.nip || '-'}</p>
                    <p className="font-mono text-sky-700 font-bold">ID Barcode: {selectedDetailTx.guru_id}</p>
                  </div>

                  <div className="p-3 bg-slate-50 rounded-xl border border-gray-200 space-y-1.5">
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Perangkat Lab</p>
                    <p className="text-sm font-extrabold text-gray-900">{barang?.nama || selectedDetailTx.barang_kode}</p>
                    <p className="text-gray-500">Kategori: {barang?.kategori || '-'}</p>
                    <p className="font-mono text-gray-600">Kode Barang: {selectedDetailTx.barang_kode}</p>
                    <p className="font-bold text-rose-600">Sedang Dipinjam: {remaining} Unit</p>
                  </div>

                  <div className="p-3 bg-slate-50 rounded-xl border border-gray-200 space-y-1">
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Waktu Peminjaman</p>
                    <p className="font-medium text-gray-800">
                      {new Date(selectedDetailTx.tgl_pinjam).toLocaleString('id-ID', {
                        weekday: 'long',
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </p>
                  </div>

                  <div className="flex gap-2.5 pt-2">
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedDetailTx(null);
                        handleOpenDirectReturnModal(selectedDetailTx);
                      }}
                      className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs transition flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <RotateCcw className="w-4 h-4" /> Kembalikan Barang
                    </button>
                  </div>
                </div>
              );
            })()}
          </div>
        </div>
      )}
    </div>
  );
};
