import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { ArrowLeft, Copy, Check, ExternalLink, Loader2, Lock, ShieldCheck, FileText, CheckCircle2, Info } from 'lucide-react'
import { useLaunchpad } from '../hooks/useLaunchpad'
import { useWallet } from '../hooks/useWallet'
import { type TokenInfo, formatAmount, shortenAddress, readContract, buildContractCall, submitTransaction } from '../lib/stellar'
import { LAUNCHPAD_CONTRACT_ID } from '../lib/constants'
import { signTx } from '../lib/freighter'
import toast from 'react-hot-toast'

const TOKEN_COLORS = [
  { bg: '#eff6ff', text: '#1d4ed8', border: '#bfdbfe' },
  { bg: '#f0fdf4', text: '#15803d', border: '#bbf7d0' },
  { bg: '#fdf4ff', text: '#7e22ce', border: '#e9d5ff' },
  { bg: '#fff7ed', text: '#c2410c', border: '#fed7aa' },
  { bg: '#ecfeff', text: '#0e7490', border: '#a5f3fc' },
  { bg: '#fef2f2', text: '#b91c1c', border: '#fecaca' },
]

interface VestingData {
  beneficiary: string
  start: bigint
  cliff: bigint
  duration: bigint
  totalAmount: bigint
  released: bigint
  claimable: bigint
  vested: bigint
}

