import { NextResponse } from 'next/server';

export async function GET() {
    const rootUrl = 'https://twitter.com/i/oauth2/authorize';
    
    const client_id = process.env.X_CLIENT_ID;

    if (!client_id || client_id === 'YOUR_CLIENT_ID') {
        // ID girilmemişse Twitter'a gidip hata almak yerine kullanıcıyı bilgilendir
        return NextResponse.redirect('http://localhost:3000?auth=setup_required');
    }

    const options = {
        redirect_uri: 'http://localhost:3000/api/auth/callback/twitter',
        client_id: client_id,
        state: 'state',
        response_type: 'code',
        code_challenge: 'challenge',
        code_challenge_method: 'plain',
        scope: ['tweet.read', 'tweet.write', 'users.read'].join(' '),
    };

    const qs = new URLSearchParams(options).toString();
    return NextResponse.redirect(`${rootUrl}?${qs}`);
}
