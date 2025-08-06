import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import {Keypair, LAMPORTS_PER_SOL, PublicKey, SystemProgram, Transaction} from '@solana/web3.js';
import { Escrow } from "../target/types/escrow";
import {randomBytes} from 'crypto'; 
import {getAssociatedTokenAddressSync, MINT_SIZE, getMinimumBalanceForRentExemptMint, TOKEN_2022_PROGRAM_ID, MintCloseAuthorityLayout, createInitializeMint2Instruction, tokenMetadataRemoveKey, createAssociatedTokenAccountIdempotent, createAssociatedTokenAccountIdempotentInstruction, createMintToInstruction} from "@solana/spl-token";
import { machine } from "os";
describe("escrow", () => {
  // Configure the client to use the local cluster.
  anchor.setProvider(anchor.AnchorProvider.env());
  const provider = anchor.getProvider();
  const program = anchor.workspace.escrow as Program<Escrow>;
  const connection = provider.connection;
  const tokenProgram = TOKEN_2022_PROGRAM_ID;

  const maker = Keypair.generate();
  const tokenA = Keypair.generate();
  const tokenB = Keypair.generate();
  const makerAtaA = getAssociatedTokenAddressSync(tokenA.publicKey,maker.publicKey,false,tokenProgram);

  //random seed for PDA
  const seed = new anchor.BN(randomBytes(8));

  //escrow PDA 
  const [escrow] = PublicKey.findProgramAddressSync(
    [Buffer.from("escrow"), maker.publicKey.toBuffer(), seed.toArrayLike(Buffer, 'le', 8)],
    program.programId,
  )

  //vault PDA
  const vault = getAssociatedTokenAddressSync(tokenA.publicKey,escrow,true,tokenProgram);

  //1) Create accounts and mint tokens for A 
  it("Mint A tokens to maker ata", async()=>{
    let lamports = await getMinimumBalanceForRentExemptMint(connection);

    //Instructions

    //1) airdrop sols to A
    let airdropSolInstruction = SystemProgram.transfer({
      fromPubkey : provider.publicKey,
      toPubkey: maker.publicKey,
      lamports : 10 * LAMPORTS_PER_SOL
    })

    //2) Create Mint token account
    let createMintAccountInstruction = SystemProgram.createAccount({
       fromPubkey : provider.publicKey,
       newAccountPubkey: tokenA.publicKey,
       lamports,
       programId : tokenProgram,
       space : MINT_SIZE
    })

    //3) InitializeMint
    let initializeMintInstruction = createInitializeMint2Instruction(
      tokenA.publicKey,
      6,
      maker.publicKey,
      null,
      tokenProgram,
    )

    //4) creating associated token account
    let createAtaInstruction = createAssociatedTokenAccountIdempotentInstruction(
      provider.publicKey,
      makerAtaA,
      maker.publicKey,
      tokenA.publicKey,
      tokenProgram
    )

    //5) mint tokens to the associated token account for the token A
    let mintToInstructions = createMintToInstruction(
      tokenA.publicKey,
      makerAtaA,
      maker.publicKey,
      1e9,
      undefined,
      tokenProgram
    )
    let tx = new Transaction();

    tx.instructions=[airdropSolInstruction,createMintAccountInstruction,initializeMintInstruction,createAtaInstruction,mintToInstructions]

    await provider.sendAndConfirm(tx, [tokenA,maker]).then((signature)=>{
      console.log('Transactions done');
    })
  })

});