export default function TokenDetailPage() {
  const { address } = useParams<{ address: string }>()
  const [token, setToken] = useState<TokenInfo | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [copiedAddress, setCopiedAddress] = useState(false)
  const [copiedCreator, setCopiedCreator] = useState(false)
  const { fetchTokens, fetchTokenCount } = useLaunchpad()
  const { connected, publicKey } = useWallet()

  // Vesting states
  const [vestingData, setVestingData] = useState<VestingData | null>(null)
  const [claiming, setClaiming] = useState(false)
  const [refreshTick, setRefreshTick] = useState(0)

  // SEP-1 toml states
  const [tomlDomain, setTomlDomain] = useState('')
  const [tomlLogo, setTomlLogo] = useState('')
  const [copiedToml, setCopiedToml] = useState(false)

  const triggerRefreshVesting = () => setRefreshTick((t) => t + 1)

  useEffect(() => {
    if (!address || !LAUNCHPAD_CONTRACT_ID) {
      setLoading(false)
      setError('Invalid token address')
      return
    }

    const findToken = async () => {
      setLoading(true)
      setError(null)
      try {
        const count = await fetchTokenCount()
        if (count === 0) {
          setError('Token not found')
          return
        }
        const batchSize = 50
        for (let start = 0; start < count; start += batchSize) {
          const batch = await fetchTokens(start, Math.min(batchSize, count - start))
          const found = batch.find((t) => t.address === address)
          if (found) {
            setToken(found)
            return
          }
        }
        setError('Token not found in registry')
      } catch {
        setError('Failed to load token details')
      } finally {
        setLoading(false)
      }
    }

    findToken()
  }, [address, fetchTokens, fetchTokenCount])

  useEffect(() => {
    if (!token || !token.vesting_address) return

    let active = true
    const fetchVesting = async () => {
      try {
        const beneficiary = await readContract<string>(token.vesting_address!, 'beneficiary', [])
        const start = await readContract<bigint>(token.vesting_address!, 'start', [])
        const cliff = await readContract<bigint>(token.vesting_address!, 'cliff', [])
        const duration = await readContract<bigint>(token.vesting_address!, 'duration', [])
        const totalAmount = await readContract<bigint>(token.vesting_address!, 'total_amount', [])
        const released = await readContract<bigint>(token.vesting_address!, 'released', [])
        const claimable = await readContract<bigint>(token.vesting_address!, 'claimable_amount', [])
        const vested = await readContract<bigint>(token.vesting_address!, 'vested_amount', [])

        if (active) {
          setVestingData({
            beneficiary,
            start,
            cliff,
            duration,
            totalAmount,
            released,
            claimable,
            vested,
          })
        }
      } catch (err) {
        console.error('Failed to load vesting data:', err)
      }
    }

    fetchVesting()
    const interval = setInterval(fetchVesting, 10000)
    return () => {
      active = false
      clearInterval(interval)
    }
  }, [token, refreshTick])

  const handleCopy = async (text: string, which: 'address' | 'creator') => {
    await navigator.clipboard.writeText(text)
    if (which === 'address') {
      setCopiedAddress(true)
      setTimeout(() => setCopiedAddress(false), 2000)
    } else {
      setCopiedCreator(true)
      setTimeout(() => setCopiedCreator(false), 2000)
    }
    toast.success('Copied to clipboard')
  }

  const handleCopyToml = async () => {
    if (!token) return
    const text = `# stellar.toml generated for $${token.symbol}
# Place this file at: https://${tomlDomain || '<your-domain>'}/.well-known/stellar.toml

[[CURRENCIES]]
code = "${token.symbol}"
issuer = "${token.address}"
display_decimals = ${token.decimals}
name = "${token.name}"
${tomlDomain ? `host = "${tomlDomain}"` : '# host = "<your-domain>"'}
${tomlLogo ? `image = "${tomlLogo}"` : '# image = "<logo-url>"'}`

    await navigator.clipboard.writeText(text)
    setCopiedToml(true)
    setTimeout(() => setCopiedToml(false), 2000)
    toast.success('TOML copied to clipboard')
  }

  const handleClaimVesting = async () => {
    if (!connected || !publicKey) {
      toast.error('Wallet not connected')
      return
    }
    if (!token?.vesting_address || !vestingData) return

    setClaiming(true)
    try {
      const unsignedXdr = await buildContractCall(
        token.vesting_address,
        'claim',
        [],
        publicKey,
      )
      const signedXdr = await signTx(unsignedXdr, publicKey)
      await submitTransaction(signedXdr)
      toast.success('Vested tokens claimed successfully!')
      triggerRefreshVesting()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to claim tokens')
    } finally {
      setClaiming(false)
    }
  }

  if (loading) {
    return (
      <div
        style={{
          background: '#f8fafc',
          minHeight: '100vh',
          paddingTop: 64,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
          <Loader2 size={32} color="#2563eb" className="animate-spin" />
          <p style={{ fontSize: 14, color: '#64748b' }}>Loading token details...</p>
        </div>
      </div>
    )
  }

  if (error || !token) {
    return (
      <div style={{ background: '#f8fafc', minHeight: '100vh', paddingTop: 64 }}>
        <div style={{ maxWidth: 560, margin: '80px auto', padding: '0 24px', textAlign: 'center' }}>
          <div className="glass-card" style={{ padding: 48 }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>🔍</div>
            <h2
              style={{
                fontFamily: "'DM Sans', sans-serif",
                fontSize: 22,
                fontWeight: 700,
                color: '#0f172a',
                marginBottom: 10,
              }}
            >
              Token not found
            </h2>
            <p style={{ fontSize: 14, color: '#64748b', lineHeight: 1.6, marginBottom: 24 }}>
              {error ?? 'This token address does not exist in the registry.'}
            </p>
            <Link to="/explore" className="btn-primary" style={{ display: 'inline-flex' }}>
              <ArrowLeft size={15} />
              Back to Explore
            </Link>
          </div>
        </div>
      </div>
    )
  }

  const colorSet = TOKEN_COLORS[token.symbol.charCodeAt(0) % TOKEN_COLORS.length]
  const formattedSupply = formatAmount(token.initial_supply, token.decimals)
  const createdDate = new Date(Number(token.created_at) * 1000).toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  })
  const createdTime = new Date(Number(token.created_at) * 1000).toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    timeZoneName: 'short',
  })

  return (
    <div style={{ background: '#f8fafc', minHeight: '100vh', paddingTop: 64 }}>
      {/* Header */}
      <div style={{ background: 'white', borderBottom: '1px solid #e2e8f0', padding: '32px 24px' }}>
        <div style={{ maxWidth: 800, margin: '0 auto' }}>
          <Link
            to="/explore"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              fontSize: 13,
              color: '#64748b',
              textDecoration: 'none',
              marginBottom: 20,
              transition: 'color 0.15s',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.color = '#2563eb' }}
            onMouseLeave={(e) => { e.currentTarget.style.color = '#64748b' }}
          >
            <ArrowLeft size={14} />
            Back to Explore
          </Link>

          <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
            {/* Token avatar */}
            <div
              style={{
                width: 64,
                height: 64,
                borderRadius: 18,
                background: colorSet.bg,
                border: `2px solid ${colorSet.border}`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 22,
                fontWeight: 700,
                color: colorSet.text,
                fontFamily: "'DM Sans', sans-serif",
                flexShrink: 0,
              }}
            >
              {token.symbol.slice(0, 2).toUpperCase()}
            </div>

            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                <h1
                  style={{
                    fontFamily: "'DM Sans', sans-serif",
                    fontSize: 'clamp(22px, 4vw, 32px)',
                    fontWeight: 700,
                    color: '#0f172a',
                    letterSpacing: '-0.02em',
                  }}
                >
                  {token.name}
                </h1>
                <span
                  style={{
                    padding: '3px 10px',
                    borderRadius: 20,
                    background: colorSet.bg,
                    border: `1px solid ${colorSet.border}`,
                    fontSize: 13,
                    fontWeight: 700,
                    color: colorSet.text,
                  }}
                >
                  ${token.symbol}
                </span>
              </div>
              <p style={{ fontSize: 13, color: '#64748b', marginTop: 4 }}>
                SEP-41 Token · Stellar Testnet · {token.decimals} decimal{token.decimals !== 1 ? 's' : ''}
              </p>
            </div>

            {/* External links */}
            <div style={{ display: 'flex', gap: 8 }}>
              <a
                href={`https://stellar.expert/explorer/testnet/contract/${token.address}`}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-secondary"
                style={{ padding: '8px 14px', fontSize: 13 }}
              >
                <ExternalLink size={13} />
                Stellar Expert
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div style={{ maxWidth: 800, margin: '0 auto', padding: '32px 24px 80px' }}>
        {/* Stats grid */}
        <div
          className="token-detail-stats"
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: 16,
            marginBottom: 24,
          }}
        >
          {[
            {
              label: 'Total Supply',
              value: Number(formattedSupply).toLocaleString(),
              sub: token.symbol,
              mono: true,
            },
            {
              label: 'Decimals',
              value: String(token.decimals),
              sub: token.decimals === 7 ? 'Stellar standard' : token.decimals === 18 ? 'EVM-style' : 'Custom',
              mono: false,
            },
            {
              label: 'Launched',
              value: createdDate,
              sub: createdTime,
              mono: false,
            },
          ].map(({ label, value, sub, mono }) => (
            <div
              key={label}
              className="glass-card"
              style={{ padding: '20px 18px' }}
            >
              <div
                style={{
                  fontSize: 10,
                  color: '#94a3b8',
                  textTransform: 'uppercase',
                  letterSpacing: '0.08em',
                  marginBottom: 8,
                }}
              >
                {label}
              </div>
              <div
                style={{
                  fontSize: 15,
                  fontWeight: 700,
                  color: '#0f172a',
                  fontFamily: mono ? "'DM Mono', monospace" : 'inherit',
                  wordBreak: 'break-word',
                }}
              >
                {value}
              </div>
              <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 4 }}>{sub}</div>
            </div>
          ))}
        </div>

        {/* Contract address */}
        <div className="glass-card" style={{ padding: '20px 24px', marginBottom: 16 }}>
          <div
            style={{
              fontSize: 11,
              color: '#94a3b8',
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
              marginBottom: 10,
            }}
          >
            Contract Address
          </div>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 12,
              flexWrap: 'wrap',
            }}
          >
            <code
              style={{
                fontSize: 13,
                fontFamily: "'DM Mono', monospace",
                color: '#0f172a',
                wordBreak: 'break-all',
                flex: 1,
              }}
            >
              {token.address}
            </code>
            <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
              <button
                onClick={() => handleCopy(token.address, 'address')}
                className="btn-secondary"
                style={{ padding: '6px 12px', fontSize: 12 }}
              >
                {copiedAddress ? <Check size={13} color="#16a34a" /> : <Copy size={13} />}
                {copiedAddress ? 'Copied' : 'Copy'}
              </button>
              <a
                href={`https://stellar.expert/explorer/testnet/contract/${token.address}`}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-secondary"
                style={{ padding: '6px 12px', fontSize: 12 }}
              >
                <ExternalLink size={13} />
                View
              </a>
            </div>
          </div>
        </div>

        {/* Creator address */}
        <div className="glass-card" style={{ padding: '20px 24px', marginBottom: 16 }}>
          <div
            style={{
              fontSize: 11,
              color: '#94a3b8',
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
              marginBottom: 10,
            }}
          >
            Creator
          </div>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 12,
              flexWrap: 'wrap',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1, minWidth: 0 }}>
              <div
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: '50%',
                  background: `hsl(${(token.creator.charCodeAt(2) * 53) % 360}, 55%, 85%)`,
                  flexShrink: 0,
                }}
              />
              <code
                style={{
                  fontSize: 13,
                  fontFamily: "'DM Mono', monospace",
                  color: '#0f172a',
                  wordBreak: 'break-all',
                }}
              >
                <span className="hide-mobile">{token.creator}</span>
                <span className="hide-desktop">{shortenAddress(token.creator, 8)}</span>
              </code>
            </div>
            <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
              <button
                onClick={() => handleCopy(token.creator, 'creator')}
                className="btn-secondary"
                style={{ padding: '6px 12px', fontSize: 12 }}
              >
                {copiedCreator ? <Check size={13} color="#16a34a" /> : <Copy size={13} />}
                {copiedCreator ? 'Copied' : 'Copy'}
              </button>
              <a
                href={`https://stellar.expert/explorer/testnet/account/${token.creator}`}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-secondary"
                style={{ padding: '6px 12px', fontSize: 12 }}
              >
                <ExternalLink size={13} />
                View
              </a>
            </div>
          </div>
        </div>

        {/* Vesting Dashboard (if enabled) */}
        {token.vesting_address && (
          <div className="glass-card" style={{ padding: '24px', marginBottom: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
              <Lock size={16} color="#2563eb" />
              <span style={{ fontSize: 13, fontWeight: 700, color: '#0f172a', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                Token Lockup / Vesting Schedule
              </span>
            </div>

            {vestingData ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12 }}>
                  <div style={{ padding: '12px 14px', background: '#f8fafc', borderRadius: 8, border: '1px solid #e2e8f0' }}>
                    <div style={{ fontSize: 10, color: '#94a3b8', textTransform: 'uppercase', marginBottom: 4 }}>Vesting Contract</div>
                    <code style={{ fontSize: 12, fontFamily: "'DM Mono', monospace", color: '#0f172a', wordBreak: 'break-all' }}>
                      {token.vesting_address}
                    </code>
                  </div>
                  <div style={{ padding: '12px 14px', background: '#f8fafc', borderRadius: 8, border: '1px solid #e2e8f0' }}>
                    <div style={{ fontSize: 10, color: '#94a3b8', textTransform: 'uppercase', marginBottom: 4 }}>Beneficiary</div>
                    <code style={{ fontSize: 12, fontFamily: "'DM Mono', monospace", color: '#0f172a', wordBreak: 'break-all' }}>
                      {vestingData.beneficiary}
                    </code>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
                  {[
                    { label: 'Total Locked', val: formatAmount(vestingData.totalAmount, token.decimals) },
                    { label: 'Vested (Total)', val: formatAmount(vestingData.vested, token.decimals) },
                    { label: 'Claimed', val: formatAmount(vestingData.released, token.decimals) },
                    { label: 'Claimable Now', val: formatAmount(vestingData.claimable, token.decimals), highlight: true },
                  ].map((item) => (
                    <div key={item.label} style={{ padding: '10px 12px', background: item.highlight ? '#eff6ff' : '#f8fafc', borderRadius: 8, border: `1px solid ${item.highlight ? '#bfdbfe' : '#e2e8f0'}` }}>
                      <div style={{ fontSize: 9, color: item.highlight ? '#2563eb' : '#94a3b8', fontWeight: 600, textTransform: 'uppercase', marginBottom: 4 }}>{item.label}</div>
                      <div style={{ fontSize: 14, fontWeight: 700, color: '#0f172a', fontFamily: "'DM Mono', monospace" }}>{item.val}</div>
                    </div>
                  ))}
                </div>

                {/* Progress bar */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
                    <span style={{ color: '#64748b' }}>Vesting Progress</span>
                    <span style={{ color: '#0f172a', fontWeight: 600 }}>
                      {((Number(vestingData.vested) / Number(vestingData.totalAmount)) * 100).toFixed(1)}%
                    </span>
                  </div>
                  <div style={{ width: '100%', height: 8, background: '#e2e8f0', borderRadius: 4, overflow: 'hidden' }}>
                    <div
                      style={{
                        width: `${(Number(vestingData.vested) / Number(vestingData.totalAmount)) * 100}%`,
                        height: '100%',
                        background: '#2563eb',
                        borderRadius: 4,
                        transition: 'width 0.3s ease',
                      }}
                    />
                  </div>
                </div>

                {/* Claim button */}
                {publicKey === vestingData.beneficiary ? (
                  <button
                    onClick={handleClaimVesting}
                    disabled={claiming || vestingData.claimable <= 0n}
                    className="btn-primary"
                    style={{ width: '100%', padding: '10px 20px', fontSize: 13, justifyContent: 'center' }}
                  >
                    {claiming ? (
                      <><Loader2 size={14} className="animate-spin" /> Claiming...</>
                    ) : vestingData.claimable <= 0n ? (
                      'No Claimable Tokens'
                    ) : (
                      <><ShieldCheck size={14} /> Claim Vested Tokens ({formatAmount(vestingData.claimable, token.decimals)} ${token.symbol})</>
                    )}
                  </button>
                ) : (
                  <div style={{ padding: '10px 12px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, fontSize: 12, color: '#991b1b', display: 'flex', gap: 8, alignItems: 'center' }}>
                    <Info size={14} />
                    <span>Only the beneficiary address ({shortenAddress(vestingData.beneficiary, 6)}) can claim these tokens. Connect the correct wallet.</span>
                  </div>
                )}
              </div>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 13, color: '#64748b' }}>
                <Loader2 size={16} className="animate-spin" />
                Loading vesting schedule from ledger...
              </div>
            )}
          </div>
        )}

        {/* Inter-contract call info */}
        <div className="glass-card" style={{ padding: '20px 24px', marginBottom: 16 }}>
          <div
            style={{
              fontSize: 11,
              color: '#94a3b8',
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
              marginBottom: 14,
            }}
          >
            Deployment Details
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {[
              {
                step: '1',
                label: 'initialize()',
                desc: `Set name "${token.name}", symbol "${token.symbol}", decimals ${token.decimals}`,
              },
              {
                step: '2',
                label: 'mint()',
                desc: token.vesting_address 
                  ? `Minted ${Number(formatAmount(token.initial_supply - (vestingData?.totalAmount ?? 0n), token.decimals)).toLocaleString()} ${token.symbol} to creator and locked ${Number(formatAmount(vestingData?.totalAmount ?? 0n, token.decimals)).toLocaleString()} ${token.symbol} in vesting contract`
                  : `Minted ${Number(formattedSupply).toLocaleString()} ${token.symbol} to creator`,
              },
              {
                step: '3',
                label: 'set_admin()',
                desc: `Admin rights transferred to ${shortenAddress(token.creator, 6)}`,
              },
            ].map(({ step, label, desc }) => (
              <div
                key={step}
                style={{
                  display: 'flex',
                  gap: 12,
                  alignItems: 'flex-start',
                  padding: '10px 12px',
                  background: '#f8fafc',
                  borderRadius: 8,
                  border: '1px solid #e2e8f0',
                }}
              >
                <div
                  style={{
                    width: 22,
                    height: 22,
                    borderRadius: 6,
                    background: '#eff6ff',
                    border: '1px solid #bfdbfe',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 11,
                    fontWeight: 700,
                    color: '#2563eb',
                    flexShrink: 0,
                  }}
                >
                  {step}
                </div>
                <div>
                  <code
                    style={{
                      fontSize: 12,
                      fontFamily: "'DM Mono', monospace",
                      color: '#2563eb',
                      fontWeight: 500,
                    }}
                  >
                    {label}
                  </code>
                  <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>{desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* SEP-1 stellar.toml Generator */}
        <div className="glass-card" style={{ padding: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
            <FileText size={16} color="#2563eb" />
            <span style={{ fontSize: 13, fontWeight: 700, color: '#0f172a', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              SEP-1 stellar.toml Generator (Wallet Integration)
            </span>
          </div>

          <p style={{ fontSize: 12, color: '#64748b', lineHeight: 1.5, marginBottom: 16 }}>
            To show your token's custom logo and description in wallets like LOBSTR, Freighter, or stellar.expert, you must host a standard <code>stellar.toml</code> metadata file under your home domain. Fill in the optional fields below to live-generate your configuration file.
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12, marginBottom: 16 }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <label style={{ fontSize: 12, fontWeight: 500, color: '#374151' }}>Home Domain</label>
              <input
                className="input-field"
                placeholder="e.g. mytoken.com"
                value={tomlDomain}
                onChange={(e) => setTomlDomain(e.target.value)}
                style={{ padding: '8px 12px', fontSize: 13 }}
              />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <label style={{ fontSize: 12, fontWeight: 500, color: '#374151' }}>Logo Image URL (PNG/SVG)</label>
              <input
                className="input-field"
                placeholder="e.g. https://mytoken.com/logo.png"
                value={tomlLogo}
                onChange={(e) => setTomlLogo(e.target.value)}
                style={{ padding: '8px 12px', fontSize: 13 }}
              />
            </div>
          </div>

          <div style={{ position: 'relative', marginTop: 12 }}>
            <pre
              style={{
                background: '#0f172a',
                color: '#38bdf8',
                padding: '16px 20px',
                borderRadius: 8,
                fontSize: 12,
                fontFamily: "'DM Mono', monospace",
                lineHeight: 1.6,
                overflowX: 'auto',
                margin: 0,
              }}
            >
              {`# stellar.toml generated for $${token.symbol}
# Place this file at: https://${tomlDomain || '<your-domain>'}/.well-known/stellar.toml

[[CURRENCIES]]
code = "${token.symbol}"
issuer = "${token.address}"
display_decimals = ${token.decimals}
name = "${token.name}"
${tomlDomain ? `host = "${tomlDomain}"` : '# host = "<your-domain>"'}
${tomlLogo ? `image = "${tomlLogo}"` : '# image = "<logo-url>"'}
`}
            </pre>
            <button
              onClick={handleCopyToml}
              className="btn-secondary"
              style={{
                position: 'absolute',
                top: 10,
                right: 10,
                padding: '6px 12px',
                fontSize: 11,
                background: '#1e293b',
                color: '#cbd5e1',
                borderColor: '#334155',
              }}
            >
              {copiedToml ? <Check size={12} color="#16a34a" /> : <Copy size={12} />}
              {copiedToml ? 'Copied' : 'Copy TOML'}
            </button>
          </div>

          <div
            style={{
              marginTop: 16,
              padding: '12px 14px',
              background: '#fffbeb',
              border: '1px solid #fde68a',
              borderRadius: 8,
              fontSize: 12,
              color: '#78350f',
              lineHeight: 1.6,
            }}
          >
            <div style={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
              <CheckCircle2 size={13} color="#d97706" />
              Hosting Checklist:
            </div>
            <ul style={{ margin: 0, paddingLeft: 20 }}>
              <li>Save this code snippet exactly as <code>stellar.toml</code>.</li>
              <li>Upload it to your domain's well-known folder: <code>/.well-known/stellar.toml</code>.</li>
              <li>Configure CORS headers on your server to allow requests from any host (<code>Access-Control-Allow-Origin: *</code>) so wallet apps can fetch it.</li>
            </ul>
          </div>
        </div>

      </div>
    </div>
  )
}
