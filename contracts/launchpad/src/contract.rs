use soroban_sdk::{
    contract, contractimpl, Address, BytesN, Env, String, Vec,
};

use crate::event;
use crate::storage_types::{
    DataKey, TokenInfo, INSTANCE_BUMP_AMOUNT, INSTANCE_LIFETIME_THRESHOLD,
};

// Token client interface — used for inter-contract calls after deployment.
// We import the interface from the compiled WASM so we don't link the full
// token crate into the launchpad binary (avoids LTO bitcode conflicts).
mod token {
    soroban_sdk::contractimport!(
        file = "../../target/wasm32v1-none/release/soroban_token_contract.wasm"
    );
}

mod vesting {
    soroban_sdk::contractimport!(
        file = "../../target/wasm32v1-none/release/soroban_vesting_contract.wasm"
    );
}

use soroban_sdk::contracttype;

#[contracttype]
#[derive(Clone)]
pub struct VestingParams {
    pub beneficiary: Address,
    pub amount: i128,
    pub start: u64,
    pub cliff: u64,
    pub duration: u64,
}

pub trait LaunchpadTrait {
    /// Initialize the launchpad with an admin and the token & vesting WASM hashes.
    fn initialize(
        e: Env,
        admin: Address,
        token_wasm_hash: BytesN<32>,
        vesting_wasm_hash: BytesN<32>,
        launch_fee: i128,
    );

    /// Deploy a new token contract and initialize it via inter-contract calls.
    /// Returns the address of the newly deployed token.
    fn launch_token(
        e: Env,
        creator: Address,
        name: String,
        symbol: String,
        decimals: u32,
        initial_supply: i128,
        vesting_params: Option<VestingParams>,
    ) -> Address;

    /// Get info for a specific token by its index.
    fn get_token(e: Env, index: u32) -> TokenInfo;

    /// Get total number of launched tokens.
    fn token_count(e: Env) -> u32;

    /// Get all tokens launched by a specific creator.
    fn get_creator_tokens(e: Env, creator: Address) -> Vec<TokenInfo>;

    /// Get all tokens (paginated).
    fn get_tokens(e: Env, start: u32, limit: u32) -> Vec<TokenInfo>;

    /// Update the launch fee (admin only).
    fn set_launch_fee(e: Env, new_fee: i128);

    /// Get the current launch fee.
    fn launch_fee(e: Env) -> i128;

    /// Get the launchpad admin.
    fn admin(e: Env) -> Address;
}

#[contract]
pub struct Launchpad;

#[contractimpl]
impl LaunchpadTrait for Launchpad {
    fn initialize(
        e: Env,
        admin: Address,
        token_wasm_hash: BytesN<32>,
        vesting_wasm_hash: BytesN<32>,
        launch_fee: i128,
    ) {
        if e.storage().instance().has(&DataKey::Admin) {
            panic!("already initialized");
        }
        e.storage().instance().set(&DataKey::Admin, &admin);
        e.storage()
            .instance()
            .set(&DataKey::TokenWasmHash, &token_wasm_hash);
        e.storage()
            .instance()
            .set(&DataKey::VestingWasmHash, &vesting_wasm_hash);
        e.storage()
            .instance()
            .set(&DataKey::LaunchFee, &launch_fee);
        e.storage().instance().set(&DataKey::TokenCount, &0u32);
    }

