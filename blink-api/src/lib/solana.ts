import { Connection, PublicKey } from "@solana/web3.js";

// Akıllı sözleşme ID'si
export const PROGRAM_ID = new PublicKey("4SVC6ey1Akve6Aiz3Z6sUgwfzT7VEWbfMpyjdjqRhzz8");

// Sitenin ana URL'si (Blink'ler için gerekli)
export const BASE_URL = typeof window !== 'undefined' 
    ? window.location.origin 
    : (process.env.NEXT_PUBLIC_BASE_URL || 'https://pod-protocol.vercel.app');

// Artık doğrudan dışarıya değil, kendi oluşturduğumuz güvenli köprüye (proxy) bağlanıyoruz.
export const RPC_ENDPOINT = typeof window !== 'undefined' 
    ? `${window.location.origin}/api/rpc` 
    : "https://api.testnet.solana.com"; 

export const CONNECTION = new Connection(RPC_ENDPOINT, {
    commitment: "confirmed"
});
