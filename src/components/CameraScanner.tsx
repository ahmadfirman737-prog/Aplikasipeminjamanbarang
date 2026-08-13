import React, { useEffect, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { Camera, CameraOff, AlertCircle } from 'lucide-react';

interface CameraScannerProps {
  onScanSuccess: (decodedText: string) => void;
}

export const CameraScanner: React.FC<CameraScannerProps> = ({ onScanSuccess }) => {
  const [isScanning, setIsScanning] = useState<boolean>(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const html5QrCodeRef = useRef<Html5Qrcode | null>(null);
  const scannerId = 'camera-reader-element';

  const startScanner = async () => {
    setCameraError(null);
    try {
      if (!html5QrCodeRef.current) {
        html5QrCodeRef.current = new Html5Qrcode(scannerId);
      }

      if (html5QrCodeRef.current.isScanning) {
        return;
      }

      await html5QrCodeRef.current.start(
        { facingMode: 'environment' },
        { fps: 10, qrbox: { width: 240, height: 110 } },
        (decodedText) => {
          onScanSuccess(decodedText);
        },
        () => {
          // Silent callback for non-detected frames
        }
      );
      setIsScanning(true);
    } catch (err: any) {
      console.warn('Camera failed to start:', err);
      setCameraError('Kamera tidak dapat diakses atau izin ditolak. Silakan gunakan Manual Input ID.');
      setIsScanning(false);
    }
  };

  const stopScanner = async () => {
    if (html5QrCodeRef.current && html5QrCodeRef.current.isScanning) {
      try {
        await html5QrCodeRef.current.stop();
      } catch (err) {
        console.error('Error stopping scanner:', err);
      }
    }
    setIsScanning(false);
  };

  useEffect(() => {
    startScanner();

    return () => {
      if (html5QrCodeRef.current && html5QrCodeRef.current.isScanning) {
        html5QrCodeRef.current.stop().catch((e) => console.error(e));
      }
    };
  }, []);

  return (
    <div className="flex flex-col h-full text-left">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-[#f0f7fb] flex items-center justify-center text-[#074A69]">
            <Camera className="w-4 h-4" />
          </div>
          <div>
            <h3 className="font-bold text-sm sm:text-base text-gray-900">Scan Kartu Guru</h3>
          </div>
        </div>
        <button
          onClick={isScanning ? stopScanner : startScanner}
          className={`px-3 py-1 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition ${
            isScanning
              ? 'bg-rose-100 text-rose-700 hover:bg-rose-200'
              : 'bg-[#074A69] text-white hover:bg-[#05364d]'
          }`}
        >
          {isScanning ? (
            <>
              <CameraOff className="w-3.5 h-3.5" /> Matikan Kamera
            </>
          ) : (
            <>
              <Camera className="w-3.5 h-3.5" /> Nyalakan Kamera
            </>
          )}
        </button>
      </div>

      <p className="text-xs text-gray-500 mb-3">Arahkan barcode kartu ke kamera atau ketik manual ID di bawah.</p>

      <div className="relative flex-1 min-h-[180px] bg-[#f0f7fb]/60 rounded-xl border border-[#074A69]/20 overflow-hidden flex items-center justify-center">
        <div id={scannerId} className="w-full h-full object-cover"></div>

        {!isScanning && !cameraError && (
          <div className="absolute inset-0 flex flex-col items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs text-white text-center">
            <Camera className="w-8 h-8 mb-2 opacity-80" />
            <p className="text-xs font-semibold">Kamera nonaktif</p>
            <button
              onClick={startScanner}
              className="mt-2 text-xs bg-white text-[#074A69] font-bold px-3 py-1.5 rounded-lg shadow-sm"
            >
              Nyalakan Kamera
            </button>
          </div>
        )}

        {cameraError && (
          <div className="absolute inset-0 flex flex-col items-center justify-center p-4 text-center text-xs text-rose-600 bg-rose-50/90">
            <AlertCircle className="w-7 h-7 mb-1.5 text-rose-500" />
            <p className="font-semibold">{cameraError}</p>
          </div>
        )}
      </div>
    </div>
  );
};
