"use client";

import React from "react";
import { useWallet } from "../lib/wallet/WalletProvider";
import { walletConnectEnabled } from "../utils/web3Config";

export default function WalletConnect() {
  const { address, isConnected, isLoading, connectWallet, disconnectWallet } = useWallet();

  return (
    <div>
      {!walletConnectEnabled ? (
        <button disabled className="btn-plain opacity-50 cursor-not-allowed" title="Wallet integration disabled">
          Wallet disabled
        </button>
      ) : !isConnected ? (
        <button onClick={() => connectWallet()} disabled={isLoading} className="btn-plain">
          {isLoading ? "Connecting..." : "Connect Wallet"}
        </button>
      ) : (
        <div className="flex items-center gap-2">
          <span className="font-mono text-sm">{address}</span>
          <button onClick={() => disconnectWallet()} className="btn-plain text-red-500">
            Disconnect
          </button>
        </div>
      )}
    </div>
  );
}
