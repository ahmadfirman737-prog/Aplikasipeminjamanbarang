import React, { useState, useEffect, useRef, useMemo } from 'react';
import { DatabaseState, Guru, User, Transaksi, Barang } from '../types';
import { CameraScanner } from './CameraScanner';
import { HardwareBarcodeGunScanner } from './HardwareBarcodeGunScanner';
import { saveDatabaseToFirestore } from '../lib/firebase';
import { playScannerSuccessBeep, playScannerErrorBeep } from '../lib/scannerAudio';
import {
  Laptop,
  UserCheck,
  AlertCircle,
  Barcode,
  CheckCircle2,
  Undo2,
  Clock,
  Search,
  LogOut,
  RotateCcw,
  Box,
  Layers,
  Sparkles,
  Cloud,
  Users,
  X,
  Check,
  RefreshCw,
  Camera,
  Radio
} from 'lucide-react';

interface PetugasDashboardProps {
  db: DatabaseState;
  setDb: React.Dispatch<React.SetStateAction<DatabaseState>>;
  currentUser: User;
  onLogout: () => void;
  showToast: (msg: string, type: 'success' | 'error' | 'info' | 'warning') => void;
  isFirebaseConnected?: boolean;
}

// Smart lookup function for Guru
export function findGuruSmart(query: string, gurus: Guru[]): Guru | undefined {
  const raw = (query || '').trim();
  if (!raw) return undefined;

  const upper = raw.toUpperCase();
  const cleanAlphanumeric = upper.replace(/[^A-Z0-9]/g, '');

  // 1. Exact ID match (case-insensitive, trimmed)
  let match = gurus.find((g) => g.id.trim().toUpperCase() === upper);
  if (match) return match;

  // 2. Alphanumeric normalized match (e.g. "KB001" or "KB 001" matches "KB-001")
  if (cleanAlphanumeric.length >= 2) {
    match = gurus.find((g) => {
      const gClean = g.id.replace(/[^A-Z0-9]/g, '').toUpperCase();
      return gClean === cleanAlphanumeric;
    });
    if (match) return match;
  }

  // 3. Partial end match for numeric suffixes (e.g. "001" or "01" matching "KB-001")
  const numericOnly = raw.replace(/[^0-9]/g, '');
  if (numericOnly.length >= 2) {
    match = gurus.find((g) => {
      const gNum = g.id.replace(/[^0-9]/g, '');
      return gNum === numericOnly || gNum.endsWith(numericOnly);
    });
    if (match) return match;
  }

  // 4. Match by NIP
  if (numericOnly.length >= 4) {
    match = gurus.find((g) => {
      if (!g.nip) return false;
      const nipDigits = g.nip.replace(/[^0-9]/g, '');
      return nipDigits.includes(numericOnly);
    });
    if (match) return match;
  }

  // 5. Match by Nama (case-insensitive)
  const lower = raw.toLowerCase();
  match = gurus.find((g) => g.nama.toLowerCase() === lower);
  if (match) return match;

  const partialName = gurus.filter((g) => g.nama.toLowerCase().includes(lower));
  if (partialName.length === 1) return partialName[0];

  return undefined;
}

