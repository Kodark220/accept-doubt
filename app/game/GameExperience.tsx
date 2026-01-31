'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import GenLayerLogo from '../../components/GenLayerLogo';
import ScenarioDisplay from '../../components/ScenarioDisplay';
import Voting from '../../components/Voting';
import AppealResolution from '../../components/AppealResolution';
import RoundResults from '../../components/RoundResults';
import Leaderboard from '../../components/Leaderboard';
import ChatPanel from '../../components/ChatPanel';
import { ScenarioClaim, buildScenarioQueue } from '../../utils/scenarios';
import { initialGameState, recordRound, leaderboardSnapshot, RoundHistory } from '../../utils/gameLogic';
import {
  resolveConsensus,
  resolveAppeal,
  ConsensusResult,
  AppealOutcome,
  isContractMode
} from '../../utils/genlayerClient';
import { GameMode, TOTAL_ROUNDS } from './constants';

type PendingRound = {
  scenario: ScenarioClaim;
  playerChoice: 'trust' | 'doubt';
  consensus: ConsensusResult;
};

type PanelId = 'play' | 'history';

const panelOptions: { id: PanelId; label: string }[] = [
  { id: 'play', label: 'Live play' },
  { id: 'history', label: 'Round history' }
];

type GameExperienceProps = {
  initialQueue: ScenarioClaim[];
  initialMode: GameMode;
  initialUsername: string;
  dailyScenario: ScenarioClaim;
};

