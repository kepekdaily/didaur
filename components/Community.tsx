
import React, { useState, useMemo, useEffect } from 'react';
import { CommunityPost, UserProfile, MarketplaceItem, Comment } from '../types';
import { 
  getCommunityPosts, 
  saveCommunityPost, 
  updateUserPoints, 
  getMarketItems, 
  purchaseMarketItem, 
  togglePostLike, 
  getPostComments, 
  savePostComment
} from '../utils/storage';

interface CommunityProps {
  onPointsUpdate: (updatedUser: UserProfile) => void;
  user: UserProfile;
  isDarkMode: boolean;
}

const Community: React.FC<CommunityProps> = ({ onPointsUpdate, user, isDarkMode }) => {
  const [posts, setPosts] = useState<CommunityPost[]>([]);
  const [marketItems, setMarketItems] = useState<MarketplaceItem[]>([]);
  const [activeView, setActiveView] = useState<'Inspirasi' | 'Pasar'>('Inspirasi');
  const [isUploading, setIsUploading] = useState(false);
  const [selectedMarketItem, setSelectedMarketItem] = useState<MarketplaceItem | null>(null);
  const [itemToConfirm, setItemToConfirm] = useState<MarketplaceItem | null>(null);
  const [viewingCommentsPostId, setViewingCommentsPostId] = useState<string | null>(null);
  const [currentComments, setCurrentComments] = useState<Comment[]>([]);
  const [newCommentText, setNewCommentText] = useState('');
  const [activeCategory, setActiveCategory] = useState('Semua');
  const [searchQuery, setSearchQuery] = useState('');
  const [notification, setNotification] = useState<{ message: string, type: 'success' | 'error', details?: string } | null>(null);
  
  const [newPost, setNewPost] = useState({ 
    itemName: '', 
    description: '', 
    image: '', 
    category: 'Plastik',
    isForSale: false,
    price: 0
  });

  const categories = ['Semua', 'Plastik', 'Kardus', 'Kaca', 'Logam', 'Tekstil'];

  const refreshPosts = async () => {
    try {
      const fetchedPosts = await getCommunityPosts();
      setPosts(fetchedPosts);
    } catch (e) {
      console.error("Gagal refresh posts:", e);
    }
  };

  useEffect(() => {
    const fetchData = async () => {
      await refreshPosts();
      const fetchedMarket = await getMarketItems();
      setMarketItems(fetchedMarket);
    };
    fetchData();
  }, []);

  const filteredPosts = useMemo(() => {
    return (posts || []).filter(p => {
      const matchesCategory = activeCategory === 'Semua' || p.materialTag === activeCategory;
      const matchesSearch = (p.itemName || '').toLowerCase().includes(searchQuery.toLowerCase()) || 
                            (p.description || '').toLowerCase().includes(searchQuery.toLowerCase());
      return matchesCategory && matchesSearch;
    });
  }, [posts, activeCategory, searchQuery]);

  const filteredAndSortedMarket = useMemo(() => {
    return (marketItems || []).filter(m => {
      const matchesCategory = activeCategory === 'Semua' || m.materialTag === activeCategory;
      const matchesSearch = (m.title || '').toLowerCase().includes(searchQuery.toLowerCase());
      return matchesCategory && matchesSearch;
    });
  }, [marketItems, activeCategory, searchQuery]);

  const handleLike = async (id: string) => {
    const postId = String(id);
    const isLiked = user.likedPosts.includes(postId);

    // Optimistic Update UI
    setPosts(prev => prev.map(p => 
      p.id === postId ? { ...p, likes: p.likes + (isLiked ? -1 : 1) } : p
    ));

    try {
      const updatedUser = await togglePostLike(postId, user.likedPosts);
      if (updatedUser) onPointsUpdate(updatedUser);
    } catch (err) {
      console.error("Gagal simpan Like ke database:", err);
      // Fallback
      refreshPosts();
    }
  };

  const handleOpenComments = async (postId: string) => {
    const targetId = String(postId);
    setViewingCommentsPostId(targetId);
    setCurrentComments([]);
    try {
      const comments = await getPostComments(targetId);
      setCurrentComments(comments);
    } catch (err) {
      console.error("Gagal memuat komentar:", err);
    }
  };

  const handleAddComment = async () => {
    const postId = viewingCommentsPostId;
    if (!newCommentText.trim() || !postId) return;
    
    const comment: Partial<Comment> = {
      userName: user.name,
      userAvatar: user.avatar,
      text: newCommentText,
      timestamp: Date.now()
    };
    
    try {
      // Optimistic count update
      setPosts(prev => prev.map(p => p.id === postId ? { ...p, comments: (p.comments || 0) + 1 } : p));
      
      const updatedUser = await savePostComment(postId, comment);
      
      const freshComments = await getPostComments(postId);
      setCurrentComments(freshComments);
      setNewCommentText('');
      
      if (updatedUser) onPointsUpdate(updatedUser);
      await refreshPosts();
    } catch (err) {
      alert("Maaf, gagal mengirim komentar.");
    }
  };

  const confirmPurchase = async () => {
    if (!itemToConfirm) return;
    const result = await purchaseMarketItem(itemToConfirm.id, itemToConfirm.price);
    if (result.success) {
      setNotification({ message: 'Pembelian Berhasil!', details: `-${itemToConfirm.price} XP dikurangi.`, type: 'success' });
      const freshMarket = await getMarketItems();
      setMarketItems(freshMarket);
      setSelectedMarketItem(null); 
      if (result.updatedUser) onPointsUpdate(result.updatedUser);
    } else {
      setNotification({ message: result.message || 'Error', type: 'error' });
    }
    setItemToConfirm(null);
    setTimeout(() => setNotification(null), 4000);
  };

  const handleUpload = async () => {
    if (!newPost.itemName || !newPost.image) return;
    setIsUploading(false);
    setNotification({ message: 'Mengunggah...', type: 'success' });

    try {
      const post: Partial<CommunityPost> = {
        userName: user.name,
        userAvatar: user.avatar,
        itemName: newPost.itemName,
        description: newPost.description,
        imageUrl: newPost.image,
        likes: 0,
        comments: 0,
        timestamp: Date.now(),
        pointsEarned: 250,
        materialTag: newPost.category,
        isForSale: newPost.isForSale,
        price: newPost.isForSale ? Number(newPost.price) : undefined
      };
      
      await saveCommunityPost(post);
      await refreshPosts();
      
      if (post.isForSale) {
        const freshMarket = await getMarketItems();
        setMarketItems(freshMarket);
      }
      
      const updated = await updateUserPoints(250, 0, false);
      if (updated) onPointsUpdate(updated);
      
      setNotification({ message: 'Karya Terpublikasi!', details: '+250 XP!', type: 'success' });
      setNewPost({ itemName: '', description: '', image: '', category: 'Plastik', isForSale: false, price: 0 });
    } catch (err) {
      setNotification({ message: 'Gagal Mengunggah', type: 'error' });
    } finally {
      setTimeout(() => setNotification(null), 3000);
    }
  };

  return (
    <div className="pb-24 animate-in fade-in duration-500">
      {notification && (
        <div className={`fixed top-6 left-6 right-6 z-[300] p-5 rounded-[2rem] shadow-2xl flex items-center space-x-4 border-2 ${
          notification.type === 'success' ? 'bg-slate-900 border-green-500 text-white' : 'bg-rose-600 border-rose-400 text-white'
        }`}>
          <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center text-xl">
            {notification.type === 'success' ? '✅' : '⚠️'}
          </div>
          <div className="flex-1">
            <p className="text-sm font-black uppercase tracking-widest">{notification.message}</p>
            {notification.details && <p className="text-[10px] opacity-70 font-bold">{notification.details}</p>}
          </div>
        </div>
      )}

      <div className="p-6 pb-2 space-y-5">
        <div className="flex justify-between items-center">
          <div className="flex bg-slate-100 dark:bg-slate-900 p-1.5 rounded-2xl space-x-1 shadow-inner">
             {['Inspirasi', 'Pasar'].map(v => (
               <button 
                key={v}
                onClick={() => { setActiveView(v as any); setSearchQuery(''); }}
                className={`px-6 py-2 rounded-xl text-xs font-black transition-all ${activeView === v ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 shadow-sm' : 'text-slate-400 dark:text-slate-600'}`}
               >
                 {v}
               </button>
             ))}
          </div>
          <button 
            onClick={() => setIsUploading(true)}
            className="w-12 h-12 bg-green-600 rounded-2xl shadow-xl flex items-center justify-center text-white active:scale-90 transition-transform"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M12 4v16m8-8H4" /></svg>
          </button>
        </div>

        <div className="flex space-x-3">
          <div className="relative group flex-1">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
            </div>
            <input 
              type="text"
              placeholder={`Cari di ${activeView}...`}
              className="w-full pl-11 pr-4 py-4 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl text-sm font-bold placeholder-slate-400 focus:ring-2 ring-green-500 focus:outline-none transition-all"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        <div className="flex space-x-3 overflow-x-auto no-scrollbar -mx-6 px-6 py-2">
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`flex-shrink-0 px-6 py-3 rounded-2xl text-[10px] font-black transition-all uppercase tracking-widest ${
                activeCategory === cat 
                ? 'bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900' 
                : 'bg-white dark:bg-slate-900 text-slate-400 dark:text-slate-600 border border-slate-100 dark:border-slate-800 shadow-sm'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {activeView === 'Inspirasi' ? (
        <div className="p-6 space-y-10">
          {filteredPosts.map(post => {
            const isLiked = user.likedPosts.includes(post.id);
            return (
              <div key={post.id} className="bg-white dark:bg-slate-900 rounded-[3rem] overflow-hidden shadow-2xl border border-slate-100 dark:border-slate-800 group animate-in slide-in-from-bottom-8 duration-700">
                <div className="p-6 flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <img src={post.userAvatar} loading="lazy" referrerPolicy="no-referrer" alt={post.userName} className="w-12 h-12 rounded-2xl object-cover shadow-sm" />
                    <div>
                      <h4 className="font-black text-slate-900 dark:text-slate-100 text-base leading-tight">{post.userName}</h4>
                      <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest mt-0.5">
                        {new Date(post.timestamp).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}
                      </p>
                    </div>
                  </div>
                </div>
                
                <div className="relative aspect-[4/5] overflow-hidden">
                  <img src={post.imageUrl} loading="lazy" referrerPolicy="no-referrer" alt={post.itemName} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-1000" />
                  <div className="absolute top-6 right-6">
                     <div className="bg-white/90 dark:bg-slate-950/90 backdrop-blur-md px-4 py-2 rounded-2xl text-[10px] font-black text-slate-900 dark:text-slate-100 uppercase tracking-widest shadow-lg">
                        {post.materialTag}
                     </div>
                  </div>
                </div>

                <div className="p-8 space-y-6">
                  <div className="flex items-center justify-between">
                     <div className="flex items-center space-x-6">
                        <button 
                          onClick={() => handleLike(post.id)} 
                          className={`flex items-center space-x-2 active:scale-125 transition-transform ${isLiked ? 'text-rose-500' : 'text-slate-400'}`}
                        >
                           <div className={`p-3 rounded-2xl ${isLiked ? 'bg-rose-50 dark:bg-rose-900/20' : 'bg-slate-100 dark:bg-slate-800'}`}>
                             <svg className="w-6 h-6 fill-current" viewBox="0 0 24 24"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg>
                           </div>
                           <span className="text-sm font-black">{post.likes || 0}</span>
                        </button>
                        <button onClick={() => handleOpenComments(post.id)} className="flex items-center space-x-2 text-slate-400">
                           <div className="p-3 bg-slate-100 dark:bg-slate-800 rounded-2xl">
                             <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>
                           </div>
                           <span className="text-sm font-black">{post.comments || 0}</span>
                        </button>
                     </div>
                     <div className="bg-green-600 text-white px-5 py-2 rounded-2xl text-[10px] font-black tracking-widest">
                       +250 XP
                     </div>
                  </div>
                  <div>
                     <h3 className="text-2xl font-black text-slate-900 dark:text-white leading-tight">{post.itemName}</h3>
                     <p className="text-sm text-slate-500 mt-2 italic line-clamp-2">"{post.description}"</p>
                  </div>
                </div>
              </div>
            );
          })}
          {filteredPosts.length === 0 && (
            <div className="text-center py-20 opacity-30">
               <span className="text-6xl">🌱</span>
               <p className="mt-4 font-black uppercase text-xs tracking-[0.2em]">Belum ada inspirasi</p>
            </div>
          )}
        </div>
      ) : (
        <div className="p-6 grid grid-cols-2 gap-4">
          {filteredAndSortedMarket.map(item => (
            <div 
              key={item.id} 
              onClick={() => setSelectedMarketItem(item)}
              className="bg-white dark:bg-slate-900 rounded-[2rem] overflow-hidden border border-slate-100 dark:border-slate-800 flex flex-col active:scale-95 transition-transform cursor-pointer group"
            >
               <div className="relative aspect-square overflow-hidden">
                  <img src={item.imageUrl} loading="lazy" referrerPolicy="no-referrer" alt={item.title} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
                  <div className="absolute top-2 right-2 bg-white/90 px-2 py-1 rounded-lg text-[9px] font-black text-slate-900 uppercase tracking-widest">
                    {item.materialTag}
                  </div>
               </div>
               <div className="p-4 flex flex-col flex-1 space-y-2">
                  <h4 className="text-xs font-black text-slate-800 dark:text-slate-100 line-clamp-2 leading-snug flex-1">{item.title}</h4>
                  <div className="flex items-center justify-between">
                    <span className="text-green-600 font-black text-sm">{item.price.toLocaleString('id-ID')} XP</span>
                  </div>
               </div>
            </div>
          ))}
        </div>
      )}

      {selectedMarketItem && (
        <div className="fixed inset-0 z-[200] bg-white dark:bg-slate-950 overflow-y-auto no-scrollbar">
           <div className="relative aspect-[4/5] w-full">
              <img src={selectedMarketItem.imageUrl} referrerPolicy="no-referrer" alt={selectedMarketItem.title} className="w-full h-full object-cover" />
              <button onClick={() => setSelectedMarketItem(null)} className="absolute top-6 left-6 w-12 h-12 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center text-white">
                 <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 19l-7-7 7-7" /></svg>
              </button>
           </div>
           <div className="p-8 -mt-10 relative bg-white dark:bg-slate-950 rounded-t-[3.5rem] space-y-8">
              <h1 className="text-3xl font-black text-slate-900 dark:text-slate-100 leading-tight">{selectedMarketItem.title}</h1>
              <div className="flex items-center space-x-3">
                 <span className="text-2xl font-black text-green-600">{selectedMarketItem.price.toLocaleString('id-ID')} XP</span>
              </div>
              <div className="flex items-center space-x-4 p-5 bg-slate-50 dark:bg-slate-900 rounded-[2rem]">
                 <img src={selectedMarketItem.sellerAvatar} referrerPolicy="no-referrer" alt={selectedMarketItem.sellerName} className="w-14 h-14 rounded-2xl object-cover shadow-sm" />
                 <div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Dibuat Oleh</p>
                    <p className="font-black text-slate-900 dark:text-slate-100">{selectedMarketItem.sellerName}</p>
                 </div>
              </div>
              <div className="pb-32">
                 <button onClick={() => setItemToConfirm(selectedMarketItem)} className="w-full bg-green-600 text-white py-5 rounded-[2.5rem] font-black text-lg shadow-xl active:scale-95 transition-all">DAPATKAN KARYA INI</button>
              </div>
           </div>
        </div>
      )}

      {viewingCommentsPostId && (
        <div className="fixed inset-0 z-[250] flex items-end justify-center bg-black/60 backdrop-blur-sm">
           <div className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-t-[3rem] h-[80vh] flex flex-col">
              <div className="p-8 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
                 <h2 className="text-2xl font-black text-slate-900 dark:text-white">Komentar</h2>
                 <button onClick={() => setViewingCommentsPostId(null)} className="w-10 h-10 bg-slate-100 dark:bg-slate-800 rounded-xl flex items-center justify-center text-slate-400">✕</button>
              </div>
              <div className="flex-1 overflow-y-auto p-8 space-y-6 no-scrollbar">
                 {currentComments.length > 0 ? currentComments.map(comment => (
                   <div key={comment.id} className="flex space-x-4">
                      <img src={comment.userAvatar} loading="lazy" referrerPolicy="no-referrer" alt={comment.userName} className="w-10 h-10 rounded-xl object-cover" />
                      <div className="flex-1">
                         <span className="text-xs font-black text-slate-900 dark:text-white">{comment.userName}</span>
                         <div className="bg-slate-50 dark:bg-slate-800 p-4 rounded-2xl mt-1 border border-slate-100 dark:border-slate-800">
                            <p className="text-sm text-slate-600 dark:text-slate-300 font-medium">{comment.text}</p>
                         </div>
                      </div>
                   </div>
                 )) : (
                   <div className="text-center py-20 opacity-30">
                     <p className="font-black text-xs uppercase tracking-widest">Belum ada komentar.</p>
                   </div>
                 )}
              </div>
              <div className="p-8 border-t border-slate-100 dark:border-slate-800 flex items-center space-x-3">
                 <input type="text" className="flex-1 bg-slate-100 dark:bg-slate-800 dark:text-white rounded-2xl p-4 text-sm font-bold outline-none focus:ring-2 ring-green-500" placeholder="Tulis pujian..." value={newCommentText} onChange={e => setNewCommentText(e.target.value)} />
                 <button onClick={handleAddComment} className="w-12 h-12 bg-green-600 text-white rounded-2xl flex items-center justify-center shadow-lg active:scale-90 transition-transform">➤</button>
              </div>
           </div>
        </div>
      )}

      {itemToConfirm && (
        <div className="fixed inset-0 z-[400] bg-black/80 backdrop-blur-md flex items-center justify-center p-6">
           <div className="bg-white dark:bg-slate-900 w-full max-w-sm rounded-[3rem] p-8 text-center space-y-6">
              <h2 className="text-2xl font-black text-slate-900 dark:text-white">Konfirmasi</h2>
              <p className="text-slate-500 font-medium text-sm">Beli item ini seharga <span className="text-green-600 font-black">{itemToConfirm.price.toLocaleString()} XP</span>?</p>
              <div className="flex flex-col space-y-3">
                 <button onClick={confirmPurchase} disabled={user.points < itemToConfirm.price} className="w-full bg-green-600 text-white py-5 rounded-2xl font-black text-lg active:scale-95 disabled:opacity-50">Konfirmasi</button>
                 <button onClick={() => setItemToConfirm(null)} className="w-full bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 py-5 rounded-2xl font-black text-lg active:scale-95">Batal</button>
              </div>
           </div>
        </div>
      )}

      {isUploading && (
        <div className="fixed inset-0 z-[150] bg-black/60 backdrop-blur-md flex items-end justify-center">
           <div className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-t-[3.5rem] p-8">
              <div className="flex justify-between items-center mb-6">
                 <h2 className="text-2xl font-black text-slate-900 dark:text-white">Bagikan Karya</h2>
                 <button onClick={() => setIsUploading(false)} className="w-10 h-10 bg-slate-100 dark:bg-slate-800 rounded-xl text-slate-400">✕</button>
              </div>
              <div className="space-y-4 max-h-[70vh] overflow-y-auto no-scrollbar pb-8">
                 <div onClick={() => document.getElementById('up-img')?.click()} className="w-full aspect-video bg-slate-50 dark:bg-slate-800 rounded-[2rem] border-2 border-dashed border-slate-200 dark:border-slate-700 flex flex-col items-center justify-center cursor-pointer overflow-hidden">
                    {newPost.image ? <img src={newPost.image} referrerPolicy="no-referrer" alt="Preview" className="w-full h-full object-cover" /> : <span className="text-xs font-black text-slate-400 uppercase">Upload Foto</span>}
                    <input type="file" id="up-img" hidden onChange={e => {
                      const f = e.target.files?.[0];
                      if(f){
                        const r = new FileReader();
                        r.onload = () => setNewPost({...newPost, image: r.result as string});
                        r.readAsDataURL(f);
                      }
                    }} />
                 </div>
                 <input type="text" placeholder="Judul Proyek..." className="w-full p-5 bg-slate-50 dark:bg-slate-800 dark:text-white rounded-2xl font-bold outline-none" value={newPost.itemName} onChange={e => setNewPost({...newPost, itemName: e.target.value})} />
                 <div className="flex items-center justify-between bg-amber-50 dark:bg-amber-950/20 p-6 rounded-[2rem]">
                    <span className="text-sm font-black text-amber-800 dark:text-amber-400">Pasarkan Karya?</span>
                    <input type="checkbox" className="w-6 h-6" checked={newPost.isForSale} onChange={e => setNewPost({...newPost, isForSale: e.target.checked})} />
                 </div>
                 {newPost.isForSale && <input type="number" placeholder="Harga (XP)..." className="w-full p-4 bg-slate-100 dark:bg-slate-800 dark:text-white rounded-xl font-black" value={newPost.price || ''} onChange={e => setNewPost({...newPost, price: Number(e.target.value)})} />}
                 <textarea placeholder="Ceritakan proses pembuatannya..." className="w-full p-5 bg-slate-50 dark:bg-slate-800 dark:text-white rounded-2xl font-medium h-24" value={newPost.description} onChange={e => setNewPost({...newPost, description: e.target.value})} />
                 <button onClick={handleUpload} disabled={!newPost.itemName || !newPost.image} className="w-full bg-green-600 text-white py-5 rounded-[2.5rem] font-black shadow-xl active:scale-95 disabled:opacity-50">PUBLIKASIKAN</button>
              </div>
           </div>
        </div>
      )}
    </div>
  );
};

export default Community;
