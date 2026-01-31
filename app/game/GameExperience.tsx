'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import Link from 'next/link';
import { useAccount, useConnect, useDisconnect } from 'wagmi';
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
  isContractMode,
  submitFinalScore
} from '../../utils/genlayerClient';
import { GameMode, TOTAL_ROUNDS } from './constants';

type PendingRound = {
  scenario: ScenarioClaim;
  playerChoice: 'trust' | 'doubt';
  consensus: ConsensusResult;
};

export default function GameExperience() {
  // ...existing hooks, state, and logic should be here...
  // For now, just wrap the existing JSX so the file is valid
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
        
        {/* Wallet Connection Bar - Multi-wallet support */}
        <div className="flex items-center justify-between bg-white/5 rounded-2xl px-4 py-3 relative">
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-400' : 'bg-gray-500'}`} />
            <span className="text-xs text-gray-400">
              {isConnected && walletAddress
                ? `${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}`
                : 'No wallet connected'
              }
            </span>
            {activeConnector && (
              <span className="text-[10px] text-gray-500 uppercase px-2 py-0.5 bg-white/5 rounded">
                {activeConnector.name}
              </span>
            )}
          </div>
          
          {isConnected ? (
            <button
              onClick={() => disconnect()}
              className="px-4 py-2 rounded-xl text-xs font-semibold uppercase tracking-wider bg-red-500/20 text-red-400 hover:bg-red-500/30 transition"
            >
              Disconnect
            </button>
          ) : (
            <div className="relative">
              <button
                onClick={() => setShowWalletOptions(!showWalletOptions)}
                disabled={isConnecting}
                className="px-4 py-2 rounded-xl text-xs font-semibold uppercase tracking-wider bg-genlayer-blue/20 text-genlayer-blue hover:bg-genlayer-blue/30 transition disabled:opacity-50"
              >
                {isConnecting ? '🔄 Connecting...' : '🔗 Connect Wallet'}
              </button>
              
              {showWalletOptions && (
                <div className="absolute top-full right-0 mt-2 bg-genlayer-dark border border-white/20 rounded-2xl p-3 space-y-2 z-50 min-w-[220px] shadow-xl">
                  <p className="text-xs text-gray-400 uppercase tracking-wider mb-2">Select Wallet</p>
                  {connectors.map((connector) => (
                    <button
                      key={connector.uid}
                      onClick={() => {
                        connect({ connector });
                        setShowWalletOptions(false);
                      }}
                      disabled={isConnecting}
                      className="w-full flex items-center gap-3 px-3 py-2 rounded-xl bg-white/5 hover:bg-white/10 transition text-left disabled:opacity-50"
                    >
                      <span className="text-lg">
                        {connector.name === 'MetaMask' && '🦊'}
                        {connector.name === 'WalletConnect' && '🔗'}
                        {connector.name === 'Coinbase Wallet' && '🔵'}
                        {connector.name === 'Injected' && '💉'}
                        {!['MetaMask', 'WalletConnect', 'Coinbase Wallet', 'Injected'].includes(connector.name) && '👛'}
                      </span>
                      <span className="text-sm text-white">{connector.name}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
        
        <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <div>
            {gameOver ? (
              // GAME OVER - Show final score prominently
              <section className="card-gradient rounded-3xl p-8 mb-6 text-center space-y-6">
                {scoreSubmitted ? (
                  // CONFIRMED SCORE - Show only the blockchain-confirmed score
                  <>
                    <div className="bg-green-500/10 border-2 border-green-500/50 rounded-2xl p-6 space-y-4">
                      <p className="text-xs uppercase tracking-[0.5em] text-green-400">✅ Blockchain Confirmed</p>
                      <h2 className="text-3xl font-bold text-white">Score on GenLayer</h2>
                      <div className="text-7xl font-bold text-green-400">{score} / 100</div>
                      <div className="text-lg text-white/80">
                        <span className="font-semibold">{initialUsername}</span> • {leaderboard.accuracy}% Accuracy
                      </div>
                      {txHash && (
                        <p className="text-xs text-gray-400 break-all pt-2 border-t border-white/10">
                          TX: {txHash}
                        </p>
                      )}
                    </div>
                  </>
                ) : (
                  // UNCONFIRMED - Show full stats and submit option
                  <>
                    <p className="text-xs uppercase tracking-[0.5em] text-genlayer-accent">🎉 Game Complete!</p>
                    <h2 className="text-4xl font-bold text-white">Final Score</h2>
                    <div className="text-6xl font-bold text-genlayer-blue">{score} / 100</div>
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
                    {/* Submit Score to Blockchain */}
                    <div className="border-t border-white/10 pt-6 space-y-3">
                      <p className="text-xs uppercase tracking-[0.3em] text-gray-400">
                        Submit to GenLayer Blockchain
                      </p>
                      {!isConnected ? (
                        <div className="relative">
                          <button
                            onClick={() => setShowWalletOptions(!showWalletOptions)}
                            disabled={isConnecting}
                            className="w-full rounded-2xl border-2 border-dashed border-white/30 px-6 py-4 text-sm font-semibold tracking-[0.1em] text-white/70 hover:border-genlayer-blue hover:text-genlayer-blue transition"
                          >
                            {isConnecting ? '🔄 Connecting...' : '🔗 Connect Wallet to Submit Score'}
                          </button>
                          {showWalletOptions && (
                            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 bg-genlayer-dark border border-white/20 rounded-2xl p-3 space-y-2 z-50 min-w-[220px] shadow-xl">
                              <p className="text-xs text-gray-400 uppercase tracking-wider mb-2">Select Wallet</p>
                              {connectors.map((connector) => (
                                <button
                                  key={connector.uid}
                                  onClick={() => {
                                    connect({ connector });
                                    setShowWalletOptions(false);
                                  }}
                                  disabled={isConnecting}
                                  className="w-full flex items-center gap-3 px-3 py-2 rounded-xl bg-white/5 hover:bg-white/10 transition text-left disabled:opacity-50"
                                >
                                  <span className="text-lg">
                                    {connector.name === 'MetaMask' && '🦊'}
                                    {connector.name === 'WalletConnect' && '🔗'}
                                    {connector.name === 'Coinbase Wallet' && '🔵'}
                                    {connector.name === 'Injected' && '💉'}
                                    {!['MetaMask', 'WalletConnect', 'Coinbase Wallet', 'Injected'].includes(connector.name) && '👛'}
                                  </span>
                                  <span className="text-sm text-white">{connector.name}</span>
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      ) : (
                        <button
                          onClick={handleSubmitScore}
                          disabled={submittingScore}
                          className="w-full rounded-2xl bg-gradient-to-r from-green-500 to-emerald-600 px-6 py-4 text-base font-semibold tracking-[0.2em] text-white disabled:opacity-50"
                        >
                          {submittingScore ? '⏳ Submitting to GenLayer...' : '📝 Sign & Submit Score'}
                        </button>
                      )}
                    </div>
                  </>
                )}
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
