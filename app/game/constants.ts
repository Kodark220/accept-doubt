export type GameMode = 'single' | 'multi';

// Default rounds for single player - multiplayer uses room settings
export const TOTAL_ROUNDS = 5;

// Multiplayer room configurations
export const ROOM_PRESETS = {
  quick: { rounds: 5, timer: 30, label: 'Quick (~5 min)' },
  standard: { rounds: 10, timer: 45, label: 'Standard (~10 min)' },
  extended: { rounds: 15, timer: 45, label: 'Extended (~15 min)' },
} as const;

export type RoomPreset = keyof typeof ROOM_PRESETS;

// Timer settings
export const DEFAULT_ROUND_TIMER = 30; // seconds
export const MULTIPLAYER_ROUND_TIMER = 45; // seconds - longer for group play

// Weekly play limits
export const MAX_WEEKLY_PLAYS = 1; // Can play multiplayer once per week
