#![cfg(test)]

use super::*;
use contract::{Launchpad, LaunchpadClient, VestingParams};
use soroban_sdk::{testutils::{Address as _, Ledger as _}, Address, Env, String};
use soroban_token_contract::TokenClient;

// Import the compiled token contract WASM for deployment in tests.
mod token_wasm {
    soroban_sdk::contractimport!(
        file = "../../target/wasm32v1-none/release/soroban_token_contract.wasm"
    );
}

// Import the compiled vesting contract WASM for deployment in tests.
mod vesting_wasm {
    soroban_sdk::contractimport!(
        file = "../../target/wasm32v1-none/release/soroban_vesting_contract.wasm"
    );
}

/// Helper: deploy launchpad and register the token and vesting WASMs for deployment.
fn setup_launchpad<'a>(e: &Env, admin: &Address) -> LaunchpadClient<'a> {
    let token_wasm_hash = e.deployer().upload_contract_wasm(token_wasm::WASM);
    let vesting_wasm_hash = e.deployer().upload_contract_wasm(vesting_wasm::WASM);
    let launchpad = LaunchpadClient::new(e, &e.register(Launchpad, ()));
    launchpad.initialize(admin, &token_wasm_hash, &vesting_wasm_hash, &0i128);
    launchpad
}

#[test]
fn test_initialize() {
    let e = Env::default();
    e.mock_all_auths();
    let admin = Address::generate(&e);
    let launchpad = setup_launchpad(&e, &admin);

    assert_eq!(launchpad.admin(), admin);
    assert_eq!(launchpad.token_count(), 0);
    assert_eq!(launchpad.launch_fee(), 0);
}

#[test]
fn test_launch_token_inter_contract() {
    let e = Env::default();
    e.mock_all_auths();
    let admin = Address::generate(&e);
    let creator = Address::generate(&e);
    let launchpad = setup_launchpad(&e, &admin);

    let token_addr = launchpad.launch_token(
        &creator,
        &String::from_str(&e, "My Token"),
        &String::from_str(&e, "MTK"),
        &7u32,
        &1_000_000_0000000i128,
        &None,
    );

    assert_eq!(launchpad.token_count(), 1);

    // Verify the token was correctly initialized via inter-contract calls
    let token = TokenClient::new(&e, &token_addr);
    assert_eq!(token.name(), String::from_str(&e, "My Token"));
    assert_eq!(token.symbol(), String::from_str(&e, "MTK"));
    assert_eq!(token.decimals(), 7);
    assert_eq!(token.total_supply(), 1_000_000_0000000i128);
    assert_eq!(token.balance(&creator), 1_000_000_0000000i128);
    // Creator should own the token admin role after launch
    assert_eq!(token.admin(), creator);
}

#[test]
fn test_get_token_info() {
    let e = Env::default();
    e.mock_all_auths();
    let admin = Address::generate(&e);
    let creator = Address::generate(&e);
    let launchpad = setup_launchpad(&e, &admin);

    launchpad.launch_token(
        &creator,
        &String::from_str(&e, "Alpha Token"),
        &String::from_str(&e, "ALPHA"),
        &6u32,
        &500_000_000000i128,
        &None,
    );

    let info = launchpad.get_token(&0u32);
    assert_eq!(info.name, String::from_str(&e, "Alpha Token"));
    assert_eq!(info.symbol, String::from_str(&e, "ALPHA"));
    assert_eq!(info.decimals, 6);
    assert_eq!(info.initial_supply, 500_000_000000i128);
    assert_eq!(info.creator, creator);
    assert!(info.vesting_address.is_none());
}

#[test]
fn test_multiple_launches_and_pagination() {
    let e = Env::default();
    e.mock_all_auths();
    let admin = Address::generate(&e);
    let creator = Address::generate(&e);
    let launchpad = setup_launchpad(&e, &admin);

    for (name, sym) in [
        ("Token0", "TK0"),
        ("Token1", "TK1"),
        ("Token2", "TK2"),
        ("Token3", "TK3"),
        ("Token4", "TK4"),
    ] {
        launchpad.launch_token(
            &creator,
            &String::from_str(&e, name),
            &String::from_str(&e, sym),
            &7u32,
            &1000_0000000i128,
            &None,
        );
    }

    assert_eq!(launchpad.token_count(), 5);

    let page1 = launchpad.get_tokens(&0u32, &3u32);
    assert_eq!(page1.len(), 3);

    let page2 = launchpad.get_tokens(&3u32, &3u32);
    assert_eq!(page2.len(), 2);
}

