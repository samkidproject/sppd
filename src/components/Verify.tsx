import { useState, useEffect } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { SPPDData } from '../types';
import { ShieldCheck, FileText, User, Calendar, MapPin, CheckCircle, AlertTriangle, Loader2 } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { motion } from 'framer-motion';

export default function Verify() {
  const [data, setData] = useState<SPPDData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const id = params.get('id');
    if (id) {
      loadData(id);
    } else {
      setLoading(false);
      setError(true);
    }
  }, []);

  const loadData = async (id: string) => {
    try {
      const docSnap = await getDoc(doc(db, 'sppd', id));
      if (docSnap.exists()) {
        setData(docSnap.data() as SPPDData);
      } else {
        setError(true);
      }
    } catch (e) {
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-brand-bg flex items-center justify-center p-6">
        <Loader2 className="animate-spin text-brand-primary" size={32} />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-brand-bg flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-white p-10 rounded-3xl border border-red-100 shadow-xl text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <AlertTriangle className="text-red-600" size={32} />
          </div>
          <h1 className="text-xl font-black text-slate-800 mb-2">Verifikasi Gagal</h1>
          <p className="text-sm text-slate-500 mb-6">Dokumen tidak ditemukan atau link tidak valid.</p>
          <a href="/" className="inline-block px-8 py-3 bg-slate-800 text-white rounded-xl text-xs font-black uppercase tracking-widest">Kembali</a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-brand-bg p-6 flex flex-col items-center justify-center gap-8">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-2xl w-full"
      >
        <div className="text-center mb-8">
          <div className="w-20 h-20 bg-brand-success text-white rounded-3xl mx-auto flex items-center justify-center shadow-xl shadow-green-500/20 mb-4 border-4 border-white">
            <CheckCircle size={40} />
          </div>
          <h1 className="text-2xl font-black text-slate-800 tracking-tight">Dokumen Terverifikasi</h1>
          <p className="text-[10px] font-black text-brand-success uppercase tracking-[0.2em] mt-2">Authentic Digital Document</p>
        </div>

        <div className="bg-white rounded-[2.5rem] border border-brand-border shadow-2xl overflow-hidden">
          <div className="bg-slate-50 p-8 border-b border-brand-border flex items-center justify-between">
            <div>
              <p className="text-[10px] font-black text-brand-text-muted uppercase tracking-widest mb-1">Nomor SPPD</p>
              <h2 className="text-lg font-black text-brand-primary">{data.nomorSppd}</h2>
            </div>
            <div className="p-3 bg-white border border-brand-border rounded-2xl">
              <ShieldCheck className="text-brand-primary" size={24} />
            </div>
          </div>

          <div className="p-10 space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="flex gap-4">
                <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center shrink-0">
                  <User className="text-brand-primary" size={20} />
                </div>
                <div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Nama Pegawai</p>
                  <p className="font-black text-slate-800 leading-tight">{data.nama}</p>
                  <p className="text-xs font-bold text-slate-500">NIP. {data.nip}</p>
                </div>
              </div>

              <div className="flex gap-4">
                <div className="w-10 h-10 rounded-xl bg-purple-50 flex items-center justify-center shrink-0">
                  <FileText className="text-purple-600" size={20} />
                </div>
                <div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Jabatan / Golongan</p>
                  <p className="font-black text-slate-800 text-sm leading-tight">{data.jabatan}</p>
                  <p className="text-xs font-bold text-slate-500">{data.pangkatGol}</p>
                </div>
              </div>

              <div className="flex gap-4">
                <div className="w-10 h-10 rounded-xl bg-brand-bg flex items-center justify-center shrink-0">
                  <MapPin className="text-emerald-600" size={20} />
                </div>
                <div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Tujuan / Instansi</p>
                  <p className="font-black text-slate-800 text-sm leading-tight">{data.tujuan}</p>
                  <p className="text-xs font-bold text-slate-500">{data.instansiTujuan}</p>
                </div>
              </div>

              <div className="flex gap-4">
                <div className="w-10 h-10 rounded-xl bg-orange-50 flex items-center justify-center shrink-0">
                  <Calendar className="text-orange-600" size={20} />
                </div>
                <div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Waktu Penugasan</p>
                  <p className="font-black text-slate-800 text-sm leading-tight">
                    {format(parseISO(data.tanggalBerangkat), 'dd MMM')} - {format(parseISO(data.tanggalKembali), 'dd MMM yyyy')}
                  </p>
                  <p className="text-xs font-bold text-slate-500">{data.lamaHari} Hari Kerja</p>
                </div>
              </div>
            </div>

            <div className="pt-8 border-t border-brand-border">
              <div className="bg-slate-50 rounded-2xl p-6 border border-slate-100 italic text-xs text-slate-500 leading-relaxed">
                "Dokumen ini diterbitkan secara elektronik melalui portal SPD Instan dan telah terverifikasi secara digital. Data di atas sesuai dengan arsip yang tersimpan dalam database pemerintahan."
              </div>
            </div>
          </div>
        </div>

        <p className="text-center mt-12 text-[10px] font-black text-slate-300 uppercase tracking-[0.3em]">
          © 2026 SPD Instan - Cepat, praktis, otomatis
        </p>
      </motion.div>
    </div>
  );
}
