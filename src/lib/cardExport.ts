import { jsPDF } from 'jspdf';
import JsBarcode from 'jsbarcode';
import { Guru } from '../types';

/**
 * Render a single Guru ID card onto a HTML5 Canvas (high-resolution CR-80 300 DPI layout)
 */
export function renderGuruCardToCanvas(guru: Guru, scale: number = 3): HTMLCanvasElement {
  // Base dimensions: 336px x 212px (approx 85.6mm x 53.98mm ratio)
  const baseW = 336;
  const baseH = 212;
  const width = baseW * scale;
  const height = baseH * scale;

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return canvas;

  ctx.save();
  ctx.scale(scale, scale);

  // Background rounded card
  const r = 14;
  ctx.beginPath();
  ctx.moveTo(r, 0);
  ctx.lineTo(baseW - r, 0);
  ctx.quadraticCurveTo(baseW, 0, baseW, r);
  ctx.lineTo(baseW, baseH - r);
  ctx.quadraticCurveTo(baseW, baseH, baseW - r, baseH);
  ctx.lineTo(r, baseH);
  ctx.quadraticCurveTo(0, baseH, 0, baseH - r);
  ctx.lineTo(0, r);
  ctx.quadraticCurveTo(0, 0, r, 0);
  ctx.closePath();

  // Subtle gradient background
  const bgGrad = ctx.createLinearGradient(0, 0, baseW, baseH);
  bgGrad.addColorStop(0, '#ffffff');
  bgGrad.addColorStop(0.5, '#f4f9fc');
  bgGrad.addColorStop(1, '#e3f0f7');
  ctx.fillStyle = bgGrad;
  ctx.fill();

  // Border
  ctx.lineWidth = 2.5;
  ctx.strokeStyle = '#074A69';
  ctx.stroke();

  // Top Header Banner
  const headerHeight = 36;
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(baseW, 0);
  ctx.lineTo(baseW, headerHeight);
  ctx.lineTo(0, headerHeight);
  ctx.closePath();

  const headerGrad = ctx.createLinearGradient(0, 0, baseW, 0);
  headerGrad.addColorStop(0, '#074A69');
  headerGrad.addColorStop(1, '#0c618c');
  ctx.fillStyle = headerGrad;
  ctx.fill();

  // Header Title
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 11px system-ui, -apple-system, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('SMP-SMK KUSUMA BANGSA BOGOR', baseW / 2, 14);

  ctx.fillStyle = '#93c5fd';
  ctx.font = 'bold 8.5px system-ui, -apple-system, sans-serif';
  ctx.fillText('KARTU AKSES PEMINJAMAN LAB KOMPUTER', baseW / 2, 27);

  // Guru Name
  ctx.fillStyle = '#05364d';
  ctx.font = 'bold 14px system-ui, -apple-system, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';

  // Truncate name if too long
  let displayName = guru.nama;
  if (ctx.measureText(displayName).width > baseW - 30) {
    while (ctx.measureText(displayName + '...').width > baseW - 30 && displayName.length > 0) {
      displayName = displayName.slice(0, -1);
    }
    displayName += '...';
  }
  ctx.fillText(displayName, baseW / 2, 45);

  // Mapel & NIP
  ctx.fillStyle = '#074A69';
  ctx.font = 'bold 9px system-ui, -apple-system, sans-serif';
  const subText = `${guru.mapel} ${guru.nip ? `• NIP: ${guru.nip}` : ''}`;
  ctx.fillText(subText, baseW / 2, 63);

  // Barcode Box Container (Pure white background for optical scanning)
  const boxX = 22;
  const boxY = 80;
  const boxW = baseW - 44;
  const boxH = 92;

  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.roundRect ? ctx.roundRect(boxX, boxY, boxW, boxH, 8) : ctx.rect(boxX, boxY, boxW, boxH);
  ctx.fill();
  ctx.lineWidth = 1;
  ctx.strokeStyle = '#cbd5e1';
  ctx.stroke();

  // Draw Real Code128 Barcode onto a temporary canvas
  const barcodeCanvas = document.createElement('canvas');
  try {
    JsBarcode(barcodeCanvas, guru.id.trim().toUpperCase(), {
      format: 'CODE128',
      lineColor: '#000000',
      width: 2.2,
      height: 52,
      displayValue: false,
      margin: 4,
      background: '#ffffff'
    });
    ctx.drawImage(barcodeCanvas, boxX + 6, boxY + 6, boxW - 12, 54);
  } catch (e) {
    console.error('Error drawing barcode:', e);
  }

  // ID Text underneath barcode
  ctx.fillStyle = '#0f172a';
  ctx.font = 'bold 12px "Courier New", monospace';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'bottom';
  ctx.fillText(guru.id.trim().toUpperCase(), baseW / 2, boxY + boxH - 6);

  // Footer Tagline
  ctx.fillStyle = '#64748b';
  ctx.font = 'italic 7.5px system-ui, -apple-system, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'bottom';
  ctx.fillText('*Tunjukkan kartu ini kepada petugas saat meminjam alat lab', baseW / 2, baseH - 6);

  ctx.restore();
  return canvas;
}