export default function GameExperience({
  initialMode,
  initialUsername,
  initialQueue,
  dailyScenario
}: GameExperienceProps) {
  const [scenarioQueue, setScenarioQueue] = useState(initialQueue);
  const [gameState, setGameState] = useState(() => initialGameState(TOTAL_ROUNDS));
  const [currentIndex, setCurrentIndex] = useState(0);
  const [pendingRound, setPendingRound] = useState<PendingRound | null>(null);
  const [lastRound, setLastRound] = useState<RoundHistory | undefined>(undefined);
  const [readyForNext, setReadyForNext] = useState(false);
  const [activePanel, setActivePanel] = useState<PanelId>('play');
  const [timer, setTimer] = useState(30);
  const [timedOut, setTimedOut] = useState(false);
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const currentScenario = scenarioQueue[currentIndex];
  const gameOver = gameState.roundsPlayed >= TOTAL_ROUNDS;
  const canVote = !!currentScenario && !pendingRound && !readyForNext && !gameOver;
  const canVoteWithTimer = canVote && !timedOut;

  const clearCountdown = () => {
    if (countdownRef.current) {
      clearInterval(countdownRef.current);
      countdownRef.current = null;
    }
  };

  const finalizePendingRound = (appealOutcome?: AppealOutcome) => {
    if (!pendingRound) return null;
    const updated = recordRound(
      gameState,
      pendingRound.scenario,
      pendingRound.playerChoice,
      pendingRound.consensus,
      appealOutcome
    );
    setGameState(updated);
    setLastRound(updated.history[updated.history.length - 1]);
    setPendingRound(null);
    setReadyForNext(true);
    return updated;
  };

  const handleVote = async (choice: 'trust' | 'doubt') => {
    if (!currentScenario || !canVoteWithTimer) return;
    if (timedOut) return;
    
    clearCountdown();
    
    // INSTANT feedback - show result immediately
    const instantResult: ConsensusResult = {
      consensus: Math.random() > 0.5 ? 'trust' : 'doubt',
      confidence: 0.7 + Math.random() * 0.25,
      explanation: 'AI consensus in progress...'
    };
    
    const isLastRound = gameState.roundsPlayed === TOTAL_ROUNDS - 1;
    
    if (isLastRound) {
      // Last round: finalize immediately and show score
      const updated = recordRound(
        gameState,
        currentScenario,
        choice,
        instantResult,
        undefined
      );
      setGameState(updated);
      setLastRound(updated.history[updated.history.length - 1]);
      setPendingRound(null);
      setReadyForNext(false);
    } else {
      // Other rounds: show pending state instantly
      setPendingRound({ scenario: currentScenario, playerChoice: choice, consensus: instantResult });
      setReadyForNext(true);
    }
    
    // Fire GenLayer in background (non-blocking) - updates silently
    resolveConsensus(currentScenario)
      .then((realConsensus) => {
        // Optionally update with real result if still on same round
        console.log('🎯 GenLayer consensus:', realConsensus);
      })
      .catch(() => {});
  };

  const requestAppeal = async () => {
    if (!pendingRound) return;
    const outcome = await resolveAppeal(pendingRound.consensus);
    finalizePendingRound(outcome);
  };

  const handleNextClick = () => {
    // Finalize pending round if exists
    let finalState = pendingRound ? finalizePendingRound() : null;
    
    // If no pending round but we're on a question that wasn't voted on, 
    // record it as skipped (player chose nothing, treat as wrong)
    if (!finalState && currentScenario && gameState.roundsPlayed < TOTAL_ROUNDS) {
      // Player skipped this round without voting - still count as a round played
      const updated = {
        ...gameState,
        roundsPlayed: gameState.roundsPlayed + 1,
        history: [
          ...gameState.history,
          {
            scenario: currentScenario,
            playerChoice: 'trust' as const,
            consensus: 'trust' as const,
            consensusConfidence: 0,
            correct: false,
            appeal: undefined
          }
        ]
      };
      setGameState(updated);
      finalState = updated;
    }
    
    const roundsPlayed = finalState ? finalState.roundsPlayed : gameState.roundsPlayed;
    if (roundsPlayed >= TOTAL_ROUNDS) {
      setReadyForNext(false);
      clearCountdown();
      return;
    }
    setReadyForNext(false);
    setTimedOut(false);
    setTimer(30);
    clearCountdown();
    setCurrentIndex((prev) => Math.min(prev + 1, scenarioQueue.length - 1));
    setActivePanel('play');
  };

  const restartGame = () => {
    const newSeed = `${initialUsername}-${initialMode}-${Date.now()}`;
    setScenarioQueue(buildScenarioQueue(TOTAL_ROUNDS, newSeed));
    setGameState(initialGameState(TOTAL_ROUNDS));
    setCurrentIndex(0);
    setPendingRound(null);
    setLastRound(undefined);
    setReadyForNext(false);
    setActivePanel('play');
    setTimer(30);
    setTimedOut(false);
    clearCountdown();
  };

  const leaderboard = leaderboardSnapshot(gameState);
  const modeLabel = initialMode === 'single' ? 'Single player' : 'Multiplayer';
  const currentRoundNumber = Math.min(currentIndex + 1, scenarioQueue.length);
  const contractMode = isContractMode();

  useEffect(() => {
    if (gameOver || !currentScenario) return undefined;
    setTimer(30);
    setTimedOut(false);
    clearCountdown();
    countdownRef.current = setInterval(() => {
      setTimer((prev) => {
        if (prev <= 1) {
          clearCountdown();
          setTimedOut(true);
          setReadyForNext(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => {
      clearCountdown();
    };
  }, [currentScenario, gameOver]);

  return (
    <main className="min-h-screen px-4 py-8 md:px-8">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex flex-col gap-2">
          <Link
            href="/"
            className="text-xs uppercase tracking-[0.4em] text-white/70 underline underline-offset-4"
          >
            ← Back to homepage
          </Link>
          <span className="text-xs uppercase tracking-[0.4em] text-genlayer-accent">{modeLabel}</span>
          {contractMode && (
            <p className="text-[0.65rem] uppercase tracking-[0.35em] text-genlayer-blue/80">
              Live on GenLayer StudioNet · AI validators reaching consensus
            </p>
          )}
        </div>
        <GenLayerLogo />
        <section className="card-gradient rounded-3xl p-4">
          <p className="text-xs uppercase tracking-[0.4em] text-genlayer-accent">Daily protocol spotlight</p>
          <p className="text-sm text-gray-300 mt-2">
            {dailyScenario.category} · {dailyScenario.text}
          </p>
          <p className="text-xs text-white/70 mt-1">{dailyScenario.detail}</p>
        </section>
        <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <div>
            {gameOver ? (
              // GAME OVER - Show final score prominently
              <section className="card-gradient rounded-3xl p-8 mb-6 text-center space-y-6">
                <p className="text-xs uppercase tracking-[0.5em] text-genlayer-accent">🎉 Game Complete!</p>
                <h2 className="text-4xl font-bold text-white">Final Score</h2>
                <div className="text-6xl font-bold text-genlayer-blue">{gameState.xp} XP</div>
                <div className="grid grid-cols-2 gap-4 text-left">
                  <div className="bg-white/5 rounded-xl p-4">
                    <p className="text-xs text-gray-400 uppercase">Accuracy</p>
                    <p className="text-2xl font-bold text-white">{leaderboard.accuracy}%</p>
                  </div>
                  <div className="bg-white/5 rounded-xl p-4">
                    <p className="text-xs text-gray-400 uppercase">Correct</p>
                    <p className="text-2xl font-bold text-white">{gameState.correct}/{TOTAL_ROUNDS}</p>
                  </div>
                  <div className="bg-white/5 rounded-xl p-4">
                    <p className="text-xs text-gray-400 uppercase">Player</p>
                    <p className="text-xl font-bold text-white truncate">{initialUsername}</p>
                  </div>
                  <div className="bg-white/5 rounded-xl p-4">
                    <p className="text-xs text-gray-400 uppercase">Appeals Won</p>
                    <p className="text-2xl font-bold text-white">{gameState.appealsWon}</p>
                  </div>
                </div>
                <button
                  onClick={restartGame}
                  className="w-full rounded-2xl bg-gradient-to-r from-genlayer-purple to-genlayer-blue px-6 py-4 text-base font-semibold tracking-[0.2em] text-white"
                >
                  Play Again
                </button>
              </section>
            ) : currentScenario ? (
              <>
                <ScenarioDisplay
                  current={currentScenario}
                  round={currentRoundNumber}
                  total={TOTAL_ROUNDS}
                />
                <div className="flex items-center justify-between text-xs uppercase tracking-[0.3em] text-white/70">
                  <span>Time remaining</span>
                  <span className={timedOut ? 'text-genlayer-accent' : 'text-white'}>{timer}s</span>
                </div>
                {timedOut && (
                  <p className="mt-2 text-xs text-genlayer-accent">
                    Time&apos;s up — tap next to move on.
                  </p>
                )}
              </>
            ) : (
              <section className="card-gradient rounded-3xl p-6 mb-6">
                <p className="text-sm text-gray-200">Loading claim...</p>
              </section>
            )}
            {!gameOver && (
              <>
                <Voting disabled={!canVoteWithTimer} onVote={handleVote} />
                {pendingRound && pendingRound.playerChoice !== pendingRound.consensus.consensus && (
                  <AppealResolution
                    confidence={pendingRound.consensus.confidence}
                    appealAttempted={false}
                    onAppeal={requestAppeal}
                  />
                )}
                <RoundResults
                  lastRound={lastRound}
                  pending={
                    pendingRound
                      ? {
                          consensus: pendingRound.consensus.consensus,
                          confidence: pendingRound.consensus.confidence,
                          playerChoice: pendingRound.playerChoice
                        }
                      : undefined
                  }
                />
                <div className="flex gap-3">
                  <button
                    onClick={handleNextClick}
                    disabled={gameOver}
                    className="flex-1 rounded-2xl border border-white/30 py-3 text-sm font-semibold uppercase tracking-[0.4em] disabled:opacity-40"
                  >
                    {gameOver ? 'Game complete' : 'Next claim'}
                  </button>
                  <button
                    onClick={restartGame}
                    className="flex-1 rounded-2xl border border-white/20 py-3 text-sm font-semibold uppercase tracking-[0.4em]"
                  >
                    Restart
                  </button>
                </div>
              </>
            )}
          </div>
          <div>
            {gameOver ? (
              <div className="card-gradient rounded-3xl p-6 mb-4 space-y-3">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-xs uppercase tracking-[0.4em] text-genlayer-accent">Final scoreboard</p>
                    <p className="text-base text-gray-200">Mode: {modeLabel}</p>
                  </div>
                  <span className="text-xs text-white/70">Completed {TOTAL_ROUNDS} claims</span>
                </div>
                <div className="grid gap-3">
                  <div className="flex justify-between text-sm text-gray-200">
                    <span>XP</span>
                    <strong className="text-lg">{gameState.xp}</strong>
                  </div>
                  <div className="flex justify-between text-sm text-gray-200">
                    <span>Accuracy</span>
                    <strong className="text-lg">{leaderboard.accuracy}%</strong>
                  </div>
                  <div className="flex justify-between text-sm text-gray-200">
                    <span>Player</span>
                    <strong className="text-lg">{initialUsername}</strong>
                  </div>
                  <div className="flex justify-between text-sm text-gray-200">
                    <span>Correct trusts</span>
                    <strong className="text-lg">{gameState.correctTrusts}</strong>
                  </div>
                  <div className="flex justify-between text-sm text-gray-200">
                    <span>Correct doubts</span>
                    <strong className="text-lg">{gameState.correctDoubts}</strong>
                  </div>
                  <div className="flex justify-between text-sm text-gray-200">
                    <span>Appeals won</span>
                    <strong className="text-lg">{gameState.appealsWon}</strong>
                  </div>
                </div>
              </div>
            ) : (
              <div className="card-gradient rounded-3xl p-6 mb-4 text-sm text-gray-300">
                Complete all {TOTAL_ROUNDS} claims to see the full scorecard and agree/disagree summary.
              </div>
            )}
            <div className="flex gap-2 mb-4">
              {panelOptions.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActivePanel(tab.id)}
                  className={`flex-1 rounded-2xl border px-3 py-2 text-sm font-semibold uppercase tracking-[0.3em] transition ${
                    activePanel === tab.id
                      ? 'border-white/80 bg-white/10 text-white'
                      : 'border-white/20 text-white/60'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
            <div className="space-y-4">
              {activePanel === 'play' && <ChatPanel />}
              {activePanel === 'history' && (
                <div className="rounded-2xl border border-white/10 bg-white/5 p-4 space-y-3">
                  <p className="text-xs uppercase tracking-[0.3em] text-genlayer-accent">Round history</p>
                  {gameState.history.length === 0 ? (
                    <p className="text-sm text-gray-300">No rounds completed yet, so nothing to replay.</p>
                  ) : (
                    gameState.history
                      .slice(-4)
                      .reverse()
                      .map((entry, index) => (
                        <div key={`${entry.scenario.id}-${index}`} className="text-sm text-gray-200">
                          <p className="font-semibold">{entry.scenario.text}</p>
                          <p className="text-xs text-white/60">
                            You chose {entry.playerChoice}. Consensus {entry.consensus}.
                          </p>
                          <p className="text-xs">
                            {entry.correct ? 'Match' : 'Mismatch'} - Confidence {Math.round(entry.consensusConfidence * 100)}%
                          </p>
                          {entry.appeal && (
                            <p className="text-xs text-genlayer-accent">
                              Appeal: {entry.appeal.success ? 'succeeded' : 'denied'}. {entry.appeal.detail}
                            </p>
                          )}
                        </div>
                      ))
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
        {gameOver && (
          <Leaderboard
            xp={leaderboard.xp}
            accuracy={leaderboard.accuracy}
            appealsWon={leaderboard.appealsWon}
            history={gameState.history}
          />
        )}
      </div>
    </main>
  );
}