#[test]
fn test_get_creator_tokens() {
    let e = Env::default();
    e.mock_all_auths();
    let admin = Address::generate(&e);
    let alice = Address::generate(&e);
    let bob = Address::generate(&e);
    let launchpad = setup_launchpad(&e, &admin);

    launchpad.launch_token(
        &alice,
        &String::from_str(&e, "Alice Token"),
        &String::from_str(&e, "ALT"),
        &7u32,
        &100_0000000i128,
        &None,
    );
    launchpad.launch_token(
        &bob,
        &String::from_str(&e, "Bob Token"),
        &String::from_str(&e, "BOT"),
        &7u32,
        &200_0000000i128,
        &None,
    );
    launchpad.launch_token(
        &alice,
        &String::from_str(&e, "Alice Token 2"),
        &String::from_str(&e, "AL2"),
        &7u32,
        &300_0000000i128,
        &None,
    );

    let alice_tokens = launchpad.get_creator_tokens(&alice);
    assert_eq!(alice_tokens.len(), 2);

    let bob_tokens = launchpad.get_creator_tokens(&bob);
    assert_eq!(bob_tokens.len(), 1);
}

#[test]
fn test_set_launch_fee() {
    let e = Env::default();
    e.mock_all_auths();
    let admin = Address::generate(&e);
    let launchpad = setup_launchpad(&e, &admin);

    launchpad.set_launch_fee(&100_0000000i128);
    assert_eq!(launchpad.launch_fee(), 100_0000000i128);
}

#[test]
#[should_panic(expected = "already initialized")]
fn test_double_initialize_panics() {
    let e = Env::default();
    e.mock_all_auths();
    let admin = Address::generate(&e);
    let launchpad = setup_launchpad(&e, &admin);
    let token_wasm_hash = e.deployer().upload_contract_wasm(token_wasm::WASM);
    let vesting_wasm_hash = e.deployer().upload_contract_wasm(vesting_wasm::WASM);
    launchpad.initialize(&admin, &token_wasm_hash, &vesting_wasm_hash, &0i128);
}

#[test]
fn test_launch_token_with_vesting() {
    let e = Env::default();
    e.mock_all_auths();
    let admin = Address::generate(&e);
    let creator = Address::generate(&e);
    let beneficiary = Address::generate(&e);
    let launchpad = setup_launchpad(&e, &admin);

    let vesting_params = VestingParams {
        beneficiary: beneficiary.clone(),
        amount: 200_000_0000000i128,
        start: 1000u64,
        cliff: 100u64,
        duration: 1000u64,
    };

    let token_addr = launchpad.launch_token(
        &creator,
        &String::from_str(&e, "Vested Token"),
        &String::from_str(&e, "VTK"),
        &7u32,
        &1_000_000_0000000i128,
        &Some(vesting_params),
    );

    let info = launchpad.get_token(&0u32);
    assert!(info.vesting_address.is_some());
    let vesting_addr = info.vesting_address.unwrap();

    let token = TokenClient::new(&e, &token_addr);
    // Creator gets remainder: 1,000,000 - 200 = 800,000
    assert_eq!(token.balance(&creator), 800_000_0000000i128);
    // Vesting contract gets 200,000
    assert_eq!(token.balance(&vesting_addr), 200_000_0000000i128);

    // Verify vesting parameters and state
    let vesting_client = vesting_wasm::Client::new(&e, &vesting_addr);
    assert_eq!(vesting_client.beneficiary(), beneficiary);
    assert_eq!(vesting_client.total_amount(), 200_000_0000000i128);
    assert_eq!(vesting_client.released(), 0);

    // Advance timestamp to start + cliff
    e.ledger().set_timestamp(1100u64);
    assert_eq!(vesting_client.claimable_amount(), 20_000_0000000i128); // 200,000 * 100 / 1000 = 20,000

    vesting_client.claim();
    assert_eq!(token.balance(&beneficiary), 20_000_0000000i128);
    assert_eq!(vesting_client.released(), 20_000_0000000i128);
}

