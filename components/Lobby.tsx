'use client';

import { ScenarioClaim } from '../utils/scenarios';

type PlayerProfile = {
  name: string;
  title: string;
  avatar: string;
  achievement: string;
};

export type LobbyProps = {
  players: PlayerProfile[];
  spotlight: ScenarioClaim;
};

export default function Lobby({ players, spotlight }: LobbyProps) {
  return (
    <section className="card-gradient rounded-3xl p-6 mb-6">
      <div className="flex flex-col gap-4">
        <p className="text-sm uppercase tracking-[0.4em] text-genlayer-accent">Lobby · Optimistic Democracy</p>
        <div>
          <h2 className="text-3xl font-semibold">Daily protocol spotlight</h2>
          <p className="text-sm text-gray-300">
            {spotlight.category} · {spotlight.text}
          </p>
          <p className="text-xs text-white/70 mt-1">{spotlight.detail}</p>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          {players.map((player) => (
            <article key={player.name} className="border border-white/10 rounded-2xl p-4 bg-white/5">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center text-lg font-semibold">
                  {player.avatar}
                </div>
                <div>
                  <p className="font-semibold">{player.name}</p>
                  <p className="text-xs text-gray-400">{player.title}</p>
                </div>
              </div>
              <p className="mt-3 text-sm leading-relaxed text-gray-200">{player.achievement}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
