import React, { useState, useEffect } from 'react';
import { getLeaderboard, getCurrentUser } from '../utils/storage';
import { LeaderboardEntry, UserProfile } from '../types';

interface LeaderboardProps {
  isDarkMode: boolean;
}

const Leaderboard: React.FC<LeaderboardProps> = ({ isDarkMode }) => {
  const [activeTab, setActiveTab] = useState('Mingguan');
  const [players, setPlayers] = useState<LeaderboardEntry[]>([]);
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);

  /* Fetch leaderboard and user profile secara eksplisit */
  useEffect(() => {
    const fetchData = async () => {
      try {
        const fetchedPlayers: LeaderboardEntry[] = await getLeaderboard();
        const user: UserProfile | null = await getCurrentUser();
        setPlayers(fetchedPlayers);
        setCurrentUser(user);
      } catch (error) {
        console.error("Gagal memuat data leaderboard:", error);
      }
    };
    fetchData();
  }, []);

  const top3 = players.slice(0, 3);
  const rest = players.slice(3);

  return (
    <div className="pb-24 animate-in fade-in duration-500">
      <div className="p-8 pb-4 space-y-6 text-center">
         <div>
            <h1 className={`text-3xl font-black tracking-tight ${isDarkMode ? 'text-slate-100' : 'text-slate-900'}`}>Papan Peringkat</h1>
            <p className={`${isDarkMode ? 'text-slate-400' : 'text-slate-500'} font-medium mt-1`}>Siapa yang paling hijau minggu ini?</p>
         </div>

         {/* Time Filter Tabs */}
         <div className={`${isDarkMode ? 'bg-slate-900' : 'bg-slate-100'} p-1.5 rounded-2xl flex space-x-1 shadow-inner`}>
            {['Mingguan', 'Seluruh Waktu'].map((tab: string) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`flex-1 py-3 rounded-xl text-xs font-black transition-all ${
                  activeTab === tab 
                  ? (isDarkMode ? 'bg-slate-800 text-slate-100 shadow-md' : 'bg-white text-slate-900 shadow-md') 
                  : (isDarkMode ? 'text-slate-500' : 'text-slate-400')
                }`}
              >
                {tab}
              </button>
            ))}
         </div>
      </div>

      {/* Podium Visualization */}
      <div className="px-6 flex justify-center items-end space-x-4 h-72 mb-12 mt-4 relative">
        <div className="absolute inset-0 flex items-center justify-center opacity-10 blur-3xl -z-10">
           <div className="w-64 h-64 bg-amber-400 rounded-full"></div>
        </div>

        {/* 2nd Place */}
        <div className="flex-1 flex flex-col items-center">
          <div className="relative group">
            <div className="absolute -inset-1 bg-slate-300 rounded-[1.5rem] blur-sm opacity-50"></div>
            {top3[1] && <img src={top3[1].avatar} className="relative w-16 h-16 rounded-[1.5rem] border-4 border-white dark:border-slate-800 shadow-xl object-cover" />}
            <div className="absolute -bottom-2 -right-2 w-8 h-8 bg-slate-300 rounded-2xl flex items-center justify-center text-xs font-black text-white shadow-lg border-2 border-white">2</div>
          </div>
          <p className={`mt-4 font-black text-xs text-center line-clamp-1 ${isDarkMode ? 'text-slate-200' : 'text-slate-800'}`}>{top3[1]?.name || '-'}</p>
          <div className={`w-full ${isDarkMode ? 'bg-slate-800/50' : 'bg-slate-200/50'} backdrop-blur-sm h-28 rounded-t-[2.5rem] mt-3 flex flex-col items-center justify-center border-t-2 ${isDarkMode ? 'border-slate-700' : 'border-slate-300'}`}>
             <span className={`${isDarkMode ? 'text-slate-100' : 'text-slate-800'} font-black text-lg`}>{top3[1]?.points.toLocaleString() || 0}</span>
             <span className={`text-[10px] font-black uppercase tracking-widest ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>XP</span>
          </div>
        </div>

        {/* 1st Place */}
        <div className="flex-1 flex flex-col items-center">
          <div className="relative -mt-10 group">
            <div className="absolute -top-10 left-1/2 -translate-x-1/2 text-4xl animate-bounce">👑</div>
            <div className="absolute -inset-2 bg-amber-400 rounded-[2rem] blur-md opacity-40"></div>
            {top3[0] && <img src={top3[0].avatar} className="relative w-24 h-24 rounded-[2rem] border-4 border-amber-400 shadow-2xl shadow-amber-200 object-cover" />}
            <div className="absolute -bottom-2 -right-2 w-10 h-10 bg-amber-400 rounded-2xl flex items-center justify-center text-sm font-black text-white shadow-lg border-2 border-white">1</div>
          </div>
          <p className={`mt-4 font-black text-sm text-center line-clamp-1 ${isDarkMode ? 'text-slate-100' : 'text-slate-900'}`}>{top3[0]?.name || '-'}</p>
          <div className="w-full bg-gradient-to-b from-amber-400 to-amber-500 h-40 rounded-t-[3rem] mt-3 flex flex-col items-center justify-center shadow-xl shadow-amber-100 dark:shadow-none">
             <span className="text-white font-black text-2xl drop-shadow-md">{top3[0]?.points.toLocaleString() || 0}</span>
             <span className="text-[10px] font-black text-amber-100 uppercase tracking-widest px-1 text-center">Pahlawan Utama</span>
          </div>
        </div>

        {/* 3rd Place */}
        <div className="flex-1 flex flex-col items-center">
          <div className="relative group">
            <div className="absolute -inset-1 bg-orange-400 rounded-[1.5rem] blur-sm opacity-50"></div>
            {top3[2] && <img src={top3[2].avatar} className="relative w-16 h-16 rounded-[1.5rem] border-4 border-white dark:border-slate-800 shadow-xl object-cover" />}
            <div className="absolute -bottom-2 -right-2 w-8 h-8 bg-orange-400 rounded-2xl flex items-center justify-center text-xs font-black text-white shadow-lg border-2 border-white">3</div>
          </div>
          <p className={`mt-4 font-black text-xs text-center line-clamp-1 ${isDarkMode ? 'text-slate-200' : 'text-slate-800'}`}>{top3[2]?.name || '-'}</p>
          <div className={`w-full ${isDarkMode ? 'bg-orange-900/30' : 'bg-orange-100'} h-20 rounded-t-[2.5rem] mt-3 flex flex-col items-center justify-center border-t-2 ${isDarkMode ? 'border-orange-900/50' : 'border-orange-200'}`}>
             <span className={`${isDarkMode ? 'text-orange-400' : 'text-orange-700'} font-black text-lg`}>{top3[2]?.points.toLocaleString() || 0}</span>
             <span className={`text-[10px] font-black uppercase tracking-widest ${isDarkMode ? 'text-orange-300/50' : 'text-orange-400'}`}>XP</span>
          </div>
        </div>
      </div>

      {/* Other Players List */}
      <div className="px-6 space-y-4">
        <h3 className={`font-black text-xl tracking-tight px-2 ${isDarkMode ? 'text-slate-100' : 'text-slate-900'}`}>Global Ranking</h3>
        <div className="space-y-3">
          {rest.map((player: LeaderboardEntry, idx: number) => (
            <div 
              key={player.id} 
              className={`p-4 rounded-[2rem] flex items-center justify-between border shadow-sm transition-all hover:translate-x-1 ${
                currentUser && player.id === currentUser.id ? 'bg-green-600 border-green-700 shadow-green-100 dark:shadow-none' : (isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-100')
              } animate-in fade-in slide-in-from-right-4`}
              style={{ animationDelay: `${idx * 50}ms` }}
            >
              <div className="flex items-center space-x-4">
                <span className={`font-black text-sm w-8 text-center ${currentUser && player.id === currentUser.id ? 'text-white/60' : 'text-slate-300 dark:text-slate-600'}`}>
                  #{player.rank}
                </span>
                <img src={player.avatar} className="w-12 h-12 rounded-2xl object-cover shadow-sm border-2 border-white dark:border-slate-800" />
                <p className={`font-black text-sm ${currentUser && player.id === currentUser.id ? 'text-white' : (isDarkMode ? 'text-slate-200' : 'text-slate-800')}`}>
                  {player.name} {currentUser && player.id === currentUser.id && '(Kamu)'}
                </p>
              </div>
              <div className="text-right">
                <p className={`font-black ${currentUser && player.id === currentUser.id ? 'text-white' : (isDarkMode ? 'text-green-400' : 'text-green-600')}`}>
                  {player.points.toLocaleString()}
                </p>
                <p className={`text-[9px] font-bold uppercase tracking-widest ${currentUser && player.id === currentUser.id ? 'text-green-200' : (isDarkMode ? 'text-slate-500' : 'text-slate-400')}`}>
                  Total XP
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Floating Bottom Rank - Only if user not in Top 3 */}
      {currentUser && !top3.some((p: LeaderboardEntry) => p.id === currentUser.id) && (
        <div className="fixed bottom-24 left-6 right-6 z-50 animate-in slide-in-from-bottom-2 duration-500">
           <div className={`bg-slate-900 dark:bg-slate-800 rounded-[2rem] p-5 shadow-2xl flex items-center justify-between border border-white/5`}>
              <div className="flex items-center space-x-4">
                 <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center font-black text-white">
                    #{players.find((p: LeaderboardEntry) => p.id === currentUser.id)?.rank || '?'}
                 </div>
                 <div className="text-white">
                    <p className="font-black text-sm">{currentUser.name}</p>
                    <p className="text-[10px] font-black text-white/40 uppercase tracking-widest">Posisi Kamu</p>
                 </div>
              </div>
              <div className="bg-green-500 text-slate-900 px-4 py-2 rounded-2xl font-black text-xs shadow-lg">
                +{5000 - currentUser.points} XP Lagi
              </div>
           </div>
        </div>
      )}
    </div>
  );
};

export default Leaderboard;