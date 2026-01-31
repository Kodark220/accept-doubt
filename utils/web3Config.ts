'use client';

import { createConfig, http } from 'wagmi';
import { mainnet, sepolia, polygon, arbitrum, optimism, base, type Chain } from 'wagmi/chains';
import { walletConnect, injected, coinbaseWallet } from 'wagmi/connectors';

// WalletConnect Project ID - Get yours at https://cloud.walletconnect.com
const projectId = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || 'demo-project-id';

// GenLayer StudioNet - Custom chain for GenLayer blockchain
export const genlayerStudioNet = {
  id: 61_999,
  name: 'GenLayer StudioNet',
  nativeCurrency: {
    decimals: 18,
    name: 'GenLayer Token',
    symbol: 'GEN',
  },
  rpcUrls: {
    default: { http: ['https://studio.genlayer.com/api'] },
  },
  blockExplorers: {
    default: { name: 'GenLayer Explorer', url: 'https://studio.genlayer.com' },
  },
  testnet: true,
} as const satisfies Chain;

// Supported chains - GenLayer StudioNet is the primary chain for this game
export const chains = [genlayerStudioNet, mainnet, sepolia, polygon, arbitrum, optimism, base] as const;

// Wagmi config
export const wagmiConfig = createConfig({
  chains,
  connectors: [
    injected(), // MetaMask, Brave, etc.
    walletConnect({ projectId }), // WalletConnect for mobile wallets
    coinbaseWallet({ appName: 'Accept or Doubt' }), // Coinbase Wallet
  ],
  transports: {
    [genlayerStudioNet.id]: http('https://studio.genlayer.com/api'),
    [mainnet.id]: http(),
    [sepolia.id]: http(),
    [polygon.id]: http(),
    [arbitrum.id]: http(),
    [optimism.id]: http(),
    [base.id]: http(),
  },
});

// Metadata for WalletConnect
export const metadata = {
  name: 'Accept or Doubt',
  description: 'Test your judgment against GenLayer AI validators',
  url: 'https://accept-doubt.vercel.app',
  icons: ['https://accept-doubt.vercel.app/logo.png'],
};
