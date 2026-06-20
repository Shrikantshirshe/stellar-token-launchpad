import { useState, type FormEvent } from 'react'
import { Rocket, Info, Loader2, ChevronDown, Wallet } from 'lucide-react'
import { Address } from '@stellar/stellar-sdk'
import { useLaunchpad } from '../hooks/useLaunchpad'
import { useWallet } from '../hooks/useWallet'
import { parseAmount } from '../lib/stellar'
import FundAccountBanner from './FundAccountBanner'
import { MAX_TOKEN_NAME_LENGTH, MAX_TOKEN_SYMBOL_LENGTH, DECIMAL_OPTIONS } from '../lib/constants'
import toast from 'react-hot-toast'

interface FormState {
  name: string
  symbol: string
  decimals: number
  initialSupply: string
  description: string
  enableVesting: boolean
  vestingAmount: string
  vestingBeneficiary: string
  vestingStartDelay: string
  vestingCliff: string
  vestingDuration: string
}

const INITIAL_FORM: FormState = {
  name: '',
  symbol: '',
  decimals: 7,
  initialSupply: '1000000',
  description: '',
  enableVesting: false,
  vestingAmount: '200000',
  vestingBeneficiary: '',
  vestingStartDelay: '0',
  vestingCliff: '0',
  vestingDuration: '60',
}

interface LaunchFormProps {
  onSuccess?: (txHash: string, tokenSymbol: string) => void
}

