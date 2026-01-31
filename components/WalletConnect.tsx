'use client';

import { useState } from 'react';
import { useAccount, useConnect, useDisconnect } from 'wagmi';

export default function WalletConnect() {
  const { address, isConnected, connector } = useAccount();
  const { connect, connectors, isPending, error } = useConnect();
  const { disconnect } = useDisconnect();
  const [showOptions, setShowOptions] = useState(false);

  if (isConnected && address) {
    return (
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2 bg-white/5 rounded-xl px-3 py-2">
          <div className="w-2 h-2 rounded-full bg-green-400" />
          <span className="text-xs text-gray-300">
            {address.slice(0, 6)}...{address.slice(-4)}
          </span>
          {connector && (
            <span className="text-[10px] text-gray-500 uppercase">
              {connector.name}
            </span>
          )}
        </div>
        <button
          onClick={() => disconnect()}
          className="px-3 py-2 rounded-xl text-xs font-semibold uppercase tracking-wider bg-red-500/20 text-red-400 hover:bg-red-500/30 transition"
        >
          Disconnect
        </button>
      </div>
    );
  }

  return (
    <div className="relative">
      <button
        onClick={() => setShowOptions(!showOptions)}
        disabled={isPending}
        className="px-4 py-2 rounded-xl text-xs font-semibold uppercase tracking-wider bg-genlayer-blue/20 text-genlayer-blue hover:bg-genlayer-blue/30 transition disabled:opacity-50"
      >
        {isPending ? '🔄 Connecting...' : '🔗 Connect Wallet'}
      </button>
      
      {showOptions && (
        <div className="absolute top-full right-0 mt-2 bg-genlayer-dark border border-white/20 rounded-2xl p-3 space-y-2 z-50 min-w-[200px] shadow-xl">
          <p className="text-xs text-gray-400 uppercase tracking-wider mb-2">Select Wallet</p>
          {connectors.map((connector) => (
            <button
              key={connector.uid}
              onClick={() => {
                connect({ connector });
                setShowOptions(false);
              }}
              disabled={isPending}
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
          {error && (
            <p className="text-xs text-red-400 mt-2">{error.message}</p>
          )}
        </div>
      )}
    </div>
  );
}

// Hook to use wallet data in other components
export function useWallet() {
  const { address, isConnected, connector } = useAccount();
  const { disconnect } = useDisconnect();
  
  return {
    address,
    isConnected,
    connectorName: connector?.name,
    disconnect,
    shortAddress: address ? `${address.slice(0, 6)}...${address.slice(-4)}` : null,
  };
}
