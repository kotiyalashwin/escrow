use anchor_lang::prelude::*;


//tokenA address
//tokenB address
//maker (the one who offered this)
//amount

#[account]
#[derive(InitSpace)]
pub struct Escrow{
    pub seed : u64,
    pub bump :u8,
    pub token_a_add : Pubkey,
    pub token_b_add : Pubkey,
    pub maker_add : Pubkey,
    //how much token_b  they want to recieve 
    pub receive : u64
}