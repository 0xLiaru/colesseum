import { 
    ActionGetResponse, 
    ActionPostRequest, 
    ActionPostResponse, 
    ACTIONS_CORS_HEADERS, 
    createPostResponse 
} from "@solana/actions";
import { 
    PublicKey, 
    Transaction,
    SystemProgram
} from "@solana/web3.js";
import { PROGRAM_ID, CONNECTION, BASE_URL } from "@/lib/solana";
import { supabase } from "@/lib/supabase";

export const GET = async (req: Request) => {
    const url = new URL(req.url);
    const challenged = url.searchParams.get("challenged");
    
    const payload: ActionGetResponse = {
        icon: `${BASE_URL}/hero.png`,
        label: "İade Al",
        title: "Proof of Dare - Süre Doldu!",
        description: "Meydan okuduğun kişi zamanında kanıt sunamadı mı? SOL'u hemen geri alabilirsin.",
        links: {
            actions: [
                { label: "SOL'u İade Al", href: `${BASE_URL}/api/actions/claim-refund?challenged=${challenged}` }
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

        const [darePda] = PublicKey.findProgramAddressSync([Buffer.from("dare"), challenger.toBuffer(), challenged.toBuffer()], PROGRAM_ID);
        const discriminator = Buffer.from([62, 238, 55, 116, 218, 28, 43, 203]);

        const tx = new Transaction().add({
            keys: [{ pubkey: darePda, isSigner: false, isWritable: true }, { pubkey: challenger, isSigner: true, isWritable: true }, { pubkey: SystemProgram.programId, isSigner: false, isWritable: false }],
            programId: PROGRAM_ID, data: discriminator,
        });

        const { blockhash } = await CONNECTION.getLatestBlockhash();
        tx.recentBlockhash = blockhash;
        tx.feePayer = challenger;

        // SUPABASE SYNC
        if (supabase) {
            supabase.from('dares').update({ status: 'Refunded' }).eq('pda', darePda.toBase58()).then();
        }

        const payload: ActionPostResponse = await createPostResponse({
            fields: { transaction: tx, message: "İade işlemi başarılı!" },
        });
        return Response.json(payload, { headers: ACTIONS_CORS_HEADERS });
    } catch (err) {
        console.error(err);
        return new Response("Hata oluştu.", { status: 400, headers: ACTIONS_CORS_HEADERS });
    }
};
