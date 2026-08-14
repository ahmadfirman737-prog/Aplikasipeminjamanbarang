import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import { Camera, CameraOff, AlertCircle, Scan, Volume2 } from 'lucide-react';

interface CameraScannerProps {
  onScanSuccess: (decodedText: string) => void;
}

export const CameraScanner: React.FC<CameraScannerProps> = ({ onScanSuccess }) => {
  const [isScanning, setIsScanning] = useState<boolean>(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [lastScanned, setLastScanned] = useState<string | null>(null);
  const html5QrCodeRef = useRef<Html5Qrcode | null>(null);
  const lastScanTimeRef = useRef<number>(0);
  const scannerId = 'camera-reader-element';

  // Play short confirmation beep
  const playBeep = () => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, ctx.currentTime); // A5 note
      gain.gain.setValueAtTime(0.15, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.15);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.15);
    } catch {
      // Audio not permitted or not supported
    }
  };

  const handleScan = useCallback(
    (decodedText: string) => {
      const now = Date.now();
      // Debounce identical scans within 1.5 seconds
      if (now - lastScanTimeRef.current < 1500 && lastScanned === decodedText) {
        return;
      }
      lastScanTimeRef.current = now;
      setLastScanned(decodedText);
      playBeep();
      onScanSuccess(decodedText);
    },
    [lastScanned, onScanSuccess]
  );

  const startScanner = async () => {
    setCameraError(null);
    try {
      if (!html5QrCodeRef.current) {
        const formatsToSupport = [
          Html5QrcodeSupportedFormats.CODE_128,
          Html5QrcodeSupportedFormats.CODE_39,
          Html5QrcodeSupportedFormats.CODE_93,
          Html5QrcodeSupportedFormats.EAN_13,
          Html5QrcodeSupportedFormats.EAN_8,
          Html5QrcodeSupportedFormats.UPC_A,
          Html5QrcodeSupportedFormats.UPC_E,
          Html5QrcodeSupportedFormats.QR_CODE,
          Html5QrcodeSupportedFormats.DATA_MATRIX,
          Html5QrcodeSupportedFormats.ITF
        ];

        html5QrCodeRef.current = new Html5Qrcode(scannerId, {
          formatsToSupport,
          verbose: false,
          experimentalFeatures: {
            useBarCodeDetectorIfSupported: true
          }
        });
      }

      if (html5QrCodeRef.current.isScanning) {
        return;
      }

      await html5QrCodeRef.current.start(
        { facingMode: 'environment' },
        {
          fps: 15,
          qrbox: (viewfinderWidth, viewfinderHeight) => {
            const width = Math.min(viewfinderWidth * 0.9, 320);
            const height = Math.min(viewfinderHeight * 0.6, 160);
            return { width: Math.max(width, 200), height: Math.max(height, 80) };
          },
          aspectRatio: 1.777778
        },
        (decodedText) => {
          handleScan(decodedText);
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
            <h3 className="font-bold text-sm sm:text-base text-gray-900 flex items-center gap-1.5">
              Scan Kartu Guru
              {lastScanned && (
                <span className="text-[10px] bg-emerald-50 text-emerald-700 font-mono px-1.5 py-0.5 rounded border border-emerald-200">
                  {lastScanned}
                </span>
              )}
            </h3>
          </div>
        </div>
        <button
          onClick={isScanning ? stopScanner : startScanner}
          className={`px-3 py-1 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer ${
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

      <p className="text-xs text-gray-500 mb-2.5">
        Arahkan barcode kartu ke kamera, gunakan barcode scanner USB, atau ketik ID di bawah.
      </p>

      <div className="relative flex-1 min-h-[190px] bg-slate-900 rounded-xl border border-[#074A69]/20 overflow-hidden flex items-center justify-center">
        <div id={scannerId} className="w-full h-full object-cover"></div>

        {isScanning && (
          <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
            <div className="w-[85%] max-w-[280px] h-[90px] border-2 border-emerald-400/80 rounded-lg relative">
              <div className="absolute left-0 right-0 top-1/2 h-0.5 bg-red-500/80 shadow-xs shadow-red-500 animate-pulse"></div>
            </div>
          </div>
        )}

        {!isScanning && !cameraError && (
          <div className="absolute inset-0 flex flex-col items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs text-white text-center">
            <Camera className="w-8 h-8 mb-2 opacity-80" />
            <p className="text-xs font-semibold">Kamera nonaktif</p>
            <button
              onClick={startScanner}
              className="mt-2 text-xs bg-white text-[#074A69] font-bold px-3 py-1.5 rounded-lg shadow-sm cursor-pointer hover:bg-gray-100"
            >
              Nyalakan Kamera
            </button>
          </div>
        )}

        {cameraError && (
          <div className="absolute inset-0 flex flex-col items-center justify-center p-4 text-center text-xs text-rose-600 bg-rose-50/95">
            <AlertCircle className="w-7 h-7 mb-1.5 text-rose-500" />
            <p className="font-semibold">{cameraError}</p>
          </div>
        )}
      </div>
    </div>
  );
};