export default function LaunchForm({ onSuccess }: LaunchFormProps) {
  const [form, setForm] = useState<FormState>(INITIAL_FORM)
  const [errors, setErrors] = useState<Partial<Record<keyof FormState, string>>>({})
  const { launching, launchToken } = useLaunchpad()
  const { connected, publicKey, connect, connecting } = useWallet()

  const validate = (): boolean => {
    const newErrors: Partial<Record<keyof FormState, string>> = {}

    if (!form.name.trim()) {
      newErrors.name = 'Token name is required'
    } else if (form.name.length > MAX_TOKEN_NAME_LENGTH) {
      newErrors.name = `Max ${MAX_TOKEN_NAME_LENGTH} characters`
    }

    if (!form.symbol.trim()) {
      newErrors.symbol = 'Symbol is required'
    } else if (form.symbol.length > MAX_TOKEN_SYMBOL_LENGTH) {
      newErrors.symbol = `Max ${MAX_TOKEN_SYMBOL_LENGTH} characters`
    } else if (!/^[A-Z0-9]+$/.test(form.symbol)) {
      newErrors.symbol = 'Uppercase letters and numbers only'
    }

    if (!form.initialSupply || Number(form.initialSupply) <= 0) {
      newErrors.initialSupply = 'Supply must be greater than 0'
    }

    if (form.enableVesting) {
      if (!form.vestingBeneficiary.trim()) {
        newErrors.vestingBeneficiary = 'Beneficiary is required'
      } else {
        try {
          new Address(form.vestingBeneficiary.trim())
        } catch {
          newErrors.vestingBeneficiary = 'Invalid public key'
        }
      }

      if (!form.vestingAmount || Number(form.vestingAmount) <= 0) {
        newErrors.vestingAmount = 'Amount must be greater than 0'
      } else if (Number(form.vestingAmount) > Number(form.initialSupply)) {
        newErrors.vestingAmount = 'Cannot exceed initial supply'
      }

      if (Number(form.vestingStartDelay) < 0) {
        newErrors.vestingStartDelay = 'Cannot be negative'
      }
      if (Number(form.vestingCliff) < 0) {
        newErrors.vestingCliff = 'Cannot be negative'
      }
      if (!form.vestingDuration || Number(form.vestingDuration) <= 0) {
        newErrors.vestingDuration = 'Must be greater than 0'
      }
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!connected || !publicKey) {
      toast.error('Please connect your wallet first')
      return
    }
    if (!validate()) return

    try {
      const supplyBigInt = parseAmount(form.initialSupply, form.decimals)
      let vestingParams = undefined

      if (form.enableVesting) {
        const vestingAmtBigInt = parseAmount(form.vestingAmount, form.decimals)
        const currentTimestampSec = BigInt(Math.floor(Date.now() / 1000))
        const startDelaySec = BigInt(Math.floor(Number(form.vestingStartDelay) * 60))
        const cliffSec = BigInt(Math.floor(Number(form.vestingCliff) * 60))
        const durationSec = BigInt(Math.floor(Number(form.vestingDuration) * 60))

        vestingParams = {
          beneficiary: form.vestingBeneficiary.trim(),
          amount: vestingAmtBigInt,
          start: currentTimestampSec + startDelaySec,
          cliff: cliffSec,
          duration: durationSec,
        }
      }

      const txHash = await launchToken(
        {
          name: form.name.trim(),
          symbol: form.symbol.trim().toUpperCase(),
          decimals: form.decimals,
          initialSupply: supplyBigInt,
          vestingParams,
        },
        publicKey,
      )

      toast.success('Token launched successfully!')
      onSuccess?.(txHash, form.symbol.trim().toUpperCase())
      setForm(INITIAL_FORM)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Launch failed')
    }
  }

  const field = (
    id: keyof FormState,
    label: string,
    placeholder: string,
    hint?: string,
    extra?: React.InputHTMLAttributes<HTMLInputElement>,
  ) => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6, flex: 1 }}>
      <label
        htmlFor={id}
        style={{ fontSize: 13, fontWeight: 500, color: '#374151', display: 'flex', alignItems: 'center', gap: 6 }}
      >
        {label}
        {hint && (
          <span title={hint} style={{ cursor: 'help', color: '#94a3b8' }}>
            <Info size={12} />
          </span>
        )}
      </label>
      <input
        id={id}
        className="input-field"
        placeholder={placeholder}
        value={form[id] as string | number}
        onChange={(e) => {
          setForm((f) => ({ ...f, [id]: e.target.value }))
          if (errors[id]) setErrors((er) => ({ ...er, [id]: undefined }))
        }}
        disabled={launching}
        {...extra}
      />
      {errors[id] && (
        <span style={{ fontSize: 12, color: '#dc2626' }}>{errors[id]}</span>
      )}
    </div>
  )

  return (
    <form onSubmit={handleSubmit} noValidate style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {connected && <FundAccountBanner />}

      {/* Wallet connect prompt — shown inline when not connected */}
      {!connected && (
        <div
          style={{
            padding: '14px 16px',
            background: '#eff6ff',
            border: '1.5px solid #bfdbfe',
            borderRadius: 12,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 12,
            flexWrap: 'wrap',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Wallet size={16} color="#2563eb" />
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, color: '#1e40af' }}>Wallet not connected</div>
              <div style={{ fontSize: 12, color: '#3b82f6', marginTop: 1 }}>Connect to launch your token</div>
            </div>
          </div>
          <button
            type="button"
            onClick={async () => {
              try { await connect() } catch (err) {
                toast.error(err instanceof Error ? err.message : 'Failed to connect')
              }
            }}
            disabled={connecting}
            className="btn-primary"
            style={{ padding: '8px 16px', fontSize: 13 }}
          >
            {connecting ? <><Loader2 size={13} className="animate-spin" /> Connecting...</> : <><Wallet size={13} /> Connect Wallet</>}
          </button>
        </div>
      )}

      {field('name', 'Token Name', 'e.g. My Awesome Token', `Max ${MAX_TOKEN_NAME_LENGTH} characters`)}

      {field(
        'symbol',
        'Token Symbol',
        'e.g. MAT',
        `Max ${MAX_TOKEN_SYMBOL_LENGTH} uppercase characters`,
        {
          style: { textTransform: 'uppercase' },
          maxLength: MAX_TOKEN_SYMBOL_LENGTH,
          onInput: (e) => {
            const el = e.currentTarget
            el.value = el.value.toUpperCase().replace(/[^A-Z0-9]/g, '')
          },
        },
      )}

      {/* Description */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <label
          htmlFor="description"
          style={{ fontSize: 13, fontWeight: 500, color: '#374151', display: 'flex', alignItems: 'center', gap: 6 }}
        >
          Description
          <span style={{ fontSize: 11, color: '#94a3b8', fontWeight: 400 }}>(optional)</span>
          <span title="Describe what your token is for — shown in the explorer." style={{ cursor: 'help', color: '#94a3b8' }}>
            <Info size={12} />
          </span>
        </label>
        <textarea
          id="description"
          className="input-field"
          placeholder="e.g. A governance token for the XYZ community, used to vote on proposals and earn rewards."
          value={form.description}
          onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
          disabled={launching}
          rows={3}
          maxLength={280}
          style={{ resize: 'vertical', minHeight: 80, fontFamily: 'inherit' }}
        />
        <span style={{ fontSize: 11, color: '#94a3b8', textAlign: 'right' }}>
          {form.description.length}/280
        </span>
      </div>

      {/* Decimals */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <label
          htmlFor="decimals"
          style={{ fontSize: 13, fontWeight: 500, color: '#374151', display: 'flex', alignItems: 'center', gap: 6 }}
        >
          Decimals
          <span title="Number of decimal places. 7 is standard for Stellar tokens." style={{ cursor: 'help', color: '#94a3b8' }}>
            <Info size={12} />
          </span>
        </label>
        <div style={{ position: 'relative' }}>
          <select
            id="decimals"
            className="input-field"
            value={form.decimals}
            onChange={(e) => setForm((f) => ({ ...f, decimals: Number(e.target.value) }))}
            disabled={launching}
            style={{ appearance: 'none', paddingRight: 36, cursor: 'pointer', background: 'white' }}
          >
            {DECIMAL_OPTIONS.map((d) => (
              <option key={d} value={d} style={{ background: 'white', color: '#0f172a' }}>
                {d} {d === 7 ? '(Stellar standard)' : d === 18 ? '(EVM-style)' : ''}
              </option>
            ))}
          </select>
          <ChevronDown
            size={16}
            style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', pointerEvents: 'none' }}
          />
        </div>
      </div>

      {field(
        'initialSupply',
        'Initial Supply',
        'e.g. 1000000',
        'Total tokens minted to your wallet on launch',
        { type: 'number', min: '1', step: '1' },
      )}

      {/* Vesting toggle */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 0' }}>
        <input
          type="checkbox"
          id="enableVesting"
          checked={form.enableVesting}
          onChange={(e) => {
            setForm((f) => ({ ...f, enableVesting: e.target.checked }))
          }}
          disabled={launching}
          style={{ width: 16, height: 16, cursor: 'pointer' }}
        />
        <label
          htmlFor="enableVesting"
          style={{ fontSize: 13, fontWeight: 600, color: '#374151', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}
        >
          Enable Token Lockup/Vesting
          <span title="Lock a portion of the supply in a vesting contract to release linearly over time." style={{ cursor: 'help', color: '#94a3b8' }}>
            <Info size={12} />
          </span>
        </label>
      </div>

      {form.enableVesting && (
        <div
          style={{
            padding: '20px 18px',
            background: '#f8fafc',
            border: '1px solid #e2e8f0',
            borderRadius: 12,
            display: 'flex',
            flexDirection: 'column',
            gap: 16,
          }}
        >
          <div style={{ fontSize: 12, color: '#475569', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Vesting Schedule Configuration
          </div>

          {field('vestingBeneficiary', 'Beneficiary Address (G...)', 'Stellar public key that can claim vested tokens')}
          
          {field('vestingAmount', 'Vested Amount', 'e.g. 200000', 'Amount of tokens locked in the vesting contract', { type: 'number', min: '1' })}

          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            {field('vestingStartDelay', 'Start Delay (mins)', 'e.g. 0', 'Minutes before vesting begins', { type: 'number', min: '0' })}
            {field('vestingCliff', 'Cliff Period (mins)', 'e.g. 0', 'Minutes before first release is claimable', { type: 'number', min: '0' })}
            {field('vestingDuration', 'Duration (mins)', 'e.g. 60', 'Total minutes to vest linearly', { type: 'number', min: '1' })}
          </div>
        </div>
      )}

      {/* Preview */}
      {form.name && form.symbol && form.initialSupply && (
        <div
          style={{
            padding: '14px 16px',
            background: '#f0f9ff',
            border: '1px solid #bae6fd',
            borderRadius: 10,
            display: 'flex',
            flexDirection: 'column',
            gap: 8,
          }}
        >
          <div style={{ fontSize: 11, color: '#0369a1', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
            Preview
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
            <span style={{ color: '#64748b' }}>Name</span>
            <span style={{ color: '#0f172a', fontWeight: 500 }}>{form.name}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
            <span style={{ color: '#64748b' }}>Symbol</span>
            <span style={{ color: '#2563eb', fontWeight: 600 }}>${form.symbol.toUpperCase()}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
            <span style={{ color: '#64748b' }}>Supply</span>
            <span style={{ color: '#0f172a', fontFamily: "'DM Mono', monospace" }}>
              {Number(form.initialSupply).toLocaleString()} {form.symbol.toUpperCase()}
            </span>
          </div>
          {form.enableVesting && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4, paddingTop: 4, borderTop: '1px dashed #bae6fd' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
                <span style={{ color: '#0369a1', fontWeight: 500 }}>Vested Lockup</span>
                <span style={{ color: '#0369a1', fontWeight: 600 }}>
                  {Number(form.vestingAmount).toLocaleString()} {form.symbol.toUpperCase()} ({((Number(form.vestingAmount) / Number(form.initialSupply)) * 100).toFixed(0)}%)
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#64748b' }}>
                <span>Cliff / Duration</span>
                <span>{form.vestingCliff} mins / {form.vestingDuration} mins</span>
              </div>
            </div>
          )}
          {form.description && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 2, paddingTop: 4, borderTop: '1px solid #e0f2fe' }}>
              <span style={{ color: '#64748b', fontSize: 12 }}>Description</span>
              <span style={{ color: '#0f172a', fontSize: 12, lineHeight: 1.5 }}>{form.description}</span>
            </div>
          )}
        </div>
      )}

      <button
        type="submit"
        className="btn-primary"
        disabled={launching || !connected}
        style={{ width: '100%', padding: '14px 24px', fontSize: 15, marginTop: 4 }}
      >
        {launching ? (
          <><Loader2 size={16} className="animate-spin" /> Launching Token...</>
        ) : !connected ? (
          'Connect Wallet to Launch'
        ) : (
          <><Rocket size={16} /> Launch Token</>
        )}
      </button>
    </form>
  )
}
