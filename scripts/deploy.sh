#!/usr/bin/env bash
# deploy.sh — Deploy token and launchpad contracts to Stellar Testnet
# Usage: ./scripts/deploy.sh [ADMIN_SECRET_KEY]
set -euo pipefail

NETWORK="testnet"
RPC_URL="https://soroban-testnet.stellar.org"
NETWORK_PASSPHRASE="Test SDF Network ; September 2015"

# ── Resolve admin key ──────────────────────────────────────────────────────────
if [[ -n "${1:-}" ]]; then
  ADMIN_SECRET="$1"
elif [[ -n "${STELLAR_ADMIN_SECRET:-}" ]]; then
  ADMIN_SECRET="$STELLAR_ADMIN_SECRET"
else
  echo "❌ Provide admin secret key as argument or set STELLAR_ADMIN_SECRET"
  exit 1
fi

echo "🔧 Configuring Stellar CLI identity..."
stellar keys add deployer --secret-key "$ADMIN_SECRET" 2>/dev/null || true
ADMIN_ADDRESS=$(stellar keys address deployer)
echo "   Admin: $ADMIN_ADDRESS"

# ── Fund account on testnet ────────────────────────────────────────────────────
echo ""
echo "💰 Funding account on testnet..."
curl -s "https://friendbot.stellar.org?addr=$ADMIN_ADDRESS" > /dev/null && echo "   Funded via Friendbot"

# ── Build contracts ────────────────────────────────────────────────────────────
echo ""
echo "🔨 Building contracts..."
stellar contract build --manifest-path Cargo.toml --package soroban-token-contract
stellar contract build --manifest-path Cargo.toml --package soroban-vesting-contract
stellar contract build --manifest-path Cargo.toml --package soroban-launchpad-contract
echo "   ✅ Build complete"

# ── Upload token WASM ──────────────────────────────────────────────────────────
echo ""
echo "📤 Uploading token contract WASM..."
TOKEN_WASM_HASH=$(stellar contract upload \
  --network "$NETWORK" \
  --source deployer \
  --wasm target/wasm32v1-none/release/soroban_token_contract.wasm)
echo "   Token WASM hash: $TOKEN_WASM_HASH"

# ── Upload vesting WASM ────────────────────────────────────────────────────────
echo ""
echo "📤 Uploading vesting contract WASM..."
VESTING_WASM_HASH=$(stellar contract upload \
  --network "$NETWORK" \
  --source deployer \
  --wasm target/wasm32v1-none/release/soroban_vesting_contract.wasm)
echo "   Vesting WASM hash: $VESTING_WASM_HASH"

# ── Deploy launchpad contract ──────────────────────────────────────────────────
echo ""
echo "🚀 Deploying launchpad contract..."
LAUNCHPAD_ID=$(stellar contract deploy \
  --network "$NETWORK" \
  --source deployer \
  --wasm target/wasm32v1-none/release/soroban_launchpad_contract.wasm)
echo "   Launchpad contract ID: $LAUNCHPAD_ID"

# ── Initialize launchpad ───────────────────────────────────────────────────────
echo ""
echo "⚙️  Initializing launchpad..."
stellar contract invoke \
  --network "$NETWORK" \
  --source deployer \
  --id "$LAUNCHPAD_ID" \
  -- initialize \
  --admin "$ADMIN_ADDRESS" \
  --token_wasm_hash "$TOKEN_WASM_HASH" \
  --vesting_wasm_hash "$VESTING_WASM_HASH" \
  --launch_fee 0
echo "   ✅ Launchpad initialized"

# ── Write .env ─────────────────────────────────────────────────────────────────
echo ""
echo "📝 Writing frontend/.env..."
cat > frontend/.env << EOF
VITE_LAUNCHPAD_CONTRACT_ID=$LAUNCHPAD_ID
VITE_NETWORK_PASSPHRASE=$NETWORK_PASSPHRASE
EOF

echo ""
echo "✅ Deployment complete!"
echo ""
echo "   Launchpad:  $LAUNCHPAD_ID"
echo "   Token WASM: $TOKEN_WASM_HASH"
echo ""
echo "   View on Stellar Expert:"
echo "   https://stellar.expert/explorer/testnet/contract/$LAUNCHPAD_ID"
