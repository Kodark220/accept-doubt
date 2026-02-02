'use client';

import { RoundHistory } from '../utils/gameLogic';

type RoundResultsProps = {
  lastRound?: RoundHistory;
  pending?: {
    consensus: 'trust' | 'doubt';
    confidence: number;
    playerChoice: 'trust' | 'doubt';
  };
};

export default function RoundResults({ lastRound, pending }: RoundResultsProps) {
  return (
    <section className="card-gradient rounded-3xl p-6 mb-6">
      <h3 className="text-xl font-semibold">Round verdict</h3>
      {pending && (
        <div className="mt-2">
          <div className="flex items-center gap-3">
            <div className="h-6 w-6 rounded-full border-4 border-t-transparent border-white/60 animate-spin" />
            <div>
              <p className="text-sm text-gray-300">Validators currently lean {pending.consensus} ({Math.round(pending.confidence * 100)}%)</p>
              <p className="mt-1 text-lg">You voted {pending.playerChoice}. Appeal to sway extra validators.</p>
            </div>
          </div>
          <p className="mt-3 text-xs text-gray-400">Waiting for consensus — this may take a few seconds. Please stay on this page until the verdict finalizes.</p>
        </div>
      )}
      {lastRound && (
        <div className="mt-3 space-y-1">
          <p className="text-sm text-gray-300">
            Final consensus: {lastRound.consensus} ({Math.round(lastRound.consensusConfidence * 100)}%)
          </p>
          <p className="text-lg">
            {lastRound.correct ? 'Your intuition matched the validators.' : 'Validators confirmed the alternate stance.'}
          </p>
          {lastRound.appeal && (
            <p className="text-sm text-gray-300">
              Appeal: {lastRound.appeal.success ? 'Success' : 'Denied'} — {lastRound.appeal.detail}
            </p>
          )}
        </div>
      )}
      {!pending && !lastRound && <p className="mt-2 text-sm text-gray-500">Vote to reveal a consensus verdict.</p>}
    </section>
  );
}
