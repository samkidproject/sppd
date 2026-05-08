import { signInWithPopup, GoogleAuthProvider } from 'firebase/auth';
import { auth } from '../lib/firebase';
import { LogIn, ShieldCheck } from 'lucide-react';
import { motion } from 'framer-motion';

export default function Login() {
  const handleLogin = async () => {
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
    } catch (error: any) {
      // Ignore common errors that happen when user closes search or cancels
      if (
        error.code === 'auth/popup-closed-by-user' || 
        error.code === 'auth/cancelled-popup-request'
      ) {
        return;
      }
      console.error('Login failed', error);
      alert('Gagal masuk: ' + (error.message || 'Terjadi kesalahan internal'));
    }
  };

  return (
    <div className="min-h-screen bg-brand-bg flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-md w-full bg-white rounded-3xl border border-brand-border shadow-2xl shadow-blue-100 overflow-hidden"
      >
        <div className="bg-brand-sidebar p-12 text-center text-white relative">
          <div className="absolute top-0 right-0 p-8 opacity-10 rotate-12">
            <ShieldCheck size={120} />
          </div>
          <div className="w-20 h-20 bg-brand-accent rounded-2xl mx-auto flex items-center justify-center shadow-xl shadow-blue-500/20 mb-6 border-4 border-white/10">
            <span className="text-3xl font-black">SP</span>
          </div>
          <h1 className="text-3xl font-black tracking-tight mb-2">SPD Instan</h1>
          <p className="text-slate-400 text-sm font-medium uppercase tracking-[0.2em]">Cepat, praktis, otomatis</p>
        </div>

        <div className="p-10 text-center">
          <h2 className="text-slate-800 font-bold text-xl mb-3">Selamat Datang</h2>
          <p className="text-slate-500 text-sm mb-8 leading-relaxed">
            Silahkan masuk menggunakan akun Google resmi instansi Anda untuk mengakses dashboard manajemen perjalanan dinas.
          </p>

          <button 
            onClick={handleLogin}
            className="w-full bg-white border border-slate-200 hover:border-brand-primary py-4 px-6 rounded-2xl flex items-center justify-center gap-3 transition-all hover:bg-brand-bg group cursor-pointer"
          >
            <div className="w-5 h-5 flex items-center justify-center">
              <svg viewBox="0 0 24 24" width="20" height="20">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
              </svg>
            </div>
            <span className="font-bold text-slate-700 group-hover:text-brand-primary">Masuk dengan Google</span>
          </button>

          <div className="mt-10 flex items-center justify-center gap-2 text-[10px] font-black text-slate-300 uppercase tracking-widest">
            <LogIn size={12} />
            Hanya Admin Terotorisasi
          </div>
        </div>
      </motion.div>
    </div>
  );
}
