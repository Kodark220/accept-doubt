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
  const [state, setState] = useState<WalletState>({
    address: null,
    chainId: null,
    isConnected: false,
    isLoading: true,
    isMetaMaskInstalled: false,
    isOnCorrectNetwork: false,
  });

  useEffect(() => {
    const initWallet = async () => {
      const installed = isMetaMaskInstalled();

      if (!installed) {
        setState({
          address: null,
          chainId: null,
          isConnected: false,
          isLoading: false,
          isMetaMaskInstalled: false,
          isOnCorrectNetwork: false,
        });
        return;
      }

      if (typeof window !== "undefined") {
        const wasDisconnected = localStorage.getItem(DISCONNECT_FLAG) === "true";
        if (wasDisconnected) {
          setState({
            address: null,
            chainId: null,
            isConnected: false,
            isLoading: false,
            isMetaMaskInstalled: true,
            isOnCorrectNetwork: false,
          });
          return;
        }
      }

      try {
        const accounts = await getAccounts();
        const chainId = await getCurrentChainId();
        const correctNetwork = await isOnGenLayerNetwork();

        setState({
          address: accounts[0] || null,
          chainId,
          isConnected: accounts.length > 0,
          isLoading: false,
          isMetaMaskInstalled: true,
          isOnCorrectNetwork: correctNetwork,
        });
      } catch (error) {
        console.error("Error initializing wallet:", error);
        setState({
          address: null,
          chainId: null,
          isConnected: false,
          isLoading: false,
          isMetaMaskInstalled: true,
          isOnCorrectNetwork: false,
        });
      }
    };

    initWallet();
  }, []);

  useEffect(() => {
    const provider = getEthereumProvider();
    if (!provider) return;

    const handleAccountsChanged = async (accounts: string[]) => {
      const chainId = await getCurrentChainId();
      setState((prev) => ({ ...prev, address: accounts[0] || null, chainId, isConnected: accounts.length > 0 }));
    };

    const handleChainChanged = async (chainId: string) => {
      const correctNetwork = parseInt(chainId, 16) === GENLAYER_CHAIN_ID;
      setState((prev) => ({ ...prev, chainId, isOnCorrectNetwork: correctNetwork }));
    };

    const handleDisconnect = () => {
      setState((prev) => ({ ...prev, address: null, isConnected: false }));
    };

    provider.on("accountsChanged", handleAccountsChanged);
    provider.on("chainChanged", handleChainChanged);
    provider.on("disconnect", handleDisconnect);

    return () => {
      try {
        provider.removeListener("accountsChanged", handleAccountsChanged);
        provider.removeListener("chainChanged", handleChainChanged);
        provider.removeListener("disconnect", handleDisconnect);
      } catch (err) {
        // ignore
      }
    };
  }, []);

  const connectWallet = useCallback(async () => {
    try {
      setState((prev) => ({ ...prev, isLoading: true }));

      const address = await connectMetaMask();
      const chainId = await getCurrentChainId();
      const correctNetwork = await isOnGenLayerNetwork();

      if (typeof window !== "undefined") localStorage.removeItem(DISCONNECT_FLAG);

      setState({ address, chainId, isConnected: true, isLoading: false, isMetaMaskInstalled: true, isOnCorrectNetwork: correctNetwork });
      return address;
    } catch (err: any) {
      console.error("Error connecting wallet:", err);
      setState((prev) => ({ ...prev, isLoading: false }));

      if (err.message?.includes("rejected")) {
        userRejected("Connection cancelled");
      } else if (err.message?.includes("MetaMask is not installed")) {
        error("MetaMask not found", {
          description: "Please install MetaMask to connect your wallet.",
          action: {
            label: "Install MetaMask",
            onClick: () => window.open("https://metamask.io/download/", "_blank"),
          },
        });
      } else {
        error("Failed to connect wallet", { description: err.message || "Please check your MetaMask and try again." });
      }

      throw err;
    }
  }, []);

  const disconnectWallet = useCallback(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem(DISCONNECT_FLAG, "true");
    }

    setState((prev) => ({ ...prev, address: null, isConnected: false }));
  }, []);

  const switchWalletAccount = useCallback(async () => {
    try {
      setState((prev) => ({ ...prev, isLoading: true }));
      const newAddress = await switchAccount();
      const chainId = await getCurrentChainId();
      const correctNetwork = await isOnGenLayerNetwork();

      setState({ address: newAddress, chainId, isConnected: true, isLoading: false, isMetaMaskInstalled: true, isOnCorrectNetwork: correctNetwork });
      return newAddress;
    } catch (err: any) {
      console.error("Error switching account:", err);
      setState((prev) => ({ ...prev, isLoading: false }));
      if (!err.message?.includes("rejected")) {
        error("Failed to switch account", { description: err.message || "Please try again." });
      } else {
        userRejected("Account switch cancelled");
      }
      throw err;
    }
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
