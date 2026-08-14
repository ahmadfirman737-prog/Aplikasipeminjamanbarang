import React, { useState, useEffect, useRef } from 'react';
import { DatabaseState, User, ToastMessage, ToastType, Guru } from './types';
import { loadDatabase, saveDatabase } from './lib/storage';
import { subscribeToFirestore, saveDatabaseToFirestore, initializeFirestoreDatabase } from './lib/firebase';
import { LoginView } from './components/LoginView';
import { AdminDashboard } from './components/AdminDashboard';
import { PetugasDashboard } from './components/PetugasDashboard';
import { PrintIdCardModal } from './components/PrintIdCardModal';
import { ToastContainer } from './components/ToastContainer';

export default function App() {
  const [db, setDbState] = useState<DatabaseState>(() => loadDatabase());
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [printGuruCardModal, setPrintGuruCardModal] = useState<Guru | null>(null);
  const [isFirebaseConnected, setIsFirebaseConnected] = useState<boolean>(false);
  const isInternalUpdateRef = useRef<boolean>(false);

  // Initialize and subscribe to real-time Firestore database
  useEffect(() => {
    let unsubscribe: (() => void) | undefined;

    const setupFirebase = async () => {
      try {
        await initializeFirestoreDatabase();
        unsubscribe = subscribeToFirestore(
          (cloudDb) => {
            isInternalUpdateRef.current = true;
            setDbState(cloudDb);
            saveDatabase(cloudDb);
            setIsFirebaseConnected(true);
          },
          (err) => {
            console.warn('Firestore offline fallback to localStorage:', err);
            setIsFirebaseConnected(false);
          }
        );
      } catch (err) {
        console.error('Failed to setup Firebase real-time sync:', err);
        setIsFirebaseConnected(false);
      }
    };

    setupFirebase();

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, []);

  // Custom setDb wrapper that updates local state and pushes immediately to Firebase Firestore
  const setDb: React.Dispatch<React.SetStateAction<DatabaseState>> = (action) => {
    setDbState((prevDb) => {
      const nextDb = typeof action === 'function' ? action(prevDb) : action;
      saveDatabase(nextDb);
      saveDatabaseToFirestore(nextDb);
      return nextDb;
    });
  };

  const showToast = (message: string, type: ToastType = 'success') => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, message, type }]);

    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3500);
  };

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  const handleLoginSuccess = (user: User) => {
    setCurrentUser(user);
  };

  const handleLogout = () => {
    setCurrentUser(null);
    showToast('Anda telah keluar dari sistem.', 'info');
  };

  return (
    <div className="min-h-screen bg-slate-50 text-gray-800 font-sans antialiased flex flex-col">
      <ToastContainer toasts={toasts} onRemove={removeToast} />

      {printGuruCardModal && (
        <PrintIdCardModal
          guru={printGuruCardModal}
          onClose={() => setPrintGuruCardModal(null)}
        />
      )}

      {!currentUser ? (
        <LoginView
          users={db.users}
          onLoginSuccess={handleLoginSuccess}
          showToast={showToast}
        />
      ) : currentUser.role === 'admin' ? (
        <AdminDashboard
          db={db}
          setDb={setDb}
          currentUser={currentUser}
          onLogout={handleLogout}
          onPrintGuruCard={(guru) => setPrintGuruCardModal(guru)}
          showToast={showToast}
          isFirebaseConnected={isFirebaseConnected}
        />
      ) : (
        <PetugasDashboard
          db={db}
          setDb={setDb}
          currentUser={currentUser}
          onLogout={handleLogout}
          showToast={showToast}
          isFirebaseConnected={isFirebaseConnected}
        />
      )}
    </div>
  );
}
