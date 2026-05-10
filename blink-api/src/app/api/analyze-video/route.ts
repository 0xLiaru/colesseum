import { NextResponse } from 'next/server';

export async function POST(req: Request) {
    try {
        const { videoUrl, dareCategory, dareTitle, userDescription } = await req.json();
        const apiKey = process.env.GOOGLE_API_KEY;

        if (!apiKey) {
            return NextResponse.json({ score: 0, isRelevant: false, report: "SİSTEM HATASI: AI Denetçisi şu an çevrimdışı (API Key Eksik)." });
        }

        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{
                    parts: [{
                        text: `GÖREV BAŞLIĞI: ${dareTitle}
                        KATEGORİ: ${dareCategory}
                        KULLANICI AÇIKLAMASI: ${userDescription}
                        VİDEO LİNKİ: ${videoUrl}

                        SEN BİR "DAREGUARD" (POD PROTOKOLÜ) BAŞ DENETÇİSİSİN. 
                        SENİN ÖZEL YETENEĞİN VİDEO İÇERİĞİNİ DERİNLEMESİNE ANALİZ ETMEKTİR.

                        GÖREVİN:
                        1. VİDEOYU "OKU": Eğer video linki üzerinden videonun içeriğine (transcript, metadata, visual cues) erişebiliyorsan, videoda GERÇEKTEN ne olduğunu analiz et.
                        2. BAĞLAM KONTROLÜ: Eğer görev "100 Şınav" ise ve videoda sadece konuşan bir adam varsa veya video tamamen alakasız bir oyun videosuysa SCORE = 0 VER.
                        3. ŞÜPHECİ OL: Kullanıcının "yaptım" demesi yetmez. Videoda kanıtı görmelisin. Videoyu göremiyorsan veya video içeriği görevle %100 uyuşmuyorsa düşük puan ver.
                        4. ANALİZ SÜRESİ: Bu bir derin analizdir. Hızlı geçme.

                        PUANLAMA:
                        - 0-25: KESİN RED (Alakasız içerik, video içeriği görevle uyuşmuyor).
                        - 26-76: ŞÜPHELİ (Video tam net değil veya AI emin olamadı).
                        - 77-100: KESİN ONAY (Video içeriği görevle tam uyumlu).

                        YANIT FORMATI (KESİNLİKLE SADECE JSON):
                        {"score": 0-100, "report": "Videonun içinde ne gördüğünü/analiz ettiğini çok kısa açıkla.", "isRelevant": true/false}`
                    }]
                }]
            })
        });

        const data = await response.json();
        
        if (data.candidates && data.candidates[0]) {
            const rawText = data.candidates[0].content.parts[0].text;
            const jsonMatch = rawText.match(/\{.*\}/s);
            if (jsonMatch) {
                const res = JSON.parse(jsonMatch[0]);
                return NextResponse.json({
                    isRelevant: res.score >= 77,
                    score: res.score,
                    analysisReport: res.report,
                    aiSignature: "POD_GUARD_VERIFIED_" + Math.random().toString(36).substring(7)
                });
            }
        }

        throw new Error("AI Analiz sırasında bir tutarsızlık yaşadı.");

    } catch (error: any) {
        return NextResponse.json({ 
            score: 0, 
            isRelevant: false, 
            analysisReport: `DENETİM BAŞARISIZ: ${error.message || "AI şu an bu videoyu analiz edemiyor."}` 
        });
    }
}
