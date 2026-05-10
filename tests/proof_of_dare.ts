import * as anchor from "@coral-xyz/anchor";
import { PublicKey, SystemProgram, LAMPORTS_PER_SOL } from "@solana/web3.js";
import { expect } from "chai";
import { sha256 } from "@noble/hashes/sha256";

describe("proof_of_dare", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);
  const programId = new PublicKey("4SVC6ey1Akve6Aiz3Z6sUgwfzT7VEWbfMpyjdjqRhzz8");

  const getDisc = (name: string) => Buffer.from(sha256(`global:${name}`)).slice(0, 8);

  it("Tam Döngü Testi: Oluştur -> Kanıt -> Onay (SOL Transferi)", async () => {
    const challenger = provider.wallet.publicKey;
    const challengedKeyPair = anchor.web3.Keypair.generate();
    const challenged = challengedKeyPair.publicKey;
    
    const [darePda] = PublicKey.findProgramAddressSync(
      [Buffer.from("dare"), challenger.toBuffer(), challenged.toBuffer()],
      programId
    );

    // 1. ADIM: OLUŞTUR
    console.log("\n1. ADIM: Meydan okuma oluşturuluyor (0.1 SOL)...");
    const amount = new anchor.BN(0.1 * LAMPORTS_PER_SOL);
    const deadline = new anchor.BN(Math.floor(Date.now() / 1000) + 3600);
    
    const tx1 = new anchor.web3.Transaction().add({
      keys: [
        { pubkey: darePda, isSigner: false, isWritable: true },
        { pubkey: challenger, isSigner: true, isWritable: true },
        { pubkey: challenged, isSigner: false, isWritable: false },
        { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
      ],
      programId: programId,
      data: Buffer.concat([getDisc("create_dare"), amount.toArrayLike(Buffer, "le", 8), deadline.toArrayLike(Buffer, "le", 8)]),
    });
    await provider.sendAndConfirm(tx1);

    // 2. ADIM: KANIT GÖNDER
    console.log("2. ADIM: Kanıt gönderiliyor...");
    const proofUrl = "https://proof.link";
    const pBuf = Buffer.from(proofUrl);
    const pLen = Buffer.alloc(4); pLen.writeUInt32LE(pBuf.length, 0);
    
    const tx2 = new anchor.web3.Transaction().add({
      keys: [
        { pubkey: darePda, isSigner: false, isWritable: true },
        { pubkey: challenged, isSigner: true, isWritable: false },
      ],
      programId: programId,
      data: Buffer.concat([getDisc("submit_proof"), pLen, pBuf]),
    });
    await anchor.web3.sendAndConfirmTransaction(provider.connection, tx2, [provider.wallet.payer, challengedKeyPair]);

    // 3. ADIM: ONAYLA (RESOLVE)
    console.log("3. ADIM: Meydan okuma onaylanıyor (Approved)...");
    const challengedBalanceBefore = await provider.connection.getBalance(challenged);
    
    // DareStatus::Approved = 2 (Enum değeri)
    const resolveData = Buffer.concat([
        getDisc("resolve_dare"),
        Buffer.from([2]) // Enum: Approved
    ]);

    const tx3 = new anchor.web3.Transaction().add({
      keys: [
        { pubkey: darePda, isSigner: false, isWritable: true },
        { pubkey: challenger, isSigner: true, isWritable: true },
        { pubkey: challenged, isSigner: false, isWritable: true }, // SOL buraya gidecek
      ],
      programId: programId,
      data: resolveData,
    });
    await provider.sendAndConfirm(tx3);

    // 4. ADIM: SOL TRANSFERİ KONTROLÜ
    console.log("4. ADIM: SOL transferi kontrol ediliyor...");
    const challengedBalanceAfter = await provider.connection.getBalance(challenged);
    
    console.log("   > Öncesi Bakiye:", challengedBalanceBefore / LAMPORTS_PER_SOL, "SOL");
    console.log("   > Sonrası Bakiye:", challengedBalanceAfter / LAMPORTS_PER_SOL, "SOL");

    expect(challengedBalanceAfter).to.be.greaterThan(challengedBalanceBefore);
    console.log("\n*** TEBRİKLER! TÜM AKIŞ BAŞARIYLA TAMAMLANDI ***");
  });
});
