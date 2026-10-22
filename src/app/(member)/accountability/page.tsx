'use client'

import React, { useState, useEffect, useMemo, useCallback } from 'react'
import { BIBLE_BOOK_NAMES, BIBLE_BOOKS, validateBibleReference } from '@/lib/bible'
import { createClient } from '@/lib/supabase/client'

// --- Types ---
type TabType = 'prayer' | 'bible_study' | 'sermon'
type TaskStatus = 'no_schedule' | 'upcoming' | 'ready' | 'completed' | 'missed'

interface Schedule {
  id: string
  member_id: string
  task_type: 'prayer' | 'bible_study'
  start_time: string
  duration_minutes: number
  is_active: boolean
  created_at?: string
  updated_at?: string
}

interface Completion {
  id: string
  member_id: string
  schedule_id: string
  task_type: 'prayer' | 'bible_study'
  accountability_date: string
  scheduled_start: string
  duration_minutes: number
  completion_window_start: string
  completion_window_end: string
  completed_at: string | null
  status: 'upcoming' | 'ready' | 'completed' | 'missed'
  bible_book: string | null
  bible_start_chapter: number | null
  bible_start_verse: number | null
  bible_end_chapter: number | null
  bible_end_verse: number | null
  bible_reference_text: string | null
  created_at?: string
}

interface TodayTaskData {
  task_type: 'prayer' | 'bible_study'
  has_schedule: boolean
  schedule: Schedule | null
  completion: Completion | null
  status: TaskStatus
  window_start: string | null
  window_end: string | null
}

interface TodayApiResponse {
  date: string
  prayer: TodayTaskData
  bible_study: TodayTaskData
}

interface StreakData {
  currentStreak: number
  longestStreak: number
  totalQualifyingDays: number
  todayPrayerCompleted: boolean
  todayBibleStudyCompleted: boolean
}

interface Sermon {
  id: string
  title: string
  preacher: string
  description: string | null
  spotify_url: string
  cover_image_url: string | null
  relevant_week: string
  is_current: boolean
  status: string
  published_at: string | null
}

// --- Time Helper Functions ---
function formatTo12Hour(timeStr: string | null | undefined): string {
  if (!timeStr) return '--:--'
  const parts = timeStr.split(':')
  let hours = parseInt(parts[0], 10)
  const minutes = parseInt(parts[1], 10)
  if (isNaN(hours) || isNaN(minutes)) return timeStr
  const period = hours >= 12 ? 'PM' : 'AM'
  hours = hours % 12
  if (hours === 0) hours = 12
  return `${hours}:${String(minutes).padStart(2, '0')} ${period}`
}

function calculateEndTime(startTime: string, durationMinutes: number): string {
  if (!startTime) return '--:--'
  const [hStr, mStr] = startTime.split(':')
  const startH = parseInt(hStr, 10)
  const startM = parseInt(mStr, 10)
  if (isNaN(startH) || isNaN(startM)) return '--:--'

  const totalM = startH * 60 + startM + durationMinutes
  const endH = Math.floor(totalM / 60) % 24
  const endM = totalM % 60
  return `${String(endH).padStart(2, '0')}:${String(endM).padStart(2, '0')}`
}

function formatCountdown(ms: number): string {
  if (ms <= 0) return '00:00'
  const totalSeconds = Math.floor(ms / 1000)
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60
  if (hours > 0) {
    return `${hours}h ${String(minutes).padStart(2, '0')}m ${String(seconds).padStart(2, '0')}s`
  }
  return `${String(minutes).padStart(2, '0')}m ${String(seconds).padStart(2, '0')}s`
}

function formatDateDisplay(dateStr: string): string {
  try {
    const [y, m, d] = dateStr.split('-').map(Number)
    const date = new Date(y, m - 1, d)
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
  } catch {
    return dateStr
  }
}

function SermonSpotifyCover({ sermon }: { sermon: Sermon }) {
  const [coverUrl, setCoverUrl] = useState<string | null>(sermon.cover_image_url || null)

  useEffect(() => {
    if (sermon.cover_image_url) {
      setCoverUrl(sermon.cover_image_url)
      return
    }

    if (sermon.spotify_url) {
      fetch(`https://open.spotify.com/oembed?url=${encodeURIComponent(sermon.spotify_url.trim())}`)
        .then((res) => (res.ok ? res.json() : null))
        .then((data) => {
          if (data?.thumbnail_url) {
            setCoverUrl(data.thumbnail_url)
          }
        })
        .catch(() => {})
    }
  }, [sermon.cover_image_url, sermon.spotify_url])

  const embedUrl = useMemo(() => {
    if (!sermon.spotify_url) return null
    const match = sermon.spotify_url.match(/open\.spotify\.com\/(track|episode|show|album)\/([a-zA-Z0-9]+)/)
    return match ? `https://open.spotify.com/embed/${match[1]}/${match[2]}?utm_source=generator&theme=0` : null
  }, [sermon.spotify_url])

  if (coverUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={coverUrl}
        alt={sermon.title}
        style={{ width: '100%', height: '100%', minHeight: '260px', objectFit: 'cover', display: 'block' }}
      />
    )
  }

  if (embedUrl) {
    return (
      <iframe
        src={embedUrl}
        width="100%"
        height="100%"
        style={{ minHeight: '260px', width: '100%', border: 0 }}
        allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
        loading="lazy"
        title={sermon.title}
      />
    )
  }

  return (
    <div style={{ textAlign: 'center', color: '#ffffff', padding: '2rem' }}>
      <div style={{ fontSize: '54px', marginBottom: '8px' }}>🎧</div>
      <div style={{ fontSize: 'var(--text-lg)', fontWeight: 600, letterSpacing: '0.02em' }}>
        RCF Ikole Sermon
      </div>
      <div style={{ fontSize: 'var(--text-xs)', opacity: 0.8, marginTop: '4px' }}>
        Word of Faith &amp; Grace
      </div>
    </div>
  )
}

