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
  finalized?: boolean;
};

export type GameState = {
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
    ,
    finalized: true
  };

  return {
    ...state,
    correct: state.correct + (correct ? 1 : 0),
    correctTrusts: state.correctTrusts + correctTrusts,
    correctDoubts: state.correctDoubts + correctDoubts,
    appealsWon: state.appealsWon + (appealSuccess ? 1 : 0),
    roundsPlayed: state.roundsPlayed + 1,
    history: [...state.history, historyItem]
  };
}

export function addProvisionalRound(state: GameState, scenario: ScenarioClaim, playerChoice: 'trust' | 'doubt') {
  const historyItem: RoundHistory = {
    scenario,
    playerChoice,
    consensus: playerChoice,
    consensusConfidence: 0,
    correct: false,
    finalized: false
  };

  return {
    ...state,
    history: [...state.history, historyItem]
  };
}

export function finalizeRound(
  state: GameState,
  scenarioText: string,
  consensus: ConsensusResult,
  appealOutcome?: AppealOutcome,
  originalScenario?: ScenarioClaim,
  playerChoice?: 'trust' | 'doubt'
): GameState {
  // First check if already finalized for this scenario to avoid duplicates
  const alreadyFinalized = state.history.find((h) => h.scenario.text === scenarioText && h.finalized);
  if (alreadyFinalized) {
    // Already finalized, do nothing
    return state;
  }

  const idx = state.history.findIndex((h) => h.scenario.text === scenarioText && !h.finalized);
  if (idx === -1) {
    // No provisional entry — fall back to recording normally
    const scenario = originalScenario || { text: scenarioText, detail: '', category: '', id: `fallback-${Date.now()}` } as ScenarioClaim;
    // Use player's choice if provided, otherwise consensus (fallback)
    const choice = playerChoice || consensus.consensus as 'trust' | 'doubt';
    return recordRound(state, scenario, choice, consensus, appealOutcome);
  }

  const existing = state.history[idx];
  const appealUsed = !!appealOutcome;
  const appealSuccess = appealOutcome?.success ?? false;
  const correct = existing.playerChoice === consensus.consensus || appealSuccess;
  const correctTrusts = correct && existing.playerChoice === 'trust' ? 1 : 0;
  const correctDoubts = correct && existing.playerChoice === 'doubt' ? 1 : 0;

  const updated: RoundHistory = {
    ...existing,
    consensus: consensus.consensus,
    consensusConfidence: consensus.confidence,
    correct,
    appeal: appealUsed
      ? {
          attempted: true,
          success: appealSuccess,
          detail: appealOutcome?.detail ?? 'Additional validation completed.'
        }
      : existing.appeal,
    finalized: true
  };

  const newHistory = [...state.history];
  newHistory[idx] = updated;

  return {
    ...state,
    correct: state.correct + (correct ? 1 : 0),
    correctTrusts: state.correctTrusts + correctTrusts,
    correctDoubts: state.correctDoubts + correctDoubts,
    appealsWon: state.appealsWon + (appealSuccess ? 1 : 0),
    roundsPlayed: state.roundsPlayed + 1,
    history: newHistory
  };
}

export function computeAccuracy(state: GameState): number {
  if (!state.roundsPlayed) return 0;
  return Math.round((state.correct / state.roundsPlayed) * 100);
}

export function leaderboardSnapshot(state: GameState) {
  return {
    xp: state.correct * 20,
    score: state.correct * 20,
    accuracy: computeAccuracy(state),
    correctTrusts: state.correctTrusts,
    correctDoubts: state.correctDoubts,
    appealsWon: state.appealsWon,
    roundsPlayed: state.roundsPlayed
  };
}
