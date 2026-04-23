import { Link } from 'react-router-dom'
import { ArrowLeft, Rocket } from 'lucide-react'

export default function NotFoundPage() {
  return (
    <div
      style={{
        background: '#f8fafc',
        minHeight: '100vh',
        paddingTop: 64,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '80px 24px',
      }}
    >
      <div style={{ maxWidth: 480, width: '100%', textAlign: 'center' }}>
        <div className="glass-card" style={{ padding: '56px 40px' }}>
          {/* Icon */}
          <div
            style={{
              width: 72,
              height: 72,
              borderRadius: 20,
              background: '#eff6ff',
              border: '1px solid #bfdbfe',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 24px',
            }}
          >
            <Rocket size={32} color="#2563eb" />
          </div>

          {/* 404 */}
          <div
            style={{
              fontFamily: "'DM Sans', sans-serif",
              fontSize: 72,
              fontWeight: 700,
              color: '#e2e8f0',
              letterSpacing: '-0.04em',
              lineHeight: 1,
              marginBottom: 16,
            }}
          >
            404
          </div>

          <h1
            style={{
              fontFamily: "'DM Sans', sans-serif",
              fontSize: 22,
              fontWeight: 700,
              color: '#0f172a',
              marginBottom: 10,
              letterSpacing: '-0.02em',
            }}
          >
            Page not found
          </h1>

          <p
            style={{
              fontSize: 14,
              color: '#64748b',
              lineHeight: 1.7,
              marginBottom: 32,
            }}
          >
            The page you're looking for doesn't exist or has been moved.
          </p>

          <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link to="/" className="btn-primary" style={{ padding: '10px 20px' }}>
              <ArrowLeft size={15} />
              Go Home
            </Link>
            <Link to="/explore" className="btn-secondary" style={{ padding: '10px 20px' }}>
              Explore Tokens
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