export default function AccountabilityPage() {
  const [activeTab, setActiveTab] = useState<TabType>('prayer')

  // Global server/client state
  const [loading, setLoading] = useState<boolean>(true)
  const [actionLoading, setActionLoading] = useState<boolean>(false)
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null)

  // Data states
  const [todayDate, setTodayDate] = useState<string>('')
  const [prayerTask, setPrayerTask] = useState<TodayTaskData | null>(null)
  const [bibleStudyTask, setBibleStudyTask] = useState<TodayTaskData | null>(null)
  const [streak, setStreak] = useState<StreakData>({
    currentStreak: 0,
    longestStreak: 0,
    totalQualifyingDays: 0,
    todayPrayerCompleted: false,
    todayBibleStudyCompleted: false,
  })
  const [history, setHistory] = useState<Completion[]>([])
  const [sermon, setSermon] = useState<Sermon | null>(null)
  const [sermonLoading, setSermonLoading] = useState<boolean>(false)

  // Real-time ticking time state
  const [currentTime, setCurrentTime] = useState<Date>(new Date())

  // Schedule forms state
  const [prayerFormOpen, setPrayerFormOpen] = useState<boolean>(false)
  const [prayerStartTime, setPrayerStartTime] = useState<string>('06:00')
  const [prayerDuration, setPrayerDuration] = useState<number>(30)

  const [bibleFormOpen, setBibleFormOpen] = useState<boolean>(false)
  const [bibleStartTime, setBibleStartTime] = useState<string>('20:00')
  const [bibleDuration, setBibleDuration] = useState<number>(30)

  // Bible study completion modal state
  const [bibleModalOpen, setBibleModalOpen] = useState<boolean>(false)
  const [bookSearch, setBookSearch] = useState<string>('')
  const [selectedBook, setSelectedBook] = useState<string>('John')
  const [startChapter, setStartChapter] = useState<number>(1)
  const [startVerse, setStartVerse] = useState<number>(1)
  const [endChapter, setEndChapter] = useState<number>(1)
  const [endVerse, setEndVerse] = useState<number>(16)
  const [referenceValidation, setReferenceValidation] = useState<{ valid: boolean; error?: string; formatted?: string }>({
    valid: true,
    formatted: 'John 1:1–16',
  })

  // --- Real-Time Countdown Interval ---
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date())
    }, 1000)
    return () => clearInterval(timer)
  }, [])

  // --- Data Fetching ---
  const fetchAllData = useCallback(async () => {
    try {
      setLoading(true)
      const [todayRes, streakRes, historyRes] = await Promise.all([
        fetch('/api/accountability/today'),
        fetch('/api/accountability/streak'),
        fetch('/api/accountability/history?days=30'),
      ])

      if (todayRes.ok) {
        const todayData: TodayApiResponse = await todayRes.json()
        setTodayDate(todayData.date)
        setPrayerTask(todayData.prayer)
        setBibleStudyTask(todayData.bible_study)

        // Set initial schedule form values if active schedule exists
        if (todayData.prayer?.schedule) {
          setPrayerStartTime(todayData.prayer.schedule.start_time.slice(0, 5))
          setPrayerDuration(todayData.prayer.schedule.duration_minutes)
        }
        if (todayData.bible_study?.schedule) {
          setBibleStartTime(todayData.bible_study.schedule.start_time.slice(0, 5))
          setBibleDuration(todayData.bible_study.schedule.duration_minutes)
        }
      }

      if (streakRes.ok) {
        const streakData: StreakData = await streakRes.json()
        setStreak(streakData)
      }

      if (historyRes.ok) {
        const historyData: Completion[] = await historyRes.json()
        setHistory(historyData)
      }
    } catch (err) {
      console.error('Error fetching accountability data:', err)
      setFeedback({ type: 'error', message: 'Failed to load accountability data. Please refresh.' })
    } finally {
      setLoading(false)
    }
  }, [])

  // Fetch sermon
  const fetchSermon = useCallback(async () => {
    try {
      setSermonLoading(true)
      const supabase = createClient()
      const { data, error } = await supabase
        .from('sermons')
        .select('*')
        .eq('status', 'published')
        .order('is_current', { ascending: false })
        .order('published_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      if (error) {
        console.error('Error fetching sermon:', error)
      } else {
        setSermon(data as Sermon | null)
      }
    } catch (err) {
      console.error('Error fetching sermon:', err)
    } finally {
      setSermonLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchAllData()
  }, [fetchAllData])

  useEffect(() => {
    if (activeTab === 'sermon' && !sermon) {
      fetchSermon()
    }
  }, [activeTab, sermon, fetchSermon])

  // Clear feedback after 6 seconds
  useEffect(() => {
    if (feedback) {
      const timer = setTimeout(() => setFeedback(null), 6000)
      return () => clearTimeout(timer)
    }
  }, [feedback])

  // --- Dynamic Status Calculation (Real-Time Synchronized) ---
  const getDynamicStatus = useCallback(
    (task: TodayTaskData | null): { status: TaskStatus; countdownText: string; isActionable: boolean } => {
      if (!task || !task.has_schedule || !task.schedule) {
        return { status: 'no_schedule', countdownText: '', isActionable: false }
      }

      if (task.completion?.completed_at || task.status === 'completed') {
        return { status: 'completed', countdownText: 'Completed', isActionable: false }
      }

      if (!task.window_start || !task.window_end) {
        return { status: task.status, countdownText: '', isActionable: false }
      }

      const windowStart = new Date(task.window_start).getTime()
      const windowEnd = new Date(task.window_end).getTime()
      const now = currentTime.getTime()

      if (now < windowStart) {
        const msRemaining = windowStart - now
        return {
          status: 'upcoming',
          countdownText: `Opens in ${formatCountdown(msRemaining)}`,
          isActionable: false,
        }
      } else if (now >= windowStart && now <= windowEnd) {
        const msRemaining = windowEnd - now
        return {
          status: 'ready',
          countdownText: `Window closes in ${formatCountdown(msRemaining)}`,
          isActionable: true,
        }
      } else {
        return {
          status: 'missed',
          countdownText: 'Window expired',
          isActionable: false,
        }
      }
    },
    [currentTime]
  )

  const prayerStatusInfo = useMemo(() => getDynamicStatus(prayerTask), [getDynamicStatus, prayerTask])
  const bibleStatusInfo = useMemo(() => getDynamicStatus(bibleStudyTask), [getDynamicStatus, bibleStudyTask])

  // --- Schedule Update Handler ---
  const handleSaveSchedule = async (taskType: 'prayer' | 'bible_study') => {
    setActionLoading(true)
    setFeedback(null)
    const startTime = taskType === 'prayer' ? prayerStartTime : bibleStartTime
    const duration = taskType === 'prayer' ? prayerDuration : bibleDuration

    try {
      const res = await fetch('/api/accountability/schedule', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          task_type: taskType,
          start_time: startTime,
          duration_minutes: Number(duration),
        }),
      })

      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || 'Failed to update schedule')
      }

      setFeedback({
        type: 'success',
        message: `${taskType === 'prayer' ? 'Prayer' : 'Bible Study'} schedule updated successfully!`,
      })
      if (taskType === 'prayer') setPrayerFormOpen(false)
      if (taskType === 'bible_study') setBibleFormOpen(false)
      await fetchAllData()
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : 'Error updating schedule'
      setFeedback({ type: 'error', message: errorMsg })
    } finally {
      setActionLoading(false)
    }
  }

  // --- Prayer Complete Handler ---
  const handleCompletePrayer = async () => {
    if (!prayerTask?.schedule?.id) return
    setActionLoading(true)
    setFeedback(null)

    try {
      const res = await fetch('/api/accountability/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          schedule_id: prayerTask.schedule.id,
          task_type: 'prayer',
          accountability_date: todayDate,
        }),
      })

      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || 'Failed to mark prayer complete')
      }

      setFeedback({
        type: 'success',
        message: 'Prayer completed successfully! Your devotion has been recorded.',
      })
      await fetchAllData()
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : 'Error marking prayer complete'
      setFeedback({ type: 'error', message: errorMsg })
    } finally {
      setActionLoading(false)
    }
  }

  // --- Bible Reference Live Validation ---
  useEffect(() => {
    const result = validateBibleReference({
      book: selectedBook,
      startChapter,
      startVerse,
      endChapter,
      endVerse,
    })
    setReferenceValidation(result)
  }, [selectedBook, startChapter, startVerse, endChapter, endVerse])

  // --- Bible Study Complete Handler ---
  const handleCompleteBibleStudy = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!bibleStudyTask?.schedule?.id) return
    if (!referenceValidation.valid) {
      setFeedback({ type: 'error', message: referenceValidation.error || 'Invalid Bible reference' })
      return
    }

    setActionLoading(true)
    setFeedback(null)

    try {
      const res = await fetch('/api/accountability/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          schedule_id: bibleStudyTask.schedule.id,
          task_type: 'bible_study',
          accountability_date: todayDate,
          bible_book: selectedBook,
          bible_start_chapter: startChapter,
          bible_start_verse: startVerse,
          bible_end_chapter: endChapter,
          bible_end_verse: endVerse,
        }),
      })

      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || 'Failed to record Bible study')
      }

      setFeedback({
        type: 'success',
        message: `Bible study recorded (${referenceValidation.formatted})! Keep growing in the Word.`,
      })
      setBibleModalOpen(false)
      await fetchAllData()
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : 'Error completing Bible study'
      setFeedback({ type: 'error', message: errorMsg })
    } finally {
      setActionLoading(false)
    }
  }

  // Filter books for book selector
  const filteredBooks = useMemo(() => {
    if (!bookSearch.trim()) return BIBLE_BOOK_NAMES
    return BIBLE_BOOK_NAMES.filter((b) => b.toLowerCase().includes(bookSearch.toLowerCase()))
  }, [bookSearch])

  // Filter histories
  const prayerHistory = useMemo(() => history.filter((h) => h.task_type === 'prayer'), [history])
  const bibleHistory = useMemo(() => history.filter((h) => h.task_type === 'bible_study'), [history])

  // --- Render Status Badge ---
  const renderStatusBadge = (status: TaskStatus) => {
    switch (status) {
      case 'completed':
        return <span className="badge badge-success">✓ Completed</span>
      case 'ready':
        return <span className="badge badge-warning animate-pulse">● Ready to Complete</span>
      case 'upcoming':
        return <span className="badge badge-primary">⏳ Upcoming</span>
      case 'missed':
        return <span className="badge badge-error">✕ Missed</span>
      case 'no_schedule':
      default:
        return <span className="badge badge-neutral">No Schedule Set</span>
    }
  }

  return (
    <div className="container" style={{ paddingTop: '2rem', paddingBottom: '4rem', maxWidth: '1000px' }}>
      {/* Page Header */}
      <div style={{ marginBottom: '2rem' }}>
        <h1 className="heading-1" style={{ color: 'var(--color-primary)', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span>Personal Accountability</span>
        </h1>
        <p className="body-md text-muted" style={{ marginTop: '6px' }}>
          Commit your spiritual walk unto the Lord. Track daily prayer, scripture study, and listen to weekly sermons.
        </p>
      </div>

      {/* Global Alerts / Feedback */}
      {feedback && (
        <div
          style={{
            padding: '12px 18px',
            marginBottom: '1.5rem',
            borderRadius: 'var(--radius-md)',
            backgroundColor: feedback.type === 'success' ? 'var(--color-success-bg)' : 'var(--color-error-bg)',
            color: feedback.type === 'success' ? 'var(--color-success)' : 'var(--color-error)',
            border: `1px solid ${feedback.type === 'success' ? '#bbf7d0' : '#fecaca'}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            boxShadow: 'var(--shadow-sm)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: 'var(--text-sm)', fontWeight: 500 }}>
            <span>{feedback.type === 'success' ? '✓' : '⚠️'}</span>
            <span>{feedback.message}</span>
          </div>
          <button
            onClick={() => setFeedback(null)}
            style={{ cursor: 'pointer', background: 'none', border: 'none', fontSize: '18px', lineHeight: 1 }}
          >
            ×
          </button>
        </div>
      )}

      {/* STREAK & TODAY'S OVERVIEW BANNER */}
      {/* STREAK & TODAY'S OVERVIEW BANNER */}
      <div className="card streak-hero-banner">
        <div className="streak-banner-flex">
          {/* Streaks stats */}
          <div className="streak-stats-row">
            <div className="streak-stat-item">
              <div className="streak-stat-icon flame">🔥</div>
              <div>
                <div className="streak-stat-label">Current Streak</div>
                <div className="streak-stat-value">
                  {streak.currentStreak} <span>days</span>
                </div>
              </div>
            </div>

            <div className="streak-divider" />

            <div className="streak-stat-item">
              <div className="streak-stat-icon trophy">🏆</div>
              <div>
                <div className="streak-stat-label">Longest Streak</div>
                <div className="streak-stat-value">
                  {streak.longestStreak} <span>days</span>
                </div>
              </div>
            </div>
          </div>

          {/* Today's completion indicators */}
          <div className="streak-today-pill">
            <span className="today-label">Today:</span>
            <div className="today-item">
              <span>🙏 Prayer:</span>
              <span className={`status-tag ${streak.todayPrayerCompleted ? 'done' : 'pending'}`}>
                {streak.todayPrayerCompleted ? '✓ Done' : '⏳ Pending'}
              </span>
            </div>
            <span className="today-sep">|</span>
            <div className="today-item">
              <span>📖 Study:</span>
              <span className={`status-tag ${streak.todayBibleStudyCompleted ? 'done' : 'pending'}`}>
                {streak.todayBibleStudyCompleted ? '✓ Done' : '⏳ Pending'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* NAVIGATION TABS */}
      <div className="nav-tabs" style={{ marginBottom: '2rem' }}>
        <button
          className={`nav-tab-item ${activeTab === 'prayer' ? 'active' : ''}`}
          onClick={() => setActiveTab('prayer')}
          style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
        >
          <span>🙏 Prayers</span>
          {prayerStatusInfo.status === 'ready' && <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: 'var(--color-warning)' }} />}
        </button>
        <button
          className={`nav-tab-item ${activeTab === 'bible_study' ? 'active' : ''}`}
          onClick={() => setActiveTab('bible_study')}
          style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
        >
          <span>📖 Bible Study</span>
          {bibleStatusInfo.status === 'ready' && <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: 'var(--color-warning)' }} />}
        </button>
        <button
          className={`nav-tab-item ${activeTab === 'sermon' ? 'active' : ''}`}
          onClick={() => setActiveTab('sermon')}
          style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
        >
          <span>🎙️ Sermon of the Week</span>
        </button>
      </div>

      {/* ============================================================== */}
      {/* TAB 1: PRAYERS TAB                                             */}
      {/* ============================================================== */}
      {activeTab === 'prayer' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          {/* 1. Today's Prayer Task Card */}
          <div className="card" style={{ borderLeft: '5px solid var(--color-primary)' }}>
            <div className="card-header" style={{ padding: '1.25rem 1.5rem' }}>
              <div>
                <h3 className="heading-3" style={{ fontSize: 'var(--text-xl)' }}>
                  Today&apos;s Prayer Devotion
                </h3>
                <p className="body-sm text-muted">{todayDate ? formatDateDisplay(todayDate) : 'Today'}</p>
              </div>
              <div>{renderStatusBadge(prayerStatusInfo.status)}</div>
            </div>

            <div className="card-body" style={{ padding: '1.5rem' }}>
              {prayerStatusInfo.status === 'no_schedule' ? (
                <div style={{ textAlign: 'center', padding: '1rem 0' }}>
                  <p className="body-md text-muted" style={{ marginBottom: '1rem' }}>
                    You have not set a prayer schedule yet. Set your daily prayer time to activate accountability tracking.
                  </p>
                  <button className="btn btn-primary" onClick={() => setPrayerFormOpen(true)}>
                    + Set Prayer Schedule
                  </button>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                  {/* Schedule Details Row */}
                  <div className="schedule-details-grid">
                    <div className="schedule-detail-box">
                      <div className="detail-label">Start Time</div>
                      <div className="detail-value">{formatTo12Hour(prayerTask?.schedule?.start_time)}</div>
                    </div>
                    <div className="schedule-detail-box">
                      <div className="detail-label">Duration</div>
                      <div className="detail-value">{prayerTask?.schedule?.duration_minutes} mins</div>
                    </div>
                    <div className="schedule-detail-box">
                      <div className="detail-label">Calculated End Time</div>
                      <div className="detail-value">
                        {prayerTask?.schedule &&
                          formatTo12Hour(calculateEndTime(prayerTask.schedule.start_time, prayerTask.schedule.duration_minutes))}
                      </div>
                    </div>
                    <div className="schedule-detail-box highlight">
                      <div className="detail-label">Completion Window</div>
                      <div className="detail-value primary">
                        {prayerTask?.window_start && prayerTask?.window_end
                          ? `${new Date(prayerTask.window_start).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })} – ${new Date(prayerTask.window_end).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}`
                          : '--'}
                      </div>
                    </div>
                  </div>

                  {/* Status & Countdown Messaging */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
                    <div>
                      {prayerStatusInfo.status === 'upcoming' && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{ fontSize: '20px' }}>⏳</span>
                          <div>
                            <div style={{ fontWeight: 600, color: 'var(--color-primary)' }}>
                              Prayer completion window opens after prayer ends.
                            </div>
                            <div className="text-sm text-muted">{prayerStatusInfo.countdownText}</div>
                          </div>
                        </div>
                      )}

                      {prayerStatusInfo.status === 'ready' && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{ fontSize: '20px' }}>🔔</span>
                          <div>
                            <div style={{ fontWeight: 600, color: 'var(--color-warning)' }}>
                              Completion window is OPEN! Mark your prayer as complete now.
                            </div>
                            <div className="text-sm text-muted">{prayerStatusInfo.countdownText}</div>
                          </div>
                        </div>
                      )}

                      {prayerStatusInfo.status === 'completed' && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--color-success)' }}>
                          <span style={{ fontSize: '20px' }}>🎉</span>
                          <div>
                            <div style={{ fontWeight: 600 }}>Prayer Completed for Today!</div>
                            <div className="text-sm text-muted">
                              Marked at {prayerTask?.completion?.completed_at ? new Date(prayerTask.completion.completed_at).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }) : 'today'}.
                            </div>
                          </div>
                        </div>
                      )}

                      {prayerStatusInfo.status === 'missed' && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--color-error)' }}>
                          <span style={{ fontSize: '20px' }}>⚠️</span>
                          <div>
                            <div style={{ fontWeight: 600 }}>Completion window has closed for today.</div>
                            <div className="text-sm text-muted">Remember: Every day is a fresh opportunity to connect with God.</div>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Action Button: Disabled until ready, disappears after expiry or completion */}
                    {prayerStatusInfo.status !== 'completed' && prayerStatusInfo.status !== 'missed' && (
                      <button
                        className="btn btn-primary btn-md"
                        disabled={!prayerStatusInfo.isActionable || actionLoading}
                        onClick={handleCompletePrayer}
                        style={{
                          backgroundColor: prayerStatusInfo.isActionable ? 'var(--color-success)' : undefined,
                          borderColor: prayerStatusInfo.isActionable ? 'var(--color-success)' : undefined,
                        }}
                      >
                        {actionLoading ? 'Recording...' : prayerStatusInfo.isActionable ? '✓ Mark Prayer Complete' : 'Window Not Yet Open'}
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>

            <div className="card-footer" style={{ padding: '0.85rem 1.5rem', display: 'flex', justifyContent: 'flex-end' }}>
              <button
                className="btn btn-ghost btn-sm"
                onClick={() => setPrayerFormOpen(!prayerFormOpen)}
              >
                {prayerFormOpen ? 'Cancel Schedule Edit' : '⚙️ Set / Update Prayer Schedule'}
              </button>
            </div>
          </div>

          {/* 2. Set/Update Prayer Schedule Form (Collapsible/Toggle) */}
          {prayerFormOpen && (
            <div className="card animate-slideUp">
              <div className="card-header">
                <h3 className="heading-4">Set / Update Daily Prayer Schedule</h3>
                <span className="text-xs text-muted">Timezone: Africa/Lagos (WAT)</span>
              </div>
              <div className="card-body">
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.25rem' }}>
                  <div className="form-group">
                    <label className="form-label" htmlFor="prayer-start-time">
                      Start Time (24h) <span className="required">*</span>
                    </label>
                    <input
                      id="prayer-start-time"
                      type="time"
                      className="form-input"
                      value={prayerStartTime}
                      onChange={(e) => setPrayerStartTime(e.target.value)}
                    />
                    <span className="form-hint">Selected: {formatTo12Hour(prayerStartTime)}</span>
                  </div>

                  <div className="form-group">
                    <label className="form-label" htmlFor="prayer-duration">
                      Duration <span className="required">*</span>
                    </label>
                    <select
                      id="prayer-duration"
                      className="form-select"
                      value={prayerDuration}
                      onChange={(e) => setPrayerDuration(Number(e.target.value))}
                    >
                      <option value={15}>15 minutes</option>
                      <option value={30}>30 minutes</option>
                      <option value={45}>45 minutes</option>
                      <option value={60}>60 minutes (1 hour)</option>
                      <option value={90}>90 minutes (1.5 hours)</option>
                      <option value={120}>120 minutes (2 hours)</option>
                    </select>
                    <span className="form-hint">Time spent in focused prayer</span>
                  </div>
                </div>

                {/* Calculation preview */}
                <div
                  style={{
                    backgroundColor: 'var(--color-primary-50)',
                    border: '1px solid var(--color-primary-100)',
                    borderRadius: 'var(--radius-md)',
                    padding: '1rem',
                    marginTop: '1rem',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    flexWrap: 'wrap',
                    gap: '1rem',
                  }}
                >
                  <div>
                    <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-primary-dark)', fontWeight: 600 }}>
                      CALCULATED SCHEDULE PREVIEW:
                    </div>
                    <div style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text)', marginTop: '4px' }}>
                      Prayer: <strong>{formatTo12Hour(prayerStartTime)}</strong> to{' '}
                      <strong>{formatTo12Hour(calculateEndTime(prayerStartTime, prayerDuration))}</strong>
                    </div>
                    <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)', marginTop: '2px' }}>
                      Completion Window: {formatTo12Hour(calculateEndTime(prayerStartTime, prayerDuration))} –{' '}
                      {formatTo12Hour(calculateEndTime(calculateEndTime(prayerStartTime, prayerDuration), 60))} (60 min window)
                    </div>
                  </div>
                  <button
                    className="btn btn-primary"
                    disabled={actionLoading}
                    onClick={() => handleSaveSchedule('prayer')}
                  >
                    {actionLoading ? 'Saving...' : 'Save Prayer Schedule'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* 3. Prayer History (Last 30 Days) */}
          <div className="card">
            <div className="card-header">
              <h3 className="heading-4">Prayer History (Last 30 Days)</h3>
              <span className="badge badge-neutral">{prayerHistory.length} Recorded Days</span>
            </div>
            <div className="card-body" style={{ padding: 0 }}>
              {prayerHistory.length === 0 ? (
                <div style={{ padding: '2rem', textAlign: 'center' }} className="text-muted">
                  No prayer completions recorded in the last 30 days. Complete your prayers daily to build your record!
                </div>
              ) : (
                <div className="table-wrapper" style={{ border: 'none', borderRadius: 0 }}>
                  <table className="table">
                    <thead>
                      <tr>
                        <th>Date</th>
                        <th>Scheduled Time</th>
                        <th>Duration</th>
                        <th>Completed At</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {prayerHistory.map((item) => (
                        <tr key={item.id}>
                          <td style={{ fontWeight: 500 }}>{formatDateDisplay(item.accountability_date)}</td>
                          <td>{formatTo12Hour(item.scheduled_start)}</td>
                          <td>{item.duration_minutes} mins</td>
                          <td>
                            {item.completed_at
                              ? new Date(item.completed_at).toLocaleTimeString('en-US', {
                                  hour: 'numeric',
                                  minute: '2-digit',
                                })
                              : '--'}
                          </td>
                          <td>{renderStatusBadge(item.status)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* TAB 2: BIBLE STUDY TAB                                         */}
      {/* ============================================================== */}
      {activeTab === 'bible_study' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          {/* 1. Today's Bible Study Task Card */}
          <div className="card" style={{ borderLeft: '5px solid var(--color-accent)' }}>
            <div className="card-header" style={{ padding: '1.25rem 1.5rem' }}>
              <div>
                <h3 className="heading-3" style={{ fontSize: 'var(--text-xl)' }}>
                  Today&apos;s Bible Study
                </h3>
                <p className="body-sm text-muted">{todayDate ? formatDateDisplay(todayDate) : 'Today'}</p>
              </div>
              <div>{renderStatusBadge(bibleStatusInfo.status)}</div>
            </div>

            <div className="card-body" style={{ padding: '1.5rem' }}>
              {bibleStatusInfo.status === 'no_schedule' ? (
                <div style={{ textAlign: 'center', padding: '1rem 0' }}>
                  <p className="body-md text-muted" style={{ marginBottom: '1rem' }}>
                    You have not set a Bible study schedule yet. Set your study time to unlock scripture tracking and completion.
                  </p>
                  <button className="btn btn-primary" onClick={() => setBibleFormOpen(true)}>
                    + Set Bible Study Schedule
                  </button>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                  {/* Schedule Details Row */}
                  <div className="schedule-details-grid">
                    <div className="schedule-detail-box">
                      <div className="detail-label">Start Time</div>
                      <div className="detail-value">{formatTo12Hour(bibleStudyTask?.schedule?.start_time)}</div>
                    </div>
                    <div className="schedule-detail-box">
                      <div className="detail-label">Duration</div>
                      <div className="detail-value">{bibleStudyTask?.schedule?.duration_minutes} mins</div>
                    </div>
                    <div className="schedule-detail-box">
                      <div className="detail-label">Calculated End Time</div>
                      <div className="detail-value">
                        {bibleStudyTask?.schedule &&
                          formatTo12Hour(calculateEndTime(bibleStudyTask.schedule.start_time, bibleStudyTask.schedule.duration_minutes))}
                      </div>
                    </div>
                    <div className="schedule-detail-box highlight">
                      <div className="detail-label">Completion Window</div>
                      <div className="detail-value primary">
                        {bibleStudyTask?.window_start && bibleStudyTask?.window_end
                          ? `${new Date(bibleStudyTask.window_start).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })} – ${new Date(bibleStudyTask.window_end).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}`
                          : '--'}
                      </div>
                    </div>
                  </div>

                  {/* Status & Countdown Messaging */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
                    <div>
                      {bibleStatusInfo.status === 'upcoming' && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{ fontSize: '20px' }}>⏳</span>
                          <div>
                            <div style={{ fontWeight: 600, color: 'var(--color-primary)' }}>
                              Bible study completion window opens once your study period ends.
                            </div>
                            <div className="text-sm text-muted">{bibleStatusInfo.countdownText}</div>
                          </div>
                        </div>
                      )}

                      {bibleStatusInfo.status === 'ready' && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{ fontSize: '20px' }}>📖</span>
                          <div>
                            <div style={{ fontWeight: 600, color: 'var(--color-warning)' }}>
                              Completion window is OPEN! Submit what you read today.
                            </div>
                            <div className="text-sm text-muted">{bibleStatusInfo.countdownText}</div>
                          </div>
                        </div>
                      )}

                      {bibleStatusInfo.status === 'completed' && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--color-success)' }}>
                          <span style={{ fontSize: '20px' }}>🎉</span>
                          <div>
                            <div style={{ fontWeight: 600 }}>Bible Study Completed for Today!</div>
                            <div className="text-sm" style={{ marginTop: '2px', color: 'var(--color-primary)' }}>
                              <strong>Read:</strong> {bibleStudyTask?.completion?.bible_reference_text || 'Completed'}
                            </div>
                          </div>
                        </div>
                      )}

                      {bibleStatusInfo.status === 'missed' && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--color-error)' }}>
                          <span style={{ fontSize: '20px' }}>⚠️</span>
                          <div>
                            <div style={{ fontWeight: 600 }}>Completion window has closed for today.</div>
                            <div className="text-sm text-muted">Thy word have I hid in mine heart, that I might not sin against thee.</div>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Action Button: opens modal */}
                    {bibleStatusInfo.status !== 'completed' && bibleStatusInfo.status !== 'missed' && (
                      <button
                        className="btn btn-primary btn-md"
                        disabled={!bibleStatusInfo.isActionable || actionLoading}
                        onClick={() => setBibleModalOpen(true)}
                        style={{
                          backgroundColor: bibleStatusInfo.isActionable ? 'var(--color-primary)' : undefined,
                        }}
                      >
                        {bibleStatusInfo.isActionable ? '📖 Complete Bible Study' : 'Window Not Yet Open'}
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>

            <div className="card-footer" style={{ padding: '0.85rem 1.5rem', display: 'flex', justifyContent: 'flex-end' }}>
              <button
                className="btn btn-ghost btn-sm"
                onClick={() => setBibleFormOpen(!bibleFormOpen)}
              >
                {bibleFormOpen ? 'Cancel Schedule Edit' : '⚙️ Set / Update Bible Study Schedule'}
              </button>
            </div>
          </div>

          {/* 2. Set/Update Bible Study Schedule Form */}
          {bibleFormOpen && (
            <div className="card animate-slideUp">
              <div className="card-header">
                <h3 className="heading-4">Set / Update Daily Bible Study Schedule</h3>
                <span className="text-xs text-muted">Timezone: Africa/Lagos (WAT)</span>
              </div>
              <div className="card-body">
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.25rem' }}>
                  <div className="form-group">
                    <label className="form-label" htmlFor="bible-start-time">
                      Start Time (24h) <span className="required">*</span>
                    </label>
                    <input
                      id="bible-start-time"
                      type="time"
                      className="form-input"
                      value={bibleStartTime}
                      onChange={(e) => setBibleStartTime(e.target.value)}
                    />
                    <span className="form-hint">Selected: {formatTo12Hour(bibleStartTime)}</span>
                  </div>

                  <div className="form-group">
                    <label className="form-label" htmlFor="bible-duration">
                      Duration <span className="required">*</span>
                    </label>
                    <select
                      id="bible-duration"
                      className="form-select"
                      value={bibleDuration}
                      onChange={(e) => setBibleDuration(Number(e.target.value))}
                    >
                      <option value={15}>15 minutes</option>
                      <option value={30}>30 minutes</option>
                      <option value={45}>45 minutes</option>
                      <option value={60}>60 minutes (1 hour)</option>
                      <option value={90}>90 minutes (1.5 hours)</option>
                      <option value={120}>120 minutes (2 hours)</option>
                    </select>
                    <span className="form-hint">Time spent in scripture and reflection</span>
                  </div>
                </div>

                {/* Calculation preview */}
                <div
                  style={{
                    backgroundColor: 'var(--color-primary-50)',
                    border: '1px solid var(--color-primary-100)',
                    borderRadius: 'var(--radius-md)',
                    padding: '1rem',
                    marginTop: '1rem',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    flexWrap: 'wrap',
                    gap: '1rem',
                  }}
                >
                  <div>
                    <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-primary-dark)', fontWeight: 600 }}>
                      CALCULATED SCHEDULE PREVIEW:
                    </div>
                    <div style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text)', marginTop: '4px' }}>
                      Bible Study: <strong>{formatTo12Hour(bibleStartTime)}</strong> to{' '}
                      <strong>{formatTo12Hour(calculateEndTime(bibleStartTime, bibleDuration))}</strong>
                    </div>
                    <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)', marginTop: '2px' }}>
                      Completion Window: {formatTo12Hour(calculateEndTime(bibleStartTime, bibleDuration))} –{' '}
                      {formatTo12Hour(calculateEndTime(calculateEndTime(bibleStartTime, bibleDuration), 60))} (60 min window)
                    </div>
                  </div>
                  <button
                    className="btn btn-primary"
                    disabled={actionLoading}
                    onClick={() => handleSaveSchedule('bible_study')}
                  >
                    {actionLoading ? 'Saving...' : 'Save Bible Study Schedule'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* 3. Bible Study History with Reading References */}
          <div className="card">
            <div className="card-header">
              <h3 className="heading-4">Bible Study History (Last 30 Days)</h3>
              <span className="badge badge-neutral">{bibleHistory.length} Recorded Studies</span>
            </div>
            <div className="card-body" style={{ padding: 0 }}>
              {bibleHistory.length === 0 ? (
                <div style={{ padding: '2rem', textAlign: 'center' }} className="text-muted">
                  No Bible studies recorded in the last 30 days. Complete your reading daily to build your record!
                </div>
              ) : (
                <div className="table-wrapper" style={{ border: 'none', borderRadius: 0 }}>
                  <table className="table">
                    <thead>
                      <tr>
                        <th>Date</th>
                        <th>Passage / Reference</th>
                        <th>Scheduled Time</th>
                        <th>Completed At</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {bibleHistory.map((item) => (
                        <tr key={item.id}>
                          <td style={{ fontWeight: 500 }}>{formatDateDisplay(item.accountability_date)}</td>
                          <td>
                            {item.bible_reference_text ? (
                              <span style={{ fontWeight: 600, color: 'var(--color-primary)' }}>
                                📖 {item.bible_reference_text}
                              </span>
                            ) : (
                              <span className="text-muted">--</span>
                            )}
                          </td>
                          <td>{formatTo12Hour(item.scheduled_start)}</td>
                          <td>
                            {item.completed_at
                              ? new Date(item.completed_at).toLocaleTimeString('en-US', {
                                  hour: 'numeric',
                                  minute: '2-digit',
                                })
                              : '--'}
                          </td>
                          <td>{renderStatusBadge(item.status)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* TAB 3: SERMON OF THE WEEK TAB                                  */}
      {/* ============================================================== */}
      {activeTab === 'sermon' && (
        <div>
          {sermonLoading ? (
            <div className="card" style={{ padding: '3rem', textAlign: 'center' }}>
              <div className="skeleton skeleton-rect" style={{ height: '240px', marginBottom: '1.5rem' }} />
              <div className="skeleton skeleton-text" style={{ width: '60%', margin: '0 auto 10px' }} />
              <div className="skeleton skeleton-text sm" style={{ width: '40%', margin: '0 auto' }} />
            </div>
          ) : !sermon ? (
            /* Empty State */
            <div
              className="card"
              style={{
                textAlign: 'center',
                padding: '4rem 2rem',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '1rem',
              }}
            >
              <div
                style={{
                  width: '80px',
                  height: '80px',
                  borderRadius: '50%',
                  backgroundColor: 'var(--color-primary-50)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '36px',
                }}
              >
                🎙️
              </div>
              <h3 className="heading-3">No Sermon of the Week Published</h3>
              <p className="body-md text-muted" style={{ maxWidth: '440px' }}>
                There is no published sermon for this current week yet. Please check back later or listen to our previous messages on Spotify.
              </p>
              <a
                href="https://open.spotify.com"
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-secondary"
                style={{ marginTop: '0.5rem' }}
              >
                Browse Spotify
              </a>
            </div>
          ) : (
            /* Sermon Card */
            <div className="card" style={{ overflow: 'hidden' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))' }}>
                {/* Cover Image or Placeholder */}
                <div
                  style={{
                    backgroundColor: 'var(--color-primary-dark)',
                    minHeight: '260px',
                    position: 'relative',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    overflow: 'hidden',
                  }}
                >
                  <SermonSpotifyCover sermon={sermon} />
                  {sermon.is_current && (
                    <span
                      className="badge badge-accent"
                      style={{
                        position: 'absolute',
                        top: '16px',
                        left: '16px',
                        fontWeight: 700,
                        boxShadow: 'var(--shadow-md)',
                      }}
                    >
                      ★ Current Week
                    </span>
                  )}
                </div>

                {/* Sermon Details */}
                <div style={{ padding: '2rem', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                  <div>
                    <h2 className="heading-2" style={{ color: 'var(--color-primary-dark)', marginBottom: '8px' }}>
                      {sermon.title}
                    </h2>
                    <div style={{ fontSize: 'var(--text-base)', fontWeight: 600, color: 'var(--color-accent-dark)', marginBottom: '1rem' }}>
                      Preacher: {sermon.preacher}
                    </div>
                    {sermon.description && (
                      <p className="body-sm text-muted" style={{ lineHeight: 1.6, marginBottom: '1.5rem' }}>
                        {sermon.description}
                      </p>
                    )}
                  </div>

                  <div>
                    <a
                      href={sermon.spotify_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn btn-primary btn-lg"
                      style={{
                        backgroundColor: '#1db954',
                        borderColor: '#1db954',
                        color: '#ffffff',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '10px',
                        fontWeight: 600,
                      }}
                    >
                      <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.502 17.31c-.216.353-.678.468-1.03.253-2.825-1.727-6.381-2.118-10.57-1.16-.403.092-.806-.16-.898-.564-.092-.404.16-.807.564-.899 4.584-1.047 8.52-.603 11.68 1.332.353.216.468.678.254 1.038zm1.469-3.267c-.272.443-.854.583-1.296.31-3.233-1.987-8.163-2.562-11.989-1.401-.497.151-1.026-.134-1.177-.63-.151-.498.134-1.027.63-1.178 4.372-1.328 9.809-.686 13.522 1.603.443.273.583.855.31 1.296zm.126-3.41c-3.876-2.302-10.27-2.514-13.985-1.386-.593.18-1.226-.157-1.406-.75-.18-.593.157-1.226.75-1.406 4.267-1.295 11.319-1.048 15.787 1.604.533.316.707 1.008.39 1.542-.317.533-1.008.706-1.536.396z" />
                      </svg>
                      Listen on Spotify
                    </a>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ============================================================== */}
      {/* BIBLE STUDY COMPLETION MODAL                                   */}
      {/* ============================================================== */}
      {bibleModalOpen && (
        <div className="modal-overlay" onClick={() => setBibleModalOpen(false)}>
          <div
            className="modal"
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: '580px' }}
          >
            <div className="modal-header">
              <h3 className="modal-title">Record Bible Study</h3>
              <button
                type="button"
                className="modal-close"
                onClick={() => setBibleModalOpen(false)}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCompleteBibleStudy}>
              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                <p className="body-sm text-muted">
                  Enter the scripture passage you read during your study today.
                </p>

                {/* Book Search & Selector */}
                <div className="form-group">
                  <label className="form-label" htmlFor="book-select">
                    Bible Book <span className="required">*</span>
                  </label>
                  <div style={{ display: 'flex', gap: '8px', marginBottom: '6px' }}>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="Search book e.g. John, Rom, Gen..."
                      value={bookSearch}
                      onChange={(e) => setBookSearch(e.target.value)}
                      style={{ flex: 1 }}
                    />
                    {bookSearch && (
                      <button
                        type="button"
                        className="btn btn-ghost btn-sm"
                        onClick={() => setBookSearch('')}
                      >
                        Clear
                      </button>
                    )}
                  </div>

                  <select
                    id="book-select"
                    className="form-select"
                    value={selectedBook}
                    onChange={(e) => {
                      const newBook = e.target.value
                      setSelectedBook(newBook)
                      setStartChapter(1)
                      setStartVerse(1)
                      setEndChapter(1)
                      const maxV = BIBLE_BOOKS[newBook]?.verses[0] || 1
                      setEndVerse(Math.min(16, maxV))
                    }}
                  >
                    {filteredBooks.map((book) => (
                      <option key={book} value={book}>
                        {book} ({BIBLE_BOOKS[book]?.chapters} chapters)
                      </option>
                    ))}
                  </select>
                </div>

                {/* Chapter & Verse Inputs Grid */}
                <div className="chapter-verse-grid">
                  {/* Start Chapter */}
                  <div className="form-group">
                    <label className="form-label" htmlFor="start-chapter">
                      Start Chapter
                    </label>
                    <input
                      id="start-chapter"
                      type="number"
                      min={1}
                      max={BIBLE_BOOKS[selectedBook]?.chapters || 1}
                      className="form-input"
                      value={startChapter}
                      onChange={(e) => setStartChapter(Math.max(1, parseInt(e.target.value, 10) || 1))}
                    />
                    <span className="form-hint">Max {BIBLE_BOOKS[selectedBook]?.chapters || 1}</span>
                  </div>

                  {/* Start Verse */}
                  <div className="form-group">
                    <label className="form-label" htmlFor="start-verse">
                      Start Verse
                    </label>
                    <input
                      id="start-verse"
                      type="number"
                      min={1}
                      className="form-input"
                      value={startVerse}
                      onChange={(e) => setStartVerse(Math.max(1, parseInt(e.target.value, 10) || 1))}
                    />
                    <span className="form-hint">
                      Max {BIBLE_BOOKS[selectedBook]?.verses[startChapter - 1] || 1} verses
                    </span>
                  </div>

                  {/* End Chapter */}
                  <div className="form-group">
                    <label className="form-label" htmlFor="end-chapter">
                      End Chapter
                    </label>
                    <input
                      id="end-chapter"
                      type="number"
                      min={startChapter}
                      max={BIBLE_BOOKS[selectedBook]?.chapters || 1}
                      className="form-input"
                      value={endChapter}
                      onChange={(e) => setEndChapter(Math.max(1, parseInt(e.target.value, 10) || 1))}
                    />
                  </div>

                  {/* End Verse */}
                  <div className="form-group">
                    <label className="form-label" htmlFor="end-verse">
                      End Verse
                    </label>
                    <input
                      id="end-verse"
                      type="number"
                      min={1}
                      className="form-input"
                      value={endVerse}
                      onChange={(e) => setEndVerse(Math.max(1, parseInt(e.target.value, 10) || 1))}
                    />
                    <span className="form-hint">
                      Max {BIBLE_BOOKS[selectedBook]?.verses[endChapter - 1] || 1} verses
                    </span>
                  </div>
                </div>

                {/* Formatted Reference Preview Banner */}
                <div
                  style={{
                    padding: '12px 16px',
                    borderRadius: 'var(--radius-md)',
                    backgroundColor: referenceValidation.valid ? 'var(--color-primary-50)' : 'var(--color-error-bg)',
                    border: `1px solid ${referenceValidation.valid ? 'var(--color-primary-100)' : '#fecaca'}`,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '4px',
                  }}
                >
                  <div style={{ fontSize: 'var(--text-xs)', fontWeight: 600, color: 'var(--color-text-muted)' }}>
                    FORMATTED REFERENCE PREVIEW:
                  </div>
                  {referenceValidation.valid ? (
                    <div style={{ fontSize: 'var(--text-lg)', fontWeight: 700, color: 'var(--color-primary)' }}>
                      📖 {referenceValidation.formatted}
                    </div>
                  ) : (
                    <div style={{ fontSize: 'var(--text-sm)', color: 'var(--color-error)', fontWeight: 500 }}>
                      ⚠️ {referenceValidation.error}
                    </div>
                  )}
                </div>
              </div>

              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setBibleModalOpen(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={!referenceValidation.valid || actionLoading}
                >
                  {actionLoading ? 'Recording...' : 'Submit Bible Study'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      <style jsx>{`
        /* Accountability Hero Banner */
        .streak-hero-banner {
          margin-bottom: 2rem;
          background: linear-gradient(135deg, #1a4ba8 0%, #0f3180 100%);
          color: #ffffff;
          border-radius: var(--radius-xl);
          padding: 1.5rem 1.75rem;
          box-shadow: 0 10px 25px -5px rgba(26, 75, 168, 0.35);
          border: none;
        }

        .streak-banner-flex {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 1.25rem;
          flex-wrap: wrap;
        }

        .streak-stats-row {
          display: flex;
          align-items: center;
          gap: 1.75rem;
          flex-wrap: wrap;
        }

        .streak-stat-item {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .streak-stat-icon {
          width: 50px;
          height: 50px;
          border-radius: 50%;
          background-color: rgba(255, 255, 255, 0.16);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 26px;
          flex-shrink: 0;
        }

        .streak-stat-label {
          font-size: 11px;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          opacity: 0.85;
        }

        .streak-stat-value {
          font-size: 28px;
          font-weight: 800;
          line-height: 1.1;
        }

        .streak-stat-value span {
          font-size: 13px;
          font-weight: 500;
          opacity: 0.9;
        }

        .streak-divider {
          height: 38px;
          width: 1px;
          background-color: rgba(255, 255, 255, 0.2);
        }

        .streak-today-pill {
          display: flex;
          align-items: center;
          gap: 12px;
          background-color: rgba(255, 255, 255, 0.12);
          padding: 8px 16px;
          border-radius: 9999px;
          backdrop-filter: blur(8px);
          font-size: 13.5px;
          flex-wrap: wrap;
        }

        .today-label {
          font-weight: 600;
        }

        .today-item {
          display: flex;
          align-items: center;
          gap: 6px;
        }

        .status-tag {
          font-weight: 700;
        }

        .status-tag.done {
          color: #86efac;
        }

        .status-tag.pending {
          color: #fef08a;
        }

        .today-sep {
          opacity: 0.35;
        }

        /* Schedule Details Grid */
        .schedule-details-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 14px;
          background-color: var(--color-surface);
          padding: 1.25rem;
          border-radius: var(--radius-md);
          border: 1px solid var(--color-border);
        }

        .schedule-detail-box {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .schedule-detail-box.highlight {
          border-left: 2px solid var(--color-primary);
          padding-left: 10px;
        }

        .detail-label {
          font-size: 11px;
          color: var(--color-text-muted);
          text-transform: uppercase;
          letter-spacing: 0.05em;
          font-weight: 600;
        }

        .detail-value {
          font-weight: 700;
          font-size: 15px;
          color: var(--color-text);
        }

        .detail-value.primary {
          color: var(--color-primary);
        }

        /* Mobile Responsiveness */
        @media (max-width: 768px) {
          .schedule-details-grid {
            grid-template-columns: repeat(2, 1fr);
            gap: 12px;
            padding: 1rem;
          }

          .streak-banner-flex {
            flex-direction: column;
            align-items: center;
            text-align: center;
            gap: 1rem;
          }

          .streak-stats-row {
            width: 100%;
            justify-content: center;
          }

          .streak-today-pill {
            width: 100%;
            justify-content: center;
            border-radius: 12px;
          }
        }

        @media (max-width: 480px) {
          .streak-stats-row {
            flex-direction: column;
            align-items: center;
            gap: 12px;
          }

          .streak-divider {
            display: none;
          }

          .schedule-details-grid {
            grid-template-columns: 1fr;
          }

          .schedule-detail-box.highlight {
            border-left: none;
            border-top: 1px solid var(--color-border);
            padding-left: 0;
            padding-top: 8px;
          }

          .chapter-verse-grid {
            grid-template-columns: 1fr;
            gap: 0.75rem;
          }
        }

        .chapter-verse-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 1rem;
        }
      `}</style>
    </div>
  )
}
