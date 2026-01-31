'use client';

type VotingProps = {
  disabled: boolean;
  onVote: (choice: 'trust' | 'doubt') => void;
};

export default function Voting({ disabled, onVote }: VotingProps) {
  return (
    <section className="card-gradient rounded-3xl p-6 mb-6">
      <p className="text-xs uppercase tracking-[0.4em] text-genlayer-accent">Player choice</p>
      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <button
          className="py-4 rounded-2xl font-semibold text-lg bg-gradient-to-br from-green-400 to-emerald-500 shadow-lg shadow-green-500/30"
          onClick={() => onVote('trust')}
          disabled={disabled}
        >
          Trust
        </button>
        <button
          className="py-4 rounded-2xl font-semibold text-lg bg-gradient-to-br from-red-500 to-rose-500 shadow-lg shadow-red-500/30"
          onClick={() => onVote('doubt')}
          disabled={disabled}
        >
          Doubt
        </button>
      </div>
    </section>
  );
}
