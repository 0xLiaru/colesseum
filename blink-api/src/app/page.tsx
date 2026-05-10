"use client";

import { usePrivy, useWallets } from '@privy-io/react-auth';
import { useEffect, useState, useMemo } from "react";
import { CONNECTION } from "@/lib/solana";
import { PublicKey, LAMPORTS_PER_SOL, SystemProgram, Transaction } from "@solana/web3.js";
import { getAssociatedTokenAddressSync, createTransferCheckedInstruction, createAssociatedTokenAccountInstruction } from "@solana/spl-token";
import { supabase } from "@/lib/supabase";

const CATEGORIES = [
    { id: 'Sports', label: 'Sports', icon: '🏋️‍♂️', img: 'https://images.unsplash.com/photo-1517836357463-d25dfeac3438?auto=format&fit=crop&q=80&w=800' },
    { id: 'Software', label: 'Software', icon: '💻', img: 'https://images.unsplash.com/photo-1555066931-4365d14bab8c?auto=format&fit=crop&q=80&w=800' },
    { id: 'Gaming', label: 'Gaming', icon: '🎮', img: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&q=80&w=800' },
    { id: 'Fun', label: 'Fun', icon: '🎉', img: 'https://images.unsplash.com/photo-1514525253361-bee8a187499b?auto=format&fit=crop&q=80&w=800' }
];

const PLATFORM_WALLET = "81Eei1YU14Uq2a4Qqost8X1TjQFLWxcu9TRyKbzArMyR"; 
const PLATFORM_FEE_LAUNCH = 0.01;
const PLATFORM_FEE_SUBMIT = 0.005;
const PLATFORM_FEE_COMMENT = 0.0001;
const PLATFORM_FEE_CLAIM = 0.0002;
const BET_FEE_PERCENT = 0.02; // %2 Platform Fee

const TOKENS = [
    { symbol: 'SOL', name: 'Solana', icon: 'https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/So11111111111111111111111111111111111111112/logo.png', mint: null, decimals: 9 },
    { symbol: 'USDC', name: 'USD Coin', icon: 'https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v/logo.png', mint: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v', decimals: 6 }
];

interface Comment { id: number; address: string; text: string; timestamp: number; likes?: number; dislikes?: number; }
interface Applicant { 
    id: number; address: string; proofUrl: string; description: string; likes: number; dislikes: number; img: string; 
    aiScore?: number; aiComment?: string; aiStatus?: 'LEGIT' | 'SUSPICIOUS'; comments?: Comment[]; 
}
interface Dare { 
    pubkey: string; challenger: string; challenged: string; amount: number; deadline: number; status: string; title: string; 
    description: string; exampleUrl?: string; maxApplicants: number; winnerCount: number; category: string; 
    applicants?: Applicant[]; customImg?: string; token?: string; isPodBet?: boolean;
    yesAmount?: number; noAmount?: number;
}

const DEFAULT_DARES: Dare[] = [
    { 
        pubkey: '1', challenger: 'SYSTEM', challenged: 'Public', amount: 1.5, deadline: Math.floor(Date.now()/1000) + 7200, status: 'Active', title: 'Do 100 Pushups & Prove It', description: 'Pushups must be clean form. Video proof is mandatory.', exampleUrl: 'https://youtube.com/shorts/example', maxApplicants: 50, winnerCount: 5, category: 'Sports', 
        applicants: [
            { id: 101, address: "7vB6...Xp2", proofUrl: "https://youtube.com/shorts/nizami-sinav", description: "I DID 100 CLEAN PUSHUPS!", likes: 45, dislikes: 2, img: "https://api.dicebear.com/7.x/avataaars/svg?seed=Felix", aiScore: 98, aiComment: "🛡️ DAREGUARD: Perfect form detected.", aiStatus: 'LEGIT', comments: [{ id: 1, address: '82j...Lp', text: 'Amazing job!', timestamp: Date.now(), likes: 2 }] },
            { id: 102, address: "9Xj8...Lm3", proofUrl: "https://youtube.com/shorts/fake", description: "Trust me, I did it.", likes: 2, dislikes: 15, img: "https://api.dicebear.com/7.x/avataaars/svg?seed=Fake", aiScore: 42, aiComment: "🛡️ DAREGUARD: Low video quality or suspicious movement.", aiStatus: 'SUSPICIOUS', comments: [] }
        ] 
    },
    { 
        pubkey: '2', challenger: 'SYSTEM', challenged: 'Public', amount: 5.0, deadline: Math.floor(Date.now()/1000) + 86400, status: 'Active', title: 'Build a Tool with Solana Blink API', description: 'Develop a new Blink action for the community.', maxApplicants: 20, winnerCount: 3, category: 'Software', 
        applicants: [
            { id: 201, address: "2vR7...Qm9", proofUrl: "https://twitter.com/example/status/1", description: "I BUILT A DONATION BLINK!", likes: 112, dislikes: 5, img: "https://api.dicebear.com/7.x/avataaars/svg?seed=BlinkMaster", aiScore: 95, aiComment: "🛡️ DAREGUARD: Innovative approach.", aiStatus: 'LEGIT', comments: [] }
        ] 
    },
    { 
        pubkey: '4', challenger: 'SYSTEM', challenged: 'Public', amount: 10.0, deadline: Math.floor(Date.now()/1000) + 172800, status: 'Active', title: 'Mad Lads NFT Mint Story', description: 'Tell your NFT story.', category: 'Fun', customImg: 'https://images.unsplash.com/photo-1620641788421-7a1c342ea42e?auto=format&fit=crop&q=80&w=800', maxApplicants: 100, winnerCount: 10,
        applicants: [
            { id: 401, address: "4Lp2...Kj8", proofUrl: "https://twitter.com/example/status/2", description: "MINT DAY WAS SO EXCITING!", likes: 88, dislikes: 0, img: "https://api.dicebear.com/7.x/avataaars/svg?seed=MadLad", aiScore: 92, aiComment: "🛡️ DAREGUARD: Great storytelling.", aiStatus: 'LEGIT', comments: [] }
        ]
    },
    { 
        pubkey: '5', challenger: '81Eei1YU14Uq2a4Qqost8X1TjQFLWxcu9TRyKbzArMyR', challenged: 'Public', amount: 10.0, deadline: Math.floor(Date.now()/1000) + 172800, status: 'Active', title: 'EAT SH*T CHALLENGE', description: 'Will they really do it? The most disgusting but awaited dare in history!', maxApplicants: 1, winnerCount: 1, category: 'Extreme', token: 'SOL', isPodBet: true, yesAmount: 45.5, noAmount: 112.2 
    }
];

const SOUNDS = { NOTIF: "https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3", SUCCESS: "https://assets.mixkit.co/active_storage/sfx/2013/2013-preview.mp3", SCAN: "https://assets.mixkit.co/active_storage/sfx/2865/2865-preview.mp3", ERROR: "https://assets.mixkit.co/active_storage/sfx/2873/2873-preview.mp3" };
const playSound = (url: string) => { 
    if (typeof window === 'undefined') return;
    try { 
        const audio = new Audio(url); 
        audio.volume = 0.3; 
        const playPromise = audio.play();
        if (playPromise !== undefined) {
            playPromise.catch(() => {
                // Silently fail if audio source is not supported or blocked by browser
            });
        }
    } catch (e) {} 
};
const getThumbnail = (url: string | undefined | null) => {
    if (!url) return null;
    if (url.includes('youtube.com') || url.includes('youtu.be')) {
        const match = url.match(/^.*(youtu\.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=|shorts\/)([^#\&\?]*).*/);
        return (match && match[2].length === 11) ? `https://i.ytimg.com/vi/${match[2]}/hqdefault.jpg` : null;
    }
    return url.includes('twitter.com') || url.includes('x.com') ? "https://abs.twimg.com/responsive-web/client-web/icon-ios.b1fc7275.png" : null;
};

const Countdown = ({ deadline }: { deadline: number }) => {
    const [timeLeft, setTimeLeft] = useState("");
    useEffect(() => {
        const timer = setInterval(() => {
            const now = Math.floor(Date.now() / 1000), diff = deadline - now;
            if (diff <= 0) { setTimeLeft("Expired"); clearInterval(timer); return; }
            const h = Math.floor(diff / 3600), m = Math.floor((diff % 3600) / 60), s = diff % 60;
            setTimeLeft(`${h}h ${m}m ${s}s`);
        }, 1000);
        return () => clearInterval(timer);
    }, [deadline]);
    return <span className="font-mono text-cyan-400 font-black tracking-widest">{timeLeft}</span>;
};

export default function Dashboard() {
  const { login, logout, authenticated, user, ready, linkTwitter, unlinkTwitter, linkGoogle, unlinkGoogle } = usePrivy();
  const { wallets } = useWallets();
  const [mounted, setMounted] = useState(false);
  const [notifications, setNotifications] = useState<{id: number, message: string, type: string, tx?: string}[]>([]);
  const [balance, setBalance] = useState<number | null>(null);
  const [dares, setDares] = useState<Dare[]>([]);
  const [activeTab, setActiveTab] = useState<'dares' | 'feed' | 'jury' | 'podbet'>('dares');
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [selectedDare, setSelectedDare] = useState<Dare | null>(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [settingsTab, setSettingsTab] = useState<'account' | 'rewards'>('account');
  const [isAiAnalyzing, setIsAiAnalyzing] = useState(false);
  const [aiProgress, setAiProgress] = useState(0);
  const [realTimeAiScore, setRealTimeAiScore] = useState(0);
  const [aiStatusMsg, setAiStatusMsg] = useState("");
  const [newDare, setNewDare] = useState({ title: "", description: "", exampleUrl: "", amount: 0.1, category: "Sports", hours: 24, maxApplicants: 10, winnerCount: 1, token: "SOL", isPodBet: false });
  const [infoModal, setInfoModal] = useState<'dares' | 'podbet' | 'jury' | null>(null);
  const [newProof, setNewProof] = useState({ url: "", desc: "" });
  const [newComment, setNewComment] = useState<{ [key: number]: string }>({});
  const [globalFeed, setGlobalFeed] = useState<any[]>([]);
  const [userBets, setUserBets] = useState<any[]>([]);
  const [claimedRewards, setClaimedRewards] = useState<number[]>([]);

  const getActiveProvider = () => { if (typeof window === 'undefined') return null; return (window as any).phantom?.solana || (window as any).solflare || (window as any).solana; };
  const publicKey = useMemo(() => {
    const provider = getActiveProvider(); if (provider?.publicKey) return provider.publicKey;
    const privySol = wallets.find(w => w.chainType === 'solana' || (w.address && !w.address.startsWith('0x')));
    return privySol?.address ? new PublicKey(privySol.address) : null;
  }, [wallets, ready]);

  useEffect(() => { setMounted(true); fetchDares(); fetchGlobalStats(); }, []);
  useEffect(() => { if (publicKey) fetchUserProfile(); }, [publicKey]);

  const fetchUserProfile = async () => {
    if (!supabase || !publicKey) return;
    try {
        const { data, error } = await supabase.from('user_profiles').select('*').eq('address', publicKey.toBase58()).single();
        if (data && data.claimed_rewards) setClaimedRewards(data.claimed_rewards);
    } catch (e) { console.warn("Profile fetch error (table may not exist):", e); }
  };

  const fetchGlobalStats = async () => {
    try {
        let dbData = null;
        if (supabase) {
            const { data } = await supabase.from('dares').select('*');
            dbData = data;
        }
        const sourceData = (dbData && dbData.length > 0) ? dbData : DEFAULT_DARES;
        const proofEvents = sourceData.flatMap(d => (d.applicants || []).map((a: any) => ({ ...a, type: 'PROOF', darePubkey: d.pubkey, dareTitle: d.title, token: d.token || 'SOL', amount: d.amount, timestamp: a.id })));
        const dareEvents = sourceData.map(d => ({ id: d.pubkey, type: 'DARE', address: d.challenger, description: d.title, dareTitle: d.title, darePubkey: d.pubkey, img: d.customImg || CATEGORIES.find(c => c.id === d.category)?.img, amount: d.amount, token: d.token || 'SOL', timestamp: d.created_at ? new Date(d.created_at).getTime() : Date.now() }));
        const combined = [...proofEvents, ...dareEvents].sort((a, b) => b.timestamp - a.timestamp);
        setGlobalFeed(combined.length > 0 ? combined.slice(0, 30) : []);
    } catch (e) {}
  };

  const fetchDares = async () => {
    try {
        if (!supabase) { 
            console.warn("Supabase not found, using default dares.");
            setDares(DEFAULT_DARES); 
            return; 
        }
        const { data } = await supabase.from('dares').select('*').order('created_at', { ascending: false });
        setDares(data && data.length > 0 ? data : DEFAULT_DARES);
    } catch (e) { setDares(DEFAULT_DARES); }
  };

  const showNotification = (message: string, txOrType: string = "INFO") => {
      const id = Date.now(), isTx = txOrType.length > 30, type = isTx ? "SUCCESS" : txOrType;
      if (type === "SUCCESS") playSound(SOUNDS.SUCCESS); else if (type === "WARN") playSound(SOUNDS.ERROR); else playSound(SOUNDS.NOTIF);
      setNotifications(prev => [...prev, { id, message, type, tx: isTx ? txOrType : undefined }]);
      setTimeout(() => setNotifications(prev => prev.filter(n => n.id !== id)), 5000);
  };

  const performTransfer = async (amount: number, tokenSymbol: string = 'SOL') => {
      let provider = getActiveProvider();
      let isPrivyWallet = false;
      let privyWalletInstance: any = null;

      if (!provider) {
          // Eğer eklenti yoksa Privy cüzdanlarını kontrol et
          const solanaWallet = wallets.find(w => w.chainType === 'solana' || (w.address && !w.address.startsWith('0x')));
          if (solanaWallet) {
              privyWalletInstance = solanaWallet;
              isPrivyWallet = true;
          } else {
              throw new Error("Cüzdan bulunamadı! Lütfen bir cüzdan bağlayın.");
          }
      }

      try {
          if (provider && !provider.isConnected) await provider.connect();
          
          const currentPayer = provider ? provider.publicKey : new PublicKey(privyWalletInstance.address);
          const transaction = new Transaction();
          const tokenData = TOKENS.find(t => t.symbol === tokenSymbol);

          if (!tokenData || tokenSymbol === 'SOL') {
              transaction.add(SystemProgram.transfer({ 
                  fromPubkey: currentPayer, 
                  toPubkey: new PublicKey(PLATFORM_WALLET), 
                  lamports: Math.round(amount * LAMPORTS_PER_SOL) 
              }));
          } else {
              const mint = new PublicKey(tokenData.mint!);
              const dest = new PublicKey(PLATFORM_WALLET);
              const fromAta = getAssociatedTokenAddressSync(mint, currentPayer);
              const toAta = getAssociatedTokenAddressSync(mint, dest);
              try { 
                  if (!(await CONNECTION.getAccountInfo(toAta))) {
                      transaction.add(createAssociatedTokenAccountInstruction(currentPayer, toAta, dest, mint));
                  }
              } catch (e) {}
              transaction.add(createTransferCheckedInstruction(fromAta, mint, toAta, currentPayer, Math.round(amount * Math.pow(10, tokenData.decimals)), tokenData.decimals));
          }

          const { blockhash } = await CONNECTION.getLatestBlockhash();
          transaction.recentBlockhash = blockhash;
          transaction.feePayer = currentPayer;

          if (isPrivyWallet && privyWalletInstance) {
              // Privy cüzdanı ile imzala
              const provider = await privyWalletInstance.getProvider();
              const serializedTx = transaction.serialize({ requireAllSignatures: false });
              
              // Safe base64 conversion for browser
              let binary = '';
              const bytes = new Uint8Array(serializedTx);
              const len = bytes.byteLength;
              for (let i = 0; i < len; i++) {
                  binary += String.fromCharCode(bytes[i]);
              }
              const base64Tx = window.btoa(binary);
              
              const signature = await provider.request({
                  method: 'solana_signAndSendTransaction',
                  params: {
                      message: base64Tx,
                  },
              });
              return signature.signature || signature;
          } else {
              // Eklenti ile imzala
              const signed = await provider.signTransaction(transaction);
              return await CONNECTION.sendRawTransaction(signed.serialize());
          }
      } catch (e: any) { 
          console.error("Transfer error:", e);
          throw new Error(e.message || "İşlem reddedildi veya bir hata oluştu."); 
      }
  };

  const handleLaunchDare = async () => {
    if (!authenticated) return login();
    try {
        const rewardAmount = newDare.amount, launchFee = PLATFORM_FEE_LAUNCH;
        showNotification(`${rewardAmount.toFixed(2)} ${newDare.token} + ${launchFee} SOL Fee Processing... 🔐`);
        
        // Önce Launch Fee'yi transfer et
        await performTransfer(launchFee, 'SOL');
        
        // Sonra Reward Amount'u transfer et
        const signature = await performTransfer(rewardAmount, newDare.token);
        const dare: Dare = {
            pubkey: Math.random().toString(36).substring(7), challenger: publicKey?.toBase58() || "Anon", challenged: 'Public', amount: newDare.amount, deadline: Math.floor(Date.now()/1000) + (newDare.hours * 3600),
            status: 'Active', title: newDare.title, description: newDare.description, maxApplicants: newDare.maxApplicants, winnerCount: newDare.winnerCount, category: newDare.category, token: newDare.token || 'SOL', applicants: [], isPodBet: newDare.isPodBet, yesAmount: 0, noAmount: 0
        };
        if (supabase) await supabase.from('dares').insert([dare]);
        setDares([dare, ...dares]); 
        setGlobalFeed([{ type: 'DARE', address: publicKey?.toBase58(), description: newDare.title, amount: newDare.amount, dareTitle: newDare.title, darePubkey: dare.pubkey, token: newDare.token, img: dare.customImg || CATEGORIES.find(c => c.id === dare.category)?.img, timestamp: Date.now() }, ...globalFeed]);
        setIsCreateOpen(false); showNotification("Created!", signature);
        fetchGlobalStats();
    } catch (err: any) { showNotification(err.message, "WARN"); }
  };

  const handleSubmitProof = async () => {
      if (!authenticated) return login(); if (realTimeAiScore < 77) return showNotification("Analysis insufficient!", "WARN");
      try {
          const signature = await performTransfer(PLATFORM_FEE_SUBMIT);
          setIsAiAnalyzing(true); setAiProgress(0); const progressInterval = setInterval(() => setAiProgress(p => p >= 100 ? 100 : p + 5), 80);
          await new Promise(r => setTimeout(r, 2000));
          const res = await fetch('/api/analyze-video', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ videoUrl: newProof.url, dareCategory: selectedDare?.category, dareTitle: selectedDare?.title, userDescription: newProof.desc }) });
          const aiResult = await res.json(); clearInterval(progressInterval);
          const applicant: Applicant = {
              id: Date.now(), address: publicKey?.toBase58() || "Anon", proofUrl: newProof.url, description: newProof.desc, likes: 0, dislikes: 0,
              img: `https://api.dicebear.com/7.x/avataaars/svg?seed=${publicKey?.toBase58()}`, aiScore: aiResult.score, aiComment: aiResult.analysisReport, aiStatus: aiResult.score < 77 ? 'SUSPICIOUS' : 'LEGIT', comments: []
          };
          const updatedApplicants = [applicant, ...(selectedDare?.applicants || [])];
          if (supabase && selectedDare) await supabase.from('dares').update({ applicants: updatedApplicants }).eq('pubkey', selectedDare.pubkey);
          setDares(dares.map(d => d.pubkey === selectedDare?.pubkey ? { ...d, applicants: updatedApplicants } : d));
          if (selectedDare) {
              setSelectedDare({ ...selectedDare, applicants: updatedApplicants });
              setGlobalFeed([{ type: 'PROOF', address: publicKey?.toBase58(), description: newProof.desc, amount: selectedDare.amount, dareTitle: selectedDare.title, darePubkey: selectedDare.pubkey, token: selectedDare.token, proofUrl: newProof.url, id: applicant.id, timestamp: Date.now() }, ...globalFeed]);
          }
          setIsAiAnalyzing(false); showNotification("Proof submitted!", signature); setNewProof({ url: "", desc: "" });
          fetchGlobalStats();
      } catch (err: any) { setIsAiAnalyzing(false); showNotification(err.message, "WARN"); }
  };

  const handlePlaceBet = async (darePubkey: string, side: 'YES' | 'NO', amount: number) => {
      if (!authenticated) return login();
      if (amount <= 0) return showNotification("Invalid amount!", "WARN");
      try {
          const fee = amount * BET_FEE_PERCENT;
          const netAmount = amount - fee;
          
          showNotification(`${amount} SOL Processing (%${BET_FEE_PERCENT * 100} Fee: ${fee.toFixed(4)} SOL) 🎲`);
          const sig = await performTransfer(amount);
          
          const updatedDares = dares.map(d => {
              if (d.pubkey === darePubkey) {
                  const key = side === 'YES' ? 'yesAmount' : 'noAmount';
                  return { ...d, [key]: (d[key] || 0) + netAmount };
              }
              return d;
          });

          const target = dares.find(d => d.pubkey === darePubkey);
          if (supabase && target) {
              const key = side === 'YES' ? 'yesAmount' : 'noAmount';
              const newVal = (target[key] as number || 0) + netAmount;
              await supabase.from('dares').update({ [key]: newVal }).eq('pubkey', darePubkey);
          }

          setDares(updatedDares);
          
          // Bahis kaydını hafızaya al
          const betRecord = { darePubkey, title: target?.title || "Unknown Dare", side, amount: netAmount, timestamp: Date.now() };
          setUserBets(prev => [betRecord, ...prev]);

          showNotification(`${side} Bet Successful!`, sig);
          fetchGlobalStats();
      } catch (err: any) { showNotification(err.message, "WARN"); }
  };

  const handleAddComment = async (appId: number, darePubkey?: string) => {
    if (!authenticated) return login();
    if (!supabase) showNotification("Uyarı: Veri tabanı bağlı değil, yorum kalıcı olmayabilir.", "WARN");
    
    const text = newComment[appId]; 
    if (!text || !text.trim()) {
        showNotification("Hata: Yorum metni boş olamaz!", "WARN");
        return;
    }

    const targetPubkey = darePubkey || selectedDare?.pubkey; 
    if (!targetPubkey) {
        showNotification("Hata: Hedef meydan okuma (dare) bulunamadı!", "WARN");
        return;
    }

    const targetDare = dares.find(d => d.pubkey === targetPubkey); 
    if (!targetDare) {
        showNotification("Hata: Meydan okuma verisi güncel değil, lütfen sayfayı yenileyin.", "WARN");
        return;
    }

    try {
        showNotification("İmza talebi gönderiliyor... 🔐");
        const sig = await performTransfer(PLATFORM_FEE_COMMENT);
        if (!sig) throw new Error("İmza alınamadı.");

        showNotification("Yorum kaydediliyor... ✍️");
        const comment: Comment = { id: Date.now(), address: publicKey?.toBase58() || "Anon", text: text, timestamp: Date.now(), likes: 0, dislikes: 0 };
        const updatedApplicants = (targetDare.applicants || []).map(app => app.id === appId ? { ...app, comments: [comment, ...(app.comments || [])] } : app);
        
        if (supabase) {
            await supabase.from('dares').update({ applicants: updatedApplicants }).eq('pubkey', targetPubkey);
        }

        setDares(dares.map(d => d.pubkey === targetPubkey ? { ...d, applicants: updatedApplicants } : d));
        if (selectedDare?.pubkey === targetPubkey) setSelectedDare({ ...selectedDare, applicants: updatedApplicants });
        
        // Social Feed'i anlık güncelle
        setGlobalFeed(prev => prev.map(item => 
            (item.darePubkey === targetPubkey && item.id === appId)
            ? { ...item, comments: [comment, ...(item.comments || [])] }
            : item
        ));

        setNewComment({ ...newComment, [appId]: "" }); 
        showNotification("Yorum başarıyla gönderildi!", sig);
        fetchGlobalStats();
    } catch (err: any) { 
        console.error("Comment error:", err);
        showNotification(err.message || "Yorum gönderilemedi.", "WARN"); 
    }
  };

  const handleVote = async (appId: number, isLike: boolean, darePubkey?: string) => {
      if (!authenticated) return login();
      const targetPubkey = darePubkey || selectedDare?.pubkey; if (!targetPubkey) return;
      if (!supabase) showNotification("Uyarı: Veri tabanı bağlı değil, oylama kalıcı olmayabilir.", "WARN");
      const targetDare = dares.find(d => d.pubkey === targetPubkey); if (!targetDare) return;
      try {
          showNotification("Sealing vote... 🔐");
          const sig = await performTransfer(0.0005);
          const updatedApplicants = (targetDare.applicants || []).map(app => {
              if (app.id === appId) {
                  const key = isLike ? 'likes' : 'dislikes', val = (app[key] as number || 0) + 1;
                  let newStatus = app.aiStatus; if (isLike && val >= 10 && app.aiStatus === 'SUSPICIOUS') newStatus = 'LEGIT';
                  return { ...app, [key]: val, aiStatus: newStatus };
              }
              return app;
          });
          if (supabase) {
              await supabase.from('dares').update({ applicants: updatedApplicants }).eq('pubkey', targetPubkey);
          }
          
          setDares(dares.map(d => d.pubkey === targetPubkey ? { ...d, applicants: updatedApplicants } : d));
          if (selectedDare?.pubkey === targetPubkey) setSelectedDare({ ...selectedDare, applicants: updatedApplicants });
          
          // Social Feed'i anlık güncelle
          setGlobalFeed(prev => prev.map(item => 
              (item.darePubkey === targetPubkey && item.id === appId)
              ? { ...item, likes: isLike ? (item.likes || 0) + 1 : item.likes, dislikes: !isLike ? (item.dislikes || 0) + 1 : item.dislikes }
              : item
          ));

          showNotification(isLike ? "Voted Legit! 👍" : "Voted Fake! 👎", sig);
          fetchGlobalStats();
          fetchGlobalStats();
      } catch (err: any) { showNotification(err.message, "WARN"); }
  };

  const handleClaimReward = async (id: number, amount: number, label: string) => {
      if (!authenticated || !publicKey) return login();
      try {
          showNotification(`${amount} SOL Reward Claim Sealing... 🔐`);
          const sig = await performTransfer(PLATFORM_FEE_CLAIM); 
          const newClaimed = [...claimedRewards, id];
          if (supabase) {
              try {
                  await supabase.from('user_profiles').upsert({ address: publicKey.toBase58(), claimed_rewards: newClaimed, updated_at: new Date().toISOString() });
              } catch (e) { console.warn("Supabase profile update failed (table missing?):", e); }
          }
          setClaimedRewards(newClaimed);
          showNotification(`${label} Claim Successful! Transferred to Wallet.`, sig);
          await getBalance(); 
      } catch (err: any) { showNotification(err.message, "WARN"); }
  };

  const handleDeleteDare = async (darePubkey: string, e: React.MouseEvent) => {
      e.stopPropagation(); if (!authenticated) return login();
      try {
          showNotification("Deleting... 🔐");
          const sig = await performTransfer(0.001);
          if (supabase) await supabase.from('dares').delete().eq('pubkey', darePubkey);
          setDares(prev => prev.filter(d => d.pubkey !== darePubkey)); showNotification("Deleted!", sig);
          fetchGlobalStats();
      } catch (err: any) { showNotification(err.message, "WARN"); }
  };

  const getBalance = async () => { if (!publicKey) return; try { const l = await CONNECTION.getBalance(publicKey); setBalance(l / LAMPORTS_PER_SOL); } catch (e) {} };

  useEffect(() => {
      if (!newProof.desc && !newProof.url) { setRealTimeAiScore(0); setAiStatusMsg("🔍 AWAITING ANALYSIS..."); return; }
      const url = newProof.url.toLowerCase().trim(), isX = url.includes('x.com/') || url.includes('twitter.com/'), isYT = url.includes('youtube.com/') || url.includes('youtu.be/');
      if (url.length > 5 && !isX && !isYT) { setRealTimeAiScore(0); setAiStatusMsg("❌ INVALID LINK!"); return; }
      let score = (newProof.desc.length > 10 ? 40 : 10) + (isX || isYT ? 40 : 0);
      setRealTimeAiScore(Math.min(score, 100)); setAiStatusMsg(score >= 77 ? "✅ PRE-ANALYSIS COMPLETE" : "🔍 ANALYZING...");
  }, [newProof]);

  if (!mounted || !ready) return <div className="min-h-screen bg-black flex items-center justify-center"><div className="w-24 h-24 border-4 border-cyan-500/20 border-t-cyan-500 rounded-full animate-spin"></div></div>;

  return (
    <div className="min-h-screen bg-[#FDFBF7] text-[#1A1A1A] font-sans selection:bg-cyan-500/30 relative overflow-hidden">
      {/* Premium Luxury Background */}
      <div className="fixed inset-0 z-0 pointer-events-none">
          {/* Subtle Warm Glow */}
          <div className="absolute top-[-20%] left-[-10%] w-[70%] h-[70%] bg-[#F5E6D3]/30 blur-[150px] rounded-full"></div>
          <div className="absolute bottom-[-20%] right-[-10%] w-[70%] h-[70%] bg-[#E8D5C4]/20 blur-[150px] rounded-full"></div>
          
          {/* Elegant Luxury Grid */}
          <div className="absolute inset-0 opacity-[0.02]" style={{ backgroundImage: 'linear-gradient(#000 0.5px, transparent 0.5px), linear-gradient(90deg, #000 0.5px, transparent 0.5px)', backgroundSize: '100px 100px' }}></div>
          <div className="absolute inset-0 opacity-[0.01]" style={{ backgroundImage: 'linear-gradient(#000 0.5px, transparent 0.5px), linear-gradient(90deg, #000 0.5px, transparent 0.5px)', backgroundSize: '20px 20px' }}></div>
          
          {/* Grain Texture */}
          <div className="absolute inset-0 opacity-[0.03] mix-blend-multiply" style={{ backgroundImage: 'url("https://grainy-gradients.vercel.app/noise.svg")' }}></div>
      </div>

      <style>{`
        /* Temiz ve Net Renk Paleti */
        .bg-white\\/70, .bg-white\\/60, .bg-white\\/50, .bg-white, .bg-black, .bg-\\[#0A0A0A\\] { 
          background-color: white !important; 
          border-color: rgba(0,0,0,0.06) !important; 
          color: #1A1A1A !important; 
        }
        
        /* Yazı Renkleri: Sadece açık zeminlerdekiler koyu olsun */
        .text-white, .text-slate-300, .text-slate-400 { color: #1A1A1A !important; }
        .text-slate-500, .text-slate-600 { color: #8e8e8e !important; }
        
        /* KRİTİK: Resim üzerindeki yazılar SAKIZ BEYAZI kalsın */
        .relative .absolute h3, 
        .relative .absolute span, 
        .relative .absolute p,
        .absolute .text-cyan-400, 
        .absolute .text-white,
        .absolute .font-black { 
          color: #FFFFFF !important; 
        }
        
        /* Form ve Input Düzeltmeleri */
        input, textarea, .bg-black\\/60 { 
          background-color: #f8fafc !important; 
          color: #1A1A1A !important; 
          border: 1px solid #e2e8f0 !important;
          placeholder-color: #94a3b8 !important;
        }
        input::placeholder, textarea::placeholder { color: #94a3b8 !important; }

        /* Navbar */
        nav { 
          background-color: rgba(253, 251, 247, 0.9) !important; 
          backdrop-filter: blur(20px) !important; 
          border-bottom: 1px solid rgba(0,0,0,0.03) !important; 
        }

        /* Kartlar ve Gölgeler */
        .shadow-xl, .shadow-2xl { 
          box-shadow: 0 15px 30px -10px rgba(0,0,0,0.05), 0 5px 10px -5px rgba(0,0,0,0.02) !important; 
        }
        
        /* Vurgu Renkleri */
        .text-cyan-500, .text-cyan-600 { color: #155e75 !important; }
        .bg-cyan-500, .bg-cyan-600 { background-color: #155e75 !important; color: white !important; }
        
        /* Resimler: Karartma kaldırıldı */
        img { opacity: 1 !important; filter: brightness(0.8) contrast(1.1) !important; }
        
        /* Butonlar */
        button { transition: all 0.3s ease !important; }
        .bg-white { background-color: white !important; color: black !important; }
      `}</style>
       {isAiAnalyzing && (
           <div className="fixed inset-0 bg-black/90 backdrop-blur-[100px] z-[9999] flex flex-col items-center justify-center">
                <div className="w-40 h-40 bg-gradient-to-tr from-cyan-500 via-fuchsia-600 to-cyan-500 rounded-full animate-pulse shadow-[0_0_100px_rgba(34,211,238,0.6)] mb-12"></div>
                <h2 className="text-3xl font-black italic uppercase text-cyan-400">AI ANALYZING</h2>
                <div className="w-64 h-1 bg-white/10 rounded-full mt-8 overflow-hidden"><div className="h-full bg-cyan-500" style={{ width: `${aiProgress}%` }}></div></div>
           </div>
       )}

       <nav className="max-w-7xl mx-auto px-6 py-6 flex items-center justify-between relative z-50">
          <div className="flex items-center gap-4 cursor-pointer" onClick={() => window.location.reload()}>
              <div className="h-10 w-10 overflow-hidden rounded-xl border border-slate-200 shadow-sm"><img src="/logo.png" className="w-full h-full object-cover" alt="Logo" /></div>
              <div className="flex flex-col leading-none text-[#1A1A1A]"><span className="text-xl font-black italic uppercase leading-none">POD.</span><span className="text-[7px] font-black text-cyan-600 uppercase tracking-widest mt-1">Protocol</span></div>
          </div>
           <div className="flex items-center gap-4">
                <div className="flex bg-slate-100 border border-slate-200 rounded-2xl p-1 mr-4">
                    <button onClick={() => setActiveTab('dares')} className={`px-4 md:px-6 py-2 rounded-xl text-[9px] font-black uppercase transition-all ${activeTab === 'dares' ? 'bg-cyan-500 text-white shadow-lg shadow-cyan-500/20' : 'text-slate-500 hover:text-[#1A1A1A]'}`}>DARES</button>
                    <button onClick={() => setActiveTab('feed')} className={`px-4 md:px-6 py-2 rounded-xl text-[9px] font-black uppercase transition-all ${activeTab === 'feed' ? 'bg-cyan-500 text-white shadow-lg shadow-cyan-500/20' : 'text-slate-500 hover:text-[#1A1A1A]'}`}>SOCIAL FEEDS</button>
                    <button onClick={() => setActiveTab('podbet')} className={`px-4 md:px-6 py-2 rounded-xl text-[9px] font-black uppercase transition-all ${activeTab === 'podbet' ? 'bg-yellow-500 text-white shadow-lg shadow-yellow-500/20' : 'text-slate-500 hover:text-[#1A1A1A]'}`}>PODBET 🎲</button>
                    <button onClick={() => setActiveTab('jury')} className={`px-4 md:px-6 py-2 rounded-xl text-[9px] font-black uppercase transition-all ${activeTab === 'jury' ? 'bg-fuchsia-600 text-white shadow-lg shadow-fuchsia-500/20' : 'text-slate-500 hover:text-[#1A1A1A]'}`}>JUDY ⚖️</button>
                </div>
                {!authenticated ? <button onClick={login} className="bg-[#1A1A1A] text-white px-8 py-3 rounded-2xl text-[9px] font-black uppercase hover:bg-cyan-500 transition-all shadow-xl shadow-black/10">LOGIN</button> : (
                    <div className="flex items-center bg-slate-100 border border-slate-200 rounded-2xl">
                        <button onClick={getBalance} className="px-4 py-3 border-r border-slate-200 text-sm font-black text-cyan-600">{balance !== null ? `${balance.toFixed(2)} SOL` : '0.00 SOL'}</button>
                        <button onClick={() => setIsSettingsOpen(true)} className="h-12 px-5 hover:bg-slate-200 transition-all text-[#1A1A1A] text-lg">⚙️</button>
                    </div>
                )}
           </div>
       </nav>

            <header className="max-w-7xl mx-auto text-center py-20 px-6">
                <h1 className="text-4xl md:text-[6rem] font-black italic uppercase tracking-tighter leading-[0.8] mb-10 text-[#1A1A1A]">DARE.<br/><span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-600 via-yellow-500 to-fuchsia-600">PROVE.</span><br/>WIN.</h1>
                <p className="max-w-2xl mx-auto text-slate-500 text-[10px] md:text-xs font-black uppercase tracking-[0.3em] leading-relaxed mb-12">
                    Solana's first and only AI-verified social dare and prediction market protocol. <br className="hidden md:block"/>
                    Push your limits, prove it, and collect the community's bets.
                </p>
                <div className="flex flex-wrap justify-center gap-4 mb-20">
                    <div onClick={() => setInfoModal('dares')} className="bg-white border border-slate-200 px-8 py-6 rounded-[2.5rem] flex flex-col items-center gap-2 group hover:border-cyan-500/50 transition-all cursor-pointer hover:scale-105 active:scale-95 shadow-xl shadow-slate-200/50">
                        <span className="text-2xl">🎯</span>
                        <span className="text-[9px] font-black uppercase text-cyan-600">DARES</span>
                        <span className="text-[7px] text-slate-400 uppercase font-bold">Dare & Win</span>
                    </div>
                    <div onClick={() => setInfoModal('podbet')} className="bg-white border border-slate-200 px-8 py-6 rounded-[2.5rem] flex flex-col items-center gap-2 group hover:border-yellow-500/50 transition-all cursor-pointer hover:scale-105 active:scale-95 shadow-xl shadow-slate-200/50">
                        <span className="text-2xl">🎲</span>
                        <span className="text-[9px] font-black uppercase text-yellow-600">PODBET</span>
                        <span className="text-[7px] text-slate-400 uppercase font-bold">Predict & Multiply</span>
                    </div>
                    <div onClick={() => setInfoModal('jury')} className="bg-white border border-slate-200 px-8 py-6 rounded-[2.5rem] flex flex-col items-center gap-2 group hover:border-fuchsia-500/50 transition-all cursor-pointer hover:scale-105 active:scale-95 shadow-xl shadow-slate-200/50">
                        <span className="text-2xl">⚖️</span>
                        <span className="text-[9px] font-black uppercase text-fuchsia-500">JURY</span>
                        <span className="text-[7px] text-slate-500 uppercase font-bold">AI Verified Proofs</span>
                    </div>
                </div>
                {authenticated && <button onClick={() => { setNewDare({...newDare, isPodBet: false}); setIsCreateOpen(true); }} className="bg-cyan-500 text-black px-12 py-6 rounded-3xl font-black text-xs uppercase tracking-widest hover:scale-110 transition-all shadow-[0_0_50px_rgba(34,211,238,0.4)]">LAUNCH NEW DARE</button>}
            </header>
       
       <div className="max-w-7xl mx-auto px-4 md:px-6 mb-40">
           {activeTab === 'dares' ? (
               <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {dares.filter(d => !d.isPodBet).map((dare) => (
                        <div key={`dare-${dare.pubkey}`} onClick={() => { setSelectedDare(dare); setIsDetailOpen(true); }} className="group relative bg-white/70 backdrop-blur-xl border border-black/5 rounded-[3.5rem] overflow-hidden hover:border-cyan-500/40 transition-all duration-500 cursor-pointer flex flex-col h-full shadow-xl shadow-black/5">
                            <div className="w-full h-64 bg-slate-100 shadow-inner">
                                <img src={dare.customImg || CATEGORIES.find(c => c.id === dare.category)?.img} className="w-full h-full object-cover opacity-90 group-hover:scale-110 transition-transform duration-1000 grayscale-0" alt="cover" />
                                <div className="absolute top-8 left-8 bg-white shadow-lg border border-black/5 text-[8px] font-black text-cyan-400 uppercase tracking-widest">{dare.category}</div>
                                <div className="absolute bottom-8 right-8 bg-cyan-500/10 backdrop-blur-xl px-4 py-2 rounded-xl border border-cyan-500/20 text-[10px] font-black text-cyan-400">{dare.amount} {dare.token || 'SOL'}</div>
                            </div>
                            <div className="p-10 flex flex-col flex-1 gap-8">
                                <div className="flex justify-between items-start">
                                    <h3 className="text-3xl font-black uppercase italic tracking-tighter leading-[0.9] line-clamp-2">{dare.title}</h3>
                                    {(publicKey && dare.challenger === publicKey.toBase58()) && (
                                        <button onClick={(e) => handleDeleteDare(dare.pubkey, e)} className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-500 hover:bg-red-500 transition-all">🗑️</button>
                                    )}
                                </div>
                                <div className="flex items-center justify-between pt-4 border-t border-white/5 mt-auto">
                                    <div className="flex flex-col gap-1"><span className="text-[7px] font-black text-slate-600 uppercase tracking-widest">TIME LEFT</span><Countdown deadline={dare.deadline} /></div>
                                    <div className="flex items-center gap-4">
                                        <button onClick={(e) => { e.stopPropagation(); const url = `https://dial.to/?action=solana-action:${window.location.origin}/api/actions/submit-proof?dare=${dare.pubkey}`; window.open(`https://twitter.com/intent/tweet?text=I am challenging this!&url=${encodeURIComponent(url)}`, '_blank'); }} className="text-[8px] font-black text-cyan-400 uppercase hover:underline">SHARE BLINK 🐦</button>
                                        <span className="text-[9px] font-black text-slate-400">🔥 {dare.applicants?.length || 0} APPLICANTS</span>
                                    </div>
                                </div>
                            </div>
                       </div>
                    ))}
                </div>
           ) : activeTab === 'feed' ? (
                <div className="max-w-4xl mx-auto space-y-12">
                    {globalFeed.length > 0 ? globalFeed.map((item) => (
                        <div key={`feed-${item.type}-${item.id || item.darePubkey}-${item.timestamp}`} className="bg-white/60 backdrop-blur-xl shadow-xl shadow-black/5 border border-black/5">
                            <div className="flex gap-8 items-start">
                                <div className="h-20 w-20 rounded-[1.5rem] overflow-hidden border border-white/10 shrink-0 shadow-xl"><img src={item.img || `https://api.dicebear.com/7.x/avataaars/svg?seed=${item.address}`} className="w-full h-full object-cover" alt="pfp" /></div>
                                <div className="flex-1 space-y-4">
                                    <div className="flex justify-between items-start">
                                        <div className="flex-1">
                                            <div className="flex items-center gap-3 mb-2">
                                                <span className="text-[9px] font-black text-cyan-400 uppercase tracking-[0.2em]">{item.type === 'DARE' ? '🚀 NEW DARE' : '✅ PROOF SUBMITTED'}</span>
                                                <span className="text-[9px] text-slate-600 font-mono italic">@{item.address?.substring(0, 8)}...</span>
                                            </div>
                                            <h3 className="text-3xl font-black italic tracking-tighter uppercase leading-tight">{item.description}</h3>
                                            <div className="flex items-center gap-2 mt-2">
                                                <span className="text-[10px] text-slate-500 uppercase font-black">TARGET:</span>
                                                <span className="text-[10px] text-cyan-500 font-black italic">{item.dareTitle}</span>
                                            </div>
                                        </div>
                                        <div className="flex flex-col items-end gap-3">
                                            <div className="bg-cyan-500/10 px-6 py-3 rounded-2xl border border-cyan-500/20 shadow-lg shadow-cyan-500/5"><p className="text-2xl font-black text-white italic leading-none">{item.amount} {item.token || 'SOL'}</p></div>
                                            <button onClick={() => { const d = dares.find(d => d.pubkey === item.darePubkey); if (d) { setSelectedDare(d); setIsDetailOpen(true); setActiveTab(d.isPodBet ? 'podbet' : 'dares'); } }} className="px-6 py-3 bg-transparent border border-white/10 text-white hover:bg-white hover:text-black rounded-xl text-[9px] font-black uppercase transition-all backdrop-blur-md">VIEW DETAILS</button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            
                            {item.type === 'PROOF' && (
                                <div className="flex items-center gap-6 pt-8 border-t border-white/5">
                                    <div className="flex items-center bg-white/5 rounded-2xl p-1">
                                        <button onClick={() => handleVote(item.id, true, item.darePubkey)} className="flex items-center gap-3 hover:bg-green-500/20 px-6 py-3 rounded-xl transition-all group/like">
                                            <span className="text-lg group-hover/like:scale-125 transition-transform">🔥</span>
                                            <span className="text-xs font-black">{item.likes || 0}</span>
                                        </button>
                                        <div className="w-[1px] h-6 bg-white/10 mx-1"></div>
                                        <button onClick={() => handleVote(item.id, false, item.darePubkey)} className="flex items-center gap-3 hover:bg-red-500/20 px-6 py-3 rounded-xl transition-all group/dis">
                                            <span className="text-lg group-hover/dis:scale-125 transition-transform">👎</span>
                                            <span className="text-xs font-black">{item.dislikes || 0}</span>
                                        </button>
                                    </div>
                                    <div className="flex-1 flex gap-3">
                                        <input value={newComment[item.id] || ""} onChange={e => setNewComment({...newComment, [item.id]: e.target.value})} className="flex-1 bg-black/60 border border-white/5 rounded-2xl px-8 py-4 text-xs outline-none focus:border-cyan-500 transition-all font-medium placeholder:text-slate-700" placeholder="Write a comment..." />
                                        <button onClick={() => handleAddComment(item.id, item.darePubkey)} className="px-10 bg-white hover:bg-cyan-500 text-black rounded-2xl font-black text-[10px] uppercase transition-all shadow-xl">SEND</button>
                                    </div>
                                </div>
                            )}
                        </div>
                    )) : (
                        <div className="text-center py-40 opacity-20"><h2 className="text-4xl font-black uppercase">FEED LOADING...</h2></div>
                    )}
                 </div>
            ) : activeTab === 'podbet' ? (
                <div className="max-w-7xl mx-auto space-y-12">
                    <div className="flex justify-between items-center bg-white/70 backdrop-blur-xl border border-yellow-500/20 p-10 rounded-[3rem] shadow-xl">
                        <div className="flex flex-col">
                            <h2 className="text-3xl font-black italic uppercase text-yellow-600">PODBET MARKET</h2>
                            <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest">WILL IT HAPPEN? BET AND WIN.</p>
                        </div>
                        <button onClick={() => { setNewDare({...newDare, isPodBet: true}); setIsCreateOpen(true); }} className="bg-yellow-500 text-white px-10 py-4 rounded-2xl font-black text-[10px] uppercase hover:bg-yellow-600 shadow-xl shadow-yellow-500/10 transition-all">CREATE MARKET</button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        {dares.filter(d => d.isPodBet).map((dare, idx) => {
                            const total = (dare.yesAmount || 1) + (dare.noAmount || 1);
                            const yesOdds = (total / (dare.yesAmount || 1)).toFixed(2);
                            const noOdds = (total / (dare.noAmount || 1)).toFixed(2);

                            return (
                                <div key={`podbet-${dare.pubkey}`} className="bg-white/70 backdrop-blur-xl border border-black/5 rounded-[3.5rem] overflow-hidden hover:border-yellow-500/30 transition-all group shadow-xl">
                                    <div className="p-10 space-y-8">
                                        <div className="flex justify-between items-start">
                                            <div className="space-y-2">
                                                <span className="text-[8px] font-black text-yellow-600 uppercase tracking-widest bg-yellow-50 px-3 py-1 rounded-lg">{dare.category}</span>
                                                <h3 className="text-3xl font-black uppercase italic tracking-tighter leading-[0.9] text-[#1A1A1A]">{dare.title}</h3>
                                            </div>
                                            <div className="text-right">
                                                <span className="text-[8px] font-black text-slate-500 uppercase">TOTAL VOLUME</span>
                                                <p className="text-xl font-black text-yellow-600 italic">{(dare.yesAmount || 0) + (dare.noAmount || 0)} {dare.token || 'SOL'}</p>
                                            </div>
                                        </div>

                                        <div className="bg-slate-50 border border-slate-100 p-4 rounded-2xl flex items-center gap-4">
                                            <input 
                                                id={`bet-amount-${dare.pubkey}`}
                                                type="number" 
                                                defaultValue="0.1"
                                                step="0.1"
                                                className="flex-1 bg-transparent border-none outline-none text-xl font-black italic text-[#1A1A1A] placeholder:text-slate-400"
                                                placeholder="Bet Amount..."
                                            />
                                            <span className="text-xs font-black text-slate-400">SOL</span>
                                        </div>

                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="bg-green-50/50 border border-green-500/10 p-6 rounded-3xl space-y-4">
                                                <div className="flex justify-between items-center">
                                                    <span className="text-[10px] font-black text-green-600 uppercase">YES</span>
                                                    <span className="text-sm font-black text-[#1A1A1A]">{yesOdds}x</span>
                                                </div>
                                                <button onClick={() => {
                                                    const input = document.getElementById(`bet-amount-${dare.pubkey}`) as HTMLInputElement;
                                                    handlePlaceBet(dare.pubkey, 'YES', parseFloat(input.value));
                                                }} className="w-full py-4 bg-green-600 text-white rounded-2xl font-black text-[10px] uppercase transition-all shadow-lg shadow-green-500/20 hover:scale-105">BET YES</button>
                                            </div>
                                            <div className="bg-red-50/50 border border-red-500/10 p-6 rounded-3xl space-y-4">
                                                <div className="flex justify-between items-center">
                                                    <span className="text-[10px] font-black text-red-600 uppercase">NO</span>
                                                    <span className="text-sm font-black text-[#1A1A1A]">{noOdds}x</span>
                                                </div>
                                                <button onClick={() => {
                                                    const input = document.getElementById(`bet-amount-${dare.pubkey}`) as HTMLInputElement;
                                                    handlePlaceBet(dare.pubkey, 'NO', parseFloat(input.value));
                                                }} className="w-full py-4 bg-red-600 text-white rounded-2xl font-black text-[10px] uppercase transition-all shadow-lg shadow-red-500/20 hover:scale-105">BET NO</button>
                                            </div>
                                        </div>

                                        <div className="pt-6 border-t border-black/5 flex justify-between items-center">
                                            <div className="flex flex-col"><span className="text-[7px] font-black text-slate-400 uppercase">TIME LEFT</span><Countdown deadline={dare.deadline} /></div>
                                            <button onClick={() => { setSelectedDare(dare); setIsDetailOpen(true); }} className="text-[9px] font-black text-slate-500 uppercase hover:text-cyan-600 transition-all">VIEW DETAILS →</button>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            ) : (
                <div className="max-w-5xl mx-auto space-y-12">
                    {dares.flatMap(d => (d.applicants || []).filter(a => a.aiStatus === 'SUSPICIOUS').map(a => ({ ...a, dareTitle: d.title, darePubkey: d.pubkey }))).length > 0 ? (
                        dares.flatMap(d => (d.applicants || []).filter(a => a.aiStatus === 'SUSPICIOUS').map(a => ({ ...a, dareTitle: d.title, darePubkey: d.pubkey }))).map((item) => (
                            <div key={`jury-${item.darePubkey}-${item.id}`} className="bg-white/70 backdrop-blur-xl border border-fuchsia-500/20 p-12 rounded-[4rem] flex flex-col md:flex-row gap-12 shadow-xl relative overflow-hidden">
                                <div className="absolute top-0 right-0 w-32 h-32 bg-fuchsia-600/5 blur-[80px]"></div>
                                <div className="w-full md:w-96 aspect-square bg-slate-100 rounded-[2.5rem] overflow-hidden relative border border-black/5 shadow-xl shrink-0">
                                    {getThumbnail(item.proofUrl) ? <img src={getThumbnail(item.proofUrl)!} className="w-full h-full object-cover opacity-90" alt="thumb" /> : <div className="w-full h-full flex items-center justify-center text-6xl">⚖️</div>}
                                    <a href={item.proofUrl} target="_blank" className="absolute inset-0 flex items-center justify-center bg-black/20 opacity-0 hover:opacity-100 transition-all text-5xl font-black text-white">WATCH</a>
                                </div>
                                <div className="flex-1 space-y-8 flex flex-col justify-center">
                                    <div className="space-y-4">
                                        <div className="flex items-center gap-4">
                                            <span className="bg-fuchsia-600 text-white px-5 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-fuchsia-600/30">CASE FILE</span>
                                            <span className="text-slate-500 font-mono text-[10px]">ID: #{item.id.toString().substring(0, 6)}</span>
                                        </div>
                                        <h4 className="text-4xl font-black italic leading-[0.9] uppercase tracking-tighter text-[#1A1A1A]">"{item.description}"</h4>
                                        <p className="text-xs text-cyan-600 font-black uppercase italic">TARGET: {item.dareTitle}</p>
                                    </div>
                                    <div className="p-8 bg-slate-50 rounded-[2.5rem] border border-fuchsia-500/10 text-[11px] leading-relaxed text-slate-600 italic relative shadow-inner">
                                        <span className="absolute top-4 right-8 text-[7px] font-black text-fuchsia-500 uppercase tracking-widest">DAREGUARD AI ANALYSIS</span>
                                        <div className="flex items-start gap-4 mt-2">
                                            <span className="text-2xl mt-1">🛡️</span>
                                            <p>{item.aiComment}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-6 pt-4"><button onClick={() => handleVote(item.id, true, item.darePubkey)} className="flex-1 py-7 bg-green-600 text-white rounded-3xl text-[10px] font-black uppercase hover:scale-[1.02] transition-all shadow-xl shadow-green-500/20">VOTE LEGIT (APPROVE)</button><button onClick={() => handleVote(item.id, false, item.darePubkey)} className="flex-1 py-7 bg-red-600 text-white rounded-3xl text-[10px] font-black uppercase hover:scale-[1.02] transition-all shadow-xl shadow-red-600/20">VOTE FAKE (REJECT)</button></div>
                                </div>
                            </div>
                        ))
                    ) : (
                        <div className="text-center py-60 opacity-20"><h2 className="text-[8rem] font-black italic uppercase leading-none tracking-tighter text-slate-300">JURY EMPTY ⚖️</h2><p className="text-lg mt-8 font-black uppercase tracking-[0.5em] text-cyan-600">THERE IS NO FILE BEING ANALYZED AT THE MOMENT</p></div>
                    )}
                </div>
            )}
        </div>

       {isDetailOpen && selectedDare && (
           <div className="fixed inset-0 bg-black/60 backdrop-blur-xl z-[5000] flex items-center justify-center p-6 animate-in fade-in duration-300">
               <div className="bg-[#FDFBF7] w-full max-w-7xl h-[90vh] rounded-[4.5rem] overflow-hidden border border-black/5 flex flex-col lg:flex-row relative shadow-2xl">
                   <button onClick={() => setIsDetailOpen(false)} className="absolute top-10 right-10 z-[5001] h-14 w-14 bg-black/5 text-black rounded-2xl hover:bg-black hover:text-white flex items-center justify-center text-xl transition-all">✕</button>
                   <div className="w-full lg:w-5/12 h-full bg-slate-200 relative border-r border-black/5">
                       <img src={selectedDare.customImg || CATEGORIES.find(c => c.id === selectedDare.category)?.img} className="w-full h-full object-cover brightness-75" alt="detail" />
                       <div className="absolute bottom-20 left-20 right-20">
                           <h2 className="text-5xl font-black italic uppercase leading-[0.8] tracking-tighter mb-8 text-white">{selectedDare.title}</h2>
                           <div className="inline-block bg-cyan-600 text-white px-6 py-2 rounded-xl font-black text-xl italic shadow-xl">{selectedDare.amount} {selectedDare.token || 'SOL'}</div>
                       </div>
                   </div>
                   <div className="w-full lg:w-7/12 p-16 md:p-24 overflow-y-auto bg-[#FDFBF7] custom-scrollbar text-[#1A1A1A]">
                        {selectedDare.isPodBet ? (
                             <div className="mb-20 bg-yellow-500/5 border border-yellow-500/10 p-12 rounded-[3.5rem] shadow-xl space-y-10">
                                 <div className="text-center space-y-2">
                                     <h3 className="text-3xl font-black italic uppercase text-yellow-600">PODBET LIVE MARKET</h3>
                                     <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest">PLACE YOUR BET FOR THIS DARE</p>
                                 </div>
                                 <div className="grid grid-cols-2 gap-6">
                                     <div className="bg-white border border-black/5 p-8 rounded-[2.5rem] space-y-6 shadow-sm">
                                         <div className="flex justify-between items-center">
                                             <span className="text-xs font-black text-green-600 uppercase">YES</span>
                                             <span className="text-xl font-black text-[#1A1A1A]">{(( (selectedDare.yesAmount || 1) + (selectedDare.noAmount || 1) ) / (selectedDare.yesAmount || 1)).toFixed(2)}x</span>
                                         </div>
                                         <button onClick={() => {
                                             const input = document.getElementById(`modal-bet-amount`) as HTMLInputElement;
                                             handlePlaceBet(selectedDare.pubkey, 'YES', parseFloat(input.value));
                                         }} className="w-full py-5 bg-green-600 text-white rounded-2xl font-black text-xs uppercase hover:bg-green-700 transition-all shadow-lg shadow-green-500/10">BET YES</button>
                                     </div>
                                     <div className="bg-white border border-black/5 p-8 rounded-[2.5rem] space-y-6 shadow-sm">
                                         <div className="flex justify-between items-center">
                                             <span className="text-xs font-black text-red-600 uppercase">NO</span>
                                             <span className="text-xl font-black text-[#1A1A1A]">{(( (selectedDare.yesAmount || 1) + (selectedDare.noAmount || 1) ) / (selectedDare.noAmount || 1)).toFixed(2)}x</span>
                                         </div>
                                         <button onClick={() => {
                                             const input = document.getElementById(`modal-bet-amount`) as HTMLInputElement;
                                             handlePlaceBet(selectedDare.pubkey, 'NO', parseFloat(input.value));
                                         }} className="w-full py-5 bg-red-600 text-white rounded-2xl font-black text-xs uppercase hover:bg-red-700 transition-all shadow-lg shadow-red-500/10">BET NO</button>
                                     </div>
                                 </div>
                                 <div className="flex items-center gap-6 bg-white p-6 rounded-3xl border border-black/5 shadow-inner">
                                     <input id="modal-bet-amount" type="number" defaultValue="0.1" step="0.1" className="flex-1 bg-transparent border-none outline-none text-2xl font-black italic text-[#1A1A1A]" />
                                     <span className="text-sm font-black text-slate-400">SOL</span>
                                 </div>

                                 <div className="pt-10 border-t border-black/5">
                                     <h3 className="text-xl font-black italic uppercase mb-8 text-cyan-600 text-center">Submit X & YouTube Proof (Join)</h3>
                                     <div className="mb-8 p-6 bg-white border border-black/5 rounded-3xl">
                                         <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden mb-4"><div className={`h-full transition-all duration-1000 ${realTimeAiScore >= 77 ? 'bg-green-500' : 'bg-red-500'}`} style={{ width: realTimeAiScore + '%' }}></div></div>
                                         <div className="flex justify-between items-center text-[9px] font-black uppercase text-slate-500"><span>PRE-ANALYSIS: %{realTimeAiScore}</span><span>TARGET: %77</span></div>
                                     </div>
                                     <div className="space-y-4">
                                         <input value={newProof.url} onChange={e => setNewProof({...newProof, url: e.target.value})} className="w-full bg-white border border-black/10 rounded-2xl px-6 py-4 text-xs outline-none focus:border-cyan-600 transition-all text-[#1A1A1A]" placeholder="Video Link" />
                                         <textarea value={newProof.desc} onChange={e => setNewProof({...newProof, desc: e.target.value})} className="w-full bg-white border border-black/10 rounded-2xl px-6 py-4 text-xs h-24 resize-none outline-none focus:border-cyan-600 transition-all text-[#1A1A1A]" placeholder="Description..."></textarea>
                                         <button onClick={handleSubmitProof} className="w-full py-5 rounded-2xl font-black text-[9px] uppercase bg-cyan-600 text-white hover:bg-black transition-all shadow-xl shadow-cyan-500/20">SUBMIT PROOF & JOIN</button>
                                     </div>
                                 </div>
                             </div>
                         ) : (
                             <div className="mb-20 bg-white border border-black/5 p-12 rounded-[3.5rem] shadow-xl">
                                 <h3 className="text-2xl font-black italic uppercase mb-8 text-cyan-600 text-center">Submit X & YouTube Proof</h3>
                                 <div className="mb-10 p-8 bg-slate-50 border border-black/5 rounded-3xl shadow-inner">
                                     <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden mb-6"><div className={`h-full transition-all duration-1000 ${realTimeAiScore >= 77 ? 'bg-green-500' : 'bg-red-500'}`} style={{ width: realTimeAiScore + '%' }}></div></div>
                                     <div className="flex justify-between items-center mb-4"><span className={`text-sm font-black ${realTimeAiScore >= 77 ? 'text-green-600' : 'text-red-600'}`}>PRE-ANALYSIS: %{realTimeAiScore}</span><span className="text-slate-500 text-[10px] font-black uppercase">TARGET: %77</span></div>
                                     <div className={`p-4 rounded-xl border text-[10px] font-black uppercase text-center ${realTimeAiScore >= 77 ? 'bg-green-500/10 border-green-500/20 text-green-400' : 'bg-red-500/10 border-red-500/20 text-red-400'}`}>{aiStatusMsg}</div>
                                 </div>
                                 <div className="space-y-6">
                                     <input value={newProof.url} onChange={e => setNewProof({...newProof, url: e.target.value})} className="w-full bg-black/40 border border-white/10 rounded-2xl px-6 py-4 text-xs outline-none focus:border-cyan-500 transition-all" placeholder="Video Link" />
                                     <textarea value={newProof.desc} onChange={e => setNewProof({...newProof, desc: e.target.value})} className="w-full bg-black/40 border border-white/10 rounded-2xl px-6 py-4 text-xs h-32 resize-none outline-none focus:border-cyan-500 transition-all" placeholder="Description..."></textarea>
                                     <button onClick={handleSubmitProof} className="w-full py-6 rounded-3xl font-black text-[10px] uppercase bg-cyan-500 text-black hover:bg-white transition-all">SUBMIT</button>
                                 </div>
                             </div>
                         )}
                       <div className="space-y-12">
                           <h3 className="text-xl font-black italic uppercase">ALL PROOFS</h3>
                           {(selectedDare.applicants || []).map((app) => (
                               <div key={`app-${app.id}-${app.address}`} className={`bg-white/[0.02] border p-8 rounded-[3rem] flex flex-col gap-8 group ${app.aiStatus === 'SUSPICIOUS' ? 'border-fuchsia-500/20' : 'border-white/5'}`}>
                                   <div className="flex gap-8">
                                       <div className="w-48 h-48 bg-black rounded-3xl overflow-hidden border border-white/10 relative group/thumb">
                                            {getThumbnail(app.proofUrl) ? <img src={getThumbnail(app.proofUrl)!} className="w-full h-full object-cover" alt="thumb" /> : <img src={app.img} className="w-full h-full object-cover opacity-30" alt="app" />}
                                            <a href={app.proofUrl} target="_blank" className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover/thumb:opacity-100 transition-opacity text-white text-3xl font-black z-10">WATCH</a>
                                       </div>
                                       <div className="flex-1 space-y-4">
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-3">
                                                    <div className="h-8 w-8 rounded-full border border-white/10 overflow-hidden"><img src={app.img} className="w-full h-full object-cover" alt="avatar" /></div>
                                                    <p className="text-[10px] font-mono text-slate-500">{app.address?.substring(0, 8)}...</p>
                                                    {app.aiStatus === 'SUSPICIOUS' && <span className="bg-fuchsia-600 text-white px-3 py-1 rounded-lg text-[7px] font-black uppercase animate-pulse">INVESTIGATING ⚖️</span>}
                                                </div>
                                                <div className="flex items-center gap-4"><button onClick={() => handleVote(app.id, true)} className="text-[10px] bg-white/5 px-4 py-2 rounded-xl hover:bg-green-500/20 transition-all">👍 {app.likes}</button><button onClick={() => handleVote(app.id, false)} className="text-[10px] bg-white/5 px-4 py-2 rounded-xl hover:bg-red-500/20 transition-all">👎 {app.dislikes}</button></div>
                                            </div>
                                            <p className="text-[14px] font-black uppercase italic leading-relaxed">"{app.description}"</p>
                                            {app.aiScore && <div className={`p-4 rounded-2xl border text-[9px] italic ${app.aiStatus === 'SUSPICIOUS' ? 'bg-fuchsia-500/5 border-fuchsia-500/10 text-fuchsia-400' : 'bg-cyan-500/5 border-cyan-500/10 text-cyan-400'}`}>🛡️ DAREGUARD: {app.aiComment}</div>}
                                       </div>
                                   </div>
                                   <div className="space-y-4 max-h-64 overflow-y-auto custom-scrollbar pr-2">
                                       {(app.comments || []).map((c, i) => (
                                           <div key={`comment-${i}-${c.timestamp}`} className="bg-white/5 p-4 rounded-2xl border border-white/5 animate-in slide-in-from-bottom-2">
                                               <div className="flex justify-between items-center mb-2">
                                                   <span className="text-[7px] font-black text-cyan-500 uppercase">{c.address.slice(0,4)}...{c.address.slice(-4)}</span>
                                                   <span className="text-[7px] text-slate-500">{new Date(c.timestamp).toLocaleTimeString()}</span>
                                               </div>
                                               <p className="text-[10px] text-[#1A1A1A] leading-relaxed">{c.text}</p>
                                           </div>
                                       ))}
                                   </div>
                                   <div className="pt-6 border-t border-white/5 space-y-4 relative z-[60]">
                                        <div className="flex gap-4"><input value={newComment[app.id] || ""} onChange={e => setNewComment({...newComment, [app.id]: e.target.value})} className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-[10px] outline-none relative z-[60]" placeholder="Write a comment..." /><button onClick={() => { console.log("Send clicked for app:", app.id); handleAddComment(app.id); }} className="bg-white text-black px-6 py-2 rounded-xl text-[9px] font-black uppercase hover:bg-cyan-500 transition-all shadow-lg shadow-cyan-500/10 relative z-[70] pointer-events-auto">SEND</button></div>
                                   </div>
                               </div>
                           ))}
                       </div>
                   </div>
               </div>
           </div>
       )}

       {infoModal && (
            <div className="fixed inset-0 bg-black/98 backdrop-blur-[100px] z-[600] flex items-center justify-center p-6 animate-in zoom-in duration-300">
                <div className={`bg-[#0A0A0A] border w-full max-w-xl rounded-[4rem] p-16 shadow-2xl relative transition-all duration-500 ${infoModal === 'dares' ? 'border-cyan-500/20' : infoModal === 'podbet' ? 'border-yellow-500/20' : 'border-fuchsia-500/20'}`}>
                    <button onClick={() => setInfoModal(null)} className="absolute top-10 right-10 z-50 h-12 w-12 bg-white/5 rounded-2xl hover:bg-white hover:text-black flex items-center justify-center text-sm transition-all">✕</button>
                    
                    {infoModal === 'dares' && (
                        <div className="space-y-8">
                            <div className="h-20 w-20 bg-cyan-500 text-black rounded-3xl flex items-center justify-center text-4xl shadow-[0_0_50px_rgba(34,211,238,0.4)]">🎯</div>
                            <h2 className="text-4xl font-black italic uppercase tracking-tighter text-cyan-400">WHAT IS DARES?</h2>
                            <p className="text-slate-400 text-sm leading-relaxed font-medium">
                                Dares is a platform where you can launch challenges against the community or specific individuals. You set a reward, define the rules, and people submit proof by following those rules. <br/><br/>
                                Successful participants share the reward pool. Everything is on-chain and transparent.
                            </p>
                        </div>
                    )}

                    {infoModal === 'podbet' && (
                        <div className="space-y-8">
                            <div className="h-20 w-20 bg-yellow-500 text-black rounded-3xl flex items-center justify-center text-4xl shadow-[0_0_50px_rgba(234,179,8,0.4)]">🎲</div>
                            <h2 className="text-4xl font-black italic uppercase tracking-tighter text-yellow-500">WHAT IS PODBET?</h2>
                            <p className="text-slate-400 text-sm leading-relaxed font-medium">
                                PodBet is a prediction market where you can bet on the outcome of challenges. You can stake by saying YES or NO to the question "Can this person complete this dare?". <br/><br/>
                                When concluded, the winning side splits the entire reward in the pool based on their stakes.
                            </p>
                        </div>
                    )}

                    {infoModal === 'jury' && (
                        <div className="space-y-8">
                            <div className="h-20 w-20 bg-fuchsia-600 text-white rounded-3xl flex items-center justify-center text-4xl shadow-[0_0_50px_rgba(192,38,211,0.4)]">⚖️</div>
                            <h2 className="text-4xl font-black italic uppercase tracking-tighter text-fuchsia-600">WHAT IS JURY?</h2>
                            <p className="text-slate-600 text-sm leading-relaxed font-medium">
                                Jury (Judy) is an AI-based system that monitors the accuracy of submitted proofs. Videos, links, and descriptions undergo a "Neural Scan" process by AI. <br/><br/>
                                Content flagged as suspicious is presented for community voting (Jury), making cheating impossible.
                            </p>
                        </div>
                    )}
                </div>
            </div>
        )}

        {isCreateOpen && (
            <div className="fixed inset-0 bg-black/60 backdrop-blur-xl z-[500] flex items-center justify-center p-6 animate-in fade-in duration-500">
                <div className="bg-[#FDFBF7] border border-black/5 w-full max-w-2xl rounded-[4.5rem] p-16 shadow-2xl relative overflow-y-auto max-h-[90vh] custom-scrollbar text-[#1A1A1A]">
                    <button onClick={() => setIsCreateOpen(false)} className="absolute top-10 right-10 z-50 h-14 w-14 bg-black/5 rounded-2xl hover:bg-black hover:text-white flex items-center justify-center text-xl transition-all">✕</button>
                    <h2 className="text-4xl font-black italic uppercase tracking-tighter mb-12">LAUNCH A DARE</h2>
                    <div className="space-y-8">
                        <div className="grid grid-cols-2 gap-4">
                            {CATEGORIES.map(cat => (
                                <button key={cat.id} onClick={() => setNewDare({...newDare, category: cat.id})} className={`p-6 rounded-3xl border transition-all text-left ${newDare.category === cat.id ? 'bg-cyan-600 border-cyan-600 text-white' : 'bg-white border-black/5 text-slate-400'}`}>
                                    <span className="text-2xl mb-2 block">{cat.icon}</span>
                                    <span className="text-[10px] font-black uppercase tracking-widest">{cat.label}</span>
                                </button>
                            ))}
                        </div>
                        <input value={newDare.title} onChange={e => setNewDare({...newDare, title: e.target.value})} className="w-full bg-white border border-black/10 rounded-2xl px-8 py-6 text-sm outline-none focus:border-cyan-600 transition-all text-[#1A1A1A]" placeholder="Title" />
                        <textarea value={newDare.description} onChange={e => setNewDare({...newDare, description: e.target.value})} className="w-full bg-white border border-black/10 rounded-2xl px-8 py-6 text-sm h-32 resize-none outline-none focus:border-cyan-600 transition-all text-[#1A1A1A]" placeholder="Description..."></textarea>
                        <div className="grid grid-cols-2 gap-6">
                             <div><p className="text-[8px] font-black text-slate-500 uppercase mb-3">REWARD AMOUNT</p><input type="number" value={newDare.amount} onChange={e => setNewDare({...newDare, amount: parseFloat(e.target.value)})} className="w-full bg-white border border-black/10 rounded-2xl px-8 py-4 text-sm outline-none focus:border-cyan-600 transition-all text-[#1A1A1A]" /></div>
                             <div><p className="text-[8px] font-black text-slate-500 uppercase mb-3">TOKEN</p><div className="flex gap-2">{TOKENS.map(t => <button key={t.symbol} onClick={() => setNewDare({...newDare, token: t.symbol})} className={`flex-1 h-14 rounded-2xl border flex items-center justify-center transition-all ${newDare.token === t.symbol ? 'bg-black text-white border-black' : 'bg-white border-black/10 text-slate-400'}`}><img src={t.icon} className="h-6 w-6 rounded-full" alt={t.symbol} /></button>)}</div></div>
                         </div>
                         <div className={`bg-white border p-8 rounded-[2.5rem] flex items-center justify-between cursor-pointer transition-all duration-500 ${newDare.isPodBet ? 'border-yellow-500 bg-yellow-50 shadow-xl' : 'border-black/5'}`} onClick={() => setNewDare({...newDare, isPodBet: !newDare.isPodBet})}>
                             <div className="flex items-center gap-6">
                                 <div className={`h-12 w-12 rounded-2xl flex items-center justify-center text-2xl transition-all ${newDare.isPodBet ? 'bg-yellow-500 text-white' : 'bg-slate-100 text-slate-400'}`}>
                                     {newDare.isPodBet ? '🎲' : '🎯'}
                                 </div>
                                 <div className="flex flex-col">
                                     <span className={`text-[11px] font-black uppercase transition-all ${newDare.isPodBet ? 'text-yellow-600' : 'text-[#1A1A1A]'}`}>
                                         {newDare.isPodBet ? 'PODBET MARKET ACTIVE' : 'NORMAL DARE'}
                                     </span>
                                     <span className="text-[8px] text-slate-500 uppercase font-bold tracking-widest">
                                         {newDare.isPodBet ? 'BETTING WILL BE AVAILABLE ON THIS DARE' : 'THIS DARE WILL BE FOR PROOF ONLY'}
                                     </span>
                                 </div>
                             </div>
                             <div className={`h-10 w-16 rounded-full p-1.5 transition-all duration-500 ${newDare.isPodBet ? 'bg-yellow-500' : 'bg-slate-200'}`}>
                                 <div className={`h-7 w-7 bg-white rounded-full shadow-2xl transition-all duration-500 transform ${newDare.isPodBet ? 'translate-x-6' : 'translate-x-0'}`}></div>
                             </div>
                         </div>
                        <button onClick={handleLaunchDare} className={`w-full py-8 rounded-[2.5rem] font-black text-[11px] uppercase transition-all duration-500 shadow-xl ${newDare.isPodBet ? 'bg-yellow-500 text-white hover:bg-black' : 'bg-cyan-600 text-white hover:bg-black'}`}>
                            {newDare.isPodBet ? 'LAUNCH PODBET MARKET' : 'LAUNCH DARE'} ({(newDare.amount + PLATFORM_FEE_LAUNCH).toFixed(2)} {newDare.token})
                        </button>
                    </div>
                </div>
            </div>
        )}

        {isSettingsOpen && (
            <div className="fixed inset-0 bg-black/60 backdrop-blur-xl z-[3000] flex items-center justify-center p-6 animate-in fade-in duration-300">
                <div className="bg-[#FDFBF7] border border-black/5 w-full max-w-xl rounded-[4rem] p-16 shadow-2xl relative max-h-[90vh] overflow-y-auto custom-scrollbar text-[#1A1A1A]">
                    <button onClick={() => setIsSettingsOpen(false)} className="absolute top-10 right-10 z-[3001] h-12 w-12 bg-black/5 text-black rounded-2xl hover:bg-black hover:text-white flex items-center justify-center text-sm transition-all shadow-xl">✕</button>
                    <h2 className="text-4xl font-black italic uppercase tracking-tighter mb-16">SETTINGS</h2>
                    <div className="space-y-6">
                        <div className="flex bg-slate-100 p-1 rounded-2xl mb-8 shadow-inner">
                            <button onClick={() => setSettingsTab('account')} className={`flex-1 py-3 rounded-xl text-[9px] font-black uppercase ${settingsTab === 'account' ? 'bg-cyan-600 text-white shadow-lg' : 'text-slate-500'}`}>ACCOUNT</button>
                            <button onClick={() => setSettingsTab('rewards')} className={`flex-1 py-3 rounded-xl text-[9px] font-black uppercase ${settingsTab === 'rewards' ? 'bg-cyan-600 text-white shadow-lg' : 'text-slate-500'}`}>MY REWARDS 💰</button>
                        </div>
                        {settingsTab === 'account' ? (
                            <div className="space-y-6">
                                <div className="bg-white p-8 rounded-[2.5rem] border border-black/5 flex items-center justify-between shadow-sm">
                                     <div className="flex flex-col">
                                         <p className="text-[8px] font-black text-slate-500 uppercase mb-4">X (TWITTER)</p>
                                         <p className="text-sm font-bold text-[#1A1A1A]">{user?.twitter?.username ? `@${user.twitter.username}` : 'Not Connected'}</p>
                                     </div>
                                     {user?.twitter?.username ? (
                                         <button onClick={() => unlinkTwitter(user.twitter!.subject)} className="px-6 py-2 bg-red-50/10 text-red-600 border border-red-600/20 rounded-xl text-[8px] font-black uppercase hover:bg-red-600 hover:text-white transition-all">DISCONNECT</button>
                                     ) : (
                                         <button onClick={linkTwitter} className="px-6 py-2 bg-cyan-600 text-white rounded-xl text-[8px] font-black uppercase hover:bg-black transition-all">CONNECT</button>
                                     )}
                                </div>
                                <div className="bg-white p-8 rounded-[2.5rem] border border-black/5 flex items-center justify-between shadow-sm">
                                     <div className="flex flex-col">
                                         <p className="text-[8px] font-black text-slate-500 uppercase mb-4">GOOGLE / YOUTUBE</p>
                                         <p className="text-sm font-bold text-[#1A1A1A]">{user?.google?.email || 'Not Connected'}</p>
                                     </div>
                                     {user?.google?.email ? (
                                         <button onClick={() => unlinkGoogle(user.google!.subject)} className="px-6 py-2 bg-red-50/10 text-red-600 border border-red-600/20 rounded-xl text-[8px] font-black uppercase hover:bg-red-600 hover:text-white transition-all">DISCONNECT</button>
                                     ) : (
                                         <button onClick={linkGoogle} className="px-6 py-2 bg-cyan-600 text-white rounded-xl text-[8px] font-black uppercase hover:bg-black transition-all">CONNECT</button>
                                     )}
                                </div>
                                 <div className="bg-red-50 p-8 rounded-[2.5rem] border border-red-100 mt-8 flex flex-col gap-4 shadow-inner">
                                     <p className="text-[8px] font-black text-red-600 uppercase tracking-widest">Wallet Management</p>
                                     <button 
                                         onClick={() => { logout(); setIsSettingsOpen(false); }} 
                                         className="w-full py-4 bg-red-600 text-white rounded-2xl font-black text-[10px] uppercase hover:bg-black transition-all shadow-xl shadow-red-500/10"
                                     >
                                         DISCONNECT WALLET & LOGOUT
                                     </button>
                                 </div>

                                 {userBets.length > 0 && (
                                     <div className="mt-12 space-y-6">
                                         <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-4">My Active Bets</p>
                                         <div className="space-y-4">
                                             {userBets.map((bet, i) => (
                                                 <div key={i} className="bg-white border border-black/5 p-6 rounded-[2rem] flex justify-between items-center shadow-sm">
                                                     <div className="flex flex-col">
                                                         <span className="text-[10px] font-black text-cyan-600 uppercase">{bet.title}</span>
                                                         <span className="text-[8px] text-slate-400">{new Date(bet.timestamp).toLocaleDateString()}</span>
                                                     </div>
                                                     <span className={`text-[10px] font-black px-4 py-2 rounded-xl ${bet.side === 'YES' ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'}`}>
                                                         {bet.side} • {bet.amount.toFixed(2)} SOL
                                                     </span>
                                                 </div>
                                             ))}
                                         </div>
                                     </div>
                                 )}
                            </div>
                        ) : (
                            <div className="space-y-6">
                                 <div className="bg-white border border-black/5 p-10 rounded-[3rem] text-center shadow-xl relative overflow-hidden">
                                     <div className="absolute top-0 right-0 w-32 h-32 bg-cyan-600/5 blur-[60px]"></div>
                                     <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] mb-4">TOTAL EARNINGS</p>
                                     <h3 className="text-5xl font-black italic text-[#1A1A1A] mb-2">{claimedRewards.includes(1) ? '5.70' : '4.35'} <span className="text-cyan-600">SOL</span></h3>
                                 </div>
                                 {!claimedRewards.includes(1) ? (
                                     <div className="bg-white border border-black/5 p-8 rounded-[2.5rem] flex items-center justify-between shadow-sm"><div className="flex flex-col"><span className="text-[8px] font-black text-cyan-600">100 Pushups Task</span><span className="text-lg font-bold italic text-[#1A1A1A]">1.35 SOL</span></div><button onClick={() => handleClaimReward(1, 1.35, "100 Pushups Task")} className="bg-cyan-600 text-white px-8 py-3 rounded-2xl text-[9px] font-black uppercase hover:bg-black transition-all shadow-xl">CLAIM</button></div>
                                 ) : (
                                     <div className="bg-green-50 border border-green-100 p-8 rounded-[2.5rem] flex items-center justify-between opacity-70"><div className="flex flex-col"><span className="text-[8px] font-black text-green-600">100 Pushups Task</span><span className="text-lg font-bold italic text-[#1A1A1A]">1.35 SOL</span></div><span className="text-[9px] font-black text-green-600 uppercase italic">CLAIMED ✅</span></div>
                                 )}
                                 <div className="bg-slate-50 border border-black/5 p-8 rounded-[2.5rem] flex items-center justify-between opacity-50"><div className="flex flex-col"><span className="text-[8px] font-black text-slate-400">Blink Tool Dev</span><span className="text-lg font-bold italic text-slate-400">2.50 SOL</span></div><span className="text-[9px] font-black text-slate-400 uppercase italic">PENDING ⏳</span></div>
                            </div>
                        )}
                    </div>
                    <button onClick={() => setIsSettingsOpen(false)} className="mt-12 w-full py-4 bg-black/5 rounded-2xl font-black text-[9px] uppercase hover:bg-black hover:text-white transition-all text-slate-500">✕ CLOSE</button>
                </div>
            </div>
        )}
        <div className="fixed bottom-8 right-8 z-[10000] flex flex-col gap-4 pointer-events-none">
            {notifications.map((n) => (
                <div key={n.id} className="pointer-events-auto animate-in slide-in-from-right-10 fade-in duration-500">
                    <div className={`min-w-[350px] bg-white/70 backdrop-blur-3xl border p-8 rounded-[2.5rem] shadow-xl flex flex-col gap-4 ${n.type === 'WARN' ? 'border-red-500/30' : 'border-cyan-500/20'}`}>
                        <p className={`text-[11px] font-black uppercase leading-tight ${n.type === 'WARN' ? 'text-red-600' : 'text-cyan-700'}`}>{n.message}</p>
                        {n.tx && <a href={`https://solscan.io/tx/${n.tx}`} target="_blank" className="text-[9px] font-mono text-cyan-700 truncate bg-slate-100 p-3 rounded-xl border border-black/5 transition-all hover:bg-cyan-50">TX: {n.tx}</a>}
                    </div>
                </div>
            ))}
        </div>
    </div>
  );
}
