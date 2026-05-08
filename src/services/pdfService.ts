import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { SPPDData, OrganizationSettings } from '../types';
import { format, parseISO } from 'date-fns';
import { id as localeId } from 'date-fns/locale';

export const pdfService = {
  async generateSPPD(data: Partial<SPPDData>, id: string, settings?: OrganizationSettings | null): Promise<Blob> {
    console.log('Generating PDF for ID:', id, 'Data:', data);
    try {
      const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });
      
      if (!data) throw new Error('Data SPPD tidak ditemukan.');
      
      const satker = (settings?.satuanKerja || 'PEMERINTAH KABUPATEN / KOTA').toUpperCase();
      const alamat = settings?.alamat || 'Alamat Instansi Belum Diatur di Pengaturan';
      const lokasi = settings?.lokasiPenandatanganan || 'Bandar Lampung';

      // --- PAGE 1: SPD FORM ---
      
      // LAMPIRAN HEADER (Top Right)
      doc.setFontSize(7);
      doc.setFont('helvetica', 'normal');
      const headerRightX = 110;
      doc.text('LAMPIRAN I', headerRightX, 10);
      doc.text('PERATURAN MENTERI KEUANGAN REPUBLIK INDONESIA', headerRightX, 13);
      doc.text('NOMOR 113/PMK.05/2012', headerRightX, 16);
      doc.text('TENTANG', headerRightX, 19);
      doc.text('PERJALANAN DINAS JABATAN DALAM NEGERI BAGI PEJABAT NEGARA,', headerRightX, 22);
      doc.text('PEGAWAI NEGERI, DAN PEGAWAI TIDAK TETAP', headerRightX, 25);

      // KOP SURAT (Left)
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.text(satker, 20, 35);
      if (lokasi) doc.text(`DI ${lokasi.toUpperCase()}`, 20, 40);

      // SPD INFO (Top Right)
      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      const rightHeaderX = 140;
      doc.text('Lembar Ke', rightHeaderX, 45);
      doc.text(':', rightHeaderX + 25, 45);
      doc.text('Kode No', rightHeaderX, 50);
      doc.text(':', rightHeaderX + 25, 50);
      doc.text('Nomor', rightHeaderX, 55);
      doc.text(':', rightHeaderX + 25, 55);
      doc.text(data.nomorSppd || '-', rightHeaderX + 28, 55);

      // TITLE
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.text('SURAT PERJALANAN DINAS (SPD)', 105, 65, { align: 'center' });

      // TABLE CONTENT (1-10)
      const safeData = (val: any) => val || '-';
      const formatDate = (dateStr: any) => {
        if (!dateStr) return '-';
        try { return format(parseISO(dateStr), 'dd MMMM yyyy', { locale: localeId }); }
        catch (e) { return dateStr; }
      };

      const tableData = [
        ['1.', 'Pejabat Pembuat Komitmen', settings?.ppkNama || '-'],
        ['2.', 'Nama / NIP Pegawai yang melaksanakan perjalanan dinas', `${safeData(data.nama)}\nNIP. ${safeData(data.nip)}`],
        ['3.', 'a. Pangkat dan Golongan\nb. Jabatan / Instansi\nc. Tingkat Biaya Perjalanan Dinas', `a. ${safeData(data.pangkatGol)}\nb. ${safeData(data.jabatan)}\nc. -`],
        ['4.', 'Maksud Perjalanan Dinas', safeData(data.maksudPerjalanan)],
        ['5.', 'Alat angkutan yang dipergunakan', safeData(data.transportasi)],
        ['6.', 'a. Tempat berangkat\nb. Tempat Tujuan', `a. ${safeData(data.tempatBerangkat)}\nb. ${safeData(data.tujuan)}`],
        ['7.', 'a. Lamanya Perjalanan Dinas\nb. Tanggal Berangkat\nc. Tanggal harus kembali/tiba di tempat baru*)', `a. ${data.lamaHari || 0} hari\nb. ${formatDate(data.tanggalBerangkat)}\nc. ${formatDate(data.tanggalKembali)}`],
        ['8.', 'Pengikut : Nama & NIP', 'Tanggal Lahir          Keterangan'],
        ...((data.pengikut || []).map((p, idx) => [
          '', 
          `${idx + 1}. ${p.nama}${p.nip ? '\n   NIP. ' + p.nip : ''}`, 
          `${p.tanggalLahir || '-'}          ${p.keterangan || '-'}`
        ])),
        ['9.', 'Pembebanan Anggaran Instansi\nAkun', `a. ${safeData(data.pembebananAnggaran || settings?.satuanKerja)}\nb. ${safeData(data.akun)}`],
        ['10.', 'Keterangan lain-lain', '-'],
      ];

      autoTable(doc, {
        startY: 70,
        body: tableData,
        theme: 'grid',
        styles: { 
          cellPadding: 2, 
          fontSize: 9, 
          lineColor: [0, 0, 0], 
          lineWidth: 0.1, 
          textColor: [0, 0, 0] 
        },
        columnStyles: { 0: { cellWidth: 10, halign: 'center' }, 1: { cellWidth: 80 }, 2: { cellWidth: 80 } },
        margin: { left: 20, right: 20 }
      });

      let lastY = ((doc as any).lastAutoTable?.finalY || 70) + 5;
      doc.setFontSize(8);
      doc.text('*Coret yang tidak perlu', 20, lastY);

      lastY += 10;
      const rightX = 130;
      doc.setFontSize(9);
      doc.text('Dikeluarkan di : ' + (settings?.lokasiPenandatanganan || '-'), rightX, lastY);
      doc.text('Tanggal          : ' + format(new Date(), 'dd MMMM yyyy', { locale: localeId }), rightX, lastY + 5);
      doc.setFont('helvetica', 'bold');
      doc.text('PEJABAT PEMBUAT KOMITMEN', rightX, lastY + 10);
      
      // Removed digital verification text as requested
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.text(settings?.ppkNama || '( ____________________ )', rightX, lastY + 40);
      doc.setFont('helvetica', 'normal');
      if (settings?.ppkNip) doc.text(`NIP. ${settings.ppkNip}`, rightX, lastY + 45);

      // --- PAGE 2: VISUM / LAMPIRAN ---
      doc.addPage();
      
      // Kop Page 2
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.text(satker, 20, 15);

      const tableVisumStyles = { 
        cellPadding: 1, 
        fontSize: 8, 
        lineColor: [0, 0, 0] as [number, number, number], 
        lineWidth: 0.1, 
        textColor: [0, 0, 0] as [number, number, number], 
        minCellHeight: 30 
      };
      
      // First Block (Departure)
      autoTable(doc, {
        startY: 20,
        margin: { left: 20, right: 20 },
        body: [
          [
            '', // Kolom kosong bertanda tangan/stempel sebelah kiri
            `I.   Berangkat dari   : ${settings?.satuanKerja}\n      (Tempat Kedudukan)\n\n      Ke                      : ${data.tujuan}\n\n      Pada Tanggal      : ${formatDate(data.tanggalBerangkat)}\n      ${(settings?.kepalaJabatan || 'KEPALA').toUpperCase()}\n\n\n\n      ${settings?.kepalaNama || '( ____________________ )'}\n      NIP. ${settings?.kepalaNip || ''}`
          ]
        ],
        theme: 'grid',
        styles: tableVisumStyles,
        columnStyles: { 0: { cellWidth: 85 }, 1: { cellWidth: 85 } },
      });

      // Visum Blocks (Iterative check-ins)
      const visumData = [
        ['Tiba di             : ' + safeData(data.tujuan) + '\n\nPada Tanggal    : \nKepala\n\n\n\n(.......................................................)\nNIP.', 
         'Berangkat dari   : ' + safeData(data.tujuan) + '\nKe                      : \nPada Tanggal      : \nKepala\n\n\n\n(.......................................................)\nNIP.'],
        ['Tiba di             : \n\nPada Tanggal    : \nKepala\n\n\n\n(.......................................................)\nNIP.', 
         'Berangkat dari   : \nKe                      : \nPada Tanggal      : \nKepala\n\n\n\n(.......................................................)\nNIP.'],
        ['Tiba di             : \n\nPada Tanggal    : \nKepala\n\n\n\n(.......................................................)\nNIP.', 
         'Berangkat dari   : \nKe                      : \nPada Tanggal      : \nKepala\n\n\n\n(.......................................................)\nNIP.']
      ];

      autoTable(doc, {
        startY: (doc as any).lastAutoTable?.finalY || 100,
        body: visumData,
        theme: 'grid',
        styles: { ...tableVisumStyles },
        columnStyles: { 0: { cellWidth: 85 }, 1: { cellWidth: 85 } },
        margin: { left: 20, right: 20 }
      });

      // Final Check (Back at home)
      autoTable(doc, {
        startY: (doc as any).lastAutoTable?.finalY || 180,
        body: [
          [
            `VI.   Tiba di             : ${settings?.satuanKerja || '-'}\n      (Tempat Kedudukan)\n      Pada Tanggal    : \n\n      Pejabat Pembuat Komitmen\n\n\n\n      ${settings?.ppkNama || '(.......................................................)'}\n      NIP. ${settings?.ppkNip || ''}`,
            `      Telah diperiksa dengan keterangan bahwa perjalanan\n      tersebut atas perintahnya dan semata-mata untuk\n      kepentingan jabatan dalam waktu yang sesingkat-\n      singkatnya.\n      Pejabat Pembuat Komitmen\n\n\n\n      ${settings?.ppkNama || '(.......................................................)'}\n      NIP. ${settings?.ppkNip || ''}`
          ]
        ],
        theme: 'grid',
        styles: { ...tableVisumStyles },
        columnStyles: { 0: { cellWidth: 85 }, 1: { cellWidth: 85 } },
        margin: { left: 20, right: 20 }
      });

      // Footer Catatan & Perhatian
      autoTable(doc, {
        startY: (doc as any).lastAutoTable?.finalY || 240,
        body: [
          ['VII.', 'Catatan Lain-Lain'],
          ['VIII.', 'PERHATIAN :\nPPK yang menerbitkan SPD, pegawai yang melakukan perjalanan dinas, para pejabat yang mengesahkan tanggal berangkat/tiba, serta bendahara pengeluaran bertanggung jawab berdasarkan peraturan-peraturan Keuangan Negara apabila menderita rugi akibat kesalahan, kelalaian, dan kealpaannya.']
        ],
        theme: 'grid',
        styles: { fontSize: 7, cellPadding: 2, lineColor: [0, 0, 0], lineWidth: 0.1, textColor: [0,0,0], font: 'helvetica' },
        columnStyles: { 0: { cellWidth: 10 }, 1: { cellWidth: 160 } },
        margin: { left: 20, right: 20 }
      });

      return doc.output('blob');
    } catch (error) {
      console.error('PDF Generation Error:', error);
      throw new Error('Gagal merancang layout PDF: ' + (error instanceof Error ? error.message : 'Unknown error'));
    }
  }
};
