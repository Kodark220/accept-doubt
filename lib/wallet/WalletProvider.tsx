"use client";

import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from "react";
import {
  isMetaMaskInstalled,
  connectMetaMask,
  switchAccount,
  getAccounts,
  getCurrentChainId,
  isOnGenLayerNetwork,
  getEthereumProvider,
  GENLAYER_CHAIN_ID,
} from "./client";
import { error, userRejected, warning } from "../../utils/toast";

const DISCONNECT_FLAG = "wallet_disconnected";

export interface WalletState {
  address: string | null;
  chainId: string | null;
  isConnected: boolean;
  isLoading: boolean;
  isMetaMaskInstalled: boolean;
  isOnCorrectNetwork: boolean;
}

interface WalletContextValue extends WalletState {
  connectWallet: () => Promise<string>;
  disconnectWallet: () => void;
  switchWalletAccount: () => Promise<string>;
}

const WalletContext = createContext<WalletContextValue | undefined>(undefined);

export function WalletProvider({ children }: { children: ReactNode }) {
  // Wallet integration is currently disabled by request. Provide a no-op
  // WalletContext that preserves the API surface so other components don't break.
  const [state] = useState<WalletState>({
    address: null,
    chainId: null,
    isConnected: false,
    isLoading: false,
    isMetaMaskInstalled: false,
    isOnCorrectNetwork: false,
  });

  const connectWallet = useCallback(async () => {
    error("Wallet integration disabled", { description: "Wallet connect is currently turned off." });
    return Promise.reject(new Error("Wallet integration disabled"));
  }, []);

  const disconnectWallet = useCallback(() => {
    // no-op
  }, []);

  const switchWalletAccount = useCallback(async () => {
    error("Wallet integration disabled", { description: "Wallet connect is currently turned off." });
    return Promise.reject(new Error("Wallet integration disabled"));
  }, []);

  return (
    <WalletContext.Provider value={{ ...state, connectWallet, disconnectWallet, switchWalletAccount }}>
      {children}
    </WalletContext.Provider>
  );
}

export function useWallet() {
  const context = useContext(WalletContext);
  if (context === undefined) {
    throw new Error("useWallet must be used within a WalletProvider");
  }
  return context;
}
