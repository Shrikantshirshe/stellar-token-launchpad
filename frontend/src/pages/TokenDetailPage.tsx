import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { ArrowLeft, Copy, Check, ExternalLink, Loader2 } from 'lucide-react'
import { useLaunchpad } from '../hooks/useLaunchpad'
import { type TokenInfo, formatAmount, shortenAddress } from '../lib/stellar'
import { LAUNCHPAD_CONTRACT_ID } from '../lib/constants'
import toast from 'react-hot-toast'

const TOKEN_COLORS = [
  { bg: '#eff6ff', text: '#1d4ed8', border: '#bfdbfe' },
  { bg: '#f0fdf4', text: '#15803d', border: '#bbf7d0' },
  { bg: '#fdf4ff', text: '#7e22ce', border: '#e9d5ff' },
  { bg: '#fff7ed', text: '#c2410c', border: '#fed7aa' },
  { bg: '#ecfeff', text: '#0e7490', border: '#a5f3fc' },
  { bg: '#fef2f2', text: '#b91c1c', border: '#fecaca' },
]

export default function TokenDetailPage() {
  const { address } = useParams<{ address: string }>()
  const [token, setToken] = useState<TokenInfo | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [copiedAddress, setCopiedAddress] = useState(false)
  const [copiedCreator, setCopiedCreator] = useState(false)
  const { fetchTokens, fetchTokenCount } = useLaunchpad()

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
        // Fetch all tokens to find the one matching this address
        const count = await fetchTokenCount()
        if (count === 0) {
          setError('Token not found')
          return
        }
        // Fetch in batches of 50 until we find the token
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

        {/* Inter-contract call info */}
        <div className="glass-card" style={{ padding: '20px 24px' }}>
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
                desc: `Minted ${Number(formattedSupply).toLocaleString()} ${token.symbol} to creator`,
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
      </div>
    </div>
  )
}
