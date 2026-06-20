import {
  Contract,
  TransactionBuilder,
  BASE_FEE,
  xdr,
  scValToNative,
  rpc as SorobanRpc,
  Account,
} from '@stellar/stellar-sdk'
import { NETWORK_PASSPHRASE, RPC_URL } from './constants'

export const server = new SorobanRpc.Server(RPC_URL, { allowHttp: false })

export interface TokenInfo {
  address: string
  name: string
  symbol: string
  decimals: number
  initial_supply: bigint
  creator: string
  created_at: bigint
  vesting_address?: string
}

/**
 * Build, simulate, and assemble a contract invocation.
 * Returns the fully assembled transaction XDR (base64) ready for Freighter to sign.
 */
export async function buildContractCall(
  contractId: string,
  method: string,
  args: xdr.ScVal[],
  sourcePublicKey: string,
): Promise<string> {
  const account = await server.getAccount(sourcePublicKey)
  const contract = new Contract(contractId)

  const tx = new TransactionBuilder(account, {
    fee: '1000000',
    networkPassphrase: NETWORK_PASSPHRASE,
  })
    .addOperation(contract.call(method, ...args))
    .setTimeout(300)
    .build()

  const simResult = await server.simulateTransaction(tx)

  if (SorobanRpc.Api.isSimulationError(simResult)) {
    throw new Error(`Simulation failed: ${simResult.error}`)
  }

  const assembled = SorobanRpc.assembleTransaction(tx, simResult).build()
  return assembled.toEnvelope().toXDR('base64')
}

/**
 * Submit a signed transaction XDR string directly to the RPC.
 * We intentionally do NOT call TransactionBuilder.fromXDR on the signed XDR —
 * that re-parse step is what triggers "bad union switch" when Freighter's
 * internal stellar-base version differs from ours.
 * server.sendTransaction() accepts a raw base64 XDR string via fetch directly.
 */
export async function submitTransaction(signedXdr: string): Promise<string> {
  // Send via raw fetch to the RPC endpoint — bypasses stellar-sdk XDR parsing entirely
  const response = await fetch(RPC_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: 1,
      method: 'sendTransaction',
      params: { transaction: signedXdr },
    }),
  })

  if (!response.ok) {
    throw new Error(`RPC request failed: ${response.status} ${response.statusText}`)
  }

  const json = await response.json()

  if (json.error) {
    throw new Error(`Transaction rejected: ${json.error.message ?? JSON.stringify(json.error)}`)
  }

  const result = json.result
  if (!result) {
    throw new Error('No result from RPC sendTransaction')
  }

  if (result.status === 'ERROR') {
    throw new Error(`Transaction rejected by network: ${result.errorResultXdr ?? 'unknown error'}`)
  }

  const hash: string = result.hash

  // Poll for confirmation
  for (let i = 0; i < 30; i++) {
    await new Promise((r) => setTimeout(r, 2000))

    const pollResponse = await fetch(RPC_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'getTransaction',
        params: { hash },
      }),
    })

    const pollJson = await pollResponse.json()
    const txResult = pollJson.result

    if (txResult?.status === 'SUCCESS') return hash
    if (txResult?.status === 'FAILED') {
      throw new Error(`Transaction failed on-chain. Hash: ${hash}`)
    }
    // NOT_FOUND means still pending — keep polling
  }

  throw new Error(`Transaction timed out. Hash: ${hash}`)
}

/**
 * Read-only contract call via simulation.
 */
export async function readContract<T>(
  contractId: string,
  method: string,
  args: xdr.ScVal[],
): Promise<T> {
  const dummyKey = 'GD3XKP2V7TJUVU2EY52PQB5ECETU56MNIXGSIUJUW55GS4NCITQV76PD'
  const account = new Account(dummyKey, '0')
  const contract = new Contract(contractId)

  const tx = new TransactionBuilder(account, {
    fee: BASE_FEE,
    networkPassphrase: NETWORK_PASSPHRASE,
  })
    .addOperation(contract.call(method, ...args))
    .setTimeout(30)
    .build()

  const simResult = await server.simulateTransaction(tx)

  if (SorobanRpc.Api.isSimulationError(simResult)) {
    throw new Error(`Read failed: ${simResult.error}`)
  }

  if (!('result' in simResult) || !simResult.result) {
    throw new Error('No result from simulation')
  }

  return scValToNative(simResult.result.retval) as T
}

export function parseTokenInfo(raw: Record<string, unknown>): TokenInfo {
  return {
    address: String(raw.address ?? ''),
    name: String(raw.name ?? ''),
    symbol: String(raw.symbol ?? ''),
    decimals: Number(raw.decimals ?? 0),
    initial_supply: BigInt(String(raw.initial_supply ?? '0')),
    creator: String(raw.creator ?? ''),
    created_at: BigInt(String(raw.created_at ?? '0')),
    vesting_address: raw.vesting_address ? String(raw.vesting_address) : undefined,
  }
}

export function formatAmount(amount: bigint, decimals: number): string {
  if (decimals === 0) return amount.toString()
  const divisor = BigInt(10 ** decimals)
  const whole = amount / divisor
  const frac = amount % divisor
  const fracStr = frac.toString().padStart(decimals, '0').replace(/0+$/, '')
  return fracStr ? `${whole}.${fracStr}` : whole.toString()
}

export function parseAmount(value: string, decimals: number): bigint {
  const [whole, frac = ''] = value.split('.')
  const fracPadded = frac.padEnd(decimals, '0').slice(0, decimals)
  return BigInt(whole || '0') * BigInt(10 ** decimals) + BigInt(fracPadded || '0')
}

export function shortenAddress(address: string, chars = 6): string {
  if (address.length <= chars * 2 + 3) return address
  return `${address.slice(0, chars)}...${address.slice(-chars)}`
}
