import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { todayInWAT } from '@/lib/time'
import { AdminDashboardClient } from '@/components/admin/AdminDashboardClient'

export const dynamic = 'force-dynamic'

export default async function AdminDashboardPage() {
  const supabase = await createClient()

  // 1. Authenticate user
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/admin/login')
  }

  // 2. Fetch administrator profile
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  if (!profile || (profile.role !== 'admin' && profile.role !== 'team_leader')) {
    redirect('/admin/login?error=access_denied')
  }

  const todayStr = todayInWAT()
  const adminClient = createAdminClient()

  // 3. Fetch all registered unit member accounts (profiles)
  const { data: allMembers } = await adminClient
    .from('profiles')
    .select('*')
    .order('created_at', { ascending: false })

  // 4. Ensure the 8 exact active duty posts exist and are active
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

  const { data: existingPosts } = await adminClient
    .from('duty_posts')
    .select('*')

  const existingMap = new Map<string, any>()
  existingPosts?.forEach((p) => {
    existingMap.set(p.name.toLowerCase().trim(), p)
  })

  // Normalize / insert missing active positions
  for (let i = 0; i < ACTIVE_POSITION_NAMES.length; i++) {
    const postName = ACTIVE_POSITION_NAMES[i]
    const key = postName.toLowerCase().trim()
    const found = existingMap.get(key)
    if (!found) {
      await adminClient.from('duty_posts').insert({
        service_type: 'sunday',
        name: postName,
        sort_order: i + 1,
        is_active: true,
      })
    } else if (!found.is_active || found.sort_order !== i + 1) {
      await adminClient
        .from('duty_posts')
        .update({ is_active: true, sort_order: i + 1 })
        .eq('id', found.id)
    }
  }

  // Deactivate any posts not in ACTIVE_POSITION_NAMES
  const targetLower = new Set(ACTIVE_POSITION_NAMES.map((n) => n.toLowerCase().trim()))
  for (const p of existingPosts || []) {
    if (!targetLower.has(p.name.toLowerCase().trim()) && p.is_active) {
      await adminClient
        .from('duty_posts')
        .update({ is_active: false })
        .eq('id', p.id)
    }
  }

  // Fetch final active duty posts strictly ordered 1-8
  const { data: dutyPostsRaw } = await adminClient
    .from('duty_posts')
    .select('*')
    .eq('is_active', true)

  const seenNames = new Set<string>()
  const dutyPosts = (dutyPostsRaw || [])
    .filter((p) => {
      const lower = p.name.toLowerCase().trim()
      if (targetLower.has(lower) && !seenNames.has(lower)) {
        seenNames.add(lower)
        return true
      }
      return false
    })
    .sort((a, b) => {
      const idxA = ACTIVE_POSITION_NAMES.findIndex((n) => n.toLowerCase() === a.name.toLowerCase().trim())
      const idxB = ACTIVE_POSITION_NAMES.findIndex((n) => n.toLowerCase() === b.name.toLowerCase().trim())
      return (idxA === -1 ? 99 : idxA) - (idxB === -1 ? 99 : idxB)
    })

  // 5. Fetch service occurrences (8 weeks past to 4 weeks future)
  const pastLimitDate = new Date()
  pastLimitDate.setDate(pastLimitDate.getDate() - 56)
  const pastLimitStr = pastLimitDate.toISOString().split('T')[0]

  const futureLimitDate = new Date()
  futureLimitDate.setDate(futureLimitDate.getDate() + 28)
  const futureLimitStr = futureLimitDate.toISOString().split('T')[0]

  const { data: serviceOccurrences } = await adminClient
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
      roster_published_at,
      service:services (
        name,
        description
      )
    `)
    .gte('occurrence_date', pastLimitStr)
    .lte('occurrence_date', futureLimitStr)
    .order('occurrence_date', { ascending: false })

  const occurrenceIds = (serviceOccurrences || []).map((o) => o.id)

  // 6. Fetch duty assignments for these occurrences
  let dutyAssignments: any[] = []
  if (occurrenceIds.length > 0) {
    const { data: assignments } = await adminClient
      .from('duty_assignments')
      .select('*')
      .in('service_occurrence_id', occurrenceIds)

    dutyAssignments = assignments || []
  }

  // 7. Fetch attendance records for these occurrences
  let attendanceRecords: any[] = []
  if (occurrenceIds.length > 0) {
    const { data: attRecords } = await adminClient
      .from('attendance_records')
      .select('*')
      .in('service_occurrence_id', occurrenceIds)

    attendanceRecords = attRecords || []
  }

  // 8. Fetch accountability schedules
  const { data: accountabilitySchedules } = await adminClient
    .from('accountability_schedules')
    .select('*')
    .eq('is_active', true)

  // 9. Fetch recent accountability completions (last 30 days)
  const thirtyDaysAgo = new Date()
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
  const thirtyDaysAgoStr = thirtyDaysAgo.toISOString().split('T')[0]

  const { data: accountabilityCompletions } = await adminClient
    .from('accountability_completions')
    .select('*')
    .gte('accountability_date', thirtyDaysAgoStr)
    .order('accountability_date', { ascending: false })
    .limit(300)

  // 10. Fetch sermons list (all)
  const { data: sermonsList } = await adminClient
    .from('sermons')
    .select('*')
    .order('created_at', { ascending: false })

  // 11. Fetch announcements and dress codes for pulse overview
  const { data: recentAnnouncements } = await adminClient
    .from('announcements')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(3)

  const { data: latestDressCode } = await adminClient
    .from('dress_codes')
    .select('*')
    .order('applicable_sunday', { ascending: false })
    .limit(1)
    .maybeSingle()

  // Calculate metrics
  const activeUshersCount = (allMembers || []).filter((m) => m.status === 'active').length
  const totalMembersCount = (allMembers || []).length
  const upcomingServices = (serviceOccurrences || [])
    .filter((o) => o.occurrence_date >= todayStr)
    .reverse()

  return (
    <AdminDashboardClient
      profile={profile}
      activeUshersCount={activeUshersCount}
      totalMembersCount={totalMembersCount}
      upcomingServices={upcomingServices}
      recentAnnouncements={recentAnnouncements || []}
      latestDressCode={latestDressCode || null}
      allMembers={allMembers || []}
      dutyPosts={dutyPosts || []}
      serviceOccurrences={serviceOccurrences || []}
      initialDutyAssignments={dutyAssignments}
      initialAttendanceRecords={attendanceRecords}
      accountabilitySchedules={accountabilitySchedules || []}
      accountabilityCompletions={accountabilityCompletions || []}
      initialSermonsList={sermonsList || []}
    />
  )
}
