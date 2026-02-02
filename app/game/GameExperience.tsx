'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import Link from 'next/link';
import GenLayerLogo from '../../components/GenLayerLogo';
import WalletConnect from '../../components/WalletConnect';
import ScenarioDisplay from '../../components/ScenarioDisplay';
import Voting from '../../components/Voting';
import AppealResolution from '../../components/AppealResolution';
import RoundResults from '../../components/RoundResults';
import Leaderboard from '../../components/Leaderboard';
import ChatPanel from '../../components/ChatPanel';
import { ScenarioClaim, buildScenarioQueue } from '../../utils/scenarios';
import { initialGameState, recordRound, leaderboardSnapshot, RoundHistory, addProvisionalRound, finalizeRound } from '../../utils/gameLogic';
import {
  resolveConsensus,
  resolveAppeal,
  ConsensusResult,
  AppealOutcome,
  isContractMode,
  submitFinalScore,
  waitForTransactionConfirmation,
  checkTransactionStatus
} from '../../utils/genlayerClient';

import { toast } from 'sonner';
import { useWallet } from '../../lib/wallet/WalletProvider';
import { GameMode, TOTAL_ROUNDS } from './constants';

type PendingRound = {
  scenario: ScenarioClaim;
  playerChoice: 'trust' | 'doubt';
  consensus: ConsensusResult;
};

