import React from 'react';
import { Guru } from '../types';
import { BarcodeCard } from './BarcodeCard';
import { downloadSingleCardPNG } from '../lib/cardExport';
import { Printer, X, GraduationCap, Download, Check } from 'lucide-react';

interface PrintIdCardModalProps {
  guru: Guru | null;
  onClose: () => void;
  onToast?: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

export const PrintIdCardModal: React.FC<PrintIdCardModalProps> = ({ guru, onClose, onToast }) => {
  const [downloaded, setDownloaded] = React.useState(false);

  if (!guru) return null;

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadPNG = () => {
    try {
      downloadSingleCardPNG(guru);
      setDownloaded(true);
      if (onToast) onToast(`Kartu ${guru.nama} berhasil diunduh (PNG HD)!`, 'success');
      setTimeout(() => setDownloaded(false), 2500);
    } catch (e) {
      console.error(e);
      if (onToast) onToast('Gagal mengunduh kartu.', 'error');
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 border border-gray-100 flex flex-col items-center">
        <div className="w-full flex justify-between items-center mb-4 border-b border-gray-100 pb-3">
          <h3 className="font-bold text-gray-900 text-base flex items-center gap-2">
            <Printer className="w-5 h-5 text-[#074A69]" /> Preview & Unduh Kartu Guru
          </h3>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Realistic Standard ID Card Dimensions (8.56cm x 5.398cm => ~324px x 204px) */}
        <div className="id-card-preview border-2 border-[#074A69] rounded-xl overflow-hidden shadow-xl bg-gradient-to-br from-white via-[#f0f7fb] to-[#e1f0f7] w-[324px] h-[204px] flex flex-col justify-between p-3 relative my-4">
          <div className="bg-gradient-to-r from-[#074A69] to-[#05364d] text-white text-[10px] font-bold tracking-wide uppercase px-2.5 py-1.5 rounded-lg flex items-center justify-center gap-1.5 shadow-xs">
            <GraduationCap className="w-3.5 h-3.5 text-sky-300" /> KUSUMA BANGSA BOGOR
          </div>

          <div className="flex-1 flex flex-col items-center justify-center my-2 text-center">
            <h4 className="text-sm font-bold text-[#05364d] leading-snug max-w-[280px] truncate">
              {guru.nama}
            </h4>
            <p className="text-[10px] text-[#074A69] font-bold uppercase tracking-wider mb-2">
              {guru.mapel} {guru.nip ? `• NIP. ${guru.nip}` : ''}
            </p>

            <div className="bg-white px-3 py-1.5 rounded-lg border border-gray-200 shadow-2xs w-full max-w-[260px] flex justify-center items-center">
              <BarcodeCard code={guru.id} className="w-full max-h-[42px]" />
            </div>

            <p className="text-[10px] font-mono font-bold text-gray-600 mt-1.5 tracking-wider">{guru.id}</p>
          </div>
        </div>

        <div className="w-full flex flex-wrap justify-end gap-2 sm:gap-2.5 mt-4 pt-3 border-t border-gray-100">
          <button
            onClick={onClose}
            className="px-3.5 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold rounded-xl text-xs transition cursor-pointer"
          >
            Tutup
          </button>
          <button
            onClick={handleDownloadPNG}
            className="px-3.5 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 font-semibold rounded-xl text-xs transition shadow-xs flex items-center gap-1.5 cursor-pointer"
          >
            {downloaded ? <Check className="w-4 h-4 text-emerald-600" /> : <Download className="w-4 h-4" />}
            <span>{downloaded ? 'Tersimpan!' : 'Download PNG'}</span>
          </button>
          <button
            onClick={handlePrint}
            className="px-3.5 py-2 bg-gradient-to-r from-[#074A69] to-[#0c618c] text-white font-semibold rounded-xl text-xs transition shadow-md flex items-center gap-1.5 cursor-pointer"
          >
            <Printer className="w-4 h-4" /> Cetak Kartu
          </button>
        </div>
      </div>
    </div>
  );
};
