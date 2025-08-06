//struct for context
//implementation with function
use anchor_lang::prelude::*;
use anchor_spl::{associated_token::AssociatedToken,  token_interface::{Mint, TokenAccount, TokenInterface,TransferChecked, transfer_checked}};

use crate::state::Escrow;


#[derive(Accounts)]
pub struct MakeOffer<'info>{
    //who is creating the offer
    //the one who signs this txn
    //is mutable coz he will pay for the fees of creating accs
    #[account(mut)]
    pub maker : Signer<'info>,
    
    //token being given -> a
    //validate that this account is a mint account
    //validate that this account belongs to the token program
    #[account(
        mint::token_program = token_program
    )]
    pub token_a :  InterfaceAccount<'info,Mint>,


      //token being asked -> a
    //validate that this account is a mint account
    //validate that this account belongs to the token program
    #[account(
        mint::token_program = token_program
    )]
    pub token_b :  InterfaceAccount<'info,Mint>,

    //providing associated token account for  min_a account of the maker
    //initiating if not
    //must contain only min_a
    //authority must be the maker
    //shoul be under the solana program
    #[account(
        mut, //need changes like deduction 
        associated_token::mint = token_a, //shoule be for token_a
        associated_token::authority = maker, //maker should be author
        associated_token::token_program = token_program //
    )]
    pub maker_ata_a : InterfaceAccount<'info , TokenAccount>,

    //escrow account
    #[account(
        init,  //initiate if does not exist
        payer = maker , //the signer/maker will pau to create this
        space = 8 + Escrow::INIT_SPACE,
        seeds = [b"escrow", maker.key().as_ref(), seed.to_le_bytes().as_ref()],
        bump 
    )]
    pub escrow : Account<'info ,  Escrow>,

    //vault where tokens are stored during transit
    #[account(
        init, //init if it does not exist
        payer = maker , //maker will pay the fees of creating the account
        associated_token::mint = token_a, //for token_a mint
        associated_token::authority = escrow, //escrow hold the authority 
        associated_token::token_program = token_program //under token program                                   

    )]
    pub vault : InterfaceAccount<'info , TokenAccount>,

    //program that we used
    pub associated_token_program : Program<'info, AssociatedToken>,
    pub token_program: Interface<'info,TokenInterface>,
    pub system_program : Program<'info , System>
}


impl <'info> MakeOffer<'info>{
    //save the escrow
    pub fn save_escrow(&mut self, recieve:u64 , seed :u64, bump:&MakeOfferBumps  )-> Result<()>{
        self.escrow.set_inner(Escrow{
            token_a_add : self.token_a.key(),
            token_b_add : self.token_b.key(),
            maker_add : self.maker.key(),
            receive,
            seed,
            bump: bump.escrow
        });
        Ok(())
    }

    //deposit to the vault
    pub fn fund_vault(&mut self , deposit:u64)->Result<()>{
        //create transaction accounts
        let txn_accs = TransferChecked{
            //makers account for that token
            from:self.maker_ata_a.to_account_info(),
            //to the vault address
            to : self.vault.to_account_info(),
            //authority of the deduction account
            authority: self.maker.to_account_info(),
            //mint address which is being deposited
            mint :  self.token_a.to_account_info(),
        };

        //create context of cpi
        let cpi_ctx = CpiContext::new(self.token_program.to_account_info(), txn_accs);

        transfer_checked(cpi_ctx, deposit, self.token_a.decimals)
    }
}


