#![no_std]
use soroban_sdk::{contract, contractimpl, contracttype, symbol_short, Address, Env};

#[contracttype]
#[derive(Clone)]
pub enum DataKey {
    Token,
    Beneficiary,
    Start,
    Cliff,
    Duration,
    TotalAmount,
    Released,
    Initialized,
}

#[contract]
pub struct VestingContract;

#[contractimpl]
impl VestingContract {
    pub fn initialize(
        e: Env,
        token: Address,
        beneficiary: Address,
        start: u64,
        cliff: u64,
        duration: u64,
        total_amount: i128,
    ) {
        if e.storage().instance().has(&DataKey::Initialized) {
            panic!("already initialized");
        }
        e.storage().instance().set(&DataKey::Token, &token);
        e.storage().instance().set(&DataKey::Beneficiary, &beneficiary);
        e.storage().instance().set(&DataKey::Start, &start);
        e.storage().instance().set(&DataKey::Cliff, &cliff);
        e.storage().instance().set(&DataKey::Duration, &duration);
        e.storage().instance().set(&DataKey::TotalAmount, &total_amount);
        e.storage().instance().set(&DataKey::Released, &0i128);
        e.storage().instance().set(&DataKey::Initialized, &true);
    }

    pub fn token(e: Env) -> Address {
        e.storage().instance().get(&DataKey::Token).unwrap()
    }

    pub fn beneficiary(e: Env) -> Address {
        e.storage().instance().get(&DataKey::Beneficiary).unwrap()
    }

    pub fn start(e: Env) -> u64 {
        e.storage().instance().get(&DataKey::Start).unwrap()
    }

    pub fn cliff(e: Env) -> u64 {
        e.storage().instance().get(&DataKey::Cliff).unwrap()
    }

    pub fn duration(e: Env) -> u64 {
        e.storage().instance().get(&DataKey::Duration).unwrap()
    }

    pub fn total_amount(e: Env) -> i128 {
        e.storage().instance().get(&DataKey::TotalAmount).unwrap()
    }

    pub fn released(e: Env) -> i128 {
        e.storage().instance().get(&DataKey::Released).unwrap_or(0)
    }

    pub fn claimable_amount(e: Env) -> i128 {
        let released = Self::released(e.clone());
        let vested = Self::vested_amount(e.clone());
        vested - released
    }

    pub fn vested_amount(e: Env) -> i128 {
        let start = Self::start(e.clone());
        let cliff = Self::cliff(e.clone());
        let duration = Self::duration(e.clone());
        let total = Self::total_amount(e.clone());
        let now = e.ledger().timestamp();

        if now < start + cliff {
            return 0;
        }

        if now >= start + duration {
            return total;
        }

        if duration == 0 {
            return total;
        }

        // Linear vesting: total * (now - start) / duration
        let elapsed = now - start;
        total * (elapsed as i128) / (duration as i128)
    }

    pub fn claim(e: Env) -> i128 {
        let beneficiary: Address = e.storage().instance().get(&DataKey::Beneficiary).unwrap();
        beneficiary.require_auth();

        let claimable = Self::claimable_amount(e.clone());
        if claimable <= 0 {
            panic!("no tokens to claim");
        }

        let released = Self::released(e.clone());
        e.storage().instance().set(&DataKey::Released, &(released + claimable));

        let token_addr: Address = e.storage().instance().get(&DataKey::Token).unwrap();
        let client = token::Client::new(&e, &token_addr);
        client.transfer(&e.current_contract_address(), &beneficiary, &claimable);

        e.events().publish(
            (symbol_short!("claim"), beneficiary),
            claimable,
        );

        claimable
    }
}

mod token {
    soroban_sdk::contractimport!(
        file = "../../target/wasm32v1-none/release/soroban_token_contract.wasm"
    );
}

mod test;

