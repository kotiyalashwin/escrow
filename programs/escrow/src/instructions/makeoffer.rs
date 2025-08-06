//struct for context
//implementation with function
use anchor_lang::prelude::*;
use anchor_spl::{associated_token::AssociatedToken, token_interface::{Mint, TokenAccount, TokenInterface}};

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



