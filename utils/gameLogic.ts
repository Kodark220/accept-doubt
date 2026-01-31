import { ScenarioClaim } from './scenarios';
import { ConsensusResult, AppealOutcome } from './mockAI';

export type RoundHistory = {
  scenario: ScenarioClaim;
  playerChoice: 'trust' | 'doubt';
  consensus: 'trust' | 'doubt';
  consensusConfidence: number;
  correct: boolean;
  appeal?: {
    attempted: boolean;
    success: boolean;
    detail: string;
  };
};

export type GameState = {
  xp: number;
  correct: number;
  correctTrusts: number;
  correctDoubts: number;
  appealsWon: number;
  roundsPlayed: number;
  totalRounds: number;
  history: RoundHistory[];
};

export function initialGameState(totalRounds: number): GameState {
  return {
    xp: 0,
    correct: 0,
    correctTrusts: 0,
    correctDoubts: 0,
    appealsWon: 0,
    roundsPlayed: 0,
    totalRounds,
    history: []
  };
}

export function recordRound(
  state: GameState,
  scenario: ScenarioClaim,
  playerChoice: 'trust' | 'doubt',
  consensus: ConsensusResult,
  appealOutcome?: AppealOutcome
): GameState {
  const appealUsed = !!appealOutcome;
  const appealSuccess = appealOutcome?.success ?? false;
  const earnedXp = (playerChoice === consensus.consensus || appealSuccess ? 10 : 0) + (appealSuccess ? 5 : 0);
  const correct = playerChoice === consensus.consensus || appealSuccess;
  const correctTrusts = correct && playerChoice === 'trust' ? 1 : 0;
  const correctDoubts = correct && playerChoice === 'doubt' ? 1 : 0;

  const historyItem: RoundHistory = {
    scenario,
    playerChoice,
    consensus: consensus.consensus,
    consensusConfidence: consensus.confidence,
    correct,
    appeal: appealUsed
      ? {
          attempted: true,
          success: appealSuccess,
          detail: appealOutcome?.detail ?? 'Additional validation completed.'
        }
      : undefined
  };

  return {
    ...state,
    xp: state.xp + earnedXp,
    correct: state.correct + (correct ? 1 : 0),
    correctTrusts: state.correctTrusts + correctTrusts,
    correctDoubts: state.correctDoubts + correctDoubts,
    appealsWon: state.appealsWon + (appealSuccess ? 1 : 0),
    roundsPlayed: state.roundsPlayed + 1,
    history: [...state.history, historyItem]
  };
}

export function computeAccuracy(state: GameState): number {
  if (!state.roundsPlayed) return 0;
  return Math.round((state.correct / state.roundsPlayed) * 100);
}

export function leaderboardSnapshot(state: GameState) {
  return {
    xp: state.xp,
    accuracy: computeAccuracy(state),
    correctTrusts: state.correctTrusts,
    correctDoubts: state.correctDoubts,
    appealsWon: state.appealsWon,
    roundsPlayed: state.roundsPlayed
  };
}
