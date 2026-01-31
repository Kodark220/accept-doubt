import LeaderboardClient from '../../components/LeaderboardClient';
import Link from 'next/link';

export const metadata = {
  title: 'Leaderboard - Trust or Doubt',
};

export default function LeaderboardPage() {
  return (
    <main className="min-h-screen px-4 py-12">
      <div className="max-w-6xl mx-auto">
        <div className="mb-6">
          <Link href="/" className="text-sm text-white/70 underline">← Back</Link>
        </div>
        <LeaderboardClient />
      </div>
    </main>
  );
}
