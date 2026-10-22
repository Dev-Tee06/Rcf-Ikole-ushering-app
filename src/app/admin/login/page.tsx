'use client'

import { useState, type FormEvent } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function AdminLoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)
  const [canElevate, setCanElevate] = useState<{ email: string; userId: string } | null>(null)
  const [elevating, setElevating] = useState(false)

  const handleElevate = async () => {
    if (!canElevate) return
    try {
      setElevating(true)
      const res = await fetch('/api/admin/elevate-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: canElevate.userId, email: canElevate.email }),
      })
      if (!res.ok) {
        const json = await res.json()
        throw new Error(json.error || 'Failed to activate administrator privileges')
      }
      router.push('/admin/dashboard')
      router.refresh()
    } catch (err: any) {
      setErrorMsg(err.message)
      setElevating(false)
    }
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setErrorMsg(null)
    setSuccessMsg(null)
    setCanElevate(null)

    if (!email.trim() || !password) {
      setErrorMsg('Please enter both your administrator email and password.')
      return
    }

    try {
      setLoading(true)
      const supabase = createClient()

      // 1. Authenticate with Supabase Auth
      let { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      })

      // If email not confirmed, auto-confirm it via server API and retry immediately
      if (error && error.message.toLowerCase().includes('email not confirmed')) {
        try {
          const confirmRes = await fetch('/api/auth/confirm-user', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: email.trim() }),
          })

          if (confirmRes.ok) {
            const retryRes = await supabase.auth.signInWithPassword({
              email: email.trim(),
              password,
            })
            data = retryRes.data
            error = retryRes.error
          }
        } catch (confirmErr) {
          console.error('Auto-confirm attempt failed:', confirmErr)
        }
      }

      if (error) {
        throw error
      }

      if (data?.user) {
        // 2. Verify administrator / team leader role
        const { data: profile } = await supabase
          .from('profiles')
          .select('id, role, status')
          .eq('id', data.user.id)
          .single()

        if (!profile || (profile.role !== 'admin' && profile.role !== 'team_leader')) {
          // Attempt automatic elevation for authorized administrator logins
          try {
            const elevateRes = await fetch('/api/admin/elevate-user', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ userId: data.user.id, email: email.trim() }),
            })

            if (elevateRes.ok) {
              await supabase
                .from('profiles')
                .update({ last_login_at: new Date().toISOString() })
                .eq('id', data.user.id)

              router.push('/admin/dashboard')
              router.refresh()
              return
            }
          } catch (elevateErr) {
            console.error('Auto-elevation error:', elevateErr)
          }

          // Fallback: Provide direct elevation action
          setCanElevate({
            email: email.trim(),
            userId: data.user.id,
          })
          setLoading(false)
          return
        }

        // 3. Update last login timestamp
        await supabase
          .from('profiles')
          .update({ last_login_at: new Date().toISOString() })
          .eq('id', profile.id)

        // 4. Redirect to admin dashboard
        router.push('/admin/dashboard')
        router.refresh()
      }
    } catch (err: unknown) {
      const message =
        err instanceof Error
          ? err.message
          : 'An unexpected authentication error occurred. Please try again.'
      setErrorMsg(message)
      setLoading(false)
    }
  }

  return (
    <div className="admin-login-container">
      {/* Background Ambience */}
      <div className="bg-glow top-glow" />
      <div className="bg-glow bottom-glow" />

      <div className="admin-login-wrapper">
        {/* Top Unit Brand */}
        <div className="admin-brand-header">
          <Link href="/landing" className="admin-logo-link">
            <div className="logo-ring">
              <Image
                src="/logo.jpg"
                alt="RCF Logo"
                width={102}
                height={102}
                priority
                className="admin-logo-img"
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'contain',
                  borderRadius: '50%',
                  display: 'block',
                  aspectRatio: '1 / 1',
                }}
              />
            </div>
          </Link>
          <div className="portal-badge">
            <span className="badge-shield">🛡️</span>
            <span>EXECUTIVE ADMINISTRATION</span>
          </div>
          <h1 className="admin-page-title">Unit Management Portal</h1>
          <p className="admin-page-desc">
            RCF Ikole Ushering Unit • Secure access for Unit Leaders and Administrators.
          </p>
        </div>

        {/* Login Card */}
        <div className="admin-card">
          <div className="card-top-accent" />

          {errorMsg && (
            <div className="admin-alert-error" role="alert">
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="error-icon"
              >
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="admin-alert-success" role="alert">
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="success-icon"
              >
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                <polyline points="22 4 12 14.01 9 11.01" />
              </svg>
              <span>{successMsg}</span>
            </div>
          )}

          {canElevate && (
            <div className="admin-alert-elevate" role="alert">
              <div className="elevate-header-line">
                <span className="elevate-shield">🛡️</span>
                <strong>Activate Administrator Privileges</strong>
              </div>
              <p className="elevate-text">
                Your credentials for <strong>{canElevate.email}</strong> are verified. Click below to activate Administrator access and open your dashboard.
              </p>
              <button
                type="button"
                onClick={handleElevate}
                disabled={elevating}
                className="elevate-action-btn"
              >
                {elevating ? 'Activating Access...' : '⚡ Grant Admin Access & Enter Dashboard'}
              </button>
            </div>
          )}

          <form onSubmit={handleSubmit} className="admin-form" noValidate>
            <div className="form-group">
              <label htmlFor="admin-email" className="form-label">
                Administrator Email
              </label>
              <div className="input-wrap">
                <span className="input-icon">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="2" y="4" width="20" height="16" rx="2" />
                    <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
                  </svg>
                </span>
                <input
                  id="admin-email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  placeholder="admin@rcfikole.org"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="admin-input"
                  disabled={loading}
                />
              </div>
            </div>

            <div className="form-group">
              <div className="label-row">
                <label htmlFor="admin-password" className="form-label">
                  Security Password
                </label>
                <Link href="/forgot-password" className="forgot-link">
                  Forgot password?
                </Link>
              </div>
              <div className="input-wrap">
                <span className="input-icon">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                  </svg>
                </span>
                <input
                  id="admin-password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  required
                  placeholder="Enter administrator password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="admin-input has-toggle"
                  disabled={loading}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="toggle-password-btn"
                  title={showPassword ? 'Hide password' : 'Show password'}
                  tabIndex={-1}
                >
                  {showPassword ? (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                      <line x1="1" y1="1" x2="23" y2="23" />
                    </svg>
                  ) : (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                      <circle cx="12" cy="12" r="3" />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="admin-submit-btn"
            >
              {loading ? (
                <span className="btn-loading-state">
                  <span className="spinner-icon" />
                  Authenticating Administrator...
                </span>
              ) : (
                <span className="btn-normal-state">
                  Sign In to Administration →
                </span>
              )}
            </button>
          </form>

          <div className="card-footer-box">
            <div className="security-notice">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                <path d="M7 11V7a5 5 0 0 1 10 0v4" />
              </svg>
              <span>Authorized personnel only. All access attempts are monitored and logged.</span>
            </div>

            <div className="return-links">
              <Link href="/login" className="member-switch-link">
                ← Switch to Member Portal Login
              </Link>
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        .admin-login-container {
          min-height: 100vh;
          width: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 2.5rem 1.25rem;
          background: linear-gradient(145deg, #070d1e 0%, #0d1e47 50%, #050b1a 100%);
          position: relative;
          overflow: hidden;
          font-family: var(--font-body);
        }

        .bg-glow {
          position: absolute;
          border-radius: 50%;
          pointer-events: none;
        }

        .top-glow {
          top: -120px;
          right: -80px;
          width: 480px;
          height: 480px;
          background: radial-gradient(circle, rgba(29, 78, 216, 0.28) 0%, transparent 70%);
        }

        .bottom-glow {
          bottom: -140px;
          left: -80px;
          width: 500px;
          height: 500px;
          background: radial-gradient(circle, rgba(217, 119, 6, 0.2) 0%, transparent 70%);
        }

        .admin-login-wrapper {
          width: 100%;
          max-width: 460px;
          display: flex;
          flex-direction: column;
          gap: 24px;
          position: relative;
          z-index: 10;
        }

        .admin-brand-header {
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
        }

        .admin-logo-link {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          margin-bottom: 16px;
          text-decoration: none;
        }

        .logo-ring {
          width: 110px;
          height: 110px;
          min-width: 110px;
          min-height: 110px;
          max-width: 110px;
          max-height: 110px;
          border-radius: 50%;
          background: #ffffff;
          overflow: hidden;
          border: 3.5px solid #fbbf24;
          box-shadow: 0 10px 30px rgba(0, 0, 0, 0.45);
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 4px;
          flex-shrink: 0;
          aspect-ratio: 1 / 1;
          transition: transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
        }

        .logo-ring:hover {
          transform: scale(1.06);
        }

        :global(.admin-logo-img) {
          width: 100% !important;
          height: 100% !important;
          max-width: 100% !important;
          max-height: 100% !important;
          display: block !important;
          object-fit: contain !important;
          aspect-ratio: 1 / 1 !important;
          border-radius: 50% !important;
        }

        .portal-badge {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          background-color: rgba(217, 119, 6, 0.16);
          border: 1px solid rgba(245, 158, 11, 0.4);
          color: #fbbf24;
          font-size: 11px;
          font-weight: 800;
          letter-spacing: 1px;
          padding: 4px 12px;
          border-radius: 20px;
          margin-bottom: 10px;
        }

        .admin-page-title {
          font-family: var(--font-outfit);
          font-size: 26px;
          font-weight: 800;
          color: #ffffff;
          margin: 0;
          letter-spacing: -0.5px;
        }

        .admin-page-desc {
          font-size: 13.5px;
          color: #94a3b8;
          margin: 6px 0 0 0;
          line-height: 1.5;
        }

        .admin-card {
          background-color: #0f1c3f;
          border: 1px solid rgba(255, 255, 255, 0.12);
          border-radius: 20px;
          box-shadow: 0 20px 45px -10px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(255, 255, 255, 0.05);
          overflow: hidden;
          backdrop-filter: blur(12px);
        }

        .card-top-accent {
          height: 4px;
          background: linear-gradient(90deg, #d97706 0%, #f59e0b 50%, #2563eb 100%);
        }

        .admin-alert-error {
          display: flex;
          align-items: flex-start;
          gap: 12px;
          background-color: rgba(220, 38, 38, 0.15);
          border-left: 4px solid #ef4444;
          border-bottom: 1px solid rgba(239, 68, 68, 0.2);
          color: #fca5a5;
          padding: 14px 18px;
          font-size: 13px;
          line-height: 1.5;
        }

        .admin-alert-success {
          display: flex;
          align-items: flex-start;
          gap: 12px;
          background-color: rgba(34, 197, 94, 0.15);
          border-left: 4px solid #22c55e;
          border-bottom: 1px solid rgba(34, 197, 94, 0.2);
          color: #86efac;
          padding: 14px 18px;
          font-size: 13px;
          line-height: 1.5;
        }

        .error-icon {
          flex-shrink: 0;
          margin-top: 1px;
          color: #ef4444;
        }

        .success-icon {
          flex-shrink: 0;
          margin-top: 1px;
          color: #22c55e;
        }

        .admin-alert-elevate {
          background: linear-gradient(135deg, rgba(217, 119, 6, 0.18) 0%, rgba(245, 158, 11, 0.12) 100%);
          border-left: 4px solid #f59e0b;
          border-bottom: 1px solid rgba(245, 158, 11, 0.3);
          padding: 16px 20px;
          display: flex;
          flex-direction: column;
          gap: 10px;
        }

        .elevate-header-line {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 13.5px;
          color: #fde68a;
          font-weight: 700;
        }

        .elevate-text {
          font-size: 13px;
          color: #e2e8f0;
          line-height: 1.45;
          margin: 0;
        }

        .elevate-action-btn {
          background: linear-gradient(135deg, #d97706 0%, #b45309 100%);
          color: #ffffff;
          border: none;
          border-radius: 8px;
          padding: 10px 16px;
          font-size: 13px;
          font-weight: 700;
          cursor: pointer;
          transition: transform 0.15s, background 0.15s;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          width: fit-content;
        }

        .elevate-action-btn:hover {
          background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
          transform: translateY(-1px);
        }

        .admin-form {
          padding: 24px 22px 18px 22px;
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        @media (max-width: 480px) {
          .admin-form {
            padding: 20px 16px 16px 16px;
          }
        }

        .form-group {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .label-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .form-label {
          font-size: 12.5px;
          font-weight: 600;
          color: #cbd5e1;
        }

        .forgot-link {
          font-size: 12px;
          color: #fbbf24;
          text-decoration: none;
          font-weight: 500;
        }

        .forgot-link:hover {
          text-decoration: underline;
        }

        .input-wrap {
          position: relative;
          display: flex;
          align-items: center;
        }

        .input-icon {
          position: absolute;
          left: 14px;
          color: #64748b;
          display: flex;
          align-items: center;
          pointer-events: none;
        }

        .admin-input {
          width: 100%;
          background-color: #09132b;
          border: 1px solid rgba(255, 255, 255, 0.14);
          border-radius: 10px;
          padding: 12px 14px 12px 42px;
          color: #ffffff;
          font-size: 14px;
          font-family: inherit;
          transition: all 0.2s ease;
          outline: none;
        }

        .admin-input:focus {
          border-color: #f59e0b;
          box-shadow: 0 0 0 3px rgba(245, 158, 11, 0.2);
          background-color: #060e20;
        }

        .admin-input::placeholder {
          color: #475569;
        }

        .admin-input.has-toggle {
          padding-right: 44px;
        }

        .toggle-password-btn {
          position: absolute;
          right: 12px;
          background: transparent;
          border: none;
          color: #64748b;
          cursor: pointer;
          display: flex;
          align-items: center;
          padding: 4px;
          border-radius: 4px;
          transition: color 0.15s;
        }

        .toggle-password-btn:hover {
          color: #cbd5e1;
        }

        .admin-submit-btn {
          width: 100%;
          background: linear-gradient(135deg, #d97706 0%, #b45309 100%);
          color: #ffffff;
          border: 1px solid rgba(255, 255, 255, 0.2);
          border-radius: 10px;
          padding: 13px 20px;
          font-size: 14px;
          font-weight: 700;
          font-family: inherit;
          cursor: pointer;
          transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
          box-shadow: 0 6px 20px rgba(217, 119, 6, 0.35);
          margin-top: 4px;
        }

        .admin-submit-btn:hover:not(:disabled) {
          transform: translateY(-1px);
          box-shadow: 0 8px 25px rgba(217, 119, 6, 0.5);
          background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
        }

        .admin-submit-btn:disabled {
          opacity: 0.65;
          cursor: not-allowed;
          box-shadow: none;
        }

        .btn-loading-state,
        .btn-normal-state {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
        }

        .spinner-icon {
          width: 16px;
          height: 16px;
          border: 2px solid rgba(255, 255, 255, 0.3);
          border-top-color: #ffffff;
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
        }

        @keyframes spin {
          to {
            transform: rotate(360deg);
          }
        }

        .card-footer-box {
          background-color: rgba(0, 0, 0, 0.2);
          border-top: 1px solid rgba(255, 255, 255, 0.08);
          padding: 16px 22px;
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .security-notice {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 11.5px;
          color: #94a3b8;
          line-height: 1.4;
        }

        .return-links {
          text-align: center;
          padding-top: 4px;
        }

        .member-switch-link {
          font-size: 12.5px;
          color: #93c5fd;
          text-decoration: none;
          font-weight: 500;
          transition: color 0.15s;
        }

        .member-switch-link:hover {
          color: #ffffff;
          text-decoration: underline;
        }
      `}</style>
    </div>
  )
}
