import React from 'react'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { todayInWAT, formatWAT } from '@/lib/time'
import { HomeClient } from '@/components/member/HomeClient'

export const dynamic = 'force-dynamic'

export default async function MemberHomePage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const todayStr = todayInWAT()

  // 1. Fetch user's profile
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  if (!profile) {
    redirect('/login')
  }

  // Independent dashboard data is fetched together to avoid a serial request waterfall.
  const [
    { data: standingRoleAssignment },
    { data: userAssignments },
    { data: nextGeneralOccurrence },
    { data: todayCompletions },
    { data: allCompletedTasks },
    { data: recentAttendance },
    { data: dressCode },
    { data: currentSermon },
    { data: announcement },
  ] = await Promise.all([
    supabase.from('standing_role_assignments').select(`
      id,
      is_active,
      standing_role:standing_roles (
        id,
        name,
        description
      )
    `)
      .eq('member_id', user.id).eq('is_active', true).maybeSingle(),
    supabase.from('duty_assignments').select(`
      id,
      notes,
      is_draft,
      duty_post:duty_posts (
        id,
        name,
        service_type
      ),
      service_occurrence:service_occurrences (
        id,
        occurrence_date,
        start_time,
        end_time,
        roster_published,
        service_type,
        service:services (
          name
        )
      )
    `)
      .eq('member_id', user.id),
    supabase.from('service_occurrences').select(`
      id,
      occurrence_date,
      start_time,
      end_time,
      roster_published,
      service_type,
      service:services (name)
    `).gte('occurrence_date', todayStr)
      .order('occurrence_date', { ascending: true })
      .order('start_time', { ascending: true }).limit(1).maybeSingle(),
    supabase.from('accountability_completions').select('*')
      .eq('member_id', user.id).eq('accountability_date', todayStr),
    supabase.from('accountability_completions').select('accountability_date, task_type')
      .eq('member_id', user.id).eq('status', 'completed')
      .order('accountability_date', { ascending: false }),
    supabase.from('attendance_records').select(`
      id,
      status,
      marked_present_at,
      created_at,
      service_occurrence:service_occurrences (id, occurrence_date, service_type)
    `).eq('member_id', user.id).order('created_at', { ascending: false }).limit(10),
    supabase.from('dress_codes').select('*').eq('status', 'published')
      .order('applicable_sunday', { ascending: false }).limit(1).maybeSingle(),
    supabase.from('sermons').select('*').eq('status', 'published')
      .order('is_current', { ascending: false }).order('published_at', { ascending: false })
      .limit(1).maybeSingle(),
    supabase.from('announcements').select('*').eq('status', 'published')
      .order('published_at', { ascending: false }).limit(1).maybeSingle(),
  ])

  // Filter for today and future occurrences (show even if roster is still a draft)
  interface AssignmentItem {
    id: string
    notes: string | null
    is_draft: boolean
    duty_post: { id: string; name: string; service_type: string } | null
    service_occurrence: {
      id: string
      occurrence_date: string
      start_time: string
      end_time: string
      roster_published: boolean
      service_type: string
      service: { name: string } | null
    } | null
  }

  const typedAssignments = (userAssignments as unknown as AssignmentItem[]) || []

  const futureAssignments = typedAssignments
    .filter((a) => {
      const occ = a.service_occurrence
      // Include today and future, regardless of roster_published status
      return occ && occ.occurrence_date >= todayStr
    })
    .sort((a, b) => {
      const dateCmp = a.service_occurrence!.occurrence_date.localeCompare(
        b.service_occurrence!.occurrence_date
      )
      if (dateCmp !== 0) return dateCmp
      return a.service_occurrence!.start_time.localeCompare(
        b.service_occurrence!.start_time
      )
    })

  const nextAssignment = futureAssignments[0] || null

  const prayerCompletion = todayCompletions?.find((c: any) => c.task_type === 'prayer')
  const bibleCompletion = todayCompletions?.find((c: any) => c.task_type === 'bible_study')
  const prayerDone = prayerCompletion?.status === 'completed'
  const bibleDone = bibleCompletion?.status === 'completed'

  // 5. Calculate current streak (consecutive days where both prayer & bible_study are completed)
  const completedDatesMap = new Map<string, { prayer: boolean; bible: boolean }>()
  allCompletedTasks?.forEach((item: any) => {
    const record = completedDatesMap.get(item.accountability_date) || {
      prayer: false,
      bible: false,
    }
    if (item.task_type === 'prayer') record.prayer = true
    if (item.task_type === 'bible_study') record.bible = true
    completedDatesMap.set(item.accountability_date, record)
  })

  const fullyCompletedDates = new Set<string>()
  completedDatesMap.forEach((val, dateKey) => {
    if (val.prayer && val.bible) {
      fullyCompletedDates.add(dateKey)
    }
  })

  let currentStreak = 0
  const [y, m, d] = todayStr.split('-').map(Number)
  const dateCursor = new Date(Date.UTC(y, m - 1, d))
  const toKey = (dt: Date) => dt.toISOString().split('T')[0]

  if (fullyCompletedDates.has(toKey(dateCursor))) {
    while (fullyCompletedDates.has(toKey(dateCursor))) {
      currentStreak++
      dateCursor.setUTCDate(dateCursor.getUTCDate() - 1)
    }
  } else {
    // If today is not yet fully completed, check yesterday so the active streak isn't lost mid-day
    dateCursor.setUTCDate(dateCursor.getUTCDate() - 1)
    while (fullyCompletedDates.has(toKey(dateCursor))) {
      currentStreak++
      dateCursor.setUTCDate(dateCursor.getUTCDate() - 1)
    }
  }

  // 6. Attendance summary (recent records)
  const pastCount = recentAttendance?.length || 0
  const presentCount =
    recentAttendance?.filter((r: any) => r.status === 'present').length || 0
  const attendanceRate =
    pastCount > 0 ? Math.round((presentCount / pastCount) * 100) : 100

  // 7. Latest published dress code
  // Format today's date in Africa/Lagos
  const formattedToday = formatWAT(new Date(), 'EEEE, d MMMM yyyy')
  const firstName = profile.full_name.split(' ')[0]

  // Extract standing role name if any
  const standingRoleName =
    (standingRoleAssignment as any)?.standing_role?.name || null

  return (
    <HomeClient
      firstName={firstName}
      formattedToday={formattedToday}
      standingRoleName={standingRoleName}
      nextAssignment={nextAssignment}
      nextGeneralOccurrence={nextGeneralOccurrence}
      prayerDone={prayerDone}
      bibleDone={bibleDone}
      bibleCompletion={bibleCompletion}
      currentStreak={currentStreak}
      attendanceRate={attendanceRate}
      presentCount={presentCount}
      pastCount={pastCount}
      recentAttendance={recentAttendance || []}
      dressCode={dressCode}
      currentSermon={currentSermon}
      announcement={announcement}
    />
  )
}
