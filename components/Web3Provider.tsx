'use client';

import { ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { WalletProvider } from '../lib/wallet/WalletProvider';

const queryClient = new QueryClient();

type Web3ProviderProps = {
  children: ReactNode;
};

export default function Web3Provider({ children }: Web3ProviderProps) {
  // Wallet integration removed — this component now only provides
  // a React Query client provider for client-only usage.
  return (
    <QueryClientProvider client={queryClient}>
      <WalletProvider>
        {children}
      </WalletProvider>
    </QueryClientProvider>
  );
}
