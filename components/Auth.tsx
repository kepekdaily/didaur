
import React, { useState, useEffect } from 'react';
import { supabase, isCloudConfigured, fetchProfile } from '../utils/storage';
import { UserProfile } from '../types';

interface AuthProps {
  onAuthComplete: (user: UserProfile) => void;
  isDarkMode: boolean;
}

type AuthStage = 'initial' | 'otp';

const Auth: React.FC<AuthProps> = ({ onAuthComplete, isDarkMode }) => {
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [authStage, setAuthStage] = useState<AuthStage>('initial');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [cloudReady, setCloudReady] = useState(isCloudConfigured());

  useEffect(() => {
    setCloudReady(isCloudConfigured());
  }, []);

  const getFriendlyErrorMessage = (errMsg: string) => {
    const lowerMsg = errMsg.toLowerCase();
    if (lowerMsg.includes('invalid') && lowerMsg.includes('token')) return 'Kode OTP salah atau sudah kedaluwarsa.';
    if (lowerMsg.includes('expired')) return 'Kode OTP sudah kedaluwarsa. Silakan daftar ulang.';
    if (lowerMsg.includes('provider is not enabled')) return 'Login Google belum aktif di dashboard.';
    if (lowerMsg.includes('email not confirmed')) return 'Email belum dikonfirmasi. Gunakan kode OTP yang dikirim.';
    if (lowerMsg.includes('invalid login credentials')) return 'Email atau password salah.';
    return errMsg;
  };

  const handleGoogleSignIn = async () => {
    if (!cloudReady) return;
    setError('');
    setIsLoading(true);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo: window.location.origin }
      });
      if (error) throw error;
    } catch (err: any) {
      setError(getFriendlyErrorMessage(err.message));
      setIsLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    try {
      const { data, error: verifyError } = await supabase.auth.verifyOtp({
        email,
        token: otpCode,
        type: 'signup'
      });

      if (verifyError) throw verifyError;

      if (data.user) {
        // Profil akan dibuat secara otomatis oleh listener onAuthStateChange di index.tsx
        // Namun kita panggil fetchProfile di sini untuk memastikan transisi cepat
        const profile = await fetchProfile(data.user.id);
        if (profile) {
          onAuthComplete(profile);
        } else {
          // Jika profil belum terbuat instan, buat manual di sini agar tidak stuck
          const { error: profileError } = await supabase.from('profiles').upsert({
            id: data.user.id,
            email: data.user.email,
            name: name || 'Pejuang Daur',
            avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${data.user.id}`,
            points: 100,
            rank: 'Pemula Hijau'
          }, { onConflict: 'id' });
          
          const newProfile = await fetchProfile(data.user.id);
          if (newProfile) onAuthComplete(newProfile);
        }
      }
    } catch (err: any) {
      setError(getFriendlyErrorMessage(err.message));
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cloudReady) return;
    setError('');
    setIsLoading(true);

    try {
      if (authMode === 'register') {
        const { data, error: signUpError } = await supabase.auth.signUp({ 
          email, 
          password,
          options: { data: { full_name: name } }
        });
        if (signUpError) throw signUpError;
        
        if (data.user) {
          setAuthStage('otp');
        }
      } else {
        const { data, error: signInError } = await supabase.auth.signInWithPassword({ email, password });
        if (signInError) throw signInError;
        if (data.user) {
          const profile = await fetchProfile(data.user.id);
          if (profile) onAuthComplete(profile);
        }
      }
    } catch (err: any) {
      setError(getFriendlyErrorMessage(err.message));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={`min-h-screen relative flex flex-col items-center justify-center p-6 transition-all duration-700 ${isDarkMode ? 'bg-slate-950' : 'bg-green-600'}`}>
      {/* Background Decorative Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-20">
         <div className="absolute top-0 -left-20 w-80 h-80 bg-white rounded-full blur-3xl animate-pulse"></div>
         <div className="absolute bottom-0 -right-20 w-80 h-80 bg-green-300 rounded-full blur-3xl"></div>
      </div>

      <div className="relative w-full max-w-md z-10 space-y-6">
        {/* Logo Section */}
        <div className="text-center animate-in fade-in slide-in-from-top-8 duration-700">
          <div className="w-16 h-16 bg-white dark:bg-slate-900 rounded-2xl mx-auto flex items-center justify-center shadow-2xl mb-4">
            <span className="text-3xl">♻️</span>
          </div>
          <h1 className="text-4xl font-black text-white tracking-tighter">Didaur AI</h1>
          <p className="text-green-100/70 text-[10px] font-bold uppercase tracking-[0.3em] mt-1">Langkah Cerdas Kelola Sampah</p>
        </div>

        {/* Auth Card */}
        <div className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-2xl rounded-[3rem] p-8 shadow-2xl border border-white/20 overflow-hidden">
          
          {authStage === 'otp' ? (
            <div className="space-y-6 animate-in slide-in-from-right-8 duration-500">
              <div className="text-center space-y-3">
                <div className="inline-block p-4 bg-green-100 dark:bg-green-900/30 rounded-2xl mb-2">
                   <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                   </svg>
                </div>
                <h2 className="text-2xl font-black text-slate-900 dark:text-white leading-tight">Cek Email Kamu</h2>
                <p className="text-xs font-medium text-slate-500 leading-relaxed">
                  Kami telah mengirimkan 6 digit kode verifikasi ke <b>{email}</b>. Masukkan kode tersebut untuk masuk ke aplikasi.
                </p>
              </div>

              <form onSubmit={handleVerifyOtp} className="space-y-6">
                <div className="relative">
                  <input 
                    type="text" 
                    maxLength={6}
                    placeholder="0 0 0 0 0 0"
                    className="w-full bg-slate-100 dark:bg-slate-800 p-6 rounded-3xl text-3xl font-black tracking-[0.3em] text-center outline-none border-2 border-transparent focus:border-green-500 dark:text-white transition-all shadow-inner"
                    value={otpCode}
                    onChange={e => setOtpCode(e.target.value.replace(/\D/g, ''))}
                    required
                    autoFocus
                  />
                  {isLoading && (
                    <div className="absolute right-4 top-1/2 -translate-y-1/2">
                       <div className="w-5 h-5 border-2 border-green-600 border-t-transparent rounded-full animate-spin"></div>
                    </div>
                  )}
                </div>

                {error && (
                  <div className="animate-in shake duration-300">
                    <p className="text-[10px] font-bold text-rose-500 text-center uppercase tracking-widest bg-rose-50 dark:bg-rose-950/30 p-4 rounded-2xl border border-rose-100 dark:border-rose-900/30">
                      ⚠️ {error}
                    </p>
                  </div>
                )}

                <button 
                  type="submit" 
                  disabled={isLoading || otpCode.length < 6} 
                  className="group w-full bg-green-600 text-white py-5 rounded-[2rem] font-black text-sm uppercase tracking-widest shadow-xl shadow-green-200 dark:shadow-none active:scale-95 disabled:opacity-50 transition-all flex items-center justify-center space-x-2"
                >
                  <span>{isLoading ? 'MEMVERIFIKASI...' : 'VERIFIKASI & MASUK'}</span>
                  {!isLoading && (
                    <svg className="w-5 h-5 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M13 7l5 5m0 0l-5 5m5-5H6" />
                    </svg>
                  )}
                </button>
              </form>

              <div className="text-center pt-2">
                <button 
                  onClick={() => { setAuthStage('initial'); setError(''); }}
                  className="text-[10px] font-black text-slate-400 uppercase tracking-widest hover:text-green-600 transition-colors"
                >
                  Ganti Email atau Kembali
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-6 animate-in slide-in-from-left-8 duration-500">
              {/* Main Form Section */}
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="text-center mb-6">
                  <h2 className="text-2xl font-black text-slate-900 dark:text-white leading-tight">
                    {authMode === 'login' ? 'Selamat Datang' : 'Gabung Bersama Kami'}
                  </h2>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">
                    Silakan {authMode === 'login' ? 'Masuk' : 'Daftar'} untuk melanjutkan
                  </p>
                </div>

                {error && <p className="text-[10px] font-bold text-rose-500 bg-rose-50 dark:bg-rose-950/30 p-4 rounded-xl border border-rose-100 dark:border-rose-900/30 animate-in shake duration-300">⚠️ {error}</p>}
                
                {authMode === 'register' && (
                  <div className="space-y-1">
                    <label className="text-[9px] font-black uppercase text-slate-400 px-2 tracking-widest">Nama Lengkap</label>
                    <input type="text" placeholder="Budi Santoso" className="w-full bg-slate-50 dark:bg-slate-800 p-4 rounded-xl font-bold text-sm outline-none border-2 border-transparent focus:border-green-500 dark:text-white transition-all" value={name} onChange={e => setName(e.target.value)} required />
                  </div>
                )}
                
                <div className="space-y-1">
                  <label className="text-[9px] font-black uppercase text-slate-400 px-2 tracking-widest">Email</label>
                  <input type="email" placeholder="budi@email.com" className="w-full bg-slate-50 dark:bg-slate-800 p-4 rounded-xl font-bold text-sm outline-none border-2 border-transparent focus:border-green-500 dark:text-white transition-all" value={email} onChange={e => setEmail(e.target.value)} required />
                </div>

                <div className="space-y-1">
                  <label className="text-[9px] font-black uppercase text-slate-400 px-2 tracking-widest">Password</label>
                  <input type="password" placeholder="••••••••" className="w-full bg-slate-50 dark:bg-slate-800 p-4 rounded-xl font-bold text-sm outline-none border-2 border-transparent focus:border-green-500 dark:text-white transition-all" value={password} onChange={e => setPassword(e.target.value)} required />
                </div>

                <button type="submit" disabled={isLoading} className="w-full bg-green-600 text-white py-5 rounded-2xl font-black text-xs shadow-xl shadow-green-100 dark:shadow-none active:scale-95 disabled:opacity-50 transition-all uppercase tracking-widest mt-4">
                  {isLoading ? 'MENGHUBUNGKAN...' : authMode === 'login' ? 'MASUK KE AKUN' : 'DAFTAR DENGAN OTP'}
                </button>
              </form>

              {/* Mode Toggle */}
              <div className="text-center pt-2">
                <button onClick={() => { setAuthMode(authMode === 'login' ? 'register' : 'login'); setError(''); }} className="text-slate-500 text-[10px] font-black uppercase tracking-widest hover:text-green-600 transition-colors">
                  {authMode === 'login' ? 'Belum punya akun? Daftar Baru' : 'Sudah punya akun? Masuk'}
                </button>
              </div>

              {/* Or Separator and Google Sign-In (At the bottom) */}
              <div className="space-y-4 pt-4 border-t border-slate-100 dark:border-slate-800">
                <div className="relative flex items-center justify-center">
                  <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-slate-100 dark:border-slate-800"></div></div>
                  <span className="relative bg-white dark:bg-slate-900 px-4 text-[9px] font-black text-slate-400 uppercase tracking-widest">Atau Gunakan</span>
                </div>

                <button 
                  onClick={handleGoogleSignIn}
                  disabled={isLoading}
                  className="w-full bg-white dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 text-slate-900 dark:text-white py-4 rounded-xl font-black text-[10px] shadow-sm flex items-center justify-center space-x-3 uppercase tracking-widest active:scale-95 transition-all"
                >
                  <svg className="w-5 h-5" viewBox="0 0 24 24">
                     <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                     <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                     <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/>
                     <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                  </svg>
                  <span>Lanjutkan dengan Google</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Auth;
