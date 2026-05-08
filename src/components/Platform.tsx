import React, { useState, useEffect, useMemo } from 'react';
import { FilePlus, LayoutDashboard, Search, Download, Eye, Trash2, LogOut, Loader2, CheckCircle2, Settings, Save, Info, Phone, ExternalLink } from 'lucide-react';
import { format, differenceInDays, parseISO } from 'date-fns';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../lib/utils';
import { SPPDData, PANGKAT_GOL_OPTIONS, TRANSPORTASI_OPTIONS, AKUN_OPTIONS, OrganizationSettings, Pengikut, AllowedUser, MASTER_ADMIN } from '../types';
import { auth } from '../lib/firebase';
import { signOut } from 'firebase/auth';
import { sppdService } from '../services/sppdService';
import { pdfService } from '../services/pdfService';
import { settingsService } from '../services/settingsService';
import { adminService } from '../services/adminService';

const INITIAL_FORM_DATA: Partial<SPPDData> = {
  nama: '', nip: '', jabatan: '', pangkatGol: '', maksudPerjalanan: '', tujuan: '',
  tanggalBerangkat: format(new Date(), 'yyyy-MM-dd'), tanggalKembali: format(new Date(), 'yyyy-MM-dd'),
  transportasi: TRANSPORTASI_OPTIONS[0], tempatBerangkat: '', instansiTujuan: '', 
  pejabatPenandatangan: '', pembebananAnggaran: '', akun: '', pengikut: []
};

