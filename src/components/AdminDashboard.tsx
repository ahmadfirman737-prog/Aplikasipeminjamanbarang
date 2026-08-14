import React, { useState } from 'react';
import { DatabaseState, Guru, Barang, User } from '../types';
import { exportLaporanToExcel, exportLaporanToPDF } from '../lib/export';
import {
  IdCard,
  Package,
  BarChart3,
  Users,
  LogOut,
  Shield,
  Plus,
  Printer,
  Trash2,
  Edit,
  FileSpreadsheet,
  FileText,
  Search,
  Check,
  Clock,
  RotateCcw,
  ShieldCheck,
  Cloud,
  Wifi
} from 'lucide-react';

interface AdminDashboardProps {
  db: DatabaseState;
  setDb: React.Dispatch<React.SetStateAction<DatabaseState>>;
  currentUser: User;
  onLogout: () => void;
  onPrintGuruCard: (guru: Guru) => void;
  showToast: (msg: string, type: 'success' | 'error' | 'info' | 'warning') => void;
  isFirebaseConnected?: boolean;
}

type AdminMenu = 'kartu' | 'barang' | 'laporan' | 'akun';

const logoUrl = 'https://lh3.googleusercontent.com/d/1wTVRYsGCR8wAuVH8Xv7iu0TOeF2cHDZ9';

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  db,
  setDb,
  currentUser,
  onLogout,
  onPrintGuruCard,
  showToast,
  isFirebaseConnected = true
}) => {
  const [activeMenu, setActiveMenu] = useState<AdminMenu>('kartu');

  // Search & Filter States
  const [searchGuru, setSearchGuru] = useState('');
  const [searchBarang, setSearchBarang] = useState('');
  const [searchLaporan, setSearchLaporan] = useState('');
  const [filterLaporanStatus, setFilterLaporanStatus] = useState<string>('all');

  // Modal States
  const [showAddGuruModal, setShowAddGuruModal] = useState(false);
  const [showEditGuruModal, setShowEditGuruModal] = useState<Guru | null>(null);
  const [showAddBarangModal, setShowAddBarangModal] = useState(false);
  const [showEditBarangModal, setShowEditBarangModal] = useState<Barang | null>(null);
  const [showAddAkunModal, setShowAddAkunModal] = useState(false);
  const [showEditAkunModal, setShowEditAkunModal] = useState<User | null>(null);

  // Form Fields - Add/Edit Guru
  const [newGuruId, setNewGuruId] = useState('');
  const [newGuruNama, setNewGuruNama] = useState('');
  const [newGuruMapel, setNewGuruMapel] = useState('');
  const [newGuruNip, setNewGuruNip] = useState('');

  // Form Fields - Add/Edit Barang
  const [barangKode, setBarangKode] = useState('');
  const [barangNama, setBarangNama] = useState('');
  const [barangKategori, setBarangKategori] = useState('Laptop');
  const [barangStok, setBarangStok] = useState(1);

  // Form Fields - Add/Edit Akun
  const [akunUser, setAkunUser] = useState('');
  const [akunNama, setAkunNama] = useState('');
  const [akunPass, setAkunPass] = useState('');
  const [akunRole, setAkunRole] = useState<'admin' | 'petugas'>('petugas');

  // Auto Generate next sequential Guru ID (e.g. KB-001, KB-002...)
  const handleAutoGenerateGuruId = () => {
    let maxNum = 0;
    db.gurus.forEach((g) => {
      const match = g.id.match(/\d+/);
      if (match) {
        const num = parseInt(match[0], 10);
        if (num > maxNum) maxNum = num;
      }
    });
    const nextNum = String(maxNum + 1).padStart(3, '0');
    setNewGuruId(`KB-${nextNum}`);
  };

  // --- CRUD GURU ---
  const handleSaveGuru = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanId = newGuruId.trim().toUpperCase();
    if (db.gurus.some((g) => g.id.toUpperCase() === cleanId)) {
      showToast('ID Barcode sudah digunakan oleh guru lain!', 'error');
      return;
    }

    const newGuru: Guru = {
      id: cleanId,
      nama: newGuruNama.trim(),
      mapel: newGuruMapel.trim(),
      nip: newGuruNip.trim() || undefined
    };

    setDb((prev) => ({ ...prev, gurus: [...prev.gurus, newGuru] }));
    showToast(`Guru ${newGuru.nama} (${newGuru.id}) berhasil ditambahkan!`, 'success');
    setShowAddGuruModal(false);
    setNewGuruId('');
    setNewGuruNama('');
    setNewGuruMapel('');
    setNewGuruNip('');
  };

  const handleUpdateGuru = (e: React.FormEvent) => {
    e.preventDefault();
    if (!showEditGuruModal) return;

    const oldId = showEditGuruModal.id;
    const cleanId = newGuruId.trim().toUpperCase();

    if (cleanId !== oldId.toUpperCase() && db.gurus.some((g) => g.id.toUpperCase() === cleanId)) {
      showToast('ID Barcode sudah digunakan oleh guru lain!', 'error');
      return;
    }

    const updatedGuru: Guru = {
      id: cleanId,
      nama: newGuruNama.trim(),
      mapel: newGuruMapel.trim(),
      nip: newGuruNip.trim() || undefined
    };

    setDb((prev) => ({
      ...prev,
      gurus: prev.gurus.map((g) => (g.id === oldId ? updatedGuru : g)),
      transaksis: prev.transaksis.map((t) => (t.guru_id === oldId ? { ...t, guru_id: cleanId } : t))
    }));

    showToast(`Data guru ${updatedGuru.nama} berhasil diperbarui!`, 'success');
    setShowEditGuruModal(null);
    setNewGuruId('');
    setNewGuruNama('');
    setNewGuruMapel('');
    setNewGuruNip('');
  };

  const handleDeleteGuru = (id: string) => {
    if (confirm(`Apakah Anda yakin ingin menghapus data guru dengan ID ${id}?`)) {
      setDb((prev) => ({ ...prev, gurus: prev.gurus.filter((g) => g.id !== id) }));
      showToast('Data guru berhasil dihapus', 'info');
    }
  };

  // --- CRUD BARANG ---
  const handleSaveBarang = (e: React.FormEvent) => {
    e.preventDefault();
    if (db.barangs.some((b) => b.kode.toLowerCase() === barangKode.trim().toLowerCase())) {
      showToast('Kode barang sudah terdaftar!', 'error');
      return;
    }

    const newBarang: Barang = {
      kode: barangKode.trim().toUpperCase(),
      nama: barangNama.trim(),
      kategori: barangKategori,
      total_stok: barangStok,
      tersedia: barangStok
    };

    setDb((prev) => ({ ...prev, barangs: [...prev.barangs, newBarang] }));
    showToast(`Barang ${newBarang.nama} berhasil ditambahkan!`, 'success');
    setShowAddBarangModal(false);
    setBarangKode('');
    setBarangNama('');
    setBarangKategori('Laptop');
    setBarangStok(1);
  };

  const handleUpdateBarang = (e: React.FormEvent) => {
    e.preventDefault();
    if (!showEditBarangModal) return;

    setDb((prev) => {
      const updatedBarangs = prev.barangs.map((b) => {
        if (b.kode === showEditBarangModal.kode) {
          const diffStok = barangStok - b.total_stok;
          const newTersedia = Math.max(0, b.tersedia + diffStok);
          return {
            ...b,
            nama: barangNama.trim(),
            kategori: barangKategori,
            total_stok: barangStok,
            tersedia: newTersedia
          };
        }
        return b;
      });
      return { ...prev, barangs: updatedBarangs };
    });

    showToast('Data barang berhasil diperbarui!', 'success');
    setShowEditBarangModal(null);
  };

  const handleDeleteBarang = (kode: string) => {
    if (confirm(`Hapus barang dengan kode ${kode}?`)) {
      setDb((prev) => ({ ...prev, barangs: prev.barangs.filter((b) => b.kode !== kode) }));
      showToast('Barang berhasil dihapus', 'info');
    }
  };

  // --- CRUD AKUN ---
  const handleSaveAkun = (e: React.FormEvent) => {
    e.preventDefault();
    if (db.users.some((u) => u.username.toLowerCase() === akunUser.trim().toLowerCase())) {
      showToast('Username sudah digunakan!', 'error');
      return;
    }

    const newUser: User = {
      username: akunUser.trim().toLowerCase(),
      name: akunNama.trim(),
      password: akunPass || '123',
      role: akunRole
    };

    setDb((prev) => ({ ...prev, users: [...prev.users, newUser] }));
    showToast(`Akun ${newUser.username} berhasil dibuat!`, 'success');
    setShowAddAkunModal(false);
    setAkunUser('');
    setAkunNama('');
    setAkunPass('');
    setAkunRole('petugas');
  };

  const handleUpdateAkun = (e: React.FormEvent) => {
    e.preventDefault();
    if (!showEditAkunModal) return;

    setDb((prev) => {
      const updatedUsers = prev.users.map((u) => {
        if (u.username === showEditAkunModal.username) {
          return {
            ...u,
            name: akunNama.trim(),
            role: akunRole,
            password: akunPass.trim() !== '' ? akunPass : u.password
          };
        }
        return u;
      });
      return { ...prev, users: updatedUsers };
    });

    showToast('Data akun berhasil diperbarui', 'success');
    setShowEditAkunModal(null);
  };

  const handleDeleteAkun = (username: string) => {
    if (username.toLowerCase() === 'ahmadfirmansyah' || username.toLowerCase() === 'admin') {
      showToast('Akun administrator utama tidak dapat dihapus!', 'warning');
      return;
    }
    if (confirm(`Hapus akun ${username}?`)) {
      setDb((prev) => ({ ...prev, users: prev.users.filter((u) => u.username !== username) }));
      showToast('Akun berhasil dihapus', 'info');
    }
  };

  // --- DELETE LAPORAN PEMINJAMAN ---
  const handleDeleteTransaksi = (id: string) => {
    const tx = db.transaksis.find((t) => t.id === id);
    if (!tx) return;

    if (confirm(`Apakah Anda yakin ingin menghapus data peminjaman ${tx.id}?`)) {
      setDb((prev) => {
        const sisa = tx.jumlah - (tx.jumlah_kembali || 0);
        const updatedBarangs = prev.barangs.map((b) => {
          if (b.kode === tx.barang_kode && sisa > 0) {
            return {
              ...b,
              tersedia: Math.min(b.total_stok, b.tersedia + sisa)
            };
          }
          return b;
        });

        return {
          ...prev,
          barangs: updatedBarangs,
          transaksis: prev.transaksis.filter((t) => t.id !== id)
        };
      });

      showToast(`Data peminjaman ${id} berhasil dihapus`, 'info');
    }
  };

  // --- EXPORTS ---
  const handleExportExcel = () => {
    try {
      exportLaporanToExcel(db);
      showToast('Laporan Excel berhasil diunduh!', 'success');
    } catch (err: any) {
      showToast(err.message || 'Gagal mengekspor Excel', 'error');
    }
  };

  const handleExportPDF = () => {
    try {
      exportLaporanToPDF(db);
      showToast('Laporan PDF berhasil diunduh!', 'success');
    } catch (err: any) {
      showToast(err.message || 'Gagal mengekspor PDF', 'error');
    }
  };

  // Filtered Data
  const filteredGurus = db.gurus.filter(
    (g) =>
      g.nama.toLowerCase().includes(searchGuru.toLowerCase()) ||
      g.id.toLowerCase().includes(searchGuru.toLowerCase()) ||
      g.mapel.toLowerCase().includes(searchGuru.toLowerCase())
  );

  const filteredBarangs = db.barangs.filter(
    (b) =>
      b.nama.toLowerCase().includes(searchBarang.toLowerCase()) ||
      b.kode.toLowerCase().includes(searchBarang.toLowerCase()) ||
      b.kategori.toLowerCase().includes(searchBarang.toLowerCase())
  );

  const filteredTransaksis = db.transaksis.filter((tx) => {
    const guru = db.gurus.find((g) => g.id === tx.guru_id);
    const barang = db.barangs.find((b) => b.kode === tx.barang_kode);

    const matchSearch =
      tx.id.toLowerCase().includes(searchLaporan.toLowerCase()) ||
      (guru && guru.nama.toLowerCase().includes(searchLaporan.toLowerCase())) ||
      (barang && barang.nama.toLowerCase().includes(searchLaporan.toLowerCase()));

    let matchStatus = true;
    if (filterLaporanStatus === 'aktif') {
      matchStatus = tx.status === 'aktif' && tx.jumlah_kembali === 0;
    } else if (filterLaporanStatus === 'sebagian') {
      matchStatus = tx.status === 'aktif' && tx.jumlah_kembali > 0;
    } else if (filterLaporanStatus === 'selesai') {
      matchStatus = tx.status === 'selesai';
    }

    return matchSearch && matchStatus;
  });

  return (
    <div className="flex h-screen bg-slate-50 w-full text-left overflow-hidden">
      {/* Sidebar Desktop */}
      <aside className="w-64 bg-gradient-to-br from-[#f0f7fb] via-white to-[#e1f0f7]/80 text-gray-800 flex flex-col shadow-xl z-20 hidden md:flex border-r border-[#074A69]/20">
        <div className="p-5 border-b border-[#074A69]/20 flex flex-col items-start gap-2.5">
          <img
            src={logoUrl}
            alt="Logo Kusuma Bangsa"
            className="h-6 sm:h-8 w-auto max-w-full object-contain object-left filter drop-shadow-xs"
            onError={(e) => {
              (e.target as HTMLElement).style.display = 'none';
            }}
          />
          <div>
            <span className="font-extrabold text-xs sm:text-sm leading-tight text-gray-900 block">
              Aplikasi Peminjaman Barang
            </span>
            <span className="font-medium text-[11px] sm:text-xs leading-tight text-gray-600 block mt-0.5">
              Laboratorium Komputer
            </span>
          </div>
        </div>

        <nav className="flex-1 py-6 space-y-1.5 px-3">
          <button
            onClick={() => setActiveMenu('kartu')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition text-xs sm:text-sm font-semibold cursor-pointer ${
              activeMenu === 'kartu'
                ? 'bg-gradient-to-r from-[#074A69] to-[#0c618c] text-white shadow-md shadow-[#074A69]/20'
                : 'text-gray-700 hover:bg-[#f0f7fb] hover:text-[#074A69]'
            }`}
          >
            <IdCard className="w-4 h-4" /> Manajemen Kartu
          </button>

          <button
            onClick={() => setActiveMenu('barang')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition text-xs sm:text-sm font-semibold cursor-pointer ${
              activeMenu === 'barang'
                ? 'bg-gradient-to-r from-[#074A69] to-[#0c618c] text-white shadow-md shadow-[#074A69]/20'
                : 'text-gray-700 hover:bg-[#f0f7fb] hover:text-[#074A69]'
            }`}
          >
            <Package className="w-4 h-4" /> Inventaris Barang
          </button>

          <button
            onClick={() => setActiveMenu('laporan')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition text-xs sm:text-sm font-semibold cursor-pointer ${
              activeMenu === 'laporan'
                ? 'bg-gradient-to-r from-[#074A69] to-[#0c618c] text-white shadow-md shadow-[#074A69]/20'
                : 'text-gray-700 hover:bg-[#f0f7fb] hover:text-[#074A69]'
            }`}
          >
            <BarChart3 className="w-4 h-4" /> Laporan Peminjaman
          </button>

          <button
            onClick={() => setActiveMenu('akun')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition text-xs sm:text-sm font-semibold cursor-pointer ${
              activeMenu === 'akun'
                ? 'bg-gradient-to-r from-[#074A69] to-[#0c618c] text-white shadow-md shadow-[#074A69]/20'
                : 'text-gray-700 hover:bg-[#f0f7fb] hover:text-[#074A69]'
            }`}
          >
            <Users className="w-4 h-4" /> Manajemen Akun
          </button>
        </nav>

        <div className="p-4 border-t border-[#074A69]/20">
          <button
            onClick={onLogout}
            className="w-full flex items-center justify-center gap-2 bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 py-2.5 rounded-xl font-semibold transition text-xs sm:text-sm cursor-pointer shadow-2xs"
          >
            <LogOut className="w-4 h-4" /> Keluar Sistem
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto p-4 sm:p-6 md:p-8 bg-slate-50 relative">
        <div className="max-w-6xl mx-auto w-full">
          {/* Header Bar */}
          <header className="flex justify-between items-center mb-6 bg-white/90 backdrop-blur-md p-4 sm:p-5 rounded-2xl shadow-sm border border-[#074A69]/20">
            <div>
              <h1 className="text-lg sm:text-2xl font-extrabold text-gray-900 tracking-tight">
                {activeMenu === 'kartu' && 'Manajemen Kartu Guru'}
                {activeMenu === 'barang' && 'Inventaris Lab Komputer'}
                {activeMenu === 'laporan' && 'Laporan Aktivitas Peminjaman'}
                {activeMenu === 'akun' && 'Manajemen Akun Pengguna'}
              </h1>
              <p className="text-xs text-gray-500 hidden sm:block mt-0.5">
                SMP-SMK Kusuma Bangsa Bogor — Panel Administrator
              </p>
            </div>

            <div className="flex items-center gap-2.5 sm:gap-3">
              <span
                className={`px-3 py-1.5 rounded-full text-[11px] sm:text-xs font-bold border flex items-center gap-1.5 shadow-2xs ${
                  isFirebaseConnected
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                    : 'bg-amber-50 text-amber-700 border-amber-200'
                }`}
                title={
                  isFirebaseConnected
                    ? 'Terhubung ke Firebase Realtime Database'
                    : 'Menyimpan lokal (menghubungkan ke cloud...)'
                }
              >
                <span className="relative flex h-2 w-2">
                  <span
                    className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
                      isFirebaseConnected ? 'bg-emerald-400' : 'bg-amber-400'
                    }`}
                  ></span>
                  <span
                    className={`relative inline-flex rounded-full h-2 w-2 ${
                      isFirebaseConnected ? 'bg-emerald-500' : 'bg-amber-500'
                    }`}
                  ></span>
                </span>
                <Cloud className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">
                  {isFirebaseConnected ? 'Firebase Realtime' : 'Menghubungkan...'}
                </span>
              </span>

              <span className="bg-gradient-to-r from-[#f0f7fb] to-[#e1f0f7] text-[#074A69] px-3.5 py-1.5 rounded-full text-xs font-extrabold border border-[#074A69]/30 flex items-center gap-1.5 shadow-2xs">
                <ShieldCheck className="w-4 h-4 text-[#074A69]" /> {currentUser.name}
              </span>
              <button
                onClick={onLogout}
                className="md:hidden w-9 h-9 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center border border-rose-200"
                title="Keluar"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </header>

          {/* Mobile Tab Navigation */}
          <div className="flex md:hidden overflow-x-auto gap-2 mb-4 pb-1">
            <button
              onClick={() => setActiveMenu('kartu')}
              className={`px-3 py-2 rounded-xl text-xs font-bold whitespace-nowrap ${
                activeMenu === 'kartu' ? 'bg-[#074A69] text-white' : 'bg-white text-gray-700 border'
              }`}
            >
              Kartu Guru
            </button>
            <button
              onClick={() => setActiveMenu('barang')}
              className={`px-3 py-2 rounded-xl text-xs font-bold whitespace-nowrap ${
                activeMenu === 'barang' ? 'bg-[#074A69] text-white' : 'bg-white text-gray-700 border'
              }`}
            >
              Inventaris
            </button>
            <button
              onClick={() => setActiveMenu('laporan')}
              className={`px-3 py-2 rounded-xl text-xs font-bold whitespace-nowrap ${
                activeMenu === 'laporan' ? 'bg-[#074A69] text-white' : 'bg-white text-gray-700 border'
              }`}
            >
              Laporan
            </button>
            <button
              onClick={() => setActiveMenu('akun')}
              className={`px-3 py-2 rounded-xl text-xs font-bold whitespace-nowrap ${
                activeMenu === 'akun' ? 'bg-[#074A69] text-white' : 'bg-white text-gray-700 border'
              }`}
            >
              Akun
            </button>
          </div>

          {/* MENU 1: MANAJEMEN KARTU GURU */}
          {activeMenu === 'kartu' && (
            <div className="bg-white/95 backdrop-blur-md rounded-2xl shadow-sm p-5 sm:p-6 border border-[#074A69]/15">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
                <div>
                  <h3 className="text-base sm:text-lg font-bold text-gray-900">Daftar Guru & Barcode Access</h3>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Kelola data guru dan cetak kartu akses barcode untuk peminjaman lab.
                  </p>
                </div>
                <button
                  onClick={() => setShowAddGuruModal(true)}
                  className="bg-gradient-to-r from-[#074A69] to-[#0c618c] hover:from-[#05364d] hover:to-[#074A69] text-white px-4 py-2.5 rounded-xl text-xs font-bold transition shadow-md shadow-[#074A69]/20 flex items-center gap-2 cursor-pointer"
                >
                  <Plus className="w-4 h-4" /> Tambah Guru
                </button>
              </div>

              {/* Search Bar */}
              <div className="mb-4 relative">
                <Search className="w-4 h-4 absolute left-3.5 top-3 text-gray-400" />
                <input
                  type="text"
                  value={searchGuru}
                  onChange={(e) => setSearchGuru(e.target.value)}
                  placeholder="Cari guru berdasarkan nama, mapel, atau ID Barcode..."
                  className="pl-10 w-full bg-[#f0f7fb]/50 border border-gray-200 rounded-xl p-2.5 text-xs sm:text-sm focus:border-[#074A69] focus:ring-2 focus:ring-[#074A69]/20 outline-none"
                />
              </div>

              {/* Table */}
              <div className="overflow-x-auto rounded-xl border border-[#074A69]/15">
                <table className="w-full text-left border-collapse bg-white">
                  <thead>
                    <tr class="bg-[#f0f7fb] text-[#074A69] border-b border-[#074A69]/20 text-xs uppercase tracking-wider">
                      <th className="p-3.5 font-bold">ID Barcode</th>
                      <th className="p-3.5 font-bold">Nama Guru</th>
                      <th className="p-3.5 font-bold">Mata Pelajaran</th>
                      <th className="p-3.5 font-bold">NIP</th>
                      <th className="p-3.5 font-bold text-center">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="text-xs sm:text-sm divide-y divide-gray-100">
                    {filteredGurus.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="p-6 text-center text-gray-400 text-xs">
                          Tidak ada data guru yang cocok.
                        </td>
                      </tr>
                    ) : (
                      filteredGurus.map((g) => (
                        <tr key={g.id} className="hover:bg-[#f0f7fb]/40 transition">
                          <td className="p-3.5 font-mono text-[#074A69] font-bold">{g.id}</td>
                          <td className="p-3.5 font-semibold text-gray-900">{g.nama}</td>
                          <td className="p-3.5 text-gray-600">{g.mapel}</td>
                          <td className="p-3.5 text-gray-400 font-mono text-xs">{g.nip || '-'}</td>
                          <td className="p-3.5">
                            <div className="flex items-center justify-center gap-2">
                              <button
                                onClick={() => {
                                  setShowEditGuruModal(g);
                                  setNewGuruId(g.id);
                                  setNewGuruNama(g.nama);
                                  setNewGuruMapel(g.mapel);
                                  setNewGuruNip(g.nip || '');
                                }}
                                className="bg-amber-50 text-amber-700 hover:bg-amber-100 p-2 rounded-lg transition shadow-2xs cursor-pointer"
                                title="Edit Data Guru"
                              >
                                <Edit className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => onPrintGuruCard(g)}
                                className="bg-indigo-50 text-indigo-700 hover:bg-indigo-100 p-2 rounded-lg transition shadow-2xs font-semibold text-xs flex items-center gap-1 cursor-pointer"
                                title="Cetak Kartu ID"
                              >
                                <Printer className="w-4 h-4" /> <span className="hidden sm:inline">Cetak</span>
                              </button>
                              <button
                                onClick={() => handleDeleteGuru(g.id)}
                                className="bg-rose-50 text-rose-600 hover:bg-rose-100 p-2 rounded-lg transition shadow-2xs cursor-pointer"
                                title="Hapus Data Guru"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* MENU 2: DATA BARANG INVENTARIS */}
          {activeMenu === 'barang' && (
            <div className="bg-white/95 backdrop-blur-md rounded-2xl shadow-sm p-5 sm:p-6 border border-[#074A69]/15">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
                <div>
                  <h3 className="text-base sm:text-lg font-bold text-gray-900">Data Inventaris Perangkat Lab</h3>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Kelola ketersediaan laptop, proyektor, kabel, dan asesoris lab komputer.
                  </p>
                </div>
                <button
                  onClick={() => setShowAddBarangModal(true)}
                  className="bg-gradient-to-r from-[#074A69] to-[#0c618c] hover:from-[#05364d] hover:to-[#074A69] text-white px-4 py-2.5 rounded-xl text-xs font-bold transition shadow-md shadow-[#074A69]/20 flex items-center gap-2 cursor-pointer"
                >
                  <Plus className="w-4 h-4" /> Tambah Barang
                </button>
              </div>

              {/* Search Bar */}
              <div className="mb-4 relative">
                <Search className="w-4 h-4 absolute left-3.5 top-3 text-gray-400" />
                <input
                  type="text"
                  value={searchBarang}
                  onChange={(e) => setSearchBarang(e.target.value)}
                  placeholder="Cari kode barang, nama perangkat, atau kategori..."
                  className="pl-10 w-full bg-[#f0f7fb]/50 border border-gray-200 rounded-xl p-2.5 text-xs sm:text-sm focus:border-[#074A69] focus:ring-2 focus:ring-[#074A69]/20 outline-none"
                />
              </div>

              {/* Table */}
              <div className="overflow-x-auto rounded-xl border border-[#074A69]/15">
                <table className="w-full text-left border-collapse bg-white">
                  <thead>
                    <tr class="bg-[#f0f7fb] text-[#074A69] border-b border-[#074A69]/20 text-xs uppercase tracking-wider">
                      <th className="p-3.5 font-bold">Kode</th>
                      <th className="p-3.5 font-bold">Nama Perangkat</th>
                      <th className="p-3.5 font-bold">Kategori</th>
                      <th className="p-3.5 font-bold text-center">Total Stok</th>
                      <th className="p-3.5 font-bold text-center">Tersedia</th>
                      <th className="p-3.5 font-bold text-center">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="text-xs sm:text-sm divide-y divide-gray-100">
                    {filteredBarangs.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="p-6 text-center text-gray-400 text-xs">
                          Tidak ada inventaris barang yang cocok.
                        </td>
                      </tr>
                    ) : (
                      filteredBarangs.map((b) => (
                        <tr key={b.kode} className="hover:bg-[#f0f7fb]/40 transition">
                          <td className="p-3.5 font-mono text-[#074A69] font-bold">{b.kode}</td>
                          <td className="p-3.5 font-semibold text-gray-900">{b.nama}</td>
                          <td className="p-3.5 text-gray-600">
                            <span className="bg-sky-50 text-[#074A69] px-2.5 py-1 rounded-md text-xs font-semibold border border-sky-100">
                              {b.kategori}
                            </span>
                          </td>
                          <td className="p-3.5 text-center font-bold text-gray-700">{b.total_stok}</td>
                          <td className="p-3.5 text-center">
                            <span
                              className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                                b.tersedia > 0
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : 'bg-rose-100 text-rose-800'
                              }`}
                            >
                              {b.tersedia} Unit
                            </span>
                          </td>
                          <td className="p-3.5">
                            <div className="flex items-center justify-center gap-2">
                              <button
                                onClick={() => {
                                  setShowEditBarangModal(b);
                                  setBarangKode(b.kode);
                                  setBarangNama(b.nama);
                                  setBarangKategori(b.kategori);
                                  setBarangStok(b.total_stok);
                                }}
                                className="bg-amber-50 text-amber-700 hover:bg-amber-100 p-2 rounded-lg transition shadow-2xs cursor-pointer"
                                title="Edit Barang"
                              >
                                <Edit className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleDeleteBarang(b.kode)}
                                className="bg-rose-50 text-rose-600 hover:bg-rose-100 p-2 rounded-lg transition shadow-2xs cursor-pointer"
                                title="Hapus Barang"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* MENU 3: LAPORAN PEMINJAMAN */}
          {activeMenu === 'laporan' && (
            <div className="bg-white/95 backdrop-blur-md rounded-2xl shadow-sm p-5 sm:p-6 border border-[#074A69]/15">
              <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center mb-6 gap-4">
                <div>
                  <h3 className="text-base sm:text-lg font-bold text-gray-900">Riwayat & Laporan Peminjaman</h3>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Rekapitulasi lengkap transaksi peminjaman barang lab oleh guru.
                  </p>
                </div>

                <div className="flex flex-wrap gap-2 items-center">
                  <button
                    onClick={handleExportExcel}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white px-3.5 py-2 rounded-xl text-xs font-bold transition shadow-sm flex items-center gap-1.5 cursor-pointer"
                  >
                    <FileSpreadsheet className="w-4 h-4" /> Ekspor Excel
                  </button>
                  <button
                    onClick={handleExportPDF}
                    className="bg-rose-600 hover:bg-rose-700 text-white px-3.5 py-2 rounded-xl text-xs font-bold transition shadow-sm flex items-center gap-1.5 cursor-pointer"
                  >
                    <FileText className="w-4 h-4" /> Ekspor PDF
                  </button>
                </div>
              </div>

              {/* Search & Filter Bar */}
              <div className="flex flex-col sm:flex-row gap-3 mb-4">
                <div className="relative flex-1">
                  <Search className="w-4 h-4 absolute left-3.5 top-3 text-gray-400" />
                  <input
                    type="text"
                    value={searchLaporan}
                    onChange={(e) => setSearchLaporan(e.target.value)}
                    placeholder="Cari TRX ID, nama guru, atau nama barang..."
                    className="pl-10 w-full bg-[#f0f7fb]/50 border border-gray-200 rounded-xl p-2.5 text-xs sm:text-sm focus:border-[#074A69] focus:ring-2 focus:ring-[#074A69]/20 outline-none"
                  />
                </div>

                <select
                  value={filterLaporanStatus}
                  onChange={(e) => setFilterLaporanStatus(e.target.value)}
                  className="bg-[#f0f7fb]/50 border border-gray-200 rounded-xl px-3 py-2.5 text-xs sm:text-sm focus:border-[#074A69] font-semibold text-gray-700 outline-none"
                >
                  <option value="all">Semua Status</option>
                  <option value="aktif">Sedang Dipinjam</option>
                  <option value="sebagian">Dikembalikan Sebagian</option>
                  <option value="selesai">Selesai Dikembalikan</option>
                </select>
              </div>

              {/* Table */}
              <div className="overflow-x-auto rounded-xl border border-[#074A69]/15">
                <table className="w-full text-left border-collapse bg-white">
                  <thead>
                    <tr class="bg-[#f0f7fb] text-[#074A69] border-b border-[#074A69]/20 text-xs uppercase tracking-wider">
                      <th className="p-3.5 font-bold">ID TRX</th>
                      <th className="p-3.5 font-bold">Peminjam (Guru)</th>
                      <th className="p-3.5 font-bold">Barang</th>
                      <th className="p-3.5 font-bold text-center">Pinjam / Kembali</th>
                      <th className="p-3.5 font-bold">Tgl Pinjam</th>
                      <th className="p-3.5 font-bold">Status</th>
                      <th className="p-3.5 font-bold text-center">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="text-xs sm:text-sm divide-y divide-gray-100">
                    {filteredTransaksis.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="p-6 text-center text-gray-400 text-xs">
                          Belum ada riwayat transaksi yang sesuai.
                        </td>
                      </tr>
                    ) : (
                      filteredTransaksis.map((tx) => {
                        const guru = db.gurus.find((g) => g.id === tx.guru_id);
                        const barang = db.barangs.find((b) => b.kode === tx.barang_kode);

                        let badge = null;
                        if (tx.status === 'selesai') {
                          badge = (
                            <span className="bg-emerald-100 text-emerald-800 px-2.5 py-1 rounded-full text-[11px] font-extrabold flex items-center gap-1 w-fit">
                              <Check className="w-3 h-3" /> Selesai
                            </span>
                          );
                        } else if (tx.jumlah_kembali > 0) {
                          badge = (
                            <span className="bg-sky-100 text-[#074A69] px-2.5 py-1 rounded-full text-[11px] font-extrabold flex items-center gap-1 w-fit">
                              <RotateCcw className="w-3 h-3" /> Sebagian
                            </span>
                          );
                        } else {
                          badge = (
                            <span className="bg-amber-100 text-amber-800 px-2.5 py-1 rounded-full text-[11px] font-extrabold flex items-center gap-1 w-fit">
                              <Clock className="w-3 h-3" /> Dipinjam
                            </span>
                          );
                        }

                        return (
                          <tr key={tx.id} className="hover:bg-[#f0f7fb]/40 transition">
                            <td className="p-3.5 font-mono text-gray-500 font-bold text-xs">{tx.id}</td>
                            <td className="p-3.5 font-semibold text-gray-900">
                              {guru ? guru.nama : tx.guru_id}
                              <p className="text-[10px] text-gray-400 font-mono">{tx.guru_id}</p>
                            </td>
                            <td className="p-3.5 text-gray-800 font-medium">
                              {barang ? barang.nama : tx.barang_kode}
                            </td>
                            <td className="p-3.5 text-center font-extrabold text-gray-800">
                              <span className="text-[#074A69]">{tx.jumlah}</span>
                              <span className="text-gray-400 font-normal mx-1">/</span>
                              <span className="text-emerald-600">{tx.jumlah_kembali || 0}</span>
                            </td>
                            <td className="p-3.5 text-gray-500 text-xs">
                              {new Date(tx.tgl_pinjam).toLocaleString('id-ID', {
                                day: '2-digit',
                                month: 'short',
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </td>
                            <td className="p-3.5">{badge}</td>
                            <td className="p-3.5 text-center">
                              <button
                                onClick={() => handleDeleteTransaksi(tx.id)}
                                className="bg-rose-50 text-rose-600 hover:bg-rose-100 p-2 rounded-lg transition shadow-2xs cursor-pointer inline-flex items-center justify-center"
                                title="Hapus Laporan Peminjaman"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
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

          {/* MENU 4: MANAJEMEN AKUN */}
          {activeMenu === 'akun' && (
            <div className="bg-white/95 backdrop-blur-md rounded-2xl shadow-sm p-5 sm:p-6 border border-[#074A69]/15">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
                <div>
                  <h3 className="text-base sm:text-lg font-bold text-gray-900">Daftar Pengguna Sistem</h3>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Kelola akun petugas lab dan administrator sistem.
                  </p>
                </div>
                <button
                  onClick={() => setShowAddAkunModal(true)}
                  className="bg-gradient-to-r from-[#074A69] to-[#0c618c] hover:from-[#05364d] hover:to-[#074A69] text-white px-4 py-2.5 rounded-xl text-xs font-bold transition shadow-md shadow-[#074A69]/20 flex items-center gap-2 cursor-pointer"
                >
                  <Plus className="w-4 h-4" /> Tambah Akun
                </button>
              </div>

              {/* Table */}
              <div className="overflow-x-auto rounded-xl border border-[#074A69]/15">
                <table className="w-full text-left border-collapse bg-white">
                  <thead>
                    <tr class="bg-[#f0f7fb] text-[#074A69] border-b border-[#074A69]/20 text-xs uppercase tracking-wider">
                      <th className="p-3.5 font-bold">Username</th>
                      <th className="p-3.5 font-bold">Nama Lengkap</th>
                      <th className="p-3.5 font-bold">Peran (Role)</th>
                      <th className="p-3.5 font-bold text-center">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="text-xs sm:text-sm divide-y divide-gray-100">
                    {db.users.map((u) => (
                      <tr key={u.username} className="hover:bg-[#f0f7fb]/40 transition">
                        <td className="p-3.5 font-mono font-bold text-[#074A69]">{u.username}</td>
                        <td className="p-3.5 font-semibold text-gray-900">{u.name}</td>
                        <td className="p-3.5">
                          {u.role === 'admin' ? (
                            <span className="bg-purple-100 text-purple-800 px-2.5 py-1 rounded-md text-xs font-extrabold border border-purple-200">
                              Administrator
                            </span>
                          ) : (
                            <span className="bg-sky-100 text-[#074A69] px-2.5 py-1 rounded-md text-xs font-extrabold border border-sky-200">
                              Petugas Lab
                            </span>
                          )}
                        </td>
                        <td className="p-3.5">
                          <div className="flex items-center justify-center gap-2">
                            <button
                              onClick={() => {
                                setShowEditAkunModal(u);
                                setAkunUser(u.username);
                                setAkunNama(u.name);
                                setAkunPass('');
                                setAkunRole(u.role);
                              }}
                              className="bg-amber-50 text-amber-700 hover:bg-amber-100 p-2 rounded-lg transition shadow-2xs cursor-pointer"
                              title="Edit Akun"
                            >
                              <Edit className="w-4 h-4" />
                            </button>
                            {u.username.toLowerCase() !== 'ahmadfirmansyah' && u.username.toLowerCase() !== 'admin' ? (
                              <button
                                onClick={() => handleDeleteAkun(u.username)}
                                className="bg-rose-50 text-rose-600 hover:bg-rose-100 p-2 rounded-lg transition shadow-2xs cursor-pointer"
                                title="Hapus Akun"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            ) : (
                              <span className="text-[10px] bg-purple-50 text-purple-700 border border-purple-200 px-2 py-1 rounded font-medium">Utama</span>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* --- MODALS --- */}

      {/* Modal Add / Edit Guru */}
      {(showAddGuruModal || showEditGuruModal) && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs z-50 flex justify-center items-center p-4">
          <div className="bg-white p-6 rounded-2xl shadow-2xl max-w-sm w-full border border-gray-100">
            <h3 className="font-bold text-base text-gray-900 mb-4 flex items-center gap-2">
              <Plus className="w-5 h-5 text-[#074A69]" />
              {showEditGuruModal ? 'Edit Data Guru' : 'Tambah Data Guru Baru'}
            </h3>
            <form onSubmit={showEditGuruModal ? handleUpdateGuru : handleSaveGuru} className="space-y-3.5">
              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    ID Barcode Kartu
                  </label>
                  {!showEditGuruModal && (
                    <button
                      type="button"
                      onClick={handleAutoGenerateGuruId}
                      className="text-[10px] text-[#074A69] hover:underline font-bold cursor-pointer"
                    >
                      + Generate ID
                    </button>
                  )}
                </div>
                <input
                  type="text"
                  value={newGuruId}
                  onChange={(e) => setNewGuruId(e.target.value)}
                  placeholder="Cth: KB-005"
                  className="w-full border border-[#074A69]/20 p-2.5 rounded-xl text-xs sm:text-sm focus:border-[#074A69] outline-none font-mono font-bold uppercase"
                  required
                />
                <p className="text-[10px] text-gray-400 mt-0.5">Format standar: KB-001, KB-002, dst.</p>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-1">
                  Nama Lengkap & Gelar
                </label>
                <input
                  type="text"
                  value={newGuruNama}
                  onChange={(e) => setNewGuruNama(e.target.value)}
                  placeholder="Cth: Dra. Retno Wati, M.Pd"
                  className="w-full border border-[#074A69]/20 p-2.5 rounded-xl text-xs sm:text-sm focus:border-[#074A69] outline-none"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-1">
                  Mata Pelajaran
                </label>
                <input
                  type="text"
                  value={newGuruMapel}
                  onChange={(e) => setNewGuruMapel(e.target.value)}
                  placeholder="Cth: Fisika / IPA"
                  className="w-full border border-[#074A69]/20 p-2.5 rounded-xl text-xs sm:text-sm focus:border-[#074A69] outline-none"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-1">
                  NIP <span className="text-gray-400 font-normal">(Opsional)</span>
                </label>
                <input
                  type="text"
                  value={newGuruNip}
                  onChange={(e) => setNewGuruNip(e.target.value)}
                  placeholder="Cth: 19800101 200501 1 002"
                  className="w-full border border-[#074A69]/20 p-2.5 rounded-xl text-xs sm:text-sm focus:border-[#074A69] outline-none font-mono"
                />
              </div>

              <div className="flex gap-2 justify-end mt-4 pt-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => {
                    setShowAddGuruModal(false);
                    setShowEditGuruModal(null);
                  }}
                  className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold rounded-xl text-xs transition cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-gradient-to-r from-[#074A69] to-[#0c618c] text-white font-semibold rounded-xl text-xs transition shadow-md cursor-pointer"
                >
                  {showEditGuruModal ? 'Perbarui Data Guru' : 'Simpan Data Guru'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Add / Edit Barang */}
      {(showAddBarangModal || showEditBarangModal) && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs z-50 flex justify-center items-center p-4">
          <div className="bg-white p-6 rounded-2xl shadow-2xl max-w-sm w-full border border-gray-100">
            <h3 className="font-bold text-base text-gray-900 mb-4 flex items-center gap-2">
              <Package className="w-5 h-5 text-[#074A69]" />
              {showEditBarangModal ? 'Edit Data Barang' : 'Tambah Barang Inventaris'}
            </h3>
            <form onSubmit={showEditBarangModal ? handleUpdateBarang : handleSaveBarang} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-1">
                  Kode Barang
                </label>
                <input
                  type="text"
                  value={barangKode}
                  onChange={(e) => setBarangKode(e.target.value)}
                  placeholder="Cth: LPT-03"
                  readOnly={!!showEditBarangModal}
                  className={`w-full border p-2.5 rounded-xl text-xs sm:text-sm outline-none font-mono font-bold uppercase ${
                    showEditBarangModal ? 'bg-gray-100 text-gray-500 cursor-not-allowed' : 'border-[#074A69]/20'
                  }`}
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-1">
                  Nama Barang
                </label>
                <input
                  type="text"
                  value={barangNama}
                  onChange={(e) => setBarangNama(e.target.value)}
                  placeholder="Cth: Laptop HP ProBook"
                  className="w-full border border-[#074A69]/20 p-2.5 rounded-xl text-xs sm:text-sm focus:border-[#074A69] outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-1">
                  Kategori
                </label>
                <select
                  value={barangKategori}
                  onChange={(e) => setBarangKategori(e.target.value)}
                  className="w-full border border-[#074A69]/20 p-2.5 rounded-xl text-xs sm:text-sm focus:border-[#074A69] outline-none font-semibold"
                >
                  <option value="Laptop">Laptop</option>
                  <option value="Proyektor">Proyektor</option>
                  <option value="Kabel">Kabel & Adaptor</option>
                  <option value="Audio">Audio / Speaker</option>
                  <option value="Lainnya">Lainnya</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-1">
                  Total Stok
                </label>
                <input
                  type="number"
                  min="1"
                  value={barangStok}
                  onChange={(e) => setBarangStok(parseInt(e.target.value) || 1)}
                  className="w-full border border-[#074A69]/20 p-2.5 rounded-xl text-xs sm:text-sm focus:border-[#074A69] outline-none font-bold text-center"
                  required
                />
              </div>

              <div className="flex gap-2 justify-end mt-4 pt-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => {
                    setShowAddBarangModal(false);
                    setShowEditBarangModal(null);
                  }}
                  className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold rounded-xl text-xs transition cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-gradient-to-r from-[#074A69] to-[#0c618c] text-white font-semibold rounded-xl text-xs transition shadow-md cursor-pointer"
                >
                  Simpan Barang
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Add / Edit Akun */}
      {(showAddAkunModal || showEditAkunModal) && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs z-50 flex justify-center items-center p-4">
          <div className="bg-white p-6 rounded-2xl shadow-2xl max-w-sm w-full border border-gray-100">
            <h3 className="font-bold text-base text-gray-900 mb-4 flex items-center gap-2">
              <Users className="w-5 h-5 text-[#074A69]" />
              {showEditAkunModal ? 'Edit Pengguna' : 'Tambah Akun Pengguna'}
            </h3>
            <form onSubmit={showEditAkunModal ? handleUpdateAkun : handleSaveAkun} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-1">
                  Username
                </label>
                <input
                  type="text"
                  value={akunUser}
                  onChange={(e) => setAkunUser(e.target.value)}
                  placeholder="Cth: petugas2"
                  readOnly={!!showEditAkunModal}
                  className={`w-full border p-2.5 rounded-xl text-xs sm:text-sm outline-none font-mono ${
                    showEditAkunModal ? 'bg-gray-100 text-gray-500 cursor-not-allowed' : 'border-[#074A69]/20'
                  }`}
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-1">
                  Nama Lengkap
                </label>
                <input
                  type="text"
                  value={akunNama}
                  onChange={(e) => setAkunNama(e.target.value)}
                  placeholder="Cth: Rian Hidayat, S.Kom"
                  className="w-full border border-[#074A69]/20 p-2.5 rounded-xl text-xs sm:text-sm focus:border-[#074A69] outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-1">
                  Password {showEditAkunModal && <span className="text-gray-400 font-normal">(Kosongkan jika tidak diubah)</span>}
                </label>
                <input
                  type="password"
                  value={akunPass}
                  onChange={(e) => setAkunPass(e.target.value)}
                  placeholder="Masukkan password..."
                  className="w-full border border-[#074A69]/20 p-2.5 rounded-xl text-xs sm:text-sm focus:border-[#074A69] outline-none"
                  required={!showEditAkunModal}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-1">
                  Peran (Role)
                </label>
                <select
                  value={akunRole}
                  onChange={(e) => setAkunRole(e.target.value as 'admin' | 'petugas')}
                  className="w-full border border-[#074A69]/20 p-2.5 rounded-xl text-xs sm:text-sm focus:border-[#074A69] outline-none font-semibold"
                >
                  <option value="petugas">Petugas Lab</option>
                  <option value="admin">Administrator</option>
                </select>
              </div>

              <div className="flex gap-2 justify-end mt-4 pt-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => {
                    setShowAddAkunModal(false);
                    setShowEditAkunModal(null);
                  }}
                  className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold rounded-xl text-xs transition cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-gradient-to-r from-[#074A69] to-[#0c618c] text-white font-semibold rounded-xl text-xs transition shadow-md cursor-pointer"
                >
                  Simpan Akun
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
