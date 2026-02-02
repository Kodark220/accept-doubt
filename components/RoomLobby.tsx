'use client';

import { useState, useEffect } from 'react';
import {
  RoomState,
  PlayerInRoom,
  createRoom,
  joinRoom,
  togglePlayerReady,
  allPlayersReady,
  startGame,
  getRandomAvatar,
  canPlayThisWeek,
  getRemainingPlays,
  getTimeUntilReset,
  getExpertiseLevel,
  getTotalXP,
  getXPToNextLevel,
  GAME_PRESETS,
  GamePreset,
} from '../utils/roomManager';

type RoomLobbyProps = {
  username: string;
  onGameStart: (room: RoomState, playerId: string) => void;
  onBack: () => void;
};

export default function RoomLobby({ username, onGameStart, onBack }: RoomLobbyProps) {
  const [view, setView] = useState<'menu' | 'create' | 'join' | 'waiting'>('menu');
  const [room, setRoom] = useState<RoomState | null>(null);
  const [playerId, setPlayerId] = useState<string | null>(null);
  const [joinCode, setJoinCode] = useState('');
  const [error, setError] = useState('');
  const [selectedPreset, setSelectedPreset] = useState<GamePreset>('standard');
  
  // Weekly limit check
  const [canPlay, setCanPlay] = useState(true);
  const [remainingPlays, setRemainingPlays] = useState(1);
  const [resetTime, setResetTime] = useState({ days: 0, hours: 0, minutes: 0 });
  
  // Expertise level
  const [expertise, setExpertise] = useState(getExpertiseLevel());
  const [xpProgress, setXpProgress] = useState(getXPToNextLevel());
  const [totalXP, setTotalXP] = useState(0);

  useEffect(() => {
    setCanPlay(canPlayThisWeek());
    setRemainingPlays(getRemainingPlays());
    setResetTime(getTimeUntilReset());
    setTotalXP(getTotalXP());
    setExpertise(getExpertiseLevel());
    setXpProgress(getXPToNextLevel());
  }, []);

  const handleCreateRoom = () => {
    if (!canPlay) {
      setError('You\'ve reached your weekly play limit. Come back next week for fresh content!');
      return;
    }
    
    const preset = GAME_PRESETS[selectedPreset];
    const newRoom = createRoom(username, preset.rounds);
    newRoom.roundTimeLimit = preset.timer;
    
    setRoom(newRoom);
    setPlayerId(newRoom.hostId);
    setView('waiting');
    setError('');
  };

  const handleJoinRoom = () => {
    if (!canPlay) {
      setError('You\'ve reached your weekly play limit. Come back next week!');
      return;
    }
    
    const code = joinCode.toUpperCase().trim();
    if (code.length !== 6) {
      setError('Please enter a valid 6-character room code');
      return;
    }
    
    // In a real implementation, this would fetch the room from a server
    // For now, we'll simulate with localStorage
    const storedRoom = getStoredRoom(code);
    if (!storedRoom) {
      setError('Room not found. Check the code and try again.');
      return;
    }
    
    const result = joinRoom(storedRoom, username);
    if (!result) {
      setError('Could not join room. It may be full or already started.');
      return;
    }
    
    setRoom(result.room);
    setPlayerId(result.playerId);
    storeRoom(result.room);
    setView('waiting');
    setError('');
  };

  const handleToggleReady = () => {
    if (!room || !playerId) return;
    const updated = togglePlayerReady(room, playerId);
    setRoom(updated);
    storeRoom(updated);
  };

  const handleStartGame = () => {
    if (!room || !playerId) return;
    if (!allPlayersReady(room)) {
      setError('All players must be ready to start');
      return;
    }
    const started = startGame(room);
    setRoom(started);
    storeRoom(started);
    onGameStart(started, playerId);
  };

  const isHost = room?.hostId === playerId;
  const currentPlayer = room?.players.find(p => p.id === playerId);

  // Simulate real-time updates (in production, use WebSocket)
  useEffect(() => {
    if (!room || view !== 'waiting') return;
    
    const interval = setInterval(() => {
      const updated = getStoredRoom(room.roomCode);
      if (updated && updated.status === 'playing' && room.status !== 'playing') {
        setRoom(updated);
        onGameStart(updated, playerId!);
      } else if (updated) {
        setRoom(updated);
      }
    }, 1000);
    
    return () => clearInterval(interval);
  }, [room, view, playerId, onGameStart]);

  // Store room on creation
  useEffect(() => {
    if (room && view === 'waiting') {
      storeRoom(room);
    }
  }, [room, view]);

  return (
    <div className="space-y-6">
      {/* Header with expertise level */}
      <div className="flex items-center justify-between">
        <button onClick={onBack} className="text-sm text-gray-400 hover:text-white">
          ← Back
        </button>
        <div className="flex items-center gap-3 bg-white/5 rounded-xl px-4 py-2">
          <span className="text-2xl">{expertise.badge}</span>
          <div>
            <p className="text-sm font-semibold">{expertise.title}</p>
            <p className="text-xs text-gray-400">{totalXP} XP total</p>
          </div>
          {xpProgress && (
            <div className="w-20 h-2 bg-white/10 rounded-full overflow-hidden">
              <div 
                className="h-full bg-genlayer-blue transition-all" 
                style={{ width: `${xpProgress.progress}%` }}
              />
            </div>
          )}
        </div>
      </div>

      {/* Weekly limit banner */}
      {!canPlay && (
        <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-2xl p-4">
          <p className="text-yellow-400 font-semibold">Weekly limit reached! 🎯</p>
          <p className="text-sm text-gray-300 mt-1">
            You've already played this week. New content unlocks in {resetTime.days}d {resetTime.hours}h {resetTime.minutes}m
          </p>
        </div>
      )}

      {view === 'menu' && (
        <div className="space-y-4">
          <h2 className="text-2xl font-bold text-center">Multiplayer Lobby</h2>
          <p className="text-sm text-gray-400 text-center">
            {remainingPlays > 0 
              ? `${remainingPlays} play${remainingPlays > 1 ? 's' : ''} remaining this week`
              : 'Come back next week for fresh scenarios!'}
          </p>
          
          <div className="grid gap-4">
            <button
              onClick={() => setView('create')}
              disabled={!canPlay}
              className="w-full rounded-2xl bg-gradient-to-r from-genlayer-purple to-genlayer-blue px-6 py-4 text-lg font-semibold disabled:opacity-50"
            >
              🎮 Create Room
            </button>
            <button
              onClick={() => setView('join')}
              disabled={!canPlay}
              className="w-full rounded-2xl border border-white/30 px-6 py-4 text-lg font-semibold disabled:opacity-50"
            >
              🚪 Join Room
            </button>
          </div>
        </div>
      )}

      {view === 'create' && (
        <div className="space-y-4">
          <h2 className="text-2xl font-bold">Create a Room</h2>
          
          <div className="space-y-3">
            <p className="text-sm text-gray-400">Choose game duration:</p>
            <div className="grid grid-cols-3 gap-3">
              {(Object.keys(GAME_PRESETS) as GamePreset[]).map((preset) => (
                <button
                  key={preset}
                  onClick={() => setSelectedPreset(preset)}
                  className={`rounded-xl p-4 border transition ${
                    selectedPreset === preset
                      ? 'border-genlayer-blue bg-genlayer-blue/20'
                      : 'border-white/20 bg-white/5'
                  }`}
                >
                  <p className="font-semibold capitalize">{preset}</p>
                  <p className="text-xs text-gray-400">{GAME_PRESETS[preset].rounds} rounds</p>
                  <p className="text-xs text-genlayer-blue">{GAME_PRESETS[preset].estimated}</p>
                </button>
              ))}
            </div>
          </div>

          {error && <p className="text-red-400 text-sm">{error}</p>}
          
          <div className="flex gap-3">
            <button
              onClick={() => { setView('menu'); setError(''); }}
              className="flex-1 rounded-xl border border-white/20 px-4 py-3"
            >
              Cancel
            </button>
            <button
              onClick={handleCreateRoom}
              className="flex-1 rounded-xl bg-genlayer-blue px-4 py-3 font-semibold"
            >
              Create Room
            </button>
          </div>
        </div>
      )}

      {view === 'join' && (
        <div className="space-y-4">
          <h2 className="text-2xl font-bold">Join a Room</h2>
          
          <div>
            <label className="text-sm text-gray-400 block mb-2">Enter room code:</label>
            <input
              type="text"
              value={joinCode}
              onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
              placeholder="ABC123"
              maxLength={6}
              className="w-full rounded-xl border border-white/30 bg-black/30 px-4 py-3 text-center text-2xl tracking-[0.5em] uppercase"
            />
          </div>

          {error && <p className="text-red-400 text-sm">{error}</p>}
          
          <div className="flex gap-3">
            <button
              onClick={() => { setView('menu'); setError(''); setJoinCode(''); }}
              className="flex-1 rounded-xl border border-white/20 px-4 py-3"
            >
              Cancel
            </button>
            <button
              onClick={handleJoinRoom}
              disabled={joinCode.length !== 6}
              className="flex-1 rounded-xl bg-genlayer-blue px-4 py-3 font-semibold disabled:opacity-50"
            >
              Join Room
            </button>
          </div>
        </div>
      )}

      {view === 'waiting' && room && (
        <div className="space-y-4">
          <div className="text-center space-y-2">
            <p className="text-sm text-gray-400">Room Code</p>
            <p className="text-4xl font-mono font-bold tracking-[0.3em] text-genlayer-blue">
              {room.roomCode}
            </p>
            <p className="text-xs text-gray-500">Share this code with friends to join!</p>
          </div>

          <div className="bg-white/5 rounded-2xl p-4 space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-400">Game Duration</span>
              <span>{room.totalRounds} rounds • ~{Math.ceil(room.totalRounds * (room.roundTimeLimit + 8) / 60)} min</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-400">Players</span>
              <span>{room.players.length}/{room.maxPlayers}</span>
            </div>
          </div>

          <div className="space-y-2">
            <p className="text-sm text-gray-400">Players ({room.players.length})</p>
            <div className="grid gap-2">
              {room.players.map((player) => (
                <div
                  key={player.id}
                  className={`flex items-center justify-between rounded-xl p-3 ${
                    player.id === playerId ? 'bg-genlayer-blue/20 border border-genlayer-blue/50' : 'bg-white/5'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{player.avatar}</span>
                    <div>
                      <p className="font-semibold">
                        {player.username}
                        {player.isHost && <span className="ml-2 text-xs text-yellow-400">👑 Host</span>}
                        {player.id === playerId && <span className="ml-2 text-xs text-genlayer-blue">(You)</span>}
                      </p>
                    </div>
                  </div>
                  <div className={`px-3 py-1 rounded-full text-xs font-semibold ${
                    player.isReady ? 'bg-green-500/20 text-green-400' : 'bg-yellow-500/20 text-yellow-400'
                  }`}>
                    {player.isReady ? '✓ Ready' : 'Not Ready'}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {error && <p className="text-red-400 text-sm text-center">{error}</p>}

          <div className="flex gap-3">
            {!isHost && (
              <button
                onClick={handleToggleReady}
                className={`flex-1 rounded-xl px-4 py-3 font-semibold ${
                  currentPlayer?.isReady
                    ? 'bg-yellow-500/20 border border-yellow-500/50 text-yellow-400'
                    : 'bg-green-500/20 border border-green-500/50 text-green-400'
                }`}
              >
                {currentPlayer?.isReady ? 'Cancel Ready' : 'Ready Up!'}
              </button>
            )}
            {isHost && (
              <button
                onClick={handleStartGame}
                disabled={!allPlayersReady(room) || room.players.length < 2}
                className="flex-1 rounded-xl bg-gradient-to-r from-genlayer-purple to-genlayer-blue px-4 py-3 font-semibold disabled:opacity-50"
              >
                {room.players.length < 2 
                  ? 'Waiting for players...' 
                  : allPlayersReady(room) 
                    ? '🚀 Start Game' 
                    : 'Waiting for ready...'}
              </button>
            )}
          </div>

          {room.players.length < 2 && (
            <p className="text-center text-sm text-gray-400">
              Need at least 2 players to start
            </p>
          )}
        </div>
      )}
    </div>
  );
}

// Helper functions for localStorage-based room storage (simulating a server)
function storeRoom(room: RoomState): void {
  try {
    const rooms = JSON.parse(localStorage.getItem('aod_rooms') || '{}');
    rooms[room.roomCode] = { ...room, updatedAt: Date.now() };
    localStorage.setItem('aod_rooms', JSON.stringify(rooms));
  } catch (e) {
    console.error('Failed to store room:', e);
  }
}

function getStoredRoom(code: string): RoomState | null {
  try {
    const rooms = JSON.parse(localStorage.getItem('aod_rooms') || '{}');
    return rooms[code] || null;
  } catch {
    return null;
  }
}