    fn launch_token(
        e: Env,
        creator: Address,
        name: String,
        symbol: String,
        decimals: u32,
        initial_supply: i128,
        vesting_params: Option<VestingParams>,
    ) -> Address {
        creator.require_auth();

        e.storage()
            .instance()
            .extend_ttl(INSTANCE_LIFETIME_THRESHOLD, INSTANCE_BUMP_AMOUNT);

        let wasm_hash: BytesN<32> = e
            .storage()
            .instance()
            .get(&DataKey::TokenWasmHash)
            .unwrap();

        let count: u32 = e
            .storage()
            .instance()
            .get(&DataKey::TokenCount)
            .unwrap_or(0);

        // Deterministic salt derived from the deployment count
        let mut salt_bytes = [0u8; 32];
        salt_bytes[0] = (count & 0xFF) as u8;
        salt_bytes[1] = ((count >> 8) & 0xFF) as u8;
        salt_bytes[2] = ((count >> 16) & 0xFF) as u8;
        salt_bytes[3] = ((count >> 24) & 0xFF) as u8;
        let salt = soroban_sdk::BytesN::from_array(&e, &salt_bytes);

        // Deploy a fresh token contract instance
        let token_address = e
            .deployer()
            .with_current_contract(salt)
            .deploy_v2(wasm_hash, ());

        // Inter-contract call #1: initialize the token
        let token_client = token::Client::new(&e, &token_address);
        token_client.initialize(
            &e.current_contract_address(),
            &decimals,
            &name,
            &symbol,
        );

        let mut vesting_address: Option<Address> = None;

        if let Some(v_params) = vesting_params {
            if v_params.amount > initial_supply {
                panic!("vesting amount cannot exceed initial supply");
            }

            let vesting_wasm_hash: BytesN<32> = e
                .storage()
                .instance()
                .get(&DataKey::VestingWasmHash)
                .expect("vesting wasm hash not set");

            let mut vesting_salt_bytes = [0u8; 32];
            vesting_salt_bytes[0] = (count & 0xFF) as u8;
            vesting_salt_bytes[1] = ((count >> 8) & 0xFF) as u8;
            vesting_salt_bytes[2] = ((count >> 16) & 0xFF) as u8;
            vesting_salt_bytes[3] = ((count >> 24) & 0xFF) as u8;
            vesting_salt_bytes[4] = 1;
            let vesting_salt = soroban_sdk::BytesN::from_array(&e, &vesting_salt_bytes);

            let v_addr = e
                .deployer()
                .with_current_contract(vesting_salt)
                .deploy_v2(vesting_wasm_hash, ());

            let vesting_client = vesting::Client::new(&e, &v_addr);
            vesting_client.initialize(
                &token_address,
                &v_params.beneficiary,
                &v_params.start,
                &v_params.cliff,
                &v_params.duration,
                &v_params.amount,
            );

            // Inter-contract call #2: mint vested portion to vesting contract and remainder to creator
            if v_params.amount > 0 {
                token_client.mint(&v_addr, &v_params.amount);
            }
            let remainder = initial_supply - v_params.amount;
            if remainder > 0 {
                token_client.mint(&creator, &remainder);
            }

            vesting_address = Some(v_addr);
        } else {
            // Mint full supply to creator
            if initial_supply > 0 {
                token_client.mint(&creator, &initial_supply);
            }
        }

        // Inter-contract call #3: transfer admin rights to creator
        token_client.set_admin(&creator);

        // Persist token metadata
        let token_info = TokenInfo {
            address: token_address.clone(),
            name,
            symbol,
            decimals,
            initial_supply,
            creator: creator.clone(),
            created_at: e.ledger().timestamp(),
            vesting_address,
        };

        e.storage()
            .instance()
            .set(&DataKey::TokenByIndex(count), &token_info);

        // Update creator index
        let mut creator_tokens: Vec<u32> = e
            .storage()
            .instance()
            .get(&DataKey::CreatorTokens(creator.clone()))
            .unwrap_or(Vec::new(&e));
        creator_tokens.push_back(count);
        e.storage()
            .instance()
            .set(&DataKey::CreatorTokens(creator.clone()), &creator_tokens);

        e.storage()
            .instance()
            .set(&DataKey::TokenCount, &(count + 1));

        event::token_launched(&e, creator, token_address.clone(), count);

        token_address
    }

    fn get_token(e: Env, index: u32) -> TokenInfo {
        e.storage()
            .instance()
            .extend_ttl(INSTANCE_LIFETIME_THRESHOLD, INSTANCE_BUMP_AMOUNT);
        e.storage()
            .instance()
            .get(&DataKey::TokenByIndex(index))
            .unwrap_or_else(|| panic!("token not found"))
    }

    fn token_count(e: Env) -> u32 {
        e.storage()
            .instance()
            .extend_ttl(INSTANCE_LIFETIME_THRESHOLD, INSTANCE_BUMP_AMOUNT);
        e.storage()
            .instance()
            .get(&DataKey::TokenCount)
            .unwrap_or(0)
    }

    fn get_creator_tokens(e: Env, creator: Address) -> Vec<TokenInfo> {
        e.storage()
            .instance()
            .extend_ttl(INSTANCE_LIFETIME_THRESHOLD, INSTANCE_BUMP_AMOUNT);
        let indices: Vec<u32> = e
            .storage()
            .instance()
            .get(&DataKey::CreatorTokens(creator))
            .unwrap_or(Vec::new(&e));

        let mut result = Vec::new(&e);
        for i in 0..indices.len() {
            let idx = indices.get(i).unwrap();
            if let Some(info) = e
                .storage()
                .instance()
                .get::<DataKey, TokenInfo>(&DataKey::TokenByIndex(idx))
            {
                result.push_back(info);
            }
        }
        result
    }

    fn get_tokens(e: Env, start: u32, limit: u32) -> Vec<TokenInfo> {
        e.storage()
            .instance()
            .extend_ttl(INSTANCE_LIFETIME_THRESHOLD, INSTANCE_BUMP_AMOUNT);
        let count: u32 = e
            .storage()
            .instance()
            .get(&DataKey::TokenCount)
            .unwrap_or(0);

        let mut result = Vec::new(&e);
        let end = (start + limit).min(count);
        for i in start..end {
            if let Some(info) = e
                .storage()
                .instance()
                .get::<DataKey, TokenInfo>(&DataKey::TokenByIndex(i))
            {
                result.push_back(info);
            }
        }
        result
    }

    fn set_launch_fee(e: Env, new_fee: i128) {
        let admin: Address = e.storage().instance().get(&DataKey::Admin).unwrap();
        admin.require_auth();
        e.storage()
            .instance()
            .extend_ttl(INSTANCE_LIFETIME_THRESHOLD, INSTANCE_BUMP_AMOUNT);
        e.storage().instance().set(&DataKey::LaunchFee, &new_fee);
        event::fee_updated(&e, admin, new_fee);
    }

    fn launch_fee(e: Env) -> i128 {
        e.storage()
            .instance()
            .get(&DataKey::LaunchFee)
            .unwrap_or(0)
    }

    fn admin(e: Env) -> Address {
        e.storage().instance().get(&DataKey::Admin).unwrap()
    }
}
