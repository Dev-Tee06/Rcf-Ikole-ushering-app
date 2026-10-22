'use client'

import { useState, type FormEvent } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setErrorMsg(null)

    if (!email.trim()) {
      setErrorMsg('Please enter your registered email address.')
      return
    }

    try {
      setLoading(true)
      const supabase = createClient()
      const origin = typeof window !== 'undefined' ? window.location.origin : ''

      const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: `${origin}/reset-password`,
      })

      if (error) {
        setErrorMsg(error.message)
        setLoading(false)
        return
      }

      setSubmitted(true)
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : 'An error occurred. Please try again.'
      setErrorMsg(message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="forgot-container">
      {/* Background accents */}
      <div className="forgot-bg-glow-top" />
      <div className="forgot-bg-glow-bottom" />

      <div className="forgot-card">
        {/* Logo and Brand */}
        <div className="forgot-brand-header">
          <Link href="/landing" className="forgot-logo-wrapper">
            <Image
              src="/logo.jpg"
              alt="RCF Logo"
              width={76}
              height={76}
              priority
              className="forgot-logo-img"
            />
          </Link>
          <h1 className="forgot-unit-title">RCF Ikole Ushering Unit</h1>
          <p className="forgot-unit-tagline">Serving with Excellence, Order &amp; Prayer</p>
        </div>

        {submitted ? (
          <div className="forgot-success-view">
            <div className="forgot-success-icon-wrapper">
              <svg
                width="36"
                height="36"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#16a34a"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                <polyline points="22 4 12 14.01 9 11.01" />
              </svg>
            </div>

            <h2 className="forgot-title">Reset Link Sent</h2>

            <p className="forgot-description">
              If an account is associated with <strong>{email}</strong>, you will receive an email shortly with instructions to reset your password.
            </p>

            <div className="forgot-info-box">
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#1a4ba8"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="16" x2="12" y2="12" />
                <line x1="12" y1="8" x2="12.01" y2="8" />
              </svg>
              <span>
                Please check your inbox as well as your Spam or Junk folder. The password reset link expires after 24 hours.
              </span>
            </div>

            <Link href="/login" className="forgot-submit-btn" style={{ textDecoration: 'none' }}>
              Back to Sign In
            </Link>

            <button
              type="button"
              onClick={() => {
                setSubmitted(false)
                setEmail('')
              }}
              className="forgot-resend-btn"
            >
              Try another email address
            </button>
          </div>
        ) : (
          <div className="forgot-form-view">
            <div className="forgot-text-header">
              <h2 className="forgot-title">Reset Your Password</h2>
              <p className="forgot-description">
                Enter your registered email address below. We&apos;ll email you a secure link to reset your account password.
              </p>
            </div>

            {errorMsg && (
              <div className="forgot-alert-error" role="alert">
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="8" x2="12" y2="12" />
                  <line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
                <span>{errorMsg}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="forgot-form" noValidate>
              <div className="forgot-field">
                <label htmlFor="email" className="forgot-label">
                  Registered Email Address
                </label>
                <div className="forgot-input-wrapper">
                  <span className="forgot-input-icon">
                    <svg
                      width="18"
                      height="18"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
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
                    className="forgot-input"
                    disabled={loading}
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="forgot-submit-btn"
              >
                {loading ? (
                  <span className="forgot-spinner-wrapper">
                    <svg className="forgot-spinner" viewBox="0 0 24 24">
                      <circle
                        className="forgot-spinner-track"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                        fill="none"
                      />
                      <path
                        className="forgot-spinner-head"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      />
                    </svg>
                    Sending Reset Link...
                  </span>
                ) : (
                  'Send Reset Link'
                )}
              </button>
            </form>

            <div className="forgot-footer">
              <Link href="/login" className="forgot-back-link">
                ← Back to Sign In
              </Link>
            </div>
          </div>
        )}
      </div>

      <style jsx>{`
        .forgot-container {
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 2.5rem 1.25rem;
          background: linear-gradient(145deg, #f0f6ff 0%, #ffffff 50%, #eff6ff 100%);
          position: relative;
          overflow: hidden;
        }

        .forgot-bg-glow-top {
          position: absolute;
          top: -100px;
          right: -100px;
          width: 420px;
          height: 420px;
          border-radius: 50%;
          background: radial-gradient(circle, rgba(26, 75, 168, 0.08) 0%, transparent 70%);
          pointer-events: none;
        }

        .forgot-bg-glow-bottom {
          position: absolute;
          bottom: -100px;
          left: -100px;
          width: 460px;
          height: 460px;
          border-radius: 50%;
          background: radial-gradient(circle, rgba(56, 189, 248, 0.1) 0%, transparent 70%);
          pointer-events: none;
        }

        .forgot-card {
          width: 100%;
          max-width: 460px;
          background-color: #ffffff;
          border-radius: 1.5rem;
          padding: 2.75rem 2.25rem;
          box-shadow: 0 20px 40px -10px rgba(15, 49, 128, 0.1), 0 1px 3px rgba(0, 0, 0, 0.05);
          border: 1px solid #e2e8f0;
          position: relative;
          z-index: 10;
        }

        @media (max-width: 480px) {
          .forgot-card {
            padding: 2rem 1.5rem;
            border-radius: 1.25rem;
          }
        }

        .forgot-brand-header {
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
          margin-bottom: 2rem;
        }

        .forgot-logo-wrapper {
          display: inline-block;
          border-radius: 50%;
          padding: 4px;
          background: #eff6ff;
          box-shadow: 0 8px 20px rgba(26, 75, 168, 0.15);
          margin-bottom: 1rem;
          transition: transform 0.2s ease;
        }

        .forgot-logo-wrapper:hover {
          transform: scale(1.05);
        }

        .forgot-logo-img {
          border-radius: 50%;
          object-fit: cover;
          display: block;
        }

        .forgot-unit-title {
          font-family: var(--font-outfit);
          font-size: 1.35rem;
          font-weight: 700;
          color: #0b1d47;
          letter-spacing: -0.01em;
          margin-bottom: 0.25rem;
        }

        .forgot-unit-tagline {
          font-size: 0.8125rem;
          font-weight: 500;
          color: #64748b;
        }

        .forgot-text-header {
          text-align: center;
          margin-bottom: 1.75rem;
        }

        .forgot-title {
          font-family: var(--font-outfit);
          font-size: 1.625rem;
          font-weight: 700;
          color: #0f172a;
          letter-spacing: -0.02em;
          margin-bottom: 0.5rem;
        }

        .forgot-description {
          font-size: 0.9375rem;
          color: #64748b;
          line-height: 1.6;
        }

        .forgot-alert-error {
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

        .forgot-form {
          display: flex;
          flex-direction: column;
          gap: 1.25rem;
        }

        .forgot-field {
          display: flex;
          flex-direction: column;
          gap: 0.35rem;
        }

        .forgot-label {
          font-size: 0.875rem;
          font-weight: 600;
          color: #1e293b;
        }

        .forgot-input-wrapper {
          position: relative;
          display: flex;
          align-items: center;
        }

        .forgot-input-icon {
          position: absolute;
          left: 1rem;
          color: #94a3b8;
          pointer-events: none;
          display: flex;
          align-items: center;
        }

        .forgot-input {
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

        .forgot-input:focus {
          border-color: #1a4ba8;
          box-shadow: 0 0 0 3px rgba(26, 75, 168, 0.15);
        }

        .forgot-submit-btn {
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

        .forgot-submit-btn:hover:not(:disabled) {
          transform: translateY(-1px);
          box-shadow: 0 6px 16px rgba(26, 75, 168, 0.35);
        }

        .forgot-submit-btn:disabled {
          opacity: 0.7;
          cursor: not-allowed;
        }

        .forgot-spinner-wrapper {
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }

        .forgot-spinner {
          width: 20px;
          height: 20px;
          animation: spin 1s linear infinite;
        }

        .forgot-spinner-track {
          opacity: 0.25;
        }

        .forgot-spinner-head {
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

        .forgot-footer {
          text-align: center;
          margin-top: 1.75rem;
          padding-top: 1.25rem;
          border-top: 1px solid #f1f5f9;
        }

        .forgot-back-link {
          font-size: 0.875rem;
          font-weight: 600;
          color: #1a4ba8;
          transition: color 0.15s;
        }

        .forgot-back-link:hover {
          color: #0f3180;
          text-decoration: underline;
        }

        /* SUCCESS STATE */
        .forgot-success-view {
          text-align: center;
          display: flex;
          flex-direction: column;
          align-items: center;
        }

        .forgot-success-icon-wrapper {
          width: 68px;
          height: 68px;
          border-radius: 50%;
          background-color: #dcfce7;
          display: flex;
          align-items: center;
          justify-content: center;
          margin-bottom: 1.25rem;
          box-shadow: 0 8px 16px rgba(34, 197, 94, 0.15);
        }

        .forgot-info-box {
          background-color: #eff6ff;
          border: 1px solid #dbeafe;
          border-radius: 0.75rem;
          padding: 1rem;
          display: flex;
          align-items: flex-start;
          gap: 0.75rem;
          font-size: 0.8125rem;
          color: #1e3a8a;
          line-height: 1.5;
          text-align: left;
          margin: 1.5rem 0 1.75rem;
        }

        .forgot-resend-btn {
          margin-top: 1.25rem;
          background: none;
          border: none;
          font-size: 0.875rem;
          color: #64748b;
          cursor: pointer;
          text-decoration: underline;
          text-underline-offset: 3px;
          transition: color 0.15s;
        }

        .forgot-resend-btn:hover {
          color: #1a4ba8;
        }
      `}</style>
    </div>
  )
}
