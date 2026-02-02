'use client';

import { RoundHistory } from '../utils/gameLogic';

type LeaderboardProps = {
  xp: number;
  accuracy: number;
  appealsWon: number;
  history: RoundHistory[];
};

export default function Leaderboard({ xp, accuracy, appealsWon, history }: LeaderboardProps) {
  return (
    <section className="card-gradient rounded-3xl p-6 mt-6">
      <h3 className="text-2xl font-semibold">Final leaderboard snapshot</h3>
      <div className="grid gap-4 mt-4 md:grid-cols-3">
        <div className="rounded-2xl bg-white/5 p-4">
          <p className="text-xs uppercase tracking-[0.4em] text-genlayer-accent">XP</p>
          <p className="text-3xl font-bold">{xp}</p>
        </div>
        <div className="rounded-2xl bg-white/5 p-4">
          <p className="text-xs uppercase tracking-[0.4em] text-genlayer-accent">Accuracy</p>
          <p className="text-3xl font-bold">{accuracy}%</p>
        </div>
        <div className="rounded-2xl bg-white/5 p-4">
          <p className="text-xs uppercase tracking-[0.4em] text-genlayer-accent">Appeals</p>
          <p className="text-3xl font-bold">{appealsWon}</p>
        </div>
      </div>
      <div className="mt-6 space-y-3">
        {history.filter((h) => h.finalized).map((entry, idx) => (
          <div key={`${entry.scenario.id}-${idx}`} className="border border-white/10 rounded-2xl p-3">
            <p className="text-sm text-gray-300">{entry.scenario.text}</p>
            <p className="text-xs uppercase tracking-[0.3em] text-white/60">You voted {entry.playerChoice}</p>
            <p className="text-sm">Consensus: {entry.consensus} — {entry.correct ? 'Match' : 'Mismatch'}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
