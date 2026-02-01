"use client";

import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from "react";
import { requestAccounts, getAccounts, getCurrentChainId, isMetaMaskInstalled, addProviderListeners } from "./client";
import { toast } from "sonner";

const DISCONNECT_FLAG = "wallet_disconnected";

export interface WalletState {
  address: string | null;
  chainId: string | null;
  isConnected: boolean;
  isLoading: boolean;
  isMetaMaskInstalled: boolean;
}

interface WalletContextValue extends WalletState {
  connectWallet: () => Promise<string | null>;
  disconnectWallet: () => void;
  switchWalletAccount: () => Promise<string | null>;
}

const WalletContext = createContext<WalletContextValue | undefined>(undefined);

export function WalletProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<WalletState>({
    address: null,
    chainId: null,
    isConnected: false,
    isLoading: true,
    isMetaMaskInstalled: false,
  });

  useEffect(() => {
    let mounted = true;
    const init = async () => {
      const installed = isMetaMaskInstalled();
      if (!mounted) return;
      setState((s) => ({ ...s, isMetaMaskInstalled: installed }));

      if (!installed) {
        setState((s) => ({ ...s, isLoading: false }));
        return;
      }

      const disconnected = typeof window !== "undefined" && localStorage.getItem(DISCONNECT_FLAG) === "true";
      if (disconnected) {
        setState((s) => ({ ...s, isLoading: false }));
        return;
      }

      // Hydrate from provider if available
      try {
        const accounts = await getAccounts();
        const chainId = await getCurrentChainId();
        if (!mounted) return;
        const address = accounts?.[0] || null;
        setState({ address, chainId, isConnected: Boolean(address), isLoading: false, isMetaMaskInstalled: installed });
      } catch (e) {
        setState((s) => ({ ...s, isLoading: false }));
      }

      // attach listeners
      const cleanup = addProviderListeners(
        (accounts) => {
          const address = accounts?.[0] || null;
          setState((s) => ({ ...s, address, isConnected: Boolean(address) }));
        },
        (chainId) => {
          setState((s) => ({ ...s, chainId }));
        }
      );

      return () => {
        cleanup && cleanup();
        mounted = false;
      };
    };

    init();

    return () => {
      mounted = false;
    };
  }, []);

  const connectWallet = useCallback(async () => {
    setState((s) => ({ ...s, isLoading: true }));
    try {
      const accounts = await requestAccounts();
      const address = accounts?.[0] || null;
      if (address) {
        try { localStorage.removeItem(DISCONNECT_FLAG); } catch (e) {}
        setState((s) => ({ ...s, address, isConnected: true, isLoading: false }));
        toast.success("Wallet connected");
        return address;
      }
      setState((s) => ({ ...s, isLoading: false }));
      return null;
    } catch (err: any) {
      setState((s) => ({ ...s, isLoading: false }));
      if (err?.message?.includes("User rejected")) {
        toast.error("Connection rejected by user");
      } else {
        toast.error("Failed to connect wallet", { description: err?.message || String(err) });
      }
      throw err;
    }
  }, []);

  const disconnectWallet = useCallback(() => {
    if (typeof window !== "undefined") {
      try { localStorage.setItem(DISCONNECT_FLAG, "true"); } catch (e) {}
    }
    setState((s) => ({ ...s, address: null, isConnected: false }));
    toast("Wallet disconnected");
  }, []);

  const switchWalletAccount = useCallback(async () => {
    setState((s) => ({ ...s, isLoading: true }));
    try {
      // This will open MetaMask account selector
      const address = (await requestAccounts())?.[0] || null;
      setState((s) => ({ ...s, address, isLoading: false, isConnected: Boolean(address) }));
      return address;
    } catch (err: any) {
      setState((s) => ({ ...s, isLoading: false }));
      toast.error("Failed to switch account", { description: err?.message || String(err) });
      throw err;
    }
  }, []);

  const value: WalletContextValue = {
    ...state,
    connectWallet,
    disconnectWallet,
    switchWalletAccount,
  };

  return <WalletContext.Provider value={value}>{children}</WalletContext.Provider>;
}

export function useWallet() {
  const ctx = useContext(WalletContext);
  if (!ctx) throw new Error("useWallet must be used inside WalletProvider");
  return ctx;
}
