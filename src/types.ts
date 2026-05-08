export interface Pengikut {
  nama: string;
  nip: string;
  pangkatGol: string;
  tanggalLahir: string;
  keterangan: string;
}

export interface SPPDData {
  id: string;
  nomorSppd: string;
  nama: string;
  nip: string;
  jabatan: string;
  pangkatGol: string;
  maksudPerjalanan: string;
  tujuan: string;
  tanggalBerangkat: string;
  tanggalKembali: string;
  lamaHari: number;
  transportasi: string;
  tempatBerangkat: string;
  instansiTujuan: string;
  pembebananAnggaran: string;
  akun: string;
  pejabatPenandatangan: string;
  pengikut: Pengikut[];
  pdfUrl?: string;
  timestamp: string;
  createdAt?: any;
  createdBy?: string;
}

export interface OrganizationSettings {
  instansiPusat: string;
  satuanKerja: string;
  alamat: string;
  lokasiPenandatanganan: string;
  // Pejabat Pembuat Komitmen
  ppkNama: string;
  ppkNip: string;
  ppkJabatan: string;
  // Kepala Kantor / Satuan Kerja
  kepalaNama: string;
  kepalaNip: string;
  kepalaJabatan: string;
}

export interface AllowedUser {
  id?: string;
  email: string;
  addedAt: string;
}

export const MASTER_ADMIN = 'samkidproject@gmail.com';

export const PANGKAT_GOL_OPTIONS = [
  'Juru Muda - I/a',
  'Juru Muda Tingkat I - I/b',
  'Juru - I/c',
  'Juru Tingkat I - I/d',
  'Pengatur Muda - II/a',
  'Pengatur Muda Tingkat I - II/b',
  'Pengatur - II/c',
  'Pengatur Tingkat I - II/d',
  'Penata Muda - III/a',
  'Penata Muda Tingkat I - III/b',
  'Penata - III/c',
  'Penata Tingkat I - III/d',
  'Pembina - IV/a',
  'Pembina Tingkat I - IV/b',
  'Pembina Utama Muda - IV/c',
  'Pembina Utama Madya - IV/d',
  'Pembina Utama - IV/e',
];

export const TRANSPORTASI_OPTIONS = [
  'Mobil Dinas',
  'Pesawat Terbang',
  'Kereta Api',
  'Kapal Laut',
  'Kendaraan Umum',
];

export const AKUN_OPTIONS = [
  { value: '', label: '- Pilih Akun / Mata Anggaran -', description: '' },
  { value: '524111', label: '524111', description: 'Belanja Perjalanan Dinas Biasa' },
  { value: '524113', label: '524113', description: 'Belanja Perjalanan Dinas Dalam Kota' },
  { value: '524114', label: '524114', description: 'Belanja Perjalanan Dinas Paket Meeting' },
  { value: '524119', label: '524119', description: 'Belanja Perjalanan Dinas Lainnya' },
];
