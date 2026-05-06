import { useState, useEffect } from 'react';
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { auth } from './lib/firebase';
import Login from './components/Login';
import Platform from './components/Platform';
import Verify from './components/Verify';

export default function App() {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [isVerifyPage, setIsVerifyPage] = useState(false);

  useEffect(() => {
    // Check if on verify page
    const params = new URLSearchParams(window.location.search);
    if (params.has('id')) {
      setIsVerifyPage(true);
    }

    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  if (isVerifyPage) {
    return <Verify />;
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-brand-bg flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-brand-primary border-t-transparent rounded-full animate-spin"></div>
          <p className="text-sm font-bold text-brand-text-muted uppercase tracking-widest animate-pulse">Menghubungkan ke Pusat Data...</p>
        </div>
      </div>
    );
  }

  return user ? <Platform /> : <Login />;
}
