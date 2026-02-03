import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { CommunityPost, UserProfile, LeaderboardEntry, MarketplaceItem, Comment, Badge, RecyclingRecommendation } from '../types';

const SUPABASE_URL_ENV = process.env.SUPABASE_URL || '';
const SUPABASE_ANON_KEY_ENV = process.env.SUPABASE_ANON_KEY || '';

const DUMMY_URL = 'https://your-project.supabase.co';
const DUMMY_KEY = 'your-anon-key';

export const supabase: SupabaseClient = createClient(
  SUPABASE_URL_ENV && SUPABASE_URL_ENV.startsWith('http') ? SUPABASE_URL_ENV : DUMMY_URL, 
  SUPABASE_ANON_KEY_ENV && SUPABASE_ANON_KEY_ENV.length > 0 ? SUPABASE_ANON_KEY_ENV : DUMMY_KEY
);

const STORAGE_KEY_THEME = 'didaur_theme_v5';
const STORAGE_KEY_HISTORY = 'didaur_history_v5';
const STORAGE_KEY_LIKED = 'didaur_liked_posts_v5';

const mapProfile = (data: any): UserProfile => ({
  id: data.id,
  email: data.email,
  name: data.name,
  points: data.points || 0,
  rank: data.rank || 'Pemula Hijau',
  itemsScanned: data.items_scanned || 0,
  plasticItemsScanned: data.plastic_items_scanned || 0,
  commentsMade: data.comments_made || 0,
  creationsShared: data.creations_shared || 0,
  totalCo2Saved: data.total_co2_saved || 0,
  avatar: data.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${data.id}`,
  badges: data.badges || []
});

const mapPost = (p: any): CommunityPost => ({
  id: p.id,
  userName: p.user_name,
  userAvatar: p.user_avatar,
  itemName: p.item_name,
  description: p.description,
  imageUrl: p.image_url,
  likes: p.likes || 0,
  comments: p.comments || 0,
  timestamp: new Date(p.created_at).getTime(),
  pointsEarned: 250,
  materialTag: p.material_tag,
  isForSale: p.is_for_sale,
  price: p.price
});

export const isCloudConfigured = (): boolean => {
  return !!SUPABASE_URL_ENV && SUPABASE_URL_ENV !== DUMMY_URL && !!SUPABASE_ANON_KEY_ENV;
};

export const fetchProfile = async (userId: string): Promise<UserProfile | null> => {
  if (!isCloudConfigured()) return null;
  try {
    const { data, error } = await supabase.from('profiles').select('*').eq('id', userId).single();
    if (error) throw error;
    return mapProfile(data);
  } catch (e) {
    console.error("Gagal mengambil profil:", e);
    return null;
  }
};

export const getCurrentUser = async (): Promise<UserProfile | null> => {
  if (!isCloudConfigured()) return null;
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return null;
  return await fetchProfile(session.user.id);
};

export const logoutUser = async () => {
  await supabase.auth.signOut();
};

export const getCommunityPosts = async (): Promise<CommunityPost[]> => {
  if (!isCloudConfigured()) return [];
  const { data } = await supabase.from('posts').select('*').order('created_at', { ascending: false });
  return (data || []).map((p: any) => mapPost(p));
};

export const saveCommunityPost = async (post: Partial<CommunityPost>) => {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return;
  await supabase.from('posts').insert({
    user_id: session.user.id,
    user_name: post.userName,
    user_avatar: post.userAvatar,
    item_name: post.itemName,
    description: post.description,
    image_url: post.imageUrl,
    material_tag: post.material_tag,
    is_for_sale: post.isForSale,
    price: post.price
  });
};

export const updateUserPoints = async (pointsToAdd: number, co2ToAdd: number = 0, isScan: boolean = true): Promise<UserProfile | null> => {
  const user = await getCurrentUser();
  if (!user) return null;

  const newPoints = user.points + pointsToAdd;
  const newCo2 = user.totalCo2Saved + co2ToAdd;
  const newItemsScanned = isScan ? user.itemsScanned + 1 : user.itemsScanned;

  let newRank = user.rank;
  if (newPoints > 5000) newRank = "Legenda Hijau";
  else if (newPoints > 2000) newRank = "Pahlawan Ekosistem";
  else if (newPoints > 500) newRank = "Pejuang Daur";

  const { data, error } = await supabase.from('profiles').update({
    points: newPoints,
    total_co2_saved: newCo2,
    items_scanned: newItemsScanned,
    rank: newRank
  }).eq('id', user.id).select().single();

  return data ? mapProfile(data) : null;
};

export const getLeaderboard = async (): Promise<LeaderboardEntry[]> => {
  if (!isCloudConfigured()) return [];
  const { data } = await supabase.from('profiles').select('id, name, points, avatar').order('points', { ascending: false }).limit(20);
  return (data || []).map((u: any, i: number) => ({
    id: u.id,
    name: u.name,
    points: u.points,
    avatar: u.avatar,
    rank: i + 1
  }));
};

export const getScanHistory = (): RecyclingRecommendation[] => {
  const saved = localStorage.getItem(STORAGE_KEY_HISTORY);
  return saved ? JSON.parse(saved) : [];
};

export const saveScanToHistory = (item: RecyclingRecommendation) => {
  const history = getScanHistory();
  const newHistory = [item, ...history.filter(h => h.itemName !== item.itemName)].slice(0, 20);
  localStorage.setItem(STORAGE_KEY_HISTORY, JSON.stringify(newHistory));
};

export const updateAccountInfo = async (name: string, avatar: string): Promise<UserProfile | null> => {
  const user = await getCurrentUser();
  if (!user) return null;
  const { data } = await supabase.from('profiles').update({ name, avatar }).eq('id', user.id).select().single();
  return data ? mapProfile(data) : null;
};

export const getThemePreference = () => localStorage.getItem(STORAGE_KEY_THEME) === 'dark';
export const setThemePreference = (isDark: boolean) => localStorage.setItem(STORAGE_KEY_THEME, isDark ? 'dark' : 'light');

export const getMarketItems = async (): Promise<MarketplaceItem[]> => {
  if (!isCloudConfigured()) return [];
  const { data } = await supabase.from('posts').select('*').eq('is_for_sale', true).order('created_at', { ascending: false });
  return (data || []).map((p: any) => ({
    id: p.id,
    sellerName: p.user_name,
    sellerAvatar: p.user_avatar,
    title: p.item_name,
    description: p.description,
    price: p.price,
    imageUrl: p.image_url,
    materialTag: p.material_tag,
    timestamp: new Date(p.created_at).getTime()
  }));
};

export const purchaseMarketItem = async (itemId: string, price: number) => {
  const user = await getCurrentUser();
  if (!user || user.points < price) return { success: false, message: 'XP Tidak Cukup.' };
  const updatedUser = await updateUserPoints(-price, 0, false);
  return { success: !!updatedUser, updatedUser };
};

export const getPostComments = async (postId: string): Promise<Comment[]> => {
  if (!isCloudConfigured()) return [];
  const { data } = await supabase.from('comments').select('*').eq('post_id', postId).order('created_at', { ascending: true });
  return (data || []).map((c: any) => ({
    id: c.id,
    userName: c.user_name,
    userAvatar: c.user_avatar,
    text: c.text,
    timestamp: new Date(c.created_at).getTime()
  }));
};

export const savePostComment = async (postId: string, comment: Partial<Comment>): Promise<UserProfile | null> => {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return null;

  // Simpan komentar baru
  await supabase.from('comments').insert({
    post_id: postId,
    user_id: session.user.id,
    user_name: comment.userName,
    user_avatar: comment.userAvatar,
    text: comment.text
  });

  // Ambil jumlah komentar saat ini dan update tabel posts
  const { data: postData } = await supabase.from('posts').select('comments').eq('id', postId).single();
  await supabase.from('posts').update({ comments: (postData?.comments || 0) + 1 }).eq('id', postId);

  return await updateUserPoints(10, 0, false);
};

export const getLikedPosts = (): Set<string> => {
  const saved = localStorage.getItem(STORAGE_KEY_LIKED);
  // Fix: Explicitly type the Set constructor to Set<string> to prevent Set<unknown> inference
  return new Set<string>(saved ? JSON.parse(saved) : []);
};

export const saveLikedPosts = (likedSet: Set<string>) => {
  localStorage.setItem(STORAGE_KEY_LIKED, JSON.stringify(Array.from(likedSet)));
};

export const updatePostLikes = async (id: string) => {
  const { data } = await supabase.from('posts').select('likes').eq('id', id).single();
  await supabase.from('posts').update({ likes: (data?.likes || 0) + 1 }).eq('id', id);
};

export const BADGES: Badge[] = [
  { id: '1', name: 'Pejuang Pertama', icon: '🌱', description: 'Scan barang pertamamu', unlocked: true, requirement: '1 scan' },
  { id: '2', name: 'Pahlawan Plastik', icon: '♻️', description: 'Scan 10 barang plastik', unlocked: false, requirement: '10 scans' },
  { id: '3', name: 'Inspirator Muda', icon: '✨', description: 'Bagikan 5 karya kreatif', unlocked: false, requirement: '5 shares' },
];

export const getDatabaseStats = () => ({ kb: 'Cloud', totalStorageUsed: 'Sync Aktif' });
export const generateSyncCode = () => "SYNC-" + Math.random().toString(36).substr(2, 9).toUpperCase();
export const importFromSyncCode = (c: string) => true;
export const clearDatabase = () => localStorage.clear();
