import { Zap, Shield, Globe, ArrowRight, CheckCircle, Layers, Users, Code2, ChevronRight, Rocket, TrendingUp, Lock } from 'lucide-react'
import { Link } from 'react-router-dom'

const FEATURES = [
  {
    icon: Zap,
    title: 'Launch in seconds',
    desc: 'Fill out a simple form and your SEP-41 token is live on Stellar Testnet. No CLI, no config files, no waiting.',
    color: '#2563eb',
    bg: 'linear-gradient(135deg, #eff6ff, #dbeafe)',
    border: '#bfdbfe',
  },
  {
    icon: Shield,
    title: 'Fully on-chain',
    desc: 'Every token is deployed via Soroban smart contracts. Initialization, minting, and admin transfer happen atomically in a single transaction.',
    color: '#16a34a',
    bg: 'linear-gradient(135deg, #f0fdf4, #dcfce7)',
    border: '#bbf7d0',
  },
  {
    icon: Globe,
    title: 'Open registry',
    desc: 'Every launched token is indexed in the launchpad contract. Browse the full registry, filter by creator, and verify on Stellar Expert.',
    color: '#7c3aed',
    bg: 'linear-gradient(135deg, #f5f3ff, #ede9fe)',
    border: '#ddd6fe',
  },
  {
    icon: Layers,
    title: 'SEP-41 compliant',
    desc: 'Tokens follow the Stellar Ecosystem Proposal 41 standard — compatible with wallets, DEXes, and any Soroban-aware application.',
    color: '#0891b2',
    bg: 'linear-gradient(135deg, #ecfeff, #cffafe)',
    border: '#a5f3fc',
  },
  {
    icon: Users,
    title: 'Creator dashboard',
    desc: "Track every token you've launched from a single dashboard. See supply, decimals, contract address, and launch date at a glance.",
    color: '#d97706',
    bg: 'linear-gradient(135deg, #fffbeb, #fef3c7)',
    border: '#fde68a',
  },
  {
    icon: Code2,
    title: 'Open source',
    desc: 'The launchpad and token contracts are fully open source. Fork them, audit them, or build your own launchpad on top.',
    color: '#dc2626',
    bg: 'linear-gradient(135deg, #fef2f2, #fee2e2)',
    border: '#fecaca',
  },
]

const HOW_IT_WORKS = [
  {
    step: '01',
    title: 'Connect your Freighter wallet',
    desc: 'Install the Freighter browser extension and connect to Stellar Testnet. Fund your account with free XLM from Friendbot — one click inside the app.',
    color: '#2563eb',
    bg: '#eff6ff',
  },
  {
    step: '02',
    title: 'Fill in your token details',
    desc: 'Give your token a name, symbol, decimal precision, initial supply, and a description. A live preview shows exactly what will be deployed before you confirm.',
    color: '#7c3aed',
    bg: '#f5f3ff',
  },
  {
    step: '03',
    title: 'Sign and deploy',
    desc: 'Approve the transaction in Freighter. The launchpad contract deploys a fresh token contract, mints your supply, and transfers admin rights to you — all in one atomic call.',
    color: '#0891b2',
    bg: '#ecfeff',
  },
  {
    step: '04',
    title: 'Your token is live',
    desc: 'The token contract address is recorded in the registry. Share it, list it on the DEX, or integrate it. You own the admin key.',
    color: '#16a34a',
    bg: '#f0fdf4',
  },
]

const STATS = [
  { value: 'SEP-41', label: 'Token Standard', color: '#2563eb', bg: '#eff6ff' },
  { value: 'Soroban', label: 'Smart Contracts', color: '#7c3aed', bg: '#f5f3ff' },
  { value: '1-click', label: 'Deployment', color: '#16a34a', bg: '#f0fdf4' },
  { value: 'Atomic', label: 'Transactions', color: '#0891b2', bg: '#ecfeff' },
]

