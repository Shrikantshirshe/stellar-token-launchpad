import { useState } from 'react'
import { ExternalLink, Rocket, CheckCircle, Info } from 'lucide-react'
import LaunchForm from '../components/LaunchForm'

const TIPS = [
  { title: 'Choose a clear symbol', desc: 'Keep it 3–5 uppercase letters. Symbols are permanent once deployed.' },
  { title: 'Decimals matter', desc: '7 is the Stellar standard. Use 18 only if you need EVM-style precision.' },
  { title: 'Initial supply is minted to you', desc: 'The full supply goes to your wallet. You can mint more later as admin.' },
  { title: 'You own the admin key', desc: 'After launch, admin rights transfer to your wallet. The launchpad has no control.' },
]

export default function LaunchPage() {
  const [lastTxHash, setLastTxHash] = useState<string | null>(null)

  return (
    <div style={{ background: '#f8fafc', minHeight: '100vh', paddingTop: 64 }}>
      {/* Page header */}
      <div style={{ background: 'white', borderBottom: '1px solid #e2e8f0', padding: '40px 24px 32px' }}>
        <div style={{ maxWidth: 900, margin: '0 auto' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: 10,
                background: '#eff6ff',
                border: '1px solid #bfdbfe',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Rocket size={17} color="#2563eb" />
            </div>
            <span style={{ fontSize: 12, color: '#2563eb', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              Token Launcher
            </span>
          </div>
          <h1
            style={{
              fontFamily: "'DM Sans', sans-serif",
              fontSize: 'clamp(24px, 4vw, 36px)',
              fontWeight: 700,
              color: '#0f172a',
              letterSpacing: '-0.02em',
              marginBottom: 8,
            }}
          >
            Launch a new token
          </h1>
          <p style={{ fontSize: 15, color: '#64748b', maxWidth: 520 }}>
            Deploy a SEP-41 compliant token to Stellar Testnet via Soroban smart contracts.
            Your token is live the moment the transaction confirms.
          </p>
        </div>
      </div>

      {/* Content */}
      <div
        className="launch-page-grid"
        style={{
          maxWidth: 900,
          margin: '0 auto',
          padding: '40px 24px 80px',
          display: 'grid',
          gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 380px)',
          gap: 32,
          alignItems: 'start',
        }}
      >
        {/* Left: form */}
        <div>
          <div className="glass-card" style={{ padding: 32 }}>
            <LaunchForm onSuccess={setLastTxHash} />

            {lastTxHash && (
              <div
                style={{
                  marginTop: 20,
                  padding: '16px 20px',
                  background: '#f0fdf4',
                  border: '1px solid #bbf7d0',
                  borderRadius: 12,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 12,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <CheckCircle size={18} color="#16a34a" />
                  <div>
                    <div style={{ fontSize: 13, color: '#15803d', fontWeight: 600, marginBottom: 2 }}>
                      Token launched successfully
                    </div>
                    <div style={{ fontSize: 12, color: '#64748b', fontFamily: "'DM Mono', monospace" }}>
                      {lastTxHash.slice(0, 24)}...
                    </div>
                  </div>
                </div>
                <a
                  href={`https://stellar.expert/explorer/testnet/tx/${lastTxHash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ color: '#16a34a', display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, textDecoration: 'none', fontWeight: 500, whiteSpace: 'nowrap' }}
                >
                  View tx <ExternalLink size={12} />
                </a>
              </div>
            )}
          </div>
        </div>

        {/* Right: tips + info */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* Tips */}
          <div className="glass-card" style={{ padding: '24px 20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
              <Info size={15} color="#2563eb" />
              <span style={{ fontSize: 13, fontWeight: 600, color: '#0f172a' }}>Before you launch</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {TIPS.map(({ title, desc }) => (
                <div key={title} style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                  <div
                    style={{
                      width: 6,
                      height: 6,
                      borderRadius: '50%',
                      background: '#2563eb',
                      marginTop: 6,
                      flexShrink: 0,
                    }}
                  />
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: '#0f172a', marginBottom: 2 }}>{title}</div>
                    <div style={{ fontSize: 12, color: '#64748b', lineHeight: 1.6 }}>{desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* What happens */}
          <div className="glass-card" style={{ padding: '24px 20px' }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: '#0f172a', marginBottom: 14 }}>
              What happens on launch
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {[
                { label: 'Deploy token contract', sub: 'A fresh Soroban contract is deployed with a deterministic salt' },
                { label: 'Initialize token', sub: 'Name, symbol, and decimals are set via inter-contract call' },
                { label: 'Mint initial supply', sub: 'Full supply is minted to your wallet address' },
                { label: 'Transfer admin', sub: 'Admin rights move from launchpad to you permanently' },
              ].map(({ label, sub }, i) => (
                <div key={label} style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
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
                      marginTop: 1,
                    }}
                  >
                    {i + 1}
                  </div>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 500, color: '#0f172a' }}>{label}</div>
                    <div style={{ fontSize: 12, color: '#94a3b8', lineHeight: 1.5 }}>{sub}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Network info */}
          <div
            style={{
              padding: '14px 16px',
              background: '#fffbeb',
              border: '1px solid #fde68a',
              borderRadius: 12,
            }}
          >
            <div style={{ fontSize: 12, fontWeight: 600, color: '#92400e', marginBottom: 4 }}>
              Testnet only
            </div>
            <div style={{ fontSize: 12, color: '#78350f', lineHeight: 1.6 }}>
              This app runs on Stellar Testnet. Tokens have no real-world value. Use Friendbot to get free XLM for transaction fees.
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
