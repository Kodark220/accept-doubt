import GameExperience from './GameExperience';
import { buildScenarioQueue, getDailyScenario } from '../../utils/scenarios';
import { GameMode, TOTAL_ROUNDS } from './constants';
import { redirect } from 'next/navigation';

type GamePageProps = {
  searchParams: Promise<{
    mode?: GameMode;
    username?: string;
    seed?: string;
  }>;
};

export default async function GamePage({ searchParams }: GamePageProps) {
  const params = await searchParams;
  const requestedMode: GameMode = params?.mode === 'multi' ? 'multi' : 'single';
  const rawName = typeof params?.username === 'string' ? params.username : '';
  const username = rawName.trim();
  if (!username) {
    redirect('/');
  }
  const seed = typeof params?.seed === 'string' && params.seed ? params.seed : `${username}-${requestedMode}`;
  const initialQueue = buildScenarioQueue(
    TOTAL_ROUNDS,
    seed
  );
  const dailyScenario = getDailyScenario();

  return (
    <GameExperience
      initialMode={requestedMode}
      initialUsername={username}
      initialQueue={initialQueue}
      dailyScenario={dailyScenario}
    />
  );
}
