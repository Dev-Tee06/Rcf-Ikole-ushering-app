'use client'

import React, { useState, useMemo } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import {
  FiGrid,
  FiCalendar,
  FiCheckSquare,
  FiUsers,
  FiLogOut,
  FiExternalLink,
  FiCheck,
  FiX,
  FiSearch,
  FiPlus,
  FiTrash2,
  FiAlertCircle,
  FiMenu,
  FiClock,
  FiBook,
} from 'react-icons/fi'
import {
  RiShirtLine,
  RiSpotifyLine,
  RiBookOpenLine,
  RiSparklingFill,
} from 'react-icons/ri'
import { HiOutlineFire } from 'react-icons/hi2'
import { DeleteConfirmModal } from '@/components/ui/DeleteConfirmModal'

interface AdminDashboardClientProps {
  profile: any
  activeUshersCount: number
  totalMembersCount: number
  upcomingServices: any[]
  recentAnnouncements: any[]
  latestDressCode: any
  allMembers: any[]
  dutyPosts: any[]
  serviceOccurrences: any[]
  initialDutyAssignments: any[]
  initialAttendanceRecords: any[]
  accountabilitySchedules: any[]
  accountabilityCompletions: any[]
  initialSermonsList: any[]
}

const ACTIVE_POSITION_NAMES = [
  'Upper Left',
  'Lower left',
  'Upper middle',
  'Lower middle',
  'Upper Right',
  'Lower Right',
  'Door',
  'Records',
]

