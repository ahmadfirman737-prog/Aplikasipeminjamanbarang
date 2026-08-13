import React, { useState } from 'react';
import { User } from '../types';
import { Lock, User as UserIcon, ArrowRight, Info } from 'lucide-react';

interface LoginViewProps {
  users: User[];
  onLoginSuccess: (user: User) => void;
  showToast: (msg: string, type: 'success' | 'error' | 'info' | 'warning') => void;
}

export const LoginView: React.FC<LoginViewProps> = ({ users, onLoginSuccess, showToast }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  const logoUrl = 'https://lh3.googleusercontent.com/d/1feiKQBBJNFoZm9ijocebq7BnVg2N5Qm4';

  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const validUser = users.find(
      (u) => u.username.trim().toLowerCase() === username.trim().toLowerCase() && u.password === password
    );

    if (validUser) {
      showToast(`Selamat datang, ${validUser.name}!`, 'success');
      onLoginSuccess(validUser);
    } else {
      showToast('Username atau password salah!', 'error');
    }
  };

  return (
    <div className="flex-1 flex items-center justify-center p-4 bg-slate-50 min-h-screen">
      <div className="bg-white/95 backdrop-blur-md rounded-3xl shadow-2xl flex flex-col md:flex-row w-full max-w-4xl overflow-hidden border border-[#074A69]/20">
        {/* Left Side branding */}
        <div className="md:w-1/2 bg-gradient-to-br from-[#074A69] via-[#05364d] to-[#032230] text-white p-8 md:p-12 flex flex-col justify-center items-center relative overflow-hidden">
          <div className="absolute -top-12 -left-12 w-48 h-48 bg-white/10 rounded-full blur-2xl"></div>
          <div className="absolute -bottom-12 -right-12 w-48 h-48 bg-[#074A69]/30 rounded-full blur-2xl"></div>

          <div className="flex flex-col items-start z-10 w-full max-w-sm text-left">
            <img
              src={logoUrl}
              alt="Logo Kusuma Bangsa"
              className="w-28 h-28 md:w-36 md:h-36 object-contain filter drop-shadow-md mb-3"
              onError={(e) => {
                (e.target as HTMLElement).style.display = 'none';
              }}
            />

            <h1 className="text-xl md:text-2xl font-black mb-0 tracking-tight leading-tight w-full">
              Aplikasi Peminjaman Barang
            </h1>
            <h2 className="text-lg md:text-xl font-bold text-sky-100 mb-3 w-full">Laboratorium Komputer</h2>
            <div className="w-16 h-1 bg-sky-400 mb-4 rounded-full"></div>

            <p className="font-bold text-xs md:text-sm tracking-wider text-sky-100 uppercase mb-1.5 w-full">
              SMP-SMK Kusuma Bangsa Bogor
            </p>
            <p className="font-normal text-xs text-sky-200/90 leading-relaxed w-full">
              Jl. Raya Ciapus No. 53 Rt 03 Rw 14 Desa Kota Batu Kecamatan Ciomas Kabupaten Bogor
            </p>
          </div>
        </div>

        {/* Right Side Form */}
        <div className="md:w-1/2 p-8 md:p-12 flex flex-col justify-center bg-gradient-to-br from-[#f0f7fb]/80 via-white to-[#e1f0f7]/40 text-left">
          <div className="mb-6">
            <h3 className="text-2xl font-extrabold text-gray-900 tracking-tight">Halo, Selamat Datang! 👋</h3>
            <p className="text-gray-500 text-xs sm:text-sm mt-1">Silakan masuk dengan akun kredensial Anda.</p>
          </div>

          <form onSubmit={handleLoginSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-1.5">
                Username
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#074A69]">
                  <UserIcon className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="pl-10 w-full bg-[#f0f7fb]/60 border border-[#074A69]/20 rounded-xl p-3 text-xs sm:text-sm focus:ring-2 focus:ring-[#074A69] focus:bg-white outline-none transition font-medium text-gray-800"
                  placeholder="Masukkan username"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-1.5">
                Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#074A69]">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-10 w-full bg-[#f0f7fb]/60 border border-[#074A69]/20 rounded-xl p-3 text-xs sm:text-sm focus:ring-2 focus:ring-[#074A69] focus:bg-white outline-none transition font-medium text-gray-800"
                  placeholder="Masukkan password"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              className="w-full bg-gradient-to-r from-[#074A69] to-[#0c618c] hover:from-[#05364d] hover:to-[#074A69] text-white font-semibold rounded-xl p-3 transition shadow-lg shadow-[#074A69]/20 text-xs sm:text-sm flex items-center justify-center gap-2 cursor-pointer mt-2"
            >
              <span>Masuk ke Dasbor</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          {/* Info Badge */}
          <div className="mt-5 p-3 rounded-xl bg-[#f0f7fb] border border-[#074A69]/20 flex items-start gap-2.5">
            <Info className="w-4 h-4 text-[#074A69] shrink-0 mt-0.5" />
            <p className="text-xs text-[#074A69] font-medium leading-relaxed">
              Guru tidak perlu akun login. Kartu barcode guru langsung di-scan oleh Petugas Lab saat transaksi.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
