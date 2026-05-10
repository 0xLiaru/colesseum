# 🛡️ Proof Of Dare (POD) Protocol
### *Meydan Oku. Kanıtla. Kazan.* 🚀

**Proof Of Dare (POD)**, Solana ağı üzerinde inşa edilmiş, AI denetimli ve topluluk odaklı bir **SocialFi** platformudur. Kullanıcıların birbirlerine meydan okuduğu, kanıtların AI (Gemini Flash 1.5) ve topluluk tarafından doğrulandığı, ödüllerin ise güvenli bir şekilde cüzdanlara aktarıldığı bir ekosistem sunar.

---

## 🌟 Öne Çıkan Özellikler

### 🛡️ DareGuard AI (Akıllı Denetim)
Platforma yüklenen tüm kanıtlar (YouTube, Twitter, GitHub vb.), Gemini Flash 1.5 tabanlı **DareGuard AI** tarafından analiz edilir. AI, kanıtın meydan okuma kurallarına uygunluğunu, içeriğin gerçekliğini ve teknik doğruluğunu saniyeler içinde denetler.

### 🗳️ On-Chain Voting (Zincir Üstü Oylama)
Topluluk gücü her şeydir! Her bir Like veya Dislike işlemi, Solana ağında bir **Cüzdan İmzası** (Signature) ile mühürlenir. Bu sayede oylamalar manipülasyona kapalı ve %100 şeffaftır.

### 🔗 Solana Blink Entegrasyonu
Her meydan okuma ve kanıt, bir **Solana Blink** (Action) olarak paylaşılabilir. Kullanıcılar, X (Twitter) üzerinden ayrılmadan doğrudan meydan okumalara katılabilir veya kanıtları oylayabilir.

### 💰 Güvenli Escrow & Ödül Havuzu
Başlatılan her meydan okumanın ödülü, işlem anında platformun güvenli kasasına kilitlenir. Kanıt onaylandığında, ödül otomatik olarak (platform ücreti kesilerek) kazananın cüzdanına aktarılır.

---

## 🛠️ Teknik Altyapı

- **Frontend:** Next.js 15 (App Router), Tailwind CSS
- **Blockchain:** Solana (Web3.js, SPL Token)
- **Auth:** Privy SDK (Wallet Connect, Twitter & Google Social Login)
- **AI Engine:** Google Gemini 1.5 Flash (Analytical Auditing)
- **Database:** Supabase (PostgreSQL, Real-time Analytics)
- **Deployment:** Vercel

---

## 🚀 Hızlı Başlangıç

1. **Depoyu Klonlayın:**
   ```bash
   git clone https://github.com/0xLiaru/pod-protocol.git
   cd pod-protocol
   ```

2. **Bağımlılıkları Yükleyin:**
   ```bash
   npm install
   ```

3. **Çevre Değişkenlerini Ayarlayın (.env):**
   ```env
   NEXT_PUBLIC_PRIVY_APP_ID=your_id
   GOOGLE_API_KEY=your_key
   NEXT_PUBLIC_SUPABASE_URL=your_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_key
   ```

4. **Geliştirme Sunucusunu Başlatın:**
   ```bash
   npm run dev
   ```

---

## 🏁 Hackathon Takvimi (8-9-10 Mayıs)
Bu proje, **Solana Renaissance Hackathon** kapsamında, topluluk etkileşimini ve AI denetimli veri doğruluğunu artırmak amacıyla geliştirilmiştir.

**Geliştirici:** [@0xLiaru](https://github.com/0xLiaru)
**Platform:** Proof Of Dare (POD)

---

> "SocialFi dünyasında güven, sadece kodla değil, kanıtla inşa edilir." 🛡️⛓️💎
