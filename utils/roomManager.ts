/**
 * Room Manager - Handles multiplayer room logic
 * 
 * Features:
 * - Create/join rooms with unique codes
 * - Track players in rooms
 * - Sync game state across players
 * - Weekly play limit tracking
 */

export type PlayerInRoom = {
  id: string;
  username: string;
  avatar: string;
  isHost: boolean;
  isReady: boolean;
  score: number;
  correctAnswers: number;
  currentVote?: 'trust' | 'doubt' | null;
  joinedAt: number;
};

export type RoomState = {
  roomCode: string;
  hostId: string;
  players: PlayerInRoom[];
  maxPlayers: number;
  status: 'waiting' | 'starting' | 'playing' | 'finished';
  currentRound: number;
  totalRounds: number;
  roundTimeLimit: number; // seconds per round
  scenarioSeed: string;
  createdAt: number;
  gameStartedAt?: number;
  gameEndedAt?: number;
};

export type WeeklyPlayRecord = {
  odl: number; // UTC timestamp of play
  roomCode: string;
  score: number;
  xp: number;
};

// Generate a random 6-character room code
export function generateRoomCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Excluded confusing chars: I, O, 0, 1
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

// Generate a unique player ID
export function generatePlayerId(): string {
  return `player-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

// Get random avatar emoji
export function getRandomAvatar(): string {
  const avatars = ['🦊', '🐼', '🦁', '🐯', '🐻', '🦄', '🐲', '🦅', '🐺', '🦋', '🌟', '⚡', '🔥', '💎', '🎯', '🚀'];
  return avatars[Math.floor(Math.random() * avatars.length)];
}

// Create a new room
export function createRoom(hostUsername: string, totalRounds: number = 10): RoomState {
  const hostId = generatePlayerId();
  const roomCode = generateRoomCode();
  
  return {
    roomCode,
    hostId,
    players: [{
      id: hostId,
      username: hostUsername,
      avatar: getRandomAvatar(),
      isHost: true,
      isReady: true,
      score: 0,
      correctAnswers: 0,
      currentVote: null,
      joinedAt: Date.now()
    }],
    maxPlayers: 10,
    status: 'waiting',
    currentRound: 0,
    totalRounds,
    roundTimeLimit: 45, // 45 seconds per round for longer games
    scenarioSeed: `room-${roomCode}-${Date.now()}`,
    createdAt: Date.now()
  };
}

// Join an existing room
export function joinRoom(room: RoomState, username: string): { room: RoomState; playerId: string } | null {
  if (room.status !== 'waiting') {
    return null; // Can't join a game in progress
  }
  if (room.players.length >= room.maxPlayers) {
    return null; // Room is full
  }
  if (room.players.some(p => p.username.toLowerCase() === username.toLowerCase())) {
    return null; // Username already taken in this room
  }
  
  const playerId = generatePlayerId();
  const newPlayer: PlayerInRoom = {
    id: playerId,
    username,
    avatar: getRandomAvatar(),
    isHost: false,
    isReady: false,
    score: 0,
    correctAnswers: 0,
    currentVote: null,
    joinedAt: Date.now()
  };
  
  return {
    room: {
      ...room,
      players: [...room.players, newPlayer]
    },
    playerId
  };
}

// Toggle player ready status
export function togglePlayerReady(room: RoomState, playerId: string): RoomState {
  return {
    ...room,
    players: room.players.map(p => 
      p.id === playerId ? { ...p, isReady: !p.isReady } : p
    )
  };
}

// Check if all players are ready
export function allPlayersReady(room: RoomState): boolean {
  return room.players.length >= 2 && room.players.every(p => p.isReady);
}

// Start the game
export function startGame(room: RoomState): RoomState {
  if (!allPlayersReady(room)) {
    return room;
  }
  return {
    ...room,
    status: 'playing',
    currentRound: 1,
    gameStartedAt: Date.now(),
    players: room.players.map(p => ({
      ...p,
      score: 0,
      correctAnswers: 0,
      currentVote: null
    }))
  };
}

// Record a player's vote
export function recordVote(room: RoomState, playerId: string, vote: 'trust' | 'doubt'): RoomState {
  return {
    ...room,
    players: room.players.map(p =>
      p.id === playerId ? { ...p, currentVote: vote } : p
    )
  };
}

// Check if all players have voted
export function allPlayersVoted(room: RoomState): boolean {
  return room.players.every(p => p.currentVote !== null);
}

// Advance to next round and update scores
export function advanceRound(
  room: RoomState, 
  consensus: 'trust' | 'doubt'
): RoomState {
  // Points per round: 100 total / totalRounds (same as single player)
  const pointsPerRound = Math.round(100 / room.totalRounds);
  
  const updatedPlayers = room.players.map(p => {
    const correct = p.currentVote === consensus;
    return {
      ...p,
      score: p.score + (correct ? pointsPerRound : 0),
      correctAnswers: p.correctAnswers + (correct ? 1 : 0),
      currentVote: null // Reset for next round
    };
  });

  const nextRound = room.currentRound + 1;
  const isFinished = nextRound > room.totalRounds;

  return {
    ...room,
    currentRound: isFinished ? room.currentRound : nextRound,
    status: isFinished ? 'finished' : 'playing',
    gameEndedAt: isFinished ? Date.now() : undefined,
    players: updatedPlayers
  };
}

// Get leaderboard sorted by score
export function getRoomLeaderboard(room: RoomState): PlayerInRoom[] {
  return [...room.players].sort((a, b) => {
    // Sort by score first, then by correct answers, then by join time (earlier = higher)
    if (b.score !== a.score) return b.score - a.score;
    if (b.correctAnswers !== a.correctAnswers) return b.correctAnswers - a.correctAnswers;
    return a.joinedAt - b.joinedAt;
  });
}

// Calculate XP based on position and performance
export function calculateXP(room: RoomState, playerId: string): number {
  const leaderboard = getRoomLeaderboard(room);
  const position = leaderboard.findIndex(p => p.id === playerId) + 1;
  const player = leaderboard.find(p => p.id === playerId);
  
  if (!player) return 0;
  
  // Base XP from score
  let xp = player.score;
  
  // Bonus XP for placement
  const placementBonus: Record<number, number> = {
    1: 50,  // 1st place
    2: 30,  // 2nd place  
    3: 15,  // 3rd place
  };
  xp += placementBonus[position] || 0;
  
  // Participation bonus (completed the game)
  if (room.status === 'finished') {
    xp += 10;
  }
  
  // Accuracy bonus (50%+ correct)
  const accuracy = player.correctAnswers / room.totalRounds;
  if (accuracy >= 0.8) xp += 25;
  else if (accuracy >= 0.6) xp += 15;
  else if (accuracy >= 0.5) xp += 5;
  
  return xp;
}

// ===== Weekly Play Limit System =====

const WEEKLY_STORAGE_KEY = 'aod_weekly_plays';

// Get the start of the current week (Sunday 00:00 UTC)
export function getWeekStart(): number {
  const now = new Date();
  const dayOfWeek = now.getUTCDay();
  const diff = now.getUTCDate() - dayOfWeek;
  const weekStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), diff, 0, 0, 0, 0));
  return weekStart.getTime();
}

// Get weekly play records from storage
export function getWeeklyPlays(): WeeklyPlayRecord[] {
  try {
    const raw = localStorage.getItem(WEEKLY_STORAGE_KEY);
    if (!raw) return [];
    const records: WeeklyPlayRecord[] = JSON.parse(raw);
    const weekStart = getWeekStart();
    // Filter to only this week's plays
    return records.filter(r => r.odl >= weekStart);
  } catch {
    return [];
  }
}

// Check if player can play this week
export function canPlayThisWeek(maxPlaysPerWeek: number = 1): boolean {
  const plays = getWeeklyPlays();
  return plays.length < maxPlaysPerWeek;
}

// Get remaining plays this week
export function getRemainingPlays(maxPlaysPerWeek: number = 1): number {
  const plays = getWeeklyPlays();
  return Math.max(0, maxPlaysPerWeek - plays.length);
}

// Get time until next week reset
export function getTimeUntilReset(): { days: number; hours: number; minutes: number } {
  const weekStart = getWeekStart();
  const nextWeekStart = weekStart + 7 * 24 * 60 * 60 * 1000;
  const now = Date.now();
  const diff = nextWeekStart - now;
  
  const days = Math.floor(diff / (24 * 60 * 60 * 1000));
  const hours = Math.floor((diff % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000));
  const minutes = Math.floor((diff % (60 * 60 * 1000)) / (60 * 1000));
  
  return { days, hours, minutes };
}

// Record a completed game
export function recordWeeklyPlay(roomCode: string, score: number, xp: number): void {
  const plays = getWeeklyPlays();
  plays.push({
    odl: Date.now(),
    roomCode,
    score,
    xp
  });
  try {
    localStorage.setItem(WEEKLY_STORAGE_KEY, JSON.stringify(plays));
  } catch {
    // Storage full or unavailable
  }
}

// Get this week's best score
export function getWeeklyBestScore(): number {
  const plays = getWeeklyPlays();
  if (plays.length === 0) return 0;
  return Math.max(...plays.map(p => p.score));
}

// Get total XP earned this week
export function getWeeklyTotalXP(): number {
  const plays = getWeeklyPlays();
  return plays.reduce((sum, p) => sum + p.xp, 0);
}

// ===== Expertise Level System =====

export type ExpertiseLevel = {
  level: number;
  title: string;
  minXP: number;
  badge: string;
};

export const EXPERTISE_LEVELS: ExpertiseLevel[] = [
  { level: 1, title: 'Novice', minXP: 0, badge: '🌱' },
  { level: 2, title: 'Apprentice', minXP: 100, badge: '📚' },
  { level: 3, title: 'Analyst', minXP: 300, badge: '🔍' },
  { level: 4, title: 'Expert', minXP: 600, badge: '⭐' },
  { level: 5, title: 'Master', minXP: 1000, badge: '🏆' },
  { level: 6, title: 'Grandmaster', minXP: 1500, badge: '👑' },
  { level: 7, title: 'Legend', minXP: 2500, badge: '💎' },
];

const TOTAL_XP_KEY = 'aod_total_xp';

// Get total lifetime XP
export function getTotalXP(): number {
  try {
    return parseInt(localStorage.getItem(TOTAL_XP_KEY) || '0', 10);
  } catch {
    return 0;
  }
}

// Add XP to lifetime total
export function addTotalXP(xp: number): number {
  const current = getTotalXP();
  const newTotal = current + xp;
  try {
    localStorage.setItem(TOTAL_XP_KEY, newTotal.toString());
  } catch {
    // Storage unavailable
  }
  return newTotal;
}

// Get current expertise level
export function getExpertiseLevel(totalXP?: number): ExpertiseLevel {
  const xp = totalXP ?? getTotalXP();
  for (let i = EXPERTISE_LEVELS.length - 1; i >= 0; i--) {
    if (xp >= EXPERTISE_LEVELS[i].minXP) {
      return EXPERTISE_LEVELS[i];
    }
  }
  return EXPERTISE_LEVELS[0];
}

// Get XP needed for next level
export function getXPToNextLevel(totalXP?: number): { current: number; needed: number; progress: number } | null {
  const xp = totalXP ?? getTotalXP();
  const currentLevel = getExpertiseLevel(xp);
  const nextLevelIndex = EXPERTISE_LEVELS.findIndex(l => l.level === currentLevel.level + 1);
  
  if (nextLevelIndex === -1) {
    return null; // Max level reached
  }
  
  const nextLevel = EXPERTISE_LEVELS[nextLevelIndex];
  const current = xp - currentLevel.minXP;
  const needed = nextLevel.minXP - currentLevel.minXP;
  const progress = Math.round((current / needed) * 100);
  
  return { current, needed, progress };
}

// ===== Game Duration Helpers =====

// Calculate estimated game duration in minutes
export function estimateGameDuration(totalRounds: number, secondsPerRound: number): number {
  // Account for: voting time + consensus time (~5s) + UI transitions (~3s)
  const timePerRound = secondsPerRound + 8;
  const totalSeconds = totalRounds * timePerRound;
  return Math.ceil(totalSeconds / 60);
}

// Recommended configurations for target durations
export const GAME_PRESETS = {
  quick: { rounds: 5, timer: 30, estimated: '5 min' },
  standard: { rounds: 10, timer: 45, estimated: '10 min' },
  extended: { rounds: 15, timer: 45, estimated: '15 min' },
} as const;

export type GamePreset = keyof typeof GAME_PRESETS;
