import { useState, useCallback } from 'react'
import { nativeToScVal, xdr, Address } from '@stellar/stellar-sdk'
import {
  buildContractCall,
  submitTransaction,
  readContract,
  parseTokenInfo,
  type TokenInfo,
} from '../lib/stellar'
import { signTx } from '../lib/freighter'
import { LAUNCHPAD_CONTRACT_ID } from '../lib/constants'

export interface VestingParams {
  beneficiary: string
  amount: bigint
  start: bigint
  cliff: bigint
  duration: bigint
}

export interface LaunchTokenParams {
  name: string
  symbol: string
  decimals: number
  initialSupply: bigint
  vestingParams?: VestingParams
}

interface UseLaunchpadReturn {
  launching: boolean
  launchToken: (params: LaunchTokenParams, publicKey: string) => Promise<string>
  fetchTokenCount: () => Promise<number>
  fetchTokens: (start: number, limit: number) => Promise<TokenInfo[]>
  fetchCreatorTokens: (creator: string) => Promise<TokenInfo[]>
  fetchLaunchFee: () => Promise<bigint>
}

/**
 * Encode VestingParams to ScVal (Map structure or Void/None if undefined).
 */
function vestingParamsToScVal(params?: VestingParams): xdr.ScVal {
  if (!params) {
    return nativeToScVal(null)
  }
  // Soroban maps must have keys sorted alphabetically
  return xdr.ScVal.scvMap([
    new xdr.ScMapEntry({
      key: xdr.ScVal.scvSymbol('amount'),
      val: nativeToScVal(params.amount, { type: 'i128' }),
    }),
    new xdr.ScMapEntry({
      key: xdr.ScVal.scvSymbol('beneficiary'),
      val: new Address(params.beneficiary).toScVal(),
    }),
    new xdr.ScMapEntry({
      key: xdr.ScVal.scvSymbol('cliff'),
      val: nativeToScVal(params.cliff, { type: 'u64' }),
    }),
    new xdr.ScMapEntry({
      key: xdr.ScVal.scvSymbol('duration'),
      val: nativeToScVal(params.duration, { type: 'u64' }),
    }),
    new xdr.ScMapEntry({
      key: xdr.ScVal.scvSymbol('start'),
      val: nativeToScVal(params.start, { type: 'u64' }),
    }),
  ])
}

/**
 * Encode a Stellar public key (G...) as an ScVal address.
 * Uses Address.toScVal() — the correct API in stellar-sdk v13.
 * The previous code used (xdr as any).AccountId which does not exist
 * in v13 and caused the "bad switch smt 4" XDR error at runtime.
 */
function publicKeyToScVal(publicKey: string): xdr.ScVal {
  return new Address(publicKey).toScVal()
}

export function useLaunchpad(): UseLaunchpadReturn {
  const [launching, setLaunching] = useState(false)

  const launchToken = useCallback(
    async (params: LaunchTokenParams, publicKey: string): Promise<string> => {
      setLaunching(true)
      try {
        const args: xdr.ScVal[] = [
          publicKeyToScVal(publicKey),
          nativeToScVal(params.name, { type: 'string' }),
          nativeToScVal(params.symbol, { type: 'string' }),
          nativeToScVal(params.decimals, { type: 'u32' }),
          nativeToScVal(params.initialSupply, { type: 'i128' }),
          vestingParamsToScVal(params.vestingParams),
        ]

        const unsignedXdr = await buildContractCall(
          LAUNCHPAD_CONTRACT_ID,
          'launch_token',
          args,
          publicKey,
        )

        const signedXdr = await signTx(unsignedXdr, publicKey)
        const txHash = await submitTransaction(signedXdr)
        return txHash
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err)
        if (msg.includes('404') || msg.toLowerCase().includes('not found') || msg.toLowerCase().includes('no account')) {
          throw new Error(
            'Account not found on Testnet. Use the "Fund via Friendbot" button to activate your account first.',
          )
        }
        if (msg.toLowerCase().includes('insufficient') || msg.toLowerCase().includes('balance')) {
          throw new Error('Insufficient XLM balance. Fund your account via Friendbot first.')
        }
        if (msg.toLowerCase().includes('simulation failed')) {
          throw new Error('Contract simulation failed. Check your token parameters.')
        }
        if (msg.includes('ERR_FAILED') || msg.includes('Failed to fetch')) {
          throw new Error(
            'Network error. Check your connection and that Freighter is set to Testnet.',
          )
        }
        throw err
      } finally {
        setLaunching(false)
      }
    },
    [],
  )

  const fetchTokenCount = useCallback(async (): Promise<number> => {
    const count = await readContract<number>(LAUNCHPAD_CONTRACT_ID, 'token_count', [])
    return Number(count)
  }, [])

  const fetchTokens = useCallback(
    async (start: number, limit: number): Promise<TokenInfo[]> => {
      const raw = await readContract<Record<string, unknown>[]>(
        LAUNCHPAD_CONTRACT_ID,
        'get_tokens',
        [
          nativeToScVal(start, { type: 'u32' }),
          nativeToScVal(limit, { type: 'u32' }),
        ],
      )
      return (raw ?? []).map(parseTokenInfo)
    },
    [],
  )

  const fetchCreatorTokens = useCallback(async (creator: string): Promise<TokenInfo[]> => {
    const raw = await readContract<Record<string, unknown>[]>(
      LAUNCHPAD_CONTRACT_ID,
      'get_creator_tokens',
      [publicKeyToScVal(creator)],
    )
    return (raw ?? []).map(parseTokenInfo)
  }, [])

  const fetchLaunchFee = useCallback(async (): Promise<bigint> => {
    const fee = await readContract<bigint>(LAUNCHPAD_CONTRACT_ID, 'launch_fee', [])
    return BigInt(fee ?? 0)
  }, [])

  return {
    launching,
    launchToken,
    fetchTokenCount,
    fetchTokens,
    fetchCreatorTokens,
    fetchLaunchFee,
  }
}
