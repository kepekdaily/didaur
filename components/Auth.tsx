
import React, { useState, useEffect } from 'react';
import { supabase, isCloudConfigured, fetchProfile } from '../utils/storage';
import { UserProfile } from '../types';

interface AuthProps {
  onAuthComplete: (user: UserProfile) => void;
  isDarkMode: boolean;
}

const Auth: React.FC<AuthProps> = ({ onAuthComplete, isDarkMode }) => {
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [cloudReady, setCloudReady] = useState(isCloudConfigured());

  useEffect(() => {
    setCloudReady(isCloudConfigured());
  }, []);

  const getFriendlyErrorMessage = (errMsg: string) => {
    const lowerMsg = errMsg.toLowerCase();
    
    if (lowerMsg.includes('provider is not enabled') || lowerMsg.includes('unsupported provider')) {
      return 'Fitur Login Google belum diaktifkan di Dashboard Supabase. Silakan aktifkan di: Authentication > Providers > Google.';
    }
    if (lowerMsg.includes('email not confirmed')) {
      return 'Email Anda belum dikonfirmasi. Silakan cek Inbox/Spam email Anda atau matikan "Confirm Email" di Dashboard Supabase (Auth > Providers > Email).';
    }
    if (lowerMsg.includes('invalid login credentials')) {
      return 'Email atau Password salah. Silakan periksa kembali.';
    }
    if (lowerMsg.includes('user already registered')) {
      return 'Email ini sudah terdaftar. Silakan gunakan menu Masuk.';
    }
    if (lowerMsg.includes('network error') || lowerMsg.includes('failed to fetch')) {
      return 'Gagal terhubung ke server. Periksa koneksi internet atau SUPABASE_URL Anda.';
    }
    return errMsg;
  };

  const handleGoogleSignIn = async () => {
    if (!cloudReady) {
      setError("Cloud belum terhubung. Periksa konfigurasi .env Anda.");
      return;
    }
    setError('');
    setIsLoading(true);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: window.location.origin
        }
      });
      if (error) throw error;
    } catch (err: any) {
      setError(getFriendlyErrorMessage(err.message || "Gagal masuk dengan Google. Pastikan Provider sudah aktif."));
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cloudReady) {
      setError("Cloud belum terhubung. Harap isi variabel lingkungan Supabase.");
      return;
    }
    setError('');
    
    if (password.length < 6) {
      setError('Password minimal 6 karakter.');
      return;
    }

    setIsLoading(true);

    try {
      if (authMode === 'register') {
        if (!name.trim()) throw new Error("Nama harus diisi.");

        const { data, error: signUpError } = await supabase.auth.signUp({ email, password });
        if (signUpError) throw signUpError;
        
        if (data.user) {
          const existing = await fetchProfile(data.user.id);
          if (!existing) {
            const { error: profileError } = await supabase.from('profiles').insert({
              id: data.user.id,
              email: data.user.email,
              name: name,
              avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(name)}`,
              points: 100,
              rank: 'Pemula Hijau'
            });
            if (profileError) console.error("Gagal membuat profil:", profileError);
          }

          alert("Registrasi Berhasil! Silakan cek email Anda untuk konfirmasi.");
          setAuthMode('login');
        }
      } else {
        const { data, error: signInError } = await supabase.auth.signInWithPassword({ email, password });
        if (signInError) throw signInError;
        
        if (data.user) {
          const profile = await fetchProfile(data.user.id);
          if (!profile) throw new Error("Profil tidak ditemukan.");
          onAuthComplete(profile);
        }
      }
    } catch (err: any) {
      setError(getFriendlyErrorMessage(err.message || 'Terjadi kesalahan sistem.'));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={`min-h-screen relative flex flex-col items-center justify-center p-6 transition-colors duration-500 ${isDarkMode ? 'bg-slate-950' : 'bg-green-600'}`}>
      <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-20">
         <div className="absolute top-0 -left-20 w-80 h-80 bg-white rounded-full blur-3xl animate-pulse"></div>
         <div className="absolute bottom-0 -right-20 w-80 h-80 bg-green-300 rounded-full blur-3xl"></div>
      </div>

      <div className="relative w-full max-w-md z-10 space-y-6">
        <div className="text-center animate-in fade-in slide-in-from-top-8 duration-700">
          <div className="w-20 h-20 bg-white dark:bg-slate-900 rounded-[2rem] mx-auto flex items-center justify-center shadow-2xl transform rotate-3 hover:rotate-0 transition-transform">
            <svg className="w-10 h-10 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </div>
          <h1 className="text-4xl font-black text-white mt-4 tracking-tighter">Didaur</h1>
          <p className="text-green-100/70 text-[9px] font-bold uppercase tracking-[0.3em] mt-1">Komunitas Hijau Global</p>
        </div>

        <div className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-2xl rounded-[2.5rem] p-8 shadow-2xl border border-white/20">
          <div className="flex justify-between items-center mb-8">
            <h2 className="text-2xl font-black text-slate-900 dark:text-white">
              {authMode === 'login' ? 'Masuk' : 'Daftar'}
            </h2>
            <div className={`w-10 h-10 rounded-full flex items-center justify-center ${cloudReady ? 'bg-green-50 text-green-600' : 'bg-slate-100 text-slate-400'}`}>
              {authMode === 'login' ? '🔑' : '🌱'}
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="p-4 bg-rose-50 dark:bg-rose-900/20 text-rose-600 dark:text-rose-400 rounded-2xl text-[10px] font-bold border border-rose-100 dark:border-rose-800 leading-relaxed shadow-sm">
                ⚠️ {error}
              </div>
            )}
            
            {authMode === 'register' && (
              <div className="space-y-1">
                <label className="text-[9px] font-black uppercase text-slate-400 px-2 tracking-widest">Nama Lengkap</label>
                <input type="text" placeholder="Budi Santoso" className="w-full bg-slate-50 dark:bg-slate-800 p-4 rounded-xl font-bold text-sm outline-none border-2 border-transparent focus:border-green-500 transition-all dark:text-white" value={name} onChange={e => setName(e.target.value)} required />
              </div>
            )}
            
            <div className="space-y-1">
              <label className="text-[9px] font-black uppercase text-slate-400 px-2 tracking-widest">Email</label>
              <input type="email" placeholder="budi@email.com" className="w-full bg-slate-50 dark:bg-slate-800 p-4 rounded-xl font-bold text-sm outline-none border-2 border-transparent focus:border-green-500 transition-all dark:text-white" value={email} onChange={e => setEmail(e.target.value)} required />
            </div>

            <div className="space-y-1">
              <label className="text-[9px] font-black uppercase text-slate-400 px-2 tracking-widest">Password</label>
              <input type="password" placeholder="••••••••" className="w-full bg-slate-50 dark:bg-slate-800 p-4 rounded-xl font-bold text-sm outline-none border-2 border-transparent focus:border-green-500 transition-all dark:text-white" value={password} onChange={e => setPassword(e.target.value)} required />
            </div>

            <button type="submit" disabled={isLoading || !cloudReady} className="w-full bg-green-700 hover:bg-green-800 text-white py-4 rounded-xl font-black text-xs shadow-lg active:scale-95 disabled:opacity-50 transition-all mt-4 uppercase tracking-widest">
              {isLoading ? 'MEMPROSES...' : authMode === 'login' ? 'MASUK KE KOMUNITAS' : 'BUAT AKUN GLOBAL'}
            </button>
          </form>

          <div className="mt-6 flex items-center space-x-4">
             <div className="flex-1 h-px bg-slate-100 dark:bg-slate-800"></div>
             <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">atau</span>
             <div className="flex-1 h-px bg-slate-100 dark:bg-slate-800"></div>
          </div>

          <button 
            onClick={handleGoogleSignIn}
            disabled={isLoading || !cloudReady}
            className="w-full mt-6 bg-white dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-100 py-4 rounded-xl font-black text-xs shadow-sm active:scale-95 disabled:opacity-50 transition-all flex items-center justify-center space-x-3 uppercase tracking-widest"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
               <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
               <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
               <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/>
               <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            <span>MASUK DENGAN GOOGLE</span>
          </button>

          <div className="mt-8 text-center">
            <button onClick={() => { setAuthMode(authMode === 'login' ? 'register' : 'login'); setError(''); }} className="text-slate-500 text-[10px] font-bold uppercase tracking-widest hover:text-green-700 transition-colors">
              {authMode === 'login' ? 'Belum punya akun? ' : 'Sudah punya akun? '}
              <span className="text-green-700 font-black underline underline-offset-4">{authMode === 'login' ? 'Daftar Sekarang' : 'Masuk Disini'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Auth;
