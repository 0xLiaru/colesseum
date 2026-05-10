import { NextResponse } from 'next/server';

const RPC_ENDPOINTS = [
    "https://api.testnet.solana.com",
    "https://api.devnet.solana.com"
];

export async function POST(req: Request) {
    try {
        const body = await req.json();
        
        // Sırasıyla tüm sunucuları dene
        for (const endpoint of RPC_ENDPOINTS) {
            try {
                console.log(`RPC Deneniyor: ${endpoint}`);
                const response = await fetch(endpoint, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(body),
                    next: { revalidate: 0 } // Cache'i devre dışı bırak
                });

                if (response.ok) {
                    const data = await response.json();
                    if (!data.error) return NextResponse.json(data);
                }
            } catch (e) {
                console.error(`${endpoint} başarısız oldu, sıradakine geçiliyor...`);
            }
        }

        throw new Error('Tüm RPC sunucuları yanıt vermedi.');
    } catch (error: any) {
        return NextResponse.json({ error: error.message || 'RPC Bridge Error' }, { status: 500 });
    }
}
