import React from 'react';

// Wallet UI removed — component is a no-op placeholder.
export default function WalletConnect() {
  return null;
}

// Minimal useWallet stub to avoid breaking imports elsewhere.
export function useWallet() {
  return {
    address: null,
    isConnected: false,
    connectorName: null,
    disconnect: async () => {},
    shortAddress: null,
  };
}
