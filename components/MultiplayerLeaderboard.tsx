'use client';

import { useEffect, useState } from 'react';
import {
  RoomState,
  PlayerInRoom,
  getRoomLeaderboard,
  calculateXP,
  recordWeeklyPlay,
  addTotalXP,
  getExpertiseLevel,
  getXPToNextLevel,
  ExpertiseLevel,
} from '../utils/roomManager';

type MultiplayerLeaderboardProps = {
  room: RoomState;
  playerId: string;
  onPlayAgain: () => void;
  onExit: () => void;
};

export default function MultiplayerLeaderboard({
  room,
  playerId,
  onPlayAgain,
  onExit,
}: MultiplayerLeaderboardProps) {
  const [leaderboard, setLeaderboard] = useState<(PlayerInRoom & { xp: number; position: number })[]>([]);
  const [currentPlayer, setCurrentPlayer] = useState<PlayerInRoom & { xp: number; position: number } | null>(null);
  const [xpRecorded, setXpRecorded] = useState(false);
  const [expertise, setExpertise] = useState<ExpertiseLevel>(getExpertiseLevel());
  const [prevExpertise, setPrevExpertise] = useState<ExpertiseLevel>(getExpertiseLevel());
  const [showLevelUp, setShowLevelUp] = useState(false);

  useEffect(() => {
    const sorted = getRoomLeaderboard(room);
    const withXP = sorted.map((player, idx) => ({
      ...player,
      xp: calculateXP(room, player.id),
      position: idx + 1,
    }));
    
    setLeaderboard(withXP);
    
    const me = withXP.find(p => p.id === playerId);
    setCurrentPlayer(me || null);

    // Record XP only once
    if (!xpRecorded && me) {
      const prevLevel = getExpertiseLevel();
      setPrevExpertise(prevLevel);
      
      recordWeeklyPlay(room.roomCode, me.score, me.xp);
      const newTotal = addTotalXP(me.xp);
      
      const newLevel = getExpertiseLevel(newTotal);
      setExpertise(newLevel);
      
      if (newLevel.level > prevLevel.level) {
        setShowLevelUp(true);
      }
      
      setXpRecorded(true);
    }
  }, [room, playerId, xpRecorded]);

  const gameDuration = room.gameEndedAt && room.gameStartedAt 
    ? Math.round((room.gameEndedAt - room.gameStartedAt) / 1000 / 60)
    : 0;

  const getPositionBadge = (position: number) => {
    switch (position) {
      case 1: return { emoji: '🥇', color: 'text-yellow-400', bg: 'bg-yellow-500/20' };
      case 2: return { emoji: '🥈', color: 'text-gray-300', bg: 'bg-gray-400/20' };
      case 3: return { emoji: '🥉', color: 'text-orange-400', bg: 'bg-orange-500/20' };
      default: return { emoji: `#${position}`, color: 'text-gray-400', bg: 'bg-white/5' };
    }
  };

  return (
    <div className="space-y-6">
      {/* Level Up Animation */}
      {showLevelUp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80">
          <div className="text-center space-y-4 animate-bounce">
            <p className="text-6xl">{expertise.badge}</p>
            <h2 className="text-3xl font-bold text-genlayer-blue">Level Up!</h2>
            <p className="text-xl">{prevExpertise.title} → {expertise.title}</p>
            <button
              onClick={() => setShowLevelUp(false)}
              className="mt-4 px-6 py-3 rounded-xl bg-genlayer-blue font-semibold"
            >
              Awesome!
            </button>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="text-center space-y-2">
        <p className="text-sm uppercase tracking-[0.5em] text-genlayer-accent">🎮 Game Complete</p>
        <h2 className="text-3xl font-bold">Final Leaderboard</h2>
        <p className="text-sm text-gray-400">
          Room {room.roomCode} • {room.totalRounds} rounds • {gameDuration} min
        </p>
      </div>

      {/* Your Result Highlight */}
      {currentPlayer && (
        <div className={`rounded-2xl p-6 ${
          currentPlayer.position === 1 
            ? 'bg-gradient-to-r from-yellow-500/20 to-orange-500/20 border border-yellow-500/50'
            : 'bg-genlayer-blue/10 border border-genlayer-blue/30'
        }`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <span className="text-4xl">{currentPlayer.avatar}</span>
              <div>
                <p className="text-lg font-bold">{currentPlayer.username} (You)</p>
                <p className="text-sm text-gray-400">
                  {currentPlayer.correctAnswers}/{room.totalRounds} correct • {Math.round(currentPlayer.correctAnswers / room.totalRounds * 100)}% accuracy
                </p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-4xl font-bold">{getPositionBadge(currentPlayer.position).emoji}</p>
              <p className="text-2xl font-bold text-genlayer-blue">{currentPlayer.score} pts</p>
            </div>
          </div>
          
          {/* XP Earned */}
          <div className="mt-4 pt-4 border-t border-white/10 flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-400">XP Earned</p>
              <p className="text-xl font-bold text-green-400">+{currentPlayer.xp} XP</p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-2xl">{expertise.badge}</span>
              <div>
                <p className="text-sm font-semibold">{expertise.title}</p>
                <p className="text-xs text-gray-400">Level {expertise.level}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Full Leaderboard */}
      <div className="space-y-2">
        <p className="text-sm text-gray-400 uppercase tracking-wider">All Players</p>
        {leaderboard.map((player) => {
          const badge = getPositionBadge(player.position);
          const isMe = player.id === playerId;
          
          return (
            <div
              key={player.id}
              className={`flex items-center justify-between rounded-xl p-4 ${
                isMe ? 'bg-genlayer-blue/10 border border-genlayer-blue/30' : 'bg-white/5'
              }`}
            >
              <div className="flex items-center gap-4">
                <div className={`w-10 h-10 rounded-full ${badge.bg} flex items-center justify-center font-bold ${badge.color}`}>
                  {player.position <= 3 ? badge.emoji : player.position}
                </div>
                <span className="text-2xl">{player.avatar}</span>
                <div>
                  <p className="font-semibold">
                    {player.username}
                    {isMe && <span className="ml-2 text-xs text-genlayer-blue">(You)</span>}
                  </p>
                  <p className="text-xs text-gray-400">
                    {player.correctAnswers}/{room.totalRounds} correct
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-xl font-bold">{player.score}</p>
                <p className="text-xs text-green-400">+{player.xp} XP</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Stats Summary */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-white/5 rounded-xl p-4 text-center">
          <p className="text-xs text-gray-400 uppercase">Total Players</p>
          <p className="text-2xl font-bold">{room.players.length}</p>
        </div>
        <div className="bg-white/5 rounded-xl p-4 text-center">
          <p className="text-xs text-gray-400 uppercase">Top Score</p>
          <p className="text-2xl font-bold">{leaderboard[0]?.score || 0}</p>
        </div>
        <div className="bg-white/5 rounded-xl p-4 text-center">
          <p className="text-xs text-gray-400 uppercase">Avg Score</p>
          <p className="text-2xl font-bold">
            {Math.round(leaderboard.reduce((sum, p) => sum + p.score, 0) / leaderboard.length)}
          </p>
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-3">
        <button
          onClick={onExit}
          className="flex-1 rounded-2xl border border-white/20 px-6 py-4 font-semibold"
        >
          Exit to Home
        </button>
        <button
          onClick={onPlayAgain}
          className="flex-1 rounded-2xl bg-gradient-to-r from-genlayer-purple to-genlayer-blue px-6 py-4 font-semibold"
        >
          Play Again
        </button>
      </div>

      {/* Weekly Play Info */}
      <div className="text-center text-sm text-gray-400">
        <p>Your weekly play has been recorded. Come back next week for new content!</p>
      </div>
    </div>
  );
}
