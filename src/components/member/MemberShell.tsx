'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Profile } from '@/types/database'

interface MemberShellProps {
  profile: Profile
  children: React.ReactNode
}

interface NavItem {
  name: string
  href: string
  icon: (active: boolean) => React.ReactNode
}

export function MemberShell({ profile, children }: MemberShellProps) {
  const pathname = usePathname()
  const router = useRouter()
  const [loggingOut, setLoggingOut] = useState(false)

  const handleLogout = async () => {
    try {
      setLoggingOut(true)
      const supabase = createClient()
      await supabase.auth.signOut()
      router.push('/landing')
    } catch (err) {
      console.error('Logout error:', err)
      router.push('/landing')
    } finally {
      setLoggingOut(false)
    }
  }

  const navItems: NavItem[] = [
    {
      name: 'Home',
      href: '/home',
      icon: (active: boolean) => (
        <svg
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke={active ? '#ffffff' : 'currentColor'}
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
          <polyline points="9 22 9 12 15 12 15 22" />
        </svg>
      ),
    },
    {
      name: 'Services',
      href: '/services',
      icon: (active: boolean) => (
        <svg
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke={active ? '#ffffff' : 'currentColor'}
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
          <line x1="16" y1="2" x2="16" y2="6" />
          <line x1="8" y1="2" x2="8" y2="6" />
          <line x1="3" y1="10" x2="21" y2="10" />
        </svg>
      ),
    },
    {
      name: 'Accountability',
      href: '/accountability',
      icon: (active: boolean) => (
        <svg
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke={active ? '#ffffff' : 'currentColor'}
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
          <polyline points="22 4 12 14.01 9 11.01" />
        </svg>
      ),
    },
    {
      name: 'Attendance',
      href: '/attendance',
      icon: (active: boolean) => (
        <svg
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke={active ? '#ffffff' : 'currentColor'}
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
          <rect x="8" y="2" width="8" height="4" rx="1" ry="1" />
        </svg>
      ),
    },
    {
      name: 'Profile',
      href: '/profile',
      icon: (active: boolean) => (
        <svg
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke={active ? '#ffffff' : 'currentColor'}
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
          <circle cx="12" cy="7" r="4" />
        </svg>
      ),
    },
  ]

  const isNavActive = (href: string) => {
    if (href === '/home') {
      return pathname === '/home' || pathname === '/'
    }
    return pathname === href || pathname.startsWith(`${href}/`)
  }

  const getInitials = (name: string) => {
    if (!name) return 'U'
    const parts = name.trim().split(/\s+/)
    if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase()
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
  }

  return (
    <div className="member-layout">
      {/* ================= DESKTOP SIDEBAR ================= */}
      <aside className="member-sidebar">
        {/* Unit Branding Header */}
        <div className="sidebar-header">
          <div className="brand-logo-container">
            <div className="brand-logo-frame">
              <Image
                src="/logo.jpg"
                alt="RCF Ikole Ushering Unit"
                width={64}
                height={64}
                className="brand-logo-img"
                priority
              />
            </div>
            <div className="brand-text">
              <span className="brand-title">RCF IKOLE</span>
              <span className="brand-subtitle">Ushering Unit</span>
            </div>
          </div>
          <div className="portal-pill">MEMBER PORTAL</div>
        </div>

        {/* Navigation Links */}
        <nav className="sidebar-nav">
          <div className="nav-group-title">MAIN MENU</div>
          <ul className="nav-list">
            {navItems.map((item) => {
              const active = isNavActive(item.href)
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className={`nav-link ${active ? 'active' : ''}`}
                  >
                    <span className="nav-icon">{item.icon(active)}</span>
                    <span className="nav-label">{item.name}</span>
                    {active && <span className="active-indicator" />}
                  </Link>
                </li>
              )
            })}
          </ul>
        </nav>

        {/* User Card & Logout Footer */}
        <div className="sidebar-footer">
          <Link href="/profile" className="user-profile-card">
            <div className="user-avatar-wrap">
              {profile.avatar_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={profile.avatar_url}
                  alt={profile.full_name}
                  className="user-avatar-img"
                />
              ) : (
                <div className="user-avatar-fallback">
                  {getInitials(profile.full_name)}
                </div>
              )}
              <span className="status-dot-active" title="Active member" />
            </div>
            <div className="user-meta">
              <span className="user-name" title={profile.full_name}>
                {profile.full_name}
              </span>
              <span className="user-role-badge">
                {profile.role === 'team_leader' ? 'Team Leader' : 'Usher'}
              </span>
            </div>
          </Link>

          <button
            onClick={handleLogout}
            disabled={loggingOut}
            className="logout-button"
            title="Sign out of your account"
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
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
              <polyline points="16 17 21 12 16 7" />
              <line x1="21" y1="12" x2="9" y2="12" />
            </svg>
            <span>{loggingOut ? 'Signing out...' : 'Sign out'}</span>
          </button>
        </div>
      </aside>

      {/* ================= MAIN CONTENT AREA ================= */}
      <main className="member-main">
        {/* Mobile Top Header */}
        <header className="mobile-header">
          <div className="mobile-brand">
            <div className="mobile-logo-frame">
              <Image
                src="/logo.jpg"
                alt="RCF Ikole Ushering Unit"
                width={46}
                height={46}
                className="mobile-logo-img"
              />
            </div>
            <div>
              <div className="mobile-brand-title">RCF IKOLE</div>
              <div className="mobile-brand-sub">Ushering Portal</div>
            </div>
          </div>

          <Link href="/profile" className="mobile-user-link">
            {profile.avatar_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={profile.avatar_url}
                alt={profile.full_name}
                className="mobile-avatar"
              />
            ) : (
              <div className="mobile-avatar-fallback">
                {getInitials(profile.full_name)}
              </div>
            )}
          </Link>
        </header>

        <div className="member-content-wrapper">{children}</div>
      </main>

      {/* ================= MOBILE BOTTOM NAVIGATION ================= */}
      <nav className="mobile-bottom-nav">
        {navItems.map((item) => {
          const active = isNavActive(item.href)
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`bottom-tab ${active ? 'tab-active' : ''}`}
            >
              <div className="tab-icon-wrap">{item.icon(active)}</div>
              <span className="tab-label">{item.name}</span>
            </Link>
          )
        })}
      </nav>

      {/* ================= STYLES ================= */}
      <style jsx global>{`
        :root {
          --royal-blue: #1d4ed8;
          --royal-blue-hover: #1e40af;
          --royal-blue-light: #eff6ff;
          --royal-blue-dark: #172554;
          --text-main: #1f2937;
          --text-muted: #6b7280;
          --border-color: #e5e7eb;
          --bg-gray: #f8fafc;
          --sidebar-width: 260px;
        }

        .member-layout {
          display: flex;
          flex-direction: column;
          min-height: 100vh;
          background-color: var(--bg-gray);
          color: var(--text-main);
          font-family: inherit;
          width: 100%;
          max-width: 100vw;
          overflow-x: hidden;
        }

        @media (min-width: 768px) {
          .member-layout {
            flex-direction: row;
          }
        }

        /* Desktop Sidebar */
        .member-sidebar {
          display: none;
        }

        @media (min-width: 768px) {
          .member-sidebar {
            display: flex;
            flex-direction: column;
            width: var(--sidebar-width);
            height: 100vh;
            background: #ffffff;
            border-right: 1px solid var(--border-color);
            position: fixed;
            top: 0;
            left: 0;
            bottom: 0;
            z-index: 40;
            box-shadow: 2px 0 8px rgba(0, 0, 0, 0.02);
          }
        }

        .sidebar-header {
          padding: 24px 20px 18px 20px;
          border-bottom: 1px solid var(--border-color);
        }

        .brand-logo-container {
          display: flex;
          align-items: center;
          gap: 12px;
          margin-bottom: 12px;
        }

        .brand-logo-frame {
          width: 64px;
          height: 64px;
          border-radius: 50%;
          background: #ffffff;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          overflow: hidden;
          border: 2.5px solid var(--royal-blue);
          box-shadow: 0 4px 14px rgba(29, 78, 216, 0.22);
        }

        :global(.brand-logo-img) {
          width: 100%;
          height: 100%;
          object-fit: cover;
          border-radius: 50%;
        }

        .brand-text {
          display: flex;
          flex-direction: column;
        }

        .brand-title {
          font-size: 15px;
          font-weight: 800;
          letter-spacing: 0.5px;
          color: var(--royal-blue-dark);
          line-height: 1.2;
        }

        .brand-subtitle {
          font-size: 12px;
          font-weight: 600;
          color: var(--royal-blue);
          letter-spacing: 0.2px;
        }

        .portal-pill {
          display: inline-block;
          font-size: 10px;
          font-weight: 700;
          letter-spacing: 1px;
          color: var(--royal-blue);
          background-color: var(--royal-blue-light);
          padding: 3px 8px;
          border-radius: 6px;
          border: 1px solid rgba(29, 78, 216, 0.15);
        }

        .sidebar-nav {
          flex: 1;
          padding: 20px 14px;
          overflow-y: auto;
        }

        .nav-group-title {
          font-size: 11px;
          font-weight: 700;
          letter-spacing: 0.8px;
          color: #9ca3af;
          margin-bottom: 10px;
          padding-left: 10px;
        }

        .nav-list {
          list-style: none;
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .nav-link {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 10px 14px;
          border-radius: 10px;
          font-size: 14px;
          font-weight: 500;
          color: #4b5563;
          transition: all 0.18s ease-in-out;
          position: relative;
        }

        .nav-link:hover {
          background-color: var(--royal-blue-light);
          color: var(--royal-blue);
        }

        .nav-link.active {
          background-color: var(--royal-blue);
          color: #ffffff;
          font-weight: 600;
          box-shadow: 0 4px 12px rgba(29, 78, 216, 0.28);
        }

        .nav-icon {
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .nav-label {
          flex: 1;
        }

        .active-indicator {
          width: 5px;
          height: 5px;
          border-radius: 50%;
          background: #ffffff;
        }

        .sidebar-footer {
          padding: 16px;
          border-top: 1px solid var(--border-color);
          background-color: #ffffff;
          display: flex;
          flex-direction: column;
          gap: 10px;
        }

        .user-profile-card {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 8px 10px;
          border-radius: 10px;
          transition: background-color 0.15s;
        }

        .user-profile-card:hover {
          background-color: #f3f4f6;
        }

        .user-avatar-wrap {
          position: relative;
          width: 38px;
          height: 38px;
          flex-shrink: 0;
        }

        .user-avatar-img {
          width: 38px;
          height: 38px;
          border-radius: 50%;
          object-fit: cover;
          border: 1.5px solid var(--royal-blue);
        }

        .user-avatar-fallback {
          width: 38px;
          height: 38px;
          border-radius: 50%;
          background: linear-gradient(135deg, #1d4ed8, #3b82f6);
          color: #ffffff;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 13px;
          font-weight: 700;
          letter-spacing: 0.5px;
        }

        .status-dot-active {
          position: absolute;
          bottom: 0;
          right: 0;
          width: 10px;
          height: 10px;
          border-radius: 50%;
          background-color: #10b981;
          border: 2px solid #ffffff;
        }

        .user-meta {
          display: flex;
          flex-direction: column;
          overflow: hidden;
        }

        .user-name {
          font-size: 13.5px;
          font-weight: 600;
          color: #111827;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .user-role-badge {
          font-size: 11px;
          font-weight: 500;
          color: var(--royal-blue);
        }

        .logout-button {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          width: 100%;
          padding: 9px 14px;
          border-radius: 8px;
          background: transparent;
          border: 1px solid #e5e7eb;
          color: #ef4444;
          font-size: 13px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.15s ease-in-out;
        }

        .logout-button:hover {
          background-color: #fef2f2;
          border-color: #fecaca;
        }

        .logout-button:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        /* Mobile Header */
        .mobile-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 12px 18px;
          background-color: #ffffff;
          border-bottom: 1px solid var(--border-color);
          position: sticky;
          top: 0;
          z-index: 30;
          width: 100%;
          box-sizing: border-box;
        }

        @media (min-width: 768px) {
          .mobile-header {
            display: none;
          }
        }

        .mobile-brand {
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .mobile-logo-frame {
          width: 46px;
          height: 46px;
          border-radius: 50%;
          overflow: hidden;
          background: #ffffff;
          border: 2px solid var(--royal-blue);
          box-shadow: 0 2px 8px rgba(29, 78, 216, 0.2);
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }

        :global(.mobile-logo-img) {
          width: 100%;
          height: 100%;
          object-fit: cover;
          border-radius: 50%;
        }

        .mobile-brand-title {
          font-size: 13px;
          font-weight: 800;
          color: var(--royal-blue-dark);
          line-height: 1.1;
        }

        .mobile-brand-sub {
          font-size: 11px;
          font-weight: 600;
          color: var(--royal-blue);
        }

        .mobile-user-link {
          display: flex;
          align-items: center;
        }

        .mobile-avatar {
          width: 34px;
          height: 34px;
          border-radius: 50%;
          object-fit: cover;
          border: 1.5px solid var(--royal-blue);
        }

        .mobile-avatar-fallback {
          width: 34px;
          height: 34px;
          border-radius: 50%;
          background: var(--royal-blue);
          color: #ffffff;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 12px;
          font-weight: 700;
        }

        /* Main Content Container */
        .member-main {
          flex: 1;
          display: flex;
          flex-direction: column;
          align-items: center;
          min-width: 0;
          width: 100%;
          max-width: 100vw;
          overflow-x: hidden;
        }

        @media (min-width: 768px) {
          .member-main {
            margin-left: var(--sidebar-width);
            max-width: calc(100vw - var(--sidebar-width));
            align-items: stretch;
          }
        }

        .member-content-wrapper {
          width: 100%;
          max-width: 1140px;
          margin: 0 auto;
          padding: 20px 16px 84px 16px;
          box-sizing: border-box;
          overflow-x: hidden;
        }

        @media (min-width: 768px) {
          .member-content-wrapper {
            padding: 32px 36px 40px 36px;
          }
        }

        /* Mobile Bottom Navigation */
        .mobile-bottom-nav {
          display: flex;
          align-items: center;
          justify-content: space-around;
          position: fixed;
          bottom: 0;
          left: 0;
          right: 0;
          height: 64px;
          background-color: #ffffff;
          border-top: 1px solid var(--border-color);
          box-shadow: 0 -4px 14px rgba(0, 0, 0, 0.06);
          z-index: 50;
          padding: 0 4px;
        }

        @media (min-width: 768px) {
          .mobile-bottom-nav {
            display: none;
          }
        }

        .bottom-tab {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 3px;
          flex: 1;
          height: 100%;
          color: #6b7280;
          transition: color 0.15s;
          padding: 4px 0;
        }

        .bottom-tab.tab-active {
          color: var(--royal-blue);
        }

        .tab-icon-wrap {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 32px;
          height: 28px;
          border-radius: 12px;
          transition: background-color 0.15s;
        }

        .tab-active .tab-icon-wrap {
          background-color: var(--royal-blue);
          color: #ffffff;
        }

        .tab-label {
          font-size: 10.5px;
          font-weight: 600;
          letter-spacing: 0.1px;
        }
      `}</style>
    </div>
  )
}
