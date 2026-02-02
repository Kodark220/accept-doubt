'use client';

import { RoundHistory } from '../utils/gameLogic';
import { TOTAL_ROUNDS } from '../app/game/constants';

type LeaderboardProps = {
  xp: number;
  accuracy: number;
  appealsWon: number;
  history: RoundHistory[];
};

export default function Leaderboard({ xp, accuracy, appealsWon, history }: LeaderboardProps) {
  const finalized = history.filter((h) => h.finalized);
  const isFinal = finalized.length === TOTAL_ROUNDS;
  const perRoundPoints = Math.round(100 / TOTAL_ROUNDS);
  const totalScore = finalized.reduce((sum, r) => sum + (r.correct ? perRoundPoints : 0), 0);
  const correctCount = finalized.filter((r) => r.correct).length;

  return (
    <section className="card-gradient rounded-3xl p-6 mt-6">
      <div className="mt-6 space-y-2">
        {finalized.map((entry, idx) => {
          const roundNum = idx + 1;
          const points = entry.correct ? perRoundPoints : 0;
          const isLast = roundNum === TOTAL_ROUNDS && isFinal;

          return (
            <div key={`${entry.scenario.id}-${idx}`}>
              {/* Show "FINAL RESULTS" banner only on last round when all finalized */}
              {isLast && (
                <p className="text-sm text-genlayer-accent uppercase tracking-[0.5em] font-bold mb-3">Final Results</p>
              )}
              <div className="border border-white/10 rounded-2xl p-4 bg-white/5">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <p className="text-sm font-semibold">Round {roundNum}: {entry.scenario.text}</p>
                    <p className="text-xs text-gray-400 mt-1">You: {entry.playerChoice} • Consensus: {entry.consensus}</p>
                  </div>
                  <div className="ml-4 text-right">
                    <p className="text-lg font-bold">{points} pts</p>
                    <p className={entry.correct ? 'text-green-400 text-xs font-bold' : 'text-red-400 text-xs font-bold'}>
                      {entry.correct ? 'Correct' : 'Wrong'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Show totals block only after the last round */}
              {isLast && (
                <div className="border-t-2 border-white/10 mt-4 pt-4 space-y-2">
                  <div className="rounded-2xl bg-genlayer-blue/10 p-4">
                    <p className="text-xs uppercase tracking-[0.3em] text-gray-300 mb-2">Total Score</p>
                    <p className="text-4xl font-bold text-white">{totalScore} / 100</p>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <div className="rounded-2xl bg-white/5 p-3">
                      <p className="text-xs text-gray-400 uppercase">Correct</p>
                      <p className="text-2xl font-bold">{correctCount}/{TOTAL_ROUNDS}</p>
                    </div>
                    <div className="rounded-2xl bg-white/5 p-3">
                      <p className="text-xs text-gray-400 uppercase">Accuracy</p>
                      <p className="text-2xl font-bold">{accuracy}%</p>
                    </div>
                    <div className="rounded-2xl bg-white/5 p-3">
                      <p className="text-xs text-gray-400 uppercase">XP</p>
                      <p className="text-2xl font-bold">{xp}</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
