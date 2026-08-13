import React, { useState, useEffect } from 'react';
import { DatabaseState, User, ToastMessage, ToastType, Guru } from './types';
import { loadDatabase, saveDatabase } from './lib/storage';
import { LoginView } from './components/LoginView';
import { AdminDashboard } from './components/AdminDashboard';
import { PetugasDashboard } from './components/PetugasDashboard';
import { PrintIdCardModal } from './components/PrintIdCardModal';
import { ToastContainer } from './components/ToastContainer';

export default function App() {
  const [db, setDb] = useState<DatabaseState>(() => loadDatabase());
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [printGuruCardModal, setPrintGuruCardModal] = useState<Guru | null>(null);

  // Sync state changes to localStorage automatically
  useEffect(() => {
    saveDatabase(db);
  }, [db]);

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
        />
      ) : (
        <PetugasDashboard
          db={db}
          setDb={setDb}
          currentUser={currentUser}
          onLogout={handleLogout}
          showToast={showToast}
        />
      )}
    </div>
  );
}
