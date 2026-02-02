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

  return (
    <section className="card-gradient rounded-3xl p-6 mt-6">
      {isFinal ? (
        <>
          <p className="text-sm text-genlayer-accent uppercase tracking-[0.3em]">This is your final score</p>
          <h3 className="text-2xl font-semibold">Final leaderboard snapshot</h3>
        </>
      ) : (
        <>
          <p className="text-sm text-gray-400 uppercase tracking-[0.3em]">Current snapshot</p>
          <h3 className="text-2xl font-semibold">Round results</h3>
        </>
      )}

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
        {finalized.map((entry, idx) => {
          const roundNum = idx + 1;
          const points = entry.correct ? perRoundPoints : 0;
          const isLast = roundNum === finalized.length && isFinal;
          return (
            <div key={`${entry.scenario.id}-${idx}`} className="border border-white/10 rounded-2xl p-3">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <p className="text-sm text-gray-300 font-semibold">Round {roundNum}: {entry.scenario.text}</p>
                  <p className="text-xs text-gray-400 mt-1">You voted {entry.playerChoice} • Consensus: {entry.consensus} • Confidence: {Math.round((entry.consensusConfidence || 0) * 100)}%</p>
                </div>
                <div className="ml-4 text-right">
                  <p className="text-sm">{points} pts</p>
                  <p className={entry.correct ? 'text-green-400 font-bold' : 'text-red-400 font-bold'}>{entry.correct ? 'Correct' : 'Wrong'}</p>
                </div>
              </div>
              {isLast && isFinal && (
                <div className="mt-3 pt-3 border-t border-white/5">
                  <p className="text-sm text-gray-300 font-semibold">Total</p>
                  <div className="flex items-center justify-between mt-2">
                    <div>
                      <p className="text-xs text-gray-400">Score</p>
                      <p className="text-lg font-bold">{finalized.reduce((sum, r) => sum + (r.correct ? perRoundPoints : 0), 0)} / 100</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-400">Correct</p>
                      <p className="text-lg font-bold">{finalized.filter((r) => r.correct).length}/{TOTAL_ROUNDS}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-400">Accuracy</p>
                      <p className="text-lg font-bold">{accuracy}%</p>
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