export default function HomePage() {
  return (
    <div style={{ position: 'relative' }}>

      {/* Hero */}
      <section
        style={{
          background: 'linear-gradient(135deg, #0f172a 0%, #1e1b4b 40%, #0f172a 100%)',
          padding: '120px 24px 100px',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Background blobs */}
        <div style={{ position: 'absolute', top: -100, left: -100, width: 500, height: 500, borderRadius: '50%', background: 'radial-gradient(circle, rgba(37,99,235,0.15) 0%, transparent 70%)', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', bottom: -80, right: -80, width: 400, height: 400, borderRadius: '50%', background: 'radial-gradient(circle, rgba(124,58,237,0.15) 0%, transparent 70%)', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', top: '40%', left: '60%', width: 300, height: 300, borderRadius: '50%', background: 'radial-gradient(circle, rgba(8,145,178,0.1) 0%, transparent 70%)', pointerEvents: 'none' }} />

        <div style={{ maxWidth: 760, margin: '0 auto', textAlign: 'center', position: 'relative', zIndex: 1 }}>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              padding: '6px 16px',
              borderRadius: 20,
              background: 'rgba(37,99,235,0.15)',
              border: '1px solid rgba(37,99,235,0.4)',
              marginBottom: 28,
            }}
          >
            <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#60a5fa', boxShadow: '0 0 8px #60a5fa' }} />
            <span style={{ fontSize: 12, color: '#93c5fd', fontWeight: 600, letterSpacing: '0.06em' }}>
              STELLAR TESTNET · SOROBAN SMART CONTRACTS
            </span>
          </div>

          <h1
            style={{
              fontFamily: "'DM Sans', sans-serif",
              fontSize: 'clamp(38px, 6vw, 68px)',
              fontWeight: 700,
              lineHeight: 1.08,
              letterSpacing: '-0.03em',
              color: '#f8fafc',
              marginBottom: 24,
            }}
          >
            Launch your token
            <br />
            <span style={{
              background: 'linear-gradient(135deg, #60a5fa, #a78bfa, #34d399)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
            }}>
              on Stellar
            </span>
          </h1>

          <p style={{ fontSize: 18, color: '#94a3b8', lineHeight: 1.7, maxWidth: 520, margin: '0 auto 44px' }}>
            TokenLaunch deploys SEP-41 compliant tokens to the Stellar blockchain using Soroban smart contracts.
            Connect your wallet, fill a form, and you're done.
          </p>

          <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link to="/launch" className="btn-primary" style={{ padding: '14px 32px', fontSize: 15, background: 'linear-gradient(135deg, #2563eb, #7c3aed)', boxShadow: '0 4px 24px rgba(37,99,235,0.4)' }}>
              Launch a Token
              <ArrowRight size={16} />
            </Link>
            <Link to="/explore" style={{
              display: 'inline-flex', alignItems: 'center', gap: 8,
              padding: '14px 28px', fontSize: 15, fontWeight: 500,
              color: '#94a3b8', border: '1.5px solid rgba(148,163,184,0.3)',
              borderRadius: 10, textDecoration: 'none', transition: 'all 0.2s',
              background: 'rgba(255,255,255,0.04)',
            }}>
              Explore Tokens
            </Link>
          </div>

          <div style={{ marginTop: 44, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 24, flexWrap: 'wrap' }}>
            {['No coding required', 'Free on Testnet', 'Open source contracts'].map((item) => (
              <div key={item} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <CheckCircle size={14} color="#34d399" />
                <span style={{ fontSize: 13, color: '#64748b' }}>{item}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Stats bar */}
      <section style={{ background: 'white', borderBottom: '1px solid #e2e8f0', padding: '0 24px' }}>
        <div style={{ maxWidth: 900, margin: '0 auto', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))' }}>
          {STATS.map(({ value, label, color, bg }) => (
            <div key={label} style={{ textAlign: 'center', padding: '28px 16px', borderRight: '1px solid #f1f5f9' }}>
              <div style={{
                display: 'inline-block',
                padding: '4px 14px',
                borderRadius: 20,
                background: bg,
                marginBottom: 8,
              }}>
                <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 20, fontWeight: 700, color }}>
                  {value}
                </span>
              </div>
              <div style={{ fontSize: 12, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                {label}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section style={{ padding: '88px 24px', background: '#f8fafc' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 56 }}>
            <div style={{ fontSize: 12, color: '#2563eb', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 12 }}>
              Why TokenLaunch
            </div>
            <h2 style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 'clamp(26px, 4vw, 40px)', fontWeight: 700, color: '#0f172a', letterSpacing: '-0.02em', marginBottom: 14 }}>
              Everything you need to ship a token
            </h2>
            <p style={{ fontSize: 16, color: '#64748b', maxWidth: 480, margin: '0 auto' }}>
              Built on Soroban, Stellar's smart contract platform. Designed for developers and non-developers alike.
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 20 }}>
            {FEATURES.map(({ icon: Icon, title, desc, color, bg, border }) => (
              <div
                key={title}
                style={{
                  background: 'white',
                  border: `1px solid ${border}`,
                  borderRadius: 16,
                  padding: '28px 24px',
                  transition: 'transform 0.2s, box-shadow 0.2s',
                }}
                onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = `0 8px 24px ${border}` }}
                onMouseLeave={(e) => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = 'none' }}
              >
                <div style={{ width: 48, height: 48, borderRadius: 14, background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
                  <Icon size={22} color={color} />
                </div>
                <div style={{ fontWeight: 600, fontSize: 15, color: '#0f172a', marginBottom: 8 }}>{title}</div>
                <div style={{ fontSize: 14, color: '#64748b', lineHeight: 1.65 }}>{desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works — colorful steps */}
      <section style={{ padding: '88px 24px', background: 'white', borderTop: '1px solid #e2e8f0' }}>
        <div style={{ maxWidth: 960, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 56 }}>
            <div style={{ fontSize: 12, color: '#7c3aed', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 12 }}>
              How it works
            </div>
            <h2 style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 'clamp(26px, 4vw, 40px)', fontWeight: 700, color: '#0f172a', letterSpacing: '-0.02em', marginBottom: 14 }}>
              From zero to token in four steps
            </h2>
            <p style={{ fontSize: 16, color: '#64748b', maxWidth: 440, margin: '0 auto' }}>
              The whole process takes under two minutes.
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 20 }}>
            {HOW_IT_WORKS.map(({ step, title, desc, color, bg }) => (
              <div
                key={step}
                style={{
                  background: bg,
                  borderRadius: 16,
                  padding: '28px 22px',
                  position: 'relative',
                  overflow: 'hidden',
                }}
              >
                <div style={{
                  position: 'absolute', top: -10, right: -10,
                  fontSize: 72, fontWeight: 800, color,
                  opacity: 0.07, fontFamily: "'DM Sans', sans-serif",
                  lineHeight: 1, userSelect: 'none',
                }}>
                  {step}
                </div>
                <div style={{
                  width: 32, height: 32, borderRadius: 10,
                  background: color, display: 'flex', alignItems: 'center',
                  justifyContent: 'center', marginBottom: 16,
                  fontSize: 13, fontWeight: 700, color: 'white',
                  fontFamily: "'DM Sans', sans-serif",
                }}>
                  {step}
                </div>
                <div style={{ fontWeight: 600, fontSize: 14, color: '#0f172a', marginBottom: 8 }}>{title}</div>
                <div style={{ fontSize: 13, color: '#64748b', lineHeight: 1.6 }}>{desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Use cases banner */}
      <section style={{ padding: '88px 24px', background: 'linear-gradient(135deg, #1e1b4b 0%, #0f172a 100%)' }}>
        <div style={{ maxWidth: 1000, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 52 }}>
            <div style={{ fontSize: 12, color: '#a78bfa', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 12 }}>
              Use cases
            </div>
            <h2 style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 'clamp(24px, 3.5vw, 36px)', fontWeight: 700, color: '#f1f5f9', letterSpacing: '-0.02em' }}>
              What people build with TokenLaunch
            </h2>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 16 }}>
            {[
              { icon: Users, title: 'Community tokens', desc: 'Reward your community, run governance votes, or gate access to exclusive content.', color: '#a78bfa' },
              { icon: TrendingUp, title: 'Project fundraising', desc: 'Issue tokens for your project and distribute them to early supporters and contributors.', color: '#34d399' },
              { icon: Lock, title: 'Loyalty programs', desc: 'Create a points system for your app or business that lives on-chain and is fully auditable.', color: '#60a5fa' },
              { icon: Rocket, title: 'Experiments & learning', desc: 'The fastest way to understand how Soroban token contracts work — deploy one in minutes.', color: '#fb923c' },
            ].map(({ icon: Icon, title, desc, color }) => (
              <div key={title} style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 14, padding: '24px 20px' }}>
                <div style={{ width: 40, height: 40, borderRadius: 10, background: `${color}20`, border: `1px solid ${color}40`, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 14 }}>
                  <Icon size={18} color={color} />
                </div>
                <div style={{ fontWeight: 600, fontSize: 14, color: '#f1f5f9', marginBottom: 6 }}>{title}</div>
                <div style={{ fontSize: 13, color: '#64748b', lineHeight: 1.6 }}>{desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Contract architecture */}
      <section style={{ padding: '88px 24px', background: '#f8fafc' }}>
        <div style={{ maxWidth: 900, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 48 }}>
            <div style={{ fontSize: 12, color: '#0891b2', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 12 }}>
              Under the hood
            </div>
            <h2 style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 'clamp(24px, 3.5vw, 36px)', fontWeight: 700, color: '#0f172a', letterSpacing: '-0.02em', marginBottom: 14 }}>
              Inter-contract architecture
            </h2>
            <p style={{ fontSize: 15, color: '#64748b', maxWidth: 480, margin: '0 auto' }}>
              Three inter-contract calls in one atomic transaction — no partial states, no manual steps.
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 16 }}>
            {[
              { num: '1', label: 'initialize()', desc: 'Sets admin, decimals, name, and symbol on the freshly deployed token contract.', color: '#2563eb', bg: '#eff6ff', border: '#bfdbfe' },
              { num: '2', label: 'mint()', desc: "Mints the full initial supply directly to the creator's wallet address.", color: '#16a34a', bg: '#f0fdf4', border: '#bbf7d0' },
              { num: '3', label: 'set_admin()', desc: 'Transfers admin rights from the launchpad to the creator — you own your token.', color: '#7c3aed', bg: '#f5f3ff', border: '#ddd6fe' },
            ].map(({ num, label, desc, color, bg, border }) => (
              <div key={num} style={{ background: bg, border: `1px solid ${border}`, borderRadius: 14, padding: '24px 20px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                  <div style={{ width: 28, height: 28, borderRadius: 8, background: color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, color: 'white' }}>
                    {num}
                  </div>
                  <code style={{ fontSize: 13, fontFamily: "'DM Mono', monospace", color, fontWeight: 600 }}>{label}</code>
                </div>
                <div style={{ fontSize: 13, color: '#64748b', lineHeight: 1.6 }}>{desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section style={{ padding: '88px 24px', background: 'linear-gradient(135deg, #2563eb 0%, #7c3aed 100%)', textAlign: 'center' }}>
        <div style={{ maxWidth: 560, margin: '0 auto' }}>
          <h2 style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 'clamp(26px, 4vw, 40px)', fontWeight: 700, color: 'white', letterSpacing: '-0.02em', marginBottom: 16 }}>
            Ready to launch your token?
          </h2>
          <p style={{ fontSize: 16, color: 'rgba(255,255,255,0.7)', marginBottom: 36, lineHeight: 1.6 }}>
            It's free on Testnet. Connect your Freighter wallet and deploy your first token in under two minutes.
          </p>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link to="/launch" style={{
              display: 'inline-flex', alignItems: 'center', gap: 8,
              padding: '14px 32px', fontSize: 15, fontWeight: 600,
              background: 'white', color: '#2563eb', borderRadius: 10,
              textDecoration: 'none', transition: 'all 0.2s',
              boxShadow: '0 4px 16px rgba(0,0,0,0.15)',
            }}>
              Get started <ChevronRight size={16} />
            </Link>
            <Link to="/explore" style={{
              display: 'inline-flex', alignItems: 'center', gap: 8,
              padding: '14px 28px', fontSize: 15, fontWeight: 500,
              background: 'rgba(255,255,255,0.12)', color: 'white',
              border: '1.5px solid rgba(255,255,255,0.3)', borderRadius: 10,
              textDecoration: 'none',
            }}>
              Browse tokens
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer style={{ background: '#0f172a', borderTop: '1px solid #1e293b', padding: '24px', textAlign: 'center' }}>
        <p style={{ fontSize: 13, color: '#475569' }}>
          Built on Stellar · Powered by Soroban · Open source
        </p>
      </footer>
    </div>
  )
}