export function AdminDashboardClient({
  profile,
  activeUshersCount,
  totalMembersCount,
  upcomingServices: initialUpcoming,
  recentAnnouncements,
  latestDressCode: initialDressCode,
  allMembers = [],
  dutyPosts = [],
  serviceOccurrences: initialOccurrences = [],
  initialDutyAssignments = [],
  initialAttendanceRecords = [],
  accountabilitySchedules = [],
  accountabilityCompletions = [],
  initialSermonsList = [],
}: AdminDashboardClientProps) {
  const router = useRouter()

  // Navigation tab
  const [activeTab, setActiveTab] = useState<
    'overview' | 'services' | 'attendance' | 'accountability' | 'attire' | 'members' | 'sermons'
  >('overview')

  // Mobile drawer state
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  // Global toast / action feedback
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null)
  const showToast = (type: 'success' | 'error', message: string) => {
    setFeedback({ type, message })
    setTimeout(() => setFeedback(null), 4000)
  }

  const handleSignOut = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/admin/login')
    router.refresh()
  }

  // ==========================================
  // SECTION: SERVICE OCCURRENCES & DUTY POSTS
  // ==========================================
  const [serviceOccurrences, setServiceOccurrences] = useState<any[]>(initialOccurrences)
  const [selectedOccurrenceId, setSelectedOccurrenceId] = useState<string>(
    initialUpcoming[0]?.id || initialOccurrences[0]?.id || ''
  )
  const [dutyAssignments, setDutyAssignments] = useState<any[]>(initialDutyAssignments)
  const [assigningPostId, setAssigningPostId] = useState<string | null>(null)
  const [publishingRoster, setPublishingRoster] = useState(false)
  const [deletingService, setDeletingService] = useState(false)

  const currentOccurrence = useMemo(
    () => serviceOccurrences.find((o) => o.id === selectedOccurrenceId) || null,
    [serviceOccurrences, selectedOccurrenceId]
  )

  const assignmentsForSelectedOccurrence = useMemo(
    () => dutyAssignments.filter((a) => a.service_occurrence_id === selectedOccurrenceId),
    [dutyAssignments, selectedOccurrenceId]
  )

  // Strictly order duty posts matching the 8 active positions
  const sortedDutyPosts = useMemo(() => {
    return [...dutyPosts].sort((a, b) => {
      const idxA = ACTIVE_POSITION_NAMES.findIndex(
        (n) => n.toLowerCase() === a.name?.toLowerCase().trim()
      )
      const idxB = ACTIVE_POSITION_NAMES.findIndex(
        (n) => n.toLowerCase() === b.name?.toLowerCase().trim()
      )
      return (idxA === -1 ? 99 : idxA) - (idxB === -1 ? 99 : idxB)
    })
  }, [dutyPosts])

  // Handlers for Duty Assignment
  const handleAssignPost = async (dutyPostId: string, memberId: string) => {
    if (!selectedOccurrenceId) return

    try {
      setAssigningPostId(dutyPostId)
      if (!memberId) {
        // Unassign
        const res = await fetch(
          `/api/admin/duty-assignments?service_occurrence_id=${selectedOccurrenceId}&duty_post_id=${dutyPostId}`,
          { method: 'DELETE' }
        )
        if (!res.ok) throw new Error('Failed to unassign post')
        setDutyAssignments((prev) =>
          prev.filter(
            (a) =>
              !(a.service_occurrence_id === selectedOccurrenceId && a.duty_post_id === dutyPostId)
          )
        )
        showToast('success', 'Usher unassigned successfully')
      } else {
        // Assign / Reassign
        const res = await fetch('/api/admin/duty-assignments', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            service_occurrence_id: selectedOccurrenceId,
            duty_post_id: dutyPostId,
            member_id: memberId,
          }),
        })
        const data = await res.json()
        if (!res.ok) throw new Error(data.error || 'Failed to assign usher')

        setDutyAssignments((prev) => {
          const filtered = prev.filter(
            (a) =>
              !(
                a.service_occurrence_id === selectedOccurrenceId &&
                (a.duty_post_id === dutyPostId || a.member_id === memberId)
              )
          )
          return [...filtered, data.assignment]
        })
        const memberName = allMembers.find((m) => m.id === memberId)?.full_name || 'Member'
        if (data.reassignedFromPostId) {
          const fromPost = sortedDutyPosts.find((p) => p.id === data.reassignedFromPostId)?.name || 'previous post'
          showToast('success', `Moved ${memberName} from ${fromPost} to this position`)
        } else {
          showToast('success', `Assigned ${memberName} to duty post`)
        }
      }
    } catch (err: any) {
      showToast('error', err.message || 'Error updating assignment')
    } finally {
      setAssigningPostId(null)
    }
  }

  const handleTogglePublishRoster = async () => {
    if (!currentOccurrence) return

    try {
      setPublishingRoster(true)
      const targetState = !currentOccurrence.roster_published
      const res = await fetch('/api/admin/duty-assignments', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          service_occurrence_id: currentOccurrence.id,
          roster_published: targetState,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to update roster publication')

      setServiceOccurrences((prev) =>
        prev.map((o) => (o.id === currentOccurrence.id ? { ...o, roster_published: targetState } : o))
      )
      showToast(
        'success',
        targetState
          ? 'Roster published to all unit members!'
          : 'Roster reverted to draft mode'
      )
    } catch (err: any) {
      showToast('error', err.message || 'Error publishing roster')
    } finally {
      setPublishingRoster(false)
    }
  }

  // Delete Confirmation Modal State
  const [deleteModal, setDeleteModal] = useState<{
    isOpen: boolean
    title: string
    message: string
    itemName?: string
    confirmText?: string
    isLoading: boolean
    onConfirm: () => Promise<void>
  }>({
    isOpen: false,
    title: '',
    message: '',
    itemName: '',
    confirmText: 'Yes, Delete',
    isLoading: false,
    onConfirm: async () => {},
  })

  const openDeleteModal = ({
    title,
    message,
    itemName,
    confirmText,
    onConfirm,
  }: {
    title: string
    message: string
    itemName?: string
    confirmText?: string
    onConfirm: () => Promise<void>
  }) => {
    setDeleteModal({
      isOpen: true,
      title,
      message,
      itemName,
      confirmText: confirmText || 'Yes, Delete',
      isLoading: false,
      onConfirm,
    })
  }

  const closeDeleteModal = () => {
    if (deleteModal.isLoading) return
    setDeleteModal((prev) => ({ ...prev, isOpen: false }))
  }

  // Delete Service Occurrence and its records
  const handleDeleteService = (serviceOccurrenceId: string) => {
    const target = serviceOccurrences.find((o) => o.id === serviceOccurrenceId)
    const label = target
      ? `${target.service_type?.toUpperCase()} service (${target.occurrence_date})`
      : 'this service'

    openDeleteModal({
      title: 'Delete Service & Records',
      message:
        'Are you sure you want to delete this service? This will permanently delete the service, all duty assignments, and all attendance records created for it.',
      itemName: label,
      confirmText: 'Yes, Delete Service',
      onConfirm: async () => {
        try {
          setDeleteModal((prev) => ({ ...prev, isLoading: true }))
          const res = await fetch(`/api/admin/services?id=${serviceOccurrenceId}`, {
            method: 'DELETE',
          })
          const data = await res.json()
          if (!res.ok) throw new Error(data.error || 'Failed to delete service')

          setServiceOccurrences((prev) => prev.filter((o) => o.id !== serviceOccurrenceId))
          setDutyAssignments((prev) => prev.filter((a) => a.service_occurrence_id !== serviceOccurrenceId))
          setAttendanceRecords((prev) => prev.filter((r) => r.service_occurrence_id !== serviceOccurrenceId))

          const remaining = serviceOccurrences.filter((o) => o.id !== serviceOccurrenceId)
          const nextId = remaining[0]?.id || ''
          setSelectedOccurrenceId(nextId)
          setSelectedAttOccurrenceId(nextId)

          showToast('success', `${label} and its records deleted successfully.`)
          setDeleteModal((prev) => ({ ...prev, isOpen: false, isLoading: false }))
        } catch (err: any) {
          showToast('error', err.message || 'Error deleting service')
          setDeleteModal((prev) => ({ ...prev, isLoading: false }))
        }
      },
    })
  }

  // ==========================================
  // SECTION: CREATE SERVICE OCCURRENCE
  // ==========================================
  const getNextServiceDate = () => {
    const now = new Date()
    const day = now.getDay()
    const daysUntilSunday = (7 - day) % 7 || 7
    const nextSunday = new Date(now)
    nextSunday.setDate(now.getDate() + daysUntilSunday)
    return nextSunday.toISOString().split('T')[0]
  }

  const [showCreateService, setShowCreateService] = useState(false)
  const [newSvcDate, setNewSvcDate] = useState(getNextServiceDate())
  const [newSvcType, setNewSvcType] = useState('sunday')
  const [newSvcStartTime, setNewSvcStartTime] = useState('07:00:00')
  const [newSvcEndTime, setNewSvcEndTime] = useState('12:00:00')
  const [newSvcNotes, setNewSvcNotes] = useState('')
  const [creatingService, setCreatingService] = useState(false)

  const handleCreateService = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      setCreatingService(true)
      const res = await fetch('/api/admin/services', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          occurrence_date: newSvcDate,
          service_type: newSvcType,
          start_time: newSvcStartTime,
          end_time: newSvcEndTime,
          notes: newSvcNotes,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to create service occurrence')

      setServiceOccurrences((prev) => [data.occurrence, ...prev])
      setSelectedOccurrenceId(data.occurrence.id)
      setSelectedAttOccurrenceId(data.occurrence.id)
      setShowCreateService(false)
      setNewSvcNotes('')
      showToast('success', `Created service for ${data.occurrence.occurrence_date} successfully!`)
    } catch (err: any) {
      showToast('error', err.message || 'Error creating service')
    } finally {
      setCreatingService(false)
    }
  }

  // ==========================================
  // SECTION: SUNDAY ATTIRE & CLOTHES
  // ==========================================
  const [latestDressCode, setLatestDressCode] = useState<any>(initialDressCode)
  const [attireSundayDate, setAttireSundayDate] = useState(
    initialDressCode?.applicable_sunday || getNextServiceDate()
  )
  const [attireInstructions, setAttireInstructions] = useState(
    initialDressCode?.instructions || ''
  )
  const [attireImageUrl, setAttireImageUrl] = useState(
    initialDressCode?.image_url || ''
  )
  const [savingAttire, setSavingAttire] = useState(false)

  const handleSaveAttire = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!attireSundayDate || !attireInstructions.trim()) {
      showToast('error', 'Please specify the applicable Sunday and clothes instructions.')
      return
    }

    try {
      setSavingAttire(true)
      const res = await fetch('/api/admin/dress-codes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          applicable_sunday: attireSundayDate,
          instructions: attireInstructions,
          image_url: attireImageUrl,
          status: 'published',
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to update Sunday attire')

      setLatestDressCode(data.dressCode)
      showToast('success', `Sunday attire for ${data.dressCode.applicable_sunday} published!`)
    } catch (err: any) {
      showToast('error', err.message || 'Error saving Sunday attire')
    } finally {
      setSavingAttire(false)
    }
  }

  const [deletingAttire, setDeletingAttire] = useState(false)
  const handleDeleteAttire = (dressCodeId?: string) => {
    if (!latestDressCode) return
    const targetId = dressCodeId || latestDressCode.id

    openDeleteModal({
      title: 'Delete Sunday Attire',
      message: 'Are you sure you want to remove the Sunday attire instructions? Stewards will no longer see guidelines for this week.',
      itemName: `Sunday Attire: ${latestDressCode.applicable_sunday}`,
      confirmText: 'Yes, Delete Attire',
      onConfirm: async () => {
        try {
          setDeleteModal((prev) => ({ ...prev, isLoading: true }))
          const res = await fetch(`/api/admin/dress-codes?id=${targetId}`, {
            method: 'DELETE',
          })
          const data = await res.json()
          if (!res.ok) throw new Error(data.error || 'Failed to delete Sunday attire')

          setLatestDressCode(null)
          setAttireInstructions('')
          setAttireImageUrl('')
          showToast('success', 'Sunday attire instructions deleted successfully.')
          setDeleteModal((prev) => ({ ...prev, isOpen: false, isLoading: false }))
        } catch (err: any) {
          showToast('error', err.message || 'Error deleting attire')
          setDeleteModal((prev) => ({ ...prev, isLoading: false }))
        }
      },
    })
  }

  // ==========================================
  // SECTION: SERVICE ATTENDANCE LIST
  // ==========================================
  const [selectedAttOccurrenceId, setSelectedAttOccurrenceId] = useState<string>(
    initialUpcoming[0]?.id || initialOccurrences[0]?.id || ''
  )
  const [attendanceRecords, setAttendanceRecords] = useState<any[]>(initialAttendanceRecords)
  const [attSearch, setAttSearch] = useState('')
  const [attStatusFilter, setAttStatusFilter] = useState<string>('all')
  const [updatingAttMemberId, setUpdatingAttMemberId] = useState<string | null>(null)

  const currentAttOccurrence = useMemo(
    () => serviceOccurrences.find((o) => o.id === selectedAttOccurrenceId) || null,
    [serviceOccurrences, selectedAttOccurrenceId]
  )

  const attRecordsForCurrentService = useMemo(() => {
    return attendanceRecords.filter((r) => r.service_occurrence_id === selectedAttOccurrenceId)
  }, [attendanceRecords, selectedAttOccurrenceId])

  const attendanceStats = useMemo(() => {
    const presentCount = attRecordsForCurrentService.filter((r) => r.status === 'present').length
    const absentCount = attRecordsForCurrentService.filter((r) => r.status === 'absent').length
    const excusedCount = attRecordsForCurrentService.filter((r) => r.status === 'excused').length
    const totalTracked = allMembers.length
    const rate = totalTracked > 0 ? Math.round((presentCount / totalTracked) * 100) : 0
    return { presentCount, absentCount, excusedCount, totalTracked, rate }
  }, [attRecordsForCurrentService, allMembers])

  const handleUpdateAttendance = async (memberId: string, status: string) => {
    if (!selectedAttOccurrenceId) return

    try {
      setUpdatingAttMemberId(memberId)
      const res = await fetch('/api/admin/attendance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          member_id: memberId,
          service_occurrence_id: selectedAttOccurrenceId,
          status,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to update attendance')

      setAttendanceRecords((prev) => {
        const filtered = prev.filter(
          (r) =>
            !(r.member_id === memberId && r.service_occurrence_id === selectedAttOccurrenceId)
        )
        return [...filtered, data.record]
      })
      showToast('success', `Attendance updated to ${status}`)
    } catch (err: any) {
      showToast('error', err.message || 'Error updating attendance')
    } finally {
      setUpdatingAttMemberId(null)
    }
  }

  const handleDeleteAttendanceRecord = (memberId: string) => {
    if (!selectedAttOccurrenceId) return
    const member = allMembers.find((m: any) => m.id === memberId)
    const name = member?.full_name || 'this steward'

    openDeleteModal({
      title: 'Clear Attendance Record',
      message: 'Are you sure you want to clear the attendance record for this steward?',
      itemName: name,
      confirmText: 'Yes, Clear Record',
      onConfirm: async () => {
        try {
          setDeleteModal((prev) => ({ ...prev, isLoading: true }))
          const res = await fetch(
            `/api/admin/attendance?member_id=${memberId}&service_occurrence_id=${selectedAttOccurrenceId}`,
            { method: 'DELETE' }
          )
          const data = await res.json()
          if (!res.ok) throw new Error(data.error || 'Failed to clear attendance record')

          setAttendanceRecords((prev) =>
            prev.filter(
              (r) => !(r.member_id === memberId && r.service_occurrence_id === selectedAttOccurrenceId)
            )
          )
          showToast('success', 'Attendance record cleared')
          setDeleteModal((prev) => ({ ...prev, isOpen: false, isLoading: false }))
        } catch (err: any) {
          showToast('error', err.message || 'Error clearing attendance record')
          setDeleteModal((prev) => ({ ...prev, isLoading: false }))
        }
      },
    })
  }

  // ==========================================
  // SECTION: ALL STEWARDS ACCOUNTABILITY LIST
  // ==========================================
  const [accSearch, setAccSearch] = useState('')
  const todayStr = useMemo(() => new Date().toISOString().split('T')[0], [])

  // State for Accountability Details Modal
  const [selectedStewardAcc, setSelectedStewardAcc] = useState<any | null>(null)
  const [stewardHistoryLogs, setStewardHistoryLogs] = useState<any[]>([])
  const [loadingStewardHistory, setLoadingStewardHistory] = useState(false)
  const [historyFilter, setHistoryFilter] = useState<'all' | 'bible_study' | 'prayer'>('all')

  const stewardsAccountabilityList = useMemo(() => {
    return allMembers.map((member) => {
      const memberCompletions = accountabilityCompletions.filter(
        (c) => c.member_id === member.id
      )
      const todayCompletions = memberCompletions.filter(
        (c) => c.accountability_date === todayStr
      )

      const prayerToday = todayCompletions.find((c) => c.task_type === 'prayer')
      const bibleToday = todayCompletions.find((c) => c.task_type === 'bible_study')

      const schedules = accountabilitySchedules.filter((s) => s.member_id === member.id)
      const prayerSched = schedules.find((s) => s.task_type === 'prayer')
      const bibleSched = schedules.find((s) => s.task_type === 'bible_study')

      const completedDays = new Set(
        memberCompletions
          .filter((c) => c.status === 'completed')
          .map((c) => c.accountability_date)
      )

      const totalCompleted = memberCompletions.filter((c) => c.status === 'completed').length

      return {
        member,
        prayerToday,
        bibleToday,
        prayerSched,
        bibleSched,
        streakDays: completedDays.size,
        totalCompleted,
        allCompletions: memberCompletions,
      }
    })
  }, [allMembers, accountabilityCompletions, accountabilitySchedules, todayStr])

  const filteredAccountabilityList = useMemo(() => {
    return stewardsAccountabilityList.filter(({ member }) => {
      return (
        member.full_name?.toLowerCase().includes(accSearch.toLowerCase()) ||
        member.email?.toLowerCase().includes(accSearch.toLowerCase())
      )
    })
  }, [stewardsAccountabilityList, accSearch])

  const openStewardAccountability = async (stewardItem: any) => {
    setSelectedStewardAcc(stewardItem)
    setHistoryFilter('all')

    // Initial records from server prop
    const local = accountabilityCompletions.filter(
      (c) => c.member_id === stewardItem.member.id
    )
    setStewardHistoryLogs(local)

    // Fetch full 90-day history from API
    try {
      setLoadingStewardHistory(true)
      const res = await fetch(`/api/accountability/history?member_id=${stewardItem.member.id}&days=90`)
      if (res.ok) {
        const fullLogs = await res.json()
        if (Array.isArray(fullLogs)) {
          setStewardHistoryLogs(fullLogs)
        }
      }
    } catch (err) {
      console.error('Failed to load full history:', err)
    } finally {
      setLoadingStewardHistory(false)
    }
  }

  // ==========================================
  // SECTION: MEMBERS DIRECTORY
  // ==========================================
  const [memberSearch, setMemberSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState<'all' | 'member' | 'team_leader' | 'admin'>('all')

  const filteredMembers = useMemo(() => {
    return allMembers.filter((m) => {
      const matchesSearch =
        m.full_name?.toLowerCase().includes(memberSearch.toLowerCase()) ||
        m.email?.toLowerCase().includes(memberSearch.toLowerCase()) ||
        m.phone?.includes(memberSearch)
      const matchesRole = roleFilter === 'all' || m.role === roleFilter
      return matchesSearch && matchesRole
    })
  }, [allMembers, memberSearch, roleFilter])

  // ==========================================
  // SECTION: SPOTIFY SERMONS HUB (NO WEEK LABEL)
  // ==========================================
  const [sermonsList, setSermonsList] = useState<any[]>(initialSermonsList)
  const [sermonTitle, setSermonTitle] = useState('')
  const [sermonPreacher, setSermonPreacher] = useState('')
  const [sermonSpotifyUrl, setSermonSpotifyUrl] = useState('')
  const [sermonDesc, setSermonDesc] = useState('')
  const [sermonCoverUrl, setSermonCoverUrl] = useState('')
  const [sermonIsCurrent, setSermonIsCurrent] = useState(true)
  const [publishingSermon, setPublishingSermon] = useState(false)

  const currentSermon = useMemo(
    () => sermonsList.find((s) => s.is_current) || sermonsList[0] || null,
    [sermonsList]
  )

  const handleSpotifyUrlChange = async (url: string) => {
    setSermonSpotifyUrl(url)
    if (url.includes('open.spotify.com')) {
      try {
        const res = await fetch(`https://open.spotify.com/oembed?url=${encodeURIComponent(url.trim())}`)
        if (res.ok) {
          const data = await res.json()
          if (data.thumbnail_url && !sermonCoverUrl) {
            setSermonCoverUrl(data.thumbnail_url)
          }
          if (data.title && !sermonTitle) {
            setSermonTitle(data.title)
          }
        }
      } catch (e) {
        console.error('Error fetching Spotify oEmbed:', e)
      }
    }
  }

  const handlePublishSermon = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!sermonTitle.trim() || !sermonPreacher.trim() || !sermonSpotifyUrl.trim()) {
      showToast('error', 'Title, preacher, and Spotify URL are required.')
      return
    }

    try {
      setPublishingSermon(true)
      const res = await fetch('/api/admin/sermons', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: sermonTitle,
          preacher: sermonPreacher,
          spotify_url: sermonSpotifyUrl,
          description: sermonDesc,
          cover_image_url: sermonCoverUrl,
          is_current: sermonIsCurrent,
        }),
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to publish sermon')

      setSermonsList((prev) => {
        const updated = prev.map((s) => (sermonIsCurrent ? { ...s, is_current: false } : s))
        return [data.sermon, ...updated]
      })

      setSermonTitle('')
      setSermonPreacher('')
      setSermonSpotifyUrl('')
      setSermonDesc('')
      setSermonCoverUrl('')
      showToast('success', 'Spotify Sermon broadcasted successfully!')
    } catch (err: any) {
      showToast('error', err.message || 'Error publishing sermon')
    } finally {
      setPublishingSermon(false)
    }
  }

  const handleSetCurrentSermon = async (sermonId: string) => {
    try {
      const res = await fetch('/api/admin/sermons', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: sermonId, is_current: true }),
      })
      if (!res.ok) throw new Error('Failed to set current sermon')

      setSermonsList((prev) =>
        prev.map((s) => ({ ...s, is_current: s.id === sermonId }))
      )
      showToast('success', 'Sermon set as current recommendation!')
    } catch (err: any) {
      showToast('error', err.message || 'Error setting current sermon')
    }
  }

  const handleDeleteSermon = (sermonId: string) => {
    const sermon = sermonsList.find((s) => s.id === sermonId)
    const title = sermon?.title || 'this sermon'

    openDeleteModal({
      title: 'Delete Sermon',
      message: 'Are you sure you want to delete this sermon? It will be removed from member recommendation feeds.',
      itemName: title,
      confirmText: 'Yes, Delete Sermon',
      onConfirm: async () => {
        try {
          setDeleteModal((prev) => ({ ...prev, isLoading: true }))
          const res = await fetch(`/api/admin/sermons?id=${sermonId}`, { method: 'DELETE' })
          if (!res.ok) throw new Error('Failed to delete sermon')

          setSermonsList((prev) => prev.filter((s) => s.id !== sermonId))
          showToast('success', 'Sermon removed successfully')
          setDeleteModal((prev) => ({ ...prev, isOpen: false, isLoading: false }))
        } catch (err: any) {
          showToast('error', err.message || 'Error deleting sermon')
          setDeleteModal((prev) => ({ ...prev, isLoading: false }))
        }
      },
    })
  }

  const getInitials = (name: string) => {
    if (!name) return 'A'
    const parts = name.trim().split(/\s+/)
    if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase()
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
  }

  const switchTab = (tab: typeof activeTab) => {
    setActiveTab(tab)
    setMobileMenuOpen(false)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  return (
    <div className="admin-shell-layout">
      {/* Toast Alert */}
      {feedback && (
        <div className={`admin-toast ${feedback.type}`}>
          <span className="toast-icon">
            {feedback.type === 'success' ? <FiCheck /> : <FiAlertCircle />}
          </span>
          <span>{feedback.message}</span>
        </div>
      )}

      {/* ==================================================== */}
      {/* DESKTOP SIDEBAR                                      */}
      {/* ==================================================== */}
      <aside className="admin-sidebar">
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
          <div className="portal-pill">EXECUTIVE PORTAL</div>
        </div>

        <nav className="sidebar-nav">
          <div className="nav-group-title">ADMINISTRATION</div>
          <ul className="nav-list">
            <li>
              <button
                onClick={() => switchTab('overview')}
                className={`nav-link ${activeTab === 'overview' ? 'active' : ''}`}
              >
                <span className="nav-icon"><FiGrid size={18} /></span>
                <span className="nav-label">Overview</span>
                {activeTab === 'overview' && <span className="active-indicator" />}
              </button>
            </li>
            <li>
              <button
                onClick={() => switchTab('services')}
                className={`nav-link ${activeTab === 'services' ? 'active' : ''}`}
              >
                <span className="nav-icon"><FiCalendar size={18} /></span>
                <span className="nav-label">Services &amp; Rosters</span>
                {activeTab === 'services' && <span className="active-indicator" />}
              </button>
            </li>
            <li>
              <button
                onClick={() => switchTab('attendance')}
                className={`nav-link ${activeTab === 'attendance' ? 'active' : ''}`}
              >
                <span className="nav-icon"><FiCheckSquare size={18} /></span>
                <span className="nav-label">Attendance Lists</span>
                {activeTab === 'attendance' && <span className="active-indicator" />}
              </button>
            </li>
            <li>
              <button
                onClick={() => switchTab('accountability')}
                className={`nav-link ${activeTab === 'accountability' ? 'active' : ''}`}
              >
                <span className="nav-icon"><RiBookOpenLine size={18} /></span>
                <span className="nav-label">Accountability</span>
                {activeTab === 'accountability' && <span className="active-indicator" />}
              </button>
            </li>
            <li>
              <button
                onClick={() => switchTab('attire')}
                className={`nav-link ${activeTab === 'attire' ? 'active' : ''}`}
              >
                <span className="nav-icon"><RiShirtLine size={18} /></span>
                <span className="nav-label">Sunday Attire</span>
                {activeTab === 'attire' && <span className="active-indicator" />}
              </button>
            </li>
            <li>
              <button
                onClick={() => switchTab('members')}
                className={`nav-link ${activeTab === 'members' ? 'active' : ''}`}
              >
                <span className="nav-icon"><FiUsers size={18} /></span>
                <span className="nav-label">Unit Stewards</span>
                {activeTab === 'members' && <span className="active-indicator" />}
              </button>
            </li>
            <li>
              <button
                onClick={() => switchTab('sermons')}
                className={`nav-link ${activeTab === 'sermons' ? 'active' : ''}`}
              >
                <span className="nav-icon"><RiSpotifyLine size={18} /></span>
                <span className="nav-label">Spotify Sermons</span>
                {activeTab === 'sermons' && <span className="active-indicator" />}
              </button>
            </li>
          </ul>

          <div className="nav-group-title mt-4">SWITCH PORTAL</div>
          <ul className="nav-list">
            <li>
              <Link href="/home" className="nav-link">
                <span className="nav-icon"><FiExternalLink size={18} /></span>
                <span className="nav-label">Member Portal</span>
              </Link>
            </li>
          </ul>
        </nav>

        <div className="sidebar-footer">
          <div className="user-profile-card">
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
              <span className="status-dot-active" title="Administrator Active" />
            </div>
            <div className="user-meta">
              <span className="user-name" title={profile.full_name}>
                {profile.full_name}
              </span>
              <span className="user-role-badge">
                {profile.role === 'team_leader' ? 'Team Leader' : 'Admin'}
              </span>
            </div>
          </div>

          <button
            onClick={handleSignOut}
            className="logout-button"
            title="Sign out of Administration"
          >
            <FiLogOut size={16} />
            <span>Sign out</span>
          </button>
        </div>
      </aside>

      {/* ==================================================== */}
      {/* MOBILE DRAWER MODAL                                  */}
      {/* ==================================================== */}
      {mobileMenuOpen && (
        <div className="mobile-drawer-overlay" onClick={() => setMobileMenuOpen(false)}>
          <div className="mobile-drawer-sheet" onClick={(e) => e.stopPropagation()}>
            <div className="drawer-header">
              <div className="brand-logo-container">
                <div className="brand-logo-frame">
                  <Image
                    src="/logo.jpg"
                    alt="RCF Ikole Ushering Unit"
                    width={54}
                    height={54}
                    className="brand-logo-img"
                  />
                </div>
                <div className="brand-text">
                  <span className="brand-title">RCF IKOLE</span>
                  <span className="brand-subtitle">Ushering Admin</span>
                </div>
              </div>
              <button onClick={() => setMobileMenuOpen(false)} className="drawer-close-btn">
                <FiX size={20} />
              </button>
            </div>

            <div className="drawer-menu-list">
              <button
                onClick={() => switchTab('overview')}
                className={`drawer-item ${activeTab === 'overview' ? 'active' : ''}`}
              >
                <FiGrid size={18} />
                <span>Overview</span>
              </button>
              <button
                onClick={() => switchTab('services')}
                className={`drawer-item ${activeTab === 'services' ? 'active' : ''}`}
              >
                <FiCalendar size={18} />
                <span>Services &amp; Rosters</span>
              </button>
              <button
                onClick={() => switchTab('attendance')}
                className={`drawer-item ${activeTab === 'attendance' ? 'active' : ''}`}
              >
                <FiCheckSquare size={18} />
                <span>Attendance Lists</span>
              </button>
              <button
                onClick={() => switchTab('accountability')}
                className={`drawer-item ${activeTab === 'accountability' ? 'active' : ''}`}
              >
                <RiBookOpenLine size={18} />
                <span>Spiritual Accountability</span>
              </button>
              <button
                onClick={() => switchTab('attire')}
                className={`drawer-item ${activeTab === 'attire' ? 'active' : ''}`}
              >
                <RiShirtLine size={18} />
                <span>Sunday Attire</span>
              </button>
              <button
                onClick={() => switchTab('members')}
                className={`drawer-item ${activeTab === 'members' ? 'active' : ''}`}
              >
                <FiUsers size={18} />
                <span>Unit Stewards Directory</span>
              </button>
              <button
                onClick={() => switchTab('sermons')}
                className={`drawer-item ${activeTab === 'sermons' ? 'active' : ''}`}
              >
                <RiSpotifyLine size={18} />
                <span>Spotify Sermons</span>
              </button>

              <hr className="drawer-divider" />

              <Link href="/home" className="drawer-item">
                <FiExternalLink size={18} />
                <span>Switch to Member Portal</span>
              </Link>
              <button onClick={handleSignOut} className="drawer-item text-red">
                <FiLogOut size={18} />
                <span>Sign Out</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ==================================================== */}
      {/* MAIN CONTENT COLUMN                                  */}
      {/* ==================================================== */}
      <div className="admin-main">
        {/* Mobile Top Header */}
        <header className="mobile-header">
          <div className="mobile-brand">
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="mobile-menu-trigger"
              aria-label="Open navigation menu"
            >
              <FiMenu size={22} />
            </button>
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
              <div className="mobile-brand-sub">Executive Admin</div>
            </div>
          </div>

          <div className="mobile-user-link">
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
          </div>
        </header>

        {/* Content Workspace Wrapper */}
        <main className="admin-content-wrapper">
          {/* ========================================== */}
          {/* TAB 1: OVERVIEW PAGE                       */}
          {/* ========================================== */}
          {activeTab === 'overview' && (
            <div className="tab-panel">
              <div className="executive-banner-card">
                <div className="banner-left">
                  <span className="banner-badge">
                    <RiSparklingFill /> EXECUTIVE DASHBOARD
                  </span>
                  <h1 className="banner-title">Welcome back, {profile.full_name}</h1>
                  <p className="banner-text">
                    Direct operations for sanctuary duty posts, view unit accountability at a glance, update Sunday clothes, and publish weekly Spotify sermons.
                  </p>
                </div>
                <div className="banner-right">
                  <div className="date-pill">
                    <FiCalendar />
                    <span>
                      {new Date().toLocaleDateString('en-GB', {
                        weekday: 'long',
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </span>
                  </div>
                </div>
              </div>

              <div className="stats-grid">
                <div className="stat-card" onClick={() => switchTab('members')}>
                  <div className="stat-icon-box blue">
                    <FiUsers size={22} />
                  </div>
                  <div className="stat-meta">
                    <span className="stat-number">{activeUshersCount}</span>
                    <span className="stat-label">Active Stewards</span>
                    <span className="stat-detail">{totalMembersCount} registered in unit</span>
                  </div>
                </div>

                <div className="stat-card" onClick={() => switchTab('services')}>
                  <div className="stat-icon-box gold">
                    <FiCalendar size={22} />
                  </div>
                  <div className="stat-meta">
                    <span className="stat-number">{serviceOccurrences.length}</span>
                    <span className="stat-label">Service Rosters</span>
                    <span className="stat-detail">Upcoming &amp; active stations</span>
                  </div>
                </div>

                <div className="stat-card" onClick={() => switchTab('accountability')}>
                  <div className="stat-icon-box green">
                    <HiOutlineFire size={24} />
                  </div>
                  <div className="stat-meta">
                    <span className="stat-number">
                      {stewardsAccountabilityList.filter((s) => s.prayerToday?.status === 'completed' || s.bibleToday?.status === 'completed').length}
                    </span>
                    <span className="stat-label">Devotions Today</span>
                    <span className="stat-detail">Stewards completed today</span>
                  </div>
                </div>

                <div className="stat-card" onClick={() => switchTab('sermons')}>
                  <div className="stat-icon-box spotify">
                    <RiSpotifyLine size={24} />
                  </div>
                  <div className="stat-meta">
                    <span className="stat-number">{sermonsList.length}</span>
                    <span className="stat-label">Spotify Messages</span>
                    <span className="stat-detail">{currentSermon ? currentSermon.title.slice(0, 20) + '...' : 'None active'}</span>
                  </div>
                </div>
              </div>

              <div className="overview-two-col">
                <div className="card-box">
                  <div className="card-box-header">
                    <div className="header-title-row">
                      <RiShirtLine className="header-icon text-blue" size={20} />
                      <h3 className="card-box-title">Sunday Attire &amp; Outfit</h3>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      {latestDressCode && (
                        <button
                          type="button"
                          onClick={() => handleDeleteAttire()}
                          disabled={deletingAttire}
                          className="header-link-btn"
                          style={{
                            color: '#dc2626',
                            background: '#fef2f2',
                            padding: '4px 10px',
                            borderRadius: '6px',
                            border: '1px solid #fecaca',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            fontWeight: 600,
                            cursor: 'pointer',
                          }}
                          title="Delete current Sunday attire"
                        >
                          <FiTrash2 size={13} /> Delete
                        </button>
                      )}
                      <button onClick={() => switchTab('attire')} className="header-link-btn">
                        Create / Edit Clothes &rarr;
                      </button>
                    </div>
                  </div>
                  <div className="card-box-body">
                    {latestDressCode ? (
                      <div className="attire-spotlight-inner">
                        <div className="attire-date-tag">
                          Applicable Sunday: <strong>{latestDressCode.applicable_sunday}</strong>
                        </div>
                        <p className="attire-instructions-preview">{latestDressCode.instructions}</p>
                        {latestDressCode.image_url && (
                          <div className="attire-preview-thumb">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={latestDressCode.image_url}
                              alt="Sunday Attire"
                              className="attire-img"
                            />
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="empty-box-state">
                        <p>No Sunday attire instructions set yet.</p>
                        <button onClick={() => switchTab('attire')} className="primary-action-btn mt-2">
                          + Set Clothes for This Sunday
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                <div className="card-box">
                  <div className="card-box-header">
                    <div className="header-title-row">
                      <FiCalendar className="header-icon text-blue" size={20} />
                      <h3 className="card-box-title">Next Scheduled Service</h3>
                    </div>
                    <button onClick={() => switchTab('services')} className="header-link-btn">
                      Assign Positions &rarr;
                    </button>
                  </div>
                  <div className="card-box-body">
                    {currentOccurrence ? (
                      <div className="next-service-details">
                        <div className="svc-type-pill uppercase">{currentOccurrence.service_type} SERVICE</div>
                        <h4 className="next-svc-date">{currentOccurrence.occurrence_date}</h4>
                        <p className="next-svc-time">
                          {currentOccurrence.start_time?.slice(0, 5)} – {currentOccurrence.end_time?.slice(0, 5)} WAT
                        </p>
                        <div className="svc-assignment-stats">
                          <span>
                            {dutyAssignments.filter((a) => a.service_occurrence_id === currentOccurrence.id).length} of {sortedDutyPosts.length} Stations Filled
                          </span>
                          <span className={`status-pill ${currentOccurrence.roster_published ? 'green' : 'amber'}`}>
                            {currentOccurrence.roster_published ? 'Published to Ushers' : 'Draft Roster'}
                          </span>
                        </div>
                        <button
                          onClick={() => switchTab('services')}
                          className="primary-action-btn mt-3"
                        >
                          Assign Ushers to Standing Posts &rarr;
                        </button>
                      </div>
                    ) : (
                      <div className="empty-box-state">
                        <p>No upcoming service occurrences scheduled.</p>
                        <button
                          onClick={() => {
                            switchTab('attendance')
                            setShowCreateService(true)
                          }}
                          className="primary-action-btn mt-2"
                        >
                          + Create Service Occurrence
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ========================================== */}
          {/* TAB 2: SERVICES & ROSTER ASSIGNMENTS      */}
          {/* ========================================== */}
          {activeTab === 'services' && (
            <div className="tab-panel">
              <div className="page-header-block">
                <div>
                  <h2 className="page-title">Service Duty Posts &amp; Standing Positions</h2>
                  <p className="page-subtitle">
                    Assign each usher to their exact standing duty post: Upper Left, Lower left, Upper middle, Lower middle, Upper Right, Lower Right, Door, or Records.
                  </p>
                </div>

                {currentOccurrence && (
                  <div className="header-actions">
                    <button
                      onClick={handleTogglePublishRoster}
                      disabled={publishingRoster}
                      className={`publish-toggle-btn ${currentOccurrence.roster_published ? 'unpublish' : 'publish'}`}
                    >
                      {publishingRoster
                        ? 'Saving...'
                        : currentOccurrence.roster_published
                        ? '✓ Roster Published (Click to Unpublish)'
                        : '⚡ Publish Roster to Members'}
                    </button>

                    <button
                      onClick={() => handleDeleteService(currentOccurrence.id)}
                      disabled={deletingService}
                      className="btn-danger-outline"
                      title="Delete this service and all its records"
                    >
                      <FiTrash2 size={15} />
                      <span>{deletingService ? 'Deleting...' : 'Delete Service'}</span>
                    </button>
                  </div>
                )}
              </div>

              {/* Service Occurrence Selector Bar */}
              <div className="occurrence-tabs-bar">
                <span className="selector-bar-label">Service Date:</span>
                <div className="occurrence-chips-list">
                  {serviceOccurrences.map((occ) => {
                    const isSelected = occ.id === selectedOccurrenceId
                    return (
                      <button
                        key={occ.id}
                        onClick={() => setSelectedOccurrenceId(occ.id)}
                        className={`occurrence-nav-chip ${isSelected ? 'selected' : ''}`}
                      >
                        <span className="chip-day-label">{occ.service_type?.toUpperCase()}</span>
                        <span className="chip-date-text">{occ.occurrence_date}</span>
                        <span className={`chip-indicator-dot ${occ.roster_published ? 'green' : 'amber'}`} />
                      </button>
                    )
                  })}
                </div>
              </div>

              {currentOccurrence ? (
                <div className="card-box mt-3">
                  <div className="card-box-header">
                    <div>
                      <h3 className="card-box-title uppercase">
                        {currentOccurrence.service_type} Service &bull; {currentOccurrence.occurrence_date}
                      </h3>
                      <span className="text-muted-sm">
                        {currentOccurrence.start_time?.slice(0, 5)} – {currentOccurrence.end_time?.slice(0, 5)} WAT
                      </span>
                    </div>
                    <div className="header-actions-inline">
                      <span className="badge-count">
                        {assignmentsForSelectedOccurrence.length} of {sortedDutyPosts.length} Stations Assigned
                      </span>
                      <button
                        onClick={() => handleDeleteService(currentOccurrence.id)}
                        className="btn-link-danger"
                        title="Delete service"
                      >
                        <FiTrash2 size={14} /> Delete
                      </button>
                    </div>
                  </div>

                  <div className="duty-stations-list">
                    {sortedDutyPosts.map((post) => {
                      const assignment = assignmentsForSelectedOccurrence.find(
                        (a) => a.duty_post_id === post.id
                      )
                      const assignedMember = allMembers.find((m) => m.id === assignment?.member_id)
                      const isSaving = assigningPostId === post.id

                      return (
                        <div key={post.id} className="standing-position-card">
                          <div className="position-info-col">
                            <span className="position-pin-icon">📍</span>
                            <div>
                              <strong className="position-title">{post.name}</strong>
                              <span className="position-sub">Sanctuary duty station</span>
                            </div>
                          </div>

                          <div className="standing-usher-col">
                            {assignedMember ? (
                              <div className="assigned-steward-pill">
                                <span className="steward-avatar-mini">
                                  {assignedMember.avatar_url ? (
                                    // eslint-disable-next-line @next/next/no-img-element
                                    <img src={assignedMember.avatar_url} alt={assignedMember.full_name} />
                                  ) : (
                                    getInitials(assignedMember.full_name)
                                  )}
                                </span>
                                <span className="steward-name-bold">{assignedMember.full_name}</span>
                              </div>
                            ) : (
                              <span className="unassigned-notice">Position Unassigned</span>
                            )}
                          </div>

                          <div className="assignment-control-col">
                            <select
                              value={assignment?.member_id || ''}
                              onChange={(e) => handleAssignPost(post.id, e.target.value)}
                              disabled={isSaving}
                              className={`standing-select ${assignment ? 'assigned' : ''}`}
                            >
                              <option value="">-- Assign Usher --</option>
                              {allMembers
                                .filter((m) => m.status === 'active')
                                .map((m) => {
                                  const alreadyAssigned = assignmentsForSelectedOccurrence.find(
                                    (a) => a.member_id === m.id && a.duty_post_id !== post.id
                                  )
                                  const currentStationName = alreadyAssigned
                                    ? sortedDutyPosts.find((p) => p.id === alreadyAssigned.duty_post_id)?.name
                                    : null

                                  return (
                                    <option key={m.id} value={m.id}>
                                      {m.full_name}
                                      {currentStationName ? ` (at ${currentStationName})` : ''}
                                    </option>
                                  )
                                })}
                            </select>

                            {assignment && (
                              <button
                                onClick={() => handleAssignPost(post.id, '')}
                                disabled={isSaving}
                                className="btn-remove-assignment"
                                title="Unassign usher"
                              >
                                <FiX size={15} />
                              </button>
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              ) : (
                <div className="empty-box-state">
                  <p>No service occurrence selected or all services deleted.</p>
                  <button
                    onClick={() => {
                      switchTab('attendance')
                      setShowCreateService(true)
                    }}
                    className="primary-action-btn mt-2"
                  >
                    + Create Next Service Occurrence
                  </button>
                </div>
              )}
            </div>
          )}

          {/* ========================================== */}
          {/* TAB 3: ATTENDANCE & CREATE SERVICE        */}
          {/* ========================================== */}
          {activeTab === 'attendance' && (
            <div className="tab-panel">
              <div className="page-header-block">
                <div>
                  <h2 className="page-title">Service Attendance Lists</h2>
                  <p className="page-subtitle">
                    Create new services, mark steward attendance, or delete services and records.
                  </p>
                </div>
                <div className="header-actions">
                  <button
                    onClick={() => setShowCreateService(!showCreateService)}
                    className="primary-action-btn"
                  >
                    <FiPlus size={16} />
                    <span>{showCreateService ? 'Close Creator' : 'Create New Service'}</span>
                  </button>

                  {currentAttOccurrence && (
                    <button
                      onClick={() => handleDeleteService(currentAttOccurrence.id)}
                      disabled={deletingService}
                      className="btn-danger-outline"
                      title="Delete this service occurrence and attendance records"
                    >
                      <FiTrash2 size={15} />
                      <span>Delete Service</span>
                    </button>
                  )}
                </div>
              </div>

              {showCreateService && (
                <div className="card-box create-service-box mb-4">
                  <div className="card-box-header">
                    <div className="header-title-row">
                      <FiCalendar className="header-icon text-blue" size={20} />
                      <h3 className="card-box-title">Create Next Service Occurrence</h3>
                    </div>
                    <span className="badge-suggested">Suggested: {getNextServiceDate()}</span>
                  </div>
                  <form onSubmit={handleCreateService} className="create-service-form">
                    <div className="form-row-grid">
                      <div className="form-field">
                        <label className="field-label">Occurrence Date *</label>
                        <input
                          type="date"
                          required
                          value={newSvcDate}
                          onChange={(e) => setNewSvcDate(e.target.value)}
                          className="field-input"
                          disabled={creatingService}
                        />
                      </div>

                      <div className="form-field">
                        <label className="field-label">Service Type *</label>
                        <select
                          value={newSvcType}
                          onChange={(e) => {
                            const type = e.target.value
                            setNewSvcType(type)
                            if (type === 'sunday') {
                              setNewSvcStartTime('07:00:00')
                              setNewSvcEndTime('12:00:00')
                            } else if (type === 'thursday') {
                              setNewSvcStartTime('16:00:00')
                              setNewSvcEndTime('18:00:00')
                            } else {
                              setNewSvcStartTime('17:00:00')
                              setNewSvcEndTime('18:30:00')
                            }
                          }}
                          className="field-select"
                          disabled={creatingService}
                        >
                          <option value="sunday">Sunday Service</option>
                          <option value="tuesday">Tuesday Service</option>
                          <option value="thursday">Thursday Service</option>
                          <option value="friday">Friday Service</option>
                        </select>
                      </div>

                      <div className="form-field">
                        <label className="field-label">Start Time (WAT) *</label>
                        <input
                          type="time"
                          required
                          value={newSvcStartTime}
                          onChange={(e) => setNewSvcStartTime(e.target.value)}
                          className="field-input"
                          disabled={creatingService}
                        />
                      </div>

                      <div className="form-field">
                        <label className="field-label">End Time (WAT) *</label>
                        <input
                          type="time"
                          required
                          value={newSvcEndTime}
                          onChange={(e) => setNewSvcEndTime(e.target.value)}
                          className="field-input"
                          disabled={creatingService}
                        />
                      </div>
                    </div>

                    <div className="form-field mt-3">
                      <label className="field-label">Service Notes / Theme (Optional)</label>
                      <input
                        type="text"
                        placeholder="e.g. Communion Service, Worship Explosion"
                        value={newSvcNotes}
                        onChange={(e) => setNewSvcNotes(e.target.value)}
                        className="field-input"
                        disabled={creatingService}
                      />
                    </div>

                    <div className="form-actions-row mt-3">
                      <button
                        type="submit"
                        disabled={creatingService}
                        className="primary-action-btn"
                      >
                        {creatingService ? 'Creating Service...' : 'Create Service Occurrence'}
                      </button>
                      <button
                        type="button"
                        onClick={() => setShowCreateService(false)}
                        className="btn-secondary-flat"
                      >
                        Cancel
                      </button>
                    </div>
                  </form>
                </div>
              )}

              <div className="occurrence-tabs-bar">
                <span className="selector-bar-label">Service Date:</span>
                <div className="occurrence-chips-list">
                  {serviceOccurrences.map((occ) => {
                    const isSelected = occ.id === selectedAttOccurrenceId
                    return (
                      <button
                        key={occ.id}
                        onClick={() => setSelectedAttOccurrenceId(occ.id)}
                        className={`occurrence-nav-chip ${isSelected ? 'selected' : ''}`}
                      >
                        <span className="chip-day-label">{occ.service_type?.toUpperCase()}</span>
                        <span className="chip-date-text">{occ.occurrence_date}</span>
                      </button>
                    )
                  })}
                </div>
              </div>

              {currentAttOccurrence ? (
                <div className="attendance-layout-body mt-3">
                  <div className="attendance-metric-tiles">
                    <div className="att-tile">
                      <span className="att-tile-num text-green">{attendanceStats.presentCount}</span>
                      <span className="att-tile-label">Present</span>
                    </div>
                    <div className="att-tile">
                      <span className="att-tile-num text-red">{attendanceStats.absentCount}</span>
                      <span className="att-tile-label">Absent</span>
                    </div>
                    <div className="att-tile">
                      <span className="att-tile-num text-amber">{attendanceStats.excusedCount}</span>
                      <span className="att-tile-label">Excused</span>
                    </div>
                    <div className="att-tile">
                      <span className="att-tile-num text-blue">{attendanceStats.rate}%</span>
                      <span className="att-tile-label">Rate</span>
                    </div>
                  </div>

                  <div className="card-box">
                    <div className="card-box-header">
                      <div className="search-wrap">
                        <FiSearch className="search-ico" />
                        <input
                          type="text"
                          placeholder="Search attendee..."
                          value={attSearch}
                          onChange={(e) => setAttSearch(e.target.value)}
                          className="clean-search-input"
                        />
                      </div>
                      <div className="filter-pills-row">
                        {(['all', 'present', 'absent', 'excused', 'not_marked'] as const).map((st) => (
                          <button
                            key={st}
                            onClick={() => setAttStatusFilter(st)}
                            className={`filter-pill-btn ${attStatusFilter === st ? 'active' : ''}`}
                          >
                            {st === 'all'
                              ? 'All'
                              : st === 'not_marked'
                              ? 'Unmarked'
                              : st.charAt(0).toUpperCase() + st.slice(1)}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="table-responsive">
                      <table className="portal-data-table">
                        <thead>
                          <tr>
                            <th>Usher</th>
                            <th>Role</th>
                            <th>Status</th>
                            <th>Marked Time</th>
                            <th>Quick Action &amp; Clear</th>
                          </tr>
                        </thead>
                        <tbody>
                          {allMembers
                            .filter((m) => m.full_name?.toLowerCase().includes(attSearch.toLowerCase()))
                            .filter((m) => {
                              const record = attRecordsForCurrentService.find((r) => r.member_id === m.id)
                              const status = record?.status || 'not_marked'
                              return attStatusFilter === 'all' || status === attStatusFilter
                            })
                            .map((m) => {
                              const record = attRecordsForCurrentService.find((r) => r.member_id === m.id)
                              const status = record?.status || 'not_marked'
                              const isUpdating = updatingAttMemberId === m.id

                              return (
                                <tr key={m.id}>
                                  <td>
                                    <div className="member-name-avatar">
                                      <span className="table-avatar">
                                        {m.avatar_url ? (
                                          // eslint-disable-next-line @next/next/no-img-element
                                          <img src={m.avatar_url} alt={m.full_name} />
                                        ) : (
                                          getInitials(m.full_name)
                                        )}
                                      </span>
                                      <div>
                                        <strong className="name-primary">{m.full_name}</strong>
                                        <span className="email-secondary">{m.email}</span>
                                      </div>
                                    </div>
                                  </td>
                                  <td>
                                    <span className={`role-pill ${m.role}`}>{m.role}</span>
                                  </td>
                                  <td>
                                    <span className={`status-pill ${status}`}>
                                      {status === 'present'
                                        ? '✓ Present'
                                        : status === 'absent'
                                        ? '✕ Absent'
                                        : status === 'excused'
                                        ? '○ Excused'
                                        : '— Unmarked'}
                                    </span>
                                  </td>
                                  <td>
                                    <span className="time-text">
                                      {record?.marked_present_at
                                        ? new Date(record.marked_present_at).toLocaleTimeString('en-US', {
                                            hour: 'numeric',
                                            minute: '2-digit',
                                          })
                                        : '—'}
                                    </span>
                                  </td>
                                  <td>
                                    <div className="toggle-btn-group">
                                      <button
                                        onClick={() => handleUpdateAttendance(m.id, 'present')}
                                        disabled={isUpdating || status === 'present'}
                                        className={`toggle-action-btn green ${status === 'present' ? 'active' : ''}`}
                                      >
                                        Present
                                      </button>
                                      <button
                                        onClick={() => handleUpdateAttendance(m.id, 'absent')}
                                        disabled={isUpdating || status === 'absent'}
                                        className={`toggle-action-btn red ${status === 'absent' ? 'active' : ''}`}
                                      >
                                        Absent
                                      </button>
                                      <button
                                        onClick={() => handleUpdateAttendance(m.id, 'excused')}
                                        disabled={isUpdating || status === 'excused'}
                                        className={`toggle-action-btn amber ${status === 'excused' ? 'active' : ''}`}
                                      >
                                        Excused
                                      </button>
                                      {record && (
                                        <button
                                          onClick={() => handleDeleteAttendanceRecord(m.id)}
                                          className="toggle-action-btn clear"
                                          title="Delete / clear attendance record"
                                        >
                                          <FiX size={12} />
                                        </button>
                                      )}
                                    </div>
                                  </td>
                                </tr>
                              )
                            })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="empty-box-state">
                  <p>No service occurrence selected.</p>
                </div>
              )}
            </div>
          )}

          {/* ========================================== */}
          {/* TAB 4: ALL STEWARDS ACCOUNTABILITY LIST    */}
          {/* ========================================== */}
          {activeTab === 'accountability' && (
            <div className="tab-panel">
              <div className="page-header-block">
                <div>
                  <h2 className="page-title">Unit Spiritual Accountability</h2>
                  <p className="page-subtitle">
                    Click on any steward below to view their detailed accountability records and scripture readings.
                  </p>
                </div>
              </div>

              <div className="card-box mt-2">
                <div className="card-box-header">
                  <div className="search-wrap">
                    <FiSearch className="search-ico" />
                    <input
                      type="text"
                      placeholder="Search steward by name or email..."
                      value={accSearch}
                      onChange={(e) => setAccSearch(e.target.value)}
                      className="clean-search-input"
                    />
                  </div>
                  <span className="badge-count">
                    {allMembers.length} Stewards Tracked &bull; Click to View Records
                  </span>
                </div>

                <div className="table-responsive">
                  <table className="portal-data-table clickable-rows">
                    <thead>
                      <tr>
                        <th>Steward</th>
                        <th>Today&apos;s Prayer</th>
                        <th>Today&apos;s Bible Study</th>
                        <th>Scripture Read</th>
                        <th>Streak</th>
                        <th>Total Done</th>
                        <th>Record Details</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredAccountabilityList.length > 0 ? (
                        filteredAccountabilityList.map((stewardItem) => {
                          const {
                            member,
                            prayerToday,
                            bibleToday,
                            prayerSched,
                            bibleSched,
                            streakDays,
                            totalCompleted,
                          } = stewardItem
                          const isPrayerDone = prayerToday?.status === 'completed'
                          const isBibleDone = bibleToday?.status === 'completed'

                          return (
                            <tr
                              key={member.id}
                              onClick={() => openStewardAccountability(stewardItem)}
                              className="interactive-row"
                              title="Click to view accountability logs and scripture read"
                            >
                              <td>
                                <div className="member-name-avatar">
                                  <span className="table-avatar">
                                    {member.avatar_url ? (
                                      // eslint-disable-next-line @next/next/no-img-element
                                      <img src={member.avatar_url} alt={member.full_name} />
                                    ) : (
                                      getInitials(member.full_name)
                                    )}
                                  </span>
                                  <div>
                                    <strong className="name-primary">{member.full_name}</strong>
                                    <span className="email-secondary">{member.email}</span>
                                  </div>
                                </div>
                              </td>
                              <td>
                                {isPrayerDone ? (
                                  <span className="status-pill green">✓ Completed</span>
                                ) : prayerSched ? (
                                  <span className="status-pill amber">
                                    Pending ({prayerSched.start_time?.slice(0, 5)})
                                  </span>
                                ) : (
                                  <span className="status-pill gray">Not Set</span>
                                )}
                              </td>
                              <td>
                                {isBibleDone ? (
                                  <span className="status-pill green">✓ Completed</span>
                                ) : bibleSched ? (
                                  <span className="status-pill amber">
                                    Pending ({bibleSched.start_time?.slice(0, 5)})
                                  </span>
                                ) : (
                                  <span className="status-pill gray">Not Set</span>
                                )}
                              </td>
                              <td>
                                {bibleToday?.bible_reference_text ? (
                                  <strong className="scripture-text-blue">
                                    {bibleToday.bible_reference_text}
                                  </strong>
                                ) : (
                                  <span className="text-muted-sm">—</span>
                                )}
                              </td>
                              <td>
                                <span className="streak-badge">
                                  <HiOutlineFire className="text-gold" /> {streakDays} days
                                </span>
                              </td>
                              <td>
                                <strong className="total-done-num">{totalCompleted}</strong>
                              </td>
                              <td>
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    openStewardAccountability(stewardItem)
                                  }}
                                  className="btn-view-records"
                                >
                                  View Log &rarr;
                                </button>
                              </td>
                            </tr>
                          )
                        })
                      ) : (
                        <tr>
                          <td colSpan={7} className="empty-table-cell">
                            No stewards found matching &quot;{accSearch}&quot;.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ==================================================== */}
          {/* MODAL: STEWARD ACCOUNTABILITY & WHAT THEY READ       */}
          {/* ==================================================== */}
          {selectedStewardAcc && (
            <div
              className="steward-modal-backdrop"
              onClick={() => setSelectedStewardAcc(null)}
            >
              <div
                className="steward-modal-card"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="steward-modal-header">
                  <div className="steward-header-info">
                    <div className="steward-modal-avatar">
                      {selectedStewardAcc.member.avatar_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={selectedStewardAcc.member.avatar_url}
                          alt={selectedStewardAcc.member.full_name}
                        />
                      ) : (
                        getInitials(selectedStewardAcc.member.full_name)
                      )}
                    </div>
                    <div>
                      <h3 className="steward-modal-name">
                        {selectedStewardAcc.member.full_name}
                      </h3>
                      <span className="steward-modal-email">
                        {selectedStewardAcc.member.email} &bull; {selectedStewardAcc.member.phone || 'No phone'}
                      </span>
                    </div>
                  </div>

                  <button
                    onClick={() => setSelectedStewardAcc(null)}
                    className="modal-close-icon-btn"
                  >
                    <FiX size={20} />
                  </button>
                </div>

                <div className="steward-modal-metrics">
                  <div className="modal-metric-chip">
                    <span className="chip-metric-label">Spiritual Streak</span>
                    <strong className="chip-metric-val text-gold">
                      🔥 {selectedStewardAcc.streakDays} Days
                    </strong>
                  </div>
                  <div className="modal-metric-chip">
                    <span className="chip-metric-label">Total Devotions</span>
                    <strong className="chip-metric-val text-blue">
                      {selectedStewardAcc.totalCompleted} Completed
                    </strong>
                  </div>
                  <div className="modal-metric-chip">
                    <span className="chip-metric-label">Prayer Schedule</span>
                    <span className="chip-metric-sub">
                      {selectedStewardAcc.prayerSched?.start_time?.slice(0, 5) || '06:00'} WAT ({selectedStewardAcc.prayerSched?.duration_minutes || 30}m)
                    </span>
                  </div>
                  <div className="modal-metric-chip">
                    <span className="chip-metric-label">Bible Study Schedule</span>
                    <span className="chip-metric-sub">
                      {selectedStewardAcc.bibleSched?.start_time?.slice(0, 5) || '21:00'} WAT ({selectedStewardAcc.bibleSched?.duration_minutes || 30}m)
                    </span>
                  </div>
                </div>

                <div className="steward-modal-body">
                  <div className="modal-history-toolbar">
                    <h4 className="modal-section-title">Accountability Log &amp; Readings</h4>
                    <div className="filter-pills-row">
                      <button
                        onClick={() => setHistoryFilter('all')}
                        className={`filter-pill-btn ${historyFilter === 'all' ? 'active' : ''}`}
                      >
                        All Devotions
                      </button>
                      <button
                        onClick={() => setHistoryFilter('bible_study')}
                        className={`filter-pill-btn ${historyFilter === 'bible_study' ? 'active' : ''}`}
                      >
                        📖 Bible Readings
                      </button>
                      <button
                        onClick={() => setHistoryFilter('prayer')}
                        className={`filter-pill-btn ${historyFilter === 'prayer' ? 'active' : ''}`}
                      >
                        🙏 Prayers
                      </button>
                    </div>
                  </div>

                  {loadingStewardHistory ? (
                    <div className="loading-state-box">
                      <span>Loading complete history records...</span>
                    </div>
                  ) : (
                    <div className="history-entries-list">
                      {stewardHistoryLogs.filter((log) => historyFilter === 'all' || log.task_type === historyFilter).length > 0 ? (
                        stewardHistoryLogs
                          .filter((log) => historyFilter === 'all' || log.task_type === historyFilter)
                          .map((log) => {
                            const isBible = log.task_type === 'bible_study'
                            const isCompleted = log.status === 'completed'
                            const isMissed = log.status === 'missed'

                            return (
                              <div
                                key={log.id}
                                className={`history-entry-item ${isBible ? 'bible-item' : 'prayer-item'}`}
                              >
                                <div className="entry-header">
                                  <div className="entry-date-type">
                                    <span className="entry-type-tag">
                                      {isBible ? '📖 Bible Study' : '🙏 Prayer'}
                                    </span>
                                    <strong className="entry-date-text">
                                      {new Date(log.accountability_date).toLocaleDateString('en-GB', {
                                        weekday: 'short',
                                        day: 'numeric',
                                        month: 'short',
                                        year: 'numeric',
                                      })}
                                    </strong>
                                  </div>

                                  <span
                                    className={`status-pill ${
                                      isCompleted ? 'green' : isMissed ? 'red' : 'amber'
                                    }`}
                                  >
                                    {isCompleted ? '✓ Completed' : isMissed ? '✕ Missed' : '⏳ Pending'}
                                  </span>
                                </div>

                                {isBible && (
                                  <div className="scripture-read-callout">
                                    <span className="scripture-callout-label">What They Read:</span>
                                    {log.bible_reference_text ? (
                                      <div className="scripture-content-block">
                                        <strong className="scripture-passage-badge">
                                          {log.bible_reference_text}
                                        </strong>
                                        {log.bible_book && (
                                          <span className="scripture-chapter-details">
                                            ({log.bible_book} Ch {log.bible_start_chapter}:{log.bible_start_verse} – {log.bible_end_chapter}:{log.bible_end_verse})
                                          </span>
                                        )}
                                      </div>
                                    ) : (
                                      <span className="text-muted-sm">Completed without scripture citation</span>
                                    )}
                                  </div>
                                )}

                                <div className="entry-footer-meta">
                                  <span className="entry-time-meta">
                                    <FiClock size={12} /> Scheduled: {log.scheduled_start?.slice(0, 5)} WAT
                                  </span>
                                  {log.completed_at && (
                                    <span className="entry-time-meta text-green">
                                      ✓ Marked: {new Date(log.completed_at).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
                                    </span>
                                  )}
                                </div>
                              </div>
                            )
                          })
                      ) : (
                        <div className="empty-box-state">
                          <p>No accountability entries found for this steward.</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <div className="steward-modal-footer">
                  <button
                    onClick={() => setSelectedStewardAcc(null)}
                    className="primary-action-btn"
                  >
                    Close Log
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ========================================== */}
          {/* TAB 5: SUNDAY ATTIRE & CLOTHES CREATOR    */}
          {/* ========================================== */}
          {activeTab === 'attire' && (
            <div className="tab-panel">
              <div className="page-header-block">
                <div>
                  <h2 className="page-title">Sunday Attire &amp; Outfit Instructions</h2>
                  <p className="page-subtitle">
                    Create and publish the official dress code instructions for unit stewards for the upcoming Sunday service.
                  </p>
                </div>
              </div>

              <div className="attire-two-col-layout">
                <div className="card-box">
                  <div className="card-box-header">
                    <div className="header-title-row">
                      <RiShirtLine className="header-icon text-blue" size={20} />
                      <h3 className="card-box-title">Create / Update Sunday Clothes</h3>
                    </div>
                  </div>

                  <form onSubmit={handleSaveAttire} className="attire-form">
                    <div className="form-field">
                      <label className="field-label">Applicable Sunday Date *</label>
                      <input
                        type="date"
                        required
                        value={attireSundayDate}
                        onChange={(e) => setAttireSundayDate(e.target.value)}
                        className="field-input"
                        disabled={savingAttire}
                      />
                    </div>

                    <div className="form-field">
                      <label className="field-label">
                        Clothes Description &amp; Instructions *
                      </label>
                      <textarea
                        rows={5}
                        required
                        placeholder="e.g. Men: Plain white shirt with black trousers, royal blue tie, and polished black shoes. Women: Royal blue corporate gown with white scarf or jacket."
                        value={attireInstructions}
                        onChange={(e) => setAttireInstructions(e.target.value)}
                        className="field-textarea"
                        disabled={savingAttire}
                      />
                    </div>

                    <div className="form-field">
                      <label className="field-label">Inspiration / Attire Image URL (Optional)</label>
                      <input
                        type="url"
                        placeholder="https://..."
                        value={attireImageUrl}
                        onChange={(e) => setAttireImageUrl(e.target.value)}
                        className="field-input"
                        disabled={savingAttire}
                      />
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '12px' }}>
                      <button
                        type="submit"
                        disabled={savingAttire || deletingAttire}
                        className="primary-action-btn"
                      >
                        {savingAttire ? 'Publishing Attire...' : 'Broadcast Sunday Clothes to Unit'}
                      </button>

                      {latestDressCode && (
                        <button
                          type="button"
                          onClick={() => handleDeleteAttire()}
                          disabled={savingAttire || deletingAttire}
                          className="btn-danger-outline"
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '8px',
                            padding: '10px 16px',
                            borderRadius: '10px',
                            fontWeight: 600,
                            border: '1.5px solid #ef4444',
                            color: '#dc2626',
                            background: '#fef2f2',
                            cursor: 'pointer',
                          }}
                        >
                          <FiTrash2 size={16} />
                          {deletingAttire ? 'Deleting...' : `Delete Attire for ${latestDressCode.applicable_sunday}`}
                        </button>
                      )}
                    </div>
                  </form>
                </div>

                <div className="card-box">
                  <div className="card-box-header">
                    <h3 className="card-box-title">Member Portal Live Preview</h3>
                    <span className="badge-preview">What Members See</span>
                  </div>

                  <div className="attire-preview-body">
                    <div className="preview-sunday-banner">
                      <span className="preview-tag">SUNDAY ATTIRE &bull; {attireSundayDate}</span>
                      <h4 className="preview-headline">Official Sunday Dress Code</h4>
                      <p className="preview-instructions">
                        {attireInstructions || 'No instructions typed yet.'}
                      </p>
                      {attireImageUrl && (
                        <div className="preview-img-frame">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={attireImageUrl} alt="Preview" className="preview-img" />
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ========================================== */}
          {/* TAB 6: REGISTERED MEMBERS DIRECTORY       */}
          {/* ========================================== */}
          {activeTab === 'members' && (
            <div className="tab-panel">
              <div className="page-header-block">
                <div>
                  <h2 className="page-title">Unit Stewards Directory</h2>
                  <p className="page-subtitle">
                    Browse all registered steward accounts in the RCF Ikole Ushering Unit.
                  </p>
                </div>
                <span className="badge-count">{allMembers.length} Accounts Registered</span>
              </div>

              <div className="card-box">
                <div className="card-box-header">
                  <div className="search-wrap">
                    <FiSearch className="search-ico" />
                    <input
                      type="text"
                      placeholder="Search by full name, email, or phone..."
                      value={memberSearch}
                      onChange={(e) => setMemberSearch(e.target.value)}
                      className="clean-search-input"
                    />
                  </div>
                  <div className="filter-pills-row">
                    {(['all', 'member', 'team_leader', 'admin'] as const).map((r) => (
                      <button
                        key={r}
                        onClick={() => setRoleFilter(r)}
                        className={`filter-pill-btn ${roleFilter === r ? 'active' : ''}`}
                      >
                        {r === 'all' ? 'All Roles' : r === 'team_leader' ? 'Team Leaders' : r.charAt(0).toUpperCase() + r.slice(1)}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="table-responsive">
                  <table className="portal-data-table">
                    <thead>
                      <tr>
                        <th>Steward</th>
                        <th>Email Address</th>
                        <th>Phone</th>
                        <th>Role</th>
                        <th>Status</th>
                        <th>Registered</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredMembers.length > 0 ? (
                        filteredMembers.map((m) => (
                          <tr key={m.id}>
                            <td>
                              <div className="member-name-avatar">
                                <span className="table-avatar">
                                  {m.avatar_url ? (
                                    // eslint-disable-next-line @next/next/no-img-element
                                    <img src={m.avatar_url} alt={m.full_name} />
                                  ) : (
                                    getInitials(m.full_name)
                                  )}
                                </span>
                                <div>
                                  <strong className="name-primary">{m.full_name}</strong>
                                  <span className="email-secondary">ID: {m.id.slice(0, 8)}</span>
                                </div>
                              </div>
                            </td>
                            <td>{m.email}</td>
                            <td>{m.phone || '—'}</td>
                            <td>
                              <span className={`role-pill ${m.role}`}>{m.role}</span>
                            </td>
                            <td>
                              <span className={`status-pill ${m.status}`}>
                                {m.status === 'active' ? 'Active' : 'Suspended'}
                              </span>
                            </td>
                            <td>
                              {new Date(m.created_at).toLocaleDateString('en-GB', {
                                day: 'numeric',
                                month: 'short',
                                year: 'numeric',
                              })}
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={6} className="empty-table-cell">
                            No members found.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ========================================== */}
          {/* TAB 7: SPOTIFY SERMONS HUB (NO WEEK LABEL) */}
          {/* ========================================== */}
          {activeTab === 'sermons' && (
            <div className="tab-panel">
              <div className="page-header-block">
                <div>
                  <h2 className="page-title">Spotify Sermons &amp; Audio Ministry</h2>
                  <p className="page-subtitle">
                    Broadcast Spotify sermon links to unit members for spiritual growth and sermon accountability.
                  </p>
                </div>
              </div>

              <div className="attire-two-col-layout">
                <div className="card-box">
                  <div className="card-box-header">
                    <div className="header-title-row">
                      <RiSpotifyLine className="header-icon text-green" size={20} />
                      <h3 className="card-box-title">Broadcast Spotify Sermon Link</h3>
                    </div>
                  </div>

                  <form onSubmit={handlePublishSermon} className="attire-form">
                    <div className="form-field">
                      <label className="field-label">Sermon Title *</label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. Walking in Sanctified Dominion"
                        value={sermonTitle}
                        onChange={(e) => setSermonTitle(e.target.value)}
                        className="field-input"
                        disabled={publishingSermon}
                      />
                    </div>

                    <div className="form-field">
                      <label className="field-label">Preacher / Minister *</label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. Pastor / President"
                        value={sermonPreacher}
                        onChange={(e) => setSermonPreacher(e.target.value)}
                        className="field-input"
                        disabled={publishingSermon}
                      />
                    </div>

                    <div className="form-field">
                      <label className="field-label">Spotify Episode or Message URL *</label>
                      <input
                        type="url"
                        required
                        placeholder="https://open.spotify.com/episode/..."
                        value={sermonSpotifyUrl}
                        onChange={(e) => handleSpotifyUrlChange(e.target.value)}
                        className="field-input"
                        disabled={publishingSermon}
                      />
                    </div>

                    <div className="form-field">
                      <label className="field-label">
                        Message Cover Image (Auto-fetched from Spotify or Custom URL)
                      </label>
                      <input
                        type="url"
                        placeholder="https://..."
                        value={sermonCoverUrl}
                        onChange={(e) => setSermonCoverUrl(e.target.value)}
                        className="field-input"
                        disabled={publishingSermon}
                      />
                      {sermonCoverUrl && (
                        <div style={{ marginTop: '8px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={sermonCoverUrl}
                            alt="Cover Preview"
                            style={{ width: '48px', height: '48px', borderRadius: '8px', objectFit: 'cover' }}
                          />
                          <span style={{ fontSize: '12px', color: '#16a34a', fontWeight: 600 }}>
                            ✓ Spotify Cover Art Loaded
                          </span>
                        </div>
                      )}
                    </div>

                    <div className="form-field">
                      <label className="field-label">Key Message Summary Notes</label>
                      <textarea
                        rows={3}
                        placeholder="Notes or highlighted scriptures..."
                        value={sermonDesc}
                        onChange={(e) => setSermonDesc(e.target.value)}
                        className="field-textarea"
                        disabled={publishingSermon}
                      />
                    </div>

                    <div className="checkbox-row">
                      <input
                        type="checkbox"
                        id="is-current-sermon-box"
                        checked={sermonIsCurrent}
                        onChange={(e) => setSermonIsCurrent(e.target.checked)}
                        disabled={publishingSermon}
                      />
                      <label htmlFor="is-current-sermon-box" className="checkbox-label">
                        Highlight as <strong>Current Sermon of the Week</strong>
                      </label>
                    </div>

                    <button
                      type="submit"
                      disabled={publishingSermon}
                      className="primary-action-btn mt-2"
                    >
                      {publishingSermon ? 'Broadcasting...' : 'Broadcast Spotify Link'}
                    </button>
                  </form>
                </div>

                <div className="card-box">
                  <div className="card-box-header">
                    <h3 className="card-box-title">Broadcasted Sermons</h3>
                    <span className="badge-count">{sermonsList.length} Messages</span>
                  </div>

                  <div className="sermons-scroll-list">
                    {sermonsList.length > 0 ? (
                      sermonsList.map((sermon) => (
                        <div
                          key={sermon.id}
                          className={`sermon-card-item ${sermon.is_current ? 'active-sermon' : ''}`}
                        >
                          <div className="sermon-header-row">
                            <div className="sermon-pills">
                              {sermon.is_current && <span className="status-pill green">Current Week</span>}
                            </div>
                            <div className="sermon-ctrls">
                              {!sermon.is_current && (
                                <button
                                  onClick={() => handleSetCurrentSermon(sermon.id)}
                                  className="btn-small-link"
                                >
                                  Set Current
                                </button>
                              )}
                              <button
                                onClick={() => handleDeleteSermon(sermon.id)}
                                className="btn-trash"
                                title="Delete sermon"
                              >
                                <FiTrash2 size={14} />
                              </button>
                            </div>
                          </div>

                          <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start', margin: '8px 0' }}>
                            {sermon.cover_image_url && (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img
                                src={sermon.cover_image_url}
                                alt={sermon.title}
                                style={{
                                  width: '56px',
                                  height: '56px',
                                  borderRadius: '8px',
                                  objectFit: 'cover',
                                  flexShrink: 0,
                                }}
                              />
                            )}
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <h4 className="sermon-title-text">{sermon.title}</h4>
                              <span className="sermon-preacher-text">Minister: {sermon.preacher}</span>
                            </div>
                          </div>

                          {sermon.description && <p className="sermon-desc-text">{sermon.description}</p>}

                          <a
                            href={sermon.spotify_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="spotify-listen-link"
                          >
                            <RiSpotifyLine size={16} /> Listen on Spotify
                          </a>
                        </div>
                      ))
                    ) : (
                      <div className="empty-box-state">
                        <p>No Spotify sermons broadcasted yet.</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </main>

        {/* Mobile Sticky Bottom Navigation */}
        <nav className="mobile-bottom-nav">
          <button
            onClick={() => switchTab('overview')}
            className={`bottom-tab ${activeTab === 'overview' ? 'tab-active' : ''}`}
          >
            <div className="tab-icon-wrap"><FiGrid size={18} /></div>
            <span className="tab-label">Overview</span>
          </button>
          <button
            onClick={() => switchTab('services')}
            className={`bottom-tab ${activeTab === 'services' ? 'tab-active' : ''}`}
          >
            <div className="tab-icon-wrap"><FiCalendar size={18} /></div>
            <span className="tab-label">Services</span>
          </button>
          <button
            onClick={() => switchTab('attendance')}
            className={`bottom-tab ${activeTab === 'attendance' ? 'tab-active' : ''}`}
          >
            <div className="tab-icon-wrap"><FiCheckSquare size={18} /></div>
            <span className="tab-label">Attendance</span>
          </button>
          <button
            onClick={() => switchTab('accountability')}
            className={`bottom-tab ${activeTab === 'accountability' ? 'tab-active' : ''}`}
          >
            <div className="tab-icon-wrap"><RiBookOpenLine size={18} /></div>
            <span className="tab-label">Devotions</span>
          </button>
          <button
            onClick={() => switchTab('attire')}
            className={`bottom-tab ${activeTab === 'attire' ? 'tab-active' : ''}`}
          >
            <div className="tab-icon-wrap"><RiShirtLine size={18} /></div>
            <span className="tab-label">Attire</span>
          </button>
        </nav>

        {/* Delete Confirmation Modal */}
        <DeleteConfirmModal
          isOpen={deleteModal.isOpen}
          title={deleteModal.title}
          message={deleteModal.message}
          itemName={deleteModal.itemName}
          confirmText={deleteModal.confirmText}
          isLoading={deleteModal.isLoading}
          onConfirm={deleteModal.onConfirm}
          onCancel={closeDeleteModal}
        />
      </div>

      {/* ==================================================== */}
      {/* RESPONSIVE STYLING                                   */}
      {/* ==================================================== */}
      <style jsx>{`
        /* Root Shell Layout */
        .admin-shell-layout {
          display: flex;
          flex-direction: column;
          min-height: 100vh;
          width: 100%;
          background-color: var(--bg-gray, #f8fafc);
          font-family: inherit;
          color: #1f2937;
          overflow-x: hidden;
          position: relative;
        }

        @media (min-width: 1024px) {
          .admin-shell-layout {
            flex-direction: row;
          }
        }

        /* Toast Feedback */
        .admin-toast {
          position: fixed;
          top: 16px;
          right: 16px;
          left: 16px;
          max-width: 400px;
          margin: 0 auto;
          z-index: 999;
          padding: 12px 16px;
          border-radius: 10px;
          font-size: 13px;
          font-weight: 600;
          display: flex;
          align-items: center;
          gap: 10px;
          box-shadow: 0 10px 25px rgba(0, 0, 0, 0.15);
          animation: slideIn 0.2s ease-out;
        }

        @media (min-width: 640px) {
          .admin-toast {
            left: auto;
            right: 20px;
            top: 20px;
          }
        }

        .admin-toast.success {
          background-color: #064e3b;
          color: #a7f3d0;
          border: 1px solid #059669;
        }

        .admin-toast.error {
          background-color: #7f1d1d;
          color: #fecaca;
          border: 1px solid #dc2626;
        }

        @keyframes slideIn {
          from {
            transform: translateY(-8px);
            opacity: 0;
          }
          to {
            transform: translateY(0);
            opacity: 1;
          }
        }

        /* Desktop Sidebar */
        .admin-sidebar {
          display: none;
        }

        @media (min-width: 1024px) {
          .admin-sidebar {
            display: flex;
            flex-direction: column;
            width: 260px;
            height: 100vh;
            background-color: #ffffff;
            border-right: 1px solid #e5e7eb;
            position: fixed;
            top: 0;
            left: 0;
            bottom: 0;
            z-index: 40;
            box-shadow: 2px 0 8px rgba(0, 0, 0, 0.02);
            flex-shrink: 0;
          }
        }

        .sidebar-header {
          padding: 24px 20px 18px 20px;
          border-bottom: 1px solid #e5e7eb;
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
          border: 2.5px solid #1d4ed8;
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
          color: #1e40af;
          line-height: 1.2;
        }

        .brand-subtitle {
          font-size: 12px;
          font-weight: 600;
          color: #1d4ed8;
          letter-spacing: 0.2px;
        }

        .portal-pill {
          display: inline-block;
          font-size: 10px;
          font-weight: 700;
          letter-spacing: 1px;
          color: #1d4ed8;
          background-color: #eff6ff;
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
          margin-bottom: 8px;
          padding-left: 10px;
        }

        .nav-list {
          list-style: none;
          padding: 0;
          margin: 0;
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .nav-link {
          display: flex;
          align-items: center;
          gap: 12px;
          width: 100%;
          padding: 10px 14px;
          border-radius: 10px;
          font-size: 14px;
          font-weight: 500;
          color: #4b5563;
          background: transparent;
          border: none;
          text-align: left;
          text-decoration: none;
          cursor: pointer;
          transition: all 0.18s ease-in-out;
          position: relative;
        }

        .nav-link:hover {
          background-color: #eff6ff;
          color: #1d4ed8;
        }

        .nav-link.active {
          background-color: #1d4ed8;
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
          border-top: 1px solid #e5e7eb;
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .user-profile-card {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 8px;
          border-radius: 10px;
        }

        .user-avatar-wrap {
          position: relative;
          width: 40px;
          height: 40px;
          flex-shrink: 0;
        }

        .user-avatar-img {
          width: 100%;
          height: 100%;
          border-radius: 50%;
          object-fit: cover;
          border: 2px solid #eff6ff;
        }

        .user-avatar-fallback {
          width: 100%;
          height: 100%;
          border-radius: 50%;
          background-color: #1d4ed8;
          color: #ffffff;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 13px;
          font-weight: 700;
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
          flex: 1;
          min-width: 0;
          display: flex;
          flex-direction: column;
        }

        .user-name {
          font-size: 13.5px;
          font-weight: 700;
          color: #111827;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .user-role-badge {
          font-size: 10.5px;
          font-weight: 600;
          color: #1d4ed8;
          background-color: #eff6ff;
          padding: 1px 6px;
          border-radius: 4px;
          width: fit-content;
          margin-top: 2px;
        }

        .logout-button {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          width: 100%;
          padding: 8px 12px;
          border-radius: 8px;
          border: 1px solid #e5e7eb;
          background-color: #ffffff;
          color: #4b5563;
          font-size: 13px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.15s;
        }

        .logout-button:hover {
          background-color: #fee2e2;
          color: #dc2626;
          border-color: #fca5a5;
        }

        /* Mobile Drawer Modal */
        .mobile-drawer-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.5);
          z-index: 100;
          display: flex;
          backdrop-filter: blur(2px);
          animation: fadeIn 0.15s ease-out;
        }

        .mobile-drawer-sheet {
          width: 280px;
          max-width: 80%;
          height: 100%;
          background: #ffffff;
          display: flex;
          flex-direction: column;
          box-shadow: 4px 0 20px rgba(0, 0, 0, 0.2);
          animation: slideRight 0.2s ease-out;
        }

        @keyframes slideRight {
          from {
            transform: translateX(-100%);
          }
          to {
            transform: translateX(0);
          }
        }

        .drawer-header {
          padding: 18px 16px;
          border-bottom: 1px solid #e5e7eb;
          display: flex;
          align-items: center;
          justify-content: space-between;
        }

        .drawer-close-btn {
          background: transparent;
          border: none;
          color: #6b7280;
          cursor: pointer;
          padding: 4px;
        }

        .drawer-menu-list {
          flex: 1;
          padding: 16px 12px;
          overflow-y: auto;
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .drawer-item {
          display: flex;
          align-items: center;
          gap: 12px;
          width: 100%;
          padding: 11px 14px;
          border-radius: 8px;
          border: none;
          background: transparent;
          font-size: 13.5px;
          font-weight: 600;
          color: #374151;
          cursor: pointer;
          text-align: left;
          text-decoration: none;
        }

        .drawer-item.active {
          background: #1d4ed8;
          color: #ffffff;
        }

        .drawer-divider {
          border: none;
          border-top: 1px solid #e5e7eb;
          margin: 10px 0;
        }

        /* Main Content Column */
        .admin-main {
          flex: 1;
          display: flex;
          flex-direction: column;
          align-items: center;
          min-width: 0;
          width: 100%;
          max-width: 100vw;
          overflow-x: hidden;
        }

        @media (min-width: 1024px) {
          .admin-main {
            margin-left: 260px;
            max-width: calc(100vw - 260px);
            align-items: stretch;
          }
        }

        /* Mobile Header */
        .mobile-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 12px 16px;
          background-color: #ffffff;
          border-bottom: 1px solid #e5e7eb;
          position: sticky;
          top: 0;
          z-index: 30;
          width: 100%;
        }

        @media (min-width: 1024px) {
          .mobile-header {
            display: none;
          }
        }

        .mobile-brand {
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .mobile-menu-trigger {
          background: transparent;
          border: none;
          color: #374151;
          cursor: pointer;
          display: flex;
          align-items: center;
          padding: 4px;
        }

        .mobile-logo-frame {
          width: 46px;
          height: 46px;
          border-radius: 50%;
          overflow: hidden;
          background: #ffffff;
          border: 2px solid #1d4ed8;
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
          color: #1e40af;
          line-height: 1.1;
        }

        .mobile-brand-sub {
          font-size: 10.5px;
          color: #1d4ed8;
          font-weight: 600;
        }

        .mobile-user-link {
          width: 34px;
          height: 34px;
        }

        .mobile-avatar {
          width: 100%;
          height: 100%;
          border-radius: 50%;
          object-fit: cover;
          border: 1.5px solid #1d4ed8;
        }

        .mobile-avatar-fallback {
          width: 100%;
          height: 100%;
          border-radius: 50%;
          background-color: #1d4ed8;
          color: #ffffff;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 12px;
          font-weight: 700;
        }

        /* Content Workspace Wrapper */
        .admin-content-wrapper {
          flex: 1;
          width: 100%;
          max-width: 1200px;
          margin: 0 auto;
          padding: 16px 12px 84px 12px;
          box-sizing: border-box;
          overflow-x: hidden;
        }

        @media (min-width: 768px) {
          .admin-content-wrapper {
            padding: 24px 28px 84px 28px;
          }
        }

        @media (min-width: 1024px) {
          .admin-content-wrapper {
            padding: 32px 36px 40px 36px;
          }
        }

        .tab-panel {
          display: flex;
          flex-direction: column;
          gap: 20px;
          width: 100%;
          animation: fadeIn 0.2s ease-out;
        }

        /* Mobile Bottom Nav */
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
          border-top: 1px solid #e5e7eb;
          box-shadow: 0 -4px 14px rgba(0, 0, 0, 0.06);
          z-index: 40;
          padding: 0 4px;
        }

        @media (min-width: 1024px) {
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
          background: transparent;
          border: none;
          color: #6b7280;
          cursor: pointer;
          padding: 4px 0;
          transition: color 0.15s;
        }

        .bottom-tab.tab-active {
          color: #1d4ed8;
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
          background-color: #1d4ed8;
          color: #ffffff;
        }

        .tab-label {
          font-size: 10px;
          font-weight: 600;
          letter-spacing: 0.1px;
        }

        /* Executive Banner */
        .executive-banner-card {
          background: linear-gradient(135deg, #1e40af 0%, #1d4ed8 60%, #3b82f6 100%);
          border-radius: 16px;
          padding: 22px 20px;
          color: #ffffff;
          display: flex;
          flex-direction: column;
          gap: 14px;
          box-shadow: 0 10px 25px -5px rgba(29, 78, 216, 0.28);
          width: 100%;
        }

        @media (min-width: 768px) {
          .executive-banner-card {
            flex-direction: row;
            align-items: center;
            justify-content: space-between;
            padding: 26px 30px;
          }
        }

        .banner-badge {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          background-color: rgba(255, 255, 255, 0.18);
          color: #fef08a;
          font-size: 11px;
          font-weight: 800;
          letter-spacing: 0.8px;
          padding: 4px 10px;
          border-radius: 20px;
          margin-bottom: 6px;
        }

        .banner-title {
          font-family: inherit;
          font-size: 20px;
          font-weight: 800;
          margin: 0;
          letter-spacing: -0.3px;
        }

        @media (min-width: 768px) {
          .banner-title {
            font-size: 24px;
          }
        }

        .banner-text {
          font-size: 13px;
          color: #e0e7ff;
          margin: 6px 0 0 0;
          line-height: 1.5;
        }

        .date-pill {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          background: rgba(255, 255, 255, 0.15);
          padding: 6px 14px;
          border-radius: 10px;
          font-size: 12.5px;
          font-weight: 600;
          backdrop-filter: blur(8px);
        }

        /* Metric Stats Grid */
        .stats-grid {
          display: grid;
          grid-template-columns: 1fr;
          gap: 12px;
          width: 100%;
        }

        @media (min-width: 480px) {
          .stats-grid {
            grid-template-columns: repeat(2, 1fr);
          }
        }

        @media (min-width: 1024px) {
          .stats-grid {
            grid-template-columns: repeat(4, 1fr);
            gap: 16px;
          }
        }

        .stat-card {
          background-color: #ffffff;
          border: 1px solid #e5e7eb;
          border-radius: 14px;
          padding: 16px;
          display: flex;
          align-items: center;
          gap: 14px;
          cursor: pointer;
          box-shadow: 0 2px 6px rgba(0, 0, 0, 0.02);
          transition: transform 0.15s, box-shadow 0.15s;
        }

        .stat-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 16px rgba(0, 0, 0, 0.06);
          border-color: #cbd5e1;
        }

        .stat-icon-box {
          width: 44px;
          height: 44px;
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }

        .stat-icon-box.blue {
          background: #eff6ff;
          color: #1d4ed8;
          border: 1px solid #bfdbfe;
        }
        .stat-icon-box.gold {
          background: #fffbeb;
          color: #d97706;
          border: 1px solid #fde68a;
        }
        .stat-icon-box.green {
          background: #f0fdf4;
          color: #16a34a;
          border: 1px solid #bbf7d0;
        }
        .stat-icon-box.spotify {
          background: #dcfce7;
          color: #15803d;
          border: 1px solid #86efac;
        }

        .stat-meta {
          display: flex;
          flex-direction: column;
          overflow: hidden;
        }

        .stat-number {
          font-size: 22px;
          font-weight: 800;
          color: #111827;
          line-height: 1.1;
        }

        .stat-label {
          font-size: 13px;
          font-weight: 600;
          color: #4b5563;
        }

        .stat-detail {
          font-size: 11px;
          color: #9ca3af;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        /* Two Column Layouts */
        .overview-two-col,
        .attire-two-col-layout {
          display: grid;
          grid-template-columns: 1fr;
          gap: 16px;
          width: 100%;
        }

        @media (min-width: 900px) {
          .overview-two-col,
          .attire-two-col-layout {
            grid-template-columns: 1fr 1fr;
            gap: 20px;
          }
        }

        /* Card Box */
        .card-box {
          background-color: #ffffff;
          border: 1px solid #e5e7eb;
          border-radius: 14px;
          overflow: hidden;
          box-shadow: 0 2px 6px rgba(0, 0, 0, 0.02);
          width: 100%;
        }

        .card-box-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 14px 16px;
          border-bottom: 1px solid #f3f4f6;
          flex-wrap: wrap;
          gap: 10px;
        }

        .header-title-row {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .card-box-title {
          font-size: 14.5px;
          font-weight: 700;
          color: #111827;
          margin: 0;
        }

        .header-link-btn {
          background: transparent;
          border: none;
          color: #1d4ed8;
          font-size: 12.5px;
          font-weight: 600;
          cursor: pointer;
        }

        .card-box-body {
          padding: 16px;
        }

        @media (min-width: 640px) {
          .card-box-body {
            padding: 20px;
          }
        }

        /* Attire */
        .attire-spotlight-inner {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }

        .attire-date-tag {
          font-size: 12.5px;
          color: #4b5563;
        }

        .attire-instructions-preview {
          font-size: 13.5px;
          color: #374151;
          line-height: 1.5;
          margin: 0;
        }

        .attire-preview-thumb {
          border-radius: 10px;
          overflow: hidden;
          max-height: 200px;
          border: 1px solid #e5e7eb;
        }

        .attire-img {
          width: 100%;
          height: auto;
          object-fit: cover;
          display: block;
        }

        /* Next Service Details */
        .next-service-details {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .svc-type-pill {
          font-size: 10.5px;
          font-weight: 800;
          color: #1d4ed8;
          background-color: #eff6ff;
          padding: 2px 8px;
          border-radius: 4px;
          width: fit-content;
        }

        .next-svc-date {
          font-size: 18px;
          font-weight: 800;
          color: #111827;
          margin: 4px 0 0 0;
        }

        .next-svc-time {
          font-size: 13px;
          color: #6b7280;
          margin: 0;
        }

        .svc-assignment-stats {
          display: flex;
          align-items: center;
          justify-content: space-between;
          font-size: 12px;
          font-weight: 600;
          color: #374151;
          margin-top: 6px;
          flex-wrap: wrap;
          gap: 6px;
        }

        /* Action Buttons */
        .primary-action-btn {
          background: linear-gradient(135deg, #1d4ed8 0%, #1e40af 100%);
          color: #ffffff;
          border: none;
          border-radius: 8px;
          padding: 10px 16px;
          font-size: 13px;
          font-weight: 600;
          cursor: pointer;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          box-shadow: 0 4px 12px rgba(29, 78, 216, 0.28);
          transition: all 0.15s;
          width: 100%;
        }

        @media (min-width: 640px) {
          .primary-action-btn {
            width: auto;
          }
        }

        .btn-secondary-flat {
          background: #f3f4f6;
          border: 1px solid #d1d5db;
          color: #4b5563;
          padding: 9px 16px;
          border-radius: 8px;
          font-size: 13px;
          font-weight: 600;
          cursor: pointer;
        }

        .btn-danger-outline {
          background: #ffffff;
          border: 1px solid #fca5a5;
          color: #dc2626;
          padding: 8px 14px;
          border-radius: 8px;
          font-size: 12.5px;
          font-weight: 600;
          cursor: pointer;
          display: inline-flex;
          align-items: center;
          gap: 6px;
          transition: all 0.15s;
        }

        .btn-danger-outline:hover {
          background-color: #fee2e2;
          border-color: #dc2626;
        }

        .btn-link-danger {
          background: transparent;
          border: none;
          color: #dc2626;
          font-size: 12px;
          font-weight: 600;
          cursor: pointer;
          display: inline-flex;
          align-items: center;
          gap: 4px;
          padding: 2px 6px;
          border-radius: 4px;
        }

        .btn-link-danger:hover {
          background-color: #fee2e2;
        }

        .header-actions-inline {
          display: flex;
          align-items: center;
          gap: 10px;
        }

        /* Page Headers */
        .page-header-block {
          display: flex;
          flex-direction: column;
          gap: 12px;
          width: 100%;
        }

        @media (min-width: 640px) {
          .page-header-block {
            flex-direction: row;
            align-items: flex-start;
            justify-content: space-between;
          }
        }

        .header-actions {
          display: flex;
          align-items: center;
          gap: 8px;
          flex-wrap: wrap;
        }

        .page-title {
          font-size: 20px;
          font-weight: 800;
          color: #111827;
          margin: 0;
        }

        @media (min-width: 768px) {
          .page-title {
            font-size: 22px;
          }
        }

        .page-subtitle {
          font-size: 13px;
          color: #6b7280;
          margin: 4px 0 0 0;
          line-height: 1.4;
        }

        .publish-toggle-btn {
          padding: 9px 16px;
          border-radius: 8px;
          font-size: 12.5px;
          font-weight: 700;
          cursor: pointer;
          border: none;
          transition: all 0.15s;
          width: 100%;
        }

        @media (min-width: 640px) {
          .publish-toggle-btn {
            width: auto;
          }
        }

        .publish-toggle-btn.publish {
          background: #16a34a;
          color: #ffffff;
          box-shadow: 0 4px 12px rgba(22, 163, 74, 0.3);
        }

        .publish-toggle-btn.unpublish {
          background: #f3f4f6;
          color: #4b5563;
          border: 1px solid #cbd5e1;
        }

        /* Occurrence Selector Bar */
        .occurrence-tabs-bar {
          background-color: #ffffff;
          border: 1px solid #e5e7eb;
          border-radius: 12px;
          padding: 10px 14px;
          display: flex;
          align-items: center;
          gap: 12px;
          width: 100%;
          overflow-x: auto;
          -webkit-overflow-scrolling: touch;
          box-sizing: border-box;
        }

        .selector-bar-label {
          font-size: 11px;
          font-weight: 700;
          color: #6b7280;
          text-transform: uppercase;
          white-space: nowrap;
        }

        .occurrence-chips-list {
          display: flex;
          align-items: center;
          gap: 8px;
          flex-shrink: 0;
        }

        .occurrence-nav-chip {
          background: #f9fafb;
          border: 1px solid #e5e7eb;
          border-radius: 8px;
          padding: 6px 12px;
          display: flex;
          align-items: center;
          gap: 8px;
          cursor: pointer;
          white-space: nowrap;
          transition: all 0.15s;
          flex-shrink: 0;
        }

        .occurrence-nav-chip:hover {
          background: #f3f4f6;
        }

        .occurrence-nav-chip.selected {
          background: #1d4ed8;
          border-color: #1d4ed8;
          color: #ffffff;
        }

        .chip-day-label {
          font-size: 10px;
          font-weight: 800;
        }

        .chip-date-text {
          font-size: 12px;
          font-weight: 600;
        }

        .chip-indicator-dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
        }

        .chip-indicator-dot.green {
          background-color: #10b981;
        }
        .chip-indicator-dot.amber {
          background-color: #f59e0b;
        }

        /* Standing Position Rows */
        .duty-stations-list {
          display: flex;
          flex-direction: column;
          width: 100%;
        }

        .standing-position-card {
          display: flex;
          flex-direction: column;
          align-items: stretch;
          padding: 14px 16px;
          border-bottom: 1px solid #f3f4f6;
          gap: 10px;
          width: 100%;
          box-sizing: border-box;
        }

        @media (min-width: 768px) {
          .standing-position-card {
            flex-direction: row;
            align-items: center;
            justify-content: space-between;
            gap: 16px;
            padding: 14px 20px;
          }
        }

        .standing-position-card:last-child {
          border-bottom: none;
        }

        .position-info-col {
          display: flex;
          align-items: center;
          gap: 10px;
          min-width: 180px;
        }

        .position-pin-icon {
          font-size: 18px;
        }

        .position-title {
          font-size: 14px;
          color: #111827;
          display: block;
        }

        .position-sub {
          font-size: 11.5px;
          color: #6b7280;
        }

        .standing-usher-col {
          flex: 1;
        }

        .assigned-steward-pill {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          background: #eff6ff;
          border: 1px solid #bfdbfe;
          padding: 4px 12px 4px 6px;
          border-radius: 20px;
          max-width: 100%;
        }

        .steward-avatar-mini {
          width: 24px;
          height: 24px;
          border-radius: 50%;
          background: #1d4ed8;
          color: #ffffff;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 10px;
          font-weight: 700;
          overflow: hidden;
          flex-shrink: 0;
        }

        .steward-avatar-mini img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .steward-name-bold {
          font-size: 13px;
          font-weight: 700;
          color: #1e40af;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .unassigned-notice {
          font-size: 12px;
          color: #9ca3af;
          font-style: italic;
        }

        .assignment-control-col {
          display: flex;
          align-items: center;
          gap: 8px;
          width: 100%;
        }

        @media (min-width: 768px) {
          .assignment-control-col {
            width: auto;
          }
        }

        .standing-select {
          padding: 8px 12px;
          border-radius: 8px;
          border: 1px solid #cbd5e1;
          background: #ffffff;
          font-size: 13px;
          color: #111827;
          outline: none;
          flex: 1;
          min-width: 0;
          width: 100%;
        }

        @media (min-width: 768px) {
          .standing-select {
            width: 220px;
            flex: initial;
          }
        }

        .standing-select.assigned {
          border-color: #10b981;
          background-color: #f0fdf4;
          font-weight: 600;
        }

        .btn-remove-assignment {
          background: transparent;
          border: 1px solid #e5e7eb;
          color: #6b7280;
          border-radius: 6px;
          padding: 7px;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }

        .btn-remove-assignment:hover {
          background: #fee2e2;
          color: #dc2626;
          border-color: #fca5a5;
        }

        /* Attendance Metric Tiles */
        .attendance-metric-tiles {
          background: #ffffff;
          border: 1px solid #e5e7eb;
          border-radius: 12px;
          padding: 14px;
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 10px;
          text-align: center;
          width: 100%;
          box-sizing: border-box;
        }

        @media (min-width: 640px) {
          .attendance-metric-tiles {
            grid-template-columns: repeat(4, 1fr);
            padding: 16px 20px;
            gap: 12px;
          }
        }

        .att-tile {
          display: flex;
          flex-direction: column;
          gap: 2px;
        }

        .att-tile-num {
          font-size: 20px;
          font-weight: 800;
        }

        @media (min-width: 640px) {
          .att-tile-num {
            font-size: 24px;
          }
        }

        .att-tile-label {
          font-size: 11px;
          font-weight: 600;
          color: #6b7280;
        }

        /* Responsive Tables Wrapper */
        .table-responsive {
          width: 100%;
          overflow-x: auto;
          -webkit-overflow-scrolling: touch;
        }

        .portal-data-table {
          width: 100%;
          min-width: 640px;
          border-collapse: collapse;
          text-align: left;
        }

        .portal-data-table th {
          background: #f9fafb;
          padding: 10px 14px;
          font-size: 11px;
          font-weight: 700;
          text-transform: uppercase;
          color: #6b7280;
          border-bottom: 1px solid #e5e7eb;
          letter-spacing: 0.5px;
          white-space: nowrap;
        }

        .portal-data-table td {
          padding: 12px 14px;
          border-bottom: 1px solid #f3f4f6;
          font-size: 13px;
          color: #1f2937;
          vertical-align: middle;
          white-space: nowrap;
        }

        .portal-data-table tr:last-child td {
          border-bottom: none;
        }

        .interactive-row {
          cursor: pointer;
          transition: background-color 0.15s;
        }

        .interactive-row:hover {
          background-color: #eff6ff !important;
        }

        .btn-view-records {
          background: #eff6ff;
          border: 1px solid #bfdbfe;
          color: #1d4ed8;
          font-size: 11.5px;
          font-weight: 700;
          padding: 4px 10px;
          border-radius: 6px;
          cursor: pointer;
          transition: all 0.15s;
        }

        .btn-view-records:hover {
          background: #1d4ed8;
          color: #ffffff;
        }

        .member-name-avatar {
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .table-avatar {
          width: 32px;
          height: 32px;
          border-radius: 50%;
          background: #1d4ed8;
          color: #ffffff;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 11px;
          font-weight: 700;
          overflow: hidden;
          flex-shrink: 0;
        }

        .table-avatar img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .name-primary {
          font-size: 13px;
          font-weight: 700;
          color: #111827;
          display: block;
        }

        .email-secondary {
          font-size: 11px;
          color: #6b7280;
        }

        .role-pill {
          font-size: 10.5px;
          font-weight: 700;
          padding: 2px 6px;
          border-radius: 4px;
        }

        .role-pill.admin {
          background: #fee2e2;
          color: #dc2626;
        }
        .role-pill.team_leader {
          background: #fef3c7;
          color: #b45309;
        }
        .role-pill.member {
          background: #eff6ff;
          color: #1d4ed8;
        }

        .status-pill {
          font-size: 10.5px;
          font-weight: 700;
          padding: 2px 7px;
          border-radius: 12px;
          display: inline-block;
        }

        .status-pill.green,
        .status-pill.present,
        .status-pill.active {
          background: #dcfce7;
          color: #15803d;
        }

        .status-pill.red,
        .status-pill.absent,
        .status-pill.missed {
          background: #fee2e2;
          color: #dc2626;
        }

        .status-pill.amber,
        .status-pill.excused {
          background: #fef3c7;
          color: #b45309;
        }

        .status-pill.gray,
        .status-pill.not_marked {
          background: #f3f4f6;
          color: #6b7280;
        }

        .time-text {
          font-size: 11.5px;
          color: #6b7280;
        }

        .toggle-btn-group {
          display: flex;
          align-items: center;
          gap: 4px;
        }

        .toggle-action-btn {
          padding: 4px 7px;
          border-radius: 5px;
          font-size: 11px;
          font-weight: 600;
          cursor: pointer;
          border: 1px solid #d1d5db;
          background: #ffffff;
          color: #4b5563;
          transition: all 0.15s;
        }

        .toggle-action-btn.green.active {
          background: #16a34a;
          border-color: #16a34a;
          color: #ffffff;
        }

        .toggle-action-btn.red.active {
          background: #dc2626;
          border-color: #dc2626;
          color: #ffffff;
        }

        .toggle-action-btn.amber.active {
          background: #d97706;
          border-color: #d97706;
          color: #ffffff;
        }

        .toggle-action-btn.clear {
          background: #fee2e2;
          border-color: #fca5a5;
          color: #dc2626;
        }

        .streak-badge {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          font-size: 12px;
          font-weight: 700;
          color: #d97706;
          background: #fffbeb;
          padding: 2px 7px;
          border-radius: 6px;
        }

        .scripture-text-blue {
          color: #1d4ed8;
          font-weight: 700;
          font-size: 12.5px;
        }

        .total-done-num {
          font-size: 13.5px;
          font-weight: 800;
          color: #111827;
        }

        /* Search & Filters */
        .search-wrap {
          position: relative;
          display: flex;
          align-items: center;
          flex: 1;
          min-width: 200px;
        }

        .search-ico {
          position: absolute;
          left: 10px;
          color: #9ca3af;
        }

        .clean-search-input {
          width: 100%;
          padding: 7px 10px 7px 32px;
          border: 1px solid #d1d5db;
          border-radius: 8px;
          font-size: 12.5px;
          outline: none;
        }

        .clean-search-input:focus {
          border-color: #1d4ed8;
        }

        .filter-pills-row {
          display: flex;
          align-items: center;
          gap: 6px;
          flex-wrap: wrap;
        }

        .filter-pill-btn {
          background: #f3f4f6;
          border: 1px solid #e5e7eb;
          padding: 4px 8px;
          border-radius: 6px;
          font-size: 11px;
          font-weight: 600;
          color: #4b5563;
          cursor: pointer;
        }

        .filter-pill-btn.active {
          background: #1d4ed8;
          color: #ffffff;
          border-color: #1d4ed8;
        }

        /* Form elements */
        .form-row-grid {
          display: grid;
          grid-template-columns: 1fr;
          gap: 10px;
        }

        @media (min-width: 640px) {
          .form-row-grid {
            grid-template-columns: repeat(2, 1fr);
          }
        }

        @media (min-width: 900px) {
          .form-row-grid {
            grid-template-columns: repeat(4, 1fr);
          }
        }

        .form-field {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .field-label {
          font-size: 11.5px;
          font-weight: 600;
          color: #374151;
        }

        .field-input,
        .field-select,
        .field-textarea {
          width: 100%;
          padding: 8px 10px;
          border: 1px solid #d1d5db;
          border-radius: 8px;
          font-size: 13px;
          color: #111827;
          background-color: #ffffff;
          outline: none;
          font-family: inherit;
          box-sizing: border-box;
        }

        .field-input:focus,
        .field-select:focus,
        .field-textarea:focus {
          border-color: #1d4ed8;
        }

        .create-service-box {
          border: 1px solid #bfdbfe;
          background: #eff6ff;
        }

        .create-service-form,
        .attire-form {
          padding: 16px;
        }

        .form-actions-row {
          display: flex;
          align-items: center;
          gap: 10px;
          flex-wrap: wrap;
        }

        .badge-suggested,
        .badge-preview,
        .badge-count {
          font-size: 10.5px;
          font-weight: 700;
          padding: 2px 7px;
          border-radius: 4px;
          background: #eff6ff;
          color: #1d4ed8;
        }

        .attire-preview-body {
          padding: 16px;
        }

        .preview-sunday-banner {
          background: linear-gradient(135deg, #1e3a8a 0%, #1d4ed8 100%);
          border-radius: 12px;
          padding: 16px;
          color: #ffffff;
        }

        .preview-tag {
          font-size: 10px;
          font-weight: 800;
          color: #fef08a;
          letter-spacing: 0.5px;
          display: block;
        }

        .preview-headline {
          font-size: 16px;
          font-weight: 800;
          margin: 6px 0 0 0;
        }

        .preview-instructions {
          font-size: 12.5px;
          color: #dbeafe;
          margin: 6px 0 0 0;
          line-height: 1.5;
        }

        .preview-img-frame {
          margin-top: 10px;
          border-radius: 8px;
          overflow: hidden;
          max-height: 200px;
        }

        .preview-img {
          width: 100%;
          height: auto;
          object-fit: cover;
        }

        /* Sermons */
        .sermons-scroll-list {
          padding: 14px 16px;
          display: flex;
          flex-direction: column;
          gap: 10px;
          max-height: 540px;
          overflow-y: auto;
        }

        .sermon-card-item {
          background: #f9fafb;
          border: 1px solid #e5e7eb;
          border-radius: 10px;
          padding: 12px 14px;
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .sermon-card-item.active-sermon {
          border-color: #10b981;
          background: #f0fdf4;
        }

        .sermon-header-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
        }

        .sermon-pills,
        .sermon-ctrls {
          display: flex;
          align-items: center;
          gap: 6px;
        }

        .btn-small-link {
          background: #ffffff;
          border: 1px solid #cbd5e1;
          color: #16a34a;
          font-size: 10.5px;
          font-weight: 700;
          padding: 2px 6px;
          border-radius: 4px;
          cursor: pointer;
        }

        .btn-trash {
          background: transparent;
          border: none;
          color: #9ca3af;
          cursor: pointer;
          padding: 2px;
        }

        .btn-trash:hover {
          color: #dc2626;
        }

        .sermon-title-text {
          font-size: 14px;
          font-weight: 800;
          color: #111827;
          margin: 0;
        }

        .sermon-preacher-text {
          font-size: 11.5px;
          color: #4b5563;
        }

        .sermon-desc-text {
          font-size: 12px;
          color: #6b7280;
          margin: 2px 0 0 0;
          line-height: 1.4;
        }

        .spotify-listen-link {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          color: #15803d;
          font-size: 12px;
          font-weight: 700;
          text-decoration: none;
          margin-top: 4px;
        }

        .spotify-listen-link:hover {
          text-decoration: underline;
        }

        .checkbox-row {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .checkbox-label {
          font-size: 12px;
          color: #374151;
          cursor: pointer;
        }

        /* Modal: Steward Accountability Details */
        .steward-modal-backdrop {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.55);
          backdrop-filter: blur(3px);
          z-index: 120;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 16px;
          animation: fadeIn 0.15s ease-out;
        }

        .steward-modal-card {
          background: #ffffff;
          border-radius: 16px;
          width: 100%;
          max-width: 680px;
          max-height: 90vh;
          display: flex;
          flex-direction: column;
          box-shadow: 0 20px 40px rgba(0, 0, 0, 0.25);
          overflow: hidden;
          animation: modalPop 0.2s cubic-bezier(0.16, 1, 0.3, 1);
        }

        @keyframes modalPop {
          from {
            transform: scale(0.95);
            opacity: 0;
          }
          to {
            transform: scale(1);
            opacity: 1;
          }
        }

        .steward-modal-header {
          padding: 18px 20px;
          border-bottom: 1px solid #e5e7eb;
          display: flex;
          align-items: center;
          justify-content: space-between;
        }

        .steward-header-info {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .steward-modal-avatar {
          width: 44px;
          height: 44px;
          border-radius: 50%;
          background: #1d4ed8;
          color: #ffffff;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 15px;
          font-weight: 800;
          overflow: hidden;
          flex-shrink: 0;
        }

        .steward-modal-avatar img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .steward-modal-name {
          font-size: 16px;
          font-weight: 800;
          color: #111827;
          margin: 0;
        }

        .steward-modal-email {
          font-size: 12px;
          color: #6b7280;
        }

        .modal-close-icon-btn {
          background: transparent;
          border: none;
          color: #9ca3af;
          cursor: pointer;
          padding: 4px;
          border-radius: 6px;
        }

        .modal-close-icon-btn:hover {
          color: #111827;
          background: #f3f4f6;
        }

        .steward-modal-metrics {
          background: #f8fafc;
          border-bottom: 1px solid #e5e7eb;
          padding: 12px 20px;
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 10px;
        }

        @media (min-width: 600px) {
          .steward-modal-metrics {
            grid-template-columns: repeat(4, 1fr);
          }
        }

        .modal-metric-chip {
          display: flex;
          flex-direction: column;
          gap: 2px;
        }

        .chip-metric-label {
          font-size: 10.5px;
          font-weight: 700;
          color: #6b7280;
          text-transform: uppercase;
        }

        .chip-metric-val {
          font-size: 14px;
          font-weight: 800;
        }

        .chip-metric-sub {
          font-size: 12px;
          font-weight: 600;
          color: #374151;
        }

        .steward-modal-body {
          flex: 1;
          padding: 16px 20px;
          overflow-y: auto;
          display: flex;
          flex-direction: column;
          gap: 14px;
        }

        .modal-history-toolbar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          flex-wrap: wrap;
          gap: 10px;
        }

        .modal-section-title {
          font-size: 14px;
          font-weight: 800;
          color: #111827;
          margin: 0;
        }

        .history-entries-list {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }

        .history-entry-item {
          border: 1px solid #e5e7eb;
          border-radius: 10px;
          padding: 12px 14px;
          display: flex;
          flex-direction: column;
          gap: 8px;
          background: #ffffff;
        }

        .history-entry-item.bible-item {
          border-left: 4px solid #1d4ed8;
        }

        .history-entry-item.prayer-item {
          border-left: 4px solid #10b981;
        }

        .entry-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
        }

        .entry-date-type {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .entry-type-tag {
          font-size: 11px;
          font-weight: 700;
          color: #4b5563;
        }

        .entry-date-text {
          font-size: 13px;
          color: #111827;
        }

        .scripture-read-callout {
          background: #eff6ff;
          border: 1px solid #bfdbfe;
          border-radius: 8px;
          padding: 8px 12px;
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .scripture-callout-label {
          font-size: 11px;
          font-weight: 700;
          color: #1e40af;
          text-transform: uppercase;
          letter-spacing: 0.3px;
        }

        .scripture-content-block {
          display: flex;
          align-items: center;
          gap: 8px;
          flex-wrap: wrap;
        }

        .scripture-passage-badge {
          background: #1d4ed8;
          color: #ffffff;
          padding: 2px 8px;
          border-radius: 4px;
          font-size: 12.5px;
          font-weight: 800;
        }

        .scripture-chapter-details {
          font-size: 12px;
          color: #1e40af;
          font-weight: 600;
        }

        .entry-footer-meta {
          display: flex;
          align-items: center;
          justify-content: space-between;
          font-size: 11px;
          color: #6b7280;
        }

        .entry-time-meta {
          display: inline-flex;
          align-items: center;
          gap: 4px;
        }

        .loading-state-box {
          padding: 24px;
          text-align: center;
          color: #6b7280;
          font-size: 13px;
        }

        .steward-modal-footer {
          padding: 12px 20px;
          border-top: 1px solid #e5e7eb;
          display: flex;
          justify-content: flex-end;
          background: #f9fafb;
        }

        /* Generic Helpers */
        .text-blue {
          color: #1d4ed8;
        }
        .text-green {
          color: #15803d;
        }
        .text-red {
          color: #dc2626;
        }
        .text-amber {
          color: #b45309;
        }
        .text-gold {
          color: #d97706;
        }
        .uppercase {
          text-transform: uppercase;
        }
        .text-muted-sm {
          font-size: 11px;
          color: #6b7280;
        }

        .empty-box-state {
          padding: 24px 16px;
          text-align: center;
          color: #6b7280;
          font-size: 13px;
        }

        .empty-table-cell {
          text-align: center;
          padding: 24px !important;
          color: #6b7280;
          font-style: italic;
        }

        .mt-2 {
          margin-top: 8px;
        }
        .mt-3 {
          margin-top: 12px;
        }
        .mt-4 {
          margin-top: 16px;
        }
        .mb-4 {
          margin-bottom: 16px;
        }
      `}</style>
    </div>
  )
}