export default function GameExperience({ initialMode, initialUsername, initialQueue, dailyScenario }: { initialMode: GameMode; initialUsername: string; initialQueue: ScenarioClaim[]; dailyScenario: ScenarioClaim }) {
  const modeLabel = initialMode === 'single' ? 'Single player' : 'Multiplayer';
  const contractMode = isContractMode();

  const { address, isConnected, isLoading, connectWallet, disconnectWallet } = useWallet();

  const [showWalletOptions, setShowWalletOptions] = useState(false);
  const [scenarioQueue, setScenarioQueue] = useState<ScenarioClaim[]>(
    initialQueue && initialQueue.length ? initialQueue : buildScenarioQueue(TOTAL_ROUNDS, `${initialUsername}-${initialMode}-${Date.now()}`)
  );
  const [currentIndex, setCurrentIndex] = useState(0);
  const currentScenario = scenarioQueue[currentIndex] ?? (dailyScenario as ScenarioClaim);

  const [timer, setTimer] = useState(30);
  const [timedOut, setTimedOut] = useState(false);
  const [canVoteWithTimer, setCanVoteWithTimer] = useState(true);
  const [pendingRound, setPendingRound] = useState<PendingRound | null>(null);
  const [lastRound, setLastRound] = useState<RoundHistory | undefined>(undefined);
  const [scoreSubmitted, setScoreSubmitted] = useState(false);
  const [submittingScore, setSubmittingScore] = useState(false);
  const [scorePending, setScorePending] = useState(false);
  const [txHash, setTxHash] = useState<string | undefined>(undefined);
  const [gameOver, setGameOver] = useState(false);
  const [readyForNext, setReadyForNext] = useState(false);
  const [showConfirmedResults, setShowConfirmedResults] = useState(false);
  // Whether the current pending round is still waiting for consensus to finalize
  // (declared after `gameState` below)

  // Poll / timeout UI states for pending confirmations
  const [pollStartTime, setPollStartTime] = useState<number | null>(null);
  const [pollElapsed, setPollElapsed] = useState<number>(0);
  const [pollTimedOut, setPollTimedOut] = useState<boolean>(false);
  const pollTimerRef = useRef<number | null>(null);
  const POLL_INTERVAL = 5000; // ms
  const MAX_POLL_SECONDS = 10 * 60; // 10 minutes

  const [gameState, setGameState] = useState(initialGameState(TOTAL_ROUNDS));

  const leaderboard = leaderboardSnapshot(gameState);
  const score = leaderboard.score;
  const currentRoundNumber = Math.min(currentIndex + 1, scenarioQueue.length);
  const isConsensusPending = Boolean(pendingRound && !gameState.history.some((h) => h.scenario.text === pendingRound.scenario.text && h.finalized));

  const handleSubmitScore = async () => {
    if (!isConnected) throw new Error('No wallet');
    setSubmittingScore(true);
    setScorePending(true);
    try {
      // Submit without waiting for confirmation so UI can remain responsive
      const result = await submitFinalScore(address as string, initialUsername, leaderboard.xp, gameState.correct, TOTAL_ROUNDS);
      if (!result) throw new Error('No result from submitFinalScore');

      if (result?.hash) {
        const hash = result.hash as `0x${string}`;
        setTxHash(hash);

        if (result?.confirmed) {
          // Immediate confirmation (mock mode or waitForConfirmation used)
          setScoreSubmitted(true);
          setScorePending(false);
        } else {
          // Start resumable polling in the background for confirmation
          setScorePending(true);
          startPollingForConfirmation(hash);
        }
      }
    } catch (err) {
      console.error('Failed to submit score:', err);
      setScorePending(false);
    } finally {
      setSubmittingScore(false);
    }
  };

  const handleVote = async (choice: 'trust' | 'doubt') => {
    if (!currentScenario) return;
    setCanVoteWithTimer(false);

    // Make Next available immediately so player can continue without waiting for consensus
    setReadyForNext(true);

    // Set a provisional pending round so UI can reflect that a vote occurred
    const provisional: PendingRound = { scenario: currentScenario, playerChoice: choice, consensus: { consensus: choice, confidence: 0 } as unknown as ConsensusResult };
    setPendingRound(provisional);

    // Resolve consensus in background and record when available
    (async () => {
      let consensus: ConsensusResult;
      try {
        consensus = await resolveConsensus(currentScenario);
      } catch (err) {
        console.error('Consensus resolution failed, using fallback:', err);
        consensus = { consensus: choice, confidence: 0.5 } as unknown as ConsensusResult;
      }

      const resolved: PendingRound = { scenario: currentScenario, playerChoice: choice, consensus };
      setPendingRound(resolved);

      // Finalize the round (convert provisional to finalized and update counts)
      // Use current gameState to compute updated state synchronously so we can expose the lastRound immediately.
      const updatedState = finalizeRound(gameState, currentScenario.text, consensus);
      setGameState(updatedState);
      setLastRound(updatedState.history[updatedState.history.length - 1]);
    })();
  };

  const requestAppeal = async () => {
    if (!pendingRound) return;
    const outcome = await resolveAppeal(pendingRound.consensus);
    // Update last round with appeal outcome by re-recording (simplified)
    const newState = recordRound(gameState, pendingRound.scenario, pendingRound.playerChoice, pendingRound.consensus, outcome);
    setGameState(newState);
    setPendingRound(null);
    setReadyForNext(true);
  };

  const handleNextClick = () => {
    // If there's a pending vote that hasn't been recorded yet, persist a provisional result
    if (pendingRound && gameState.roundsPlayed < currentIndex + 1) {
      setGameState((prev) => {
        const already = prev.history.some((h) => h.scenario.text === pendingRound.scenario.text);
        if (already) return prev;
        return addProvisionalRound(prev, pendingRound.scenario, pendingRound.playerChoice);
      });
      setPendingRound(null);
    }

    if (currentIndex < scenarioQueue.length - 1) {
      setCurrentIndex((prev) => prev + 1);
      setReadyForNext(false);
      setCanVoteWithTimer(true);
      setTimer(30);
    } else {
      setGameOver(true);
    }
  };

  const restartGame = () => {
    const newSeed = `${initialUsername}-${initialMode}-${Date.now()}`;
    setScenarioQueue(buildScenarioQueue(TOTAL_ROUNDS, newSeed));
    setGameState(initialGameState(TOTAL_ROUNDS));
    setCurrentIndex(0);
    setPendingRound(null);
    setLastRound(undefined);
    setReadyForNext(false);
    setGameOver(false);
    setTimer(30);
    setTimedOut(false);
    setCanVoteWithTimer(true);
  };


  const [activePanel, setActivePanel] = useState<'play'|'history'>('play');
  const panelOptions: { id: 'play'; label: string }[] = [
    { id: 'play', label: 'Play' }
  ];

  // No-op handlers used by UI
  const startPollingForConfirmation = (hash: `0x${string}`) => {
    try {
      sessionStorage.setItem('pendingScore', JSON.stringify({ hash, username: initialUsername, xp: leaderboard.xp, ts: Date.now() }));
    } catch (e) {}

    setPollStartTime(Date.now());
    setPollElapsed(0);
    setPollTimedOut(false);

    // Show a persistent loading toast and resolve it when confirmation arrives or fails
    const toastId = toast.loading('Submitting to GenLayer — awaiting consensus...');
    waitForTransactionConfirmation(hash)
      .then(() => {
        try { sessionStorage.removeItem('pendingScore'); } catch (e) {}
        setScoreSubmitted(true);
        setScorePending(false);
        setPollTimedOut(false);
        if (pollTimerRef.current) {
          window.clearInterval(pollTimerRef.current);
          pollTimerRef.current = null;
        }
        toast.success('Score confirmed on-chain!', { id: toastId });
      })
      .catch((err: any) => {
        console.error('Toast confirmation failed:', err);
        setPollTimedOut(true);
        toast.error('Confirmation failed — check status or retry.', { id: toastId });
      });

    if (pollTimerRef.current) {
      window.clearInterval(pollTimerRef.current);
      pollTimerRef.current = null;
    }

    pollTimerRef.current = window.setInterval(async () => {
      setPollElapsed((prev) => {
        const next = prev + Math.floor(POLL_INTERVAL / 1000);
        if (next >= MAX_POLL_SECONDS) {
          setPollTimedOut(true);
          if (pollTimerRef.current) {
            window.clearInterval(pollTimerRef.current);
            pollTimerRef.current = null;
          }
        }
        return next;
      });

      try {
        const receipt = await checkTransactionStatus(hash);
        if (receipt) {
          setScoreSubmitted(true);
          setScorePending(false);
          setPollTimedOut(false);
          try { sessionStorage.removeItem('pendingScore'); } catch (e) {}
          if (pollTimerRef.current) {
            window.clearInterval(pollTimerRef.current);
            pollTimerRef.current = null;
          }
        }
      } catch (err) {
        console.error('Error while polling tx status:', err);
      }
    }, POLL_INTERVAL);
  };

  const stopPolling = () => {
    if (pollTimerRef.current) {
      window.clearInterval(pollTimerRef.current);
      pollTimerRef.current = null;
    }
    setPollTimedOut(false);
    setPollElapsed(0);
    setPollStartTime(null);
  };

  const handleSubmitScoreSafe = async () => {
    setSubmittingScore(true);
    await handleSubmitScore();
    setSubmittingScore(false);
  };

  useEffect(() => {
    // On mount, resume any pending score submission stored in sessionStorage
    try {
      const raw = sessionStorage.getItem('pendingScore');
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed?.hash && !scoreSubmitted) {
          const hash = parsed.hash as `0x${string}`;
          setTxHash(hash);
          setScorePending(true);
          startPollingForConfirmation(hash);
        }
      }
    } catch (e) {
      // ignore
    }

    // Cleanup on unmount
    return () => {
      if (pollTimerRef.current) {
        window.clearInterval(pollTimerRef.current);
        pollTimerRef.current = null;
      }
    };
  }, []);

  const manualCheckStatus = async () => {
    if (!txHash) return;
    try {
      const receipt = await checkTransactionStatus(txHash as `0x${string}`);
      if (receipt) {
        setScoreSubmitted(true);
        setScorePending(false);
        try { sessionStorage.removeItem('pendingScore'); } catch (e) {}
        if (pollTimerRef.current) {
          window.clearInterval(pollTimerRef.current);
          pollTimerRef.current = null;
        }
      } else {
        // still pending
        setPollTimedOut(true);
      }
    } catch (err) {
      console.error('Manual status check failed:', err);
    }
  };

  const confirmedScorePanel = (
    <div>
      <div className="bg-green-500/10 border-2 border-green-500/50 rounded-2xl p-6 space-y-4">
        <p className="text-xs uppercase tracking-[0.5em] text-green-400">✅ Blockchain Confirmed</p>
        <h2 className="text-3xl font-bold text-white">Score on GenLayer</h2>
        <div className="text-7xl font-bold text-green-400">{score} / 100</div>
        <div className="text-lg text-white/80">
          <span className="font-semibold">{initialUsername}</span> • {leaderboard.accuracy}% Accuracy
        </div>
        {txHash && (
          <p className="text-xs text-gray-400 break-all pt-2 border-t border-white/10">TX: {txHash}</p>
        )}
        <div className="mt-6 space-y-3">
          <h3 className="text-sm text-gray-300 uppercase tracking-[0.3em]">Round breakdown</h3>
          <div className="grid gap-2">
            {gameState.history.map((h, idx) => (
              <div key={idx} className="flex items-center justify-between bg-white/5 rounded-xl p-3">
                <div className="flex-1">
                  <p className="text-sm font-semibold truncate">{h.scenario.text}</p>
                  <p className="text-xs text-gray-400 mt-1">You: {h.playerChoice} • Consensus: {h.consensus} • Confidence: {Math.round(h.consensusConfidence*100)}%</p>
                </div>
                <div className="ml-4">{h.correct ? <span className="text-green-400 font-bold">Correct</span> : <span className="text-red-400 font-bold">Wrong</span>}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4 text-left mt-6">
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
    </div>
  );

  const unconfirmedScorePanel = (
    <div>
      <p className="text-xs uppercase tracking-[0.5em] text-genlayer-accent">🎉 Game Complete!</p>
      <h2 className="text-4xl font-bold text-white">Final Score</h2>
      <div className="text-6xl font-bold text-genlayer-blue">— / 100</div>
      <div className="mt-2 text-sm text-gray-400">
        {scorePending ? (
          <div>
            <p>Score submitted — waiting for blockchain confirmation{txHash && ` (TX: ${txHash})`}.</p>
            <p className="text-xs text-gray-400 mt-2">{pollElapsed > 0 ? `Waiting ${Math.floor(pollElapsed/60)}m ${pollElapsed%60}s` : ''}</p>
            <div className="mt-3 flex gap-3">
              <button onClick={manualCheckStatus} className="px-3 py-2 rounded-xl bg-white/5 text-sm">Check status now</button>
              {pollTimedOut && <button onClick={handleSubmitScore} className="px-3 py-2 rounded-xl bg-genlayer-blue text-sm text-white">Retry submission</button>}
            </div>
          </div>
        ) : (
          <span>Score will be revealed after you submit it to GenLayer. Learn more about wallet confirmation and on-chain submission patterns at <a href="https://github.com/genlayerlabs/genlayer-project-boilerplate" target="_blank" rel="noopener noreferrer" className="underline">GenLayer boilerplate</a>.</span>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4 text-left mt-6">
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

      {/* Submit Score to Blockchain */}
      <div className="border-t border-white/10 pt-6 space-y-3">
        <p className="text-xs uppercase tracking-[0.3em] text-gray-400">Submit to GenLayer Blockchain</p>
        {!isConnected ? (
          <div className="w-full rounded-2xl border-2 border-dashed border-white/30 px-6 py-4 text-sm font-semibold tracking-[0.1em] text-white/70 bg-white/5">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-semibold">Wallet required</p>
                <p className="text-xs text-gray-400 mt-1">Connect a wallet to submit your score to GenLayer.</p>
              </div>
              <div>
                <WalletConnect />
              </div>
            </div>
          </div>
        ) : (
          <div className="w-full rounded-2xl border-2 border-white/10 px-6 py-4 text-sm text-white/90 bg-white/5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm">Connected as <span className="font-mono">{address}</span></p>
                <p className="text-xs text-gray-400 mt-1">You can submit your final score to the GenLayer blockchain.</p>
              </div>
              <div className="flex gap-2">
                <button onClick={handleSubmitScoreSafe} disabled={submittingScore || scorePending} className="px-3 py-2 rounded-xl bg-genlayer-blue text-white">{submittingScore ? 'Submitting...' : 'Submit Score'}</button>
                <button onClick={() => disconnectWallet()} className="px-3 py-2 rounded-xl border border-white/10">Disconnect</button>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="mt-6 space-y-3">
        <h3 className="text-sm text-gray-300 uppercase tracking-[0.3em]">Round breakdown</h3>
        <div className="grid gap-2">
          {gameState.history.map((h, idx) => (
            <div key={idx} className="flex items-center justify-between bg-white/5 rounded-xl p-3">
              <div className="flex-1">
                <p className="text-sm font-semibold truncate">{h.scenario.text}</p>
                <p className="text-xs text-gray-400 mt-1">You: {h.playerChoice} • Consensus: {h.consensus} • Confidence: {Math.round(h.consensusConfidence*100)}%</p>
              </div>
              <div className="ml-4">{h.correct ? <span className="text-green-400 font-bold">Correct</span> : <span className="text-red-400 font-bold">Wrong</span>}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

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
        
        {/* Wallet connect button */}
        <div className="flex items-center justify-between bg-white/5 rounded-2xl px-4 py-3 relative">
          <div className="flex items-center gap-2">
            <WalletConnect />
          </div>
          <div className="text-xs text-gray-400">—</div>
        </div>
        
        <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <div>
            {gameOver ? (
              // GAME OVER - only reveal the compact final dashboard after player confirmation
              showConfirmedResults ? (
                gameState.roundsPlayed > 0 ? (
                  <section className="card-gradient rounded-3xl p-8 mb-6 text-center space-y-6">
                    <p className="text-xs uppercase tracking-[0.5em] text-genlayer-accent">Final Results</p>
                    <h2 className="text-4xl font-bold text-white">{leaderboard.score} / 100</h2>
                    <div className="text-lg text-white/80">
                      <span className="font-semibold">{initialUsername}</span> • {leaderboard.accuracy}% Accuracy
                    </div>
                    <div className="grid grid-cols-3 gap-4 mt-4">
                      <div>
                        <p className="text-xs text-gray-400">XP</p>
                        <p className="text-lg font-bold">{leaderboard.xp}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-400">Appeals</p>
                        <p className="text-lg font-bold">{leaderboard.appealsWon}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-400">Correct</p>
                        <p className="text-lg font-bold">{gameState.correct}/{TOTAL_ROUNDS}</p>
                      </div>
                    </div>

                    <div className="mt-6">
                      <button
                        onClick={restartGame}
                        className="w-full rounded-2xl bg-gradient-to-r from-genlayer-purple to-genlayer-blue px-6 py-4 text-base font-semibold tracking-[0.2em] text-white"
                      >
                        Play Again
                      </button>
                    </div>
                  </section>
                ) : (
                  <section className="card-gradient rounded-3xl p-8 mb-6 text-center space-y-4">
                    <p className="text-sm text-gray-300">No results to display.</p>
                    <button
                      onClick={restartGame}
                      className="w-full rounded-2xl bg-gradient-to-r from-genlayer-purple to-genlayer-blue px-6 py-4 text-base font-semibold tracking-[0.2em] text-white"
                    >
                      Play Again
                    </button>
                  </section>
                )
              ) : (
                <section className="card-gradient rounded-3xl p-8 mb-6 text-center space-y-4">
                  <p className="text-sm text-gray-300">Results are hidden until you confirm them.</p>
                </section>
              )
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

                {/* Show per-round finalized verdicts as they arrive */}
                {lastRound && (
                  <RoundResults lastRound={lastRound} />
                )}
                <div className="flex gap-3">
                  <button
                    onClick={handleNextClick}
                    disabled={gameOver || (!readyForNext && !timedOut)}
                    className="flex-1 rounded-2xl border border-white/30 py-3 text-sm font-semibold uppercase tracking-[0.4em] disabled:opacity-40"
                  >
                    {gameOver ? 'Game complete' : 'Next claim'}
                  </button>
                  <div className="flex items-center gap-2 text-xs text-gray-400">
                    {isConsensusPending && (
                      <>
                        <div className="h-4 w-4 rounded-full border-2 border-t-transparent border-white/60 animate-spin" />
                        <span>Consensus resolving in background</span>
                      </>
                    )}
                  </div>
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
              // After game ends, require click-to-confirm before showing final dashboard
              !showConfirmedResults ? (
                <div className="card-gradient rounded-3xl p-6 mb-4 text-sm text-gray-300">
                  <p className="mb-3">All claims completed. Review resolved verdicts above. Click to confirm final results.</p>
                  <button onClick={() => setShowConfirmedResults(true)} className="w-full rounded-2xl bg-genlayer-blue px-4 py-2 text-white font-semibold">Confirm Final Results</button>
                </div>
              ) : null
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
            </div>
          </div>
        </div>
            {/* Single dashboard only — no additional Leaderboard component here */}

        {/* Show confirmed final dashboard after player confirms results */}
        {gameOver && showConfirmedResults && (
          <Leaderboard
            xp={leaderboard.xp}
            accuracy={leaderboard.accuracy}
            appealsWon={leaderboard.appealsWon}
            history={gameState.history}
          />
        )}

        {/* Confirmation modal overlay when score is pending and not yet confirmed */}
        {scorePending && !scoreSubmitted && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
            <div className="bg-genlayer-dark/90 rounded-2xl p-6 w-[90%] max-w-md text-center">
              <div className="flex flex-col items-center gap-4">
                <div className="h-16 w-16 rounded-full border-4 border-white/10 flex items-center justify-center">
                  <div className="animate-spin border-4 border-t-transparent border-white/60 rounded-full h-8 w-8" />
                </div>
                <h3 className="text-lg font-bold">Waiting for GenLayer Consensus</h3>
                <p className="text-sm text-gray-400">Your score has been submitted{txHash ? ` (TX: ${txHash.slice(0,8)}...${txHash.slice(-6)})` : ''}. This may take a few minutes.</p>
                <div className="flex gap-3 mt-4">
                  <button
                    onClick={manualCheckStatus}
                    className="px-4 py-2 rounded-xl bg-white/5"
                  >
                    Check status
                  </button>
                  {pollTimedOut ? (
                    <button
                      onClick={handleSubmitScore}
                      className="px-4 py-2 rounded-xl bg-genlayer-blue text-white"
                    >
                      Retry submission
                    </button>
                  ) : (
                    <button
                      onClick={stopPolling}
                      className="px-4 py-2 rounded-xl border border-white/10"
                    >
                      Dismiss
                    </button>
                  )}
                </div>
                <p className="text-xs text-gray-400 mt-2">Elapsed: {Math.floor(pollElapsed / 60)}m {pollElapsed % 60}s</p>
              </div>
            </div>
          </div>
        )}
        
      </div>
    </main>
  );
}
