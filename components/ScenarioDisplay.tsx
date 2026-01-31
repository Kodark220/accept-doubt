'use client';

import { ScenarioClaim } from '../utils/scenarios';

export type ScenarioDisplayProps = {
  current: ScenarioClaim;
  round: number;
  total: number;
};

export default function ScenarioDisplay({ current, round, total }: ScenarioDisplayProps) {
  return (
    <section className="card-gradient rounded-3xl p-6 mb-6">
      <div className="flex justify-between items-center">
        <div>
          <p className="text-xs uppercase tracking-[0.4em] text-genlayer-accent">Scenario</p>
          <h2 className="text-2xl font-semibold mt-1">Round {round} of {total}</h2>
        </div>
        <span className="text-xs px-3 py-1 border border-white/20 rounded-full text-white/80">{current.category}</span>
      </div>
      <p className="mt-4 text-xl md:text-2xl font-medium">{current.text}</p>
      <p className="mt-2 text-sm text-gray-300">{current.detail}</p>
    </section>
  );
}
