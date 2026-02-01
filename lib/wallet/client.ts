"use client";

// Minimal wallet helpers inspired by genlayer-boilerplate
export interface EthereumProvider {
  isMetaMask?: boolean;
  isOkxWallet?: boolean;
  request: (args: { method: string; params?: any[] }) => Promise<any>;
  on: (event: string, handler: (...args: any[]) => void) => void;
  removeListener: (event: string, handler: (...args: any[]) => void) => void;
}

declare global {
  interface Window {
    ethereum?: EthereumProvider | any;
  }
}

export function isMetaMaskInstalled(): boolean {
  if (typeof window === "undefined") return false;
  return Boolean(window.ethereum?.isMetaMask);
}

export function getEthereumProvider(): EthereumProvider | null {
  if (typeof window === "undefined") return null;
  return (window as any).ethereum || null;
}

export async function requestAccounts(): Promise<string[]> {
  const provider = getEthereumProvider();
  if (!provider) throw new Error("No injected ethereum provider");
  try {
    const accounts = await provider.request({ method: "eth_requestAccounts" });
    return accounts;
  } catch (err: any) {
    if (err?.code === 4001) throw new Error("User rejected the connection request");
    throw err;
  }
}

export async function getAccounts(): Promise<string[]> {
  const provider = getEthereumProvider();
  if (!provider) return [];
  try {
    const accounts = await provider.request({ method: "eth_accounts" });
    return accounts || [];
  } catch (err) {
    return [];
  }
}

export async function getCurrentChainId(): Promise<string | null> {
  const provider = getEthereumProvider();
  if (!provider) return null;
  try {
    const chainId = await provider.request({ method: "eth_chainId" });
    return chainId as string;
  } catch (err) {
    return null;
  }
}

export async function switchAccount(): Promise<string> {
  const provider = getEthereumProvider();
  if (!provider) throw new Error("No injected ethereum provider");
  // Request accounts again to show account picker
  try {
    const accounts = await provider.request({ method: "eth_requestAccounts" });
    return accounts?.[0] || "";
  } catch (err: any) {
    if (err?.code === 4001) throw new Error("User rejected account switch");
    throw err;
  }
}

export function addProviderListeners(onAccountsChanged: (addrs: string[]) => void, onChainChanged: (chainId: string) => void) {
  const provider = getEthereumProvider();
  if (!provider) return () => {};

  const accountHandler = (accounts: any) => {
    try {
      onAccountsChanged(accounts as string[]);
    } catch (e) {
      // ignore
    }
  };
  const chainHandler = (chainId: any) => {
    try {
      onChainChanged(chainId as string);
    } catch (e) {
      // ignore
    }
  };

  provider.on && provider.on("accountsChanged", accountHandler);
  provider.on && provider.on("chainChanged", chainHandler);

  return () => {
    provider.removeListener && provider.removeListener("accountsChanged", accountHandler);
    provider.removeListener && provider.removeListener("chainChanged", chainHandler);
  };
}
