import { 
    ActionGetResponse, 
    ActionPostRequest, 
    ActionPostResponse, 
    ACTIONS_CORS_HEADERS, 
    createPostResponse 
} from "@solana/actions";
import { 
    PublicKey, 
    Transaction
} from "@solana/web3.js";
import { PROGRAM_ID, CONNECTION, BASE_URL } from "@/lib/solana";
import { supabase } from "@/lib/supabase";

export const GET = async (req: Request) => {
    const url = new URL(req.url);
    const challenger = url.searchParams.get("challenger");
    
    const payload: ActionGetResponse = {
        icon: `${BASE_URL}/hero.png`,
        label: "Kanıt Gönder",
        title: "Proof of Dare - Görevini Kanıtla!",
        description: "Meydan okumayı tamamladın mı? Kanıt linkini buraya yapıştır ve SOL ödülünü talep et!",
        links: {
            actions: [
                {
                    label: "Kanıtı Gönder",
                    href: `${BASE_URL}/api/actions/submit-proof?challenger=${challenger}&proof={proofUrl}`,
                    parameters: [
                        {
                            name: "proofUrl",
                            label: "Kanıt Linki (X, Video, Görsel vb.)",
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
        
        const challenged = new PublicKey(body.account);
        const challenger = new PublicKey(url.searchParams.get("challenger")!);
        const proofUrl = url.searchParams.get("proof")!;

        const [darePda] = PublicKey.findProgramAddressSync([Buffer.from("dare"), challenger.toBuffer(), challenged.toBuffer()], PROGRAM_ID);
        const discriminator = Buffer.from([71, 12, 107, 44, 187, 86, 219, 137]);
        const pBuf = Buffer.from(proofUrl);
        const pLen = Buffer.alloc(4); pLen.writeUInt32LE(pBuf.length, 0);
        const data = Buffer.concat([discriminator, pLen, pBuf]);

        const tx = new Transaction().add({
            keys: [{ pubkey: darePda, isSigner: false, isWritable: true }, { pubkey: challenged, isSigner: true, isWritable: false }],
            programId: PROGRAM_ID, data: data,
        });

        const { blockhash } = await CONNECTION.getLatestBlockhash();
        tx.recentBlockhash = blockhash;
        tx.feePayer = challenged;

        // SUPABASE GÜNCELLEME (Kanıt linkini DB'ye yaz)
        if (supabase) {
            supabase.from('dares').update({ 
                status: 'Active',
                proof_url: proofUrl 
            }).eq('pda', darePda.toBase58()).then();
        }

        const payload: ActionPostResponse = await createPostResponse({
            fields: {
                transaction: tx,
                message: `Kanıt gönderildi! Onay bekleniyor.`,
            },
        });

        return Response.json(payload, { headers: ACTIONS_CORS_HEADERS });
    } catch (err) {
        console.error(err);
        return new Response("İşlem hazırlanırken bir hata oluştu.", { status: 400, headers: ACTIONS_CORS_HEADERS });
    }
};
