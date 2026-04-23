import { ExternalLink, Copy, Check } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { type TokenInfo, formatAmount, shortenAddress } from '../lib/stellar'
import toast from 'react-hot-toast'

const TOKEN_COLORS = [
  { bg: '#eff6ff', text: '#1d4ed8' },
  { bg: '#f0fdf4', text: '#15803d' },
  { bg: '#fdf4ff', text: '#7e22ce' },
  { bg: '#fff7ed', text: '#c2410c' },
  { bg: '#ecfeff', text: '#0e7490' },
  { bg: '#fef2f2', text: '#b91c1c' },
]

interface TokenCardProps {
  token: TokenInfo
  index?: number
}

export default function TokenCard({ token, index = 0 }: TokenCardProps) {
  const [copied, setCopied] = useState(false)

  const handleCopy = async (text: string) => {
    await navigator.clipboard.writeText(text)
    setCopied(true)
    toast.success('Address copied')
    setTimeout(() => setCopied(false), 2000)
  }

  const formattedSupply = formatAmount(token.initial_supply, token.decimals)
  const createdDate = new Date(Number(token.created_at) * 1000).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })

  const colorSet = TOKEN_COLORS[token.symbol.charCodeAt(0) % TOKEN_COLORS.length]

  return (
    <div
      className="glass-card animate-fade-in"
      style={{
        padding: 24,
        animationDelay: `${index * 60}ms`,
        display: 'flex',
        flexDirection: 'column',
        gap: 16,
      }}
    >
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
        <Link
          to={`/explore/token/${token.address}`}
          style={{ display: 'flex', alignItems: 'center', gap: 12, textDecoration: 'none', flex: 1, minWidth: 0 }}
        >
          <div
            style={{
              width: 44,
              height: 44,
              borderRadius: 12,
              background: colorSet.bg,
              border: `1px solid ${colorSet.text}22`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 14,
              fontWeight: 700,
              color: colorSet.text,
              flexShrink: 0,
              fontFamily: "'DM Sans', sans-serif",
            }}
          >
            {token.symbol.slice(0, 2).toUpperCase()}
          </div>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontWeight: 600, fontSize: 15, color: '#0f172a' }}>{token.name}</div>
            <div style={{ fontSize: 12, color: '#2563eb', fontWeight: 600, marginTop: 2 }}>
              ${token.symbol}
            </div>
          </div>
        </Link>
        <span className="badge badge-accent">{token.decimals}dp</span>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        <div
          style={{
            padding: '10px 12px',
            background: '#f8fafc',
            borderRadius: 8,
            border: '1px solid #e2e8f0',
          }}
        >
          <div style={{ fontSize: 10, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>
            Total Supply
          </div>
          <div style={{ fontSize: 13, fontWeight: 600, color: '#0f172a', fontFamily: "'DM Mono', monospace" }}>
            {Number(formattedSupply).toLocaleString()}
          </div>
        </div>
        <div
          style={{
            padding: '10px 12px',
            background: '#f8fafc',
            borderRadius: 8,
            border: '1px solid #e2e8f0',
          }}
        >
          <div style={{ fontSize: 10, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>
            Launched
          </div>
          <div style={{ fontSize: 13, fontWeight: 600, color: '#0f172a' }}>{createdDate}</div>
        </div>
      </div>

      {/* Contract address */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '8px 12px',
          background: '#f8fafc',
          borderRadius: 8,
          border: '1px solid #e2e8f0',
        }}
      >
        <div>
          <div style={{ fontSize: 10, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 2 }}>
            Contract
          </div>
          <span style={{ fontSize: 12, color: '#475569', fontFamily: "'DM Mono', monospace" }}>
            {shortenAddress(token.address, 8)}
          </span>
        </div>
        <div style={{ display: 'flex', gap: 4 }}>
          <button
            onClick={() => handleCopy(token.address)}
            title="Copy address"
            style={{
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              color: '#94a3b8',
              padding: 5,
              borderRadius: 6,
              display: 'flex',
              alignItems: 'center',
              transition: 'color 0.15s',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.color = '#2563eb' }}
            onMouseLeave={(e) => { e.currentTarget.style.color = '#94a3b8' }}
          >
            {copied ? <Check size={14} color="#16a34a" /> : <Copy size={14} />}
          </button>
          <a
            href={`https://stellar.expert/explorer/testnet/contract/${token.address}`}
            target="_blank"
            rel="noopener noreferrer"
            title="View on Stellar Expert"
            style={{
              color: '#94a3b8',
              padding: 5,
              borderRadius: 6,
              display: 'flex',
              alignItems: 'center',
              transition: 'color 0.15s',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.color = '#2563eb' }}
            onMouseLeave={(e) => { e.currentTarget.style.color = '#94a3b8' }}
          >
            <ExternalLink size={14} />
          </a>
        </div>
      </div>

      {/* Creator */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <div
          style={{
            width: 18,
            height: 18,
            borderRadius: '50%',
            background: `hsl(${(token.creator.charCodeAt(2) * 53) % 360}, 55%, 85%)`,
            flexShrink: 0,
          }}
        />
        <span style={{ fontSize: 11, color: '#94a3b8' }}>by</span>
        <span style={{ fontSize: 11, color: '#64748b', fontFamily: "'DM Mono', monospace" }}>
          {shortenAddress(token.creator, 6)}
        </span>
      </div>
    </div>
  )
}
