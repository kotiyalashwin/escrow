import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import {Keypair, LAMPORTS_PER_SOL, PublicKey, SystemProgram, Transaction} from '@solana/web3.js';
import { Escrow } from "../target/types/escrow";
import {randomBytes} from 'crypto'; 
import {getAssociatedTokenAddressSync, MINT_SIZE, getMinimumBalanceForRentExemptMint, TOKEN_2022_PROGRAM_ID, MintCloseAuthorityLayout, createInitializeMint2Instruction, tokenMetadataRemoveKey, createAssociatedTokenAccountIdempotent, createAssociatedTokenAccountIdempotentInstruction, createMintToInstruction, getAccount} from "@solana/spl-token";
import { expect } from "chai";
import { isArrayBufferView } from "util/types";

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
  const makerAtaA =  getAssociatedTokenAddressSync(tokenA.publicKey,maker.publicKey,false,tokenProgram);
  const makerAtaB = getAssociatedTokenAddressSync(tokenB.publicKey , maker.publicKey , false , tokenProgram)
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
    let createMintAccountAInstruction = SystemProgram.createAccount({
       fromPubkey : provider.publicKey,
       newAccountPubkey: tokenA.publicKey,
       lamports,
       programId : tokenProgram,
       space : MINT_SIZE
    })

    let createMintAccountBInstruction =  SystemProgram.createAccount({
        fromPubkey : provider.publicKey,
       newAccountPubkey: tokenB.publicKey,
       lamports,
       programId : tokenProgram,
       space : MINT_SIZE
    })
  
    //3) InitializeMint
    let initializeMintAInstruction = createInitializeMint2Instruction(
      tokenA.publicKey,
      6,
      maker.publicKey,
      null,
      tokenProgram,
    )

    let initializeMintBInstruction = createInitializeMint2Instruction(
      tokenB.publicKey,
      6,
      maker.publicKey,
      null,
      tokenProgram,
    )

  

    //4) creating associated token account
    let createAtaAInstruction = createAssociatedTokenAccountIdempotentInstruction(
      provider.publicKey,
      makerAtaA,
      maker.publicKey,
      tokenA.publicKey,
      tokenProgram
    )

    let createAtaBInstruction = createAssociatedTokenAccountIdempotentInstruction(
      provider.publicKey,
      makerAtaB,
      maker.publicKey,
      tokenB.publicKey,
      tokenProgram
    )
    

    //5) mint tokens to the associated token account for the token A
    let mintToAInstructions = createMintToInstruction(
      tokenA.publicKey,
      makerAtaA,
      maker.publicKey,
      1e9,
      undefined,
      tokenProgram
    )

    let mintToBInstructions = createMintToInstruction(
      tokenB.publicKey,
      makerAtaB,
      maker.publicKey,
      1e9,
      undefined,
      tokenProgram
    )
    let tx = new Transaction();

    tx.instructions=[airdropSolInstruction,createMintAccountAInstruction,
      createMintAccountBInstruction,initializeMintAInstruction,
      initializeMintBInstruction,
      createAtaAInstruction,
      createAtaBInstruction,
      mintToAInstructions,
      mintToBInstructions]

    await provider.sendAndConfirm(tx, [tokenA,maker,tokenB]).then((signature)=>{
      console.log('Transactions done');
    })
  })

  it("Adds offer to the vault from A" , async()=>{
    await program.methods.make(
      //ARGUMENTS
      seed,
      //less than what we minted
      new anchor.BN(10),
      new anchor.BN(10),
      
      
    ).accounts(
      {
    maker: maker.publicKey,
    tokenA : tokenA.publicKey,
    tokenB: tokenB.publicKey,
    tokenProgram,
  }).signers([maker]).rpc()

    const escrowAccount = await program.account.escrow.fetch(escrow)
    const vaultAccount = await getAccount(connection,vault,null,tokenProgram);
    expect(escrowAccount.receive.toNumber()).to.equal(10);
    expect(vaultAccount.amount.toString()).to.equal("10");
  })

});
