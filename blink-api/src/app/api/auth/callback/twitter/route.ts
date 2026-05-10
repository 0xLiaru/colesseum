import { NextResponse } from 'next/server';

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get('code');
    const error = searchParams.get('error');

    if (error) {
        console.error('X Auth Error:', error);
        return NextResponse.redirect('http://localhost:3000?auth=error');
    }

    if (code) {
        // İleride burada 'code' ile gerçek bir access_token alabiliriz.
        // Şimdilik başarılı girişi simüle ediyoruz.
        return NextResponse.redirect('http://localhost:3000?auth=success&handle=Verified_User');
    }

    return NextResponse.redirect('http://localhost:3000');
}
