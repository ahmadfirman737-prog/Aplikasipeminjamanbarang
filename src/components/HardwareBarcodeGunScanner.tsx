import React, { useState, useEffect, useRef } from 'react';
import { Guru } from '../types';
import {
  Barcode,
  Volume2,
  VolumeX,
  Zap,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  Radio,
  Play,
  RotateCcw
} from 'lucide-react';
import { playScannerSuccessBeep, playScannerErrorBeep } from '../lib/scannerAudio';

interface HardwareBarcodeGunScannerProps {
  onScanSuccess: (code: string) => void;
  gurus: Guru[];
  soundEnabled: boolean;
  onToggleSound: () => void;
  lastScannedGuru?: Guru | null;
}

export const HardwareBarcodeGunScanner: React.FC<HardwareBarcodeGunScannerProps> = ({
  onScanSuccess,
  gurus,
  soundEnabled,
  onToggleSound,
  lastScannedGuru
}) => {
  const [inputValue, setInputValue] = useState('');
  const [lastScannedCode, setLastScannedCode] = useState<string | null>(null);
  const [lastScanStatus, setLastScanStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [isLaserActive, setIsLaserActive] = useState(true);
  const inputRef = useRef<HTMLInputElement | null>(null);

  // Keep input focused so barcode gun input always lands directly
  const ensureFocus = () => {
    if (inputRef.current) {
      inputRef.current.focus();
    }
  };

  useEffect(() => {
    ensureFocus();
    const interval = setInterval(() => {
      // Periodic check to ensure focus if user clicked away inside scanner tab
      if (document.activeElement?.tagName !== 'INPUT' && document.activeElement?.tagName !== 'TEXTAREA') {
        ensureFocus();
      }
    }, 1500);

    return () => clearInterval(interval);
  }, []);

  const handleProcessCode = (code: string) => {
    const clean = code.trim();
    if (!clean) return;

    setLastScannedCode(clean);

    // Trigger visual laser flash effect
    setIsLaserActive(false);
    setTimeout(() => setIsLaserActive(true), 250);

    // Check if matches guru
    const match = gurus.find(
      (g) =>
        g.id.toUpperCase() === clean.toUpperCase() ||
        g.id.replace(/[^A-Z0-9]/gi, '').toUpperCase() === clean.replace(/[^A-Z0-9]/gi, '').toUpperCase()
    );

    if (match) {
      setLastScanStatus('success');
      if (soundEnabled) playScannerSuccessBeep();
      onScanSuccess(clean);
    } else {
      setLastScanStatus('error');
      if (soundEnabled) playScannerErrorBeep();
      onScanSuccess(clean);
    }

    setInputValue('');
    setTimeout(() => setLastScanStatus('idle'), 3000);
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputValue.trim()) {
      handleProcessCode(inputValue);
    }
  };

  return (
    <div
      onClick={ensureFocus}
      className="bg-gradient-to-b from-slate-900 via-[#041e2b] to-[#074A69] text-white p-4 sm:p-5 rounded-2xl shadow-lg border border-[#074A69]/40 flex flex-col justify-between relative overflow-hidden"
    >
      {/* Background Decorative Tech Lines */}
      <div className="absolute inset-0 opacity-10 pointer-events-none bg-[radial-gradient(#38bdf8_1px,transparent_1px)] [background-size:16px_16px]"></div>

      {/* Header Status Bar */}
      <div className="flex items-center justify-between gap-2 mb-3 relative z-10">
        <div className="flex items-center gap-2">
          <span className="relative flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
          </span>
          <span className="text-xs font-extrabold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
            <Radio className="w-3.5 h-3.5 animate-pulse" /> Scanner Gun Siap
          </span>
        </div>

        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onToggleSound();
          }}
          className={`px-2.5 py-1 rounded-lg text-[11px] font-bold flex items-center gap-1 transition cursor-pointer border ${
            soundEnabled
              ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 hover:bg-emerald-500/30'
              : 'bg-slate-700/50 text-gray-400 border-slate-600 hover:bg-slate-700'
          }`}
          title={soundEnabled ? 'Suara Scanner Aktif' : 'Suara Scanner Dimatikan'}
        >
          {soundEnabled ? <Volume2 className="w-3.5 h-3.5 text-emerald-400" /> : <VolumeX className="w-3.5 h-3.5" />}
          <span>{soundEnabled ? 'Beep ON' : 'Mute'}</span>
        </button>
      </div>

      {/* Center Visual: Barcode Laser Scanning Box */}
      <div className="relative my-2 py-4 px-3 bg-black/40 rounded-xl border border-sky-500/30 flex flex-col items-center justify-center overflow-hidden">
        {/* Animated Laser Beam */}
        {isLaserActive && (
          <div className="absolute left-4 right-4 h-0.5 bg-gradient-to-r from-transparent via-rose-500 to-transparent shadow-[0_0_12px_#f43f5e] animate-bounce pointer-events-none z-20"></div>
        )}

        {/* Barcode Lines Graphic */}
        <div className="flex items-center justify-center gap-1.5 py-2 px-6 bg-white/10 rounded-lg backdrop-blur-xs border border-white/10">
          <div className="w-1 h-10 bg-sky-300"></div>
          <div className="w-2 h-10 bg-sky-300"></div>
          <div className="w-0.5 h-10 bg-sky-300"></div>
          <div className="w-1.5 h-10 bg-sky-300"></div>
          <div className="w-3 h-10 bg-sky-300"></div>
          <div className="w-0.5 h-10 bg-sky-300"></div>
          <div className="w-2 h-10 bg-sky-300"></div>
          <div className="w-1 h-10 bg-sky-300"></div>
          <div className="w-2.5 h-10 bg-sky-300"></div>
          <div className="w-1 h-10 bg-sky-300"></div>
        </div>

        <p className="text-[11px] font-mono text-sky-200 mt-2 text-center tracking-wide">
          Arahkan Scanner Gun & Tekan Pemicu
        </p>
        <p className="text-[10px] text-gray-400 text-center mt-0.5">
          Mendukung USB Scanner, Wireless 2.4G & Bluetooth Barcode Gun
        </p>
      </div>

      {/* Auto-Focused Trigger Input Form */}
      <form onSubmit={handleFormSubmit} className="relative mt-2 z-10">
        <div className="relative flex items-center">
          <input
            ref={inputRef}
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder="Klik di sini jika scanner belum fokus..."
            className="w-full bg-slate-950/80 border border-sky-500/50 rounded-xl py-2 px-3 pl-8 text-xs font-mono font-bold text-sky-300 placeholder-slate-500 focus:ring-2 focus:ring-sky-400 focus:border-sky-400 outline-none"
          />
          <Barcode className="w-4 h-4 text-sky-400 absolute left-2.5 pointer-events-none" />
          <button
            type="submit"
            className="absolute right-1.5 top-1.5 bottom-1.5 px-3 bg-gradient-to-r from-sky-500 to-[#074A69] text-white text-[11px] font-bold rounded-lg hover:from-sky-400 hover:to-[#05364d] transition cursor-pointer flex items-center gap-1"
          >
            <Zap className="w-3 h-3" /> Input
          </button>
        </div>
      </form>

      {/* Live Scan Result Notification */}
      {lastScanStatus !== 'idle' && (
        <div
          className={`mt-2 p-2 rounded-xl text-xs font-semibold flex items-center justify-between animate-fadeIn ${
            lastScanStatus === 'success'
              ? 'bg-emerald-500/20 border border-emerald-500/40 text-emerald-300'
              : 'bg-rose-500/20 border border-rose-500/40 text-rose-300'
          }`}
        >
          <div className="flex items-center gap-1.5">
            {lastScanStatus === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
            )}
            <span className="truncate">
              {lastScanStatus === 'success'
                ? `Berhasil: ${lastScannedGuru?.nama || lastScannedCode}`
                : `ID "${lastScannedCode}" tidak terdaftar`}
            </span>
          </div>
          <span className="font-mono text-[10px] bg-black/40 px-1.5 py-0.5 rounded">
            {lastScannedCode}
          </span>
        </div>
      )}

      {/* Quick Test Barcode Gun Simulation (when no physical gun is available) */}
      <div className="mt-3 pt-2.5 border-t border-white/10">
        <div className="flex items-center justify-between text-[10px] text-sky-300 font-bold mb-1.5">
          <span className="flex items-center gap-1">
            <Sparkles className="w-3 h-3 text-amber-400" /> Simulasi Cepat Barcode:
          </span>
          <span className="text-gray-400 text-[9px]">Klik ID di bawah untuk tes</span>
        </div>
        <div className="flex flex-wrap gap-1.5 max-h-16 overflow-y-auto">
          {gurus.slice(0, 4).map((g) => (
            <button
              key={g.id}
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                handleProcessCode(g.id);
              }}
              className="bg-white/10 hover:bg-sky-500/30 text-sky-200 border border-white/15 px-2 py-1 rounded-lg text-[10px] font-mono font-bold transition flex items-center gap-1 cursor-pointer"
            >
              <Play className="w-2.5 h-2.5 text-emerald-400" />
              <span>{g.id}</span>
              <span className="text-gray-400 font-sans font-normal truncate max-w-[80px]">({g.nama.split(' ')[0]})</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
