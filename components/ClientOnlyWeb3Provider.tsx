'use client';

import dynamic from 'next/dynamic';
import { ReactNode } from 'react';

const Web3Provider = dynamic(() => import('./Web3Provider'), { ssr: false });
const WalletProvider = dynamic(() => import('../lib/wallet/WalletProvider').then(m => m.WalletProvider), { ssr: false });

export default function ClientOnlyWeb3Provider({ children }: { children: ReactNode }) {
  return (
    <WalletProvider>
      <Web3Provider>{children}</Web3Provider>
    </WalletProvider>
  );
}
