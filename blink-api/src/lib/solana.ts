import { Connection, PublicKey } from "@solana/web3.js";

// Akıllı sözleşme ID'si
export const PROGRAM_ID = new PublicKey("4SVC6ey1Akve6Aiz3Z6sUgwfzT7VEWbfMpyjdjqRhzz8");

// Sitenin ana URL'si (Blink'ler için gerekli)
export const BASE_URL = typeof window !== 'undefined' 
    ? window.location.origin 
    : (process.env.NEXT_PUBLIC_BASE_URL || 'https://pod-protocol.vercel.app');

// RPC Adresi - Öncelik .env dosyasındaki adreste
export const RPC_ENDPOINT = process.env.NEXT_PUBLIC_SOLANA_RPC || "https://api.mainnet-beta.solana.com";

export const CONNECTION = new Connection(RPC_ENDPOINT, {
    commitment: "confirmed",
    confirmTransactionInitialTimeout: 60000
});
