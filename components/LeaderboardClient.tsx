'use client';

import { useEffect, useState } from 'react';
import Leaderboard from './Leaderboard';

const STORAGE_KEY = 'trustOrDoubtResults';

type Stored = {
  xp?: number;
  accuracy?: number;
  correctTrusts?: number;
  correctDoubts?: number;
  appealsWon?: number;
  history?: any[];
};

export default function LeaderboardClient() {
  const [data, setData] = useState<Stored | null>(null);

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(STORAGE_KEY);
      if (!raw) {
        setData(null);
        return;
      }
      setData(JSON.parse(raw));
    } catch (err) {
      console.error('Failed to read leaderboard data:', err);
      setData(null);
    }
  }, []);

  const clear = () => {
    sessionStorage.removeItem(STORAGE_KEY);
    setData(null);
  };

  const xp = data?.xp ?? 0;
  const accuracy = data?.accuracy ?? 0;
  const appealsWon = data?.appealsWon ?? 0;
  const history = data?.history ?? [];

  return (
    <section className="layout py-12">
      <div className="max-w-3xl mx-auto">
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-2xl font-semibold">Final Leaderboard</h1>
          <div className="flex gap-3">
            <a className="btn primary" href="/game">Play Another Game</a>
            <button className="btn ghost" onClick={clear}>Clear Stored Results</button>
          </div>
        </div>

        <Leaderboard xp={xp} accuracy={accuracy} appealsWon={appealsWon} history={history} />
      </div>
    </section>
  );
}