/**
 * Download a single Guru ID card as high-res PNG image
 */
export function downloadSingleCardPNG(guru: Guru): void {
  const canvas = renderGuruCardToCanvas(guru, 3);
  const dataUrl = canvas.toDataURL('image/png');
  const safeName = guru.nama.replace(/[^a-zA-Z0-9_-]/g, '_');
  const filename = `Kartu_Guru_${guru.id}_${safeName}.png`;

  const link = document.createElement('a');
  link.download = filename;
  link.href = dataUrl;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

/**
 * Export all Guru ID cards to a printable A4 PDF sheet (ready for printing & cutting)
 */
export function downloadAllCardsPDF(gurus: Guru[]): void {
  if (!gurus || gurus.length === 0) {
    throw new Error('Tidak ada data guru untuk diunduh');
  }

  const doc = new jsPDF('portrait', 'pt', 'a4');
  const pageWidth = 595.28;
  const pageHeight = 841.89;

  // Grid settings: 2 columns x 4 rows = 8 cards per A4 page
  const cardWidthPt = 240;
  const cardHeightPt = 152;
  const marginX = (pageWidth - cardWidthPt * 2) / 3;
  const marginY = 40;
  const gapY = 24;

  let currentCardIndex = 0;

  while (currentCardIndex < gurus.length) {
    if (currentCardIndex > 0) {
      doc.addPage();
    }

    // Page Header
    doc.setFillColor(7, 74, 105);
    doc.rect(0, 0, pageWidth, 28, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.text('KARTU AKSES GURU - SMP-SMK KUSUMA BANGSA BOGOR (LEMBAR CETAK A4)', pageWidth / 2, 18, { align: 'center' });

    // Draw up to 8 cards per page
    for (let row = 0; row < 4; row++) {
      for (let col = 0; col < 2; col++) {
        if (currentCardIndex >= gurus.length) break;

        const guru = gurus[currentCardIndex];
        const cardX = marginX + col * (cardWidthPt + marginX);
        const cardY = marginY + row * (cardHeightPt + gapY);

        const canvas = renderGuruCardToCanvas(guru, 2);
        const imgData = canvas.toDataURL('image/png');

        // Add card image
        doc.addImage(imgData, 'PNG', cardX, cardY, cardWidthPt, cardHeightPt);

        // Optional cutting guide markers around the card
        doc.setDrawColor(200, 200, 200);
        doc.setLineWidth(0.5);
        doc.rect(cardX - 1, cardY - 1, cardWidthPt + 2, cardHeightPt + 2, 'S');

        currentCardIndex++;
      }
    }

    // Page Footer
    doc.setTextColor(120, 120, 120);
    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'normal');
    doc.text(
      `Dicetak pada: ${new Date().toLocaleString('id-ID')} • Siap dipotong dan dilaminasi untuk kartu akses lab`,
      pageWidth / 2,
      pageHeight - 14,
      { align: 'center' }
    );
  }

  const filename = `Koleksi_Kartu_Guru_Kusuma_Bangsa_${new Date().toISOString().split('T')[0]}.pdf`;
  doc.save(filename);
}
