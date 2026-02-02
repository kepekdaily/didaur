import React, { useState } from 'react';
import { UserProfile } from '../types';
import { 
  updateAccountInfo, 
  setThemePreference, 
  clearDatabase, 
  getDatabaseStats, 
  generateSyncCode, 
  importFromSyncCode,
  BADGES
} from '../utils/storage';

interface ProfileProps {
  user: UserProfile;
  onUpdate: (user: UserProfile) => void;
  onLogout: () => void;
  isDarkMode: boolean;
  onToggleDarkMode: () => void;
}

const Profile: React.FC<ProfileProps> = ({ user, onUpdate, onLogout, isDarkMode, onToggleDarkMode }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState(user.name);
  const [avatar, setAvatar] = useState(user.avatar);
  const [showSync, setShowSync] = useState(false);
  const [syncCode, setSyncCode] = useState('');
  const [importCode, setImportCode] = useState('');
  const [stats] = useState(getDatabaseStats());

  const handleSaveProfile = async () => {
    try {
      const updated: UserProfile | null = await updateAccountInfo(name, avatar);
      if (updated) { 
        onUpdate(updated); 
        setIsEditing(false); 
      } else {
        alert("Gagal memperbarui profil. Pastikan koneksi cloud terhubung.");
      }
    } catch (e) {
      console.error("Save profile error:", e);
      alert("Terjadi kesalahan saat menyimpan profil.");
    }
  };

  const handleSync = () => {
    setSyncCode(generateSyncCode());
    setShowSync(true);
  };

  const handleImport = () => {
    if (importFromSyncCode(importCode)) {
      alert("Sinkronisasi Berhasil! Aplikasi akan dimuat ulang.");
      window.location.reload();
    } else {
      alert("Kode Sinkronisasi Tidak Valid.");
    }
  };

  return (
    <div className="p-6 space-y-8 pb-32 animate-in fade-in duration-500">
      <div className="flex flex-col items-center pt-4">
        <div className="relative mb-6">
          <div className="absolute -inset-4 bg-green-500/20 rounded-full blur-2xl animate-pulse"></div>
          <div className="relative w-32 h-32 rounded-[2.5rem] overflow-hidden border-4 border-white dark:border-slate-800 shadow-2xl">
            <img src={avatar} className="w-full h-full object-cover" alt="User Avatar" />
            {isEditing && (
              <button onClick={() => setAvatar(`https://api.dicebear.com/7.x/avataaars/svg?seed=${Math.random()}`)} className="absolute inset-0 bg-black/50 flex flex-col items-center justify-center text-white backdrop-blur-sm">
                <span className="text-[10px] font-black uppercase">Ganti Avatar</span>
              </button>
            )}
          </div>
        </div>

        {isEditing ? (
          <div className="w-full max-w-xs space-y-4">
            <input type="text" value={name} onChange={e => setName(e.target.value)} className="w-full p-4 bg-white dark:bg-slate-900 border border-slate-200 rounded-2xl font-bold text-center outline-none dark:text-white" />
            <div className="flex space-x-2">
              <button onClick={handleSaveProfile} className="flex-1 bg-green-600 text-white py-3 rounded-2xl font-black text-xs">SIMPAN</button>
              <button onClick={() => setIsEditing(false)} className="px-6 bg-slate-100 dark:bg-slate-800 text-slate-500 py-3 rounded-2xl font-black text-xs">BATAL</button>
            </div>
          </div>
        ) : (
          <div className="text-center">
            <h2 className="text-3xl font-black text-slate-900 dark:text-slate-100 tracking-tight">{user.name}</h2>
            <div className="flex items-center justify-center space-x-2 mt-1">
              <span className="px-3 py-1 bg-green-50 dark:bg-green-900/30 text-green-600 dark:text-green-400 rounded-full text-[10px] font-black uppercase tracking-widest">{user.rank}</span>
              <button onClick={() => setIsEditing(true)} className="p-1 text-slate-400"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg></button>
            </div>
          </div>
        )}
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-[3rem] p-8 shadow-sm border border-slate-100 dark:border-slate-800 space-y-6">
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-blue-50 dark:bg-blue-900/10 p-5 rounded-[2rem] text-center border border-blue-100 dark:border-blue-900/30">
            <p className="text-xl font-black text-blue-600 dark:text-blue-400">{(user.totalCo2Saved / 1000).toFixed(2)} Kg</p>
            <p className="text-[9px] font-black text-blue-800/60 uppercase mt-1">CO2 Tercegah</p>
          </div>
          <div className="bg-emerald-50 dark:bg-emerald-900/10 p-5 rounded-[2rem] text-center border border-emerald-100 dark:border-emerald-900/30">
            <p className="text-xl font-black text-emerald-600 dark:text-emerald-400">{user.itemsScanned}</p>
            <p className="text-[9px] font-black text-emerald-800/60 uppercase mt-1">Barang Didaur</p>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <h3 className="font-black text-slate-900 dark:text-slate-100 text-xl tracking-tight px-2 flex items-center">
          <span className="mr-3 p-2 bg-slate-100 dark:bg-slate-800 rounded-xl">☁️</span> Gratis Cloud Sync
        </h3>
        <div className="bg-slate-50 dark:bg-slate-900/50 p-6 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 space-y-5">
           <p className="text-[10px] font-bold text-slate-500 text-center px-4 leading-relaxed">Pindahkan progress kamu ke HP lain secara gratis dengan menyalin kode di bawah.</p>
           <button onClick={handleSync} className="w-full bg-slate-900 dark:bg-white text-white dark:text-slate-900 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest active:scale-95 transition-all">DAPATKAN KODE SYNC</button>
           
           <div className="pt-4 border-t border-slate-200 dark:border-slate-800">
              <input 
                type="text" 
                placeholder="Tempel Kode Sync di sini..." 
                className="w-full p-4 bg-white dark:bg-slate-800 rounded-xl text-xs font-bold outline-none mb-2 border border-slate-200 dark:border-slate-700" 
                value={importCode}
                onChange={e => setImportCode(e.target.value)}
              />
              <button onClick={handleImport} className="w-full bg-green-600 text-white py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest active:scale-95 transition-all">IMPOR DATA SEKARANG</button>
           </div>
        </div>
      </div>

      <div className="space-y-4">
        <h3 className="font-black text-slate-900 dark:text-slate-100 text-xl tracking-tight px-2">🏅 Lencana Kamu</h3>
        <div className="flex space-x-3 overflow-x-auto no-scrollbar py-2">
           {BADGES.map(badge => (
             <div key={badge.id} className={`flex-shrink-0 w-24 p-4 rounded-2xl flex flex-col items-center justify-center space-y-2 border ${badge.unlocked ? 'bg-white dark:bg-slate-900 border-green-500' : 'bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 opacity-40 grayscale'}`}>
                <span className="text-3xl">{badge.icon}</span>
                <span className="text-[8px] font-black text-center dark:text-slate-300">{badge.name}</span>
             </div>
           ))}
        </div>
      </div>

      {showSync && (
        <div className="fixed inset-0 z-[500] bg-black/80 backdrop-blur-md flex items-center justify-center p-6">
           <div className="bg-white dark:bg-slate-900 w-full max-w-sm rounded-[3rem] p-8 space-y-6">
              <h2 className="text-xl font-black text-center text-slate-900 dark:text-white">Salin Kode Kamu</h2>
              <textarea readOnly className="w-full h-32 p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl text-[8px] font-mono break-all outline-none" value={syncCode} />
              <button onClick={() => { navigator.clipboard.writeText(syncCode); alert("Kode Tersalin!"); }} className="w-full bg-green-600 text-white py-4 rounded-2xl font-black text-xs uppercase tracking-widest">SALIN KE CLIPBOARD</button>
              <button onClick={() => setShowSync(false)} className="w-full bg-slate-100 dark:bg-slate-800 text-slate-400 py-4 rounded-2xl font-black text-xs uppercase tracking-widest">TUTUP</button>
           </div>
        </div>
      )}

      <div className="space-y-4">
        <h3 className="font-black text-slate-900 dark:text-slate-100 text-xl tracking-tight px-2">⚙️ Pengaturan</h3>
        <button onClick={() => { onToggleDarkMode(); setThemePreference(!isDarkMode); }} className="w-full bg-white dark:bg-slate-900 p-5 rounded-[2.2rem] border border-slate-100 dark:border-slate-800 flex items-center justify-between active:scale-[0.98]">
          <span className="font-bold text-slate-700 dark:text-slate-200 text-sm">{isDarkMode ? 'Mode Gelap Aktif' : 'Mode Terang Aktif'}</span>
          <div className={`w-12 h-6 rounded-full p-1 transition-colors ${isDarkMode ? 'bg-green-600' : 'bg-slate-200'}`}><div className={`w-4 h-4 bg-white rounded-full transform transition-transform ${isDarkMode ? 'translate-x-6' : 'translate-x-0'}`}></div></div>
        </button>
        <button onClick={onLogout} className="w-full bg-rose-50 dark:bg-rose-900/10 text-rose-600 dark:text-rose-400 p-6 rounded-[2.2rem] font-black border border-rose-100 dark:border-rose-900/30">Keluar Akun</button>
      </div>
      
      <div className="text-center pt-4">
         <p className="text-[8px] font-black text-slate-300 uppercase tracking-widest">Status Penyimpanan: {stats.kb} ({stats.totalStorageUsed})</p>
         <button onClick={() => confirm("Hapus semua data?") && clearDatabase()} className="mt-4 text-[8px] font-black text-rose-400 uppercase tracking-widest underline decoration-rose-200">Reset Database Permanen</button>
      </div>
    </div>
  );
};

export default Profile;