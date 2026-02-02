/**
 * Global Leaderboard System
 * 
 * Saves and retrieves player scores for the single player leaderboard.
 * Uses localStorage for persistence (in production, this would be a backend API).
 */

export type LeaderboardEntry = {
  id: string;
  username: string;
  score: number;
  correctAnswers: number;
  totalRounds: number;
  accuracy: number;
  playedAt: number;
  avatar: string;
};

const LEADERBOARD_KEY = 'aod_global_leaderboard';
const MAX_ENTRIES = 100; // Keep top 100 scores

// Get random avatar for new players
function getRandomAvatar(): string {
  const avatars = ['🦊', '🐼', '🦁', '🐯', '🐻', '🦄', '🐲', '🦅', '🐺', '🦋', '🌟', '⚡', '🔥', '💎', '🎯', '🚀', '🎮', '👾', '🤖', '🧠'];
  return avatars[Math.floor(Math.random() * avatars.length)];
}

// Generate unique ID
function generateId(): string {
  return `entry-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * Get all leaderboard entries sorted by score (highest first)
 */
export function getLeaderboard(): LeaderboardEntry[] {
  try {
    const raw = localStorage.getItem(LEADERBOARD_KEY);
    if (!raw) return [];
    const entries: LeaderboardEntry[] = JSON.parse(raw);
    // Sort by score (descending), then by accuracy, then by date (most recent first)
    return entries.sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      if (b.accuracy !== a.accuracy) return b.accuracy - a.accuracy;
      return b.playedAt - a.playedAt;
    });
  } catch {
    return [];
  }
}

/**
 * Add a new score to the leaderboard
 */
export function addToLeaderboard(
  username: string,
  score: number,
  correctAnswers: number,
  totalRounds: number
): LeaderboardEntry {
  const entries = getLeaderboard();
  
  const newEntry: LeaderboardEntry = {
    id: generateId(),
    username,
    score,
    correctAnswers,
    totalRounds,
    accuracy: Math.round((correctAnswers / totalRounds) * 100),
    playedAt: Date.now(),
    avatar: getRandomAvatar(),
  };
  
  entries.push(newEntry);
  
  // Sort and keep only top entries
  const sorted = entries.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    if (b.accuracy !== a.accuracy) return b.accuracy - a.accuracy;
    return b.playedAt - a.playedAt;
  }).slice(0, MAX_ENTRIES);
  
  try {
    localStorage.setItem(LEADERBOARD_KEY, JSON.stringify(sorted));
  } catch {
    // Storage full, try to save fewer entries
    try {
      localStorage.setItem(LEADERBOARD_KEY, JSON.stringify(sorted.slice(0, 50)));
    } catch {
      // Still failing, give up
    }
  }
  
  return newEntry;
}

/**
 * Get a player's best score
 */
export function getPlayerBestScore(username: string): LeaderboardEntry | null {
  const entries = getLeaderboard();
  const playerEntries = entries.filter(e => e.username.toLowerCase() === username.toLowerCase());
  if (playerEntries.length === 0) return null;
  return playerEntries[0]; // Already sorted by score
}

/**
 * Get a player's rank on the leaderboard
 */
export function getPlayerRank(username: string): number | null {
  const entries = getLeaderboard();
  const best = getPlayerBestScore(username);
  if (!best) return null;
  const rank = entries.findIndex(e => e.id === best.id);
  return rank === -1 ? null : rank + 1;
}

/**
 * Get all entries for a specific player
 */
export function getPlayerHistory(username: string): LeaderboardEntry[] {
  const entries = getLeaderboard();
  return entries.filter(e => e.username.toLowerCase() === username.toLowerCase());
}

/**
 * Get top N players
 */
export function getTopPlayers(n: number = 10): LeaderboardEntry[] {
  return getLeaderboard().slice(0, n);
}

/**
 * Get leaderboard stats
 */
export function getLeaderboardStats() {
  const entries = getLeaderboard();
  if (entries.length === 0) {
    return {
      totalPlayers: 0,
      totalGames: 0,
      highestScore: 0,
      averageScore: 0,
      averageAccuracy: 0,
    };
  }
  
  const uniquePlayers = new Set(entries.map(e => e.username.toLowerCase())).size;
  const totalScore = entries.reduce((sum, e) => sum + e.score, 0);
  const totalAccuracy = entries.reduce((sum, e) => sum + e.accuracy, 0);
  
  return {
    totalPlayers: uniquePlayers,
    totalGames: entries.length,
    highestScore: entries[0]?.score || 0,
    averageScore: Math.round(totalScore / entries.length),
    averageAccuracy: Math.round(totalAccuracy / entries.length),
  };
}

/**
 * Clear the entire leaderboard (admin function)
 */
export function clearLeaderboard(): void {
  try {
    localStorage.removeItem(LEADERBOARD_KEY);
  } catch {
    // Ignore
  }
}

/**
 * Format date for display
 */
export function formatPlayedAt(timestamp: number): string {
  const now = Date.now();
  const diff = now - timestamp;
  
  const minutes = Math.floor(diff / (1000 * 60));
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  
  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;
  
  return new Date(timestamp).toLocaleDateString();
}
