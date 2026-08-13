import * as XLSX from 'xlsx';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { DatabaseState } from '../types';

export function exportLaporanToExcel(db: DatabaseState): void {
  if (db.transaksis.length === 0) {
    throw new Error('Tidak ada data transaksi untuk diekspor');
  }

  const dataToExport = db.transaksis.map((tx) => {
    const guru = db.gurus.find((g) => g.id === tx.guru_id);
    const barang = db.barangs.find((b) => b.kode === tx.barang_kode);
    
    let statusStr = 'Dipinjam';
    if (tx.status === 'selesai') {
      statusStr = 'Selesai';
    } else if (tx.jumlah_kembali > 0) {
      statusStr = 'Sebagian';
    }

    return {
      'ID Transaksi': tx.id,
      'ID Barcode Guru': tx.guru_id,
      'Nama Guru': guru ? guru.nama : tx.guru_id,
      'Mata Pelajaran': guru ? guru.mapel : '-',
      'Kode Barang': tx.barang_kode,
      'Nama Barang': barang ? barang.nama : tx.barang_kode,
      'Kategori': barang ? barang.kategori : '-',
      'Jumlah Dipinjam': tx.jumlah,
      'Jumlah Dikembalikan': tx.jumlah_kembali || 0,
      'Tanggal Pinjam': new Date(tx.tgl_pinjam).toLocaleString('id-ID'),
      'Tanggal Kembali': tx.tgl_kembali ? new Date(tx.tgl_kembali).toLocaleString('id-ID') : '-',
      'Status': statusStr
    };
  });

  const ws = XLSX.utils.json_to_sheet(dataToExport);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Laporan Peminjaman');
  
  const fileName = `Laporan_Lab_Komputer_${new Date().toISOString().split('T')[0]}.xlsx`;
  XLSX.writeFile(wb, fileName);
}

export function exportLaporanToPDF(db: DatabaseState): void {
  if (db.transaksis.length === 0) {
    throw new Error('Tidak ada data transaksi untuk diekspor');
  }

  const doc = new jsPDF('portrait', 'pt', 'a4');
  
  // Header Branding
  doc.setFillColor(7, 74, 105); // #074A69 Navy
  doc.rect(0, 0, 595.28, 60, 'F');
  
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('SMP-SMK KUSUMA BANGSA BOGOR', 40, 28);
  
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text('Laporan Peminjaman Inventaris Lab Komputer', 40, 44);

  // Subtitle
  doc.setTextColor(40, 40, 40);
  doc.setFontSize(10);
  doc.text(`Tanggal Cetak: ${new Date().toLocaleString('id-ID')}`, 40, 80);
  doc.text(`Total Transaksi Recorded: ${db.transaksis.length}`, 400, 80);

  const tableColumn = ['ID Trx', 'Guru', 'Barang', 'Pinjam/Kembali', 'Tgl Pinjam', 'Status'];
  const tableRows: string[][] = [];

  // Sort descending
  const sortedTx = [...db.transaksis].reverse();

  sortedTx.forEach((tx) => {
    const guru = db.gurus.find((g) => g.id === tx.guru_id);
    const barang = db.barangs.find((b) => b.kode === tx.barang_kode);

    let statusText = 'Dipinjam';
    if (tx.status === 'selesai') {
      statusText = 'Selesai';
    } else if (tx.jumlah_kembali > 0) {
      statusText = `Sebagian (${tx.jumlah_kembali}/${tx.jumlah})`;
    }

    const row = [
      tx.id,
      guru ? guru.nama : tx.guru_id,
      barang ? barang.nama : tx.barang_kode,
      `${tx.jumlah} / ${tx.jumlah_kembali || 0}`,
      new Date(tx.tgl_pinjam).toLocaleDateString('id-ID', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      }),
      statusText
    ];
    tableRows.push(row);
  });

  autoTable(doc, {
    head: [tableColumn],
    body: tableRows,
    startY: 95,
    styles: { fontSize: 8, cellPadding: 6 },
    headStyles: { fillColor: [7, 74, 105], textColor: 255, fontStyle: 'bold' },
    alternateRowStyles: { fillColor: [240, 247, 251] }
  });

  const fileName = `Laporan_Lab_Komputer_${new Date().toISOString().split('T')[0]}.pdf`;
  doc.save(fileName);
}
