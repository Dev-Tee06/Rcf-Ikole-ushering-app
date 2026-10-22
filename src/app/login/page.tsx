'use client'

import { useState, type FormEvent } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setErrorMsg(null)

    if (!email || !password) {
      setErrorMsg('Please enter both your email address and password.')
      return
    }

    try {
      setLoading(true)
      const supabase = createClient()
      let { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      })

      // If email is not confirmed, auto-confirm it in the background and retry immediately!
      if (error && error.message.toLowerCase().includes('email not confirmed')) {
        try {
          const confirmRes = await fetch('/api/auth/confirm-user', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: email.trim() }),
          })

          if (confirmRes.ok) {
            const retry = await supabase.auth.signInWithPassword({
              email: email.trim(),
              password,
            })
            data = retry.data
            error = retry.error
          }
        } catch (confirmErr) {
          console.error('Auto-confirm attempt failed:', confirmErr)
        }
      }

      if (error) {
        setErrorMsg(error.message)
        setLoading(false)
        return
      }

      if (data?.user) {
        // Check user role
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('role, status')
          .eq('id', data.user.id)
          .single()

        if (profileError) {
          // If profile fetch fails, default to home
          router.push('/home')
        } else if (profile?.role === 'admin') {
          router.push('/admin/dashboard')
        } else {
          router.push('/home')
        }
        router.refresh()
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'An unexpected error occurred. Please try again.'
      setErrorMsg(message)
      setLoading(false)
    }
  }

  return (
    <div className="auth-container">
      {/* ========================================================
          LEFT PANEL: Branded Royal Blue Showcase (Desktop)
          ======================================================== */}
      <div className="auth-left-panel">
        {/* Subtle decorative background circles */}
        <div className="auth-decor-circle-1" />
        <div className="auth-decor-circle-2" />

        <div className="auth-left-content">
          <Link href="/landing" className="auth-brand-badge">
            <div className="auth-logo-frame">
              <Image
                src="/logo.jpg"
                alt="RCF Logo"
                width={80}
                height={80}
                priority
                className="auth-logo-img"
              />
            </div>
            <div>
              <h2 className="auth-brand-title">RCF Ikole</h2>
              <span className="auth-brand-subtitle">Ushering Unit</span>
            </div>
          </Link>

          <div className="auth-hero-copy">
            <span className="auth-tagline-pill">Gatekeepers of Divine Order</span>
            <h1 className="auth-hero-headline">Serving with Excellence, Order &amp; Prayer</h1>
            <p className="auth-hero-description">
              Welcome to the official management platform for the RCF Ikole Ushering Unit. Access your duty rosters, log your spiritual accountability tasks, and stay synchronized with upcoming services.
            </p>
          </div>

          <div className="auth-highlights">
            <div className="auth-highlight-item">
              <div className="auth-highlight-icon">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              </div>
              <div>
                <strong>Weekly Duty Rosters</strong>
                <p>Never miss a scheduled service post or arrival time</p>
              </div>
            </div>

            <div className="auth-highlight-item">
              <div className="auth-highlight-icon">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              </div>
              <div>
                <strong>Spiritual Accountability</strong>
                <p>Track personal daily prayer and Word study disciplines</p>
              </div>
            </div>

            <div className="auth-highlight-item">
              <div className="auth-highlight-icon">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              </div>
              <div>
                <strong>Dress Code Guidelines</strong>
                <p>Stay aligned with official weekly sanctuary attire</p>
              </div>
            </div>
          </div>

          <div className="auth-scripture-quote">
            <p>&ldquo;For a day in thy courts is better than a thousand. I had rather be a doorkeeper in the house of my God...&rdquo;</p>
            <cite>— Psalm 84:10</cite>
          </div>
        </div>
      </div>

      {/* ========================================================
          RIGHT PANEL: Login Form
          ======================================================== */}
      <div className="auth-right-panel">
        <div className="auth-form-card">
          {/* Mobile Brand Header */}
          <div className="auth-mobile-header">
            <Link href="/landing" className="auth-mobile-brand">
              <div className="auth-mobile-logo-frame">
                <Image
                  src="/logo.jpg"
                  alt="RCF Logo"
                  width={60}
                  height={60}
                  priority
                  className="auth-mobile-logo-img"
                />
              </div>
              <div>
                <h3 className="auth-mobile-title">RCF Ikole Ushering</h3>
                <span className="auth-mobile-subtitle">Excellence, Order &amp; Prayer</span>
              </div>
            </Link>
          </div>

          <div className="auth-form-header">
            <h2 className="auth-title">Welcome Back</h2>
            <p className="auth-subtitle">
              Enter your credentials to access your usher account.
            </p>
          </div>

          {errorMsg && (
            <div className="auth-alert-error" role="alert">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
              <span>{errorMsg}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="auth-form" noValidate>
            {/* Email Field */}
            <div className="auth-field">
              <label htmlFor="email" className="auth-label">
                Email Address
              </label>
              <div className="auth-input-wrapper">
                <span className="auth-input-icon">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="2" y="4" width="20" height="16" rx="2" />
                    <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
                  </svg>
                </span>
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  placeholder="name@rcfikole.org"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="auth-input"
                  disabled={loading}
                />
              </div>
            </div>

            {/* Password Field */}
            <div className="auth-field">
              <div className="auth-field-header">
                <label htmlFor="password" className="auth-label">
                  Password
                </label>
                <Link href="/forgot-password" className="auth-forgot-link">
                  Forgot password?
                </Link>
              </div>
              <div className="auth-input-wrapper">
                <span className="auth-input-icon">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                  </svg>
                </span>
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  required
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="auth-input"
                  style={{ paddingRight: '2.75rem' }}
                  disabled={loading}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="auth-password-toggle"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  tabIndex={-1}
                >
                  {showPassword ? (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                      <line x1="1" y1="1" x2="23" y2="23" />
                    </svg>
                  ) : (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                      <circle cx="12" cy="12" r="3" />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="auth-submit-btn"
            >
              {loading ? (
                <span className="auth-spinner-wrapper">
                  <svg className="auth-spinner" viewBox="0 0 24 24">
                    <circle className="auth-spinner-track" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="auth-spinner-head" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Signing in...
                </span>
              ) : (
                'Sign In to Unit'
              )}
            </button>
          </form>

          {/* Footer note */}
          <div className="auth-footer-prompt">
            <span>Don&apos;t have an usher account? </span>
            <Link href="/register" className="auth-prompt-link">
              Register here
            </Link>
          </div>

          <div className="auth-back-home">
            <Link href="/landing" className="auth-back-link">
              ← Return to Welcome Page
            </Link>
          </div>
        </div>
      </div>

      <style jsx>{`
        .auth-container {
          min-height: 100vh;
          display: flex;
          background-color: #ffffff;
        }

        /* LEFT PANEL */
        .auth-left-panel {
          display: none;
          position: relative;
          background: linear-gradient(135deg, #0b1d47 0%, #164098 50%, #1a4ba8 100%);
          color: #ffffff;
          overflow: hidden;
          padding: 4rem 3rem;
        }

        @media (min-width: 960px) {
          .auth-left-panel {
            display: flex;
            flex: 1 1 50%;
            flex-direction: column;
            justify-content: space-between;
          }
        }

        .auth-decor-circle-1 {
          position: absolute;
          top: -15%;
          left: -15%;
          width: 480px;
          height: 480px;
          border-radius: 50%;
          background: radial-gradient(circle, rgba(255, 255, 255, 0.08) 0%, transparent 70%);
          pointer-events: none;
        }

        .auth-decor-circle-2 {
          position: absolute;
          bottom: -10%;
          right: -10%;
          width: 520px;
          height: 520px;
          border-radius: 50%;
          background: radial-gradient(circle, rgba(56, 189, 248, 0.12) 0%, transparent 70%);
          pointer-events: none;
        }

        .auth-left-content {
          position: relative;
          z-index: 2;
          display: flex;
          flex-direction: column;
          height: 100%;
          justify-content: space-between;
          max-width: 520px;
          margin: 0 auto;
        }

        .auth-brand-badge {
          display: flex;
          align-items: center;
          gap: 1rem;
          text-decoration: none;
          color: #ffffff;
        }

        .auth-logo-frame {
          width: 80px;
          height: 80px;
          border-radius: 50%;
          background: #ffffff;
          overflow: hidden;
          border: 3.5px solid rgba(255, 255, 255, 0.45);
          box-shadow: 0 10px 25px rgba(0, 0, 0, 0.3);
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }

        :global(.auth-logo-img) {
          width: 100%;
          height: 100%;
          border-radius: 50%;
          object-fit: cover;
          display: block;
          aspect-ratio: 1 / 1;
        }

        .auth-brand-title {
          font-family: var(--font-outfit);
          font-size: 1.35rem;
          font-weight: 700;
          line-height: 1.2;
        }

        .auth-brand-subtitle {
          font-size: 0.8125rem;
          color: rgba(255, 255, 255, 0.8);
          letter-spacing: 0.05em;
          text-transform: uppercase;
        }

        .auth-hero-copy {
          margin: 2.5rem 0 2rem;
        }

        .auth-tagline-pill {
          display: inline-block;
          background: rgba(255, 255, 255, 0.12);
          color: #93c5fd;
          font-size: 0.75rem;
          font-weight: 700;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          padding: 0.35rem 0.85rem;
          border-radius: 9999px;
          margin-bottom: 1rem;
        }

        .auth-hero-headline {
          font-family: var(--font-outfit);
          font-size: 2.25rem;
          font-weight: 700;
          line-height: 1.2;
          letter-spacing: -0.02em;
          margin-bottom: 1rem;
        }

        .auth-hero-description {
          font-size: 1rem;
          line-height: 1.65;
          color: rgba(255, 255, 255, 0.85);
        }

        .auth-highlights {
          display: flex;
          flex-direction: column;
          gap: 1.25rem;
          margin-bottom: 2.5rem;
        }

        .auth-highlight-item {
          display: flex;
          align-items: flex-start;
          gap: 0.875rem;
        }

        .auth-highlight-icon {
          width: 32px;
          height: 32px;
          border-radius: 50%;
          background: rgba(255, 255, 255, 0.15);
          color: #60a5fa;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          margin-top: 2px;
        }

        .auth-highlight-item strong {
          display: block;
          font-size: 0.9375rem;
          font-weight: 600;
          color: #ffffff;
        }

        .auth-highlight-item p {
          font-size: 0.8125rem;
          color: rgba(255, 255, 255, 0.7);
          margin-top: 0.15rem;
        }

        .auth-scripture-quote {
          background: rgba(255, 255, 255, 0.08);
          border-left: 3px solid #38bdf8;
          border-radius: 0.5rem;
          padding: 1rem 1.25rem;
          font-size: 0.875rem;
          color: rgba(255, 255, 255, 0.9);
          font-style: italic;
        }

        .auth-scripture-quote cite {
          display: block;
          margin-top: 0.5rem;
          font-size: 0.75rem;
          font-style: normal;
          color: #93c5fd;
          font-weight: 600;
        }

        /* RIGHT PANEL */
        .auth-right-panel {
          flex: 1 1 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 3rem 1.5rem;
          background-color: #f8fafc;
        }

        .auth-form-card {
          width: 100%;
          max-width: 440px;
          background-color: #ffffff;
          border-radius: 1.25rem;
          padding: 2.5rem;
          box-shadow: 0 10px 30px rgba(0, 0, 0, 0.05);
          border: 1px solid #e2e8f0;
        }

        @media (max-width: 480px) {
          .auth-form-card {
            padding: 2rem 1.25rem;
            box-shadow: none;
            border: none;
            background-color: transparent;
          }
          .auth-form-header {
            text-align: center;
          }
        }

        .auth-mobile-header {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          margin-bottom: 2rem;
          text-align: center;
          width: 100%;
        }

        @media (min-width: 960px) {
          .auth-mobile-header {
            display: none;
          }
        }

        .auth-mobile-brand {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 0.75rem;
          text-decoration: none;
          color: #0f172a;
          text-align: center;
          margin: 0 auto;
        }

        .auth-mobile-logo-frame {
          width: 64px;
          height: 64px;
          border-radius: 50%;
          overflow: hidden;
          background: #ffffff;
          border: 2px solid #1a4ba8;
          box-shadow: 0 4px 14px rgba(26, 75, 168, 0.2);
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          aspect-ratio: 1 / 1;
          margin: 0 auto;
        }

        :global(.auth-mobile-logo-img) {
          width: 100%;
          height: 100%;
          border-radius: 50%;
          object-fit: cover;
          display: block;
          aspect-ratio: 1 / 1;
        }

        .auth-mobile-title {
          font-family: var(--font-outfit);
          font-size: 1.15rem;
          font-weight: 700;
          color: #1a4ba8;
        }

        .auth-mobile-subtitle {
          font-size: 0.75rem;
          color: #64748b;
        }

        .auth-form-header {
          margin-bottom: 2rem;
        }

        .auth-title {
          font-family: var(--font-outfit);
          font-size: 1.875rem;
          font-weight: 700;
          color: #0b1d47;
          letter-spacing: -0.02em;
          margin-bottom: 0.35rem;
        }

        .auth-subtitle {
          font-size: 0.9375rem;
          color: #64748b;
        }

        .auth-alert-error {
          display: flex;
          align-items: flex-start;
          gap: 0.75rem;
          background-color: #fef2f2;
          border: 1px solid #fecaca;
          color: #b91c1c;
          padding: 0.875rem 1rem;
          border-radius: 0.75rem;
          font-size: 0.875rem;
          line-height: 1.5;
          margin-bottom: 1.5rem;
        }

        .auth-form {
          display: flex;
          flex-direction: column;
          gap: 1.25rem;
        }

        .auth-field {
          display: flex;
          flex-direction: column;
          gap: 0.35rem;
        }

        .auth-field-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
        }

        .auth-label {
          font-size: 0.875rem;
          font-weight: 600;
          color: #1e293b;
        }

        .auth-forgot-link {
          font-size: 0.8125rem;
          color: #1a4ba8;
          font-weight: 600;
          transition: color 0.15s;
        }

        .auth-forgot-link:hover {
          color: #0f3180;
          text-decoration: underline;
        }

        .auth-input-wrapper {
          position: relative;
          display: flex;
          align-items: center;
        }

        .auth-input-icon {
          position: absolute;
          left: 1rem;
          color: #94a3b8;
          pointer-events: none;
          display: flex;
          align-items: center;
        }

        .auth-input {
          width: 100%;
          height: 48px;
          border-radius: 0.75rem;
          border: 1px solid #cbd5e1;
          background-color: #ffffff;
          padding: 0 1rem 0 2.75rem;
          font-size: 0.9375rem;
          color: #0f172a;
          outline: none;
          transition: border-color 0.2s, box-shadow 0.2s;
        }

        .auth-input:focus {
          border-color: #1a4ba8;
          box-shadow: 0 0 0 3px rgba(26, 75, 168, 0.15);
        }

        .auth-password-toggle {
          position: absolute;
          right: 0.85rem;
          background: none;
          border: none;
          color: #94a3b8;
          cursor: pointer;
          padding: 0.25rem;
          display: flex;
          align-items: center;
          transition: color 0.2s;
        }

        .auth-password-toggle:hover {
          color: #1e293b;
        }

        .auth-submit-btn {
          width: 100%;
          height: 48px;
          background: linear-gradient(135deg, #1a4ba8 0%, #0f3180 100%);
          color: #ffffff;
          border: none;
          border-radius: 0.75rem;
          font-weight: 600;
          font-size: 1rem;
          cursor: pointer;
          box-shadow: 0 4px 12px rgba(26, 75, 168, 0.25);
          transition: all 0.2s ease;
          display: flex;
          align-items: center;
          justify-content: center;
          margin-top: 0.5rem;
        }

        .auth-submit-btn:hover:not(:disabled) {
          transform: translateY(-1px);
          box-shadow: 0 6px 16px rgba(26, 75, 168, 0.35);
        }

        .auth-submit-btn:disabled {
          opacity: 0.7;
          cursor: not-allowed;
        }

        .auth-spinner-wrapper {
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }

        .auth-spinner {
          width: 20px;
          height: 20px;
          animation: spin 1s linear infinite;
        }

        .auth-spinner-track {
          opacity: 0.25;
        }

        .auth-spinner-head {
          opacity: 0.75;
        }

        @keyframes spin {
          from {
            transform: rotate(0deg);
          }
          to {
            transform: rotate(360deg);
          }
        }

        .auth-footer-prompt {
          text-align: center;
          font-size: 0.875rem;
          color: #64748b;
          margin-top: 1.75rem;
        }

        .auth-prompt-link {
          color: #1a4ba8;
          font-weight: 700;
          transition: color 0.15s;
        }

        .auth-prompt-link:hover {
          color: #0f3180;
          text-decoration: underline;
        }

        .auth-back-home {
          text-align: center;
          margin-top: 1.5rem;
          padding-top: 1.25rem;
          border-top: 1px solid #f1f5f9;
        }

        .auth-back-link {
          font-size: 0.8125rem;
          color: #64748b;
          transition: color 0.15s;
        }

        .auth-back-link:hover {
          color: #1a4ba8;
        }
      `}</style>
    </div>
  )
}
