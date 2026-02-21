
import React, { useState, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import './globals.css';
import { AppTab, UserProfile } from './types';
import { getCurrentUser, logoutUser, getThemePreference, supabase, fetchProfile } from './utils/storage';
import Navigation from './components/Navigation';
import Scanner from './components/Scanner';
import Community from './components/Community';
import Leaderboard from './components/Leaderboard';
import Profile from './components/Profile';
import Home from './components/Home';
import Auth from './components/Auth';

const App = () => {
  const [activeTab, setActiveTab] = useState<AppTab>(AppTab.HOME);
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isDarkMode, setIsDarkMode] = useState<boolean>(getThemePreference());
  const [isWireframe, setIsWireframe] = useState<boolean>(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);

  useEffect(() => {
    const initApp = async () => {
      try {
        const savedUser = await getCurrentUser();
        if (savedUser) {
          setUser(savedUser);
        }
      } catch (e) {
        console.error("Gagal memuat profil awal:", e);
      } finally {
        setIsInitialized(true);
      }
    };
    initApp();

    if ('serviceWorker' in navigator) {
      window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js').catch(err => console.log('SW registration failed:', err));
      });
    }

    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session) {
        let profile = await fetchProfile(session.user.id);
        if (!profile) {
          const metadata = session.user.user_metadata;
          const newProfileData = {
            id: session.user.id,
            email: session.user.email,
            name: metadata?.full_name || metadata?.name || session.user.email?.split('@')[0] || 'Pejuang Daur',
            avatar: metadata?.avatar_url || metadata?.picture || `https://api.dicebear.com/7.x/avataaars/svg?seed=${session.user.id}`,
            points: 100,
            rank: 'Pemula Hijau',
            items_scanned: 0,
            total_co2_saved: 0,
            badges: [],
            liked_posts: []
          };
          const { error: upsertError } = await supabase.from('profiles').upsert(newProfileData, { onConflict: 'id' });
          if (!upsertError) profile = await fetchProfile(session.user.id);
        }
        if (profile) {
          setUser(profile);
          if (event === 'SIGNED_IN') setActiveTab(AppTab.HOME);
        }
      } else {
        setUser(null);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (isDarkMode) document.documentElement.classList.add('dark');
    else document.documentElement.classList.remove('dark');
    
    if (isWireframe) document.documentElement.classList.add('wireframe-mode');
    else document.documentElement.classList.remove('wireframe-mode');
  }, [isDarkMode, isWireframe]);

  const handleAuthComplete = (newUser: UserProfile) => {
    setUser(newUser);
    setActiveTab(AppTab.HOME);
  };

  const handleLogout = async () => {
    await logoutUser();
    setUser(null);
    setActiveTab(AppTab.HOME);
  };

  const handleInstallApp = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') setDeferredPrompt(null);
  };

  if (!isInitialized) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-slate-50 dark:bg-slate-950">
        <div className="w-12 h-12 border-4 border-slate-200 border-t-green-600 rounded-full animate-spin"></div>
        <p className="mt-6 font-black text-green-600 text-[10px] uppercase tracking-[0.3em] animate-pulse">Menghubungkan Sesi...</p>
      </div>
    );
  }

  if (!user) {
    return <Auth onAuthComplete={handleAuthComplete} isDarkMode={isDarkMode} />;
  }

  return (
    <div className={`min-h-screen transition-colors duration-300 ${isDarkMode ? 'dark bg-slate-950 text-slate-100' : 'bg-slate-50 text-slate-900'} pb-20 ${isWireframe ? 'wireframe-active' : ''}`}>
      <header className="bg-white/80 dark:bg-slate-950/80 backdrop-blur-md sticky top-0 z-40 px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center shadow-sm">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-green-600 rounded-xl flex items-center justify-center shadow-lg wireframe-box">
            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </div>
          <span className="text-2xl font-black tracking-tighter text-slate-900 dark:text-slate-100 wireframe-text">Didaur</span>
        </div>
        <div className="flex items-center space-x-3">
            <div className="bg-green-50 dark:bg-green-900/30 px-4 py-2 rounded-2xl border border-green-100 dark:border-green-800 flex items-center space-x-2 shadow-inner wireframe-box">
              <span className="text-lg font-black text-green-700 dark:text-green-400">{user.points.toLocaleString()}</span>
              <span className="text-[8px] font-black text-green-600 bg-green-200 dark:bg-green-800/50 px-1.5 py-0.5 rounded text-white uppercase">XP</span>
            </div>
        </div>
      </header>

      <main className="max-w-md mx-auto relative animate-in fade-in slide-in-from-bottom-4 duration-500">
        {activeTab === AppTab.HOME && <Home user={user} setActiveTab={setActiveTab} isDarkMode={isDarkMode} />}
        {activeTab === AppTab.SCAN && <Scanner user={user} onPointsUpdate={setUser} isDarkMode={isDarkMode} />}
        {activeTab === AppTab.COMMUNITY && <Community user={user} onPointsUpdate={setUser} isDarkMode={isDarkMode} />}
        {activeTab === AppTab.LEADERBOARD && <Leaderboard isDarkMode={isDarkMode} />}
        {activeTab === AppTab.PROFILE && (
          <Profile 
            user={user} 
            onUpdate={setUser} 
            onLogout={handleLogout} 
            isDarkMode={isDarkMode} 
            onToggleDarkMode={() => setIsDarkMode(!isDarkMode)} 
            isWireframe={isWireframe}
            onToggleWireframe={() => setIsWireframe(!isWireframe)}
            canInstall={!!deferredPrompt}
            onInstallRequest={handleInstallApp}
          />
        )}
      </main>

      <Navigation activeTab={activeTab} setActiveTab={setActiveTab} isDarkMode={isDarkMode} />
      
      {isWireframe && (
        <div className="fixed top-24 left-4 z-[100] bg-black text-white px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest animate-pulse border border-white/20">
          Wireframe Mode Aktif
        </div>
      )}
    </div>
  );
};

const container = document.getElementById('root');
if (container) {
  const root = createRoot(container);
  root.render(<App />);
}
