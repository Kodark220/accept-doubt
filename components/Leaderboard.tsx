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
  const perRoundPoints = Math.round(100 / TOTAL_ROUNDS);
  const totalScore = finalized.reduce((sum, r) => sum + (r.correct ? perRoundPoints : 0), 0);
  const correctCount = finalized.filter((r) => r.correct).length;

  return (
    <section className="card-gradient rounded-3xl p-6 mt-6 space-y-3">
      {/* Each round listed vertically */}
      {finalized.map((entry, idx) => {
        const roundNum = idx + 1;
        const points = entry.correct ? perRoundPoints : 0;

        return (
          <div key={`${entry.scenario.id}-${idx}`} className="border border-white/10 rounded-2xl p-4 bg-white/5">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <p className="text-sm font-semibold">Round {roundNum}: {entry.scenario.text}</p>
                <p className="text-xs text-gray-400 mt-1">
                  You chose: <span className="text-white">{entry.playerChoice}</span> • 
                  Correct answer: <span className="text-white">{entry.consensus}</span>
                </p>
              </div>
              <div className="ml-4 text-right">
                <p className="text-lg font-bold">{points} pts</p>
                <p className={entry.correct ? 'text-green-400 text-xs font-bold' : 'text-red-400 text-xs font-bold'}>
                  {entry.correct ? '✓ Correct' : '✗ Wrong'}
                </p>
              </div>
            </div>
          </div>
        );
      })}

      {/* Final Score Card - only show when all rounds finalized */}
      {finalized.length === TOTAL_ROUNDS && (
        <div className="border-t-2 border-genlayer-accent/30 mt-4 pt-4">
          <p className="text-sm text-genlayer-accent uppercase tracking-[0.5em] font-bold mb-3 text-center">Final Score</p>
          <div className="rounded-2xl bg-genlayer-blue/10 p-4 text-center">
            <p className="text-4xl font-bold text-white">{totalScore} / 100</p>
            <p className="text-sm text-gray-300 mt-2">You got {correctCount} out of {TOTAL_ROUNDS} questions correct</p>
          </div>
        </div>
      )}
    </section>
  );
}
