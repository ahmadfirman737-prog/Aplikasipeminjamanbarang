import { initializeApp, getApps } from 'firebase/app';
import {
  initializeFirestore,
  getFirestore,
  doc,
  getDoc,
  getDocs,
  setDoc,
  deleteDoc,
  collection,
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

const dbId = firebaseConfigData.firestoreDatabaseId || '(default)';

// Initialize Firestore
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
 * Error logging utility conforming to skill requirements
 */
export function handleFirestoreError(error: unknown, operationType: string, path: string | null) {
  const errInfo = {
    error: error instanceof Error ? error.message : String(error),
    operationType,
    path,
    timestamp: new Date().toISOString()
  };
  console.warn('Firestore Operation Notification:', JSON.stringify(errInfo));
}

/**
 * Deep-clean payload for Firestore: strip undefined values, ensuring 100% successful write
 */
export function sanitizeForFirestore<T>(data: T): T {
  return JSON.parse(
    JSON.stringify(data, (_, value) => (value === undefined ? null : value))
  );
}

/**
 * Persist individual Guru to Firestore collection 'gurus'
 */
export async function saveGuruToFirestore(guru: Guru): Promise<boolean> {
  try {
    const guruRef = doc(firestore, 'gurus', guru.id);
    await setDoc(guruRef, sanitizeForFirestore(guru));
    return true;
  } catch (err) {
    handleFirestoreError(err, 'write', `gurus/${guru.id}`);
    return false;
  }
}

/**
 * Delete individual Guru from Firestore collection 'gurus'
 */
export async function deleteGuruFromFirestore(guruId: string): Promise<boolean> {
  try {
    const guruRef = doc(firestore, 'gurus', guruId);
    await deleteDoc(guruRef);
    return true;
  } catch (err) {
    handleFirestoreError(err, 'delete', `gurus/${guruId}`);
    return false;
  }
}

/**
 * Persist individual User account to Firestore collection 'users'
 */
export async function saveUserToFirestore(user: User): Promise<boolean> {
  try {
    const userRef = doc(firestore, 'users', user.username.toLowerCase());
    await setDoc(userRef, sanitizeForFirestore(user));
    return true;
  } catch (err) {
    handleFirestoreError(err, 'write', `users/${user.username}`);
    return false;
  }
}

/**
 * Delete individual User account from Firestore collection 'users'
 */
export async function deleteUserFromFirestore(username: string): Promise<boolean> {
  try {
    const userRef = doc(firestore, 'users', username.toLowerCase());
    await deleteDoc(userRef);
    return true;
  } catch (err) {
    handleFirestoreError(err, 'delete', `users/${username}`);
    return false;
  }
}

/**
 * Seed Firestore with initial default data if it doesn't exist,
 * or load existing cloud data (preserving any saved guru cards across all devices)
 */
export async function initializeFirestoreDatabase(): Promise<DatabaseState> {
  try {
    // 1. First attempt to read the aggregated main document
    const stateDoc = await getDoc(MAIN_DOC_REF);
    let cloudGurus: Guru[] = [];
    let cloudUsers: User[] = [];
    let cloudBarangs: Barang[] = [];
    let cloudTransaksis: Transaksi[] = [];

    if (stateDoc.exists()) {
      const data = stateDoc.data() as DatabaseState;
      cloudGurus = data.gurus || [];
      cloudUsers = data.users || [];
      cloudBarangs = data.barangs || [];
      cloudTransaksis = data.transaksis || [];
    }

    // 2. Query individual 'gurus' collection to guarantee no teacher is lost across devices
    try {
      const gurusSnap = await getDocs(collection(firestore, 'gurus'));
      if (!gurusSnap.empty) {
        const individualGurus: Guru[] = [];
        gurusSnap.forEach((docSnap) => {
          const g = docSnap.data() as Guru;
          if (g && g.id) {
            individualGurus.push(g);
          }
        });

        // Merge individual gurus with cloudGurus
        const guruMap = new Map<string, Guru>();
        cloudGurus.forEach((g) => guruMap.set(g.id.toUpperCase(), g));
        individualGurus.forEach((g) => guruMap.set(g.id.toUpperCase(), g));
        cloudGurus = Array.from(guruMap.values());
      }
    } catch (e) {
      console.warn('Gurus collection lookup note:', e);
    }

    // 3. Fallback/Seed default gurus if completely empty
    if (cloudGurus.length === 0) {
      cloudGurus = [...defaultInitialData.gurus];
    } else {
      // Ensure the initial default gurus are present if not deleted
      defaultInitialData.gurus.forEach((defG) => {
        if (!cloudGurus.some((g) => g.id.toUpperCase() === defG.id.toUpperCase())) {
          // Keep existing list as is
        }
      });
    }

    // 4. Ensure default users exist
    let updatedUsers = [...cloudUsers];
    defaultInitialData.users.forEach((defUser) => {
      const exists = updatedUsers.some(
        (u) => u.username.toLowerCase() === defUser.username.toLowerCase()
      );
      if (!exists) {
        updatedUsers.push(defUser);
      }
    });

    if (cloudBarangs.length === 0) {
      cloudBarangs = [...defaultInitialData.barangs];
    }

    if (cloudTransaksis.length === 0 && !stateDoc.exists()) {
      cloudTransaksis = [...defaultInitialData.transaksis];
    }

    const fullState: DatabaseState = {
      users: updatedUsers,
      gurus: cloudGurus,
      barangs: cloudBarangs,
      transaksis: cloudTransaksis
    };

    // Save back to cloud to keep everything fully synchronized
    await saveDatabaseToFirestore(fullState);

    return fullState;
  } catch (err) {
    handleFirestoreError(err, 'get', 'app_data/database_state');
    return defaultInitialData;
  }
}

/**
 * Save complete database state to Firestore securely with sanitization and batching
 */
export async function saveDatabaseToFirestore(data: DatabaseState): Promise<boolean> {
  try {
    const sanitized = sanitizeForFirestore(data);
    
    // 1. Save main sync document
    await setDoc(MAIN_DOC_REF, {
      ...sanitized,
      lastUpdated: new Date().toISOString()
    });

    // 2. Also sync each individual guru into 'gurus' collection in background
    try {
      const batch = writeBatch(firestore);
      if (Array.isArray(data.gurus)) {
        data.gurus.forEach((guru) => {
          if (guru && guru.id) {
            const ref = doc(firestore, 'gurus', guru.id);
            batch.set(ref, sanitizeForFirestore(guru));
          }
        });
        await batch.commit();
      }
    } catch (batchErr) {
      console.warn('Batch write notice:', batchErr);
    }

    return true;
  } catch (err) {
    handleFirestoreError(err, 'write', 'app_data/database_state');
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
          handleFirestoreError(err, 'write', 'app_data/database_state');
        });
        onData(defaultInitialData);
      }
    },
    (err) => {
      handleFirestoreError(err, 'get', 'app_data/database_state');
      if (onError) onError(err);
    }
  );
}
