import { initializeApp, getApps } from 'firebase/app';
import {
  getFirestore,
  collection,
  doc,
  setDoc,
  getDocs,
  onSnapshot,
  writeBatch
} from 'firebase/firestore';
import { DatabaseState, User, Guru, Barang, Transaksi } from '../types';
import firebaseConfigData from '../../firebase-applet-config.json';

const firebaseConfig = {
  projectId: firebaseConfigData.projectId,
  appId: firebaseConfigData.appId,
  apiKey: firebaseConfigData.apiKey,
  authDomain: firebaseConfigData.authDomain,
  storageBucket: firebaseConfigData.storageBucket,
  messagingSenderId: firebaseConfigData.messagingSenderId
};

// Initialize Firebase App
export const app = !getApps().length ? initializeApp(firebaseConfig) : getApps()[0];

// Initialize Firestore with custom databaseId if configured
export const firestore = getFirestore(
  app,
  firebaseConfigData.firestoreDatabaseId || '(default)'
);

// Default initial data
export const defaultInitialData: DatabaseState = {
  users: [
    { username: 'ahmadfirmansyah', password: 'Kusumabangsa123', name: 'Ahmad Firmansyah', role: 'admin' },
    { username: 'bilalibrahim', password: 'Kusumabangsa123', name: 'Bilal Ibrahim', role: 'petugas' },
    { username: 'ahmadsaepudin', password: 'Kusumabangsa123', name: 'Ahmad Saepudin', role: 'petugas' },
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

// Central sync document in Firestore for atomicity & real-time sync
const MAIN_DOC_REF = doc(firestore, 'app_data', 'database_state');

/**
 * Seed Firestore with initial default data if it doesn't exist
 */
export async function initializeFirestoreDatabase(): Promise<DatabaseState> {
  try {
    const docSnap = await getDocs(collection(firestore, 'app_data'));
    const stateDoc = docSnap.docs.find((d) => d.id === 'database_state');

    if (!stateDoc || !stateDoc.exists()) {
      await setDoc(MAIN_DOC_REF, defaultInitialData);
      return defaultInitialData;
    }

    const data = stateDoc.data() as DatabaseState;
    // Ensure all required default users exist
    const currentUsers = data.users || [];
    let updatedUsers = [...currentUsers];
    let needsUpdate = false;

    defaultInitialData.users.forEach((defUser) => {
      const exists = updatedUsers.some(
        (u) => u.username.toLowerCase() === defUser.username.toLowerCase()
      );
      if (!exists) {
        updatedUsers.push(defUser);
        needsUpdate = true;
      }
    });

    if (needsUpdate) {
      const updatedState = { ...data, users: updatedUsers };
      await setDoc(MAIN_DOC_REF, updatedState);
      return updatedState;
    }

    return data;
  } catch (err) {
    console.error('Error initializing Firestore database:', err);
    return defaultInitialData;
  }
}

/**
 * Save complete database state to Firestore
 */
export async function saveDatabaseToFirestore(data: DatabaseState): Promise<void> {
  try {
    await setDoc(MAIN_DOC_REF, data);
  } catch (err) {
    console.error('Error saving to Firestore:', err);
  }
}

/**
 * Real-time listener for Firestore changes
 */
export function subscribeToFirestore(
  onData: (data: DatabaseState) => void,
  onError?: (err: Error) => void
): () => void {
  return onSnapshot(
    MAIN_DOC_REF,
    (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data() as DatabaseState;
        
        // Ensure required users exist in snapshot
        let users = data.users || [];
        let hasChanges = false;
        defaultInitialData.users.forEach((defUser) => {
          if (!users.some((u) => u.username.toLowerCase() === defUser.username.toLowerCase())) {
            users.push(defUser);
            hasChanges = true;
          }
        });

        const fullData: DatabaseState = {
          users: users,
          gurus: data.gurus || [],
          barangs: data.barangs || [],
          transaksis: data.transaksis || []
        };

        if (hasChanges) {
          saveDatabaseToFirestore(fullData);
        }

        onData(fullData);
      } else {
        // Document doesn't exist yet, create it
        setDoc(MAIN_DOC_REF, defaultInitialData).catch((err) => {
          console.error('Error setting initial data:', err);
        });
        onData(defaultInitialData);
      }
    },
    (err) => {
      console.error('Firestore snapshot listener error:', err);
      if (onError) onError(err);
    }
  );
}
