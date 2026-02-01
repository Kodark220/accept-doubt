"use client";

import React, { ReactNode } from "react";

// Simplified WalletProvider stub — wallet behavior removed. This keeps
// the provider API intact but implements no wallet interactions.
export function WalletProvider({ children }: { children: ReactNode }) {
  return <>{children}</>;
}

export function useWallet() {
  return {
    address: null,
    chainId: null,
    isConnected: false,
    isLoading: false,
    isMetaMaskInstalled: false,
    connectWallet: async () => { throw new Error('Wallet support removed'); },
    disconnectWallet: () => {},
    switchWalletAccount: async () => { throw new Error('Wallet support removed'); },
  } as const;
}
