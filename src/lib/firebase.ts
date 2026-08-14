import { initializeApp, getApps } from 'firebase/app';
import {
  initializeFirestore,
  getFirestore,
  doc,
  getDoc,
  setDoc,
  onSnapshot
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

const dbId = firebaseConfigData.firestoreDatabaseId || '(default)';

// Initialize Firestore with ignoreUndefinedProperties so undefined fields like nip or password won't break writes
let firestoreInstance;
try {
  firestoreInstance = initializeFirestore(app, {
    ignoreUndefinedProperties: true
  }, dbId);
} catch {
  firestoreInstance = getFirestore(app, dbId);
}

export const firestore = firestoreInstance;

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
    { kode: 'ADP-01', format: 'Converter Type-C to HDMI/VGA', nama: 'Converter Type-C to HDMI/VGA', kategori: 'Kabel', total_stok: 6, tersedia: 5 } as any
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
 * Deep-clean payload for Firestore: strip undefined values, ensuring 100% successful write
 */
export function sanitizeForFirestore<T>(data: T): T {
  return JSON.parse(
    JSON.stringify(data, (_, value) => (value === undefined ? null : value))
  );
}

/**
 * Seed Firestore with initial default data if it doesn't exist,
 * or load existing cloud data (preserving any saved guru cards)
 */
export async function initializeFirestoreDatabase(): Promise<DatabaseState> {
  try {
    const stateDoc = await getDoc(MAIN_DOC_REF);

    if (!stateDoc.exists()) {
      const sanitized = sanitizeForFirestore(defaultInitialData);
      await setDoc(MAIN_DOC_REF, {
        ...sanitized,
        lastUpdated: new Date().toISOString()
      });
      return defaultInitialData;
    }

    const data = stateDoc.data() as DatabaseState;
    const currentUsers = data.users || [];
    let updatedUsers = [...currentUsers];
    let needsUpdate = false;

    // Ensure default system users are present
    defaultInitialData.users.forEach((defUser) => {
      const exists = updatedUsers.some(
        (u) => u.username.toLowerCase() === defUser.username.toLowerCase()
      );
      if (!exists) {
        updatedUsers.push(defUser);
        needsUpdate = true;
      }
    });

    const fullState: DatabaseState = {
      users: updatedUsers,
      gurus: data.gurus || [],
      barangs: data.barangs || [],
      transaksis: data.transaksis || []
    };

    if (needsUpdate) {
      await saveDatabaseToFirestore(fullState);
    }

    return fullState;
  } catch (err) {
    console.error('Error initializing Firestore database:', err);
    return defaultInitialData;
  }
}

/**
 * Save complete database state to Firestore securely with sanitization
 */
export async function saveDatabaseToFirestore(data: DatabaseState): Promise<boolean> {
  try {
    const sanitized = sanitizeForFirestore(data);
    await setDoc(MAIN_DOC_REF, {
      ...sanitized,
      lastUpdated: new Date().toISOString()
    });
    return true;
  } catch (err) {
    console.error('Error saving to Firestore:', err);
    return false;
  }
}

/**
 * Real-time listener for Firestore changes across all devices
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

        let users = data.users || [];
        defaultInitialData.users.forEach((defUser) => {
          if (!users.some((u) => u.username.toLowerCase() === defUser.username.toLowerCase())) {
            users.push(defUser);
          }
        });

        const fullData: DatabaseState = {
          users: users,
          gurus: data.gurus || [],
          barangs: data.barangs || [],
          transaksis: data.transaksis || []
        };

        onData(fullData);
      } else {
        // Document doesn't exist yet, create it
        const sanitized = sanitizeForFirestore(defaultInitialData);
        setDoc(MAIN_DOC_REF, {
          ...sanitized,
          lastUpdated: new Date().toISOString()
        }).catch((err) => {
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
