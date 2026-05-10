'use client';

import { PrivyProvider } from '@privy-io/react-auth';
import { toSolanaWalletConnectors } from '@privy-io/react-auth/solana';
import { ReactNode } from 'react';

// Solana eklentilerini (Phantom, Solflare) Privy'ye tanıtan bağlayıcı
const solanaConnectors = toSolanaWalletConnectors({
  shouldAutoConnect: true,
});

export default function PrivyWrapper({ children }: { children: ReactNode }) {
  return (
    <PrivyProvider
      appId={process.env.NEXT_PUBLIC_PRIVY_APP_ID || 'cmou3o3zf00oi0cjjskrnza79'}
      config={{
        loginMethods: ['wallet', 'twitter', 'google', 'email'],
        // Eklentileri (Phantom, Solflare vb.) burada tanımlıyoruz
        externalWallets: {
          solana: {
            connectors: solanaConnectors,
          },
        },
        appearance: {
          theme: 'dark',
          accentColor: '#22d3ee',
          showWalletLoginFirst: true,
          logo: '/logo.png',
          walletList: ['phantom', 'solflare', 'backpack'],
        },
        solanaClusters: [
          {
            name: 'testnet',
            rpcUrl: 'https://api.testnet.solana.com'
          },
          {
            name: 'devnet',
            rpcUrl: 'https://api.devnet.solana.com'
          }
        ],
        embeddedWallets: {
          createOnLogin: 'users-without-wallets',
        },
      }}
    >
      {children}
    </PrivyProvider>
  );
}