export const PetugasDashboard: React.FC<PetugasDashboardProps> = ({
  db,
  setDb,
  currentUser,
  onLogout,
  showToast,
  isFirebaseConnected = true
}) => {
  const [scannedGuru, setScannedGuru] = useState<Guru | null>(null);
  const [scannerMode, setScannerMode] = useState<'gun' | 'camera'>('gun');
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
  const [manualInputId, setManualInputId] = useState('');
  const [showGuruPickerModal, setShowGuruPickerModal] = useState(false);
  const [guruPickerSearch, setGuruPickerSearch] = useState('');
  const [activeTab, setActiveTab] = useState<'pinjam' | 'kembali'>('pinjam');

  // Selected items for borrowing: { [kodeBarang]: quantity }
  const [borrowSelection, setBorrowSelection] = useState<Record<string, number>>({});

  // Selected transactions for return: { [trxId]: returnQuantity }
  const [returnSelection, setReturnSelection] = useState<Record<string, number>>({});

  // Barcode scanner buffer for USB / Physical barcode guns
  const scanBufferRef = useRef<string>('');
  const lastKeyTimeRef = useRef<number>(0);

  // Live matching suggestions for manual input
  const suggestions = useMemo(() => {
    const q = manualInputId.trim().toLowerCase();
    if (!q || q.length < 1) return [];
    return db.gurus.filter((g) => {
      const idMatch = g.id.toLowerCase().includes(q) || g.id.replace(/[^a-z0-9]/g, '').includes(q);
      const nameMatch = g.nama.toLowerCase().includes(q);
      const mapelMatch = g.mapel.toLowerCase().includes(q);
      const nipMatch = g.nip ? g.nip.replace(/[^0-9]/g, '').includes(q.replace(/[^0-9]/g, '')) : false;
      return idMatch || nameMatch || mapelMatch || nipMatch;
    }).slice(0, 4);
  }, [manualInputId, db.gurus]);

  // Scan Teacher Handler
  const handleBarcodeScanned = (id: string) => {
    const guru = findGuruSmart(id, db.gurus);

    if (guru) {
      if (soundEnabled) playScannerSuccessBeep();
      setScannedGuru(guru);
      showToast(`Kartu terdeteksi: ${guru.nama} (${guru.id})`, 'success');
      setReturnSelection({});
      setManualInputId('');
    } else {
      if (soundEnabled) playScannerErrorBeep();
      showToast(`ID / Barcode "${id.trim()}" tidak ditemukan dalam sistem!`, 'error');
    }
  };

  const handleManualScanSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (manualInputId.trim()) {
      handleBarcodeScanned(manualInputId);
    }
  };

  const handleSelectGuruDirect = (guru: Guru) => {
    setScannedGuru(guru);
    showToast(`Guru dipilih: ${guru.nama} (${guru.id})`, 'success');
    setReturnSelection({});
    setManualInputId('');
    setShowGuruPickerModal(false);
  };

  const handleResetScannedGuru = () => {
    setScannedGuru(null);
    setBorrowSelection({});
    setReturnSelection({});
    setActiveTab('pinjam');
  };

  // Listen for USB / Hardware Barcode Reader
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target && (target.tagName === 'TEXTAREA' || (target.tagName === 'INPUT' && (target as HTMLInputElement).type === 'password'))) {
        return;
      }

      const now = Date.now();
      if (now - lastKeyTimeRef.current > 150) {
        scanBufferRef.current = '';
      }
      lastKeyTimeRef.current = now;

      if (e.key === 'Enter') {
        if (scanBufferRef.current.length >= 3) {
          handleBarcodeScanned(scanBufferRef.current);
          scanBufferRef.current = '';
          e.preventDefault();
        }
      } else if (e.key.length === 1) {
        scanBufferRef.current += e.key;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [db.gurus]);

  // Toggle selection for borrowing
  const handleToggleBorrowBarang = (kode: string, maxQty: number) => {
    setBorrowSelection((prev) => {
      const next = { ...prev };
      if (next[kode] !== undefined) {
        delete next[kode];
      } else {
        next[kode] = 1;
      }
      return next;
    });
  };

  const handleQtyBorrowChange = (kode: string, qty: number, maxQty: number) => {
    const validQty = Math.max(1, Math.min(maxQty, qty));
    setBorrowSelection((prev) => ({
      ...prev,
      [kode]: validQty
    }));
  };

  // Process Borrowing Submission
  const handleSubmitPeminjaman = (e: React.FormEvent) => {
    e.preventDefault();

    if (!scannedGuru) {
      showToast('Silakan scan kartu guru terlebih dahulu!', 'warning');
      return;
    }

    const selectedKodes = Object.keys(borrowSelection);
    if (selectedKodes.length === 0) {
      showToast('Pilih setidaknya satu barang untuk dipinjam!', 'warning');
      return;
    }

    const nowIso = new Date().toISOString();
    const newTransaksis: Transaksi[] = [];

    // Clone barangs array to update available stock
    const updatedBarangs = [...db.barangs];

    for (const kode of selectedKodes) {
      const qtyToBorrow = borrowSelection[kode];
      const barangIndex = updatedBarangs.findIndex((b) => b.kode === kode);

      if (barangIndex !== -1) {
        const barang = updatedBarangs[barangIndex];
        if (barang.tersedia >= qtyToBorrow) {
          barang.tersedia -= qtyToBorrow;

          const randomNum = Math.floor(1000 + Math.random() * 9000);
          newTransaksis.push({
            id: `TRX-${randomNum}`,
            guru_id: scannedGuru.id,
            barang_kode: kode,
            jumlah: qtyToBorrow,
            jumlah_kembali: 0,
            tgl_pinjam: nowIso,
            tgl_kembali: null,
            status: 'aktif'
          });
        }
      }
    }

    if (newTransaksis.length > 0) {
      setDb((prev) => ({
        ...prev,
        barangs: updatedBarangs,
        transaksis: [...prev.transaksis, ...newTransaksis]
      }));

      showToast(`Peminjaman ${newTransaksis.length} item berhasil dicatat!`, 'success');
      setBorrowSelection({});
    }
  };

  // Toggle selection for return
  const handleToggleReturnTx = (txId: string, maxQty: number) => {
    setReturnSelection((prev) => {
      const next = { ...prev };
      if (next[txId] !== undefined) {
        delete next[txId];
      } else {
        next[txId] = maxQty;
      }
      return next;
    });
  };

  const handleQtyReturnChange = (txId: string, qty: number, maxQty: number) => {
    const validQty = Math.max(1, Math.min(maxQty, qty));
    setReturnSelection((prev) => ({
      ...prev,
      [txId]: validQty
    }));
  };

  // Process Return Submission
  const handleSubmitPengembalian = (e: React.FormEvent) => {
    e.preventDefault();

    if (!scannedGuru) {
      showToast('Silakan scan kartu guru terlebih dahulu!', 'warning');
      return;
    }

    const selectedTxIds = Object.keys(returnSelection);
    if (selectedTxIds.length === 0) {
      showToast('Pilih setidaknya satu barang untuk dikembalikan!', 'warning');
      return;
    }

    const nowIso = new Date().toISOString();
    const updatedBarangs = [...db.barangs];
    const updatedTransaksis = [...db.transaksis];

    for (const txId of selectedTxIds) {
      const returnQty = returnSelection[txId];
      const txIndex = updatedTransaksis.findIndex((t) => t.id === txId);

      if (txIndex !== -1) {
        const tx = updatedTransaksis[txIndex];
        const newTotalReturned = (tx.jumlah_kembali || 0) + returnQty;

        tx.jumlah_kembali = newTotalReturned;
        if (newTotalReturned >= tx.jumlah) {
          tx.status = 'selesai';
          tx.tgl_kembali = nowIso;
        }

        // Restore stock
        const barangIndex = updatedBarangs.findIndex((b) => b.kode === tx.barang_kode);
        if (barangIndex !== -1) {
          updatedBarangs[barangIndex].tersedia = Math.min(
            updatedBarangs[barangIndex].total_stok,
            updatedBarangs[barangIndex].tersedia + returnQty
          );
        }
      }
    }

    setDb((prev) => ({
      ...prev,
      barangs: updatedBarangs,
      transaksis: updatedTransaksis
    }));

    showToast('Pengembalian barang berhasil dicatat!', 'success');
    setReturnSelection({});
  };

  // Quick Action from Active Loan Card
  const handleQuickReturnClick = (tx: Transaksi) => {
    const guru = db.gurus.find((g) => g.id === tx.guru_id);
    if (guru) {
      setScannedGuru(guru);
      setActiveTab('kembali');
      const sisa = tx.jumlah - (tx.jumlah_kembali || 0);
      setReturnSelection({ [tx.id]: sisa });
      showToast(`Pilih pengembalian untuk ${guru.nama}`, 'info');
    }
  };

  // Active Loans calculation
  const activeTransaksis = db.transaksis.filter((t) => t.status === 'aktif');
  const teacherActiveTransaksis = scannedGuru
    ? db.transaksis.filter((t) => t.guru_id === scannedGuru.id && t.status === 'aktif')
    : [];

  const [isSyncing, setIsSyncing] = useState(false);

  const handleSyncCloud = async () => {
    setIsSyncing(true);
    try {
      const ok = await saveDatabaseToFirestore(db);
      if (ok) {
        showToast(
          `Semua data (${db.gurus.length} Kartu Guru) tersimpan aman di Firebase Cloud!`,
          'success'
        );
      } else {
        showToast('Gagal sinkronisasi ke Firebase. Cek koneksi.', 'error');
      }
    } catch {
      showToast('Gagal sinkronisasi ke Firebase.', 'error');
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <div className="flex flex-col h-screen bg-slate-50 w-full text-left overflow-hidden">
      {/* Header */}
      <header className="bg-white px-6 py-4 flex justify-between items-center z-10 border-b border-[#074A69]/20 shadow-xs">
        <div className="flex items-center gap-3.5">
          <div className="bg-gradient-to-br from-[#074A69] to-[#0c618c] text-white p-2.5 rounded-xl shadow-md shadow-[#074A69]/20 shrink-0">
            <Laptop className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-base sm:text-lg font-extrabold text-gray-900 tracking-tight">
              Dasbor Pelayanan Lab Komputer
            </h1>
            <p className="text-xs text-gray-500 font-medium">SMP-SMK Kusuma Bangsa Bogor</p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 sm:gap-3">
          <button
            onClick={handleSyncCloud}
            disabled={isSyncing}
            className={`px-3 py-1.5 rounded-full text-[11px] sm:text-xs font-bold border flex items-center gap-1.5 shadow-2xs transition cursor-pointer ${
              isFirebaseConnected
                ? 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border-emerald-200'
                : 'bg-amber-50 hover:bg-amber-100 text-amber-700 border-amber-200'
            }`}
            title="Klik untuk sinkronkan seluruh data ke Firebase Cloud"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">
              {isSyncing ? 'Menyimpan...' : isFirebaseConnected ? 'Firebase Realtime' : 'Sinkronkan'}
            </span>
          </button>

          <span className="bg-gradient-to-r from-[#f0f7fb] to-[#e1f0f7] text-[#074A69] px-3.5 py-1.5 rounded-full text-xs font-bold flex items-center gap-2 border border-[#074A69]/30 shadow-2xs">
            <UserCheck className="w-4 h-4 text-[#074A69]" /> {currentUser.name}
          </span>
          <button
            onClick={onLogout}
            className="w-9 h-9 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-600 flex items-center justify-center transition border border-rose-200 cursor-pointer"
            title="Keluar"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 p-4 sm:p-6 overflow-y-auto flex flex-col gap-6 text-left">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 min-h-[440px]">
          {/* Column 1: Scanner */}
          <div className="lg:col-span-1 flex flex-col">
            <div className="bg-white/90 backdrop-blur-md p-4 sm:p-5 rounded-2xl shadow-sm border border-[#074A69]/15 flex flex-col h-full">
              {/* Scanner Mode Toggle Bar */}
              <div className="flex bg-slate-100 p-1 rounded-xl mb-4 border border-slate-200">
                <button
                  type="button"
                  onClick={() => setScannerMode('gun')}
                  className={`flex-1 py-2 px-2.5 rounded-lg text-xs font-extrabold flex items-center justify-center gap-1.5 transition cursor-pointer ${
                    scannerMode === 'gun'
                      ? 'bg-[#074A69] text-white shadow-xs'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-slate-200/60'
                  }`}
                >
                  <Barcode className="w-3.5 h-3.5" />
                  <span>Alat Scanner Barcode</span>
                </button>

                <button
                  type="button"
                  onClick={() => setScannerMode('camera')}
                  className={`flex-1 py-2 px-2.5 rounded-lg text-xs font-extrabold flex items-center justify-center gap-1.5 transition cursor-pointer ${
                    scannerMode === 'camera'
                      ? 'bg-[#074A69] text-white shadow-xs'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-slate-200/60'
                  }`}
                >
                  <Camera className="w-3.5 h-3.5" />
                  <span>Kamera Web / HP</span>
                </button>
              </div>

              {/* Active Scanner Screen */}
              {scannerMode === 'gun' ? (
                <HardwareBarcodeGunScanner
                  onScanSuccess={handleBarcodeScanned}
                  gurus={db.gurus}
                  soundEnabled={soundEnabled}
                  onToggleSound={() => setSoundEnabled((prev) => !prev)}
                  lastScannedGuru={scannedGuru}
                />
              ) : (
                <CameraScanner onScanSuccess={handleBarcodeScanned} />
              )}

              {/* Manual Input Input Form */}
              <div className="relative mt-4">
                <form onSubmit={handleManualScanSubmit} className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#074A69]">
                    <Barcode className="w-4 h-4" />
                  </div>
                  <input
                    type="text"
                    value={manualInputId}
                    onChange={(e) => setManualInputId(e.target.value)}
                    placeholder="Input manual ID / NIP / Nama Guru..."
                    className="w-full pl-10 pr-16 border border-[#074A69]/20 rounded-xl p-2.5 text-xs font-mono font-bold focus:border-[#074A69] focus:ring-2 focus:ring-[#074A69]/20 bg-white outline-none"
                  />
                  <button
                    type="submit"
                    className="absolute right-1.5 top-1.5 bottom-1.5 px-3 bg-[#074A69] text-white text-xs font-bold rounded-lg hover:bg-[#05364d] transition cursor-pointer"
                  >
                    Proses
                  </button>
                </form>

                {/* Instant Suggestions Dropdown */}
                {suggestions.length > 0 && (
                  <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-gray-200 rounded-xl shadow-xl z-30 overflow-hidden divide-y divide-gray-100">
                    {suggestions.map((g) => (
                      <button
                        key={g.id}
                        type="button"
                        onClick={() => handleSelectGuruDirect(g)}
                        className="w-full p-2.5 text-left hover:bg-[#f0f7fb] flex items-center justify-between transition cursor-pointer"
                      >
                        <div>
                          <p className="text-xs font-bold text-gray-900">{g.nama}</p>
                          <p className="text-[10px] text-gray-500">{g.mapel}</p>
                        </div>
                        <span className="text-xs font-mono font-bold text-[#074A69] bg-sky-50 px-2 py-0.5 rounded">
                          {g.id}
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Quick Pick Guru Button */}
              <div className="mt-3">
                <button
                  type="button"
                  onClick={() => setShowGuruPickerModal(true)}
                  className="w-full py-2 px-3 bg-slate-100 hover:bg-slate-200 text-gray-700 font-semibold rounded-xl text-xs flex items-center justify-center gap-2 transition cursor-pointer border border-gray-200"
                >
                  <Users className="w-3.5 h-3.5 text-[#074A69]" /> Pilih Guru Dari Daftar ({db.gurus.length})
                </button>
              </div>
            </div>
          </div>

          {/* Column 2 & 3: Borrowing & Return Forms */}
          <div className="lg:col-span-2 flex flex-col">
            <div className="bg-white/90 backdrop-blur-md p-5 sm:p-6 rounded-2xl shadow-sm border border-[#074A69]/15 h-full flex flex-col">
              {/* Tabs */}
              <div className="flex gap-4 mb-4 border-b border-[#074A69]/15 pb-0">
                <button
                  type="button"
                  onClick={() => setActiveTab('pinjam')}
                  className={`w-1/2 py-2.5 text-xs sm:text-sm font-extrabold transition border-b-2 cursor-pointer ${
                    activeTab === 'pinjam'
                      ? 'border-[#074A69] text-[#074A69]'
                      : 'border-transparent text-gray-400 hover:text-[#074A69]'
                  }`}
                >
                  Form Peminjaman Baru
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('kembali')}
                  className={`w-1/2 py-2.5 text-xs sm:text-sm font-extrabold transition border-b-2 cursor-pointer ${
                    activeTab === 'kembali'
                      ? 'border-[#074A69] text-[#074A69]'
                      : 'border-transparent text-gray-400 hover:text-[#074A69]'
                  }`}
                >
                  Form Pengembalian Barang
                </button>
              </div>

              {/* Detected Teacher Card */}
              <div
                className={`mb-4 p-3.5 sm:p-4 rounded-xl border transition shadow-2xs flex justify-between items-center ${
                  scannedGuru
                    ? 'bg-emerald-50/80 border-emerald-200'
                    : 'bg-gradient-to-r from-[#f0f7fb] to-[#e1f0f7]/50 border-[#074A69]/20'
                }`}
              >
                <div>
                  <p className="text-[10px] text-[#074A69] font-bold uppercase tracking-wider">Peminjam Terdeteksi:</p>
                  <p className="text-sm sm:text-base font-extrabold text-gray-900 mt-0.5">
                    {scannedGuru ? scannedGuru.nama : 'Belum ada kartu di-scan'}
                  </p>
                  <p className="text-xs text-[#074A69] font-mono font-semibold">
                    {scannedGuru ? `${scannedGuru.id} — ${scannedGuru.mapel}` : 'Silakan scan kartu guru'}
                  </p>
                </div>

                {scannedGuru ? (
                  <div className="flex items-center gap-2">
                    <span className="bg-emerald-100 text-emerald-800 px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Terverifikasi
                    </span>
                    <button
                      onClick={handleResetScannedGuru}
                      className="text-xs text-rose-600 hover:underline font-semibold ml-1"
                    >
                      Reset
                    </button>
                  </div>
                ) : (
                  <span className="bg-amber-100 text-amber-800 px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1">
                    <AlertCircle className="w-3.5 h-3.5" /> Menunggu Scan
                  </span>
                )}
              </div>

              {/* TAB 1: FORM PEMINJAMAN */}
              {activeTab === 'pinjam' && (
                <form onSubmit={handleSubmitPeminjaman} className="flex-1 flex flex-col min-h-0">
                  <div className="mb-4 flex-1 flex flex-col min-h-0">
                    <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">
                      Pilih Barang & Jumlah yang Dipinjam
                    </label>

                    <div className="flex-1 overflow-y-auto border border-[#074A69]/15 rounded-xl p-2.5 bg-slate-50/60 space-y-2">
                      {db.barangs.filter((b) => b.tersedia > 0).length === 0 ? (
                        <p className="text-xs text-gray-400 p-4 text-center">
                          Semua barang inventaris sedang habis dipinjam.
                        </p>
                      ) : (
                        db.barangs
                          .filter((b) => b.tersedia > 0)
                          .map((b) => {
                            const isChecked = borrowSelection[b.kode] !== undefined;
                            const qty = borrowSelection[b.kode] || 1;

                            return (
                              <div
                                key={b.kode}
                                className={`flex items-center justify-between p-3 rounded-xl border transition ${
                                  isChecked
                                    ? 'border-[#074A69] bg-sky-50/70 shadow-2xs'
                                    : 'border-gray-200 bg-white hover:border-[#074A69]/30'
                                }`}
                              >
                                <label className="flex items-center gap-3 cursor-pointer flex-1">
                                  <input
                                    type="checkbox"
                                    checked={isChecked}
                                    onChange={() => handleToggleBorrowBarang(b.kode, b.tersedia)}
                                    className="w-4 h-4 text-[#074A69] border-gray-300 rounded focus:ring-[#074A69] cursor-pointer"
                                  />
                                  <div>
                                    <p className="text-xs sm:text-sm font-bold text-gray-900">{b.nama}</p>
                                    <p className="text-[10px] text-gray-500 font-mono">
                                      {b.kode} — Tersedia: <b className="text-emerald-700">{b.tersedia} Unit</b>
                                    </p>
                                  </div>
                                </label>

                                <div className="flex items-center gap-1.5">
                                  <span className="text-xs text-gray-500 font-semibold hidden sm:inline">
                                    Jumlah:
                                  </span>
                                  <input
                                    type="number"
                                    min="1"
                                    max={b.tersedia}
                                    value={qty}
                                    disabled={!isChecked}
                                    onChange={(e) =>
                                      handleQtyBorrowChange(b.kode, parseInt(e.target.value) || 1, b.tersedia)
                                    }
                                    className="w-14 border border-gray-300 rounded-lg p-1 text-center text-xs font-bold outline-none focus:border-[#074A69] disabled:bg-gray-100 disabled:text-gray-400"
                                  />
                                </div>
                              </div>
                            );
                          })
                      )}
                    </div>
                  </div>

                  <div className="flex gap-3 pt-2 border-t border-gray-100 mt-auto">
                    <button
                      type="button"
                      onClick={() => setBorrowSelection({})}
                      className="w-1/3 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold rounded-xl p-3 text-xs transition cursor-pointer"
                    >
                      Reset Pilihan
                    </button>
                    <button
                      type="submit"
                      disabled={!scannedGuru || Object.keys(borrowSelection).length === 0}
                      className="w-2/3 bg-gradient-to-r from-[#074A69] to-[#0c618c] hover:from-[#05364d] hover:to-[#074A69] text-white font-bold rounded-xl p-3 text-xs sm:text-sm transition shadow-lg shadow-[#074A69]/20 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <CheckCircle2 className="w-4 h-4" /> Proses Peminjaman
                    </button>
                  </div>
                </form>
              )}

              {/* TAB 2: FORM PENGEMBALIAN */}
              {activeTab === 'kembali' && (
                <form onSubmit={handleSubmitPengembalian} className="flex-1 flex flex-col min-h-0">
                  <div className="mb-4 flex-1 flex flex-col min-h-0">
                    <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">
                      Pilih Perangkat yang Dikembalikan
                    </label>

                    <div className="flex-1 overflow-y-auto border border-[#074A69]/15 rounded-xl p-2.5 bg-slate-50/60 space-y-2">
                      {!scannedGuru ? (
                        <div className="p-6 text-center text-gray-400 text-xs">
                          Silakan scan kartu guru terlebih dahulu untuk melihat daftar pinjaman aktifnya.
                        </div>
                      ) : teacherActiveTransaksis.length === 0 ? (
                        <div className="p-6 text-center text-emerald-700 font-semibold text-xs flex flex-col items-center gap-2">
                          <CheckCircle2 className="w-8 h-8 text-emerald-500" />
                          Guru ini tidak memiliki peminjaman aktif saat ini.
                        </div>
                      ) : (
                        teacherActiveTransaksis.map((tx) => {
                          const barang = db.barangs.find((b) => b.kode === tx.barang_kode);
                          const remaining = tx.jumlah - (tx.jumlah_kembali || 0);
                          const isChecked = returnSelection[tx.id] !== undefined;
                          const qtyReturn = returnSelection[tx.id] || remaining;

                          return (
                            <div
                              key={tx.id}
                              className={`flex items-center justify-between p-3 rounded-xl border transition ${
                                isChecked
                                  ? 'border-emerald-600 bg-emerald-50/70 shadow-2xs'
                                  : 'border-gray-200 bg-white hover:border-emerald-500/30'
                              }`}
                            >
                              <label className="flex items-center gap-3 cursor-pointer flex-1">
                                <input
                                  type="checkbox"
                                  checked={isChecked}
                                  onChange={() => handleToggleReturnTx(tx.id, remaining)}
                                  className="w-4 h-4 text-emerald-600 border-gray-300 rounded focus:ring-emerald-500 cursor-pointer"
                                />
                                <div>
                                  <p className="text-xs sm:text-sm font-bold text-gray-900">
                                    {barang ? barang.nama : tx.barang_kode}
                                  </p>
                                  <p className="text-[10px] text-gray-500 font-mono">
                                    ID TRX: {tx.id} | Masih dipinjam:{' '}
                                    <b className="text-rose-600">{remaining} Unit</b>
                                  </p>
                                </div>
                              </label>

                              <div className="flex items-center gap-1.5">
                                <span className="text-xs text-gray-500 font-semibold hidden sm:inline">
                                  Dikembalikan:
                                </span>
                                <input
                                  type="number"
                                  min="1"
                                  max={remaining}
                                  value={qtyReturn}
                                  disabled={!isChecked}
                                  onChange={(e) =>
                                    handleQtyReturnChange(tx.id, parseInt(e.target.value) || 1, remaining)
                                  }
                                  className="w-14 border border-gray-300 rounded-lg p-1 text-center text-xs font-bold outline-none focus:border-emerald-600 disabled:bg-gray-100 disabled:text-gray-400"
                                />
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>

                  <div className="flex gap-3 pt-2 border-t border-gray-100 mt-auto">
                    <button
                      type="submit"
                      disabled={!scannedGuru || Object.keys(returnSelection).length === 0}
                      className="w-full bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800 text-white font-bold rounded-xl p-3 text-xs sm:text-sm transition shadow-lg shadow-emerald-600/20 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <RotateCcw className="w-4 h-4" /> Proses Pengembalian Barang
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>

        {/* ACTIVE LOANS GRID */}
        <div className="w-full bg-white/90 backdrop-blur-md rounded-2xl shadow-sm p-5 sm:p-6 border border-[#074A69]/15">
          <div className="flex items-center justify-between mb-4 border-b border-[#074A69]/15 pb-3">
            <div>
              <h3 className="font-extrabold text-base text-gray-900 flex items-center gap-2">
                <Clock className="w-5 h-5 text-[#074A69]" /> Peminjaman Berlangsung (Aktif)
              </h3>
              <p className="text-xs text-gray-500 mt-0.5">Daftar semua perangkat yang sedang dalam masa peminjaman.</p>
            </div>
            <span className="bg-[#074A69] text-white text-xs font-bold px-3 py-1 rounded-full shadow-2xs">
              {activeTransaksis.length} Transaksi Aktif
            </span>
          </div>

          {activeTransaksis.length === 0 ? (
            <div className="text-center p-8 text-gray-400 text-xs bg-slate-50/50 rounded-xl border border-dashed border-gray-200">
              Tidak ada peminjaman aktif saat ini. Semua perangkat aman tersimpan di lab.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {activeTransaksis.map((tx) => {
                const guru = db.gurus.find((g) => g.id === tx.guru_id);
                const barang = db.barangs.find((b) => b.kode === tx.barang_kode);
                const timeStr = new Date(tx.tgl_pinjam).toLocaleTimeString('id-ID', {
                  hour: '2-digit',
                  minute: '2-digit'
                });
                const sisa = tx.jumlah - (tx.jumlah_kembali || 0);

                return (
                  <div
                    key={tx.id}
                    className="border border-[#074A69]/20 rounded-xl p-4 bg-gradient-to-br from-white to-[#f0f7fb]/60 shadow-xs hover:shadow-md transition flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex justify-between items-start mb-2">
                        <span className="text-[10px] font-bold bg-[#074A69] text-white px-2 py-0.5 rounded font-mono">
                          {tx.id}
                        </span>
                        <span className="text-[10px] text-gray-500 font-semibold flex items-center gap-1">
                          <Clock className="w-3 h-3 text-sky-600" /> {timeStr}
                        </span>
                      </div>

                      <h4 className="font-bold text-xs sm:text-sm text-gray-900 leading-tight mb-1 truncate">
                        {guru ? guru.nama : tx.guru_id}
                      </h4>
                      <p className="text-xs text-[#074A69] font-semibold mb-3 truncate">
                        <span className="text-rose-600 font-extrabold">{sisa}x</span>{' '}
                        {barang ? barang.nama : tx.barang_kode}
                      </p>
                    </div>

                    <button
                      onClick={() => handleQuickReturnClick(tx)}
                      className="w-full mt-2 bg-emerald-100 hover:bg-emerald-200 text-emerald-800 py-1.5 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1 shadow-2xs cursor-pointer"
                    >
                      <RotateCcw className="w-3.5 h-3.5" /> Cek & Kembalikan
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>

      {/* Modal Quick Pick Guru */}
      {showGuruPickerModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs z-50 flex justify-center items-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-6 border border-gray-100 flex flex-col max-h-[85vh]">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <h3 className="font-bold text-base text-gray-900 flex items-center gap-2">
                <Users className="w-5 h-5 text-[#074A69]" /> Pilih Guru Peminjam
              </h3>
              <button
                onClick={() => setShowGuruPickerModal(false)}
                className="w-8 h-8 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-600 flex items-center justify-center transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="my-3.5 relative">
              <Search className="w-4 h-4 absolute left-3.5 top-3 text-gray-400" />
              <input
                type="text"
                value={guruPickerSearch}
                onChange={(e) => setGuruPickerSearch(e.target.value)}
                placeholder="Cari berdasarkan nama, mapel, atau ID Barcode..."
                className="pl-10 w-full bg-[#f0f7fb]/50 border border-gray-200 rounded-xl p-2.5 text-xs sm:text-sm focus:border-[#074A69] focus:ring-2 focus:ring-[#074A69]/20 outline-none"
                autoFocus
              />
            </div>

            <div className="overflow-y-auto flex-1 divide-y divide-gray-100 pr-1 max-h-[380px]">
              {db.gurus
                .filter((g) => {
                  const q = guruPickerSearch.trim().toLowerCase();
                  if (!q) return true;
                  return (
                    g.nama.toLowerCase().includes(q) ||
                    g.id.toLowerCase().includes(q) ||
                    g.mapel.toLowerCase().includes(q) ||
                    (g.nip && g.nip.includes(q))
                  );
                })
                .map((g) => (
                  <div
                    key={g.id}
                    onClick={() => handleSelectGuruDirect(g)}
                    className="p-3 hover:bg-[#f0f7fb] rounded-xl flex items-center justify-between transition cursor-pointer group"
                  >
                    <div>
                      <h4 className="text-sm font-bold text-gray-900 group-hover:text-[#074A69] transition">
                        {g.nama}
                      </h4>
                      <p className="text-xs text-gray-500">
                        {g.mapel} {g.nip ? `• NIP: ${g.nip}` : ''}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono font-bold text-[#074A69] bg-sky-50 px-2.5 py-1 rounded-lg border border-sky-100">
                        {g.id}
                      </span>
                      <span className="w-8 h-8 rounded-lg bg-[#074A69] text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition shadow-xs">
                        <Check className="w-4 h-4" />
                      </span>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
