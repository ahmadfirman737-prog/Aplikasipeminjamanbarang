export type UserRole = 'admin' | 'petugas';

export interface User {
  username: string;
  password?: string;
  name: string;
  role: UserRole;
}

export interface Guru {
  id: string; // ID Barcode (e.g. KB-001)
  nama: string;
  mapel: string;
  nip?: string;
}

export interface Barang {
  kode: string; // e.g. LPT-01
  nama: string;
  kategori: string; // Laptop, Proyektor, Kabel, Audio, Lainnya
  total_stok: number;
  tersedia: number;
}

export interface Transaksi {
  id: string; // TRX-xxxx
  guru_id: string;
  barang_kode: string;
  jumlah: number;
  jumlah_kembali: number;
  tgl_pinjam: string;
  tgl_kembali: string | null;
  status: 'aktif' | 'selesai';
}

export interface DatabaseState {
  users: User[];
  gurus: Guru[];
  barangs: Barang[];
  transaksis: Transaksi[];
}

export type ToastType = 'success' | 'error' | 'info' | 'warning';

export interface ToastMessage {
  id: string;
  message: string;
  type: ToastType;
}
