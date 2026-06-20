# Stellar Token Launchpad

Deploy a real SEP-41 token on Stellar Testnet in under two minutes. No CLI, no config files, no prior blockchain experience needed. Just connect your wallet, fill out a form, and your token is live.

**Live app → [stellar-token-launchpad.vercel.app](https://stellar-token-launchpad.vercel.app)**

![CI](https://github.com/Shrikantshirshe/token_launchpad/actions/workflows/ci.yml/badge.svg)

---

## What this actually is

Most "token launchers" are wrappers around a single contract that stores a mapping of balances. This isn't that.

Every token you launch here gets its own freshly deployed Soroban contract — a full SEP-41 implementation with transfer, approve, burn, mint, and total_supply. The launchpad contract handles the deployment and wires everything up via inter-contract calls, then hands admin rights to you. After that, the launchpad has zero control over your token.

The whole thing — deploy, initialize, mint, transfer admin — happens atomically in one transaction. Either all of it succeeds or none of it does.

---

## Live deployment

| | |
|---|---|
| **Launchpad contract** | [`CCTHMDUWMHDFJYBAWFJAPAM2C6DVUII53LOQYW57JNXL37SH27JUYIXH`](https://stellar.expert/explorer/testnet/contract/CCTHMDUWMHDFJYBAWFJAPAM2C6DVUII53LOQYW57JNXL37SH27JUYIXH) |
| **Deploy transaction** | [`d0e7142d...`](https://stellar.expert/explorer/testnet/tx/d0e7142dc801a09f99d639e1786f2b6bf569e92a0aeb043e157ea5b63c20bcff) |
| **Initialize transaction** | [`916779c9...`](https://stellar.expert/explorer/testnet/tx/916779c9df8aea8f24bfe4df5d775b0faec7131c4c32f8e31301b43824614b0c) |
| **Network** | Stellar Testnet |
| **RPC** | `https://soroban-testnet.stellar.org` |

---

## Architecture

### System overview

```
┌─────────────────────────────────────────────────────────────┐
│                        Browser (dApp)                        │
│                                                              │
│   React + TypeScript + Vite                                  │
│   ┌──────────────┐   ┌──────────────┐   ┌────────────────┐  │
│   │  LaunchForm  │   │   Explorer   │   │  My Tokens     │  │
│   └──────┬───────┘   └──────┬───────┘   └───────┬────────┘  │
│          │                  │                   │            │
│          └──────────────────┼───────────────────┘            │
│                             │                                │
│                    useLaunchpad hook                         │
│                    useWallet hook (Freighter)                │
└─────────────────────────────┬───────────────────────────────┘
                              │  XDR transactions / RPC calls
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    Stellar Testnet (Soroban)                  │
│                                                              │
│   ┌──────────────────────────────────────────────────────┐  │
│   │              Launchpad Contract                       │  │
│   │  CD7EJEMPI3RVAA2XJ4WSP7265QWC5VXOAJW32UJWDYE...     │  │
│   │                                                       │  │
│   │  Storage:                                             │  │
│   │  • Admin address                                      │  │
│   │  • Token WASM hash                                    │  │
│   │  • TokenCount (u32)                                   │  │
│   │  • TokenByIndex(u32) → TokenInfo                      │  │
│   │  • CreatorTokens(Address) → Vec<u32>                  │  │
│   │  • LaunchFee (i128)                                   │  │
│   └──────────────────────┬───────────────────────────────┘  │
│                           │  inter-contract calls            │
│              ┌────────────┼────────────┐                     │
│              ▼            ▼            ▼                     │
│   ┌──────────────┐ ┌──────────────┐ ┌──────────────┐        │
│   │ Token #0     │ │ Token #1     │ │ Token #N     │        │
│   │ (SEP-41)     │ │ (SEP-41)     │ │ (SEP-41)     │        │
│   └──────────────┘ └──────────────┘ └──────────────┘        │
└─────────────────────────────────────────────────────────────┘
```

### Two-contract design

The system is split into two Soroban contracts that are compiled and deployed separately.

**Launchpad contract** (`contracts/launchpad/`)

The orchestrator. It holds the token WASM hash and uses `e.deployer().with_current_contract(salt).deploy_v2(wasm_hash, ())` to spin up a fresh token contract for every launch. It maintains a full on-chain registry of every token ever deployed — indexed by count and by creator address. The admin can update the launch fee; everything else is permissionless.

**Token contract** (`contracts/token/`)

A standalone SEP-41 implementation. Each launched token is its own independent contract instance — it has no reference back to the launchpad after deployment. The token contract implements the full interface: `transfer`, `transfer_from`, `approve`, `burn`, `burn_from`, `mint`, `balance`, `total_supply`, `decimals`, `name`, `symbol`, `set_admin`.

### Inter-contract call sequence

When `launch_token` is called, the launchpad executes three inter-contract calls in sequence within the same transaction:

```
User wallet
    │
    │  launch_token(creator, name, symbol, decimals, supply)
    ▼
Launchpad Contract
    │
    ├─ 1. e.deployer().deploy_v2(token_wasm_hash, ())
    │      → deploys fresh Token contract at deterministic address
    │        salt = [count_byte_0, count_byte_1, count_byte_2, count_byte_3, 0, 0, ...]
    │
    ├─ 2. Token.initialize(launchpad_addr, decimals, name, symbol)
    │      → sets admin = launchpad (temporarily), writes metadata
    │
    ├─ 3. Token.mint(creator, initial_supply)
    │      → mints full supply to creator's wallet
    │
    ├─ 4. Token.set_admin(creator)
    │      → transfers admin rights to creator permanently
    │        launchpad loses all control over the token
    │
    └─ 5. Persist TokenInfo in registry
           update CreatorTokens index
           emit token_launched event
```

All five steps are atomic. If any step fails (e.g. WASM not found, simulation error), the entire transaction rolls back and nothing is deployed.

### Storage layout

The launchpad uses Soroban's instance storage with the following key schema:

```rust
enum DataKey {
    Admin,                    // Address — launchpad admin
    TokenWasmHash,            // BytesN<32> — hash of uploaded token WASM
    LaunchFee,                // i128 — fee in stroops (0 on testnet)
    TokenCount,               // u32 — total tokens ever launched
    TokenByIndex(u32),        // TokenInfo — metadata for token at index N
    CreatorTokens(Address),   // Vec<u32> — list of token indices for a creator
}
```

`TokenInfo` struct stored per token:

```rust
struct TokenInfo {
    address: Address,       // deployed contract address
    name: String,
    symbol: String,
    decimals: u32,
    initial_supply: i128,
    creator: Address,
    created_at: u64,        // ledger timestamp
}
```

### Frontend architecture

```
src/
├── lib/
│   ├── stellar.ts       buildContractCall(), submitTransaction(), readContract()
│   │                    — all RPC interaction lives here
│   ├── freighter.ts     signTx() — Freighter wallet signing
│   └── constants.ts     contract ID, RPC URL, network passphrase
│
├── hooks/
│   ├── useLaunchpad.ts  launchToken(), fetchTokens(), fetchCreatorTokens()
│   └── useWallet.ts     connect(), disconnect(), publicKey, connected
│
├── components/
│   ├── LaunchForm       form with validation, inline wallet connect, preview
│   ├── TokenCard        displays token metadata + copy/explorer links
│   ├── Navbar           routing + wallet status
│   ├── WalletButton     connect/disconnect
│   └── FundAccountBanner  Friendbot integration
│
└── pages/
    ├── HomePage         landing page
    ├── LaunchPage       token deployment form + tips
    ├── ExplorePage      paginated token registry with search
    └── MyTokensPage     creator's own tokens
```

**Key design decision — no XDR re-parsing after Freighter signing:**

Freighter returns a signed XDR string. We submit it directly to the RPC via raw `fetch` instead of calling `TransactionBuilder.fromXDR()`. This avoids version conflicts between Freighter's internal `stellar-base` and the app's SDK version.

```ts
// We do this:
await fetch(RPC_URL, {
  method: 'POST',
  body: JSON.stringify({ jsonrpc: '2.0', method: 'sendTransaction', params: { transaction: signedXdr } })
})

// Not this (causes runtime errors):
const tx = TransactionBuilder.fromXDR(signedXdr, NETWORK_PASSPHRASE)
await server.sendTransaction(tx)
```

### CI/CD pipeline

```
git push → GitHub Actions
              │
              ├── Job 1: Contract Tests
              │     ubuntu-latest
              │     install Rust + wasm32v1-none target
              │     cargo test (runs all 15 tests)
              │
              └── Job 2: Frontend Build
                    ubuntu-latest
                    node 20
                    npm ci → tsc → vite build
```

---

## Stack

| Layer | Technology |
|---|---|
| Smart contracts | Rust, Soroban SDK 22 |
| Frontend | React 18, TypeScript, Vite 6 |
| Wallet | Freighter (`@stellar/freighter-api`) |
| Stellar SDK | `@stellar/stellar-sdk` v13 |
| Styling | CSS variables + inline styles (zero UI framework) |
| CI/CD | GitHub Actions |
| Hosting | Vercel |

---

## Tests

```
running 7 tests (launchpad)
✓ test_initialize
✓ test_launch_token_inter_contract
✓ test_get_token_info
✓ test_get_creator_tokens
✓ test_multiple_launches_and_pagination
✓ test_set_launch_fee
✓ test_double_initialize_panics

running 8 tests (token)
✓ test_initialize
✓ test_mint_and_balance
✓ test_transfer
✓ test_approve_and_transfer_from
✓ test_burn
✓ test_set_admin
✓ test_transfer_insufficient_balance
✓ test_double_initialize_panics

15 passed, 0 failed
```

---

## Running it locally

You'll need Rust with the `wasm32v1-none` target, the [Stellar CLI](https://developers.stellar.org/docs/tools/developer-tools/cli/install-stellar-cli), and Node 20+.

```bash
git clone https://github.com/Shrikantshirshe/token_launchpad.git
cd token_launchpad

# run all contract tests
cargo test

# deploy contracts to testnet (writes frontend/.env automatically)
./scripts/deploy.sh YOUR_STELLAR_SECRET_KEY

# start the frontend
cd frontend
npm install
npm run dev
```

The deploy script funds your account via Friendbot, builds and uploads the token WASM, deploys the launchpad, and drops the contract ID into `frontend/.env`.

---

## Contract interface

**Launchpad**

```rust
fn initialize(admin: Address, token_wasm_hash: BytesN<32>, launch_fee: i128)
fn launch_token(creator: Address, name: String, symbol: String, decimals: u32, initial_supply: i128) -> Address
fn get_tokens(start: u32, limit: u32) -> Vec<TokenInfo>
fn get_creator_tokens(creator: Address) -> Vec<TokenInfo>
fn token_count() -> u32
fn set_launch_fee(new_fee: i128)   // admin only
fn launch_fee() -> i128
```

**Token (SEP-41)**

```rust
fn initialize(admin: Address, decimal: u32, name: String, symbol: String)
fn mint(to: Address, amount: i128)
fn transfer(from: Address, to: Address, amount: i128)
fn approve(from: Address, spender: Address, amount: i128, expiration_ledger: u32)
fn transfer_from(spender: Address, from: Address, to: Address, amount: i128)
fn burn(from: Address, amount: i128)
fn balance(id: Address) -> i128
fn total_supply() -> i128
fn set_admin(new_admin: Address)
```

---

## Environment variables

```env
VITE_LAUNCHPAD_CONTRACT_ID=CD7EJEMPI3RVAA2XJ4WSP7265QWC5VXOAJW32UJWDYECZKYGZIWE7QBW
VITE_NETWORK_PASSPHRASE=Test SDF Network ; September 2015
```

---

## User Feedback Collection

Feedback collected from real users via Google Form. All responses logged in the spreadsheet below.

- **Feedback Form** → [forms.gle/HcarPoB6rX9VtcPg7](https://forms.gle/HcarPoB6rX9VtcPg7)
- **Response Sheet** → [View on Google Sheets](https://docs.google.com/spreadsheets/d/14Bi97BD46B-g7v0mtKbAKyd8vH07ZW-IDepmMK6R6wU/edit?usp=sharing)

---

## User Feedback & Fixes

| # | Feedback | Fix applied | Commit |
|---|---|---|---|
| 1 | Filling the form then connecting wallet still shows the same broken state | Inline wallet connect prompt added inside the form — wallet connects without losing form data | [`7fbd527`](https://github.com/Shrikantshirshe/token_launchpad/commit/7fbd5271354022edcbab0f3fd7a9f215f71cf437) |
| 2 | Integrate with Stellar's built-in DEX to create a liquidity pool after launch | After a successful launch, a DEX card appears with a direct link to StellarTerm to list the token | [`7fbd527`](https://github.com/Shrikantshirshe/token_launchpad/commit/7fbd5271354022edcbab0f3fd7a9f215f71cf437) |
| 3 | The home page looks very vibe coded, needs more colours or elements | Redesigned with dark hero gradient, coloured feature cards with hover effects, use-case section, gradient CTA | [`7fbd527`](https://github.com/Shrikantshirshe/token_launchpad/commit/7fbd5271354022edcbab0f3fd7a9f215f71cf437) |
| 4 | Give an option to add a description of what the token does | Optional Description field (280 chars) added to the launch form, shown in the live preview | [`7fbd527`](https://github.com/Shrikantshirshe/token_launchpad/commit/7fbd5271354022edcbab0f3fd7a9f215f71cf437) |

---

## Recently Added Features

> [!NOTE]
> ### 🔒 Feature 3: Token Vesting & Lockups
> - **Atomic Deployment**: When launching a token, creators can check a box to enable lockup/vesting. The launchpad contract atomically deploys a fresh `soroban-vesting-contract` and mints the locked portion of the initial supply directly into it, while sending the remainder to the creator.
> - **Vesting Portal**: On the token detail page, a dedicated portal checks if the token has an associated vesting schedule. Beneficiaries can connect their Freighter wallet to see vesting progress and claim unlocked tokens linearly based on Cliff and Duration.
>
> ### 🌐 Feature 6: SEP-1 stellar.toml Generator
> - **Wallet Recognition**: To integrate with wallets and explorer websites (like LOBSTR or stellar.expert), a generator card has been added to the token detail page.
> - **TOML Configuration**: Live-generates standard ecosystem configuration properties showing custom logo URLs, home domains, decimal specifications, and display names, with detailed hosting guidelines.

---

## License

MIT

