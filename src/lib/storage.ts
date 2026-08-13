import { DatabaseState } from '../types';

const STORAGE_KEY = 'lab_komputer_db_v1';

export const initialData: DatabaseState = {
  users: [
    { username: 'ahmadfirmansyah', password: 'Kusumabangsa123', name: 'Ahmad Firmansyah', role: 'admin' },
    { username: 'petugas', password: '123', name: 'Petugas Jaga Lab', role: 'petugas' }
  ],
  gurus: [
    { id: 'KB-001', nama: 'Budi Santoso, S.Pd', mapel: 'Matematika', nip: '19850312 201001 1 005' },
    { id: 'KB-002', nama: 'Siti Aminah, M.Kom', mapel: 'Teknologi Informasi', nip: '19900824 201502 2 003' },
    { id: 'KB-003', nama: 'Ahmad Yani, M.Pd', mapel: 'Bahasa Indonesia', nip: '19821105 200801 1 002' },
    { id: 'KB-004', nama: 'Dra. Endang Rahayu', mapel: 'Bahasa Inggris', nip: '19760418 200212 2 001' }
  ],
  barangs: [
    { kode: 'LPT-01', nama: 'Laptop ASUS Pro Core i5', kategori: 'Laptop', total_stok: 5, tersedia: 3 },
    { kode: 'LPT-02', nama: 'Laptop Lenovo ThinkPad i7', kategori: 'Laptop', total_stok: 3, tersedia: 3 },
    { kode: 'PRJ-01', nama: 'Proyektor Epson EB-X400 3300 Lumens', kategori: 'Proyektor', total_stok: 3, tersedia: 2 },
    { kode: 'KBL-01', nama: 'Kabel HDMI 5 Meter Braided', kategori: 'Kabel', total_stok: 10, tersedia: 9 },
    { kode: 'AUD-01', nama: 'Speaker Bluetooth Portable Wireless', kategori: 'Audio', total_stok: 4, tersedia: 4 },
    { kode: 'ADP-01', nama: 'Converter Type-C to HDMI/VGA', kategori: 'Kabel', total_stok: 6, tersedia: 5 }
  ],
  transaksis: [
    {
      id: 'TRX-1001',
      guru_id: 'KB-001',
      barang_kode: 'LPT-01',
      jumlah: 2,
      jumlah_kembali: 0,
      tgl_pinjam: new Date(Date.now() - 3600000 * 3).toISOString(),
      tgl_kembali: null,
      status: 'aktif'
    },
    {
      id: 'TRX-1002',
      guru_id: 'KB-002',
      barang_kode: 'PRJ-01',
      jumlah: 1,
      jumlah_kembali: 0,
      tgl_pinjam: new Date(Date.now() - 3600000 * 5).toISOString(),
      tgl_kembali: null,
      status: 'aktif'
    },
    {
      id: 'TRX-1003',
      guru_id: 'KB-003',
      barang_kode: 'KBL-01',
      jumlah: 1,
      jumlah_kembali: 1,
      tgl_pinjam: new Date(Date.now() - 3600000 * 24).toISOString(),
      tgl_kembali: new Date(Date.now() - 3600000 * 20).toISOString(),
      status: 'selesai'
    }
  ]
};

export function loadDatabase(): DatabaseState {
  try {
    const dataStr = localStorage.getItem(STORAGE_KEY);
    if (!dataStr) {
      saveDatabase(initialData);
      return initialData;
    }
    const parsed = JSON.parse(dataStr);
    let users = parsed.users || initialData.users;

    // Migration / update for admin user credentials
    const hasNewAdmin = users.some((u: any) => u.username.toLowerCase() === 'ahmadfirmansyah');
    if (!hasNewAdmin) {
      users = users.filter((u: any) => u.username.toLowerCase() !== 'admin');
      users.unshift({
        username: 'ahmadfirmansyah',
        password: 'Kusumabangsa123',
        name: 'Ahmad Firmansyah',
        role: 'admin'
      });
    } else {
      users = users.map((u: any) =>
        u.username.toLowerCase() === 'ahmadfirmansyah'
          ? { ...u, username: 'ahmadfirmansyah', password: 'Kusumabangsa123', role: 'admin' }
          : u
      );
    }

    const state: DatabaseState = {
      users,
      gurus: parsed.gurus || initialData.gurus,
      barangs: parsed.barangs || initialData.barangs,
      transaksis: parsed.transaksis || initialData.transaksis
    };
    saveDatabase(state);
    return state;
  } catch (err) {
    console.error('Failed to load database from localStorage', err);
    return initialData;
  }
}

export function saveDatabase(data: DatabaseState): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (err) {
    console.error('Failed to save database to localStorage', err);
  }
}

export function resetDatabase(): DatabaseState {
  saveDatabase(initialData);
  return initialData;
}
