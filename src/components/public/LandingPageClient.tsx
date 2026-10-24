'use client'

import Image from 'next/image'
import Link from 'next/link'

interface DressCode {
  id: string
  applicable_sunday: string
  instructions: string
  image_url?: string | null
  status: string
  published_at?: string | null
}

interface Sermon {
  id: string
  title: string
  preacher: string
  description?: string | null
  spotify_url: string
  cover_image_url?: string | null
  relevant_week: string
  is_current?: boolean
}

export interface LandingPageClientProps {
  dressCode?: DressCode | null
  sermon?: Sermon | null
  content?: Record<string, string>
}

export function LandingPageClient({
  dressCode,
  sermon,
  content = {},
}: LandingPageClientProps) {
  // Content defaults
  const unitIntro =
    content.unit_introduction ||
    'The RCF Ikole Ushering Unit stands as the gatekeepers and ambassadors of reverence, warmth, and order within God’s sanctuary. We are devoted believers called to facilitate an atmosphere where worshippers meet God unhindered.'

  const unitPurpose =
    content.unit_purpose ||
    'To foster divine order, heartfelt service, and fervent prayer in every service, ensuring every congregant is welcomed into an environment of love, honor, and spiritual readiness.'

  const apkDownloadUrl = 'https://github.com/Dev-Tee06/Rcf-Ikole-ushering-app/releases/download/v1.1.0/rcf-ikole-ushering.apk'

  return (
    <>
      <div
        className="landing-wrapper"
        style={{
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          backgroundColor: '#ffffff',
          color: '#0f172a',
        }}
      >
        {/* ========================================================
            HERO SECTION
            ======================================================== */}
        <section
          style={{
            position: 'relative',
            background: 'linear-gradient(135deg, #164098 0%, #1a4ba8 45%, #0b1d47 100%)',
            color: '#ffffff',
            paddingTop: '4.5rem',
            paddingBottom: '0',
            overflow: 'hidden',
          }}
        >
          {/* Subtle decorative circles */}
          <div
            style={{
              position: 'absolute',
              top: '-10%',
              left: '-5%',
              width: '420px',
              height: '420px',
              borderRadius: '50%',
              background: 'radial-gradient(circle, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0) 70%)',
              pointerEvents: 'none',
            }}
          />
          <div
            style={{
              position: 'absolute',
              bottom: '15%',
              right: '-8%',
              width: '500px',
              height: '500px',
              borderRadius: '50%',
              background: 'radial-gradient(circle, rgba(56,189,248,0.12) 0%, rgba(56,189,248,0) 70%)',
              pointerEvents: 'none',
            }}
          />

          <div
            style={{
              maxWidth: '1120px',
              margin: '0 auto',
              padding: '0 1.5rem',
              textAlign: 'center',
              position: 'relative',
              zIndex: 2,
            }}
          >
            {/* Logo Badge */}
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: '1.75rem',
                position: 'relative',
              }}
            >
              <div
                style={{
                  width: '140px',
                  height: '140px',
                  borderRadius: '50%',
                  overflow: 'hidden',
                  border: '4px solid rgba(255, 255, 255, 0.4)',
                  boxShadow: '0 16px 40px rgba(0, 0, 0, 0.5)',
                  backgroundColor: '#ffffff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Image
                  src="/logo.jpg"
                  alt="RCF Ikole Ushering Unit"
                  width={140}
                  height={140}
                  priority
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                    borderRadius: '50%',
                    display: 'block',
                  }}
                />
              </div>
            </div>

            {/* Title */}
            <h1
              style={{
                fontFamily: 'var(--font-outfit)',
                fontSize: 'clamp(2.25rem, 5vw, 3.75rem)',
                fontWeight: 800,
                lineHeight: 1.15,
                letterSpacing: '-0.03em',
                marginBottom: '1rem',
                textShadow: '0 2px 10px rgba(0,0,0,0.2)',
              }}
            >
              RCF Ikole Ushering Unit
            </h1>

            {/* Subtitle */}
            <p
              style={{
                fontSize: 'clamp(1rem, 2vw, 1.25rem)',
                fontWeight: 500,
                maxWidth: '680px',
                margin: '0 auto 2.25rem',
                color: 'rgba(255, 255, 255, 0.92)',
                lineHeight: 1.6,
                letterSpacing: '0.01em',
              }}
            >
              Watchmen at the Gates — Serving with Excellence, Order &amp; Prayer
            </p>

            {/* CTA Buttons */}
            <div
              style={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: '1rem',
                justifyContent: 'center',
                alignItems: 'center',
                marginBottom: '2rem',
              }}
            >
              <Link
                href="/register"
                style={{
                  backgroundColor: '#ffffff',
                  color: '#1a4ba8',
                  padding: '0.875rem 2rem',
                  borderRadius: '9999px',
                  fontWeight: 700,
                  fontSize: '1rem',
                  boxShadow: '0 10px 25px -3px rgba(0, 0, 0, 0.2)',
                  transition: 'all 0.25s ease',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.transform = 'translateY(-2px)'
                  e.currentTarget.style.boxShadow = '0 14px 28px -3px rgba(0, 0, 0, 0.28)'
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)'
                  e.currentTarget.style.boxShadow = '0 10px 25px -3px rgba(0, 0, 0, 0.2)'
                }}
              >
                Create Account
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M5 12h14M12 5l7 7-7 7" />
                </svg>
              </Link>

              <Link
                href="/login"
                style={{
                  backgroundColor: 'transparent',
                  color: '#ffffff',
                  border: '2px solid rgba(255, 255, 255, 0.85)',
                  padding: '0.8125rem 2rem',
                  borderRadius: '9999px',
                  fontWeight: 600,
                  fontSize: '1rem',
                  transition: 'all 0.25s ease',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.15)'
                  e.currentTarget.style.borderColor = '#ffffff'
                  e.currentTarget.style.transform = 'translateY(-2px)'
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.backgroundColor = 'transparent'
                  e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.85)'
                  e.currentTarget.style.transform = 'translateY(0)'
                }}
              >
                Sign In
              </Link>

              {apkDownloadUrl && (
                <a
                  href={apkDownloadUrl}
                  download="rcf-ikole-ushering.apk"
                  style={{
                    backgroundColor: 'rgba(255, 255, 255, 0.12)',
                    backdropFilter: 'blur(8px)',
                    color: '#ffffff',
                    border: '1px solid rgba(255, 255, 255, 0.3)',
                    padding: '0.8125rem 1.75rem',
                    borderRadius: '9999px',
                    fontWeight: 600,
                    fontSize: '0.9375rem',
                    transition: 'all 0.25s ease',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                  }}
                  onMouseOver={(e) => {
                    e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.22)'
                    e.currentTarget.style.transform = 'translateY(-2px)'
                  }}
                  onMouseOut={(e) => {
                    e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.12)'
                    e.currentTarget.style.transform = 'translateY(0)'
                  }}
                >
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
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                    <polyline points="7 10 12 15 17 10" />
                    <line x1="12" y1="15" x2="12" y2="3" />
                  </svg>
                  Download Android App
                </a>
              )}
            </div>

            {/* Scripture Pill */}
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.5rem',
                background: 'rgba(255, 255, 255, 0.1)',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                borderRadius: '9999px',
                padding: '0.5rem 1.25rem',
                fontSize: '0.875rem',
                color: 'rgba(255, 255, 255, 0.95)',
                marginBottom: '2.5rem',
              }}
            >
              <span>✨</span>
              <span>Psalm 84:10 — &ldquo;Better is one day in your courts than a thousand elsewhere&rdquo;</span>
            </div>
          </div>

          {/* Curved SVG Wave Bottom */}
          <div style={{ lineHeight: 0, width: '100%' }}>
            <svg
              viewBox="0 0 1440 100"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              style={{ display: 'block', width: '100%', height: 'auto' }}
            >
              <path
                d="M0,32L80,48C160,64,320,96,480,96C640,96,800,64,960,53.3C1120,43,1280,53,1360,58.7L1440,64L1440,100L1360,100C1280,100,1120,100,960,100C800,100,640,100,480,100C320,100,160,100,80,100L0,100Z"
                fill="#f8fafc"
              />
            </svg>
          </div>
        </section>

        {/* ========================================================
            INTRODUCTION SECTION
            ======================================================== */}
        <section
          style={{
            backgroundColor: '#f8fafc',
            padding: '4rem 1.5rem',
          }}
        >
          <div
            style={{
              maxWidth: '1120px',
              margin: '0 auto',
            }}
          >
            {/* Header */}
            <div style={{ textAlign: 'center', marginBottom: '3.5rem' }}>
              <span
                style={{
                  display: 'inline-block',
                  color: '#1a4ba8',
                  fontSize: '0.875rem',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: '0.1em',
                  marginBottom: '0.5rem',
                }}
              >
                Our Calling &amp; Heritage
              </span>
              <h2
                style={{
                  fontFamily: 'var(--font-outfit)',
                  fontSize: 'clamp(1.875rem, 3.5vw, 2.5rem)',
                  fontWeight: 700,
                  color: '#0b1d47',
                  letterSpacing: '-0.02em',
                  marginBottom: '1rem',
                }}
              >
                Watchmen at the Sanctuary Gates
              </h2>
              <p
                style={{
                  maxWidth: '720px',
                  margin: '0 auto',
                  color: '#475569',
                  fontSize: '1.0625rem',
                  lineHeight: 1.7,
                }}
              >
                {unitIntro}
              </p>
            </div>

            {/* Purpose Callout Card */}
            <div
              style={{
                backgroundColor: '#ffffff',
                border: '1px solid #e2e8f0',
                borderLeft: '6px solid #1a4ba8',
                borderRadius: '1rem',
                padding: '2rem',
                marginBottom: '3rem',
                boxShadow: '0 4px 14px rgba(0, 0, 0, 0.04)',
              }}
            >
              <h3
                style={{
                  fontFamily: 'var(--font-outfit)',
                  fontSize: '1.25rem',
                  fontWeight: 700,
                  color: '#1a4ba8',
                  marginBottom: '0.5rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                }}
              >
                <svg
                  width="22"
                  height="22"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#1a4ba8"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                </svg>
                Our Core Purpose
              </h3>
              <p
                style={{
                  color: '#334155',
                  fontSize: '1.0625rem',
                  lineHeight: 1.7,
                }}
              >
                {unitPurpose}
              </p>
            </div>

            {/* Four Core Pillars / Values */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
                gap: '1.5rem',
              }}
            >
              {/* Card 1: Service */}
              <div
                style={{
                  backgroundColor: '#ffffff',
                  padding: '2rem 1.5rem',
                  borderRadius: '1rem',
                  border: '1px solid #e2e8f0',
                  boxShadow: '0 4px 12px rgba(0, 0, 0, 0.03)',
                  transition: 'transform 0.25s ease, box-shadow 0.25s ease',
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.transform = 'translateY(-4px)'
                  e.currentTarget.style.boxShadow = '0 12px 24px -4px rgba(26, 75, 168, 0.12)'
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)'
                  e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.03)'
                }}
              >
                <div
                  style={{
                    width: '48px',
                    height: '48px',
                    borderRadius: '0.75rem',
                    backgroundColor: '#eff6ff',
                    color: '#1a4ba8',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginBottom: '1.25rem',
                  }}
                >
                  <svg
                    width="24"
                    height="24"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                    <circle cx="9" cy="7" r="4" />
                    <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                    <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                  </svg>
                </div>
                <h4
                  style={{
                    fontFamily: 'var(--font-outfit)',
                    fontSize: '1.2rem',
                    fontWeight: 700,
                    color: '#0f172a',
                    marginBottom: '0.5rem',
                  }}
                >
                  Exemplary Service
                </h4>
                <p
                  style={{
                    color: '#64748b',
                    fontSize: '0.9375rem',
                    lineHeight: 1.6,
                  }}
                >
                  Serving every soul with Christlike humility, warm hospitality, and undivided attentiveness.
                </p>
              </div>

              {/* Card 2: Order */}
              <div
                style={{
                  backgroundColor: '#ffffff',
                  padding: '2rem 1.5rem',
                  borderRadius: '1rem',
                  border: '1px solid #e2e8f0',
                  boxShadow: '0 4px 12px rgba(0, 0, 0, 0.03)',
                  transition: 'transform 0.25s ease, box-shadow 0.25s ease',
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.transform = 'translateY(-4px)'
                  e.currentTarget.style.boxShadow = '0 12px 24px -4px rgba(26, 75, 168, 0.12)'
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)'
                  e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.03)'
                }}
              >
                <div
                  style={{
                    width: '48px',
                    height: '48px',
                    borderRadius: '0.75rem',
                    backgroundColor: '#eff6ff',
                    color: '#1a4ba8',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginBottom: '1.25rem',
                  }}
                >
                  <svg
                    width="24"
                    height="24"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <polyline points="9 11 12 14 22 4" />
                    <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
                  </svg>
                </div>
                <h4
                  style={{
                    fontFamily: 'var(--font-outfit)',
                    fontSize: '1.2rem',
                    fontWeight: 700,
                    color: '#0f172a',
                    marginBottom: '0.5rem',
                  }}
                >
                  Divine Order
                </h4>
                <p
                  style={{
                    color: '#64748b',
                    fontSize: '0.9375rem',
                    lineHeight: 1.6,
                  }}
                >
                  Executing sanctuary protocols with precision, synchrony, and discipline in 1 Cor 14:40 order.
                </p>
              </div>

              {/* Card 3: Prayer */}
              <div
                style={{
                  backgroundColor: '#ffffff',
                  padding: '2rem 1.5rem',
                  borderRadius: '1rem',
                  border: '1px solid #e2e8f0',
                  boxShadow: '0 4px 12px rgba(0, 0, 0, 0.03)',
                  transition: 'transform 0.25s ease, box-shadow 0.25s ease',
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.transform = 'translateY(-4px)'
                  e.currentTarget.style.boxShadow = '0 12px 24px -4px rgba(26, 75, 168, 0.12)'
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)'
                  e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.03)'
                }}
              >
                <div
                  style={{
                    width: '48px',
                    height: '48px',
                    borderRadius: '0.75rem',
                    backgroundColor: '#eff6ff',
                    color: '#1a4ba8',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginBottom: '1.25rem',
                  }}
                >
                  <svg
                    width="24"
                    height="24"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
                  </svg>
                </div>
                <h4
                  style={{
                    fontFamily: 'var(--font-outfit)',
                    fontSize: '1.2rem',
                    fontWeight: 700,
                    color: '#0f172a',
                    marginBottom: '0.5rem',
                  }}
                >
                  Fervent Prayer
                </h4>
                <p
                  style={{
                    color: '#64748b',
                    fontSize: '0.9375rem',
                    lineHeight: 1.6,
                  }}
                >
                  Standing on the watchtower spiritually, upholding every service, speaker, and worshipper.
                </p>
              </div>

              {/* Card 4: Spiritual Growth */}
              <div
                style={{
                  backgroundColor: '#ffffff',
                  padding: '2rem 1.5rem',
                  borderRadius: '1rem',
                  border: '1px solid #e2e8f0',
                  boxShadow: '0 4px 12px rgba(0, 0, 0, 0.03)',
                  transition: 'transform 0.25s ease, box-shadow 0.25s ease',
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.transform = 'translateY(-4px)'
                  e.currentTarget.style.boxShadow = '0 12px 24px -4px rgba(26, 75, 168, 0.12)'
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)'
                  e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.03)'
                }}
              >
                <div
                  style={{
                    width: '48px',
                    height: '48px',
                    borderRadius: '0.75rem',
                    backgroundColor: '#eff6ff',
                    color: '#1a4ba8',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginBottom: '1.25rem',
                  }}
                >
                  <svg
                    width="24"
                    height="24"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
                    <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
                  </svg>
                </div>
                <h4
                  style={{
                    fontFamily: 'var(--font-outfit)',
                    fontSize: '1.2rem',
                    fontWeight: 700,
                    color: '#0f172a',
                    marginBottom: '0.5rem',
                  }}
                >
                  Spiritual Growth
                </h4>
                <p
                  style={{
                    color: '#64748b',
                    fontSize: '0.9375rem',
                    lineHeight: 1.6,
                  }}
                >
                  Daily personal accountability in Bible study and prayer, maturing together in Christ.
                </p>
              </div>
            </div>
          </div>
        </section>



        {/* ========================================================
            DOWNLOAD MOBILE APP BANNER SECTION
            ======================================================== */}
        <section
          style={{
            backgroundColor: '#f8fafc',
            padding: '5rem 1.5rem',
            borderTop: '1px solid #e2e8f0',
          }}
        >
          <div
            style={{
              maxWidth: '960px',
              margin: '0 auto',
              background: 'linear-gradient(135deg, #164098 0%, #1a4ba8 50%, #0b1d47 100%)',
              borderRadius: '1.5rem',
              padding: '3.5rem 2.5rem',
              color: '#ffffff',
              boxShadow: '0 20px 40px rgba(15, 29, 71, 0.18)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              textAlign: 'center',
              position: 'relative',
              overflow: 'hidden',
            }}
          >
            {/* Background glowing rings */}
            <div
              style={{
                position: 'absolute',
                top: '-40%',
                right: '-10%',
                width: '350px',
                height: '350px',
                borderRadius: '50%',
                background: 'radial-gradient(circle, rgba(56,189,248,0.18) 0%, rgba(56,189,248,0) 70%)',
                pointerEvents: 'none',
              }}
            />

            {/* App Icon Frame */}
            <div
              style={{
                width: '76px',
                height: '76px',
                borderRadius: '50%',
                overflow: 'hidden',
                background: '#ffffff',
                border: '3px solid rgba(255, 255, 255, 0.4)',
                boxShadow: '0 8px 24px rgba(0, 0, 0, 0.25)',
                marginBottom: '1.5rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <Image
                src="/logo.jpg"
                alt="RCF Ikole Ushering App"
                width={76}
                height={76}
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                  borderRadius: '50%',
                  aspectRatio: '1 / 1',
                }}
              />
            </div>

            <span
              style={{
                display: 'inline-block',
                backgroundColor: 'rgba(255, 255, 255, 0.15)',
                color: '#93c5fd',
                fontSize: '0.75rem',
                fontWeight: 700,
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
                padding: '0.35rem 0.85rem',
                borderRadius: '9999px',
                marginBottom: '1rem',
              }}
            >
              Official Android Application
            </span>

            <h3
              style={{
                fontFamily: 'var(--font-outfit)',
                fontSize: 'clamp(1.5rem, 3vw, 2.25rem)',
                fontWeight: 700,
                marginBottom: '0.85rem',
                color: '#ffffff',
                lineHeight: 1.25,
              }}
            >
              Carry RCF Ikole Ushering Everywhere
            </h3>

            <p
              style={{
                fontSize: '1rem',
                color: 'rgba(255, 255, 255, 0.88)',
                maxWidth: '640px',
                margin: '0 auto 2rem',
                lineHeight: 1.6,
              }}
            >
              Install the official APK directly on your Android phone. Access weekly duty posts, Sunday attire guidelines, service attendance, and daily Word &amp; Prayer accountability seamlessly.
            </p>

            <div
              style={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: '1rem',
                justifyContent: 'center',
                alignItems: 'center',
              }}
            >
              <a
                href={apkDownloadUrl}
                download="rcf-ikole-ushering.apk"
                style={{
                  backgroundColor: '#ffffff',
                  color: '#1a4ba8',
                  padding: '0.95rem 2.25rem',
                  borderRadius: '9999px',
                  fontWeight: 700,
                  fontSize: '1.05rem',
                  boxShadow: '0 10px 25px rgba(0, 0, 0, 0.25)',
                  transition: 'all 0.25s ease',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.65rem',
                  textDecoration: 'none',
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.transform = 'translateY(-2px)'
                  e.currentTarget.style.boxShadow = '0 14px 28px rgba(0, 0, 0, 0.35)'
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)'
                  e.currentTarget.style.boxShadow = '0 10px 25px rgba(0, 0, 0, 0.25)'
                }}
              >
                <svg
                  width="22"
                  height="22"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="7 10 12 15 17 10" />
                  <line x1="12" y1="15" x2="12" y2="3" />
                </svg>
                Download APK
              </a>
            </div>

            <span
              style={{
                fontSize: '0.8125rem',
                color: 'rgba(255, 255, 255, 0.65)',
                marginTop: '1.25rem',
              }}
            >
              Compatible with Android 7.0 and newer • Direct sideload APK
            </span>
            <p style={{ fontSize: '0.8125rem', color: 'rgba(255, 255, 255, 0.72)', marginTop: '0.75rem' }}>
              If the download does not start, tap the button again or <a href={apkDownloadUrl} style={{ color: '#ffffff', textDecoration: 'underline' }}>retry the APK download</a>.
            </p>
          </div>
        </section>

        {/* ========================================================
            FOOTER
            ======================================================== */}
        <footer
          style={{
            backgroundColor: '#081330',
            color: '#94a3b8',
            padding: '3rem 1.5rem 2rem',
            borderTop: '1px solid rgba(255, 255, 255, 0.08)',
          }}
        >
          <div
            style={{
              maxWidth: '1120px',
              margin: '0 auto',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              textAlign: 'center',
              gap: '1.5rem',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <Image
                src="/logo.jpg"
                alt="RCF Logo"
                width={48}
                height={48}
                style={{
                  borderRadius: '50%',
                  objectFit: 'cover',
                  border: '2px solid rgba(255, 255, 255, 0.4)',
                }}
              />
              <span
                style={{
                  fontFamily: 'var(--font-outfit)',
                  fontSize: '1.125rem',
                  fontWeight: 700,
                  color: '#ffffff',
                }}
              >
                RCF Ikole Ushering Unit
              </span>
            </div>

            <p style={{ fontSize: '0.875rem', color: '#64748b' }}>
              Serving with Excellence, Order &amp; Prayer • Redeemed Christian Fellowship, Ikole Campus
            </p>



            <div
              style={{
                width: '100%',
                maxWidth: '600px',
                height: '1px',
                backgroundColor: 'rgba(255, 255, 255, 0.08)',
                marginTop: '0.5rem',
              }}
            />

            <p style={{ fontSize: '0.8125rem', color: '#475569' }}>
              © {new Date().getFullYear()} RCF Ikole Ushering Unit. All rights reserved.
            </p>
          </div>
        </footer>
      </div>
    </>
  )
}
