use soroban_sdk::{contracttype, Address, String};

pub(crate) const DAY_IN_LEDGERS: u32 = 17280;
pub(crate) const INSTANCE_BUMP_AMOUNT: u32 = 30 * DAY_IN_LEDGERS;
pub(crate) const INSTANCE_LIFETIME_THRESHOLD: u32 = INSTANCE_BUMP_AMOUNT - DAY_IN_LEDGERS;

/// Metadata stored for each launched token.
#[derive(Clone)]
#[contracttype]
pub struct TokenInfo {
    pub address: Address,
    pub name: String,
    pub symbol: String,
    pub decimals: u32,
    pub initial_supply: i128,
    pub creator: Address,
    pub created_at: u64,
    pub vesting_address: Option<Address>,
}

#[derive(Clone)]
#[contracttype]
pub enum DataKey {
    /// Admin of the launchpad
    Admin,
    /// Total number of tokens launched
    TokenCount,
    /// TokenInfo by index
    TokenByIndex(u32),
    /// List of token indices created by an address
    CreatorTokens(Address),
    /// Token contract WASM hash used for deployment
    TokenWasmHash,
    /// Vesting contract WASM hash used for deployment
    VestingWasmHash,
    /// Launch fee in stroops
    LaunchFee,
}
