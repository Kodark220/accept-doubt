import { ScenarioClaim } from './scenarios';

export type ConsensusResult = {
  consensus: 'trust' | 'doubt';
  confidence: number;
  explanation: string;
};

export type AppealOutcome = {
  success: boolean;
  detail: string;
};

export function runConsensus(claim: ScenarioClaim): ConsensusResult {
  const base = claim.verdict === 'trust' ? 0.7 : 0.65;
  const randomness = Math.random() * 0.15;
  return {
    consensus: claim.verdict,
    confidence: Math.min(0.95, base + randomness),
    explanation: claim.detail
  };
}

export function runAppeal(previous: ConsensusResult): AppealOutcome {
  const appealChance = previous.confidence < 0.85 ? 0.45 : 0.25;
  const success = Math.random() < appealChance;
  return {
    success,
    detail: success
      ? 'Additional validators bolstered your perspective and flipped consensus.'
      : 'Expanded validation confirmed the earlier verdict and kept the status quo.'
  };
}
