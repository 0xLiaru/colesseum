import { 
    ActionGetResponse, 
    ActionPostRequest, 
    ActionPostResponse, 
    ACTIONS_CORS_HEADERS, 
    createPostResponse 
} from "@solana/actions";
import { 
    PublicKey, 
    SystemProgram, 
    Transaction, 
    LAMPORTS_PER_SOL 
} from "@solana/web3.js";
import { PROGRAM_ID, CONNECTION, BASE_URL } from "@/lib/solana";
import { supabase } from "@/lib/supabase";
import * as anchor from "@coral-xyz/anchor";

export const GET = async (req: Request) => {
    const payload: ActionGetResponse = {
        icon: `${BASE_URL}/categories.png`,
        label: "Bounty Başlat!",
        title: "Proof of Dare - Topluluk Görevi",
        description: "Twitter üzerinden bir topluluk görevi başlat, ödül havuzunu SOL ile doldur ve kazananı DAO oylamasına bırak!",
        links: {
            actions: [
                {
                    label: "Bounty Oluştur",
                    href: `${BASE_URL}/api/actions/create-dare?amount={amount}&title={title}&category={category}`,
                    parameters: [
                        {
                            name: "title",
                            label: "Görev Başlığı (Örn: En İyi Solana Meme'ini Yap)",
                            required: true
                        },
                        {
                            name: "category",
                            label: "Kategori (Software, Fun, Gaming, Sports)",
                            required: true
                        },
                        {
                            name: "amount",
                            label: "Ödül Havuzu (SOL)",
                            required: true
                        }
                    ]
                }
            ]
        }
    };

    return Response.json(payload, { headers: ACTIONS_CORS_HEADERS });
};

export const OPTIONS = GET;

export const POST = async (req: Request) => {
    try {
        const body: ActionPostRequest = await req.json();
        const url = new URL(req.url);
        
        const challenger = new PublicKey(body.account);
        const category = url.searchParams.get("category") || "Sports";
        const amountNum = parseFloat(url.searchParams.get("amount") || "0.1");
        const title = url.searchParams.get("title") || "Blink Topluluk Bounty";

        // Topluluk görevi olduğu için varsayılan bir adres (Public) atayalım
        const challenged = new PublicKey("11111111111111111111111111111111");

        const [darePda] = PublicKey.findProgramAddressSync(
            [Buffer.from("dare"), challenger.toBuffer(), challenged.toBuffer()],
            PROGRAM_ID
        );

        const amount = new anchor.BN(amountNum * LAMPORTS_PER_SOL);
        const deadline = new anchor.BN(Math.floor(Date.now() / 1000) + 86400); // 24 Saat
        const discriminator = Buffer.from([165, 248, 7, 27, 99, 187, 25, 198]);

        const data = Buffer.concat([
            discriminator,
            amount.toArrayLike(Buffer, "le", 8),
            deadline.toArrayLike(Buffer, "le", 8),
        ]);

        const tx = new Transaction().add({
            keys: [
                { pubkey: darePda, isSigner: false, isWritable: true },
                { pubkey: challenger, isSigner: true, isWritable: true },
                { pubkey: challenged, isSigner: false, isWritable: false },
                { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
            ],
            programId: PROGRAM_ID,
            data: data,
        });

        const { blockhash } = await CONNECTION.getLatestBlockhash();
        tx.recentBlockhash = blockhash;
        tx.feePayer = challenger;

        if (supabase) {
            supabase.from('dares').insert({
                pda: darePda.toBase58(),
                title: title,
                challenger: challenger.toBase58(),
                challenged: challenged.toBase58(),
                amount: amountNum,
                status: 'Pending',
                category: category
            }).then(({error}) => {
                if (error) console.error("Blink DB Kayıt Hatası:", error);
            });
        }

        const payload: ActionPostResponse = await createPostResponse({
            fields: {
                transaction: tx,
                message: `"${title}" Meydan Okuması Başlatıldı!`,
            },
        });

        return Response.json(payload, { headers: ACTIONS_CORS_HEADERS });
    } catch (err) {
        console.error(err);
        return new Response("İşlem hazırlanırken bir hata oluştu.", { 
            status: 400, 
            headers: ACTIONS_CORS_HEADERS 
        });
    }
};
