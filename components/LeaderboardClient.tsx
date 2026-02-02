'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  LeaderboardEntry,
  getLeaderboard,
  getLeaderboardStats,
  formatPlayedAt,
} from '../utils/globalLeaderboard';

export default function LeaderboardClient() {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [stats, setStats] = useState({
    totalPlayers: 0,
    totalGames: 0,
    highestScore: 0,
    averageScore: 0,
    averageAccuracy: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const data = getLeaderboard();
    setEntries(data);
    setStats(getLeaderboardStats());
    setLoading(false);
  }, []);

  const getPositionStyle = (position: number) => {
    switch (position) {
      case 1: return { badge: '🥇', bg: 'bg-yellow-500/20', border: 'border-yellow-500/50', text: 'text-yellow-400' };
      case 2: return { badge: '🥈', bg: 'bg-gray-400/20', border: 'border-gray-400/50', text: 'text-gray-300' };
      case 3: return { badge: '🥉', bg: 'bg-orange-500/20', border: 'border-orange-500/50', text: 'text-orange-400' };
      default: return { badge: `#${position}`, bg: 'bg-white/5', border: 'border-white/10', text: 'text-gray-400' };
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-8 w-8 rounded-full border-4 border-t-transparent border-white/60 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="text-center space-y-2">
        <p className="text-sm uppercase tracking-[0.5em] text-genlayer-accent">🏆 Global Rankings</p>
        <h1 className="text-4xl font-bold">Leaderboard</h1>
        <p className="text-gray-400">See how you stack up against other players</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white/5 rounded-2xl p-4 text-center">
          <p className="text-xs text-gray-400 uppercase">Total Players</p>
          <p className="text-2xl font-bold">{stats.totalPlayers}</p>
        </div>
        <div className="bg-white/5 rounded-2xl p-4 text-center">
          <p className="text-xs text-gray-400 uppercase">Games Played</p>
          <p className="text-2xl font-bold">{stats.totalGames}</p>
        </div>
        <div className="bg-white/5 rounded-2xl p-4 text-center">
          <p className="text-xs text-gray-400 uppercase">Highest Score</p>
          <p className="text-2xl font-bold text-genlayer-blue">{stats.highestScore}</p>
        </div>
        <div className="bg-white/5 rounded-2xl p-4 text-center">
          <p className="text-xs text-gray-400 uppercase">Avg Accuracy</p>
          <p className="text-2xl font-bold">{stats.averageAccuracy}%</p>
        </div>
      </div>

      {/* Leaderboard Table */}
      {entries.length === 0 ? (
        <div className="card-gradient rounded-3xl p-12 text-center space-y-4">
          <p className="text-6xl">🎮</p>
          <h2 className="text-2xl font-bold">No scores yet!</h2>
          <p className="text-gray-400">Be the first to play and claim the top spot.</p>
          <Link
            href="/"
            className="inline-block mt-4 rounded-2xl bg-gradient-to-r from-genlayer-purple to-genlayer-blue px-8 py-4 font-semibold"
          >
            Play Now
          </Link>
        </div>
      ) : (
        <div className="card-gradient rounded-3xl overflow-hidden">
          {/* Top 3 Podium */}
          {entries.length >= 3 && (
            <div className="p-6 border-b border-white/10">
              <div className="flex items-end justify-center gap-4">
                {/* 2nd Place */}
                <div className="text-center">
                  <div className="bg-gray-400/20 rounded-2xl p-4 border border-gray-400/30">
                    <span className="text-3xl">{entries[1].avatar}</span>
                    <p className="font-semibold mt-2">{entries[1].username}</p>
                    <p className="text-2xl font-bold text-gray-300">{entries[1].score}</p>
                    <p className="text-xs text-gray-400">{entries[1].accuracy}% accuracy</p>
                  </div>
                  <p className="text-4xl mt-2">🥈</p>
                </div>
                
                {/* 1st Place */}
                <div className="text-center -mt-4">
                  <div className="bg-yellow-500/20 rounded-2xl p-6 border-2 border-yellow-500/50">
                    <span className="text-4xl">{entries[0].avatar}</span>
                    <p className="font-bold text-lg mt-2">{entries[0].username}</p>
                    <p className="text-3xl font-bold text-yellow-400">{entries[0].score}</p>
                    <p className="text-sm text-gray-300">{entries[0].accuracy}% accuracy</p>
                  </div>
                  <p className="text-5xl mt-2">🥇</p>
                </div>
                
                {/* 3rd Place */}
                <div className="text-center">
                  <div className="bg-orange-500/20 rounded-2xl p-4 border border-orange-500/30">
                    <span className="text-3xl">{entries[2].avatar}</span>
                    <p className="font-semibold mt-2">{entries[2].username}</p>
                    <p className="text-2xl font-bold text-orange-400">{entries[2].score}</p>
                    <p className="text-xs text-gray-400">{entries[2].accuracy}% accuracy</p>
                  </div>
                  <p className="text-4xl mt-2">🥉</p>
                </div>
              </div>
            </div>
          )}

          {/* Full Rankings List */}
          <div className="divide-y divide-white/5">
            {entries.map((entry, idx) => {
              const position = idx + 1;
              const style = getPositionStyle(position);
              
              return (
                <div
                  key={entry.id}
                  className={`flex items-center justify-between p-4 hover:bg-white/5 transition ${
                    position <= 3 ? style.bg : ''
                  }`}
                >
                  <div className="flex items-center gap-4">
                    {/* Position */}
                    <div className={`w-10 h-10 rounded-full ${style.bg} border ${style.border} flex items-center justify-center font-bold ${style.text}`}>
                      {position <= 3 ? style.badge : position}
                    </div>
                    
                    {/* Avatar & Name */}
                    <span className="text-2xl">{entry.avatar}</span>
                    <div>
                      <p className="font-semibold">{entry.username}</p>
                      <p className="text-xs text-gray-400">
                        {entry.correctAnswers}/{entry.totalRounds} correct • {formatPlayedAt(entry.playedAt)}
                      </p>
                    </div>
                  </div>
                  
                  {/* Score & Accuracy */}
                  <div className="text-right">
                    <p className={`text-xl font-bold ${position <= 3 ? style.text : ''}`}>{entry.score}</p>
                    <p className="text-xs text-gray-400">{entry.accuracy}% accuracy</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Play Button */}
      <div className="text-center">
        <Link
          href="/"
          className="inline-block rounded-2xl bg-gradient-to-r from-genlayer-purple to-genlayer-blue px-8 py-4 font-semibold tracking-wide"
        >
          🎮 Play & Climb the Rankings
        </Link>
      </div>
    </div>
  );
}
