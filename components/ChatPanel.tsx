'use client';

const buffer = [
  'Bot-Alpha: Validator nodes are warming up for the next scenario.',
  'Bot-Delta: Daily insights pull from the latest GenLayer protocol briefs.',
  'Bot-Zeta: Appeals keep consensus honest when human intuition diverges.',
  'PulseStation: Multiplayer squads just shared a high-accuracy streak.',
];

export default function ChatPanel() {
  return (
    <section className="card-gradient rounded-3xl p-6 mt-6">
      <h3 className="text-xl font-semibold">Lobby chat</h3>
      <div className="mt-4 space-y-2 text-sm text-gray-200">
        {buffer.map((line) => (
          <p key={line} className="text-[0.9rem]">{line}</p>
        ))}
      </div>
    </section>
  );
}
