'use client'

import React from 'react'
import Link from 'next/link'
import { formatWAT } from '@/lib/time'

interface HomeClientProps {
  firstName: string
  formattedToday: string
  standingRoleName: string | null
  nextAssignment: any
  nextGeneralOccurrence: any
  prayerDone: boolean
  bibleDone: boolean
  bibleCompletion: any
  currentStreak: number
  attendanceRate: number
  presentCount: number
  pastCount: number
  recentAttendance: any[]
  dressCode: any
  currentSermon: any
  announcement: any
}

export function HomeClient({
  firstName,
  formattedToday,
  standingRoleName,
  nextAssignment,
  nextGeneralOccurrence,
  prayerDone,
  bibleDone,
  bibleCompletion,
  currentStreak,
  attendanceRate,
  presentCount,
  pastCount,
  recentAttendance,
  dressCode,
  currentSermon,
  announcement,
}: HomeClientProps) {
  const formatServiceTime = (timeStr: string) => {
    if (!timeStr) return ''
    const [hrs, mins] = timeStr.split(':')
    const h = parseInt(hrs, 10)
    const ampm = h >= 12 ? 'PM' : 'AM'
    const displayH = h % 12 || 12
    return `${displayH}:${mins} ${ampm}`
  }

  return (
    <div className="home-dashboard">
      {/* ================= HEADER BANNER ================= */}
      <section className="welcome-banner">
        <div className="banner-content">
          <div className="banner-badge-row">
            <span className="live-date-pill">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10" />
                <polyline points="12 6 12 12 16 14" />
              </svg>
              {formattedToday}
            </span>
            {standingRoleName && (
              <span className="standing-role-pill">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                </svg>
                {standingRoleName}
              </span>
            )}
          </div>
          <h1 className="welcome-title">
            Welcome back, <span className="highlight-name">{firstName}</span>!
          </h1>
          <p className="welcome-subtitle">
            RCF Ikole Ushering Unit • Serving with excellence, order, and prayer.
          </p>
        </div>
      </section>

      {/* ================= 4 SUMMARY WIDGETS ================= */}
      <section className="widgets-grid">
        {/* Widget 1: Next Service Occurrence */}
        <div className="widget-card duty-widget">
          <div className="widget-header">
            <div className="widget-icon-box royal">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#1d4ed8" strokeWidth="2">
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                <line x1="16" y1="2" x2="16" y2="6" />
                <line x1="8" y1="2" x2="8" y2="6" />
                <line x1="3" y1="10" x2="21" y2="10" />
              </svg>
            </div>
            <span className="widget-tag">Next Duty Assignment</span>
          </div>

          <div className="widget-body">
            {nextAssignment ? (
              <>
                <div className="duty-post-name">
                  {nextAssignment.duty_post?.name || 'General Ushering'}
                </div>
                <div className="duty-service-title">
                  {nextAssignment.service_occurrence?.service?.name ||
                    `${nextAssignment.service_occurrence?.service_type?.toUpperCase()} SERVICE`}
                </div>
                <div className="duty-date-time">
                  <span className="duty-detail-item">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <rect x="3" y="4" width="18" height="18" rx="2" />
                      <line x1="16" y1="2" x2="16" y2="6" />
                      <line x1="8" y1="2" x2="8" y2="6" />
                      <line x1="3" y1="10" x2="21" y2="10" />
                    </svg>
                    {formatWAT(
                      nextAssignment.service_occurrence!.occurrence_date,
                      'EEE, d MMM yyyy'
                    )}
                  </span>
                  <span className="duty-detail-item">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <circle cx="12" cy="12" r="10" />
                      <polyline points="12 6 12 12 16 14" />
                    </svg>
                    {formatServiceTime(nextAssignment.service_occurrence!.start_time)} –{' '}
                    {formatServiceTime(nextAssignment.service_occurrence!.end_time)}
                  </span>
                </div>
                <div className="duty-badge-row">
                  <span className="status-badge-green">Roster Published</span>
                  <Link href="/services" className="widget-link-arrow">
                    Full Roster &rarr;
                  </Link>
                </div>
              </>
            ) : nextGeneralOccurrence ? (
              <>
                <div className="duty-post-name unassigned">Unassigned</div>
                <div className="duty-service-title">
                  {(nextGeneralOccurrence as any).service?.name ||
                    `${nextGeneralOccurrence.service_type?.toUpperCase()} SERVICE`}
                </div>
                <div className="duty-date-time">
                  <span className="duty-detail-item">
                    {formatWAT(nextGeneralOccurrence.occurrence_date, 'EEE, d MMM yyyy')}
                  </span>
                  <span className="duty-detail-item">
                    {formatServiceTime(nextGeneralOccurrence.start_time)}
                  </span>
                </div>
                <div className="duty-badge-row">
                  <span className="status-badge-gray">No Assignment Scheduled</span>
                  <Link href="/services" className="widget-link-arrow">
                    Services &rarr;
                  </Link>
                </div>
              </>
            ) : (
              <div className="widget-empty-sub">
                No upcoming service occurrences scheduled.
              </div>
            )}
          </div>
        </div>

        {/* Widget 2: Today's Accountability */}
        <div className="widget-card">
          <div className="widget-header">
            <div className="widget-icon-box green">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                <polyline points="22 4 12 14.01 9 11.01" />
              </svg>
            </div>
            <span className="widget-tag">Today's Devotion</span>
          </div>

          <div className="widget-body">
            <div className="devotion-list">
              {/* Prayer */}
              <div className="devotion-item">
                <div className="devotion-title-wrap">
                  <span className="devotion-icon">🙏</span>
                  <div>
                    <span className="devotion-name">Prayer Time</span>
                    <span className="devotion-sub">Daily communion</span>
                  </div>
                </div>
                {prayerDone ? (
                  <span className="devotion-chip completed">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                    Completed
                  </span>
                ) : (
                  <span className="devotion-chip pending">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <circle cx="12" cy="12" r="10" />
                      <line x1="12" y1="8" x2="12" y2="12" />
                      <line x1="12" y1="16" x2="12.01" y2="16" />
                    </svg>
                    Pending
                  </span>
                )}
              </div>

              {/* Bible Study */}
              <div className="devotion-item">
                <div className="devotion-title-wrap">
                  <span className="devotion-icon">📖</span>
                  <div>
                    <span className="devotion-name">Bible Study</span>
                    <span className="devotion-sub">
                      {bibleCompletion?.bible_reference_text || 'Daily scripture reading'}
                    </span>
                  </div>
                </div>
                {bibleDone ? (
                  <span className="devotion-chip completed">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                    Completed
                  </span>
                ) : (
                  <span className="devotion-chip pending">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <circle cx="12" cy="12" r="10" />
                      <line x1="12" y1="8" x2="12" y2="12" />
                      <line x1="12" y1="16" x2="12.01" y2="16" />
                    </svg>
                    Pending
                  </span>
                )}
              </div>
            </div>

            <div className="devotion-footer">
              <Link href="/accountability" className="widget-link-arrow full">
                {prayerDone && bibleDone ? 'View Schedule & Log' : 'Complete Devotion Now'} &rarr;
              </Link>
            </div>
          </div>
        </div>

        {/* Widget 3: Accountability Streak */}
        <div className="widget-card streak-card">
          <div className="widget-header">
            <div className="widget-icon-box orange">
              <span style={{ fontSize: '20px' }}>🔥</span>
            </div>
            <span className="widget-tag">Spiritual Momentum</span>
          </div>

          <div className="widget-body streak-body">
            <div className="streak-main-display">
              <span className="streak-fire-emoji">🔥</span>
              <div className="streak-metric">
                <span className="streak-number">{currentStreak}</span>
                <span className="streak-unit">{currentStreak === 1 ? 'DAY' : 'DAYS'}</span>
              </div>
            </div>
            <p className="streak-description">
              {currentStreak >= 7
                ? 'Outstanding commitment! Keep the fire burning.'
                : currentStreak > 0
                ? 'Consistency builds spiritual strength. Keep it up!'
                : 'Begin your streak today by completing your daily devotion.'}
            </p>
            <div className="streak-indicator-bar">
              <div
                className="streak-fill"
                style={{
                  width: `${Math.min(100, Math.max(12, (currentStreak / 30) * 100))}%`,
                }}
              />
            </div>
            <div className="streak-footer-text">Goal: 30 Consecutive Days</div>
          </div>
        </div>

        {/* Widget 4: Attendance Summary */}
        <div className="widget-card">
          <div className="widget-header">
            <div className="widget-icon-box purple">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#7c3aed" strokeWidth="2">
                <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
                <rect x="8" y="2" width="8" height="4" rx="1" ry="1" />
              </svg>
            </div>
            <span className="widget-tag">Recent Attendance</span>
          </div>

          <div className="widget-body">
            <div className="attendance-stat-row">
              <div className="attendance-percentage-box">
                <span className="attendance-pct-number">{attendanceRate}%</span>
                <span className="attendance-pct-label">Present</span>
              </div>
              <div className="attendance-counts">
                <div className="att-count-row">
                  <span className="att-count-dot green" />
                  <span className="att-count-text">
                    <strong>{presentCount}</strong> Attended
                  </span>
                </div>
                <div className="att-count-row">
                  <span className="att-count-dot gray" />
                  <span className="att-count-text">
                    <strong>{pastCount}</strong> Total Tracked
                  </span>
                </div>
              </div>
            </div>

            <div className="recent-pills-row">
              {recentAttendance && recentAttendance.length > 0 ? (
                recentAttendance.slice(0, 5).map((rec: any, i: number) => (
                  <span
                    key={rec.id || i}
                    className={`mini-status-pill ${rec.status}`}
                    title={`${rec.status} on ${(rec as any).service_occurrence?.occurrence_date || 'Service'}`}
                  >
                    {rec.status === 'present' ? 'P' : rec.status === 'excused' ? 'E' : 'A'}
                  </span>
                ))
              ) : (
                <span className="empty-pills-text">No attendance records yet</span>
              )}
            </div>

            <div className="devotion-footer">
              <Link href="/attendance" className="widget-link-arrow full">
                View Attendance Record &rarr;
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ================= LOWER TWO-COLUMN SECTION ================= */}
      <section className="dashboard-columns">
        {/* Left Column: Dress Code & Announcements */}
        <div className="column-stack">
          {/* Dress Code Card */}
          {dressCode && (
            <div className="content-card dress-code-card">
              <div className="content-card-header">
                <div className="card-title-wrap">
                  <span className="card-badge royal">SUNDAY DRESS CODE</span>
                  <h3 className="card-title">
                    Attire for{' '}
                    {formatWAT(dressCode.applicable_sunday, 'EEEE, d MMMM yyyy')}
                  </h3>
                </div>
              </div>

              <div className="dress-code-content">
                <div className="dress-instructions">
                  <p>{dressCode.instructions}</p>
                </div>

                {dressCode.image_url && (
                  <div className="dress-image-wrap">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={dressCode.image_url}
                      alt="Sunday Dress Code"
                      className="dress-preview-img"
                    />
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Latest Announcement */}
          {announcement && (
            <div className="content-card announcement-card">
              <div className="content-card-header">
                <div className="card-title-wrap">
                  <span className="card-badge orange">ANNOUNCEMENT</span>
                  <h3 className="card-title">{announcement.title}</h3>
                  {announcement.published_at && (
                    <span className="announcement-date">
                      Posted {formatWAT(announcement.published_at, 'd MMM yyyy')}
                    </span>
                  )}
                </div>
              </div>
              <div className="announcement-body">
                <p>{announcement.body}</p>
              </div>
            </div>
          )}
        </div>

        {/* Right Column: Sermon of the Week */}
        <div className="column-stack">
          {currentSermon ? (
            <div className="content-card sermon-card">
              <div className="content-card-header">
                <div className="card-title-wrap">
                  <span className="card-badge green">SERMON OF THE WEEK</span>
                  <h3 className="card-title">{currentSermon.title}</h3>
                  <div className="preacher-name">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                      <circle cx="12" cy="7" r="4" />
                    </svg>
                    By {currentSermon.preacher}
                  </div>
                </div>
              </div>

              <div className="sermon-content">
                {currentSermon.cover_image_url && (
                  <div className="sermon-cover-wrap">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={currentSermon.cover_image_url}
                      alt={currentSermon.title}
                      className="sermon-cover-img"
                    />
                  </div>
                )}

                {currentSermon.description && (
                  <p className="sermon-desc">{currentSermon.description}</p>
                )}

                <div className="sermon-action-row">
                  <a
                    href={currentSermon.spotify_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="spotify-btn"
                  >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z" />
                    </svg>
                    Listen on Spotify
                  </a>
                </div>
              </div>
            </div>
          ) : (
            <div className="content-card empty-sermon-card">
              <div className="widget-empty-sub">
                No sermon has been highlighted for this week yet. Check back soon!
              </div>
            </div>
          )}
        </div>
      </section>

      {/* ================= STYLES ================= */}
      <style jsx>{`
        .home-dashboard {
          display: flex;
          flex-direction: column;
          gap: 28px;
        }

        /* Banner */
        .welcome-banner {
          background: linear-gradient(135deg, #1d4ed8 0%, #1e40af 100%);
          border-radius: 16px;
          padding: 28px 32px;
          color: #ffffff;
          display: flex;
          flex-direction: column;
          gap: 20px;
          box-shadow: 0 10px 25px rgba(29, 78, 216, 0.2);
        }

        @media (min-width: 840px) {
          .welcome-banner {
            flex-direction: row;
            align-items: center;
            justify-content: space-between;
          }
        }

        .banner-content {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .banner-badge-row {
          display: flex;
          align-items: center;
          gap: 10px;
          flex-wrap: wrap;
        }

        .live-date-pill {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          font-size: 12px;
          font-weight: 500;
          background: rgba(255, 255, 255, 0.16);
          padding: 4px 10px;
          border-radius: 20px;
          backdrop-filter: blur(4px);
        }

        .standing-role-pill {
          display: inline-flex;
          align-items: center;
          gap: 5px;
          font-size: 11.5px;
          font-weight: 700;
          background: #fbbf24;
          color: #78350f;
          padding: 4px 10px;
          border-radius: 20px;
          letter-spacing: 0.3px;
        }

        .welcome-title {
          font-size: 26px;
          font-weight: 800;
          color: #ffffff;
          margin: 0;
          line-height: 1.25;
        }

        @media (min-width: 640px) {
          .welcome-title {
            font-size: 30px;
          }
        }

        .highlight-name {
          color: #93c5fd;
        }

        .welcome-subtitle {
          font-size: 13.5px;
          color: #dbeafe;
          margin: 0;
          max-width: 540px;
        }

        .banner-quick-actions {
          display: flex;
          gap: 12px;
          flex-wrap: wrap;
        }

        .quick-action-btn {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 10px 18px;
          border-radius: 10px;
          font-size: 13.5px;
          font-weight: 600;
          transition: all 0.18s;
          white-space: nowrap;
        }

        .quick-action-btn.primary {
          background-color: #ffffff;
          color: #1d4ed8;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
        }

        .quick-action-btn.primary:hover {
          background-color: #f8fafc;
          transform: translateY(-1px);
        }

        .quick-action-btn.secondary {
          background: rgba(255, 255, 255, 0.15);
          color: #ffffff;
          border: 1px solid rgba(255, 255, 255, 0.25);
          backdrop-filter: blur(4px);
        }

        .quick-action-btn.secondary:hover {
          background: rgba(255, 255, 255, 0.25);
          transform: translateY(-1px);
        }

        /* 4 Widgets Grid */
        .widgets-grid {
          display: grid;
          grid-template-columns: 1fr;
          gap: 16px;
        }

        @media (min-width: 640px) {
          .widgets-grid {
            grid-template-columns: repeat(2, 1fr);
          }
        }

        @media (min-width: 1024px) {
          .widgets-grid {
            grid-template-columns: repeat(4, 1fr);
          }
        }

        .widget-card {
          background: #ffffff;
          border-radius: 14px;
          border: 1px solid #e5e7eb;
          padding: 20px;
          box-shadow: 0 2px 6px rgba(0, 0, 0, 0.02);
          display: flex;
          flex-direction: column;
          gap: 16px;
          position: relative;
        }

        .widget-header {
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .widget-icon-box {
          width: 36px;
          height: 36px;
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .widget-icon-box.royal {
          background-color: #eff6ff;
        }

        .widget-icon-box.green {
          background-color: #f0fdf4;
        }

        .widget-icon-box.orange {
          background-color: #fff7ed;
        }

        .widget-icon-box.purple {
          background-color: #f5f3ff;
        }

        .widget-tag {
          font-size: 11.5px;
          font-weight: 700;
          color: #6b7280;
          letter-spacing: 0.4px;
          text-transform: uppercase;
        }

        .widget-body {
          flex: 1;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          gap: 12px;
        }

        /* Duty Widget */
        .duty-widget {
          border-color: #bfdbfe;
          background: linear-gradient(180deg, #ffffff 0%, #f8faff 100%);
        }

        .duty-post-name {
          font-size: 18px;
          font-weight: 800;
          color: #1d4ed8;
          line-height: 1.2;
        }

        .duty-post-name.unassigned {
          color: #6b7280;
        }

        .duty-service-title {
          font-size: 13px;
          font-weight: 600;
          color: #111827;
          margin-top: 2px;
        }

        .duty-date-time {
          display: flex;
          flex-direction: column;
          gap: 4px;
          font-size: 12px;
          color: #4b5563;
        }

        .duty-detail-item {
          display: flex;
          align-items: center;
          gap: 6px;
        }

        .duty-badge-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-top: 4px;
        }

        .status-badge-green {
          display: inline-block;
          font-size: 10.5px;
          font-weight: 700;
          color: #15803d;
          background-color: #dcfce7;
          padding: 2px 8px;
          border-radius: 4px;
        }

        .status-badge-gray {
          display: inline-block;
          font-size: 10.5px;
          font-weight: 600;
          color: #6b7280;
          background-color: #f3f4f6;
          padding: 2px 8px;
          border-radius: 4px;
        }

        .widget-link-arrow {
          font-size: 12px;
          font-weight: 700;
          color: #1d4ed8;
          text-decoration: none;
          transition: color 0.15s;
        }

        .widget-link-arrow:hover {
          color: #1e40af;
          text-decoration: underline;
        }

        .widget-link-arrow.full {
          display: block;
          text-align: right;
          width: 100%;
        }

        /* Devotion Widget */
        .devotion-list {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }

        .devotion-item {
          display: flex;
          align-items: center;
          justify-content: space-between;
          background: #f9fafb;
          border: 1px solid #e5e7eb;
          border-radius: 8px;
          padding: 8px 10px;
        }

        .devotion-title-wrap {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .devotion-icon {
          font-size: 15px;
        }

        .devotion-name {
          font-size: 12px;
          font-weight: 700;
          color: #111827;
          display: block;
        }

        .devotion-sub {
          font-size: 10.5px;
          color: #6b7280;
          display: block;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          max-width: 110px;
        }

        .devotion-chip {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          font-size: 10.5px;
          font-weight: 700;
          padding: 3px 8px;
          border-radius: 6px;
        }

        .devotion-chip.completed {
          background-color: #dcfce7;
          color: #15803d;
        }

        .devotion-chip.pending {
          background-color: #fef3c7;
          color: #b45309;
        }

        /* Streak Widget */
        .streak-card {
          border-color: #fed7aa;
          background: linear-gradient(180deg, #ffffff 0%, #fffbf5 100%);
        }

        .streak-main-display {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .streak-fire-emoji {
          font-size: 38px;
        }

        .streak-metric {
          display: flex;
          flex-direction: column;
          line-height: 1;
        }

        .streak-number {
          font-size: 34px;
          font-weight: 900;
          color: #c2410c;
        }

        .streak-unit {
          font-size: 11px;
          font-weight: 800;
          letter-spacing: 1px;
          color: #ea580c;
        }

        .streak-description {
          font-size: 11.5px;
          color: #7c2d12;
          margin: 0;
          line-height: 1.4;
        }

        .streak-indicator-bar {
          height: 6px;
          background-color: #fed7aa;
          border-radius: 4px;
          overflow: hidden;
        }

        .streak-fill {
          height: 100%;
          background: linear-gradient(90deg, #f97316 0%, #ef4444 100%);
          border-radius: 4px;
        }

        .streak-footer-text {
          font-size: 10.5px;
          font-weight: 600;
          color: #9a3412;
          text-align: right;
        }

        /* Attendance Summary Widget */
        .attendance-stat-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          background-color: #faf5ff;
          border: 1px solid #e9d5ff;
          border-radius: 10px;
          padding: 10px 14px;
        }

        .attendance-percentage-box {
          display: flex;
          flex-direction: column;
          align-items: center;
        }

        .attendance-pct-number {
          font-size: 26px;
          font-weight: 800;
          color: #7c3aed;
          line-height: 1.1;
        }

        .attendance-pct-label {
          font-size: 10px;
          font-weight: 700;
          color: #9333ea;
          text-transform: uppercase;
        }

        .attendance-counts {
          display: flex;
          flex-direction: column;
          gap: 4px;
          font-size: 11.5px;
          color: #4b5563;
        }

        .att-count-row {
          display: flex;
          align-items: center;
          gap: 6px;
        }

        .att-count-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
        }

        .att-count-dot.green {
          background-color: #16a34a;
        }

        .att-count-dot.gray {
          background-color: #9ca3af;
        }

        .recent-pills-row {
          display: flex;
          align-items: center;
          gap: 6px;
        }

        .mini-status-pill {
          width: 24px;
          height: 24px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 11px;
          font-weight: 800;
        }

        .mini-status-pill.present {
          background-color: #dcfce7;
          color: #15803d;
        }

        .mini-status-pill.excused {
          background-color: #dbeafe;
          color: #1d4ed8;
        }

        .mini-status-pill.absent {
          background-color: #fee2e2;
          color: #b91c1c;
        }

        .empty-pills-text {
          font-size: 11.5px;
          color: #9ca3af;
          font-style: italic;
        }

        /* Lower 2-column section */
        .dashboard-columns {
          display: grid;
          grid-template-columns: 1fr;
          gap: 20px;
        }

        @media (min-width: 840px) {
          .dashboard-columns {
            grid-template-columns: repeat(2, 1fr);
          }
        }

        .column-stack {
          display: flex;
          flex-direction: column;
          gap: 20px;
        }

        .content-card {
          background: #ffffff;
          border: 1px solid #e5e7eb;
          border-radius: 14px;
          padding: 24px;
          box-shadow: 0 2px 6px rgba(0, 0, 0, 0.02);
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .content-card-header {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
        }

        .card-title-wrap {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .card-badge {
          display: inline-block;
          font-size: 10.5px;
          font-weight: 700;
          letter-spacing: 0.8px;
          padding: 2px 8px;
          border-radius: 4px;
          width: fit-content;
        }

        .card-badge.royal {
          background-color: #eff6ff;
          color: #1d4ed8;
        }

        .card-badge.orange {
          background-color: #fff7ed;
          color: #ea580c;
        }

        .card-badge.green {
          background-color: #f0fdf4;
          color: #15803d;
        }

        .card-title {
          font-size: 18px;
          font-weight: 800;
          color: #111827;
          margin: 0;
        }

        .announcement-date,
        .preacher-name {
          font-size: 12px;
          color: #6b7280;
          display: flex;
          align-items: center;
          gap: 6px;
        }

        /* Dress code card */
        .dress-code-content {
          display: flex;
          flex-direction: column;
          gap: 14px;
        }

        .dress-instructions {
          font-size: 14px;
          color: #374151;
          line-height: 1.5;
        }

        .dress-image-wrap {
          border-radius: 12px;
          overflow: hidden;
          border: 1px solid #cbd5e1;
          max-height: 260px;
          box-shadow: 0 4px 14px rgba(0, 0, 0, 0.08);
          transition: transform 0.2s ease, box-shadow 0.2s ease;
        }

        .dress-image-wrap:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12);
        }

        .dress-preview-img {
          width: 100%;
          height: auto;
          max-height: 260px;
          object-fit: cover;
          display: block;
        }

        .announcement-body {
          font-size: 14px;
          color: #374151;
          line-height: 1.6;
          white-space: pre-line;
        }

        /* Sermon Card */
        .sermon-content {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .sermon-cover-wrap {
          border-radius: 12px;
          overflow: hidden;
          border: 1px solid #cbd5e1;
          max-height: 240px;
          box-shadow: 0 4px 14px rgba(0, 0, 0, 0.09);
          transition: transform 0.2s ease, box-shadow 0.2s ease;
        }

        .sermon-cover-wrap:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 24px rgba(0, 0, 0, 0.14);
        }

        .sermon-cover-img {
          width: 100%;
          height: auto;
          max-height: 240px;
          object-fit: cover;
          display: block;
        }

        .sermon-desc {
          font-size: 13.5px;
          color: #4b5563;
          line-height: 1.5;
          margin: 0;
        }

        .sermon-action-row {
          margin-top: 4px;
        }

        .spotify-btn {
          display: inline-flex;
          align-items: center;
          gap: 10px;
          background-color: #1ed760;
          color: #000000;
          padding: 10px 20px;
          border-radius: 24px;
          font-size: 14px;
          font-weight: 700;
          transition: transform 0.15s, background-color 0.15s;
          box-shadow: 0 4px 12px rgba(30, 215, 96, 0.3);
        }

        .spotify-btn:hover {
          background-color: #1fdf64;
          transform: scale(1.02);
        }

        .empty-sermon-card {
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 40px 20px;
          text-align: center;
        }

        .widget-empty-sub {
          font-size: 13px;
          color: #6b7280;
          font-style: italic;
        }

        @media (max-width: 640px) {
          .welcome-banner {
            padding: 22px 18px;
            border-radius: 14px;
            align-items: center;
            text-align: center;
          }

          .banner-content {
            align-items: center;
            text-align: center;
          }

          .banner-badge-row {
            justify-content: center;
          }

          .welcome-subtitle {
            text-align: center;
          }

          .welcome-title {
            font-size: 22px;
            text-align: center;
          }

          .banner-quick-actions {
            flex-direction: column;
            width: 100%;
          }

          .quick-action-btn {
            width: 100%;
            justify-content: center;
          }

          .content-card {
            padding: 18px 16px;
            border-radius: 12px;
          }

          .spotify-btn {
            width: 100%;
            justify-content: center;
          }
        }
      `}</style>
    </div>
  )
}
