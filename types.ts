
export enum AppTab {
  HOME = 'home',
  SCAN = 'scan',
  COMMUNITY = 'community',
  LEADERBOARD = 'leaderboard',
  PROFILE = 'profile'
}

export interface DIYIdea {
  title: string;
  description: string;
  steps: string[];
  toolsNeeded: string[];
  timeEstimate: string;
  imageUrl?: string;
}

export interface RecyclingRecommendation {
  id?: string;
  itemName: string;
  materialType: string;
  difficulty: 'Mudah' | 'Sedang' | 'Sulit';
  estimatedPoints: number;
  co2Impact: number;
  diyIdeas: DIYIdea[];
  timestamp?: number;
  originalImage?: string; // Menyimpan foto asli hasil scan
}

export interface Comment {
  id: string;
  userName: string;
  userAvatar: string;
  text: string;
  timestamp: number;
}

export interface MarketplaceItem {
  id: string;
  sellerName: string;
  sellerAvatar: string;
  title: string;
  description: string;
  price: number;
  imageUrl: string;
  materialTag: string;
  timestamp: number;
}

export interface PurchasedItem {
  id: string;
  title: string;
  price: number;
  imageUrl: string;
  purchaseDate: number;
}

export interface CommunityPost {
  id: string;
  userName: string;
  userAvatar: string;
  itemName: string;
  description: string;
  imageUrl: string;
  likes: number;
  comments: number;
  timestamp: number;
  pointsEarned: number;
  materialTag: string;
  isForSale?: boolean;
  price?: number;
}

export interface Badge {
  id: string;
  name: string;
  icon: string;
  description: string;
  unlocked: boolean;
  requirement: string;
}

export interface UserProfile {
  id: string;
  email: string;
  name: string;
  points: number;
  rank: string;
  itemsScanned: number;
  plasticItemsScanned: number;
  commentsMade: number;
  creationsShared: number;
  totalCo2Saved: number;
  avatar: string;
  badges: string[]; // IDs of unlocked badges
  purchasedItems?: PurchasedItem[];
}

export interface LeaderboardEntry {
  id: string;
  name: string;
  points: number;
  avatar: string;
  rank: number;
}
