// Resolve Dare Blink Sync Update
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
    const challenged = url.searchParams.get("challenged");
    
    const payload: ActionGetResponse = {
        icon: `${BASE_URL}/hero.png`,
        label: "Karar Ver",
        title: "Proof of Dare - Karar Zamanı!",
        description: "Meydan okuduğun kişi kanıtını sundu. Kararını ver!",
        links: {
            actions: [
                { label: "✅ Onayla", href: `${BASE_URL}/api/actions/resolve-dare?challenged=${challenged}&status=approved` },
                { label: "❌ Reddet", href: `${BASE_URL}/api/actions/resolve-dare?challenged=${challenged}&status=rejected` }
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
        const challenged = new PublicKey(url.searchParams.get("challenged")!);
        const statusStr = url.searchParams.get("status");

        const [darePda] = PublicKey.findProgramAddressSync([Buffer.from("dare"), challenger.toBuffer(), challenged.toBuffer()], PROGRAM_ID);
        const discriminator = Buffer.from([242, 21, 237, 247, 18, 118, 25, 235]);
        const statusValue = statusStr === "approved" ? 2 : 3;
        const data = Buffer.concat([discriminator, Buffer.from([statusValue])]);

        const tx = new Transaction().add({
            keys: [{ pubkey: darePda, isSigner: false, isWritable: true }, { pubkey: challenger, isSigner: true, isWritable: true }, { pubkey: challenged, isSigner: false, isWritable: true }],
            programId: PROGRAM_ID, data: data,
        });

        const { blockhash } = await CONNECTION.getLatestBlockhash();
        tx.recentBlockhash = blockhash;
        tx.feePayer = challenger;

        // SUPABASE SYNC
        if (supabase) {
            supabase.from('dares').update({ 
                status: statusStr === "approved" ? "Approved" : "Rejected" 
            }).eq('pda', darePda.toBase58()).then();
        }

        const payload: ActionPostResponse = await createPostResponse({
            fields: { transaction: tx, message: statusStr === "approved" ? "Onaylandı!" : "Reddedildi." },
        });
        return Response.json(payload, { headers: ACTIONS_CORS_HEADERS });
    } catch (err) {
        console.error(err);
        return new Response("Hata oluştu.", { status: 400, headers: ACTIONS_CORS_HEADERS });
    }
};
