
pub mod instructions;
pub mod state;

use anchor_lang::prelude::*;
pub use instructions::*;

declare_id!("GuPikW5SnEVqmKxEkYcXyrFoGk6pP4nyYCE7ivZWW77j");

#[program]
pub mod escrow {
    use super::*;

   pub fn make(ctx:Context<MakeOffer>, seed:u64,deposit:u64, receive:u64)->Result<()>{
        ctx.accounts.fund_vault(deposit)?;
        ctx.accounts.save_escrow(receive, seed, &ctx.bumps)
   }
}
