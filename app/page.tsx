'use client';

import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';
import GenLayerLogo from '../components/GenLayerLogo';

const highlights = [
  'Play or practice alongside GenLayer validators in seconds.',
  'Watch consensus confidence grow and trigger appeals when you doubt.',
  'Track XP, accuracy, and appeal streaks across every session.'
];

const claimSignals = [
  'GenLayer: the trust infrastructure for AI-driven decisions.',
  'Optimistic Democracy lanes keep DAO treasury sweeps transparent.',
  'AI validators flag suspicious MEV bundles before block commitment.'
];

export default function LandingPage() {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [mode, setMode] = useState<'single' | 'multi'>('single');
  const [errorMessage, setErrorMessage] = useState('');

  const handleStart = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const safeName = username.trim();
    if (!safeName) {
      setErrorMessage('Please enter your username before continuing.');
      return;
    }
    setErrorMessage('');
    const seed = Date.now();
    router.push(
      `/game?mode=${mode}&username=${encodeURIComponent(safeName)}&seed=${seed}`
    );
  };

  return (
    <main className="min-h-screen bg-genlayer-dark text-white">
      <div className="max-w-5xl mx-auto px-6 py-16 space-y-10">
        <section className="card-gradient rounded-3xl p-8 space-y-6">
          <GenLayerLogo variant="white" />
          <p className="text-xs uppercase tracking-[0.5em] text-genlayer-accent text-center">
            Trust or Doubt
          </p>
          <p className="text-sm text-gray-400 text-center">
            Can you outsmart the AI validators? Test your judgment against decentralized consensus.
          </p>
          <p className="text-2xl font-semibold text-genlayer-accent text-center">
            GENLAYER
          </p>
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-center">
            The trust infrastructure for AI-driven decisions.
          </h1>
          <form className="space-y-4" onSubmit={handleStart}>
            <label className="block text-sm uppercase tracking-[0.3em] text-white/60">Username</label>
            <div>
              <input
                type="text"
                value={username}
                placeholder="Enter your username"
                onChange={(event) => setUsername(event.target.value)}
                className="w-full rounded-2xl border border-white/30 bg-black/30 px-4 py-3 text-white placeholder:text-white/40 focus:border-genlayer-blue focus:outline-none"
              />
              {errorMessage && <p className="mt-2 text-xs text-genlayer-accent">{errorMessage}</p>}
            </div>
            <div className="flex gap-4">
              <button
                type="button"
                onClick={() => setMode('single')}
                className={`flex-1 rounded-2xl border px-4 py-3 text-sm font-semibold uppercase tracking-[0.3em] transition ${
                  mode === 'single'
                    ? 'bg-genlayer-blue text-white border-genlayer-blue'
                    : 'border-white/20 text-white/60'
                }`}
              >
                Single player
              </button>
              <button
                type="button"
                onClick={() => setMode('multi')}
                className={`flex-1 rounded-2xl border px-4 py-3 text-sm font-semibold uppercase tracking-[0.3em] transition ${
                  mode === 'multi'
                    ? 'bg-genlayer-blue text-white border-genlayer-blue'
                    : 'border-white/20 text-white/60'
                }`}
              >
                Multiplayer
              </button>
            </div>
            <button
              type="submit"
              className="w-full rounded-2xl bg-gradient-to-r from-genlayer-purple to-genlayer-blue px-6 py-4 text-base font-semibold tracking-[0.2em] text-white"
            >
              Enter {mode === 'single' ? 'single-player' : 'multiplayer'}
            </button>
          </form>
        </section>
        <section className="grid gap-5 md:grid-cols-3">
          {highlights.map((text) => (
            <article key={text} className="card-gradient rounded-3xl p-5 text-center">
              <p className="text-xs uppercase tracking-[0.4em] text-genlayer-accent">Insight</p>
              <p className="mt-3 text-sm text-gray-200">{text}</p>
            </article>
          ))}
        </section>
        <section className="card-gradient rounded-3xl p-6 space-y-4">
          <p className="text-xs uppercase tracking-[0.35em] text-genlayer-accent text-center">GenLayer signals</p>
          <div className="grid gap-4 md:grid-cols-3">
            {claimSignals.map((text) => (
              <article
                key={text}
                className="rounded-2xl border border-white/10 bg-white/5 p-3 text-sm text-gray-200 text-center"
              >
                {text}
              </article>
            ))}
          </div>
          <p className="text-sm text-gray-300 text-center">
            Every claim draws from GenLayer documentation plus the freshest Web3 and crypto trends, so the scenarios stay timely and never repeat until your thousandth round.
          </p>
        </section>
        <section className="card-gradient rounded-3xl p-6 space-y-3">
          <h2 className="text-xl font-semibold text-center">How a session flows</h2>
          <ol className="list-decimal list-inside text-sm text-gray-300 space-y-2">
            <li>Sign in with your username and choose single or multiplayer on this landing page — this is the only place the controls live.</li>
            <li>Each round drops a fresh claim, you get 30 seconds to vote trust or doubt, and appeals escalate when the crowd wants a second look.</li>
            <li>The final scoreboard appears only after all rounds so you can review XP, accuracy, and appeal streaks before starting again.</li>
          </ol>
        </section>
      </div>
    </main>
  );
}
