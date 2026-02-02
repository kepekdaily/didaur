import React, { useState, useEffect } from 'react';
import { UserProfile, AppTab, CommunityPost } from '../types';
import { getCommunityPosts } from '../utils/storage';

interface HomeProps {
  user: UserProfile;
  setActiveTab: (tab: AppTab) => void;
  isDarkMode: boolean;
}

const Home: React.FC<HomeProps> = ({ user, setActiveTab, isDarkMode }) => {
  const [posts, setPosts] = useState<CommunityPost[]>([]);

  /* Async fetch of community posts for home display */
  useEffect(() => {
    const fetchPosts = async () => {
      const allPosts: CommunityPost[] = await getCommunityPosts();
      setPosts(allPosts.slice(0, 3));
    };
    fetchPosts();
  }, []);

  // Helper function to format Carbon Savings consistently in Kg
  const formatCarbon = (grams: number) => {
    const kg = grams / 1000;
    // Jika angka bulat, tampilkan tanpa desimal, jika tidak gunakan 2 desimal
    return `${kg.toLocaleString('id-ID', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} Kg`;
  };

  const dailyMissions = [
    { id: 1, title: 'Scan Botol Plastik', reward: 50, progress: user.plasticItemsScanned || 0, total: 3, icon: '🥤' },
    { id: 2, title: 'Berbagi Inspirasi', reward: 100, progress: user.creationsShared || 0, total: 1, icon: '✨' }
  ];

  return (
    <div className="p-6 space-y-8 animate-in fade-in duration-500 pb-24">
      <div className="relative overflow-hidden bg-gradient-to-br from-green-600 to-emerald-800 rounded-[3rem] p-8 text-white shadow-2xl shadow-green-200 dark:shadow-none transition-all">
        <div className="absolute -top-10 -right-10 w-40 h-40 bg-white/10 rounded-full blur-3xl"></div>
        <div className="absolute bottom-0 left-0 w-24 h-24 bg-black/10 rounded-tr-full blur-2xl"></div>
        
        <div className="relative z-10 flex flex-col space-y-6">
          <div className="flex items-center space-x-4">
             <div className="relative">
                <img src={user.avatar} className="w-14 h-14 rounded-2xl border-2 border-white/50 shadow-lg object-cover" />
                <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-yellow-400 rounded-full border-2 border-green-600 flex items-center justify-center text-[10px]">⭐</div>
             </div>
             <div>
               <p className="text-xs font-medium text-green-100 opacity-80">Selamat pagi,</p>
               <h1 className="text-xl font-extrabold tracking-tight">{user.name}</h1>
             </div>
          </div>

          <div className="bg-white/15 backdrop-blur-xl rounded-[2rem] p-5 border border-white/10 flex justify-between items-center">
             <div>
                <p className="text-[9px] font-black text-green-200 uppercase tracking-[0.2em] mb-1">Total Saldo XP</p>
                <div className="flex items-baseline space-x-1">
                  <p className="text-3xl font-black">{user.points.toLocaleString()}</p>
                  <span className="text-xs font-bold text-green-200">XP</span>
                </div>
             </div>
             <button 
              onClick={() => setActiveTab(AppTab.SCAN)}
              className="bg-white text-green-700 h-12 px-6 rounded-2xl text-xs font-black shadow-xl active:scale-95 transition-all flex items-center justify-center"
             >
               Mulai Scan
             </button>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <div className="flex justify-between items-center px-2">
          <h2 className="text-lg font-extrabold text-slate-800 dark:text-slate-100 tracking-tight">Misi Hari Ini</h2>
          <span className="text-[10px] font-black text-green-600 bg-green-50 px-3 py-1 rounded-full uppercase tracking-tighter">Reset 12j lagi</span>
        </div>
        <div className="space-y-3">
          {dailyMissions.map(mission => (
            <div key={mission.id} className="bg-white dark:bg-slate-900 p-4 rounded-3xl border border-slate-100 dark:border-slate-800 flex items-center space-x-4 shadow-sm">
              <div className="w-12 h-12 bg-slate-50 dark:bg-slate-800 rounded-2xl flex items-center justify-center text-xl shadow-inner">
                {mission.icon}
              </div>
              <div className="flex-1">
                <div className="flex justify-between items-center mb-1.5">
                  <h4 className="text-xs font-extrabold text-slate-800 dark:text-slate-200">{mission.title}</h4>
                  <span className="text-[10px] font-black text-amber-600">+{mission.reward} XP</span>
                </div>
                <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-green-500 transition-all duration-500" 
                    style={{ width: `${Math.min((mission.progress / mission.total) * 100, 100)}%` }}
                  ></div>
                </div>
              </div>
              <div className="text-[10px] font-black text-slate-400">
                {mission.progress}/{mission.total}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="space-y-4">
        <h2 className="text-lg font-extrabold text-slate-800 dark:text-slate-100 tracking-tight px-2">Dampak Lingkungan</h2>
        <div className="grid grid-cols-2 gap-4">
           <div className="bg-blue-600 rounded-[2.5rem] p-6 text-white flex flex-col items-center text-center shadow-lg shadow-blue-100 dark:shadow-none">
              <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center text-2xl mb-3">🌿</div>
              <p className="text-2xl font-black leading-none tracking-tight">{formatCarbon(user.totalCo2Saved)}</p>
              <p className="text-[9px] font-black text-blue-100 uppercase tracking-widest mt-2">Tabungan Karbon</p>
           </div>
           <div className="bg-slate-900 rounded-[2.5rem] p-6 text-white flex flex-col items-center text-center shadow-lg shadow-slate-200 dark:shadow-none">
              <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center text-2xl mb-3">📦</div>
              <p className="text-2xl font-black leading-none tracking-tight">{user.itemsScanned}</p>
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mt-2">Barang Didaur</p>
           </div>
        </div>
      </div>

      <div className="space-y-4">
        <div className="flex justify-between items-center px-2">
          <h2 className="text-lg font-extrabold text-slate-800 dark:text-slate-100 tracking-tight">Karya Terkini</h2>
          <button 
            onClick={() => setActiveTab(AppTab.COMMUNITY)}
            className="text-[10px] font-black text-green-600 uppercase tracking-widest"
          >
            Pasar Karya
          </button>
        </div>
        <div className="flex space-x-4 overflow-x-auto no-scrollbar -mx-6 px-6 pb-4">
           {posts.length > 0 ? posts.map((post: CommunityPost) => (
             <div key={post.id} className="flex-shrink-0 w-64 bg-white dark:bg-slate-900 rounded-[2.2rem] overflow-hidden shadow-sm border border-slate-100 dark:border-slate-800">
                <div className="relative">
                  <img src={post.imageUrl} className="w-full h-44 object-cover" />
                  <div className="absolute top-3 right-3 bg-white/90 backdrop-blur-md px-3 py-1 rounded-full text-[9px] font-black text-slate-900 uppercase tracking-widest">
                    {post.materialTag}
                  </div>
                </div>
                <div className="p-5">
                   <h3 className="font-extrabold text-slate-800 dark:text-slate-100 text-sm line-clamp-1">{post.itemName}</h3>
                   <div className="flex items-center justify-between mt-3">
                      <div className="flex items-center space-x-2">
                         <img src={post.userAvatar} className="w-6 h-6 rounded-lg object-cover" />
                         <span className="text-[10px] font-bold text-slate-500">{post.userName}</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <span className="text-[10px] text-rose-500">❤️</span>
                        <span className="text-[10px] font-black text-slate-400">{post.likes}</span>
                      </div>
                   </div>
                </div>
             </div>
           )) : (
             <div className="w-full py-10 bg-slate-50 dark:bg-slate-900/50 rounded-[2rem] border-2 border-dashed border-slate-200 dark:border-slate-800 flex flex-col items-center justify-center text-center px-10">
                <span className="text-3xl mb-2">🌱</span>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Belum ada karya baru</p>
             </div>
           )}
        </div>
      </div>

      <div 
        onClick={() => setActiveTab(AppTab.COMMUNITY)}
        className="bg-emerald-50 dark:bg-emerald-950/30 rounded-[2.5rem] p-6 border border-emerald-100 dark:border-emerald-800/30 flex items-center justify-between cursor-pointer active:scale-[0.98] transition-all group"
      >
         <div className="space-y-1">
            <h3 className="text-lg font-black text-emerald-800 dark:text-emerald-400">Pasar Didaur</h3>
            <p className="text-emerald-600/70 dark:text-emerald-500/60 text-[10px] font-medium max-w-[180px]">Miliki karya unik dari para pejuang lingkungan.</p>
         </div>
         <div className="w-14 h-14 bg-white dark:bg-emerald-900/50 rounded-2xl flex items-center justify-center text-3xl shadow-sm group-hover:rotate-12 transition-transform">🛍️</div>
      </div>
    </div>
  );
};

export default Home;