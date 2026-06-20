#![cfg(test)]

use super::*;
use soroban_sdk::{testutils::{Address as _, Ledger}, Address, Env};

mod token_wasm {
    soroban_sdk::contractimport!(
        file = "../../target/wasm32v1-none/release/soroban_token_contract.wasm"
    );
}

#[test]
fn test_vesting() {
    let e = Env::default();
    e.mock_all_auths();

    let beneficiary = Address::generate(&e);
    let creator = Address::generate(&e);

    // Register token contract from WASM
    let token_address = e.register_contract_wasm(None, token_wasm::WASM);
    let token_client = token_wasm::Client::new(&e, &token_address);
    
    token_client.initialize(
        &creator,
        &7u32,
        &soroban_sdk::String::from_str(&e, "Test Token"),
        &soroban_sdk::String::from_str(&e, "TST"),
    );

    // Deploy vesting contract
    let vesting_address = e.register(VestingContract, ());
    let vesting_client = VestingContractClient::new(&e, &vesting_address);

    let start = 1000u64;
    let cliff = 100u64;
    let duration = 1000u64;
    let total_amount = 1_000_000i128;

    vesting_client.initialize(
        &token_address,
        &beneficiary,
        &start,
        &cliff,
        &duration,
        &total_amount,
    );

    // Mint tokens to the vesting contract (using token admin role)
    token_client.mint(&vesting_address, &total_amount);

    assert_eq!(token_client.balance(&vesting_address), total_amount);
    assert_eq!(vesting_client.token(), token_address);
    assert_eq!(vesting_client.beneficiary(), beneficiary);
    assert_eq!(vesting_client.start(), start);
    assert_eq!(vesting_client.cliff(), cliff);
    assert_eq!(vesting_client.duration(), duration);
    assert_eq!(vesting_client.total_amount(), total_amount);
    assert_eq!(vesting_client.released(), 0);

    // 1. Before start
    e.ledger().set_timestamp(start - 10);
    assert_eq!(vesting_client.vested_amount(), 0);
    assert_eq!(vesting_client.claimable_amount(), 0);

    // 2. Before cliff
    e.ledger().set_timestamp(start + cliff - 5);
    assert_eq!(vesting_client.vested_amount(), 0);
    assert_eq!(vesting_client.claimable_amount(), 0);

    // 3. At cliff
    e.ledger().set_timestamp(start + cliff);
    // vested = total_amount * cliff / duration = 1,000,000 * 100 / 1000 = 100,000
    assert_eq!(vesting_client.vested_amount(), 100_000);
    assert_eq!(vesting_client.claimable_amount(), 100_000);

    // Claim at cliff
    vesting_client.claim();
    assert_eq!(token_client.balance(&beneficiary), 100_000);
    assert_eq!(vesting_client.released(), 100_000);
    assert_eq!(vesting_client.claimable_amount(), 0);

    // 4. Halfway
    e.ledger().set_timestamp(start + 500);
    // vested = 500,000. released = 100,000. claimable = 400,000
    assert_eq!(vesting_client.vested_amount(), 500_000);
    assert_eq!(vesting_client.claimable_amount(), 400_000);

    vesting_client.claim();
    assert_eq!(token_client.balance(&beneficiary), 500_000);
    assert_eq!(vesting_client.released(), 500_000);
    assert_eq!(vesting_client.claimable_amount(), 0);

    // 5. After duration
    e.ledger().set_timestamp(start + duration + 10);
    assert_eq!(vesting_client.vested_amount(), total_amount);
    assert_eq!(vesting_client.claimable_amount(), 500_000);

    vesting_client.claim();
    assert_eq!(token_client.balance(&beneficiary), total_amount);
    assert_eq!(vesting_client.released(), total_amount);
    assert_eq!(vesting_client.claimable_amount(), 0);
}
