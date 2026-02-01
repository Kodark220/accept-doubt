'use client';

import { useState } from 'react';
import { useAccount, useConnect, useDisconnect } from 'wagmi';

export default function WalletConnect() {
  // WalletConnect option may be disabled in dev if no project id is set.
  // Do not return early here — only hide the WalletConnect connector option
  // later in the UI. Returning here prevented the whole Connect button
  // from rendering in development.
  const { walletConnectEnabled } = require('../utils/web3Config');
  const { address, isConnected, connector } = useAccount();
  const { connect, connectors, isPending, error } = useConnect();
  const { disconnect } = useDisconnect();
  const [showOptions, setShowOptions] = useState(false);
  const [lastError, setLastError] = useState<string | null>(null);

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

  const handleConnectorClick = async (c: any) => {
    setLastError(null);
    let originalEth: any = null;
    let patched = false;

    try {
      console.log('Attempting connect with', { id: c.id, name: c.name, ready: c.ready, connector: c });

      const eth = (typeof window !== 'undefined' ? (window as any).ethereum : undefined);

      // If this looks like an injected connector (MetaMask / Injected), attempt
      // a direct account request on the preferred injected provider to force
      // the wallet popup before calling wagmi.connect. We broaden the check
      // to include connectors named like MetaMask because some connectors
      // expose different ids.
      if (eth && (c?.id === 'injected' || String(c?.name || '').toLowerCase().includes('meta') || c?.name === 'Injected' || c?.name === 'MetaMask')) {
        try {
          const providers = eth.providers && Array.isArray(eth.providers) ? eth.providers : [eth];
          // Preference order: MetaMask, OKX, any
          const pref = providers.find((p: any) => p.isMetaMask) || providers.find((p: any) => p.isOkxWallet) || providers[0];

          if (pref && pref !== eth) {
            originalEth = eth;
            (window as any).ethereum = pref;
            patched = true;
            console.log('Temporarily set window.ethereum to preferred provider for pre-request', { name: pref?.provider?.name || pref?.isMetaMask ? 'MetaMask' : pref?.isOkxWallet ? 'OKX' : 'Injected' });
          }

          // Force a direct request for accounts (must be user gesture) — call
          // the request synchronously in the click handler so the browser
          // treats it as a user gesture and the wallet shows a popup.
          try {
            const preReq = (window as any).ethereum.request({ method: 'eth_requestAccounts' });
            const acc = await preReq;
            console.log('Pre-request accounts succeeded', acc);
          } catch (preErr) {
            console.warn('Pre-request accounts failed (may be handled by connect):', preErr);
          }
        } catch (innerErr) {
          console.warn('Injected pre-request setup failed:', innerErr);
        }
      }

      console.log('Calling wagmi.connect with connector', c?.id || c?.name);
      await connect({ connector: c });
      console.log('wagmi.connect returned; check wagmi state for updates');
      setShowOptions(false);
    } catch (e: any) {
      console.error('connect failed', e, e?.stack);
      setLastError(e?.message || String(e));
    } finally {
      if (patched && originalEth) {
        try {
          (window as any).ethereum = originalEth;
          console.log('Restored original window.ethereum');
        } catch (err) {
          console.warn('Failed to restore window.ethereum', err);
        }
      }
    }
  };

  const showDebug = typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('debugWallet') === '1';

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
              onClick={() => handleConnectorClick(connector)}
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
          {lastError && (
            <p className="text-xs text-red-400 mt-2">Connector error: {lastError}</p>
          )}

          {showDebug && (
            <div className="mt-2 text-xs text-gray-300">
              <strong>Debug</strong>
              <pre className="text-[12px] mt-1 max-h-40 overflow-auto">{JSON.stringify(connectors.map((c: any) => ({ id: c.id, name: c.name, ready: c.ready, uid: c.uid })), null, 2)}</pre>
              <pre className="text-[12px] mt-1">Injected: {JSON.stringify((window as any).ethereum ? { isMetaMask: (window as any).ethereum.isMetaMask, isOkxWallet: (window as any).ethereum.isOkxWallet, providers: (window as any).ethereum.providers ? (window as any).ethereum.providers.map((p: any) => ({ isMetaMask: p.isMetaMask, isOkxWallet: p.isOkxWallet, name: p?.provider?.name || 'unknown' })) : null } : 'none', null, 2)}</pre>              <div className="mt-2 flex gap-2">
                <button
                  onClick={async () => {
                    const eth = (window as any).ethereum;
                    if (!eth) return alert('No injected ethereum provider detected');
                    if (eth.providers && Array.isArray(eth.providers) && eth.providers.length) {
                      for (const p of eth.providers) {
                        try {
                          const acc = await p.request({ method: 'eth_requestAccounts' });
                          console.log('provider responded', p, acc);
                          alert(`Provider responded: ${acc}`);
                          return;
                        } catch (err) {
                          console.warn('provider request failed', err);
                        }
                      }
                      alert('No injected provider responded to account request.');
                      return;
                    }
                    try {
                      const acc = await eth.request({ method: 'eth_requestAccounts' });
                      alert('Accounts: ' + (acc || []).join(','));
                    } catch (err:any) {
                      alert('Error: ' + (err?.message || String(err)));
                    }
                  }}
                  className="px-2 py-1 rounded bg-white/5"
                >
                  Request Accounts (injected)
                </button>
                <button
                  onClick={() => console.log('connectors', connectors)}
                  className="px-2 py-1 rounded bg-white/5"
                >
                  Log connectors
                </button>
              </div>            </div>
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
