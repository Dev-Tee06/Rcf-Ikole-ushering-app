'use client'

import React, { useEffect, useState, useMemo, useCallback } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { AttendanceStatus } from '@/types/database'

interface ServiceOccurrenceWithDetails {
  id: string
  service_id: string
  service_type: string
  occurrence_date: string
  start_time: string
  end_time: string
  absence_deadline: string
  notes: string | null
  roster_published: boolean
  service?: {
    name: string
    description: string | null
    absence_deadline_hours: number
  } | null
}

interface UserAttendanceRecord {
  id: string
  member_id: string
  service_occurrence_id: string
  status: AttendanceStatus
  marked_present_at: string | null
  excused_reason: string | null
  created_at: string
}

export default function AttendancePage() {
  const [loading, setLoading] = useState(true)
  const [userId, setUserId] = useState<string | null>(null)
  const [occurrences, setOccurrences] = useState<ServiceOccurrenceWithDetails[]>([])
  const [attendanceMap, setAttendanceMap] = useState<Record<string, UserAttendanceRecord>>({})
  const [markingId, setMarkingId] = useState<string | null>(null)
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null)
  const [filter, setFilter] = useState<'all' | 'present' | 'absent' | 'upcoming'>('all')

  const supabase = useMemo(() => createClient(), [])

  // Fetch occurrences and user's attendance records
  const loadData = useCallback(async () => {
    try {
      setLoading(true)
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        setLoading(false)
        return
      }
      setUserId(user.id)

      // Calculate range: 8 weeks ago to 2 weeks ahead
      const now = new Date()
      const eightWeeksAgo = new Date(now.getTime() - 56 * 24 * 60 * 60 * 1000)
      const twoWeeksAhead = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000)

      const startStr = eightWeeksAgo.toISOString().split('T')[0]
      const endStr = twoWeeksAhead.toISOString().split('T')[0]

      // 1. Fetch occurrences
      const { data: occData, error: occError } = await supabase
        .from('service_occurrences')
        .select(`
          id,
          service_id,
          service_type,
          occurrence_date,
          start_time,
          end_time,
          absence_deadline,
          notes,
          roster_published,
          service:services (
            name,
            description,
            absence_deadline_hours
          )
        `)
        .gte('occurrence_date', startStr)
        .lte('occurrence_date', endStr)
        .order('occurrence_date', { ascending: false })
        .order('start_time', { ascending: false })

      if (occError) {
        console.error('Error fetching service occurrences:', occError)
      }

      const loadedOccurrences = (occData as unknown as ServiceOccurrenceWithDetails[]) || []
      setOccurrences(loadedOccurrences)

      // 2. Fetch user's attendance records
      const occIds = loadedOccurrences.map((o) => o.id)
      if (occIds.length > 0) {
        const { data: attData, error: attError } = await supabase
          .from('attendance_records')
          .select('*')
          .eq('member_id', user.id)
          .in('service_occurrence_id', occIds)

        if (attError) {
          console.error('Error fetching attendance records:', attError)
        }

        const map: Record<string, UserAttendanceRecord> = {}
        attData?.forEach((record: any) => {
          map[record.service_occurrence_id] = record as UserAttendanceRecord
        })
        setAttendanceMap(map)
      }
    } catch (err) {
      console.error('Failed to load attendance data:', err)
    } finally {
      setLoading(false)
    }
  }, [supabase])

  useEffect(() => {
    loadData()
  }, [loadData])

  // Helper: check window status
  // Time in WAT is UTC+1.
  const getWindowInfo = (occ: ServiceOccurrenceWithDetails) => {
    const now = new Date()

    // Service start in WAT: occurrence_date + start_time +01:00
    const startIso = `${occ.occurrence_date}T${occ.start_time}+01:00`
    const startTimeUtc = new Date(startIso)

    // Absence deadline from database (TIMESTAMPTZ)
    const deadlineUtc = new Date(occ.absence_deadline)

    const hasStarted = now.getTime() >= startTimeUtc.getTime()
    const deadlinePassed = now.getTime() > deadlineUtc.getTime()
    const isOpen = hasStarted && !deadlinePassed

    return {
      startTimeUtc,
      deadlineUtc,
      hasStarted,
      deadlinePassed,
      isOpen,
    }
  }

  // Handle Mark Present
  const handleMarkPresent = async (occ: ServiceOccurrenceWithDetails) => {
    if (!userId) return

    setMarkingId(occ.id)
    setFeedback(null)

    try {
      // 1. First try calling the API route
      let success = false
      try {
        const res = await fetch('/api/attendance/mark', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ service_occurrence_id: occ.id }),
        })

        if (res.ok) {
          success = true
        }
      } catch (err) {
        console.warn('API route /api/attendance/mark call failed, trying direct Supabase insert:', err)
      }

      // 2. If API was not successful or 404, fallback to direct Supabase client call
      if (!success) {
        const { data, error } = await supabase
          .from('attendance_records')
          .upsert(
            {
              member_id: userId,
              service_occurrence_id: occ.id,
              status: 'present',
              marked_present_at: new Date().toISOString(),
            },
            { onConflict: 'member_id,service_occurrence_id' }
          )
          .select()
          .single()

        if (error) {
          throw error
        }

        if (data) {
          setAttendanceMap((prev) => ({
            ...prev,
            [occ.id]: data as UserAttendanceRecord,
          }))
          success = true
        }
      } else {
        // If API succeeded, update local state
        setAttendanceMap((prev) => ({
          ...prev,
          [occ.id]: {
            id: prev[occ.id]?.id || 'client-updated',
            member_id: userId,
            service_occurrence_id: occ.id,
            status: 'present',
            marked_present_at: new Date().toISOString(),
            excused_reason: null,
            created_at: new Date().toISOString(),
          },
        }))
      }

      if (success) {
        setFeedback({
          type: 'success',
          message: `Attendance marked as Present for ${occ.service?.name || 'the service'}!`,
        })
      }
    } catch (err: any) {
      console.error('Failed to mark present:', err)
      setFeedback({
        type: 'error',
        message: err.message || 'Failed to mark attendance. Please try again or notify your leader.',
      })
    } finally {
      setMarkingId(null)
    }
  }

  // Calculate Statistics for past/active services
  const stats = useMemo(() => {
    let totalServices = 0
    let presentCount = 0
    let absentCount = 0
    let excusedCount = 0

    occurrences.forEach((occ) => {
      const { hasStarted, deadlinePassed } = getWindowInfo(occ)
      const record = attendanceMap[occ.id]

      if (hasStarted) {
        totalServices++

        if (record?.status === 'present') {
          presentCount++
        } else if (record?.status === 'excused') {
          excusedCount++
        } else if (record?.status === 'absent' || deadlinePassed) {
          absentCount++
        }
      }
    })

    const tracked = presentCount + absentCount + excusedCount
    const percentage =
      tracked > 0 ? Math.round((presentCount / (tracked || 1)) * 100) : 100

    return {
      totalServices,
      presentCount,
      absentCount,
      excusedCount,
      percentage,
    }
  }, [occurrences, attendanceMap])

  // Filter occurrences
  const filteredOccurrences = useMemo(() => {
    return occurrences.filter((occ) => {
      const { hasStarted, deadlinePassed } = getWindowInfo(occ)
      const record = attendanceMap[occ.id]

      if (filter === 'present') {
        return record?.status === 'present'
      }
      if (filter === 'absent') {
        return (
          record?.status === 'absent' ||
          (hasStarted && deadlinePassed && record?.status !== 'present' && record?.status !== 'excused')
        )
      }
      if (filter === 'upcoming') {
        return !hasStarted
      }
      return true
    })
  }, [occurrences, attendanceMap, filter])

  // Formatters
  const formatOccurrenceDate = (dateStr: string) => {
    try {
      const [y, m, d] = dateStr.split('-').map(Number)
      const dt = new Date(Date.UTC(y, m - 1, d))
      return dt.toLocaleDateString('en-GB', {
        weekday: 'short',
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      })
    } catch {
      return dateStr
    }
  }

  const formatServiceTime = (timeStr: string) => {
    if (!timeStr) return ''
    const [hrs, mins] = timeStr.split(':')
    const h = parseInt(hrs, 10)
    const ampm = h >= 12 ? 'PM' : 'AM'
    const displayH = h % 12 || 12
    return `${displayH}:${mins} ${ampm}`
  }

  return (
    <div className="attendance-page">
      {/* Page Header */}
      <header className="page-header">
        <div>
          <span className="page-category">PUNCTUALITY & ATTENDANCE</span>
          <h1 className="page-title">Service Attendance</h1>
          <p className="page-subtitle">
            Mark your attendance during active service windows and monitor your presence record.
          </p>
        </div>
      </header>

      {/* Feedback Banner */}
      {feedback && (
        <div className={`feedback-alert ${feedback.type}`}>
          <div className="feedback-content">
            {feedback.type === 'success' ? (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#15803d" strokeWidth="2.5">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                <polyline points="22 4 12 14.01 9 11.01" />
              </svg>
            ) : (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#b91c1c" strokeWidth="2.5">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
            )}
            <span>{feedback.message}</span>
          </div>
          <button
            onClick={() => setFeedback(null)}
            className="feedback-close-btn"
            aria-label="Dismiss feedback"
          >
            &times;
          </button>
        </div>
      )}

      {/* ================= 1. ATTENDANCE STATISTICS HEADER ================= */}
      <section className="stats-grid">
        {/* Stat 1: Overall Percentage */}
        <div className="stat-card rate-card">
          <div className="stat-header">
            <span className="stat-tag">ATTENDANCE RATE</span>
            <div className="stat-icon-wrap royal">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#1d4ed8" strokeWidth="2">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                <polyline points="22 4 12 14.01 9 11.01" />
              </svg>
            </div>
          </div>
          <div className="stat-value-display">
            <span className="stat-big-number">{stats.percentage}%</span>
            <span className="stat-rating-pill">
              {stats.percentage >= 80 ? 'Excellent Standing' : stats.percentage >= 60 ? 'Good' : 'Needs Attention'}
            </span>
          </div>
          <span className="stat-desc">Based on past services held in this period</span>
        </div>

        {/* Stat 2: Total Services */}
        <div className="stat-card">
          <div className="stat-header">
            <span className="stat-tag">SERVICES HELD</span>
            <div className="stat-icon-wrap purple">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#7c3aed" strokeWidth="2">
                <rect x="3" y="4" width="18" height="18" rx="2" />
                <line x1="16" y1="2" x2="16" y2="6" />
                <line x1="8" y1="2" x2="8" y2="6" />
                <line x1="3" y1="10" x2="21" y2="10" />
              </svg>
            </div>
          </div>
          <span className="stat-big-number text-dark">{stats.totalServices}</span>
          <span className="stat-desc">Past 8 weeks tracking window</span>
        </div>

        {/* Stat 3: Present */}
        <div className="stat-card">
          <div className="stat-header">
            <span className="stat-tag">PRESENT</span>
            <div className="stat-icon-wrap green">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </div>
          </div>
          <span className="stat-big-number text-green">{stats.presentCount}</span>
          <span className="stat-desc">Services marked on time</span>
        </div>

        {/* Stat 4: Absent / Excused */}
        <div className="stat-card">
          <div className="stat-header">
            <span className="stat-tag">ABSENT / EXCUSED</span>
            <div className="stat-icon-wrap red">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#dc2626" strokeWidth="2">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </div>
          </div>
          <div className="absent-excused-row">
            <span className="stat-big-number text-red">{stats.absentCount}</span>
            <span className="excused-note">
              ({stats.excusedCount} Excused)
            </span>
          </div>
          <span className="stat-desc">Unattended or approved absence</span>
        </div>
      </section>

      {/* ================= 2. SERVICE OCCURRENCES LIST ================= */}
      <section className="list-section">
        <div className="list-header-row">
          <div className="list-title-wrap">
            <h2 className="list-title">Service Occurrences</h2>
            <span className="list-subtitle">Past 8 weeks + next 2 weeks</span>
          </div>

          {/* Filter Pills */}
          <div className="filter-pills-row">
            <button
              onClick={() => setFilter('all')}
              className={`filter-btn ${filter === 'all' ? 'active' : ''}`}
            >
              All ({occurrences.length})
            </button>
            <button
              onClick={() => setFilter('present')}
              className={`filter-btn ${filter === 'present' ? 'active' : ''}`}
            >
              Present ({stats.presentCount})
            </button>
            <button
              onClick={() => setFilter('absent')}
              className={`filter-btn ${filter === 'absent' ? 'active' : ''}`}
            >
              Absent ({stats.absentCount})
            </button>
            <button
              onClick={() => setFilter('upcoming')}
              className={`filter-btn ${filter === 'upcoming' ? 'active' : ''}`}
            >
              Upcoming
            </button>
          </div>
        </div>

        {loading ? (
          <div className="loading-state-card">
            <div className="spinner" />
            <p>Loading attendance records...</p>
          </div>
        ) : filteredOccurrences.length > 0 ? (
          <div className="occurrences-list">
            {filteredOccurrences.map((occ) => {
              const { hasStarted, deadlinePassed, isOpen } = getWindowInfo(occ)
              const record = attendanceMap[occ.id]
              const isPresent = record?.status === 'present'
              const isExcused = record?.status === 'excused'
              const isMarking = markingId === occ.id

              // Determine display status badge
              let badgeType: 'green' | 'red' | 'blue' | 'yellow' | 'gray' = 'gray'
              let badgeLabel = 'Upcoming'

              if (isPresent) {
                badgeType = 'green'
                badgeLabel = 'Present'
              } else if (isExcused) {
                badgeType = 'blue'
                badgeLabel = 'Excused'
              } else if (isOpen) {
                badgeType = 'yellow'
                badgeLabel = 'Window Open • Not Marked'
              } else if (deadlinePassed) {
                badgeType = 'red'
                badgeLabel = 'Absent'
              } else {
                badgeType = 'gray'
                badgeLabel = 'Upcoming'
              }

              // Active button conditions
              const canMarkPresent = isOpen && !isPresent

              return (
                <div key={occ.id} className={`occurrence-row-card ${isOpen ? 'highlight-open' : ''}`}>
                  <div className="occurrence-info-col">
                    <div className="occ-header-line">
                      <span className="occ-service-name">
                        {occ.service?.name || `${occ.service_type.toUpperCase()} SERVICE`}
                      </span>
                      <span className={`status-badge badge-${badgeType}`}>
                        {badgeLabel}
                      </span>
                    </div>

                    <div className="occ-meta-line">
                      <span className="meta-detail">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <rect x="3" y="4" width="18" height="18" rx="2" />
                          <line x1="16" y1="2" x2="16" y2="6" />
                          <line x1="8" y1="2" x2="8" y2="6" />
                          <line x1="3" y1="10" x2="21" y2="10" />
                        </svg>
                        {formatOccurrenceDate(occ.occurrence_date)}
                      </span>
                      <span className="meta-detail">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <circle cx="12" cy="12" r="10" />
                          <polyline points="12 6 12 12 16 14" />
                        </svg>
                        {formatServiceTime(occ.start_time)} – {formatServiceTime(occ.end_time)}
                      </span>
                      {record?.marked_present_at && (
                        <span className="marked-time-sub">
                          Marked at {new Date(record.marked_present_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      )}
                      {record?.excused_reason && (
                        <span className="excused-reason-sub">
                          Reason: {record.excused_reason}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="occurrence-action-col">
                    {canMarkPresent ? (
                      <button
                        onClick={() => handleMarkPresent(occ)}
                        disabled={isMarking}
                        className="mark-present-btn active"
                      >
                        {isMarking ? (
                          <>
                            <span className="btn-spinner" />
                            Marking...
                          </>
                        ) : (
                          <>
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                              <polyline points="20 6 9 17 4 12" />
                            </svg>
                            Mark Present
                          </>
                        )}
                      </button>
                    ) : isPresent ? (
                      <div className="present-confirmed-pill">
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="3">
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                        Recorded
                      </div>
                    ) : !hasStarted ? (
                      <span className="action-note">Opens at {formatServiceTime(occ.start_time)}</span>
                    ) : (
                      <span className="action-note closed">Window Closed</span>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        ) : (
          <div className="empty-state-card">
            <p>No service occurrences match the selected filter.</p>
          </div>
        )}
      </section>

      {/* ================= 3. ATTENDANCE HISTORY CALENDAR VIEW ================= */}
      <section className="calendar-view-section">
        <div className="section-title-wrap">
          <div className="section-icon-badge royal">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#1d4ed8" strokeWidth="2">
              <rect x="3" y="4" width="18" height="18" rx="2" />
              <line x1="16" y1="2" x2="16" y2="6" />
              <line x1="8" y1="2" x2="8" y2="6" />
              <line x1="3" y1="10" x2="21" y2="10" />
            </svg>
          </div>
          <div>
            <h2 className="list-title">Attendance History Timeline</h2>
            <span className="list-subtitle">Visual overview of your presence across services</span>
          </div>
        </div>

        {/* Legend */}
        <div className="calendar-legend">
          <div className="legend-item">
            <span className="legend-dot green" />
            <span>Present</span>
          </div>
          <div className="legend-item">
            <span className="legend-dot red" />
            <span>Absent</span>
          </div>
          <div className="legend-item">
            <span className="legend-dot blue" />
            <span>Excused</span>
          </div>
          <div className="legend-item">
            <span className="legend-dot yellow" />
            <span>Window Open</span>
          </div>
          <div className="legend-item">
            <span className="legend-dot gray" />
            <span>Upcoming</span>
          </div>
        </div>

        {/* Calendar Grid Representation */}
        <div className="calendar-grid-wrap">
          {occurrences.slice(0, 16).map((occ) => {
            const { hasStarted, deadlinePassed, isOpen } = getWindowInfo(occ)
            const record = attendanceMap[occ.id]
            const isPresent = record?.status === 'present'
            const isExcused = record?.status === 'excused'

            let dotClass = 'gray'
            if (isPresent) dotClass = 'green'
            else if (isExcused) dotClass = 'blue'
            else if (isOpen) dotClass = 'yellow'
            else if (deadlinePassed) dotClass = 'red'

            return (
              <div key={occ.id} className="calendar-day-cell">
                <div className={`cell-dot ${dotClass}`} />
                <div className="cell-details">
                  <span className="cell-day">
                    {formatOccurrenceDate(occ.occurrence_date)}
                  </span>
                  <span className="cell-name">
                    {occ.service?.name?.replace(' Service', '') || occ.service_type}
                  </span>
                </div>
              </div>
            )
          })}
        </div>
      </section>

      {/* ================= STYLES ================= */}
      <style jsx>{`
        .attendance-page {
          display: flex;
          flex-direction: column;
          gap: 28px;
        }

        .page-header {
          border-bottom: 1px solid #e5e7eb;
          padding-bottom: 20px;
        }

        .page-category {
          display: inline-block;
          font-size: 11px;
          font-weight: 700;
          letter-spacing: 1px;
          color: #1d4ed8;
          text-transform: uppercase;
          margin-bottom: 4px;
        }

        .page-title {
          font-size: 28px;
          font-weight: 800;
          color: #111827;
          margin: 0 0 6px 0;
          letter-spacing: -0.5px;
        }

        .page-subtitle {
          font-size: 14px;
          color: #6b7280;
          margin: 0;
        }

        /* Feedback alert */
        .feedback-alert {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 14px 18px;
          border-radius: 10px;
          font-size: 14px;
          font-weight: 500;
        }

        .feedback-alert.success {
          background-color: #f0fdf4;
          border: 1px solid #bbf7d0;
          color: #15803d;
        }

        .feedback-alert.error {
          background-color: #fef2f2;
          border: 1px solid #fecaca;
          color: #b91c1c;
        }

        .feedback-content {
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .feedback-close-btn {
          background: transparent;
          border: none;
          font-size: 20px;
          cursor: pointer;
          color: inherit;
          line-height: 1;
        }

        /* Stats Grid */
        .stats-grid {
          display: grid;
          grid-template-columns: 1fr;
          gap: 16px;
        }

        @media (min-width: 640px) {
          .stats-grid {
            grid-template-columns: repeat(2, 1fr);
          }
        }

        @media (min-width: 1024px) {
          .stats-grid {
            grid-template-columns: repeat(4, 1fr);
          }
        }

        .stat-card {
          background: #ffffff;
          border-radius: 14px;
          padding: 20px;
          border: 1px solid #e5e7eb;
          display: flex;
          flex-direction: column;
          gap: 8px;
          box-shadow: 0 2px 6px rgba(0, 0, 0, 0.02);
        }

        .stat-card.rate-card {
          border-color: #bfdbfe;
          background: linear-gradient(180deg, #ffffff 0%, #eff6ff 100%);
        }

        .stat-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
        }

        .stat-tag {
          font-size: 11px;
          font-weight: 700;
          color: #6b7280;
          letter-spacing: 0.6px;
        }

        .stat-icon-wrap {
          width: 32px;
          height: 32px;
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .stat-icon-wrap.royal {
          background-color: #eff6ff;
        }

        .stat-icon-wrap.purple {
          background-color: #f5f3ff;
        }

        .stat-icon-wrap.green {
          background-color: #f0fdf4;
        }

        .stat-icon-wrap.red {
          background-color: #fef2f2;
        }

        .stat-value-display {
          display: flex;
          align-items: baseline;
          gap: 10px;
        }

        .stat-big-number {
          font-size: 32px;
          font-weight: 900;
          color: #1d4ed8;
          line-height: 1;
        }

        .stat-big-number.text-dark {
          color: #111827;
        }

        .stat-big-number.text-green {
          color: #16a34a;
        }

        .stat-big-number.text-red {
          color: #dc2626;
        }

        .stat-rating-pill {
          font-size: 11px;
          font-weight: 700;
          color: #15803d;
          background: #dcfce7;
          padding: 3px 8px;
          border-radius: 6px;
        }

        .stat-desc {
          font-size: 12px;
          color: #6b7280;
        }

        .absent-excused-row {
          display: flex;
          align-items: baseline;
          gap: 8px;
        }

        .excused-note {
          font-size: 13px;
          font-weight: 600;
          color: #4b5563;
        }

        /* List Section */
        .list-section {
          background: #ffffff;
          border-radius: 14px;
          border: 1px solid #e5e7eb;
          padding: 24px;
          box-shadow: 0 2px 6px rgba(0, 0, 0, 0.02);
          display: flex;
          flex-direction: column;
          gap: 20px;
        }

        .list-header-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          flex-wrap: wrap;
          gap: 14px;
        }

        .list-title-wrap {
          display: flex;
          flex-direction: column;
          gap: 2px;
        }

        .list-title {
          font-size: 18px;
          font-weight: 700;
          color: #111827;
          margin: 0;
        }

        .list-subtitle {
          font-size: 12.5px;
          color: #6b7280;
        }

        .filter-pills-row {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
        }

        .filter-btn {
          padding: 6px 14px;
          border-radius: 20px;
          border: 1px solid #e5e7eb;
          background: #ffffff;
          font-size: 12.5px;
          font-weight: 600;
          color: #4b5563;
          cursor: pointer;
          transition: all 0.15s;
        }

        .filter-btn:hover {
          background-color: #f9fafb;
          border-color: #d1d5db;
        }

        .filter-btn.active {
          background-color: #1d4ed8;
          color: #ffffff;
          border-color: #1d4ed8;
        }

        /* Occurrences list */
        .occurrences-list {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .occurrence-row-card {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 16px 20px;
          background-color: #f8fafc;
          border: 1px solid #e2e8f0;
          border-radius: 12px;
          flex-wrap: wrap;
          gap: 14px;
          transition: border-color 0.15s;
        }

        .occurrence-row-card.highlight-open {
          border-color: #fbbf24;
          background-color: #fffbeb;
        }

        .occurrence-info-col {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .occ-header-line {
          display: flex;
          align-items: center;
          gap: 12px;
          flex-wrap: wrap;
        }

        .occ-service-name {
          font-size: 16px;
          font-weight: 700;
          color: #111827;
        }

        .status-badge {
          font-size: 11px;
          font-weight: 700;
          padding: 3px 8px;
          border-radius: 6px;
          letter-spacing: 0.3px;
        }

        .badge-green {
          background-color: #dcfce7;
          color: #15803d;
        }

        .badge-red {
          background-color: #fee2e2;
          color: #b91c1c;
        }

        .badge-blue {
          background-color: #dbeafe;
          color: #1d4ed8;
        }

        .badge-yellow {
          background-color: #fef3c7;
          color: #b45309;
        }

        .badge-gray {
          background-color: #f3f4f6;
          color: #4b5563;
        }

        .occ-meta-line {
          display: flex;
          align-items: center;
          gap: 14px;
          font-size: 12.5px;
          color: #4b5563;
          flex-wrap: wrap;
        }

        .meta-detail {
          display: flex;
          align-items: center;
          gap: 6px;
        }

        .marked-time-sub {
          font-size: 11.5px;
          color: #16a34a;
          font-weight: 600;
        }

        .excused-reason-sub {
          font-size: 11.5px;
          color: #1d4ed8;
          font-style: italic;
        }

        .occurrence-action-col {
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .mark-present-btn {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          background-color: #1d4ed8;
          color: #ffffff;
          padding: 9px 18px;
          border-radius: 8px;
          font-size: 13.5px;
          font-weight: 700;
          border: none;
          cursor: pointer;
          transition: background-color 0.15s, transform 0.15s;
          box-shadow: 0 2px 6px rgba(29, 78, 216, 0.25);
        }

        .mark-present-btn:hover {
          background-color: #1e40af;
          transform: translateY(-1px);
        }

        .mark-present-btn:disabled {
          opacity: 0.7;
          cursor: not-allowed;
        }

        .present-confirmed-pill {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          font-size: 13px;
          font-weight: 700;
          color: #15803d;
          background: #dcfce7;
          padding: 6px 12px;
          border-radius: 8px;
        }

        .action-note {
          font-size: 12px;
          color: #6b7280;
        }

        .action-note.closed {
          color: #9ca3af;
        }

        /* Calendar View Section */
        .calendar-view-section {
          background: #ffffff;
          border-radius: 14px;
          border: 1px solid #e5e7eb;
          padding: 24px;
          box-shadow: 0 2px 6px rgba(0, 0, 0, 0.02);
          display: flex;
          flex-direction: column;
          gap: 18px;
        }

        .section-icon-badge.royal {
          background-color: #eff6ff;
          width: 36px;
          height: 36px;
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .section-title-wrap {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .calendar-legend {
          display: flex;
          gap: 16px;
          flex-wrap: wrap;
          padding-bottom: 12px;
          border-bottom: 1px solid #f1f5f9;
        }

        .legend-item {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 12px;
          color: #4b5563;
        }

        .legend-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
        }

        .legend-dot.green {
          background-color: #16a34a;
        }

        .legend-dot.red {
          background-color: #dc2626;
        }

        .legend-dot.blue {
          background-color: #1d4ed8;
        }

        .legend-dot.yellow {
          background-color: #f59e0b;
        }

        .legend-dot.gray {
          background-color: #9ca3af;
        }

        .calendar-grid-wrap {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 12px;
        }

        @media (min-width: 640px) {
          .calendar-grid-wrap {
            grid-template-columns: repeat(4, 1fr);
          }
        }

        @media (min-width: 1024px) {
          .calendar-grid-wrap {
            grid-template-columns: repeat(8, 1fr);
          }
        }

        .calendar-day-cell {
          background-color: #f8fafc;
          border: 1px solid #e2e8f0;
          border-radius: 10px;
          padding: 10px;
          display: flex;
          flex-direction: column;
          gap: 6px;
          align-items: flex-start;
        }

        .cell-dot {
          width: 10px;
          height: 10px;
          border-radius: 50%;
        }

        .cell-dot.green {
          background-color: #16a34a;
        }

        .cell-dot.red {
          background-color: #dc2626;
        }

        .cell-dot.blue {
          background-color: #1d4ed8;
        }

        .cell-dot.yellow {
          background-color: #f59e0b;
        }

        .cell-dot.gray {
          background-color: #d1d5db;
        }

        .cell-details {
          display: flex;
          flex-direction: column;
        }

        .cell-day {
          font-size: 11px;
          font-weight: 700;
          color: #111827;
        }

        .cell-name {
          font-size: 10px;
          color: #6b7280;
        }

        /* Loading & Empty */
        .loading-state-card {
          text-align: center;
          padding: 40px;
          color: #6b7280;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 12px;
        }

        .spinner {
          width: 28px;
          height: 28px;
          border: 3px solid #e5e7eb;
          border-top-color: #1d4ed8;
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
        }

        .btn-spinner {
          width: 14px;
          height: 14px;
          border: 2px solid rgba(255, 255, 255, 0.4);
          border-top-color: #ffffff;
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
        }

        @keyframes spin {
          to {
            transform: rotate(360deg);
          }
        }

        .empty-state-card {
          padding: 30px;
          text-align: center;
          color: #6b7280;
          background: #f9fafb;
          border-radius: 8px;
          font-size: 13.5px;
        }

        @media (max-width: 640px) {
          .page-header {
            text-align: center;
          }

          .stat-card {
            padding: 16px 14px;
          }

          .list-section,
          .calendar-view-section {
            padding: 16px 14px;
            border-radius: 12px;
          }

          .occurrence-row-card {
            padding: 14px 12px;
            flex-direction: column;
            align-items: flex-start;
          }

          .occurrence-action-col {
            width: 100%;
          }

          .mark-present-btn {
            width: 100%;
            justify-content: center;
          }

          .calendar-grid-wrap {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </div>
  )
}
