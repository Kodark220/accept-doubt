import GameExperience from './GameExperience';
import { buildScenarioQueue, getDailyScenario } from '../../utils/scenarios';
import { GameMode, TOTAL_ROUNDS } from './constants';
import { redirect } from 'next/navigation';

type GamePageProps = {
  searchParams?: {
    mode?: GameMode;
    username?: string;
    seed?: string;
  };
};

export default function GamePage({ searchParams }: GamePageProps) {
  const requestedMode: GameMode = searchParams?.mode === 'multi' ? 'multi' : 'single';
  const rawName = typeof searchParams?.username === 'string' ? searchParams.username : '';
  const username = rawName.trim();
  if (!username) {
    redirect('/');
  }
  const seed = typeof searchParams?.seed === 'string' && searchParams.seed ? searchParams.seed : `${username}-${requestedMode}`;
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
