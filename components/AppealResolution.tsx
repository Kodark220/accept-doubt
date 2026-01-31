'use client';

type AppealResolutionProps = {
  confidence: number;
  appealAttempted: boolean;
  onAppeal: () => void;
};

export default function AppealResolution({ confidence, appealAttempted, onAppeal }: AppealResolutionProps) {
  const meter = Math.min(100, Math.round(confidence * 100));
  return (
    <section className="card-gradient rounded-3xl p-6 mb-6">
      <p className="text-xs uppercase tracking-[0.4em] text-genlayer-accent">Validator confidence</p>
      <div className="mt-3 h-2 bg-white/10 rounded-full overflow-hidden">
        <div className="h-full bg-gradient-to-r from-genlayer-purple to-genlayer-blue" style={{ width: `${meter}%` }} />
      </div>
      <p className="mt-2 text-sm text-gray-300">Current consensus confidence: {meter}%</p>
      <button
        className="mt-4 w-full text-center py-3 rounded-2xl border border-white/30 text-sm font-semibold uppercase tracking-[0.3em]"
        onClick={onAppeal}
        disabled={appealAttempted}
      >
        {appealAttempted ? 'Appeal requested' : 'Request appeal'
        }
      </button>
    </section>
  );
}