export default function Platform() {
  const [view, setView] = useState<'dashboard' | 'form' | 'settings' | 'users' | 'about'>('dashboard');
  const [data, setData] = useState<SPPDData[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<{message: string, url?: string} | null>(null);
  const [isAuthorized, setIsAuthorized] = useState<boolean | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<{ id: string, type: 'sppd' | 'user' } | null>(null);
  const [allowedUsers, setAllowedUsers] = useState<AllowedUser[]>([]);
  const [newEmail, setNewEmail] = useState('');
  const [formData, setFormData] = useState<Partial<SPPDData>>(INITIAL_FORM_DATA);
  const [orgSettings, setOrgSettings] = useState<OrganizationSettings>({
    instansiPusat: '', satuanKerja: '', alamat: '', lokasiPenandatanganan: '',
    ppkNama: '', ppkNip: '', ppkJabatan: '',
    kepalaNama: '', kepalaNip: '', kepalaJabatan: ''
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isPreviewLoading, setIsPreviewLoading] = useState(false);

  useEffect(() => { 
    checkAuth();
    load();
    loadSettings();
  }, []);

  const checkAuth = async () => {
    const allowed = await adminService.isAllowed(auth.currentUser?.email);
    setIsAuthorized(allowed);
  };

  const load = async () => { 
    setIsLoading(true); 
    setLoadError(null);
    try {
      setData(await sppdService.getAllSPPD()); 
      setEditingId(null);
      if (auth.currentUser?.email === MASTER_ADMIN) {
        setAllowedUsers(await adminService.getAllowedUsers());
      }
    } catch (err: any) {
      console.error('Load error:', err);
      try {
        const info = JSON.parse(err.message);
        setLoadError({ message: info.error, url: info.indexUrl });
      } catch {
        setLoadError({ message: err.message || 'Gagal memuat data' });
      }
    } finally {
      setIsLoading(false); 
    }
  };
  const loadSettings = async () => {
    const s = await settingsService.getSettings();
    if (s) {
      setOrgSettings(s);
      setFormData(prev => ({ ...prev, pejabatPenandatangan: s.ppkJabatan || '' }));
    }
  };

  const handlePreview = async (base64OrUrl: string) => {
    setIsPreviewLoading(true);
    setPreviewUrl(null); // Clear previous
    
    try {
      if (base64OrUrl.startsWith('data:application/pdf;base64,')) {
        const base64 = base64OrUrl.split(',')[1];
        const bin = atob(base64);
        const arr = new Uint8Array(bin.length);
        for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
        const blob = new Blob([arr], { type: 'application/pdf' });
        const url = URL.createObjectURL(blob);
        setPreviewUrl(url);
      } else {
        setPreviewUrl(base64OrUrl);
      }
    } catch (e) {
      console.error('Preview error:', e);
      setPreviewUrl(base64OrUrl);
    } finally {
      setIsPreviewLoading(false);
    }
  };

  useEffect(() => {
    return () => {
      if (previewUrl && previewUrl.startsWith('blob:')) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);
  const extractDobFromNip = (nip: string) => {
    if (nip.length >= 8) {
      const year = nip.substring(0, 4);
      const month = nip.substring(4, 6);
      const day = nip.substring(6, 8);
      return `${day}-${month}-${year}`;
    }
    return '';
  };

  const addPengikut = () => {
    const newPengikut = { nama: '', nip: '', pangkatGol: '', tanggalLahir: '', keterangan: '' };
    setFormData({ ...formData, pengikut: [...(formData.pengikut || []), newPengikut] });
  };

  const removePengikut = (index: number) => {
    const next = [...(formData.pengikut || [])];
    next.splice(index, 1);
    setFormData({ ...formData, pengikut: next });
  };

  const updatePengikut = (index: number, field: keyof Pengikut, value: string) => {
    const next = [...(formData.pengikut || [])];
    next[index] = { ...next[index], [field]: value };
    if (field === 'nip') {
      next[index].tanggalLahir = extractDobFromNip(value);
    }
    setFormData({ ...formData, pengikut: next });
  };

  const calcDays = () => {
    if (formData.tanggalBerangkat && formData.tanggalKembali) {
      const d = differenceInDays(parseISO(formData.tanggalKembali), parseISO(formData.tanggalBerangkat)) + 1;
      return d > 0 ? d : 0;
    } return 0;
  };
  const validate = () => {
    console.log('Validating form data:', formData);
    const e: Record<string, string> = {};
    
    const nama = formData.nama?.trim();
    if (!nama) e.nama = 'Nama wajib diisi'; 
    
    // NIP can be empty for some users, but if provided should be basic check
    const nip = formData.nip?.trim();
    if (!nip) e.nip = 'NIP wajib diisi';
    
    if (!formData.jabatan?.trim()) e.jabatan = 'Jabatan wajib diisi'; 
    if (!formData.maksudPerjalanan?.trim()) e.maksudPerjalanan = 'Maksud perjalanan wajib diisi';
    if (!formData.tujuan?.trim()) e.tujuan = 'Kota tujuan wajib diisi'; 
    
    const days = calcDays();
    if (days <= 0) e.tanggalKembali = 'Tanggal kembali tidak valid (minimal 1 hari)';
    
    setErrors(e); 
    const isValid = Object.keys(e).length === 0;
    if (!isValid) {
      console.warn('Validation failed fields:', Object.keys(e));
      alert('Mohon lengkapi: ' + Object.values(e).join(', '));
    }
    return isValid;
  };

  const saveConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await settingsService.saveSettings(orgSettings);
      alert('Pengaturan Tersimpan!');
    } catch (err) {
      alert('Gagal menyimpan.');
    } finally { setIsSubmitting(false); }
  };
  
  const handleEdit = (item: SPPDData) => {
    setFormData({
      nama: item.nama,
      nip: item.nip,
      jabatan: item.jabatan,
      pangkatGol: item.pangkatGol,
      maksudPerjalanan: item.maksudPerjalanan,
      tujuan: item.tujuan,
      tanggalBerangkat: item.tanggalBerangkat,
      tanggalKembali: item.tanggalKembali,
      transportasi: item.transportasi,
      tempatBerangkat: item.tempatBerangkat,
      instansiTujuan: item.instansiTujuan,
      pejabatPenandatangan: item.pejabatPenandatangan,
      pembebananAnggaran: item.pembebananAnggaran,
      akun: item.akun || '',
      pengikut: item.pengikut || [],
    });
    setEditingId(item.id);
    setView('form');
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault(); if (!validate()) return;
    setIsSubmitting(true);
    try {
      const docId = editingId || (typeof crypto.randomUUID === 'function' ? crypto.randomUUID() : Math.random().toString(36).substring(2) + Date.now().toString(36));
      
      let currentNomor = '';
      if (editingId) {
        const existing = data.find(i => i.id === editingId);
        currentNomor = existing?.nomorSppd || '';
      } else {
        currentNomor = await sppdService.getNextNomorSppd();
        if (!currentNomor) {
          throw new Error('Gagal mendapatkan nomor SPPD otomatis. Silakan coba lagi.');
        }
      }
      
      const fullData = { ...formData, nomorSppd: currentNomor, lamaHari: calcDays() };
      console.log('Generating PDF for:', currentNomor);
      const b = await pdfService.generateSPPD(fullData, docId, orgSettings);
      
      console.log('Saving SPPD to Firestore...');
      await sppdService.saveSPPD(fullData as Partial<SPPDData>, b, docId, currentNomor);
      
      await load(); 
      alert(editingId ? 'SPPD Berhasil Diperbarui' : 'SPPD Berhasil Dibuat dengan Nomor: ' + currentNomor);
      setView('dashboard');
      setEditingId(null);
    } catch (err: any) {
      console.error('GENERATE ERROR:', err);
      alert('Gagal membuat SPPD: ' + (err.message || 'Error tidak diketahui'));
    } finally { setIsSubmitting(false); }
  };
  const del = (id: string) => setConfirmDelete({ id, type: 'sppd' });
  const handleRemoveUser = (id: string) => setConfirmDelete({ id, type: 'user' });

  const processDelete = async () => {
    if (!confirmDelete) return;
    setIsSubmitting(true);
    try {
      if (confirmDelete.type === 'sppd') {
        await sppdService.deleteSPPD(confirmDelete.id);
        await load();
      } else {
        await adminService.removeAllowedUser(confirmDelete.id);
        setAllowedUsers(await adminService.getAllowedUsers());
      }
      setConfirmDelete(null);
    } catch (err: any) {
      console.error('Delete error:', err);
      alert('Gagal menghapus: ' + (err.message || 'Error tidak diketahui'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEmail) return;
    setIsSubmitting(true);
    try {
      await adminService.addAllowedUser(newEmail);
      setNewEmail('');
      setAllowedUsers(await adminService.getAllowedUsers());
    } catch (e) {
      alert('Gagal menambah user');
    } finally { setIsSubmitting(false); }
  };

  const filtered = useMemo(() => data.filter(i => i.nama.toLowerCase().includes(searchTerm.toLowerCase()) || i.nomorSppd.includes(searchTerm)), [data, searchTerm]);

  if (isAuthorized === false) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-brand-bg flex-col gap-6">
        <div className="w-20 h-20 bg-red-50 text-red-500 rounded-3xl flex items-center justify-center shadow-xl">
          <LogOut size={32} />
        </div>
        <div className="text-center">
          <h1 className="text-2xl font-black text-slate-800 uppercase tracking-tighter">Akses Dibatasi</h1>
          <p className="text-slate-400 font-bold text-sm max-w-xs mt-2">Akun Anda ({auth.currentUser?.email}) belum memiliki izin untuk mengakses sistem ini.</p>
          <div className="mt-4 p-6 bg-slate-50 border border-slate-100 rounded-3xl text-center max-w-sm shadow-sm">
            <p className="text-brand-primary font-black text-[10px] uppercase tracking-widest mb-2">Support Developer</p>
            <p className="text-slate-500 text-xs font-bold leading-relaxed mb-4">Kalau cocok sama aplikasinya, boleh traktir dulu ya ☕ biar makin maksimal pakainya</p>
            <a 
              href="https://teer.id/samkid_project" 
              target="_blank" 
              rel="noreferrer"
              className="inline-flex items-center gap-2 px-6 py-3 bg-brand-primary text-white rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-brand-accent transition-all shadow-lg shadow-brand-primary/20 active:scale-95 group"
            >
              Traktir Samkid Project <ExternalLink size={12} className="ml-1" />
            </a>
          </div>
        </div>
        <button onClick={() => signOut(auth)} className="px-8 py-3 bg-slate-200 text-slate-600 rounded-xl font-black text-xs uppercase tracking-widest hover:bg-slate-300 transition-all active:scale-95">Keluar</button>
      </div>
    );
  }

  if (isAuthorized === null) {
    return <div className="h-screen w-full flex items-center justify-center opacity-40"><Loader2 size={32} className="animate-spin text-brand-primary"/></div>;
  }

  return (
    <div className="flex h-screen bg-brand-bg font-sans text-brand-text-main overflow-hidden">
      <aside className="w-64 bg-brand-sidebar flex flex-col h-full shadow-2xl z-40">
        <div className="px-8 py-10 flex items-center gap-3">
          <div className="w-10 h-10 bg-brand-accent rounded-xl flex items-center justify-center text-white font-black">SP</div>
          <div className="flex flex-col"><span className="text-white font-black text-xl">SPD Instan</span><span className="text-[8px] text-slate-400 font-bold tracking-widest uppercase tracking-widest">Cepat, praktis, otomatis</span></div>
        </div>
        <nav className="flex-1 px-4 space-y-1">
          <button onClick={() => setView('dashboard')} className={cn("flex w-full items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all", view === 'dashboard' ? "bg-brand-accent text-white shadow-lg" : "text-slate-400 hover:text-white hover:bg-slate-800")}><LayoutDashboard size={18}/> Dashboard</button>
          <button onClick={() => { setView('form'); setEditingId(null); setFormData({ ...INITIAL_FORM_DATA, pejabatPenandatangan: orgSettings.ppkJabatan || '' }); }} className={cn("flex w-full items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all", view === 'form' ? "bg-brand-accent text-white shadow-lg" : "text-slate-400 hover:text-white hover:bg-slate-800")}><FilePlus size={18}/> Buat Baru</button>
          <button onClick={() => setView('settings')} className={cn("flex w-full items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all", view === 'settings' ? "bg-brand-accent text-white shadow-lg" : "text-slate-400 hover:text-white hover:bg-slate-800")}><Settings size={18}/> Pengaturan</button>
          {auth.currentUser?.email === MASTER_ADMIN && (
            <button onClick={() => setView('users')} className={cn("flex w-full items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all", view === 'users' ? "bg-brand-accent text-white shadow-lg" : "text-slate-400 hover:text-white hover:bg-slate-800")}><Search size={18}/> User Management</button>
          )}
          <div className="pt-4 mt-4 border-t border-slate-800/50">
            <button onClick={() => setView('about')} className={cn("flex w-full items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all", view === 'about' ? "bg-brand-accent text-white shadow-lg" : "text-slate-400 hover:text-white hover:bg-slate-800")}><Info size={18}/> Tentang Aplikasi</button>
          </div>
        </nav>
        <div className="px-6 py-4 flex flex-col gap-4">
          <button onClick={() => signOut(auth)} className="flex w-full items-center gap-3 px-4 py-3 text-sm font-bold text-red-400 hover:bg-red-500/20 rounded-xl transition-all border border-red-400/20"><LogOut size={18}/> Keluar</button>
          <div className="text-center">
            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">&copy; Samkid Project 2026</p>
          </div>
        </div>
      </aside>
      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="h-20 bg-white border-b border-brand-border flex items-center justify-between px-10">
          <div><h2 className="font-black text-xl text-brand-text-main tracking-tight uppercase">{view === 'dashboard' ? 'Dashboard' : view === 'form' ? 'Buat Baru' : view === 'settings' ? 'Pengaturan' : view === 'about' ? 'Tentang Aplikasi' : 'Admin Control Panel'}</h2><p className="text-[10px] text-brand-text-muted font-bold tracking-widest">SPD INSTAN - CEPAT, PRAKTIS, OTOMATIS</p></div>
          <div className="flex items-center gap-4 text-right">
            <div><p className="text-sm font-black leading-tight">{auth.currentUser?.displayName}</p><p className="text-[9px] text-brand-text-muted font-bold tracking-widest uppercase">{auth.currentUser?.email === MASTER_ADMIN ? 'Super Admin' : 'Administrator'}</p></div>
            <img referrerPolicy="no-referrer" src={auth.currentUser?.photoURL || ''} className="w-12 h-12 rounded-2xl border-2 border-brand-border" alt="Profile" />
          </div>
        </header>
        <main className="flex-1 overflow-y-auto p-10 bg-[#FAFBFE]">
          {isLoading ? (
            <div className="h-full flex items-center justify-center opacity-40"><Loader2 size={32} className="animate-spin text-brand-primary"/></div>
          ) : (
            <AnimatePresence mode="wait">
              {view === 'dashboard' && (
                <motion.div key="dash" initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} className="space-y-8">
                  <div className="flex items-center justify-between">
                    <h3 className="font-black text-brand-text-main">Terakhir Ditambahkan</h3>
                    <div className="relative"><Search className="absolute left-4 top-1/2 -translate-y-1/2 text-brand-text-muted" size={14}/><input value={searchTerm} onChange={e => setSearchTerm(e.target.value)} placeholder="Cari..." className="bg-white pl-10 pr-4 py-2 rounded-xl text-xs font-bold ring-1 ring-brand-border focus:ring-2 focus:ring-brand-primary outline-none w-64"/></div>
                  </div>
                  {loadError && (
                    <div className="bg-red-50 border border-red-100 rounded-2xl p-6 text-red-600">
                      <div className="flex gap-4">
                        <div className="w-10 h-10 bg-red-100 rounded-xl flex items-center justify-center shrink-0"><Info size={20}/></div>
                        <div>
                          <h4 className="font-black text-sm uppercase tracking-tight mb-1">Terjadi Kesalahan Database</h4>
                          <p className="text-xs opacity-80 leading-relaxed mb-4">{loadError.message}</p>
                          {loadError.url && (
                            <div className="space-y-3">
                              <p className="text-[10px] font-black uppercase text-red-500">Tindakan Diperlukan:</p>
                              <a 
                                href={loadError.url} 
                                target="_blank" 
                                rel="noreferrer" 
                                className="inline-flex items-center gap-2 px-6 py-2.5 bg-red-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-red-700 transition-all shadow-lg shadow-red-500/20"
                              >
                                Buat Index Firestore Sekarang <ExternalLink size={12}/>
                              </a>
                              <p className="text-[9px] text-red-400 mt-2 italic">*Klik tombol di atas untuk memperbaiki error ini di Firebase Console Anda.</p>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                  <div className="bg-white rounded-[2rem] border border-brand-border shadow-sm overflow-hidden">
                    <table className="w-full text-left">
                      <thead className="bg-slate-50 text-[10px] font-black text-brand-text-muted uppercase tracking-widest">
                        <tr><th className="px-8 py-4">Nomor</th><th className="px-8 py-4">Pegawai</th><th className="px-8 py-4">Tujuan</th><th className="px-8 py-4 text-right">Aksi</th></tr>
                      </thead>
                      <tbody className="divide-y divide-brand-border">
                        {filtered.map(i => (
                          <tr key={i.id} className="hover:bg-slate-50/50 group transition-colors text-sm">
                            <td className="px-8 py-4 font-black text-brand-primary">{i.nomorSppd}</td>
                            <td className="px-8 py-4"><div><p className="font-black">{i.nama}</p><p className="text-[10px] text-slate-400">NIP. {i.nip}</p></div></td>
                            <td className="px-8 py-4"><span className="text-[10px] font-bold bg-slate-100 px-2 py-1 rounded-full">{i.tujuan}</span></td>
                            <td className="px-8 py-4 text-right">
                              <div className="flex justify-end gap-2">
                                <button title="Preview" onClick={() => i.pdfUrl && handlePreview(i.pdfUrl)} className="p-2 bg-slate-100 text-slate-600 rounded-lg hover:bg-brand-primary hover:text-white transition-all shadow-sm"><Eye size={14}/></button>
                                <button title="Edit" onClick={() => handleEdit(i)} className="p-2 bg-slate-100 text-slate-600 rounded-lg hover:bg-amber-500 hover:text-white transition-all shadow-sm"><Settings size={14}/></button>
                                <a title="Download" href={i.pdfUrl} target="_blank" rel="noreferrer" className="p-2 bg-slate-100 text-slate-600 rounded-lg hover:bg-emerald-500 hover:text-white transition-all shadow-sm"><Download size={14}/></a>
                                <button title="Hapus" onClick={() => del(i.id)} className="p-2 bg-slate-100 text-slate-600 rounded-lg hover:bg-red-500 hover:text-white transition-all shadow-sm"><Trash2 size={14}/></button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </motion.div>
              )}

              {view === 'form' && (
                <motion.div key="form" initial={{opacity:0,y:20}} animate={{opacity:1,y:0}} exit={{opacity:0,y:20}} className="max-w-3xl mx-auto bg-white rounded-[2.5rem] border border-brand-border shadow-xl p-10 overflow-hidden">
                    <div className="mb-8">
                      <h3 className="font-black text-2xl text-slate-800 tracking-tight">{editingId ? 'Edit Data SPPD' : 'Buat SPPD Baru'}</h3>
                      <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mt-1">Lengkapi formulir di bawah ini dengan benar</p>
                    </div>
                    <form onSubmit={submit} className="space-y-6">
                    <div className="grid grid-cols-2 gap-6">
                      <div className="space-y-1"><label className="text-[9px] font-black text-slate-400 uppercase ml-2">Nama</label><input value={formData.nama || ''} onChange={e => setFormData({...formData, nama: e.target.value})} className="w-full bg-brand-bg rounded-xl py-3 px-4 text-sm font-bold outline-none ring-1 ring-brand-border focus:ring-brand-primary"/></div>
                      <div className="space-y-1"><label className="text-[9px] font-black text-slate-400 uppercase ml-2">NIP</label><input value={formData.nip || ''} onChange={e => setFormData({...formData, nip: e.target.value})} className="w-full bg-brand-bg rounded-xl py-3 px-4 text-sm font-bold outline-none ring-1 ring-brand-border focus:ring-brand-primary"/></div>
                      <div className="space-y-1"><label className="text-[9px] font-black text-slate-400 uppercase ml-2">Jabatan</label><input value={formData.jabatan || ''} onChange={e => setFormData({...formData, jabatan: e.target.value})} className="w-full bg-brand-bg rounded-xl py-3 px-4 text-sm font-bold outline-none ring-1 ring-brand-border focus:ring-brand-primary"/></div>
                      <div className="space-y-1"><label className="text-[9px] font-black text-slate-400 uppercase ml-2">Pangkat / Golongan</label><input value={formData.pangkatGol || ''} onChange={e => setFormData({...formData, pangkatGol: e.target.value})} className="w-full bg-brand-bg rounded-xl py-3 px-4 text-sm font-bold outline-none ring-1 ring-brand-border focus:ring-brand-primary" placeholder="Contoh: Pembina / IV-a"/></div>
                      <div className="col-span-2 space-y-1"><label className="text-[9px] font-black text-slate-400 uppercase ml-2">Maksud Perjalanan</label><textarea value={formData.maksudPerjalanan || ''} onChange={e => setFormData({...formData, maksudPerjalanan: e.target.value})} className="w-full bg-brand-bg rounded-xl py-3 px-4 text-sm font-bold outline-none ring-1 ring-brand-border min-h-[80px]"/></div>
                      
                      <div className="space-y-1">
                        <label className="text-[9px] font-black text-slate-400 uppercase ml-2">Alat Angkut</label>
                        <select value={formData.transportasi || ''} onChange={e => setFormData({...formData, transportasi: e.target.value})} className="w-full bg-brand-bg rounded-xl py-3 px-4 text-sm font-bold outline-none ring-1 ring-brand-border">
                          {TRANSPORTASI_OPTIONS.map(opt => <option key={opt}>{opt}</option>)}
                        </select>
                      </div>
                      <div className="space-y-1"><label className="text-[9px] font-black text-slate-400 uppercase ml-2">Tempat Berangkat</label><input value={formData.tempatBerangkat || ''} onChange={e => setFormData({...formData, tempatBerangkat: e.target.value})} className="w-full bg-brand-bg rounded-xl py-3 px-4 text-sm font-bold outline-none ring-1 ring-brand-border"/></div>
                      <div className="space-y-1"><label className="text-[9px] font-black text-slate-400 uppercase ml-2">Berangkat</label><input type="date" value={formData.tanggalBerangkat || ''} onChange={e => setFormData({...formData, tanggalBerangkat: e.target.value})} className="w-full bg-brand-bg rounded-xl py-3 px-4 text-sm font-bold outline-none ring-1 ring-brand-border"/></div>
                      <div className="space-y-1"><label className="text-[9px] font-black text-slate-400 uppercase ml-2">Kembali</label><input type="date" value={formData.tanggalKembali || ''} onChange={e => setFormData({...formData, tanggalKembali: e.target.value})} className="w-full bg-brand-bg rounded-xl py-3 px-4 text-sm font-bold outline-none ring-1 ring-brand-border"/></div>
                      <div className="space-y-1"><label className="text-[9px] font-black text-slate-400 uppercase ml-2">Kota Tujuan</label><input value={formData.tujuan || ''} onChange={e => setFormData({...formData, tujuan: e.target.value})} className="w-full bg-brand-bg rounded-xl py-3 px-4 text-sm font-bold outline-none ring-1 ring-brand-border"/></div>
                      <div className="space-y-1"><label className="text-[9px] font-black text-slate-400 uppercase ml-2">Instansi Tujuan</label><input value={formData.instansiTujuan || ''} onChange={e => setFormData({...formData, instansiTujuan: e.target.value})} className="w-full bg-brand-bg rounded-xl py-3 px-4 text-sm font-bold outline-none ring-1 ring-brand-border"/></div>
                      
                      <div className="col-span-2 space-y-1"><label className="text-[9px] font-black text-slate-400 uppercase ml-2">Pembebanan Anggaran</label><input placeholder="Contoh: APBD Dinas Pendidikan 2024" value={formData.pembebananAnggaran || ''} onChange={e => setFormData({...formData, pembebananAnggaran: e.target.value})} className="w-full bg-brand-bg rounded-xl py-3 px-4 text-sm font-bold outline-none ring-1 ring-brand-border"/></div>
                      <div className="col-span-2 space-y-1">
                        <label className="text-[9px] font-black text-slate-400 uppercase ml-2">Mata Anggaran / Akun</label>
                        <select 
                          value={formData.akun || ''} 
                          onChange={e => setFormData({...formData, akun: e.target.value})} 
                          className="w-full bg-brand-bg rounded-xl py-3 px-4 text-sm font-bold outline-none ring-1 ring-brand-border appearance-none cursor-pointer"
                        >
                          {AKUN_OPTIONS.map(opt => (
                            <option key={opt.value} value={opt.value}>{opt.label}</option>
                          ))}
                        </select>
                        {formData.akun && (
                          <div className="flex items-center gap-2 mt-1 ml-2">
                            <Info size={10} className="text-brand-primary" />
                            <p className="text-[10px] font-bold text-slate-500 italic">
                              {AKUN_OPTIONS.find(opt => opt.value === formData.akun)?.description}
                            </p>
                          </div>
                        )}
                      </div>

                    </div>

                    <div className="mt-8 pt-8 border-t">
                      <div className="flex items-center justify-between mb-4">
                        <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Daftar Pengikut</h4>
                        <button type="button" onClick={addPengikut} className="px-4 py-2 border-2 border-brand-primary text-brand-primary rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-brand-primary hover:text-white transition-all">+ Tambah</button>
                      </div>
                      <div className="space-y-4">
                        {formData.pengikut?.map((p, idx) => (
                          <div key={idx} className="bg-slate-50 p-6 rounded-[2rem] border border-slate-100 relative group">
                            <button type="button" onClick={() => removePengikut(idx)} className="absolute top-4 right-4 text-slate-300 hover:text-red-500 transition-colors"><Trash2 size={16}/></button>
                            <div className="grid grid-cols-2 gap-4">
                              <div className="space-y-1"><label className="text-[8px] font-black text-slate-400 uppercase ml-2">Nama</label><input value={p.nama || ''} onChange={e => updatePengikut(idx, 'nama', e.target.value)} className="w-full bg-white rounded-xl py-2 px-3 text-xs font-bold outline-none ring-1 ring-border"/></div>
                              <div className="space-y-1"><label className="text-[8px] font-black text-slate-400 uppercase ml-2">NIP</label><input value={p.nip || ''} onChange={e => updatePengikut(idx, 'nip', e.target.value)} className="w-full bg-white rounded-xl py-2 px-3 text-xs font-bold outline-none ring-1 ring-border"/></div>
                              <div className="space-y-1"><label className="text-[8px] font-black text-slate-400 uppercase ml-2">Pangkat/Gol</label><input value={p.pangkatGol || ''} onChange={e => updatePengikut(idx, 'pangkatGol', e.target.value)} className="w-full bg-white rounded-xl py-2 px-3 text-xs font-bold outline-none ring-1 ring-border"/></div>
                              <div className="space-y-1"><label className="text-[8px] font-black text-slate-400 uppercase ml-2">Tgl Lahir (Auto)</label><input value={p.tanggalLahir || ''} className="w-full bg-slate-100 cursor-not-allowed rounded-xl py-2 px-3 text-xs font-bold outline-none ring-1 ring-border" readOnly/></div>
                            </div>
                          </div>
                        ))}
                        {(!formData.pengikut || formData.pengikut.length === 0) && (
                          <div className="py-10 text-center text-slate-300 font-bold border-2 border-dashed border-slate-100 rounded-[2rem] text-xs uppercase tracking-widest">Tidak ada pengikut</div>
                        )}
                      </div>
                    </div>

                    <div className="pt-8 border-t flex justify-between items-center">
                      <div className="flex items-center gap-2 text-[10px] font-black text-brand-text-muted"><CheckCircle2 size={12}/> HARI PENUGASAN: {calcDays()}</div>
                      <div className="flex gap-4">
                        <button type="button" onClick={() => { setView('dashboard'); setEditingId(null); }} className="px-6 py-3 rounded-xl border text-xs font-black uppercase text-slate-400 transition-all active:scale-95">Batal</button>
                        <button type="submit" disabled={isSubmitting} className={cn("px-10 py-3 bg-brand-primary text-white rounded-xl text-xs font-black uppercase tracking-widest shadow-lg shadow-blue-500/20 active:scale-95 transition-all flex items-center gap-2", isSubmitting && "opacity-50 pointer-events-none")}>
                          {isSubmitting ? <Loader2 size={14} className="animate-spin"/> : editingId ? <Save size={14}/> : <Download size={14}/>}
                          {editingId ? 'SIMPAN PERUBAHAN' : 'GENERATE PROSES'}
                        </button>
                      </div>
                    </div>
                  </form>
                </motion.div>
              )}

              {view === 'settings' && (
                <motion.div key="settings" initial={{opacity:0,y:20}} animate={{opacity:1,y:0}} exit={{opacity:0,y:20}} className="max-w-3xl mx-auto bg-white rounded-[2.5rem] border border-brand-border shadow-xl p-10 overflow-hidden">
                  <div className="mb-8">
                    <h3 className="font-black text-xl text-slate-800">Pengaturan Instansi</h3>
                    <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">Sesuaikan detail satuan kerja & penandatangan</p>
                  </div>
                  <form onSubmit={saveConfig} className="space-y-6">
                    <div className="grid grid-cols-2 gap-6 pb-8 border-b">
                      <div className="col-span-2">
                        <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-brand-primary mb-4">A. Informasi Instansi</h4>
                      </div>
                      <div className="col-span-2 space-y-1"><label className="text-[9px] font-black text-slate-400 uppercase ml-2">Nama Instansi Pusat</label><input value={orgSettings.instansiPusat || ''} onChange={e => setOrgSettings({...orgSettings, instansiPusat: e.target.value})} className="w-full bg-brand-bg rounded-xl py-3 px-4 text-sm font-bold outline-none ring-1 ring-brand-border" placeholder="Contoh: KEMENTERIAN PENDIDIKAN DAN KEBUDAYAAN"/></div>
                      <div className="col-span-2 space-y-1"><label className="text-[9px] font-black text-slate-400 uppercase ml-2">Nama Satuan Kerja</label><input value={orgSettings.satuanKerja || ''} onChange={e => setOrgSettings({...orgSettings, satuanKerja: e.target.value})} className="w-full bg-brand-bg rounded-xl py-3 px-4 text-sm font-bold outline-none ring-1 ring-brand-border" placeholder="Contoh: DINAS PENDIDIKAN PROVINSI..."/></div>
                      <div className="col-span-2 space-y-1"><label className="text-[9px] font-black text-slate-400 uppercase ml-2">Alamat Instansi</label><input value={orgSettings.alamat || ''} onChange={e => setOrgSettings({...orgSettings, alamat: e.target.value})} className="w-full bg-brand-bg rounded-xl py-3 px-4 text-sm font-bold outline-none ring-1 ring-brand-border"/></div>
                      <div className="col-span-2 space-y-1"><label className="text-[9px] font-black text-slate-400 uppercase ml-2">Lokasi Penandatanganan</label><input value={orgSettings.lokasiPenandatanganan || ''} onChange={e => setOrgSettings({...orgSettings, lokasiPenandatanganan: e.target.value})} className="w-full bg-brand-bg rounded-xl py-3 px-4 text-sm font-bold outline-none ring-1 ring-brand-border" placeholder="Contoh: Bandar Lampung"/></div>
                    </div>

                    <div className="grid grid-cols-2 gap-6 pt-8 pb-8 border-b">
                      <div className="col-span-2">
                        <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-brand-primary mb-4">B. Pejabat Pembuat Komitmen (PPK)</h4>
                      </div>
                      <div className="space-y-1"><label className="text-[9px] font-black text-slate-400 uppercase ml-2">Nama PPK</label><input value={orgSettings.ppkNama || ''} onChange={e => setOrgSettings({...orgSettings, ppkNama: e.target.value})} className="w-full bg-brand-bg rounded-xl py-3 px-4 text-sm font-bold outline-none ring-1 ring-brand-border"/></div>
                      <div className="space-y-1"><label className="text-[9px] font-black text-slate-400 uppercase ml-2">NIP PPK</label><input value={orgSettings.ppkNip || ''} onChange={e => setOrgSettings({...orgSettings, ppkNip: e.target.value})} className="w-full bg-brand-bg rounded-xl py-3 px-4 text-sm font-bold outline-none ring-1 ring-brand-border"/></div>
                      <div className="space-y-1"><label className="text-[9px] font-black text-slate-400 uppercase ml-2">Jabatan PPK</label><input value={orgSettings.ppkJabatan || ''} onChange={e => setOrgSettings({...orgSettings, ppkJabatan: e.target.value})} className="w-full bg-brand-bg rounded-xl py-3 px-4 text-sm font-bold outline-none ring-1 ring-brand-border" placeholder="Contoh: Pejabat Pembuat Komitmen"/></div>
                    </div>

                    <div className="grid grid-cols-2 gap-6 pt-8">
                      <div className="col-span-2">
                        <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-brand-primary mb-4">C. Kepala Kantor / Satuan Kerja</h4>
                      </div>
                      <div className="space-y-1"><label className="text-[9px] font-black text-slate-400 uppercase ml-2">Nama Kepala</label><input value={orgSettings.kepalaNama || ''} onChange={e => setOrgSettings({...orgSettings, kepalaNama: e.target.value})} className="w-full bg-brand-bg rounded-xl py-3 px-4 text-sm font-bold outline-none ring-1 ring-brand-border"/></div>
                      <div className="space-y-1"><label className="text-[9px] font-black text-slate-400 uppercase ml-2">NIP Kepala</label><input value={orgSettings.kepalaNip || ''} onChange={e => setOrgSettings({...orgSettings, kepalaNip: e.target.value})} className="w-full bg-brand-bg rounded-xl py-3 px-4 text-sm font-bold outline-none ring-1 ring-brand-border"/></div>
                      <div className="space-y-1"><label className="text-[9px] font-black text-slate-400 uppercase ml-2">Jabatan Kepala</label><input value={orgSettings.kepalaJabatan || ''} onChange={e => setOrgSettings({...orgSettings, kepalaJabatan: e.target.value})} className="w-full bg-brand-bg rounded-xl py-3 px-4 text-sm font-bold outline-none ring-1 ring-brand-border" placeholder="Contoh: Kepala Sekolah"/></div>
                    </div>
                    <div className="pt-6 border-t flex justify-end">
                      <button type="submit" disabled={isSubmitting} className={cn("px-10 py-3 bg-brand-accent text-white rounded-xl text-xs font-black uppercase tracking-widest shadow-lg active:scale-95 transition-all flex items-center gap-2", isSubmitting && "opacity-50 cursor-not-allowed")}>
                        {isSubmitting ? <Loader2 size={14} className="animate-spin"/> : <Save size={14}/>} Simpan Perubahan
                      </button>
                    </div>
                  </form>
                </motion.div>
              )}

              {view === 'users' && auth.currentUser?.email === MASTER_ADMIN && (
                <motion.div key="users" initial={{opacity:0,y:20}} animate={{opacity:1,y:0}} exit={{opacity:0,y:20}} className="max-w-3xl mx-auto space-y-6">
                  <div className="bg-white rounded-[2.5rem] border border-brand-border shadow-xl p-10 overflow-hidden">
                    <div className="mb-8">
                      <h3 className="font-black text-xl text-slate-800">User Management</h3>
                      <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">Tambah atau hapus akun Google yang diizinkan</p>
                    </div>
                    
                    <form onSubmit={handleAddUser} className="flex gap-4 mb-10">
                      <input 
                        type="email" 
                        required 
                        value={newEmail} 
                        onChange={e => setNewEmail(e.target.value)}
                        placeholder="Masukkan alamat email Google..." 
                        className="flex-1 bg-brand-bg rounded-xl py-3 px-4 text-sm font-bold outline-none ring-1 ring-brand-border focus:ring-brand-primary"
                      />
                      <button type="submit" disabled={isSubmitting} className="px-8 py-3 bg-brand-primary text-white rounded-xl text-xs font-black uppercase tracking-widest shadow-lg active:scale-95 transition-all disabled:opacity-50">
                        Tambah User
                      </button>
                    </form>

                    <div className="space-y-3">
                      <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-4 px-2">Daftar User Aktif</h4>
                      {allowedUsers.map(u => (
                        <div key={u.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100 group transition-all hover:border-brand-primary/20">
                          <div>
                            <p className="text-sm font-black text-slate-700">{u.email}</p>
                            <p className="text-[9px] text-slate-400 font-bold uppercase">Ditambahkan pada: {format(parseISO(u.addedAt), 'dd MMM yyyy HH:mm')}</p>
                          </div>
                          <button onClick={() => u.id && handleRemoveUser(u.id)} className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all">
                            <Trash2 size={16} />
                          </button>
                        </div>
                      ))}
                      {allowedUsers.length === 0 && (
                        <div className="py-10 text-center text-slate-300 font-bold border-2 border-dashed border-slate-100 rounded-3xl text-sm italic">Belum ada user yang ditambahkan</div>
                      )}
                    </div>
                  </div>
                </motion.div>
              )}

              {view === 'about' && (
                <motion.div key="about" initial={{opacity:0,y:20}} animate={{opacity:1,y:0}} exit={{opacity:0,y:20}} className="max-w-4xl mx-auto space-y-10 pb-20">
                  <div className="bg-white rounded-[3rem] shadow-2xl shadow-slate-200/50 border border-slate-100 overflow-hidden">
                    <div className="relative h-64 bg-slate-900 flex items-center justify-center overflow-hidden">
                      <div className="absolute inset-0 bg-gradient-to-br from-brand-primary/20 to-brand-accent/20"></div>
                      <div className="z-10 text-center">
                        <div className="w-24 h-24 bg-white/10 backdrop-blur-xl rounded-4xl flex items-center justify-center mx-auto mb-6 border border-white/20 shadow-2xl">
                          <span className="text-white font-black text-4xl tracking-tighter">SP</span>
                        </div>
                        <h2 className="text-white text-3xl font-black tracking-tight uppercase">SPD INSTAN</h2>
                        <p className="text-blue-200/60 font-bold text-[10px] uppercase tracking-[0.4em] mt-2">Cepat, praktis, otomatis</p>
                      </div>
                    </div>
                    
                    <div className="p-12 md:p-16">
                      <div className="max-w-2xl mx-auto space-y-12">
                        <section>
                          <div className="flex items-center gap-4 mb-6">
                            <div className="w-1.5 h-10 bg-brand-primary rounded-full"></div>
                            <h3 className="text-2xl font-black text-slate-800 tracking-tight">Developer Aplikasi</h3>
                          </div>
                          <div className="space-y-6 text-slate-500 leading-relaxed font-medium">
                            <p className="text-lg text-slate-600 font-bold">
                              Aplikasi ini dikembangkan oleh <span className="text-brand-primary">Samkid Project</span>, sebuah pengembang yang berfokus pada pembuatan solusi digital sederhana, fungsional, dan efisien untuk kebutuhan sehari-hari.
                            </p>
                            <p>
                              Kami terus berinovasi untuk menghadirkan aplikasi yang mudah digunakan dan memberikan pengalaman terbaik bagi pengguna dalam mengelola administrasi perkantoran yang cepat dan akurat.
                            </p>
                          </div>
                        </section>

                        <section className="bg-slate-50 rounded-[2.5rem] p-10 border border-slate-100 shadow-inner">
                          <div className="flex flex-col md:flex-row items-center justify-between gap-8">
                            <div className="flex items-center gap-6">
                              <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-2xl flex items-center justify-center shadow-lg shadow-emerald-500/10">
                                <Phone size={28} />
                              </div>
                              <div>
                                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-1">Hubungi Kami</p>
                                <h4 className="text-xl font-black text-slate-800 tracking-tight">WhatsApp Developer</h4>
                              </div>
                            </div>
                            <a 
                              href="https://wa.me/6282374125554" 
                              target="_blank" 
                              rel="noreferrer"
                              className="px-8 py-4 bg-emerald-500 text-white rounded-2xl font-black text-sm tracking-widest uppercase shadow-xl shadow-emerald-500/20 hover:bg-emerald-600 hover:-translate-y-1 transition-all active:scale-95 flex items-center gap-3 group"
                            >
                              082374125554
                              <ExternalLink size={16} className="group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
                            </a>
                          </div>
                        </section>

                        <div className="pt-10 border-t border-slate-100 flex items-center justify-center opacity-30 grayscale pointer-events-none">
                           {/* Decorative logo area */}
                           <div className="flex items-center gap-2">
                             <div className="w-5 h-5 bg-slate-400 rounded-md"></div>
                             <span className="font-black text-sm tracking-tighter">SAMKID PROJECT</span>
                           </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="text-center text-[10px] text-slate-400 font-bold uppercase tracking-[0.3em]">
                    Build Version 1.0.4.Preview
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          )}
        </main>
      </div>

      {/* PDF PREVIEW MODAL */}
      <AnimatePresence>
        {(previewUrl || isPreviewLoading) && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-10">
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }}
              onClick={() => !isPreviewLoading && setPreviewUrl(null)}
              className="absolute inset-0 bg-slate-900/80 backdrop-blur-md"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-6xl h-full bg-white rounded-[2rem] shadow-2xl flex flex-col overflow-hidden"
            >
              <div className="p-6 border-b flex items-center justify-between bg-white">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-slate-100 text-brand-primary rounded-2xl flex items-center justify-center"><Eye size={24}/></div>
                  <div>
                    <h3 className="font-black text-lg text-slate-800 leading-tight">PRATINJAU DOKUMEN</h3>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Verifikasi data sebelum cetak atau simpan</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {previewUrl && (
                    <>
                      <button 
                        onClick={() => window.open(previewUrl, '_blank')}
                        className="px-5 py-2.5 bg-slate-100 text-slate-600 text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-slate-200 transition-all flex items-center gap-2"
                      >
                         Buka di Tab Baru
                      </button>
                      <a href={previewUrl} download="SPPD.pdf" className="px-5 py-2.5 bg-brand-primary text-white text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-brand-accent transition-all flex items-center gap-2 shadow-lg shadow-blue-500/20">
                        <Download size={14}/> Download PDF
                      </a>
                    </>
                  )}
                  <button onClick={() => setPreviewUrl(null)} className="ml-2 p-3 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-2xl transition-all font-bold group">
                    <LogOut size={20} className="group-hover:rotate-180 transition-transform duration-500" />
                  </button>
                </div>
              </div>
              <div className="flex-1 bg-slate-100 relative">
                {isPreviewLoading ? (
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 text-slate-400">
                    <Loader2 size={40} className="animate-spin text-brand-primary" />
                    <p className="text-xs font-black uppercase tracking-[0.3em]">Menyiapkan Dokumen...</p>
                  </div>
                ) : (
                  <iframe 
                    src={`${previewUrl}#toolbar=1&navpanes=0&scrollbar=1`} 
                    className="w-full h-full border-none bg-slate-100" 
                    title="PDF Preview"
                  />
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      
      {/* DELETE CONFIRMATION MODAL */}
      <AnimatePresence>
        {confirmDelete && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }}
              onClick={() => !isSubmitting && setConfirmDelete(null)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-sm bg-white rounded-3xl shadow-2xl p-8 text-center"
            >
              <div className="w-16 h-16 bg-red-50 text-red-500 rounded-2xl flex items-center justify-center mx-auto mb-6">
                <Trash2 size={32} />
              </div>
              <h3 className="text-xl font-black text-slate-800 mb-2">Konfirmasi Hapus</h3>
              <p className="text-sm text-slate-400 font-bold mb-8">
                {confirmDelete.type === 'sppd' ? 'Apakah Anda yakin ingin menghapus data SPPD ini? Tindakan ini tidak dapat dibatalkan.' : 'Hapus akses user ini?'}
              </p>
              <div className="flex gap-4">
                <button 
                  disabled={isSubmitting}
                  onClick={() => setConfirmDelete(null)} 
                  className="flex-1 py-3 bg-slate-100 text-slate-400 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-slate-200 transition-all active:scale-95 disabled:opacity-50"
                >
                  Batal
                </button>
                <button 
                  disabled={isSubmitting}
                  onClick={processDelete}
                  className="flex-1 py-3 bg-red-500 text-white rounded-xl text-xs font-black uppercase tracking-widest shadow-lg shadow-red-500/20 hover:bg-red-600 transition-all active:scale-95 flex items-center justify-center gap-2 disabled:opacity-50"
                >
                   {isSubmitting ? <Loader2 size={14} className="animate-spin"/> : <Trash2 size={14}/>} HAPUS
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
